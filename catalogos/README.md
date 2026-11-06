# Catalogia · Prototipo SaaS de catálogos digitales

Este prototipo contiene la presentación comercial y una simulación funcional de una plataforma SaaS: el comerciante conecta su **Google Sheets** (productos) y su **Google Drive** (imágenes), configura las columnas, diseña su catálogo y recibe consultas por **WhatsApp**.

"Catalogia" es un **nombre temporal**. Se cambia en un solo lugar: `js/config.js` (`CA.CONFIG.brand`).

> **Prototipo de demostración.** Todo funciona en el navegador con HTML, CSS y JavaScript sin frameworks, y guarda los datos en **LocalStorage**. No hay conexión real con Google, no hay pagos y la autenticación es simulada: las contraseñas no se guardan. LocalStorage no es un mecanismo seguro de autenticación ni de control de suscripciones.

## Cómo abrirlo

- Abre `index.html` directamente en Chrome o Edge, o
- levanta un servidor local:
  ```bash
  node tests/serve.js 8080
  # Landing:        http://localhost:8080/
  # Panel demo:     http://localhost:8080/dashboard.html?demo=1
  # Superadmin:     http://localhost:8080/admin.html
  # Catálogo demo:  http://localhost:8080/catalogo.html?c=tecnostore
  ```

## Recorrido para presentar

1. **Landing** (`index.html`): hero con mockup, 5 pasos, beneficios, 4 plantillas que abren catálogos reales, planes con selector mensual/anual, prueba de 14 días y preguntas frecuentes.
2. **Registro** (`registro.html`): con correo o con Google (simulado). Luego se elige el plan; los planes pagos usan un pago simulado.
3. **Integraciones**: "Conectar Google Sheets" muestra una pantalla de autorización simulada. Después eliges el archivo y la pestaña, con vista previa de filas.
4. **Mapeo de columnas**: el mapeo se sugiere automáticamente y se puede ajustar con desplegables. Eliges atributos y filtros y ves cómo quedan los productos. La validación muestra un **SKU duplicado**, **datos faltantes** e **imágenes no encontradas**. "Guardar y sincronizar" lanza la sincronización con progreso visual.
5. **Google Drive**: explorador de carpetas con vista previa de imágenes. "Usar esta carpeta" asocia las fotos por nombre de archivo (LAP-001.jpg) y la galería con -2 y -3.
6. **Productos**: tabla con búsqueda, filtros, orden, paginación y detalle. **Editar** cambia la fila de la hoja simulada y sincroniza al instante.
7. **Catálogos**: crear (con selector de plantilla), configurar, duplicar, eliminar, publicar y compartir el enlace. **Publicar el primer catálogo activa la prueba Profesional de 14 días.**
8. **Editor de diseño**: plantilla, colores, tipografía, botones, logo, banner, menú, orden y visibilidad de secciones, destacados, columnas, tarjetas y footer. La vista previa está en vivo, en escritorio, tablet y móvil.
9. **WhatsApp**: uno o varios números (según el plan), mensaje con variables `{producto} {precio} {sku} {catalogo} {url} {vendedor}`, textos de los botones y botón flotante. Genera enlaces **wa.me reales**.
10. **Catálogo público** (`catalogo.html?c=…`): buscador, categorías, filtros por atributos, orden, modal o página individual del producto, botones de WhatsApp y **lista de consulta**, que envía varios productos en un solo mensaje. Es una lista, no un carrito: no hay checkout.
11. **Mi suscripción**: plan y uso de límites. Puedes cambiar de plan (los límites se aplican al instante), cancelar o reanudar, ver el historial de pagos simulado y usar el botón **"Simular fin de la prueba"**.
12. **Superadministrador** (`admin.html`): MRR/ARR, cuentas, suscripciones, pruebas por vencer, suspender o activar cuentas, otorgar días de prueba y editar los límites por plan.

Cuenta demo: botón "Entrar con la cuenta demo" en `login.html`, o `dashboard.html?demo=1`. Para volver al estado inicial usa el menú de usuario → **Restablecer demostración**.

## Datos de demostración

- **TecnoStore Bolivia** (cuenta demo): hoja de 40 filas. Tiene 36 productos de tecnología en laptops, computadoras, monitores, teclados, mouse, componentes y accesorios, más 4 filas con errores intencionales. Está en el plan Gratis con la prueba Profesional en curso y tiene 2 catálogos.
- **Moda Urbana** (plantilla Atelier, Profesional anual, página individual de producto), **Glow Belleza** (Glow, Inicial) y **Distribuidora Andina** (Mayorista, Empresa, 3 vendedores de WhatsApp).
- 24 cuentas sintéticas que solo alimentan las métricas del superadministrador.
- Las imágenes son ilustraciones SVG generadas por código (`js/images.js`), así que nunca aparecen rotas. Además hay una imagen de respaldo para referencias inválidas.

## Reglas de planes implementadas

| | Gratis | Inicial | Profesional | Empresa |
|---|---|---|---|---|
| Productos visibles | 30 | 100 | 1.000 | 10.000 |
| Catálogos | 1 | 1 | 3 | 10 |
| Plantillas | Nova | Nova y Glow | Todas | Todas |
| Categorías visibles | 3 | ∞ | ∞ | ∞ |
| Personalización | Estilo de la plantilla | Colores, logo, banner, footer, destacados | Completa | Completa |
| Página de producto, dominio propio | — | — | ✓ | ✓ |
| Estadísticas | — | — | Básicas | Avanzadas |
| WhatsApp | 1 número | 1 | 1 | Hasta 5 |

- La prueba Profesional dura 14 días, se activa al publicar el primer catálogo y no pide tarjeta. Al terminar se vuelve a Gratis **conservando todos los datos**. Lo que excede el plan no se muestra en el catálogo público y el panel lo advierte.
- Los límites se pueden ajustar desde el superadministrador.

## Estructura

```text
catalogos/
├── index.html · login.html · registro.html · dashboard.html · catalogo.html · admin.html
├── css/   global · landing · auth · dashboard · editor · catalogo
├── data/  plans.js (planes y límites) · templates.js (plantillas) · products.js (hojas y carpetas simuladas)
├── js/
│   ├── config.js        configuración central (nombre, dominio, prueba)
│   ├── storage.js       LocalStorage, sesión simulada, reglas de planes y prueba
│   ├── images.js        ilustraciones SVG de productos e imagen de respaldo
│   ├── products.js      mapeo de columnas, sincronización y validación
│   ├── catalogs.js      catálogos, publicación y diseño efectivo según el plan
│   ├── subscriptions.js cambio de plan, cancelación y prueba
│   ├── analytics.js     estadísticas simuladas + eventos reales del catálogo
│   ├── whatsapp.js      mensajes con variables y enlaces wa.me
│   ├── seed.js          datos de demostración
│   ├── ui.js            componentes (modales, toasts, formularios, gráficos)
│   ├── landing.js · auth-demo.js · app.js · integrations.js · editor.js · superadmin.js
│   ├── render.js        motor de render de las 4 plantillas
│   ├── catalog-public.js catálogo público
│   └── views/           productos · catálogos · WhatsApp · estadísticas · suscripción
└── tests/   flows.js (recorrido completo) · smoke.js (todas las pantallas) · serve.js
```

## Pruebas

Requieren Node 20 o superior y Google Chrome.

```bash
node --experimental-websocket tests/flows.js          # recorrido completo: 68 verificaciones
node --experimental-websocket tests/smoke.js shots    # todas las pantallas en escritorio y móvil
```

## Hacia la versión comercial

- Integrar la API de Google Sheets y la de Google Drive con OAuth real (solo lectura) y sincronización programada en un backend.
- Usar una base de datos multiusuario y autenticación real (contraseñas con hash, Google Sign-In).
- Conectar una pasarela de pago boliviana para las suscripciones.
- Agregar subdominios por catálogo, dominios propios con SSL automático y caché de imágenes en CDN.
- Medir estadísticas con eventos reales en el servidor.
