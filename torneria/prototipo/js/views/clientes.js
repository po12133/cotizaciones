(function () {
  const TOR = window.TOR;
  const S = TOR.store, Q = TOR.q, C = TOR.cmp, L = TOR.labels, A = TOR.app;
  const { esc, fmt } = TOR.ui;
  const icon = TOR.icon;
  const st = C.state('clientes', { q: '', tipo: '' });

  const stats = (c) => {
    const v = S.db.ventas.filter((x) => x.cliente === c.id && x.estado !== 'anulada' && S.inScope(x.sucursal));
    return { compras: Q.sumBy(v, (x) => x.total), n: v.length, ultima: v.length ? v[0].fecha : null, ot: S.db.ordenes.filter((o) => o.cliente === c.id && S.inScope(o.sucursal)).length, deuda: Q.sumBy(v.filter((x) => x.estado === 'pendiente'), (x) => x.total) };
  };

  function render(el) {
    const t = st.q.trim().toLowerCase();
    const rows = S.db.clientes.filter((c) => (!st.tipo || c.tipo === st.tipo) && (!t || [c.nombre, c.nit, c.contacto, c.telefono].some((x) => String(x).toLowerCase().includes(t)))).map((c) => Object.assign({ c }, stats(c)));
    el.innerHTML = `
      <div class="page-head"><div><p class="lead">Ficha de cada cliente con datos de contacto, historial de compras, trabajos de tornería y cotizaciones.</p></div>
        <div class="actions">${A.actionBtn('clientes', `<button class="btn btn-primary" id="clNew">${icon('plus', 'sm')}Nuevo cliente</button>`)}</div></div>
      <div class="card">
        <div class="filters">
          <div class="input-icon">${icon('search', 'sm')}<input class="input" id="clQ" type="search" placeholder="Nombre, NIT/CI, contacto o teléfono" value="${esc(st.q)}"></div>
          ${C.segment('tipo', [['', 'Todos'], ['empresa', 'Empresas'], ['persona', 'Personas']], st.tipo)}
          <span class="count">${rows.length} clientes</span>
        </div>
        <div id="clBody"></div>
      </div>`;
    C.dataTable(el.querySelector('#clBody'), {
      id: 'clientes', rows, defaultSort: 'compras', empty: { icon: 'contact', title: 'Sin clientes con este criterio' },
      columns: [
        { key: 'nombre', label: 'Cliente', sort: (r) => r.c.nombre, render: (r) => `<b>${esc(r.c.nombre)}</b><span class="sub">${r.c.tipo === 'empresa' ? `Contacto: ${esc(r.c.contacto)}` : 'Persona'}</span>` },
        { key: 'nit', label: 'NIT / CI', render: (r) => `<span class="mono">${esc(r.c.nit)}</span>` },
        { key: 'tel', label: 'Teléfono', render: (r) => `<span class="nowrap">${esc(r.c.telefono)}</span>` },
        { key: 'suc', label: 'Sucursal habitual', render: (r) => esc(S.suc(r.c.sucursal).nombre) },
        { key: 'n', label: 'Compras', align: 'right', sort: (r) => r.n, render: (r) => r.n },
        { key: 'ot', label: 'Trabajos', align: 'right', sort: (r) => r.ot, render: (r) => r.ot },
        { key: 'ultima', label: 'Última compra', sort: (r) => r.ultima || '', render: (r) => (r.ultima ? fmt.date(r.ultima) : '—') },
        { key: 'compras', label: 'Total comprado', align: 'right', sort: (r) => r.compras, render: (r) => `<b>${fmt.money(r.compras)}</b>${r.deuda ? `<span class="sub" style="color:var(--warning-ink)">Por cobrar ${fmt.money(r.deuda)}</span>` : ''}` }
      ],
      onRow: (r) => open(r.c.id)
    });
    const q = el.querySelector('#clQ');
    q.addEventListener('input', () => { st.q = q.value; C.resetPage('clientes'); A.render(); const n = document.getElementById('clQ'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); });
    el.querySelector('[data-seg="tipo"]').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) { st.tipo = b.dataset.v; C.resetPage('clientes'); A.render(); } });
    const nb = el.querySelector('#clNew');
    if (nb) nb.addEventListener('click', () => form());
  }

  function open(id, tab = 'compras') {
    const c = S.cli(id);
    if (!c) return;
    const s = stats(c);
    const ventas = S.db.ventas.filter((v) => v.cliente === id);
    const ots = S.db.ordenes.filter((o) => o.cliente === id);
    const cots = S.db.cotizaciones.filter((q) => q.cliente === id);
    const tabs = [['compras', `Compras (${ventas.length})`], ['trabajos', `Trabajos (${ots.length})`], ['cotizaciones', `Cotizaciones (${cots.length})`]];
    const m = TOR.ui.modal({
      title: c.nombre, sub: `${c.tipo === 'empresa' ? 'Empresa' : 'Persona'} · NIT/CI ${esc(c.nit)} · cliente desde ${fmt.date(c.creado)}`, size: 'wide',
      body: `${C.detailGrid([['Contacto', esc(c.contacto)], ['Teléfono', esc(c.telefono)], ['Correo', esc(c.correo || '—')], ['Dirección', esc(c.direccion)], ['Total comprado', `<b>${fmt.money(s.compras)}</b>`], ['Saldo por cobrar', s.deuda ? `<span style="color:var(--warning-ink);font-weight:600">${fmt.money(s.deuda)}</span>` : fmt.money(0)]])}
        <div class="tabs" style="margin:16px -22px 0;padding:0 22px">${tabs.map(([k, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="clTab" style="margin-top:4px"></div>`,
      foot: `${A.can('ventas') ? `<button class="btn btn-outline" data-sale>${icon('cart', 'sm')}Nueva venta</button>` : ''}<span class="spacer"></span>${A.can('clientes') ? `<button class="btn btn-outline" data-edit>${icon('edit', 'sm')}Editar datos</button>` : ''}<button class="btn btn-outline" data-close>Cerrar</button>`,
      onClose: C.clearParam
    });
    const box = m.el.querySelector('#clTab');
    const show = (t) => {
      m.el.querySelectorAll('[data-t]').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
      if (t === 'compras') C.dataTable(box, { id: `cl-v-${id}`, rows: ventas, pageSize: 8, empty: { icon: 'cart', title: 'Sin compras registradas' }, columns: [{ key: 'c', label: 'Código', cls: 'code', render: (v) => esc(v.codigo) }, { key: 'f', label: 'Fecha', render: (v) => fmt.date(v.fecha) }, { key: 'd', label: 'Detalle', render: (v) => esc(v.items[0].descripcion || S.prod(v.items[0].producto).nombre) + (v.items.length > 1 ? ` y ${v.items.length - 1} más` : '') }, { key: 'e', label: 'Estado', render: (v) => A.badge(L.estadoVenta[v.estado], L.claseVenta[v.estado]) }, { key: 't', label: 'Total', align: 'right', render: (v) => fmt.money(v.total) }], onRow: (v) => { m.close(); TOR.views.ventas.open(v.id); } });
      if (t === 'trabajos') C.dataTable(box, { id: `cl-o-${id}`, rows: ots, pageSize: 8, empty: { icon: 'wrench', title: 'Sin trabajos registrados' }, columns: [{ key: 'c', label: 'Código', cls: 'code', render: (o) => esc(o.codigo) }, { key: 'd', label: 'Trabajo', render: (o) => esc(o.descripcion) }, { key: 'f', label: 'Ingreso', render: (o) => fmt.date(o.ingreso) }, { key: 'e', label: 'Estado', render: (o) => A.badge(L.estadoOT[o.estado], L.claseOT[o.estado]) }, { key: 'p', label: 'Precio', align: 'right', render: (o) => fmt.money(o.precio) }], onRow: (o) => { m.close(); TOR.views.ordenes.open(o.id); } });
      if (t === 'cotizaciones') C.dataTable(box, { id: `cl-q-${id}`, rows: cots, pageSize: 8, empty: { icon: 'quote', title: 'Sin cotizaciones' }, columns: [{ key: 'c', label: 'Código', cls: 'code', render: (q) => esc(q.codigo) }, { key: 'f', label: 'Fecha', render: (q) => fmt.date(q.fecha) }, { key: 'e', label: 'Estado', render: (q) => A.badge(L.estadoCot[q.estado], L.claseCot[q.estado]) }, { key: 't', label: 'Total', align: 'right', render: (q) => fmt.money(q.total) }], onRow: (q) => { m.close(); TOR.views.cotizaciones.open(q.id); } });
    };
    m.el.querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => show(b.dataset.t)));
    show(tab);
    const ed = m.el.querySelector('[data-edit]');
    if (ed) ed.addEventListener('click', () => { m.close(); form(c); });
    const sl = m.el.querySelector('[data-sale]');
    if (sl) sl.addEventListener('click', () => { m.close(); TOR.views.ventas.create({ cliente: c.id }); });
  }

  function form(c) {
    C.formModal({
      title: c ? `Editar ${c.nombre}` : 'Nuevo cliente', submit: c ? 'Guardar cambios' : 'Registrar cliente',
      body: `<div class="form-grid">
        <label class="field full"><span>Nombre o razón social *</span><input class="input" name="nombre" value="${esc(c ? c.nombre : '')}"></label>
        <label class="field"><span>Tipo *</span><select class="select" name="tipo"><option value="empresa" ${c && c.tipo === 'empresa' ? 'selected' : ''}>Empresa</option><option value="persona" ${c && c.tipo === 'persona' ? 'selected' : ''}>Persona</option></select></label>
        <label class="field"><span>NIT / CI *</span><input class="input" name="nit" value="${esc(c ? c.nit : '')}" inputmode="numeric"></label>
        <label class="field"><span>Persona de contacto</span><input class="input" name="contacto" value="${esc(c ? c.contacto : '')}"></label>
        <label class="field"><span>Teléfono *</span><input class="input" name="telefono" value="${esc(c ? c.telefono : '+591 ')}"></label>
        <label class="field"><span>Correo</span><input class="input" type="email" name="correo" value="${esc(c ? c.correo : '')}"></label>
        <label class="field"><span>Sucursal habitual</span><select class="select" name="sucursal">${C.sucursalOptions(c ? c.sucursal : C.defaultSucursal())}</select></label>
        <label class="field full"><span>Dirección</span><input class="input" name="direccion" value="${esc(c ? c.direccion : '')}"></label></div>`,
      rules: { nombre: { required: true, minLen: 3 }, nit: { required: true, minLen: 5 }, telefono: { required: true, minLen: 8 }, correo: { email: true } },
      onSubmit: (d, close) => { if (!d.contacto) d.contacto = d.nombre; const r = A.run(() => S.ops.saveClient(d, c && c.id), c ? 'Cliente actualizado' : 'Cliente registrado', d.nombre); if (r) { close(); open(r.id); } }
    });
  }

  TOR.views.clientes = { render, open, form };
})();
