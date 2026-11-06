/*
 * Plantillas de catálogo. Cada una tiene una estructura visual propia
 * (no solo colores) y una configuración de diseño inicial.
 */
window.CA = window.CA || {};

CA.FONTS = {
  modern: { label: 'Moderna', heading: "'Plus Jakarta Sans', system-ui, sans-serif", body: "'Plus Jakarta Sans', system-ui, sans-serif" },
  elegant: { label: 'Elegante', heading: "'Playfair Display', Georgia, serif", body: "'Inter', system-ui, sans-serif" },
  friendly: { label: 'Amigable', heading: "'Nunito', system-ui, sans-serif", body: "'Nunito', system-ui, sans-serif" },
  technical: { label: 'Técnica', heading: "'Space Grotesk', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif" }
};

CA.SECTIONS = {
  hero: 'Banner principal',
  categories: 'Categorías destacadas',
  featured: 'Productos destacados',
  benefits: 'Beneficios / confianza',
  products: 'Todos los productos'
};

CA.TEMPLATES = {
  nova: {
    id: 'nova', name: 'Nova', industry: 'Tecnología y electrónica',
    description: 'Encabezado oscuro, banner dividido, filtros laterales y tarjetas con especificaciones.',
    layout: 'sidebar',
    defaults: {
      colors: { primary: '#2563eb', secondary: '#0f172a', background: '#f4f6fb', text: '#0f172a' },
      font: 'modern', columns: 4,
      card: { style: 'shadow', ratio: 'square', showSku: true, showBrand: true },
      buttons: { shape: 'rounded' },
      banner: { show: true, title: 'Tecnología que rinde', subtitle: 'Laptops, componentes y accesorios con garantía. Consulta disponibilidad por WhatsApp.', cta: 'Ver productos', image: 'art:laptop:#2563eb', align: 'left' }
    }
  },
  atelier: {
    id: 'atelier', name: 'Atelier', industry: 'Ropa y moda',
    description: 'Estilo editorial: tipografía serif, fotos verticales y categorías en línea.',
    layout: 'editorial',
    defaults: {
      colors: { primary: '#111111', secondary: '#c8a27a', background: '#ffffff', text: '#111111' },
      font: 'elegant', columns: 3,
      card: { style: 'flat', ratio: 'portrait', showSku: false, showBrand: false },
      buttons: { shape: 'square' },
      banner: { show: true, title: 'Nueva colección', subtitle: 'Prendas pensadas para la ciudad. Escríbenos para tallas y colores.', cta: 'Explorar', image: 'art:jacket:#c8a27a', align: 'center' }
    }
  },
  glow: {
    id: 'glow', name: 'Glow', industry: 'Belleza y cosméticos',
    description: 'Colores suaves, categorías circulares y tarjetas redondeadas.',
    layout: 'soft',
    defaults: {
      colors: { primary: '#db2777', secondary: '#fdf2f8', background: '#fffafc', text: '#3b0a24' },
      font: 'friendly', columns: 4,
      card: { style: 'border', ratio: 'square', showSku: false, showBrand: true },
      buttons: { shape: 'pill' },
      banner: { show: true, title: 'Tu rutina, tu brillo', subtitle: 'Skincare y maquillaje originales. Te asesoramos por WhatsApp.', cta: 'Comprar ahora', image: 'art:serum:#db2777', align: 'center' }
    }
  },
  mayorista: {
    id: 'mayorista', name: 'Mayorista', industry: 'Distribuidores y mayoristas',
    description: 'Lista compacta tipo pedido, código visible y cantidades para consultar por volumen.',
    layout: 'list',
    defaults: {
      colors: { primary: '#0f766e', secondary: '#f59e0b', background: '#f6f7f5', text: '#1c2a27' },
      font: 'technical', columns: 2,
      card: { style: 'border', ratio: 'square', showSku: true, showBrand: true },
      buttons: { shape: 'square' },
      banner: { show: true, title: 'Lista de precios por mayor', subtitle: 'Arma tu lista y envíanos tu pedido por WhatsApp. Precios sujetos a volumen.', cta: 'Ver lista', image: 'art:box:#0f766e', align: 'left' }
    }
  }
};
CA.TEMPLATE_ORDER = ['nova', 'atelier', 'glow', 'mayorista'];

/** Diseño completo de un catálogo nuevo según la plantilla elegida. */
CA.defaultDesign = function (templateId, businessName) {
  const t = CA.TEMPLATES[templateId] || CA.TEMPLATES.nova;
  const d = JSON.parse(JSON.stringify(t.defaults));
  return Object.assign(d, {
    template: t.id,
    businessName: businessName || 'Mi negocio',
    logo: null,
    menu: { categories: true, about: true, contact: true, search: true },
    sections: ['hero', 'categories', 'featured', 'benefits', 'products'].map((id) => ({ id, on: true })),
    featuredCategories: [],
    featuredProducts: [],
    benefits: ['Productos originales', 'Atención por WhatsApp', 'Envíos a todo el país'],
    footer: { text: 'Consultas y pedidos por WhatsApp. Precios sujetos a cambio sin previo aviso.', address: '', hours: 'Lun a Sáb · 9:00 a 19:00', instagram: '', facebook: '' }
  });
};
