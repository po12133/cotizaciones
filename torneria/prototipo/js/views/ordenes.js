(function () {
  const TOR = window.TOR;
  const S = TOR.store, Q = TOR.q, C = TOR.cmp, L = TOR.labels, A = TOR.app;
  const { esc, fmt } = TOR.ui;
  const icon = TOR.icon;
  const st = C.state('ordenes', { estado: 'activas', q: '', resp: '', prioridad: '', vista: 'tabla' });
  const FLUJO = ['pendiente', 'en_proceso', 'control_calidad', 'terminada', 'entregada'];
  const SIGUIENTE = { pendiente: ['en_proceso', 'cancelada'], en_proceso: ['control_calidad', 'pendiente', 'cancelada'], control_calidad: ['terminada', 'en_proceso'], terminada: ['entregada', 'control_calidad'] };
  const tecnicos = (suc) => S.db.usuarios.filter((u) => ['R4', 'R5'].includes(u.rol) && u.estado === 'activo' && (u.sucursales.includes('*') || !suc || u.sucursales.includes(suc)));

  function filtered() {
    const all = S.scoped(S.db.ordenes);
    const t = st.q.trim().toLowerCase();
    return all.filter((o) => {
      if (st.estado === 'activas' && ['entregada', 'cancelada'].includes(o.estado)) return false;
      if (st.estado === 'atrasadas' && !Q.otAtrasada(o)) return false;
      if (!['activas', 'atrasadas', 'todas'].includes(st.estado) && o.estado !== st.estado) return false;
      if (st.resp && o.responsable !== st.resp) return false;
      if (st.prioridad && o.prioridad !== st.prioridad) return false;
      if (t && ![o.codigo, o.descripcion, o.material, S.cli(o.cliente).nombre].some((x) => x.toLowerCase().includes(t))) return false;
      return true;
    });
  }

  function render(el, route) {
    if (route.query.f === 'atrasadas') { st.estado = 'atrasadas'; route.query.f = null; }
    const all = S.scoped(S.db.ordenes);
    const rows = filtered();
    const count = (e) => all.filter((o) => o.estado === e).length;
    el.innerHTML = `
      <div class="page-head"><div><p class="lead">Trabajos de tornería con responsable, materiales, costos y fecha de entrega. Al pasar a "En proceso" se descuentan los materiales del inventario; al entregar se registra la venta y el cobro.</p></div>
        <div class="actions">${C.segment('vista', [['tabla', 'Tabla'], ['tablero', 'Tablero']], st.vista)}${A.actionBtn('ordenes', `<button class="btn btn-primary" id="newOT">${icon('plus', 'sm')}Nueva orden</button>`)}</div></div>
      <div class="pipeline">${FLUJO.concat(['cancelada']).map((e) => `<button class="pipe ${st.estado === e ? 'on' : ''}" data-est="${e}" style="--c:${L.colorOT[e]}"><b>${count(e)}</b><small>${L.estadoOT[e]}</small></button>`).join('')}</div>
      <div class="card">
        <div class="filters">
          <div class="input-icon">${icon('search', 'sm')}<input class="input" id="otQ" type="search" placeholder="Buscar por código, cliente, trabajo o material" value="${esc(st.q)}"></div>
          ${C.segment('estado', [['activas', 'Activas', all.filter((o) => !['entregada', 'cancelada'].includes(o.estado)).length], ['atrasadas', 'Atrasadas', all.filter(Q.otAtrasada).length], ['todas', 'Todas', all.length]], st.estado)}
          <select class="select" id="otResp" aria-label="Responsable"><option value="">Todos los responsables</option>${C.options(tecnicos(S.ui.sucursal === '*' ? null : S.ui.sucursal), st.resp)}</select>
          <select class="select" id="otPri" aria-label="Prioridad"><option value="">Toda prioridad</option>${Object.entries(L.prioridad).map(([k, v]) => `<option value="${k}" ${st.prioridad === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
          <span class="count">${rows.length} órdenes</span>
        </div>
        <div id="otBody" class="dt-dense"></div>
      </div>`;

    const body = el.querySelector('#otBody');
    if (st.vista === 'tabla') {
      C.dataTable(body, {
        id: 'ordenes', rows, defaultSort: 'ingreso',
        empty: { icon: 'wrench', title: 'No hay órdenes con estos filtros' },
        rowClass: (o) => (Q.otAtrasada(o) ? 'danger' : ''),
        columns: [
          { key: 'codigo', label: 'Código', cls: 'code', sort: (o) => o.codigo, render: (o) => esc(o.codigo) },
          { key: 'cliente', label: 'Cliente', sort: (o) => S.cli(o.cliente).nombre, render: (o) => esc(S.cli(o.cliente).nombre) },
          { key: 'descripcion', label: 'Descripción del trabajo', render: (o) => `<span style="display:block;min-width:160px">${esc(o.descripcion)}</span>${o.prioridad === 'urgente' || o.prioridad === 'alta' ? ` ${A.badge(L.prioridad[o.prioridad], L.clasePrioridad[o.prioridad])}` : ''}` },
          { key: 'material', label: 'Material', render: (o) => `<span class="muted" style="display:block;min-width:110px">${esc(o.material)}</span>` },
          { key: 'responsable', label: 'Responsable', sort: (o) => S.user(o.responsable).nombre, render: (o) => esc(S.user(o.responsable).nombre) },
          { key: 'sucursal', label: 'Sucursal', render: (o) => `<span class="nowrap">${esc(S.suc(o.sucursal).nombre)}</span>` },
          { key: 'ingreso', label: 'Ingreso', sort: (o) => o.ingreso, render: (o) => `<span class="nowrap">${fmt.date(o.ingreso).slice(0, 6)}</span>` },
          { key: 'entrega', label: 'Entrega', sort: (o) => o.entrega, render: (o) => `<span class="nowrap">${fmt.date(o.entrega).slice(0, 6)}</span>${Q.otAtrasada(o) ? '<span class="sub" style="color:var(--critical-ink);font-weight:600">Atrasada</span>' : ''}` },
          { key: 'estado', label: 'Estado', sort: (o) => FLUJO.indexOf(o.estado), render: (o) => A.badge(L.estadoOT[o.estado], L.claseOT[o.estado]) },
          { key: 'costo', label: 'Costo est.', align: 'right', sort: (o) => o.costoEstimado, render: (o) => fmt.money(o.costoEstimado) }
        ],
        onRow: (o) => open(o.id)
      });
    } else {
      body.innerHTML = `<div class="kanban">${['pendiente', 'en_proceso', 'control_calidad', 'terminada'].map((e) => {
        const list = rows.filter((o) => o.estado === e);
        return `<section class="kcol"><header><span>${L.estadoOT[e]}</span><span class="badge plain">${list.length}</span></header>${list.slice(0, 30).map((o) => `<article class="kcard" data-ot="${o.id}"><div class="row"><span class="code">${esc(o.codigo)}</span><span class="spacer"></span>${Q.otAtrasada(o) ? A.badge('Atrasada', 'critical') : o.prioridad === 'urgente' ? A.badge('Urgente', 'critical') : ''}</div><p>${esc(o.descripcion)}</p><small>${esc(S.cli(o.cliente).nombre)}</small><small>${icon('user', 'sm')} ${esc(S.user(o.responsable).nombre)} · entrega ${fmt.date(o.entrega)}</small></article>`).join('') || '<small class="muted" style="padding:6px">Sin órdenes</small>'}</section>`;
      }).join('')}</div>`;
      body.querySelectorAll('[data-ot]').forEach((k) => k.addEventListener('click', () => open(k.dataset.ot)));
    }

    el.querySelectorAll('[data-est]').forEach((b) => b.addEventListener('click', () => { st.estado = st.estado === b.dataset.est ? 'activas' : b.dataset.est; C.resetPage('ordenes'); A.render(); }));
    el.querySelector('[data-seg="estado"]').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) { st.estado = b.dataset.v; C.resetPage('ordenes'); A.render(); } });
    el.querySelector('[data-seg="vista"]').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) { st.vista = b.dataset.v; A.render(); } });
    const q = el.querySelector('#otQ');
    q.addEventListener('input', () => { st.q = q.value; C.resetPage('ordenes'); A.render(); const n = document.getElementById('otQ'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); });
    el.querySelector('#otResp').addEventListener('change', (e) => { st.resp = e.target.value; A.render(); });
    el.querySelector('#otPri').addEventListener('change', (e) => { st.prioridad = e.target.value; A.render(); });
    const nb = el.querySelector('#newOT');
    if (nb) nb.addEventListener('click', () => create());
  }

  function open(id) {
    const o = S.db.ordenes.find((x) => x.id === id);
    if (!o) return;
    const c = S.cli(o.cliente);
    const idx = FLUJO.indexOf(o.estado);
    const cobrado = o.anticipo;
    const margen = o.precio - o.costoEstimado;
    const editable = A.can('ordenes') && SIGUIENTE[o.estado];
    const m = TOR.ui.modal({
      title: `${o.codigo} · ${o.descripcion}`,
      sub: `${esc(c.nombre)} · ${esc(S.suc(o.sucursal).nombre)} ${Q.otAtrasada(o) ? '· <b style="color:var(--critical-ink)">Atrasada</b>' : ''}`,
      size: 'wide',
      body: `${o.estado === 'cancelada' ? `<div class="info-box warning">${icon('x', 'sm')}<span>Orden cancelada.</span></div>` : `<div class="steps">${FLUJO.map((e, i) => `<span class="${i < idx ? 'done' : i === idx ? 'now' : ''}">${L.estadoOT[e]}</span>`).join('')}</div>`}
        <div style="margin-top:16px">${C.detailGrid([
          ['Estado', A.badge(L.estadoOT[o.estado], L.claseOT[o.estado])], ['Prioridad', A.badge(L.prioridad[o.prioridad], L.clasePrioridad[o.prioridad])], ['Responsable', esc(S.user(o.responsable).nombre)],
          ['Fecha de ingreso', fmt.dateTime(o.ingreso)], ['Fecha de entrega', `${fmt.date(o.entrega)}`], ['Material principal', esc(o.material)],
          ['Precio acordado', `<b>${fmt.money(o.precio)}</b>`], ['Anticipo', fmt.money(cobrado)], ['Saldo a cobrar', o.venta ? 'Cobrado al entregar' : fmt.money(o.precio - cobrado)],
          ['Costo estimado', fmt.money(o.costoEstimado)], ['Horas de taller', `${o.horas} h × ${fmt.money(S.db.parametros.costoHoraTaller)}`], ['Margen estimado', `${fmt.money(margen)} (${o.precio ? fmt.pct(margen / o.precio) : '—'})`]
        ])}</div>
        <div class="section-title">${icon('box', 'sm')}Materiales utilizados ${o.consumido ? A.badge('Descontados del inventario', 'good') : A.badge('Se descuentan al iniciar', 'plain')}</div>
        ${o.materiales.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Material</th><th class="right">Cantidad</th><th class="right">Costo</th><th class="right">Stock actual</th></tr></thead><tbody>${o.materiales.map((mt) => { const p = S.prod(mt.producto); return `<tr><td>${esc(p.nombre)}</td><td class="right num">${fmt.qty(mt.cantidad)} ${esc(p.unidad)}</td><td class="right num">${fmt.money(p.costo * mt.cantidad)}</td><td class="right num">${fmt.qty(S.stockOf(o.sucursal, p.id))} ${esc(p.unidad)}</td></tr>`; }).join('')}</tbody></table></div>` : '<p class="muted">Sin materiales registrados (material provisto por el cliente).</p>'}
        <div class="section-title">${icon('history', 'sm')}Seguimiento</div>
        <ul class="timeline">${o.historial.slice().reverse().map((h) => `<li style="--c:${L.colorOT[h.estado]}"><b>${L.estadoOT[h.estado]}</b><small>${fmt.dateTime(h.fecha)} · ${esc(S.user(h.usuario) ? S.user(h.usuario).nombre : '')}</small>${h.nota ? `<p>${esc(h.nota)}</p>` : ''}</li>`).join('')}</ul>
        ${editable ? `<div class="section-title">${icon('refresh', 'sm')}Cambiar estado</div>
          <form class="form-grid" id="otState" novalidate>
            <label class="field"><span>Nuevo estado</span><select class="select" name="estado">${SIGUIENTE[o.estado].map((e) => `<option value="${e}">${L.estadoOT[e]}</option>`).join('')}</select></label>
            <label class="field" id="metodoField" ${SIGUIENTE[o.estado][0] === 'entregada' ? '' : 'hidden'}><span>Cobro del saldo (${fmt.money(o.precio - o.anticipo)})</span><select class="select" name="metodo">${['efectivo', 'transferencia', 'qr', 'tarjeta', 'credito'].map((k) => `<option value="${k}">${L.metodo[k]}</option>`).join('')}</select></label>
            <label class="field full"><span>Nota de seguimiento</span><input class="input" name="nota" placeholder="Ej.: Se rectificó a Ø 44,8 mm; pendiente control de dureza"></label>
          </form>` : ''}`,
      foot: `<button class="btn btn-outline" data-print>${icon('printer', 'sm')}Imprimir</button><span class="spacer"></span><button class="btn btn-outline" data-close>Cerrar</button>${editable ? `<button class="btn btn-primary" data-save>${icon('check', 'sm')}Actualizar estado</button>` : ''}`,
      onClose: C.clearParam
    });
    TOR.hydrateIcons(m.el);
    m.el.querySelector('[data-print]').addEventListener('click', C.printCurrentModal);
    const f = m.el.querySelector('#otState');
    if (f) {
      f.estado.addEventListener('change', () => { m.el.querySelector('#metodoField').hidden = f.estado.value !== 'entregada'; });
      m.el.querySelector('[data-save]').addEventListener('click', () => {
        const estado = f.estado.value;
        const ok = A.run(() => S.ops.setOrderStatus(o.id, estado, f.nota.value.trim(), f.metodo.value), `${o.codigo}: ${L.estadoOT[estado]}`, estado === 'entregada' ? 'Se registró la venta del trabajo y el cobro en caja.' : estado === 'en_proceso' && !o.consumido ? 'Materiales descontados del inventario.' : '');
        if (ok) { m.close(); open(o.id); }
      });
    }
  }

  function create() {
    const suc0 = C.defaultSucursal();
    let editor;
    const hoy = S.today();
    C.formModal({
      title: 'Nueva orden de trabajo', sub: 'Registre el trabajo, asigne un responsable y estime materiales y horas.', size: 'wide', submit: 'Crear orden',
      body: `<div class="form-grid">
          <label class="field"><span>Cliente *</span><select class="select" name="cliente"><option value="">Seleccione…</option>${C.options(S.db.clientes.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)))}</select></label>
          <label class="field"><span>Sucursal *</span><select class="select" name="sucursal">${C.sucursalOptions(suc0)}</select></label>
          <label class="field full"><span>Descripción del trabajo *</span><input class="input" name="descripcion" placeholder="Ej.: Fabricación de eje para bomba según plano del cliente"></label>
          <label class="field"><span>Material principal *</span><input class="input" name="material" placeholder="Ej.: Acero SAE 4140 Ø 2&quot;"></label>
          <label class="field"><span>Responsable *</span><select class="select" name="responsable"></select></label>
          <label class="field"><span>Fecha de entrega *</span><input class="input" type="date" name="entrega" min="${hoy}"></label>
          <label class="field"><span>Prioridad</span><select class="select" name="prioridad">${Object.entries(L.prioridad).map(([k, v]) => `<option value="${k}" ${k === 'normal' ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        </div>
        <div><div class="section-title" style="margin-top:4px">${icon('box', 'sm')}Materiales del inventario</div><div id="otMat"></div></div>
        <div class="form-grid">
          <label class="field"><span>Horas de taller estimadas *</span><input class="input" type="number" name="horas" min="0" step="0.5" value="4"></label>
          <label class="field"><span>Costo estimado</span><input class="input" id="otCosto" readonly></label>
          <label class="field"><span>Precio acordado con el cliente *</span><input class="input" type="number" name="precio" min="0" step="1"><small id="otSug"></small></label>
          <label class="field"><span>Anticipo recibido</span><input class="input" type="number" name="anticipo" min="0" step="1" value="0"></label>
          <label class="field"><span>Método del anticipo</span><select class="select" name="metodoAnticipo"><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="qr">QR</option><option value="tarjeta">Tarjeta</option></select></label>
          <label class="field"><span>Observaciones</span><input class="input" name="notas" placeholder="Medidas, tolerancias, planos recibidos…"></label>
        </div>`,
      rules: { cliente: { required: true }, descripcion: { required: true, minLen: 5 }, material: { required: true }, responsable: { required: true }, entrega: { required: true }, horas: { required: true, number: true, nonNegative: true }, precio: { required: true, number: true, positive: true }, anticipo: { number: true, nonNegative: true } },
      onOpen: (el, close, form) => {
        const fillResp = () => { form.responsable.innerHTML = `<option value="">Seleccione…</option>${C.options(tecnicos(form.sucursal.value), '', (u) => `${u.nombre} · ${S.rol(u.rol).nombre}`)}`; };
        const recalc = () => {
          if (!editor) return;
          const mat = editor.items().reduce((t, it) => t + S.prod(it.producto).costo * it.cantidad, 0);
          const costo = mat + (Number(form.horas.value) || 0) * S.db.parametros.costoHoraTaller;
          el.querySelector('#otCosto').value = fmt.money(costo);
          el.querySelector('#otSug').textContent = `Sugerido con margen del ${S.db.parametros.margenSugerido}%: ${fmt.money(Math.round(costo * (1 + S.db.parametros.margenSugerido / 100)))}`;
        };
        fillResp();
        editor = C.itemsEditor(el.querySelector('#otMat'), { mode: 'materiales', sucursal: () => form.sucursal.value, onChange: recalc });
        form.sucursal.addEventListener('change', () => { fillResp(); editor.redraw(); });
        form.horas.addEventListener('input', recalc);
        recalc();
      },
      onSubmit: (d, close, form) => {
        if (d.entrega < hoy) { TOR.ui.toast('Revise la fecha de entrega', { text: 'No puede ser anterior a hoy.', type: 'critical' }); return; }
        if (Number(d.anticipo) > Number(d.precio)) { TOR.ui.toast('Revise el anticipo', { text: 'No puede superar el precio acordado.', type: 'critical' }); return; }
        const o = A.run(() => S.ops.createOrder(Object.assign(d, { materiales: editor.items() })), 'Orden de trabajo creada', (r) => `${r.codigo} asignada a ${S.user(r.responsable).nombre}`);
        if (o) { close(); open(o.id); }
      }
    });
  }

  TOR.views.ordenes = { render, open, create };
})();
