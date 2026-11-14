import * as cheerio from 'cheerio';
import fs from 'node:fs';

const h = fs.readFileSync('C:/giri/v7/venture7-clone/raw/venture7-research.html', 'utf8');
const $ = cheerio.load(h);

$('a[href*="product-engineering"]').each((_, el) => {
  const $el = $(el);
  console.log('href=', JSON.stringify($el.attr('href')), '| class=', JSON.stringify($el.attr('class')));
});

// full serialization of a submenu item container
console.log('\n===== serialized =====\n');
console.log($.html($('#menu-item-14103')));
