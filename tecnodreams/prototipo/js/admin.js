/* =========================================================
 * TecnoDreams — painel administrativo (protótipo)
 * CRUD simulado sobre localStorage: produtos, categorias,
 * estoque, pedidos, promoções/cupons e configurações.
 * Tudo o que é salvo aqui aparece na loja (mesmo navegador).
 * Vendas, clientes e pedidos-semente são DEMONSTRATIVOS.
 * Depende de products.js, cart.js e app.js (ícones, toast, modal).
 * ========================================================= */
(function () {
  'use strict';
  const TD = window.TD;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = TD.esc;
  const fmt = TD.fmt;
  const icon = (n, c) => TD.icon(n, c);
  const toast = (m, o) => TD.toast(m, o);
  const SESSION = 'td_admin_session';

  const SECTIONS = [
    ['dashboard', 'Resumo', 'chart', 'Visão geral'],
    ['pedidos', 'Pedidos', 'receipt', 'Visão geral'],
    ['produtos', 'Produtos', 'package', 'Catálogo'],
    ['categorias', 'Categorias', 'layers', 'Catálogo'],
    ['inventario', 'Inventário', 'grid', 'Catálogo'],
    ['clientes', 'Clientes', 'users', 'Vendas'],
    ['promocoes', 'Promoções', 'percent', 'Vendas'],
    ['configuracao', 'Configuração', 'gear', 'Loja']
  ];

  /* ---------------- dados demonstrativos ---------------- */
  // gerador determinístico para que os números não mudem a cada recarga
  function rng(seed) { let h = seed >>> 0; return () => { h ^= h << 13; h >>>= 0; h ^= h >> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; }; }
  const NAMES = ['Ana Souza', 'Bruno Lima', 'Carla Mendes', 'Diego Rocha', 'Fernanda Alves', 'Gabriel Costa', 'Helena Martins', 'Igor Pereira', 'Juliana Ribeiro', 'Lucas Oliveira', 'Mariana Dias', 'Rafael Gomes', 'Patrícia Nunes', 'Thiago Carvalho'];
  const CITIES = [['São Paulo', 'SP'], ['Guarulhos', 'SP'], ['Campinas', 'SP'], ['Santo André', 'SP'], ['Rio de Janeiro', 'RJ'], ['Belo Horizonte', 'MG'], ['Curitiba', 'PR'], ['Osasco', 'SP']];
  const STATUS_CYCLE = ['entregue', 'entregue', 'enviado', 'entregue', 'separacao', 'pago', 'entregue', 'enviado', 'novo', 'entregue', 'cancelado', 'pago', 'entregue', 'separacao', 'enviado', 'novo', 'entregue', 'entregue'];

  let seedCache = null;
  function seedOrders() {
    if (seedCache) return seedCache;
    const r = rng(20261021);
    const pool = TD.baseProducts.filter((p) => p.price);
    const now = new Date();
    const out = [];
    for (let i = 0; i < 18; i++) {
      const items = [];
      const n = 1 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) {
        const p = pool[Math.floor(r() * pool.length)];
        if (items.some((x) => x.id === p.id)) continue;
        items.push({ id: p.id, name: p.name, price: p.price, qty: p.price > 800 ? 1 : 1 + Math.floor(r() * 2), img: p.images[0], category: p.category });
      }
      const sub = items.reduce((s, x) => s + x.price * x.qty, 0);
      const pickup = r() < 0.3;
      const ship = pickup ? 0 : Math.round((19.9 + r() * 30) * 100) / 100;
      const d = new Date(now.getTime() - Math.floor((i * 1.6 + r()) * 86400000) - Math.floor(r() * 36000000));
      const name = NAMES[i % NAMES.length];
      const city = CITIES[Math.floor(r() * CITIES.length)];
      out.push({
        id: 'TD-' + (5240 - i), date: d.toISOString(), status: STATUS_CYCLE[i], seed: true, items, subtotal: sub, discount: 0, shipping: ship, total: sub + ship,
        customer: { name, email: name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(' ', '.') + '@exemplo.com', phone: '(11) 9' + String(1000 + Math.floor(r() * 8999)) + '-' + String(1000 + Math.floor(r() * 8999)) },
        delivery: { method: pickup ? 'retirada' : 'padrao', name: pickup ? 'Retirada no escritório' : 'Entrega padrão' },
        address: pickup ? null : { city: city[0], uf: city[1] },
        payment: r() < 0.55 ? 'Pix' : 'Cartão de crédito'
      });
    }
    seedCache = out;
    return out;
  }
  function allOrders() {
    const s = TD.adminState();
    const st = s.orderStatus || {};
    const real = TD.orders.list().map((o) => Object.assign({}, o, { items: o.items.map((it) => Object.assign({ category: (TD.product(it.id) || {}).category }, it)) }));
    const seeds = seedOrders().map((o) => Object.assign({}, o, { status: st[o.id] || o.status }));
    return real.concat(seeds).sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  function setOrderStatus(o, status) {
    if (o.seed) {
      const s = TD.adminState();
      s.orderStatus = Object.assign({}, s.orderStatus, { [o.id]: status });
      TD.saveAdminState(s);
    } else TD.orders.update(o.id, { status });
  }
  const statusBadge = (s) => '<span class="status st-' + s + '">' + esc(TD.statusLabel(s)) + '</span>';
  const statusSelect = (o) => '<select class="inline" data-status="' + esc(o.id) + '" aria-label="Status do pedido">' + TD.orderStatuses.map((s) => '<option value="' + s.id + '"' + (s.id === o.status ? ' selected' : '') + '>' + s.label + '</option>').join('') + '</select>';
  const dateBR = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const stockTag = (p) => !p.inStock ? '<span class="tag tag-off">Esgotado</span>' : p.stock <= 5 ? '<span class="tag tag-warn">Baixo · ' + p.stock + '</span>' : '<span class="tag tag-ok">' + p.stock + ' un.</span>';

  /* ---------------- layout ---------------- */
  function shell() {
    const groups = [];
    SECTIONS.forEach((s) => { if (groups.indexOf(s[3]) === -1) groups.push(s[3]); });
    const newOrders = allOrders().filter((o) => o.status === 'novo').length;
    document.body.insertAdjacentHTML('beforeend',
      '<div class="admin"><aside class="a-side" id="a-side"><a class="logo" href="index.html"><img src="assets/brand/icone-td.png" alt="" width="38" height="38"><span class="logo-text"><strong>TecnoDreams</strong><small>Painel administrativo</small></span></a>' +
      '<nav class="a-nav" aria-label="Seções">' + groups.map((g) => '<div class="a-nav-label">' + g + '</div>' + SECTIONS.filter((s) => s[3] === g).map((s) => '<button type="button" data-sec="' + s[0] + '">' + icon(s[2]) + s[1] + (s[0] === 'pedidos' && newOrders ? '<span class="pill" data-new-orders>' + newOrders + '</span>' : '') + '</button>').join('')).join('') +
      '<div class="a-nav-label">Atalhos</div><a href="index.html" target="_blank" rel="noopener">' + icon('external') + 'Ver loja</a><a href="../index.html">' + icon('left') + 'Voltar à proposta</a></nav>' +
      '<div class="a-foot">Protótipo · dados salvos neste navegador<br><button type="button" data-logout style="color:#fff;margin-top:6px;text-decoration:underline">Sair do painel</button></div></aside>' +
      '<div class="overlay" data-overlay></div>' +
      '<div class="a-main"><header class="a-top"><div class="a-top-in"><button class="icon-btn a-menu-btn" type="button" data-menu aria-label="Abrir menu">' + icon('menu') + '</button><h1 id="a-title">Resumo</h1><span class="grow"></span>' +
      '<label class="a-search">' + icon('search') + '<span class="sr-only">Buscar produto</span><input type="search" id="a-search" placeholder="Buscar produto, SKU ou pedido…"></label>' +
      '<a class="btn btn-outline btn-sm" href="index.html" target="_blank" rel="noopener">' + icon('store') + '<span class="hide-xs">Ver loja</span></a><span class="avatar" style="width:38px;height:38px;font-size:13px" title="Administrador (demo)">AD</span></div></header>' +
      '<div class="a-content"><div class="demo-banner">' + icon('info') + '<span class="grow">Painel demonstrativo: produtos, preços e imagens são reais da TecnoDreams; <strong>vendas, pedidos de exemplo, clientes e estoque são simulados</strong>. As alterações aparecem na loja deste navegador.</span><button class="btn btn-sm btn-outline" type="button" data-reset>' + icon('refresh') + 'Restaurar demo</button></div><div id="a-view"></div></div></div></div>');
  }

  function login() {
    document.body.insertAdjacentHTML('beforeend', '<div class="auth" style="margin:6vh auto;max-width:880px" id="a-login"><div class="auth-side"><h2>Painel TecnoDreams</h2><ul><li>Pedidos e status</li><li>Produtos, categorias e estoque</li><li>Promoções e cupons</li><li>Configurações da loja</li></ul></div>' +
      '<div class="auth-form"><a class="logo" href="index.html" style="color:var(--navy-900);margin-bottom:18px"><img src="assets/brand/icone-td.png" alt="" width="40" height="40" style="filter:none"><span class="logo-text"><strong style="color:var(--navy-900);background:none;-webkit-text-fill-color:var(--navy-900)">TecnoDreams</strong><small style="color:var(--muted)">Acesso administrativo</small></span></a>' +
      '<form class="form-grid" id="a-login-form" novalidate>' + TD.ui.field({ id: 'al-email', label: 'E-mail', type: 'email', value: 'admin@tecnodreams.demo', validate: 'email', err: 'E-mail inválido.' }) +
      TD.ui.field({ id: 'al-pass', label: 'Senha', type: 'password', value: 'demo1234', validate: 'password', err: 'Mínimo 6 caracteres.' }) +
      '<div class="field"><button class="btn btn-primary btn-block" type="submit">' + icon('lock') + 'Entrar no painel</button></div></form>' +
      '<p class="note" style="margin-top:16px">' + icon('info') + '<span>Acesso simulado com credenciais de demonstração já preenchidas. No sistema final: login seguro, perfis de usuário (administrador, vendedor, estoque) e registro de alterações.</span></p>' +
      '<p style="margin:14px 0 0;font-size:13px"><a href="index.html" style="color:var(--navy-700);font-weight:600">← Voltar para a loja</a></p></div></div>');
    $('#a-login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (!TD.ui.validate(e.target)) return;
      const b = $('button[type=submit]', e.target);
      b.classList.add('loading');
      setTimeout(() => {
        try { sessionStorage.setItem(SESSION, '1'); } catch (er) { /* ignore */ }
        $('#a-login').remove();
        start();
      }, 600);
    });
  }

  let current = 'dashboard';
  function go(sec) {
    if (!SECTIONS.some((s) => s[0] === sec)) sec = 'dashboard';
    current = sec;
    $$('.a-nav [data-sec]').forEach((b) => b.classList.toggle('active', b.dataset.sec === sec));
    const meta = SECTIONS.find((s) => s[0] === sec);
    $('#a-title').textContent = meta[1];
    document.title = meta[1] + ' – Painel TecnoDreams';
    VIEWS[sec]($('#a-view'));
    $('#a-side').classList.remove('open');
    $('[data-overlay]').classList.remove('open');
    const pill = $('[data-new-orders]');
    const n = allOrders().filter((o) => o.status === 'novo').length;
    if (pill) { pill.textContent = n; pill.hidden = !n; }
  }
  function refresh() { go(current); }

  const panel = (title, body, actions) => '<div class="panel" style="margin-bottom:18px"><div class="panel-head"><h3>' + title + '</h3>' + (actions || '') + '</div>' + body + '</div>';

  /* =========================================================
     RESUMO
     ========================================================= */
  function viewDashboard(v) {
    const orders = allOrders();
    const since = Date.now() - 30 * 86400000;
    const recent = orders.filter((o) => new Date(o.date) >= since && o.status !== 'cancelado');
    const revenue = recent.reduce((s, o) => s + o.total, 0);
    const prev = revenue * 0.88; // período anterior (demonstrativo)
    const prods = TD.allProducts();
    const low = prods.filter((p) => p.active && p.price && p.stock <= 5);
    // série diária: pedidos + base demonstrativa para dar forma à curva
    const r = rng(7);
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const base = 900 + r() * 2600 + (d.getDay() === 0 || d.getDay() === 6 ? 900 : 0);
      const fromOrders = orders.filter((o) => { const od = new Date(o.date); od.setHours(0, 0, 0, 0); return od.getTime() === d.getTime() && o.status !== 'cancelado'; }).reduce((s, o) => s + o.total, 0);
      days.push({ d, v: Math.round(base + fromOrders) });
    }
    const byCat = {};
    recent.forEach((o) => o.items.forEach((it) => { const c = it.category || 'outros'; byCat[c] = (byCat[c] || 0) + it.price * it.qty; }));
    const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const maxCat = cats.length ? cats[0][1] : 1;
    const top = {};
    recent.forEach((o) => o.items.forEach((it) => { top[it.id] = (top[it.id] || 0) + it.qty; }));
    const topList = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, q]) => [TD.product(+id), q]).filter((x) => x[0]);

    v.innerHTML = '<div class="kpis">' +
      kpi('Vendas · 30 dias', fmt(revenue), '+' + Math.round((revenue / prev - 1) * 100) + '% vs. período anterior', 'chart') +
      kpi('Pedidos · 30 dias', recent.length, orders.filter((o) => o.status === 'novo').length + ' aguardando ação', 'receipt') +
      kpi('Ticket médio', fmt(recent.length ? revenue / recent.length : 0), 'Por pedido', 'tag') +
      kpi('Produtos ativos', prods.filter((p) => p.active).length, low.length + ' com estoque baixo', 'package', low.length > 0) + '</div>' +
      '<div class="a-grid">' + panel('Vendas diárias (R$)', '<div class="panel-body" style="position:relative"><div id="chart"></div><div class="chart-tip" id="chart-tip"></div></div>', '<span class="tag tag-warn">Demonstrativo</span>') +
      panel('Vendas por categoria', '<div class="panel-body"><div class="bars">' + cats.map(([c, val]) => '<div class="bar-row"><span>' + esc(TD.categoryName(c)) + '</span><span class="bar"><span style="width:0" data-w="' + (val / maxCat) * 100 + '%"></span></span><span class="v">' + fmt(val).replace(',00', '') + '</span></div>').join('') + '</div></div>') + '</div>' +
      '<div class="a-grid">' + panel('Pedidos recentes', '<div class="table-wrap"><table class="table"><thead><tr><th>Pedido</th><th>Cliente</th><th>Data</th><th>Total</th><th>Status</th></tr></thead><tbody>' +
        orders.slice(0, 6).map((o) => '<tr><td><button class="link-btn" style="color:var(--navy-700)" data-order="' + esc(o.id) + '">' + esc(o.id) + '</button>' + (o.demo ? ' <span class="tag tag-info">Loja</span>' : '') + '</td><td>' + esc(o.customer.name) + '</td><td>' + dateBR(o.date) + '</td><td><strong>' + fmt(o.total) + '</strong></td><td>' + statusBadge(o.status) + '</td></tr>').join('') +
        '</tbody></table></div>', '<button class="link-more" type="button" data-goto="pedidos">Ver todos</button>') +
      panel('Mais vendidos', topList.map(([p, q]) => '<div class="list-row"><img src="' + esc(TD.img(p)) + '" alt=""><div class="grow"><div style="font-weight:600;font-size:13.5px;line-height:1.3">' + esc(p.name) + '</div><small style="color:var(--muted)">' + q + ' vendido(s)</small></div><strong>' + fmt(p.price) + '</strong></div>').join('') +
        (low.length ? '<div class="list-row" style="background:var(--amber-50)">' + icon('alert') + '<div class="grow"><strong>' + low.length + ' produto(s) com estoque baixo</strong></div><button class="btn btn-sm btn-outline" type="button" data-goto="inventario">Revisar</button></div>' : '')) + '</div>';
    drawChart($('#chart'), days);
    requestAnimationFrame(() => $$('[data-w]', v).forEach((b) => { b.style.width = b.dataset.w; }));
  }
  function kpi(label, val, delta, ic, warn) {
    return '<div class="kpi"><span class="k-top">' + label + '<span class="k-ic">' + icon(ic) + '</span></span><span class="k-val">' + val + '</span><span class="k-delta' + (warn ? ' neg' : '') + '">' + delta + '</span></div>';
  }
  function drawChart(el, data) {
    const W = Math.max(el.clientWidth, 300), H = 260, P = { l: 52, r: 12, t: 12, b: 28 };
    const max = Math.ceil(Math.max.apply(null, data.map((d) => d.v)) / 1000) * 1000;
    const x = (i) => P.l + (i / (data.length - 1)) * (W - P.l - P.r);
    const y = (v) => P.t + (1 - v / max) * (H - P.t - P.b);
    const pts = data.map((d, i) => [x(i), y(d.v)]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    let grid = '';
    for (let k = 0; k <= 4; k++) { const v = (max / 4) * k; grid += '<line class="grid-line" x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="axis" x="' + (P.l - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + (v >= 1000 ? (v / 1000) + 'k' : v) + '</text>'; }
    const labels = data.map((d, i) => (i % 5 === 0 || i === data.length - 1 ? '<text class="axis" x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + d.d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + '</text>' : '')).join('');
    const hits = pts.map((p, i) => '<rect class="hit" x="' + (p[0] - (W / data.length) / 2) + '" y="' + P.t + '" width="' + W / data.length + '" height="' + (H - P.t - P.b) + '" fill="transparent" data-i="' + i + '"/><circle class="pt" cx="' + p[0] + '" cy="' + p[1] + '" r="4.5"/>').join('');
    el.innerHTML = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" role="img" aria-label="Gráfico de vendas diárias"><defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f8cff" stop-opacity=".28"/><stop offset="1" stop-color="#2f8cff" stop-opacity="0"/></linearGradient></defs>' + grid +
      '<path class="area" d="' + line + ' L' + x(data.length - 1) + ' ' + y(0) + ' L' + x(0) + ' ' + y(0) + ' Z"/><path class="line" d="' + line + '"/>' + labels + hits + '</svg>';
    const tip = $('#chart-tip');
    el.addEventListener('mousemove', (e) => {
      const h = e.target.closest('.hit');
      if (!h) { tip.style.opacity = 0; return; }
      const i = +h.dataset.i;
      const svg = $('svg', el).getBoundingClientRect();
      const host = el.parentElement.getBoundingClientRect();
      tip.style.left = (svg.left - host.left + (pts[i][0] / W) * svg.width) + 'px';
      tip.style.top = (svg.top - host.top + pts[i][1]) + 'px';
      tip.innerHTML = '<strong>' + fmt(data[i].v) + '</strong> · ' + data[i].d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
      tip.style.opacity = 1;
    });
    el.addEventListener('mouseleave', () => { tip.style.opacity = 0; });
  }

  /* =========================================================
     PEDIDOS
     ========================================================= */
  const oState = { status: '', q: '' };
  function viewOrders(v) {
    const orders = allOrders().filter((o) => (!oState.status || o.status === oState.status) && (!oState.q || TD.norm(o.id + ' ' + o.customer.name + ' ' + o.customer.email).indexOf(TD.norm(oState.q)) > -1));
    const counts = {};
    allOrders().forEach((o) => { counts[o.status] = (counts[o.status] || 0) + 1; });
    v.innerHTML = '<div class="panel"><div class="a-toolbar"><input type="search" placeholder="Buscar por pedido ou cliente" value="' + esc(oState.q) + '" data-oq style="min-width:240px">' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="chip' + (!oState.status ? ' active' : '') + '" data-ost="">Todos</button>' + TD.orderStatuses.map((s) => '<button class="chip' + (oState.status === s.id ? ' active' : '') + '" data-ost="' + s.id + '">' + s.label + ' <small>' + (counts[s.id] || 0) + '</small></button>').join('') + '</div><span class="grow"></span>' +
      '<button class="btn btn-outline btn-sm" type="button" data-export>' + icon('copy') + 'Exportar CSV</button></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Pedido</th><th>Data</th><th>Cliente</th><th>Itens</th><th>Entrega</th><th>Pagamento</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>' +
      (orders.length ? orders.map((o) => '<tr><td><strong>' + esc(o.id) + '</strong>' + (o.demo ? '<br><span class="tag tag-info">Feito na loja</span>' : '') + '</td><td>' + new Date(o.date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + '</td>' +
        '<td>' + esc(o.customer.name) + '<br><small style="color:var(--muted)">' + esc(o.customer.email) + '</small></td><td>' + o.items.reduce((s, i) => s + i.qty, 0) + '</td><td>' + esc(o.delivery.name) + (o.address ? '<br><small style="color:var(--muted)">' + esc(o.address.city) + '/' + esc(o.address.uf) + '</small>' : '') + '</td>' +
        '<td>' + esc(o.payment) + '</td><td><strong>' + fmt(o.total) + '</strong></td><td>' + statusSelect(o) + '</td><td class="t-actions"><button class="icon-btn" type="button" data-order="' + esc(o.id) + '" aria-label="Ver pedido">' + icon('eye') + '</button></td></tr>').join('')
        : '<tr><td colspan="9">' + TD.emptyState('receipt', 'Nenhum pedido encontrado', 'Ajuste a busca ou o filtro de status.') + '</td></tr>') +
      '</tbody></table></div><div class="pager"><span>' + orders.length + ' pedido(s)</span><span>Pedidos “Feito na loja” vêm do checkout demonstrativo deste navegador.</span></div></div>';
  }
  function orderModal(id) {
    const o = allOrders().find((x) => x.id === id);
    if (!o) return;
    TD.modal({
      title: 'Pedido ' + o.id, wide: true,
      body: '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px">' + statusBadge(o.status) + '<span style="color:var(--muted);font-size:13px">' + new Date(o.date).toLocaleString('pt-BR') + '</span>' + (o.seed ? '<span class="tag tag-warn">Pedido de exemplo</span>' : '<span class="tag tag-info">Feito no checkout demonstrativo</span>') + '</div>' +
        '<div class="settings-grid" style="gap:14px;margin-bottom:14px"><div class="note" style="display:block"><strong>Cliente</strong><br>' + esc(o.customer.name) + '<br>' + esc(o.customer.email) + '<br>' + esc(o.customer.phone || '') + '</div>' +
        '<div class="note" style="display:block"><strong>Entrega</strong><br>' + esc(o.delivery.name) + '<br>' + (o.address ? esc([o.address.street, o.address.number, o.address.district].filter(Boolean).join(', ')) + ' ' + esc(o.address.city + '/' + o.address.uf) : esc(TD.settings().address)) + '<br><strong>Pagamento:</strong> ' + esc(o.payment) + '</div></div>' +
        o.items.map((i) => '<div class="sum-item" style="margin-bottom:10px"><div class="si-img"><img src="' + esc(i.img) + '" alt=""><span>' + i.qty + '</span></div><div class="si-name">' + esc(i.name) + '</div><strong>' + fmt(i.price * i.qty) + '</strong></div>').join('') +
        '<div class="sum-row"><span>Subtotal</span><span>' + fmt(o.subtotal) + '</span></div>' + (o.discount ? '<div class="sum-row discount"><span>Desconto ' + esc(o.coupon || '') + '</span><span>−' + fmt(o.discount) + '</span></div>' : '') +
        '<div class="sum-row"><span>Frete</span><span>' + (o.shipping ? fmt(o.shipping) : 'Grátis') + '</span></div><div class="sum-row total"><span>Total</span><span>' + fmt(o.total) + '</span></div>' +
        '<div class="field" style="margin-top:14px"><label for="m-status">Atualizar status</label><select id="m-status">' + TD.orderStatuses.map((s) => '<option value="' + s.id + '"' + (s.id === o.status ? ' selected' : '') + '>' + s.label + '</option>').join('') + '</select><span class="hint">No sistema final, o cliente é notificado por e-mail/WhatsApp a cada mudança.</span></div>',
      foot: '<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="https://wa.me/55' + TD.ui.onlyDigits(o.customer.phone || '') + '?text=' + encodeURIComponent('Olá, ' + o.customer.name.split(' ')[0] + '! Sobre o seu pedido ' + o.id + ' na TecnoDreams: ') + '">' + icon('wa', 'fill') + 'Falar com cliente</a><button class="btn btn-primary btn-sm" data-ok>Salvar status</button>',
      onOpen: (el, close) => $('[data-ok]', el).addEventListener('click', () => { setOrderStatus(o, $('#m-status', el).value); close(); toast('Status do pedido atualizado', { sub: o.id + ' → ' + TD.statusLabel($('#m-status', el).value) }); refresh(); })
    });
  }

  /* =========================================================
     PRODUTOS
     ========================================================= */
  const pState = { q: '', cat: '', status: '', page: 1 };
  const PER = 12;
  function viewProducts(v) {
    const all = TD.allProducts();
    let list = pState.q ? TD.search(pState.q, all) : all.slice().sort((a, b) => b.id - a.id);
    if (pState.cat) list = list.filter((p) => p.category === pState.cat);
    if (pState.status === 'ativo') list = list.filter((p) => p.active);
    if (pState.status === 'inativo') list = list.filter((p) => !p.active);
    if (pState.status === 'oferta') list = list.filter((p) => TD.discountPct(p));
    if (pState.status === 'consulta') list = list.filter((p) => !p.price);
    const pages = Math.max(1, Math.ceil(list.length / PER));
    pState.page = Math.min(pState.page, pages);
    const slice = list.slice((pState.page - 1) * PER, pState.page * PER);
    v.innerHTML = '<div class="panel"><div class="a-toolbar"><input type="search" placeholder="Nome, marca ou SKU" value="' + esc(pState.q) + '" data-pq style="min-width:220px">' +
      '<select data-pcat><option value="">Todas as categorias</option>' + TD.categories().map((c) => '<option value="' + c.slug + '"' + (pState.cat === c.slug ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') + '</select>' +
      '<select data-pstatus>' + [['', 'Todos os status'], ['ativo', 'Ativos'], ['inativo', 'Inativos'], ['oferta', 'Em oferta'], ['consulta', 'Preço sob consulta']].map((o) => '<option value="' + o[0] + '"' + (pState.status === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>' +
      '<span class="grow"></span><button class="btn btn-primary btn-sm" type="button" data-new-product>' + icon('plus') + 'Novo produto</button></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Ativo</th><th></th></tr></thead><tbody>' +
      (slice.length ? slice.map((p) => '<tr' + (p.active ? '' : ' style="opacity:.6"') + '><td><div class="t-prod"><img src="' + esc(TD.img(p)) + '" alt=""><div><strong>' + esc(p.name) + '</strong><small style="color:var(--muted)">' + esc(p.brand || '—') + (p.sku ? ' · ' + esc(p.sku) : '') + (p.featured ? ' · ★ destaque' : '') + '</small></div></div></td>' +
        '<td>' + esc(TD.categoryName(p.category)) + '</td><td>' + (p.price ? '<strong>' + fmt(p.price) + '</strong>' + (p.regularPrice ? '<br><small style="color:var(--muted)"><s>' + fmt(p.regularPrice) + '</s> −' + TD.discountPct(p) + '%</small>' : '') : '<span class="tag tag-info">Sob consulta</span>') + '</td>' +
        '<td>' + stockTag(p) + '</td><td><label class="switch"><input type="checkbox" data-active="' + p.id + '"' + (p.active ? ' checked' : '') + ' aria-label="Produto ativo"><span></span></label></td>' +
        '<td class="t-actions"><a class="icon-btn" href="producto.html?id=' + p.id + '" target="_blank" rel="noopener" aria-label="Ver na loja">' + icon('eye') + '</a><button class="icon-btn" type="button" data-edit="' + p.id + '" aria-label="Editar">' + icon('edit') + '</button><button class="icon-btn danger" type="button" data-delete="' + p.id + '" aria-label="Excluir">' + icon('trash') + '</button></td></tr>').join('')
        : '<tr><td colspan="6">' + TD.emptyState('package', 'Nenhum produto encontrado', 'Ajuste a busca ou os filtros.') + '</td></tr>') +
      '</tbody></table></div><div class="pager"><span>' + list.length + ' produto(s) · página ' + pState.page + ' de ' + pages + '</span><span class="pg-btns"><button class="btn btn-outline btn-sm" type="button" data-pg="-1"' + (pState.page <= 1 ? ' disabled' : '') + '>' + icon('left') + '</button><button class="btn btn-outline btn-sm" type="button" data-pg="1"' + (pState.page >= pages ? ' disabled' : '') + '>' + icon('right') + '</button></span></div></div>';
  }
  function productModal(id) {
    const p = id ? TD.product(id) : null;
    const isNew = !p;
    const d = p || { name: '', brand: '', category: pState.cat || 'mouse', sku: '', price: '', regularPrice: '', stock: 10, active: true, featured: false, images: [], bullets: [] };
    const brands = Array.from(new Set(TD.allProducts().map((x) => x.brand).filter(Boolean))).sort();
    const pool = Array.from(new Set(TD.allProducts().map((x) => x.images[0]).filter(Boolean)));
    let chosen = (d.images && d.images[0]) || '';
    const F = TD.ui.field;
    TD.modal({
      title: isNew ? 'Novo produto' : 'Editar produto', wide: true,
      body: '<form class="form-grid" id="p-form" novalidate>' +
        F({ id: 'f-name', label: 'Nome do produto', validate: 'required', err: 'Obrigatório.', value: d.name }) +
        '<div class="field third"><label for="f-brand">Marca</label><input id="f-brand" list="brand-list" value="' + esc(d.brand) + '"><datalist id="brand-list">' + brands.map((b) => '<option value="' + esc(b) + '">').join('') + '</datalist></div>' +
        F({ id: 'f-cat', label: 'Categoria', size: 'third', type: 'select', options: TD.categories().map((c) => '<option value="' + c.slug + '"' + (c.slug === d.category ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') }) +
        F({ id: 'f-sku', label: 'SKU', size: 'third', value: d.sku || '', optional: true }) +
        F({ id: 'f-price', label: 'Preço de venda (R$)', size: 'third', type: 'number', value: d.price || '', hint: 'Vazio = preço sob consulta' }) +
        F({ id: 'f-regular', label: 'Preço anterior (R$)', size: 'third', type: 'number', value: d.regularPrice || '', optional: true, hint: 'Preencha para mostrar como oferta' }) +
        F({ id: 'f-stock', label: 'Estoque (un.)', size: 'third', type: 'number', value: d.stock, validate: 'required', err: 'Informe o estoque.' }) +
        '<div class="field"><label>Imagem principal</label><div class="img-picker">' + pool.map((src) => '<button type="button" class="' + (src === chosen ? 'active' : '') + '" data-pick="' + esc(src) + '"><img src="' + esc(src) + '" alt="" loading="lazy"></button>').join('') + '</div><span class="hint">No sistema final: upload de várias fotos com compressão automática (WebP).</span></div>' +
        '<div class="field"><label for="f-bullets">Destaques <span class="opt">(um por linha)</span></label><textarea id="f-bullets">' + esc((d.bullets || []).join('\n')) + '</textarea></div>' +
        '<div class="field half"><label class="check"><input type="checkbox" id="f-active"' + (d.active ? ' checked' : '') + '>Produto ativo (visível na loja)</label></div>' +
        '<div class="field half"><label class="check"><input type="checkbox" id="f-featured"' + (d.featured ? ' checked' : '') + '>Destacar em “Mais populares”</label></div></form>',
      foot: '<button class="btn btn-outline btn-sm" data-close>Cancelar</button><button class="btn btn-primary btn-sm" data-ok>' + (isNew ? 'Criar produto' : 'Salvar alterações') + '</button>',
      onOpen: (el, close) => {
        el.addEventListener('click', (e) => {
          const b = e.target.closest('[data-pick]');
          if (!b) return;
          chosen = b.dataset.pick;
          $$('[data-pick]', el).forEach((x) => x.classList.toggle('active', x === b));
        });
        $('[data-ok]', el).addEventListener('click', () => {
          const f = $('#p-form', el);
          if (!TD.ui.validate(f)) return;
          const price = parseFloat($('#f-price', el).value) || null;
          const regular = parseFloat($('#f-regular', el).value) || null;
          if (regular && price && regular <= price) { toast('O preço anterior deve ser maior que o preço de venda', { type: 'error' }); return; }
          const rec = {
            id: isNew ? Date.now() : p.id, name: $('#f-name', el).value.trim(), brand: $('#f-brand', el).value.trim(), category: $('#f-cat', el).value,
            sku: $('#f-sku', el).value.trim() || null, price, regularPrice: regular, stock: Math.max(0, parseInt($('#f-stock', el).value, 10) || 0),
            active: $('#f-active', el).checked, featured: $('#f-featured', el).checked,
            bullets: $('#f-bullets', el).value.split('\n').map((s) => s.trim()).filter(Boolean)
          };
          if (isNew || chosen !== (p.images || [])[0]) rec.images = chosen ? [chosen].concat(((p && p.images) || []).filter((x) => x !== chosen)) : [];
          if (isNew) rec.inStock = rec.stock > 0;
          const newId = TD.saveProduct(rec);
          close();
          toast(isNew ? 'Produto criado' : 'Produto atualizado', { sub: rec.name, action: 'Ver na loja', onAction: () => window.open('producto.html?id=' + newId, '_blank') });
          refresh();
        });
      }
    });
  }

  /* =========================================================
     CATEGORIAS
     ========================================================= */
  function viewCategories(v) {
    const cats = TD.categories();
    v.innerHTML = '<div class="panel"><div class="a-toolbar"><span style="font-size:14px;color:var(--muted)">' + cats.length + ' categorias em ' + TD.groups.length + ' grupos</span><span class="grow"></span><button class="btn btn-primary btn-sm" type="button" data-new-cat>' + icon('plus') + 'Nova categoria</button></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Categoria</th><th>Grupo</th><th>Produtos</th><th>Descrição</th><th></th></tr></thead><tbody>' +
      cats.map((c) => '<tr><td><div class="t-prod" style="min-width:200px"><img src="' + esc(c.img) + '" alt="" style="object-fit:' + (c.fit === 'contain' ? 'contain' : 'cover') + '"><div><strong>' + esc(c.name) + '</strong><small style="color:var(--muted)">/categoria/' + esc(c.slug) + '</small></div></div></td>' +
        '<td>' + esc((TD.group(c.group) || {}).name || '') + '</td><td><strong>' + c.count + '</strong></td><td style="max-width:360px;color:var(--ink-2)">' + esc(c.desc || '') + '</td>' +
        '<td class="t-actions"><a class="icon-btn" href="categoria.html?c=' + c.slug + '" target="_blank" rel="noopener" aria-label="Ver na loja">' + icon('eye') + '</a><button class="icon-btn" type="button" data-edit-cat="' + c.slug + '" aria-label="Editar">' + icon('edit') + '</button><button class="icon-btn danger" type="button" data-del-cat="' + c.slug + '" aria-label="Excluir">' + icon('trash') + '</button></td></tr>').join('') +
      '</tbody></table></div><div class="pager"><span>Na migração, as URLs antigas (/categoria/tecnologia-gaming/…) são redirecionadas (301) para as novas.</span></div></div>';
  }
  function categoryModal(slug) {
    const c = slug ? TD.category(slug) : null;
    const F = TD.ui.field;
    TD.modal({
      title: c ? 'Editar categoria' : 'Nova categoria',
      body: '<form class="form-grid" id="c-form" novalidate>' + F({ id: 'k-name', label: 'Nome', validate: 'required', err: 'Obrigatório.', value: c ? c.name : '' }) +
        F({ id: 'k-group', label: 'Grupo', type: 'select', options: TD.groups.map((g) => '<option value="' + g.slug + '"' + (c && c.group === g.slug ? ' selected' : '') + '>' + esc(g.name) + '</option>').join('') }) +
        '<div class="field"><label for="k-desc">Descrição</label><textarea id="k-desc">' + esc(c ? c.desc || '' : '') + '</textarea><span class="hint">Aparece no topo da página da categoria e ajuda no SEO.</span></div></form>',
      foot: '<button class="btn btn-outline btn-sm" data-close>Cancelar</button><button class="btn btn-primary btn-sm" data-ok>Salvar</button>',
      onOpen: (el, close) => $('[data-ok]', el).addEventListener('click', () => {
        if (!TD.ui.validate($('#c-form', el))) return;
        const s = TD.adminState();
        const rec = { name: $('#k-name', el).value.trim(), group: $('#k-group', el).value, desc: $('#k-desc', el).value.trim() };
        if (c) {
          const added = s.newCategories.find((x) => x.slug === c.slug);
          if (added) Object.assign(added, rec); else s.categories[c.slug] = Object.assign({}, s.categories[c.slug], rec);
        } else {
          const sl = TD.norm(rec.name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          if (TD.category(sl)) { toast('Já existe uma categoria com esse nome', { type: 'error' }); return; }
          s.newCategories.push(Object.assign({ slug: sl, image: '' }, rec));
        }
        TD.saveAdminState(s);
        close();
        toast(c ? 'Categoria atualizada' : 'Categoria criada', { sub: rec.name });
        refresh();
      })
    });
  }

  /* =========================================================
     INVENTÁRIO
     ========================================================= */
  const iState = { filter: 'baixo', q: '' };
  function viewInventory(v) {
    const all = TD.allProducts().filter((p) => p.price);
    let list = iState.q ? TD.search(iState.q, all) : all.slice().sort((a, b) => a.stock - b.stock);
    if (iState.filter === 'baixo') list = list.filter((p) => p.stock <= 5);
    if (iState.filter === 'esgotado') list = list.filter((p) => p.stock === 0);
    const value = all.reduce((s, p) => s + p.stock * p.price, 0);
    v.innerHTML = '<div class="kpis">' + kpi('Unidades em estoque', all.reduce((s, p) => s + p.stock, 0), 'Itens com preço definido', 'package') +
      kpi('Valor em estoque', fmt(value), 'A preço de venda', 'chart') + kpi('Estoque baixo (≤ 5)', all.filter((p) => p.stock > 0 && p.stock <= 5).length, 'Reposição recomendada', 'alert', true) + kpi('Esgotados', all.filter((p) => !p.stock).length, 'Mostram “Avise-me” na loja', 'bell', true) + '</div>' +
      '<div class="panel"><div class="a-toolbar"><input type="search" placeholder="Buscar produto" value="' + esc(iState.q) + '" data-iq><div style="display:flex;gap:6px">' +
      [['baixo', 'Estoque baixo'], ['esgotado', 'Esgotados'], ['todos', 'Todos']].map((f) => '<button class="chip' + (iState.filter === f[0] ? ' active' : '') + '" data-if="' + f[0] + '">' + f[1] + '</button>').join('') + '</div></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Produto</th><th>SKU</th><th>Situação</th><th style="text-align:right">Estoque</th><th>Ajuste rápido</th></tr></thead><tbody>' +
      (list.length ? list.map((p) => '<tr><td><div class="t-prod"><img src="' + esc(TD.img(p)) + '" alt=""><strong>' + esc(p.name) + '</strong></div></td><td>' + esc(p.sku || '—') + '</td><td>' + stockTag(p) + '</td>' +
        '<td style="text-align:right"><input class="inline" type="number" min="0" value="' + p.stock + '" data-stock="' + p.id + '" aria-label="Estoque"></td><td><div style="display:flex;gap:6px"><button class="btn btn-outline btn-sm" type="button" data-add-stock="' + p.id + '" data-n="5">+5</button><button class="btn btn-outline btn-sm" type="button" data-add-stock="' + p.id + '" data-n="10">+10</button></div></td></tr>').join('')
        : '<tr><td colspan="5">' + TD.emptyState('check', 'Tudo em ordem', 'Nenhum produto neste filtro.') + '</td></tr>') + '</tbody></table></div></div>';
  }
  function setStock(id, n) {
    n = Math.max(0, parseInt(n, 10) || 0);
    TD.saveProduct({ id, stock: n });
    const p = TD.product(id);
    toast('Estoque atualizado', { sub: p.name + ': ' + n + ' un.' });
  }

  /* =========================================================
     CLIENTES
     ========================================================= */
  function viewCustomers(v) {
    const map = {};
    allOrders().forEach((o) => {
      const k = o.customer.email;
      const c = map[k] || (map[k] = { name: o.customer.name, email: k, phone: o.customer.phone, orders: 0, total: 0, last: o.date, city: o.address ? o.address.city + '/' + o.address.uf : 'Retirada', store: !o.seed });
      if (o.status !== 'cancelado') { c.orders++; c.total += o.total; }
      if (new Date(o.date) > new Date(c.last)) c.last = o.date;
    });
    const acc = TD.account.get();
    if (acc.loggedIn && acc.profile.email && !map[acc.profile.email]) map[acc.profile.email] = { name: acc.profile.name, email: acc.profile.email, phone: acc.profile.phone, orders: 0, total: 0, last: null, city: '—', store: true };
    const list = Object.values(map).sort((a, b) => b.total - a.total);
    v.innerHTML = '<div class="panel"><div class="a-toolbar"><span style="font-size:14px;color:var(--muted)">' + list.length + ' clientes · nomes e contatos de exemplo</span><span class="grow"></span><button class="btn btn-outline btn-sm" type="button" data-export-clients>' + icon('copy') + 'Exportar CSV</button></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Cliente</th><th>Cidade</th><th>Pedidos</th><th>Total gasto</th><th>Último pedido</th><th></th></tr></thead><tbody>' +
      list.map((c) => '<tr><td><div class="t-prod" style="min-width:220px"><span class="avatar" style="width:38px;height:38px;font-size:13px">' + esc(c.name.split(' ').map((w) => w[0]).slice(0, 2).join('')) + '</span><div><strong>' + esc(c.name) + (c.store ? ' <span class="tag tag-info">Loja</span>' : '') + '</strong><small style="color:var(--muted)">' + esc(c.email) + '</small></div></div></td>' +
        '<td>' + esc(c.city) + '</td><td>' + c.orders + '</td><td><strong>' + fmt(c.total) + '</strong></td><td>' + (c.last ? dateBR(c.last) : '—') + '</td>' +
        '<td class="t-actions">' + (c.phone ? '<a class="icon-btn" target="_blank" rel="noopener" href="https://wa.me/55' + TD.ui.onlyDigits(c.phone) + '" aria-label="WhatsApp">' + icon('wa', 'fill') + '</a>' : '') + '<button class="icon-btn" type="button" data-client="' + esc(c.email) + '" aria-label="Ver pedidos">' + icon('receipt') + '</button></td></tr>').join('') +
      '</tbody></table></div></div>';
  }

  /* =========================================================
     PROMOÇÕES
     ========================================================= */
  function viewPromos(v) {
    const s = TD.adminState();
    const sale = TD.allProducts().filter((p) => TD.discountPct(p));
    v.innerHTML = panel('Cupons de desconto', '<div class="table-wrap"><table class="table"><thead><tr><th>Código</th><th>Desconto</th><th>Compra mínima</th><th>Descrição</th><th>Ativo</th><th></th></tr></thead><tbody>' +
      (s.coupons.length ? s.coupons.map((c, i) => '<tr><td><span class="tag tag-dark">' + esc(c.code) + '</span></td><td><strong>' + (c.type === 'percent' ? c.value + '%' : fmt(c.value)) + '</strong></td><td>' + (c.min ? fmt(c.min) : '—') + '</td><td style="color:var(--ink-2)">' + esc(c.note || '') + '</td>' +
        '<td><label class="switch"><input type="checkbox" data-coupon-active="' + i + '"' + (c.active ? ' checked' : '') + ' aria-label="Cupom ativo"><span></span></label></td><td class="t-actions"><button class="icon-btn" type="button" data-edit-coupon="' + i + '" aria-label="Editar">' + icon('edit') + '</button><button class="icon-btn danger" type="button" data-del-coupon="' + i + '" aria-label="Excluir">' + icon('trash') + '</button></td></tr>').join('')
        : '<tr><td colspan="6">' + TD.emptyState('tag', 'Nenhum cupom', 'Crie um cupom para usar no carrinho da loja.') + '</td></tr>') +
      '</tbody></table></div>', '<button class="btn btn-primary btn-sm" type="button" data-new-coupon>' + icon('plus') + 'Novo cupom</button>') +
      panel('Produtos em oferta', '<div class="table-wrap"><table class="table"><thead><tr><th>Produto</th><th>De</th><th>Por</th><th>Desconto</th><th></th></tr></thead><tbody>' +
        (sale.length ? sale.map((p) => '<tr><td><div class="t-prod"><img src="' + esc(TD.img(p)) + '" alt=""><strong>' + esc(p.name) + '</strong></div></td><td><s>' + fmt(p.regularPrice) + '</s></td><td><strong>' + fmt(p.price) + '</strong></td><td><span class="tag tag-sale">−' + TD.discountPct(p) + '%</span></td>' +
          '<td class="t-actions"><button class="btn btn-outline btn-sm" type="button" data-end-sale="' + p.id + '">Encerrar oferta</button></td></tr>').join('')
          : '<tr><td colspan="5">' + TD.emptyState('percent', 'Nenhuma oferta ativa', 'Coloque produtos em promoção para que apareçam na seção de ofertas da loja.') + '</td></tr>') +
        '</tbody></table></div>', '<button class="btn btn-primary btn-sm" type="button" data-new-sale>' + icon('plus') + 'Colocar produto em oferta</button>');
  }
  function couponModal(i) {
    const s = TD.adminState();
    const c = i != null ? s.coupons[i] : { code: '', type: 'percent', value: 10, min: 0, active: true, note: '' };
    const F = TD.ui.field;
    TD.modal({
      title: i != null ? 'Editar cupom' : 'Novo cupom',
      body: '<form class="form-grid" id="cp-form" novalidate>' + F({ id: 'cp-code', label: 'Código', size: 'half', value: c.code, validate: 'required', err: 'Obrigatório.' }) +
        F({ id: 'cp-type', label: 'Tipo', size: 'half', type: 'select', options: '<option value="percent"' + (c.type === 'percent' ? ' selected' : '') + '>Percentual (%)</option><option value="fixed"' + (c.type === 'fixed' ? ' selected' : '') + '>Valor fixo (R$)</option>' }) +
        F({ id: 'cp-value', label: 'Valor', size: 'half', type: 'number', value: c.value, validate: 'required', err: 'Obrigatório.' }) +
        F({ id: 'cp-min', label: 'Compra mínima (R$)', size: 'half', type: 'number', value: c.min || '', optional: true }) +
        F({ id: 'cp-note', label: 'Descrição interna', value: c.note, optional: true }) + '</form>',
      foot: '<button class="btn btn-outline btn-sm" data-close>Cancelar</button><button class="btn btn-primary btn-sm" data-ok>Salvar cupom</button>',
      onOpen: (el, close) => $('[data-ok]', el).addEventListener('click', () => {
        if (!TD.ui.validate($('#cp-form', el))) return;
        const rec = { code: $('#cp-code', el).value.trim().toUpperCase().replace(/\s+/g, ''), type: $('#cp-type', el).value, value: Math.max(0, +$('#cp-value', el).value), min: +$('#cp-min', el).value || 0, active: c.active, note: $('#cp-note', el).value.trim() };
        if (rec.type === 'percent' && rec.value > 90) { toast('Percentual máximo: 90%', { type: 'error' }); return; }
        const st = TD.adminState();
        if (st.coupons.some((x, k) => x.code === rec.code && k !== i)) { toast('Já existe um cupom com esse código', { type: 'error' }); return; }
        if (i != null) st.coupons[i] = rec; else st.coupons.push(rec);
        TD.saveAdminState(st);
        close();
        toast('Cupom salvo', { sub: rec.code + ' já pode ser usado no carrinho da loja.' });
        refresh();
      })
    });
  }
  function saleModal() {
    const cands = TD.allProducts().filter((p) => p.active && p.price && !TD.discountPct(p)).sort((a, b) => a.name.localeCompare(b.name));
    const F = TD.ui.field;
    TD.modal({
      title: 'Colocar produto em oferta',
      body: '<form class="form-grid" id="s-form" novalidate>' + F({ id: 's-prod', label: 'Produto', type: 'select', options: cands.map((p) => '<option value="' + p.id + '" data-price="' + p.price + '">' + esc(p.name) + ' — ' + fmt(p.price) + '</option>').join('') }) +
        F({ id: 's-pct', label: 'Desconto (%)', size: 'half', type: 'number', value: 10, validate: 'required', err: 'Obrigatório.' }) +
        '<div class="field half"><label>Novo preço</label><div class="input" id="s-preview" style="background:var(--bg);font-weight:700"></div></div></form>',
      foot: '<button class="btn btn-outline btn-sm" data-close>Cancelar</button><button class="btn btn-primary btn-sm" data-ok>Aplicar oferta</button>',
      onOpen: (el, close) => {
        const calc = () => { const p = TD.product(+$('#s-prod', el).value); const pct = Math.min(90, Math.max(1, +$('#s-pct', el).value || 0)); const np = Math.round(p.price * (1 - pct / 100) * 100) / 100; $('#s-preview', el).textContent = fmt(np); return { p, np }; };
        calc();
        $('#s-prod', el).addEventListener('change', calc);
        $('#s-pct', el).addEventListener('input', calc);
        $('[data-ok]', el).addEventListener('click', () => {
          const { p, np } = calc();
          TD.saveProduct({ id: p.id, regularPrice: p.price, price: np });
          close();
          toast('Oferta aplicada', { sub: p.name + ' agora por ' + fmt(np), action: 'Ver na loja', onAction: () => window.open('catalogo.html?oferta=1', '_blank') });
          refresh();
        });
      }
    });
  }

  /* =========================================================
     CONFIGURAÇÃO
     ========================================================= */
  function viewSettings(v) {
    const st = TD.settings();
    const F = TD.ui.field;
    v.innerHTML = '<div class="settings-grid">' + panel('Informações da loja', '<div class="panel-body"><form class="form-grid" id="set-form" novalidate>' +
      F({ id: 's-tagline', label: 'Slogan', value: st.tagline, validate: 'required', err: 'Obrigatório.' }) +
      F({ id: 's-ann', label: 'Barra de anúncio (topo da loja)', value: st.announcement, validate: 'required', err: 'Obrigatório.' }) +
      F({ id: 's-wa', label: 'WhatsApp (com DDI)', size: 'half', value: st.whatsapp, validate: 'required', err: 'Obrigatório.', hint: 'Ex.: 5511977152525' }) +
      F({ id: 's-phone', label: 'Telefone exibido', size: 'half', value: st.phone }) +
      F({ id: 's-address', label: 'Endereço do escritório / retirada', size: 'two-thirds', value: st.address }) +
      F({ id: 's-cep', label: 'CEP', size: 'third', value: st.cep }) +
      '<div class="field"><button class="btn btn-primary" type="submit">' + icon('check') + 'Salvar configurações</button><span class="hint">As mudanças aparecem imediatamente na loja (cabeçalho, rodapé, WhatsApp e checkout).</span></div></form></div>') +
      '<div>' + panel('Pagamentos e entrega', '<div class="list-row">' + icon('pix') + '<div class="grow"><strong>Pix</strong><br><small style="color:var(--muted)">Integração via provedor (ex.: PagBank) no sistema final</small></div><span class="tag tag-ok">Ativo</span></div>' +
        '<div class="list-row">' + icon('card') + '<div class="grow"><strong>Cartão de crédito</strong><br><small style="color:var(--muted)">Visa e Mastercard</small></div><span class="tag tag-ok">Ativo</span></div>' +
        '<div class="list-row">' + icon('store') + '<div class="grow"><strong>Retirada no escritório</strong><br><small style="color:var(--muted)">' + esc(st.address) + '</small></div><span class="tag tag-ok">Ativo</span></div>' +
        '<div class="list-row">' + icon('truck') + '<div class="grow"><strong>Frete por CEP</strong><br><small style="color:var(--muted)">Simulado no protótipo; transportadora a definir</small></div><span class="tag tag-warn">A definir</span></div>') +
      panel('SEO e migração', '<div class="list-row">' + icon('check') + '<div class="grow">URLs amigáveis e redirecionamentos 301 das páginas do WordPress</div></div><div class="list-row">' + icon('check') + '<div class="grow">Sitemap XML e dados estruturados de produto (schema.org)</div></div><div class="list-row">' + icon('check') + '<div class="grow">Títulos e descrições editáveis por produto e categoria</div></div>') +
      panel('Dados do protótipo', '<div class="panel-body"><p style="margin:0 0 12px;color:var(--ink-2);font-size:14px">Apaga as alterações feitas no painel, pedidos de teste, carrinho, favoritos e conta deste navegador.</p><button class="btn btn-red btn-sm" type="button" data-reset>' + icon('refresh') + 'Restaurar dados de demonstração</button></div>') + '</div></div>';
    $('#set-form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (!TD.ui.validate(e.target)) return;
      const s = TD.adminState();
      s.settings = { tagline: $('#s-tagline').value.trim(), announcement: $('#s-ann').value.trim(), whatsapp: TD.ui.onlyDigits($('#s-wa').value), phone: $('#s-phone').value.trim(), address: $('#s-address').value.trim(), cep: $('#s-cep').value.trim() };
      TD.saveAdminState(s);
      toast('Configurações salvas', { sub: 'Abra a loja para ver as mudanças.', action: 'Ver loja', onAction: () => window.open('index.html', '_blank') });
    });
  }

  const VIEWS = { dashboard: viewDashboard, pedidos: viewOrders, produtos: viewProducts, categorias: viewCategories, inventario: viewInventory, clientes: viewCustomers, promocoes: viewPromos, configuracao: viewSettings };

  function csv(rows, name) {
    const text = rows.map((r) => r.map((c) => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast('Arquivo gerado', { sub: name });
  }

  /* ---------------- eventos ---------------- */
  function bind() {
    const view = $('#a-view');
    document.addEventListener('click', (e) => {
      const t = e.target;
      const sec = t.closest('[data-sec], [data-goto]');
      if (sec) { location.hash = '#' + (sec.dataset.sec || sec.dataset.goto); return; }
      if (t.closest('[data-menu]')) { $('#a-side').classList.add('open'); $('[data-overlay]').classList.add('open'); return; }
      if (t.closest('[data-overlay]')) { $('#a-side').classList.remove('open'); t.closest('[data-overlay]').classList.remove('open'); return; }
      if (t.closest('[data-logout]')) { try { sessionStorage.removeItem(SESSION); } catch (er) { /* ignore */ } location.reload(); return; }
      if (t.closest('[data-reset]')) {
        TD.confirm('Restaurar dados de demonstração?', 'As alterações do painel, pedidos de teste, carrinho, favoritos e conta deste navegador serão apagados.', 'Restaurar', () => {
          TD.resetAdmin();
          Object.values(TD.storageKeys).forEach((k) => { try { localStorage.removeItem(k); } catch (er) { /* ignore */ } });
          ['td_checkout_draft', 'td_searches_v1', 'td_view'].forEach((k) => { try { localStorage.removeItem(k); } catch (er) { /* ignore */ } });
          toast('Dados restaurados');
          refresh();
        }, true);
        return;
      }
      const od = t.closest('[data-order]');
      if (od) { orderModal(od.dataset.order); return; }
      if (!view.contains(t)) return;
      // pedidos
      const ost = t.closest('[data-ost]');
      if (ost) { oState.status = ost.dataset.ost; refresh(); return; }
      if (t.closest('[data-export]')) {
        csv([['Pedido', 'Data', 'Cliente', 'E-mail', 'Itens', 'Entrega', 'Pagamento', 'Total', 'Status']].concat(allOrders().map((o) => [o.id, new Date(o.date).toLocaleString('pt-BR'), o.customer.name, o.customer.email, o.items.reduce((s, i) => s + i.qty, 0), o.delivery.name, o.payment, o.total.toFixed(2).replace('.', ','), TD.statusLabel(o.status)])), 'pedidos-tecnodreams.csv');
        return;
      }
      // produtos
      if (t.closest('[data-new-product]')) { productModal(); return; }
      const ed = t.closest('[data-edit]');
      if (ed) { productModal(+ed.dataset.edit); return; }
      const del = t.closest('[data-delete]');
      if (del) {
        const p = TD.product(+del.dataset.delete);
        TD.confirm('Excluir produto?', '“' + p.name + '” deixará de aparecer na loja. (Use “Restaurar demo” para desfazer.)', 'Excluir', () => { TD.deleteProduct(p.id); toast('Produto excluído', { type: 'info', sub: p.name }); refresh(); }, true);
        return;
      }
      const pg = t.closest('[data-pg]');
      if (pg) { pState.page += +pg.dataset.pg; refresh(); return; }
      // categorias
      if (t.closest('[data-new-cat]')) { categoryModal(); return; }
      const ec = t.closest('[data-edit-cat]');
      if (ec) { categoryModal(ec.dataset.editCat); return; }
      const dc = t.closest('[data-del-cat]');
      if (dc) {
        const c = TD.category(dc.dataset.delCat);
        const n = TD.allProducts().filter((p) => p.category === c.slug).length;
        if (n) { toast('Categoria com produtos', { type: 'error', sub: 'Mova ou exclua os ' + n + ' produto(s) antes de excluir “' + c.name + '”.' }); return; }
        TD.confirm('Excluir categoria?', '“' + c.name + '” será removida.', 'Excluir', () => {
          const s = TD.adminState();
          s.newCategories = s.newCategories.filter((x) => x.slug !== c.slug);
          TD.saveAdminState(s);
          if (TD.baseCategories.some((x) => x.slug === c.slug)) toast('Categorias originais da loja não podem ser excluídas no protótipo', { type: 'info' }); else toast('Categoria excluída', { type: 'info' });
          refresh();
        }, true);
        return;
      }
      // inventário
      const iff = t.closest('[data-if]');
      if (iff) { iState.filter = iff.dataset.if; refresh(); return; }
      const as = t.closest('[data-add-stock]');
      if (as) { const p = TD.product(+as.dataset.addStock); setStock(p.id, p.stock + +as.dataset.n); refresh(); return; }
      // clientes
      const cl = t.closest('[data-client]');
      if (cl) { oState.q = cl.dataset.client; oState.status = ''; location.hash = '#pedidos'; return; }
      if (t.closest('[data-export-clients]')) {
        const rows = $$('tbody tr', view).map((tr) => $$('td', tr).slice(0, 5).map((td) => td.innerText.replace(/\s+/g, ' ').trim()));
        csv([['Cliente', 'Cidade', 'Pedidos', 'Total gasto', 'Último pedido']].concat(rows), 'clientes-tecnodreams.csv');
        return;
      }
      // promoções
      if (t.closest('[data-new-coupon]')) { couponModal(); return; }
      const ecp = t.closest('[data-edit-coupon]');
      if (ecp) { couponModal(+ecp.dataset.editCoupon); return; }
      const dcp = t.closest('[data-del-coupon]');
      if (dcp) { const s = TD.adminState(); const c = s.coupons[+dcp.dataset.delCoupon]; TD.confirm('Excluir cupom?', 'O cupom ' + c.code + ' deixará de funcionar na loja.', 'Excluir', () => { const st = TD.adminState(); st.coupons.splice(+dcp.dataset.delCoupon, 1); TD.saveAdminState(st); toast('Cupom excluído', { type: 'info' }); refresh(); }, true); return; }
      if (t.closest('[data-new-sale]')) { saleModal(); return; }
      const es = t.closest('[data-end-sale]');
      if (es) { const p = TD.product(+es.dataset.endSale); TD.saveProduct({ id: p.id, price: p.regularPrice, regularPrice: null }); toast('Oferta encerrada', { type: 'info', sub: p.name + ' volta a ' + fmt(p.regularPrice) }); refresh(); }
    });
    document.addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset.status) {
        const o = allOrders().find((x) => x.id === t.dataset.status);
        setOrderStatus(o, t.value);
        toast('Status atualizado', { sub: o.id + ' → ' + TD.statusLabel(t.value) });
        const pill = $('[data-new-orders]');
        if (pill) { const n = allOrders().filter((x) => x.status === 'novo').length; pill.textContent = n; pill.hidden = !n; }
        return;
      }
      if (t.dataset.active) { const id = +t.dataset.active; TD.saveProduct({ id, active: t.checked }); toast(t.checked ? 'Produto ativado' : 'Produto ocultado da loja', { type: t.checked ? 'ok' : 'info', sub: TD.product(id).name }); refresh(); return; }
      if (t.dataset.stock) { setStock(+t.dataset.stock, t.value); refresh(); return; }
      if (t.matches('[data-pcat]')) { pState.cat = t.value; pState.page = 1; refresh(); return; }
      if (t.matches('[data-pstatus]')) { pState.status = t.value; pState.page = 1; refresh(); return; }
      if (t.dataset.couponActive != null) { const s = TD.adminState(); s.coupons[+t.dataset.couponActive].active = t.checked; TD.saveAdminState(s); toast(t.checked ? 'Cupom ativado' : 'Cupom desativado', { type: 'info' }); }
    });
    let qt;
    document.addEventListener('input', (e) => {
      const t = e.target;
      const apply = (fn) => { clearTimeout(qt); qt = setTimeout(() => { fn(); refresh(); const el = $(t.matches('[data-pq]') ? '[data-pq]' : t.matches('[data-oq]') ? '[data-oq]' : '[data-iq]'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 220); };
      if (t.matches('[data-pq]')) apply(() => { pState.q = t.value; pState.page = 1; });
      else if (t.matches('[data-oq]')) apply(() => { oState.q = t.value; });
      else if (t.matches('[data-iq]')) apply(() => { iState.q = t.value; });
      else if (t.id === 'a-search') {
        clearTimeout(qt);
        qt = setTimeout(() => {
          const q = t.value.trim();
          if (/^(td|demo)-\d+/i.test(q)) { oState.q = q; oState.status = ''; location.hash === '#pedidos' ? refresh() : (location.hash = '#pedidos'); }
          else { pState.q = q; pState.page = 1; location.hash === '#produtos' ? refresh() : (location.hash = '#produtos'); }
          setTimeout(() => t.focus(), 30);
        }, 300);
      }
    });
    window.addEventListener('hashchange', () => go(location.hash.slice(1)));
    window.addEventListener('td:catalog-external', refresh);
    window.addEventListener('storage', (e) => { if (e.key === TD.storageKeys.orders) refresh(); });
    let rz;
    window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (current === 'dashboard') refresh(); }, 250); });
  }

  function start() {
    shell();
    bind();
    go((location.hash || '#dashboard').slice(1));
  }
  function init() {
    let ok = false;
    try { ok = sessionStorage.getItem(SESSION) === '1'; } catch (e) { ok = true; }
    if (ok) start(); else login();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
