/**
 * Converts the original (already mirrored) venture7.com page markup into
 * React + TypeScript pages under src/app/<route>/page.tsx.
 *
 * The output contains NO WordPress runtime: WP scripts are dropped, WP-only
 * cache/plugin assets are rewritten to the self-hosted /assets tree, and the
 * theme's own front-end JS is served as plain scripts from /assets/theme/js.
 *
 * Usage: node tools/generate-pages.mjs [limit]
 */
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import htmltojsx from 'htmltojsx';

const ROOT = 'C:/giri/v7';
const RAW = path.join(ROOT, 'venture7-clone/raw');
const V8 = path.join(ROOT, 'v8');
const PUB = path.join(V8, 'public');
const APP_SRC = path.join(V8, 'src');
const ASSETS_ON_DISK = path.join(PUB, 'assets');
const STYLE_COMPONENTS = JSON.parse(fs.readFileSync(path.join(APP_SRC, 'components/styles/manifest.json'), 'utf8'));

const converter = new htmltojsx();
const LIMIT = Number(process.argv[2] || Infinity);

/* The site's current stylesheets (synced from the live site by
   tools/sync-live-css.mjs). When a route is present here we serve exactly the
   CSS the live site serves for it, so the layout matches the live design. */
let LIVE_CSS = {};
try {
  LIVE_CSS = JSON.parse(fs.readFileSync(path.join(V8, 'tools/live-css-map.json'), 'utf8'));
} catch {
  console.log('no live css map found — using the mirrored markup styles');
}

/* Every file that exists under public/assets (checked once) */
const assetsOnDisk = new Set();
(function collectAssets(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) collectAssets(p);
    else assetsOnDisk.add(relFromPublic(p));
  }
})(ASSETS_ON_DISK);
function relFromPublic(p) {
  return '/' + path.relative(PUB, p).replace(/\\/g, '/');
}
console.log('asset paths on disk:', assetsOnDisk.size);

/* ---------- asset path rewriting ---------- */
const STRIP_QUERY = (u) => u.split('?')[0].split('#')[0];
const DECODE = (u) => {
  try { return decodeURIComponent(u); } catch { return u; }
};

// Root-absolute (or same-origin absolute) path -> new /assets/... path, or null to drop.
function rewritePath(pathname) {
  let p = DECODE(STRIP_QUERY(pathname).trim());
  if (p.startsWith('/wp-content/uploads/')) return '/assets/uploads/' + p.slice('/wp-content/uploads/'.length);
  if (p.startsWith('/wp-content/themes/venture7/')) return '/assets/theme/' + p.slice('/wp-content/themes/venture7/'.length);
  if (p.startsWith('/wp-content/plugins/')) return '/assets/vendor/' + p.slice('/wp-content/plugins/'.length);
  if (p.startsWith('/wp-content/cache/breeze-minification/css/')) {
    const base = p.slice('/wp-content/cache/breeze-minification/css/'.length);
    const m = base.match(/-([0-9a-f]{12})\.css$/);
    return '/assets/css/pages/' + (m ? 'breeze-' + m[1] + '.css' : base);
  }
  if (p.startsWith('/wp-content/cache/')) return null; // breeze JS bundles — dropped by design
  if (p.startsWith('/_ext/')) return '/assets/vendor/' + p.slice('/_ext/'.length);
  if (p.startsWith('/wp-includes/')) return null;       // emoji + block-library css
  if (p.startsWith('/wp-admin/')) return null;          // admin-ajax etc.
  return p;
}

// Whole-string rewrite applied to serialized HTML / CSS strings.
function rewriteAssetStrings(s) {
  return s
    // breeze css page bundles FIRST (they are content-hashed)
    .replace(/(https?:\/\/(www\.)?venture7\.com)?\/wp-content\/cache\/breeze-minification\/css\/(?:breeze_)?[A-Za-z0-9_.-]*?-([0-9a-f]{12})\.css(\?[^"')\s]*)?/gi,
      '/assets/css/pages/breeze-$3.css')
    // same-origin absolute URLs
    .replace(/https?:\/\/(www\.)?venture7\.com\/wp-content\/uploads\//gi, '/assets/uploads/')
    .replace(/https?:\/\/(www\.)?venture7\.com\/wp-content\/themes\/venture7\//gi, '/assets/theme/')
    .replace(/https?:\/\/(www\.)?venture7\.com\/wp-content\/plugins\//gi, '/assets/vendor/')
    .replace(/https?:\/\/(www\.)?venture7\.com\/wp-content\//gi, '/assets/vendor/')
    .replace(/https?:\/\/(www\.)?venture7\.com\/_ext\//gi, '/assets/vendor/')
    .replace(/\/\/www\.venture7\.com\/wp-content\/uploads\//gi, '/assets/uploads/')
    .replace(/\/\/www\.venture7\.com\/_ext\//gi, '/assets/vendor/')
    .replace(/\/\/www\.venture7\.com\//gi, '/')
    .replace(/https?:\/\/(www\.)?venture7\.com\//gi, '/')
    // root-absolute
    .replace(/\/wp-content\/uploads\//gi, '/assets/uploads/')
    .replace(/\/wp-content\/themes\/venture7\//gi, '/assets/theme/')
    .replace(/\/wp-content\/plugins\//gi, '/assets/vendor/')
    .replace(/\/_ext\//gi, '/assets/vendor/')
    .replace(/\/wp-content\//gi, '/assets/vendor/')
    // stray whitespace inside attribute URLs (found in the source theme)
    .replace(/(\s(?:src|href|poster)=")\s+/g, '$1')
    .replace(/(\s(?:src|href|poster)="[^"]*?)\s+"/g, '$1"')
    // escaped variants inside JSON payloads (elementor data-settings & friends)
    .replace(/https?:\\\/\\\/(www\.)?venture7\.com\\\/wp-content\\\/uploads\\\//gi, '/assets/uploads/')
    .replace(/https?:\\\/\\\/(www\.)?venture7\.com\\\/wp-content\\\/themes\\\/venture7\\\//gi, '/assets/theme/')
    .replace(/https?:\\\/\\\/(www\.)?venture7\.com\\\/wp-content\\\/plugins\\\//gi, '/assets/vendor/')
    .replace(/https?:\\\/\\\/(www\.)?venture7\.com\\\/wp-content\\\//gi, '/assets/vendor/')
    .replace(/https?:\\\/\\\/(www\.)?venture7\.com\\\//gi, '/')
    // Lazy-loaded media was stored in data-breeze by the cache plugin; promote
    // it to a real src attribute so media loads without that plugin.
    .replace(/data-breeze="/gi, 'src="')
    // drop sourceURL debug comments (they point at WordPress files)
    .replace(/\/\*# sourceURL=[^*]*\*\//g, '');
}

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith('.html')) out.push(path.relative(RAW, p));
  }
  return out;
}
const files = walk(RAW).sort((a, b) => a.localeCompare(b));
console.log('raw files:', files.length);

function routeForFile(rel) {
  const clean = rel.replace(/\\/g, '/').replace(/\.html$/, '');
  if (clean === 'home') return '/';
  return '/' + clean + '/';
}

const routeMap = [];
const SKIP_LOG = [];
let ok = 0;
let skipped = 0;
const droppedLinks = new Map();

for (const rel of files.slice(0, LIMIT)) {
  const route = routeForFile(rel);
  const abs = path.join(RAW, rel);
  const html = fs.readFileSync(abs, 'utf8');
  const $ = cheerio.load(html, { decodeEntities: false });

  const pageEl = $('#page').first().length ? $('#page').first() : $('#content').first();
  if (!pageEl.length) {
    SKIP_LOG.push({ route, rel, reason: 'no #page or #content' });
    skipped++;
    continue;
  }

  const bodyClass = $('body').attr('class') || '';
  const title = rewriteAssetStrings($('title').text().trim());
  const description = rewriteAssetStrings(($('meta[name="description"]').attr('content') || '').trim());

  // ---- head <link rel="stylesheet"> in the theme's own order ----
  const live = LIVE_CSS[route];
  const headLinks = [];
  if (live && live.css && live.css.length) {
    // the stylesheets the live site serves for this page right now
    for (const href of live.css) headLinks.push(href);
  } else {
    $('head link[rel="stylesheet"]').each((_, el) => {
      const original = $(el).attr('href');
      if (!original) return;
      const t = rewritePath(original);
      if (!t) return; // dropped by design (WP runtime)
      if (!assetsOnDisk.has(t)) {
        droppedLinks.set(t, (droppedLinks.get(t) || 0) + 1);
        return; // not served — skip so the page doesn't 404
      }
      headLinks.push(t);
    });
  }

  // ---- inline <style> blocks (all pure CSS) ----
  // Prefer the live site's current blocks; fall back to the mirrored markup.
  const headStyles = [];
  if (live && live.styles && live.styles.length) {
    for (const s of live.styles) headStyles.push(s.css);
  } else {
    $('head style').each((_, el) => {
      const css = $(el).text().trim();
      if (css) headStyles.push(rewriteAssetStrings(css));
    });
  }

  // ---- stray rogue quote / ";" / lone '"' attributes from the theme's broken markup ----
  $('*').each((_, el) => {
    for (const k of Object.keys(el.attribs || {})) {
      if (k === '' || k === ';' || k === '"' || k.startsWith('"') || k.startsWith("'")) {
        delete el.attribs[k];
      }
    }
  });

  // ---- body <style> blocks -> keep as styles ----
  // (when the live style set is used it already contains the body's blocks)
  const bodyStyles = [];
  if (!(live && live.styles && live.styles.length)) {
    pageEl.find('style').each((_, el) => {
      const css = $(el).text().trim();
      if (css) bodyStyles.push(rewriteAssetStrings(css));
    });
  }
  pageEl.find('style').remove();
  // ---- body <script> -> dropped (WP runtime) ----
  pageEl.find('script').remove();
  // ---- drop noscript (its content is a duplicate of the tracking setup) ----
  pageEl.find('noscript').remove();

  // ---- SmartSlider: emit the state the slider engine would produce ----
  // The hero slides are positioned by the plugin's JS; without it every slide
  // stays translated off-screen and the headline layers stay invisible.
  // Writing the same state into the markup keeps the server HTML identical to
  // the hydrated DOM (no hydration mismatch) and shows the hero without JS.
  pageEl.find('.n2-ss-slider').each((_, sEl) => {
    const $s = $(sEl);
    const slides = $s.find('.n2-ss-slide').toArray();
    const backgrounds = $s.find('.n2-ss-slide-backgrounds > .n2-ss-slide-background').toArray();

    slides.forEach((el, i) => {
      const $el = $(el);
      const active = i === 0;
      const existing = ($el.attr('style') || '').replace(/transform:[^;]*;?/i, '').replace(/opacity:[^;]*;?/i, '').trim();
      const style = `transform:${active ? 'translateX(0%)' : 'translateX(-100000px)'};opacity:${active ? '1' : '0'};visibility:visible;${existing}`;
      $el.attr('style', style);
      $el.attr('aria-hidden', active ? 'false' : 'true');
    });

    backgrounds.forEach((el, i) => {
      const $el = $(el);
      const active = i === 0;
      const existing = ($el.attr('style') || '').replace(/transform:[^;]*;?/i, '').trim();
      $el.attr('style', `transform:${active ? 'translateX(0%)' : 'translateX(-100000px)'};${existing}`);
      $el.attr('aria-hidden', active ? 'false' : 'true');
    });

    // the theme reveals the layers through this class
    $s.addClass('n2-ss-loaded');
    $s.removeClass('n2notransition');

    // one bullet per slide, exactly like the slider engine generates them
    const $bar = $s.find('.n2-ss-control-bullet .nextend-bullet-bar').first();
    if ($bar.length && slides.length) {
      const firstBullet = $bar.find('.n2-bullet').first();
      const styleClass = ((firstBullet.attr('class') || '').match(/n2-style-[a-z0-9-]+/) || [''])[0];
      const label = firstBullet.attr('aria-label') || '';
      $bar.html(
        slides
          .map((_, i) => {
            const cls = ['n2-bullet', styleClass, i === 0 ? 'n2-active' : ''].filter(Boolean).join(' ');
            const cur = i === 0 ? ' aria-current="true"' : '';
            return `<div><div class="${cls}" tabindex="0" role="button" aria-label="${label}"${cur}></div></div>`;
          })
          .join('')
      );
    }
  });

  let pageHtml = $.html(pageEl);
  pageHtml = rewriteAssetStrings(pageHtml);

  // ---- convert markup to JSX ----
  let jsxBody = null;
  try {
    const out = converter.convert(pageHtml);
    const start = out.indexOf('return (') + 'return ('.length;
    const end = out.lastIndexOf('\n    );');
    if (start < 0 || end <= start) throw new Error('unexpected converter output');
    jsxBody = out
      .slice(start, end + 1)
      // CSS custom properties (e.g. --widget-offset) are emitted by htmltojsx as
      // "-widgetOffset", an illegal JSX key unless quoted.
      .replace(/(\{)-(\w+)/g, (_m, a, b) => `${a}'-${b}'`)
      .replace(/(?<![\w'"-])-([A-Za-z][\w-]*):/g, (_m, b) => `'-${b}':`)
      // HTML attributes that happen to be all-digit become {123456} which is
      // invalid JSX; wrap them in quotes instead.
      .replace(/(\s[\w-]+)=\{(\d+)\}/g, '$1="$2"')
      .replace(/(\s[\w-]+)=\{\}/g, '$1=""')
      // htmltojsx turns an empty `value=""` into a bare `defaultValue`, which
      // React renders as the literal string "true" — give them empty strings.
      .replace(/<[A-Za-z][^<>]*>/g, (tag) =>
        tag.replace(/\s(defaultValue|value)(?=[\s/>])/g, ' $1=""')
      );
  } catch (e) {
    SKIP_LOG.push({ route, rel, reason: String(e) });
    skipped++;
    continue;
  }

  // ---- emit the page ----
  const outDir = route === '/' ? APP_SRC + '/app' : path.join(APP_SRC, 'app', route.replace(/^\//, '').replace(/\/$/, ''));
  fs.mkdirSync(outDir, { recursive: true });

  const headLinkJsx = headLinks
    .map((h) => {
      if (!STYLE_COMPONENTS[h]) throw new Error(`Migrate the new stylesheet into TSX first: ${h}`);
      return `      <${STYLE_COMPONENTS[h]} />`;
    })
    .join('\n');
  const headStyleJsx = headStyles
    .map((css) => `      <style dangerouslySetInnerHTML={{ __html: ${JSON.stringify(css)} }} />`)
    .join('\n');
  const bodyStyleJsx = bodyStyles
    .map((css) => `      <style dangerouslySetInnerHTML={{ __html: ${JSON.stringify(css)} }} />`)
    .join('\n');

  const styleImports = [...new Set(headLinks.map(h => STYLE_COMPONENTS[h]))]
    .map(name => `import ${name} from '@/components/styles/${name}';`).join('\n');
  const fileContents = `// @ts-nocheck — auto-generated from the site's original page markup
${styleImports}
import type { Metadata } from 'next';
import BodyClass from '@/components/BodyClass';

export const metadata: Metadata = {
  title: ${JSON.stringify(title)},
  description: ${JSON.stringify(description)},
};

export default function Page() {
  return (
    <>
${headLinkJsx}
${headStyleJsx}
${bodyStyleJsx}
      <BodyClass className=${JSON.stringify(bodyClass)} />
${jsxBody.trim()}
    </>
  );
}
`;

  fs.writeFileSync(path.join(outDir, 'page.tsx'), fileContents, 'utf8');
  routeMap.push({ route, rel, links: headLinks.length, headStyles: headStyles.length, bodyStyles: bodyStyles.length });
  ok++;
}

console.log('pages generated:', ok, 'skipped:', skipped);
console.log('dropped <link> refs (missing/WP):', droppedLinks.size);
fs.writeFileSync(path.join(V8, 'routes.json'), JSON.stringify(routeMap, null, 2));
if (SKIP_LOG.length) {
  fs.writeFileSync(path.join(V8, 'routes.skip.json'), JSON.stringify(SKIP_LOG, null, 2));
  console.log('skip log written to routes.skip.json');
}
