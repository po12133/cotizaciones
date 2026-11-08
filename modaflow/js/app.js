/*
 * Páginas públicas (index.html y planes.html): contenido comercial e interacciones.
 * Las cifras del celular de ejemplo salen de los datos de la demo (no son estáticas).
 */
(function () {
  const MF = window.MF;
  const CFG = window.MF_CONFIG;
  const { $, esc } = MF;
  const brand = CFG.brand.name;
  MF.load();

  const FLOW = [
    ['camera', 'Fotografía', 'Frente, espalda y etiqueta de la prenda'],
    ['sparkles', 'IA', 'Sugiere nombre, tipo, color y etiquetas'],
    ['package', 'Inventario', 'Tallas, colores y cantidades al día'],
    ['cart', 'Venta', 'Busca, agrega al carrito y cobra'],
    ['receipt', 'Boleta', 'PDF, WhatsApp o impresa'],
    ['chart', 'Reportes', 'Cuánto vendió y qué se vende más']
  ];
  const PROBLEMS = [
    ['Las ventas se anotan en un cuaderno', 'Cada venta queda registrada con fecha, hora, prendas, descuentos y método de pago.'],
    ['No sabe cuántas prendas le quedan', 'El inventario baja solo con cada venta, por talla y color, y avisa cuando algo se agota.'],
    ['Registrar mercadería nueva lleva horas', 'Una foto y la IA completa la ficha. Ideal para fardos y prendas únicas.'],
    ['Pierde tiempo buscando una prenda', 'Búsqueda por nombre o etiqueta, con foto, desde el celular.'],
    ['No sabe cuánto vendió en la semana', 'Reportes por día, semana, quincena o mes, listos para descargar.'],
    ['Envía fotos una por una por WhatsApp', 'Con el plan Pro, un catálogo online con carrito que se comparte con un enlace.']
  ];
  const FEATS = [
    { id: 'inventario', icon: 'package', title: 'Inventario inteligente', text: 'Una ficha por prenda con sus tallas, colores y unidades. Producto no es stock: una blusa con 20 unidades cuenta como 1 producto en su plan.',
      bullets: ['Búsqueda por nombre y etiquetas', 'Filtros por categoría y disponibilidad', 'Ingresos de mercadería y ajustes', 'Prendas únicas para ropa de fardos', 'Historial de movimientos (Pro)'], href: 'demo.html?plan=pro#/inventario', cta: 'Ver inventario' },
    { id: 'pos', icon: 'cart', title: 'Punto de venta en el celular', text: 'Busque la prenda, elija talla y color, aplique descuentos y cobre. No pide datos del cliente: vender toma segundos.',
      bullets: ['Carrito con varias prendas', 'Descuento por prenda y descuento general', 'Efectivo, QR u otro', 'Nunca vende más unidades de las que hay', 'Anulación con reposición de stock'], href: 'demo.html?plan=pro#/vender', cta: 'Hacer una venta' },
    { id: 'boletas', icon: 'receipt', title: 'Boletas digitales', text: 'Cada venta genera su boleta con número, fecha, prendas, descuentos, total y método de pago. Es un comprobante comercial, no una factura fiscal.',
      bullets: ['Descarga en PDF', 'Enviar por WhatsApp', 'Mostrar en pantalla', 'Imprimir en ticket', 'Volver a descargarla desde el historial'], href: 'demo.html?plan=pro#/ventas', cta: 'Ver boletas' },
    { id: 'reportes', icon: 'chart', title: 'Reportes y estadísticas', text: 'Calculados con sus ventas reales: total vendido, unidades, descuentos y ganancia estimada cuando registra el precio de compra.',
      bullets: ['Hoy, semana, quincena, mes, año o rango', 'Productos más vendidos', 'Ventas por categoría y método de pago', 'Comparación con el periodo anterior', 'Excel y PDF'], href: 'demo.html?plan=pro#/reportes', cta: 'Ver reportes' },
    { id: 'catalogo', icon: 'store', title: 'Catálogo online', badge: 'Desde el plan Pro', text: 'Una ventaja extra: su tienda en internet con logo, banner, buscador y carrito. Sus clientas piden por WhatsApp o pagan con su QR, y la disponibilidad sale del mismo inventario.',
      bullets: ['Enlace propio para compartir', 'Pedidos por WhatsApp con el resumen armado', 'QR estático con el total a pagar', 'Confirmación manual del pago', 'Si vende en tienda, el catálogo se actualiza'], href: 'catalogo.html', cta: 'Visitar MioShop' }
  ];
  const DEMOS = [
    ['home', 'Inicio', 'Registrar prenda y Nueva venta a un toque.', 'demo.html?plan=pro#/inicio'],
    ['camera', 'Registrar prenda', 'Con fotos y la IA, o a mano sin créditos.', 'demo.html?plan=pro#/registrar'],
    ['cart', 'Vender', 'Carrito, descuentos, pago y boleta PDF.', 'demo.html?plan=pro#/vender'],
    ['chart', 'Reportes', 'Periodos, gráficos y exportación.', 'demo.html?plan=pro#/reportes'],
    ['store', 'Catálogo MioShop', 'Carrito, WhatsApp y QR (plan Pro).', 'catalogo.html']
  ];
  const FAQ = [
    ['¿Necesito instalar algo?', `No. ${brand} funciona en el navegador del celular o la computadora. Está diseñado primero para el celular.`],
    ['¿La IA es obligatoria?', 'No. Puede registrar cualquier prenda a mano y eso no consume créditos de IA. La IA solo ayuda a completar la ficha a partir de las fotos.'],
    ['¿La IA pone el precio o la talla?', 'No. La IA sugiere nombre, tipo, categoría, color, etiquetas y características visibles. El precio de venta, el precio de compra, la talla y la cantidad los confirma usted. Si fotografía la etiqueta, puede leer la talla y la composición, pero igual debe confirmarlas.'],
    ['¿Qué cuenta como producto en mi plan?', 'Cada ficha de prenda. Una blusa con 20 unidades en tres tallas es 1 producto: las unidades son stock y no tienen límite.'],
    ['¿Sirve para ropa de fardos o prendas únicas?', 'Sí. Puede registrar una prenda de 1 sola unidad con "Prenda única", o tallas y colores con su propia cantidad.'],
    ['¿La boleta es una factura?', 'No. La boleta es un comprobante comercial de la venta (PDF, WhatsApp o impresa). No reemplaza la facturación fiscal.'],
    ['¿Qué pasa al terminar la prueba gratuita?', 'Después de 14 días la cuenta queda en solo lectura (puede consultar, pero no registrar) y el catálogo se desactiva. Proponemos conservar sus datos 30 días más para que elija un plan sin perder nada.'],
    ['¿El plan Básico tiene catálogo online?', 'No. El catálogo público con carrito y pedidos por WhatsApp y QR está en los planes Pro y Premium (y durante la prueba gratuita).'],
    ['¿Puedo recibir pagos por QR?', 'Sí. En el punto de venta marca el pago QR, y en el catálogo (Pro) se muestra su QR estático con el total del pedido. La confirmación del pago es manual: el sistema no consulta al banco.'],
    ['¿Cobran comisión por venta?', 'No. Es un precio fijo por plan y las ventas son ilimitadas en todos los planes.']
  ];

  // ---------- Marca ----------
  document.querySelectorAll('.brand').forEach((a) => a.insertAdjacentHTML('afterbegin', MF.brandLogo()));
  MF.applyBrand();

  // ---------- Celular de ejemplo (datos de la demo) ----------
  function phone() {
    const k = $('#pmKpis');
    if (!k) return;
    const db = MF.get();
    const ok = db.sales.filter((s) => s.status === 'completada' && s.branchId === 'b1');
    const today = ok.filter((s) => MF.sameDay(s.date, Date.now()));
    const units = db.products.filter(MF.isActive).reduce((a, p) => a + MF.stock(p, 'b1'), 0);
    $('#pmDate').textContent = MF.fdate(new Date());
    k.innerHTML = `<div><small>Vendido hoy</small><b>${MF.money(today.reduce((a, s) => a + s.total, 0))}</b></div><div><small>Unidades</small><b>${units}</b></div>`;
    $('#pmList').innerHTML = db.products.filter((p) => p.photo).slice(0, 3).map((p) => `<div class="pm-row"><img src="${p.photo}" alt=""><span>${esc(p.name)}<small>${p.variants.map((v) => v.size).join(' · ')}</small></span><b>${MF.stock(p, 'b1')} u.</b></div>`).join('');
  }

  function lists() {
    const fs = $('#flowSteps');
    if (fs) fs.innerHTML = FLOW.map(([ic, t, d], i) => `<li><span class="fs-ic">${MF.icon(ic)}</span><b>${t}</b><small>${d}</small>${i < FLOW.length - 1 ? `<i class="fs-arrow">${MF.icon('arrowRight', 'sm')}</i>` : ''}</li>`).join('');
    const pg = $('#problemGrid');
    if (pg) pg.innerHTML = PROBLEMS.map(([a, b]) => `<div class="problem reveal"><div class="before"><small>Antes</small><p>${a}</p></div><span class="arrow">${MF.icon('arrowRight', 'sm')}</span><div class="after"><small>Con ${esc(brand)}</small><p>${b}</p></div></div>`).join('');
    const fr = $('#featRows');
    if (fr) fr.innerHTML = FEATS.map((f, i) => `<article class="feat-row reveal ${i % 2 ? 'rev' : ''}" id="f-${f.id}">
      <div class="fr-text"><span class="fr-ic">${MF.icon(f.icon)}</span>${f.badge ? `<span class="badge violet">${f.badge}</span>` : ''}<h3>${f.title}</h3><p>${esc(f.text)}</p>
        <ul>${f.bullets.map((x) => `<li>${MF.icon('check', 'sm')}<span>${esc(x)}</span></li>`).join('')}</ul>
        <a class="btn ghost" href="${f.href}">${MF.icon('play', 'sm')} ${f.cta}</a></div>
      <div class="fr-visual">${visual(f.id)}</div></article>`).join('');
    const dc = $('#demoCards');
    if (dc) dc.innerHTML = DEMOS.map(([ic, t, d, href]) => `<a class="demo-card reveal" href="${href}"><div class="shot">${MF.icon(ic, 'lg')}</div><div class="body"><b>${t}</b><p>${d}</p><span class="go">Abrir ${MF.icon('arrowRight', 'sm')}</span></div></a>`).join('');
    const fq = $('#faqList');
    if (fq) fq.innerHTML = FAQ.map(([q, a], i) => `<details class="reveal" ${i === 0 ? 'open' : ''}><summary>${q}</summary><p>${esc(a)}</p></details>`).join('');
  }

  /** Pequeñas pantallas de ejemplo construidas con los productos reales de MioShop. */
  function visual(id) {
    const db = MF.get();
    const ps = db.products.filter((p) => p.photo).slice(0, 4);
    if (id === 'inventario') return `<div class="mini-screen">${ps.slice(0, 3).map((p) => { const s = MF.stock(p, 'b1'); return `<div class="ms-row"><img src="${p.photo}" alt=""><div><b>${esc(p.name)}</b><small>${p.variants.map((v) => `${v.size} ${v.stock.b1}`).join(' · ')}</small></div><span class="ms-badge ${s <= 2 ? 'warn' : ''}">${s} u.</span></div>`; }).join('')}</div>`;
    if (id === 'pos') return `<div class="mini-screen"><div class="ms-grid">${ps.slice(0, 4).map((p) => `<div><img src="${p.photo}" alt=""><small>${MF.money(MF.price(p))}</small></div>`).join('')}</div><div class="ms-total"><span>2 prendas · desc. Bs 10</span><b>Cobrar ${MF.money(ps[0].price + ps[1].price - 10)}</b></div></div>`;
    if (id === 'boletas') return `<div class="mini-receipt"><img src="${CFG.store.logo}" alt=""><b>BOLETA DE VENTA N° 1229</b><small>${MF.fdate(new Date(), true)}</small><hr><div><span>${esc(ps[0].name)} (M)</span><span>${MF.money(ps[0].price)}</span></div><div><span>${esc(ps[2].name)} (S)</span><span>${MF.money(ps[2].price)}</span></div><hr><div class="tot"><span>TOTAL</span><span>${MF.money(ps[0].price + ps[2].price)}</span></div><div class="mr-btns"><span>PDF</span><span>WhatsApp</span><span>Imprimir</span></div></div>`;
    if (id === 'reportes') { const h = [42, 58, 35, 70, 64, 88, 76]; return `<div class="mini-screen"><div class="ms-kpis"><div><small>Este mes</small><b>Bs 3.488</b></div><div><small>Unidades</small><b>23</b></div></div><div class="ms-bars">${h.map((x) => `<i style="height:${x}%"></i>`).join('')}</div><small class="muted">Ejemplo con datos de la demo</small></div>`; }
    if (id === 'catalogo') return `<div class="mini-screen shop"><div class="ms-shop-head"><img src="${CFG.store.logo}" alt=""><b>MioShop</b></div><div class="ms-grid">${ps.slice(0, 4).map((p) => `<div><img src="${p.photo}" alt=""><small>${MF.money(MF.price(p))}</small></div>`).join('')}</div><div class="ms-wa">${MF.icon('whatsapp', 'sm')} Pedir por WhatsApp</div></div>`;
    return '';
  }

  function aiBox() {
    const box = $('#aiBox');
    if (!box) return;
    MF.AI.wizard(box, {
      compact: true, catalog: false,
      doneActions: () => `<a class="btn ghost" href="demo.html#/inventario">${MF.icon('package', 'sm')} Ver inventario</a>`
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
  if (wa) wa.href = MF.waLink(CFG.brand.salesWhatsapp, `Hola, vi la presentación de ${brand} y quiero más información para mi tienda de ropa.`);

  phone(); lists(); aiBox(); plans();
  MF.hydrateIcons(document.body);
  MF.initNav(); // después de renderizar, para observar también los .reveal dinámicos
  if (location.hash) { const t = document.querySelector(location.hash.split('&')[0]); if (t) setTimeout(() => t.scrollIntoView(), 80); }
})();
