/*
 * Mi suscripción: plan actual, uso de límites, prueba gratuita, cambio de plan,
 * cancelación e historial de pagos simulados.
 */
(function () {
  'use strict';
  const CA = window.CA, D = CA.dash;
  const u = CA.util, ui = CA.ui, esc = u.esc, I = ui.icon;
  const $ = ui.$, $$ = ui.$$;
  let billing = null;

  D.view('suscripcion', { title: 'Mi suscripción', icon: 'crown', sub: 'Plan, límites y pagos', render });

  function render(el, params) {
    const db = D.db(), user = D.user();
    const eff = CA.plans.effective(user);
    const paid = CA.plans.paidActive(user);
    const trial = CA.plans.trialActive(user) && !paid;
    if (!billing) billing = user.billing || 'monthly';
    const highlight = params.get('plan');
    const usage = CA.subscriptions.usage(db, user);
    const over = usage.filter((x) => x.max != null && x.used > x.max);
    const statusLbl = paid ? (user.subscription.status === 'canceled' ? ['Cancelada · activa hasta el ' + u.date(user.subscription.renewsAt), 'warn'] : ['Activa', 'ok']) : trial ? ['Prueba gratuita', 'accent'] : ['Plan gratuito', 'neutral'];
    const price = paid ? CA.subscriptions.price(user.plan, user.billing) : 0;
    el.innerHTML = '<div class="view-in">' +
      (over.length ? '<div class="alert alert-warn" style="margin-bottom:14px">' + I('alert') + '<p><b>Superas los límites de tu plan actual:</b> ' + over.map((x) => x.label.toLowerCase() + ' (' + x.used + ' de ' + x.max + ')').join(', ') + '. Tus datos se conservan, pero lo que excede no se muestra en los catálogos públicos.</p></div>' : '') +
      '<div class="sub-grid"><div class="card sub-current"><div class="card-head"><h3>' + I('crown') + 'Plan actual</h3>' + ui.badge(statusLbl[0], statusLbl[1]) + '</div>' +
      '<div class="sub-plan"><b>' + CA.plans.label(user) + '</b><span>' + (paid ? u.money(price) + (user.billing === 'yearly' ? ' / año' : ' / mes') : trial ? 'Gratis durante la prueba' : u.money(0) + ' · para siempre') + '</span></div>' +
      '<dl class="kv"><dt>Estado</dt><dd>' + statusLbl[0] + '</dd>' +
      (paid ? '<dt>Facturación</dt><dd>' + (user.billing === 'yearly' ? 'Anual' : 'Mensual') + '</dd><dt>' + (user.subscription.status === 'canceled' ? 'Termina el' : 'Próxima renovación') + '</dt><dd>' + u.date(user.subscription.renewsAt) + '</dd>' : '') +
      (trial ? '<dt>Prueba Profesional</dt><dd>' + CA.plans.trialDaysLeft(user) + ' días restantes</dd><dt>Termina el</dt><dd>' + u.date(user.trial.endsAt) + '</dd>' : '') +
      (!paid && !trial ? '<dt>Prueba Profesional</dt><dd>' + ({ unused: 'Se activa al publicar tu primer catálogo', expired: 'Finalizada', converted: 'Utilizada' }[user.trial.status] || '—') + '</dd>' : '') + '</dl>' +
      '<div class="sub-actions">' + (paid && user.subscription.status === 'active' ? '<button class="btn btn-danger-ghost btn-sm" id="subCancel">Cancelar suscripción</button>' : '') + (paid && user.subscription.status === 'canceled' ? '<button class="btn btn-primary btn-sm" id="subResume">Reanudar suscripción</button>' : '') +
      (eff !== 'free' ? '<button class="btn btn-ghost btn-sm" id="subFree">Pasar al plan Gratis</button>' : '') + '</div>' +
      (trial ? '<div class="trial-box"><div class="trial-count"><b>' + CA.plans.trialDaysLeft(user) + '</b><span>días</span></div><div><b>Prueba Profesional en curso</b><p>Sin tarjeta. Al terminar vuelves a Gratis si no eliges un plan; tus datos se conservan.</p><div class="progress"><i style="width:' + Math.round(((CA.CONFIG.trialDays - CA.plans.trialDaysLeft(user)) / CA.CONFIG.trialDays) * 100) + '%"></i></div>' +
        '<button class="btn btn-sm btn-ghost" id="expireTrial" style="margin-top:10px">' + I('clock') + 'Simular fin de la prueba <span class="demo-tag">Demo</span></button></div></div>' : '') +
      '</div>' +
      '<div class="card"><div class="card-head"><h3>' + I('sliders') + 'Uso del plan</h3></div><div class="usage">' + usage.map((x) => {
        const pct = x.max == null ? 0 : Math.min(100, Math.round((x.used / x.max) * 100));
        return '<div class="use-row"><div class="use-top"><span>' + x.label + '</span><b>' + u.num(x.used) + ' / ' + (x.max == null ? '∞' : u.num(x.max)) + '</b></div><div class="progress ' + (pct >= 100 ? 'bad' : pct >= 80 ? 'warn' : '') + '"><i style="width:' + (x.max == null ? 4 : Math.max(2, pct)) + '%"></i></div></div>';
      }).join('') + '</div>' +
      '<dl class="kv" style="margin-top:14px">' + CA.PLAN_FEATURES.slice(5).map((f) => { const v = f[1](D.limits()); return '<dt>' + f[0] + '</dt><dd>' + (v === true ? '<span class="text-ok">Incluido</span>' : v === false ? '<span class="muted">No incluido</span>' : esc(v)) + '</dd>'; }).join('') + '</dl></div></div>' +
      '<div class="card" style="margin-top:16px"><div class="card-head"><h3>' + I('layout') + 'Cambiar plan</h3><div class="ed-seg"><button class="' + (billing === 'monthly' ? 'on' : '') + '" data-bill="monthly">Mensual</button><button class="' + (billing === 'yearly' ? 'on' : '') + '" data-bill="yearly">Anual · 2 meses gratis</button></div></div>' +
      '<div class="plan-cards">' + CA.PLAN_ORDER.map((id) => {
        const p = CA.PLANS[id], l = CA.plans.limits(id);
        const current = (paid && user.plan === id && user.billing === billing) || (!paid && id === 'free' && !trial);
        return '<div class="pc' + (p.recommended ? ' rec' : '') + (highlight === id ? ' hl' : '') + (current ? ' cur' : '') + '">' + (p.recommended ? '<span class="pc-tag">Recomendado</span>' : '') +
          '<h4>' + p.name + '</h4><div class="pc-price"><b>' + u.money(billing === 'yearly' ? p.yearly : p.monthly) + '</b><span>' + (id === 'free' ? '' : billing === 'yearly' ? '/año' : '/mes') + '</span></div>' +
          '<ul><li>' + u.num(l.products) + ' productos</li><li>' + l.catalogs + ' catálogo(s)</li><li>' + (l.templates === 'all' ? 'Todas las plantillas' : l.templates.length + ' plantilla(s)') + '</li><li>Personalización ' + ({ none: 'no incluida', basic: 'básica', full: 'completa' }[l.customization]) + '</li><li>Estadísticas ' + ({ none: 'no incluidas', basic: 'básicas', advanced: 'avanzadas' }[l.stats]) + '</li></ul>' +
          (current ? '<button class="btn btn-ghost btn-block" disabled>Plan actual</button>' : '<button class="btn ' + (p.recommended ? 'btn-primary' : 'btn-ghost') + ' btn-block" data-plan="' + id + '">' + (id === 'free' ? 'Cambiar a Gratis' : 'Elegir ' + p.name) + '</button>') + '</div>';
      }).join('') + '</div></div>' +
      '<div class="card" style="margin-top:16px"><div class="card-head"><h3>' + I('receipt') + 'Historial de pagos</h3><span class="demo-tag">Simulado</span></div>' +
      ((user.payments || []).length ? '<div class="table-wrap stack"><table class="table"><thead><tr><th>Fecha</th><th>Comprobante</th><th>Plan</th><th>Periodo</th><th class="num">Monto</th><th>Estado</th></tr></thead><tbody>' +
        user.payments.map((p) => '<tr><td data-l="Fecha">' + u.date(p.at) + '</td><td data-l="Comprobante" class="mono">' + p.id + '</td><td data-l="Plan">' + CA.PLANS[p.plan].name + '</td><td data-l="Periodo">' + (p.billing === 'yearly' ? 'Anual' : 'Mensual') + '</td><td data-l="Monto" class="num">' + u.money(p.amount) + '</td><td data-l="Estado">' + ui.badge(p.status, 'ok') + '</td></tr>').join('') + '</tbody></table></div>'
        : ui.empty('receipt', 'Sin pagos registrados', 'Los pagos simulados aparecerán aquí cuando elijas un plan pago.')) + '</div></div>';

    $$('[data-bill]', el).forEach((b) => (b.onclick = () => { billing = b.dataset.bill; render(el, params); }));
    $$('[data-plan]', el).forEach((b) => (b.onclick = () => choose(b.dataset.plan)));
    const c = $('#subCancel'); if (c) c.onclick = async () => {
      if (!(await ui.confirm({ title: 'Cancelar suscripción', message: 'Mantendrás el plan <b>' + CA.PLANS[user.plan].name + '</b> hasta el <b>' + u.date(user.subscription.renewsAt) + '</b>. Después pasarás al plan Gratis sin perder tus datos.', confirmLabel: 'Cancelar suscripción', danger: true }))) return;
      D.act((d2, uid) => CA.subscriptions.cancel(d2, uid), 'Suscripción cancelada');
    };
    const r = $('#subResume'); if (r) r.onclick = () => D.act((d2, uid) => CA.subscriptions.resume(d2, uid), 'Suscripción reanudada');
    const f = $('#subFree'); if (f) f.onclick = () => choose('free');
    const ex = $('#expireTrial'); if (ex) ex.onclick = async () => {
      if (!(await ui.confirm({ title: 'Simular fin de la prueba', message: 'La prueba Profesional terminará ahora. Volverás al plan Gratis: verás cómo se aplican los límites (30 productos, 1 catálogo, plantilla Nova, 3 categorías) sin perder datos.', confirmLabel: 'Terminar prueba ahora' }))) return;
      D.act((d2, uid) => CA.subscriptions.expireTrialNow(d2, uid), 'La prueba terminó. Ahora estás en el plan Gratis.');
    };
  }

  function choose(planId) {
    const user = D.user();
    if (planId === 'free') {
      return ui.confirm({ title: 'Cambiar al plan Gratis', message: 'Los límites del plan Gratis se aplican de inmediato (30 productos, 1 catálogo, 1 plantilla, 3 categorías). Tus datos y diseños se conservan.', confirmLabel: 'Cambiar a Gratis', danger: true })
        .then((ok) => { if (ok) D.act((db, uid) => CA.subscriptions.change(db, uid, 'free'), 'Ahora estás en el plan Gratis'); });
    }
    const p = CA.PLANS[planId], amount = CA.subscriptions.price(planId, billing);
    const lim = CA.plans.limits(planId);
    ui.modal({
      title: 'Cambiar a ' + p.name, icon: 'crown', size: 'sm',
      body: '<dl class="kv"><dt>Plan</dt><dd>' + p.name + '</dd><dt>Facturación</dt><dd>' + (billing === 'yearly' ? 'Anual' : 'Mensual') + '</dd><dt>Total</dt><dd>' + u.money(amount) + '</dd><dt>Productos</dt><dd>' + u.num(lim.products) + '</dd><dt>Catálogos</dt><dd>' + lim.catalogs + '</dd></dl>' +
        '<div class="alert alert-warn" style="margin-top:14px">' + I('info') + '<p><b>Pago simulado.</b> No se solicita tarjeta ni se realiza ningún cobro. Los nuevos límites se aplican de inmediato.</p></div>',
      actions: [{ label: 'Cancelar', cls: 'btn-ghost' }, { label: 'Confirmar cambio', cls: 'btn-primary', id: 'confirm-plan', onClick: () => { D.act((db, uid) => CA.subscriptions.change(db, uid, planId, billing), 'Plan ' + p.name + ' activo. Límites actualizados.'); } }]
    });
  }
})();
