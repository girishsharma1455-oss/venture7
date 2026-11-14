/** Verify every declared public route against the actual production server. */
import fs from 'node:fs';
import * as cheerio from 'cheerio';

const base = process.argv[2] || 'http://127.0.0.1:12010';
const routes = JSON.parse(fs.readFileSync('routes.json', 'utf8'));
const queue = [...routes];
const results = [];
let done = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (queue.length) {
    const { route } = queue.shift();
    try {
      let response;
      for (let attempt = 0; attempt < 3; attempt++) {
        try { response = await fetch(base + route, { signal: AbortSignal.timeout(45000), headers: { connection: 'close' } }); break; }
        catch (error) { if (attempt === 2) throw error; }
      }
      const html = await response.text();
      const $ = cheerio.load(html);
      const externalScripts = $('script[src]').map((_, e) => $(e).attr('src')).get().filter(src => !src.startsWith('/_next/'));
      const record = { route, status: response.status, title: $('title').text(), content: $('[data-page-content]').length,
        externalStylesheets: $('link[rel="stylesheet"]').length, externalScripts };
      if (!response.ok || record.content !== 1 || record.externalStylesheets || externalScripts.length) record.failure = true;
      results.push(record);
    } catch (error) { results.push({ route, failure: true, error: String(error) }); }
    done++;
    if (done % 50 === 0) console.log(`Verified ${done}/${routes.length} production routes`);
  }
}));
const aliases = JSON.parse(fs.readFileSync('artifacts/route-discovery.json', 'utf8')).aliases;
const redirects = [];
for (const { route, destination } of aliases) {
  const response = await fetch(base + route, { redirect: 'manual' });
  redirects.push({ route, destination, status: response.status, location: response.headers.get('location') });
}
const failures = results.filter(r => r.failure);
fs.writeFileSync('artifacts/production-route-verification.json', JSON.stringify({ total: results.length, passed: results.length - failures.length, failures, redirects, routes: results }, null, 2));
console.log(JSON.stringify({ total: results.length, passed: results.length - failures.length, failures, redirects }, null, 2));
process.exitCode = failures.length ? 1 : 0;
