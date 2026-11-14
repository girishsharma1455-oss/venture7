/** One-time migration: keep the reference site's cascade, but author styles in TSX. */
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';

const root = process.cwd();
const output = path.join(root, 'src/components/styles');
fs.mkdirSync(output, { recursive: true });
const files = fs.readdirSync('src', { recursive: true }).filter(f => f.endsWith('.tsx') && !f.includes('components\\styles'));
const manifestPath = path.join(output, 'manifest.json');
const modules = new Map(fs.existsSync(manifestPath) ? Object.entries(JSON.parse(fs.readFileSync(manifestPath, 'utf8'))) : []);
const literal = text => '`' + text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`';

function stylesheet(href) {
  if (modules.has(href)) return modules.get(href);
  const relative = href.replace(/^\/assets\/css\//, '').replace(/^\/assets\/uploads\/elementor\/css\//, 'elementor/').replace(/^\/assets\/theme\//, 'theme/');
  const source = path.join(root, 'src/css', relative);
  if (!fs.existsSync(source)) throw new Error(`Missing stylesheet: ${href} (${source})`);
  const name = 'Style' + relative.replace(/\.css$/, '').split(/[^a-zA-Z0-9]+/).map(s => s[0].toUpperCase() + s.slice(1)).join('');
  let css = fs.readFileSync(source, 'utf8');
  // Inline CSS resolves URLs against the document, rather than the old CSS URL.
  // Preserve media paths on nested routes by making every relative url absolute.
  css = css.replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g, (match, quote, url) => {
    if (/^(?:[a-z]+:|\/|#)/i.test(url)) return match;
    return `url("${new URL(url, 'https://local.invalid' + href).pathname}")`;
  }).replace(/\/\*# sourceMappingURL=[\s\S]*?\*\//g, '');
  // Expand minified source into readable rules so TSX is useful to edit.
  try {
    const ast = postcss.parse(css);
    ast.walkRules(rule => { rule.raws.before = '\n'; });
    ast.walkAtRules(rule => { rule.raws.before = '\n'; });
    ast.walkDecls(decl => { decl.raws.before = '\n  '; });
    css = ast.toString();
  } catch {
    console.warn(`Preserving browser-tolerated legacy syntax in ${relative}`);
  }
  fs.writeFileSync(path.join(output, name + '.tsx'), `/** Venture7 reference styles. Edit the rules here; no external stylesheet is loaded. */\nconst styles = ${literal(css)};\n\nexport default function ${name}() {\n  return <style data-venture7-style=${JSON.stringify(relative)} dangerouslySetInnerHTML={{ __html: styles }} />;\n}\n`);
  modules.set(href, name);
  return name;
}

let changed = 0;
for (const relative of files) {
  const file = path.join('src', relative);
  const original = fs.readFileSync(file, 'utf8');
  const imports = new Set();
  const next = original.replace(/<link\b[^>]*rel="stylesheet"[^>]*\/>/g, tag => {
    const href = tag.match(/href="([^"]+)"/)?.[1];
    if (!href) throw new Error(`Missing href: ${file}`);
    const name = stylesheet(href);
    imports.add(name);
    return `<${name} />`;
  });
  if (next !== original) {
    const lines = [...imports].map(name => `import ${name} from '@/components/styles/${name}';`).join('\n');
    // Keep the client directive and ts-nocheck comment at the start of a file.
    const position = next.startsWith("'use client';") ? next.indexOf('\n') + 1 : next.startsWith('/*') ? next.indexOf('*/') + 2 : 0;
    fs.writeFileSync(file, next.slice(0, position) + '\n' + lines + '\n' + next.slice(position));
    changed++;
  }
}
fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(Object.fromEntries(modules), null, 2) + '\n');
console.log(`Migrated ${changed} TSX files; ${modules.size} shared TSX style components.`);
