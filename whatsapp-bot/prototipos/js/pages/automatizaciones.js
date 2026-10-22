/* Automatizaciones: constructor de menús/listas/botones, mensajes del bot, respuestas automáticas e historial. */
(function () {
  const { icon, ui, db, shell } = window.WAB;
  const { esc, fmt } = ui;

  const ACTIONS = [
    { v: 'menu', l: 'Abrir submenú' }, { v: 'reply', l: 'Responder con texto' }, { v: 'book', l: 'Agendar cita (flujo)' },
    { v: 'services', l: 'Mostrar servicios' }, { v: 'products', l: 'Mostrar tienda' }, { v: 'cart', l: 'Ver carrito' },
    { v: 'orders', l: 'Mis citas y pedidos' }, { v: 'ai', l: 'Consultar a la IA' }, { v: 'agent', l: 'Derivar a un asesor' }, { v: 'url', l: 'Abrir enlace' }
  ];
  const actionLabel = (o) => {
    const a = ACTIONS.find((x) => x.v === o.accion);
    if (o.accion === 'menu') { const m = db.get('menus').find((x) => x.id === o.destino); return `Submenú: ${m ? m.titulo : '(no existe)'}`; }
    return a ? a.l : o.accion;
  };

  let tab = (location.hash || '#menus').slice(1);
  let currentId = 'main';
  let draft = null;
  let dirty = false;
  let livePhone = null;
  let mode = 'preview';

  shell.view.innerHTML = `
    <div class="page-head">
      <div><h2>Automatizaciones</h2><p class="muted">Configure lo que el bot muestra y responde. Los cambios se reflejan en el simulador de WhatsApp.</p></div>
      <div class="btn-group"><a class="btn" href="whatsapp.html">${icon('phone', 'sm')}Abrir simulador</a></div>
    </div>
    <div class="tabs" role="tablist">
      <button class="tab" data-tab="menus">${icon('list', 'sm')}Menús y listas</button>
      <button class="tab" data-tab="mensajes">${icon('message', 'sm')}Bienvenida y mensajes</button>
      <button class="tab" data-tab="respuestas">${icon('zap', 'sm')}Respuestas automáticas</button>
      <button class="tab" data-tab="historial">${icon('clock', 'sm')}Historial de navegación</button>
    </div>
    <div class="split">
      <div id="tab-body" class="stack"></div>
      <div class="phone-col">
        <div class="segmented" style="align-self:center"><button data-mode="preview" class="active">Vista previa</button><button data-mode="live">Probar en vivo</button></div>
        <div id="phone"></div>
        <p class="phone-caption" id="phone-caption">Vista previa del menú seleccionado.</p>
      </div>
    </div>`;

  const body = document.getElementById('tab-body');

  // ---------- Vista previa ----------
  function preview() {
    const el = document.getElementById('phone');
    if (mode === 'live') return;
    el.className = '';
    el.classList.add('phone', 'wa', 'compact');
    el.innerHTML = WAB.wa.frame({ name: db.get('settings').negocio.nombre, subtitle: 'Vista previa' });
    const msgs = [];
    const now = new Date().toISOString();
    if (tab === 'mensajes') {
      const b = db.get('settings').bot;
      msgs.push({ id: 'p1', from: 'user', ts: now, payload: { type: 'text', text: { body: 'Hola' } } });
      msgs.push({ id: 'p2', from: 'bot', ts: now, payload: { type: 'text', text: { body: draftMsgs().bienvenida || b.bienvenida } } });
      msgs.push({ id: 'p3', from: 'bot', ts: now, payload: { type: 'text', text: { body: draftMsgs().fueraHorario || b.fueraHorario } } });
    } else if (tab === 'respuestas') {
      db.get('autoReplies').filter((r) => r.activo).slice(0, 3).forEach((r, i) => {
        msgs.push({ id: `u${i}`, from: 'user', ts: now, payload: { type: 'text', text: { body: r.claves.split(',')[0].trim() } } });
        msgs.push({ id: `b${i}`, from: 'bot', ts: now, payload: { type: 'text', text: { body: r.respuesta } } });
      });
    } else {
      const menu = draft || db.get('menus').find((m) => m.id === currentId);
      if (menu) {
        msgs.push({ id: 'p1', from: 'user', ts: now, payload: { type: 'text', text: { body: 'menú' } } });
        msgs.push({ id: 'p2', from: 'bot', ts: now, payload: WAB.bot.renderMenu(menu) });
      }
    }
    el.querySelector('.wa-body').insertAdjacentHTML('beforeend', msgs.map((m) => WAB.Phone.prototype.msgHTML.call(null, m)).join(''));
    // Abrir la lista en la vista previa
    el.querySelectorAll('[data-list]').forEach((b) => b.addEventListener('click', () => {
      const menu = draft || db.get('menus').find((m) => m.id === currentId);
      const it = WAB.bot.renderMenu(menu).interactive;
      const screen = el.querySelector('.phone-screen');
      screen.insertAdjacentHTML('beforeend', `<div class="wa-sheet-backdrop"></div><div class="wa-sheet"><div class="wa-sheet-head"><button type="button" aria-label="Cerrar">${icon('x')}</button>${esc(it.action.button)}</div><div class="wa-sheet-body">${it.action.sections.map((s) => `<div class="wa-sheet-section">${esc(s.title)}</div>${s.rows.map((r) => `<div class="wa-sheet-row"><div class="grow"><strong>${esc(r.title)}</strong>${r.description ? `<small>${esc(r.description)}</small>` : ''}</div><span class="wa-radio"></span></div>`).join('')}`).join('')}</div></div>`);
      const close = () => { screen.querySelector('.wa-sheet').remove(); screen.querySelector('.wa-sheet-backdrop').remove(); };
      screen.querySelector('.wa-sheet-backdrop').onclick = close;
      screen.querySelector('.wa-sheet-head button').onclick = close;
    }));
  }
  document.querySelector('.phone-col .segmented').addEventListener('click', (e) => {
    const b = e.target.closest('[data-mode]');
    if (!b) return;
    if (b.dataset.mode === 'live' && dirty) { ui.toast('Guarde los cambios primero', 'La prueba en vivo usa la configuración guardada.', 'warn'); return; }
    mode = b.dataset.mode;
    document.querySelectorAll('.phone-col [data-mode]').forEach((x) => x.classList.toggle('active', x === b));
    const holder = document.getElementById('phone');
    const fresh = document.createElement('div');
    fresh.id = 'phone';
    holder.replaceWith(fresh);
    if (mode === 'live') {
      livePhone = new WAB.Phone(fresh, { compact: true, quick: ['Hola', 'Menú', 'horario'] });
      livePhone.restart();
      document.getElementById('phone-caption').textContent = 'Conversación real con la configuración guardada.';
    } else {
      document.getElementById('phone-caption').textContent = 'Vista previa del menú seleccionado.';
      preview();
    }
  });

  // ---------- Pestañas ----------
  function setTab(t) {
    if (dirty && tab === 'menus' && t !== 'menus') { ui.toast('Tiene cambios sin guardar', 'Guarde o descarte los cambios del menú.', 'warn'); return; }
    tab = t;
    history.replaceState(null, '', `#${t}`);
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === t));
    ({ menus: renderMenus, mensajes: renderMensajes, respuestas: renderRespuestas, historial: renderHistorial }[t] || renderMenus)();
    preview();
  }
  document.querySelector('.tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); });

  // ---------- Menús ----------
  function loadDraft(id) {
    currentId = id;
    draft = JSON.parse(JSON.stringify(db.get('menus').find((m) => m.id === id)));
    dirty = false;
  }
  function markDirty() { dirty = true; ['save-menu', 'discard'].forEach((id) => { const b = document.getElementById(id); if (b) b.disabled = false; }); preview(); }

  function renderMenus() {
    if (!draft) loadDraft(currentId);
    const menus = db.get('menus');
    const tooMany = draft.tipo === 'buttons' && draft.opciones.length > 3;
    body.innerHTML = `
      <div class="builder">
        <div class="card card-pad">
          <div class="menu-list">${menus.map((m) => `<button data-menu="${m.id}" class="${m.id === currentId ? 'active' : ''}">${icon(m.tipo === 'list' ? 'list' : 'grid', 'sm')}${esc(m.titulo)}<small>${m.opciones.length}</small></button>`).join('')}</div>
          <button class="btn btn-sm btn-block mt-2" id="new-menu">${icon('plus', 'sm')}Nuevo menú</button>
        </div>
        <div class="card">
          <div class="card-head"><h3>${esc(draft.titulo)}${draft.id === 'main' ? ' <span class="badge solid">Principal</span>' : ''}</h3>
            <div class="btn-group">${draft.id !== 'main' ? `<button class="btn btn-ghost btn-sm" id="del-menu">${icon('trash', 'sm')}Eliminar</button>` : ''}<button class="btn btn-ghost btn-sm" id="discard" ${dirty ? '' : 'disabled'}>Descartar</button><button class="btn btn-primary btn-sm" id="save-menu" ${dirty ? '' : 'disabled'}>${icon('check', 'sm')}Guardar cambios</button></div>
          </div>
          <div class="card-body stack">
            <div class="form-grid">
              <div class="field"><label>Nombre interno</label><input class="input" data-f="titulo" value="${esc(draft.titulo)}" maxlength="40"></div>
              <div class="field"><label>Tipo de mensaje</label><select class="select" data-f="tipo"><option value="list"${draft.tipo === 'list' ? ' selected' : ''}>Lista (hasta 10 opciones)</option><option value="buttons"${draft.tipo === 'buttons' ? ' selected' : ''}>Botones (hasta 3 opciones)</option></select></div>
              <div class="field"><label>Encabezado (opcional)</label><input class="input" data-f="encabezado" value="${esc(draft.encabezado)}" maxlength="60"></div>
              <div class="field"><label>Pie (opcional)</label><input class="input" data-f="pie" value="${esc(draft.pie)}" maxlength="60"></div>
              <div class="field full"><label>Texto del mensaje</label><textarea class="textarea" data-f="cuerpo" rows="2" maxlength="1024">${esc(draft.cuerpo)}</textarea><span class="error-msg"></span></div>
              ${draft.tipo === 'list' ? `<div class="field"><label>Texto del botón de la lista</label><input class="input" data-f="boton" value="${esc(draft.boton)}" maxlength="20"></div>` : ''}
            </div>
            ${tooMany ? `<div class="notice warn">${icon('alert')}<p>WhatsApp permite máximo 3 botones. Con ${draft.opciones.length} opciones este menú se enviará como lista.</p></div>` : ''}
            ${draft.tipo === 'list' && draft.opciones.length > 10 ? `<div class="notice danger">${icon('alert')}<p>Las listas admiten hasta 10 filas: solo se mostrarán las primeras 10.</p></div>` : ''}
            <div class="row between"><h4 class="mb-0">Opciones (${draft.opciones.length})</h4><button class="btn btn-sm" id="add-opt">${icon('plus', 'sm')}Agregar opción</button></div>
            <div class="stack" id="opts">${draft.opciones.length ? draft.opciones.map((o, i) => `
              <div class="opt-row" data-i="${i}">
                <div class="grip"><button data-up="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Subir">${icon('chevronDown', 'sm').replace('<svg', '<svg style="transform:rotate(180deg)"')}</button><button data-down="${i}" ${i === draft.opciones.length - 1 ? 'disabled' : ''} aria-label="Bajar">${icon('chevronDown', 'sm')}</button></div>
                <div class="opt-title"><strong>${esc(o.titulo)}</strong><small>${esc(o.descripcion || (draft.tipo === 'list' ? 'Sin descripción' : ''))}${draft.tipo === 'list' && o.seccion ? ` · Sección: ${esc(o.seccion)}` : ''}</small></div>
                <div class="opt-action"><span class="badge info">${esc(actionLabel(o))}</span></div>
                <div class="row" style="gap:4px"><button class="btn btn-ghost btn-icon btn-sm" data-edit="${i}" aria-label="Editar">${icon('edit', 'sm')}</button><button class="btn btn-ghost btn-icon btn-sm" data-del="${i}" aria-label="Eliminar">${icon('trash', 'sm')}</button></div>
              </div>`).join('') : ui.emptyState({ icon: 'list', title: 'Sin opciones', text: 'Agregue al menos una opción para que el menú pueda enviarse.' })}</div>
            <div><h4 class="label mb-1">Mapa de navegación</h4><div class="flow-map">${flowMap()}</div></div>
          </div>
        </div>
      </div>`;

    body.querySelectorAll('[data-menu]').forEach((b) => b.onclick = async () => {
      if (dirty && !(await ui.confirm({ title: 'Descartar cambios', message: 'Hay cambios sin guardar en este menú.', confirmLabel: 'Descartar' }))) return;
      loadDraft(b.dataset.menu); renderMenus(); preview();
    });
    body.querySelectorAll('[data-f]').forEach((inp) => inp.addEventListener('input', () => {
      draft[inp.dataset.f] = inp.value;
      if (inp.dataset.f === 'tipo') { renderMenus(); }
      markDirty();
    }));
    body.querySelector('#add-opt').onclick = () => editOption(-1);
    body.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => editOption(Number(b.dataset.edit)));
    body.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => { draft.opciones.splice(Number(b.dataset.del), 1); markDirty(); renderMenus(); });
    body.querySelectorAll('[data-up]').forEach((b) => b.onclick = () => { const i = Number(b.dataset.up); [draft.opciones[i - 1], draft.opciones[i]] = [draft.opciones[i], draft.opciones[i - 1]]; markDirty(); renderMenus(); });
    body.querySelectorAll('[data-down]').forEach((b) => b.onclick = () => { const i = Number(b.dataset.down); [draft.opciones[i + 1], draft.opciones[i]] = [draft.opciones[i], draft.opciones[i + 1]]; markDirty(); renderMenus(); });
    body.querySelector('#save-menu').onclick = saveMenu;
    body.querySelector('#discard').onclick = () => { loadDraft(currentId); renderMenus(); preview(); ui.toast('Cambios descartados', '', 'info'); };
    body.querySelector('#new-menu').onclick = newMenu;
    const del = body.querySelector('#del-menu');
    if (del) del.onclick = deleteMenu;
  }

  function flowMap() {
    const menus = db.get('menus');
    const main = menus.find((m) => m.id === 'main');
    if (!main) return '';
    return main.opciones.map((o) => {
      const target = o.accion === 'menu' ? menus.find((m) => m.id === o.destino) : null;
      return `<span class="fm-node menu">Menú principal</span>${icon('arrowRight', 'sm')}<span class="fm-node">${esc(o.titulo)}</span>${target ? `${icon('arrowRight', 'sm')}<span class="fm-node menu">${esc(target.titulo)} (${target.opciones.length})</span>` : ''}<span style="flex-basis:100%;height:0"></span>`;
    }).join('');
  }

  function editOption(i) {
    const o = i >= 0 ? draft.opciones[i] : { id: ui.uid('op'), titulo: '', descripcion: '', accion: 'reply', respuesta: '', seccion: '' };
    const limit = draft.tipo === 'buttons' ? 20 : 24;
    const menus = db.get('menus').filter((m) => m.id !== draft.id);
    const fields = [
      { name: 'titulo', label: `Título (máx. ${limit} caracteres)`, required: true, maxlength: limit, full: true },
      { name: 'descripcion', label: 'Descripción (solo listas, máx. 72)', maxlength: 72, full: true },
      { name: 'seccion', label: 'Sección de la lista', placeholder: 'Ej.: Clínica, Tienda, Ayuda' },
      { name: 'accion', label: 'Acción al elegir', type: 'select', options: ACTIONS.map((a) => ({ value: a.v, label: a.l })) },
      { name: 'destino', label: 'Submenú de destino', type: 'select', options: menus.map((m) => ({ value: m.id, label: m.titulo })), placeholderOption: menus.length ? 'Elija un menú' : 'Primero cree otro menú', hint: 'Solo para "Abrir submenú"' },
      { name: 'url', label: 'Enlace', type: 'url', placeholder: 'https://', hint: 'Solo para "Abrir enlace"' },
      { name: 'respuesta', label: 'Texto de respuesta', type: 'textarea', full: true, rows: 3, hint: 'Para "Responder con texto" o como mensaje del enlace.' }
    ];
    fields[0].validate = (v) => (v.length > limit ? `Máximo ${limit} caracteres.` : '');
    fields[4].validate = (v, form) => (form.querySelector('[name="accion"]').value === 'menu' && !v ? 'Elija el submenú.' : '');
    fields[6].validate = (v, form) => (form.querySelector('[name="accion"]').value === 'reply' && !v ? 'Escriba la respuesta.' : '');
    fields[5].validate = (v, form) => (form.querySelector('[name="accion"]').value === 'url' && !/^https?:\/\/.+/.test(v) ? 'Ingrese un enlace que empiece con http:// o https://' : '');
    ui.formModal({
      title: i >= 0 ? 'Editar opción' : 'Nueva opción', fields, values: o, submitLabel: i >= 0 ? 'Aplicar' : 'Agregar',
      onOpen: (el) => {
        const toggle = () => {
          const a = el.querySelector('[name="accion"]').value;
          el.querySelector('[data-field="destino"]').hidden = a !== 'menu';
          el.querySelector('[data-field="url"]').hidden = a !== 'url';
          el.querySelector('[data-field="respuesta"]').hidden = !['reply', 'url'].includes(a);
        };
        el.querySelector('[name="accion"]').addEventListener('change', toggle);
        toggle();
      },
      onSubmit: (v) => {
        if (i < 0 && draft.tipo === 'list' && draft.opciones.length >= 10) return 'Las listas admiten hasta 10 opciones.';
        const item = Object.assign({}, o, v);
        if (i >= 0) draft.opciones[i] = item; else draft.opciones.push(item);
        markDirty(); renderMenus();
        return true;
      }
    });
  }

  function saveMenu() {
    const cuerpo = body.querySelector('[data-f="cuerpo"]');
    if (!draft.cuerpo.trim()) { cuerpo.closest('.field').classList.add('invalid'); cuerpo.closest('.field').querySelector('.error-msg').textContent = 'El texto del mensaje es obligatorio.'; cuerpo.focus(); return; }
    if (!draft.titulo.trim()) return ui.toast('Falta el nombre del menú', '', 'warn');
    if (!draft.opciones.length) return ui.toast('Agregue al menos una opción', '', 'warn');
    db.update('menus', (arr) => { const i = arr.findIndex((m) => m.id === draft.id); arr[i] = JSON.parse(JSON.stringify(draft)); return arr; });
    dirty = false;
    renderMenus(); preview();
    ui.toast('Menú guardado', 'El simulador ya usa esta versión.', 'ok');
  }

  function newMenu() {
    ui.formModal({
      title: 'Nuevo menú', fields: [
        { name: 'titulo', label: 'Nombre del menú', required: true, maxlength: 40, full: true },
        { name: 'tipo', label: 'Tipo', type: 'select', options: [{ value: 'buttons', label: 'Botones (hasta 3)' }, { value: 'list', label: 'Lista (hasta 10)' }], full: true },
        { name: 'cuerpo', label: 'Texto del mensaje', type: 'textarea', required: true, full: true }
      ],
      submitLabel: 'Crear',
      onSubmit: (v) => {
        const m = { id: ui.uid('mn'), titulo: v.titulo, tipo: v.tipo, encabezado: '', cuerpo: v.cuerpo, pie: '', boton: 'Ver opciones', opciones: [{ id: ui.uid('op'), titulo: 'Volver al menú', descripcion: '', accion: 'menu', destino: 'main' }] };
        db.update('menus', (arr) => { arr.push(m); return arr; });
        loadDraft(m.id); renderMenus(); preview();
        ui.toast('Menú creado', 'Agréguelo como opción "Abrir submenú" en otro menú para que sea accesible.', 'ok', 5000);
        return true;
      }
    });
  }

  async function deleteMenu() {
    const refs = db.get('menus').filter((m) => m.opciones.some((o) => o.accion === 'menu' && o.destino === draft.id));
    const ok = await ui.confirm({ title: `Eliminar "${draft.titulo}"`, message: refs.length ? `Se quitarán también las opciones que lo abren en: ${refs.map((r) => r.titulo).join(', ')}.` : 'Esta acción no se puede deshacer.', confirmLabel: 'Eliminar', danger: true });
    if (!ok) return;
    const id = draft.id;
    db.update('menus', (arr) => arr.filter((m) => m.id !== id).map((m) => Object.assign(m, { opciones: m.opciones.filter((o) => !(o.accion === 'menu' && o.destino === id)) })));
    loadDraft('main'); renderMenus(); preview();
    ui.toast('Menú eliminado', '', 'info');
  }

  // ---------- Mensajes ----------
  let msgDraft = null;
  const draftMsgs = () => msgDraft || db.get('settings').bot;
  function renderMensajes() {
    const b = db.get('settings').bot;
    msgDraft = Object.assign({}, b);
    const fields = [
      { name: 'activo', label: 'Bot activo (si se desactiva, todos los mensajes van a la bandeja de asesores)', type: 'checkbox', full: true },
      { name: 'bienvenida', label: 'Mensaje de bienvenida', type: 'textarea', required: true, full: true, rows: 3 },
      { name: 'fueraHorario', label: 'Mensaje fuera de horario', type: 'textarea', required: true, full: true, rows: 3, hint: 'Se agrega a la bienvenida cuando el negocio está cerrado según el horario de la agenda.' },
      { name: 'despedida', label: 'Mensaje de despedida', type: 'textarea', full: true, rows: 2 }
    ];
    body.innerHTML = `<div class="card"><div class="card-head"><h3>Mensajes del bot</h3></div><div class="card-body"><form class="form-grid" id="msg-form" novalidate>${ui.renderFields(fields, b)}</form></div><div class="card-foot"><button class="btn btn-primary" id="save-msgs">${icon('check', 'sm')}Guardar mensajes</button></div></div>
      <div class="notice info">${icon('info')}<p>Estado actual: ${WAB.bot.isOpenNow() ? '<strong>dentro del horario</strong> (no se agrega el mensaje de fuera de horario)' : '<strong>fuera del horario</strong> (se agrega el mensaje de fuera de horario)'}. El horario se edita en Configuración → Agenda.</p></div>`;
    const form = body.querySelector('#msg-form');
    form.addEventListener('input', (e) => { if (e.target.name) { msgDraft[e.target.name] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; preview(); } });
    body.querySelector('#save-msgs').onclick = () => {
      const r = ui.validate(form, fields);
      if (!r.ok) return;
      db.update('settings', (s) => { Object.assign(s.bot, r.values); return s; });
      ui.toast('Mensajes guardados', r.values.activo ? 'El bot está activo.' : 'El bot quedó desactivado.', r.values.activo ? 'ok' : 'warn');
    };
  }

  // ---------- Respuestas automáticas ----------
  function renderRespuestas() {
    const list = db.get('autoReplies');
    body.innerHTML = `<div class="card">
      <div class="card-head"><h3>Respuestas automáticas por palabra clave</h3><button class="btn btn-primary btn-sm" id="add-ar">${icon('plus', 'sm')}Nueva respuesta</button></div>
      ${list.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Palabras clave</th><th>Respuesta</th><th class="num">Usos</th><th>Activa</th><th></th></tr></thead><tbody>
        ${list.map((r) => `<tr><td><div class="chips">${r.claves.split(',').map((k) => `<span class="tag">${esc(k.trim())}</span>`).join('')}</div></td><td style="min-width:220px">${esc(r.respuesta)}</td><td class="num">${fmt.num(r.coincidencias || 0)}</td>
          <td><label class="switch"><input type="checkbox" data-toggle="${r.id}" ${r.activo ? 'checked' : ''}><span class="track"></span></label></td>
          <td class="nowrap"><button class="btn btn-ghost btn-icon btn-sm" data-edit="${r.id}" aria-label="Editar">${icon('edit', 'sm')}</button><button class="btn btn-ghost btn-icon btn-sm" data-del="${r.id}" aria-label="Eliminar">${icon('trash', 'sm')}</button></td></tr>`).join('')}
      </tbody></table></div>` : `<div class="card-body">${ui.emptyState({ icon: 'zap', title: 'Sin respuestas automáticas', text: 'Cree respuestas para preguntas repetitivas como horarios o ubicación.' })}</div>`}
      <div class="card-foot" style="justify-content:flex-start"><span class="small muted">Se evalúan antes que la IA. Si el mensaje contiene alguna palabra clave, se responde con el texto configurado.</span></div>
    </div>`;
    const edit = (r) => ui.formModal({
      title: r ? 'Editar respuesta' : 'Nueva respuesta automática',
      fields: [{ name: 'claves', label: 'Palabras clave (separadas por coma)', required: true, full: true, placeholder: 'precio, costo, cuánto cuesta' }, { name: 'respuesta', label: 'Respuesta', type: 'textarea', required: true, full: true, rows: 3 }, { name: 'activo', label: 'Activa', type: 'checkbox', full: true }],
      values: r || { activo: true },
      onSubmit: (v) => { db.upsert('autoReplies', Object.assign({ id: (r && r.id) || ui.uid('ar'), coincidencias: (r && r.coincidencias) || 0 }, v)); renderRespuestas(); preview(); ui.toast('Respuesta guardada', '', 'ok'); return true; }
    });
    body.querySelector('#add-ar').onclick = () => edit(null);
    body.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => edit(db.find('autoReplies', b.dataset.edit)));
    body.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { if (await ui.confirm({ title: 'Eliminar respuesta', message: 'La respuesta dejará de enviarse.', confirmLabel: 'Eliminar', danger: true })) { db.remove('autoReplies', b.dataset.del); renderRespuestas(); preview(); } });
    body.querySelectorAll('[data-toggle]').forEach((c) => c.onchange = () => { db.update('autoReplies', (arr) => { arr.find((x) => x.id === c.dataset.toggle).activo = c.checked; return arr; }); preview(); });
  }

  // ---------- Historial ----------
  function renderHistorial() {
    const log = db.get('navLog');
    body.innerHTML = `<div class="card">
      <div class="card-head"><h3>Historial de navegación</h3><button class="btn btn-ghost btn-sm" id="clear-log" ${log.length ? '' : 'disabled'}>${icon('trash', 'sm')}Limpiar</button></div>
      ${log.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Acción</th><th>Cliente</th></tr></thead><tbody>${log.map((l) => { const c = db.find('conversations', l.conv); const ct = c && db.contact(c.contactId); return `<tr><td class="nowrap">${esc(fmt.dateTime(l.ts))}</td><td>${esc(l.accion)}</td><td>${esc(ct ? ct.nombre : '—')}</td></tr>`; }).join('')}</tbody></table></div>`
        : `<div class="card-body">${ui.emptyState({ icon: 'clock', title: 'Aún no hay navegación registrada', text: 'Use el simulador de WhatsApp: cada menú, opción, reserva o compra quedará registrada aquí.', action: '<a class="btn btn-primary btn-sm mt-1" href="whatsapp.html">Abrir simulador</a>' })}</div>`}
    </div>`;
    const c = body.querySelector('#clear-log');
    if (c) c.onclick = () => { db.set('navLog', []); renderHistorial(); };
  }

  window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  setTab(['menus', 'mensajes', 'respuestas', 'historial'].includes(tab) ? tab : 'menus');
})();
