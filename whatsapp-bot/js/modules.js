/*
 * Catálogo de módulos y precios de referencia (Bs).
 *  - implementacion: pago único.
 *  - mensual: suscripción mensual.
 *  - dias: días hábiles estimados de implementación del módulo.
 *  - requiere: módulos obligatorios (se agregan automáticamente).
 *  - requiereAlguno: necesita al menos uno de estos módulos.
 *  - generaDatos: el módulo produce información para Estadísticas.
 * Para cambiar un precio basta con editar el número correspondiente.
 */
(function (root) {
  const BASE = {
    id: 'base',
    codigo: 'BASE',
    nombre: 'Integración base de WhatsApp Business',
    corto: 'Integración base',
    icon: 'plug',
    obligatorio: true,
    implementacion: 400,
    mensual: 49,
    dias: 5,
    requiere: [],
    generaDatos: false,
    descripcion: 'Conexión oficial con WhatsApp Cloud API y el panel administrativo sobre el que funcionan todos los módulos.',
    features: [
      'Configuración inicial de WhatsApp Cloud API',
      'Webhook para recibir eventos en tiempo real',
      'Conexión del número empresarial',
      'Recepción y envío de mensajes',
      'Registro básico de conversaciones',
      'Panel administrativo',
      'Configuración empresarial'
    ],
    prototipo: 'prototipos/configuracion.html'
  };

  const MODULES = [
    {
      id: 'automatizacion', codigo: 'M01', nombre: 'Automatización interactiva', corto: 'Automatización',
      icon: 'workflow', implementacion: 500, mensual: 99, dias: 6, requiere: ['base'], generaDatos: true,
      descripcion: 'Menús, botones y listas interactivas para que el cliente se atienda solo, sin escribir.',
      features: ['Menús principales', 'Botones interactivos', 'Listas dinámicas', 'Submenús', 'Navegación entre opciones', 'Mensajes multimedia', 'Configuración de respuestas', 'Constructor de menús', 'Historial de navegación', 'Mensajes de bienvenida'],
      prototipo: 'prototipos/automatizaciones.html', prototipoExtra: 'prototipos/whatsapp.html'
    },
    {
      id: 'ia', codigo: 'M02', nombre: 'Inteligencia artificial', corto: 'IA',
      icon: 'sparkles', implementacion: 700, mensual: 149, dias: 7, requiere: ['base'], generaDatos: true,
      descripcion: 'Un agente que entiende texto libre y responde con la información de su negocio.',
      features: ['Respuestas a texto libre', 'Contexto de conversaciones', 'Memoria de cliente', 'Base de conocimiento', 'Preguntas frecuentes', 'Información empresarial', 'Respuestas sobre productos y servicios', 'Configuración de personalidad', 'Límites de consumo', 'Transferencia a asesores'],
      prototipo: 'prototipos/ia.html'
    },
    {
      id: 'chat', codigo: 'M03', nombre: 'Chat y atención humana', corto: 'Chat humano',
      icon: 'messages', implementacion: 600, mensual: 99, dias: 6, requiere: ['base'], generaDatos: true,
      descripcion: 'Bandeja compartida para que su equipo tome conversaciones cuando el bot no basta.',
      features: ['Bandeja de entrada', 'Conversaciones en tiempo real', 'Envío de mensajes', 'Historial', 'Activar y desactivar bot', 'Tomar conversación', 'Devolver conversación al bot', 'Asignación de asesores', 'Estados de atención', 'Notas internas', 'Etiquetas', 'Filtros y buscador'],
      prototipo: 'prototipos/conversaciones.html'
    },
    {
      id: 'citas', codigo: 'M04', nombre: 'Calendario y citas', corto: 'Citas',
      icon: 'calendar', implementacion: 600, mensual: 99, dias: 6, requiere: ['base'], generaDatos: true,
      descripcion: 'Reservas por WhatsApp con disponibilidad real, recordatorios y reprogramaciones.',
      features: ['Agenda', 'Disponibilidad', 'Horarios laborales', 'Duración de servicios', 'Reservas mediante WhatsApp Flows', 'Confirmaciones', 'Cancelaciones', 'Reprogramaciones', 'Recordatorios', 'Vista de calendario', 'Estados de citas'],
      prototipo: 'prototipos/calendario.html'
    },
    {
      id: 'crm', codigo: 'M05', nombre: 'CRM y contactos', corto: 'CRM',
      icon: 'users', implementacion: 500, mensual: 79, dias: 5, requiere: ['base'], generaDatos: true,
      descripcion: 'Cada persona que escribe se convierte en una ficha con historial, etiquetas y etapa comercial.',
      features: ['Base de contactos', 'Perfil de clientes', 'Historial de mensajes', 'Historial de citas', 'Etiquetas', 'Notas', 'Clasificación de prospectos', 'Estados de clientes', 'Búsqueda y filtros', 'Exportación CSV'],
      prototipo: 'prototipos/crm.html'
    },
    {
      id: 'catalogo', codigo: 'M06', nombre: 'Catálogo de productos', corto: 'Catálogo',
      icon: 'package', implementacion: 700, mensual: 99, dias: 6, requiere: ['base'], generaDatos: false,
      descripcion: 'Administre productos, precios y stock, y muéstrelos dentro de WhatsApp.',
      features: ['Productos', 'Categorías', 'Imágenes', 'Descripciones', 'Precios Bs/USD', 'Variantes', 'Disponibilidad', 'Inventario básico', 'Promociones', 'Buscador', 'Enlaces de productos', 'Presentación de productos por WhatsApp'],
      prototipo: 'prototipos/productos.html'
    },
    {
      id: 'ventas', codigo: 'M07', nombre: 'Ventas y pedidos', corto: 'Ventas',
      icon: 'cart', implementacion: 900, mensual: 149, dias: 8, requiere: ['base', 'catalogo'], generaDatos: true,
      descripcion: 'Carrito, pedidos y cobro con QR, con seguimiento del pedido hasta la entrega.',
      features: ['Carrito', 'Creación de pedidos', 'Confirmación de compras', 'Gestión de estados', 'Reservas de productos', 'Registro de pagos', 'Pagos mediante QR estático', 'Carga de comprobantes', 'Entrega o retiro', 'Historial de compras', 'Notificaciones de pedidos'],
      prototipo: 'prototipos/ventas.html', prototipoExtra: 'prototipos/pedidos.html'
    },
    {
      id: 'reportes', codigo: 'M08', nombre: 'Estadísticas y reportes', corto: 'Reportes',
      icon: 'chart', implementacion: 500, mensual: 79, dias: 4, requiere: ['base'], generaDatos: false,
      requiereAlguno: ['automatizacion', 'ia', 'chat', 'citas', 'crm', 'ventas', 'campanas'],
      descripcion: 'Indicadores de atención, citas y ventas para decidir con datos.',
      features: ['Conversaciones recibidas', 'Mensajes enviados', 'Clientes nuevos', 'Atención por IA', 'Atención humana', 'Citas realizadas', 'Ventas', 'Productos populares', 'Tiempos de respuesta', 'Exportación de reportes'],
      prototipo: 'prototipos/reportes.html'
    },
    {
      id: 'campanas', codigo: 'M09', nombre: 'Campañas y notificaciones', corto: 'Campañas',
      icon: 'megaphone', implementacion: 700, mensual: 119, dias: 6, requiere: ['base'], generaDatos: true,
      descripcion: 'Plantillas aprobadas por Meta para recordatorios, avisos y campañas segmentadas.',
      features: ['Plantillas de WhatsApp', 'Campañas segmentadas', 'Recordatorios', 'Notificaciones de pedidos', 'Seguimientos comerciales', 'Programación de campañas', 'Historial de envíos', 'Estados de entrega', 'Gestión de consentimiento y bajas'],
      prototipo: 'prototipos/campanas.html'
    },
    {
      id: 'web', codigo: 'M10', nombre: 'Catálogo web público', corto: 'Tienda web',
      icon: 'globe', implementacion: 900, mensual: 99, dias: 8, requiere: ['base', 'catalogo'], generaDatos: false,
      descripcion: 'Una tienda web móvil con su marca que envía los pedidos directo a WhatsApp.',
      features: ['Catálogo público', 'Categorías', 'Filtros', 'Buscador', 'Página de producto', 'Variantes', 'Carrito', 'Botón de WhatsApp', 'Diseño móvil', 'Enlaces compartibles', 'Personalización básica de marca'],
      prototipo: 'prototipos/tienda.html'
    }
  ];

  const ALL = [BASE].concat(MODULES);
  const byId = (id) => ALL.find((m) => m.id === id);

  root.WAB = root.WAB || {};
  root.WAB.MODULES = { BASE, MODULES, ALL, byId };
  if (typeof module !== 'undefined') module.exports = root.WAB.MODULES;
})(typeof window !== 'undefined' ? window : globalThis);
