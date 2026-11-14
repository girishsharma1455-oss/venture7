import fs from 'node:fs';
import * as cheerio from 'cheerio';

const f = 'C:/giri/v7/venture7-clone/raw/venture7-research.html';
const h = fs.readFileSync(f, 'utf8');
const $ = cheerio.load(h);
const els = $('a[href*="product-engineering"]');
els.each((_, el) => {
  const $el = $(el);
  const out = $.html(el);
  console.log('-----');
  console.log(out);
});
