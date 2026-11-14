/** Discover public routes and mirror missing media from their known reference URLs. */
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';

const origin = 'https://www.venture7.com';
const directory = 'tools/reference-cache';
const previous = JSON.parse(fs.readFileSync('artifacts/live-route-audit.json', 'utf8'));
const existing = new Set(previous.map(r => r.route));
const known = new Set(existing);
const queue = [];
const sources = new Map();
const pages = [];
const aliases = [];
const unavailable = [];
const assets = new Map();

function fileFor(route) {
  return path.join(directory, route === '/' ? 'home.html' : route.slice(1).replace(/\/$/, '').replaceAll('/', '__') + '.html');
}
function normalRoute(value, base = origin) {
  try {
    const u = new URL(value, base);
    if (!/^(www\.)?venture7\.com$/.test(u.hostname) || u.search || /\.(pdf|jpg|jpeg|png|webp|svg|mp4|xml|zip|docx?|xlsx?|ogg|webm)$/i.test(u.pathname) || /\/(wp-|assets|feed|elementskit-content)/.test(u.pathname) || u.pathname.startsWith('/f9c72dacebf53cb8')) return null;
    return u.pathname.endsWith('/') ? u.pathname : u.pathname + '/';
  } catch { return null; }
}
function offer(value, source, base) {
  const route = normalRoute(value, base);
  if (!route) return;
  if (!sources.has(route)) sources.set(route, []);
  if (sources.get(route).length < 4) sources.get(route).push(source);
  if (!known.has(route)) { known.add(route); queue.push(route); }
}
function localAsset(value, base) {
  try {
    value = value.trim();
    const u = new URL(value, base);
    if (!/^(?:[\w-]+\.)?venture7\.com$/.test(u.hostname)) return;
    let local = u.pathname
      .replace(/^\/wp-content\/uploads\//, '/assets/uploads/')
      .replace(/^\/wp-content\/themes\/venture7\//, '/assets/theme/')
      .replace(/^\/wp-content\/plugins\//, '/assets/vendor/');
    if (!local.startsWith('/assets/') || !/\.(?:avif|png|jpe?g|webp|gif|svg|ico|mp4|webm|ogg|mp3|woff2?|ttf|eot|pdf)$/i.test(local)) return;
    try { local = decodeURIComponent(local); } catch {}
    if (!fs.existsSync('public' + local)) assets.set(local, u.href);
  } catch {}
}
function inspect(html, route, file) {
  const $ = cheerio.load(html);
  $('a[href]').each((_, element) => offer($(element).attr('href'), route, origin + route));
  $('img, source, video, audio, a').each((_, element) => {
    for (const attribute of ['src', 'data-src', 'poster', 'href']) {
      const value = $(element).attr(attribute);
      if (value) localAsset(value, origin + route);
    }
    for (const attribute of ['srcset', 'data-srcset']) {
      for (const value of ($(element).attr(attribute) || '').split(',')) localAsset(value.trim().split(/\s+/)[0], origin + route);
    }
  });
  for (const match of html.matchAll(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g)) localAsset(match[2], origin + route);
  return { route, rel: route === '/' ? 'home.html' : route.slice(1).replace(/\/$/, '') + '.html', status: 200, url: origin + route, file, title: $('title').text(), styles: $('link[rel="stylesheet"]').map((_, element) => new URL($(element).attr('href'), origin + route).href).get(), h1: $('main h1, #content h1').map((_, e) => $(e).text().trim()).get(), hasPage: !!$('#page, #content').length };
}

for (const record of previous) inspect(fs.readFileSync(record.file, 'utf8'), record.route, record.file);
let sitemapUrls = [];
try {
  const r = await fetch(origin + '/sitemap.xml', { signal: AbortSignal.timeout(30000) });
  const xml = await r.text();
  fs.writeFileSync('artifacts/reference-sitemap.xml', xml);
  const $ = cheerio.load(xml, { xmlMode: true });
  sitemapUrls = $('loc').map((_, e) => $(e).text()).get();
  for (const url of sitemapUrls) offer(url, 'sitemap.xml', origin);
} catch (error) { unavailable.push({ route: '/sitemap.xml', error: String(error) }); }
console.log(`Sitemap entries: ${sitemapUrls.length}; additional route candidates: ${queue.length}`);

let checked = 0;
// Dynamic queues allow newly discovered archive pagination to be explored too.
while (queue.length) {
  const batch = queue.splice(0, 6);
  await Promise.all(batch.map(async route => {
    try {
      const file = fileFor(route);
      const r = await fetch(origin + route, { signal: AbortSignal.timeout(40000) });
      const html = await r.text();
      const finalRoute = normalRoute(r.url);
      if (!r.ok) { unavailable.push({ route, status: r.status, finalUrl: r.url }); return; }
      if (finalRoute && finalRoute !== route) {
        aliases.push({ route, destination: finalRoute });
        if (known.has(finalRoute)) return;
        known.add(finalRoute);
        fs.writeFileSync(fileFor(finalRoute), html);
        pages.push(inspect(html, finalRoute, fileFor(finalRoute)));
        return;
      }
      fs.writeFileSync(file, html);
      const record = inspect(html, route, file);
      if (record.hasPage) pages.push(record);
      else unavailable.push({ route, status: r.status, reason: 'No public page container' });
    } catch (error) { unavailable.push({ route, error: String(error) }); }
    finally { checked++; }
  }));
  console.log(`Checked ${checked}; new public pages ${pages.length}; queue ${queue.length}`);
}

// Scan already mirrored reference CSS for missing fonts and background media.
for (const file of (fs.existsSync('src/css') ? fs.readdirSync('src/css', { recursive: true }) : []).filter(f => f.endsWith('.css'))) {
  const text = fs.readFileSync(path.join('src/css', file), 'utf8');
  for (const match of text.matchAll(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g)) {
    const value = match[2];
    if (value.startsWith('/assets/')) {
      const remote = value.replace('/assets/uploads/', '/wp-content/uploads/').replace('/assets/theme/', '/wp-content/themes/venture7/').replace('/assets/vendor/', '/wp-content/plugins/');
      localAsset(remote, origin);
    } else if (value.startsWith('http')) localAsset(value, origin);
  }
}
const candidates = [...assets].map(([local, url]) => ({ local, url }));
const downloadQueue = [...candidates];
const downloaded = [];
const failedAssets = [];
await Promise.all(Array.from({ length: 8 }, async () => {
  while (downloadQueue.length) {
    const item = downloadQueue.shift();
    try {
      const r = await fetch(item.url, { signal: AbortSignal.timeout(45000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = Buffer.from(await r.arrayBuffer());
      const contentType = r.headers.get('content-type') || '';
      if (contentType.includes('text/html') || data.subarray(0, 80).toString().toLowerCase().includes('<!doctype html')) throw new Error('Reference returned HTML instead of the asset');
      const destination = path.resolve('public' + item.local);
      const assetRoot = path.resolve('public/assets') + path.sep;
      if (!destination.startsWith(assetRoot)) throw new Error('Invalid destination');
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, data);
      downloaded.push(item);
    } catch (error) { failedAssets.push({ ...item, error: String(error) }); }
  }
}));
const uniquePages = [...new Map(pages.map(page => [page.route, page])).values()].sort((a, b) => a.route.localeCompare(b.route));
const report = { existingRoutes: existing.size, sitemapEntries: sitemapUrls.length, newPages: uniquePages, aliases, unavailableRoutes: unavailable, candidates: candidates.length, downloadedAssets: downloaded, unavailableAssets: failedAssets, discoveredRouteSources: Object.fromEntries(sources) };
fs.writeFileSync('artifacts/route-discovery.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ existingRoutes: existing.size, sitemapEntries: sitemapUrls.length, newPages: uniquePages.length, aliases, unavailableRoutes: unavailable, downloadedAssets: downloaded.length, unavailableAssets: failedAssets }, null, 2));
