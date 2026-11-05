/*
 * Base de datos de demostración en localStorage + reglas de negocio compartidas
 * por el panel (demo.html), el catálogo público (catalogo.html) y la landing.
 */
(function (root) {
  const CFG = root.MF_CONFIG;
  const MF = (root.MF = root.MF || {});
  const KEY = CFG.storageKey;
  // Estados de pedido que todavía NO descuentan stock (solo lo reservan)
  const OPEN_ORDER = ['pendiente', 'esperando_pago'];
  const ORDER_STATES = {
    pendiente: 'Pendiente', esperando_pago: 'Esperando pago', confirmado: 'Confirmado',
    preparando: 'Preparando', entregado: 'Entregado', cancelado: 'Cancelado'
  };

  let db = null;
  const listeners = [];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === CFG.dataVersion) { db = parsed; return db; }
      }
    } catch (e) { /* datos corruptos: se restauran */ }
    db = MF.seed();
    persist();
    return db;
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); }
    catch (e) {
      // Si el almacenamiento se llena (fotos subidas), se avisa sin romper la demo
      if (MF.toast) MF.toast('El almacenamiento del navegador está lleno. Use fotos más livianas o restaure los datos.', 'error');
    }
  }
  function save() { persist(); listeners.forEach((cb) => cb('local')); }
  function reset() { db = MF.seed(); const keep = arguments[0]; if (keep) db.settings.plan = keep; save(); }
  function onChange(cb) { listeners.push(cb); }

  // Sincroniza pestañas abiertas (por ejemplo, catálogo y panel al mismo tiempo)
  root.addEventListener && root.addEventListener('storage', (e) => {
    if (e.key === KEY) { load(); listeners.forEach((cb) => cb('remote')); }
  });

  const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const get = () => db || load();

  // ---------- Planes ----------
  const plan = () => MF.planById(get().settings.plan);
  function setPlan(id) {
    const d = get();
    d.settings.plan = id;
    const lim = MF.planById(id).limits.branches;
    const visible = d.branches.slice(0, lim).map((b) => b.id);
    if (!visible.includes(d.settings.branchId)) d.settings.branchId = 'b1';
    save();
  }
  const can = (feature) => plan().level >= (MF.FEATURES[feature] || 1);
  const neededPlan = (feature) => MF.planByLevel(MF.FEATURES[feature] || 1);
  const branches = () => get().branches.slice(0, plan().limits.branches);
  const branchId = () => (can('sucursales') ? get().settings.branchId : 'b1');
  const branchName = (id) => (get().branches.find((b) => b.id === id) || {}).name || '—';
  const userName = (id) => (get().users.find((u) => u.id === id) || {}).name || '—';
  const currentUser = () => get().users.find((u) => u.id === get().settings.userId) || get().users[0];

  // ---------- Productos e inventario ----------
  const product = (id) => get().products.find((p) => p.id === id);
  const variantStock = (v, b) => (b ? v.stock[b] || 0 : branches().reduce((s, br) => s + (v.stock[br.id] || 0), 0));
  // Stock de un producto en la sucursal indicada (o en todas las visibles si b = 'all')
  function stock(p, b) {
    const scope = b === 'all' ? null : b || branchId();
    return p.variants.reduce((s, v) => s + variantStock(v, scope), 0);
  }
  function reserved(pid, size, color) {
    return get().orders.filter((o) => OPEN_ORDER.includes(o.status)).reduce((s, o) =>
      s + o.items.filter((i) => i.productId === pid && (!size || i.size === size) && (!color || i.color === color)).reduce((a, i) => a + i.qty, 0), 0);
  }
  // Disponible para el catálogo online (se vende desde la tienda central) = stock − reservas de pedidos abiertos
  function available(p, v) {
    if (v) return Math.max(0, (v.stock.b1 || 0) - reserved(p.id, v.size, v.color));
    return p.variants.reduce((s, x) => s + available(p, x), 0);
  }
  function stockStatus(n, p) {
    if (n <= 0) return { key: 'agotado', label: 'Agotado' };
    if (n <= (p ? p.minStock : 2)) return { key: 'bajo', label: 'Stock bajo' };
    return { key: 'ok', label: 'Disponible' };
  }
  function promoFor(p) {
    if (!can('promociones')) return null;
    return get().promotions.find((pr) => pr.active && (pr.productIds.includes(p.id) || (pr.category && pr.category === p.category))) || null;
  }
  function price(p) {
    const pr = promoFor(p);
    return pr ? Math.round(p.price * (1 - pr.percent / 100)) : p.price;
  }
  const canAddProduct = () => get().products.length < plan().limits.products;

  // ---------- IA (créditos demostrativos por plan: no es facturación real) ----------
  function aiUsage() {
    const d = get();
    const month = new Date().toISOString().slice(0, 7);
    if (d.aiUsage.month !== month) d.aiUsage = { month, used: 0 };
    return { used: d.aiUsage.used, limit: plan().limits.ai, left: Math.max(0, plan().limits.ai - d.aiUsage.used) };
  }
  function useAi() { const u = aiUsage(); if (u.left <= 0) return false; get().aiUsage.used++; save(); return true; }

  // ---------- Auditoría ----------
  function audit(type, detail, userId) {
    get().audit.unshift({ id: uid('a'), date: new Date().toISOString(), userId: userId || get().settings.userId, type, detail });
    if (get().audit.length > 300) get().audit.length = 300;
  }

  // ---------- Ventas ----------
  function checkStock(items, b) {
    for (const it of items) {
      const p = product(it.productId);
      const v = p && p.variants.find((x) => x.size === it.size && x.color === it.color);
      if (!v) return `"${it.name}" ya no existe en el inventario.`;
      if ((v.stock[b] || 0) < it.qty) return `Stock insuficiente de "${it.name}" talla ${it.size} en ${branchName(b)} (disponible: ${v.stock[b] || 0}).`;
    }
    return null;
  }
  function moveStock(items, b, sign) {
    items.forEach((it) => {
      const p = product(it.productId);
      const v = p && p.variants.find((x) => x.size === it.size && x.color === it.color);
      if (v) v.stock[b] = Math.max(0, (v.stock[b] || 0) + sign * it.qty);
    });
  }
  /** Registra una venta, descuenta el inventario y devuelve {sale} o {error}. */
  function createSale(o) {
    const d = get();
    const b = o.branchId || branchId();
    const err = checkStock(o.items, b);
    if (err) return { error: err };
    moveStock(o.items, b, -1);
    const subtotal = o.items.reduce((s, i) => s + i.price * i.qty, 0);
    const discount = Math.min(subtotal, Math.max(0, Math.round(o.discount || 0)));
    const number = ++d.counters.sale;
    const sale = {
      id: 'v' + number, number, date: new Date().toISOString(), items: o.items.map((i) => Object.assign({}, i)),
      subtotal, discount, total: subtotal - discount, method: o.method || 'efectivo', customerId: o.customerId || null,
      customerName: o.customerName || null, userId: d.settings.userId, branchId: b, channel: o.channel || 'tienda',
      orderId: o.orderId || null, status: 'completada', received: o.received || null
    };
    d.sales.push(sale);
    audit('venta', `Registró la venta #${number} por Bs ${sale.total}` + (o.orderId ? ' (pedido online)' : ''));
    save();
    return { sale };
  }
  function returnSale(id, note) {
    const s = get().sales.find((x) => x.id === id);
    if (!s || s.status !== 'completada') return false;
    moveStock(s.items, s.branchId, +1);
    s.status = 'devuelta';
    s.returnNote = note || 'Devolución';
    audit('devolucion', `Registró la devolución de la venta #${s.number} (${s.returnNote})`);
    save();
    return true;
  }
  function visibleSales() {
    const d = get();
    const days = plan().limits.historyDays;
    const from = days ? Date.now() - days * 864e5 : 0;
    return d.sales.filter((s) => new Date(s.date).getTime() >= from && (can('sucursales') ? true : s.branchId === 'b1'));
  }

  // ---------- Pedidos online ----------
  function createOrder(o) {
    const d = get();
    const number = ++d.counters.order;
    const total = o.items.reduce((s, i) => s + i.price * i.qty, 0);
    const status = o.method === 'qr' ? 'esperando_pago' : 'pendiente';
    const order = {
      id: 'o' + number, number, date: new Date().toISOString(), customer: o.customer, items: o.items, total, method: o.method,
      status, receipt: o.receipt || null, receiptName: o.receiptName || null, paymentVerified: false, saleId: null,
      notes: o.notes || '', history: [{ status, date: new Date().toISOString() }]
    };
    d.orders.unshift(order);
    audit('pedido', `Nuevo pedido online #${number} de ${o.customer.name} (${o.method === 'qr' ? 'pago QR' : 'WhatsApp'})`, 'u1');
    save();
    return order;
  }
  /** Cambia el estado de un pedido manteniendo el inventario coherente. Devuelve {ok} o {error}. */
  function setOrderStatus(id, status) {
    const o = get().orders.find((x) => x.id === id);
    if (!o) return { error: 'Pedido no encontrado' };
    if (o.status === status) return { ok: true };
    if (o.status === 'cancelado' || o.status === 'entregado') return { error: 'El pedido ya está cerrado.' };
    if (status === 'confirmado') {
      if (!OPEN_ORDER.includes(o.status)) return { error: 'Solo se confirman pedidos pendientes o esperando pago.' };
      // El stock reservado por este pedido pasa a descontarse definitivamente
      const r = createSale({ items: o.items, method: o.method === 'qr' ? 'qr' : 'efectivo', customerName: o.customer.name, channel: 'online', orderId: o.id, branchId: 'b1' });
      if (r.error) return r;
      o.saleId = r.sale.id;
      o.paymentVerified = true;
    } else if (status === 'cancelado') {
      if (o.saleId) {
        const s = get().sales.find((x) => x.id === o.saleId);
        if (s && s.status === 'completada') { moveStock(s.items, s.branchId, +1); s.status = 'anulada'; }
      }
    } else if (['preparando', 'entregado'].includes(status) && !o.saleId) {
      return { error: 'Primero confirme el pago del pedido.' };
    } else if (status === 'esperando_pago' && o.saleId) {
      return { error: 'El pedido ya fue confirmado.' };
    }
    o.status = status;
    o.history.push({ status, date: new Date().toISOString() });
    audit('pedido', `Pedido #${o.number}: ${ORDER_STATES[status]}`);
    save();
    return { ok: true };
  }

  Object.assign(MF, {
    ORDER_STATES, OPEN_ORDER, load, save, reset, onChange, uid, get, plan, setPlan, can, neededPlan, branches, branchId,
    branchName, userName, currentUser, product, variantStock, stock, reserved, available, stockStatus, promoFor, price,
    canAddProduct, aiUsage, useAi, audit, createSale, returnSale, visibleSales, createOrder, setOrderStatus, moveStock
  });
})(window);
