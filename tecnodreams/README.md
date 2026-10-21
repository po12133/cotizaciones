# TecnoDreams — Propuesta y prototipo de modernización

Propuesta comercial de **Amicornios Soft** para reemplazar la tienda actual de
TecnoDreams (WordPress + WooCommerce + Elementor) por una plataforma de comercio
electrónico propia. Incluye la presentación para el cliente, la cotización
imprimible y un prototipo navegable hecho con HTML, CSS y JavaScript sin
frameworks.

## Estructura

```text
tecnodreams/
├── index.html            Presentación comercial (español)
├── cotizacion.html       Cotización COT-TDR-001, imprimible en A4 / PDF
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
    ├── admin.html        Panel administrativo (demo)
    ├── css/styles.css    Estilos de tienda y panel
    ├── js/products.js    Catálogo central + capa de datos
    ├── js/cart.js        Carrito, favoritos, cupones, envío, pedidos y cuenta
    ├── js/app.js         Layout, buscador, tarjetas y lógica de cada página
    ├── js/admin.js       Panel administrativo
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
| Panel admin | Login demo; resumen con KPIs y gráfico; pedidos (filtro, cambio de estado, detalle, exportar CSV); productos (búsqueda, filtros, paginación, crear/editar/eliminar, activar/ocultar); categorías (crear/editar); inventario (ajuste en línea, +5/+10, alertas); clientes; cupones y ofertas; configuración de la tienda; restaurar datos demo |

Lo que se edita en el panel (precios, stock, ofertas, productos nuevos,
categorías, anuncio, WhatsApp) se refleja de inmediato en la tienda del mismo
navegador, y los pedidos hechos en el checkout aparecen en el panel y en "Mi
cuenta".

### Para probar rápido

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
  cupones, valores de envío, ventas, pedidos de ejemplo, clientes y cuenta demo.
- Las observaciones sobre el sitio actual (plugins, scripts, peso de la portada,
  tiempo de respuesta) se tomaron del código público el 20/10/2026 y son
  indicativas, no una auditoría.

## Limitaciones del prototipo

- Sin backend ni base de datos: todo se guarda en `localStorage` del navegador
  y no se comparte entre dispositivos o usuarios.
- Autenticación, pagos, envíos, e-mails y notificaciones son simulados; no se
  realiza ningún cobro ni se procesa ningún pedido real.
- El panel no sube imágenes nuevas: elige entre las fotos existentes.
- El cálculo de envío usa una tabla ilustrativa por región de CEP.
- Las páginas institucionales (FAQ, políticas, sobre nosotros) muestran un aviso
  de que se migrarán desde el sitio actual.

## Tecnologías recomendadas para producción

| Capa | Tecnología |
|---|---|
| Sitio y panel | Next.js (App Router) + TypeScript |
| Estilos | Tailwind CSS |
| Base de datos | PostgreSQL + Prisma |
| Caché, sesiones y búsquedas frecuentes | Redis |
| Despliegue | Docker (compatible con Coolify u otro servidor) |
| Imágenes | Optimización automática a WebP/AVIF |
| Pagos | Proveedor definido por TecnoDreams (por ejemplo PagBank) |

## Diferencias entre el prototipo y el sistema final

| Aspecto | Prototipo HTML | Sistema final Next.js |
|---|---|---|
| Datos | `products.js` + `localStorage` | PostgreSQL con Prisma, compartido por todos |
| Render | JavaScript en el navegador | Renderizado en servidor y páginas estáticas incrementales (mejor SEO y velocidad) |
| Usuarios | Sesión simulada | Autenticación segura, contraseñas cifradas, recuperación por e-mail, roles en el panel |
| Pagos | Formularios de demostración | Integración con el proveedor elegido y confirmación automática |
| Envío | Tabla ilustrativa | Integración con transportadora / servicio definido |
| Imágenes | Fotos ya descargadas | Subida desde el panel con compresión y varios tamaños |
| SEO | Metadatos básicos y schema.org en la ficha | Metadatos por página, sitemap, redirecciones 301 desde las URLs de WordPress |
| Migración | 86 productos copiados una vez | Importación completa desde WooCommerce con validación |
