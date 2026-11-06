/*
 * CorePoints · admin.js
 * Panel administrativo: dashboard, compras, canjes, clientes, vendedoras,
 * recompensas, movimientos, notificaciones y configuración.
 */
(function () {
  'use strict';
  const CP = window.CP;
  const u = CP.util, ui = CP.ui, esc = u.esc, I = ui.icon;
  const $ = ui.$, $$ = ui.$$;
  const view = document.getElementById('view');
  const db = () => CP.store.db;
  const LOGO = '../assets/images/catcore-logo.png';
  const PAGE = 15;

  const F = {
    compras: { status: 'pendiente', q: '', seller: '', from: '', to: '', page: 1 },
    canjes: { status: '', q: '', page: 1 },
    clientes: { q: '', sort: 'recent', page: 1 },
    recompensas: { q: '', cat: '', status: '' },
    movimientos: { q: '', type: '', page: 1 },
    notificaciones: { event: '', q: '', page: 1 }
  };

  const SECTIONS = {
    dashboard: { title: 'Dashboard', sub: 'Resumen del programa CorePoints', icon: 'grid', render: renderDashboard },
    compras: { title: 'Compras', sub: 'Verificación de boletas y acreditación de puntos', icon: 'receipt', render: renderPurchases },
    canjes: { title: 'Canjes', sub: 'Solicitudes de recompensas', icon: 'gift', render: renderRedemptions },
    clientes: { title: 'Clientes', sub: 'Cuentas CorePoints', icon: 'users', render: renderCustomers },
    vendedoras: { title: 'Vendedoras', sub: 'Ventas asociadas y seguimiento', icon: 'award', render: renderSellers },
    recompensas: { title: 'Recompensas', sub: 'Catálogo de canje (independiente de WooCommerce)', icon: 'package', render: renderRewards },
    movimientos: { title: 'Movimientos', sub: 'Historial auditable de puntos', icon: 'history', render: renderMovements },
    notificaciones: { title: 'Notificaciones', sub: 'Centro de notificaciones simulado', icon: 'bell', render: renderNotifications },
    configuracion: { title: 'Configuración', sub: 'Reglas del programa y herramientas de demostración', icon: 'settings', render: renderSettings }
  };

  /* ---------------- utilidades ---------------- */
  /** Ejecuta una operación transaccional, muestra el resultado y refresca la vista. */
  function act(fn, okMsg) {
    const r = ui.safe(() => CP.store.tx(fn), okMsg);
    if (r !== undefined) render();
    return r;
  }
  const custName = (id) => (CP.customers.get(db(), id) || { name: '—' }).name;
  const custCell = (c) => c ? '<div class="cell-user">' + ui.avatar(c.name) + '<div><b>' + esc(c.name) + '</b><small>' + u.fmtPhone(c.phone) + (c.nameProvided === false ? ' · <span class="text-warn">sin nombre</span>' : '') + '</small></div></div>' : '—';
  const ptsCell = (n) => '<span class="' + (n > 0 ? 'pts-plus' : n < 0 ? 'pts-minus' : 'pts-zero') + '">' + (n > 0 ? '+' : n < 0 ? '−' : '') + u.num(Math.abs(n)) + '</span>';
  const match = (q, ...fields) => !q || fields.join(' ').toLowerCase().includes(q.toLowerCase().trim());
  const qDigits = (q) => q.replace(/\D/g, '');

  function paginate(list, key) {
    const f = F[key];
    const pages = Math.max(1, Math.ceil(list.length / PAGE));
    if (f.page > pages) f.page = pages;
    return { rows: list.slice((f.page - 1) * PAGE, f.page * PAGE), pages, total: list.length };
  }
  function pager(p, key) {
    if (p.pages <= 1) return '<div class="pager"><span>' + p.total + ' registro(s)</span></div>';
    const f = F[key];
    return '<div class="pager"><span>' + ((f.page - 1) * PAGE + 1) + '–' + Math.min(f.page * PAGE, p.total) + ' de ' + p.total + '</span><span style="display:flex;gap:6px">' +
      '<button class="btn btn-sm btn-ghost" data-page="' + (f.page - 1) + '"' + (f.page <= 1 ? ' disabled' : '') + '>' + I('left') + '</button>' +
      '<span class="pill">' + f.page + ' / ' + p.pages + '</span>' +
      '<button class="btn btn-sm btn-ghost" data-page="' + (f.page + 1) + '"' + (f.page >= p.pages ? ' disabled' : '') + '>' + I('right') + '</button></span></div>';
  }
  function bindPager(key) { $$('[data-page]', view).forEach((b) => (b.onclick = () => { F[key].page = +b.dataset.page; render(); })); }
  function bindSearch(id, key, prop) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', u.debounce(() => { F[key][prop] = el.value; F[key].page = 1; render(); const n = document.getElementById(id); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250));
  }
  function bindSelect(id, key, prop) {
    const el = document.getElementById(id);
    if (el) el.onchange = () => { F[key][prop] = el.value; F[key].page = 1; render(); };
  }

  /* ---------------- shell ---------------- */
  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const [name, query] = h.split('?');
    return { name: SECTIONS[name] ? name : 'dashboard', params: new URLSearchParams(query || '') };
  }

  function renderShell(name) {
    const d = db();
    const pendP = d.purchases.filter((p) => p.status === 'pendiente').length;
    const pendR = d.redemptions.filter((r) => r.status === 'pendiente').length;
    const unread = d.notifications.filter((n) => !n.read).length;
    const item = (k, extra) => '<a href="#/' + k + '" class="' + (k === name ? 'on' : '') + '">' + I(SECTIONS[k].icon) + SECTIONS[k].title + (extra || '') + '</a>';
    $('#sideNav').innerHTML =
      '<div class="side-group">General</div>' + item('dashboard') +
      '<div class="side-group">Operación</div>' + item('compras', pendP ? '<span class="count warn">' + pendP + '</span>' : '') + item('canjes', pendR ? '<span class="count">' + pendR + '</span>' : '') +
      '<div class="side-group">Gestión</div>' + item('clientes') + item('vendedoras') + item('recompensas') +
      '<div class="side-group">Control</div>' + item('movimientos') + item('notificaciones') + item('configuracion');
    $('#pageTitle').textContent = SECTIONS[name].title;
    $('#pageSub').textContent = SECTIONS[name].sub;
    const off = Number(d.meta.clockOffsetDays) || 0;
    const pill = $('#clockPill');
    pill.className = 'clock-pill' + (off ? ' sim' : '');
    pill.innerHTML = I('calendar') + '<span class="lbl">' + (off ? 'Fecha simulada: ' : 'Hoy: ') + '</span>' + u.date(CP.now()) + (off ? ' (+' + off + ' d)' : '');
    pill.title = off ? 'El reloj de demostración está adelantado ' + off + ' días. Puede restablecerlo en Configuración.' : 'Fecha actual';
    $('#bellBtn').innerHTML = I('bell') + (unread ? '<span class="dot"></span>' : '');
    document.title = SECTIONS[name].title + ' · Panel CorePoints';
  }

  let lastRoute = null;
  function render() {
    const r = route();
    renderShell(r.name);
    SECTIONS[r.name].render(r.params);
    ui.hydrate(view);
    if (lastRoute !== r.name) { window.scrollTo(0, 0); lastRoute = r.name; }
  }

  /* =========================================================
     DASHBOARD
     ========================================================= */
  function renderDashboard() {
    const d = db();
    const now = CP.now();
    const t = CP.points.totals(d, now);
    const ps = d.purchases;
    const approved = ps.filter((p) => p.status === 'aprobada');
    const pending = ps.filter((p) => p.status === 'pendiente').sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const redPend = d.redemptions.filter((r) => r.status === 'pendiente').sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const validated = approved.reduce((a, p) => a + p.validatedAmount, 0);
    const months = ui.months(12, now).map((m) => ({ key: m.key, label: m.label, value: 0, pts: 0, red: 0 }));
    approved.forEach((p) => { const r = months.find((m) => m.key === ui.monthKey(p.reviewedAt)); if (r) { r.value += p.validatedAmount; r.pts += p.points + (p.bonus || 0); } });
    d.movements.filter((m) => m.type === 'canje').forEach((m) => { const r = months.find((x) => x.key === ui.monthKey(m.at)); if (r) r.red += m.amount; });
    const sellers = d.sellers.map((s) => Object.assign({ s }, CP.sellers.stats(d, s.id))).sort((a, b) => b.amount - a.amount);
    // Lotes que vencen pronto (agrupados por cliente)
    const warnLimit = u.addDays(now, d.config.expiryWarnDays);
    const soon = {};
    d.lots.filter((l) => l.remaining > 0 && new Date(l.expiresAt) > now && new Date(l.expiresAt) <= warnLimit).forEach((l) => {
      const x = soon[l.customerId] || (soon[l.customerId] = { pts: 0, date: l.expiresAt });
      x.pts += l.remaining; if (l.expiresAt < x.date) x.date = l.expiresAt;
    });
    const expiredPending = d.lots.filter((l) => l.remaining > 0 && new Date(l.expiresAt) <= now);
    const recent = d.movements.slice().sort(u.byDateDesc('at')).slice(0, 7);

    const tile = (ic, label, value, sub, cls, go) => '<div class="tile ' + (cls || '') + '"' + (go ? ' data-go="' + go + '"' : '') + '><div class="t-top"><span>' + label + '</span><span class="t-ic">' + I(ic) + '</span></div><b>' + value + '</b><small>' + sub + '</small></div>';
    view.innerHTML = '<div class="view">' +
      (expiredPending.length ? '<div class="alert alert-warn" style="margin-bottom:16px">' + I('clock') + '<p><b>' + expiredPending.length + ' acreditación(es) vencida(s) sin procesar</b> (' + u.num(expiredPending.reduce((a, l) => a + l.remaining, 0)) + ' pts). Ya no cuentan en el saldo de los clientes; ejecute el proceso para registrarlas en el historial y notificar. <button class="link-btn" id="runExp">Ejecutar vencimientos →</button></p></div>' : '') +
      '<div class="kpi-grid">' +
      tile('users', 'Clientes registrados', u.num(d.customers.length), d.customers.filter((c) => u.daysUntil(c.createdAt, now) > -30).length + ' nuevos en 30 días', '', 'clientes') +
      tile('receipt', 'Compras registradas', u.num(ps.length), ps.filter((p) => p.status === 'rechazada').length + ' rechazadas', 'violet', 'compras?estado=') +
      tile('clock', 'Compras pendientes', u.num(pending.length), pending.length ? 'Más antigua: ' + u.relDays(pending[0].createdAt, now) : 'Todo al día', 'warn' + (pending.length ? ' hl' : ''), 'compras?estado=pendiente') +
      tile('check', 'Compras aprobadas', u.num(approved.length), Math.round((approved.length / Math.max(1, ps.length - pending.length)) * 100) + '% de las revisadas', 'ok', 'compras?estado=aprobada') +
      tile('chart', 'Monto validado', u.bsShort(validated), 'Ticket promedio ' + u.bsShort(validated / Math.max(1, approved.length)), '', 'vendedoras') +
      tile('coins', 'CorePoints otorgados', u.num(t.granted), 'Compras + bonos' + (t.adjustments ? ' · ' + u.num(t.adjustments) + ' por ajustes' : ''), 'ok', 'movimientos') +
      tile('zap', 'CorePoints disponibles', u.num(t.available), u.num(t.reserved) + ' reservados en canjes', '', 'clientes') +
      tile('gift', 'CorePoints canjeados', u.num(t.redeemed), d.redemptions.filter((r) => ['aprobado', 'listo', 'entregado'].includes(r.status)).length + ' canjes aprobados', 'pink', 'canjes') +
      tile('alert', 'CorePoints vencidos', u.num(t.expired), expiredPending.length ? expiredPending.length + ' lote(s) por procesar' : 'Procesados al día', 'bad', 'movimientos?tipo=vencimiento') +
      tile('store', 'Canjes pendientes', u.num(redPend.length), redPend.length ? u.num(redPend.reduce((a, r) => a + r.points, 0)) + ' pts reservados' : 'Sin pendientes', 'pink' + (redPend.length ? ' hl' : ''), 'canjes?estado=pendiente') +
      '</div>' +
      '<div class="dash-grid">' +
      '<div class="card span-8"><div class="card-head"><h3>' + I('chart') + 'Compras validadas por mes</h3><span class="muted" style="font-size:.82rem">Últimos 12 meses · Bs</span></div>' + ui.barChart(months, { format: u.bsShort, height: 230, title: 'Compras validadas por mes' }) + '</div>' +
      '<div class="card span-4"><div class="card-head"><h3>' + I('coins') + 'Estado de los puntos</h3></div>' + ui.donut([
        { label: 'Disponibles', value: t.available, cls: 'c-cyan' }, { label: 'Reservados', value: t.reserved, cls: 'c-warn' },
        { label: 'Canjeados', value: t.redeemed, cls: 'c-pink' }, { label: 'Vencidos', value: t.expired, cls: 'c-bad' }
      ], { centerLabel: 'pts', title: 'Estado de los puntos' }) + '</div>' +
      '<div class="card span-7"><div class="card-head"><h3>' + I('zap') + 'Puntos otorgados vs. canjeados</h3></div>' + ui.barChart(months.map((m) => ({ label: m.label, value: m.pts, value2: m.red })), { series: [{ key: 'value', cls: 'b1', label: 'Otorgados' }, { key: 'value2', cls: 'b2', label: 'Canjeados' }], height: 200, title: 'Puntos por mes' }) + '</div>' +
      '<div class="card span-5"><div class="card-head"><h3>' + I('award') + 'Ventas validadas por vendedora</h3><a href="#/vendedoras" class="btn btn-sm btn-ghost">Ver</a></div>' + ui.hbars(sellers.map((x) => ({ label: x.s.name, value: x.amount, sub: x.approved + ' ventas verificadas · ticket ' + u.bsShort(x.avgTicket) })), { format: u.bsShort }) + '</div>' +
      '<div class="card span-6"><div class="card-head"><h3>' + I('clock') + 'Compras por verificar</h3><a href="#/compras?estado=pendiente" class="btn btn-sm btn-ghost">Ver todas</a></div>' +
      (pending.length ? '<ul class="mini-list">' + pending.slice(0, 5).map((p) => '<li>' + ui.avatar(custName(p.customerId)) + '<div><b>' + esc(custName(p.customerId)) + '</b><small>' + p.id + ' · ' + (p.chatImg ? 'boleta + chat' : 'foto de boleta') + ' · enviada ' + u.relDays(p.createdAt, now) + '</small></div><button class="btn btn-sm btn-primary" data-review="' + p.id + '">Revisar</button></li>').join('') + '</ul>' : ui.empty('check', 'No hay compras pendientes')) + '</div>' +
      '<div class="card span-6"><div class="card-head"><h3>' + I('gift') + 'Canjes por atender</h3><a href="#/canjes?estado=pendiente" class="btn btn-sm btn-ghost">Ver todos</a></div>' +
      (redPend.length ? '<ul class="mini-list">' + redPend.slice(0, 5).map((r) => '<li>' + ui.avatar(custName(r.customerId)) + '<div><b>' + esc(r.rewardName) + '</b><small>' + esc(custName(r.customerId)) + ' · ' + u.num(r.points) + ' pts · ' + r.code + '</small></div><button class="btn btn-sm btn-primary" data-red="' + r.id + '">Atender</button></li>').join('') + '</ul>' : ui.empty('check', 'No hay canjes pendientes')) + '</div>' +
      '<div class="card span-6"><div class="card-head"><h3>' + I('alert') + 'Puntos próximos a vencer</h3><span class="muted" style="font-size:.8rem">' + d.config.expiryWarnDays + ' días</span></div>' +
      (Object.keys(soon).length ? '<ul class="mini-list">' + Object.keys(soon).sort((a, b) => soon[a].date.localeCompare(soon[b].date)).map((cid) => '<li>' + ui.avatar(custName(cid)) + '<div><b>' + esc(custName(cid)) + '</b><small>Vence ' + u.date(soon[cid].date) + ' (' + u.relDays(soon[cid].date, now) + ')</small></div><b class="text-warn">' + u.num(soon[cid].pts) + ' pts</b><button class="icon-btn" data-cust="' + cid + '" title="Ver ficha">' + I('eye') + '</button></li>').join('') + '</ul>' : ui.empty('clock', 'Sin vencimientos próximos')) + '</div>' +
      '<div class="card span-6"><div class="card-head"><h3>' + I('history') + 'Actividad reciente</h3><a href="#/movimientos" class="btn btn-sm btn-ghost">Historial</a></div>' +
      '<ul class="mini-list">' + recent.map((m) => { const mt = CP.points.MOVEMENT_TYPES[m.type]; return '<li>' + ui.avatar(custName(m.customerId)) + '<div><b>' + esc(custName(m.customerId)) + '</b><small>' + mt.label + ' · ' + u.dateTime(m.at) + '</small></div>' + (m.type === 'canje' ? '<span class="pts-zero">' + u.num(m.amount) + '</span>' : ptsCell(m.points)) + '</li>'; }).join('') + '</ul></div>' +
      '</div></div>';

    $$('[data-go]', view).forEach((t) => (t.onclick = () => { location.hash = '#/' + t.dataset.go; }));
    $$('[data-review]', view).forEach((b) => (b.onclick = () => purchaseDetail(b.dataset.review)));
    $$('[data-red]', view).forEach((b) => (b.onclick = () => redemptionDetail(b.dataset.red)));
    $$('[data-cust]', view).forEach((b) => (b.onclick = () => customerDetail(b.dataset.cust)));
    const re = $('#runExp'); if (re) re.onclick = runExpiry;
  }

  /* =========================================================
     COMPRAS
     ========================================================= */
  function renderPurchases(params) {
    const d = db();
    const f = F.compras;
    if (params.has('estado')) { f.status = params.get('estado'); f.page = 1; history.replaceState(null, '', '#/compras'); }
    const counts = { '': d.purchases.length };
    Object.keys(CP.purchases.STATUS).forEach((s) => (counts[s] = d.purchases.filter((p) => p.status === s).length));
    let list = d.purchases.filter((p) => {
      const c = CP.customers.get(d, p.customerId) || {};
      if (f.status && p.status !== f.status) return false;
      if (f.seller && (p.validatedSellerId || p.sellerId) !== f.seller) return false;
      if (f.from && p.date < f.from) return false;
      if (f.to && p.date > f.to) return false;
      const q = f.q.trim();
      if (q && !(match(q, p.id, p.receiptNo, c.name, p.product) || (qDigits(q).length >= 3 && c.phone.includes(qDigits(q))))) return false;
      return true;
    });
    list.sort(f.status === 'pendiente' ? (a, b) => new Date(a.createdAt) - new Date(b.createdAt) : u.byDateDesc('createdAt'));
    const pg = paginate(list, 'compras');
    const st = [['pendiente', 'Pendientes'], ['aprobada', 'Aprobadas'], ['rechazada', 'Rechazadas'], ['', 'Todas']];
    view.innerHTML = '<div class="view"><div class="page-actions"><div class="status-tabs">' + st.map((s) => '<button class="chip' + (f.status === s[0] ? ' on' : '') + '" data-st="' + s[0] + '">' + s[1] + ' <span class="count">' + counts[s[0]] + '</span></button>').join('') + '</div>' +
      '<button class="btn btn-sm btn-ghost" id="exportP">' + I('download') + 'Exportar CSV</button></div>' +
      '<div class="toolbar"><div class="search">' + I('search') + '<input id="qP" type="search" placeholder="Buscar por ID, boleta, cliente, WhatsApp o producto…" value="' + esc(f.q) + '"></div>' +
      '<select id="sP"><option value="">Todas las vendedoras</option>' + d.sellers.map((s) => '<option value="' + s.id + '"' + (f.seller === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>').join('') + '</select>' +
      '<input type="date" id="fromP" value="' + f.from + '" title="Compra desde"><input type="date" id="toP" value="' + f.to + '" title="Compra hasta">' +
      (f.q || f.seller || f.from || f.to ? '<button class="btn btn-sm btn-ghost" id="clrP">' + I('x') + 'Limpiar</button>' : '') + '</div>' +
      (pg.total ? '<div class="table-wrap stack"><table class="table"><thead><tr><th>Solicitud</th><th>Cliente</th><th>Boleta</th><th>Fecha compra</th><th class="num">Monto</th><th>Vendedora</th><th class="num">Puntos</th><th>Estado</th><th></th></tr></thead><tbody>' +
        pg.rows.map((p) => {
          const c = CP.customers.get(d, p.customerId);
          const pl = CP.purchases.pointsLabel(d, p);
          return '<tr class="clickable" data-open="' + p.id + '"><td data-l="Solicitud"><b class="mono">' + p.id + '</b><br><small class="muted">' + u.relDays(p.createdAt) + '</small></td><td data-l="Cliente">' + custCell(c) + '</td><td data-l="Boleta" class="mono">' + (p.receiptNo ? esc(p.receiptNo) : '<span class="muted">' + CP.purchases.receiptLabel(p) + '</span>') + '</td>' +
            '<td data-l="Fecha compra">' + (p.date ? u.date(u.fromIsoDay(p.date)) : '<span class="muted">—</span>') + '</td><td data-l="Monto" class="num">' + (p.validatedAmount ? u.bs(p.validatedAmount) : '<span class="muted">—</span>') + '</td><td data-l="Vendedora">' + (p.validatedSellerId ? esc(CP.sellers.name(d, p.validatedSellerId)) : '<span class="muted">—</span>') + '</td>' +
            '<td data-l="Puntos" class="num">' + (p.status === 'rechazada' ? '<span class="muted">0</span>' : pl.estimated ? '<span class="est">al verificar</span>' : '<span class="pts-plus">+' + u.num(pl.value) + '</span>') + '</td>' +
            '<td data-l="Estado">' + ui.purchaseBadge(p.status) + '</td><td class="actions"><button class="btn btn-sm ' + (p.status === 'pendiente' ? 'btn-primary' : 'btn-ghost') + '" data-open="' + p.id + '">' + (p.status === 'pendiente' ? 'Revisar' : 'Ver') + '</button></td></tr>';
        }).join('') + '</tbody></table></div>' + pager(pg, 'compras')
        : '<div class="card">' + ui.empty('receipt', f.status === 'pendiente' && !f.q ? 'No hay compras pendientes de verificación' : 'Sin resultados', 'Ajuste los filtros de búsqueda.') + '</div>') + '</div>';

    $$('[data-st]', view).forEach((b) => (b.onclick = () => { f.status = b.dataset.st; f.page = 1; render(); }));
    bindSearch('qP', 'compras', 'q'); bindSelect('sP', 'compras', 'seller'); bindSelect('fromP', 'compras', 'from'); bindSelect('toP', 'compras', 'to');
    const clr = $('#clrP'); if (clr) clr.onclick = () => { Object.assign(f, { q: '', seller: '', from: '', to: '', page: 1 }); render(); };
    $$('tr[data-open]', view).forEach((tr) => (tr.onclick = () => purchaseDetail(tr.dataset.open)));
    bindPager('compras');
    $('#exportP').onclick = () => exportCsv('compras-corepoints.csv', ['ID', 'Cliente', 'WhatsApp', 'Boleta', 'Fecha', 'Monto declarado', 'Monto validado', 'Vendedora', 'Puntos', 'Bono', 'Estado', 'Motivo rechazo', 'Registrada'],
      list.map((p) => { const c = CP.customers.get(d, p.customerId); return [p.id, c.name, '+' + c.phone, p.receiptNo || '', p.date || '', p.validatedAmount || '', p.validatedSellerId ? CP.sellers.name(d, p.validatedSellerId) : '', p.points || 0, p.bonus || 0, p.status, p.rejectReason || '', p.createdAt]; }));
  }

  function purchaseDetail(id) {
    const d = db();
    const p = CP.purchases.get(d, id);
    if (!p) return ui.toast('Compra no encontrada', 'error');
    const c = CP.customers.get(d, p.customerId);
    const imgs = [['receiptImg', 'Boleta', 'boleta-' + (p.receiptNo || p.id)], ['chatImg', 'Chat de WhatsApp', 'chat-' + p.id]].filter((k) => p[k[0]]).map((k) => ({ id: p[k[0]], label: k[1], filename: k[2] + '.jpg' }));
    const others = d.purchases.filter((x) => x.customerId === p.customerId && x.id !== p.id);
    const sellerOpts = d.sellers.filter((s) => s.active).map((s) => ({ value: s.id, label: s.name + ' · ' + s.code }));
    const pending = p.status === 'pendiente';
    const body = '<div class="review"><div class="review-gallery">' +
      (imgs.length ? '<div class="review-main" id="rvMain"><img alt="Imagen de la compra"><div class="zoom-hint"><button class="btn btn-sm btn-ghost" id="rvZoom">' + I('zoom') + 'Ampliar</button><button class="btn btn-sm btn-ghost" id="rvDl">' + I('download') + 'Descargar</button></div></div>' +
        '<div class="review-thumbs">' + imgs.map((im, i) => '<button data-i="' + i + '"' + (i === 0 ? ' class="on"' : '') + '>' + ui.img(im.id, im.label) + '<span>' + esc(im.label.split(' ')[0]) + '</span></button>').join('') + '</div>' +
        '<small class="muted">Haga clic en la imagen para ampliarla. Con la rueda del mouse o los botones +/− puede hacer zoom.</small>'
        : ui.empty('image', 'Sin imágenes', 'Esta compra no tiene fotografías.')) + '</div>' +
      '<div class="review-info">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">' + ui.purchaseBadge(p.status) + '<small class="muted">Registrada ' + u.dateTime(p.createdAt) + '</small></div>' +
      '<div class="review-box"><h4>' + I('user') + 'Cliente</h4><div class="cell-user" style="margin-bottom:10px">' + ui.avatar(c.name) + '<div><b>' + esc(c.name) + '</b><small>' + u.fmtPhone(c.phone) + (c.email ? ' · ' + esc(c.email) : '') + '</small></div><button class="btn btn-sm btn-ghost" style="margin-left:auto" id="rvCust">Ficha</button></div>' +
      '<dl class="kv"><dt>Compras del cliente</dt><dd>' + (others.length + 1) + ' (' + others.filter((x) => x.status === 'aprobada').length + ' aprobadas antes)</dd><dt>Saldo disponible</dt><dd>' + u.num(CP.points.available(d, c.id)) + ' pts</dd>' +
      (c.nameProvided === false ? '<dt>Nombre</dt><dd class="diff">Provisional · complételo en la ficha</dd>' : '') + '</dl></div>' +
      (pending ? '<div class="review-box approve-box"><h4>' + I('shield') + 'Verificación · datos de la boleta</h4><p class="muted" style="font-size:.84rem;margin:-4px 0 12px">El cliente solo envió la foto. Transcriba los datos de la boleta para acreditar los puntos.</p><form id="apForm" class="form-grid" novalidate>' +
        ui.field({ name: 'receiptNo', label: 'Número de boleta', required: true, placeholder: 'Ej. NV-004512' }) +
        ui.field({ name: 'date', label: 'Fecha de la boleta', type: 'date', required: true, max: u.isoDay(CP.now()) }) +
        ui.field({ name: 'validatedAmount', label: 'Monto total', type: 'number', prefix: 'Bs', step: '0.01', min: 0, required: true, placeholder: '0,00' }) +
        ui.field({ name: 'sellerId', label: 'Vendedora que vendió', type: 'select', options: sellerOpts, placeholder: 'Seleccione…', required: true }) +
        ui.field({ name: 'product', label: 'Producto o combo', optional: true, wide: true, placeholder: 'Ej. Laptop HP Victus 15' }) +
        ui.field({ name: 'note', label: 'Observación interna', optional: true, type: 'textarea', rows: 2, wide: true, placeholder: 'Ej. Boleta legible, datos verificados.' }) +
        '</form><div class="calc-preview" id="apCalc"></div>' +
        '<div class="review-actions"><button class="btn btn-ok" id="apGo">' + I('check') + 'Aprobar y acreditar</button><button class="btn btn-danger-ghost" id="rjGo">' + I('x') + 'Rechazar</button></div></div>'
        : p.status === 'aprobada' ? '<div class="review-box approve-box"><h4>' + I('check') + 'Acreditación</h4><dl class="kv"><dt>Boleta</dt><dd class="mono">' + esc(p.receiptNo) + '</dd><dt>Fecha de la boleta</dt><dd>' + u.date(u.fromIsoDay(p.date)) + '</dd>' + (p.product ? '<dt>Producto</dt><dd>' + esc(p.product) + '</dd>' : '') + '<dt>Monto validado</dt><dd>' + u.bs(p.validatedAmount) + '</dd><dt>Vendedora</dt><dd>' + esc(CP.sellers.name(d, p.validatedSellerId)) + '</dd>' +
          '<dt>Puntos acreditados</dt><dd class="text-ok">' + u.num(p.points) + (p.bonus ? ' + ' + p.bonus + ' bono' : '') + '</dd><dt>Regla aplicada</dt><dd>Bs ' + p.rule.bsPerPoint + ' = 1 pt · ' + p.rule.validityMonths + ' meses</dd><dt>Acreditado</dt><dd>' + u.dateTime(p.creditedAt) + '</dd><dt>Vence</dt><dd>' + u.date(p.expiresAt) + '</dd><dt>Revisó</dt><dd>' + esc(p.reviewedBy) + '</dd></dl></div>'
          : '<div class="review-box" style="border-color:rgba(255,107,129,.35)"><h4>' + I('x') + 'Rechazo</h4><dl class="kv"><dt>Motivo</dt><dd>' + esc(p.rejectReason) + '</dd>' + (p.receiptNo ? '<dt>Boleta</dt><dd class="mono">' + esc(p.receiptNo) + '</dd>' : '') + (p.adminNotes ? '<dt>Observaciones</dt><dd style="font-weight:400">' + esc(p.adminNotes) + '</dd>' : '') + '<dt>Fecha</dt><dd>' + u.dateTime(p.reviewedAt) + '</dd><dt>Revisó</dt><dd>' + esc(p.reviewedBy) + '</dd></dl></div>') +
      '<div class="review-box"><h4>' + I('history') + 'Historial</h4>' + ui.timeline(p.history, (s) => ({ label: CP.purchases.STATUS[s].label, tone: CP.purchases.STATUS[s].tone })) + '</div>' +
      '</div></div>';
    const m = ui.modal({ title: 'Compra ' + p.id, subtitle: esc(c.name) + (p.receiptNo ? ' · Boleta ' + esc(p.receiptNo) : ' · enviada ' + u.relDays(p.createdAt)), icon: 'receipt', size: 'xl', body });
    ui.hydrate(m.body);

    let cur = 0;
    const main = m.body.querySelector('#rvMain');
    const showImg = (i) => { cur = i; CP.images.url(imgs[i].id).then((url) => { if (main) main.querySelector('img').src = url || ''; }); $$('.review-thumbs button', m.body).forEach((b, k) => b.classList.toggle('on', k === i)); };
    if (main) {
      showImg(0);
      main.addEventListener('click', (e) => { if (!e.target.closest('button')) ui.viewer(imgs, cur); });
      m.body.querySelector('#rvZoom').onclick = (e) => { e.stopPropagation(); ui.viewer(imgs, cur); };
      m.body.querySelector('#rvDl').onclick = (e) => { e.stopPropagation(); CP.images.download(imgs[cur].id, imgs[cur].filename).catch((er) => ui.toast(er.message, 'error')); };
      $$('.review-thumbs button', m.body).forEach((b) => (b.onclick = () => showImg(+b.dataset.i)));
    }
    m.body.querySelector('#rvCust').onclick = () => customerDetail(c.id);
    if (!pending) return;
    const form = m.body.querySelector('#apForm');
    const upd = () => {
      const v = ui.formValues(form);
      const pr = CP.purchases.preview(db(), id, v.validatedAmount);
      m.body.querySelector('#apCalc').innerHTML = Number(v.validatedAmount) > 0
        ? '<div><small>Se acreditarán</small><br><b>' + u.num(pr.total) + ' pts</b></div><small style="text-align:right">' + u.num(pr.base) + ' por compra (Bs ' + db().config.bsPerPoint + ' = 1)' + (pr.bonus ? '<br>+ ' + pr.bonus + ' bono primera compra' : '') + (pr.belowMin ? '<br><span class="text-warn">Bajo el mínimo de Bs ' + db().config.minPurchase + '</span>' : '') +
          '<br>Vencen el ' + u.date(u.addMonths(CP.now(), db().config.validityMonths)) + '</small>'
        : '<div><small>Se acreditarán</small><br><b style="color:var(--muted)">—</b></div><small style="text-align:right">Ingrese el monto total de la boleta<br>para calcular los puntos.</small>';
    };
    form.addEventListener('input', upd); upd();
    form.addEventListener('submit', (e) => e.preventDefault());
    // Aviso inmediato si la boleta ya fue acreditada en otra compra
    form.receiptNo.addEventListener('blur', () => {
      const dup = form.receiptNo.value.trim() && CP.purchases.findDuplicate(db(), form.receiptNo.value, id);
      const f = form.querySelector('[data-field="receiptNo"]');
      f.classList.toggle('has-err', !!dup);
      f.querySelector('.err').textContent = dup ? 'Ya acreditada en ' + dup.id + ' (' + custName(dup.customerId) + ').' : '';
    });
    m.body.querySelector('#apGo').onclick = async () => {
      const v = ui.formValues(form);
      const errs = CP.purchases.validateReview(db(), id, v);
      if (Object.keys(errs).length) return ui.setErrors(form, errs);
      ui.setErrors(form, {});
      const pr = CP.purchases.preview(db(), id, v.validatedAmount);
      const ok = await ui.confirm({ title: 'Aprobar compra ' + id, message: 'Boleta <b>' + esc(v.receiptNo.toUpperCase()) + '</b> del ' + u.date(u.fromIsoDay(v.date)) + ' por <b>' + u.bs(v.validatedAmount) + '</b>, vendida por <b>' + esc(CP.sellers.name(db(), v.sellerId)) + '</b>.<br><br>Se acreditarán <b>' + u.num(pr.total) + ' CorePoints</b> a <b>' + esc(c.name) + '</b>. Esta acción no se puede repetir.', confirmLabel: 'Aprobar y acreditar', icon: 'check' });
      if (!ok) return;
      const r = ui.safe(() => CP.store.tx((x) => CP.purchases.approve(x, id, { receiptNo: v.receiptNo, date: v.date, validatedAmount: v.validatedAmount, sellerId: v.sellerId, product: v.product, note: v.note, actor: 'Administración' })), (res) => 'Compra aprobada: +' + u.num(res.calc.total) + ' pts para ' + c.name.split(' ')[0]);
      if (r) { m.close(); render(); }
    };
    m.body.querySelector('#rjGo').onclick = () => rejectPurchase(id, m);
  }

  function rejectPurchase(id, parent) {
    const p = CP.purchases.get(db(), id);
    ui.formDialog({
      title: 'Rechazar compra ' + id, icon: 'x', danger: true, submitLabel: 'Rechazar compra', cols: 1,
      intro: 'La compra quedará como rechazada y <b>no se acreditarán puntos</b>. El cliente recibirá el motivo y podrá registrar la boleta nuevamente.',
      fields: [
        { name: 'reason', label: 'Motivo del rechazo', type: 'select', required: true, placeholder: 'Seleccione…', options: CP.purchases.REJECT_REASONS },
        { name: 'receiptNo', label: 'Número de boleta', optional: true, placeholder: 'Si se puede leer en la foto', hint: 'Queda como referencia (útil para boletas ya registradas).' },
        { name: 'notes', label: 'Observaciones', type: 'textarea', rows: 3, placeholder: 'Detalle para el cliente y el historial interno', hint: 'Obligatorio si elige "Otro motivo".' }
      ],
      onSubmit: (v) => {
        CP.store.tx((x) => CP.purchases.reject(x, id, { reason: v.reason, notes: v.notes, receiptNo: v.receiptNo, actor: 'Administración' }));
        ui.toast('Compra ' + id + ' rechazada · ' + custName(p.customerId), 'success');
        if (parent) parent.close();
        render();
      }
    });
  }

  /* =========================================================
     CANJES
     ========================================================= */
  function renderRedemptions(params) {
    const d = db();
    const f = F.canjes;
    if (params.has('estado')) { f.status = params.get('estado'); f.page = 1; history.replaceState(null, '', '#/canjes'); }
    const S = CP.redemptions.STATUS;
    let list = d.redemptions.filter((r) => {
      const c = CP.customers.get(d, r.customerId) || {};
      if (f.status && r.status !== f.status) return false;
      const q = f.q.trim();
      return !q || match(q, r.code, r.rewardName, c.name) || (qDigits(q).length >= 3 && c.phone.includes(qDigits(q)));
    }).sort(u.byDateDesc('createdAt'));
    const pg = paginate(list, 'canjes');
    view.innerHTML = '<div class="view"><div class="page-actions"><div class="status-tabs"><button class="chip' + (!f.status ? ' on' : '') + '" data-st="">Todos <span class="count">' + d.redemptions.length + '</span></button>' +
      Object.keys(S).map((s) => '<button class="chip' + (f.status === s ? ' on' : '') + '" data-st="' + s + '">' + S[s].label + ' <span class="count">' + d.redemptions.filter((r) => r.status === s).length + '</span></button>').join('') + '</div></div>' +
      '<div class="toolbar"><div class="search">' + I('search') + '<input id="qR" type="search" placeholder="Buscar por código, cliente, WhatsApp o recompensa…" value="' + esc(f.q) + '"></div></div>' +
      (pg.total ? '<div class="table-wrap stack"><table class="table"><thead><tr><th>Código</th><th>Cliente</th><th>Recompensa</th><th class="num">Puntos</th><th>Fecha</th><th>Estado</th><th class="actions">Acciones</th></tr></thead><tbody>' +
        pg.rows.map((r) => {
          const c = CP.customers.get(d, r.customerId);
          return '<tr><td data-l="Código"><b class="mono">' + r.code + '</b></td><td data-l="Cliente">' + custCell(c) + '</td><td data-l="Recompensa">' + esc(r.rewardName) + '<br><small class="muted">' + CP.rewards.TYPES[r.rewardType] + '</small></td><td data-l="Puntos" class="num">' + u.num(r.points) + '</td>' +
            '<td data-l="Fecha">' + u.date(r.createdAt) + '<br><small class="muted">act. ' + u.relDays(r.updatedAt) + '</small></td><td data-l="Estado">' + ui.redemptionBadge(r.status) + '</td><td class="actions">' + redActions(r, true) + '<button class="btn btn-sm btn-ghost" data-detail="' + r.id + '">' + I('eye') + '</button></td></tr>';
        }).join('') + '</tbody></table></div>' + pager(pg, 'canjes')
        : '<div class="card">' + ui.empty('gift', 'Sin canjes', f.status ? 'No hay canjes con este estado.' : 'Aún no hay solicitudes.') + '</div>') + '</div>';
    $$('[data-st]', view).forEach((b) => (b.onclick = () => { f.status = b.dataset.st; f.page = 1; render(); }));
    bindSearch('qR', 'canjes', 'q');
    bindPager('canjes');
    bindRedActions(view);
    $$('[data-detail]', view).forEach((b) => (b.onclick = () => redemptionDetail(b.dataset.detail)));
  }

  const ACTION_UI = { aprobar: ['btn-ok', 'check', 'Aprobar'], rechazar: ['btn-danger-ghost', 'x', 'Rechazar'], listo: ['btn-pink', 'store', 'Listo p/ recoger'], entregar: ['btn-primary', 'package', 'Entregado'], cancelar: ['btn-ghost', 'x', 'Cancelar'] };
  function redActions(r, compact) {
    return CP.redemptions.actions(r).filter((a) => !compact || a !== 'cancelar')
      .map((a) => '<button class="btn btn-sm ' + ACTION_UI[a][0] + '" data-ract="' + a + '" data-rid="' + r.id + '">' + I(ACTION_UI[a][1]) + ACTION_UI[a][2] + '</button>').join('');
  }
  function bindRedActions(root, after) {
    $$('[data-ract]', root).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); redemptionAction(b.dataset.rid, b.dataset.ract, after); }));
  }
  function redemptionAction(id, action, after) {
    const r = CP.redemptions.get(db(), id);
    const t = CP.redemptions.TRANSITIONS[action];
    const c = CP.customers.get(db(), r.customerId);
    const intro = {
      aprobar: 'Se descontarán definitivamente <b>' + u.num(r.points) + ' pts</b> reservados de <b>' + esc(c.name) + '</b> por <b>' + esc(r.rewardName) + '</b>.',
      rechazar: 'Se liberarán los <b>' + u.num(r.points) + ' pts</b> reservados y se devolverá el stock de la recompensa.',
      listo: 'Se avisará a <b>' + esc(c.name) + '</b> que puede recoger <b>' + esc(r.rewardName) + '</b> con el código <b>' + r.code + '</b>.',
      entregar: 'Confirme que entregó <b>' + esc(r.rewardName) + '</b> a <b>' + esc(c.name) + '</b> (verifique el código <b>' + r.code + '</b> y el carnet).',
      cancelar: 'Se cancelará el canje y se devolverán <b>' + u.num(r.points) + ' pts</b> al cliente' + (r.stockReserved ? ' y 1 unidad al stock' : '') + '.'
    }[action];
    ui.formDialog({
      title: t.label + ' · ' + r.code, icon: ACTION_UI[action][1], danger: action === 'rechazar' || action === 'cancelar', submitLabel: t.label, cols: 1, intro,
      fields: [{ name: 'note', label: t.needsReason ? 'Motivo' : 'Observación', type: 'textarea', rows: 2, required: !!t.needsReason, optional: !t.needsReason, placeholder: t.needsReason ? 'Obligatorio' : 'Opcional' }],
      onSubmit: (v) => {
        CP.store.tx((x) => CP.redemptions.transition(x, id, action, { note: v.note, actor: 'Administración' }));
        ui.toast('Canje ' + r.code + ': ' + CP.redemptions.STATUS[t.to].label.toLowerCase(), 'success');
        if (after) after();
        render();
      }
    });
  }

  function redemptionDetail(id) {
    const d = db();
    const r = CP.redemptions.get(d, id);
    if (!r) return;
    const c = CP.customers.get(d, r.customerId);
    const rw = CP.rewards.get(d, r.rewardId);
    const lots = r.allocations.map((a) => { const l = d.lots.find((x) => x.id === a.lotId); return '<li><div><b>' + u.num(a.points) + ' pts</b><small>Lote ' + a.lotId + ' · vence ' + u.date(a.expiresAt) + (l && l.purchaseId ? ' · ' + l.purchaseId : '') + '</small></div></li>'; }).join('');
    const m = ui.modal({
      title: 'Canje ' + r.code, subtitle: esc(c.name) + ' · ' + esc(r.rewardName), icon: 'gift', size: 'lg',
      body: '<div class="review" style="grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr)"><div>' +
        '<div class="redeem-summary" style="grid-template-columns:1fr">' + ui.img(rw ? rw.image : 'art:gift', r.rewardName, '') + '</div>' +
        '<div class="review-box"><h4>' + I('coins') + 'Puntos reservados (FEFO)</h4><ul class="mini-list">' + lots + '</ul><small class="muted">Se consumieron primero los lotes con vencimiento más cercano.</small></div></div>' +
        '<div class="review-info"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' + ui.redemptionBadge(r.status) + '<small class="muted">' + esc(CP.redemptions.STATUS[r.status].desc) + '</small></div>' +
        '<div class="review-box"><dl class="kv"><dt>Cliente</dt><dd>' + esc(c.name) + '</dd><dt>WhatsApp</dt><dd>' + u.fmtPhone(c.phone) + '</dd><dt>Recompensa</dt><dd>' + esc(r.rewardName) + '</dd><dt>Tipo</dt><dd>' + CP.rewards.TYPES[r.rewardType] + '</dd>' +
        '<dt>Puntos</dt><dd>' + u.num(r.points) + '</dd><dt>Saldo previo</dt><dd>' + u.num(r.balanceBefore) + '</dd><dt>Solicitado</dt><dd>' + u.dateTime(r.createdAt) + '</dd>' + (r.closedReason ? '<dt>Motivo</dt><dd>' + esc(r.closedReason) + '</dd>' : '') + '</dl></div>' +
        (CP.redemptions.actions(r).length ? '<div class="review-actions" style="margin:0">' + redActions(r) + '</div>' : '<div class="alert alert-info">' + I('info') + '<p>Este canje está cerrado; no admite más cambios.</p></div>') +
        '<div class="review-box"><h4>' + I('history') + 'Historial</h4>' + ui.timeline(r.history, (s) => CP.redemptions.STATUS[s]) + '</div></div></div>'
    });
    ui.hydrate(m.body);
    bindRedActions(m.body, () => m.close());
  }

  /* =========================================================
     CLIENTES
     ========================================================= */
  function renderCustomers() {
    const d = db();
    const f = F.clientes;
    const now = CP.now();
    let list = d.customers.map((c) => Object.assign({ c }, CP.customers.stats(d, c.id, now))).filter((x) => {
      const q = f.q.trim();
      return !q || match(q, x.c.name, x.c.email) || (qDigits(q).length >= 3 && x.c.phone.includes(qDigits(q)));
    });
    const sorts = { recent: (a, b) => new Date(b.c.createdAt) - new Date(a.c.createdAt), name: (a, b) => a.c.name.localeCompare(b.c.name), points: (a, b) => b.balance.available - a.balance.available, amount: (a, b) => b.amount - a.amount };
    list.sort(sorts[f.sort]);
    const pg = paginate(list, 'clientes');
    view.innerHTML = '<div class="view"><div class="toolbar"><div class="search">' + I('search') + '<input id="qC" type="search" placeholder="Buscar por nombre, WhatsApp o correo…" value="' + esc(f.q) + '"></div>' +
      '<select id="sC"><option value="recent"' + (f.sort === 'recent' ? ' selected' : '') + '>Más recientes</option><option value="name"' + (f.sort === 'name' ? ' selected' : '') + '>Nombre</option><option value="points"' + (f.sort === 'points' ? ' selected' : '') + '>Más puntos</option><option value="amount"' + (f.sort === 'amount' ? ' selected' : '') + '>Mayor monto</option></select>' +
      '<button class="btn btn-sm btn-ghost" id="exportC">' + I('download') + 'Exportar CSV</button></div>' +
      (pg.total ? '<div class="table-wrap stack"><table class="table"><thead><tr><th>Cliente</th><th>Correo</th><th>Registro</th><th class="num">Compras</th><th class="num">Monto acumulado</th><th class="num">Disponibles</th><th class="num">Utilizados</th><th class="num">Vencidos</th><th></th></tr></thead><tbody>' +
        pg.rows.map((x) => '<tr class="clickable" data-cust="' + x.c.id + '"><td data-l="Cliente">' + custCell(x.c) + '</td><td data-l="Correo">' + esc(x.c.email || '—') + '</td><td data-l="Registro">' + u.date(x.c.createdAt) + '</td>' +
          '<td data-l="Compras" class="num">' + x.purchases + (x.pendingPurchases ? ' <span class="badge badge-warn">' + x.pendingPurchases + ' pend.</span>' : '') + '</td><td data-l="Monto acumulado" class="num">' + u.bs(x.amount) + '</td>' +
          '<td data-l="Disponibles" class="num"><b class="text-cyan">' + u.num(x.balance.available) + '</b>' + (x.balance.expiring ? '<br><small class="text-warn">' + u.num(x.balance.expiring) + ' por vencer</small>' : '') + '</td><td data-l="Utilizados" class="num">' + u.num(x.balance.used) + '</td><td data-l="Vencidos" class="num">' + (x.balance.expired ? '<span class="text-bad">' + u.num(x.balance.expired) + '</span>' : '0') + '</td>' +
          '<td class="actions"><button class="btn btn-sm btn-ghost">' + I('eye') + 'Ficha</button></td></tr>').join('') + '</tbody></table></div>' + pager(pg, 'clientes')
        : '<div class="card">' + ui.empty('users', 'Sin clientes', 'Los clientes se crean automáticamente al registrar su primera compra.') + '</div>') + '</div>';
    bindSearch('qC', 'clientes', 'q'); bindSelect('sC', 'clientes', 'sort'); bindPager('clientes');
    $$('[data-cust]', view).forEach((tr) => (tr.onclick = () => customerDetail(tr.dataset.cust)));
    $('#exportC').onclick = () => exportCsv('clientes-corepoints.csv', ['ID', 'Nombre', 'WhatsApp', 'Correo', 'Registro', 'Compras', 'Monto acumulado', 'Disponibles', 'Reservados', 'Utilizados', 'Vencidos'],
      list.map((x) => [x.c.id, x.c.name, '+' + x.c.phone, x.c.email, x.c.createdAt, x.purchases, x.amount, x.balance.available, x.balance.reserved, x.balance.used, x.balance.expired]));
  }

  function customerDetail(id, tab) {
    const d = db();
    const c = CP.customers.get(d, id);
    if (!c) return;
    const now = CP.now();
    const st = CP.customers.stats(d, id, now);
    const b = st.balance;
    const purchases = d.purchases.filter((p) => p.customerId === id).sort(u.byDateDesc('createdAt'));
    const reds = d.redemptions.filter((r) => r.customerId === id).sort(u.byDateDesc('createdAt'));
    const movs = d.movements.filter((m) => m.customerId === id).sort(u.byDateDesc('at'));
    const lots = CP.points.lotsOf(d, id).sort((a, b2) => new Date(a.expiresAt) - new Date(b2.expiresAt));
    const m = ui.modal({
      title: 'Ficha de cliente', icon: 'user', size: 'xl',
      body: '<div class="cust-head">' + ui.avatar(c.name, 'lg') + '<div><h3>' + esc(c.name) + (c.nameProvided === false ? ' ' + ui.badge('Nombre provisional', 'warn') : '') + '</h3><small>' + u.fmtPhone(c.phone) + ' · ' + esc(c.email || 'sin correo') + ' · registrado ' + u.date(c.createdAt) + ' · ' + c.id + '</small>' + (c.notes ? '<br><small class="text-warn">' + esc(c.notes) + '</small>' : '') + '</div>' +
        '<div class="actions"><button class="btn btn-sm btn-ghost" id="cEdit">' + I('edit') + 'Editar datos</button><button class="btn btn-sm btn-primary" id="cAdj">' + I('sliders') + 'Ajustar puntos</button></div></div>' +
        '<div class="mini-kpis"><div><span>Disponibles</span><b class="text-cyan">' + u.num(b.available) + '</b></div><div><span>Reservados</span><b class="text-warn">' + u.num(b.reserved) + '</b></div><div><span>Utilizados</span><b class="text-pink">' + u.num(b.used) + '</b></div><div><span>Vencidos</span><b class="text-bad">' + u.num(b.expired) + '</b></div>' +
        '<div><span>Total de compras</span><b>' + st.purchases + '</b> <small class="muted">(' + st.approved + ' aprobadas)</small></div><div><span>Monto acumulado</span><b>' + u.bs(st.amount) + '</b></div><div><span>Por vencer (' + d.config.expiryWarnDays + ' d)</span><b>' + u.num(b.expiring) + '</b></div><div><span>Compras en verificación</span><b>' + st.pendingPurchases + '</b></div></div>' +
        '<div class="tabs">' + [['compras', 'Compras', purchases.length], ['canjes', 'Canjes', reds.length], ['movimientos', 'Movimientos', movs.length], ['lotes', 'Acreditaciones', lots.length]].map((t) => '<button class="tab" data-t="' + t[0] + '">' + t[1] + ' <span class="count">' + t[2] + '</span></button>').join('') + '</div><div id="cTab"></div>'
    });
    const body = m.body.querySelector('#cTab');
    const show = (t) => {
      $$('[data-t]', m.body).forEach((x) => x.classList.toggle('on', x.dataset.t === t));
      if (t === 'compras') body.innerHTML = purchases.length ? '<div class="table-wrap stack"><table class="table"><thead><tr><th>Solicitud</th><th>Boleta</th><th>Fecha</th><th class="num">Monto</th><th>Vendedora</th><th class="num">Puntos</th><th>Estado</th></tr></thead><tbody>' + purchases.map((p) => { const pl = CP.purchases.pointsLabel(d, p); return '<tr class="clickable" data-p="' + p.id + '"><td data-l="Solicitud" class="mono">' + p.id + '</td><td data-l="Boleta">' + (p.receiptNo ? esc(p.receiptNo) : '<span class="muted">' + CP.purchases.receiptLabel(p) + '</span>') + '</td><td data-l="Fecha">' + (p.date ? u.date(u.fromIsoDay(p.date)) : '<span class="muted">—</span>') + '</td><td data-l="Monto" class="num">' + (p.validatedAmount ? u.bs(p.validatedAmount) : '<span class="muted">—</span>') + '</td><td data-l="Vendedora">' + (p.validatedSellerId ? esc(CP.sellers.name(d, p.validatedSellerId)) : '<span class="muted">—</span>') + '</td><td data-l="Puntos" class="num">' + (p.status === 'rechazada' ? '0' : (pl.estimated ? '<span class="est">al verificar</span>' : '<span class="pts-plus">+' + u.num(pl.value) + '</span>')) + '</td><td data-l="Estado">' + ui.purchaseBadge(p.status) + '</td></tr>'; }).join('') + '</tbody></table></div>' : ui.empty('receipt', 'Sin compras');
      if (t === 'canjes') body.innerHTML = reds.length ? '<div class="table-wrap stack"><table class="table"><thead><tr><th>Código</th><th>Recompensa</th><th class="num">Puntos</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>' + reds.map((r) => '<tr class="clickable" data-r="' + r.id + '"><td data-l="Código" class="mono">' + r.code + '</td><td data-l="Recompensa">' + esc(r.rewardName) + '</td><td data-l="Puntos" class="num">' + u.num(r.points) + '</td><td data-l="Fecha">' + u.date(r.createdAt) + '</td><td data-l="Estado">' + ui.redemptionBadge(r.status) + '</td></tr>').join('') + '</tbody></table></div>' : ui.empty('gift', 'Sin canjes');
      if (t === 'movimientos') body.innerHTML = movs.length ? movTable(movs, false) : ui.empty('history', 'Sin movimientos');
      if (t === 'lotes') body.innerHTML = lots.length ? '<div class="table-wrap stack lots-table"><table class="table"><thead><tr><th>Lote</th><th>Origen</th><th>Acreditado</th><th>Vence</th><th class="num">Puntos</th><th class="num">Restante</th><th class="num">Vencido</th><th>Estado</th></tr></thead><tbody>' + lots.map((l) => {
        const live = new Date(l.expiresAt) > now;
        const stl = !live ? (l.expiredAt ? ui.badge('Vencido', 'bad') : ui.badge('Vencido · sin procesar', 'warn')) : l.remaining === 0 ? ui.badge('Consumido', 'neutral') : new Date(l.expiresAt) <= u.addDays(now, d.config.expiryWarnDays) ? ui.badge('Por vencer', 'warn') : ui.badge('Vigente', 'ok');
        return '<tr><td data-l="Lote" class="mono">' + l.id + '</td><td data-l="Origen">' + ({ compra: 'Compra ' + (l.purchaseId || ''), bono: 'Bono primera compra', ajuste: 'Ajuste manual' }[l.source]) + '</td><td data-l="Acreditado">' + u.date(l.creditedAt) + '</td><td data-l="Vence">' + u.date(l.expiresAt) + '<br><small class="muted">' + u.relDays(l.expiresAt, now) + '</small></td><td data-l="Puntos" class="num">' + u.num(l.points) + '</td><td data-l="Restante" class="num"><b>' + u.num(l.remaining) + '</b></td><td data-l="Vencido" class="num">' + u.num(l.expiredPts || 0) + '</td><td data-l="Estado">' + stl + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="muted" style="font-size:.8rem;margin-top:10px">Cada acreditación conserva su propio vencimiento. Los canjes consumen primero los lotes que vencen antes (FEFO).</p>' : ui.empty('coins', 'Sin acreditaciones');
      $$('[data-p]', body).forEach((tr) => (tr.onclick = () => purchaseDetail(tr.dataset.p)));
      $$('[data-r]', body).forEach((tr) => (tr.onclick = () => redemptionDetail(tr.dataset.r)));
    };
    $$('[data-t]', m.body).forEach((x) => (x.onclick = () => show(x.dataset.t)));
    show(tab || 'compras');
    m.body.querySelector('#cAdj').onclick = () => adjustPoints(id, () => { m.close(); customerDetail(id, 'movimientos'); });
    m.body.querySelector('#cEdit').onclick = () => ui.formDialog({
      title: 'Editar cliente', icon: 'edit', fields: [
        { name: 'name', label: 'Nombre completo', required: true, value: c.name, wide: true },
        { name: 'phone', label: 'WhatsApp', required: true, prefix: '+591', value: c.phone.slice(3), inputmode: 'tel' },
        { name: 'email', label: 'Correo', optional: true, type: 'email', value: c.email },
        { name: 'notes', label: 'Nota interna', optional: true, type: 'textarea', rows: 2, value: c.notes, wide: true }
      ],
      onSubmit: (v) => { CP.store.tx((x) => CP.customers.update(x, id, v)); ui.toast('Cliente actualizado', 'success'); m.close(); render(); customerDetail(id); }
    });
  }

  function adjustPoints(id, after) {
    const c = CP.customers.get(db(), id);
    const avail = CP.points.available(db(), id);
    ui.formDialog({
      title: 'Ajuste manual de puntos', subtitle: esc(c.name) + ' · disponible ' + u.num(avail) + ' pts', icon: 'sliders', submitLabel: 'Registrar ajuste',
      intro: 'Use un valor positivo para sumar o negativo para descontar. Los descuentos consumen primero los puntos que vencen antes. El ajuste queda registrado en el historial auditable.',
      fields: [
        { name: 'type', label: 'Tipo de ajuste', type: 'select', options: [{ value: '1', label: 'Sumar puntos' }, { value: '-1', label: 'Descontar puntos' }], value: '1' },
        { name: 'delta', label: 'Cantidad de puntos', type: 'number', min: 1, step: 1, required: true, placeholder: 'Ej. 100' },
        { name: 'reason', label: 'Motivo (obligatorio)', type: 'textarea', rows: 2, required: true, wide: true, placeholder: 'Ej. Compensación por demora en garantía' }
      ],
      onSubmit: (v) => {
        const n = Math.floor(Math.abs(Number(v.delta)));
        if (!n) throw new CP.BizError('Ingrese una cantidad mayor a cero.', 'delta');
        const delta = n * Number(v.type);
        CP.store.tx((x) => CP.points.adjust(x, { customerId: id, delta, reason: v.reason, actor: 'Administración' }));
        ui.toast('Ajuste registrado: ' + (delta > 0 ? '+' : '') + u.num(delta) + ' pts', 'success');
        render();
        if (after) after();
      }
    });
  }

  /* =========================================================
     VENDEDORAS
     ========================================================= */
  function renderSellers() {
    const d = db();
    const rows = d.sellers.map((s) => Object.assign({ s }, CP.sellers.stats(d, s.id))).sort((a, b) => (b.s.active - a.s.active) || b.amount - a.amount);
    const total = rows.reduce((a, x) => a + x.amount, 0);
    view.innerHTML = '<div class="view"><div class="page-actions"><div class="left"><span class="pill">' + d.sellers.filter((s) => s.active).length + ' activas</span><span class="pill">Total validado ' + u.bsShort(total) + '</span></div>' +
      '<div class="left"><button class="btn btn-sm btn-ghost" id="exportS">' + I('download') + 'Exportar para comisiones</button><button class="btn btn-primary btn-sm" id="newSeller">' + I('plus') + 'Nueva vendedora</button></div></div>' +
      '<div class="seller-cards">' + rows.map((x) => '<div class="card seller-card' + (x.s.active ? '' : ' inactive') + '"><div class="top">' + ui.avatar(x.s.name, 'lg') + '<div><b>' + esc(x.s.name) + '</b><small>' + esc(x.s.code) + ' · ' + (x.s.phone ? u.fmtPhone(x.s.phone) : 'sin WhatsApp') + '</small></div>' + (x.s.active ? ui.badge('Activa', 'ok') : ui.badge('Inactiva', 'neutral')) + '</div>' +
        '<div class="nums"><div><b class="text-ok">' + x.approved + '</b><span>Ventas verificadas</span></div><div><b>' + x.last30 + '</b><span>Últimos 30 días</span></div><div><b>' + x.customers + '</b><span>Clientes</span></div></div>' +
        '<div class="amount"><span class="muted">Monto validado · ticket ' + u.bsShort(x.avgTicket) + '</span><b>' + u.bs(x.amount) + '</b></div>' +
        '<div class="progress" style="margin-bottom:14px"><i style="width:' + (total ? Math.round((x.amount / total) * 100) : 0) + '%"></i></div>' +
        '<div class="btns"><button class="btn btn-sm btn-ghost" data-sdet="' + x.s.id + '">' + I('receipt') + 'Boletas</button><button class="btn btn-sm btn-ghost" data-sedit="' + x.s.id + '">' + I('edit') + 'Editar</button>' +
        '<button class="btn btn-sm btn-ghost" data-stog="' + x.s.id + '">' + (x.s.active ? 'Desactivar' : 'Activar') + '</button></div></div>').join('') + '</div>' +
      '<div class="alert alert-info" style="margin-top:18px">' + I('info') + '<p>La vendedora se asigna al verificar cada boleta, por eso aquí solo cuentan las ventas verificadas. Las comisiones no se calculan en esta versión, pero cada compra aprobada guarda la vendedora y el monto validado. El botón "Exportar para comisiones" descarga ese detalle.</p></div></div>';
    $('#newSeller').onclick = () => sellerForm();
    $$('[data-sedit]', view).forEach((b) => (b.onclick = () => sellerForm(b.dataset.sedit)));
    $$('[data-sdet]', view).forEach((b) => (b.onclick = () => sellerDetail(b.dataset.sdet)));
    $$('[data-stog]', view).forEach((b) => (b.onclick = () => {
      const s = CP.sellers.get(db(), b.dataset.stog);
      act((x) => { const t = CP.sellers.get(x, s.id); t.active = !t.active; }, s.name + (s.active ? ' desactivada (ya no aparece al verificar boletas)' : ' activada'));
    }));
    $('#exportS').onclick = () => exportCsv('ventas-por-vendedora.csv', ['Vendedora', 'Código', 'Solicitud', 'Boleta', 'Fecha compra', 'Cliente', 'Producto', 'Monto validado', 'Puntos', 'Aprobada'],
      d.purchases.filter((p) => p.status === 'aprobada').map((p) => { const s = CP.sellers.get(d, p.validatedSellerId); return [s.name, s.code, p.id, p.receiptNo, p.date, custName(p.customerId), p.product, p.validatedAmount, p.points + (p.bonus || 0), p.reviewedAt]; }));
  }

  function sellerForm(id) {
    const s = id ? CP.sellers.get(db(), id) : null;
    ui.formDialog({
      title: s ? 'Editar vendedora' : 'Nueva vendedora', icon: 'award', submitLabel: s ? 'Guardar cambios' : 'Registrar vendedora',
      fields: [
        { name: 'name', label: 'Nombre', required: true, value: s ? s.name : '', wide: true },
        { name: 'code', label: 'Código interno', required: true, value: s ? s.code : 'V-', placeholder: 'V-XX06', hint: 'Único. Letras, números y guiones.' },
        { name: 'phone', label: 'WhatsApp', optional: true, prefix: '+591', value: s && s.phone ? s.phone.slice(3) : '', inputmode: 'tel' },
        { name: 'active', label: 'Estado', type: 'select', options: [{ value: 'true', label: 'Activa' }, { value: 'false', label: 'Inactiva' }], value: s ? String(s.active) : 'true' }
      ],
      onSubmit: (v) => {
        if (v.phone) v.phone = '591' + v.phone.replace(/\D/g, '').replace(/^591/, '');
        CP.store.tx((x) => CP.sellers.save(x, Object.assign(v, { id })));
        ui.toast(s ? 'Vendedora actualizada' : 'Vendedora registrada', 'success');
        render();
      }
    });
  }

  function sellerDetail(id) {
    const d = db();
    const s = CP.sellers.get(d, id);
    const st = CP.sellers.stats(d, id);
    const list = st.purchases.slice().sort(u.byDateDesc('createdAt'));
    const m = ui.modal({
      title: s.name, subtitle: s.code + ' · historial de boletas asociadas', icon: 'award', size: 'lg',
      body: '<div class="mini-kpis"><div><span>Ventas verificadas</span><b class="text-ok">' + st.approved + '</b></div><div><span>Últimos 30 días</span><b>' + st.last30 + '</b></div><div><span>Ticket promedio</span><b>' + u.bsShort(st.avgTicket) + '</b></div><div><span>Monto validado</span><b>' + u.bsShort(st.amount) + '</b></div></div>' +
        (list.length ? '<div class="table-wrap stack"><table class="table"><thead><tr><th>Solicitud</th><th>Boleta</th><th>Cliente</th><th>Fecha</th><th class="num">Monto</th><th>Estado</th></tr></thead><tbody>' +
          list.map((p) => '<tr class="clickable" data-p="' + p.id + '"><td data-l="Solicitud" class="mono">' + p.id + '</td><td data-l="Boleta">' + esc(p.receiptNo) + '</td><td data-l="Cliente">' + esc(custName(p.customerId)) + '</td><td data-l="Fecha">' + u.date(u.fromIsoDay(p.date)) + '</td><td data-l="Monto" class="num">' + u.bs(p.validatedAmount) + '</td><td data-l="Estado">' + ui.purchaseBadge(p.status) + '</td></tr>').join('') + '</tbody></table></div>' : ui.empty('receipt', 'Sin boletas asociadas'))
    });
    $$('[data-p]', m.body).forEach((tr) => (tr.onclick = () => purchaseDetail(tr.dataset.p)));
  }

  /* =========================================================
     RECOMPENSAS
     ========================================================= */
  function renderRewards() {
    const d = db();
    const f = F.recompensas;
    const list = d.rewards.filter((r) => match(f.q, r.name, r.description) && (!f.cat || r.category === f.cat) && (!f.status || String(r.active) === f.status)).sort((a, b) => (b.active - a.active) || a.cost - b.cost);
    const usage = (id) => d.redemptions.filter((x) => x.rewardId === id).length;
    view.innerHTML = '<div class="view"><div class="toolbar"><div class="search">' + I('search') + '<input id="qW" type="search" placeholder="Buscar recompensa…" value="' + esc(f.q) + '"></div>' +
      '<select id="cW"><option value="">Todas las categorías</option>' + CP.rewards.CATEGORIES.map((c) => '<option' + (f.cat === c ? ' selected' : '') + '>' + c + '</option>').join('') + '</select>' +
      '<select id="sW"><option value="">Todos los estados</option><option value="true"' + (f.status === 'true' ? ' selected' : '') + '>Activas</option><option value="false"' + (f.status === 'false' ? ' selected' : '') + '>Inactivas</option></select>' +
      '<button class="btn btn-primary btn-sm" id="newReward">' + I('plus') + 'Nueva recompensa</button></div>' +
      (list.length ? '<div class="table-wrap stack"><table class="table"><thead><tr><th></th><th>Recompensa</th><th>Categoría</th><th>Tipo</th><th class="num">Costo</th><th class="num">Stock</th><th class="num">Canjes</th><th>Estado</th><th class="actions">Acciones</th></tr></thead><tbody>' +
        list.map((r) => {
          const n = usage(r.id);
          return '<tr class="' + (r.active ? '' : 'row-dim') + '"><td>' + ui.img(r.image, r.name, 'thumb') + '</td><td data-l="Recompensa"><b>' + esc(r.name) + '</b>' + (r.featured ? ' ' + ui.badge('Destacada', 'accent') : '') + '<br><small class="muted">' + esc(r.description.slice(0, 70)) + (r.description.length > 70 ? '…' : '') + '</small></td>' +
            '<td data-l="Categoría">' + esc(r.category) + '</td><td data-l="Tipo">' + CP.rewards.TYPES[r.type] + '</td><td data-l="Costo" class="num"><b class="text-cyan">' + u.num(r.cost) + '</b> pts</td>' +
            '<td data-l="Stock" class="num">' + (r.stock == null ? '<span class="muted">∞</span>' : r.stock === 0 ? '<span class="text-bad">0</span>' : r.stock) + '</td><td data-l="Canjes" class="num">' + n + '</td>' +
            '<td data-l="Estado"><label style="display:inline-flex;gap:8px;align-items:center;cursor:pointer"><input type="checkbox" class="toggle" data-wtog="' + r.id + '"' + (r.active ? ' checked' : '') + '>' + (r.active ? 'Activa' : 'Inactiva') + '</label></td>' +
            '<td class="actions"><button class="btn btn-sm btn-ghost" data-wedit="' + r.id + '">' + I('edit') + 'Editar</button><button class="btn btn-sm btn-danger-ghost" data-wdel="' + r.id + '"' + (n ? ' disabled title="Tiene canjes asociados: desactívela en lugar de eliminarla"' : '') + '>' + I('trash') + '</button></td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="card">' + ui.empty('package', 'Sin recompensas', 'Cree la primera recompensa del catálogo.') + '</div>') + '</div>';
    bindSearch('qW', 'recompensas', 'q'); bindSelect('cW', 'recompensas', 'cat'); bindSelect('sW', 'recompensas', 'status');
    $('#newReward').onclick = () => rewardForm();
    $$('[data-wedit]', view).forEach((b) => (b.onclick = () => rewardForm(b.dataset.wedit)));
    $$('[data-wtog]', view).forEach((b) => (b.onchange = () => act((x) => CP.rewards.setActive(x, b.dataset.wtog, b.checked), b.checked ? 'Recompensa activada: visible en el portal' : 'Recompensa desactivada: oculta en el portal')));
    $$('[data-wdel]', view).forEach((b) => (b.onclick = async () => {
      const r = CP.rewards.get(db(), b.dataset.wdel);
      if (!(await ui.confirm({ title: 'Eliminar recompensa', message: '¿Eliminar <b>' + esc(r.name) + '</b> del catálogo? Esta acción no se puede deshacer.', confirmLabel: 'Eliminar', danger: true }))) return;
      const ok = act((x) => CP.rewards.remove(x, r.id), 'Recompensa eliminada');
      if (ok && r.image && r.image.startsWith('idb:')) CP.images.remove(r.image.slice(4)).catch(() => {});
    }));
  }

  function rewardForm(id) {
    const r = id ? CP.rewards.get(db(), id) : null;
    let image = r ? r.image : 'art:gift';
    let up = null;
    const extra = '<div class="field field-wide" data-field="image"><label>Imagen</label><div class="img-choice"><div id="wUp"></div>' +
      '<small class="hint">O elija una ilustración incluida:</small><div class="art-picker">' + CP.rewards.ART_KEYS.map((k) => '<button type="button" data-art="' + k + '" title="' + CP.rewards.ART_LABELS[k] + '"><img src="' + CP.rewards.artUrl(k) + '" alt="' + CP.rewards.ART_LABELS[k] + '"></button>').join('') + '</div></div></div>';
    ui.formDialog({
      title: r ? 'Editar recompensa' : 'Nueva recompensa', icon: 'package', size: 'lg', submitLabel: r ? 'Guardar cambios' : 'Crear recompensa',
      fields: [
        { name: 'name', label: 'Nombre', required: true, value: r ? r.name : '', wide: true },
        { name: 'description', label: 'Descripción', required: true, type: 'textarea', rows: 2, value: r ? r.description : '', wide: true },
        { name: 'category', label: 'Categoría', type: 'select', required: true, placeholder: 'Seleccione…', options: CP.rewards.CATEGORIES, value: r ? r.category : '' },
        { name: 'type', label: 'Tipo de recompensa', type: 'select', required: true, options: [{ value: 'producto', label: 'Producto' }, { value: 'servicio', label: 'Servicio' }], value: r ? r.type : 'producto' },
        { name: 'cost', label: 'Costo en CorePoints', type: 'number', required: true, min: 1, step: 1, value: r ? r.cost : '', suffix: 'pts' },
        { name: 'stock', label: 'Stock', type: 'number', min: 0, step: 1, value: r && r.stock != null ? r.stock : '', hint: 'Vacío = sin límite (servicios).', optional: true },
        { name: 'active', label: 'Estado', type: 'select', options: [{ value: 'true', label: 'Activa (visible en el portal)' }, { value: 'false', label: 'Inactiva' }], value: r ? String(r.active) : 'true' },
        { name: 'featured', label: 'Destacar en el portal', type: 'select', options: [{ value: '', label: 'No' }, { value: '1', label: 'Sí' }], value: r && r.featured ? '1' : '' },
        { name: 'conditions', label: 'Condiciones de canje', type: 'textarea', rows: 2, optional: true, value: r ? r.conditions : '', wide: true, placeholder: 'Ej. Previa cita por WhatsApp.' }
      ],
      extra,
      onOpen: (m, form) => {
        const markArt = () => $$('[data-art]', form).forEach((b) => b.classList.toggle('on', image === 'art:' + b.dataset.art));
        up = ui.uploader(form.querySelector('#wUp'), {
          label: 'Imagen de la recompensa', kind: 'recompensa', icon: 'image', value: image.startsWith('idb:') ? image.slice(4) : null, maxMB: () => db().config.maxImageMB,
          onChange: (imgId) => { image = imgId ? 'idb:' + imgId : (r && !r.image.startsWith('idb:') ? r.image : 'art:gift'); markArt(); }
        });
        $$('[data-art]', form).forEach((b) => (b.onclick = () => { if (up.value) up.reset(true); image = 'art:' + b.dataset.art; markArt(); }));
        markArt();
      },
      onSubmit: (v) => {
        const saved = CP.store.tx((x) => CP.rewards.save(x, Object.assign(v, { id, image, active: v.active === 'true', featured: !!v.featured })));
        if (up) up.commit();
        if (r && r.image !== saved.image && r.image.startsWith('idb:')) CP.images.remove(r.image.slice(4)).catch(() => {});
        ui.toast(r ? 'Recompensa actualizada' : 'Recompensa creada', 'success');
        render();
      }
    }).then((res) => { if (!res && up) up.reset(true); });
  }

  /* =========================================================
     MOVIMIENTOS
     ========================================================= */
  function movTable(list, withCustomer) {
    return '<div class="table-wrap stack"><table class="table"><thead><tr><th>Fecha</th>' + (withCustomer ? '<th>Cliente</th>' : '') + '<th>Tipo</th><th>Detalle</th><th class="num">Puntos</th><th class="num">Saldo</th><th>Por</th></tr></thead><tbody>' +
      list.map((m) => {
        const t = CP.points.MOVEMENT_TYPES[m.type];
        return '<tr><td data-l="Fecha" class="nowrap">' + u.dateTime(m.at) + '</td>' + (withCustomer ? '<td data-l="Cliente"><button class="link-btn" data-cust="' + m.customerId + '">' + esc(custName(m.customerId)) + '</button></td>' : '') +
          '<td data-l="Tipo">' + ui.badge(t.label, t.tone) + '</td><td data-l="Detalle">' + esc(m.note) + (m.refId ? ' <small class="muted mono">' + esc(m.refId) + '</small>' : '') + '</td>' +
          '<td data-l="Puntos" class="num">' + (m.type === 'canje' ? '<span class="pts-zero">' + u.num(m.amount) + '</span> <span class="est">confirmado</span>' : ptsCell(m.points)) + '</td><td data-l="Saldo" class="num">' + u.num(m.balanceAfter) + '</td><td data-l="Por"><small class="muted">' + esc(m.actor) + '</small></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function renderMovements(params) {
    const d = db();
    const f = F.movimientos;
    if (params.has('tipo')) { f.type = params.get('tipo'); f.page = 1; history.replaceState(null, '', '#/movimientos'); }
    const list = d.movements.filter((m) => (!f.type || m.type === f.type) && (!f.q.trim() || match(f.q, custName(m.customerId), m.note, m.refId || ''))).sort(u.byDateDesc('at'));
    const pg = paginate(list, 'movimientos');
    const T = CP.points.MOVEMENT_TYPES;
    const expiredPending = d.lots.filter((l) => l.remaining > 0 && new Date(l.expiresAt) <= CP.now());
    view.innerHTML = '<div class="view"><div class="page-actions"><div class="left"><span class="pill">' + d.movements.length + ' movimientos</span>' + (d.meta.lastExpiryRun ? '<span class="pill">' + I('clock') + ' Último proceso de vencimiento: ' + u.dateTime(d.meta.lastExpiryRun) + '</span>' : '') + '</div>' +
      '<div class="left"><button class="btn btn-sm btn-ghost" id="exportM">' + I('download') + 'Exportar CSV</button><button class="btn btn-sm ' + (expiredPending.length ? 'btn-pink' : 'btn-ghost') + '" id="runExp">' + I('clock') + 'Ejecutar vencimientos' + (expiredPending.length ? ' (' + expiredPending.length + ')' : '') + '</button></div></div>' +
      '<div class="toolbar"><div class="search">' + I('search') + '<input id="qM" type="search" placeholder="Buscar por cliente, detalle o referencia…" value="' + esc(f.q) + '"></div>' +
      '<select id="tM"><option value="">Todos los tipos</option>' + Object.keys(T).map((k) => '<option value="' + k + '"' + (f.type === k ? ' selected' : '') + '>' + T[k].label + '</option>').join('') + '</select></div>' +
      (pg.total ? movTable(pg.rows, true) + pager(pg, 'movimientos') : '<div class="card">' + ui.empty('history', 'Sin movimientos con estos filtros') + '</div>') + '</div>';
    bindSearch('qM', 'movimientos', 'q'); bindSelect('tM', 'movimientos', 'type'); bindPager('movimientos');
    $$('[data-cust]', view).forEach((b) => (b.onclick = () => customerDetail(b.dataset.cust, 'movimientos')));
    $('#runExp').onclick = runExpiry;
    $('#exportM').onclick = () => exportCsv('movimientos-corepoints.csv', ['ID', 'Fecha', 'Cliente', 'Tipo', 'Puntos', 'Magnitud', 'Saldo', 'Referencia', 'Lote', 'Detalle', 'Por'],
      list.map((m) => [m.id, m.at, custName(m.customerId), T[m.type].label, m.points, m.amount, m.balanceAfter, m.refId || '', m.lotId || '', m.note, m.actor]));
  }

  async function runExpiry() {
    const d = db();
    const now = CP.now();
    const exp = d.lots.filter((l) => l.remaining > 0 && new Date(l.expiresAt) <= now);
    const ok = await ui.confirm({
      title: 'Proceso de vencimiento', icon: 'clock',
      message: 'Fecha de proceso: <b>' + u.date(now) + '</b>.<br><br>' + (exp.length ? 'Se marcarán como vencidos <b>' + u.num(exp.reduce((a, l) => a + l.remaining, 0)) + ' pts</b> de <b>' + exp.length + '</b> acreditación(es) y se notificará a los clientes.' : 'No hay puntos vencidos por procesar.') +
        '<br>También se enviarán avisos de puntos que vencen en los próximos ' + d.config.expiryWarnDays + ' días (una sola vez por acreditación).',
      confirmLabel: 'Ejecutar proceso'
    });
    if (!ok) return;
    const r = act((x) => CP.points.runExpiry(x));
    if (r) ui.toast('Vencimiento: ' + u.num(r.expiredPoints) + ' pts vencidos en ' + r.expiredLots + ' lote(s) · ' + r.warned + ' aviso(s) de vencimiento enviados', 'success', 6000);
  }

  /* =========================================================
     NOTIFICACIONES
     ========================================================= */
  function renderNotifications() {
    const d = db();
    const f = F.notificaciones;
    const E = CP.notifications.EVENTS;
    const list = d.notifications.filter((n) => (!f.event || n.event === f.event) && (!f.q.trim() || match(f.q, custName(n.customerId)))).sort(u.byDateDesc('at'));
    const pg = paginate(list, 'notificaciones');
    const unread = d.notifications.filter((n) => !n.read).length;
    view.innerHTML = '<div class="view"><div class="alert alert-pink" style="margin-bottom:16px">' + I('info') + '<p>Simulación: las notificaciones se registran y se pueden previsualizar como correo y mensaje de WhatsApp, pero no se envían. En producción se conectarían a un servicio de correo y a la API de WhatsApp Business.</p></div>' +
      '<div class="page-actions"><div class="left"><span class="pill">' + d.notifications.length + ' registradas</span><span class="pill">' + unread + ' sin leer por el cliente</span></div>' +
      '<div class="left"><button class="btn btn-sm btn-ghost" id="runWarn">' + I('clock') + 'Generar avisos de vencimiento</button></div></div>' +
      '<div class="toolbar"><div class="search">' + I('search') + '<input id="qN" type="search" placeholder="Buscar por cliente…" value="' + esc(f.q) + '"></div>' +
      '<select id="eN"><option value="">Todos los eventos</option>' + Object.keys(E).map((k) => '<option value="' + k + '"' + (f.event === k ? ' selected' : '') + '>' + E[k].label + '</option>').join('') + '</select></div>' +
      (pg.total ? '<div class="table-wrap stack"><table class="table"><thead><tr><th></th><th>Evento</th><th>Cliente</th><th>Asunto</th><th>Canales</th><th>Fecha</th><th>Lectura</th><th></th></tr></thead><tbody>' +
        pg.rows.map((n) => {
          const ev = E[n.event];
          const k = CP.notifications.content(d, n);
          return '<tr class="clickable" data-n="' + n.id + '"><td><span class="notif-row-ic ' + ev.tone + '">' + I(ev.icon) + '</span></td><td data-l="Evento">' + ev.label + '</td><td data-l="Cliente">' + esc(custName(n.customerId)) + '</td><td data-l="Asunto">' + esc(k.subject) + '</td>' +
            '<td data-l="Canales">' + n.channels.map((c) => ui.badge(c === 'email' ? 'Correo' : 'WhatsApp', c === 'email' ? 'info' : 'ok')).join(' ') + '</td><td data-l="Fecha" class="nowrap">' + u.dateTime(n.at) + '</td><td data-l="Lectura">' + (n.read ? '<span class="muted">Leída</span>' : ui.badge('No leída', 'accent')) + '</td>' +
            '<td class="actions"><button class="btn btn-sm btn-ghost">' + I('eye') + 'Vista previa</button></td></tr>';
        }).join('') + '</tbody></table></div>' + pager(pg, 'notificaciones') : '<div class="card">' + ui.empty('bell', 'Sin notificaciones') + '</div>') + '</div>';
    bindSearch('qN', 'notificaciones', 'q'); bindSelect('eN', 'notificaciones', 'event'); bindPager('notificaciones');
    $$('[data-n]', view).forEach((tr) => (tr.onclick = () => ui.notificationPreview(db(), db().notifications.find((n) => n.id === tr.dataset.n), LOGO)));
    $('#runWarn').onclick = runExpiry;
  }

  /* =========================================================
     CONFIGURACIÓN
     ========================================================= */
  function renderSettings() {
    const d = db();
    const c = d.config;
    const off = Number(d.meta.clockOffsetDays) || 0;
    view.innerHTML = '<div class="view settings-grid"><div>' +
      '<div class="card"><div class="card-head"><h3>' + I('sliders') + 'Reglas del programa</h3></div>' +
      '<form id="cfgForm" class="form-grid" novalidate>' +
      ui.field({ name: 'bsPerPoint', label: 'Bolivianos por 1 CorePoint', type: 'number', min: 1, step: 1, value: c.bsPerPoint, prefix: 'Bs', required: true }) +
      ui.field({ name: 'validityMonths', label: 'Vigencia de los puntos', type: 'number', min: 1, max: 60, step: 1, value: c.validityMonths, suffix: 'meses', required: true }) +
      ui.field({ name: 'minPurchase', label: 'Monto mínimo para generar puntos', type: 'number', min: 0, step: 1, value: c.minPurchase, prefix: 'Bs', required: true }) +
      ui.field({ name: 'firstPurchaseBonus', label: 'Bono por primera compra', type: 'number', min: 0, step: 1, value: c.firstPurchaseBonus, suffix: 'pts', hint: '0 = sin bono.' }) +
      ui.field({ name: 'expiryWarnDays', label: 'Aviso de vencimiento', type: 'number', min: 1, max: 180, step: 1, value: c.expiryWarnDays, suffix: 'días antes', required: true }) +
      ui.field({ name: 'maxImageMB', label: 'Tamaño máximo por imagen', type: 'number', min: 1, max: 25, step: 1, value: c.maxImageMB, suffix: 'MB', required: true, hint: 'Antes de la compresión automática.' }) +
      ui.field({ name: 'purchasesEnabled', label: 'Registro de compras habilitado', hint: 'Si se desactiva, el portal muestra el formulario como cerrado.', type: 'toggle', value: c.purchasesEnabled }) +
      ui.field({ name: 'redemptionsEnabled', label: 'Canjes habilitados', hint: 'Si se desactiva, el catálogo sigue visible pero no se pueden solicitar canjes.', type: 'toggle', value: c.redemptionsEnabled }) +
      '<div class="field-wide rule-example" id="ruleEx"></div>' +
      '<div class="field-wide" style="display:flex;justify-content:flex-end;gap:10px"><button type="button" class="btn btn-ghost" id="cfgDefaults">Valores iniciales</button><button type="submit" class="btn btn-primary">' + I('check') + 'Guardar configuración</button></div></form></div>' +
      '<div class="card"><div class="card-head"><h3>' + I('shield') + 'Reglas fijas del prototipo</h3></div><ul class="check-list">' +
      '<li>' + I('check') + '<span>Redondeo hacia abajo: Bs 5.099 con Bs 10 = 1 pt → 509 pts.</span></li>' +
      '<li>' + I('check') + '<span>Los puntos se acreditan únicamente cuando se aprueba la compra.</span></li>' +
      '<li>' + I('check') + '<span>Los canjes consumen primero los puntos más próximos a vencer (FEFO).</span></li>' +
      '<li>' + I('check') + '<span>Los cambios se aplican solo a operaciones futuras: cada compra aprobada guarda la regla con la que se calculó y cada acreditación su propio vencimiento.</span></li>' +
      '<li>' + I('check') + '<span>Una compra o un canje no pueden procesarse dos veces; toda operación queda en el historial de movimientos.</span></li></ul></div></div>' +
      '<div><div class="card"><div class="card-head"><h3>' + I('zap') + 'Herramientas de demostración</h3></div>' +
      '<div class="tool-row"><div><b>Reloj de demostración</b><small>' + (off ? 'Adelantado ' + off + ' días: hoy es ' + u.date(CP.now()) : 'Usa la fecha real') + '. Útil para probar vencimientos.</small></div><div class="btns">' +
      [30, 90, 365].map((n) => '<button class="btn btn-sm btn-ghost" data-clock="' + n + '">+' + n + ' d</button>').join('') + (off ? '<button class="btn btn-sm btn-pink" data-clock="0">Restablecer</button>' : '') + '</div></div>' +
      '<div class="tool-row"><div><b>Proceso de vencimiento</b><small>Marca puntos vencidos y genera avisos.' + (d.meta.lastExpiryRun ? ' Último: ' + u.dateTime(d.meta.lastExpiryRun) : '') + '</small></div><div class="btns"><button class="btn btn-sm btn-ghost" id="runExp">' + I('clock') + 'Ejecutar</button></div></div>' +
      '<div class="tool-row"><div><b>Datos de demostración</b><small>Borra todo (LocalStorage e IndexedDB) y vuelve a crear 10 clientes, 5 vendedoras, 20 compras, 12 recompensas y 8 canjes.</small></div><div class="btns"><button class="btn btn-sm btn-danger-ghost" id="resetDemo">' + I('refresh') + 'Restablecer</button></div></div>' +
      '<div class="tool-row"><div><b>Almacenamiento local</b><small id="storeInfo">Calculando…</small></div></div></div>' +
      '<div class="card"><div class="card-head"><h3>' + I('history') + 'Cambios de configuración</h3></div>' +
      (d.configLog.length ? '<ul class="log-list">' + d.configLog.slice().reverse().slice(0, 12).map((l) => '<li><span>' + u.dateTime(l.at) + ' · ' + esc(l.by) + '</span>' + esc(l.changes.join(' · ')) + '</li>').join('') + '</ul>' : '<p class="muted" style="margin:0">Sin cambios registrados.</p>') + '</div>' +
      '<div class="alert alert-info" style="margin-top:18px">' + I('info') + '<p>Prototipo frontend: los datos viven en este navegador. No hay base de datos compartida ni autenticación segura. El plugin definitivo para WordPress usaría tablas propias y roles de WooCommerce.</p></div></div></div>';

    const form = $('#cfgForm');
    const ex = () => {
      const v = ui.formValues(form);
      const pts = Math.floor(5000 / Math.max(1, Number(v.bsPerPoint) || 1));
      $('#ruleEx').innerHTML = 'Ejemplo con estos valores: una compra validada de <b>Bs 5.000</b> genera <b>' + u.num(pts) + ' CorePoints</b>' + (Number(v.firstPurchaseBonus) ? ' (+' + v.firstPurchaseBonus + ' si es la primera)' : '') + ', que vencen el <b>' + u.date(u.addMonths(CP.now(), Number(v.validityMonths) || 12)) + '</b>. Compras menores a Bs ' + u.num(v.minPurchase) + ' no suman.';
    };
    form.addEventListener('input', ex); ex();
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = ui.formValues(form);
      const errs = {};
      const int = (k, min, max) => { const n = Number(v[k]); if (!Number.isFinite(n) || n < min || (max != null && n > max) || Math.floor(n) !== n) errs[k] = 'Valor entre ' + min + (max != null ? ' y ' + max : ' o más') + ' (entero).'; return n; };
      const next = {
        bsPerPoint: int('bsPerPoint', 1, 100000), validityMonths: int('validityMonths', 1, 60), minPurchase: int('minPurchase', 0), firstPurchaseBonus: int('firstPurchaseBonus', 0, 100000),
        expiryWarnDays: int('expiryWarnDays', 1, 180), maxImageMB: int('maxImageMB', 1, 25), purchasesEnabled: !!v.purchasesEnabled, redemptionsEnabled: !!v.redemptionsEnabled
      };
      if (Object.keys(errs).length) return ui.setErrors(form, errs);
      const labels = { bsPerPoint: 'Bs por punto', validityMonths: 'Vigencia (meses)', minPurchase: 'Monto mínimo', firstPurchaseBonus: 'Bono primera compra', expiryWarnDays: 'Aviso (días)', maxImageMB: 'Imagen máx. (MB)', purchasesEnabled: 'Registro de compras', redemptionsEnabled: 'Canjes' };
      const fmt = (x) => (x === true ? 'sí' : x === false ? 'no' : x);
      const changes = Object.keys(next).filter((k) => next[k] !== c[k]).map((k) => labels[k] + ': ' + fmt(c[k]) + ' → ' + fmt(next[k]));
      if (!changes.length) return ui.toast('No hay cambios para guardar', 'info');
      act((x) => { Object.assign(x.config, next); x.configLog.push({ at: CP.now().toISOString(), by: 'Administración', changes }); }, 'Configuración guardada. Se aplicará a las operaciones futuras.');
    });
    $('#cfgDefaults').onclick = () => {
      Object.keys(CP.DEFAULT_CONFIG).forEach((k) => { const el = form.elements[k]; if (!el) return; if (el.type === 'checkbox') el.checked = CP.DEFAULT_CONFIG[k]; else el.value = CP.DEFAULT_CONFIG[k]; });
      ex();
      ui.toast('Valores iniciales cargados. Presione "Guardar" para aplicarlos.', 'info');
    };
    $$('[data-clock]', view).forEach((b) => (b.onclick = () => {
      const n = Number(b.dataset.clock);
      act((x) => { x.meta.clockOffsetDays = n ? (Number(x.meta.clockOffsetDays) || 0) + n : 0; }, n ? 'Reloj adelantado ' + n + ' días' : 'Reloj restablecido a la fecha real');
    }));
    $('#runExp').onclick = runExpiry;
    $('#resetDemo').onclick = async () => {
      if (!(await ui.confirm({ title: 'Restablecer datos de demostración', message: 'Se borrarán <b>todas</b> las compras, clientes, canjes, imágenes y cambios realizados en este navegador, y se recrearán los datos de demostración.', confirmLabel: 'Restablecer todo', danger: true }))) return;
      const btn = $('#resetDemo'); btn.disabled = true; btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> Restableciendo…';
      try {
        await CP.seed.reset();
        sessionStorage.removeItem('corepoints:session');
        localStorage.removeItem('corepoints:draft');
        ui.toast('Datos de demostración restablecidos', 'success');
      } catch (e) { ui.toast('No se pudo restablecer: ' + e.message, 'error'); }
      render();
    };
    CP.images.stats().then((s) => {
      const el = $('#storeInfo');
      if (!el) return;
      const ls = (localStorage.getItem(CP.store.KEY) || '').length;
      el.textContent = 'LocalStorage: ' + (ls / 1024).toFixed(0) + ' KB · IndexedDB: ' + s.count + ' imágenes (' + (s.bytes / 1048576).toFixed(1) + ' MB)';
    }).catch(() => {});
  }

  /* ---------------- exportación CSV ---------------- */
  function exportCsv(filename, head, rows) {
    const cell = (v) => { const s = String(v == null ? '' : v); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = '﻿' + [head].concat(rows).map((r) => r.map(cell).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    ui.toast('Exportado ' + rows.length + ' fila(s) a ' + filename, 'info');
  }

  /* ---------------- arranque ---------------- */
  const sidebar = $('#sidebar'), scrim = $('#scrim');
  const closeSide = () => { sidebar.classList.remove('open'); scrim.classList.remove('on'); };
  $('#sideToggle').onclick = () => { sidebar.classList.add('open'); scrim.classList.add('on'); };
  scrim.onclick = closeSide;
  window.addEventListener('hashchange', () => { closeSide(); ui.closeAll(); render(); });
  CP.store.on((origin) => { if (origin === 'external' && !document.querySelector('.modal-wrap')) render(); });
  ui.boot(render);
})();
