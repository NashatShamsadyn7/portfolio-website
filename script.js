/* ═══════════════════════════════════════════════════════════
   Nashat Shamsadyn Ahmed — portfolio
   No custom cursor, no magnetic buttons, no 3D tilt.
   Transform/opacity only, and everything obeys reduced-motion.
   ═══════════════════════════════════════════════════════════ */
'use strict';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* Coalesce scroll work into one frame per tick */
function rafThrottle(fn) {
  let queued = false;
  return function throttled(...args) {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; fn.apply(this, args); });
  };
}

/* ───────────────────────────────────────────
   Toast
   ─────────────────────────────────────────── */
const toast = (() => {
  const el = $('#toast');
  let timer = null;
  return function show(message, ms = 3200) {
    if (!el) return;
    clearTimeout(timer);
    el.textContent = message;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('is-shown'));
    timer = setTimeout(() => {
      el.classList.remove('is-shown');
      setTimeout(() => { el.hidden = true; }, 400);
    }, ms);
  };
})();

/* ───────────────────────────────────────────
   Scroll reveals — staggered, one-shot
   ─────────────────────────────────────────── */
(function initReveals() {
  const targets = $$('[data-anim]');
  if (!targets.length) return;

  if (REDUCED || !('IntersectionObserver' in window)) {
    targets.forEach(el => el.classList.add('is-in'));
    return;
  }

  const STAGGER_IN = '.step, .timeline li, .stack-group, .stat, .chip, .lang';

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('is-in');

      const kids = $$(STAGGER_IN, el);
      kids.forEach((kid, i) => {
        kid.classList.add('stagger');
        kid.style.transitionDelay = `${Math.min(i * 55, 440)}ms`;
        requestAnimationFrame(() => kid.classList.add('is-in'));
      });

      io.unobserve(el);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });

  targets.forEach(el => io.observe(el));

  // A hash link or a fast scroll can carry an element past the viewport
  // before the observer ever samples it. Reveal anything already above us.
  const catchUp = () => targets.forEach(el => {
    if (el.classList.contains('is-in')) return;
    if (el.getBoundingClientRect().bottom < 0) { el.classList.add('is-in'); io.unobserve(el); }
  });
  window.addEventListener('scroll', rafThrottle(catchUp), { passive: true });
  window.addEventListener('load', catchUp);
  catchUp();
})();

/* Download cards live outside any [data-anim] block — reveal them one by one */
(function initRowReveals() {
  const rows = $$('.dl-item');
  if (!rows.length) return;

  if (REDUCED || !('IntersectionObserver' in window)) {
    rows.forEach(el => el.classList.add('is-in'));
    return;
  }

  rows.forEach(el => {
    if (!el.classList.contains('stagger')) el.classList.add('stagger');
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -80px 0px' });

  rows.forEach(el => io.observe(el));
})();

/* ───────────────────────────────────────────
   Split the headline into words so each can be
   animated separately. Walks text nodes only, so
   <em> and the strike-through span survive intact.
   ─────────────────────────────────────────── */
(function splitHeadline() {
  const el = $('.display');
  if (!el || REDUCED) return;

  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  let i = 0;
  nodes.forEach(node => {
    if (!node.textContent.trim()) return;
    const frag = document.createDocumentFragment();
    // Keep the whitespace as real text nodes so the line still wraps normally
    node.textContent.split(/(\s+)/).forEach(part => {
      if (!part) return;
      if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
      const span = document.createElement('span');
      span.className = 'word';
      span.style.setProperty('--wi', i++);
      span.textContent = part;
      frag.appendChild(span);
    });
    node.parentNode.replaceChild(frag, node);
  });
})();


/* ───────────────────────────────────────────
   Counters
   ─────────────────────────────────────────── */
(function initCounters() {
  const nums = $$('.stat-num[data-count]');
  if (!nums.length) return;

  const render = (el, value) => {
    el.textContent = value + (el.dataset.suffix || '');
  };

  if (REDUCED || !('IntersectionObserver' in window)) {
    nums.forEach(el => render(el, Number(el.dataset.count)));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.count) || 0;
      const start = performance.now();
      const dur = 1100;

      const tick = (now) => {
        const t = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        render(el, Math.round(target * eased));
        if (t < 1) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
      io.unobserve(el);
    });
  }, { threshold: 0.6 });

  nums.forEach(el => io.observe(el));
})();

/* ───────────────────────────────────────────
   Nav: stuck state + active section
   ─────────────────────────────────────────── */
(function initNav() {
  const nav = $('#nav');
  if (!nav) return;

  const drawer = $('#mobileDrawer');
  let lastY = window.scrollY;

  const onScroll = rafThrottle(() => {
    const y = window.scrollY;
    nav.classList.toggle('is-stuck', y > 24);

    // Hide on the way down, bring it straight back on the way up.
    // Never while the drawer is open — it is positioned under the bar.
    const drawerOpen = drawer && !drawer.hidden;
    const past = y > 420;
    const goingDown = y > lastY + 2;
    const goingUp = y < lastY - 2;

    if (!drawerOpen && past && goingDown) nav.classList.add('is-hidden');
    else if (goingUp || !past || drawerOpen) nav.classList.remove('is-hidden');

    lastY = y;
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

(function initActiveSection() {
  const links = $$('.nav-links a[href^="#"]');
  if (!links.length || !('IntersectionObserver' in window)) return;

  const byId = new Map();
  links.forEach(a => {
    const id = a.getAttribute('href').slice(1);
    const section = document.getElementById(id);
    if (section) byId.set(section, a);
  });
  if (!byId.size) return;

  const visible = new Set();

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    });

    // Highest section currently on screen wins
    let winner = null;
    visible.forEach(sec => {
      if (!winner || sec.offsetTop < winner.offsetTop) winner = sec;
    });

    links.forEach(a => a.classList.remove('is-active'));
    if (winner && byId.has(winner)) byId.get(winner).classList.add('is-active');
  }, { rootMargin: '-30% 0px -55% 0px', threshold: 0 });

  byId.forEach((_, section) => io.observe(section));
})();

/* ───────────────────────────────────────────
   Mobile drawer
   ─────────────────────────────────────────── */
(function initDrawer() {
  const toggle = $('#navToggle');
  const drawer = $('#mobileDrawer');
  if (!toggle || !drawer) return;

  let open = false;

  function setOpen(next) {
    open = next;
    toggle.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';

    if (open) {
      drawer.hidden = false;
      requestAnimationFrame(() => drawer.classList.add('is-open'));
    } else {
      drawer.classList.remove('is-open');
      setTimeout(() => { if (!open) drawer.hidden = true; }, 340);
    }
  }

  toggle.addEventListener('click', () => setOpen(!open));
  $$('a', drawer).forEach(a => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) setOpen(false); });
  window.addEventListener('resize', rafThrottle(() => {
    if (open && window.innerWidth > 900) setOpen(false);
  }), { passive: true });
})();

/* ───────────────────────────────────────────
   Anchor scrolling that clears the fixed nav
   ─────────────────────────────────────────── */
(function initAnchors() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const target = document.getElementById(href.slice(1));
    if (!target) return;

    e.preventDefault();
    const nav = $('#nav');
    nav?.classList.remove('is-hidden');
    const navH = nav?.offsetHeight || 76;
    const top = target.getBoundingClientRect().top + window.scrollY - navH - 20;

    window.scrollTo({ top, behavior: REDUCED ? 'auto' : 'smooth' });
    history.replaceState(null, '', href);

    // Move keyboard focus with the scroll, not just the viewport
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    setTimeout(() => target.focus({ preventScroll: true }), REDUCED ? 0 : 520);
  });
})();

/* ───────────────────────────────────────────
   Spotlight border on download cards
   ─────────────────────────────────────────── */
(function initSpotlight() {
  if (REDUCED || window.matchMedia('(hover: none)').matches) return;

  $$('.dl-item').forEach(card => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  // Same idea on the project frames, but the light tracks across the whole
  // row so it reaches the image even while the cursor is over the text.
  $$('.work-row').forEach(row => {
    const shot = $('.shot', row);
    if (!shot) return;
    row.addEventListener('pointermove', (e) => {
      const r = shot.getBoundingClientRect();
      shot.style.setProperty('--sx', `${((e.clientX - r.left) / r.width) * 100}%`);
      shot.style.setProperty('--sy', `${((e.clientY - r.top) / r.height) * 100}%`);
    });
  });
})();

/* ───────────────────────────────────────────
   Download filter
   ─────────────────────────────────────────── */
(function initFilter() {
  const buttons = $$('.dl-filter');
  const items = $$('.dl-item');
  const empty = $('#dlEmpty');
  if (!buttons.length || !items.length) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const want = btn.dataset.filter;

      buttons.forEach(b => {
        b.classList.toggle('is-on', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });

      let shown = 0;
      items.forEach(item => {
        const match = want === 'all' || item.dataset.plat === want;
        item.hidden = !match;
        if (match) shown++;
      });

      if (empty) empty.hidden = shown > 0;
    });
  });
})();

/* ───────────────────────────────────────────
   Download feedback — the file starts arriving
   in the browser's own download tray, so say so
   ─────────────────────────────────────────── */
(function initDownloadFeedback() {
  $$('.btn-dl').forEach(btn => {
    btn.addEventListener('click', () => {
      const label = btn.querySelector('.btn-dl-label');
      const name = btn.dataset.dl || 'File';
      if (!label) return;

      const original = label.textContent;
      btn.classList.add('is-working');
      label.textContent = 'Starting…';

      setTimeout(() => {
        label.textContent = 'Download started';
        toast(`${name} is downloading. Open it from your browser's downloads when it finishes.`, 5200);
      }, 700);

      setTimeout(() => {
        label.textContent = original;
        btn.classList.remove('is-working');
      }, 4200);
    });
  });
})();

/* ───────────────────────────────────────────
   Live download counts from GitHub Releases.
   Unauthenticated calls are rate-limited to 60/hour per IP, so the
   result is cached for the session and every failure stays silent —
   the cards read fine without the numbers.
   ─────────────────────────────────────────── */
(function initDownloadCounts() {
  const cells = $$('.dl-count');
  if (!cells.length) return;

  const API = 'https://api.github.com/repos/NashatShamsadyn7/app-downloads/releases';
  const CACHE_KEY = 'dl-counts-v1';
  const CACHE_MS = 30 * 60 * 1000;

  // A count only reassures once it is substantial. Below these thresholds the
  // numbers stay hidden rather than advertising that nobody has downloaded yet.
  const MIN_PER_APP = 25;
  const MIN_TOTAL = 100;

  const fmt = (n) => n.toLocaleString('en-US');

  function paint(counts) {
    let total = 0;
    cells.forEach(cell => {
      // data-count-assets lists every file name an app has shipped under
      const names = (cell.dataset.countAssets || cell.dataset.asset).split(',');
      const found = names.filter(name => typeof counts[name] === 'number');
      if (!found.length) return;
      const n = found.reduce((sum, name) => sum + counts[name], 0);
      total += n;
      if (n < MIN_PER_APP) return;
      cell.querySelector('b').textContent = fmt(n);
      cell.hidden = false;
    });

    const totalEl = $('#dlTotal');
    const totalNum = $('#dlTotalNum');
    if (total >= MIN_TOTAL && totalEl && totalNum) {
      totalNum.textContent = fmt(total);
      totalEl.hidden = false;
    }
  }

  function readCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const { at, counts } = JSON.parse(raw);
      return Date.now() - at < CACHE_MS ? counts : null;
    } catch { return null; }
  }

  const cached = readCache();
  if (cached) { paint(cached); return; }

  fetch(API, { headers: { Accept: 'application/vnd.github+json' } })
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(releases => {
      // Sum each asset name across every release, so older versions still count
      const counts = {};
      releases.forEach(rel => (rel.assets || []).forEach(a => {
        counts[a.name] = (counts[a.name] || 0) + a.download_count;
      }));
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), counts })); } catch {}
      paint(counts);
    })
    .catch(() => { /* offline or rate-limited — the cards stand on their own */ });
})();


/* ───────────────────────────────────────────
   Install tabs — with arrow-key support
   ─────────────────────────────────────────── */
(function initTabs() {
  const tabs = $$('.tab[role="tab"]');
  if (!tabs.length) return;

  function select(tab) {
    tabs.forEach(t => {
      const on = t === tab;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;

      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (!panel) return;
      panel.hidden = !on;
      panel.classList.toggle('is-on', on);
    });
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      let next = null;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft')  next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home')       next = tabs[0];
      if (e.key === 'End')        next = tabs[tabs.length - 1];
      if (!next) return;
      e.preventDefault();
      select(next);
      next.focus();
    });
  });
})();

/* Preselect the tab that matches the visitor's device */
(function guessPlatform() {
  const ua = navigator.userAgent || '';
  const androidTab = $('#tab-android');
  const windowsTab = $('#tab-windows');
  if (!androidTab || !windowsTab) return;

  const isAndroid = /Android/i.test(ua);
  const isWindows = /Windows NT/i.test(ua);
  if (isAndroid || !isWindows) return;

  windowsTab.click();
})();

/* ───────────────────────────────────────────
   Copy email
   ─────────────────────────────────────────── */
(function initCopy() {
  const btn = $('#copyMail');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const value = btn.dataset.copy || '';
    const label = btn.querySelector('span');

    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard API is blocked on insecure origins and in some browsers
      const helper = document.createElement('textarea');
      helper.value = value;
      helper.setAttribute('readonly', '');
      helper.style.cssText = 'position:fixed;top:-1000px;opacity:0;';
      document.body.appendChild(helper);
      helper.select();
      try {
        document.execCommand('copy');
      } catch {
        toast('Could not copy. The address is nashatgameryt17@gmail.com');
        helper.remove();
        return;
      }
      helper.remove();
    }

    btn.classList.add('is-done');
    if (label) label.textContent = 'Copied';
    toast('Email address copied.', 2400);

    setTimeout(() => {
      btn.classList.remove('is-done');
      if (label) label.textContent = 'Copy';
    }, 2400);
  });
})();

/* ───────────────────────────────────────────
   Contact form — validates, then hands off to
   the visitor's own mail client. Nothing is
   sent or stored by this site.
   ─────────────────────────────────────────── */
(function initForm() {
  const form = $('#contactForm');
  const note = $('#formNote');
  if (!form) return;

  const ADDRESS = 'nashatgameryt17@gmail.com';
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function fieldOf(input) { return input.closest('.field'); }

  function validate(input) {
    const value = input.value.trim();
    let ok = value.length > 0;
    if (ok && input.type === 'email') ok = EMAIL_RE.test(value);
    if (ok && input.id === 'f-msg') ok = value.length >= 10;

    const wrap = fieldOf(input);
    if (wrap) wrap.classList.toggle('is-bad', !ok);
    input.setAttribute('aria-invalid', String(!ok));
    return ok;
  }

  const inputs = $$('input, textarea', form);

  inputs.forEach(input => {
    input.addEventListener('blur', () => { if (input.value.trim()) validate(input); });
    input.addEventListener('input', () => {
      const wrap = fieldOf(input);
      if (wrap && wrap.classList.contains('is-bad')) validate(input);
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const results = inputs.map(validate);
    if (results.includes(false)) {
      const firstBad = inputs.find(i => fieldOf(i)?.classList.contains('is-bad'));
      firstBad?.focus();
      if (note) {
        note.textContent = 'Some fields still need filling in.';
        note.hidden = false;
      }
      return;
    }

    const name    = $('#f-name').value.trim();
    const email   = $('#f-mail').value.trim();
    const subject = $('#f-subj').value.trim();
    const message = $('#f-msg').value.trim();

    const body =
      `${message}\n\n` +
      `—\n` +
      `${name}\n` +
      `${email}\n` +
      `Sent from iosbb0.web.app`;

    const href =
      `mailto:${ADDRESS}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;

    window.location.href = href;

    if (note) {
      note.textContent = `Your mail app should be opening. If nothing happens, write to ${ADDRESS} directly.`;
      note.hidden = false;
    }
    toast('Opening your mail app.', 3600);
  });
})();

/* ───────────────────────────────────────────
   Back to top
   ─────────────────────────────────────────── */
(function initBackTop() {
  const btn = $('#backTop');
  if (!btn) return;

  const onScroll = rafThrottle(() => {
    btn.classList.toggle('is-shown', window.scrollY > 600);
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
  });
})();

/* ───────────────────────────────────────────
   Portrait fallback if the image is missing
   ─────────────────────────────────────────── */
(function initPortraitFallback() {
  const img = $('.portrait img');
  if (!img) return;
  img.addEventListener('error', () => {
    const frame = img.closest('.portrait');
    if (!frame) return;
    img.remove();
    frame.style.aspectRatio = '4 / 5';
    frame.style.background = 'radial-gradient(18rem 14rem at 50% 30%, rgba(215,169,75,.16), var(--ink-2) 70%)';
  });
})();

/* ───────────────────────────────────────────
   MOTION LAYER 2 — transmission
   Scroll progress bar + hero cursor spotlight.
   Both transform/opacity, both reduced-motion safe.
   ─────────────────────────────────────────── */
(function initProgress() {
  const bar = $('.progress');
  if (!bar) return;

  if (REDUCED) { bar.style.display = 'none'; return; }

  const update = rafThrottle(() => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const p = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    bar.style.transform = `scaleX(${p})`;
  });

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  update();
})();

(function initHeroSpotlight() {
  const hero = $('.hero');
  if (!hero) return;

  // Skip on touch / no-hover — the CSS spotlight only shows with a fine pointer.
  if (REDUCED || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty('--hx', `${((e.clientX - r.left) / r.width) * 100}%`);
    hero.style.setProperty('--hy', `${((e.clientY - r.top) / r.height) * 100}%`);
  }, { passive: true });
})();

/* ───────────────────────────────────────────
   Light / dark theme toggle.
   Choice persists; before that, follows the OS.
   ─────────────────────────────────────────── */
(function initThemeToggle() {
  const btn = $('#themeToggle');
  const root = document.documentElement;
  if (!btn) return;

  function apply(theme, animate) {
    if (animate && !REDUCED) {
      root.classList.add('theme-anim');
      setTimeout(() => root.classList.remove('theme-anim'), 550);
    }
    if (theme === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
    btn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
  }

  btn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('nas-theme', next); } catch {}
    apply(next, true);
  });

  // Follow the OS only while the visitor has not chosen explicitly
  let chosen = false;
  try { chosen = !!localStorage.getItem('nas-theme'); } catch {}
  if (!chosen && window.matchMedia('(prefers-color-scheme: light)').addEventListener) {
    window.matchMedia('(prefers-color-scheme: light)')
      .addEventListener('change', (e) => apply(e.matches ? 'light' : 'dark', false));
  }
})();

/* ───────────────────────────────────────────
   Magnetic primary buttons — glide toward the
   cursor inside their halo, spring back on leave.
   ─────────────────────────────────────────── */
(function initMagneticCTA() {
  if (REDUCED || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  $$('.btn-solid').forEach((btn) => {
    let raf = null;
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        btn.style.transform = `translate(${(dx * 0.16).toFixed(1)}px, ${(dy * 0.26).toFixed(1)}px)`;
      });
    });
    btn.addEventListener('pointerleave', () => {
      if (raf) cancelAnimationFrame(raf);
      btn.style.transform = '';
    });
  });
})();

/* ───────────────────────────────────────────
   Brass cursor trail — seven fading dots that
   chase the pointer with easing. Hidden until the
   pointer first moves and whenever it leaves.
   ─────────────────────────────────────────── */
(function initCursorTrail() {
  if (REDUCED || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const COUNT = 7;
  const dots = [];
  for (let i = 0; i < COUNT; i++) {
    const el = document.createElement('span');
    el.className = 'trail-dot';
    el.style.opacity = (1 - i / (COUNT + 1)).toFixed(2);
    el.style.visibility = 'hidden';
    document.body.appendChild(el);
    dots.push({ el, x: -100, y: -100, s: +(1 - i * 0.09).toFixed(2) });
  }

  let mx = -100, my = -100;
  addEventListener('pointermove', (e) => {
    mx = e.clientX; my = e.clientY;
    dots.forEach((d) => { d.el.style.visibility = 'visible'; });
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => {
    dots.forEach((d) => { d.el.style.visibility = 'hidden'; });
  });

  (function frame() {
    let tx = mx, ty = my;
    for (const d of dots) {
      d.x += (tx - d.x) * 0.3;
      d.y += (ty - d.y) * 0.3;
      tx = d.x; ty = d.y;
      d.el.style.transform = `translate(${(d.x - 3.5).toFixed(1)}px, ${(d.y - 3.5).toFixed(1)}px) scale(${d.s})`;
    }
    requestAnimationFrame(frame);
  })();
})();

/* ───────────────────────────────────────────
   Live sync of hero card, work chips, download
   section and JSON-LD from GitHub Releases.
   Same endpoint the download-counter uses; one
   cached call, every failure stays silent.
   ─────────────────────────────────────────── */
(function initLiveSync() {
  const API = 'https://api.github.com/repos/NashatShamsadyn7/app-downloads/releases';
  const KEY = 'dl-meta-v2';
  const MS = 30 * 60 * 1000;

  const fmtMB = (b) => `${(b / (1024 * 1024)).toFixed(1)} MB`;

  // Asset name → friendly display info for the hero card
  const HERO_INFO = {
    'Islamic-Nashat.apk': { name: 'Islamic Nashat', platform: 'Android', build: 'signed release build' },
    'Nashat-TV.apk': { name: 'Nashat TV', platform: 'Android TV', build: 'signed release build' },
    'Nashat-TV-Setup-1.5.6.exe': { name: 'Nashat TV — Desktop', platform: 'Windows', build: 'NSIS installer' },
    'IslamicNashatWidget.exe': { name: 'Prayer Widget', platform: 'Windows', build: 'portable EXE' },
    'SpeechFlow-Setup.exe': { name: 'SpeechFlow', platform: 'Windows', build: 'setup installer' },
    'Domina-Score-Counter.apk': { name: 'Domina', platform: 'Android', build: 'signed debug build' },
    'Saxtakar-Imposter.apk': { name: 'Sakhtakar', platform: 'Android', build: 'signed release build' },
  };

  // Extract version from asset filename (e.g. "NashatVPN-Setup-1.6.0.exe" → "1.6.0")
  function verFromName(name) {
    const m = /(\d+\.\d+\.\d+|\d+\.\d+)(?=\.(apk|exe)$)/i.exec(name);
    return m ? m[1] : null;
  }

  // Extract version from release name (e.g. "Nashat TV v1.6 (2026-09-10)" → "1.6")
  function verFromReleaseName(name) {
    if (!name) return null;
    const m = /v(\d+\.\d+(?:\.\d+)?)/i.exec(name);
    return m ? m[1] : null;
  }

  function paint(meta) {
    // ── 1. Hero card — newest release ──
    if (meta.newest) {
      const n = meta.newest;
      const nameEl = $('#heroLatestName');
      const metaEl = $('#heroLatestMeta');
      if (nameEl) nameEl.textContent = n.appName;
      if (metaEl) metaEl.textContent = `${n.platform} · ${n.size} · ${n.build}`;
    }

    // ── 2. Work section chips — version + size ──
    $$('[data-ver-for]').forEach(el => {
      const key = el.dataset.verFor;
      const v = meta.versions[key];
      if (v) el.textContent = `v${v}`;
    });
    $$('[data-size-for]').forEach(el => {
      const key = el.dataset.sizeFor;
      const bytes = meta.sizes[key];
      if (typeof bytes === 'number' && bytes > 0) el.textContent = fmtMB(bytes);
    });

    // ── 3. Download section — size + version + link upgrade ──
    $$('.dl-item').forEach((card) => {
      const anchor = $('.dl-count', card);
      const asset = anchor && anchor.dataset.asset;

      // Size
      const bytes = asset && meta.sizes ? meta.sizes[asset] : undefined;
      if (typeof bytes === 'number' && bytes > 0) {
        const txt = fmtMB(bytes);
        const sizeEl = $('.dl-size b', card);
        if (sizeEl) sizeEl.textContent = txt;
        const btnSize = $('.btn-dl-size', card);
        if (btnSize && !btnSize.dataset.user) btnSize.textContent = txt;
      }

      // Version (for non-VPN assets that have version in filename)
      if (asset) {
        const verEl = $('.dl-version b', card);
        const v = meta.versions[asset];
        if (verEl && v) verEl.textContent = v;
      }

      // Link upgrade — each button follows the newest release that
      // contains its exact asset name
      const tag = asset && meta.links ? meta.links[asset] : undefined;
      const btn = $('.btn-dl', card);
      if (asset && tag && btn) {
        btn.href = `https://github.com/NashatShamsadyn7/app-downloads/releases/download/${tag}/${asset}`;
      }
    });

    // VPN version + download link follow the newest Setup asset
    if (meta.vpnVersion) {
      const vpnBytes = meta.sizes[`NashatVPN-Setup-${meta.vpnVersion}.exe`];
      $$('[data-vpn-ver]').forEach(el => { el.textContent = `v${meta.vpnVersion}`; });
      if (typeof vpnBytes === 'number' && vpnBytes > 0) {
        $$('[data-size-for^="NashatVPN-Setup-"]').forEach(el => { el.textContent = fmtMB(vpnBytes); });
      }
      const vpnCard = $('.dl-count[data-asset^="NashatVPN"]');
      if (vpnCard) {
        const card = vpnCard.closest('.dl-item');
        const verEl = $('.dl-version b', card);
        if (verEl && verEl.textContent !== meta.vpnVersion) {
          verEl.textContent = meta.vpnVersion;
          const btn = $('.btn-dl', card);
          if (btn) {
            btn.href = `https://github.com/NashatShamsadyn7/app-downloads/releases/download/${meta.vpnTag || 'v2026.08.04'}/NashatVPN-Setup-${meta.vpnVersion}.exe`;
          }
        }
      }
    }

    // ── 4. JSON-LD structured data ──
    if (meta.jsonld) {
      const script = $('#jsonld-data');
      if (script) script.textContent = JSON.stringify(meta.jsonld, null, 2);
    }
  }

  function readCache() {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) return null;
      const { at, meta } = JSON.parse(raw);
      return Date.now() - at < MS ? meta : null;
    } catch { return null; }
  }

  const cached = readCache();
  if (cached) { paint(cached); return; }

  fetch(API, { headers: { Accept: 'application/vnd.github+json' } })
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then((releases) => {
      const meta = { sizes: {}, links: {}, versions: {}, newest: null, jsonld: null };
      let newestRelease = null;

      releases.forEach(rel => (rel.assets || []).forEach(a => {
        // Size: newest release wins (API returns newest first)
        if (meta.sizes[a.name] === undefined) meta.sizes[a.name] = a.size;
        // Link: newest release that has this asset
        if (!meta.links[a.name]) meta.links[a.name] = rel.tag_name;
        // Version from filename
        const v = verFromName(a.name);
        if (v && !meta.versions[a.name]) meta.versions[a.name] = v;

        // Track newest release (by published_at) for hero card
        const pub = new Date(rel.published_at || 0).getTime();
        if (!newestRelease || pub > newestRelease.at) {
          newestRelease = { at: pub, tag: rel.tag_name, relName: rel.name, asset: a };
        }
      }));

      // Build newest release info for hero card
      if (newestRelease) {
        const a = newestRelease.asset;
        const info = HERO_INFO[a.name] || {};
        // Try to extract version from release name or filename
        const ver = verFromReleaseName(newestRelease.relName) || verFromName(a.name);
        const baseName = info.name || newestRelease.relName || a.name;
        meta.newest = {
          appName: ver ? `${baseName} v${ver}` : baseName,
          platform: info.platform || (a.name.endsWith('.exe') ? 'Windows' : 'Android'),
          size: fmtMB(a.size),
          build: info.build || (a.name.endsWith('.exe') ? 'installer' : 'signed release build'),
        };
      }

      // VPN version — newest Setup asset by published date
      let newestVpn = null;
      releases.forEach(rel => (rel.assets || []).forEach(a => {
        const m = /^NashatVPN-Setup-(\d+)\.(\d+)\.(\d+)\.exe$/.exec(a.name);
        if (m) {
          const published = new Date(rel.published_at || 0).getTime();
          const ver = [+m[1], +m[2], +m[3]];
          const better = !newestVpn ||
            published > newestVpn.at ||
            (published === newestVpn.at &&
              (ver[0] > newestVpn.ver[0] ||
               (ver[0] === newestVpn.ver[0] && ver[1] > newestVpn.ver[1]) ||
               (ver[0] === newestVpn.ver[0] && ver[1] === newestVpn.ver[1] && ver[2] > newestVpn.ver[2])));
          if (better) newestVpn = { at: published, ver, version: `${m[1]}.${m[2]}.${m[3]}`, tag: rel.tag_name };
        }
      }));
      if (newestVpn) { meta.vpnVersion = newestVpn.version; meta.vpnTag = newestVpn.tag; }

      // Build JSON-LD
      meta.jsonld = buildJsonLd(releases, meta);

      try { sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), meta })); } catch {}
      paint(meta);
    })
    .catch(() => { /* offline / rate-limited — the static values stand */ });

  function buildJsonLd(releases, meta) {
    const script = $('#jsonld-data');
    if (!script) return null;
    let jsonld;
    try {
      jsonld = JSON.parse(script.textContent);
    } catch { return null; }

    // Map app name → primary asset name
    const nameToAsset = {
      'Islamic Nashat': 'Islamic-Nashat.apk',
      'Nashat TV': 'app-release.apk',
      'Nashat TV — Desktop': 'Nashat-TV-Setup-1.5.6.exe',
      'Islamic Nashat — Prayer Widget': 'IslamicNashatWidget.exe',
      'SpeechFlow': 'SpeechFlow-Setup.exe',
      'Domina — Score Counter': 'Domina-Score-Counter.apk',
      'Nashat VPN': 'NashatVPN-Setup-1.6.0.exe',
    };

    jsonld['@graph'].forEach(node => {
      if (node['@type'] !== 'SoftwareApplication') return;
      const assetName = nameToAsset[node.name];
      if (!assetName) return;

      // Update version
      const ver = meta.versions[assetName];
      if (ver) node.softwareVersion = ver;

      // Update file size
      const bytes = meta.sizes[assetName];
      if (typeof bytes === 'number' && bytes > 0) node.fileSize = fmtMB(bytes);

      // Update download URL to newest release that has this asset
      const tag = meta.links[assetName];
      if (tag) node.downloadUrl = `https://github.com/NashatShamsadyn7/app-downloads/releases/download/${tag}/${assetName}`;
    });

    return jsonld;
  }
})();

/* ───────────────────────────────────────────
   Screenshot lightbox — click any app shot for a
   fullscreen view. Esc / ← / → keyboard support,
   focus restored on close.
   ─────────────────────────────────────────── */
(function initLightbox() {
  const shots = $$('.shot img, .vpn-shot');
  if (!shots.length) return;

  const box = document.createElement('div');
  box.className = 'lightbox';
  box.id = 'lightbox';
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Screenshot viewer');
  box.innerHTML =
    '<button class="lb-btn lb-close" aria-label="Close">&#215;</button>' +
    '<button class="lb-btn lb-prev" aria-label="Previous screenshot">&#8249;</button>' +
    '<figure><img alt=""><figcaption></figcaption></figure>' +
    '<button class="lb-btn lb-next" aria-label="Next screenshot">&#8250;</button>';
  document.body.appendChild(box);

  const img = $('img', box);
  const cap = $('figcaption', box);
  let idx = 0;
  let lastFocus = null;

  function show(i) {
    idx = (i + shots.length) % shots.length;
    const src = shots[idx];
    img.src = src.currentSrc || src.src;
    img.alt = src.alt || '';
    cap.textContent = src.alt || '';
  }
  function open(i) {
    lastFocus = document.activeElement;
    show(i);
    box.hidden = false;
    document.body.style.overflow = 'hidden';
    $('.lb-close', box).focus();
  }
  function close() {
    box.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  shots.forEach((el, i) => {
    el.classList.add('is-zoomable');
    el.closest('.shot, .work-visual')?.addEventListener('click', (e) => {
      // Don't hijack clicks on links that may wrap the visual
      if (e.target.closest('a')) return;
      open(i);
    });
  });
  // The bare VPN shot has no wrapper link — its own click opens directly
  // via the delegated handler above (closest('.work-visual')).

  $('.lb-close', box).addEventListener('click', close);
  $('.lb-prev', box).addEventListener('click', () => show(idx - 1));
  $('.lb-next', box).addEventListener('click', () => show(idx + 1));
  box.addEventListener('click', (e) => { if (e.target === box) close(); });
  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });
})();

/* ───────────────────────────────────────────
   PWA service worker (HTTPS only — never on
   localhost or plain http, where it errors).
   ─────────────────────────────────────────── */
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
