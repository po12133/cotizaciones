/* Calendario y citas: vistas mes/semana/lista, gestión de estados, reprogramación, recordatorios y reserva por WhatsApp. */
(function () {
  const { icon, ui, db, shell, badge, bot, agendaEditors } = window.WAB;
  const { esc, fmt } = ui;
  const today = fmt.isoDate(new Date());
  let cursor = new Date(); cursor.setDate(1);
  let weekStart = startOfWeek(new Date());
  let view = window.innerWidth < 700 ? 'lista' : 'mes';
  let statusFilter = '';
  let tab = 'agenda';
  let phone = null;

  function startOfWeek(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); return x; }
  const iso = fmt.isoDate;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const svcName = (a) => (db.service(a.servicioId) || { nombre: 'Servicio' }).nombre;
  const ctName = (a) => (db.contact(a.contactId) || { nombre: 'Cliente' }).nombre;
  const apps = () => db.get('appointments').filter((a) => !statusFilter || a.estado === statusFilter);

  shell.view.innerHTML = `
    <div class="page-head">
      <div><h2>Calendario y citas</h2><p class="muted">Agenda con disponibilidad real. Las reservas hechas en el simulador de WhatsApp aparecen aquí al instante.</p></div>
      <div class="btn-group"><button class="btn btn-primary" id="new">${icon('plus', 'sm')}Nueva cita</button></div>
    </div>
    <div class="tabs"><button class="tab active" data-tab="agenda">${icon('calendar', 'sm')}Agenda</button><button class="tab" data-tab="ajustes">${icon('settings', 'sm')}Servicios, horarios y flujo</button></div>
    <div class="split">
      <div id="main-col" class="stack"></div>
      <div class="phone-col"><div id="phone"></div><button class="btn btn-sm" id="sim-book">${icon('play', 'sm')}Simular reserva por WhatsApp</button><p class="phone-caption">Reserve desde el teléfono y vea la cita en el calendario.</p></div>
    </div>`;
  const main = document.getElementById('main-col');

  function kpis() {
    const list = db.get('appointments');
    const t = list.filter((a) => a.fecha === today && a.estado !== 'cancelada').length;
    const wk = list.filter((a) => a.fecha >= today && a.fecha <= iso(addDays(new Date(), 7)) && a.estado !== 'cancelada').length;
    const pend = list.filter((a) => a.estado === 'pendiente').length;
    const past = list.filter((a) => a.fecha < today && ['completada', 'no_asistio'].includes(a.estado));
    const noShow = past.length ? Math.round((past.filter((a) => a.estado === 'no_asistio').length / past.length) * 100) : 0;
    return `<div class="kpis">
      <div class="kpi"><span class="kpi-label">Citas hoy</span><span class="kpi-value">${t}</span></div>
      <div class="kpi"><span class="kpi-label">Próximos 7 días</span><span class="kpi-value">${wk}</span></div>
      <div class="kpi"><span class="kpi-label">Por confirmar</span><span class="kpi-value">${pend}</span></div>
      <div class="kpi"><span class="kpi-label">Inasistencias</span><span class="kpi-value">${noShow}%</span></div></div>`;
  }

  function render() {
    if (tab === 'ajustes') return renderSettings();
    const title = view === 'semana' ? `${fmt.date(weekStart, 'short')} – ${fmt.date(addDays(weekStart, 6), 'short')}` : (() => { const s = cursor.toLocaleDateString('es-BO', { month: 'long', year: 'numeric' }); return s.charAt(0).toUpperCase() + s.slice(1); })();
    main.innerHTML = `${kpis()}
      <div class="card">
        <div class="card-head cal-head">
          <div class="row"><button class="btn btn-icon btn-sm" id="prev" aria-label="Anterior">${icon('chevronLeft')}</button><button class="btn btn-sm" id="today">Hoy</button><button class="btn btn-icon btn-sm" id="next" aria-label="Siguiente">${icon('chevronRight')}</button><h3 style="margin-left:6px">${esc(title)}</h3></div>
          <div class="row wrap">
            <select class="select input-sm" id="status" aria-label="Filtrar por estado" style="width:auto"><option value="">Todos los estados</option>${Object.entries(WAB.STATUS.cita).map(([k, v]) => `<option value="${k}"${k === statusFilter ? ' selected' : ''}>${v[0]}</option>`).join('')}</select>
            <div class="segmented">${[['mes', 'Mes'], ['semana', 'Semana'], ['lista', 'Lista']].map(([k, l]) => `<button data-view="${k}" class="${view === k ? 'active' : ''}">${l}</button>`).join('')}</div>
          </div>
        </div>
        <div id="cal" ${view === 'semana' ? 'class="table-wrap"' : ''}></div>
        <div class="card-foot" style="justify-content:flex-start"><div class="legend">${Object.entries(WAB.STATUS.cita).map(([k, v]) => `<span><i class="cal-ev ${k}" style="width:12px;height:12px;padding:0;border-radius:3px"></i>${v[0]}</span>`).join('')}</div></div>
      </div>`;
    ({ mes: month, semana: week, lista: listView })[view]();
    bindHead();
  }

  function month() {
    const first = new Date(cursor);
    const start = startOfWeek(first);
    const horario = db.get('settings').agenda.horario;
    const list = apps();
    let html = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => `<div class="cal-weekday">${d}</div>`).join('');
    for (let i = 0; i < 42; i++) {
      const d = addDays(start, i);
      const key = iso(d);
      const evs = list.filter((a) => a.fecha === key).sort((a, b) => a.hora.localeCompare(b.hora));
      const cls = [d.getMonth() !== cursor.getMonth() ? 'out' : '', key === today ? 'today' : '', horario[d.getDay()] && !horario[d.getDay()].on ? 'closed' : ''].join(' ');
      html += `<div class="cal-cell ${cls}" data-day="${key}" tabindex="0" aria-label="${esc(fmt.date(d, 'long'))}: ${evs.length} citas"><span class="cal-day">${d.getDate()}</span>
        ${evs.slice(0, 3).map((a) => `<div class="cal-ev ${a.estado}" data-ap="${a.id}" title="${esc(`${a.hora} ${svcName(a)} · ${ctName(a)}`)}">${a.hora} ${esc(svcName(a))}</div>`).join('')}
        ${evs.length > 3 ? `<span class="cal-more">+${evs.length - 3} más</span>` : ''}
        <div class="cal-dots">${evs.slice(0, 5).map(() => '<i></i>').join('')}</div></div>`;
      if (i === 34 && addDays(start, 35).getMonth() !== cursor.getMonth()) break;
    }
    const cal = document.getElementById('cal');
    cal.innerHTML = `<div class="cal-grid">${html}</div>`;
    cal.onclick = (e) => {
      const ev = e.target.closest('[data-ap]');
      if (ev) { e.stopPropagation(); return detail(ev.dataset.ap); }
      const cell = e.target.closest('[data-day]');
      if (cell) dayPanel(cell.dataset.day);
    };
    cal.onkeydown = (e) => { const cell = e.target.closest('[data-day]'); if (cell && e.key === 'Enter') dayPanel(cell.dataset.day); };
  }

  function week() {
    const horario = db.get('settings').agenda.horario;
    const list = apps();
    const startH = 8, endH = 19;
    let html = '<div class="wg-head"></div>';
    for (let i = 0; i < 7; i++) { const d = addDays(weekStart, i); html += `<div class="wg-head${iso(d) === today ? ' today' : ''}">${esc(d.toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric' }))}</div>`; }
    for (let m = startH * 60; m < endH * 60; m += 30) {
      const hh = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      html += `<div class="wg-time">${m % 60 === 0 ? hh : ''}</div>`;
      for (let i = 0; i < 7; i++) {
        const d = addDays(weekStart, i);
        const day = horario[d.getDay()];
        const closed = !day.on || hh < day.de || hh >= day.a;
        const evs = list.filter((a) => a.fecha === iso(d) && a.hora === hh);
        html += `<div class="wg-slot${closed ? ' closed' : ''}" data-slot="${iso(d)}|${hh}">${evs.map((a) => { const dur = (db.service(a.servicioId) || { duracion: 30 }).duracion; return `<div class="wg-ev cal-ev ${a.estado}" data-ap="${a.id}" style="height:${Math.max(1, dur / 30) * 44 - 4}px">${a.hora} ${esc(svcName(a))}<br><small>${esc(ctName(a))}</small></div>`; }).join('')}</div>`;
      }
    }
    const cal = document.getElementById('cal');
    cal.innerHTML = `<div class="week-grid">${html}</div>`;
    cal.onclick = (e) => {
      const ev = e.target.closest('[data-ap]');
      if (ev) return detail(ev.dataset.ap);
      const s = e.target.closest('[data-slot]');
      if (s && !s.classList.contains('closed')) { const [f, h] = s.dataset.slot.split('|'); edit(null, { fecha: f, hora: h }); }
    };
  }

  function listView() {
    const list = apps().filter((a) => a.fecha >= iso(addDays(new Date(), -7))).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
    const cal = document.getElementById('cal');
    cal.innerHTML = list.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Servicio</th><th>Cliente</th><th class="hide-sm">Canal</th><th>Estado</th></tr></thead><tbody>
      ${list.map((a) => `<tr class="clickable" data-ap="${a.id}"><td class="nowrap"><strong>${esc(fmt.date(a.fecha, 'short'))}</strong> ${a.hora}</td><td>${esc(svcName(a))}</td><td>${esc(ctName(a))}</td><td class="hide-sm">${esc(a.canal)}</td><td>${badge('cita', a.estado)}</td></tr>`).join('')}</tbody></table></div>`
      : `<div class="card-body">${ui.emptyState({ icon: 'calendar', title: 'Sin citas', text: 'No hay citas con el filtro seleccionado.' })}</div>`;
    cal.onclick = (e) => { const r = e.target.closest('[data-ap]'); if (r) detail(r.dataset.ap); };
  }

  function bindHead() {
    const step = (n) => { if (view === 'semana') weekStart = addDays(weekStart, 7 * n); else cursor.setMonth(cursor.getMonth() + n); render(); };
    document.getElementById('prev').onclick = () => step(-1);
    document.getElementById('next').onclick = () => step(1);
    document.getElementById('today').onclick = () => { cursor = new Date(); cursor.setDate(1); weekStart = startOfWeek(new Date()); render(); };
    document.getElementById('status').onchange = (e) => { statusFilter = e.target.value; render(); };
    document.querySelectorAll('[data-view]').forEach((b) => b.onclick = () => { view = b.dataset.view; render(); });
  }

  function dayPanel(day) {
    const list = db.get('appointments').filter((a) => a.fecha === day).sort((a, b) => a.hora.localeCompare(b.hora));
    const free = db.get('services').filter((s) => s.activo).map((s) => ({ s, n: bot.slots(s.id, day).filter((x) => x.libre).length }));
    const d = ui.drawer({
      title: fmt.date(day, 'weekday'),
      body: `${list.length ? `<div class="list-rows card">${list.map((a) => `<div class="list-row clickable" data-ap="${a.id}"><strong class="mono">${a.hora}</strong><div class="grow"><strong>${esc(svcName(a))}</strong><small>${esc(ctName(a))} · ${esc(a.canal)}</small></div>${badge('cita', a.estado)}</div>`).join('')}</div>` : ui.emptyState({ icon: 'calendar', title: 'Sin citas este día' })}
        <h4 class="mt-3 mb-1">Disponibilidad</h4>
        <div class="stack">${free.map(({ s, n }) => `<div class="meter-row"><span>${esc(s.nombre)} (${s.duracion} min)</span><strong>${n ? `${n} horarios libres` : 'Sin horarios'}</strong></div>`).join('')}</div>`,
      actions: [{ label: 'Nueva cita este día', kind: 'btn-primary', icon: 'plus', onClick: ({ close }) => { close(); edit(null, { fecha: day }); } }]
    });
    d.body.onclick = (e) => { const r = e.target.closest('[data-ap]'); if (r) { d.close(); detail(r.dataset.ap); } };
  }

  function detail(id) {
    const a = db.find('appointments', id);
    if (!a) return;
    const ct = db.contact(a.contactId) || {};
    const sv = db.service(a.servicioId) || { nombre: 'Servicio', duracion: 30, precio: 0 };
    const set = (estado, msg) => { db.update('appointments', (arr) => { arr.find((x) => x.id === id).estado = estado; return arr; }); ui.toast(msg, `${sv.nombre} · ${ct.nombre}`, 'ok'); m.close(); render(); };
    const m = ui.modal({
      title: sv.nombre, subtitle: `${fmt.date(a.fecha, 'weekday')} · ${a.hora} (${sv.duracion} min)`, size: '',
      body: `<dl class="kv">
          <dt>Cliente</dt><dd><a href="crm.html#${ct.id}">${esc(ct.nombre)}</a></dd>
          <dt>Mascota</dt><dd>${esc(ct.mascota || '—')}</dd>
          <dt>Teléfono</dt><dd>${esc(ct.telefono || '—')}</dd>
          <dt>Estado</dt><dd>${badge('cita', a.estado)}</dd>
          <dt>Canal</dt><dd>${esc(a.canal)}</dd>
          <dt>Precio</dt><dd>${sv.precio ? fmt.money(sv.precio) : 'Sin costo'}</dd>
          <dt>Recordatorio</dt><dd>${a.recordatorio ? 'Enviado (simulado)' : 'No enviado'}</dd>
          <dt>Notas</dt><dd>${esc(a.notas || '—')}</dd>
        </dl>
        <div class="btn-group mt-3">
          ${a.estado === 'pendiente' ? `<button class="btn btn-soft btn-sm" data-a="confirmada">${icon('check', 'sm')}Confirmar</button>` : ''}
          ${['pendiente', 'confirmada'].includes(a.estado) ? `<button class="btn btn-sm" data-a="completada">${icon('checkCircle', 'sm')}Marcar completada</button><button class="btn btn-sm" data-a="no_asistio">${icon('x', 'sm')}No asistió</button>` : ''}
          ${a.estado !== 'cancelada' ? `<button class="btn btn-danger btn-sm" data-a="cancelada">${icon('trash', 'sm')}Cancelar</button>` : `<button class="btn btn-sm" data-a="pendiente">${icon('refresh', 'sm')}Reactivar</button>`}
        </div>`,
      actions: [
        { label: 'Enviar recordatorio', icon: 'bell', onClick: () => { remind(a); return false; } },
        { label: 'Editar / reprogramar', icon: 'edit', onClick: ({ close }) => { close(); edit(a); } }
      ]
    });
    m.body.querySelectorAll('[data-a]').forEach((b) => b.onclick = () => set(b.dataset.a, `Cita: ${WAB.STATUS.cita[b.dataset.a][0].toLowerCase()}`));
  }

  function remind(a) {
    const ct = db.contact(a.contactId);
    const conv = db.get('conversations').find((c) => c.contactId === a.contactId);
    const tpl = db.get('templates').find((t) => t.nombre === 'recordatorio_cita');
    const text = tpl ? tpl.cuerpo.replace('{{1}}', ct.nombre.split(' ')[0]).replace('{{2}}', ct.mascota || 'su mascota').replace('{{3}}', a.hora) : `Recordatorio de su cita el ${a.fecha} a las ${a.hora}.`;
    db.update('appointments', (arr) => { arr.find((x) => x.id === a.id).recordatorio = true; return arr; });
    if (conv) db.update('conversations', (arr) => { const c = arr.find((x) => x.id === conv.id); c.mensajes.push({ id: ui.uid('wamid'), from: 'bot', ts: new Date().toISOString(), payload: WAB.bot.M.buttons(text, [['rc:ok', 'Confirmar'], ['rc:re', 'Reprogramar']], { header: 'Recordatorio de cita', footer: 'Plantilla: recordatorio_cita' }) }); c.actualizado = new Date().toISOString(); return arr; });
    ui.toast('Recordatorio enviado (simulación)', conv ? 'Se agregó al historial de la conversación.' : 'El cliente no tiene conversación abierta: se usaría una plantilla aprobada.', 'ok', 5000);
  }

  function edit(a, preset = {}) {
    const services = db.get('services').filter((s) => s.activo || (a && s.id === a.servicioId));
    const contacts = db.get('contacts');
    const v = Object.assign({ servicioId: services[0] && services[0].id, contactId: '', fecha: today, hora: '', estado: db.get('settings').agenda.autoConfirmar ? 'confirmada' : 'pendiente', canal: 'Presencial', notas: '' }, a || {}, preset);
    const fields = [
      { name: 'contactId', label: 'Cliente', type: 'select', required: true, full: true, placeholderOption: 'Elija un cliente', options: contacts.map((c) => ({ value: c.id, label: `${c.nombre}${c.mascota ? ` (${c.mascota})` : ''}` })) },
      { name: 'servicioId', label: 'Servicio', type: 'select', required: true, options: services.map((s) => ({ value: s.id, label: `${s.nombre} · ${s.duracion} min` })) },
      { name: 'fecha', label: 'Fecha', type: 'date', required: true },
      { name: 'hora', label: 'Horario disponible', type: 'select', required: true, options: [], full: true },
      { name: 'estado', label: 'Estado', type: 'select', options: Object.entries(WAB.STATUS.cita).map(([k, l]) => ({ value: k, label: l[0] })) },
      { name: 'canal', label: 'Canal', type: 'select', options: ['WhatsApp', 'Presencial', 'Teléfono'] },
      { name: 'notas', label: 'Notas', type: 'textarea', full: true, rows: 2 }
    ];
    ui.formModal({
      title: a ? 'Editar cita' : 'Nueva cita', fields, values: v, submitLabel: a ? 'Guardar' : 'Crear cita',
      onOpen: (el) => {
        const sel = el.querySelector('[name="hora"]');
        const fill = () => {
          const sid = el.querySelector('[name="servicioId"]').value;
          const f = el.querySelector('[name="fecha"]').value;
          const sl = f ? bot.slots(sid, f, a && a.id) : [];
          const keep = sel.value || v.hora;
          sel.innerHTML = sl.length ? sl.map((s) => `<option value="${s.hora}" ${s.libre ? '' : 'disabled'} ${s.hora === keep ? 'selected' : ''}>${s.hora}${s.libre ? '' : ' (ocupado)'}</option>`).join('') : '<option value="">Sin horarios (día cerrado o fecha inválida)</option>';
          if (sel.selectedOptions[0] && sel.selectedOptions[0].disabled) { const firstFree = sl.find((s) => s.libre); sel.value = firstFree ? firstFree.hora : ''; }
        };
        el.querySelector('[name="servicioId"]').addEventListener('change', fill);
        el.querySelector('[name="fecha"]').addEventListener('change', fill);
        fill();
      },
      onSubmit: (vals) => {
        if (!vals.hora) return 'No hay horario disponible para esa fecha.';
        const rec = Object.assign({ id: (a && a.id) || ui.uid('ap'), recordatorio: (a && a.recordatorio) || false, creado: (a && a.creado) || new Date().toISOString() }, vals);
        db.upsert('appointments', rec);
        ui.toast(a ? 'Cita actualizada' : 'Cita creada', `${svcName(rec)} · ${fmt.date(rec.fecha, 'short')} ${rec.hora}`, 'ok');
        const d = ui.toDate(rec.fecha); cursor = new Date(d.getFullYear(), d.getMonth(), 1); weekStart = startOfWeek(d);
        render();
        return true;
      }
    });
  }

  function renderSettings() {
    main.innerHTML = '<div id="ed-h"></div><div id="ed-s"></div><div id="ed-f"></div>';
    agendaEditors.services(document.getElementById('ed-s'));
    agendaEditors.hours(document.getElementById('ed-h'));
    agendaEditors.flow(document.getElementById('ed-f'));
  }

  document.querySelector('.tabs').onclick = (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    tab = b.dataset.tab;
    document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === b));
    render();
  };
  document.getElementById('new').onclick = () => edit(null);
  phone = new WAB.Phone(document.getElementById('phone'), { compact: true, quick: ['Quiero agendar', 'Mis citas', 'Menú'], autoStart: false, onAfter: () => { if (tab === 'agenda') render(); } });
  if (!phone.bot.conv().mensajes.length) phone.start();
  document.getElementById('sim-book').onclick = async () => { await phone.restart(); phone.send({ kind: 'reply', id: 'act:book', title: 'Agendar una cita' }); };
  db.on('*', (v, src) => { if (src === 'external') render(); });

  render();
  const h = location.hash.slice(1);
  if (h && db.find('appointments', h)) { const a = db.find('appointments', h); const d = ui.toDate(a.fecha); cursor = new Date(d.getFullYear(), d.getMonth(), 1); render(); detail(h); }
})();
