import * as cheerio from 'cheerio';
import fs from 'node:fs';

const h = fs.readFileSync('C:/giri/v7/venture7-clone/raw/future-of-work.html', 'utf8');
const $ = cheerio.load(h);
const el = $('p.banner__para').first()[0];
console.log('attribs:', JSON.stringify(el.attribs));
const all = [];
$('*').each((_, e) => {
  for (const k of Object.keys(e.attribs || {})) {
    if (k === '' || k === '"' || /^"=/.test(k) || /^"/.test(k)) all.push({ tag: e.name, k, v: e.attribs[k] });
  }
});
console.log('stray attributes across document:', all.length);
for (const a of all.slice(0, 30)) console.log(a);
