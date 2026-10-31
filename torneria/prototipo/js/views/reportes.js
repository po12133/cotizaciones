(function () {
  const TOR = window.TOR;
  const S = TOR.store, Q = TOR.q, C = TOR.cmp, L = TOR.labels, A = TOR.app;
  const { esc, fmt } = TOR.ui;
  const icon = TOR.icon;
  const st = C.state('reportes', { tipo: 'ventas', periodo: 'mes' });
  const TIPOS = [
    ['ventas', 'Ventas', 'cart', 'Ventas por día, cliente y método de pago'],
    ['compras', 'Compras', 'truck', 'Compras por proveedor y sucursal'],
    ['inventario', 'Inventario', 'box', 'Existencias valorizadas y alertas'],
    ['movimientos', 'Movimientos', 'swap', 'Entradas, salidas y ajustes'],
    ['sucursales', 'Por sucursal', 'branches', 'Comparativo entre sucursales'],
    ['ordenes', 'Órdenes de trabajo', 'wrench', 'Trabajos por estado y responsable']
  ];
  const money = (v) => fmt.money(v);

  function build(tipo, p) {
    const sucNom = (id) => S.suc(id).nombre;
    if (tipo === 'ventas') {
      const v = Q.ventas().filter((x) => Q.inRange(x.fecha, p));
      const met = {};
      v.forEach((x) => { met[x.metodo] = (met[x.metodo] || 0) + x.total; });
      return {
        summary: [['Ventas', String(v.length)], ['Total', money(Q.sumBy(v, (x) => x.total))], ['Descuentos', money(Q.sumBy(v, (x) => x.descuento))], ['Utilidad estimada', money(Q.sumBy(v, Q.margenVenta))]],
        chart: { kind: 'hbars', title: 'Ventas por método de pago', items: Object.entries(met).sort((a, b) => b[1] - a[1]).map(([k, val]) => ({ label: L.metodo[k], value: val })) },
        head: ['Código', 'Fecha', 'Cliente', 'Sucursal', 'Método', 'Estado', 'Descuento', 'Total'], right: [6, 7],
        rows: v.map((x) => [x.codigo, fmt.date(x.fecha), S.cli(x.cliente).nombre, sucNom(x.sucursal), L.metodo[x.metodo], L.estadoVenta[x.estado], money(x.descuento), money(x.total)]),
        csv: v.map((x) => [x.codigo, x.fecha.slice(0, 10), S.cli(x.cliente).nombre, sucNom(x.sucursal), L.metodo[x.metodo], L.estadoVenta[x.estado], C.n2(x.descuento), C.n2(x.total)])
      };
    }
    if (tipo === 'compras') {
      const c = Q.compras().filter((x) => Q.inRange(x.fecha, p));
      const prov = {};
      c.forEach((x) => { prov[x.proveedor] = (prov[x.proveedor] || 0) + x.total; });
      return {
        summary: [['Órdenes', String(c.length)], ['Total', money(Q.sumBy(c, (x) => x.total))], ['Por recibir', String(c.filter((x) => x.estado === 'pendiente').length)], ['A crédito', money(Q.sumBy(c.filter((x) => x.pago === 'credito'), (x) => x.total))]],
        chart: { kind: 'hbars', title: 'Compras por proveedor', color: 'var(--series-2)', items: Object.entries(prov).sort((a, b) => b[1] - a[1]).map(([k, val]) => ({ label: S.prov(k).nombre, value: val })) },
        head: ['Código', 'Fecha', 'Proveedor', 'Sucursal', 'Estado', 'Pago', 'Total'], right: [6],
        rows: c.map((x) => [x.codigo, fmt.date(x.fecha), S.prov(x.proveedor).nombre, sucNom(x.sucursal), L.estadoCompra[x.estado], x.pago === 'credito' ? (x.pagado ? 'Crédito (pagado)' : 'Crédito (pendiente)') : 'Contado', money(x.total)]),
        csv: c.map((x) => [x.codigo, x.fecha.slice(0, 10), S.prov(x.proveedor).nombre, sucNom(x.sucursal), L.estadoCompra[x.estado], x.pago, C.n2(x.total)])
      };
    }
    if (tipo === 'inventario') {
      const sucs = S.db.sucursales.filter((s) => S.inScope(s.id));
      const list = [];
      sucs.forEach((s) => S.db.productos.filter((x) => x.tipo !== 'servicio').forEach((pr) => { const q = S.stockOf(s.id, pr.id); list.push({ s, pr, q, min: S.minOf(pr.id, s.id), val: q * pr.costo }); }));
      const cat = {};
      list.forEach((x) => { cat[x.pr.categoria] = (cat[x.pr.categoria] || 0) + x.val; });
      return {
        summary: [['Ítems', String(list.length)], ['Valor total', money(Q.sumBy(list, (x) => x.val))], ['Stock bajo', String(list.filter((x) => x.q <= x.min).length)], ['Sin stock', String(list.filter((x) => x.q <= 0).length)]],
        chart: { kind: 'hbars', title: 'Valor del inventario por categoría', items: Object.entries(cat).sort((a, b) => b[1] - a[1]).map(([k, val]) => ({ label: k, value: val })) },
        head: ['SKU', 'Producto', 'Sucursal', 'Stock', 'Mínimo', 'Costo unit.', 'Valor', 'Alerta'], right: [3, 4, 5, 6],
        rows: list.map((x) => [x.pr.sku, x.pr.nombre, x.s.nombre, `${fmt.qty(x.q)} ${x.pr.unidad}`, fmt.qty(x.min), money(x.pr.costo), money(x.val), x.q <= 0 ? 'Sin stock' : x.q <= x.min ? 'Bajo' : 'Normal']),
        csv: list.map((x) => [x.pr.sku, x.pr.nombre, x.s.nombre, C.n2(x.q), x.min, C.n2(x.pr.costo), C.n2(x.val), x.q <= 0 ? 'Sin stock' : x.q <= x.min ? 'Bajo' : 'Normal'])
      };
    }
    if (tipo === 'movimientos') {
      const m = S.db.movimientos.filter((x) => S.inScope(x.sucursal) && Q.inRange(x.fecha, p)).slice().reverse();
      const ori = {};
      m.forEach((x) => { ori[x.origen] = (ori[x.origen] || 0) + 1; });
      return {
        summary: [['Movimientos', String(m.length)], ['Entradas', String(m.filter((x) => x.cantidad > 0).length)], ['Salidas', String(m.filter((x) => x.cantidad < 0).length)], ['Ajustes', String(ori.ajuste || 0)]],
        chart: { kind: 'hbars', title: 'Movimientos por tipo', fmtN: true, items: Object.entries(ori).sort((a, b) => b[1] - a[1]).map(([k, val]) => ({ label: L.origenMov[k] || k, value: val })) },
        head: ['Fecha', 'Tipo', 'Referencia', 'Producto', 'Sucursal', 'Cantidad', 'Saldo'], right: [5, 6],
        rows: m.map((x) => [fmt.dateTime(x.fecha), L.origenMov[x.origen] || x.origen, x.ref, S.prod(x.producto).nombre, sucNom(x.sucursal), `${x.cantidad > 0 ? '+' : ''}${fmt.qty(x.cantidad)}`, fmt.qty(x.saldo)]),
        csv: m.map((x) => [x.fecha.replace('T', ' '), L.origenMov[x.origen] || x.origen, x.ref, S.prod(x.producto).sku, sucNom(x.sucursal), C.n2(x.cantidad), C.n2(x.saldo)])
      };
    }
    if (tipo === 'sucursales') {
      const rows = S.db.sucursales.filter((s) => S.inScope(s.id)).map((s) => {
        const v = S.db.ventas.filter((x) => x.sucursal === s.id && x.estado !== 'anulada' && Q.inRange(x.fecha, p));
        const c = S.db.compras.filter((x) => x.sucursal === s.id && x.estado !== 'anulada' && Q.inRange(x.fecha, p));
        const k = S.db.caja.movimientos.filter((x) => x.sucursal === s.id && Q.inRange(x.fecha, p));
        const o = S.db.ordenes.filter((x) => x.sucursal === s.id && Q.inRange(x.ingreso, p));
        return { s, v: Q.sumBy(v, (x) => x.total), n: v.length, c: Q.sumBy(c, (x) => x.total), u: Q.sumBy(v, Q.margenVenta), ing: Q.sumBy(k.filter((x) => x.tipo === 'ingreso'), (x) => x.monto), egr: Q.sumBy(k.filter((x) => x.tipo === 'egreso'), (x) => x.monto), ot: o.length };
      });
      return {
        summary: [['Sucursales', String(rows.length)], ['Ventas', money(Q.sumBy(rows, (r) => r.v))], ['Compras', money(Q.sumBy(rows, (r) => r.c))], ['Utilidad estimada', money(Q.sumBy(rows, (r) => r.u))]],
        chart: { kind: 'bars', title: 'Ventas y compras por sucursal', labels: rows.map((r) => r.s.nombre), series: [{ name: 'Ventas', values: rows.map((r) => r.v), color: 'var(--series-1)' }, { name: 'Compras', values: rows.map((r) => r.c), color: 'var(--series-2)' }] },
        head: ['Sucursal', 'N.º ventas', 'Ventas', 'Compras', 'Utilidad est.', 'Ingresos caja', 'Egresos caja', 'OT ingresadas'], right: [1, 2, 3, 4, 5, 6, 7],
        rows: rows.map((r) => [r.s.nombre, String(r.n), money(r.v), money(r.c), money(r.u), money(r.ing), money(r.egr), String(r.ot)]),
        csv: rows.map((r) => [r.s.nombre, r.n, C.n2(r.v), C.n2(r.c), C.n2(r.u), C.n2(r.ing), C.n2(r.egr), r.ot])
      };
    }
    const o = S.scoped(S.db.ordenes).filter((x) => Q.inRange(x.ingreso, p));
    const resp = {};
    o.forEach((x) => { resp[x.responsable] = (resp[x.responsable] || 0) + 1; });
    return {
      summary: [['Órdenes', String(o.length)], ['Entregadas', String(o.filter((x) => x.estado === 'entregada').length)], ['Atrasadas', String(o.filter(Q.otAtrasada).length)], ['Facturado est.', money(Q.sumBy(o.filter((x) => x.estado !== 'cancelada'), (x) => x.precio))]],
      chart: { kind: 'hbars', title: 'Órdenes por responsable', fmtN: true, items: Object.entries(resp).sort((a, b) => b[1] - a[1]).map(([k, val]) => ({ label: S.user(k).nombre, value: val })) },
      head: ['Código', 'Cliente', 'Trabajo', 'Responsable', 'Sucursal', 'Ingreso', 'Entrega', 'Estado', 'Costo est.', 'Precio'], right: [8, 9],
      rows: o.map((x) => [x.codigo, S.cli(x.cliente).nombre, x.descripcion, S.user(x.responsable).nombre, sucNom(x.sucursal), fmt.date(x.ingreso), fmt.date(x.entrega), L.estadoOT[x.estado], money(x.costoEstimado), money(x.precio)]),
      csv: o.map((x) => [x.codigo, S.cli(x.cliente).nombre, x.descripcion, S.user(x.responsable).nombre, sucNom(x.sucursal), x.ingreso.slice(0, 10), x.entrega, L.estadoOT[x.estado], C.n2(x.costoEstimado), C.n2(x.precio)])
    };
  }

  function render(el) {
    const r = build(st.tipo, st.periodo);
    const tipo = TIPOS.find((t) => t[0] === st.tipo);
    const per = Q.PERIODOS.find((x) => x[0] === st.periodo)[1];
    const scope = S.ui.sucursal === '*' ? 'Todas las sucursales' : S.suc(S.ui.sucursal).nombre;
    el.innerHTML = `
      <div class="page-head"><div><p class="lead">Elija un reporte, el período y la sucursal (selector superior). Todos se exportan a PDF y Excel con los mismos datos que se ven en pantalla.</p></div>
        <div class="actions"><select class="select" id="rPer" aria-label="Período" style="width:auto">${Q.PERIODOS.map(([k, l]) => `<option value="${k}" ${st.periodo === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <button class="btn btn-outline" id="rCsv">${icon('excel', 'sm')}Excel</button><button class="btn btn-primary" id="rPdf">${icon('download', 'sm')}PDF</button></div></div>
      <div class="report-types">${TIPOS.map(([k, l, ic, d]) => `<button class="rtype ${st.tipo === k ? 'on' : ''}" data-rt="${k}">${icon(ic)}<b>${l}</b><small>${d}</small></button>`).join('')}</div>
      <div class="kpis">${r.summary.map(([k, v]) => C.kpi({ label: k, value: esc(v), icon: tipo[2] })).join('')}</div>
      <div class="grid g-12">
        <div class="card"><div class="card-head"><div><h3>${esc(r.chart.title)}</h3><small>${esc(per)} · ${esc(scope)}</small></div>${r.chart.series ? '<div class="actions"><div class="legend" id="rLg"></div></div>' : ''}</div><div class="card-body"><div id="rChart"></div></div></div>
        <div class="card"><div class="card-head"><div><h3>Reporte de ${esc(tipo[1].toLowerCase())}</h3><small>${r.rows.length} filas · ${esc(per)} · ${esc(scope)}</small></div></div><div id="rTable"></div></div>
      </div>`;
    const ch = el.querySelector('#rChart');
    if (r.chart.kind === 'bars') { TOR.charts.legend(el.querySelector('#rLg'), r.chart.series); TOR.charts.responsive(ch, () => TOR.charts.bars(ch, { labels: r.chart.labels, series: r.chart.series, grouped: true, height: 260, fmt: money })); }
    else TOR.charts.hbars(ch, r.chart.items, { fmt: r.chart.fmtN ? (v) => fmt.num(v) : money, color: r.chart.color || 'var(--series-1)' });
    C.dataTable(el.querySelector('#rTable'), { id: `rep-${st.tipo}`, rows: r.rows, pageSize: 12, empty: { icon: 'file', title: 'Sin datos para el período' }, columns: r.head.map((h, i) => ({ key: String(i), label: h, align: r.right.includes(i) ? 'right' : '', render: (row) => esc(row[i]) })) });
    el.querySelectorAll('[data-rt]').forEach((b) => b.addEventListener('click', () => { st.tipo = b.dataset.rt; A.render(); }));
    el.querySelector('#rPer').addEventListener('change', (e) => { st.periodo = e.target.value; A.render(); });
    const file = `reporte-${st.tipo}-${st.periodo}-${S.today()}`;
    el.querySelector('#rCsv').addEventListener('click', () => { C.csv(`${file}.csv`, r.head, r.csv); TOR.ui.toast('Reporte exportado a Excel', { text: `${file}.csv` }); });
    el.querySelector('#rPdf').addEventListener('click', async (e) => {
      const b = e.currentTarget; b.disabled = true;
      try { await C.pdfReport({ title: `Reporte de ${tipo[1].toLowerCase()}`, subtitle: `${per} · ${scope}`, summary: r.summary, head: r.head, rows: r.rows, rightCols: r.right, file: `${file}.pdf` }); TOR.ui.toast('Reporte PDF descargado', { text: `${file}.pdf` }); }
      catch (err) { TOR.ui.toast('No se pudo generar el PDF', { text: err.message, type: 'critical' }); }
      finally { b.disabled = false; }
    });
  }

  TOR.views.reportes = { render, build };
})();
