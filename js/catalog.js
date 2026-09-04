// ============================================================
//  CUADRICULA DEL CATALOGO
// ============================================================
//  Tarjetas, filtros, paginacion y las vistas "Dia del Nino" y
//  "Nuevos Ingresos".
// ============================================================

let diaNinoMode = false;

let nuevosIngresosMode = false;

let filteredProducts = VISIBLE_PRODUCTS;

let renderedCount = 0;

function isProductNew(p) {
  if (!MOSTRAR_ETIQUETA_NUEVO) return false;
  if (!p.dateAdded) return false;
  const added = new Date(p.dateAdded + 'T00:00:00');
  if (isNaN(added.getTime())) return false;
  const diffDays = (Date.now() - added.getTime()) / 86400000;
  return diffDays >= 0 && diffDays <= NEW_PRODUCT_DAYS;
}

// ============================================================
//  BANNER PRINCIPAL DE NUEVOS INGRESOS (reemplaza al boton
//  "Nuevos Ingresos" del toolbar)
// ============================================================
//  Muestra hasta 5 productos marcados como nuevos, rotando cada
//  pocos segundos, con un boton que activa el mismo modo
//  "Nuevos Ingresos" que ya existia (nuevosIngresosMode).
// ============================================================
let heroNuevosIndex = 0;
let heroNuevosTimer = null;

function renderHeroNuevos() {
  const hero = document.getElementById('heroNuevos');
  if (!hero) return;

  const nuevos = VISIBLE_PRODUCTS.filter(isProductNew).slice(0, 5);

  if (heroNuevosTimer) { clearInterval(heroNuevosTimer); heroNuevosTimer = null; }

  if (!nuevos.length) {
    hero.style.display = 'none';
    return;
  }

  hero.style.display = 'block';
  const track = document.getElementById('heroNuevosTrack');
  const dots = document.getElementById('heroNuevosDots');

  track.innerHTML = nuevos.map((p, i) => {
    const imgSrc = p.img ? `img/p${p.id}.webp?v=${IMG_VERSION}` : placeholderImg(p.brand);
    return `
    <div class="hero-nuevos-slide${i === 0 ? ' active' : ''}" data-i="${i}">
      <img src="${imgSrc}" alt="${escapeHtml(p.name)}">
      <div class="hero-nuevos-info">
        <div class="hero-nuevos-tag">Nuevo ingreso</div>
        <div class="hero-nuevos-brand">${escapeHtml(p.brand)}</div>
        <div class="hero-nuevos-name">${escapeHtml(p.name)}</div>
      </div>
    </div>`;
  }).join('') + `
    <button type="button" class="hero-nuevos-cta" onclick="showNuevosIngresos()">Ver todos los Nuevos Ingresos</button>`;

  dots.innerHTML = nuevos.map((p, i) =>
    `<span class="hero-nuevos-dot${i === 0 ? ' active' : ''}" data-i="${i}"></span>`
  ).join('');

  heroNuevosIndex = 0;
  if (nuevos.length > 1) {
    heroNuevosTimer = setInterval(() => advanceHeroNuevos(nuevos.length), 4000);
  }
}

function advanceHeroNuevos(total) {
  const slides = document.querySelectorAll('.hero-nuevos-slide');
  const dots = document.querySelectorAll('.hero-nuevos-dot');
  if (!slides.length) return;
  slides[heroNuevosIndex].classList.remove('active');
  dots[heroNuevosIndex].classList.remove('active');
  heroNuevosIndex = (heroNuevosIndex + 1) % total;
  slides[heroNuevosIndex].classList.add('active');
  dots[heroNuevosIndex].classList.add('active');
}


function renderBrandFilter() {
  const sel = document.getElementById('brandFilter');
  BRANDS.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b;
    opt.textContent = b;
    sel.appendChild(opt);
  });
}

// ============================================================
//  FILTRO DE CATEGORIA (tipo + genero combinados)
// ============================================================
const TIPO_GENERO_OPTIONS = ['Splash/Bodymist', 'Hombre', 'Mujer', 'Niños', 'Unisex', 'Mascota'];

let selectedTipoGenero = new Set();

function getTipoGeneroBucket(p) {
  if (p.tipo === 'Splash/Bodymist') return 'Splash/Bodymist';
  if (p.genero === 'Niños' || p.tipo === 'Niños') return 'Niños';
  if (p.genero === 'Hombre') return 'Hombre';
  if (p.genero === 'Mujer') return 'Mujer';
  if (p.genero === 'Unisex') return 'Unisex';
  if (p.genero === 'Mascota') return 'Mascota';
  return null;
}

function renderTipoGeneroFilter() {
  const wrap = document.getElementById('categoryTiles');
  if (!wrap) return;
  const counts = {};
  TIPO_GENERO_OPTIONS.forEach(o => counts[o] = 0);
  VISIBLE_PRODUCTS.forEach(p => {
    const b = getTipoGeneroBucket(p);
    if (b) counts[b]++;
  });
  const iconos = (typeof CATEGORIA_ICONOS !== 'undefined') ? CATEGORIA_ICONOS : {};
  wrap.innerHTML = TIPO_GENERO_OPTIONS.map(opt => {
    const activa = selectedTipoGenero.has(opt);
    const archivoIcono = iconos[opt];
    const iconoHTML = archivoIcono
      ? `<img src="img/categorias/${archivoIcono}?v=${IMG_VERSION}" alt="" class="category-tile-icon">`
      : '';
    return `
    <button type="button" class="category-tile${activa ? ' active' : ''}" onclick="toggleTipoGenero('${opt}')" aria-pressed="${activa}">
      ${iconoHTML}
      <span class="category-tile-label">${opt}</span>
      <span class="category-tile-count">${counts[opt]}</span>
    </button>`;
  }).join('');
}

function toggleTipoGenero(opt) {
  if (selectedTipoGenero.has(opt)) selectedTipoGenero.delete(opt); else selectedTipoGenero.add(opt);
  diaNinoMode = false;
  document.getElementById('diaNinoBanner').style.display = 'none';
  nuevosIngresosMode = false;
  document.getElementById('nuevosIngresosBanner').style.display = 'none';
  renderTipoGeneroFilter();
  applyFilters();
}

function clearTipoGenero() {
  selectedTipoGenero.clear();
  renderTipoGeneroFilter();
  applyFilters();
}

function cardHTML(p) {
  const safeName = escapeHtml(p.name);
  const safeCode = escapeHtml(p.code);
  const safeBrand = escapeHtml(p.brand);
  const imgSrc = p.img ? `img/p${p.id}.webp?v=${IMG_VERSION}` : placeholderImg(p.brand);
  const newBadge = isProductNew(p) ? '<div class="new-badge">NUEVO</div>' : '';
  const stockNum = parseInt(p.stock) || 0;
  const agotado = stockNum <= 0;
  const agotadoBadge = agotado ? '<div class="agotado-badge">AGOTADO</div>' : '';
  const stockLabel = agotado ? 'Agotado' : `${escapeHtml(p.stock)} uds`;
  const initialQty = qtyMap[p.id] || 0;
  const cardClasses = 'card' + (initialQty > 0 ? ' has-qty' : '') + (agotado ? ' agotado' : '');
  const qtyControls = agotado
    ? `<span class="lbl">Sin stock disponible</span>`
    : `<span class="lbl">Pedir:</span>
          <button type="button" onclick="changeQty(${p.id},-1)">−</button>
          <input type="number" min="0" inputmode="numeric" pattern="[0-9]*" value="${initialQty}" id="qty-${p.id}" onchange="setQty(${p.id}, this.value)" onfocus="this.select()" title="Escribe la cantidad que necesitas">
          <button type="button" onclick="changeQty(${p.id},1)">+</button>`;
  return `
    <div class="${cardClasses}" id="card-${p.id}" data-name="${safeName.toLowerCase()}" data-code="${safeCode}" data-brand="${safeBrand}">
      <div class="photo-wrap" onclick="openLightbox(${p.id}, 0)">
        ${newBadge}
        ${agotadoBadge}
        <img src="${imgSrc}" alt="${safeName}" loading="lazy">
        <div class="zoom-hint">🔍</div>
      </div>
      <div class="barcode-strip" onclick="openLightbox(${p.id}, 1)"><svg class="bc-svg" id="bc-${p.id}" data-code="${safeCode}"></svg></div>
      <div class="info">
        <div class="brand-tag">${safeBrand}</div>
        <div class="name">${safeName}</div>
        ${p.notes ? `<div class="notes-line">🌸 ${escapeHtml(p.notes.join(', '))}</div>` : ''}
        ${dupePanelHTML(p.id)}
        <div class="meta"><span class="code">${safeCode}</span><span class="stock">${stockLabel}</span></div>
        <div class="qty-row">
          ${qtyControls}
        </div>
      </div>
    </div>`;
}

function renderBarcodes(ids) {
  ids.forEach(id => {
    const el = document.getElementById('bc-' + id);
    if (!el) return;
    const p = PRODUCTS_BY_ID[id];
    try {
      JsBarcode(el, p.code, { format: 'CODE128', displayValue: true, fontSize: 13, textMargin: 3, width: 1.6, height: 46, margin: 6 });
    } catch (e) {
      const fallback = document.createElement('div');
      fallback.className = 'barcode-fallback';
      fallback.textContent = p.code;
      if (el.parentNode) el.parentNode.replaceChild(fallback, el);
    }
  });
}

function computeFiltered() {
  const q = document.getElementById('search').value.toLowerCase().trim();
  const brand = document.getElementById('brandFilter').value;
  return VISIBLE_PRODUCTS.filter(p => {
    const matchText = !q || p.name.toLowerCase().includes(q) || p.code.includes(q);
    if (diaNinoMode) {
      return matchText && DIA_DEL_NINO_CATEGORIES.includes(p.brand);
    }
    if (nuevosIngresosMode) {
      return matchText && isProductNew(p);
    }
    const matchBrand = !brand || p.brand === brand;
    const matchTipoGenero = selectedTipoGenero.size === 0 || selectedTipoGenero.has(getTipoGeneroBucket(p));
    return matchText && matchBrand && matchTipoGenero;
  });
}

function renderPage(reset) {
  const grid = document.getElementById('grid');
  if (reset) {
    grid.innerHTML = '';
    renderedCount = 0;
    window.scrollTo({ top: grid.offsetTop - 140, behavior: 'auto' });
  }
  const nextBatch = filteredProducts.slice(renderedCount, renderedCount + PAGE_SIZE);
  grid.insertAdjacentHTML('beforeend', nextBatch.map(cardHTML).join(''));
  renderBarcodes(nextBatch.map(p => p.id));
  renderedCount += nextBatch.length;
  document.getElementById('count').textContent = filteredProducts.length + ' productos';
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if (loadMoreBtn) {
    loadMoreBtn.style.display = renderedCount < filteredProducts.length ? '' : 'none';
    loadMoreBtn.textContent = `Cargar más (${filteredProducts.length - renderedCount} restantes)`;
  }
}

function showDiaDelNino() {
  document.getElementById('search').value = '';
  document.getElementById('brandFilter').value = '';
  clearTipoGenero();
  nuevosIngresosMode = false;
  document.getElementById('nuevosIngresosBanner').style.display = 'none';
  diaNinoMode = true;
  applyFilters();
  document.getElementById('diaNinoBanner').style.display = 'block';
  document.getElementById('grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function exitDiaDelNino() {
  diaNinoMode = false;
  applyFilters();
  document.getElementById('diaNinoBanner').style.display = 'none';
}

function showNuevosIngresos() {
  document.getElementById('search').value = '';
  document.getElementById('brandFilter').value = '';
  clearTipoGenero();
  diaNinoMode = false;
  document.getElementById('diaNinoBanner').style.display = 'none';
  nuevosIngresosMode = true;
  applyFilters();
  document.getElementById('nuevosIngresosBanner').style.display = 'block';
  document.getElementById('grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function exitNuevosIngresos() {
  nuevosIngresosMode = false;
  applyFilters();
  document.getElementById('nuevosIngresosBanner').style.display = 'none';
}

function applyFilters() {
  filteredProducts = computeFiltered();
  renderPage(true);
}