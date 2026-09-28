// ============================================================
//  CARGA DE PRODUCTOS DESDE SUPABASE
// ============================================================
//  Trae todos los productos (y su stock) desde la tabla "productos"
//  de Supabase, arma window.PRODUCTS y window.STOCK con la misma
//  forma que antes tenian js/products.js y js/stock.js, llama a
//  buildDerivedData() (definida en data.js) y avisa al resto del
//  catalogo que los datos ya estan listos disparando el evento
//  "productos:listos" en window. Si algo falla, dispara
//  "productos:error" para que main.js muestre un aviso.
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

async function loadProductsFromSupabase() {
  try {
    if (typeof SUPABASE_URL === 'undefined' || !SUPABASE_URL) {
      throw new Error('SUPABASE_URL no esta definido (revisa js/config.js)');
    }
    const rows = await fetchAllProductos();
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
