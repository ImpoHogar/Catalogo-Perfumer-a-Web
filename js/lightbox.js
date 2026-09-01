// ============================================================
//  VISOR DE FOTOS (zoom, gestos, codigo de barras)
// ============================================================

let lightboxState = { images: [], index: 0, scale: 1 };

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
  lightboxState.images = getProductImages(p);
  lightboxState.index = imgIndex;
  updateLightbox();
  document.getElementById('lightbox').classList.add('open');
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
}

function lightboxNav(delta, evt) {
  if (evt) evt.stopPropagation();
  const n = lightboxState.images.length;
  lightboxState.index = (lightboxState.index + delta + n) % n;
  updateLightbox();
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
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
