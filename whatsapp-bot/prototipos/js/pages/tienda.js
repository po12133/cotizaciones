/* Catálogo web público (módulo 10): tienda móvil con buscador, filtros, página de producto, variantes,
   carrito, enlaces compartibles y envío del pedido a WhatsApp (simulado). */
(function () {
  const { icon, ui, db } = window.WAB;
  const { esc, fmt } = ui;
  const KEY = 'tienda-carrito';
  let cart = WAB.storage.get(KEY, []);
  const f = { q: '', cat: '', sort: 'destacados', disp: false, max: '' };
  let phone = null;

  const t = () => db.get('settings').tienda;
  const saveCart = () => { WAB.storage.set(KEY, cart); drawCount(); };
  const products = () => db.get('products').filter((p) => p.activo);

  document.documentElement.style.setProperty('--store', t().color || '#0c9467');
  document.title = `${t().nombre} · Catálogo web (prototipo)`;
  document.body.insertAdjacentHTML('afterbegin', `
    <div class="sim-banner">${icon('info')}Prototipo de catálogo web con datos ficticios. Los pedidos y pagos son simulados. <a href="index.html" style="margin-left:6px;font-weight:700">Volver al panel</a></div>
    <header class="st-header"><div class="st-wrap">
      <a class="st-brand" href="#"><span class="st-logo">${esc(ui.initials(t().nombre))}</span><span>${esc(t().nombre)}</span></a>
      <div class="input-group st-search">${icon('search', 'sm')}<input class="input" id="q" type="search" placeholder="Buscar productos" aria-label="Buscar productos"></div>
      <button class="btn btn-ghost btn-icon" id="theme" aria-label="Cambiar tema">${icon(ui.currentTheme() === 'dark' ? 'sun' : 'moon')}</button>
      <button class="btn st-cart-btn" id="cart-btn" aria-label="Abrir carrito">${icon('cart')}<span class="st-count" id="count">0</span></button>
    </div></header>
    <main class="st-wrap" id="st-main"></main>
    <footer class="st-footer"><div class="st-wrap"><span>${esc(db.get('settings').negocio.nombre)} · ${esc(db.get('settings').negocio.direccion)}</span><span>Catálogo web por ${esc(WAB.CONFIG.empresa.nombre)} (prototipo)</span></div></footer>
    <button class="st-wa-fab" id="wa-fab" aria-label="Escribir por WhatsApp">${icon('whatsapp', 'lg')}<span>WhatsApp</span></button>
    <div class="st-wa-panel" id="wa-panel" hidden><div class="st-wa-top"><strong>Chat de WhatsApp</strong><button class="btn btn-ghost btn-icon btn-sm" id="wa-close" aria-label="Cerrar chat">${icon('x')}</button></div><div id="wa-phone"></div></div>`);
  const $ = (id) => document.getElementById(id);

  function drawCount() { $('count').textContent = cart.reduce((n, i) => n + i.cantidad, 0); $('count').hidden = !cart.length; }

  // ---------- Listado ----------
  function list() {
    const cats = db.get('categories');
    let ps = products().filter((p) => (!f.cat || p.categoria === f.cat) && (!f.disp || p.stock > 0) && (!f.max || db.price(p) <= Number(f.max)) && (!f.q || `${p.nombre} ${p.descripcion}`.toLowerCase().includes(f.q)));
    ps = ps.sort((a, b) => f.sort === 'precio-asc' ? db.price(a) - db.price(b) : f.sort === 'precio-desc' ? db.price(b) - db.price(a) : f.sort === 'nombre' ? a.nombre.localeCompare(b.nombre) : (b.destacado - a.destacado) || (b.promo - a.promo));
    $('st-main').innerHTML = `
      <section class="st-hero"><div><span class="badge">Envío el mismo día en la ciudad</span><h1>${esc(t().slogan || t().nombre)}</h1><p>Compre en línea y confirme su pedido por WhatsApp. Pago con QR.</p></div><div class="st-hero-art">${icon('package', 'lg')}</div></section>
      <div class="st-filters">
        <div class="chips">${[['', 'Todo']].concat(cats.map((c) => [c.id, c.nombre])).map(([id, n]) => `<button class="chip${f.cat === id ? ' active' : ''}" data-cat="${id}">${esc(n)}</button>`).join('')}</div>
        <div class="row wrap">
          <select class="select input-sm" id="max" aria-label="Precio máximo" style="width:auto"><option value="">Cualquier precio</option>${[50, 100, 200, 300].map((v) => `<option value="${v}"${String(v) === f.max ? ' selected' : ''}>Hasta ${fmt.money(v)}</option>`).join('')}</select>
          <select class="select input-sm" id="sort" aria-label="Ordenar" style="width:auto">${[['destacados', 'Destacados'], ['precio-asc', 'Menor precio'], ['precio-desc', 'Mayor precio'], ['nombre', 'Nombre A-Z']].map(([v, l]) => `<option value="${v}"${v === f.sort ? ' selected' : ''}>${l}</option>`).join('')}</select>
          <label class="check"><input type="checkbox" id="disp" ${f.disp ? 'checked' : ''}>Solo disponibles</label>
        </div>
      </div>
      <p class="small muted">${ps.length} producto${ps.length === 1 ? '' : 's'}</p>
      <div class="store-grid">${ps.map(card).join('') || ui.emptyState({ icon: 'search', title: 'No encontramos productos', text: 'Pruebe con otra búsqueda o quite filtros.', action: '<button class="btn btn-sm mt-1" id="clear">Quitar filtros</button>' })}</div>`;
    $('st-main').querySelectorAll('[data-cat]').forEach((b) => b.onclick = () => { f.cat = b.dataset.cat; list(); });
    $('max').onchange = (e) => { f.max = e.target.value; list(); };
    $('sort').onchange = (e) => { f.sort = e.target.value; list(); };
    $('disp').onchange = (e) => { f.disp = e.target.checked; list(); };
    const cl = $('clear');
    if (cl) cl.onclick = () => { Object.assign(f, { q: '', cat: '', disp: false, max: '' }); $('q').value = ''; list(); };
    bindCards();
  }

  function card(p) {
    return `<a class="store-card${p.stock <= 0 ? ' soldout' : ''}" href="#producto/${p.id}">${p.promo ? `<span class="badge danger sc-flag">−${p.promo}%</span>` : p.stock <= 0 ? '<span class="badge sc-flag">Agotado</span>' : p.destacado ? '<span class="badge solid sc-flag">Destacado</span>' : ''}
      <div class="sc-img"><img src="${db.img(p)}" alt="${esc(p.nombre)}" loading="lazy"></div>
      <div class="sc-body"><small>${esc((db.category(p.categoria) || {}).nombre || '')}</small><strong>${esc(p.nombre)}</strong><div class="sc-price">${fmt.money(db.price(p))}${p.promo ? `<s>${fmt.money(p.precio)}</s>` : ''}</div></div>
      ${p.stock > 0 ? `<button class="btn btn-sm st-add" data-add="${p.id}" aria-label="Agregar ${esc(p.nombre)}">${icon('plus', 'sm')}Agregar</button>` : ''}</a>`;
  }
  function bindCards() {
    $('st-main').querySelectorAll('[data-add]').forEach((b) => b.onclick = (e) => {
      e.preventDefault(); e.stopPropagation();
      const p = db.product(b.dataset.add);
      if (p.variantes.length) { location.hash = `producto/${p.id}`; return; }
      add(p, '', 1);
    });
  }

  // ---------- Página de producto ----------
  function pdp(id) {
    const p = db.product(id);
    if (!p || !p.activo) {
      $('st-main').innerHTML = ui.emptyState({ icon: 'package', title: 'Producto no disponible', text: 'El enlace puede estar desactualizado.', action: '<a class="btn btn-sm mt-1" href="#">Ver catálogo</a>' });
      return;
    }
    const cat = db.category(p.categoria);
    const rel = products().filter((x) => x.categoria === p.categoria && x.id !== p.id).slice(0, 4);
    let variant = p.variantes[0] || '';
    let qty = 1;
    $('st-main').innerHTML = `
      <nav class="st-crumbs"><a href="#">Inicio</a>${icon('chevronRight', 'sm')}<a href="#" data-cat="${p.categoria}">${esc(cat ? cat.nombre : '')}</a>${icon('chevronRight', 'sm')}<span>${esc(p.nombre)}</span></nav>
      <section class="st-pdp">
        <div class="st-pdp-img"><img src="${db.img(p)}" alt="${esc(p.nombre)}"></div>
        <div class="stack">
          <small class="muted">${esc(cat ? cat.nombre : '')} · SKU ${esc(p.sku)}</small>
          <h1 class="st-pdp-title">${esc(p.nombre)}</h1>
          <div class="st-pdp-price">${fmt.money(db.price(p))}${p.promo ? ` <s>${fmt.money(p.precio)}</s> <span class="badge danger">−${p.promo}%</span>` : ''}<small>${fmt.usd(db.price(p) / (db.get('settings').negocio.tipoCambio || 6.96))}</small></div>
          <p>${esc(p.descripcion)}</p>
          ${p.variantes.length ? `<div><span class="label">Opción</span><div class="chips mt-1" id="vars">${p.variantes.map((v) => `<button class="chip${v === variant ? ' active' : ''}" data-v="${esc(v)}">${esc(v)}</button>`).join('')}</div></div>` : ''}
          <div>${p.stock > 0 ? `<span class="badge ok">${p.stock <= 5 ? `¡Últimas ${p.stock} unidades!` : 'Disponible'}</span>` : '<span class="badge danger">Agotado</span>'}</div>
          ${p.stock > 0 ? `<div class="row wrap"><div class="stepper-input"><button class="btn btn-icon" id="dec" aria-label="Menos">${icon('minus', 'sm')}</button><input class="input" id="qty" type="number" min="1" max="${p.stock}" value="1" style="width:64px" aria-label="Cantidad"><button class="btn btn-icon" id="inc" aria-label="Más">${icon('plus', 'sm')}</button></div><button class="btn btn-primary btn-lg st-cta" id="add">${icon('cart', 'sm')}Agregar al carrito</button></div>` : ''}
          <div class="row wrap"><button class="btn" id="ask">${icon('whatsapp', 'sm')}Consultar por WhatsApp</button><button class="btn btn-ghost" id="share">${icon('link', 'sm')}Copiar enlace</button></div>
        </div>
      </section>
      ${rel.length ? `<h3 class="mt-4">También le puede interesar</h3><div class="store-grid">${rel.map(card).join('')}</div>` : ''}`;
    window.scrollTo(0, 0);
    const v = $('vars');
    if (v) v.onclick = (e) => { const b = e.target.closest('[data-v]'); if (!b) return; variant = b.dataset.v; v.querySelectorAll('.chip').forEach((x) => x.classList.toggle('active', x === b)); };
    const qi = $('qty');
    if (qi) {
      const setQ = (n) => { qty = Math.max(1, Math.min(p.stock, n || 1)); qi.value = qty; };
      $('dec').onclick = () => setQ(qty - 1);
      $('inc').onclick = () => setQ(qty + 1);
      qi.onchange = () => setQ(Number(qi.value));
      $('add').onclick = () => add(p, variant, qty);
    }
    $('ask').onclick = () => openChat(async (ph) => { await ph.send({ kind: 'text', text: `Hola, vi en la tienda web: ${p.nombre}${variant ? ` (${variant})` : ''}. ¿Está disponible?` }); });
    $('share').onclick = () => ui.copy(location.href, 'Enlace del producto copiado');
    $('st-main').querySelector('[data-cat]').onclick = (e) => { e.preventDefault(); f.cat = p.categoria; location.hash = ''; };
    bindCards();
  }

  // ---------- Carrito ----------
  function add(p, variante, n) {
    const ex = cart.find((i) => i.productId === p.id && i.variante === variante);
    const qty = (ex ? ex.cantidad : 0) + n;
    if (qty > p.stock) return ui.toast(`Solo hay ${p.stock} unidades`, p.nombre, 'warn');
    if (ex) ex.cantidad = qty; else cart.push({ productId: p.id, nombre: p.nombre, variante, cantidad: n, precio: db.price(p) });
    saveCart();
    ui.toast('Agregado al carrito', `${p.nombre}${variante ? ` (${variante})` : ''}`, 'ok', 2200);
  }

  function openCart() {
    const sub = () => cart.reduce((s, i) => s + i.precio * i.cantidad, 0);
    const d = ui.drawer({ title: 'Su carrito', body: '' });
    const draw = () => {
      const s = sub();
      const falta = Math.max(0, t().envioGratisDesde - s);
      d.setBody(cart.length ? `<div class="list-rows card">${cart.map((i, k) => { const p = db.product(i.productId); return `<div class="list-row"><span class="prod-thumb">${p ? `<img src="${db.img(p)}" alt="">` : ''}</span><div class="grow"><strong>${esc(i.nombre)}</strong><small>${i.variante ? `${esc(i.variante)} · ` : ''}${fmt.money(i.precio)}</small></div><div class="stepper-input"><button class="btn btn-icon btn-sm" data-dec="${k}" aria-label="Menos">${icon('minus', 'sm')}</button><span style="min-width:22px;text-align:center;align-self:center">${i.cantidad}</span><button class="btn btn-icon btn-sm" data-inc="${k}" aria-label="Más">${icon('plus', 'sm')}</button></div><button class="btn btn-ghost btn-icon btn-sm" data-rm="${k}" aria-label="Quitar">${icon('trash', 'sm')}</button></div>`; }).join('')}</div>
        <div class="stack mt-2"><div class="meter-row"><span>Subtotal</span><strong>${fmt.money(s)}</strong></div>
        ${falta ? `<div class="notice info">${icon('truck')}<p>Le faltan <strong>${fmt.money(falta)}</strong> para el envío gratis.</p></div>` : `<div class="notice ok">${icon('truck')}<p>Su pedido tiene <strong>envío gratis</strong>.</p></div>`}
        <p class="small muted mb-0">Al continuar se abrirá WhatsApp con su pedido. Allí elegirá envío o retiro y recibirá el QR de pago (simulación).</p></div>`
        : ui.emptyState({ icon: 'cart', title: 'Su carrito está vacío', text: 'Agregue productos desde el catálogo.' }));
      d.setActions(cart.length ? [{ label: 'Vaciar', kind: 'btn-ghost', onClick: () => { cart = []; saveCart(); draw(); } }, { label: 'Enviar pedido por WhatsApp', kind: 'btn-primary', icon: 'whatsapp', onClick: ({ close }) => { close(); checkout(); } }] : [{ label: 'Ver catálogo', kind: 'btn-primary', onClick: ({ close }) => { close(); location.hash = ''; } }]);
      d.body.querySelectorAll('[data-inc]').forEach((b) => b.onclick = () => { const i = cart[b.dataset.inc]; const p = db.product(i.productId); if (p && i.cantidad + 1 > p.stock) return ui.toast(`Solo hay ${p.stock} unidades`, '', 'warn'); i.cantidad += 1; saveCart(); draw(); });
      d.body.querySelectorAll('[data-dec]').forEach((b) => b.onclick = () => { const i = cart[b.dataset.dec]; i.cantidad -= 1; if (i.cantidad < 1) cart.splice(Number(b.dataset.dec), 1); saveCart(); draw(); });
      d.body.querySelectorAll('[data-rm]').forEach((b) => b.onclick = () => { cart.splice(Number(b.dataset.rm), 1); saveCart(); draw(); });
    };
    draw();
  }

  function checkout() {
    const items = cart.map((i) => Object.assign({}, i));
    const summary = `Hola, quiero hacer este pedido desde la tienda web:\n${items.map((i) => `• ${i.cantidad} × ${i.nombre}${i.variante ? ` (${i.variante})` : ''}`).join('\n')}\nTotal: ${fmt.money(items.reduce((s, i) => s + i.precio * i.cantidad, 0))}`;
    openChat(async (ph) => {
      const s = ph.bot.session();
      s.carrito = items; s.origen = 'Tienda web'; s.modoIA = false;
      ph.bot.saveSession(s);
      ph.append(ph.bot.recordUser({ kind: 'text', text: summary }));
      await ph.send({ kind: 'reply', id: 'act:cart', title: 'Pedido web', silent: true });
      cart = []; saveCart();
    });
  }

  function openChat(after) {
    $('wa-panel').hidden = false;
    $('wa-fab').hidden = true;
    if (!phone) phone = new WAB.Phone($('wa-phone'), { compact: true, quick: ['Menú', 'Ver carrito', '¿Hacen envíos?'], name: t().nombre });
    if (after) setTimeout(() => after(phone), 300);
  }
  $('wa-fab').onclick = () => openChat();
  $('wa-close').onclick = () => { $('wa-panel').hidden = true; $('wa-fab').hidden = false; };
  $('cart-btn').onclick = openCart;
  $('theme').onclick = (e) => { const th = ui.toggleTheme(); e.currentTarget.innerHTML = icon(th === 'dark' ? 'sun' : 'moon'); };
  $('q').addEventListener('input', ui.debounce((e) => { f.q = e.target.value.trim().toLowerCase(); if (location.hash.startsWith('#producto/')) location.hash = ''; else list(); }, 200));

  function route() {
    const h = location.hash.slice(1);
    if (h.startsWith('producto/')) pdp(h.split('/')[1]);
    else list();
  }
  window.addEventListener('hashchange', route);
  drawCount();
  route();
})();
