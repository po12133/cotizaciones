/*
 * Módulos de gestión (Premium y Pro): proveedores, compras, gastos, auditoría, sucursales, usuarios y roles.
 * Las operaciones son simuladas pero coherentes con el inventario y las ventas de la demostración.
 */
(function () {
  const MF = window.MF;
  const D = MF.demo;
  const { esc, money } = MF;
  const st = { audUser: '', audType: '' };
  const isThisMonth = (iso) => { const d = new Date(iso), n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); };

  // ---------- Proveedores ----------
  D.register({
    id: 'proveedores', label: 'Proveedores', icon: 'truck', feature: 'proveedores',
    pitch: 'Tenga a mano a sus proveedores y lo que le compró a cada uno.',
    pitchList: ['Directorio de proveedores', 'Compras por proveedor', 'Notas de condiciones', 'Registro de compras que suma stock', 'Control de gastos', 'Reportes de rentabilidad'],
    render(view) {
      const d = MF.get();
      view.innerHTML = `<div class="toolbar"><span class="spacer"></span><button class="btn primary" id="newS">${MF.icon('plus', 'sm')} Nuevo proveedor</button></div>
        <div class="branch-cards">${d.suppliers.map((s) => { const cp = d.purchases.filter((p) => p.supplierId === s.id); return `<div class="branch-card"><h4>${MF.icon('truck', 'sm')} ${esc(s.name)}</h4><small class="muted">${esc(s.category)} · ${esc(s.contact)}</small><small class="muted">${esc(s.phone)}</small>${s.notes ? `<small>${esc(s.notes)}</small>` : ''}
          <div class="stats"><div><small>Compras</small><b>${cp.length}</b></div><div><small>Total comprado</small><b>${money(cp.reduce((a, p) => a + p.total, 0))}</b></div></div></div>`; }).join('')}</div>`;
      view.querySelector('#newS').addEventListener('click', () => {
        const m = MF.modal({ title: 'Nuevo proveedor', size: 'sm', body: `<form id="sf" class="form-grid"><label class="full">Nombre <input name="name" required></label><label class="full">Contacto <input name="contact"></label><label class="full">Rubro <input name="category" placeholder="Ej. Blusas"></label><label class="full">Notas <input name="notes"></label></form>`,
          footer: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="ss">Guardar</button>` });
        m.el.querySelector('#ss').addEventListener('click', () => {
          const f = m.el.querySelector('#sf'); if (!f.reportValidity()) return;
          d.suppliers.push({ id: MF.uid('s'), name: f.name.value, contact: f.contact.value, phone: 'Teléfono de demostración', category: f.category.value, notes: f.notes.value });
          MF.audit('proveedor', `Registró al proveedor "${f.name.value}"`); MF.save(); m.close(); MF.toast('Proveedor guardado'); D.rerender();
        });
      });
    }
  });

  // ---------- Compras ----------
  D.register({
    id: 'compras', label: 'Compras', icon: 'download', feature: 'compras',
    pitch: 'Registre la mercadería que compra: al recibirla, el stock de la sucursal se actualiza solo.',
    render(view) {
      const d = MF.get();
      const list = d.purchases.slice().reverse();
      view.innerHTML = `<div class="kpis"><div class="kpi"><div class="k-ic">${MF.icon('download')}</div><small>Compras del mes</small><b>${money(d.purchases.filter((p) => isThisMonth(p.date)).reduce((a, p) => a + p.total, 0))}</b></div>
        <div class="kpi amber"><div class="k-ic">${MF.icon('clock')}</div><small>Por recibir</small><b>${d.purchases.filter((p) => p.status === 'pendiente').length}</b></div></div>
        <div class="toolbar"><span class="spacer"></span><button class="btn primary" id="newP">${MF.icon('plus', 'sm')} Registrar compra</button></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Fecha</th><th>Proveedor</th><th>Sucursal</th><th>Detalle</th><th class="num">Total</th><th>Estado</th><th></th></tr></thead><tbody>
        ${list.map((p) => `<tr><td><b>${p.number}</b></td><td>${MF.fdate(p.date)}</td><td>${esc((d.suppliers.find((s) => s.id === p.supplierId) || {}).name || '—')}</td><td>${esc(MF.branchName(p.branchId))}</td>
          <td>${p.items.map((i) => `${i.qty} × ${esc((MF.product(i.productId) || {}).name || 'Producto')} (${esc(i.size)})`).join('<br>')}</td><td class="num"><b>${money(p.total)}</b></td>
          <td><span class="badge ${p.status === 'recibida' ? 'ok' : 'warn'}">${p.status === 'recibida' ? 'Recibida' : 'Pendiente'}</span></td>
          <td>${p.status === 'pendiente' ? `<button class="btn primary sm" data-recv="${p.id}">${MF.icon('check', 'sm')} Recibir</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
      view.querySelectorAll('[data-recv]').forEach((b) => b.addEventListener('click', () => {
        const p = d.purchases.find((x) => x.id === b.dataset.recv);
        p.items.forEach((i) => {
          const prod = MF.product(i.productId); if (!prod) return;
          let v = prod.variants.find((x) => x.size === i.size);
          if (!v) { v = { size: i.size, color: prod.color, stock: { b1: 0, b2: 0, b3: 0 } }; prod.variants.push(v); }
          MF.moveStock([{ productId: prod.id, name: prod.name, size: v.size, color: v.color, qty: i.qty }], p.branchId, +1, 'compra', 'Compra #' + p.number);
        });
        p.status = 'recibida';
        MF.audit('compra', `Recibió la compra #${p.number}: stock sumado en ${MF.branchName(p.branchId)}`);
        MF.save(); MF.toast('Mercadería recibida: stock actualizado'); D.rerender();
      }));
      view.querySelector('#newP').addEventListener('click', () => purchaseForm());
    }
  });
  function purchaseForm() {
    const d = MF.get();
    const lines = [{ productId: d.products[0].id, size: d.products[0].variants[0].size, qty: 1, cost: d.products[0].cost }];
    const m = MF.modal({ title: 'Registrar compra', size: 'lg',
      body: `<form id="pf2" class="form-grid"><label>Proveedor <select name="sup">${d.suppliers.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label>
        <label>Sucursal que recibe <select name="br">${MF.branches().map((b) => `<option value="${b.id}" ${b.id === MF.branchId() ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label>
        <div class="full"><table class="var-table"><thead><tr><th>Producto</th><th>Talla</th><th>Cant.</th><th>Costo u.</th><th></th></tr></thead><tbody id="pl"></tbody></table>
        <button type="button" class="btn ghost sm" id="addL" style="margin-top:6px">${MF.icon('plus', 'sm')} Agregar línea</button></div>
        <label class="switch full"><input type="checkbox" name="recv" checked><span></span> Mercadería ya recibida (sumar al stock ahora)</label><p class="full" id="ptot" style="font-weight:800;margin:0"></p></form>`,
      footer: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="sp">Guardar compra</button>` });
    const el = m.el;
    function draw() {
      el.querySelector('#pl').innerHTML = lines.map((l, i) => { const p = MF.product(l.productId); return `<tr><td><select data-lp="${i}">${d.products.map((x) => `<option value="${x.id}" ${x.id === l.productId ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></td>
        <td><select data-ls="${i}">${p.variants.map((v) => `<option ${v.size === l.size ? 'selected' : ''}>${esc(v.size)}</option>`).join('')}</select></td><td><input type="number" min="1" value="${l.qty}" data-lq="${i}" style="width:70px"></td><td><input type="number" min="0" value="${l.cost}" data-lc="${i}" style="width:90px"></td><td><button type="button" class="icon-btn" data-lr="${i}">${MF.icon('x', 'sm')}</button></td></tr>`; }).join('');
      el.querySelector('#ptot').textContent = 'Total: ' + money(lines.reduce((a, l) => a + l.qty * l.cost, 0));
      el.querySelectorAll('[data-lp]').forEach((s) => s.addEventListener('change', () => { const p = MF.product(s.value); Object.assign(lines[s.dataset.lp], { productId: p.id, size: p.variants[0].size, cost: p.cost }); draw(); }));
      el.querySelectorAll('[data-ls]').forEach((s) => s.addEventListener('change', () => { lines[s.dataset.ls].size = s.value; }));
      el.querySelectorAll('[data-lq]').forEach((s) => s.addEventListener('input', () => { lines[s.dataset.lq].qty = Math.max(1, +s.value || 1); el.querySelector('#ptot').textContent = 'Total: ' + money(lines.reduce((a, l) => a + l.qty * l.cost, 0)); }));
      el.querySelectorAll('[data-lc]').forEach((s) => s.addEventListener('input', () => { lines[s.dataset.lc].cost = Math.max(0, +s.value || 0); el.querySelector('#ptot').textContent = 'Total: ' + money(lines.reduce((a, l) => a + l.qty * l.cost, 0)); }));
      el.querySelectorAll('[data-lr]').forEach((s) => s.addEventListener('click', () => { if (lines.length > 1) { lines.splice(+s.dataset.lr, 1); draw(); } }));
    }
    draw();
    el.querySelector('#addL').addEventListener('click', () => { const p = d.products[0]; lines.push({ productId: p.id, size: p.variants[0].size, qty: 1, cost: p.cost }); draw(); });
    el.querySelector('#sp').addEventListener('click', () => {
      const f = el.querySelector('#pf2');
      const number = ++d.counters.purchase;
      const p = { id: MF.uid('cp'), number, date: new Date().toISOString(), supplierId: f.sup.value, branchId: f.br.value, status: 'pendiente', items: lines.map((l) => Object.assign({}, l)), total: lines.reduce((a, l) => a + l.qty * l.cost, 0) };
      d.purchases.push(p);
      MF.audit('compra', `Registró la compra #${number} por Bs ${p.total}`);
      MF.save(); m.close();
      if (f.recv.checked) { D.rerender(); setTimeout(() => { const b = document.querySelector(`[data-recv="${p.id}"]`); if (b) b.click(); }, 30); }
      else { MF.toast('Compra registrada como pendiente'); D.rerender(); }
    });
  }

  // ---------- Gastos ----------
  const EXP_CATS = ['Alquiler', 'Sueldos', 'Servicios', 'Insumos', 'Publicidad', 'Transporte', 'Otros'];
  const EXP_COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', '#9b8cf7', '#c8c3da'];
  D.register({
    id: 'gastos', label: 'Gastos', icon: 'wallet', feature: 'gastos',
    pitch: 'Anote alquiler, sueldos y servicios para conocer la utilidad real de cada sucursal.',
    render(view) {
      const d = MF.get();
      const list = d.expenses.filter((e) => (MF.can('sucursales') ? true : e.branchId === 'b1') && MF.branches().some((b) => b.id === e.branchId)).slice().sort((a, b) => b.date.localeCompare(a.date));
      const month = list.filter((e) => isThisMonth(e.date));
      const byCat = EXP_CATS.map((c, i) => ({ label: c, value: month.filter((e) => e.category === c).reduce((a, e) => a + e.amount, 0), color: EXP_COLORS[i] })).filter((x) => x.value);
      view.innerHTML = `<div class="grid g2"><div class="panel"><div class="panel-head"><h3>Gastos del mes</h3><b>${money(month.reduce((a, e) => a + e.amount, 0))}</b></div>${byCat.length ? MF.charts.donut(byCat, { center: MF.charts.short(month.reduce((a, e) => a + e.amount, 0)), centerLabel: 'Bs' }) : '<div class="empty">Sin gastos este mes</div>'}</div>
        <div class="panel"><div class="panel-head"><h3>Registrar gasto</h3></div><form id="gf" class="form-grid"><label>Categoría <select name="cat">${EXP_CATS.map((c) => `<option>${c}</option>`).join('')}</select></label><label>Monto (Bs) <input name="amount" type="number" min="1" required></label>
          <label class="full">Detalle <input name="desc" required placeholder="Ej. Bolsas con logo"></label><label class="full">Sucursal <select name="br">${MF.branches().map((b) => `<option value="${b.id}" ${b.id === MF.branchId() ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label>
          <div class="full actions"><button class="btn primary">${MF.icon('plus', 'sm')} Agregar gasto</button></div></form></div></div>
        <div class="tbl-wrap" style="margin-top:16px"><table class="tbl"><thead><tr><th>Fecha</th><th>Categoría</th><th>Detalle</th><th>Sucursal</th><th class="num">Monto</th></tr></thead><tbody>
          ${list.map((e) => `<tr><td>${MF.fdate(e.date)}</td><td><span class="badge neutral">${esc(e.category)}</span></td><td>${esc(e.desc)}</td><td>${esc(MF.branchName(e.branchId))}</td><td class="num"><b>${money(e.amount)}</b></td></tr>`).join('')}</tbody></table></div>`;
      view.querySelector('#gf').addEventListener('submit', (ev) => {
        ev.preventDefault();
        const f = ev.target;
        d.expenses.push({ id: MF.uid('g'), date: new Date().toISOString(), category: f.cat.value, desc: f.desc.value, amount: +f.amount.value, branchId: f.br.value });
        MF.audit('gasto', `Registró un gasto de Bs ${f.amount.value} (${f.cat.value})`);
        MF.save(); MF.toast('Gasto registrado'); D.rerender();
      });
    }
  });

  // ---------- Auditoría ----------
  const AUD_IC = { venta: 'receipt', producto: 'shirt', inventario: 'package', pedido: 'cart', transferencia: 'transfer', usuario: 'user', compra: 'download', gasto: 'wallet', devolucion: 'undo', configuracion: 'settings', promocion: 'percent', importacion: 'upload', proveedor: 'truck' };
  D.register({
    id: 'auditoria', label: 'Auditoría', icon: 'shield', feature: 'auditoria',
    pitch: 'Sepa quién hizo cada venta, descuento, cambio de precio o ajuste de inventario, y cuándo.',
    render(view) {
      const d = MF.get();
      const list = d.audit.filter((a) => (!st.audUser || a.userId === st.audUser) && (!st.audType || a.type === st.audType));
      view.innerHTML = `<div class="alert-strip info">${MF.icon('info', 'sm')}<span>Cada acción que haga en esta demostración queda registrada aquí. Cambie de usuario tocando su nombre arriba a la derecha y vea cómo se registra.</span></div>
        <div class="toolbar"><select id="au"><option value="">Todos los usuarios</option>${d.users.map((u) => `<option value="${u.id}" ${st.audUser === u.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select>
          <select id="at"><option value="">Todas las acciones</option>${Object.keys(AUD_IC).map((t) => `<option ${st.audType === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="panel"><ul class="list">${list.slice(0, 80).map((a) => `<li><span class="ic">${MF.icon(AUD_IC[a.type] || 'info', 'sm')}</span><div class="grow"><b>${esc(a.detail)}</b><small>${esc(MF.userName(a.userId))} · ${MF.fdate(a.date, true)}</small></div><span class="badge neutral">${esc(a.type)}</span></li>`).join('') || '<li class="empty">Sin registros</li>'}</ul></div>`;
      view.querySelector('#au').addEventListener('change', (e) => { st.audUser = e.target.value; D.rerender(); });
      view.querySelector('#at').addEventListener('change', (e) => { st.audType = e.target.value; D.rerender(); });
    }
  });

  // ---------- Sucursales ----------
  D.register({
    id: 'sucursales', label: 'Sucursales', icon: 'building', feature: 'sucursales',
    pitch: 'Administre hasta 3 sucursales con inventario independiente y transferencias.',
    pitchList: ['Inventario independiente por sucursal', 'Transferencias entre sucursales', 'Ventas por sucursal', 'Comparación de sucursales', 'Encargada por sucursal', 'Catálogos por sucursal'],
    sub: () => `${MF.branches().length} de ${MF.plan().limits.branches} sucursales del plan`,
    render(view) {
      const d = MF.get();
      const brs = MF.branches();
      const canAdd = d.branches.length < MF.plan().limits.branches;
      view.innerHTML = `<div class="toolbar"><span class="spacer"></span>${canAdd ? `<button class="btn primary" id="newB">${MF.icon('plus', 'sm')} Nueva sucursal</button>` : `<span class="muted" style="font-size:.84rem">Usa ${d.branches.length} de ${MF.plan().limits.branches} sucursales del plan ${MF.plan().name}</span>`}</div>
        <div class="branch-cards">${brs.map((b) => { const ms = d.sales.filter((s) => s.branchId === b.id && s.status === 'completada' && isThisMonth(s.date)); const units = d.products.reduce((a, p) => a + MF.stock(p, b.id), 0);
          return `<div class="branch-card ${b.id === MF.branchId() ? 'cur' : ''}"><h4>${MF.icon('building', 'sm')} ${esc(b.name)} ${b.main ? '<span class="badge violet">Principal</span>' : ''}</h4><small class="muted">${esc(b.address)}</small><small>Encargada: <b>${esc(MF.userName(b.manager))}</b></small>
            <div class="stats"><div><small>Ventas del mes</small><b>${money(ms.reduce((a, s) => a + s.total, 0))}</b></div><div><small>Prendas en stock</small><b>${units}</b></div></div>
            ${b.id === MF.branchId() ? '<span class="badge ok" style="justify-self:start">Sucursal activa</span>' : `<button class="btn ghost sm" data-use="${b.id}">Trabajar en esta sucursal</button>`}</div>`; }).join('')}</div>`;
      view.querySelectorAll('[data-use]').forEach((b) => b.addEventListener('click', () => { d.settings.branchId = b.dataset.use; MF.save(); MF.toast('Sucursal activa: ' + MF.branchName(b.dataset.use)); D.rerender(); }));
      const nb = view.querySelector('#newB');
      if (nb) nb.addEventListener('click', () => {
        const m = MF.modal({ title: 'Nueva sucursal', size: 'sm', body: `<form id="bf" class="form-grid"><label class="full">Nombre <input name="name" required placeholder="Ej. Sucursal Centro"></label><label class="full">Dirección <input name="addr" placeholder="Dirección de demostración"></label></form>`,
          footer: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="sb">Crear</button>` });
        m.el.querySelector('#sb').addEventListener('click', () => {
          const f = m.el.querySelector('#bf'); if (!f.reportValidity()) return;
          const id = MF.uid('b');
          d.branches.push({ id, name: f.name.value, address: f.addr.value || 'Dirección de demostración', manager: 'u1' });
          d.products.forEach((p) => p.variants.forEach((v) => { v.stock[id] = 0; }));
          MF.audit('configuracion', `Creó la sucursal "${f.name.value}"`); MF.save(); m.close(); MF.toast('Sucursal creada (sin stock: use Compras o Transferencias)'); D.refresh();
        });
      });
    }
  });

  // ---------- Usuarios y roles ----------
  const usersMod = {
    id: 'usuarios', label: 'Usuarios y roles', icon: 'user', feature: 'usuarios',
    pitch: 'Sume a sus vendedoras con su propio usuario para saber quién vendió qué.',
    pitchList: ['Hasta 3 usuarios en Pro', 'Hasta 10 usuarios en Premium', 'Roles y permisos (Premium)', 'Auditoría de acciones (Premium)', 'Cada venta queda con su vendedora', 'Acceso desde el celular de cada una'],
    sub: () => `${MF.get().users.filter((u) => u.active).length} activos · límite ${MF.plan().limits.users}`,
    render(view) {
      const d = MF.get();
      const lim = MF.plan().limits.users;
      const active = d.users.filter((u) => u.active).length;
      const roles = MF.can('roles');
      view.innerHTML = `<div class="toolbar"><div class="meter" style="flex:1;max-width:340px"><small><span>Usuarios activos</span><b>${active} / ${lim}</b></small><div class="bar"><i style="width:${Math.min(100, (active / lim) * 100)}%"></i></div></div><span class="spacer"></span><button class="btn primary" id="newU">${MF.icon('plus', 'sm')} Nuevo usuario</button></div>
        ${active > lim ? `<div class="alert-strip">${MF.icon('alert', 'sm')}<span>Hay más usuarios activos que los permitidos por el plan ${MF.plan().name}. Desactive alguno o suba de plan.</span></div>` : ''}
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th>${MF.can('sucursales') ? '<th>Sucursal</th>' : ''}<th>Activo</th></tr></thead><tbody>
        ${d.users.map((u) => `<tr><td><div class="prod" style="min-width:160px"><span class="avatar">${u.name.split(' ').map((x) => x[0]).join('').slice(0, 2)}</span><div><b>${esc(u.name)}</b>${u.owner ? '<small>Propietaria</small>' : ''}</div></div></td><td class="muted">${esc(u.email)}</td>
          <td>${roles && !u.owner ? `<select data-role="${u.id}">${d.roles.map((r) => `<option value="${r.id}" ${r.id === u.role ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select>` : esc((d.roles.find((r) => r.id === u.role) || {}).name || '')}</td>
          ${MF.can('sucursales') ? `<td>${esc(MF.branchName(u.branch))}</td>` : ''}
          <td>${u.owner ? '<span class="badge ok">Siempre</span>' : `<label class="switch"><input type="checkbox" data-act="${u.id}" ${u.active ? 'checked' : ''}><span></span></label>`}</td></tr>`).join('')}</tbody></table></div>
        <div class="panel" style="margin-top:16px"><div class="panel-head"><h3>${MF.icon('shield', 'sm')} Roles y permisos</h3>${roles ? '' : D.lockPill('roles')}</div>
          ${roles ? d.roles.map((r) => `<div style="margin-bottom:14px"><b>${esc(r.name)}</b><div class="perm-grid" style="margin-top:6px">${Object.entries(MF.PERMS).map(([k, l]) => `<label><input type="checkbox" data-perm="${r.id}:${k}" ${r.perms.includes(k) ? 'checked' : ''} ${r.id === 'r1' ? 'disabled' : ''}> ${l}</label>`).join('')}</div></div>`).join('') : D.lockMini('roles', 'Roles personalizados: defina qué puede hacer cada vendedora')}</div>`;
      view.querySelector('#newU').addEventListener('click', () => {
        if (d.users.filter((u) => u.active).length >= lim) {
          const next = MF.PLANS.find((p) => p.limits.users > lim);
          return MF.modal({ title: 'Límite de usuarios', size: 'sm', noFocus: true, body: `<p>El plan ${MF.plan().name} permite ${lim} usuario${lim > 1 ? 's' : ''}.${next ? ` El plan ${next.name} permite ${next.limits.users}.` : ''}</p>`, footer: next ? `<button class="btn ghost" data-close>Cerrar</button><button class="btn grad" data-try="${next.id}" data-close>Probar ${next.name}</button>` : '<button class="btn primary" data-close>Entendido</button>' });
        }
        const m = MF.modal({ title: 'Nuevo usuario', size: 'sm', body: `<form id="uf" class="form-grid"><label class="full">Nombre <input name="name" required></label><label class="full">Correo <input name="email" type="email" required placeholder="nombre@demo.mioshop"></label>
          ${roles ? `<label class="full">Rol <select name="role">${d.roles.map((r) => `<option value="${r.id}" ${r.id === 'r2' ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label>` : ''}<p class="full muted" style="font-size:.8rem;margin:0">Demostración: no se envía ninguna invitación real.</p></form>`,
          footer: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="su">Crear usuario</button>` });
        m.el.querySelector('#su').addEventListener('click', () => {
          const f = m.el.querySelector('#uf'); if (!f.reportValidity()) return;
          d.users.push({ id: MF.uid('u'), name: f.name.value, email: f.email.value, role: roles ? f.role.value : 'r2', branch: MF.branchId(), active: true });
          MF.audit('usuario', `Creó el usuario de ${f.name.value}`); MF.save(); m.close(); MF.toast('Usuario creado'); D.rerender();
        });
      });
      view.querySelectorAll('[data-act]').forEach((c) => c.addEventListener('change', () => {
        const u = d.users.find((x) => x.id === c.dataset.act);
        if (c.checked && d.users.filter((x) => x.active).length >= lim) { c.checked = false; return MF.toast(`El plan ${MF.plan().name} permite ${lim} usuarios activos`, 'error'); }
        u.active = c.checked; MF.audit('usuario', `${u.active ? 'Activó' : 'Desactivó'} el usuario de ${u.name}`); MF.save(); D.rerender();
      }));
      view.querySelectorAll('[data-role]').forEach((s) => s.addEventListener('change', () => { const u = d.users.find((x) => x.id === s.dataset.role); u.role = s.value; MF.audit('usuario', `Cambió el rol de ${u.name}`); MF.save(); MF.toast('Rol actualizado'); }));
      view.querySelectorAll('[data-perm]').forEach((c) => c.addEventListener('change', () => {
        const [rid, perm] = c.dataset.perm.split(':');
        const r = d.roles.find((x) => x.id === rid);
        r.perms = c.checked ? r.perms.concat(perm) : r.perms.filter((p) => p !== perm);
        MF.audit('usuario', `Modificó permisos del rol ${r.name}`); MF.save();
      }));
    },
    switchUser() {
      const d = MF.get();
      if (!MF.can('usuarios')) return D.upgrade('usuarios');
      const lim = MF.plan().limits.users;
      const users = d.users.filter((u) => u.active).slice(0, lim);
      const m = MF.modal({ title: 'Cambiar de usuario (simulado)', size: 'sm', noFocus: true,
        body: `<p class="muted" style="font-size:.86rem">No hay inicio de sesión real: elija con qué usuario quiere operar para ver la auditoría y los reportes por vendedora.</p><ul class="list">${users.map((u) => `<li><span class="avatar">${u.name.split(' ').map((x) => x[0]).join('').slice(0, 2)}</span><div class="grow"><b>${esc(u.name)}</b><small>${esc((d.roles.find((r) => r.id === u.role) || {}).name || '')}</small></div>${u.id === d.settings.userId ? '<span class="badge ok">Actual</span>' : `<button class="btn ghost sm" data-u="${u.id}">Usar</button>`}</li>`).join('')}</ul>` });
      m.el.querySelectorAll('[data-u]').forEach((b) => b.addEventListener('click', () => { d.settings.userId = b.dataset.u; MF.save(); m.close(); MF.toast('Ahora opera como ' + MF.userName(b.dataset.u), 'info'); D.rerender(); }));
    }
  };
  D.register(usersMod);

})();
