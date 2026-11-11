/* Lunaria — caisse : coordonnées, livraison, taxes par province, paiement (démo) */
Lunaria.ready(function () {
  'use strict';
  const L = Lunaria;
  const { $, $$, esc, money, icon } = L;
  const form = $('[data-checkout]');

  if (!L.cart.count()) {
    location.replace('cart.html');
    return;
  }

  /* ---------- Validations propres au paiement ---------- */
  const digits = v => v.replace(/\D/g, '');
  const brandOf = num => /^3[47]/.test(num) ? 'Amex' : /^4/.test(num) ? 'Visa' : /^(5[1-5]|2[2-7])/.test(num) ? 'Mastercard' : '';
  const luhn = num => {
    let sum = 0;
    num.split('').reverse().forEach((d, i) => { let n = +d; if (i % 2) { n *= 2; if (n > 9) n -= 9; } sum += n; });
    return sum % 10 === 0;
  };
  Object.assign(L.validators, {
    card: v => {
      const n = digits(v);
      if (!brandOf(n)) return 'Nous acceptons Visa, Mastercard et American Express.';
      if (n.length !== (brandOf(n) === 'Amex' ? 15 : 16) || !luhn(n)) return 'Ce numéro de carte n’est pas valide.';
      return '';
    },
    exp: v => {
      const m = v.match(/^(\d{2})\s*\/\s*(\d{2})$/);
      if (!m || +m[1] < 1 || +m[1] > 12) return 'Format attendu : MM / AA.';
      const end = new Date(2000 + +m[2], +m[1], 1);
      return end > new Date() ? '' : 'Cette carte est expirée.';
    },
    cvc: v => {
      const need = brandOf(digits(form.cardNumber.value)) === 'Amex' ? 4 : 3;
      return digits(v).length === need ? '' : `Le CVC compte ${need} chiffres.`;
    }
  });

  /* ---------- Provinces et pré-remplissage ---------- */
  const provSel = $('[data-province]');
  provSel.innerHTML = Object.keys(L.PROVINCES).sort((a, b) => L.PROVINCES[a].name.localeCompare(L.PROVINCES[b].name, 'fr'))
    .map(k => `<option value="${k}">${L.PROVINCES[k].name}</option>`).join('');
  provSel.value = 'QC';

  const DRAFT_FIELDS = ['email', 'firstName', 'lastName', 'address1', 'address2', 'city', 'province', 'postal', 'phone'];
  const acc = L.account.current();
  const draft = L.store.get('checkoutDraft', {});
  const prefill = Object.assign({}, draft, acc ? Object.assign({ email: acc.email, firstName: acc.firstName, lastName: acc.lastName }, acc.address || {}) : {});
  DRAFT_FIELDS.forEach(k => { if (prefill[k]) form.elements[k].value = prefill[k]; });

  $('[data-account-hint]').innerHTML = acc
    ? `<p class="account-hint">${icon('user')}<span>Connecté en tant que <strong>${esc(acc.firstName)}</strong> (${esc(acc.email)}).</span></p>`
    : `<p class="account-hint">${icon('user')}<span>Déjà client ? <a href="auth.html?next=checkout">Connectez-vous</a> pour retrouver votre adresse et suivre vos commandes.</span></p>`;
  if (acc) $('[data-save-address]').innerHTML = `<label class="check" style="margin-top:30px"><input type="checkbox" name="saveAddress" checked>Enregistrer cette adresse dans mon compte</label>`;

  // Brouillon des coordonnées (jamais les données de carte)
  form.addEventListener('input', e => {
    if (!DRAFT_FIELDS.includes(e.target.name)) return;
    const d = {};
    DRAFT_FIELDS.forEach(k => { d[k] = form.elements[k].value; });
    L.store.set('checkoutDraft', d);
  });

  /* ---------- Modes de livraison ---------- */
  let shipping = 'standard';
  function renderShipping() {
    const t = L.totals({ shipping });
    $('[data-shipping]').innerHTML = L.SHIPPING.map(m => {
      const eta = L.eta(m.id, t.hasRx);
      const free = m.free && t.afterDiscount >= m.free;
      return `<label class="choice">
        <input type="radio" name="shipping" value="${m.id}"${m.id === shipping ? ' checked' : ''}>
        <span class="choice-mark"></span>
        <span class="choice-body"><strong>${m.name}</strong><small>${m.desc} · arrivée entre le ${L.shortDate(eta.min)} et le ${L.shortDate(eta.max)}</small></span>
        <span class="choice-price${free ? ' is-free' : ''}">${free ? 'Gratuite' : money(m.price, true)}</span></label>`;
    }).join('');
  }

  /* ---------- Récapitulatif ---------- */
  function renderSummary() {
    const t = L.totals({ province: provSel.value, shipping });
    $('[data-summary]').innerHTML = `
      <h2>Votre commande</h2>
      <div class="summary-items">${t.lines.map(({ line, info }) => `
        <div class="summary-item">
          <span class="line-thumb">${L.frameSVG(info.p, line.color, { label: false })}<b>${line.qty}</b></span>
          <span><strong>${esc(info.p.name)}</strong><small>${esc(info.c.name)} · ${esc(info.lens.name)}${info.addons.map(a => ' · ' + esc(a.name)).join('')}</small></span>
          <span>${money(info.total, true)}</span>
        </div>`).join('')}
      </div>
      <div class="sum-row"><span>Sous-total</span><span>${money(t.subtotal, true)}</span></div>
      ${t.promo && t.promo.amount ? `<div class="sum-row is-promo"><span>${icon('tag')}Rabais ${esc(t.promo.code)}</span><span>−${money(t.discount, true)}</span></div>` : ''}
      <div class="sum-row"><span>${esc(t.method.name)}</span><span>${t.shipping ? money(t.shipping, true) : 'Gratuite'}</span></div>
      ${t.taxes.map(x => `<div class="sum-row"><span>${x.name} (${String(x.rate).replace('.', ',')} %)</span><span>${money(x.amount, true)}</span></div>`).join('')}
      <div class="sum-row is-total"><span>Total</span><span>${money(t.total, true)}</span></div>
      <p class="muted" style="font-size:13px;margin:6px 0 0">Montants en dollars canadiens, taxes de ${esc(L.PROVINCES[provSel.value].name)} incluses.</p>
      <a class="link-btn" href="cart.html" style="display:inline-block;margin-top:14px">Modifier le panier</a>`;
    $('[data-pay]').innerHTML = `${icon('lock')}Payer ${money(t.total, true)}`;
  }

  /* ---------- Mise en forme des champs de carte ---------- */
  form.cardNumber.addEventListener('input', e => {
    const n = digits(e.target.value).slice(0, 16);
    const amex = brandOf(n) === 'Amex';
    e.target.value = amex ? n.replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*/, (m, a, b, c) => [a, b, c].filter(Boolean).join(' ')) : n.replace(/(\d{4})(?=\d)/g, '$1 ');
    $('[data-card-brand]').textContent = brandOf(n);
  });
  form.cardExp.addEventListener('input', e => {
    let n = digits(e.target.value).slice(0, 4);
    if (n.length === 1 && +n > 1) n = '0' + n;
    e.target.value = n.length > 2 ? `${n.slice(0, 2)} / ${n.slice(2)}` : n;
  });
  form.cardCvc.addEventListener('input', e => { e.target.value = digits(e.target.value).slice(0, 4); });
  form.postal.addEventListener('blur', e => {
    const v = e.target.value.replace(/\s+/g, '').toUpperCase();
    if (v.length === 6) e.target.value = v.slice(0, 3) + ' ' + v.slice(3);
  });

  form.addEventListener('change', e => {
    if (e.target.name === 'shipping') { shipping = e.target.value; renderSummary(); }
    if (e.target.name === 'province') { renderSummary(); L.setError(form.postal, ''); }
    if (e.target.name === 'terms') $('[data-terms-error]').textContent = '';
  });

  /* ---------- Envoi de la commande ---------- */
  function postalMatchesProvince() {
    const first = form.postal.value.trim().charAt(0).toUpperCase();
    return !first || L.PROVINCES[provSel.value].postal.includes(first);
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = L.validateForm(form);
    if (ok && !postalMatchesProvince()) {
      L.setError(form.postal, `Ce code postal ne correspond pas à la province (${L.PROVINCES[provSel.value].name}).`);
      form.postal.focus();
      ok = false;
    }
    if (ok && !form.terms.checked) {
      $('[data-terms-error]').textContent = 'Veuillez accepter les conditions de vente pour continuer.';
      form.terms.focus();
      ok = false;
    }
    if (!ok) { L.toast('Vérifiez les champs indiqués.', { type: 'error' }); return; }

    const btn = $('[data-pay]');
    btn.classList.add('is-loading');
    document.body.insertAdjacentHTML('beforeend', `<div class="processing" role="alert" aria-live="assertive">
      <div class="moon-loader" aria-hidden="true"></div><p>Paiement en cours…</p><small>Ne fermez pas cette page.</small></div>`);

    const val = n => form.elements[n].value.trim();
    const num = digits(val('cardNumber'));
    setTimeout(() => {
      const address = { address1: val('address1'), address2: val('address2'), city: val('city'), province: provSel.value, postal: val('postal').toUpperCase(), phone: val('phone') };
      if (form.newsletter.checked) L.subscribe(val('email').toLowerCase());
      if (acc && form.elements.saveAddress && form.elements.saveAddress.checked) L.account.update({ address });
      const order = L.orders.place({
        email: val('email'),
        contact: { firstName: val('firstName'), lastName: val('lastName'), phone: val('phone') },
        address,
        shipping,
        payment: { brand: brandOf(num), last4: num.slice(-4) }
      });
      location.href = `order.html?id=${order.id}&new=1`;
    }, 1800);
  });

  L.on('cart', () => {
    if (!L.cart.count()) return;
    renderShipping();
    renderSummary();
  });
  renderShipping();
  renderSummary();
});
