/*
 * Gestión de productos (provienen de la hoja de Google Sheets simulada).
 * Editar un producto cambia la fila de la hoja y vuelve a sincronizar.
 */
(function () {
  'use strict';
  const CA = window.CA, D = CA.dash;
  const u = CA.util, ui = CA.ui, esc = u.esc, I = ui.icon;
  const $ = ui.$, $$ = ui.$$;
  const PAGE = 12;
  const F = { q: '', cat: '', avail: '', status: '', sort: 'row', dir: 1, page: 1 };
  const STATUS = { ok: ['Sincronizado', 'ok'], warning: ['Con advertencias', 'warn'], error: ['Error · no se publica', 'bad'], limit: ['Fuera del límite del plan', 'neutral'] };

  D.view('productos', { title: 'Productos', icon: 'cards', sub: 'Sincronizados desde Google Sheets', render });

  function rowsWithStatus() {
    const user = D.user(), ws = D.ws();
    const pub = CA.products.publishable(D.db(), user);
    const inLimit = new Set(pub.list.map((p) => p.id));
    return (ws.products || []).map((p) => Object.assign({}, p, { status: p.sync === 'error' ? 'error' : !inLimit.has(p.id) ? 'limit' : p.sync }));
  }

  function render(el, params) {
    const ws = D.ws();
    if (params.get('f')) { F.status = params.get('f'); F.page = 1; history.replaceState(null, '', '#/productos'); }
    if (!ws.integrations.sheets.connected || !ws.mapping) { el.innerHTML = D.emptyStep('cards', 'Aún no hay productos', 'Conecta Google Sheets y configura las columnas para traer tus productos.', '#/integraciones', 'Conectar Google Sheets'); return; }
    const all = rowsWithStatus();
    const cats = CA.products.categories(all);
    let list = all.filter((p) => {
      const q = F.q.trim().toLowerCase();
      if (q && !(p.name + ' ' + p.sku + ' ' + p.brand + ' ' + p.category).toLowerCase().includes(q)) return false;
      if (F.cat && p.category !== F.cat) return false;
      if (F.avail && p.availability !== F.avail) return false;
      if (F.status && p.status !== F.status) return false;
      return true;
    });
    const key = { row: (p) => p.row, sku: (p) => p.sku, name: (p) => p.name.toLowerCase(), category: (p) => p.category, price: (p) => p.offer || p.price, availability: (p) => p.availability, status: (p) => p.status }[F.sort];
    list.sort((a, b) => (key(a) > key(b) ? 1 : key(a) < key(b) ? -1 : 0) * F.dir);
    const pages = Math.max(1, Math.ceil(list.length / PAGE));
    if (F.page > pages) F.page = pages;
    const rows = list.slice((F.page - 1) * PAGE, F.page * PAGE);
    const counts = {}; all.forEach((p) => { counts[p.status] = (counts[p.status] || 0) + 1; });
    const th = (k, label, cls) => '<th class="sortable ' + (cls || '') + '" data-sort="' + k + '">' + label + (F.sort === k ? (F.dir > 0 ? ' ↑' : ' ↓') : '') + '</th>';
    el.innerHTML = '<div class="view-in">' +
      '<div class="page-bar"><div class="chips">' + [['', 'Todos', all.length], ['ok', 'Sincronizados', counts.ok || 0], ['warning', 'Advertencias', counts.warning || 0], ['error', 'Errores', counts.error || 0], ['limit', 'Fuera del límite', counts.limit || 0]].filter((c) => c[0] === '' || c[2]).map((c) => '<button class="chip' + (F.status === c[0] ? ' on' : '') + '" data-st="' + c[0] + '">' + c[1] + ' <span class="count">' + c[2] + '</span></button>').join('') + '</div>' +
      '<div style="display:flex;gap:8px"><span class="muted" style="font-size:.84rem;align-self:center">' + D.syncState(ws).text + '</span><button class="btn btn-primary btn-sm" id="pSync">' + I('sync') + 'Sincronizar</button></div></div>' +
      '<div class="toolbar"><div class="search">' + I('search') + '<input id="pq" type="search" placeholder="Buscar por nombre, SKU o marca…" value="' + esc(F.q) + '"></div>' +
      '<select id="pc"><option value="">Todas las categorías</option>' + cats.map((c) => '<option' + (F.cat === c ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select>' +
      '<select id="pa"><option value="">Toda disponibilidad</option>' + Object.keys(CA.products.AVAIL).map((k) => '<option value="' + k + '"' + (F.avail === k ? ' selected' : '') + '>' + CA.products.AVAIL[k].label + '</option>').join('') + '</select></div>' +
      (rows.length ? '<div class="table-wrap stack"><table class="table"><thead><tr><th></th>' + th('sku', 'SKU') + th('name', 'Nombre') + th('category', 'Categoría') + th('price', 'Precio', 'num') + th('availability', 'Disponibilidad') + th('status', 'Sincronización') + '<th></th></tr></thead><tbody>' +
        rows.map((p) => '<tr class="clickable' + (p.status === 'error' || p.status === 'limit' ? ' row-dim' : '') + '" data-id="' + p.id + '"><td><img class="thumb" src="' + CA.imgSrc(p.image) + '" alt="" loading="lazy" ' + CA.imgFallbackAttr + '></td>' +
          '<td data-l="SKU" class="mono">' + esc(p.sku || '—') + '</td><td data-l="Nombre"><b>' + esc(p.name || '(sin nombre)') + '</b>' + (p.brand ? '<br><small class="muted">' + esc(p.brand) + '</small>' : '') + '</td><td data-l="Categoría">' + esc(p.category) + '</td>' +
          '<td data-l="Precio" class="num">' + (p.offer ? '<s class="muted">' + u.money(p.price) + '</s><br><b class="text-ok">' + u.money(p.offer) + '</b>' : u.money(p.price)) + '</td>' +
          '<td data-l="Disponibilidad">' + ui.badge(CA.products.AVAIL[p.availability].label, CA.products.AVAIL[p.availability].tone) + '</td>' +
          '<td data-l="Sincronización">' + ui.badge(STATUS[p.status][0], STATUS[p.status][1]) + '</td><td class="actions"><button class="btn btn-sm btn-ghost" data-edit="' + p.id + '"' + (p.status === 'error' && !p.name ? ' disabled' : '') + '>' + I('edit') + '</button></td></tr>').join('') + '</tbody></table></div>' +
        '<div class="pager"><span>' + ((F.page - 1) * PAGE + 1) + '–' + Math.min(F.page * PAGE, list.length) + ' de ' + list.length + ' productos</span><span style="display:flex;gap:6px;align-items:center"><button class="btn btn-sm btn-ghost" data-page="' + (F.page - 1) + '"' + (F.page <= 1 ? ' disabled' : '') + '>' + I('left') + '</button><span class="pill">' + F.page + ' / ' + pages + '</span><button class="btn btn-sm btn-ghost" data-page="' + (F.page + 1) + '"' + (F.page >= pages ? ' disabled' : '') + '>' + I('right') + '</button></span></div>'
        : '<div class="card">' + ui.empty('search', 'Sin resultados', 'Prueba con otros filtros.', '<button class="btn btn-ghost btn-sm" id="pClr">Limpiar filtros</button>') + '</div>') +
      '</div>';
    $('#pSync').onclick = () => D.runSync();
    $('#pq').addEventListener('input', u.debounce((e) => { F.q = e.target.value; F.page = 1; render(el, new URLSearchParams()); const n = $('#pq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 220));
    $('#pc').onchange = (e) => { F.cat = e.target.value; F.page = 1; render(el, new URLSearchParams()); };
    $('#pa').onchange = (e) => { F.avail = e.target.value; F.page = 1; render(el, new URLSearchParams()); };
    $$('[data-st]', el).forEach((b) => (b.onclick = () => { F.status = b.dataset.st; F.page = 1; render(el, new URLSearchParams()); }));
    $$('[data-sort]', el).forEach((t) => (t.onclick = () => { F.dir = F.sort === t.dataset.sort ? -F.dir : 1; F.sort = t.dataset.sort; render(el, new URLSearchParams()); }));
    $$('[data-page]', el).forEach((b) => (b.onclick = () => { F.page = +b.dataset.page; render(el, new URLSearchParams()); }));
    const clr = $('#pClr'); if (clr) clr.onclick = () => { Object.assign(F, { q: '', cat: '', avail: '', status: '', page: 1 }); render(el, new URLSearchParams()); };
    $$('tr[data-id]', el).forEach((tr) => (tr.onclick = (e) => { if (e.target.closest('[data-edit]')) return; detail(tr.dataset.id); }));
    $$('[data-edit]', el).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); edit(b.dataset.id); }));
  }

  function detail(id) {
    const p = rowsWithStatus().find((x) => x.id === id);
    if (!p) return;
    const ws = D.ws();
    const cat = ws.catalogs.find((c) => c.status === 'published') || ws.catalogs[0];
    const m = ui.modal({
      title: p.name || '(sin nombre)', subtitle: 'SKU ' + esc(p.sku || '—') + ' · fila ' + p.row + ' de la hoja', icon: 'cards', size: 'lg',
      body: '<div class="pd-grid"><div><div class="pd-main"><img id="pdImg" src="' + CA.imgSrc(p.image) + '" alt="" ' + CA.imgFallbackAttr + '></div>' +
        (p.gallery.length > 1 ? '<div class="pd-thumbs">' + p.gallery.map((g, i) => '<button data-g="' + i + '" class="' + (i ? '' : 'on') + '"><img src="' + CA.imgSrc(g) + '" alt=""></button>').join('') + '</div>' : '') + '</div>' +
        '<div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">' + ui.badge(STATUS[p.status][0], STATUS[p.status][1]) + ui.badge(CA.products.AVAIL[p.availability].label, CA.products.AVAIL[p.availability].tone) + '</div>' +
        '<div class="pd-price">' + (p.offer ? '<s>' + u.money(p.price) + '</s> ' + u.money(p.offer) : u.money(p.price)) + '</div>' +
        '<p>' + esc(p.description || 'Sin descripción.') + '</p><dl class="kv"><dt>Categoría</dt><dd>' + esc(p.category) + '</dd>' + (p.brand ? '<dt>Marca</dt><dd>' + esc(p.brand) + '</dd>' : '') +
        Object.keys(p.attributes).map((k) => '<dt>' + esc(k) + '</dt><dd>' + esc(p.attributes[k]) + '</dd>').join('') + '<dt>Imágenes</dt><dd>' + p.gallery.length + '</dd></dl>' +
        (p.issues.length ? '<div class="alert alert-' + (p.sync === 'error' ? 'bad' : 'warn') + '" style="margin-top:14px">' + I('alert') + '<p>' + p.issues.map((x) => esc(x.msg)).join('<br>') + '</p></div>' : '') +
        (p.status === 'limit' ? '<div class="alert alert-info" style="margin-top:14px">' + I('lock2') + '<p>Este producto supera el límite de tu plan y no se muestra en tus catálogos.</p></div>' : '') + '</div></div>',
      actions: [
        cat && p.status !== 'error' ? { label: 'Ver en el catálogo', cls: 'btn-ghost', icon: 'eye', onClick: () => { window.open(D.previewUrl(cat, '&p=' + encodeURIComponent(p.id)), '_blank'); return false; } } : null,
        { label: 'Editar', cls: 'btn-primary', icon: 'edit', onClick: () => { setTimeout(() => edit(id), 50); } }
      ].filter(Boolean)
    });
    $$('[data-g]', m.body).forEach((b) => (b.onclick = () => { m.body.querySelector('#pdImg').src = CA.imgSrc(p.gallery[+b.dataset.g]); $$('[data-g]', m.body).forEach((x) => x.classList.toggle('on', x === b)); }));
  }

  function edit(id) {
    const ws = D.ws();
    const p = (ws.products || []).find((x) => x.id === id);
    if (!p) return;
    const mf = ws.mapping.fields;
    const cats = CA.products.categories(ws.products);
    const fields = [
      { name: 'name', label: 'Nombre', required: true, value: p.name, wide: true, col: 'name' },
      { name: 'description', label: 'Descripción', type: 'textarea', rows: 3, value: p.description, wide: true, col: 'description' },
      { name: 'price', label: 'Precio', type: 'number', prefix: CA.CONFIG.currency, min: 0, step: '0.01', required: true, value: p.price, col: 'price' },
      { name: 'offer', label: 'Precio de oferta', type: 'number', prefix: CA.CONFIG.currency, min: 0, step: '0.01', value: p.offer || '', optional: true, col: 'offer' },
      { name: 'category', label: 'Categoría', value: p.category, col: 'category', hint: 'Existentes: ' + cats.slice(0, 6).join(', ') },
      { name: 'brand', label: 'Marca', value: p.brand, col: 'brand' },
      { name: 'availability', label: 'Disponibilidad', type: 'select', value: p.availability, options: Object.keys(CA.products.AVAIL).map((k) => ({ value: k, label: CA.products.AVAIL[k].label })), col: 'availability' }
    ].filter((f) => mf[f.col]);
    ui.formDialog({
      title: 'Editar producto', subtitle: 'SKU ' + esc(p.sku) + ' · los cambios se escriben en la fila ' + p.row + ' de la hoja simulada', icon: 'edit', size: 'md',
      intro: '<div class="alert alert-info">' + I('sheet') + '<p>En la versión real editarías tu Google Sheets y ' + esc(CA.CONFIG.brand.name) + ' sincronizaría el cambio. Aquí simulamos ese cambio en la hoja y sincronizamos al instante.</p></div>',
      fields, submitLabel: 'Guardar y sincronizar', submitIcon: 'sync',
      onSubmit: (v) => {
        const data = {};
        fields.forEach((f) => (data[f.name] = v[f.name]));
        if (data.offer === '') data.offer = '';
        CA.store.tx((db) => CA.products.update(db, CA.session.userId(), id, data));
        ui.toast('Fila ' + p.row + ' actualizada en la hoja y sincronizada. Tu catálogo ya muestra el cambio.', 'success', 4500);
        D.render();
      }
    });
  }
  CA.editProduct = edit;
})();
