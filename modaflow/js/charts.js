/*
 * Gráficos SVG livianos (barras, área y dona) con tooltip nativo. Sin dependencias.
 */
(function (root) {
  const MF = (root.MF = root.MF || {});
  const esc = (s) => MF.esc(s);

  function niceMax(v) {
    if (v <= 0) return 10;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
  }

  /** Barras verticales. data: [{label, value, value2?}] */
  function bars(data, o) {
    o = Object.assign({ h: 220, fmt: MF.money, color: 'var(--c1)', color2: 'var(--c2)', every: 1 }, o);
    const W = 640, H = o.h, L = 46, B = 26, T = 10;
    const max = niceMax(Math.max(...data.map((d) => Math.max(d.value, d.value2 || 0))));
    const bw = (W - L - 8) / data.length;
    const y = (v) => T + (H - T - B) * (1 - v / max);
    let g = '';
    for (let i = 0; i <= 4; i++) {
      const v = (max / 4) * i;
      g += `<line x1="${L}" x2="${W}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 6}" y="${y(v) + 4}" class="ax" text-anchor="end">${o.short ? o.short(v) : MF.num(v)}</text>`;
    }
    const two = data.some((d) => d.value2 != null);
    const inner = two ? bw * 0.36 : bw * 0.62;
    data.forEach((d, i) => {
      const x = L + 4 + i * bw + (bw - (two ? inner * 2 + 2 : inner)) / 2;
      g += `<rect x="${x}" y="${y(d.value)}" width="${inner}" height="${Math.max(0, H - B - y(d.value))}" rx="3" fill="${o.color}"><title>${esc(d.label)}: ${o.fmt(d.value)}</title></rect>`;
      if (two) g += `<rect x="${x + inner + 2}" y="${y(d.value2)}" width="${inner}" height="${Math.max(0, H - B - y(d.value2))}" rx="3" fill="${o.color2}"><title>${esc(d.label)}: ${o.fmt(d.value2)} (${esc(o.label2 || '')})</title></rect>`;
      if (i % o.every === 0) g += `<text x="${L + 4 + i * bw + bw / 2}" y="${H - 8}" class="ax" text-anchor="middle">${esc(d.label)}</text>`;
    });
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img">${g}</svg>`;
  }

  /** Área / línea. data: [{label, value}] */
  function area(data, o) {
    o = Object.assign({ h: 200, fmt: MF.money, color: 'var(--c1)', every: 5 }, o);
    const W = 640, H = o.h, L = 46, B = 26, T = 12;
    const max = niceMax(Math.max(...data.map((d) => d.value), 1));
    const step = (W - L - 10) / Math.max(1, data.length - 1);
    const x = (i) => L + 4 + i * step;
    const y = (v) => T + (H - T - B) * (1 - v / max);
    let g = '';
    for (let i = 0; i <= 4; i++) { const v = (max / 4) * i; g += `<line x1="${L}" x2="${W}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 6}" y="${y(v) + 4}" class="ax" text-anchor="end">${o.short ? o.short(v) : MF.num(v)}</text>`; }
    const pts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
    const id = 'ga' + Math.random().toString(36).slice(2, 7);
    g += `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o.color}" stop-opacity=".28"/><stop offset="1" stop-color="${o.color}" stop-opacity="0"/></linearGradient></defs>`;
    g += `<polygon points="${x(0)},${H - B} ${pts} ${x(data.length - 1)},${H - B}" fill="url(#${id})"/><polyline points="${pts}" fill="none" stroke="${o.color}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
    data.forEach((d, i) => {
      g += `<circle cx="${x(i)}" cy="${y(d.value)}" r="${i === data.length - 1 ? 4 : 2.6}" fill="#fff" stroke="${o.color}" stroke-width="2"><title>${esc(d.label)}: ${o.fmt(d.value)}</title></circle>`;
      if (i % o.every === 0 || i === data.length - 1) g += `<text x="${x(i)}" y="${H - 8}" class="ax" text-anchor="middle">${esc(d.label)}</text>`;
    });
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img">${g}</svg>`;
  }

  /** Dona con leyenda. data: [{label, value, color}] */
  function donut(data, o) {
    o = Object.assign({ fmt: MF.money }, o);
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    let a = -Math.PI / 2, g = '';
    data.forEach((d) => {
      const frac = d.value / total;
      if (frac <= 0) return;
      const a2 = a + frac * Math.PI * 2 - (frac >= 1 ? 0.0001 : 0);
      const large = a2 - a > Math.PI ? 1 : 0;
      const p = (ang, r) => `${60 + r * Math.cos(ang)},${60 + r * Math.sin(ang)}`;
      g += `<path d="M${p(a, 52)} A52 52 0 ${large} 1 ${p(a2, 52)} L${p(a2, 32)} A32 32 0 ${large} 0 ${p(a, 32)}Z" fill="${d.color}"><title>${esc(d.label)}: ${o.fmt(d.value)} (${Math.round(frac * 100)}%)</title></path>`;
      a = a2;
    });
    return `<div class="donut"><svg viewBox="0 0 120 120" role="img">${g}<text x="60" y="58" text-anchor="middle" class="donut-v">${o.center || ''}</text><text x="60" y="72" text-anchor="middle" class="donut-l">${o.centerLabel || ''}</text></svg>
      <ul class="legend">${data.map((d) => `<li><i style="background:${d.color}"></i><span>${esc(d.label)}</span><b>${o.fmt(d.value)}</b><em>${Math.round((d.value / total) * 100)}%</em></li>`).join('')}</ul></div>`;
  }

  /** Lista con barras horizontales. data: [{label, value, sub?}] */
  function hbars(data, o) {
    o = Object.assign({ fmt: MF.money }, o);
    const max = Math.max(...data.map((d) => d.value), 1);
    return `<ul class="hbars">${data.map((d) => `<li><div class="hb-top"><span>${esc(d.label)}</span><b>${o.fmt(d.value)}</b></div><div class="hb-bar"><i style="width:${(d.value / max) * 100}%"></i></div>${d.sub ? `<small>${esc(d.sub)}</small>` : ''}</li>`).join('')}</ul>`;
  }

  const short = (v) => (v >= 1000 ? MF.num(v / 1000, v % 1000 ? 1 : 0) + 'k' : MF.num(v));
  MF.charts = { bars, area, donut, hbars, short };
})(window);
