# CorePoints · Prototipo del programa de fidelización de CatCore

Prototipo navegable de **CorePoints**, el programa de puntos que se integraría después en [catcorebo.com](https://catcorebo.com/) como plugin de WordPress. Permite recorrer el flujo completo del cliente y del administrador: registrar una boleta con foto, verificarla, acreditar puntos, canjear recompensas y gestionar vencimientos.

> **Importante:** es un prototipo solo de frontend. Los datos se guardan en el navegador: los registros en **LocalStorage** y las imágenes en **IndexedDB**. No hay base de datos compartida ni autenticación segura. Todos los datos son ficticios; no ingreses información personal real.

## Cómo abrirlo

- **Opción 1:** abrir `index.html` (portal) o `admin/index.html` (panel) directamente en Chrome o Edge.
- **Opción 2 (recomendada):** servidor local con Node:
  ```bash
  node tests/serve.js 8080
  # Portal:  http://localhost:8080/
  # Panel:   http://localhost:8080/admin/
  ```

El portal y el panel comparten los datos si se abren **en el mismo navegador**. Si están en dos pestañas, los cambios de una se reflejan en la otra.

La primera vez se generan automáticamente los datos de demostración: 10 clientes, 5 vendedoras, 20 compras con fotos de boleta, 12 recompensas, 8 canjes, movimientos y puntos próximos a vencer. Para volver al estado inicial usa **Panel → Configuración → Restablecer**.

## Recorrido sugerido

1. **Portal → Registrar compra.** El cliente solo ingresa su WhatsApp y correo (opcional), y sube la foto de la boleta (arrastrar, elegir archivo o cámara del celular). Puede agregar una captura del chat. Se crea la solicitud `SOL-XXXXXX` en estado *Pendiente de verificación* y, si el número de WhatsApp es nuevo, el perfil del cliente.
2. **Panel → Compras.** Abre la solicitud y revisa la boleta en el visor (zoom, cambio entre imágenes, descarga). Transcribe los datos de la boleta (número, fecha, monto de Bs 5.000, vendedora y, si quieres, el producto) y aprueba. El cliente recibe 500 CorePoints con vencimiento a 12 meses.
3. **Portal → Mis puntos.** Ingresa solo con el número de WhatsApp, sin código de verificación. Ahí ves saldo, gráficos, historial de compras, movimientos, canjes y notificaciones.
4. **Portal → Recompensas.** Canjea el mouse de 350 pts. Los puntos quedan reservados y se genera el código `CNJ-XXXX-00`.
5. **Panel → Canjes.** Aprueba el canje, márcalo *Listo para recoger* y luego *Entregado*. El cliente queda con 150 pts.
6. **Panel → Movimientos → Ejecutar vencimientos.** Marca como vencidos los puntos cuya fecha pasó y genera los avisos de puntos por vencer. En **Configuración** puedes adelantar el reloj de demostración (+30, +90 o +365 días) para provocar vencimientos.

Cuentas de demostración para el portal (también aparecen como botones en la pantalla de ingreso): `76011201`, `77022302`, `69033403`, `78044504`.

## Qué incluye

**Portal del cliente** (`index.html`)
- Página del programa: proceso en 5 pasos, calculadora de puntos, cómo canjear, caducidad y preguntas frecuentes.
- Registro de compras simplificado: solo datos de contacto y fotos. El borrador se guarda automáticamente (incluidas las fotos) y hay pantalla de confirmación. Los datos de la compra los registra CatCore al verificar.
- Carga de imágenes: arrastrar y soltar, explorador de archivos, cámara del celular, vista previa, reemplazar, quitar, validación JPG/PNG/WEBP, límite de tamaño configurable y compresión automática (máximo 1.800 px).
- Consulta de puntos ingresando solo el número de WhatsApp: disponibles, pendientes, reservados, utilizados, por vencer y vencidos; gráficos e historiales.
- Tienda de recompensas con filtros por categoría, tipo, rango de puntos y "puedo canjear"; canje con confirmación y cancelación de canjes pendientes.

**Panel administrativo** (`admin/index.html`)
- Dashboard con 10 indicadores, gráficos mensuales, distribución de puntos, ranking de vendedoras, pendientes y próximos vencimientos.
- Compras: filtros, búsqueda y detalle con visor de imágenes. La verificación es un formulario junto a la foto donde se transcriben número de boleta, fecha, monto y vendedora, con cálculo de puntos en vivo y aviso inmediato si la boleta ya fue acreditada. Rechazo con motivo obligatorio. Exportación a CSV.
- Canjes: aprobar, rechazar, listo para recoger, entregar y cancelar, con historial de cada cambio.
- Clientes: ficha con compras, canjes, movimientos y lotes de acreditación; edición de datos y ajustes manuales con motivo obligatorio.
- Vendedoras: alta y edición, activar o desactivar, estadísticas, boletas asociadas y exportación preparada para comisiones.
- Recompensas: crear, editar, activar o desactivar y eliminar (solo si no tiene canjes), con imagen subida a IndexedDB o ilustración incluida.
- Movimientos: historial auditable con filtros, exportación y proceso de vencimiento.
- Notificaciones: registro de eventos con vista previa del correo (plantilla HTML) y del mensaje de WhatsApp.
- Configuración: Bs por punto, vigencia, monto mínimo, bono de primera compra, aviso de vencimiento, tamaño máximo de imagen, activar o desactivar registro y canjes, reloj de demostración y restablecimiento de datos.

## Reglas de negocio implementadas

| Regla | Implementación |
|---|---|
| Bs 10 = 1 CorePoint, redondeo hacia abajo | `CP.points.calc` (`Math.floor`) |
| Puntos solo al aprobar la compra | `CP.purchases.approve` crea el lote de puntos |
| Una compra no se acredita dos veces | Valida el estado y la existencia del lote |
| Boleta duplicada | Se controla al verificar: no se puede aprobar un número de boleta ya acreditado. El número se normaliza (`nv 777001` = `NV-777001`). Las boletas rechazadas no bloquean |
| Vendedora | Se asigna al verificar la boleta; las estadísticas por vendedora cuentan solo ventas verificadas |
| Nombre del cliente | El portal no lo pide: el perfil se crea como "Cliente 1234" (últimos dígitos del WhatsApp), marcado "sin nombre" en el panel hasta que el administrador lo complete en la ficha |
| Vigencia por acreditación | Cada aprobación crea un *lote* con su propia fecha de vencimiento |
| FEFO | Los canjes y ajustes negativos consumen primero los lotes que vencen antes |
| Reserva de puntos | Al solicitar un canje se descuentan del disponible y se reserva el stock; al rechazar o cancelar se devuelven |
| Vencidos fuera del saldo | Un lote vencido no cuenta en el saldo aunque el proceso no se haya ejecutado; el proceso lo registra y notifica |
| Configuración no retroactiva | Cada compra guarda la regla aplicada y cada lote su vencimiento |
| Bono de primera compra | Configurable; en 0 por defecto para que los escenarios den 500 y 150 pts exactos |
| Auditoría | Cada operación genera un movimiento con el saldo resultante y quién la hizo |

## Estructura

```text
catcore-rewards/
├── index.html                 Portal del cliente
├── admin/index.html           Panel administrativo
├── assets/
│   ├── css/main.css           Sistema visual + portal
│   ├── css/admin.css          Diseño del panel
│   ├── images/                Logo e ícono de CatCore
│   └── js/
│       ├── storage.js         BD en LocalStorage, utilidades, reloj de demo, configuración
│       ├── database.js        Imágenes en IndexedDB: validación, compresión, descarga
│       ├── points.js          Lotes, FEFO, saldos, ajustes y vencimientos
│       ├── customers.js       Clientes y vendedoras
│       ├── purchases.js       Registro, aprobación y rechazo de compras
│       ├── rewards.js         Catálogo de recompensas e ilustraciones
│       ├── redemptions.js     Canjes y flujo de estados
│       ├── notifications.js   Eventos y plantillas de correo y WhatsApp
│       ├── seed.js            Datos de demostración (ejecuta las operaciones reales)
│       ├── ui.js              Componentes: modales, cargador, visor, gráficos
│       ├── app.js             Portal
│       └── admin.js           Panel
└── tests/                     Pruebas automatizadas con Chrome headless
```

## Pruebas

Requieren Node 20 o superior y Google Chrome instalado (la ruta se puede cambiar con la variable `CHROME`).

```bash
node --experimental-websocket tests/flows.js          # 6 escenarios + CRUD (73 verificaciones)
node --experimental-websocket tests/smoke.js shots    # todas las pantallas en escritorio y móvil, con capturas
```

`flows.js` usa la interfaz real: llena formularios, sube archivos, aprueba y rechaza desde el panel y recarga el navegador para comprobar la persistencia.

## Del prototipo al plugin de WordPress

- LocalStorage e IndexedDB pasarían a tablas propias en MySQL, y las imágenes a la biblioteca de medios o a un almacenamiento privado.
- El acceso a "Mis puntos" es solo con el número de WhatsApp, por decisión de diseño. Cualquiera que conozca un número puede ver el saldo y el historial de esa cuenta y solicitar canjes con sus puntos. En producción conviene limitar los intentos por IP o, si se quiere más seguridad, agregar un código por WhatsApp.
- El panel quedaría protegido con roles y capacidades de WordPress.
- Las notificaciones simuladas se conectarían a `wp_mail`/SMTP y a WhatsApp.
- El proceso de vencimiento correría como WP-Cron diario.
- Las vendedoras podrían enlazarse con usuarios de WordPress para calcular comisiones.
