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
      navToggle.classList.toggle('is-open', open);
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
  const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const applyTheme = (theme) => {
    const safeTheme = theme === 'dark' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', safeTheme);
    themeButtons.forEach((btn) => {
      const isDark = safeTheme === 'dark';
      const icon = `<span class="theme-icon" aria-hidden="true">${isDark ? '☀️' : '🌙'}</span>`;
      const label = btn.classList.contains('theme-toggle-mobile') ? '<span class="theme-toggle-label">Tema</span>' : '';
      btn.innerHTML = `${icon}${label}`;
      btn.setAttribute('aria-pressed', String(isDark));
      const nextLabel = isDark ? 'Attiva tema chiaro' : 'Attiva tema scuro';
      btn.setAttribute('aria-label', nextLabel);
      btn.setAttribute('title', nextLabel);
    });
  };

  const storedTheme = localStorage.getItem(themeStorageKey);
  applyTheme(storedTheme || (colorSchemeQuery.matches ? 'dark' : 'light'));
  themeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const isDark = document.body.getAttribute('data-theme') === 'dark';
      const nextTheme = isDark ? 'light' : 'dark';
      localStorage.setItem(themeStorageKey, nextTheme);
      applyTheme(nextTheme);
    });
  });
  colorSchemeQuery.addEventListener('change', (e) => {
    if (localStorage.getItem(themeStorageKey)) return;
    applyTheme(e.matches ? 'dark' : 'light');
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
  const inlineAcceptSocialCookies = document.getElementById('inlineAcceptSocialCookies');
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

  if (inlineAcceptSocialCookies) {
    inlineAcceptSocialCookies.addEventListener('click', () => {
      localStorage.setItem(cookieConsentKey, 'accepted');
      hideCookieBanner();
      applyConsent('accepted');
    });
  }

  // Service modal (same page detail panel)
  const serviceModal = document.getElementById('serviceModal');
  const serviceModalTitle = document.getElementById('serviceModalTitle');
  const serviceModalText = document.getElementById('serviceModalText');
  const serviceModalImage = document.getElementById('serviceModalImage');
  const serviceModalClose = document.getElementById('serviceModalClose');
  const serviceCards = document.querySelectorAll('.service-card[data-service]');
  const serviceData = {
    rifacimento: {
      title: 'Rifacimento coperture industriali e civili',
      text: 'Il rifacimento coperture industriali e civili migliora sicurezza, isolamento e durata del tetto. Analizziamo lo stato della copertura e realizziamo la sostituzione con materiali certificati.',
      image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80'
    },
    'linea-vita': {
      title: 'Linea vita',
      text: 'La linea vita e essenziale per la sicurezza sul lavoro in quota. Installiamo sistemi anticaduta certificati per operare in copertura in conformita normativa.',
      image: 'https://images.unsplash.com/photo-1501331755467-7cbec1d0c055?auto=format&fit=crop&w=1200&q=80'
    },
    parapetti: {
      title: 'Parapetti permanenti',
      text: 'I parapetti permanenti garantiscono protezione stabile su coperture e bordi esposti. Forniamo soluzioni resistenti e adatte a contesti industriali e civili.',
      image: 'https://images.unsplash.com/photo-1762438440807-adaaf10faf64?auto=format&fit=crop&w=1200&q=80'
    },
    'scale-marinare': {
      title: 'Scale marinare',
      text: 'Le scale marinare consentono accesso sicuro alle coperture e alle aree tecniche. Le installiamo con fissaggi certificati e configurazioni su misura.',
      image: 'https://images.unsplash.com/photo-1542222105-31a21d807f09?auto=format&fit=crop&w=1200&q=80'
    },
    fotovoltaico: {
      title: 'Montaggio e lavaggio fotovoltaico',
      text: 'Ci occupiamo di montaggio e lavaggio fotovoltaico per mantenere alta l efficienza dell impianto e migliorare resa, durata e affidabilita energetica.',
      image: 'https://images.unsplash.com/photo-1559302504-64aae6ca6b6d?auto=format&fit=crop&w=1200&q=80'
    },
    manutenzione: {
      title: 'Manutenzione e pulizia tetto',
      text: 'La manutenzione e pulizia tetto previene infiltrazioni e degrado. Programmiamo controlli periodici, pulizia gronde e interventi rapidi.',
      image: 'https://images.unsplash.com/photo-1760331840361-d751cfc1becf?auto=format&fit=crop&w=1200&q=80'
    },
    amianto: {
      title: 'Smaltimento amianto',
      text: 'Lo smaltimento amianto richiede procedure rigorose. Gestiamo bonifica, rimozione e conferimento autorizzato con documentazione completa e massima sicurezza.',
      image: 'https://images.unsplash.com/photo-1599707367072-cd6ada2bc375?auto=format&fit=crop&w=1200&q=80'
    }
  };

  const closeServiceModal = () => {
    if (!serviceModal) return;
    serviceModal.classList.remove('open');
    serviceModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  const openServiceModal = (key) => {
    const item = serviceData[key];
    if (!item || !serviceModal || !serviceModalTitle || !serviceModalText || !serviceModalImage) return;
    serviceModalTitle.textContent = item.title;
    serviceModalText.textContent = item.text;
    serviceModalImage.src = item.image;
    serviceModalImage.alt = item.title;
    serviceModal.classList.add('open');
    serviceModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  serviceCards.forEach((card) => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      openServiceModal(card.dataset.service);
    });
  });

  if (serviceModalClose) {
    serviceModalClose.addEventListener('click', closeServiceModal);
  }
  if (serviceModal) {
    serviceModal.addEventListener('click', (e) => {
      if (e.target instanceof HTMLElement && e.target.dataset.closeModal === 'true') closeServiceModal();
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

    const contactErrorMessage = (code) => {
      switch (code) {
        case 'smtp_not_configured':
          return 'Servizio email non configurato sul server (SMTP). Contattaci per telefono o email.';
        case 'contact_not_configured':
          return 'Destinatario email non configurato sul server. Contattaci per telefono o email.';
        case 'delivery_failed':
          return 'Invio non riuscito (errore SMTP). Riprova più tardi o contattaci direttamente.';
        case 'Too many requests':
          return 'Troppe richieste in poco tempo. Attendi un minuto e riprova.';
        default:
          return 'Errore durante l’invio. Riprova tra poco oppure contattaci via telefono/email.';
      }
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
        alert(contactErrorMessage(err?.message));
      }
    });
  }
