/*
 * Estructura común de los prototipos: barra lateral, barra superior con buscador global,
 * notificaciones, aviso de simulación y tema. Cada página dibuja su contenido en WAB.shell.view.
 */
(function (root) {
  const WAB = root.WAB;
  const { icon, ui, db } = WAB;
  const { esc } = ui;

  const NAV = [
    { sec: 'General' },
    { id: 'dashboard', label: 'Inicio', icon: 'home' },
    { id: 'conversaciones', label: 'Conversaciones', icon: 'messages', count: () => db.get('conversations').filter((c) => c.estado === 'pendiente').length },
    { id: 'crm', label: 'Contactos', icon: 'users' },
    { sec: 'Automatización' },
    { id: 'automatizaciones', label: 'Automatizaciones', icon: 'workflow' },
    { id: 'ia', label: 'Inteligencia artificial', icon: 'sparkles' },
    { sec: 'Operación' },
    { id: 'calendario', label: 'Calendario', icon: 'calendar' },
    { id: 'productos', label: 'Productos', icon: 'package' },
    { id: 'pedidos', label: 'Pedidos', icon: 'receipt', count: () => db.get('orders').filter((o) => o.estado === 'nuevo' || o.estado === 'pago_revision').length },
    { id: 'ventas', label: 'Ventas', icon: 'wallet' },
    { id: 'campanas', label: 'Campañas', icon: 'megaphone' },
    { sec: 'Análisis' },
    { id: 'reportes', label: 'Reportes', icon: 'bars' },
    { sec: 'Sistema' },
    { id: 'configuracion', label: 'Configuración', icon: 'settings' },
    { sec: 'Demostraciones' },
    { id: 'whatsapp', label: 'Simulador WhatsApp', icon: 'phone' },
    { id: 'tienda', label: 'Catálogo web', icon: 'globe' },
    { id: 'index', label: 'Todos los prototipos', icon: 'grid' }
  ];

  const page = document.body.dataset.page;
  const title = document.body.dataset.title || '';

  function navHTML() {
    return NAV.map((n) => {
      if (n.sec) return `<div class="sb-section">${esc(n.sec)}</div>`;
      const c = n.count ? n.count() : 0;
      return `<a class="sb-link${n.id === page ? ' active' : ''}" href="${n.id}.html"${n.id === page ? ' aria-current="page"' : ''}>${icon(n.icon)}<span class="nav-label">${esc(n.label)}</span>${c ? `<span class="count">${c}</span>` : ''}</a>`;
    }).join('');
  }

  function mount() {
    const content = document.getElementById('page-content');
    const biz = db.get('settings').negocio;
    const app = document.createElement('div');
    app.className = 'app';
    app.innerHTML = `
      <aside class="sidebar" aria-label="Navegación del panel">
        <a class="sb-brand" href="index.html"><span class="brand-mark">${icon('message')}</span><span class="sb-brand-text">WhatsApp Bot<small>Panel de demostración</small></span></a>
        <div class="sb-biz"><span class="avatar sm" style="background:${esc(biz.color)}">${esc(ui.initials(biz.nombre))}</span><div class="grow"><strong>${esc(biz.nombre)}</strong><small>WhatsApp conectado (simulado)</small></div></div>
        <nav class="sb-nav" id="sb-nav">${navHTML()}</nav>
        <div class="sb-foot">
          <a class="sb-link" href="../index.html">${icon('arrowLeft')}<span class="sb-foot-text">Volver a la propuesta</span></a>
          <a class="sb-link" href="../cotizador.html">${icon('file')}<span class="sb-foot-text">Crear cotización</span></a>
          <button class="sb-link" id="sb-reset" style="border:0;background:none;font:inherit;cursor:pointer;width:100%">${icon('refresh')}<span class="sb-foot-text">Restablecer datos</span></button>
        </div>
      </aside>
      <div class="sb-scrim"></div>
      <div class="app-main">
        <div class="sim-banner">${icon('info')}Prototipo de demostración con datos ficticios. WhatsApp, IA, pagos y envíos son simulados.</div>
        <header class="topbar">
          <button class="btn btn-ghost btn-icon sb-toggle" aria-label="Abrir menú">${icon('menu')}</button>
          <h1>${esc(title)}</h1>
          <div class="tb-search">${icon('search', 'sm')}<input class="input" id="tb-search" type="search" placeholder="Buscar contactos, productos, pedidos…" autocomplete="off" aria-label="Búsqueda global"><div class="tb-results" hidden></div></div>
          <div class="tb-actions">
            <button class="btn btn-ghost btn-icon" id="tb-theme" aria-label="Cambiar tema">${icon(ui.currentTheme() === 'dark' ? 'sun' : 'moon')}</button>
            <button class="btn btn-ghost btn-icon bell" id="tb-bell" aria-label="Notificaciones">${icon('bell')}<span class="dot"></span></button>
            <span class="avatar sm" title="Daniela Rojas (asesora)" style="background:${ui.avatarColor('Daniela Rojas')}">DR</span>
          </div>
        </header>
        <main class="main" id="view"></main>
      </div>`;
    document.body.insertBefore(app, document.body.firstChild);
    const view = app.querySelector('#view');
    if (content) { view.appendChild(content); content.hidden = false; }

    // Menú móvil
    const toggle = () => app.classList.toggle('sb-open');
    app.querySelector('.sb-toggle').onclick = toggle;
    app.querySelector('.sb-scrim').onclick = toggle;
    app.querySelector('#tb-theme').onclick = (e) => { const t = ui.toggleTheme(); e.currentTarget.innerHTML = icon(t === 'dark' ? 'sun' : 'moon'); };
    app.querySelector('#sb-reset').onclick = async () => {
      const ok = await ui.confirm({ title: 'Restablecer datos de ejemplo', message: 'Se perderán los cambios realizados en todos los prototipos (contactos, menús, pedidos, citas, configuración).', confirmLabel: 'Restablecer', danger: true });
      if (!ok) return;
      db.reset();
      ui.toast('Datos restablecidos', 'Se cargaron nuevamente los datos de ejemplo.', 'ok');
      setTimeout(() => location.reload(), 600);
    };
    initSearch(app);
    initBell(app);
    db.on('*', refreshBadges);
    db.on('conversations', refreshBadges);
    db.on('orders', refreshBadges);
    return view;
  }

  function refreshBadges() {
    const nav = document.getElementById('sb-nav');
    if (nav) nav.innerHTML = navHTML();
  }

  // ---------- Búsqueda global ----------
  function initSearch(app) {
    const input = app.querySelector('#tb-search');
    const box = app.querySelector('.tb-results');
    const run = ui.debounce(() => {
      const q = input.value.trim().toLowerCase();
      if (q.length < 2) { box.hidden = true; return; }
      const res = [];
      db.get('contacts').filter((c) => `${c.nombre} ${c.telefono} ${c.mascota}`.toLowerCase().includes(q)).slice(0, 5)
        .forEach((c) => res.push({ href: `crm.html#${c.id}`, ic: 'user', t: c.nombre, s: 'Contacto' }));
      db.get('products').filter((p) => p.nombre.toLowerCase().includes(q)).slice(0, 4)
        .forEach((p) => res.push({ href: `productos.html#${p.id}`, ic: 'package', t: p.nombre, s: 'Producto' }));
      db.get('orders').filter((o) => String(o.numero).includes(q.replace('#', ''))).slice(0, 4)
        .forEach((o) => res.push({ href: `pedidos.html#${o.id}`, ic: 'receipt', t: `Pedido #${o.numero}`, s: WAB.STATUS.pedido[o.estado][0] }));
      db.get('services').filter((s) => s.nombre.toLowerCase().includes(q)).slice(0, 3)
        .forEach((s) => res.push({ href: 'calendario.html', ic: 'calendar', t: s.nombre, s: 'Servicio' }));
      box.innerHTML = res.length ? res.map((r) => `<a href="${r.href}">${icon(r.ic, 'sm')}<span>${esc(r.t)}</span><small>${esc(r.s)}</small></a>`).join('')
        : `<div class="empty" style="padding:18px"><p>Sin resultados para "${esc(input.value)}"</p></div>`;
      box.hidden = false;
    }, 150);
    input.addEventListener('input', run);
    input.addEventListener('focus', run);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const a = box.querySelector('a'); if (a) location.href = a.href; }
      if (e.key === 'Escape') { box.hidden = true; input.blur(); }
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('.tb-search')) box.hidden = true; });
    window.addEventListener('hashchange', () => { box.hidden = true; });
  }

  // ---------- Notificaciones ----------
  function initBell(app) {
    const bell = app.querySelector('#tb-bell');
    bell.onclick = (e) => {
      e.stopPropagation();
      const existing = document.querySelector('.notif-pop');
      if (existing) { existing.remove(); return; }
      const items = activity(8);
      const pop = document.createElement('div');
      pop.className = 'notif-pop';
      pop.innerHTML = `<header>Notificaciones<span class="badge">${items.length}</span></header><ul class="activity">${items.map(activityItem).join('')}</ul>`;
      app.querySelector('.app-main').appendChild(pop);
      bell.querySelector('.dot').hidden = true;
      setTimeout(() => document.addEventListener('click', function off(ev) { if (!ev.target.closest('.notif-pop')) { pop.remove(); document.removeEventListener('click', off); } }), 0);
    };
  }

  /** Actividad reciente derivada de los datos (conversaciones, pedidos, citas). */
  function activity(limit = 10) {
    const out = [];
    db.get('conversations').forEach((c) => {
      const ct = db.contact(c.contactId);
      const last = c.mensajes[c.mensajes.length - 1];
      if (!ct || !last) return;
      const txt = last.payload.type === 'text' ? last.payload.text.body : last.payload.type === 'system' ? last.payload.text : 'Mensaje interactivo';
      out.push({ ts: c.actualizado, ic: c.estado === 'pendiente' ? 'headset' : 'message', t: c.estado === 'pendiente' ? `${ct.nombre} espera un asesor` : `Mensaje de ${ct.nombre}`, s: txt, href: `conversaciones.html#${c.id}` });
    });
    db.get('orders').forEach((o) => {
      const ct = db.contact(o.contactId);
      out.push({ ts: o.creado, ic: 'cart', t: `Pedido #${o.numero} · ${WAB.ui.fmt.money(o.total)}`, s: `${ct ? ct.nombre : ''} · ${WAB.STATUS.pedido[o.estado][0]}`, href: `pedidos.html#${o.id}` });
    });
    db.get('appointments').filter((a) => a.creado).forEach((a) => {
      const ct = db.contact(a.contactId);
      const sv = db.service(a.servicioId);
      out.push({ ts: a.creado, ic: 'calendar', t: `Cita ${WAB.STATUS.cita[a.estado][0].toLowerCase()}: ${sv ? sv.nombre : ''}`, s: `${ct ? ct.nombre : ''} · ${WAB.ui.fmt.date(a.fecha, 'short')} ${a.hora}`, href: 'calendario.html' });
    });
    return out.sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, limit);
  }
  function activityItem(a) {
    return `<li><span class="a-icon">${icon(a.ic)}</span><div class="grow"><a href="${a.href}" style="color:var(--text);font-weight:600">${esc(a.t)}</a><small>${esc(a.s)}</small><small>${esc(ui.fmt.relative(a.ts))}</small></div></li>`;
  }

  const view = mount();
  WAB.shell = { view, activity, activityItem, refreshBadges, page };
})(window);
