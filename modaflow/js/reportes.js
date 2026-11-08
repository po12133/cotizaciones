/*
 * Reportes calculados a partir de las ventas y movimientos registrados en la demostración (no hay cifras fijas).
 * Básico: resumen, ventas por fecha y productos vendidos. Avanzados (Prueba, Pro, Premium): más vendidos,
 * categorías, métodos de pago, comparación de periodos y movimientos. Premium: comparación de sucursales.
 */
(function () {
  const MF = window.MF;
  const D = MF.demo;
  const { esc, money } = MF;
  const st = { period: 'mes', from: '', to: '' };
  const PERIODS = [['hoy', 'Hoy'], ['ayer', 'Ayer'], ['semana', 'Esta semana'], ['7d', 'Últimos 7 días'], ['quincena', 'Quincena'], ['mes', 'Este mes'], ['mesant', 'Mes anterior'], ['anio', 'Este año'], ['rango', 'Rango']];
  const PALETTE = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', '#9b8cf7', '#c8c3da'];
  const DAY = 864e5;
  const sod = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const iso = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };

  /** Rango [from, to) del periodo elegido y su etiqueta. */
  function range(p) {
    const now = new Date();
    const today = sod(now);
    const tomorrow = new Date(today.getTime() + DAY);
    switch (p) {
      case 'hoy': return { from: today, to: tomorrow, label: 'Hoy' };
      case 'ayer': return { from: new Date(today.getTime() - DAY), to: today, label: 'Ayer' };
      case 'semana': { const dow = (today.getDay() + 6) % 7; return { from: new Date(today.getTime() - dow * DAY), to: tomorrow, label: 'Esta semana' }; }
      case '7d': return { from: new Date(today.getTime() - 6 * DAY), to: tomorrow, label: 'Últimos 7 días' };
      case 'quincena': {
        const first = today.getDate() <= 15;
        const from = new Date(today.getFullYear(), today.getMonth(), first ? 1 : 16);
        return { from, to: tomorrow, label: first ? 'Primera quincena del mes' : 'Segunda quincena del mes' };
      }
      case 'mes': return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: tomorrow, label: 'Este mes' };
      case 'mesant': return { from: new Date(today.getFullYear(), today.getMonth() - 1, 1), to: new Date(today.getFullYear(), today.getMonth(), 1), label: 'Mes anterior' };
      case 'anio': return { from: new Date(today.getFullYear(), 0, 1), to: tomorrow, label: 'Este año' };
      case 'rango': {
        const f = st.from ? sod(st.from + 'T00:00') : new Date(today.getTime() - 13 * DAY);
        const t = st.to ? new Date(sod(st.to + 'T00:00').getTime() + DAY) : tomorrow;
        return { from: f, to: t > f ? t : new Date(f.getTime() + DAY), label: `Del ${MF.fdate(f)} al ${MF.fdate(new Date((t > f ? t : new Date(f.getTime() + DAY)).getTime() - DAY))}` };
      }
      default: return range('mes');
    }
  }
  /** Periodo anterior de la misma duración (para comparar). */
  function previous(r) {
    const len = r.to - r.from;
    if (st.period === 'mes' || st.period === 'mesant') {
      const f = new Date(r.from.getFullYear(), r.from.getMonth() - 1, 1);
      const days = Math.round((Math.min(r.to, Date.now() + DAY) - r.from) / DAY);
      return { from: f, to: new Date(f.getTime() + days * DAY) };
    }
    return { from: new Date(r.from.getTime() - len), to: new Date(r.from) };
  }

  function salesIn(r, all) {
    const brs = MF.can('sucursales') && all ? MF.branches().map((b) => b.id) : [MF.branchId()];
    return MF.get().sales.filter((s) => s.status === 'completada' && brs.includes(s.branchId) && new Date(s.date) >= r.from && new Date(s.date) < r.to);
  }
  function summarize(sales) {
    const total = sales.reduce((a, s) => a + s.total, 0);
    const unitsN = sales.reduce((a, s) => a + s.items.reduce((x, i) => x + i.qty, 0), 0);
    const disc = sales.reduce((a, s) => a + MF.saleDiscount(s), 0);
    const withCost = sales.some((s) => s.items.some((i) => i.cost));
    const cost = sales.reduce((a, s) => a + s.items.reduce((x, i) => x + (i.cost || 0) * i.qty, 0), 0);
    return { total, count: sales.length, units: unitsN, disc, profit: withCost ? total - cost : null, avg: sales.length ? total / sales.length : 0 };
  }
  /** Serie para el gráfico de evolución: por hora (1 día), por día (hasta 62 días) o por mes. */
  function series(r, sales, prevSales, prevR) {
    const days = Math.round((r.to - r.from) / DAY);
    const out = [];
    const sumIn = (arr, a, b) => arr.filter((s) => { const t = new Date(s.date).getTime(); return t >= a && t < b; }).reduce((x, s) => x + s.total, 0);
    const shift = prevR ? r.from - prevR.from : 0;
    if (days <= 1) {
      for (let h = 8; h <= 21; h++) { const a = r.from.getTime() + h * 36e5, b = a + 36e5; out.push({ label: h + 'h', value: sumIn(sales, a, b), value2: prevSales ? sumIn(prevSales, a - shift, b - shift) : undefined }); }
    } else if (days <= 62) {
      for (let t = r.from.getTime(); t < r.to.getTime(); t += DAY) { const d = new Date(t); out.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, value: sumIn(sales, t, t + DAY), value2: prevSales ? sumIn(prevSales, t - shift, t + DAY - shift) : undefined }); }
    } else {
      const M = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      for (let m = new Date(r.from); m < r.to; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) { const nx = new Date(m.getFullYear(), m.getMonth() + 1, 1); out.push({ label: M[m.getMonth()], value: sumIn(sales, m.getTime(), nx.getTime()) }); }
    }
    return out;
  }
  function byProduct(sales) {
    const prod = {};
    sales.forEach((s) => s.items.forEach((i) => { const k = i.productId; prod[k] = prod[k] || { name: i.name, qty: 0, total: 0, profit: 0 }; prod[k].qty += i.qty; prod[k].total += i.price * i.qty - (i.discount || 0); prod[k].profit += (i.price - (i.cost || 0)) * i.qty - (i.discount || 0); }));
    return Object.values(prod).sort((a, b) => b.qty - a.qty || b.total - a.total);
  }
  function byKey(sales, keyFn) {
    const o = {};
    sales.forEach((s) => s.items.forEach((i) => { const k = keyFn(i, s); o[k] = (o[k] || 0) + i.price * i.qty - (i.discount || 0); }));
    return Object.entries(o).sort((a, b) => b[1] - a[1]);
  }
  function byDate(sales) {
    const o = {};
    sales.forEach((s) => { const k = iso(s.date); o[k] = o[k] || { n: 0, total: 0, units: 0 }; o[k].n++; o[k].total += s.total; o[k].units += s.items.reduce((a, i) => a + i.qty, 0); });
    return Object.entries(o).sort((a, b) => b[0].localeCompare(a[0]));
  }
  const pct = (a, b) => (b ? Math.round(((a - b) / b) * 100) : a ? 100 : 0);
  const trend = (a, b) => { const p = pct(a, b); return `<em class="${p >= 0 ? 'up' : 'down'}">${p >= 0 ? '▲' : '▼'} ${Math.abs(p)}% vs. anterior</em>`; };

  D.register({
    id: 'reportes', label: 'Reportes', icon: 'chart',
    sub: () => (MF.can('reportesAvanzados') ? 'Reportes avanzados' : 'Reportes básicos'),
    render(view) {
      const adv = MF.can('reportesAvanzados');
      const all = MF.can('reportesComparativos');
      const r = range(st.period);
      const pr = previous(r);
      const sales = salesIn(r, all);
      const prevSales = salesIn(pr, all);
      const S = summarize(sales);
      const P = summarize(prevSales);
      const ser = series(r, sales, adv ? prevSales : null, pr);
      const top = byProduct(sales);
      const cats = byKey(sales, (i) => (MF.product(i.productId) || {}).category || 'Otros');
      const methods = Object.entries(MF.PAY).map(([k, l], i) => ({ label: l, value: sales.filter((s) => s.method === k).reduce((a, s) => a + s.total, 0), color: PALETTE[i] })).filter((x) => x.value);
      const moves = (MF.get().movements || []).filter((m) => new Date(m.date) >= r.from && new Date(m.date) < r.to && (all || m.branchId === MF.branchId()));
      const movSum = Object.keys(MF.MOVE_TYPES).map((k) => { const ms = moves.filter((m) => m.type === k); return { k, label: MF.MOVE_TYPES[k], n: ms.length, units: ms.reduce((a, m) => a + m.qty, 0) }; }).filter((x) => x.n);
      const dates = byDate(sales);
      const every = ser.length > 16 ? Math.ceil(ser.length / 8) : 1;

      view.innerHTML = `
        <div class="chips-row scroll-x period-chips">${PERIODS.map(([k, l]) => `<button class="fchip ${st.period === k ? 'on' : ''}" data-per="${k}">${l}</button>`).join('')}</div>
        ${st.period === 'rango' ? `<div class="range-pick"><label>Desde <input type="date" id="rf" value="${st.from || iso(r.from)}"></label><label>Hasta <input type="date" id="rt" value="${st.to || iso(new Date(r.to - DAY))}"></label></div>` : ''}
        <p class="period-label">${MF.icon('calendar', 'sm')} ${esc(r.label)} · ${MF.fdate(r.from)}${r.to - r.from > DAY ? ' – ' + MF.fdate(new Date(r.to - DAY)) : ''}${all ? ' · todas las sucursales' : ''}</p>
        <div class="kpis kpis-5">
          <div class="kpi"><small>Total vendido</small><b>${money(S.total)}</b>${adv ? trend(S.total, P.total) : ''}</div>
          <div class="kpi pink"><small>Ventas</small><b>${S.count}</b><em>ticket prom. ${money(S.avg)}</em></div>
          <div class="kpi mint"><small>Unidades vendidas</small><b>${S.units}</b>${adv ? trend(S.units, P.units) : ''}</div>
          <div class="kpi amber"><small>Descuentos aplicados</small><b>${money(S.disc)}</b></div>
          <div class="kpi"><small>Ganancia estimada</small><b>${S.profit == null ? '—' : money(S.profit)}</b><em>${S.profit == null ? 'Registre precios de compra' : `margen ${S.total ? Math.round((S.profit / S.total) * 100) : 0}%`}</em></div>
        </div>
        <div class="toolbar rep-exp"><span class="muted" style="font-size:.84rem">${adv ? 'Exportación completa' : 'Exportación básica (resumen y ventas por fecha)'}</span><span class="spacer"></span>
          <button class="btn ghost sm" id="xlsBtn">${MF.icon('download', 'sm')} Excel</button><button class="btn ghost sm" id="pdfBtn">${MF.icon('file', 'sm')} PDF</button></div>
        <div class="panel" style="margin-bottom:14px"><div class="panel-head"><h3>${adv ? 'Evolución y comparación de periodos' : 'Evolución de ventas'}</h3>
          <div class="chart-legend"><span><i style="background:var(--c1)"></i>Periodo actual</span>${adv && ser.some((x) => x.value2 != null) ? '<span><i style="background:var(--c2)"></i>Periodo anterior</span>' : ''}</div></div>
          ${S.count || P.count ? MF.charts.bars(ser, { h: 200, every, short: MF.charts.short, label2: 'periodo anterior' }) : '<div class="empty">Sin ventas en este periodo</div>'}
          ${adv ? '' : `<div style="margin-top:10px">${D.lockMini('reportesAvanzados', 'Comparación con el periodo anterior, categorías y métodos de pago')}</div>`}</div>
        <div class="grid g2">
          <div class="panel"><div class="panel-head"><h3>${adv ? 'Productos más vendidos' : 'Productos vendidos'}</h3><span class="sub">${top.length} productos</span></div>
            ${adv && top.length ? MF.charts.hbars(top.slice(0, 6).map((p) => ({ label: p.name, value: p.qty, sub: money(p.total) })), { fmt: (v) => v + ' u.' }) : ''}
            <ul class="list rank">${top.slice(0, adv ? 10 : 15).map((p, i) => `<li><span class="rk">${i + 1}</span><div class="grow"><b>${esc(p.name)}</b><small>${p.qty} u.${adv ? ' · ganancia ' + money(p.profit) : ''}</small></div><b>${money(p.total)}</b></li>`).join('') || '<li class="empty">Sin ventas</li>'}</ul></div>
          <div class="panel"><div class="panel-head"><h3>Ventas por fecha</h3></div>
            <ul class="list">${dates.slice(0, 14).map(([k, v]) => `<li><div class="grow"><b>${MF.fdate(k + 'T12:00')}</b><small>${v.n} ventas · ${v.units} u.</small></div><b>${money(v.total)}</b></li>`).join('') || '<li class="empty">Sin ventas</li>'}</ul></div>
          ${adv ? `<div class="panel"><div class="panel-head"><h3>Ventas por categoría</h3></div>${cats.length ? MF.charts.donut(cats.map(([l, v], i) => ({ label: l, value: v, color: PALETTE[i % PALETTE.length] })), { center: MF.charts.short(S.total), centerLabel: 'Bs' }) : '<div class="empty">Sin ventas</div>'}</div>
          <div class="panel"><div class="panel-head"><h3>Ventas por método de pago</h3></div>${methods.length ? MF.charts.donut(methods, { center: S.count, centerLabel: 'ventas' }) : '<div class="empty">Sin ventas</div>'}</div>
          <div class="panel"><div class="panel-head"><h3>Movimientos de inventario</h3>${MF.can('movimientos') ? '<a class="link-btn" href="#/movimientos">Ver detalle</a>' : ''}</div>
            <ul class="list">${movSum.map((x) => `<li><span class="mv-qty ${x.units >= 0 ? 'in' : 'out'}">${x.units > 0 ? '+' : ''}${x.units}</span><div class="grow"><b>${esc(x.label)}</b><small>${x.n} movimientos</small></div></li>`).join('') || '<li class="empty">Sin movimientos</li>'}</ul></div>
          <div class="panel"><div class="panel-head"><h3>Comparación con el periodo anterior</h3></div>
            <ul class="list">${[['Total vendido', money(S.total), money(P.total), pct(S.total, P.total)], ['Ventas', S.count, P.count, pct(S.count, P.count)], ['Unidades', S.units, P.units, pct(S.units, P.units)], ['Descuentos', money(S.disc), money(P.disc), pct(S.disc, P.disc)]].map(([l, a, b, p]) => `<li><div class="grow"><b>${l}</b><small>Antes: ${b}</small></div><b>${a}</b><span class="badge ${p >= 0 ? 'ok' : 'bad'}">${p >= 0 ? '+' : ''}${p}%</span></li>`).join('')}</ul></div>` : ''}
        </div>
        ${all ? branchCompare(r) : `<div style="margin-top:14px">${D.lockMini('reportesComparativos')}</div>`}`;
      view.querySelectorAll('[data-per]').forEach((b) => b.addEventListener('click', () => { st.period = b.dataset.per; D.rerender(); }));
      const rf = view.querySelector('#rf'), rt = view.querySelector('#rt');
      if (rf) { rf.addEventListener('change', () => { st.from = rf.value; D.rerender(); }); rt.addEventListener('change', () => { st.to = rt.value; D.rerender(); }); }
      const exp = { r, S, top, cats, methods, dates, movSum, adv };
      view.querySelector('#xlsBtn').addEventListener('click', () => exportXls(exp));
      view.querySelector('#pdfBtn').addEventListener('click', () => exportPdf(exp));
    }
  });

  function branchCompare(r) {
    const d = MF.get();
    const rows = MF.branches().map((b) => {
      const ss = d.sales.filter((s) => s.status === 'completada' && s.branchId === b.id && new Date(s.date) >= r.from && new Date(s.date) < r.to);
      const S = summarize(ss);
      const exp = d.expenses.filter((x) => x.branchId === b.id && new Date(x.date) >= r.from && new Date(x.date) < r.to).reduce((a, x) => a + x.amount, 0);
      return { b, S, exp };
    });
    return `<div class="panel" style="margin-top:14px"><div class="panel-head"><h3>Comparación de sucursales</h3><span class="sub">Premium</span></div>
      ${MF.charts.hbars(rows.map((x) => ({ label: x.b.name, value: x.S.total, sub: `${x.S.count} ventas` })))}
      <ul class="list">${rows.map((x) => `<li><div class="grow"><b>${esc(x.b.name)}</b><small>Ganancia ${x.S.profit == null ? '—' : money(x.S.profit)} · gastos ${money(x.exp)}</small></div><b>${money((x.S.profit || 0) - x.exp)}</b></li>`).join('')}</ul></div>`;
  }

  function summaryRows(e) {
    return [['Periodo', e.r.label], ['Total vendido', money(e.S.total)], ['Cantidad de ventas', String(e.S.count)], ['Unidades vendidas', String(e.S.units)],
      ['Descuentos aplicados', money(e.S.disc)], ['Ticket promedio', money(e.S.avg)], ['Ganancia estimada', e.S.profit == null ? 'Sin costos registrados' : money(e.S.profit)]];
  }
  function exportXls(e) {
    const rows = [[`Reporte de ventas · ${MF_CONFIG.store.name}`], ...summaryRows(e), [], ['Ventas por fecha'], ['Fecha', 'Ventas', 'Unidades', 'Total (Bs)'], ...e.dates.map(([k, v]) => [k, v.n, v.units, v.total])];
    if (e.adv) {
      rows.push([], ['Productos vendidos'], ['Producto', 'Unidades', 'Total (Bs)', 'Ganancia (Bs)'], ...e.top.map((p) => [p.name, p.qty, p.total, p.profit]));
      rows.push([], ['Ventas por categoría'], ['Categoría', 'Total (Bs)'], ...e.cats);
      rows.push([], ['Ventas por método de pago'], ['Método', 'Total (Bs)'], ...e.methods.map((m) => [m.label, m.value]));
      rows.push([], ['Movimientos de inventario'], ['Tipo', 'Movimientos', 'Unidades'], ...e.movSum.map((m) => [m.label, m.n, m.units]));
    }
    MF.downloadCSV(`reporte-${st.period}.csv`, rows);
    MF.toast(e.adv ? 'Reporte completo descargado (se abre con Excel)' : 'Reporte básico descargado. Excel completo: desde el plan Pro');
  }
  function exportPdf(e) {
    try {
      const sections = [{ title: 'Ventas por fecha', head: ['Fecha', 'Ventas', 'Unidades', 'Total'], body: e.dates.map(([k, v]) => [MF.fdate(k + 'T12:00'), v.n, v.units, money(v.total)]) }];
      if (e.adv) {
        sections.push({ title: 'Productos más vendidos', head: ['Producto', 'Unidades', 'Total', 'Ganancia'], body: e.top.slice(0, 25).map((p) => [p.name, p.qty, money(p.total), money(p.profit)]) });
        sections.push({ title: 'Ventas por categoría', head: ['Categoría', 'Total'], body: e.cats.map(([l, v]) => [l, money(v)]) });
        sections.push({ title: 'Ventas por método de pago', head: ['Método', 'Total'], body: e.methods.map((m) => [m.label, money(m.value)]) });
        sections.push({ title: 'Movimientos de inventario', head: ['Tipo', 'Movimientos', 'Unidades'], body: e.movSum.map((m) => [m.label, m.n, m.units]) });
      }
      MF.PDF.report({ title: e.adv ? 'Reporte de ventas' : 'Reporte básico de ventas', period: e.r.label, summary: summaryRows(e).slice(1), sections }).save(`reporte-${st.period}.pdf`);
      MF.toast('Reporte PDF descargado');
    } catch (err) { MF.toast(err.message, 'error'); }
  }
})();
