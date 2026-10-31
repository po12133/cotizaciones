/* Componentes reutilizables del prototipo: tablas, editor de líneas, KPI, documentos y exportaciones. */
(function (root) {
  const TOR = root.TOR;
  const { esc, fmt } = TOR.ui;
  const S = TOR.store;
  const icon = TOR.icon;
  const L = TOR.labels;

  // Estado de filtros por vista (sobrevive a los re-renderizados).
  const states = {};
  const state = (id, defaults) => (states[id] = states[id] || Object.assign({}, defaults));

  /** Quita el parámetro de detalle del hash sin volver a navegar. */
  const clearParam = () => { const r = TOR.app.current().route; history.replaceState(null, '', `#/${r}`); };

  function kpi({ label, value, sub = '', icon: ic = 'chart', tone = '', link = '' }) {
    return `<div class="card kpi ${tone} ${link ? 'link' : ''}" ${link ? `data-href="${link}" role="link" tabindex="0"` : ''}><div class="k-top"><span class="k-label">${esc(label)}</span><span class="k-ico">${icon(ic, 'sm')}</span></div><div class="k-value">${value}</div>${sub ? `<div class="k-sub">${sub}</div>` : ''}</div>`;
  }
  function delta(curr, prev) {
    if (!prev) return '';
    const d = (curr - prev) / Math.abs(prev);
    return `<span class="delta ${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d * 100).toFixed(1).replace('.', ',')}%</span>`;
  }
  function bindLinks(el) {
    el.querySelectorAll('[data-href]').forEach((k) => {
      const goTo = () => { location.hash = k.dataset.href; };
      k.addEventListener('click', goTo);
      k.addEventListener('keydown', (e) => { if (e.key === 'Enter') goTo(); });
    });
  }

  /**
   * Tabla con orden, paginación y clic en fila.
   * cfg: { id, columns:[{key,label,align,sort:(r)=>valor,render:(r)=>html,cls}], rows, pageSize, rowClass, onRow, empty }
   */
  function dataTable(el, cfg) {
    const st = state(`dt:${cfg.id}`, { page: 0, sort: cfg.defaultSort || null, dir: cfg.defaultDir || 'desc' });
    const draw = () => {
      let rows = cfg.rows.slice();
      const col = cfg.columns.find((c) => c.key === st.sort);
      if (col && col.sort) rows.sort((a, b) => { const x = col.sort(a), y = col.sort(b); return (x > y ? 1 : x < y ? -1 : 0) * (st.dir === 'asc' ? 1 : -1); });
      const size = cfg.pageSize || 12;
      const pages = Math.max(1, Math.ceil(rows.length / size));
      if (st.page >= pages) st.page = pages - 1;
      const slice = rows.slice(st.page * size, st.page * size + size);
      el.innerHTML = `<div class="table-wrap"><table class="table dt"><thead><tr>${cfg.columns.map((c) => `<th class="${c.align === 'right' ? 'right' : ''} ${c.sort ? 'sortable' : ''} ${st.sort === c.key ? 'sorted' : ''}" ${c.sort ? `data-sort="${c.key}"` : ''}>${esc(c.label)}${c.sort ? `<span class="sort">${st.sort === c.key ? (st.dir === 'asc' ? '▲' : '▼') : '↕'}</span>` : ''}</th>`).join('')}</tr></thead>
        <tbody>${slice.map((r, i) => `<tr class="${cfg.onRow ? 'clickable' : ''} ${cfg.rowClass ? cfg.rowClass(r) : ''}" data-i="${st.page * size + i}">${cfg.columns.map((c) => `<td class="${c.align === 'right' ? 'right num nowrap' : ''} ${c.cls || ''}">${c.render ? c.render(r) : esc(r[c.key])}</td>`).join('')}</tr>`).join('')}</tbody></table>
        ${rows.length ? '' : TOR.ui.emptyState(cfg.empty || {})}</div>
        ${rows.length > size ? `<div class="pager"><span>${st.page * size + 1}–${Math.min(rows.length, (st.page + 1) * size)} de ${rows.length}</span><span class="spacer"></span><button class="btn btn-outline btn-sm" data-pg="-1" ${st.page === 0 ? 'disabled' : ''}>${icon('chevronLeft', 'sm')}Anterior</button><button class="btn btn-outline btn-sm" data-pg="1" ${st.page >= pages - 1 ? 'disabled' : ''}>Siguiente${icon('chevronRight', 'sm')}</button></div>` : ''}`;
      el.querySelectorAll('[data-sort]').forEach((th) => th.addEventListener('click', () => { if (st.sort === th.dataset.sort) st.dir = st.dir === 'asc' ? 'desc' : 'asc'; else { st.sort = th.dataset.sort; st.dir = 'desc'; } draw(); }));
      el.querySelectorAll('[data-pg]').forEach((b) => b.addEventListener('click', () => { st.page += Number(b.dataset.pg); draw(); }));
      if (cfg.onRow) el.querySelectorAll('tbody tr').forEach((tr) => tr.addEventListener('click', (e) => { if (e.target.closest('button, a, select, input')) return; cfg.onRow(rows[Number(tr.dataset.i)]); }));
      if (cfg.after) cfg.after(el);
    };
    draw();
    return { reset: () => { st.page = 0; draw(); } };
  }
  const resetPage = (id) => { if (states[`dt:${id}`]) states[`dt:${id}`].page = 0; };

  const options = (list, value, label = (x) => x.nombre, val = (x) => x.id) => list.map((x) => `<option value="${esc(val(x))}" ${String(val(x)) === String(value) ? 'selected' : ''}>${esc(label(x))}</option>`).join('');
  const sucursalOptions = (value, { all = false } = {}) => (all ? `<option value="*">Todas las sucursales</option>` : '') + options(S.db.sucursales.filter((s) => TOR.app.userBranches().includes(s.id)), value);
  const defaultSucursal = () => (S.ui.sucursal === '*' ? TOR.app.userBranches()[0] : S.ui.sucursal);
  function productOptions(value, filter = () => true) {
    const cats = {};
    S.db.productos.filter((p) => p.activo && p.sku !== 'SER-OT' && filter(p)).forEach((p) => { (cats[p.categoria] = cats[p.categoria] || []).push(p); });
    return '<option value="">Seleccione un producto…</option>' + Object.entries(cats).map(([c, ps]) => `<optgroup label="${esc(c)}">${ps.map((p) => `<option value="${p.id}" ${p.id === value ? 'selected' : ''}>${esc(p.nombre)} · ${esc(p.sku)}</option>`).join('')}</optgroup>`).join('');
  }

  /**
   * Editor de líneas para ventas, cotizaciones, compras y materiales de OT.
   * opts: { mode: 'venta'|'cotizacion'|'compra'|'materiales', sucursal: () => id, items, onChange }
   */
  function itemsEditor(el, opts) {
    const mode = opts.mode;
    const priceKey = mode === 'compra' ? 'costo' : 'precio';
    let items = (opts.items || []).map((it) => ({ ...it }));
    if (!items.length) items.push({ producto: '', cantidad: 1 });
    const filter = mode === 'compra' || mode === 'materiales' ? (p) => p.tipo !== 'servicio' : () => true;
    const draw = () => {
      el.innerHTML = `<table class="lines"><thead><tr><th>Producto</th><th>Cantidad</th>${mode === 'materiales' ? '' : `<th>${mode === 'compra' ? 'Costo unit.' : 'Precio unit.'}</th><th class="right">Subtotal</th>`}<th></th></tr></thead>
        <tbody>${items.map((it, i) => {
          const p = it.producto ? S.prod(it.producto) : null;
          const disp = p && p.tipo !== 'servicio' ? S.stockOf(opts.sucursal(), p.id) : null;
          const short = disp !== null && mode !== 'compra' && Number(it.cantidad) > disp;
          return `<tr data-i="${i}"><td><select class="select" data-f="producto" aria-label="Producto">${productOptions(it.producto, filter)}</select>${p ? `<span class="hint ${short ? 'bad' : ''}">${disp !== null ? `Stock en sucursal: ${fmt.qty(disp)} ${esc(p.unidad)}${short ? (mode === 'cotizacion' ? ' · insuficiente (se puede cotizar)' : ' · insuficiente') : ''}` : 'Servicio (no controla stock)'}</span>` : ''}</td>
            <td class="num"><input class="input" data-f="cantidad" type="number" min="0" step="any" value="${esc(it.cantidad)}" aria-label="Cantidad"></td>
            ${mode === 'materiales' ? '' : `<td class="num"><input class="input" data-f="${priceKey}" type="number" min="0" step="any" value="${esc(it[priceKey] !== undefined ? it[priceKey] : '')}" aria-label="Precio"></td><td class="tot">${fmt.money((Number(it.cantidad) || 0) * (Number(it[priceKey]) || 0))}</td>`}
            <td class="rm"><button type="button" class="btn btn-ghost btn-icon btn-sm" data-rm="${i}" aria-label="Quitar línea">${icon('trash', 'sm')}</button></td></tr>`;
        }).join('')}</tbody></table>
        <button type="button" class="btn btn-outline btn-sm" data-add style="margin-top:10px">${icon('plus', 'sm')}Agregar línea</button>`;
      if (opts.onChange) opts.onChange(api.totals());
    };
    el.addEventListener('change', (e) => {
      const tr = e.target.closest('tr[data-i]');
      if (!tr) return;
      const it = items[Number(tr.dataset.i)];
      const f = e.target.dataset.f;
      it[f] = f === 'producto' ? e.target.value : e.target.value;
      if (f === 'producto' && e.target.value) { const p = S.prod(e.target.value); it.precio = p.precio; it.costo = p.costo; }
      draw();
    });
    el.addEventListener('input', (e) => {
      const tr = e.target.closest('tr[data-i]');
      if (!tr || e.target.dataset.f === 'producto') return;
      items[Number(tr.dataset.i)][e.target.dataset.f] = e.target.value;
      const it = items[Number(tr.dataset.i)];
      const tot = tr.querySelector('.tot');
      if (tot) tot.textContent = fmt.money((Number(it.cantidad) || 0) * (Number(it[priceKey]) || 0));
      if (opts.onChange) opts.onChange(api.totals());
    });
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-add]')) { items.push({ producto: '', cantidad: 1 }); draw(); }
      const rm = e.target.closest('[data-rm]');
      if (rm) { items.splice(Number(rm.dataset.rm), 1); if (!items.length) items.push({ producto: '', cantidad: 1 }); draw(); }
    });
    const api = {
      items: () => items.filter((it) => it.producto && Number(it.cantidad) > 0).map((it) => ({ producto: it.producto, cantidad: Number(it.cantidad), precio: it.precio !== undefined && it.precio !== '' ? Number(it.precio) : undefined, costo: it.costo !== undefined && it.costo !== '' ? Number(it.costo) : undefined })),
      totals: () => api.items().reduce((t, it) => t + it.cantidad * (it[priceKey] || 0), 0),
      redraw: draw,
      validate: () => {
        const valid = api.items();
        if (!valid.length) return 'Agregue al menos un producto con cantidad mayor a cero.';
        if (valid.some((it) => mode !== 'materiales' && !(Number(it[priceKey]) >= 0))) return 'Revise los precios de las líneas.';
        const dup = valid.map((it) => it.producto).find((p, i, a) => a.indexOf(p) !== i);
        if (dup) return `El producto "${S.prod(dup).nombre}" está repetido; combine las cantidades en una sola línea.`;
        return '';
      }
    };
    draw();
    return api;
  }

  /** Tabla de líneas de un documento (venta, cotización, compra). */
  function docLines(items, priceKey = 'precio') {
    return `<div class="table-wrap"><table class="table"><thead><tr><th>Producto</th><th class="right">Cantidad</th><th class="right">${priceKey === 'costo' ? 'Costo unit.' : 'Precio unit.'}</th><th class="right">Subtotal</th></tr></thead><tbody>
      ${items.map((it) => { const p = S.prod(it.producto); return `<tr><td>${esc(it.descripcion || p.nombre)}<span class="sub muted" style="display:block;font-size:12px">${esc(p.sku)}</span></td><td class="right num">${fmt.qty(it.cantidad)} ${esc(p.unidad)}</td><td class="right num">${fmt.money(it[priceKey])}</td><td class="right num nowrap">${fmt.money(it.cantidad * it[priceKey])}</td></tr>`; }).join('')}
    </tbody></table></div>`;
  }
  function totalsBlock(rows) {
    return `<div class="totals" style="margin-top:12px">${rows.map(([k, v, cls]) => `<div class="${cls || ''}"><span>${esc(k)}</span><span class="num">${v}</span></div>`).join('')}</div>`;
  }
  function detailGrid(pairs) {
    return `<div class="detail-grid">${pairs.map(([k, v]) => `<div><small>${esc(k)}</small><span>${v}</span></div>`).join('')}</div>`;
  }

  /** Comprobante interno (no fiscal) imprimible. */
  function voucher(v) {
    const e = S.db.empresa;
    const s = S.suc(v.sucursal);
    const c = S.cli(v.cliente);
    return `<div class="voucher"><header><div><h4>${esc(e.nombre)}</h4><small class="muted">${esc(s.nombre)} · ${esc(s.direccion)}</small></div><div style="text-align:right"><b>COMPROBANTE INTERNO</b><div class="mono">${esc(v.codigo)}</div><small class="muted">${fmt.dateTime(v.fecha)}</small></div></header>
      ${detailGrid([['Cliente', esc(c.nombre)], ['NIT / CI', esc(c.nit)], ['Método de pago', esc(L.metodo[v.metodo])]])}
      <div style="margin-top:12px">${docLines(v.items)}</div>
      ${totalsBlock([['Subtotal', fmt.money(v.subtotal)], ['Descuento', fmt.money(-v.descuento)], ['Total', fmt.money(v.total), 'grand']])}
      <p class="stamp">Documento interno sin valor fiscal · No reemplaza a la factura · Prototipo de demostración</p></div>`;
  }
  function printCurrentModal() {
    document.body.classList.add('printing');
    setTimeout(() => { window.print(); document.body.classList.remove('printing'); }, 50);
  }

  // ---------- Exportaciones (reales, generadas en el navegador) ----------
  function csv(name, head, rows) {
    const q = (v) => { const s = String(v === null || v === undefined ? '' : v); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const body = [head, ...rows].map((r) => r.map(q).join(';')).join('\r\n');
    TOR.ui.download(name, new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' }));
  }
  const n2 = (v) => String(Math.round(v * 100) / 100).replace('.', ',');

  async function loadPDF() {
    const load = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar ' + src)); document.head.appendChild(s); });
    if (!(root.jspdf && root.jspdf.jsPDF)) await load('../assets/vendor/jspdf.umd.min.js');
    if (typeof new root.jspdf.jsPDF().autoTable !== 'function') await load('../assets/vendor/jspdf.plugin.autotable.min.js');
    return root.jspdf.jsPDF;
  }
  const latin = (s) => String(s === null || s === undefined ? '' : s).replace(/[—–]/g, '-').replace(/[^\x00-\xff]/g, '');
  /** Reporte tabular en PDF (A4 horizontal si hay muchas columnas). */
  async function pdfReport({ title, subtitle, summary = [], head, rows, file, rightCols = [] }) {
    const JsPDF = await loadPDF();
    const doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: head.length > 6 ? 'landscape' : 'portrait' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    doc.setFillColor(13, 17, 23); doc.rect(0, 0, W, 24, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(255, 255, 255);
    doc.text(latin(title), 14, 11);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(180, 188, 199);
    doc.text(latin(`${S.db.empresa.nombre} · ${subtitle}`), 14, 17.5);
    doc.text(latin(`Generado: ${fmt.dateTime(S.now())} · DATOS DE DEMOSTRACIÓN`), W - 14, 17.5, { align: 'right' });
    let y = 31;
    if (summary.length) {
      doc.autoTable({ startY: y, theme: 'plain', body: [summary.map(([k, v]) => `${latin(k).toUpperCase()}\n${latin(v)}`)], styles: { fontSize: 8.5, fillColor: [244, 246, 248], textColor: [13, 17, 23], fontStyle: 'bold', cellPadding: 3, lineColor: [255, 255, 255], lineWidth: 1 }, margin: { left: 14, right: 14 } });
      y = doc.lastAutoTable.finalY + 4;
    }
    doc.autoTable({
      startY: y, head: [head.map(latin)], body: rows.map((r) => r.map(latin)),
      styles: { fontSize: 8, cellPadding: 1.8, lineColor: [226, 230, 235], lineWidth: 0.2, textColor: [45, 55, 67] },
      headStyles: { fillColor: [33, 42, 53], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 251, 252] },
      columnStyles: Object.fromEntries(rightCols.map((i) => [i, { halign: 'right' }])),
      margin: { left: 14, right: 14, bottom: 16 }, rowPageBreak: 'avoid', showHead: 'everyPage'
    });
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(120, 130, 140); doc.text(`Página ${i} de ${pages}`, W - 14, H - 8, { align: 'right' }); doc.text('Prototipo de demostración · Sistema de Gestión para Tornería', 14, H - 8); }
    doc.save(file);
    return file;
  }

  /** Abre un formulario en modal con validación. fields: html; rules para validateForm; onSubmit(data, close) */
  function formModal({ title, sub, body, rules, submit = 'Guardar', size, onSubmit, onOpen }) {
    return TOR.ui.modal({
      title, sub, size,
      body: `<form class="stack" novalidate data-form>${body}</form>`,
      foot: `<button type="button" class="btn btn-outline" data-close>Cancelar</button><button type="button" class="btn btn-primary" data-submit>${icon('check', 'sm')}${esc(submit)}</button>`,
      onOpen: (el, close) => {
        const form = el.querySelector('[data-form]');
        const go = () => { const { ok, data } = TOR.ui.validateForm(form, rules || {}); if (ok) onSubmit(data, close, form); };
        el.querySelector('[data-submit]').addEventListener('click', go);
        form.addEventListener('submit', (e) => { e.preventDefault(); go(); });
        TOR.hydrateIcons(el);
        if (onOpen) onOpen(el, close, form);
      }
    });
  }

  const segment = (id, opts, value) => `<div class="chips" data-seg="${id}">${opts.map(([v, l, n]) => `<button type="button" class="chip ${v === value ? 'on' : ''}" data-v="${v}">${esc(l)}${n !== undefined ? ` <span class="n">${n}</span>` : ''}</button>`).join('')}</div>`;

  TOR.cmp = { state, clearParam, kpi, delta, bindLinks, dataTable, resetPage, options, sucursalOptions, defaultSucursal, productOptions, itemsEditor, docLines, totalsBlock, detailGrid, voucher, printCurrentModal, csv, n2, pdfReport, formModal, segment };
})(window);
