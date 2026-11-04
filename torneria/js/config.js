/*
 * CONFIGURACIÓN CENTRALIZADA DE LA PROPUESTA
 * ------------------------------------------------------------------
 * Todo lo que muestra la página comercial y todo lo que contiene el PDF sale de este objeto.
 * Para cambiar un precio, un plazo o una condición, edítelo SOLO aquí.
 *
 * - Los importes están en bolivianos (BOB). El total NO se escribe: se calcula como
 *   subtotal (suma de `costos`) menos los `descuentos`.
 * - Los campos con el valor PENDIENTE se muestran como "[Por completar]" y pueden llenarse
 *   aquí o desde el botón "Datos del cliente" de la página (se guardan solo en este navegador).
 */
(function (root) {
  const PENDIENTE = '[Por completar]';

  const CONFIG = {
    PENDIENTE,

    cotizacion: {
      numero: 'COT-TOR-002',
      // Fecha de emisión: null = fecha del día en que se abre o descarga la propuesta.
      fechaEmision: null,
      // Validez de la oferta: no se fija sin instrucción expresa. Ejemplo: '15 días calendario'.
      validez: PENDIENTE,
      version: '2.0'
    },

    proyecto: {
      nombre: 'Sistema de Gestión Comercial e Inventarios Multisucursal',
      nombreCorto: 'Sistema de Gestión Comercial',
      tipo: 'Aplicación web administrativa a medida',
      descripcion: 'Plataforma web para una empresa importadora y comercializadora con varias sucursales: centraliza la administración de las sucursales, controla compras y ventas, gestiona inventarios y transferencias, y entrega estadísticas del negocio en un solo sistema, accesible desde computadoras, tabletas y teléfonos.',
      tiempo: { min: 6, max: 10, unidad: 'semanas' }
    },

    moneda: { simbolo: 'Bs', codigo: 'BOB', nombre: 'Bolivianos' },

    proveedor: {
      nombre: 'Amicornios Soft',
      responsable: PENDIENTE,
      nit: PENDIENTE,
      sitio: 'soft.amicornios.com',
      correo: 'vargascarlos12123@gmail.com',
      telefono: '+591 71450557',
      ciudad: 'Bolivia'
    },

    // Datos del cliente: todavía no proporcionados.
    cliente: {
      razonSocial: PENDIENTE,
      nit: PENDIENTE,
      contacto: PENDIENTE,
      cargo: PENDIENTE,
      telefono: PENDIENTE,
      correo: PENDIENTE,
      direccion: PENDIENTE,
      ciudad: PENDIENTE
    },

    /*
     * Distribución económica. Subtotal = suma de esta lista; total = subtotal − descuentos.
     * `modulo` enlaza la línea con el módulo funcional (null = servicio).
     * Los precios por módulo son los de lista: el descuento comercial se muestra aparte.
     */
    costos: [
      { id: 'sucursales', concepto: 'Gestión de sucursales', monto: 1200, modulo: 'sucursales' },
      { id: 'usuarios', concepto: 'Usuarios y permisos', monto: 1000, modulo: 'usuarios' },
      { id: 'productos', concepto: 'Productos y catálogo', monto: 1200, modulo: 'productos' },
      { id: 'compras', concepto: 'Compras y proveedores', monto: 1500, modulo: 'compras' },
      { id: 'ventas', concepto: 'Ventas y cotizaciones', monto: 1800, modulo: 'ventas' },
      { id: 'inventarios', concepto: 'Inventarios', monto: 2000, modulo: 'inventarios' },
      { id: 'clientes', concepto: 'Clientes', monto: 800, modulo: 'clientes' },
      { id: 'caja', concepto: 'Caja y finanzas', monto: 1200, modulo: 'caja' },
      { id: 'dashboard', concepto: 'Dashboard y estadísticas', monto: 1500, modulo: 'dashboard' },
      { id: 'reportes', concepto: 'Reportes', monto: 800, modulo: 'reportes' },
      { id: 'implementacion', concepto: 'Implementación y capacitación', monto: 1000, modulo: null }
    ],
    // Descuentos sobre el subtotal (montos positivos; se restan al calcular el total).
    descuentos: [
      { id: 'comercial', concepto: 'Descuento comercial', monto: 500 }
    ],
    notaCostos: 'El módulo de Configuración general (datos de empresa, sucursales, roles, unidades y parámetros) se incluye sin costo adicional como parte de la base del sistema. Los precios por módulo son de lista; el descuento comercial se aplica sobre el subtotal.',

    // Forma de pago: porcentajes sobre el total calculado.
    pagos: [
      { concepto: 'Anticipo', porcentaje: 50, momento: 'A la firma de la propuesta y antes del inicio del desarrollo.' },
      { concepto: 'Saldo contra entrega', porcentaje: 50, momento: 'A la entrega del sistema instalado y la capacitación realizada.' }
    ],

    mantenimiento: {
      montoMensual: 350,
      opcional: true,
      incluye: [
        'Corrección de errores del sistema entregado.',
        'Actualizaciones de seguridad y de dependencias.',
        'Copias de respaldo y verificación periódica de su restauración.',
        'Monitoreo básico de disponibilidad del sistema.',
        'Soporte a usuarios por WhatsApp y correo en días hábiles.',
        'Ajustes menores de configuración (usuarios, roles, parámetros).'
      ],
      noIncluye: [
        'Desarrollo de módulos o funcionalidades nuevas.',
        'Dominio y servicios de terceros (el hosting se paga aparte).',
        'Cambios mayores de alcance, que se cotizan por separado.'
      ]
    },

    // Pago mensual del hosting a cargo del cliente, aparte del desarrollo y del mantenimiento.
    hosting: {
      montoMensual: 100,
      meses: 12,
      inicio: 'a partir de la puesta en marcha del sistema'
    },

    facturacionElectronica: { incluida: false, texto: 'No incluida en esta propuesta.' },

    // Cronograma: semanas de inicio y fin en el escenario de 6 y de 10 semanas.
    cronograma: [
      { etapa: 'Análisis y diseño', descripcion: 'Relevamiento de los procesos comerciales de cada sucursal, validación del alcance, modelo de datos y diseño de pantallas.', min: [1, 1], max: [1, 2], entregable: 'Documento de alcance aprobado y prototipo validado.' },
      { etapa: 'Sucursales, usuarios y productos', descripcion: 'Base del sistema, sucursales y almacenes, usuarios, roles y permisos, catálogo de productos y configuración general.', min: [2, 2], max: [2, 3], entregable: 'Administración central y catálogo comercial operativos.' },
      { etapa: 'Compras y ventas', descripcion: 'Proveedores, órdenes de compra y recepción de mercadería, clientes, ventas, cotizaciones y comprobantes internos.', min: [2, 3], max: [3, 5], entregable: 'Circuito de compras y ventas funcionando.' },
      { etapa: 'Inventarios y transferencias', descripcion: 'Existencias por sucursal y almacén, entradas y salidas, transferencias, stock mínimo, alertas, kardex y ajustes.', min: [3, 4], max: [5, 6], entregable: 'Inventario multisucursal integrado con compras y ventas.' },
      { etapa: 'Caja, estadísticas y reportes', descripcion: 'Apertura y cierre de caja, ingresos y egresos, dashboard con indicadores comerciales y reportes exportables a PDF y Excel.', min: [4, 5], max: [7, 8], entregable: 'Caja, panel gerencial y reportes administrativos.' },
      { etapa: 'Pruebas, capacitación y entrega', descripcion: 'Pruebas con datos reales, corrección de observaciones, carga inicial, capacitación y puesta en marcha.', min: [6, 6], max: [9, 10], entregable: 'Sistema en funcionamiento y personal capacitado.' }
    ],
    notaCronograma: 'Cronograma referencial. Las fechas definitivas se fijan al aprobar el alcance y dependen de la entrega oportuna de información (productos, sucursales, usuarios) y de las validaciones del cliente.',

    problemas: [
      { icono: 'box', titulo: 'Inventarios desactualizados', texto: 'Las existencias se controlan en planillas o cuadernos y no coinciden con lo que hay en el almacén.' },
      { icono: 'swap', titulo: 'Compras y ventas sin control', texto: 'Es difícil saber qué se compró, a qué costo, qué se vendió y cuánto margen dejó cada operación.' },
      { icono: 'branches', titulo: 'Sucursales desconectadas', texto: 'Cada sucursal maneja su propia información y la administración no tiene una vista consolidada.' },
      { icono: 'clipboard', titulo: 'Transferencias sin registro', texto: 'La mercadería que se envía entre sucursales no queda documentada y aparecen diferencias de stock.' },
      { icono: 'file', titulo: 'Reportes que toman días', texto: 'Armar un reporte de ventas o de inventario implica juntar datos a mano de varias fuentes.' },
      { icono: 'gauge', titulo: 'Sin indicadores gerenciales', texto: 'Las decisiones se toman sin cifras claras de ventas, compras, utilidad y rotación de productos.' }
    ],

    beneficios: [
      { icono: 'database', titulo: 'Información centralizada', texto: 'Todas las sucursales trabajan sobre una misma base de datos, en tiempo real.' },
      { icono: 'box', titulo: 'Mayor control del inventario', texto: 'Stock por almacén, alertas de mínimo, kardex y transferencias trazables.' },
      { icono: 'truck', titulo: 'Compras bajo control', texto: 'Cada orden de compra con su proveedor, recepción, costo de adquisición y pago.' },
      { icono: 'shield', titulo: 'Menos errores administrativos', texto: 'Los cálculos, saldos y movimientos se registran automáticamente.' },
      { icono: 'chart', titulo: 'Reportes automáticos', texto: 'Reportes por período y sucursal listos para exportar a PDF o Excel.' },
      { icono: 'devices', titulo: 'Acceso desde cualquier dispositivo', texto: 'Funciona en el navegador de computadoras, tabletas y teléfonos.' },
      { icono: 'target', titulo: 'Mejores decisiones', texto: 'Indicadores claros para comparar sucursales, márgenes y productos más vendidos.' }
    ],

    objetivos: [
      'Centralizar la administración de todas las sucursales en una sola plataforma web.',
      'Mantener inventarios confiables por sucursal y almacén de los productos adquiridos para la venta.',
      'Controlar el circuito de compras, ventas y cotizaciones con sus costos y márgenes.',
      'Registrar las transferencias de mercadería entre sucursales con trazabilidad completa en el kardex.',
      'Controlar la caja y los movimientos financieros operativos de cada sucursal.',
      'Contar con indicadores y reportes gerenciales para la toma de decisiones.'
    ],

    // Módulos funcionales. `vista` es la pantalla del prototipo que lo demuestra.
    modulos: [
      { id: 'sucursales', numero: 1, nombre: 'Gestión de sucursales y almacenes', icono: 'branches', vista: 'sucursales',
        resumen: 'Administración central de todas las sucursales y sus almacenes, cada una con su inventario y sus cifras.',
        funciones: ['Registro de múltiples sucursales', 'Configuración de almacenes', 'Inventario independiente', 'Transferencias entre sucursales', 'Administración centralizada', 'Estadísticas por sucursal'] },
      { id: 'usuarios', numero: 2, nombre: 'Usuarios, roles y permisos', icono: 'users', vista: 'usuarios',
        resumen: 'Cada persona ve y hace solo lo que le corresponde, en la sucursal que le corresponde.',
        funciones: ['Administración de usuarios', 'Roles personalizados', 'Permisos por módulo', 'Asignación de usuarios a sucursales', 'Restricción de información', 'Registro básico de actividades'] },
      { id: 'productos', numero: 3, nombre: 'Productos y catálogo comercial', icono: 'package', vista: 'productos',
        resumen: 'Catálogo único de los productos que la empresa importa, compra y comercializa, con costos y precios de venta.',
        funciones: ['Registro de productos', 'Códigos SKU', 'Categorías y marcas', 'Descripción y unidad de medida', 'Costo de compra y precio de venta', 'Stock por sucursal o almacén', 'Importación y exportación mediante Excel'] },
      { id: 'compras', numero: 4, nombre: 'Compras y proveedores', icono: 'truck', vista: 'compras',
        resumen: 'Desde la orden de compra hasta la recepción en almacén, con el costo real de cada producto adquirido.',
        funciones: ['Registro de proveedores', 'Órdenes de compra', 'Registro de compras', 'Recepción de mercadería', 'Historial de compras', 'Costos de adquisición', 'Reportes por proveedor'] },
      { id: 'ventas', numero: 5, nombre: 'Ventas y cotizaciones', icono: 'cart', vista: 'ventas',
        resumen: 'Cotice, convierta en venta y emita el comprobante interno en pocos pasos.',
        funciones: ['Registro de ventas', 'Cotizaciones comerciales para clientes', 'Conversión de cotizaciones en ventas', 'Descuentos', 'Diferentes métodos de pago', 'Historial de ventas', 'Comprobantes internos', 'Reportes de ventas'],
        nota: 'No incluye facturación electrónica ni integración con Impuestos Nacionales.' },
      { id: 'inventarios', numero: 6, nombre: 'Inventarios y transferencias', icono: 'box', vista: 'inventario',
        resumen: 'Existencias confiables por sucursal de los productos adquiridos para la venta, con alertas y el historial de cada uno.',
        funciones: ['Existencias por sucursal', 'Entradas y salidas', 'Transferencias entre sucursales', 'Stock mínimo', 'Alertas de inventario', 'Kardex', 'Historial de movimientos', 'Ajustes de inventario', 'Importación y exportación mediante Excel'] },
      { id: 'clientes', numero: 7, nombre: 'Clientes', icono: 'contact', vista: 'clientes',
        resumen: 'La ficha de cada cliente con todo lo que compró, cotizó y tiene pendiente de pago.',
        funciones: ['Registro de clientes', 'Datos de contacto', 'Historial de compras', 'Cotizaciones anteriores', 'Saldos por cobrar', 'Búsqueda y filtros'] },
      { id: 'caja', numero: 8, nombre: 'Caja y movimientos financieros', icono: 'wallet', vista: 'caja',
        resumen: 'Apertura, cierre y movimientos de caja por sucursal, con cuentas por cobrar y pagar básicas.',
        funciones: ['Ingresos', 'Egresos', 'Apertura y cierre de caja', 'Movimientos por sucursal', 'Resumen de caja', 'Cuentas por cobrar y pagar básicas', 'Reportes financieros operativos'],
        nota: 'No incluye contabilidad completa.' },
      { id: 'dashboard', numero: 9, nombre: 'Dashboard y estadísticas', icono: 'chart', vista: 'dashboard',
        resumen: 'Los indicadores comerciales del negocio en una sola pantalla, por período y por sucursal.',
        funciones: ['Ventas y compras del mes', 'Ingresos y egresos', 'Utilidad estimada', 'Productos más vendidos', 'Productos con stock bajo', 'Valor del inventario', 'Ventas por sucursal', 'Comparación de compras y ventas', 'Gráficos por períodos'] },
      { id: 'reportes', numero: 10, nombre: 'Reportes PDF y Excel', icono: 'file', vista: 'reportes',
        resumen: 'Reportes administrativos listos para revisar, filtrar y exportar.',
        funciones: ['Reportes de ventas', 'Reportes de compras', 'Reportes de inventario', 'Reportes de movimientos', 'Reportes por sucursal', 'Reportes de caja', 'Exportación a PDF y Excel'] },
      { id: 'configuracion', numero: 11, nombre: 'Configuración general', icono: 'settings', vista: 'configuracion',
        resumen: 'Los parámetros que adaptan el sistema a la forma de trabajar de la empresa.',
        funciones: ['Datos generales de empresa', 'Sucursales', 'Usuarios', 'Roles', 'Unidades de medida y categorías', 'Parámetros del sistema'] }
    ],

    entregables: [
      'Sistema web instalado y configurado con los módulos descritos.',
      'Carga inicial de sucursales, usuarios, roles y catálogo de productos (a partir de planillas Excel del cliente).',
      'Capacitación al personal administrativo y operativo.',
      'Manual de uso en formato digital.',
      'Acceso de administrador y entrega de credenciales.'
    ],

    exclusiones: [
      'Facturación electrónica.',
      'Integración con el SIAT (Servicio de Impuestos Nacionales).',
      'Contabilidad completa (libros contables, estados financieros, planillas de sueldos).',
      'Aplicaciones móviles nativas (Android o iOS).',
      'Integraciones externas no especificadas en esta propuesta.',
      'Desarrollo de módulos adicionales a los descritos.',
      'Hardware, impresoras, lectores de código de barras u otros equipos.',
      'Dominio, salvo contratación adicional.',
      'Módulos de fabricación, producción u órdenes de trabajo.',
      'Trámites aduaneros y liquidación de tributos de importación.'
    ],

    condicionesComerciales: [
      'Los precios están expresados en bolivianos (BOB).',
      'El alcance se limita a los módulos y funcionalidades descritos en esta propuesta. Cualquier cambio se evalúa y cotiza por separado.',
      'El plazo se computa desde la recepción del anticipo y de la información inicial requerida.',
      'El cliente designará una persona de contacto para validar avances y resolver consultas.',
      'Las observaciones a cada entrega parcial deberán comunicarse por escrito para su corrección dentro del alcance.',
      'El mantenimiento mensual es opcional y se contrata por separado del desarrollo.'
    ],

    // Usados por las pruebas para detectar cambios accidentales del subtotal y del total.
    subtotalEsperado: 14000,
    totalEsperado: 13500
  };

  root.TOR = root.TOR || {};
  root.TOR.CONFIG = CONFIG;
  if (typeof module !== 'undefined' && module.exports) module.exports = CONFIG;
})(typeof window !== 'undefined' ? window : globalThis);
