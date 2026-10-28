# TecnoDreams 2.0 — Propuesta y prototipo

Propuesta comercial de **Amicornios Soft** para TecnoDreams 2.0: una plataforma de
comercio electrónico propia con un **sistema administrativo avanzado** para
gestionar miles de productos (importaciones masivas desde Excel vía API REST,
fotografías en Amazon S3, proveedores, precios e inventario, SEO técnico, Google
Merchant Center y migración desde WooCommerce). Incluye la presentación para el
cliente, la cotización imprimible y un prototipo navegable hecho con HTML, CSS y
JavaScript sin frameworks.

## Cotización vigente: COT-TDR-002 (27/10/2026)

| Módulo | Bs |
|---|---:|
| Arquitectura y base de datos PostgreSQL | 400 |
| Panel administrativo de productos | 1.200 |
| API REST e integración con Excel | 900 |
| Importaciones y actualizaciones masivas | 500 |
| Gestión de imágenes con Amazon S3 | 500 |
| Proveedores, precios e inventario | 500 |
| Migración desde WooCommerce | 500 |
| Catálogo público, filtros y buscador | 900 |
| Carrito, checkout y pedidos | 500 |
| SEO técnico automatizado | 400 |
| Google Merchant Center | 500 |
| Seguridad, pruebas y optimización | 400 |
| Despliegue y capacitación | 300 |
| **Subtotal** | **7.500** |
| Reserva para ajustes y contingencias | 500 |
| **Total** | **8.000** |

Pagos: 50% anticipo (Bs 4.000), 30% al avance funcional (Bs 2.400), 20% a la
entrega (Bs 1.600). Plazo máximo estimado: 2 meses (8 semanas), sujeto a la
validación de las macros de Excel y de las integraciones actuales, y a que el
cliente entregue accesos en la primera semana y revise avances en 2 días hábiles. Reemplaza a COT-TDR-001
(Bs 7.000, solo modernización de la tienda).

## Estructura

```text
tecnodreams/
├── index.html            Presentación comercial (español) con diagrama de arquitectura
├── cotizacion.html       Cotización COT-TDR-002, imprimible en A4 / PDF
├── README.md
└── prototipo/            Tienda demostrativa (portugués de Brasil, precios en R$)
    ├── index.html        Página principal
    ├── catalogo.html     Catálogo con búsqueda, filtros y orden
    ├── categoria.html    Categoría (?c=slug) o grupo (?g=slug)
    ├── producto.html     Ficha de producto (?id=ID)
    ├── carrito.html      Carrito con cupones
    ├── checkout.html     Checkout por pasos (simulado)
    ├── favoritos.html    Favoritos (también ?ids=1,2,3 para listas compartidas)
    ├── mi-cuenta.html    Área del cliente (demo)
    ├── admin.html        Panel administrativo (demo; admin.html?demo=1 entra sin login)
    ├── css/styles.css    Estilos de tienda y panel
    ├── js/products.js    Catálogo central + capa de datos
    ├── js/cart.js        Carrito, favoritos, cupones, envío, pedidos y cuenta
    ├── js/app.js         Layout, buscador, tarjetas y lógica de cada página
    ├── js/ops-data.js    Capa de operaciones del catálogo 2.0 (localStorage td_ops_v1)
    ├── js/admin-ops.js   Módulos 2.0 del panel (resumen, demos, productos, importaciones,
    │                     fotos S3, precios, SEO, Merchant, migración)
    ├── js/admin.js       Panel: navegación, pedidos, ventas, categorías, inventario,
    │                     clientes, promociones y configuración
    └── assets/           Imágenes optimizadas (WebP) de productos, banners y marca
```

## Cómo ejecutarlo

No requiere instalar dependencias. Sirva la carpeta `tecnodreams/` con cualquier
servidor HTTP estático y abra `index.html`:

```bash
# Python
python -m http.server 8000
# Node
npx serve .
```

También funciona con la extensión Live Server de VS Code. Las rutas son
relativas, por lo que la carpeta se puede mover o publicar en cualquier
subdirectorio. Las fuentes (Google Fonts) y el autocompletado de dirección por
CEP (ViaCEP) necesitan conexión a internet; sin ella, la página usa fuentes del
sistema y el formulario se completa a mano.

## Páginas y funcionalidades del prototipo

| Página | Qué se puede hacer |
|---|---|
| Principal | Banner rotativo (flechas, puntos, deslizar), categorías, más populares, ofertas, novedades, marcas, punto de retiro, newsletter simulado |
| Header (todas) | Buscador con sugerencias de productos, categorías y marcas (navegable con teclado y búsquedas recientes), megamenú, menú móvil, contador de favoritos, minicarrito lateral |
| Catálogo / Categoría | Filtros por categoría, marca, rango de precio (deslizador doble), disponibilidad y ofertas con conteos en vivo; chips de filtros activos; orden por relevancia, precio, nombre, novedad o descuento; vista de cuadrícula o lista; "Cargar más"; filtros guardados en la URL; skeleton de carga |
| Producto | Galería con miniaturas, zoom, lightbox y deslizamiento; precio anterior y % de descuento; stock; variantes de color; cantidad; agregar al carrito; comprar ahora; favoritos; consulta por WhatsApp; cálculo de envío por CEP; descripción, especificaciones y entrega en pestañas; relacionados; vistos recientemente; barra de compra fija en móvil; datos estructurados schema.org |
| Carrito | Cambiar cantidades (limitadas al stock), eliminar con "Deshacer", mover a favoritos, vaciar, cupón (`DEMO10`, `SETUP150`), totales, sugerencias |
| Checkout | 3 pasos con validación (nombre, e-mail, teléfono, CPF con dígito verificador, CEP); dirección autocompletada vía ViaCEP; retiro / entrega estándar / exprés; Pix o tarjeta (Luhn, vencimiento, CVV); confirmación con QR ilustrativo |
| Favoritos | Guardar/quitar, agregar todos al carrito, compartir lista por enlace, vaciar |
| Mi cuenta | Login/registro simulado o "conta de demonstração"; resumen, pedidos con línea de tiempo y "comprar de nuevo", datos personales, direcciones (CRUD con CEP), favoritos |
| Panel admin | Ver la sección siguiente |

## Panel administrativo 2.0 (en portugués, como el resto del prototipo)

| Sección | Qué demuestra |
|---|---|
| Resumo do catálogo | Total, publicados, borradores, sin disponibilidad, incompletos, sin fotos, pendientes en Google; últimas importaciones, cambios de precio y errores; salud del catálogo |
| Demonstrações | Recorrido de 10 pasos: importar 300 productos, detectar duplicados, +5% en 100 precios, pasar a borrador, asociar fotos, sin SZ.webp, sincronizar con Google, central de errores, productos actualizados, filtros |
| Produtos | Tabla con foto, SKU, nombre, categoría, marca, proveedor, precio R$, disponibilidad, publicación, fotos, Google y última actualización; búsqueda por SKU/nombre, filtros, orden, paginación 25/50/100, selección múltiple (página o todos los filtrados), publicar, borrador, cambio de precios, edición masiva, envío a Google, eliminar, detección de duplicados, editor individual y exportación CSV |
| Importações e sincronização | Lectura **real** de CSV (separador ; o , — UTF-8 o Windows-1252), planilla modelo de 300 filas, recepción por API REST simulada, prueba de volumen 300/1.000/3.000, vista previa con validación (SKU, precio, categoría, duplicados en el archivo, SKU parecidos), nuevos vs existentes, barra de progreso, resumen, historial y detalle de errores exportable |
| Fotografias (S3) | Carpeta `productos/SKU/` con S1 (principal), galería S2…Sn y SZ (Google); reordenar, definir principal, reemplazar con archivo o simulado, versión y URL versionada `?v=N`, estado de sincronización, productos sin SZ o sin SKU |
| Preços e estoque | Proveedor, costo, venta, margen, moneda, disponibilidad, publicación y última sincronización; precios y disponibilidad masivos, reglas “sin disponibilidad → borrador” y “publicar disponibles”, registro de cambios y errores |
| SEO | Indexables, no indexables, sin metadescripción, sin imágenes, sin ALT, URLs duplicadas; sitemap.xml y robots.txt; vista previa de Google y JSON-LD (Product, Offer, BreadcrumbList); metas automáticas |
| Google Merchant Center | Sincronizados, pendientes, errores, sin SZ, rechazados; validación previa, estados enviado → procesado y, solo con el botón “Simular resposta do Google”, aprobado/rechazado (marcados como simulados); reintentos e historial |
| Migração WooCommerce | Detectados, importados, omitidos, con avisos, fotos migradas, validación; etapas animadas, datos migrados y mapa de 301 de ejemplo |
| Vendas, Pedidos, Categorias, Inventário, Clientes, Promoções, Configuração | Módulos de la versión anterior, sin cambios funcionales (el antiguo resumen de ventas pasó a “Vendas”) |

Los cambios de nombre, precio, stock y publicación de productos **reales** hechos
en el panel (incluidas las 20 actualizaciones de la planilla de prueba) se
reflejan en la tienda del mismo navegador. Los productos importados de prueba
(SKU `TDX-…`, etiqueta “Teste”) existen solo en el panel.

Lo que se edita en el panel (precios, stock, ofertas, productos nuevos,
categorías, anuncio, WhatsApp) se refleja de inmediato en la tienda del mismo
navegador, y los pedidos hechos en el checkout aparecen en el panel y en "Mi
cuenta".

### Para probar rápido

0. Abra `prototipo/admin.html?demo=1#demos` y ejecute los 10 pasos en orden.

1. Abra un producto, agréguelo al carrito y aplique el cupón `DEMO10`.
2. Finalice la compra con CPF `529.982.247-25`, CEP `01310-100` y, si elige
   tarjeta, `4111 1111 1111 1111` (tarjeta de prueba; no se cobra nada).
3. Entre a `admin.html` (credenciales ya completadas), cambie el estado del
   pedido o ponga un producto en oferta y vuelva a la tienda.
4. "Restaurar demo" en el panel borra todos los cambios de este navegador.

## Origen de los datos

- **Reales** (Store API pública de tecnodreams.com, consultada el 20/10/2026):
  86 productos con nombre, marca, SKU, precio en R$, precio anterior en ofertas,
  disponibilidad, fotos, destacados y fichas técnicas; categorías; banners;
  dirección, teléfono, CNPJ, redes sociales y medios de pago del footer.
  Se incluyó la línea de Tecnologia & Gaming (salvo los 4 productos con precio
  de prueba indicados abajo) y una muestra de 14 productos
  de Cozinha.
- **Normalización de demostración**: nombres sin "_" ni código de proveedor;
  colores del mismo modelo agrupados como variantes; se excluyeron 4 productos
  con precios de prueba (R$ 1, R$ 15, R$ 50 y R$ 100). Los 7 mouses Redragon
  publicados sin precio aparecen como "preço sob consulta".
- **Demostrativos** (claramente marcados en la interfaz): cantidades en stock,
  cupones, valores de envío, ventas, pedidos de ejemplo, clientes y cuenta demo;
  en la versión 2.0 también proveedores (Fornecedor Alfa, Importadora Beta…),
  costos, presencia de SZ.webp y metadescripciones de los productos reales, los
  productos importados de prueba con sus imágenes SVG, los estados de Google y
  la URL de CloudFront (`dxxxxxxxxxxxxx.cloudfront.net`, ilustrativa).
- El dato de 145 productos detectados en el sitio proviene de la revisión del
  20/10/2026; la migración del panel es una animación simulada.
- Las observaciones sobre el sitio actual (plugins, scripts, peso de la portada,
  tiempo de respuesta) se tomaron del código público el 20/10/2026 y son
  indicativas, no una auditoría.

## Limitaciones del prototipo

- Sin backend ni base de datos: todo se guarda en `localStorage` del navegador
  (`td_admin_v1` para la tienda, `td_ops_v1` para el catálogo 2.0) y no se
  comparte entre dispositivos o usuarios. “Restaurar demo” borra ambos.
- **No hay conexiones reales** con Excel, AWS ni Google, ni credenciales: la API
  REST, las subidas a S3, CloudFront y Merchant Center son simulaciones
  señalizadas con la etiqueta “Simulado”. Solo la lectura de CSV es real.
- Los archivos .xlsx/.xlsm no se leen en el prototipo (se pide guardarlos como
  CSV); el backend final sí los procesará.
- Las imágenes subidas en “Fotografias” se reducen a 320 px y se guardan solo en
  el navegador.
- Autenticación, pagos, envíos, e-mails y notificaciones son simulados; no se
  realiza ningún cobro ni se procesa ningún pedido real.
- El cálculo de envío usa una tabla ilustrativa por región de CEP.
- Las páginas institucionales (FAQ, políticas, sobre nosotros) muestran un aviso
  de que se migrarán desde el sitio actual.

## Tecnologías recomendadas para producción

| Capa | Tecnología |
|---|---|
| Tienda y panel | Next.js + TypeScript |
| Backend y API REST | NestJS |
| Base de datos | PostgreSQL + Prisma |
| Caché y colas de trabajos | Redis |
| Fotografías | Amazon S3 (URLs firmadas para subida, bucket privado) + CloudFront |
| Google | Merchant API o feed automático, en un proceso independiente y supervisado |
| Despliegue | Docker Compose (compatible con Coolify u otro servidor) |
| Pagos | Proveedor definido por TecnoDreams (por ejemplo PagBank) |

## Integraciones pendientes para producción

- API REST en NestJS con token para las macros, y validación/adaptación de las macros actuales.
- Lectura de .xlsx/.xlsm en el backend y procesamiento en cola (Redis) con reintentos.
- Bucket S3 privado, URLs pre-firmadas para subir, distribución por CloudFront, conversión a WebP y versionado; credenciales solo en el servidor.
- Google Merchant Center: elegir Merchant API o feed, cuenta y verificación del dominio, y lectura real de estados aprobado/rechazado.
- Migración real desde WooCommerce, datos SEO del plugin actual e inventario completo de URLs para los 301.
- Autenticación, roles y auditoría del panel; pasarela de pago y transportadora.

## Diferencias entre el prototipo y el sistema final

| Aspecto | Prototipo HTML | Sistema final Next.js |
|---|---|---|
| Datos | `products.js` + `localStorage` | PostgreSQL con Prisma, compartido por todos |
| Render | JavaScript en el navegador | Renderizado en servidor y páginas estáticas incrementales (mejor SEO y velocidad) |
| Usuarios | Sesión simulada | Autenticación segura, contraseñas cifradas, recuperación por e-mail, roles en el panel |
| Pagos | Formularios de demostración | Integración con el proveedor elegido y confirmación automática |
| Envío | Tabla ilustrativa | Integración con transportadora / servicio definido |
| Imágenes | Fotos descargadas + SVG de prueba; S3 simulado | S3 por SKU (S1…Sn, SZ) con URLs versionadas y CloudFront |
| Excel | Lectura de CSV en el navegador; API simulada | Macros que envían a la API REST; upsert por SKU en PostgreSQL |
| Google | Estados simulados | Merchant API o feed con estados reales |
| SEO | Metadatos básicos y schema.org en la ficha | Metadatos por página, sitemap, redirecciones 301 desde las URLs de WordPress |
| Migración | 86 productos copiados una vez | Importación completa desde WooCommerce con validación |
