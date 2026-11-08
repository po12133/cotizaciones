/*
 * Planes comerciales, límites y funciones habilitadas (configuración centralizada).
 * Para cambiar qué incluye cada plan, edite ACCESS: cada función lista los planes que la incluyen.
 * Los precios y límites son una propuesta comercial inicial, sujeta a las condiciones definitivas del servicio.
 */
(function (root) {
  const PLANS = [
    {
      id: 'gratis', level: 0, name: 'Prueba gratuita', short: 'Gratis', price: 0, priceLabel: 'Bs 0', period: '14 días', trial: true, trialDays: 14,
      tagline: 'Pruebe todo con su propia tienda, sin tarjeta.',
      icon: 'play',
      limits: { products: 30, ai: 10, aiTotal: true, users: 1, branches: 1 },
      features: [
        'Hasta 30 productos', '10 análisis con IA en total', '1 usuario', 'Inventario', 'Ventas ilimitadas', 'Boletas',
        'Reportes avanzados', 'Catálogo público temporal', 'Pedidos por WhatsApp y QR'
      ],
      note: 'Al terminar los 14 días la cuenta queda en solo lectura y el catálogo se desactiva. Proponemos conservar sus datos 30 días más para que elija un plan sin perder nada.'
    },
    {
      id: 'basico', level: 1, name: 'Básico', short: 'Básico', price: 30, priceLabel: 'Bs 30', period: '/mes',
      tagline: 'Para dejar el cuaderno: inventario y ventas al día.',
      icon: 'shirt',
      limits: { products: 150, ai: 20, users: 1, branches: 1 },
      features: [
        'Hasta 150 productos', '20 análisis con IA al mes', '1 usuario', 'Registro de prendas con IA', 'Inventario por tallas y colores',
        'Ventas ilimitadas', 'Boletas en PDF', 'Descuentos', 'Reportes básicos', 'Exportaciones básicas'
      ],
      without: ['Sin catálogo público']
    },
    {
      id: 'pro', level: 2, name: 'Pro', short: 'Pro', price: 69, priceLabel: 'Bs 69', period: '/mes', popular: true,
      tagline: 'Para vender también por internet y saber cuánto gana.',
      icon: 'trendUp',
      limits: { products: 1000, ai: 100, users: 3, branches: 1 },
      includesFrom: 'Básico',
      features: [
        'Hasta 1.000 productos', '100 análisis con IA al mes', 'Hasta 3 usuarios', 'Alertas de stock', 'Historial de movimientos',
        'Cambios y devoluciones', 'Reportes avanzados', 'Excel y PDF completos', 'Catálogo público', 'Carrito de compras',
        'Pedidos por WhatsApp y QR', 'Personalización del catálogo'
      ]
    },
    {
      id: 'premium', level: 3, name: 'Premium', short: 'Premium', price: 119, priceLabel: 'Bs 119', period: '/mes',
      tagline: 'Para tiendas con sucursales y equipo.',
      icon: 'building',
      limits: { products: 5000, ai: 300, users: 10, branches: 3 },
      includesFrom: 'Pro',
      features: [
        'Hasta 5.000 productos', '300 análisis con IA al mes', 'Hasta 10 usuarios', 'Hasta 3 sucursales', 'Inventario por sucursal',
        'Proveedores', 'Compras', 'Gastos', 'Roles y permisos', 'Auditoría', 'Importación masiva', 'Reportes comparativos',
        'Dominio propio para el catálogo*'
      ]
    }
  ];

  // Función → planes que la incluyen
  const ALL = ['gratis', 'basico', 'pro', 'premium'];
  const PRO = ['pro', 'premium'];
  const PRO_TRIAL = ['gratis', 'pro', 'premium'];
  const PREMIUM = ['premium'];
  const ACCESS = {
    // Para todos
    inicio: ALL, inventario: ALL, ia: ALL, ventas: ALL, pos: ALL, boletas: ALL, descuentos: ALL, variantes: ALL, costos: ALL,
    anular: ALL, reportes: ALL, exportarBasico: ALL, ajustes: ALL,
    // Prueba gratuita + Pro + Premium
    reportesAvanzados: PRO_TRIAL, exportarCompleto: PRO_TRIAL, catalogo: PRO_TRIAL, pedidos: PRO_TRIAL,
    // Pro + Premium
    alertas: PRO, movimientos: PRO, devoluciones: PRO, catalogoMarca: PRO, destacados: PRO, promociones: PRO, usuarios: PRO,
    // Premium
    sucursales: PREMIUM, transferencias: PREMIUM, proveedores: PREMIUM, compras: PREMIUM, gastos: PREMIUM, roles: PREMIUM,
    auditoria: PREMIUM, importar: PREMIUM, reportesComparativos: PREMIUM, dominio: PREMIUM
  };

  // Descripción corta de lo que se desbloquea, usada en el aviso de función bloqueada
  const FEATURE_LABELS = {
    reportesAvanzados: 'Reportes avanzados', exportarCompleto: 'Excel y PDF completos', catalogo: 'Catálogo público',
    pedidos: 'Pedidos online por WhatsApp y QR', alertas: 'Alertas de stock', movimientos: 'Historial de movimientos de inventario',
    devoluciones: 'Cambios y devoluciones', catalogoMarca: 'Personalización del catálogo', destacados: 'Productos destacados',
    promociones: 'Promociones', usuarios: 'Usuarios adicionales', sucursales: 'Sucursales', transferencias: 'Transferencias entre sucursales',
    proveedores: 'Proveedores', compras: 'Compras', gastos: 'Gastos', roles: 'Roles y permisos', auditoria: 'Auditoría',
    importar: 'Importación masiva', reportesComparativos: 'Reportes comparativos por sucursal', dominio: 'Dominio propio para el catálogo'
  };

  // Tabla comparativa: [etiqueta, valores en el orden de PLANS]. true/false = incluido / no incluido.
  const COMPARE = [
    { group: 'Precio y límites' },
    ['Precio', ['Bs 0 · 14 días', 'Bs 30/mes', 'Bs 69/mes', 'Bs 119/mes']],
    ['Productos (fichas de prendas)', ['30', '150', '1.000', '5.000']],
    ['Análisis con IA', ['10 en total', '20 al mes', '100 al mes', '300 al mes']],
    ['Usuarios', ['1', '1', '3', '10']],
    ['Sucursales', ['1', '1', '1', '3']],
    { group: 'Registro e inventario' },
    ['Registro de prendas con IA (fotos)', [true, true, true, true]],
    ['Registro manual sin límite de créditos', [true, true, true, true]],
    ['Tallas, colores y prendas únicas', [true, true, true, true]],
    ['Ingresos y ajustes de inventario', [true, true, true, true]],
    ['Alertas de stock', [false, false, true, true]],
    ['Historial de movimientos', [false, false, true, true]],
    ['Inventario por sucursal', [false, false, false, true]],
    ['Importación masiva', [false, false, false, true]],
    { group: 'Ventas' },
    ['Punto de venta y ventas ilimitadas', [true, true, true, true]],
    ['Descuentos por prenda y por venta', [true, true, true, true]],
    ['Boletas (PDF, WhatsApp, impresión)', [true, true, true, true]],
    ['Anulación de ventas', [true, true, true, true]],
    ['Cambios y devoluciones', [false, false, true, true]],
    { group: 'Reportes' },
    ['Resumen, ventas por fecha y productos vendidos', [true, true, true, true]],
    ['Reportes avanzados (categorías, pagos, comparación de periodos, ganancias)', [true, false, true, true]],
    ['Exportación', ['Completa', 'Básica', 'Excel y PDF', 'Excel y PDF']],
    ['Reportes comparativos por sucursal', [false, false, false, true]],
    { group: 'Catálogo online' },
    ['Catálogo público con carrito', ['Temporal', false, true, true]],
    ['Pedidos por WhatsApp y QR', [true, false, true, true]],
    ['Personalización (colores, destacados, promociones)', [false, false, true, true]],
    ['Dominio propio', [false, false, false, 'Sujeto a configuración']],
    { group: 'Gestión' },
    ['Proveedores, compras y gastos', [false, false, false, true]],
    ['Roles, permisos y auditoría', [false, false, false, true]]
  ];

  const byId = (id) => PLANS.find((p) => p.id === id) || PLANS[1];
  const includes = (planId, feature) => (ACCESS[feature] || ALL).includes(planId);
  /** Plan pagado más económico que incluye la función (para el aviso "Disponible desde el plan …"). */
  const neededFor = (feature) => PLANS.filter((p) => !p.trial).find((p) => includes(p.id, feature)) || PLANS[PLANS.length - 1];

  root.MF = root.MF || {};
  Object.assign(root.MF, { PLANS, ACCESS, FEATURE_LABELS, COMPARE, planById: byId, planIncludes: includes, planNeededFor: neededFor });
})(typeof window !== 'undefined' ? window : globalThis);
