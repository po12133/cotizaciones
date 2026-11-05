/*
 * Punto de venta e historial de ventas.
 */
(function () {
  const MF = window.MF;
  const D = MF.demo;
  const { $, esc, money } = MF;
  const pos = { q: '', cat: '', cart: [], discount: 0, discType: 'bs', method: 'efectivo', customerId: '', received: '', qrOk: false, open: false };
  const hist = { period: '30', method: '', channel: '', q: '' };

  const inCart = (pid, size, color) => pos.cart.filter((l) => l.productId === pid && (!size || (l.size === size && l.color === color))).reduce((s, l) => s + l.qty, 0);
  const subtotal = () => pos.cart.reduce((s, l) => s + l.price * l.qty, 0);
  const discountBs = () => {
    const sub = subtotal();
    const v = Math.max(0, +pos.discount || 0);
    return Math.min(sub, pos.discType === '%' ? Math.round((sub * Math.min(v, 100)) / 100) : v);
  };

  // ---------- Punto de venta ----------
  D.register({
    id: 'pos', label: 'Punto de venta', icon: 'cart', group: 'Principal',
    sub: () => 'Vendiendo en ' + MF.branchName(MF.branchId()),
    render(view) {
      const d = MF.get();
      const b = MF.branchId();
      const q = pos.q.toLowerCase();
      const items = d.products.filter((p) => (!q || (p.name + ' ' + p.color + ' ' + p.sku).toLowerCase().includes(q)) && (!pos.cat || p.category === pos.cat));
      const count = pos.cart.reduce((s, l) => s + l.qty, 0);
      view.innerHTML = `<div class="pos">
        <div>
          <div class="toolbar"><div class="search">${MF.icon('search', 'sm')}<input id="posq" placeholder="Buscar prenda por nombre, color o código…" value="${esc(pos.q)}" autocomplete="off"></div></div>
          <div class="chips-row"><button class="fchip ${!pos.cat ? 'on' : ''}" data-cat="">Todo</button>${d.categories.map((c) => `<button class="fchip ${pos.cat === c ? 'on' : ''}" data-cat="${c}">${c}</button>`).join('')}</div>
          <div class="pos-grid">${items.map((p) => {
            const s = MF.stock(p, b) - inCart(p.id);
            const pr = MF.promoFor(p);
            return `<button class="pos-item ${s <= 0 ? 'out' : ''}" data-add="${p.id}" ${s <= 0 ? 'aria-disabled="true"' : ''}>
              <div class="pic">${MF.photo(p)}${pr ? `<span class="badge pink promo">-${pr.percent}%</span>` : ''}</div>
              <div class="t"><b>${esc(p.name)}</b><span>${money(MF.price(p))}<em>${s > 0 ? s + ' disp.' : 'Agotado'}</em></span></div></button>`;
          }).join('') || '<div class="empty">Sin resultados</div>'}</div>
        </div>
        <aside class="panel cart ${pos.open ? 'open' : ''}" id="cart">${cartHTML()}</aside>
      </div>
      <button class="btn grad lg cart-fab" id="cartFab"><span>${MF.icon('cart', 'sm')} Ver carrito (${count})</span><b>${money(subtotal() - discountBs())}</b></button>`;
      bindPos(view);
    }
  });

  function cartHTML() {
    const d = MF.get();
    const sub = subtotal();
    const disc = discountBs();
    const total = sub - disc;
    const change = pos.method === 'efectivo' && +pos.received ? +pos.received - total : null;
    return `<div class="panel-head"><h3>${MF.icon('cart', 'sm')} Venta actual</h3>${pos.cart.length ? '<button class="link-btn" id="clearCart">Vaciar</button>' : ''}<button class="icon-btn menu-btn" id="closeCart" aria-label="Cerrar carrito">${MF.icon('x', 'sm')}</button></div>
      <div class="cart-lines">${pos.cart.map((l, i) => { const p = MF.product(l.productId) || l;
        return `<div class="cl">${MF.photo(p, 'thumb')}<div><b>${esc(l.name)}</b><small>Talla ${esc(l.size)}${l.color !== p.color ? ' · ' + esc(l.color) : ''} · ${money(l.price)}</small></div>
        <div class="cl-right"><b>${money(l.price * l.qty)}</b><div class="qty"><button data-dec="${i}" aria-label="Menos">${MF.icon('minus', 'sm')}</button><span>${l.qty}</span><button data-inc="${i}" aria-label="Más">${MF.icon('plus', 'sm')}</button></div></div></div>`; }).join('') ||
        `<div class="empty">${MF.icon('shirt')}<p>Toque una prenda para agregarla</p></div>`}</div>
      <div class="totals">
        <div class="row"><span>Subtotal</span><b>${money(sub)}</b></div>
        <div class="row"><span>Descuento</span><div class="disc"><input id="disc" type="number" min="0" value="${pos.discount || ''}" placeholder="0"><select id="discType"><option value="bs" ${pos.discType === 'bs' ? 'selected' : ''}>Bs</option><option value="%" ${pos.discType === '%' ? 'selected' : ''}>%</option></select></div></div>
        ${disc ? `<div class="row muted"><span></span><span>− ${money(disc)}</span></div>` : ''}
        <div class="row grand"><span>Total</span><span>${money(total)}</span></div>
      </div>
      <div style="margin-top:10px">${MF.can('clientes')
        ? `<label>Cliente <select id="cust"><option value="">Cliente ocasional</option>${d.customers.map((c) => `<option value="${c.id}" ${pos.customerId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>`
        : `<div class="muted" style="font-size:.82rem;display:flex;gap:6px;align-items:center">Asignar cliente ${D.lockPill('clientes')}</div>`}</div>
      <div class="pay-methods"><button data-m="efectivo" class="${pos.method === 'efectivo' ? 'on' : ''}">${MF.icon('wallet', 'sm')} Efectivo</button><button data-m="qr" class="${pos.method === 'qr' ? 'on' : ''}">${MF.icon('qr', 'sm')} QR</button></div>
      ${pos.method === 'efectivo'
        ? `<div class="totals" style="border:0;padding:0;margin-bottom:10px"><div class="row"><span>Recibido (Bs)</span><input id="recv" type="number" min="0" value="${pos.received}" style="width:120px;text-align:right;padding:7px 9px"></div>${change != null ? `<div class="row"><span>Cambio</span><b style="color:${change < 0 ? 'var(--red)' : 'var(--mint)'}">${change < 0 ? 'Falta ' + money(-change) : money(change)}</b></div>` : ''}</div>`
        : `<label class="switch" style="margin-bottom:10px;font-size:.86rem"><input type="checkbox" id="qrOk" ${pos.qrOk ? 'checked' : ''}><span></span> Verifiqué el pago en mi app bancaria</label>`}
      <button class="btn grad block lg" id="confirmSale" ${!pos.cart.length ? 'disabled' : ''}>${MF.icon('check', 'sm')} Confirmar venta · ${money(total)}</button>`;
  }

  function bindPos(view) {
    const q = view.querySelector('#posq');
    q.addEventListener('input', () => { pos.q = q.value; const p = q.selectionStart; D.rerender(); const n = $('#posq'); n.focus(); n.setSelectionRange(p, p); });
    view.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => { pos.cat = b.dataset.cat; D.rerender(); }));
    view.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => { if (b.classList.contains('out')) return MF.toast('Sin stock en esta sucursal', 'error'); pickSize(MF.product(b.dataset.add)); }));
    $('#cartFab').addEventListener('click', () => { pos.open = true; $('#cart').classList.add('open'); });
    bindCart();
  }
  function redrawCart() {
    $('#cart').innerHTML = cartHTML();
    const fab = $('#cartFab');
    if (fab) fab.innerHTML = `<span>${MF.icon('cart', 'sm')} Ver carrito (${pos.cart.reduce((s, l) => s + l.qty, 0)})</span><b>${money(subtotal() - discountBs())}</b>`;
    bindCart();
  }
  function bindCart() {
    const c = $('#cart');
    const on = (sel, ev, fn) => { const el = c.querySelector(sel); if (el) el.addEventListener(ev, fn); };
    on('#closeCart', 'click', () => { pos.open = false; c.classList.remove('open'); });
    on('#clearCart', 'click', () => { pos.cart = []; pos.discount = 0; D.rerender(); });
    c.querySelectorAll('[data-inc]').forEach((b) => b.addEventListener('click', () => {
      const l = pos.cart[b.dataset.inc];
      const v = MF.product(l.productId).variants.find((x) => x.size === l.size && x.color === l.color);
      if (l.qty >= (v.stock[MF.branchId()] || 0)) return MF.toast('No hay más unidades de esa talla', 'error');
      l.qty++; D.rerender();
    }));
    c.querySelectorAll('[data-dec]').forEach((b) => b.addEventListener('click', () => {
      const l = pos.cart[b.dataset.dec];
      if (--l.qty <= 0) pos.cart.splice(b.dataset.dec, 1);
      D.rerender();
    }));
    on('#disc', 'change', (e) => { pos.discount = e.target.value; redrawCart(); });
    on('#discType', 'change', (e) => { pos.discType = e.target.value; redrawCart(); });
    on('#cust', 'change', (e) => { pos.customerId = e.target.value; });
    on('#recv', 'change', (e) => { pos.received = e.target.value; redrawCart(); });
    on('#qrOk', 'change', (e) => { pos.qrOk = e.target.checked; });
    c.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => { pos.method = b.dataset.m; redrawCart(); }));
    on('#confirmSale', 'click', confirmSale);
  }

  function pickSize(p) {
    const b = MF.branchId();
    const avail = p.variants.map((v) => ({ v, n: (v.stock[b] || 0) - inCart(p.id, v.size, v.color) }));
    const add = (v) => {
      const line = pos.cart.find((l) => l.productId === p.id && l.size === v.size && l.color === v.color);
      if (line) line.qty++;
      else pos.cart.push({ productId: p.id, name: p.name, size: v.size, color: v.color, qty: 1, price: MF.price(p), cost: p.cost });
      MF.toast(`${p.name} (${v.size}) agregado`);
      D.rerender();
    };
    const ok = avail.filter((a) => a.n > 0);
    if (ok.length === 1 && p.variants.length === 1) return add(ok[0].v);
    const m = MF.modal({
      title: esc(p.name), size: 'sm', noFocus: true,
      body: `<div style="display:flex;gap:14px;align-items:center;margin-bottom:14px">${MF.photo(p, 'thumb')}<div><b>${money(MF.price(p))}</b><br><small class="muted">Elija la talla</small></div></div>
        <div class="size-pick">${avail.map((a, i) => `<button data-v="${i}" ${a.n <= 0 ? 'disabled' : ''}>${esc(a.v.size)}${new Set(p.variants.map((x) => x.color)).size > 1 ? `<small>${esc(a.v.color)}</small>` : ''}<small>${a.n > 0 ? a.n + ' disp.' : 'Agotado'}</small></button>`).join('')}</div>`
    });
    m.el.querySelectorAll('[data-v]').forEach((btn) => btn.addEventListener('click', () => { add(avail[btn.dataset.v].v); m.close(); }));
  }

  function confirmSale() {
    const total = subtotal() - discountBs();
    if (pos.method === 'efectivo' && pos.received && +pos.received < total) return MF.toast('El monto recibido es menor al total', 'error');
    if (pos.method === 'qr' && !pos.qrOk) return MF.toast('Marque que verificó el pago QR en su app bancaria', 'error');
    const r = MF.createSale({ items: pos.cart, discount: discountBs(), method: pos.method, customerId: pos.customerId || null, received: pos.method === 'efectivo' ? +pos.received || null : null });
    if (r.error) return MF.toast(r.error, 'error');
    Object.assign(pos, { cart: [], discount: 0, received: '', qrOk: false, customerId: '', open: false });
    D.rerender();
    showReceipt(r.sale, true);
  }

  // ---------- Comprobante ----------
  function receiptHTML(s) {
    const d = MF.get();
    const c = s.customerId ? d.customers.find((x) => x.id === s.customerId) : null;
    return `<div class="receipt" id="rcpt"><div class="c"><img src="assets/logos/mio-logo.png" alt=""><b>${esc(MF_CONFIG.store.name)}</b><br>${esc(MF.branchName(s.branchId))}<br><small>Comprobante de venta (demostración, sin valor fiscal)</small></div><hr>
      <div class="r"><span>Venta #${s.number}</span><span>${MF.fdate(s.date, true)}</span></div>
      <div class="r"><span>Atendió</span><span>${esc(MF.userName(s.userId))}</span></div>
      ${c || s.customerName ? `<div class="r"><span>Cliente</span><span>${esc(c ? c.name : s.customerName)}</span></div>` : ''}<hr>
      ${s.items.map((i) => `<div>${esc(i.name)} (${esc(i.size)})</div><div class="r"><span>${i.qty} × ${money(i.price)}</span><span>${money(i.qty * i.price)}</span></div>`).join('')}<hr>
      <div class="r"><span>Subtotal</span><span>${money(s.subtotal)}</span></div>
      ${s.discount ? `<div class="r"><span>Descuento</span><span>− ${money(s.discount)}</span></div>` : ''}
      <div class="r big"><span>TOTAL</span><span>${money(s.total)}</span></div>
      <div class="r"><span>Pago</span><span>${s.method === 'qr' ? 'QR' : 'Efectivo'}</span></div>
      ${s.received ? `<div class="r"><span>Recibido / cambio</span><span>${money(s.received)} / ${money(s.received - s.total)}</span></div>` : ''}
      ${s.status !== 'completada' ? `<div class="c" style="margin-top:8px"><b>${s.status === 'devuelta' ? 'DEVUELTA' : 'ANULADA'}</b></div>` : ''}
      <hr><div class="c">¡Gracias por tu compra!<br>${esc(MF_CONFIG.store.slogan)}</div></div>`;
  }
  function showReceipt(s, fresh) {
    const text = `${MF_CONFIG.store.name} · Venta #${s.number}\n` + s.items.map((i) => `- ${i.name} (${i.size}) x${i.qty}: Bs ${i.price * i.qty}`).join('\n') + `\nTotal: Bs ${s.total}\n¡Gracias por tu compra!`;
    const m = MF.modal({
      title: fresh ? `${MF.icon('checkCircle', 'sm')} Venta registrada` : `Venta #${s.number}`, size: 'sm', noFocus: true,
      body: (fresh ? `<p class="muted" style="text-align:center;font-size:.86rem">El inventario de ${esc(MF.branchName(s.branchId))} ya se actualizó.</p>` : '') + receiptHTML(s),
      footer: `<a class="btn ghost" href="${MF.waLink('', text)}" target="_blank" rel="noopener">${MF.icon('whatsapp', 'sm')} Enviar</a><button class="btn ghost" id="prt">${MF.icon('printer', 'sm')} Imprimir</button><button class="btn primary" data-close>${fresh ? 'Nueva venta' : 'Cerrar'}</button>`
    });
    m.el.querySelector('#prt').addEventListener('click', () => {
      const w = window.open('', '_blank', 'width=420,height=640');
      if (!w) return MF.toast('Permita las ventanas emergentes para imprimir', 'error');
      w.document.write(`<html><head><title>Venta #${s.number}</title><base href="${location.href}"><link rel="stylesheet" href="css/styles.css"><link rel="stylesheet" href="css/dashboard.css"></head><body style="background:#fff;padding:16px">${receiptHTML(s)}<script>setTimeout(()=>print(),400)<\/script></body></html>`);
      w.document.close();
    });
  }
  MF.showReceipt = showReceipt;

  // ---------- Historial ----------
  D.register({
    id: 'ventas', label: 'Ventas', icon: 'receipt', group: 'Principal',
    sub: () => (MF.can('historialCompleto') ? 'Historial completo' : 'Historial de los últimos 30 días'),
    render(view) {
      const d = MF.get();
      if (hist.period === 'all' && !MF.can('historialCompleto')) hist.period = '30';
      const from = hist.period === 'all' ? 0 : hist.period === 'today' ? new Date().setHours(0, 0, 0, 0) : Date.now() - (+hist.period) * 864e5;
      const q = hist.q.toLowerCase();
      const list = MF.visibleSales().filter((s) => new Date(s.date).getTime() >= from && (!hist.method || s.method === hist.method) && (!hist.channel || s.channel === hist.channel) &&
        (!MF.can('sucursales') || s.branchId === MF.branchId()) &&
        (!q || String(s.number).includes(q) || s.items.some((i) => i.name.toLowerCase().includes(q)))).slice().reverse();
      const ok = list.filter((s) => s.status === 'completada');
      const total = ok.reduce((a, s) => a + s.total, 0);
      view.innerHTML = `
        <div class="kpis">
          <div class="kpi"><div class="k-ic">${MF.icon('coins')}</div><small>Total vendido</small><b>${money(total)}</b><em>${ok.length} ventas</em></div>
          <div class="kpi pink"><div class="k-ic">${MF.icon('receipt')}</div><small>Ticket promedio</small><b>${money(ok.length ? total / ok.length : 0)}</b></div>
          <div class="kpi mint"><div class="k-ic">${MF.icon('wallet')}</div><small>Efectivo</small><b>${money(ok.filter((s) => s.method === 'efectivo').reduce((a, s) => a + s.total, 0))}</b></div>
          <div class="kpi amber"><div class="k-ic">${MF.icon('qr')}</div><small>QR</small><b>${money(ok.filter((s) => s.method === 'qr').reduce((a, s) => a + s.total, 0))}</b></div>
        </div>
        <div class="toolbar">
          <div class="search">${MF.icon('search', 'sm')}<input id="hq" placeholder="Buscar por número o prenda…" value="${esc(hist.q)}"></div>
          <select id="hp"><option value="today" ${hist.period === 'today' ? 'selected' : ''}>Hoy</option><option value="7" ${hist.period === '7' ? 'selected' : ''}>Últimos 7 días</option><option value="30" ${hist.period === '30' ? 'selected' : ''}>Últimos 30 días</option>${MF.can('historialCompleto') ? `<option value="all" ${hist.period === 'all' ? 'selected' : ''}>Todo el historial</option>` : ''}</select>
          <select id="hm"><option value="">Todo método</option><option value="efectivo" ${hist.method === 'efectivo' ? 'selected' : ''}>Efectivo</option><option value="qr" ${hist.method === 'qr' ? 'selected' : ''}>QR</option></select>
          <select id="hc"><option value="">Tienda y online</option><option value="tienda" ${hist.channel === 'tienda' ? 'selected' : ''}>En tienda</option><option value="online" ${hist.channel === 'online' ? 'selected' : ''}>Pedidos online</option></select>
          ${MF.can('exportar') ? `<button class="btn ghost sm" id="hexp">${MF.icon('download', 'sm')} Excel</button>` : `<button class="btn ghost sm" data-lock="exportar">${MF.icon('lock', 'sm')} Excel · Pro</button>`}
        </div>
        ${MF.can('historialCompleto') ? '' : `<div class="alert-strip info">${MF.icon('info', 'sm')}<span>El plan Básico conserva el historial visible de los últimos 30 días.</span>${D.lockPill('historialCompleto')}</div>`}
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Fecha</th><th>Prendas</th><th>Atendió</th><th>Canal</th><th>Pago</th><th class="num">Total</th><th>Estado</th><th></th></tr></thead><tbody>
          ${list.slice(0, 120).map((s) => `<tr><td><b>${s.number}</b></td><td>${MF.fdate(s.date, true)}</td><td>${esc(s.items.map((i) => `${i.name} (${i.size})${i.qty > 1 ? ' ×' + i.qty : ''}`).join(', '))}</td>
            <td>${esc(MF.userName(s.userId))}</td><td><span class="badge ${s.channel === 'online' ? 'pink' : 'neutral'}">${s.channel === 'online' ? 'Online' : 'Tienda'}</span></td>
            <td>${s.method === 'qr' ? 'QR' : 'Efectivo'}</td><td class="num"><b>${money(s.total)}</b>${s.discount ? `<br><small class="muted">desc. ${money(s.discount)}</small>` : ''}</td>
            <td><span class="badge ${s.status === 'completada' ? 'ok' : s.status === 'devuelta' ? 'warn' : 'bad'}">${s.status === 'completada' ? 'Completada' : s.status === 'devuelta' ? 'Devuelta' : 'Anulada'}</span></td>
            <td><div class="row-actions"><button class="icon-btn" data-rc="${s.id}" aria-label="Ver comprobante">${MF.icon('eye', 'sm')}</button>
              ${s.status === 'completada' && s.channel === 'tienda' ? (MF.can('devoluciones') ? `<button class="icon-btn" data-ret="${s.id}" aria-label="Registrar devolución" title="Cambio o devolución">${MF.icon('undo', 'sm')}</button>` : `<button class="icon-btn" data-lock="devoluciones" aria-label="Devoluciones: plan Pro" title="Cambios y devoluciones: plan Pro">${MF.icon('lock', 'sm')}</button>`) : ''}</div></td></tr>`).join('') || '<tr><td colspan="9" class="empty">Sin ventas en este período</td></tr>'}
        </tbody></table></div>`;
      const hq = view.querySelector('#hq');
      hq.addEventListener('input', () => { hist.q = hq.value; const p = hq.selectionStart; D.rerender(); const n = $('#hq'); n.focus(); n.setSelectionRange(p, p); });
      view.querySelector('#hp').addEventListener('change', (e) => { hist.period = e.target.value; D.rerender(); });
      view.querySelector('#hm').addEventListener('change', (e) => { hist.method = e.target.value; D.rerender(); });
      view.querySelector('#hc').addEventListener('change', (e) => { hist.channel = e.target.value; D.rerender(); });
      view.querySelectorAll('[data-rc]').forEach((b) => b.addEventListener('click', () => showReceipt(d.sales.find((s) => s.id === b.dataset.rc))));
      view.querySelectorAll('[data-ret]').forEach((b) => b.addEventListener('click', () => returnDialog(d.sales.find((s) => s.id === b.dataset.ret))));
      const ex = view.querySelector('#hexp');
      if (ex) ex.addEventListener('click', () => {
        const rows = [['Número', 'Fecha', 'Prendas', 'Atendió', 'Sucursal', 'Canal', 'Pago', 'Subtotal', 'Descuento', 'Total', 'Estado']];
        list.forEach((s) => rows.push([s.number, MF.fdate(s.date, true), s.items.map((i) => `${i.name} (${i.size}) x${i.qty}`).join(' | '), MF.userName(s.userId), MF.branchName(s.branchId), s.channel, s.method, s.subtotal, s.discount, s.total, s.status]));
        MF.downloadCSV('ventas-mioshop.csv', rows);
        MF.toast('Archivo descargado (se abre con Excel)');
      });
    }
  });

  function returnDialog(s) {
    const m = MF.modal({
      title: `Cambio o devolución · venta #${s.number}`, size: 'sm',
      body: `<p>Las prendas vuelven al inventario de ${esc(MF.branchName(s.branchId))} y la venta queda marcada como devuelta.</p>
        <ul class="list">${s.items.map((i) => `<li><div class="grow"><b>${esc(i.name)}</b><small>Talla ${esc(i.size)} × ${i.qty}</small></div><b>${money(i.price * i.qty)}</b></li>`).join('')}</ul>
        <label style="margin-top:10px">Motivo <select id="rr"><option>Cambio de talla</option><option>Cambio de modelo</option><option>Prenda con falla</option><option>Devolución de dinero</option></select></label>`,
      footer: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="doRet">${MF.icon('undo', 'sm')} Registrar devolución</button>`
    });
    m.el.querySelector('#doRet').addEventListener('click', () => {
      MF.returnSale(s.id, m.el.querySelector('#rr').value);
      m.close(); MF.toast('Devolución registrada y stock repuesto'); D.rerender();
    });
  }
})();
