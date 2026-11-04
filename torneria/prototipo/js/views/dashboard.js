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
    const activos = S.db.productos.filter((x) => x.activo);
    const valorInv = Q.inventoryValue();
    const porRecibir = Q.comprasPorRecibir();
    const plabel = PERIODOS.find((x) => x[0] === p)[1].toLowerCase();

    el.innerHTML = `
      <div class="page-head"><div><h2 style="font-size:20px">Resumen del negocio</h2><p class="lead">${S.ui.sucursal === '*' ? 'Consolidado de todas las sucursales' : esc(S.suc(S.ui.sucursal).nombre)} · ${esc(plabel)}. Toque un indicador para ver el detalle.</p></div>
        <div class="actions">${C.segment('periodo', PERIODOS, p)}</div></div>
      <div class="kpis">
        ${C.kpi({ label: `Ventas · ${plabel}`, value: fmt.money(totV), sub: `${C.delta(totV, prevV)} ${ventas.length} ventas`, icon: 'cart', tone: 'accent', link: '#/ventas' })}
        ${C.kpi({ label: `Compras · ${plabel}`, value: fmt.money(totC), sub: `${C.delta(totC, prevC)} ${compras.length} ${compras.length === 1 ? "orden" : "órdenes"} de compra`, icon: 'truck', link: '#/compras' })}
        ${C.kpi({ label: 'Ingresos', value: fmt.money(ing), sub: `<span class="amount-in">${caja.filter((k) => k.tipo === 'ingreso').length} movimientos de caja</span>`, icon: 'arrowDown', tone: 'good', link: '#/caja' })}
        ${C.kpi({ label: 'Egresos', value: fmt.money(egr), sub: `<span class="amount-out">${caja.filter((k) => k.tipo === 'egreso').length} movimientos</span> · saldo ${fmt.money(ing - egr)}`, icon: 'arrowUp', link: '#/caja' })}
        ${C.kpi({ label: 'Utilidad estimada', value: fmt.money(util), sub: `Margen ${totV ? fmt.pct(util / totV) : '—'} sobre ventas`, icon: 'trendUp', tone: 'good', link: '#/reportes' })}
        ${C.kpi({ label: 'Productos registrados', value: fmt.num(activos.length), sub: `${S.db.categorias.length} categorías · ${new Set(activos.map((x) => x.marca).filter(Boolean)).size} marcas`, icon: 'package', link: '#/productos' })}
        ${C.kpi({ label: 'Productos con stock bajo', value: fmt.num(low.length), sub: low.length ? `${low.filter((l) => l.cantidad <= 0).length} sin existencias · revisar reposición` : 'Todo en orden', icon: 'alert', tone: low.length ? 'alert' : '', link: '#/inventario?f=bajo' })}
        ${C.kpi({ label: 'Valor del inventario', value: fmt.money(valorInv), sub: 'A costo de compra', icon: 'box', link: '#/inventario' })}
      </div>

      <div class="grid g-21">
        <div class="card"><div class="card-head"><div><h3>Compras vs. ventas por mes</h3><small>Últimos 6 meses · Bs</small></div><div class="actions"><div class="legend" id="lgVC"></div></div></div><div class="card-body"><div id="chVC"></div></div></div>
        <div class="card"><div class="card-head"><div><h3>Ventas por sucursal</h3><small>${esc(plabel)}</small></div></div><div class="card-body"><div id="chSuc"></div></div></div>
      </div>

      <div class="grid g-21">
        <div class="card"><div class="card-head"><div><h3>Ingresos y egresos de caja</h3><small>Últimos 6 meses · Bs</small></div><div class="actions"><div class="legend" id="lgIE"></div></div></div><div class="card-body"><div id="chIE"></div></div></div>
        <div class="card"><div class="card-head"><div><h3>Ventas por categoría</h3><small>Por importe · ${esc(plabel)}</small></div><div class="actions"><a class="btn btn-ghost btn-sm" href="#/reportes">Reportes${icon('chevronRight', 'sm')}</a></div></div><div class="card-body"><div id="chCat"></div></div></div>
      </div>

      ${S.ui.sucursal === '*' ? `<div class="card"><div class="card-head"><div><h3>Comparación entre sucursales</h3><small>${esc(plabel)}</small></div></div><div class="card-body" style="padding:0"><div id="cmpSuc"></div></div></div>` : ''}

      <div class="grid g-3">
        <div class="card"><div class="card-head"><div><h3>Productos más vendidos</h3><small>Por importe · ${esc(plabel)}</small></div></div><div class="card-body"><div id="chTop"></div></div></div>
        <div class="card"><div class="card-head"><div><h3>Alertas de inventario</h3><small>Bajo el stock mínimo</small></div><div class="actions"><a class="btn btn-ghost btn-sm" href="#/inventario?f=bajo">Inventarios${icon('chevronRight', 'sm')}</a></div></div>
          <ul class="list-plain">${low.slice(0, 6).map((l) => `<li><span><b>${esc(l.producto.nombre)}</b><small>${esc(l.sucursal.nombre)} · mínimo ${fmt.qty(l.minimo)} ${esc(l.producto.unidad)}</small></span><span class="badge ${l.cantidad <= 0 ? 'critical' : 'warning'}">${fmt.qty(l.cantidad)} ${esc(l.producto.unidad)}</span></li>`).join('') || `<li>${TOR.ui.emptyState({ icon: 'checkCircle', title: 'Sin alertas' })}</li>`}</ul></div>
        <div class="card"><div class="card-head"><div><h3>Órdenes de compra por recibir</h3><small>Mercadería pedida a proveedores</small></div><div class="actions"><a class="btn btn-ghost btn-sm" href="#/compras">Compras${icon('chevronRight', 'sm')}</a></div></div>
          <ul class="list-plain">${porRecibir.slice(0, 6).map((c) => `<li style="cursor:pointer" data-href="#/compras/${c.id}"><span><b class="mono">${esc(c.codigo)}</b> ${esc(S.prov(c.proveedor).nombre)}<small>${esc(S.suc(c.sucursal).nombre)} · ${fmt.date(c.fecha)} · ${fmt.money(c.total)}</small></span>${TOR.app.badge(L.estadoCompra[c.estado], L.claseCompra[c.estado])}</li>`).join('') || `<li>${TOR.ui.emptyState({ icon: 'checkCircle', title: 'Sin órdenes pendientes', text: 'Toda la mercadería pedida ya fue recibida.' })}</li>`}</ul></div>
      </div>

      <div class="card"><div class="card-head"><div><h3>Actividad reciente</h3><small>Registro básico de acciones de los usuarios</small></div></div>
        <ul class="list-plain">${S.db.actividad.slice(0, 8).map((a) => `<li><span><b>${esc(a.accion)}</b><small>${esc(S.user(a.usuario) ? S.user(a.usuario).nombre : a.usuario)} · ${esc(TOR.app.ROUTES[a.modulo] ? TOR.app.ROUTES[a.modulo].label : a.modulo)}</small></span><small class="muted nowrap">${fmt.dateTime(a.fecha)}</small></li>`).join('')}</ul></div>`;

    el.querySelector('[data-seg="periodo"]').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) { st.periodo = b.dataset.v; TOR.app.render(); } });
    C.bindLinks(el);
    charts(el, p, ventas);
  }

  function charts(el, p, ventasPeriodo) {
    const months = Q.monthKeys(6);
    const labels = months.map((m) => fmt.month(m));
    const vMes = months.map((m) => Q.sumBy(Q.ventas().filter((v) => Q.monthKey(v.fecha) === m), (v) => v.total));
    const cMes = months.map((m) => Q.sumBy(Q.compras().filter((c) => Q.monthKey(c.fecha) === m), (c) => c.total));
    const money = (v) => fmt.money(v);
    const sVC = [{ name: 'Ventas', values: vMes, color: 'var(--series-1)' }, { name: 'Compras', values: cMes, color: 'var(--series-2)' }];
    TOR.charts.legend(el.querySelector('#lgVC'), sVC);
    TOR.charts.responsive(el.querySelector('#chVC'), () => TOR.charts.bars(el.querySelector('#chVC'), { labels, series: sVC, grouped: true, height: 250, fmt: money, label: 'Compras y ventas por mes' }));

    const mov = S.scoped(S.db.caja.movimientos);
    const sIE = [
      { name: 'Ingresos', values: months.map((m) => Q.sumBy(mov.filter((k) => k.tipo === 'ingreso' && Q.monthKey(k.fecha) === m), (k) => k.monto)), color: 'var(--series-1)' },
      { name: 'Egresos', values: months.map((m) => Q.sumBy(mov.filter((k) => k.tipo === 'egreso' && Q.monthKey(k.fecha) === m), (k) => k.monto)), color: 'var(--series-2)' }
    ];
    TOR.charts.legend(el.querySelector('#lgIE'), sIE);
    TOR.charts.responsive(el.querySelector('#chIE'), () => TOR.charts.line(el.querySelector('#chIE'), { labels, series: sIE, height: 230, fmt: money, area: true, label: 'Ingresos y egresos por mes' }));

    // Ventas por sucursal: todas las sucursales que el usuario puede ver, en el período elegido.
    const COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--steel-400)', 'var(--steel-800)'];
    const visibles = S.db.sucursales.filter((s) => TOR.app.userBranches().includes(s.id));
    const porSuc = visibles.map((s, i) => ({ label: s.nombre, value: Q.sumBy(S.db.ventas.filter((v) => v.sucursal === s.id && v.estado !== 'anulada' && Q.inRange(v.fecha, p)), (v) => v.total), color: COLORS[i % COLORS.length] }));
    TOR.charts.donut(el.querySelector('#chSuc'), { items: porSuc, center: TOR.charts.shortNum(Q.sumBy(porSuc, (x) => x.value)), sub: 'Bs vendidos', fmt: money, label: 'Ventas por sucursal' });

    const cat = {};
    const top = {};
    ventasPeriodo.forEach((v) => {
      const k = v.descuento && v.subtotal ? (v.subtotal - v.descuento) / v.subtotal : 1;
      v.items.forEach((it) => { const pr = S.prod(it.producto); const val = it.cantidad * it.precio * k; cat[pr.categoria] = (cat[pr.categoria] || 0) + val; top[pr.id] = (top[pr.id] || 0) + val; });
    });
    TOR.charts.hbars(el.querySelector('#chCat'), Object.entries(cat).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value })), { fmt: money, color: 'var(--series-2)' });
    TOR.charts.hbars(el.querySelector('#chTop'), Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, v]) => ({ label: S.prod(id).nombre, value: v })), { fmt: money, color: 'var(--series-1)' });

    const cmp = el.querySelector('#cmpSuc');
    if (cmp) {
      const rows = S.db.sucursales.map((s) => {
        const vs = S.db.ventas.filter((v) => v.sucursal === s.id && v.estado !== 'anulada' && Q.inRange(v.fecha, p));
        const cs = S.db.compras.filter((c) => c.sucursal === s.id && c.estado !== 'anulada' && Q.inRange(c.fecha, p));
        const val = S.db.productos.reduce((t, x) => t + S.stockOf(s.id, x.id) * x.costo, 0);
        const bajo = S.db.productos.filter((x) => x.activo && S.stockOf(s.id, x.id) <= S.minOf(x.id, s.id)).length;
        return { s, ventas: Q.sumBy(vs, (v) => v.total), n: vs.length, compras: Q.sumBy(cs, (c) => c.total), util: Q.sumBy(vs, Q.margenVenta), bajo, stock: val };
      });
      const max = Math.max(...rows.map((r) => r.ventas), 1);
      C.dataTable(cmp, {
        id: 'dash-suc', pageSize: 10, rows,
        columns: [
          { key: 's', label: 'Sucursal', render: (r) => `<b>${esc(r.s.nombre)}</b><span class="sub">${r.n} ventas</span>` },
          { key: 'ventas', label: 'Ventas', align: 'right', sort: (r) => r.ventas, render: (r) => `${fmt.money(r.ventas)}<div class="stock-bar" style="margin-top:4px;width:120px;margin-left:auto"><span style="width:${(r.ventas / max) * 100}%"></span></div>` },
          { key: 'compras', label: 'Compras', align: 'right', sort: (r) => r.compras, render: (r) => fmt.money(r.compras) },
          { key: 'util', label: 'Utilidad estimada', align: 'right', sort: (r) => r.util, render: (r) => fmt.money(r.util) },
          { key: 'bajo', label: 'Stock bajo', align: 'right', sort: (r) => r.bajo, render: (r) => (r.bajo ? `<span style="color:var(--warning-ink);font-weight:600">${r.bajo}</span>` : '0') },
          { key: 'stock', label: 'Valor del inventario', align: 'right', sort: (r) => r.stock, render: (r) => fmt.money(r.stock) }
        ],
        onRow: (r) => { S.setUI({ sucursal: r.s.id }); document.getElementById('branchSelect').value = r.s.id; }
      });
    }
  }

  TOR.views.dashboard = { render };
})();
