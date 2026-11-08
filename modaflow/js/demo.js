/*
 * Panel de demostración (mobile first): estructura, navegación inferior, enrutador,
 * selector de plan, bloqueos por plan, prueba gratuita e Inicio.
 * Los módulos se registran con MF.demo.register({ id, label, icon, feature, render, sub }).
 */
(function () {
  const MF = window.MF;
  const { $, esc, money } = MF;
  const modules = {};
  // Menú lateral (escritorio) y hoja "Más" (celular)
  const GROUPS = [
    ['Principal', ['inicio', 'registrar', 'vender', 'inventario', 'reportes']],
    ['Ventas', ['ventas', 'pedidos', 'catalogo']],
    ['Inventario', ['movimientos']],
    ['Gestión', ['proveedores', 'compras', 'gastos', 'sucursales', 'usuarios', 'auditoria']],
    ['Cuenta', ['plan']]
  ];
  const BOTTOM = ['inicio', 'inventario', 'vender', 'reportes'];
  // Rutas anteriores que siguen funcionando
  const ALIAS = { dashboard: 'inicio', pos: 'vender', productos: 'inventario' };
  let current = null;

  const register = (m) => { modules[m.id] = m; };

  // ---------- Bloqueos por plan ----------
  const fromPlan = (feature) => `Disponible desde el plan ${MF.neededPlan(feature).name}`;
  function lockMini(feature, text) {
    return `<div class="locked-mini" data-lock="${feature}">${MF.icon('lock', 'sm')}<span>${esc(text || MF.FEATURE_LABELS[feature] || '')} · <b>${fromPlan(feature)}</b></span><button class="btn ghost sm" type="button">Ver</button></div>`;
  }
  const lockPill = (feature) => `<button class="lock-pill" type="button" data-lock="${feature}" title="${fromPlan(feature)}">${MF.icon('lock')} ${MF.neededPlan(feature).name}</button>`;

  function upgrade(feature) {
    const p = MF.neededPlan(feature);
    const m = MF.modal({
      title: `${MF.icon('lock', 'sm')} ${fromPlan(feature)}`, size: 'sm', noFocus: true,
      body: `<p><b>${esc(MF.FEATURE_LABELS[feature] || 'Esta función')}</b> está disponible desde el plan <b>${p.name}</b> (${p.priceLabel}${p.period}).</p>
        <p class="muted" style="font-size:.88rem">Plan actual de la demostración: ${MF.plan().name}. Puede cambiar de plan para probarla ahora mismo.</p>
        <ul class="plan-feats">${p.features.slice(0, 6).map((f) => `<li>${MF.icon('check', 'sm')}<span>${esc(f)}</span></li>`).join('')}</ul>`,
      footer: `<a class="btn ghost" href="planes.html#plan-${p.id}">Ver plan ${p.name}</a><button class="btn grad" data-try>Probar con ${p.name}</button>`
    });
    m.el.querySelector('[data-try]').addEventListener('click', () => { m.close(); switchPlan(p.id); });
  }
  /** Bloqueo de escritura cuando la prueba gratuita venció (solo lectura). Devuelve true si está bloqueado. */
  function guardWrite() {
    if (!MF.readOnly()) return false;
    const m = MF.modal({
      title: `${MF.icon('lock', 'sm')} Cuenta en solo lectura`, size: 'sm', noFocus: true,
      body: `<p>${esc(MF.READ_ONLY_MSG)}</p><p class="muted" style="font-size:.86rem">Sus datos se conservan hasta el ${MF.fdate(MF.trial().keepUntil)} (propuesta: 30 días después del fin de la prueba).</p>`,
      footer: `<button class="btn ghost" data-close>Cerrar</button><button class="btn grad" data-try="basico" data-close>Elegir plan Básico</button>`
    });
    return !!m;
  }

  function lockView(mod) {
    const p = MF.neededPlan(mod.feature);
    return `<div class="lock-view">
      <div class="lock-ic">${MF.icon('lock')}</div>
      <span class="badge violet">Plan ${p.name} · ${p.priceLabel}${p.period}</span>
      <h2 style="margin-top:12px">${fromPlan(mod.feature)}</h2>
      <p>${esc(mod.pitch || '')}</p>
      <ul class="lock-feats">${(mod.pitchList || p.features.slice(0, 6)).map((f) => `<li>${MF.icon('checkCircle', 'sm')}<span>${esc(f)}</span></li>`).join('')}</ul>
      <div class="actions center"><a class="btn ghost" href="planes.html#plan-${p.id}">Ver plan ${p.name}</a><button class="btn grad" data-try="${p.id}">${MF.icon('play', 'sm')} Probar con el plan ${p.name}</button></div>
    </div>`;
  }

  // ---------- Estructura ----------
  function renderPlanSwitch() {
    const cur = MF.plan().id;
    $('#planSwitch').innerHTML = MF.PLANS.map((p) => `<button type="button" data-plan="${p.id}" class="${p.id === cur ? 'on' : ''}">${p.short}</button>`).join('');
    $('#planSel').innerHTML = MF.PLANS.map((p) => `<option value="${p.id}" ${p.id === cur ? 'selected' : ''}>${p.short}</option>`).join('');
  }
  function switchPlan(id) {
    if (id === MF.plan().id) return;
    MF.setPlan(id);
    MF.toast(`Demostración con el plan ${MF.plan().name}`, 'info');
    refresh();
  }

  const locked = (m) => m.feature && !MF.can(m.feature);
  function navItem(id, cls) {
    const m = modules[id];
    if (!m) return '';
    const d = MF.get();
    const pending = id === 'pedidos' && MF.can('pedidos') ? d.orders.filter((o) => MF.OPEN_ORDER.includes(o.status)).length : 0;
    return `<a href="#/${id}" class="${cls} ${current === id ? 'on' : ''} ${locked(m) ? 'locked' : ''}" data-nav="${id}">${MF.icon(m.icon)}<span>${m.label}</span>${locked(m) ? `<span class="lock-tag">${MF.icon('lock')}${MF.neededPlan(m.feature).name}</span>` : pending ? `<span class="count">${pending}</span>` : ''}</a>`;
  }
  function renderNav() {
    $('#nav').innerHTML = GROUPS.map(([g, ids]) => `<div class="nav-group">${g}</div>${ids.map((id) => navItem(id, 'nav-item')).join('')}`).join('');
    const more = !BOTTOM.includes(current);
    $('#bottomNav').innerHTML = BOTTOM.map((id) => {
      const m = modules[id];
      return `<a href="#/${id}" class="bn ${id === 'vender' ? 'bn-main' : ''} ${current === id ? 'on' : ''}">${MF.icon(m.icon)}<span>${id === 'vender' ? 'Vender' : m.short || m.label}</span></a>`;
    }).join('') + `<button type="button" class="bn ${more ? 'on' : ''}" id="moreBtn">${MF.icon('menu')}<span>Más</span></button>`;
    $('#moreBtn').addEventListener('click', showMore);
  }
  /** Hoja "Más opciones" (celular): el resto de módulos, consumo del plan y acciones de la demo. */
  function showMore() {
    const m = MF.modal({
      title: 'Más opciones', size: 'sheet', noFocus: true,
      body: `<div class="more-grid">${GROUPS.map(([g, ids]) => ids.filter((id) => !BOTTOM.includes(id) && modules[id]).map((id) => navItem(id, 'more-item')).join('')).join('')}</div>
        <div class="more-usage">${usageHTML()}</div>
        <div class="more-links"><a href="catalogo.html" target="_blank" rel="noopener">${MF.icon('store', 'sm')} Ver catálogo público</a><a href="planes.html">${MF.icon('layers', 'sm')} Comparar planes</a><a href="index.html">${MF.icon('arrowLeft', 'sm')} Volver a la presentación</a></div>`
    });
    m.el.addEventListener('click', (e) => { if (e.target.closest('a')) m.close(); });
  }

  function usageHTML() {
    const pl = MF.plan();
    const d = MF.get();
    const ai = MF.aiUsage();
    const users = d.users.filter((u) => u.active).slice(0, pl.limits.users).length;
    const meter = (label, used, limit) => {
      const r = used / limit;
      return `<div class="meter ${r >= 1 ? 'full' : r > 0.8 ? 'warn' : ''}"><small><span>${label}</span><b>${MF.num(used)} / ${MF.num(limit)}</b></small><div class="bar"><i style="width:${Math.min(100, r * 100)}%"></i></div></div>`;
    };
    return meter('Productos', d.products.length, pl.limits.products) + meter(`Análisis con IA (${ai.period})`, ai.used, ai.limit) +
      meter('Usuarios', users, pl.limits.users) + `<a class="btn ghost sm" href="#/plan">${MF.icon('layers', 'sm')} Plan ${pl.name}: ver detalle</a>`;
  }
  function renderUsage() { $('#usage').innerHTML = usageHTML(); }

  /** Franja de la prueba gratuita: días restantes o solo lectura. */
  function renderStrip() {
    const el = $('#planStrip');
    if (!MF.plan().trial) { el.innerHTML = ''; return; }
    const t = MF.trial();
    el.innerHTML = t.expired
      ? `<div class="trial-strip off">${MF.icon('lock', 'sm')}<span><b>Prueba terminada · solo lectura.</b> El catálogo está desactivado. Datos guardados hasta el ${MF.fdate(t.keepUntil)}.</span><button class="btn sm light" data-trial="on">Reactivar prueba (demo)</button><button class="btn sm grad" data-try="basico">Elegir plan</button></div>`
      : `<div class="trial-strip">${MF.icon('clock', 'sm')}<span><b>Prueba gratuita:</b> quedan ${t.left} días · termina el ${MF.fdate(t.ends)}.</span><button class="btn sm light" data-trial="off">Simular fin de la prueba</button></div>`;
  }

  function renderTop() {
    const sel = $('#branchSel');
    const pick = $('#branchPick');
    const d = MF.get();
    pick.hidden = !MF.can('sucursales');
    if (MF.can('sucursales')) sel.innerHTML = MF.branches().map((b) => `<option value="${b.id}" ${b.id === MF.branchId() ? 'selected' : ''}>${esc(b.name)}</option>`).join('');
    const u = MF.currentUser();
    const role = d.roles.find((r) => r.id === u.role);
    $('#me').innerHTML = `<span class="avatar">${u.name.split(' ').map((x) => x[0]).join('').slice(0, 2)}</span><span class="hide-sm">${esc(u.name.split(' ')[0])}<br><small class="muted">${esc(role ? role.name : '')}</small></span>`;
    $('#bellDot').hidden = !notifications().length;
  }

  function notifications() {
    const d = MF.get();
    const out = [];
    if (MF.can('pedidos')) {
      d.orders.filter((o) => o.status === 'pendiente').forEach((o) => out.push(['whatsapp', `Pedido #${o.number} de ${o.customer.name}`, 'Pendiente de confirmar', '#/pedidos']));
      d.orders.filter((o) => o.status === 'esperando_pago').forEach((o) => out.push(['qr', `Pedido #${o.number}: pago QR por verificar`, o.receipt ? 'Comprobante adjunto' : 'Sin comprobante todavía', '#/pedidos']));
    }
    if (MF.can('alertas')) d.products.filter(MF.isActive).forEach((p) => { const s = MF.stock(p); if (s <= p.minStock) out.push(['alert', `${p.name}: ${s === 0 ? 'agotado' : 'quedan ' + s}`, 'Alerta de stock', '#/inventario?estado=' + (s ? 'bajo' : 'agotado')]); });
    return out;
  }
  function showNotifications() {
    const n = notifications();
    MF.modal({
      title: 'Notificaciones', size: 'sm', noFocus: true,
      body: (n.length ? `<ul class="list notif-list">${n.slice(0, 14).map(([ic, t, s, href]) => `<li><span class="ic">${MF.icon(ic, 'sm')}</span><div class="grow"><b>${esc(t)}</b><small>${esc(s)}</small></div><a class="btn ghost sm" href="${href}" data-close>Ver</a></li>`).join('')}</ul>` : '<div class="empty">Sin novedades</div>') +
        (MF.can('alertas') ? '' : `<div style="margin-top:10px">${lockMini('alertas')}</div>`)
    });
  }

  // ---------- Enrutador ----------
  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    let [id, q] = h.split('?');
    const params = {};
    (q || '').split('&').filter(Boolean).forEach((kv) => { const [k, v] = kv.split('='); params[k] = decodeURIComponent(v || ''); });
    id = ALIAS[id] || id;
    if (id === 'inventario' && params.ia) id = 'registrar';
    return { id: modules[id] ? id : 'inicio', params };
  }
  function route() {
    const { id, params } = parseHash();
    const mod = modules[id];
    const changed = current !== id;
    current = id;
    $('#viewTitle').textContent = mod.title || mod.label;
    $('#viewSub').textContent = mod.sub ? mod.sub() : '';
    document.body.dataset.view = id;
    const view = $('#view');
    if (locked(mod)) view.innerHTML = lockView(mod);
    else mod.render(view, params);
    MF.hydrateIcons(view);
    renderNav();
    if (changed) window.scrollTo(0, 0);
  }
  function refresh() { renderPlanSwitch(); renderUsage(); renderTop(); renderStrip(); route(); }
  // Re-render de la vista actual tras una operación (sin perder el scroll)
  function rerender() { renderUsage(); renderTop(); renderStrip(); const y = window.scrollY; route(); window.scrollTo(0, y); }
  const go = (hash) => { if (location.hash === hash) route(); else location.hash = hash; };

  // ---------- Inicio ----------
  register({
    id: 'inicio', label: 'Inicio', icon: 'home',
    sub: () => `${MF.fdate(new Date())}${MF.can('sucursales') ? ' · ' + MF.branchName(MF.branchId()) : ''}`,
    render(view) {
      const d = MF.get();
      const b = MF.branchId();
      const sales = MF.visibleSales().filter((s) => s.status === 'completada' && s.branchId === b);
      const sum = (arr) => arr.reduce((a, s) => a + s.total, 0);
      const today = sales.filter((s) => MF.sameDay(s.date, Date.now()));
      const now = new Date();
      const month = sales.filter((s) => { const x = new Date(s.date); return x.getMonth() === now.getMonth() && x.getFullYear() === now.getFullYear(); });
      const active = d.products.filter(MF.isActive);
      const units = active.reduce((a, p) => a + MF.stock(p), 0);
      const low = active.filter((p) => MF.stock(p) <= p.minStock);
      const series = [];
      for (let i = 6; i >= 0; i--) { const day = new Date(); day.setDate(day.getDate() - i); series.push({ label: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'][day.getDay()], value: sum(sales.filter((s) => MF.sameDay(s.date, day))) }); }
      const openOrders = MF.can('pedidos') ? d.orders.filter((o) => MF.OPEN_ORDER.includes(o.status)) : [];
      const ai = MF.aiUsage();
      const u = MF.currentUser();
      view.innerHTML = `
        <p class="hello">Hola, <b>${esc(u.name.split(' ')[0])}</b> 👋</p>
        <div class="hero-actions">
          <a class="ha ha-ai" href="#/registrar">${MF.icon('camera')}<b>Registrar prenda</b><span>Con una foto y la IA · ${ai.left} análisis ${ai.total ? 'disponibles' : 'este mes'}</span></a>
          <a class="ha ha-sale" href="#/vender">${MF.icon('cart')}<b>Nueva venta</b><span>Busca, cobra y entrega la boleta</span></a>
        </div>
        ${openOrders.length ? `<a class="alert-strip info" href="#/pedidos">${MF.icon('bell', 'sm')}<span><b>${openOrders.length} pedidos online</b> esperan confirmación. El stock está reservado, no descontado.</span>${MF.icon('chevronRight', 'sm')}</a>` : ''}
        <div class="kpis kpis-4">
          <div class="kpi"><small>Vendido hoy</small><b>${money(sum(today))}</b><em>${today.length} ventas</em></div>
          <div class="kpi pink"><small>Este mes</small><b>${money(sum(month))}</b><em>${month.length} ventas</em></div>
          <a class="kpi mint" href="#/inventario"><small>Unidades disponibles</small><b>${MF.num(units)}</b><em>${active.length} productos</em></a>
          <a class="kpi amber" href="#/inventario?estado=bajo"><small>Poco stock o agotado</small><b>${low.length}</b><em>${low.filter((p) => MF.stock(p) === 0).length} agotados</em></a>
        </div>
        <div class="grid g-main">
          <div class="panel"><div class="panel-head"><h3>Ventas de los últimos 7 días</h3><a class="link-btn" href="#/reportes">Reportes ${MF.icon('arrowRight', 'sm')}</a></div>
            ${MF.charts.bars(series, { h: 170, short: MF.charts.short })}</div>
          <div class="panel"><div class="panel-head"><h3>Últimas ventas</h3><a class="link-btn" href="#/ventas">Ver todas ${MF.icon('arrowRight', 'sm')}</a></div>
            <ul class="list">${sales.slice(-5).reverse().map((s) => `<li><span class="ic">${MF.icon(s.method === 'qr' ? 'qr' : 'wallet', 'sm')}</span><div class="grow"><b>${esc(s.items.map((i) => i.name).join(', '))}</b><small>#${s.number} · ${MF.frel(s.date)}${s.channel === 'online' ? ' · online' : ''}</small></div><b>${money(s.total)}</b></li>`).join('') || '<li class="empty">Aún no hay ventas</li>'}</ul></div>
        </div>
        <div class="grid g2" style="margin-top:14px">
          <div class="panel"><div class="panel-head"><h3>Prendas por reponer</h3>${MF.can('alertas') ? '<span class="badge warn">Alertas activas</span>' : lockPill('alertas')}</div>
            <ul class="list">${low.slice(0, 4).map((p) => `<li>${MF.photo(p, 'thumb')}<div class="grow"><b>${esc(p.name)}</b><small>${esc(p.category)}</small></div><span class="badge ${MF.stock(p) ? 'warn' : 'bad'}">${MF.stock(p)} u.</span></li>`).join('') || '<li class="empty">Todo con stock suficiente</li>'}</ul></div>
          <div class="panel"><div class="panel-head"><h3>${MF.icon('store', 'sm')} Catálogo online</h3>${MF.can('catalogo') ? `<span class="badge ${MF.catalogActive() ? 'ok' : 'bad'}">${MF.catalogActive() ? 'Activo' : 'Desactivado'}</span>` : lockPill('catalogo')}</div>
            ${MF.can('catalogo')
              ? `<p class="muted" style="font-size:.88rem;margin-top:0">Sus clientas ven ${d.products.filter((p) => p.published && MF.isActive(p)).length} prendas y piden por WhatsApp o QR. La disponibilidad sale de este mismo inventario.</p><div class="actions start"><a class="btn ghost sm" href="catalogo.html" target="_blank" rel="noopener">${MF.icon('external', 'sm')} Abrir catálogo</a><a class="btn ghost sm" href="#/pedidos">${MF.icon('package', 'sm')} Pedidos</a></div>`
              : lockMini('catalogo', 'Catálogo público con pedidos por WhatsApp y QR')}</div>
        </div>`;
    }
  });

  // ---------- Mi plan ----------
  register({
    id: 'plan', label: 'Mi plan', icon: 'layers',
    sub: () => `Plan ${MF.plan().name} · demostración`,
    render(view) {
      const pl = MF.plan();
      view.innerHTML = `<div class="panel" style="margin-bottom:14px"><div class="panel-head"><h3>Plan ${pl.name} · ${pl.priceLabel}${pl.period}</h3>${pl.popular ? '<span class="badge violet">Más elegido</span>' : ''}</div>
          <p class="muted" style="margin-top:0">${esc(pl.tagline)}</p><div class="usage-box">${usageHTML()}</div>
          ${pl.note ? `<p class="muted" style="font-size:.84rem;margin-bottom:0">${esc(pl.note)}</p>` : ''}</div>
        <div class="panel"><div class="panel-head"><h3>Cambiar plan de la demostración</h3></div>
          <p class="muted" style="margin-top:0;font-size:.88rem">Es la misma aplicación: al cambiar de plan se actualizan los límites y se bloquean las funciones no incluidas. No hay cobros reales.</p>
          <div class="plan-pick">${MF.PLANS.map((p) => `<button type="button" class="pp ${p.id === pl.id ? 'on' : ''}" data-plan="${p.id}"><b>${p.name}</b><span>${p.priceLabel}${p.period}</span><small>${MF.num(p.limits.products)} productos · ${p.limits.ai} IA ${p.limits.aiTotal ? 'en total' : '/mes'}</small></button>`).join('')}</div>
          <div class="actions start" style="margin-top:12px"><a class="btn ghost sm" href="planes.html#comparar">${MF.icon('compare', 'sm')} Comparar planes</a></div></div>`;
    }
  });

  // ---------- Inicio de la app ----------
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
      const tl = e.target.closest('[data-trial]');
      if (tl) {
        MF.get().settings.trialExpired = tl.dataset.trial === 'off';
        if (tl.dataset.trial === 'on') MF.get().settings.trialStart = new Date().toISOString();
        MF.save(); MF.toast(tl.dataset.trial === 'off' ? 'Simulación: la prueba terminó (solo lectura)' : 'Prueba reactivada: 14 días', 'info'); rerender(); return;
      }
      const pb = e.target.closest('[data-plan]');
      if (pb) switchPlan(pb.dataset.plan);
    });
    $('#planSel').addEventListener('change', (e) => switchPlan(e.target.value));
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
    window.addEventListener('hashchange', route);
    MF.onChange((src) => { if (src === 'remote') rerender(); });
    refresh();
  }

  MF.demo = { register, start, refresh, rerender, go, upgrade, guardWrite, lockMini, lockPill, fromPlan, modules };
})();
