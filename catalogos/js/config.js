/*
 * Configuración central de la plataforma.
 * Para cambiar el nombre temporal, el dominio o los datos de contacto, edite solo este archivo.
 */
window.CA = window.CA || {};
CA.CONFIG = {
  brand: {
    name: 'Catalogia',                 // nombre temporal de la plataforma
    short: 'C',                        // letra del isotipo
    tagline: 'Catálogos digitales desde Google Sheets',
    domain: 'catalogia.app',           // dominio simulado para los enlaces públicos
    supportEmail: 'hola@catalogia.app',
    supportWhatsApp: '59170000000'     // número de ventas (ficticio)
  },
  currency: 'Bs',
  locale: 'es-BO',
  trialDays: 14,
  storageKey: 'catalogia:db',
  sessionKey: 'catalogia:session',
  dataVersion: 4,                      // subir para regenerar la demostración si cambian los datos
  demoAccount: { email: 'demo@catalogia.app', label: 'TecnoStore Bolivia' }
};
