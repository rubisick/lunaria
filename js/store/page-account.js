/* Lunaria — compte client : connexion, inscription, commandes, adresse */
Lunaria.ready(function () {
  'use strict';
  const L = Lunaria;
  const { $, $$, esc, money, icon } = L;
  const root = $('[data-account-root]');
  const next = L.params().get('next');
  let tab = L.params().get('tab') === 'register' ? 'register' : 'login';

  /* ---------- Connexion / inscription ---------- */
  function renderAuth() {
    root.innerHTML = `
      <div class="auth" data-reveal>
        <div class="auth-side">
          <p class="kicker is-light">Espace client</p>
          <h2>Bienvenue dans l’univers Lunaria</h2>
          <p>Un compte vous permet de passer commande plus rapidement et de suivre chaque étape de la livraison.</p>
          <ul>
            <li>${icon('box')}Suivi de vos commandes</li>
            <li>${icon('pin')}Adresse enregistrée pour la caisse</li>
            <li>${icon('heart')}Vos favoris sur ce navigateur</li>
            <li>${icon('tag')}15 % sur votre première commande</li>
          </ul>
        </div>
        <div class="auth-main">
          <div class="auth-tabs" role="tablist">
            <button type="button" role="tab" data-auth-tab="login" aria-selected="${tab === 'login'}">Connexion</button>
            <button type="button" role="tab" data-auth-tab="register" aria-selected="${tab === 'register'}">Créer un compte</button>
          </div>
          ${tab === 'login' ? `
          <form data-login novalidate>
            <div class="field"><label for="li-email">Courriel</label><input id="li-email" name="email" type="email" autocomplete="email" data-validate="required email"></div>
            <div class="field"><label for="li-pw">Mot de passe</label><input id="li-pw" name="password" type="password" autocomplete="current-password" data-validate="required"></div>
            <p class="form-msg is-error" data-auth-msg></p>
            <button class="btn btn-lg btn-block" type="submit">Se connecter</button>
            <p class="muted" style="font-size:14px;margin:0">Pas encore de compte ? <button type="button" class="link-btn" data-auth-tab="register">Créez-en un</button></p>
          </form>` : `
          <form data-register novalidate>
            <div class="field-grid">
              <div class="field"><label for="rg-first">Prénom</label><input id="rg-first" name="firstName" autocomplete="given-name" data-validate="required"></div>
              <div class="field"><label for="rg-last">Nom</label><input id="rg-last" name="lastName" autocomplete="family-name" data-validate="required"></div>
            </div>
            <div class="field"><label for="rg-email">Courriel</label><input id="rg-email" name="email" type="email" autocomplete="email" data-validate="required email"></div>
            <div class="field"><label for="rg-pw">Mot de passe</label><input id="rg-pw" name="password" type="password" autocomplete="new-password" data-validate="required password"><p class="field-hint">8 caractères minimum.</p></div>
            <label class="check"><input type="checkbox" name="newsletter" checked>Recevoir l’infolettre et mon code de bienvenue</label>
            <p class="form-msg is-error" data-auth-msg></p>
            <button class="btn btn-lg btn-block" type="submit">Créer mon compte</button>
          </form>`}
          <p class="auth-note">${icon('lock')}<span>Démo : votre compte est conservé uniquement dans ce navigateur. Un site en ligne enregistrerait ces données sur un serveur sécurisé.</span></p>
        </div>
      </div>`;
    L.reveal(root);
  }

  /* ---------- Tableau de bord ---------- */
  function renderDash(acc) {
    const orders = L.orders.forEmail(acc.email);
    const a = acc.address || {};
    const provOpts = Object.keys(L.PROVINCES).map(k => `<option value="${k}"${(a.province || 'QC') === k ? ' selected' : ''}>${L.PROVINCES[k].name}</option>`).join('');
    root.innerHTML = `
      <div class="dash">
        <aside class="dash-side">
          <div class="dash-user"><span class="avatar">${esc(acc.firstName.charAt(0))}</span><div><strong>${esc(acc.firstName)} ${esc(acc.lastName)}</strong><small>${esc(acc.email)}</small></div></div>
          <nav class="dash-nav" aria-label="Mon compte">
            <a href="#commandes">${icon('box')}Mes commandes</a>
            <a href="#adresse">${icon('pin')}Mon adresse</a>
            <a href="wishlist.html">${icon('heart')}Mes favoris</a>
            <button type="button" data-logout>${icon('logout')}Se déconnecter</button>
          </nav>
        </aside>
        <div>
          <h1 style="font-size:clamp(36px,4vw,52px);font-weight:500">Bonjour, ${esc(acc.firstName)}</h1>
          <p class="muted" style="margin-bottom:28px">Membre depuis le ${L.date(acc.createdAt)}.</p>

          <div class="panel" id="commandes" data-reveal>
            <h2 class="panel-title">Mes commandes<small>${orders.length} commande${orders.length > 1 ? 's' : ''}</small></h2>
            ${orders.length ? `<div class="order-list">${orders.map(o => {
              const tl = L.orderTimeline(o);
              return `<a class="order-item" href="order.html?id=${o.id}">
                <span class="order-thumbs">${o.items.slice(0, 3).map(i => { const p = L.getProduct(i.id); return `<span>${p ? L.frameSVG(p, i.color, { label: false }) : ''}</span>`; }).join('')}</span>
                <span><strong>${esc(o.id)}</strong><small>${L.date(o.createdAt)} · ${o.items.reduce((s, i) => s + i.qty, 0)} article(s)</small></span>
                <span class="pill ${tl.current === 3 ? 'is-ok' : 'is-info'}">${tl.status}</span>
                <strong>${money(o.total, true)}</strong></a>`;
            }).join('')}</div>`
            : `<div class="empty is-compact"><h3>Aucune commande pour l’instant</h3><p>Vos commandes apparaîtront ici.</p><a class="btn" href="catalog-list.html">Magasiner</a></div>`}
          </div>

          <form class="panel" id="adresse" data-address novalidate data-reveal>
            <h2 class="panel-title">Adresse de livraison<small>Utilisée pour pré-remplir la caisse</small></h2>
            <div class="field-grid">
              <div class="field is-full"><label for="ad-1">Adresse</label><input id="ad-1" name="address1" autocomplete="address-line1" data-validate="required" value="${esc(a.address1 || '')}"></div>
              <div class="field is-full"><label for="ad-2">Appartement <small>(facultatif)</small></label><input id="ad-2" name="address2" autocomplete="address-line2" value="${esc(a.address2 || '')}"></div>
            </div>
            <div class="field-grid is-3" style="margin-top:16px">
              <div class="field"><label for="ad-city">Ville</label><input id="ad-city" name="city" data-validate="required" value="${esc(a.city || '')}"></div>
              <div class="field"><label for="ad-prov">Province</label><select id="ad-prov" name="province">${provOpts}</select></div>
              <div class="field"><label for="ad-postal">Code postal</label><input id="ad-postal" name="postal" data-validate="required postal" maxlength="7" value="${esc(a.postal || '')}"></div>
            </div>
            <div class="field" style="margin-top:16px;max-width:320px"><label for="ad-phone">Téléphone</label><input id="ad-phone" name="phone" type="tel" data-validate="required phone" value="${esc(a.phone || '')}"></div>
            <button class="btn" type="submit" style="margin-top:20px">Enregistrer l’adresse</button>
          </form>
        </div>
      </div>`;
    L.reveal(root);
  }

  function render() {
    const acc = L.account.current();
    if (acc) renderDash(acc); else renderAuth();
  }

  /* ---------- Événements ---------- */
  root.addEventListener('click', e => {
    const t = e.target.closest('[data-auth-tab]');
    if (t) { tab = t.dataset.authTab; renderAuth(); $('input', root).focus(); return; }
    if (e.target.closest('[data-logout]')) { L.account.logout(); L.toast('Vous êtes déconnecté.', { icon: 'logout' }); }
  });

  root.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    const val = n => f.elements.namedItem(n).value;
    const msg = $('[data-auth-msg]', f);
    if (!L.validateForm(f)) return;

    if (f.matches('[data-login]')) {
      const res = L.account.login(val('email'), val('password'));
      if (!res.ok) { msg.innerHTML = icon('alert') + esc(res.error); return; }
      L.toast(`Bon retour, <strong>${esc(L.account.current().firstName)}</strong> !`, { icon: 'moon' });
    } else if (f.matches('[data-register]')) {
      const res = L.account.register({ firstName: val('firstName'), lastName: val('lastName'), email: val('email'), password: val('password') });
      if (!res.ok) { msg.innerHTML = icon('alert') + esc(res.error); return; }
      if (f.elements.namedItem('newsletter').checked) {
        L.subscribe(val('email').trim().toLowerCase());
        L.toast('Compte créé ! Votre code de bienvenue : <strong>BIENVENUE15</strong>', { icon: 'sparkle', duration: 7000 });
      } else L.toast('Votre compte a été créé.', { icon: 'check' });
    } else if (f.matches('[data-address]')) {
      const prov = val('province');
      if (!L.PROVINCES[prov].postal.includes(val('postal').trim().charAt(0).toUpperCase())) {
        L.setError(f.elements.namedItem('postal'), 'Ce code postal ne correspond pas à la province.');
        return;
      }
      L.account.update({ address: { address1: val('address1').trim(), address2: val('address2').trim(), city: val('city').trim(), province: prov, postal: val('postal').trim().toUpperCase(), phone: val('phone').trim() } });
      L.toast('Adresse enregistrée.', { icon: 'pin' });
      return;
    }
    if (next === 'checkout') location.href = 'checkout.html';
  });

  L.on('account', render);
  render();
});
