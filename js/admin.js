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
      expires_at: Date.now() + ((data.expires_in || 3600) * 1000) - 30000
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
  document.getElementById('adminSearchInput').value = '';
  document.getElementById('adminAddBtn').style.display = tab === 'pedidos' ? 'none' : '';
  document.getElementById('adminPedidosFilters').style.display = tab === 'pedidos' ? 'flex' : 'none';
  document.getElementById('adminPedidosSummary').style.display = tab === 'pedidos' ? 'grid' : 'none';
  document.getElementById('adminPedidosLoadMoreWrap').style.display = 'none';
  if (tab === 'productos') document.getElementById('adminSearchInput').placeholder = 'Buscar por código, nombre o marca...';
  else if (tab === 'clientes') document.getElementById('adminSearchInput').placeholder = 'Buscar por código, nombre o teléfono...';
  else document.getElementById('adminSearchInput').placeholder = 'Buscar cliente por nombre o teléfono...';
  document.getElementById('adminMsg').textContent = '';
  document.getElementById('adminListBody').innerHTML = '';
  if (tab === 'productos') loadProductosAdmin('');
  else if (tab === 'clientes') loadClientesAdmin('');
  else loadPedidosAdmin(true);
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
    else loadPedidosAdmin(true);
  }, adminTab === 'pedidos' ? 350 : 0);
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