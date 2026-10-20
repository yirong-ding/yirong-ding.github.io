/* Motion layer for index.html: theme toggle, nav progress and active link,
   typed tagline, animated facility–substation graph on the cover, and
   scroll reveal. Everything respects prefers-reduced-motion. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function onReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  /* ---------- theme ---------- */
  function currentTheme() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function setTheme(theme) {
    if (theme === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    try { localStorage.setItem('yd-theme', theme); } catch (e) {}
    document.dispatchEvent(new CustomEvent('themechange'));
  }

  function initThemeToggle() {
    var btn = document.querySelector('.m-theme');
    if (!btn) return;
    var sync = function () {
      var dark = currentTheme() === 'dark';
      btn.innerHTML = dark ? '<i class="fa fa-sun-o" aria-hidden="true"></i>' : '<i class="fa fa-moon-o" aria-hidden="true"></i>';
      btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      btn.setAttribute('aria-pressed', String(dark));
    };
    btn.addEventListener('click', function () {
      setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    });
    document.addEventListener('themechange', sync);
    sync();
  }

  /* ---------- nav progress and active link ---------- */
  function initNav() {
    var prog = document.querySelector('.m-prog');
    if (prog) {
      var onScroll = function () {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        prog.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      onScroll();
    }

    if (!('IntersectionObserver' in window)) return;
    var links = Array.prototype.slice.call(document.querySelectorAll('.site-nav .page-link[href^="#"]'));
    // Each link is active while its section crosses the middle band of the
    // screen; side-by-side sections (About and Honors) light up together.
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        links.forEach(function (a) {
          if (a.getAttribute('href') === '#' + en.target.id) a.classList.toggle('is-active', en.isIntersecting);
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    links.forEach(function (a) {
      var target = document.getElementById(a.getAttribute('href').slice(1));
      if (target) spy.observe(target);
    });
  }

  /* ---------- typed tagline ---------- */
  function initTyped() {
    var el = document.getElementById('m-typed');
    if (!el || reduce) return;
    // The last phrase is the one written in index.html, shown first and when motion is off.
    var phrases = ['infrastructure service equity', 'explainable GeoAI', 'knowledge graphs & AI agents', 'disaster resilience'];
    var pi = phrases.length - 1, ci = phrases[pi].length, mode = 'hold';
    function tick() {
      // nothing to watch in a background tab; check again shortly
      if (document.hidden) { setTimeout(tick, 1000); return; }
      if (mode === 'hold') mode = 'del';
      else if (mode === 'del') {
        ci--;
        if (ci <= 0) { ci = 0; pi = (pi + 1) % phrases.length; mode = 'type'; }
      } else {
        ci++;
        if (ci >= phrases[pi].length) mode = 'hold';
      }
      el.textContent = phrases[pi].slice(0, ci);
      setTimeout(tick, mode === 'hold' ? 2200 : mode === 'del' ? 45 : 90);
    }
    setTimeout(tick, 2600);
  }

  /* ---------- scroll reveal ---------- */
  function initReveal() {
    var headings = Array.prototype.slice.call(document.querySelectorAll('.md-heading'));
    if (reduce || !('IntersectionObserver' in window)) return;

    var selector = [
      '#bio .bio-body > p', '#bio .bio-body > div',
      '.timeline-item', '.pub', '.paper', '.talk', '.edu-step', '.honor-item', '.svc-card', '.ri-card', '.teaching-section', '.glance-item',
      '#grantwriting li', '#awards li'
    ].join(',');
    var items = Array.prototype.slice.call(document.querySelectorAll(selector));

    var io = new IntersectionObserver(function (entries) {
      // Items that come into view together cascade in reading order;
      // an item that arrives on its own animates right away.
      var batch = 0;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var el = en.target;
        if (el.classList.contains('md-heading')) {
          el.classList.remove('m-pre');
          return;
        }
        if (!el.animate) return;
        el.animate(
          [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }],
          { duration: 650, delay: Math.min(batch, 5) * 70, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }
        );
        batch++;
      });
    }, { threshold: 0 });

    // Only content below the fold is revealed; what is already on screen when
    // the page opens stays put instead of blinking out and fading back in.
    var below = function (el) { return el.getBoundingClientRect().top > window.innerHeight; };
    headings.forEach(function (h) {
      if (below(h)) {
        h.classList.add('m-pre');
        io.observe(h);
      }
    });
    items.forEach(function (el) {
      if (below(el)) io.observe(el);
    });
  }

  /* ---------- cover graph ---------- */
  function initGraph() {
    var cover = document.getElementById('profile-cover');
    var cv = document.getElementById('m-graph');
    if (!cover || !cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var TYPES = ['Hospital', 'Pharmacy', 'Gas station', 'Fire station', 'Police station', 'Shelter', 'Grocery store', 'EMS station'];
    var C = {};
    var W = 0, H = 0, subs = [], facs = [], links = [], near = [], pulses = [], rings = [];
    var hot = null, raf = 0, last = 0, nextOut = 0, nextPulse = 0, inView = true;

    function rng(seed) {
      return function () {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    var RND = rng(Date.now() & 0xffff);

    function readColors() {
      var cs = getComputedStyle(root);
      ['--m-a1', '--m-a2', '--m-node', '--m-dim', '--m-line', '--m-muted', '--m-bg2', '--m-fg'].forEach(function (k) {
        C[k] = cs.getPropertyValue(k).trim();
      });
    }

    function build() {
      var r = cover.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var R = rng(7), small = W < 640;
      var cols = small ? 3 : 5, rows = 2;
      subs = []; facs = []; links = []; near = [];
      for (var r0 = 0; r0 < rows; r0++) {
        for (var c = 0; c < cols; c++) {
          subs.push({
            x: ((c + 0.5 + (R() - 0.5) * 0.5) / cols) * W,
            y: ((r0 + 0.5 + (R() - 0.5) * 0.5) / rows) * H,
            id: 'S' + (subs.length + 1), outAt: -1, backAt: -1, n: 0
          });
        }
      }
      var nF = small ? 30 : 64, spread = Math.min(W / cols, H / rows) * 0.7;
      for (var i = 0; i < nF; i++) {
        var s0 = subs[Math.floor(R() * subs.length)], a = R() * Math.PI * 2, d = (0.25 + 0.75 * R()) * spread;
        var x = Math.min(W - 10, Math.max(10, s0.x + Math.cos(a) * d));
        var y = Math.min(H - 10, Math.max(10, s0.y + Math.sin(a) * d));
        var best = subs[0], bd = Infinity;
        subs.forEach(function (q) { var dd = (q.x - x) * (q.x - x) + (q.y - y) * (q.y - y); if (dd < bd) { bd = dd; best = q; } });
        best.n++;
        facs.push({ bx: x, by: y, x: x, y: y, s: best, type: TYPES[Math.floor(R() * TYPES.length)], ph: R() * 6.28, lv: 1, lag: Math.sqrt(bd) * 3 });
      }
      var seen = {};
      subs.forEach(function (s, i) {
        subs.map(function (q, j) { return [j, (q.x - s.x) * (q.x - s.x) + (q.y - s.y) * (q.y - s.y)]; })
          .filter(function (p) { return p[0] !== i; })
          .sort(function (p, q) { return p[1] - q[1]; })
          .slice(0, 2)
          .forEach(function (p) {
            var j = p[0], k = Math.min(i, j) + '-' + Math.max(i, j);
            if (!seen[k]) { seen[k] = true; links.push([s, subs[j]]); }
          });
      });
      var lim = Math.min(W, H) * 0.14;
      for (var a2 = 0; a2 < facs.length; a2++) {
        for (var b2 = a2 + 1; b2 < facs.length; b2++) {
          if (Math.hypot(facs[a2].bx - facs[b2].bx, facs[a2].by - facs[b2].by) < lim) near.push([facs[a2], facs[b2]]);
        }
      }
    }

    function isOut(s, now) { return s.outAt >= 0 && now >= s.outAt && now < s.backAt; }

    function line(a, b) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }

    function frame(now) {
      if (!subs.length) build();
      var dt = last ? Math.min(64, now - last) : 16;
      last = now;
      if (!reduce && subs.length && links.length && facs.length) {
        if (now > nextOut) {
          var s = subs[Math.floor(RND() * subs.length)];
          if (!isOut(s, now)) {
            s.outAt = now; s.backAt = now + 2600 + RND() * 1600;
            rings.push({ x: s.x, y: s.y, t0: now, out: true });
            (function (sub, back) {
              setTimeout(function () { rings.push({ x: sub.x, y: sub.y, t0: performance.now(), out: false }); }, back - now);
            })(s, s.backAt);
          }
          nextOut = now + 2400 + RND() * 1800;
        }
        if (now > nextPulse) {
          var f = facs[Math.floor(RND() * facs.length)];
          if (!isOut(f.s, now)) pulses.push({ a: f.s, b: f, k: 0 });
          if (RND() < 0.35) {
            var l = links[Math.floor(RND() * links.length)];
            if (!isOut(l[0], now) && !isOut(l[1], now)) pulses.push({ a: l[0], b: l[1], k: 0 });
          }
          nextPulse = now + 150;
        }
      }
      facs.forEach(function (f2) {
        if (!reduce) {
          f2.x = f2.bx + Math.sin(now * 0.0005 + f2.ph) * 3;
          f2.y = f2.by + Math.cos(now * 0.0004 + f2.ph) * 3;
        }
        var s2 = f2.s, down = s2.outAt >= 0 && now >= s2.outAt + f2.lag && now < s2.backAt + f2.lag;
        f2.lv += ((down ? 0 : 1) - f2.lv) * Math.min(1, dt / 160);
      });

      ctx.clearRect(0, 0, W, H);
      var hotSub = hot ? (hot.s || hot) : null;

      ctx.lineWidth = 1;
      ctx.strokeStyle = C['--m-line'];
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      near.forEach(function (p) { line(p[0], p[1]); });
      ctx.stroke();

      facs.forEach(function (f3) {
        var on = hotSub && f3.s === hotSub;
        ctx.globalAlpha = on ? 0.9 : 0.1 + 0.22 * f3.lv;
        ctx.strokeStyle = on ? C['--m-a1'] : C['--m-node'];
        ctx.lineWidth = on ? 1.4 : 1;
        ctx.beginPath(); line(f3.s, f3); ctx.stroke();
      });

      ctx.globalAlpha = 0.45; ctx.strokeStyle = C['--m-a1']; ctx.lineWidth = 1.2;
      ctx.beginPath();
      links.forEach(function (p) { line(p[0], p[1]); });
      ctx.stroke();

      ctx.fillStyle = C['--m-a2'];
      pulses = pulses.filter(function (p) {
        p.k += dt / 900;
        if (p.k >= 1) return false;
        ctx.globalAlpha = Math.sin(p.k * Math.PI);
        ctx.beginPath();
        ctx.arc(p.a.x + (p.b.x - p.a.x) * p.k, p.a.y + (p.b.y - p.a.y) * p.k, 2, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });

      facs.forEach(function (f4) {
        ctx.globalAlpha = 1; ctx.fillStyle = C['--m-dim'];
        ctx.beginPath(); ctx.arc(f4.x, f4.y, 3, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = f4.lv * 0.85; ctx.fillStyle = f4 === hot ? C['--m-a1'] : C['--m-node'];
        ctx.beginPath(); ctx.arc(f4.x, f4.y, f4 === hot ? 4.5 : 3, 0, Math.PI * 2); ctx.fill();
      });

      subs.forEach(function (s3) {
        var out = isOut(s3, now), z = s3 === hotSub ? 8 : 6;
        ctx.globalAlpha = 1;
        ctx.fillStyle = out ? C['--m-dim'] : C['--m-a2'];
        ctx.strokeStyle = C['--m-a1']; ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(s3.x, s3.y - z); ctx.lineTo(s3.x + z, s3.y); ctx.lineTo(s3.x, s3.y + z); ctx.lineTo(s3.x - z, s3.y);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      });

      rings = rings.filter(function (r) {
        var k = (now - r.t0) / 1000;
        if (k >= 1) return false;
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = r.out ? C['--m-muted'] : C['--m-a1']; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(r.x, r.y, 8 + k * 46, 0, Math.PI * 2); ctx.stroke();
        return true;
      });

      if (hot) {
        var label = hot.s
          ? hot.type + ' · served by ' + hot.s.id + (hot.lv < 0.5 ? ' · out' : '')
          : 'Substation ' + hot.id + ' · ' + hot.n + ' facilities' + (isOut(hot, now) ? ' · out' : '');
        ctx.globalAlpha = 1;
        ctx.font = '12px ui-monospace, SFMono-Regular, Consolas, monospace';
        var tw = ctx.measureText(label).width, bx = Math.min(W - tw - 22, hot.x + 12), by = Math.max(6, hot.y - 34);
        ctx.fillStyle = C['--m-bg2']; ctx.strokeStyle = C['--m-line']; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.rect(bx, by, tw + 16, 24); ctx.fill(); ctx.stroke();
        ctx.fillStyle = C['--m-fg']; ctx.textBaseline = 'middle'; ctx.fillText(label, bx + 8, by + 12);
      }
      ctx.globalAlpha = 1;

      if (!reduce && inView && !document.hidden) raf = requestAnimationFrame(frame);
      else raf = 0;
    }

    function kick() {
      if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
    }

    cv.addEventListener('pointermove', function (ev) {
      var r = cv.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top;
      var best = null, bd = 26 * 26;
      subs.concat(facs).forEach(function (n) {
        var d = (n.x - mx) * (n.x - mx) + (n.y - my) * (n.y - my);
        if (d < bd) { bd = d; best = n; }
      });
      hot = best;
      if (reduce) frame(performance.now()); else kick();
    });
    cv.addEventListener('pointerleave', function () {
      hot = null;
      if (reduce) frame(performance.now());
    });

    document.addEventListener('themechange', function () {
      readColors();
      if (reduce) frame(performance.now());
    });

    readColors();
    build();
    if ('ResizeObserver' in window) {
      new ResizeObserver(function () {
        build();
        if (reduce || !inView) frame(performance.now()); else kick();
      }).observe(cover);
    } else {
      build();
      frame(performance.now());
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView) kick();
      }).observe(cover);
    }
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) kick();
    });
  }

  onReady(function () {
    initThemeToggle();
    initNav();
    initTyped();
    initReveal();
    initGraph();
  });
})();
