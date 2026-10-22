/* Campañas y notificaciones (SIMULADAS): plantillas, segmentación, vista previa, programación, estados de entrega y consentimiento. */
(function () {
  const { icon, ui, db, shell, badge } = window.WAB;
  const { esc, fmt } = ui;
  let tab = 'campanas';
  const TPL_STATUS = { APPROVED: ['Aprobada', 'ok'], PENDING: ['En revisión', 'warn'], REJECTED: ['Rechazada', 'danger'] };
  const AUTO = [
    { id: 'recordatorio24', t: 'Recordatorio de cita (24 h antes)', d: 'Plantilla recordatorio_cita con botones Confirmar / Reprogramar.', tpl: 'recordatorio_cita' },
    { id: 'pedidoEnviado', t: 'Pedido en camino', d: 'Se envía al marcar un pedido como "En camino".', tpl: 'pedido_enviado' },
    { id: 'vacunas', t: 'Refuerzo de vacuna pendiente', d: 'Seguimiento comercial 11 meses después de la última vacuna.', tpl: 'vacuna_pendiente' },
    { id: 'postventa', t: 'Seguimiento postventa (3 días)', d: 'Pregunta por la satisfacción con la compra.', tpl: '' }
  ];

  shell.view.innerHTML = `
    <div class="page-head">
      <div><h2>Campañas y notificaciones</h2><p class="muted">Envíos masivos con plantillas aprobadas por Meta, solo a contactos con consentimiento. En este prototipo no se envía ningún mensaje real.</p></div>
      <div class="btn-group"><button class="btn btn-primary" id="new">${icon('plus', 'sm')}Nueva campaña</button></div>
    </div>
    <div class="kpis" id="kpis"></div>
    <div class="tabs"><button class="tab" data-tab="campanas">${icon('megaphone', 'sm')}Campañas</button><button class="tab" data-tab="plantillas">${icon('file', 'sm')}Plantillas</button><button class="tab" data-tab="automaticas">${icon('bell', 'sm')}Notificaciones automáticas</button><button class="tab" data-tab="consentimiento">${icon('shield', 'sm')}Consentimiento y bajas</button></div>
    <div id="body"></div>`;
  const $ = (id) => document.getElementById(id);

  function kpis() {
    const c = db.get('campaigns').filter((x) => x.estado === 'enviada');
    const s = c.reduce((a, x) => { Object.keys(x.stats).forEach((k) => { a[k] = (a[k] || 0) + x.stats[k]; }); return a; }, {});
    const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
    $('kpis').innerHTML = `
      <div class="kpi"><span class="kpi-label">Campañas enviadas</span><span class="kpi-value">${c.length}</span><span class="small muted">${fmt.num(s.enviados || 0)} mensajes</span></div>
      <div class="kpi"><span class="kpi-label">Entregados</span><span class="kpi-value">${pct(s.entregados, s.enviados)}%</span></div>
      <div class="kpi"><span class="kpi-label">Leídos</span><span class="kpi-value">${pct(s.leidos, s.entregados)}%</span></div>
      <div class="kpi"><span class="kpi-label">Respondieron</span><span class="kpi-value">${pct(s.respondidos, s.entregados)}%</span><span class="small muted">${db.get('contacts').filter((x) => !x.consentimiento).length} bajas registradas</span></div>`;
  }

  const audience = (seg) => db.get('contacts').filter((c) => c.consentimiento && (!seg.etiquetas.length || seg.etiquetas.some((t) => c.etiquetas.includes(t))) && (!seg.estados.length || seg.estados.includes(c.estado)));
  const fill = (tpl, ct) => tpl.cuerpo.replace(/\{\{(\d+)\}\}/g, (m, n) => {
    const v = tpl.variables[Number(n) - 1];
    if (v === 'nombre') return ct ? ct.nombre.split(' ')[0] : 'Cliente';
    if (v === 'mascota') return ct && ct.mascota ? ct.mascota : 'su mascota';
    if (v === 'hora') return '10:30';
    if (v === 'numero') return '1049';
    if (v === 'tiempo') return '45 minutos';
    return `[${v || n}]`;
  });
  const tplPayload = (tpl, ct) => WAB.bot.M.buttons(fill(tpl, ct), tpl.botones.map((b, i) => [`tpl:${i}`, b]), { header: tpl.encabezado, footer: tpl.pie });

  function render() {
    kpis();
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    ({ campanas, plantillas, automaticas, consentimiento })[tab]();
  }

  function campanas() {
    const list = db.get('campaigns');
    $('body').innerHTML = `<div class="card">${list.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Campaña</th><th>Estado</th><th class="num">Destinatarios</th><th style="min-width:160px">Entrega</th><th class="hide-sm">Fecha</th><th></th></tr></thead><tbody>
      ${list.map((c) => { const tpl = db.find('templates', c.plantillaId); const s = c.stats; const pct = s.enviados ? Math.round((s.leidos / s.enviados) * 100) : 0; return `<tr class="clickable" data-id="${c.id}"><td><strong>${esc(c.nombre)}</strong><br><small class="muted">${esc(tpl ? tpl.nombre : '—')}</small></td><td>${badge('campana', c.estado)}</td><td class="num">${fmt.num(c.estado === 'borrador' ? audience(c.segmento).length : s.destinatarios)}</td>
        <td>${c.estado === 'enviada' ? `<div class="progress"><span style="width:${pct}%"></span></div><small class="muted">${pct}% leídos · ${s.fallidos} fallidos</small>` : '<small class="muted">—</small>'}</td>
        <td class="hide-sm nowrap">${c.enviada ? esc(fmt.dateTime(c.enviada)) : c.programada ? `Programada: ${esc(fmt.dateTime(c.programada))}` : '—'}</td>
        <td><button class="btn btn-ghost btn-icon btn-sm" data-more="${c.id}" aria-label="Acciones">${icon('more', 'sm')}</button></td></tr>`; }).join('')}
      </tbody></table></div>` : `<div class="card-body">${ui.emptyState({ icon: 'megaphone', title: 'Sin campañas', text: 'Cree su primera campaña.' })}</div>`}</div>`;
    $('body').querySelectorAll('tr[data-id]').forEach((r) => r.onclick = (e) => { if (!e.target.closest('[data-more]')) detail(r.dataset.id); });
    $('body').querySelectorAll('[data-more]').forEach((b) => b.onclick = (e) => {
      e.stopPropagation();
      const c = db.find('campaigns', b.dataset.more);
      const items = [{ label: 'Ver detalle', icon: 'eye', onClick: () => detail(c.id) }, { label: 'Duplicar', icon: 'copy', onClick: () => { db.upsert('campaigns', Object.assign({}, c, { id: ui.uid('cp'), nombre: `${c.nombre} (copia)`, estado: 'borrador', programada: null, enviada: null, stats: { destinatarios: 0, enviados: 0, entregados: 0, leidos: 0, respondidos: 0, fallidos: 0 } })); render(); } }];
      if (c.estado !== 'enviada') items.push({ label: 'Editar', icon: 'edit', onClick: () => wizard(c) }, { label: 'Enviar ahora', icon: 'send', onClick: () => send(c.id) });
      items.push({ label: 'Eliminar', icon: 'trash', danger: true, onClick: async () => { if (await ui.confirm({ title: 'Eliminar campaña', message: c.nombre, confirmLabel: 'Eliminar', danger: true })) { db.remove('campaigns', c.id); render(); } } });
      ui.popMenu(b, items);
    });
  }

  function detail(id) {
    const c = db.find('campaigns', id);
    const tpl = db.find('templates', c.plantillaId);
    const s = c.stats;
    const rows = [['Enviados', s.enviados], ['Entregados', s.entregados], ['Leídos', s.leidos], ['Respondieron', s.respondidos], ['Fallidos', s.fallidos]];
    ui.modal({
      title: c.nombre, subtitle: `${tpl ? tpl.nombre : ''} · ${WAB.STATUS.campana[c.estado][0]}`, size: 'lg',
      body: `<div class="grid-2"><div class="stack">
        <div><span class="label">Segmento</span><div class="chips mt-1">${c.segmento.etiquetas.map((t) => `<span class="tag">${esc(t)}</span>`).join('') || '<span class="badge">Todas las etiquetas</span>'}${c.segmento.estados.map((t) => `<span class="badge">${esc(WAB.STATUS.contacto[t][0])}</span>`).join('')}</div></div>
        <div id="cmp-funnel"></div>
        <p class="small muted mb-0">Estados de entrega reportados por los webhooks de Meta (sent, delivered, read, failed). Cifras simuladas.</p></div>
        <div class="phone compact wa" id="cmp-prev">${WAB.wa.frame({ name: db.get('settings').negocio.nombre })}</div></div>`,
      onOpen: (el) => {
        WAB.charts.hbars(el.querySelector('#cmp-funnel'), rows.map(([l, v]) => ({ label: l, value: v })), { color: 'var(--series-1)' });
        if (tpl) el.querySelector('#cmp-prev .wa-body').insertAdjacentHTML('beforeend', WAB.Phone.prototype.msgHTML.call(null, { id: 'x', from: 'bot', ts: new Date().toISOString(), payload: tplPayload(tpl, db.get('contacts')[0]) }));
      }
    });
  }

  function wizard(existing) {
    const approved = db.get('templates').filter((t) => t.estado === 'APPROVED');
    if (!approved.length) return ui.toast('No hay plantillas aprobadas', 'Cree una plantilla y espere la aprobación.', 'warn');
    const tags = Array.from(new Set(db.get('contacts').flatMap((c) => c.etiquetas))).sort();
    const c = existing ? JSON.parse(JSON.stringify(existing)) : { id: ui.uid('cp'), nombre: '', plantillaId: approved[0].id, segmento: { etiquetas: [], estados: [] }, estado: 'borrador', programada: null, stats: { destinatarios: 0, enviados: 0, entregados: 0, leidos: 0, respondidos: 0, fallidos: 0 } };
    const m = ui.modal({
      title: existing ? 'Editar campaña' : 'Nueva campaña', size: 'xl',
      body: `<div class="grid-2"><div class="stack">
        <div class="field"><label for="w-name">Nombre de la campaña *</label><input class="input" id="w-name" maxlength="60" value="${esc(c.nombre)}" placeholder="Ej.: Promoción de noviembre"><span class="error-msg"></span></div>
        <div class="field"><label for="w-tpl">Plantilla aprobada</label><select class="select" id="w-tpl">${approved.map((t) => `<option value="${t.id}"${t.id === c.plantillaId ? ' selected' : ''}>${esc(t.nombre)} · ${t.categoria === 'MARKETING' ? 'Marketing' : 'Utilidad'}</option>`).join('')}</select></div>
        <div class="field"><span class="label">Etiquetas (cualquiera)</span><div class="chips" id="w-tags">${tags.map((t) => `<button type="button" class="chip${c.segmento.etiquetas.includes(t) ? ' active' : ''}" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>
        <div class="field"><span class="label">Estado del contacto</span><div class="chips" id="w-st">${Object.entries(WAB.STATUS.contacto).map(([k, v]) => `<button type="button" class="chip${c.segmento.estados.includes(k) ? ' active' : ''}" data-s="${k}">${v[0]}</button>`).join('')}</div></div>
        <div class="notice info" id="w-count"></div>
        <div class="field"><span class="label">Envío</span><div class="segmented" id="w-when"><button type="button" data-w="now" class="${c.programada ? '' : 'active'}">Enviar ahora</button><button type="button" data-w="later" class="${c.programada ? 'active' : ''}">Programar</button></div>
          <input class="input mt-1" type="datetime-local" id="w-date" ${c.programada ? '' : 'hidden'} value="${c.programada ? c.programada.slice(0, 16) : ''}"><span class="error-msg"></span></div>
      </div><div><div class="phone compact wa" id="w-prev"></div><p class="phone-caption">Vista previa con los datos del primer destinatario.</p></div></div>`,
      actions: [{ label: 'Cancelar', kind: 'btn-ghost' }, { label: 'Guardar borrador', onClick: () => save('borrador') }, { label: 'Confirmar', kind: 'btn-primary', icon: 'send', onClick: () => save('send') }]
    });
    const el = m.el;
    let when = c.programada ? 'later' : 'now';
    const update = () => {
      const tpl = db.find('templates', el.querySelector('#w-tpl').value);
      const aud = audience(c.segmento);
      const excluded = db.get('contacts').filter((x) => !x.consentimiento && (!c.segmento.etiquetas.length || c.segmento.etiquetas.some((t) => x.etiquetas.includes(t))) && (!c.segmento.estados.length || c.segmento.estados.includes(x.estado))).length;
      el.querySelector('#w-count').innerHTML = `${icon('users')}<p><strong>${aud.length} destinatarios</strong> con consentimiento.${excluded ? ` Se excluyen ${excluded} contactos que pidieron la baja.` : ''} ${tpl && tpl.categoria === 'MARKETING' ? 'Las plantillas de marketing tienen costo por mensaje según la tarifa de Meta (no incluido).' : ''}</p>`;
      const ph = el.querySelector('#w-prev');
      ph.className = 'phone compact wa';
      ph.innerHTML = WAB.wa.frame({ name: db.get('settings').negocio.nombre });
      if (tpl) ph.querySelector('.wa-body').insertAdjacentHTML('beforeend', WAB.Phone.prototype.msgHTML.call(null, { id: 'x', from: 'bot', ts: new Date().toISOString(), payload: tplPayload(tpl, aud[0]) }));
    };
    el.querySelector('#w-tags').onclick = (e) => { const b = e.target.closest('[data-t]'); if (!b) return; const t = b.dataset.t; c.segmento.etiquetas = c.segmento.etiquetas.includes(t) ? c.segmento.etiquetas.filter((x) => x !== t) : c.segmento.etiquetas.concat(t); b.classList.toggle('active'); update(); };
    el.querySelector('#w-st').onclick = (e) => { const b = e.target.closest('[data-s]'); if (!b) return; const s = b.dataset.s; c.segmento.estados = c.segmento.estados.includes(s) ? c.segmento.estados.filter((x) => x !== s) : c.segmento.estados.concat(s); b.classList.toggle('active'); update(); };
    el.querySelector('#w-tpl').onchange = update;
    el.querySelector('#w-when').onclick = (e) => { const b = e.target.closest('[data-w]'); if (!b) return; when = b.dataset.w; el.querySelectorAll('#w-when button').forEach((x) => x.classList.toggle('active', x === b)); el.querySelector('#w-date').hidden = when !== 'later'; };
    update();

    function save(mode) {
      const name = el.querySelector('#w-name');
      const nf = name.closest('.field');
      const dateEl = el.querySelector('#w-date');
      const df = dateEl.closest('.field');
      nf.classList.toggle('invalid', !name.value.trim()); nf.querySelector('.error-msg').textContent = 'Escriba un nombre.';
      if (!name.value.trim()) { name.focus(); return false; }
      if (mode === 'send' && !audience(c.segmento).length) { ui.toast('Sin destinatarios', 'Amplíe el segmento.', 'warn'); return false; }
      if (mode === 'send' && when === 'later') {
        const d = new Date(dateEl.value);
        const bad = !dateEl.value || isNaN(d) || d < new Date();
        df.classList.toggle('invalid', bad); df.querySelector('.error-msg').textContent = 'Elija una fecha y hora futura.';
        if (bad) return false;
        c.programada = d.toISOString();
      }
      c.nombre = name.value.trim();
      c.plantillaId = el.querySelector('#w-tpl').value;
      c.estado = mode === 'borrador' ? 'borrador' : when === 'later' ? 'programada' : 'borrador';
      c.stats.destinatarios = audience(c.segmento).length;
      db.upsert('campaigns', c);
      if (mode === 'send' && when === 'now') setTimeout(() => send(c.id), 200);
      else ui.toast(c.estado === 'programada' ? 'Campaña programada' : 'Borrador guardado', c.estado === 'programada' ? fmt.dateTime(c.programada) : c.nombre, 'ok');
      render();
      return true;
    }
  }

  function send(id) {
    const c = db.find('campaigns', id);
    const aud = audience(c.segmento);
    if (!aud.length) return ui.toast('Sin destinatarios', '', 'warn');
    const tpl = db.find('templates', c.plantillaId);
    const m = ui.modal({ title: 'Enviando campaña (simulación)', subtitle: c.nombre, dismissible: false, actions: [],
      body: `<div class="stack"><div class="progress"><span id="sp" style="width:0%"></span></div><p class="small mb-0" id="st">Preparando ${aud.length} mensajes…</p></div>` });
    db.update('campaigns', (arr) => { arr.find((x) => x.id === id).estado = 'enviando'; return arr; });
    let i = 0;
    const timer = setInterval(() => {
      i = Math.min(aud.length, i + Math.max(1, Math.ceil(aud.length / 12)));
      m.el.querySelector('#sp').style.width = `${(i / aud.length) * 100}%`;
      m.el.querySelector('#st').textContent = `Enviados ${i} de ${aud.length}…`;
      if (i >= aud.length) {
        clearInterval(timer);
        const fail = Math.round(aud.length * 0.03);
        const del = aud.length - fail;
        db.update('campaigns', (arr) => { const x = arr.find((y) => y.id === id); x.estado = 'enviada'; x.enviada = new Date().toISOString(); x.stats = { destinatarios: aud.length, enviados: aud.length, entregados: del, leidos: Math.round(del * 0.78), respondidos: Math.round(del * 0.21), fallidos: fail }; return arr; });
        // Copia del mensaje en las conversaciones abiertas de los destinatarios
        const ids = aud.map((a) => a.id);
        db.update('conversations', (arr) => { arr.filter((cv) => ids.includes(cv.contactId)).forEach((cv) => { cv.mensajes.push({ id: ui.uid('wamid'), from: 'bot', ts: new Date().toISOString(), payload: tplPayload(tpl, db.contact(cv.contactId)) }); }); return arr; });
        m.close();
        ui.toast('Campaña enviada (simulación)', `${del} entregados · ${fail} fallidos`, 'ok', 5000);
        render();
      }
    }, 220);
  }

  function plantillas() {
    const list = db.get('templates');
    $('body').innerHTML = `<div class="row between mb-2"><p class="small muted mb-0">Las plantillas se envían a revisión de Meta antes de usarse fuera de la ventana de 24 horas.</p><button class="btn btn-sm btn-primary" id="add-tpl">${icon('plus', 'sm')}Nueva plantilla</button></div>
      <div class="proto-grid">${list.map((t) => `<div class="card card-pad stack"><div class="row between"><strong class="mono small">${esc(t.nombre)}</strong>${(() => { const s = TPL_STATUS[t.estado]; return `<span class="badge ${s[1]}">${s[0]}</span>`; })()}</div>
        <div class="chips"><span class="badge">${t.categoria === 'MARKETING' ? 'Marketing' : 'Utilidad'}</span><span class="badge">${esc(t.idioma)}</span><span class="badge">${t.variables.length} variables</span></div>
        ${t.encabezado ? `<strong>${esc(t.encabezado)}</strong>` : ''}<p class="small mb-0">${esc(t.cuerpo)}</p>${t.botones.length ? `<div class="chips">${t.botones.map((b) => `<span class="tag">${esc(b)}</span>`).join('')}</div>` : ''}
        <div class="row"><button class="btn btn-sm" data-edit="${t.id}">${icon('edit', 'sm')}Editar</button><button class="btn btn-ghost btn-sm" data-del="${t.id}">${icon('trash', 'sm')}Eliminar</button></div></div>`).join('')}</div>`;
    const fields = [
      { name: 'nombre', label: 'Nombre (minúsculas y guiones bajos)', required: true, pattern: '^[a-z0-9_]{3,40}$', patternMsg: 'Use solo minúsculas, números y guiones bajos (3 a 40).', full: true },
      { name: 'categoria', label: 'Categoría', type: 'select', options: [{ value: 'UTILITY', label: 'Utilidad (avisos, recordatorios)' }, { value: 'MARKETING', label: 'Marketing (promociones)' }] },
      { name: 'encabezado', label: 'Encabezado (opcional)', maxlength: 60 },
      { name: 'cuerpo', label: 'Cuerpo (use {{1}}, {{2}}… para variables)', type: 'textarea', required: true, full: true, rows: 4, maxlength: 1024 },
      { name: 'variables', label: 'Variables en orden (coma)', full: true, placeholder: 'nombre, mascota', hint: 'Valores disponibles: nombre, mascota, hora, numero, tiempo.' },
      { name: 'pie', label: 'Pie (opcional)', maxlength: 60 },
      { name: 'botones', label: 'Botones de respuesta (coma, máx. 3)' }
    ];
    fields[3].validate = (v, form) => {
      const nums = Array.from(new Set((v.match(/\{\{(\d+)\}\}/g) || []).map((x) => Number(x.replace(/\D/g, ''))))).sort((a, b) => a - b);
      const vars = form.querySelector('[name="variables"]').value.split(',').map((x) => x.trim()).filter(Boolean);
      if (nums.some((n, i) => n !== i + 1)) return 'Las variables deben ser consecutivas: {{1}}, {{2}}…';
      if (nums.length !== vars.length) return `El cuerpo usa ${nums.length} variables y se definieron ${vars.length}.`;
      return '';
    };
    fields[6].validate = (v) => (v.split(',').filter((x) => x.trim()).length > 3 ? 'Máximo 3 botones.' : '');
    const edit = (t) => ui.formModal({
      title: t ? 'Editar plantilla' : 'Nueva plantilla', size: 'lg', fields, values: t ? Object.assign({}, t, { variables: t.variables.join(', '), botones: t.botones.join(', ') }) : { categoria: 'UTILITY' },
      submitLabel: 'Enviar a revisión',
      onSubmit: (v) => {
        const rec = Object.assign({ id: (t && t.id) || ui.uid('tp'), idioma: 'es' }, v, { estado: 'PENDING', variables: v.variables.split(',').map((x) => x.trim()).filter(Boolean), botones: v.botones.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 3) });
        db.upsert('templates', rec);
        ui.toast('Plantilla enviada a revisión', 'Simulación: Meta la aprobará en unos segundos.', 'info');
        setTimeout(() => { db.update('templates', (arr) => { const x = arr.find((y) => y.id === rec.id); if (x && x.estado === 'PENDING') x.estado = 'APPROVED'; return arr; }); ui.toast('Plantilla aprobada (simulación)', rec.nombre, 'ok'); if (tab === 'plantillas') render(); }, 4000);
        render();
        return true;
      }
    });
    $('add-tpl').onclick = () => edit(null);
    $('body').querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => edit(db.find('templates', b.dataset.edit)));
    $('body').querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
      if (db.get('campaigns').some((c) => c.plantillaId === b.dataset.del && c.estado !== 'enviada')) return ui.toast('Plantilla en uso', 'Hay campañas pendientes que la usan.', 'warn');
      if (await ui.confirm({ title: 'Eliminar plantilla', message: 'También se eliminaría en Meta.', confirmLabel: 'Eliminar', danger: true })) { db.remove('templates', b.dataset.del); render(); }
    });
  }

  function automaticas() {
    const cfg = Object.assign({ recordatorio24: true, pedidoEnviado: true, vacunas: false, postventa: false }, db.get('settings').notificaciones || {});
    $('body').innerHTML = `<div class="card"><div class="card-head"><h3>Notificaciones automáticas</h3></div><div class="list-rows">${AUTO.map((a) => `<div class="list-row"><span class="kpi-icon">${icon('bell')}</span><div class="grow"><strong>${esc(a.t)}</strong><small>${esc(a.d)}${a.tpl ? ` · Plantilla: ${esc(a.tpl)}` : ''}</small></div><label class="switch"><input type="checkbox" data-a="${a.id}" ${cfg[a.id] ? 'checked' : ''} aria-label="${esc(a.t)}"><span class="track"></span></label></div>`).join('')}</div>
      <div class="card-foot" style="justify-content:flex-start"><span class="small muted">Se ejecutan con tareas programadas del servidor en producción. Aquí solo se guarda la preferencia.</span></div></div>`;
    $('body').querySelectorAll('[data-a]').forEach((c) => c.onchange = () => { db.update('settings', (s) => { s.notificaciones = Object.assign({}, cfg, s.notificaciones || {}, { [c.dataset.a]: c.checked }); return s; }); ui.toast(c.checked ? 'Notificación activada' : 'Notificación desactivada', '', 'ok'); });
  }

  function consentimiento() {
    const list = db.get('contacts');
    $('body').innerHTML = `<div class="notice info mb-2">${icon('shield')}<p>WhatsApp exige consentimiento previo para mensajes de marketing. Si un cliente responde <strong>BAJA</strong>, se registra automáticamente y queda excluido de las campañas.</p></div>
      <div class="card"><div class="card-head"><h3>Consentimiento por contacto</h3><span class="badge">${list.filter((c) => c.consentimiento).length} de ${list.length} aceptan</span></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Contacto</th><th class="hide-sm">Etiquetas</th><th>Acepta promociones</th></tr></thead><tbody>
      ${list.map((c) => `<tr><td><div class="cell-user">${ui.avatar(c.nombre, 'sm')}<div class="meta"><strong>${esc(c.nombre)}</strong><small>${esc(c.telefono)}</small></div></div></td><td class="hide-sm"><div class="chips">${c.etiquetas.slice(0, 3).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div></td><td><label class="switch"><input type="checkbox" data-c="${c.id}" ${c.consentimiento ? 'checked' : ''} aria-label="Consentimiento de ${esc(c.nombre)}"><span class="track"></span>${c.consentimiento ? 'Sí' : 'Baja'}</label></td></tr>`).join('')}
      </tbody></table></div></div>`;
    $('body').querySelectorAll('[data-c]').forEach((x) => x.onchange = () => { db.update('contacts', (arr) => { arr.find((c) => c.id === x.dataset.c).consentimiento = x.checked; return arr; }); ui.toast(x.checked ? 'Consentimiento registrado' : 'Baja registrada', '', x.checked ? 'ok' : 'info'); render(); });
  }

  document.querySelector('.tabs').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; render(); } };
  $('new').onclick = () => wizard(null);
  db.on('*', (v, src) => { if (src === 'external') render(); });
  render();
})();
