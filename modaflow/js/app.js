/*
 * Páginas públicas (index.html y planes.html): contenido comercial e interacciones.
 */
(function () {
  const MF = window.MF;
  const CFG = window.MF_CONFIG;
  const { $, esc } = MF;
  const brand = CFG.brand.name;
  MF.load();

  const PROBLEMS = [
    ['Las ventas se anotan en cuadernos', 'Cada venta queda registrada con fecha, vendedora, método de pago y total.'],
    ['No sabe qué prendas le quedan', 'Inventario actualizado al instante, por talla y color, con alertas de stock bajo.'],
    ['Pierde tiempo buscando una prenda', 'Buscador por nombre, categoría o color desde el celular, con foto.'],
    ['No sabe cuánto gana', 'Costos, ganancias y reportes diarios, semanales y mensuales.'],
    ['Envía fotos una por una por WhatsApp', 'Un catálogo con todas sus prendas que se comparte con un solo enlace.'],
    ['No tiene tienda online', 'Catálogo público con carrito, pedido por WhatsApp y pago por QR.'],
    ['No controla las ventas de sus empleados', 'Usuarios, roles y auditoría: sabe quién vendió qué y cuándo.']
  ];
  const WHY = [
    ['smile', 'Fácil de utilizar', 'Pantallas simples pensadas para vender, no para contadores.'],
    ['hand', 'Sin conocimientos técnicos', 'Si usa WhatsApp, puede usar ' + brand + '.'],
    ['notebook', 'Adiós a los cuadernos', 'Ventas, stock y caja en un solo lugar.'],
    ['sparkles', 'Registro asistido por IA', 'Una foto y la ficha del producto se completa sola.'],
    ['receipt', 'Control de ventas', 'Historial, descuentos, métodos de pago y comprobantes.'],
    ['package', 'Inventario al día', 'Cada venta descuenta stock automáticamente.'],
    ['store', 'Catálogo público', 'Su tienda online lista para compartir en redes.'],
    ['whatsapp', 'Pedidos por WhatsApp', 'El pedido llega armado, con productos, tallas y total.'],
    ['qr', 'Pagos por QR', 'Muestre el QR de su banco y registre el comprobante.'],
    ['phone', 'Celular y computadora', 'Funciona en el navegador, sin instalar nada.'],
    ['wallet', 'Planes económicos', 'Desde Bs 30 al mes, sin comisión por venta.'],
    ['trendUp', 'Crece sin cambiar de sistema', 'Suba de plan cuando sume productos, equipo o sucursales.']
  ];
  const FAQ = [
    ['¿Necesito instalar algo?', `No. ${brand} funciona desde el navegador del celular o la computadora. Solo necesita conexión a internet.`],
    ['¿Puedo utilizarlo desde mi celular?', 'Sí. El panel, el punto de venta y el catálogo están diseñados para pantallas pequeñas. Puede vender y registrar productos desde el mostrador.'],
    ['¿Puedo registrar mis productos con fotografías?', 'Sí. Puede subir fotos de cada prenda y, con el registro asistido por IA, la foto sirve además para sugerir nombre, categoría, color y descripción. Usted siempre revisa antes de guardar. Cada plan incluye una cantidad de registros con IA al mes; el registro manual no tiene límite mensual.'],
    ['¿Qué pasa si supero el límite de productos?', 'El sistema le avisa antes de llegar al límite. Sus datos no se pierden: puede archivar productos que ya no vende o pasar al plan siguiente para seguir registrando.'],
    ['¿Puedo cambiar de plan?', 'Sí. Puede subir de plan cuando lo necesite y conservar toda su información. Las condiciones para bajar de plan se definirán en los términos del servicio.'],
    ['¿El sistema cobra comisión por venta?', 'No. La propuesta es un precio fijo por plan; no se cobra un porcentaje de sus ventas.'],
    ['¿Puedo recibir pagos por QR?', 'Sí. Usted carga el QR estático de su cuenta bancaria y el catálogo lo muestra al cliente junto con el total del pedido. El cliente ingresa el monto en su app bancaria y adjunta el comprobante; usted confirma el pago manualmente desde el panel. El sistema no verifica pagos con el banco de forma automática.'],
    ['¿Puedo compartir mi catálogo?', 'Sí. Su catálogo tiene un enlace propio para compartir por WhatsApp, Facebook, Instagram o TikTok. Desde el plan Premium puede usar un dominio propio, sujeto a configuración.'],
    ['¿Qué incluye el plan empresarial?', 'Todo lo del plan Premium con límites mayores (10.000 productos, 20 usuarios, 5 sucursales, 500 registros con IA al mes), más configuración inicial personalizada, importación asistida del inventario, capacitación, configuración de reportes y acompañamiento de implementación. La activación de Bs 4.500 incluye el primer año; la renovación referencial es de Bs 900 anuales.'],
    ['¿El plan empresarial incluye el código fuente?', `No. Es una licencia de uso: el software, el código fuente, la infraestructura y la propiedad intelectual siguen siendo de ${brand}. El cliente paga por activación, configuración, capacitación y servicio. Los desarrollos personalizados se cotizan por separado.`],
    ['¿Qué ocurre si dejo de pagar?', 'La propuesta es que la cuenta quede suspendida, sin borrar la información durante un período de gracia, para que pueda reactivarla o solicitar una exportación de sus datos. El plazo exacto se definirá en las condiciones del servicio.']
  ];

  // ---------- Marca ----------
  document.querySelectorAll('.brand').forEach((a) => a.insertAdjacentHTML('afterbegin', MF.brandLogo()));
  MF.applyBrand();

  // ---------- Hero ----------
  function hero() {
    const k = $('#mockKpis');
    if (!k) return;
    const db = MF.get();
    const today = db.sales.filter((s) => s.status === 'completada' && MF.sameDay(s.date, Date.now()) && s.branchId === 'b1');
    const month = db.sales.filter((s) => s.status === 'completada' && new Date(s.date).getMonth() === new Date().getMonth() && s.branchId === 'b1');
    k.innerHTML = `<div class="mock-kpi"><small>Ventas hoy</small><b>${MF.money(today.reduce((a, s) => a + s.total, 0))}</b> <em>▲ ${today.length} ventas</em></div>
      <div class="mock-kpi"><small>Este mes</small><b>${MF.money(month.reduce((a, s) => a + s.total, 0))}</b></div>
      <div class="mock-kpi"><small>Productos</small><b>${db.products.length}</b></div>`;
    $('#mockChart').innerHTML = [38, 52, 44, 70, 58, 82, 64, 90, 76, 98].map((h, i) => `<span style="height:${h}%;animation-delay:${i * 60}ms"></span>`).join('');
    $('#mockRows').innerHTML = db.products.filter((p) => p.photo).slice(0, 3).map((p) => `<div class="mock-row"><img src="${p.photo}" alt=""><span>${esc(p.name)}</span><b>${MF.money(p.price)}</b></div>`).join('');
  }

  function lists() {
    const pg = $('#problemGrid');
    if (pg) pg.innerHTML = PROBLEMS.map(([a, b]) => `<div class="problem reveal"><div class="before"><small>Antes</small><p>${a}</p></div><span class="arrow">${MF.icon('arrowRight', 'sm')}</span><div class="after"><small>Con ${esc(brand)}</small><p>${b}</p></div></div>`).join('');
    const wg = $('#whyGrid');
    if (wg) wg.innerHTML = WHY.map(([ic, t, d]) => `<div class="why reveal"><div class="ic">${MF.icon(ic)}</div><b>${t}</b><p>${esc(d)}</p></div>`).join('');
    const fq = $('#faqList');
    if (fq) fq.innerHTML = FAQ.map(([q, a], i) => `<details class="reveal" ${i === 0 ? 'open' : ''}><summary>${q}</summary><p>${esc(a)}</p></details>`).join('');
  }

  function aiBox() {
    const box = $('#aiBox');
    if (!box) return;
    MF.AI.wizard(box, {
      showCost: false,
      doneActions: (p) => `<a class="btn primary" href="demo.html#/productos">${MF.icon('package', 'sm')} Ver en inventario</a>${p.published ? `<a class="btn ghost" href="catalogo.html#p=${p.id}">${MF.icon('store', 'sm')} Ver en catálogo</a>` : ''}`
    });
  }

  function plans() {
    const pc = $('#planCards');
    if (pc) MF.renderPlanCards(pc, { full: document.body.dataset.page === 'planes' });
    const cmp = $('#compare');
    if (cmp) MF.renderCompare(cmp, { highlight: (location.hash.match(/plan-(\w+)/) || [])[1] || 'pro' });
    const calc = $('#calc');
    if (calc) MF.renderCalculator(calc);
  }

  const wa = $('#ctaWa');
  if (wa) wa.href = MF.waLink(CFG.brand.salesWhatsapp, `Hola, vi la presentación de ${brand} y quiero más información sobre los planes para mi tienda de ropa.`);

  hero(); lists(); aiBox(); plans();
  MF.initNav(); // después de renderizar, para observar también los .reveal dinámicos
  if (location.hash) { const t = document.querySelector(location.hash.split('&')[0]); if (t) setTimeout(() => t.scrollIntoView(), 80); }
})();
