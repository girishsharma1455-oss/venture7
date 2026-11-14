/** Compile TSX utility classes into a TSX style component; no CSS file is served. */
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';

const result = await postcss([tailwind()]).process(
  '@import "tailwindcss" source(none);\n@source "../";\n@source not "../components/styles";\n',
  { from: path.resolve('src/app/utility-source.css') },
);
const text = result.css.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
fs.writeFileSync('src/components/styles/UtilityStyles.tsx', `/** Generated from utility classes in TSX by tools/build-utilities.mjs. */\nexport default function UtilityStyles() {\n  return <style data-venture7-style="utilities" dangerouslySetInnerHTML={{ __html: \`${text}\` }} />;\n}\n`);
console.log('Updated TSX utility styles.');
