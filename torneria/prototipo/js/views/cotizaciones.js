(function () {
  const TOR = window.TOR;
  const S = TOR.store, Q = TOR.q, C = TOR.cmp, L = TOR.labels, A = TOR.app;
  const { esc, fmt } = TOR.ui;
  const icon = TOR.icon;
  const st = C.state('cotizaciones', { q: '', periodo: '3m', estado: '' });
  const vence = (q) => { const d = new Date(q.fecha); d.setDate(d.getDate() + q.validez); return d.toISOString().slice(0, 10); };

  function render(el) {
    const t = st.q.trim().toLowerCase();
    const base = S.scoped(S.db.cotizaciones).filter((q) => Q.inRange(q.fecha, st.periodo));
    const rows = base.filter((q) => (!st.estado || q.estado === st.estado) && (!t || [q.codigo, S.cli(q.cliente).nombre].some((x) => x.toLowerCase().includes(t))));
    const abiertas = base.filter((q) => ['borrador', 'enviada', 'aprobada'].includes(q.estado));
    const conv = base.filter((q) => q.estado === 'convertida');
    const cerradas = base.filter((q) => ['convertida', 'rechazada', 'vencida'].includes(q.estado));
    el.innerHTML = `
      <div class="page-head"><div><p class="lead">Cotizaciones para clientes con validez, seguimiento de estado y conversión directa en venta.</p></div>
        <div class="actions">${A.actionBtn('cotizaciones', `<button class="btn btn-primary" id="qNew">${icon('plus', 'sm')}Nueva cotización</button>`)}</div></div>
      <div class="kpis">
        ${C.kpi({ label: 'Cotizaciones abiertas', value: abiertas.length, sub: fmt.money(Q.sumBy(abiertas, (q) => q.total)), icon: 'quote', tone: 'accent' })}
        ${C.kpi({ label: 'Convertidas en venta', value: conv.length, sub: fmt.money(Q.sumBy(conv, (q) => q.total)), icon: 'checkCircle', tone: 'good' })}
        ${C.kpi({ label: 'Tasa de conversión', value: cerradas.length ? fmt.pct(conv.length / cerradas.length) : '—', sub: 'Sobre cotizaciones cerradas', icon: 'target' })}
        ${C.kpi({ label: 'Por vencer (3 días)', value: abiertas.filter((q) => { const v = vence(q); return v >= S.today() && v <= addDays(3); }).length, sub: 'Requieren seguimiento', icon: 'clock' })}
      </div>
      <div class="card">
        <div class="filters">
          <div class="input-icon">${icon('search', 'sm')}<input class="input" id="qQ" type="search" placeholder="Código o cliente" value="${esc(st.q)}"></div>
          <select class="select" id="qPer" aria-label="Período">${Q.PERIODOS.map(([k, l]) => `<option value="${k}" ${st.periodo === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <select class="select" id="qEst" aria-label="Estado"><option value="">Todo estado</option>${Object.entries(L.estadoCot).map(([k, v]) => `<option value="${k}" ${st.estado === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
          <span class="count">${rows.length} cotizaciones</span>
        </div>
        <div id="qBody"></div>
      </div>`;
    C.dataTable(el.querySelector('#qBody'), {
      id: 'cotizaciones', rows, defaultSort: 'fecha',
      empty: { icon: 'quote', title: 'Sin cotizaciones' },
      columns: [
        { key: 'codigo', label: 'Código', cls: 'code', sort: (q) => q.codigo, render: (q) => esc(q.codigo) },
        { key: 'fecha', label: 'Fecha', sort: (q) => q.fecha, render: (q) => fmt.date(q.fecha) },
        { key: 'vence', label: 'Válida hasta', sort: (q) => vence(q), render: (q) => fmt.date(vence(q)) },
        { key: 'cliente', label: 'Cliente', sort: (q) => S.cli(q.cliente).nombre, render: (q) => esc(S.cli(q.cliente).nombre) },
        { key: 'items', label: 'Líneas', render: (q) => `<span class="muted">${q.items.length} producto(s)</span>` },
        { key: 'sucursal', label: 'Sucursal', render: (q) => esc(S.suc(q.sucursal).nombre) },
        { key: 'estado', label: 'Estado', render: (q) => A.badge(L.estadoCot[q.estado], L.claseCot[q.estado]) },
        { key: 'total', label: 'Total', align: 'right', sort: (q) => q.total, render: (q) => `<b>${fmt.money(q.total)}</b>` }
      ],
      onRow: (q) => open(q.id)
    });
    TOR.views.ventas.bindFilters(el, 'q', 'cotizaciones', st);
    const nb = el.querySelector('#qNew');
    if (nb) nb.addEventListener('click', () => create());
  }
  function addDays(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

  function open(id) {
    const q = S.db.cotizaciones.find((x) => x.id === id);
    if (!q) return;
    const c = S.cli(q.cliente);
    const write = A.can('cotizaciones');
    const abierta = ['borrador', 'enviada', 'aprobada'].includes(q.estado);
    const m = TOR.ui.modal({
      title: `Cotización ${q.codigo}`, sub: `${esc(c.nombre)} · ${esc(S.suc(q.sucursal).nombre)}`, size: 'wide',
      body: `${C.detailGrid([['Estado', A.badge(L.estadoCot[q.estado], L.claseCot[q.estado])], ['Fecha', fmt.date(q.fecha)], ['Válida hasta', `${fmt.date(vence(q))} (${q.validez} días)`], ['Cliente', esc(c.nombre)], ['NIT / CI', esc(c.nit)], ['Elaborada por', esc(S.user(q.usuario) ? S.user(q.usuario).nombre : '')]])}
        <div style="margin-top:14px">${C.docLines(q.items)}</div>
        ${C.totalsBlock([['Subtotal', fmt.money(q.subtotal)], ['Descuento', fmt.money(-q.descuento)], ['Total', fmt.money(q.total), 'grand']])}
        ${q.venta ? `<div class="info-box good" style="margin-top:12px">${icon('checkCircle', 'sm')}<span>Convertida en la venta <a href="#/ventas/${q.venta}"><b>${esc(S.db.ventas.find((v) => v.id === q.venta).codigo)}</b></a>.</span></div>` : ''}
        ${write && abierta ? `<div class="section-title">${icon('cart', 'sm')}Convertir en venta</div><div class="row wrap"><select class="select" id="qMet" style="max-width:220px">${['efectivo', 'transferencia', 'qr', 'tarjeta', 'credito'].map((k) => `<option value="${k}">${L.metodo[k]}</option>`).join('')}</select><button class="btn btn-primary" data-convert>${icon('swap', 'sm')}Convertir en venta</button></div><small class="muted">Se valida el stock de la sucursal y se registra el cobro en caja.</small>` : ''}`,
      foot: `<button class="btn btn-outline" data-pdf>${icon('download', 'sm')}PDF</button><span class="spacer"></span>
        ${write && abierta ? `${q.estado === 'borrador' ? '<button class="btn btn-outline" data-st="enviada">Marcar enviada</button>' : ''}${q.estado !== 'aprobada' ? '<button class="btn btn-outline" data-st="aprobada">Aprobada</button>' : ''}<button class="btn btn-ghost" data-st="rechazada" style="color:var(--critical-ink)">Rechazada</button>` : ''}
        <button class="btn btn-outline" data-close>Cerrar</button>`,
      onClose: C.clearParam
    });
    m.el.querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', () => { if (A.run(() => S.ops.setQuoteStatus(q.id, b.dataset.st), `Cotización ${L.estadoCot[b.dataset.st].toLowerCase()}`)) { m.close(); open(q.id); } }));
    const cv = m.el.querySelector('[data-convert]');
    if (cv) cv.addEventListener('click', () => { const v = A.run(() => S.ops.convertQuote(q.id, m.el.querySelector('#qMet').value), 'Cotización convertida en venta', (r) => `${r.codigo} · ${fmt.money(r.total)}`); if (v) { m.close(); TOR.views.ventas.open(v.id); } });
    m.el.querySelector('[data-pdf]').addEventListener('click', async () => {
      try {
        await C.pdfReport({ title: `Cotización ${q.codigo}`, subtitle: `${c.nombre} · NIT/CI ${c.nit} · ${S.suc(q.sucursal).nombre} · válida hasta ${fmt.date(vence(q))}`, summary: [['Subtotal', fmt.money(q.subtotal)], ['Descuento', fmt.money(q.descuento)], ['Total', fmt.money(q.total)]], head: ['Producto', 'SKU', 'Cantidad', 'Precio unit.', 'Subtotal'], rows: q.items.map((it) => { const p = S.prod(it.producto); return [p.nombre, p.sku, `${fmt.qty(it.cantidad)} ${p.unidad}`, fmt.money(it.precio), fmt.money(it.precio * it.cantidad)]; }), rightCols: [2, 3, 4], file: `${q.codigo}.pdf` });
        TOR.ui.toast('PDF descargado', { text: `${q.codigo}.pdf` });
      } catch (e) { TOR.ui.toast('No se pudo generar el PDF', { text: e.message, type: 'critical' }); }
    });
  }

  function create() {
    let editor;
    C.formModal({
      title: 'Nueva cotización', size: 'wide', submit: 'Guardar cotización',
      body: `<div class="form-grid">
          <label class="field"><span>Cliente *</span><select class="select" name="cliente"><option value="">Seleccione…</option>${C.options(S.db.clientes.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)))}</select></label>
          <label class="field"><span>Sucursal *</span><select class="select" name="sucursal">${C.sucursalOptions(C.defaultSucursal())}</select></label>
        </div>
        <div id="qItems"></div>
        <div class="form-grid">
          <label class="field"><span>Validez (días) *</span><input class="input" type="number" name="validez" min="1" value="${S.db.parametros.diasValidezCotizacion}"></label>
          <label class="field"><span>Descuento (Bs)</span><input class="input" type="number" name="descuento" min="0" step="0.5" value="0"></label>
          <label class="field"><span>Estado inicial</span><select class="select" name="estado"><option value="borrador">Borrador</option><option value="enviada">Enviada al cliente</option></select></label>
          <label class="field"><span>Notas</span><input class="input" name="notas" placeholder="Condiciones de entrega, plazos…"></label>
        </div><div id="qTot"></div>`,
      rules: { cliente: { required: true }, validez: { required: true, number: true, positive: true }, descuento: { number: true, nonNegative: true } },
      onOpen: (el, close, form) => {
        const tot = (sub = editor.totals()) => { const d = Number(form.descuento.value) || 0; el.querySelector('#qTot').innerHTML = C.totalsBlock([['Subtotal', fmt.money(sub)], ['Descuento', fmt.money(-d)], ['Total', fmt.money(sub - d), 'grand']]); };
        editor = C.itemsEditor(el.querySelector('#qItems'), { mode: 'cotizacion', sucursal: () => form.sucursal.value, onChange: tot });
        form.sucursal.addEventListener('change', () => editor.redraw());
        form.descuento.addEventListener('input', () => tot());
      },
      onSubmit: (d, close) => {
        const err = editor.validate();
        if (err) { TOR.ui.toast('Revise los productos', { text: err, type: 'critical' }); return; }
        const q = A.run(() => S.ops.createQuote(Object.assign(d, { items: editor.items() })), 'Cotización creada', (r) => `${r.codigo} · ${fmt.money(r.total)}`);
        if (q) { close(); open(q.id); }
      }
    });
  }

  TOR.views.cotizaciones = { render, open, create };
})();
