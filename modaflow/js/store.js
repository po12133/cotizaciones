/*
 * Base de datos de demostración en localStorage + reglas de negocio compartidas
 * por el panel (demo.html), el catálogo público (catalogo.html) y la landing.
 * Toda variación de stock pasa por moveStock / setStock, que registran un movimiento de inventario.
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
  const PAY = { efectivo: 'Efectivo', qr: 'QR', otro: 'Otro' };
  const MOVE_TYPES = {
    inicial: 'Stock inicial', ingreso: 'Ingreso de mercadería', ajuste: 'Ajuste', venta: 'Venta', anulacion: 'Venta anulada',
    devolucion: 'Devolución', transferencia: 'Transferencia', compra: 'Compra recibida', importacion: 'Importación'
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
    if (!MF.planIncludes(id, 'usuarios')) d.settings.userId = 'u1';
    save();
  }
  const can = (feature) => MF.planIncludes(plan().id, feature);
  const neededPlan = (feature) => MF.planNeededFor(feature);

  // Prueba gratuita: 14 días desde settings.trialStart. "Simular fin de la prueba" fuerza el vencimiento.
  function trial() {
    const s = get().settings;
    const days = MF.planById('gratis').trialDays;
    const start = new Date(s.trialStart || Date.now());
    const ends = new Date(start.getTime() + days * 864e5);
    const left = Math.max(0, Math.ceil((ends - Date.now()) / 864e5));
    const expired = !!s.trialExpired || left <= 0;
    return { start, ends, left: expired ? 0 : left, expired, keepUntil: new Date(ends.getTime() + 30 * 864e5) };
  }
  /** Cuenta en solo lectura (prueba gratuita vencida): se puede consultar, pero no registrar. */
  const readOnly = () => plan().trial && trial().expired;
  const READ_ONLY_MSG = 'La prueba gratuita terminó: la cuenta está en solo lectura. Elija un plan para seguir registrando.';

  const branches = () => get().branches.slice(0, plan().limits.branches);
  const branchId = () => (can('sucursales') ? get().settings.branchId : 'b1');
  const branchName = (id) => (get().branches.find((b) => b.id === id) || {}).name || '—';
  const userName = (id) => (get().users.find((u) => u.id === id) || {}).name || '—';
  const currentUser = () => get().users.find((u) => u.id === get().settings.userId) || get().users[0];

  // ---------- Productos e inventario ----------
  const product = (id) => get().products.find((p) => p.id === id);
  const isActive = (p) => p.active !== false;
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
    if (n <= (p ? p.minStock : 2)) return { key: 'bajo', label: 'Poco stock' };
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
  // Límite del plan = cantidad de fichas de producto (una blusa con 20 unidades cuenta como 1)
  const canAddProduct = () => !readOnly() && get().products.length < plan().limits.products;
  const tagsText = (p) => [p.name, p.sku, p.color, p.category, p.garmentType, p.style, p.brand, ...(p.tags || []), ...(p.features || [])].filter(Boolean).join(' ').toLowerCase();

  // ---------- Movimientos de inventario ----------
  function logMove(m) {
    const d = get();
    d.movements = d.movements || [];
    d.movements.push(Object.assign({ id: uid('m'), date: new Date().toISOString(), userId: d.settings.userId, branchId: 'b1' }, m));
    if (d.movements.length > 1500) d.movements.splice(0, d.movements.length - 1500);
  }
  const findVariant = (p, size, color) => p && p.variants.find((x) => x.size === size && x.color === color);
  /** Suma (sign +1) o descuenta (−1) las cantidades de items en la sucursal b y registra el movimiento. */
  function moveStock(items, b, sign, type, ref) {
    items.forEach((it) => {
      const p = product(it.productId);
      const v = findVariant(p, it.size, it.color);
      if (!v) return;
      const before = v.stock[b] || 0;
      v.stock[b] = Math.max(0, before + sign * it.qty);
      logMove({ productId: p.id, name: p.name, size: v.size, color: v.color, qty: v.stock[b] - before, type: type || (sign < 0 ? 'venta' : 'ingreso'), ref: ref || '', branchId: b });
    });
  }
  /** Fija el stock de una variante (ajuste o conteo físico) y registra la diferencia. */
  function setStock(p, v, b, qty, type, note) {
    const before = v.stock[b] || 0;
    qty = Math.max(0, Math.round(+qty || 0));
    if (qty === before) return 0;
    v.stock[b] = qty;
    logMove({ productId: p.id, name: p.name, size: v.size, color: v.color, qty: qty - before, type: type || 'ajuste', ref: note || '', branchId: b });
    return qty - before;
  }

  // ---------- IA (créditos demostrativos por plan: no es facturación real) ----------
  // Planes pagados: análisis por mes. Prueba gratuita: análisis en total.
  function aiUsage() {
    const d = get();
    const month = new Date().toISOString().slice(0, 7);
    if (d.aiUsage.month !== month) { d.aiUsage.month = month; d.aiUsage.used = 0; }
    const lim = plan().limits;
    const used = lim.aiTotal ? d.aiUsage.trialUsed || 0 : d.aiUsage.used;
    return { used, limit: lim.ai, left: Math.max(0, lim.ai - used), total: !!lim.aiTotal, period: lim.aiTotal ? 'en total' : 'este mes' };
  }
  function countAi() {
    aiUsage();
    const a = get().aiUsage;
    if (plan().limits.aiTotal) a.trialUsed = (a.trialUsed || 0) + 1; else a.used++;
  }
  function useAi() { if (aiUsage().left <= 0) return false; countAi(); save(); return true; }

  // ---------- Auditoría ----------
  function audit(type, detail, userId) {
    get().audit.unshift({ id: uid('a'), date: new Date().toISOString(), userId: userId || get().settings.userId, type, detail });
    if (get().audit.length > 300) get().audit.length = 300;
  }

  // ---------- Ventas ----------
  function checkStock(items, b) {
    for (const it of items) {
      const v = findVariant(product(it.productId), it.size, it.color);
      if (!v) return `"${it.name}" ya no existe en el inventario.`;
      const want = items.filter((x) => x.productId === it.productId && x.size === it.size && x.color === it.color).reduce((s, x) => s + x.qty, 0);
      if ((v.stock[b] || 0) < want) return `Stock insuficiente de "${it.name}" talla ${it.size} (disponible: ${v.stock[b] || 0}).`;
    }
    return null;
  }
  /** Totales de una venta: descuento por prenda (Bs por línea) + descuento general. */
  function saleTotals(items, general) {
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const lineDiscount = items.reduce((s, i) => s + Math.min(i.price * i.qty, Math.max(0, Math.round(+i.discount || 0))), 0);
    const discount = Math.min(subtotal - lineDiscount, Math.max(0, Math.round(+general || 0)));
    return { subtotal, lineDiscount, discount, discountTotal: lineDiscount + discount, total: subtotal - lineDiscount - discount };
  }
  const saleDiscount = (s) => (s.discount || 0) + (s.lineDiscount || 0);
  /** Registra una venta, descuenta el inventario y devuelve {sale} o {error}. */
  function createSale(o) {
    if (readOnly()) return { error: READ_ONLY_MSG };
    const d = get();
    if (!o.items || !o.items.length) return { error: 'Agregue al menos una prenda.' };
    const b = o.branchId || branchId();
    const err = checkStock(o.items, b);
    if (err) return { error: err };
    const t = saleTotals(o.items, o.discount);
    const number = ++d.counters.sale;
    const items = o.items.map((i) => Object.assign({}, i, { discount: Math.min(i.price * i.qty, Math.max(0, Math.round(+i.discount || 0))) }));
    moveStock(items, b, -1, 'venta', 'Venta #' + number);
    const sale = Object.assign({
      id: 'v' + number, number, date: new Date().toISOString(), items, method: o.method || 'efectivo', methodNote: o.methodNote || '',
      userId: d.settings.userId, branchId: b, channel: o.channel || 'tienda', orderId: o.orderId || null, customerName: o.customerName || null,
      status: 'completada', received: o.received || null
    }, t);
    d.sales.push(sale);
    audit('venta', `Registró la venta #${number} por Bs ${sale.total}` + (o.orderId ? ' (pedido online)' : ''));
    save();
    return { sale };
  }
  /** Anula una venta: repone el stock de cada prenda y deja la venta fuera de los reportes. */
  function voidSale(id, reason) {
    if (readOnly()) return { error: READ_ONLY_MSG };
    const s = get().sales.find((x) => x.id === id);
    if (!s || s.status !== 'completada') return { error: 'La venta ya no está activa.' };
    moveStock(s.items, s.branchId, +1, 'anulacion', 'Venta #' + s.number);
    s.status = 'anulada';
    s.voidNote = reason || 'Anulada';
    s.voidDate = new Date().toISOString();
    audit('venta', `Anuló la venta #${s.number} (${s.voidNote}) y repuso el stock`);
    save();
    return { ok: true };
  }
  function returnSale(id, note) {
    const s = get().sales.find((x) => x.id === id);
    if (!s || s.status !== 'completada' || readOnly()) return false;
    moveStock(s.items, s.branchId, +1, 'devolucion', 'Venta #' + s.number);
    s.status = 'devuelta';
    s.returnNote = note || 'Devolución';
    audit('devolucion', `Registró la devolución de la venta #${s.number} (${s.returnNote})`);
    save();
    return true;
  }
  function visibleSales() {
    return get().sales.filter((s) => (can('sucursales') ? branches().some((b) => b.id === s.branchId) : s.branchId === 'b1'));
  }

  // ---------- Pedidos online ----------
  /** El catálogo está activo en Prueba (mientras no venza), Pro y Premium. */
  const catalogActive = () => can('catalogo') && !readOnly();
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
    if (readOnly()) return { error: READ_ONLY_MSG };
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
        if (s && s.status === 'completada') { moveStock(s.items, s.branchId, +1, 'anulacion', 'Pedido #' + o.number); s.status = 'anulada'; s.voidNote = 'Pedido cancelado'; }
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
    ORDER_STATES, OPEN_ORDER, PAY, MOVE_TYPES, READ_ONLY_MSG, load, save, reset, onChange, uid, get, plan, setPlan, can, neededPlan, trial, readOnly,
    branches, branchId, branchName, userName, currentUser, product, isActive, variantStock, stock, reserved, available, stockStatus, promoFor, price,
    canAddProduct, tagsText, logMove, moveStock, setStock, findVariant, aiUsage, countAi, useAi, audit, saleTotals, saleDiscount, createSale, voidSale,
    returnSale, visibleSales, catalogActive, createOrder, setOrderStatus
  });
})(window);
