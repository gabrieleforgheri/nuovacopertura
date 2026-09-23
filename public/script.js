/* Nuova Copertura — front-end */
(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ── scroll lock (shared by mobile nav and modal) ────────────────────────────
  let scrollLocks = 0;
  const lockScroll = () => {
    if (scrollLocks++ === 0) document.body.classList.add('is-locked');
  };
  const unlockScroll = () => {
    scrollLocks = Math.max(0, scrollLocks - 1);
    if (scrollLocks === 0) document.body.classList.remove('is-locked');
  };

  // ── nav ─────────────────────────────────────────────────────────────────────
  const nav = $('nav');
  const navToggle = $('.nav-toggle');
  const mobileNav = $('#mobileNav');

  let mobileOpen = false;
  const setMobileOpen = (open) => {
    if (!navToggle || !mobileNav || open === mobileOpen) return;
    mobileOpen = open;
    mobileNav.hidden = !open;
    mobileNav.classList.toggle('open', open);
    navToggle.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Chiudi menu' : 'Apri menu');
    if (open) lockScroll();
    else unlockScroll();
  };

  if (navToggle && mobileNav) {
    navToggle.addEventListener('click', () => setMobileOpen(!mobileOpen));
    $$('a', mobileNav).forEach((a) => a.addEventListener('click', () => setMobileOpen(false)));
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) setMobileOpen(false);
    });
  }

  if (nav) {
    const onScroll = () => nav.classList.toggle('nav-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // localStorage can throw (private mode, blocked site data): fall back to "nothing stored".
  const store = {
    get: (key) => { try { return localStorage.getItem(key); } catch { return null; } },
    set: (key, value) => { try { localStorage.setItem(key, value); } catch { /* not persisted */ } }
  };

  // ── theme ───────────────────────────────────────────────────────────────────
  // The initial theme is applied by the inline script in <head> (no FOUC).
  const themeButtons = [$('#themeToggle'), $('#themeToggleMobile')].filter(Boolean);
  const THEME_KEY = 'site-theme';
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const applyTheme = (theme) => {
    const isDark = theme === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    themeButtons.forEach((btn) => {
      const icon = $('.theme-icon', btn);
      if (icon) icon.textContent = isDark ? '☀️' : '🌙';
      const label = isDark ? 'Attiva tema chiaro' : 'Attiva tema scuro';
      btn.setAttribute('aria-pressed', String(isDark));
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    });
  };

  applyTheme(store.get(THEME_KEY) || (darkQuery.matches ? 'dark' : 'light'));

  themeButtons.forEach((btn) =>
    btn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      store.set(THEME_KEY, next);
      applyTheme(next);
    })
  );

  darkQuery.addEventListener('change', (e) => {
    if (!store.get(THEME_KEY)) applyTheme(e.matches ? 'dark' : 'light');
  });

  // ── service modal ───────────────────────────────────────────────────────────
  const modal = $('#serviceModal');
  const modalTitle = $('#serviceModalTitle');
  const modalText = $('#serviceModalText');
  const modalImage = $('#serviceModalImage');
  const modalClose = $('#serviceModalClose');
  const FOCUSABLE =
    'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
  let lastFocused = null;

  const closeModal = () => {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    modal.classList.remove('open');
    unlockScroll();
    lastFocused?.focus?.();
    lastFocused = null;
  };

  const openModal = (card) => {
    if (!modal || !modalTitle || !modalText || !modalImage) return;
    const title = $('.service-name', card)?.textContent?.trim() || '';
    const detail = $('.service-detail', card)?.textContent?.trim() || '';
    const img = $('img', card);

    modalTitle.textContent = title;
    modalText.textContent = detail;
    if (img) {
      // Reuse the large rendition already declared in the card's srcset.
      modalImage.src = img.currentSrc || img.src;
      modalImage.srcset = img.srcset || '';
      modalImage.alt = img.alt || '';
    }

    lastFocused = document.activeElement;
    modal.hidden = false;
    modal.classList.add('open');
    lockScroll();
    modalClose?.focus();
  };

  $$('.service-card').forEach((card) => {
    const trigger = $('.service-open', card);
    trigger?.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(card);
    });
    // Mouse users can click anywhere on the card; the button stays the a11y entry point.
    card.addEventListener('click', (e) => {
      if (e.target.closest('.service-open')) return;
      openModal(card);
    });
  });

  modalClose?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => {
    if (e.target instanceof HTMLElement && e.target.dataset.closeModal === 'true') closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modal && !modal.hidden) return closeModal();
      if (mobileOpen) return setMobileOpen(false);
    }
    // Keep focus inside the dialog while it is open.
    if (e.key === 'Tab' && modal && !modal.hidden) {
      const items = $$(FOCUSABLE, modal).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // ── hero rotating headline ──────────────────────────────────────────────────
  const heroSlot = $('#heroSlot');
  const heroPrep = $('#heroPrep');
  if (heroSlot && !prefersReducedMotion.matches) {
    const currentEl = $('.slot-current', heroSlot);
    const nextEl = $('.slot-next', heroSlot);
    const items = [
      // img: service photo (null = default hero photo from the CSS).
      // pos/flip: framing that keeps the subject on the right, away from the text.
      { prep: 'NELLE', text: 'COPERTURE', img: null, flip: true },
      { prep: 'NELLE', text: 'LINEE VITA', img: 'linea-vita' },
      { prep: 'NEI', text: 'PARAPETTI', img: 'parapetti', pos: 'right' },
      { prep: 'NELLE', text: 'SCALE MARINARE', img: 'scale-marinare', pos: 'left', flip: true },
      { prep: 'NEL', text: 'FOTOVOLTAICO', img: 'fotovoltaico' },
      { prep: 'NELLE', text: 'MANUTENZIONI', img: 'manutenzione' },
      { prep: 'NELLO', text: 'SMALTIMENTO AMIANTO', img: 'amianto', pos: 'left', flip: true }
    ];

    // The background follows the green word, reusing the service photos.
    // Absolute URL: a relative url() inside a custom property resolves differently per browser.
    const heroBg = $('.hero-photos');
    const photo = (name) =>
      new URL(`img/${name}-${window.innerWidth > 900 ? 1600 : 800}.webp`, document.baseURI).href;
    const preload = (item) => {
      if (item.img) new Image().src = photo(item.img);
    };
    // New layer on top fades/zooms in over the old one, which is removed afterwards.
    const showPhoto = (item) => {
      const old = $$('.hero-photo', heroBg);
      const layer = document.createElement('div');
      layer.className = 'hero-photo';
      if (item.img) layer.style.setProperty('--photo', `url('${photo(item.img)}')`);
      layer.style.setProperty('--pos', item.pos || 'center');
      layer.style.setProperty('--flip', item.flip ? '-1' : '1');
      heroBg.append(layer);
      layer.getBoundingClientRect(); // commit the start state so the transition runs
      layer.classList.add('is-in');
      window.setTimeout(() => old.forEach((el) => el.remove()), 1700);
    };

    let idx = 0;
    let timer = null;

    const rotate = () => {
      if (!currentEl || !nextEl || heroSlot.classList.contains('is-spinning')) return;
      idx = (idx + 1) % items.length;
      nextEl.textContent = items[idx].text;
      if (heroPrep) heroPrep.textContent = items[idx].prep;
      showPhoto(items[idx]);
      preload(items[(idx + 1) % items.length]);
      heroSlot.classList.add('is-spinning');
      window.setTimeout(() => {
        currentEl.textContent = items[idx].text;
        nextEl.textContent = '';
        heroSlot.classList.remove('is-spinning');
      }, 480);
    };

    const start = () => {
      if (!timer) timer = window.setInterval(rotate, 2600);
    };
    const stop = () => {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    if (currentEl) currentEl.textContent = items[0].text;
    if (heroPrep) heroPrep.textContent = items[0].prep;
    preload(items[1]);
    start();

    // Don't burn cycles (or battery) while the tab is in the background.
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    prefersReducedMotion.addEventListener('change', (e) => (e.matches ? stop() : start()));
  }

  // ── scroll reveal ───────────────────────────────────────────────────────────
  const reveals = $$('.reveal');
  if (prefersReducedMotion.matches) {
    reveals.forEach((el) => el.classList.add('visible'));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (!entry.isIntersecting) return;
          window.setTimeout(() => entry.target.classList.add('visible'), i * 80);
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.12 }
    );
    reveals.forEach((el) => revealObserver.observe(el));
  }

  // ── cookie consent + social embeds ──────────────────────────────────────────
  // Instagram/Facebook iframes let Meta set profiling cookies, so nothing is
  // requested from Meta until the visitor accepts, from the banner or from the
  // placeholder in the social section. '1' = accetta tutti, '0' = solo necessari.
  const SOCIAL_KEY = 'social-consent';
  let embedsLoaded = false;

  const loadEmbeds = () => {
    if (embedsLoaded) return;
    embedsLoaded = true;
    $$('.social-embed').forEach((box) => {
      const frame = document.createElement('iframe');
      // The Facebook plugin renders at a fixed pixel width (180–500).
      const width = Math.min(500, Math.max(180, Math.floor(box.clientWidth)));
      frame.src = box.dataset.src.replace('{w}', width);
      frame.title = box.dataset.title;
      frame.loading = 'lazy';
      box.replaceChildren(frame);
    });
  };

  const banner = document.createElement('div');
  banner.className = 'cookie-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-labelledby', 'cookieTitle');
  banner.hidden = true;
  banner.innerHTML = `
    <p><strong id="cookieTitle">Cookie</strong> Usiamo solo cookie tecnici, necessari al funzionamento del sito.
      Con “Accetta tutti” mostriamo anche i contenuti di Instagram e Facebook, che installano cookie di
      profilazione di Meta. <a href="privacy#cookie">Informativa</a></p>
    <div class="cookie-actions">
      <button type="button" class="cookie-reject" data-consent="0">Non accetto</button>
      <button type="button" class="btn-ghost btn-ghost-sm" data-consent="0">Solo necessari</button>
      <button type="button" class="btn-primary btn-ghost-sm" data-consent="1">Accetta tutti</button>
    </div>`;
  document.body.append(banner);

  const setConsent = (value) => {
    store.set(SOCIAL_KEY, value);
    banner.hidden = true;
    if (value === '1') loadEmbeds();
    else if (embedsLoaded) location.reload(); // drop the Meta iframes already running
  };

  const storedConsent = store.get(SOCIAL_KEY);
  if (storedConsent === '1') loadEmbeds();
  else if (storedConsent === null) banner.hidden = false;

  $$('[data-consent]', banner).forEach((btn) =>
    btn.addEventListener('click', () => setConsent(btn.dataset.consent))
  );
  $$('.social-consent').forEach((btn) => btn.addEventListener('click', () => setConsent('1')));
  $('.cookie-prefs')?.addEventListener('click', () => {
    banner.hidden = false;
    $('[data-consent="1"]', banner).focus();
  });

  // ── count-up numbers ────────────────────────────────────────────────────────
  const formatNum = (n) => Math.floor(n).toLocaleString('it-IT');

  const countUp = (el, target, duration = 1600) => {
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      // ease-out so the number settles instead of stopping dead
      el.textContent = formatNum(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = formatNum(target);
    };
    requestAnimationFrame(tick);
  };

  const strip = $('.numbers-strip');
  if (strip && !prefersReducedMotion.matches) {
    const numObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          $$('[data-target]', entry.target).forEach((n) =>
            countUp(n, parseInt(n.dataset.target, 10) || 0)
          );
          numObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );
    numObserver.observe(strip);
  }

  // ── footer year ─────────────────────────────────────────────────────────────
  const yearEl = $('#footerYear');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // ── contact form ────────────────────────────────────────────────────────────
  const form = $('#contactForm');
  if (form) {
    const btn = $('.form-submit', form);
    const errorEl = $('#formError');
    const successEl = $('#formSuccess');
    const originalBtnText = btn ? btn.textContent : 'Invia Richiesta →';

    const messages = {
      missing_fields: 'Compila tutti i campi obbligatori.',
      invalid_email: 'L’indirizzo email non sembra valido.',
      invalid_phone: 'Il numero di telefono non sembra valido.',
      invalid_service: 'Seleziona un servizio dall’elenco.',
      privacy_required: 'Per inviare la richiesta devi accettare l’informativa privacy.',
      rate_limited: 'Troppe richieste in poco tempo. Attendi un minuto e riprova.',
      forbidden_origin: 'Richiesta non autorizzata. Ricarica la pagina e riprova.',
      service_unavailable:
        'Servizio email non disponibile al momento. Chiamaci al 388 784 1511 o scrivi a info@nuovacopertura.it.',
      delivery_failed: 'Invio non riuscito. Riprova tra poco oppure chiamaci al 388 784 1511.',
      network: 'Connessione non riuscita. Controlla la rete e riprova.'
    };

    const showError = (code) => {
      if (!errorEl) return;
      errorEl.textContent = messages[code] || messages.delivery_failed;
      errorEl.hidden = false;
    };
    const clearError = () => {
      if (errorEl) errorEl.hidden = true;
    };

    const setBusy = (busy) => {
      if (!btn) return;
      btn.disabled = busy;
      btn.textContent = busy ? 'Invio in corso…' : originalBtnText;
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError();

      // Let the browser flag the offending field before we bother the server.
      if (!form.checkValidity()) {
        form.reportValidity();
        const invalid = $(':invalid', form);
        if (invalid === form.elements.privacy) showError('privacy_required');
        return;
      }

      setBusy(true);

      const payload = {
        nome: form.elements.nome.value.trim(),
        cognome: form.elements.cognome.value.trim(),
        email: form.elements.email.value.trim(),
        telefono: form.elements.telefono.value.trim(),
        servizio: form.elements.servizio.value,
        messaggio: form.elements.messaggio.value.trim(),
        privacy: form.elements.privacy.checked,
        website: form.elements.website.value,
        source: 'sito web'
      };

      try {
        const res = await fetch('api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.ok) {
          setBusy(false);
          showError(data.error);
          return;
        }

        form.reset();
        setBusy(false);
        if (btn) btn.hidden = true;
        if (successEl) {
          successEl.hidden = false;
          successEl.focus?.();
        }
      } catch {
        setBusy(false);
        showError('network');
      }
    });

    // Clearing the error as soon as the user edits keeps the message honest.
    form.addEventListener('input', clearError);
  }
})();
