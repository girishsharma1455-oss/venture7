import * as cheerio from 'cheerio';
import fs from 'node:fs';

const h = fs.readFileSync('C:/giri/v7/venture7-clone/raw/future-of-work.html', 'utf8');
console.log('has raw stray:', /class="banner__para" " \/></.test(h), h.indexOf('banner__para'));

const $ = cheerio.load(h);
const el = $('p.banner__para').first();
console.log('cheerio first:', $.html(el));
const page = $('#page').first();
const raw = $.html(page);
console.log('contains \"\"=\"\":', raw.indexOf('""=""') >= 0);
const fixed = raw.replace(/ ""=""/g, '');
console.log('fixed contains stray:', fixed.includes('""=""'));
const p = cheerio.load(fixed)('p.banner__para').first();
console.log('after replace:', cheerio.load(fixed)('p.banner__para').first().parent().html());
