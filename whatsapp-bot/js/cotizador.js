/* Cotizador interactivo: estado, formulario, selección de módulos, resumen, PDF e impresión. */
(function () {
  const WAB = window.WAB;
  const { icon, ui, MODULES, PLANS, CONFIG, storage, pricing, quoteDoc } = WAB;
  const { esc, fmt } = ui;
  const KEY = 'cotizador';

  const CLIENT_FIELDS = [
    { name: 'nombre', label: 'Nombre del cliente', required: true, placeholder: 'Nombre y apellido' },
    { name: 'empresa', label: 'Empresa', placeholder: 'Razón social o nombre comercial' },
    { name: 'telefono', label: 'Teléfono', type: 'tel', placeholder: '+591 7xxxxxxx' },
    { name: 'correo', label: 'Correo', type: 'email', placeholder: 'correo@empresa.com' },
    { name: 'fecha', label: 'Fecha de cotización', type: 'date', required: true },
    { name: 'validez', label: 'Validez de la oferta (días)', type: 'number', min: 1, max: 120, required: true },
    { name: 'observaciones', label: 'Observaciones', type: 'textarea', full: true, rows: 3, placeholder: 'Condiciones especiales, alcance a confirmar, notas para el cliente…' }
  ];

  function defaults() {
    return {
      cliente: { nombre: '', empresa: '', telefono: '', correo: '', fecha: fmt.isoDate(new Date()), validez: CONFIG.validezDias, observaciones: '' },
      modulos: [],
      asesores: CONFIG.asesores.incluidos,
      contactos: 1000,
      periodo: 'mensual',
      descuentoPromo: 0,
      implementacionManual: null,
      adicionales: [],
      plan: null,
      seq: storage.get('cotizador-seq', 1)
    };
  }

  let state = Object.assign(defaults(), storage.get(KEY, {}) || {});
  state.cliente = Object.assign(defaults().cliente, state.cliente || {});

  // Parámetros de URL: ?plan=profesional o ?modulos=ia,chat
  const params = new URLSearchParams(location.search);
  if (params.get('plan')) {
    const plan = PLANS.find((p) => p.id === params.get('plan'));
    if (plan) { state.plan = plan.id; state.modulos = plan.modulos.slice(); state.asesores = Math.max(state.asesores, Number(plan.limites.asesores) || 1); }
  } else if (params.get('modulos')) {
    state.modulos = params.get('modulos').split(',').filter((id) => MODULES.byId(id) && id !== 'base');
    state.plan = null;
  }
  if (params.toString()) history.replaceState(null, '', location.pathname);

  let saveTimer;
  function save() {
    storage.set(KEY, state);
    clearTimeout(saveTimer);
    const ind = document.getElementById('save-ind');
    if (ind) { ind.textContent = 'Guardando…'; saveTimer = setTimeout(() => { ind.innerHTML = `${icon('check', 'sm')}Guardado en este navegador`; }, 350); }
  }

  // ---------- Cliente ----------
  const clientForm = document.getElementById('client-form');
  clientForm.innerHTML = ui.renderFields(CLIENT_FIELDS, state.cliente);
  clientForm.addEventListener('input', (e) => {
    const f = e.target;
    if (!f.name) return;
    state.cliente[f.name] = f.value;
    const w = f.closest('.field.invalid');
    if (w) w.classList.remove('invalid');
    save();
    if (f.name === 'fecha') renderNumber();
    renderSummary();
  });
  function renderNumber() {
    document.getElementById('quote-number').textContent = pricing.quoteNumber(ui.toDate(state.cliente.fecha) || new Date(), state.seq);
  }

  // ---------- Módulos ----------
  const modWrap = document.getElementById('quote-modules');
  function renderModules() {
    const sel = pricing.resolveSelection(state.modulos);
    modWrap.innerHTML = MODULES.ALL.map((m) => {
      const on = sel.ids.includes(m.id);
      const auto = on && sel.auto[m.id];
      const deps = m.requiere.filter((d) => d !== 'base').map((d) => MODULES.byId(d).corto);
      if (m.requiereAlguno) deps.push('un módulo con datos');
      return `
      <div class="qm${on ? ' on' : ''}${m.obligatorio ? ' locked' : ''}" data-id="${m.id}">
        <label class="qm-check">
          <input type="checkbox" ${on ? 'checked' : ''} ${m.obligatorio ? 'disabled' : ''} aria-label="Incluir ${esc(m.nombre)}">
          <span class="qm-box">${icon(m.obligatorio ? 'lock' : 'check', 'sm')}</span>
        </label>
        <div class="qm-info">
          <div class="qm-title"><span class="mc-code">${m.codigo}</span><strong>${esc(m.nombre)}</strong>
            ${m.obligatorio ? '<span class="badge solid">Obligatorio</span>' : auto ? `<span class="badge info">${esc(auto)}</span>` : ''}</div>
          <p>${esc(m.descripcion)}</p>
          <div class="qm-foot">
            ${deps.length ? `<span class="small muted">${icon('link', 'sm')}Requiere: ${deps.map(esc).join(', ')}</span>` : ''}
            <button type="button" class="link-btn" data-detail="${m.id}">${icon('list', 'sm')}Funcionalidades</button>
            <a class="link-btn" href="${m.prototipo}" target="_blank" rel="noopener">${icon('eye', 'sm')}Prototipo</a>
          </div>
        </div>
        <div class="qm-price"><strong>${fmt.money(m.implementacion)}</strong><small>implementación</small><strong>${fmt.money(m.mensual)}</strong><small>por mes</small></div>
      </div>`;
    }).join('');
    const n = sel.ids.length - 1;
    document.getElementById('mod-count').textContent = `${n} de ${MODULES.MODULES.length} módulos`;
    const autos = Object.entries(sel.auto).filter(([id]) => id !== 'base');
    document.getElementById('deps-notice').innerHTML = autos.length
      ? `<div class="notice info mb-2">${icon('info')}<p>Se agregaron automáticamente por dependencia: ${autos.map(([id, r]) => `<strong>${esc(MODULES.byId(id).corto)}</strong> (${esc(r.toLowerCase())})`).join(', ')}.</p></div>` : '';
  }

  modWrap.addEventListener('click', async (e) => {
    const det = e.target.closest('[data-detail]');
    if (det) {
      const m = MODULES.byId(det.dataset.detail);
      ui.modal({
        title: `${m.codigo} · ${m.nombre}`, subtitle: m.descripcion,
        body: `<ul class="check-list">${m.features.map((f) => `<li>${icon('check', 'sm')}<span>${esc(f)}</span></li>`).join('')}</ul>
               <p class="small muted mt-2 mb-0">Implementación ${fmt.money(m.implementacion)} · Mensualidad ${fmt.money(m.mensual)} · ${m.dias} días hábiles estimados.</p>`,
        actions: [{ label: 'Ver prototipo', kind: '', onClick: () => { window.open(m.prototipo, '_blank'); } }, { label: 'Cerrar', kind: 'btn-primary' }]
      });
      return;
    }
    if (e.target.closest('a')) return;
    const card = e.target.closest('.qm');
    if (!card || card.classList.contains('locked')) return;
    e.preventDefault();
    await toggleModule(card.dataset.id);
  });

  async function toggleModule(id) {
    const current = pricing.resolveSelection(state.modulos).ids;
    const m = MODULES.byId(id);
    if (current.includes(id)) {
      const dependents = pricing.dependentsOf(id, current);
      if (dependents.length) {
        const names = dependents.map((d) => MODULES.byId(d).corto).join(', ');
        const ok = await ui.confirm({ title: `Quitar ${m.corto}`, message: `${names} depende${dependents.length > 1 ? 'n' : ''} de ${m.corto}. Si continúa, también se quitará${dependents.length > 1 ? 'n' : ''}.`, confirmLabel: 'Quitar', danger: true });
        if (!ok) return;
      }
      const remove = new Set([id].concat(dependents));
      state.modulos = state.modulos.filter((x) => !remove.has(x));
    } else {
      const before = current;
      state.modulos = state.modulos.concat(id);
      const after = pricing.resolveSelection(state.modulos).ids;
      const added = after.filter((x) => !before.includes(x) && x !== id);
      if (added.length) ui.toast('Dependencias agregadas', added.map((x) => MODULES.byId(x).corto).join(', '), 'info');
    }
    save();
    renderModules();
    renderSummary();
  }

  document.getElementById('select-all').addEventListener('click', () => {
    state.modulos = MODULES.MODULES.map((m) => m.id);
    save(); renderModules(); renderSummary();
  });

  // ---------- Parámetros ----------
  const $ = (id) => document.getElementById(id);
  const asesoresEl = $('asesores');
  const contactosEl = $('contactos');
  const rangeEl = $('contactos-range');
  const promoEl = $('promo');
  const implOn = $('impl-manual-on');
  const implEl = $('impl-manual');
  promoEl.max = CONFIG.descuentoPromocionalMaximo;

  function syncParams() {
    asesoresEl.value = state.asesores;
    contactosEl.value = state.contactos;
    rangeEl.value = Math.min(30000, state.contactos);
    promoEl.value = state.descuentoPromo || 0;
    const manual = state.implementacionManual !== null && state.implementacionManual !== undefined;
    implOn.checked = manual;
    implEl.disabled = !manual;
    implEl.value = manual ? state.implementacionManual : '';
    $('periodos').innerHTML = CONFIG.periodos.map((p) => `
      <button type="button" role="radio" aria-checked="${p.id === state.periodo}" class="${p.id === state.periodo ? 'active' : ''}" data-p="${p.id}">${esc(p.nombre)}${p.descuento ? `<span class="save">−${p.descuento}%</span>` : ''}</button>`).join('');
    renderExtras();
  }

  function hints(c) {
    $('asesores-hint').textContent = c.asesoresExtra
      ? `${CONFIG.asesores.incluidos} incluidos + ${c.asesoresExtra} adicional${c.asesoresExtra > 1 ? 'es' : ''} × ${fmt.money(CONFIG.asesores.precioAdicionalMensual)}/mes`
      : `${CONFIG.asesores.incluidos} asesores incluidos. Adicional: ${fmt.money(CONFIG.asesores.precioAdicionalMensual)}/mes c/u.`;
    $('contactos-hint').textContent = c.aMedida ? `${c.tier.etiqueta}: el recargo se cotiza aparte.` : `${c.tier.etiqueta}${c.recargoContactos ? ` · +${fmt.money(c.recargoContactos)}/mes` : ' · sin recargo'}`;
    $('promo-hint').textContent = `Máximo ${CONFIG.descuentoPromocionalMaximo}%. Descuento total aplicado: ${c.descTotalPct}% (tope ${CONFIG.descuentoTotalMaximo}%).`;
    $('impl-hint').textContent = `Referencia por módulos: ${fmt.money(c.implModulos)}.`;
  }

  function fieldError(input, msg) {
    const w = input.closest('.field');
    w.classList.toggle('invalid', !!msg);
    w.querySelector('.error-msg').textContent = msg || '';
  }

  asesoresEl.addEventListener('input', () => {
    const v = Math.round(Number(asesoresEl.value));
    if (!Number.isFinite(v) || v < 1) return;
    state.asesores = Math.min(CONFIG.asesores.maximo, v);
    save(); renderSummary();
  });
  asesoresEl.addEventListener('blur', () => { asesoresEl.value = state.asesores; });
  document.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
    state.asesores = Math.max(1, Math.min(CONFIG.asesores.maximo, state.asesores + Number(b.dataset.step)));
    asesoresEl.value = state.asesores;
    save(); renderSummary();
  }));
  contactosEl.addEventListener('input', () => {
    const v = Math.max(0, Math.round(Number(contactosEl.value) || 0));
    state.contactos = v; rangeEl.value = Math.min(30000, v);
    save(); renderSummary();
  });
  rangeEl.addEventListener('input', () => {
    state.contactos = Number(rangeEl.value); contactosEl.value = state.contactos;
    save(); renderSummary();
  });
  promoEl.addEventListener('input', () => {
    const v = Number(promoEl.value);
    if (promoEl.value !== '' && (!Number.isFinite(v) || v < 0 || v > CONFIG.descuentoPromocionalMaximo)) {
      fieldError(promoEl, `Ingrese un valor entre 0 y ${CONFIG.descuentoPromocionalMaximo}.`);
      return;
    }
    fieldError(promoEl, '');
    state.descuentoPromo = v || 0;
    save(); renderSummary();
  });
  implOn.addEventListener('change', () => {
    implEl.disabled = !implOn.checked;
    if (implOn.checked) {
      const c = pricing.calculate(state);
      state.implementacionManual = c.implModulos;
      implEl.value = c.implModulos;
      implEl.focus();
    } else {
      state.implementacionManual = null;
      implEl.value = '';
      fieldError(implEl, '');
    }
    save(); renderSummary();
  });
  implEl.addEventListener('input', () => {
    const v = Number(implEl.value);
    if (implEl.value === '' || !Number.isFinite(v) || v < 0) { fieldError(implEl, 'Ingrese un monto válido (0 o más).'); return; }
    fieldError(implEl, '');
    state.implementacionManual = v;
    save(); renderSummary();
  });
  $('periodos').addEventListener('click', (e) => {
    const b = e.target.closest('[data-p]');
    if (!b) return;
    state.periodo = b.dataset.p;
    $('periodos').querySelectorAll('button').forEach((x) => { const on = x === b; x.classList.toggle('active', on); x.setAttribute('aria-checked', String(on)); });
    save(); renderSummary();
  });

  // Servicios adicionales
  function renderExtras() {
    const wrap = $('extras');
    if (!state.adicionales.length) {
      wrap.innerHTML = '<p class="small muted mb-0">Sin servicios adicionales.</p>';
      return;
    }
    wrap.innerHTML = state.adicionales.map((a, i) => `
      <div class="extra-row" data-i="${i}">
        <input class="input input-sm" data-k="descripcion" placeholder="Descripción del servicio" value="${esc(a.descripcion)}" aria-label="Descripción">
        <select class="select input-sm" data-k="tipo" aria-label="Tipo de cobro"><option value="unico"${a.tipo !== 'mensual' ? ' selected' : ''}>Pago único</option><option value="mensual"${a.tipo === 'mensual' ? ' selected' : ''}>Mensual</option></select>
        <div class="input-affix"><span class="affix">Bs</span><input class="input input-sm" type="number" min="0" step="10" data-k="monto" value="${esc(a.monto)}" aria-label="Monto"></div>
        <button type="button" class="btn btn-ghost btn-icon btn-sm" data-del="${i}" aria-label="Eliminar servicio">${icon('trash', 'sm')}</button>
      </div>`).join('');
  }
  $('extras').addEventListener('input', (e) => {
    const row = e.target.closest('.extra-row');
    if (!row) return;
    const a = state.adicionales[Number(row.dataset.i)];
    const k = e.target.dataset.k;
    a[k] = k === 'monto' ? Number(e.target.value) || 0 : e.target.value;
    save(); renderSummary();
  });
  $('extras').addEventListener('click', (e) => {
    const b = e.target.closest('[data-del]');
    if (!b) return;
    state.adicionales.splice(Number(b.dataset.del), 1);
    save(); renderExtras(); renderSummary();
  });
  $('add-extra').addEventListener('click', () => {
    state.adicionales.push({ descripcion: '', tipo: 'unico', monto: 0 });
    renderExtras();
    const rows = $('extras').querySelectorAll('.extra-row');
    rows[rows.length - 1].querySelector('input').focus();
  });

  // Costos externos
  $('external').innerHTML = CONFIG.costosExternos.map((c) => `
    <div class="ext-item">${icon('external', 'sm')}<div><strong>${esc(c.nombre)}</strong><p>${esc(c.detalle)}</p></div><span class="badge">No incluido</span></div>`).join('');

  // ---------- Comparación con plan ----------
  function renderPlanCompare(c) {
    const box = $('plan-compare');
    const plan = state.plan && PLANS.find((p) => p.id === state.plan);
    if (!plan) { box.innerHTML = ''; return; }
    const cmp = pricing.compareWithPlan(plan, state);
    const diff = c.mensualBase - plan.mensual;
    box.innerHTML = `
      <section class="card plan-compare">
        <div class="card-head"><h3>${icon('compare')}Paquete ${esc(plan.nombre)} vs. configuración a medida</h3>
          <button class="btn btn-ghost btn-sm" id="clear-plan">${icon('x', 'sm')}Quitar comparación</button></div>
        <div class="card-body">
          <div class="pc-grid">
            <div class="pc-col">
              <span class="label">Plan ${esc(plan.nombre)} (paquete)</span>
              <strong class="pc-price">${plan.desde ? '<small>Desde</small> ' : ''}${fmt.money(plan.mensual)}<small>/mes</small></strong>
              <span class="small muted">Implementación ${fmt.money(plan.implementacion)} · ${plan.limites.asesores} asesores · ${esc(plan.limites.contactos)} contactos</span>
            </div>
            <div class="pc-vs">vs</div>
            <div class="pc-col">
              <span class="label">Su configuración actual</span>
              <strong class="pc-price">${fmt.money(c.mensualBase)}<small>/mes</small></strong>
              <span class="small muted">Implementación ${fmt.money(c.implementacion)} · ${c.ids.length - 1} módulos · ${c.asesores} asesores</span>
            </div>
          </div>
          <div class="notice ${diff > 0 ? 'ok' : 'info'} mt-2">${icon(diff > 0 ? 'checkCircle' : 'info')}<p>${diff > 0
            ? `El paquete ${esc(plan.nombre)} le ahorra <strong>${fmt.money(diff)}/mes</strong> frente a contratar estos módulos por separado (referencia por módulos del paquete: ${fmt.money(cmp.modularMensual)}/mes), dentro de sus límites de uso.`
            : `Su configuración a medida cuesta ${fmt.money(Math.abs(diff))}/mes ${diff === 0 ? 'lo mismo que' : 'menos que'} el paquete. Conviene si no necesita todos los módulos del plan.`}</p></div>
          <div class="btn-group mt-2"><a class="btn btn-sm" href="planes.html#${plan.id}">Ver detalle del plan</a></div>
        </div>
      </section>`;
    $('clear-plan').onclick = () => { state.plan = null; save(); renderSummary(); };
  }

  // ---------- Resumen ----------
  function renderSummary() {
    const c = pricing.calculate(state);
    hints(c);
    renderPlanCompare(c);
    const row = (label, value, cls = '', note = '') => `<div class="qs-row ${cls}"><span>${label}${note ? `<small>${note}</small>` : ''}</span><strong>${value}</strong></div>`;
    $('summary').innerHTML = `
      <div class="card">
        <div class="card-head"><h3>Resumen de la cotización</h3><span class="badge">${esc(c.periodo.nombre)}</span></div>
        <div class="card-body">
          <div class="qs-items">${c.items.map((i) => `<div class="qs-item"><span class="mc-code">${i.codigo}</span><span class="grow">${esc(MODULES.byId(i.id).corto)}</span><span class="nowrap">${fmt.money(i.mensual)}</span></div>`).join('')}</div>
          <div class="qs-block">
            ${row('Implementación única', fmt.money(c.implementacion), 'big', c.implManual ? `Ajustada · referencia ${fmt.money(c.implModulos)}` : `${c.items.length} componentes`)}
            ${c.adicUnico ? row('Servicios adicionales (único)', fmt.money(c.adicUnico)) : ''}
          </div>
          <div class="qs-block">
            ${row('Mensualidad base', fmt.money(c.mensualBase), '', [c.costoAsesores ? `asesores +${fmt.money(c.costoAsesores)}` : '', c.recargoContactos ? `contactos +${fmt.money(c.recargoContactos)}` : ''].filter(Boolean).join(' · '))}
            ${row(`Descuento ${c.descTotalPct}%`, c.descuentoMensual ? `− ${fmt.money(c.descuentoMensual)}` : fmt.money(0), 'discount', c.descTotalPct ? `${c.descPeriodo ? `${c.periodo.nombre} ${c.descPeriodo}%` : ''}${c.descPeriodo && c.descPromo ? ' + ' : ''}${c.descPromo ? `promo ${c.descPromo}%` : ''}` : 'Sin descuento')}
            ${row('Mensualidad con descuento', fmt.money(c.mensualConDescuento), 'big')}
            ${c.adicMensual ? row('Servicios adicionales mensuales', `+ ${fmt.money(c.adicMensual)}`) : ''}
            ${row(`Suscripción ${c.periodo.nombre.toLowerCase()}`, fmt.money(c.suscripcionPeriodo), '', `${c.periodo.meses} ${c.periodo.meses > 1 ? 'meses' : 'mes'} × ${fmt.money(c.mensualFinal)}`)}
          </div>
          <div class="qs-total">
            <span>Total del primer periodo</span>
            <strong>${fmt.money(c.totalPrimerPeriodo)}</strong>
            <small>Implementación + suscripción ${c.periodo.nombre.toLowerCase()}</small>
          </div>
          <div class="qs-block">
            ${row('Costo de renovación', fmt.money(c.renovacion), '', `cada ${c.periodo.meses > 1 ? `${c.periodo.meses} meses` : 'mes'}`)}
            ${c.ahorroPeriodo ? row('Ahorro por periodo', fmt.money(c.ahorroPeriodo), 'discount') : ''}
            ${row('Plazo estimado', `${c.plazo.min}–${c.plazo.max} días`, '', 'hábiles')}
          </div>
          ${c.aMedida ? `<div class="notice warn mt-2">${icon('alert')}<p>Más de 20.000 contactos: el recargo por volumen se cotiza a medida.</p></div>` : ''}
          <p class="small muted mt-2 mb-0">${icon('info', 'sm')} No incluye costos de Meta, IA ni otros servicios externos.</p>
        </div>
        <div class="card-foot qs-actions">
          <button class="btn btn-primary btn-block" id="btn-pdf">${icon('download', 'sm')}Exportar PDF</button>
          <button class="btn" id="btn-preview">${icon('eye', 'sm')}Vista previa</button>
          <button class="btn" id="btn-print">${icon('printer', 'sm')}Imprimir</button>
          <button class="btn btn-ghost" id="btn-reset">${icon('refresh', 'sm')}Restablecer</button>
        </div>
        <div class="qs-save" id="save-ind">${icon('check', 'sm')}Guardado en este navegador</div>
      </div>`;
    $('btn-pdf').onclick = (e) => exportPDF(e.currentTarget);
    $('btn-print').onclick = printQuote;
    $('btn-preview').onclick = preview;
    $('btn-reset').onclick = reset;
  }

  function validateClient() {
    const r = ui.validate(clientForm, CLIENT_FIELDS);
    if (!r.ok) {
      document.getElementById('sec-cliente').scrollIntoView({ behavior: 'smooth', block: 'start' });
      ui.toast('Complete los datos del cliente', 'Revise los campos marcados en rojo.', 'warn');
    }
    return r.ok;
  }

  async function exportPDF(btn) {
    if (!validateClient()) return;
    btn.classList.add('loading');
    try {
      const model = quoteDoc.buildModel(state);
      await WAB.pdf.exportQuote(model);
      ui.toast('PDF generado', `${model.numero}.pdf`, 'ok');
    } catch (err) {
      console.error(err);
      ui.toast('No se pudo generar el PDF', 'Use "Imprimir" y elija "Guardar como PDF".', 'danger', 6000);
    } finally {
      btn.classList.remove('loading');
    }
  }

  function printQuote() {
    if (!validateClient()) return;
    document.getElementById('print-doc').innerHTML = quoteDoc.toHTML(quoteDoc.buildModel(state));
    setTimeout(() => window.print(), 50);
  }

  function preview() {
    const model = quoteDoc.buildModel(state);
    ui.modal({
      title: `Vista previa · ${model.numero}`,
      size: 'xl',
      body: `<div class="print-doc preview">${quoteDoc.toHTML(model)}</div>`,
      actions: [
        { label: 'Imprimir', icon: 'printer', onClick: () => { printQuote(); } },
        { label: 'Exportar PDF', kind: 'btn-primary', icon: 'download', onClick: ({ button }) => exportPDF(button).then(() => false) }
      ]
    });
  }

  async function reset() {
    const ok = await ui.confirm({ title: 'Restablecer cotización', message: 'Se borrarán los datos del cliente, los módulos y los parámetros. Se asignará un nuevo número de cotización.', confirmLabel: 'Restablecer', danger: true });
    if (!ok) return;
    const seq = (state.seq || 1) + 1;
    storage.set('cotizador-seq', seq);
    state = defaults();
    state.seq = seq;
    storage.set(KEY, state);
    clientForm.innerHTML = ui.renderFields(CLIENT_FIELDS, state.cliente);
    syncParams(); renderNumber(); renderModules(); renderSummary();
    ui.toast('Cotización restablecida', 'Nuevo número asignado.', 'info');
  }

  window.addEventListener('afterprint', () => { document.getElementById('print-doc').innerHTML = ''; });

  syncParams();
  renderNumber();
  renderModules();
  renderSummary();
  save();
  if (state.plan) ui.toast('Plan precargado', `Módulos del plan ${PLANS.find((p) => p.id === state.plan).nombre} seleccionados. Compare con su configuración.`, 'info', 5000);

  // Para pruebas automatizadas
  WAB.cotizador = { getState: () => state, calc: () => pricing.calculate(state), toggleModule };
})();
