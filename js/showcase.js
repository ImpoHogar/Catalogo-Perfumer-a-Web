// ============================================================
//  TE PUEDE INTERESAR  (pantalla de entrada, antes de la clave)
// ============================================================
//  Al fondo hay un muro con los frascos de la seleccion que sube
//  despacio. Cada TPI_INTERVALO_MS uno sale volando del muro y queda
//  al frente con su marca, nombre, presentacion, categoria y notas.
//
//  De donde salen los productos:
//    js/promos.js trae SOLO los codigos (TPI_CODIGOS). Cada codigo se
//    busca en VISIBLE_PRODUCTS (products.js + stock.js ya armados por
//    data.js), asi que no se duplica ningun dato. Solo entran los que
//    se ven en el catalogo (con foto) y tienen stock.
//
//  Orden: ALEATORIO. La lista se baraja cada vez que se abre la
//  pagina, salen todos antes de repetir y no sale la misma marca dos
//  veces seguidas.
//
//  Botones:
//    "Descubrir producto" esconde esta pantalla, deja la clave de
//    siempre y, cuando el cliente entra, busca ese codigo en el
//    catalogo y le abre la ficha del producto.
//    "Explorar catalogo" solo esconde esta pantalla: queda la clave.
//
//  js/gate.js NO se toca: esta pantalla va encima de la clave (mismo
//  z-index, despues en el HTML) y al irse la deja a la vista.
//
//  NUNCA se muestran precios aqui.
// ============================================================

const tpReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TP_RELACIONADOS = 6;

let tpBase = [];          // productos validos de la seleccion
let tpSeq = [];           // la misma lista, barajada
let tpI = 0;
let tpTimer = null;
let tpOcupado = false;    // mientras un frasco va volando
let tpActiva = false;     // la pantalla esta a la vista
let tpResize = null;

function tpEsc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function tpFoto(p) { return `img/p${p.id}.webp?v=${IMG_VERSION}`; }
function tpMod(n) { const N = tpSeq.length; return ((n % N) + N) % N; }

// ---------- datos ----------
function tpArmaLista() {
  const codigos = (typeof TPI_CODIGOS !== 'undefined' && Array.isArray(TPI_CODIGOS)) ? TPI_CODIGOS : [];
  const porCodigo = {};
  VISIBLE_PRODUCTS.forEach(p => { porCodigo[p.code] = p; });
  const vistos = new Set();
  const lista = [];
  codigos.forEach(c => {
    const p = porCodigo[String(c).trim()];            // cruce EXACTO, sin tocar ceros
    if (!p || vistos.has(p.id)) return;
    if ((parseInt(p.stock) || 0) <= 0) return;        // agotado: no se muestra
    vistos.add(p.id);
    lista.push(p);
  });
  return lista;
}

function tpBaraja(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// Si quedaron dos de la misma marca seguidos, cambia el segundo por
// otro mas adelante que no choque con sus vecinos.
function tpSeparaMarcas(a) {
  for (let i = 1; i < a.length; i++) {
    if (a[i].brand !== a[i - 1].brand) continue;
    const j = a.findIndex((q, k) => k > i && q.brand !== a[i - 1].brand &&
      (!a[k - 1] || a[k - 1].brand !== a[i].brand) && (!a[k + 1] || a[k + 1].brand !== a[i].brand));
    if (j > 0) [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function tpCategoria(p) {
  const b = (typeof getTipoGeneroBucket === 'function') ? getTipoGeneroBucket(p) : p.genero;
  if (b === 'Estuches') return 'Estuche';
  if (b === 'Splash/Bodymist') return 'Body mist';
  return b || '';
}
// Presentacion leida del nombre: "100 ml", "EDP", "3 piezas".
function tpPresentacion(nombre) {
  const ml = (nombre.match(/(\d+(?:[.,]\d+)?)\s?ML\b/i) || [])[1];
  const tipo = (nombre.match(/\b(EDP|EDT|EDC|PARFUM|COLOGNE)\b/i) || [])[1];
  const pz = (nombre.match(/(\d+)\s?(?:PZA|PZ|PC|PCS|PIEZAS)\b/i) || [])[1];
  return [ml && ml + ' ml', tipo && tipo.toUpperCase(), pz && pz + ' piezas'].filter(Boolean);
}

// ---------- el muro ----------
function tpArmaMuro() {
  const wall = document.getElementById('tpWall');
  const vitrina = document.getElementById('vitrina');
  if (!wall || !vitrina) return;
  const cs = getComputedStyle(vitrina);
  const T = parseFloat(cs.getPropertyValue('--tp-tile')) || 118;
  const G = parseFloat(cs.getPropertyValue('--tp-gap')) || 12;
  const cols = Math.ceil(window.innerWidth / (T + G)) + 1;
  const filas = Math.ceil(window.innerHeight / (T + G)) + 2;
  const alto = filas * (T + G);
  const bolsa = tpBaraja(tpBase);
  let k = 0, html = '';
  for (let c = 0; c < cols; c++) {
    const col = [];
    for (let r = 0; r < filas; r++) col.push(bolsa[k++ % bolsa.length]);
    // cada columna va dos veces seguida para que el movimiento no tenga corte
    const celdas = col.concat(col).map(p =>
      `<div class="tp-wall-t" data-id="${p.id}"><img src="${tpFoto(p)}" alt="" loading="lazy" decoding="async"></div>`
    ).join('');
    const desfase = (c % 2) ? -(T + G) / 2 : 0;
    html += `<div class="tp-wall-col" style="left:${c * (T + G) - G}px;top:${desfase}px">${celdas}</div>`;
  }
  wall.innerHTML = html;
  wall.style.setProperty('--tp-alto', alto + 'px');
  wall.style.setProperty('--tp-dur', Math.round(alto / 9) + 's');   // unos 9 px por segundo
}

// Un frasco del muro que se vea entero y que no quede detras de la
// foto grande ni del texto.
function tpFrascoVisible() {
  const wall = document.getElementById('tpWall');
  const frame = document.getElementById('tpFrame').getBoundingClientRect();
  const prod = document.getElementById('tpProd').getBoundingClientRect();
  const choca = (r, b) => !(r.right < b.left || r.left > b.right || r.bottom < b.top || r.top > b.bottom);
  const libres = [...wall.querySelectorAll('.tp-wall-t')].filter(t => {
    const r = t.getBoundingClientRect();
    return r.top > 70 && r.bottom < window.innerHeight - 10 && r.left > 0 && r.right < window.innerWidth &&
      !choca(r, frame) && !choca(r, prod);
  });
  return libres.length ? libres[Math.floor(Math.random() * libres.length)] : null;
}

// ---------- el producto al frente ----------
function tpPintaTexto(p) {
  document.getElementById('tpCount').innerHTML =
    `<b>${String(tpI + 1).padStart(2, '0')}</b> / ${tpSeq.length}`;
  document.getElementById('tpBrand').textContent = p.brand;
  document.getElementById('tpName').textContent = p.name;
  const cat = tpCategoria(p);
  document.getElementById('tpTags').innerHTML =
    tpPresentacion(p.name).concat(cat ? [cat] : []).map(t => `<span>${tpEsc(t)}</span>`).join('');
  const notas = (p.notes || []).slice(0, 5);
  const elNotas = document.getElementById('tpNotes');
  elNotas.textContent = notas.length
    ? 'Notas de ' + notas.join(', ').toLowerCase().replace(/, ([^,]*)$/, ' y $1') + '.'
    : '';
  elNotas.style.display = notas.length ? '' : 'none';

  // Tambien podria interesarte: primero de la misma categoria
  const rel = [], vistos = new Set([p.id]);
  for (let k = 1; k < tpSeq.length && rel.length < TP_RELACIONADOS; k++) {
    const q = tpSeq[tpMod(tpI + k)];
    if (tpCategoria(q) === cat && !vistos.has(q.id)) { rel.push(q); vistos.add(q.id); }
  }
  for (let k = 1; k < tpSeq.length && rel.length < TP_RELACIONADOS; k++) {
    const q = tpSeq[tpMod(tpI + k)];
    if (!vistos.has(q.id)) { rel.push(q); vistos.add(q.id); }
  }
  document.getElementById('tpRel').innerHTML = rel.map(q =>
    `<button type="button" class="tp-mini" data-tp-go="${tpSeq.indexOf(q)}" aria-label="${tpEsc(q.brand + ' ' + q.name)}">
      <span class="tp-mini-i"><img src="${tpFoto(q)}" alt="" loading="lazy" decoding="async"></span>
      <span class="tp-mini-t"><b>${tpEsc(q.brand)}</b>${tpEsc(q.name)}</span>
    </button>`).join('');
}

function tpPonFoto(p) {
  const frame = document.getElementById('tpFrame');
  const img = document.createElement('img');
  img.src = tpFoto(p);
  img.alt = p.brand + ' ' + p.name;
  frame.querySelectorAll('img').forEach(v => v.remove());
  frame.appendChild(img);
}

function tpBarra() {
  const bar = document.getElementById('tpBar');
  if (!bar) return;
  bar.style.transition = 'none';
  bar.style.width = '0';
  void bar.offsetWidth;
  bar.style.transition = `width ${TPI_INTERVALO_MS}ms linear`;
  bar.style.width = '100%';
}
function tpPrograma() {
  clearTimeout(tpTimer);
  if (!tpActiva) return;
  tpBarra();
  tpTimer = setTimeout(() => tpIr(tpI + 1, true), TPI_INTERVALO_MS);
}

// Cambia de producto. Cuando lo pide el reloj, el frasco sale del muro.
function tpIr(n, desdeElMuro) {
  if (tpOcupado || !tpSeq.length) return;
  tpI = tpMod(n);
  const p = tpSeq[tpI];
  const prod = document.getElementById('tpProd');
  const frame = document.getElementById('tpFrame');
  clearTimeout(tpTimer);
  prod.classList.add('tp-out');
  frame.querySelectorAll('img').forEach(v => v.classList.add('tp-out'));

  const frasco = (desdeElMuro && !tpReduce) ? tpFrascoVisible() : null;
  if (!frasco) {
    setTimeout(() => { tpPonFoto(p); tpPintaTexto(p); prod.classList.remove('tp-out'); tpPrograma(); }, 300);
    return;
  }

  tpOcupado = true;
  frasco.querySelector('img').src = tpFoto(p);        // ese frasco del muro pasa a ser el elegido
  frasco.dataset.id = p.id;
  const a = frasco.getBoundingClientRect();
  const b = frame.getBoundingClientRect();
  const volador = document.createElement('div');
  volador.className = 'tp-flyer';
  volador.style.cssText = `left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px`;
  volador.innerHTML = `<img src="${tpFoto(p)}" alt="">`;
  document.getElementById('vitrina').appendChild(volador);
  frasco.style.visibility = 'hidden';

  const dx = b.left - a.left, dy = b.top - a.top, s = b.width / a.width;
  const termina = () => {
    tpPonFoto(p);
    volador.remove();
    frasco.style.visibility = '';
    tpOcupado = false;
    tpPrograma();
  };
  if (typeof volador.animate !== 'function') { tpPintaTexto(p); prod.classList.remove('tp-out'); termina(); return; }
  const anim = volador.animate([
    { transform: 'translate(0,0) scale(1)' },
    { transform: 'translate(0,-6px) scale(1.12)', offset: .22 },
    { transform: `translate(${dx}px,${dy}px) scale(${s})`, borderRadius: (10 / s) + 'px',
      boxShadow: '0 0 0 0 rgba(226,190,114,0), 0 50px 120px -30px rgba(0,0,0,.8)' }
  ], { duration: 1250, easing: 'cubic-bezier(.65,0,.25,1)', fill: 'forwards' });
  setTimeout(() => { tpPintaTexto(p); prod.classList.remove('tp-out'); }, 850);
  anim.onfinish = termina;
  anim.oncancel = termina;
}

// ---------- entrar al catalogo ----------
// Esconde esta pantalla. La clave ya esta debajo, montada y funcionando
// como siempre: no se toca ni su HTML ni su logica.
function entrarAlCatalogo(producto) {
  const vitrina = document.getElementById('vitrina');
  if (!vitrina) return;
  tpDetiene();
  if (producto) tpAbreAlEntrar(producto);
  vitrina.classList.add('tp-saliendo');
  setTimeout(() => {
    vitrina.style.display = 'none';
    const wall = document.getElementById('tpWall');
    if (wall) wall.innerHTML = '';                       // libera las fotos del muro
    const pass = document.getElementById('gatePass');
    if (pass) { try { pass.focus({ preventScroll: true }); } catch (err) { pass.focus(); } }
  }, 480);
}

// Cuando el cliente escribe bien la clave (gate.js muestra #mainContent),
// se busca el codigo en el catalogo y se abre la ficha de ese producto.
function tpAbreAlEntrar(p) {
  const main = document.getElementById('mainContent');
  if (!main) return;
  const abrir = () => {
    const buscador = document.getElementById('search');
    if (buscador) buscador.value = p.code;
    if (typeof applyFilters === 'function') applyFilters();
    window.scrollTo(0, 0);
    setTimeout(() => { if (typeof openLightbox === 'function') openLightbox(p.id, 0); }, 250);
  };
  if (main.style.display === 'block') { abrir(); return; }
  const obs = new MutationObserver(() => {
    if (main.style.display === 'block') { obs.disconnect(); abrir(); }
  });
  obs.observe(main, { attributes: true, attributeFilter: ['style'] });
}

// ---------- arranque / pausa ----------
function tpArranca() {
  if (tpActiva) return;
  tpActiva = true;
  setTimeout(() => { tpI = -1; tpIr(0, true); }, 500);   // el primero tambien sale del muro
}
function tpDetiene() {
  tpActiva = false;
  clearTimeout(tpTimer);
  const bar = document.getElementById('tpBar');
  if (bar) { bar.style.transition = 'none'; bar.style.width = '0'; }
}

function tpConecta() {
  const vitrina = document.getElementById('vitrina');
  vitrina.addEventListener('click', e => {
    const go = e.target.closest('[data-tp-go]');
    if (go) {
      tpIr(parseInt(go.dataset.tpGo, 10), false);
      vitrina.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const b = e.target.closest('[data-tp]');
    if (!b) return;
    const accion = b.dataset.tp;
    if (accion === 'next') tpIr(tpI + 1, false);
    if (accion === 'prev') tpIr(tpI - 1, false);
    if (accion === 'descubrir') entrarAlCatalogo(tpSeq[tpI]);
    if (accion === 'explorar') entrarAlCatalogo();
  });
  document.addEventListener('keydown', e => {
    if (!tpActiva) return;
    if (e.key === 'ArrowRight') tpIr(tpI + 1, false);
    if (e.key === 'ArrowLeft') tpIr(tpI - 1, false);
  });
  document.addEventListener('visibilitychange', () => {
    if (!tpActiva) return;
    if (document.hidden) clearTimeout(tpTimer); else if (!tpOcupado) tpPrograma();
  });
  window.addEventListener('resize', () => {
    if (vitrina.style.display === 'none') return;
    clearTimeout(tpResize);
    tpResize = setTimeout(tpArmaMuro, 250);
  });
}

// ============================================================
//  ARRANQUE
// ============================================================
//  La pantalla se arma enseguida (queda escondida detras de la
//  bienvenida) y empieza a moverse cuando la bienvenida termina. Para
//  saberlo se observa el propio elemento de bienvenida, sin tocar
//  js/gate.js ni copiar sus tiempos.
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const vitrina = document.getElementById('vitrina');
  try {
    tpBase = tpArmaLista();
    if (!tpBase.length) throw new Error('la seleccion no tiene productos disponibles');
    tpSeq = tpSeparaMarcas(tpBaraja(tpBase));
    tpArmaMuro();
    tpPintaTexto(tpSeq[0]);
    tpConecta();
  } catch (err) {
    // Si algo fallara, esta pantalla se quita y el cliente ve la clave
    // de siempre: nunca puede quedar bloqueado el acceso.
    console.error('Te puede interesar:', err);
    if (vitrina) vitrina.style.display = 'none';
    return;
  }

  const bienvenida = document.getElementById('welcomeScreen');
  if (!bienvenida || bienvenida.style.display === 'none') { tpArranca(); return; }

  const obs = new MutationObserver(() => {
    if (bienvenida.style.display === 'none') { obs.disconnect(); tpArranca(); }
  });
  obs.observe(bienvenida, { attributes: true, attributeFilter: ['style'] });

  // Red de seguridad por si la bienvenida no llegara a esconderse.
  setTimeout(() => { obs.disconnect(); tpArranca(); }, 6000);
});