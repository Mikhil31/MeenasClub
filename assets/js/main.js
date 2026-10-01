(function () {
  var doc = document.documentElement;
  doc.classList.remove('no-js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  // Lite mode only for genuinely weak phones / data saver: same look and the same animations, minus blur and repaint-heavy effects
  var conn = navigator.connection || {};
  var lite = !!(conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '') ||
    (navigator.deviceMemory && navigator.deviceMemory <= 2));
  if (lite) doc.classList.add('lite');
  if (!fine) doc.classList.add('touch');
  // Smooth wheel scrolling (Lenis) is a desktop extra; scroll-linked motion runs on every device
  var smooth = fine && !lite && !reduce;
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

  /* ── Block reveals (reduced motion: CSS turns these into a plain fade) ── */
  onView($$('.reveal'), function (el) { el.classList.add('in'); });

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
        if (!c.classList.contains('is-active') && !fine && window.innerWidth > 820) { e.preventDefault(); stop(); activate(c); }
      });
    });
    // no hover on touch screens: wide (tablet) accordions step through the cities on their own until tapped
    var timer = null;
    function stop() { clearInterval(timer); timer = null; }
    if (!fine && !reduce) onView([fl], function () {
      if (window.innerWidth <= 820) return;
      var i = 0;
      timer = setInterval(function () { i = (i + 1) % cards.length; activate(cards[i]); }, 3200);
    });
    onView([fl], function () { fl.classList.add('in'); });
  });

  /* ── Core values: touch screens light the words up in turn (desktop: hover) ── */
  $$('.values').forEach(function (v) {
    if (fine || reduce) return;
    var words = v.querySelectorAll('.imgtext');
    onView([v], function () {
      var i = 0;
      setInterval(function () {
        words.forEach(function (w, k) { w.classList.toggle('is-lit', k === i); });
        i = (i + 1) % words.length;
      }, 1500);
    });
  });

  /* ── Terms contents: open beside the text on wide screens, folded away on phones ── */
  $$('.toc').forEach(function (t) { if (window.innerWidth <= 900) t.removeAttribute('open'); });

  /* ── Dolphins leaping out of the sea (Lottie): the player loads only when the section is near the screen,
        the leap repeats after a short pause, and everything stops while it's off-screen ── */
  $$('[data-sea]').forEach(function (sea) {
    var base = sea.getAttribute('data-sea'), started = false;
    function go() {
      if (started) return; started = true;
      var sc = document.createElement('script');
      sc.src = base.replace('anim/', 'js/vendor/lottie_light.min.js');
      sc.onload = function () {
        if (!window.lottie) return;
        var waves = lottie.loadAnimation({ container: sea.querySelector('.sea__waves'), renderer: 'svg', loop: true, autoplay: !reduce,
          path: base + 'sea.json', rendererSettings: { preserveAspectRatio: 'none' } });
        var dol = lottie.loadAnimation({ container: sea.querySelector('.sea__dolphins'), renderer: 'svg', loop: false, autoplay: false,
          path: base + 'dolphins.json', rendererSettings: { preserveAspectRatio: 'xMidYMax meet' } });
        // draw at the files' own 25–30 fps instead of every screen refresh: half the work on cheap phones
        waves.setSubframe(false); dol.setSubframe(false);
        var timer = null, visible = true, dEl = sea.querySelector('.sea__dolphins');
        // frames 0–2 and 44+ are just a fin tip at the water line, so play the middle and hide the pod between leaps;
        // meanwhile the pod swims right to left across the section (CSS), so each leap lands further along
        function leap() { timer = null; if (!visible) return; dEl.classList.add('is-leaping'); dol.playSegments([3, 43], true); }
        dol.addEventListener('complete', function () { dEl.classList.remove('is-leaping'); if (visible) timer = setTimeout(leap, 450); });
        dol.addEventListener('DOMLoaded', function () {
          sea.classList.add('is-on');
          if (reduce) { dEl.classList.add('is-leaping'); dol.goToAndStop(22, true); } else leap();
        });
        if (reduce) return;
        if (hasIO) new IntersectionObserver(function (en) {
          visible = en[0].isIntersecting;
          sea.classList.toggle('is-paused', !visible);
          if (visible) { waves.play(); if (!timer && dol.isPaused) leap(); }
          else { waves.pause(); dol.pause(); clearTimeout(timer); timer = null; }
        }).observe(sea);
      };
      document.head.appendChild(sc);
    }
    if (hasIO) onView([sea], go, '800px 0px'); else go();
  });

  /* ── Print button (Terms page) ── */
  $$('[data-print]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });

  /* ── Gallery: album filter + lightbox (tap, arrows, swipe, Esc) ── */
  var gal = document.querySelector('.gal');
  if (gal) {
    var gchips = $$('.gchip'), gitems = $$('.gal__item');
    gchips.forEach(function (c) {
      c.addEventListener('click', function () {
        gchips.forEach(function (x) { x.classList.toggle('on', x === c); x.setAttribute('aria-pressed', x === c); });
        var f = c.getAttribute('data-album');
        gitems.forEach(function (it) { it.hidden = !(f === 'all' || it.getAttribute('data-album') === f); });
      });
    });
    var lb = document.createElement('div');
    lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Photo viewer');
    lb.innerHTML = '<button class="lb__x" type="button" aria-label="Close">\u00d7</button><button class="lb__nav lb__prev" type="button" aria-label="Previous photo">\u2039</button>' +
      '<figure><img alt=""><figcaption></figcaption></figure><button class="lb__nav lb__next" type="button" aria-label="Next photo">\u203a</button>';
    document.body.appendChild(lb);
    var lbImg = lb.querySelector('img'), lbCap = lb.querySelector('figcaption'), cur = 0, lastFocus = null;
    function shown() { return gitems.filter(function (it) { return !it.hidden; }); }
    function openAt(i) {
      var list = shown(); cur = (i + list.length) % list.length;
      var it = list[cur];
      lbImg.src = it.getAttribute('href'); lbImg.alt = it.querySelector('img').alt;
      lbCap.textContent = it.getAttribute('data-caption') + '  \u00b7  ' + (cur + 1) + ' / ' + list.length;
      lb.classList.add('is-open'); doc.classList.add('lb-open');
      if (lenis) lenis.stop();
    }
    function close() { lb.classList.remove('is-open'); doc.classList.remove('lb-open'); if (lenis) lenis.start(); if (lastFocus) lastFocus.focus(); }
    gitems.forEach(function (it) {
      it.addEventListener('click', function (e) { e.preventDefault(); lastFocus = it; openAt(shown().indexOf(it)); lb.querySelector('.lb__x').focus(); });
    });
    lb.querySelector('.lb__x').addEventListener('click', close);
    lb.querySelector('.lb__prev').addEventListener('click', function () { openAt(cur - 1); });
    lb.querySelector('.lb__next').addEventListener('click', function () { openAt(cur + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.tagName === 'FIGURE') close(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') openAt(cur - 1);
      else if (e.key === 'ArrowRight') openAt(cur + 1);
    });
    var sx = null;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 45) openAt(cur + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

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
    });
  });

  /* ── Styled dropdowns for the enquiry form. The native <select> stays in the form (hidden) and keeps the value,
        so the email still gets it; this draws a grouped list with fees, keyboard support, and a bottom sheet on phones ── */
  var CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  $$('select[data-fancy]').forEach(function (sel, n) {
    var wrap = document.createElement('div');
    wrap.className = 'fsel';
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.classList.add('fsel__native'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
    var lblId = sel.getAttribute('aria-labelledby'), title = lblId ? document.getElementById(lblId).textContent : '';
    var listId = 'fsel-' + n;
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'fsel__btn';
    btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', listId);
    if (lblId) btn.setAttribute('aria-labelledby', lblId + ' ' + listId + '-v');
    btn.innerHTML = '<span class="fsel__val" id="' + listId + '-v"></span><span class="fsel__amt"></span><i aria-hidden="true"></i>';
    var pop = document.createElement('div');
    pop.className = 'fsel__pop';
    pop.innerHTML = '<div class="fsel__head"><b>' + title + '</b><button type="button" class="fsel__x" aria-label="Close">×</button></div>';
    var list = document.createElement('ul');
    list.className = 'fsel__list'; list.id = listId; list.tabIndex = -1;
    list.setAttribute('role', 'listbox'); if (lblId) list.setAttribute('aria-labelledby', lblId);
    var scrim = document.createElement('div'); scrim.className = 'fsel__scrim';
    var items = [];
    Array.prototype.slice.call(sel.children).forEach(function (c) {
      var opts = c.tagName === 'OPTGROUP' ? c.children : [c];
      if (c.tagName === 'OPTGROUP') {
        var g = document.createElement('li'); g.className = 'fsel__grp'; g.setAttribute('role', 'presentation');
        g.textContent = c.label; list.appendChild(g);
      }
      Array.prototype.slice.call(opts).forEach(function (o) {
        var li = document.createElement('li');
        li.className = 'fsel__opt'; li.id = listId + '-' + items.length; li.setAttribute('role', 'option');
        var amt = o.getAttribute('data-amt') || '';
        li.innerHTML = '<span>' + o.innerHTML + '</span>' + (amt ? '<small>' + amt + '</small>' : '') + CHECK;
        li.addEventListener('click', function () { choose(items.indexOf(li)); close(true); });
        li.addEventListener('mousemove', function () { focusItem(items.indexOf(li), false); });
        list.appendChild(li); items.push(li);
      });
    });
    pop.appendChild(list);
    wrap.appendChild(btn); wrap.appendChild(pop); wrap.appendChild(scrim);
    var opts = sel.options, active = 0;

    function paint() {
      var o = opts[sel.selectedIndex] || opts[0];
      btn.querySelector('.fsel__val').innerHTML = o.innerHTML;
      btn.querySelector('.fsel__amt').textContent = o.getAttribute('data-amt') || '';
      items.forEach(function (li, i) { li.setAttribute('aria-selected', i === sel.selectedIndex ? 'true' : 'false'); });
    }
    function focusItem(i, scroll) {
      active = Math.max(0, Math.min(items.length - 1, i));
      items.forEach(function (li, k) { li.classList.toggle('is-active', k === active); });
      list.setAttribute('aria-activedescendant', items[active].id);
      if (scroll !== false) {
        var li = items[active], top = li.offsetTop - list.offsetTop;
        if (top < list.scrollTop + 30) list.scrollTop = top - 30;
        else if (top + li.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = top + li.offsetHeight - list.clientHeight;
      }
    }
    function choose(i) {
      if (sel.selectedIndex !== i) { sel.selectedIndex = i; sel.dispatchEvent(new Event('change', { bubbles: true })); }
      paint();
    }
    var sheet = function () { return window.innerWidth <= 600; };
    function open() {
      $$('.fsel.open').forEach(function (o) { if (o !== wrap) o.classList.remove('open'); });
      wrap.classList.add('open'); btn.setAttribute('aria-expanded', 'true');
      wrap.classList.toggle('up', !sheet() && btn.getBoundingClientRect().bottom + 380 > window.innerHeight && btn.getBoundingClientRect().top > 400);
      if (sheet()) doc.classList.add('lb-open');
      focusItem(sel.selectedIndex);
      setTimeout(function () { list.focus({ preventScroll: true }); }, 0);  // after the panel stops being visibility:hidden
    }
    function close(refocus) {
      if (!wrap.classList.contains('open')) return;
      wrap.classList.remove('open'); btn.setAttribute('aria-expanded', 'false');
      doc.classList.remove('lb-open');
      if (refocus) btn.focus({ preventScroll: true });
    }
    btn.addEventListener('click', function () { if (wrap.classList.contains('open')) close(true); else open(); });
    btn.addEventListener('keydown', function (e) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].indexOf(e.key) >= 0) { e.preventDefault(); open(); }
    });
    pop.querySelector('.fsel__x').addEventListener('click', function () { close(true); });
    scrim.addEventListener('click', function () { close(true); });
    var typed = '', typedAt = 0;
    list.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); focusItem(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); focusItem(active - 1); }
      else if (e.key === 'Home') { e.preventDefault(); focusItem(0); }
      else if (e.key === 'End') { e.preventDefault(); focusItem(items.length - 1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); close(true); }
      else if (e.key === 'Escape') { e.preventDefault(); close(true); }
      else if (e.key === 'Tab') close(false);
      else if (e.key.length === 1) {   // type to jump: "pre" → Premium
        var now = Date.now(); typed = (now - typedAt > 700 ? '' : typed) + e.key.toLowerCase(); typedAt = now;
        for (var k = 0; k < items.length; k++) {
          if (items[k].textContent.toLowerCase().indexOf(typed) === 0) { focusItem(k); break; }
        }
      }
    });
    document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) close(false); });
    sel.addEventListener('change', paint);
    paint();
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

  /* ─────────────── Scroll-linked motion: one small engine for phones and desktops alike ───────────────
     Every effect is a function of how far its trigger has travelled through the viewport. Only transforms,
     opacity and one background-position are written, so it stays cheap even on budget phones. */
  if (!reduce) {
    var fx = [], live = [], vh = window.innerHeight, queued = false;
    var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
    // 0 when the trigger's top reaches the bottom of the screen, 1 when its bottom leaves the top
    var pass = function (r) { return clamp((vh - r.top) / (vh + r.height)); };
    var add = function (trigger, read, write, ease) { fx.push({ t: trigger, read: read, write: write, ease: ease, v: null, to: 0 }); };

    /* hero images drift slower than the page */
    $$('.hero__media img').forEach(function (img) {
      if (lite) return;
      add(img.closest('section'), function (r) { return clamp(-r.top / r.height); },
        function (v) { img.style.transform = 'translate3d(0,' + (v * 14).toFixed(2) + '%,0)'; });
    });
    /* images inside frames drift within their crop */
    $$('[data-parallax]').forEach(function (fr) {
      var img = fr.querySelector('img');
      if (!img || lite) return;
      add(fr, pass, function (v) { img.style.transform = 'translate3d(0,' + (-8 + 16 * v).toFixed(2) + '%,0)'; });
    });
    /* collage pieces move at their own speeds while the text column holds (gentler on narrow screens) */
    $$('[data-speed]').forEach(function (el) {
      var sp = parseFloat(el.getAttribute('data-speed')) * (window.innerWidth > 820 ? 100 : 55);
      add(el.closest('section'), pass, function (v) { el.style.transform = 'translate3d(0,' + (-sp * v).toFixed(2) + '%,0)'; });
    });
    /* image-filled text: the picture inside the letters slides as you scroll (repaints, so not on lite phones) */
    $$('.imgtext[data-drift]').forEach(function (el) {
      if (lite) return;
      add(el, pass, function (v) { el.style.setProperty('--py', (v * 100).toFixed(1) + '%'); });
    });
    /* statements: words brighten one after another as you read */
    $$('[data-scrub]').forEach(function (el) {
      var words = [];
      (function wrap(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            var frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(function (part) {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
              var sp = document.createElement('span'); sp.textContent = part;
              words.push(sp); frag.appendChild(sp);
            });
            n.parentNode.replaceChild(frag, n);
          } else if (n.nodeType === 1) {
            if (n.classList.contains('imgtext')) words.push(n); else wrap(n);
          }
        });
      })(el);
      var N = words.length, L = Math.max(3, Math.round(N / 4)), last = [];
      add(el, function (r) { return clamp((vh * 0.8 - r.top) / (vh * 0.35 + r.height)); }, function (v) {
        for (var k = 0; k < N; k++) {
          var o = (0.25 + 0.75 * clamp((v * (N + L) - k) / L)).toFixed(2);
          if (o !== last[k]) { words[k].style.opacity = o; last[k] = o; }
        }
      }, 0.18);
    });

    // only effects whose trigger is near the screen are worked out each frame
    if (hasIO) {
      var fio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          fx.forEach(function (f) {
            if (f.t !== en.target) return;
            var i = live.indexOf(f);
            if (en.isIntersecting && i < 0) live.push(f);
            else if (!en.isIntersecting && i >= 0) live.splice(i, 1);
          });
        });
        kick();
      }, { rootMargin: '25% 0px 25% 0px' });
      fx.forEach(function (f) { fio.observe(f.t); });
    } else live = fx.slice();

    var frame = function () {
      queued = false;
      var more = false, i, f, next;
      for (i = 0; i < live.length; i++) { f = live[i]; f.to = f.read(f.t.getBoundingClientRect()); } // all reads…
      for (i = 0; i < live.length; i++) {                                                             // …then all writes
        f = live[i];
        next = f.ease && f.v !== null ? f.v + (f.to - f.v) * f.ease : f.to;
        if (f.ease && Math.abs(f.to - next) > 0.002) more = true; else next = f.to;
        if (next !== f.v) { f.v = next; f.write(next); }
      }
      if (more) kick();
    };
    var kick = function () { if (!queued) { queued = true; requestAnimationFrame(frame); } };
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', function () { vh = window.innerHeight; kick(); }, { passive: true });
    window.addEventListener('load', kick);
    // place everything right away so nothing jumps on the first scroll
    fx.forEach(function (f) { f.v = f.read(f.t.getBoundingClientRect()); f.write(f.v); });
  }

  /* ─────────────── Desktop extra: smooth wheel scrolling (Lenis), loaded after the page is up ─────────────── */
  if (!smooth) return;
  function start() {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js';
    s.onload = function () {
      if (!window.Lenis) return;
      lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.95 });
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
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
    };
    document.head.appendChild(s);
  }
  if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
})();
