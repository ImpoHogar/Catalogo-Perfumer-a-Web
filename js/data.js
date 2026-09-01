// ============================================================
//  ARMADO DE LOS DATOS
// ============================================================
//  Pega las cantidades de stock.js a cada producto y prepara las
//  listas que usa el resto del catalogo. Cargar DESPUES de
//  products.js y stock.js.
// ============================================================

// Cruce por codigo de barras EXACTO (ver la advertencia en stock.js).
PRODUCTS.forEach(p => {
  p.stock = (p.code in STOCK) ? String(STOCK[p.code]) : "0";
});

const PRODUCTS_BY_ID = {};

const VISIBLE_PRODUCTS_RAW = PRODUCTS.filter(p => !p.hidden && p.img);

const VISIBLE_PRODUCTS = [...VISIBLE_PRODUCTS_RAW].sort((a, b) => {
  const aOut = (parseInt(a.stock) || 0) <= 0;
  const bOut = (parseInt(b.stock) || 0) <= 0;
  if (aOut === bOut) return 0;
  return aOut ? 1 : -1;
});

const BRANDS = [...new Set(VISIBLE_PRODUCTS.map(p => p.brand))].sort();
