// ============================================================
//  AJUSTES DEL CATALOGO
// ============================================================
//  Todo lo que se cambia a mano vive aca. Ningun otro archivo
//  deberia necesitar tocarse para estos ajustes.
// ============================================================

// Sube esta fecha cada vez que reemplaces fotos de la carpeta img/,
// para que el navegador de los clientes no sirva la imagen vieja.
const IMG_VERSION = "20260923";

// Marcas que aparecen en el carrusel animado de arriba del catalogo
// (reemplaza al aviso de "fotos cargadas / agotados"). Cada logo debe
// estar guardado en img/marcas/<archivo>. Para agregar o quitar una
// marca, solo hay que editar esta lista -- no hace falta tocar main.js.
const MARCAS_CARRUSEL = [
  { nombre: "Jean Paul Gaultier", archivo: "jeanpaulgaultier.png" },
  { nombre: "Nautica", archivo: "nautica.png" },
  { nombre: "Hugo Boss", archivo: "hugoboss.png" },
  { nombre: "Moschino", archivo: "moschino.png" },
  { nombre: "Versace", archivo: "versace.png" },
  { nombre: "Calvin Klein", archivo: "calvinklein.png" },
  { nombre: "Carolina Herrera", archivo: "carolinaherrera.png" },
  { nombre: "Paco Rabanne", archivo: "pacorabanne.png" },
  { nombre: "Armaf", archivo: "armaf.png" },
  { nombre: "Afnan", archivo: "afnan.png" },
  { nombre: "Dolce & Gabbana", archivo: "dolcegabbana.png" },
  { nombre: "Bharara", archivo: "bharara.png" }
];

// Un producto aparece en "Nuevos Ingresos" mientras su dateAdded este
// dentro de los ultimos NEW_PRODUCT_DAYS dias.
const NEW_PRODUCT_DAYS = 30;

// Etiqueta "NUEVO" sobre la foto de los productos recientes.
// OJO: en el archivo original habia dos versiones de esta funcion y ganaba
// la que SI muestra la etiqueta, asi que hoy la etiqueta se ve. Se dejo el
// mismo comportamiento. Pone false aca si queres apagarla.
const MOSTRAR_ETIQUETA_NUEVO = true;

// Cuantos productos se cargan por tanda al hacer scroll / "Ver mas".
const PAGE_SIZE = 60;

// Boton "Dia del Nino": marcas que agrupa.
// El boton se muestra solo hasta esta fecha INCLUIDA (formato AAAA-MM-DD).
// A partir del dia siguiente desaparece solo, sin que haya que tocar nada.
// Para la proxima promocion con fecha, solo hay que cambiar este valor.
const DIA_DEL_NINO_FECHA_LIMITE = "2026-09-09";
const DIA_DEL_NINO_CATEGORIES = ["NEVADA", "GRANDEUR TUBBEES"];

// Cuantos pedidos guarda el historial local de cada cliente.
const ORDER_HISTORY_LIMIT = 20;

// ============================================================
//  VITRINA DE ENTRADA (pantalla previa a la clave)
// ============================================================
//  Cuantos productos se muestran en cada fila de la vitrina.
//  Las filas salen solas de las categorias del catalogo, no hay
//  ninguna lista escrita a mano: subir o bajar este numero es lo
//  unico que hay que tocar para mostrar mas o menos productos.
//
//  La fila de "Nuevos ingresos" NO usa este limite: siempre muestra
//  todos los nuevos ingresos que haya, sean 5 o sean 50.
//
//  Ojo con subirlo mucho: cada producto de mas son una foto y una
//  tarjeta mas que cargar antes de que el cliente entre.
const VITRINA_MAX_POR_FILA = 40;

// Con fotos publicadas en img/: habilita el ZIP de fotos del pedido.
const HAS_PHOTOS = true;

const SELLERS = {
  roy: { name: 'Roy Chacón', phone: '50687203737' },
  pedro: { name: 'Pedro Alemán', phone: '50672349212' }
};

// URL de despliegue del Google Apps Script que recibe los mensajes
// del formulario de feedback (con fotos adjuntas).
const FEEDBACK_URL = "https://script.google.com/macros/s/AKfycbz8t35NnwV7paVbsrYBPvODUNDDNGiltQgvvjLjFGLW8XjV7-51Fozt6aN5F4N9-SPt/exec";

// Iconos de la fila de tarjetas de categoria (arriba del catalogo).
// Cada icono debe estar guardado en img/categorias/<archivo>. Si una
// categoria no tiene entrada aca, la tarjeta se muestra sin icono
// (solo texto), sin romper nada.
const CATEGORIA_ICONOS = {
  "Estuches": "estuches.png",
  "Hombre": "hombre.png",
  "Mujer": "mujer.png",
  "Niños": "ninos.png",
  "Splash/Bodymist": "splash.png",
  "Unisex": "unisex.png",
  "Mascota": "mascota.png"
};

// ============================================================
//  ROTACION SEMANAL DE BAJA ROTACION
// ============================================================
//  91 productos identificados como "Baja rotacion" en la depuracion del
//  maestro de inventario (reporte 1/1/2025 al 8/9/2026), divididos en
//  19 lotes de 5 (el ultimo lote tiene 1 solo producto).
//
//  Cada 7 dias, contados desde LOW_ROTATION_START_DATE, se activa el
//  siguiente lote automaticamente -- esto lo calcula el navegador solo,
//  no hace falta tocar nada a mano cada semana. Al llegar al ultimo
//  lote, vuelve a empezar desde el primero (ciclo infinito).
//
//  Estos 5 productos se muestran SIEMPRE junto con los Nuevos Ingresos
//  normales (los que tienen dateAdded en products.js), tanto en el
//  banner de arriba como en el filtro "Nuevos Ingresos". Son
//  independientes entre si: si piden quitar/cambiar TODOS los Nuevos
//  Ingresos normales, se limpian los dateAdded de products.js pero
//  ESTA lista y su rotacion NO se tocan.
//
//  Para cambiar de lotes en el futuro, solo hay que editar el array
//  LOW_ROTATION_BATCHES de aca abajo.
// ============================================================
const LOW_ROTATION_START_DATE = "2026-09-21";

const LOW_ROTATION_BATCHES = [
  ["6290171071044", "3423222106508", "3614274101461", "3614274411164", "3616305187574"], // AFNAN ZIMAYA ROYAL LEATHER U 100ML EDP | ESTUCHE ISSEY MIYAKE L EAU D ISSEY 3PCS | ESTUCHE AZZARO MOST WANTED EDP 3PCS | ESTUCHE  AZZARO MOST WANTED 3PCS | COOL WATER RBORN P M EDP 100ML INT IV
  ["3616305187598", "6290171073307", "6294015105230", "6297001158029", "6297001158593"], // COOL WATER RBORN P W EDP 100ML INT IV | AFNAN ZIMAYA TARAF WHITE U 100ML EDP | ESTUCHE ARMAF OPUS FEMME 4PCS M | ORIENTICA XO XLUSIF OUD SPORT 60ML EDP U | ESTUCHE ORIENTICA AMBER NOIR 3PZA
  ["8433982027123", "98691046223", "0268514932570", "085715321312", "085715962164"], // BENETON COLORS ROSE M | CURVE CONNECT 100ML EDT M | TESTER ROYAL AMBER 150ML | GUESS NIGHT 100ML EDT H | ESTUCHE DKNY 2PC
  ["202602211146", "2068542036749", "210220261146", "3274872464094", "3346133203664"], // ROME POUR HOMME DEODORANT EDP 150ML | TESTER ROYAL BLUE 150 ML | ROME IMAGINE DEODORANT EDP 150ML | ESTUCHE KENZO F L ABSOLUE 3PZA | HERMES TWILLY GINGER EDP 50ML
  ["3349668630356", "3386460143288", "3386460146081", "3386460155779", "3423222106300"], // PACO R. MILLION GOLD INTENSE EDP 200ML | Mont Blanc Patchouli Ink Dark Woods 125M | Mont Blanc Explorer Platinum 200ML EDP S | ESTUCHE MONT BLANC EXPLORER EXTREME 4PZA | LE SEL D´ISSEY 50ML EDT H
  ["3439600029758", "3605972454539", "3607349843076", "3614222125167", "3614273955522"], // MUGLER ALIEN MAN EDT 100ML | Ralph Lauren Polo Intense 4.0 Cologne Sp | KATY PERRY REVOLUTION ROYAL 100ML EDP M | KATY PERRY MAD LOVE 100ML M | TESTER ZODIAC SCORPIO
  ["3614274078701", "3614274411119", "3616302038398", "3616304203572", "3616304990465"], // ESTUCHE RED DIESEL ONLY THE BRAVE  2PCS | ESTUCHE AZZARO WANTED EDT 3PZA | DAVIDOFF COOL WATER REBORN EDT 100ML | ESCADA BRISA CUBANA 100ML EDT M | ESTUCHE DAVIDOFF COOLWATER FOR HER 3PCS
  ["3616305275066", "3760260450034", "3760269849327", "3760310290733", "6085010091051"], // CK ONE ESSENCE  PARFUM INTENSE 200ML | MONTALE BLACK AOUD U 100ML EDP UNISEX | LOLITA PEMPICKA EDP 30ML | DAHAB BY KAJAL EDP 100ML | ESTUCHE ARMAF LE FEMME 4PCS M
  ["608940579213", "614514249031", "614514555460", "6290171070719", "6290171071143"], // SPLASH JESSICA SIMPSON FOREVER 236ML | RASASI SHUHRAH POUR FEMME EDP 90ML | ESTUCHE RASASI HAWAS VIPE 3PZA | AFNAN FAWAHA U 20 ML | AFNAN HISTORIC OLMEDA U 100ML EDP
  ["6290171072171", "6290171073178", "6290171073314", "6290360591438", "6290360591445"], // AFNAN ZIMAYA MAGNA LOVE U 100ML EDP | ESTUCHE SUPREMACY SILVER H 3PZA | AFNAN ZIMAYA TARAF BLACK U 100ML EDP | LATTAFA RAVE NARDO RED 100ML EDP U | LATTAFA RAVE NARDO BLACK 100ML EDP U
  ["6291100131594", "6291100131747", "6291100131839", "6291106813593", "6291106814415"], // AL HARAMAIN L AVENTURE ROSE 200ML | AL HARAMAIN L AVENTURE GOLDEDP 200ML | COLECTION HARAMAIN L AVENTURE 4P | ALHARAMAIN AVENTURE GRAPEFRUIT EDP 100ML | AL HARAMAIN RED JASPER PARFUM 100ML
  ["6291108735558", "6294015101126", "6294015157390", "6294015161502", "6295199809303"], // MAISON ALHAMBRA MAITRE 100ML EDP | ARMAF OROS HOLIDAY 85ML EDP M | ESTUCHE LS ARMAF PRIDE ROUGE 4 PC | ARMAF LE PARFAIT PANACHE 100ML M  EDP SP | ESTUCHE ARMAF ODISSEY CHOCOLAT 4P
  ["6297001158036", "6297001158074", "6297001158258", "6297001158296", "6297001158319"], // ORIENTICA XO XCLUSIF OUD EMERALD 60ML ED | ESTUCHE ORIENTICA OUD SAFFRON 3PZA | ORIENTICA ROYAL BLEU 150ML U EDP | ESTUCHE ORIENTICA OUD SAFFRON 4PCS UNISE | ESTUCHE ORIENTICA ROYAL BLUE 4PCS UNISEX
  ["6298042518049", "6298042518070", "6598321694755", "7611160245779", "783320420627"], // ORIENTICA NAYAAT LIQUID DESIRE 100ML U | ORIENTICA NAYAAT  CAN'T GET ENOUGH 100ML | TESTER ROYAL AMBER 80ML | VICTORINOX QUARTZ EDT 100ML | BVLGARI OMNIA AMETHYSTE 50ML EDT M
  ["8011003808847", "8054609780575", "8054754403503", "810200670008", "8411061055182"], // TESTER VERSACE CRYSTAL NOIR 100ML EDT M | PINK SUGAR RV EDT 100ML | EST D&G EAU DE PARFUM INTENSE 2PC | MAST MANDARIN EDP100ML | CAROLINA.H CH PASION 100ML EDP H
  ["8411061081419", "8411061091371", "8411061972212", "8433982027338", "8433982028533"], // A.BANDERAS POWER OF SEDUCTION H EDT 200M | ESTUCHE shakira dance red midnigth | SHAKIRA DANCE MIDNINGHT EDT 80ML | BENETTON SISTERLAND BLUSH CHERRY 80ML | BENETTON UNLIMITED COLORS EDT 80ML
  ["8433982029011", "8436550505276", "844061005112", "844061014992", "856515004053"], // BENNETTON COLORS BLACK EDT 100ML | TOUS OH! EDP 100ML M | PERRY ELLIES NIGHT 100ML EDT H | PERRY ELLIS DESORANTE AQUA EXTREME 170ML | HUMMER BLANCK 125ML EDT H
  ["860006008642", "8717774840818", "883991088994", "888066023948", "888066144254"], // JESSICA MCCLINTOCK LIVE EDP 100ML | STERCUS ORTO PARISI EDP 50ML | SPLASH JESSICA SIMPSON FANCY M | TOM FORD VELVET ORCHID EDP 50ML | TOM FORD PUD MINERALE EDP 100ML
  ["888874008380"], // BOND NO. 9 NEW YORK GARDENIA 100ML EDP U
];

function getActiveLowRotationBatch() {
  if (!LOW_ROTATION_BATCHES.length) return [];
  const start = new Date(LOW_ROTATION_START_DATE + 'T00:00:00');
  const diffDays = Math.floor((Date.now() - start.getTime()) / 86400000);
  const weekIndex = Math.floor(diffDays / 7);
  const idx = ((weekIndex % LOW_ROTATION_BATCHES.length) + LOW_ROTATION_BATCHES.length) % LOW_ROTATION_BATCHES.length;
  return LOW_ROTATION_BATCHES[idx];
}

function isLowRotationActive(p) {
  return getActiveLowRotationBatch().includes(p.code);
}