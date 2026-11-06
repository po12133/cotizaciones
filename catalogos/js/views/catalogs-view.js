/*
 * Gestión de catálogos: crear, configurar, duplicar, eliminar, publicar y compartir.
 */
(function () {
  'use strict';
  const CA = window.CA, D = CA.dash;
  const u = CA.util, ui = CA.ui, esc = u.esc, I = ui.icon, B = CA.CONFIG.brand;
  const $ = ui.$, $$ = ui.$$;

  D.view('catalogos', { title: 'Catálogos', icon: 'layout', sub: 'Crea, publica y comparte tus catálogos', render });

  const STATUS = { published: ['Publicado', 'ok'], draft: ['Borrador', 'neutral'], limit: ['Pausado por límite del plan', 'warn'], suspended: ['Cuenta suspendida', 'bad'] };

  /** Miniatura con la estructura de la plantilla y los colores del catálogo. */
  function thumb(c, ws) {
    const d = c.design, col = d.colors;
    const prods = (ws.products || []).filter((p) => p.sync !== 'error');
    const feat = (d.featuredProducts || []).map((id) => prods.find((p) => p.id === id)).filter(Boolean).concat(prods).slice(0, 4);
    const img = (p) => '<img src="' + CA.imgSrc(p && p.image) + '" alt="" ' + CA.imgFallbackAttr + '>';
    const t = d.template;
    return '<div class="cthumb cthumb-' + t + '" style="--p:' + col.primary + ';--s:' + col.secondary + ';--bg:' + col.background + '">' +
      '<div class="ct-h">' + (d.logo ? '<img class="ct-logo" src="' + d.logo + '" alt="">' : '') + '<span>' + esc(d.businessName) + '</span></div>' +
      '<div class="ct-b">' + esc(d.banner.title) + '</div>' +
      '<div class="ct-g">' + feat.slice(0, t === 'mayorista' ? 3 : t === 'atelier' ? 3 : 4).map((p) => '<div class="ct-c">' + img(p) + (t === 'mayorista' ? '<i></i><em></em>' : '') + '</div>').join('') + '</div></div>';
  }
  CA.catalogThumb = thumb;

  function render(el) {
    const db = D.db(), user = D.user(), ws = D.ws();
    const limits = D.limits();
    const cats = ws.catalogs || [];
    const canCreate = cats.length < limits.catalogs;
    el.innerHTML = '<div class="view-in">' +
      '<div class="page-bar"><div><span class="pill">' + cats.length + ' de ' + limits.catalogs + ' catálogo(s) del plan ' + CA.plans.label(user) + '</span></div>' +
      '<button class="btn btn-primary" id="newCat"' + (canCreate ? '' : ' disabled title="Llegaste al límite de tu plan"') + '>' + I('plus') + 'Crear catálogo</button></div>' +
      (!canCreate ? '<div class="alert alert-warn" style="margin-bottom:14px">' + I('lock2') + '<p>Llegaste al límite de ' + limits.catalogs + ' catálogo(s) de tu plan. <a href="#/suscripcion">Mejora tu plan</a> para crear más.</p></div>' : '') +
      (!ws.integrations.sheets.connected ? '<div class="alert alert-info" style="margin-bottom:14px">' + I('sheet') + '<p>Conecta Google Sheets para que tus catálogos muestren productos. <a href="#/integraciones">Conectar</a></p></div>' : '') +
      (cats.length ? '<div class="cat-grid">' + cats.map((c) => {
        const st = CA.catalogs.liveStatus(db, user, ws, c);
        const key = st.live ? 'published' : st.reason;
        const eff = CA.catalogs.effective(db, user, c);
        return '<article class="cat-card"><a class="cat-thumb" href="#/editor?id=' + c.id + '" title="Editar diseño">' + thumb(c, ws) + '</a>' +
          '<div class="cat-body"><div class="cat-top"><h3>' + esc(c.name) + '</h3>' + ui.badge(STATUS[key][0], STATUS[key][1]) + '</div>' +
          '<div class="cat-url"><span class="mono">' + esc(c.domain && limits.customDomain ? c.domain : CA.catalogs.publicUrl(c).replace('https://', '')) + '</span><button class="icon-btn" data-copy="' + c.id + '" title="Copiar enlace">' + I('copy') + '</button></div>' +
          '<div class="cat-meta"><span>' + I('layout') + CA.TEMPLATES[c.design.template].name + '</span><span>' + I('cards') + eff.products.length + ' productos</span><span>' + I('tag') + eff.categories.length + ' categorías</span><span>' + I('whatsapp') + (c.whatsapp.numbers.filter((n) => n.number).length || 'Sin') + ' número(s)</span></div>' +
          (eff.warnings.length ? '<div class="cat-warn">' + I('alert') + esc(eff.warnings[0]) + '</div>' : '') +
          '<div class="cat-actions"><a class="btn btn-sm btn-primary" href="#/editor?id=' + c.id + '">' + I('palette') + 'Diseño</a>' +
          '<button class="btn btn-sm ' + (c.status === 'published' ? 'btn-ghost' : 'btn-ok') + '" data-pub="' + c.id + '">' + (c.status === 'published' ? 'Despublicar' : I('rocket') + 'Publicar') + '</button>' +
          '<a class="btn btn-sm btn-ghost" href="' + D.previewUrl(c) + '" target="_blank" rel="noopener">' + I('eye') + 'Vista previa</a>' +
          '<div class="dropdown"><button class="icon-btn" aria-label="Más acciones">⋯</button><div class="dropdown-menu">' +
          '<button data-cfg="' + c.id + '">' + I('settings') + 'Configurar catálogo</button><a href="#/whatsapp?id=' + c.id + '">' + I('whatsapp') + 'Configurar WhatsApp</a><button data-share="' + c.id + '">' + I('link') + 'Obtener enlace público</button>' +
          '<button data-dup="' + c.id + '">' + I('dup') + 'Duplicar</button><hr><button data-del="' + c.id + '" class="text-bad">' + I('trash2') + 'Eliminar</button></div></div></div>' +
          '<small class="muted">Actualizado ' + u.ago(c.updatedAt) + (c.publishedAt ? ' · publicado el ' + u.date(c.publishedAt) : '') + '</small></div></article>';
      }).join('') + '</div>'
        : D.emptyStep('layout', 'Crea tu primer catálogo', 'Elige una plantilla, personalízala y publícala. Al publicar tu primer catálogo activas 14 días del plan Profesional.', null) ) +
      '</div>';
    const nb = $('#newCat'); nb.onclick = createDialog;
    if (!cats.length) { const card = el.querySelector('.card .empty'); if (card) card.insertAdjacentHTML('beforeend', '<button class="btn btn-primary" id="newCat2">' + I('plus') + 'Crear catálogo</button>'); const b2 = $('#newCat2'); if (b2) b2.onclick = createDialog; }
    $$('.cat-actions .dropdown > button', el).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); const d = b.parentElement; $$('.dropdown.open').forEach((x) => x !== d && x.classList.remove('open')); d.classList.toggle('open'); }));
    $$('[data-copy]', el).forEach((b) => (b.onclick = () => ui.copy(publicLink(b.dataset.copy))));
    $$('[data-pub]', el).forEach((b) => (b.onclick = () => togglePublish(b.dataset.pub)));
    $$('[data-dup]', el).forEach((b) => (b.onclick = () => D.act((d, uid) => CA.catalogs.duplicate(d, uid, b.dataset.dup), (c) => 'Catálogo duplicado: ' + c.name)));
    $$('[data-del]', el).forEach((b) => (b.onclick = () => remove(b.dataset.del)));
    $$('[data-cfg]', el).forEach((b) => (b.onclick = () => configure(b.dataset.cfg)));
    $$('[data-share]', el).forEach((b) => (b.onclick = () => share(b.dataset.share)));
  }

  function publicLink(id) {
    const c = CA.catalogs.get(D.db(), CA.session.userId(), id);
    return c.domain && D.limits().customDomain ? 'https://' + c.domain : CA.catalogs.publicUrl(c);
  }

  function togglePublish(id) {
    const c = CA.catalogs.get(D.db(), CA.session.userId(), id);
    const publish = c.status !== 'published';
    const r = D.act((d, uid) => CA.catalogs.setPublished(d, uid, id, publish), null);
    if (!r) return;
    if (r.trialStarted) {
      ui.modal({ title: '¡Catálogo publicado y prueba activada!', icon: 'rocket', size: 'sm',
        body: '<p class="confirm-text">Tu catálogo <b>' + esc(c.name) + '</b> ya está online. Además activaste <b>14 días del plan Profesional</b> gratis, sin tarjeta: todas las plantillas, personalización completa, página de producto y dominio propio.</p>',
        actions: [{ label: 'Ver mi catálogo', cls: 'btn-ghost', onClick: () => { window.open(D.previewUrl(c), '_blank'); } }, { label: 'Entendido', cls: 'btn-primary' }] });
    } else ui.toast(publish ? 'Catálogo publicado: ' + publicLink(id) : 'Catálogo despublicado (ya no es visible al público)', publish ? 'success' : 'info');
  }

  async function remove(id) {
    const c = CA.catalogs.get(D.db(), CA.session.userId(), id);
    if (!(await ui.confirm({ title: 'Eliminar catálogo', message: '¿Eliminar <b>' + esc(c.name) + '</b>? Su enlace dejará de funcionar y se perderá su diseño. Tus productos de Google Sheets no se modifican.', confirmLabel: 'Eliminar', danger: true }))) return;
    D.act((d, uid) => CA.catalogs.remove(d, uid, id), 'Catálogo eliminado');
  }

  function share(id) {
    const c = CA.catalogs.get(D.db(), CA.session.userId(), id);
    const url = publicLink(id);
    const live = c.status === 'published';
    const msg = encodeURIComponent('¡Mira nuestro catálogo! ' + url);
    ui.modal({
      title: 'Enlace público', subtitle: esc(c.name), icon: 'link', size: 'sm',
      body: (live ? '' : '<div class="alert alert-warn" style="margin-bottom:12px">' + I('alert') + '<p>El catálogo está en borrador: publícalo para que el enlace sea visible.</p></div>') +
        '<div class="share-url"><span class="mono">' + esc(url) + '</span><button class="btn btn-sm btn-primary" id="cp">' + I('copy') + 'Copiar</button></div>' +
        '<p class="muted" style="font-size:.8rem;margin:8px 0 14px">Dirección simulada. En este prototipo el catálogo se abre localmente:</p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn-ghost btn-sm" href="' + CA.catalogs.localUrl(c) + '" target="_blank" rel="noopener">' + I('external') + 'Abrir vista pública</a>' +
        '<a class="btn btn-wa btn-sm" href="https://wa.me/?text=' + msg + '" target="_blank" rel="noopener">' + I('whatsapp') + 'Compartir por WhatsApp</a></div>',
      onOpen: (m) => { m.body.querySelector('#cp').onclick = () => ui.copy(url); }
    });
  }

  function templatePicker(selected, limits) {
    return '<div class="tpl-pick">' + CA.TEMPLATE_ORDER.map((id) => {
      const t = CA.TEMPLATES[id];
      const ok = CA.plans.templateAllowed(limits, id);
      return '<label class="tp-opt' + (ok ? '' : ' locked') + '"><input type="radio" name="template" value="' + id + '"' + (id === selected ? ' checked' : '') + (ok ? '' : ' disabled') + '>' +
        '<span class="tp-sw" style="--p:' + t.defaults.colors.primary + ';--s:' + t.defaults.colors.secondary + '"><i></i><i></i></span><b>' + t.name + '</b><small>' + esc(t.industry) + '</small>' + (ok ? '' : '<em>' + I('lock2') + ' Plan superior</em>') + '</label>';
    }).join('') + '</div>';
  }

  function createDialog() {
    const user = D.user(), limits = D.limits();
    const wa = (D.ws().catalogs[0] || { whatsapp: { numbers: [{}] } }).whatsapp.numbers[0].number || '';
    ui.formDialog({
      title: 'Nuevo catálogo', icon: 'layout', size: 'lg', submitLabel: 'Crear y personalizar', submitIcon: 'palette',
      fields: [
        { name: 'name', label: 'Nombre del catálogo', required: true, placeholder: 'Ej. ' + user.business, value: D.ws().catalogs.length ? '' : user.business },
        { name: 'slug', label: 'Dirección', prefix: 'https://', suffix: '.' + B.domain, placeholder: 'mi-tienda', hint: 'Letras, números y guiones.' },
        { name: 'whatsapp', label: 'WhatsApp para consultas (con código de país)', prefix: '+', value: wa, placeholder: '59171234567', inputmode: 'tel', wide: true }
      ],
      extra: '<div class="field field-wide" data-field="template"><label>Plantilla</label>' + templatePicker(CA.TEMPLATE_ORDER.find((t) => CA.plans.templateAllowed(limits, t)), limits) + '<small class="err"></small></div>',
      onOpen: (m, form) => {
        form.name.addEventListener('input', () => { if (!form.slug.dataset.touched) form.slug.value = u.slug(form.name.value); });
        form.slug.addEventListener('input', () => { form.slug.dataset.touched = '1'; });
        if (form.name.value) form.slug.value = CA.catalogs.uniqueSlug(D.db(), form.name.value);
      },
      onSubmit: (v, api, form) => {
        const tpl = (form.querySelector('[name=template]:checked') || {}).value;
        if (v.whatsapp && !CA.wa.normalize(v.whatsapp)) throw new CA.BizError('Número no válido: incluye el código de país (ej. 591 para Bolivia).', 'whatsapp');
        const c = CA.store.tx((db) => {
          const cat = CA.catalogs.create(db, CA.session.userId(), { name: v.name, slug: v.slug || v.name, template: tpl, whatsapp: CA.wa.normalize(v.whatsapp) });
          return cat;
        });
        ui.toast('Catálogo creado. Personaliza su diseño.', 'success');
        D.go('editor?id=' + c.id);
      }
    });
  }
  CA.createCatalog = createDialog;

  /** Configuración general del catálogo (fuente, categorías, modo de producto, dominio). */
  function configure(id) {
    const db = D.db(), ws = D.ws(), limits = D.limits();
    const c = CA.catalogs.get(db, CA.session.userId(), id);
    const sh = ws.integrations.sheets;
    const sheet = sh.connected ? CA.products.sheet(db, sh.sheetId) : null;
    const cats = CA.products.categories((ws.products || []).filter((p) => p.sync !== 'error'));
    const vis = c.visibleCategories.length ? c.visibleCategories : cats;
    ui.formDialog({
      title: 'Configurar catálogo', subtitle: esc(c.name), icon: 'settings', size: 'lg', submitLabel: 'Guardar',
      fields: [
        { name: 'name', label: 'Nombre', required: true, value: c.name },
        { name: 'slug', label: 'Dirección', prefix: 'https://', suffix: '.' + B.domain, value: c.slug, required: true },
        { name: 'domain', label: 'Dominio propio', optional: true, value: c.domain, placeholder: limits.customDomain ? 'catalogo.minegocio.com' : 'Disponible desde el plan Profesional', hint: limits.customDomain ? 'Apunta un registro CNAME a ' + B.domain + ' (simulado).' : '' },
        { name: 'productMode', label: 'Al hacer clic en un producto', type: 'select', value: c.productMode, options: [{ value: 'modal', label: 'Abrir modal de producto' }, { value: 'page', label: 'Abrir página individual' + (limits.productPage ? '' : ' (plan Profesional)') }] }
      ],
      extra: '<div class="field field-wide"><label>Fuente de productos</label><div class="src-box">' + I('sheet') + (sheet ? '<b>' + esc(sheet.name) + '</b> › ' + esc(sh.tab) + ' <span class="muted">(' + (ws.products || []).length + ' filas)</span>' : '<span class="muted">Google Sheets no conectado</span>') + '<a href="#/integraciones" class="link-btn" style="margin-left:auto">Cambiar</a></div></div>' +
        '<div class="field field-wide"><label>Categorías visibles' + (limits.categories != null ? ' <small class="opt">(tu plan muestra hasta ' + limits.categories + ')</small>' : '') + '</label><div class="chips" id="visCats">' +
        (cats.length ? cats.map((x) => '<label class="chip' + (vis.includes(x) ? ' on' : '') + '"><input type="checkbox" hidden value="' + esc(x) + '"' + (vis.includes(x) ? ' checked' : '') + '>' + esc(x) + '</label>').join('') : '<span class="muted" style="font-size:.85rem">Sincroniza productos para elegir categorías.</span>') + '</div></div>',
      onOpen: (m, form) => {
        $$('#visCats input', form).forEach((i) => (i.onchange = () => i.parentElement.classList.toggle('on', i.checked)));
        if (!limits.customDomain) form.domain.disabled = true;
      },
      onSubmit: (v, api, form) => {
        const selected = $$('#visCats input', form).filter((i) => i.checked).map((i) => i.value);
        if (cats.length && !selected.length) throw new CA.BizError('Elige al menos una categoría visible.');
        if (v.productMode === 'page' && !limits.productPage) throw new CA.BizError('La página individual de producto requiere el plan Profesional.', 'productMode');
        CA.store.tx((db2) => CA.catalogs.update(db2, CA.session.userId(), id, { name: v.name.trim(), slug: v.slug, domain: limits.customDomain ? String(v.domain || '').trim().toLowerCase() : c.domain, productMode: v.productMode, visibleCategories: selected.length === cats.length ? [] : selected }));
        ui.toast('Catálogo actualizado', 'success');
        D.render();
      }
    });
  }
  CA.configureCatalog = configure;
})();
