// ============================================================
//  AJUSTES DEL CATALOGO
// ============================================================
//  Todo lo que se cambia a mano vive aca. Ningun otro archivo
//  deberia necesitar tocarse para estos ajustes.
// ============================================================

// Sube esta fecha cada vez que reemplaces fotos de la carpeta img/,
// para que el navegador de los clientes no sirva la imagen vieja.
const IMG_VERSION = "20260828";

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
const DIA_DEL_NINO_ACTIVE = true;
const DIA_DEL_NINO_CATEGORIES = ["NEVADA", "GRANDEUR TUBBEES"];

// Cuantos pedidos guarda el historial local de cada cliente.
const ORDER_HISTORY_LIMIT = 20;

// Con fotos publicadas en img/: habilita el ZIP de fotos del pedido.
const HAS_PHOTOS = true;

const SELLERS = {
  roy: { name: 'Roy Chacón', phone: '50687203737' },
  pedro: { name: 'Pedro Alemán', phone: '50672349212' }
};

// URL de despliegue del Google Apps Script que recibe los mensajes
// del formulario de feedback (con fotos adjuntas).
const FEEDBACK_URL = "https://script.google.com/macros/s/AKfycbz8t35NnwV7paVbsrYBPvODUNDDNGiltQgvvjLjFGLW8XjV7-51Fozt6aN5F4N9-SPt/exec";
