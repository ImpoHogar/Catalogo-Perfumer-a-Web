// =====================================================================
//  ARCHIVO COMPLETO js/dupes.js  -  version final 26/08/2026
//  43 relaciones (la prueba original + 42 pares)
// =====================================================================
//  QUE HACER, PASO A PASO:
//  1) Abri js/dupes.js en Visual Studio Code.
//  2) Ctrl+A para seleccionar TODO lo viejo y borralo.
//  3) Pega TODO este archivo, desde la primera linea hasta la ultima.
//  4) Guarda (Ctrl+S) y abri index.html en el navegador.
//  5) F12 -> pestana Console. Si no hay errores en rojo, quedo bien.
//
//  IMPORTANTE: es el archivo ENTERO, no un pedazo. Si lo pegas SIN borrar
//  lo viejo vas a tener dos veces "const DUPE_RELATIONS", el navegador tira
//  SyntaxError y no ejecuta nada del archivo. Eso es lo que causaba el
//  error "dupePanelHTML is not defined".
//
//  QUE SE PROBO ANTES DE MANDARTelo:
//  - Sintaxis validada.
//  - Se cargaron config, products, stock, data, utils y dupes en el mismo
//    orden que el index.html: los 86 ids referenciados existen en tu
//    products.js, no hay pares duplicados ni relaciones de un producto
//    consigo mismo, y las cinco funciones quedan definidas.
//  - Se probo la relacion en las dos direcciones. Ejemplo real: el Dior
//    Sauvage 100ml EDP muestra sus 5 dupes (Lattafa Asad, Armaf Club de
//    Nuit Urban Elixir, Armaf Ventana, Emir Frenetic Men y Maison Alhambra
//    Salvo), y cada uno de esos muestra el Sauvage.
//
//  UNICO PENDIENTE:
//  El id 3054 (LATAFFA YARA TOUS AMARILLO) no tiene foto y el catalogo
//  oculta los productos sin imagen. La relacion esta bien cargada pero su
//  boton no se va a ver hasta que le subas la foto.
// =====================================================================

// ============================================================
//  DUPE / INSPIRACION
// ============================================================
//  Cada entrada de DUPE_RELATIONS cubre las dos direcciones: no hace
//  falta repetir la relacion al reves.
// ============================================================

const DUPE_RELATIONS = [
  // ---------- PRUEBA ORIGINAL ----------
  { a: 5024, b: 2112, tipo: 'dupe_confirmado' }, // Valentino Uomo Born In Roma Intense <-> Stallion 53 Uomo Intense (Emper)

  // ---------- LATTAFA (11) ----------
  { a: 3043, b: 1372, tipo: 'inspiracion' }, // LATAFFA ASAD  <->  DIOR SAUVAGE 100ML EDP H
  { a: 3054, b: 3633, tipo: 'inspiracion' }, // LATAFFA YARA TOUS AMARILLO  <->  PACO.R FAME 80ML EDP M
  { a: 3102, b: 3593, tipo: 'inspiracion' }, // LATTAFA HAYAATI  <->  PACO R. INVICTUS EDT 100 ML
  { a: 3104, b: 557, tipo: 'inspiracion' }, // LATTAFA HAYAATI GOLD ELIXIR 100ML EDP U  <->  ARMANI CODE EDP 125ML
  { a: 3108, b: 5031, tipo: 'inspiracion' }, // LATTAFA JASOOR EDP  <->  VALENTINO UOMO BORN IN ROMA EDT H
  { a: 3148, b: 5340, tipo: 'inspiracion' }, // LATTAFA QAED AL FURSAN UNTAMED  <->  EROS EDT 100ML
  { a: 3163, b: 2879, tipo: 'inspiracion' }, // LATTAFA TERIAQ EDP 100ML  <->  JPG LA BELLE WOMAN EDP 100 ML
  { a: 3164, b: 2795, tipo: 'inspiracion' }, // LATTAFA THE KINGDOM H EDP 100ML  <->  JEAN PAUL.G LE MALE 125ML EDT H
  { a: 3183, b: 5298, tipo: 'inspiracion' }, // LATTAFA-FAKHAR XTRAIT 100ML  <->  1 MILLION ELIXIR PARFUM INTENSE 100ML
  { a: 3150, b: 990, tipo: 'inspiracion' }, // LATTAFA QIMMAH 100ML  <->  CAROLINA H. GOOD GIRL EDP 80 ML
  { a: 3122, b: 2453, tipo: 'inspiracion' }, // LATTAFA MAYAR VERDE 100ML EDP  <->  GIORGIO ARMANI MY WAY INTENSE EDP 90ML

  // ---------- EMPER (2) ----------
  { a: 1541, b: 2798, tipo: 'dupe_confirmado' }, // EMPER MANDORA BY STALLION 53  <->  JEAN PAUL.G SCANDAL 100ML EDT H
  { a: 1534, b: 5020, tipo: 'inspiracion' }, // EMPER DONNA INTENSE 100ML EDP M + 20 ML  <->  VALENTINO BORN IN ROMA DONNA 100ML

  // ---------- ARMAF (11) ----------
  { a: 1173, b: 1209, tipo: 'inspiracion' }, // CLUB DE NUIT INTENSE 105ML EDP M  <->  CREED AVENTUS FOR HER EDP 75ML
  { a: 1176, b: 5340, tipo: 'inspiracion' }, // CLUB DE NUIT URBAN 105ML EDP H  <->  EROS EDT 100ML
  { a: 421, b: 1372, tipo: 'inspiracion' }, // ARMAF CLUB NUIT URBAN ELIXIR EDP  <->  DIOR SAUVAGE 100ML EDP H
  { a: 469, b: 1211, tipo: 'inspiracion' }, // ARMAF LE PARFAIT 100ML EDP H  <->  CREED GREEN IRISH EDP 100ML
  { a: 2934, b: 1211, tipo: 'inspiracion' }, // L ARMAF LE PARFAIT 100ML EDP  <->  CREED GREEN IRISH EDP 100ML
  { a: 541, b: 3609, tipo: 'inspiracion' }, // ARMAF TAG HIM PRESTIGE EDT 100ML H  <->  PACO R. ONE MILLION PARFUM 100 ML
  { a: 562, b: 3592, tipo: 'inspiracion' }, // ARMAR EL CIELO 100ML EDP H  <->  PACO R. INVICTUS AQUA 100ML EDT
  { a: 516, b: 5182, tipo: 'inspiracion' }, // ARMAF ODYSSEY MEGA EDT 100ML H  <->  Y VES SAINT LAURENT Y EDT 100ML
  { a: 515, b: 5182, tipo: 'inspiracion' }, // ARMAF ODYSSEY MEGA 200ML EDP S  <->  Y VES SAINT LAURENT Y EDT 100ML
  { a: 548, b: 1372, tipo: 'inspiracion' }, // ARMAF VENTANA POUR HOMME  <->  DIOR SAUVAGE 100ML EDP H
  { a: 514, b: 2798, tipo: 'inspiracion' }, // ARMAF ODYSSEY MANDARIN SKY 200ML  <->  JEAN PAUL.G SCANDAL 100ML EDT H

  // ---------- AFNAN (2) ----------
  { a: 121, b: 2453, tipo: 'inspiracion' }, // AFNAN 9AM 100ML EDP  <->  GIORGIO ARMANI MY WAY INTENSE EDP 90ML
  { a: 146, b: 4873, tipo: 'inspiracion' }, // AFNAN RARE CARBON H 100 ML EDP  <->  TOM FORD EAU D´OMBRÉ LEATHER EDT 100ML

  // ---------- BHARARA (2) ----------
  { a: 720, b: 5171, tipo: 'inspiracion' }, // BHARARA KING 100ML EDP H  <->  XERJOFF ERBA PURA EDP 100ML
  { a: 721, b: 5171, tipo: 'inspiracion' }, // BHARARA KING 100ML PARFUM H  <->  XERJOFF ERBA PURA EDP 100ML

  // ---------- PARIS CORNER (4) ----------
  { a: 1526, b: 5167, tipo: 'inspiracion' }, // EMIR VOUX VIOLETTE EDP 100ML  <->  XERJOFF ACCENTO EDP 100ML
  { a: 1514, b: 1372, tipo: 'inspiracion' }, // EMIR FRENETIC MEN EDP 80ML  <->  DIOR SAUVAGE 100ML EDP H
  { a: 1515, b: 5342, tipo: 'inspiracion' }, // EMIR FRENETIC RED TEMP EDP 80ML  <->  FAHRENHEIT EDT 100ML
  { a: 1513, b: 5339, tipo: 'inspiracion' }, // EMIR FRENETIC HOMME INTENSE EDP 80ML  <->  DIOR HOMME INTENSE EDP 100ML

  // ---------- AL HARAMAIN (2) ----------
  { a: 233, b: 5171, tipo: 'inspiracion' }, // AL HARAMAIN AMBER OUD GOLD 200ML EDP  <->  XERJOFF ERBA PURA EDP 100ML
  { a: 234, b: 5171, tipo: 'inspiracion' }, // AL HARAMAIN AMBER OUD GOLD 60ML  <->  XERJOFF ERBA PURA EDP 100ML

  // ---------- PARES DEBILES: revisar antes de publicar (2) ----------
  // Salen de comentarios sueltos de usuarios, no de una lista editorial.
  // Si no los queres, borra estas lineas y listo.
  { a: 712, b: 574, tipo: 'inspiracion' }, // BHARARA DOUBLE BLEU POUR HOMME 100ML EDP  <->  AZZARO CHROME 100ML EDT H
  { a: 3869, b: 3593, tipo: 'inspiracion' }, // RASAI HAWAS 100ML EDP H  <->  PACO R. INVICTUS EDT 100 ML

  // ---------- RONDA FINAL: pares encontrados al revisar el catalogo completo (6) ----------
  { a: 525, b: 1506, tipo: 'inspiracion' }, // ARMAF ODYSSEY WHITE EDP 100ML  <->  ELYSIUM POUR HOMME ROJA EDP 100ML
  { a: 3244, b: 1372, tipo: 'inspiracion' }, // MAISON ALHAMBRA SALVO H EDP 100ML  <->  DIOR SAUVAGE 100ML EDP H
  { a: 3241, b: 2515, tipo: 'inspiracion' }, // MAISON ALHAMBRA GALATEA 100ML EDP U  <->  GODOLPHIN PARFUMS DE MARLY EDP 100ML
  { a: 3156, b: 831, tipo: 'inspiracion' }, // LATTAFA RAVE NOW 100ML EDP M  <->  BURBERRY HER EDT 100ML
  { a: 3171, b: 3276, tipo: 'inspiracion' }, // LATTAFA YARA MOI 100ML EDP U  <->  MARC JACOBS PERFECT INTENSE 100ML EDP M
  { a: 126, b: 2801, tipo: 'inspiracion' } // AFNAN 9PM 100ML EDP M  <->  JEAN PAUL.G ULTRA MALE INTENSE 125ML EDT (revisar: la referencia es el Ultra Male normal)
];

function getRelatedProducts(pid) {
  const rels = [];
  DUPE_RELATIONS.forEach(r => {
    if (r.a === pid && PRODUCTS_BY_ID[r.b]) rels.push({ product: PRODUCTS_BY_ID[r.b], tipo: r.tipo });
    else if (r.b === pid && PRODUCTS_BY_ID[r.a]) rels.push({ product: PRODUCTS_BY_ID[r.a], tipo: r.tipo });
  });
  return rels;
}

function dupePanelHTML(pid) {
  const rels = getRelatedProducts(pid);
  if (!rels.length) return '';
  const items = rels.map(r => {
    const rp = r.product;
    const imgSrc = rp.img ? `img/p${rp.id}.webp?v=${IMG_VERSION}` : placeholderImg(rp.brand);
    const label = r.tipo === 'dupe_confirmado' ? 'Dupe / Inspiración confirmada'
                : r.tipo === 'inspiracion'     ? 'Dupe / Inspiración'
                : 'Perfil similar';
    const stockNum = parseInt(rp.stock) || 0;
    const agotado = stockNum <= 0;
    const qty = qtyMap[rp.id] || 0;
    const qtyControls = agotado
      ? `<span class="dupe-item-agotado">Sin stock</span>`
      : `<button type="button" onclick="event.stopPropagation(); dupeChangeQty(${rp.id}, -1)">−</button>
         <input type="number" min="0" inputmode="numeric" pattern="[0-9]*" value="${qty}" id="dupe-qty-${rp.id}"
                onclick="event.stopPropagation()" onfocus="this.select()"
                onchange="event.stopPropagation(); dupeSetQty(${rp.id}, this.value)">
         <button type="button" onclick="event.stopPropagation(); dupeChangeQty(${rp.id}, 1)">+</button>`;
    return `<div class="dupe-item">
      <img src="${imgSrc}" alt="" onclick="event.stopPropagation(); jumpToProduct(${rp.id})">
      <div class="dupe-item-text" onclick="event.stopPropagation(); jumpToProduct(${rp.id})"><div class="dupe-item-brand">${escapeHtml(rp.brand)} · ${label}</div><div class="dupe-item-name">${escapeHtml(rp.name)}</div></div>
      <div class="dupe-item-qty">${qtyControls}</div>
    </div>`;
  }).join('');
  return `
    <button type="button" class="dupe-btn" onclick="event.stopPropagation(); toggleDupePanel(${pid})">🔄 Dupe / Inspiración</button>
    <div class="dupe-panel" id="dupe-panel-${pid}">
      <div class="dupe-label">Relacionado con:</div>
      ${items}
    </div>`;
}

function dupeSetQty(id, val) {
  setQty(id, val);
  const dInput = document.getElementById('dupe-qty-' + id);
  if (dInput) dInput.value = qtyMap[id] || 0;
}

function dupeChangeQty(id, delta) {
  const newVal = Math.max(0, (qtyMap[id] || 0) + delta);
  dupeSetQty(id, newVal);
}

function toggleDupePanel(pid) {
  const panel = document.getElementById('dupe-panel-' + pid);
  if (panel) panel.classList.toggle('open');
}

function jumpToProduct(pid) {
  const card = document.getElementById('card-' + pid);
  if (!card) { setStatus('Ese producto no está visible con los filtros actuales.', true); return; }
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  card.classList.add('dupe-highlight');
  setTimeout(() => card.classList.remove('dupe-highlight'), 1600);
}

PRODUCTS.forEach(p => { PRODUCTS_BY_ID[p.id] = p; });
