// ============================================================
//  FICHA DEL PRODUCTO / VISOR DE FOTOS (zoom, gestos, codigo de barras)
// ============================================================
//  Al tocar la foto de un producto se abre su ficha: a la izquierda
//  la foto (con zoom, pellizco y flechas para pasar al codigo de
//  barras), a la derecha la informacion que YA existe en el catalogo:
//  marca, nombre, categoria, codigo, stock, notas olfativas y sus
//  dupes/inspiraciones. No agrega datos nuevos: solo los presenta.
// ============================================================

let lightboxState = { images: [], index: 0, scale: 1, pid: null };

let pinchStartDist = null;

let pinchStartScale = 1;

function barcodeDataURL(code) {
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, code, { format: 'CODE128', displayValue: true, width: 2, height: 70, margin: 8, fontSize: 16 });
    return canvas.toDataURL('image/png');
  } catch (e) {
    return placeholderImg('Código no valido para barras');
  }
}

function getProductImages(p) {
  const photoSrc = p.img ? `img/p${p.id}.webp?v=${IMG_VERSION}` : placeholderImg(p.brand);
  const barcodeSrc = barcodeDataURL(p.code);
  return [
    { src: photoSrc, caption: `${p.brand} — ${p.name}` },
    { src: barcodeSrc, caption: `Código de barras · ${p.code}` }
  ];
}

function openLightbox(pid, imgIndex) {
  const p = PRODUCTS_BY_ID[pid];
  if (!p) return;
  lightboxState.pid = pid;
  lightboxState.images = getProductImages(p);
  lightboxState.index = imgIndex;
  updateLightbox();
  renderLightboxInfo(p);
  const lb = document.getElementById('lightbox');
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
  const info = document.getElementById('lightboxInfo');
  if (info) info.scrollTop = 0;
}

// Panel derecho con la informacion del producto
function renderLightboxInfo(p) {
  const info = document.getElementById('lightboxInfo');
  if (!info) return;
  const stockNum = parseInt(p.stock) || 0;
  const agotado = stockNum <= 0;
  const categoria = (typeof getTipoGeneroBucket === 'function') ? getTipoGeneroBucket(p) : null;
  const esNuevo = (typeof isProductNew === 'function') && isProductNew(p);
  const enPedido = (typeof qtyMap !== 'undefined' && qtyMap[p.id]) ? qtyMap[p.id] : 0;

  const tags = [];
  if (esNuevo) tags.push('<span class="lb-tag is-new">Nuevo ingreso</span>');
  if (p.tipo) tags.push(`<span class="lb-tag">${escapeHtml(p.tipo)}</span>`);
  if (p.genero && p.genero !== p.tipo) tags.push(`<span class="lb-tag">${escapeHtml(p.genero)}</span>`);
  if (categoria && categoria !== p.tipo && categoria !== p.genero && !(categoria === 'Estuches' && p.tipo === 'Estuche')) {
    tags.push(`<span class="lb-tag">${escapeHtml(categoria)}</span>`);
  }

  const notas = (p.notes && p.notes.length) ? `
    <div class="lb-section">
      <h4 class="lb-section-title">Notas olfativas</h4>
      <div class="lb-notes">${p.notes.map(n => `<span class="lb-note">${escapeHtml(n)}</span>`).join('')}</div>
    </div>` : '';

  const rels = (typeof getRelatedProducts === 'function') ? getRelatedProducts(p.id) : [];
  const relacionados = rels.length ? `
    <div class="lb-section">
      <h4 class="lb-section-title">Dupe / Inspiración</h4>
      <div class="lb-related">
        ${rels.map(r => {
          const rp = r.product;
          const rAgotado = (parseInt(rp.stock) || 0) <= 0;
          const label = r.tipo === 'dupe_confirmado' ? 'Dupe / Inspiración confirmada'
                      : r.tipo === 'inspiracion'     ? 'Dupe / Inspiración'
                      : 'Perfil similar';
          const rImg = rp.img ? `img/p${rp.id}.webp?v=${IMG_VERSION}` : placeholderImg(rp.brand);
          return `
          <button type="button" class="lb-rel" onclick="openLightbox(${rp.id}, 0)">
            <img src="${rImg}" alt="">
            <span><span class="lb-rel-brand">${escapeHtml(rp.brand)} · ${label}</span><span class="lb-rel-name">${escapeHtml(rp.name)}</span></span>
            <span class="stock${rAgotado ? ' is-out' : ''}">${rAgotado ? 'Agotado' : escapeHtml(rp.stock) + ' uds'}</span>
          </button>`;
        }).join('')}
      </div>
    </div>` : '';

  info.innerHTML = `
    <div class="lb-brand">${escapeHtml(p.brand)}</div>
    <h2 class="lb-name">${escapeHtml(p.name)}</h2>
    ${tags.length ? `<div class="lb-tags">${tags.join('')}</div>` : ''}
    <dl class="lb-facts">
      <div class="lb-fact"><dt>Disponibilidad</dt><dd><span class="stock${agotado ? ' is-out' : ''}">${agotado ? 'Agotado' : escapeHtml(p.stock) + ' uds'}</span></dd></div>
      <div class="lb-fact"><dt>Código</dt><dd class="code">${escapeHtml(p.code)}</dd></div>
    </dl>
    ${enPedido ? `<div class="lb-incart">En tu pedido: <b>${enPedido} ${enPedido === 1 ? 'unidad' : 'unidades'}</b></div>` : ''}
    ${notas}
    ${relacionados}
    <div class="lb-actions">
      <button type="button" class="btn btn-ghost" onclick="closeLightbox(); jumpToProduct(${p.id});">Ir al producto en el catálogo</button>
    </div>`;
}

function updateLightbox() {
  const { images, index } = lightboxState;
  const img = document.getElementById('lightboxImg');
  const cap = document.getElementById('lightboxCaption');
  img.src = images[index].src;
  img.alt = images[index].caption;
  cap.textContent = images[index].caption;
  img.style.transform = 'scale(1)';
  img.classList.remove('zoomed');
  lightboxState.scale = 1;
  document.querySelectorAll('#lightboxTabs button').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.i) === index);
  });
}

function lightboxNav(delta, evt) {
  if (evt) evt.stopPropagation();
  const n = lightboxState.images.length;
  lightboxState.index = (lightboxState.index + delta + n) % n;
  updateLightbox();
}

// Salta directo a la foto (0) o al codigo de barras (1)
function lightboxGoTo(i, evt) {
  if (evt) evt.stopPropagation();
  if (!lightboxState.images[i]) return;
  lightboxState.index = i;
  updateLightbox();
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
}

function toggleZoom(e) {
  const img = document.getElementById('lightboxImg');
  if (lightboxState.scale === 1) {
    lightboxState.scale = 2.5;
    img.classList.add('zoomed');
    const rect = img.getBoundingClientRect();
    const originX = ((e.clientX - rect.left) / rect.width) * 100;
    const originY = ((e.clientY - rect.top) / rect.height) * 100;
    img.style.transformOrigin = `${originX}% ${originY}%`;
  } else {
    lightboxState.scale = 1;
    img.classList.remove('zoomed');
    img.style.transformOrigin = 'center center';
  }
  img.style.transform = `scale(${lightboxState.scale})`;
}

function wheelZoom(e) {
  e.preventDefault();
  const img = document.getElementById('lightboxImg');
  let s = lightboxState.scale + (e.deltaY < 0 ? 0.3 : -0.3);
  s = Math.min(4, Math.max(1, s));
  lightboxState.scale = s;
  img.classList.toggle('zoomed', s > 1);
  img.style.transform = `scale(${s})`;
}

function touchZoomStart(e) {
  if (e.touches.length === 2) {
    pinchStartDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    pinchStartScale = lightboxState.scale;
  }
}

function touchZoomMove(e) {
  if (e.touches.length === 2 && pinchStartDist) {
    e.preventDefault();
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    const img = document.getElementById('lightboxImg');
    let s = pinchStartScale * (dist / pinchStartDist);
    s = Math.min(4, Math.max(1, s));
    lightboxState.scale = s;
    img.classList.toggle('zoomed', s > 1);
    img.style.transform = `scale(${s})`;
  }
}

function touchZoomEnd(e) {
  if (e.touches.length < 2) pinchStartDist = null;
}

document.addEventListener('keydown', e => {
  const lb = document.getElementById('lightbox');
  if (!lb || !lb.classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') lightboxNav(-1);
  if (e.key === 'ArrowRight') lightboxNav(1);
});