# Catálogo ImpoHogar — estructura de archivos

El `index.html` de 550 KB se dividió en piezas. **El diseño y el funcionamiento
son idénticos**: no se cambió ni un color ni un botón.

## Qué hay en cada archivo

```
index.html            Solo el esqueleto de la página (19 KB)
css/styles.css        Todos los estilos
img/logo.png          El logo (antes estaba incrustado dos veces dentro del HTML)
img/p0.webp ...       Las fotos de los productos (ya están en el repo, no cambian)

js/config.js          ⚙️  AJUSTES: versión de fotos, días de "Nuevos Ingresos",
                          etiqueta NUEVO, vendedores, tamaño de página
js/products.js        📦 EL CATÁLOGO: 2016 productos, uno por línea (sin cantidades)
js/stock.js           🔢 LAS CANTIDADES: "código": cantidad — se reemplaza solo este
js/data.js            Pega las cantidades a los productos y arma las listas
js/utils.js           Funciones sueltas de apoyo
js/dupes.js           Relaciones "Dupe / Inspiración"
js/catalog.js         Tarjetas, filtros, paginación, Día del Niño, Nuevos Ingresos
js/cart.js            Carrito y panel de revisión del pedido
js/theme.js           Modo oscuro / claro
js/order.js           Excel del pedido, ZIP de fotos, datos del cliente, WhatsApp
js/history.js         Historial de pedidos (guardado en el navegador del cliente)
js/calculator.js      Calculadora
js/lightbox.js        Visor de fotos con zoom y gestos
js/gate.js            Pantalla de clave
js/main.js            Arranque: conecta todo cuando carga la página
```

---

## Para actualizar cantidades

**Reemplazás un solo archivo: `js/stock.js`.**

Nada más. Ni el `index.html`, ni `products.js`, ni las fotos.

Si querés editarlo a mano: buscá el código de barras con Ctrl+F y cambiá
el número. Cada línea es `"código": cantidad,`.

> ⚠️ **La trampa de siempre:** el cruce es por coincidencia **exacta** del
> código. Hay productos que solo se diferencian por un cero al inicio
> (`022548006719` y `0022548006719`) y son artículos distintos. Si se
> normalizan los ceros a la izquierda, se agotan por error productos que sí
> tienen stock.

---

## Para publicar

Copiá la carpeta completa a `CatataloImpoHogar`, reemplazando los archivos del
mismo nombre, y hacé commit y push como siempre.

**El orden de los `<script>` en el `index.html` importa.** No los reordenes:
`config` y `products` tienen que cargar antes que el resto.

### Caché

Los archivos llevan `?v=20260824` en el `index.html`. Cuando cambies **cualquier
archivo de `js/` o `css/`**, subí ese número en el `index.html` (buscá y
reemplazá `v=20260824`) para que los clientes no sigan viendo la versión vieja.

Si preferís no tocar el `index.html` cada vez, el archivo `_headers` ya trae una
regla para que `stock.js` se revalide siempre — pero eso depende de que el
hosting respete ese archivo.

Para las **fotos** el versionado es aparte: si reemplazás imágenes de `img/`,
subí `IMG_VERSION` en `js/config.js`.

---

## Dos cosas que encontré en el código original

**1. La etiqueta "NUEVO" está activa.** Había dos versiones de la función
`isProductNew`: una apagaba la etiqueta con el comentario *"desactivada a pedido
del cliente"*, y otra la encendía. Por cómo funciona JavaScript ganaba la
segunda, así que **la etiqueta sí se muestra hoy** en los productos con
`dateAdded` reciente. Se dejó el mismo comportamiento para no cambiar nada sin
avisar. Para apagarla de verdad: en `js/config.js`, poné
`MOSTRAR_ETIQUETA_NUEVO = false`.

**2. La clave no es seguridad.** Sigue viajando en el código (`js/gate.js`) y el
catálogo completo ya está en la página antes de escribirla. Dividir los archivos
no lo empeora ni lo mejora: para resolverlo de verdad hace falta un backend.
