/*
 * Planes comerciales prediseñados (paquetes). Son INDEPENDIENTES de los precios por módulo:
 * no se calculan sumando módulos. Edite aquí precios, implementación y límites.
 *  - modulos: módulos que se preseleccionan al pulsar "Personalizar plan".
 *  - desde: muestra "Desde" antes del precio.
 */
(function (root) {
  const PLANS = [
    {
      id: 'atencion', nombre: 'Atención', mensual: 199, implementacion: 600, desde: false,
      lema: 'Para empezar a responder solo, con menús claros.',
      ideal: 'Profesionales independientes y negocios pequeños',
      incluye: ['Integración base de WhatsApp Business', 'Menús y listas interactivas', 'Historial básico de conversaciones', 'Panel administrativo'],
      modulos: ['automatizacion'],
      limites: { asesores: 1, contactos: '1.000', menus: '10 menús', productos: '—', soporte: 'Correo y WhatsApp' }
    },
    {
      id: 'profesional', nombre: 'Profesional', mensual: 299, implementacion: 1200, desde: false, destacado: true,
      lema: 'Atención inteligente con agenda y seguimiento de clientes.',
      ideal: 'Clínicas, consultorios, gimnasios e institutos',
      incluye: ['Automatización interactiva', 'Agente de IA con base de conocimiento', 'Chat con asesores humanos', 'CRM básico', 'Calendario y citas'],
      modulos: ['automatizacion', 'ia', 'chat', 'crm', 'citas'],
      limites: { asesores: 3, contactos: '3.000', menus: 'Ilimitados', productos: '—', soporte: 'Prioritario en horario hábil' }
    },
    {
      id: 'comercio', nombre: 'Comercio', mensual: 399, implementacion: 1600, desde: false,
      lema: 'Venda por WhatsApp con catálogo, pedidos y cobro por QR.',
      ideal: 'Tiendas, distribuidoras y emprendimientos',
      incluye: ['Automatización interactiva', 'Chat con asesores humanos', 'Catálogo de productos', 'Inventario básico', 'Pedidos y seguimiento', 'Ventas con pago por QR'],
      modulos: ['automatizacion', 'chat', 'catalogo', 'ventas'],
      limites: { asesores: 3, contactos: '5.000', menus: 'Ilimitados', productos: '500 productos', soporte: 'Prioritario en horario hábil' }
    },
    {
      id: 'empresarial', nombre: 'Empresarial', mensual: 599, implementacion: 2500, desde: true,
      lema: 'Toda la plataforma, varios equipos y reportes de gestión.',
      ideal: 'Empresas con varias áreas, sucursales o alto volumen',
      incluye: ['Automatizaciones avanzadas', 'Inteligencia artificial', 'Chat multiagente', 'CRM completo', 'Calendario y citas', 'Catálogo, pedidos y ventas', 'Estadísticas y reportes', 'Integraciones a medida (bajo presupuesto)'],
      modulos: ['automatizacion', 'ia', 'chat', 'crm', 'citas', 'catalogo', 'ventas', 'reportes'],
      limites: { asesores: 10, contactos: '20.000', menus: 'Ilimitados', productos: 'Ilimitados', soporte: 'Dedicado con tiempos garantizados' }
    }
  ];

  root.WAB = root.WAB || {};
  root.WAB.PLANS = PLANS;
  if (typeof module !== 'undefined') module.exports = PLANS;
})(typeof window !== 'undefined' ? window : globalThis);
