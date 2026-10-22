/* Pedidos: listado con filtros, validación de pagos, estados de entrega y notificaciones. */
(function () {
  const { icon, ui, db, shell, badge, orders } = window.WAB;
  const { esc, fmt } = ui;
  const f = { q: '', estado: '', entrega: '', origen: '' };

  shell.view.innerHTML = `
    <div class="page-head">
      <div><h2>Pedidos</h2><p class="muted">Pedidos creados desde WhatsApp y el catálogo web. Valide comprobantes y actualice el estado: el cliente recibe la notificación.</p></div>
      <div class="btn-group"><button class="btn" id="csv">${icon('download', 'sm')}Exportar</button><a class="btn btn-primary" href="ventas.html">${icon('plus', 'sm')}Nueva venta</a></div>
    </div>
    <div class="kpis" id="kpis"></div>
    <div class="card">
      <div class="card-head toolbar">
        <div class="input-group">${icon('search', 'sm')}<input class="input input-sm" id="q" placeholder="N.º de pedido o cliente" aria-label="Buscar pedidos"></div>
        <select class="select input-sm" id="entrega" style="width:auto" aria-label="Entrega"><option value="">Envío y retiro</option><option value="delivery">Envío a domicilio</option><option value="retiro">Retiro en tienda</option></select>
        <select class="select input-sm" id="origen" style="width:auto" aria-label="Origen"><option value="">Todos los orígenes</option><option>WhatsApp</option><option>Tienda web</option><option>Panel</option></select>
      </div>
      <div class="card-body" style="padding-bottom:0"><div class="chips" id="chips"></div></div>
      <div id="tbl"></div>
    </div>`;
  const $ = (id) => document.getElementById(id);

  function list() {
    return db.get('orders').filter((o) => {
      const ct = db.contact(o.contactId);
      if (f.estado === 'activos' ? ['entregado', 'cancelado'].includes(o.estado) : f.estado && o.estado !== f.estado) return false;
      if (f.entrega && o.entrega.tipo !== f.entrega) return false;
      if (f.origen && o.origen !== f.origen) return false;
      if (f.q && !`#${o.numero} ${ct ? ct.nombre : ''}`.toLowerCase().includes(f.q.toLowerCase())) return false;
      return true;
    }).sort((a, b) => new Date(b.creado) - new Date(a.creado));
  }

  function render() {
    const all = db.get('orders');
    const paid = all.filter((o) => o.pago.estado === 'aprobado' && o.estado !== 'cancelado');
    $('kpis').innerHTML = `
      <div class="kpi"><span class="kpi-label">Nuevos (sin pago)</span><span class="kpi-value">${all.filter((o) => o.estado === 'nuevo').length}</span></div>
      <div class="kpi"><span class="kpi-label">Pagos por validar</span><span class="kpi-value">${all.filter((o) => o.estado === 'pago_revision').length}</span></div>
      <div class="kpi"><span class="kpi-label">En preparación / envío</span><span class="kpi-value">${all.filter((o) => ['pagado', 'preparando', 'enviado', 'listo_retiro'].includes(o.estado)).length}</span></div>
      <div class="kpi"><span class="kpi-label">Cobrado</span><span class="kpi-value">${fmt.money(paid.reduce((t, o) => t + o.total, 0))}</span><span class="small muted">${paid.length} pedidos</span></div>`;
    const C = [['', 'Todos'], ['activos', 'Activos'], ['nuevo', 'Nuevos'], ['pago_revision', 'Pago en revisión'], ['pagado', 'Pagados'], ['preparando', 'Preparando'], ['enviado', 'En camino'], ['listo_retiro', 'Para retiro'], ['entregado', 'Entregados'], ['cancelado', 'Cancelados']];
    $('chips').innerHTML = C.map(([k, l]) => `<button class="chip${f.estado === k ? ' active' : ''}" data-e="${k}">${l}<span class="count">${k === '' ? all.length : k === 'activos' ? all.filter((o) => !['entregado', 'cancelado'].includes(o.estado)).length : all.filter((o) => o.estado === k).length}</span></button>`).join('');
    const l = list();
    $('tbl').innerHTML = l.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Pedido</th><th>Cliente</th><th class="num">Total</th><th class="hide-sm">Entrega</th><th>Pago</th><th>Estado</th><th class="hide-sm">Fecha</th></tr></thead><tbody>
      ${l.map((o) => { const ct = db.contact(o.contactId) || { nombre: '—' }; return `<tr class="clickable" data-id="${o.id}"><td><strong>#${o.numero}</strong><br><small class="muted">${o.items.reduce((t, i) => t + i.cantidad, 0)} art. · ${esc(o.origen)}</small></td><td>${esc(ct.nombre)}</td><td class="num"><strong>${fmt.money(o.total)}</strong></td><td class="hide-sm">${icon(o.entrega.tipo === 'delivery' ? 'truck' : 'store', 'sm').replace('class="icon sm"', 'class="icon sm" style="display:inline;vertical-align:-3px"')} ${o.entrega.tipo === 'delivery' ? 'Envío' : 'Retiro'}</td><td>${badge('pago', o.pago.estado)}</td><td>${badge('pedido', o.estado)}</td><td class="hide-sm nowrap">${esc(fmt.relative(o.creado))}</td></tr>`; }).join('')}
      </tbody></table></div>`
      : `<div class="card-body">${ui.emptyState({ icon: 'receipt', title: 'Sin pedidos', text: 'No hay pedidos con estos filtros.' })}</div>`;
    $('tbl').querySelectorAll('[data-id]').forEach((r) => r.onclick = () => orders.openDetail(r.dataset.id, render));
  }

  $('q').oninput = ui.debounce((e) => { f.q = e.target.value.trim(); render(); }, 150);
  $('entrega').onchange = (e) => { f.entrega = e.target.value; render(); };
  $('origen').onchange = (e) => { f.origen = e.target.value; render(); };
  $('chips').onclick = (e) => { const b = e.target.closest('[data-e]'); if (b) { f.estado = b.dataset.e; render(); } };
  $('csv').onclick = () => {
    const l = list();
    if (!l.length) return ui.toast('Nada para exportar', '', 'warn');
    const rows = [['Pedido', 'Fecha', 'Cliente', 'Productos', 'Subtotal', 'Envío', 'Total', 'Entrega', 'Dirección', 'Pago', 'Estado', 'Origen']].concat(l.map((o) => [o.numero, fmt.dateTime(o.creado), (db.contact(o.contactId) || {}).nombre || '', o.items.map((i) => `${i.cantidad}x ${i.nombre}`).join(' | '), o.subtotal, o.envio, o.total, o.entrega.tipo, o.entrega.direccion, WAB.STATUS.pago[o.pago.estado][0], WAB.STATUS.pedido[o.estado][0], o.origen]));
    ui.download(`pedidos-${fmt.isoDate(new Date())}.csv`, ui.toCSV(rows), 'text/csv;charset=utf-8');
    ui.toast('Pedidos exportados', `${l.length} registros`, 'ok');
  };
  db.on('*', (v, src) => { if (src === 'external') render(); });
  render();
  const h = location.hash.slice(1);
  if (h && db.find('orders', h)) orders.openDetail(h, render);
})();
