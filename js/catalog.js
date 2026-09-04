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
const TIPO_GENERO_OPTIONS = ['Estuches', 'Splash/Bodymist', 'Hombre', 'Mujer', 'Niños', 'Unisex', 'Mascota'];

let selectedTipoGenero = new Set();

function getTipoGeneroBucket(p) {
  if (p.tipo === 'Estuche') return 'Estuches';
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
  // Seleccion UNICA: elegir una categoria nueva reemplaza a la anterior.
  // Click de nuevo sobre la misma categoria activa la deselecciona.
  if (selectedTipoGenero.has(opt)) {
    selectedTipoGenero.delete(opt);
  } else {
    selectedTipoGenero.clear();
    selectedTipoGenero.add(opt);
  }
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

  // Si el cliente esta buscando algo puntual y ese producto tiene un
  // dupe/inspiracion cargado, se lo mostramos ya abierto, sin que tenga
  // que tocar el boton (tenga o no tenga stock). Fuera de una busqueda
  // (navegando el catalogo normal) el panel se queda como siempre:
  // cerrado hasta que el cliente lo abre.
  const searchQuery = document.getElementById('search').value.trim();
  if (searchQuery && typeof getRelatedProducts === 'function') {
    nextBatch.forEach(p => {
      if (!getRelatedProducts(p.id).length) return;
      const panel = document.getElementById('dupe-panel-' + p.id);
      if (panel) panel.classList.add('open');
    });
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