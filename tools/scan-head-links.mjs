import fs from 'node:fs';
import * as cheerio from 'cheerio';

for (const page of ['about-us', 'contact', 'agentic-ai', 'career', 'hotel-bot-demo', 'blog']) {
  const h = fs.readFileSync(`C:/giri/v7/venture7-clone/raw/${page}.html`, 'utf8');
  const $ = cheerio.load(h);
  const links = $('head link[rel="stylesheet"]').map((_, el) => $(el).attr('href').split('?')[0]).get();
  console.log('\n===== ' + page + ' (' + links.length + ' head sheets)');
  for (const l of links) console.log('   ', l);
}
