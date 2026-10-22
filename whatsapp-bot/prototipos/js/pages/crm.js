/* CRM: contactos, filtros, embudo con arrastrar y soltar, ficha del cliente con historial, notas y exportación CSV. */
(function () {
  const { icon, ui, db, shell, badge } = window.WAB;
  const { esc, fmt } = ui;
  const ST = WAB.STATUS.contacto;
  let view = 'tabla';
  const f = { q: '', estado: '', tag: '', fuente: '' };

  shell.view.innerHTML = `
    <div class="page-head">
      <div><h2>Contactos</h2><p class="muted">Cada persona que escribe por WhatsApp se registra con su historial. Clasifique prospectos y dé seguimiento.</p></div>
      <div class="btn-group"><button class="btn" id="csv">${icon('download', 'sm')}Exportar CSV</button><button class="btn btn-primary" id="new">${icon('plus', 'sm')}Nuevo contacto</button></div>
    </div>
    <div class="kpis" id="kpis"></div>
    <div class="card">
      <div class="card-head toolbar">
        <div class="input-group">${icon('search', 'sm')}<input class="input input-sm" id="q" placeholder="Nombre, teléfono, mascota o correo" aria-label="Buscar contactos"></div>
        <select class="select input-sm" id="estado" style="width:auto" aria-label="Estado"><option value="">Todos los estados</option>${Object.entries(ST).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select>
        <select class="select input-sm" id="tag" style="width:auto" aria-label="Etiqueta"></select>
        <select class="select input-sm" id="fuente" style="width:auto" aria-label="Fuente"></select>
        <span class="grow"></span>
        <div class="segmented"><button data-view="tabla" class="active">${icon('list', 'sm')}Tabla</button><button data-view="embudo">${icon('kanban', 'sm')}Embudo</button></div>
      </div>
      <div id="content"></div>
    </div>`;
  const $ = (id) => document.getElementById(id);

  function filtered() {
    const q = f.q.toLowerCase();
    return db.get('contacts').filter((c) => (!f.estado || c.estado === f.estado) && (!f.tag || c.etiquetas.includes(f.tag)) && (!f.fuente || c.fuente === f.fuente)
      && (!q || `${c.nombre} ${c.telefono} ${c.mascota} ${c.correo}`.toLowerCase().includes(q)))
      .sort((a, b) => new Date(b.ultimoContacto) - new Date(a.ultimoContacto));
  }

  function renderFilters() {
    const all = db.get('contacts');
    const tags = Array.from(new Set(all.flatMap((c) => c.etiquetas))).sort();
    const srcs = Array.from(new Set(all.map((c) => c.fuente))).sort();
    $('tag').innerHTML = `<option value="">Todas las etiquetas</option>${tags.map((t) => `<option${t === f.tag ? ' selected' : ''}>${esc(t)}</option>`).join('')}`;
    $('fuente').innerHTML = `<option value="">Todas las fuentes</option>${srcs.map((t) => `<option${t === f.fuente ? ' selected' : ''}>${esc(t)}</option>`).join('')}`;
    $('kpis').innerHTML = Object.entries(ST).map(([k, v]) => `<button class="kpi" data-k="${k}" style="text-align:left;cursor:pointer;${f.estado === k ? 'border-color:var(--brand);box-shadow:0 0 0 1px var(--brand)' : ''}"><span class="kpi-label">${v[0]}s</span><span class="kpi-value">${all.filter((c) => c.estado === k).length}</span><span class="small muted">${fmt.money(all.filter((c) => c.estado === k).reduce((t, c) => t + (c.valor || 0), 0))} en compras</span></button>`).join('');
  }

  function render() {
    renderFilters();
    const list = filtered();
    const box = $('content');
    if (view === 'tabla') {
      box.innerHTML = list.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Contacto</th><th class="hide-sm">Mascota</th><th>Estado</th><th class="hide-sm">Etiquetas</th><th class="hide-sm">Fuente</th><th>Último contacto</th><th class="num hide-sm">Compras</th></tr></thead><tbody>
        ${list.map((c) => `<tr class="clickable" data-id="${c.id}"><td><div class="cell-user">${ui.avatar(c.nombre, 'sm')}<div class="meta"><strong>${esc(c.nombre)}</strong><small>${esc(c.telefono)}</small></div></div></td><td class="hide-sm">${esc(c.mascota || '—')}</td><td>${badge('contacto', c.estado)}</td><td class="hide-sm"><div class="chips">${c.etiquetas.slice(0, 3).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div></td><td class="hide-sm">${esc(c.fuente)}</td><td class="nowrap">${esc(fmt.relative(c.ultimoContacto))}</td><td class="num hide-sm">${fmt.money(c.valor || 0)}</td></tr>`).join('')}
        </tbody></table></div><div class="card-foot" style="justify-content:space-between"><span class="small muted">${list.length} de ${db.get('contacts').length} contactos</span></div>`
        : `<div class="card-body">${ui.emptyState({ icon: 'users', title: 'Sin resultados', text: 'Ningún contacto coincide con los filtros.', action: '<button class="btn btn-sm mt-1" id="clear-f">Limpiar filtros</button>' })}</div>`;
      const cf = $('clear-f');
      if (cf) cf.onclick = () => { Object.keys(f).forEach((k) => { f[k] = ''; }); $('q').value = ''; $('estado').value = ''; render(); };
      box.querySelectorAll('tr[data-id]').forEach((r) => r.onclick = () => profile(r.dataset.id));
    } else {
      box.innerHTML = `<div class="card-body" style="overflow-x:auto"><div class="kanban">${Object.entries(ST).map(([k, v]) => {
        const col = list.filter((c) => c.estado === k);
        return `<div class="kb-col" data-col="${k}"><header><span>${v[0]}</span><span class="badge">${col.length}</span></header>
          ${col.map((c) => `<div class="kb-card" draggable="true" data-id="${c.id}"><div class="row" style="gap:8px">${ui.avatar(c.nombre, 'sm')}<strong>${esc(c.nombre)}</strong></div><small>${esc(c.mascota ? `Mascota: ${c.mascota}` : c.telefono)} · ${fmt.money(c.valor || 0)}</small><div class="chips">${c.etiquetas.slice(0, 2).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div></div>`).join('') || '<p class="small muted center" style="padding:20px 0">Arrastre contactos aquí</p>'}
        </div>`;
      }).join('')}</div><p class="small muted mt-2 mb-0">Arrastre las tarjetas entre columnas para cambiar la etapa. En celulares, abra la ficha y cambie el estado.</p></div>`;
      let dragId = null;
      box.querySelectorAll('.kb-card').forEach((c) => {
        c.addEventListener('dragstart', (e) => { dragId = c.dataset.id; c.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); });
        c.addEventListener('dragend', () => c.classList.remove('dragging'));
        c.addEventListener('click', () => profile(c.dataset.id));
      });
      box.querySelectorAll('.kb-col').forEach((col) => {
        col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over'); });
        col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
        col.addEventListener('drop', (e) => {
          e.preventDefault(); col.classList.remove('drag-over');
          const id = dragId || e.dataTransfer.getData('text/plain');
          setStatus(id, col.dataset.col);
        });
      });
    }
  }

  function setStatus(id, estado) {
    const c = db.contact(id);
    if (!c || c.estado === estado) return;
    db.update('contacts', (arr) => { arr.find((x) => x.id === id).estado = estado; return arr; });
    ui.toast(`${c.nombre}: ${ST[estado][0]}`, 'Etapa actualizada.', 'ok');
    render();
  }

  const FIELDS = [
    { name: 'nombre', label: 'Nombre completo', required: true, maxlength: 60 },
    { name: 'telefono', label: 'Teléfono WhatsApp', type: 'tel', required: true, placeholder: '+591 7xxxxxxx' },
    { name: 'correo', label: 'Correo', type: 'email' },
    { name: 'mascota', label: 'Mascota', maxlength: 30 },
    { name: 'estado', label: 'Estado', type: 'select', options: Object.entries(ST).map(([k, v]) => ({ value: k, label: v[0] })) },
    { name: 'fuente', label: 'Fuente', type: 'select', options: ['WhatsApp', 'Anuncio Facebook', 'Instagram', 'Tienda web', 'Referido', 'Presencial'] },
    { name: 'etiquetas', label: 'Etiquetas (separadas por coma)', full: true },
    { name: 'consentimiento', label: 'Acepta recibir mensajes promocionales', type: 'checkbox', full: true }
  ];
  function edit(c) {
    const fields = FIELDS.map((x) => Object.assign({}, x));
    fields[1].validate = (v) => { const norm = (s) => s.replace(/\D/g, ''); const dup = db.get('contacts').find((o) => norm(o.telefono) === norm(v) && (!c || o.id !== c.id)); return dup ? `Ya existe: ${dup.nombre}` : ''; };
    ui.formModal({
      title: c ? 'Editar contacto' : 'Nuevo contacto', fields, values: c ? Object.assign({}, c, { etiquetas: c.etiquetas.join(', ') }) : { estado: 'prospecto', fuente: 'WhatsApp', consentimiento: true },
      onSubmit: (v) => {
        const rec = Object.assign({}, c || { id: ui.uid('ct'), notas: [], creado: new Date().toISOString(), ultimoContacto: new Date().toISOString(), valor: 0 }, v, { etiquetas: String(v.etiquetas || '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean) });
        db.upsert('contacts', rec);
        ui.toast(c ? 'Contacto actualizado' : 'Contacto creado', rec.nombre, 'ok');
        render();
        if (c) profile(rec.id);
        return true;
      }
    });
  }

  function profile(id) {
    const c = db.contact(id);
    if (!c) return;
    history.replaceState(null, '', `#${id}`);
    const conv = db.get('conversations').find((x) => x.contactId === id);
    const msgs = conv ? conv.mensajes.filter((m) => m.payload.type !== 'system').slice(-12) : [];
    const aps = db.get('appointments').filter((a) => a.contactId === id).sort((a, b) => b.fecha.localeCompare(a.fecha));
    const ords = db.get('orders').filter((o) => o.contactId === id);
    const msgText = (m) => { const p = m.payload; if (p.type === 'text') return p.text.body; if (p.type === 'image') return '[Imagen]'; const it = p.interactive || {}; return (it.button_reply && it.button_reply.title) || (it.list_reply && it.list_reply.title) || (it.body && it.body.text) || '[Interactivo]'; };
    const d = ui.drawer({
      title: 'Ficha del cliente', wide: true,
      body: `
        <div class="row" style="align-items:flex-start">${ui.avatar(c.nombre, 'lg')}<div class="grow"><h3 class="mb-0">${esc(c.nombre)}</h3><p class="small muted mb-0">${esc(c.telefono)}${c.correo ? ` · ${esc(c.correo)}` : ''}</p><div class="chips mt-1">${badge('contacto', c.estado)}<span class="badge">${esc(c.fuente)}</span>${c.consentimiento ? '<span class="badge ok">Acepta promociones</span>' : '<span class="badge danger">Sin consentimiento</span>'}</div></div></div>
        <div class="grid-2 mt-3">
          <div class="field"><label>Etapa</label><select class="select" id="p-estado">${Object.entries(ST).map(([k, v]) => `<option value="${k}"${k === c.estado ? ' selected' : ''}>${v[0]}</option>`).join('')}</select></div>
          <dl class="kv" style="align-self:end"><dt>Mascota</dt><dd>${esc(c.mascota || '—')}</dd><dt>Cliente desde</dt><dd>${esc(fmt.date(c.creado))}</dd><dt>Compras</dt><dd>${fmt.money(c.valor || 0)}</dd></dl>
        </div>
        <div class="field mt-2"><label>Etiquetas</label><div class="chips" id="p-tags">${c.etiquetas.map((t) => `<span class="tag">${esc(t)}<button data-rm="${esc(t)}" aria-label="Quitar">×</button></span>`).join('')}</div>
          <form class="row mt-1" id="p-tag-form"><input class="input input-sm" placeholder="Agregar etiqueta" maxlength="24" aria-label="Agregar etiqueta"><button class="btn btn-sm">${icon('plus', 'sm')}</button></form></div>
        <div class="tabs mt-3" id="p-tabs"><button class="tab active" data-t="notas">Notas (${c.notas.length})</button><button class="tab" data-t="mensajes">Mensajes (${msgs.length})</button><button class="tab" data-t="citas">Citas (${aps.length})</button><button class="tab" data-t="pedidos">Pedidos (${ords.length})</button></div>
        <div class="tab-panel" id="p-panel"></div>`,
      actions: [
        { label: 'Eliminar', kind: 'btn-danger', icon: 'trash', onClick: async ({ close }) => { if (await ui.confirm({ title: `Eliminar a ${c.nombre}`, message: 'Se quitará el contacto del CRM. Sus pedidos y citas se conservan en el historial.', confirmLabel: 'Eliminar', danger: true })) { db.remove('contacts', id); close(); render(); ui.toast('Contacto eliminado', '', 'info'); } } },
        { label: 'Editar', icon: 'edit', onClick: ({ close }) => { close(); edit(db.contact(id)); } },
        { label: conv ? 'Abrir conversación' : 'Sin conversación', kind: 'btn-primary', icon: 'messages', onClick: () => { if (conv) location.href = `conversaciones.html#${conv.id}`; else ui.toast('Sin conversación', 'Este contacto aún no escribió por WhatsApp.', 'info'); } }
      ],
      onClose: () => history.replaceState(null, '', location.pathname)
    });
    const panel = (t) => {
      const p = d.body.querySelector('#p-panel');
      const cur = db.contact(id);
      if (t === 'notas') {
        p.innerHTML = `<form id="note-form" class="stack"><textarea class="textarea" rows="2" placeholder="Escriba una nota sobre el cliente…" aria-label="Nueva nota" maxlength="500"></textarea><div><button class="btn btn-sm btn-primary">${icon('plus', 'sm')}Agregar nota</button></div></form>
          <div class="stack mt-2">${cur.notas.length ? cur.notas.slice().reverse().map((n) => `<div class="note-item">${esc(n.texto)}<small>${esc(n.autor)} · ${esc(fmt.dateTime(n.fecha))}</small></div>`).join('') : '<p class="small muted">Sin notas.</p>'}</div>`;
        p.querySelector('#note-form').onsubmit = (e) => {
          e.preventDefault();
          const ta = e.target.querySelector('textarea');
          if (!ta.value.trim()) { ta.focus(); return; }
          db.update('contacts', (arr) => { arr.find((x) => x.id === id).notas.push({ id: ui.uid('nt'), texto: ta.value.trim(), autor: 'Daniela Rojas', fecha: new Date().toISOString() }); return arr; });
          panel('notas');
        };
      } else if (t === 'mensajes') {
        p.innerHTML = msgs.length ? `<div class="stack">${msgs.map((m) => `<div class="row" style="align-items:flex-start;gap:10px"><span class="badge ${m.from === 'user' ? '' : m.from === 'agent' ? 'warn' : 'accent'}" style="flex:none">${m.from === 'user' ? 'Cliente' : m.from === 'agent' ? 'Asesor' : 'Bot'}</span><div class="grow small">${esc(msgText(m))}<br><span class="muted">${esc(fmt.dateTime(m.ts))}</span></div></div>`).join('')}</div>` : '<p class="small muted">Sin mensajes registrados.</p>';
      } else if (t === 'citas') {
        p.innerHTML = aps.length ? `<div class="list-rows">${aps.map((a) => `<a class="list-row" href="calendario.html#${a.id}"><div class="grow"><strong>${esc((db.service(a.servicioId) || { nombre: 'Cita' }).nombre)}</strong><small>${esc(fmt.date(a.fecha))} · ${a.hora}</small></div>${badge('cita', a.estado)}</a>`).join('')}</div>` : '<p class="small muted">Sin citas.</p>';
      } else {
        p.innerHTML = ords.length ? `<div class="list-rows">${ords.map((o) => `<a class="list-row" href="pedidos.html#${o.id}"><div class="grow"><strong>Pedido #${o.numero} · ${fmt.money(o.total)}</strong><small>${esc(fmt.date(o.creado))} · ${o.items.length} producto(s)</small></div>${badge('pedido', o.estado)}</a>`).join('')}</div>` : '<p class="small muted">Sin pedidos.</p>';
      }
    };
    d.body.querySelector('#p-tabs').onclick = (e) => { const b = e.target.closest('[data-t]'); if (!b) return; d.body.querySelectorAll('#p-tabs .tab').forEach((x) => x.classList.toggle('active', x === b)); panel(b.dataset.t); };
    d.body.querySelector('#p-estado').onchange = (e) => { setStatus(id, e.target.value); };
    d.body.querySelector('#p-tags').onclick = (e) => { const b = e.target.closest('[data-rm]'); if (!b) return; db.update('contacts', (arr) => { const x = arr.find((y) => y.id === id); x.etiquetas = x.etiquetas.filter((t) => t !== b.dataset.rm); return arr; }); b.parentElement.remove(); render(); };
    d.body.querySelector('#p-tag-form').onsubmit = (e) => {
      e.preventDefault();
      const inp = e.target.querySelector('input');
      const v = inp.value.trim().toLowerCase();
      if (!v || db.contact(id).etiquetas.includes(v)) return;
      db.update('contacts', (arr) => { arr.find((y) => y.id === id).etiquetas.push(v); return arr; });
      d.body.querySelector('#p-tags').insertAdjacentHTML('beforeend', `<span class="tag">${esc(v)}<button data-rm="${esc(v)}" aria-label="Quitar">×</button></span>`);
      inp.value = '';
      render();
    };
    panel('notas');
  }

  function exportCSV() {
    const list = filtered();
    if (!list.length) return ui.toast('No hay contactos para exportar', 'Ajuste los filtros.', 'warn');
    const rows = [['Nombre', 'Teléfono', 'Correo', 'Mascota', 'Estado', 'Etiquetas', 'Fuente', 'Consentimiento', 'Último contacto', 'Compras (Bs)']]
      .concat(list.map((c) => [c.nombre, c.telefono, c.correo, c.mascota, ST[c.estado][0], c.etiquetas.join(', '), c.fuente, c.consentimiento ? 'Sí' : 'No', fmt.dateTime(c.ultimoContacto), c.valor || 0]));
    ui.download(`contactos-${fmt.isoDate(new Date())}.csv`, ui.toCSV(rows), 'text/csv;charset=utf-8');
    ui.toast('CSV exportado', `${list.length} contactos`, 'ok');
  }

  $('q').addEventListener('input', ui.debounce((e) => { f.q = e.target.value.trim(); render(); }, 150));
  ['estado', 'tag', 'fuente'].forEach((k) => $(k).addEventListener('change', (e) => { f[k] = e.target.value; render(); }));
  $('kpis').onclick = (e) => { const b = e.target.closest('[data-k]'); if (!b) return; f.estado = f.estado === b.dataset.k ? '' : b.dataset.k; $('estado').value = f.estado; render(); };
  document.querySelector('.segmented').onclick = (e) => { const b = e.target.closest('[data-view]'); if (!b) return; view = b.dataset.view; document.querySelectorAll('[data-view]').forEach((x) => x.classList.toggle('active', x === b)); render(); };
  $('new').onclick = () => edit(null);
  $('csv').onclick = exportCSV;
  db.on('*', (v, src) => { if (src === 'external') render(); });

  render();
  const h = location.hash.slice(1);
  if (h && db.contact(h)) profile(h);
  window.addEventListener('hashchange', () => { const x = location.hash.slice(1); if (x && db.contact(x)) profile(x); });
})();
