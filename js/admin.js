// ============================================================
//  PANEL ADMINISTRATIVO (oculto)
// ============================================================
//  Se activa haciendo 5 clics seguidos sobre el logo del encabezado
//  (en menos de 3 segundos). Pide iniciar sesion con la cuenta de
//  administrador (Supabase Auth). Con sesion iniciada, permite
//  ver/agregar/editar/eliminar productos y clientes, y ver/cruzar/
//  exportar los pedidos generados (reemplaza a reportes_pedidos.html,
//  que ya no hace falta como herramienta aparte). Nunca visible ni
//  accesible para un cliente que no conozca el gesto y tenga la
//  contraseña.
// ============================================================

const ADMIN_SESSION_KEY = 'impohogar_admin_session';

let adminSession = null; // { access_token, expires_at }
let adminTab = 'productos';
let adminEditingId = null; // id de producto o codigo de cliente en edicion (null = ninguno)

// ---------- Gesto secreto: 5 clics en el logo en 3 segundos ----------
(function setupAdminTrigger() {
  let clicks = 0;
  let timer = null;
  document.addEventListener('DOMContentLoaded', () => {
    const logo = document.getElementById('headerLogo');
    if (!logo) return;
    logo.addEventListener('click', (e) => {
      clicks++;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { clicks = 0; }, 3000);
      if (clicks >= 5) {
        clicks = 0;
        clearTimeout(timer);
        e.preventDefault();
        openAdminEntry();
      }
    });
  });
})();

function openAdminEntry() {
  restoreAdminSession();
  if (adminSession) {
    openAdminPanel();
  } else {
    openAdminLogin();
  }
}

// ---------- Sesion (sessionStorage: se pierde al cerrar la pestaña) ----------
function restoreAdminSession() {
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.access_token && parsed.expires_at > Date.now()) {
      adminSession = parsed;
    } else {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    }
  } catch (err) {}
}

function saveAdminSession(session) {
  adminSession = session;
  try {
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  } catch (err) {}
}

function clearAdminSession() {
  adminSession = null;
  try { sessionStorage.removeItem(ADMIN_SESSION_KEY); } catch (err) {}
}

// ---------- Login ----------
function openAdminLogin() {
  document.getElementById('adminLoginError').textContent = '';
  document.getElementById('adminLoginEmail').value = '';
  document.getElementById('adminLoginPassword').value = '';
  document.getElementById('adminLoginModal').classList.add('open');
}

function closeAdminLogin() {
  document.getElementById('adminLoginModal').classList.remove('open');
}

async function submitAdminLogin() {
  const email = document.getElementById('adminLoginEmail').value.trim();
  const password = document.getElementById('adminLoginPassword').value;
  const errEl = document.getElementById('adminLoginError');
  errEl.textContent = '';
  if (!email || !password) {
    errEl.textContent = 'Completa correo y contraseña.';
    return;
  }
  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await resp.json();
    if (!resp.ok || !data.access_token) {
      errEl.textContent = 'Correo o contraseña incorrectos.';
      return;
    }
    saveAdminSession({
      access_token: data.access_token,
      expires_at: Date.now() + ((data.expires_in || 3600) * 1000) - 30000,
      email
    });
    closeAdminLogin();
    openAdminPanel();
  } catch (err) {
    errEl.textContent = 'No se pudo conectar. Revisa tu internet.';
  }
}

function adminLogout() {
  clearAdminSession();
  closeAdminPanel();
}

// ---------- Llamadas autenticadas a Supabase ----------
async function adminFetch(path, options = {}) {
  if (!adminSession || adminSession.expires_at <= Date.now()) {
    clearAdminSession();
    closeAdminPanel();
    openAdminLogin();
    throw new Error('Sesión expirada');
  }
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${adminSession.access_token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (resp.status === 401) {
    clearAdminSession();
    closeAdminPanel();
    openAdminLogin();
    throw new Error('Sesión expirada');
  }
  return resp;
}

// ---------- Historial de cambios (auditoria_admin) ----------
// Se llama despues de cada accion que modifica algo (crear/editar/
// eliminar producto o cliente, vincular pedido, guardar ajustes).
// Nunca bloquea ni muestra error si falla: el historial es un extra,
// no una condicion para que la accion principal funcione.
async function logAdminAction(accion, entidad, entidadId, detalle) {
  try {
    await adminFetch('auditoria_admin', {
      method: 'POST',
      body: JSON.stringify([{
        admin_email: (adminSession && adminSession.email) || null,
        accion,
        entidad,
        entidad_id: entidadId != null ? String(entidadId) : null,
        detalle: detalle || null
      }])
    });
  } catch (err) {
    // silencioso a proposito
  }
}

// ---------- Panel principal ----------
function openAdminPanel() {
  adminEditingId = null;
  document.getElementById('adminPanelModal').classList.add('open');
  switchAdminTab('productos');
}

function closeAdminPanel() {
  document.getElementById('adminPanelModal').classList.remove('open');
}

function switchAdminTab(tab) {
  adminTab = tab;
  adminEditingId = null;
  document.getElementById('adminTabProductos').classList.toggle('active', tab === 'productos');
  document.getElementById('adminTabClientes').classList.toggle('active', tab === 'clientes');
  document.getElementById('adminTabPedidos').classList.toggle('active', tab === 'pedidos');
  document.getElementById('adminTabAjustes').classList.toggle('active', tab === 'ajustes');
  document.getElementById('adminTabHistorial').classList.toggle('active', tab === 'historial');
  document.getElementById('adminSearchInput').value = '';
  document.getElementById('adminSearchInput').style.display = tab === 'ajustes' ? 'none' : '';
  document.getElementById('adminAddBtn').style.display = (tab === 'pedidos' || tab === 'ajustes' || tab === 'historial') ? 'none' : '';
  document.getElementById('adminPedidosFilters').style.display = tab === 'pedidos' ? 'flex' : 'none';
  document.getElementById('adminPedidosSummary').style.display = tab === 'pedidos' ? 'grid' : 'none';
  document.getElementById('adminPedidosLoadMoreWrap').style.display = 'none';
  if (tab === 'productos') document.getElementById('adminSearchInput').placeholder = 'Buscar por código, nombre o marca...';
  else if (tab === 'clientes') document.getElementById('adminSearchInput').placeholder = 'Buscar por código, nombre o teléfono...';
  else if (tab === 'pedidos') document.getElementById('adminSearchInput').placeholder = 'Buscar cliente por nombre o teléfono...';
  else if (tab === 'historial') document.getElementById('adminSearchInput').placeholder = 'Buscar por acción, entidad o correo...';
  document.getElementById('adminMsg').textContent = '';
  document.getElementById('adminListBody').innerHTML = '';
  if (tab === 'productos') loadProductosAdmin('');
  else if (tab === 'clientes') loadClientesAdmin('');
  else if (tab === 'pedidos') loadPedidosAdmin(true);
  else if (tab === 'ajustes') loadAjustesAdmin();
  else loadHistorialAdmin(true);
}

function adminSetMsg(text, kind) {
  const el = document.getElementById('adminMsg');
  el.textContent = text || '';
  el.className = 'admin-msg' + (kind === 'error' ? ' is-error' : kind === 'ok' ? ' is-ok' : '');
}

let adminSearchDebounce = null;
function onAdminSearch() {
  if (adminSearchDebounce) clearTimeout(adminSearchDebounce);
  adminSearchDebounce = setTimeout(() => {
    const term = document.getElementById('adminSearchInput').value.trim();
    if (adminTab === 'productos') loadProductosAdmin(term);
    else if (adminTab === 'clientes') loadClientesAdmin(term);
    else if (adminTab === 'pedidos') loadPedidosAdmin(true);
    else if (adminTab === 'historial') loadHistorialAdmin(true);
  }, (adminTab === 'pedidos' || adminTab === 'historial') ? 350 : 0);
}

// ============================================================
//  PRODUCTOS
// ============================================================

async function loadProductosAdmin(term) {
  adminSetMsg('Cargando...');
  document.getElementById('adminListBody').innerHTML = '';
  try {
    let url = 'productos?select=id,code,brand,name,tipo,genero,img,hidden,stock&order=id.desc&limit=60';
    if (term) {
      const t = term.replace(/[,()]/g, '');
      url = `productos?select=id,code,brand,name,tipo,genero,img,hidden,stock&or=(code.ilike.*${t}*,name.ilike.*${t}*,brand.ilike.*${t}*)&order=id.asc&limit=60`;
    }
    const resp = await adminFetch(url);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const rows = await resp.json();
    renderProductosAdmin(rows);
    adminSetMsg(term ? `${rows.length} resultado(s)` : `Últimos ${rows.length} productos agregados (busca para ver otros)`);
  } catch (err) {
    adminSetMsg('Error al cargar productos: ' + err.message, 'error');
  }
}

function renderProductosAdmin(rows) {
  const body = document.getElementById('adminListBody');
  if (!rows.length) {
    body.innerHTML = '<p class="admin-msg">Sin resultados.</p>';
    return;
  }
  body.innerHTML = rows.map(p => `
    <div class="admin-list">
      <div class="admin-row" data-prod-row="${p.id}" onclick="toggleAdminProductEdit(${p.id})">
        <div class="admin-row-main">
          <div class="admin-row-title">${escapeAdminHtml(p.brand)} — ${escapeAdminHtml(p.name)}</div>
          <div class="admin-row-sub">Código ${escapeAdminHtml(p.code)} · ${escapeAdminHtml(p.tipo || '')} · Stock ${p.stock}</div>
        </div>
        <span class="admin-pill ${p.img && !p.hidden ? 'admin-pill-ok' : 'admin-pill-off'}">${p.img && !p.hidden ? 'Visible' : (p.hidden ? 'Oculto' : 'Sin foto')}</span>
      </div>
      <div id="adminEditWrap-p${p.id}"></div>
    </div>
  `).join('');
}

function escapeAdminHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function toggleAdminProductEdit(id) {
  const wrap = document.getElementById(`adminEditWrap-p${id}`);
  if (!wrap) return;
  if (adminEditingId === id) {
    wrap.innerHTML = '';
    adminEditingId = null;
    return;
  }
  document.querySelectorAll('[id^="adminEditWrap-p"]').forEach(w => w.innerHTML = '');
  adminEditingId = id;
  wrap.innerHTML = '<p class="admin-msg">Cargando...</p>';
  try {
    const resp = await adminFetch(`productos?id=eq.${id}&select=*`);
    const rows = await resp.json();
    const p = rows[0];
    if (!p) { wrap.innerHTML = '<p class="admin-msg is-error">No encontrado.</p>'; return; }
    wrap.innerHTML = productEditFormHtml(p);
  } catch (err) {
    wrap.innerHTML = `<p class="admin-msg is-error">Error: ${err.message}</p>`;
  }
}

function productEditFormHtml(p) {
  const notesStr = Array.isArray(p.notes) ? p.notes.join(', ') : '';
  return `
    <div class="admin-edit-panel">
      <div class="admin-edit-grid">
        <div>
          <label class="field-label">Marca</label>
          <input class="field-input" id="pf_brand" value="${escapeAdminHtml(p.brand)}">
        </div>
        <div>
          <label class="field-label">Nombre</label>
          <input class="field-input" id="pf_name" value="${escapeAdminHtml(p.name)}">
        </div>
        <div>
          <label class="field-label">Código de barras</label>
          <input class="field-input" id="pf_code" value="${escapeAdminHtml(p.code)}">
        </div>
        <div>
          <label class="field-label">Stock</label>
          <input class="field-input" id="pf_stock" type="number" value="${p.stock}">
        </div>
        <div>
          <label class="field-label">Tipo</label>
          <input class="field-input" id="pf_tipo" value="${escapeAdminHtml(p.tipo || '')}" placeholder="Perfume, Estuche, Splash/Bodymist...">
        </div>
        <div>
          <label class="field-label">Género</label>
          <input class="field-input" id="pf_genero" value="${escapeAdminHtml(p.genero || '')}" placeholder="Hombre, Mujer, Niños, Unisex, Mascota">
        </div>
        <div class="field-full">
          <label class="field-label">Notas olfativas (separadas por coma)</label>
          <input class="field-input" id="pf_notes" value="${escapeAdminHtml(notesStr)}">
        </div>
      </div>
      <div class="admin-checkbox-row">
        <input type="checkbox" id="pf_img" ${p.img ? 'checked' : ''}>
        <label for="pf_img">Tiene foto subida (img/p${p.id}.webp)</label>
      </div>
      <div class="admin-checkbox-row">
        <input type="checkbox" id="pf_hidden" ${p.hidden ? 'checked' : ''}>
        <label for="pf_hidden">Ocultar del catálogo público</label>
      </div>
      <div class="admin-edit-actions">
        <button type="button" class="btn btn-danger" onclick="deleteAdminProducto(${p.id})">Eliminar producto</button>
        <div style="display:flex; gap:10px;">
          <button type="button" class="btn btn-ghost" onclick="toggleAdminProductEdit(${p.id})">Cancelar</button>
          <button type="button" class="btn btn-primary" onclick="saveAdminProducto(${p.id})">Guardar cambios</button>
        </div>
      </div>
    </div>
  `;
}

async function saveAdminProducto(id) {
  const payload = {
    brand: document.getElementById('pf_brand').value.trim(),
    name: document.getElementById('pf_name').value.trim(),
    code: document.getElementById('pf_code').value.trim(),
    stock: parseInt(document.getElementById('pf_stock').value) || 0,
    tipo: document.getElementById('pf_tipo').value.trim() || null,
    genero: document.getElementById('pf_genero').value.trim() || null,
    notes: document.getElementById('pf_notes').value.split(',').map(s => s.trim()).filter(Boolean),
    img: document.getElementById('pf_img').checked,
    hidden: document.getElementById('pf_hidden').checked,
    updated_at: new Date().toISOString()
  };
  if (!payload.brand || !payload.name || !payload.code) {
    adminSetMsg('Marca, nombre y código son obligatorios.', 'error');
    return;
  }
  try {
    const resp = await adminFetch(`productos?id=eq.${id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const rows = await resp.json();
    applyProductChangeToLiveCatalog(rows[0]);
    logAdminAction('editar', 'producto', id, { brand: payload.brand, name: payload.name, code: payload.code });
    adminSetMsg('Producto actualizado.', 'ok');
    toggleAdminProductEdit(id);
    loadProductosAdmin(document.getElementById('adminSearchInput').value.trim());
  } catch (err) {
    adminSetMsg('Error al guardar: ' + err.message, 'error');
  }
}

async function deleteAdminProducto(id) {
  if (!confirm('¿Eliminar este producto definitivamente? Esta acción no se puede deshacer.')) return;
  try {
    const resp = await adminFetch(`productos?id=eq.${id}`, { method: 'DELETE' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    applyProductChangeToLiveCatalog({ id }, true);
    logAdminAction('eliminar', 'producto', id, null);
    adminSetMsg('Producto eliminado.', 'ok');
    loadProductosAdmin(document.getElementById('adminSearchInput').value.trim());
  } catch (err) {
    adminSetMsg('Error al eliminar: ' + err.message, 'error');
  }
}

function openAdminNewProduct() {
  document.querySelectorAll('[id^="adminEditWrap-p"]').forEach(w => w.innerHTML = '');
  const body = document.getElementById('adminListBody');
  const holder = document.createElement('div');
  holder.innerHTML = `
    <div class="admin-edit-panel">
      <p class="admin-msg">El código de barras y stock son obligatorios. La foto se sube aparte, a mano, al repositorio (img/p&lt;id&gt;.webp) — marca "Tiene foto subida" cuando ya la hayas subido.</p>
      <div class="admin-edit-grid">
        <div><label class="field-label">Marca</label><input class="field-input" id="pfn_brand"></div>
        <div><label class="field-label">Nombre</label><input class="field-input" id="pfn_name"></div>
        <div><label class="field-label">Código de barras</label><input class="field-input" id="pfn_code"></div>
        <div><label class="field-label">Stock</label><input class="field-input" id="pfn_stock" type="number" value="0"></div>
        <div><label class="field-label">Tipo</label><input class="field-input" id="pfn_tipo" placeholder="Perfume, Estuche..."></div>
        <div><label class="field-label">Género</label><input class="field-input" id="pfn_genero" placeholder="Hombre, Mujer, Niños..."></div>
        <div class="field-full"><label class="field-label">Notas olfativas (separadas por coma)</label><input class="field-input" id="pfn_notes"></div>
      </div>
      <div class="admin-checkbox-row"><input type="checkbox" id="pfn_img"><label for="pfn_img">Ya tengo la foto subida</label></div>
      <div class="admin-edit-actions">
        <span></span>
        <div style="display:flex; gap:10px;">
          <button type="button" class="btn btn-ghost" onclick="this.closest('.admin-edit-panel').remove()">Cancelar</button>
          <button type="button" class="btn btn-primary" onclick="saveAdminNewProduct()">Crear producto</button>
        </div>
      </div>
    </div>
  `;
  body.prepend(holder.firstElementChild);
}

async function saveAdminNewProduct() {
  const brand = document.getElementById('pfn_brand').value.trim();
  const name = document.getElementById('pfn_name').value.trim();
  const code = document.getElementById('pfn_code').value.trim();
  const stock = parseInt(document.getElementById('pfn_stock').value) || 0;
  if (!brand || !name || !code) {
    adminSetMsg('Marca, nombre y código son obligatorios.', 'error');
    return;
  }
  try {
    const maxResp = await adminFetch('productos?select=id&order=id.desc&limit=1');
    const maxRows = await maxResp.json();
    const nextId = maxRows.length ? maxRows[0].id + 1 : 0;
    const payload = {
      id: nextId,
      brand, name, code, stock,
      tipo: document.getElementById('pfn_tipo').value.trim() || null,
      genero: document.getElementById('pfn_genero').value.trim() || null,
      notes: document.getElementById('pfn_notes').value.split(',').map(s => s.trim()).filter(Boolean),
      img: document.getElementById('pfn_img').checked,
      hidden: false,
      date_added: new Date().toISOString().slice(0, 10)
    };
    const resp = await adminFetch('productos', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify([payload])
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const rows = await resp.json();
    applyProductChangeToLiveCatalog(rows[0]);
    logAdminAction('crear', 'producto', nextId, { brand, name, code });
    adminSetMsg(`Producto creado con id ${nextId}. Recuerda subir la foto como img/p${nextId}.webp.`, 'ok');
    loadProductosAdmin('');
  } catch (err) {
    adminSetMsg('Error al crear: ' + err.message, 'error');
  }
}

// Refleja el cambio en el catalogo ya cargado en esta misma pestaña,
// sin tener que recargar la pagina.
function applyProductChangeToLiveCatalog(row, isDelete) {
  if (typeof window.PRODUCTS === 'undefined' || !Array.isArray(window.PRODUCTS)) return;
  if (isDelete) {
    window.PRODUCTS = window.PRODUCTS.filter(p => p.id !== row.id);
  } else {
    const mapped = {
      id: row.id, brand: row.brand, code: row.code, name: row.name,
      tipo: row.tipo, genero: row.genero, img: !!row.img,
      notes: row.notes || [], notesSource: row.notes_source || undefined,
      dateAdded: row.date_added || undefined, hidden: !!row.hidden, stock: row.stock
    };
    const idx = window.PRODUCTS.findIndex(p => p.id === row.id);
    if (idx >= 0) window.PRODUCTS[idx] = mapped;
    else window.PRODUCTS.push(mapped);
    window.STOCK[mapped.code] = parseInt(mapped.stock) || 0;
  }
  if (typeof buildDerivedData === 'function') buildDerivedData();
  if (typeof applyFilters === 'function') applyFilters();
}

// ============================================================
//  CLIENTES
// ============================================================

async function loadClientesAdmin(term) {
  adminSetMsg('Cargando...');
  document.getElementById('adminListBody').innerHTML = '';
  try {
    let url = 'clientes?select=codigo,nombre,tel1,tel2,tel3&order=nombre.asc&limit=60';
    if (term) {
      const t = term.replace(/[,()]/g, '');
      url = `clientes?select=codigo,nombre,tel1,tel2,tel3&or=(codigo.ilike.*${t}*,nombre.ilike.*${t}*,tel1.ilike.*${t}*,tel2.ilike.*${t}*,tel3.ilike.*${t}*)&order=nombre.asc&limit=60`;
    }
    const resp = await adminFetch(url);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const rows = await resp.json();
    renderClientesAdmin(rows);
    adminSetMsg(`${rows.length} resultado(s)`);
  } catch (err) {
    adminSetMsg('Error al cargar clientes: ' + err.message, 'error');
  }
}

function renderClientesAdmin(rows) {
  const body = document.getElementById('adminListBody');
  if (!rows.length) {
    body.innerHTML = '<p class="admin-msg">Sin resultados.</p>';
    return;
  }
  body.innerHTML = rows.map(c => `
    <div class="admin-list">
      <div class="admin-row" onclick="toggleAdminClientEdit('${escapeAdminHtml(c.codigo)}')">
        <div class="admin-row-main">
          <div class="admin-row-title">${escapeAdminHtml(c.nombre)}</div>
          <div class="admin-row-sub">Código ${escapeAdminHtml(c.codigo)} · ${escapeAdminHtml(c.tel1 || 'sin teléfono')}</div>
        </div>
      </div>
      <div id="adminEditWrap-c${cssEscapeCode(c.codigo)}"></div>
    </div>
  `).join('');
}

function cssEscapeCode(codigo) {
  return String(codigo).replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function toggleAdminClientEdit(codigo) {
  const key = cssEscapeCode(codigo);
  const wrap = document.getElementById(`adminEditWrap-c${key}`);
  if (!wrap) return;
  if (adminEditingId === codigo) {
    wrap.innerHTML = '';
    adminEditingId = null;
    return;
  }
  document.querySelectorAll('[id^="adminEditWrap-c"]').forEach(w => w.innerHTML = '');
  adminEditingId = codigo;
  wrap.innerHTML = '<p class="admin-msg">Cargando...</p>';
  try {
    const resp = await adminFetch(`clientes?codigo=eq.${encodeURIComponent(codigo)}&select=*`);
    const rows = await resp.json();
    const c = rows[0];
    if (!c) { wrap.innerHTML = '<p class="admin-msg is-error">No encontrado.</p>'; return; }
    wrap.innerHTML = clientEditFormHtml(c);
  } catch (err) {
    wrap.innerHTML = `<p class="admin-msg is-error">Error: ${err.message}</p>`;
  }
}

function clientEditFormHtml(c) {
  return `
    <div class="admin-edit-panel">
      <div class="admin-edit-grid">
        <div class="field-full">
          <label class="field-label">Código (no editable, es el código del sistema interno)</label>
          <input class="field-input" value="${escapeAdminHtml(c.codigo)}" disabled>
        </div>
        <div class="field-full">
          <label class="field-label">Nombre</label>
          <input class="field-input" id="cf_nombre" value="${escapeAdminHtml(c.nombre)}">
        </div>
        <div><label class="field-label">Teléfono 1</label><input class="field-input" id="cf_tel1" value="${escapeAdminHtml(c.tel1 || '')}"></div>
        <div><label class="field-label">Teléfono 2</label><input class="field-input" id="cf_tel2" value="${escapeAdminHtml(c.tel2 || '')}"></div>
        <div><label class="field-label">Teléfono 3</label><input class="field-input" id="cf_tel3" value="${escapeAdminHtml(c.tel3 || '')}"></div>
      </div>
      <div class="admin-edit-actions">
        <button type="button" class="btn btn-danger" onclick="deleteAdminCliente('${escapeAdminHtml(c.codigo)}')">Eliminar cliente</button>
        <div style="display:flex; gap:10px;">
          <button type="button" class="btn btn-ghost" onclick="toggleAdminClientEdit('${escapeAdminHtml(c.codigo)}')">Cancelar</button>
          <button type="button" class="btn btn-primary" onclick="saveAdminCliente('${escapeAdminHtml(c.codigo)}')">Guardar cambios</button>
        </div>
      </div>
    </div>
  `;
}

async function saveAdminCliente(codigo) {
  const payload = {
    nombre: document.getElementById('cf_nombre').value.trim(),
    tel1: document.getElementById('cf_tel1').value.trim() || null,
    tel2: document.getElementById('cf_tel2').value.trim() || null,
    tel3: document.getElementById('cf_tel3').value.trim() || null
  };
  if (!payload.nombre) {
    adminSetMsg('El nombre es obligatorio.', 'error');
    return;
  }
  try {
    const resp = await adminFetch(`clientes?codigo=eq.${encodeURIComponent(codigo)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    logAdminAction('editar', 'cliente', codigo, { nombre: payload.nombre });
    adminSetMsg('Cliente actualizado.', 'ok');
    toggleAdminClientEdit(codigo);
    loadClientesAdmin(document.getElementById('adminSearchInput').value.trim());
  } catch (err) {
    adminSetMsg('Error al guardar: ' + err.message, 'error');
  }
}

async function deleteAdminCliente(codigo) {
  if (!confirm('¿Eliminar este cliente definitivamente? Esta acción no se puede deshacer.')) return;
  try {
    const resp = await adminFetch(`clientes?codigo=eq.${encodeURIComponent(codigo)}`, { method: 'DELETE' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    logAdminAction('eliminar', 'cliente', codigo, null);
    adminSetMsg('Cliente eliminado.', 'ok');
    loadClientesAdmin(document.getElementById('adminSearchInput').value.trim());
  } catch (err) {
    adminSetMsg('Error al eliminar: ' + err.message, 'error');
  }
}

function openAdminNewClient() {
  document.querySelectorAll('[id^="adminEditWrap-c"]').forEach(w => w.innerHTML = '');
  const body = document.getElementById('adminListBody');
  const holder = document.createElement('div');
  holder.innerHTML = `
    <div class="admin-edit-panel">
      <p class="admin-msg">Si ya conoces el código de este cliente en el sistema interno, escríbelo. Si no, déjalo en blanco y se genera uno provisional (se puede corregir después desde Supabase cuando tengas el código real).</p>
      <div class="admin-edit-grid">
        <div><label class="field-label">Código (opcional)</label><input class="field-input" id="cfn_codigo" placeholder="Se genera automático si se deja vacío"></div>
        <div><label class="field-label">Nombre</label><input class="field-input" id="cfn_nombre"></div>
        <div><label class="field-label">Teléfono 1</label><input class="field-input" id="cfn_tel1"></div>
        <div><label class="field-label">Teléfono 2</label><input class="field-input" id="cfn_tel2"></div>
        <div><label class="field-label">Teléfono 3</label><input class="field-input" id="cfn_tel3"></div>
      </div>
      <div class="admin-edit-actions">
        <span></span>
        <div style="display:flex; gap:10px;">
          <button type="button" class="btn btn-ghost" onclick="this.closest('.admin-edit-panel').remove()">Cancelar</button>
          <button type="button" class="btn btn-primary" onclick="saveAdminNewClient()">Crear cliente</button>
        </div>
      </div>
    </div>
  `;
  body.prepend(holder.firstElementChild);
}

async function saveAdminNewClient() {
  const nombre = document.getElementById('cfn_nombre').value.trim();
  let codigo = document.getElementById('cfn_codigo').value.trim();
  if (!nombre) {
    adminSetMsg('El nombre es obligatorio.', 'error');
    return;
  }
  if (!codigo) {
    codigo = 'MANUAL-' + Date.now().toString().slice(-8);
  }
  const payload = {
    codigo, nombre,
    tel1: document.getElementById('cfn_tel1').value.trim() || null,
    tel2: document.getElementById('cfn_tel2').value.trim() || null,
    tel3: document.getElementById('cfn_tel3').value.trim() || null
  };
  try {
    const resp = await adminFetch('clientes', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify([payload])
    });
    if (!resp.ok) {
      if (resp.status === 409) throw new Error('Ese código ya existe.');
      throw new Error('HTTP ' + resp.status);
    }
    logAdminAction('crear', 'cliente', codigo, { nombre });
    adminSetMsg(`Cliente creado con código ${codigo}.`, 'ok');
    loadClientesAdmin('');
  } catch (err) {
    adminSetMsg('Error al crear: ' + err.message, 'error');
  }
}

// ============================================================
//  PEDIDOS (reemplaza a reportes_pedidos.html)
// ============================================================

const ADMIN_PEDIDOS_PAGE_SIZE = 50;
let adminPedidosOffset = 0;
let adminPedidosRows = [];
let adminClientesCache = [];
let adminClientesByCodigo = new Map();
let adminClientesCacheLoaded = false;

function normPhoneAdmin(s) { return (s || '').replace(/\D/g, ''); }
function normNameAdmin(s) { return (s || '').trim().toUpperCase().replace(/\s+/g, ' '); }

function fmtDateAdmin(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function loadAllClientesForMatching() {
  try {
    const resp = await adminFetch('clientes?select=codigo,nombre,tel1,tel2,tel3', {
      headers: { Range: '0-999' }
    });
    if (!resp.ok && resp.status !== 206) throw new Error('HTTP ' + resp.status);
    adminClientesCache = await resp.json();
    adminClientesByCodigo = new Map(adminClientesCache.map(c => [c.codigo, c]));
    adminClientesCacheLoaded = true;
    const list = document.getElementById('adminClientesDatalist');
    if (list) {
      list.innerHTML = adminClientesCache.map(c => `<option value="${escapeAdminHtml(c.nombre)} — #${escapeAdminHtml(c.codigo)}"></option>`).join('');
    }
  } catch (err) {
    adminClientesCache = [];
    adminClientesByCodigo = new Map();
  }
}

function matchClienteAdmin(p) {
  if (p.cliente_codigo && adminClientesByCodigo.has(p.cliente_codigo)) {
    return adminClientesByCodigo.get(p.cliente_codigo);
  }
  const phone = normPhoneAdmin(p.cliente_telefono);
  if (phone) {
    const byPhone = adminClientesCache.find(c =>
      normPhoneAdmin(c.tel1) === phone || normPhoneAdmin(c.tel2) === phone || normPhoneAdmin(c.tel3) === phone
    );
    if (byPhone) return byPhone;
  }
  const name = normNameAdmin(p.cliente_nombre);
  if (name) {
    const byName = adminClientesCache.find(c => normNameAdmin(c.nombre) === name);
    if (byName) return byName;
  }
  return null;
}

function onAdminPedidosFilterChange() {
  loadPedidosAdmin(true);
}

function clearAdminPedidosFilters() {
  document.getElementById('adminSearchInput').value = '';
  document.getElementById('adminPedidosFrom').value = '';
  document.getElementById('adminPedidosTo').value = '';
  document.getElementById('adminPedidosSoloSinVincular').checked = false;
  loadPedidosAdmin(true);
}

function buildPedidosUrl(offset) {
  const search = document.getElementById('adminSearchInput').value.trim();
  const from = document.getElementById('adminPedidosFrom').value;
  const to = document.getElementById('adminPedidosTo').value;
  let url = `pedidos?select=*&order=creado_en.desc&limit=${ADMIN_PEDIDOS_PAGE_SIZE}&offset=${offset}`;
  if (search) {
    const t = search.replace(/[,()]/g, '');
    url += `&or=(cliente_nombre.ilike.*${t}*,cliente_telefono.ilike.*${t}*)`;
  }
  if (from) url += `&creado_en=gte.${from}T00:00:00`;
  if (to) url += `&creado_en=lte.${to}T23:59:59`;
  return url;
}

async function loadPedidosAdmin(reset) {
  if (reset) {
    adminPedidosOffset = 0;
    adminPedidosRows = [];
    document.getElementById('adminListBody').innerHTML = '';
  }
  adminSetMsg('Cargando...');
  try {
    if (!adminClientesCacheLoaded) await loadAllClientesForMatching();
    const resp = await adminFetch(buildPedidosUrl(adminPedidosOffset));
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    adminPedidosRows = adminPedidosRows.concat(data);
    renderPedidosRows(reset);
    document.getElementById('adminPedidosLoadMoreWrap').style.display = data.length < ADMIN_PEDIDOS_PAGE_SIZE ? 'none' : 'block';
    adminPedidosOffset += data.length;
    renderPedidosSummary();
    adminSetMsg(adminPedidosRows.length ? `${adminPedidosRows.length} pedido(s) cargado(s)` : '');
  } catch (err) {
    adminSetMsg('Error al cargar pedidos: ' + err.message, 'error');
  }
}

function pedidoProductsPreview(items) {
  if (!items.length) return '<span style="color:var(--muted)">Sin detalle</span>';
  const preview = items.slice(0, 2).map(it => escapeAdminHtml(it.name || it.code || '')).join(', ');
  const restCount = items.length - 2;
  return `${preview}${restCount > 0 ? ` <span style="color:var(--gold)">+${restCount} más</span>` : ''}`;
}

function pedidoClientePill(p) {
  const match = matchClienteAdmin(p);
  if (match) {
    return `<span class="admin-pill admin-pill-ok">#${escapeAdminHtml(match.codigo)} · ${escapeAdminHtml(match.nombre)}</span>`;
  }
  return `<span class="admin-pill admin-pill-off">Sin vincular</span>`;
}

function renderPedidosRows(reset) {
  const body = document.getElementById('adminListBody');
  if (reset) body.innerHTML = '';
  const soloSinVincular = document.getElementById('adminPedidosSoloSinVincular').checked;
  const rows = adminPedidosRows.filter(p => !soloSinVincular || !matchClienteAdmin(p));
  if (!rows.length) {
    body.innerHTML = '<p class="admin-msg">Sin pedidos con estos filtros.</p>';
    return;
  }
  body.innerHTML = rows.map(p => {
    const items = Array.isArray(p.items) ? p.items : [];
    return `
    <div class="admin-list">
      <div class="admin-row" onclick="toggleAdminPedidoDetail('${p.id}')">
        <div class="admin-row-main">
          <div class="admin-row-title">${escapeAdminHtml(p.cliente_nombre)} <span style="color:var(--muted); font-weight:400;">· ${fmtDateAdmin(p.creado_en)}</span></div>
          <div class="admin-row-sub">${escapeAdminHtml(p.cliente_telefono || '')} · ${pedidoProductsPreview(items)} · ${p.total_unidades} uds</div>
        </div>
        ${pedidoClientePill(p)}
      </div>
      <div id="adminEditWrap-o${p.id}"></div>
    </div>
  `;
  }).join('');
}

function toggleAdminPedidoDetail(id) {
  const wrap = document.getElementById(`adminEditWrap-o${id}`);
  if (!wrap) return;
  if (adminEditingId === id) {
    wrap.innerHTML = '';
    adminEditingId = null;
    return;
  }
  document.querySelectorAll('[id^="adminEditWrap-o"]').forEach(w => w.innerHTML = '');
  adminEditingId = id;
  const p = adminPedidosRows.find(x => x.id === id);
  if (!p) return;
  const items = Array.isArray(p.items) ? p.items : [];
  const match = matchClienteAdmin(p);
  const itemsHtml = items.length
    ? items.map(it => `
        <div class="admin-pedido-item">
          <span>${escapeAdminHtml(it.brand || '')} — ${escapeAdminHtml(it.name || '')} <span style="color:var(--muted)">(${escapeAdminHtml(it.code || '')})</span></span>
          <b>${it.qty}</b>
        </div>`).join('')
    : '<span style="color:var(--muted)">Sin detalle de productos</span>';
  const linkHtml = match ? '' : `
    <div class="admin-link-form">
      <input type="text" class="field-input" id="adminVincularInput-${id}" list="adminClientesDatalist" placeholder="Buscar cliente real (nombre)...">
      <button type="button" class="btn btn-primary" onclick="vincularPedidoAdmin('${id}')">Vincular</button>
    </div>
  `;
  wrap.innerHTML = `<div class="admin-pedido-detail">${itemsHtml}${linkHtml}</div>`;
}

async function vincularPedidoAdmin(id) {
  const input = document.getElementById(`adminVincularInput-${id}`);
  const raw = input ? input.value : '';
  const m = /—\s*#(\S+)\s*$/.exec(raw);
  if (!m) {
    adminSetMsg('Elige un cliente de la lista (empieza a escribir el nombre).', 'error');
    return;
  }
  const codigo = m[1];
  try {
    const resp = await adminFetch(`pedidos?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ cliente_codigo: codigo })
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const p = adminPedidosRows.find(x => x.id === id);
    if (p) p.cliente_codigo = codigo;
    logAdminAction('vincular', 'pedido', id, { cliente_codigo: codigo });
    adminSetMsg('Pedido vinculado.', 'ok');
    toggleAdminPedidoDetail(id);
    renderPedidosRows(true);
    renderPedidosSummary();
  } catch (err) {
    adminSetMsg('Error al vincular: ' + err.message, 'error');
  }
}

function renderPedidosSummary() {
  const el = document.getElementById('adminPedidosSummary');
  const totalPedidos = adminPedidosRows.length;
  const totalUnidades = adminPedidosRows.reduce((s, p) => s + (p.total_unidades || 0), 0);
  const vinculados = adminPedidosRows.filter(p => matchClienteAdmin(p)).length;
  const sinVincular = totalPedidos - vinculados;
  el.innerHTML = `
    <div class="admin-stat"><div class="admin-stat-n">${totalPedidos}</div><div class="admin-stat-l">Pedidos cargados</div></div>
    <div class="admin-stat"><div class="admin-stat-n">${totalUnidades}</div><div class="admin-stat-l">Unidades pedidas</div></div>
    <div class="admin-stat"><div class="admin-stat-n">${vinculados}</div><div class="admin-stat-l">Cruzados con cliente real</div></div>
    <div class="admin-stat"><div class="admin-stat-n ${sinVincular ? 'is-warn' : ''}">${sinVincular}</div><div class="admin-stat-l">Sin vincular</div></div>
  `;
}

async function exportAdminPedidosExcel() {
  if (typeof ExcelJS === 'undefined') {
    adminSetMsg('Librería Excel no cargó, revisa tu conexión a internet.', 'error');
    return;
  }
  if (!adminPedidosRows.length) {
    adminSetMsg('No hay pedidos cargados para exportar.', 'error');
    return;
  }
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Pedidos');
  sheet.columns = [
    { header: 'Fecha', key: 'fecha', width: 20 },
    { header: 'Cliente (como se escribió)', key: 'clienteEscrito', width: 30 },
    { header: 'Teléfono', key: 'telefono', width: 16 },
    { header: 'Código cliente (sistema)', key: 'codigoCliente', width: 20 },
    { header: 'Cliente (sistema)', key: 'clienteSistema', width: 30 },
    { header: 'Código producto', key: 'codigo', width: 16 },
    { header: 'Producto', key: 'producto', width: 45 },
    { header: 'Marca', key: 'marca', width: 20 },
    { header: 'Cantidad', key: 'cantidad', width: 12 }
  ];
  sheet.getRow(1).font = { bold: true };
  adminPedidosRows.forEach(p => {
    const match = matchClienteAdmin(p);
    const items = Array.isArray(p.items) && p.items.length ? p.items : [{}];
    items.forEach(it => {
      sheet.addRow({
        fecha: fmtDateAdmin(p.creado_en),
        clienteEscrito: p.cliente_nombre,
        telefono: p.cliente_telefono,
        codigoCliente: match ? match.codigo : '',
        clienteSistema: match ? match.nombre : 'Sin vincular',
        codigo: it.code || '',
        producto: it.name || '',
        marca: it.brand || '',
        cantidad: it.qty || ''
      });
    });
  });
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Reporte_Pedidos_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================
//  AJUSTES (lotes de baja rotación / nuevos ingresos + marcas carrusel)
// ============================================================
//  Ambos viven en la tabla ajustes_catalogo (una fila con clave
//  "low_rotation" y otra con clave "marcas_carrusel"). Al guardar,
//  ademas de escribir en Supabase, se actualizan las variables
//  globales que ya usa el catalogo (LOW_ROTATION_START_DATE,
//  LOW_ROTATION_BATCHES, MARCAS_CARRUSEL -- declaradas con "let" en
//  config.js, por eso se reasignan por su nombre tal cual, sin
//  "window.") para que el cambio se vea al instante sin recargar.
// ============================================================

let adminAjustesLowRotation = null; // { start_date, batches: [[codigo,...], ...] }
let adminAjustesMarcas = null;      // [{ nombre, archivo }, ...]

async function loadAjustesAdmin() {
  adminSetMsg('Cargando...');
  document.getElementById('adminListBody').innerHTML = '';
  try {
    const resp = await adminFetch('ajustes_catalogo?select=clave,valor');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const rows = await resp.json();
    const lr = rows.find(r => r.clave === 'low_rotation');
    const mc = rows.find(r => r.clave === 'marcas_carrusel');
    adminAjustesLowRotation = (lr && lr.valor) ? lr.valor : { start_date: '', batches: [] };
    if (!Array.isArray(adminAjustesLowRotation.batches)) adminAjustesLowRotation.batches = [];
    adminAjustesMarcas = (mc && Array.isArray(mc.valor)) ? mc.valor : [];
    renderAjustesAdmin();
    adminSetMsg('');
  } catch (err) {
    adminSetMsg('Error al cargar ajustes: ' + err.message, 'error');
  }
}

function renderAjustesAdmin() {
  const body = document.getElementById('adminListBody');
  const lr = adminAjustesLowRotation;
  const batchesHtml = lr.batches.map((batch, i) => `
    <div class="admin-batch-row" data-batch-idx="${i}">
      <span class="admin-batch-n">Lote ${i + 1}</span>
      <input class="field-input" data-batch-codes value="${escapeAdminHtml(batch.join(', '))}" placeholder="Códigos de barras separados por coma">
      <button type="button" class="btn btn-ghost" onclick="removeAjusteBatchRow(${i})" title="Eliminar lote">✕</button>
    </div>
  `).join('');
  const marcasHtml = adminAjustesMarcas.map((m, i) => `
    <div class="admin-marca-row" data-marca-idx="${i}">
      <input class="field-input" data-marca-nombre value="${escapeAdminHtml(m.nombre || '')}" placeholder="Nombre de la marca">
      <input class="field-input" data-marca-archivo value="${escapeAdminHtml(m.archivo || '')}" placeholder="Archivo, ej: afnan.png">
      <button type="button" class="btn btn-ghost" onclick="removeAjusteMarcaRow(${i})" title="Eliminar marca">✕</button>
    </div>
  `).join('');
  body.innerHTML = `
    <div class="admin-ajustes-card">
      <h3 class="admin-ajustes-title">Baja rotación / Nuevos Ingresos</h3>
      <p class="admin-msg">Cada semana se muestra un lote distinto de estos productos en la vitrina de "Nuevos Ingresos", rotando en el orden en que aparecen aquí. Escribe los códigos de barras de cada lote separados por coma.</p>
      <div class="admin-edit-grid" style="margin-bottom:12px;">
        <div>
          <label class="field-label">Fecha de inicio de la rotación</label>
          <input class="field-input" id="ajLowRotationStart" type="date" value="${escapeAdminHtml(lr.start_date || '')}">
        </div>
      </div>
      <div id="ajBatchesWrap">${batchesHtml || '<p class="admin-msg">Sin lotes todavía.</p>'}</div>
      <div class="admin-edit-actions">
        <button type="button" class="btn btn-ghost" onclick="addAjusteBatchRow()">+ Agregar lote</button>
        <button type="button" class="btn btn-primary" onclick="saveAjustesLowRotation()">Guardar rotación</button>
      </div>
    </div>
    <div class="admin-ajustes-card">
      <h3 class="admin-ajustes-title">Marcas del carrusel</h3>
      <p class="admin-msg">El orden de esta lista es el orden en que aparecen en el carrusel de marcas. La imagen se sigue subiendo a mano al repositorio (img/marcas/) — aquí solo se indica el nombre del archivo, y debe coincidir exactamente.</p>
      <div id="ajMarcasWrap">${marcasHtml || '<p class="admin-msg">Sin marcas todavía.</p>'}</div>
      <div class="admin-edit-actions">
        <button type="button" class="btn btn-ghost" onclick="addAjusteMarcaRow()">+ Agregar marca</button>
        <button type="button" class="btn btn-primary" onclick="saveAjustesMarcas()">Guardar marcas</button>
      </div>
    </div>
  `;
}

function readAjustesBatchesFromDom() {
  const rows = document.querySelectorAll('#ajBatchesWrap [data-batch-codes]');
  return Array.from(rows)
    .map(inp => inp.value.split(',').map(s => s.trim()).filter(Boolean))
    .filter(batch => batch.length);
}

function readAjustesMarcasFromDom() {
  const rows = document.querySelectorAll('#ajMarcasWrap [data-marca-idx]');
  return Array.from(rows)
    .map(row => ({
      nombre: row.querySelector('[data-marca-nombre]').value.trim(),
      archivo: row.querySelector('[data-marca-archivo]').value.trim()
    }))
    .filter(m => m.nombre && m.archivo);
}

function addAjusteBatchRow() {
  adminAjustesLowRotation.batches = readAjustesBatchesFromDom();
  adminAjustesLowRotation.batches.push([]);
  renderAjustesAdmin();
}

function removeAjusteBatchRow(i) {
  const batches = readAjustesBatchesFromDom();
  batches.splice(i, 1);
  adminAjustesLowRotation.batches = batches;
  renderAjustesAdmin();
}

function addAjusteMarcaRow() {
  adminAjustesMarcas = readAjustesMarcasFromDom();
  adminAjustesMarcas.push({ nombre: '', archivo: '' });
  renderAjustesAdmin();
}

function removeAjusteMarcaRow(i) {
  const marcas = readAjustesMarcasFromDom();
  marcas.splice(i, 1);
  adminAjustesMarcas = marcas;
  renderAjustesAdmin();
}

async function upsertAjusteRow(clave, valor) {
  const resp = await adminFetch(`ajustes_catalogo?clave=eq.${clave}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ valor, actualizado_en: new Date().toISOString() })
  });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const rows = await resp.json();
  if (rows.length) return;
  // No existía la fila todavía (tabla recién creada): se crea ahora.
  const insResp = await adminFetch('ajustes_catalogo', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify([{ clave, valor, actualizado_en: new Date().toISOString() }])
  });
  if (!insResp.ok) throw new Error('HTTP ' + insResp.status);
}

async function saveAjustesLowRotation() {
  const startDate = document.getElementById('ajLowRotationStart').value;
  const batches = readAjustesBatchesFromDom();
  if (!startDate) {
    adminSetMsg('Elige una fecha de inicio.', 'error');
    return;
  }
  const valor = { start_date: startDate, batches };
  try {
    await upsertAjusteRow('low_rotation', valor);
    adminAjustesLowRotation = valor;
    // Reasigna las variables "let" de config.js por su nombre (no
    // "window.") para que getActiveLowRotationBatch() las vea al
    // instante.
    LOW_ROTATION_START_DATE = valor.start_date;
    LOW_ROTATION_BATCHES = valor.batches;
    if (typeof applyFilters === 'function') applyFilters();
    logAdminAction('editar', 'low_rotation', null, { start_date: valor.start_date, lotes: valor.batches.length });
    adminSetMsg('Rotación guardada y aplicada al catálogo.', 'ok');
    renderAjustesAdmin();
  } catch (err) {
    adminSetMsg('Error al guardar: ' + err.message, 'error');
  }
}

async function saveAjustesMarcas() {
  const marcas = readAjustesMarcasFromDom();
  try {
    await upsertAjusteRow('marcas_carrusel', marcas);
    adminAjustesMarcas = marcas;
    MARCAS_CARRUSEL = marcas;
    if (typeof renderBrandMarquee === 'function') renderBrandMarquee();
    logAdminAction('editar', 'marcas_carrusel', null, { total: marcas.length });
    adminSetMsg('Marcas guardadas y aplicadas al catálogo. Recuerda subir los archivos de imagen nuevos al repositorio.', 'ok');
    renderAjustesAdmin();
  } catch (err) {
    adminSetMsg('Error al guardar: ' + err.message, 'error');
  }
}

// ============================================================
//  HISTORIAL DE CAMBIOS (auditoria_admin)
// ============================================================

const ADMIN_HISTORIAL_PAGE_SIZE = 50;
let adminHistorialOffset = 0;
let adminHistorialRows = [];

function fmtDateTimeAdmin(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const ADMIN_ACCION_LABELS = { crear: 'Creó', editar: 'Editó', eliminar: 'Eliminó', vincular: 'Vinculó' };
const ADMIN_ENTIDAD_LABELS = {
  producto: 'un producto', cliente: 'un cliente', pedido: 'un pedido',
  low_rotation: 'la rotación de baja rotación', marcas_carrusel: 'las marcas del carrusel'
};

function historialDetalleTexto(row) {
  const d = row.detalle;
  if (!d || typeof d !== 'object') return '';
  const parts = [];
  if (d.code) parts.push(`código ${d.code}`);
  if (d.name) parts.push(d.name);
  if (d.nombre) parts.push(d.nombre);
  if (d.cliente_codigo) parts.push(`cliente #${d.cliente_codigo}`);
  if (d.start_date) parts.push(`inicio ${d.start_date}`);
  if (typeof d.lotes === 'number') parts.push(`${d.lotes} lote(s)`);
  if (typeof d.total === 'number') parts.push(`${d.total} marca(s)`);
  return parts.join(' · ');
}

function buildHistorialUrl(offset) {
  const search = document.getElementById('adminSearchInput').value.trim();
  let url = `auditoria_admin?select=*&order=creado_en.desc&limit=${ADMIN_HISTORIAL_PAGE_SIZE}&offset=${offset}`;
  if (search) {
    const t = search.replace(/[,()]/g, '');
    url += `&or=(accion.ilike.*${t}*,entidad.ilike.*${t}*,entidad_id.ilike.*${t}*,admin_email.ilike.*${t}*)`;
  }
  return url;
}

async function loadHistorialAdmin(reset) {
  if (reset) {
    adminHistorialOffset = 0;
    adminHistorialRows = [];
    document.getElementById('adminListBody').innerHTML = '';
  }
  adminSetMsg('Cargando...');
  try {
    const resp = await adminFetch(buildHistorialUrl(adminHistorialOffset));
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    adminHistorialRows = adminHistorialRows.concat(data);
    renderHistorialAdmin();
    document.getElementById('adminPedidosLoadMoreWrap').style.display = data.length < ADMIN_HISTORIAL_PAGE_SIZE ? 'none' : 'block';
    adminHistorialOffset += data.length;
    adminSetMsg(adminHistorialRows.length ? `${adminHistorialRows.length} registro(s) cargado(s)` : 'Sin registros todavía.');
  } catch (err) {
    adminSetMsg('Error al cargar el historial: ' + err.message, 'error');
  }
}

function renderHistorialAdmin() {
  const body = document.getElementById('adminListBody');
  if (!adminHistorialRows.length) {
    body.innerHTML = '<p class="admin-msg">Sin registros todavía.</p>';
    return;
  }
  body.innerHTML = `<div class="admin-list">` + adminHistorialRows.map(row => {
    const accionLbl = ADMIN_ACCION_LABELS[row.accion] || row.accion;
    const entidadLbl = ADMIN_ENTIDAD_LABELS[row.entidad] || row.entidad;
    const detalle = historialDetalleTexto(row);
    return `
      <div class="admin-row admin-row-static">
        <div class="admin-row-main">
          <div class="admin-row-title">${escapeAdminHtml(accionLbl)} ${escapeAdminHtml(entidadLbl)}${row.entidad_id ? ` <span style="color:var(--muted)">(${escapeAdminHtml(row.entidad_id)})</span>` : ''}</div>
          <div class="admin-row-sub">${escapeAdminHtml(row.admin_email || 'admin')} · ${fmtDateTimeAdmin(row.creado_en)}${detalle ? ' · ' + escapeAdminHtml(detalle) : ''}</div>
        </div>
      </div>
    `;
  }).join('') + `</div>`;
}

function loadMoreHistorialAdmin() {
  loadHistorialAdmin(false);
}