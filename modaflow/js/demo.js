/*
 * Panel de demostración: estructura, enrutador, selector de plan, bloqueos y dashboard.
 * Los módulos se registran con MF.demo.register({ id, label, icon, group, feature, render }).
 */
(function () {
  const MF = window.MF;
  const { $, $$, esc, money } = MF;
  const modules = {};
  const ORDER = [
    ['Principal', ['dashboard', 'pos', 'ventas', 'pedidos']],
    ['Productos', ['productos', 'inventario', 'catalogo']],
    ['Gestión', ['clientes', 'proveedores', 'compras', 'gastos']],
    ['Análisis', ['reportes', 'auditoria']],
    ['Organización', ['sucursales', 'usuarios']],
    ['Servicio', ['implementacion']]
  ];
  let current = null;

  const register = (m) => { modules[m.id] = m; };

  // ---------- Bloqueos por plan ----------
  function lockMini(feature, text) {
    const p = MF.neededPlan(feature);
    return `<div class="locked-mini" data-lock="${feature}">${MF.icon('lock', 'sm')}<span>${text || MF.FEATURE_LABELS[feature]} · <b>desde el plan ${p.name}</b></span><button class="btn ghost sm" type="button">Ver</button></div>`;
  }
  const lockPill = (feature) => `<button class="lock-pill" type="button" data-lock="${feature}">${MF.icon('lock')} ${MF.neededPlan(feature).name}</button>`;

  function upgrade(feature) {
    const p = MF.neededPlan(feature);
    const m = MF.modal({
      title: `${MF.icon('lock', 'sm')} Función del plan ${p.name}`, size: 'sm', noFocus: true,
      body: `<p><b>${esc(MF.FEATURE_LABELS[feature] || 'Esta función')}</b> está disponible desde el plan <b>${p.name}</b> (${p.priceLabel} ${p.period}).</p>
        <p class="muted" style="font-size:.88rem">Su plan actual de demostración es ${MF.plan().name}. Puede cambiar de plan para probarla ahora mismo.</p>
        <ul class="plan-feats">${p.features.slice(0, 6).map((f) => `<li>${MF.icon('check', 'sm')}<span>${esc(f)}</span></li>`).join('')}</ul>`,
      footer: `<a class="btn ghost" href="planes.html#plan-${p.id}">Ver beneficios del plan ${p.name}</a><button class="btn grad" data-try>Probar con ${p.name}</button>`
    });
    m.el.querySelector('[data-try]').addEventListener('click', () => { m.close(); switchPlan(p.id); });
  }

  function lockView(mod) {
    const p = MF.neededPlan(mod.feature);
    return `<div class="lock-view">
      <div class="lock-ic">${MF.icon('lock')}</div>
      <span class="badge violet">Plan ${p.name} · ${p.priceLabel} ${p.period}</span>
      <h2 style="margin-top:12px">Esta función está disponible desde el plan ${p.name}</h2>
      <p>${esc(mod.pitch || '')}</p>
      <ul class="lock-feats">${(mod.pitchList || p.features.slice(0, 6)).map((f) => `<li>${MF.icon('checkCircle', 'sm')}<span>${esc(f)}</span></li>`).join('')}</ul>
      <div class="actions center"><a class="btn ghost" href="planes.html#plan-${p.id}">Ver beneficios del plan ${p.name}</a><button class="btn grad" data-try="${p.id}">${MF.icon('play', 'sm')} Probar con el plan ${p.name}</button></div>
    </div>`;
  }

  // ---------- Estructura ----------
  function renderPlanSwitch() {
    $('#planSwitch').innerHTML = MF.PLANS.map((p) => `<button type="button" data-plan="${p.id}" class="${p.id === MF.plan().id ? 'on' : ''}">${p.name}</button>`).join('');
  }
  function switchPlan(id) {
    if (id === MF.plan().id) return;
    MF.setPlan(id);
    MF.toast(`Demostración con el plan ${MF.plan().name}`, 'info');
    refresh();
  }

  function renderNav() {
    const d = MF.get();
    const pendingOrders = d.orders.filter((o) => MF.OPEN_ORDER.includes(o.status)).length;
    $('#nav').innerHTML = ORDER.map(([group, ids]) => {
      const items = ids.filter((id) => modules[id]).map((id) => {
        const m = modules[id];
        const locked = m.feature && !MF.can(m.feature);
        const count = id === 'pedidos' && pendingOrders ? `<span class="count">${pendingOrders}</span>` : '';
        return `<a href="#/${id}" class="nav-item ${current === id ? 'on' : ''} ${locked ? 'locked' : ''}" data-nav="${id}">${MF.icon(m.icon)}<span>${m.label}</span>${locked ? `<span class="lock-tag">${MF.icon('lock')}${MF.neededPlan(m.feature).name}</span>` : count}</a>`;
      }).join('');
      return `<div class="nav-group">${group}</div>${items}`;
    }).join('');
  }

  function renderUsage() {
    const pl = MF.plan();
    const d = MF.get();
    const ai = MF.aiUsage();
    const users = d.users.filter((u) => u.active).slice(0, pl.limits.users).length;
    const meter = (label, used, limit) => {
      const r = used / limit;
      return `<div class="meter ${r >= 1 ? 'full' : r > 0.8 ? 'warn' : ''}"><small><span>${label}</span><b>${MF.num(used)} / ${MF.num(limit)}</b></small><div class="bar"><i style="width:${Math.min(100, r * 100)}%"></i></div></div>`;
    };
    $('#usage').innerHTML = meter('Productos', d.products.length, pl.limits.products) + meter('Análisis con IA (mes)', ai.used, ai.limit) +
      meter('Usuarios', users, pl.limits.users) + `<a class="btn ghost sm" href="planes.html#plan-${pl.id}">${MF.icon('layers', 'sm')} Plan ${pl.name}: ver detalle</a>`;
  }

  function renderTop() {
    const sel = $('#branchSel');
    const pick = $('#branchPick');
    const d = MF.get();
    if (MF.can('sucursales')) {
      sel.disabled = false; pick.classList.remove('locked'); pick.title = 'Sucursal activa';
      sel.innerHTML = MF.branches().map((b) => `<option value="${b.id}" ${b.id === MF.branchId() ? 'selected' : ''}>${esc(b.name)}</option>`).join('');
    } else {
      sel.disabled = true; pick.classList.add('locked'); pick.title = 'Sucursales: desde el plan Premium';
      sel.innerHTML = `<option>${esc(d.branches[0].name)}</option>`;
    }
    const u = MF.currentUser();
    const role = d.roles.find((r) => r.id === u.role);
    $('#me').innerHTML = `<span class="avatar">${u.name.split(' ').map((x) => x[0]).join('').slice(0, 2)}</span><span>${esc(u.name.split(' ')[0])}<br><small class="muted">${esc(role ? role.name : '')}</small></span>`;
    const notifs = notifications();
    $('#bellDot').hidden = !notifs.length;
  }

  function notifications() {
    const d = MF.get();
    const out = [];
    d.orders.filter((o) => o.status === 'pendiente').forEach((o) => out.push(['whatsapp', `Pedido #${o.number} de ${o.customer.name}`, 'Pendiente de confirmar', '#/pedidos']));
    d.orders.filter((o) => o.status === 'esperando_pago').forEach((o) => out.push(['qr', `Pedido #${o.number}: pago QR por verificar`, o.receipt ? 'Comprobante adjunto' : 'Sin comprobante todavía', '#/pedidos']));
    if (MF.can('alertas')) d.products.forEach((p) => { const s = MF.stock(p); if (s <= p.minStock) out.push(['alert', `${p.name}: ${s === 0 ? 'agotado' : 'quedan ' + s}`, 'Alerta de inventario bajo', '#/inventario']); });
    return out;
  }
  function showNotifications() {
    const n = notifications();
    const m = MF.modal({
      title: 'Notificaciones', size: 'sm', noFocus: true,
      body: n.length ? `<ul class="list notif-list">${n.slice(0, 14).map(([ic, t, s, href]) => `<li><span class="ic">${MF.icon(ic, 'sm')}</span><div class="grow"><b>${esc(t)}</b><small>${esc(s)}</small></div><a class="btn ghost sm" href="${href}" data-close>Ver</a></li>`).join('')}</ul>
        ${MF.can('alertas') ? '' : lockMini('alertas', 'Alertas de inventario bajo')}` : '<div class="empty">Sin novedades</div>'
    });
    return m;
  }

  // ---------- Enrutador ----------
  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const [id, q] = h.split('?');
    const params = {};
    (q || '').split('&').filter(Boolean).forEach((kv) => { const [k, v] = kv.split('='); params[k] = decodeURIComponent(v || ''); });
    return { id: modules[id] ? id : 'dashboard', params };
  }
  function route() {
    const { id, params } = parseHash();
    const mod = modules[id];
    const changed = current !== id;
    current = id;
    $('#viewTitle').textContent = mod.label;
    $('#viewSub').textContent = mod.sub ? mod.sub() : '';
    const view = $('#view');
    if (mod.feature && !MF.can(mod.feature)) view.innerHTML = lockView(mod);
    else mod.render(view, params);
    MF.hydrateIcons(view);
    renderNav();
    $('#sidebar').classList.remove('open');
    if (changed) window.scrollTo(0, 0);
  }
  function refresh() { renderPlanSwitch(); renderUsage(); renderTop(); route(); }
  // Re-render de la vista actual tras una operación (sin perder el scroll)
  function rerender() { renderUsage(); renderTop(); const y = window.scrollY; route(); window.scrollTo(0, y); }

  // ---------- Dashboard ----------
  register({
    id: 'dashboard', label: 'Dashboard', icon: 'home', group: 'Principal',
    sub: () => `${MF.fdate(new Date())} · ${MF.branchName(MF.branchId())}`,
    render(view) {
      const d = MF.get();
      const b = MF.branchId();
      const sales = MF.visibleSales().filter((s) => s.status === 'completada' && s.branchId === b);
      const today = sales.filter((s) => MF.sameDay(s.date, Date.now()));
      const now = new Date();
      const month = sales.filter((s) => { const x = new Date(s.date); return x.getMonth() === now.getMonth() && x.getFullYear() === now.getFullYear(); });
      const sum = (arr) => arr.reduce((a, s) => a + s.total, 0);
      const profit = (arr) => arr.reduce((a, s) => a + s.items.reduce((x, i) => x + (i.price - i.cost) * i.qty, 0) - s.discount, 0);
      const low = d.products.filter((p) => MF.stock(p) <= p.minStock);
      const pl = MF.plan();
      const days = MF.can('historialCompleto') ? 30 : 14;
      const series = [];
      for (let i = days - 1; i >= 0; i--) {
        const day = new Date(); day.setDate(day.getDate() - i);
        const ds = sales.filter((s) => MF.sameDay(s.date, day));
        series.push({ label: `${day.getDate()}/${day.getMonth() + 1}`, value: sum(ds), value2: MF.can('ganancias') ? profit(ds) : undefined });
      }
      const top = {};
      month.forEach((s) => s.items.forEach((i) => { top[i.productId] = top[i.productId] || { qty: 0, total: 0 }; top[i.productId].qty += i.qty; top[i.productId].total += i.price * i.qty; }));
      const topList = Object.entries(top).sort((a, c) => c[1].qty - a[1].qty).slice(0, 5);
      const openOrders = d.orders.filter((o) => MF.OPEN_ORDER.includes(o.status));
      const byMethod = { efectivo: sum(month.filter((s) => s.method === 'efectivo')), qr: sum(month.filter((s) => s.method === 'qr')) };

      view.innerHTML = `
        ${openOrders.length ? `<div class="alert-strip info">${MF.icon('bell', 'sm')}<span>Tiene <b>${openOrders.length} pedidos online</b> esperando confirmación o pago. El stock está reservado, pero no se descuenta hasta confirmar.</span><a class="btn ghost sm" href="#/pedidos">Ver pedidos</a></div>` : ''}
        <div class="kpis">
          <div class="kpi"><div class="k-ic">${MF.icon('receipt')}</div><small>Ventas del día</small><b>${money(sum(today))}</b><em class="up">${today.length} ventas hoy</em></div>
          <div class="kpi pink"><div class="k-ic">${MF.icon('calendar')}</div><small>Ventas del mes</small><b>${money(sum(month))}</b><em>${month.length} ventas</em></div>
          <div class="kpi mint"><div class="k-ic">${MF.icon('package')}</div><small>Productos registrados</small><b>${d.products.length}</b><em>de ${MF.num(pl.limits.products)} del plan ${pl.name}</em></div>
          <div class="kpi amber" ${low.length ? 'data-go="#/inventario"' : ''} style="cursor:pointer"><div class="k-ic">${MF.icon('alert')}</div><small>Con poco inventario</small><b>${low.length}</b><em>${low.filter((p) => MF.stock(p) === 0).length} agotados</em></div>
          ${MF.can('ganancias')
            ? `<div class="kpi"><div class="k-ic">${MF.icon('trendUp')}</div><small>Ganancia estimada del mes</small><b>${money(profit(month))}</b><em class="up">Margen ${sum(month) ? Math.round((profit(month) / sum(month)) * 100) : 0}%</em></div>`
            : `<div class="kpi locked" data-lock="ganancias"><div class="k-ic">${MF.icon('lock')}</div><small>Ganancia estimada</small><b>Bs 0.000</b><em>Desde el plan Pro</em></div>`}
        </div>
        <div class="grid g-main">
          <div class="panel">
            <div class="panel-head"><h3>Ventas de los últimos ${days} días</h3>
              <div class="chart-legend"><span><i style="background:var(--c1)"></i>Ventas</span>${MF.can('ganancias') ? '<span><i style="background:var(--c2)"></i>Ganancia</span>' : ''}</div></div>
            ${MF.charts.bars(series, { every: days > 14 ? 5 : 2, short: MF.charts.short, label2: 'ganancia' })}
            ${MF.can('historialCompleto') ? '' : `<p class="muted" style="font-size:.8rem;margin:8px 0 0">${MF.icon('info', 'sm')} Plan Básico: historial de ventas de 30 días. ${lockPill('historialCompleto')}</p>`}
          </div>
          <div class="panel">
            <div class="panel-head"><h3>Últimas ventas</h3><a class="link-btn" href="#/ventas">Ver todas ${MF.icon('arrowRight', 'sm')}</a></div>
            <ul class="list">${sales.slice(-6).reverse().map((s) => `<li><span class="ic">${MF.icon(s.method === 'qr' ? 'qr' : 'wallet', 'sm')}</span><div class="grow"><b>${esc(s.items.map((i) => i.name).join(', '))}</b><small>#${s.number} · ${MF.frel(s.date)} · ${esc(MF.userName(s.userId))}${s.channel === 'online' ? ' · online' : ''}</small></div><b>${money(s.total)}</b></li>`).join('') || '<li class="empty">Aún no hay ventas</li>'}</ul>
          </div>
        </div>
        <div class="grid g3" style="margin-top:16px">
          <div class="panel"><div class="panel-head"><h3>Productos más vendidos</h3><span class="sub">Este mes</span></div>
            ${MF.can('masVendidos') ? (topList.length ? MF.charts.hbars(topList.map(([id, t]) => ({ label: (MF.product(id) || {}).name || id, value: t.qty, sub: money(t.total) })), { fmt: (v) => v + ' u.' }) : '<div class="empty">Sin ventas este mes</div>') : lockMini('masVendidos')}</div>
          <div class="panel"><div class="panel-head"><h3>Métodos de pago</h3><span class="sub">Este mes</span></div>
            ${MF.charts.donut([{ label: 'Efectivo', value: byMethod.efectivo, color: 'var(--c1)' }, { label: 'QR', value: byMethod.qr, color: 'var(--c2)' }], { center: MF.charts.short(sum(month)), centerLabel: 'Bs total' })}</div>
          <div class="panel"><div class="panel-head"><h3>Stock bajo</h3>${MF.can('alertas') ? '<span class="badge warn">Alertas activas</span>' : lockPill('alertas')}</div>
            <ul class="list">${low.slice(0, 5).map((p) => `<li>${MF.photo(p, 'thumb')}<div class="grow"><b>${esc(p.name)}</b><small>${esc(p.category)}</small></div><span class="badge ${MF.stock(p) ? 'warn' : 'bad'}">${MF.stock(p)} u.</span></li>`).join('') || '<li class="empty">Todo con stock suficiente</li>'}</ul></div>
        </div>
        ${MF.can('compararSucursales') ? branchCompare(sum) : `<div style="margin-top:16px">${lockMini('compararSucursales', 'Comparación de sucursales en el dashboard')}</div>`}
        <div class="panel" style="margin-top:16px"><div class="panel-head"><h3>Accesos rápidos</h3></div>
          <div class="actions start">
            <a class="btn primary" href="#/pos">${MF.icon('cart', 'sm')} Nueva venta</a>
            <a class="btn ai-cta" href="#/productos?ia=1">${MF.icon('sparkles', 'sm')} Registrar con IA</a>
            <a class="btn ghost" href="#/productos?nuevo=1">${MF.icon('plus', 'sm')} Producto manual</a>
            <a class="btn ghost" href="catalogo.html" target="_blank">${MF.icon('external', 'sm')} Ver catálogo público</a>
          </div></div>`;
    }
  });
  function branchCompare(sum) {
    const d = MF.get();
    const now = new Date();
    const data = MF.branches().map((b) => ({ label: b.name, value: sum(d.sales.filter((s) => s.status === 'completada' && s.branchId === b.id && new Date(s.date).getMonth() === now.getMonth())) }));
    return `<div class="panel" style="margin-top:16px"><div class="panel-head"><h3>Comparación de sucursales</h3><span class="sub">Ventas del mes</span></div>${MF.charts.hbars(data)}</div>`;
  }

  // ---------- Inicio ----------
  function start() {
    MF.load();
    const q = new URLSearchParams(location.search);
    if (q.get('plan') && MF.PLANS.some((p) => p.id === q.get('plan'))) {
      MF.setPlan(q.get('plan'));
      history.replaceState(null, '', location.pathname + location.hash);
    }
    $('.brand-mini').innerHTML = MF.brandLogo();
    MF.applyBrand();
    document.addEventListener('click', (e) => {
      const lock = e.target.closest('[data-lock]');
      if (lock) { e.preventDefault(); upgrade(lock.dataset.lock); return; }
      const tr = e.target.closest('[data-try]');
      if (tr && tr.dataset.try) { switchPlan(tr.dataset.try); return; }
      const go = e.target.closest('[data-go]');
      if (go) { location.hash = go.dataset.go; return; }
      const pb = e.target.closest('[data-plan]');
      if (pb) switchPlan(pb.dataset.plan);
    });
    $('#resetBtn').addEventListener('click', async () => {
      if (await MF.confirmDialog('Se borrarán los cambios hechos en la demostración (productos, ventas, pedidos) y se cargarán los datos originales de MioShop. ¿Continuar?', 'Restaurar datos', true)) {
        MF.reset(MF.plan().id);
        MF.toast('Datos de demostración restaurados');
        refresh();
      }
    });
    $('#branchSel').addEventListener('change', (e) => { MF.get().settings.branchId = e.target.value; MF.save(); MF.toast('Sucursal activa: ' + MF.branchName(e.target.value), 'info'); rerender(); });
    $('#bellBtn').addEventListener('click', showNotifications);
    $('#me').addEventListener('click', () => modules.usuarios && modules.usuarios.switchUser && modules.usuarios.switchUser());
    $('#menuBtn').addEventListener('click', () => $('#sidebar').classList.add('open'));
    $('#scrim').addEventListener('click', () => $('#sidebar').classList.remove('open'));
    window.addEventListener('hashchange', route);
    MF.onChange((src) => { if (src === 'remote') rerender(); });
    refresh();
  }

  MF.demo = { register, start, refresh, rerender, upgrade, lockMini, lockPill, modules };
})();
