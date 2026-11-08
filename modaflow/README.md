# ModaFlow: presentación comercial y prototipo interactivo

**ModaFlow** (nombre temporal) es *el sistema inteligente para gestionar tu tienda de ropa desde tu celular*. Está pensado para tiendas pequeñas y medianas de Bolivia y resuelve tres necesidades:

1. Registrar prendas con fotos e inteligencia artificial.
2. Vender y controlar el inventario automáticamente.
3. Consultar reportes del negocio.

Los planes Pro y Premium suman además un catálogo online con pedidos por WhatsApp y QR. Este repositorio tiene la presentación comercial, los planes y una demo pública con la tienda de ejemplo **MioShop — Moda Femenina**.

El sitio está hecho con HTML, CSS y JavaScript puro, y los datos de la demo se guardan en `localStorage` del navegador. Un servidor pequeño en Node (`server/`) sirve el sitio y conecta el **registro de prendas con Claude**, la IA de Anthropic. No hay cobros, facturación, autenticación ni otras integraciones reales: lo simulado está indicado en la demo.

## Cómo iniciarlo

```bash
cd cotizaciones/modaflow
npm install                 # instala el SDK oficial de Anthropic (@anthropic-ai/sdk)
cp .env.example .env        # en Windows: copy .env.example .env
# edite .env y pegue su clave en ANTHROPIC_API_KEY
npm start                   # → http://localhost:8080
```

- Sin `ANTHROPIC_API_KEY`, todo funciona igual, pero la IA muestra "falta configurar ANTHROPIC_API_KEY". El registro manual sigue disponible.
- Si abre `index.html` directo (como archivo `file://`), funciona todo menos la IA.
- Para probar desde el celular en la misma red Wi-Fi, ponga `HOST=0.0.0.0` en `.env` y abra `http://IP-de-su-PC:8080`.

Solo las tipografías se cargan desde Google Fonts. jsPDF (boletas y reportes en PDF) está copiado en `js/vendor/`.

## Publicar en Coolify (con IA)

Las páginas se publican en el sitio estático `https://cotizaciones.amicornios.com/modaflow/`. Un sitio estático no ejecuta el servidor que llama a Claude, así que la IA se publica como un **segundo recurso** de Coolify. Las páginas lo llaman solas: `js/config.js` usa `https://modaflow-api.amicornios.com/api/ia` cuando la página está en `cotizaciones.amicornios.com`.

1. **+ New Resource** → el mismo repositorio de GitHub (`cotizaciones`), rama `main`.
2. **Build Pack:** `Dockerfile` · **Base Directory:** `/modaflow` · **Ports Exposes:** `8080`.
3. **Domains:** `https://modaflow-api.amicornios.com`. El DNS de ese subdominio debe apuntar al servidor de Coolify, salvo que ya tenga un comodín `*.amicornios.com`.
4. **Environment Variables:**
   - `ANTHROPIC_API_KEY` (secreta)
   - `IA_CORS_ORIGENES=https://cotizaciones.amicornios.com`
   - opcionales: `IA_PRECIO_ENTRADA_USD_MTOK=0.10`, `IA_PRECIO_SALIDA_USD_MTOK=0.50`, `IA_TIPO_CAMBIO_BS=6.96`

   El Dockerfile ya define `HOST=0.0.0.0`, `PORT=8080` y `TRUST_PROXY=1`.
5. Despliegue y abra `https://modaflow-api.amicornios.com/api/ia/estado`: debe responder `"disponible": true`.
6. Haga push de los cambios para que el sitio estático publique el nuevo `js/config.js`.

Si elige otro subdominio, cámbielo en `js/config.js` → `ai.endpoint`. Ese recurso también sirve ModaFlow completo en su propio dominio, por si prefiere usarlo directamente.

## Planes

La configuración está centralizada en `js/plans.js`. En `ACCESS`, cada función lista los planes que la incluyen, y la misma aplicación aplica los límites y bloqueos. Cuando una función no está incluida, se muestra "Disponible desde el plan …".

| | Prueba gratuita | Básico | Pro (destacado) | Premium |
|---|---|---|---|---|
| Precio | Bs 0 · 14 días | Bs 30/mes | Bs 69/mes | Bs 119/mes |
| Productos (fichas) | 30 | 150 | 1.000 | 5.000 |
| Análisis con IA | 10 en total | 20 al mes | 100 al mes | 300 al mes |
| Usuarios / sucursales | 1 / 1 | 1 / 1 | 3 / 1 | 10 / 3 |
| Catálogo público | Temporal | No | Sí | Sí + dominio propio |
| Reportes | Avanzados | Básicos | Avanzados | + comparativos por sucursal |

- **Producto ≠ stock:** una blusa con 20 unidades cuenta como 1 producto. Las ventas son ilimitadas en todos los planes.
- **Fin de la prueba:** la cuenta queda en solo lectura, el catálogo se desactiva y se proponen 30 días más de conservación de datos. En la demo se simula con "Simular fin de la prueba" y se revierte con "Reactivar prueba".
- **Créditos de IA:** son mensuales en los planes pagados y totales en la prueba. El registro manual no consume créditos.

## Recorrido sugerido de la demo

La demo funciona **mobile first**. En el celular tiene una barra inferior con **Inicio · Inventario · Vender · Reportes · Más**; en escritorio, menú lateral.

1. **Inicio:** dos accesos grandes, **Registrar prenda** y **Nueva venta**, más las ventas del día y del mes, las alertas y el estado del catálogo.
2. **Registrar prenda:** hasta 3 fotos (frente, espalda y etiqueta), tomadas con la cámara, subidas o "Elegir varias". Luego **"Identificar prenda con IA"** o **"Completar sin IA"**. La revisión incluye nombre, descripción breve, tipo, categoría y color. Las tallas se tocan para agregarlas, cada variante tiene su cantidad y también se puede elegir "Prenda única (1 unidad)" o "Mismas tallas en otro color". Después van el precio de venta, el precio de compra opcional y las etiquetas. Al guardar se registran la fecha y la hora, el stock inicial como movimiento y las fotos. El final ofrece "Registrar otra prenda" y "Ver inventario".
3. **Inventario:** tarjetas con foto, precio, tallas y estado, más totales (productos, unidades, poco stock, agotados). Busca por nombre o etiqueta y filtra por categoría y disponibilidad. La ficha permite ingresos de mercadería, ajustes, edición, desactivar y eliminar. El historial de movimientos es del plan Pro.
4. **Vender:** búsqueda con fotos y elección de talla y color con el stock a la vista. El carrito tiene descuento por prenda y descuento general, y el pago es Efectivo, QR u Otro. No pide datos del cliente. Al confirmar descuenta el stock y muestra la **boleta**: PDF, WhatsApp, impresión o pantalla.
5. **Historial de ventas** (en "Más"): detalle, boleta otra vez, **anular venta** (repone el stock) y devoluciones (Pro).
6. **Reportes:** periodos Hoy, Ayer, Esta semana, Últimos 7 días, Quincena, Este mes, Mes anterior, Este año y Rango. Muestra el resumen, la evolución, la comparación con el periodo anterior, los más vendidos, las categorías, los métodos de pago y los movimientos. Se exporta a Excel (CSV) o PDF. Todo se calcula con las ventas registradas.
7. **Catálogo online** (`catalogo.html`): carrito, pedido por WhatsApp y pago con QR estático. Los pedidos pendientes solo reservan stock. En el plan Básico y con la prueba vencida muestra "no disponible" o "desactivado".
8. **Planes:** el selector de la barra superior (o `demo.html?plan=gratis|basico|pro|premium`) cambia límites y bloqueos al instante. "Más → Mi plan" muestra el consumo.

El botón **Restaurar datos** vuelve a cargar los datos originales de MioShop.

## Registro de prendas con IA (Claude)

- **Modelo:** `claude-haiku-5-5` (Claude Haiku 5.5), el modelo de Claude más económico que analiza imágenes. Se cambia con `IA_MODELO` en `.env`.
- **Dónde va la API key:** en `ANTHROPIC_API_KEY`, ya sea en `.env` o en el entorno del servidor. Solo la lee `server/server.mjs`. Nunca llega al navegador ni se guarda en `localStorage`, y `.env` está en `.gitignore`.
- **Fotos por prenda:** de 1 a 3 fotos de la misma prenda (frente, espalda, etiqueta). Van en una sola llamada y cuentan como **1 análisis**. Con la etiqueta, Claude lee marca, talla, composición, país y cuidados. La talla leída solo se sugiere: la vendedora la confirma.
- **Flujo:** el navegador reduce cada foto a 1280 px y las envía a `POST /api/ia/analizar` como `images: [{ image, media_type, vista }]`. El servidor las valida, las manda a Claude pidiendo salida JSON estructurada (`output_config.format`) y revisa la respuesta antes de devolverla.
- **Lo que sugiere:** nombre, descripción breve y detallada, tipo de prenda, categoría, color, etiquetas para búsqueda, características visibles, estilo y público. **No inventa** precios, costos, tallas ni materiales que no se vean.
- **Guardado:** `photo` es la foto principal y `photos: [{ view, src }]` guarda todas. El catálogo muestra frente y espalda, pero no la etiqueta.
- **Seguridad y límites:** solo JPG, PNG, WEBP o GIF de hasta 5 MB, con firma de archivo verificada. Por defecto se permiten 6 análisis por minuto por IP, 200 al día y 2 en paralelo. El servidor no expone `server/`, `node_modules/`, `tests/` ni `.env`.
- **Consumo y costo:** en "Inventario → Registrar prenda" se ven los créditos disponibles, y cada análisis muestra sus tokens y su costo estimado (tarifas en `.env`). `GET /api/ia/estado` devuelve el acumulado del servidor. El consumo real facturado se ve en la consola de Anthropic.

## Reglas de negocio del prototipo

- Toda variación de stock (registro, ingreso, ajuste, venta, anulación, devolución, compra, transferencia) pasa por `MF.moveStock` o `MF.setStock` y queda en `movements`. El stock de cada variante siempre coincide con la suma de sus movimientos.
- Una venta descuenta el stock de cada variante y nunca vende más de lo disponible. Si se anula, el stock se repone y la venta deja de contar en los reportes.
- Totales de venta: subtotal − descuentos por prenda − descuento general = total. Los reportes suman ambos descuentos.
- Pedidos del catálogo: *Pendiente* y *Esperando pago* solo **reservan** stock. Al confirmar el pago se crea la venta y se descuenta. Si se cancela un pedido confirmado, se anula la venta y se repone el stock.
- El QR de pago es estático y **no incluye el monto**: la clienta ve el total y la tienda confirma el pago a mano.
- La boleta es un comprobante comercial, **no una factura fiscal**.

## Dónde cambiar las cosas

| Qué | Archivo |
|---|---|
| API key, modelo, tarifa, límites de uso y puerto | `.env` (copia de `.env.example`) |
| Instrucciones a Claude y esquema JSON de respuesta | `server/ia.mjs` |
| Nombre de la plataforma, eslóganes, WhatsApp comercial | `js/config.js` → `brand` |
| Tienda de ejemplo, logo, banner, WhatsApp de la tienda | `js/config.js` → `store` |
| Endpoint de IA (si el servidor está en otro dominio) | `js/config.js` → `ai.endpoint` |
| Precios, límites, funciones por plan y tabla comparativa | `js/plans.js` |
| Productos, ventas, movimientos y demás datos de ejemplo | `js/data.js` (después de cambiarlo, suba `dataVersion` en `config.js`) |

## Imágenes de MioShop

- `assets/productos/`: las 9 fotos reales de prendas de la carpeta del cliente, reducidas a 720×960. Las otras 13 prendas de ejemplo muestran un dibujo genérico con la etiqueta "Sin foto · demo".
- `assets/logos/mio-logo.png`: recortado del flyer de MioShop, con baja resolución. Reemplácelo por el original con el mismo nombre.
- **Banner:** el catálogo arma uno con las fotos reales. Para usar el original, cópielo en `assets/banners/` y escriba su ruta en `store.banner` de `js/config.js`.

## Estructura

```
modaflow/
├── index.html, planes.html, demo.html, catalogo.html
├── server/   server.mjs (sitio + /api/ia), ia.mjs (Claude, prompt, esquema y validación)
├── css/      styles.css (marca, landing, planes, IA), dashboard.css (panel mobile first), catalogo.css (MioShop)
├── js/
│   ├── config.js, plans.js, data.js       configuración, planes centralizados y datos de ejemplo
│   ├── store.js                           base localStorage y reglas (stock, movimientos, ventas, anulaciones, pedidos, prueba)
│   ├── ui.js, icons.js, charts.js, pdf.js utilidades, iconos, gráficos SVG y PDF (boleta y reportes)
│   ├── ai.js                              fotos, análisis con IA, variantes y asistente de registro
│   ├── demo.js                            panel: barra inferior, menú, selector de plan, bloqueos, Inicio, Mi plan
│   ├── productos.js                       Registrar prenda, Inventario, ficha, ingresos, ajustes, Movimientos
│   ├── ventas.js, reportes.js             Vender, boleta, historial y anulación; Reportes
│   ├── pedidos.js, modulos.js             pedidos y catálogo; proveedores, compras, gastos, auditoría, sucursales, usuarios
│   ├── app.js, planes.js, catalogo.js     páginas públicas y tienda
│   └── vendor/                            jsPDF y jsPDF-AutoTable (copia local)
├── assets/  logos/, banners/, productos/
└── tests/
```

## Pruebas

Las pruebas **no llaman a Anthropic**: usan un sustituto local (`tests/stub-anthropic.cjs`) mediante `ANTHROPIC_BASE_URL`.

- `node tests/ia-server.test.mjs`: 57 verificaciones del servidor de IA (validaciones, varias fotos, etiqueta, límites, errores y archivos privados).
- `node --experimental-websocket tests/flows.js`: 73 verificaciones en Chrome con pantalla de celular. Cubre la navegación, los planes, el registro manual y con IA, las variantes, el inventario (vistas tarjetas, lista y tabla, y datos visibles), el punto de venta, la boleta en PDF, la anulación, los reportes, el catálogo y la prueba gratuita.
- `node --experimental-websocket tests/smoke.js <carpeta> [gratis,basico,premium]`: carga todas las páginas en escritorio y celular, revisa errores de consola y desbordes horizontales, y guarda capturas.
