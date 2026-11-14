/**
 * Compile the captured reference layouts to JSX with Tailwind utilities.
 * Reference CSS is build-time input only. No stylesheets or plugin JS ship.
 */
import fs from 'node:fs';
import { fixWhyVentureLayout } from './fix-why-venture-layout.mjs';
import path from 'node:path';
import crypto from 'node:crypto';
import postcss from 'postcss';
import safeParse from 'next/dist/compiled/postcss-safe-parser/safe-parse.js';
import * as cheerio from 'cheerio';
import { parse as parseSelector } from 'css-what';
import HtmlToJsx from 'htmltojsx';

const viewports = [390, 768, 1025, 1280, 1440, 1920];
const minWidths = [0, 768, 1025, 1280, 1440, 1920];
const styles = JSON.parse(fs.readFileSync('tools/reference-cache/styles.json', 'utf8'));
const old = JSON.parse(fs.readFileSync('artifacts/live-route-audit.json', 'utf8'));
const extra = fs.existsSync('artifacts/route-discovery.json') ? JSON.parse(fs.readFileSync('artifacts/route-discovery.json', 'utf8')).newPages || [] : [];
const records = [...new Map([...old, ...extra].map(r => [r.route, r])).values()];
const browserInventory = fs.existsSync('artifacts/browser-css-inventory.json') ? JSON.parse(fs.readFileSync('artifacts/browser-css-inventory.json', 'utf8')).filter(r => !r.error) : [];
const signature = record => record.styles.map(url => url.split('?')[0]).join('|');
const browserByRoute = new Map(browserInventory.map(r => [r.route, r]));
const browserBySignature = new Map(records.filter(r => browserByRoute.has(r.route)).map(r => [signature(r), browserByRoute.get(r.route)]));
const converter = new HtmlToJsx({ createClass: false });
const parsed = new Map();
const split = value => value.match(/(?:[^\s()]+|\([^()]*(?:\([^()]*\)[^()]*)*\))+/g) || [];
const hash = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 9);
const ignored = /^(?:animation(?:-|$)|-webkit-animation|behavior|zoom|scrollbar-|mso-|filter:)/;

export function rewriteUrl(url, base = 'https://www.venture7.com/') {
  if (/^(data:|#|mailto:|tel:|javascript:)/i.test(url)) return url;
  try {
    const parsed = new URL(url, base);
    if (/venture7\.com$/.test(parsed.hostname)) {
      return parsed.pathname.replace('/wp-content/uploads/', '/assets/uploads/').replace('/wp-content/themes/venture7/', '/assets/theme/').replace('/wp-content/plugins/', '/assets/vendor/').replace(/^\/SaaS-apps-using-laravel(?=\/|$)/, '/saas-apps-using-laravel') + parsed.search + parsed.hash;
    }
    return parsed.href;
  } catch { return url; }
}

function expand(prop, value) {
  if (prop.startsWith('--')) return [[prop, value]];
  if (prop === 'background') {
    // Select shorthand fields in the cascade before emitting utilities.
    const tokens = split(value);
    if (tokens.length === 1 && (/^(?:#[\da-f]+|rgba?\(|hsla?\(|var\(|transparent|white|black|red|blue|green|yellow|inherit|initial|unset)/i.test(value))) {
      return [['background-color', value], ['background-image', 'none']];
    }
    if (/^(?:url\(|(?:repeating-)?(?:linear|radial|conic)-gradient\()/i.test(value) && tokens.length === 1) return [['background-image', value], ['background-color', 'transparent']];
  }
  // Resolve LTR logical declarations before the cascade, so utility emission
  // cannot change their precedence relative to physical margin/padding rules.
  const logicalSides = { 'block-start': 'top', 'block-end': 'bottom', 'inline-start': 'left', 'inline-end': 'right' };
  for (const [logical, physical] of Object.entries(logicalSides)) prop = prop.replace(logical, physical);
  prop = prop.replace(/^inset-(top|right|bottom|left)$/, '$1');
  if (/^(margin|padding)-(block|inline)$/.test(prop)) {
    const [kind, axis] = prop.split('-');
    const [first, second = first] = split(value);
    return axis === 'block' ? [[`${kind}-top`, first], [`${kind}-bottom`, second]] : [[`${kind}-left`, first], [`${kind}-right`, second]];
  }
  prop = prop.replace(/^(min-|max-)?inline-size$/, '$1width').replace(/^(min-|max-)?block-size$/, '$1height');
  const quad = /^(margin|padding|inset|border-(?:width|color|style))$/.exec(prop);
  if (quad) {
    const tokens = split(value);
    if (tokens.length && tokens.length <= 4) {
      const [top, right = top, bottom = top, left = right] = tokens;
      return ['top', 'right', 'bottom', 'left'].map((side, i) => {
        const key = prop === 'inset' ? side : prop.startsWith('border-') ? `border-${side}-${prop.slice(7)}` : `${prop}-${side}`;
        return [key, [top, right, bottom, left][i]];
      });
    }
  }
  if (prop === 'gap') { const [a, b = a] = split(value); return [['row-gap', a], ['column-gap', b]]; }
  if (prop === 'border') return ['top', 'right', 'bottom', 'left'].map(side => [`border-${side}`, value]);
  return [[prop, value]];
}

function specificity(selector) {
  try {
    const score = list => list.reduce((n, t) => {
      if (t.type === 'tag') return n + 1;
      if (t.type === 'attribute') return n + (t.name === 'id' && t.action === 'equals' ? 1000000 : 1000);
      if (t.type === 'pseudo') {
        if (t.name === 'where') return n;
        if (Array.isArray(t.data)) return n + Math.max(...t.data.map(score));
        return n + 1000;
      }
      return n;
    }, 0);
    return Math.max(...parseSelector(selector).map(score));
  } catch { return 0; }
}

function mediaMatches(query, width) {
  if (!query) return true;
  return query.split(',').some(part => {
    if (/\bprint\b/.test(part) || /prefers-reduced-motion:\s*reduce/.test(part)) return false;
    for (const m of part.matchAll(/\((min|max)-width\s*:\s*([\d.]+)(px|em|rem)?\)/g)) {
      const value = Number(m[2]) * (m[3] === 'em' || m[3] === 'rem' ? 16 : 1);
      if (m[1] === 'min' ? width < value : width > value) return false;
    }
    return true;
  });
}

function parseCss(text, base) {
  const key = hash(text + base);
  if (parsed.has(key)) return parsed.get(key);
  // Repair a malformed token in the reference theme's variable declaration.
  text = text.replace(/;\.block__para-wrap--startup\s*/g, ';').replace(/^\s*\/\/[^\n]*$/gm, '');
  let ast;
  try { ast = postcss.parse(text); }
  catch { ast = safeParse(text); }
  const rules = [];
  ast.walkRules(rule => {
    let parent = rule.parent;
    const media = [];
    while (parent && parent.type !== 'root') {
      if (parent.type === 'atrule' && /keyframes|font-face|page/.test(parent.name)) return;
      if (parent.type === 'atrule' && parent.name === 'media') media.push(parent.params);
      parent = parent.parent;
    }
    const declarations = [];
    for (const d of rule.nodes || []) {
      if (d.type !== 'decl' || ignored.test(d.prop)) continue;
      let value = d.value.replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g, (_, quote, url) => `url('${rewriteUrl(url, base)}')`);
      for (const [prop, v] of expand(d.prop, value)) declarations.push({ prop, value: v, important: !!d.important });
    }
    if (!declarations.length) return;
    for (const original of rule.selectors || []) {
      if (/::?(?:-webkit|-moz)|:has\(|::part|::slotted/.test(original)) continue;
      let selector = original;
      let pseudo = '';
      selector = selector.replace(/::?(before|after|placeholder|selection|marker)\b/g, (_, name) => { pseudo = name + ':'; return ''; });
      const states = [];
      selector = selector.replace(/:(hover|focus-visible|focus-within|focus|active|disabled|checked|visited|enabled)\b/g, (match, name, offset) => {
        const prefix = selector.slice(0, offset).trim();
        states.push({ name, prefix });
        return '';
      });
      if (/:(?:not|is)\(\s*\)/.test(selector)) continue;
      rules.push({ selector: selector.trim(), original, pseudo, states, media, declarations, specificity: specificity(original) });
    }
  });
  parsed.set(key, rules);
  if (parsed.size > 8) parsed.delete(parsed.keys().next().value);
  return rules;
}

function encode(value) {
  // Tailwind arbitrary values use underscores for spaces and escaped literal underscores.
  return value.replace(/\r?\n/g, ' ').replace(/_/g, '\\_').replace(/\s+/g, '_').replace(/"/g, "'");
}

function utility(prop, value) {
  if (!value || /[;{}]/.test(value) || /^-moz-/.test(prop)) return null;
  if (prop === 'box-sizing') return null;
  value = value.replace(/var\(\s*(--[\w-]+)\s*\)/g, 'var($1)');
  if (prop === 'content') value = value.replace(/\\([0-9a-f]{1,6})\s?/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
  return `[${prop}:${encode(value)}]`;
}

function cascade($, cssRules) {
  const elements = $('*').toArray();
  const maps = new Map(elements.map(el => [el, new Map()]));
  const groupClasses = new Map();
  const classesInPage = new Set(elements.flatMap(el => (el.attribs?.class || '').split(/\s+/)));
  const idsInPage = new Set(elements.map(el => el.attribs?.id).filter(Boolean));
  let order = 0;
  const apply = (el, variants, declaration, weight, matches) => {
    const map = maps.get(el);
    if (!map) return;
    const key = variants + '\u0000' + declaration.prop;
    let entry = map.get(key);
    if (!entry) map.set(key, entry = { variants, prop: declaration.prop, values: Array(viewports.length).fill(null), weights: Array(viewports.length).fill(-1) });
    for (let i = 0; i < viewports.length; i++) {
      if (matches[i] && weight >= entry.weights[i]) {
        entry.weights[i] = weight;
        entry.values[i] = declaration.value;
      }
    }
  };
  for (const rule of cssRules) {
    order++;
    const matchWidth = viewports.map(width => rule.media.every(query => mediaMatches(query, width)));
    if (!matchWidth.some(Boolean)) continue;
    // Fast reject selectors whose final literal class/id is absent from the page.
    const final = rule.selector.split(/[\s>+~](?![^[]*\])/).pop() || '';
    const requiredId = final.match(/#([a-zA-Z][\w-]*)/);
    if (requiredId && !idsInPage.has(requiredId[1])) continue;
    const required = final.match(/\.([a-zA-Z][\w-]*)/);
    if (required && !classesInPage.has(required[1])) continue;
    const scoped = rule.selector.match(/\.(elementor-(?:element-)?[a-f\d]+)(?![\w-])/g) || [];
    if (scoped.some(token => !classesInPage.has(token.slice(1)))) continue;
    let matched;
    try { matched = $(rule.selector).toArray(); } catch { continue; }
    for (const el of matched) {
      let variants = rule.pseudo;
      for (const state of rule.states) {
        // Determine whether state belongs to this element or an ancestor.
        const beforeState = rule.original.slice(0, rule.original.indexOf(':' + state.name));
        const afterState = rule.original.slice(rule.original.indexOf(':' + state.name) + state.name.length + 1);
        if (/^[\s>+~]/.test(afterState)) {
          let ancestors;
          try { ancestors = $(el).parents(beforeState.trim()).toArray(); } catch { ancestors = []; }
          const ancestor = ancestors[0];
          if (!ancestor) continue;
          const name = 'v' + hash(beforeState);
          if (!groupClasses.has(ancestor)) groupClasses.set(ancestor, new Set());
          groupClasses.get(ancestor).add('group/' + name);
          variants += `group-${state.name}/${name}:`;
        } else variants += state.name + ':';
      }
      for (const d of rule.declarations) {
        const weight = (d.important ? 1e14 : 0) + rule.specificity * 1e6 + order;
        apply(el, variants, d, weight, matchWidth);
      }
    }
  }
  // Inline reference declarations become utilities too; no style attributes survive.
  for (const el of elements) {
    const inline = el.attribs?.style;
    if (inline) {
      try {
        const ast = postcss.parse(`a{${inline}}`);
        ast.walkDecls(d => {
          if (ignored.test(d.prop)) return;
          let value = d.value.replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g, (_, quote, url) => `url('${rewriteUrl(url)}')`);
          for (const [prop, v] of expand(d.prop, value)) apply(el, '', { prop, value: v }, (d.important ? 1e14 : 0) + 9e13, viewports.map(() => true));
        });
      } catch { /* Invalid original inline declarations have no browser effect. */ }
    }
    const added = groupClasses.get(el) || new Set();
    for (const { variants, prop, values } of maps.get(el).values()) {
      let previous = null;
      for (let i = 0; i < values.length; i++) {
        const value = values[i];
        if (value === previous) continue;
        const token = utility(prop, value ?? 'revert');
        if (token) added.add((i ? `min-[${minWidths[i]}px]:` : '') + variants + token);
        previous = value;
      }
    }
    $(el).removeAttr('style');
    $(el).attr('class', ((el.attribs?.class || '') + ' ' + [...added].join(' ')).trim());
  }
}

function jsx(html) {
  return converter.convert(html)
    .replace(/(\s[\w-]+)=\{(\d+)\}/g, '$1="$2"')
    .replace(/\sfetchpriority=/g, ' fetchPriority=')
    .replace(/\snovalidate(?:="[^"]*")?/gi, ' noValidate')
    .replace(/\snoValidate="[^"]*"/g, ' noValidate')
    .replace(/\sallowFullScreen="[^"]*"/g, ' allowFullScreen')
    .replace(/\s(autoPlay|controls|loop|muted|playsInline|multiple|required|disabled|readOnly)="(?:|true|autoplay|controls|loop|muted|required|disabled|readonly|multiple)"/g, ' $1')
    .replace(/<[A-Za-z][^<>]*>/g, tag => tag.replace(/\s(alt|title|id|className|defaultValue|value)(?=\s|\/?>)(?!\s*=)/g, ' $1=""'));
}

function prepare($, record) {
  $('script,noscript,link[rel="stylesheet"]').remove();
  $('.n2-ss-slider').addClass('n2-ss-loaded');
  $('.n2-ss-slider').each((_, slider) => {
    const root = $(slider);
    const slides = root.find('.n2-ss-slide');
    const bar = root.find('.nextend-bullet-bar').first();
    const template = bar.find('.n2-bullet').first().clone();
    if (bar.length && template.length && slides.length) {
      bar.empty();
      slides.each((i) => {
        const dot = template.clone().removeClass('n2-active').attr('aria-label', `Go to slide ${i + 1}`).attr('role', 'button').attr('tabindex', '0').attr('aria-current', String(i === 0));
        if (i === 0) dot.addClass('n2-active');
        bar.append($('<div></div>').append(dot));
      });
    }
  });
  $('.e-con').addClass('e-lazyloaded');
  // Plugins hide offscreen sections until their runtime loads. React renders them immediately.
  $('.elementor-invisible').removeClass('elementor-invisible');
  $('[hidden]').removeAttr('hidden');
  $('img').each((_, el) => {
    const image = $(el);
    if (image.attr('data-src')) image.attr('src', image.attr('data-src'));
    image.removeAttr('data-src').removeAttr('data-srcset').removeAttr('data-sizes');
    if (!image.attr('alt')) image.attr('alt', '');
  });
  $('*').each((_, el) => {
    for (const [name, value] of Object.entries(el.attribs || {})) {
      if (/^on/i.test(name) || /^["';]/.test(name)) { delete el.attribs[name]; continue; }
      if (['src', 'href', 'poster', 'action', 'data-src'].includes(name)) $(el).attr(name, rewriteUrl(value.trim(), record.url));
      if (name === 'srcset') $(el).attr(name, value.split(',').map(part => { const [url, ...rest] = part.trim().split(/\s+/); return [rewriteUrl(url, record.url), ...rest].join(' '); }).join(', '));
    }
  });
  $('form').attr('action', '#').attr('method', 'post').attr('data-validated-form', 'true');
  $('input[type=email]').attr('required', '').attr('autocomplete', 'email');
  $('input[name=PHONE],input[type=tel]').attr('type', 'tel').attr('autocomplete', 'tel');
  $('a[target="_blank"]').attr('rel', 'noopener noreferrer');
}

const shardFlag = process.argv.find(arg => arg.startsWith('--shard='));
const [shard, shards] = shardFlag ? shardFlag.slice(8).split('/').map(Number) : [0, 1];
const routesFlag = process.argv.find(arg => arg.startsWith('--routes='));
const selected = routesFlag ? records.filter(r => routesFlag.slice(9).split(',').includes(r.route)) : process.argv.includes('--home') ? records.filter(r => r.route === '/') : records.filter((_, i) => i % shards === shard);
const report = [];
let sharedWritten = false;
for (const record of selected) {
  const started = Date.now();
  const targetDir = record.route === '/' ? 'src/app' : path.join('src/app', record.route.replace(/^\//, '').replace(/\/$/, ''));
  const targetFile = path.join(targetDir, 'page.tsx');
  if (process.argv.includes('--resume') && fs.existsSync(targetFile) && fs.readFileSync(targetFile, 'utf8').startsWith("// @ts-nocheck — generated from this route's complete reference markup.")) {
    report.push({ route: record.route, resumed: true });
    continue;
  }
  if (!record.file || !fs.existsSync(record.file)) { report.push({ route: record.route, error: 'Missing reference HTML' }); continue; }
  const source = fs.readFileSync(record.file, 'utf8');
  const $ = cheerio.load(source);
  // Shared chrome is already converted on the home route. Avoid recalculating
  // its thousand repeated nodes on every article and archive page.
  let sharedHeader = false, sharedFooter = false;
  if (record.route !== '/') {
    const h = $('header[data-elementor-type="header"][data-elementor-id="14182"]').first();
    const f = $('footer[data-elementor-type="footer"][data-elementor-id="13162"]').first();
    if (h.length) { h.replaceWith('<venture-header></venture-header>'); sharedHeader = true; }
    if (f.length) { const outer = f.parent('footer'); (outer.length ? outer : f).replaceWith('<venture-footer></venture-footer>'); sharedFooter = true; }
  }
  const rules = [];
  const browserReference = browserByRoute.get(record.route) || browserBySignature.get(signature(record));
  for (const url of browserReference?.styles || record.styles || $('link[rel=stylesheet]').map((_, e) => $(e).attr('href')).get()) {
    if (styles[url]) rules.push(...parseCss(styles[url].css, url));
  }
  if (browserByRoute.has(record.route)) browserReference.inline.forEach(css => rules.push(...parseCss(css, record.url)));
  else $('style').each((_, el) => { rules.push(...parseCss($(el).text(), record.url)); });
  prepare($, record);
  cascade($, rules);
  $('style').remove();
  const page = $('#page').first().length ? $('#page').first() : $('main').first().length ? $('main').first() : $('.site-content').first();
  if (!page.length) { report.push({ route: record.route, error: 'Missing page container' }); continue; }
  page.attr('data-page-content', '').addClass('min-h-screen **:box-border');
  $('.n2-ss-slider').addClass('n2-ss-loaded');
  $('.n2-ss-slide, .n2-ss-slide-background').each((i, el) => {
    const first = $(el).parent().children('.' + ($(el).hasClass('n2-ss-slide') ? 'n2-ss-slide' : 'n2-ss-slide-background')).index(el) === 0;
    $(el).attr('data-active', String(first)).attr('aria-hidden', String(!first));
    $(el).addClass('data-[active=false]:opacity-0! data-[active=false]:pointer-events-none! data-[active=true]:opacity-100! data-[active=true]:visible! data-[active=true]:translate-x-0! transition-opacity duration-700');
  });
  $('.n2-ss-layers-container').addClass('opacity-100! visible!');
  $('.n2-bullet').each((i, el) => $(el).attr('aria-label', `Go to slide ${i + 1}`).attr('role', 'button').attr('tabindex', '0'));
  if (record.route === '/') {
    $('.block--whyventure7').attr('id', 'why-venture7').addClass('scroll-mt-20');
    $('.block--whyventure7 .block__graphic-wrap').addClass('isolate');
    $('.block--whyventure7 .rounded-circle--1').append('<venture-rings></venture-rings>');
    $('.block--whyventure7 .rounded-circle--0 .dashed').addClass('animate-spin [animation-duration:10s]! motion-reduce:animate-none');
  }
  $('header[data-elementor-type="header"]').addClass('sticky! top-0! z-[1000]! bg-white');
  $('header .elementskit-megamenu-panel').addClass('fixed! left-0! right-0! top-20! w-full! max-w-none!');
  $('header a').each((_, el) => {
    if (/^talk to sales$/i.test($(el).text().trim())) $(el).attr('href', 'https://meet.venture7.com/');
  });
  $('header .elementor-menu-toggle').attr('role', 'button').attr('tabindex', '0').attr('aria-label', 'Open navigation menu');

  // Shared identity, menus and footer remain normal reusable TSX components.
  const header = page.find('header[data-elementor-type="header"][data-elementor-id="14182"]').first();
  const footer = page.find('footer[data-elementor-type="footer"][data-elementor-id="13162"]').first();
  if (!sharedWritten && record.route === '/') {
    for (const [name, element] of [['SiteHeader', header], ['SiteFooter', footer]]) {
      if (!element.length) continue;
      const html = $.html(element);
      fs.mkdirSync('src/components/layout', { recursive: true });
      fs.writeFileSync(`src/components/layout/${name}.tsx`, `// @ts-nocheck — generated reference layout; all visual rules are Tailwind utilities.\nexport default function ${name}() {\n  return (${jsx(html)});\n}\n`);
    }
    sharedWritten = true;
  }
  const useHeader = sharedHeader || !!header.length, useFooter = sharedFooter || !!footer.length;
  if (header.length) header.replaceWith('<venture-header></venture-header>');
  if (footer.length) {
    const parentFooter = footer.parent('footer');
    if (parentFooter.length) parentFooter.replaceWith('<venture-footer></venture-footer>');
    else footer.replaceWith('<venture-footer></venture-footer>');
  }
  const wrapperClasses = element => (element.attr('class') || '').split(/\s+/).filter(token => !/^\[(?:height|width|overflow(?:-x|-y)?):/.test(token)).join(' ');
  const htmlClass = wrapperClasses($('html'));
  const bodyClass = wrapperClasses($('body'));
  let content = jsx(`<div class="${htmlClass}"><div class="${bodyClass}">${$.html(page)}</div></div>`)
    .replace(/<venture-header\b[^>]*\/?>\s*(?:<\/venture-header>)?/g, '<SiteHeader />')
    .replace(/<venture-footer\b[^>]*\/?>\s*(?:<\/venture-footer>)?/g, '<SiteFooter />')
    .replace(/<venture-rings\b[^>]*\/?>\s*(?:<\/venture-rings>)?/g, '<WhyVentureRings />');
  if (record.route === '/') content = fixWhyVentureLayout(content);
  const dir = record.route === '/' ? 'src/app' : path.join('src/app', record.route.replace(/^\//, '').replace(/\/$/, ''));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'page.tsx'), `// @ts-nocheck — generated from this route's complete reference markup.\nimport type { Metadata } from 'next';\n${useHeader ? "import SiteHeader from '@/components/layout/SiteHeader';" : ''}\n${useFooter ? "import SiteFooter from '@/components/layout/SiteFooter';" : ''}\n${record.route === '/' ? "import WhyVentureRings from '@/components/WhyVentureRings';" : ''}\n\nexport const metadata: Metadata = { title: ${JSON.stringify($('title').text().trim())}, description: ${JSON.stringify($('meta[name=description]').attr('content') || '')} };\n\nexport default function Page() {\n  return (${content});\n}\n`);
  report.push({ route: record.route, elements: page.find('*').length, milliseconds: Date.now() - started, stylesheetRules: rules.length });
  console.log(`Converted ${record.route} (${Date.now() - started}ms)`);
}
const reportFile = shardFlag ? `artifacts/tailwind-conversion-${shard}.json` : 'artifacts/tailwind-conversion.json';
const previousReports = routesFlag && fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, 'utf8')) : [];
fs.writeFileSync(reportFile, JSON.stringify([...new Map([...previousReports, ...report].map(r => [r.route, r])).values()], null, 2));
