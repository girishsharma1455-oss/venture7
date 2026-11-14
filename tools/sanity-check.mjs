import fs from 'node:fs';
import * as cheerio from 'cheerio';

const h = fs.readFileSync('C:/giri/v7/venture7-clone/raw/future-of-work.html', 'utf8');
const $ = cheerio.load(h);
const el = $('p.banner__para').first();
console.log(JSON.stringify($.html(el)));
console.log('\ndata-settings on widget:');
const w = $('.elementor-element-95f08db').first();
console.log(JSON.stringify(w.attr('data-settings')));
