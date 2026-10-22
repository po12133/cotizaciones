/*
 * Gráficos SVG livianos (sin dependencias): líneas/áreas, barras, dona y barras horizontales.
 * Incluyen tooltip al pasar el cursor y se adaptan al ancho del contenedor.
 * Colores por rol: var(--series-1..5) definidos en styles.css (claro y oscuro).
 */
(function (root) {
  const WAB = root.WAB;
  const esc = (s) => WAB.ui.esc(s);
  const NS = 'http://www.w3.org/2000/svg';

  function niceMax(v) {
    if (v <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  const shortNum = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.', ',')}k` : String(Math.round(n)));

  function tipEl(el) {
    let t = el.querySelector('.chart-tip');
    if (!t) { t = document.createElement('div'); t.className = 'chart-tip'; t.hidden = true; el.appendChild(t); }
    return t;
  }

  /** Línea (o área) con varias series. opts: { labels, series:[{name, values, color}], height, fmt, area } */
  function line(el, opts) {
    const W = Math.max(280, el.clientWidth || 600);
    const H = opts.height || 240;
    const P = { t: 12, r: 12, b: 26, l: 40 };
    const n = opts.labels.length;
    const max = niceMax(Math.max(...opts.series.flatMap((s) => s.values)) * 1.08);
    const x = (i) => P.l + (n === 1 ? 0 : (i * (W - P.l - P.r)) / (n - 1));
    const y = (v) => H - P.b - (v / max) * (H - P.t - P.b);
    const fmt = opts.fmt || shortNum;
    let g = '';
    for (let k = 0; k <= 4; k++) {
      const v = (max / 4) * k;
      g += `<line class="grid-line" x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}"/><text class="axis-text" x="${P.l - 8}" y="${y(v) + 4}" text-anchor="end">${esc(shortNum(v))}</text>`;
    }
    const every = Math.ceil(n / Math.max(2, Math.floor((W - P.l) / 70)));
    opts.labels.forEach((l, i) => { if (i % every === 0 || i === n - 1) g += `<text class="axis-text" x="${x(i)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${esc(l)}</text>`; });
    opts.series.forEach((s) => {
      const pts = s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
      if (opts.area) g += `<path class="series-area" style="fill:${s.color}" d="M${x(0)},${y(0)} L${pts.join(' L')} L${x(n - 1)},${y(0)} Z"/>`;
      g += `<polyline class="series-line" style="stroke:${s.color}" points="${pts.join(' ')}"/>`;
    });
    g += `<line class="hover-line" x1="0" x2="0" y1="${P.t}" y2="${H - P.b}" visibility="hidden"/>`;
    g += opts.series.map((s, k) => `<circle data-dot="${k}" r="4.5" style="fill:${s.color};stroke:var(--surface);stroke-width:2" visibility="hidden"/>`).join('');
    g += `<rect class="hit" x="${P.l}" y="${P.t}" width="${W - P.l - P.r}" height="${H - P.t - P.b}" fill="transparent"/>`;
    el.classList.add('chart');
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || 'Gráfico de líneas')}">${g}</svg>`;
    const svg = el.querySelector('svg');
    const tip = tipEl(el);
    const hl = svg.querySelector('.hover-line');
    const move = (ev) => {
      const r = svg.getBoundingClientRect();
      const px = ((ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left) * (W / r.width);
      const i = Math.max(0, Math.min(n - 1, Math.round(((px - P.l) / (W - P.l - P.r)) * (n - 1))));
      hl.setAttribute('x1', x(i)); hl.setAttribute('x2', x(i)); hl.setAttribute('visibility', 'visible');
      opts.series.forEach((s, k) => { const d = svg.querySelector(`[data-dot="${k}"]`); d.setAttribute('cx', x(i)); d.setAttribute('cy', y(s.values[i])); d.setAttribute('visibility', 'visible'); });
      tip.innerHTML = `<strong>${esc(opts.tipLabels ? opts.tipLabels[i] : opts.labels[i])}</strong>${opts.series.map((s) => `<div class="tip-row"><span><i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${s.color};margin-right:6px"></i>${esc(s.name)}</span><span>${esc(fmt(s.values[i]))}</span></div>`).join('')}`;
      tip.hidden = false;
      tip.style.left = `${(x(i) / W) * r.width}px`;
      tip.style.top = `${(Math.min(...opts.series.map((s) => y(s.values[i]))) / H) * r.height}px`;
    };
    const leave = () => { tip.hidden = true; hl.setAttribute('visibility', 'hidden'); svg.querySelectorAll('[data-dot]').forEach((d) => d.setAttribute('visibility', 'hidden')); };
    svg.addEventListener('mousemove', move);
    svg.addEventListener('touchstart', move, { passive: true });
    svg.addEventListener('mouseleave', leave);
  }

  /** Barras verticales (una serie o apiladas). opts: { labels, series:[{name, values, color}], stacked, height, fmt } */
  function bars(el, opts) {
    const W = Math.max(280, el.clientWidth || 600);
    const H = opts.height || 240;
    const P = { t: 12, r: 8, b: 26, l: 40 };
    const n = opts.labels.length;
    const totals = opts.labels.map((_, i) => opts.stacked ? opts.series.reduce((t, s) => t + s.values[i], 0) : Math.max(...opts.series.map((s) => s.values[i])));
    const max = niceMax(Math.max(...totals) * 1.08);
    const bw = (W - P.l - P.r) / n;
    const barW = Math.max(4, Math.min(34, bw * 0.62));
    const y = (v) => H - P.b - (v / max) * (H - P.t - P.b);
    const fmt = opts.fmt || shortNum;
    let g = '';
    for (let k = 0; k <= 4; k++) {
      const v = (max / 4) * k;
      g += `<line class="grid-line" x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}"/><text class="axis-text" x="${P.l - 8}" y="${y(v) + 4}" text-anchor="end">${esc(shortNum(v))}</text>`;
    }
    const every = Math.ceil(n / Math.max(2, Math.floor((W - P.l) / 54)));
    opts.labels.forEach((l, i) => {
      const cx = P.l + bw * i + bw / 2;
      let acc = 0;
      const segs = opts.stacked ? opts.series : [opts.series[0]];
      segs.forEach((s, k) => {
        const v = s.values[i];
        const top = y(acc + v);
        const h = Math.max(0, y(acc) - top - (opts.stacked && k > 0 ? 2 : 0));
        const r = k === segs.length - 1 ? Math.min(4, barW / 2) : 0;
        if (h > 0) g += r ? `<path class="bar" data-i="${i}" style="fill:${s.color}" d="M${cx - barW / 2},${top + h} V${top + r} Q${cx - barW / 2},${top} ${cx - barW / 2 + r},${top} H${cx + barW / 2 - r} Q${cx + barW / 2},${top} ${cx + barW / 2},${top + r} V${top + h} Z"/>` : `<rect class="bar" data-i="${i}" x="${cx - barW / 2}" y="${top}" width="${barW}" height="${h}" style="fill:${s.color}"/>`;
        acc += v;
      });
      if (i % every === 0) g += `<text class="axis-text" x="${cx}" y="${H - 6}" text-anchor="middle">${esc(l)}</text>`;
      g += `<rect data-hit="${i}" x="${P.l + bw * i}" y="${P.t}" width="${bw}" height="${H - P.t - P.b}" fill="transparent"/>`;
    });
    el.classList.add('chart');
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || 'Gráfico de barras')}">${g}</svg>`;
    const svg = el.querySelector('svg');
    const tip = tipEl(el);
    const show = (i) => {
      const r = svg.getBoundingClientRect();
      svg.querySelectorAll('.bar').forEach((b) => b.classList.toggle('hover', b.dataset.i === String(i)));
      const list = opts.stacked ? opts.series : [opts.series[0]];
      tip.innerHTML = `<strong>${esc(opts.tipLabels ? opts.tipLabels[i] : opts.labels[i])}</strong>${list.map((s) => `<div class="tip-row"><span><i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${s.color};margin-right:6px"></i>${esc(s.name)}</span><span>${esc(fmt(s.values[i]))}</span></div>`).join('')}`;
      tip.hidden = false;
      tip.style.left = `${((P.l + bw * i + bw / 2) / W) * r.width}px`;
      tip.style.top = `${(y(totals[i]) / H) * r.height}px`;
    };
    svg.querySelectorAll('[data-hit]').forEach((h) => {
      h.addEventListener('mouseenter', () => show(Number(h.dataset.hit)));
      h.addEventListener('touchstart', () => show(Number(h.dataset.hit)), { passive: true });
    });
    svg.addEventListener('mouseleave', () => { tip.hidden = true; svg.querySelectorAll('.bar').forEach((b) => b.classList.remove('hover')); });
  }

  /** Dona con leyenda. opts: { items:[{label, value, color}], center, sub, fmt } */
  function donut(el, opts) {
    const total = opts.items.reduce((t, i) => t + i.value, 0) || 1;
    const R = 60, r = 42, C = 75;
    let a0 = -Math.PI / 2;
    const fmt = opts.fmt || ((v) => WAB.ui.fmt.num(v));
    const arcs = opts.items.map((it, k) => {
      const a1 = a0 + (it.value / total) * Math.PI * 2;
      const gap = opts.items.length > 1 ? 0.02 : 0;
      const s = a0 + gap, e = Math.max(s, a1 - gap);
      const large = e - s > Math.PI ? 1 : 0;
      const p = (ang, rad) => `${C + rad * Math.cos(ang)},${C + rad * Math.sin(ang)}`;
      const d = `M${p(s, R)} A${R},${R} 0 ${large} 1 ${p(e, R)} L${p(e, r)} A${r},${r} 0 ${large} 0 ${p(s, r)} Z`;
      a0 = a1;
      return `<path data-k="${k}" d="${d}" style="fill:${it.color}"><title>${esc(it.label)}: ${esc(fmt(it.value))} (${Math.round((it.value / total) * 100)}%)</title></path>`;
    }).join('');
    el.classList.add('donut-wrap');
    el.innerHTML = `<svg viewBox="0 0 150 150" role="img" aria-label="${esc(opts.label || 'Distribución')}">${arcs}<text class="donut-center" x="75" y="77" text-anchor="middle">${esc(opts.center || '')}</text><text class="donut-sub" x="75" y="93" text-anchor="middle">${esc(opts.sub || '')}</text></svg>
      <div class="stack" style="min-width:150px;flex:1">${opts.items.map((it) => `<div class="meter-row"><span class="row" style="gap:8px"><i style="width:10px;height:10px;border-radius:3px;background:${it.color};display:inline-block"></i>${esc(it.label)}</span><strong>${esc(fmt(it.value))} · ${Math.round((it.value / total) * 100)}%</strong></div>`).join('')}</div>`;
  }

  /** Barras horizontales (ranking). items: [{label, value, sub}] */
  function hbars(el, items, opts = {}) {
    const max = Math.max(...items.map((i) => i.value), 1);
    const fmt = opts.fmt || ((v) => WAB.ui.fmt.num(v));
    el.classList.add('hbar');
    el.innerHTML = items.length ? items.map((it) => `<div class="hbar-row"><span>${esc(it.label)}${it.sub ? ` <small class="muted">${esc(it.sub)}</small>` : ''}</span><strong>${esc(fmt(it.value))}</strong><div class="track"><span style="width:${(it.value / max) * 100}%;background:${opts.color || 'var(--series-1)'}"></span></div></div>`).join('')
      : WAB.ui.emptyState({ icon: 'bars', title: 'Sin datos', text: 'No hay información para el periodo seleccionado.' });
  }

  /** Redibuja al cambiar el ancho. */
  function responsive(el, draw) {
    draw();
    let w = el.clientWidth;
    const ro = new ResizeObserver(() => { if (Math.abs(el.clientWidth - w) > 20) { w = el.clientWidth; draw(); } });
    ro.observe(el);
  }

  WAB.charts = { line, bars, donut, hbars, responsive, shortNum };
})(window);
