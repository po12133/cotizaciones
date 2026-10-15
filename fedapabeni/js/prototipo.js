/*
 * Prototipo FEDAPABENI — aplicación de una sola página (Vanilla JS, enrutado por hash).
 * Los datos provienen de data.js y se persisten localmente con store.js.
 */
(function () {
  'use strict';

  const { esc, norm, asset, fmtDate, waLink, toast } = window.FP;
  const main = document.getElementById('main');
  const db = function () { return window.Store.db; };

  const NAV = [
    ['', 'Inicio', 'home'],
    ['nosotros', 'Nosotros', 'trees'],
    ['directorio', 'Directorio', 'users'],
    ['catalogo', 'Catálogo', 'store'],
    ['mapa', 'Mapa', 'map'],
    ['noticias', 'Noticias y ferias', 'newspaper'],
    ['galeria', 'Galería', 'image'],
    ['contacto', 'Contacto', 'mail'],
  ];
  const POST_TYPES = { noticia: 'Noticia', evento: 'Evento', feria: 'Feria', oportunidad: 'Oportunidad comercial' };
  const AVAIL_CLS = { 'Disponible': 'ok', 'Por temporada': 'warn', 'Bajo pedido': 'info' };

  let maps = [];
  let lbItems = [];
  let lbIndex = 0;
  let lastFocus = null;

  /* ================= utilidades de datos ================= */
  const org = function (id) { return db().organizations.find(function (o) { return o.id === id; }); };
  const cat = function (id) { return db().categories.find(function (c) { return c.id === id; }); };
  const productsOf = function (orgId) { return db().products.filter(function (p) { return p.orgId === orgId; }); };
  const uniq = function (arr) { return Array.from(new Set(arr)).sort(function (a, b) { return a.localeCompare(b, 'es'); }); };
  const orgName = function (o) { return o ? o.acronym : 'Organización no disponible'; };
  const orgPlace = function (o) { return o ? o.municipality + ', ' + o.department : ''; };
  const firstImg = function (arr) { return asset((arr && arr[0]) || 'assets/images/sendero-selva.jpg'); };
  const today = function () { const d = new Date(); return d.toISOString().slice(0, 10); };

  function initials(o) {
    const words = String(o.acronym || '').replace(/\(.*?\)/g, '').trim().split(/\s+/);
    if (words.length === 1) return words[0].replace(/[^A-ZÁÉÍÓÚÑ]/g, '').slice(0, 4) || words[0].slice(0, 3).toUpperCase();
    return words.filter(function (w) { return /^[A-ZÁÉÍÓÚÑ]/.test(w); }).map(function (w) { return w[0]; }).join('').slice(0, 3);
  }

  function parseHash() {
    const h = decodeURI(location.hash.slice(1) || '/');
    const qi = h.indexOf('?');
    const path = (qi >= 0 ? h.slice(0, qi) : h).split('/').filter(Boolean);
    const params = new URLSearchParams(qi >= 0 ? h.slice(qi + 1) : '');
    return { path: path, params: params };
  }

  /** Actualiza los parámetros de la URL sin volver a renderizar la vista. */
  function replaceParams(params) {
    const p = parseHash().path.join('/');
    const qs = params.toString();
    history.replaceState(null, '', '#/' + p + (qs ? '?' + qs : ''));
  }

  function paginate(list, page, per) {
    const pages = Math.max(1, Math.ceil(list.length / per));
    const cur = Math.min(Math.max(1, page || 1), pages);
    return { items: list.slice((cur - 1) * per, cur * per), page: cur, pages: pages };
  }

  function pagerHtml(pg) {
    if (pg.pages <= 1) return '';
    let h = '<nav class="pagination" aria-label="Paginación">';
    h += '<button type="button" data-page="' + (pg.page - 1) + '" ' + (pg.page === 1 ? 'disabled' : '') + ' aria-label="Página anterior">' + icon('chevron-left') + '</button>';
    for (let i = 1; i <= pg.pages; i++) h += '<button type="button" data-page="' + i + '"' + (i === pg.page ? ' aria-current="page"' : '') + '>' + i + '</button>';
    h += '<button type="button" data-page="' + (pg.page + 1) + '" ' + (pg.page === pg.pages ? 'disabled' : '') + ' aria-label="Página siguiente">' + icon('chevron-right') + '</button>';
    return h + '</nav>';
  }

  function emptyHtml(title, text, action) {
    return '<div class="empty">' + icon('search') + '<h3>' + esc(title) + '</h3><p>' + esc(text) + '</p>' + (action || '') + '</div>';
  }

  /* ================= WhatsApp ================= */
  function waTarget(key) {
    const s = db().settings;
    const parts = String(key || 'general').split(':');
    const kind = parts[0];
    const id = parts[1];
    if (kind === 'product') {
      const p = db().products.find(function (x) { return x.id === id; });
      const o = p && org(p.orgId);
      return {
        number: (o && o.contact.whatsapp) || s.whatsapp,
        text: 'Hola, me interesa el producto "' + (p ? p.name : '') + '" (' + (p ? p.presentation : '') + ') de ' + orgName(o) + ', visto en la plataforma de FEDAPABENI. ¿Podrían indicarme disponibilidad, precio y condiciones de entrega?',
      };
    }
    if (kind === 'org') {
      const o = org(id);
      return { number: (o && o.contact.whatsapp) || s.whatsapp, text: 'Hola ' + orgName(o) + ', vi su perfil en la plataforma de FEDAPABENI y quisiera más información sobre sus productos.' };
    }
    return { number: s.whatsapp, text: 'Hola FEDAPABENI, quisiera información sobre los productos amazónicos de sus asociaciones.' };
  }

  document.addEventListener('click', function (e) {
    const a = e.target.closest('[data-wa]');
    if (!a) return;
    const t = waTarget(a.getAttribute('data-wa'));
    a.href = waLink(t.number, t.text);
    if (!window.FP.onlyDigits(t.number)) {
      toast('Demostración: aún no hay un número de WhatsApp configurado. Se abrirá WhatsApp para elegir el contacto. Puede definirlo en el panel administrativo.', 'info');
    }
  }, true);

  /* ================= componentes ================= */
  function productCard(p) {
    const o = org(p.orgId);
    const c = cat(p.categoryId);
    return '<article class="card product-card">' +
      '<div class="media"><img src="' + firstImg(p.images) + '" alt="' + esc(p.name) + '" loading="lazy" width="600" height="450">' +
      '<span class="badge ' + (AVAIL_CLS[p.availability] || '') + '">' + esc(p.availability) + '</span></div>' +
      '<div class="body">' +
      '<span class="meta">' + icon('tag') + esc(c ? c.name : 'Sin categoría') + '</span>' +
      '<h3><a href="#/producto/' + encodeURIComponent(p.id) + '">' + esc(p.name) + '</a></h3>' +
      '<span class="meta">' + icon('users') + esc(orgName(o)) + (o ? ' · ' + esc(o.municipality) : '') + '</span>' +
      '<div class="foot"><span class="chip">' + esc(p.presentation) + '</span>' +
      '<a class="btn btn-wa btn-sm" data-wa="product:' + esc(p.id) + '" href="#" target="_blank" rel="noopener" aria-label="Consultar ' + esc(p.name) + ' por WhatsApp">' + icon('whatsapp') + '<span class="hide-sm">Consultar</span></a></div>' +
      '</div></article>';
  }

  function orgCard(o) {
    const n = productsOf(o.id).length;
    return '<article class="card org-card">' +
      '<div class="media" style="overflow:visible"><div style="position:absolute;inset:0;overflow:hidden"><img src="' + firstImg(o.images) + '" alt="" loading="lazy" width="600" height="450" style="width:100%;height:100%;object-fit:cover"></div>' +
      '<span class="badge ' + (o.type === 'Emprendimiento' ? 'earth' : 'gold') + '">' + esc(o.type) + '</span>' +
      '<span class="logo-badge" aria-hidden="true">' + esc(initials(o)) + '</span></div>' +
      '<div class="body">' +
      '<h3><a href="#/asociacion/' + encodeURIComponent(o.id) + '">' + esc(o.acronym) + '</a></h3>' +
      '<span class="meta">' + icon('map-pin') + esc(orgPlace(o)) + ' <span class="badge demo" title="Ubicación demostrativa">demo</span></span>' +
      '<p style="margin:0;font-size:14.5px;color:var(--muted)">' + esc(o.summary) + '</p>' +
      '<div class="chips">' + o.rubros.map(function (r) { return '<span class="chip">' + esc(r) + '</span>'; }).join('') + '</div>' +
      '<div class="foot"><span class="meta">' + icon('package') + n + ' producto' + (n === 1 ? '' : 's') + '</span><span class="link-more">Ver perfil ' + icon('arrow-right') + '</span></div>' +
      '</div></article>';
  }

  function postCard(p) {
    return '<article class="card post-card">' +
      '<div class="media" style="aspect-ratio:16/10"><img src="' + asset(p.image) + '" alt="" loading="lazy" width="640" height="400">' +
      '<span class="badge ' + (p.type === 'oportunidad' ? 'gold' : p.type === 'feria' ? 'earth' : p.type === 'evento' ? 'info' : '') + '">' + esc(POST_TYPES[p.type] || p.type) + '</span></div>' +
      '<div class="body">' +
      '<span class="meta date">' + icon('calendar') + esc(fmtDate(p.date)) + ' · ' + icon('map-pin') + esc(p.place) + '</span>' +
      '<h3><a href="#/noticia/' + encodeURIComponent(p.id) + '">' + esc(p.title) + '</a></h3>' +
      '<p style="margin:0;font-size:14.5px;color:var(--muted)">' + esc(p.summary) + '</p>' +
      '<div class="foot"><span class="link-more">Leer más ' + icon('arrow-right') + '</span></div>' +
      '</div></article>';
  }

  function pageHero(title, text, crumbs, img) {
    return '<section class="page-hero"' + (img ? ' style="--ph-img:url(\'' + asset(img) + '\')"' : '') + '><div class="wrap">' +
      '<nav class="crumbs" aria-label="Ruta de navegación"><a href="#/">Inicio</a>' + (crumbs || []).map(function (c) {
        return icon('chevron-right') + (c[1] ? '<a href="' + c[1] + '">' + esc(c[0]) + '</a>' : '<span aria-current="page">' + esc(c[0]) + '</span>');
      }).join('') + '</nav>' +
      '<h1>' + esc(title) + '</h1>' + (text ? '<p>' + esc(text) + '</p>' : '') + '</div></section>';
  }

  /* ================= vistas ================= */
  const views = {};

  views.home = function () {
    const d = db();
    const s = d.settings;
    const featuredP = d.products.filter(function (p) { return p.featured; }).slice(0, 4);
    const featuredO = d.organizations.filter(function (o) { return o.featured; }).slice(0, 3);
    const posts = d.posts.slice().sort(function (a, b) { return b.date.localeCompare(a.date); }).slice(0, 3);
    const deps = uniq(d.organizations.map(function (o) { return o.department; }));

    return '<section class="hero"><div class="bg" style="background-image:url(\'' + asset(s.heroImage) + '\')"></div>' +
      '<div class="wrap">' +
      '<span class="eyebrow">' + icon('leaf') + 'Norte amazónico de Bolivia · Bosque en pie</span>' +
      '<h1>Productos del bosque amazónico, <em>de productores organizados</em> al mercado</h1>' +
      '<p class="lead">' + esc(s.tagline) + '. Conozca a las asociaciones y emprendimientos afiliados a FEDAPABENI, su oferta y sus capacidades, y contáctelos directamente.</p>' +
      '<form class="searchbox" role="search" data-form="hero-search">' +
      '<label class="sr-only" for="hsScope">Buscar en</label><select class="select" id="hsScope" name="scope"><option value="todo">Todo</option><option value="productos">Productos</option><option value="asociaciones">Asociaciones</option></select>' +
      '<label class="sr-only" for="hsQ">Término de búsqueda</label><input id="hsQ" name="q" type="search" placeholder="Ej.: asaí, cacao, Riberalta…" autocomplete="off">' +
      '<button class="btn btn-gold" type="submit">' + icon('search') + 'Buscar</button></form>' +
      '<div class="quick"><span>Populares:</span><a href="#/catalogo?q=asaí">Asaí</a><a href="#/catalogo?q=copoazú">Copoazú</a><a href="#/catalogo?cat=cacao">Cacao silvestre</a><a href="#/catalogo?cat=harinas">Harina de plátano</a></div>' +
      '<div class="stats">' +
      '<div class="stat"><b>' + d.organizations.length + '</b><span>Asociaciones y emprendimientos (demo)</span></div>' +
      '<div class="stat"><b>' + d.products.length + '</b><span>Productos en catálogo (demo)</span></div>' +
      '<div class="stat"><b>~' + esc(s.families) + '</b><span>Familias productoras y recolectoras*</span></div>' +
      '<div class="stat"><b>' + deps.length + '</b><span>Departamentos con presencia (demo)</span></div>' +
      '</div>' +
      '<p style="font-size:12px;color:#a9c6b3;margin:14px 0 0">* Dato de referencia de los Términos de Referencia de la convocatoria; el resto de cifras son demostrativas.</p>' +
      '</div><span class="photo-credit">Foto: Río Beni · H. S. Krohn · CC BY-SA 3.0</span></section>' +

      '<section class="section"><div class="wrap">' +
      '<div class="section-head"><div><span class="eyebrow" style="color:var(--tierra-500)">Categorías comerciales</span><h2>Explore la oferta amazónica</h2><p>Pulpas, cacao silvestre, harinas y otros productos de las organizaciones afiliadas.</p></div>' +
      '<a class="link-more" href="#/catalogo">Ver catálogo completo ' + icon('arrow-right') + '</a></div>' +
      '<div class="grid g-3">' + d.categories.map(function (c) {
        const n = d.products.filter(function (p) { return p.categoryId === c.id; }).length;
        return '<a class="cat-card" href="#/catalogo?cat=' + encodeURIComponent(c.id) + '"><span class="ic">' + icon(c.icon) + '</span><span><b>' + esc(c.name) + '</b><span>' + n + ' producto' + (n === 1 ? '' : 's') + ' · ' + esc(c.description) + '</span></span></a>';
      }).join('') + '</div></div></section>' +

      '<section class="section alt"><div class="wrap">' +
      '<div class="section-head"><div><span class="eyebrow" style="color:var(--tierra-500)">Productos destacados</span><h2>Sabores y materias primas del bosque</h2></div>' +
      '<a class="link-more" href="#/catalogo">Ir al catálogo ' + icon('arrow-right') + '</a></div>' +
      '<div class="grid g-4">' + featuredP.map(productCard).join('') + '</div></div></section>' +

      '<section class="section"><div class="wrap split">' +
      '<div class="img"><img src="' + asset('assets/images/sendero-selva.jpg') + '" alt="Sendero dentro del bosque amazónico" loading="lazy" width="1400" height="930"></div>' +
      '<div><span class="eyebrow" style="color:var(--tierra-500)">Modelo de producción</span><h2 style="font-size:clamp(26px,5vw,40px);margin-top:8px">Bosque en pie: producir conservando</h2>' +
      '<p>FEDAPABENI articula la oferta de organizaciones que aprovechan frutos y productos del bosque sin talarlo, generando ingresos para las familias y conservando la Amazonía.</p>' +
      '<div class="pillars">' +
      '<div class="pillar"><span class="ic">' + icon('trees') + '</span><div><b>Aprovechamiento sostenible</b><p>Recolección de frutos amazónicos y sistemas agroforestales diversificados.</p></div></div>' +
      '<div class="pillar"><span class="ic">' + icon('users') + '</span><div><b>Organizaciones de base</b><p>Asociaciones y emprendimientos que agregan valor a la materia prima.</p></div></div>' +
      '<div class="pillar"><span class="ic">' + icon('handshake') + '</span><div><b>Articulación de mercados</b><p>Vínculo directo entre productores, compradores e instituciones.</p></div></div>' +
      '</div><p style="margin-top:20px"><a class="btn btn-primary" href="#/nosotros">Conocer FEDAPABENI ' + icon('arrow-right') + '</a></p></div>' +
      '</div></section>' +

      '<section class="section alt"><div class="wrap">' +
      '<div class="section-head"><div><span class="eyebrow" style="color:var(--tierra-500)">Asociaciones destacadas</span><h2>Quiénes producen</h2><p>Cada organización cuenta con un perfil propio con productos, capacidades, fotos, ubicación y contacto.</p></div>' +
      '<a class="link-more" href="#/directorio">Ver directorio ' + icon('arrow-right') + '</a></div>' +
      '<div class="grid g-3">' + featuredO.map(orgCard).join('') + '</div></div></section>' +

      '<section class="section dark"><div class="wrap">' +
      '<div class="section-head"><div><span class="eyebrow">Beneficios de la plataforma</span><h2>Una vitrina comercial para la Amazonía boliviana</h2><p>Pensada para compradores, instituciones y para las propias asociaciones.</p></div></div>' +
      '<div class="grid g-4">' +
      benefit('target', 'Oferta en un solo lugar', 'Compradores encuentran productos, volúmenes y temporadas sin intermediarios innecesarios.') +
      benefit('whatsapp', 'Contacto inmediato', 'Consultas por WhatsApp y formularios de compra directamente con cada organización.') +
      benefit('map', 'Origen georreferenciado', 'Mapa interactivo con la ubicación de las asociaciones y emprendimientos.') +
      benefit('sliders', 'Autogestionable', 'FEDAPABENI actualiza productos, noticias y perfiles desde su panel administrativo.') +
      '</div></div></section>' +

      '<section class="section"><div class="wrap">' +
      '<div class="section-head"><div><span class="eyebrow" style="color:var(--tierra-500)">Noticias, ferias y oportunidades</span><h2>Actualidad del sector</h2></div>' +
      '<a class="link-more" href="#/noticias">Ver todas ' + icon('arrow-right') + '</a></div>' +
      '<div class="grid g-3">' + posts.map(postCard).join('') + '</div>' +
      '<div class="banner-cta" style="margin-top:56px"><span class="eyebrow">Compradores e instituciones</span>' +
      '<h2 style="margin-top:8px">¿Busca proveedores de productos amazónicos?</h2>' +
      '<p>Envíe una solicitud de información o de compra. FEDAPABENI la canaliza a las asociaciones con la oferta adecuada.</p>' +
      '<div class="actions"><a class="btn btn-gold" href="#/contacto?tipo=compra">' + icon('send') + 'Solicitud de compra</a><a class="btn btn-wa" data-wa="general" href="#" target="_blank" rel="noopener">' + icon('whatsapp') + 'WhatsApp</a></div></div>' +
      '</div></section>';
  };

  function benefit(ic, t, d) {
    return '<div class="benefit"><span class="ic">' + icon(ic) + '</span><h3>' + esc(t) + '</h3><p>' + esc(d) + '</p></div>';
  }

  views.nosotros = function () {
    const d = db();
    const deps = uniq(d.organizations.map(function (o) { return o.department; }));
    const munis = uniq(d.organizations.map(function (o) { return o.municipality; }));
    return pageHero('Quiénes somos', d.settings.siteFullName, [['Nosotros']], 'assets/images/hero-tijamuchi.jpg') +
      '<section class="section"><div class="wrap split">' +
      '<div><span class="eyebrow" style="color:var(--tierra-500)">FEDAPABENI</span><h2 style="font-size:clamp(26px,5vw,38px);margin-top:8px">Articulamos la oferta amazónica del norte de Bolivia</h2>' +
      '<p>FEDAPABENI reúne a asociaciones de productores agroforestales y emprendimientos amazónicos para fortalecer su visibilidad, promover sus productos y facilitar el acceso a mercados.</p>' +
      '<div class="note">' + icon('info') + '<span>Texto provisional basado en los Términos de Referencia. La misión, visión, historia y datos institucionales serán redactados y validados con FEDAPABENI durante la fase de levantamiento de requerimientos.</span></div>' +
      '<h3 style="margin-top:26px;font-size:21px">Objetivos institucionales</h3><ul class="check-list">' +
      ['Fortalecer la presencia institucional y digital de la federación.', 'Visibilizar a las asociaciones y emprendimientos afiliados.', 'Promover los productos amazónicos y las capacidades productivas.', 'Facilitar el contacto entre productores, organizaciones y compradores.'].map(function (t) { return '<li>' + icon('check-circle') + '<span>' + esc(t) + '</span></li>'; }).join('') +
      '</ul></div>' +
      '<div class="img"><img src="' + asset('assets/images/riberalta-paisaje.jpg') + '" alt="Vista de Riberalta, Beni" loading="lazy"></div>' +
      '</div></section>' +

      '<section class="section alt"><div class="wrap split">' +
      '<div class="img"><img src="' + asset('assets/images/tucan-asai.jpg') + '" alt="Tucán sobre una palmera de asaí" loading="lazy"></div>' +
      '<div><span class="eyebrow" style="color:var(--tierra-500)">Modelo de producción</span><h2 style="font-size:clamp(26px,5vw,38px);margin-top:8px">“Bosque en Pie”</h2>' +
      '<p>Un modelo en el que el bosque vale más en pie que talado: las familias recolectan y transforman frutos amazónicos —asaí, copoazú, majo, cacao silvestre, castaña— y combinan cultivos en sistemas agroforestales que conservan la cobertura forestal.</p>' +
      '<div class="pillars">' +
      '<div class="pillar"><span class="ic">' + icon('leaf') + '</span><div><b>Recolección responsable</b><p>Aprovechamiento de frutos sin derribar las palmeras ni los árboles.</p></div></div>' +
      '<div class="pillar"><span class="ic">' + icon('sprout') + '</span><div><b>Sistemas agroforestales</b><p>Cultivos asociados que diversifican ingresos y restauran suelos.</p></div></div>' +
      '<div class="pillar"><span class="ic">' + icon('award') + '</span><div><b>Valor agregado local</b><p>Despulpado, secado y transformación en las propias comunidades.</p></div></div>' +
      '</div></div></div></section>' +

      '<section class="section"><div class="wrap">' +
      '<div class="section-head"><div><span class="eyebrow" style="color:var(--tierra-500)">Cobertura territorial</span><h2>Presencia en el norte amazónico</h2><p>Cifras calculadas a partir de los registros demostrativos del prototipo.</p></div><a class="link-more" href="#/mapa">Ver mapa ' + icon('arrow-right') + '</a></div>' +
      '<div class="coverage">' +
      '<div class="c"><b>' + d.organizations.length + '</b><span>Organizaciones registradas</span></div>' +
      '<div class="c"><b>' + deps.length + '</b><span>Departamentos (' + esc(deps.join(', ')) + ')</span></div>' +
      '<div class="c"><b>' + munis.length + '</b><span>Localidades</span></div>' +
      '<div class="c"><b>~' + esc(d.settings.families) + '</b><span>Familias (dato TDR)</span></div>' +
      '</div></div></section>' +

      '<section class="section alt"><div class="wrap split" style="align-items:start">' +
      '<div><span class="eyebrow" style="color:var(--tierra-500)">Trayectoria</span><h2 style="font-size:clamp(26px,5vw,38px);margin-top:8px">Nuestra historia</h2>' +
      '<p style="color:var(--muted)">Línea de tiempo editable desde el panel. Los hitos mostrados son marcadores a completar por FEDAPABENI.</p>' +
      '<ol class="timeline">' +
      '<li><b>[Año por confirmar]</b><p>Fundación de la federación y primeras asociaciones afiliadas.</p></li>' +
      '<li><b>[Año por confirmar]</b><p>Hito institucional o productivo relevante.</p></li>' +
      '<li><b>2026</b><p>Lanzamiento de la plataforma comercial y de articulación de mercados (proyecto en curso).</p></li>' +
      '</ol></div>' +
      '<div><span class="eyebrow" style="color:var(--tierra-500)">Organizaciones afiliadas</span><h2 style="font-size:clamp(26px,5vw,38px);margin-top:8px">Asociaciones y emprendimientos</h2>' +
      '<ul class="check-list">' + d.organizations.map(function (o) { return '<li>' + icon('chevron-right') + '<a href="#/asociacion/' + encodeURIComponent(o.id) + '">' + esc(o.acronym) + '</a> <span style="color:var(--muted)">— ' + esc(o.type) + ', ' + esc(orgPlace(o)) + '</span></li>'; }).join('') + '</ul>' +
      '<p style="margin-top:18px"><a class="btn btn-primary" href="#/directorio">Ir al directorio ' + icon('arrow-right') + '</a></p></div>' +
      '</div></section>';
  };

  /* ---------- directorio ---------- */
  views.directorio = function (_, params) {
    const d = db();
    const places = uniq(d.organizations.map(orgPlace));
    const rubros = uniq([].concat.apply([], d.organizations.map(function (o) { return o.rubros; })));
    return pageHero('Directorio de asociaciones y emprendimientos', 'Organizaciones articuladas por FEDAPABENI, con su ubicación, actividad productiva y oferta.', [['Directorio']], 'assets/images/selva-rurrenabaque.jpg') +
      '<section class="section" style="padding-top:0"><div class="wrap">' +
      '<form class="toolbar" data-form="filters" role="search" aria-label="Filtrar directorio">' +
      '<div class="field-ic">' + icon('search') + '<label class="sr-only" for="fq">Buscar</label><input class="input" id="fq" name="q" type="search" placeholder="Buscar por nombre, producto o localidad…" value="' + esc(params.get('q') || '') + '"></div>' +
      selectHtml('loc', 'Ubicación', 'Todas las ubicaciones', places, params.get('loc')) +
      selectHtml('rubro', 'Rubro', 'Todos los rubros', rubros, params.get('rubro')) +
      selectHtml('tipo', 'Tipo', 'Asociaciones y emprendimientos', ['Asociación', 'Emprendimiento'], params.get('tipo')) +
      '</form><div id="results"></div></div></section>';
  };

  function selectHtml(name, label, all, opts, cur, valueKey) {
    return '<div><label class="sr-only" for="f-' + name + '">' + esc(label) + '</label><select class="select" id="f-' + name + '" name="' + name + '"><option value="">' + esc(all) + '</option>' +
      opts.map(function (o) {
        const v = valueKey ? o[valueKey] : o;
        const t = valueKey ? o.label : o;
        return '<option value="' + esc(v) + '"' + (cur === v ? ' selected' : '') + '>' + esc(t) + '</option>';
      }).join('') + '</select></div>';
  }

  function renderDirectory(params) {
    const q = norm(params.get('q'));
    const loc = params.get('loc') || '';
    const rubro = params.get('rubro') || '';
    const tipo = params.get('tipo') || '';
    const list = db().organizations.filter(function (o) {
      if (loc && orgPlace(o) !== loc) return false;
      if (rubro && o.rubros.indexOf(rubro) < 0) return false;
      if (tipo && o.type !== tipo) return false;
      if (q) {
        const hay = norm([o.acronym, o.fullName, o.summary, o.municipality, o.department, o.rubros.join(' '), productsOf(o.id).map(function (p) { return p.name; }).join(' ')].join(' '));
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
    const pg = paginate(list, +params.get('p') || 1, 6);
    const active = q || loc || rubro || tipo;
    return '<div class="result-info"><span><b>' + list.length + '</b> organizaci' + (list.length === 1 ? 'ón' : 'ones') + ' encontrada' + (list.length === 1 ? '' : 's') + '</span>' +
      (active ? '<button type="button" class="clear" data-action="clear-filters">' + icon('x') + ' Limpiar filtros</button>' : '') + '</div>' +
      (list.length ? '<div class="grid g-3">' + pg.items.map(orgCard).join('') + '</div>' + pagerHtml(pg)
        : emptyHtml('No encontramos organizaciones', 'Pruebe con otro término o quite algunos filtros.', '<button type="button" class="btn btn-outline" data-action="clear-filters">Limpiar filtros</button>'));
  }

  /* ---------- perfil de asociación ---------- */
  views.asociacion = function (id) {
    const o = org(id);
    if (!o) return notFound('La organización solicitada no existe o fue eliminada.');
    const prods = productsOf(o.id);
    const c = o.contact || {};
    const pend = '<span class="pending">Pendiente de confirmación</span>';
    return pageHero(o.acronym, o.fullName || 'Nombre completo pendiente de confirmación por FEDAPABENI', [['Directorio', '#/directorio'], [o.acronym]], o.images[0]) +
      '<section class="section" style="padding-top:36px"><div class="wrap">' +
      '<div class="detail">' +
      '<div>' + galleryBlock(o.images, o.acronym) +
      '<h2 style="margin-top:30px;font-size:26px">Sobre la organización</h2><p>' + esc(o.description) + '</p>' +
      '<div class="note">' + icon('info') + '<span>' + esc(db().note) + '. La ubicación del mapa es aproximada y demostrativa.</span></div>' +
      '</div>' +
      '<aside class="sticky">' +
      '<div class="panel-box">' +
      '<div class="chips" style="margin-bottom:10px"><span class="badge ' + (o.type === 'Emprendimiento' ? 'earth' : 'gold') + '">' + esc(o.type) + '</span><span class="badge demo">Datos demostrativos</span></div>' +
      '<ul class="spec" style="margin-top:6px">' +
      '<li><span>Ubicación</span><b>' + esc(orgPlace(o)) + '</b></li>' +
      '<li><span>Rubros</span><b>' + esc(o.rubros.join(', ')) + '</b></li>' +
      '<li><span>Capacidad</span><b>' + esc(o.capacity) + '</b></li>' +
      '<li><span>Familias</span><b>' + esc(o.families) + ' (demostrativo)</b></li>' +
      '<li><span>Canales</span><b>' + esc((o.channels || []).join(', ')) + '</b></li>' +
      '</ul>' +
      '<h3 style="font-size:18px">Contacto</h3><ul class="contact-list">' +
      '<li>' + icon('user') + '<span>' + (c.person && c.person !== 'Pendiente de confirmación' ? esc(c.person) : pend) + '</span></li>' +
      '<li>' + icon('phone') + '<span>' + (c.phone ? '<a href="tel:' + esc(c.phone) + '">' + esc(c.phone) + '</a>' : pend) + '</span></li>' +
      '<li>' + icon('mail') + '<span>' + (c.email ? '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>' : pend) + '</span></li>' +
      '</ul>' +
      '<div class="cta-box"><a class="btn btn-wa btn-block" data-wa="org:' + esc(o.id) + '" href="#" target="_blank" rel="noopener">' + icon('whatsapp') + 'Escribir por WhatsApp</a>' +
      '<a class="btn btn-outline btn-block" href="#/contacto?tipo=compra&org=' + encodeURIComponent(o.id) + '">' + icon('send') + 'Enviar solicitud de compra</a></div>' +
      '</div>' +
      '<h3 style="font-size:18px;margin-top:22px">Ubicación</h3><div class="mini-map" id="miniMap" data-lat="' + o.lat + '" data-lng="' + o.lng + '" data-title="' + esc(o.acronym) + '"></div>' +
      '</aside></div>' +
      '<div class="section-head" style="margin-top:56px"><div><span class="eyebrow" style="color:var(--tierra-500)">Oferta</span><h2>Productos de ' + esc(o.acronym) + '</h2></div>' +
      '<a class="link-more" href="#/catalogo?org=' + encodeURIComponent(o.id) + '">Ver en el catálogo ' + icon('arrow-right') + '</a></div>' +
      (prods.length ? '<div class="grid g-4">' + prods.map(productCard).join('') + '</div>' : emptyHtml('Sin productos publicados', 'Esta organización todavía no tiene productos en el catálogo.')) +
      '</div></section>';
  };

  function galleryBlock(images, title) {
    const imgs = (images && images.length ? images : ['assets/images/sendero-selva.jpg']);
    return '<div class="gallery-main" data-gallery="' + esc(JSON.stringify(imgs)) + '" data-title="' + esc(title) + '" data-index="0" role="button" tabindex="0" aria-label="Ampliar imagen">' +
      '<img id="gMain" src="' + asset(imgs[0]) + '" alt="' + esc(title) + '" width="900" height="675"><span class="zoom">' + icon('maximize') + 'Ampliar</span></div>' +
      (imgs.length > 1 ? '<div class="thumbs" role="group" aria-label="Miniaturas">' + imgs.map(function (src, i) {
        return '<button type="button" data-thumb="' + i + '"' + (i === 0 ? ' aria-current="true"' : '') + ' aria-label="Ver imagen ' + (i + 1) + '"><img src="' + asset(src) + '" alt="" loading="lazy"></button>';
      }).join('') + '</div>' : '');
  }

  /* ---------- catálogo ---------- */
  views.catalogo = function (_, params) {
    const d = db();
    return pageHero('Catálogo comercial', 'Productos amazónicos de las asociaciones y emprendimientos afiliados, con presentaciones, disponibilidad y contacto directo.', [['Catálogo']], 'assets/images/copoazu-abierto.jpg') +
      '<section class="section" style="padding-top:0"><div class="wrap">' +
      '<form class="toolbar" data-form="filters" role="search" aria-label="Filtrar catálogo">' +
      '<div class="field-ic">' + icon('search') + '<label class="sr-only" for="fq">Buscar productos</label><input class="input" id="fq" name="q" type="search" placeholder="Buscar productos…" value="' + esc(params.get('q') || '') + '"></div>' +
      selectHtml('cat', 'Categoría', 'Todas las categorías', d.categories.map(function (c) { return { id: c.id, label: c.name }; }), params.get('cat'), 'id') +
      selectHtml('org', 'Asociación', 'Todas las organizaciones', d.organizations.map(function (o) { return { id: o.id, label: o.acronym }; }), params.get('org'), 'id') +
      '<div><label class="sr-only" for="f-sort">Ordenar</label><select class="select" id="f-sort" name="sort">' +
      [['', 'Destacados primero'], ['az', 'Nombre (A-Z)'], ['za', 'Nombre (Z-A)'], ['disp', 'Disponibilidad'], ['org', 'Organización']].map(function (o) {
        return '<option value="' + o[0] + '"' + ((params.get('sort') || '') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
      }).join('') + '</select></div>' +
      '</form>' +
      '<div class="note" style="margin-bottom:18px">' + icon('info') + '<span>El catálogo no incluye pagos en línea: las compras se coordinan por WhatsApp o mediante solicitud de compra. La pasarela de pagos sería una ampliación futura fuera del alcance contratado.</span></div>' +
      '<div id="results"></div></div></section>';
  };

  function renderCatalog(params) {
    const q = norm(params.get('q'));
    const c = params.get('cat') || '';
    const o = params.get('org') || '';
    const sort = params.get('sort') || '';
    let list = db().products.filter(function (p) {
      if (c && p.categoryId !== c) return false;
      if (o && p.orgId !== o) return false;
      if (q) {
        const or = org(p.orgId);
        const ca = cat(p.categoryId);
        const hay = norm([p.name, p.description, p.presentation, ca && ca.name, or && or.acronym, or && or.municipality].join(' '));
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
    const order = { 'Disponible': 0, 'Por temporada': 1, 'Bajo pedido': 2 };
    const cmp = {
      '': function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || a.name.localeCompare(b.name, 'es'); },
      az: function (a, b) { return a.name.localeCompare(b.name, 'es'); },
      za: function (a, b) { return b.name.localeCompare(a.name, 'es'); },
      disp: function (a, b) { return (order[a.availability] || 9) - (order[b.availability] || 9) || a.name.localeCompare(b.name, 'es'); },
      org: function (a, b) { return orgName(org(a.orgId)).localeCompare(orgName(org(b.orgId)), 'es') || a.name.localeCompare(b.name, 'es'); },
    };
    list = list.slice().sort(cmp[sort] || cmp['']);
    const pg = paginate(list, +params.get('p') || 1, 8);
    const active = q || c || o;
    return '<div class="result-info"><span><b>' + list.length + '</b> producto' + (list.length === 1 ? '' : 's') + (c && cat(c) ? ' en <b>' + esc(cat(c).name) + '</b>' : '') + '</span>' +
      (active ? '<button type="button" class="clear" data-action="clear-filters">' + icon('x') + ' Limpiar filtros</button>' : '') + '</div>' +
      (list.length ? '<div class="grid g-4">' + pg.items.map(productCard).join('') + '</div>' + pagerHtml(pg)
        : emptyHtml('No hay productos que coincidan', 'Intente con otra búsqueda, categoría u organización.', '<button type="button" class="btn btn-outline" data-action="clear-filters">Ver todo el catálogo</button>'));
  }

  /* ---------- ficha de producto ---------- */
  views.producto = function (id) {
    const p = db().products.find(function (x) { return x.id === id; });
    if (!p) return notFound('El producto solicitado no existe o fue eliminado.');
    const o = org(p.orgId);
    const c = cat(p.categoryId);
    const related = db().products.filter(function (x) { return x.id !== p.id && (x.categoryId === p.categoryId || x.orgId === p.orgId); }).slice(0, 4);
    return '<section class="page-hero" style="padding:22px 0"><div class="wrap"><nav class="crumbs" aria-label="Ruta de navegación"><a href="#/">Inicio</a>' + icon('chevron-right') + '<a href="#/catalogo">Catálogo</a>' + icon('chevron-right') +
      (c ? '<a href="#/catalogo?cat=' + encodeURIComponent(c.id) + '">' + esc(c.name) + '</a>' + icon('chevron-right') : '') + '<span aria-current="page">' + esc(p.name) + '</span></nav></div></section>' +
      '<section class="section" style="padding-top:30px"><div class="wrap"><div class="detail">' +
      '<div>' + galleryBlock(p.images, p.name) + '</div>' +
      '<div class="sticky">' +
      '<div class="chips"><span class="badge">' + esc(c ? c.name : 'Sin categoría') + '</span><span class="badge ' + (AVAIL_CLS[p.availability] || '') + '">' + esc(p.availability) + '</span><span class="badge demo">Ficha demostrativa</span></div>' +
      '<h1>' + esc(p.name) + '</h1>' +
      '<p style="font-size:17px;color:var(--muted)">' + esc(p.description) + '</p>' +
      '<ul class="spec">' +
      '<li><span>Organización</span><b>' + (o ? '<a href="#/asociacion/' + encodeURIComponent(o.id) + '">' + esc(o.acronym) + '</a> · ' + esc(orgPlace(o)) : 'No disponible') + '</b></li>' +
      '<li><span>Presentación</span><b>' + esc(p.presentation) + '</b></li>' +
      '<li><span>Disponibilidad</span><b>' + esc(p.availability) + ' <small style="color:var(--muted)">(demostrativa)</small></b></li>' +
      '<li><span>Temporada</span><b>' + esc(p.season) + '</b></li>' +
      '<li><span>Pedido mínimo</span><b>' + esc(p.minOrder) + '</b></li>' +
      '</ul>' +
      (p.features && p.features.length ? '<ul class="check-list">' + p.features.map(function (f) { return '<li>' + icon('check') + '<span>' + esc(f) + '</span></li>'; }).join('') + '</ul>' : '') +
      '<div class="cta-box"><p>Consulte precio, disponibilidad y condiciones de entrega directamente con la organización productora.</p>' +
      '<a class="btn btn-wa btn-block" data-wa="product:' + esc(p.id) + '" href="#" target="_blank" rel="noopener">' + icon('whatsapp') + 'Consultar por WhatsApp</a>' +
      '<button class="btn btn-primary btn-block" type="button" data-action="quote" data-id="' + esc(p.id) + '">' + icon('send') + 'Solicitar cotización</button></div>' +
      '<p class="note" style="margin-top:14px">' + icon('lock') + '<span>Sin pagos en línea: la plataforma facilita el contacto comercial. El pago electrónico podría incorporarse como módulo futuro, fuera del alcance de esta propuesta.</span></p>' +
      '</div></div>' +
      (related.length ? '<div class="section-head" style="margin-top:56px"><div><span class="eyebrow" style="color:var(--tierra-500)">También le puede interesar</span><h2>Productos relacionados</h2></div></div><div class="grid g-4">' + related.map(productCard).join('') + '</div>' : '') +
      '</div></section>';
  };

  /* ---------- mapa ---------- */
  views.mapa = function (_, params) {
    const d = db();
    return pageHero('Mapa de organizaciones', 'Ubicación de las asociaciones y emprendimientos participantes. Ubicaciones demostrativas, a confirmar por FEDAPABENI.', [['Mapa']], 'assets/images/mamore-beni.jpg') +
      '<section class="section" style="padding-top:0"><div class="wrap">' +
      '<form class="toolbar" data-form="map-filters" aria-label="Filtrar mapa" style="grid-template-columns:1fr 1fr">' +
      selectHtml('dep', 'Departamento', 'Todos los departamentos', uniq(d.organizations.map(function (o) { return o.department; })), params.get('dep')) +
      selectHtml('tipo', 'Tipo', 'Asociaciones y emprendimientos', ['Asociación', 'Emprendimiento'], params.get('tipo')) +
      '</form>' +
      '<div class="map-layout"><div class="map-list" id="mapList" aria-label="Organizaciones en el mapa"></div><div class="map-big" id="bigMap" role="region" aria-label="Mapa interactivo"></div></div>' +
      '<p class="note" style="margin-top:14px">' + icon('info') + '<span>Mapa con Leaflet y OpenStreetMap. Las coordenadas son demostrativas; en la versión final se registrarán desde el panel administrativo.</span></p>' +
      '</div></section>';
  };

  function filteredMapOrgs() {
    const f = document.querySelector('[data-form="map-filters"]');
    const dep = f ? f.dep.value : '';
    const tipo = f ? f.tipo.value : '';
    return db().organizations.filter(function (o) {
      return (!dep || o.department === dep) && (!tipo || o.type === tipo) && isFinite(o.lat) && isFinite(o.lng);
    });
  }

  function popupHtml(o) {
    return '<div class="pop"><img src="' + firstImg(o.images) + '" alt=""><b>' + esc(o.acronym) + '</b><span>' + esc(o.type) + ' · ' + esc(orgPlace(o)) + '<br>' + esc(o.rubros.join(', ')) + '</span><a href="#/asociacion/' + encodeURIComponent(o.id) + '">Ver perfil →</a></div>';
  }

  function markerIcon(o) {
    return L.divIcon({ className: '', html: '<div class="fp-marker' + (o.type === 'Emprendimiento' ? ' emp' : '') + '"><span>' + esc(initials(o).slice(0, 2)) + '</span></div>', iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -32] });
  }

  function newMap(el, opts) {
    if (!window.L) {
      el.innerHTML = '<div class="map-fallback"><div>' + icon('map') + '<p>No se pudo cargar el mapa (sin conexión a Leaflet/OpenStreetMap).</p></div></div>';
      return null;
    }
    const m = L.map(el, Object.assign({ scrollWheelZoom: false }, opts || {}));
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(m);
    maps.push(m);
    return m;
  }

  function mountBigMap() {
    const el = document.getElementById('bigMap');
    if (!el) return;
    const m = newMap(el);
    const listEl = document.getElementById('mapList');
    let layer = null;
    const markers = {};
    function draw() {
      const list = filteredMapOrgs();
      listEl.innerHTML = list.length ? list.map(function (o) {
        return '<button type="button" class="map-item" data-map-id="' + esc(o.id) + '"><img src="' + firstImg(o.images) + '" alt=""><span><b>' + esc(o.acronym) + '</b><span>' + esc(orgPlace(o)) + '</span></span></button>';
      }).join('') : emptyHtml('Sin resultados', 'No hay organizaciones con esos filtros.');
      if (!m) return;
      if (layer) layer.remove();
      layer = L.featureGroup();
      list.forEach(function (o) {
        markers[o.id] = L.marker([o.lat, o.lng], { icon: markerIcon(o), title: o.acronym, alt: o.acronym }).bindPopup(popupHtml(o)).addTo(layer);
      });
      layer.addTo(m);
      if (list.length) m.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: 9 });
      else m.setView([-11, -66.3], 7);
    }
    draw();
    listEl.addEventListener('click', function (e) {
      const b = e.target.closest('[data-map-id]');
      if (!b || !m) return;
      const o = org(b.getAttribute('data-map-id'));
      listEl.querySelectorAll('.map-item').forEach(function (x) { x.classList.toggle('active', x === b); });
      m.flyTo([o.lat, o.lng], 10, { duration: .6 });
      setTimeout(function () { markers[o.id] && markers[o.id].openPopup(); }, 650);
      if (window.innerWidth < 900) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    document.querySelector('[data-form="map-filters"]').addEventListener('change', function (e) {
      const params = parseHash().params;
      ['dep', 'tipo'].forEach(function (k) { const v = e.currentTarget[k].value; if (v) params.set(k, v); else params.delete(k); });
      replaceParams(params);
      draw();
    });
  }

  function mountMiniMap() {
    const el = document.getElementById('miniMap');
    if (!el) return;
    const lat = +el.dataset.lat;
    const lng = +el.dataset.lng;
    const m = newMap(el, { zoomControl: true });
    if (!m) return;
    m.setView([lat, lng], 9);
    const o = org(parseHash().path[1]);
    L.marker([lat, lng], { icon: markerIcon(o), alt: el.dataset.title }).addTo(m).bindPopup('<b>' + esc(el.dataset.title) + '</b><br>Ubicación demostrativa');
  }

  /* ---------- noticias ---------- */
  views.noticias = function (_, params) {
    const t = params.get('tipo') || '';
    const upcoming = db().posts.filter(function (p) { return p.type !== 'noticia' && p.date >= today(); }).sort(function (a, b) { return a.date.localeCompare(b.date); }).slice(0, 4);
    return pageHero('Noticias, eventos y ferias', 'Novedades institucionales, actividades, ferias y oportunidades comerciales del sector agroforestal amazónico.', [['Noticias']], 'assets/images/feria-mercado.jpg') +
      '<section class="section" style="padding-top:36px"><div class="wrap">' +
      '<div class="tabs" role="group" aria-label="Filtrar por tipo de publicación">' +
      [['', 'Todas'], ['noticia', 'Noticias'], ['evento', 'Eventos'], ['feria', 'Ferias'], ['oportunidad', 'Oportunidades comerciales']].map(function (x) {
        return '<button type="button" class="tab" data-tab="' + x[0] + '" aria-pressed="' + (t === x[0]) + '">' + x[1] + '</button>';
      }).join('') + '</div>' +
      '<div id="results"></div>' +
      '<div class="panel-box" style="margin-top:40px"><h3>' + icon('calendar') + ' Próximos eventos y ferias</h3>' +
      (upcoming.length ? '<ul class="contact-list">' + upcoming.map(function (p) {
        return '<li>' + icon('chevron-right') + '<span><b>' + esc(fmtDate(p.date, true)) + '</b> — <a href="#/noticia/' + encodeURIComponent(p.id) + '">' + esc(p.title) + '</a> <span style="color:var(--muted)">(' + esc(p.place) + ')</span></span></li>';
      }).join('') + '</ul>' : '<p style="color:var(--muted);margin:0">No hay eventos próximos publicados.</p>') + '</div>' +
      '</div></section>';
  };

  function renderNews(params) {
    const t = params.get('tipo') || '';
    const list = db().posts.filter(function (p) { return !t || p.type === t; }).sort(function (a, b) { return b.date.localeCompare(a.date); });
    const pg = paginate(list, +params.get('p') || 1, 6);
    return list.length ? '<div class="grid g-3">' + pg.items.map(postCard).join('') + '</div>' + pagerHtml(pg)
      : emptyHtml('Sin publicaciones', 'Todavía no hay publicaciones de este tipo.');
  }

  views.noticia = function (id) {
    const p = db().posts.find(function (x) { return x.id === id; });
    if (!p) return notFound('La publicación solicitada no existe o fue eliminada.');
    const others = db().posts.filter(function (x) { return x.id !== p.id; }).slice(0, 3);
    return pageHero(p.title, '', [['Noticias', '#/noticias'], [POST_TYPES[p.type] || 'Publicación']], p.image) +
      '<section class="section" style="padding-top:36px"><div class="wrap" style="max-width:860px">' +
      '<div class="chips" style="margin-bottom:14px"><span class="badge">' + esc(POST_TYPES[p.type] || p.type) + '</span><span class="badge demo">Contenido demostrativo</span></div>' +
      '<p class="meta" style="color:var(--muted);display:flex;gap:14px;flex-wrap:wrap">' + icon('calendar') + esc(fmtDate(p.date, true)) + ' ' + icon('map-pin') + esc(p.place) + '</p>' +
      '<img src="' + asset(p.image) + '" alt="" style="border-radius:var(--radius);width:100%;aspect-ratio:16/9;object-fit:cover;margin:10px 0 24px">' +
      '<p style="font-size:19px;font-weight:600;color:var(--verde-900)">' + esc(p.summary) + '</p>' +
      esc(p.body).split(/\n+/).map(function (par) { return '<p>' + par + '</p>'; }).join('') +
      '<div class="cta-box" style="grid-template-columns:1fr;max-width:520px"><p>¿Quiere participar o más información?</p><div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn-primary" href="#/contacto?asunto=' + encodeURIComponent(p.title) + '">' + icon('mail') + 'Escribir a FEDAPABENI</a><a class="btn btn-wa" data-wa="general" href="#" target="_blank" rel="noopener">' + icon('whatsapp') + 'WhatsApp</a></div></div>' +
      '</div><div class="wrap"><div class="section-head" style="margin-top:56px"><h2>Otras publicaciones</h2><a class="link-more" href="#/noticias">Ver todas ' + icon('arrow-right') + '</a></div><div class="grid g-3">' + others.map(postCard).join('') + '</div></div></section>';
  };

  /* ---------- galería ---------- */
  views.galeria = function (_, params) {
    const t = params.get('tipo') || '';
    return pageHero('Galería multimedia', 'Fotografías y videos de los territorios, productos y actividades.', [['Galería']], 'assets/images/laguna.jpg') +
      '<section class="section" style="padding-top:36px"><div class="wrap">' +
      '<div class="tabs" role="group" aria-label="Tipo de contenido">' +
      [['', 'Todo'], ['foto', 'Fotografías'], ['video', 'Videos']].map(function (x) { return '<button type="button" class="tab" data-tab="' + x[0] + '" aria-pressed="' + (t === x[0]) + '">' + x[1] + '</button>'; }).join('') +
      '</div><div id="results"></div>' +
      '<p class="note" style="margin-top:20px">' + icon('info') + '<span>Imágenes y videos de Wikimedia Commons con licencias libres, usados solo como recursos de demostración (ver <a href="#/creditos">créditos</a>). No corresponden a FEDAPABENI ni a sus asociaciones.</span></p>' +
      '</div></section>';
  };

  function renderGallery(params) {
    const t = params.get('tipo') || '';
    const g = db().gallery;
    const photos = g.filter(function (x) { return x.type === 'foto'; });
    const videos = g.filter(function (x) { return x.type === 'video'; });
    let h = '';
    if (t !== 'video') {
      h += photos.length ? '<div class="masonry">' + photos.map(function (x, i) {
        return '<button type="button" class="tile" data-lb-open="' + i + '"><img src="' + asset(x.src) + '" alt="' + esc(x.title) + '" loading="lazy"><span class="cap">' + esc(x.title) + '</span></button>';
      }).join('') + '</div>' : emptyHtml('Sin fotografías', 'Agregue fotografías desde el panel administrativo.');
    }
    if (t !== 'foto') {
      h += '<h2 style="margin:36px 0 16px;font-size:26px">' + icon('video') + ' Videos</h2>';
      h += videos.length ? '<div class="grid g-2">' + videos.map(function (v) {
        return '<div class="video-card"><video controls preload="none" playsinline poster="' + asset(v.poster) + '"><source src="' + asset(v.src) + '" type="video/webm">Su navegador no reproduce video WebM.</video><div class="cap">' + esc(v.title) + '</div></div>';
      }).join('') + '</div>' : emptyHtml('Sin videos', 'Agregue videos desde el panel administrativo.');
    }
    return h;
  }

  /* ---------- contacto ---------- */
  views.contacto = function (_, params) {
    const s = db().settings;
    const pend = '<span class="pending">Pendiente de confirmación</span>';
    return pageHero('Contacto y oportunidades comerciales', 'Escríbanos para información general, solicitudes de compra o alianzas.', [['Contacto']], 'assets/images/guayaramerin-puerto.jpg') +
      '<section class="section" style="padding-top:36px"><div class="wrap"><div class="detail">' +
      '<div class="panel-box" id="formHost">' + inquiryForm({ tipo: params.get('tipo') === 'compra' ? 'compra' : 'info', org: params.get('org'), product: params.get('producto'), asunto: params.get('asunto') }) + '</div>' +
      '<aside class="sticky"><div class="panel-box"><h3>Canales de contacto</h3><ul class="contact-list">' +
      '<li>' + icon('whatsapp') + '<span>' + (s.whatsapp ? '+' + esc(s.whatsapp) : pend) + '</span></li>' +
      '<li>' + icon('phone') + '<span>' + (s.phone ? esc(s.phone) : pend) + '</span></li>' +
      '<li>' + icon('mail') + '<span>' + (s.email ? '<a href="mailto:' + esc(s.email) + '">' + esc(s.email) + '</a>' : pend) + '</span></li>' +
      '<li>' + icon('map-pin') + '<span>' + esc(s.address) + '</span></li>' +
      '</ul><a class="btn btn-wa btn-block" data-wa="general" href="#" target="_blank" rel="noopener" style="margin-top:18px">' + icon('whatsapp') + 'Escribir por WhatsApp</a>' +
      '<p class="note" style="margin-top:14px">' + icon('info') + '<span>Los mensajes de esta demostración se guardan solo en este navegador y pueden revisarse en el <a href="admin/index.html#consultas">panel administrativo</a>. En la versión final se enviarán por correo y quedarán registrados en el servidor.</span></p>' +
      '</div></aside></div></div></section>';
  };

  function inquiryForm(o) {
    const d = db();
    const isBuy = o.tipo === 'compra';
    return '<div class="seg" role="group" aria-label="Tipo de formulario" style="margin-bottom:18px"><button type="button" data-ftype="info" aria-pressed="' + !isBuy + '">Contacto general</button><button type="button" data-ftype="compra" aria-pressed="' + isBuy + '">Solicitud de compra / información comercial</button></div>' +
      '<h2 style="font-size:24px">' + (isBuy ? 'Solicitud de compra o cotización' : 'Envíenos un mensaje') + '</h2>' +
      '<p style="color:var(--muted)">' + (isBuy ? 'Indique el producto y el volumen requerido; FEDAPABENI canalizará su solicitud a la organización productora.' : 'Responderemos su consulta a la brevedad.') + ' Los campos con <span style="color:var(--danger)">*</span> son obligatorios.</p>' +
      '<form class="form" novalidate data-form="inquiry" data-type="' + (isBuy ? 'compra' : 'info') + '">' +
      '<div class="row">' + fld('name', 'Nombre completo', true, '<input class="input" id="i-name" name="name" autocomplete="name" maxlength="80">') +
      fld('company', 'Empresa / institución', false, '<input class="input" id="i-company" name="company" autocomplete="organization" maxlength="80">') + '</div>' +
      '<div class="row">' + fld('email', 'Correo electrónico', true, '<input class="input" id="i-email" name="email" type="email" autocomplete="email" maxlength="100">') +
      fld('phone', 'Teléfono / WhatsApp', false, '<input class="input" id="i-phone" name="phone" type="tel" autocomplete="tel" placeholder="+591 …" maxlength="20">', 'Opcional. Solo números, espacios o “+”.') + '</div>' +
      (isBuy ?
        '<div class="row">' + fld('product', 'Producto de interés', true, '<select class="select" id="i-product" name="product"><option value="">Seleccione…</option>' + d.products.map(function (p) { return '<option value="' + esc(p.id) + '"' + (o.product === p.id ? ' selected' : '') + '>' + esc(p.name) + ' — ' + esc(orgName(org(p.orgId))) + '</option>'; }).join('') + '<option value="otro">Otro / varios productos</option></select>') +
        fld('qty', 'Volumen estimado', true, '<input class="input" id="i-qty" name="qty" placeholder="Ej.: 200 kg al mes" maxlength="60">') + '</div>' +
        fld('org', 'Organización preferida', false, '<select class="select" id="i-org" name="org"><option value="">Cualquiera / que FEDAPABENI sugiera</option>' + d.organizations.map(function (x) { return '<option value="' + esc(x.id) + '"' + (o.org === x.id ? ' selected' : '') + '>' + esc(x.acronym) + '</option>'; }).join('') + '</select>')
        : fld('subject', 'Asunto', true, '<input class="input" id="i-subject" name="subject" maxlength="100" value="' + esc(o.asunto || '') + '">')) +
      fld('message', 'Mensaje', true, '<textarea class="input" id="i-message" name="message" rows="5" maxlength="1500" placeholder="' + (isBuy ? 'Destino, plazos, presentación requerida, frecuencia…' : 'Escriba su consulta…') + '"></textarea>', 'Mínimo 15 caracteres.') +
      '<div class="fld" data-f="consent"><label class="check"><input type="checkbox" name="consent" id="i-consent"> <span>Acepto que FEDAPABENI use estos datos únicamente para responder mi solicitud. <span class="req">*</span></span></label><div class="err" id="e-consent"></div></div>' +
      '<button class="btn btn-primary" type="submit">' + icon('send') + (isBuy ? 'Enviar solicitud' : 'Enviar mensaje') + '</button>' +
      '</form>';
  }

  function fld(name, label, req, control, help) {
    return '<div class="fld" data-f="' + name + '"><label for="i-' + name + '">' + esc(label) + (req ? ' <span class="req">*</span>' : '') + '</label>' + control +
      (help ? '<div class="help">' + esc(help) + '</div>' : '') + '<div class="err" id="e-' + name + '"></div></div>';
  }

  function validateInquiry(form) {
    const isBuy = form.dataset.type === 'compra';
    const v = function (n) { return form[n] ? String(form[n].value || '').trim() : ''; };
    const errs = {};
    if (v('name').length < 3) errs.name = 'Ingrese su nombre (mínimo 3 caracteres).';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email'))) errs.email = 'Ingrese un correo electrónico válido.';
    if (v('phone') && !/^\+?[\d\s-]{7,18}$/.test(v('phone'))) errs.phone = 'El teléfono solo puede contener números, espacios, guiones y “+” (7 a 15 dígitos).';
    if (isBuy) {
      if (!v('product')) errs.product = 'Seleccione un producto.';
      if (v('qty').length < 2) errs.qty = 'Indique el volumen estimado.';
    } else if (v('subject').length < 3) errs.subject = 'Indique el asunto.';
    if (v('message').length < 15) errs.message = 'El mensaje debe tener al menos 15 caracteres.';
    if (!form.consent.checked) errs.consent = 'Debe aceptar el uso de sus datos para continuar.';
    form.querySelectorAll('.fld').forEach(function (f) {
      const k = f.dataset.f;
      const msg = errs[k];
      f.classList.toggle('invalid', !!msg);
      const e = f.querySelector('.err');
      if (e) e.textContent = msg || '';
      const ctl = f.querySelector('input,select,textarea');
      if (ctl) { if (msg) { ctl.setAttribute('aria-invalid', 'true'); ctl.setAttribute('aria-describedby', 'e-' + k); } else ctl.removeAttribute('aria-invalid'); }
    });
    return errs;
  }

  function submitInquiry(form) {
    const errs = validateInquiry(form);
    const keys = Object.keys(errs);
    if (keys.length) {
      const first = form.querySelector('[data-f="' + keys[0] + '"] input, [data-f="' + keys[0] + '"] select, [data-f="' + keys[0] + '"] textarea');
      if (first) first.focus();
      toast('Revise los campos marcados.', 'error');
      return;
    }
    const v = function (n) { return form[n] ? String(form[n].value || '').trim() : ''; };
    const isBuy = form.dataset.type === 'compra';
    const p = isBuy && v('product') !== 'otro' ? db().products.find(function (x) { return x.id === v('product'); }) : null;
    const item = {
      id: 'c' + Date.now().toString(36),
      type: isBuy ? 'compra' : 'info',
      date: new Date().toISOString(),
      status: 'nueva',
      name: v('name'), company: v('company'), email: v('email'), phone: v('phone'),
      subject: isBuy ? 'Solicitud de compra: ' + (p ? p.name : 'varios productos') : v('subject'),
      product: p ? p.name : (isBuy ? 'Otro / varios' : ''),
      qty: v('qty'),
      org: v('org') ? orgName(org(v('org'))) : (p ? orgName(org(p.orgId)) : ''),
      message: v('message'),
    };
    db().inquiries.unshift(item);
    const ok = window.Store.save();
    const host = form.closest('#formHost') || form.parentElement;
    host.innerHTML = '<div class="success-box">' + icon('check-circle') + '<h2 style="font-size:26px">¡Gracias, ' + esc(item.name.split(' ')[0]) + '!</h2>' +
      '<p>Su ' + (isBuy ? 'solicitud de compra' : 'mensaje') + ' fue registrado' + (ok ? '' : ' (no se pudo guardar en el almacenamiento local de este navegador)') + '.</p>' +
      '<p class="note" style="text-align:left">' + icon('info') + '<span><b>Demostración:</b> no se envió ningún correo. El registro se guardó en este navegador y puede verse en el panel administrativo, sección “Consultas”.</span></p>' +
      '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:16px"><a class="btn btn-primary" href="admin/index.html#consultas">' + icon('inbox') + 'Ver en el panel</a><button type="button" class="btn btn-outline" data-action="new-inquiry">Enviar otro</button></div></div>';
    hydrateIcons(host);
    toast(isBuy ? 'Solicitud registrada (demostración).' : 'Mensaje registrado (demostración).');
  }

  /* ---------- búsqueda global ---------- */
  views.buscar = function (_, params) {
    const q = params.get('q') || '';
    const nq = norm(q);
    const prods = db().products.filter(function (p) { const o = org(p.orgId); return norm([p.name, p.description, o && o.acronym].join(' ')).indexOf(nq) >= 0; });
    const orgs = db().organizations.filter(function (o) { return norm([o.acronym, o.summary, o.municipality, o.rubros.join(' ')].join(' ')).indexOf(nq) >= 0; });
    return pageHero('Resultados de búsqueda', q ? 'Búsqueda: “' + q + '”' : 'Ingrese un término para buscar.', [['Búsqueda']]) +
      '<section class="section" style="padding-top:36px"><div class="wrap">' +
      '<form class="searchbox" role="search" data-form="hero-search" style="max-width:none;box-shadow:var(--shadow);margin:0 0 30px"><select class="select" name="scope" aria-label="Buscar en"><option value="todo">Todo</option><option value="productos">Productos</option><option value="asociaciones">Asociaciones</option></select><input class="input" name="q" type="search" aria-label="Término de búsqueda" value="' + esc(q) + '"><button class="btn btn-gold" type="submit">' + icon('search') + 'Buscar</button></form>' +
      '<h2 style="font-size:24px">Productos (' + prods.length + ')</h2>' +
      (prods.length ? '<div class="grid g-4">' + prods.slice(0, 8).map(productCard).join('') + '</div>' + (prods.length > 8 ? '<p><a class="link-more" href="#/catalogo?q=' + encodeURIComponent(q) + '">Ver los ' + prods.length + ' productos ' + icon('arrow-right') + '</a></p>' : '') : emptyHtml('Sin productos', 'Ningún producto coincide con “' + q + '”.')) +
      '<h2 style="font-size:24px;margin-top:40px">Asociaciones y emprendimientos (' + orgs.length + ')</h2>' +
      (orgs.length ? '<div class="grid g-3">' + orgs.map(orgCard).join('') + '</div>' : emptyHtml('Sin organizaciones', 'Ninguna organización coincide con “' + q + '”.')) +
      '</div></section>';
  };

  views.creditos = function () {
    return pageHero('Créditos de imágenes y videos', 'Recursos de demostración con licencias libres (Wikimedia Commons).', [['Créditos']]) +
      '<section class="section" style="padding-top:36px"><div class="wrap"><div class="panel-box">' +
      '<p>Las fotografías y videos del prototipo provienen de Wikimedia Commons y se usan con fines demostrativos según sus licencias. No representan a FEDAPABENI, sus asociaciones ni sus productos. En la versión final se reemplazarán por material propio proporcionado por FEDAPABENI.</p>' +
      '<ul class="credits-list">' + window.FEDA_CREDITS.map(function (c) {
        return '<li><b>' + esc(c.file) + '</b> — ' + esc(c.author) + ' · ' + esc(c.license) + ' · <a href="' + esc(c.url) + '" target="_blank" rel="noopener">fuente</a></li>';
      }).join('') + '</ul>' +
      '<p style="margin-top:16px">Mapas: © colaboradores de <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>, mostrados con <a href="https://leafletjs.com/" target="_blank" rel="noopener">Leaflet</a>.</p>' +
      '</div></div></section>';
  };

  function notFound(msg) {
    return pageHero('Página no encontrada', msg || 'La dirección no corresponde a ninguna sección.', [['No encontrado']]) +
      '<section class="section"><div class="wrap">' + emptyHtml('No encontramos lo que busca', msg || 'Verifique el enlace o vuelva al inicio.', '<a class="btn btn-primary" href="#/">Volver al inicio</a>') + '</div></section>';
  }

  /* ================= enrutador ================= */
  const TITLES = { '': 'Inicio', nosotros: 'Quiénes somos', directorio: 'Directorio', asociacion: 'Perfil de organización', catalogo: 'Catálogo', producto: 'Producto', mapa: 'Mapa', noticias: 'Noticias y ferias', noticia: 'Publicación', galeria: 'Galería', contacto: 'Contacto', buscar: 'Búsqueda', creditos: 'Créditos' };
  const ROUTES = { '': 'home' };

  function render() {
    maps.forEach(function (m) { m.remove(); });
    maps = [];
    const r = parseHash();
    const name = r.path[0] || '';
    const fn = views[ROUTES[name] || name];
    main.innerHTML = '<div class="view">' + (fn ? fn(r.path[1], r.params) : notFound()) + '</div>';
    hydrateIcons(main);
    paintResults();
    mountBigMap();
    mountMiniMap();
    setNav(name);
    let t = TITLES[name] || 'FEDAPABENI';
    if (name === 'asociacion') { const o = org(r.path[1]); if (o) t = o.acronym; }
    if (name === 'producto') { const p = db().products.find(function (x) { return x.id === r.path[1]; }); if (p) t = p.name; }
    if (name === 'noticia') { const p = db().posts.find(function (x) { return x.id === r.path[1]; }); if (p) t = p.title; }
    document.title = t + ' · FEDAPABENI (prototipo)';
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }

  /** Repinta solo la lista de resultados de la vista actual (mantiene el foco en los filtros). */
  function paintResults() {
    const host = document.getElementById('results');
    if (!host) return;
    const r = parseHash();
    const name = r.path[0];
    const fn = { directorio: renderDirectory, catalogo: renderCatalog, noticias: renderNews, galeria: renderGallery }[name];
    if (!fn) return;
    host.innerHTML = fn(r.params);
    hydrateIcons(host);
  }

  function setNav(name) {
    const map = { asociacion: 'directorio', producto: 'catalogo', noticia: 'noticias' };
    const cur = map[name] || name;
    const html = NAV.map(function (n) {
      return '<a class="nav-link' + (n[0] === cur ? ' active' : '') + '" href="#/' + n[0] + '"' + (n[0] === cur ? ' aria-current="page"' : '') + '>' + icon(n[2]) + '<span>' + n[1] + '</span></a>';
    }).join('');
    document.getElementById('mainNav').innerHTML = NAV.map(function (n) {
      return '<a class="nav-link' + (n[0] === cur ? ' active' : '') + '" href="#/' + n[0] + '"' + (n[0] === cur ? ' aria-current="page"' : '') + '>' + n[1] + '</a>';
    }).join('');
    document.getElementById('drawerNav').innerHTML = html;
  }

  /* ================= eventos ================= */
  let filterTimer = null;
  document.addEventListener('input', function (e) {
    const f = e.target.closest('[data-form="filters"]');
    if (!f) return;
    clearTimeout(filterTimer);
    filterTimer = setTimeout(function () { applyFilters(f); }, e.target.type === 'search' ? 220 : 0);
  });
  document.addEventListener('change', function (e) {
    const f = e.target.closest('[data-form="filters"]');
    if (f && e.target.tagName === 'SELECT') applyFilters(f);
  });

  function applyFilters(f) {
    const params = new URLSearchParams();
    Array.from(f.elements).forEach(function (el) { if (el.name && el.value) params.set(el.name, el.value); });
    replaceParams(params);
    paintResults();
  }

  document.addEventListener('submit', function (e) {
    const f = e.target;
    if (f.matches('[data-form="filters"]')) { e.preventDefault(); applyFilters(f); return; }
    if (f.matches('[data-form="hero-search"]')) {
      e.preventDefault();
      const q = f.q.value.trim();
      const scope = f.scope.value;
      const dest = scope === 'productos' ? 'catalogo' : scope === 'asociaciones' ? 'directorio' : 'buscar';
      closeModal();
      location.hash = '#/' + dest + (q ? '?q=' + encodeURIComponent(q) : '');
      return;
    }
    if (f.matches('[data-form="inquiry"]')) { e.preventDefault(); submitInquiry(f); }
  });

  document.addEventListener('click', function (e) {
    const t = e.target;
    const pageBtn = t.closest('.pagination [data-page]');
    if (pageBtn) {
      const params = parseHash().params;
      params.set('p', pageBtn.dataset.page);
      replaceParams(params);
      paintResults();
      const host = document.getElementById('results');
      if (host) window.scrollTo({ top: host.getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' });
      return;
    }
    const tab = t.closest('[data-tab]');
    if (tab) {
      const params = new URLSearchParams();
      if (tab.dataset.tab) params.set('tipo', tab.dataset.tab);
      replaceParams(params);
      tab.parentElement.querySelectorAll('[data-tab]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === tab)); });
      paintResults();
      return;
    }
    const thumb = t.closest('[data-thumb]');
    if (thumb) {
      const gm = document.querySelector('.gallery-main');
      const imgs = JSON.parse(gm.dataset.gallery);
      const i = +thumb.dataset.thumb;
      gm.dataset.index = i;
      document.getElementById('gMain').src = asset(imgs[i]);
      thumb.parentElement.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-current', String(b === thumb)); });
      return;
    }
    const gm = t.closest('.gallery-main');
    if (gm) {
      const imgs = JSON.parse(gm.dataset.gallery);
      openLightbox(imgs.map(function (s, i) { return { src: s, title: gm.dataset.title }; }), +gm.dataset.index || 0);
      return;
    }
    const lbOpen = t.closest('[data-lb-open]');
    if (lbOpen) {
      const photos = db().gallery.filter(function (x) { return x.type === 'foto'; });
      openLightbox(photos, +lbOpen.dataset.lbOpen);
      return;
    }
    const lb = t.closest('[data-lb]');
    if (lb) { const a = lb.dataset.lb; if (a === 'close') closeLightbox(); else stepLightbox(a === 'next' ? 1 : -1); return; }
    if (t.id === 'lightbox') { closeLightbox(); return; }

    const act = t.closest('[data-action]');
    if (!act) return;
    const a = act.dataset.action;
    if (a === 'open-menu') toggleMenu(true);
    else if (a === 'close-menu') toggleMenu(false);
    else if (a === 'close-modal') closeModal();
    else if (a === 'open-search') openSearch();
    else if (a === 'clear-filters') {
      replaceParams(new URLSearchParams());
      const f = document.querySelector('[data-form="filters"]');
      if (f) Array.from(f.elements).forEach(function (el) { if (el.name) el.value = ''; });
      paintResults();
    } else if (a === 'quote') {
      const p = db().products.find(function (x) { return x.id === act.dataset.id; });
      openModal('<div id="formHost">' + inquiryForm({ tipo: 'compra', product: p.id, org: p.orgId }) + '</div>');
    } else if (a === 'new-inquiry') {
      const host = act.closest('#formHost');
      host.innerHTML = inquiryForm({ tipo: 'info' });
      hydrateIcons(host);
    }
  });

  // Cambio entre formulario general y de compra
  document.addEventListener('click', function (e) {
    const b = e.target.closest('[data-ftype]');
    if (!b) return;
    const host = b.closest('#formHost');
    const params = parseHash().params;
    host.innerHTML = inquiryForm({ tipo: b.dataset.ftype, org: params.get('org'), product: params.get('producto') });
    hydrateIcons(host);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('gallery-main')) e.target.click();
    if (document.getElementById('lightbox').classList.contains('open')) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') stepLightbox(1);
      if (e.key === 'ArrowLeft') stepLightbox(-1);
      return;
    }
    if (e.key === 'Escape') { closeModal(); toggleMenu(false); }
  });

  function toggleMenu(open) {
    const d = document.getElementById('drawer');
    d.classList.toggle('open', open);
    d.setAttribute('aria-hidden', String(!open));
    document.querySelector('[data-action="open-menu"]').setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) d.querySelector('.panel a, .panel button').focus();
  }
  document.getElementById('drawer').addEventListener('click', function (e) { if (e.target.closest('a[href^="#/"]')) toggleMenu(false); });

  function openModal(html) {
    lastFocus = document.activeElement;
    const m = document.getElementById('modal');
    const body = document.getElementById('modalBody');
    body.innerHTML = html;
    hydrateIcons(body);
    m.classList.add('open');
    document.body.style.overflow = 'hidden';
    const f = body.querySelector('input,select,textarea,button');
    if (f) f.focus();
  }
  function closeModal() {
    const m = document.getElementById('modal');
    if (!m.classList.contains('open')) return;
    m.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  function openSearch() {
    openModal('<h2 id="modalTitle">Buscar en la plataforma</h2><form class="form" data-form="hero-search" role="search">' +
      '<div><label for="mScope">Buscar en</label><select class="select" id="mScope" name="scope"><option value="todo">Todo</option><option value="productos">Productos</option><option value="asociaciones">Asociaciones</option></select></div>' +
      '<div><label for="mQ">Término</label><input class="input" id="mQ" name="q" type="search" placeholder="Ej.: cacao, majo, Guayaramerín…"></div>' +
      '<div id="liveRes"></div><button class="btn btn-primary" type="submit">' + icon('search') + 'Buscar</button></form>');
    const input = document.getElementById('mQ');
    input.focus();
    input.addEventListener('input', function () {
      const q = norm(input.value.trim());
      const out = document.getElementById('liveRes');
      if (q.length < 2) { out.innerHTML = ''; return; }
      const ps = db().products.filter(function (p) { return norm(p.name).indexOf(q) >= 0; }).slice(0, 4);
      const os = db().organizations.filter(function (o) { return norm(o.acronym + ' ' + o.municipality).indexOf(q) >= 0; }).slice(0, 3);
      out.innerHTML = (ps.length + os.length) ? '<ul class="contact-list">' +
        ps.map(function (p) { return '<li>' + icon('package') + '<a href="#/producto/' + encodeURIComponent(p.id) + '" data-action="close-modal">' + esc(p.name) + '</a></li>'; }).join('') +
        os.map(function (o) { return '<li>' + icon('users') + '<a href="#/asociacion/' + encodeURIComponent(o.id) + '" data-action="close-modal">' + esc(o.acronym) + ' — ' + esc(o.municipality) + '</a></li>'; }).join('') + '</ul>'
        : '<p style="color:var(--muted);margin:0">Sin coincidencias rápidas. Presione “Buscar” para ver todos los resultados.</p>';
    });
  }

  /* ---------- lightbox ---------- */
  function openLightbox(items, i) {
    lastFocus = document.activeElement;
    lbItems = items;
    lbIndex = i || 0;
    paintLightbox();
    document.getElementById('lightbox').classList.add('open');
    document.body.style.overflow = 'hidden';
    document.querySelector('.lb-close').focus();
  }
  function paintLightbox() {
    const it = lbItems[lbIndex];
    const img = document.getElementById('lbImg');
    img.src = asset(it.src);
    img.alt = it.title || '';
    document.getElementById('lbCap').textContent = (it.title || '') + '  ·  ' + (lbIndex + 1) + ' / ' + lbItems.length;
    const multi = lbItems.length > 1;
    document.querySelector('.lb-prev').style.display = multi ? '' : 'none';
    document.querySelector('.lb-next').style.display = multi ? '' : 'none';
  }
  function stepLightbox(d) { lbIndex = (lbIndex + d + lbItems.length) % lbItems.length; paintLightbox(); }
  function closeLightbox() {
    document.getElementById('lightbox').classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  /* ---------- ajustes globales ---------- */
  function applySettings() {
    const s = db().settings;
    document.querySelectorAll('[data-setting]').forEach(function (el) { const k = el.dataset.setting; if (s[k]) el.textContent = s[k]; });
    const pend = '<span style="opacity:.7">Pendiente de confirmación</span>';
    document.getElementById('footContact').innerHTML =
      '<li>' + icon('whatsapp') + ' ' + (s.whatsapp ? '<a data-wa="general" href="#" target="_blank" rel="noopener">+' + esc(s.whatsapp) + '</a>' : pend) + '</li>' +
      '<li>' + icon('mail') + ' ' + (s.email ? '<a href="mailto:' + esc(s.email) + '">' + esc(s.email) + '</a>' : pend) + '</li>' +
      '<li>' + icon('map-pin') + ' ' + esc(s.address) + '</li>' +
      (s.facebook ? '<li>' + icon('facebook') + ' <a href="' + esc(s.facebook) + '" target="_blank" rel="noopener">Facebook</a></li>' : '') +
      '<li><a href="#/contacto">' + icon('send') + ' Formulario de contacto</a></li>';
    document.getElementById('year').textContent = new Date().getFullYear();
  }

  window.addEventListener('hashchange', render);
  window.addEventListener('storage', function (e) { if (e.key === 'fedapabeni-prototipo-v1') location.reload(); });
  hydrateIcons(document);
  applySettings();
  render();
})();
