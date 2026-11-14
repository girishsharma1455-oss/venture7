/**
 * UI parity probe — run on both the live site and the port, then diff.
 * Usage: node tools/ui-probe.mjs <tabId> <label>
 */
const tabId = process.argv[2];
const label = process.argv[3] || 'page';
const targetWidth = Number(process.argv[4] || 0);

const script = `(() => {
  // Normalise the CSS viewport so both sites can be compared at the same width.
  ${targetWidth ? `if (window.innerWidth !== ${targetWidth}) { document.documentElement.style.zoom = String(window.innerWidth / ${targetWidth}); }` : ''}
  const q = (s) => document.querySelector(s);
  const qa = (s) => Array.from(document.querySelectorAll(s));
  const cs = (el, p) => el ? getComputedStyle(el)[p] : null;
  const rect = (el) => el ? (({x,y,width,height}) => ({x: Math.round(x), y: Math.round(y), w: Math.round(width), h: Math.round(height)}))(el.getBoundingClientRect()) : null;
  const img = (el) => el ? { src: (el.currentSrc || el.src || '').split('/').pop(), nw: el.naturalWidth, broken: el.complete && el.naturalWidth === 0 } : null;

  const out = { label: '${label}' };
  out.url = location.href;
  out.width = window.innerWidth;
  out.height = window.innerHeight;
  out.bodyClass = document.body.className;

  // ---------- header ----------
  const header = q('header');
  out.header = {
    rect: rect(header),
    logo: img(q('header img')),
    logoLink: q('header a') ? q('header a').getAttribute('href') : null,
    navItems: qa('#ekit-megamenu-home > ul > li > a').map(a => ({
      text: a.textContent.trim().replace(/\\s+/g, ' '),
      visible: a.getBoundingClientRect().width > 0,
      font: cs(a, 'fontFamily'),
      size: cs(a, 'fontSize'),
      color: cs(a, 'color'),
      weight: cs(a, 'fontWeight'),
    })),
    togglerVisible: q('.elementskit-menu-toggler') ? cs(q('.elementskit-menu-toggler'), 'display') : null,
    contactBtn: (() => {
      const a = qa('header a').find(x => /contact us/i.test(x.textContent.trim()));
      if (!a) return null;
      const w = a.querySelector('.elementor-button-content-wrapper') || a;
      return { bg: cs(w, 'backgroundColor'), color: cs(w, 'color'), radius: cs(w, 'borderRadius'), padding: cs(w, 'padding'), size: cs(w, 'fontSize'), weight: cs(w, 'fontWeight') };
    })(),
    talkToSales: (() => {
      const a = qa('header a').find(x => /talk to sales/i.test(x.textContent.trim()));
      return a ? { color: cs(a, 'color'), size: cs(a, 'fontSize') } : null;
    })(),
  };

  // ---------- hero slider ----------
  const slider = q('#n2-ss-3');
  out.slider = {
    exists: !!slider,
    classes: slider ? slider.className : null,
    slides: qa('#n2-ss-3 .n2-ss-slide').length,
    backgrounds: qa('#n2-ss-3 .n2-ss-slide-background').length,
    bullets: qa('#n2-ss-3 .n2-bullet').length,
    bulletVisible: (() => { const b = q('#n2-ss-3 .n2-ss-control-bullet'); return b ? { visibility: cs(b, 'visibility'), opacity: cs(b, 'opacity') } : null; })(),
    bulletActive: qa('#n2-ss-3 .n2-bullet').findIndex(b => /active|selected/i.test(b.className)),
    layersOpacity: (() => { const l = q('#n2-ss-3 .n2-ss-layers-container'); return l ? { opacity: cs(l, 'opacity'), visibility: cs(l, 'visibility') } : null; })(),
    slideImages: qa('#n2-ss-3 .n2-ss-slide-background img').map(i => img(i)),
    headline: (() => { const h = q('#n2-ss-3item1') || q('#n2-ss-3 .n2-ss-item-content'); return h ? { text: h.textContent.trim().slice(0, 40), color: cs(h, 'color'), size: cs(h, 'fontSize'), font: cs(h, 'fontFamily'), weight: cs(h, 'fontWeight') } : null; })(),
    readMore: (() => { const a = q('#n2-ss-3 .n2-ss-button-container a'); if (!a) return null; const inner = a.querySelector('div div') || a; return { bg: cs(inner, 'backgroundColor'), color: cs(inner, 'color'), padding: cs(inner, 'padding'), text: a.textContent.trim() }; })(),
  };

  // ---------- generic content ----------
  out.sections = qa('main h2, main .elementor-heading-title').slice(0, 10).map(h => ({
    text: h.textContent.trim().replace(/\\s+/g, ' ').slice(0, 46),
    y: Math.round(h.getBoundingClientRect().top + window.scrollY),
    color: cs(h, 'color'),
    size: cs(h, 'fontSize'),
    font: cs(h, 'fontFamily'),
    weight: cs(h, 'fontWeight'),
  }));
  out.images = {
    total: qa('img').length,
    broken: qa('img').filter(i => i.complete && i.naturalWidth === 0).map(i => (i.currentSrc || i.src || '').split('/').pop()).slice(0, 20),
  };
  out.icons = {
    // theme icon font usage
    iconFontEls: qa('[class*="icon-"]').length,
    sampleIcon: (() => {
      const el = q('.icon-double-angle-pointing-to-right') || q('.icon-down-arrow1') || q('.icon-menu-7');
      if (!el) return null;
      const before = getComputedStyle(el, '::before');
      return { cls: el.className, content: before.content, font: before.fontFamily, color: cs(el, 'color'), w: Math.round(el.getBoundingClientRect().width) };
    })(),
  };
  out.footer = {
    rect: rect(q('footer')),
    images: qa('footer img').map(img).slice(0, 12),
    socials: qa('footer .elementor-social-icon').length,
    quickLinks: qa('footer .elementor-icon-list-items li a').length,
    backToTop: q('.ekit-btt__button') ? cs(q('.ekit-btt__button'), 'display') : null,
    text: q('footer') ? q('footer').textContent.replace(/\\s+/g, ' ').trim().slice(0, 120) : null,
  };
  out.fonts = {
    poppins: document.fonts ? document.fonts.check('16px Poppins') : null,
    montserrat: document.fonts ? document.fonts.check('16px Montserrat') : null,
    roboto: document.fonts ? document.fonts.check('16px Roboto') : null,
    loaded: document.fonts ? Array.from(document.fonts).filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight).slice(0, 12) : [],
  };
  out.docHeight = document.documentElement.scrollHeight;
  return out;
})()`;

const res = await tools.browser.evaluate({ tabID: tabId, script });
console.log(JSON.stringify(res.value, null, 1));
