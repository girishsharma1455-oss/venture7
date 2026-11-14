import fs from 'node:fs';
import crypto from 'node:crypto';

const records = [...JSON.parse(fs.readFileSync('artifacts/live-route-audit.json', 'utf8')),
  ...(fs.existsSync('artifacts/route-discovery.json') ? JSON.parse(fs.readFileSync('artifacts/route-discovery.json', 'utf8')).newPages : []),
  ...(fs.existsSync('artifacts/browser-css-inventory.json') ? JSON.parse(fs.readFileSync('artifacts/browser-css-inventory.json', 'utf8')).filter(r => !r.error) : [])];
const filename = 'tools/reference-cache/styles.json';
const cache = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, 'utf8')) : {};
const urls = [...new Set(records.flatMap(r => r.styles))];
let count = 0;
const pending = urls.filter(url => !cache[url]);
await Promise.all(Array.from({ length: 6 }, async () => {
  while (pending.length) {
    const url = pending.shift();
    try {
      let response = await fetch(url, { signal: AbortSignal.timeout(40000) });
      if (!response.ok && url.startsWith('https://cdn.venture7.com/')) response = await fetch(url.replace('https://cdn.venture7.com/', 'https://www.venture7.com/'), { signal: AbortSignal.timeout(40000) });
      if (!response.ok) throw new Error(String(response.status));
      const css = await response.text();
      if (/^\s*<!doctype|^\s*<html/i.test(css)) throw new Error('HTML response');
      cache[url] = { id: crypto.createHash('sha256').update(url).digest('hex').slice(0, 12), css };
    } catch (error) { console.log('FAIL', url, String(error)); }
    count++;
    if (count % 20 === 0) console.log(`Captured ${count}/${urls.length} uniquely identified stylesheets`);
  }
}));
fs.writeFileSync(filename, JSON.stringify(cache));
console.log(`Stored ${Object.keys(cache).length}/${urls.length} stylesheet references outside src`);
