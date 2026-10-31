(function () {
  const TOR = window.TOR;
  const S = TOR.store, Q = TOR.q, C = TOR.cmp, L = TOR.labels;
  const { esc, fmt } = TOR.ui;
  const icon = TOR.icon;
  const st = C.state('dashboard', { periodo: 'mes' });
  const PERIODOS = [['mes', 'Este mes'], ['mes_ant', 'Mes anterior'], ['3m', '3 meses'], ['6m', '6 meses']];
  const prevKey = { mes: 'mes_ant' };

  function render(el) {
    const p = st.periodo;
    const ventas = Q.ventas().filter((v) => Q.inRange(v.fecha, p));
    const compras = Q.compras().filter((c) => Q.inRange(c.fecha, p));
    const caja = S.scoped(S.db.caja.movimientos).filter((k) => Q.inRange(k.fecha, p));
    const totV = Q.sumBy(ventas, (v) => v.total);
    const totC = Q.sumBy(compras, (c) => c.total);
    const util = Q.sumBy(ventas, Q.margenVenta);
    const ing = Q.sumBy(caja.filter((k) => k.tipo === 'ingreso'), (k) => k.monto);
    const egr = Q.sumBy(caja.filter((k) => k.tipo === 'egreso'), (k) => k.monto);
    const prevV = prevKey[p] ? Q.sumBy(Q.ventas().filter((v) => Q.inRange(v.fecha, prevKey[p])), (v) => v.total) : 0;
    const prevC = prevKey[p] ? Q.sumBy(Q.compras().filter((c) => Q.inRange(c.fecha, prevKey[p])), (c) => c.total) : 0;
    const low = Q.lowStock();
    const activas = Q.otActivas();
    const pendientes = activas.filter((o) => ['pendiente', 'en_proceso', 'control_calidad'].includes(o.estado));
    const completadas = S.scoped(S.db.ordenes).filter((o) => ['terminada', 'entregada'].includes(o.estado) && Q.inRange(o.historial[o.historial.length - 1].fecha, p));
    const atrasadas = activas.filter(Q.otAtrasada);
    const plabel = PERIODOS.find((x) => x[0] === p)[1].toLowerCase();
    const vsPrev = prevKey[p] ? ' vs. mes anterior' : '';

    el.innerHTML = `
      <div class="page-head"><div><h2 style="font-size:20px">Resumen del negocio</h2><p class="lead">${S.ui.sucursal === '*' ? 'Consolidado de todas las sucursales' : esc(S.suc(S.ui.sucursal).nombre)} · ${esc(plabel)}. Toque un indicador para ver el detalle.</p></div>
        <div class="actions">${C.segment('periodo', PERIODOS, p)}</div></div>
      <div class="kpis">
        ${C.kpi({ label: `Ventas · ${plabel}`, value: fmt.money(totV), sub: `${C.delta(totV, prevV)} ${ventas.length} ventas`, icon: 'cart', tone: 'accent', link: '#/ventas' })}
        ${C.kpi({ label: `Compras · ${plabel}`, value: fmt.money(totC), sub: `${C.delta(totC, prevC)} ${compras.length} órdenes de compra`, icon: 'truck', link: '#/compras' })}
        ${C.kpi({ label: 'Utilidad estimada', value: fmt.money(util), sub: `Margen ${totV ? fmt.pct(util / totV) : '—'} sobre ventas`, icon: 'trendUp', tone: 'good', link: '#/reportes' })}
        ${C.kpi({ label: 'Ingresos y egresos de caja', value: fmt.money(ing - egr), sub: `<span class="amount-in">+${fmt.money(ing)}</span><span class="amount-out">−${fmt.money(egr)}</span>`, icon: 'wallet', link: '#/caja' })}
        ${C.kpi({ label: 'Productos registrados', value: fmt.num(S.db.productos.filter((x) => x.activo).length), sub: `${S.db.categorias.length} categorías · ${S.db.productos.filter((x) => x.tipo === 'materia').length} materias primas`, icon: 'package', link: '#/productos' })}
        ${C.kpi({ label: 'Stock bajo', value: fmt.num(low.length), sub: low.length ? `${low.filter((l) => l.cantidad <= 0).length} sin existencias · revisar reposición` : 'Todo en orden', icon: 'alert', tone: low.length ? 'alert' : '', link: '#/inventario?f=bajo' })}
        ${C.kpi({ label: 'Trabajos pendientes', value: fmt.num(pendientes.length), sub: atrasadas.length ? `<span class="badge critical">${atrasadas.length} atrasadas</span>` : 'Sin atrasos', icon: 'wrench', link: '#/ordenes' })}
        ${C.kpi({ label: `Trabajos completados · ${plabel}`, value: fmt.num(completadas.length), sub: `${activas.filter((o) => o.estado === 'terminada').length} listos para entregar`, icon: 'checkCircle', tone: 'good', link: '#/ordenes' })}
      </div>

      <div class="grid g-21">
        <div class="card"><div class="card-head"><div><h3>Ventas y compras por mes</h3><small>Últimos 6 meses · Bs</small></div><div class="actions"><div class="legend" id="lgVC"></div></div></div><div class="card-body"><div id="chVC"></div></div></div>
        <div class="card"><div class="card-head"><div><h3>Ventas por tipo</h3><small>${esc(plabel)}</small></div></div><div class="card-body"><div id="chTipo"></div></div></div>
      </div>

      <div class="grid g-21">
        <div class="card"><div class="card-head"><div><h3>Ingresos y egresos de caja</h3><small>Últimos 6 meses · Bs</small></div><div class="actions"><div class="legend" id="lgIE"></div></div></div><div class="card-body"><div id="chIE"></div></div></div>
        <div class="card"><div class="card-head"><div><h3>Órdenes de trabajo activas</h3><small>Por estado</small></div><div class="actions"><a class="btn btn-ghost btn-sm" href="#/ordenes">Ver todas${icon('chevronRight', 'sm')}</a></div></div><div class="card-body"><div id="chOT"></div></div></div>
      </div>

      ${S.ui.sucursal === '*' ? `<div class="card"><div class="card-head"><div><h3>Comparación entre sucursales</h3><small>${esc(plabel)}</small></div></div><div class="card-body" style="padding:0"><div id="cmpSuc"></div></div></div>` : ''}

      <div class="grid g-3">
        <div class="card"><div class="card-head"><div><h3>Productos más vendidos</h3><small>Por importe · ${esc(plabel)}</small></div></div><div class="card-body"><div id="chTop"></div></div></div>
        <div class="card"><div class="card-head"><div><h3>Alertas de inventario</h3><small>Bajo el stock mínimo</small></div><div class="actions"><a class="btn btn-ghost btn-sm" href="#/inventario?f=bajo">Inventario${icon('chevronRight', 'sm')}</a></div></div>
          <ul class="list-plain">${low.slice(0, 6).map((l) => `<li><span><b>${esc(l.producto.nombre)}</b><small>${esc(l.sucursal.nombre)} · mínimo ${fmt.qty(l.minimo)} ${esc(l.producto.unidad)}</small></span><span class="badge ${l.cantidad <= 0 ? 'critical' : 'warning'}">${fmt.qty(l.cantidad)} ${esc(l.producto.unidad)}</span></li>`).join('') || `<li>${TOR.ui.emptyState({ icon: 'checkCircle', title: 'Sin alertas' })}</li>`}</ul></div>
        <div class="card"><div class="card-head"><div><h3>Próximas entregas</h3><small>Órdenes no entregadas</small></div></div>
          <ul class="list-plain">${activas.slice().sort((a, b) => a.entrega.localeCompare(b.entrega)).slice(0, 6).map((o) => `<li style="cursor:pointer" data-href="#/ordenes/${o.id}"><span><b class="mono">${esc(o.codigo)}</b> ${esc(o.descripcion)}<small>${esc(S.cli(o.cliente).nombre)} · entrega ${fmt.date(o.entrega)}</small></span>${Q.otAtrasada(o) ? TOR.app.badge('Atrasada', 'critical') : TOR.app.badge(L.estadoOT[o.estado], L.claseOT[o.estado])}</li>`).join('') || `<li>${TOR.ui.emptyState({ icon: 'checkCircle', title: 'Sin órdenes activas' })}</li>`}</ul></div>
      </div>

      <div class="card"><div class="card-head"><div><h3>Actividad reciente</h3><small>Registro básico de acciones de los usuarios</small></div></div>
        <ul class="list-plain">${S.db.actividad.slice(0, 8).map((a) => `<li><span><b>${esc(a.accion)}</b><small>${esc(S.user(a.usuario) ? S.user(a.usuario).nombre : a.usuario)} · ${esc(TOR.app.ROUTES[a.modulo] ? TOR.app.ROUTES[a.modulo].label : a.modulo)}</small></span><small class="muted nowrap">${fmt.dateTime(a.fecha)}</small></li>`).join('')}</ul></div>`;

    el.querySelector('[data-seg="periodo"]').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) { st.periodo = b.dataset.v; TOR.app.render(); } });
    C.bindLinks(el);
    charts(el, p, ventas, compras);
  }

  function charts(el, p, ventasPeriodo) {
    const months = Q.monthKeys(6);
    const labels = months.map((m) => fmt.month(m));
    const vMes = months.map((m) => Q.sumBy(Q.ventas().filter((v) => Q.monthKey(v.fecha) === m), (v) => v.total));
    const cMes = months.map((m) => Q.sumBy(Q.compras().filter((c) => Q.monthKey(c.fecha) === m), (c) => c.total));
    const money = (v) => fmt.money(v);
    const sVC = [{ name: 'Ventas', values: vMes, color: 'var(--series-1)' }, { name: 'Compras', values: cMes, color: 'var(--series-2)' }];
    TOR.charts.legend(el.querySelector('#lgVC'), sVC);
    TOR.charts.responsive(el.querySelector('#chVC'), () => TOR.charts.bars(el.querySelector('#chVC'), { labels, series: sVC, grouped: true, height: 250, fmt: money, label: 'Ventas y compras por mes' }));

    const mov = S.scoped(S.db.caja.movimientos);
    const sIE = [
      { name: 'Ingresos', values: months.map((m) => Q.sumBy(mov.filter((k) => k.tipo === 'ingreso' && Q.monthKey(k.fecha) === m), (k) => k.monto)), color: 'var(--series-1)' },
      { name: 'Egresos', values: months.map((m) => Q.sumBy(mov.filter((k) => k.tipo === 'egreso' && Q.monthKey(k.fecha) === m), (k) => k.monto)), color: 'var(--series-2)' }
    ];
    TOR.charts.legend(el.querySelector('#lgIE'), sIE);
    TOR.charts.responsive(el.querySelector('#chIE'), () => TOR.charts.line(el.querySelector('#chIE'), { labels, series: sIE, height: 230, fmt: money, area: true, label: 'Ingresos y egresos por mes' }));

    // Ventas por tipo: materiales, servicios por hora y trabajos de tornería.
    const tipo = { mat: 0, hora: 0, ot: 0 };
    ventasPeriodo.forEach((v) => {
      const k = v.descuento && v.subtotal ? (v.subtotal - v.descuento) / v.subtotal : 1;
      v.items.forEach((it) => { const pr = S.prod(it.producto); const val = it.cantidad * it.precio * k; if (pr.sku === 'SER-OT') tipo.ot += val; else if (pr.tipo === 'servicio') tipo.hora += val; else tipo.mat += val; });
    });
    const total = tipo.mat + tipo.hora + tipo.ot;
    TOR.charts.donut(el.querySelector('#chTipo'), { items: [{ label: 'Materiales y repuestos', value: tipo.mat, color: 'var(--series-1)' }, { label: 'Trabajos de tornería (OT)', value: tipo.ot, color: 'var(--series-2)' }, { label: 'Servicios por hora', value: tipo.hora, color: 'var(--series-3)' }], center: TOR.charts.shortNum(total), sub: 'Bs vendidos', fmt: money, label: 'Ventas por tipo' });

    const act = Q.otActivas();
    const estados = ['pendiente', 'en_proceso', 'control_calidad', 'terminada'];
    TOR.charts.hbars(el.querySelector('#chOT'), estados.map((e) => ({ label: L.estadoOT[e], value: act.filter((o) => o.estado === e).length })), { color: 'var(--series-1)', fmt: (v) => `${v} órdenes` });
    const atr = act.filter(Q.otAtrasada).length;
    if (atr) el.querySelector('#chOT').insertAdjacentHTML('beforeend', `<div class="info-box warning">${icon('alert', 'sm')}<span>${atr} órdenes superaron su fecha de entrega.</span></div>`);

    const top = {};
    ventasPeriodo.forEach((v) => v.items.forEach((it) => { const pr = S.prod(it.producto); if (pr.tipo === 'servicio') return; top[pr.id] = (top[pr.id] || 0) + it.cantidad * it.precio; }));
    TOR.charts.hbars(el.querySelector('#chTop'), Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, v]) => ({ label: S.prod(id).nombre, value: v })), { fmt: money, color: 'var(--series-1)' });

    const cmp = el.querySelector('#cmpSuc');
    if (cmp) {
      const rows = S.db.sucursales.map((s) => {
        const vs = S.db.ventas.filter((v) => v.sucursal === s.id && v.estado !== 'anulada' && Q.inRange(v.fecha, p));
        const cs = S.db.compras.filter((c) => c.sucursal === s.id && c.estado !== 'anulada' && Q.inRange(c.fecha, p));
        const val = S.db.productos.filter((x) => x.tipo !== 'servicio').reduce((t, x) => t + S.stockOf(s.id, x.id) * x.costo, 0);
        return { s, ventas: Q.sumBy(vs, (v) => v.total), n: vs.length, compras: Q.sumBy(cs, (c) => c.total), util: Q.sumBy(vs, Q.margenVenta), ot: S.db.ordenes.filter((o) => o.sucursal === s.id && !['entregada', 'cancelada'].includes(o.estado)).length, stock: val };
      });
      const max = Math.max(...rows.map((r) => r.ventas), 1);
      C.dataTable(cmp, {
        id: 'dash-suc', pageSize: 10, rows,
        columns: [
          { key: 's', label: 'Sucursal', render: (r) => `<b>${esc(r.s.nombre)}</b><span class="sub">${r.n} ventas</span>` },
          { key: 'ventas', label: 'Ventas', align: 'right', sort: (r) => r.ventas, render: (r) => `${fmt.money(r.ventas)}<div class="stock-bar" style="margin-top:4px;width:120px;margin-left:auto"><span style="width:${(r.ventas / max) * 100}%"></span></div>` },
          { key: 'compras', label: 'Compras', align: 'right', sort: (r) => r.compras, render: (r) => fmt.money(r.compras) },
          { key: 'util', label: 'Utilidad estimada', align: 'right', sort: (r) => r.util, render: (r) => fmt.money(r.util) },
          { key: 'ot', label: 'OT activas', align: 'right', sort: (r) => r.ot, render: (r) => r.ot },
          { key: 'stock', label: 'Inventario valorizado', align: 'right', sort: (r) => r.stock, render: (r) => fmt.money(r.stock) }
        ],
        onRow: (r) => { S.setUI({ sucursal: r.s.id }); document.getElementById('branchSelect').value = r.s.id; }
      });
    }
  }

  TOR.views.dashboard = { render };
})();
