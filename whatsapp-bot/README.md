# WhatsApp Bot: propuesta comercial, cotizador y prototipos

Sitio estático de **Amicornios Soft** para presentar, demostrar y cotizar una plataforma SaaS de automatización de WhatsApp Business (atención, IA, citas, catálogo, ventas, CRM, campañas y reportes).

Está hecho solo con HTML, CSS y JavaScript (sin frameworks ni backend). Los datos de demostración se guardan en `localStorage`.

## Cómo ejecutarlo

- **Directo:** abra `index.html` en el navegador. Todo funciona sin servidor, incluido el PDF, porque jsPDF está en `assets/vendor/`.
- **Con servidor estático** (recomendado para reuniones): ejecute `node tests/serve.js 8080` y abra `http://localhost:8080/`. También sirve cualquier hosting estático, como Coolify (static), Nginx o Netlify.

Solo la tipografía Inter se carga desde Google Fonts. Sin conexión se usa la fuente del sistema.

## Recorrido sugerido

1. `index.html`: landing con beneficios, funcionamiento, sectores (con chat de ejemplo) y planes.
2. `modulos.html`: detalle de cada módulo, sus dependencias y el botón "Agregar a la cotización".
3. `prototipos/index.html`: índice de las 14 demostraciones interactivas.
4. `planes.html`: paquetes y comparativa. "Personalizar plan" abre el cotizador con los módulos del plan.
5. `cotizador.html`: armado de la cotización, vista previa, impresión y PDF.

## Estructura

```
whatsapp-bot/
├── index.html, modulos.html, planes.html, cotizador.html
├── css/
│   ├── styles.css        tokens (claro/oscuro), base, layout y landing
│   ├── components.css    botones, formularios, modales, tablas, toasts, insignias
│   ├── pages.css         landing, módulos, planes y cotizador
│   ├── whatsapp.css      teléfono, burbujas, listas, flujos
│   ├── dashboard.css     panel de prototipos (barra lateral, bandeja, calendario, kanban, gráficos)
│   ├── store.css         catálogo web público
│   ├── print.css         documento de cotización (vista previa e impresión A4)
│   └── responsive.css    tablet y móvil
├── js/
│   ├── config.js         ← empresa, contacto, descuentos, asesores, tramos de contactos, condiciones
│   ├── modules.js        ← precios y alcance de cada módulo
│   ├── plans.js          ← planes comerciales (independientes de los módulos)
│   ├── pricing.js        motor de cálculo (funciones puras, probado con node)
│   ├── quote-doc.js      modelo de la cotización (lo usan la impresión y el PDF)
│   ├── pdf.js            exportación PDF con jsPDF + AutoTable
│   ├── cotizador.js, modulos-page.js, planes-page.js, landing.js
│   ├── sectors.js        ejemplos por sector (landing y simulador)
│   ├── icons.js, ui.js, storage.js, navigation.js, wa-script.js
├── prototipos/
│   ├── *.html            una página por módulo (dashboard, whatsapp, automatizaciones, ia, …, tienda)
│   └── js/
│       ├── data.js       datos ficticios ("Patitas Felices", veterinaria y pet shop)
│       ├── store.js      base de datos de demostración en localStorage
│       ├── shell.js      barra lateral, buscador global, notificaciones
│       ├── bot-engine.js motor del bot: mensajes con forma de WhatsApp Cloud API
│       ├── ai-sim.js     IA simulada (palabras clave sobre conocimiento, FAQ, productos y servicios)
│       ├── wa-phone.js   teléfono interactivo (botones, listas, flujos, adjuntos)
│       ├── charts.js     gráficos SVG propios con tooltip
│       ├── agenda-editors.js, orders-common.js
│       └── pages/*.js    lógica de cada prototipo
├── assets/               favicon y librerías locales (jsPDF 2.5.1, AutoTable 3.8.2)
└── tests/                pruebas del motor y de interacción en Chrome headless
```

## Cómo modificar precios y condiciones

Todos los importes están en bolivianos (Bs) y son referenciales.

| Qué cambiar | Archivo | Campo |
|---|---|---|
| Implementación y mensualidad de un módulo | `js/modules.js` | `implementacion`, `mensual` |
| Integración base obligatoria | `js/modules.js` | constante `BASE` |
| Plazo por módulo | `js/modules.js` | `dias` |
| Dependencias | `js/modules.js` | `requiere`, `requiereAlguno` |
| Descuentos por modalidad | `js/config.js` | `periodos[].descuento` |
| Tope de descuento promocional / total | `js/config.js` | `descuentoPromocionalMaximo`, `descuentoTotalMaximo` |
| Asesores incluidos y precio del adicional | `js/config.js` | `asesores` |
| Recargo por volumen de contactos | `js/config.js` | `tramosContactos` |
| Validez, prefijo del número, contacto | `js/config.js` | `validezDias`, `prefijoCotizacion`, `empresa` |
| Condiciones de pago, soporte, exclusiones, renovación | `js/config.js` | listas homónimas |
| Costos externos (sin importes) | `js/config.js` | `costosExternos` |
| Planes: precio, implementación, límites, módulos | `js/plans.js` | cada objeto del arreglo |

Después de cambiar precios ejecute `node tests/pricing.test.js`. Algunas pruebas verifican montos concretos y habrá que actualizarlas si cambian los precios base.

### Fórmulas del cotizador (`js/pricing.js`)

- **Mensualidad base** = suma de mensualidades de los módulos (incluida la base) + asesores adicionales × precio + recargo del tramo de contactos.
- **Descuento** = % de la modalidad + % promocional, con el tope de `descuentoTotalMaximo`. **Solo se aplica a la suscripción.**
- **Mensualidad final** = mensualidad con descuento + servicios adicionales mensuales (sin descuento).
- **Total del primer periodo** = implementación (o el monto ajustado manualmente) + servicios adicionales únicos + mensualidad final × meses del periodo.
- **Renovación** = mensualidad final × meses del periodo.
- **Plazo** = días de la base + Σ días de los módulos × `factorParalelo`, con un margen de +20 %.

Los costos de Meta, del proveedor de IA y de otros servicios se muestran aparte y no se suman al total.

## Prototipos

- Comparten una sola base de datos de demostración (`localStorage`, clave `wab:demo-db`). Una reserva hecha en el simulador aparece en Calendario, CRM y Conversaciones. Un pedido aparece en Pedidos y Ventas. Con varias pestañas abiertas, los cambios se sincronizan.
- **Restablecer datos:** desde la barra lateral ("Restablecer datos"), desde `prototipos/index.html` o en Configuración → Datos de demostración. Ahí también se puede exportar o importar el JSON.
- **Demos por sector:** `prototipos/whatsapp.html?sector=clinica` (también `gimnasio`, `tienda`, `inmobiliaria`, `instituto`, `agencia`, `profesional`).
- **Mensajes:** el simulador y el motor generan payloads con la forma conceptual de WhatsApp Cloud API (`text`, `interactive.button`, `interactive.list`, `interactive.product`, `interactive.flow`, `interactive.cta_url`, `image`). El "Inspector" del simulador los muestra.
- Si cambia la estructura de `prototipos/js/data.js`, incremente `VERSION` en `prototipos/js/store.js` (y `version` en `data.js`) para que los navegadores recarguen los datos de ejemplo.

## Pruebas

Requieren Node 20+ y Google Chrome (ruta por defecto `C:/Program Files/Google/Chrome/Application/chrome.exe`; se puede cambiar con la variable `CHROME`).

```bash
node tests/pricing.test.js                                  # 12 pruebas del motor de precios
node --experimental-websocket tests/smoke.js [carpeta]      # 19 páginas: errores de consola, desborde móvil, capturas
node --experimental-websocket tests/flows.js [carpeta]      # 35 verificaciones de flujos completos (incluye generar el PDF)
```

Las capturas y el PDF de prueba se guardan en la carpeta indicada (por defecto `tests/shots/`, que está ignorada por git).

## Limitaciones conocidas

- **Todo lo externo está simulado:** no hay conexión con WhatsApp/Meta, ningún modelo de IA, pasarela de pago ni envío de mensajes. Las pantallas lo indican de forma visible.
- La IA del prototipo responde por coincidencia de palabras clave. Sirve para mostrar el comportamiento, no la calidad de un modelo real.
- El QR de pago es un patrón decorativo, no escaneable. Los comprobantes no se suben a ningún servidor.
- Los datos viven en el navegador. En modo privado o con el almacenamiento bloqueado se pierden al recargar.
- Los precios, planes y límites son referenciales y deben confirmarse antes de enviar una cotización formal. El NIT de Amicornios Soft figura como `[Por completar]` en `js/config.js`.
- Los prototipos no son funcionalidades ya implementadas en producción.
