import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';

const RAW = 'C:/giri/v7/venture7-clone/raw';
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) files.push(p);
  }
})(RAW);

const stylesheetCount = new Map();
const bodyLinkCount = new Map();
let pagesWith = new Map();

for (const f of files) {
  const h = fs.readFileSync(f, 'utf8');
  const $ = cheerio.load(h);
  const sheetIds = new Set();
  $('head link[rel="stylesheet"]').each((_, el) => {
    const href = ($(el).attr('href') || '').split('?')[0];
    sheetIds.add(href);
  });
  for (const s of sheetIds) {
    stylesheetCount.set(s, (stylesheetCount.get(s) || 0) + 1);
    if (!pagesWith.has(s)) pagesWith.set(s, path.basename(f));
  }
  $('#page link, #content link').each((_, el) => {
    const href = ($(el).attr('href') || '').split('?')[0];
    bodyLinkCount.set(href, (bodyLinkCount.get(href) || 0) + 1);
  });
}

console.log('pages scanned:', files.length);
console.log('\n=== head stylesheets (unique href -> page count) ===');
for (const [k, v] of [...stylesheetCount].sort((a, b) => b[1] - a[1])) {
  console.log(String(v).padStart(4), k);
}
console.log('\n=== BODY <link> tags ===');
for (const [k, v] of [...bodyLinkCount].sort((a, b) => b[1] - a[1])) {
  console.log(String(v).padStart(4), k);
}
