// ============================================================
//  VITRINA DE ENTRADA
// ============================================================
//  Pantalla de escaparate que se ve ANTES de la pantalla de clave.
//
//  Orden real de la experiencia:
//    bienvenida (logo) -> VITRINA -> clave -> catalogo
//
//  Este archivo NO toca la logica de la clave (js/gate.js) ni los
//  datos del catalogo. Solo LEE las mismas listas y funciones que ya
//  usa el catalogo para armar cuatro filas de productos reales:
//
//    Nuevos ingresos -> isInNuevosIngresosView(p)   (catalog.js)
//    Hombre          -> getTipoGeneroBucket(p) === 'Hombre'
//    Mujer           -> getTipoGeneroBucket(p) === 'Mujer'
//    Estucheria      -> getTipoGeneroBucket(p) === 'Estuches'
//
//  Si manana cambian los productos, las categorias o los nuevos
//  ingresos en products.js, esta pantalla se actualiza sola: no hay
//  ninguna lista de productos escrita a mano aca.
//
//  Cargar DESPUES de config.js, products.js, stock.js, data.js,
//  utils.js y catalog.js.
// ============================================================

// ---------- Definicion de las cuatro filas ----------
// dir: -1 la fila viaja hacia la izquierda, +1 hacia la derecha.
// vel: pixeles por segundo (cada fila va un poco distinto, sin exagerar).
// limite: cuantos productos se muestran. 0 = todos los que haya.
const VITRINA_FILAS = [
  {
    id: 'nuevos',
    titulo: 'Nuevos ingresos',
    dir: -1,
    vel: 26,
    limite: 0,
    filtro: p => (typeof isInNuevosIngresosView === 'function') && isInNuevosIngresosView(p)
  },
  {
    id: 'hombre',
    titulo: 'Hombre',
    dir: 1,
    vel: 20,
    limite: (typeof VITRINA_MAX_POR_FILA !== 'undefined') ? VITRINA_MAX_POR_FILA : 40,
    filtro: p => getTipoGeneroBucket(p) === 'Hombre'
  },
  {
    id: 'mujer',
    titulo: 'Mujer',
    dir: -1,
    vel: 23,
    limite: (typeof VITRINA_MAX_POR_FILA !== 'undefined') ? VITRINA_MAX_POR_FILA : 40,
    filtro: p => getTipoGeneroBucket(p) === 'Mujer'
  },
  {
    id: 'estuches',
    titulo: 'Estuchería',
    dir: 1,
    vel: 18,
    limite: (typeof VITRINA_MAX_POR_FILA !== 'undefined') ? VITRINA_MAX_POR_FILA : 40,
    filtro: p => getTipoGeneroBucket(p) === 'Estuches'
  }
];

const vitrinaFilas = [];
let vitrinaRAF = null;
let vitrinaUltimoFrame = 0;
let vitrinaAndando = false;
const vitrinaReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ============================================================
//  SELECCION DE PRODUCTOS
// ============================================================
//  No hay lista manual: cada fila sale de VISIBLE_PRODUCTS usando la
//  misma clasificacion del catalogo. Se prefieren los que tienen
//  stock (en una vitrina no tiene sentido lucir lo agotado); si una
//  categoria quedara sin nada con stock, se usa la categoria completa
//  para no dejar la fila vacia.
// ============================================================

// Semilla que cambia una vez por dia: la vitrina se ve distinta cada
// dia pero estable durante el mismo dia (no baila en cada recarga).
function vitrinaSemillaDelDia() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function vitrinaMezcla(lista, semilla) {
  const arr = lista.slice();
  let s = semilla >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

function vitrinaProductosDe(fila, indice) {
  const todos = VISIBLE_PRODUCTS.filter(fila.filtro);
  const conStock = todos.filter(p => (parseInt(p.stock) || 0) > 0);
  let base = conStock.length ? conStock : todos;

  if (fila.id === 'nuevos') {
    // Los nuevos ingresos van del mas reciente al mas antiguo. Los del
    // lote de baja rotacion (que no tienen dateAdded) cierran la fila.
    base = base.slice().sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || ''));
  } else {
    base = vitrinaMezcla(base, vitrinaSemillaDelDia() + indice * 7919);
  }

  if (fila.limite && base.length > fila.limite) base = base.slice(0, fila.limite);
  return base;
}

// ============================================================
//  ARMADO DEL HTML
// ============================================================

function vitrinaCardHTML(p, eager) {
  const nombre = escapeHtml(p.name);
  const marca = escapeHtml(p.brand);
  const notas = (p.notes && p.notes.length) ? escapeHtml(p.notes.slice(0, 4).join(' · ')) : '';
  return `
    <article class="vt-card">
      <div class="vt-plate">
        <img src="${productImgSrc(p)}" alt="${nombre}"${eager ? '' : ' loading="lazy"'} decoding="async" draggable="false">
      </div>
      <div class="vt-text">
        <span class="vt-brand">${marca}</span>
        <h3 class="vt-name">${nombre}</h3>
        ${notas ? `<p class="vt-notes"><span>${notas}</span></p>` : ''}
      </div>
    </article>`;
}

function vitrinaFilaHTML(fila, productos, total) {
  const cards = productos.map((p, i) => vitrinaCardHTML(p, i < 4)).join('');
  // Con movimiento se duplica la tira para que el loop no tenga corte.
  // La copia va como hermanas directas de la pista (no dentro de otro
  // div) para que medir el ancho de una vuelta sea exacto.
  // Con "reducir movimiento" no hace falta: la fila se navega scrolleando.
  const copia = productos.map((p) => vitrinaCardHTML(p, false)).join('')
    .replace(/<article class="vt-card">/g, '<article class="vt-card" aria-hidden="true">');
  const pista = vitrinaReduce ? cards : cards + copia;
  return `
    <section class="vt-row${vitrinaReduce ? ' vt-row--estatico' : ''}" data-fila="${fila.id}" aria-label="${escapeHtml(fila.titulo)}">
      <div class="vt-row-head">
        <h2 class="vt-row-title">${escapeHtml(fila.titulo)}</h2>
        <span class="vt-row-rule" aria-hidden="true"></span>
        <span class="vt-row-count">${total}</span>
        <div class="vt-row-nav">
          <button type="button" class="vt-arrow" data-paso="-1" aria-label="Ver anteriores de ${escapeHtml(fila.titulo)}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
          </button>
          <button type="button" class="vt-arrow" data-paso="1" aria-label="Ver siguientes de ${escapeHtml(fila.titulo)}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
      <div class="vt-viewport">
        <div class="vt-track">${pista}</div>
      </div>
    </section>`;
}

function renderVitrina() {
  const cont = document.getElementById('vtRows');
  const vitrina = document.getElementById('vitrina');
  if (!cont || !vitrina) return;
  if (typeof VISIBLE_PRODUCTS === 'undefined' || typeof getTipoGeneroBucket !== 'function') return;

  const armadas = [];
  VITRINA_FILAS.forEach((fila, i) => {
    const productos = vitrinaProductosDe(fila, i);
    if (!productos.length) return;                       // fila vacia: no se dibuja
    // El numero que se muestra al lado del titulo es cuantos hay
    // realmente disponibles en esa categoria (con stock), aunque en la
    // fila se luzca solo una parte.
    const enCategoria = VISIBLE_PRODUCTS.filter(fila.filtro);
    const conStock = enCategoria.filter(p => (parseInt(p.stock) || 0) > 0);
    armadas.push({ fila, productos, total: conStock.length || enCategoria.length });
  });

  if (!armadas.length) { vitrina.style.display = 'none'; return; }

  cont.innerHTML = armadas.map(a => vitrinaFilaHTML(a.fila, a.productos, a.total)).join('');
  vitrinaTicker(armadas.map(a => a.fila.titulo));

  cont.querySelectorAll('.vt-row').forEach((el, i) => vitrinaConectaFila(el, armadas[i].fila));
  window.addEventListener('resize', vitrinaMideTodo, { passive: true });
  vitrinaMideTodo();
}

// Linea de texto que se desplaza despacio bajo el titular.
function vitrinaTicker(titulos) {
  const track = document.getElementById('vtTickerTrack');
  if (!track) return;
  const palabras = titulos.concat(['Grupo ImpoHogar']);
  const tira = palabras.map(t =>
    `<span class="vt-ticker-word">${escapeHtml(t)}</span><span class="vt-ticker-dot">·</span>`
  ).join('');
  track.innerHTML = tira + tira + tira;
}

// ============================================================
//  MOTOR DE LOS CARRUSELES
// ============================================================
//  Una sola vuelta de requestAnimationFrame mueve las cuatro filas.
//  Cada fila guarda su desplazamiento en pixeles y se "envuelve" al
//  llegar al ancho de una copia, asi el loop es infinito y no se ve
//  ningun salto. Las flechas y el arrastre suman impulso al mismo
//  desplazamiento, por eso todo se siente continuo y no a tirones.
// ============================================================

function vitrinaConectaFila(el, def) {
  const viewport = el.querySelector('.vt-viewport');
  const track = el.querySelector('.vt-track');
  const f = {
    el, viewport, track,
    dir: def.dir, vel: def.vel,
    offset: 0, ancho: 0, paso: 240,
    impulso: 0, factor: 1, objetivo: 1,
    pausada: false, arrastrando: false,
    x0: 0, off0: 0, movido: 0, ultimoX: 0, ultimoT: 0, velArrastre: 0
  };
  vitrinaFilas.push(f);

  // Flechas
  el.querySelectorAll('.vt-arrow').forEach(btn => {
    btn.addEventListener('click', () => {
      const paso = parseInt(btn.dataset.paso, 10);
      if (vitrinaReduce) {
        viewport.scrollBy({ left: paso * f.paso * 2, behavior: 'smooth' });
      } else {
        f.impulso += -paso * f.paso * 2;
      }
    });
  });

  if (vitrinaReduce) return;   // sin movimiento automatico no hay nada mas que conectar

  // Pausa suave al pasar el mouse por encima
  el.addEventListener('mouseenter', () => { f.pausada = true; });
  el.addEventListener('mouseleave', () => { f.pausada = false; });

  // Arrastre con mouse o dedo
  viewport.addEventListener('pointerdown', e => {
    if (e.button !== undefined && e.button !== 0) return;
    f.arrastrando = true;
    f.movido = 0;
    f.x0 = e.clientX;
    f.off0 = f.offset;
    f.ultimoX = e.clientX;
    f.ultimoT = performance.now();
    f.velArrastre = 0;
    f.impulso = 0;
    viewport.classList.add('is-drag');
    try { viewport.setPointerCapture(e.pointerId); } catch (err) {}
  });

  viewport.addEventListener('pointermove', e => {
    if (!f.arrastrando) return;
    const dx = e.clientX - f.x0;
    f.movido = Math.max(f.movido, Math.abs(dx));
    f.offset = f.off0 + dx;
    const ahora = performance.now();
    const dt = ahora - f.ultimoT;
    if (dt > 8) {
      f.velArrastre = (e.clientX - f.ultimoX) / dt;   // px por ms
      f.ultimoX = e.clientX;
      f.ultimoT = ahora;
    }
  });

  const soltar = e => {
    if (!f.arrastrando) return;
    f.arrastrando = false;
    viewport.classList.remove('is-drag');
    try { viewport.releasePointerCapture(e.pointerId); } catch (err) {}
    // Inercia corta, para que no se frene en seco
    f.impulso += Math.max(-420, Math.min(420, f.velArrastre * 220));
  };
  viewport.addEventListener('pointerup', soltar);
  viewport.addEventListener('pointercancel', soltar);

  // Toque/clic sobre una tarjeta: abre las notas de ese producto.
  // Si el dedo se movio, fue un arrastre y no se abre nada.
  //
  // OJO: mientras se arrastra se captura el puntero, y el navegador
  // dispara el click sobre el contenedor y no sobre la tarjeta. Por eso
  // la tarjeta se busca por la posicion del dedo/mouse y no por
  // e.target, que aca no sirve.
  viewport.addEventListener('click', e => {
    if (f.movido > 6) { f.movido = 0; return; }
    const bajoElDedo = document.elementFromPoint(e.clientX, e.clientY);
    const card = bajoElDedo && bajoElDedo.closest('.vt-card');
    if (!card) return;
    const abierta = card.classList.contains('is-open');
    el.querySelectorAll('.vt-card.is-open').forEach(c => c.classList.remove('is-open'));
    if (!abierta) card.classList.add('is-open');
  });
}

function vitrinaMideTodo() {
  vitrinaFilas.forEach(f => {
    if (vitrinaReduce) return;
    const cards = f.track.querySelectorAll('.vt-card');
    if (cards.length < 2) return;
    const mitad = cards.length / 2;
    // El ancho de UNA vuelta es la distancia entre la primera tarjeta de
    // la tira y la primera de la copia. Medido asi es exacto y no se ve
    // ningun salto al envolver, sin importar margenes ni paddings.
    const a = cards[0].getBoundingClientRect().left;
    const b = cards[mitad].getBoundingClientRect().left;
    f.ancho = b - a;
    const gap = parseFloat(getComputedStyle(f.track).columnGap || '18') || 18;
    f.paso = cards[0].getBoundingClientRect().width + gap;
  });
}

function vitrinaTick(t) {
  if (!vitrinaAndando) return;
  const dt = Math.min(60, t - (vitrinaUltimoFrame || t));
  vitrinaUltimoFrame = t;

  vitrinaFilas.forEach(f => {
    if (vitrinaReduce) return;

    // Arranque/frenado suave del movimiento automatico
    f.objetivo = (f.pausada || f.arrastrando) ? 0 : 1;
    f.factor += (f.objetivo - f.factor) * Math.min(1, dt / 260);

    if (!f.arrastrando) {
      f.offset += f.dir * f.vel * f.factor * (dt / 1000);
    }

    // Impulso de flechas / inercia del arrastre
    if (f.impulso) {
      const paso = f.impulso * Math.min(1, dt / 240);
      f.offset += paso;
      f.impulso -= paso;
      if (Math.abs(f.impulso) < 0.4) f.impulso = 0;
    }

    // Envolver: aca es donde el loop se vuelve infinito sin salto
    if (f.ancho > 0) {
      while (f.offset <= -f.ancho) f.offset += f.ancho;
      while (f.offset > 0) f.offset -= f.ancho;
    }

    f.track.style.transform = 'translate3d(' + f.offset.toFixed(2) + 'px,0,0)';
  });

  vitrinaRAF = requestAnimationFrame(vitrinaTick);
}

function vitrinaArranca() {
  if (vitrinaAndando || vitrinaReduce) return;
  vitrinaAndando = true;
  vitrinaUltimoFrame = 0;
  vitrinaMideTodo();
  vitrinaRAF = requestAnimationFrame(vitrinaTick);
}

function vitrinaDetiene() {
  vitrinaAndando = false;
  if (vitrinaRAF) { cancelAnimationFrame(vitrinaRAF); vitrinaRAF = null; }
}

// Si el cliente cambia de pestana, se detiene sola (no gasta bateria).
document.addEventListener('visibilitychange', () => {
  const vitrina = document.getElementById('vitrina');
  if (!vitrina || vitrina.style.display === 'none') return;
  if (document.hidden) vitrinaDetiene(); else vitrinaArranca();
});

// ============================================================
//  SALIDA HACIA LA PANTALLA DE CLAVE
// ============================================================
//  Lo unico que hace es esconder la vitrina. La pantalla de clave ya
//  esta debajo, montada y funcionando como siempre: no se toca ni su
//  HTML ni su logica.
// ============================================================
function entrarAlCatalogo() {
  const vitrina = document.getElementById('vitrina');
  if (!vitrina) return;
  vitrina.classList.add('vt-saliendo');
  setTimeout(() => {
    vitrina.style.display = 'none';
    vitrinaDetiene();
    const pass = document.getElementById('gatePass');
    if (pass) { try { pass.focus({ preventScroll: true }); } catch (err) { pass.focus(); } }
  }, 480);
}

// ============================================================
//  ARRANQUE
// ============================================================
//  La vitrina se dibuja enseguida (queda escondida detras de la
//  pantalla de bienvenida) y empieza a moverse recien cuando la
//  bienvenida termina. Para saberlo se observa el propio elemento de
//  bienvenida, sin tocar js/gate.js ni copiar sus tiempos.
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  try {
    renderVitrina();
  } catch (err) {
    // Si algo fallara, la vitrina se quita y el cliente ve la clave
    // de siempre: nunca puede quedar bloqueado el acceso.
    console.error('Vitrina:', err);
    const vitrina = document.getElementById('vitrina');
    if (vitrina) vitrina.style.display = 'none';
    return;
  }

  const bienvenida = document.getElementById('welcomeScreen');
  if (!bienvenida || bienvenida.style.display === 'none') { vitrinaArranca(); return; }

  const obs = new MutationObserver(() => {
    if (bienvenida.style.display === 'none') {
      obs.disconnect();
      vitrinaArranca();
    }
  });
  obs.observe(bienvenida, { attributes: true, attributeFilter: ['style'] });

  // Red de seguridad por si la bienvenida no llegara a esconderse.
  setTimeout(() => { obs.disconnect(); vitrinaArranca(); }, 6000);
});
