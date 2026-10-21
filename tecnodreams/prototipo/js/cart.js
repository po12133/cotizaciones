/* =========================================================
 * TecnoDreams — estado do cliente (localStorage)
 * Carrinho, favoritos, cupom, frete simulado, pedidos
 * demonstrativos, conta do cliente e vistos recentemente.
 * Depende de products.js.
 * ========================================================= */
(function () {
  'use strict';
  var TD = window.TD;
  var K = { cart: 'td_cart_v1', favs: 'td_favs_v1', coupon: 'td_coupon_v1', orders: 'td_orders_v1', account: 'td_account_v1', recent: 'td_recent_v1' };

  function emit(name, detail) { window.dispatchEvent(new CustomEvent(name, { detail: detail })); }
  window.addEventListener('storage', function (e) {
    if (e.key === K.cart || e.key === K.coupon) emit('td:cart', { external: true });
    if (e.key === K.favs) emit('td:favs', { external: true });
  });

  /* ---------------- carrinho ---------------- */
  var Cart = (TD.cart = {});
  function raw() { return TD.readJSON(K.cart, []).filter(function (l) { return l && l.id && l.qty > 0; }); }
  function save(lines, detail) { TD.writeJSON(K.cart, lines); emit('td:cart', detail || {}); }

  /* Linhas válidas: descarta produtos removidos/inativos e limita ao estoque */
  Cart.lines = function () {
    return raw().map(function (l) {
      var p = TD.product(l.id);
      if (!p || !p.active || !p.price) return null;
      var qty = Math.min(l.qty, Math.max(p.stock, 0));
      return { id: l.id, qty: qty, product: p, total: qty * p.price, limited: qty < l.qty };
    }).filter(function (l) { return l && l.qty > 0; });
  };
  Cart.count = function () { return Cart.lines().reduce(function (s, l) { return s + l.qty; }, 0); };
  Cart.qtyOf = function (id) { var l = raw().find(function (x) { return x.id === id; }); return l ? l.qty : 0; };

  /* Retorna { ok, qty, reason } */
  Cart.add = function (id, qty) {
    qty = Math.max(1, parseInt(qty, 10) || 1);
    var p = TD.product(id);
    if (!p || !p.active) return { ok: false, reason: 'Produto indisponível.' };
    if (!p.price) return { ok: false, reason: 'Preço sob consulta: fale com a gente pelo WhatsApp.' };
    if (!p.inStock) return { ok: false, reason: 'Produto esgotado no momento.' };
    var lines = raw();
    var line = lines.find(function (l) { return l.id === id; });
    var current = line ? line.qty : 0;
    var next = Math.min(current + qty, p.stock);
    if (next === current) return { ok: false, reason: 'Você já tem todas as ' + p.stock + ' unidades disponíveis no carrinho.' };
    if (line) line.qty = next; else lines.push({ id: id, qty: next });
    save(lines, { added: id });
    return { ok: true, qty: next, partial: next - current < qty };
  };
  Cart.setQty = function (id, qty) {
    var p = TD.product(id);
    qty = parseInt(qty, 10) || 0;
    var lines = raw();
    if (qty <= 0) lines = lines.filter(function (l) { return l.id !== id; });
    else {
      qty = Math.min(qty, p ? p.stock : qty);
      var line = lines.find(function (l) { return l.id === id; });
      if (line) line.qty = qty; else lines.push({ id: id, qty: qty });
    }
    save(lines);
    return qty;
  };
  Cart.remove = function (id) {
    var lines = raw();
    var removed = lines.find(function (l) { return l.id === id; });
    save(lines.filter(function (l) { return l.id !== id; }), { removed: id });
    return removed;
  };
  Cart.restore = function (line) { if (!line) return; var lines = raw().filter(function (l) { return l.id !== line.id; }); lines.push(line); save(lines); };
  Cart.clear = function () { save([]); TD.writeJSON(K.coupon, null); };

  /* ---------------- cupom ---------------- */
  Cart.coupon = function () {
    var code = TD.readJSON(K.coupon, null);
    if (!code) return null;
    return TD.coupons().find(function (c) { return c.active && c.code === code; }) || null;
  };
  Cart.applyCoupon = function (code) {
    code = String(code || '').trim().toUpperCase();
    if (!code) return { ok: false, reason: 'Digite um código de cupom.' };
    var c = TD.coupons().find(function (x) { return x.code === code; });
    if (!c || !c.active) return { ok: false, reason: 'Cupom inválido ou expirado.' };
    var sub = Cart.subtotal();
    if (c.min && sub < c.min) return { ok: false, reason: 'Este cupom vale para compras a partir de ' + TD.fmt(c.min) + '.' };
    TD.writeJSON(K.coupon, code);
    emit('td:cart', {});
    return { ok: true, coupon: c };
  };
  Cart.removeCoupon = function () { TD.writeJSON(K.coupon, null); emit('td:cart', {}); };

  Cart.subtotal = function () { return Cart.lines().reduce(function (s, l) { return s + l.total; }, 0); };
  Cart.totals = function (shippingPrice) {
    var sub = Cart.subtotal();
    var c = Cart.coupon();
    var discount = 0;
    if (c && (!c.min || sub >= c.min)) discount = c.type === 'percent' ? sub * c.value / 100 : Math.min(c.value, sub);
    discount = Math.round(discount * 100) / 100;
    var ship = shippingPrice || 0;
    return { subtotal: sub, discount: discount, coupon: discount ? c : null, shipping: ship, total: Math.max(sub - discount, 0) + ship, count: Cart.count() };
  };

  /* ---------------- frete (SIMULADO) ----------------
     No sistema final: integração com transportadora/Correios
     definida com o cliente. Aqui os valores são ilustrativos. */
  TD.shipping = function (cep, subtotal, weightHint) {
    var digits = String(cep || '').replace(/\D/g, '');
    if (digits.length !== 8) return null;
    var region = parseInt(digits[0], 10);
    var sp = digits.slice(0, 2) <= '19';
    var base = sp ? 19.9 : [0, 24.9, 34.9, 36.9, 39.9, 42.9, 49.9, 39.9, 34.9, 44.9][region] || 39.9;
    var heavy = weightHint ? 1.6 : 1;
    var days = sp ? [2, 4] : [5, 9];
    var opts = [
      { id: 'retirada', name: 'Retirada no escritório', desc: TD.settings().address, price: 0, eta: 'Disponível após confirmação do pedido' },
      { id: 'padrao', name: 'Entrega padrão', desc: 'Transportadora parceira', price: Math.round(base * heavy * 100) / 100, eta: days[0] + ' a ' + days[1] + ' dias úteis' },
      { id: 'expressa', name: 'Entrega expressa', desc: sp ? 'Motoboy / transportadora' : 'Transportadora expressa', price: Math.round(base * heavy * 1.8 * 100) / 100, eta: (sp ? '1 a 2' : (days[0] - 2) + ' a ' + (days[1] - 3)) + ' dias úteis' }
    ];
    return opts;
  };

  /* ---------------- favoritos ---------------- */
  var Favs = (TD.favs = {});
  Favs.ids = function () { return TD.readJSON(K.favs, []).filter(function (id) { var p = TD.product(id); return p && p.active; }); };
  Favs.has = function (id) { return TD.readJSON(K.favs, []).indexOf(id) !== -1; };
  Favs.toggle = function (id) {
    var ids = TD.readJSON(K.favs, []);
    var on = ids.indexOf(id) === -1;
    ids = on ? [id].concat(ids) : ids.filter(function (x) { return x !== id; });
    TD.writeJSON(K.favs, ids);
    emit('td:favs', { id: id, on: on });
    return on;
  };
  Favs.remove = function (id) { if (Favs.has(id)) Favs.toggle(id); };
  Favs.clear = function () { TD.writeJSON(K.favs, []); emit('td:favs', {}); };

  /* ---------------- pedidos (DEMONSTRATIVOS) ---------------- */
  var Orders = (TD.orders = {});
  Orders.list = function () { return TD.readJSON(K.orders, []); };
  Orders.create = function (data) {
    var list = Orders.list();
    var n = 1001 + list.length;
    var order = Object.assign({ id: 'DEMO-' + n, date: new Date().toISOString(), status: 'novo', demo: true }, data);
    list.unshift(order);
    TD.writeJSON(K.orders, list);
    emit('td:orders', { id: order.id });
    return order;
  };
  Orders.update = function (id, patch) {
    var list = Orders.list();
    var o = list.find(function (x) { return x.id === id; });
    if (o) Object.assign(o, patch);
    TD.writeJSON(K.orders, list);
    emit('td:orders', { id: id });
  };
  Orders.clear = function () { TD.writeJSON(K.orders, []); };
  TD.orderStatuses = [
    { id: 'novo', label: 'Recebido' },
    { id: 'pago', label: 'Pagamento aprovado' },
    { id: 'separacao', label: 'Em separação' },
    { id: 'enviado', label: 'Enviado' },
    { id: 'entregue', label: 'Entregue' },
    { id: 'cancelado', label: 'Cancelado' }
  ];
  TD.statusLabel = function (id) { var s = TD.orderStatuses.find(function (x) { return x.id === id; }); return s ? s.label : id; };

  /* ---------------- conta (DEMONSTRATIVA) ---------------- */
  var Account = (TD.account = {});
  Account.get = function () { return TD.readJSON(K.account, { loggedIn: false, profile: {}, addresses: [] }); };
  Account.save = function (a) { TD.writeJSON(K.account, a); emit('td:account', {}); };
  Account.login = function (profile) {
    var a = Account.get();
    a.loggedIn = true;
    a.profile = Object.assign({}, a.profile, profile);
    Account.save(a);
    return a;
  };
  Account.logout = function () { var a = Account.get(); a.loggedIn = false; Account.save(a); };

  /* ---------------- vistos recentemente ---------------- */
  TD.recent = {
    push: function (id) { var ids = TD.readJSON(K.recent, []).filter(function (x) { return x !== id; }); ids.unshift(id); TD.writeJSON(K.recent, ids.slice(0, 12)); },
    ids: function () { return TD.readJSON(K.recent, []).filter(function (id) { var p = TD.product(id); return p && p.active; }); }
  };

  TD.storageKeys = K;
})();
