/*
 * Catálogo público de MioShop: productos publicados, carrito, pedido por WhatsApp y pago con QR.
 * Usa la misma base de demostración que el panel: los pedidos aparecen en demo.html → Pedidos.
 */
(function () {
  const MF = window.MF;
  const CFG = window.MF_CONFIG;
  const { $, $$, esc, money } = MF;
  const st = { q: '', cat: '', sort: 'new', sizes: [], colors: [], onlyAvail: false };
  MF.load();

  // ---------- Carrito (localStorage) ----------
  const loadCart = () => { try { return JSON.parse(localStorage.getItem(CFG.cartKey)) || []; } catch (e) { return []; } };
  let cart = loadCart();
  const saveCart = () => { localStorage.setItem(CFG.cartKey, JSON.stringify(cart)); updateCount(); };
  const variantOf = (p, l) => p && p.variants.find((v) => v.size === l.size && v.color === l.color);
  function cleanCart() {
    // Quita líneas de productos que ya no existen, se ocultaron o se agotaron
    cart = cart.filter((l) => { const p = MF.product(l.productId); return p && p.published && MF.isActive(p) && variantOf(p, l); });
    cart.forEach((l) => { const p = MF.product(l.productId); l.qty = Math.min(l.qty, Math.max(0, MF.available(p, variantOf(p, l)))); });
    cart = cart.filter((l) => l.qty > 0);
    saveCart();
  }
  const cartItems = () => cart.map((l) => { const p = MF.product(l.productId); return { p, l, price: MF.price(p) }; });
  const cartTotal = () => cartItems().reduce((s, x) => s + x.price * x.l.qty, 0);
  function updateCount() {
    const n = cart.reduce((s, l) => s + l.qty, 0);
    const c = $('#cartCount');
    c.hidden = !n; c.textContent = n;
  }

  // ---------- Identidad ----------
  function applyTheme() {
    const s = MF.get().settings;
    const root = document.documentElement.style;
    if (MF.can('catalogoMarca')) { root.setProperty('--rosa', s.primary); root.setProperty('--antiguo', s.accent); }
    else { root.removeProperty('--rosa'); root.removeProperty('--antiguo'); }
    $('#deliveryTxt').textContent = s.delivery;
    $('#waFloat').href = MF.waLink(s.whatsapp, `Hola ${CFG.store.name}, quiero hacer una consulta.`);
  }

  function banner() {
    const el = $('#banner');
    const photos = MF.get().products.filter((p) => p.photo && p.published && MF.isActive(p) && /^assets\//.test(p.photo)).slice(0, 9);
    const pick = [photos[2], photos[4], photos[6]].filter(Boolean);
    const composed = `<div class="hero-mio"><div class="wrap"><div>
      <span class="tag">${MF.icon('heart', 'sm')} Nueva colección</span>
      <h1>${esc(CFG.store.slogan).replace('outfit favorito', '<em>outfit favorito</em>')}</h1>
      <p>${esc(CFG.store.category)} con prendas que no se repiten. Elige tu talla, arma tu pedido y te lo coordinamos por WhatsApp.</p>
      <div class="hero-ctas"><a class="btn rosa" href="#catalog">${MF.icon('shirt', 'sm')} Ver colección</a><button class="btn claro" data-open-cart>${MF.icon('cart', 'sm')} Mi carrito</button></div>
      <div class="badges"><span>${MF.icon('heart', 'sm')} Únicas</span><span>${MF.icon('sparkles', 'sm')} Accesibles</span><span>${MF.icon('tag', 'sm')} Para ti</span></div></div>
      <div class="collage">${pick.map((p) => `<img src="${p.photo}" alt="${esc(p.name)}">`).join('')}<span class="sticker">¡Hazlo tuyo!</span></div></div></div>`;
    // Si existe el banner original (config.store.banner), se usa; si no, se muestra el compuesto
    const img = new Image();
    img.onload = () => { el.innerHTML = `<img class="banner-img" src="${CFG.store.banner}" alt="Banner de ${esc(CFG.store.name)}">`; };
    img.onerror = () => { el.innerHTML = composed; MF.hydrateIcons(el); };
    el.innerHTML = composed;
    MF.hydrateIcons(el);
    if (CFG.store.banner) img.src = CFG.store.banner;
  }

  // ---------- Listado ----------
  const published = () => MF.get().products.filter((p) => p.published && MF.isActive(p));
  function cats() {
    const list = published();
    const cs = MF.get().categories.filter((c) => list.some((p) => p.category === c));
    const thumb = (c) => { const p = list.find((x) => x.category === c && x.photo); return p ? `<img src="${p.photo}" alt="">` : MF.icon('shirt'); };
    $('#cats').innerHTML = `<button class="cat ${!st.cat ? 'on' : ''}" data-cat=""><span class="ci">${MF.icon('grid')}</span>Todo</button>` +
      cs.map((c) => `<button class="cat ${st.cat === c ? 'on' : ''}" data-cat="${c}"><span class="ci">${thumb(c)}</span>${c}</button>`).join('');
    $$('#cats [data-cat]').forEach((b) => b.addEventListener('click', () => { st.cat = b.dataset.cat; renderAll(); document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' }); }));
  }

  function card(p) {
    const avail = MF.available(p);
    const pr = MF.promoFor(p);
    const price = MF.price(p);
    const showStock = MF.get().settings.showStock;
    const sizes = [...new Set(p.variants.filter((v) => MF.available(p, v) > 0).map((v) => v.size))];
    return `<article class="card ${avail ? '' : 'sold'}" data-open="${p.id}" tabindex="0" role="button" aria-label="${esc(p.name)}">
      <div class="pic">${MF.photo(p)}<div class="tags">${pr ? `<span class="tag-s rosa">-${pr.percent}%</span>` : ''}${p.featured && MF.can('destacados') ? '<span class="tag-s">Destacado</span>' : ''}${!avail ? '<span class="tag-s out">Agotado</span>' : showStock && avail <= 2 ? '<span class="tag-s low">Últimas unidades</span>' : ''}</div>
        ${avail ? `<button class="quick" data-open="${p.id}" aria-label="Agregar ${esc(p.name)}">${MF.icon('plus', 'sm')}</button>` : ''}</div>
      <div class="body"><span class="name">${esc(p.name)}</span><span class="price">${money(price)}${pr ? `<s>${money(p.price)}</s>` : ''}</span><span class="sizes">${avail ? 'Tallas: ' + sizes.join(' · ') : 'Sin stock por ahora'}</span></div></article>`;
  }

  function featured() {
    const el = $('#featured');
    const list = published();
    let items, title, sub;
    if (MF.can('destacados') && list.some((p) => p.featured)) { items = list.filter((p) => p.featured); title = 'Destacados'; sub = 'Elegidos por MioShop'; }
    else { items = list.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6); title = 'Nuevos ingresos'; sub = 'Lo último que llegó'; }
    el.innerHTML = st.q || st.cat ? '' : `<div class="sec-title"><h2>${title}</h2><small>${sub}</small></div><div class="rail">${items.map(card).join('')}</div>`;
    const promo = MF.can('promociones') ? MF.get().promotions.filter((p) => p.active) : [];
    $('#promo').innerHTML = promo.length && !st.q ? `<div class="promo-band">${MF.icon('tag')}<div><b>${esc(promo[0].name)}: ${promo[0].percent}% de descuento</b><br><small>${promo[0].category ? 'En toda la categoría ' + esc(promo[0].category) : 'En prendas seleccionadas'} · precios ya rebajados</small></div>${promo[0].category ? `<button class="btn sm" data-promo-cat="${esc(promo[0].category)}">Ver ofertas</button>` : ''}</div>` : '';
    const pc = $('[data-promo-cat]');
    if (pc) pc.addEventListener('click', () => { st.cat = pc.dataset.promoCat; renderAll(); });
  }

  function grid() {
    const q = st.q.toLowerCase().trim();
    let list = published().filter((p) => (!st.cat || p.category === st.cat) &&
      (!q || (p.name + ' ' + p.category + ' ' + p.color + ' ' + p.desc + ' ' + (p.garmentType || '') + ' ' + (p.tags || []).join(' ')).toLowerCase().includes(q)) &&
      (!st.sizes.length || p.variants.some((v) => st.sizes.includes(v.size) && MF.available(p, v) > 0)) &&
      (!st.colors.length || st.colors.includes(p.color) || p.variants.some((v) => st.colors.includes(v.color))) &&
      (!st.onlyAvail || MF.available(p) > 0));
    if (st.sort === 'low') list.sort((a, b) => MF.price(a) - MF.price(b));
    else if (st.sort === 'high') list.sort((a, b) => MF.price(b) - MF.price(a));
    else list.sort((a, b) => (MF.available(b) > 0) - (MF.available(a) > 0) || b.createdAt.localeCompare(a.createdAt));
    $('#listTitle').textContent = q ? `Resultados para "${st.q}"` : st.cat || 'Toda la colección';
    $('#grid').innerHTML = list.map(card).join('') || `<div class="empty">${MF.icon('search')}<p>No encontramos prendas con esos filtros.</p><button class="btn claro sm" id="clearF">Quitar filtros</button></div>`;
    const cf = $('#clearF');
    if (cf) cf.addEventListener('click', () => { Object.assign(st, { q: '', cat: '', sizes: [], colors: [], onlyAvail: false }); $('#q').value = ''; renderAll(); });
    const n = st.sizes.length + st.colors.length + (st.onlyAvail ? 1 : 0);
    $('#fCount').textContent = n ? `(${n})` : '';
  }

  function filterPanel() {
    const list = published();
    const sizes = ['XS', 'S', 'M', 'L', 'XL', 'Única'].filter((s) => list.some((p) => p.variants.some((v) => v.size === s)));
    const colors = [...new Set(list.map((p) => p.color))];
    $('#filterPanel').innerHTML = `<div><h4>Talla</h4><div class="fl-row">${sizes.map((s) => `<button class="pill ${st.sizes.includes(s) ? 'on' : ''}" data-fs="${s}">${s}</button>`).join('')}</div></div>
      <div><h4>Color</h4><div class="fl-row">${colors.map((c) => `<button class="dot ${st.colors.includes(c) ? 'on' : ''}" data-fc="${esc(c)}" title="${esc(c)}" aria-label="${esc(c)}" style="background:${MF.COLORS[c] || '#ccc'}"></button>`).join('')}</div></div>
      <div class="fl-row"><button class="pill ${st.onlyAvail ? 'on' : ''}" id="fAvail">Solo disponibles</button><button class="pill" id="fClear">Limpiar</button></div>`;
    $$('[data-fs]').forEach((b) => b.addEventListener('click', () => { const s = b.dataset.fs; st.sizes = st.sizes.includes(s) ? st.sizes.filter((x) => x !== s) : st.sizes.concat(s); filterPanel(); grid(); }));
    $$('[data-fc]').forEach((b) => b.addEventListener('click', () => { const c = b.dataset.fc; st.colors = st.colors.includes(c) ? st.colors.filter((x) => x !== c) : st.colors.concat(c); filterPanel(); grid(); }));
    $('#fAvail').addEventListener('click', () => { st.onlyAvail = !st.onlyAvail; filterPanel(); grid(); });
    $('#fClear').addEventListener('click', () => { Object.assign(st, { sizes: [], colors: [], onlyAvail: false }); filterPanel(); grid(); });
  }

  function renderAll() { applyTheme(); cats(); featured(); grid(); if (!$('#filterPanel').hidden) filterPanel(); MF.hydrateIcons(document.body); }

  // ---------- Detalle ----------
  function openProduct(p) {
    if (!p || !p.published) return;
    const colors = [...new Set(p.variants.map((v) => v.color))];
    const sel = { color: colors.find((c) => p.variants.some((v) => v.color === c && MF.available(p, v) > 0)) || colors[0], size: null, qty: 1 };
    const pr = MF.promoFor(p);
    const m = MF.modal({ title: '', size: 'lg', noFocus: true, body: '<div id="dt"></div>', onClose: () => history.replaceState(null, '', location.pathname + location.search) });
    m.el.querySelector('.modal-head h3').textContent = p.category;
    history.replaceState(null, '', '#p=' + p.id);
    const draw = () => {
      const vs = p.variants.filter((v) => v.color === sel.color);
      const v = vs.find((x) => x.size === sel.size);
      const inCartQty = v ? cart.filter((l) => l.productId === p.id && l.size === v.size && l.color === v.color).reduce((s, l) => s + l.qty, 0) : 0;
      const max = v ? MF.available(p, v) - inCartQty : 0;
      const pics = (p.photos || []).filter((x) => x.view !== 'etiqueta'); // la foto de la etiqueta es solo para uso interno
      m.el.querySelector('#dt').innerHTML = `<div class="detail"><div class="pic-col"><div class="pic">${pics.length > 1 ? `<img src="${esc(sel.pic || pics[0].src)}" alt="${esc(p.name)}">` : MF.photo(p)}</div>${pics.length > 1 ? `<div class="pic-thumbs">${pics.map((x) => `<button class="${(sel.pic || pics[0].src) === x.src ? 'on' : ''}" data-pic="${esc(x.src)}" aria-label="Ver ${x.view === 'espalda' ? 'espalda' : 'frente'}"><img src="${esc(x.src)}" alt=""><span>${x.view === 'espalda' ? 'Espalda' : 'Frente'}</span></button>`).join('')}</div>` : ''}</div><div>
        <h2>${esc(p.name)}</h2><div class="price">${money(MF.price(p))}${pr ? `<s>${money(p.price)}</s><span class="tag-s rosa">-${pr.percent}%</span>` : ''}</div>
        <p class="desc">${esc(p.desc)}</p>
        ${p.composition || p.brand ? `<p class="fabric">${p.brand ? `<b>Marca:</b> ${esc(p.brand)}` : ''}${p.brand && p.composition ? ' · ' : ''}${p.composition ? `<b>Composición:</b> ${esc(p.composition)}` : ''}</p>` : ''}
        ${colors.length > 1 ? `<div class="opt-title">Color: ${esc(sel.color)}</div><div class="opts">${colors.map((c) => `<button class="dot ${c === sel.color ? 'on' : ''}" data-col="${esc(c)}" title="${esc(c)}" style="background:${MF.COLORS[c] || '#ccc'}"></button>`).join('')}</div>` : `<div class="opt-title">Color: ${esc(sel.color)}</div>`}
        <div class="opt-title">Talla</div><div class="opts">${vs.map((x) => { const a = MF.available(p, x); return `<button class="opt ${sel.size === x.size ? 'on' : ''}" data-size="${esc(x.size)}" ${a <= 0 ? 'disabled' : ''}>${esc(x.size)}${MF.get().settings.showStock && a > 0 ? `<small>${a} disp.</small>` : ''}</button>`; }).join('')}</div>
        ${v ? `<p class="stock-note ${max <= 1 ? 'low' : ''}">${max > 0 ? (max <= 2 ? `¡Quedan ${max}!` : 'Disponible') : 'Ya tienes todas las unidades disponibles en tu carrito'}</p>` : '<p class="stock-note">Elige tu talla</p>'}
        <div class="opt-title">Cantidad</div><div class="qty"><button data-q="-1" aria-label="Menos">${MF.icon('minus', 'sm')}</button><span>${sel.qty}</span><button data-q="1" aria-label="Más">${MF.icon('plus', 'sm')}</button></div>
        <div class="actions"><button class="btn rosa block" id="addCart" ${!v || max < sel.qty ? 'disabled' : ''}>${MF.icon('cart', 'sm')} Agregar al carrito · ${money(MF.price(p) * sel.qty)}</button>
          <button class="btn wa block" id="buyNow" ${!v || max < sel.qty ? 'disabled' : ''}>${MF.icon('whatsapp', 'sm')} Pedir ahora por WhatsApp</button></div></div></div>`;
      m.el.querySelectorAll('[data-pic]').forEach((b) => b.addEventListener('click', () => { sel.pic = b.dataset.pic; draw(); }));
      m.el.querySelectorAll('[data-col]').forEach((b) => b.addEventListener('click', () => { sel.color = b.dataset.col; sel.size = null; sel.qty = 1; draw(); }));
      m.el.querySelectorAll('[data-size]').forEach((b) => b.addEventListener('click', () => { sel.size = b.dataset.size; sel.qty = 1; draw(); }));
      m.el.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => { sel.qty = Math.max(1, Math.min(Math.max(1, max), sel.qty + +b.dataset.q)); draw(); }));
      const add = () => {
        const line = cart.find((l) => l.productId === p.id && l.size === v.size && l.color === v.color);
        if (line) line.qty += sel.qty; else cart.push({ productId: p.id, size: v.size, color: v.color, qty: sel.qty });
        saveCart();
        $('#cartBtn').classList.remove('bump'); void $('#cartBtn').offsetWidth; $('#cartBtn').classList.add('bump');
      };
      const ac = m.el.querySelector('#addCart');
      ac.addEventListener('click', () => { add(); MF.toast(`${p.name} (${v.size}) en tu carrito`); m.close(); });
      m.el.querySelector('#buyNow').addEventListener('click', () => { add(); m.close(); checkout('whatsapp'); });
    };
    draw();
  }

  // ---------- Carrito ----------
  function drawer(open) {
    cleanCart();
    const d = $('#drawer');
    const items = cartItems();
    d.innerHTML = `<div class="d-head"><h3>Tu carrito</h3><button class="icon-btn" id="dClose" aria-label="Cerrar">${MF.icon('x', 'sm')}</button></div>
      <div class="d-lines">${items.map(({ p, l, price }, i) => `<div class="line"><div class="th">${MF.photo(p)}</div><div><b>${esc(p.name)}</b><small>Talla ${esc(l.size)}${new Set(p.variants.map((v) => v.color)).size > 1 ? ' · ' + esc(l.color) : ''} · ${money(price)}</small><br><button class="rm" data-rm="${i}">Quitar</button></div>
        <div class="r"><b>${money(price * l.qty)}</b><div class="qty"><button data-dq="${i}" aria-label="Menos">${MF.icon('minus', 'sm')}</button><span>${l.qty}</span><button data-iq="${i}" aria-label="Más">${MF.icon('plus', 'sm')}</button></div></div></div>`).join('') ||
        `<div class="empty">${MF.icon('cart')}<p>Tu carrito está vacío.</p><button class="btn rosa sm" id="dShop">Ver la colección</button></div>`}</div>
      ${items.length ? `<div class="d-foot"><div class="d-total"><span>Total</span><b>${money(cartTotal())}</b></div>
        <button class="btn wa block" data-checkout="whatsapp">${MF.icon('whatsapp', 'sm')} Finalizar por WhatsApp</button>
        <button class="btn negro block" data-checkout="qr">${MF.icon('qr', 'sm')} Pagar con QR</button>
        <p class="d-note">El stock se reserva al enviar el pedido. MioShop confirma la venta al verificar el pago.</p></div>` : ''}`;
    if (open) { d.classList.add('open'); d.setAttribute('aria-hidden', 'false'); document.body.classList.add('no-scroll'); }
    $('#dClose').addEventListener('click', closeDrawer);
    const sh = $('#dShop'); if (sh) sh.addEventListener('click', closeDrawer);
    d.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { cart.splice(+b.dataset.rm, 1); saveCart(); drawer(); }));
    d.querySelectorAll('[data-dq]').forEach((b) => b.addEventListener('click', () => { const l = cart[+b.dataset.dq]; if (--l.qty <= 0) cart.splice(+b.dataset.dq, 1); saveCart(); drawer(); }));
    d.querySelectorAll('[data-iq]').forEach((b) => b.addEventListener('click', () => {
      const l = cart[+b.dataset.iq]; const p = MF.product(l.productId);
      if (l.qty + 1 > MF.available(p, variantOf(p, l))) return MF.toast('No hay más unidades de esa talla', 'error');
      l.qty++; saveCart(); drawer();
    }));
    d.querySelectorAll('[data-checkout]').forEach((b) => b.addEventListener('click', () => { closeDrawer(); checkout(b.dataset.checkout); }));
  }
  function closeDrawer() { $('#drawer').classList.remove('open'); $('#drawer').setAttribute('aria-hidden', 'true'); document.body.classList.remove('no-scroll'); }

  // ---------- Finalizar compra ----------
  function waMessage(items, total, order, method) {
    const lines = items.map(({ p, l, price }) => `- ${p.name}${new Set(p.variants.map((v) => v.color)).size > 1 ? ' ' + l.color.toLowerCase() : ''}, talla ${l.size}, cantidad ${l.qty}: Bs ${price * l.qty}`);
    return `Hola, quiero realizar un pedido en ${CFG.store.name}.\n\nProductos:\n${lines.join('\n')}\n\nTotal: Bs ${total}.\n\n` +
      (method === 'qr' ? `Ya realicé el pago por QR y adjunté el comprobante (pedido #${order.number}).` : 'Quisiera coordinar el pago y la entrega.') +
      `\n\nNombre: ${order.customer.name}${order.customer.address ? '\nEntrega: ' + order.customer.address : ''}\nPedido #${order.number}`;
  }

  function checkout(method) {
    cleanCart();
    const items = cartItems();
    if (!items.length) return MF.toast('Tu carrito está vacío', 'error');
    const total = cartTotal();
    const s = MF.get().settings;
    const st2 = { method, receipt: null, receiptName: null, step: 1, delivery: 'retiro' };
    const m = MF.modal({ title: method === 'qr' ? `${MF.icon('qr', 'sm')} Pagar con QR` : `${MF.icon('whatsapp', 'sm')} Finalizar por WhatsApp`, size: method === 'qr' ? 'lg' : '', body: '<div id="co"></div>', noFocus: true });
    const box = m.el.querySelector('#co');
    const summary = `<div class="summary">${items.map(({ p, l, price }) => `<div class="r"><span>${esc(p.name)} · ${esc(l.size)} × ${l.qty}</span><span>${money(price * l.qty)}</span></div>`).join('')}<div class="r t"><span>Total</span><span>${money(total)}</span></div></div>`;
    const data = { name: '', phone: '', address: '' };

    function step1() {
      box.innerHTML = `${summary}<form id="cf">
        <label class="f">Tu nombre <input name="name" required autocomplete="name" value="${esc(data.name)}" placeholder="Ej. Ana Pérez"></label>
        <label class="f">Celular (opcional) <input name="phone" inputmode="tel" autocomplete="tel" value="${esc(data.phone)}" placeholder="Para coordinar la entrega"></label>
        <div class="seg2"><button type="button" class="${st2.delivery === 'retiro' ? 'on' : ''}" data-dl="retiro">Retiro en tienda</button><button type="button" class="${st2.delivery === 'envio' ? 'on' : ''}" data-dl="envio">Envío</button></div>
        ${st2.delivery === 'envio' ? `<label class="f">Dirección o zona de entrega <input name="address" value="${esc(data.address)}" required></label>` : ''}
        <button class="btn ${method === 'qr' ? 'negro' : 'wa'} block">${method === 'qr' ? `Continuar al pago ${MF.icon('arrowRight', 'sm')}` : `${MF.icon('whatsapp', 'sm')} Preparar pedido`}</button>
        <p class="d-note" style="margin-top:10px">${esc(s.delivery)}</p></form>`;
      const f = box.querySelector('#cf');
      const keep = () => { data.name = f.name.value; data.phone = f.phone.value; if (f.address) data.address = f.address.value; };
      box.querySelectorAll('[data-dl]').forEach((b) => b.addEventListener('click', () => { keep(); st2.delivery = b.dataset.dl; step1(); }));
      f.addEventListener('submit', (e) => { e.preventDefault(); keep(); if (method === 'qr') stepQR(); else finish(); });
      setTimeout(() => f.name.focus(), 50);
    }

    function stepQR() {
      box.innerHTML = `<div class="qr-pay"><div class="qr-box">${s.qrImage ? `<img src="${s.qrImage}" alt="QR de pago de ${esc(CFG.store.name)}">` : MF.demoQR()}<small>${esc(s.bankLabel)}</small>${s.qrImage ? '' : '<small>QR ficticio: no sirve para pagar</small>'}</div>
        <div><div class="amount"><small>Monto a pagar</small><b>${money(total)}</b></div>
          <ol class="steps"><li>Abre la app de tu banco y escanea el QR.</li><li>Escribe el monto <b>${money(total)}</b>: el QR no incluye el monto.</li><li>Guarda el comprobante y adjúntalo aquí.</li></ol>
          <label class="upload">${MF.icon('paperclip')}<span id="upTxt">Adjuntar comprobante (foto o captura)</span><input type="file" accept="image/*" id="rc" hidden></label>
          <button class="btn rosa block" id="regQr" style="margin-top:12px">${MF.icon('check', 'sm')} Registrar pedido</button>
          <button class="btn claro block sm" id="back" style="margin-top:8px">Volver</button>
          <p class="notice">Demostración: no se realiza ningún pago real ni verificación automática con el banco. ${esc(CFG.store.name)} revisa el comprobante y confirma el pago manualmente desde su panel.</p></div></div>`;
      box.querySelector('#rc').addEventListener('change', async (e) => {
        try { st2.receipt = await MF.readImage(e.target.files[0], 700, 0.72); st2.receiptName = e.target.files[0].name; box.querySelector('.upload').innerHTML = `<img src="${st2.receipt}" alt=""><span>Comprobante adjunto · ${esc(st2.receiptName)}</span>`; }
        catch (err) { MF.toast('No se pudo leer la imagen', 'error'); }
      });
      box.querySelector('#back').addEventListener('click', step1);
      box.querySelector('#regQr').addEventListener('click', async () => {
        if (!st2.receipt && !(await MF.confirmDialog('No adjuntaste el comprobante. Puedes enviarlo después por WhatsApp. ¿Registrar el pedido igual?', 'Registrar sin comprobante'))) return;
        finish();
      });
    }

    function finish() {
      // Validación final de disponibilidad (otra pestaña pudo haber vendido)
      const short = items.find(({ p, l }) => MF.available(p, variantOf(p, l)) < l.qty);
      if (short) { MF.toast(`Ya no hay suficiente stock de ${short.p.name} (${short.l.size})`, 'error'); m.close(); drawer(true); return; }
      const order = MF.createOrder({
        customer: { name: data.name.trim(), phone: data.phone.trim(), address: st2.delivery === 'envio' ? data.address.trim() : '' },
        items: items.map(({ p, l, price }) => ({ productId: p.id, name: p.name, size: l.size, color: l.color, qty: l.qty, price, cost: p.cost })),
        method, receipt: st2.receipt, receiptName: st2.receiptName,
        notes: (st2.delivery === 'envio' ? 'Envío a: ' + data.address : 'Retiro en tienda') + (method === 'qr' && st2.receipt ? ' · Comprobante adjunto' : '')
      });
      const msg = waMessage(items, total, order, method);
      cart = []; saveCart(); renderAll();
      box.innerHTML = `<div class="done"><div class="ok">${MF.icon('checkCircle')}</div><h3>¡Pedido #${order.number} registrado!</h3>
        <p>${method === 'qr' ? `${esc(CFG.store.name)} verificará tu pago y te confirmará por WhatsApp.` : 'Envía este mensaje para coordinar el pago y la entrega.'}</p>
        <div class="msg-prev">${esc(msg)}</div>
        <a class="btn wa block" href="${MF.waLink(s.whatsapp, msg)}" target="_blank" rel="noopener">${MF.icon('whatsapp', 'sm')} ${method === 'qr' ? 'Avisar por WhatsApp' : 'Enviar pedido por WhatsApp'}</a>
        <p class="notice">Simulación: el pedido ya aparece en el panel de la tienda (Pedidos) con el stock reservado. ${s.whatsapp ? '' : 'Como no hay número configurado, WhatsApp te pedirá elegir el contacto.'} <a href="demo.html#/pedidos" target="_blank">Abrir el panel →</a></p></div>`;
    }
    step1();
  }

  // ---------- Catálogo no disponible (plan Básico o prueba vencida) ----------
  function closed() {
    const pl = MF.plan();
    const expired = pl.trial && MF.readOnly();
    document.body.classList.add('shop-closed');
    document.querySelector('main').innerHTML = `<section class="closed-box wrap"><img src="${CFG.store.logo}" alt=""><h1>${expired ? 'Catálogo desactivado' : 'Catálogo no disponible'}</h1>
      <p>${expired ? 'La prueba gratuita de esta tienda terminó y su catálogo público se desactivó. Los datos se conservan: al elegir un plan Pro o Premium vuelve a publicarse.' : `El plan <b>${esc(pl.name)}</b> no incluye catálogo público. El catálogo online con carrito y pedidos por WhatsApp y QR está disponible desde el plan Pro (y durante la prueba gratuita).`}</p>
      <p class="muted">Demostración: cambie el plan desde el panel para ver el catálogo.</p>
      <div class="closed-actions"><a class="btn-sh" href="demo.html?plan=pro#/catalogo">Probar con el plan Pro</a><a class="btn-sh ghost" href="planes.html">Comparar planes</a></div></section>`;
    ['#cartBtn', '#waFloat', '.shop-search'].forEach((x) => { const el = document.querySelector(x); if (el) el.hidden = true; });
  }

  // ---------- Inicio ----------
  MF.applyBrand();
  if (!MF.catalogActive()) { closed(); MF.hydrateIcons(document.body); MF.onChange((src) => { if (src === 'remote' && MF.catalogActive()) location.reload(); }); return; }
  banner();
  updateCount();
  renderAll();
  $('#q').addEventListener('input', (e) => { st.q = e.target.value; featured(); grid(); });
  $('#sort').addEventListener('change', (e) => { st.sort = e.target.value; grid(); });
  $('#filtersBtn').addEventListener('click', () => { const fp = $('#filterPanel'); fp.hidden = !fp.hidden; if (!fp.hidden) filterPanel(); });
  $('#cartBtn').addEventListener('click', () => drawer(true));
  $('#drawerScrim').addEventListener('click', closeDrawer);
  document.addEventListener('click', (e) => {
    const o = e.target.closest('[data-open]');
    if (o) { e.stopPropagation(); openProduct(MF.product(o.dataset.open)); return; }
    if (e.target.closest('[data-open-cart]')) drawer(true);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('.card[data-open]')) openProduct(MF.product(e.target.dataset.open)); if (e.key === 'Escape') closeDrawer(); });
  MF.onChange((src) => { if (src === 'remote') { if (!MF.catalogActive()) return location.reload(); cleanCart(); renderAll(); } });
  const hp = location.hash.match(/#p=([\w-]+)/);
  if (hp) setTimeout(() => openProduct(MF.product(hp[1])), 200);
})();
