/*
 * Configuración central de la presentación.
 * Cambie aquí el nombre de la plataforma, la tienda de ejemplo, los contactos y las rutas de imágenes.
 * Todos los textos con data-brand se reemplazan automáticamente con brand.name.
 */
window.MF_CONFIG = {
  brand: {
    name: 'ModaFlow', // nombre temporal: cámbielo aquí y se actualiza en todo el sitio
    description: 'Plataforma inteligente de gestión de ventas, inventario y catálogos online para tiendas de ropa.',
    slogan: 'Tu tienda organizada, tus ventas bajo control',
    subslogan: 'Registra tus prendas con inteligencia artificial, controla tu inventario y vende por internet desde Bs 30 al mes.',
    country: 'Bolivia',
    // Número de WhatsApp comercial de la plataforma (solo dígitos con código de país, p. ej. 5917xxxxxxx).
    // Vacío = el botón abre WhatsApp para elegir el contacto, sin un número inventado.
    salesWhatsapp: ''
  },
  currency: 'Bs',

  // Tienda de demostración usada en todos los prototipos
  store: {
    name: 'MioShop',
    fullName: 'MioShop — Moda Femenina',
    category: 'Moda femenina',
    slogan: 'Tu próximo outfit favorito está aquí',
    logo: 'assets/logos/mio-logo.png',
    // Banner original de la tienda. Vacío = banner compuesto con las fotos reales de las prendas.
    // Para usar el banner propio: copie la imagen en assets/banners/ y escriba aquí la ruta, p. ej. 'assets/banners/mioshop-banner.jpg'.
    banner: '',
    // Número de WhatsApp de demostración. Vacío = WhatsApp pide elegir el contacto (no se usa un número inventado).
    // También se puede configurar desde el panel: Catálogo online → Configuración.
    whatsapp: '',
    city: 'Bolivia'
  },

  // Registro de prendas con Claude: el navegador llama a este endpoint del servidor (server/server.mjs),
  // que es el único que conoce la API key. Ruta relativa = mismo servidor que sirve el sitio.
  ai: { endpoint: 'api/ia', maxImageEdge: 1280, timeoutMs: 70000 },

  storageKey: 'modaflow:db',
  cartKey: 'modaflow:cart',
  dataVersion: 4
};
