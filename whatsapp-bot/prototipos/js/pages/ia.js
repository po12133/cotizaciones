/* Inteligencia artificial (SIMULADA): personalidad, conocimiento, preguntas frecuentes, límites y chat de prueba. */
(function () {
  const { icon, ui, db, shell } = window.WAB;
  const { esc, fmt } = ui;
  let tab = 'general';
  const memory = {};

  shell.view.innerHTML = `
    <div class="page-head">
      <div><h2>Inteligencia artificial</h2><p class="muted">Configure cómo responde el asistente a mensajes en texto libre. En este prototipo la IA es una simulación por coincidencia de palabras clave: no se conecta a ningún modelo.</p></div>
      <label class="switch" id="ai-switch"><input type="checkbox"><span class="track"></span><strong>Asistente activo</strong></label>
    </div>
    <div class="notice warn">${icon('info')}<p>En producción, las respuestas las genera un modelo de lenguaje con esta misma configuración. El consumo del proveedor de IA se factura aparte y se controla con los límites de abajo.</p></div>
    <div class="tabs" role="tablist">
      <button class="tab" data-tab="general">${icon('settings', 'sm')}Personalidad</button>
      <button class="tab" data-tab="conocimiento">${icon('book', 'sm')}Base de conocimiento</button>
      <button class="tab" data-tab="faqs">${icon('list', 'sm')}Preguntas frecuentes</button>
      <button class="tab" data-tab="limites">${icon('shield', 'sm')}Límites y transferencia</button>
      <button class="tab" data-tab="registro">${icon('clock', 'sm')}Registro</button>
    </div>
    <div class="split">
      <div id="tab-body" class="stack"></div>
      <div class="phone-col">
        <div class="phone flat wa" id="tester">
          <div class="phone-screen" style="height:560px">
            <div class="wa-head"><span class="avatar">${icon('sparkles')}</span><div class="wa-head-info"><strong>Probar asistente</strong><small id="ai-name"></small></div><span class="wa-sim-tag">IA simulada</span><div class="wa-head-actions"><button id="clear-test" title="Limpiar" aria-label="Limpiar chat">${icon('refresh', 'sm')}</button></div></div>
            <div class="wa-body" id="test-body"><div class="wa-sys">Escriba una pregunta como lo haría un cliente. Verá la fuente y la confianza de cada respuesta.</div></div>
            <div class="wa-quick">${['¿Hacen envíos?', 'Me llamo Ana', '¿Cuánto cuesta la ecografía?', '¿y cuánto dura?', '¿Atienden emergencias?', 'Quiero hacer un reclamo', '¿Venden pipetas antipulgas?'].map((q) => `<button data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
            <form class="wa-compose" id="test-form" autocomplete="off"><div class="wa-input-wrap"><input placeholder="Escriba una pregunta" aria-label="Pregunta" maxlength="300"></div><button class="wa-send" aria-label="Enviar">${icon('send')}</button></form>
          </div>
        </div>
        <p class="phone-caption">Las pruebas no consumen el límite mensual ni se guardan en conversaciones.</p>
      </div>
    </div>`;

  const body = document.getElementById('tab-body');
  const sw = document.querySelector('#ai-switch input');
  sw.checked = db.get('ai').activo;
  sw.onchange = () => { db.update('ai', (a) => { a.activo = sw.checked; return a; }); ui.toast(sw.checked ? 'Asistente activado' : 'Asistente desactivado', sw.checked ? 'Responderá mensajes de texto libre.' : 'Los mensajes no reconocidos mostrarán el menú.', sw.checked ? 'ok' : 'warn'); };

  function setTab(t) {
    tab = t;
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === t));
    ({ general, conocimiento: () => listTab('conocimiento'), faqs: () => listTab('faqs'), limites, registro })[t]();
  }
  document.querySelector('.tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); });

  function general() {
    const a = db.get('ai');
    const fields = [
      { name: 'nombre', label: 'Nombre del asistente', required: true, maxlength: 30 },
      { name: 'tono', label: 'Tono', type: 'select', options: [{ value: 'cercano', label: 'Cercano y amable' }, { value: 'formal', label: 'Formal (usted)' }, { value: 'entusiasta', label: 'Entusiasta' }] },
      { name: 'longitud', label: 'Longitud de respuestas', type: 'select', options: [{ value: 'breve', label: 'Breve' }, { value: 'detallada', label: 'Detallada' }] },
      { name: 'memoria', label: 'Recordar datos del cliente (nombre, último producto consultado)', type: 'checkbox' },
      { name: 'instrucciones', label: 'Instrucciones de comportamiento', type: 'textarea', full: true, rows: 3, required: true },
      { name: 'empresa', label: 'Información de la empresa', type: 'textarea', full: true, rows: 5, required: true, hint: 'Dirección, horarios, formas de pago, envíos y políticas generales.' }
    ];
    body.innerHTML = `<div class="card"><div class="card-head"><h3>Personalidad e información</h3></div><div class="card-body"><form class="form-grid" id="f" novalidate>${ui.renderFields(fields, a)}</form></div><div class="card-foot"><button class="btn btn-primary" id="save">${icon('check', 'sm')}Guardar</button></div></div>
      <div class="card card-pad"><h4 class="mb-1">Fuentes que usa el asistente</h4><div class="chips"><span class="badge">${a.conocimiento.length} artículos</span><span class="badge">${a.faqs.length} preguntas frecuentes</span><span class="badge">${db.get('services').filter((s) => s.activo).length} servicios</span><span class="badge">${db.get('products').filter((p) => p.activo).length} productos</span><span class="badge">Información de la empresa</span></div></div>`;
    body.querySelector('#save').onclick = () => {
      const r = ui.validate(body.querySelector('#f'), fields);
      if (!r.ok) return;
      db.update('ai', (x) => Object.assign(x, r.values));
      document.getElementById('ai-name').textContent = `${r.values.nombre} · tono ${r.values.tono}`;
      ui.toast('Configuración guardada', 'El chat de prueba y el simulador usan la nueva personalidad.', 'ok');
    };
  }

  function listTab(kind) {
    const isKB = kind === 'conocimiento';
    const items = db.get('ai')[kind];
    const fields = isKB
      ? [{ name: 'titulo', label: 'Título', required: true, full: true }, { name: 'contenido', label: 'Contenido', type: 'textarea', required: true, full: true, rows: 5 }, { name: 'claves', label: 'Palabras clave (coma)', full: true, hint: 'Ayudan a encontrar este artículo.' }]
      : [{ name: 'pregunta', label: 'Pregunta', required: true, full: true }, { name: 'respuesta', label: 'Respuesta', type: 'textarea', required: true, full: true, rows: 4 }, { name: 'claves', label: 'Palabras clave (coma)', full: true }];
    body.innerHTML = `<div class="card">
      <div class="card-head"><h3>${isKB ? 'Base de conocimiento' : 'Preguntas frecuentes'}</h3><div class="row"><div class="input-group"><span>${icon('search', 'sm')}</span><input class="input input-sm" id="q" placeholder="Buscar…" aria-label="Buscar"></div><button class="btn btn-primary btn-sm" id="add">${icon('plus', 'sm')}Agregar</button></div></div>
      <div class="list-rows" id="list"></div></div>`;
    const draw = () => {
      const q = body.querySelector('#q').value.toLowerCase();
      const f = items.filter((x) => JSON.stringify(x).toLowerCase().includes(q));
      body.querySelector('#list').innerHTML = f.length ? f.map((x) => `<div class="list-row"><span class="kpi-icon">${icon(isKB ? 'book' : 'info')}</span><div class="grow"><strong>${esc(isKB ? x.titulo : x.pregunta)}</strong><small>${esc(isKB ? x.contenido : x.respuesta)}</small>${x.claves ? `<div class="chips mt-1">${x.claves.split(',').slice(0, 5).map((k) => `<span class="tag">${esc(k.trim())}</span>`).join('')}</div>` : ''}</div><div class="row" style="gap:4px"><button class="btn btn-ghost btn-icon btn-sm" data-edit="${x.id}" aria-label="Editar">${icon('edit', 'sm')}</button><button class="btn btn-ghost btn-icon btn-sm" data-del="${x.id}" aria-label="Eliminar">${icon('trash', 'sm')}</button></div></div>`).join('')
        : `<div class="card-body">${ui.emptyState({ icon: 'book', title: q ? 'Sin resultados' : 'Aún no hay contenido', text: q ? 'Pruebe con otra palabra.' : 'Agregue información para que el asistente pueda responder.' })}</div>`;
      body.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => edit(items.find((x) => x.id === b.dataset.edit)));
      body.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
        if (!(await ui.confirm({ title: 'Eliminar', message: 'El asistente dejará de usar esta información.', confirmLabel: 'Eliminar', danger: true }))) return;
        db.update('ai', (a) => { a[kind] = a[kind].filter((x) => x.id !== b.dataset.del); return a; });
        listTab(kind);
      });
    };
    const edit = (item) => ui.formModal({
      title: item ? 'Editar' : (isKB ? 'Nuevo artículo' : 'Nueva pregunta frecuente'), fields, values: item || {}, size: 'lg',
      onSubmit: (v) => {
        db.update('ai', (a) => { const id = (item && item.id) || ui.uid(isKB ? 'kb' : 'fq'); const i = a[kind].findIndex((x) => x.id === id); const it = Object.assign({ id }, v); if (i >= 0) a[kind][i] = it; else a[kind].unshift(it); return a; });
        ui.toast('Guardado', 'Pruébelo en el chat de la derecha.', 'ok');
        listTab(kind);
        return true;
      }
    });
    body.querySelector('#q').addEventListener('input', draw);
    body.querySelector('#add').onclick = () => edit(null);
    draw();
  }

  function limites() {
    const a = db.get('ai');
    const pct = Math.round((a.limites.usadoMes / a.limites.mensual) * 100);
    const fields = [
      { name: 'porConversacion', label: 'Máximo de respuestas de IA por conversación', type: 'number', min: 1, max: 100, required: true, hint: 'Al superarlo, se deriva a un asesor.' },
      { name: 'mensual', label: 'Límite mensual de respuestas de IA', type: 'number', min: 100, max: 1000000, required: true },
      { name: 'alertaPorcentaje', label: 'Avisar al llegar al (%)', type: 'number', min: 10, max: 100, required: true },
      { name: 'umbral', label: 'Confianza mínima para responder (%)', type: 'number', min: 0, max: 95, required: true, hint: 'Por debajo, ofrece menú o asesor en lugar de responder.' },
      { name: 'claves', label: 'Palabras que transfieren a un asesor', full: true, required: true },
      { name: 'mensaje', label: 'Mensaje de transferencia', type: 'textarea', full: true, rows: 2, required: true }
    ];
    body.innerHTML = `
      <div class="card card-pad">
        <div class="meter"><div class="meter-row"><span>Consumo del mes (simulado)</span><strong>${fmt.num(a.limites.usadoMes)} / ${fmt.num(a.limites.mensual)} respuestas · ${pct}%</strong></div><div class="progress"><span style="width:${Math.min(100, pct)}%;${pct >= a.limites.alertaPorcentaje ? 'background:var(--warn)' : ''}"></span></div></div>
        <div class="row wrap mt-2"><button class="btn btn-sm" id="reset-usage">${icon('refresh', 'sm')}Reiniciar consumo</button><span class="small muted">El costo real depende del proveedor de IA y se factura aparte.</span></div>
      </div>
      <div class="card"><div class="card-head"><h3>Límites y transferencia a asesores</h3></div><div class="card-body"><form class="form-grid" id="f" novalidate>${ui.renderFields(fields, Object.assign({}, a.limites, a.transferencia))}</form></div><div class="card-foot"><button class="btn btn-primary" id="save">${icon('check', 'sm')}Guardar</button></div></div>`;
    body.querySelector('#save').onclick = () => {
      const r = ui.validate(body.querySelector('#f'), fields);
      if (!r.ok) return;
      db.update('ai', (x) => { x.limites.porConversacion = r.values.porConversacion; x.limites.mensual = r.values.mensual; x.limites.alertaPorcentaje = r.values.alertaPorcentaje; x.transferencia.umbral = r.values.umbral; x.transferencia.claves = r.values.claves; x.transferencia.mensaje = r.values.mensaje; return x; });
      ui.toast('Límites guardados', '', 'ok');
      limites();
    };
    body.querySelector('#reset-usage').onclick = () => { db.update('ai', (x) => { x.limites.usadoMes = 0; return x; }); limites(); };
  }

  function registro() {
    const log = db.get('aiLog');
    body.innerHTML = `<div class="card"><div class="card-head"><h3>Preguntas respondidas por la IA</h3><span class="badge">${log.length}</span></div>
      ${log.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Pregunta</th><th>Fuente usada</th><th class="num">Confianza</th></tr></thead><tbody>${log.map((l) => `<tr><td class="nowrap">${esc(fmt.dateTime(l.ts))}</td><td>${esc(l.pregunta)}</td><td>${esc(l.fuente)}</td><td class="num"><span class="badge ${l.confianza >= 60 ? 'ok' : l.confianza >= db.get('ai').transferencia.umbral ? 'warn' : 'danger'}">${l.confianza}%</span></td></tr>`).join('')}</tbody></table></div>`
        : `<div class="card-body">${ui.emptyState({ icon: 'sparkles', title: 'Sin registros todavía', text: 'Las preguntas en texto libre del simulador de WhatsApp aparecerán aquí.', action: '<a class="btn btn-primary btn-sm mt-1" href="whatsapp.html">Abrir simulador</a>' })}</div>`}</div>`;
  }

  // ---------- Chat de prueba ----------
  const tb = document.getElementById('test-body');
  const add = (html) => { tb.insertAdjacentHTML('beforeend', html); tb.scrollTop = tb.scrollHeight; };
  async function ask(q) {
    const now = new Date();
    add(`<div class="wa-msg out"><div class="wa-bubble">${esc(q)}<span class="wa-meta">${fmt.time(now)}${icon('check')}</span></div></div>`);
    add('<div class="wa-typing"><span></span><span></span><span></span></div>');
    await new Promise((r) => setTimeout(r, 650));
    tb.querySelector('.wa-typing').remove();
    const a = db.get('ai');
    if (!a.activo) { add(`<div class="wa-sys">El asistente está desactivado. Actívelo arriba para probarlo.</div>`); return; }
    const r = WAB.ai.answer(q, { memory });
    add(`<div class="wa-msg in"><div class="wa-bubble"><span class="wa-sender ai">${esc(a.nombre)} · IA (simulada)</span>${esc(r.text)}<span class="wa-meta">${fmt.time(now)}</span></div></div>
      <div class="wa-sys" style="text-align:left">${icon('info', 'sm').replace('class="icon sm"', 'class="icon sm" style="display:inline;vertical-align:-3px"')} ${esc(r.source)} · confianza ${r.confidence}%${r.handoff ? ' · <b>transfiere a asesor</b>' : ''}${r.lowConfidence ? ' · <b>ofrece menú o asesor</b>' : ''}${memory.nombre ? ` · memoria: ${esc(memory.nombre)}` : ''}</div>`);
  }
  document.getElementById('test-form').addEventListener('submit', (e) => { e.preventDefault(); const i = e.target.querySelector('input'); const q = i.value.trim(); if (!q) return; i.value = ''; ask(q); });
  document.querySelector('#tester .wa-quick').addEventListener('click', (e) => { const b = e.target.closest('[data-q]'); if (b) ask(b.dataset.q); });
  document.getElementById('clear-test').onclick = () => { Object.keys(memory).forEach((k) => delete memory[k]); tb.innerHTML = '<div class="wa-sys">Chat de prueba reiniciado.</div>'; };
  document.getElementById('ai-name').textContent = `${db.get('ai').nombre} · tono ${db.get('ai').tono}`;

  setTab('general');
})();
