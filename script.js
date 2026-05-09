  // Mobile nav toggle
  const navToggle = document.querySelector('.nav-toggle');
  const mobileNav = document.getElementById('mobileNav');
  const nav = document.querySelector('nav');
  if (navToggle && mobileNav) {
    const syncMobileNavOffset = () => {
      if (!nav) return;
      const navHeight = Math.max(72, Math.min(110, Math.ceil(nav.getBoundingClientRect().height)));
      document.documentElement.style.setProperty('--mobile-nav-top', `${navHeight}px`);
    };

    const setMobileOpen = (open) => {
      mobileNav.classList.toggle('open', open);
      mobileNav.setAttribute('aria-hidden', open ? 'false' : 'true');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.setAttribute('aria-label', open ? 'Chiudi menu' : 'Apri menu');
      document.body.style.overflow = open ? 'hidden' : '';
      syncMobileNavOffset();
    };

    syncMobileNavOffset();
    navToggle.addEventListener('click', () => {
      setMobileOpen(!mobileNav.classList.contains('open'));
    });
    mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMobileOpen(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMobileOpen(false); });
    window.addEventListener('resize', () => {
      syncMobileNavOffset();
      if (window.innerWidth > 900) setMobileOpen(false);
    });
  }

  // Shrink navbar on scroll
  if (nav) {
    const updateNavOnScroll = () => {
      nav.classList.toggle('nav-scrolled', window.scrollY > 8);
      const navHeight = Math.max(72, Math.min(110, Math.ceil(nav.getBoundingClientRect().height)));
      document.documentElement.style.setProperty('--mobile-nav-top', `${navHeight}px`);
    };
    updateNavOnScroll();
    window.addEventListener('scroll', updateNavOnScroll, { passive: true });
  }

  // Theme toggle (default light)
  const themeButtons = [
    document.getElementById('themeToggle'),
    document.getElementById('themeToggleMobile')
  ].filter(Boolean);
  const themeStorageKey = 'site-theme';

  const applyTheme = (theme) => {
    const safeTheme = theme === 'dark' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', safeTheme);
    themeButtons.forEach((btn) => {
      const isDark = safeTheme === 'dark';
      btn.innerHTML = `<span class="theme-icon" aria-hidden="true">${isDark ? '☀️' : '🌙'}</span>`;
      btn.setAttribute('aria-pressed', String(isDark));
      const nextLabel = isDark ? 'Attiva tema chiaro' : 'Attiva tema scuro';
      btn.setAttribute('aria-label', nextLabel);
      btn.setAttribute('title', nextLabel);
    });
  };

  const storedTheme = localStorage.getItem(themeStorageKey);
  applyTheme(storedTheme || 'light');
  themeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const isDark = document.body.getAttribute('data-theme') === 'dark';
      const nextTheme = isDark ? 'light' : 'dark';
      localStorage.setItem(themeStorageKey, nextTheme);
      applyTheme(nextTheme);
    });
  });

  // Instagram embed script (renderizza i blockquote.instagram-media)
  function ensureInstagramEmbedScript() {
    const src = 'https://www.instagram.com/embed.js';
    if ([...document.scripts].some(s => s.src === src)) return;
    const s = document.createElement('script');
    s.async = true;
    s.defer = true;
    s.src = src;
    s.onload = () => {
      if (window.instgrm?.Embeds?.process) window.instgrm.Embeds.process();
    };
    document.body.appendChild(s);
  }

  // Global cookie consent (site-wide)
  const cookieConsentKey = 'cookie-consent-v1';
  const cookieBanner = document.getElementById('cookieBanner');
  const cookieAcceptAll = document.getElementById('cookieAcceptAll');
  const cookieOnlyNecessary = document.getElementById('cookieOnlyNecessary');
  const cookieRejectOptional = document.getElementById('cookieRejectOptional');
  const cookieSettingsBtn = document.getElementById('cookieSettingsBtn');
  const igEmbeds = document.getElementById('igEmbeds');

  const showCookieBanner = () => {
    if (cookieBanner) cookieBanner.classList.add('is-visible');
  };

  const hideCookieBanner = () => {
    if (cookieBanner) cookieBanner.classList.remove('is-visible');
  };

  const applyConsent = (choice) => {
    if (igEmbeds) {
      igEmbeds.classList.toggle('consent-accepted', choice === 'accepted');
    }
    if (choice === 'accepted') {
      ensureInstagramEmbedScript();
    }
  };

  const storedConsent = localStorage.getItem(cookieConsentKey);
  if (!storedConsent) {
    showCookieBanner();
  } else {
    applyConsent(storedConsent);
  }

  if (cookieAcceptAll) {
    cookieAcceptAll.addEventListener('click', () => {
      localStorage.setItem(cookieConsentKey, 'accepted');
      hideCookieBanner();
      applyConsent('accepted');
    });
  }

  if (cookieRejectOptional) {
    cookieRejectOptional.addEventListener('click', () => {
      localStorage.setItem(cookieConsentKey, 'rejected');
      hideCookieBanner();
      applyConsent('rejected');
    });
  }

  if (cookieOnlyNecessary) {
    cookieOnlyNecessary.addEventListener('click', () => {
      localStorage.setItem(cookieConsentKey, 'necessary-only');
      hideCookieBanner();
      applyConsent('necessary-only');
    });
  }

  if (cookieSettingsBtn) {
    cookieSettingsBtn.addEventListener('click', () => {
      showCookieBanner();
    });
  }

  // Hero rotating slot text
  const heroSlot = document.getElementById('heroSlot');
  const heroPrep = document.getElementById('heroPrep');
  if (heroSlot) {
    const currentEl = heroSlot.querySelector('.slot-current');
    const nextEl = heroSlot.querySelector('.slot-next');
    const items = [
      { prep: 'NELLE', text: 'COPERTURE' },
      { prep: 'NELLE', text: 'LINEE VITA' },
      { prep: 'NEI', text: 'PARAPETTI' },
      { prep: 'NELLE', text: 'SCALE MARINARE' },
      { prep: 'NEI', text: 'MONTAGGI' },
      { prep: 'NELLE', text: 'MANUTENZIONI' },
      { prep: 'NEGLI', text: 'SMALTIMENTI' }
    ];

    let idx = 0;
    const rotate = () => {
      if (!currentEl || !nextEl || heroSlot.classList.contains('is-spinning')) return;
      idx = (idx + 1) % items.length;
      nextEl.textContent = items[idx].text;
      if (heroPrep) heroPrep.textContent = items[idx].prep;
      heroSlot.classList.add('is-spinning');
      window.setTimeout(() => {
        currentEl.textContent = items[idx].text;
        nextEl.textContent = '';
        heroSlot.classList.remove('is-spinning');
      }, 480);
    };

    currentEl.textContent = items[0].text;
    if (heroPrep) heroPrep.textContent = items[0].prep;
    window.setInterval(rotate, 2600);
  }

  // Scroll reveal
  const reveals = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver(entries => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('visible'), i * 80);
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  reveals.forEach(el => observer.observe(el));

  // Count-up numbers
  function countUp(el, target, duration = 1800) {
    const isLarge = target > 999;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { start = target; clearInterval(timer); }
      el.textContent = isLarge
        ? Math.floor(start).toLocaleString('it-IT')
        : Math.floor(start);
    }, 16);
  }
  const numObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const nums = e.target.querySelectorAll('[data-target]');
        nums.forEach(n => countUp(n, parseInt(n.dataset.target)));
        numObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.4 });
  const strip = document.querySelector('.numbers-strip');
  if (strip) numObserver.observe(strip);

  // Form submit
  const form = document.getElementById('contactForm');
  const successEl = document.getElementById('formSuccess');
  if (form) {
    const btn = form.querySelector('.form-submit');
    const originalBtnText = btn ? btn.textContent : '';

    const showSuccess = () => {
      if (btn) btn.style.display = 'none';
      if (successEl) successEl.style.display = 'block';
    };

    const setBusy = (busy) => {
      if (!btn) return;
      btn.disabled = busy;
      btn.textContent = busy ? 'Invio in corso…' : originalBtnText;
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      setBusy(true);

      const payload = {
        nome: form.nome?.value?.trim(),
        cognome: form.cognome?.value?.trim(),
        email: form.email?.value?.trim(),
        servizio: form.servizio?.value?.trim(),
        messaggio: form.messaggio?.value?.trim() || '',
        source: 'index.html'
      };

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data?.error || 'Invio fallito');
        showSuccess();
      } catch (err) {
        setBusy(false);
        alert('Errore durante l’invio. Riprova tra poco oppure contattaci via telefono/email.');
      }
    });
  }
