/*
 * Panel del comerciante: armazón (barra lateral, encabezado, notificaciones),
 * enrutador por hash, inicio (dashboard), cuenta y utilidades compartidas.
 * Cada sección se registra con CA.dash.view(...) desde su propio archivo.
 */
(function () {
  'use strict';
  const CA = window.CA;
  const u = CA.util, ui = CA.ui, esc = u.esc, I = ui.icon, B = CA.CONFIG.brand;
  const $ = ui.$, $$ = ui.$$;

  const VIEWS = {};
  const NAV = [
    ['General', ['inicio']],
    ['Datos', ['integraciones', 'mapeo', 'productos']],
    ['Catálogos', ['catalogos', 'editor', 'whatsapp']],
    ['Negocio', ['estadisticas', 'suscripcion', 'cuenta']]
  ];

  const D = (CA.dash = {
    view(name, def) { VIEWS[name] = def; },
    db: () => CA.store.db,
    user: () => CA.session.user(),
    ws: () => CA.store.db.workspaces[CA.session.userId()],
    limits: () => CA.plans.effectiveLimits(CA.session.user()),
    planId: () => CA.plans.effective(CA.session.user()),
    el: () => $('#view'),
    route() {
      const h = location.hash.replace(/^#\/?/, '');
      const [name, q] = h.split('?');
      return { name: VIEWS[name] ? name : 'inicio', params: new URLSearchParams(q || '') };
    },
    go(path) { location.hash = '#/' + path; },
    /** Operación transaccional con mensaje; refresca la vista. Devuelve el resultado o undefined. */
    act(fn, okMsg, opts) {
      const uid = CA.session.userId();
      const r = ui.safe(() => CA.store.tx((db) => fn(db, uid)), okMsg);
      if (r !== undefined && !(opts && opts.noRender)) D.render();
      return r;
    },
    render,
    /** Aviso de función bloqueada por el plan, con acceso directo a cambiar de plan. */
    lockBox(title, text, plan) {
      return '<div class="lock-box">' + I('lock2', 'lock-ic') + '<div><h4>' + esc(title) + '</h4><p>' + esc(text) + '</p></div><a class="btn btn-primary btn-sm" href="#/suscripcion?plan=' + (plan || 'pro') + '">' + I('crown') + 'Ver planes</a></div>';
    },
    planBadge(user) {
      const lbl = CA.plans.label(user);
      const trial = CA.plans.trialActive(user) && !CA.plans.paidActive(user);
      return ui.badge(lbl + (trial ? ' · ' + CA.plans.trialDaysLeft(user) + ' d' : ''), trial ? 'accent' : CA.plans.effective(user) === 'free' ? 'neutral' : 'brand', 'crown');
    },
    syncState(ws) {
      const sh = ws.integrations.sheets;
      if (!sh.connected) return { tone: 'neutral', text: 'Sin conectar' };
      const errs = (ws.products || []).filter((p) => p.sync === 'error').length;
      return errs ? { tone: 'warn', text: errs + ' fila(s) con errores' } : { tone: 'ok', text: 'Sincronizado ' + u.ago(sh.lastSync) };
    },
    runSync,
    previewUrl(c, extra) { return CA.catalogs.localUrl(c, '&preview=1' + (extra || '')); },
    emptyStep(icon, title, text, href, label) {
      return '<div class="card">' + ui.empty(icon, title, text, href ? '<a class="btn btn-primary" href="' + href + '">' + esc(label) + '</a>' : '') + '</div>';
    }
  });

  /* ---------------- sincronización con progreso visual ---------------- */
  function runSync(opts) {
    opts = opts || {};
    const ws = D.ws();
    if (!ws.integrations.sheets.connected) { ui.toast('Primero conecta Google Sheets.', 'warn'); D.go('integraciones'); return Promise.resolve(null); }
    const sheet = CA.products.sheet(D.db(), ws.integrations.sheets.sheetId);
    const tab = CA.products.tab(D.db(), ws.integrations.sheets.sheetId, ws.integrations.sheets.tab);
    const steps = ['Conectando con Google Sheets', 'Leyendo ' + tab.rows.length + ' filas de "' + ws.integrations.sheets.tab + '"', ws.integrations.drive.connected ? 'Asociando imágenes de Google Drive' : 'Google Drive no conectado: se usarán imágenes de respaldo', 'Validando SKU, precios y categorías', 'Actualizando catálogos publicados'];
    return new Promise((resolve) => {
      const m = ui.modal({
        title: 'Sincronizando productos', subtitle: esc(sheet.name) + ' › ' + esc(ws.integrations.sheets.tab) + ' <span class="demo-tag">Simulación</span>', icon: 'sync', size: 'sm', persistent: true,
        body: '<ul class="sync-steps">' + steps.map((s, i) => '<li data-s="' + i + '"><span class="ss-ic"></span>' + esc(s) + '</li>').join('') + '</ul><div class="progress" style="margin-top:14px"><i id="syncBar" style="width:0"></i></div>'
      });
      let i = 0;
      const tick = () => {
        $$('.sync-steps li', m.body).forEach((li, k) => { li.classList.toggle('done', k < i); li.classList.toggle('now', k === i); });
        m.body.querySelector('#syncBar').style.width = (i / steps.length) * 100 + '%';
        if (i < steps.length) { i++; setTimeout(tick, opts.fast ? 60 : 380); return; }
        const res = ui.safe(() => CA.store.tx((db) => CA.products.sync(db, CA.session.userId(), { mode: opts.mode || 'manual' })));
        m.close();
        if (res) {
          const l = res.log;
          ui.toast('Sincronizado: ' + l.rows + ' filas · ' + l.added + ' nuevos · ' + l.updated + ' actualizados' + (l.errors ? ' · ' + l.errors + ' con errores' : ''), l.errors ? 'warn' : 'success', 5000);
          render();
        }
        resolve(res);
      };
      tick();
    });
  }

  /* ---------------- armazón ---------------- */
  function renderShell(r) {
    const user = D.user(), ws = D.ws();
    $$('[data-brand]').forEach((el) => (el.textContent = B.name));
    $$('[data-brand-short]').forEach((el) => (el.textContent = B.short));
    $('#sideBiz').innerHTML = ui.avatar(user.business) + '<div><b>' + esc(user.business) + '</b><small>' + esc(user.email) + '</small></div>';
    const errs = (ws.products || []).filter((p) => p.sync === 'error').length;
    const badge = { mapeo: errs ? '<span class="nav-count warn">' + errs + '</span>' : '', catalogos: '<span class="nav-count">' + (ws.catalogs || []).length + '</span>' };
    $('#sideNav').innerHTML = NAV.map((g) => '<div class="side-group">' + g[0] + '</div>' + g[1].map((k) => {
      const v = VIEWS[k];
      const href = k === 'editor' ? '#/editor' + (ws.catalogs.length ? '?id=' + ws.catalogs[0].id : '') : '#/' + k;
      return '<a href="' + href + '" class="' + (k === r.name ? 'on' : '') + '">' + I(v.icon) + '<span>' + v.title + '</span>' + (badge[k] || '') + (v.locked && v.locked() ? I('lock2', 'nav-lock') : '') + '</a>';
    }).join('')).join('');
    const eff = CA.plans.effective(user);
    const trial = CA.plans.trialActive(user) && !CA.plans.paidActive(user);
    $('#sidePlan').innerHTML = '<div class="sp-top">' + D.planBadge(user) + '</div>' +
      (trial ? '<b>Prueba Profesional</b><small>Te quedan ' + CA.plans.trialDaysLeft(user) + ' días. Elige un plan para no perder funciones.</small><div class="progress"><i style="width:' + Math.round(((CA.CONFIG.trialDays - CA.plans.trialDaysLeft(user)) / CA.CONFIG.trialDays) * 100) + '%"></i></div>'
        : eff === 'free' ? '<b>Plan Gratis</b><small>' + (user.trial.status === 'unused' ? 'Publica tu primer catálogo y activa 14 días de Profesional.' : 'Mejora tu plan para más productos y personalización.') + '</small>'
          : '<b>Plan ' + CA.PLANS[eff].name + '</b><small>' + (user.subscription.status === 'canceled' ? 'Cancelado · activo hasta el ' + u.date(user.subscription.renewsAt) : 'Renueva el ' + u.date(user.subscription.renewsAt)) + '</small>') +
      '<a class="btn btn-sm ' + (eff === 'business' ? 'btn-ghost' : 'btn-primary') + ' btn-block" href="#/suscripcion">' + (eff === 'business' ? 'Ver suscripción' : 'Mejorar plan') + '</a>';
    // notificaciones
    const notifs = ws.notifications || [];
    const unread = notifs.filter((n) => !n.read).length;
    $('#notifBtn').innerHTML = I('bell') + (unread ? '<span class="dot-badge">' + unread + '</span>' : '');
    $('#notifMenu').innerHTML = '<div class="nm-head"><b>Notificaciones</b>' + (unread ? '<button class="link-btn" id="markRead">Marcar como leídas</button>' : '') + '</div>' +
      (notifs.length ? notifs.slice(0, 8).map((n) => '<a href="#/' + (n.link || 'inicio') + '" class="nm-item' + (n.read ? '' : ' unread') + '"><span class="nm-dot ' + n.tone + '"></span><div><b>' + esc(n.title) + '</b><small>' + esc(n.text) + '</small><time>' + u.ago(n.at) + '</time></div></a>').join('') : '<p class="muted" style="padding:14px;margin:0">Sin notificaciones.</p>');
    const mr = $('#markRead'); if (mr) mr.onclick = (e) => { e.stopPropagation(); D.act((db, uid) => db.workspaces[uid].notifications.forEach((n) => (n.read = true))); };
    $('#userBtn').innerHTML = ui.avatar(user.name) + '<span class="ub-name">' + esc(user.name.split(' ')[0]) + '</span>' + I('down');
    $('#userMenu').innerHTML = '<div class="nm-head"><div><b>' + esc(user.name) + '</b><br><small class="muted">' + esc(user.email) + '</small></div></div>' +
      '<a href="#/cuenta">' + I('user') + 'Mi cuenta</a><a href="#/suscripcion">' + I('crown') + 'Mi suscripción</a><a href="index.html">' + I('globe') + 'Ver sitio comercial</a><a href="admin.html">' + I('shield') + 'Panel de superadministrador</a><hr>' +
      '<button id="resetDemo">' + I('refresh') + 'Restablecer demostración</button><button id="logout">' + I('logout') + 'Cerrar sesión</button>';
    $('#resetDemo').onclick = resetDemo;
    $('#logout').onclick = () => { CA.session.clear(); location.href = 'login.html'; };
    const v = VIEWS[r.name];
    $('#pageTitle').textContent = v.title;
    $('#pageSub').textContent = v.sub || '';
    document.title = v.title + ' · ' + B.name;
    document.body.classList.toggle('editor-mode', !!v.fullscreen);
  }

  async function resetDemo() {
    if (!(await ui.confirm({ title: 'Restablecer demostración', message: 'Se borrarán <b>todas</b> las cuentas, catálogos, productos y cambios guardados en este navegador, y se volverán a crear los datos de demostración. Entrarás con la cuenta demo.', confirmLabel: 'Restablecer', danger: true }))) return;
    CA.store.clear();
    CA.store.replace(CA.seed.build());
    CA.session.set('usr_demo');
    location.hash = '#/inicio';
    location.reload();
  }
  CA.dash.resetDemo = resetDemo;

  let last = null;
  function render() {
    const user = D.user();
    if (!user) { location.href = 'login.html'; return; }
    const r = D.route();
    renderShell(r);
    const v = VIEWS[r.name];
    if (r.name !== last) { window.scrollTo(0, 0); last = r.name; }
    try { v.render(D.el(), r.params); }
    catch (e) { console.error(e); D.el().innerHTML = '<div class="card">' + ui.empty('alert', 'No se pudo mostrar esta sección', e.message) + '</div>'; }
  }

  /* ---------------- inicio ---------------- */
  D.view('inicio', { title: 'Inicio', icon: 'grid', sub: 'Resumen de tu negocio', render: renderHome });

  function checklist(user, ws) {
    const cats = ws.catalogs || [];
    return [
      { done: true, title: 'Crea tu cuenta', text: 'Listo, ya eres parte de ' + B.name + '.', href: '#/cuenta' },
      { done: ws.integrations.sheets.connected, title: 'Conecta Google Sheets', text: 'Elige la hoja y la pestaña con tus productos.', href: '#/integraciones' },
      { done: ws.integrations.drive.connected, title: 'Vincula tus imágenes de Drive', text: 'Selecciona la carpeta con las fotos.', href: '#/integraciones?tab=drive' },
      { done: !!ws.mapping && (ws.products || []).length > 0, title: 'Configura las columnas', text: 'Indica qué columna es el SKU, el nombre, el precio…', href: '#/mapeo' },
      { done: cats.length > 0, title: 'Crea tu catálogo y elige una plantilla', text: 'Personaliza colores, logo y banner.', href: '#/catalogos' },
      { done: cats.some((c) => c.whatsapp.numbers.some((n) => n.number)), title: 'Configura WhatsApp', text: 'Número, mensaje y botón de contacto.', href: '#/whatsapp' },
      { done: cats.some((c) => c.status === 'published'), title: 'Publica tu catálogo', text: 'Al publicar el primero activas 14 días de Profesional.', href: '#/catalogos' }
    ];
  }

  function renderHome(el, params) {
    const user = D.user(), ws = D.ws(), db = D.db();
    const limits = D.limits();
    const steps = checklist(user, ws);
    const doneN = steps.filter((s) => s.done).length;
    const valid = (ws.products || []).filter((p) => p.sync !== 'error');
    const pub = CA.products.publishable(db, user);
    const stats = CA.analytics.summary(db, user.id, 30);
    const trial = CA.plans.trialActive(user) && !CA.plans.paidActive(user);
    const statsOk = limits.stats !== 'none';
    const alerts = [];
    if (params.get('bienvenida')) alerts.push(['brand', 'sparkles', '¡Tu cuenta está lista! Sigue la guía de inicio: en unos minutos tendrás tu catálogo publicado.']);
    if (trial && CA.plans.trialDaysLeft(user) <= 5) alerts.push(['warn', 'clock', 'Tu prueba Profesional termina en ' + CA.plans.trialDaysLeft(user) + ' días. <a href="#/suscripcion">Elige un plan</a> para conservar todas las funciones.']);
    else if (trial) alerts.push(['brand', 'crown', 'Estás usando la prueba Profesional: te quedan <b>' + CA.plans.trialDaysLeft(user) + ' días</b>. Todas las plantillas y la personalización completa están habilitadas.']);
    if (user.trial.status === 'expired' && CA.plans.effective(user) === 'free') alerts.push(['warn', 'alert', 'Tu prueba terminó y volviste al plan Gratis. Tus datos se conservaron. <a href="#/suscripcion">Ver planes</a>']);
    const errs = valid.length !== (ws.products || []).length ? (ws.products || []).length - valid.length : 0;
    if (errs) alerts.push(['bad', 'alert', errs + ' fila(s) de tu hoja tienen errores y no se publican. <a href="#/mapeo">Revisar</a>']);
    const imgWarn = (ws.products || []).filter((p) => p.issues.some((x) => x.type === 'image')).length;
    if (imgWarn) alerts.push(['warn', 'image', imgWarn + ' producto(s) sin imagen en Drive: se muestran con imagen de respaldo. <a href="#/productos?f=warning">Ver productos</a>']);
    if (pub.hidden) alerts.push(['warn', 'lock2', pub.hidden + ' producto(s) superan el límite de ' + u.num(pub.limit) + ' de tu plan y no se muestran en tus catálogos. <a href="#/suscripcion">Mejorar plan</a>']);
    (ws.catalogs || []).forEach((c) => { const st = CA.catalogs.liveStatus(db, user, ws, c); if (st.reason === 'limit') alerts.push(['warn', 'lock2', 'El catálogo "' + esc(c.name) + '" está pausado porque supera el límite de catálogos de tu plan.']); });

    const kpi = (ic, label, value, sub, tone, href) => '<a class="kpi ' + (tone || '') + '"' + (href ? ' href="' + href + '"' : '') + '><span class="kpi-ic">' + I(ic) + '</span><div><small>' + label + '</small><b>' + value + '</b><span>' + sub + '</span></div></a>';
    el.innerHTML = '<div class="view-in">' +
      '<div class="hello"><div><h2>Hola, ' + esc(user.name.split(' ')[0]) + ' 👋</h2><p class="muted">' + esc(user.business) + ' · ' + D.planBadge(user) + '</p></div>' +
      '<div class="hello-actions">' + (ws.catalogs.length ? '<a class="btn btn-ghost" href="' + D.previewUrl(ws.catalogs[0]) + '" target="_blank" rel="noopener">' + I('eye') + 'Ver mi catálogo</a>' : '') +
      '<button class="btn btn-primary" id="homeSync"' + (ws.integrations.sheets.connected ? '' : ' disabled title="Conecta Google Sheets primero"') + '>' + I('sync') + 'Sincronizar ahora</button></div></div>' +
      alerts.map((a) => '<div class="alert alert-' + a[0] + '" style="margin-bottom:10px">' + I(a[1]) + '<p>' + a[2] + '</p></div>').join('') +
      (doneN < steps.length ? '<div class="card onboarding"><div class="card-head"><h3>' + I('rocket') + 'Guía de inicio</h3><span class="muted">' + doneN + ' de ' + steps.length + ' pasos</span></div><div class="progress" style="margin-bottom:14px"><i style="width:' + Math.round((doneN / steps.length) * 100) + '%"></i></div>' +
        '<ol class="checklist">' + steps.map((s, i) => '<li class="' + (s.done ? 'done' : '') + '"><span class="ck">' + (s.done ? I('check') : i + 1) + '</span><div><b>' + s.title + '</b><small>' + s.text + '</small></div>' + (s.done ? '' : '<a class="btn btn-sm btn-soft" href="' + s.href + '">Hacer ahora</a>') + '</li>').join('') + '</ol></div>' : '') +
      '<div class="kpis">' +
      kpi('crown', 'Plan actual', CA.plans.label(user), trial ? CA.plans.trialDaysLeft(user) + ' días de prueba restantes' : CA.plans.effective(user) === 'free' ? 'Gratis para siempre' : 'Renueva el ' + u.date(user.subscription.renewsAt), trial ? 'accent' : '', '#/suscripcion') +
      kpi('layout', 'Catálogos', ws.catalogs.length + ' / ' + limits.catalogs, ws.catalogs.filter((c) => c.status === 'published').length + ' publicado(s)', '', '#/catalogos') +
      kpi('cards', 'Productos sincronizados', u.num(valid.length), 'Límite del plan: ' + u.num(limits.products), pub.hidden ? 'warn' : '', '#/productos') +
      kpi('eye', 'Visitas (30 días)', statsOk ? u.num(stats.totals.views) : '—', statsOk ? 'Datos simulados' : 'Desde el plan Profesional', '', '#/estadisticas') +
      kpi('whatsapp', 'Clics a WhatsApp', statsOk ? u.num(stats.totals.whatsapp) : '—', statsOk ? u.num(stats.totals.ctr) + '% de las visitas' : 'Desde el plan Profesional', 'ok', '#/estadisticas') +
      kpi('sync', 'Última sincronización', ws.integrations.sheets.connected ? u.ago(ws.integrations.sheets.lastSync) : 'Sin conectar', ws.integrations.sheets.connected ? 'Automática cada ' + (limits.syncMinutes >= 1440 ? '24 h' : limits.syncMinutes + ' min') : 'Conecta Google Sheets', '', '#/integraciones') +
      '</div>' +
      '<div class="grid-2">' +
      '<div class="card"><div class="card-head"><h3>' + I('chart') + 'Visitas y clics a WhatsApp</h3><span class="demo-tag">Simulado</span></div>' +
      (statsOk ? (stats.totals.views ? ui.barChart(stats.series.slice(-14).map((r) => ({ label: r.label, value: r.views, value2: r.whatsapp })), { series: [{ key: 'value', cls: 'b1', label: 'Visitas' }, { key: 'value2', cls: 'b2', label: 'Clics a WhatsApp' }], height: 210 }) : ui.empty('chart', 'Aún no hay visitas', 'Publica tu catálogo y compártelo para empezar a medir.'))
        : D.lockBox('Estadísticas en el plan Profesional', 'Mide visitas, productos más vistos y clics a WhatsApp.')) + '</div>' +
      '<div class="card"><div class="card-head"><h3>' + I('bell') + 'Actividad y alertas</h3></div>' +
      ((ws.notifications || []).length ? '<ul class="feed">' + ws.notifications.slice(0, 6).map((n) => '<li><span class="nm-dot ' + n.tone + '"></span><div><b>' + esc(n.title) + '</b><small>' + esc(n.text) + '</small></div><time>' + u.ago(n.at) + '</time></li>').join('') + '</ul>' : ui.empty('bell', 'Sin actividad todavía')) + '</div>' +
      '</div>' +
      (statsOk && stats.top.length && stats.totals.views ? '<div class="card" style="margin-top:16px"><div class="card-head"><h3>' + I('star') + 'Productos más vistos</h3><a class="btn btn-sm btn-ghost" href="#/estadisticas">Ver estadísticas</a></div>' + ui.hbars(stats.top.slice(0, 5).map((t) => ({ label: t.product.name, value: t.views, sub: t.product.sku + ' · ' + u.money(t.product.offer || t.product.price) }))) + '</div>' : '') +
      '</div>';
    const hs = $('#homeSync'); if (hs) hs.onclick = () => runSync();
  }

  /* ---------------- cuenta ---------------- */
  D.view('cuenta', { title: 'Mi cuenta', icon: 'user', sub: 'Datos del negocio y de acceso', render: renderAccount });
  function renderAccount(el) {
    const user = D.user();
    el.innerHTML = '<div class="view-in grid-2">' +
      '<div class="card"><div class="card-head"><h3>' + I('store') + 'Datos del negocio</h3></div><form id="accForm" class="form-grid" novalidate>' +
      ui.field({ name: 'business', label: 'Nombre del negocio', required: true, value: user.business, wide: true }) +
      ui.field({ name: 'name', label: 'Tu nombre', required: true, value: user.name }) +
      ui.field({ name: 'email', label: 'Correo', type: 'email', required: true, value: user.email }) +
      '<div class="field-wide"><button class="btn btn-primary">' + I('check') + 'Guardar cambios</button></div></form></div>' +
      '<div class="card"><div class="card-head"><h3>' + I('shield') + 'Acceso y datos</h3></div><dl class="kv"><dt>Acceso</dt><dd>' + (user.provider === 'google' ? 'Google (simulado)' : 'Correo y contraseña (simulado)') + '</dd><dt>Cuenta creada</dt><dd>' + u.date(user.createdAt) + '</dd><dt>Plan vigente</dt><dd>' + CA.plans.label(user) + '</dd><dt>ID</dt><dd class="mono">' + user.id + '</dd></dl>' +
      '<div class="alert alert-info" style="margin-top:16px">' + I('info') + '<p>Prototipo: los datos se guardan en LocalStorage de este navegador. No es un mecanismo seguro de autenticación ni de control de suscripciones.</p></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px"><button class="btn btn-danger-ghost" id="accReset">' + I('refresh') + 'Restablecer demostración</button><button class="btn btn-ghost" id="accOut">' + I('logout') + 'Cerrar sesión</button></div></div></div>';
    const f = $('#accForm');
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = ui.formValues(f);
      const errs = {};
      if (String(v.business).trim().length < 2) errs.business = 'Ingresa el nombre del negocio.';
      if (String(v.name).trim().length < 2) errs.name = 'Ingresa tu nombre.';
      if (!u.validEmail(v.email)) errs.email = 'Correo no válido.';
      else if (D.db().users.some((x) => x.email === v.email.trim().toLowerCase() && x.id !== user.id)) errs.email = 'Ese correo ya pertenece a otra cuenta.';
      if (Object.keys(errs).length) return ui.setErrors(f, errs);
      D.act((db, uid) => Object.assign(db.users.find((x) => x.id === uid), { business: v.business.trim(), name: v.name.trim(), email: v.email.trim().toLowerCase() }), 'Datos guardados');
    });
    $('#accReset').onclick = resetDemo;
    $('#accOut').onclick = () => { CA.session.clear(); location.href = 'login.html'; };
  }

  /* ---------------- arranque ---------------- */
  D.start = function () {
    CA.boot();
    if (u.qs('demo')) { CA.session.set('usr_demo'); history.replaceState(null, '', 'dashboard.html' + location.hash); }
    if (!CA.session.user()) { location.href = 'login.html'; return; }
    // Sincronización automática según el intervalo del plan (simulada al abrir el panel)
    const user = D.user(), ws = D.ws();
    const sh = ws.integrations.sheets;
    if (sh.connected && sh.autoSync && (!sh.lastSync || (CA.now() - new Date(sh.lastSync)) / 60000 >= D.limits().syncMinutes)) {
      CA.store.tx((db) => CA.products.sync(db, user.id, { mode: 'automática' }));
    }
    const bienvenida = u.qs('bienvenida');
    if (bienvenida) history.replaceState(null, '', 'dashboard.html#/inicio?bienvenida=1');
    // Menús desplegables
    const dd = (id) => { const d = $('#' + id); d.querySelector('button').addEventListener('click', (e) => { e.stopPropagation(); $$('.dropdown.open').forEach((x) => x !== d && x.classList.remove('open')); d.classList.toggle('open'); }); };
    dd('notifDd'); dd('userDd');
    document.addEventListener('click', (e) => { if (!e.target.closest('.dropdown-menu')) $$('.dropdown.open').forEach((x) => x.classList.remove('open')); });
    const side = $('#side'), scrim = $('#scrim');
    $('#sideToggle').onclick = () => { side.classList.add('open'); scrim.classList.add('on'); };
    scrim.onclick = () => { side.classList.remove('open'); scrim.classList.remove('on'); };
    window.addEventListener('hashchange', () => { side.classList.remove('open'); scrim.classList.remove('on'); $$('.dropdown.open').forEach((x) => x.classList.remove('open')); ui.closeAll(); render(); });
    CA.store.on((o) => { if (o === 'external' && !document.querySelector('.modal-wrap') && !document.body.classList.contains('editor-mode')) render(); });
    const boot = $('#boot'); if (boot) { boot.classList.add('out'); setTimeout(() => boot.remove(), 300); }
    render();
  };
})();
