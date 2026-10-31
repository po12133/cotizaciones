(function () {
  const TOR = window.TOR;
  const S = TOR.store, Q = TOR.q, C = TOR.cmp, A = TOR.app;
  const { esc, fmt } = TOR.ui;
  const icon = TOR.icon;

  function stats(s) {
    const v = S.db.ventas.filter((x) => x.sucursal === s.id && x.estado !== 'anulada' && Q.inRange(x.fecha, 'mes'));
    const valor = S.db.productos.filter((p) => p.tipo !== 'servicio').reduce((t, p) => t + S.stockOf(s.id, p.id) * p.costo, 0);
    const bajo = S.db.productos.filter((p) => p.tipo !== 'servicio' && S.stockOf(s.id, p.id) <= S.minOf(p.id, s.id)).length;
    return { ventas: Q.sumBy(v, (x) => x.total), n: v.length, ot: S.db.ordenes.filter((o) => o.sucursal === s.id && !['entregada', 'cancelada'].includes(o.estado)).length, valor, bajo, usuarios: S.db.usuarios.filter((u) => u.estado === 'activo' && (u.sucursales.includes(s.id) || u.sucursales.includes('*'))).length, caja: S.cajaAbierta(s.id) };
  }

  function render(el) {
    const write = A.can('sucursales');
    const list = S.db.sucursales.filter((s) => S.inScope(s.id));
    el.innerHTML = `
      <div class="page-head"><div><p class="lead">Administración centralizada de las sucursales: cada una con sus almacenes, inventario independiente, caja y usuarios asignados. Las cifras corresponden al mes en curso.</p></div>
        <div class="actions">${A.actionBtn('sucursales', `<button class="btn btn-primary" id="sNew">${icon('plus', 'sm')}Nueva sucursal</button>`)}</div></div>
      <div class="grid g-3">${list.map((s) => { const x = stats(s); return `<article class="card branch-card">
        <div class="bc-head"><span class="bc-ico">${icon('branches')}</span><div style="min-width:0"><h3 style="font-size:16px">${esc(s.nombre)}</h3><small class="muted">${esc(s.direccion)}</small></div><span class="spacer"></span>${x.caja ? A.badge('Caja abierta', 'good') : A.badge('Caja cerrada', 'plain')}</div>
        <div class="bc-stats"><div><small>Ventas del mes</small><b>${fmt.money(x.ventas)}</b></div><div><small>Órdenes activas</small><b>${x.ot}</b></div><div><small>Inventario valorizado</small><b>${fmt.money(x.valor)}</b></div><div><small>Ítems con stock bajo</small><b style="${x.bajo ? 'color:var(--warning-ink)' : ''}">${x.bajo}</b></div></div>
        <div class="card-body stack" style="gap:6px"><small class="muted">${icon('user', 'sm')} Responsable: <b>${esc(S.user(s.responsable) ? S.user(s.responsable).nombre : '—')}</b> · ${x.usuarios} usuarios</small><small class="muted">${icon('clock', 'sm')} ${esc(s.horario || '')} · ${esc(s.telefono)}</small>
          <div class="chips" style="margin-top:6px">${s.almacenes.map((a) => `<span class="chip" style="cursor:default">${icon('box', 'sm')}${esc(a.nombre)}</span>`).join('')}</div></div>
        <div class="bc-foot"><button class="btn btn-outline btn-sm" data-view="${s.id}">${icon('dashboard', 'sm')}Ver indicadores</button>${write ? `<button class="btn btn-ghost btn-sm" data-wh="${s.id}">${icon('plus', 'sm')}Almacén</button><button class="btn btn-ghost btn-sm" data-edit="${s.id}">${icon('edit', 'sm')}Editar</button>` : ''}</div>
      </article>`; }).join('')}</div>
      <div class="card"><div class="card-head"><div><h3>Transferencias recientes entre sucursales</h3><small>Movimientos de material registrados en el kardex</small></div><div class="actions">${A.can('inventario') ? `<button class="btn btn-outline btn-sm" id="sTr">${icon('swap', 'sm')}Nueva transferencia</button>` : ''}</div></div><div id="sTrList"></div></div>`;
    const trs = S.db.movimientos.filter((m) => m.origen === 'transferencia' && m.cantidad < 0 && (S.inScope(m.sucursal) || S.ui.sucursal === '*')).slice().reverse();
    C.dataTable(el.querySelector('#sTrList'), { id: 'suc-tr', rows: trs, pageSize: 6, empty: { icon: 'swap', title: 'Sin transferencias' }, columns: [
      { key: 'r', label: 'Referencia', cls: 'code', render: (m) => esc(m.ref) },
      { key: 'f', label: 'Fecha', render: (m) => fmt.dateTime(m.fecha) },
      { key: 'p', label: 'Producto', render: (m) => esc(S.prod(m.producto).nombre) },
      { key: 'o', label: 'Ruta', render: (m) => `${esc(S.suc(m.sucursal).nombre)} → ${esc(m.nota.replace('Envío a ', '').split(' · ')[0])}` },
      { key: 'q', label: 'Cantidad', align: 'right', render: (m) => `${fmt.qty(-m.cantidad)} ${esc(S.prod(m.producto).unidad)}` }
    ] });
    el.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => { S.setUI({ sucursal: b.dataset.view }); document.getElementById('branchSelect').value = b.dataset.view; location.hash = '#/dashboard'; }));
    el.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => form(S.suc(b.dataset.edit))));
    el.querySelectorAll('[data-wh]').forEach((b) => b.addEventListener('click', () => C.formModal({ title: `Nuevo almacén · ${S.suc(b.dataset.wh).nombre}`, size: 'narrow', submit: 'Agregar', body: '<label class="field"><span>Nombre del almacén *</span><input class="input" name="nombre" placeholder="Ej.: Depósito de planchas"></label>', rules: { nombre: { required: true, minLen: 3 } }, onSubmit: (d, close) => { if (A.run(() => S.ops.addWarehouse(b.dataset.wh, d.nombre), 'Almacén agregado', d.nombre)) close(); } })));
    const nb = el.querySelector('#sNew');
    if (nb) nb.addEventListener('click', () => form());
    const tr = el.querySelector('#sTr');
    if (tr) tr.addEventListener('click', () => TOR.views.inventario.transfer());
  }

  function form(s) {
    const resp = S.db.usuarios.filter((u) => ['R1', 'R2', 'R3'].includes(u.rol) && u.estado === 'activo');
    C.formModal({
      title: s ? `Editar ${s.nombre}` : 'Nueva sucursal', sub: s ? '' : 'Se crea con un almacén propio e inventario en cero.', submit: s ? 'Guardar' : 'Crear sucursal',
      body: `<div class="form-grid"><label class="field full"><span>Nombre *</span><input class="input" name="nombre" value="${esc(s ? s.nombre : '')}" placeholder="Ej.: Sucursal Parque Industrial"></label>
        <label class="field full"><span>Dirección *</span><input class="input" name="direccion" value="${esc(s ? s.direccion : '')}"></label>
        <label class="field"><span>Teléfono</span><input class="input" name="telefono" value="${esc(s ? s.telefono : '+591 ')}"></label>
        <label class="field"><span>Horario</span><input class="input" name="horario" value="${esc(s ? s.horario : 'Lun–Sáb 08:00–18:00')}"></label>
        <label class="field full"><span>Responsable</span><select class="select" name="responsable">${C.options(resp, s ? s.responsable : '')}</select></label></div>`,
      rules: { nombre: { required: true, minLen: 3 }, direccion: { required: true, minLen: 5 } },
      onSubmit: (d, close) => { if (A.run(() => S.ops.saveBranch(d, s && s.id), s ? 'Sucursal actualizada' : 'Sucursal creada', d.nombre)) close(); }
    });
  }

  TOR.views.sucursales = { render };
})();
