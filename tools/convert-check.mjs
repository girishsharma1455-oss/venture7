import fs from 'node:fs';
import * as cheerio from 'cheerio';
import htmltojsx from 'htmltojsx';

const h = fs.readFileSync('C:/giri/v7/venture7-clone/raw/venture7-research.html', 'utf8');
const $ = cheerio.load(h);
const raw = $.html($('#menu-item-14103'));
console.log('--- cheerio out ---');
console.log(raw);

const c = new htmltojsx();
const out = c.convert(raw);
console.log('--- converter out ---');
console.log(out);
