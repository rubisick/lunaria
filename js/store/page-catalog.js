/* Lunaria — catalogue : filtres, tri, recherche, état synchronisé avec l’URL */
Lunaria.ready(function () {
  'use strict';
  const L = Lunaria;
  const { $, $$, esc } = L;

  const form = $('[data-filters]');
  const grid = $('[data-catalog-grid]');
  const sortSel = $('[data-sort]');
  const panel = $('#filters');
  const backdrop = $('.filters-backdrop');
  const MAX_PRICE = 200;

  const TAG_LABELS = { nouveau: 'Nouveautés', solde: 'En solde', responsable: 'Collection responsable' };

  /* ---------- État à partir de l’URL ---------- */
  const params = L.params();
  const list = key => (params.get(key) || '').split(',').filter(Boolean);
  const state = {
    type: params.get('type') || '',
    shape: list('shape'),
    mat: list('mat'),
    max: Math.min(MAX_PRICE, +params.get('max') || MAX_PRICE),
    tag: list('tag'),
    stock: params.get('stock') === '1',
    q: params.get('q') || '',
    sort: params.get('sort') || 'pertinence'
  };

  /* ---------- Options de filtres générées depuis le catalogue ---------- */
  const shapes = Object.keys(L.SHAPES).filter(s => L.products.some(p => p.shape === s));
  $('[data-shapes]').innerHTML = shapes.map(s => `
    <label class="shape-opt"><input type="checkbox" name="shape" value="${s}"><span>${L.shapeIcon(s)}${L.SHAPES[s].label}</span></label>`).join('');
  $('[data-materials]').innerHTML = Object.keys(L.MATERIALS).map(m => `
    <label class="check"><input type="checkbox" name="mat" value="${m}">${L.MATERIALS[m]}<small>${L.products.filter(p => p.material === m).length}</small></label>`).join('');

  function syncForm() {
    $$('input[name="type"]', form).forEach(i => { i.checked = i.value === state.type; });
    $$('input[name="shape"]', form).forEach(i => { i.checked = state.shape.includes(i.value); });
    $$('input[name="mat"]', form).forEach(i => { i.checked = state.mat.includes(i.value); });
    $$('input[name="tag"]', form).forEach(i => { i.checked = state.tag.includes(i.value); });
    $('input[name="stock"]', form).checked = state.stock;
    $('input[name="max"]', form).value = state.max;
    $('[data-price-out]').textContent = state.max >= MAX_PRICE ? 'Tous' : `${state.max} $`;
    sortSel.value = state.sort;
  }

  function readForm() {
    state.type = ($('input[name="type"]:checked', form) || {}).value || '';
    state.shape = $$('input[name="shape"]:checked', form).map(i => i.value);
    state.mat = $$('input[name="mat"]:checked', form).map(i => i.value);
    state.tag = $$('input[name="tag"]:checked', form).map(i => i.value);
    state.stock = $('input[name="stock"]', form).checked;
    state.max = +$('input[name="max"]', form).value;
    state.sort = sortSel.value;
  }

  function writeURL() {
    const p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.type) p.set('type', state.type);
    if (state.shape.length) p.set('shape', state.shape.join(','));
    if (state.mat.length) p.set('mat', state.mat.join(','));
    if (state.tag.length) p.set('tag', state.tag.join(','));
    if (state.max < MAX_PRICE) p.set('max', state.max);
    if (state.stock) p.set('stock', '1');
    if (state.sort !== 'pertinence') p.set('sort', state.sort);
    const qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
  }

  /* ---------- Filtrage et tri ---------- */
  function results() {
    let out = state.q ? L.search(state.q) : L.products.slice();
    out = out.filter(p =>
      (!state.type || p.type === state.type) &&
      (!state.shape.length || state.shape.includes(p.shape)) &&
      (!state.mat.length || state.mat.includes(p.material)) &&
      (!state.tag.length || state.tag.every(t => p.tags.includes(t))) &&
      p.price <= state.max &&
      (!state.stock || L.stock(p.id) > 0));
    const by = {
      'prix-asc': (a, b) => a.price - b.price,
      'prix-desc': (a, b) => b.price - a.price,
      note: (a, b) => b.rating - a.rating,
      nouveautes: (a, b) => new Date(b.added) - new Date(a.added)
    }[state.sort];
    if (by) out.sort(by);
    else if (!state.q) out.sort((a, b) => (L.stock(b.id) > 0) - (L.stock(a.id) > 0));
    return out;
  }

  /* ---------- Titre de la page selon le contexte ---------- */
  function heading() {
    let title = 'Toutes les lunettes';
    let sub = 'Montures optiques et solaires, dessinées pour la lumière du quotidien.';
    if (state.q) { title = `Résultats pour « ${state.q} »`; sub = 'Affinez votre recherche avec les filtres.'; }
    else if (state.type === 'optique') { title = 'Lunettes optiques'; sub = 'Des montures légères, avec ou sans correction. Antireflet inclus.'; }
    else if (state.type === 'solaire') { title = 'Lunettes solaires'; sub = 'Protection UV400, verres polarisés ou à votre vue.'; }
    else if (state.tag.length === 1) {
      title = TAG_LABELS[state.tag[0]];
      sub = { nouveau: 'Les dernières montures sorties de notre atelier.', solde: 'Quelques modèles à prix doux, en quantité limitée.', responsable: 'Titane recyclé et acétate biosourcé.' }[state.tag[0]];
    }
    $('[data-cat-title]').textContent = title;
    $('[data-cat-sub]').textContent = sub;
    $('[data-cat-crumb]').textContent = title;
    document.title = `${title} — Lunaria`;
  }

  /* ---------- Étiquettes des filtres actifs ---------- */
  function chips() {
    const c = [];
    const chip = (label, key, value) => c.push(`<button type="button" class="chip" data-chip="${key}" data-value="${esc(value || '')}">${esc(label)}${L.icon('x')}</button>`);
    if (state.q) chip(`« ${state.q} »`, 'q');
    if (state.type) chip(state.type === 'optique' ? 'Optiques' : 'Solaires', 'type');
    state.shape.forEach(s => chip(L.SHAPES[s].label, 'shape', s));
    state.mat.forEach(m => chip(L.MATERIALS[m], 'mat', m));
    state.tag.forEach(t => chip(TAG_LABELS[t], 'tag', t));
    if (state.max < MAX_PRICE) chip(`Jusqu’à ${state.max} $`, 'max');
    if (state.stock) chip('En stock', 'stock');
    $('[data-chips]').innerHTML = c.length ? c.join('') + '<button type="button" class="link-btn" data-filters-reset>Tout effacer</button>' : '';
    const n = c.length - (state.q ? 1 : 0);
    $('[data-filter-count]').textContent = n || '';
  }

  function render() {
    const items = results();
    heading();
    chips();
    $('[data-result-count]').innerHTML = `<strong>${items.length}</strong> ${items.length > 1 ? 'modèles' : 'modèle'}`;
    if (!items.length) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1">
        <div class="empty-moon" aria-hidden="true"></div>
        <h2>Aucune monture ne correspond</h2>
        <p>Essayez d’élargir vos critères ou de retirer un filtre.</p>
        <button type="button" class="btn" data-filters-reset>Réinitialiser les filtres</button></div>`;
      return;
    }
    L.renderGrid(grid, items);
  }

  function update() { readForm(); syncForm(); writeURL(); render(); }

  function reset() {
    Object.assign(state, { type: '', shape: [], mat: [], max: MAX_PRICE, tag: [], stock: false, q: '', sort: 'pertinence' });
    syncForm(); writeURL(); render();
  }

  form.addEventListener('change', update);
  form.addEventListener('input', e => {
    if (e.target.name === 'max') $('[data-price-out]').textContent = +e.target.value >= MAX_PRICE ? 'Tous' : `${e.target.value} $`;
  });
  sortSel.addEventListener('change', update);

  document.addEventListener('click', e => {
    if (e.target.closest('[data-filters-reset]')) { reset(); return; }
    const chip = e.target.closest('[data-chip]');
    if (chip) {
      const { chip: key, value } = chip.dataset;
      if (key === 'q') state.q = '';
      else if (key === 'type') state.type = '';
      else if (key === 'max') state.max = MAX_PRICE;
      else if (key === 'stock') state.stock = false;
      else state[key] = state[key].filter(v => v !== value);
      syncForm(); writeURL(); render();
      return;
    }
    if (e.target.closest('[data-filters-open]')) openFilters(true);
    if (e.target.closest('[data-filters-close]')) openFilters(false);
  });

  /* ---------- Panneau de filtres sur mobile ---------- */
  function openFilters(on) {
    panel.classList.toggle('is-open', on);
    backdrop.classList.toggle('is-on', on);
    document.documentElement.classList.toggle('no-scroll', on);
    if (on) setTimeout(() => $('input', panel).focus(), 100);
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && panel.classList.contains('is-open')) openFilters(false); });

  syncForm();
  render();
});
