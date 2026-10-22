/* Estadísticas y reportes: indicadores por periodo, gráficos interactivos, tabla de datos y exportación. */
(function () {
  const { icon, ui, db, shell, charts } = window.WAB;
  const { esc, fmt } = ui;
  let days = 30;
  let showTable = false;

  shell.view.innerHTML = `
    <div class="page-head">
      <div><h2>Reportes</h2><p class="muted">Indicadores de atención, automatización, citas y ventas. Datos de demostración.</p></div>
      <div class="row wrap">
        <div class="segmented" id="range">${[[7, '7 días'], [30, '30 días'], [90, '90 días']].map(([d, l]) => `<button data-d="${d}" class="${d === days ? 'active' : ''}">${l}</button>`).join('')}</div>
        <button class="btn btn-sm" id="table-btn">${icon('list', 'sm')}Ver tabla</button>
        <button class="btn btn-sm" id="csv">${icon('download', 'sm')}CSV</button>
        <button class="btn btn-sm" id="print">${icon('printer', 'sm')}Imprimir</button>
      </div>
    </div>
    <div class="kpis" id="kpis"></div>
    <div class="kpis" id="kpis2"></div>
    <div id="charts" class="grid-dash"></div>`;
  const $ = (id) => document.getElementById(id);
  const sum = (a, k) => a.reduce((t, x) => t + x[k], 0);
  const avg = (a, k) => (a.length ? a.reduce((t, x) => t + x[k], 0) / a.length : 0);

  function bucket(rows) {
    if (rows.length <= 31) return rows.map((r) => Object.assign({ label: fmt.date(r.fecha, 'short').replace('.', ''), tip: fmt.date(r.fecha, 'weekday') }, r));
    const out = [];
    for (let i = 0; i < rows.length; i += 7) {
      const chunk = rows.slice(i, i + 7);
      const o = { label: fmt.date(chunk[0].fecha, 'short').replace('.', ''), tip: `Semana del ${fmt.date(chunk[0].fecha, 'short')} al ${fmt.date(chunk[chunk.length - 1].fecha, 'short')}` };
      ['conversaciones', 'mensajesEnviados', 'clientesNuevos', 'ia', 'humano', 'menu', 'citas', 'ventas', 'pedidos'].forEach((k) => { o[k] = sum(chunk, k); });
      o.respuestaHumano = +avg(chunk, 'respuestaHumano').toFixed(1);
      o.respuestaBot = +avg(chunk, 'respuestaBot').toFixed(1);
      out.push(o);
    }
    return out;
  }

  function kpi(label, cur, prev, f = fmt.num, invert = false) {
    const d = prev ? Math.round(((cur - prev) / prev) * 100) : 0;
    const good = invert ? d <= 0 : d >= 0;
    return `<div class="kpi"><span class="kpi-label">${esc(label)}</span><span class="kpi-value">${f(cur)}</span><span class="kpi-delta ${good ? 'up' : 'down'}">${icon(d >= 0 ? 'trendUp' : 'trendDown')}${d >= 0 ? '+' : ''}${d}% <span>vs. periodo anterior</span></span></div>`;
  }

  function topProducts() {
    const since = Date.now() - days * 864e5;
    const map = {};
    db.get('orders').filter((o) => o.estado !== 'cancelado' && new Date(o.creado).getTime() >= since).forEach((o) => o.items.forEach((i) => { map[i.nombre] = (map[i.nombre] || 0) + i.cantidad; }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value, sub: 'unidades' }));
  }

  function render() {
    const daily = db.get('daily');
    const cur = daily.slice(-days);
    const prev = daily.slice(-days * 2, -days);
    const conv = sum(cur, 'conversaciones');
    $('kpis').innerHTML = kpi('Conversaciones recibidas', conv, sum(prev, 'conversaciones'))
      + kpi('Mensajes enviados', sum(cur, 'mensajesEnviados'), sum(prev, 'mensajesEnviados'))
      + kpi('Clientes nuevos', sum(cur, 'clientesNuevos'), sum(prev, 'clientesNuevos'))
      + kpi('Ventas', sum(cur, 'ventas'), sum(prev, 'ventas'), (v) => fmt.money(v));
    $('kpis2').innerHTML = kpi('Atendidas por IA', Math.round((sum(cur, 'ia') / conv) * 100), Math.round((sum(prev, 'ia') / Math.max(1, sum(prev, 'conversaciones'))) * 100), (v) => `${v}%`)
      + kpi('Citas realizadas', sum(cur, 'citas'), sum(prev, 'citas'))
      + kpi('Respuesta del bot', +avg(cur, 'respuestaBot').toFixed(1), +avg(prev, 'respuestaBot').toFixed(1), (v) => `${String(v).replace('.', ',')} s`, true)
      + kpi('Respuesta humana', +avg(cur, 'respuestaHumano').toFixed(1), +avg(prev, 'respuestaHumano').toFixed(1), (v) => `${String(v).replace('.', ',')} min`, true);

    const rows = bucket(cur);
    const labels = rows.map((r) => r.label);
    const tips = rows.map((r) => r.tip);
    if (showTable) {
      $('charts').innerHTML = `<div class="card span-3"><div class="card-head"><h3>Datos del periodo</h3><span class="small muted">${rows.length > 31 ? 'Agrupado por semana' : 'Por día'}</span></div><div class="table-wrap"><table class="table"><thead><tr><th>Periodo</th><th class="num">Conversaciones</th><th class="num">IA</th><th class="num">Menús</th><th class="num">Asesor</th><th class="num">Clientes nuevos</th><th class="num">Citas</th><th class="num">Pedidos</th><th class="num">Ventas</th><th class="num">Resp. humana</th></tr></thead><tbody>
        ${rows.slice().reverse().map((r) => `<tr><td class="nowrap">${esc(r.tip)}</td><td class="num">${r.conversaciones}</td><td class="num">${r.ia}</td><td class="num">${r.menu}</td><td class="num">${r.humano}</td><td class="num">${r.clientesNuevos}</td><td class="num">${r.citas}</td><td class="num">${r.pedidos}</td><td class="num">${fmt.money(r.ventas)}</td><td class="num">${String(r.respuestaHumano).replace('.', ',')} min</td></tr>`).join('')}</tbody></table></div></div>`;
      return;
    }
    $('charts').innerHTML = `
      <div class="card span-2"><div class="card-head"><h3>Conversaciones recibidas</h3></div><div class="card-body"><div id="c1"></div></div></div>
      <div class="card"><div class="card-head"><h3>IA vs. atención humana</h3></div><div class="card-body"><div id="c2"></div></div></div>
      <div class="card span-2"><div class="card-head"><h3>Atención por tipo</h3><div class="legend"><span><i style="background:var(--series-1)"></i>IA</span><span><i style="background:var(--series-3)"></i>Menús</span><span><i style="background:var(--series-2)"></i>Asesor</span></div></div><div class="card-body"><div id="c3"></div></div></div>
      <div class="card"><div class="card-head"><h3>Productos más vendidos</h3></div><div class="card-body"><div id="c4"></div></div></div>
      <div class="card span-2"><div class="card-head"><h3>Ventas (Bs)</h3></div><div class="card-body"><div id="c5"></div></div></div>
      <div class="card"><div class="card-head"><h3>Citas realizadas</h3></div><div class="card-body"><div id="c6"></div></div></div>
      <div class="card span-2"><div class="card-head"><h3>Tiempo de respuesta humana (min)</h3></div><div class="card-body"><div id="c7"></div></div></div>
      <div class="card"><div class="card-head"><h3>Clientes nuevos</h3></div><div class="card-body"><div id="c8"></div></div></div>`;
    const g = (id) => document.getElementById(id);
    charts.responsive(g('c1'), () => charts.line(g('c1'), { labels, tipLabels: tips, area: true, height: 230, label: 'Conversaciones recibidas', series: [{ name: 'Conversaciones', values: rows.map((r) => r.conversaciones), color: 'var(--series-1)' }] }));
    charts.donut(g('c2'), { center: `${Math.round(((sum(cur, 'ia') + sum(cur, 'menu')) / conv) * 100)}%`, sub: 'automatizado', items: [{ label: 'IA', value: sum(cur, 'ia'), color: 'var(--series-1)' }, { label: 'Menús', value: sum(cur, 'menu'), color: 'var(--series-3)' }, { label: 'Asesor', value: sum(cur, 'humano'), color: 'var(--series-2)' }] });
    charts.responsive(g('c3'), () => charts.bars(g('c3'), { labels, tipLabels: tips, stacked: true, height: 230, series: [{ name: 'IA', values: rows.map((r) => r.ia), color: 'var(--series-1)' }, { name: 'Menús', values: rows.map((r) => r.menu), color: 'var(--series-3)' }, { name: 'Asesor', values: rows.map((r) => r.humano), color: 'var(--series-2)' }] }));
    charts.hbars(g('c4'), topProducts());
    charts.responsive(g('c5'), () => charts.bars(g('c5'), { labels, tipLabels: tips, height: 230, fmt: (v) => fmt.money(v), series: [{ name: 'Ventas', values: rows.map((r) => r.ventas), color: 'var(--series-3)' }] }));
    charts.responsive(g('c6'), () => charts.bars(g('c6'), { labels, tipLabels: tips, height: 200, series: [{ name: 'Citas', values: rows.map((r) => r.citas), color: 'var(--series-5)' }] }));
    charts.responsive(g('c7'), () => charts.line(g('c7'), { labels, tipLabels: tips, height: 200, fmt: (v) => `${String(v).replace('.', ',')} min`, series: [{ name: 'Respuesta humana', values: rows.map((r) => r.respuestaHumano), color: 'var(--series-2)' }] }));
    charts.responsive(g('c8'), () => charts.bars(g('c8'), { labels, tipLabels: tips, height: 200, series: [{ name: 'Clientes nuevos', values: rows.map((r) => r.clientesNuevos), color: 'var(--series-1)' }] }));
  }

  $('range').onclick = (e) => { const b = e.target.closest('[data-d]'); if (!b) return; days = Number(b.dataset.d); document.querySelectorAll('#range button').forEach((x) => x.classList.toggle('active', x === b)); render(); };
  $('table-btn').onclick = (e) => { showTable = !showTable; e.currentTarget.innerHTML = showTable ? `${icon('chart', 'sm')}Ver gráficos` : `${icon('list', 'sm')}Ver tabla`; render(); };
  $('csv').onclick = () => {
    const rows = db.get('daily').slice(-days);
    const out = [['Fecha', 'Conversaciones', 'Mensajes enviados', 'Clientes nuevos', 'IA', 'Menús', 'Asesor', 'Citas', 'Pedidos', 'Ventas (Bs)', 'Resp. bot (s)', 'Resp. humana (min)']].concat(rows.map((r) => [r.fecha, r.conversaciones, r.mensajesEnviados, r.clientesNuevos, r.ia, r.menu, r.humano, r.citas, r.pedidos, r.ventas, r.respuestaBot, r.respuestaHumano]));
    ui.download(`reporte-${days}d-${fmt.isoDate(new Date())}.csv`, ui.toCSV(out), 'text/csv;charset=utf-8');
    ui.toast('Reporte exportado', `${rows.length} días`, 'ok');
  };
  $('print').onclick = () => window.print();
  render();
})();
