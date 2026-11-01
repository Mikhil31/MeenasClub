/*
 * Campus curve gallery: the camera travels along a Blender-drawn path while the photos float in 3D.
 *
 * Adapted from "Scroll-Driven 3D Gallery Using a Blender Camera Path with Three.js and GSAP"
 * by Gaspard Hedde for Codrops: https://github.com/gaspoorf/curve-gallery
 * (path data: assets/data/campus-path.json is that demo's path1.json, unchanged).
 *
 * Changes for this site: a scroll section instead of a full page (driven by page scroll, it never
 * captures the wheel), one plane per photo in order, each photo keeps its own shape and size,
 * the photos float gently while the page is still, and the same scene runs on phones and desktops.
 *
 * Original code: Copyright (c) 2026 Codrops, MIT License.
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions: The above copyright notice and this
 * permission notice shall be included in all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
 * NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
(function () {
  var sec = document.querySelector('[data-curve]');
  if (!sec) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function hasWebGL() {
    try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
    catch (e) { return false; }
  }
  // Without WebGL, or with reduced motion, the plain photo strip in the HTML stays as it is
  if (reduce || !hasWebGL()) return;

  var items = Array.prototype.slice.call(sec.querySelectorAll('.cg__list li'));
  var N = items.length;
  if (N < 2) return;
  sec.style.setProperty('--n', N);
  sec.classList.add('cg--3d');

  var track = sec.querySelector('.cg__track');
  var pin = sec.querySelector('.cg__pin');
  var stage = sec.querySelector('.cg__stage');
  var capNum = sec.querySelector('.cg__num');
  var capTxt = sec.querySelector('.cg__txt');
  var bar = sec.querySelector('.cg__bar i');
  var base = document.body.getAttribute('data-base') || '';
  var touch = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var data = items.map(function (li) {
    var img = li.querySelector('img');
    return {
      src: li.getAttribute(touch ? 'data-tex-sm' : 'data-tex'),
      aspect: (+img.getAttribute('width')) / (+img.getAttribute('height')),
      caption: li.querySelector('figcaption').textContent
    };
  });

  function fail() { sec.classList.remove('cg--3d'); }
  function load(src, cb) { var s = document.createElement('script'); s.src = src; s.onload = cb; s.onerror = fail; document.head.appendChild(s); }

  // Libraries load only as the section comes near the screen
  var started = false;
  function start() {
    if (started) return; started = true;
    var G = 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js';
    var T = 'https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.min.js';
    var go = function () {
      Promise.all([import(T), fetch(base + 'assets/data/campus-path.json').then(function (r) { return r.json(); })])
        .then(function (res) { init(res[0], window.gsap, res[1]); })
        .catch(fail);
    };
    if (window.gsap) go(); else load(G, go);
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); start(); } }, { rootMargin: '150% 0px' });
    io.observe(track);
  } else start();

  function init(THREE, gsap, raw) {
    if (!THREE || !gsap) return fail();

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch ? 1.75 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    stage.appendChild(renderer.domElement);

    var BG = 0x070d1c; // --navy-900
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);
    scene.fog = new THREE.Fog(BG, 12, 46);

    var camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);

    var SCALE = 16;   // the curve is in Blender units (from the original demo)
    var CAM_Z = 10;   // camera offset along Z (from the original demo)

    function toScaledVector3(p, scale) { return new THREE.Vector3(p[0] * scale, p[1] * scale, p[2] * scale); }
    function buildCurve(points) {
      return new THREE.CatmullRomCurve3(points.map(function (p) { return toScaledVector3(p, SCALE); }), true, 'catmullrom', 0.5);
    }
    var curve = buildCurve(raw);
    var L = curve.getLength();
    var gap = 1; // distance between neighbouring photos along the path, set from the photo size in resize()
    // a point along the path, measured in photos (0 = first photo, 1 = second, ...)
    function pathAt(idx) { var u = (idx * gap) / L; return curve.getPointAt(((u % 1) + 1) % 1); }

    // One plane per photo along the path, in the order they appear in the HTML
    var geo = new THREE.PlaneGeometry(1, 1);
    var loader = new THREE.TextureLoader();
    var maxAniso = renderer.capabilities.getMaxAnisotropy();
    var planes = data.map(function (d, i) {
      var tex = loader.load(d.src, function () { sec.classList.add('cg--ready'); });
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Math.min(8, maxAniso);
      var mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, depthTest: false, depthWrite: false }));
      mesh.userData = { base: new THREE.Vector3(), aspect: d.aspect, ph: i * 1.7 + 0.4 };
      scene.add(mesh);
      return mesh;
    });

    // Size every photo once from the viewport: the photo in front of the camera fills a set share
    // of the screen without cropping or stretching, and all photos share that one size.
    function resize() {
      var w = pin.clientWidth, h = pin.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      var visH = 2 * CAM_Z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      var visW = visH * camera.aspect;
      var widest = 0;
      planes.forEach(function (m) {
        var a = m.userData.aspect;
        var pw = Math.min(visW * (camera.aspect < 1 ? 0.86 : 0.62), visH * 0.66 * a);
        m.scale.set(pw, pw / a, 1);
        m.userData.amp = pw / a * 0.035; // float distance, relative to the photo's own height
        widest = Math.max(widest, pw);
      });
      // neighbours sit a little more than one photo apart, so the next one is always in view as you travel
      gap = widest * 1.4;
      planes.forEach(function (m, i) { m.userData.base.copy(pathAt(i)); });
    }
    resize();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(pin); else window.addEventListener('resize', resize);

    // Scroll → position along the path. Each photo holds still for a moment in front of the camera,
    // then the camera glides to the next one.
    function ease(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
    function progress() {
      var r = track.getBoundingClientRect();
      var span = track.offsetHeight - pin.clientHeight;
      return span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
    }
    function stopAt(p) {
      var u = p * (N - 1), i = Math.min(N - 2, Math.floor(u)), f = u - i;
      var HOLD = 0.18; // share of each step spent holding still
      f = f < HOLD ? 0 : f > 1 - HOLD ? 1 : ease((f - HOLD) / (1 - 2 * HOLD));
      return i + f;
    }

    // camera smoothing, as in the original demo
    var camProxy = { t: stopAt(progress()) };
    var setCamT = gsap.quickTo(camProxy, 't', { duration: 1, ease: 'power3.out' });

    var current = -1;
    function caption(p) {
      var i = Math.max(0, Math.min(N - 1, Math.round(p)));
      if (i === current) return;
      current = i;
      capNum.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(N).padStart(2, '0');
      capTxt.textContent = data[i].caption;
    }

    var visible = false, rafId = 0, last = performance.now(), prevT = camProxy.t, lean = 0;
    function frame(now) {
      rafId = visible ? requestAnimationFrame(frame) : 0;
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      var time = now / 1000;

      var p = progress();
      setCamT(stopAt(p));
      if (bar) bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';

      var t = camProxy.t;
      caption(t);
      var pos = pathAt(t);
      camera.position.set(pos.x, pos.y, pos.z + CAM_Z);

      // how fast the camera is travelling: the photos lean into the move, then settle back
      var vel = (t - prevT) / Math.max(dt, 0.001); prevT = t;
      lean += (Math.max(-1, Math.min(1, vel * 0.7)) - lean) * Math.min(1, dt * 6);

      planes.forEach(function (m, i) {
        // the photo nearest the camera is always drawn on top, so neighbours never cover it
        m.renderOrder = -Math.round(Math.abs(i - t) * 100);
        var u = m.userData, b = u.base, a = u.amp || 0, ph = u.ph;
        // idle float: a slow drift and a slight sway
        m.position.set(
          b.x + Math.cos(time * 0.42 + ph) * a * 0.7,
          b.y + Math.sin(time * 0.55 + ph) * a,
          b.z + Math.sin(time * 0.35 + ph * 1.3) * a * 0.8
        );
        m.rotation.set(
          Math.sin(time * 0.5 + ph) * 0.045,
          Math.cos(time * 0.45 + ph) * 0.06 + lean * 0.18,
          Math.sin(time * 0.3 + ph) * 0.012
        );
      });

      renderer.render(scene, camera);
    }

    var vio = new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting;
      if (visible && !rafId) { last = performance.now(); rafId = requestAnimationFrame(frame); }
    });
    vio.observe(pin);
    caption(camProxy.t);
  }
})();
