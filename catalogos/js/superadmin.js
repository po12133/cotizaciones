/*
 * Panel de superadministrador (simulado): cuentas, suscripciones, pruebas,
 * ingresos recurrentes, límites por plan y acciones sobre cuentas.
 * Sin autenticación real: es una vista de demostración de cómo se administraría el SaaS.
 */
(function () {
  'use strict';
  const CA = window.CA;
  const u = CA.util, ui = CA.ui, esc = u.esc, I = ui.icon, B = CA.CONFIG.brand;
  const $ = ui.$, $$ = ui.$$;
  const view = $('#view');
  const TABS = [['resumen', 'Resumen', 'grid'], ['cuentas', 'Cuentas y negocios', 'users'], ['suscripciones', 'Suscripciones', 'crown'], ['pruebas', 'Pruebas gratuitas', 'clock'], ['planes', 'Planes y límites', 'sliders'], ['actividad', 'Actividad', 'history']];
  const F = { q: '', plan: '', status: '' };

  CA.boot();
  $$('[data-brand]').forEach((el) => (el.textContent = B.name));
  $$('[data-brand-short]').forEach((el) => (el.textContent = B.short));

  const db = () => CA.store.db;
  /** Métricas de una cuenta (reales para las que tienen datos, sintéticas para el resto). */
  function info(user) {
    const ws = db().workspaces[user.id];
    const eff = CA.plans.effective(user);
    const paid = CA.plans.paidActive(user);
    const trial = CA.plans.trialActive(user) && !paid;
    const catalogs = ws ? ws.catalogs.length : user.stats.catalogs;
    const published = ws ? ws.catalogs.filter((c) => c.status === 'published').length : user.stats.published;
    const products = ws ? (ws.products || []).filter((p) => p.sync !== 'error').length : user.stats.products;
    const mrr = paid ? (user.billing === 'yearly' ? CA.PLANS[user.plan].yearly / 12 : CA.PLANS[user.plan].monthly) : 0;
    return { user, eff, paid, trial, catalogs, published, products, mrr, trialDays: trial ? CA.plans.trialDaysLeft(user) : 0 };
  }
  const all = () => db().users.map(info);
  const log = (d, text) => { d.adminLog = d.adminLog || []; d.adminLog.unshift({ at: CA.now().toISOString(), text }); d.adminLog = d.adminLog.slice(0, 80); };
  const act = (fn, msg) => { const r = ui.safe(() => CA.store.tx(fn), msg); if (r !== undefined) render(); return r; };

  function route() { const h = location.hash.replace(/^#\/?/, ''); return TABS.some((t) => t[0] === h) ? h : 'resumen'; }
  function render() {
    const r = route();
    $('#admTabs').innerHTML = TABS.map((t) => '<a class="tab' + (t[0] === r ? ' on' : '') + '" href="#/' + t[0] + '">' + I(t[2]) + t[1] + '</a>').join('');
    ({ resumen: renderSummary, cuentas: renderAccounts, suscripciones: renderSubs, pruebas: renderTrials, planes: renderPlans, actividad: renderLog })[r]();
  }

  const kpi = (ic, label, value, sub, tone) => '<div class="kpi ' + (tone || '') + '"><span class="kpi-ic">' + I(ic) + '</span><div><small>' + label + '</small><b>' + value + '</b><span>' + sub + '</span></div></div>';
  const statusBadge = (x) => (x.user.status === 'suspended' ? ui.badge('Suspendida', 'bad') : ui.badge('Activa', 'ok'));
  const planBadge = (x) => ui.badge(x.trial ? 'Prueba Profesional' : CA.PLANS[x.eff].name, x.trial ? 'accent' : x.eff === 'free' ? 'neutral' : 'brand');

  function renderSummary() {
    const list = all();
    const now = CA.now();
    const mrr = list.reduce((a, x) => a + x.mrr, 0);
    const paid = list.filter((x) => x.paid);
    const trials = list.filter((x) => x.trial);
    const soon = trials.filter((x) => x.trialDays <= 3);
    const byPlan = CA.PLAN_ORDER.map((id) => ({ id, n: list.filter((x) => x.eff === id && !x.trial).length }));
    const months = ui.months(6, now).map((m) => ({ key: m.key, label: m.label, value: 0 }));
    list.forEach((x) => { const r = months.find((m) => m.key === ui.monthKey(x.user.createdAt)); if (r) r.value++; });
    const mrrPlan = CA.PLAN_ORDER.filter((id) => id !== 'free').map((id) => ({ label: CA.PLANS[id].name, value: Math.round(list.filter((x) => x.paid && x.user.plan === id).reduce((a, x) => a + x.mrr, 0)), sub: list.filter((x) => x.paid && x.user.plan === id).length + ' suscripción(es)' }));
    view.innerHTML = '<div class="view-in"><div class="alert alert-warn" style="margin-bottom:16px">' + I('info') + '<p>Vista de demostración del administrador de la plataforma. Las cuentas marcadas como sintéticas solo existen para poblar las métricas; las 4 primeras tienen catálogos reales en este navegador.</p></div>' +
      '<div class="kpis adm-kpis">' +
      kpi('users', 'Usuarios registrados', list.length, list.filter((x) => u.daysLeft(u.addDays(x.user.createdAt, 30)) > 0).length + ' en los últimos 30 días') +
      kpi('store', 'Negocios activos', list.filter((x) => x.user.status === 'active').length, list.filter((x) => x.user.status === 'suspended').length + ' suspendido(s)') +
      kpi('crown', 'Suscripciones pagas', paid.length, paid.filter((x) => x.user.subscription.status === 'canceled').length + ' canceladas al renovar', 'ok') +
      kpi('clock', 'Pruebas activas', trials.length, soon.length + ' vencen en 3 días o menos', 'accent') +
      kpi('layout', 'Catálogos publicados', list.reduce((a, x) => a + x.published, 0), list.reduce((a, x) => a + x.catalogs, 0) + ' catálogos creados') +
      kpi('cards', 'Productos totales', u.num(list.reduce((a, x) => a + x.products, 0)), 'Sincronizados desde Sheets') +
      kpi('chart', 'Ingreso recurrente (MRR)', u.money(Math.round(mrr)), 'ARR ' + u.money(Math.round(mrr * 12)), 'ok') +
      kpi('zap', 'Conversión de prueba', Math.round((list.filter((x) => x.user.trial && x.user.trial.status === 'converted').length / Math.max(1, list.filter((x) => x.user.trial && x.user.trial.status !== 'unused').length)) * 100) + '%', 'Pruebas que pasaron a un plan pago') + '</div>' +
      '<div class="grid-2" style="margin-top:16px"><div class="card"><div class="card-head"><h3>' + I('chart') + 'Distribución por plan</h3></div>' +
      ui.donut(byPlan.map((p, i) => ({ label: CA.PLANS[p.id].name, value: p.n, cls: ['c-muted', 'c-ok', 'c-cyan', 'c-violet'][i] })).concat([{ label: 'En prueba', value: trials.length, cls: 'c-pink' }]), { centerLabel: 'cuentas' }) + '</div>' +
      '<div class="card"><div class="card-head"><h3>' + I('crown') + 'MRR por plan</h3></div>' + ui.hbars(mrrPlan, { format: u.money }) + '</div></div>' +
      '<div class="grid-2" style="margin-top:16px"><div class="card"><div class="card-head"><h3>' + I('users') + 'Registros por mes</h3></div>' + ui.barChart(months, { height: 190 }) + '</div>' +
      '<div class="card"><div class="card-head"><h3>' + I('clock') + 'Pruebas próximas a vencer</h3><a class="btn btn-sm btn-ghost" href="#/pruebas">Ver todas</a></div>' +
      (trials.length ? '<ul class="feed">' + trials.sort((a, b) => a.trialDays - b.trialDays).slice(0, 6).map((x) => '<li><span class="nm-dot ' + (x.trialDays <= 3 ? 'warn' : 'info') + '"></span><div><b>' + esc(x.user.business) + '</b><small>' + esc(x.user.email) + ' · ' + x.catalogs + ' catálogo(s)</small></div><time>' + x.trialDays + ' días</time></li>').join('') + '</ul>' : ui.empty('clock', 'Sin pruebas activas')) + '</div></div></div>';
  }

  function accountsTable(list, opts) {
    opts = opts || {};
    return '<div class="table-wrap stack"><table class="table"><thead><tr><th>Negocio</th><th>Plan</th><th>Suscripción</th><th>Prueba</th><th class="num">Catálogos</th><th class="num">Productos</th><th>Registro</th><th>Estado</th><th class="actions">Acciones</th></tr></thead><tbody>' +
      list.map((x) => '<tr' + (x.user.status === 'suspended' ? ' class="row-dim"' : '') + '><td data-l="Negocio"><div class="cell-user">' + ui.avatar(x.user.business) + '<div><b>' + esc(x.user.business) + (x.user.synthetic ? '' : ' ' + ui.badge('con datos', 'info')) + '</b><small>' + esc(x.user.name) + ' · ' + esc(x.user.email) + '</small></div></div></td>' +
        '<td data-l="Plan">' + planBadge(x) + '</td><td data-l="Suscripción">' + (x.paid ? (x.user.subscription.status === 'canceled' ? ui.badge('Cancelada', 'warn') : ui.badge((x.user.billing === 'yearly' ? 'Anual' : 'Mensual') + ' · ' + u.money(x.mrr.toFixed ? Math.round(x.mrr * 100) / 100 : x.mrr) + '/mes', 'ok')) : '<span class="muted">—</span>') + '</td>' +
        '<td data-l="Prueba">' + (x.trial ? '<b class="' + (x.trialDays <= 3 ? 'text-warn' : '') + '">' + x.trialDays + ' días</b>' : '<span class="muted">' + ({ unused: 'Sin usar', expired: 'Vencida', converted: 'Convertida' }[x.user.trial.status] || '—') + '</span>') + '</td>' +
        '<td data-l="Catálogos" class="num">' + x.published + ' / ' + x.catalogs + '</td><td data-l="Productos" class="num">' + u.num(x.products) + '</td><td data-l="Registro">' + u.date(x.user.createdAt) + '</td><td data-l="Estado">' + statusBadge(x) + '</td>' +
        '<td class="actions"><button class="btn btn-sm btn-ghost" data-days="' + x.user.id + '" title="Otorgar días de prueba">' + I('plus') + 'Días</button>' +
        '<button class="btn btn-sm ' + (x.user.status === 'suspended' ? 'btn-ok' : 'btn-danger-ghost') + '" data-susp="' + x.user.id + '">' + (x.user.status === 'suspended' ? 'Activar' : 'Suspender') + '</button>' +
        (opts.plan ? '<button class="btn btn-sm btn-ghost" data-plan="' + x.user.id + '">Plan</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>';
  }
  function bindAccounts() {
    $$('[data-susp]').forEach((b) => (b.onclick = async () => {
      const usr = db().users.find((x) => x.id === b.dataset.susp);
      const suspend = usr.status !== 'suspended';
      if (suspend && !(await ui.confirm({ title: 'Suspender cuenta', message: 'Los catálogos de <b>' + esc(usr.business) + '</b> dejarán de estar visibles y la cuenta no podrá iniciar sesión.', confirmLabel: 'Suspender', danger: true }))) return;
      act((d) => { const x = d.users.find((y) => y.id === usr.id); x.status = suspend ? 'suspended' : 'active'; log(d, (suspend ? 'Cuenta suspendida: ' : 'Cuenta reactivada: ') + x.business); }, suspend ? 'Cuenta suspendida' : 'Cuenta activada');
    }));
    $$('[data-days]').forEach((b) => (b.onclick = () => {
      const usr = db().users.find((x) => x.id === b.dataset.days);
      ui.formDialog({
        title: 'Otorgar días de prueba', subtitle: esc(usr.business), icon: 'clock', size: 'sm', cols: 1, submitLabel: 'Otorgar',
        intro: 'Extiende la prueba Profesional (o la reactiva si ya venció). La cuenta recibirá una notificación.',
        fields: [{ name: 'days', label: 'Días adicionales', type: 'number', min: 1, max: 60, value: 7, required: true }],
        onSubmit: (v) => { CA.store.tx((d) => { CA.subscriptions.extendTrial(d, usr.id, v.days); log(d, '+' + v.days + ' días de prueba para ' + usr.business); }); ui.toast(v.days + ' días de prueba otorgados a ' + usr.business, 'success'); render(); }
      });
    }));
    $$('[data-plan]').forEach((b) => (b.onclick = () => {
      const usr = db().users.find((x) => x.id === b.dataset.plan);
      ui.formDialog({
        title: 'Cambiar plan', subtitle: esc(usr.business), icon: 'crown', size: 'sm', cols: 1, submitLabel: 'Aplicar',
        fields: [{ name: 'plan', label: 'Plan', type: 'select', value: usr.plan, options: CA.PLAN_ORDER.map((id) => ({ value: id, label: CA.PLANS[id].name })) }, { name: 'billing', label: 'Facturación', type: 'select', value: usr.billing, options: [{ value: 'monthly', label: 'Mensual' }, { value: 'yearly', label: 'Anual' }] }],
        onSubmit: (v) => { CA.store.tx((d) => { if (!d.workspaces[usr.id]) d.workspaces[usr.id] = CA.seed.newWorkspace(); CA.subscriptions.change(d, usr.id, v.plan, v.billing); log(d, 'Plan de ' + usr.business + ' cambiado a ' + CA.PLANS[v.plan].name); }); ui.toast('Plan actualizado', 'success'); render(); }
      });
    }));
  }

  function renderAccounts() {
    let list = all().filter((x) => {
      const q = F.q.trim().toLowerCase();
      if (q && !(x.user.business + ' ' + x.user.email + ' ' + x.user.name).toLowerCase().includes(q)) return false;
      if (F.plan && (F.plan === 'trial' ? !x.trial : x.trial || x.eff !== F.plan)) return false;
      if (F.status && x.user.status !== F.status) return false;
      return true;
    }).sort((a, b) => new Date(b.user.createdAt) - new Date(a.user.createdAt));
    view.innerHTML = '<div class="view-in"><div class="toolbar"><div class="search">' + I('search') + '<input id="aq" type="search" placeholder="Buscar negocio, titular o correo…" value="' + esc(F.q) + '"></div>' +
      '<select id="ap"><option value="">Todos los planes</option>' + CA.PLAN_ORDER.map((id) => '<option value="' + id + '"' + (F.plan === id ? ' selected' : '') + '>' + CA.PLANS[id].name + '</option>').join('') + '<option value="trial"' + (F.plan === 'trial' ? ' selected' : '') + '>En prueba</option></select>' +
      '<select id="as"><option value="">Todos los estados</option><option value="active"' + (F.status === 'active' ? ' selected' : '') + '>Activas</option><option value="suspended"' + (F.status === 'suspended' ? ' selected' : '') + '>Suspendidas</option></select><span class="pill">' + list.length + ' cuentas</span></div>' +
      (list.length ? accountsTable(list, { plan: true }) : '<div class="card">' + ui.empty('users', 'Sin resultados') + '</div>') + '</div>';
    $('#aq').addEventListener('input', u.debounce((e) => { F.q = e.target.value; renderAccounts(); const n = $('#aq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 220));
    $('#ap').onchange = (e) => { F.plan = e.target.value; renderAccounts(); };
    $('#as').onchange = (e) => { F.status = e.target.value; renderAccounts(); };
    bindAccounts();
  }

  function renderSubs() {
    const list = all().filter((x) => x.paid).sort((a, b) => b.mrr - a.mrr);
    const payments = db().users.flatMap((usr) => (usr.payments || []).map((p) => Object.assign({ business: usr.business }, p))).sort((a, b) => new Date(b.at) - new Date(a.at));
    view.innerHTML = '<div class="view-in"><div class="kpis adm-kpis">' + CA.PLAN_ORDER.filter((id) => id !== 'free').map((id) => { const l = list.filter((x) => x.user.plan === id); return kpi('crown', CA.PLANS[id].name, l.length, u.money(Math.round(l.reduce((a, x) => a + x.mrr, 0))) + ' MRR'); }).join('') + kpi('chart', 'Total MRR', u.money(Math.round(list.reduce((a, x) => a + x.mrr, 0))), list.length + ' suscripciones', 'ok') + '</div>' +
      '<div class="card" style="margin-top:16px"><div class="card-head"><h3>' + I('crown') + 'Suscripciones pagas</h3></div><div class="table-wrap stack"><table class="table"><thead><tr><th>Negocio</th><th>Plan</th><th>Facturación</th><th class="num">MRR</th><th>Desde</th><th>Renovación</th><th>Estado</th></tr></thead><tbody>' +
      list.map((x) => '<tr><td data-l="Negocio"><b>' + esc(x.user.business) + '</b><br><small class="muted">' + esc(x.user.email) + '</small></td><td data-l="Plan">' + CA.PLANS[x.user.plan].name + '</td><td data-l="Facturación">' + (x.user.billing === 'yearly' ? 'Anual · ' + u.money(CA.PLANS[x.user.plan].yearly) : 'Mensual · ' + u.money(CA.PLANS[x.user.plan].monthly)) + '</td><td data-l="MRR" class="num">' + u.money(Math.round(x.mrr * 100) / 100) + '</td><td data-l="Desde">' + u.date(x.user.subscription.since) + '</td><td data-l="Renovación">' + u.date(x.user.subscription.renewsAt) + '</td><td data-l="Estado">' + (x.user.subscription.status === 'canceled' ? ui.badge('Cancelada al renovar', 'warn') : ui.badge('Activa', 'ok')) + '</td></tr>').join('') + '</tbody></table></div></div>' +
      '<div class="card" style="margin-top:16px"><div class="card-head"><h3>' + I('receipt') + 'Últimos pagos</h3><span class="demo-tag">Simulados</span></div><div class="table-wrap stack"><table class="table"><thead><tr><th>Fecha</th><th>Negocio</th><th>Comprobante</th><th>Plan</th><th class="num">Monto</th></tr></thead><tbody>' +
      payments.slice(0, 15).map((p) => '<tr><td data-l="Fecha">' + u.date(p.at) + '</td><td data-l="Negocio">' + esc(p.business) + '</td><td data-l="Comprobante" class="mono">' + p.id + '</td><td data-l="Plan">' + CA.PLANS[p.plan].name + ' · ' + (p.billing === 'yearly' ? 'anual' : 'mensual') + '</td><td data-l="Monto" class="num">' + u.money(p.amount) + '</td></tr>').join('') + '</tbody></table></div></div></div>';
  }

  function renderTrials() {
    const list = all().filter((x) => x.trial).sort((a, b) => a.trialDays - b.trialDays);
    const expired = all().filter((x) => x.user.trial.status === 'expired' && !x.paid);
    view.innerHTML = '<div class="view-in"><div class="page-bar"><h3 style="margin:0">Pruebas activas <span class="pill">' + list.length + '</span></h3><span class="muted" style="font-size:.85rem">Duración: ' + CA.CONFIG.trialDays + ' días · se activa al publicar el primer catálogo</span></div>' +
      (list.length ? accountsTable(list) : '<div class="card">' + ui.empty('clock', 'Sin pruebas activas') + '</div>') +
      '<div class="page-bar" style="margin-top:24px"><h3 style="margin:0">Pruebas vencidas sin suscripción <span class="pill">' + expired.length + '</span></h3><span class="muted" style="font-size:.85rem">Candidatas para una campaña de reactivación</span></div>' +
      (expired.length ? accountsTable(expired) : '<div class="card">' + ui.empty('check', 'Ninguna') + '</div>') + '</div>';
    bindAccounts();
  }

  function renderPlans() {
    const d = db();
    const keys = [['products', 'Productos', 'number'], ['catalogs', 'Catálogos', 'number'], ['categories', 'Categorías (vacío = ilimitadas)', 'number'], ['whatsappNumbers', 'Números de WhatsApp', 'number'], ['syncMinutes', 'Sincronización (minutos)', 'number']];
    view.innerHTML = '<div class="view-in"><div class="alert alert-info" style="margin-bottom:16px">' + I('info') + '<p>Los cambios en los límites se aplican de inmediato a todas las cuentas del plan (en el panel y en los catálogos públicos). Útil para promociones o ajustes de oferta.</p></div>' +
      '<div class="card"><div class="card-head"><h3>' + I('sliders') + 'Límites por plan</h3><div style="display:flex;gap:8px"><button class="btn btn-sm btn-ghost" id="limReset">Restablecer valores</button><button class="btn btn-sm btn-primary" id="limSave">' + I('check') + 'Guardar límites</button></div></div>' +
      '<div class="table-wrap limits-table"><table class="table"><thead><tr><th>Límite</th>' + CA.PLAN_ORDER.map((id) => '<th>' + CA.PLANS[id].name + '</th>').join('') + '</tr></thead><tbody>' +
      keys.map((k) => '<tr><td>' + k[1] + '</td>' + CA.PLAN_ORDER.map((id) => { const v = CA.plans.limits(id, d)[k[0]]; return '<td><input type="number" min="1" data-lim="' + id + '|' + k[0] + '" value="' + (v == null ? '' : v) + '"></td>'; }).join('') + '</tr>').join('') +
      '<tr><td>Precio mensual</td>' + CA.PLAN_ORDER.map((id) => '<td>' + u.money(CA.PLANS[id].monthly) + '</td>').join('') + '</tr><tr><td>Precio anual</td>' + CA.PLAN_ORDER.map((id) => '<td>' + u.money(CA.PLANS[id].yearly) + '</td>').join('') + '</tr></tbody></table></div>' +
      '<p class="muted" style="font-size:.82rem;margin:10px 0 0">Los precios se definen en <span class="mono">data/plans.js</span>. Plantillas, personalización, página de producto, dominio y estadísticas siguen la configuración de cada plan.</p></div></div>';
    $('#limSave').onclick = () => {
      const ov = {};
      let bad = '';
      $$('[data-lim]').forEach((i) => {
        const [plan, key] = i.dataset.lim.split('|');
        const raw = i.value.trim();
        if (raw === '' && key !== 'categories') bad = 'Completa todos los límites (solo Categorías puede quedar vacío).';
        const n = raw === '' ? null : Math.floor(Number(raw));
        if (raw !== '' && !(n > 0)) bad = 'Los límites deben ser números mayores a cero.';
        (ov[plan] = ov[plan] || {})[key] = n;
      });
      if (bad) return ui.toast(bad, 'error');
      act((d2) => { d2.planOverrides = ov; log(d2, 'Límites por plan actualizados'); }, 'Límites guardados y aplicados');
    };
    $('#limReset').onclick = () => act((d2) => { d2.planOverrides = {}; log(d2, 'Límites restablecidos a los valores de fábrica'); }, 'Límites restablecidos');
  }

  function renderLog() {
    const l = db().adminLog || [];
    view.innerHTML = '<div class="view-in"><div class="card"><div class="card-head"><h3>' + I('history') + 'Acciones del administrador</h3></div>' +
      (l.length ? '<ul class="feed">' + l.map((x) => '<li><span class="nm-dot info"></span><div><b>' + esc(x.text) + '</b></div><time>' + u.dateTime(x.at) + '</time></li>').join('') + '</ul>' : ui.empty('history', 'Sin acciones todavía', 'Suspende una cuenta, otorga días de prueba o cambia límites para verlas aquí.')) + '</div></div>';
  }

  window.addEventListener('hashchange', () => { ui.closeAll(); render(); });
  CA.store.on((o) => { if (o === 'external' && !document.querySelector('.modal-wrap')) render(); });
  render();
})();
