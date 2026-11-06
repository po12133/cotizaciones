/*
 * CorePoints · purchases.js
 * Registro de compras con foto de la boleta, verificación (aprobar / rechazar) y acreditación.
 *
 * El cliente solo envía sus datos de contacto y las fotos. Los datos de la compra
 * (número de boleta, fecha, monto y vendedora) los registra CatCore al verificar la
 * boleta, leyéndolos de la fotografía. Por eso el control de boletas duplicadas y el
 * cálculo de puntos se hacen en la aprobación.
 */
(function () {
  'use strict';
  const CP = (window.CP = window.CP || {});
  const u = CP.util;

  const STATUS = {
    pendiente: { label: 'Pendiente de verificación', short: 'Pendiente', tone: 'warn' },
    aprobada: { label: 'Aprobada', short: 'Aprobada', tone: 'ok' },
    rechazada: { label: 'Rechazada', short: 'Rechazada', tone: 'bad' }
  };
  const REJECT_REASONS = [
    'Boleta ilegible o incompleta',
    'La boleta no corresponde a CatCore',
    'Boleta ya registrada',
    'Boleta fuera del plazo de registro',
    'Compra anulada o devuelta',
    'Otro motivo'
  ];

  const P = (CP.purchases = { STATUS, REJECT_REASONS });
  const at = (opt) => (opt && opt.at ? u.toDate(opt.at) : CP.now());

  P.get = (db, id) => db.purchases.find((p) => p.id === id) || null;

  /** Compra aprobada que ya usa ese número de boleta (o null). */
  P.findDuplicate = function (db, receiptNo, exceptId) {
    const n = u.normReceipt(receiptNo);
    if (!n) return null;
    return db.purchases.find((p) => p.receiptKey === n && p.status === 'aprobada' && p.id !== exceptId) || null;
  };

  /** Valida el formulario del cliente; devuelve { campo: mensaje }. */
  P.validate = function (db, d) {
    const e = {};
    if (!u.normPhone(d.phone)) e.phone = 'Ingrese un celular boliviano de 8 dígitos (empieza con 6 o 7).';
    if (d.email && !u.validEmail(d.email)) e.email = 'El correo no es válido.';
    if (!d.receiptImg) e.receiptImg = 'La fotografía de la boleta es obligatoria.';
    return e;
  };

  /**
   * Registra la compra como "pendiente". Crea el perfil del cliente si no existe.
   * Lanza BizError con .fields si hay errores de validación.
   */
  P.register = function (db, d, opt) {
    const now = at(opt);
    if (!db.config.purchasesEnabled && !(opt && opt.force)) throw new CP.BizError('El registro de compras está temporalmente deshabilitado.');
    const errors = P.validate(db, d);
    if (Object.keys(errors).length) {
      const err = new CP.BizError('Revise los campos marcados.');
      err.fields = errors;
      throw err;
    }
    const { customer, created } = CP.customers.getOrCreate(db, { name: d.name, phone: d.phone, email: d.email }, now);
    const p = {
      id: u.uid('SOL', 6, (id) => db.purchases.some((x) => x.id === id)),
      customerId: customer.id,
      // datos tal como los envió el cliente (pueden diferir del perfil)
      submittedPhone: u.normPhone(d.phone),
      submittedEmail: d.email ? String(d.email).trim().toLowerCase() : '',
      // datos de la compra: se completan al verificar la boleta
      receiptNo: null, receiptKey: null, date: null, amount: null, product: '', sellerId: null,
      receiptImg: d.receiptImg,
      chatImg: d.chatImg || null,
      status: 'pendiente',
      createdAt: now.toISOString(),
      customerCreated: created,
      history: [{ status: 'pendiente', at: now.toISOString(), by: 'cliente', note: 'Fotografía de la boleta enviada desde el portal' }]
    };
    db.purchases.push(p);
    CP.notifications.push(db, 'compra_registrada', { customerId: customer.id, purchaseId: p.id, at: now });
    return { purchase: p, customer, created };
  };

  /** Vista previa de puntos al aprobar (usa la configuración vigente). */
  P.preview = function (db, id, validatedAmount) {
    const p = P.get(db, id);
    const isFirst = !db.purchases.some((x) => x.customerId === p.customerId && x.status === 'aprobada' && x.id !== id);
    return Object.assign(CP.points.calc(validatedAmount, db.config, isFirst), { isFirst });
  };

  /** Valida los datos de la boleta que ingresa el administrador; devuelve { campo: mensaje }. */
  P.validateReview = function (db, id, o, now) {
    now = now || CP.now();
    const e = {};
    const receipt = String(o.receiptNo || '').trim();
    if (!receipt) e.receiptNo = 'Ingrese el número de boleta.';
    else if (u.normReceipt(receipt).length < 3) e.receiptNo = 'El número de boleta es demasiado corto.';
    else {
      const dup = P.findDuplicate(db, receipt, id);
      if (dup) e.receiptNo = 'Esta boleta ya fue acreditada en la compra ' + dup.id + ' (' + (CP.customers.get(db, dup.customerId) || {}).name + ').';
    }
    const date = u.fromIsoDay(o.date);
    if (!date) e.date = 'Indique la fecha de la boleta.';
    else if (u.isoDay(date) > u.isoDay(now)) e.date = 'La fecha no puede ser futura.';
    else if (date < u.addMonths(now, -db.config.validityMonths)) e.date = 'La boleta tiene más de ' + db.config.validityMonths + ' meses.';
    const amount = Number(o.validatedAmount);
    if (!(amount > 0)) e.validatedAmount = 'Ingrese el monto total de la boleta.';
    else if (amount > 500000) e.validatedAmount = 'Monto fuera de rango.';
    if (!CP.sellers.get(db, o.sellerId)) e.sellerId = 'Seleccione la vendedora que realizó la venta.';
    return e;
  };

  /** Aprueba la compra con los datos leídos de la boleta y acredita los puntos. Una compra solo puede aprobarse una vez. */
  P.approve = function (db, id, o, opt) {
    const now = at(opt);
    o = o || {};
    const p = P.get(db, id);
    if (!p) throw new CP.BizError('Compra no encontrada.');
    if (p.status !== 'pendiente') throw new CP.BizError('La compra ' + id + ' ya fue ' + (p.status === 'aprobada' ? 'aprobada y acreditada' : 'rechazada') + '. No se puede procesar dos veces.');
    if (db.lots.some((l) => l.purchaseId === id)) throw new CP.BizError('Esta compra ya tiene puntos acreditados.');
    const errors = P.validateReview(db, id, o, now);
    if (Object.keys(errors).length) {
      const k = Object.keys(errors)[0];
      const err = new CP.BizError(errors[k], k);
      err.fields = errors;
      throw err;
    }
    const amount = Math.round(Number(o.validatedAmount) * 100) / 100;
    const calc = P.preview(db, id, amount);
    p.status = 'aprobada';
    p.receiptNo = String(o.receiptNo).trim().toUpperCase();
    p.receiptKey = u.normReceipt(o.receiptNo);
    p.date = o.date;
    p.amount = amount;
    p.validatedAmount = amount;
    p.sellerId = o.sellerId;
    p.validatedSellerId = o.sellerId;
    p.product = String(o.product || '').trim();
    p.points = calc.base;
    p.bonus = calc.bonus;
    p.rule = { bsPerPoint: db.config.bsPerPoint, minPurchase: db.config.minPurchase, validityMonths: db.config.validityMonths };
    p.reviewedAt = now.toISOString();
    p.reviewedBy = o.actor || 'admin';
    p.adminNotes = String(o.note || '').trim();
    const lot = CP.points.credit(db, { customerId: p.customerId, purchaseId: p.id, source: 'compra', points: calc.base, at: now, actor: p.reviewedBy, note: 'Boleta ' + p.receiptNo });
    let bonusLot = null;
    if (calc.bonus) bonusLot = CP.points.credit(db, { customerId: p.customerId, purchaseId: p.id, source: 'bono', points: calc.bonus, at: now, actor: p.reviewedBy, note: 'Bono de bienvenida' });
    p.creditedAt = now.toISOString();
    p.expiresAt = lot ? lot.expiresAt : u.addMonths(now, db.config.validityMonths).toISOString();
    p.lotIds = [lot && lot.id, bonusLot && bonusLot.id].filter(Boolean);
    p.history.push({ status: 'aprobada', at: now.toISOString(), by: p.reviewedBy, note: ['Boleta ' + p.receiptNo + ' · ' + u.bs(amount) + ' · ' + CP.sellers.name(db, p.sellerId), calc.total + ' CorePoints acreditados'].concat(calc.belowMin ? ['monto bajo el mínimo de Bs ' + db.config.minPurchase] : [], p.adminNotes ? [p.adminNotes] : []).join(' · ') });
    CP.notifications.push(db, 'compra_aprobada', { customerId: p.customerId, purchaseId: p.id, at: now });
    if (calc.total > 0) CP.notifications.push(db, 'puntos_acreditados', { customerId: p.customerId, purchaseId: p.id, points: calc.total, bonus: calc.bonus, expiresAt: p.expiresAt, at: now });
    return { purchase: p, calc };
  };

  /** Rechaza la compra (sin puntos). Motivo obligatorio. */
  P.reject = function (db, id, o, opt) {
    const now = at(opt);
    o = o || {};
    const p = P.get(db, id);
    if (!p) throw new CP.BizError('Compra no encontrada.');
    if (p.status !== 'pendiente') throw new CP.BizError('La compra ' + id + ' ya fue procesada (' + STATUS[p.status].short.toLowerCase() + ').');
    const reason = String(o.reason || '').trim();
    if (!reason) throw new CP.BizError('Seleccione el motivo del rechazo.', 'reason');
    const notes = String(o.notes || '').trim();
    if (reason === 'Otro motivo' && notes.length < 5) throw new CP.BizError('Describa el motivo en las observaciones.', 'notes');
    const receipt = String(o.receiptNo || '').trim();
    if (receipt) { p.receiptNo = receipt.toUpperCase(); p.receiptKey = u.normReceipt(receipt); } // referencia opcional (p. ej. boleta duplicada)
    p.status = 'rechazada';
    p.rejectReason = reason;
    p.adminNotes = notes;
    p.points = 0; p.bonus = 0;
    p.reviewedAt = now.toISOString();
    p.reviewedBy = o.actor || 'admin';
    p.history.push({ status: 'rechazada', at: now.toISOString(), by: p.reviewedBy, note: reason + (notes ? ' · ' + notes : '') });
    CP.notifications.push(db, 'compra_rechazada', { customerId: p.customerId, purchaseId: p.id, reason, notes, at: now });
    return p;
  };

  /** Puntos para tablas: acreditados si está aprobada; null si aún no se verificó. */
  P.pointsLabel = function (db, p) {
    if (p.status === 'aprobada') return { value: (p.points || 0) + (p.bonus || 0), estimated: false };
    if (p.status === 'rechazada') return { value: 0, estimated: false };
    return { value: null, estimated: true };
  };

  /** Texto corto para la boleta (que puede no tener número todavía). */
  P.receiptLabel = (p) => p.receiptNo || (p.status === 'pendiente' ? 'Por verificar' : '—');
})();
