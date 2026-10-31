(function () {
  const TOR = window.TOR;
  const S = TOR.store, Q = TOR.q, C = TOR.cmp, L = TOR.labels, A = TOR.app;
  const { esc, fmt } = TOR.ui;
  const icon = TOR.icon;
  const st = C.state('proveedores', { q: '', periodo: '6m' });

  const stats = (p) => {
    const c = S.db.compras.filter((x) => x.proveedor === p.id && x.estado !== 'anulada' && S.inScope(x.sucursal));
    const per = c.filter((x) => Q.inRange(x.fecha, st.periodo));
    return { total: Q.sumBy(per, (x) => x.total), n: per.length, ultima: c.length ? c[0].fecha : null, deuda: Q.sumBy(c.filter((x) => x.estado === 'recibida' && !x.pagado), (x) => x.total), pend: c.filter((x) => x.estado === 'pendiente').length };
  };

  function render(el) {
    const t = st.q.trim().toLowerCase();
    const rows = S.db.proveedores.filter((p) => !t || [p.nombre, p.rubro, p.nit, p.contacto].some((x) => String(x).toLowerCase().includes(t))).map((p) => Object.assign({ p }, stats(p)));
    const total = Q.sumBy(rows, (r) => r.total);
    el.innerHTML = `
      <div class="page-head"><div><p class="lead">Registro de proveedores con su historial de compras, costos de adquisición y saldos por pagar. El total muestra el reporte por proveedor del período elegido.</p></div>
        <div class="actions">${A.actionBtn('proveedores', `<button class="btn btn-primary" id="prNew">${icon('plus', 'sm')}Nuevo proveedor</button>`)}</div></div>
      <div class="grid g-21">
        <div class="card">
          <div class="filters">
            <div class="input-icon">${icon('search', 'sm')}<input class="input" id="prQ" type="search" placeholder="Nombre, rubro o NIT" value="${esc(st.q)}"></div>
            <select class="select" id="prPer" aria-label="Período">${Q.PERIODOS.map(([k, l]) => `<option value="${k}" ${st.periodo === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
            <span class="count">${rows.length} proveedores</span>
          </div>
          <div id="prBody"></div>
        </div>
        <div class="card"><div class="card-head"><div><h3>Compras por proveedor</h3><small>${esc(Q.PERIODOS.find((x) => x[0] === st.periodo)[1])} · ${fmt.money(total)}</small></div></div><div class="card-body"><div id="prChart"></div></div></div>
      </div>`;
    C.dataTable(el.querySelector('#prBody'), {
      id: 'proveedores', rows, defaultSort: 'total', empty: { icon: 'briefcase', title: 'Sin proveedores' },
      columns: [
        { key: 'nombre', label: 'Proveedor', sort: (r) => r.p.nombre, render: (r) => `<b>${esc(r.p.nombre)}</b><span class="sub">${esc(r.p.rubro)}</span>` },
        { key: 'contacto', label: 'Contacto', render: (r) => `${esc(r.p.contacto)}<span class="sub">${esc(r.p.telefono)}</span>` },
        { key: 'plazo', label: 'Crédito', render: (r) => (r.p.plazoPago ? `${r.p.plazoPago} días` : 'Contado') },
        { key: 'n', label: 'Órdenes', align: 'right', sort: (r) => r.n, render: (r) => r.n },
        { key: 'deuda', label: 'Por pagar', align: 'right', sort: (r) => r.deuda, render: (r) => (r.deuda ? `<span style="color:var(--warning-ink);font-weight:600">${fmt.money(r.deuda)}</span>` : '—') },
        { key: 'total', label: 'Comprado', align: 'right', sort: (r) => r.total, render: (r) => `<b>${fmt.money(r.total)}</b>` }
      ],
      onRow: (r) => open(r.p.id)
    });
    TOR.charts.hbars(el.querySelector('#prChart'), rows.slice().sort((a, b) => b.total - a.total).map((r) => ({ label: r.p.nombre, value: r.total })), { fmt: fmt.money, color: 'var(--series-2)' });
    const q = el.querySelector('#prQ');
    q.addEventListener('input', () => { st.q = q.value; C.resetPage('proveedores'); A.render(); const n = document.getElementById('prQ'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); });
    el.querySelector('#prPer').addEventListener('change', (e) => { st.periodo = e.target.value; A.render(); });
    const nb = el.querySelector('#prNew');
    if (nb) nb.addEventListener('click', () => form());
  }

  function open(id) {
    const p = S.prov(id);
    if (!p) return;
    const compras = S.db.compras.filter((c) => c.proveedor === id);
    const prods = {};
    compras.filter((c) => c.estado === 'recibida').forEach((c) => c.items.forEach((it) => { const x = prods[it.producto] || (prods[it.producto] = { q: 0, total: 0, ultimo: 0 }); x.q += it.cantidad; x.total += it.cantidad * it.costo; x.ultimo = x.ultimo || it.costo; }));
    const m = TOR.ui.modal({
      title: p.nombre, sub: `${esc(p.rubro)} · NIT ${esc(p.nit)}`, size: 'wide',
      body: `${C.detailGrid([['Contacto', esc(p.contacto)], ['Teléfono', esc(p.telefono)], ['Correo', esc(p.correo)], ['Condición de pago', p.plazoPago ? `Crédito a ${p.plazoPago} días` : 'Contado'], ['Categorías', esc((p.categorias || []).join(', ') || '—')], ['Total histórico', `<b>${fmt.money(Q.sumBy(compras.filter((c) => c.estado !== 'anulada'), (c) => c.total))}</b>`]])}
        <div class="section-title">${icon('package', 'sm')}Costos de adquisición por producto</div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Producto</th><th class="right">Cantidad comprada</th><th class="right">Costo promedio</th><th class="right">Último costo</th></tr></thead><tbody>${Object.entries(prods).sort((a, b) => b[1].total - a[1].total).slice(0, 8).map(([pid, x]) => `<tr><td>${esc(S.prod(pid).nombre)}</td><td class="right num">${fmt.qty(x.q)} ${esc(S.prod(pid).unidad)}</td><td class="right num">${fmt.money(x.total / x.q)}</td><td class="right num">${fmt.money(x.ultimo)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">Sin compras recibidas</td></tr>'}</tbody></table></div>
        <div class="section-title">${icon('history', 'sm')}Historial de compras</div><div id="prHist"></div>`,
      foot: `${A.can('compras') ? `<button class="btn btn-outline" data-buy>${icon('truck', 'sm')}Nueva compra</button>` : ''}<span class="spacer"></span>${A.can('proveedores') ? `<button class="btn btn-outline" data-edit>${icon('edit', 'sm')}Editar</button>` : ''}<button class="btn btn-outline" data-close>Cerrar</button>`,
      onClose: C.clearParam
    });
    C.dataTable(m.el.querySelector('#prHist'), { id: `pr-h-${id}`, rows: compras, pageSize: 6, columns: [{ key: 'c', label: 'Código', cls: 'code', render: (c) => esc(c.codigo) }, { key: 'f', label: 'Fecha', render: (c) => fmt.date(c.fecha) }, { key: 's', label: 'Sucursal', render: (c) => esc(S.suc(c.sucursal).nombre) }, { key: 'e', label: 'Estado', render: (c) => A.badge(L.estadoCompra[c.estado], L.claseCompra[c.estado]) }, { key: 't', label: 'Total', align: 'right', render: (c) => fmt.money(c.total) }], onRow: (c) => { m.close(); TOR.views.compras.open(c.id); } });
    const b = m.el.querySelector('[data-buy]');
    if (b) b.addEventListener('click', () => { m.close(); TOR.views.compras.create({ proveedor: p.id }); });
    const e = m.el.querySelector('[data-edit]');
    if (e) e.addEventListener('click', () => { m.close(); form(p); });
  }

  function form(p) {
    C.formModal({
      title: p ? `Editar ${p.nombre}` : 'Nuevo proveedor', submit: p ? 'Guardar cambios' : 'Registrar proveedor',
      body: `<div class="form-grid">
        <label class="field full"><span>Razón social *</span><input class="input" name="nombre" value="${esc(p ? p.nombre : '')}"></label>
        <label class="field"><span>NIT *</span><input class="input" name="nit" value="${esc(p ? p.nit : '')}"></label>
        <label class="field"><span>Rubro *</span><input class="input" name="rubro" value="${esc(p ? p.rubro : '')}" placeholder="Ej.: Aceros especiales"></label>
        <label class="field"><span>Contacto</span><input class="input" name="contacto" value="${esc(p ? p.contacto : '')}"></label>
        <label class="field"><span>Teléfono *</span><input class="input" name="telefono" value="${esc(p ? p.telefono : '+591 ')}"></label>
        <label class="field"><span>Correo</span><input class="input" type="email" name="correo" value="${esc(p ? p.correo : '')}"></label>
        <label class="field"><span>Plazo de crédito (días)</span><input class="input" type="number" name="plazoPago" min="0" value="${p ? p.plazoPago : 0}"></label></div>`,
      rules: { nombre: { required: true, minLen: 3 }, nit: { required: true, minLen: 5 }, rubro: { required: true }, telefono: { required: true, minLen: 8 }, correo: { email: true }, plazoPago: { number: true, nonNegative: true } },
      onSubmit: (d, close) => { d.plazoPago = Number(d.plazoPago) || 0; const r = A.run(() => S.ops.saveSupplier(d, p && p.id), p ? 'Proveedor actualizado' : 'Proveedor registrado', d.nombre); if (r) { close(); open(r.id); } }
    });
  }

  TOR.views.proveedores = { render, open, form };
})();
