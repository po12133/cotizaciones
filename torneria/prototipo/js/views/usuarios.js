(function () {
  const TOR = window.TOR;
  const S = TOR.store, C = TOR.cmp, L = TOR.labels, A = TOR.app;
  const { esc, fmt } = TOR.ui;
  const icon = TOR.icon;
  const st = C.state('usuarios', { tab: 'usuarios', q: '' });
  const MODS = TOR.demoData.MODULOS_PERM;

  function render(el) {
    const write = A.can('usuarios');
    el.innerHTML = `
      <div class="page-head"><div><p class="lead">Usuarios, roles personalizados y permisos por módulo. Cada usuario se asigna a una o varias sucursales y solo ve su información. Pruebe "Cambiar de usuario" en la esquina superior derecha.</p></div>
        <div class="actions">${A.actionBtn('usuarios', st.tab === 'roles' ? `<button class="btn btn-primary" id="uRole">${icon('plus', 'sm')}Nuevo rol</button>` : `<button class="btn btn-primary" id="uNew">${icon('plus', 'sm')}Nuevo usuario</button>`)}</div></div>
      <div class="card"><div class="tabs">${[['usuarios', `Usuarios (${S.db.usuarios.length})`], ['roles', `Roles y permisos (${S.db.roles.length})`], ['actividad', 'Registro de actividad']].map(([k, l]) => `<button class="${st.tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div><div id="uBody"></div></div>`;
    const body = el.querySelector('#uBody');
    if (st.tab === 'usuarios') tabUsers(body, write);
    if (st.tab === 'roles') tabRoles(body, write);
    if (st.tab === 'actividad') tabAct(body);
    el.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { st.tab = b.dataset.tab; A.render(); }));
    const nu = el.querySelector('#uNew');
    if (nu) nu.addEventListener('click', () => form());
    const nr = el.querySelector('#uRole');
    if (nr) nr.addEventListener('click', () => C.formModal({ title: 'Nuevo rol', size: 'narrow', submit: 'Crear rol', body: '<label class="field"><span>Nombre *</span><input class="input" name="nombre" placeholder="Ej.: Supervisor de compras"></label><label class="field"><span>Descripción</span><input class="input" name="descripcion"></label><p class="muted" style="font-size:13px">Se crea con acceso de lectura al dashboard; ajuste los permisos en la matriz.</p>', rules: { nombre: { required: true, minLen: 3 } }, onSubmit: (d, close) => { if (A.run(() => S.ops.saveRole(Object.assign(d, { permisos: Object.fromEntries(MODS.map((m) => [m, m === 'dashboard' ? 'read' : 'none'])) })), 'Rol creado', d.nombre)) close(); } }));
  }

  function tabUsers(body, write) {
    const t = st.q.trim().toLowerCase();
    const rows = S.db.usuarios.filter((u) => !t || [u.nombre, u.usuario, u.correo].some((x) => x.toLowerCase().includes(t)));
    body.innerHTML = `<div class="filters"><div class="input-icon">${icon('search', 'sm')}<input class="input" id="uQ" type="search" placeholder="Nombre, usuario o correo" value="${esc(st.q)}"></div><span class="count">${rows.length} usuarios</span></div><div id="uTable"></div>`;
    C.dataTable(body.querySelector('#uTable'), { id: 'usuarios', rows, columns: [
      { key: 'n', label: 'Usuario', sort: (u) => u.nombre, render: (u) => `<div class="row"><span class="avatar sm">${A.initials(u.nombre)}</span><span><b>${esc(u.nombre)}</b><span class="sub">@${esc(u.usuario)} · ${esc(u.correo)}</span></span></div>` },
      { key: 'r', label: 'Rol', sort: (u) => S.rol(u.rol).nombre, render: (u) => A.badge(S.rol(u.rol).nombre, u.rol === 'R1' ? 'accent' : 'plain') },
      { key: 's', label: 'Sucursales', render: (u) => (u.sucursales.includes('*') ? 'Todas' : u.sucursales.map((s) => esc(S.suc(s).nombre)).join(', ')) },
      { key: 'e', label: 'Estado', render: (u) => A.badge(u.estado === 'activo' ? 'Activo' : 'Inactivo', u.estado === 'activo' ? 'good' : 'plain') },
      { key: 'a', label: 'Último acceso', sort: (u) => u.ultimoAcceso || '', render: (u) => (u.ultimoAcceso ? fmt.dateTime(u.ultimoAcceso) : '—') },
      { key: 'x', label: '', align: 'right', render: (u) => (write ? `<button class="btn btn-ghost btn-sm" data-toggle="${u.id}">${u.estado === 'activo' ? 'Desactivar' : 'Activar'}</button>` : '') }
    ], onRow: write ? (u) => form(u) : null });
    const q = body.querySelector('#uQ');
    q.addEventListener('input', () => { st.q = q.value; A.render(); const n = document.getElementById('uQ'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); });
    body.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => A.run(() => S.ops.toggleUser(b.dataset.toggle), 'Estado del usuario actualizado')));
  }

  function tabRoles(body, write) {
    body.innerHTML = `<div class="card-body" style="padding-bottom:0"><div class="legend"><span class="legend-item"><span class="perm write">E</span>Edición</span><span class="legend-item"><span class="perm read">L</span>Lectura</span><span class="legend-item"><span class="perm none">—</span>Sin acceso</span>${write ? '<span class="muted">Cambie un permiso con el selector; se aplica de inmediato.</span>' : ''}</div></div>
      <div class="table-wrap" style="padding:12px 0"><table class="table perm-table"><thead><tr><th>Módulo</th>${S.db.roles.map((r) => `<th title="${esc(r.descripcion || '')}">${esc(r.nombre)}</th>`).join('')}</tr></thead><tbody>
      ${MODS.map((m) => `<tr><td><b>${esc(A.ROUTES[m].label)}</b></td>${S.db.roles.map((r) => { const v = r.permisos[m] || 'none'; return `<td>${write && r.id !== 'R1' ? `<select class="select perm-select" data-role="${r.id}" data-mod="${m}" aria-label="${esc(r.nombre)} · ${esc(A.ROUTES[m].label)}">${['write', 'read', 'none'].map((k) => `<option value="${k}" ${v === k ? 'selected' : ''}>${L.permiso[k]}</option>`).join('')}</select>` : `<span class="perm ${v}">${v === 'write' ? 'E' : v === 'read' ? 'L' : '—'}</span>`}</td>`; }).join('')}</tr>`).join('')}
      <tr><td class="muted">Usuarios asignados</td>${S.db.roles.map((r) => `<td class="muted">${S.db.usuarios.filter((u) => u.rol === r.id).length}</td>`).join('')}</tr></tbody></table></div>`;
    body.querySelectorAll('[data-role]').forEach((s) => s.addEventListener('change', () => { const r = S.rol(s.dataset.role); A.run(() => S.ops.saveRole({ permisos: Object.assign({}, r.permisos, { [s.dataset.mod]: s.value }) }, r.id), 'Permiso actualizado', `${r.nombre} · ${A.ROUTES[s.dataset.mod].label}: ${L.permiso[s.value]}`); }));
  }

  function tabAct(body) {
    body.innerHTML = '<div id="aTable"></div>';
    C.dataTable(body.querySelector('#aTable'), { id: 'actividad', rows: S.db.actividad, pageSize: 15, columns: [
      { key: 'f', label: 'Fecha', render: (a) => `<span class="nowrap">${fmt.dateTime(a.fecha)}</span>` },
      { key: 'u', label: 'Usuario', render: (a) => esc(S.user(a.usuario) ? S.user(a.usuario).nombre : a.usuario) },
      { key: 'm', label: 'Módulo', render: (a) => A.badge(A.ROUTES[a.modulo] ? A.ROUTES[a.modulo].label : a.modulo, 'plain') },
      { key: 'a', label: 'Acción', render: (a) => esc(a.accion) }
    ] });
  }

  function form(u) {
    C.formModal({
      title: u ? `Editar ${u.nombre}` : 'Nuevo usuario', sub: 'Acceso simulado: en la demostración no se envían credenciales.', submit: u ? 'Guardar' : 'Crear usuario',
      body: `<div class="form-grid"><label class="field full"><span>Nombre completo *</span><input class="input" name="nombre" value="${esc(u ? u.nombre : '')}"></label>
        <label class="field"><span>Nombre de usuario *</span><input class="input" name="usuario" value="${esc(u ? u.usuario : '')}" autocomplete="off"></label>
        <label class="field"><span>Correo *</span><input class="input" type="email" name="correo" value="${esc(u ? u.correo : '')}"></label>
        <label class="field full"><span>Rol *</span><select class="select" name="rol">${C.options(S.db.roles, u ? u.rol : 'R6', (r) => `${r.nombre} — ${r.descripcion || ''}`)}</select></label>
        <fieldset class="field full" style="border:0;padding:0;margin:0"><span>Sucursales asignadas *</span><div class="chips" style="margin-top:4px"><label class="chip"><input type="checkbox" name="suc_all" ${u && u.sucursales.includes('*') ? 'checked' : ''}> Todas</label>${S.db.sucursales.map((s) => `<label class="chip"><input type="checkbox" name="suc_${s.id}" ${u && u.sucursales.includes(s.id) ? 'checked' : ''}> ${esc(s.nombre)}</label>`).join('')}</div></fieldset></div>`,
      rules: { nombre: { required: true, minLen: 3 }, usuario: { required: true, minLen: 3 }, correo: { required: true, email: true } },
      onSubmit: (d, close) => {
        const sucursales = d.suc_all ? ['*'] : S.db.sucursales.filter((s) => d[`suc_${s.id}`]).map((s) => s.id);
        if (!sucursales.length) { TOR.ui.toast('Asigne al menos una sucursal', { type: 'critical' }); return; }
        if (A.run(() => S.ops.saveUser({ nombre: d.nombre.trim(), usuario: d.usuario.trim().toLowerCase(), correo: d.correo.trim(), rol: d.rol, sucursales }, u && u.id), u ? 'Usuario actualizado' : 'Usuario creado', d.nombre)) close();
      }
    });
  }

  TOR.views.usuarios = { render };
})();
