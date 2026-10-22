/* Bandeja de conversaciones: filtros, chat, tomar/devolver al bot, asignación, estados, etiquetas y notas internas. */
(function () {
  const { icon, ui, db, shell, badge } = window.WAB;
  const { esc, fmt } = ui;
  const ME = 'ag_1';
  let filter = 'todas';
  let query = '';
  let tagFilter = '';
  let current = null;
  let noteMode = false;
  let simTimer = null;

  const QUICK = ['¡Hola! Ya le atiendo.', 'Le confirmo en unos minutos.', 'Su pedido sale hoy.', 'Le comparto la ubicación: Av. Busch #1250.', '¿Le puedo ayudar en algo más?'];
  const INCOMING = ['Hola, ¿siguen atendiendo?', '¿Tienen turno para baño hoy?', 'Ya hice el pago por QR', '¿Cuánto cuesta la vacuna antirrábica?', 'Quisiera cambiar la hora de mi cita', '¿Hacen envíos a Urubó?', 'Gracias por la atención'];

  shell.view.innerHTML = `
    <div class="page-head">
      <div><h2>Conversaciones</h2><p class="muted">Bandeja compartida del equipo. Tome una conversación para responder como asesor y devuélvala al bot al terminar.</p></div>
      <div class="row wrap">
        <label class="switch"><input type="checkbox" id="sim-in" checked><span class="track"></span>Simular mensajes entrantes</label>
        <a class="btn btn-sm" href="whatsapp.html" target="_blank" rel="noopener">${icon('phone', 'sm')}Escribir como cliente</a>
      </div>
    </div>
    <div class="inbox" id="inbox">
      <section class="inbox-list">
        <div class="inbox-filters">
          <div class="input-group">${icon('search', 'sm')}<input class="input input-sm" id="q" placeholder="Buscar por nombre o mensaje" aria-label="Buscar conversaciones"></div>
          <div class="chips" id="filters"></div>
          <select class="select input-sm" id="tag" aria-label="Filtrar por etiqueta"><option value="">Todas las etiquetas</option></select>
        </div>
        <div class="conv-list" id="list"></div>
      </section>
      <section class="inbox-thread" id="thread"></section>
      <aside class="inbox-side" id="side"></aside>
    </div>`;

  const $ = (id) => document.getElementById(id);
  const conv = () => current && db.find('conversations', current);
  const lastText = (c) => {
    const m = c.mensajes[c.mensajes.length - 1];
    if (!m) return 'Sin mensajes';
    const p = m.payload;
    if (p.type === 'text') return `${m.from === 'agent' ? 'Usted: ' : m.from === 'bot' ? 'Bot: ' : ''}${p.text.body}`;
    if (p.type === 'system') return p.text;
    if (p.type === 'image') return m.from === 'user' ? 'Imagen' : 'QR de pago';
    const it = p.interactive;
    return it.button_reply ? it.button_reply.title : it.list_reply ? it.list_reply.title : it.nfm_reply ? 'Formulario enviado' : it.body ? `Bot: ${it.body.text}` : 'Mensaje interactivo';
  };

  function counts(list) {
    return {
      todas: list.length, pendiente: list.filter((c) => c.estado === 'pendiente').length, humano: list.filter((c) => c.estado === 'humano').length,
      bot: list.filter((c) => c.estado === 'bot').length, mias: list.filter((c) => c.asesor === ME && c.estado !== 'cerrada').length, cerrada: list.filter((c) => c.estado === 'cerrada').length
    };
  }

  function renderList() {
    const all = db.get('conversations').slice().sort((a, b) => new Date(b.actualizado) - new Date(a.actualizado));
    const n = counts(all);
    const F = [['todas', 'Todas'], ['pendiente', 'Esperando'], ['mias', 'Mías'], ['humano', 'Asesor'], ['bot', 'Bot'], ['cerrada', 'Cerradas']];
    $('filters').innerHTML = F.map(([k, l]) => `<button class="chip${filter === k ? ' active' : ''}" data-f="${k}">${l}<span class="count">${n[k]}</span></button>`).join('');
    const tags = Array.from(new Set(all.flatMap((c) => c.etiquetas))).sort();
    $('tag').innerHTML = `<option value="">Todas las etiquetas</option>${tags.map((t) => `<option${t === tagFilter ? ' selected' : ''}>${esc(t)}</option>`).join('')}`;
    const list = all.filter((c) => {
      if (filter === 'mias' ? !(c.asesor === ME && c.estado !== 'cerrada') : filter !== 'todas' && c.estado !== filter) return false;
      if (tagFilter && !c.etiquetas.includes(tagFilter)) return false;
      if (query) {
        const ct = db.contact(c.contactId);
        const hay = `${ct ? ct.nombre + ' ' + ct.telefono : ''} ${c.mensajes.map((m) => (m.payload.text && m.payload.text.body) || '').join(' ')}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
    $('list').innerHTML = list.length ? list.map((c) => {
      const ct = db.contact(c.contactId) || { nombre: 'Contacto' };
      const ag = c.asesor && db.agent(c.asesor);
      return `<div class="conv-item${c.id === current ? ' active' : ''}" data-id="${c.id}" tabindex="0">
        ${ui.avatar(ct.nombre)}
        <div class="grow">
          <div class="ci-top"><strong>${esc(ct.nombre)}</strong><small>${esc(fmt.relative(c.actualizado))}</small></div>
          <p>${esc(lastText(c))}</p>
          <div class="ci-meta">${badge('conv', c.estado)}${ag ? `<span class="badge">${esc(ag.nombre.split(' ')[0])}</span>` : ''}${c.etiquetas.slice(0, 2).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}${c.noLeidos ? `<span class="unread">${c.noLeidos}</span>` : ''}</div>
        </div>
      </div>`;
    }).join('') : ui.emptyState({ icon: 'messages', title: 'Sin conversaciones', text: 'No hay conversaciones con este filtro.' });
  }

  function renderThread() {
    const c = conv();
    if (!c) {
      $('thread').innerHTML = ui.emptyState({ icon: 'messages', title: 'Seleccione una conversación', text: 'Elija una conversación de la lista para ver los mensajes y responder.' });
      $('side').innerHTML = '';
      return;
    }
    const ct = db.contact(c.contactId) || { nombre: 'Contacto', telefono: '' };
    const human = c.estado === 'humano' || c.estado === 'pendiente';
    $('thread').innerHTML = `
      <div class="thread-head">
        <button class="btn btn-ghost btn-icon btn-sm back-btn" id="back" aria-label="Volver a la lista">${icon('arrowLeft')}</button>
        ${ui.avatar(ct.nombre, 'sm')}
        <div class="grow"><strong>${esc(ct.nombre)}</strong><small>${esc(ct.telefono)}</small></div>
        <span class="mode-pill ${human ? 'human' : 'bot'}">${icon(human ? 'headset' : 'bot', 'sm')}${human ? 'Atención humana' : 'Bot activo'}</span>
        <div class="btn-group">
          ${c.estado === 'humano' ? `<button class="btn btn-sm" id="to-bot">${icon('bot', 'sm')}Devolver al bot</button>` : c.estado !== 'cerrada' ? `<button class="btn btn-primary btn-sm" id="take">${icon('hand', 'sm')}Tomar conversación</button>` : ''}
          ${c.estado !== 'cerrada' ? `<button class="btn btn-ghost btn-sm" id="close">${icon('checkCircle', 'sm')}Cerrar</button>` : `<button class="btn btn-sm" id="reopen">${icon('refresh', 'sm')}Reabrir</button>`}
          <button class="btn btn-ghost btn-icon btn-sm" id="info" aria-label="Datos del contacto">${icon('info', 'sm')}</button>
        </div>
      </div>
      <div class="thread-body wa" id="msgs"></div>
      <div class="thread-compose${noteMode ? ' note-mode' : ''}">
        <div class="row between"><div class="compose-tabs"><button class="${noteMode ? '' : 'active'}" data-mode="reply">Responder</button><button class="note ${noteMode ? 'active' : ''}" data-mode="note">Nota interna</button></div>
          <span class="small muted">${noteMode ? 'Solo visible para el equipo' : c.estado === 'bot' ? 'Al responder tomará la conversación' : 'Se enviará por WhatsApp (simulado)'}</span></div>
        ${noteMode ? '' : `<div class="quick-replies">${QUICK.map((q) => `<button data-quick="${esc(q)}">${esc(q)}</button>`).join('')}</div>`}
        <form class="row" id="compose"><textarea class="textarea" id="text" rows="1" placeholder="${noteMode ? 'Escriba una nota para el equipo…' : 'Escriba un mensaje…'}" aria-label="Mensaje" maxlength="1000"></textarea><button class="btn btn-primary btn-icon" aria-label="Enviar">${icon(noteMode ? 'note' : 'send')}</button></form>
      </div>`;
    renderMessages();
    bindThread();
    renderSide();
  }

  function renderMessages() {
    const c = conv();
    if (!c) return;
    const items = c.mensajes.map((m) => ({ ts: m.ts, html: WAB.Phone.prototype.msgHTML.call(null, m) }))
      .concat(c.notas.map((n) => ({ ts: n.fecha, html: `<div class="msg-note">${icon('note', 'sm').replace('class="icon sm"', 'class="icon sm" style="display:inline;vertical-align:-3px"')} <b>${esc(n.autor)}:</b> ${esc(n.texto)}</div>` })))
      .sort((a, b) => new Date(a.ts) - new Date(b.ts));
    const box = $('msgs');
    box.innerHTML = items.length ? `<div class="wa-day">Historial</div>${items.map((i) => i.html).join('')}` : ui.emptyState({ icon: 'message', title: 'Sin mensajes' });
    box.querySelectorAll('button').forEach((b) => { b.disabled = true; b.title = 'Botón enviado al cliente'; });
    box.scrollTop = box.scrollHeight;
  }

  function update(fn) {
    db.update('conversations', (arr) => { fn(arr.find((x) => x.id === current)); return arr; });
  }
  function system(text) {
    update((c) => { c.mensajes.push({ id: ui.uid('wamid'), from: 'system', ts: new Date().toISOString(), payload: { type: 'system', text } }); c.actualizado = new Date().toISOString(); });
  }
  const meName = () => db.agent(ME).nombre;

  function bindThread() {
    const c = conv();
    const on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
    on('back', () => { $('inbox').classList.remove('thread-open'); });
    on('info', () => { $('inbox').classList.toggle('show-side'); });
    on('take', () => { update((x) => { x.estado = 'humano'; x.asesor = ME; x.noLeidos = 0; }); system(`${meName()} tomó la conversación`); ui.toast('Conversación tomada', 'El bot dejó de responder a este cliente.', 'ok'); refresh(); });
    on('to-bot', () => { update((x) => { x.estado = 'bot'; }); system('Conversación devuelta al bot'); ui.toast('Devuelta al bot', 'El asistente volverá a responder automáticamente.', 'info'); refresh(); });
    on('close', () => { update((x) => { x.estado = 'cerrada'; x.noLeidos = 0; }); system(`Conversación cerrada por ${meName()}`); refresh(); });
    on('reopen', () => { update((x) => { x.estado = 'humano'; x.asesor = x.asesor || ME; }); system('Conversación reabierta'); refresh(); });
    document.querySelectorAll('.compose-tabs button').forEach((b) => b.onclick = () => { noteMode = b.dataset.mode === 'note'; renderThread(); $('text').focus(); });
    document.querySelectorAll('[data-quick]').forEach((b) => b.onclick = () => { $('text').value = b.dataset.quick; $('text').focus(); });
    const ta = $('text');
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('compose').requestSubmit(); } });
    $('compose').onsubmit = (e) => {
      e.preventDefault();
      const text = ta.value.trim();
      if (!text) { ta.focus(); return; }
      if (noteMode) {
        update((x) => { x.notas.push({ id: ui.uid('nt'), texto: text, autor: meName(), fecha: new Date().toISOString() }); });
        ui.toast('Nota agregada', 'Solo la ve el equipo.', 'ok');
      } else {
        if (c.estado === 'bot' || c.estado === 'pendiente' || c.estado === 'cerrada') { update((x) => { x.estado = 'humano'; x.asesor = x.asesor || ME; }); system(`${meName()} tomó la conversación`); }
        update((x) => { x.mensajes.push({ id: ui.uid('wamid'), from: 'agent', sender: meName(), ts: new Date().toISOString(), payload: { type: 'text', text: { body: text } } }); x.actualizado = new Date().toISOString(); x.noLeidos = 0; });
      }
      ta.value = '';
      refresh();
      $('text').focus();
    };
  }

  function renderSide() {
    const c = conv();
    if (!c) return;
    const ct = db.contact(c.contactId) || {};
    const agents = db.get('agents');
    const orders = db.get('orders').filter((o) => o.contactId === ct.id).slice(0, 3);
    const aps = db.get('appointments').filter((a) => a.contactId === ct.id).sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 3);
    $('side').innerHTML = `
      <div class="side-sec side-profile">${ui.avatar(ct.nombre, 'lg')}<strong>${esc(ct.nombre)}</strong><span class="small muted">${esc(ct.telefono || '')}</span>${badge('contacto', ct.estado)}<a class="btn btn-sm" href="crm.html#${ct.id}">${icon('user', 'sm')}Ver ficha en CRM</a></div>
      <div class="side-sec"><h4>Asignación</h4>
        <select class="select input-sm" id="assign" aria-label="Asesor asignado"><option value="">Sin asignar</option>${agents.map((a) => `<option value="${a.id}"${a.id === c.asesor ? ' selected' : ''}>${esc(a.nombre)} · ${esc(a.rol)} (${esc(a.estado)})</option>`).join('')}</select>
        <h4 class="mt-1">Estado de atención</h4>
        <select class="select input-sm" id="status" aria-label="Estado de atención">${Object.entries(WAB.STATUS.conv).map(([k, v]) => `<option value="${k}"${k === c.estado ? ' selected' : ''}>${v[0]}</option>`).join('')}</select>
      </div>
      <div class="side-sec"><h4>Etiquetas</h4><div class="chips" id="tags">${c.etiquetas.map((t) => `<span class="tag">${esc(t)}<button data-rm="${esc(t)}" aria-label="Quitar ${esc(t)}">×</button></span>`).join('') || '<span class="small muted">Sin etiquetas</span>'}</div>
        <form class="row" id="tag-form"><input class="input input-sm" placeholder="Nueva etiqueta" maxlength="24" aria-label="Nueva etiqueta" list="tag-list"><button class="btn btn-sm">${icon('plus', 'sm')}</button></form>
        <datalist id="tag-list">${Array.from(new Set(db.get('conversations').flatMap((x) => x.etiquetas))).map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
      </div>
      <div class="side-sec"><h4>Notas internas (${c.notas.length})</h4>${c.notas.length ? c.notas.slice().reverse().map((n) => `<div class="note-item">${esc(n.texto)}<small>${esc(n.autor)} · ${esc(fmt.relative(n.fecha))}</small></div>`).join('') : '<span class="small muted">Use la pestaña "Nota interna" para dejar contexto al equipo.</span>'}</div>
      <div class="side-sec"><h4>Citas</h4>${aps.length ? aps.map((a) => `<div class="row between small"><span>${esc((db.service(a.servicioId) || {}).nombre || 'Cita')} · ${esc(fmt.date(a.fecha, 'short'))}</span>${badge('cita', a.estado)}</div>`).join('') : '<span class="small muted">Sin citas</span>'}</div>
      <div class="side-sec"><h4>Pedidos</h4>${orders.length ? orders.map((o) => `<a class="row between small" href="pedidos.html#${o.id}"><span>#${o.numero} · ${fmt.money(o.total)}</span>${badge('pedido', o.estado)}</a>`).join('') : '<span class="small muted">Sin pedidos</span>'}</div>`;
    $('assign').onchange = (e) => {
      const ag = db.agent(e.target.value);
      update((x) => { x.asesor = e.target.value || null; if (e.target.value && x.estado !== 'cerrada') x.estado = 'humano'; });
      system(ag ? `Asignada a ${ag.nombre}` : 'Asignación retirada');
      ui.toast(ag ? `Asignada a ${ag.nombre}` : 'Sin asignar', '', 'ok');
      refresh();
    };
    $('status').onchange = (e) => { update((x) => { x.estado = e.target.value; }); system(`Estado cambiado a: ${WAB.STATUS.conv[e.target.value][0]}`); refresh(); };
    $('tags').onclick = (e) => { const b = e.target.closest('[data-rm]'); if (!b) return; update((x) => { x.etiquetas = x.etiquetas.filter((t) => t !== b.dataset.rm); }); refresh(); };
    $('tag-form').onsubmit = (e) => {
      e.preventDefault();
      const v = e.target.querySelector('input').value.trim().toLowerCase();
      if (!v) return;
      if (conv().etiquetas.includes(v)) return ui.toast('La etiqueta ya existe', '', 'warn');
      update((x) => { x.etiquetas.push(v); });
      refresh();
    };
  }

  function open(id) {
    current = id;
    noteMode = false;
    if (conv()) update((x) => { x.noLeidos = 0; });
    $('inbox').classList.add('thread-open');
    $('inbox').classList.remove('show-side');
    history.replaceState(null, '', `#${id}`);
    renderList();
    renderThread();
  }
  function refresh() { renderList(); renderThread(); }

  $('list').addEventListener('click', (e) => { const it = e.target.closest('.conv-item'); if (it) open(it.dataset.id); });
  $('list').addEventListener('keydown', (e) => { const it = e.target.closest('.conv-item'); if (it && e.key === 'Enter') open(it.dataset.id); });
  $('filters').addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (b) { filter = b.dataset.f; renderList(); } });
  $('q').addEventListener('input', ui.debounce((e) => { query = e.target.value.trim().toLowerCase(); renderList(); }, 150));
  $('tag').addEventListener('change', (e) => { tagFilter = e.target.value; renderList(); });

  // Mensajes entrantes simulados ("tiempo real")
  function simulateIncoming() {
    const convs = db.get('conversations').filter((c) => c.id !== WAB.bot.DEMO_CONV);
    const c = convs[Math.floor(Math.random() * convs.length)];
    const text = INCOMING[Math.floor(Math.random() * INCOMING.length)];
    db.update('conversations', (arr) => {
      const x = arr.find((y) => y.id === c.id);
      x.mensajes.push({ id: ui.uid('wamid'), from: 'user', ts: new Date().toISOString(), payload: { type: 'text', text: { body: text } } });
      x.actualizado = new Date().toISOString();
      if (x.id !== current) x.noLeidos = (x.noLeidos || 0) + 1;
      if (x.estado === 'cerrada') x.estado = 'pendiente';
      return arr;
    });
    const ct = db.contact(c.contactId);
    ui.toast(`Nuevo mensaje de ${ct ? ct.nombre : 'un cliente'}`, text, 'info');
    renderList();
    if (c.id === current) renderMessages();
  }
  function setSim(on) {
    clearInterval(simTimer);
    if (on) simTimer = setInterval(simulateIncoming, 25000);
  }
  $('sim-in').onchange = (e) => setSim(e.target.checked);
  setSim(true);

  db.on('*', (v, src) => { if (src === 'external') { renderList(); if (current) renderThread(); } });

  renderList();
  const initial = location.hash.slice(1);
  if (initial && db.find('conversations', initial)) open(initial);
  else if (window.innerWidth > 860) { const first = db.get('conversations').slice().sort((a, b) => new Date(b.actualizado) - new Date(a.actualizado))[0]; if (first) open(first.id); else renderThread(); }
  else renderThread();
})();
