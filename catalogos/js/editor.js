/*
 * Editor visual de plantillas.
 *  - Panel izquierdo: plantilla, estilo global y estructura (secciones ordenables).
 *  - Panel central: vista previa real del catálogo en un iframe (escritorio, tablet, móvil).
 *  - Panel derecho: propiedades del elemento seleccionado.
 * Cada cambio se guarda al instante y la vista previa se actualiza en tiempo real.
 */
(function () {
  'use strict';
  const CA = window.CA, D = CA.dash;
  const u = CA.util, ui = CA.ui, esc = u.esc, I = ui.icon;
  const $ = ui.$, $$ = ui.$$;

  const ED = { sel: 'global', device: 'desktop', catId: null };
  const ELEMENTS = [
    ['header', 'Encabezado y menú', 'menu'],
    ['hero', 'Banner principal', 'image2'],
    ['categories', 'Categorías destacadas', 'tag'],
    ['featured', 'Productos destacados', 'star'],
    ['benefits', 'Beneficios', 'shield'],
    ['products', 'Productos y tarjetas', 'cards'],
    ['footer', 'Footer', 'layout']
  ];
  const PALETTES = [
    ['Azul tech', '#2563eb', '#0f172a', '#f4f6fb', '#0f172a'], ['Violeta', '#7c3aed', '#1e1033', '#f7f5ff', '#1a1033'], ['Esmeralda', '#059669', '#052e25', '#f3faf7', '#06281f'],
    ['Coral', '#f43f5e', '#3f0d1a', '#fff7f8', '#3a0d18'], ['Arena', '#111111', '#c8a27a', '#ffffff', '#111111'], ['Rosa', '#db2777', '#fdf2f8', '#fffafc', '#3b0a24'],
    ['Naranja', '#ea580c', '#1c1917', '#fffaf5', '#1c1917'], ['Petróleo', '#0f766e', '#f59e0b', '#f6f7f5', '#1c2a27']
  ];

  D.view('editor', { title: 'Editor de diseño', icon: 'palette', sub: 'Personaliza tu catálogo en tiempo real', fullscreen: true, render });

  const cat = () => CA.catalogs.get(D.db(), CA.session.userId(), ED.catId);
  const level = () => D.limits().customization; // none | basic | full
  const canBasic = () => level() !== 'none';
  const canFull = () => level() === 'full';

  /** Guarda un cambio del diseño y refresca la vista previa. */
  function setDesign(mut, opts) {
    ui.safe(() => CA.store.tx((db) => {
      const c = CA.catalogs.get(db, CA.session.userId(), ED.catId);
      mut(c.design, c);
      c.updatedAt = CA.now().toISOString();
    }));
    refreshPreview();
    flashSaved();
    if (opts && opts.rerender) renderPanels();
  }
  const setDesignDebounced = u.debounce((mut) => setDesign(mut), 160);

  function refreshPreview() {
    const f = $('#edFrame');
    if (f && f.contentWindow) f.contentWindow.postMessage({ type: 'ca:refresh' }, '*');
  }
  function flashSaved() {
    const s = $('#edSaved');
    if (!s) return;
    s.innerHTML = I('check') + 'Guardado';
    s.classList.remove('pulse'); void s.offsetWidth; s.classList.add('pulse');
  }

  function render(el, params) {
    const ws = D.ws();
    if (!ws.catalogs.length) {
      el.innerHTML = '<div class="view-in">' + D.emptyStep('palette', 'Primero crea un catálogo', 'El editor trabaja sobre un catálogo. Crea uno y elige su plantilla.', null) + '</div>';
      const e = el.querySelector('.empty'); e.insertAdjacentHTML('beforeend', '<button class="btn btn-primary" id="edNew">' + I('plus') + 'Crear catálogo</button>');
      $('#edNew').onclick = CA.createCatalog;
      document.body.classList.remove('editor-mode');
      return;
    }
    const id = params.get('id');
    ED.catId = ws.catalogs.some((c) => c.id === id) ? id : ws.catalogs[0].id;
    if (id !== ED.catId) history.replaceState(null, '', '#/editor?id=' + ED.catId);
    const c = cat();
    el.innerHTML = '<div class="ed">' +
      '<div class="ed-top"><a class="btn btn-sm btn-ghost" href="#/catalogos">' + I('left') + '<span class="hide-sm">Catálogos</span></a>' +
      '<select id="edCat" class="ed-cat">' + ws.catalogs.map((x) => '<option value="' + x.id + '"' + (x.id === c.id ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select>' +
      '<div class="ed-devices" role="group" aria-label="Dispositivo">' + [['desktop', 'monitor', 'Escritorio'], ['tablet', 'tablet', 'Tablet'], ['mobile', 'phone', 'Móvil']].map((d) => '<button class="' + (ED.device === d[0] ? 'on' : '') + '" data-dev="' + d[0] + '" title="' + d[2] + '">' + I(d[1]) + '</button>').join('') + '</div>' +
      '<span class="ed-saved" id="edSaved">' + I('check') + 'Guardado</span>' +
      '<div class="ed-top-r"><a class="btn btn-sm btn-ghost" href="' + D.previewUrl(c) + '" target="_blank" rel="noopener">' + I('external') + '<span class="hide-sm">Abrir</span></a>' +
      '<button class="btn btn-sm ' + (c.status === 'published' ? 'btn-ghost' : 'btn-ok') + '" id="edPub">' + (c.status === 'published' ? 'Despublicar' : I('rocket') + 'Publicar') + '</button></div></div>' +
      '<div class="ed-body"><aside class="ed-left" id="edLeft"></aside>' +
      '<div class="ed-center"><div class="ed-stage ed-' + ED.device + '" id="edStage"><div class="ed-frame-wrap"><iframe id="edFrame" title="Vista previa del catálogo" src="' + D.previewUrl(c, '&editor=1') + '"></iframe></div></div></div>' +
      '<aside class="ed-right" id="edRight"></aside></div></div>';
    $('#edCat').onchange = (e) => D.go('editor?id=' + e.target.value);
    $$('[data-dev]').forEach((b) => (b.onclick = () => { ED.device = b.dataset.dev; $$('[data-dev]').forEach((x) => x.classList.toggle('on', x === b)); $('#edStage').className = 'ed-stage ed-' + ED.device; setTimeout(fitFrame, 320); }));
    fitFrame();
    if (window.ResizeObserver) new ResizeObserver(fitFrame).observe($('#edStage'));
    $('#edPub').onclick = () => {
      const publish = cat().status !== 'published';
      const r = ui.safe(() => CA.store.tx((db) => CA.catalogs.setPublished(db, CA.session.userId(), ED.catId, publish)));
      if (!r) return;
      ui.toast(r.trialStarted ? '¡Publicado! Activaste 14 días del plan Profesional.' : publish ? 'Catálogo publicado' : 'Catálogo despublicado', 'success', 4500);
      D.render();
    };
    renderPanels();
  }

  /**
   * Escala el iframe para que el catálogo se vea con su ancho real
   * (escritorio 1280 px, tablet 820 px, móvil 390 px) dentro del panel central.
   */
  function fitFrame() {
    const wrap = $('.ed-frame-wrap'), f = $('#edFrame');
    if (!wrap || !f) return;
    const target = { desktop: 1280, tablet: 820, mobile: 390 }[ED.device];
    const w = wrap.clientWidth, h = wrap.clientHeight;
    const scale = Math.min(1, w / target);
    f.style.width = (scale < 1 ? target : w) + 'px';
    f.style.height = h / scale + 'px';
    f.style.transform = scale < 1 ? 'scale(' + scale + ')' : '';
  }

  /* ---------------- paneles ---------------- */
  function renderPanels() {
    renderLeft();
    renderRight();
  }

  function lockNote(text) { return '<div class="ed-lock">' + I('lock2') + '<span>' + esc(text) + ' <a href="#/suscripcion">Ver planes</a></span></div>'; }

  function renderLeft() {
    const c = cat(), d = c.design, limits = D.limits();
    const secOrder = d.sections.map((s) => s.id);
    const els = ELEMENTS.slice().sort((a, b) => {
      const ia = secOrder.indexOf(a[0]), ib = secOrder.indexOf(b[0]);
      const pa = a[0] === 'header' ? -1 : a[0] === 'footer' ? 99 : ia, pb = b[0] === 'header' ? -1 : b[0] === 'footer' ? 99 : ib;
      return pa - pb;
    });
    $('#edLeft').innerHTML =
      '<div class="ed-block"><h4>' + I('layout') + 'Plantilla</h4><div class="ed-tpls">' + CA.TEMPLATE_ORDER.map((id) => {
        const t = CA.TEMPLATES[id], ok = CA.plans.templateAllowed(limits, id);
        return '<button class="ed-tpl' + (d.template === id ? ' on' : '') + (ok ? '' : ' locked') + '" data-tpl="' + id + '" title="' + esc(t.description) + '"><span class="ed-tpl-sw" style="--p:' + t.defaults.colors.primary + ';--s:' + t.defaults.colors.secondary + '"><i></i><i></i><i></i></span><b>' + t.name + '</b><small>' + (ok ? esc(t.industry) : 'Plan superior') + '</small></button>';
      }).join('') + '</div></div>' +
      '<div class="ed-block"><h4>' + I('palette') + 'Estilo global</h4><button class="ed-el' + (ED.sel === 'global' ? ' on' : '') + '" data-sel="global">' + I('palette') + '<span>Colores, tipografía y botones</span>' + I('right') + '</button></div>' +
      '<div class="ed-block"><h4>' + I('list') + 'Estructura de la página</h4><p class="ed-hint">Activa, ordena y selecciona cada sección.</p>' +
      els.map((e) => {
        const sec = d.sections.find((s) => s.id === e[0]);
        const movable = !!sec;
        const idx = movable ? d.sections.indexOf(sec) : -1;
        return '<div class="ed-el-row' + (ED.sel === e[0] ? ' on' : '') + (sec && !sec.on ? ' off' : '') + '"><button class="ed-el" data-sel="' + e[0] + '">' + I(e[2]) + '<span>' + e[1] + '</span></button>' +
          (movable ? '<div class="ed-el-tools"><button data-up="' + idx + '" title="Subir"' + (idx === 0 || !canFull() ? ' disabled' : '') + '>' + I('up') + '</button><button data-down="' + idx + '" title="Bajar"' + (idx === d.sections.length - 1 || !canFull() ? ' disabled' : '') + '>' + I('down') + '</button>' +
            '<label class="ed-switch" title="' + (sec.on ? 'Ocultar' : 'Mostrar') + ' sección"><input type="checkbox" class="toggle" data-vis="' + e[0] + '"' + (sec.on ? ' checked' : '') + (canFull() ? '' : ' disabled') + '></label></div>' : '') + '</div>';
      }).join('') + (canFull() ? '' : lockNote('Ordenar y ocultar secciones requiere personalización completa (plan Profesional).')) + '</div>';
    $$('[data-sel]', $('#edLeft')).forEach((b) => (b.onclick = () => select(b.dataset.sel)));
    $$('[data-tpl]').forEach((b) => (b.onclick = () => changeTemplate(b.dataset.tpl)));
    $$('[data-up],[data-down]').forEach((b) => (b.onclick = () => {
      const i = Number(b.dataset.up != null ? b.dataset.up : b.dataset.down);
      const j = b.dataset.up != null ? i - 1 : i + 1;
      setDesign((dz) => { const s = dz.sections; [s[i], s[j]] = [s[j], s[i]]; }, { rerender: true });
    }));
    $$('[data-vis]').forEach((t) => (t.onchange = () => setDesign((dz) => { dz.sections.find((s) => s.id === t.dataset.vis).on = t.checked; }, { rerender: true })));
  }

  function select(id) {
    ED.sel = id;
    renderPanels();
    const f = $('#edFrame');
    if (f && f.contentWindow && id !== 'global') f.contentWindow.postMessage({ type: 'ca:highlight', section: id }, '*');
  }

  async function changeTemplate(id) {
    const c = cat();
    if (c.design.template === id) return;
    if (!CA.plans.templateAllowed(D.limits(), id)) { ui.toast('La plantilla ' + CA.TEMPLATES[id].name + ' requiere un plan superior.', 'warn'); return; }
    const ok = await ui.confirm({ title: 'Cambiar a ' + CA.TEMPLATES[id].name, message: 'Se aplicará la estructura y el estilo de la plantilla <b>' + CA.TEMPLATES[id].name + '</b> (colores, tipografía, tarjetas y botones). Conservas el logo, los textos, las secciones y los destacados.', confirmLabel: 'Cambiar plantilla' });
    if (!ok) return;
    const t = CA.TEMPLATES[id].defaults;
    setDesign((d) => {
      d.template = id;
      d.colors = u.clone(t.colors); d.font = t.font; d.columns = t.columns; d.card = u.clone(t.card); d.buttons = u.clone(t.buttons);
      d.banner.align = t.banner.align;
      if (d.banner.image && d.banner.image.startsWith('art:')) d.banner.image = t.banner.image;
    }, { rerender: true });
    ui.toast('Plantilla ' + CA.TEMPLATES[id].name + ' aplicada', 'success');
  }

  /* ---------------- propiedades ---------------- */
  function renderRight() {
    const c = cat(), d = c.design, ws = D.ws();
    const box = $('#edRight');
    const head = (t, sub) => '<div class="ed-props-h"><h3>' + t + '</h3>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>';
    const prods = (ws.products || []).filter((p) => p.sync !== 'error');
    let html = '';
    switch (ED.sel) {
      case 'global':
        html = head('Estilo global', 'Se aplica a todo el catálogo.') + (canBasic() ? '' : lockNote('Tu plan usa el estilo predeterminado de la plantilla.')) +
          '<div class="ed-sec"><label class="ed-lbl">Paletas sugeridas</label><div class="ed-pals">' + PALETTES.map((p, i) => '<button class="ed-pal" data-pal="' + i + '" title="' + p[0] + '"' + (canBasic() ? '' : ' disabled') + '><i style="background:' + p[1] + '"></i><i style="background:' + p[2] + '"></i><i style="background:' + p[3] + '"></i></button>').join('') + '</div></div>' +
          '<div class="ed-sec ed-colors">' + [['primary', 'Color principal'], ['secondary', 'Color secundario'], ['background', 'Fondo'], ['text', 'Texto']].map((k) => '<label class="ed-color"><input type="color" data-color="' + k[0] + '" value="' + d.colors[k[0]] + '"' + (canBasic() ? '' : ' disabled') + '><span>' + k[1] + '<small>' + d.colors[k[0]] + '</small></span></label>').join('') + '</div>' +
          '<div class="ed-sec"><label class="ed-lbl">Tipografía</label><div class="ed-fonts">' + Object.keys(CA.FONTS).map((k) => '<button class="ed-font' + (d.font === k ? ' on' : '') + '" data-font="' + k + '" style="font-family:' + CA.FONTS[k].heading + '"' + (canFull() ? '' : ' disabled') + '><b>Aa</b><span>' + CA.FONTS[k].label + '</span></button>').join('') + '</div>' + (canFull() ? '' : '<small class="ed-hint">Tipografías: plan Profesional.</small>') + '</div>' +
          '<div class="ed-sec"><label class="ed-lbl">Botones</label><div class="ed-seg">' + [['rounded', 'Redondeados'], ['pill', 'Píldora'], ['square', 'Rectos']].map((o) => '<button class="' + (d.buttons.shape === o[0] ? 'on' : '') + '" data-btn="' + o[0] + '"' + (canFull() ? '' : ' disabled') + '>' + o[1] + '</button>').join('') + '</div></div>';
        break;
      case 'header':
        html = head('Encabezado y menú', 'Logo, nombre del negocio y navegación.') +
          '<div class="ed-sec"><label class="ed-lbl">Logotipo</label><div class="ed-logo">' + (d.logo ? '<img src="' + d.logo + '" alt="Logo">' : '<span class="ed-logo-ph">' + esc(u.initials(d.businessName)) + '</span>') +
          '<div><input type="file" id="logoFile" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden><button class="btn btn-sm btn-ghost" id="logoUp">' + I('upload') + (d.logo ? 'Cambiar' : 'Subir logo') + '</button>' + (d.logo ? '<button class="btn btn-sm btn-danger-ghost" id="logoRm">Quitar</button>' : '') + '<small class="ed-hint">PNG, JPG, WEBP o SVG · máx. 2 MB</small></div></div></div>' +
          '<div class="ed-sec"><label class="ed-lbl" for="bizName">Nombre del negocio</label><input id="bizName" value="' + esc(d.businessName) + '" maxlength="40"></div>' +
          '<div class="ed-sec"><label class="ed-lbl">Menú de navegación</label>' + (canFull() ? '' : lockNote('Configurar el menú requiere personalización completa.')) + [['categories', 'Menú de categorías'], ['about', 'Nosotros'], ['contact', 'Contacto'], ['search', 'Buscador']].map((m) => '<label class="toggle-row"><span><b>' + m[1] + '</b></span><input type="checkbox" class="toggle" data-menu="' + m[0] + '"' + (d.menu[m[0]] ? ' checked' : '') + (canFull() ? '' : ' disabled') + '></label>').join('') + '</div>';
        break;
      case 'hero': {
        const imgs = [];
        prods.filter((p) => p.image).slice(0, 10).forEach((p) => imgs.push(p.image));
        (D.db().drive.find((f) => f.id === 'fd-tecno-banners') || { files: [] }).files.forEach((f) => imgs.push(f.art));
        html = head('Banner principal', 'Mensaje principal y portada del catálogo.') + (canBasic() ? '' : lockNote('Editar el banner requiere el plan Inicial o superior.')) +
          '<label class="toggle-row"><span><b>Mostrar banner</b></span><input type="checkbox" class="toggle" data-ban="show"' + (d.banner.show ? ' checked' : '') + (canBasic() ? '' : ' disabled') + '></label>' +
          '<div class="ed-sec"><label class="ed-lbl">Título</label><input data-bt="title" value="' + esc(d.banner.title) + '" maxlength="60"' + (canBasic() ? '' : ' disabled') + '></div>' +
          '<div class="ed-sec"><label class="ed-lbl">Subtítulo</label><textarea data-bt="subtitle" rows="3" maxlength="180"' + (canBasic() ? '' : ' disabled') + '>' + esc(d.banner.subtitle) + '</textarea></div>' +
          '<div class="ed-sec"><label class="ed-lbl">Texto del botón</label><input data-bt="cta" value="' + esc(d.banner.cta) + '" maxlength="24"' + (canBasic() ? '' : ' disabled') + '></div>' +
          '<div class="ed-sec"><label class="ed-lbl">Alineación</label><div class="ed-seg">' + [['left', 'Izquierda'], ['center', 'Centrada']].map((o) => '<button class="' + (d.banner.align === o[0] ? 'on' : '') + '" data-align="' + o[0] + '"' + (canBasic() ? '' : ' disabled') + '>' + o[1] + '</button>').join('') + '</div></div>' +
          '<div class="ed-sec"><label class="ed-lbl">Imagen de portada</label><div class="ed-imgs">' + '<button class="ed-img-none' + (!d.banner.image ? ' on' : '') + '" data-bimg=""' + (canBasic() ? '' : ' disabled') + '>Sin imagen</button>' +
          imgs.map((x) => '<button class="' + (d.banner.image === x ? 'on' : '') + '" data-bimg="' + esc(x) + '"' + (canBasic() ? '' : ' disabled') + '><img src="' + CA.imgSrc(x) + '" alt=""></button>').join('') + '</div><small class="ed-hint">Imágenes de tus productos y de la carpeta "Banners" de Drive.</small></div>';
        break;
      }
      case 'categories': {
        const cats = CA.products.categories(prods);
        html = head('Categorías destacadas', 'Elige qué categorías aparecen en la portada (máx. 8). Sin selección se muestran todas.') +
          '<div class="chips ed-chips">' + cats.map((x) => '<label class="chip' + (d.featuredCategories.includes(x) ? ' on' : '') + '"><input type="checkbox" hidden data-fcat="' + esc(x) + '"' + (d.featuredCategories.includes(x) ? ' checked' : '') + (canBasic() ? '' : ' disabled') + '>' + esc(x) + '</label>').join('') + '</div>' +
          (canBasic() ? '' : lockNote('Plan Inicial o superior.')) + '<p class="ed-hint">Las categorías visibles del catálogo se eligen en Catálogos › Configurar.</p>';
        break;
      }
      case 'featured':
        html = head('Productos destacados', 'Selecciona hasta 8 productos para la portada.') + (canBasic() ? '' : lockNote('Plan Inicial o superior.')) +
          '<input id="fpQ" placeholder="Buscar producto…" style="margin-bottom:10px"><div class="ed-plist" id="fpList"></div>';
        break;
      case 'benefits':
        html = head('Beneficios', 'Mensajes de confianza que se muestran en la portada.') + (canFull() ? '' : lockNote('Personalización completa (plan Profesional).')) +
          [0, 1, 2, 3].map((i) => '<div class="ed-sec"><label class="ed-lbl">Beneficio ' + (i + 1) + '</label><input data-ben="' + i + '" value="' + esc(d.benefits[i] || '') + '" maxlength="40" placeholder="Opcional"' + (canFull() ? '' : ' disabled') + '></div>').join('');
        break;
      case 'products':
        html = head('Productos y tarjetas', 'Cómo se muestran los productos.') + (canFull() ? '' : lockNote('Diseño de tarjetas y columnas: plan Profesional.')) +
          '<div class="ed-sec"><label class="ed-lbl">Columnas en escritorio: <b id="colsV">' + d.columns + '</b></label><input type="range" min="2" max="5" value="' + d.columns + '" id="cols"' + (canFull() ? '' : ' disabled') + '></div>' +
          '<div class="ed-sec"><label class="ed-lbl">Estilo de tarjeta</label><div class="ed-seg">' + [['shadow', 'Sombra'], ['border', 'Borde'], ['flat', 'Plana']].map((o) => '<button class="' + (d.card.style === o[0] ? 'on' : '') + '" data-cs="' + o[0] + '"' + (canFull() ? '' : ' disabled') + '>' + o[1] + '</button>').join('') + '</div></div>' +
          '<div class="ed-sec"><label class="ed-lbl">Formato de imagen</label><div class="ed-seg">' + [['square', 'Cuadrada'], ['portrait', 'Vertical'], ['landscape', 'Horizontal']].map((o) => '<button class="' + (d.card.ratio === o[0] ? 'on' : '') + '" data-cr="' + o[0] + '"' + (canFull() ? '' : ' disabled') + '>' + o[1] + '</button>').join('') + '</div></div>' +
          '<label class="toggle-row"><span><b>Mostrar SKU</b></span><input type="checkbox" class="toggle" data-card="showSku"' + (d.card.showSku ? ' checked' : '') + (canFull() ? '' : ' disabled') + '></label>' +
          '<label class="toggle-row"><span><b>Mostrar marca</b></span><input type="checkbox" class="toggle" data-card="showBrand"' + (d.card.showBrand ? ' checked' : '') + (canFull() ? '' : ' disabled') + '></label>' +
          '<div class="ed-sec"><label class="ed-lbl">Al hacer clic en un producto</label><div class="ed-seg">' + [['modal', 'Modal'], ['page', 'Página individual']].map((o) => '<button class="' + (c.productMode === o[0] ? 'on' : '') + '" data-mode="' + o[0] + '"' + (o[0] === 'page' && !D.limits().productPage ? ' disabled title="Plan Profesional"' : '') + '>' + o[1] + '</button>').join('') + '</div>' + (D.limits().productPage ? '' : '<small class="ed-hint">Página individual: plan Profesional.</small>') + '</div>';
        break;
      case 'footer':
        html = head('Footer', 'Información de contacto y redes.') + (canBasic() ? '' : lockNote('Plan Inicial o superior.')) +
          [['text', 'Texto', 'textarea'], ['address', 'Dirección'], ['hours', 'Horario'], ['instagram', 'Instagram (usuario)'], ['facebook', 'Facebook (página)']].map((f) => '<div class="ed-sec"><label class="ed-lbl">' + f[1] + '</label>' + (f[2] ? '<textarea data-foot="' + f[0] + '" rows="3"' + (canBasic() ? '' : ' disabled') + '>' + esc(d.footer[f[0]] || '') + '</textarea>' : '<input data-foot="' + f[0] + '" value="' + esc(d.footer[f[0]] || '') + '"' + (canBasic() ? '' : ' disabled') + '>') + '</div>').join('') +
          '<p class="ed-hint">El número de WhatsApp se configura en la sección WhatsApp.</p>';
        break;
    }
    box.innerHTML = html;
    bindRight(box, c, d, prods);
  }

  function bindRight(box, c, d, prods) {
    $$('[data-pal]', box).forEach((b) => (b.onclick = () => { const p = PALETTES[+b.dataset.pal]; setDesign((dz) => { dz.colors = { primary: p[1], secondary: p[2], background: p[3], text: p[4] }; }, { rerender: true }); }));
    $$('[data-color]', box).forEach((i) => (i.oninput = () => { i.nextElementSibling.querySelector('small').textContent = i.value; setDesignDebounced((dz) => { dz.colors[i.dataset.color] = i.value; }); }));
    $$('[data-font]', box).forEach((b) => (b.onclick = () => setDesign((dz) => { dz.font = b.dataset.font; }, { rerender: true })));
    $$('[data-btn]', box).forEach((b) => (b.onclick = () => setDesign((dz) => { dz.buttons.shape = b.dataset.btn; }, { rerender: true })));
    const bn = $('#bizName', box); if (bn) bn.oninput = () => setDesignDebounced((dz) => { dz.businessName = bn.value.trim() || 'Mi negocio'; });
    $$('[data-menu]', box).forEach((t) => (t.onchange = () => setDesign((dz) => { dz.menu[t.dataset.menu] = t.checked; })));
    const lu = $('#logoUp', box);
    if (lu) {
      lu.onclick = () => $('#logoFile').click();
      $('#logoFile').onchange = (e) => uploadLogo(e.target.files[0]);
      const lr = $('#logoRm', box); if (lr) lr.onclick = () => setDesign((dz) => { dz.logo = null; }, { rerender: true });
    }
    $$('[data-ban]', box).forEach((t) => (t.onchange = () => setDesign((dz) => { dz.banner.show = t.checked; })));
    $$('[data-bt]', box).forEach((i) => (i.oninput = () => setDesignDebounced((dz) => { dz.banner[i.dataset.bt] = i.value; })));
    $$('[data-align]', box).forEach((b) => (b.onclick = () => setDesign((dz) => { dz.banner.align = b.dataset.align; }, { rerender: true })));
    $$('[data-bimg]', box).forEach((b) => (b.onclick = () => setDesign((dz) => { dz.banner.image = b.dataset.bimg || null; }, { rerender: true })));
    $$('[data-fcat]', box).forEach((i) => (i.onchange = () => {
      const cur = new Set(d.featuredCategories);
      if (i.checked) { if (cur.size >= 8) { i.checked = false; return ui.toast('Máximo 8 categorías', 'warn'); } cur.add(i.dataset.fcat); } else cur.delete(i.dataset.fcat);
      setDesign((dz) => { dz.featuredCategories = Array.from(cur); }, { rerender: true });
    }));
    $$('[data-ben]', box).forEach((i) => (i.oninput = () => setDesignDebounced((dz) => { dz.benefits[+i.dataset.ben] = i.value; dz.benefits = dz.benefits.map((x) => x || ''); })));
    const cols = $('#cols', box); if (cols) cols.oninput = () => { $('#colsV').textContent = cols.value; setDesignDebounced((dz) => { dz.columns = +cols.value; }); };
    $$('[data-cs]', box).forEach((b) => (b.onclick = () => setDesign((dz) => { dz.card.style = b.dataset.cs; }, { rerender: true })));
    $$('[data-cr]', box).forEach((b) => (b.onclick = () => setDesign((dz) => { dz.card.ratio = b.dataset.cr; }, { rerender: true })));
    $$('[data-card]', box).forEach((t) => (t.onchange = () => setDesign((dz) => { dz.card[t.dataset.card] = t.checked; })));
    $$('[data-mode]', box).forEach((b) => (b.onclick = () => setDesign((dz, cz) => { cz.productMode = b.dataset.mode; }, { rerender: true })));
    $$('[data-foot]', box).forEach((i) => (i.oninput = () => setDesignDebounced((dz) => { dz.footer[i.dataset.foot] = i.value.replace(/^@/, ''); })));
    const fpL = $('#fpList', box);
    if (fpL) {
      const draw = (q) => {
        const sel = d.featuredProducts;
        fpL.innerHTML = prods.filter((p) => !q || (p.name + p.sku).toLowerCase().includes(q.toLowerCase())).slice(0, 40).map((p) => '<label class="ed-p' + (sel.includes(p.id) ? ' on' : '') + '"><input type="checkbox" data-fp="' + esc(p.id) + '"' + (sel.includes(p.id) ? ' checked' : '') + (canBasic() ? '' : ' disabled') + '><img src="' + CA.imgSrc(p.image) + '" alt=""><span><b>' + esc(p.name) + '</b><small>' + esc(p.sku) + ' · ' + u.money(p.offer || p.price) + '</small></span></label>').join('');
        $$('[data-fp]', fpL).forEach((i) => (i.onchange = () => {
          const cur = d.featuredProducts.slice();
          if (i.checked) { if (cur.length >= 8) { i.checked = false; return ui.toast('Máximo 8 productos destacados', 'warn'); } cur.push(i.dataset.fp); } else cur.splice(cur.indexOf(i.dataset.fp), 1);
          d.featuredProducts = cur;
          i.closest('.ed-p').classList.toggle('on', i.checked);
          setDesign((dz) => { dz.featuredProducts = cur; });
        }));
      };
      $('#fpQ', box).oninput = (e) => draw(e.target.value);
      draw('');
    }
  }

  /** Sube el logo: valida, reduce a 320 px y lo guarda como imagen en el diseño. */
  function uploadLogo(file) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) return ui.toast('Formato no permitido. Usa PNG, JPG, WEBP o SVG.', 'error');
    if (file.size > 2 * 1024 * 1024) return ui.toast('El logo pesa más de 2 MB.', 'error');
    const reader = new FileReader();
    reader.onload = () => {
      if (file.type === 'image/svg+xml') return setDesign((dz) => { dz.logo = reader.result; }, { rerender: true });
      const im = new Image();
      im.onload = () => {
        const s = Math.min(1, 320 / Math.max(im.width, im.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(im.width * s); cv.height = Math.round(im.height * s);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        setDesign((dz) => { dz.logo = cv.toDataURL('image/png'); }, { rerender: true });
        ui.toast('Logo actualizado', 'success');
      };
      im.onerror = () => ui.toast('No se pudo leer la imagen.', 'error');
      im.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  // Selección desde la vista previa (botón "✎" sobre cada sección)
  window.addEventListener('message', (e) => {
    const m = e.data || {};
    if (m.type === 'ca:select' && D.route().name === 'editor') { ED.sel = m.section; renderPanels(); }
  });
})();
