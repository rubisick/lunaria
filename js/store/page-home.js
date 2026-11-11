/* Lunaria — page d’accueil : ciel étoilé, parallaxe, sélection à onglets, compteurs */
Lunaria.ready(function () {
  'use strict';
  const L = Lunaria;
  const { $, $$ } = L;

  /* ---------- Ciel étoilé (canvas) avec étoiles filantes ---------- */
  function starfield(canvas) {
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0, h = 0, stars = [], shooting = null, nextShot = 2500, raf = 0, running = false;

    function resize() {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = Array.from({ length: Math.round((w * h) / 4200) }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.25 + 0.2, a: Math.random() * 0.6 + 0.25,
        speed: Math.random() * 0.0016 + 0.0004, phase: Math.random() * Math.PI * 2, warm: Math.random() < 0.22
      }));
      if (!running) draw(0);
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const alpha = s.a * (0.55 + 0.45 * Math.sin(s.phase + t * s.speed));
        ctx.fillStyle = s.warm ? `rgba(242,204,182,${alpha})` : `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!running) return;
      if (!shooting && t > nextShot) {
        shooting = { x: w * (0.35 + Math.random() * 0.6), y: h * Math.random() * 0.35, vx: -(7 + Math.random() * 4), vy: 2.6 + Math.random() * 2, life: 0 };
        nextShot = t + 4500 + Math.random() * 5000;
      }
      if (shooting) {
        const s = shooting;
        s.x += s.vx; s.y += s.vy; s.life++;
        const tail = 14;
        const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * tail, s.y - s.vy * tail);
        g.addColorStop(0, `rgba(255,243,234,${Math.max(0, 0.95 - s.life / 70)})`);
        g.addColorStop(1, 'rgba(255,243,234,0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * tail, s.y - s.vy * tail);
        ctx.stroke();
        if (s.life > 70 || s.x < -60 || s.y > h + 60) shooting = null;
      }
    }

    function loop(t) { draw(t); if (running) raf = requestAnimationFrame(loop); }
    function start() { if (running || L.reduceMotion) return; running = true; raf = requestAnimationFrame(loop); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    resize();
    window.addEventListener('resize', resize);
    // N’anime le ciel que lorsqu’il est visible
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(canvas);
    } else start();
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  }

  const hero = $('[data-hero]');
  const canvas = $('.hero-stars');
  if (canvas && canvas.getContext) starfield(canvas);

  /* ---------- Parallaxe de la lune et de la monture ---------- */
  if (hero && !L.reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    const layers = $$('[data-depth]', hero);
    hero.addEventListener('mousemove', e => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      layers.forEach(el => {
        const d = +el.dataset.depth;
        el.style.transform = `translate(${(-x * d).toFixed(1)}px, ${(-y * d).toFixed(1)}px)`;
      });
    });
    hero.addEventListener('mouseleave', () => layers.forEach(el => { el.style.transform = ''; }));
  }

  /* ---------- Note moyenne réelle (calculée à partir du catalogue) ---------- */
  const totals = L.products.reduce((acc, p) => {
    const s = L.reviews.stats(p.id);
    acc.count += s.count; acc.sum += s.avg * s.count;
    return acc;
  }, { count: 0, sum: 0 });
  const avg = Math.round((totals.sum / totals.count) * 10) / 10;
  const ratingEl = $('[data-home-rating]');
  if (ratingEl) ratingEl.innerHTML = `${L.stars(avg)} ${String(avg).replace('.', ',')}/5 · ${totals.count.toLocaleString('fr-CA')} avis`;
  const statRating = $('[data-stat="rating"]');
  const statReviews = $('[data-stat="reviews"]');
  if (statRating) statRating.dataset.countTo = avg;
  if (statReviews) statReviews.dataset.countTo = totals.count;

  /* ---------- Collections : illustrations et nombre de modèles ---------- */
  $$('[data-frame]').forEach(el => {
    const [id, color] = el.dataset.frame.split(':');
    el.innerHTML = L.frameSVG(L.getProduct(id), color, { label: false });
  });
  $$('[data-count]').forEach(el => {
    const key = el.dataset.count;
    const n = L.products.filter(p => p.type === key || p.tags.includes(key)).length;
    el.textContent = `${n} modèles`;
  });

  /* ---------- Phases de lune des étapes ---------- */
  $$('[data-phase]').forEach(path => path.setAttribute('d', L.moonPath(30, +path.dataset.phase)));

  /* ---------- Sélection à onglets ---------- */
  const grid = $('[data-home-grid]');
  const lists = {
    populaires: L.products.slice().sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 4),
    nouveautes: L.products.slice().sort((a, b) => new Date(b.added) - new Date(a.added)).slice(0, 4),
    solaires: L.products.filter(p => p.type === 'solaire').slice(0, 4)
  };
  function show(tab) {
    $$('[data-tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === tab));
    L.renderGrid(grid, lists[tab]);
  }
  $$('[data-tab]').forEach(b => b.addEventListener('click', () => show(b.dataset.tab)));
  show('populaires');

  /* ---------- Compteurs animés ---------- */
  function countUp(el) {
    const to = parseFloat(el.dataset.countTo);
    const dec = +(el.dataset.decimals || 0);
    const fmt = n => n.toLocaleString('fr-CA', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    if (L.reduceMotion) { el.textContent = fmt(to); return; }
    const start = performance.now();
    const tick = now => {
      const p = Math.min(1, (now - start) / 1600);
      el.textContent = fmt(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  const counters = $$('[data-count-to]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { countUp(e.target); io.unobserve(e.target); }
    }), { threshold: 0.6 });
    counters.forEach(c => io.observe(c));
  } else counters.forEach(countUp);
});
