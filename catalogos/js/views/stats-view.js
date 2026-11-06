/*
 * Estadísticas (datos simulados + eventos reales del catálogo en este navegador).
 * Básicas en Profesional; avanzadas (periodos, embudo y comparativa) en Empresa.
 */
(function () {
  'use strict';
  const CA = window.CA, D = CA.dash;
  const u = CA.util, ui = CA.ui, esc = u.esc, I = ui.icon;
  const $ = ui.$, $$ = ui.$$;
  let period = 30;

  D.view('estadisticas', { title: 'Estadísticas', icon: 'chart', sub: 'Visitas, productos y consultas', render, locked: () => D.limits().stats === 'none' });

  function render(el) {
    const lim = D.limits().stats;
    const db = D.db(), user = D.user(), ws = D.ws();
    if (lim !== 'advanced' && period !== 30) period = 30;
    const s = CA.analytics.summary(db, user.id, period);
    const adv = lim === 'advanced';
    const body = '<div class="page-bar"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="demo-tag">Datos simulados</span><span class="muted" style="font-size:.84rem">+ ' + (s.real.view + s.real.product + s.real.whatsapp + s.real.consult) + ' eventos reales registrados al navegar tus catálogos en este navegador</span></div>' +
      '<div class="ed-seg" style="min-width:260px">' + [7, 30, 90].map((p) => '<button class="' + (period === p ? 'on' : '') + '" data-per="' + p + '"' + (!adv && p !== 30 ? ' disabled title="Plan Empresa"' : '') + '>' + p + ' días</button>').join('') + '</div></div>' +
      '<div class="kpis kpis-4">' +
      kpi('eye', 'Visitas al catálogo', u.num(s.totals.views), 'Últimos ' + period + ' días') +
      kpi('cards', 'Productos vistos', u.num(s.totals.products), 'Aperturas de detalle') +
      kpi('whatsapp', 'Clics en WhatsApp', u.num(s.totals.whatsapp), u.num(s.totals.ctr) + '% de las visitas', 'ok') +
      kpi('chat', 'Consultas iniciadas', u.num(s.totals.consults), 'Mensajes enviados (estimado)') + '</div>' +
      '<div class="card" style="margin-top:16px"><div class="card-head"><h3>' + I('chart') + 'Evolución de visitas</h3></div>' +
      (s.totals.views ? ui.barChart((period > 30 ? group(s.series, 7) : s.series.slice(period > 14 ? -period : 0)).map((r) => ({ label: r.label, value: r.views, value2: r.whatsapp })), { series: [{ key: 'value', cls: 'b1', label: 'Visitas' }, { key: 'value2', cls: 'b2', label: 'Clics a WhatsApp' }], height: 230 }) : ui.empty('chart', 'Sin visitas todavía', 'Publica y comparte tu catálogo.')) + '</div>' +
      '<div class="grid-2" style="margin-top:16px">' +
      '<div class="card"><div class="card-head"><h3>' + I('star') + 'Productos más vistos</h3></div>' + (s.top.length && s.totals.views ? ui.hbars(s.top.map((t) => ({ label: t.product.name, value: t.views, sub: t.product.sku + ' · ' + t.product.category }))) : ui.empty('cards', 'Sin datos')) + '</div>' +
      '<div class="card"><div class="card-head"><h3>' + I('layout') + 'Catálogos más visitados</h3></div>' + (s.perCatalog.length ? ui.hbars(s.perCatalog.map((pc) => ({ label: pc.catalog.name, value: pc.views, sub: u.num(pc.whatsapp) + ' clics a WhatsApp · ' + (pc.catalog.status === 'published' ? 'publicado' : 'borrador') }))) : ui.empty('layout', 'Sin catálogos')) + '</div></div>' +
      (adv ? '<div class="grid-2" style="margin-top:16px"><div class="card"><div class="card-head"><h3>' + I('filter') + 'Embudo de consultas</h3>' + ui.badge('Avanzado', 'brand') + '</div>' + funnel(s) + '</div>' +
        '<div class="card"><div class="card-head"><h3>' + I('list') + 'Comparativa por catálogo</h3>' + ui.badge('Avanzado', 'brand') + '</div><div class="table-wrap"><table class="table"><thead><tr><th>Catálogo</th><th class="num">Visitas</th><th class="num">Productos</th><th class="num">WhatsApp</th><th class="num">Conversión</th></tr></thead><tbody>' +
        s.perCatalog.map((pc) => '<tr><td>' + esc(pc.catalog.name) + '</td><td class="num">' + u.num(pc.views) + '</td><td class="num">' + u.num(pc.products) + '</td><td class="num">' + u.num(pc.whatsapp) + '</td><td class="num">' + (pc.views ? ((pc.whatsapp / pc.views) * 100).toFixed(1) : '0') + '%</td></tr>').join('') + '</tbody></table></div></div></div>'
        : '<div style="margin-top:16px">' + D.lockBox('Estadísticas avanzadas', 'Periodos de 7 y 90 días, embudo de consultas y comparativa por catálogo en el plan Empresa.', 'business') + '</div>');
    el.innerHTML = '<div class="view-in">' + (lim === 'none'
      ? D.lockBox('Las estadísticas están disponibles desde el plan Profesional', 'Conoce cuántas personas visitan tu catálogo, qué productos miran y cuántas te escriben por WhatsApp.', 'pro') + '<div class="stats-blur" aria-hidden="true">' + body + '</div>'
      : body) + '</div>';
    $$('[data-per]', el).forEach((b) => (b.onclick = () => { if (b.disabled) return; period = +b.dataset.per; render(el); }));
  }

  function kpi(ic, label, value, sub, tone) { return '<div class="kpi ' + (tone || '') + '"><span class="kpi-ic">' + I(ic) + '</span><div><small>' + label + '</small><b>' + value + '</b><span>' + sub + '</span></div></div>'; }
  function group(series, n) {
    const out = [];
    for (let i = 0; i < series.length; i += n) {
      const ch = series.slice(i, i + n);
      out.push({ label: ch[0].label, views: ch.reduce((a, r) => a + r.views, 0), whatsapp: ch.reduce((a, r) => a + r.whatsapp, 0) });
    }
    return out;
  }
  function funnel(s) {
    const steps = [['Visitas', s.totals.views], ['Vieron un producto', Math.min(s.totals.views, Math.round(s.totals.products * 0.45))], ['Clic en WhatsApp', s.totals.whatsapp], ['Consulta enviada', s.totals.consults]];
    const max = steps[0][1] || 1;
    return '<div class="funnel">' + steps.map((st, i) => '<div class="fn-row"><span>' + st[0] + '</span><div class="fn-bar"><i style="width:' + Math.max(4, (st[1] / max) * 100) + '%"></i></div><b>' + u.num(st[1]) + '</b>' + (i ? '<small>' + (steps[i - 1][1] ? Math.round((st[1] / steps[i - 1][1]) * 100) : 0) + '%</small>' : '<small></small>') + '</div>').join('') + '</div>';
  }
})();
