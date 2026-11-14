/** Enforce the requested TSX/Tailwind source contract and route coverage. */
import fs from 'node:fs';
import path from 'node:path';
import parser from 'next/dist/compiled/babel/parser.js';

const routes = JSON.parse(fs.readFileSync('routes.json', 'utf8'));
const discovered = JSON.parse(fs.readFileSync('artifacts/route-discovery.json', 'utf8'));
const aliases = new Map([...discovered.aliases.map(r => [r.route, r.destination]), ['/salesforce/', '/salesforce-consulting/'], ['/SaaS-apps-using-laravel/', '/saas-apps-using-laravel/']]);
const knownRoutes = new Set(routes.map(r => r.route));
const failures = [];
const links = new Map();
let pages = 0, forms = 0, images = 0;
const sourceFiles = fs.readdirSync('src', { recursive: true }).filter(f => fs.statSync(path.join('src', f)).isFile());
for (const relative of sourceFiles) {
  const file = path.join('src', relative);
  if (!file.endsWith('.tsx')) { failures.push({ file, reason: 'Only TSX files are allowed inside src' }); continue; }
  const source = fs.readFileSync(file, 'utf8');
  if (/<venture-(?:header|footer)\b/.test(source)) failures.push({ file, reason: 'Unresolved shared navigation component' });
  const ast = parser.parse(source, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  if (file.endsWith('page.tsx')) pages++;
  const walk = node => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'ImportDeclaration' && /\.(css|scss|js|jsx|html)$/.test(node.source.value)) failures.push({ file, reason: 'Forbidden source import', value: node.source.value });
    if (node.type === 'JSXOpeningElement' || node.type === 'JSXSelfClosingElement') {
      const tag = node.name?.name;
      if (tag === 'script' || tag === 'Script') failures.push({ file, reason: 'External or embedded application script' });
      if (tag === 'style' && relative !== 'app\\layout.tsx' && relative !== 'app/layout.tsx') failures.push({ file, reason: 'Custom CSS style tag' });
      if (tag === 'form') forms++;
      if (tag === 'img') images++;
      for (const attr of node.attributes || []) {
        if (attr.type !== 'JSXAttribute') continue;
        if (attr.name.name === 'style') failures.push({ file, reason: 'Inline CSS attribute' });
        if (attr.name.name === 'href' && attr.value?.type === 'StringLiteral' && /^\/(?!\/)/.test(attr.value.value)) {
          const value = attr.value.value;
          if (!links.has(value)) links.set(value, []);
          links.get(value).push(file);
        }
      }
    }
    for (const [key, value] of Object.entries(node)) {
      if (['loc', 'extra', 'comments', 'tokens'].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') walk(value);
    }
  };
  walk(ast.program);
}
for (const { route } of routes) {
  const file = route === '/' ? 'src/app/page.tsx' : path.join('src/app', route.slice(1), 'page.tsx');
  if (!fs.existsSync(file)) failures.push({ route, reason: 'Missing dedicated route component' });
}
const brokenLinks = [];
for (const [href, files] of links) {
  const clean = href.split(/[?#]/)[0];
  if (!clean) continue;
  const normalized = clean.endsWith('/') ? clean : clean + '/';
  if (knownRoutes.has(normalized) || aliases.has(normalized)) continue;
  let asset;
  try { asset = path.join('public', decodeURIComponent(clean)); } catch { asset = path.join('public', clean); }
  if (fs.existsSync(asset)) continue;
  brokenLinks.push({ href, pages: files.length, from: files[0] });
}
const result = { files: sourceFiles.length, pages, expectedPages: routes.length, forms, images, internalLinks: links.size, failures, brokenLinks };
fs.writeFileSync('artifacts/source-verification.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
process.exitCode = failures.length || brokenLinks.length || pages !== routes.length ? 1 : 0;
