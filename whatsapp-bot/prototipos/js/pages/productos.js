/* Catálogo de productos: administración, categorías, inventario, promociones, enlaces y vista de catálogo con WhatsApp. */
(function () {
  const { icon, ui, db, shell } = window.WAB;
  const { esc, fmt } = ui;
  let tab = 'productos';
  const f = { q: '', cat: '', disp: '' };
  const rate = () => db.get('settings').negocio.tipoCambio || 6.96;
  const usd = (bs) => fmt.usd(bs / rate());
  const link = (p) => `${location.href.replace(/prototipos\/.*$/, 'prototipos/')}tienda.html#producto/${p.id}`;

  shell.view.innerHTML = `
    <div class="page-head">
      <div><h2>Productos</h2><p class="muted">Administre su catálogo. Los cambios se ven en el bot de WhatsApp y en el catálogo web.</p></div>
      <div class="btn-group"><a class="btn" href="tienda.html" target="_blank" rel="noopener">${icon('globe', 'sm')}Ver catálogo web</a><button class="btn btn-primary" id="new">${icon('plus', 'sm')}Nuevo producto</button></div>
    </div>
    <div class="kpis" id="kpis"></div>
    <div class="tabs"><button class="tab active" data-tab="productos">${icon('package', 'sm')}Productos</button><button class="tab" data-tab="categorias">${icon('tag', 'sm')}Categorías</button><button class="tab" data-tab="catalogo">${icon('grid', 'sm')}Vista de catálogo</button></div>
    <div id="body"></div>`;
  const $ = (id) => document.getElementById(id);

  function kpis() {
    const ps = db.get('products');
    const value = ps.reduce((t, p) => t + p.stock * db.price(p), 0);
    $('kpis').innerHTML = `
      <div class="kpi"><span class="kpi-label">Productos activos</span><span class="kpi-value">${ps.filter((p) => p.activo).length}</span><span class="small muted">de ${ps.length}</span></div>
      <div class="kpi"><span class="kpi-label">Stock bajo (≤ 5)</span><span class="kpi-value">${ps.filter((p) => p.stock > 0 && p.stock <= 5).length}</span></div>
      <div class="kpi"><span class="kpi-label">Agotados</span><span class="kpi-value">${ps.filter((p) => p.stock <= 0).length}</span></div>
      <div class="kpi"><span class="kpi-label">Valor de inventario</span><span class="kpi-value">${fmt.money(value)}</span><span class="small muted">${usd(value)}</span></div>`;
  }

  function filtered() {
    return db.get('products').filter((p) => {
      if (f.cat && p.categoria !== f.cat) return false;
      if (f.disp === 'disponible' && !(p.stock > 0 && p.activo)) return false;
      if (f.disp === 'bajo' && !(p.stock > 0 && p.stock <= 5)) return false;
      if (f.disp === 'agotado' && p.stock > 0) return false;
      if (f.disp === 'promo' && !p.promo) return false;
      if (f.q && !`${p.nombre} ${p.sku} ${p.descripcion}`.toLowerCase().includes(f.q.toLowerCase())) return false;
      return true;
    });
  }

  function render() {
    kpis();
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    ({ productos, categorias, catalogo })[tab]();
  }

  function productos() {
    const cats = db.get('categories');
    $('body').innerHTML = `<div class="card">
      <div class="card-head toolbar">
        <div class="input-group">${icon('search', 'sm')}<input class="input input-sm" id="q" value="${esc(f.q)}" placeholder="Buscar por nombre o SKU" aria-label="Buscar productos"></div>
        <select class="select input-sm" id="cat" style="width:auto" aria-label="Categoría"><option value="">Todas las categorías</option>${cats.map((c) => `<option value="${c.id}"${c.id === f.cat ? ' selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select>
        <select class="select input-sm" id="disp" style="width:auto" aria-label="Disponibilidad">${[['', 'Toda la disponibilidad'], ['disponible', 'Disponibles'], ['bajo', 'Stock bajo'], ['agotado', 'Agotados'], ['promo', 'En promoción']].map(([v, l]) => `<option value="${v}"${v === f.disp ? ' selected' : ''}>${l}</option>`).join('')}</select>
      </div>
      <div id="tbl"></div></div>`;
    $('q').oninput = ui.debounce((e) => { f.q = e.target.value; table(); }, 150);
    $('cat').onchange = (e) => { f.cat = e.target.value; table(); };
    $('disp').onchange = (e) => { f.disp = e.target.value; table(); };
    table();
  }

  function table() {
    const list = filtered();
    $('tbl').innerHTML = list.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Producto</th><th class="hide-sm">Categoría</th><th class="num">Precio</th><th class="num">Stock</th><th>Activo</th><th></th></tr></thead><tbody>
      ${list.map((p) => { const cat = db.category(p.categoria); return `<tr data-id="${p.id}">
        <td><div class="cell-user"><span class="prod-thumb"><img src="${db.img(p)}" alt=""></span><div class="meta"><strong>${esc(p.nombre)}</strong><small>${esc(p.sku)}${p.variantes.length ? ` · ${p.variantes.length} variantes` : ''}${p.destacado ? ' · Destacado' : ''}</small></div></div></td>
        <td class="hide-sm">${esc(cat ? cat.nombre : '—')}</td>
        <td class="num"><strong>${fmt.money(db.price(p))}</strong>${p.promo ? `<br><small class="muted"><s>${fmt.money(p.precio)}</s> −${p.promo}%</small>` : `<br><small class="muted">${usd(p.precio)}</small>`}</td>
        <td class="num">${p.stock <= 0 ? '<span class="badge danger">Agotado</span>' : p.stock <= 5 ? `<span class="badge warn">${p.stock}</span>` : p.stock}</td>
        <td><label class="switch"><input type="checkbox" data-active="${p.id}" ${p.activo ? 'checked' : ''} aria-label="Activo"><span class="track"></span></label></td>
        <td class="nowrap"><button class="btn btn-ghost btn-icon btn-sm" data-stock="${p.id}" data-tip="Ajustar stock" aria-label="Ajustar stock">${icon('layers', 'sm')}</button><button class="btn btn-ghost btn-icon btn-sm" data-wa="${p.id}" data-tip="Enviar por WhatsApp" aria-label="Enviar por WhatsApp">${icon('send', 'sm')}</button><button class="btn btn-ghost btn-icon btn-sm" data-more="${p.id}" aria-label="Más acciones">${icon('more', 'sm')}</button></td></tr>`; }).join('')}
      </tbody></table></div>`
      : `<div class="card-body">${ui.emptyState({ icon: 'package', title: 'Sin productos', text: 'No hay productos con estos filtros.' })}</div>`;
    const t = $('tbl');
    t.querySelectorAll('[data-active]').forEach((c) => c.onchange = () => { db.update('products', (arr) => { arr.find((x) => x.id === c.dataset.active).activo = c.checked; return arr; }); kpis(); ui.toast(c.checked ? 'Producto visible' : 'Producto oculto', 'En el bot y el catálogo web.', 'info'); });
    t.querySelectorAll('[data-stock]').forEach((b) => b.onclick = () => adjustStock(db.product(b.dataset.stock)));
    t.querySelectorAll('[data-wa]').forEach((b) => b.onclick = () => sendPreview(db.product(b.dataset.wa)));
    t.querySelectorAll('[data-more]').forEach((b) => b.onclick = (e) => {
      e.stopPropagation();
      const p = db.product(b.dataset.more);
      ui.popMenu(b, [
        { label: 'Editar', icon: 'edit', onClick: () => edit(p) },
        { label: 'Copiar enlace', icon: 'link', onClick: () => ui.copy(link(p), 'Enlace del producto copiado') },
        { label: 'Duplicar', icon: 'copy', onClick: () => { db.upsert('products', Object.assign({}, p, { id: ui.uid('prd'), nombre: `${p.nombre} (copia)`, sku: `${p.sku}-C`, variantes: p.variantes.slice() })); render(); ui.toast('Producto duplicado', '', 'ok'); } },
        { label: 'Eliminar', icon: 'trash', danger: true, onClick: async () => { if (await ui.confirm({ title: `Eliminar ${p.nombre}`, message: 'Se quitará del catálogo. Los pedidos anteriores conservan el registro.', confirmLabel: 'Eliminar', danger: true })) { db.remove('products', p.id); render(); } } }
      ]);
    });
  }

  function edit(p) {
    const cats = db.get('categories');
    const fields = [
      { name: 'nombre', label: 'Nombre', required: true, maxlength: 60, full: true },
      { name: 'sku', label: 'SKU / código', required: true, maxlength: 20 },
      { name: 'categoria', label: 'Categoría', type: 'select', required: true, options: cats.map((c) => ({ value: c.id, label: c.nombre })) },
      { name: 'precio', label: 'Precio (Bs)', type: 'number', min: 0.5, step: 0.5, required: true, hint: `Tipo de cambio: Bs ${rate()} por USD` },
      { name: 'promo', label: 'Descuento promocional (%)', type: 'number', min: 0, max: 90, step: 1 },
      { name: 'stock', label: 'Stock disponible', type: 'number', min: 0, step: 1, required: true },
      { name: 'variantes', label: 'Variantes (separadas por coma)', placeholder: 'S, M, L', hint: 'Talla, sabor, peso…' },
      { name: 'descripcion', label: 'Descripción', type: 'textarea', full: true, rows: 3, required: true, maxlength: 600 },
      { name: 'imagen', label: 'URL de imagen (opcional)', type: 'url', full: true, placeholder: 'https://…', hint: 'Si se deja vacío se usa una imagen generada para la demostración.' },
      { name: 'destacado', label: 'Destacado en el catálogo', type: 'checkbox' },
      { name: 'activo', label: 'Visible para clientes', type: 'checkbox' }
    ];
    fields[1].validate = (v) => (db.get('products').some((x) => x.sku.toLowerCase() === v.toLowerCase() && (!p || x.id !== p.id)) ? 'Ese SKU ya existe.' : '');
    ui.formModal({
      title: p ? 'Editar producto' : 'Nuevo producto', size: 'lg', fields,
      values: p ? Object.assign({}, p, { variantes: p.variantes.join(', ') }) : { activo: true, promo: 0, stock: 10, categoria: f.cat || (cats[0] && cats[0].id) },
      onOpen: (el) => {
        const pr = el.querySelector('[name="precio"]');
        const hint = pr.closest('.field').querySelector('.hint');
        const upd = () => { hint.textContent = `≈ ${usd(Number(pr.value) || 0)} (Bs ${rate()} por USD)`; };
        pr.addEventListener('input', upd); upd();
      },
      onSubmit: (v) => {
        const rec = Object.assign({}, p || { id: ui.uid('prd') }, v, { promo: Number(v.promo) || 0, variantes: String(v.variantes || '').split(',').map((x) => x.trim()).filter(Boolean), imagen: v.imagen || '' });
        db.upsert('products', rec);
        ui.toast(p ? 'Producto actualizado' : 'Producto creado', rec.nombre, 'ok');
        render();
        return true;
      }
    });
  }

  function adjustStock(p) {
    ui.formModal({
      title: `Ajustar stock · ${p.nombre}`, subtitle: `Stock actual: ${p.stock}`,
      fields: [{ name: 'tipo', label: 'Movimiento', type: 'select', options: [{ value: 'entrada', label: 'Entrada (compra, devolución)' }, { value: 'salida', label: 'Salida (merma, venta en tienda)' }, { value: 'ajuste', label: 'Fijar cantidad exacta' }] }, { name: 'cantidad', label: 'Cantidad', type: 'number', min: 0, step: 1, required: true }, { name: 'motivo', label: 'Motivo', full: true, placeholder: 'Ej.: compra a proveedor' }],
      submitLabel: 'Aplicar',
      onSubmit: (v) => {
        const n = Number(v.cantidad);
        const next = v.tipo === 'entrada' ? p.stock + n : v.tipo === 'salida' ? p.stock - n : n;
        if (next < 0) return `La salida supera el stock disponible (${p.stock}).`;
        db.update('products', (arr) => { arr.find((x) => x.id === p.id).stock = next; return arr; });
        ui.toast('Stock actualizado', `${p.nombre}: ${p.stock} → ${next}`, 'ok');
        render();
        return true;
      }
    });
  }

  function sendPreview(p) {
    const msg = { id: 'pv', from: 'bot', ts: new Date().toISOString(), payload: WAB.bot.M.product(p) };
    const btn = { id: 'pv2', from: 'bot', ts: new Date().toISOString(), payload: WAB.bot.M.buttons(fmt.money(db.price(p)), [[`add:${p.id}`, 'Agregar al carrito'], ['act:products', 'Seguir viendo']]) };
    const contacts = db.get('contacts').filter((c) => c.consentimiento);
    ui.modal({
      title: 'Enviar producto por WhatsApp', subtitle: 'Vista previa del mensaje interactivo de producto (simulación).', size: 'lg',
      body: `<div class="grid-2"><div class="phone compact wa" id="pv-phone">${WAB.wa.frame({ name: db.get('settings').negocio.nombre })}</div>
        <div class="stack"><div class="field"><label>Enviar a</label><select class="select" id="pv-to">${contacts.map((c) => `<option value="${c.id}">${esc(c.nombre)} · ${esc(c.telefono)}</option>`).join('')}</select><span class="hint">Solo contactos con conversación activa (ventana de 24 h) o mediante plantilla aprobada.</span></div>
        <div class="field"><label>Enlace del producto</label><div class="row"><input class="input" readonly value="${esc(link(p))}"><button class="btn btn-icon" id="pv-copy" aria-label="Copiar">${icon('copy', 'sm')}</button></div></div></div></div>`,
      onOpen: (el) => {
        el.querySelector('#pv-phone .wa-body').insertAdjacentHTML('beforeend', [msg, btn].map((m) => WAB.Phone.prototype.msgHTML.call(null, m)).join(''));
        el.querySelector('#pv-copy').onclick = () => ui.copy(link(p), 'Enlace copiado');
      },
      actions: [{ label: 'Cancelar', kind: 'btn-ghost' }, {
        label: 'Enviar (simulado)', kind: 'btn-primary', icon: 'send', onClick: ({ el }) => {
          const to = el.querySelector('#pv-to').value;
          const conv = db.get('conversations').find((c) => c.contactId === to);
          if (conv) db.update('conversations', (arr) => { const c = arr.find((x) => x.id === conv.id); c.mensajes.push(Object.assign({}, msg, { id: ui.uid('wamid') }), Object.assign({}, btn, { id: ui.uid('wamid') })); c.actualizado = new Date().toISOString(); return arr; });
          ui.toast('Producto enviado (simulación)', conv ? 'Se agregó a la conversación del cliente.' : 'El cliente no tiene conversación: se usaría una plantilla.', 'ok');
        }
      }]
    });
  }

  function categorias() {
    const cats = db.get('categories');
    const ps = db.get('products');
    $('body').innerHTML = `<div class="card"><div class="card-head"><h3>Categorías</h3><button class="btn btn-primary btn-sm" id="add-cat">${icon('plus', 'sm')}Nueva categoría</button></div>
      <div class="list-rows">${cats.map((c) => `<div class="list-row"><span class="kpi-icon" style="background:${c.color};color:#fff">${icon(c.icon)}</span><div class="grow"><strong>${esc(c.nombre)}</strong><small>${ps.filter((p) => p.categoria === c.id).length} productos</small></div><button class="btn btn-ghost btn-icon btn-sm" data-edit="${c.id}" aria-label="Editar">${icon('edit', 'sm')}</button><button class="btn btn-ghost btn-icon btn-sm" data-del="${c.id}" aria-label="Eliminar">${icon('trash', 'sm')}</button></div>`).join('')}</div></div>`;
    const ICONS = ['package', 'tag', 'sparkles', 'smile', 'shield', 'heart', 'star', 'store', 'zap'];
    const edit = (c) => ui.formModal({
      title: c ? 'Editar categoría' : 'Nueva categoría',
      fields: [{ name: 'nombre', label: 'Nombre', required: true, maxlength: 24, full: true }, { name: 'color', label: 'Color', type: 'color' }, { name: 'icon', label: 'Icono', type: 'select', options: ICONS }],
      values: c || { color: '#2a78d6', icon: 'package' },
      onSubmit: (v) => { db.upsert('categories', Object.assign({ id: (c && c.id) || ui.uid('cat') }, v)); render(); ui.toast('Categoría guardada', '', 'ok'); return true; }
    });
    $('add-cat').onclick = () => edit(null);
    $('body').querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => edit(db.category(b.dataset.edit)));
    $('body').querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
      const n = ps.filter((p) => p.categoria === b.dataset.del).length;
      if (n) return ui.toast('No se puede eliminar', `Tiene ${n} productos. Muévalos a otra categoría primero.`, 'warn');
      if (await ui.confirm({ title: 'Eliminar categoría', message: 'La categoría no tiene productos.', confirmLabel: 'Eliminar', danger: true })) { db.remove('categories', b.dataset.del); render(); }
    });
  }

  function catalogo() {
    const cats = db.get('categories');
    let cat = '';
    let q = '';
    $('body').innerHTML = `<div class="card card-pad stack">
      <div class="toolbar"><div class="input-group">${icon('search', 'sm')}<input class="input input-sm" id="cq" placeholder="Buscar en el catálogo" aria-label="Buscar en el catálogo"></div>
      <div class="chips" id="cchips"></div></div>
      <div class="store-grid" id="cgrid"></div></div>`;
    const draw = () => {
      $('cchips').innerHTML = [['', 'Todo']].concat(cats.map((c) => [c.id, c.nombre])).map(([id, n]) => `<button class="chip${id === cat ? ' active' : ''}" data-c="${id}">${esc(n)}</button>`).join('');
      const list = db.get('products').filter((p) => p.activo && (!cat || p.categoria === cat) && (!q || p.nombre.toLowerCase().includes(q)));
      $('cgrid').innerHTML = list.length ? list.map((p) => `<div class="store-card${p.stock <= 0 ? ' soldout' : ''}" data-p="${p.id}">${p.promo ? `<span class="badge danger sc-flag">−${p.promo}%</span>` : p.stock <= 0 ? '<span class="badge sc-flag">Agotado</span>' : ''}<div class="sc-img"><img src="${db.img(p)}" alt="${esc(p.nombre)}" loading="lazy"></div><div class="sc-body"><small>${esc((db.category(p.categoria) || {}).nombre || '')}</small><strong>${esc(p.nombre)}</strong><div class="sc-price">${fmt.money(db.price(p))}${p.promo ? `<s>${fmt.money(p.precio)}</s>` : ''}</div></div></div>`).join('')
        : ui.emptyState({ icon: 'search', title: 'Sin resultados', text: 'Pruebe con otra búsqueda o categoría.' });
    };
    $('cq').oninput = ui.debounce((e) => { q = e.target.value.trim().toLowerCase(); draw(); }, 150);
    $('cchips').onclick = (e) => { const b = e.target.closest('[data-c]'); if (b) { cat = b.dataset.c; draw(); } };
    $('cgrid').onclick = (e) => { const c = e.target.closest('[data-p]'); if (c) detail(db.product(c.dataset.p)); };
    draw();
  }

  function detail(p) {
    const m = ui.modal({
      title: p.nombre, subtitle: `${(db.category(p.categoria) || {}).nombre || ''} · SKU ${p.sku}`, size: 'lg',
      body: `<div class="grid-2"><div style="border-radius:14px;overflow:hidden;aspect-ratio:1"><img src="${db.img(p)}" alt="${esc(p.nombre)}" style="width:100%;height:100%;object-fit:cover"></div>
        <div class="stack"><div><span class="kpi-value">${fmt.money(db.price(p))}</span> ${p.promo ? `<s class="muted">${fmt.money(p.precio)}</s> <span class="badge danger">−${p.promo}%</span>` : ''}<br><small class="muted">${usd(db.price(p))}</small></div>
        <p class="mb-0">${esc(p.descripcion)}</p>
        ${p.variantes.length ? `<div><span class="label">Opciones</span><div class="chips mt-1">${p.variantes.map((v) => `<span class="badge">${esc(v)}</span>`).join('')}</div></div>` : ''}
        <div>${p.stock > 0 ? `<span class="badge ok">${p.stock} disponibles</span>` : '<span class="badge danger">Agotado</span>'}</div>
        <div id="wa-slot"></div></div></div>`,
      actions: [{ label: 'Copiar enlace', icon: 'link', onClick: () => { ui.copy(link(p)); return false; } }, { label: 'Consultar por WhatsApp', kind: 'btn-primary', icon: 'message', onClick: ({ el }) => { openChat(el, p); return false; } }]
    });
    return m;
  }

  async function openChat(el, p) {
    const slot = el.querySelector('#wa-slot');
    if (slot.dataset.on) return;
    slot.dataset.on = '1';
    slot.innerHTML = '<div id="cat-phone"></div>';
    const ph = new WAB.Phone(slot.querySelector('#cat-phone'), { compact: true, flat: true, autoStart: false, quick: ['Menú', 'Ver carrito'] });
    await ph.send({ kind: 'text', text: `Hola, me interesa: ${p.nombre}` });
    ph.send({ kind: 'reply', id: `prd:${p.id}`, title: `Ver ${p.nombre}` });
  }

  document.querySelector('.tabs').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; render(); } };
  $('new').onclick = () => edit(null);
  db.on('*', (v, src) => { if (src === 'external') render(); });
  render();
  const h = location.hash.slice(1);
  if (h && db.product(h)) edit(db.product(h));
})();
