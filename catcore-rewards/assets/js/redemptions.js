/*
 * CorePoints · redemptions.js
 * Canjes: al solicitar se reservan los puntos (FEFO) y el stock; al aprobar se
 * descuentan definitivamente; al rechazar o cancelar se liberan.
 *
 * Flujo de estados:
 *   pendiente → aprobado → listo → entregado
 *   pendiente → rechazado
 *   pendiente | aprobado | listo → cancelado
 */
(function () {
  'use strict';
  const CP = (window.CP = window.CP || {});
  const u = CP.util;

  const STATUS = {
    pendiente: { label: 'Pendiente', tone: 'warn', desc: 'Puntos reservados, esperando aprobación de CatCore.' },
    aprobado: { label: 'Aprobado', tone: 'info', desc: 'Canje aprobado. Puntos descontados.' },
    listo: { label: 'Listo para recoger', tone: 'accent', desc: 'Pasa por la tienda con tu código de canje.' },
    entregado: { label: 'Entregado', tone: 'ok', desc: 'Recompensa entregada.' },
    rechazado: { label: 'Rechazado', tone: 'bad', desc: 'Los puntos reservados fueron devueltos.' },
    cancelado: { label: 'Cancelado', tone: 'neutral', desc: 'Los puntos fueron devueltos.' }
  };
  const TRANSITIONS = {
    aprobar: { from: ['pendiente'], to: 'aprobado', label: 'Aprobar' },
    rechazar: { from: ['pendiente'], to: 'rechazado', label: 'Rechazar', needsReason: true },
    listo: { from: ['aprobado'], to: 'listo', label: 'Marcar listo para recoger' },
    entregar: { from: ['aprobado', 'listo'], to: 'entregado', label: 'Marcar entregado' },
    cancelar: { from: ['pendiente', 'aprobado', 'listo'], to: 'cancelado', label: 'Cancelar', needsReason: true }
  };

  const R = (CP.redemptions = { STATUS, TRANSITIONS });
  const at = (opt) => (opt && opt.at ? u.toDate(opt.at) : CP.now());

  R.get = (db, id) => db.redemptions.find((r) => r.id === id) || null;
  R.can = (r, action) => !!TRANSITIONS[action] && TRANSITIONS[action].from.includes(r.status);
  R.actions = (r) => Object.keys(TRANSITIONS).filter((a) => R.can(r, a));

  /** Verifica si el cliente puede canjear la recompensa; devuelve '' o el motivo. */
  R.check = function (db, cid, rewardId, now) {
    const rw = CP.rewards.get(db, rewardId);
    if (!db.config.redemptionsEnabled) return 'Los canjes están temporalmente deshabilitados.';
    if (!rw || !rw.active) return 'Esta recompensa no está disponible.';
    if (!CP.rewards.inStock(rw)) return 'Recompensa agotada.';
    const avail = CP.points.available(db, cid, now);
    if (avail < rw.cost) return 'Te faltan ' + u.num(rw.cost - avail) + ' CorePoints.';
    return '';
  };

  R.request = function (db, cid, rewardId, opt) {
    const now = at(opt);
    const c = CP.customers.get(db, cid);
    if (!c) throw new CP.BizError('Cliente no encontrado.');
    const why = R.check(db, cid, rewardId, now);
    if (why) throw new CP.BizError(why);
    const rw = CP.rewards.get(db, rewardId);
    const before = CP.points.available(db, cid, now);
    const allocations = CP.points.consume(db, cid, rw.cost, now);
    if (rw.stock != null) rw.stock -= 1;
    const red = {
      id: u.uid('RED', 8, (id) => db.redemptions.some((x) => x.id === id)),
      code: 'CNJ-' + u.rand(4) + '-' + u.rand(2, '0123456789'),
      customerId: cid,
      rewardId: rw.id,
      rewardName: rw.name,        // copia por si la recompensa cambia después
      rewardType: rw.type,
      points: rw.cost,
      stockReserved: rw.stock != null,
      allocations,
      balanceBefore: before,
      status: 'pendiente',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      history: [{ status: 'pendiente', at: now.toISOString(), by: (opt && opt.actor) || 'cliente', note: rw.cost + ' pts reservados' }]
    };
    db.redemptions.push(red);
    CP.points.addMovement(db, { customerId: cid, type: 'reserva', points: -rw.cost, refType: 'canje', refId: red.id, note: rw.name + ' · ' + red.code, at: now, actor: (opt && opt.actor) || 'cliente' });
    CP.notifications.push(db, 'canje_solicitado', { customerId: cid, redemptionId: red.id, at: now });
    return red;
  };

  /** Aplica una transición de estado validando el flujo. */
  R.transition = function (db, id, action, o, opt) {
    const now = at(opt);
    o = o || {};
    const r = R.get(db, id);
    if (!r) throw new CP.BizError('Canje no encontrado.');
    const t = TRANSITIONS[action];
    if (!t) throw new CP.BizError('Acción no válida.');
    if (!t.from.includes(r.status)) {
      const msg = {
        aprobar: r.status === 'aprobado' || r.status === 'listo' || r.status === 'entregado' ? 'Este canje ya fue aprobado.' : 'Solo se aprueban canjes pendientes.',
        entregar: r.status === 'pendiente' ? 'No se puede entregar una recompensa sin aprobar el canje.' : 'El canje está ' + STATUS[r.status].label.toLowerCase() + '.',
        listo: r.status === 'pendiente' ? 'Primero apruebe el canje.' : 'El canje está ' + STATUS[r.status].label.toLowerCase() + '.'
      }[action];
      throw new CP.BizError(msg || 'No se puede ' + t.label.toLowerCase() + ' un canje ' + STATUS[r.status].label.toLowerCase() + '.');
    }
    const note = String(o.note || '').trim();
    if (t.needsReason && note.length < 5) throw new CP.BizError('Indique el motivo (mínimo 5 caracteres).', 'note');
    const actor = o.actor || 'admin';
    const prev = r.status;
    const rw = CP.rewards.get(db, r.rewardId);

    if (action === 'aprobar') {
      r.approvedAt = now.toISOString();
      CP.points.addMovement(db, { customerId: r.customerId, type: 'canje', points: 0, amount: r.points, refType: 'canje', refId: r.id, note: r.rewardName + ' · ' + r.points + ' pts descontados definitivamente', at: now, actor });
      CP.notifications.push(db, 'canje_aprobado', { customerId: r.customerId, redemptionId: r.id, at: now });
    }
    if (action === 'listo') {
      r.readyAt = now.toISOString();
      CP.notifications.push(db, 'canje_listo', { customerId: r.customerId, redemptionId: r.id, at: now });
    }
    if (action === 'entregar') {
      r.deliveredAt = now.toISOString();
      CP.notifications.push(db, 'canje_entregado', { customerId: r.customerId, redemptionId: r.id, at: now });
    }
    if (action === 'rechazar' || action === 'cancelar') {
      CP.points.restore(db, r.allocations);
      if (r.stockReserved && rw && rw.stock != null) rw.stock += 1;
      const type = prev === 'pendiente' ? 'liberacion' : 'devolucion';
      CP.points.addMovement(db, { customerId: r.customerId, type, points: r.points, refType: 'canje', refId: r.id, note: r.rewardName + ' · ' + (action === 'rechazar' ? 'canje rechazado' : 'canje cancelado'), at: now, actor });
      r.closedReason = note;
      CP.notifications.push(db, action === 'rechazar' ? 'canje_rechazado' : 'canje_cancelado', { customerId: r.customerId, redemptionId: r.id, reason: note, at: now });
    }
    r.status = t.to;
    r.updatedAt = now.toISOString();
    r.history.push({ status: t.to, at: now.toISOString(), by: actor, note });
    return r;
  };
})();
