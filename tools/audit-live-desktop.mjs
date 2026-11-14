/** Capture every reference route and its stylesheet identity for desktop parity. */
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';

const directory = 'tools/reference-cache';
fs.mkdirSync(directory, { recursive: true });
const routes = JSON.parse(fs.readFileSync('routes.json', 'utf8'));
const queue = [...routes];
const records = [];
let completed = 0;
await Promise.all(Array.from({ length: 5 }, async () => {
  while (queue.length) {
    const entry = queue.shift();
    const file = path.join(directory, entry.route === '/' ? 'home.html' : entry.route.slice(1).replace(/\/$/, '').replaceAll('/', '__') + '.html');
    try {
      let html;
      let status = 200;
      let finalUrl = 'https://www.venture7.com' + entry.route;
      if (fs.existsSync(file)) html = fs.readFileSync(file, 'utf8');
      else {
        const response = await fetch(finalUrl, { signal: AbortSignal.timeout(45000) });
        status = response.status;
        finalUrl = response.url;
        html = await response.text();
        if (response.ok) fs.writeFileSync(file, html);
      }
      const $ = cheerio.load(html);
      const styles = $('link[rel="stylesheet"]').map((_, el) => new URL($(el).attr('href'), finalUrl).href).get();
      records.push({ ...entry, status, url: finalUrl, file, title: $('title').text(), styles,
        h1: $('main h1, #content h1').map((_, e) => $(e).text().trim()).get(),
        hasPage: !!$('#page, #content').length,
      });
    } catch (error) { records.push({ ...entry, error: String(error) }); }
    completed++;
    if (completed % 20 === 0) console.log(`Captured ${completed}/${routes.length} reference routes`);
  }
}));
records.sort((a, b) => a.route.localeCompare(b.route));
fs.writeFileSync('artifacts/live-route-audit.json', JSON.stringify(records, null, 2));
const styles = [...new Set(records.flatMap(r => r.styles || []))];
const byFilename = new Map();
for (const url of styles) {
  const basename = path.basename(new URL(url).pathname);
  if (!byFilename.has(basename)) byFilename.set(basename, new Set());
  byFilename.get(basename).add(new URL(url).pathname);
}
console.log(JSON.stringify({ routes: records.length, successful: records.filter(r => r.status === 200).length,
  errors: records.filter(r => r.error || r.status !== 200), uniqueStyles: styles.length,
  collisions: [...byFilename].filter(([, values]) => values.size > 1).map(([filename, urls]) => ({ filename, urls: [...urls] })),
}, null, 2));
