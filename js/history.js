// ============================================================
//  HISTORIAL DE PEDIDOS
// ============================================================
//  Se guarda solo en el navegador del cliente. El catalogo no tiene
//  backend: aca no hay registro central de lo que piden.
// ============================================================

function saveOrderToHistory(name, phone, items) {
  try {
    const history = JSON.parse(localStorage.getItem('impohogar_order_history') || '[]');
    history.unshift({
      date: new Date().toISOString(),
      name,
      phone,
      items,
      totalUnits: items.reduce((sum, it) => sum + it.qty, 0)
    });
    localStorage.setItem('impohogar_order_history', JSON.stringify(history.slice(0, ORDER_HISTORY_LIMIT)));
  } catch (err) { /* si no hay localStorage disponible, simplemente no se guarda */ }
}

function getOrderHistory() {
  try {
    return JSON.parse(localStorage.getItem('impohogar_order_history') || '[]');
  } catch (err) {
    return [];
  }
}

function openOrderHistory() {
  renderOrderHistory();
  document.getElementById('historyModal').classList.add('open');
}

function closeOrderHistory() {
  document.getElementById('historyModal').classList.remove('open');
}

function formatHistoryDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
}

function renderOrderHistory() {
  const list = document.getElementById('historyList');
  const history = getOrderHistory();
  if (history.length === 0) {
    list.innerHTML = '<div class="order-empty">Todavía no has generado ningún pedido.<br>Cuando generes uno, va a quedar guardado aquí.</div>';
    return;
  }
  list.innerHTML = history.map((order, idx) => {
    const itemsHtml = order.items.map(it =>
      `<div style="font-size:11.5px;color:var(--text);padding:2px 0;">• ${it.qty} × ${escapeHtml(it.name)}</div>`
    ).join('');
    return `
      <div class="order-item" style="flex-direction:column;align-items:stretch;gap:6px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div class="oi-name">${escapeHtml(order.name || 'Sin nombre')}</div>
            <div class="oi-code">${escapeHtml(order.phone || '')} &nbsp;|&nbsp; ${formatHistoryDate(order.date)}</div>
          </div>
          <button type="button" class="oi-remove" style="color:var(--navy);font-weight:700;" onclick="repeatOrder(${idx})">Pedir de nuevo</button>
        </div>
        <div style="font-size:11px;color:var(--muted);">${order.items.length} productos · ${order.totalUnits} unidades</div>
        <div>${itemsHtml}</div>
      </div>`;
  }).join('');
}

function repeatOrder(idx) {
  const history = getOrderHistory();
  const order = history[idx];
  if (!order) return;
  order.items.forEach(it => {
    const product = PRODUCTS.find(p => p.code === it.code);
    if (product) setQty(product.id, it.qty);
  });
  closeOrderHistory();
  openOrderReview();
}
