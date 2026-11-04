# Sistema de Gestión Comercial e Inventarios Multisucursal: propuesta y prototipo

Propuesta de **Amicornios Soft** (COT-TOR-002, v2.0) para una empresa importadora y comercializadora con varias sucursales: página comercial con cotización descargable en PDF y prototipo administrativo navegable con datos de demostración.

> **Versión 2.0.** El cliente aclaró que no fabrica piezas: compra, importa y comercializa productos. Se eliminó el módulo de órdenes de trabajo / fabricación (Bs 2.500) y se aplicó un descuento comercial de Bs 500. Subtotal Bs 14.000, total final **Bs 13.500** (anticipo y saldo de Bs 6.750), plazo de 6 a 10 semanas. La carpeta conserva el nombre `torneria/` para no romper enlaces.

Está hecho solo con HTML, CSS y JavaScript (sin frameworks, backend ni base de datos), igual que las demás cotizaciones de esta carpeta.

## Cómo ejecutarlo

- **Directo:** abra `index.html` en el navegador. Todo funciona sin servidor, incluido el PDF, porque jsPDF está en `assets/vendor/`.
- **Con servidor estático** (recomendado para reuniones): `node tests/serve.js 8080` y abra `http://localhost:8080/`. También sirve cualquier hosting estático (Coolify static, Nginx, Netlify).

Solo las tipografías (Inter y Barlow Semi Condensed) se cargan desde Google Fonts. Sin conexión se usa la fuente del sistema.

## Estructura

```
torneria/
├── index.html              página comercial (cotización)
├── css/
│   ├── base.css            tokens, botones, formularios, tablas, modales, toasts (compartido)
│   ├── cotizacion.css      estilos de la página comercial
│   └── prototipo.css       estilos del panel administrativo
├── js/
│   ├── config.js           ← CONFIGURACIÓN CENTRALIZADA (precios, módulos, plazos, condiciones, proveedor, cliente)
│   ├── pricing.js          modelo de la propuesta: subtotal, descuento, total, pagos, cronograma (funciones puras, probadas con node)
│   ├── cotizacion.js       dibuja la página a partir del modelo
│   ├── pdf.js              PDF vectorial A4 con jsPDF + AutoTable a partir del mismo modelo
│   ├── icons.js, ui.js     iconos SVG y utilidades (formato, modales, validación, descargas)
├── prototipo/
│   ├── index.html          aplicación de una página (rutas #/dashboard, #/ventas, …)
│   └── js/
│       ├── data.js         generador de datos de demostración
│       ├── store.js        "base de datos" en localStorage y reglas de negocio de cada operación
│       ├── app.js          rutas, barra lateral, sucursal, búsqueda, notificaciones, permisos
│       ├── components.js   tabla con orden y paginación, editor de líneas, comprobante, exportaciones
│       ├── charts.js       gráficos SVG propios (barras, líneas, dona, ranking) con tooltip
│       └── views/*.js      las 13 pantallas
├── assets/                 favicon y librerías locales (jsPDF 2.5.1, AutoTable 3.8.2)
└── tests/                  pruebas del modelo y pruebas en Chrome headless
```

## Cómo modificar la propuesta

Todo está en `js/config.js`. La página y el PDF leen el mismo objeto, así que no hay que tocar otros archivos.

| Qué cambiar | Campo en `config.js` |
|---|---|
| Precio de un módulo o servicio | `costos[].monto` (el subtotal y el total se recalculan solos) |
| Descuento comercial | `descuentos[]` (se resta del subtotal; los precios por módulo no se alteran) |
| Forma de pago | `pagos[].porcentaje` y `momento` |
| Plazo y cronograma | `proyecto.tiempo` y `cronograma[].min / max` (semanas de inicio y fin) |
| Mantenimiento | `mantenimiento.montoMensual`, `incluye`, `noIncluye` |
| Hosting mensual | `hosting.montoMensual`, `meses`, `inicio` |
| Módulos y funcionalidades | `modulos[]` |
| Exclusiones y condiciones | `exclusiones`, `condicionesComerciales` |
| Datos del proveedor | `proveedor` (NIT y responsable figuran como `[Por completar]`) |
| Datos del cliente, validez y número | `cliente`, `cotizacion.validez`, `cotizacion.numero`, `cotizacion.fechaEmision` |

`subtotalEsperado` (14000) y `totalEsperado` (13500) solo sirven para que las pruebas avisen si los importes cambian por accidente. Si cambia precios o descuentos a propósito, actualícelos.

Los datos del cliente y la validez de la oferta **no se inventaron**: aparecen como `[Por completar]`. Se pueden escribir en `config.js` o, sin editar código, con el botón **"Datos del cliente para el PDF"** de la sección Inversión. Esos datos se guardan solo en el navegador que se use.

## El PDF

Botón "Descargar cotización PDF" (encabezado, barra superior, inversión y cierre). Genera un PDF vectorial A4 de 8 páginas con portada, resumen ejecutivo, objetivos, alcance, módulos, beneficios, tabla de precios (subtotal, descuento comercial y total final), inversión total, cronograma con diagrama, condiciones de pago, hosting, mantenimiento, exclusiones y condiciones comerciales. Lleva encabezado, pie y "Página X de N" en todas las páginas.

## Qué es simulación en el prototipo

El prototipo es una **demostración comercial**, no el sistema productivo:

- **Datos ficticios.** "Importadora Demo", sus 3 sucursales, productos (con marcas ficticias), clientes, proveedores y usuarios son inventados. Se generan con una semilla fija relativa a la fecha de hoy y simulan 190 días de operación, de modo que stock, kardex, caja y dashboard cuadran entre sí.
- **Sin backend ni base de datos.** Todo se guarda en `localStorage` (clave `torneria:demo-db`) del navegador. Se puede restablecer desde la barra lateral o desde Configuración → Datos de demostración.
- **Sin autenticación real.** El menú del usuario (arriba a la derecha) permite "cambiar de usuario" para mostrar cómo se restringen módulos y sucursales según el rol.
- **Sin integraciones.** No hay facturación electrónica, SIAT, pasarelas de pago, correo ni APIs externas. El comprobante es interno, sin valor fiscal.
- **Lo que sí funciona en el navegador:** las reglas de cada operación (validación de stock, kardex, recepción de órdenes de compra, cierre de caja con diferencia, conversión de cotización en venta, permisos), la importación de productos y de conteos de inventario desde CSV y las exportaciones reales a CSV (Excel) y PDF.

Si cambia la estructura de `prototipo/js/data.js`, suba `VERSION` en `prototipo/js/store.js` (y `version` en `data.js`) para que los navegadores regeneren los datos.

## Pruebas

Requieren Node 20+ y Google Chrome (ruta por defecto `C:/Program Files/Google/Chrome/Application/chrome.exe`; se puede cambiar con la variable `CHROME`).

```bash
node tests/pricing.test.js                              # 19 pruebas del modelo: subtotal 14.000, descuento 500, total 13.500, pagos, cronograma
node --experimental-websocket tests/smoke.js [carpeta]  # propuesta + 13 pantallas en escritorio y móvil
node --experimental-websocket tests/flows.js [carpeta]  # 71 verificaciones: pantalla vs PDF, descargas, operaciones y ausencia de textos de fabricación
```

Las capturas, el PDF de prueba y las descargas se guardan en `tests/shots/` (ignorada por git).
