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
      `<div class="history-line"><b>${it.qty}×</b><span>${escapeHtml(it.name)}</span></div>`
    ).join('');
    return `
      <div class="history-item">
        <div class="history-top">
          <div>
            <div class="history-name">${escapeHtml(order.name || 'Sin nombre')}</div>
            <div class="history-meta">${escapeHtml(order.phone || '')} &nbsp;·&nbsp; ${formatHistoryDate(order.date)}</div>
          </div>
          <button type="button" class="history-repeat" onclick="repeatOrder(${idx})">Pedir de nuevo</button>
        </div>
        <div class="history-count">${order.items.length} productos · ${order.totalUnits} unidades</div>
        <div class="history-lines">${itemsHtml}</div>
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