/* Ventas: flujo completo de compra (producto → carrito → datos → entrega → pago → confirmación → seguimiento),
   compra iniciada desde WhatsApp y registro de pagos. */
(function () {
  const { icon, ui, db, shell, badge, orders } = window.WAB;
  const { esc, fmt } = ui;
  const STEPS = ['Producto', 'Carrito', 'Datos', 'Entrega', 'Pago', 'Confirmación', 'Seguimiento'];
  const fresh = () => ({ step: 0, cart: [], cliente: { modo: 'existente', contactId: '', nombre: '', telefono: '' }, entrega: { tipo: 'delivery', direccion: '' }, comprobante: null, orderId: null });
  let st = fresh();
  let q = '';

  shell.view.innerHTML = `
    <div class="page-head">
      <div><h2>Ventas</h2><p class="muted">Registre una venta de punta a punta o simule una compra iniciada por el cliente en WhatsApp. No se procesan pagos reales.</p></div>
      <span class="sim-label">${icon('info')}Pagos simulados</span>
    </div>
    <div class="kpis" id="kpis"></div>
    <div class="split">
      <div class="stack">
        <div class="card"><div class="card-head"><div class="stepper" id="stepper"></div></div><div class="card-body" id="step-body"></div><div class="card-foot" id="step-foot"></div></div>
        <div class="card">
          <div class="card-head"><h3>Registro de pagos</h3><select class="select input-sm" id="pay-f" style="width:auto" aria-label="Filtrar pagos"><option value="">Todos</option><option value="aprobado">Aprobados</option><option value="en_revision">En revisión</option><option value="pendiente">Pendientes</option><option value="rechazado">Rechazados</option></select></div>
          <div id="payments"></div>
        </div>
      </div>
      <div class="phone-col"><div id="phone"></div><button class="btn btn-sm" id="sim-wa">${icon('play', 'sm')}Simular compra desde WhatsApp</button><p class="phone-caption">El pedido creado en el chat aparece en el registro de pagos y en Pedidos.</p></div>
    </div>`;
  const $ = (id) => document.getElementById(id);
  const subtotal = () => st.cart.reduce((t, i) => t + i.precio * i.cantidad, 0);
  const shipping = () => { const t = db.get('settings').tienda; return st.entrega.tipo === 'delivery' ? (subtotal() >= t.envioGratisDesde ? 0 : t.envio) : 0; };

  function kpis() {
    const all = db.get('orders').filter((o) => o.pago.estado === 'aprobado' && o.estado !== 'cancelado');
    const today = fmt.isoDate(new Date());
    const week = all.filter((o) => (Date.now() - new Date(o.creado)) < 7 * 864e5);
    $('kpis').innerHTML = `
      <div class="kpi"><span class="kpi-label">Ventas de hoy</span><span class="kpi-value">${fmt.money(all.filter((o) => fmt.isoDate(new Date(o.creado)) === today).reduce((t, o) => t + o.total, 0))}</span></div>
      <div class="kpi"><span class="kpi-label">Últimos 7 días</span><span class="kpi-value">${fmt.money(week.reduce((t, o) => t + o.total, 0))}</span></div>
      <div class="kpi"><span class="kpi-label">Ticket promedio</span><span class="kpi-value">${fmt.money(all.length ? all.reduce((t, o) => t + o.total, 0) / all.length : 0, { decimals: false })}</span></div>
      <div class="kpi"><span class="kpi-label">Por WhatsApp</span><span class="kpi-value">${all.length ? Math.round((all.filter((o) => o.origen === 'WhatsApp').length / all.length) * 100) : 0}%</span></div>`;
  }

  function stepper() {
    $('stepper').innerHTML = STEPS.map((s, i) => `${i ? `<span class="st-line${i <= st.step ? ' done' : ''}"></span>` : ''}<span class="st ${i < st.step ? 'done' : i === st.step ? 'current' : ''}"><span class="st-n">${i < st.step ? icon('check', 'sm') : i + 1}</span><span class="st-label">${s}</span></span>`).join('');
  }

  function foot(back, next, nextLabel = 'Continuar', extra = '') {
    $('step-foot').innerHTML = `${extra}${back ? `<button class="btn btn-ghost" id="back">${icon('arrowLeft', 'sm')}Atrás</button>` : ''}${next ? `<button class="btn btn-primary" id="next">${esc(nextLabel)}${icon('arrowRight', 'sm')}</button>` : ''}`;
    if (back) $('back').onclick = () => { st.step -= 1; render(); };
    if (next) $('next').onclick = next;
  }

  function render() {
    kpis(); stepper(); payments();
    const b = $('step-body');
    const s = st.step;
    if (s === 0) {
      const list = db.get('products').filter((p) => p.activo && (!q || p.nombre.toLowerCase().includes(q)));
      b.innerHTML = `<div class="toolbar mb-2"><div class="input-group">${icon('search', 'sm')}<input class="input input-sm" id="pq" value="${esc(q)}" placeholder="Buscar producto" aria-label="Buscar producto"></div><span class="small muted">${st.cart.length ? `${st.cart.reduce((t, i) => t + i.cantidad, 0)} en el carrito · ${fmt.money(subtotal())}` : 'Carrito vacío'}</span></div>
        <div class="store-grid">${list.map((p) => `<div class="store-card${p.stock <= 0 ? ' soldout' : ''}" data-p="${p.id}" role="button" tabindex="0" aria-label="Agregar ${esc(p.nombre)}"><div class="sc-img"><img src="${db.img(p)}" alt="" loading="lazy"></div><div class="sc-body"><strong>${esc(p.nombre)}</strong><small>${p.stock > 0 ? `${p.stock} en stock` : 'Agotado'}</small><div class="sc-price">${fmt.money(db.price(p))}</div></div></div>`).join('') || ui.emptyState({ icon: 'search', title: 'Sin resultados' })}</div>`;
      $('pq').oninput = ui.debounce((e) => { q = e.target.value.trim().toLowerCase(); render(); $('pq').focus(); }, 250);
      b.querySelectorAll('[data-p]').forEach((c) => { c.onclick = () => pick(db.product(c.dataset.p)); c.onkeydown = (e) => { if (e.key === 'Enter') pick(db.product(c.dataset.p)); }; });
      foot(false, () => { if (!st.cart.length) return ui.toast('Agregue al menos un producto', '', 'warn'); st.step = 1; render(); }, 'Ver carrito');
    } else if (s === 1) {
      b.innerHTML = st.cart.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Producto</th><th class="num">Cantidad</th><th class="num">Subtotal</th><th></th></tr></thead><tbody>
        ${st.cart.map((i, k) => `<tr><td><strong>${esc(i.nombre)}</strong>${i.variante ? `<br><small class="muted">${esc(i.variante)}</small>` : ''}<br><small class="muted">${fmt.money(i.precio)} c/u</small></td><td class="num"><div class="stepper-input" style="justify-content:flex-end"><button class="btn btn-icon btn-sm" data-dec="${k}" aria-label="Menos">${icon('minus', 'sm')}</button><span style="min-width:28px;text-align:center;align-self:center">${i.cantidad}</span><button class="btn btn-icon btn-sm" data-inc="${k}" aria-label="Más">${icon('plus', 'sm')}</button></div></td><td class="num">${fmt.money(i.precio * i.cantidad)}</td><td><button class="btn btn-ghost btn-icon btn-sm" data-rm="${k}" aria-label="Quitar">${icon('trash', 'sm')}</button></td></tr>`).join('')}
        <tr><td colspan="2"><strong>Subtotal</strong></td><td class="num"><strong>${fmt.money(subtotal())}</strong></td><td></td></tr></tbody></table></div>`
        : ui.emptyState({ icon: 'cart', title: 'El carrito está vacío', text: 'Vuelva al paso anterior para agregar productos.' });
      b.querySelectorAll('[data-inc]').forEach((x) => x.onclick = () => { const i = st.cart[x.dataset.inc]; const p = db.product(i.productId); if (i.cantidad + 1 > p.stock) return ui.toast(`Solo hay ${p.stock} en stock`, '', 'warn'); i.cantidad += 1; render(); });
      b.querySelectorAll('[data-dec]').forEach((x) => x.onclick = () => { const i = st.cart[x.dataset.dec]; i.cantidad = Math.max(1, i.cantidad - 1); render(); });
      b.querySelectorAll('[data-rm]').forEach((x) => x.onclick = () => { st.cart.splice(Number(x.dataset.rm), 1); render(); });
      foot(true, () => { if (!st.cart.length) return ui.toast('El carrito está vacío', '', 'warn'); st.step = 2; render(); });
    } else if (s === 2) {
      const contacts = db.get('contacts');
      b.innerHTML = `<div class="segmented mb-2"><button data-m="existente" class="${st.cliente.modo === 'existente' ? 'active' : ''}">Cliente existente</button><button data-m="nuevo" class="${st.cliente.modo === 'nuevo' ? 'active' : ''}">Cliente nuevo</button></div>
        <form class="form-grid" id="cf" novalidate></form>`;
      const fields = st.cliente.modo === 'existente'
        ? [{ name: 'contactId', label: 'Cliente', type: 'select', required: true, full: true, placeholderOption: 'Elija un cliente', options: contacts.map((c) => ({ value: c.id, label: `${c.nombre} · ${c.telefono}` })) }]
        : [{ name: 'nombre', label: 'Nombre completo', required: true, maxlength: 60 }, { name: 'telefono', label: 'WhatsApp', type: 'tel', required: true, placeholder: '+591 7xxxxxxx' }];
      $('cf').innerHTML = ui.renderFields(fields, st.cliente);
      b.querySelectorAll('[data-m]').forEach((x) => x.onclick = () => { st.cliente.modo = x.dataset.m; render(); });
      foot(true, () => {
        const r = ui.validate($('cf'), fields);
        if (!r.ok) return;
        Object.assign(st.cliente, r.values);
        st.step = 3; render();
      });
    } else if (s === 3) {
      const t = db.get('settings').tienda;
      b.innerHTML = `<div class="grid-2">${[['delivery', 'truck', 'Envío a domicilio', `${fmt.money(t.envio)} · gratis desde ${fmt.money(t.envioGratisDesde)}`], ['retiro', 'store', 'Retiro en tienda', 'Sucursal Av. Busch · sin costo']].map(([k, ic, l, d]) => `<button type="button" class="card card-pad" data-t="${k}" style="text-align:left;cursor:pointer;font:inherit;color:inherit;${st.entrega.tipo === k ? 'border-color:var(--brand);box-shadow:0 0 0 1px var(--brand)' : ''}"><div class="row">${icon(ic, 'lg')}<div><strong>${l}</strong><br><small class="muted">${d}</small></div></div></button>`).join('')}</div>
        ${st.entrega.tipo === 'delivery' ? `<form class="form-grid mt-2" id="ef" novalidate>${ui.renderFields([{ name: 'direccion', label: 'Dirección de entrega', required: true, full: true, placeholder: 'Calle, número, zona y referencia' }], st.entrega)}</form>` : ''}
        <div class="notice mt-2">${icon('info')}<p>Subtotal ${fmt.money(subtotal())} · Envío ${shipping() ? fmt.money(shipping()) : 'sin costo'} · <strong>Total ${fmt.money(subtotal() + shipping())}</strong></p></div>`;
      b.querySelectorAll('[data-t]').forEach((x) => x.onclick = () => { const inp = b.querySelector('[name="direccion"]'); if (inp) st.entrega.direccion = inp.value; st.entrega.tipo = x.dataset.t; render(); });
      foot(true, () => {
        if (st.entrega.tipo === 'delivery') {
          const fields = [{ name: 'direccion', label: 'Dirección', required: true, validate: (v) => (v.length < 8 ? 'Escriba una dirección más completa.' : '') }];
          const r = ui.validate($('ef'), fields);
          if (!r.ok) return;
          st.entrega.direccion = r.values.direccion;
        } else st.entrega.direccion = 'Sucursal Av. Busch';
        createOrder();
        st.step = 4; render();
      });
    } else if (s === 4) {
      const o = db.find('orders', st.orderId);
      b.innerHTML = `<div class="grid-2"><div class="center"><div style="max-width:220px;margin:0 auto;padding:12px;background:#fff;border-radius:14px;border:1px solid var(--border)"><img src="${WAB.bot.fakeQR(`PF-${o.numero}-${o.total}`)}" alt="QR de pago (simulación)"></div><p class="small muted mt-1">QR estático de ${esc(db.get('settings').tienda.banco)} · <strong>simulación, no escanear</strong></p></div>
        <div class="stack"><div><span class="label">Pedido</span><div class="kpi-value">#${o.numero}</div></div><div><span class="label">Total a pagar</span><div class="kpi-value">${fmt.money(o.total)}</div></div>
        <div class="field"><label for="proof">Comprobante de pago</label><input class="input" type="file" id="proof" accept="image/*,.pdf"><span class="hint">El archivo solo se previsualiza en este navegador; no se sube a ningún servidor.</span></div>
        <div id="proof-prev">${st.comprobante ? `<div class="notice ok">${icon('checkCircle')}<p>Comprobante cargado: <strong>${esc(st.comprobante)}</strong></p></div>` : ''}</div>
        <button class="btn btn-sm" id="sim-proof">${icon('upload', 'sm')}Usar comprobante de ejemplo</button></div></div>`;
      const setProof = (name) => { st.comprobante = name; db.update('orders', (arr) => { const x = arr.find((y) => y.id === st.orderId); x.pago = { metodo: 'QR', estado: 'en_revision', comprobante: true }; if (x.estado === 'nuevo') { x.estado = 'pago_revision'; x.historial.push({ estado: 'pago_revision', fecha: new Date().toISOString() }); } return arr; }); render(); };
      $('proof').onchange = (e) => { const file = e.target.files[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { ui.toast('Archivo demasiado grande', 'Máximo 5 MB.', 'danger'); e.target.value = ''; return; } setProof(file.name); };
      $('sim-proof').onclick = () => setProof('comprobante-ejemplo.jpg');
      foot(false, () => { if (!st.comprobante) return ui.toast('Falta el comprobante', 'Cargue el comprobante o use el de ejemplo.', 'warn'); st.step = 5; render(); }, 'Confirmar pago', `<button class="btn btn-danger" id="cancel-o">${icon('x', 'sm')}Cancelar pedido</button><span class="grow"></span>`);
      $('cancel-o').onclick = async () => { if (await ui.confirm({ title: 'Cancelar pedido', message: 'Se liberará el stock reservado.', confirmLabel: 'Cancelar pedido', danger: true })) { orders.setState(st.orderId, 'cancelado', { pago: 'rechazado' }); st = fresh(); render(); } };
    } else if (s === 5) {
      const o = db.find('orders', st.orderId);
      const ct = db.contact(o.contactId);
      b.innerHTML = `<div class="notice ok mb-2">${icon('checkCircle')}<p><strong>Pedido #${o.numero} registrado.</strong> El comprobante quedó en revisión. Al aprobarlo, el pedido pasa a preparación y el cliente recibe la confirmación por WhatsApp.</p></div>
        <dl class="kv mb-2"><dt>Cliente</dt><dd>${esc(ct.nombre)}</dd><dt>Entrega</dt><dd>${esc(o.entrega.tipo === 'delivery' ? `Envío: ${o.entrega.direccion}` : 'Retiro en tienda')}</dd><dt>Pago</dt><dd>${badge('pago', o.pago.estado)}</dd></dl>${orders.itemsTable(o)}`;
      foot(false, () => { orders.setState(o.id, 'pagado', { pago: 'aprobado' }); st.step = 6; render(); }, 'Aprobar pago y continuar', `<a class="btn" href="pedidos.html#${o.id}">${icon('receipt', 'sm')}Ver en Pedidos</a><span class="grow"></span>`);
    } else {
      const o = db.find('orders', st.orderId);
      const nx = orders.nextState(o);
      b.innerHTML = `<div class="grid-2"><div>${orders.timeline(o)}</div><div class="stack"><p class="small">Cada avance envía una notificación al chat del cliente (simulada). Puede verla en Conversaciones.</p>${nx ? '' : `<div class="notice ok">${icon('checkCircle')}<p>Pedido completado.</p></div>`}</div></div>`;
      foot(false, nx ? () => { orders.setState(o.id, nx); render(); } : null, nx ? `Marcar: ${WAB.STATUS.pedido[nx][0]}` : '', `<button class="btn" id="again">${icon('plus', 'sm')}Nueva venta</button><span class="grow"></span>`);
      $('again').onclick = () => { st = fresh(); render(); };
    }
  }

  function pick(p) {
    if (!p || p.stock <= 0) return ui.toast('Producto agotado', '', 'warn');
    const add = (variante) => {
      const ex = st.cart.find((i) => i.productId === p.id && i.variante === variante);
      const qty = (ex ? ex.cantidad : 0) + 1;
      if (qty > p.stock) return ui.toast(`Solo hay ${p.stock} en stock`, '', 'warn');
      if (ex) ex.cantidad = qty; else st.cart.push({ productId: p.id, nombre: p.nombre, variante, cantidad: 1, precio: db.price(p) });
      ui.toast('Agregado al carrito', `${p.nombre}${variante ? ` (${variante})` : ''}`, 'ok', 1800);
      render();
    };
    if (!p.variantes.length) return add('');
    ui.formModal({ title: p.nombre, subtitle: 'Elija una opción', fields: [{ name: 'v', label: 'Opción', type: 'select', options: p.variantes, full: true }], submitLabel: 'Agregar', onSubmit: (v) => { add(v.v); return true; } });
  }

  function createOrder() {
    let contactId = st.cliente.contactId;
    if (st.cliente.modo === 'nuevo') {
      const digits = st.cliente.telefono.replace(/\D/g, '');
      const ex = db.get('contacts').find((c) => c.telefono.replace(/\D/g, '') === digits);
      if (ex) contactId = ex.id;
      else {
        contactId = ui.uid('ct');
        db.update('contacts', (arr) => { arr.unshift({ id: contactId, nombre: st.cliente.nombre, mascota: '', telefono: st.cliente.telefono, correo: '', estado: 'prospecto', etiquetas: ['tienda'], fuente: 'Presencial', consentimiento: true, notas: [], creado: new Date().toISOString(), ultimoContacto: new Date().toISOString(), valor: 0 }); return arr; });
      }
    }
    const sub = subtotal();
    const env = shipping();
    const numero = Math.max(1048, ...db.get('orders').map((o) => o.numero)) + 1;
    const now = new Date().toISOString();
    const o = { id: ui.uid('or'), numero, contactId, items: st.cart.map((i) => Object.assign({}, i)), subtotal: sub, envio: env, total: sub + env, entrega: { tipo: st.entrega.tipo, direccion: st.entrega.direccion }, pago: { metodo: 'QR', estado: 'pendiente', comprobante: false }, estado: 'nuevo', origen: 'Panel', creado: now, historial: [{ estado: 'nuevo', fecha: now }] };
    db.update('orders', (arr) => { arr.unshift(o); return arr; });
    db.update('products', (arr) => { o.items.forEach((i) => { const p = arr.find((x) => x.id === i.productId); if (p) p.stock = Math.max(0, p.stock - i.cantidad); }); return arr; });
    st.orderId = o.id;
    ui.toast(`Pedido #${numero} creado`, 'Stock reservado. Esperando pago.', 'ok');
  }

  function payments() {
    const fv = $('pay-f').value;
    const l = db.get('orders').filter((o) => !fv || o.pago.estado === fv).sort((a, b) => new Date(b.creado) - new Date(a.creado)).slice(0, 15);
    $('payments').innerHTML = l.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Pedido</th><th>Cliente</th><th class="hide-sm">Método</th><th class="num">Monto</th><th>Estado</th><th class="hide-sm">Comprobante</th></tr></thead><tbody>
      ${l.map((o) => `<tr class="clickable" data-id="${o.id}"><td><strong>#${o.numero}</strong><br><small class="muted">${esc(fmt.relative(o.creado))}</small></td><td>${esc((db.contact(o.contactId) || {}).nombre || '—')}</td><td class="hide-sm">${esc(o.pago.metodo)}</td><td class="num">${fmt.money(o.total)}</td><td>${badge('pago', o.pago.estado)}</td><td class="hide-sm">${o.pago.comprobante ? `${icon('image', 'sm').replace('class="icon sm"', 'class="icon sm" style="display:inline;vertical-align:-3px"')} Recibido` : '—'}</td></tr>`).join('')}</tbody></table></div>`
      : `<div class="card-body">${ui.emptyState({ icon: 'wallet', title: 'Sin pagos', text: 'No hay pagos con este filtro.' })}</div>`;
    $('payments').querySelectorAll('[data-id]').forEach((r) => r.onclick = () => orders.openDetail(r.dataset.id, render));
  }
  $('pay-f').onchange = payments;

  const phone = new WAB.Phone($('phone'), { compact: true, quick: ['Tienda', 'Ver carrito', 'Menú'], onAfter: () => { kpis(); payments(); } });
  $('sim-wa').onclick = async () => { await phone.restart(); phone.send({ kind: 'reply', id: 'act:products', title: 'Tienda de mascotas' }); };
  db.on('*', (v, src) => { if (src === 'external') render(); });
  render();
})();
