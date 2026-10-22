/* Panel general: métricas, gráficos, actividad, pendientes, citas, pedidos e indicadores de automatización. */
(function () {
  const { icon, ui, db, shell, charts, badge } = window.WAB;
  const { esc, fmt } = ui;

  function sum(arr, k) { return arr.reduce((t, x) => t + x[k], 0); }
  function delta(cur, prev) {
    if (!prev) return '';
    const d = Math.round(((cur - prev) / prev) * 100);
    return `<span class="kpi-delta ${d >= 0 ? 'up' : 'down'}">${icon(d >= 0 ? 'trendUp' : 'trendDown')}${d >= 0 ? '+' : ''}${d}% <span>vs. semana anterior</span></span>`;
  }

  function render() {
    const daily = db.get('daily');
    const last7 = daily.slice(-7);
    const prev7 = daily.slice(-14, -7);
    const convs = db.get('conversations');
    const pending = convs.filter((c) => c.estado === 'pendiente');
    const today = fmt.isoDate(new Date());
    const upcoming = db.get('appointments').filter((a) => a.fecha >= today && a.estado !== 'cancelada').sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora)).slice(0, 5);
    const orders = db.get('orders').slice().sort((a, b) => new Date(b.creado) - new Date(a.creado)).slice(0, 5);
    const ai = db.get('ai');
    const autoRate = Math.round(((sum(last7, 'ia') + sum(last7, 'menu')) / sum(last7, 'conversaciones')) * 100);
    const kpis = [
      { l: 'Conversaciones (7 días)', v: fmt.num(sum(last7, 'conversaciones')), d: delta(sum(last7, 'conversaciones'), sum(prev7, 'conversaciones')), ic: 'messages' },
      { l: 'Resueltas sin asesor', v: `${autoRate}%`, d: '<span class="kpi-delta"><span>menús + IA</span></span>', ic: 'bot' },
      { l: 'Citas (7 días)', v: fmt.num(sum(last7, 'citas')), d: delta(sum(last7, 'citas'), sum(prev7, 'citas')), ic: 'calendar' },
      { l: 'Ventas (7 días)', v: fmt.money(sum(last7, 'ventas')), d: delta(sum(last7, 'ventas'), sum(prev7, 'ventas')), ic: 'wallet' }
    ];

    shell.view.innerHTML = `
      <div class="page-head">
        <div><h2>Buen día, Daniela</h2><p class="muted">Resumen de ${esc(db.get('settings').negocio.nombre)} · ${esc(fmt.date(new Date(), 'weekday'))}</p></div>
        <div class="btn-group">
          <a class="btn" href="whatsapp.html">${icon('phone', 'sm')}Abrir simulador</a>
          <a class="btn btn-primary" href="conversaciones.html">${icon('messages', 'sm')}Ir a la bandeja${pending.length ? ` (${pending.length})` : ''}</a>
        </div>
      </div>
      <div class="kpis">${kpis.map((k) => `<div class="kpi"><div class="kpi-top"><span class="kpi-label">${esc(k.l)}</span><span class="kpi-icon">${icon(k.ic)}</span></div><div class="kpi-value">${k.v}</div>${k.d}</div>`).join('')}</div>
      <div class="grid-dash">
        <div class="card span-2">
          <div class="card-head"><h3>Conversaciones por tipo de atención</h3><div class="legend"><span><i style="background:var(--series-1)"></i>IA</span><span><i style="background:var(--series-3)"></i>Menús</span><span><i style="background:var(--series-2)"></i>Asesor</span></div></div>
          <div class="card-body"><div id="ch-conv"></div></div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Distribución (14 días)</h3></div>
          <div class="card-body"><div id="ch-donut"></div></div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Esperando asesor</h3><span class="badge warn">${pending.length}</span></div>
          <div class="list-rows">${pending.length ? pending.map((c) => { const ct = db.contact(c.contactId); const last = c.mensajes[c.mensajes.length - 1]; return `<a class="list-row" href="conversaciones.html#${c.id}">${ui.avatar(ct.nombre, 'sm')}<div class="grow"><strong>${esc(ct.nombre)}</strong><small>${esc(last && last.payload.text ? (last.payload.text.body || last.payload.text) : '')}</small></div><div class="end"><small class="muted">${esc(fmt.relative(c.actualizado))}</small></div></a>`; }).join('') : ui.emptyState({ icon: 'checkCircle', title: 'Todo al día', text: 'No hay clientes esperando un asesor.' })}</div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Próximas citas</h3><a class="btn btn-ghost btn-sm" href="calendario.html">Ver agenda</a></div>
          <div class="list-rows">${upcoming.length ? upcoming.map((a) => { const ct = db.contact(a.contactId); const sv = db.service(a.servicioId); const d = ui.toDate(a.fecha); return `<a class="list-row" href="calendario.html#${a.id}"><span class="date-chip"><b>${d.getDate()}</b><small>${esc(d.toLocaleDateString('es-BO', { month: 'short' }))}</small></span><div class="grow"><strong>${esc(sv ? sv.nombre : '')}</strong><small>${esc(a.hora)} · ${esc(ct ? ct.nombre : '')}${ct && ct.mascota ? ` (${esc(ct.mascota)})` : ''}</small></div><div class="end">${badge('cita', a.estado)}</div></a>`; }).join('') : ui.emptyState({ icon: 'calendar', title: 'Sin citas próximas' })}</div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Últimos pedidos</h3><a class="btn btn-ghost btn-sm" href="pedidos.html">Ver todos</a></div>
          <div class="list-rows">${orders.map((o) => { const ct = db.contact(o.contactId); return `<a class="list-row" href="pedidos.html#${o.id}"><span class="kpi-icon">${icon('receipt')}</span><div class="grow"><strong>#${o.numero} · ${fmt.money(o.total)}</strong><small>${esc(ct ? ct.nombre : '')} · ${esc(fmt.relative(o.creado))}</small></div><div class="end">${badge('pedido', o.estado)}</div></a>`; }).join('')}</div>
        </div>
        <div class="card span-2">
          <div class="card-head"><h3>Actividad reciente</h3></div>
          <ul class="activity">${shell.activity(7).map(shell.activityItem).join('')}</ul>
        </div>
        <div class="card">
          <div class="card-head"><h3>Indicadores de automatización</h3></div>
          <div class="card-body stack">
            ${meter('Resueltas sin asesor', autoRate, 100, '%')}
            ${meter('Consumo de IA del mes', ai.limites.usadoMes, ai.limites.mensual, ' mensajes')}
            ${meter('Citas confirmadas automáticamente', Math.round((db.get('appointments').filter((a) => a.estado === 'confirmada' && a.canal === 'WhatsApp').length / Math.max(1, db.get('appointments').filter((a) => a.estado === 'confirmada').length)) * 100), 100, '%')}
            <div class="meter-row"><span>Tiempo medio de respuesta del bot</span><strong>${(last7.reduce((t, d) => t + d.respuestaBot, 0) / 7).toFixed(1).replace('.', ',')} s</strong></div>
            <div class="meter-row"><span>Tiempo medio de respuesta humana</span><strong>${(last7.reduce((t, d) => t + d.respuestaHumano, 0) / 7).toFixed(1).replace('.', ',')} min</strong></div>
            <div class="meter-row"><span>Respuestas automáticas activas</span><strong>${db.get('autoReplies').filter((r) => r.activo).length}</strong></div>
          </div>
        </div>
      </div>`;

    const last14 = daily.slice(-14);
    charts.responsive(document.getElementById('ch-conv'), () => charts.bars(document.getElementById('ch-conv'), {
      labels: last14.map((d) => fmt.date(d.fecha, 'short').replace('.', '')), tipLabels: last14.map((d) => fmt.date(d.fecha, 'weekday')),
      stacked: true, height: 250, label: 'Conversaciones por día y tipo de atención',
      series: [{ name: 'IA', values: last14.map((d) => d.ia), color: 'var(--series-1)' }, { name: 'Menús', values: last14.map((d) => d.menu), color: 'var(--series-3)' }, { name: 'Asesor', values: last14.map((d) => d.humano), color: 'var(--series-2)' }]
    }));
    charts.donut(document.getElementById('ch-donut'), {
      center: fmt.num(sum(last14, 'conversaciones')), sub: 'conversaciones',
      items: [{ label: 'IA', value: sum(last14, 'ia'), color: 'var(--series-1)' }, { label: 'Menús', value: sum(last14, 'menu'), color: 'var(--series-3)' }, { label: 'Asesor', value: sum(last14, 'humano'), color: 'var(--series-2)' }]
    });
  }

  function meter(label, value, max, unit) {
    const pct = Math.min(100, Math.round((value / max) * 100));
    return `<div class="meter"><div class="meter-row"><span>${esc(label)}</span><strong>${unit === '%' ? `${value}%` : `${fmt.num(value)} / ${fmt.num(max)}${unit}`}</strong></div><div class="progress"><span style="width:${pct}%;${pct > 85 && unit !== '%' ? 'background:var(--warn)' : ''}"></span></div></div>`;
  }

  render();
  db.on('*', (v, src) => { if (src === 'external') render(); });
})();
