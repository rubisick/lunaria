/* Lunaria — confirmation et suivi de commande */
Lunaria.ready(function () {
  'use strict';
  const L = Lunaria;
  const { $, esc, money, icon } = L;
  const root = $('[data-order-root]');
  const params = L.params();
  const order = L.orders.get(params.get('id'));
  const isNew = params.get('new') === '1';

  /* ---------- Recherche d’une commande ---------- */
  if (!order) {
    root.innerHTML = `
      <div class="confirm-hero">
        <div class="empty-moon" aria-hidden="true"></div>
        <h1>Suivre une commande</h1>
        <p>Entrez votre numéro de commande (il commence par LUN-) et le courriel utilisé lors de l’achat.</p>
      </div>
      <form class="panel lookup" data-lookup novalidate>
        <div class="field"><label for="lk-id">Numéro de commande</label><input id="lk-id" name="id" data-validate="required" placeholder="LUN-XXXXXXX" value="${esc(params.get('id') || '')}"></div>
        <div class="field"><label for="lk-email">Courriel</label><input id="lk-email" name="email" type="email" data-validate="required email"></div>
        <button class="btn" type="submit">Rechercher</button>
      </form>
      <p class="form-msg is-error" data-lookup-msg style="margin-top:14px"></p>`;
    $('[data-lookup]').addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target;
      if (!L.validateForm(f)) return;
      const o = L.orders.get(f.elements.namedItem('id').value);
      if (o && o.email === f.elements.namedItem('email').value.trim().toLowerCase()) location.href = `order.html?id=${o.id}`;
      else $('[data-lookup-msg]').innerHTML = `${icon('alert')}Aucune commande ne correspond à ces informations.`;
    });
    return;
  }

  /* ---------- Détails ---------- */
  const tl = L.orderTimeline(order);
  const prov = L.PROVINCES[order.address.province];
  const steps = tl.steps.map((s, i) => `
    <li class="${i < tl.current ? 'is-done' : i === tl.current ? 'is-current' : ''}">
      <span class="timeline-dot">${i <= tl.current ? icon('check') : ''}</span>
      <strong>${s.label}</strong>
      <span>${i === 3 && i > tl.current ? 'Prévue d’ici le ' : ''}${L.date(s.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
    </li>`).join('');

  document.title = `Commande ${order.id} — Lunaria`;
  root.innerHTML = `
    <div class="confirm-hero">
      ${isNew ? `<svg class="confirm-check" viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="48" r="44" pathLength="1"/><path d="M30 49l12 12 25-26" pathLength="1"/></svg>` : ''}
      <h1>${isNew ? `Merci, ${esc(order.contact.firstName)} !` : 'Suivi de commande'}</h1>
      <p>${isNew ? `Votre commande est confirmée. Un récapitulatif a été envoyé à <strong>${esc(order.email)}</strong>.` : `Passée le ${L.date(order.createdAt)} · ${esc(order.email)}`}</p>
      <span class="order-id">${icon('box')}Commande ${esc(order.id)}</span>
    </div>

    <div class="panel" data-reveal>
      <h2 class="panel-title">${tl.status}<small>Livraison prévue entre le ${L.shortDate(order.eta.min)} et le ${L.shortDate(order.eta.max)}</small></h2>
      <ol class="timeline">${steps}</ol>
      ${order.rxPending ? `<div class="callout">${icon('eye')}<p><strong>Il nous manque votre ordonnance.</strong> Envoyez une photo de votre ordonnance à <a href="mailto:ordonnances@lunaria.ca?subject=${encodeURIComponent('Ordonnance ' + order.id)}" style="text-decoration:underline">ordonnances@lunaria.ca</a> en indiquant le numéro ${esc(order.id)}. Le taillage de vos verres commencera dès sa validation.</p></div>` : ''}
    </div>

    <div class="panel" data-reveal style="margin-top:18px">
      <h2 class="panel-title">Articles</h2>
      <div class="summary-items" style="max-height:none">${order.items.map(i => {
        const p = L.getProduct(i.id);
        return `<div class="summary-item">
          <a class="line-thumb" href="${p ? L.productURL(p, i.color) : '#'}">${p ? L.frameSVG(p, i.color, { label: false }) : ''}<b>${i.qty}</b></a>
          <span><strong>${esc(i.name)}</strong><small>${esc(i.colorName)} · ${esc(i.lens)}${i.addons.map(a => ' · ' + esc(a)).join('')}${i.rxText ? ' · ' + i.rxText : ''}</small></span>
          <span>${money(i.total, true)}</span></div>`;
      }).join('')}</div>
      <div class="sum-row"><span>Sous-total</span><span>${money(order.subtotal, true)}</span></div>
      ${order.discount ? `<div class="sum-row is-promo"><span>${icon('tag')}Rabais ${esc(order.promo)}</span><span>−${money(order.discount, true)}</span></div>` : ''}
      <div class="sum-row"><span>${esc(order.shipping.name)}</span><span>${order.shipping.cost ? money(order.shipping.cost, true) : 'Gratuite'}</span></div>
      ${order.taxes.map(x => `<div class="sum-row"><span>${x.name} (${String(x.rate).replace('.', ',')} %)</span><span>${money(x.amount, true)}</span></div>`).join('')}
      <div class="sum-row is-total"><span>Total payé</span><span>${money(order.total, true)}</span></div>
    </div>

    <div class="order-grid" data-reveal>
      <div class="panel">
        <h3>Livraison</h3>
        <address>${esc(order.contact.firstName)} ${esc(order.contact.lastName)}<br>${esc(order.address.address1)}${order.address.address2 ? ', ' + esc(order.address.address2) : ''}<br>${esc(order.address.city)} (${esc(order.address.province)}) ${esc(order.address.postal)}<br>${esc(order.address.phone)}</address>
        <p class="muted" style="margin:10px 0 0">${esc(order.shipping.name)} · ${prov ? esc(prov.name) : ''}</p>
      </div>
      <div class="panel">
        <h3>Paiement</h3>
        <p style="display:flex;align-items:center;gap:10px;margin:0">${icon('card')}${esc(order.payment.brand)} se terminant par ${esc(order.payment.last4)}</p>
        <p class="muted" style="margin:10px 0 0">Débité le ${L.date(order.createdAt)}</p>
      </div>
    </div>

    <div class="order-actions">
      <a class="btn btn-lg" href="catalog-list.html">Continuer mes achats</a>
      <button class="btn btn-ghost btn-lg" type="button" data-print>${icon('print')}Imprimer le reçu</button>
      ${L.account.current() ? '<a class="btn btn-ghost btn-lg" href="auth.html">Mes commandes</a>' : ''}
    </div>`;

  root.addEventListener('click', e => { if (e.target.closest('[data-print]')) window.print(); });
  L.reveal(root);

  if (isNew) {
    history.replaceState(null, '', `order.html?id=${order.id}`);
    starBurst();
  }

  /* ---------- Pluie d’étoiles de célébration ---------- */
  function starBurst() {
    if (L.reduceMotion) return;
    const c = document.createElement('canvas');
    c.className = 'star-burst';
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const colors = ['#F2CCB6', '#BF947A', '#1A2E40', '#023859', '#fff3ea'];
    const cx = innerWidth / 2, cy = Math.min(260, innerHeight / 3);
    const parts = Array.from({ length: 90 }, () => {
      const a = Math.random() * Math.PI * 2, v = 3 + Math.random() * 7;
      return { x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3, r: 3 + Math.random() * 5, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: colors[Math.floor(Math.random() * colors.length)], life: 0 };
    });
    const star = (x, y, r, rot) => {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 ? r * 0.45 : r;
        const ang = rot + (i * Math.PI) / 5;
        ctx.lineTo(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad);
      }
      ctx.closePath();
      ctx.fill();
    };
    (function frame() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      let alive = 0;
      parts.forEach(p => {
        p.life++; p.vy += 0.16; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        const alpha = Math.max(0, 1 - p.life / 150);
        if (alpha <= 0 || p.y > innerHeight + 20) return;
        alive++;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.c;
        star(p.x, p.y, p.r, p.rot);
      });
      if (alive) requestAnimationFrame(frame); else c.remove();
    })();
  }
});
