/*
 * Planes de suscripción y sus límites.
 * `null` = ilimitado. Los límites se aplican en el panel y en el catálogo público.
 */
window.CA = window.CA || {};
CA.PLANS = {
  free: {
    id: 'free', name: 'Gratis', monthly: 0, yearly: 0,
    tagline: 'Para empezar a vender por WhatsApp',
    limits: {
      products: 30, catalogs: 1, templates: ['nova'], categories: 3,
      whatsappNumbers: 1, customization: 'none', productPage: false, customDomain: false,
      stats: 'none', syncMinutes: 1440, branding: true
    }
  },
  starter: {
    id: 'starter', name: 'Inicial', monthly: 29, yearly: 290,
    tagline: 'Para negocios con catálogo propio',
    limits: {
      products: 100, catalogs: 1, templates: ['nova', 'glow'], categories: null,
      whatsappNumbers: 1, customization: 'basic', productPage: false, customDomain: false,
      stats: 'none', syncMinutes: 60, branding: true
    }
  },
  pro: {
    id: 'pro', name: 'Profesional', monthly: 69, yearly: 690, recommended: true,
    tagline: 'Para tiendas que quieren crecer',
    limits: {
      products: 1000, catalogs: 3, templates: 'all', categories: null,
      whatsappNumbers: 1, customization: 'full', productPage: true, customDomain: true,
      stats: 'basic', syncMinutes: 15, branding: false
    }
  },
  business: {
    id: 'business', name: 'Empresa', monthly: 149, yearly: 1490,
    tagline: 'Para distribuidores y equipos de venta',
    limits: {
      products: 10000, catalogs: 10, templates: 'all', categories: null,
      whatsappNumbers: 5, customization: 'full', productPage: true, customDomain: true,
      stats: 'advanced', syncMinutes: 5, branding: false
    }
  }
};
CA.PLAN_ORDER = ['free', 'starter', 'pro', 'business'];

/** Filas de la tabla comparativa de la landing. */
CA.PLAN_FEATURES = [
  ['Productos', (l) => l.products.toLocaleString('es-BO')],
  ['Catálogos', (l) => String(l.catalogs)],
  ['Plantillas', (l) => (l.templates === 'all' ? 'Todas' : String(l.templates.length))],
  ['Google Sheets', () => true],
  ['Google Drive', () => true],
  ['Buscador', () => true],
  ['Categorías', (l) => (l.categories == null ? 'Ilimitadas' : String(l.categories))],
  ['WhatsApp', (l) => (l.whatsappNumbers > 1 ? 'Varios números' : true)],
  ['Personalización', (l) => ({ none: false, basic: 'Básica', full: 'Completa' }[l.customization])],
  ['Página individual de producto', (l) => l.productPage],
  ['Dominio propio', (l) => l.customDomain],
  ['Estadísticas', (l) => ({ none: false, basic: 'Básicas', advanced: 'Avanzadas' }[l.stats])],
  ['Sincronización', (l) => (l.syncMinutes >= 1440 ? 'Cada 24 h' : 'Cada ' + l.syncMinutes + ' min')]
];
