/*
 * Punto de venta (Vender), boleta de venta e historial de ventas.
 * No se piden datos del cliente. La venta descuenta el stock de cada variante; anularla lo repone.
 */
(function () {
  const MF = window.MF;
  const D = MF.demo;
  const { $, esc, money } = MF;
  const pos = { q: '', cat: '', cart: [], discount: '', discType: 'bs', method: 'efectivo', methodNote: '', received: '', qrOk: false, open: false };
  const hist = { period: '7', method: '', q: '' };

  const inCart = (pid, size, color) => pos.cart.filter((l) => l.productId === pid && (!size || (l.size === size && l.color === color))).reduce((s, l) => s + l.qty, 0);
  const lineDisc = (l) => Math.min(l.price * l.qty, Math.max(0, Math.round(+l.discount || 0)));
  function generalDisc() {
    const base = pos.cart.reduce((s, l) => s + l.price * l.qty - lineDisc(l), 0);
    const v = Math.max(0, +pos.discount || 0);
    return Math.min(base, pos.discType === '%' ? Math.round((base * Math.min(v, 100)) / 100) : Math.round(v));
  }
  const totals = () => MF.saleTotals(pos.cart, generalDisc());
  const units = () => pos.cart.reduce((s, l) => s + l.qty, 0);

  // ---------- Vender ----------
  D.register({
    id: 'vender', label: 'Vender', icon: 'cart', title: 'Nueva venta',
    sub: () => (MF.can('sucursales') ? 'Vendiendo en ' + MF.branchName(MF.branchId()) : 'Toque una prenda para agregarla'),
    render(view, params) {
      const d = MF.get();
      const b = MF.branchId();
      const words = pos.q.toLowerCase().split(/\s+/).filter(Boolean);
      const items = d.products.filter((p) => MF.isActive(p) && words.every((w) => MF.tagsText(p).includes(w)) && (!pos.cat || p.category === pos.cat));
      const t = totals();
      view.innerHTML = `<div class="pos">
        <div>
          <div class="search-big">${MF.icon('search', 'sm')}<input id="posq" type="search" placeholder="Buscar por nombre o etiqueta…" value="${esc(pos.q)}" autocomplete="off"></div>
          <div class="chips-row scroll-x"><button class="fchip ${!pos.cat ? 'on' : ''}" data-cat="">Todo</button>${d.categories.map((c) => `<button class="fchip ${pos.cat === c ? 'on' : ''}" data-cat="${c}">${c}</button>`).join('')}</div>
          <div class="pos-grid">${items.map((p) => {
            const s = MF.stock(p, b) - inCart(p.id);
            const pr = MF.promoFor(p);
            return `<button class="pos-item ${s <= 0 ? 'out' : ''}" data-add="${p.id}" ${s <= 0 ? 'aria-disabled="true"' : ''}>
              <div class="pic">${MF.photo(p)}${pr ? `<span class="badge pink promo">-${pr.percent}%</span>` : ''}</div>
              <div class="t"><b>${esc(p.name)}</b><span>${money(MF.price(p))}<em class="${s <= 0 ? 'no' : s <= 2 ? 'low' : ''}">${s > 0 ? s + ' disp.' : 'Agotado'}</em></span></div></button>`;
          }).join('') || `<div class="empty">${MF.icon('search')}<p>Sin resultados para "${esc(pos.q)}"</p></div>`}</div>
        </div>
        <aside class="panel cart ${pos.open ? 'open' : ''}" id="cart">${cartHTML()}</aside>
      </div>
      <button class="cart-fab ${pos.cart.length ? '' : 'empty'}" id="cartFab"><span class="cf-count">${units()}</span><span>Ver venta</span><b>${money(t.total)}</b></button>`;
      bindPos(view);
      if (params.p) { history.replaceState(null, '', '#/vender'); const p = MF.product(params.p); if (p) pickVariant(p); }
    }
  });

  function cartHTML() {
    const t = totals();
    const change = pos.method === 'efectivo' && +pos.received ? +pos.received - t.total : null;
    return `<div class="panel-head cart-head"><h3>${MF.icon('cart', 'sm')} Venta actual · ${units()} ${units() === 1 ? 'prenda' : 'prendas'}</h3>${pos.cart.length ? '<button class="link-btn" id="clearCart">Vaciar</button>' : ''}<button class="icon-btn cart-close" id="closeCart" aria-label="Cerrar">${MF.icon('x', 'sm')}</button></div>
      <div class="cart-lines">${pos.cart.map((l, i) => { const p = MF.product(l.productId) || l; const ld = lineDisc(l);
        return `<div class="cl"><div class="cl-top">${MF.photo(p, 'thumb')}<div class="grow"><b>${esc(l.name)}</b><small>Talla ${esc(l.size)} · ${esc(l.color)} · ${money(l.price)} c/u</small><small class="muted">Quedan ${maxFor(l) - l.qty} disponibles</small></div>
          <button class="icon-btn" data-rm="${i}" aria-label="Quitar ${esc(l.name)}">${MF.icon('trash', 'sm')}</button></div>
          <div class="cl-bot"><div class="stepper"><button data-dec="${i}" aria-label="Menos">${MF.icon('minus', 'sm')}</button><span>${l.qty}</span><button data-inc="${i}" aria-label="Más">${MF.icon('plus', 'sm')}</button></div>
          <label class="ld">Desc. Bs<input type="number" inputmode="numeric" min="0" data-ld="${i}" value="${l.discount || ''}" placeholder="0"></label>
          <b class="cl-total">${ld ? `<s class="muted">${money(l.price * l.qty)}</s> ` : ''}${money(l.price * l.qty - ld)}</b></div></div>`; }).join('') ||
        `<div class="empty">${MF.icon('shirt')}<p>Toque una prenda para agregarla a la venta</p></div>`}</div>
      ${pos.cart.length ? `<div class="totals">
        <div class="row"><span>Subtotal</span><b>${money(t.subtotal)}</b></div>
        <div class="row"><span>Descuento general</span><div class="disc"><input id="disc" type="number" inputmode="numeric" min="0" value="${pos.discount}" placeholder="0"><select id="discType" aria-label="Tipo de descuento"><option value="bs" ${pos.discType === 'bs' ? 'selected' : ''}>Bs</option><option value="%" ${pos.discType === '%' ? 'selected' : ''}>%</option></select></div></div>
        ${t.discountTotal ? `<div class="row disc-row"><span>Descuentos${t.lineDiscount && t.discount ? ` (prendas ${money(t.lineDiscount)} + general ${money(t.discount)})` : ''}</span><span>− ${money(t.discountTotal)}</span></div>` : ''}
        <div class="row grand"><span>Total</span><span id="grand">${money(t.total)}</span></div></div>
      <span class="lbl">Método de pago</span>
      <div class="pay-methods three">${Object.entries(MF.PAY).map(([k, l]) => `<button data-m="${k}" class="${pos.method === k ? 'on' : ''}">${MF.icon(k === 'qr' ? 'qr' : k === 'efectivo' ? 'wallet' : 'more', 'sm')} ${l}</button>`).join('')}</div>
      ${pos.method === 'efectivo' ? `<div class="totals slim"><div class="row"><span>Recibido (opcional)</span><input id="recv" type="number" inputmode="numeric" min="0" value="${pos.received}" placeholder="Bs"></div>${change != null ? `<div class="row"><span>Cambio</span><b style="color:${change < 0 ? 'var(--red)' : 'var(--mint)'}">${change < 0 ? 'Falta ' + money(-change) : money(change)}</b></div>` : ''}</div>`
        : pos.method === 'qr' ? `<label class="switch pay-check"><input type="checkbox" id="qrOk" ${pos.qrOk ? 'checked' : ''}><span></span> Verifiqué el pago en mi app bancaria</label>`
        : `<label class="pay-note">Detalle (opcional) <input id="mNote" value="${esc(pos.methodNote)}" placeholder="Ej. tarjeta, transferencia"></label>`}
      <button class="btn grad block lg" id="confirmSale">${MF.icon('check', 'sm')} Confirmar venta · ${money(t.total)}</button>` : ''}`;
  }
  function maxFor(l) { const v = MF.findVariant(MF.product(l.productId), l.size, l.color); return v ? v.stock[MF.branchId()] || 0 : 0; }

  function bindPos(view) {
    const q = view.querySelector('#posq');
    q.addEventListener('input', () => { pos.q = q.value; const p = q.selectionStart; D.rerender(); const n = $('#posq'); n.focus(); n.setSelectionRange(p, p); });
    view.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => { pos.cat = b.dataset.cat; D.rerender(); }));
    view.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => { if (b.classList.contains('out')) return MF.toast('Sin stock disponible', 'error'); pickVariant(MF.product(b.dataset.add)); }));
    $('#cartFab').addEventListener('click', () => { pos.open = true; $('#cart').classList.add('open'); document.body.classList.add('cart-open'); });
    bindCart();
  }
  function redrawCart() {
    $('#cart').innerHTML = cartHTML();
    const t = totals();
    const fab = $('#cartFab');
    if (fab) { fab.innerHTML = `<span class="cf-count">${units()}</span><span>Ver venta</span><b>${money(t.total)}</b>`; fab.classList.toggle('empty', !pos.cart.length); }
    MF.hydrateIcons($('#cart'));
    bindCart();
  }
  function bindCart() {
    const c = $('#cart');
    const on = (sel, ev, fn) => { const el = c.querySelector(sel); if (el) el.addEventListener(ev, fn); };
    on('#closeCart', 'click', () => { pos.open = false; c.classList.remove('open'); document.body.classList.remove('cart-open'); });
    on('#clearCart', 'click', () => { pos.cart = []; pos.discount = ''; D.rerender(); });
    c.querySelectorAll('[data-inc]').forEach((b) => b.addEventListener('click', () => {
      const l = pos.cart[b.dataset.inc];
      if (l.qty >= maxFor(l)) return MF.toast(`No hay más unidades de ${l.name} talla ${l.size}`, 'error');
      l.qty++; redrawCart(); refreshGrid();
    }));
    c.querySelectorAll('[data-dec]').forEach((b) => b.addEventListener('click', () => {
      const l = pos.cart[b.dataset.dec];
      if (--l.qty <= 0) pos.cart.splice(b.dataset.dec, 1);
      redrawCart(); refreshGrid();
    }));
    c.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { pos.cart.splice(+b.dataset.rm, 1); redrawCart(); refreshGrid(); }));
    c.querySelectorAll('[data-ld]').forEach((inp) => inp.addEventListener('change', () => { pos.cart[inp.dataset.ld].discount = Math.max(0, Math.round(+inp.value || 0)); redrawCart(); }));
    on('#disc', 'change', (e) => { pos.discount = e.target.value; redrawCart(); });
    on('#discType', 'change', (e) => { pos.discType = e.target.value; redrawCart(); });
    on('#recv', 'change', (e) => { pos.received = e.target.value; redrawCart(); });
    on('#qrOk', 'change', (e) => { pos.qrOk = e.target.checked; });
    on('#mNote', 'input', (e) => { pos.methodNote = e.target.value; });
    c.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => { pos.method = b.dataset.m; redrawCart(); }));
    on('#confirmSale', 'click', confirmSale);
  }
  // Actualiza "disponibles" de la grilla sin cerrar el carrito
  function refreshGrid() {
    const b = MF.branchId();
    document.querySelectorAll('.pos-item').forEach((el) => {
      const p = MF.product(el.dataset.add); if (!p) return;
      const s = MF.stock(p, b) - inCart(p.id);
      el.classList.toggle('out', s <= 0);
      const em = el.querySelector('em'); if (em) { em.textContent = s > 0 ? s + ' disp.' : 'Agotado'; em.className = s <= 0 ? 'no' : s <= 2 ? 'low' : ''; }
    });
  }

  /** Hoja para elegir talla, color y cantidad (muestra siempre el stock disponible). */
  function pickVariant(p) {
    const b = MF.branchId();
    const colors = [...new Set(p.variants.map((v) => v.color))];
    const sel = { color: colors.find((c) => p.variants.some((v) => v.color === c && (v.stock[b] || 0) - inCart(p.id, v.size, v.color) > 0)) || colors[0], size: null, qty: 1 };
    const free = (v) => (v.stock[b] || 0) - inCart(p.id, v.size, v.color);
    const ok = p.variants.filter((v) => free(v) > 0);
    if (ok.length === 1 && p.variants.length === 1) return add(p, ok[0], 1);
    const m = MF.modal({ title: esc(p.name), size: 'sheet', noFocus: true, body: '<div id="pv"></div>' });
    function draw() {
      const vs = p.variants.filter((v) => v.color === sel.color);
      const v = vs.find((x) => x.size === sel.size);
      const max = v ? free(v) : 0;
      m.el.querySelector('#pv').innerHTML = `<div class="pv-head">${MF.photo(p, 'thumb')}<div><b class="price">${money(MF.price(p))}</b><small class="muted">${esc(p.category)} · total disponible ${MF.stock(p, b) - inCart(p.id)}</small></div></div>
        ${colors.length > 1 ? `<span class="lbl">Color</span><div class="size-pick">${colors.map((c) => `<button data-col="${esc(c)}" class="${c === sel.color ? 'on' : ''}"><i class="dot" style="background:${MF.COLORS[c] || '#ccc'}"></i>${esc(c)}</button>`).join('')}</div>` : ''}
        <span class="lbl">Talla</span><div class="size-pick">${vs.map((x) => `<button data-size="${esc(x.size)}" class="${sel.size === x.size ? 'on' : ''}" ${free(x) <= 0 ? 'disabled' : ''}>${esc(x.size)}<small>${free(x) > 0 ? free(x) + ' disp.' : 'Agotado'}</small></button>`).join('')}</div>
        <div class="pv-foot"><div class="stepper"><button data-q="-1" aria-label="Menos">${MF.icon('minus', 'sm')}</button><span>${sel.qty}</span><button data-q="1" aria-label="Más">${MF.icon('plus', 'sm')}</button></div>
          <button class="btn grad lg" id="pvAdd" ${!v || max < sel.qty ? 'disabled' : ''}>${MF.icon('plus', 'sm')} Agregar · ${money(MF.price(p) * sel.qty)}</button></div>`;
      m.el.querySelectorAll('[data-col]').forEach((x) => x.addEventListener('click', () => { sel.color = x.dataset.col; sel.size = null; sel.qty = 1; draw(); }));
      m.el.querySelectorAll('[data-size]').forEach((x) => x.addEventListener('click', () => { sel.size = x.dataset.size; sel.qty = 1; draw(); }));
      m.el.querySelectorAll('[data-q]').forEach((x) => x.addEventListener('click', () => { sel.qty = Math.max(1, Math.min(Math.max(1, max), sel.qty + +x.dataset.q)); draw(); }));
      m.el.querySelector('#pvAdd').addEventListener('click', () => { m.close(); add(p, v, sel.qty); });
    }
    draw();
  }
  function add(p, v, qty) {
    const line = pos.cart.find((l) => l.productId === p.id && l.size === v.size && l.color === v.color);
    if (line) line.qty += qty;
    else pos.cart.push({ productId: p.id, name: p.name, size: v.size, color: v.color, qty, price: MF.price(p), cost: p.cost || 0, discount: 0 });
    MF.toast(`${p.name} (${v.size}) agregado`);
    D.rerender();
  }

  function confirmSale() {
    if (D.guardWrite()) return;
    const t = totals();
    if (pos.method === 'efectivo' && pos.received && +pos.received < t.total) return MF.toast('El monto recibido es menor al total', 'error');
    if (pos.method === 'qr' && !pos.qrOk) return MF.toast('Marque que verificó el pago QR en su app bancaria', 'error');
    const r = MF.createSale({ items: pos.cart, discount: generalDisc(), method: pos.method, methodNote: pos.method === 'otro' ? pos.methodNote.trim() : '', received: pos.method === 'efectivo' ? +pos.received || null : null });
    if (r.error) return MF.toast(r.error, 'error');
    Object.assign(pos, { cart: [], discount: '', received: '', qrOk: false, methodNote: '', open: false });
    document.body.classList.remove('cart-open');
    D.rerender();
    showReceipt(r.sale, true);
  }

  // ---------- Boleta ----------
  function receiptHTML(s) {
    return `<div class="receipt" id="rcpt"><div class="c"><img src="${MF_CONFIG.store.logo}" alt=""><b>${esc(MF_CONFIG.store.fullName || MF_CONFIG.store.name)}</b><br>${esc(MF.branchName(s.branchId))}</div><hr>
      <div class="c"><b>BOLETA DE VENTA N° ${s.number}</b><br>${MF.fdate(s.date, true)}</div><hr>
      ${s.items.map((i) => `<div>${esc(i.name)} (${esc(i.size)}${i.color ? ' · ' + esc(i.color) : ''})</div><div class="r"><span>${i.qty} × ${money(i.price)}</span><span>${money(i.qty * i.price)}</span></div>${i.discount ? `<div class="r muted"><span>Descuento prenda</span><span>− ${money(i.discount)}</span></div>` : ''}`).join('')}<hr>
      <div class="r"><span>Subtotal</span><span>${money(s.subtotal)}</span></div>
      ${s.lineDiscount ? `<div class="r"><span>Descuentos por prenda</span><span>− ${money(s.lineDiscount)}</span></div>` : ''}
      ${s.discount ? `<div class="r"><span>Descuento general</span><span>− ${money(s.discount)}</span></div>` : ''}
      <div class="r big"><span>TOTAL</span><span>${money(s.total)}</span></div>
      <div class="r"><span>Pago</span><span>${esc(MF.PAY[s.method] || s.method)}${s.methodNote ? ' · ' + esc(s.methodNote) : ''}</span></div>
      ${s.received ? `<div class="r"><span>Recibido / cambio</span><span>${money(s.received)} / ${money(s.received - s.total)}</span></div>` : ''}
      ${s.status !== 'completada' ? `<div class="c void"><b>${s.status === 'devuelta' ? 'DEVUELTA' : 'ANULADA'}</b>${s.voidNote ? `<br><small>${esc(s.voidNote)}</small>` : ''}</div>` : ''}
      <hr><div class="c">¡Gracias por tu compra!<br><small>Comprobante comercial, no es factura fiscal.</small></div></div>`;
  }
  function waText(s) {
    return `*${MF_CONFIG.store.name}* · Boleta N° ${s.number}\n${MF.fdate(s.date, true)}\n` + s.items.map((i) => `• ${i.name} (${i.size}) x${i.qty}: Bs ${i.price * i.qty - (i.discount || 0)}`).join('\n') +
      (MF.saleDiscount(s) ? `\nDescuentos: Bs ${MF.saleDiscount(s)}` : '') + `\n*Total: Bs ${s.total}* · ${MF.PAY[s.method] || s.method}\n¡Gracias por tu compra!`;
  }
  function printReceipt(s) {
    const w = window.open('', '_blank', 'width=420,height=640');
    if (!w) return MF.toast('Permita las ventanas emergentes para imprimir', 'error');
    w.document.write(`<html><head><title>Boleta ${s.number}</title><base href="${location.href}"><link rel="stylesheet" href="css/styles.css"><link rel="stylesheet" href="css/dashboard.css"></head><body style="background:#fff;padding:16px">${receiptHTML(s)}<script>setTimeout(()=>print(),400)<\/script></body></html>`);
    w.document.close();
  }
  function showReceipt(s, fresh) {
    const m = MF.modal({
      title: fresh ? `${MF.icon('checkCircle', 'sm')} Venta registrada` : `Venta #${s.number}`, size: 'sheet', noFocus: true,
      body: (fresh ? `<p class="sale-ok">El inventario ya se actualizó: ${s.items.map((i) => `${esc(i.name)} (${esc(i.size)}) −${i.qty}`).join(', ')}.</p>` : '') + receiptHTML(s) +
        `<div class="receipt-actions"><button class="btn primary" data-r="pdf">${MF.icon('download', 'sm')} Descargar PDF</button>
          <a class="btn wa" href="${MF.waLink('', waText(s))}" target="_blank" rel="noopener">${MF.icon('whatsapp', 'sm')} WhatsApp</a>
          <button class="btn ghost" data-r="print">${MF.icon('printer', 'sm')} Imprimir</button></div>
        ${!fresh && s.status === 'completada' ? `<div class="receipt-actions sub"><button class="btn ghost danger-txt" data-r="void">${MF.icon('x', 'sm')} Anular venta</button>
          ${s.channel === 'tienda' ? (MF.can('devoluciones') ? `<button class="btn ghost" data-r="ret">${MF.icon('undo', 'sm')} Cambio o devolución</button>` : `<button class="btn ghost" data-lock="devoluciones">${MF.icon('lock', 'sm')} Devolución · Pro</button>`) : ''}</div>` : ''}`,
      footer: fresh ? `<button class="btn grad block" data-close>${MF.icon('cart', 'sm')} Nueva venta</button>` : '<button class="btn ghost" data-close>Cerrar</button>'
    });
    m.el.querySelectorAll('[data-r]').forEach((b) => b.addEventListener('click', async () => {
      const a = b.dataset.r;
      if (a === 'pdf') { try { await MF.PDF.downloadBoleta(s); MF.toast('Boleta descargada en PDF'); } catch (e) { MF.toast(e.message, 'error'); } }
      if (a === 'print') printReceipt(s);
      if (a === 'void') { m.close(); voidDialog(s); }
      if (a === 'ret') { m.close(); returnDialog(s); }
    }));
  }
  MF.showReceipt = showReceipt;

  function voidDialog(s) {
    if (D.guardWrite()) return;
    const m = MF.modal({
      title: `Anular venta #${s.number}`, size: 'sm',
      body: `<p>La venta queda <b>anulada</b> y las prendas vuelven al inventario:</p>
        <ul class="list">${s.items.map((i) => `<li><div class="grow"><b>${esc(i.name)}</b><small>Talla ${esc(i.size)} · +${i.qty} al stock</small></div><b>${money(i.price * i.qty - (i.discount || 0))}</b></li>`).join('')}</ul>
        <label style="margin-top:10px">Motivo <select id="vr"><option>Error al registrar</option><option>La clienta desistió</option><option>Cobro duplicado</option><option>Otro</option></select></label>`,
      footer: `<button class="btn ghost" data-close>Cancelar</button><button class="btn danger" id="doVoid">Anular y reponer stock</button>`
    });
    m.el.querySelector('#doVoid').addEventListener('click', () => {
      const r = MF.voidSale(s.id, m.el.querySelector('#vr').value);
      if (r.error) return MF.toast(r.error, 'error');
      m.close(); MF.toast(`Venta #${s.number} anulada: stock repuesto`); D.rerender();
    });
  }
  function returnDialog(s) {
    const m = MF.modal({
      title: `Cambio o devolución · venta #${s.number}`, size: 'sm',
      body: `<p>Las prendas vuelven al inventario y la venta queda marcada como devuelta.</p>
        <label>Motivo <select id="rr"><option>Cambio de talla</option><option>Cambio de modelo</option><option>Prenda con falla</option><option>Devolución de dinero</option></select></label>`,
      footer: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="doRet">${MF.icon('undo', 'sm')} Registrar devolución</button>`
    });
    m.el.querySelector('#doRet').addEventListener('click', () => { MF.returnSale(s.id, m.el.querySelector('#rr').value); m.close(); MF.toast('Devolución registrada y stock repuesto'); D.rerender(); });
  }

  // ---------- Historial de ventas ----------
  D.register({
    id: 'ventas', label: 'Historial de ventas', short: 'Ventas', icon: 'receipt',
    sub: () => 'Ver detalle, boleta, anular o devolver',
    render(view) {
      const d = MF.get();
      const from = hist.period === 'all' ? 0 : hist.period === 'today' ? new Date().setHours(0, 0, 0, 0) : Date.now() - (+hist.period) * 864e5;
      const q = hist.q.toLowerCase();
      const list = MF.visibleSales().filter((s) => new Date(s.date).getTime() >= from && (!hist.method || s.method === hist.method) &&
        (!MF.can('sucursales') || s.branchId === MF.branchId()) &&
        (!q || String(s.number).includes(q) || s.items.some((i) => i.name.toLowerCase().includes(q)))).slice().reverse();
      const ok = list.filter((s) => s.status === 'completada');
      const total = ok.reduce((a, s) => a + s.total, 0);
      view.innerHTML = `
        <div class="chips-row scroll-x">${[['today', 'Hoy'], ['7', '7 días'], ['30', '30 días'], ['all', 'Todo']].map(([k, l]) => `<button class="fchip ${hist.period === k ? 'on' : ''}" data-hp="${k}">${l}</button>`).join('')}</div>
        <div class="kpis kpis-4">
          <div class="kpi"><small>Total vendido</small><b>${money(total)}</b><em>${ok.length} ventas</em></div>
          <div class="kpi pink"><small>Ticket promedio</small><b>${money(ok.length ? total / ok.length : 0)}</b></div>
          <div class="kpi mint"><small>Descuentos</small><b>${money(ok.reduce((a, s) => a + MF.saleDiscount(s), 0))}</b></div>
          <div class="kpi amber"><small>Anuladas o devueltas</small><b>${list.length - ok.length}</b></div>
        </div>
        <div class="search-big">${MF.icon('search', 'sm')}<input id="hq" type="search" placeholder="Buscar por número o prenda…" value="${esc(hist.q)}"></div>
        <div class="toolbar"><div class="chips-row scroll-x" style="margin:0">${[['', 'Todo pago'], ...Object.entries(MF.PAY)].map(([k, l]) => `<button class="fchip sm ${hist.method === k ? 'on' : ''}" data-hm="${k}">${l}</button>`).join('')}</div><span class="spacer"></span><button class="btn ghost sm" id="hexp">${MF.icon('download', 'sm')} Excel</button></div>
        <div class="sale-list">${list.slice(0, 120).map((s) => `<button class="sale-card ${s.status}" data-rc="${s.id}">
          <span class="sc-ic">${MF.icon(s.method === 'qr' ? 'qr' : s.method === 'otro' ? 'more' : 'wallet', 'sm')}</span>
          <span class="grow"><b>#${s.number} · ${esc(s.items.map((i) => `${i.name}${i.qty > 1 ? ' ×' + i.qty : ''}`).join(', '))}</b><small>${MF.fdate(s.date, true)} · ${esc(MF.PAY[s.method] || s.method)}${s.channel === 'online' ? ' · pedido online' : ''}${MF.saleDiscount(s) ? ' · desc. ' + money(MF.saleDiscount(s)) : ''}</small></span>
          <span class="sc-r"><b>${money(s.total)}</b>${s.status !== 'completada' ? `<span class="badge ${s.status === 'devuelta' ? 'warn' : 'bad'}">${s.status === 'devuelta' ? 'Devuelta' : 'Anulada'}</span>` : ''}</span></button>`).join('') || '<div class="panel empty">Sin ventas en este período</div>'}</div>`;
      const hq = view.querySelector('#hq');
      hq.addEventListener('input', () => { hist.q = hq.value; const p = hq.selectionStart; D.rerender(); const n = $('#hq'); n.focus(); n.setSelectionRange(p, p); });
      view.querySelectorAll('[data-hp]').forEach((b) => b.addEventListener('click', () => { hist.period = b.dataset.hp; D.rerender(); }));
      view.querySelectorAll('[data-hm]').forEach((b) => b.addEventListener('click', () => { hist.method = b.dataset.hm; D.rerender(); }));
      view.querySelectorAll('[data-rc]').forEach((b) => b.addEventListener('click', () => showReceipt(d.sales.find((s) => s.id === b.dataset.rc))));
      view.querySelector('#hexp').addEventListener('click', () => {
        const rows = [['Número', 'Fecha', 'Prendas', 'Pago', 'Subtotal', 'Descuentos', 'Total', 'Estado', 'Canal']];
        list.forEach((s) => rows.push([s.number, MF.fdate(s.date, true), s.items.map((i) => `${i.name} (${i.size}) x${i.qty}`).join(' | '), MF.PAY[s.method] || s.method, s.subtotal, MF.saleDiscount(s), s.total, s.status, s.channel]));
        MF.downloadCSV('ventas-mioshop.csv', rows);
        MF.toast('Ventas descargadas (se abre con Excel)');
      });
    }
  });
})();
