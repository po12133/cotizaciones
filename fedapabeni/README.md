# Propuesta FEDAPABENI — Cotización y prototipo

Propuesta técnica y económica de **Amicornios Soft** para la convocatoria de IPHAE: *Diseño, desarrollo e implementación de una página web comercial para FEDAPABENI*. Incluye un prototipo navegable de la plataforma y un panel administrativo de demostración.

Todo está hecho con HTML5, CSS3 y JavaScript sin frameworks. Las librerías externas se cargan por CDN.

| Página | Ruta |
|---|---|
| Cotización (exportable a PDF) | `index.html` |
| Prototipo de la plataforma | `prototipo/index.html` |
| Panel administrativo (demo) | `prototipo/admin/index.html` |

## Ejecutar localmente

Use un servidor estático. Si abre los archivos con doble clic (`file://`), el PDF puede salir sin imágenes y el mapa puede no cargar.

```bash
cd cotizaciones/fedapabeni
npx serve .            # o: python -m http.server 8080
```

Luego abra `http://localhost:3000/` (o el puerto que indique el comando). También funciona la extensión **Live Server** de VS Code.

Necesita conexión a internet para Google Fonts, Leaflet y los mosaicos de OpenStreetMap, html2canvas/jsPDF (exportación a PDF) y uno de los dos videos de la galería.

## Cotización (`index.html`)

### `datos.json`: el único archivo que hay que tocar

Todo lo que cambia de una cotización a otra está en [`datos.json`](datos.json). Al recargar la página, se recalcula todo:

| Clave | Qué controla |
|---|---|
| `campos` | Número de cotización, fecha, vigencia, datos de la empresa (razón social, NIT, representante…), URL del prototipo y nombres del equipo (`team1`…`team4`). Un valor vacío `""` aparece como `[Por completar: …]`. |
| `plazo.diasCalendario` | Días de trabajo. Se usa en portada, carta, KPI, cronograma, condiciones y PDF. |
| `plazo.maximoTdr` · `garantiaDias` · `hostingMeses` | Máximo de días exigido (20), días de garantía (90) y meses de hosting (12). |
| `plazo.fechaInicio` | Fecha de orden de inicio (`"2026-10-20"`) para mostrar fechas reales en lugar de “Día N”. Vacío = días relativos. |
| `techo` | Techo presupuestario (37000). |
| `presupuesto.items[].monto` | Monto de cada rubro. También se puede cambiar `concepto`, `descripcion`, `grupo` y `componente`. |
| `fases[]` | Cronograma: `inicio` y `fin` (día), `entregas` (días con ◆), responsables, actividades y productos. |
| `entregables[].dia` | Día de entrega de cada producto P1–P11. |
| `pagos[]` | `porcentaje` y `dia` de cada pago. Si no suman 100 %, la tabla lo avisa. |

Al cambiar `plazo.diasCalendario`, revise también los `inicio`/`fin` de `fases`, los `dia` de `entregables` y `pagos`, que no se ajustan solos. El cronograma se ensancha si alguna fase pasa del plazo, y el texto avisa si el plazo no es inferior al máximo de los TDR.

`datos.json` se carga con `fetch`, así que la cotización **debe abrirse con un servidor estático** (ver arriba); con doble clic aparece un aviso.

### Edición en la página

- **Campos editables:** el texto resaltado con subrayado dorado (NIT, representante, nombres del equipo, fecha, etc.) se edita haciendo clic sobre él. Los campos vacíos se ven como `[Por completar: …]`, también en el PDF.
- **Presupuesto:** los montos se pueden modificar. Los subtotales, los porcentajes, el total, el monto en letras, el desglose por componentes del TDR y la forma de pago se recalculan solos. Si el total pasa el techo de Bs 37.000, aparece un aviso.
- **Cronograma:** si indica la *fecha de orden de inicio*, se calculan las fechas reales de cada fase y entregable.
- **URL del prototipo:** en la sección “Prototipo” se escribe la URL pública, que luego aparece en el PDF. Si la cotización ya está publicada en un dominio, la URL se completa sola.
- Los cambios hechos en la página se guardan en el navegador (`localStorage`) y son solo temporales. Para descartarlos, use “Restablecer campos editados” en el pie de página. **Cuando `datos.json` cambia, se descartan solos** y manda el JSON, así que lo definitivo conviene escribirlo en el archivo.
- **Exportar cotización a PDF:** genera `cotizacion-fedapabeni-amicornios-soft.pdf` en tamaño A4 (unas 18 páginas, ~6 MB). Incluye portada, encabezado, pie con “Página X de N”, ningún bloque cortado entre páginas, enlaces clicables y los montos editados. Los botones y controles no aparecen en el PDF.

## Prototipo (`prototipo/`)

Es una aplicación de una sola página que navega por hash (`#/catalogo`, `#/asociacion/acopalt`, …). Contiene inicio, nosotros (módulo institucional y “Bosque en Pie”), directorio con filtros, perfiles, catálogo con filtros, orden y paginación, fichas de producto, mapa Leaflet, noticias y ferias, galería con visor ampliado y videos, contacto o solicitud de compra con validación, búsqueda global y créditos.

- **WhatsApp:** no se usa ningún número inventado. Mientras no se configure uno en el panel (*Configuración*, o en cada organización), el enlace abre WhatsApp para que el visitante elija el contacto.
- **Formularios:** los envíos se guardan en el navegador y se ven en el panel, sección *Consultas*. No se envía ningún correo.

## Panel administrativo (`prototipo/admin/`)

Es solo una **demostración**: no tiene autenticación ni servidor. Permite crear, editar y eliminar asociaciones, productos, categorías, noticias y elementos de la galería, cambiar el estado de las consultas y editar la configuración del sitio. Los datos se guardan en `localStorage` y el prototipo público los refleja de inmediato. *Restaurar datos de ejemplo* vuelve al estado inicial y *Exportar JSON* descarga los datos.

## Estructura

```text
fedapabeni/
├── datos.json                 Datos editables de la cotización (campos, montos, días)
├── index.html                 Cotización
├── prototipo/index.html       Prototipo público
├── prototipo/admin/index.html Panel demo
├── css/  cotizacion.css · prototipo.css · admin.css
├── js/   cotizacion.js (contenido; lee datos.json) · pdf.js (exportación A4)
│         prototipo.js · admin.js · data.js (datos demo) · store.js (localStorage) · icons.js (SVG)
└── assets/ images/ · video/ · logos/ · icons/ · creditos.json
```

## Datos y fuentes

- **Fuente prioritaria:** los Términos de Referencia oficiales ([boletín CEBEM](https://cebem.org/boletin/2026/IPHAE_1/boletin.html) y su [PDF](https://cebem.org/boletin/2026/IPHAE_1/TDR_Pagina_Web_Comercial_FEDAPABENI_IPHAE.pdf)).
- **Datos demostrativos:** las siglas de las asociaciones salen de los TDR (§6.5). Sus descripciones, ubicaciones, capacidades, contactos, productos y noticias son ficticios y están marcados como tales. Los dos “emprendimientos (ejemplo)” son inventados.
- **Datos de Amicornios Soft:** el correo, el WhatsApp, la ciudad, las tecnologías y el portafolio provienen de [soft.amicornios.com](https://soft.amicornios.com/). La razón social, el NIT, el representante y los nombres del equipo quedan como campos por completar.
- **Imágenes y videos:** provienen de Wikimedia Commons, con licencias CC0, CC BY o CC BY-SA, y su detalle está en `assets/creditos.json` y en `#/creditos`. No son de FEDAPABENI y deben reemplazarse por material propio.
- **Logos:** los dos SVG son provisionales. Reemplace `assets/logos/*.svg` por los oficiales.

## Pendientes antes de enviar

1. Completar en la cotización la razón social, el NIT, el representante legal, el equipo y el responsable de recepción.
2. Publicar el prototipo (por ejemplo en Coolify, Netlify o GitHub Pages) y cargar su URL pública antes de exportar el PDF.
3. Confirmar el régimen de facturación y retenciones, y la extensión del dominio.
4. Revisar la forma de pago de referencia (30/40/30), que es negociable.
