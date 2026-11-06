/*
 * Suscripciones simuladas: cambio de plan, cancelación, pagos ficticios y prueba gratuita.
 * No hay cobros reales.
 */
(function () {
  'use strict';
  const CA = (window.CA = window.CA || {});
  const u = CA.util;
  const S = (CA.subscriptions = {});

  S.price = (planId, billing) => (billing === 'yearly' ? CA.PLANS[planId].yearly : CA.PLANS[planId].monthly);

  /** Cambia el plan de inmediato. Los planes pagos registran un pago simulado. */
  S.change = function (db, userId, planId, billing) {
    const user = db.users.find((x) => x.id === userId);
    if (!CA.PLANS[planId]) throw new CA.BizError('Plan no válido.');
    billing = billing === 'yearly' ? 'yearly' : 'monthly';
    const now = CA.now();
    const ws = db.workspaces[userId];
    if (planId === 'free') {
      user.plan = 'free';
      user.subscription = { status: 'none' };
      if (user.trial.status === 'active') { user.trial.status = 'expired'; user.trial.expiredAt = now.toISOString(); }
      CA.notify(ws, 'info', 'Cambiaste al plan Gratis', 'Tus datos se conservan. Los límites del plan Gratis se aplican desde ahora.', 'suscripcion');
      return user;
    }
    const amount = S.price(planId, billing);
    user.plan = planId;
    user.billing = billing;
    user.subscription = { status: 'active', since: now.toISOString(), renewsAt: u.addMonths(now, billing === 'yearly' ? 12 : 1).toISOString() };
    if (user.trial.status === 'active') user.trial.status = 'converted';
    if (user.trial.status === 'unused') user.trial.status = 'converted';
    user.payments = user.payments || [];
    user.payments.unshift({ id: 'PAG-' + u.rand(6, '0123456789'), at: now.toISOString(), plan: planId, billing, amount, status: 'Pagado (simulado)', method: 'Pago de demostración' });
    CA.notify(ws, 'ok', 'Plan ' + CA.PLANS[planId].name + ' activo', 'Suscripción ' + (billing === 'yearly' ? 'anual' : 'mensual') + ' de ' + u.money(amount) + '. Los nuevos límites ya están vigentes.', 'suscripcion');
    return user;
  };

  /** Cancela la renovación: el plan sigue activo hasta la fecha de renovación. */
  S.cancel = function (db, userId) {
    const user = db.users.find((x) => x.id === userId);
    if (!CA.plans.paidActive(user) || user.subscription.status !== 'active') throw new CA.BizError('No tienes una suscripción activa para cancelar.');
    user.subscription.status = 'canceled';
    user.subscription.canceledAt = CA.now().toISOString();
    CA.notify(db.workspaces[userId], 'warn', 'Suscripción cancelada', 'Mantienes ' + CA.PLANS[user.plan].name + ' hasta el ' + u.date(user.subscription.renewsAt) + '. Luego pasarás al plan Gratis sin perder datos.', 'suscripcion');
    return user;
  };
  S.resume = function (db, userId) {
    const user = db.users.find((x) => x.id === userId);
    if (!user.subscription || user.subscription.status !== 'canceled') throw new CA.BizError('La suscripción no está cancelada.');
    user.subscription.status = 'active';
    delete user.subscription.canceledAt;
    return user;
  };

  /** Botón de demostración: termina la prueba ahora mismo. */
  S.expireTrialNow = function (db, userId) {
    const user = db.users.find((x) => x.id === userId);
    if (user.trial.status !== 'active') throw new CA.BizError('No hay una prueba activa.');
    user.trial.endsAt = new Date(CA.now().getTime() - 60000).toISOString();
    CA.plans.refresh(db);
    return user;
  };

  /** Superadministrador: agrega días de prueba (reactiva una prueba vencida). */
  S.extendTrial = function (db, userId, days) {
    const user = db.users.find((x) => x.id === userId);
    days = Math.floor(Number(days));
    if (!(days > 0 && days <= 60)) throw new CA.BizError('Indique entre 1 y 60 días.', 'days');
    const now = CA.now();
    if (user.trial.status === 'active' && new Date(user.trial.endsAt) > now) user.trial.endsAt = u.addDays(user.trial.endsAt, days).toISOString();
    else user.trial = { status: 'active', startedAt: (user.trial.startedAt || now.toISOString()), endsAt: u.addDays(now, days).toISOString(), extraDays: 0 };
    user.trial.extraDays = (user.trial.extraDays || 0) + days;
    if (db.workspaces[userId]) CA.notify(db.workspaces[userId], 'ok', 'Recibiste ' + days + ' días extra de prueba', 'Tu prueba Profesional ahora vence el ' + u.date(user.trial.endsAt) + '.', 'suscripcion');
    return user;
  };

  /** Uso actual frente a los límites del plan vigente. */
  S.usage = function (db, user) {
    const ws = db.workspaces[user.id];
    const l = CA.plans.effectiveLimits(user, db);
    const valid = (ws.products || []).filter((p) => p.sync !== 'error');
    const cats = CA.products.categories(valid);
    return [
      { label: 'Productos', used: valid.length, max: l.products },
      { label: 'Catálogos', used: (ws.catalogs || []).length, max: l.catalogs },
      { label: 'Categorías', used: cats.length, max: l.categories },
      { label: 'Números de WhatsApp', used: Math.max(...(ws.catalogs || []).map((c) => c.whatsapp.numbers.filter((n) => n.number).length), 0), max: l.whatsappNumbers }
    ];
  };
})();
