/* Lunaria — noyau de la boutique.
   État (panier, favoris, codes promo, compte, commandes) conservé dans le navigateur (localStorage),
   en-tête / pied de page partagés, tiroir panier, recherche, notifications et effets. */
(function (L) {
  'use strict';

  document.documentElement.classList.add('js');

  /* ======================================================================
     Utilitaires
     ====================================================================== */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const round = n => Math.round(n * 100) / 100;
  const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const money0 = new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const money2 = new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' });
  const money = (n, exact) => (!exact && Number.isInteger(n) ? money0 : money2).format(n);

  const date = (d, opts) => new Intl.DateTimeFormat('fr-CA', opts || { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d));
  const shortDate = d => date(d, { weekday: 'short', day: 'numeric', month: 'short' });

  function addBusinessDays(from, n) {
    const d = new Date(from);
    let added = 0;
    while (added < n) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) added++;
    }
    return d;
  }

  Object.assign(L, { $, $$, esc, round, norm, money, date, shortDate, addBusinessDays, reduceMotion });
  L.params = () => new URLSearchParams(location.search);
  // Les scripts de page s’exécutent après l’initialisation de la mise en page commune
  L.ready = fn => (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn());
  L.productURL = (p, color) => 'product.html?id=' + p.id + (color ? '&color=' + color : '');

  /* ======================================================================
     Stockage local + événements
     ====================================================================== */
  const PREFIX = 'lunaria.';
  const mem = {};
  const clone = v => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
  const store = {
    get(k, d) {
      if (!(k in mem)) {
        try {
          const raw = localStorage.getItem(PREFIX + k);
          mem[k] = raw ? JSON.parse(raw) : d;
        } catch (e) { mem[k] = d; }
      }
      return clone(mem[k] === undefined ? d : mem[k]);
    },
    set(k, v) {
      mem[k] = clone(v);
      try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch (e) { /* navigation privée : l’état reste en mémoire */ }
    }
  };
  const emit = (name, detail) => document.dispatchEvent(new CustomEvent('lunaria:' + name, { detail }));
  L.on = (name, fn) => document.addEventListener('lunaria:' + name, fn);
  L.store = store;

  // Synchronise les onglets ouverts en même temps
  window.addEventListener('storage', e => {
    if (!e.key || !e.key.startsWith(PREFIX)) return;
    delete mem[e.key.slice(PREFIX.length)];
    ['cart', 'wishlist', 'account'].forEach(n => emit(n));
  });

  /* ======================================================================
     Stock
     ====================================================================== */
  L.stock = id => {
    const p = L.getProduct(id);
    return p ? Math.max(0, p.stock - (store.get('sold', {})[id] || 0)) : 0;
  };

  /* ======================================================================
     Panier
     ====================================================================== */
  function lineKey(line) {
    const rx = line.rx ? JSON.stringify(line.rx) : '';
    return [line.id, line.color, line.lens, (line.addons || []).slice().sort().join('+'), rx].join('|');
  }

  L.lineInfo = function (line) {
    const p = L.getProduct(line.id);
    if (!p) return null;
    const c = L.color(p, line.color);
    const lenses = L.LENSES[p.type];
    const lens = lenses.find(l => l.id === line.lens) || lenses[0];
    const addons = (line.addons || []).map(id => L.ADDONS[p.type].find(a => a.id === id)).filter(Boolean);
    const unit = p.price + lens.price + addons.reduce((s, a) => s + a.price, 0);
    let rxText = '';
    if (lens.rx) rxText = line.rx && line.rx.mode === 'now' ? 'Ordonnance saisie' : 'Ordonnance à envoyer';
    return { p, c, lens, addons, unit, total: unit * line.qty, rxText };
  };

  const cart = {
    items() { return store.get('cart', []).filter(i => L.getProduct(i.id)); },
    save(items) { store.set('cart', items); emit('cart'); },
    count() { return cart.items().reduce((s, i) => s + i.qty, 0); },
    qtyOf(id, exceptKey) { return cart.items().filter(i => i.id === id && i.key !== exceptKey).reduce((s, i) => s + i.qty, 0); },
    add(line) {
      const p = L.getProduct(line.id);
      const room = L.stock(line.id) - cart.qtyOf(line.id);
      if (room <= 0) {
        return { ok: false, message: L.stock(line.id) <= 0 ? `${p.name} est actuellement épuisé.` : `Tout le stock disponible de ${p.name} est déjà dans votre panier.` };
      }
      const wanted = line.qty || 1;
      const qty = Math.min(wanted, room);
      const entry = { id: line.id, color: line.color, lens: line.lens, addons: line.addons || [], rx: line.rx || null };
      entry.key = lineKey(entry);
      const items = cart.items();
      const existing = items.find(i => i.key === entry.key);
      if (existing) existing.qty += qty; else items.push(Object.assign(entry, { qty }));
      cart.save(items);
      return { ok: true, qty, limited: qty < wanted };
    },
    setQty(key, qty) {
      const items = cart.items();
      const line = items.find(i => i.key === key);
      if (!line) return;
      const max = L.stock(line.id) - cart.qtyOf(line.id, key);
      line.qty = Math.max(1, Math.min(qty, max));
      cart.save(items);
      return line.qty;
    },
    remove(key) {
      const items = cart.items();
      const index = items.findIndex(i => i.key === key);
      if (index < 0) return null;
      const [line] = items.splice(index, 1);
      cart.save(items);
      return { line, index };
    },
    restore(removed) {
      const items = cart.items();
      items.splice(removed.index, 0, removed.line);
      cart.save(items);
    },
    clear() { cart.save([]); }
  };
  L.cart = cart;

  /* ======================================================================
     Favoris
     ====================================================================== */
  L.wishlist = {
    ids() { return store.get('wishlist', []).filter(id => L.getProduct(id)); },
    has(id) { return L.wishlist.ids().includes(id); },
    toggle(id) {
      const ids = L.wishlist.ids();
      const i = ids.indexOf(id);
      if (i >= 0) ids.splice(i, 1); else ids.unshift(id);
      store.set('wishlist', ids);
      emit('wishlist');
      return i < 0;
    }
  };

  /* ======================================================================
     Codes promo, livraison, taxes
     ====================================================================== */
  const PROMOS = {
    LUNE10: { kind: 'percent', value: 10, label: '10 % de rabais' },
    BIENVENUE15: { kind: 'percent', value: 15, min: 100, label: '15 % sur votre première commande' },
    PLEINELUNE: { kind: 'fixed', value: 25, min: 150, label: '25 $ de rabais' }
  };

  function promoFor(subtotal) {
    const code = store.get('promo', null);
    const def = code && PROMOS[code];
    if (!def) return null;
    if (def.min && subtotal < def.min) return { code, label: def.label, amount: 0, inactive: true, note: `S’applique dès ${money(def.min)} d’achat` };
    const amount = def.kind === 'percent' ? round(subtotal * def.value / 100) : Math.min(def.value, subtotal);
    return { code, label: def.label, amount };
  }

  L.promo = {
    code: () => store.get('promo', null),
    apply(raw) {
      const code = String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
      const def = PROMOS[code];
      if (!code) return { ok: false, message: 'Entrez un code promo.' };
      if (!def) return { ok: false, message: 'Ce code promo n’est pas valide.' };
      const subtotal = L.totals().subtotal;
      if (def.min && subtotal < def.min) return { ok: false, message: `Ce code s’applique dès ${money(def.min)} d’achat.` };
      store.set('promo', code);
      emit('cart');
      return { ok: true, message: `Code ${code} appliqué : ${def.label}.` };
    },
    clear() { store.set('promo', null); emit('cart'); }
  };

  L.FREE_SHIPPING = 100;
  L.SHIPPING = [
    { id: 'standard', name: 'Livraison standard', desc: 'Suivie · 3 à 6 jours ouvrables', price: 9.95, free: L.FREE_SHIPPING, min: 3, max: 6 },
    { id: 'express', name: 'Livraison express', desc: 'Suivie et assurée · 1 à 2 jours ouvrables', price: 19.95, min: 1, max: 2 }
  ];

  L.PROVINCES = {
    AB: { name: 'Alberta', taxes: [['TPS', 5]], postal: 'T' },
    BC: { name: 'Colombie-Britannique', taxes: [['TPS', 5], ['TVP', 7]], postal: 'V' },
    MB: { name: 'Manitoba', taxes: [['TPS', 5], ['TVP', 7]], postal: 'R' },
    NB: { name: 'Nouveau-Brunswick', taxes: [['TVH', 15]], postal: 'E' },
    NL: { name: 'Terre-Neuve-et-Labrador', taxes: [['TVH', 15]], postal: 'A' },
    NS: { name: 'Nouvelle-Écosse', taxes: [['TVH', 14]], postal: 'B' },
    NT: { name: 'Territoires du Nord-Ouest', taxes: [['TPS', 5]], postal: 'X' },
    NU: { name: 'Nunavut', taxes: [['TPS', 5]], postal: 'X' },
    ON: { name: 'Ontario', taxes: [['TVH', 13]], postal: 'KLMNP' },
    PE: { name: 'Île-du-Prince-Édouard', taxes: [['TVH', 15]], postal: 'C' },
    QC: { name: 'Québec', taxes: [['TPS', 5], ['TVQ', 9.975]], postal: 'GHJ' },
    SK: { name: 'Saskatchewan', taxes: [['TPS', 5], ['TVP', 6]], postal: 'S' },
    YT: { name: 'Yukon', taxes: [['TPS', 5]], postal: 'Y' }
  };

  L.eta = function (methodId, hasRx, from) {
    const m = L.SHIPPING.find(s => s.id === methodId) || L.SHIPPING[0];
    const extra = hasRx ? 3 : 0; // taillage des verres correcteurs en atelier
    const start = from ? new Date(from) : new Date();
    return { min: addBusinessDays(start, m.min + extra), max: addBusinessDays(start, m.max + extra) };
  };

  L.totals = function (opts) {
    opts = opts || {};
    const items = cart.items();
    const lines = items.map(line => ({ line, info: L.lineInfo(line) }));
    const subtotal = round(lines.reduce((s, l) => s + l.info.total, 0));
    const promo = promoFor(subtotal);
    const discount = promo ? promo.amount : 0;
    const afterDiscount = round(subtotal - discount);
    const method = L.SHIPPING.find(s => s.id === opts.shipping) || L.SHIPPING[0];
    const shipping = !items.length ? 0 : (method.free && afterDiscount >= method.free ? 0 : method.price);
    const taxable = round(afterDiscount + shipping);
    const prov = L.PROVINCES[opts.province];
    const taxes = prov ? prov.taxes.map(([name, rate]) => ({ name, rate, amount: round(taxable * rate / 100) })) : [];
    const total = round(taxable + taxes.reduce((s, t) => s + t.amount, 0));
    return {
      items, lines, count: items.reduce((s, i) => s + i.qty, 0),
      subtotal, promo, discount, afterDiscount, method, shipping, taxes, total,
      hasRx: lines.some(l => l.info.rxText),
      freeLeft: Math.max(0, round(L.FREE_SHIPPING - afterDiscount))
    };
  };

  /* ======================================================================
     Compte client (démo : stocké dans ce navigateur seulement —
     un vrai site vérifie les mots de passe côté serveur)
     ====================================================================== */
  function hash(str) {
    let h = 0x811c9dc5;
    for (const ch of str) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16);
  }

  L.account = {
    current() {
      const email = store.get('session', null);
      const acc = email && store.get('accounts', {})[email];
      if (!acc) return null;
      const copy = Object.assign({}, acc);
      delete copy.pw;
      return copy;
    },
    register(data) {
      const email = data.email.trim().toLowerCase();
      const accounts = store.get('accounts', {});
      if (accounts[email]) return { ok: false, error: 'Un compte existe déjà avec ce courriel. Connectez-vous plutôt.' };
      accounts[email] = {
        firstName: data.firstName.trim(), lastName: data.lastName.trim(), email,
        pw: hash('lunaria:' + email + ':' + data.password), createdAt: new Date().toISOString(), address: null
      };
      store.set('accounts', accounts);
      store.set('session', email);
      emit('account');
      return { ok: true };
    },
    login(emailRaw, password) {
      const email = emailRaw.trim().toLowerCase();
      const acc = store.get('accounts', {})[email];
      if (!acc || acc.pw !== hash('lunaria:' + email + ':' + password)) return { ok: false, error: 'Courriel ou mot de passe incorrect.' };
      store.set('session', email);
      emit('account');
      return { ok: true };
    },
    logout() { store.set('session', null); emit('account'); },
    update(fields) {
      const email = store.get('session', null);
      const accounts = store.get('accounts', {});
      if (!email || !accounts[email]) return;
      Object.assign(accounts[email], fields);
      store.set('accounts', accounts);
      emit('account');
    }
  };

  /* ======================================================================
     Commandes
     ====================================================================== */
  L.orders = {
    all: () => store.get('orders', []),
    get: id => L.orders.all().find(o => o.id === String(id || '').trim().toUpperCase()),
    forEmail: email => L.orders.all().filter(o => o.email === email),
    place(data) {
      const t = L.totals({ province: data.address.province, shipping: data.shipping });
      if (!t.items.length) throw new Error('Panier vide');
      const items = t.lines.map(({ line, info }) => ({
        id: line.id, name: info.p.name, color: line.color, colorName: info.c.name,
        lens: info.lens.name, addons: info.addons.map(a => a.name), rx: line.rx, rxText: info.rxText,
        qty: line.qty, unit: info.unit, total: info.total
      }));
      const created = new Date();
      const eta = L.eta(t.method.id, t.hasRx, created);
      const order = {
        id: 'LUN-' + (Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 4)).toUpperCase(),
        createdAt: created.toISOString(),
        email: data.email.trim().toLowerCase(),
        contact: data.contact, address: data.address, payment: data.payment,
        shipping: { id: t.method.id, name: t.method.name, cost: t.shipping },
        eta: { min: eta.min.toISOString(), max: eta.max.toISOString() },
        items, subtotal: t.subtotal, discount: t.discount, promo: t.promo && t.promo.amount ? t.promo.code : null,
        taxes: t.taxes, total: t.total, hasRx: t.hasRx, rxPending: items.some(i => i.rxText === 'Ordonnance à envoyer')
      };
      const orders = L.orders.all();
      orders.unshift(order);
      store.set('orders', orders);
      const sold = store.get('sold', {});
      items.forEach(i => { sold[i.id] = (sold[i.id] || 0) + i.qty; });
      store.set('sold', sold);
      store.set('promo', null);
      cart.clear();
      return order;
    }
  };

  L.orderTimeline = function (o) {
    const created = new Date(o.createdAt);
    const steps = [
      { label: 'Commande confirmée', date: created },
      { label: o.hasRx ? 'Taillage des verres' : 'En préparation', date: new Date(created.getTime() + 2 * 3600e3) },
      { label: 'Expédiée', date: addBusinessDays(created, o.hasRx ? 4 : 1) },
      { label: 'Livrée', date: new Date(o.eta.max) }
    ];
    let current = 0;
    steps.forEach((s, i) => { if (Date.now() >= s.date.getTime()) current = i; });
    return { steps, current, status: steps[current].label };
  };

  /* ======================================================================
     Avis, vus récemment, infolettre
     ====================================================================== */
  L.reviews = {
    list(id) {
      const p = L.getProduct(id);
      const mine = store.get('reviews', {})[id] || [];
      return mine.concat(p ? p.reviews : []).sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    stats(id) {
      const p = L.getProduct(id);
      const mine = store.get('reviews', {})[id] || [];
      const count = p.reviewCount + mine.length;
      const avg = (p.rating * p.reviewCount + mine.reduce((s, r) => s + r.rating, 0)) / count;
      return { count, avg: Math.round(avg * 10) / 10 };
    },
    add(id, review) {
      const all = store.get('reviews', {});
      (all[id] = all[id] || []).unshift(Object.assign({ date: new Date().toISOString(), mine: true }, review));
      store.set('reviews', all);
    }
  };

  L.recent = {
    push(id) {
      const ids = store.get('recent', []).filter(x => x !== id);
      ids.unshift(id);
      store.set('recent', ids.slice(0, 8));
    },
    list(except) { return store.get('recent', []).filter(id => id !== except).map(L.getProduct).filter(Boolean); }
  };

  L.subscribe = function (email) {
    const list = store.get('newsletter', []);
    if (!list.includes(email)) list.push(email);
    store.set('newsletter', list);
    return 'BIENVENUE15';
  };

  /* ======================================================================
     Recherche
     ====================================================================== */
  L.search = function (q) {
    const terms = norm(q || '').split(/\s+/).filter(Boolean);
    if (!terms.length) return L.products.slice();
    return L.products.map(p => {
      const hay = norm([p.name, p.tagline, L.TYPES[p.type], L.SHAPES[p.shape].label, L.MATERIALS[p.material], p.gender,
        p.colors.map(c => c.name).join(' '), p.tags.join(' ').replace('solde', 'solde promo rabais')].join(' '));
      let score = 0;
      for (const t of terms) {
        if (!hay.includes(t)) return null;
        score += norm(p.name).startsWith(t) ? 3 : 1;
      }
      return { p, score };
    }).filter(Boolean).sort((a, b) => b.score - a.score).map(x => x.p);
  };

  /* ======================================================================
     Icônes (traits fins, 24×24)
     ====================================================================== */
  const ICONS = {
    bag: '<path d="M6 7h12l1 13H5L6 7Z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8Z"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    menu: '<path d="M3 7h18M3 12h18M3 17h12"/>',
    truck: '<path d="M1 4h14v12H1zM15 9h4l3 3v4h-7z"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="18.5" cy="18.5" r="2"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M8 16H3v5"/>',
    star: '<path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z" fill="currentColor" stroke="none"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>',
    sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 1.5v2.5M12 20v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M1.5 12H4M20 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/>',
    eye: '<path d="M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="3"/>',
    glasses: '<circle cx="6" cy="15" r="4"/><circle cx="18" cy="15" r="4"/><path d="M14 15a2 2 0 0 0-4 0M2.5 13 5 7c.7-1.3 1.4-2 3-2M21.5 13 19 7c-.7-1.3-1.5-2-3-2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    'arrow-left': '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    filter: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.9-5.4 5.1-6C9.5 14.5 12 13 13 12"/>',
    feather: '<path d="M20.2 12.2a6 6 0 0 0-8.5-8.5L5 10.5V19h8.5z"/><path d="M16 8 2 22M17.5 15H9"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    box: '<path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7Z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>',
    tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8Z"/><circle cx="7" cy="7" r="1.2"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>'
  };
  const icon = (name, cls) => `<svg class="i${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
  L.icon = icon;

  const LOGO = `<svg class="brand-mark" viewBox="20 8 130 60" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M49 17c-16 5-25 22-19 38 6 16 23 24 39 18-10-3-17-12-17-23 0-14 10-26 24-29-9-6-18-7-27-4z" class="brand-moon"/>
    <path d="M82 47c8-10 21-10 29 0"/><rect x="62" y="40" width="25" height="18" rx="8"/><rect x="106" y="40" width="25" height="18" rx="8"/>
    <path d="M87 47h19M62 46l-10-4M131 46l10-4"/></svg>`;
  L.LOGO = LOGO;

  /* Phase de lune : p = 0 (nouvelle lune) → 1 (pleine lune) */
  L.moonPath = function (r, p) {
    if (p <= 0.01) return '';
    if (p >= 0.99) return `M0 ${-r}A${r} ${r} 0 1 1 0 ${r}A${r} ${r} 0 1 1 0 ${-r}Z`;
    const rx = (Math.abs(1 - 2 * p) * r).toFixed(2);
    return `M0 ${-r}A${r} ${r} 0 0 1 0 ${r}A${rx} ${r} 0 0 ${p < 0.5 ? 0 : 1} 0 ${-r}Z`;
  };

  /* ======================================================================
     Composants : étoiles, carte produit, prix
     ====================================================================== */
  L.stars = function (rating) {
    const five = icon('star').repeat(5);
    return `<span class="stars" role="img" aria-label="Note : ${String(rating).replace('.', ',')} sur 5"><span class="stars-base">${five}</span><span class="stars-fill" style="width:${(rating / 5) * 100}%">${five}</span></span>`;
  };

  L.priceHTML = function (p) {
    return (p.compareAt ? `<del>${money(p.compareAt)}</del> ` : '') + `<span>${money(p.price)}</span>`;
  };

  L.badges = function (p) {
    const out = [];
    if (L.stock(p.id) <= 0) out.push('<span class="tag is-out">Épuisé</span>');
    else if (p.compareAt) out.push(`<span class="tag is-sale">−${Math.round((1 - p.price / p.compareAt) * 100)} %</span>`);
    if (p.tags.includes('nouveau')) out.push('<span class="tag is-new">Nouveau</span>');
    else if (p.tags.includes('bestseller')) out.push('<span class="tag">Populaire</span>');
    return out.join('');
  };

  L.card = function (p, opts) {
    opts = opts || {};
    const c = p.colors[0];
    const inStock = L.stock(p.id) > 0;
    const wished = L.wishlist.has(p.id);
    const stats = L.reviews.stats(p.id);
    return `<article class="card" data-reveal data-card="${p.id}" data-color="${c.id}" style="--d:${opts.delay || 0}ms">
      <div class="card-media">
        <a class="card-link" href="${L.productURL(p)}" aria-label="${esc(p.name)} — ${esc(p.tagline)}">
          <span class="card-moon" aria-hidden="true"></span>
          <span class="card-frame">${L.frameSVG(p, c.id, { label: false })}</span>
        </a>
        <div class="card-tags">${L.badges(p)}</div>
        <button class="wish-btn${wished ? ' is-on' : ''}" type="button" data-wish="${p.id}" aria-pressed="${wished}" aria-label="${wished ? 'Retirer' : 'Ajouter'} ${esc(p.name)} ${wished ? 'des' : 'aux'} favoris">${icon('heart')}</button>
        ${inStock ? `<button class="quick-add" type="button" data-quick="${p.id}">${icon('plus')}<span>Ajout rapide</span></button>` : `<a class="quick-add is-muted" href="${L.productURL(p)}">${icon('mail')}<span>M’avertir du retour</span></a>`}
      </div>
      <div class="card-body">
        <div class="card-row">
          <h3 class="card-title"><a href="${L.productURL(p)}">${esc(p.name)}</a></h3>
          <span class="card-price">${L.priceHTML(p)}</span>
        </div>
        <p class="card-sub">${esc(p.tagline)}</p>
        <div class="card-row">
          <div class="swatches is-sm" role="group" aria-label="Couleurs">${p.colors.map((col, i) =>
            `<button type="button" class="swatch${i === 0 ? ' is-on' : ''}" data-card-color="${col.id}" style="${L.swatchStyle(col)}" aria-label="${esc(col.name)}" title="${esc(col.name)}"></button>`).join('')}</div>
          <span class="card-rating">${L.stars(stats.avg)}<small>${stats.count}</small></span>
        </div>
      </div>
    </article>`;
  };

  L.renderGrid = function (el, list, opts) {
    el.innerHTML = list.map((p, i) => L.card(p, { delay: Math.min(i, 8) * 70 })).join('');
    L.reveal(el);
  };

  L.defaultLine = p => ({ id: p.id, color: p.colors[0].id, lens: L.LENSES[p.type][0].id, addons: [], qty: 1 });

  /* ======================================================================
     Mise en page partagée
     ====================================================================== */
  const NAV = [
    { href: 'index.html', label: 'Accueil', match: q => q.page === 'home' },
    { href: 'catalog-list.html?type=optique', label: 'Optiques', match: q => q.page === 'catalog' && q.type === 'optique' },
    { href: 'catalog-list.html?type=solaire', label: 'Solaires', match: q => q.page === 'catalog' && q.type === 'solaire' },
    { href: 'catalog-list.html?tag=nouveau', label: 'Nouveautés', match: q => q.page === 'catalog' && q.tag === 'nouveau' },
    { href: 'catalog-list.html?tag=responsable', label: 'Responsable', match: q => q.page === 'catalog' && q.tag === 'responsable' },
    { href: 'aide.html', label: 'Aide', match: q => q.page === 'help' },
    { href: 'contacts.html', label: 'Contact', match: q => q.page === 'contact' }
  ];
  const ANNOUNCES = [
    'Livraison gratuite dès 100 $ partout au Canada',
    'Retours et échanges gratuits pendant 30 jours',
    'Inscrivez-vous à l’infolettre : 15 % sur votre première commande',
    'Verres antireflet et anti-rayures inclus avec chaque monture'
  ];

  function headerHTML() {
    const params = L.params();
    const q = { page: document.body.dataset.page, type: params.get('type'), tag: params.get('tag') };
    const links = NAV.map(n => `<li><a href="${n.href}"${n.match(q) ? ' aria-current="page"' : ''}>${n.label}</a></li>`).join('');
    return `
    <a class="skip-link" href="#main">Aller au contenu</a>
    <div class="announce" role="region" aria-label="Annonces">
      <div class="wrap announce-inner">
        <span class="announce-moon" aria-hidden="true">${icon('moon')}</span>
        <div class="announce-track" aria-live="polite">${ANNOUNCES.map((a, i) => `<span class="announce-item${i === 0 ? ' is-on' : ''}">${a}</span>`).join('')}</div>
      </div>
    </div>
    <header class="site-header">
      <div class="wrap header-inner">
        <button class="icon-btn menu-btn" type="button" data-open="menu" aria-label="Ouvrir le menu">${icon('menu')}</button>
        <a class="brand" href="index.html" aria-label="Lunaria — accueil">${LOGO}<span>Lunaria</span></a>
        <nav class="main-nav" aria-label="Navigation principale"><ul>${links}</ul></nav>
        <div class="header-actions">
          <button class="icon-btn" type="button" data-open="search" aria-label="Rechercher">${icon('search')}</button>
          <a class="icon-btn hide-sm" href="auth.html" data-account-link aria-label="Mon compte">${icon('user')}<span class="dot" hidden></span></a>
          <a class="icon-btn" href="wishlist.html" aria-label="Favoris">${icon('heart')}<span class="badge" data-wish-count hidden></span></a>
          <button class="icon-btn" type="button" data-open="cart" aria-label="Ouvrir le panier">${icon('bag')}<span class="badge" data-cart-count hidden></span></button>
        </div>
      </div>
    </header>`;
  }

  function overlaysHTML() {
    return `
    <div class="drawer is-left" id="menu" aria-hidden="true">
      <div class="drawer-backdrop" data-close></div>
      <div class="drawer-panel" role="dialog" aria-modal="true" aria-label="Menu">
        <div class="drawer-head"><a class="brand" href="index.html">${LOGO}<span>Lunaria</span></a><button class="icon-btn" type="button" data-close aria-label="Fermer le menu">${icon('x')}</button></div>
        <nav class="mobile-nav" aria-label="Menu mobile"><ul>
          ${NAV.map(n => `<li><a href="${n.href}">${n.label}${icon('arrow')}</a></li>`).join('')}
          <li><a href="catalog-list.html">Toutes les lunettes${icon('arrow')}</a></li>
        </ul></nav>
        <div class="mobile-nav-foot">
          <a class="btn btn-ghost btn-block" href="auth.html">${icon('user')}<span data-account-label>Mon compte</span></a>
          <a class="btn btn-ghost btn-block" href="wishlist.html">${icon('heart')}Mes favoris</a>
        </div>
      </div>
    </div>

    <div class="drawer is-right" id="cart" aria-hidden="true">
      <div class="drawer-backdrop" data-close></div>
      <div class="drawer-panel" role="dialog" aria-modal="true" aria-labelledby="cart-title">
        <div class="drawer-head"><h2 id="cart-title">Votre panier <small data-cart-count-text></small></h2><button class="icon-btn" type="button" data-close aria-label="Fermer le panier">${icon('x')}</button></div>
        <div class="ship-meter" data-ship-meter></div>
        <div class="drawer-body" data-cart-lines></div>
        <div class="drawer-foot" data-cart-foot></div>
      </div>
    </div>

    <div class="search" id="search" aria-hidden="true">
      <div class="search-backdrop" data-close></div>
      <div class="search-panel" role="dialog" aria-modal="true" aria-label="Recherche">
        <form class="search-form" action="catalog-list.html" role="search">
          ${icon('search')}
          <input type="search" name="q" placeholder="Une forme, une couleur, un modèle…" autocomplete="off" aria-label="Rechercher" data-autofocus>
          <button class="icon-btn" type="button" data-close aria-label="Fermer la recherche">${icon('x')}</button>
        </form>
        <div class="search-suggest">
          <span>Populaire :</span>
          ${['Ronde', 'Œil-de-chat', 'Titane', 'Solaires', 'Écaille'].map(s => `<button type="button" class="chip" data-suggest="${s}">${s}</button>`).join('')}
        </div>
        <div class="search-results" data-search-results></div>
      </div>
    </div>

    <div class="toasts" aria-live="polite"></div>

    <button class="moon-top" type="button" aria-label="Revenir en haut de la page">
      <svg viewBox="-26 -26 52 52" aria-hidden="true"><circle r="21" class="moon-shadow"/><path class="moon-lit" d=""/><circle r="21" class="moon-ring"/></svg>
    </button>`;
  }

  function footerHTML() {
    return `
    <footer class="site-footer">
      <div class="footer-sky" aria-hidden="true"></div>
      <div class="wrap">
        <div class="footer-top">
          <div class="footer-brand">
            <a class="brand is-light" href="index.html">${LOGO}<span>Lunaria</span></a>
            <p>Des lunettes inspirées par la nature et la lumière, dessinées pour conjuguer style, confort et choix responsables.</p>
            <ul class="footer-contact">
              <li>${icon('mail')}<a href="mailto:contact@lunaria.ca">contact@lunaria.ca</a></li>
              <li>${icon('clock')}Lun – ven, 9 h à 18 h (HE)</li>
            </ul>
          </div>
          <div>
            <h4>Magasiner</h4>
            <ul>
              <li><a href="catalog-list.html">Toutes les lunettes</a></li>
              <li><a href="catalog-list.html?type=optique">Optiques</a></li>
              <li><a href="catalog-list.html?type=solaire">Solaires</a></li>
              <li><a href="catalog-list.html?tag=nouveau">Nouveautés</a></li>
              <li><a href="wishlist.html">Mes favoris</a></li>
            </ul>
          </div>
          <div>
            <h4>Aide</h4>
            <ul>
              <li><a href="aide.html#livraison">Livraison</a></li>
              <li><a href="aide.html#retours">Retours et échanges</a></li>
              <li><a href="aide.html#ordonnance">Envoyer mon ordonnance</a></li>
              <li><a href="aide.html#faq">FAQ</a></li>
              <li><a href="contacts.html">Nous joindre</a></li>
            </ul>
          </div>
          <div class="footer-news">
            <h4>L’infolettre Lunaria</h4>
            <p>Nouveautés, éditions limitées et 15 % sur votre première commande.</p>
            <form class="inline-form" data-newsletter novalidate>
              <label class="sr-only" for="footer-email">Courriel</label>
              <input id="footer-email" type="email" placeholder="Votre courriel" required>
              <button class="btn btn-sand" type="submit">S’inscrire</button>
            </form>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© ${new Date().getFullYear()} Lunaria. Tous droits réservés.</span>
          <div class="pay-icons" aria-label="Moyens de paiement acceptés"><span>Visa</span><span>Mastercard</span><span>Amex</span><span>Apple Pay</span></div>
          <span><a href="aide.html#conditions">Conditions</a> · <a href="aide.html#confidentialite">Confidentialité</a></span>
        </div>
      </div>
    </footer>`;
  }

  /* ======================================================================
     Tiroirs (menu, panier, recherche)
     ====================================================================== */
  let lastFocus = null;
  function openPanel(id) {
    const el = document.getElementById(id);
    if (!el) return;
    lastFocus = document.activeElement;
    $$('.drawer.is-open, .search.is-open').forEach(o => o !== el && closePanel(o, true));
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('no-scroll');
    const focusEl = $('[data-autofocus]', el) || $('[data-close]:not(.drawer-backdrop):not(.search-backdrop)', el);
    setTimeout(() => focusEl && focusEl.focus(), 60);
  }
  function closePanel(el, silent) {
    if (!el || !el.classList.contains('is-open')) return;
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('no-scroll');
    if (!silent && lastFocus && lastFocus.focus) lastFocus.focus();
  }
  L.openCart = () => openPanel('cart');

  /* ======================================================================
     Rendu du panier (tiroir + compteurs)
     ====================================================================== */
  L.shipMeter = function (t) {
    if (!t.count) return '';
    const pct = Math.min(100, (t.afterDiscount / L.FREE_SHIPPING) * 100);
    const msg = t.freeLeft > 0
      ? `Plus que <strong>${money(t.freeLeft, true)}</strong> pour profiter de la livraison gratuite`
      : `${icon('sparkle')} <strong>Livraison standard gratuite</strong> débloquée`;
    return `<p>${msg}</p><div class="meter${t.freeLeft > 0 ? '' : ' is-full'}"><span style="width:${pct}%"></span></div>`;
  };

  L.qtyHTML = (key, qty, max) => `<div class="qty" role="group" aria-label="Quantité">
      <button type="button" data-qty-dec="${esc(key)}" aria-label="Diminuer" ${qty <= 1 ? 'disabled' : ''}>${icon('minus')}</button>
      <span aria-live="polite">${qty}</span>
      <button type="button" data-qty-inc="${esc(key)}" aria-label="Augmenter" ${qty >= max ? 'disabled' : ''}>${icon('plus')}</button></div>`;

  L.lineMax = line => L.stock(line.id) - cart.qtyOf(line.id, line.key);

  function renderCart() {
    const t = L.totals();
    $$('[data-cart-count]').forEach(b => { b.textContent = t.count; b.hidden = !t.count; });
    const label = $('[data-cart-count-text]');
    if (label) label.textContent = t.count ? `(${t.count})` : '';
    const meter = $('[data-ship-meter]');
    if (meter) meter.innerHTML = L.shipMeter(t);
    const body = $('[data-cart-lines]');
    const foot = $('[data-cart-foot]');
    if (!body) return;
    if (!t.count) {
      body.innerHTML = `<div class="empty is-compact">
        <div class="empty-moon" aria-hidden="true"></div>
        <h3>Votre panier est vide</h3>
        <p>Trouvez la monture qui vous ressemble.</p>
        <a class="btn" href="catalog-list.html">Découvrir les lunettes</a></div>`;
      foot.innerHTML = '';
      return;
    }
    body.innerHTML = t.lines.map(({ line, info }) => `
      <div class="line">
        <a class="line-thumb" href="${L.productURL(info.p, line.color)}">${L.frameSVG(info.p, line.color, { label: false })}</a>
        <div class="line-info">
          <div class="line-top"><a href="${L.productURL(info.p, line.color)}" class="line-name">${esc(info.p.name)}</a><strong>${money(info.total, true)}</strong></div>
          <p class="line-opts">${esc(info.c.name)} · ${esc(info.lens.name)}${info.addons.map(a => ' · ' + esc(a.name)).join('')}</p>
          ${info.rxText ? `<p class="line-rx">${icon('eye')}${info.rxText}</p>` : ''}
          <div class="line-actions">${L.qtyHTML(line.key, line.qty, L.lineMax(line))}<button type="button" class="link-btn" data-remove="${esc(line.key)}">Retirer</button></div>
        </div>
      </div>`).join('');
    foot.innerHTML = `
      ${t.promo && t.promo.amount ? `<div class="sum-row is-promo"><span>${icon('tag')} ${esc(t.promo.code)}</span><span>−${money(t.discount, true)}</span></div>` : ''}
      <div class="sum-row is-total"><span>Sous-total</span><span>${money(t.afterDiscount, true)}</span></div>
      <p class="note">Taxes et frais de livraison calculés à la caisse.</p>
      <a class="btn btn-block btn-lg" href="checkout.html">${icon('lock')}Passer à la caisse</a>
      <a class="btn btn-ghost btn-block" href="cart.html">Voir le panier</a>`;
  }

  function renderBadges() {
    const n = L.wishlist.ids().length;
    $$('[data-wish-count]').forEach(b => { b.textContent = n; b.hidden = !n; });
    $$('[data-wish]').forEach(btn => {
      const on = L.wishlist.has(btn.dataset.wish);
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', on);
    });
    const acc = L.account.current();
    $$('[data-account-link] .dot').forEach(d => { d.hidden = !acc; });
    $$('[data-account-link]').forEach(a => a.setAttribute('aria-label', acc ? `Mon compte (${acc.firstName})` : 'Mon compte'));
    $$('[data-account-label]').forEach(s => { s.textContent = acc ? `Bonjour, ${acc.firstName}` : 'Mon compte'; });
  }

  function bumpCart() {
    $$('[data-cart-count]').forEach(b => {
      b.classList.remove('is-bump');
      void b.offsetWidth;
      b.classList.add('is-bump');
    });
  }

  /* Animation : la monture « vole » jusqu’au panier */
  L.flyToCart = function (fromEl) {
    const target = $('.site-header [data-open="cart"]');
    const svg = fromEl && (fromEl.matches('svg') ? fromEl : $('svg.frame', fromEl));
    if (!svg || !target || reduceMotion || !svg.animate) { bumpCart(); return; }
    const a = svg.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const ghost = svg.cloneNode(true);
    ghost.classList.add('fly-ghost');
    Object.assign(ghost.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px' });
    document.body.appendChild(ghost);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    ghost.animate([
      { transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1 },
      { transform: `translate(${dx * 0.55}px,${dy * 0.55 - 90}px) scale(.45) rotate(-12deg)`, opacity: 0.95, offset: 0.55 },
      { transform: `translate(${dx}px,${dy}px) scale(.06) rotate(-30deg)`, opacity: 0.3 }
    ], { duration: 900, easing: 'cubic-bezier(.55,0,.25,1)' }).onfinish = () => { ghost.remove(); bumpCart(); };
  };

  /* ======================================================================
     Notifications
     ====================================================================== */
  L.toast = function (message, opts) {
    opts = opts || {};
    const wrap = $('.toasts');
    if (!wrap) return;
    // Un message identique déjà affiché est remplacé plutôt qu’empilé
    $$('.toast', wrap).forEach(t => { if (t.dataset.msg === message) t.remove(); });
    const el = document.createElement('div');
    el.dataset.msg = message;
    el.className = 'toast' + (opts.type ? ' is-' + opts.type : '');
    el.innerHTML = `<span class="toast-icon">${icon(opts.icon || (opts.type === 'error' ? 'alert' : 'check'))}</span>
      <div class="toast-msg">${message}</div>
      ${opts.action ? `<button type="button" class="toast-action">${esc(opts.action.label)}</button>` : ''}
      <button type="button" class="toast-close" aria-label="Fermer">${icon('x')}</button>`;
    wrap.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')));
    const close = () => { el.classList.remove('is-in'); setTimeout(() => el.remove(), 400); };
    const timer = setTimeout(close, opts.duration || 4500);
    $('.toast-close', el).onclick = () => { clearTimeout(timer); close(); };
    if (opts.action) $('.toast-action', el).onclick = () => { clearTimeout(timer); opts.action.fn(); close(); };
  };

  /* Ajout au panier + retour visuel commun */
  L.addToCart = function (line, sourceEl) {
    const res = cart.add(line);
    const p = L.getProduct(line.id);
    if (!res.ok) { L.toast(esc(res.message), { type: 'error' }); return res; }
    L.flyToCart(sourceEl);
    L.toast(`<strong>${esc(p.name)}</strong> a été ajouté à votre panier.${res.limited ? ' Quantité ajustée au stock disponible.' : ''}`,
      { icon: 'bag', action: { label: 'Voir le panier', fn: L.openCart } });
    return res;
  };

  /* ======================================================================
     Recherche instantanée
     ====================================================================== */
  function renderSearch(q) {
    const box = $('[data-search-results]');
    if (!box) return;
    if (!q.trim()) { box.innerHTML = ''; return; }
    const results = L.search(q).slice(0, 6);
    box.innerHTML = results.length
      ? results.map(p => `<a class="search-hit" href="${L.productURL(p)}">
          <span class="search-thumb">${L.frameSVG(p, p.colors[0].id, { label: false })}</span>
          <span><strong>${esc(p.name)}</strong><small>${esc(p.tagline)}</small></span>
          <span class="search-price">${money(p.price)}</span></a>`).join('') +
        `<a class="search-all" href="catalog-list.html?q=${encodeURIComponent(q)}">Voir tous les résultats ${icon('arrow')}</a>`
      : `<p class="search-empty">Aucune monture ne correspond à « ${esc(q)} ». Essayez « ronde » ou « solaire ».</p>`;
  }

  /* ======================================================================
     Effets : apparition au défilement, en-tête, lune de progression
     ====================================================================== */
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -6% 0px', threshold: 0.06 })
    : null;
  L.reveal = root => $$('[data-reveal]:not(.is-visible)', root).forEach(el => (io ? io.observe(el) : el.classList.add('is-visible')));

  function onScroll() {
    const y = window.scrollY;
    const header = $('.site-header');
    if (header) header.classList.toggle('is-scrolled', y > 8);
    const btn = $('.moon-top');
    if (btn) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, y / max) : 0;
      btn.classList.toggle('is-on', y > 480);
      $('.moon-lit', btn).setAttribute('d', L.moonPath(21, p));
    }
  }

  function rotateAnnounce() {
    const items = $$('.announce-item');
    if (items.length < 2 || reduceMotion) return;
    let i = 0;
    setInterval(() => {
      items[i].classList.remove('is-on');
      i = (i + 1) % items.length;
      items[i].classList.add('is-on');
    }, 4200);
  }

  /* ======================================================================
     Validation de formulaires (utilisée par plusieurs pages)
     ====================================================================== */
  L.validators = {
    required: v => v.trim() ? '' : 'Ce champ est requis.',
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Entrez une adresse courriel valide.',
    phone: v => /^(\+?1)?\d{10}$/.test(v.replace(/[\s().-]/g, '')) ? '' : 'Entrez un numéro à 10 chiffres.',
    postal: v => /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] ?\d[ABCEGHJ-NPRSTV-Z]\d$/i.test(v.trim()) ? '' : 'Format attendu : A1A 1A1.',
    password: v => v.length >= 8 ? '' : 'Au moins 8 caractères.'
  };

  L.setError = function (input, msg) {
    const field = input.closest('.field') || input.parentElement;
    let err = field.querySelector('.field-error');
    if (!err) {
      err = document.createElement('p');
      err.className = 'field-error';
      err.id = (input.id || input.name) + '-error';
      field.appendChild(err);
    }
    err.textContent = msg || '';
    field.classList.toggle('has-error', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (msg) input.setAttribute('aria-describedby', err.id); else input.removeAttribute('aria-describedby');
    return !msg;
  };

  /* Valide les champs [data-validate="required email …"] d’un formulaire */
  L.validateForm = function (form) {
    let first = null;
    $$('[data-validate]', form).forEach(input => {
      if (input.disabled || input.closest('[hidden]')) return;
      const rules = input.dataset.validate.split(' ');
      let msg = '';
      for (const r of rules) {
        if (r !== 'required' && !input.value.trim() && !rules.includes('required')) continue;
        msg = L.validators[r] ? L.validators[r](input.value) : '';
        if (msg) break;
      }
      if (!L.setError(input, msg) && !first) first = input;
    });
    if (first) {
      first.focus({ preventScroll: true });
      first.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    }
    return !first;
  };

  // Efface l’erreur dès que l’utilisateur corrige
  document.addEventListener('input', e => {
    const f = e.target.closest && e.target.closest('.field.has-error');
    if (f) L.setError(e.target, '');
  });

  /* ======================================================================
     Interactions globales (délégation)
     ====================================================================== */
  document.addEventListener('click', e => {
    const t = e.target;

    const opener = t.closest('[data-open]');
    if (opener) { e.preventDefault(); openPanel(opener.dataset.open); return; }

    const closer = t.closest('[data-close]');
    if (closer) { closePanel(closer.closest('.drawer, .search')); return; }

    const wish = t.closest('[data-wish]');
    if (wish) {
      e.preventDefault();
      const id = wish.dataset.wish;
      const on = L.wishlist.toggle(id);
      wish.classList.remove('is-pop'); void wish.offsetWidth; wish.classList.add('is-pop');
      const p = L.getProduct(id);
      L.toast(on ? `<strong>${esc(p.name)}</strong> a été ajouté à vos favoris.` : `<strong>${esc(p.name)}</strong> a été retiré de vos favoris.`,
        { icon: 'heart', action: on ? { label: 'Voir', fn: () => { location.href = 'wishlist.html'; } } : null });
      return;
    }

    const quick = t.closest('[data-quick]');
    if (quick) {
      const card = quick.closest('[data-card]');
      const p = L.getProduct(quick.dataset.quick);
      const line = L.defaultLine(p);
      if (card) line.color = card.dataset.color;
      L.addToCart(line, card && $('.card-frame', card));
      return;
    }

    const sw = t.closest('[data-card-color]');
    if (sw) {
      const card = sw.closest('[data-card]');
      const p = L.getProduct(card.dataset.card);
      const colorId = sw.dataset.cardColor;
      card.dataset.color = colorId;
      $$('.swatch', card).forEach(s => s.classList.toggle('is-on', s === sw));
      const frame = $('.card-frame', card);
      frame.classList.add('is-swapping');
      setTimeout(() => {
        frame.innerHTML = L.frameSVG(p, colorId, { label: false });
        frame.classList.remove('is-swapping');
      }, 160);
      $$('a[href^="product.html"]', card).forEach(a => { a.href = L.productURL(p, colorId); });
      return;
    }

    const dec = t.closest('[data-qty-dec]');
    const inc = t.closest('[data-qty-inc]');
    if (dec || inc) {
      const key = (dec || inc).dataset[dec ? 'qtyDec' : 'qtyInc'];
      const line = cart.items().find(i => i.key === key);
      if (line) cart.setQty(key, line.qty + (inc ? 1 : -1));
      return;
    }

    const rm = t.closest('[data-remove]');
    if (rm) {
      const removed = cart.remove(rm.dataset.remove);
      if (removed) {
        const p = L.getProduct(removed.line.id);
        L.toast(`<strong>${esc(p.name)}</strong> a été retiré du panier.`, { icon: 'trash', action: { label: 'Annuler', fn: () => cart.restore(removed) } });
      }
      return;
    }

    const sug = t.closest('[data-suggest]');
    if (sug) {
      const input = $('#search input');
      input.value = sug.dataset.suggest;
      renderSearch(input.value);
      input.focus();
      return;
    }

    const copy = t.closest('[data-copy]');
    if (copy) {
      const text = copy.dataset.copy;
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(
        () => L.toast(`Code <strong>${esc(text)}</strong> copié.`, { icon: 'copy' }),
        () => L.toast(`Votre code : <strong>${esc(text)}</strong>`, { icon: 'tag' }));
      return;
    }

    if (t.closest('.moon-top')) window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') $$('.drawer.is-open, .search.is-open').forEach(el => closePanel(el));
    if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); openPanel('search'); }
  });

  document.addEventListener('input', e => {
    if (e.target.matches('#search input')) renderSearch(e.target.value);
  });

  document.addEventListener('submit', e => {
    const form = e.target;
    if (!form.matches('[data-newsletter]')) return;
    e.preventDefault();
    const input = $('input[type="email"]', form);
    if (L.validators.email(input.value)) {
      input.focus();
      L.toast('Entrez une adresse courriel valide.', { type: 'error' });
      return;
    }
    const code = L.subscribe(input.value.trim().toLowerCase());
    form.outerHTML = `<div class="code-reveal">
      <p>${icon('sparkle')} Bienvenue dans l’univers Lunaria ! Votre code de bienvenue :</p>
      <button type="button" class="code-pill" data-copy="${code}">${code}${icon('copy')}</button>
      <small>15 % sur une commande de 100 $ et plus.</small></div>`;
  });

  /* ======================================================================
     Initialisation
     ====================================================================== */
  function init() {
    const body = document.body;
    body.insertAdjacentHTML('afterbegin', headerHTML());
    body.insertAdjacentHTML('beforeend', footerHTML() + overlaysHTML());
    renderCart();
    renderBadges();
    rotateAnnounce();
    L.on('cart', renderCart);
    L.on('wishlist', renderBadges);
    L.on('account', renderBadges);
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { onScroll(); ticking = false; });
    }, { passive: true });
    onScroll();
    L.reveal();
    requestAnimationFrame(() => body.classList.add('is-ready'));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.Lunaria = window.Lunaria || {});
