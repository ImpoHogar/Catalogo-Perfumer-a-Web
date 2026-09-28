// ============================================================
//  ARMADO DE LOS DATOS
// ============================================================
//  Arma las listas que usa el resto del catalogo (PRODUCTS_BY_ID,
//  VISIBLE_PRODUCTS, BRANDS) a partir de PRODUCTS. El stock ya viene
//  incluido en cada producto (p.stock) desde js/products-loader.js,
//  que trae los productos de Supabase.
//
//  Se llama UNA VEZ, desde products-loader.js, apenas terminan de
//  llegar los productos -- no se ejecuta solo con cargar el archivo.
// ============================================================

function buildDerivedData() {
  window.PRODUCTS_BY_ID = {};
  PRODUCTS.forEach(p => { PRODUCTS_BY_ID[p.id] = p; });

  const VISIBLE_PRODUCTS_RAW = PRODUCTS.filter(p => !p.hidden && p.img);

  window.VISIBLE_PRODUCTS = [...VISIBLE_PRODUCTS_RAW].sort((a, b) => {
    const aOut = (parseInt(a.stock) || 0) <= 0;
    const bOut = (parseInt(b.stock) || 0) <= 0;
    if (aOut === bOut) return 0;
    return aOut ? 1 : -1;
  });

  window.BRANDS = [...new Set(VISIBLE_PRODUCTS.map(p => p.brand))].sort();
}