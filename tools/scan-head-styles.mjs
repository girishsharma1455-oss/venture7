import fs from 'node:fs';
import * as cheerio from 'cheerio';

for (const f of process.argv.slice(2)) {
  const h = fs.readFileSync(f, 'utf8');
  const $ = cheerio.load(h);
  console.log('\n===== ' + f.split(/[\\/]/).pop());
  $('head style').each((_, el) => {
    const $e = $(el);
    const id = $e.attr('id') || ('related=' + ($e.attr('data-related') || '?'));
    const txt = $e.text().length;
    console.log('  <style ' + id + '> len=' + txt);
  });
  // also body-level <style> tags inside #page / #content
  $('#page style, #content style').each((i, el) => {
    const $e = $(el);
    const id = $e.attr('id') || ('related=' + ($e.attr('data-related') || '?'));
    console.log('  [body] <style ' + id + '> len=' + $e.text().length);
  });
}
