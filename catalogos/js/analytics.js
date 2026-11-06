/*
 * Estadísticas: series simuladas (deterministas) + eventos reales registrados
 * al navegar el catálogo público en este navegador. Todo es de demostración.
 */
(function () {
  'use strict';
  const CA = (window.CA = window.CA || {});
  const u = CA.util;
  const A = (CA.analytics = {});

  /** Registra un evento del catálogo público (visita, producto, clic a WhatsApp, consulta). */
  A.track = function (userId, catalogId, type, productId) {
    try {
      CA.store.tx((db) => {
        const ws = db.workspaces[userId];
        if (!ws) return;
        ws.events = ws.events || [];
        ws.events.push({ type, catalogId, productId: productId || null, at: CA.now().toISOString() });
        if (ws.events.length > 3000) ws.events = ws.events.slice(-3000);
      });
    } catch (e) { /* las estadísticas nunca deben romper el catálogo */ }
  };

  /** Serie diaria de los últimos n días para un catálogo publicado. */
  A.series = function (ws, catalog, days) {
    const now = CA.now();
    const rnd = u.seeded(catalog.id);
    const start = catalog.publishedAt ? new Date(catalog.publishedAt) : null;
    const base = 18 + rnd() * 40;
    const out = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = u.addDays(now, -i);
      const key = d.toISOString().slice(0, 10);
      let views = 0;
      if (start && d >= new Date(start.toDateString())) {
        const age = (d - start) / 864e5;
        const growth = Math.min(1, 0.35 + age / 40);
        const weekend = [0, 6].includes(d.getDay()) ? 1.25 : 1;
        views = Math.round(base * growth * weekend * (0.7 + rnd() * 0.6));
      }
      out.push({ key, label: d.getDate() + '/' + (d.getMonth() + 1), views, whatsapp: Math.round(views * (0.06 + rnd() * 0.05)), products: Math.round(views * (1.4 + rnd())) });
    }
    // Suma los eventos reales del día
    (ws.events || []).filter((e) => e.catalogId === catalog.id).forEach((e) => {
      const row = out.find((r) => r.key === e.at.slice(0, 10));
      if (!row) return;
      if (e.type === 'view') row.views++;
      if (e.type === 'whatsapp' || e.type === 'consult') row.whatsapp++;
      if (e.type === 'product') row.products++;
    });
    return out;
  };

  /** Resumen del negocio para el dashboard y la sección de estadísticas. */
  A.summary = function (db, userId, days) {
    days = days || 30;
    const ws = db.workspaces[userId];
    const cats = ws.catalogs || [];
    const perCatalog = cats.map((c) => {
      const s = A.series(ws, c, days);
      return { catalog: c, series: s, views: s.reduce((a, r) => a + r.views, 0), whatsapp: s.reduce((a, r) => a + r.whatsapp, 0), products: s.reduce((a, r) => a + r.products, 0) };
    });
    const series = [];
    for (let i = 0; i < days; i++) {
      const row = { label: perCatalog[0] ? perCatalog[0].series[i].label : '', views: 0, whatsapp: 0, products: 0 };
      perCatalog.forEach((pc) => { row.views += pc.series[i].views; row.whatsapp += pc.series[i].whatsapp; row.products += pc.series[i].products; });
      series.push(row);
    }
    // Productos más vistos: peso simulado por catálogo + eventos reales
    const prods = (ws.products || []).filter((p) => p.sync !== 'error');
    const rnd = u.seeded(userId + 'top');
    const views = {};
    prods.forEach((p) => { views[p.id] = (perCatalog.length && perCatalog.some((pc) => pc.views) ? Math.round(rnd() * 120 + (p.offer ? 60 : 0)) : 0); });
    (ws.events || []).filter((e) => e.type === 'product' && e.productId).forEach((e) => { views[e.productId] = (views[e.productId] || 0) + 1; });
    const top = prods.map((p) => ({ product: p, views: views[p.id] || 0 })).sort((a, b) => b.views - a.views).slice(0, 8);
    const real = { views: 0, whatsapp: 0, consult: 0, product: 0 };
    (ws.events || []).forEach((e) => { if (real[e.type] != null) real[e.type]++; });
    const totals = {
      views: series.reduce((a, r) => a + r.views, 0),
      whatsapp: series.reduce((a, r) => a + r.whatsapp, 0),
      products: series.reduce((a, r) => a + r.products, 0)
    };
    totals.consults = Math.round(totals.whatsapp * 0.62) + real.consult;
    totals.ctr = totals.views ? (totals.whatsapp / totals.views) * 100 : 0;
    return { series, perCatalog: perCatalog.sort((a, b) => b.views - a.views), top, totals, real };
  };
})();
