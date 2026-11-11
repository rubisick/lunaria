/* Lunaria — catalogue des montures, options de verres et rendu SVG des lunettes.
   Les images produits sont dessinées en SVG : chaque couleur recolore la monture en direct. */
(function (L) {
  'use strict';

  /* ---------- Formes de verres (verre gauche, centré sur 0,0 ; le nez est du côté +x) ---------- */
  const SHAPES = {
    rond:      { label: 'Ronde',         inner: 66, outer: 66, top: -66, d: 'M-66 0a66 66 0 1 0 132 0a66 66 0 1 0-132 0Z' },
    ovale:     { label: 'Ovale',         inner: 78, outer: 78, top: -52, d: 'M-78 0a78 52 0 1 0 156 0a78 52 0 1 0-156 0Z' },
    rectangle: { label: 'Rectangulaire', inner: 78, outer: 78, top: -46, d: 'M-56-46H56Q78-46 78-24V24Q78 46 56 46H-56Q-78 46-78 24V-24Q-78-46-56-46Z' },
    carre:     { label: 'Carrée',        inner: 72, outer: 72, top: -60, d: 'M-44-60H44Q72-60 72-32V32Q72 60 44 60H-44Q-72 60-72 32V-32Q-72-60-44-60Z' },
    trapeze:   { label: 'Trapèze',       inner: 78, outer: 84, top: -54, d: 'M-70-54L64-48Q80-47 78-31L68 34Q64 52 46 52L-42 54Q-62 54-68 38L-84-34Q-86-54-70-54Z' },
    pantos:    { label: 'Pantos',        inner: 72, outer: 72, top: -56, d: 'M-72-26C-72-52-40-56 0-56S72-52 72-26C72 18 42 58 0 58S-72 18-72-26Z' },
    papillon:  { label: 'Œil-de-chat',   inner: 72, outer: 86, top: -60, d: 'M70-24C60-48-16-54-86-62C-84-30-74 16-42 42C-14 62 44 58 62 30C74 10 76-10 70-24Z' },
    aviateur:  { label: 'Aviateur',      inner: 76, outer: 84, top: -50, d: 'M-80-44C-60-54 50-54 70-44C84-36 80-4 66 26C52 56 30 66 4 64C-34 60-66 36-78 4C-86-20-88-38-80-44Z' },
    hexagonal: { label: 'Hexagonale',    inner: 80, outer: 80, top: -54, d: 'M-42-54H42L80 0L42 54H-42L-80 0Z' },
    oversize:  { label: 'Oversize',      inner: 86, outer: 86, top: -68, d: 'M-46-68H46Q86-68 86-28V28Q86 68 46 68H-46Q-86 68-86 28V-28Q-86-68-46-68Z' }
  };

  const MATERIALS = { acetate: 'Acétate', metal: 'Métal', titane: 'Titane' };
  const TYPES = { optique: 'Lunettes optiques', solaire: 'Lunettes solaires' };

  /* ---------- Verres et options ---------- */
  const LENSES = {
    optique: [
      { id: 'neutre', name: 'Sans correction', desc: 'Verres neutres antireflet et anti-rayures', price: 0 },
      { id: 'unifocal', name: 'Unifocaux', desc: 'Correction pour voir de loin ou de près', price: 79, rx: true },
      { id: 'progressif', name: 'Progressifs', desc: 'Toutes les distances dans un seul verre', price: 229, rx: true }
    ],
    solaire: [
      { id: 'teinte', name: 'Teintés cat. 3', desc: 'Protection UV400 incluse', price: 0 },
      { id: 'polarise', name: 'Polarisés', desc: 'Coupent les reflets sur l’eau, la neige et la route', price: 45 },
      { id: 'correcteur', name: 'Solaires à ma vue', desc: 'Verres teintés avec votre correction', price: 109, rx: true }
    ]
  };
  const ADDONS = {
    optique: [
      { id: 'bleue', name: 'Filtre lumière bleue', desc: 'Plus de confort devant les écrans', price: 35 },
      { id: 'photo', name: 'Photochromiques', desc: 'S’assombrissent automatiquement au soleil', price: 89 },
      { id: 'amincis', name: 'Verres amincis 1.67', desc: 'Conseillé au-delà de ±4,00', price: 59, rxOnly: true }
    ],
    solaire: [
      { id: 'miroir', name: 'Traitement miroir', desc: 'Reflet doré sur la face avant', price: 30 }
    ]
  };

  /* ---------- Avis clients (échantillon) ---------- */
  const REVIEW_POOL = [
    { name: 'Camille R.', city: 'Montréal', rating: 5, title: 'Légères et magnifiques', text: 'Je les porte toute la journée sans y penser. La finition est impeccable et la livraison a été rapide.' },
    { name: 'Julien T.', city: 'Québec', rating: 5, title: 'Service impeccable', text: 'J’ai envoyé mon ordonnance par courriel le soir même et les lunettes sont arrivées la semaine suivante. Parfait.' },
    { name: 'Sarah L.', city: 'Gatineau', rating: 4, title: 'Très belles', text: 'La couleur est encore plus belle en vrai. Elles glissaient un peu au début, un petit ajustement a réglé ça.' },
    { name: 'Maxime B.', city: 'Sherbrooke', rating: 5, title: 'Mon troisième achat', text: 'Toujours la même qualité. L’étui en liège est un très beau détail.' },
    { name: 'Léa P.', city: 'Toronto', rating: 5, title: 'Coup de cœur', text: 'On me complimente chaque fois que je les porte. Le retour gratuit m’a rassurée, mais je n’en ai pas eu besoin.' },
    { name: 'Olivier M.', city: 'Ottawa', rating: 4, title: 'Bon rapport qualité-prix', text: 'Verres antireflet de très bonne qualité. Le délai était un peu plus long pour les progressifs, mais ça valait la peine.' },
    { name: 'Inès D.', city: 'Laval', rating: 5, title: 'Parfaites pour les écrans', text: 'Avec le filtre lumière bleue, mes fins de journée sont beaucoup plus confortables.' },
    { name: 'Thomas G.', city: 'Trois-Rivières', rating: 4, title: 'Belle monture', text: 'Un peu étroite pour mon visage au départ, mais le service client m’a proposé un échange sans aucun souci.' }
  ];

  /* ---------- Produits ---------- */
  const products = [
    {
      id: 'ambre', name: 'Ambre', type: 'optique', shape: 'pantos', material: 'titane', stroke: 9,
      price: 189, tagline: 'Titane recyclé · écaille dorée',
      description: 'Une monture pantos chaleureuse aux reflets brun doré. Son titane recyclé la rend étonnamment légère : on l’oublie dès qu’on la porte.',
      features: ['Titane recyclé ultra-léger (16 g)', 'Charnières flexibles', 'Plaquettes nasales ajustables', 'Étui en liège et chiffonnette inclus'],
      colors: [
        { id: 'ecaille', name: 'Écaille dorée', hex: '#8a5a36', pattern: 'tortoise' },
        { id: 'miel', name: 'Miel', hex: '#BF947A' },
        { id: 'nuit', name: 'Bleu nuit', hex: '#1A2E40' }
      ],
      dims: { lens: 49, bridge: 21, temple: 145 }, fit: 'Moyenne', gender: 'Unisexe',
      tags: ['bestseller', 'responsable'], stock: 14, rating: 4.8, reviewCount: 126, added: '2026-02-10'
    },
    {
      id: 'celeste', name: 'Céleste', type: 'optique', shape: 'rectangle', material: 'acetate', stroke: 8,
      price: 139, compareAt: 159, tagline: 'Acétate biosourcé · bleu nuit mat',
      description: 'Une ligne rectangulaire épurée, taillée dans un acétate biosourcé au fini mat. Discrète au bureau, élégante en soirée.',
      features: ['Acétate biosourcé à base de coton', 'Fini mat velouté', 'Charnières 5 barils', 'Étui en liège et chiffonnette inclus'],
      colors: [
        { id: 'nuit', name: 'Bleu nuit', hex: '#1A2E40' },
        { id: 'ardoise', name: 'Ardoise', hex: '#364C59' },
        { id: 'rose', name: 'Rose poudré', hex: '#d29f8b' }
      ],
      dims: { lens: 52, bridge: 18, temple: 140 }, fit: 'Moyenne', gender: 'Unisexe',
      tags: ['responsable', 'solde'], stock: 22, rating: 4.6, reviewCount: 88, added: '2025-11-03'
    },
    {
      id: 'horizon', name: 'Horizon', type: 'optique', shape: 'carre', material: 'acetate', stroke: 10,
      price: 179, tagline: 'Carrée · minimaliste et unisexe',
      description: 'Une forme carrée aux angles adoucis, pensée pour tous les visages. Le modèle que l’on garde des années.',
      features: ['Acétate biosourcé', 'Âme métallique ajustable dans les branches', 'Charnières renforcées', 'Étui en liège et chiffonnette inclus'],
      colors: [
        { id: 'ardoise', name: 'Ardoise', hex: '#364C59' },
        { id: 'cristal', name: 'Cristal fumé', hex: '#8fa2ad', pattern: 'crystal' },
        { id: 'noir', name: 'Noir', hex: '#151515' }
      ],
      dims: { lens: 51, bridge: 20, temple: 145 }, fit: 'Large', gender: 'Unisexe',
      tags: ['responsable'], stock: 9, rating: 4.7, reviewCount: 64, added: '2025-09-15'
    },
    {
      id: 'eclipse', name: 'Éclipse', type: 'optique', shape: 'trapeze', material: 'acetate', stroke: 13,
      price: 169, tagline: 'Acétate épais · ligne affirmée',
      description: 'Une monture généreuse en acétate italien, au caractère affirmé. Ses angles légèrement relevés structurent le regard.',
      features: ['Acétate italien poli à la main', 'Épaisseur 6 mm', 'Charnières 5 barils', 'Étui en liège et chiffonnette inclus'],
      colors: [
        { id: 'noir', name: 'Noir', hex: '#111111' },
        { id: 'ecaille', name: 'Écaille sombre', hex: '#3a2416', pattern: 'tortoise-dark' },
        { id: 'bordeaux', name: 'Bordeaux', hex: '#6e2b34' }
      ],
      dims: { lens: 53, bridge: 19, temple: 145 }, fit: 'Large', gender: 'Unisexe',
      tags: ['bestseller'], stock: 18, rating: 4.9, reviewCount: 152, added: '2025-06-01'
    },
    {
      id: 'brume', name: 'Brume', type: 'optique', shape: 'ovale', material: 'metal', stroke: 5,
      price: 159, compareAt: 189, tagline: 'Métal fin · gris doux',
      description: 'Un fil de métal ovale, presque invisible, qui laisse toute la place au regard. Douceur et légèreté au quotidien.',
      features: ['Acier inoxydable hypoallergénique', 'Plaquettes nasales en silicone', 'Embouts en acétate', 'Étui en liège et chiffonnette inclus'],
      colors: [
        { id: 'gris', name: 'Gris brume', hex: '#7b8d91' },
        { id: 'argent', name: 'Argent', hex: '#a7b0b5' },
        { id: 'or-rose', name: 'Or rose', hex: '#c49a76' }
      ],
      dims: { lens: 50, bridge: 19, temple: 140 }, fit: 'Étroite', gender: 'Unisexe',
      tags: ['solde'], stock: 11, rating: 4.5, reviewCount: 41, added: '2025-04-20'
    },
    {
      id: 'opale', name: 'Opale', type: 'optique', shape: 'rond', material: 'metal', stroke: 5,
      price: 149, tagline: 'Ronde · fil de métal doré',
      description: 'La ronde intemporelle, réinterprétée avec un pont en trou de serrure et un fil de métal brossé à la main.',
      features: ['Métal brossé à la main', 'Pont en trou de serrure', 'Plaquettes nasales ajustables', 'Étui en liège et chiffonnette inclus'],
      colors: [
        { id: 'or', name: 'Or pâle', hex: '#c2a06a' },
        { id: 'argent', name: 'Argent', hex: '#a7b0b5' },
        { id: 'noir', name: 'Noir mat', hex: '#232323' }
      ],
      dims: { lens: 47, bridge: 21, temple: 145 }, fit: 'Étroite', gender: 'Unisexe',
      tags: ['nouveau'], stock: 3, rating: 4.7, reviewCount: 19, added: '2026-09-01'
    },
    {
      id: 'zenith', name: 'Zénith', type: 'optique', shape: 'hexagonal', material: 'titane', stroke: 6,
      price: 199, tagline: 'Hexagonale · titane recyclé',
      description: 'Six facettes nettes et un titane recyclé d’à peine 14 g. Une géométrie précise pour un regard lumineux.',
      features: ['Titane recyclé (14 g)', 'Charnières sans vis', 'Plaquettes nasales ajustables', 'Étui en liège et chiffonnette inclus'],
      colors: [
        { id: 'titane', name: 'Titane brossé', hex: '#8e9497' },
        { id: 'or', name: 'Or pâle', hex: '#c9ad7d' },
        { id: 'nuit', name: 'Bleu nuit', hex: '#1A2E40' }
      ],
      dims: { lens: 50, bridge: 20, temple: 145 }, fit: 'Moyenne', gender: 'Unisexe',
      tags: ['nouveau', 'responsable'], stock: 7, rating: 4.8, reviewCount: 12, added: '2026-10-05'
    },
    {
      id: 'nacre', name: 'Nacre', type: 'optique', shape: 'papillon', material: 'acetate', stroke: 10,
      price: 159, tagline: 'Œil-de-chat · reflets nacrés',
      description: 'Un œil-de-chat tout en douceur : la pointe se relève à peine pour illuminer le regard, sans jamais en faire trop.',
      features: ['Acétate nacré poli à la main', 'Pointes légèrement relevées', 'Charnières flexibles', 'Étui en liège et chiffonnette inclus'],
      colors: [
        { id: 'rose', name: 'Nacre rosée', hex: '#d6ad9b' },
        { id: 'noir', name: 'Noir', hex: '#141414' },
        { id: 'ecaille', name: 'Écaille', hex: '#8a5a36', pattern: 'tortoise' }
      ],
      dims: { lens: 51, bridge: 18, temple: 140 }, fit: 'Moyenne', gender: 'Femme',
      tags: ['nouveau'], stock: 16, rating: 4.6, reviewCount: 27, added: '2026-08-22'
    },
    {
      id: 'solstice', name: 'Solstice', type: 'solaire', shape: 'rond', material: 'acetate', stroke: 12,
      price: 179, tagline: 'Ronde · verres brun dégradé',
      description: 'Une solaire ronde à l’acétate généreux, avec des verres dégradés qui adoucissent la lumière de fin de journée.',
      features: ['Acétate biosourcé', 'Verres catégorie 3, UV400', 'Charnières 5 barils', 'Étui en liège et chiffonnette inclus'],
      colors: [
        { id: 'ecaille', name: 'Écaille · verres bruns', hex: '#8a5a36', pattern: 'tortoise', lens: '#5b3a24' },
        { id: 'noir', name: 'Noir · verres gris', hex: '#141414', lens: '#2c3439' },
        { id: 'miel', name: 'Miel · verres rosés', hex: '#BF947A', lens: '#a3685a' }
      ],
      dims: { lens: 49, bridge: 22, temple: 145 }, fit: 'Moyenne', gender: 'Unisexe',
      tags: ['bestseller', 'responsable'], stock: 20, rating: 4.8, reviewCount: 97, added: '2026-04-12'
    },
    {
      id: 'aurore', name: 'Aurore', type: 'solaire', shape: 'papillon', material: 'acetate', stroke: 11,
      price: 169, tagline: 'Œil-de-chat · verres rosés',
      description: 'Inspirée des premières lueurs du jour : une silhouette œil-de-chat et des verres rosés qui réchauffent les couleurs.',
      features: ['Acétate poli à la main', 'Verres catégorie 3, UV400', 'Charnières flexibles', 'Étui en liège et chiffonnette inclus'],
      colors: [
        { id: 'blush', name: 'Blush · verres rosés', hex: '#e0b29c', lens: '#9c5b4f' },
        { id: 'noir', name: 'Noir · verres gris', hex: '#141414', lens: '#2c3439' },
        { id: 'ecaille', name: 'Écaille · verres bruns', hex: '#8a5a36', pattern: 'tortoise', lens: '#4b3324' }
      ],
      dims: { lens: 54, bridge: 17, temple: 140 }, fit: 'Moyenne', gender: 'Femme',
      tags: ['nouveau'], stock: 12, rating: 4.7, reviewCount: 33, added: '2026-07-18'
    },
    {
      id: 'equinoxe', name: 'Équinoxe', type: 'solaire', shape: 'aviateur', material: 'metal', stroke: 5,
      price: 199, tagline: 'Aviateur · double pont',
      description: 'L’aviateur revisité avec un double pont fin et des verres minéraux d’une grande clarté. Un classique pour toutes les saisons.',
      features: ['Métal léger traité anticorrosion', 'Verres minéraux catégorie 3', 'Plaquettes nasales ajustables', 'Étui en liège et chiffonnette inclus'],
      colors: [
        { id: 'or', name: 'Or · verres verts', hex: '#c2a06a', lens: '#3d4b37' },
        { id: 'argent', name: 'Argent · verres gris', hex: '#a7b0b5', lens: '#36424b' },
        { id: 'noir', name: 'Noir · verres fumés', hex: '#222222', lens: '#1f282e' }
      ],
      dims: { lens: 58, bridge: 14, temple: 140 }, fit: 'Large', gender: 'Unisexe',
      tags: ['bestseller'], stock: 15, rating: 4.9, reviewCount: 141, added: '2025-05-30'
    },
    {
      id: 'sirocco', name: 'Sirocco', type: 'solaire', shape: 'oversize', material: 'acetate', stroke: 12,
      price: 189, tagline: 'Oversize · verres fumés',
      description: 'Une grande monture enveloppante pour les jours de plein soleil. Une allure de vacances, toute l’année.',
      features: ['Acétate épais', 'Verres catégorie 3, UV400', 'Charnières 5 barils', 'Étui en liège et chiffonnette inclus'],
      colors: [
        { id: 'noir', name: 'Noir · verres gris', hex: '#141414', lens: '#2c3439' },
        { id: 'ecaille', name: 'Écaille · verres bruns', hex: '#8a5a36', pattern: 'tortoise', lens: '#4b3324' },
        { id: 'creme', name: 'Crème · verres taupe', hex: '#e9dccb', lens: '#6b5a4c' }
      ],
      dims: { lens: 56, bridge: 18, temple: 145 }, fit: 'Large', gender: 'Femme',
      tags: [], stock: 0, restock: 'début décembre', rating: 4.4, reviewCount: 22, added: '2025-07-02'
    }
  ];

  products.forEach((p, i) => {
    p.reviews = [0, 3, 5].map((offset, j) => Object.assign({}, REVIEW_POOL[(i + offset) % REVIEW_POOL.length], {
      date: new Date(2026, 9 - j * 2, 24 - ((i * 7 + j * 5) % 20)).toISOString()
    }));
  });

  /* ---------- Rendu SVG ---------- */
  let seq = 0;

  function patternDef(id, kind) {
    if (kind === 'tortoise' || kind === 'tortoise-dark') {
      const dark = kind === 'tortoise-dark';
      const base = dark ? '#2a1b12' : '#6b3f22';
      const spots = dark ? ['#4f311c', '#7a4b28', '#160d08'] : ['#2e1a0e', '#b07a45', '#d6a065'];
      return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="46" height="46" patternTransform="rotate(28)">
        <rect width="46" height="46" fill="${base}"/>
        <ellipse cx="10" cy="12" rx="9" ry="6" fill="${spots[0]}"/>
        <ellipse cx="32" cy="26" rx="10" ry="7" fill="${spots[1]}" opacity=".9"/>
        <circle cx="16" cy="36" r="5" fill="${spots[2]}" opacity=".85"/>
        <circle cx="40" cy="6" r="4" fill="${spots[1]}" opacity=".7"/>
      </pattern>`;
    }
    return '';
  }

  function color(p, colorId) {
    return p.colors.find(c => c.id === colorId) || p.colors[0];
  }

  function frameSVG(p, colorId, opts) {
    opts = opts || {};
    const s = SHAPES[p.shape];
    const c = color(p, colorId);
    const uid = 'lf' + (++seq);
    const cy = 150, halfBridge = 30;
    const lx = 280 - halfBridge - s.inner;
    const rx = 280 + halfBridge + s.inner;
    const sw = p.stroke;
    const solar = p.type === 'solaire';
    const paint = c.pattern && c.pattern.startsWith('tortoise') ? `url(#${uid}p)` : c.hex;
    const crystal = c.pattern === 'crystal';
    const lensTop = solar ? c.lens : '#dfeaf1';
    const lensBottom = solar ? c.lens : '#ffffff';
    const lensDefs = `<linearGradient id="${uid}l" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${lensTop}" stop-opacity="${solar ? .96 : .7}"/>
      <stop offset="1" stop-color="${lensBottom}" stop-opacity="${solar ? .62 : .25}"/></linearGradient>`;
    const bridgeY = cy + s.top * 0.38;
    const templeY = cy + s.top * 0.55;
    const strokeAttrs = `fill="none" stroke="${paint}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"${crystal ? ' stroke-opacity=".6"' : ''}`;
    const shine = sw >= 9 ? `<path d="${s.d}" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="${(sw * 0.28).toFixed(1)}" transform="translate(0 -${(sw * 0.22).toFixed(1)})"/>` : '';
    const lens = (x, mirror) => `<g transform="translate(${x} ${cy})${mirror ? ' scale(-1 1)' : ''}">
        <path d="${s.d}" fill="url(#${uid}l)"/>
        <path class="frame-rim" d="${s.d}" ${strokeAttrs}/>${shine}</g>`;
    const glint = x => `<path d="M${x - 40} ${cy - 4}l24-28M${x - 26} ${cy + 8}l12-14" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity="${solar ? .38 : .75}"/>`;
    const extra = p.shape === 'aviateur'
      ? `<path d="M${lx + s.inner - 34} ${cy + s.top + 2}H${rx - s.inner + 34}" ${strokeAttrs}/>`
      : '';
    const label = opts.label === false ? 'aria-hidden="true"' : `role="img" aria-label="${p.name} — ${c.name}"`;
    return `<svg class="frame" viewBox="0 0 560 300" ${label} xmlns="http://www.w3.org/2000/svg">
      <defs>${patternDef(uid + 'p', c.pattern || '')}${lensDefs}</defs>
      <g class="frame-temples"><path d="M${lx - s.outer + 4} ${templeY}l-46-16M${rx + s.outer - 4} ${templeY}l46-16" ${strokeAttrs}/></g>
      ${lens(lx, false)}${lens(rx, true)}
      <path d="M${lx + s.inner - 6} ${bridgeY}Q280 ${bridgeY - 28} ${rx - s.inner + 6} ${bridgeY}" ${strokeAttrs}/>
      ${extra}${glint(lx)}${glint(rx)}
    </svg>`;
  }

  /* Petite icône de forme (filtres du catalogue) */
  function shapeIcon(shape) {
    const s = SHAPES[shape];
    return `<svg viewBox="-100 -80 200 160" aria-hidden="true"><path d="${s.d}" fill="none" stroke="currentColor" stroke-width="12" stroke-linejoin="round"/></svg>`;
  }

  /* Pastille de couleur (CSS) */
  function swatchStyle(c) {
    let bg;
    if (c.pattern === 'tortoise') bg = 'radial-gradient(circle at 30% 30%,#2e1a0e 0 20%,transparent 22%),radial-gradient(circle at 70% 64%,#d6a065 0 16%,transparent 18%),radial-gradient(circle at 34% 78%,#b07a45 0 12%,transparent 14%),#6b3f22';
    else if (c.pattern === 'tortoise-dark') bg = 'radial-gradient(circle at 30% 30%,#7a4b28 0 20%,transparent 22%),radial-gradient(circle at 70% 64%,#4f311c 0 16%,transparent 18%),#2a1b12';
    else if (c.pattern === 'crystal') bg = `linear-gradient(135deg,#fff 0%,${c.hex} 70%)`;
    else bg = c.hex;
    if (c.lens) bg = `linear-gradient(to bottom,transparent 50%,${c.lens} 50%),${bg}`;
    return `background:${bg}`;
  }

  L.SHAPES = SHAPES;
  L.MATERIALS = MATERIALS;
  L.TYPES = TYPES;
  L.LENSES = LENSES;
  L.ADDONS = ADDONS;
  L.products = products;
  L.getProduct = id => products.find(p => p.id === id);
  L.color = color;
  L.frameSVG = frameSVG;
  L.shapeIcon = shapeIcon;
  L.swatchStyle = swatchStyle;
})(window.Lunaria = window.Lunaria || {});
