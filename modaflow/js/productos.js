/*
 * Módulos de Productos e Inventario.
 */
(function () {
  const MF = window.MF;
  const D = MF.demo;
  const { esc, money } = MF;
  const st = { q: '', cat: '', pub: '', layout: 'grid', invQ: '', invCat: '', invStatus: '' };
  const SIZES_ALL = ['Única', 'XS', 'S', 'M', 'L', 'XL'];

  const sizesLine = (p, b) => p.variants.map((v) => {
    const n = MF.variantStock(v, b === 'all' ? null : b || MF.branchId());
    const label = MF.can('variantes') && new Set(p.variants.map((x) => x.color)).size > 1 ? `${v.size} ${v.color}` : v.size;
    return `<span class="sz ${n === 0 ? 'out' : n <= 1 ? 'low' : ''}">${esc(label)} <i>${n}</i></span>`;
  }).join('');

  function filtered() {
    const q = st.q.toLowerCase();
    return MF.get().products.filter((p) => (!q || (p.name + ' ' + p.sku + ' ' + p.color + ' ' + p.category).toLowerCase().includes(q)) &&
      (!st.cat || p.category === st.cat) && (!st.pub || (st.pub === 'pub' ? p.published : !p.published)));
  }

  // ---------- Productos ----------
  D.register({
    id: 'productos', label: 'Productos', icon: 'shirt', group: 'Productos',
    sub: () => `${MF.get().products.length} de ${MF.num(MF.plan().limits.products)} productos`,
    render(view, params) {
      const d = MF.get();
      const list = filtered();
      const ai = MF.aiUsage();
      view.innerHTML = `
        <div class="toolbar">
          <div class="search">${MF.icon('search', 'sm')}<input id="pq" placeholder="Buscar por nombre, código o color…" value="${esc(st.q)}"></div>
          <select id="pcat"><option value="">Todas las categorías</option>${d.categories.map((c) => `<option ${c === st.cat ? 'selected' : ''}>${c}</option>`).join('')}</select>
          <select id="ppub"><option value="">Publicados y ocultos</option><option value="pub" ${st.pub === 'pub' ? 'selected' : ''}>Solo publicados</option><option value="hid" ${st.pub === 'hid' ? 'selected' : ''}>Solo ocultos</option></select>
          <div class="view-toggle" style="display:flex;gap:4px"><button class="icon-btn ${st.layout === 'grid' ? 'on' : ''}" data-layout="grid" aria-label="Vista de tarjetas">${MF.icon('grid', 'sm')}</button><button class="icon-btn ${st.layout === 'list' ? 'on' : ''}" data-layout="list" aria-label="Vista de lista">${MF.icon('list', 'sm')}</button></div>
        </div>
        <div class="toolbar">
          <button class="btn ai-cta" id="aiBtn">${MF.icon('sparkles', 'sm')} Registrar con IA <span class="badge" style="background:rgba(255,255,255,.2);color:#fff">${ai.left} de ${ai.limit}</span></button>
          <button class="btn primary" id="newBtn">${MF.icon('plus', 'sm')} Nuevo producto</button>
          <span class="spacer"></span>
          ${MF.can('exportar') ? `<button class="btn ghost sm" id="expBtn">${MF.icon('download', 'sm')} Exportar a Excel</button>` : `<button class="btn ghost sm" data-lock="exportar">${MF.icon('lock', 'sm')} Exportar a Excel · Pro</button>`}
          ${MF.can('importar') ? `<button class="btn ghost sm" id="impBtn">${MF.icon('upload', 'sm')} Importar desde Excel</button>` : `<button class="btn ghost sm" data-lock="importar">${MF.icon('lock', 'sm')} Importar · Premium</button>`}
        </div>
        <div class="panel ai-usage-panel"><div class="panel-head"><h3>${MF.icon('sparkles', 'sm')} Consumo de IA</h3><button class="link-btn" id="aiHist">Ver historial ${MF.icon('chevronRight', 'sm')}</button></div>${MF.AI.usagePanel(true)}</div>
        ${list.length ? (st.layout === 'grid' ? gridHTML(list) : listHTML(list)) : `<div class="panel empty">${MF.icon('search')}<p>No hay productos con esos filtros.</p></div>`}`;
      bindList(view);
      if (params.ia) { history.replaceState(null, '', '#/productos'); openAI(); }
      if (params.nuevo) { history.replaceState(null, '', '#/productos'); editor(); }
      if (params.edit) { history.replaceState(null, '', '#/productos'); editor(MF.product(params.edit)); }
    }
  });

  function badges(p) {
    const pr = MF.promoFor(p);
    return `${!p.published ? '<span class="badge neutral">Oculto</span>' : ''}${p.featured && MF.can('destacados') ? '<span class="badge violet">Destacado</span>' : ''}${pr ? `<span class="badge pink">-${pr.percent}%</span>` : ''}${p.source === 'ia' ? `<span class="badge info">${MF.icon('sparkles', 'sm')} IA</span>` : ''}`;
  }
  const priceHTML = (p) => { const e = MF.price(p); return e !== p.price ? `<span class="price">${money(e)}</span> <s class="muted" style="font-size:.78rem">${money(p.price)}</s>` : `<span class="price">${money(p.price)}</span>`; };

  function gridHTML(list) {
    return `<div class="p-grid">${list.map((p) => {
      const s = MF.stock(p);
      const ss = MF.stockStatus(s, p);
      return `<article class="p-card"><div class="pic">${MF.photo(p)}<div class="badges">${badges(p)}</div></div>
        <div class="info"><b>${esc(p.name)}</b><small>${esc(p.category)} · ${esc(p.color)} · ${p.sku}</small>
          <div class="meta"><span>${priceHTML(p)}</span><span class="badge ${ss.key === 'ok' ? 'ok' : ss.key === 'bajo' ? 'warn' : 'bad'}">${s} u.</span></div>
          <div class="stock-bar">${sizesLine(p)}</div></div>
        <div class="foot"><label class="switch" title="Publicar en el catálogo"><input type="checkbox" data-pub="${p.id}" ${p.published ? 'checked' : ''}><span></span>Catálogo</label>
          <button class="icon-btn" data-edit="${p.id}" aria-label="Editar">${MF.icon('edit', 'sm')}</button><button class="icon-btn" data-del="${p.id}" aria-label="Eliminar">${MF.icon('trash', 'sm')}</button></div></article>`;
    }).join('')}</div>`;
  }
  function listHTML(list) {
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Producto</th><th>Categoría</th><th class="num">Precio</th>${MF.can('costos') ? '<th class="num">Costo</th><th class="num">Margen</th>' : ''}<th>Tallas</th><th class="num">Stock</th><th>Catálogo</th><th></th></tr></thead><tbody>
      ${list.map((p) => `<tr><td><div class="prod">${MF.photo(p, 'thumb')}<div><b>${esc(p.name)}</b><small>${p.sku} · ${esc(p.color)}</small> ${badges(p)}</div></div></td><td>${esc(p.category)}</td>
        <td class="num">${priceHTML(p)}</td>${MF.can('costos') ? `<td class="num">${money(p.cost)}</td><td class="num">${p.price ? Math.round(((p.price - p.cost) / p.price) * 100) : 0}%</td>` : ''}
        <td><div class="stock-bar">${sizesLine(p)}</div></td><td class="num stock-pill">${MF.stock(p)}</td>
        <td><label class="switch"><input type="checkbox" data-pub="${p.id}" ${p.published ? 'checked' : ''}><span></span></label></td>
        <td><div class="row-actions"><button class="icon-btn" data-edit="${p.id}" aria-label="Editar">${MF.icon('edit', 'sm')}</button><button class="icon-btn" data-del="${p.id}" aria-label="Eliminar">${MF.icon('trash', 'sm')}</button></div></td></tr>`).join('')}
      </tbody></table></div>`;
  }

  function bindList(view) {
    const q = view.querySelector('#pq');
    q.addEventListener('input', () => { st.q = q.value; const pos = q.selectionStart; D.rerender(); const n = document.querySelector('#pq'); n.focus(); n.setSelectionRange(pos, pos); });
    view.querySelector('#pcat').addEventListener('change', (e) => { st.cat = e.target.value; D.rerender(); });
    view.querySelector('#ppub').addEventListener('change', (e) => { st.pub = e.target.value; D.rerender(); });
    view.querySelectorAll('[data-layout]').forEach((b) => b.addEventListener('click', () => { st.layout = b.dataset.layout; D.rerender(); }));
    view.querySelector('#aiBtn').addEventListener('click', openAI);
    view.querySelector('#newBtn').addEventListener('click', () => editor());
    const exp = view.querySelector('#expBtn');
    if (exp) exp.addEventListener('click', exportProducts);
    view.querySelector('#aiHist').addEventListener('click', () => MF.modal({ title: `${MF.icon('sparkles', 'sm')} Historial de análisis con IA`, size: 'lg', noFocus: true,
      body: MF.AI.usagePanel() + '<div style="margin-top:14px"></div>' + MF.AI.historyTable() + '<p class="muted" style="font-size:.8rem;margin-top:12px">Contadores de demostración guardados en este navegador. El consumo real facturado se ve en la consola de Anthropic (Usage y Cost). El servidor muestra su total en /api/ia/estado.</p>' }));
    const imp = view.querySelector('#impBtn');
    if (imp) imp.addEventListener('click', importDialog);
    view.querySelectorAll('[data-pub]').forEach((c) => c.addEventListener('change', () => {
      const p = MF.product(c.dataset.pub);
      p.published = c.checked;
      MF.audit('producto', `${p.published ? 'Publicó' : 'Ocultó'} "${p.name}" en el catálogo`);
      MF.save();
      MF.toast(p.published ? 'Publicado en el catálogo' : 'Oculto del catálogo');
      D.rerender();
    }));
    view.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => editor(MF.product(b.dataset.edit))));
    view.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      const p = MF.product(b.dataset.del);
      if (!(await MF.confirmDialog(`¿Eliminar "${esc(p.name)}"? Las ventas pasadas se conservan en el historial.`, 'Eliminar', true))) return;
      const d = MF.get();
      d.products = d.products.filter((x) => x.id !== p.id);
      MF.audit('producto', `Eliminó el producto "${p.name}"`);
      MF.save(); MF.toast('Producto eliminado'); D.rerender();
    }));
  }

  // ---------- Registro con IA (Claude) ----------
  function openAI() {
    if (!MF.canAddProduct()) { MF.toast(`Llegó al límite de ${MF.plan().limits.products} productos de su plan.`, 'error'); return; }
    const ai = MF.aiUsage();
    const m = MF.modal({ title: `${MF.icon('sparkles', 'sm')} Registrar con IA <span class="badge violet" style="margin-left:6px">${ai.left} de ${ai.limit} este mes</span>`, size: 'lg', body: '<div id="aiHost"></div>', noFocus: true });
    MF.AI.wizard(m.el.querySelector('#aiHost'), {
      showCost: MF.can('costos'),
      onManual() { m.close(); editor(); },
      onUsage() { D.rerender(); const u = MF.aiUsage(); const b = m.el.querySelector('.modal-head .badge'); if (b) b.textContent = `${u.left} de ${u.limit} este mes`; },
      onSaved() { D.rerender(); },
      doneActions: (p) => `<button class="btn primary" data-close>${MF.icon('check', 'sm')} Listo</button><button class="btn ghost" data-editnew="${p.id}">${MF.icon('edit', 'sm')} Editar detalles</button>`
    });
    m.el.addEventListener('click', (e) => { const b = e.target.closest('[data-editnew]'); if (b) { m.close(); editor(MF.product(b.dataset.editnew)); } });
  }

  // ---------- Editor ----------
  function editor(p) {
    const isNew = !p;
    if (isNew && !MF.canAddProduct()) { MF.toast(`Llegó al límite de ${MF.plan().limits.products} productos de su plan.`, 'error'); return; }
    const d = MF.get();
    const draft = p ? JSON.parse(JSON.stringify(p)) : { name: '', category: 'Blusas', color: 'Negro', colorHex: MF.COLORS.Negro, price: '', cost: '', desc: '', published: true, featured: false, minStock: 2, photo: null, variants: [{ size: 'S', color: 'Negro', stock: { b1: 0, b2: 0, b3: 0 } }, { size: 'M', color: 'Negro', stock: { b1: 0, b2: 0, b3: 0 } }] };
    const b = MF.branchId();
    const multiColor = MF.can('variantes');
    const m = MF.modal({
      title: isNew ? 'Nuevo producto' : 'Editar producto', size: 'lg',
      body: `<form id="pf" class="form-grid" autocomplete="off">
        <div class="full photo-pick"><div class="prev" id="prev">${MF.photo(draft)}</div>
          <div><span class="lbl">Fotografía</span><label class="btn ghost sm" style="display:inline-flex;width:auto">${MF.icon('camera', 'sm')} Subir o tomar foto<input type="file" accept="image/*" id="ph" hidden></label>
          ${draft.photo ? '<button type="button" class="btn ghost sm" id="rmPh">Quitar</button>' : ''}<p class="muted" style="font-size:.78rem;margin:6px 0 0">La foto se reduce y se guarda solo en este navegador.</p>
          <button type="button" class="btn ai-cta sm" id="aiAnalyze" style="margin-top:8px" ${draft.photo ? '' : 'disabled'}>${MF.icon('sparkles', 'sm')} Analizar fotografía con IA</button></div></div>
        <div class="full" id="aiBox"></div>
        <label class="full">Nombre <input name="name" required value="${esc(draft.name)}" placeholder="Ej. Blusa roja de seda"></label>
        <label>Categoría <select name="category">${d.categories.map((c) => `<option ${c === draft.category ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
        <label>Color principal <select name="color">${Object.keys(MF.COLORS).map((c) => `<option ${c === draft.color ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
        <label>Precio de venta (Bs) <input name="price" type="number" min="0" step="1" required value="${draft.price}"></label>
        ${MF.can('costos') ? `<label>Costo (Bs) <input name="cost" type="number" min="0" step="1" value="${draft.cost}"></label>` : `<div><span class="lbl">Costo</span>${D.lockMini('costos', 'Registro de costos y ganancias')}</div>`}
        <label class="full">Descripción detallada <textarea name="desc" rows="2">${esc(draft.desc)}</textarea></label>
        <details class="full ai-details" ${draft.garmentType || draft.tags ? 'open' : ''}><summary>Detalles de la prenda (tipo, estilo, características y etiquetas)</summary><div class="form-grid" style="margin-top:10px">${MF.AI.detailFields(draft)}</div></details>
        <div class="full"><span class="lbl">Tallas${multiColor ? ' y colores' : ''} · existencias en ${esc(MF.branchName(b))}</span>
          <table class="var-table"><thead><tr><th>Talla</th>${multiColor ? '<th>Color</th>' : ''}<th>Cantidad</th><th></th></tr></thead><tbody id="vars"></tbody></table>
          <div class="actions start" style="margin-top:6px"><button type="button" class="btn ghost sm" id="addVar">${MF.icon('plus', 'sm')} Agregar talla${multiColor ? ' / color' : ''}</button>${multiColor ? '' : D.lockPill('variantes')}</div></div>
        ${MF.can('alertas') ? `<label>Alerta de stock bajo (unidades) <input name="minStock" type="number" min="0" value="${draft.minStock}"></label>` : ''}
        <label class="switch"><input type="checkbox" name="published" ${draft.published ? 'checked' : ''}><span></span> Publicar en el catálogo</label>
        ${MF.can('destacados') ? `<label class="switch"><input type="checkbox" name="featured" ${draft.featured ? 'checked' : ''}><span></span> Producto destacado</label>` : ''}
      </form>`,
      footer: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="saveP">${MF.icon('check', 'sm')} ${isNew ? 'Guardar producto' : 'Guardar cambios'}</button>`
    });
    const el = m.el;
    function drawVars() {
      el.querySelector('#vars').innerHTML = draft.variants.map((v, i) => `<tr>
        <td><select data-vs="${i}">${SIZES_ALL.concat(SIZES_ALL.includes(v.size) ? [] : [v.size]).map((s) => `<option ${s === v.size ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
        ${multiColor ? `<td><select data-vc="${i}">${Object.keys(MF.COLORS).map((c) => `<option ${c === v.color ? 'selected' : ''}>${c}</option>`).join('')}</select></td>` : ''}
        <td><input type="number" min="0" data-vq="${i}" value="${v.stock[b] || 0}" style="max-width:110px"></td>
        <td><button type="button" class="icon-btn" data-vr="${i}" aria-label="Quitar">${MF.icon('x', 'sm')}</button></td></tr>`).join('');
      el.querySelectorAll('[data-vs]').forEach((s) => s.addEventListener('change', () => { draft.variants[s.dataset.vs].size = s.value; }));
      el.querySelectorAll('[data-vc]').forEach((s) => s.addEventListener('change', () => { draft.variants[s.dataset.vc].color = s.value; }));
      el.querySelectorAll('[data-vq]').forEach((s) => s.addEventListener('input', () => { draft.variants[s.dataset.vq].stock[b] = Math.max(0, +s.value || 0); }));
      el.querySelectorAll('[data-vr]').forEach((s) => s.addEventListener('click', () => { if (draft.variants.length > 1) { draft.variants.splice(+s.dataset.vr, 1); drawVars(); } }));
    }
    drawVars();
    el.querySelector('#addVar').addEventListener('click', () => {
      const color = el.querySelector('[name=color]').value;
      draft.variants.push({ size: 'L', color, stock: { b1: 0, b2: 0, b3: 0 } });
      drawVars();
    });
    el.querySelector('[name=color]').addEventListener('change', (e) => { if (!multiColor) draft.variants.forEach((v) => { v.color = e.target.value; }); });
    el.querySelector('#ph').addEventListener('change', async (e) => {
      try { draft.photo = await MF.readImage(e.target.files[0], 640, 0.78); el.querySelector('#prev').innerHTML = MF.photo(draft); el.querySelector('#aiAnalyze').disabled = false; el.querySelector('#aiBox').innerHTML = ''; }
      catch (err) { MF.toast('No se pudo leer la imagen', 'error'); }
    });
    const rm = el.querySelector('#rmPh');
    if (rm) rm.addEventListener('click', () => { draft.photo = null; el.querySelector('#prev').innerHTML = MF.photo(draft); rm.remove(); el.querySelector('#aiAnalyze').disabled = true; });
    // Analiza la foto del formulario con Claude y completa los campos (todos siguen editables)
    let photoForAI = null;
    el.querySelector('#ph').addEventListener('change', (e) => { photoForAI = e.target.files[0] || null; });
    el.querySelector('#aiAnalyze').addEventListener('click', async () => {
      const btn = el.querySelector('#aiAnalyze');
      const box = el.querySelector('#aiBox');
      btn.disabled = true;
      box.innerHTML = `<div class="ai-working inline" role="status"><span class="ai-spinner"></span><b>Identificando tu prenda con inteligencia artificial...</b></div>`;
      try {
        const payload = photoForAI ? await MF.AI.readFile(photoForAI) : await MF.AI.toPayload(draft.photo);
        const data = await MF.AI.analyze(payload);
        const r = data.result;
        if (r.es_prenda) {
          const det = el.querySelector('.ai-details'); if (det) det.open = true;
          MF.AI.fill(el.querySelector('#pf'), r);
          draft.aiMeta = { model: data.model, confianza: r.confianza, fecha: new Date().toISOString() };
          if (!draft.source || draft.source === 'manual') draft.source = 'ia';
        }
        box.innerHTML = MF.AI.notices(r) + (r.es_prenda ? `<div class="ai-note ok">${MF.icon('checkCircle', 'sm')}<span>Campos completados por la IA (confianza ${esc(r.confianza)}). Revíselos antes de guardar.</span></div>` : '') +
          `<div class="ai-meta">${MF.icon('sparkles', 'sm')} <code>${esc(data.model)}</code> · ${MF.AI.costLine(data)} <button type="button" class="link-btn" id="aiRe">${MF.icon('refresh', 'sm')} Volver a analizar</button></div>`;
        el.querySelector('#aiRe').addEventListener('click', () => el.querySelector('#aiAnalyze').click());
        D.rerender();
      } catch (err) {
        box.innerHTML = `<div class="ai-note bad">${MF.icon('alert', 'sm')}<span><b>No se pudo analizar la foto.</b> ${esc(err.message)} No se descontó ningún crédito.</span></div>`;
      } finally { btn.disabled = !draft.photo; }
    });
    el.querySelector('#saveP').addEventListener('click', () => {
      const f = el.querySelector('#pf');
      if (!f.reportValidity()) return;
      const fd = new FormData(f);
      const keys = draft.variants.map((v) => v.size + '|' + v.color);
      if (new Set(keys).size !== keys.length) { MF.toast('Hay tallas repetidas con el mismo color', 'error'); return; }
      Object.assign(draft, {
        name: fd.get('name').trim(), category: fd.get('category'), color: fd.get('color'), colorHex: MF.COLORS[fd.get('color')],
        price: +fd.get('price') || 0, desc: fd.get('desc'), published: fd.get('published') === 'on'
      }, MF.AI.readDetails(fd));
      if (MF.can('costos')) draft.cost = +fd.get('cost') || 0;
      if (MF.can('alertas')) draft.minStock = +fd.get('minStock') || 0;
      if (MF.can('destacados')) draft.featured = fd.get('featured') === 'on';
      if (isNew) {
        const np = MF.AI.addProduct({ name: draft.name, category: draft.category, color: draft.color, description: draft.desc, price: draft.price, cost: draft.cost, published: draft.published, photo: draft.photo, variants: [], source: 'manual' });
        Object.assign(np, { variants: draft.variants, featured: !!draft.featured, minStock: draft.minStock, source: draft.source || 'manual' }, MF.AI.readDetails(fd), draft.aiMeta ? { aiMeta: draft.aiMeta } : {});
        MF.save();
        MF.toast('Producto registrado');
      } else {
        if (p.price !== draft.price) MF.audit('producto', `Cambió el precio de "${p.name}" de Bs ${p.price} a Bs ${draft.price}`);
        else MF.audit('producto', `Editó el producto "${draft.name}"`);
        Object.assign(p, draft);
        MF.save();
        MF.toast('Cambios guardados');
      }
      m.close();
      D.rerender();
    });
  }

  function exportProducts() {
    const rows = [['Código', 'Nombre', 'Categoría', 'Color', 'Talla', 'Color variante', 'Stock', 'Precio (Bs)', 'Costo (Bs)', 'Publicado']];
    MF.get().products.forEach((p) => p.variants.forEach((v) => rows.push([p.sku, p.name, p.category, p.color, v.size, v.color, MF.variantStock(v, MF.branchId()), p.price, p.cost, p.published ? 'Sí' : 'No'])));
    MF.downloadCSV('productos-mioshop.csv', rows);
    MF.toast('Archivo descargado (se abre con Excel)');
  }

  // ---------- Importación (Premium) ----------
  const TEMPLATE = [['nombre', 'categoria', 'color', 'precio', 'costo', 'talla', 'cantidad'],
    ['Falda plisada', 'Conjuntos', 'Negro', '150', '75', 'S', '3'], ['Falda plisada', 'Conjuntos', 'Negro', '150', '75', 'M', '4'],
    ['Polera básica', 'Tops', 'Blanco', '60', '25', 'M', '10'], ['Vestido camisero', 'Vestidos', 'Azul', '220', '115', 'M', '2']];
  function importDialog() {
    const m = MF.modal({
      title: 'Importar productos desde Excel', size: 'lg',
      body: `<p>Guarde su planilla como <b>CSV</b> con las columnas: nombre, categoría, color, precio, costo, talla y cantidad (una fila por talla).</p>
        <div class="actions start"><button class="btn ghost sm" id="tpl">${MF.icon('download', 'sm')} Descargar plantilla</button>
        <label class="btn primary sm" style="display:inline-flex;width:auto">${MF.icon('upload', 'sm')} Elegir archivo CSV<input type="file" accept=".csv,text/csv" id="csv" hidden></label>
        <button class="btn ghost sm" id="sample">Usar archivo de ejemplo</button></div><div id="impPrev" style="margin-top:16px"></div>`,
      noFocus: true
    });
    const el = m.el;
    el.querySelector('#tpl').addEventListener('click', () => MF.downloadCSV('plantilla-productos.csv', TEMPLATE));
    el.querySelector('#sample').addEventListener('click', () => preview(TEMPLATE));
    el.querySelector('#csv').addEventListener('change', (e) => {
      const fr = new FileReader();
      fr.onload = () => preview(fr.result.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim()).map((l) => l.split(/[;,]/).map((c) => c.replace(/^"|"$/g, '').trim())));
      fr.readAsText(e.target.files[0]);
    });
    function preview(rows) {
      const body = rows.slice(1).filter((r) => r[0]);
      const groups = {};
      body.forEach((r) => { (groups[r[0]] = groups[r[0]] || []).push(r); });
      const names = Object.keys(groups);
      el.querySelector('#impPrev').innerHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Producto</th><th>Categoría</th><th>Color</th><th class="num">Precio</th><th>Tallas</th></tr></thead><tbody>
        ${names.map((n) => { const g = groups[n]; return `<tr><td>${esc(n)}</td><td>${esc(g[0][1])}</td><td>${esc(g[0][2])}</td><td class="num">${money(+g[0][3])}</td><td>${g.map((r) => `${esc(r[5])}: ${+r[6] || 0}`).join(', ')}</td></tr>`; }).join('')}</tbody></table></div>
        <div class="actions" style="margin-top:12px"><span class="muted">${names.length} productos listos para importar</span><button class="btn primary" id="doImp">Importar ${names.length} productos</button></div>`;
      el.querySelector('#doImp').addEventListener('click', () => {
        let n = 0;
        names.forEach((name) => {
          if (!MF.canAddProduct()) return;
          const g = groups[name];
          const cat = MF.get().categories.includes(g[0][1]) ? g[0][1] : 'Blusas';
          const color = MF.COLORS[g[0][2]] ? g[0][2] : 'Negro';
          MF.AI.addProduct({ name, category: cat, color, price: +g[0][3] || 0, cost: +g[0][4] || 0, published: false, variants: g.map((r) => ({ size: r[5] || 'Única', qty: +r[6] || 0 })), keepEmpty: true, source: 'importacion' });
          n++;
        });
        MF.audit('importacion', `Importó ${n} productos desde Excel`);
        MF.save(); m.close(); MF.toast(`${n} productos importados (ocultos del catálogo hasta revisarlos)`); D.rerender();
      });
    }
  }

  // ---------- Inventario ----------
  D.register({
    id: 'inventario', label: 'Inventario', icon: 'package', group: 'Productos',
    sub: () => 'Existencias en ' + MF.branchName(MF.branchId()),
    render(view) {
      const d = MF.get();
      const b = MF.branchId();
      const multi = MF.can('sucursales');
      const q = st.invQ.toLowerCase();
      const rows = d.products.filter((p) => {
        const s = MF.stock(p);
        const k = MF.stockStatus(s, p).key;
        return (!q || (p.name + p.sku + p.color).toLowerCase().includes(q)) && (!st.invCat || p.category === st.invCat) && (!st.invStatus || st.invStatus === k);
      });
      const units = d.products.reduce((s, p) => s + MF.stock(p), 0);
      const value = d.products.reduce((s, p) => s + MF.stock(p) * p.cost, 0);
      const low = d.products.filter((p) => { const s = MF.stock(p); return s > 0 && s <= p.minStock; });
      const out = d.products.filter((p) => MF.stock(p) === 0);
      const reservedTotal = d.orders.filter((o) => MF.OPEN_ORDER.includes(o.status)).reduce((s, o) => s + o.items.reduce((a, i) => a + i.qty, 0), 0);
      view.innerHTML = `
        <div class="kpis">
          <div class="kpi"><div class="k-ic">${MF.icon('package')}</div><small>Unidades en ${esc(MF.branchName(b))}</small><b>${units}</b><em>${d.products.length} productos</em></div>
          ${MF.can('costos') ? `<div class="kpi mint"><div class="k-ic">${MF.icon('coins')}</div><small>Valor del inventario (costo)</small><b>${money(value)}</b></div>` : `<div class="kpi locked" data-lock="costos"><div class="k-ic">${MF.icon('lock')}</div><small>Valor del inventario</small><b>Bs 00.000</b><em>Desde Pro</em></div>`}
          <div class="kpi amber"><div class="k-ic">${MF.icon('alert')}</div><small>Stock bajo</small><b>${low.length}</b></div>
          <div class="kpi pink"><div class="k-ic">${MF.icon('x')}</div><small>Agotados</small><b>${out.length}</b></div>
          <div class="kpi"><div class="k-ic">${MF.icon('clock')}</div><small>Reservado por pedidos</small><b>${reservedTotal}</b><em>Aún no descontado</em></div>
        </div>
        ${MF.can('alertas') ? (low.length + out.length ? `<div class="alert-strip">${MF.icon('alert', 'sm')}<span><b>Alertas de inventario:</b> ${[...out, ...low].slice(0, 4).map((p) => esc(p.name)).join(', ')}${low.length + out.length > 4 ? '…' : ''}</span><button class="btn ghost sm" data-fstatus="bajo">Ver stock bajo</button></div>` : '') : `<div style="margin-bottom:14px">${D.lockMini('alertas', 'Alertas automáticas de inventario bajo')}</div>`}
        <div class="toolbar">
          <div class="search">${MF.icon('search', 'sm')}<input id="iq" placeholder="Buscar producto…" value="${esc(st.invQ)}"></div>
          <select id="icat"><option value="">Todas las categorías</option>${d.categories.map((c) => `<option ${c === st.invCat ? 'selected' : ''}>${c}</option>`).join('')}</select>
          <select id="ist"><option value="">Todos los estados</option><option value="ok" ${st.invStatus === 'ok' ? 'selected' : ''}>Disponible</option><option value="bajo" ${st.invStatus === 'bajo' ? 'selected' : ''}>Stock bajo</option><option value="agotado" ${st.invStatus === 'agotado' ? 'selected' : ''}>Agotado</option></select>
          ${MF.can('transferencias') ? `<button class="btn primary sm" id="trBtn">${MF.icon('transfer', 'sm')} Transferir entre sucursales</button>` : `<button class="btn ghost sm" data-lock="transferencias">${MF.icon('lock', 'sm')} Transferencias · Premium</button>`}
          ${MF.can('exportar') ? `<button class="btn ghost sm" id="invExp">${MF.icon('download', 'sm')} Excel</button>` : ''}
        </div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Producto</th><th>${MF.can('variantes') ? 'Tallas y colores' : 'Tallas'}</th>${multi ? MF.branches().map((x) => `<th class="num">${esc(x.name)}</th>`).join('') : ''}<th class="num">Disponible</th><th>Estado</th><th></th></tr></thead><tbody>
          ${rows.map((p) => { const s = MF.stock(p); const ss = MF.stockStatus(s, p); const r = MF.reserved(p.id);
            return `<tr><td><div class="prod">${MF.photo(p, 'thumb')}<div><b>${esc(p.name)}</b><small>${p.sku} · ${esc(p.category)}</small></div></div></td>
            <td><div class="stock-bar">${sizesLine(p, b)}</div>${r ? `<small class="muted">${r} reservada(s) por pedidos</small>` : ''}</td>
            ${multi ? MF.branches().map((x) => `<td class="num ${x.id === b ? 'stock-pill' : ''}">${MF.stock(p, x.id)}</td>`).join('') : ''}
            <td class="num stock-pill">${s}</td><td><span class="badge ${ss.key === 'ok' ? 'ok' : ss.key === 'bajo' ? 'warn' : 'bad'}">${ss.label}</span></td>
            <td><div class="row-actions"><button class="btn ghost sm" data-adj="${p.id}">${MF.icon('edit', 'sm')} Ajustar</button></div></td></tr>`; }).join('') || `<tr><td colspan="8" class="empty">Sin resultados</td></tr>`}
        </tbody></table></div>
        ${MF.can('transferencias') ? transfersHTML() : ''}`;
      const iq = view.querySelector('#iq');
      iq.addEventListener('input', () => { st.invQ = iq.value; const pos = iq.selectionStart; D.rerender(); const n = document.querySelector('#iq'); n.focus(); n.setSelectionRange(pos, pos); });
      view.querySelector('#icat').addEventListener('change', (e) => { st.invCat = e.target.value; D.rerender(); });
      view.querySelector('#ist').addEventListener('change', (e) => { st.invStatus = e.target.value; D.rerender(); });
      view.querySelectorAll('[data-fstatus]').forEach((x) => x.addEventListener('click', () => { st.invStatus = x.dataset.fstatus; D.rerender(); }));
      view.querySelectorAll('[data-adj]').forEach((x) => x.addEventListener('click', () => adjust(MF.product(x.dataset.adj))));
      const tr = view.querySelector('#trBtn');
      if (tr) tr.addEventListener('click', () => transfer());
      const ie = view.querySelector('#invExp');
      if (ie) ie.addEventListener('click', exportProducts);
    }
  });

  function transfersHTML() {
    const d = MF.get();
    return `<div class="panel" style="margin-top:16px"><div class="panel-head"><h3>Transferencias recientes</h3></div>
      <ul class="list">${d.transfers.slice().reverse().slice(0, 6).map((t) => `<li><span class="ic">${MF.icon('transfer', 'sm')}</span><div class="grow"><b>${t.items.map((i) => `${i.qty} × ${esc((MF.product(i.productId) || {}).name || 'Producto')} (${i.size})`).join(', ')}</b><small>${esc(MF.branchName(t.from))} → ${esc(MF.branchName(t.to))} · ${MF.fdate(t.date, true)} · ${esc(MF.userName(t.userId))}</small></div><span class="badge ok">Recibida</span></li>`).join('') || '<li class="empty">Sin transferencias</li>'}</ul></div>`;
  }

  function adjust(p) {
    const b = MF.branchId();
    const m = MF.modal({
      title: 'Ajustar inventario', size: 'sm',
      body: `<div class="prod" style="display:flex;gap:10px;align-items:center;margin-bottom:14px">${MF.photo(p, 'thumb')}<div><b>${esc(p.name)}</b><br><small class="muted">${esc(MF.branchName(b))}</small></div></div>
        <form id="af" class="form-grid">${p.variants.map((v, i) => `<label>${esc(v.size)}${MF.can('variantes') ? ' · ' + esc(v.color) : ''} <input type="number" min="0" data-ai="${i}" value="${v.stock[b] || 0}"></label>`).join('')}
        <label class="full">Motivo <select name="reason"><option>Conteo físico</option><option>Ingreso de mercadería</option><option>Prenda dañada</option><option>Corrección</option></select></label></form>`,
      footer: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="saveAdj">Guardar ajuste</button>`
    });
    m.el.querySelector('#saveAdj').addEventListener('click', () => {
      const changes = [];
      m.el.querySelectorAll('[data-ai]').forEach((inp) => {
        const v = p.variants[inp.dataset.ai];
        const nv = Math.max(0, +inp.value || 0);
        if (nv !== (v.stock[b] || 0)) { changes.push(`${v.size} (${nv - (v.stock[b] || 0) > 0 ? '+' : ''}${nv - (v.stock[b] || 0)})`); v.stock[b] = nv; }
      });
      if (changes.length) MF.audit('inventario', `Ajuste de inventario (${m.el.querySelector('[name=reason]').value}): ${p.name} ${changes.join(', ')}`);
      MF.save(); m.close(); MF.toast('Inventario actualizado'); D.rerender();
    });
  }

  function transfer() {
    const d = MF.get();
    const brs = MF.branches();
    const prodOpts = d.products.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
    const m = MF.modal({
      title: 'Transferir entre sucursales', size: 'sm',
      body: `<form id="tf" class="form-grid">
        <label>Desde <select name="from">${brs.map((x) => `<option value="${x.id}" ${x.id === MF.branchId() ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
        <label>Hacia <select name="to">${brs.map((x, i) => `<option value="${x.id}" ${i === 1 ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
        <label class="full">Producto <select name="pid">${prodOpts}</select></label>
        <label>Talla <select name="var"></select></label><label>Cantidad <input name="qty" type="number" min="1" value="1"></label>
        <p class="full muted" id="tfInfo" style="margin:0;font-size:.84rem"></p></form>`,
      footer: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="doTr">Transferir</button>`
    });
    const f = m.el.querySelector('#tf');
    const fillVars = () => {
      const p = MF.product(f.pid.value);
      f.var.innerHTML = p.variants.map((v, i) => `<option value="${i}">${esc(v.size)} · ${esc(v.color)} (${v.stock[f.from.value] || 0} disp.)</option>`).join('');
    };
    f.pid.addEventListener('change', fillVars); f.from.addEventListener('change', fillVars); fillVars();
    m.el.querySelector('#doTr').addEventListener('click', () => {
      const p = MF.product(f.pid.value);
      const v = p.variants[+f.var.value];
      const qty = +f.qty.value || 0;
      if (f.from.value === f.to.value) return MF.toast('Elija sucursales distintas', 'error');
      if (qty < 1 || (v.stock[f.from.value] || 0) < qty) return MF.toast('No hay stock suficiente en la sucursal de origen', 'error');
      v.stock[f.from.value] -= qty;
      v.stock[f.to.value] = (v.stock[f.to.value] || 0) + qty;
      d.transfers.push({ id: MF.uid('t'), date: new Date().toISOString(), from: f.from.value, to: f.to.value, items: [{ productId: p.id, size: v.size, qty }], userId: d.settings.userId, status: 'recibida' });
      MF.audit('transferencia', `Transfirió ${qty} u. de "${p.name}" (${v.size}) de ${MF.branchName(f.from.value)} a ${MF.branchName(f.to.value)}`);
      MF.save(); m.close(); MF.toast('Transferencia registrada'); D.rerender();
    });
  }
})();
