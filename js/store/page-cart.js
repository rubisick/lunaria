/* Lunaria — page panier : lignes, quantités, code promo, récapitulatif */
Lunaria.ready(function () {
  'use strict';
  const L = Lunaria;
  const { $, esc, money, icon } = L;
  const root = $('[data-cart-page]');
  let promoMsg = null;

  const rxDetail = rx => {
    if (!rx || rx.mode !== 'now') return '';
    const f = v => (v > 0 ? '+' : '') + v.toFixed(2).replace('.', ',');
    const eye = e => `${f(e.sph)}${e.cyl ? ' ' + f(e.cyl) + ' × ' + e.axe + '°' : ''}`;
    return ` · OD ${eye(rx.od)} · OG ${eye(rx.og)} · EP ${rx.ep}`;
  };

  function summaryHTML(t) {
    const p = t.promo;
    const ship = t.afterDiscount >= L.FREE_SHIPPING ? 'Gratuite' : `dès ${money(L.SHIPPING[0].price, true)}`;
    return `<aside class="summary" aria-labelledby="sum-title">
      <h2 id="sum-title">Récapitulatif</h2>
      <div class="sum-row"><span>Sous-total (${t.count} article${t.count > 1 ? 's' : ''})</span><span>${money(t.subtotal, true)}</span></div>
      ${p && p.amount ? `<div class="sum-row is-promo"><span>${icon('tag')}Rabais ${esc(p.code)}</span><span>−${money(t.discount, true)}</span></div>` : ''}
      <div class="sum-row"><span>Livraison</span><span>${ship}</span></div>
      <div class="sum-row is-muted"><span>Taxes</span><span>Calculées selon la province</span></div>
      <div class="sum-row is-total"><span>Total estimé</span><span>${money(t.afterDiscount + (t.afterDiscount >= L.FREE_SHIPPING ? 0 : L.SHIPPING[0].price), true)}</span></div>
      ${p ? `<div class="promo-applied${p.inactive ? ' is-inactive' : ''}"><span>${icon('tag')} <strong>${esc(p.code)}</strong> · ${p.inactive ? esc(p.note) : esc(p.label)}</span><button type="button" data-promo-clear>Retirer</button></div>`
        : `<form class="promo-form" data-promo novalidate>
            <label class="sr-only" for="promo">Code promo</label>
            <input id="promo" name="code" placeholder="Code promo" autocomplete="off">
            <button class="btn btn-ghost btn-sm" type="submit">Appliquer</button>
          </form>`}
      ${promoMsg ? `<p class="form-msg ${promoMsg.ok ? 'is-ok' : 'is-error'}" role="status">${icon(promoMsg.ok ? 'check' : 'alert')}${esc(promoMsg.message)}</p>` : ''}
      <a class="btn btn-lg btn-block" href="checkout.html" style="margin-top:18px">${icon('lock')}Passer à la caisse</a>
      <a class="btn btn-ghost btn-block" href="catalog-list.html">Continuer mes achats</a>
      <ul class="summary-trust">
        <li>${icon('lock')}Paiement sécurisé et chiffré</li>
        <li>${icon('refresh')}Retours gratuits pendant 30 jours</li>
        <li>${icon('shield')}Garantie 2 ans sur toutes les montures</li>
      </ul>
    </aside>`;
  }

  function render() {
    const t = L.totals();
    if (!t.count) {
      root.innerHTML = `<div class="empty">
        <div class="empty-moon" aria-hidden="true"></div>
        <h2>Votre panier est vide</h2>
        <p>Il n’attend que la monture qui vous ressemble.</p>
        <a class="btn btn-lg" href="catalog-list.html">Découvrir les lunettes</a></div>`;
      renderCross([]);
      return;
    }
    root.innerHTML = `<div class="cart-layout">
      <div>
        <div class="ship-meter" style="padding:0 0 22px">${L.shipMeter(t)}</div>
        <div class="cart-table">${t.lines.map(({ line, info }) => `
          <article class="cart-row">
            <a class="line-thumb" href="${L.productURL(info.p, line.color)}">${L.frameSVG(info.p, line.color, { label: false })}</a>
            <div>
              <a class="line-name" href="${L.productURL(info.p, line.color)}">${esc(info.p.name)}</a>
              <p class="line-opts">${esc(info.c.name)} · Verres ${esc(info.lens.name.toLowerCase())}${info.addons.map(a => ' · ' + esc(a.name)).join('')}</p>
              ${info.rxText ? `<p class="line-rx">${icon('eye')}${info.rxText}${esc(rxDetail(line.rx))}</p>` : ''}
              <div class="cart-row-actions">
                ${L.qtyHTML(line.key, line.qty, L.lineMax(line))}
                <button type="button" class="link-btn" data-move-wish="${esc(line.key)}">Déplacer vers les favoris</button>
                <button type="button" class="link-btn" data-remove="${esc(line.key)}">Retirer</button>
              </div>
            </div>
            <div class="cart-row-side">
              <strong>${money(info.total, true)}</strong>
              ${line.qty > 1 ? `<small>${money(info.unit, true)} chacune</small>` : ''}
            </div>
          </article>`).join('')}
        </div>
      </div>
      ${summaryHTML(t)}
    </div>`;
    renderCross(t.items.map(i => i.id));
  }

  let crossDone = false;
  function renderCross(inCart) {
    if (crossDone) return;
    crossDone = true;
    const picks = L.products.filter(p => !inCart.includes(p.id) && L.stock(p.id) > 0)
      .sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 4);
    $('[data-cross-section]').hidden = false;
    L.renderGrid($('[data-cross]'), picks);
  }

  root.addEventListener('submit', e => {
    if (!e.target.matches('[data-promo]')) return;
    e.preventDefault();
    promoMsg = L.promo.apply(e.target.code.value);
    render();
    if (!promoMsg.ok) { const input = $('#promo'); input.value = e.target.code.value; input.focus(); }
  });

  root.addEventListener('click', e => {
    if (e.target.closest('[data-promo-clear]')) { promoMsg = null; L.promo.clear(); return; }
    const mv = e.target.closest('[data-move-wish]');
    if (mv) {
      const removed = L.cart.remove(mv.dataset.moveWish);
      if (removed && !L.wishlist.has(removed.line.id)) L.wishlist.toggle(removed.line.id);
      L.toast(`<strong>${esc(L.getProduct(removed.line.id).name)}</strong> a été déplacé vers vos favoris.`, { icon: 'heart' });
    }
  });

  L.on('cart', render);
  render();
});
