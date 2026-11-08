/*
 * Pedidos del catálogo online y configuración del catálogo.
 * Los pedidos abiertos solo RESERVAN stock; al confirmar el pago se crea la venta y se descuenta.
 */
(function () {
  const MF = window.MF;
  const D = MF.demo;
  const { esc, money } = MF;
  const st = { tab: 'abiertos' };
  const FLOW = ['pendiente', 'esperando_pago', 'confirmado', 'preparando', 'entregado'];
  const BADGE = { pendiente: 'warn', esperando_pago: 'info', confirmado: 'violet', preparando: 'pink', entregado: 'ok', cancelado: 'bad' };

  function doStatus(o, status) {
    const r = MF.setOrderStatus(o.id, status);
    if (r.error) return MF.toast(r.error, 'error');
    MF.toast(status === 'confirmado' ? `Pedido #${o.number} confirmado: venta registrada y stock descontado` : status === 'cancelado' ? `Pedido #${o.number} cancelado${o.saleId ? ' y stock repuesto' : ''}` : `Pedido #${o.number}: ${MF.ORDER_STATES[status]}`);
    D.rerender();
  }

  D.register({
    id: 'pedidos', label: 'Pedidos online', short: 'Pedidos', icon: 'package', feature: 'pedidos',
    pitch: 'Reciba pedidos desde su catálogo online por WhatsApp o pago QR. El stock se reserva y se descuenta al confirmar el pago.',
    pitchList: ['Pedidos por WhatsApp con el resumen armado', 'Pago con su QR bancario estático', 'Stock reservado hasta confirmar', 'Confirmación manual del pago', 'Seguimiento: preparando y entregado', 'Comprobantes adjuntos'],
    sub: () => 'Pedidos recibidos desde el catálogo online',
    render(view) {
      const d = MF.get();
      const tabs = [['abiertos', 'Por atender'], ['todos', 'Todos'], ...Object.entries(MF.ORDER_STATES)];
      const match = (o) => st.tab === 'todos' || (st.tab === 'abiertos' ? !['entregado', 'cancelado'].includes(o.status) : o.status === st.tab);
      const list = d.orders.filter(match);
      const full = MF.can('pedidos');
      view.innerHTML = `
        <div class="alert-strip info">${MF.icon('info', 'sm')}<span>Los pedidos <b>pendientes</b> y <b>esperando pago</b> solo reservan stock. Al confirmar el pago se registra la venta y el inventario se descuenta; si se cancela un pedido confirmado, el stock se repone.</span></div>
        <div class="order-tabs">${tabs.map(([k, l]) => `<button class="fchip ${st.tab === k ? 'on' : ''}" data-tab="${k}">${l}<span>${d.orders.filter((o) => k === 'todos' || (k === 'abiertos' ? !['entregado', 'cancelado'].includes(o.status) : o.status === k)).length}</span></button>`).join('')}</div>
        ${full ? '' : `<div style="margin-bottom:14px">${D.lockMini('pedidos', 'Seguimiento completo (preparando, entregado) y registro de comprobantes')}</div>`}
        <div class="orders">${list.map((o) => orderCard(o, full)).join('') || `<div class="panel empty">${MF.icon('package')}<p>No hay pedidos en esta vista.</p><a class="btn ghost sm" href="catalogo.html" target="_blank">Hacer un pedido de prueba en el catálogo</a></div>`}</div>`;
      view.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { st.tab = b.dataset.tab; D.rerender(); }));
      view.querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', async () => {
        const o = d.orders.find((x) => x.id === b.dataset.id);
        if (b.dataset.st === 'cancelado' && !(await MF.confirmDialog(`¿Cancelar el pedido #${o.number}?${o.saleId ? ' La venta se anulará y el stock volverá al inventario.' : ' Se liberará el stock reservado.'}`, 'Cancelar pedido', true))) return;
        if (b.dataset.st === 'confirmado' && o.method === 'qr' && !(await MF.confirmDialog(`Confirme solo si ya verificó en su app bancaria que recibió <b>${money(o.total)}</b>. El sistema no consulta al banco.`, 'Pago verificado, confirmar'))) return;
        doStatus(o, b.dataset.st);
      }));
      view.querySelectorAll('[data-detail]').forEach((b) => b.addEventListener('click', () => detail(d.orders.find((x) => x.id === b.dataset.detail))));
      view.querySelectorAll('[data-rcpt]').forEach((b) => b.addEventListener('click', () => showReceiptImage(d.orders.find((x) => x.id === b.dataset.rcpt))));
    }
  });

  function orderCard(o, full) {
    const idx = FLOW.indexOf(o.status);
    const actions = [];
    if (MF.OPEN_ORDER.includes(o.status)) actions.push(`<button class="btn primary sm" data-st="confirmado" data-id="${o.id}">${MF.icon('check', 'sm')} Confirmar pago</button>`);
    if (o.status === 'pendiente' && full) actions.push(`<button class="btn ghost sm" data-st="esperando_pago" data-id="${o.id}">Esperando pago</button>`);
    if (o.status === 'confirmado') actions.push(full ? `<button class="btn primary sm" data-st="preparando" data-id="${o.id}">${MF.icon('package', 'sm')} Preparando</button>` : D.lockPill('pedidos'));
    if (o.status === 'preparando') actions.push(`<button class="btn primary sm" data-st="entregado" data-id="${o.id}">${MF.icon('truck', 'sm')} Entregado</button>`);
    if (!['entregado', 'cancelado'].includes(o.status)) actions.push(`<button class="btn ghost sm" data-st="cancelado" data-id="${o.id}">Cancelar</button>`);
    const receipt = o.receipt ? (MF.can('comprobantes') ? `<button class="receipt-thumb" data-rcpt="${o.id}" title="Ver comprobante">${o.receipt === 'demo' ? 'Comprobante<br>(demo)' : `<img src="${o.receipt}" alt="Comprobante" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`}</button>` : `<span class="badge info" data-lock="comprobantes" style="cursor:pointer">${MF.icon('paperclip', 'sm')} Comprobante adjunto · ver desde Pro</span>`) : '';
    return `<article class="order">
      <div>
        <div class="order-head"><b>Pedido #${o.number}</b><span class="badge ${BADGE[o.status]}">${MF.ORDER_STATES[o.status]}</span><span class="badge neutral">${o.method === 'qr' ? MF.icon('qr', 'sm') + ' Pago QR' : MF.icon('whatsapp', 'sm') + ' WhatsApp'}</span>${o.saleId ? '<span class="badge ok">Venta registrada</span>' : MF.OPEN_ORDER.includes(o.status) ? '<span class="badge warn">Stock reservado</span>' : ''}</div>
        <div class="order-meta"><span>${MF.icon('user', 'sm')} ${esc(o.customer.name)}</span><span>${MF.icon('phone', 'sm')} ${esc(o.customer.phone || '—')}</span><span>${MF.icon('clock', 'sm')} ${MF.frel(o.date)}</span></div>
        <div class="order-items">${o.items.map((i) => { const p = MF.product(i.productId) || { name: i.name, category: '', colorHex: '#ddd' }; return `<span class="oi">${MF.photo(p, 'thumb')}${esc(i.name)} · ${esc(i.size)} ×${i.qty}</span>`; }).join('')}</div>
        ${o.notes ? `<p class="muted" style="font-size:.82rem;margin:8px 0 0">${MF.icon('note', 'sm')} ${esc(o.notes)}</p>` : ''}
        <div class="steps-line ${o.status === 'cancelado' ? 'cancel' : ''}">${FLOW.map((s, i) => `<i class="${o.status === 'cancelado' || i <= idx ? 'on' : ''}" title="${MF.ORDER_STATES[s]}"></i>`).join('')}</div>
      </div>
      <div class="order-side"><span class="total">${money(o.total)}</span>${receipt}<div class="actions">${actions.join('')}</div><button class="link-btn" data-detail="${o.id}">Detalle ${MF.icon('chevronRight', 'sm')}</button></div>
    </article>`;
  }

  function showReceiptImage(o) {
    MF.modal({
      title: `Comprobante del pedido #${o.number}`, size: 'sm', noFocus: true,
      body: o.receipt === 'demo'
        ? `<div class="receipt" style="text-align:center"><b>Comprobante de transferencia</b><br><small>(imagen de demostración)</small><hr><div class="r"><span>Monto</span><b>${money(o.total)}</b></div><div class="r"><span>Destino</span><span>${esc(MF_CONFIG.store.name)}</span></div><div class="r"><span>Archivo</span><span>${esc(o.receiptName || '')}</span></div></div>`
        : `<img src="${o.receipt}" alt="Comprobante" style="border-radius:12px;margin:0 auto">`,
      footer: `<p class="muted" style="font-size:.8rem;margin:0 auto 0 0">Verifique el ingreso en su app bancaria antes de confirmar.</p><button class="btn primary" data-close>Cerrar</button>`
    });
  }

  function detail(o) {
    const text = `Hola ${o.customer.name}, te escribimos de ${MF_CONFIG.store.name} sobre tu pedido #${o.number} (${money(o.total)}). Estado: ${MF.ORDER_STATES[o.status]}.`;
    const m = MF.modal({
      title: `Pedido #${o.number}`, size: 'lg', noFocus: true,
      body: `<div class="grid g2">
        <div><h4>Productos</h4><ul class="list">${o.items.map((i) => { const p = MF.product(i.productId); const av = p ? MF.available(p, p.variants.find((v) => v.size === i.size && v.color === i.color)) : 0;
          return `<li>${p ? MF.photo(p, 'thumb') : ''}<div class="grow"><b>${esc(i.name)}</b><small>Talla ${esc(i.size)} · ${esc(i.color)} × ${i.qty}${MF.OPEN_ORDER.includes(o.status) && p ? ` · stock libre después de reservas: ${av}` : ''}</small></div><b>${money(i.price * i.qty)}</b></li>`; }).join('')}
          <li><div class="grow"><b>Total</b></div><b>${money(o.total)}</b></li></ul>
          <p class="muted" style="font-size:.84rem">Cliente: ${esc(o.customer.name)} · ${esc(o.customer.phone || 'sin teléfono')}${o.customer.address ? '<br>Entrega: ' + esc(o.customer.address) : ''}</p></div>
        <div><h4>Historial</h4><ul class="list">${o.history.map((h) => `<li><span class="ic">${MF.icon('clock', 'sm')}</span><div class="grow"><b>${MF.ORDER_STATES[h.status]}</b><small>${MF.fdate(h.date, true)}</small></div></li>`).join('')}</ul>
          ${MF.can('comprobantes') && !['cancelado', 'entregado'].includes(o.status) ? `<label class="btn ghost sm" style="display:inline-flex;width:auto;margin-top:10px">${MF.icon('paperclip', 'sm')} ${o.receipt ? 'Reemplazar' : 'Registrar'} comprobante<input type="file" accept="image/*" id="rcIn" hidden></label>` : ''}</div></div>`,
      footer: `<a class="btn wa" href="${MF.waLink('', text)}" target="_blank" rel="noopener">${MF.icon('whatsapp', 'sm')} Escribir al cliente</a><button class="btn primary" data-close>Cerrar</button>`
    });
    const rc = m.el.querySelector('#rcIn');
    if (rc) rc.addEventListener('change', async () => {
      try { o.receipt = await MF.readImage(rc.files[0], 700, 0.75); o.receiptName = rc.files[0].name; MF.audit('pedido', `Registró comprobante del pedido #${o.number}`); MF.save(); m.close(); MF.toast('Comprobante registrado'); D.rerender(); }
      catch (e) { MF.toast('No se pudo leer la imagen', 'error'); }
    });
  }

  // ---------- Catálogo online (configuración) ----------
  D.register({
    id: 'catalogo', label: 'Catálogo online', short: 'Catálogo', icon: 'store', feature: 'catalogo',
    pitch: 'Publique sus prendas en un catálogo con su logo: sus clientas eligen talla, arman el carrito y le piden por WhatsApp o pagan con QR.',
    pitchList: ['Enlace público para compartir', 'Logo y banner de su tienda', 'Buscador, categorías y filtros', 'Carrito de compras', 'Pedidos por WhatsApp y QR', 'Disponibilidad sincronizada con el inventario'],
    sub: () => 'Lo que ven sus clientas en internet',
    render(view) {
      const d = MF.get();
      const s = d.settings;
      const url = new URL('catalogo.html', location.href).href;
      const pub = d.products.filter((p) => p.published && MF.isActive(p)).length;
      view.innerHTML = `${MF.catalogActive() ? `<div class="alert-strip info">${MF.icon('info', 'sm')}<span>El catálogo usa el mismo inventario: si vende una prenda en la tienda, su disponibilidad online se actualiza sola.</span></div>` : `<div class="alert-strip">${MF.icon('lock', 'sm')}<span><b>Catálogo desactivado:</b> la prueba gratuita terminó. Elija un plan Pro o Premium para volver a publicarlo.</span><button class="btn grad sm" data-try="pro">Probar Pro</button></div>`}
        <div class="panel" style="margin-bottom:16px"><div class="panel-head"><h3>${MF.icon('link', 'sm')} Enlace de su catálogo</h3><span class="badge ok">${pub} productos publicados</span></div>
          <div class="toolbar" style="margin:0"><input value="${esc(MF.can('dominio') ? 'https://' + s.domain : url)}" readonly id="catUrl" style="flex:1;min-width:220px">
          <button class="btn ghost sm" id="copyUrl">${MF.icon('copy', 'sm')} Copiar</button><a class="btn primary sm" href="catalogo.html" target="_blank">${MF.icon('external', 'sm')} Abrir catálogo</a>
          <a class="btn wa sm" target="_blank" rel="noopener" href="${MF.waLink('', `¡Mira nuestro catálogo de ${MF_CONFIG.store.name}! ${url}`)}">${MF.icon('whatsapp', 'sm')} Compartir</a></div>
          ${MF.can('dominio') ? '<p class="muted" style="font-size:.8rem;margin:8px 0 0">Dominio propio de ejemplo; su activación real está sujeta a configuración.</p>' : ''}</div>
        <div class="settings-grid">
          <div class="panel"><div class="panel-head"><h3>${MF.icon('whatsapp', 'sm')} Pedidos por WhatsApp</h3></div>
            <label>Número de WhatsApp de la tienda <input id="waNum" inputmode="numeric" placeholder="Ej. 591 7xxxxxxx (de demostración)" value="${esc(s.whatsapp)}"></label>
            <p class="muted" style="font-size:.8rem">Solo dígitos con código de país. Si lo deja vacío, WhatsApp pedirá elegir el contacto al enviar el pedido (no se usa ningún número inventado).</p>
            <label>Texto de entrega <textarea id="deliv" rows="2">${esc(s.delivery)}</textarea></label>
            <label class="switch" style="margin-top:10px"><input type="checkbox" id="showStock" ${s.showStock ? 'checked' : ''}><span></span> Mostrar disponibilidad en el catálogo</label>
            <div class="actions" style="margin-top:12px"><button class="btn primary sm" id="saveWa">Guardar</button></div></div>
          <div class="panel"><div class="panel-head"><h3>${MF.icon('qr', 'sm')} QR bancario estático</h3></div>
            <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><div class="qr-prev">${s.qrImage ? `<img src="${s.qrImage}" alt="QR de la tienda">` : MF.demoQR()}</div>
            <div style="flex:1;min-width:180px"><p style="font-size:.86rem">Suba la imagen del QR de cobro de su banco. El QR <b>no incluye el monto</b>: el catálogo muestra el total y la clienta lo escribe en su app bancaria.</p>
            <div class="actions start"><label class="btn ghost sm" style="display:inline-flex;width:auto">${MF.icon('upload', 'sm')} Subir QR<input type="file" accept="image/*" id="qrIn" hidden></label>${s.qrImage ? '<button class="btn ghost sm" id="qrRm">Usar QR de demostración</button>' : ''}</div></div></div>
            <label style="margin-top:12px">Texto bajo el QR <input id="bankLbl" value="${esc(s.bankLabel)}"></label>
            <div class="actions" style="margin-top:12px"><button class="btn primary sm" id="saveBank">Guardar</button></div></div>
          <div class="panel"><div class="panel-head"><h3>${MF.icon('star', 'sm')} Marca, destacados y promociones</h3>${MF.can('catalogoMarca') ? '' : D.lockPill('catalogoMarca')}</div>
            ${MF.can('catalogoMarca') ? brandingHTML(s) : D.lockMini('catalogoMarca', 'Logo, colores propios, productos destacados y promociones')}</div>
          <div class="panel"><div class="panel-head"><h3>${MF.icon('chart', 'sm')} Visitas del catálogo</h3>${MF.can('dominio') ? '<span class="sub">Últimos 30 días (datos de ejemplo)</span>' : D.lockPill('dominio')}</div>
            ${MF.can('dominio') ? `<div class="kpis" style="grid-template-columns:1fr 1fr"><div class="kpi"><small>Visitas</small><b>${MF.num(d.visits.reduce((a, v) => a + v.views, 0))}</b></div><div class="kpi pink"><small>Clics a WhatsApp</small><b>${d.visits.reduce((a, v) => a + v.whatsapp, 0)}</b></div></div>
              ${MF.charts.area(d.visits.map((v) => ({ label: v.date.slice(8) + '/' + v.date.slice(5, 7), value: v.views })), { fmt: (x) => x + ' visitas', every: 6 })}
              <label class="switch" style="margin-top:12px"><input type="checkbox" id="perBranch" ${s.catalogPerBranch ? 'checked' : ''}><span></span> Catálogos por sucursal (mostrar disponibilidad de cada sucursal)</label>` : D.lockMini('dominio', 'Estadísticas de visitas, dominio propio y catálogos por sucursal')}</div>
        </div>`;
      bindCatalog(view);
    }
  });

  function brandingHTML(s) {
    const d = MF.get();
    return `<div class="color-row"><label>Color principal <input type="color" id="cPri" value="${s.primary}"></label><label>Color secundario <input type="color" id="cAcc" value="${s.accent}"></label>
      <div style="display:flex;align-items:center;gap:8px"><img src="${MF_CONFIG.store.logo}" alt="" style="width:44px;height:44px;border-radius:50%"><small class="muted">Logo de la tienda</small></div></div>
      <h4 style="margin:16px 0 8px">Productos destacados</h4>
      <div class="chips-row">${d.products.filter((p) => p.published).map((p) => `<button class="fchip ${p.featured ? 'on' : ''}" data-feat="${p.id}">${esc(p.name)}</button>`).join('')}</div>
      <h4 style="margin:8px 0 8px">Promociones</h4>
      <ul class="list">${d.promotions.map((pr) => `<li><span class="ic">${MF.icon('percent', 'sm')}</span><div class="grow"><b>${esc(pr.name)} · ${pr.percent}%</b><small>${pr.category ? 'Categoría ' + esc(pr.category) : pr.productIds.length + ' productos'}</small></div><label class="switch"><input type="checkbox" data-promo="${pr.id}" ${pr.active ? 'checked' : ''}><span></span></label></li>`).join('')}</ul>
      <div class="actions" style="margin-top:10px"><button class="btn ghost sm" id="newPromo">${MF.icon('plus', 'sm')} Nueva promoción</button><button class="btn primary sm" id="saveBrand">Guardar colores</button></div>`;
  }

  function bindCatalog(view) {
    const d = MF.get();
    const s = d.settings;
    const on = (sel, ev, fn) => { const el = view.querySelector(sel); if (el) el.addEventListener(ev, fn); };
    on('#copyUrl', 'click', () => { const i = view.querySelector('#catUrl'); i.select(); (navigator.clipboard ? navigator.clipboard.writeText(i.value) : Promise.resolve(document.execCommand('copy'))).then(() => MF.toast('Enlace copiado')); });
    on('#saveWa', 'click', () => {
      s.whatsapp = view.querySelector('#waNum').value.replace(/\D/g, '');
      s.delivery = view.querySelector('#deliv').value;
      s.showStock = view.querySelector('#showStock').checked;
      MF.audit('configuracion', 'Actualizó la configuración de pedidos por WhatsApp');
      MF.save(); MF.toast('Configuración guardada'); D.rerender();
    });
    on('#qrIn', 'change', async (e) => { try { s.qrImage = await MF.readImage(e.target.files[0], 480, 0.85); MF.save(); MF.toast('QR actualizado'); D.rerender(); } catch (err) { MF.toast('No se pudo leer la imagen', 'error'); } });
    on('#qrRm', 'click', () => { s.qrImage = null; MF.save(); D.rerender(); });
    on('#saveBank', 'click', () => { s.bankLabel = view.querySelector('#bankLbl').value; MF.save(); MF.toast('Guardado'); });
    on('#saveBrand', 'click', () => { s.primary = view.querySelector('#cPri').value; s.accent = view.querySelector('#cAcc').value; MF.audit('configuracion', 'Cambió los colores del catálogo'); MF.save(); MF.toast('Colores guardados: véalos en el catálogo'); });
    on('#perBranch', 'change', (e) => { s.catalogPerBranch = e.target.checked; MF.save(); MF.toast('Preferencia guardada'); });
    view.querySelectorAll('[data-feat]').forEach((b) => b.addEventListener('click', () => { const p = MF.product(b.dataset.feat); p.featured = !p.featured; MF.save(); D.rerender(); }));
    view.querySelectorAll('[data-promo]').forEach((c) => c.addEventListener('change', () => { const pr = d.promotions.find((x) => x.id === c.dataset.promo); pr.active = c.checked; MF.audit('promocion', `${pr.active ? 'Activó' : 'Desactivó'} la promoción "${pr.name}"`); MF.save(); MF.toast(pr.active ? 'Promoción activa en catálogo y punto de venta' : 'Promoción desactivada'); }));
    on('#newPromo', 'click', () => {
      const m = MF.modal({
        title: 'Nueva promoción', size: 'sm',
        body: `<form id="prf" class="form-grid"><label class="full">Nombre <input name="name" required placeholder="Ej. Liquidación de invierno"></label>
          <label>Descuento (%) <input name="percent" type="number" min="1" max="90" value="10" required></label>
          <label>Aplicar a <select name="category">${d.categories.map((c) => `<option>${c}</option>`).join('')}</select></label></form>`,
        footer: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="savePr">Crear promoción</button>`
      });
      m.el.querySelector('#savePr').addEventListener('click', () => {
        const f = m.el.querySelector('#prf');
        if (!f.reportValidity()) return;
        d.promotions.push({ id: MF.uid('pr'), name: f.name.value, percent: Math.min(90, +f.percent.value), category: f.category.value, productIds: [], active: true });
        MF.audit('promocion', `Creó la promoción "${f.name.value}"`);
        MF.save(); m.close(); MF.toast('Promoción creada y activa'); D.rerender();
      });
    });
  }
})();
