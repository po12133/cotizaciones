/*
 * Núcleo del prototipo: rutas (#/vista/parametro), barra lateral, selector de sucursal,
 * búsqueda global, notificaciones, cambio de usuario (simula permisos) y consultas comunes.
 */
(function (root) {
  const TOR = root.TOR;
  const { esc, fmt } = TOR.ui;
  const S = TOR.store;
  const icon = TOR.icon;

  TOR.labels = {
    estadoOT: { pendiente: 'Pendiente', en_proceso: 'En proceso', control_calidad: 'Control de calidad', terminada: 'Terminada', entregada: 'Entregada', cancelada: 'Cancelada' },
    claseOT: { pendiente: '', en_proceso: 'info', control_calidad: 'accent', terminada: 'good', entregada: 'dark', cancelada: 'critical' },
    colorOT: { pendiente: 'var(--steel-400)', en_proceso: 'var(--series-1)', control_calidad: 'var(--series-2)', terminada: 'var(--good)', entregada: 'var(--steel-800)', cancelada: 'var(--critical)' },
    prioridad: { baja: 'Baja', normal: 'Normal', alta: 'Alta', urgente: 'Urgente' },
    clasePrioridad: { baja: 'plain', normal: 'plain', alta: 'warning', urgente: 'critical' },
    metodo: { efectivo: 'Efectivo', transferencia: 'Transferencia', qr: 'QR', tarjeta: 'Tarjeta', credito: 'Crédito', anticipo: 'Anticipo' },
    estadoVenta: { pagada: 'Pagada', pendiente: 'Por cobrar', anulada: 'Anulada' },
    claseVenta: { pagada: 'good', pendiente: 'warning', anulada: 'critical' },
    estadoCompra: { pendiente: 'Por recibir', recibida: 'Recibida', anulada: 'Anulada' },
    claseCompra: { pendiente: 'warning', recibida: 'good', anulada: 'critical' },
    estadoCot: { borrador: 'Borrador', enviada: 'Enviada', aprobada: 'Aprobada', convertida: 'Convertida en venta', rechazada: 'Rechazada', vencida: 'Vencida' },
    claseCot: { borrador: '', enviada: 'info', aprobada: 'good', convertida: 'dark', rechazada: 'critical', vencida: 'warning' },
    tipoProd: { materia: 'Materia prima', insumo: 'Insumo', herramienta: 'Herramienta', repuesto: 'Repuesto', servicio: 'Servicio' },
    origenMov: { inicial: 'Inventario inicial', compra: 'Compra', venta: 'Venta', ot: 'Orden de trabajo', transferencia: 'Transferencia', ajuste: 'Ajuste', anulacion: 'Anulación de venta' },
    permiso: { write: 'Edición', read: 'Lectura', none: 'Sin acceso' }
  };
  const L = TOR.labels;
  const badge = (text, cls) => `<span class="badge ${cls || ''}">${esc(text)}</span>`;

  const NAV = [
    { group: 'General', items: [['dashboard', 'Dashboard', 'dashboard']] },
    { group: 'Operación', items: [['ventas', 'Ventas', 'cart'], ['cotizaciones', 'Cotizaciones', 'quote'], ['ordenes', 'Órdenes de trabajo', 'wrench'], ['compras', 'Compras', 'truck'], ['inventario', 'Inventario', 'box'], ['caja', 'Caja', 'wallet']] },
    { group: 'Catálogos', items: [['productos', 'Productos', 'package'], ['clientes', 'Clientes', 'contact'], ['proveedores', 'Proveedores', 'briefcase'], ['sucursales', 'Sucursales', 'branches']] },
    { group: 'Análisis', items: [['reportes', 'Reportes', 'file']] },
    { group: 'Administración', items: [['usuarios', 'Usuarios', 'users'], ['configuracion', 'Configuración', 'settings']] }
  ];
  const ROUTES = Object.fromEntries(NAV.flatMap((g) => g.items.map(([id, label, ic]) => [id, { id, label, icon: ic, group: g.group }])));

  TOR.views = TOR.views || {};

  // ---------- Permisos ----------
  const perm = (mod) => { const u = S.me(); const r = S.rol(u.rol); return (r && r.permisos[mod]) || 'none'; };
  const can = (mod, level = 'write') => (level === 'write' ? perm(mod) === 'write' : perm(mod) !== 'none');
  const userBranches = () => { const u = S.me(); return u.sucursales.includes('*') ? S.db.sucursales.map((s) => s.id) : u.sucursales; };
  /** Botón de acción solo si el usuario tiene permiso de edición en el módulo. */
  function actionBtn(mod, html) { return can(mod) ? html : `<span class="readonly-note">${icon('lock', 'sm')}Solo lectura</span>`; }

  // ---------- Consultas comunes ----------
  const monthKey = (iso) => iso.slice(0, 7);
  function monthKeys(n) {
    const d = new Date(); d.setDate(1);
    const out = [];
    for (let i = n - 1; i >= 0; i--) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`); }
    return out;
  }
  const ventas = () => S.scoped(S.db.ventas).filter((v) => v.estado !== 'anulada');
  const compras = () => S.scoped(S.db.compras).filter((c) => c.estado !== 'anulada');
  const margenVenta = (v) => v.items.reduce((t, it) => t + (it.precio - it.costo) * it.cantidad, 0) - v.descuento;
  const sumBy = (list, f) => list.reduce((t, x) => t + f(x), 0);
  function rangeOf(key) {
    const now = new Date();
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    if (key === 'hoy') return [start, null];
    if (key === '7d') { start.setDate(start.getDate() - 6); return [start, null]; }
    if (key === 'mes') { start.setDate(1); return [start, null]; }
    if (key === 'mes_ant') { const a = new Date(now.getFullYear(), now.getMonth() - 1, 1); const b = new Date(now.getFullYear(), now.getMonth(), 1); return [a, b]; }
    if (key === '3m') { start.setMonth(start.getMonth() - 3); return [start, null]; }
    if (key === '6m') { start.setMonth(start.getMonth() - 6); return [start, null]; }
    return [null, null];
  }
  const inRange = (iso, key) => { const [a, b] = rangeOf(key); const d = new Date(iso.length <= 10 ? iso + 'T12:00:00' : iso); return (!a || d >= a) && (!b || d < b); };
  const PERIODOS = [['mes', 'Este mes'], ['mes_ant', 'Mes anterior'], ['7d', 'Últimos 7 días'], ['hoy', 'Hoy'], ['3m', 'Últimos 3 meses'], ['6m', 'Últimos 6 meses'], ['todo', 'Todo el historial']];
  const lowStock = () => {
    const out = [];
    S.db.sucursales.filter((s) => S.inScope(s.id)).forEach((s) => S.db.productos.filter((p) => p.tipo !== 'servicio' && p.activo).forEach((p) => {
      const q = S.stockOf(s.id, p.id); const min = S.minOf(p.id, s.id);
      if (q <= min) out.push({ producto: p, sucursal: s, cantidad: q, minimo: min });
    }));
    return out.sort((a, b) => a.cantidad / a.minimo - b.cantidad / b.minimo);
  };
  const otActivas = () => S.scoped(S.db.ordenes).filter((o) => !['entregada', 'cancelada'].includes(o.estado));
  const otAtrasada = (o) => !['terminada', 'entregada', 'cancelada'].includes(o.estado) && o.entrega < S.today();
  TOR.q = { monthKeys, monthKey, ventas, compras, margenVenta, sumBy, inRange, rangeOf, PERIODOS, lowStock, otActivas, otAtrasada };

  // ---------- Estado vacío ----------
  TOR.ui.emptyState = ({ icon: ic = 'search', title = 'Sin resultados', text = '' } = {}) => `<div class="empty">${icon(ic)}<b>${esc(title)}</b>${text ? `<span>${esc(text)}</span>` : ''}</div>`;

  // ---------- Shell ----------
  const $ = (id) => document.getElementById(id);
  let current = { route: 'dashboard', param: null };

  function renderSide() {
    const low = lowStock().length;
    const ots = otActivas().length;
    const counts = { inventario: low ? [low, 'warn'] : null, ordenes: ots ? [ots, ''] : null, cotizaciones: (() => { const n = S.scoped(S.db.cotizaciones).filter((c) => ['enviada', 'aprobada'].includes(c.estado)).length; return n ? [n, ''] : null; })() };
    $('sideNav').innerHTML = NAV.map((g) => `<div class="side-group"><small>${g.group}</small>${g.items.map(([id, label, ic]) => {
      const allowed = can(id, 'read');
      const c = counts[id];
      return `<a class="side-link ${current.route === id ? 'active' : ''}" href="#/${id}" ${allowed ? '' : 'aria-disabled="true" title="Sin acceso con el rol actual"'}>${icon(ic)}<span>${label}</span>${!allowed ? `<span class="lock">${icon('lock', 'sm')}</span>` : c ? `<span class="count ${c[1]}">${c[0]}</span>` : ''}</a>`;
    }).join('')}</div>`).join('');
    $('sideEmpresa').textContent = S.db.empresa.nombre;
    $('sideLogo').textContent = S.db.empresa.logoTexto || 'TD';
  }

  function renderBranchSelect() {
    const allowed = userBranches();
    const all = allowed.length === S.db.sucursales.length;
    if (!all && (S.ui.sucursal === '*' || !allowed.includes(S.ui.sucursal))) S.setUI({ sucursal: allowed[0] });
    $('branchSelect').innerHTML = (all ? '<option value="*">Todas las sucursales</option>' : '') + S.db.sucursales.filter((s) => allowed.includes(s.id)).map((s) => `<option value="${s.id}">${esc(s.nombre)}</option>`).join('');
    $('branchSelect').value = S.ui.sucursal;
  }

  function initials(name) { return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase(); }
  function renderUser() {
    const u = S.me();
    $('userName').textContent = u.nombre;
    $('userRole').textContent = S.rol(u.rol).nombre;
    $('userAvatar').textContent = initials(u.nombre);
    $('userPop').innerHTML = `<div class="pop-head">Cambiar de usuario <span class="badge info plain">Simulación</span></div>
      <div class="pop-body">Elija un usuario para ver cómo el sistema restringe módulos y sucursales según su rol.</div>
      ${S.db.usuarios.filter((x) => x.estado === 'activo').map((x) => `<button data-user="${x.id}" class="${x.id === u.id ? 'on' : ''}"><span class="avatar sm">${initials(x.nombre)}</span><span><b>${esc(x.nombre)}</b><small>${esc(S.rol(x.rol).nombre)} · ${x.sucursales.includes('*') ? 'Todas las sucursales' : x.sucursales.map((s) => S.suc(s).nombre).join(', ')}</small></span></button>`).join('')}`;
  }

  function systemAlerts() {
    const out = [];
    const low = lowStock();
    if (low.length) out.push({ titulo: `${low.length} productos con stock bajo`, texto: low.slice(0, 2).map((l) => `${l.producto.nombre} (${l.sucursal.nombre})`).join(' · '), tipo: 'warning', link: '#/inventario?f=bajo' });
    const atr = otActivas().filter(otAtrasada);
    if (atr.length) out.push({ titulo: `${atr.length} órdenes de trabajo atrasadas`, texto: atr.slice(0, 3).map((o) => o.codigo).join(', '), tipo: 'critical', link: '#/ordenes?f=atrasadas' });
    const hoy = otActivas().filter((o) => o.entrega === S.today());
    if (hoy.length) out.push({ titulo: `${hoy.length} entregas programadas para hoy`, texto: hoy.map((o) => o.codigo).join(', '), tipo: 'info', link: '#/ordenes' });
    const cxc = S.scoped(S.db.ventas).filter((v) => v.estado === 'pendiente');
    if (cxc.length) out.push({ titulo: `${cxc.length} ventas a crédito por cobrar`, texto: fmt.money(sumBy(cxc, (v) => v.total)), tipo: 'info', link: '#/caja?tab=cuentas' });
    return out;
  }
  function renderBell() {
    const evts = S.db.notificaciones;
    const unread = evts.filter((n) => !n.leida).length;
    const alerts = systemAlerts();
    $('bellCount').hidden = !(unread + alerts.length);
    $('bellCount').textContent = unread + alerts.length;
    const ico = { warning: 'alert', critical: 'alert', good: 'checkCircle', info: 'bell' };
    const item = (n, unreadFlag) => `<a class="notif ${unreadFlag ? 'unread' : ''}" href="${n.link || '#'}"><span class="ico ${n.tipo}">${icon(ico[n.tipo] || 'bell', 'sm')}</span><span><b>${esc(n.titulo)}</b><small>${esc(n.texto)}</small>${n.fecha ? `<small>${fmt.dateTime(n.fecha)}</small>` : ''}</span></a>`;
    $('notifPop').innerHTML = `<div class="pop-head">Notificaciones <button class="btn btn-ghost btn-sm" data-read>Marcar como leídas</button></div><div class="notif-list">
      ${alerts.map((a) => item(a, true)).join('')}${evts.map((n) => item(n, !n.leida)).join('')}
      ${!alerts.length && !evts.length ? TOR.ui.emptyState({ icon: 'bell', title: 'Sin notificaciones' }) : ''}</div>`;
  }

  // ---------- Búsqueda global ----------
  function search(q) {
    const t = q.trim().toLowerCase();
    const box = $('searchResults');
    if (t.length < 2) { box.hidden = true; return; }
    const has = (...f) => f.some((x) => String(x || '').toLowerCase().includes(t));
    const groups = [
      ['Productos', S.db.productos.filter((p) => has(p.nombre, p.sku)).slice(0, 5).map((p) => [`#/productos/${p.id}`, p.nombre, `${p.sku} · ${p.categoria}`, 'package'])],
      ['Clientes', S.db.clientes.filter((c) => has(c.nombre, c.nit, c.contacto)).slice(0, 4).map((c) => [`#/clientes/${c.id}`, c.nombre, `NIT/CI ${c.nit}`, 'contact'])],
      ['Órdenes de trabajo', S.db.ordenes.filter((o) => has(o.codigo, o.descripcion)).slice(0, 4).map((o) => [`#/ordenes/${o.id}`, `${o.codigo} · ${o.descripcion}`, L.estadoOT[o.estado], 'wrench'])],
      ['Ventas', S.db.ventas.filter((v) => has(v.codigo)).slice(0, 3).map((v) => [`#/ventas/${v.id}`, v.codigo, `${S.cli(v.cliente).nombre} · ${fmt.money(v.total)}`, 'cart'])],
      ['Compras', S.db.compras.filter((c) => has(c.codigo)).slice(0, 3).map((c) => [`#/compras/${c.id}`, c.codigo, `${S.prov(c.proveedor).nombre} · ${fmt.money(c.total)}`, 'truck'])],
      ['Cotizaciones', S.db.cotizaciones.filter((c) => has(c.codigo)).slice(0, 3).map((c) => [`#/cotizaciones/${c.id}`, c.codigo, `${S.cli(c.cliente).nombre} · ${fmt.money(c.total)}`, 'quote'])],
      ['Proveedores', S.db.proveedores.filter((p) => has(p.nombre, p.rubro)).slice(0, 3).map((p) => [`#/proveedores/${p.id}`, p.nombre, p.rubro, 'briefcase'])]
    ].filter((g) => g[1].length);
    box.innerHTML = groups.length ? groups.map(([g, rows]) => `<div class="grp">${g}</div>${rows.map(([href, a, b, ic]) => `<a href="${href}">${icon(ic, 'sm')}<span><b>${esc(a)}</b><small>${esc(b)}</small></span></a>`).join('')}`).join('') : `<div class="empty">Sin resultados para "${esc(q)}"</div>`;
    box.hidden = false;
  }

  // ---------- Rutas ----------
  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, query] = h.split('?');
    const [route, param] = path.split('/');
    return { route: ROUTES[route] ? route : 'dashboard', param: param ? decodeURIComponent(param) : null, query: Object.fromEntries(new URLSearchParams(query || '')) };
  }
  function render(keepScroll) {
    const r = ROUTES[current.route];
    $('pageTitle').textContent = r.label;
    $('crumbGroup').textContent = `${r.group} · ${S.ui.sucursal === '*' ? 'Todas las sucursales' : S.suc(S.ui.sucursal).nombre}`;
    document.title = `${r.label} · Prototipo Tornería (demo)`;
    renderSide();
    renderBell();
    const el = $('view');
    const y = window.scrollY;
    if (!keepScroll) { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; }
    if (!can(current.route, 'read')) {
      el.innerHTML = `<div class="card">${TOR.ui.emptyState({ icon: 'lock', title: 'Sin acceso a este módulo', text: `El rol "${S.rol(S.me().rol).nombre}" no tiene permiso para ${r.label}. Cambie de usuario desde el menú superior derecho.` })}</div>`;
    } else {
      const v = TOR.views[current.route];
      try { v.render(el, current); } catch (e) { console.error(e); el.innerHTML = `<div class="card">${TOR.ui.emptyState({ icon: 'alert', title: 'Error al mostrar la vista', text: e.message })}</div>`; }
    }
    TOR.hydrateIcons(el);
    if (keepScroll) window.scrollTo(0, y);
  }
  function go() {
    const prev = current.route;
    current = parseHash();
    closeSide();
    render(false);
    if (prev !== current.route) window.scrollTo(0, 0);
    const v = TOR.views[current.route];
    if (current.param && v && v.open && can(current.route, 'read')) setTimeout(() => v.open(current.param), 0);
  }
  const closeSide = () => { $('side').classList.remove('open'); $('sideBackdrop').classList.remove('open'); };

  /** Ejecuta una operación del store mostrando el error de negocio como notificación. */
  function run(fn, okMsg, okText) {
    try {
      const r = fn();
      if (okMsg) TOR.ui.toast(okMsg, { text: typeof okText === 'function' ? okText(r) : okText || '' });
      return r === undefined ? true : r;
    } catch (e) {
      TOR.ui.toast('No se pudo completar la operación', { text: e.message, type: 'critical', ms: 5200 });
      return null;
    }
  }

  function start() {
    TOR.hydrateIcons(document);
    renderBranchSelect();
    renderUser();
    window.addEventListener('hashchange', go);
    S.subscribe((evt) => {
      if (evt.type === 'reset' || evt.type === 'sync' || evt.type === 'usuario' || evt.type === 'rol' || evt.type === 'sucursal') { renderBranchSelect(); renderUser(); }
      render(true);
    });
    $('branchSelect').addEventListener('change', (e) => S.setUI({ sucursal: e.target.value }));
    $('menuBtn').addEventListener('click', () => { $('side').classList.add('open'); $('sideBackdrop').classList.add('open'); });
    $('sideBackdrop').addEventListener('click', closeSide);
    $('sideNav').addEventListener('click', (e) => { const a = e.target.closest('a[aria-disabled]'); if (a) { e.preventDefault(); TOR.ui.toast('Sin acceso', { text: 'El rol actual no puede abrir este módulo.', type: 'warning' }); } });
    $('resetBtn').addEventListener('click', () => {
      TOR.ui.modal({ title: 'Restablecer datos de demostración', size: 'narrow', body: '<p>Se eliminarán los registros creados durante la demostración y se volverán a generar los datos de ejemplo.</p>', foot: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-danger" id="doReset">Restablecer</button>', onOpen: (el, close) => el.querySelector('#doReset').addEventListener('click', () => { S.ops.reset(); S.setUI({ usuario: 'U1', sucursal: '*' }); close(); TOR.ui.toast('Datos restablecidos'); }) });
    });

    const toggle = (btn, pop, onOpen) => {
      $(btn).addEventListener('click', (e) => { e.stopPropagation(); const open = $(pop).hidden; document.querySelectorAll('.popover').forEach((p) => { p.hidden = true; }); $(pop).hidden = !open; if (open && onOpen) onOpen(); });
    };
    toggle('bellBtn', 'notifPop');
    toggle('userBtn', 'userPop');
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.pop-wrap')) document.querySelectorAll('.popover').forEach((p) => { p.hidden = true; });
      if (e.target.closest('#notifPop a')) $('notifPop').hidden = true;
      if (!e.target.closest('.search-global')) $('searchResults').hidden = true;
    });
    $('notifPop').addEventListener('click', (e) => { if (e.target.closest('[data-read]')) { e.stopPropagation(); S.ops.markNotificationsRead(); } });
    $('userPop').addEventListener('click', (e) => {
      const b = e.target.closest('[data-user]');
      if (!b) return;
      const u = S.user(b.dataset.user);
      S.setUI({ usuario: u.id, sucursal: u.sucursales.includes('*') ? '*' : u.sucursales[0] });
      renderBranchSelect(); renderUser();
      $('userPop').hidden = true;
      TOR.ui.toast(`Sesión simulada: ${u.nombre}`, { text: `Rol ${S.rol(u.rol).nombre}` });
      if (!can(current.route, 'read')) location.hash = `#/${Object.keys(ROUTES).find((r) => can(r, 'read')) || 'dashboard'}`;
      else render(false);
    });
    const gs = $('globalSearch');
    gs.addEventListener('input', () => search(gs.value));
    gs.addEventListener('focus', () => search(gs.value));
    gs.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const a = $('searchResults').querySelector('a'); if (a) { location.hash = a.getAttribute('href'); gs.value = ''; $('searchResults').hidden = true; } } if (e.key === 'Escape') { $('searchResults').hidden = true; gs.blur(); } });
    $('searchResults').addEventListener('click', (e) => { if (e.target.closest('a')) { gs.value = ''; $('searchResults').hidden = true; } });
    document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); gs.focus(); } });
    go();
  }

  TOR.app = { start, render: () => render(true), can, perm, actionBtn, badge, userBranches, run, ROUTES, initials, current: () => current };
})(window);
