  // Mobile nav toggle
  const navToggle = document.querySelector('.nav-toggle');
  const mobileNav = document.getElementById('mobileNav');
  if (navToggle && mobileNav) {
    const setMobileOpen = (open) => {
      mobileNav.classList.toggle('open', open);
      mobileNav.setAttribute('aria-hidden', open ? 'false' : 'true');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.setAttribute('aria-label', open ? 'Chiudi menu' : 'Apri menu');
    };
    navToggle.addEventListener('click', () => {
      setMobileOpen(!mobileNav.classList.contains('open'));
    });
    mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMobileOpen(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMobileOpen(false); });
  }

  // Instagram embed script (renderizza i blockquote.instagram-media)
  (function ensureInstagramEmbedScript() {
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
  })();

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
