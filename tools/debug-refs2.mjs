import fs from 'node:fs';
import * as cheerio from 'cheerio';

const f = 'C:/giri/v7/venture7-clone/raw/about-us.html';
const h = fs.readFileSync(f, 'utf8');
const $ = cheerio.load(h, { decodeEntities: false });

let n = 0;
$('[src],[href],[poster]').each((_, el) => {
  for (const attr of ['src', 'href', 'poster']) {
    const v = $(el).attr(attr);
    if (v && v.startsWith('/wp-content')) {
      const p = v.split('?')[0].split('#')[0];
      const t = targetFor(p);
      if (t === null && n < 8) {
        console.log('NULL-TARGET ref:', JSON.stringify(v.slice(0, 140)));
        n++;
      }
    }
  }
});

function targetFor(p) {
  if (p.startsWith('/wp-content/uploads/elementor/google-fonts/')) return '/assets/uploads/elementor/google-fonts/...';
  if (p.startsWith('/wp-content/uploads/')) return '/assets/uploads/...';
  if (p.startsWith('/wp-content/plugins/')) return '/assets/vendor/...';
  if (p.startsWith('/wp-content/themes/venture7/')) return '/assets/theme/...';
  if (p.startsWith('/wp-content/cache/breeze-minification/css/')) return '/assets/css/pages/...';
  return null;
}
