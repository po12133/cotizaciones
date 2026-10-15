/*
 * Cotización FEDAPABENI — contenido estructurado, campos editables y presupuesto con recálculo.
 * Los cambios se guardan en localStorage y son leídos por pdf.js al exportar.
 */
(function (global) {
  'use strict';

  const KEY = 'fedapabeni-cotizacion-v1';
  const CEILING = 37000;

  /* ================= datos ================= */
  // Campos editables. Valor vacío = marcador visible "[Por completar …]". No se inventan datos legales.
  const FIELD_DEFAULTS = {
    quoteNo: 'AMS-FEDA-2026-01',
    date: '15 de octubre de 2026',
    validity: '15',
    companyName: 'Amicornios Soft',
    companyLegal: '',
    companyNit: '',
    companyRep: '',
    companyCity: 'Cochabamba, Bolivia',
    companyEmail: 'vargascarlos12123@gmail.com', // Publicado en soft.amicornios.com
    companyPhone: '+591 71450557', // Publicado en soft.amicornios.com
    clientContact: '',
    prototypeUrl: '',
    team1: '', team2: '', team3: '', team4: '',
  };
  const FIELD_LABELS = {
    companyLegal: 'razón social', companyNit: 'NIT', companyRep: 'nombre del representante legal', clientContact: 'responsable designado por IPHAE/FEDAPABENI',
    prototypeUrl: 'URL pública del prototipo', team1: 'nombre', team2: 'nombre', team3: 'nombre', team4: 'nombre', quoteNo: 'número', date: 'fecha',
    companyName: 'empresa', companyCity: 'ciudad', companyEmail: 'correo', companyPhone: 'teléfono', validity: 'días',
  };

  const BUDGET = [
    { id: 'diseno', group: 'A', concept: 'Diseño UI/UX responsive', desc: 'Arquitectura de información, prototipo, diseño visual del sitio y del panel, adaptación a celular y tableta.', comp: 'diseno', amount: 4000 },
    { id: 'directorio', group: 'A', concept: 'Directorio de asociaciones', desc: 'Directorio con buscador y filtros; fichas individuales con fotos, productos, capacidades y contacto.', comp: 'desarrollo', amount: 4000 },
    { id: 'catalogo', group: 'A', concept: 'Catálogo y fichas de productos', desc: 'Catálogo por categorías con filtros y ordenamiento; fichas con galería, presentación y disponibilidad.', comp: 'desarrollo', amount: 5000 },
    { id: 'panel', group: 'A', concept: 'Panel administrativo y CMS', desc: 'Gestión de organizaciones, productos, categorías, noticias, galería, consultas, usuarios y ajustes.', comp: 'desarrollo', amount: 6000 },
    { id: 'contacto', group: 'A', concept: 'WhatsApp, formularios y mapas', desc: 'WhatsApp click-to-chat, formularios de contacto y de compra con aviso por correo, mapa Leaflet/OSM.', comp: 'desarrollo', amount: 3000 },
    { id: 'noticias', group: 'A', concept: 'Noticias, eventos y multimedia', desc: 'Noticias, ferias, eventos y oportunidades comerciales; galería de fotos y videos.', comp: 'desarrollo', amount: 2000 },
    { id: 'seo', group: 'B', concept: 'SEO, seguridad y optimización', desc: 'SSL, configuración segura, copias de respaldo, rendimiento, metadatos, sitemap y Search Console.', comp: 'implementacion', amount: 2000 },
    { id: 'hosting', group: 'B', concept: 'Hosting y despliegue por un año', desc: 'Hosting, dominio y SSL por 12 meses; configuración, pruebas y puesta en producción.', comp: 'hosting', amount: 1500 },
    { id: 'capacitacion', group: 'C', concept: 'Capacitación y documentación', desc: 'Capacitación práctica al personal de FEDAPABENI y manual básico de administración.', comp: 'capacitacion', amount: 1500 },
    { id: 'garantia', group: 'C', concept: 'Pruebas, garantía y soporte', desc: 'Pruebas funcionales y en dispositivos; garantía y soporte técnico de 90 días.', comp: 'soporte', amount: 3000 },
  ];
  const GROUPS = { A: 'Diseño y desarrollo de la plataforma', B: 'Implementación, seguridad y funcionamiento', C: 'Capacitación, pruebas y garantía' };
  const COMPONENTS = [
    ['diseno', 'Diseño'],
    ['desarrollo', 'Desarrollo y programación'],
    ['implementacion', 'Implementación (seguridad, SEO, publicación)'],
    ['hosting', 'Hosting, dominio y funcionamiento durante el primer año'],
    ['capacitacion', 'Capacitación'],
    ['soporte', 'Soporte y garantía'],
    ['otros', 'Otros costos necesarios'],
  ];

  const MODULES = [
    { icon: 'home', title: 'Inicio institucional y comercial', tdr: '§6.4', desc: 'Portada que presenta a FEDAPABENI y su oferta, con buscador, destacados y accesos directos.', feats: ['Quiénes somos, objetivos y trayectoria', 'Cobertura territorial y modelo “Bosque en Pie”', 'Buscador de productos y asociaciones'] },
    { icon: 'users', title: 'Directorio de asociaciones y emprendimientos', tdr: '§6.5', desc: 'Listado de organizaciones afiliadas con filtros por ubicación, rubro y tipo.', feats: ['AAGROPAMA, ACOPALT, APPAA-VD, AIPRANCA, ARPHAE, AJORA y otras', 'Buscador y paginación', 'Escalable a nuevas organizaciones'] },
    { icon: 'store', title: 'Catálogo comercial de productos amazónicos', tdr: '§6.7', desc: 'Catálogo por categorías: pulpas de asaí, copoazú y majo, cacao silvestre, harina de plátano y más.', feats: ['Filtros por categoría y organización', 'Ordenamiento y buscador', 'Disponibilidad y presentaciones'] },
    { icon: 'package', title: 'Fichas detalladas de productos', tdr: '§6.7', desc: 'Página por producto con galería, descripción, características y organización productora.', feats: ['Presentación, unidad y pedido mínimo', 'Temporada y disponibilidad', 'Consulta por WhatsApp y solicitud de cotización'] },
    { icon: 'building', title: 'Perfiles de asociaciones', tdr: '§6.6', desc: 'Ficha individual de cada organización con toda la información exigida por los TDR.', feats: ['Nombre, ubicación y descripción', 'Productos, fotografías y capacidades', 'Contacto y canales comerciales'] },
    { icon: 'whatsapp', title: 'Integración con WhatsApp', tdr: '§6.8', desc: 'Botones de WhatsApp con mensajes prellenados por producto y por organización.', feats: ['Número general configurable', 'Número propio por asociación', 'Botón flotante en todo el sitio'] },
    { icon: 'mail', title: 'Formularios de contacto y compras', tdr: '§6.8', desc: 'Formulario de contacto y formulario de solicitudes de información y consultas/compras.', feats: ['Validación de campos y antispam', 'Aviso por correo a FEDAPABENI', 'Bandeja de consultas en el panel'] },
    { icon: 'map', title: 'Mapa interactivo', tdr: '§6.9', desc: 'Georreferenciación de organizaciones y territorios con Leaflet y OpenStreetMap.', feats: ['Marcadores con ventana de información', 'Enlaces a perfiles', 'Sin costos de licencia'] },
    { icon: 'image', title: 'Galería multimedia', tdr: '§6.10', desc: 'Fotografías y videos de productos, territorios y actividades.', feats: ['Visor ampliado (lightbox)', 'Videos incrustados', 'Imágenes optimizadas'] },
    { icon: 'newspaper', title: 'Noticias, eventos y ferias', tdr: '§6.10', desc: 'Publicación de noticias, actividades, ferias, eventos y oportunidades comerciales.', feats: ['Filtros por tipo de publicación', 'Próximos eventos', 'Fichas de contenido'] },
    { icon: 'dashboard', title: 'Panel de administración', tdr: '§6.11', desc: 'Sistema para que el personal autorizado cree y edite todo el contenido.', feats: ['Organizaciones, productos y categorías', 'Noticias, galería y textos', 'Usuarios con roles y contraseña'] },
    { icon: 'shield', title: 'SEO, seguridad y optimización', tdr: '§6.12', desc: 'Buenas prácticas de seguridad, posicionamiento y rendimiento.', feats: ['Certificado SSL y copias de respaldo', 'Metadatos, sitemap y URLs amigables', 'Carga rápida en redes móviles'] },
    { icon: 'smartphone', title: 'Diseño responsive', tdr: '§6.2', desc: 'Interfaz adaptable a computadoras, tabletas y celulares, con navegación simple.', feats: ['Diseño mobile-first', 'Accesibilidad básica', 'Navegadores modernos'] },
    { icon: 'cap', title: 'Capacitación y documentación', tdr: '§6.13 · §15', desc: 'Capacitación práctica y manual para que FEDAPABENI administre su plataforma.', feats: ['8 temas obligatorios de los TDR', 'Manual básico de administración', 'Antes de la recepción definitiva'] },
  ];

  // Fases: [inicio, fin] en días calendario (inclusive). who: A = Amicornios Soft, F = FEDAPABENI, I = IPHAE
  const PHASES = [
    { name: 'Inicio, levantamiento de requerimientos y arquitectura', s: 1, e: 3, who: 'A · F · I', acts: 'Reunión de inicio, relevamiento de contenidos, estructura del sitio, catálogo y directorio.', prod: 'P1 · Documento de requerimientos y arquitectura', ms: [3] },
    { name: 'Diseño UX/UI y propuesta gráfica', s: 3, e: 6, who: 'A · F', acts: 'Mapa de navegación, diseño de páginas clave y panel, validación con FEDAPABENI.', prod: 'P2 · Diseño UX/UI aprobado', ms: [6] },
    { name: 'Desarrollo base, CMS y panel de administración', s: 5, e: 11, who: 'A', acts: 'Instalación, tipos de contenido, roles, panel y plantillas responsive.', prod: 'Avance demostrable', ms: [] },
    { name: 'Directorio, fichas y catálogo comercial', s: 7, e: 12, who: 'A', acts: 'Directorio con filtros, perfiles, catálogo, fichas de producto y buscador.', prod: 'P4 · Directorio · P5 · Catálogo', ms: [12] },
    { name: 'Contacto, WhatsApp, mapa, galería y noticias', s: 9, e: 13, who: 'A', acts: 'Formularios, WhatsApp, mapa Leaflet/OSM, galería y noticias.', prod: 'P3 · Plataforma funcional · P6 · Contacto y mapa', ms: [13] },
    { name: 'Carga inicial de contenidos', s: 10, e: 14, who: 'F · A', acts: 'FEDAPABENI entrega y valida contenidos; carga asistida de organizaciones y productos.', prod: 'Contenido inicial publicado', ms: [] },
    { name: 'SEO, seguridad, optimización y pruebas', s: 13, e: 15, who: 'A · F', acts: 'Pruebas funcionales y en dispositivos, seguridad, rendimiento y SEO básico.', prod: 'Informe de pruebas', ms: [] },
    { name: 'Despliegue: hosting, dominio, SSL y producción', s: 15, e: 16, who: 'A · F', acts: 'Configuración de hosting y dominio, SSL, publicación y verificación.', prod: 'P8 · Página publicada y funcionando', ms: [16] },
    { name: 'Capacitación y manual de administración', s: 16, e: 17, who: 'A · F', acts: 'Capacitación práctica al personal designado y entrega del manual.', prod: 'P7 · Panel y capacitación · P9 · Manual', ms: [17] },
    { name: 'Cierre: código, accesos e informe final', s: 17, e: 18, who: 'A · I · F', acts: 'Transferencia de accesos, código y recursos; informe final y recepción.', prod: 'P10 · Código y accesos · P11 · Informe final', ms: [18] },
  ];

  const METHOD = [
    ['search', 'Descubrir', 'Requerimientos y arquitectura validados con IPHAE y FEDAPABENI.'],
    ['palette', 'Diseñar', 'Prototipo y diseño UX/UI aprobados antes de programar.'],
    ['code', 'Construir', 'Desarrollo por módulos con avances demostrables.'],
    ['check-circle', 'Validar', 'Pruebas en dispositivos, seguridad y ajustes.'],
    ['cap', 'Entregar', 'Publicación, capacitación, manual y transferencia total.'],
  ];

  const DELIVERABLES = [
    ['Documento de requerimientos, estructura y arquitectura de la plataforma', 'Documento PDF: requerimientos, mapa del sitio, estructura de catálogo y directorio, arquitectura técnica.', 3],
    ['Diseño UX/UI y propuesta gráfica de la página', 'Diseños de páginas clave (escritorio y móvil) y guía visual.', 6],
    ['Página web desarrollada y funcional, con módulos institucionales y comerciales', 'Plataforma operativa en entorno de pruebas.', 13],
    ['Directorio digital de organizaciones y emprendimientos', 'Directorio con fichas de las organizaciones indicadas por FEDAPABENI.', 12],
    ['Catálogo comercial de productos amazónicos', 'Catálogo por categorías con fichas de productos.', 12],
    ['Sistema de contacto, formularios, integración con WhatsApp y mapa', 'Formularios con aviso por correo, WhatsApp y mapa georreferenciado.', 13],
    ['Panel de administración y capacitación al personal de FEDAPABENI', 'Usuarios administradores creados y sesiones de capacitación con lista de asistencia.', 17],
    ['Página publicada, configurada, probada y funcionando', 'Sitio en el dominio de FEDAPABENI con SSL.', 16],
    ['Manual básico para administración y actualización de contenidos', 'Manual en PDF con capturas paso a paso.', 17],
    ['Entrega de código fuente y accesos administrativos', 'Repositorio/archivo del código, base de datos, recursos gráficos y acta de credenciales.', 18],
    ['Informe final de la consultoría con recomendaciones de sostenibilidad', 'Trabajos realizados, estado final y recomendaciones para el segundo año.', 18],
  ];

  const HIGHLIGHTS = [
    ['globe', 'Plataforma web funcional'], ['code', 'Código fuente'], ['database', 'Base de datos y estructura'],
    ['lock', 'Accesos administrativos'], ['server', 'Dominio y hosting configurados'], ['book', 'Manual de administración'],
    ['cap', 'Capacitación al personal'], ['shield', 'Garantía mínima de 90 días'], ['calendar', 'Hosting durante el primer año'],
  ];

  const TDR = [
    ['§6.1', 'Análisis y arquitectura', 'Producto 1: requerimientos, estructura, categorías, catálogo y directorio (días 1–3).'],
    ['§6.2', 'Diseño UX/UI adaptable', 'Producto 2 y módulo 13: diseño mobile-first para computadoras, tabletas y celulares.'],
    ['§6.3', 'Desarrollo web', 'Módulos 1 a 14, institucionales y comerciales.'],
    ['§6.4', 'Módulo institucional', 'Módulo 1: objetivos, trayectoria, cobertura, afiliadas y “Bosque en Pie”.'],
    ['§6.5', 'Directorio de organizaciones', 'Módulo 2: AAGROPAMA, ACOPALT, APPAA-VD, AIPRANCA, ARPHAE, AJORA y otras.'],
    ['§6.6', 'Fichas individuales', 'Módulo 5: nombre, ubicación, descripción, productos, fotos, capacidades, contacto y canales.'],
    ['§6.7', 'Catálogo comercial', 'Módulos 3 y 4: categorías, disponibilidad, presentaciones y características.'],
    ['§6.8', 'Contacto y oportunidades', 'Módulos 6 y 7: formulario de contacto, de solicitudes/compras y WhatsApp.'],
    ['§6.9', 'Mapa y georreferenciación', 'Módulo 8: Leaflet + OpenStreetMap con enlaces a perfiles.'],
    ['§6.10', 'Galería y noticias', 'Módulos 9 y 10: fotos, videos, noticias, ferias, eventos y oportunidades.'],
    ['§6.11', 'Panel de administración', 'Módulo 11: crear y editar organizaciones, productos, fotos, textos y noticias.'],
    ['§6.12', 'Seguridad y posicionamiento', 'Módulo 12: SSL, seguridad básica, SEO básico y buenas prácticas.'],
    ['§6.13 · §15', 'Capacitación', 'Módulo 14: capacitación práctica en los 8 temas obligatorios.'],
    ['§6.14', 'Implementación', 'Fase 8: hosting, dominio, pruebas y puesta en producción.'],
    ['§6.15 · §16', 'Funcionamiento por un año', 'Hosting, dominio y SSL por 12 meses incluidos en el monto.'],
    ['§8', 'Cronograma inferior a 20 días', '18 días calendario, con actividades, responsables, productos y fechas.'],
    ['§13', 'Propiedad y transferencia', 'Entrega de credenciales, hosting, dominio, base de datos, código y recursos.'],
    ['§14', 'Garantía mínima de 90 días', '90 días de corrección de errores sin costo adicional.'],
  ];

  const EXPERIENCE = [
    ['Soy Emprendedor — Infocal Santa Cruz', 'https://soyemprendedor.infocalscz.edu.bo/', 'Directorio donde egresados publican sus emprendimientos, con registro.', 'Directorio de emprendimientos y fichas'],
    ['Tecquimica', 'https://tecquimica.com.bo/es/', 'Catálogo tipo e-commerce con ventas concretadas por WhatsApp, versión en inglés y adaptación móvil.', 'Catálogo comercial + WhatsApp'],
    ['Union Agronegocios', 'https://www.union.com.bo/', 'E-commerce mayorista y minorista con sección de pago de créditos.', 'Comercio del sector agropecuario'],
    ['Infocal Laboral', 'https://laboral.infocalscz.edu.bo/', 'Bolsa de trabajo para empresas y estudiantes, con verificación y gráficos de postulaciones.', 'Plataforma administrable con indicadores'],
    ['Comerarte — Infocal Santa Cruz', 'https://comerarte.infocalscz.edu.bo/', 'Venta de entradas para el evento y emisión de certificados de participación.', 'Eventos y ferias'],
    ['Monte Fuego Samaipata', 'https://montefuegosamaipata.com/es/', 'Sitio de reservas con calendario y secciones adaptadas a móvil.', 'Sitio institucional responsive'],
  ];

  const TEAM = [
    ['team1', 'Director/a de proyecto y arquitecto/a de software', 'Coordinación con IPHAE/FEDAPABENI, arquitectura, calidad y cumplimiento del cronograma.'],
    ['team2', 'Diseñador/a UX/UI', 'Experiencia de usuario, interfaz, identidad visual y diseño responsive.'],
    ['team3', 'Desarrollador/a full-stack', 'CMS, módulos, integraciones (WhatsApp, formularios, mapa), seguridad y SEO.'],
    ['team4', 'Responsable de QA, despliegue y capacitación', 'Pruebas, hosting y dominio, capacitación, manual y soporte en garantía.'],
  ];

  const REFS = [
    ['Convocatoria oficial IPHAE / FEDAPABENI (boletín CEBEM)', 'https://cebem.org/boletin/2026/IPHAE_1/boletin.html', 'Publicación de la convocatoria.'],
    ['Términos de Referencia (PDF)', 'https://cebem.org/boletin/2026/IPHAE_1/TDR_Pagina_Web_Comercial_FEDAPABENI_IPHAE.pdf', 'Documento oficial usado como fuente prioritaria.'],
    ['Portal CEBEM', 'https://cebem.org/', 'Centro Boliviano de Estudios Multidisciplinarios.'],
    ['Presentación de propuestas', 'mailto:iphae_riberalta@yahoo.com', 'iphae_riberalta@yahoo.com (TDR §18).'],
    ['Amicornios', 'https://amicornios.com/', 'Sitio principal de la empresa.'],
    ['Amicornios Soft — portafolio', 'https://soft.amicornios.com/', 'Servicios, tecnologías y proyectos realizados.'],
    ['Prototipo interactivo', 'prototipo/index.html', 'Demostración de la plataforma propuesta.'],
    ['Panel administrativo (demo)', 'prototipo/admin/index.html', 'Demostración de la gestión de contenidos.'],
    ['OpenStreetMap', 'https://www.openstreetmap.org/', 'Cartografía libre para el mapa.'],
    ['Leaflet.js', 'https://leafletjs.com/', 'Librería de mapas interactivos.'],
    ['Wikimedia Commons', 'https://commons.wikimedia.org/', 'Fuente de las fotografías demostrativas (licencias libres).'],
  ];

  const PAY = [['30 %', 'Aprobación de los productos 1 y 2 (requerimientos y diseño)', 'Día 6'], ['40 %', 'Aprobación de los productos 3 a 6 (plataforma, directorio, catálogo, contacto y mapa)', 'Día 13'], ['30 %', 'Recepción definitiva: productos 7 a 11 (publicación, capacitación, manual, accesos e informe)', 'Día 18']];

  /* ================= estado ================= */
  function load() {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { s = {}; }
    return {
      fields: Object.assign({}, FIELD_DEFAULTS, s.fields || {}),
      budget: Object.assign({}, Object.fromEntries(BUDGET.map(function (b) { return [b.id, b.amount]; })), s.budget || {}),
      startDate: s.startDate || '',
    };
  }
  const state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* almacenamiento no disponible */ } }

  /* ================= utilidades ================= */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n, noPrefix) {
    const v = Math.round((Number(n) || 0) * 100) / 100;
    const [i, d] = Math.abs(v).toFixed(2).split('.');
    return (noPrefix ? '' : 'Bs ') + (v < 0 ? '−' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + d;
  }
  const U = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
  const T = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const H = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
  function w999(n) {
    if (n === 0) return '';
    if (n === 100) return 'CIEN';
    const h = Math.floor(n / 100);
    const r = n % 100;
    const rest = r < 30 ? U[r] : T[Math.floor(r / 10)] + (r % 10 ? ' Y ' + U[r % 10] : '');
    return [H[h], rest].filter(Boolean).join(' ');
  }
  function apocope(s) { return s.replace(/VEINTIUNO$/, 'VEINTIÚN').replace(/UNO$/, 'UN'); }
  function words(n) {
    n = Math.floor(n);
    if (n === 0) return 'CERO';
    const m = Math.floor(n / 1e6);
    const k = Math.floor((n % 1e6) / 1000);
    const r = n % 1000;
    const parts = [];
    if (m) parts.push(m === 1 ? 'UN MILLÓN' : apocope(w999(m)) + ' MILLONES');
    if (k) parts.push(k === 1 ? 'MIL' : apocope(w999(k)) + ' MIL');
    if (r) parts.push(w999(r));
    return parts.join(' ');
  }
  function totalWords(n) {
    const cents = Math.round((n - Math.floor(n)) * 100);
    return words(n) + ' ' + String(cents).padStart(2, '0') + '/100 BOLIVIANOS';
  }
  function addDays(iso, d) { const dt = new Date(iso + 'T12:00:00'); dt.setDate(dt.getDate() + d); return dt; }
  function fmtShort(dt) { return dt.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }).replace('.', ''); }
  function fmtLong(dt) { return dt.toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
  function dayLabel(d) { return state.startDate ? fmtShort(addDays(state.startDate, d - 1)) : 'Día ' + d; }

  function total() { return BUDGET.reduce(function (s, b) { return s + (Number(state.budget[b.id]) || 0); }, 0); }

  function toast(msg, type) {
    let host = document.getElementById('toasts');
    if (!host) { host = document.createElement('div'); host.id = 'toasts'; host.className = 'toasts no-pdf'; host.setAttribute('role', 'status'); document.body.appendChild(host); }
    const t = document.createElement('div');
    t.className = 'toast ' + (type || '');
    t.innerHTML = icon(type === 'error' ? 'alert' : 'check-circle') + '<span>' + esc(msg) + '</span>';
    host.appendChild(t);
    setTimeout(function () { t.classList.add('out'); }, 3600);
    setTimeout(function () { t.remove(); }, 4100);
  }

  /* ================= campos editables ================= */
  /** URL pública del prototipo: la editada, o la deducida si la cotización está publicada en un dominio real. */
  function protoUrl() {
    if (state.fields.prototypeUrl) return state.fields.prototypeUrl;
    if (/^https?:$/.test(location.protocol) && !/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname)) return new URL('prototipo/index.html', location.href).href;
    return '';
  }

  function placeholder(k) { return '[Por completar: ' + (FIELD_LABELS[k] || k) + ']'; }

  function paintFields(except) {
    document.querySelectorAll('[data-f]').forEach(function (el) {
      if (el === except) return;
      const k = el.dataset.f;
      const v = k === 'prototypeUrl' ? protoUrl() : state.fields[k];
      el.textContent = v || '';
      el.dataset.ph = placeholder(k);
      el.classList.toggle('is-empty', !v);
    });
    const a = document.getElementById('protoLink');
    if (a && protoUrl()) a.href = protoUrl();
  }

  function initFields() {
    document.querySelectorAll('[data-f]').forEach(function (el) {
      if (el.closest('a')) return; // los enlaces se editan desde su propio control
      el.setAttribute('contenteditable', 'plaintext-only');
      if (el.contentEditable !== 'plaintext-only') el.setAttribute('contenteditable', 'true');
      el.setAttribute('spellcheck', 'false');
      el.setAttribute('role', 'textbox');
      el.setAttribute('aria-label', 'Editar ' + (FIELD_LABELS[el.dataset.f] || el.dataset.f));
      el.classList.add('editable');
    });
    document.addEventListener('input', function (e) {
      const el = e.target.closest && e.target.closest('[data-f]');
      if (!el) return;
      const k = el.dataset.f;
      state.fields[k] = el.textContent.replace(/\s+/g, ' ').trim();
      el.classList.toggle('is-empty', !state.fields[k]);
      save();
      paintFields(el);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.closest && e.target.closest('[data-f]')) { e.preventDefault(); e.target.blur(); }
    });
    document.addEventListener('paste', function (e) {
      const el = e.target.closest && e.target.closest('[data-f]');
      if (!el) return;
      e.preventDefault();
      document.execCommand('insertText', false, (e.clipboardData.getData('text/plain') || '').replace(/\s+/g, ' '));
    });
  }

  /* ================= render ================= */
  function renderModules() {
    document.getElementById('modules').innerHTML = MODULES.map(function (m, i) {
      return '<article class="module"><div class="m-top"><span class="m-ic">' + icon(m.icon) + '</span><span class="m-n">' + String(i + 1).padStart(2, '0') + '</span></div>' +
        '<h3>' + esc(m.title) + '</h3><p>' + esc(m.desc) + '</p><ul>' + m.feats.map(function (f) { return '<li>' + icon('check') + esc(f) + '</li>'; }).join('') + '</ul>' +
        '<span class="m-ref">TDR ' + esc(m.tdr) + '</span></article>';
    }).join('');
  }

  function renderTdr() {
    document.getElementById('tdrTable').insertAdjacentHTML('beforeend', '<thead><tr><th scope="col">TDR</th><th scope="col">Requisito</th><th scope="col">Respuesta de la propuesta</th><th scope="col">Estado</th></tr></thead><tbody>' +
      TDR.map(function (r) { return '<tr><td class="nowrap"><b>' + esc(r[0]) + '</b></td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td><td><span class="ok">' + icon('check') + 'Incluido</span></td></tr>'; }).join('') + '</tbody>');
  }

  function renderMethod() {
    document.getElementById('method').innerHTML = METHOD.map(function (m, i) {
      return '<div class="step"><span class="s-ic">' + icon(m[0]) + '</span><b><small>' + (i + 1) + '.</small> ' + esc(m[1]) + '</b><span>' + esc(m[2]) + '</span></div>';
    }).join('');
  }

  function renderSchedule() {
    const days = 18;
    let h = '<div class="g-row g-head"><div class="g-label">Fase</div><div class="g-days">';
    for (let d = 1; d <= days; d++) {
      const dt = state.startDate ? addDays(state.startDate, d - 1) : null;
      const we = dt && (dt.getDay() === 0 || dt.getDay() === 6);
      h += '<span class="' + (we ? 'we' : '') + '" title="' + (dt ? esc(fmtLong(dt)) : 'Día ' + d) + '">' + (dt ? dt.getDate() : d) + '</span>';
    }
    h += '</div></div>';
    PHASES.forEach(function (p, i) {
      h += '<div class="g-row"><div class="g-label"><b>' + (i + 1) + '</b>' + esc(p.name) + '</div><div class="g-days">' +
        '<span class="g-bar' + (p.who.indexOf('F') === 0 ? ' client' : '') + '" style="grid-column:' + p.s + ' / ' + (p.e + 1) + '" title="' + esc(dayLabel(p.s) + ' – ' + dayLabel(p.e)) + '"></span>' +
        p.ms.map(function (m) { return '<span class="g-ms" style="grid-column:' + m + '" title="Entrega: ' + esc(dayLabel(m)) + '">◆</span>'; }).join('') +
        '</div></div>';
    });
    document.getElementById('gantt').innerHTML = h;
    const end = state.startDate ? addDays(state.startDate, days - 1) : null;
    document.getElementById('ganttNote').innerHTML = '<span class="lg"><i class="sw a"></i>Amicornios Soft</span> <span class="lg"><i class="sw f"></i>FEDAPABENI (contenidos y validación)</span> <span class="lg"><b>◆</b> Entrega de producto</span> · ' +
      (end ? 'Inicio: <b>' + esc(fmtLong(addDays(state.startDate, 0))) + '</b> · Conclusión: <b>' + esc(fmtLong(end)) + '</b> (18 días calendario).' : 'Fechas relativas (día 1 = día siguiente a la firma del contrato u orden de inicio).');

    document.getElementById('phaseTable').innerHTML = '<thead><tr><th scope="col">#</th><th scope="col">Fase y actividades</th><th scope="col">Responsables</th><th scope="col">Productos</th><th scope="col">Fechas</th></tr></thead><tbody>' +
      PHASES.map(function (p, i) {
        return '<tr><td><b>' + (i + 1) + '</b></td><td><b>' + esc(p.name) + '</b><br><span class="muted small">' + esc(p.acts) + '</span></td><td class="nowrap">' + esc(p.who) + '</td><td>' + esc(p.prod) + '</td><td class="nowrap">' + esc(dayLabel(p.s)) + (p.e !== p.s ? ' – ' + esc(dayLabel(p.e)) : '') + '</td></tr>';
      }).join('') + '</tbody><tfoot><tr><td colspan="5" class="small muted">A = Amicornios Soft · F = FEDAPABENI · I = IPHAE (supervisión). Duración total: 18 días calendario, inferior al máximo de 20 días (TDR §8).</td></tr></tfoot>';
  }

  function renderBudget() {
    const tot = total();
    let h = '<thead><tr><th scope="col">N.º</th><th scope="col">Concepto</th><th scope="col" class="num">Monto (Bs)</th><th scope="col" class="num">%</th></tr></thead><tbody>';
    let n = 0;
    Object.keys(GROUPS).forEach(function (g) {
      const rows = BUDGET.filter(function (b) { return b.group === g; });
      const sub = rows.reduce(function (s, b) { return s + (Number(state.budget[b.id]) || 0); }, 0);
      h += '<tr class="grp"><td colspan="4">' + g + '. ' + esc(GROUPS[g]) + '</td></tr>';
      rows.forEach(function (b) {
        n++;
        const v = Number(state.budget[b.id]) || 0;
        h += '<tr><td>' + n + '</td><td><b>' + esc(b.concept) + '</b><br><span class="small muted">' + esc(b.desc) + '</span></td>' +
          '<td class="num"><label class="sr-only" for="b-' + b.id + '">Monto de ' + esc(b.concept) + '</label><input class="amount" id="b-' + b.id + '" data-budget="' + b.id + '" type="number" inputmode="decimal" min="0" step="50" value="' + v + '"><span class="amount-print">' + money(v, true) + '</span></td>' +
          '<td class="num pct">' + (tot ? (v / tot * 100).toFixed(1).replace('.', ',') : '0,0') + ' %</td></tr>';
      });
      h += '<tr class="subtotal"><td></td><td>Subtotal ' + g + '</td><td class="num" data-sub="' + g + '">' + money(sub, true) + '</td><td class="num">' + (tot ? (sub / tot * 100).toFixed(1).replace('.', ',') : '0,0') + ' %</td></tr>';
    });
    h += '</tbody><tfoot><tr><td></td><td>TOTAL GENERAL</td><td class="num">' + money(tot) + '</td><td class="num">100 %</td></tr></tfoot>';
    document.getElementById('budgetTable').innerHTML = h;
  }

  /** Actualiza totales sin volver a dibujar los inputs (mantiene el foco al editar). */
  function updateTotals() {
    const tot = total();
    document.querySelectorAll('[data-total]').forEach(function (el) { el.textContent = money(tot); });
    document.querySelectorAll('[data-total-words]').forEach(function (el) { el.textContent = totalWords(tot); });
    BUDGET.forEach(function (b) {
      const inp = document.getElementById('b-' + b.id);
      if (!inp) return;
      const v = Number(state.budget[b.id]) || 0;
      inp.nextElementSibling.textContent = money(v, true);
      inp.closest('tr').querySelector('.pct').textContent = (tot ? (v / tot * 100).toFixed(1).replace('.', ',') : '0,0') + ' %';
    });
    Object.keys(GROUPS).forEach(function (g) {
      const sub = BUDGET.filter(function (b) { return b.group === g; }).reduce(function (s, b) { return s + (Number(state.budget[b.id]) || 0); }, 0);
      const cell = document.querySelector('[data-sub="' + g + '"]');
      if (cell) { cell.textContent = money(sub, true); cell.nextElementSibling.textContent = (tot ? (sub / tot * 100).toFixed(1).replace('.', ',') : '0,0') + ' %'; }
    });
    const tf = document.querySelector('#budgetTable tfoot .num');
    if (tf) tf.textContent = money(tot);

    const diff = CEILING - tot;
    document.getElementById('ceilDiff').textContent = diff >= 0 ? 'Margen bajo el techo: ' + money(diff) : 'Excede el techo en ' + money(-diff);
    document.getElementById('budgetAlert').innerHTML = diff < 0
      ? '<div class="alert">' + icon('alert') + '<span>El total supera el techo de Bs 37.000 establecido en los TDR (§9 y §12). Ajuste los montos antes de enviar la propuesta.</span></div>' : '';
    document.querySelector('.total-band').classList.toggle('over', diff < 0);

    const comp = {};
    BUDGET.forEach(function (b) { comp[b.comp] = (comp[b.comp] || 0) + (Number(state.budget[b.id]) || 0); });
    document.getElementById('componentTable').innerHTML = '<thead><tr><th scope="col">Componente</th><th scope="col" class="num">Monto</th></tr></thead><tbody>' +
      COMPONENTS.map(function (c) { return '<tr><td>' + esc(c[1]) + (c[0] === 'otros' ? '<br><span class="small muted">No se prevén costos adicionales.</span>' : '') + '</td><td class="num nowrap">' + money(comp[c[0]] || 0) + '</td></tr>'; }).join('') +
      '</tbody><tfoot><tr><td>Total</td><td class="num nowrap">' + money(tot) + '</td></tr></tfoot>';

    document.getElementById('payTable').innerHTML = '<thead><tr><th scope="col">%</th><th scope="col">Contra</th><th scope="col">Estimado</th><th scope="col" class="num">Monto</th></tr></thead><tbody>' +
      PAY.map(function (p) { return '<tr><td><b>' + p[0] + '</b></td><td>' + esc(p[1]) + '</td><td class="nowrap">' + esc(state.startDate ? fmtShort(addDays(state.startDate, parseInt(p[2].replace(/\D/g, ''), 10) - 1)) : p[2]) + '</td><td class="num nowrap">' + money(tot * parseInt(p[0], 10) / 100) + '</td></tr>'; }).join('') + '</tbody>';
  }

  function renderDeliverables() {
    document.getElementById('delivHighlights').innerHTML = HIGHLIGHTS.map(function (d) { return '<div class="dh">' + icon(d[0]) + '<span>' + esc(d[1]) + '</span></div>'; }).join('');
    document.getElementById('delivTable').innerHTML = '<thead><tr><th scope="col">N.º</th><th scope="col">Producto (TDR §7)</th><th scope="col">Forma de entrega</th><th scope="col">Entrega</th></tr></thead><tbody>' +
      DELIVERABLES.map(function (d, i) { return '<tr><td><b>P' + (i + 1) + '</b></td><td>' + esc(d[0]) + '</td><td class="small">' + esc(d[1]) + '</td><td class="nowrap">' + esc(dayLabel(d[2])) + '</td></tr>'; }).join('') + '</tbody>';
  }

  function renderExperience() {
    document.getElementById('experience').innerHTML = EXPERIENCE.map(function (e) {
      return '<article class="exp"><h4>' + esc(e[0]) + '</h4><p>' + esc(e[2]) + '</p><span class="rel">' + icon('link') + 'Relación: ' + esc(e[3]) + '</span><a href="' + esc(e[1]) + '" target="_blank" rel="noopener">' + esc(e[1].replace(/^https?:\/\//, '').replace(/\/$/, '')) + '</a></article>';
    }).join('');
    document.getElementById('teamTable').innerHTML = '<thead><tr><th scope="col">Rol</th><th scope="col">Responsabilidades</th><th scope="col">Nombre</th></tr></thead><tbody>' +
      TEAM.map(function (t) { return '<tr><td><b>' + esc(t[1]) + '</b></td><td class="small">' + esc(t[2]) + '</td><td><span data-f="' + t[0] + '"></span></td></tr>'; }).join('') + '</tbody>';
  }

  function renderRefs() {
    document.getElementById('refs').innerHTML = REFS.map(function (r) {
      const isLocal = !/^(https?:|mailto:)/.test(r[1]);
      let href = r[1];
      if (isLocal && /^https?:/.test(location.protocol)) href = new URL(r[1], location.href).href;
      return '<a class="ref" href="' + esc(href) + '"' + (r[1].indexOf('mailto:') === 0 ? '' : ' target="_blank" rel="noopener"') + '><b>' + esc(r[0]) + '</b><span>' + esc(r[2]) + '</span><small>' + esc(href.replace(/^mailto:/, '')) + '</small></a>';
    }).join('');
  }

  function protoUrlControl() {
    const box = document.querySelector('.proto-cta .row-btns');
    if (!box) return;
    box.insertAdjacentHTML('beforebegin', '<label class="url-ctl no-pdf">URL pública del prototipo (aparece en el PDF)<input class="input" id="protoUrlInput" type="url" placeholder="https://…/prototipo/index.html"></label>');
    const inp = document.getElementById('protoUrlInput');
    inp.value = state.fields.prototypeUrl || '';
    inp.addEventListener('input', function () { state.fields.prototypeUrl = inp.value.trim(); save(); paintFields(); });
  }

  /* ================= eventos ================= */
  document.addEventListener('input', function (e) {
    const id = e.target.dataset && e.target.dataset.budget;
    if (!id) return;
    let v = parseFloat(e.target.value);
    if (!isFinite(v) || v < 0) v = 0;
    state.budget[id] = v;
    e.target.classList.toggle('changed', v !== BUDGET.find(function (b) { return b.id === id; }).amount);
    save();
    updateTotals();
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'startDate') {
      state.startDate = e.target.value;
      save();
      renderSchedule();
      renderDeliverables();
      updateTotals();
    }
  });
  document.addEventListener('click', function (e) {
    const act = e.target.closest('[data-action]');
    if (!act) return;
    const a = act.dataset.action;
    if (a === 'reset-budget') {
      BUDGET.forEach(function (b) { state.budget[b.id] = b.amount; });
      save(); renderBudget(); updateTotals();
      toast('Montos restablecidos (total Bs 32.000,00).');
    } else if (a === 'reset-all') {
      if (!confirm('¿Restablecer todos los campos editados y montos a sus valores originales?')) return;
      try { localStorage.removeItem(KEY); } catch (err) { /* nada */ }
      location.reload();
    } else if (a === 'toc') {
      const p = document.getElementById('tocPanel');
      p.hidden = !p.hidden;
      act.setAttribute('aria-expanded', String(!p.hidden));
    }
  });
  document.getElementById('tocPanel').addEventListener('click', function (e) {
    if (e.target.closest('a')) { this.hidden = true; document.querySelector('[data-action="toc"]').setAttribute('aria-expanded', 'false'); }
  });

  // Progreso de lectura y sección activa
  const bar = document.getElementById('progressBar');
  window.addEventListener('scroll', function () {
    const h = document.documentElement;
    bar.style.width = Math.min(100, h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight) * 100) + '%';
  }, { passive: true });
  if ('IntersectionObserver' in window) {
    const links = Array.from(document.querySelectorAll('#abNav a'));
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (l) { l.classList.toggle('active', l.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('.sec[id]').forEach(function (s) { io.observe(s); });
  }

  /* ================= inicio ================= */
  renderModules();
  renderTdr();
  renderMethod();
  renderSchedule();
  renderBudget();
  renderDeliverables();
  renderExperience();
  renderRefs();
  protoUrlControl();
  document.getElementById('startDate').value = state.startDate;
  hydrateIcons(document);
  initFields();
  paintFields();
  updateTotals();

  global.Quote = { state: state, protoUrl: protoUrl, total: total, money: money, totalWords: totalWords, placeholder: placeholder, toast: toast, esc: esc };
})(window);
