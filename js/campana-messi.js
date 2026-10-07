// ============================================================
//  CAMPAÑA ESPECIAL — EL MOMENTO MESSI
// ============================================================
//  Campaña editorial TEMPORAL que se dibuja arriba de "Nuevos
//  ingresos". No crea productos nuevos, no duplica el perfume Messi
//  y no toca el inventario: lee el producto que YA existe en el
//  catalogo (por su codigo de barras) y lo presenta en grande.
//
//  Si la campaña no corresponde (apagada o fuera de fecha), este
//  archivo NO dibuja nada: borra la seccion del HTML. No queda
//  "escondida con CSS".
//
//  ----------------------------------------------------------
//   COMO SE MANEJA (todo se cambia en el bloque de abajo)
//  ----------------------------------------------------------
//   APAGAR la campaña ahora mismo .... active: false
//   PRENDERLA de nuevo ............... active: true
//   CAMBIAR el dia que empieza ....... start: "AAAA-MM-DD"
//   CAMBIAR el ultimo dia que se ve .. end:   "AAAA-MM-DD"
//   VERLA PARA PROBAR fuera de fecha . preview: true
//   (en produccion preview debe quedar en false)
//
//   OJO con "end": es el ULTIMO DIA EN QUE SE VE. Con
//   end: "2026-10-14" la campaña se ve hasta el 14 de octubre
//   completo y el 15 de octubre ya no aparece sola.
//  ----------------------------------------------------------
// ============================================================

const MESSI_CAMPAIGN = {
  // ---- Interruptores ----
  active: true,            // true = campaña encendida · false = apagada siempre
  preview: false,          // true = se ve aunque la fecha este fuera de rango (SOLO pruebas)

  // ---- Fechas (formato AAAA-MM-DD) ----
  start: "2026-10-07",     // primer dia en que se ve
  end: "2026-10-14",       // ULTIMO dia en que se ve (el 15 ya no aparece)

  // ---- Producto protagonista (ya existe en el catalogo) ----
  // Codigo de barras del perfume Messi. Si algun dia cambia el
  // codigo, se cambia aca y la campaña sigue funcionando.
  code: "9349830100957",

  // ---- Imagen grande de la campaña ----
  // Es la foto SOLO de la campaña y vive en la carpeta img/.
  // La foto del producto NO se toca: el perfume sigue mostrando
  // siempre la suya (img/p3297.webp) en el catalogo y en su ficha.
  // Para cambiar la foto de la campaña: guarda la nueva en img/ y
  // escribe aca su nombre.
  imagen: "campana-messi.webp",

  // ---- Textos de la campaña ----
  etiqueta:  "CAMPAÑA ESPECIAL · OCTUBRE 2026",
  titulo:    "UN NOMBRE QUE VENDE, UN AROMA QUE CONQUISTA.",
  subtitulo: "Una leyenda. Una historia. Un aroma.",
  bajada:    "El momento de una leyenda también puede convertirse en una oportunidad para tu negocio.",
  cta:       "DESCUBRIR PERFUME MESSI"
};

// ============================================================
//  1. ¿SE TIENE QUE VER LA CAMPAÑA?
// ============================================================
//  Regla real (no es CSS): encendida Y dentro del rango de fechas.
//  La fecha se compara como texto "AAAA-MM-DD", que para ese formato
//  ordena igual que una fecha y no se corre por zona horaria.

function messiHoyISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function messiCampaignVisible() {
  if (!MESSI_CAMPAIGN.active) return false;   // apagada: no se ve nunca
  if (MESSI_CAMPAIGN.preview) return true;    // modo prueba: se ve siempre
  const hoy = messiHoyISO();
  return hoy >= MESSI_CAMPAIGN.start && hoy <= MESSI_CAMPAIGN.end;
}

// ============================================================
//  2. EL PRODUCTO (el que ya existe en el catalogo)
// ============================================================
//  Se busca por codigo de barras entre los productos visibles. Si no
//  aparece (porque se oculto, se elimino o se quedo sin foto), la
//  campaña no se dibuja: nunca inventa un producto.

function messiBuscarProducto() {
  if (typeof VISIBLE_PRODUCTS === 'undefined' || !Array.isArray(VISIBLE_PRODUCTS)) return null;
  let p = VISIBLE_PRODUCTS.find(x => String(x.code) === String(MESSI_CAMPAIGN.code));
  if (!p) p = VISIBLE_PRODUCTS.find(x => /messi/i.test(x.brand) || /messi/i.test(x.name));
  return p || null;
}

// ============================================================
//  3. ACCIONES DE LOS BOTONES
// ============================================================

// "DESCUBRIR PERFUME MESSI": usa la busqueda normal del catalogo
// para dejar el producto en pantalla, y lo resalta un momento.
function messiVerEnCatalogo() {
  const p = messiBuscarProducto();
  if (!p) return;
  try {
    const search = document.getElementById('search');
    const brandSel = document.getElementById('brandFilter');
    if (typeof diaNinoMode !== 'undefined') diaNinoMode = false;
    if (typeof nuevosIngresosMode !== 'undefined') nuevosIngresosMode = false;
    const bDia = document.getElementById('diaNinoBanner');
    const bNue = document.getElementById('nuevosIngresosBanner');
    if (bDia) bDia.style.display = 'none';
    if (bNue) bNue.style.display = 'none';
    if (typeof clearTipoGenero === 'function') clearTipoGenero();
    if (brandSel) brandSel.value = '';
    if (search) search.value = p.code;
    if (typeof applyFilters === 'function') applyFilters();
  } catch (err) {
    console.error('Campaña Messi:', err);
    return;
  }
  // Resaltado suave de la tarjeta, una vez dibujada.
  setTimeout(() => {
    const card = document.getElementById('card-' + p.id);
    if (!card) return;
    card.classList.add('messi-destacada');
    setTimeout(() => card.classList.remove('messi-destacada'), 2600);
  }, 320);
}

// "Ver ficha completa": abre la ficha de siempre del catalogo.
function messiAbrirFicha() {
  const p = messiBuscarProducto();
  if (p && typeof openLightbox === 'function') openLightbox(p.id, 0);
}

// Agregar al pedido usando el carrito de siempre.
function messiAgregarAlPedido() {
  const p = messiBuscarProducto();
  if (!p || typeof setQty !== 'function') return;
  const stock = parseInt(p.stock) || 0;
  if (stock <= 0) return;
  const actual = (typeof qtyMap !== 'undefined' && qtyMap[p.id]) ? qtyMap[p.id] : 0;
  setQty(p.id, actual + 1);
  const btn = document.getElementById('mzAddBtn');
  if (btn) {
    btn.classList.add('is-ok');
    btn.querySelector('span').textContent = `En tu pedido: ${(typeof qtyMap !== 'undefined' && qtyMap[p.id]) || 1}`;
    clearTimeout(btn._t);
    btn._t = setTimeout(() => {
      btn.classList.remove('is-ok');
      btn.querySelector('span').textContent = 'Agregar al pedido';
    }, 2200);
  }
}

// "CONSULTAR DISPONIBILIDAD": usa los MISMOS vendedores y el mismo
// WhatsApp que ya usa el catalogo (SELLERS de js/config.js, que el
// panel administrativo mantiene al dia). No crea otro sistema de
// contacto: solo arma el mensaje con el producto.
function messiMensajeWhatsApp(p) {
  return `Buenas, me interesa el ${p.name} (${p.brand}) · Código ${p.code}. ¿Me confirma disponibilidad?`;
}

function messiConsultar() {
  const p = messiBuscarProducto();
  if (!p || typeof SELLERS === 'undefined') return;
  const keys = Object.keys(SELLERS);
  if (!keys.length) return;
  // Un solo vendedor: se abre su WhatsApp directo.
  if (keys.length === 1) { messiEscribirA(keys[0]); return; }
  // Varios: se muestran para elegir, igual que en el pedido.
  const box = document.getElementById('mzSellers');
  if (box) {
    box.hidden = !box.hidden;
    if (!box.hidden) box.querySelector('button').focus();
  }
}

function messiEscribirA(key) {
  const p = messiBuscarProducto();
  const seller = (typeof SELLERS !== 'undefined') ? SELLERS[key] : null;
  if (!p || !seller) return;
  window.open(`https://wa.me/${seller.phone}?text=${encodeURIComponent(messiMensajeWhatsApp(p))}`, '_blank');
  const box = document.getElementById('mzSellers');
  if (box) box.hidden = true;
}

// ============================================================
//  4. DIBUJO DE LA CAMPAÑA
// ============================================================

function messiFotoSrc(p) {
  if (typeof productImgSrc === 'function') return productImgSrc(p);
  const v = (typeof IMG_VERSION !== 'undefined') ? IMG_VERSION : '';
  return `img/p${p.id}.webp?v=${v}`;
}

function messiEsc(s) {
  return (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s);
}

// Imagen grande de la campaña (carpeta img/). No tiene nada que ver
// con la foto del producto.
function messiImagenCampana() {
  const v = (typeof IMG_VERSION !== 'undefined') ? IMG_VERSION : '';
  return `img/${MESSI_CAMPAIGN.imagen}?v=${v}`;
}

// Presentacion (ej. "100 ML") sacada del nombre real, sin inventar.
function messiPresentacion(p) {
  const m = String(p.name).toUpperCase().match(/(\d+(?:[.,]\d+)?)\s?ML\b/);
  return m ? `${m[1]} ml` : '';
}

function renderMessiCampaign() {
  const host = document.getElementById('campanaMessi');
  if (!host) return;

  // Condicion real: si no toca, la seccion se saca del HTML.
  if (!messiCampaignVisible()) { host.remove(); return; }

  const p = messiBuscarProducto();
  if (!p) { host.remove(); return; }   // sin producto no hay campaña

  const stock = parseInt(p.stock) || 0;
  const agotado = stock <= 0;
  const foto = messiFotoSrc(p);
  const presentacion = messiPresentacion(p);
  const categoria = (typeof getTipoGeneroBucket === 'function') ? (getTipoGeneroBucket(p) || '') : '';
  const notas = Array.isArray(p.notes) ? p.notes : [];

  // Datos: SOLO lo que ya existe en el catalogo. Sin precios.
  const datos = [
    ['Marca', p.brand],
    presentacion ? ['Presentación', presentacion] : null,
    categoria ? ['Categoría', categoria] : null,
    ['Código', p.code]
  ].filter(Boolean);

  const sellersHTML = (typeof SELLERS !== 'undefined' && Object.keys(SELLERS).length > 1)
    ? `<div class="mz-sellers" id="mzSellers" hidden>
         <span class="mz-sellers-lbl">Escríbele a tu vendedor</span>
         ${Object.keys(SELLERS).map(k => `<button type="button" onclick="messiEscribirA('${messiEsc(k)}')">${messiEsc(SELLERS[k].name)}</button>`).join('')}
       </div>`
    : '';

  host.innerHTML = `
  <div class="mz-wrap">

    <!-- ---------- HERO ---------- -->
    <div class="mz-hero">
      <div class="mz-copy">
        <span class="mz-flag" aria-hidden="true"></span>
        <span class="mz-tag">${messiEsc(MESSI_CAMPAIGN.etiqueta)}</span>
        <h2 class="mz-title">${messiEsc(MESSI_CAMPAIGN.titulo)}</h2>
        <p class="mz-sub">${messiEsc(MESSI_CAMPAIGN.subtitulo)}</p>
        <p class="mz-lead">${messiEsc(MESSI_CAMPAIGN.bajada)}</p>
        <div class="mz-actions">
          <button type="button" class="mz-btn mz-btn-main" onclick="messiVerEnCatalogo()">
            ${messiEsc(MESSI_CAMPAIGN.cta)}
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
          <button type="button" class="mz-btn mz-btn-ghost" onclick="messiConsultar()">CONSULTAR DISPONIBILIDAD</button>
        </div>
        ${sellersHTML}
      </div>

      <figure class="mz-shot">
        <img src="${messiImagenCampana()}" alt="Campaña El Momento Messi" loading="lazy" decoding="async">
      </figure>
    </div>

    <!-- ---------- PRODUCTO DEL MOMENTO ---------- -->
    <div class="mz-product">
      <div class="mz-product-head">
        <span class="mz-kicker">El producto del momento</span>
        <h3 class="mz-pname">${messiEsc(p.name)}</h3>
      </div>

      <div class="mz-product-body">
        <div class="mz-plate" onclick="messiAbrirFicha()" title="Ver ficha del producto">
          <img src="${foto}" alt="${messiEsc(p.name)}" loading="lazy" decoding="async">
        </div>

        <div class="mz-product-data">
        <dl class="mz-specs">
          ${datos.map(([k, v]) => `<div><dt>${messiEsc(k)}</dt><dd>${messiEsc(v)}</dd></div>`).join('')}
          <div><dt>Disponibilidad</dt><dd class="${agotado ? 'is-out' : 'is-ok'}">${agotado ? 'Consultar entrada' : stock + ' unidades en bodega'}</dd></div>
        </dl>

        ${notas.length ? `
        <div class="mz-notes">
          <span class="mz-notes-lbl">Notas olfativas</span>
          <div class="mz-notes-list">${notas.map(n => `<span>${messiEsc(n)}</span>`).join('')}</div>
        </div>` : ''}

        <div class="mz-product-actions">
          <button type="button" class="mz-btn mz-btn-main" onclick="messiVerEnCatalogo()">
            ${messiEsc(MESSI_CAMPAIGN.cta)}
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
          <button type="button" class="mz-btn mz-btn-line" onclick="messiAbrirFicha()">Ver ficha completa</button>
          ${agotado ? '' : `<button type="button" class="mz-btn mz-btn-line" id="mzAddBtn" onclick="messiAgregarAlPedido()"><span>Agregar al pedido</span></button>`}
        </div>
        </div>
      </div>
    </div>

    <p class="mz-foot">Campaña temporal de ImpoHogar sobre un producto disponible en nuestro catálogo mayorista. Consulta precios con tu vendedor.</p>
  </div>`;

  host.hidden = false;
  host.classList.add('is-on');

  // Entrada suave (respeta "reducir movimiento" del sistema).
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const partes = host.querySelectorAll('.mz-copy, .mz-shot, .mz-product');
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('mz-in'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    partes.forEach(el => { el.classList.add('mz-anim'); obs.observe(el); });
  }
}

// ============================================================
//  5. ARRANQUE
// ============================================================
//  Espera a que los productos esten cargados (vienen de Supabase).
//  Si ya estaban listos cuando se carga este archivo, dibuja de una.

(function initMessiCampaign() {
  let hecho = false;
  const intentar = () => {
    if (hecho) return;
    if (!document.getElementById('campanaMessi')) return;
    if (typeof VISIBLE_PRODUCTS === 'undefined') return;
    hecho = true;
    try { renderMessiCampaign(); } catch (err) { console.error('Campaña Messi:', err); }
  };
  window.addEventListener('productos:listos', () => setTimeout(intentar, 0));
  document.addEventListener('DOMContentLoaded', intentar);
  // Red de seguridad por si el evento ya habia pasado.
  setTimeout(intentar, 1500);
  setTimeout(intentar, 4000);
})();