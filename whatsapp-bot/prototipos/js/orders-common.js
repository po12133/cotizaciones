/* Lógica compartida de pedidos (Pedidos y Ventas): flujo de estados, notificaciones y detalle. */
(function (root) {
  const WAB = root.WAB;
  const { icon, ui, db, badge } = WAB;
  const { esc, fmt } = ui;

  function flowFor(o) {
    if (o.estado === 'cancelado') return ['nuevo', 'cancelado'];
    return ['nuevo', 'pago_revision', 'pagado', 'preparando', o.entrega.tipo === 'delivery' ? 'enviado' : 'listo_retiro', 'entregado'];
  }
  function nextState(o) {
    const fl = flowFor(o);
    const i = fl.indexOf(o.estado);
    if (o.estado === 'nuevo' || o.estado === 'pago_revision') return null; // requiere validar el pago
    return i >= 0 && i < fl.length - 1 ? fl[i + 1] : null;
  }
  const NOTIF = {
    pagado: (o) => `Confirmamos el pago de su pedido #${o.numero}. Ya lo estamos preparando.`,
    preparando: (o) => `Su pedido #${o.numero} está en preparación.`,
    enviado: (o) => `Su pedido #${o.numero} va en camino a ${o.entrega.direccion}. Llegará en aproximadamente 45 minutos.`,
    listo_retiro: (o) => `Su pedido #${o.numero} está listo para retirar en ${o.entrega.direccion}. Horario: 08:30 a 18:30.`,
    entregado: (o) => `Su pedido #${o.numero} fue entregado. ¡Gracias por su compra!`,
    cancelado: (o) => `Su pedido #${o.numero} fue cancelado. Si tiene dudas, responda a este mensaje.`,
    rechazado: (o) => `No pudimos validar el comprobante del pedido #${o.numero}. Por favor envíe nuevamente el comprobante.`
  };

  function notify(o, key) {
    const conv = db.get('conversations').find((c) => c.contactId === o.contactId);
    const text = NOTIF[key] ? NOTIF[key](o) : `Actualización de su pedido #${o.numero}.`;
    if (!conv) return false;
    db.update('conversations', (arr) => {
      const c = arr.find((x) => x.id === conv.id);
      c.mensajes.push({ id: ui.uid('wamid'), from: 'bot', ts: new Date().toISOString(), payload: WAB.bot.M.buttons(text, [[`track:${o.id}`, 'Seguir pedido']], { header: 'Notificación de pedido' }) });
      c.actualizado = new Date().toISOString();
      return arr;
    });
    return true;
  }

  function setState(id, estado, { notifyClient = true, pago } = {}) {
    let order;
    db.update('orders', (arr) => {
      order = arr.find((x) => x.id === id);
      order.estado = estado;
      if (pago) order.pago.estado = pago;
      order.historial.push({ estado, fecha: new Date().toISOString() });
      return arr;
    });
    if (estado === 'cancelado') WAB.bot.restock(id);
    if (estado === 'entregado') db.update('contacts', (arr) => { const c = arr.find((x) => x.id === order.contactId); if (c) { c.valor = (c.valor || 0) + order.total; if (c.estado !== 'cliente') c.estado = 'cliente'; } return arr; });
    const sent = notifyClient ? notify(order, estado) : false;
    ui.toast(`Pedido #${order.numero}: ${WAB.STATUS.pedido[estado][0]}`, sent ? 'Cliente notificado por WhatsApp (simulación).' : '', 'ok');
    return order;
  }

  function timeline(o) {
    const fl = flowFor(o);
    const idx = fl.indexOf(o.estado);
    return `<ul class="timeline">${fl.map((s, i) => {
      const h = o.historial.slice().reverse().find((x) => x.estado === s);
      return `<li class="${i < idx || (i === idx && s === 'entregado') ? 'done' : i === idx ? 'current' : ''}"><span class="tl-dot">${i <= idx ? icon('check') : ''}</span><div><strong>${WAB.STATUS.pedido[s][0]}</strong><small>${h ? esc(fmt.dateTime(h.fecha)) : 'Pendiente'}</small></div></li>`;
    }).join('')}</ul>`;
  }

  function itemsTable(o) {
    return `<div class="table-wrap"><table class="table"><thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Subtotal</th></tr></thead><tbody>
      ${o.items.map((i) => `<tr><td>${esc(i.nombre)}${i.variante ? `<br><small class="muted">${esc(i.variante)}</small>` : ''}</td><td class="num">${i.cantidad}</td><td class="num">${fmt.money(i.precio)}</td><td class="num">${fmt.money(i.precio * i.cantidad)}</td></tr>`).join('')}
      <tr><td colspan="3">Envío</td><td class="num">${o.envio ? fmt.money(o.envio) : 'Sin costo'}</td></tr>
      <tr><td colspan="3"><strong>Total</strong></td><td class="num"><strong>${fmt.money(o.total)}</strong></td></tr></tbody></table></div>`;
  }

  /** Panel lateral con el detalle y las acciones del pedido. */
  function openDetail(id, onChange) {
    let notifyOn = true;
    const d = ui.drawer({ title: 'Pedido', wide: true, body: '' , onClose: () => history.replaceState(null, '', location.pathname) });
    history.replaceState(null, '', `#${id}`);
    const draw = () => {
      const o = db.find('orders', id);
      const ct = db.contact(o.contactId) || { nombre: 'Cliente', telefono: '' };
      const nx = nextState(o);
      d.el.querySelector('.drawer-head h3').textContent = `Pedido #${o.numero}`;
      d.setBody(`
        <div class="row wrap between"><div class="chips">${badge('pedido', o.estado)}${badge('pago', o.pago.estado)}<span class="badge">${esc(o.origen)}</span></div><small class="muted">${esc(fmt.dateTime(o.creado))}</small></div>
        <div class="grid-2 mt-2">
          <div class="card card-pad"><span class="label">Cliente</span><div class="row mt-1">${ui.avatar(ct.nombre, 'sm')}<div><strong>${esc(ct.nombre)}</strong><br><small class="muted">${esc(ct.telefono)}</small></div></div><a class="btn btn-sm mt-2" href="crm.html#${ct.id}">${icon('user', 'sm')}Ver ficha</a></div>
          <div class="card card-pad"><span class="label">${o.entrega.tipo === 'delivery' ? 'Envío a domicilio' : 'Retiro en tienda'}</span><p class="mb-0 mt-1">${icon(o.entrega.tipo === 'delivery' ? 'truck' : 'store', 'sm').replace('class="icon sm"', 'class="icon sm" style="display:inline;vertical-align:-3px"')} ${esc(o.entrega.direccion || '—')}</p></div>
        </div>
        <h4 class="mt-3 mb-1">Productos</h4>${itemsTable(o)}
        <h4 class="mt-3 mb-1">Pago con QR (simulado)</h4>
        <div class="card card-pad">
          ${o.pago.comprobante ? `<div class="row" style="align-items:flex-start"><div style="width:84px;height:110px;border-radius:10px;background:var(--surface-2);display:grid;place-items:center;color:var(--muted);flex:none">${icon('image', 'lg')}</div><div class="grow"><strong>comprobante.jpg</strong><p class="small mb-1">Imagen enviada por el cliente. En producción se muestra la captura real para validarla contra el extracto bancario.</p>
            ${o.pago.estado === 'en_revision' ? `<div class="btn-group"><button class="btn btn-primary btn-sm" data-pay="ok">${icon('check', 'sm')}Aprobar pago</button><button class="btn btn-danger btn-sm" data-pay="no">${icon('x', 'sm')}Rechazar</button></div>` : badge('pago', o.pago.estado)}</div></div>`
            : `<p class="small mb-1">${o.estado === 'cancelado' ? 'Pedido cancelado.' : 'Aún no se recibió comprobante.'}</p>${o.estado === 'nuevo' ? `<div class="btn-group"><button class="btn btn-sm" data-pay="sim">${icon('upload', 'sm')}Registrar comprobante</button><button class="btn btn-sm" data-pay="cash">${icon('wallet', 'sm')}Registrar pago manual</button></div>` : ''}`}
        </div>
        <h4 class="mt-3 mb-1">Seguimiento</h4>${timeline(o)}
        <label class="switch mt-1"><input type="checkbox" id="notify" ${notifyOn ? 'checked' : ''}><span class="track"></span>Notificar al cliente por WhatsApp en cada cambio</label>`);
      d.setActions([
        ...(o.estado !== 'cancelado' && o.estado !== 'entregado' ? [{ label: 'Cancelar pedido', kind: 'btn-danger', icon: 'x', onClick: async () => { if (await ui.confirm({ title: `Cancelar pedido #${o.numero}`, message: 'Se liberará el stock reservado.', confirmLabel: 'Cancelar pedido', danger: true })) { setState(id, 'cancelado', { notifyClient: notifyOn, pago: o.pago.estado === 'aprobado' ? 'aprobado' : 'rechazado' }); draw(); onChange && onChange(); } } }] : []),
        { label: 'Notificar ahora', icon: 'bell', onClick: () => { const ok = notify(o, o.estado); ui.toast(ok ? 'Notificación enviada (simulación)' : 'Sin conversación', ok ? 'Se agregó al chat del cliente.' : 'Se enviaría con una plantilla aprobada.', ok ? 'ok' : 'info'); } },
        ...(nx ? [{ label: `Marcar: ${WAB.STATUS.pedido[nx][0]}`, kind: 'btn-primary', icon: 'arrowRight', onClick: () => { setState(id, nx, { notifyClient: notifyOn }); draw(); onChange && onChange(); } }] : [])
      ]);
      d.body.querySelector('#notify').onchange = (e) => { notifyOn = e.target.checked; };
      d.body.querySelectorAll('[data-pay]').forEach((b) => b.onclick = () => {
        const k = b.dataset.pay;
        if (k === 'ok') setState(id, 'pagado', { notifyClient: notifyOn, pago: 'aprobado' });
        if (k === 'no') {
          db.update('orders', (arr) => { const x = arr.find((y) => y.id === id); x.pago = { metodo: 'QR', estado: 'rechazado', comprobante: false }; x.estado = 'nuevo'; x.historial.push({ estado: 'nuevo', fecha: new Date().toISOString() }); return arr; });
          if (notifyOn) notify(db.find('orders', id), 'rechazado');
          ui.toast('Pago rechazado', 'Se pidió al cliente un nuevo comprobante.', 'warn');
        }
        if (k === 'sim') { db.update('orders', (arr) => { const x = arr.find((y) => y.id === id); x.pago = { metodo: 'QR', estado: 'en_revision', comprobante: true }; x.estado = 'pago_revision'; x.historial.push({ estado: 'pago_revision', fecha: new Date().toISOString() }); return arr; }); ui.toast('Comprobante registrado', 'Ahora puede aprobarlo.', 'info'); }
        if (k === 'cash') { db.update('orders', (arr) => { const x = arr.find((y) => y.id === id); x.pago = { metodo: 'Efectivo', estado: 'aprobado', comprobante: false }; return arr; }); setState(id, 'pagado', { notifyClient: notifyOn, pago: 'aprobado' }); }
        draw(); onChange && onChange();
      });
    };
    draw();
    return d;
  }

  WAB.orders = { flowFor, nextState, setState, notify, timeline, itemsTable, openDetail };
})(window);
