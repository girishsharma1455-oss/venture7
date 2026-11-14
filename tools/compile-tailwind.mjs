/** Tailwind build plumbing. Authored UI styling remains className utilities. */
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';

const root = process.cwd();
const source = '@import "tailwindcss/theme.css";\n@import "tailwindcss/utilities.css" source(none);\n@config "./tailwind.config.mjs";\n@source "./src";\n@source not "./src/components/styles";\n';
const result = await postcss([tailwind()]).process(source, { from: path.join(root, 'tailwind-source.css') });
const cache = JSON.parse(fs.readFileSync('tools/reference-cache/styles.json', 'utf8'));
const assetFiles = fs.readdirSync('public/assets', { recursive: true }).filter(f => /\.(woff2?|ttf|otf)$/.test(f));
const replacements = new Map(fs.existsSync('artifacts/font-replacements.json') ? JSON.parse(fs.readFileSync('artifacts/font-replacements.json', 'utf8')).map(entry => [entry.original, entry.replacement]) : []);
const fontRules = new Set();
const missing = new Set();
for (const { css } of Object.values(cache)) {
  for (const match of css.matchAll(/@font-face\s*\{[^}]+\}/g)) {
    let rule = match[0];
    rule = rule.replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g, (all, quote, original) => {
      let url = replacements.get(original) || original.replace(/^https?:\/\/(?:[\w-]+\.)?venture7\.com/, '').replace('/wp-content/uploads/', '/assets/uploads/').replace('/wp-content/themes/venture7/', '/assets/theme/').replace('/wp-content/plugins/', '/assets/vendor/');
      const filename = url.split('/').pop().split('?')[0].split('#')[0];
      if (!fs.existsSync('public' + url.split(/[?#]/)[0])) {
        const found = assetFiles.find(f => path.basename(f).toLowerCase() === filename.toLowerCase());
        if (found) url = '/assets/' + found.replaceAll('\\', '/');
        else missing.add(original);
      }
      return `url("${url}")`;
    });
    fontRules.add(rule);
  }
}
fs.mkdirSync('.generated', { recursive: true });
fs.writeFileSync('.generated/tailwind.tsx', '// Generated Tailwind utilities and local font metadata. Do not edit.\nconst stylesheet = ' + JSON.stringify([...fontRules].join('\n') + '\n' + result.css) + ';\nexport default stylesheet;\n');
fs.writeFileSync('artifacts/font-audit.json', JSON.stringify({ rules: fontRules.size, unresolved: [...missing] }, null, 2));
console.log(`Compiled Tailwind utilities (${result.css.length} bytes) and ${fontRules.size} font declarations.`);
