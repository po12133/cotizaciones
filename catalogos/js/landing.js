/*
 * Landing comercial: marca configurable, mockups, plantillas, precios mensual/anual y FAQ.
 */
(function () {
  'use strict';
  const CA = window.CA;
  const u = CA.util, ui = CA.ui, esc = u.esc, I = ui.icon, B = CA.CONFIG.brand;
  const $ = ui.$, $$ = ui.$$;

  CA.boot(); // garantiza que existan los catálogos de demostración

  // Marca central
  $$('[data-brand]').forEach((el) => (el.textContent = B.name));
  $$('[data-brand-short]').forEach((el) => (el.textContent = B.short));
  document.title = B.name + ' · Convierte tu Google Sheets en un catálogo online';
  $('#year').textContent = new Date().getFullYear();
  if (CA.session.user()) $('#lpCta').innerHTML = '<a class="btn btn-primary btn-sm" href="dashboard.html">Ir a mi panel ' + I('arrow') + '</a>';

  // Encabezado y menú móvil
  const head = $('.lp-head');
  window.addEventListener('scroll', () => head.classList.toggle('scrolled', window.scrollY > 8), { passive: true });
  $('#lpMenu').onclick = () => { const n = $('#lpNav'); n.classList.toggle('open'); $('#lpMenu').setAttribute('aria-expanded', n.classList.contains('open')); };
  $$('#lpNav a').forEach((a) => a.addEventListener('click', () => $('#lpNav').classList.remove('open')));

  // Animación de aparición
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 }) : null;
  $$('.reveal').forEach((el) => (io ? io.observe(el) : el.classList.add('in')));

  // Datos de muestra para los mockups (de la hoja simulada de TecnoStore)
  const tech = CA.DEMO_SOURCES.sheets[0].tabs[0].rows.slice(0, 36);
  const files = {};
  CA.DEMO_SOURCES.drive.find((f) => f.id === 'fd-tecno-fotos').files.forEach((f) => (files[f.name] = f.art));
  const pick = (sku) => { const r = tech.find((x) => x[0] === sku); return { name: r[1], price: Number(r[4] || r[3]), img: CA.art(files[sku + '.jpg']) }; };

  // Hero: navegador + teléfono con un catálogo
  const cards = ['LAP-001', 'MON-002', 'TEC-001', 'MOU-001', 'COM-001', 'ACC-001', 'PC-001', 'ACC-002'].map(pick);
  $('#heroMock').innerHTML =
    '<div class="mock-browser"><div class="mock-bar"><i></i><i></i><i></i><div class="mock-url">tecnostore.' + esc(B.domain) + '</div></div>' +
    '<div class="mock-site-head"><span class="ms-logo"></span>TecnoStore<span class="ms-search"></span></div>' +
    '<div class="mock-hero"><div><b>Tecnología que rinde</b><small>Consulta disponibilidad por WhatsApp</small></div><img src="' + CA.art('art:laptop:#93c5fd:2') + '" alt=""></div>' +
    '<div class="mock-cards">' + cards.map((c) => '<div class="mock-card"><img src="' + c.img + '" alt=""><div>' + esc(c.name.slice(0, 34)) + '<b>' + u.money(c.price) + '</b></div></div>').join('') + '</div></div>' +
    '<div class="mock-phone"><div class="mock-phone-in"><div class="mp-head"><span>TecnoStore</span><span>☰</span></div>' +
    '<div class="mp-img"><img src="' + CA.art('art:laptop:#2563eb:3') + '" alt=""></div><div class="mp-body"><b>' + esc(cards[0].name) + '</b><div class="price">' + u.money(cards[0].price) + '</div></div>' +
    '<div class="mp-wa">Consultar por WhatsApp</div></div></div>' +
    '<div class="mock-badge"><span class="mb-ic"><svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4"/></svg></span><div><b>36 productos sincronizados</b><small>desde Google Sheets · hace 2 min</small></div></div>';

  // Beneficios
  const FEATS = [
    ['sparkles', 'Sin programación', 'Todo se configura con clics. Si sabes usar una hoja de cálculo, sabes usar ' + B.name + '.'],
    ['sheet', 'Productos desde Sheets', 'Actualiza precios y stock en tu hoja y el catálogo se sincroniza solo.'],
    ['drive', 'Imágenes desde Drive', 'Sube tus fotos a una carpeta y las enlazamos por nombre de archivo.'],
    ['phone', 'Pensado para celulares', 'Rápido y cómodo en el móvil, donde están tus clientes.'],
    ['search', 'Buscador, categorías y filtros', 'Tus clientes encuentran lo que buscan por talla, color, marca o precio.'],
    ['palette', 'Diseño a tu medida', 'Logo, colores, tipografías, banner, secciones y tarjetas.'],
    ['whatsapp', 'Pedidos por WhatsApp', 'Cada producto abre WhatsApp con un mensaje listo, o una lista de varios productos.'],
    ['shield', 'Sin tienda ni pasarela', 'Cobra como ya lo haces: QR, transferencia o efectivo. Sin comisiones por venta.'],
    ['users', 'Sin cuentas para visitantes', 'Tus clientes no se registran: abren el enlace, eligen y te escriben.']
  ];
  $('#features').innerHTML = FEATS.map((f) => '<div class="feature"><span class="f-ic">' + I(f[0]) + '</span><div><h4>' + f[1] + '</h4><p>' + esc(f[2]) + '</p></div></div>').join('');

  // Visual de sincronización: el precio cambia en la hoja y luego en el catálogo
  const sv = $('#syncVisual');
  const rows = ['LAP-001', 'MON-002', 'MOU-001'].map((s) => tech.find((x) => x[0] === s));
  sv.innerHTML = '<div class="sheet-mini"><div class="sm-top">' + I('sheet') + ' Inventario 2026</div><table><tr><th>Código</th><th>Producto</th><th>Precio Bs</th></tr>' +
    rows.map((r, i) => '<tr data-r="' + i + '"><td>' + r[0] + '</td><td>' + esc(r[1].slice(0, 20)) + '…</td><td class="pc">' + r[3] + '</td></tr>').join('') + '</table></div>' +
    '<div class="sync-arrow"><svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4"/></svg></div>' +
    '<div class="cat-mini">' + rows.slice(0, 2).map((r, i) => '<div><img src="' + CA.art(files[r[0] + '.jpg']) + '" alt=""><span>' + esc(r[1].slice(0, 18)) + '…<br><b data-c="' + i + '">' + u.money(r[3]) + '</b></span></div>').join('') + '</div>';
  let flip = false;
  setInterval(() => {
    flip = !flip;
    const r = rows[0];
    const price = flip ? Number(r[3]) - 500 : Number(r[3]);
    const tr = sv.querySelector('tr[data-r="0"]');
    tr.querySelector('.pc').textContent = price;
    tr.classList.add('changed');
    setTimeout(() => {
      tr.classList.remove('changed');
      const b = sv.querySelector('b[data-c="0"]');
      b.textContent = u.money(price); b.classList.add('flash');
      setTimeout(() => b.classList.remove('flash'), 700);
    }, 1100);
  }, 3600);

  // Plantillas con vista previa propia
  const tplImgs = { nova: ['laptop:#2563eb', 'monitor:#ef4444', 'mouse:#6366f1'], atelier: ['jacket:#c8a27a', 'dress:#111827', 'hoodie:#6b7280'], glow: ['serum:#f59e0b', 'lipstick:#be185d', 'perfume:#f9a8d4', 'cream:#f472b6'], mayorista: ['sack:#0f766e', 'bottle:#eab308', 'can:#2563eb', 'box:#16a34a'] };
  const im = (k) => '<img src="' + CA.art('art:' + k) + '" alt="">';
  const PREV = {
    nova: () => '<div class="tp tp-nova"><div class="h"></div><div class="b"></div><div class="g"><div class="side"></div>' + tplImgs.nova.map((k) => '<div class="c">' + im(k) + '</div>').join('') + '</div></div>',
    atelier: () => '<div class="tp tp-atelier"><div class="h">MODA URBANA</div><div class="b"></div><div class="pills"><i></i><i></i><i></i><i></i></div><div class="g">' + tplImgs.atelier.map((k) => '<div class="c">' + im(k) + '</div>').join('') + '</div></div>',
    glow: () => '<div class="tp tp-glow"><div class="h"></div><div class="b"></div><div class="circles"><i></i><i></i><i></i><i></i></div><div class="g">' + tplImgs.glow.map((k) => '<div class="c">' + im(k) + '</div>').join('') + '</div></div>',
    mayorista: () => '<div class="tp tp-mayorista"><div class="h"></div><div class="b"></div><div class="rows">' + tplImgs.mayorista.map((k) => '<div class="r">' + im(k) + '<i></i><em></em><u></u></div>').join('') + '</div></div>'
  };
  const SLUGS = { nova: 'tecnostore', atelier: 'moda-urbana', glow: 'glow-belleza', mayorista: 'distribuidora-andina' };
  $('#tplGrid').innerHTML = CA.TEMPLATE_ORDER.map((id) => {
    const t = CA.TEMPLATES[id];
    return '<article class="tpl-card"><div class="tpl-prev">' + PREV[id]() + '</div><div class="tpl-info"><span class="badge badge-brand">' + esc(t.industry) + '</span><h4>' + t.name + '</h4><p>' + esc(t.description) + '</p>' +
      '<a class="btn btn-ghost btn-sm" href="catalogo.html?c=' + SLUGS[id] + '" target="_blank" rel="noopener">' + I('eye') + 'Abrir demostración</a></div></article>';
  }).join('');

  // Planes
  let billing = 'monthly';
  const HIGHLIGHTS = {
    free: ['30 productos', '1 catálogo', '1 plantilla básica', '3 categorías', 'Botón de WhatsApp', 'Sincronización cada 24 h', ['Personalización'], ['Dominio propio']],
    starter: ['100 productos', '1 catálogo', '2 plantillas', 'Categorías ilimitadas', 'Personalización básica', 'Sincronización cada 60 min', ['Página individual'], ['Estadísticas']],
    pro: ['1.000 productos', '3 catálogos', 'Todas las plantillas', 'Personalización completa', 'Página individual de producto', 'Dominio propio', 'Estadísticas básicas', 'Sincronización cada 15 min'],
    business: ['10.000 productos', '10 catálogos', 'Varios números de WhatsApp', 'Estadísticas avanzadas', 'Dominio propio', 'Sincronización cada 5 min', 'Sin marca de ' + B.name, 'Soporte prioritario']
  };
  function renderPlans() {
    $('#plans').innerHTML = CA.PLAN_ORDER.map((id) => {
      const p = CA.PLANS[id];
      const price = billing === 'yearly' ? p.yearly : p.monthly;
      const note = id === 'free' ? 'Gratis para siempre' : billing === 'yearly' ? 'Equivale a ' + u.money(Math.round((p.yearly / 12) * 10) / 10) + '/mes · ahorras ' + u.money(p.monthly * 12 - p.yearly) : 'o ' + u.money(p.yearly) + ' al año';
      return '<div class="plan' + (p.recommended ? ' rec' : '') + '">' + (p.recommended ? '<span class="rec-tag">Recomendado</span>' : '') +
        '<h3>' + p.name + '</h3><div class="tag">' + esc(p.tagline) + '</div>' +
        '<div class="price price-anim"><b>' + u.money(price) + '</b><span>' + (id === 'free' ? '' : billing === 'yearly' ? '/año' : '/mes') + '</span></div><div class="price-note">' + note + '</div>' +
        '<ul>' + HIGHLIGHTS[id].map((h) => (Array.isArray(h) ? '<li class="no">' + h[0] + '</li>' : '<li>' + esc(h) + '</li>')).join('') + '</ul>' +
        '<a class="btn ' + (p.recommended ? 'btn-primary' : 'btn-ghost') + ' btn-block" href="registro.html?plan=' + id + '&billing=' + billing + '">' + (id === 'free' ? 'Comenzar gratis' : id === 'pro' ? 'Probar 14 días gratis' : 'Elegir ' + p.name) + '</a></div>';
    }).join('');
  }
  $$('[data-billing]').forEach((b) => (b.onclick = () => {
    billing = b.dataset.billing;
    $$('[data-billing]').forEach((x) => x.classList.toggle('on', x === b));
    renderPlans(); renderCompare();
  }));
  function renderCompare() {
    const cell = (v) => (v === true ? '<span class="yes">✓</span>' : v === false ? '<span class="no">—</span>' : esc(v));
    $('#compareTable').innerHTML = '<thead><tr><th>Característica</th>' + CA.PLAN_ORDER.map((id) => '<th class="' + (CA.PLANS[id].recommended ? 'rec' : '') + '">' + CA.PLANS[id].name + '</th>').join('') + '</tr></thead><tbody>' +
      '<tr><td>Precio ' + (billing === 'yearly' ? 'anual' : 'mensual') + '</td>' + CA.PLAN_ORDER.map((id) => '<td><b>' + u.money(billing === 'yearly' ? CA.PLANS[id].yearly : CA.PLANS[id].monthly) + '</b></td>').join('') + '</tr>' +
      CA.PLAN_FEATURES.map((f) => '<tr><td>' + f[0] + '</td>' + CA.PLAN_ORDER.map((id) => '<td>' + cell(f[1](CA.PLANS[id].limits)) + '</td>').join('') + '</tr>').join('') + '</tbody>';
  }
  renderPlans(); renderCompare();

  // Preguntas frecuentes
  const FAQ = [
    ['¿Necesito saber programar?', 'No. Conectas tu cuenta de Google, eliges la hoja y la carpeta de imágenes, indicas qué columna es el precio, el nombre, etc., y eliges una plantilla. Todo con clics.'],
    ['¿Cómo se conecta con Google Sheets?', 'Autorizas el acceso de solo lectura a tu Google Sheets, eliges el archivo y la pestaña. Cada fila es un producto. En este prototipo la conexión es simulada.'],
    ['¿Cómo funcionan las imágenes de Google Drive?', 'Subes las fotos a una carpeta de Drive y en tu hoja escribes el nombre del archivo (por ejemplo LAP-001.jpg). Las enlazamos automáticamente; si falta alguna, te avisamos.'],
    ['¿Cada cuánto se sincroniza el catálogo?', 'Depende del plan: cada 24 horas en Gratis, cada 60 minutos en Inicial, cada 15 en Profesional y cada 5 en Empresa. También puedes sincronizar manualmente cuando quieras.'],
    ['¿Cómo recibo los pedidos por WhatsApp?', 'Cada producto tiene un botón que abre WhatsApp con un mensaje listo (producto, código y precio). Tus clientes también pueden armar una lista de varios productos y enviarla en un solo mensaje.'],
    ['¿Mis clientes necesitan crear una cuenta?', 'No. Solo abren el enlace de tu catálogo, buscan, filtran y te escriben por WhatsApp.'],
    ['¿Cómo funciona la prueba gratuita?', 'Te registras en el plan Gratis y, al publicar tu primer catálogo, se activa el plan Profesional por 14 días sin pedirte tarjeta. Al terminar vuelves a Gratis si no eliges un plan, y conservas todos tus datos.'],
    ['¿Puedo cambiar de plan o cancelar cuando quiera?', 'Sí. Cambias de plan desde "Mi suscripción" y los límites se actualizan de inmediato. Si cancelas, mantienes tu plan hasta la fecha de renovación y luego pasas a Gratis sin perder información.'],
    ['¿Puedo usar mi propio dominio?', 'Sí, desde el plan Profesional puedes usar un dominio como catalogo.tunegocio.com. En los demás planes tu catálogo usa una dirección de ' + B.domain + '.'],
    ['¿Se cobran comisiones por venta?', 'No. ' + B.name + ' no procesa pagos: coordinas el cobro directamente con tu cliente por WhatsApp.']
  ];
  $('#faqList').innerHTML = FAQ.map((f, i) => '<details' + (i === 0 ? ' open' : '') + '><summary>' + esc(f[0]) + '</summary><p>' + esc(f[1]) + '</p></details>').join('');

  // Contacto y políticas (modales informativos)
  $('#contactLink').onclick = (e) => {
    e.preventDefault();
    ui.modal({ title: 'Hablemos', icon: 'mail', size: 'sm', body: '<p class="confirm-text">Escríbenos y te ayudamos a armar tu primer catálogo.</p><dl class="kv" style="margin-top:14px"><dt>Correo</dt><dd>' + esc(B.supportEmail) + '</dd><dt>WhatsApp</dt><dd>' + CA.wa_format(B.supportWhatsApp) + '</dd></dl><p class="muted" style="font-size:.82rem;margin:12px 0 0">Datos de contacto de demostración.</p>', actions: [{ label: 'Cerrar', cls: 'btn-primary' }] });
  };
  const POL = {
    terms: ['Términos de uso', 'Este es un prototipo de demostración. En la versión comercial, los términos regularán el uso del servicio, los límites de cada plan, la responsabilidad sobre el contenido publicado y las condiciones de suscripción.'],
    privacy: ['Política de privacidad', 'El acceso a Google Sheets y Drive será de solo lectura y limitado a los archivos que elijas. No vendemos datos. En este prototipo todo se guarda únicamente en tu navegador.'],
    refunds: ['Cancelaciones', 'Puedes cancelar cuando quieras desde "Mi suscripción". Mantienes tu plan hasta el fin del periodo pagado y luego pasas al plan Gratis sin perder datos.']
  };
  $$('[data-policy]').forEach((a) => (a.onclick = (e) => { e.preventDefault(); const p = POL[a.dataset.policy]; ui.modal({ title: p[0], icon: 'shield', size: 'sm', body: '<p class="confirm-text">' + esc(p[1]) + '</p>', actions: [{ label: 'Entendido', cls: 'btn-primary' }] }); }));
  CA.wa_format = CA.wa_format || ((d) => '+' + String(d).slice(0, 3) + ' ' + String(d).slice(3));
})();
