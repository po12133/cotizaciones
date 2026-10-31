(function () {
  const TOR = window.TOR;
  const S = TOR.store, Q = TOR.q, C = TOR.cmp, L = TOR.labels, A = TOR.app;
  const { esc, fmt } = TOR.ui;
  const icon = TOR.icon;
  const st = C.state('inventario', { tab: 'existencias', q: '', cat: '', bajo: false, origen: '', periodo: 'mes' });

  const almacenDe = (p, s) => { const sc = S.suc(s); return (p.almacen === 'taller' && sc.almacenes[1] ? sc.almacenes[1] : sc.almacenes[0]).nombre; };
  const sucs = () => S.db.sucursales.filter((s) => S.inScope(s.id));

  function rowsExistencias() {
    const t = st.q.trim().toLowerCase();
    return S.db.productos.filter((p) => p.tipo !== 'servicio' && p.activo && (!st.cat || p.categoria === st.cat) && (!t || [p.nombre, p.sku].some((x) => x.toLowerCase().includes(t)))).map((p) => {
      const per = sucs().map((s) => ({ s, q: S.stockOf(s.id, p.id), min: S.minOf(p.id, s.id) }));
      const q = per.reduce((a, x) => a + x.q, 0);
      const min = per.reduce((a, x) => a + x.min, 0);
      const bajo = per.some((x) => x.q <= x.min);
      const sin = per.some((x) => x.q <= 0);
      return { p, per, q, min, bajo, sin, valor: q * p.costo };
    }).filter((r) => !st.bajo || r.bajo);
  }

  function render(el, route) {
    if (route.query.f === 'bajo') { st.bajo = true; st.tab = 'existencias'; route.query.f = null; }
    const write = A.can('inventario');
    const all = S.db.productos.filter((p) => p.tipo !== 'servicio');
    const valor = sucs().reduce((t, s) => t + all.reduce((a, p) => a + S.stockOf(s.id, p.id) * p.costo, 0), 0);
    const low = Q.lowStock();
    const movMes = S.db.movimientos.filter((m) => S.inScope(m.sucursal) && Q.inRange(m.fecha, 'mes')).length;
    el.innerHTML = `
      <div class="page-head"><div><p class="lead">Existencias por sucursal y almacén, alertas de stock mínimo, kardex por producto, transferencias y ajustes. Toque un producto para ver su kardex.</p></div>
        <div class="actions"><button class="btn btn-outline" id="iExp">${icon('excel', 'sm')}Exportar</button>${write ? `<button class="btn btn-outline" id="iAdj">${icon('edit', 'sm')}Ajuste</button><button class="btn btn-primary" id="iTr">${icon('swap', 'sm')}Transferir</button>` : A.actionBtn('inventario', '')}</div></div>
      <div class="kpis">
        ${C.kpi({ label: 'Inventario valorizado', value: fmt.money(valor), sub: 'A costo de adquisición', icon: 'box', tone: 'accent' })}
        ${C.kpi({ label: 'Ítems con stock bajo', value: low.length, sub: 'En o bajo el mínimo', icon: 'alert', tone: low.length ? 'alert' : '', link: '#/inventario?f=bajo' })}
        ${C.kpi({ label: 'Sin existencias', value: low.filter((l) => l.cantidad <= 0).length, sub: 'Requieren compra urgente', icon: 'x' })}
        ${C.kpi({ label: 'Movimientos del mes', value: movMes, sub: 'Entradas, salidas, transferencias y ajustes', icon: 'swap' })}
      </div>
      <div class="card">
        <div class="tabs" role="tablist">${[['existencias', 'Existencias'], ['movimientos', 'Historial de movimientos']].map(([k, l]) => `<button role="tab" class="${st.tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
        <div id="iBody"></div>
      </div>`;
    const body = el.querySelector('#iBody');
    if (st.tab === 'existencias') renderExist(body); else renderMov(body);
    el.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { st.tab = b.dataset.tab; A.render(); }));
    const on = (id, fn) => { const b = el.querySelector(id); if (b) b.addEventListener('click', fn); };
    on('#iTr', () => transfer());
    on('#iAdj', () => adjust());
    on('#iExp', () => {
      const rows = rowsExistencias();
      C.csv(`inventario-${S.today()}.csv`, ['SKU', 'Producto', 'Categoría', 'Unidad', ...sucs().map((s) => s.nombre), 'Total', 'Costo unit.', 'Valor'], rows.map((r) => [r.p.sku, r.p.nombre, r.p.categoria, r.p.unidad, ...r.per.map((x) => C.n2(x.q)), C.n2(r.q), C.n2(r.p.costo), C.n2(r.valor)]));
      TOR.ui.toast('Inventario exportado', { text: `${rows.length} productos en formato CSV.` });
    });
  }

  function renderExist(body) {
    const rows = rowsExistencias();
    const multi = sucs().length > 1;
    body.innerHTML = `<div class="filters">
        <div class="input-icon">${icon('search', 'sm')}<input class="input" id="iQ" type="search" placeholder="Producto o SKU" value="${esc(st.q)}"></div>
        <select class="select" id="iCat" aria-label="Categoría"><option value="">Todas las categorías</option>${S.db.categorias.filter((c) => c !== 'Servicios').map((c) => `<option ${st.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
        <button class="chip ${st.bajo ? 'on' : ''}" id="iLow">${icon('alert', 'sm')}Solo stock bajo</button>
        <span class="count">${rows.length} productos</span></div><div id="iTable"></div>`;
    C.dataTable(body.querySelector('#iTable'), {
      id: 'inventario', rows, pageSize: 15, defaultSort: 'estado',
      rowClass: (r) => (r.sin ? 'danger' : r.bajo ? 'low' : ''),
      columns: [
        { key: 'sku', label: 'SKU', cls: 'code', sort: (r) => r.p.sku, render: (r) => esc(r.p.sku) },
        { key: 'nombre', label: 'Producto', sort: (r) => r.p.nombre, render: (r) => `<b>${esc(r.p.nombre)}</b><span class="sub">${esc(r.p.categoria)} · ${esc(L.tipoProd[r.p.tipo])}</span>` },
        { key: 'almacen', label: multi ? 'Por sucursal' : 'Almacén', render: (r) => (multi ? r.per.map((x) => `<span class="sub" style="${x.q <= x.min ? 'color:var(--warning-ink);font-weight:600' : ''}">${esc(x.s.nombre)}: ${fmt.qty(x.q)}</span>`).join('') : esc(almacenDe(r.p, r.per[0].s.id))) },
        { key: 'stock', label: 'Stock', sort: (r) => r.q, render: (r) => `<div class="stock-cell"><b class="num">${fmt.qty(r.q)} ${esc(r.p.unidad)}</b><div class="stock-bar ${r.sin ? 'out' : r.bajo ? 'low' : ''}"><span style="width:${Math.min(100, (r.q / Math.max(1, r.min * 3)) * 100)}%"></span></div></div>` },
        { key: 'min', label: 'Mínimo', align: 'right', sort: (r) => r.min, render: (r) => `${fmt.qty(r.min)}` },
        { key: 'costo', label: 'Costo unit.', align: 'right', sort: (r) => r.p.costo, render: (r) => fmt.money(r.p.costo) },
        { key: 'valor', label: 'Valor', align: 'right', sort: (r) => r.valor, render: (r) => fmt.money(r.valor) },
        { key: 'estado', label: 'Alerta', sort: (r) => (r.sin ? 2 : r.bajo ? 1 : 0), render: (r) => (r.sin ? A.badge('Sin stock', 'critical') : r.bajo ? A.badge('Stock bajo', 'warning') : A.badge('Normal', 'good')) }
      ],
      onRow: (r) => kardex(r.p.id)
    });
    const q = body.querySelector('#iQ');
    q.addEventListener('input', () => { st.q = q.value; C.resetPage('inventario'); A.render(); const n = document.getElementById('iQ'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); });
    body.querySelector('#iCat').addEventListener('change', (e) => { st.cat = e.target.value; C.resetPage('inventario'); A.render(); });
    body.querySelector('#iLow').addEventListener('click', () => { st.bajo = !st.bajo; C.resetPage('inventario'); A.render(); });
  }

  function renderMov(body) {
    const rows = S.db.movimientos.filter((m) => S.inScope(m.sucursal) && Q.inRange(m.fecha, st.periodo) && (!st.origen || m.origen === st.origen)).slice().reverse();
    body.innerHTML = `<div class="filters">
        <select class="select" id="mPer" aria-label="Período">${Q.PERIODOS.map(([k, l]) => `<option value="${k}" ${st.periodo === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <select class="select" id="mOri" aria-label="Tipo de movimiento"><option value="">Todo tipo</option>${Object.entries(L.origenMov).map(([k, v]) => `<option value="${k}" ${st.origen === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <span class="count">${rows.length} movimientos</span></div><div id="mTable"></div>`;
    C.dataTable(body.querySelector('#mTable'), { id: 'movimientos', rows, pageSize: 15, columns: movCols(true), empty: { icon: 'swap', title: 'Sin movimientos en el período' } });
    body.querySelector('#mPer').addEventListener('change', (e) => { st.periodo = e.target.value; C.resetPage('movimientos'); A.render(); });
    body.querySelector('#mOri').addEventListener('change', (e) => { st.origen = e.target.value; C.resetPage('movimientos'); A.render(); });
  }

  function movCols(withProduct) {
    return [
      { key: 'fecha', label: 'Fecha', render: (m) => `<span class="nowrap">${fmt.dateTime(m.fecha)}</span>` },
      { key: 'origen', label: 'Movimiento', render: (m) => `${A.badge(L.origenMov[m.origen] || m.origen, m.cantidad > 0 ? 'good' : m.origen === 'transferencia' ? 'info' : 'plain')}<span class="sub">${esc(m.ref)}</span>` },
      ...(withProduct ? [{ key: 'producto', label: 'Producto', render: (m) => `${esc(S.prod(m.producto).nombre)}<span class="sub">${esc(S.prod(m.producto).sku)}</span>` }] : []),
      { key: 'sucursal', label: 'Sucursal', render: (m) => esc(S.suc(m.sucursal).nombre) },
      { key: 'entrada', label: 'Entrada', align: 'right', render: (m) => (m.cantidad > 0 ? `<span class="amount-in">+${fmt.qty(m.cantidad)}</span>` : '') },
      { key: 'salida', label: 'Salida', align: 'right', render: (m) => (m.cantidad < 0 ? `<span class="amount-out">${fmt.qty(m.cantidad)}</span>` : '') },
      { key: 'saldo', label: 'Saldo', align: 'right', render: (m) => `<b>${fmt.qty(m.saldo)}</b>` },
      { key: 'usuario', label: 'Usuario', render: (m) => `<span class="muted">${esc(S.user(m.usuario) ? S.user(m.usuario).nombre : '')}</span>${m.nota ? `<span class="sub">${esc(m.nota)}</span>` : ''}` }
    ];
  }

  function kardex(pid, sucId) {
    const p = S.prod(pid);
    const s0 = sucId || (S.ui.sucursal === '*' ? 'S1' : S.ui.sucursal);
    const movs = S.db.movimientos.filter((m) => m.producto === pid && m.sucursal === s0).slice().reverse();
    const ent = movs.filter((m) => m.cantidad > 0).reduce((t, m) => t + m.cantidad, 0);
    const sal = movs.filter((m) => m.cantidad < 0).reduce((t, m) => t - m.cantidad, 0);
    const write = A.can('inventario');
    const m = TOR.ui.modal({
      title: `Kardex · ${p.nombre}`, sub: `${esc(p.sku)} · ${esc(p.categoria)} · unidad: ${esc(p.unidad)}`, size: 'wide',
      body: `<div class="row wrap" style="margin-bottom:14px"><label class="field" style="min-width:220px"><span>Sucursal</span><select class="select" id="kSuc">${C.options(S.db.sucursales.filter((s) => A.userBranches().includes(s.id)), s0)}</select></label><span class="spacer"></span>
          ${C.detailGrid([['Stock actual', `<b>${fmt.qty(S.stockOf(s0, pid))} ${esc(p.unidad)}</b>`], ['Stock mínimo', `${S.minOf(pid, s0)} ${esc(p.unidad)}`], ['Almacén', esc(almacenDe(p, s0))], ['Entradas', `+${fmt.qty(ent)}`], ['Salidas', `−${fmt.qty(sal)}`], ['Costo unitario', fmt.money(p.costo)]])}</div>
        <div id="kTable"></div>`,
      foot: `${write ? `<button class="btn btn-outline" data-adj>${icon('edit', 'sm')}Ajustar</button><button class="btn btn-outline" data-tr>${icon('swap', 'sm')}Transferir</button>` : ''}<span class="spacer"></span><button class="btn btn-outline" data-close>Cerrar</button>`
    });
    C.dataTable(m.el.querySelector('#kTable'), { id: `kardex-${pid}-${s0}`, rows: movs, pageSize: 10, columns: movCols(false), empty: { icon: 'history', title: 'Sin movimientos registrados' } });
    m.el.querySelector('#kSuc').addEventListener('change', (e) => { m.close(); kardex(pid, e.target.value); });
    const adj = m.el.querySelector('[data-adj]');
    if (adj) adj.addEventListener('click', () => { m.close(); adjust(pid, s0); });
    const tr = m.el.querySelector('[data-tr]');
    if (tr) tr.addEventListener('click', () => { m.close(); transfer(pid, s0); });
  }

  function transfer(pid = '', origen) {
    const br = S.db.sucursales.filter((s) => A.userBranches().includes(s.id));
    const o0 = origen || C.defaultSucursal();
    C.formModal({
      title: 'Transferencia entre sucursales', sub: 'El material sale del almacén de origen e ingresa al de destino; ambos movimientos quedan en el kardex.', submit: 'Transferir',
      body: `<div class="form-grid"><label class="field"><span>Origen *</span><select class="select" name="origen">${C.options(br, o0)}</select></label>
        <label class="field"><span>Destino *</span><select class="select" name="destino">${C.options(S.db.sucursales.filter((s) => s.id !== o0), '')}</select></label>
        <label class="field full"><span>Producto *</span><select class="select" name="producto">${C.productOptions(pid, (p) => p.tipo !== 'servicio')}</select><small id="trDisp"></small></label>
        <label class="field"><span>Cantidad *</span><input class="input" type="number" name="cantidad" min="0" step="any"></label>
        <label class="field"><span>Nota</span><input class="input" name="nota" placeholder="Ej.: Pedido para OT de la sucursal"></label></div>`,
      rules: { origen: { required: true }, destino: { required: true }, producto: { required: true }, cantidad: { required: true, number: true, positive: true } },
      onOpen: (el, close, f) => {
        const upd = () => { const pr = f.producto.value ? S.prod(f.producto.value) : null; el.querySelector('#trDisp').textContent = pr ? `Disponible en origen: ${fmt.qty(S.stockOf(f.origen.value, pr.id))} ${pr.unidad}` : ''; };
        f.origen.addEventListener('change', () => { f.destino.innerHTML = C.options(S.db.sucursales.filter((s) => s.id !== f.origen.value)); upd(); });
        f.producto.addEventListener('change', upd);
        upd();
      },
      onSubmit: (d, close) => { if (A.run(() => S.ops.transfer(d), 'Transferencia registrada', (ref) => `${ref} · ${d.cantidad} ${S.prod(d.producto).unidad} a ${S.suc(d.destino).nombre}`)) close(); }
    });
  }

  function adjust(pid = '', sucId) {
    C.formModal({
      title: 'Ajuste de inventario', sub: 'Registre el conteo físico: el sistema calcula la diferencia y la deja en el kardex.', submit: 'Registrar ajuste',
      body: `<div class="form-grid"><label class="field"><span>Sucursal *</span><select class="select" name="sucursal">${C.sucursalOptions(sucId || C.defaultSucursal())}</select></label>
        <label class="field"><span>Producto *</span><select class="select" name="producto">${C.productOptions(pid, (p) => p.tipo !== 'servicio')}</select></label>
        <label class="field"><span>Stock en sistema</span><input class="input" id="adjSys" readonly></label>
        <label class="field"><span>Cantidad contada *</span><input class="input" type="number" name="nuevo" min="0" step="any"></label>
        <label class="field full"><span>Motivo *</span><select class="select" name="motivo"><option value="">Seleccione…</option><option>Conteo físico</option><option>Merma por corte o mecanizado</option><option>Material dañado</option><option>Error de registro</option><option>Devolución de cliente</option></select></label></div>`,
      rules: { sucursal: { required: true }, producto: { required: true }, nuevo: { required: true, number: true, nonNegative: true }, motivo: { required: true } },
      onOpen: (el, close, f) => { const upd = () => { el.querySelector('#adjSys').value = f.producto.value ? `${fmt.qty(S.stockOf(f.sucursal.value, f.producto.value))} ${S.prod(f.producto.value).unidad}` : ''; }; f.producto.addEventListener('change', upd); f.sucursal.addEventListener('change', upd); upd(); },
      onSubmit: (d, close) => { if (A.run(() => S.ops.adjust(d), 'Ajuste registrado', (dif) => `Diferencia: ${dif > 0 ? '+' : ''}${fmt.qty(dif)} ${S.prod(d.producto).unidad}`)) close(); }
    });
  }

  TOR.views.inventario = { render, kardex, transfer, adjust };
})();
