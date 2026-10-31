/* Página comercial: todo se dibuja a partir de TOR.CONFIG mediante el modelo de pricing.js. */
(function () {
  const { CONFIG, pricing, ui, icon } = window.TOR;
  const { esc } = ui;
  const STORAGE_KEY = 'torneria:cliente-v1';

  const problemas = pricing.validate(CONFIG);
  if (problemas.length) console.warn('[Configuración] ' + problemas.join(' '));

  function loadOverrides() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (e) { return {}; }
  }
  let model = pricing.buildModel(CONFIG, loadOverrides());
  window.TOR.getModel = () => model;

  const get = (obj, path) => path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
  const $ = (id) => document.getElementById(id);

  function renderBinds() {
    const src = Object.assign({}, CONFIG, { cotizacion: model.cotizacion, cliente: model.cliente });
    document.querySelectorAll('[data-bind]').forEach((el) => { el.textContent = get(src, el.dataset.bind) || ''; });
    $('footFecha').textContent = model.fechaEmisionTexto;
  }

  function renderHero() {
    $('heroTotal').textContent = model.money(model.total);
    $('heroPlazo').textContent = model.plazoTexto;
    $('heroModulos').textContent = String(model.modulos.length);
  }

  function renderProblemas() {
    $('problemasGrid').innerHTML = CONFIG.problemas.map((p) => `<article class="card problem reveal"><span class="ico">${icon(p.icono)}</span><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></article>`).join('');
  }

  function renderBeneficios() {
    $('beneficiosGrid').innerHTML = CONFIG.beneficios.map((b) => `<article class="benefit reveal">${icon(b.icono)}<h3>${esc(b.titulo)}</h3><p>${esc(b.texto)}</p></article>`).join('')
      + `<article class="benefit cta-cell reveal"><div><h3>Véalo funcionando</h3><p>El prototipo simula la operación diaria con datos de demostración.</p></div><a href="prototipo/index.html">Abrir prototipo ${icon('arrowRight', 'sm')}</a></article>`;
  }

  function renderModulos() {
    $('modulosGrid').innerHTML = model.modulos.map((m) => `
      <button class="module reveal" data-mod="${m.id}" aria-label="Ver detalle del módulo ${esc(m.nombre)}">
        <div class="module-top"><span class="module-ico">${icon(m.icono, 'lg')}</span><div><div class="module-num">MÓDULO ${String(m.numero).padStart(2, '0')}</div><h3>${esc(m.nombre)}</h3></div></div>
        <p>${esc(m.resumen)}</p>
        <ul>${m.funciones.slice(0, 4).map((f) => `<li>${esc(f)}</li>`).join('')}${m.funciones.length > 4 ? `<li>+${m.funciones.length - 4} más</li>` : ''}</ul>
        <div class="module-foot"><b>${m.incluido ? 'Incluido' : esc(model.money(m.monto))}</b><span>Ver detalle ${icon('chevronRight', 'sm')}</span></div>
      </button>`).join('');
    $('modulosGrid').addEventListener('click', (e) => {
      const b = e.target.closest('[data-mod]');
      if (b) openModulo(b.dataset.mod);
    });
  }

  function openModulo(id) {
    const m = model.modulos.find((x) => x.id === id);
    const pct = m.monto ? Math.round((m.monto / model.total) * 1000) / 10 : 0;
    ui.modal({
      title: `Módulo ${m.numero}. ${m.nombre}`,
      sub: esc(m.resumen),
      size: 'wide',
      body: `<div class="mod-detail">
          <div><h4 style="margin-bottom:12px">Funcionalidades incluidas</h4><ul>${m.funciones.map((f) => `<li>${icon('checkCircle', 'sm')}<span>${esc(f)}</span></li>`).join('')}</ul>
          ${m.nota ? `<div class="mod-note">${icon('info', 'sm')}<span>${esc(m.nota)}</span></div>` : ''}</div>
          <div class="mod-side"><small class="muted">Costo del módulo</small><div class="big">${m.incluido ? 'Incluido' : esc(model.money(m.monto))}</div>
          <small class="muted">${m.incluido ? esc(CONFIG.notaCostos) : `${String(pct).replace('.', ',')} % de la inversión total de ${esc(model.money(model.total))}.`}</small>
          <a class="btn btn-dark" href="prototipo/index.html#/${m.vista}">${icon('play', 'sm')}Ver en el prototipo</a></div>
        </div>`,
      foot: `<button class="btn btn-outline" data-close>Cerrar</button>`
    });
  }

  function renderInversion() {
    const max = Math.max(...model.costos.map((c) => c.monto));
    $('costTable').innerHTML = `<thead><tr><th>#</th><th>Módulo / servicio</th><th class="pct right">%</th><th class="right">Precio</th></tr></thead>
      <tbody>${model.costos.map((c, i) => `<tr>
        <td>${String(i + 1).padStart(2, '0')}</td>
        <td><div class="concept">${icon(c.modulo ? c.modulo.icono : 'users', 'sm')}<span>${esc(c.concepto)}</span><span class="spacer"></span><span class="bar" aria-hidden="true"><span style="width:${(c.monto / max) * 100}%"></span></span></div></td>
        <td class="pct right num">${(c.monto / model.total * 100).toFixed(1).replace('.', ',')}</td>
        <td class="right num nowrap"><b>${esc(model.money(c.monto))}</b></td></tr>`).join('')}</tbody>
      <tfoot><tr><td></td><td>TOTAL</td><td class="pct"></td><td class="right num nowrap" id="costTotal">${esc(model.money(model.total))}</td></tr></tfoot>`;
    $('costNote').textContent = CONFIG.notaCostos;
    $('investTotal').textContent = model.money(model.total);
    $('investPlazo').textContent = `${model.plazoTexto} · ${CONFIG.proyecto.tipo}`;
    $('payList').innerHTML = model.pagos.map((p) => `<div class="pay-item"><div><b>${p.porcentaje}% · ${esc(p.concepto)}</b><small>${esc(p.momento)}</small></div><strong>${esc(model.money(p.monto))}</strong></div>`).join('');
    $('mantMonto').textContent = model.money(model.mantenimiento.montoMensual);
    $('hostMonto').textContent = model.money(model.hosting.montoMensual);
    $('hostMeses').textContent = model.hosting.meses;
    $('hostTotal').textContent = model.money(model.hosting.total);
  }

  let escenario = 'max';
  function renderCronograma() {
    $('cronoPlazo').textContent = model.plazoTexto;
    const sem = model.semanas;
    $('cronoSeg').innerHTML = [['min', `${sem.min} semanas`], ['max', `${sem.max} semanas`]].map(([k, l]) => `<button role="tab" aria-selected="${k === escenario}" data-esc="${k}">Escenario ${l}</button>`).join('');
    const total = sem[escenario];
    const cols = `grid-template-columns:repeat(${total},1fr)`;
    const head = `<div class="g-row g-head"><div class="g-label">Etapa</div><div class="g-track"><div class="g-cols" style="${cols}">${Array.from({ length: total }, (_, i) => `<span>S${i + 1}</span>`).join('')}</div></div></div>`;
    const rows = model.cronograma.map((e, i) => {
      const [a, b] = e[escenario];
      const dur = b - a + 1;
      return `<div class="g-row"><div class="g-label"><span class="n">${i + 1}</span><div><b>${esc(e.etapa)}</b><small>${esc(e.descripcion)}</small></div></div>
        <div class="g-track"><div class="g-cols" style="${cols}">${'<span></span>'.repeat(total)}</div>
        <div class="g-bar" style="left:calc(${((a - 1) / total) * 100}% + 4px);width:calc(${(dur / total) * 100}% - 8px)" title="${esc(e.entregable)}">${a === b ? `Sem. ${a}` : `Sem. ${a}–${b}`}</div></div></div>`;
    }).join('');
    $('gantt').innerHTML = head + rows;
  }

  function renderSoporte() {
    const m = model.money(model.mantenimiento.montoMensual);
    $('soporteMonto').textContent = m;
    $('soporteMonto2').textContent = m;
    $('soporteIncluye').innerHTML = model.mantenimiento.incluye.map((t) => `<li>${icon('check', 'sm')}<span>${esc(t)}</span></li>`).join('');
    $('soporteNo').innerHTML = model.mantenimiento.noIncluye.map((t) => `<li>${icon('minus', 'sm')}<span>${esc(t)}</span></li>`).join('');
  }

  function renderCondiciones() {
    $('exclList').innerHTML = CONFIG.exclusiones.map((t) => `<li>${icon('x', 'sm')}<span>${esc(t)}</span></li>`).join('');
    $('condList').innerHTML = [model.hostingTexto, ...CONFIG.condicionesComerciales].map((t) => `<li>${icon('check', 'sm')}<span>${esc(t)}</span></li>`).join('');
  }

  // ---- Datos del cliente (solo en este navegador) ----
  const CAMPOS = [['razonSocial', 'Razón social', 'full'], ['nit', 'NIT'], ['ciudad', 'Ciudad'], ['contacto', 'Persona de contacto'], ['cargo', 'Cargo'], ['telefono', 'Teléfono'], ['correo', 'Correo electrónico'], ['direccion', 'Dirección', 'full']];
  function openCliente() {
    const ov = loadOverrides();
    const val = (k) => (ov.cliente && ov.cliente[k]) || (model.esPendiente(CONFIG.cliente[k]) ? '' : CONFIG.cliente[k]);
    ui.modal({
      title: 'Datos del cliente para el PDF',
      sub: 'Se guardan solo en este navegador. Los campos vacíos aparecen en el PDF como "[Por completar]".',
      body: `<form id="clienteForm" class="form-grid" novalidate>
        ${CAMPOS.map(([k, l, cls]) => `<label class="field ${cls || ''}"><span>${l}</span><input class="input" name="${k}" value="${esc(val(k))}" autocomplete="off"></label>`).join('')}
        <label class="field full"><span>Validez de la oferta</span><input class="input" name="validez" value="${esc(ov.validez || (model.esPendiente(CONFIG.cotizacion.validez) ? '' : CONFIG.cotizacion.validez))}" placeholder="Ej.: 15 días calendario desde su emisión"><small>Si se deja vacío, figura como "[Por completar]".</small></label>
      </form>`,
      foot: `<button class="btn btn-ghost" data-act="limpiar">Limpiar</button><span class="spacer"></span><button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" data-act="guardar">Guardar</button>`,
      onOpen: (el, close) => {
        const form = el.querySelector('#clienteForm');
        el.querySelector('[data-act="limpiar"]').addEventListener('click', () => { form.querySelectorAll('input').forEach((i) => { i.value = ''; }); });
        el.querySelector('[data-act="guardar"]').addEventListener('click', () => {
          const { ok, data } = ui.validateForm(form, { correo: { email: true } });
          if (!ok) return;
          const { validez, ...cliente } = data;
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ cliente, validez }));
          model = pricing.buildModel(CONFIG, loadOverrides());
          renderAll();
          close();
          ui.toast('Datos guardados', { text: 'Se usarán en la próxima descarga del PDF.' });
        });
      }
    });
  }

  async function descargarPDF(btn) {
    const buttons = document.querySelectorAll('[data-action="pdf"]');
    buttons.forEach((b) => { b.disabled = true; });
    const label = btn.innerHTML;
    btn.innerHTML = `${icon('refresh', 'sm')}Generando…`;
    try {
      const name = await window.TOR.pdf.download(model);
      ui.toast('PDF generado', { text: name });
    } catch (e) {
      console.error(e);
      ui.toast('No se pudo generar el PDF', { text: e.message, type: 'critical' });
    } finally {
      btn.innerHTML = label;
      buttons.forEach((b) => { b.disabled = false; });
    }
  }

  function bindGlobal() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('[data-action]');
      if (a && a.dataset.action === 'pdf') descargarPDF(a);
      if (a && a.dataset.action === 'cliente') openCliente();
      const s = e.target.closest('[data-esc]');
      if (s) { escenario = s.dataset.esc; renderCronograma(); }
    });
    const toggle = $('navToggle');
    const links = $('navLinks');
    toggle.addEventListener('click', () => { const open = links.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); });
    links.addEventListener('click', (e) => { if (e.target.closest('a')) { links.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); } });

    // Enlace activo según la sección visible.
    const map = new Map([...links.querySelectorAll('a')].map((a) => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting && map.has(en.target.id)) { map.forEach((a) => a.classList.remove('active')); map.get(en.target.id).classList.add('active'); } });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const s = $(id); if (s) spy.observe(s); });
  }

  function reveal() {
    const els = document.querySelectorAll('.reveal:not(.in)');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -40px 0px' });
    els.forEach((e, i) => { e.style.transitionDelay = `${(i % 3) * 60}ms`; io.observe(e); });
  }

  let first = true;
  function renderAll() {
    renderBinds();
    renderHero();
    if (first) { renderProblemas(); renderBeneficios(); renderModulos(); }
    renderInversion();
    renderCronograma();
    renderSoporte();
    renderCondiciones();
    window.TOR.hydrateIcons();
    if (first) { reveal(); first = false; }
  }

  renderAll();
  bindGlobal();
})();
