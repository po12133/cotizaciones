/*
 * Registro de prendas, Inventario y Movimientos.
 * Producto = ficha de una prenda (cuenta para el límite del plan). Stock = unidades disponibles de sus variantes.
 */
(function () {
  const MF = window.MF;
  const D = MF.demo;
  const { esc, money } = MF;
  const st = { q: '', cat: '', status: '', layout: 'cards', movQ: '', movType: '' };
  const SIZES_ALL = ['Única', 'XS', 'S', 'M', 'L', 'XL'];
  const badgeCls = (k) => (k === 'ok' ? 'ok' : k === 'bajo' ? 'warn' : 'bad');
  const multiColor = (p) => new Set(p.variants.map((x) => x.color)).size > 1;

  const sizesLine = (p, b) => p.variants.map((v) => {
    const n = MF.variantStock(v, b === 'all' ? null : b || MF.branchId());
    return `<span class="sz ${n === 0 ? 'out' : n <= 1 ? 'low' : ''}">${esc(multiColor(p) ? `${v.size} ${v.color}` : v.size)} <i>${n}</i></span>`;
  }).join('');

  // ---------- Registrar prenda (página completa, pensada para el celular) ----------
  D.register({
    id: 'registrar', label: 'Registrar prenda', short: 'Registrar', icon: 'camera', title: 'Registrar prenda',
    sub: () => { const a = MF.aiUsage(); return `${MF.get().products.length} de ${MF.num(MF.plan().limits.products)} productos · ${a.left} análisis con IA ${a.total ? 'disponibles' : 'este mes'}`; },
    render(view, params) {
      if (MF.readOnly()) { view.innerHTML = `<div class="panel empty">${MF.icon('lock')}<p>${esc(MF.READ_ONLY_MSG)}</p><button class="btn grad" data-try="basico">Elegir plan</button></div>`; return; }
      if (!MF.canAddProduct()) {
        const next = MF.PLANS.find((p) => p.limits.products > MF.plan().limits.products && !p.trial);
        view.innerHTML = `<div class="panel empty">${MF.icon('package')}<p>Llegó al límite de <b>${MF.num(MF.plan().limits.products)} productos</b> del plan ${MF.plan().name}. Recuerde: una prenda con varias unidades cuenta como 1 producto.</p>
          ${next ? `<button class="btn grad" data-try="${next.id}">Probar plan ${next.name} (${MF.num(next.limits.products)} productos)</button>` : ''}</div>`;
        return;
      }
      view.innerHTML = '<div class="panel reg-panel" id="regHost"></div>';
      const w = MF.AI.wizard(view.querySelector('#regHost'), {
        onUsage() { document.querySelector('#viewSub').textContent = D.modules.registrar.sub(); },
        onSaved() { /* el inventario se actualiza al volver */ },
        doneActions: (p) => `<a class="btn ghost" href="#/inventario">${MF.icon('package', 'sm')} Ver inventario</a><button class="btn ghost" type="button" data-sheet="${p.id}">${MF.icon('eye', 'sm')} Ver ficha</button>`
      });
      view.addEventListener('click', (e) => { const b = e.target.closest('[data-sheet]'); if (b) sheet(MF.product(b.dataset.sheet)); });
      if (params.manual) { history.replaceState(null, '', '#/registrar'); w.manual(); }
    }
  });

  // ---------- Inventario ----------
  function filtered() {
    const q = st.q.toLowerCase().trim();
    const words = q.split(/\s+/).filter(Boolean);
    return MF.get().products.filter((p) => {
      const k = MF.stockStatus(MF.stock(p), p).key;
      const txt = MF.tagsText(p);
      if (st.status === 'inactivos') { if (MF.isActive(p)) return false; } else if (!MF.isActive(p)) return false;
      return words.every((w) => txt.includes(w)) && (!st.cat || p.category === st.cat) && (!st.status || st.status === 'inactivos' || st.status === k);
    });
  }

  D.register({
    id: 'inventario', label: 'Inventario', icon: 'package',
    sub: () => `${MF.get().products.length} de ${MF.num(MF.plan().limits.products)} productos del plan${MF.can('sucursales') ? ' · ' + MF.branchName(MF.branchId()) : ''}`,
    render(view, params) {
      if (params.estado) { st.status = params.estado; history.replaceState(null, '', '#/inventario'); }
      if (params.nuevo) { history.replaceState(null, '', '#/inventario'); return D.go('#/registrar?manual=1'); }
      if (params.edit) { history.replaceState(null, '', '#/inventario'); setTimeout(() => editor(MF.product(params.edit)), 0); }
      const d = MF.get();
      const act = d.products.filter(MF.isActive);
      const units = act.reduce((s, p) => s + MF.stock(p), 0);
      const low = act.filter((p) => { const s = MF.stock(p); return s > 0 && s <= p.minStock; });
      const out = act.filter((p) => MF.stock(p) === 0);
      const list = filtered();
      const inactive = d.products.length - act.length;
      view.innerHTML = `
        <div class="kpis kpis-4">
          <div class="kpi"><small>Productos</small><b>${act.length}</b><em>fichas · límite ${MF.num(MF.plan().limits.products)}</em></div>
          <div class="kpi mint"><small>Unidades disponibles</small><b>${MF.num(units)}</b><em>stock total</em></div>
          <button class="kpi amber" data-fstatus="bajo"><small>Poco stock</small><b>${low.length}</b><em>ver productos</em></button>
          <button class="kpi pink" data-fstatus="agotado"><small>Agotados</small><b>${out.length}</b><em>ver productos</em></button>
        </div>
        ${MF.can('alertas') ? '' : `<div style="margin-bottom:12px">${D.lockMini('alertas', 'Alertas automáticas cuando una prenda se queda sin stock')}</div>`}
        <div class="inv-actions">
          <a class="btn grad" href="#/registrar">${MF.icon('camera', 'sm')} Registrar prenda</a>
          <a class="btn ghost" href="#/registrar?manual=1">${MF.icon('plus', 'sm')} Manual</a>
          <button class="btn ghost" id="expBtn">${MF.icon('download', 'sm')} Excel</button>
          ${MF.can('importar') ? `<button class="btn ghost" id="impBtn">${MF.icon('upload', 'sm')} Importar</button>` : `<button class="btn ghost" data-lock="importar">${MF.icon('lock', 'sm')} Importar</button>`}
          ${MF.can('transferencias') ? `<button class="btn ghost" id="trBtn">${MF.icon('transfer', 'sm')} Transferir</button>` : ''}
        </div>
        <div class="search-big">${MF.icon('search', 'sm')}<input id="iq" type="search" placeholder="Buscar por nombre o etiqueta (ej. blusa roja)" value="${esc(st.q)}" autocomplete="off"></div>
        <div class="chips-row scroll-x"><button class="fchip ${!st.cat ? 'on' : ''}" data-cat="">Todas</button>${d.categories.map((c) => `<button class="fchip ${st.cat === c ? 'on' : ''}" data-cat="${c}">${c}</button>`).join('')}</div>
        <div class="chips-row scroll-x">${[['', 'Todos'], ['ok', 'Disponibles'], ['bajo', 'Poco stock'], ['agotado', 'Agotados'], ['inactivos', `Desactivados (${inactive})`]].map(([k, l]) => `<button class="fchip sm ${st.status === k ? 'on' : ''}" data-fstatus="${k}">${l}</button>`).join('')}</div>
        ${viewBar(list.length)}
        ${list.length ? listHTML(list) : `<div class="panel empty">${MF.icon('search')}<p>No hay productos con esos filtros.</p></div>`}`;
      const iq = view.querySelector('#iq');
      iq.addEventListener('input', () => { st.q = iq.value; const pos = iq.selectionStart; D.rerender(); const n = document.querySelector('#iq'); n.focus(); n.setSelectionRange(pos, pos); });
      view.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => { st.cat = b.dataset.cat; D.rerender(); }));
      view.querySelectorAll('[data-fstatus]').forEach((b) => b.addEventListener('click', () => { st.status = st.status === b.dataset.fstatus && b.classList.contains('kpi') ? '' : b.dataset.fstatus; D.rerender(); }));
      view.querySelectorAll('[data-open]').forEach((b) => {
        b.addEventListener('click', () => sheet(MF.product(b.dataset.open)));
        if (b.tagName === 'TR') b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sheet(MF.product(b.dataset.open)); } });
      });
      view.querySelectorAll('[data-layout]').forEach((b) => b.addEventListener('click', () => { inv.layout = b.dataset.layout; saveView(); D.rerender(); }));
      view.querySelector('#fieldsBtn').addEventListener('click', fieldsDialog);
      view.querySelector('#expBtn').addEventListener('click', exportProducts);
      const imp = view.querySelector('#impBtn'); if (imp) imp.addEventListener('click', importDialog);
      const tr = view.querySelector('#trBtn'); if (tr) tr.addEventListener('click', () => transfer());
    }
  });

  // ---------- Vista del inventario: tarjetas / lista / tabla y datos visibles ----------
  // Preferencia de cada usuario en este navegador (no forma parte de los datos de la tienda).
  const VIEW_KEY = 'modaflow:inv-view';
  const LAYOUTS = [['cards', 'Tarjetas', 'grid'], ['list', 'Lista', 'list'], ['table', 'Tabla', 'table']];
  const FIELDS = [
    ['foto', 'Imagen'], ['nombre', 'Nombre'], ['sku', 'Código'], ['categoria', 'Categoría'], ['color', 'Color'],
    ['tallas', 'Tallas con stock'], ['precio', 'Precio de venta'], ['costo', 'Costo de compra', 'costos'],
    ['margen', 'Margen de ganancia', 'costos'], ['stock', 'Unidades'], ['estado', 'Estado del stock'], ['origen', 'Registrado con IA']
  ];
  const DEFAULT_FIELDS = ['foto', 'nombre', 'categoria', 'color', 'tallas', 'precio', 'stock', 'estado', 'origen'];
  const inv = (() => {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(VIEW_KEY) || 'null'); } catch (e) { /* sin almacenamiento */ }
    const layout = saved && LAYOUTS.some((l) => l[0] === saved.layout) ? saved.layout : 'list';
    const fields = saved && Array.isArray(saved.fields) ? saved.fields.filter((f) => FIELDS.some((x) => x[0] === f)) : DEFAULT_FIELDS.slice();
    return { layout, fields: new Set(fields.length ? fields : DEFAULT_FIELDS) };
  })();
  const saveView = () => { try { localStorage.setItem(VIEW_KEY, JSON.stringify({ layout: inv.layout, fields: [...inv.fields] })); } catch (e) { /* sin almacenamiento */ } };
  const show = (f) => inv.fields.has(f) && (!(FIELDS.find((x) => x[0] === f) || [])[2] || MF.can(FIELDS.find((x) => x[0] === f)[2]));
  const margin = (p) => (MF.price(p) ? Math.round(((MF.price(p) - (p.cost || 0)) / MF.price(p)) * 100) : 0);

  function viewBar(n) {
    return `<div class="inv-viewbar">
      <p class="result-count">${n} ${n === 1 ? 'producto' : 'productos'}</p>
      <div class="seg" role="group" aria-label="Ver inventario como">${LAYOUTS.map(([k, l, ic]) => `<button type="button" class="${inv.layout === k ? 'on' : ''}" data-layout="${k}" aria-pressed="${inv.layout === k}" title="Ver como ${l.toLowerCase()}">${MF.icon(ic, 'sm')}<span>${l}</span></button>`).join('')}</div>
      <button type="button" class="btn ghost sm" id="fieldsBtn">${MF.icon('settings', 'sm')} Datos</button>
    </div>`;
  }

  function fieldsDialog() {
    const m = MF.modal({
      title: 'Datos a mostrar', size: 'sm', noFocus: true,
      body: `<p class="muted" style="margin:0 0 10px">Elija qué ver en el inventario. Se guarda en este dispositivo.</p>
        <div class="field-picks">${FIELDS.map(([k, l, need]) => {
          const locked = need && !MF.can(need);
          return `<label class="field-pick ${locked ? 'locked' : ''}"><input type="checkbox" data-field="${k}" ${inv.fields.has(k) ? 'checked' : ''} ${locked ? 'disabled' : ''}><span>${l}</span>${locked ? `<small>${D.fromPlan(need)}</small>` : ''}</label>`;
        }).join('')}</div>`,
      footer: `<button class="btn ghost" id="fdReset">Restablecer</button><button class="btn primary" data-close>Listo</button>`
    });
    m.el.querySelectorAll('[data-field]').forEach((c) => c.addEventListener('change', () => {
      const f = c.dataset.field;
      if (c.checked) inv.fields.add(f); else inv.fields.delete(f);
      if (!inv.fields.has('foto') && !inv.fields.has('nombre')) {
        inv.fields.add(f); c.checked = true;
        return MF.toast('Deje al menos la imagen o el nombre para reconocer cada prenda', 'error');
      }
      saveView(); D.rerender();
    }));
    m.el.querySelector('#fdReset').addEventListener('click', () => {
      inv.fields = new Set(DEFAULT_FIELDS); saveView(); D.rerender();
      m.el.querySelectorAll('[data-field]').forEach((c) => { c.checked = inv.fields.has(c.dataset.field); });
    });
  }

  function metaLine(p) {
    const bits = [];
    if (show('sku') && p.sku) bits.push(esc(p.sku));
    if (show('categoria')) bits.push(esc(p.category));
    if (show('color')) bits.push(esc(p.color));
    if (show('origen') && p.source === 'ia') bits.push(MF.icon('sparkles', 'sm') + 'IA');
    if (!MF.isActive(p)) bits.push('desactivado');
    return bits.join(' · ');
  }
  function priceHTML(p) {
    const pr = MF.promoFor(p);
    return show('precio') ? `<b class="price">${money(MF.price(p))}</b>${pr ? `<s class="muted">${money(p.price)}</s>` : ''}` : '';
  }
  function costHTML(p) {
    const bits = [];
    if (show('costo')) bits.push(`Costo ${p.cost ? money(p.cost) : '—'}`);
    if (show('margen') && p.cost) bits.push(`margen ${margin(p)}%`);
    return bits.length ? `<small class="muted cost">${bits.join(' · ')}</small>` : '';
  }

  function listHTML(list) {
    if (inv.layout === 'table') return tableHTML(list);
    return `<div class="inv-list ${inv.layout === 'cards' ? 'as-cards' : ''}">${list.map(inv.layout === 'cards' ? tileHTML : cardHTML).join('')}</div>`;
  }

  function cardHTML(p) {
    const s = MF.stock(p);
    const ss = MF.stockStatus(s, p);
    const meta = metaLine(p);
    return `<button class="inv-card ${MF.isActive(p) ? '' : 'inactive'} ${show('foto') ? '' : 'no-pic'}" data-open="${p.id}">
      ${show('foto') ? `<span class="pic">${MF.photo(p, 'thumb')}</span>` : ''}
      <span class="body">${show('nombre') ? `<b>${esc(p.name)}</b>` : ''}
        ${meta ? `<small>${meta}</small>` : ''}
        ${show('tallas') ? `<span class="stock-bar">${sizesLine(p)}</span>` : ''}${costHTML(p)}</span>
      <span class="side">${priceHTML(p)}
        ${show('stock') ? `<span class="badge ${badgeCls(ss.key)}">${s} u.</span>` : ''}${show('estado') ? `<small class="muted">${ss.label}</small>` : ''}</span>
    </button>`;
  }

  function tileHTML(p) {
    const s = MF.stock(p);
    const ss = MF.stockStatus(s, p);
    const meta = metaLine(p);
    const flag = show('stock') || show('estado') ? `<span class="badge ${badgeCls(ss.key)}">${[show('stock') ? s + ' u.' : '', show('estado') ? ss.label : ''].filter(Boolean).join(' · ')}</span>` : '';
    return `<button class="inv-tile ${MF.isActive(p) ? '' : 'inactive'}" data-open="${p.id}">
      ${show('foto') ? `<span class="pic">${MF.photo(p)}${flag}</span>` : ''}
      <span class="body">${show('nombre') ? `<b>${esc(p.name)}</b>` : ''}
        ${meta ? `<small>${meta}</small>` : ''}
        ${show('precio') ? `<span class="price-row">${priceHTML(p)}</span>` : ''}${costHTML(p)}
        ${!show('foto') ? flag : ''}
        ${show('tallas') ? `<span class="stock-bar">${sizesLine(p)}</span>` : ''}</span>
    </button>`;
  }

  function tableHTML(list) {
    const cols = [
      ['foto', '', (p) => MF.photo(p, 'thumb')],
      ['nombre', 'Producto', (p) => `<b>${esc(p.name)}</b>${!MF.isActive(p) ? ' <small class="muted">desactivado</small>' : ''}${show('origen') && p.source === 'ia' ? ` <span class="ia-mark" title="Registrado con IA">${MF.icon('sparkles', 'sm')}</span>` : ''}`],
      ['sku', 'Código', (p) => esc(p.sku || '—')],
      ['categoria', 'Categoría', (p) => esc(p.category)],
      ['color', 'Color', (p) => esc(p.color)],
      ['tallas', 'Tallas', (p) => `<span class="stock-bar">${sizesLine(p)}</span>`],
      ['precio', 'Precio', (p) => priceHTML(p), 'num'],
      ['costo', 'Costo', (p) => (p.cost ? money(p.cost) : '—'), 'num'],
      ['margen', 'Margen', (p) => (p.cost ? margin(p) + '%' : '—'), 'num'],
      ['stock', 'Unid.', (p) => { const s = MF.stock(p); return `<span class="badge ${badgeCls(MF.stockStatus(s, p).key)}">${s}</span>`; }, 'num'],
      ['estado', 'Estado', (p) => MF.stockStatus(MF.stock(p), p).label]
    ].filter((c) => show(c[0]));
    return `<div class="tbl-wrap inv-table"><table class="tbl"><thead><tr>${cols.map((c) => `<th class="${c[3] || ''}">${c[1]}</th>`).join('')}</tr></thead>
      <tbody>${list.map((p) => `<tr class="${MF.isActive(p) ? '' : 'inactive'}" data-open="${p.id}" tabindex="0" role="button" aria-label="Ver ${esc(p.name)}">${cols.map((c) => `<td class="${c[3] || ''} c-${c[0]}">${c[2](p)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  // ---------- Ficha del producto (hoja inferior en celular) ----------
  function sheet(p) {
    if (!p) return;
    const b = MF.branchId();
    const s = MF.stock(p);
    const ss = MF.stockStatus(s, p);
    const list = MF.AI.shotList(MF.AI.shotsOf(p));
    const moves = (MF.get().movements || []).filter((m) => m.productId === p.id).slice(-5).reverse();
    const m = MF.modal({
      title: esc(p.name), size: 'sheet', noFocus: true,
      body: `<div class="p-sheet"><div class="ps-photo">${MF.AI.gallery(list.length ? list : (p.photo ? [{ view: 'frente', src: p.photo }] : []))}</div>
        <div><div class="ps-price"><b>${money(MF.price(p))}</b>${MF.can('costos') && p.cost ? `<small class="muted">Compra ${money(p.cost)} · margen ${p.price ? Math.round(((p.price - p.cost) / p.price) * 100) : 0}%</small>` : ''}</div>
          <p class="muted" style="margin:4px 0 8px;font-size:.86rem">${esc(p.category)} · ${esc(p.color)} · ${p.sku} · registrado el ${MF.fdate(p.createdAt, true)}</p>
          ${p.tags && p.tags.length ? `<div class="ai-attrs" style="margin:0 0 10px">${p.tags.slice(0, 8).map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}
          <table class="var-mini"><thead><tr><th>Talla</th><th>Color</th><th class="num">Disponible</th></tr></thead><tbody>
            ${p.variants.map((v) => `<tr><td><b>${esc(v.size)}</b></td><td>${esc(v.color)}</td><td class="num"><span class="badge ${badgeCls(MF.stockStatus(v.stock[b] || 0, { minStock: 0 }).key)}">${v.stock[b] || 0}</span></td></tr>`).join('')}
            <tr class="tot"><td colspan="2">Total · ${ss.label}</td><td class="num"><b>${s}</b></td></tr></tbody></table>
          ${MF.reserved(p.id) ? `<p class="muted" style="font-size:.8rem">${MF.reserved(p.id)} unidad(es) reservadas por pedidos online.</p>` : ''}
        </div></div>
        <div class="sheet-actions">
          <button class="btn primary" data-a="ingreso">${MF.icon('plus', 'sm')} Ingreso de mercadería</button>
          <button class="btn ghost" data-a="ajuste">${MF.icon('edit', 'sm')} Ajustar cantidades</button>
          <button class="btn ghost" data-a="editar">${MF.icon('shirt', 'sm')} Editar ficha</button>
          <a class="btn ghost" href="#/vender?p=${p.id}" data-close>${MF.icon('cart', 'sm')} Vender</a>
          ${MF.can('transferencias') ? `<button class="btn ghost" data-a="transferir">${MF.icon('transfer', 'sm')} Transferir</button>` : ''}
          <button class="btn ghost" data-a="activo">${MF.icon(MF.isActive(p) ? 'eye' : 'refresh', 'sm')} ${MF.isActive(p) ? 'Desactivar' : 'Reactivar'}</button>
          <button class="btn ghost danger-txt" data-a="eliminar">${MF.icon('trash', 'sm')} Eliminar</button>
        </div>
        <div class="ps-moves"><div class="panel-head" style="margin:14px 0 6px"><h3 style="font-size:.95rem">Últimos movimientos</h3>${MF.can('movimientos') ? `<a class="link-btn" href="#/movimientos?p=${p.id}" data-close>Ver todos</a>` : D.lockPill('movimientos')}</div>
          ${MF.can('movimientos') ? moveList(moves) : D.lockMini('movimientos')}</div>`
    });
    m.el.querySelectorAll('[data-a]').forEach((btn) => btn.addEventListener('click', async () => {
      const a = btn.dataset.a;
      if (a !== 'editar' && D.guardWrite()) return;
      if (a === 'ingreso') { m.close(); entry(p); }
      if (a === 'ajuste') { m.close(); adjust(p); }
      if (a === 'editar') { m.close(); editor(p); }
      if (a === 'transferir') { m.close(); transfer(p); }
      if (a === 'activo') {
        p.active = !MF.isActive(p);
        if (!p.active) p.published = false;
        MF.audit('producto', `${p.active ? 'Reactivó' : 'Desactivó'} "${p.name}"`);
        MF.save(); m.close(); MF.toast(p.active ? 'Producto reactivado' : 'Producto desactivado: ya no aparece en ventas ni en el catálogo'); D.rerender();
      }
      if (a === 'eliminar') {
        const sold = MF.get().sales.some((x) => x.items.some((i) => i.productId === p.id));
        if (!(await MF.confirmDialog(`¿Eliminar "${esc(p.name)}"?${sold ? ' Tiene ventas registradas: las ventas pasadas se conservan con su nombre. Si solo dejó de venderla, conviene <b>desactivarla</b>.' : ''}`, 'Eliminar', true))) return;
        const d = MF.get();
        d.products = d.products.filter((x) => x.id !== p.id);
        MF.audit('producto', `Eliminó el producto "${p.name}"`);
        MF.save(); m.close(); MF.toast('Producto eliminado'); D.rerender();
      }
    }));
  }
  MF.productSheet = sheet;

  function moveList(moves) {
    return `<ul class="list moves">${moves.map((x) => `<li><span class="mv-qty ${x.qty > 0 ? 'in' : 'out'}">${x.qty > 0 ? '+' : ''}${x.qty}</span><div class="grow"><b>${esc(MF.MOVE_TYPES[x.type] || x.type)} · ${esc(x.size)}${x.color ? ' ' + esc(x.color) : ''}</b><small>${MF.fdate(x.date, true)} · ${esc(x.ref || '')}${MF.can('sucursales') ? ' · ' + esc(MF.branchName(x.branchId)) : ''}</small></div></li>`).join('') || '<li class="empty">Sin movimientos</li>'}</ul>`;
  }

  // ---------- Ingreso de mercadería ----------
  function entry(p) {
    const b = MF.branchId();
    const m = MF.modal({
      title: 'Ingreso de mercadería', size: 'sm',
      body: `<div class="prod-head">${MF.photo(p, 'thumb')}<div><b>${esc(p.name)}</b><small class="muted">Sume las unidades que llegaron${MF.can('sucursales') ? ' a ' + esc(MF.branchName(b)) : ''}</small></div></div>
        <form id="ef" class="form-grid">${p.variants.map((v, i) => `<label class="qty-line"><span>${esc(v.size)}${multiColor(p) ? ' · ' + esc(v.color) : ''} <small class="muted">(hay ${v.stock[b] || 0})</small></span><input type="number" inputmode="numeric" min="0" data-ei="${i}" value="0"></label>`).join('')}
          <div class="full" id="newVars"></div>
          <button type="button" class="btn ghost sm full" id="addNv">${MF.icon('plus', 'sm')} Nueva talla o color</button>
          <label class="full">Nota (opcional) <input name="note" placeholder="Ej. Fardo de noviembre, proveedor…"></label></form>`,
      footer: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="saveEn">${MF.icon('check', 'sm')} Sumar al stock</button>`
    });
    const nv = [];
    const drawNv = () => {
      m.el.querySelector('#newVars').innerHTML = nv.map((x, i) => `<div class="nv-row"><select data-nvs="${i}">${SIZES_ALL.map((z) => `<option ${z === x.size ? 'selected' : ''}>${z}</option>`).join('')}</select><select data-nvc="${i}">${Object.keys(MF.COLORS).map((c) => `<option ${c === x.color ? 'selected' : ''}>${c}</option>`).join('')}</select><input type="number" min="0" inputmode="numeric" data-nvq="${i}" value="${x.qty}" aria-label="Cantidad"></div>`).join('');
      m.el.querySelectorAll('[data-nvs]').forEach((s) => s.addEventListener('change', () => { nv[s.dataset.nvs].size = s.value; }));
      m.el.querySelectorAll('[data-nvc]').forEach((s) => s.addEventListener('change', () => { nv[s.dataset.nvc].color = s.value; }));
      m.el.querySelectorAll('[data-nvq]').forEach((s) => s.addEventListener('input', () => { nv[s.dataset.nvq].qty = Math.max(0, +s.value || 0); }));
    };
    m.el.querySelector('#addNv').addEventListener('click', () => { nv.push({ size: 'M', color: p.color, qty: 1 }); drawNv(); });
    m.el.querySelector('#saveEn').addEventListener('click', () => {
      const note = m.el.querySelector('[name=note]').value.trim() || 'Ingreso de mercadería';
      const items = [];
      m.el.querySelectorAll('[data-ei]').forEach((inp) => { const q = Math.max(0, Math.round(+inp.value || 0)); if (q) { const v = p.variants[inp.dataset.ei]; items.push({ productId: p.id, name: p.name, size: v.size, color: v.color, qty: q }); } });
      nv.filter((x) => x.qty > 0).forEach((x) => {
        if (!MF.findVariant(p, x.size, x.color)) p.variants.push({ size: x.size, color: x.color, stock: { b1: 0, b2: 0, b3: 0 } });
        items.push({ productId: p.id, name: p.name, size: x.size, color: x.color, qty: x.qty });
      });
      if (!items.length) return MF.toast('Indique cuántas unidades llegaron', 'error');
      MF.moveStock(items, b, +1, 'ingreso', note);
      const n = items.reduce((a, i) => a + i.qty, 0);
      MF.audit('inventario', `Ingreso de mercadería: ${n} u. de "${p.name}" (${note})`);
      MF.save(); m.close(); MF.toast(`+${n} unidades de ${p.name}`); D.rerender();
    });
  }

  // ---------- Ajuste de inventario ----------
  function adjust(p) {
    const b = MF.branchId();
    const m = MF.modal({
      title: 'Ajustar cantidades', size: 'sm',
      body: `<div class="prod-head">${MF.photo(p, 'thumb')}<div><b>${esc(p.name)}</b><small class="muted">Escriba la cantidad real que hay${MF.can('sucursales') ? ' en ' + esc(MF.branchName(b)) : ''}</small></div></div>
        <form id="af" class="form-grid">${p.variants.map((v, i) => `<label class="qty-line"><span>${esc(v.size)}${multiColor(p) ? ' · ' + esc(v.color) : ''}</span><input type="number" inputmode="numeric" min="0" data-ai="${i}" value="${v.stock[b] || 0}"></label>`).join('')}
        <label class="full">Motivo <select name="reason"><option>Conteo físico</option><option>Prenda dañada</option><option>Prenda perdida</option><option>Corrección de registro</option><option>Regalo o muestra</option></select></label></form>`,
      footer: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="saveAdj">Guardar ajuste</button>`
    });
    m.el.querySelector('#saveAdj').addEventListener('click', () => {
      const reason = m.el.querySelector('[name=reason]').value;
      const changes = [];
      m.el.querySelectorAll('[data-ai]').forEach((inp) => {
        const v = p.variants[inp.dataset.ai];
        const diff = MF.setStock(p, v, b, inp.value, 'ajuste', reason);
        if (diff) changes.push(`${v.size} (${diff > 0 ? '+' : ''}${diff})`);
      });
      if (changes.length) MF.audit('inventario', `Ajuste de inventario (${reason}): ${p.name} ${changes.join(', ')}`);
      MF.save(); m.close(); MF.toast(changes.length ? 'Inventario actualizado' : 'Sin cambios'); D.rerender();
    });
  }

  // ---------- Editar ficha ----------
  function editor(p) {
    if (!p) return;
    const d = MF.get();
    const draft = JSON.parse(JSON.stringify(p));
    const b = MF.branchId();
    const m = MF.modal({
      title: 'Editar producto', size: 'lg',
      body: `<form id="pf" class="form-grid" autocomplete="off">
        <div class="full"><span class="lbl">Fotografías <small class="muted">(hasta 3: frente, espalda y etiqueta)</small></span>
          <div id="phSlots"></div>
          <button type="button" class="btn ai-cta sm" id="aiAnalyze" style="margin-top:8px" disabled>${MF.icon('sparkles', 'sm')} Analizar fotografía con IA</button></div>
        <div class="full" id="aiBox"></div>
        <label class="full">Nombre <input name="name" required value="${esc(draft.name)}"></label>
        <label class="full">Descripción breve <input name="descShort" value="${esc(draft.descShort || '')}"></label>
        <label>Categoría <select name="category">${d.categories.map((c) => `<option ${c === draft.category ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
        <label>Color principal <select name="color">${Object.keys(MF.COLORS).map((c) => `<option ${c === draft.color ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
        <label>Precio de venta (Bs) <input name="price" type="number" inputmode="numeric" min="0" step="1" required value="${draft.price}"></label>
        <label>Precio de compra (Bs) <input name="cost" type="number" inputmode="numeric" min="0" step="1" value="${draft.cost || ''}" placeholder="Opcional"></label>
        <label class="full">Etiquetas para búsqueda <input name="tags" value="${esc((draft.tags || []).join(', '))}"></label>
        <label class="full">Descripción detallada <textarea name="desc" rows="2">${esc(draft.desc)}</textarea></label>
        <details class="full ai-details"><summary>Más detalles de la prenda</summary><div class="form-grid" style="margin-top:10px">
          <label>Tipo de prenda <input name="garmentType" value="${esc(draft.garmentType || '')}"></label>
          <label>Estilo <input name="style" value="${esc(draft.style || '')}"></label>
          <label>Público <select name="audience"><option value="">Sin indicar</option>${['Mujer', 'Hombre', 'Unisex', 'Niña', 'Niño'].map((a) => `<option ${a === draft.audience ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
          <label>Colores secundarios <input name="secondaryColors" value="${esc((draft.secondaryColors || []).join(', '))}"></label>
          <label class="full">Características visibles <input name="features" value="${esc((draft.features || []).join(', '))}"></label></div></details>
        <details class="full ai-details ai-label-details" ${draft.brand || draft.composition ? 'open' : ''}><summary>Datos de la etiqueta (marca, composición, país y cuidados)</summary><div class="form-grid" style="margin-top:10px">${MF.AI.labelFields(draft)}</div></details>
        <div class="full"><span class="lbl">Tallas y colores · las cantidades se cambian con "Ingreso" o "Ajustar"</span>
          <table class="var-table"><thead><tr><th>Talla</th><th>Color</th><th class="num">Stock</th><th></th></tr></thead><tbody id="vars"></tbody></table>
          <button type="button" class="btn ghost sm" id="addVar" style="margin-top:6px">${MF.icon('plus', 'sm')} Agregar talla o color</button></div>
        <label>Alerta de poco stock (unidades) <input name="minStock" type="number" min="0" value="${draft.minStock}"></label>
        ${MF.can('catalogo') ? `<label class="switch"><input type="checkbox" name="published" ${draft.published ? 'checked' : ''}><span></span> Publicar en el catálogo</label>` : `<div>${D.lockMini('catalogo')}</div>`}
        ${MF.can('destacados') ? `<label class="switch"><input type="checkbox" name="featured" ${draft.featured ? 'checked' : ''}><span></span> Producto destacado</label>` : ''}
      </form>`,
      footer: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="saveP">${MF.icon('check', 'sm')} Guardar cambios</button>`
    });
    const el = m.el;
    function drawVars() {
      el.querySelector('#vars').innerHTML = draft.variants.map((v, i) => `<tr>
        <td><select data-vs="${i}">${SIZES_ALL.concat(SIZES_ALL.includes(v.size) ? [] : [v.size]).map((s) => `<option ${s === v.size ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></td>
        <td><select data-vc="${i}">${Object.keys(MF.COLORS).concat(MF.COLORS[v.color] ? [] : [v.color]).map((c) => `<option ${c === v.color ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></td>
        <td class="num">${v.stock[b] || 0}</td>
        <td>${(v.stock[b] || 0) === 0 && draft.variants.length > 1 ? `<button type="button" class="icon-btn" data-vr="${i}" aria-label="Quitar">${MF.icon('x', 'sm')}</button>` : ''}</td></tr>`).join('');
      el.querySelectorAll('[data-vs]').forEach((s) => s.addEventListener('change', () => { draft.variants[s.dataset.vs].size = s.value; }));
      el.querySelectorAll('[data-vc]').forEach((s) => s.addEventListener('change', () => { draft.variants[s.dataset.vc].color = s.value; }));
      el.querySelectorAll('[data-vr]').forEach((s) => s.addEventListener('click', () => { draft.variants.splice(+s.dataset.vr, 1); drawVars(); }));
    }
    drawVars();
    el.querySelector('#addVar').addEventListener('click', () => { draft.variants.push({ size: 'L', color: el.querySelector('[name=color]').value, stock: { b1: 0, b2: 0, b3: 0 } }); drawVars(); });
    // Fotos y análisis con IA (completa los campos; todos siguen editables)
    const shots = MF.AI.shotsOf(draft);
    const nShots = () => MF.AI.shotList(shots).length;
    const syncAI = () => { const btn = el.querySelector('#aiAnalyze'); btn.disabled = !nShots(); btn.innerHTML = `${MF.icon('sparkles', 'sm')} ${nShots() > 1 ? `Analizar ${nShots()} fotos con IA` : 'Analizar fotografía con IA'}`; };
    MF.AI.photoSlots(el.querySelector('#phSlots'), { shots, compact: true, onChange() { syncAI(); el.querySelector('#aiBox').innerHTML = ''; } });
    syncAI();
    el.querySelector('#aiAnalyze').addEventListener('click', async () => {
      const btn = el.querySelector('#aiAnalyze');
      const box = el.querySelector('#aiBox');
      btn.disabled = true;
      box.innerHTML = `<div class="ai-working inline" role="status"><span class="ai-spinner"></span><b>Identificando tu prenda con inteligencia artificial...</b></div>`;
      try {
        const data = await MF.AI.analyze(shots);
        const r = data.result;
        if (r.es_prenda) {
          el.querySelectorAll('.ai-details').forEach((x) => { if (!x.classList.contains('ai-label-details') || (r.etiqueta && r.etiqueta.legible)) x.open = true; });
          MF.AI.fill(el.querySelector('#pf'), r);
          draft.aiMeta = { model: data.model, confianza: r.confianza, fotos: data.photos, vistas: data.views, fecha: new Date().toISOString() };
          if (!draft.source || draft.source === 'manual') draft.source = 'ia';
        }
        box.innerHTML = MF.AI.notices(r, data.views) + (r.es_prenda ? `<div class="ai-note ok">${MF.icon('checkCircle', 'sm')}<span>Campos completados por la IA (confianza ${esc(r.confianza)}). Revíselos antes de guardar.</span></div>` : '') +
          `<div class="ai-meta">${MF.icon('sparkles', 'sm')} <code>${esc(data.model)}</code> · ${MF.AI.costLine(data)} <button type="button" class="link-btn" id="aiRe">${MF.icon('refresh', 'sm')} Volver a analizar</button></div>`;
        el.querySelector('#aiRe').addEventListener('click', () => el.querySelector('#aiAnalyze').click());
      } catch (err) {
        box.innerHTML = `<div class="ai-note bad">${MF.icon('alert', 'sm')}<span><b>No se pudo analizar la foto.</b> ${esc(err.message)} No se descontó ningún crédito.</span></div>`;
      } finally { btn.disabled = !nShots(); }
    });
    el.querySelector('#saveP').addEventListener('click', async () => {
      if (D.guardWrite()) return;
      const f = el.querySelector('#pf');
      if (!f.reportValidity()) return;
      const fd = new FormData(f);
      const keys = draft.variants.map((v) => v.size + '|' + v.color);
      if (new Set(keys).size !== keys.length) { MF.toast('Hay tallas repetidas con el mismo color', 'error'); return; }
      Object.assign(draft, {
        name: fd.get('name').trim(), category: fd.get('category'), color: fd.get('color'), colorHex: MF.COLORS[fd.get('color')],
        price: +fd.get('price') || 0, cost: +fd.get('cost') || 0, desc: fd.get('desc'), minStock: +fd.get('minStock') || 0
      }, MF.AI.readDetails(fd));
      if (MF.can('catalogo')) draft.published = fd.get('published') === 'on';
      if (MF.can('destacados')) draft.featured = fd.get('featured') === 'on';
      draft.photos = await MF.AI.savePhotos(shots, true); // las rutas de assets/ se conservan; las fotos nuevas se reducen
      draft.photo = draft.photos.length ? draft.photos[0].src : null;
      if (!draft.photos.length) delete draft.photos;
      if (p.price !== draft.price) MF.audit('producto', `Cambió el precio de "${p.name}" de Bs ${p.price} a Bs ${draft.price}`);
      else MF.audit('producto', `Editó el producto "${draft.name}"`);
      Object.assign(p, draft);
      if (!draft.photos) delete p.photos;
      MF.save(); m.close(); MF.toast('Cambios guardados'); D.rerender();
    });
  }
  MF.productEditor = editor;

  function exportProducts() {
    const d = MF.get();
    const full = MF.can('exportarCompleto');
    const rows = [['Código', 'Producto', 'Categoría', 'Color', 'Talla', 'Color variante', 'Stock', 'Precio de venta', ...(full ? ['Precio de compra', 'Etiquetas', 'Registrado'] : [])]];
    d.products.forEach((p) => p.variants.forEach((v) => rows.push([p.sku, p.name, p.category, p.color, v.size, v.color, MF.variantStock(v, MF.branchId()), p.price, ...(full ? [p.cost || '', (p.tags || []).join(' | '), MF.fdate(p.createdAt, true)] : [])])));
    MF.downloadCSV('inventario-mioshop.csv', rows);
    MF.toast(full ? 'Inventario descargado (se abre con Excel)' : 'Inventario básico descargado. Excel completo: desde el plan Pro');
  }

  // ---------- Importación (Premium) ----------
  const TEMPLATE = [['nombre', 'categoria', 'color', 'precio', 'costo', 'talla', 'cantidad'],
    ['Falda plisada', 'Conjuntos', 'Negro', '150', '75', 'S', '3'], ['Falda plisada', 'Conjuntos', 'Negro', '150', '75', 'M', '4'],
    ['Polera básica', 'Tops', 'Blanco', '60', '25', 'M', '10'], ['Vestido camisero', 'Vestidos', 'Azul', '220', '115', 'M', '2']];
  function importDialog() {
    if (D.guardWrite()) return;
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
      el.querySelector('#impPrev').innerHTML = `<ul class="list">${names.map((n) => { const g = groups[n]; return `<li><div class="grow"><b>${esc(n)}</b><small>${esc(g[0][1])} · ${esc(g[0][2])} · ${g.map((r) => `${esc(r[5])}: ${+r[6] || 0}`).join(', ')}</small></div><b>${money(+g[0][3])}</b></li>`; }).join('')}</ul>
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

  // ---------- Transferencias (Premium) ----------
  function transfer(pre) {
    const d = MF.get();
    const brs = MF.branches();
    const m = MF.modal({
      title: 'Transferir entre sucursales', size: 'sm',
      body: `<form id="tf" class="form-grid">
        <label>Desde <select name="from">${brs.map((x) => `<option value="${x.id}" ${x.id === MF.branchId() ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
        <label>Hacia <select name="to">${brs.map((x, i) => `<option value="${x.id}" ${i === 1 ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
        <label class="full">Producto <select name="pid">${d.products.filter(MF.isActive).map((p) => `<option value="${p.id}" ${pre && pre.id === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
        <label>Talla <select name="var"></select></label><label>Cantidad <input name="qty" type="number" min="1" value="1"></label></form>`,
      footer: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="doTr">Transferir</button>`
    });
    const f = m.el.querySelector('#tf');
    const fillVars = () => { const p = MF.product(f.pid.value); f.var.innerHTML = p.variants.map((v, i) => `<option value="${i}">${esc(v.size)} · ${esc(v.color)} (${v.stock[f.from.value] || 0} disp.)</option>`).join(''); };
    f.pid.addEventListener('change', fillVars); f.from.addEventListener('change', fillVars); fillVars();
    m.el.querySelector('#doTr').addEventListener('click', () => {
      const p = MF.product(f.pid.value);
      const v = p.variants[+f.var.value];
      const qty = +f.qty.value || 0;
      if (f.from.value === f.to.value) return MF.toast('Elija sucursales distintas', 'error');
      if (qty < 1 || (v.stock[f.from.value] || 0) < qty) return MF.toast('No hay stock suficiente en la sucursal de origen', 'error');
      const it = [{ productId: p.id, name: p.name, size: v.size, color: v.color, qty }];
      MF.moveStock(it, f.from.value, -1, 'transferencia', 'Hacia ' + MF.branchName(f.to.value));
      MF.moveStock(it, f.to.value, +1, 'transferencia', 'Desde ' + MF.branchName(f.from.value));
      d.transfers.push({ id: MF.uid('t'), date: new Date().toISOString(), from: f.from.value, to: f.to.value, items: [{ productId: p.id, size: v.size, qty }], userId: d.settings.userId, status: 'recibida' });
      MF.audit('transferencia', `Transfirió ${qty} u. de "${p.name}" (${v.size}) de ${MF.branchName(f.from.value)} a ${MF.branchName(f.to.value)}`);
      MF.save(); m.close(); MF.toast('Transferencia registrada'); D.rerender();
    });
  }

  // ---------- Movimientos de inventario (Pro) ----------
  D.register({
    id: 'movimientos', label: 'Movimientos', icon: 'transfer', feature: 'movimientos',
    pitch: 'Vea cada entrada y salida de stock: ventas, ingresos de mercadería, ajustes, anulaciones y devoluciones.',
    pitchList: ['Historial de cada prenda', 'Quién hizo cada movimiento y cuándo', 'Ingresos de mercadería y ajustes', 'Ventas y anulaciones', 'Exportación a Excel', 'Alertas de stock'],
    sub: () => 'Entradas y salidas de stock',
    render(view, params) {
      const d = MF.get();
      const pid = params.p || '';
      const q = st.movQ.toLowerCase();
      const b = MF.branchId();
      const list = (d.movements || []).filter((x) => (!MF.can('sucursales') ? x.branchId === 'b1' : x.branchId === b) && (!pid || x.productId === pid) && (!st.movType || x.type === st.movType) && (!q || (x.name + ' ' + x.ref).toLowerCase().includes(q))).slice().reverse();
      const p = pid && MF.product(pid);
      const ins = list.filter((x) => x.qty > 0).reduce((a, x) => a + x.qty, 0);
      const outs = list.filter((x) => x.qty < 0).reduce((a, x) => a - x.qty, 0);
      view.innerHTML = `${p ? `<div class="alert-strip info">${MF.icon('filter', 'sm')}<span>Movimientos de <b>${esc(p.name)}</b></span><a class="btn ghost sm" href="#/movimientos">Ver todos</a></div>` : ''}
        <div class="kpis kpis-4"><div class="kpi mint"><small>Entradas</small><b>+${MF.num(ins)}</b><em>unidades</em></div><div class="kpi pink"><small>Salidas</small><b>−${MF.num(outs)}</b><em>unidades</em></div></div>
        <div class="search-big">${MF.icon('search', 'sm')}<input id="mq" type="search" placeholder="Buscar prenda o referencia" value="${esc(st.movQ)}"></div>
        <div class="chips-row scroll-x"><button class="fchip sm ${!st.movType ? 'on' : ''}" data-mt="">Todos</button>${Object.entries(MF.MOVE_TYPES).map(([k, l]) => `<button class="fchip sm ${st.movType === k ? 'on' : ''}" data-mt="${k}">${l}</button>`).join('')}</div>
        <div class="toolbar"><span class="result-count">${list.length} movimientos</span><span class="spacer"></span><button class="btn ghost sm" id="mexp">${MF.icon('download', 'sm')} Excel</button></div>
        <div class="panel">${moveList(list.slice(0, 150)).replace('<ul class="list moves">', '<ul class="list moves with-name">')}</div>`;
      // Nombre del producto en cada fila
      view.querySelectorAll('.moves li').forEach((li, i) => { const x = list[i]; if (x) li.querySelector('.grow').insertAdjacentHTML('afterbegin', `<span class="mv-name">${esc(x.name)}</span>`); });
      const mq = view.querySelector('#mq');
      mq.addEventListener('input', () => { st.movQ = mq.value; const pos = mq.selectionStart; D.rerender(); const n = document.querySelector('#mq'); n.focus(); n.setSelectionRange(pos, pos); });
      view.querySelectorAll('[data-mt]').forEach((x) => x.addEventListener('click', () => { st.movType = x.dataset.mt; D.rerender(); }));
      view.querySelector('#mexp').addEventListener('click', () => {
        const rows = [['Fecha', 'Producto', 'Talla', 'Color', 'Cantidad', 'Tipo', 'Referencia', 'Usuario', 'Sucursal']];
        list.forEach((x) => rows.push([MF.fdate(x.date, true), x.name, x.size, x.color, x.qty, MF.MOVE_TYPES[x.type] || x.type, x.ref, MF.userName(x.userId), MF.branchName(x.branchId)]));
        MF.downloadCSV('movimientos-inventario.csv', rows); MF.toast('Movimientos descargados');
      });
    }
  });
})();
