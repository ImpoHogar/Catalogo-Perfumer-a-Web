// ============================================================
//  CARRITO
// ============================================================
//  Cantidades, guardado en el navegador del cliente y panel de
//  revision del pedido.
// ============================================================

const qtyMap = {};

function setQty(id, val) {
  const v = Math.max(0, parseInt(val) || 0);
  const input = document.getElementById(`qty-${id}`);
  if (input) input.value = v;
  const card = document.getElementById(`card-${id}`);
  if (v > 0) { qtyMap[id] = v; if (card) card.classList.add('has-qty'); }
  else { delete qtyMap[id]; if (card) card.classList.remove('has-qty'); }
  saveCartToStorage();
  updateOrderBar();
}

function changeQty(id, delta) {
  const input = document.getElementById(`qty-${id}`);
  const newVal = Math.max(0, (parseInt(input.value)||0) + delta);
  setQty(id, newVal);
}

function saveCartToStorage() {
  try {
    localStorage.setItem('impohogar_cart', JSON.stringify(qtyMap));
  } catch (err) { /* localStorage no disponible, seguimos sin guardar */ }
}

function restoreCartFromStorage() {
  try {
    const saved = localStorage.getItem('impohogar_cart');
    if (!saved) return;
    const savedMap = JSON.parse(saved);
    Object.keys(savedMap).forEach(id => {
      if (PRODUCTS_BY_ID[id]) setQty(Number(id), savedMap[id]);
    });
  } catch (err) { /* si algo esta corrupto, simplemente no restauramos */ }
}

function clearCart() {
  Object.keys(qtyMap).forEach(id => setQty(Number(id), 0));
  try { localStorage.removeItem('impohogar_cart'); } catch (err) {}
}

function updateOrderBar() {
  const ids = Object.keys(qtyMap);
  const units = ids.reduce((sum, id) => sum + qtyMap[id], 0);
  document.getElementById('selCount').textContent = ids.length;
  document.getElementById('selUnits').textContent = units;
  document.getElementById('genBtn').disabled = ids.length === 0;

  const badge = document.getElementById('reviewBadge');
  if (units > 0) {
    badge.textContent = units;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
  if (document.getElementById('orderModal').classList.contains('open')) {
    renderOrderReview();
  }
}

function openOrderReview() {
  renderOrderReview();
  document.getElementById('orderModal').classList.add('open');
}

function closeOrderReview() {
  document.getElementById('orderModal').classList.remove('open');
}

function renderOrderReview() {
  const list = document.getElementById('orderList');
  const ids = Object.keys(qtyMap);
  if (ids.length === 0) {
    list.innerHTML = '<div class="order-empty">Todavía no has agregado productos.<br>Escribe la cantidad que deseas en cualquier artículo del catálogo.</div>';
  } else {
    list.innerHTML = ids.map(id => {
      const p = PRODUCTS_BY_ID[id];
      const imgSrc = p.img ? `img/p${p.id}.webp?v=${IMG_VERSION}` : placeholderImg(p.brand);
      return `
        <div class="order-item">
          <img src="${imgSrc}" alt="${escapeHtml(p.name)}">
          <div class="oi-info">
            <div class="oi-name">${escapeHtml(p.name)}</div>
            <div class="oi-code">${escapeHtml(p.code)}</div>
          </div>
          <div class="oi-qty">
            <button type="button" onclick="changeQty(${p.id},-1)">−</button>
            <input type="number" min="0" inputmode="numeric" pattern="[0-9]*" value="${qtyMap[id]}" onchange="setQty(${p.id}, this.value)" onfocus="this.select()" class="oi-qty-input">
            <button type="button" onclick="changeQty(${p.id},1)">+</button>
          </div>
          <button type="button" class="oi-remove" onclick="setQty(${p.id},0)">Quitar</button>
        </div>`;
    }).join('');
  }
  const units = ids.reduce((sum, id) => sum + qtyMap[id], 0);
  document.getElementById('orderModalCount').textContent = ids.length;
  document.getElementById('orderModalUnits').textContent = units;
}
