/* Lunaria — fiche produit : couleurs, verres, ordonnance, galerie 3D, avis */
Lunaria.ready(function () {
  'use strict';
  const L = Lunaria;
  const { $, $$, esc, money, icon } = L;
  const root = $('[data-product-root]');
  const params = L.params();
  // Les anciens liens « product.html » sans identifiant mènent à Ambre
  const p = L.getProduct(params.get('id') || 'ambre');

  if (!p) {
    root.innerHTML = `<section class="section"><div class="empty">
      <div class="empty-moon" aria-hidden="true"></div>
      <h1 class="h2">Cette monture s’est éclipsée</h1>
      <p>Le modèle demandé n’existe pas ou n’est plus offert.</p>
      <a class="btn" href="catalog-list.html">Voir toutes les lunettes</a></div></section>`;
    return;
  }

  const lenses = L.LENSES[p.type];
  const addons = L.ADDONS[p.type];
  const state = {
    color: L.color(p, params.get('color')).id,
    lens: lenses[0].id,
    addons: [],
    rxMode: 'later',
    qty: 1,
    view: 'face'
  };

  document.title = `${p.name} — ${L.TYPES[p.type]} | Lunaria`;
  const meta = $('meta[name="description"]');
  if (meta) meta.content = `${p.name} : ${p.description}`;
  L.recent.push(p.id);

  /* ---------- Ordonnance : valeurs proposées ---------- */
  const fmtDiopter = v => (v > 0 ? '+' : '') + v.toFixed(2).replace('.', ',');
  const range = (from, to, step) => { const out = []; for (let v = from; v <= to + 1e-9; v += step) out.push(Math.round(v * 100) / 100); return out; };
  const sphOpts = range(-10, 6, 0.25).map(v => `<option value="${v}"${v === 0 ? ' selected' : ''}>${fmtDiopter(v)}</option>`).join('');
  const cylOpts = range(-4, 0, 0.25).reverse().map(v => `<option value="${v}">${fmtDiopter(v)}</option>`).join('');
  const axeOpts = '<option value="">—</option>' + range(1, 180, 1).map(v => `<option value="${v}">${v}°</option>`).join('');
  const epOpts = range(50, 75, 1).map(v => `<option value="${v}"${v === 63 ? ' selected' : ''}>${v} mm</option>`).join('');
  const rxRow = (eye, label) => `<tr><th scope="row">${label}</th>
      <td><select class="field-select" name="${eye}-sph" aria-label="${label} sphère">${sphOpts}</select></td>
      <td><select class="field-select" name="${eye}-cyl" aria-label="${label} cylindre">${cylOpts}</select></td>
      <td><select class="field-select" name="${eye}-axe" aria-label="${label} axe">${axeOpts}</select></td></tr>`;

  /* ---------- Gabarit ---------- */
  const stats = L.reviews.stats(p.id);
  const collection = p.tags.includes('responsable') ? ' · Collection responsable' : '';
  const typeLink = `catalog-list.html?type=${p.type}`;

  root.innerHTML = `
  <section class="section is-tight">
    <div class="wrap">
      <nav class="crumbs is-dark" aria-label="Fil d’Ariane">
        <a href="index.html">Accueil</a><span aria-hidden="true">/</span>
        <a href="${typeLink}">${L.TYPES[p.type]}</a><span aria-hidden="true">/</span>
        <span aria-current="page">${esc(p.name)}</span>
      </nav>
      <div class="product">
        <div class="gallery">
          <div class="stage" data-stage>
            <span class="stage-moon" aria-hidden="true"></span>
            <div class="stage-frame" data-view="face" data-stage-frame></div>
            <div class="card-tags">${L.badges(p)}</div>
            <button class="wish-btn is-lg" type="button" data-wish="${p.id}" aria-label="Ajouter ${esc(p.name)} aux favoris">${icon('heart')}</button>
            <span class="stage-hint" data-stage-hint>Survolez pour faire pivoter</span>
          </div>
          <div class="thumbs" role="group" aria-label="Vues">
            <button type="button" class="is-on" data-thumb="face" aria-label="Vue de face"><span></span></button>
            <button type="button" data-thumb="profil" aria-label="Vue de trois quarts"><span></span></button>
            <button type="button" data-thumb="detail" aria-label="Vue de détail"><span></span></button>
          </div>
        </div>

        <div class="buy">
          <p class="kicker">${p.type === 'optique' ? 'Optique' : 'Solaire'}${collection}</p>
          <h1>${esc(p.name)}</h1>
          <a class="rating-link" href="#avis">${L.stars(stats.avg)} ${String(stats.avg).replace('.', ',')} · ${stats.count} avis</a>
          <p class="price-lg">${L.priceHTML(p)} ${p.compareAt ? `<span class="tag is-sale">Économisez ${money(p.compareAt - p.price)}</span>` : '<small>monture et verres antireflet</small>'}</p>
          <p class="lead">${esc(p.description)}</p>

          <div class="opt-block">
            <div class="opt-head"><h2>Couleur</h2><span data-color-name></span></div>
            <div class="swatches is-lg" role="radiogroup" aria-label="Couleur">
              ${p.colors.map(c => `<button type="button" role="radio" class="swatch" data-color="${c.id}" style="${L.swatchStyle(c)}" aria-label="${esc(c.name)}" title="${esc(c.name)}"></button>`).join('')}
            </div>
          </div>

          <div class="opt-block">
            <div class="opt-head"><h2>Verres</h2><a href="aide.html#ordonnance">Comment lire mon ordonnance ?</a></div>
            <div class="choice-list" role="radiogroup" aria-label="Type de verres">
              ${lenses.map((l, i) => `<label class="choice">
                <input type="radio" name="lens" value="${l.id}"${i === 0 ? ' checked' : ''}>
                <span class="choice-mark"></span>
                <span class="choice-body"><strong>${l.name}</strong><small>${l.desc}</small></span>
                <span class="choice-price${l.price ? '' : ' is-free'}">${l.price ? '+ ' + money(l.price) : 'Inclus'}</span></label>`).join('')}
            </div>
            <div class="rx-panel" data-rx hidden>
              <div class="seg" role="radiogroup" aria-label="Ordonnance">
                <label><input type="radio" name="rxmode" value="later" checked><span>L’envoyer plus tard</span></label>
                <label><input type="radio" name="rxmode" value="now"><span>La saisir maintenant</span></label>
              </div>
              <div data-rx-later>
                <p class="rx-note">${icon('mail')}<span>Après votre commande, envoyez une photo de votre ordonnance (moins de 2 ans) à <strong>ordonnances@lunaria.ca</strong> avec votre numéro de commande. Nos opticiens la vérifient avant le taillage.</span></p>
              </div>
              <div data-rx-now hidden>
                <table class="rx-table">
                  <thead><tr><th></th><th>SPH</th><th>CYL</th><th>AXE</th></tr></thead>
                  <tbody>${rxRow('od', 'OD (droit)')}${rxRow('og', 'OG (gauche)')}</tbody>
                </table>
                <div class="field" style="margin-top:10px;max-width:220px">
                  <label for="ep">Écart pupillaire (EP)</label>
                  <select id="ep" name="ep">${epOpts}</select>
                </div>
                <p class="rx-note" data-rx-error hidden style="color:var(--danger)">${icon('alert')}<span></span></p>
                <p class="rx-note">${icon('shield')}<span>Un opticien valide chaque ordonnance avant le taillage des verres.</span></p>
              </div>
            </div>
          </div>

          <div class="opt-block">
            <div class="opt-head"><h2>Options</h2></div>
            <div class="choice-list">
              ${addons.map(a => `<label class="choice is-check">
                <input type="checkbox" name="addon" value="${a.id}"${a.rxOnly ? ' data-rx-only disabled' : ''}>
                <span class="choice-mark"></span>
                <span class="choice-body"><strong>${a.name}</strong><small>${a.desc}${a.rxOnly ? ' · avec verres correcteurs' : ''}</small></span>
                <span class="choice-price">+ ${money(a.price)}</span></label>`).join('')}
            </div>
          </div>

          <div class="buy-row">
            <div class="qty is-lg" role="group" aria-label="Quantité">
              <button type="button" data-pqty="-1" aria-label="Diminuer la quantité">${icon('minus')}</button>
              <span data-pqty-val aria-live="polite">1</span>
              <button type="button" data-pqty="1" aria-label="Augmenter la quantité">${icon('plus')}</button>
            </div>
            <button type="button" class="btn btn-lg" data-add>${icon('bag')}<span data-add-label>Ajouter au panier</span></button>
          </div>
          <p class="stock-line" data-stock></p>
          <p class="eta-line" data-eta></p>
          <div data-notify></div>
          <ul class="perks">
            <li>${icon('truck')}Livraison gratuite dès 100 $</li>
            <li>${icon('refresh')}Retours gratuits 30 jours</li>
            <li>${icon('shield')}Garantie 2 ans</li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <section class="section is-tint">
    <div class="wrap details-grid">
      <div data-reveal>
        <h2 class="section-head is-left" style="margin-bottom:24px;font-size:42px">Dans le détail</h2>
        <div class="accordion">
          <details open>
            <summary>Caractéristiques ${icon('chevron')}</summary>
            <div class="acc-body"><ul>${p.features.map(f => `<li>${esc(f)}</li>`).join('')}
              <li>Matériau : ${L.MATERIALS[p.material]}</li><li>Forme : ${L.SHAPES[p.shape].label}</li><li>Pour : ${p.gender}</li></ul></div>
          </details>
          <details>
            <summary>Verres et traitements ${icon('chevron')}</summary>
            <div class="acc-body"><p>Tous nos verres sont antireflet, anti-rayures et filtrent 100 % des UV. ${p.type === 'solaire' ? 'Les verres solaires sont de catégorie 3, adaptés au plein soleil.' : 'Ajoutez un filtre lumière bleue pour plus de confort devant les écrans.'}</p>
            <p>Les verres correcteurs sont taillés dans notre atelier partenaire : comptez 3 jours ouvrables de plus avant l’expédition.</p></div>
          </details>
          <details>
            <summary>Livraison et retours ${icon('chevron')}</summary>
            <div class="acc-body"><p>Livraison standard gratuite dès 100 $ (9,95 $ sinon), express en 1 à 2 jours ouvrables pour 19,95 $. Vous avez 30 jours pour changer d’avis : le retour est gratuit, sauf pour les verres correcteurs taillés sur mesure. <a href="aide.html#retours" style="text-decoration:underline">En savoir plus</a></p></div>
          </details>
        </div>
      </div>
      <div class="dims" data-reveal style="--d:120ms">
        <h3>Dimensions</h3>
        <svg class="dims-svg" viewBox="0 0 320 140" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <rect x="16" y="26" width="122" height="72" rx="28"/><rect x="182" y="26" width="122" height="72" rx="28"/>
          <path d="M138 46q22-16 44 0"/>
          <g stroke="#BF947A" stroke-width="1.5"><path d="M16 116h122M16 110v12M138 110v12M140 12h40M140 6v12M180 6v12"/></g>
          <g fill="#5d6b76" stroke="none" font-family="Jost, sans-serif" font-size="12" text-anchor="middle">
            <text x="77" y="136">verre ${p.dims.lens} mm</text><text x="160" y="32">pont ${p.dims.bridge}</text></g>
        </svg>
        <dl>
          <div><dt>Verre</dt><dd>${p.dims.lens}</dd></div>
          <div><dt>Pont</dt><dd>${p.dims.bridge}</dd></div>
          <div><dt>Branche</dt><dd>${p.dims.temple}</dd></div>
        </dl>
        <div class="dims-meta"><span class="pill">Largeur ${p.fit.toLowerCase()}</span><span class="pill">${L.MATERIALS[p.material]}</span><span class="pill">${L.SHAPES[p.shape].label}</span></div>
      </div>
    </div>
  </section>

  <section class="section" id="avis">
    <div class="wrap">
      <div class="section-head is-left" data-reveal><p class="kicker">Avis clients</p><h2>Ce qu’en pensent nos clients</h2></div>
      <div class="reviews" data-reviews></div>
    </div>
  </section>

  <section class="section is-tint">
    <div class="wrap">
      <div class="section-head" data-reveal><p class="kicker">À découvrir</p><h2>Vous aimerez aussi</h2></div>
      <div class="grid is-4" data-related></div>
    </div>
  </section>

  <section class="section" data-recent-section hidden>
    <div class="wrap">
      <div class="section-head is-left" data-reveal><h2 style="font-size:36px">Vus récemment</h2></div>
      <div class="grid is-4" data-recent></div>
    </div>
  </section>

  <div class="sticky-buy" data-sticky aria-hidden="true">
    <div class="wrap">
      <span class="sticky-buy-thumb" data-sticky-thumb></span>
      <div><strong>${esc(p.name)}</strong><small data-sticky-opts></small></div>
      <button type="button" class="btn" data-add tabindex="-1">${icon('bag')}<span data-add-label>Ajouter</span></button>
    </div>
  </div>`;

  const stageFrame = $('[data-stage-frame]');
  const stage = $('[data-stage]');

  /* ---------- Rendu dynamique ---------- */
  const lensObj = () => lenses.find(l => l.id === state.lens);
  const unitPrice = () => p.price + lensObj().price + state.addons.reduce((s, id) => s + addons.find(a => a.id === id).price, 0);

  function renderFrames(animate) {
    const draw = () => {
      stageFrame.innerHTML = L.frameSVG(p, state.color);
      $$('[data-thumb] > span').forEach(s => { s.innerHTML = L.frameSVG(p, state.color, { label: false }); });
      $('[data-sticky-thumb]').innerHTML = L.frameSVG(p, state.color, { label: false });
      stageFrame.classList.remove('is-swapping');
    };
    if (!animate) return draw();
    stageFrame.classList.add('is-swapping');
    setTimeout(draw, 220);
  }

  function renderColor() {
    const c = L.color(p, state.color);
    $('[data-color-name]').textContent = c.name;
    $$('[data-color]').forEach(b => {
      const on = b.dataset.color === state.color;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', on);
    });
  }

  function renderBuy() {
    const lens = lensObj();
    const stock = L.stock(p.id);
    const room = stock - L.cart.qtyOf(p.id);
    state.qty = Math.max(1, Math.min(state.qty, Math.max(1, room)));
    $('[data-pqty-val]').textContent = state.qty;
    $('[data-pqty="-1"]').disabled = state.qty <= 1;
    $('[data-pqty="1"]').disabled = state.qty >= room;

    // Options réservées aux verres correcteurs
    $$('[data-rx-only]').forEach(i => {
      i.disabled = !lens.rx;
      if (!lens.rx && i.checked) { i.checked = false; state.addons = state.addons.filter(a => a !== i.value); }
    });
    const rx = $('[data-rx]');
    if (lens.rx && rx.hidden) { rx.hidden = false; rx.style.animation = 'none'; void rx.offsetWidth; rx.style.animation = ''; }
    if (!lens.rx) rx.hidden = true;
    $('[data-rx-later]').hidden = state.rxMode !== 'later';
    $('[data-rx-now]').hidden = state.rxMode !== 'now';

    const total = unitPrice() * state.qty;
    const out = stock <= 0;
    $$('[data-add]').forEach(b => { b.disabled = out || room <= 0; });
    $('.buy [data-add-label]').textContent = out ? 'Épuisé' : room <= 0 ? 'Stock maximal dans le panier' : `Ajouter au panier · ${money(total, !Number.isInteger(total))}`;
    $('.sticky-buy [data-add-label]').textContent = out ? 'Épuisé' : `Ajouter · ${money(total, !Number.isInteger(total))}`;
    $('[data-sticky-opts]').textContent = `${L.color(p, state.color).name} · ${lens.name}`;

    const stockEl = $('[data-stock]');
    stockEl.className = 'stock-line' + (out ? ' is-out' : stock <= 5 ? ' is-low' : '');
    stockEl.textContent = out
      ? `Épuisé — retour prévu ${p.restock || 'bientôt'}`
      : stock <= 5 ? `Plus que ${stock} en stock — commandez bientôt` : `En stock — expédié ${lens.rx ? 'après le taillage des verres' : 'sous 24 h'}`;

    const eta = L.eta('standard', lens.rx);
    $('[data-eta]').innerHTML = out ? '' : `${icon('truck')}<span>Commandez aujourd’hui et recevez-les entre le <strong>${L.shortDate(eta.min)}</strong> et le <strong>${L.shortDate(eta.max)}</strong>${lens.rx ? ' (taillage des verres inclus)' : ''}.</span>`;

    const notify = $('[data-notify]');
    if (out && !notify.innerHTML) {
      notify.innerHTML = `<div class="notify"><p>Recevez un courriel dès que ${esc(p.name)} est de retour.</p>
        <form class="inline-form" data-notify-form novalidate><label class="sr-only" for="notify-email">Courriel</label>
        <input id="notify-email" type="email" placeholder="Votre courriel" required><button class="btn btn-sm" type="submit">M’avertir</button></form></div>`;
    }
  }

  /* ---------- Ordonnance ---------- */
  function readRx() {
    if (!lensObj().rx) return null;
    if (state.rxMode === 'later') return { mode: 'later' };
    const val = n => $(`[name="${n}"]`, root).value;
    const eye = e => ({ sph: +val(e + '-sph'), cyl: +val(e + '-cyl'), axe: val(e + '-axe') ? +val(e + '-axe') : null });
    return { mode: 'now', od: eye('od'), og: eye('og'), ep: +val('ep') };
  }

  function rxError(rx) {
    if (!rx || rx.mode !== 'now') return '';
    for (const [k, label] of [['od', 'droit'], ['og', 'gauche']]) {
      if (rx[k].cyl !== 0 && !rx[k].axe) return `Indiquez l’axe de l’œil ${label} (requis lorsque le cylindre n’est pas 0,00).`;
    }
    if (rx.od.sph === 0 && rx.od.cyl === 0 && rx.og.sph === 0 && rx.og.cyl === 0) return 'Votre ordonnance est vide : choisissez « Sans correction » ou saisissez vos valeurs.';
    return '';
  }

  /* ---------- Ajout au panier ---------- */
  function add() {
    const rx = readRx();
    const err = rxError(rx);
    const errEl = $('[data-rx-error]');
    errEl.hidden = !err;
    $('span', errEl).textContent = err;
    if (err) {
      $('[data-rx]').scrollIntoView({ behavior: L.reduceMotion ? 'auto' : 'smooth', block: 'center' });
      L.toast(esc(err), { type: 'error' });
      return;
    }
    const res = L.addToCart({ id: p.id, color: state.color, lens: state.lens, addons: state.addons.slice(), rx, qty: state.qty }, stageFrame);
    if (res.ok) { state.qty = 1; renderBuy(); }
  }

  /* ---------- Événements ---------- */
  root.addEventListener('click', e => {
    const sw = e.target.closest('[data-color]');
    if (sw && sw.dataset.color !== state.color) {
      state.color = sw.dataset.color;
      renderColor();
      renderFrames(true);
      renderBuy();
      history.replaceState(null, '', `?id=${p.id}&color=${state.color}`);
      return;
    }
    const thumb = e.target.closest('[data-thumb]');
    if (thumb) {
      state.view = thumb.dataset.thumb;
      $$('[data-thumb]').forEach(t => t.classList.toggle('is-on', t === thumb));
      stageFrame.style.transform = '';
      stageFrame.dataset.view = state.view;
      $('[data-stage-hint]').hidden = state.view !== 'face';
      return;
    }
    const q = e.target.closest('[data-pqty]');
    if (q) { state.qty += +q.dataset.pqty; renderBuy(); return; }
    if (e.target.closest('[data-add]')) add();
  });

  root.addEventListener('change', e => {
    const t = e.target;
    if (t.name === 'lens') state.lens = t.value;
    if (t.name === 'addon') state.addons = $$('input[name="addon"]:checked', root).map(i => i.value);
    if (t.name === 'rxmode') state.rxMode = t.value;
    if (t.name === 'lens' || t.name === 'addon' || t.name === 'rxmode') renderBuy();
    if (/-(sph|cyl|axe)$|^ep$/.test(t.name)) $('[data-rx-error]').hidden = true;
  });

  root.addEventListener('submit', e => {
    const f = e.target.closest('[data-notify-form]');
    if (!f) return;
    e.preventDefault();
    const input = $('input', f);
    if (L.validators.email(input.value)) { L.toast('Entrez une adresse courriel valide.', { type: 'error' }); input.focus(); return; }
    const list = L.store.get('restock', []);
    list.push({ id: p.id, email: input.value.trim().toLowerCase(), date: new Date().toISOString() });
    L.store.set('restock', list);
    f.parentElement.innerHTML = `<p style="margin:0">${icon('check')} C’est noté ! Nous vous écrirons dès le retour de ${esc(p.name)}.</p>`;
  });

  // Rotation 3D de la monture au survol
  if (!L.reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    stage.addEventListener('mousemove', e => {
      if (state.view !== 'face') return;
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      stageFrame.style.transform = `rotateY(${(x * 36).toFixed(1)}deg) rotateX(${(-y * 14).toFixed(1)}deg) scale(1.03)`;
    });
    stage.addEventListener('mouseleave', () => { stageFrame.style.transform = ''; });
  } else {
    $('[data-stage-hint]').hidden = true;
  }

  /* ---------- Avis ---------- */
  function renderReviews() {
    const s = L.reviews.stats(p.id);
    const list = L.reviews.list(p.id).slice(0, 5);
    const d5 = Math.round(Math.max(5, Math.min(92, (s.avg - 3.6) * 70)));
    const d4 = Math.round((100 - d5) * 0.65);
    const d3 = Math.round((100 - d5 - d4) * 0.6);
    const d2 = Math.round((100 - d5 - d4 - d3) * 0.6);
    const dist = [d5, d4, d3, d2, 100 - d5 - d4 - d3 - d2];
    $('[data-reviews]').innerHTML = `
      <aside class="review-summary" data-reveal>
        <div class="review-score">${String(s.avg).replace('.', ',')}</div>
        ${L.stars(s.avg)}
        <p class="muted" style="margin:8px 0 0">Basé sur ${s.count} avis</p>
        <div class="review-bars">${dist.map((v, i) => `<div><span>${5 - i}★</span><span class="meter"><span style="width:${v}%"></span></span><span>${v} %</span></div>`).join('')}</div>
        <button type="button" class="btn btn-ghost btn-block" data-review-open>Écrire un avis</button>
      </aside>
      <div>
        <div data-review-form-slot></div>
        <div class="review-list">${list.map(r => `
          <article class="review">
            <div class="review-head">${L.stars(r.rating)}<span class="review-meta">${L.date(r.date)}</span></div>
            <h4>${esc(r.title)}</h4>
            <p>${esc(r.text)}</p>
            <p class="review-meta" style="margin-top:10px"><strong>${esc(r.name)}</strong>${r.city ? ' · ' + esc(r.city) : ''} · ${r.mine ? 'Votre avis' : `<span class="verified">${icon('check')}Achat vérifié</span>`}</p>
          </article>`).join('')}</div>
      </div>`;
    L.reveal($('[data-reviews]'));
  }

  function reviewForm() {
    const slot = $('[data-review-form-slot]');
    if (slot.innerHTML) { $('input, textarea', slot).focus(); return; }
    const acc = L.account.current();
    slot.innerHTML = `<form class="review-form" data-review-form novalidate>
      <h3 style="font:600 26px var(--serif)">Votre avis sur ${esc(p.name)}</h3>
      <div class="field" style="margin-bottom:14px"><span class="label">Votre note</span>
        <div class="star-input" role="radiogroup" aria-label="Note">
          ${[5, 4, 3, 2, 1].map(n => `<input type="radio" name="rating" id="r${n}" value="${n}"><label for="r${n}" aria-label="${n} sur 5">${icon('star')}</label>`).join('')}
        </div></div>
      <div class="field-grid">
        <div class="field"><label for="rv-name">Prénom et initiale</label><input id="rv-name" name="name" data-validate="required" value="${acc ? esc(acc.firstName + ' ' + acc.lastName.charAt(0) + '.') : ''}"></div>
        <div class="field"><label for="rv-title">Titre</label><input id="rv-title" name="title" data-validate="required" maxlength="60"></div>
        <div class="field is-full"><label for="rv-text">Votre expérience</label><textarea id="rv-text" name="text" data-validate="required" maxlength="600"></textarea></div>
      </div>
      <div style="display:flex;gap:10px;margin-top:16px"><button class="btn" type="submit">Publier mon avis</button><button class="btn btn-ghost" type="button" data-review-cancel>Annuler</button></div>
    </form>`;
    $('[data-review-form]', slot).scrollIntoView({ behavior: L.reduceMotion ? 'auto' : 'smooth', block: 'center' });
  }

  $('[data-reviews]').addEventListener('click', e => {
    if (e.target.closest('[data-review-open]')) reviewForm();
    if (e.target.closest('[data-review-cancel]')) $('[data-review-form-slot]').innerHTML = '';
  });
  $('[data-reviews]').addEventListener('submit', e => {
    const f = e.target.closest('[data-review-form]');
    if (!f) return;
    e.preventDefault();
    const rating = $('input[name="rating"]:checked', f);
    if (!rating) { L.toast('Choisissez une note de 1 à 5 étoiles.', { type: 'error' }); return; }
    if (!L.validateForm(f)) return;
    const field = n => f.elements[n].value.trim();
    L.reviews.add(p.id, { rating: +rating.value, name: field('name'), title: field('title'), text: field('text') });
    renderReviews();
    L.toast('Merci ! Votre avis a été publié.', { icon: 'star' });
  });

  /* ---------- Suggestions ---------- */
  const related = L.products.filter(x => x.id !== p.id && x.type === p.type)
    .concat(L.products.filter(x => x.id !== p.id && x.type !== p.type)).slice(0, 4);
  L.renderGrid($('[data-related]'), related);
  const recent = L.recent.list(p.id).slice(0, 4);
  if (recent.length) {
    $('[data-recent-section]').hidden = false;
    L.renderGrid($('[data-recent]'), recent);
  }

  /* ---------- Barre d’achat collante ---------- */
  const sticky = $('[data-sticky]');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => {
      const show = !en.isIntersecting && en.boundingClientRect.top < 0;
      sticky.classList.toggle('is-on', show);
      sticky.setAttribute('aria-hidden', !show);
      $('[data-add]', sticky).tabIndex = show ? 0 : -1;
      document.body.classList.toggle('has-sticky', show);
    }).observe($('.buy-row'));
  }

  L.on('cart', renderBuy);

  renderColor();
  renderFrames(false);
  renderBuy();
  renderReviews();
  L.reveal(root);
});
