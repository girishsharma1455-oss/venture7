/** Final asset pass for TSX/Tailwind pages. No CSS or placeholder images are emitted. */
import fs from 'node:fs';
import path from 'node:path';
import parser from 'next/dist/compiled/babel/parser.js';

const root = process.cwd();
const publicRoot = path.resolve('public');
const assetRoot = path.resolve('public/assets') + path.sep;
const report = { downloaded: [], replacements: [], iconReplacements: [], removedDuplicateSources: [], removedUnavailableDecorations: [], unresolvedImages: [], unresolvedLinks: [], unresolvedFonts: [] };
const fontMetadata = fs.existsSync('artifacts/font-replacements.json')
  ? JSON.parse(fs.readFileSync('artifacts/font-replacements.json', 'utf8')) : [];
const fontAudit = fs.existsSync('artifacts/font-audit.json') ? JSON.parse(fs.readFileSync('artifacts/font-audit.json', 'utf8')) : { unresolved: [] };
const filesOnDisk = () => fs.readdirSync('public/assets', { recursive: true }).filter(f => fs.statSync(path.join('public/assets', f)).isFile());
let diskFiles = filesOnDisk();
const normalize = value => value.trim().replaceAll('&amp;', '&').replaceAll('\\_', '_');
const jsxQuote = value => '"' + value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;') + '"';
const strip = value => normalize(value).split(/[?#]/)[0];
const exists = value => {
  try { return fs.existsSync(path.join(publicRoot, decodeURIComponent(strip(value)))); }
  catch { return fs.existsSync(path.join(publicRoot, strip(value))); }
};
const basename = value => path.basename(strip(value));
const toLocal = value => value.replace(/^https?:\/\/(?:[\w-]+\.)?venture7\.com/i, '').replace('/wp-content/uploads/', '/assets/uploads/').replace('/wp-content/themes/venture7/', '/assets/theme/').replace('/wp-content/plugins/', '/assets/vendor/');
const toRemote = value => 'https://www.venture7.com' + value.replace('/assets/uploads/', '/wp-content/uploads/').replace('/assets/theme/', '/wp-content/themes/venture7/').replace('/assets/vendor/', '/wp-content/plugins/');

async function download(url, local) {
  const destination = path.resolve('public' + strip(local));
  if (!destination.startsWith(assetRoot)) throw new Error('Asset path escaped public/assets');
  const response = await fetch(url, { signal: AbortSignal.timeout(35000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if ((response.headers.get('content-type') || '').includes('text/html') || /^\s*(?:<!doctype|<html)/i.test(buffer.subarray(0, 100).toString())) throw new Error('HTML response');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, buffer);
  report.downloaded.push({ url, local });
}

// Font metadata belongs to build plumbing outside src. Google originals are
// mirrored locally; legacy icon files already exist under the theme font path.
for (const original of fontAudit.unresolved || []) {
  const local = toLocal(original);
  if (local.startsWith('/assets/') && exists(local)) {
    if (!fontMetadata.some(entry => entry.original === original)) fontMetadata.push({ original, replacement: local });
    continue;
  }
  try {
    const url = new URL(original, 'https://www.venture7.com');
    const target = url.hostname === 'fonts.gstatic.com'
      ? '/assets/fonts/google/' + path.basename(url.pathname)
      : toLocal(url.href);
    if (!exists(target)) await download(url.href, target);
    if (!fontMetadata.some(entry => entry.original === original)) fontMetadata.push({ original, replacement: target });
  } catch (error) { report.unresolvedFonts.push({ original, error: String(error) }); }
}
fs.writeFileSync('artifacts/font-replacements.json', JSON.stringify(fontMetadata, null, 2));
if (process.argv.includes('--fonts-only')) {
  console.log(JSON.stringify({ fonts: fontMetadata, unresolved: report.unresolvedFonts }, null, 2));
  process.exit(report.unresolvedFonts.length ? 1 : 0);
}

if (!process.argv.includes('--force')) {
  const pending = [0, 1, 2, 3].filter(index => !fs.existsSync(`artifacts/tailwind-conversion-${index}.json`));
  if (pending.length) throw new Error(`Wait for conversion shards ${pending.join(', ')} before running this final pass.`);
}

diskFiles = filesOnDisk();
const exactVariants = new Map([
  ['/assets/uploads/2025/03/Bg-Image-1.jpg', '/assets/uploads/2025/07/08100358/Bg-Image-1.webp'],
  ['/assets/uploads/2024/09/Data-Migration.png', '/assets/uploads/2025/07/08100416/Data-Migration.webp'],
  ['/assets/uploads/2025/07/healthtech-1.webp', '/assets/uploads/2025/07/08100419/healthtech.webp'],
  ['/assets/uploads/2025/07/Gas-Industry.webp', '/assets/uploads/2025/01/08100432/Medical-Gas.webp'],
  ['/assets/uploads/2025/06/product_banner.jpg', '/assets/uploads/2025/07/08100404/product_banner-20250721-103803.webp'],
]);
const semanticIcons = new Map([
  ['Integration-with-Existing-Systems.png', 'Workflow'],
  ['User-Training-Support.png', 'GraduationCap'],
  ['Requirement-Gathering.png', 'ClipboardList'],
  ['Configuration-Customization.png', 'Settings2'],
  ['Solution-Designing.png', 'PencilRuler'],
  ['Experienced-Team.png', 'Users'],
  ['Future-Ready-Solutions.png', 'Rocket'],
  ['Scalable-Implementations.png', 'Expand'],
  ['Custom-Solutions.png', 'Puzzle'],
  ['Dedicated-SPOC.png', 'UserRoundCheck'],
  ['Transparent-Process.png', 'Eye'],
  ['icondevops.png', 'Workflow'],
]);
const unavailableKnown = new Set((JSON.parse(fs.readFileSync('artifacts/route-discovery.json', 'utf8')).unavailableAssets || []).map(item => item.local));
const resolution = new Map();
function variant(value) {
  const local = strip(value);
  if (exactVariants.has(local) && exists(exactVariants.get(local))) return exactVariants.get(local);
  const name = basename(local).toLowerCase();
  let candidates = diskFiles.filter(f => path.basename(f).toLowerCase() === name);
  if (candidates.length) return '/assets/' + candidates.sort((a, b) => a.length - b.length)[0].replaceAll('\\', '/');
  const stem = path.basename(name, path.extname(name)).replace(/-\d+x\d+$/, '');
  candidates = diskFiles.filter(f => path.basename(f, path.extname(f)).toLowerCase() === stem && /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(f));
  if (candidates.length === 1) return '/assets/' + candidates[0].replaceAll('\\', '/');
  return null;
}

const sourceFiles = fs.readdirSync('src', { recursive: true }).filter(f => f.endsWith('.tsx')).map(f => path.join('src', f));
const allSources = new Map(sourceFiles.map(file => [file, fs.readFileSync(file, 'utf8')]));
const refs = new Set();
for (const source of allSources.values()) {
  for (const match of source.matchAll(/\/(?:assets|wp-content)\/[^\s"'<>\])}]+/g)) {
    let value = normalize(match[0]);
    // Attribute values and utility url() values end at a closing parenthesis.
    value = value.replace(/[),;]+$/, '');
    if (/\.(?:png|jpe?g|webp|gif|svg|ico|avif|woff2?|ttf|eot|mp4|webm|ogg|mp3|pdf)(?:[?#].*)?$/i.test(value)) refs.add(toLocal(value));
  }
}
const queue = [...refs];
await Promise.all(Array.from({ length: 8 }, async () => {
  while (queue.length) {
    const value = queue.shift();
    const local = toLocal(value);
    if (exists(local)) { resolution.set(value, local); continue; }
    const equivalent = variant(local);
    if (equivalent) { resolution.set(value, equivalent); continue; }
    if (!unavailableKnown.has(strip(local))) {
      try { await download(toRemote(local), local); resolution.set(value, local); continue; }
      catch {}
    }
    resolution.set(value, null);
  }
}));

function getValue(attribute) {
  const value = attribute?.value;
  if (value?.type === 'StringLiteral') return value.value;
  if (value?.type === 'JSXExpressionContainer' && value.expression?.type === 'StringLiteral') return value.expression.value;
  return null;
}
function resolve(value) {
  const normalized = toLocal(normalize(value));
  if (!normalized.startsWith('/assets/')) return value;
  if (exists(normalized)) return normalized;
  return resolution.get(normalized) || variant(normalized);
}
let changedFiles = 0;
for (const [file, source] of allSources) {
  const sf = parser.parse(source, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  const edits = [];
  const icons = new Set();
  const addEdit = (start, end, replacement) => edits.push({ start, end, replacement });
  function visit(node) {
    if (node.type === 'JSXOpeningElement') {
      const tag = node.name.name;
      const attributes = node.attributes.filter(attribute => attribute.type === 'JSXAttribute');
      const attribute = name => attributes.find(a => a.name.name === name);
      const sourceAttribute = attribute('src');
      const original = getValue(sourceAttribute, sf);
      if (original && toLocal(original).startsWith('/assets/')) {
        const value = resolve(original);
        if (value) {
          if (value !== original) {
            addEdit(sourceAttribute.value.start, sourceAttribute.value.end, JSON.stringify(value));
            report.replacements.push({ file, original, replacement: value });
          }
        } else if (tag === 'img' && node.selfClosing) {
          const name = basename(original);
          const className = getValue(attribute('className'), sf) || '';
          const alt = getValue(attribute('alt'), sf) || name.replace(/\.[^.]+$/, '').replaceAll('-', ' ');
          if (name === 'party-emoji.png') {
            addEdit(node.start, node.end, `<span role="img" aria-label="Celebration" className=${jsxQuote(className)}>🎉</span>`);
          } else if (semanticIcons.has(name)) {
            const icon = semanticIcons.get(name);
            icons.add(icon);
            // Keep the page's exact sizing/color utilities; these are content
            // icons with equivalent meaning, rather than generic image fallbacks.
            addEdit(node.start, node.end, `<${icon} role="img" aria-label=${jsxQuote(alt)} strokeWidth={1.5} className=${jsxQuote(className + ' text-[#035c56]')} />`);
            report.iconReplacements.push({ file, original, icon });
          } else {
            report.unresolvedImages.push({ file, original, tag });
          }
          return;
        } else if (tag === 'source' && /\.ogg\s*$/i.test(original) && exists(original.trim().replace(/\.ogg$/i, '.mp4'))) {
          addEdit(node.start, node.end, '');
          report.removedDuplicateSources.push({ file, original, reason: 'The video already supplies its available MP4 source.' });
          return;
        } else { report.unresolvedImages.push({ file, original, tag }); }
      }
      const setAttribute = attribute('srcSet');
      const setValue = getValue(setAttribute, sf);
      if (setValue) {
        const available = setValue.split(',').map(part => {
          const [url, ...descriptor] = part.trim().split(/\s+/);
          const replacement = resolve(url);
          return replacement ? [replacement, ...descriptor].join(' ') : null;
        }).filter(Boolean);
        if (available.join(', ') !== setValue) {
          if (available.length) addEdit(setAttribute.value.start, setAttribute.value.end, JSON.stringify(available.join(', ')));
          else addEdit(setAttribute.start, setAttribute.end, '');
        }
      }
      for (const name of ['poster', 'href']) {
        const attr = attribute(name);
        const original = getValue(attr, sf);
        if (!original || !toLocal(original).startsWith('/assets/')) continue;
        const replacement = resolve(original);
        if (replacement && replacement !== original) {
          addEdit(attr.value.start, attr.value.end, JSON.stringify(replacement));
          report.replacements.push({ file, original, replacement });
        } else if (!replacement) { report.unresolvedLinks.push({ file, original, attribute: name }); }
      }
      const classAttribute = attribute('className');
      const originalClasses = getValue(classAttribute, sf);
      if (originalClasses?.includes('url(')) {
        const classes = originalClasses.replace(/url\(\s*(['"]?)(\/assets\/[^)'"\s]+)\1\s*\)/g, (match, quote, original) => {
          const replacement = resolve(original);
          if (replacement) return `url(${quote}${replacement}${quote})`;
          report.removedUnavailableDecorations.push({ file, original });
          return 'none';
        });
        if (classes !== originalClasses) addEdit(classAttribute.value.start, classAttribute.value.end, jsxQuote(classes));
      }
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === 'loc' || key === 'extra' || key.endsWith('Comments')) continue;
      if (Array.isArray(value)) { for (const child of value) if (child?.type) visit(child); }
      else if (value?.type) visit(value);
    }
  }
  visit(sf);
  if (!edits.length) continue;
  // Inner attribute edits cannot overlap an image replacement; those branches
  // return above, keeping the source transform deterministic and idempotent.
  let result = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) result = result.slice(0, edit.start) + edit.replacement + result.slice(edit.end);
  if (icons.size) {
    const imports = `import { ${[...icons].sort().join(', ')} } from 'lucide-react';\n`;
    const directive = result.match(/^(?:\/\/[^\n]*\n)?(?:['"]use client['"];?\s*\n)?/)[0];
    result = result.slice(0, directive.length) + imports + result.slice(directive.length);
  }
  fs.writeFileSync(file, result);
  changedFiles++;
}
fs.writeFileSync('artifacts/tailwind-asset-audit.json', JSON.stringify({ ...report, scannedFiles: sourceFiles.length, changedFiles }, null, 2));
console.log(JSON.stringify({ scannedFiles: sourceFiles.length, changedFiles, downloads: report.downloaded.length, replacements: report.replacements.length, icons: report.iconReplacements.length, removedDecorations: report.removedUnavailableDecorations.length, unresolvedImages: report.unresolvedImages, unresolvedLinks: report.unresolvedLinks, unresolvedFonts: report.unresolvedFonts }, null, 2));
process.exitCode = report.unresolvedImages.length || report.unresolvedLinks.length || report.unresolvedFonts.length ? 1 : 0;
