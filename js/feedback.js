// =====================================================================

//  ARCHIVO COMPLETO js/feedback.js  -  con fotos

// =====================================================================

//  En Visual Studio Code abri js/feedback.js, Ctrl+A, borra todo y pega

//  este archivo entero.

//

//  config.js e index.html NO se tocan: la URL es la misma y el archivo

//  se sigue llamando igual.

//

//  QUE TRAE DE NUEVO:

//  - Boton "Agregar foto": hasta 3 imagenes, con miniatura y una x para

//    quitarlas. El boton desaparece al llegar al tope.

//  - Cada foto se achica a 1280 px de lado mayor y se guarda como JPG al

//    70% de calidad, todo en el telefono del cliente antes de viajar.

//    Una foto de 4 MB termina enviandose en unos 250 KB. Para cambiarlo,

//    tocá FEEDBACK_MAX_LADO y FEEDBACK_CALIDAD arriba del archivo.

//  - Rechaza lo que no sea imagen y lo que pese mas de 12 MB.

//  - Mensaje de exito honesto: dice "recibido" solo cuando Google

//    confirmo, y "enviado" cuando no se pudo leer la respuesta. Antes

//    decia lo mismo en los dos casos y eso te confundio al depurar.

//    Si algo falla, el detalle queda en la consola del navegador.

// =====================================================================



// ============================================================

//  OPINIONES / RECOMENDACIONES / RESENAS

// ============================================================

//  Boton flotante 💬 abajo a la derecha. El cliente escribe y el

//  mensaje se ENVIA a la hoja de calculo de Google (Apps Script).

//

//  IMPORTANTE: el catalogo NO guarda ni muestra opiniones. No hay

//  ninguna funcion que las lea de vuelta, asi que un cliente no

//  puede ver lo que escribio otro ni aunque abra el codigo fuente.

//

//  Admite hasta 3 fotos. Se comprimen en el navegador del cliente antes

//  de viajar, y del otro lado el Apps Script las guarda en una carpeta

//  de tu Drive y deja el enlace en la hoja.

//

//  La direccion de envio se configura en js/config.js (FEEDBACK_URL).

// ============================================================



const FEEDBACK_MIN_CHARS = 5;

const FEEDBACK_MAX_FOTOS = 3;        // cuantas fotos puede adjuntar

const FEEDBACK_MAX_LADO = 1280;      // px del lado mas largo despues de comprimir

const FEEDBACK_CALIDAD = 0.7;        // calidad JPG (0 a 1)

const FEEDBACK_MAX_MB = 12;          // tope por archivo ANTES de comprimir

let feedbackFotos = [];              // base64 ya comprimido

const FEEDBACK_THROTTLE_MS = 20000; // evita envios repetidos por error

let feedbackLastSent = 0;

let feedbackRating = 0;

let feedbackSending = false;



// ---- Estilos propios (asi no hay que tocar css/styles.css) ----

function injectFeedbackStyles() {

  if (document.getElementById('fb-styles')) return;

  const css = `

  .fb-fab { position:fixed; bottom:70px; right:16px; width:44px; height:44px; border-radius:50%;

    background:var(--surface); border:1px solid var(--border); box-shadow:0 2px 10px rgba(18,58,107,0.18);

    display:flex; align-items:center; justify-content:center; font-size:19px; cursor:pointer;

    z-index:500; opacity:0.75; transition:opacity .2s, transform .15s; }

  .fb-fab:hover, .fb-fab:active { opacity:1; transform:scale(1.06); }

  .fb-modal { position:fixed; inset:0; background:rgba(8,16,28,0.55); z-index:2060;

    display:none; align-items:center; justify-content:center; padding:16px; }

  .fb-modal.open { display:flex; }

  .fb-box { background:var(--surface); color:var(--text); border-radius:14px; width:100%; max-width:430px;

    max-height:92vh; overflow-y:auto; box-shadow:0 10px 40px rgba(0,0,0,0.3); }

  .fb-head { padding:16px 18px 10px; border-bottom:1px solid var(--border); }

  .fb-head h3 { margin:0 0 4px; font-size:17px; }

  .fb-head p { margin:0; font-size:12.5px; opacity:0.75; line-height:1.4; }

  .fb-body { padding:14px 18px; display:flex; flex-direction:column; gap:12px; }

  .fb-body label { font-size:12.5px; font-weight:700; display:block; margin-bottom:5px; }

  .fb-body select, .fb-body input[type="text"], .fb-body textarea {

    width:100%; padding:9px 10px; border:1px solid var(--border); border-radius:8px;

    background:var(--bg); color:var(--text); font-family:inherit; font-size:14px; box-sizing:border-box; }

  .fb-body textarea { min-height:96px; resize:vertical; }

  .fb-stars { display:flex; gap:6px; }

  .fb-stars button { background:none; border:none; font-size:26px; line-height:1; cursor:pointer;

    padding:0; filter:grayscale(1); opacity:0.45; transition:filter .15s, opacity .15s, transform .1s; }

  .fb-stars button.on { filter:none; opacity:1; }

  .fb-stars button:active { transform:scale(1.15); }

  .fb-row2 { display:flex; gap:10px; }

  .fb-row2 > div { flex:1; }

  .fb-fotos { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }

  .fb-thumb { position:relative; width:62px; height:62px; border-radius:8px; overflow:hidden;

    border:1px solid var(--border); }

  .fb-thumb img { width:100%; height:100%; object-fit:cover; display:block; }

  .fb-thumb button { position:absolute; top:2px; right:2px; width:18px; height:18px; border-radius:50%;

    border:none; background:rgba(0,0,0,0.65); color:#fff; font-size:12px; line-height:1; cursor:pointer; padding:0; }

  .fb-addfoto { display:inline-block; padding:8px 12px; border:1px dashed var(--border); border-radius:8px;

    font-size:13px; cursor:pointer; background:var(--bg); }

  .fb-addfoto input { display:none; }

  .fb-hint { font-size:11.5px; opacity:0.7; margin-top:5px; line-height:1.4; }

  .fb-hp { position:absolute; left:-9999px; width:1px; height:1px; opacity:0; }

  .fb-foot { padding:12px 18px 16px; border-top:1px solid var(--border);

    display:flex; gap:10px; justify-content:flex-end; align-items:center; flex-wrap:wrap; }

  .fb-foot button { padding:9px 16px; border-radius:8px; border:1px solid var(--border);

    background:var(--bg); color:var(--text); font-size:14px; cursor:pointer; }

  .fb-foot .fb-send { background:#123a6b; border-color:#123a6b; color:#fff; font-weight:700; }

  .fb-foot .fb-send:disabled { opacity:0.55; cursor:default; }

  .fb-msg { font-size:12.5px; margin-right:auto; min-height:16px; }

  .fb-msg.err { color:#c0392b; }

  .fb-msg.ok { color:#1e8449; }

  @media (max-width:480px) { .fb-fab { bottom:64px; right:12px; } }

  `;

  const tag = document.createElement('style');

  tag.id = 'fb-styles';

  tag.textContent = css;

  document.head.appendChild(tag);

}



// ---- Boton flotante + modal ----

function buildFeedbackUI() {

  if (document.getElementById('fbModal')) return;



  const fab = document.createElement('div');

  fab.className = 'fb-fab';

  fab.id = 'fbFab';

  fab.title = 'Dejar una opinion';

  fab.setAttribute('role', 'button');

  fab.textContent = '💬';

  fab.addEventListener('click', openFeedback);

  document.body.appendChild(fab);



  const modal = document.createElement('div');

  modal.className = 'fb-modal';

  modal.id = 'fbModal';

  modal.innerHTML = `

    <div class="fb-box">

      <div class="fb-head">

        <h3>💬 Tu opinion</h3>

        <p>Contanos que te parece el catalogo, que producto te gustaria que trajeramos o como fue tu experiencia. Lo lee unicamente ImpoHogar: ningun otro cliente ve lo que escribis.</p>

      </div>

      <div class="fb-body">

        <div>

          <label for="fbTipo">Tema</label>

          <select id="fbTipo">

            <option>Opinion general</option>

            <option>Recomendacion de producto</option>

            <option>Resena de un producto que compre</option>

            <option>Problema con el catalogo</option>

          </select>

        </div>

        <div>

          <label>Puntuacion (opcional)</label>

          <div class="fb-stars" id="fbStars">

            <button type="button" data-v="1">⭐</button>

            <button type="button" data-v="2">⭐</button>

            <button type="button" data-v="3">⭐</button>

            <button type="button" data-v="4">⭐</button>

            <button type="button" data-v="5">⭐</button>

          </div>

        </div>

        <div>

          <label for="fbComentario">Tu mensaje</label>

          <textarea id="fbComentario" maxlength="1200" placeholder="Escribi aca..."></textarea>

        </div>

        <div class="fb-row2">

          <div>

            <label for="fbNombre">Nombre (opcional)</label>

            <input type="text" id="fbNombre" maxlength="60" placeholder="Podes dejarlo vacio">

          </div>

          <div>

            <label for="fbTelefono">Telefono (opcional)</label>

            <input type="text" id="fbTelefono" maxlength="30" placeholder="Si queres respuesta">

          </div>

        </div>

        <div>

          <label>Fotos (opcional)</label>

          <label class="fb-addfoto" id="fbAddFoto">📷 Agregar foto

            <input type="file" id="fbFile" accept="image/*" multiple>

          </label>

          <div class="fb-fotos" id="fbFotos"></div>

          <div class="fb-hint">Hasta 3 fotos. Se achican en tu telefono antes de enviarse, asi que no gastan datos de mas.</div>

        </div>

        <input type="text" id="fbWeb" class="fb-hp" tabindex="-1" autocomplete="off" aria-hidden="true">

      </div>

      <div class="fb-foot">

        <span class="fb-msg" id="fbMsg"></span>

        <button type="button" onclick="closeFeedback()">Cancelar</button>

        <button type="button" class="fb-send" id="fbSend" onclick="sendFeedback()">Enviar</button>

      </div>

    </div>`;

  document.body.appendChild(modal);



  modal.addEventListener('click', e => { if (e.target === modal) closeFeedback(); });

  modal.querySelector('#fbFile').addEventListener('change', e => {

    agregarFotos(Array.from(e.target.files || []));

    e.target.value = '';

  });

  modal.querySelector('#fbStars').addEventListener('click', e => {

    const b = e.target.closest('button');

    if (!b) return;

    setFeedbackRating(parseInt(b.dataset.v, 10));

  });

}



// ---- Fotos: comprimir en el navegador y guardar en base64 ----

function comprimirImagen(file) {

  return new Promise((resolve, reject) => {

    const lector = new FileReader();

    lector.onerror = () => reject(new Error('No se pudo leer la imagen.'));

    lector.onload = () => {

      const img = new Image();

      img.onerror = () => reject(new Error('El archivo no es una imagen valida.'));

      img.onload = () => {

        try {

          let w = img.width, h = img.height;

          const escala = Math.min(1, FEEDBACK_MAX_LADO / Math.max(w, h));

          w = Math.max(1, Math.round(w * escala));

          h = Math.max(1, Math.round(h * escala));

          const lienzo = document.createElement('canvas');

          lienzo.width = w; lienzo.height = h;

          const ctx = lienzo.getContext('2d');

          ctx.fillStyle = '#ffffff';

          ctx.fillRect(0, 0, w, h);

          ctx.drawImage(img, 0, 0, w, h);

          const url = lienzo.toDataURL('image/jpeg', FEEDBACK_CALIDAD);

          resolve({ base64: url.split(',')[1], preview: url });

        } catch (err) { reject(err); }

      };

      img.src = lector.result;

    };

    lector.readAsDataURL(file);

  });

}



async function agregarFotos(archivos) {

  for (const file of archivos) {

    if (feedbackFotos.length >= FEEDBACK_MAX_FOTOS) {

      setFeedbackMsg('Maximo ' + FEEDBACK_MAX_FOTOS + ' fotos.', 'err');

      break;

    }

    if (!file.type || file.type.indexOf('image/') !== 0) {

      setFeedbackMsg('Solo se pueden adjuntar imagenes.', 'err');

      continue;

    }

    if (file.size > FEEDBACK_MAX_MB * 1024 * 1024) {

      setFeedbackMsg('Esa foto pesa mas de ' + FEEDBACK_MAX_MB + ' MB.', 'err');

      continue;

    }

    try {

      setFeedbackMsg('Preparando foto...');

      const r = await comprimirImagen(file);

      feedbackFotos.push(r);

      setFeedbackMsg('');

    } catch (err) {

      setFeedbackMsg(err.message || 'No se pudo procesar la foto.', 'err');

    }

  }

  pintarFotos();

}



function quitarFoto(i) {

  feedbackFotos.splice(i, 1);

  pintarFotos();

}



function pintarFotos() {

  const cont = document.getElementById('fbFotos');

  if (!cont) return;

  cont.innerHTML = feedbackFotos.map((f, i) =>

    '<div class="fb-thumb"><img src="' + f.preview + '" alt="">' +

    '<button type="button" onclick="quitarFoto(' + i + ')" title="Quitar">x</button></div>'

  ).join('');

  const add = document.getElementById('fbAddFoto');

  if (add) add.style.display = feedbackFotos.length >= FEEDBACK_MAX_FOTOS ? 'none' : 'inline-block';

}



function setFeedbackRating(v) {

  feedbackRating = (feedbackRating === v) ? 0 : v;

  document.querySelectorAll('#fbStars button').forEach(b => {

    b.classList.toggle('on', parseInt(b.dataset.v, 10) <= feedbackRating);

  });

}



function openFeedback() {

  buildFeedbackUI();

  // Si el cliente ya puso sus datos al hacer un pedido, los precargamos.

  try {

    const saved = JSON.parse(localStorage.getItem('impohogar_customer') || '{}');

    if (saved.name && !document.getElementById('fbNombre').value) document.getElementById('fbNombre').value = saved.name;

    if (saved.phone && !document.getElementById('fbTelefono').value) document.getElementById('fbTelefono').value = saved.phone;

  } catch (err) { /* sin localStorage seguimos igual */ }

  setFeedbackMsg('');

  document.getElementById('fbModal').classList.add('open');

  setTimeout(() => { const t = document.getElementById('fbComentario'); if (t) t.focus(); }, 60);

}



function closeFeedback() {

  const m = document.getElementById('fbModal');

  if (m) m.classList.remove('open');

}



function setFeedbackMsg(txt, kind) {

  const el = document.getElementById('fbMsg');

  if (!el) return;

  el.textContent = txt || '';

  el.className = 'fb-msg' + (kind ? ' ' + kind : '');

}



async function sendFeedback() {

  if (feedbackSending) return;



  const comentario = document.getElementById('fbComentario').value.trim();

  const trampa = document.getElementById('fbWeb').value;



  if (trampa) { closeFeedback(); return; }          // bot: se descarta en silencio

  if (comentario.length < FEEDBACK_MIN_CHARS) {

    setFeedbackMsg('Escribi tu mensaje antes de enviar.', 'err');

    return;

  }

  if (Date.now() - feedbackLastSent < FEEDBACK_THROTTLE_MS) {

    setFeedbackMsg('Ya enviaste hace un momento, esperá unos segundos.', 'err');

    return;

  }

  if (typeof FEEDBACK_URL !== 'string' || FEEDBACK_URL.indexOf('http') !== 0) {

    setFeedbackMsg('Falta configurar FEEDBACK_URL en js/config.js', 'err');

    return;

  }



  const datos = new URLSearchParams({

    tipo: document.getElementById('fbTipo').value,

    estrellas: feedbackRating ? String(feedbackRating) : '',

    comentario: comentario,

    nombre: document.getElementById('fbNombre').value.trim(),

    telefono: document.getElementById('fbTelefono').value.trim(),

    pagina: location.hostname || 'local',

    web: ''

  });

  feedbackFotos.forEach((f, i) => datos.append('foto' + (i + 1), f.base64));



  feedbackSending = true;

  const btn = document.getElementById('fbSend');

  btn.disabled = true;

  setFeedbackMsg(feedbackFotos.length ? 'Enviando fotos...' : 'Enviando...');



  // 'confirmado' = Google respondio que si. 'aciegas' = se mando pero no

  // pudimos leer la respuesta. 'fallo' = ni siquiera salio.

  let resultado = 'fallo';

  try {

    // Intento normal: Apps Script devuelve JSON y podemos confirmarlo.

    const resp = await fetch(FEEDBACK_URL, { method: 'POST', body: datos });

    const data = await resp.json();

    resultado = (data && data.ok) ? 'confirmado' : 'fallo';

    if (data && data.ok === false) console.warn('[FEEDBACK] Google respondio con error:', data.error);

  } catch (err) {

    console.warn('[FEEDBACK] No se pudo leer la respuesta:', err.message);

    // El navegador bloqueo la lectura. Reintentamos a ciegas: probablemente

    // llegue, pero no lo podemos asegurar y asi se lo decimos al cliente.

    try {

      await fetch(FEEDBACK_URL, { method: 'POST', mode: 'no-cors', body: datos });

      resultado = 'aciegas';

    } catch (err2) {

      console.error('[FEEDBACK] Fallo el envio:', err2.message);

      resultado = 'fallo';

    }

  }

  const enviado = (resultado !== 'fallo');



  feedbackSending = false;

  btn.disabled = false;



  if (enviado) {

    feedbackLastSent = Date.now();

    feedbackRating = 0;

    feedbackFotos = [];

    pintarFotos();

    document.getElementById('fbComentario').value = '';

    document.querySelectorAll('#fbStars button').forEach(b => b.classList.remove('on'));

    setFeedbackMsg(resultado === 'confirmado'

      ? '¡Gracias! Tu mensaje fue recibido.'

      : '¡Gracias! Mensaje enviado.', 'ok');

    setTimeout(closeFeedback, 1400);

  } else {

    setFeedbackMsg('No se pudo enviar. Revisá tu conexión e intentá de nuevo.', 'err');

  }

}



document.addEventListener('DOMContentLoaded', () => {

  try {

    injectFeedbackStyles();

    buildFeedbackUI();

  } catch (err) {

    console.error('[FEEDBACK]', err);

  }

});

