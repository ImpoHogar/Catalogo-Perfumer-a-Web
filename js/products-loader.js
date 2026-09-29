// ============================================================
//  CARGA DE PRODUCTOS Y AJUSTES DESDE SUPABASE
// ============================================================
//  Trae todos los productos (y su stock) desde la tabla "productos"
//  de Supabase, arma window.PRODUCTS y window.STOCK con la misma
//  forma que antes tenian js/products.js y js/stock.js, llama a
//  buildDerivedData() (definida en data.js) y avisa al resto del
//  catalogo que los datos ya estan listos disparando el evento
//  "productos:listos" en window. Si algo falla, dispara
//  "productos:error" para que main.js muestre un aviso.
//
//  De paso trae la tabla "ajustes_catalogo" (lotes de baja rotacion y
//  marcas del carrusel, editables desde el panel administrativo) y
//  reemplaza los valores por defecto de js/config.js con los reales.
//  Si esto ultimo falla, el catalogo sigue funcionando con los
//  valores de respaldo que ya trae config.js -- nunca bloquea la
//  carga de productos.
// ============================================================

const PRODUCTOS_PAGE_SIZE = 1000;

// Convierte una fila de Supabase (snake_case) al formato que usa el
// resto del catalogo (camelCase), igual que los objetos que antes
// venian de js/products.js.
function mapSupabaseRow(row) {
  return {
    id: row.id,
    brand: row.brand,
    code: row.code,
    name: row.name,
    tipo: row.tipo,
    genero: row.genero,
    img: !!row.img,
    notes: row.notes || [],
    notesSource: row.notes_source || undefined,
    dateAdded: row.date_added || undefined,
    hidden: !!row.hidden,
    stock: row.stock
  };
}

async function fetchAllProductos() {
  const rows = [];
  let from = 0;
  while (true) {
    const to = from + PRODUCTOS_PAGE_SIZE - 1;
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/productos?select=*&order=id.asc`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Range: `${from}-${to}`
      }
    });
    if (!resp.ok && resp.status !== 206) {
      throw new Error('HTTP ' + resp.status + ' al leer productos');
    }
    const batch = await resp.json();
    rows.push(...batch);
    if (batch.length < PRODUCTOS_PAGE_SIZE) break;
    from += PRODUCTOS_PAGE_SIZE;
  }
  return rows;
}

// Trae la tabla ajustes_catalogo (lotes de baja rotacion + marcas del
// carrusel) y reemplaza los valores por defecto de config.js con los
// reales. Nunca lanza error hacia afuera: si algo falla, simplemente
// deja los valores de respaldo de config.js tal cual estan.
async function fetchAjustes() {
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/ajustes_catalogo?select=clave,valor`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    if (!resp.ok) return;
    const rows = await resp.json();
    // Importante: LOW_ROTATION_START_DATE, LOW_ROTATION_BATCHES y
    // MARCAS_CARRUSEL estan declaradas con "let" en config.js (no
    // "var"), asi que NO son propiedades de window -- hay que
    // reasignarlas por su nombre tal cual, sin "window.", para que
    // las funciones de config.js (getActiveLowRotationBatch, etc.) y
    // de main.js (renderBrandMarquee) vean el valor nuevo.
    rows.forEach(row => {
      if (row.clave === 'low_rotation' && row.valor) {
        if (row.valor.start_date) LOW_ROTATION_START_DATE = row.valor.start_date;
        if (Array.isArray(row.valor.batches)) LOW_ROTATION_BATCHES = row.valor.batches;
      } else if (row.clave === 'marcas_carrusel' && Array.isArray(row.valor)) {
        MARCAS_CARRUSEL = row.valor;
      }
    });
  } catch (err) {
    // Silencioso a proposito: el catalogo sigue con los valores de
    // respaldo de config.js.
  }
}

async function loadProductsFromSupabase() {
  try {
    if (typeof SUPABASE_URL === 'undefined' || !SUPABASE_URL) {
      throw new Error('SUPABASE_URL no esta definido (revisa js/config.js)');
    }
    const [rows] = await Promise.all([
      fetchAllProductos(),
      fetchAjustes()
    ]);
    if (!rows.length) {
      throw new Error('Supabase devolvio 0 productos');
    }

    window.PRODUCTS = rows.map(mapSupabaseRow);

    window.STOCK = {};
    window.PRODUCTS.forEach(p => {
      STOCK[p.code] = parseInt(p.stock) || 0;
    });

    buildDerivedData();

    window.dispatchEvent(new CustomEvent('productos:listos'));
  } catch (err) {
    window.dispatchEvent(new CustomEvent('productos:error', { detail: err }));
  }
}

loadProductsFromSupabase();