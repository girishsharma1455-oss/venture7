import fs from 'node:fs';
import * as cheerio from 'cheerio';

const f = 'C:/giri/v7/venture7-clone/raw/about-us.html';
const h = fs.readFileSync(f, 'utf8');
const $ = cheerio.load(h, { decodeEntities: false });

let n = 0;
$('[src],[href]').each((_, el) => {
  for (const attr of ['src', 'href']) {
    const v = $(el).attr(attr);
    if (v && v.startsWith('/wp-content') && !v.includes('/uploads/') && !v.includes('/plugins/') && !v.includes('/themes/') && !v.includes('cache') && n < 10) {
      console.log(JSON.stringify(v));
      n++;
    }
  }
});
