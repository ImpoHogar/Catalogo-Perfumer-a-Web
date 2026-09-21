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

// Un producto entra en la vista/banner de "Nuevos Ingresos" si es un
// Nuevo Ingreso normal (dateAdded) O si esta en el lote de baja
// rotacion activo esta semana (ver LOW_ROTATION_BATCHES en config.js).
// Son dos listas independientes: se combinan solo para decidir que se
// muestra en esta seccion, sin mezclar los datos de cada una.
function isInNuevosIngresosView(p) {
  return isProductNew(p) || (typeof isLowRotationActive === 'function' && isLowRotationActive(p));
}

// Foto del producto (misma regla que antes: webp versionado o marcador)
function productImgSrc(p) {
  return p.img ? `img/p${p.id}.webp?v=${IMG_VERSION}` : placeholderImg(p.brand);
}

// ============================================================
//  BANNER PRINCIPAL DE NUEVOS INGRESOS
// ============================================================
//  Muestra hasta 10 productos (Nuevos Ingresos + lote de baja
//  rotacion activo), rotando cada pocos segundos. A la izquierda
//  va el texto, a la derecha la foto. El boton activa el mismo modo
//  "Nuevos Ingresos" que ya existia (nuevosIngresosMode).
//  La barra de progreso se puede tocar para saltar a un producto
//  y la rotacion se pausa mientras el mouse esta encima.
// ============================================================
const HERO_INTERVAL_MS = 5000;
let heroNuevosIndex = 0;
let heroNuevosTimer = null;
let heroNuevosTotal = 0;

function pad2(n) { return String(n).padStart(2, '0'); }

function renderHeroNuevos() {
  const hero = document.getElementById('heroNuevos');
  if (!hero) return;

  const nuevos = VISIBLE_PRODUCTS.filter(isInNuevosIngresosView).slice(0, 10);

  stopHeroNuevosTimer();

  if (!nuevos.length) {
    hero.style.display = 'none';
    return;
  }

  hero.style.display = 'grid';
  hero.style.setProperty('--hero-interval', HERO_INTERVAL_MS + 'ms');
  heroNuevosTotal = nuevos.length;

  const track = document.getElementById('heroNuevosTrack');
  const media = document.getElementById('heroNuevosMedia');
  const dots = document.getElementById('heroNuevosDots');

  track.innerHTML = nuevos.map((p, i) => `
    <div class="hero-nuevos-slide${i === 0 ? ' active' : ''}" data-i="${i}" aria-hidden="${i !== 0}">
      <div class="hero-nuevos-brand">${escapeHtml(p.brand)}</div>
      <div class="hero-nuevos-name">${escapeHtml(p.name)}</div>
      ${p.notes && p.notes.length ? `<div class="hero-nuevos-notes">${escapeHtml(p.notes.slice(0, 5).join(' · '))}</div>` : ''}
    </div>`).join('');

  if (media) {
    media.innerHTML = nuevos.map((p, i) => `
      <button type="button" class="hero-media-slide${i === 0 ? ' active' : ''}" data-i="${i}" tabindex="${i === 0 ? 0 : -1}"
              onclick="openLightbox(${p.id}, 0)" aria-label="Ver ficha de ${escapeHtml(p.name)}">
        <img src="${productImgSrc(p)}" alt="${escapeHtml(p.name)}" ${i < 2 ? '' : 'loading="lazy"'}>
      </button>`).join('') + `<span class="hero-media-caption">Clic para ver la ficha</span>`;
  }

  dots.innerHTML = nuevos.length > 1 ? nuevos.map((p, i) =>
    `<button type="button" class="hero-nuevos-dot" data-i="${i}" onclick="goToHeroNuevos(${i})" aria-label="Ver producto ${i + 1} de ${nuevos.length}"></button>`
  ).join('') : '';

  const progress = hero.querySelector('.hero-progress');
  if (progress) progress.style.display = nuevos.length > 1 ? '' : 'none';

  if (!hero.dataset.bound) {
    hero.addEventListener('mouseenter', pauseHeroNuevos);
    hero.addEventListener('mouseleave', resumeHeroNuevos);
    hero.dataset.bound = '1';
  }

  setHeroNuevosSlide(0);
  startHeroNuevosTimer();
}

function setHeroNuevosSlide(i) {
  heroNuevosIndex = i;
  document.querySelectorAll('#heroNuevosTrack .hero-nuevos-slide').forEach((s, k) => {
    s.classList.toggle('active', k === i);
    s.setAttribute('aria-hidden', k !== i);
  });
  document.querySelectorAll('#heroNuevosMedia .hero-media-slide').forEach((s, k) => {
    s.classList.toggle('active', k === i);
    s.tabIndex = k === i ? 0 : -1;
  });
  const dots = document.querySelectorAll('#heroNuevosDots .hero-nuevos-dot');
  dots.forEach((d, k) => {
    d.classList.remove('active');
    d.classList.toggle('done', k < i);
  });
  if (dots[i]) {
    void dots[i].offsetWidth; // reinicia la animacion de la barra
    dots[i].classList.add('active');
  }
  const counter = document.getElementById('heroNuevosCounter');
  if (counter) counter.innerHTML = `<b>${pad2(i + 1)}</b> / ${pad2(heroNuevosTotal)}`;
}

function advanceHeroNuevos(total) {
  if (!total) return;
  setHeroNuevosSlide((heroNuevosIndex + 1) % total);
}

function goToHeroNuevos(i) {
  setHeroNuevosSlide(i);
  startHeroNuevosTimer();
}

function startHeroNuevosTimer() {
  stopHeroNuevosTimer();
  if (heroNuevosTotal > 1) {
    heroNuevosTimer = setInterval(() => advanceHeroNuevos(heroNuevosTotal), HERO_INTERVAL_MS);
  }
}

function stopHeroNuevosTimer() {
  if (heroNuevosTimer) { clearInterval(heroNuevosTimer); heroNuevosTimer = null; }
}

function pauseHeroNuevos() {
  stopHeroNuevosTimer();
  const hero = document.getElementById('heroNuevos');
  if (hero) hero.classList.add('is-paused');
}

function resumeHeroNuevos() {
  const hero = document.getElementById('heroNuevos');
  if (hero) hero.classList.remove('is-paused');
  goToHeroNuevos(heroNuevosIndex);
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
      ? `<span class="category-tile-media"><img src="img/categorias/${archivoIcono}?v=${IMG_VERSION}" alt="" class="category-tile-icon"></span>`
      : '';
    return `
    <button type="button" class="category-tile${activa ? ' active' : ''}" onclick="toggleTipoGenero('${opt}')" aria-pressed="${activa}"${activa ? ' title="Tocar de nuevo para quitar el filtro"' : ''}>
      ${iconoHTML}
      <span class="category-tile-label">${opt}</span>
      <span class="category-tile-count">${activa ? '✕' : counts[opt]}</span>
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

// ============================================================
//  TARJETA DE PRODUCTO
// ============================================================
//  Orden visual: foto -> marca + stock -> nombre -> notas ->
//  dupe/inspiracion -> codigo de barras -> cantidad a pedir.
// ============================================================
function cardHTML(p) {
  const safeName = escapeHtml(p.name);
  const safeCode = escapeHtml(p.code);
  const safeBrand = escapeHtml(p.brand);
  const imgSrc = productImgSrc(p);
  const esNuevo = isProductNew(p);
  const newBadge = esNuevo ? '<span class="new-badge">NUEVO</span>' : '';
  const stockNum = parseInt(p.stock) || 0;
  const agotado = stockNum <= 0;
  const agotadoBadge = agotado ? '<span class="agotado-badge">AGOTADO</span>' : '';
  const stockLabel = agotado ? 'Agotado' : `${escapeHtml(p.stock)} uds`;
  const initialQty = qtyMap[p.id] || 0;
  const cardClasses = 'card' + (initialQty > 0 ? ' has-qty' : '') + (agotado ? ' agotado' : '') + (esNuevo ? ' new-arrival' : '');
  const qtyControls = agotado
    ? `<span class="lbl">Sin stock disponible</span>`
    : `<span class="lbl">Pedir</span>
          <div class="stepper">
            <button type="button" onclick="changeQty(${p.id},-1)" aria-label="Quitar una unidad">−</button>
            <input type="number" min="0" inputmode="numeric" pattern="[0-9]*" value="${initialQty}" id="qty-${p.id}" onchange="setQty(${p.id}, this.value)" onfocus="this.select()" title="Escribe la cantidad que necesitas" aria-label="Cantidad a pedir de ${safeName}">
            <button type="button" onclick="changeQty(${p.id},1)" aria-label="Agregar una unidad">+</button>
          </div>`;
  const notas = p.notes && p.notes.length
    ? `<p class="notes-line" title="${escapeHtml(p.notes.join(', '))}">${escapeHtml(p.notes.join(' · '))}</p>`
    : '';
  return `
    <article class="${cardClasses}" id="card-${p.id}" data-name="${safeName.toLowerCase()}" data-code="${safeCode}" data-brand="${safeBrand}">
      <div class="photo-wrap" onclick="openLightbox(${p.id}, 0)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openLightbox(${p.id}, 0);}" role="button" tabindex="0" aria-label="Ver ficha de ${safeName}">
        ${newBadge}
        ${agotadoBadge}
        <img src="${imgSrc}" alt="${safeName}" loading="lazy" decoding="async">
        <span class="zoom-hint" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M14 4h6v6M10 20H4v-6M20 4l-6.5 6.5M4 20l6.5-6.5"/></svg></span>
      </div>
      <div class="info">
        <div class="meta"><span class="brand-tag">${safeBrand}</span><span class="stock${agotado ? ' is-out' : ''}">${stockLabel}</span></div>
        <h3 class="name">${safeName}</h3>
        ${notas}
        ${dupePanelHTML(p.id)}
        <div class="barcode-strip" onclick="openLightbox(${p.id}, 1)" title="Ver código de barras en grande"><svg class="bc-svg" id="bc-${p.id}" data-code="${safeCode}" role="img" aria-label="Código de barras ${safeCode}"></svg></div>
        <div class="qty-row">
          ${qtyControls}
        </div>
      </div>
    </article>`;
}

function renderBarcodes(ids) {
  ids.forEach(id => {
    const el = document.getElementById('bc-' + id);
    if (!el) return;
    const p = PRODUCTS_BY_ID[id];
    try {
      JsBarcode(el, p.code, { format: 'CODE128', displayValue: true, fontSize: 15, textMargin: 2, width: 1.6, height: 44, margin: 4, font: 'monospace' });
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
      return matchText && isInNuevosIngresosView(p);
    }
    const matchBrand = !brand || p.brand === brand;
    const matchTipoGenero = selectedTipoGenero.size === 0 || selectedTipoGenero.has(getTipoGeneroBucket(p));
    return matchText && matchBrand && matchTipoGenero;
  });
}


// ============================================================
//  ANIMACION DE ENTRADA AL SCROLLEAR (scroll reveal)
// ============================================================
//  Cada tarjeta nueva empieza invisible y se desliza suavemente
//  hacia arriba la primera vez que entra en pantalla al scrollear.
//  Respeta la preferencia de "reducir movimiento" del sistema.
// ============================================================
let revealObserver = null;
function observeRevealCards(elementos) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!revealObserver) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-in');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
  }
  elementos.forEach(el => {
    if (!el.classList.contains('card')) return;
    el.classList.add('reveal');
    revealObserver.observe(el);
  });
}

function renderPage(reset) {
  const grid = document.getElementById('grid');
  if (reset) {
    grid.innerHTML = '';
    renderedCount = 0;
    // Sube hasta el inicio del catalogo, dejando espacio para el encabezado fijo
    const ancla = document.querySelector('.catalog-head') || grid;
    const header = document.getElementById('siteHeader');
    const offset = (header ? header.offsetHeight : 0) + 12;
    window.scrollTo({ top: ancla.getBoundingClientRect().top + window.scrollY - offset, behavior: 'auto' });

    if (filteredProducts.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">Sin resultados</div>
          <div class="empty-state-text">No encontramos productos con esa búsqueda o filtro. Prueba con otro nombre, código o marca.</div>
        </div>`;
    }
  }
  const nextBatch = filteredProducts.slice(renderedCount, renderedCount + PAGE_SIZE);
  const antesDeInsertar = grid.children.length;
  grid.insertAdjacentHTML('beforeend', nextBatch.map(cardHTML).join(''));
  renderBarcodes(nextBatch.map(p => p.id));
  observeRevealCards(Array.from(grid.children).slice(antesDeInsertar));
  renderedCount += nextBatch.length;

  const total = filteredProducts.length;
  document.getElementById('count').textContent = total + (total === 1 ? ' producto' : ' productos');

  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if (loadMoreBtn) {
    loadMoreBtn.style.display = renderedCount < total ? '' : 'none';
    loadMoreBtn.textContent = `Cargar más (${total - renderedCount} restantes)`;
  }
  const meta = document.getElementById('loadMoreMeta');
  if (meta) {
    meta.innerHTML = total > PAGE_SIZE
      ? `Mostrando ${renderedCount} de ${total}<span class="lm-bar"><i style="width:${Math.round(renderedCount / total * 100)}%"></i></span>`
      : '';
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
  document.getElementById('diaNinoBanner').style.display = 'flex';
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
  document.getElementById('nuevosIngresosBanner').style.display = 'flex';
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