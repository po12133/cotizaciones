/*
 * CorePoints · points.js
 * Libro de puntos: cada acreditación es un "lote" con su propia fecha de vencimiento.
 *  - Los canjes y ajustes negativos consumen primero los lotes que vencen antes (FEFO).
 *  - Un lote vencido deja de contar para el saldo disponible aunque el proceso de
 *    vencimiento todavía no se haya ejecutado; el proceso lo registra en el historial.
 *  - Cada cambio genera un movimiento auditable con el saldo resultante.
 *
 * Todas las funciones que modifican datos reciben la BD (borrador de CP.store.tx).
 */
(function () {
  'use strict';
  const CP = (window.CP = window.CP || {});
  const u = CP.util;

  const MOVEMENT_TYPES = {
    acreditacion: { label: 'Acreditación por compra', tone: 'ok' },
    bono: { label: 'Bono primera compra', tone: 'ok' },
    reserva: { label: 'Reserva por canje', tone: 'warn' },
    liberacion: { label: 'Puntos liberados', tone: 'info' },
    canje: { label: 'Canje confirmado', tone: 'accent' },
    devolucion: { label: 'Devolución de canje', tone: 'info' },
    vencimiento: { label: 'Vencimiento', tone: 'bad' },
    ajuste: { label: 'Ajuste manual', tone: 'neutral' }
  };

  const at = (opt) => (opt && opt.at ? u.toDate(opt.at) : CP.now());
  const iso = (d) => u.toDate(d).toISOString();

  const P = (CP.points = { MOVEMENT_TYPES });

  /** Puntos de una compra según la configuración vigente (redondeo hacia abajo). */
  P.calc = function (amount, config, isFirst) {
    amount = Number(amount) || 0;
    const base = amount >= config.minPurchase ? Math.floor(amount / config.bsPerPoint) : 0;
    const bonus = isFirst && base > 0 ? Math.max(0, Math.floor(Number(config.firstPurchaseBonus) || 0)) : 0;
    return { base, bonus, total: base + bonus, belowMin: amount > 0 && amount < config.minPurchase };
  };

  P.lotsOf = (db, cid) => db.lots.filter((l) => l.customerId === cid);
  const live = (l, now) => new Date(l.expiresAt) > now;

  /** Saldo disponible: lotes vigentes con remanente. */
  P.available = function (db, cid, now) {
    now = now || CP.now();
    return P.lotsOf(db, cid).reduce((a, l) => a + (live(l, now) ? l.remaining : 0), 0);
  };

  /** Resumen completo de la cuenta. */
  P.balance = function (db, cid, now) {
    now = now || CP.now();
    const cfg = db.config;
    const lots = P.lotsOf(db, cid);
    const warnLimit = u.addDays(now, cfg.expiryWarnDays);
    let available = 0, expired = 0, expiring = 0, earned = 0;
    const expiringLots = [];
    lots.forEach((l) => {
      earned += l.points;
      expired += l.expiredPts || 0;
      if (live(l, now)) {
        available += l.remaining;
        if (l.remaining > 0 && new Date(l.expiresAt) <= warnLimit) { expiring += l.remaining; expiringLots.push(l); }
      } else {
        expired += l.remaining; // vencido aunque el proceso aún no lo haya registrado
      }
    });
    const reds = db.redemptions.filter((r) => r.customerId === cid);
    const reserved = reds.filter((r) => r.status === 'pendiente').reduce((a, r) => a + r.points, 0);
    const used = reds.filter((r) => ['aprobado', 'listo', 'entregado'].includes(r.status)).reduce((a, r) => a + r.points, 0);
    const adjustedOut = db.movements.filter((m) => m.customerId === cid && m.type === 'ajuste' && m.points < 0).reduce((a, m) => a - m.points, 0);
    // Puntos estimados de compras en revisión (con la configuración actual)
    const approvedBefore = db.purchases.some((p) => p.customerId === cid && p.status === 'aprobada');
    let pending = 0;
    db.purchases.filter((p) => p.customerId === cid && p.status === 'pendiente')
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .forEach((p, i) => { pending += P.calc(p.amount, cfg, !approvedBefore && i === 0).total; });
    expiringLots.sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt));
    return {
      available, reserved, used, expired, expiring, pending, earned, adjustedOut,
      nextExpiry: expiringLots[0] ? { date: expiringLots[0].expiresAt, points: expiringLots[0].remaining } : null,
      expiringLots
    };
  };

  P.addMovement = function (db, m) {
    const now = m.at ? u.toDate(m.at) : CP.now();
    const mov = {
      id: u.uid('MOV', 10),
      customerId: m.customerId,
      type: m.type,
      points: m.points,             // efecto sobre el saldo disponible (+/−)
      amount: m.amount != null ? m.amount : Math.abs(m.points), // magnitud informativa
      refType: m.refType || null,
      refId: m.refId || null,
      lotId: m.lotId || null,
      note: m.note || '',
      actor: m.actor || 'sistema',
      at: iso(now),
      balanceAfter: P.available(db, m.customerId, now)
    };
    db.movements.push(mov);
    return mov;
  };

  /** Crea un lote de puntos con vencimiento según la configuración vigente. */
  P.credit = function (db, o) {
    const now = at(o);
    const pts = Math.floor(Number(o.points) || 0);
    if (pts <= 0) return null;
    const lot = {
      id: u.uid('LOT', 10),
      customerId: o.customerId,
      purchaseId: o.purchaseId || null,
      source: o.source, // compra | bono | ajuste
      points: pts,
      remaining: pts,
      expiredPts: 0,
      creditedAt: iso(now),
      expiresAt: iso(u.addMonths(now, db.config.validityMonths)),
      validityMonths: db.config.validityMonths,
      warnedAt: null,
      expiredAt: null
    };
    db.lots.push(lot);
    P.addMovement(db, {
      customerId: o.customerId, type: o.source === 'compra' ? 'acreditacion' : o.source === 'bono' ? 'bono' : 'ajuste',
      points: pts, refType: o.refType || (o.purchaseId ? 'compra' : null), refId: o.refId || o.purchaseId,
      lotId: lot.id, note: o.note, actor: o.actor, at: now
    });
    return lot;
  };

  /** Toma puntos de los lotes vigentes que vencen primero. Devuelve las asignaciones. */
  P.consume = function (db, cid, points, now) {
    now = now || CP.now();
    points = Math.floor(Number(points) || 0);
    const available = P.available(db, cid, now);
    if (points <= 0) throw new CP.BizError('La cantidad de puntos debe ser mayor a cero.');
    if (available < points) throw new CP.BizError('Saldo insuficiente: disponible ' + u.num(available) + ' pts, se requieren ' + u.num(points) + ' pts.');
    const lots = P.lotsOf(db, cid).filter((l) => l.remaining > 0 && live(l, now))
      .sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt) || new Date(a.creditedAt) - new Date(b.creditedAt));
    const allocations = [];
    let left = points;
    for (const l of lots) {
      if (!left) break;
      const take = Math.min(l.remaining, left);
      l.remaining -= take;
      left -= take;
      allocations.push({ lotId: l.id, points: take, expiresAt: l.expiresAt });
    }
    return allocations;
  };

  /** Devuelve puntos a sus lotes de origen (canje rechazado o cancelado). */
  P.restore = function (db, allocations) {
    (allocations || []).forEach((a) => {
      const lot = db.lots.find((l) => l.id === a.lotId);
      if (lot) lot.remaining += a.points;
    });
  };

  /** Ajuste manual con motivo obligatorio. */
  P.adjust = function (db, o) {
    const now = at(o);
    const delta = Math.trunc(Number(o.delta) || 0);
    const reason = String(o.reason || '').trim();
    if (!delta) throw new CP.BizError('Indique una cantidad distinta de cero.', 'delta');
    if (reason.length < 5) throw new CP.BizError('El motivo es obligatorio (mínimo 5 caracteres).', 'reason');
    if (!db.customers.some((c) => c.id === o.customerId)) throw new CP.BizError('Cliente no encontrado.');
    if (delta > 0) {
      P.credit(db, { customerId: o.customerId, source: 'ajuste', points: delta, note: reason, actor: o.actor || 'admin', at: now, refType: 'ajuste' });
    } else {
      const alloc = P.consume(db, o.customerId, -delta, now);
      P.addMovement(db, { customerId: o.customerId, type: 'ajuste', points: delta, note: reason, actor: o.actor || 'admin', at: now, refType: 'ajuste', lotId: alloc.map((a) => a.lotId).join(',') });
    }
    CP.notifications.push(db, 'ajuste', { customerId: o.customerId, delta, reason, at: now });
  };

  /**
   * Proceso de vencimiento: registra los lotes vencidos y envía avisos de puntos por vencer.
   * Devuelve { expiredLots, expiredPoints, customers, warned }.
   */
  P.runExpiry = function (db, opt) {
    const now = at(opt);
    const res = { expiredLots: 0, expiredPoints: 0, customers: new Set(), warned: 0 };
    db.lots.filter((l) => !live(l, now) && l.remaining > 0)
      .sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt))
      .forEach((l) => {
        const pts = l.remaining;
        l.expiredPts = (l.expiredPts || 0) + pts;
        l.remaining = 0;
        l.expiredAt = iso(now);
        res.expiredLots++; res.expiredPoints += pts; res.customers.add(l.customerId);
        P.addMovement(db, { customerId: l.customerId, type: 'vencimiento', points: -pts, lotId: l.id, refType: 'lote', refId: l.id, note: 'Venció el ' + u.date(l.expiresAt), at: now });
        CP.notifications.push(db, 'puntos_vencidos', { customerId: l.customerId, points: pts, expiresAt: l.expiresAt, at: now });
      });
    // Avisos de vencimiento (uno por cliente, agrupando sus lotes próximos a vencer)
    const limit = u.addDays(now, db.config.expiryWarnDays);
    const byCustomer = {};
    db.lots.filter((l) => live(l, now) && l.remaining > 0 && !l.warnedAt && new Date(l.expiresAt) <= limit)
      .forEach((l) => { (byCustomer[l.customerId] = byCustomer[l.customerId] || []).push(l); });
    Object.keys(byCustomer).forEach((cid) => {
      const lots = byCustomer[cid].sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt));
      lots.forEach((l) => { l.warnedAt = iso(now); });
      CP.notifications.push(db, 'puntos_por_vencer', {
        customerId: cid, points: lots.reduce((a, l) => a + l.remaining, 0), expiresAt: lots[0].expiresAt, at: now
      });
      res.warned++;
    });
    res.customers = res.customers.size;
    db.meta.lastExpiryRun = iso(now);
    return res;
  };

  /** Totales del programa (dashboard). */
  P.totals = function (db, now) {
    now = now || CP.now();
    let granted = 0, available = 0, expired = 0;
    db.lots.forEach((l) => {
      granted += l.source === 'ajuste' ? 0 : l.points;
      expired += l.expiredPts || 0;
      if (live(l, now)) available += l.remaining; else expired += l.remaining;
    });
    const reserved = db.redemptions.filter((r) => r.status === 'pendiente').reduce((a, r) => a + r.points, 0);
    const redeemed = db.redemptions.filter((r) => ['aprobado', 'listo', 'entregado'].includes(r.status)).reduce((a, r) => a + r.points, 0);
    const adjustments = db.lots.filter((l) => l.source === 'ajuste').reduce((a, l) => a + l.points, 0);
    return { granted, available, expired, reserved, redeemed, adjustments };
  };
})();
