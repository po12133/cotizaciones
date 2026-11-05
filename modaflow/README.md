# ModaFlow: presentación comercial y prototipo interactivo

Presentación comercial de **ModaFlow** (nombre temporal), una plataforma SaaS de ventas, inventario y catálogo online para tiendas de ropa en Bolivia. Incluye demostraciones funcionales de cada plan con la tienda de ejemplo **MioShop — Moda Femenina**.

El sitio está hecho con HTML, CSS y JavaScript puro, y los datos de demostración se guardan en `localStorage` del navegador. Un servidor pequeño en Node (`server/`) sirve el sitio y conecta el **registro de prendas con Claude**, la IA de Anthropic. No hay pagos, autenticación ni otras integraciones reales.

## Cómo iniciarlo

```bash
cd cotizaciones/modaflow
npm install                 # instala el SDK oficial de Anthropic (@anthropic-ai/sdk)
cp .env.example .env        # en Windows: copy .env.example .env
# edite .env y pegue su clave en ANTHROPIC_API_KEY
npm start                   # → http://localhost:8080
```

- Sin `ANTHROPIC_API_KEY`, todo el prototipo funciona igual, pero la IA muestra "falta configurar ANTHROPIC_API_KEY".
- Si abre `index.html` directo (como archivo `file://`), funciona todo menos la IA.
- Para probar desde el celular en la misma red Wi-Fi, ponga `HOST=0.0.0.0` en `.env` y abra `http://IP-de-su-PC:8080`.

Solo las tipografías se cargan desde Google Fonts. Sin internet se usa la fuente del sistema.

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

## Registro de prendas con IA (Claude)

- **Modelo:** `claude-haiku-5-5` (Claude Haiku 5.5), el modelo de Claude más económico que analiza imágenes. Se cambia con `IA_MODELO` en `.env`.
- **Dónde va la API key:** en la variable de entorno `ANTHROPIC_API_KEY`, ya sea en el archivo `.env` o en el entorno del servidor. Solo la lee `server/server.mjs`. Nunca llega al navegador ni se guarda en `localStorage`, y `.env` está en `.gitignore`.
- **Flujo:** el navegador reduce la foto a 1280 px como máximo y la envía a `POST /api/ia/analizar`. El servidor la valida y la manda a Claude pidiendo salida JSON estructurada (`output_config.format`, con un esquema que usa las categorías y colores de la tienda). Luego revisa la respuesta antes de devolverla.
- **Datos que genera:** nombre comercial, descripción breve y detallada, categoría, tipo de prenda, color principal y secundarios, estilo, público objetivo, características visibles y etiquetas. El prompt le pide no inventar marcas, materiales ni tallas, y marcar con "Confirmar" lo que no esté claro. **Precio, costo, tallas y cantidades** siempre los escribe la vendedora.
- **Dónde se usa:**
  - **Panel → Productos → "Registrar con IA":** asistente con foto propia o de MioShop, vista previa, análisis, revisión y guardado.
  - **Panel → Productos → Nuevo o Editar → "Analizar fotografía con IA":** completa el formulario.
  - **Landing (`index.html#ia`):** el mismo asistente.
- **Casos especiales:** si la foto no tiene una prenda, se muestra un aviso. Si hay varias prendas, se sugiere fotografiarlas por separado. Los errores de conexión se muestran con un mensaje claro y el botón "Reintentar", y siempre se puede "Volver a analizar".
- **Seguridad y límites:**
  - Solo JPG, PNG, WEBP o GIF, de hasta 5 MB, con firma de archivo verificada.
  - Por defecto, 6 análisis por minuto por IP, 200 al día y 2 en paralelo (configurable en `.env`).
  - El servidor no expone `server/`, `node_modules/`, `tests/` ni archivos ocultos como `.env`.

### Consumo y costo

- **En el panel** (Productos → **Consumo de IA**, y "Ver historial"): análisis del mes, créditos restantes del plan, tokens de entrada y salida, y costo estimado. Cada análisis muestra también sus tokens y su costo.
- **Créditos:** se descuentan **solo cuando el análisis termina correctamente**. Los límites por plan son los de siempre: 20, 100, 300 y 500 al mes. Es un control demostrativo guardado en el navegador, no un sistema de facturación.
- **Costo estimado:** tokens × tarifa de `IA_PRECIO_ENTRADA_USD_MTOK` y `IA_PRECIO_SALIDA_USD_MTOK`. El `.env.example` trae la tarifa de Haiku 5.5: USD 0,10 de entrada y USD 0,50 de salida por millón de tokens, para prompts de hasta 100K tokens. Con `IA_TIPO_CAMBIO_BS` también se muestra en bolivianos. Si deja las tarifas vacías, no se muestra costo.
- **En el servidor:** cada análisis se registra en la consola con tokens, costo y duración, y `GET /api/ia/estado` devuelve el acumulado desde que se encendió.
- **Consumo real facturado:** lo muestra la consola de Anthropic, en Usage y Cost. Las cifras del prototipo son estimaciones.

## Recorrido sugerido

1. `index.html`: hero, problemas que resuelve, registro con IA, planes, demostraciones, por qué elegir ModaFlow y preguntas frecuentes.
2. `planes.html`: tarjetas completas, licencia del plan Empresarial, recomendador de plan y tabla comparativa con botones "Probar plan".
3. `demo.html`: panel de MioShop. Para cambiar de plan use el selector de la barra superior, o abra la página con `demo.html?plan=basico|pro|premium|empresarial`. Si se entra a un módulo que no está incluido en el plan, se muestra el plan que hace falta.
4. `catalogo.html`: tienda pública de MioShop con carrito, pedido por WhatsApp y pago por QR. Los pedidos aparecen en `demo.html#/pedidos`. El buscador también encuentra productos por las etiquetas que generó la IA.

El botón **Restaurar datos** del panel vuelve a cargar los datos originales.

## Dónde cambiar las cosas

| Qué | Archivo |
|---|---|
| API key, modelo, tarifa, límites de uso y puerto | `.env` (copia de `.env.example`) |
| Instrucciones a Claude y esquema JSON de respuesta | `server/ia.mjs` |
| Nombre de la plataforma, eslóganes, WhatsApp comercial | `js/config.js` → `brand` (el nombre se reemplaza en todo el sitio) |
| Tienda de ejemplo, logo, banner, WhatsApp de la tienda | `js/config.js` → `store` |
| Endpoint de IA (si el servidor está en otro dominio) | `js/config.js` → `ai.endpoint` |
| Precios, límites y funciones de cada plan, tabla comparativa | `js/plans.js` |
| Productos, ventas, clientes y demás datos de ejemplo | `js/data.js` (después de cambiarlo, suba `dataVersion` en `config.js`) |

El número de WhatsApp está vacío a propósito para no usar un número inventado. Mientras esté vacío, WhatsApp pide elegir el contacto al enviar. También se puede cargar desde el panel: **Catálogo online → Pedidos por WhatsApp**.

## Imágenes de MioShop

- `assets/productos/`: las 9 fotos reales de prendas de la carpeta del cliente, reducidas a 720×960. Las otras 13 prendas de ejemplo no tienen foto y muestran un dibujo genérico con la etiqueta "Sin foto · demo".
- `assets/logos/mio-logo.png`: el logo se recortó del flyer de MioShop, así que tiene baja resolución. Reemplácelo por el archivo original con el mismo nombre.
- **Banner:** como no había un archivo de banner, el catálogo arma uno con las fotos reales. Para usar el original, cópielo en `assets/banners/` y escriba su ruta en `store.banner` de `js/config.js`.

## Reglas de negocio del prototipo

- Una venta en el punto de venta descuenta el stock de la sucursal activa al instante.
- Los pedidos del catálogo en estado *Pendiente* o *Esperando pago* solo **reservan** stock. Al confirmar el pago se crea la venta (canal online) y se descuenta el stock. Si se cancela un pedido ya confirmado, la venta se anula y el stock se repone.
- El QR de pago es estático y **no incluye el monto**. La clienta ve el total, lo escribe en su app bancaria y adjunta el comprobante. La tienda confirma el pago manualmente; no hay verificación bancaria automática.
- En el plan Básico, el historial de ventas visible es de 30 días.

## Estructura

```
modaflow/
├── index.html, planes.html, demo.html, catalogo.html
├── package.json, .env.example, .gitignore
├── server/
│   ├── server.mjs     sitio estático + /api/ia/estado y /api/ia/analizar, límites y lectura de .env
│   └── ia.mjs         llamada a Claude (SDK oficial), prompt, esquema JSON y validación de la respuesta
├── css/  styles.css (marca ModaFlow, landing, planes, IA), dashboard.css (panel), catalogo.css (identidad MioShop)
├── js/
│   ├── config.js, plans.js, data.js       configuración, planes y datos de ejemplo
│   ├── store.js                           base localStorage y reglas (ventas, reservas, pedidos, auditoría)
│   ├── ui.js, icons.js, charts.js         utilidades, iconos SVG y gráficos SVG propios
│   ├── ai.js                              registro con IA: asistente, formulario, créditos y consumo
│   ├── app.js, planes.js                  páginas públicas
│   ├── demo.js                            panel: menú, selector de plan, bloqueos, dashboard
│   ├── productos.js, ventas.js, pedidos.js, modulos.js   módulos del panel
│   └── catalogo.js                        tienda pública
├── assets/  logos/, banners/, productos/
└── tests/
```

## Pruebas

Las pruebas **no llaman a Anthropic**. Usan un sustituto local (`tests/stub-anthropic.cjs`) que el servidor recibe mediante `ANTHROPIC_BASE_URL`, así que no hace falta API key ni se genera costo. Para probar el reconocimiento real, use `npm start` con su clave.

- `node tests/ia-server.test.mjs`: 41 verificaciones del servidor. Cubre la validación de imágenes y respuestas, la forma de la solicitud a Claude, el costo, los límites, los errores y que no se expongan archivos privados.
- `node --experimental-websocket tests/flows.js`: 44 verificaciones en Chrome. Además de los flujos del prototipo (planes, ventas, pedidos, QR), cubre el asistente de IA, el formulario, los créditos, los errores y la búsqueda por etiquetas en el catálogo.
- `node --experimental-websocket tests/smoke.js <carpeta> [basico,empresarial]`: carga todas las páginas en escritorio y celular, revisa errores de consola y desbordes horizontales, y guarda capturas.
