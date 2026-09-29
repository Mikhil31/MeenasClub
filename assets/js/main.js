(function () {
  var doc = document.documentElement;
  doc.classList.remove('no-js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  // Lite mode for low-end phones / data saver: same look, no expensive paint effects
  var conn = navigator.connection || {};
  var lite = !!(conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '') ||
    (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
    (!fine && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4));
  if (lite) doc.classList.add('lite');
  // Scroll-scrubbed motion (GSAP + Lenis) is a desktop extra, loaded after the page is up
  var rich = fine && !lite && !reduce;
  var hasIO = 'IntersectionObserver' in window;
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  function onView(els, fn, margin) {
    if (!hasIO) { els.forEach(fn); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { io.unobserve(en.target); fn(en.target); } });
    }, { rootMargin: margin || '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ── Image options preview (set from /options/) ── */
  var OPT_KEY = 'mm-image-options';
  var overrides = {};
  try { overrides = JSON.parse(localStorage.getItem(OPT_KEY) || '{}'); } catch (e) {}
  var base = document.body.getAttribute('data-base') || '';
  Object.keys(overrides).forEach(function (slot) {
    var src = base + 'assets/img/options/' + overrides[slot];
    $$('[data-slot="' + slot + '"]').forEach(function (el) {
      if (el.tagName === 'IMG') {
        if (el.parentNode.tagName === 'PICTURE') el.parentNode.querySelectorAll('source').forEach(function (s) { s.remove(); });
        el.src = src;
      } else el.setAttribute('data-bg', src);
    });
  });
  if (Object.keys(overrides).length && !document.body.hasAttribute('data-options-page')) {
    var bar = document.createElement('div');
    bar.className = 'opt-bar';
    bar.innerHTML = '<span>Previewing ' + Object.keys(overrides).length + ' image option(s)</span><a href="' + base + 'options/">Edit</a><button type="button">Reset</button>';
    bar.querySelector('button').addEventListener('click', function () {
      try { localStorage.removeItem(OPT_KEY); } catch (e) {}
      location.reload();
    });
    document.body.appendChild(bar);
  }

  /* ── Image-filled text: load its picture only when it's near the screen ── */
  onView($$('[data-bg]'), function (el) {
    el.style.backgroundImage = 'url("' + el.getAttribute('data-bg') + '")';
    el.removeAttribute('data-bg');
  }, '600px 0px');

  /* ── Header: transparent at top, solid after, hides on the way down ── */
  var hdr = document.querySelector('.hdr');
  var lastY = 0, ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY;
    hdr.classList.toggle('is-top', y < 40);
    hdr.classList.toggle('is-solid', y >= 40);
    if (!doc.classList.contains('menu-open')) hdr.classList.toggle('is-hidden', y > lastY && y > 400);
    lastY = y;
  }
  if (hdr) {
    requestAnimationFrame(onScroll); // first read after initial layout, not during it
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  }

  /* ── Menu overlay ── */
  var menuBtn = document.querySelector('.menu-btn');
  var lenis = null;
  function setMenu(open) {
    doc.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.querySelector('span').textContent = open ? 'Close' : 'Menu';
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
  }
  if (menuBtn) {
    menuBtn.addEventListener('click', function () { setMenu(!doc.classList.contains('menu-open')); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && doc.classList.contains('menu-open')) setMenu(false); });
  }

  /* ── Block reveals ── */
  if (reduce) $$('.reveal').forEach(function (el) { el.classList.add('in'); });
  else onView($$('.reveal'), function (el) { el.classList.add('in'); });

  /* ── Headings rise word by word (CSS transitions, once) ── */
  if (!reduce) {
    $$('[data-split]').forEach(function (el) {
      var n = 0;
      (function split(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (c) {
          var w, i;
          if (c.nodeType === 3) {
            var frag = document.createDocumentFragment();
            c.textContent.split(/(\s+)/).forEach(function (part) {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
              w = document.createElement('span'); w.className = 'w';
              i = document.createElement('span'); i.textContent = part; i.style.setProperty('--i', n++);
              w.appendChild(i); frag.appendChild(w);
            });
            c.parentNode.replaceChild(frag, c);
          } else if (c.nodeType === 1 && c.tagName === 'SUP') {
            w = document.createElement('span'); w.className = 'w';
            i = document.createElement('span'); i.style.setProperty('--i', n++);
            c.parentNode.insertBefore(w, c); w.appendChild(i); i.appendChild(c);
          } else if (c.nodeType === 1) split(c);
        });
      })(el);
      el.classList.add('is-split');
    });
    var heroH = $$('.hero [data-split], .phero [data-split]');
    requestAnimationFrame(function () { setTimeout(function () { heroH.forEach(function (el) { el.classList.add('in'); }); }, 120); });
    onView($$('[data-split]').filter(function (el) { return heroH.indexOf(el) < 0; }), function (el) { el.classList.add('in'); });
  }

  /* ── Counters ── */
  onView($$('[data-count]'), function (el) {
    var end = parseFloat(el.getAttribute('data-count'));
    var pad = el.getAttribute('data-pad') | 0;
    var suffix = el.getAttribute('data-suffix') || '';
    var fmt = function (v) { var s = Math.round(v).toLocaleString('en-IN'); while (s.length < pad) s = '0' + s; return s + suffix; };
    if (reduce) { el.textContent = fmt(end); return; }
    var t0 = performance.now(), dur = 1600;
    (function tick() {
      var p = Math.min(1, (performance.now() - t0) / dur);
      el.textContent = fmt(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    })();
  });

  /* ── Cities accordion ── */
  $$('.flick').forEach(function (fl) {
    var cards = fl.querySelectorAll('.flick__item');
    function activate(c) { cards.forEach(function (x) { x.classList.toggle('is-active', x === c); }); }
    cards.forEach(function (c) {
      c.addEventListener('mouseenter', function () { if (fine) activate(c); });
      c.addEventListener('focus', function () { activate(c); });
      c.addEventListener('click', function (e) {
        if (!c.classList.contains('is-active') && !fine && window.innerWidth > 820) { e.preventDefault(); activate(c); }
      });
    });
  });

  /* ── Membership filter ── */
  var chips = $$('.chip');
  var rows = $$('#fees tbody tr');
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      chips.forEach(function (x) { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); });
      c.classList.add('on');
      c.setAttribute('aria-pressed', 'true');
      var f = c.getAttribute('data-f');
      rows.forEach(function (r) { r.hidden = !(f === 'all' || r.getAttribute('data-cat') === f); });
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  });

  /* ── Enquiry form → email app ── */
  var form = document.getElementById('enquire');
  if (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var ok = true;
      ['name', 'email', 'phone'].forEach(function (n) {
        var f = form.elements[n];
        var bad = !f.value.trim() || (n === 'email' && !/^\S+@\S+\.\S+$/.test(f.value));
        f.classList.toggle('bad', bad);
        if (bad) ok = false;
      });
      if (!ok) return;
      var v = function (n) { return form.elements[n].value.trim(); };
      var body = 'Name: ' + v('name') + '\nEmail: ' + v('email') + '\nPhone: ' + v('phone') +
        '\nCity: ' + v('city') + '\nMembership of interest: ' + v('tier') + '\n\n' + v('msg');
      location.href = 'mailto:secretarymmclub@gmail.com?subject=' +
        encodeURIComponent('Membership enquiry — ' + v('name')) + '&body=' + encodeURIComponent(body);
    });
  }

  /* ── Newsletter → email app (no backend) ── */
  $$('.news').forEach(function (n) {
    n.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var em = n.querySelector('input').value.trim();
      if (!/^\S+@\S+\.\S+$/.test(em)) { n.querySelector('input').focus(); return; }
      location.href = 'mailto:secretarymmclub@gmail.com?subject=' + encodeURIComponent('Keep me posted') +
        '&body=' + encodeURIComponent('Please add ' + em + ' to the Club mailing list.');
    });
  });

  /* ── Custom cursor for [data-cursor] sections (White Desert) ── */
  if (fine && !reduce) {
    var zones = $$('[data-cursor]');
    if (zones.length) {
      var cur = document.createElement('div');
      cur.className = 'cursor';
      cur.setAttribute('aria-hidden', 'true');
      cur.innerHTML = '<i class="cursor__x"></i><i class="cursor__y"></i><i class="cursor__dot"></i><span class="cursor__label"></span>';
      document.body.appendChild(cur);
      var label = cur.querySelector('.cursor__label');
      var tx = 0, ty = 0, cx = 0, cy = 0, on = false;
      var show = function (v) { on = v; cur.classList.toggle('is-on', v); };
      (function loop() {
        if (on) {
          cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
          cur.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
        }
        requestAnimationFrame(loop);
      })();
      window.addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
      // scrolling moves sections under a still pointer without firing pointerleave
      window.addEventListener('scroll', function () {
        var el = document.elementFromPoint(tx, ty);
        show(!!(el && el.closest('[data-cursor]')));
      }, { passive: true });
      zones.forEach(function (z) {
        z.addEventListener('pointerenter', function (e) { cx = tx = e.clientX; cy = ty = e.clientY; show(true); });
        z.addEventListener('pointerleave', function () { show(false); });
        z.addEventListener('pointerover', function (e) {
          var t = e.target.closest('[data-cursor-label]');
          label.textContent = t ? t.getAttribute('data-cursor-label') : z.getAttribute('data-cursor');
          cur.classList.toggle('is-link', !!e.target.closest('a'));
        });
      });
    }
  }

  /* ─────────────── Desktop extras: smooth scroll + scroll-scrubbed motion ─────────────── */
  if (!rich) return;
  var LIBS = [
    'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js',
    'https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js'
  ];
  function load(i) {
    if (i === LIBS.length) { enhance(); return; }
    var s = document.createElement('script');
    s.src = LIBS[i];
    s.onload = function () { load(i + 1); };
    document.head.appendChild(s);
  }
  function start() {
    if (window.requestIdleCallback) requestIdleCallback(function () { load(0); }, { timeout: 1500 });
    else setTimeout(function () { load(0); }, 300);
  }
  if (document.readyState === 'complete') start(); else window.addEventListener('load', start);

  function enhance() {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    if (window.Lenis) {
      lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.95 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
      $$('a[href*="#"]').forEach(function (a) {
        a.addEventListener('click', function (e) {
          var url = new URL(a.href, location.href);
          if (url.pathname !== location.pathname || !url.hash) return;
          var target = document.querySelector(url.hash);
          if (!target) return;
          e.preventDefault();
          if (doc.classList.contains('menu-open')) setMenu(false);
          lenis.scrollTo(target, { offset: -90 });
          history.replaceState(null, '', url.hash);
        });
      });
    }

    /* statement: words brighten as you read */
    $$('[data-scrub]').forEach(function (el) {
      var targets = [];
      (function wrap(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            var frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(function (part) {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
              var s = document.createElement('span'); s.textContent = part;
              targets.push(s); frag.appendChild(s);
            });
            n.parentNode.replaceChild(frag, n);
          } else if (n.nodeType === 1) {
            if (n.classList.contains('imgtext')) targets.push(n); else wrap(n);
          }
        });
      })(el);
      gsap.fromTo(targets, { opacity: 0.25 }, {
        opacity: 1, stagger: 0.08, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: 0.6 }
      });
    });

    /* hero images drift slower than the page */
    $$('.hero__media img').forEach(function (img) {
      gsap.to(img, { yPercent: 14, ease: 'none', scrollTrigger: { trigger: img.closest('section'), start: 'top top', end: 'bottom top', scrub: true } });
    });
    /* images inside frames drift within their crop */
    $$('[data-parallax]').forEach(function (fr) {
      var img = fr.querySelector('img');
      if (img) gsap.fromTo(img, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: fr, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    /* collage pieces move at their own speeds while the text column holds */
    $$('[data-speed]').forEach(function (el) {
      var s = parseFloat(el.getAttribute('data-speed'));
      gsap.fromTo(el, { yPercent: 0 }, { yPercent: -s * 100, ease: 'none', scrollTrigger: { trigger: el.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    /* image-filled text: the picture inside the letters slides as you scroll */
    $$('.imgtext[data-drift]').forEach(function (el) {
      gsap.fromTo(el, { '--py': '0%' }, { '--py': '100%', ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    ScrollTrigger.refresh();
  }
})();
