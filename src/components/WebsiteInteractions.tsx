'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

type Gallery = { images: { src: string; alt: string }[]; index: number };
type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const showClasses = 'data-[runtime-open=true]:block! data-[runtime-open=false]:hidden!';
const slideClasses = 'transition-opacity duration-700 motion-reduce:transition-none data-[active=false]:opacity-0! data-[active=false]:invisible! data-[active=false]:pointer-events-none! data-[active=true]:opacity-100! data-[active=true]:visible! data-[active=true]:transform-none! data-[active=true]:translate-x-0!';
const addClasses = (element: Element, classes: string) => element.classList.add(...classes.split(' '));
const settingsFor = (element: Element) => {
  try { return JSON.parse((element.getAttribute('data-settings') || '{}').replaceAll('&quot;', '"').replaceAll('&amp;', '&')); }
  catch { return {}; }
};

/** Local React behavior for reference markup. All presentation uses Tailwind classes. */
export default function WebsiteInteractions() {
  const pathname = usePathname();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const galleryClose = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const cleanups: (() => void)[] = [];
    const on = <K extends keyof HTMLElementEventMap>(element: HTMLElement, event: K, listener: (event: HTMLElementEventMap[K]) => void) => {
      element.addEventListener(event, listener);
      cleanups.push(() => element.removeEventListener(event, listener));
    };
    const openPanel = (panel: HTMLElement, open: boolean) => {
      addClasses(panel, showClasses);
      if (panel.matches('nav.elementor-nav-menu--dropdown, .elementskit-menu-container')) {
        addClasses(panel, 'data-[runtime-open=true]:fixed! data-[runtime-open=true]:left-0! data-[runtime-open=true]:right-0! data-[runtime-open=true]:top-20! data-[runtime-open=true]:w-full! data-[runtime-open=true]:max-h-[80dvh]! data-[runtime-open=true]:overflow-y-auto! data-[runtime-open=true]:opacity-100! data-[runtime-open=true]:visible! data-[runtime-open=true]:transform-none!');
      }
      panel.dataset.runtimeOpen = String(open);
      panel.setAttribute('aria-hidden', String(!open));
      panel.querySelectorAll<HTMLAnchorElement>('a').forEach(link => { link.tabIndex = open ? 0 : -1; });
    };
    document.querySelectorAll<HTMLFormElement>('form[data-validated-form]').forEach(form => { form.noValidate = true; });
    const closeMenus = () => {
      document.querySelectorAll<HTMLElement>('header [data-runtime-open="true"]').forEach(panel => openPanel(panel, false));
      document.querySelectorAll<HTMLElement>('header [aria-expanded="true"]').forEach(toggle => toggle.setAttribute('aria-expanded', 'false'));
    };

    document.querySelectorAll<HTMLElement>('header .elementskit-dropdown, header .elementskit-megamenu-panel').forEach(panel => {
      const item = panel.parentElement;
      if (!item) return;
      const trigger = item.querySelector<HTMLElement>(':scope > a');
      addClasses(panel, showClasses);
      const setOpen = (open: boolean) => { openPanel(panel, open); trigger?.setAttribute('aria-expanded', String(open)); };
      on(item, 'mouseenter', () => setOpen(true));
      on(item, 'mouseleave', () => setOpen(false));
      on(item, 'focusin', () => setOpen(true));
      on(item, 'focusout', event => { if (!item.contains(event.relatedTarget as Node | null)) setOpen(false); });
    });

    document.querySelectorAll<HTMLElement>('header .mobile-menucustom .menu-item-has-children > .sub-menu').forEach(panel => {
      openPanel(panel, false);
      panel.parentElement?.querySelector(':scope > a')?.setAttribute('aria-expanded', 'false');
    });

    document.querySelectorAll<HTMLElement>('.n2-ss-slider').forEach(slider => {
      const slides = [...slider.querySelectorAll<HTMLElement>('.n2-ss-slide')];
      const backgrounds = [...slider.querySelectorAll<HTMLElement>('.n2-ss-slide-backgrounds > .n2-ss-slide-background')];
      const bullets = [...slider.querySelectorAll<HTMLElement>('.n2-bullet')];
      if (!slides.length) return;
      let current = 0;
      let timer: ReturnType<typeof setInterval> | undefined;
      const render = (index: number) => {
        current = (index + slides.length) % slides.length;
        [...slides, ...backgrounds].forEach(element => {
          addClasses(element, slideClasses);
          const active = (slides.includes(element) ? slides : backgrounds).indexOf(element) === current;
          element.dataset.active = String(active);
          element.setAttribute('aria-hidden', String(!active));
        });
        bullets.forEach((bullet, i) => {
          bullet.setAttribute('aria-label', `Go to slide ${i + 1}`);
          bullet.setAttribute('aria-current', String(i === current));
          bullet.classList.toggle('n2-active', i === current);
          addClasses(bullet, 'cursor-pointer aria-[current=true]:bg-[#035c56]!');
        });
      };
      const stop = () => { if (timer) clearInterval(timer); };
      const start = () => { stop(); if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => render(current + 1), 6000); };
      bullets.forEach((bullet, i) => {
        on(bullet, 'click', () => { render(i); start(); });
        on(bullet, 'keydown', event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); render(i); } });
      });
      on(slider, 'mouseenter', stop);
      on(slider, 'mouseleave', start);
      on(slider, 'focusin', stop);
      on(slider, 'focusout', start);
      slider.classList.add('n2-ss-loaded');
      render(0);
      start();
      cleanups.push(stop);
    });

    const bases = [
      'basis-full!',
      'basis-full! md:basis-[calc((100%_-_30px)/2)]!',
      'basis-full! md:basis-[calc((100%_-_30px)/2)]! lg:basis-[calc((100%_-_60px)/3)]!',
      'basis-full! md:basis-[calc((100%_-_30px)/2)]! lg:basis-[calc((100%_-_90px)/4)]!',
    ];
    document.querySelectorAll<HTMLElement>('.elementor-widget-loop-carousel, .elementor-widget-image-carousel, .elementor-widget-testimonial-carousel').forEach(widget => {
      const container = widget.querySelector<HTMLElement>('.swiper, .swiper-container');
      const wrapper = widget.querySelector<HTMLElement>('.swiper-wrapper');
      if (!container || !wrapper) return;
      const slides = [...wrapper.children].filter((node): node is HTMLElement => node instanceof HTMLElement && !['STYLE', 'SCRIPT'].includes(node.tagName));
      if (slides.length < 2) return;
      const settings = settingsFor(widget);
      const count = Math.max(1, Math.min(4, Number(settings.slides_to_show) || 3));
      addClasses(container, 'overflow-x-hidden! scroll-smooth [scrollbar-width:none]');
      addClasses(wrapper, 'flex! gap-[30px]! transform-none! w-auto!');
      slides.forEach(slide => addClasses(slide, `shrink-0! grow-0! min-w-0! ${bases[count - 1]}`));
      let current = 0;
      const step = (direction: number) => {
        const visible = innerWidth >= 1024 ? count : innerWidth >= 768 ? Math.min(2, count) : 1;
        const max = Math.max(0, slides.length - visible);
        current = current + direction > max ? 0 : current + direction < 0 ? max : current + direction;
        container.scrollTo({ left: current * (slides[0].getBoundingClientRect().width + 30), behavior: 'smooth' });
      };
      widget.querySelectorAll<HTMLElement>('.elementor-swiper-button-prev').forEach(button => on(button, 'click', () => step(-1)));
      widget.querySelectorAll<HTMLElement>('.elementor-swiper-button-next').forEach(button => on(button, 'click', () => step(1)));
      let timer: ReturnType<typeof setInterval> | undefined;
      const stop = () => { if (timer) clearInterval(timer); };
      const start = () => { stop(); if (settings.autoplay !== 'no') timer = setInterval(() => step(1), Number(settings.autoplay_speed) || 5000); };
      on(widget, 'mouseenter', stop);
      on(widget, 'mouseleave', start);
      start();
      cleanups.push(stop);
    });

    document.querySelectorAll<HTMLElement>('.insights-blogs, .casestudy-slider').forEach(track => {
      const slides = [...track.children].filter((element): element is HTMLElement => element instanceof HTMLElement && !['STYLE', 'SCRIPT'].includes(element.tagName));
      const parent = track.parentElement;
      if (!parent || slides.length < 2) return;
      addClasses(parent, 'relative');
      addClasses(track, 'flex! gap-[30px]! overflow-x-hidden! scroll-smooth! w-full!');
      slides.forEach(slide => addClasses(slide, `shrink-0! grow-0! min-w-0! ${bases[2]}`));
      let index = 0;
      const advance = (direction: number) => {
        const visible = innerWidth >= 1024 ? 3 : innerWidth >= 768 ? 2 : 1;
        const end = Math.max(0, slides.length - visible);
        index = index + direction > end ? 0 : index + direction < 0 ? end : index + direction;
        track.scrollTo({ left: index * (slides[0].getBoundingClientRect().width + 30), behavior: 'smooth' });
      };
      const buttons = [-1, 1].map(direction => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = direction < 0 ? '‹' : '›';
        button.setAttribute('aria-label', direction < 0 ? 'Previous case study' : 'Next case study');
        button.className = `absolute top-1/2 z-10 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-3xl text-[#035c56] shadow-md hover:bg-[#f5ce19] ${direction < 0 ? 'left-0 lg:-left-10' : 'right-0 lg:-right-10'}`;
        on(button, 'click', () => advance(direction));
        parent.append(button);
        return button;
      });
      let timer: ReturnType<typeof setInterval> | undefined;
      const stop = () => { if (timer) clearInterval(timer); };
      const start = () => { stop(); timer = setInterval(() => advance(1), 5000); };
      on(parent, 'mouseenter', stop);
      on(parent, 'mouseleave', start);
      start();
      cleanups.push(() => { stop(); buttons.forEach(button => button.remove()); });
    });

    document.querySelectorAll<HTMLDetailsElement>('.e-n-accordion details').forEach(detail => {
      on(detail, 'toggle', () => {
        detail.querySelector('summary')?.setAttribute('aria-expanded', String(detail.open));
        if (detail.open && settingsFor(detail.closest('[data-settings]') || detail).max_items_expended !== 'multiple') {
          detail.parentElement?.querySelectorAll<HTMLDetailsElement>(':scope > details').forEach(sibling => { if (sibling !== detail) sibling.open = false; });
        }
      });
    });

    document.querySelectorAll<HTMLElement>('.service-container').forEach(container => {
      const panels = [...container.querySelectorAll<HTMLElement>(':scope > .service-slider')];
      const section = container.closest('.row') || container.parentElement;
      const tabs = [...(section?.querySelectorAll<HTMLElement>('.white-box .img-scale__wrap') || [])];
      if (!panels.length || !tabs.length) return;
      let current = 0;
      const select = (index: number) => {
        current = (index + panels.length) % panels.length;
        panels.forEach((panel, i) => openPanel(panel, i === current));
        tabs.forEach((tab, i) => {
          tab.setAttribute('aria-pressed', String(i === current));
          tab.closest('li')?.classList.toggle('active-service', i === current);
          addClasses(tab, 'cursor-pointer rounded-lg transition-colors aria-pressed:bg-[#035c56] aria-pressed:text-white');
        });
      };
      tabs.forEach((tab, i) => {
        tab.setAttribute('role', 'button'); tab.tabIndex = 0;
        on(tab, 'click', () => select(i));
      });
      section?.querySelectorAll<HTMLElement>('.prev-nav, .next-nav').forEach(arrow => {
        arrow.setAttribute('role', 'button'); arrow.tabIndex = 0;
        arrow.setAttribute('aria-label', arrow.classList.contains('prev-nav') ? 'Previous service' : 'Next service');
        on(arrow, 'click', () => select(current + (arrow.classList.contains('prev-nav') ? -1 : 1)));
      });
      select(0);
    });

    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const element = entry.target as HTMLElement;
      element.classList.remove('elementor-invisible');
      element.dataset.revealed = 'true';
      observer.unobserve(element);
    }), { threshold: 0.08 });
    document.querySelectorAll<HTMLElement>('.wow, .elementor-invisible').forEach(element => {
      addClasses(element, 'transition-all duration-700 motion-reduce:transition-none data-[revealed=true]:opacity-100! data-[revealed=true]:visible! data-[revealed=true]:translate-y-0!');
      observer.observe(element);
    });
    cleanups.push(() => observer.disconnect());

    document.querySelectorAll<HTMLElement>('.elementor-counter-number, [data-to-value]').forEach(counter => {
      const target = Number(counter.dataset.toValue || counter.textContent?.replace(/[^0-9.-]/g, ''));
      if (!Number.isFinite(target)) return;
      const counterObserver = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        counterObserver.disconnect();
        const start = performance.now();
        let frame = 0;
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / 1300);
          counter.textContent = Math.round(target * (1 - (1 - progress) ** 3)).toLocaleString();
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        cleanups.push(() => cancelAnimationFrame(frame));
      });
      counterObserver.observe(counter);
      cleanups.push(() => counterObserver.disconnect());
    });

    const click = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const popupTrigger = target.closest<HTMLElement>('[data-toggle="modal"], [data-bs-toggle="modal"]');
      if (popupTrigger) {
        event.preventDefault();
        const selector = popupTrigger.getAttribute('data-target') || popupTrigger.getAttribute('data-bs-target');
        const panel = selector?.startsWith('#') ? document.getElementById(selector.slice(1)) : null;
        if (panel) {
          addClasses(panel, 'fixed! inset-0! z-[9999]! overflow-y-auto! bg-black/50 data-[runtime-open=true]:opacity-100! data-[runtime-open=true]:visible!');
          panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
          openPanel(panel, true);
        } else {
          // The reference's consultation widget injects a remote plugin form.
          // Keep the CTA usable through the complete local enquiry page.
          window.location.assign('/contact/');
        }
        return;
      }
      const popupClose = target.closest<HTMLElement>('[data-dismiss="modal"], [data-bs-dismiss="modal"]');
      if (popupClose) { const panel = popupClose.closest<HTMLElement>('.modal'); if (panel) openPanel(panel, false); return; }
      const toggle = target.closest<HTMLElement>('.elementor-menu-toggle, .elementskit-menu-toggler');
      if (toggle) {
        const open = !toggle.classList.contains('elementskit-menu-close') && toggle.getAttribute('aria-expanded') !== 'true';
        const controlId = toggle.getAttribute('aria-controls');
        const panel = controlId ? document.getElementById(controlId) : toggle.parentElement?.querySelector<HTMLElement>('nav.elementor-nav-menu--dropdown');
        toggle.setAttribute('aria-expanded', String(open));
        toggle.classList.toggle('elementor-active', open);
        if (panel) openPanel(panel, open);
        return;
      }
      const submenu = target.closest<HTMLAnchorElement>('header .menu-item-has-children > a, header .elementskit-megamenu-has > a, header .elementskit-dropdown-has > a');
      if (submenu && ['#', '#content', ''].includes(submenu.getAttribute('href') || '')) {
        event.preventDefault();
        const panel = submenu.parentElement?.querySelector<HTMLElement>(':scope > ul, :scope > .elementskit-megamenu-panel, :scope > .elementskit-dropdown');
        const open = submenu.getAttribute('aria-expanded') !== 'true';
        submenu.setAttribute('aria-expanded', String(open));
        if (panel) openPanel(panel, open);
        return;
      }
      if (!target.closest('header')) closeMenus();
      if (target.closest('.ekit-btt__button, [data-back-to-top]')) { event.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      const thumb = target.closest<HTMLAnchorElement>('.foogallery a.fg-thumb, a[data-elementor-open-lightbox="yes"]');
      if (thumb) {
        event.preventDefault();
        const collection = thumb.closest('.foogallery') || thumb.parentElement;
        const links = [...(collection?.querySelectorAll<HTMLAnchorElement>('a.fg-thumb, a[data-elementor-open-lightbox="yes"]') || [])];
        const images = links.map(link => ({ src: link.href, alt: link.querySelector('img')?.alt || link.dataset.captionTitle || 'Venture7 gallery image' }));
        lastFocus.current = thumb;
        setGallery({ images, index: Math.max(0, links.indexOf(thumb)) });
      }
      const tab = target.closest<HTMLElement>('[role="tab"], .elementor-tab-title');
      if (tab) {
        const group = tab.closest('.elementor-tabs, .elementor-widget-tabs, [data-tabs]');
        const id = tab.getAttribute('aria-controls') || tab.dataset.tab;
        if (group && id) {
          event.preventDefault();
          group.querySelectorAll<HTMLElement>('[role="tab"], .elementor-tab-title').forEach(button => button.setAttribute('aria-selected', String(button === tab)));
          group.querySelectorAll<HTMLElement>('[role="tabpanel"], .elementor-tab-content').forEach(panel => openPanel(panel, panel.id === id || panel.dataset.tab === id));
        }
      }
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenus();
      if (['Enter', ' '].includes(event.key) && (event.target as HTMLElement).matches('[role="button"]')) {
        event.preventDefault(); (event.target as HTMLElement).click();
      }
    };
    const submit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement;
      if (!form.matches('form.wpcf7-form, form.contact-form, form[data-contact-form], form[data-validated-form]')) return;
      event.preventDefault();
      const fields = [...form.querySelectorAll<Field>('input:not([type="hidden"]):not([type="submit"]), textarea, select')];
      fields.forEach(field => {
        if (field instanceof HTMLInputElement && ['checkbox', 'radio', 'file', 'button'].includes(field.type)) return;
        const label = field.id ? form.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(field.id)}"]`) : null;
        const group = field.closest('.form-group');
        const labelText = `${label?.textContent || ''} ${group?.querySelector('label')?.textContent || ''} ${field.getAttribute('placeholder') || ''}`;
        field.required = field.required || field.classList.contains('wpcf7-validates-as-required') || field.getAttribute('aria-required') === 'true' || labelText.includes('*') || /^(?:name|first_?name|last_?name|full_?name)$/i.test(field.name);
        if (field instanceof HTMLInputElement && /phone|mobile/i.test(field.name)) field.pattern = '[+() 0-9-]{7,20}';
        field.setAttribute('aria-invalid', String(!field.checkValidity()));
      });
      let output = form.querySelector<HTMLElement>('.wpcf7-response-output, [data-form-status]');
      if (!output) { output = document.createElement('p'); output.dataset.formStatus = ''; form.append(output); }
      output.setAttribute('role', 'status');
      output.setAttribute('aria-live', 'polite');
      addClasses(output, 'block! mt-4! rounded-md border border-[#035c56] bg-white p-3 text-sm text-[#035c56]');
      if (!form.checkValidity()) {
        output.textContent = 'Please complete the required fields with valid details.';
        form.reportValidity();
        return;
      }
      const values = fields.filter(field => field.name && (!(field instanceof HTMLInputElement) || !['checkbox', 'radio'].includes(field.type) || field.checked)).map(field => `${field.getAttribute('placeholder') || field.name}: ${field.value}`).join('\n');
      output.textContent = 'Your details are valid. Open the email draft below, then send it to contact Venture7. Nothing has been sent yet. ';
      const email = document.createElement('a');
      email.href = `mailto:info@venture7.com?subject=${encodeURIComponent('Website inquiry: ' + document.title)}&body=${encodeURIComponent(values + '\n\nPage: ' + location.href)}`;
      email.textContent = 'Open email draft';
      email.className = 'font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-[#035c56]';
      output.append(email);
    };
    document.addEventListener('click', click);
    document.addEventListener('keydown', keydown);
    document.addEventListener('submit', submit);
    cleanups.push(() => { document.removeEventListener('click', click); document.removeEventListener('keydown', keydown); document.removeEventListener('submit', submit); });
    return () => cleanups.forEach(cleanup => cleanup());
  }, [pathname]);

  useEffect(() => {
    if (!gallery) return;
    galleryClose.current?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setGallery(null); lastFocus.current?.focus(); }
      if (event.key === 'ArrowRight') setGallery(current => current && ({ ...current, index: (current.index + 1) % current.images.length }));
      if (event.key === 'ArrowLeft') setGallery(current => current && ({ ...current, index: (current.index - 1 + current.images.length) % current.images.length }));
    };
    document.addEventListener('keydown', keyboard);
    return () => document.removeEventListener('keydown', keyboard);
  }, [Boolean(gallery)]);

  if (!gallery?.images.length) return null;
  return <div role="dialog" aria-modal="true" aria-label="Image gallery" className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/90 p-12" onClick={() => { setGallery(null); lastFocus.current?.focus(); }}>
    <button ref={galleryClose} type="button" className="absolute right-5 top-4 cursor-pointer rounded p-3 text-3xl text-white hover:bg-white/15" aria-label="Close image gallery" onClick={() => setGallery(null)}>×</button>
    <button type="button" aria-label="Previous image" className="absolute left-3 cursor-pointer rounded p-3 text-4xl text-white hover:bg-white/15" onClick={event => { event.stopPropagation(); setGallery({ ...gallery, index: (gallery.index - 1 + gallery.images.length) % gallery.images.length }); }}>‹</button>
    <img src={gallery.images[gallery.index].src} alt={gallery.images[gallery.index].alt} className="max-h-[85dvh] max-w-full object-contain" onClick={event => event.stopPropagation()} />
    <button type="button" aria-label="Next image" className="absolute right-3 cursor-pointer rounded p-3 text-4xl text-white hover:bg-white/15" onClick={event => { event.stopPropagation(); setGallery({ ...gallery, index: (gallery.index + 1) % gallery.images.length }); }}>›</button>
    <p className="absolute bottom-4 text-sm text-white">{gallery.index + 1} / {gallery.images.length}</p>
  </div>;
}
