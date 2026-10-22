/*
 * Editores compartidos de la agenda (Calendario y Configuración):
 * horarios laborales, servicios con duración y reglas del flujo de reservas.
 */
(function (root) {
  const WAB = root.WAB;
  const { icon, ui, db } = WAB;
  const { esc, fmt } = ui;
  const DAYS = [[1, 'Lunes'], [2, 'Martes'], [3, 'Miércoles'], [4, 'Jueves'], [5, 'Viernes'], [6, 'Sábado'], [0, 'Domingo']];

  function hours(el, onSave) {
    const h = db.get('settings').agenda.horario;
    el.innerHTML = `<div class="card"><div class="card-head"><h3>Horario laboral</h3></div><div class="card-body">
      ${DAYS.map(([d, n]) => `<div class="hours-row" data-d="${d}"><strong>${n}</strong><label class="switch"><input type="checkbox" data-k="on" ${h[d].on ? 'checked' : ''}><span class="track"></span></label><input class="input input-sm" type="time" data-k="de" value="${h[d].de}" aria-label="${n} desde" ${h[d].on ? '' : 'disabled'}><input class="input input-sm" type="time" data-k="a" value="${h[d].a}" aria-label="${n} hasta" ${h[d].on ? '' : 'disabled'}></div>`).join('')}
      <p class="error-msg" id="hours-err" style="display:none"></p></div>
      <div class="card-foot"><button class="btn btn-primary" data-save>${icon('check', 'sm')}Guardar horario</button></div></div>`;
    el.querySelectorAll('[data-k="on"]').forEach((c) => c.onchange = () => c.closest('.hours-row').querySelectorAll('input[type="time"]').forEach((t) => { t.disabled = !c.checked; }));
    el.querySelector('[data-save]').onclick = () => {
      const next = {};
      let err = '';
      el.querySelectorAll('.hours-row').forEach((r) => {
        const on = r.querySelector('[data-k="on"]').checked;
        const de = r.querySelector('[data-k="de"]').value;
        const a = r.querySelector('[data-k="a"]').value;
        if (on && (!de || !a || de >= a)) err = `Revise el horario del ${DAYS.find(([d]) => String(d) === r.dataset.d)[1].toLowerCase()}: la hora de inicio debe ser menor a la de cierre.`;
        next[r.dataset.d] = { on, de: de || '09:00', a: a || '18:00' };
      });
      const box = el.querySelector('#hours-err');
      box.textContent = err; box.style.display = err ? 'block' : 'none';
      if (err) return;
      db.update('settings', (s) => { s.agenda.horario = next; return s; });
      ui.toast('Horario guardado', 'La disponibilidad del flujo de reservas ya usa este horario.', 'ok');
      if (onSave) onSave();
    };
  }

  function services(el, onSave) {
    const list = db.get('services');
    el.innerHTML = `<div class="card"><div class="card-head"><h3>Servicios y duración</h3><button class="btn btn-primary btn-sm" data-add>${icon('plus', 'sm')}Nuevo servicio</button></div>
      ${list.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Servicio</th><th class="num">Duración</th><th class="num">Precio</th><th>Activo</th><th></th></tr></thead><tbody>
      ${list.map((s) => `<tr><td><strong>${esc(s.nombre)}</strong><br><small class="muted">${esc(s.descripcion || '')}</small></td><td class="num">${s.duracion} min</td><td class="num">${s.precio ? fmt.money(s.precio) : 'Sin costo'}</td><td><label class="switch"><input type="checkbox" data-toggle="${s.id}" ${s.activo ? 'checked' : ''}><span class="track"></span></label></td><td class="nowrap"><button class="btn btn-ghost btn-icon btn-sm" data-edit="${s.id}" aria-label="Editar">${icon('edit', 'sm')}</button><button class="btn btn-ghost btn-icon btn-sm" data-del="${s.id}" aria-label="Eliminar">${icon('trash', 'sm')}</button></td></tr>`).join('')}
      </tbody></table></div>` : `<div class="card-body">${ui.emptyState({ icon: 'calendar', title: 'Sin servicios', text: 'Cree al menos un servicio para habilitar las reservas.' })}</div>`}</div>`;
    const fields = [
      { name: 'nombre', label: 'Nombre', required: true, full: true, maxlength: 40 },
      { name: 'duracion', label: 'Duración (minutos)', type: 'number', min: 5, max: 480, step: 5, required: true },
      { name: 'precio', label: 'Precio (Bs)', type: 'number', min: 0, step: 1, required: true },
      { name: 'descripcion', label: 'Descripción', type: 'textarea', full: true, rows: 2 },
      { name: 'activo', label: 'Disponible para reservas', type: 'checkbox', full: true }
    ];
    const edit = (s) => ui.formModal({ title: s ? 'Editar servicio' : 'Nuevo servicio', fields, values: s || { activo: true, duracion: 30, precio: 0 },
      onSubmit: (v) => { db.upsert('services', Object.assign({ id: (s && s.id) || ui.uid('svc') }, v)); services(el, onSave); if (onSave) onSave(); ui.toast('Servicio guardado', '', 'ok'); return true; } });
    el.querySelector('[data-add]').onclick = () => edit(null);
    el.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => edit(db.service(b.dataset.edit)));
    el.querySelectorAll('[data-toggle]').forEach((c) => c.onchange = () => { db.update('services', (arr) => { arr.find((x) => x.id === c.dataset.toggle).activo = c.checked; return arr; }); if (onSave) onSave(); });
    el.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
      const used = db.get('appointments').some((a) => a.servicioId === b.dataset.del);
      if (used) { ui.toast('No se puede eliminar', 'El servicio tiene citas registradas. Desactívelo en su lugar.', 'warn'); return; }
      if (!(await ui.confirm({ title: 'Eliminar servicio', message: 'Dejará de mostrarse en el flujo de reservas.', confirmLabel: 'Eliminar', danger: true }))) return;
      db.remove('services', b.dataset.del); services(el, onSave); if (onSave) onSave();
    });
  }

  function flow(el) {
    const a = db.get('settings').agenda;
    const fields = [
      { name: 'intervalo', label: 'Intervalo entre horarios (min)', type: 'select', options: [15, 20, 30, 60].map((n) => ({ value: n, label: `${n} minutos` })) },
      { name: 'anticipacionHoras', label: 'Anticipación mínima (horas)', type: 'number', min: 0, max: 72, required: true },
      { name: 'diasMaximos', label: 'Reservas hasta (días)', type: 'number', min: 1, max: 90, required: true },
      { name: 'autoConfirmar', label: 'Confirmar automáticamente las reservas', type: 'checkbox' },
      { name: 'recordatorio24', label: 'Recordatorio 24 h antes (plantilla)', type: 'checkbox' },
      { name: 'recordatorio2', label: 'Recordatorio 2 h antes', type: 'checkbox' },
      { name: 'pedirNotas', label: 'Pedir notas o motivo de la consulta', type: 'checkbox' }
    ];
    el.innerHTML = `<div class="card"><div class="card-head"><h3>Flujo de reservas (WhatsApp Flows)</h3></div><div class="card-body"><form class="form-grid" novalidate>${ui.renderFields(fields, a)}</form>
      <div class="flow-map mt-2"><span class="fm-node menu">Servicio</span>${icon('arrowRight', 'sm')}<span class="fm-node">Fecha disponible</span>${icon('arrowRight', 'sm')}<span class="fm-node">Horario libre</span>${icon('arrowRight', 'sm')}<span class="fm-node">Datos del cliente</span>${icon('arrowRight', 'sm')}<span class="fm-node menu">${a.autoConfirmar ? 'Confirmada' : 'Pendiente'}</span></div></div>
      <div class="card-foot"><button class="btn btn-primary" data-save>${icon('check', 'sm')}Guardar reglas</button></div></div>`;
    el.querySelector('[data-save]').onclick = () => {
      const r = ui.validate(el.querySelector('form'), fields);
      if (!r.ok) return;
      r.values.intervalo = Number(r.values.intervalo);
      db.update('settings', (s) => { Object.assign(s.agenda, r.values); return s; });
      ui.toast('Reglas guardadas', '', 'ok');
      flow(el);
    };
  }

  WAB.agendaEditors = { hours, services, flow, DAYS };
})(window);
