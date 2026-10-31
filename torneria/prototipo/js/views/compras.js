(function () {
  const TOR = window.TOR;
  const S = TOR.store, Q = TOR.q, C = TOR.cmp, L = TOR.labels, A = TOR.app;
  const { esc, fmt } = TOR.ui;
  const icon = TOR.icon;
  const st = C.state('compras', { q: '', periodo: '3m', estado: '', proveedor: '' });

  function render(el) {
    const t = st.q.trim().toLowerCase();
    const base = S.scoped(S.db.compras).filter((c) => Q.inRange(c.fecha, st.periodo));
    const rows = base.filter((c) => (!st.estado || c.estado === st.estado) && (!st.proveedor || c.proveedor === st.proveedor) && (!t || [c.codigo, S.prov(c.proveedor).nombre, ...c.items.map((it) => S.prod(it.producto).nombre)].some((x) => x.toLowerCase().includes(t))));
    const validas = base.filter((c) => c.estado !== 'anulada');
    const pend = S.scoped(S.db.compras).filter((c) => c.estado === 'pendiente');
    const porPagar = S.scoped(S.db.compras).filter((c) => c.estado === 'recibida' && !c.pagado);
    const porProv = {};
    validas.forEach((c) => { porProv[c.proveedor] = (porProv[c.proveedor] || 0) + c.total; });
    el.innerHTML = `
      <div class="page-head"><div><p class="lead">Órdenes de compra, recepción de mercadería y costo de adquisición. Al recibir, el stock ingresa al almacén y se actualiza el costo del producto.</p></div>
        <div class="actions"><button class="btn btn-outline" id="cExp">${icon('excel', 'sm')}Exportar Excel</button>${A.actionBtn('compras', `<button class="btn btn-primary" id="cNew">${icon('plus', 'sm')}Registrar compra</button>`)}</div></div>
      <div class="kpis">
        ${C.kpi({ label: 'Total comprado', value: fmt.money(Q.sumBy(validas, (c) => c.total)), sub: `${validas.length} órdenes en el período`, icon: 'truck', tone: 'accent' })}
        ${C.kpi({ label: 'Por recibir', value: pend.length, sub: fmt.money(Q.sumBy(pend, (c) => c.total)), icon: 'box', tone: pend.length ? 'alert' : '' })}
        ${C.kpi({ label: 'Por pagar (crédito)', value: fmt.money(Q.sumBy(porPagar, (c) => c.total)), sub: `${porPagar.length} compras recibidas`, icon: 'wallet', link: '#/caja?tab=cuentas' })}
        ${C.kpi({ label: 'Proveedor principal', value: Object.keys(porProv).length ? esc(S.prov(Object.entries(porProv).sort((a, b) => b[1] - a[1])[0][0]).nombre.split(' ').slice(0, 3).join(' ')) : '—', sub: Object.keys(porProv).length ? fmt.money(Math.max(...Object.values(porProv))) : '', icon: 'briefcase' })}
      </div>
      <div class="card">
        <div class="filters">
          <div class="input-icon">${icon('search', 'sm')}<input class="input" id="cQ" type="search" placeholder="Código, proveedor o producto" value="${esc(st.q)}"></div>
          <select class="select" id="cPer" aria-label="Período">${Q.PERIODOS.map(([k, l]) => `<option value="${k}" ${st.periodo === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <select class="select" id="cEst" aria-label="Estado"><option value="">Todo estado</option>${Object.entries(L.estadoCompra).map(([k, v]) => `<option value="${k}" ${st.estado === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
          <select class="select" id="cProv" aria-label="Proveedor"><option value="">Todos los proveedores</option>${C.options(S.db.proveedores, st.proveedor)}</select>
          <span class="count">${rows.length} compras</span>
        </div>
        <div id="cBody"></div>
      </div>`;
    C.dataTable(el.querySelector('#cBody'), {
      id: 'compras', rows, defaultSort: 'fecha', empty: { icon: 'truck', title: 'Sin compras con estos filtros' },
      columns: [
        { key: 'codigo', label: 'Código', cls: 'code', sort: (c) => c.codigo, render: (c) => esc(c.codigo) },
        { key: 'fecha', label: 'Fecha', sort: (c) => c.fecha, render: (c) => `<span class="nowrap">${fmt.date(c.fecha)}</span>` },
        { key: 'proveedor', label: 'Proveedor', sort: (c) => S.prov(c.proveedor).nombre, render: (c) => esc(S.prov(c.proveedor).nombre) },
        { key: 'items', label: 'Detalle', render: (c) => `<span class="muted">${esc(S.prod(c.items[0].producto).nombre)}${c.items.length > 1 ? ` y ${c.items.length - 1} más` : ''}</span>` },
        { key: 'sucursal', label: 'Sucursal', render: (c) => esc(S.suc(c.sucursal).nombre) },
        { key: 'pago', label: 'Pago', render: (c) => (c.pago === 'credito' ? (c.pagado ? 'Crédito · pagado' : '<span class="badge warning">Crédito · pendiente</span>') : 'Contado') },
        { key: 'estado', label: 'Estado', render: (c) => A.badge(L.estadoCompra[c.estado], L.claseCompra[c.estado]) },
        { key: 'total', label: 'Total', align: 'right', sort: (c) => c.total, render: (c) => `<b>${fmt.money(c.total)}</b>` }
      ],
      onRow: (c) => open(c.id)
    });
    TOR.views.ventas.bindFilters(el, 'c', 'compras', st);
    el.querySelector('#cProv').addEventListener('change', (e) => { st.proveedor = e.target.value; C.resetPage('compras'); A.render(); });
    el.querySelector('#cExp').addEventListener('click', () => {
      C.csv(`compras-${S.today()}.csv`, ['Código', 'Fecha', 'Proveedor', 'Sucursal', 'Estado', 'Pago', 'Pagado', 'Total'], rows.map((c) => [c.codigo, c.fecha.replace('T', ' '), S.prov(c.proveedor).nombre, S.suc(c.sucursal).nombre, L.estadoCompra[c.estado], c.pago, c.pagado ? 'Sí' : 'No', C.n2(c.total)]));
      TOR.ui.toast('Archivo exportado', { text: `${rows.length} compras en formato CSV.` });
    });
    const nb = el.querySelector('#cNew');
    if (nb) nb.addEventListener('click', () => create());
  }

  function open(id) {
    const c = S.db.compras.find((x) => x.id === id);
    if (!c) return;
    const p = S.prov(c.proveedor);
    const write = A.can('compras');
    const m = TOR.ui.modal({
      title: `Compra ${c.codigo}`, sub: `${esc(p.nombre)} · ${esc(S.suc(c.sucursal).nombre)}`, size: 'wide',
      body: `${C.detailGrid([['Estado', A.badge(L.estadoCompra[c.estado], L.claseCompra[c.estado])], ['Fecha de la orden', fmt.dateTime(c.fecha)], ['Recepción', c.fechaRecepcion ? fmt.dateTime(c.fechaRecepcion) : '—'], ['Proveedor', esc(p.nombre)], ['Condición de pago', c.pago === 'credito' ? `Crédito ${p.plazoPago ? `(${p.plazoPago} días)` : ''}` : 'Contado'], ['Pago', c.pagado ? A.badge('Pagado', 'good') : A.badge('Pendiente', 'warning')]])}
        <div style="margin-top:14px">${C.docLines(c.items, 'costo')}</div>
        ${C.totalsBlock([['Total de la compra', fmt.money(c.total), 'grand']])}
        ${c.estado === 'pendiente' ? `<div class="info-box" style="margin-top:12px">${icon('info', 'sm')}<span>Al registrar la recepción, las cantidades ingresan al inventario de ${esc(S.suc(c.sucursal).nombre)} y se actualiza el costo de cada producto.</span></div>` : ''}`,
      foot: `<span class="spacer"></span>
        ${write && c.estado === 'pendiente' ? `<button class="btn btn-ghost" data-cancel style="color:var(--critical-ink)">Anular</button><button class="btn btn-primary" data-receive>${icon('box', 'sm')}Registrar recepción</button>` : ''}
        ${write && c.estado === 'recibida' && !c.pagado ? `<button class="btn btn-primary" data-pay>${icon('wallet', 'sm')}Registrar pago</button>` : ''}
        <button class="btn btn-outline" data-close>Cerrar</button>`,
      onClose: C.clearParam
    });
    const act = (sel, fn, msg, txt) => { const b = m.el.querySelector(sel); if (b) b.addEventListener('click', () => { if (A.run(fn, msg, txt)) { m.close(); open(c.id); } }); };
    act('[data-receive]', () => S.ops.receivePurchase(c.id), 'Mercadería recibida', 'Stock actualizado en el inventario.');
    act('[data-cancel]', () => S.ops.cancelPurchase(c.id), 'Orden de compra anulada');
    act('[data-pay]', () => S.ops.payPurchase(c.id), 'Pago registrado', 'Egreso registrado en caja.');
  }

  function create(prefill = {}) {
    let editor;
    C.formModal({
      title: 'Registrar compra', sub: 'Registre la orden de compra y, si la mercadería ya llegó, su recepción.', size: 'wide', submit: 'Guardar compra',
      body: `<div class="form-grid">
          <label class="field"><span>Proveedor *</span><select class="select" name="proveedor"><option value="">Seleccione…</option>${C.options(S.db.proveedores, prefill.proveedor)}</select></label>
          <label class="field"><span>Sucursal que recibe *</span><select class="select" name="sucursal">${C.sucursalOptions(prefill.sucursal || C.defaultSucursal())}</select></label>
        </div>
        <div id="cItems"></div>
        <div class="form-grid">
          <label class="field"><span>Condición de pago</span><select class="select" name="pago"><option value="contado">Contado</option><option value="credito">Crédito</option></select></label>
          <label class="field" id="cMetF"><span>Método de pago al recibir</span><select class="select" name="metodoPago"><option value="transferencia">Transferencia</option><option value="efectivo">Efectivo (de la caja de la sucursal)</option><option value="qr">QR</option></select></label>
          <label class="field full"><span>Notas</span><input class="input" name="notas" placeholder="N.º de proforma, plazo de entrega…"></label>
          <label class="switch full"><input type="checkbox" name="recibir" value="1"><span class="track"></span><span>La mercadería ya fue recibida (ingresar al inventario ahora)</span></label>
        </div><div id="cTot"></div>`,
      rules: { proveedor: { required: true }, sucursal: { required: true } },
      onOpen: (el, close, form) => {
        editor = C.itemsEditor(el.querySelector('#cItems'), { mode: 'compra', sucursal: () => form.sucursal.value, items: prefill.items, onChange: (t) => { el.querySelector('#cTot').innerHTML = C.totalsBlock([['Total de la compra', fmt.money(t), 'grand']]); } });
        form.sucursal.addEventListener('change', () => editor.redraw());
        form.pago.addEventListener('change', () => { el.querySelector('#cMetF').hidden = form.pago.value !== 'contado'; });
      },
      onSubmit: (d, close) => {
        const err = editor.validate();
        if (err) { TOR.ui.toast('Revise los productos', { text: err, type: 'critical' }); return; }
        const c = A.run(() => S.ops.createPurchase(Object.assign(d, { items: editor.items(), recibir: d.recibir === '1' })), 'Compra registrada', (r) => `${r.codigo} · ${r.estado === 'recibida' ? 'stock actualizado' : 'pendiente de recepción'}`);
        if (c) { close(); open(c.id); }
      }
    });
  }

  TOR.views.compras = { render, open, create };
})();
