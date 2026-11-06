/*
 * CorePoints · customers.js
 * Clientes (identificados por su número de WhatsApp) y vendedoras.
 */
(function () {
  'use strict';
  const CP = (window.CP = window.CP || {});
  const u = CP.util;

  const C = (CP.customers = {});

  C.get = (db, id) => db.customers.find((c) => c.id === id) || null;
  C.findByPhone = (db, phone) => {
    const p = u.normPhone(phone);
    return p ? db.customers.find((c) => c.phone === p) || null : null;
  };

  /** Busca el cliente por WhatsApp o crea su perfil interno. Devuelve { customer, created }. */
  C.getOrCreate = function (db, data, now) {
    const phone = u.normPhone(data.phone);
    if (!phone) throw new CP.BizError('Número de WhatsApp no válido.', 'phone');
    let c = db.customers.find((x) => x.phone === phone);
    if (c) {
      if (!c.email && data.email) c.email = String(data.email).trim().toLowerCase();
      return { customer: c, created: false };
    }
    const given = String(data.name || '').trim().replace(/\s+/g, ' ');
    c = {
      id: u.uid('CLI', 8, (id) => db.customers.some((x) => x.id === id)),
      // El portal ya no pide el nombre: se usa uno provisional hasta que CatCore lo complete
      name: given || 'Cliente ' + phone.slice(-4),
      nameProvided: !!given,
      phone,
      email: data.email ? String(data.email).trim().toLowerCase() : '',
      createdAt: (now || CP.now()).toISOString(),
      notes: ''
    };
    db.customers.push(c);
    return { customer: c, created: true };
  };

  C.update = function (db, id, data) {
    const c = C.get(db, id);
    if (!c) throw new CP.BizError('Cliente no encontrado.');
    const name = String(data.name || '').trim().replace(/\s+/g, ' ');
    if (name.length < 3) throw new CP.BizError('El nombre debe tener al menos 3 caracteres.', 'name');
    const email = String(data.email || '').trim().toLowerCase();
    if (email && !u.validEmail(email)) throw new CP.BizError('Correo electrónico no válido.', 'email');
    const phone = u.normPhone(data.phone);
    if (!phone) throw new CP.BizError('Número de WhatsApp no válido.', 'phone');
    if (db.customers.some((x) => x.id !== id && x.phone === phone)) throw new CP.BizError('Otro cliente ya usa ese número de WhatsApp.', 'phone');
    Object.assign(c, { name, email, phone, notes: String(data.notes || '').trim(), nameProvided: true });
    return c;
  };

  /** Estadísticas de un cliente para listados y fichas. */
  C.stats = function (db, id, now) {
    const purchases = db.purchases.filter((p) => p.customerId === id);
    const approved = purchases.filter((p) => p.status === 'aprobada');
    const bal = CP.points.balance(db, id, now);
    return {
      purchases: purchases.length,
      approved: approved.length,
      pendingPurchases: purchases.filter((p) => p.status === 'pendiente').length,
      amount: approved.reduce((a, p) => a + (p.validatedAmount || 0), 0),
      redemptions: db.redemptions.filter((r) => r.customerId === id).length,
      lastPurchase: purchases.map((p) => p.date).sort().pop() || null,
      balance: bal
    };
  };

  /* ---------------- vendedoras ---------------- */
  const S = (CP.sellers = {});
  S.get = (db, id) => db.sellers.find((s) => s.id === id) || null;
  S.name = (db, id) => (S.get(db, id) || {}).name || '—';
  S.active = (db) => db.sellers.filter((s) => s.active).sort((a, b) => a.name.localeCompare(b.name));

  S.save = function (db, data, now) {
    const name = String(data.name || '').trim().replace(/\s+/g, ' ');
    const code = String(data.code || '').trim().toUpperCase();
    if (name.length < 3) throw new CP.BizError('El nombre es obligatorio.', 'name');
    if (!/^[A-Z0-9-]{2,12}$/.test(code)) throw new CP.BizError('Código interno: 2 a 12 letras, números o guiones.', 'code');
    if (db.sellers.some((s) => s.code === code && s.id !== data.id)) throw new CP.BizError('Ya existe una vendedora con el código ' + code + '.', 'code');
    const phone = data.phone ? u.normPhone(data.phone) : '';
    if (data.phone && !phone) throw new CP.BizError('Número de WhatsApp no válido.', 'phone');
    const active = data.active === true || data.active === 'true' || data.active === 'activa';
    if (data.id) {
      const s = S.get(db, data.id);
      if (!s) throw new CP.BizError('Vendedora no encontrada.');
      Object.assign(s, { name, code, phone, active });
      return s;
    }
    const s = { id: u.uid('VEN', 6, (id) => db.sellers.some((x) => x.id === id)), name, code, phone, active, createdAt: (now || CP.now()).toISOString() };
    db.sellers.push(s);
    return s;
  };

  /**
   * Estadísticas por vendedora (preparadas para calcular comisiones más adelante).
   * La vendedora se asigna al verificar la boleta, así que solo cuentan las compras verificadas.
   */
  S.stats = function (db, id, now) {
    now = now || CP.now();
    const ok = db.purchases.filter((p) => p.status === 'aprobada' && (p.validatedSellerId || p.sellerId) === id);
    const amount = ok.reduce((a, p) => a + (p.validatedAmount || 0), 0);
    const since = u.addDays(now, -30);
    return {
      approved: ok.length,
      amount,
      avgTicket: ok.length ? amount / ok.length : 0,
      last30: ok.filter((p) => new Date(p.reviewedAt) >= since).length,
      customers: new Set(ok.map((p) => p.customerId)).size,
      purchases: ok
    };
  };
})();
