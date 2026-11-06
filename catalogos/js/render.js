/*
 * Motor de render del catálogo público. Genera el HTML de cada plantilla a partir
 * del diseño efectivo (según el plan) y de los productos sincronizados.
 * Lo usan el catálogo público y la vista previa del editor (iframe).
 */
(function () {
  'use strict';
  const CA = (window.CA = window.CA || {});
  const u = CA.util, esc = u.esc;
  const R = (CA.render = {});

  const ICON = {
    search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4', wa: 'M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z',
    list: 'M8 6h13M8 12h13M8 18h13M3 6h0M3 12h0M3 18h0', x: 'M6 6l12 12M18 6 6 18', plus: 'M12 5v14M5 12h14', minus: 'M5 12h14',
    left: 'M15 5l-7 7 7 7', right: 'M9 5l7 7-7 7', menu: 'M4 6h16M4 12h16M4 18h16', filter: 'M4 5h16l-6 8v6l-4-2v-4z',
    check: 'M4 12.5 9.5 18 20 6', truck: 'M3 6h11v10H3zM14 9h4l3 3v4h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', chat: 'M4 5h16v11H8l-4 4z', star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z',
    pin: 'M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z', clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
    ig: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17.5 6.5h0', fb: 'M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z',
    share: 'M18 8a3 3 0 1 0-3-3M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4', grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'
  };
  const ic = (n, cls) => '<svg class="ci ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + (ICON[n] || '') + '"/></svg>';
  R.ic = ic;
  const img = (ref, alt, cls) => '<img class="' + (cls || '') + '" src="' + CA.imgSrc(ref) + '" alt="' + esc(alt || '') + '" ' + CA.imgFallbackAttr + '>';
  R.img = img;

  R.price = (p) => (p.offer ? '<span class="pr-old">' + u.money(p.price) + '</span><span class="pr-now">' + u.money(p.offer) + '</span>' : '<span class="pr-now">' + u.money(p.price) + '</span>');
  R.avail = (p) => { const a = CA.products.AVAIL[p.availability]; return '<span class="av av-' + a.tone + '">' + a.label + '</span>'; };
  R.discount = (p) => (p.offer ? '<span class="tag-off">-' + Math.round((1 - p.offer / p.price) * 100) + '%</span>' : '');

  /** Variables CSS del diseño. */
  R.styleVars = function (d) {
    const f = CA.FONTS[d.font] || CA.FONTS.modern;
    const radius = { rounded: '12px', pill: '999px', square: '3px' }[d.buttons.shape] || '12px';
    return '--p:' + d.colors.primary + ';--p-d:' + CA.shade(d.colors.primary, -0.12) + ';--p-l:' + CA.shade(d.colors.primary, 0.42) + ';--s:' + d.colors.secondary + ';--bg:' + d.colors.background + ';--tx:' + d.colors.text +
      ';--fh:' + f.heading + ';--fb:' + f.body + ';--br:' + radius + ';--cols:' + d.columns + ';';
  };

  /* ---------------- piezas ---------------- */
  R.header = function (ctx) {
    const d = ctx.eff.design;
    const cats = ctx.eff.categories;
    return '<header class="c-head" data-section="header"><div class="c-wrap c-head-in">' +
      '<a class="c-brand" href="#" data-home>' + (d.logo ? '<img class="c-logo" src="' + d.logo + '" alt="' + esc(d.businessName) + '">' : '<span class="c-logo-txt">' + esc(u.initials(d.businessName)) + '</span>') + '<span class="c-name">' + esc(d.businessName) + '</span></a>' +
      '<nav class="c-nav" id="cNav"><a href="#" data-home>Inicio</a>' +
      (d.menu.categories ? '<div class="c-dd"><button type="button" class="c-dd-btn">Categorías ' + ic('right', 'rot') + '</button><div class="c-dd-menu">' + cats.map((c) => '<a href="#" data-cat="' + esc(c) + '">' + esc(c) + '</a>').join('') + '</div></div>' : '') +
      (d.menu.about ? '<a href="#" data-goto="about">Nosotros</a>' : '') + (d.menu.contact ? '<a href="#" data-goto="contact">Contacto</a>' : '') + '</nav>' +
      (d.menu.search ? '<label class="c-search">' + ic('search') + '<input type="search" id="cSearch" placeholder="Buscar productos…" value="' + esc(ctx.state.q) + '" aria-label="Buscar productos"></label>' : '') +
      '<button type="button" class="c-list-btn" id="cListBtn" aria-label="Lista de consulta">' + ic('list') + '<span class="c-list-l">Mi lista</span><b id="cListCount">' + ctx.listCount + '</b></button>' +
      '<button type="button" class="c-menu-btn" id="cMenuBtn" aria-label="Menú">' + ic('menu') + '</button></div></header>';
  };

  R.hero = function (ctx) {
    const b = ctx.eff.design.banner;
    if (!b.show) return '';
    const t = ctx.eff.design.template;
    return '<section class="c-hero c-hero-' + b.align + '" data-section="hero"><div class="c-wrap c-hero-in"><div class="c-hero-txt">' +
      (t === 'atelier' ? '<span class="c-kicker">' + esc(ctx.eff.design.businessName) + '</span>' : '') +
      '<h1>' + esc(b.title) + '</h1><p>' + esc(b.subtitle) + '</p><a href="#productos" class="c-btn c-btn-p" data-goto="products">' + esc(b.cta || 'Ver productos') + '</a></div>' +
      (b.image ? '<div class="c-hero-img">' + img(b.image, b.title) + '</div>' : '') + '</div></section>';
  };

  R.categories = function (ctx) {
    const d = ctx.eff.design;
    const all = ctx.eff.categories;
    const list = (d.featuredCategories || []).filter((c) => all.includes(c));
    const cats = (list.length ? list : all).slice(0, 8);
    if (!cats.length) return '';
    const first = (c) => ctx.eff.products.find((p) => p.category === c);
    return '<section class="c-sec c-cats" data-section="categories"><div class="c-wrap"><div class="c-sec-h"><h2>Categorías</h2></div><div class="c-cat-grid">' +
      cats.map((c) => { const p = first(c); const n = ctx.eff.products.filter((x) => x.category === c).length; return '<a href="#" class="c-cat" data-cat="' + esc(c) + '"><span class="c-cat-img">' + img(p && p.image, c) + '</span><span class="c-cat-txt"><b>' + esc(c) + '</b><small>' + n + ' producto' + (n === 1 ? '' : 's') + '</small></span></a>'; }).join('') + '</div></div></section>';
  };

  R.card = function (p, ctx) {
    const d = ctx.eff.design;
    const inList = ctx.inList(p.id);
    const out = p.availability === 'out';
    return '<article class="c-card' + (out ? ' is-out' : '') + '" data-pid="' + esc(p.id) + '">' +
      '<a class="c-card-img" href="' + ctx.productHref(p) + '" data-open="' + esc(p.id) + '">' + img(p.image, p.name) + R.discount(p) + (out ? '<span class="tag-out">Agotado</span>' : '') + '</a>' +
      '<div class="c-card-b">' + (d.card.showBrand && p.brand ? '<span class="c-card-brand">' + esc(p.brand) + '</span>' : '') +
      '<a class="c-card-t" href="' + ctx.productHref(p) + '" data-open="' + esc(p.id) + '">' + esc(p.name) + '</a>' +
      (d.card.showSku ? '<span class="c-card-sku">' + esc(p.sku) + '</span>' : '') +
      '<div class="c-card-p">' + R.price(p) + '</div>' + R.avail(p) +
      '<div class="c-card-a"><a class="c-btn c-btn-wa" href="' + ctx.waHref(p) + '" target="_blank" rel="noopener" data-wa="' + esc(p.id) + '">' + ic('wa') + '<span>' + esc(ctx.eff.whatsapp.buttonText || 'Consultar') + '</span></a>' +
      '<button type="button" class="c-btn c-btn-icon' + (inList ? ' on' : '') + '" data-add="' + esc(p.id) + '" title="' + (inList ? 'En tu lista' : 'Agregar a la lista de consulta') + '">' + ic(inList ? 'check' : 'plus') + '</button></div></div></article>';
  };

  /** Fila de la plantilla Mayorista (lista compacta con cantidad). */
  R.row = function (p, ctx) {
    const q = ctx.qtyOf(p.id);
    return '<div class="c-row' + (p.availability === 'out' ? ' is-out' : '') + '" data-pid="' + esc(p.id) + '">' +
      '<a class="c-row-img" href="' + ctx.productHref(p) + '" data-open="' + esc(p.id) + '">' + img(p.image, p.name) + '</a>' +
      '<div class="c-row-info"><span class="c-row-sku">' + esc(p.sku) + '</span><a class="c-row-t" href="' + ctx.productHref(p) + '" data-open="' + esc(p.id) + '">' + esc(p.name) + '</a><small>' + esc([p.brand].concat(Object.keys(p.attributes).map((k) => k + ': ' + p.attributes[k])).filter(Boolean).join(' · ')) + '</small></div>' +
      '<div class="c-row-p">' + R.price(p) + R.avail(p) + '</div>' +
      '<div class="c-qty"><button type="button" data-dec="' + esc(p.id) + '" aria-label="Menos">' + ic('minus') + '</button><input type="number" min="0" value="' + q + '" data-qty="' + esc(p.id) + '" aria-label="Cantidad"><button type="button" data-inc="' + esc(p.id) + '" aria-label="Más">' + ic('plus') + '</button></div>' +
      '<a class="c-btn c-btn-wa c-row-wa" href="' + ctx.waHref(p) + '" target="_blank" rel="noopener" data-wa="' + esc(p.id) + '" title="Consultar por WhatsApp">' + ic('wa') + '</a></div>';
  };

  R.featured = function (ctx) {
    const ids = ctx.eff.design.featuredProducts || [];
    let list = ids.map((id) => ctx.eff.products.find((p) => p.id === id)).filter(Boolean);
    if (!list.length) list = ctx.eff.products.filter((p) => p.offer).slice(0, 4);
    if (!list.length) return '';
    return '<section class="c-sec c-featured" data-section="featured"><div class="c-wrap"><div class="c-sec-h"><h2>Destacados</h2></div><div class="c-grid">' + list.slice(0, 8).map((p) => R.card(p, ctx)).join('') + '</div></div></section>';
  };

  R.benefits = function (ctx) {
    const b = (ctx.eff.design.benefits || []).filter(Boolean);
    if (!b.length) return '';
    const icons = ['shield', 'chat', 'truck', 'star'];
    return '<section class="c-sec c-benefits" data-section="benefits"><div class="c-wrap c-ben-grid">' + b.slice(0, 4).map((t, i) => '<div class="c-ben">' + ic(icons[i % 4]) + '<b>' + esc(t) + '</b></div>').join('') + '</div></section>';
  };

  /** Filtros: categorías, atributos y orden. */
  R.filters = function (ctx, all) {
    const s = ctx.state;
    const cats = ctx.eff.categories;
    const groups = (ctx.eff.filters || []).map((k) => ({ key: k, label: CA.products.filterLabel(k), values: CA.products.filterValues(all, k) })).filter((g) => g.values.length > 1);
    const t = ctx.eff.design.template;
    const catBlock = t === 'nova'
      ? '<div class="f-group"><h4>Categorías</h4><a href="#" class="f-cat' + (!s.cat ? ' on' : '') + '" data-cat="">Todas <small>' + all.length + '</small></a>' + cats.map((c) => '<a href="#" class="f-cat' + (s.cat === c ? ' on' : '') + '" data-cat="' + esc(c) + '">' + esc(c) + ' <small>' + all.filter((p) => p.category === c).length + '</small></a>').join('') + '</div>'
      : '<div class="f-pills"><button type="button" class="f-pill' + (!s.cat ? ' on' : '') + '" data-cat="">Todo</button>' + cats.map((c) => '<button type="button" class="f-pill' + (s.cat === c ? ' on' : '') + '" data-cat="' + esc(c) + '">' + esc(c) + '</button>').join('') + '</div>';
    const attr = groups.map((g) => t === 'nova'
      ? '<div class="f-group"><h4>' + esc(g.label) + '</h4>' + g.values.slice(0, 12).map((v) => '<label class="f-check"><input type="checkbox" data-fk="' + esc(g.key) + '" value="' + esc(v) + '"' + ((s.filters[g.key] || []).includes(v) ? ' checked' : '') + '> ' + esc(v) + '</label>').join('') + '</div>'
      : '<label class="f-select"><span>' + esc(g.label) + '</span><select data-fsel="' + esc(g.key) + '"><option value="">Todos</option>' + g.values.map((v) => '<option' + ((s.filters[g.key] || [])[0] === v ? ' selected' : '') + '>' + esc(v) + '</option>').join('') + '</select></label>').join('');
    const sort = '<label class="f-select f-sort"><span>Ordenar</span><select id="cSort">' + [['relevance', 'Recomendados'], ['price-asc', 'Precio: menor a mayor'], ['price-desc', 'Precio: mayor a menor'], ['name', 'Nombre (A-Z)']].map((o) => '<option value="' + o[0] + '"' + (s.sort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></label>';
    const avail = t === 'nova' ? '<div class="f-group"><h4>Disponibilidad</h4><label class="f-check"><input type="checkbox" id="fStock"' + (s.inStock ? ' checked' : '') + '> Solo disponibles</label></div>' : '<label class="f-check f-inline"><input type="checkbox" id="fStock"' + (s.inStock ? ' checked' : '') + '> Solo disponibles</label>';
    return { catBlock, attr, sort, avail };
  };

  R.products = function (ctx, list, all) {
    const t = ctx.eff.design.template;
    const f = R.filters(ctx, all);
    const s = ctx.state;
    const active = (s.q ? 1 : 0) + (s.cat ? 1 : 0) + Object.values(s.filters).reduce((a, v) => a + v.length, 0) + (s.inStock ? 1 : 0);
    const head = '<div class="c-sec-h"><h2>' + esc(s.cat || (s.q ? 'Resultados para "' + s.q + '"' : 'Todos los productos')) + '</h2><span class="c-count">' + list.length + ' producto' + (list.length === 1 ? '' : 's') + '</span>' + (active ? '<button type="button" class="c-clear" id="cClear">' + ic('x') + 'Limpiar filtros</button>' : '') + '</div>';
    const empty = '<div class="c-empty">' + ic('search') + '<h3>No encontramos productos</h3><p>Prueba con otra búsqueda o quita algunos filtros.</p><button type="button" class="c-btn c-btn-p" id="cClear2">Ver todos los productos</button></div>';
    let body;
    if (t === 'mayorista') body = list.length ? '<div class="c-rows"><div class="c-rows-h"><span></span><span>Producto</span><span>Precio</span><span>Cantidad</span><span></span></div>' + list.map((p) => R.row(p, ctx)).join('') + '</div>' : empty;
    else body = list.length ? '<div class="c-grid">' + list.map((p) => R.card(p, ctx)).join('') + '</div>' : empty;
    if (t === 'nova') {
      return '<section class="c-sec c-products" id="productos" data-section="products"><div class="c-wrap c-shop"><aside class="c-side"><button type="button" class="c-side-close" id="cSideClose">' + ic('x') + '</button>' + f.catBlock + f.attr + f.avail + '</aside><div class="c-main">' + head +
        '<div class="c-toolbar"><button type="button" class="c-btn c-btn-o c-filter-btn" id="cFilterBtn">' + ic('filter') + 'Filtros</button>' + f.sort + '</div>' + body + '</div></div></section>';
    }
    return '<section class="c-sec c-products" id="productos" data-section="products"><div class="c-wrap">' + head + f.catBlock +
      '<div class="c-toolbar">' + f.attr + f.avail + f.sort + '</div>' + body + '</div></section>';
  };

  R.footer = function (ctx) {
    const d = ctx.eff.design, fo = d.footer;
    const n = ctx.eff.whatsapp.numbers[0];
    return '<footer class="c-foot" data-section="footer"><div class="c-wrap c-foot-in">' +
      '<div id="about"><div class="c-brand">' + (d.logo ? '<img class="c-logo" src="' + d.logo + '" alt="">' : '<span class="c-logo-txt">' + esc(u.initials(d.businessName)) + '</span>') + '<span class="c-name">' + esc(d.businessName) + '</span></div><p>' + esc(fo.text) + '</p></div>' +
      '<div id="contact"><h4>Contacto</h4>' + (n ? '<a href="' + ctx.waGeneral() + '" target="_blank" rel="noopener" data-wa="general">' + ic('wa') + CA.wa.format(CA.wa.normalize(n.number)) + '</a>' : '') +
      (fo.address ? '<span>' + ic('pin') + esc(fo.address) + '</span>' : '') + (fo.hours ? '<span>' + ic('clock') + esc(fo.hours) + '</span>' : '') + '</div>' +
      '<div><h4>Síguenos</h4>' + (fo.instagram ? '<a href="https://instagram.com/' + esc(fo.instagram) + '" target="_blank" rel="noopener">' + ic('ig') + '@' + esc(fo.instagram) + '</a>' : '') + (fo.facebook ? '<a href="https://facebook.com/' + esc(fo.facebook) + '" target="_blank" rel="noopener">' + ic('fb') + esc(fo.facebook) + '</a>' : '') +
      (!fo.instagram && !fo.facebook ? '<span class="c-muted">Pronto en redes sociales</span>' : '') + '</div></div>' +
      '<div class="c-wrap c-foot-b"><span>© ' + new Date().getFullYear() + ' ' + esc(d.businessName) + '</span>' + (ctx.eff.branding ? '<a class="c-made" href="index.html" target="_blank" rel="noopener">Catálogo creado con <b>' + esc(CA.CONFIG.brand.name) + '</b></a>' : '') + '</div></footer>';
  };

  R.floating = function (ctx) {
    const w = ctx.eff.whatsapp;
    if (!w.floating || !w.numbers.length) return '';
    return '<a class="c-float c-float-' + (w.position === 'left' ? 'left' : 'right') + '" href="' + ctx.waGeneral() + '" target="_blank" rel="noopener" data-wa="general" aria-label="Escribir por WhatsApp">' + ic('wa') + (w.floatingText ? '<span>' + esc(w.floatingText) + '</span>' : '') + '</a>';
  };

  /** Página de inicio completa en el orden de secciones del diseño. */
  R.home = function (ctx, list, all) {
    const map = { hero: R.hero, categories: R.categories, featured: R.featured, benefits: R.benefits, products: (c) => R.products(c, list, all) };
    const filtering = ctx.state.q || ctx.state.cat || Object.values(ctx.state.filters).some((v) => v.length) || ctx.state.inStock;
    // Al buscar o filtrar solo se muestra el listado de productos
    if (filtering) return R.products(ctx, list, all);
    return ctx.eff.design.sections.filter((s) => s.on && map[s.id]).map((s) => map[s.id](ctx)).join('') || R.products(ctx, list, all);
  };

  /** Contenido del detalle de producto (modal o página). */
  R.detail = function (p, ctx, asPage) {
    const g = p.gallery.length ? p.gallery : [p.image];
    const related = ctx.eff.products.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);
    return '<div class="c-pd' + (asPage ? ' c-pd-page' : '') + '"><div class="c-pd-gal"><div class="c-pd-main">' + img(g[0], p.name, 'c-pd-img') + R.discount(p) + '</div>' +
      (g.length > 1 ? '<div class="c-pd-thumbs">' + g.map((x, i) => '<button type="button" class="' + (i ? '' : 'on') + '" data-gal="' + i + '">' + img(x, '') + '</button>').join('') + '</div>' : '') + '</div>' +
      '<div class="c-pd-info"><span class="c-pd-cat">' + esc(p.category) + (p.brand ? ' · ' + esc(p.brand) : '') + '</span><h1>' + esc(p.name) + '</h1>' +
      '<div class="c-pd-price">' + R.price(p) + '</div>' + R.avail(p) +
      (p.description ? '<p class="c-pd-desc">' + esc(p.description) + '</p>' : '') +
      '<dl class="c-pd-attrs"><dt>Código</dt><dd>' + esc(p.sku) + '</dd>' + Object.keys(p.attributes).map((k) => '<dt>' + esc(k) + '</dt><dd>' + esc(p.attributes[k]) + '</dd>').join('') + '</dl>' +
      '<div class="c-pd-actions"><a class="c-btn c-btn-wa c-btn-lg" href="' + ctx.waHref(p) + '" target="_blank" rel="noopener" data-wa="' + esc(p.id) + '">' + ic('wa') + esc(ctx.eff.whatsapp.buttonText || 'Consultar por WhatsApp') + '</a>' +
      '<button type="button" class="c-btn c-btn-o c-btn-lg" data-add="' + esc(p.id) + '">' + ic(ctx.inList(p.id) ? 'check' : 'plus') + (ctx.inList(p.id) ? 'En tu lista' : 'Agregar a la lista') + '</button></div>' +
      '<p class="c-pd-note">' + ic('chat') + 'Sin registro ni pagos en línea: te responderemos por WhatsApp para coordinar la compra.</p>' +
      (asPage ? '<div class="c-pd-url">' + ic('share') + '<span>' + esc(ctx.productPublicUrl(p)) + '</span></div>' : '') + '</div></div>' +
      (asPage && related.length ? '<section class="c-sec"><div class="c-sec-h"><h2>También te puede interesar</h2></div><div class="c-grid">' + related.map((x) => R.card(x, ctx)).join('') + '</div></section>' : '');
  };
})();
