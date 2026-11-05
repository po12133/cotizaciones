/*
 * Planes comerciales, límites y funciones habilitadas.
 * Los precios y límites son una propuesta comercial inicial, sujeta a las condiciones definitivas del servicio.
 */
(function (root) {
  const PLANS = [
    {
      id: 'basico', level: 1, name: 'Básico', price: 30, priceLabel: 'Bs 30', period: '/mes',
      tagline: 'Para emprendimientos que dejan el cuaderno.',
      icon: 'shirt',
      limits: { products: 100, ai: 20, users: 1, branches: 1, historyDays: 30 },
      includesFrom: null,
      features: [
        '1 tienda', '1 usuario', 'Hasta 100 productos', '20 registros con IA al mes',
        'Registro manual de productos', 'Fotografías de productos', 'Categorías', 'Control de inventario',
        'Registro ilimitado de ventas', 'Descuentos', 'Pagos en efectivo y QR', 'Dashboard básico',
        'Historial de ventas de 30 días', 'Catálogo público', 'Carrito de compras', 'Pedidos por WhatsApp',
        'QR bancario estático de la tienda', 'Soporte básico'
      ]
    },
    {
      id: 'pro', level: 2, name: 'Pro', price: 69, priceLabel: 'Bs 69', period: '/mes', popular: true,
      tagline: 'Para tiendas que quieren saber cuánto ganan.',
      icon: 'trendUp',
      limits: { products: 1000, ai: 100, users: 3, branches: 1, historyDays: null },
      includesFrom: 'Básico',
      features: [
        'Hasta 1.000 productos', '100 registros con IA al mes', 'Hasta 3 usuarios', 'Inventario por tallas y colores',
        'Registro de costos', 'Cálculo de ganancias', 'Alertas de inventario bajo', 'Gestión de clientes',
        'Cambios y devoluciones', 'Reportes diarios, semanales y mensuales', 'Productos más vendidos', 'Exportación a Excel',
        'Historial completo de ventas', 'Catálogo con tu logo y colores', 'Productos destacados', 'Promociones',
        'Gestión completa de pedidos', 'Registro de comprobantes de pago', 'Soporte prioritario'
      ]
    },
    {
      id: 'premium', level: 3, name: 'Premium', price: 119, priceLabel: 'Bs 119', period: '/mes',
      tagline: 'Para tiendas con sucursales y equipo.',
      icon: 'building',
      limits: { products: 5000, ai: 300, users: 10, branches: 3, historyDays: null },
      includesFrom: 'Pro',
      features: [
        'Hasta 5.000 productos', '300 registros con IA al mes', 'Hasta 10 usuarios', 'Hasta 3 sucursales',
        'Inventario independiente por sucursal', 'Transferencias entre sucursales', 'Roles y permisos', 'Gestión de proveedores',
        'Registro de compras', 'Control de gastos', 'Reportes avanzados de rentabilidad', 'Comparación de sucursales',
        'Auditoría de acciones de empleados', 'Importación masiva desde Excel', 'Dominio propio para el catálogo*',
        'Estadísticas de visitas del catálogo', 'Catálogos por sucursal', 'Soporte prioritario'
      ]
    },
    {
      id: 'empresarial', level: 4, name: 'Empresarial', price: 4500, priceLabel: 'Bs 4.500', period: 'activación',
      tagline: 'Implementación acompañada para cadenas y tiendas grandes.',
      icon: 'crown',
      renewal: 'Incluye el primer año de servicio. Renovación referencial desde el segundo año: Bs 900 anuales.',
      limits: { products: 10000, ai: 500, users: 20, branches: 5, historyDays: null },
      includesFrom: 'Premium',
      features: [
        'Hasta 10.000 productos', '500 registros con IA al mes', 'Hasta 20 usuarios', 'Hasta 5 sucursales',
        'Configuración inicial personalizada', 'Importación asistida del inventario', 'Capacitación personalizada',
        'Configuración de reportes disponibles', 'Acompañamiento de implementación', 'Soporte prioritario',
        'Posibilidad de contratar funcionalidades adicionales'
      ],
      note: 'Licencia de uso: no incluye código fuente. El software, la infraestructura y la propiedad intelectual siguen siendo de la empresa desarrolladora. Los desarrollos personalizados se cotizan por separado.'
    }
  ];

  // Función → nivel mínimo de plan (1 Básico, 2 Pro, 3 Premium, 4 Empresarial)
  const FEATURES = {
    dashboard: 1, productos: 1, inventario: 1, pos: 1, ventas: 1, pedidos: 1, catalogo: 1, ia: 1, descuentos: 1, qr: 1,
    variantes: 2, costos: 2, ganancias: 2, alertas: 2, clientes: 2, devoluciones: 2, reportes: 2, masVendidos: 2,
    exportar: 2, historialCompleto: 2, catalogoMarca: 2, destacados: 2, promociones: 2, pedidosCompleto: 2,
    comprobantes: 2, usuarios: 2,
    sucursales: 3, transferencias: 3, roles: 3, proveedores: 3, compras: 3, gastos: 3, rentabilidad: 3,
    compararSucursales: 3, auditoria: 3, importar: 3, dominio: 3, visitas: 3, catalogoSucursal: 3,
    implementacion: 4, reportesConfig: 4
  };

  // Descripción corta de lo que se desbloquea, usada en el aviso de función bloqueada
  const FEATURE_LABELS = {
    variantes: 'Inventario por tallas y colores', costos: 'Registro de costos', ganancias: 'Cálculo de ganancias',
    alertas: 'Alertas de inventario bajo', clientes: 'Gestión de clientes', devoluciones: 'Cambios y devoluciones',
    reportes: 'Reportes de ventas', masVendidos: 'Productos más vendidos', exportar: 'Exportación a Excel',
    historialCompleto: 'Historial completo de ventas', catalogoMarca: 'Logo y colores propios en el catálogo',
    destacados: 'Productos destacados', promociones: 'Promociones', pedidosCompleto: 'Gestión completa de pedidos',
    comprobantes: 'Registro de comprobantes de pago', usuarios: 'Usuarios adicionales', sucursales: 'Sucursales',
    transferencias: 'Transferencias entre sucursales', roles: 'Roles y permisos', proveedores: 'Gestión de proveedores',
    compras: 'Registro de compras', gastos: 'Control de gastos', rentabilidad: 'Reportes de rentabilidad',
    compararSucursales: 'Comparación de sucursales', auditoria: 'Auditoría de acciones', importar: 'Importación desde Excel',
    dominio: 'Dominio propio', visitas: 'Estadísticas de visitas', catalogoSucursal: 'Catálogos por sucursal',
    implementacion: 'Implementación acompañada', reportesConfig: 'Configuración de reportes'
  };

  // Tabla comparativa: [etiqueta, valores por plan]. true/false = incluido / no incluido.
  const COMPARE = [
    { group: 'Precio y límites' },
    ['Precio', ['Bs 30/mes', 'Bs 69/mes', 'Bs 119/mes', 'Bs 4.500 activación*']],
    ['Productos', ['100', '1.000', '5.000', '10.000']],
    ['Usuarios', ['1', '3', '10', '20']],
    ['Sucursales', ['1', '1', '3', '5']],
    ['Registros con IA por mes', ['20', '100', '300', '500']],
    { group: 'Inventario' },
    ['Control de inventario', [true, true, true, true]],
    ['Tallas y colores', [false, true, true, true]],
    ['Alertas de stock bajo', [false, true, true, true]],
    ['Inventario por sucursal y transferencias', [false, false, true, true]],
    ['Importación masiva desde Excel', [false, false, true, 'Asistida']],
    { group: 'Ventas' },
    ['Punto de venta y ventas ilimitadas', [true, true, true, true]],
    ['Descuentos', [true, true, true, true]],
    ['Costos y ganancias', [false, true, true, true]],
    ['Clientes, cambios y devoluciones', [false, true, true, true]],
    ['Historial de ventas', ['30 días', 'Completo', 'Completo', 'Completo']],
    { group: 'Reportes' },
    ['Dashboard', ['Básico', 'Completo', 'Completo', 'Completo']],
    ['Reportes diarios, semanales y mensuales', [false, true, true, true]],
    ['Exportación a Excel', [false, true, true, true]],
    ['Rentabilidad y comparación de sucursales', [false, false, true, true]],
    ['Configuración de reportes', [false, false, false, true]],
    { group: 'Venta online' },
    ['Catálogo público con carrito', [true, true, true, true]],
    ['Pedidos por WhatsApp', [true, true, true, true]],
    ['QR de pago estático', [true, true, true, true]],
    ['Comprobantes y gestión completa de pedidos', [false, true, true, true]],
    ['Personalización (logo, colores, destacados, promociones)', [false, true, true, true]],
    ['Dominio propio y estadísticas de visitas', [false, false, 'Sujeto a configuración', 'Sujeto a configuración']],
    { group: 'Gestión' },
    ['Proveedores y compras', [false, false, true, true]],
    ['Gastos', [false, false, true, true]],
    ['Roles, permisos y auditoría', [false, false, true, true]],
    { group: 'Servicio' },
    ['Capacitación', ['Guías', 'Guías', 'Guías', 'Personalizada']],
    ['Implementación acompañada', [false, false, false, true]],
    ['Soporte', ['Básico', 'Prioritario', 'Prioritario', 'Prioritario']]
  ];

  const byId = (id) => PLANS.find((p) => p.id === id) || PLANS[0];
  const byLevel = (lvl) => PLANS.find((p) => p.level === lvl) || PLANS[PLANS.length - 1];

  root.MF = root.MF || {};
  Object.assign(root.MF, { PLANS, FEATURES, FEATURE_LABELS, COMPARE, planById: byId, planByLevel: byLevel });
})(typeof window !== 'undefined' ? window : globalThis);
