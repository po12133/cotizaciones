(function () {
  const TOR = window.TOR;
  const S = TOR.store, Q = TOR.q, C = TOR.cmp, L = TOR.labels, A = TOR.app;
  const { esc, fmt } = TOR.ui;
  const icon = TOR.icon;
  const st = C.state('ventas', { q: '', periodo: 'mes', metodo: '', estado: '' });

  function render(el) {
    const t = st.q.trim().toLowerCase();
    const base = S.scoped(S.db.ventas).filter((v) => Q.inRange(v.fecha, st.periodo));
    const rows = base.filter((v) => (!st.metodo || v.metodo === st.metodo) && (!st.estado || v.estado === st.estado) && (!t || [v.codigo, S.cli(v.cliente).nombre, ...v.items.map((it) => S.prod(it.producto).nombre)].some((x) => x.toLowerCase().includes(t))));
    const validas = base.filter((v) => v.estado !== 'anulada');
    const total = Q.sumBy(validas, (v) => v.total);
    const porCobrar = S.scoped(S.db.ventas).filter((v) => v.estado === 'pendiente');
    el.innerHTML = `
      <div class="page-head"><div><p class="lead">Ventas de productos comerciales con descuentos, varios métodos de pago y comprobante interno. Cada venta descuenta stock de la sucursal y registra el ingreso en caja.</p></div>
        <div class="actions"><button class="btn btn-outline" id="vExp">${icon('excel', 'sm')}Exportar Excel</button>${A.actionBtn('ventas', `<button class="btn btn-primary" id="vNew">${icon('plus', 'sm')}Registrar venta</button>`)}</div></div>
      <div class="kpis">
        ${C.kpi({ label: 'Total vendido', value: fmt.money(total), sub: `${validas.length} ventas en el período`, icon: 'cart', tone: 'accent' })}
        ${C.kpi({ label: 'Ticket promedio', value: fmt.money(validas.length ? total / validas.length : 0), sub: 'Importe medio por venta', icon: 'receipt' })}
        ${C.kpi({ label: 'Utilidad estimada', value: fmt.money(Q.sumBy(validas, Q.margenVenta)), sub: 'Precio − costo − descuentos', icon: 'trendUp', tone: 'good' })}
        ${C.kpi({ label: 'Por cobrar (crédito)', value: fmt.money(Q.sumBy(porCobrar, (v) => v.total)), sub: `${porCobrar.length} ventas pendientes`, icon: 'clock', tone: porCobrar.length ? 'alert' : '', link: '#/caja?tab=cuentas' })}
      </div>
      <div class="card">
        <div class="filters">
          <div class="input-icon">${icon('search', 'sm')}<input class="input" id="vQ" type="search" placeholder="Código, cliente o producto" value="${esc(st.q)}"></div>
          <select class="select" id="vPer" aria-label="Período">${Q.PERIODOS.map(([k, l]) => `<option value="${k}" ${st.periodo === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <select class="select" id="vMet" aria-label="Método de pago"><option value="">Todo método de pago</option>${['efectivo', 'transferencia', 'qr', 'tarjeta', 'credito'].map((k) => `<option value="${k}" ${st.metodo === k ? 'selected' : ''}>${L.metodo[k]}</option>`).join('')}</select>
          <select class="select" id="vEst" aria-label="Estado"><option value="">Todo estado</option>${Object.entries(L.estadoVenta).map(([k, v]) => `<option value="${k}" ${st.estado === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
          <span class="count">${rows.length} ventas</span>
        </div>
        <div id="vBody"></div>
      </div>`;
    C.dataTable(el.querySelector('#vBody'), {
      id: 'ventas', rows, defaultSort: 'fecha',
      empty: { icon: 'cart', title: 'Sin ventas en este período' },
      columns: [
        { key: 'codigo', label: 'Código', cls: 'code', sort: (v) => v.codigo, render: (v) => esc(v.codigo) },
        { key: 'fecha', label: 'Fecha', sort: (v) => v.fecha, render: (v) => `<span class="nowrap">${fmt.dateTime(v.fecha)}</span>` },
        { key: 'cliente', label: 'Cliente', sort: (v) => S.cli(v.cliente).nombre, render: (v) => `${esc(S.cli(v.cliente).nombre)}${v.cotizacion ? '<span class="sub">Desde cotización</span>' : ''}` },
        { key: 'items', label: 'Detalle', render: (v) => `<span class="muted">${esc(v.items[0].descripcion || S.prod(v.items[0].producto).nombre)}${v.items.length > 1 ? ` y ${v.items.length - 1} más` : ''}</span>` },
        { key: 'sucursal', label: 'Sucursal', render: (v) => esc(S.suc(v.sucursal).nombre) },
        { key: 'metodo', label: 'Pago', render: (v) => esc(L.metodo[v.metodo]) },
        { key: 'estado', label: 'Estado', render: (v) => A.badge(L.estadoVenta[v.estado], L.claseVenta[v.estado]) },
        { key: 'total', label: 'Total', align: 'right', sort: (v) => v.total, render: (v) => `<b>${fmt.money(v.total)}</b>${v.descuento ? `<span class="sub">desc. ${fmt.money(v.descuento)}</span>` : ''}` }
      ],
      onRow: (v) => open(v.id)
    });
    bindFilters(el, 'v', 'ventas', st);
    el.querySelector('#vExp').addEventListener('click', () => {
      C.csv(`ventas-${S.today()}.csv`, ['Código', 'Fecha', 'Cliente', 'NIT/CI', 'Sucursal', 'Método', 'Estado', 'Subtotal', 'Descuento', 'Total'], rows.map((v) => [v.codigo, v.fecha.replace('T', ' '), S.cli(v.cliente).nombre, S.cli(v.cliente).nit, S.suc(v.sucursal).nombre, L.metodo[v.metodo], L.estadoVenta[v.estado], C.n2(v.subtotal), C.n2(v.descuento), C.n2(v.total)]));
      TOR.ui.toast('Archivo exportado', { text: `${rows.length} ventas en formato CSV (abre en Excel).` });
    });
    const nb = el.querySelector('#vNew');
    if (nb) nb.addEventListener('click', () => create());
  }

  function bindFilters(el, p, id, state) {
    const q = el.querySelector(`#${p}Q`);
    q.addEventListener('input', () => { state.q = q.value; C.resetPage(id); A.render(); const n = document.getElementById(`${p}Q`); n.focus(); n.setSelectionRange(n.value.length, n.value.length); });
    [['Per', 'periodo'], ['Met', 'metodo'], ['Est', 'estado']].forEach(([s, k]) => { const x = el.querySelector(`#${p}${s}`); if (x) x.addEventListener('change', () => { state[k] = x.value; C.resetPage(id); A.render(); }); });
  }

  function open(id) {
    const v = S.db.ventas.find((x) => x.id === id);
    if (!v) return;
    const write = A.can('ventas');
    const m = TOR.ui.modal({
      title: `Venta ${v.codigo}`, sub: `${fmt.dateTime(v.fecha)} · ${esc(S.suc(v.sucursal).nombre)} · vendedor ${esc(S.user(v.vendedor) ? S.user(v.vendedor).nombre : '')}`, size: 'wide',
      body: `<div class="row wrap" style="margin-bottom:12px">${A.badge(L.estadoVenta[v.estado], L.claseVenta[v.estado])}${v.cotizacion ? A.badge(`Desde ${S.db.cotizaciones.find((q) => q.id === v.cotizacion).codigo}`, 'info') : ''}</div>
        ${v.estado === 'anulada' ? `<div class="info-box warning" style="margin-bottom:12px">${icon('alert', 'sm')}<span>Venta anulada: ${esc(v.motivoAnulacion || '')}. El stock fue devuelto al inventario.</span></div>` : ''}
        ${C.voucher(v)}
        ${v.pagos.length ? `<div class="section-title">${icon('wallet', 'sm')}Pagos</div><ul class="list-plain" style="border:1px solid var(--line);border-radius:8px">${v.pagos.map((p) => `<li><span>${esc(L.metodo[p.metodo])}<small>${fmt.dateTime(p.fecha)}</small></span><b>${fmt.money(p.monto)}</b></li>`).join('')}</ul>` : ''}`,
      foot: `<button class="btn btn-outline" data-print>${icon('printer', 'sm')}Imprimir comprobante</button><span class="spacer"></span>
        ${write && v.estado !== 'anulada' ? `<button class="btn btn-ghost" data-void style="color:var(--critical-ink)">Anular</button>` : ''}
        ${write && v.estado === 'pendiente' ? `<button class="btn btn-primary" data-collect>${icon('wallet', 'sm')}Registrar cobro</button>` : ''}
        <button class="btn btn-outline" data-close>Cerrar</button>`,
      onClose: C.clearParam
    });
    m.el.querySelector('[data-print]').addEventListener('click', C.printCurrentModal);
    const col = m.el.querySelector('[data-collect]');
    if (col) col.addEventListener('click', () => { if (A.run(() => S.ops.collectSale(v.id, 'transferencia'), 'Cobro registrado', 'Ingreso registrado en caja.')) { m.close(); open(v.id); } });
    const vd = m.el.querySelector('[data-void]');
    if (vd) vd.addEventListener('click', () => {
      m.close();
      C.formModal({ title: `Anular venta ${v.codigo}`, size: 'narrow', submit: 'Anular venta', body: `<p class="muted">El stock vendido vuelve al inventario y, si hubo cobro, se registra la devolución en caja.</p><label class="field"><span>Motivo *</span><input class="input" name="motivo" placeholder="Ej.: Error en el producto entregado"></label>`, rules: { motivo: { required: true, minLen: 4 } }, onSubmit: (d, close) => { if (A.run(() => S.ops.voidSale(v.id, d.motivo), 'Venta anulada')) { close(); open(v.id); } } });
    });
  }

  function create(prefill = {}) {
    let editor;
    const suc0 = prefill.sucursal || C.defaultSucursal();
    C.formModal({
      title: 'Registrar venta', sub: 'Los precios se completan desde el catálogo y se pueden ajustar.', size: 'wide', submit: 'Registrar venta',
      body: `<div class="form-grid">
          <label class="field"><span>Cliente *</span><select class="select" name="cliente"><option value="">Seleccione…</option>${C.options(S.db.clientes.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)), prefill.cliente)}</select></label>
          <label class="field"><span>Sucursal *</span><select class="select" name="sucursal">${C.sucursalOptions(suc0)}</select></label>
        </div>
        <div id="vItems"></div>
        <div class="form-grid">
          <label class="field"><span>Método de pago *</span><select class="select" name="metodo">${['efectivo', 'transferencia', 'qr', 'tarjeta', 'credito'].map((k) => `<option value="${k}">${L.metodo[k]}</option>`).join('')}</select><small>"Crédito" deja la venta en cuentas por cobrar.</small></label>
          <label class="field"><span>Descuento (Bs)</span><input class="input" type="number" name="descuento" min="0" step="0.5" value="0"></label>
        </div>
        <div id="vTot"></div>`,
      rules: { cliente: { required: true }, sucursal: { required: true }, descuento: { number: true, nonNegative: true } },
      onOpen: (el, close, form) => {
        const tot = (sub = editor.totals()) => { const d = Number(form.descuento.value) || 0; el.querySelector('#vTot').innerHTML = C.totalsBlock([['Subtotal', fmt.money(sub)], ['Descuento', fmt.money(-d)], ['Total a cobrar', fmt.money(sub - d), 'grand']]); };
        editor = C.itemsEditor(el.querySelector('#vItems'), { mode: 'venta', sucursal: () => form.sucursal.value, items: prefill.items, onChange: tot });
        form.sucursal.addEventListener('change', () => editor.redraw());
        form.descuento.addEventListener('input', () => tot());
      },
      onSubmit: (d, close) => {
        const err = editor.validate();
        if (err) { TOR.ui.toast('Revise los productos', { text: err, type: 'critical' }); return; }
        const v = A.run(() => S.ops.createSale(Object.assign(d, { items: editor.items() })), 'Venta registrada', (r) => `${r.codigo} · ${fmt.money(r.total)}`);
        if (v) { close(); open(v.id); }
      }
    });
  }

  TOR.views.ventas = { render, open, create, bindFilters };
})();
