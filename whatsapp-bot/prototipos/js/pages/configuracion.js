/* Configuración: negocio, conexión WhatsApp Cloud API (simulada), asesores, agenda, tienda y datos de demostración. */
(function () {
  const { icon, ui, db, shell, agendaEditors, CONFIG } = window.WAB;
  const { esc, fmt } = ui;
  const SECTIONS = [
    ['negocio', 'building', 'Negocio'], ['whatsapp', 'whatsapp', 'WhatsApp Cloud API'], ['asesores', 'headset', 'Asesores'],
    ['agenda', 'calendar', 'Agenda y servicios'], ['tienda', 'store', 'Tienda y pagos'], ['bot', 'workflow', 'Bot, menús e IA'], ['datos', 'database', 'Datos de demostración']
  ];
  let sec = SECTIONS.some(([k]) => k === location.hash.slice(1)) ? location.hash.slice(1) : 'negocio';

  shell.view.innerHTML = `
    <div class="page-head"><div><h2>Configuración</h2><p class="muted">Ajustes de la cuenta. Todo se guarda en este navegador y se refleja en los demás prototipos.</p></div></div>
    <div class="settings-layout"><nav class="settings-nav" id="nav">${SECTIONS.map(([k, ic, l]) => `<button data-s="${k}">${icon(ic, 'sm')}${l}</button>`).join('')}</nav><div id="body" class="stack"></div></div>`;
  const $ = (id) => document.getElementById(id);

  function formCard(title, fields, values, onSave, extra = '') {
    $('body').innerHTML = `<div class="card"><div class="card-head"><h3>${esc(title)}</h3></div><div class="card-body"><form class="form-grid" id="f" novalidate>${ui.renderFields(fields, values)}</form></div><div class="card-foot"><button class="btn btn-primary" id="save">${icon('check', 'sm')}Guardar</button></div></div>${extra}`;
    $('save').onclick = () => { const r = ui.validate($('f'), fields); if (r.ok) onSave(r.values); };
  }

  const R = {
    negocio() {
      const n = db.get('settings').negocio;
      formCard('Datos del negocio', [
        { name: 'nombre', label: 'Nombre comercial', required: true, maxlength: 60 },
        { name: 'rubro', label: 'Rubro', maxlength: 60 },
        { name: 'telefono', label: 'Teléfono', type: 'tel', required: true },
        { name: 'correo', label: 'Correo', type: 'email', required: true },
        { name: 'direccion', label: 'Dirección', full: true, required: true },
        { name: 'tipoCambio', label: 'Tipo de cambio (Bs por USD)', type: 'number', min: 1, max: 50, step: 0.01, required: true, hint: 'Se usa para mostrar precios en USD.' },
        { name: 'color', label: 'Color de marca', type: 'color' }
      ], n, (v) => { db.update('settings', (s) => { Object.assign(s.negocio, v); return s; }); ui.toast('Datos guardados', 'El nombre se actualiza en el panel y en el simulador.', 'ok'); });
    },
    whatsapp() {
      const w = db.get('settings').whatsapp;
      const on = w.estado === 'conectado';
      $('body').innerHTML = `
        <div class="conn-status" style="${on ? '' : 'background:var(--danger-soft)'}">${icon(on ? 'checkCircle' : 'alert', 'lg').replace('class="icon lg"', `class="icon lg" style="color:var(${on ? '--ok' : '--danger'})"`)}<div class="grow"><strong>${on ? 'Número conectado (simulación)' : 'Número desconectado'}</strong><br><small class="muted">${esc(w.numero)} · ${esc(w.nombreVisible)} · Calidad: ${esc(w.calidad)} · Límite: ${esc(w.limiteMensajes)}</small></div><span class="sim-label">${icon('info')}Simulado</span></div>
        <div class="card"><div class="card-head"><h3>Credenciales de WhatsApp Cloud API</h3></div><div class="card-body"><form class="form-grid" id="f" novalidate>${ui.renderFields([
          { name: 'numero', label: 'Número empresarial', type: 'tel', required: true },
          { name: 'nombreVisible', label: 'Nombre visible', required: true, maxlength: 40 },
          { name: 'phoneNumberId', label: 'Phone Number ID', required: true, pattern: '^\\d{10,20}$', patternMsg: 'Debe tener entre 10 y 20 dígitos.' },
          { name: 'wabaId', label: 'WhatsApp Business Account ID', required: true, pattern: '^\\d{10,20}$', patternMsg: 'Debe tener entre 10 y 20 dígitos.' }
        ], w)}</form>
        <div class="grid-2 mt-2"><div class="field"><label>URL del webhook</label><div class="row"><input class="input mono" readonly value="${esc(w.webhook)}"><button class="btn btn-icon" id="cp-hook" aria-label="Copiar">${icon('copy', 'sm')}</button></div></div>
        <div class="field"><label>Token de verificación</label><div class="row"><input class="input mono" readonly value="${esc(w.verifyToken)}" id="tok"><button class="btn btn-icon" id="regen" aria-label="Regenerar token">${icon('refresh', 'sm')}</button></div></div></div>
        <p class="small muted mt-2 mb-0">El token de acceso permanente se guarda cifrado en el servidor en producción. Este prototipo no se comunica con Meta.</p></div>
        <div class="card-foot"><button class="btn ${on ? 'btn-danger' : ''}" id="toggle">${on ? 'Desconectar' : 'Conectar'}</button><button class="btn" id="test-msg">${icon('send', 'sm')}Mensaje de prueba</button><button class="btn" id="test">${icon('zap', 'sm')}Probar conexión</button><button class="btn btn-primary" id="save">${icon('check', 'sm')}Guardar</button></div></div>
        <div class="card card-pad"><h4 class="mb-1">Eventos del webhook que procesa la plataforma</h4><div class="chips">${['messages', 'message_status (sent, delivered, read, failed)', 'message_template_status_update', 'flows (nfm_reply)', 'account_update'].map((e) => `<span class="badge">${esc(e)}</span>`).join('')}</div></div>`;
      const fields = [{ name: 'numero', type: 'tel', required: true }, { name: 'nombreVisible', required: true }, { name: 'phoneNumberId', required: true, pattern: '^\\d{10,20}$', patternMsg: 'Debe tener entre 10 y 20 dígitos.' }, { name: 'wabaId', required: true, pattern: '^\\d{10,20}$', patternMsg: 'Debe tener entre 10 y 20 dígitos.' }];
      $('save').onclick = () => { const r = ui.validate($('f'), fields); if (!r.ok) return; db.update('settings', (s) => { Object.assign(s.whatsapp, r.values); return s; }); ui.toast('Credenciales guardadas', '', 'ok'); };
      $('cp-hook').onclick = () => ui.copy(w.webhook);
      $('regen').onclick = () => { const t = `pf_${Math.random().toString(36).slice(2, 12)}`; db.update('settings', (s) => { s.whatsapp.verifyToken = t; return s; }); $('tok').value = t; ui.toast('Token regenerado', 'Actualícelo en la configuración del webhook en Meta.', 'info'); };
      $('test').onclick = async (e) => { await ui.busy(e.currentTarget, 1200); ui.toast(on ? 'Conexión correcta (simulación)' : 'Número desconectado', on ? 'Webhook verificado · latencia 182 ms' : 'Conecte el número primero.', on ? 'ok' : 'warn'); };
      $('toggle').onclick = async () => {
        if (on && !(await ui.confirm({ title: 'Desconectar número', message: 'El bot dejaría de recibir mensajes. Es una simulación y puede volver a conectarlo.', confirmLabel: 'Desconectar', danger: true }))) return;
        db.update('settings', (s) => { s.whatsapp.estado = on ? 'desconectado' : 'conectado'; return s; });
        R.whatsapp();
      };
      $('test-msg').onclick = () => ui.formModal({ title: 'Enviar mensaje de prueba', subtitle: 'Simulación: no se envía a WhatsApp.', fields: [{ name: 'to', label: 'Número de destino', type: 'tel', required: true, full: true, placeholder: '+591 7xxxxxxx' }, { name: 'text', label: 'Mensaje', type: 'textarea', required: true, full: true, value: 'Hola, este es un mensaje de prueba desde la plataforma.' }], submitLabel: 'Enviar', onSubmit: (v) => { ui.toast('Mensaje de prueba enviado (simulación)', `A ${v.to}`, 'ok'); return true; } });
    },
    asesores() {
      const list = db.get('agents');
      const incl = CONFIG.asesores.incluidos;
      $('body').innerHTML = `<div class="card"><div class="card-head"><h3>Asesores (${list.length})</h3><button class="btn btn-primary btn-sm" id="add">${icon('plus', 'sm')}Agregar asesor</button></div>
        <div class="list-rows">${list.map((a) => `<div class="list-row">${ui.avatar(a.nombre)}<div class="grow"><strong>${esc(a.nombre)}</strong><small>${esc(a.rol)} · ${esc(a.correo)}</small></div><span class="badge ${a.estado === 'disponible' ? 'ok' : a.estado === 'ocupada' ? 'warn' : ''}"><span class="dot"></span>${esc(a.estado)}</span><button class="btn btn-ghost btn-icon btn-sm" data-edit="${a.id}" aria-label="Editar">${icon('edit', 'sm')}</button><button class="btn btn-ghost btn-icon btn-sm" data-del="${a.id}" aria-label="Eliminar">${icon('trash', 'sm')}</button></div>`).join('')}</div>
        <div class="card-foot" style="justify-content:flex-start"><span class="small muted">La cotización incluye ${incl} asesores; cada asesor adicional cuesta ${fmt.money(CONFIG.asesores.precioAdicionalMensual)}/mes (referencial).</span></div></div>`;
      const edit = (a) => ui.formModal({ title: a ? 'Editar asesor' : 'Nuevo asesor', fields: [{ name: 'nombre', label: 'Nombre', required: true, full: true }, { name: 'correo', label: 'Correo', type: 'email', required: true }, { name: 'rol', label: 'Rol', type: 'select', options: ['Recepción', 'Ventas', 'Veterinaria', 'Administración', 'Soporte'] }, { name: 'estado', label: 'Estado', type: 'select', options: ['disponible', 'ocupada', 'ausente'] }], values: a || { estado: 'disponible' },
        onSubmit: (v) => { if (db.get('agents').some((x) => x.correo.toLowerCase() === v.correo.toLowerCase() && (!a || x.id !== a.id))) return 'Ya existe un asesor con ese correo.'; db.upsert('agents', Object.assign({ id: (a && a.id) || ui.uid('ag') }, v)); R.asesores(); ui.toast('Asesor guardado', '', 'ok'); return true; } });
      $('add').onclick = () => edit(null);
      $('body').querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => edit(db.agent(b.dataset.edit)));
      $('body').querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
        if (db.get('agents').length <= 1) return ui.toast('Debe quedar al menos un asesor', '', 'warn');
        if (!(await ui.confirm({ title: 'Eliminar asesor', message: 'Sus conversaciones quedarán sin asignar.', confirmLabel: 'Eliminar', danger: true }))) return;
        db.update('conversations', (arr) => { arr.forEach((c) => { if (c.asesor === b.dataset.del) c.asesor = null; }); return arr; });
        db.remove('agents', b.dataset.del); R.asesores();
      });
    },
    agenda() {
      $('body').innerHTML = '<div id="e1"></div><div id="e2"></div><div id="e3"></div>';
      agendaEditors.hours($('e1')); agendaEditors.services($('e2')); agendaEditors.flow($('e3'));
    },
    tienda() {
      const t = db.get('settings').tienda;
      formCard('Tienda, envíos y pagos', [
        { name: 'nombre', label: 'Nombre de la tienda web', required: true },
        { name: 'color', label: 'Color principal', type: 'color' },
        { name: 'slogan', label: 'Frase de portada', full: true, maxlength: 80 },
        { name: 'envio', label: 'Costo de envío (Bs)', type: 'number', min: 0, step: 1, required: true },
        { name: 'envioGratisDesde', label: 'Envío gratis desde (Bs)', type: 'number', min: 0, step: 10, required: true },
        { name: 'banco', label: 'Cuenta asociada al QR', full: true, required: true },
        { name: 'mensajeQR', label: 'Instrucciones de pago', type: 'textarea', full: true, rows: 2, required: true }
      ], t, (v) => { db.update('settings', (s) => { Object.assign(s.tienda, v); return s; }); ui.toast('Tienda actualizada', 'Revise el catálogo web para ver el cambio.', 'ok'); },
      `<div class="card card-pad"><div class="row wrap"><div style="width:120px;padding:8px;background:#fff;border-radius:10px;border:1px solid var(--border)"><img src="${WAB.bot.fakeQR('QR-ESTATICO')}" alt="QR estático de ejemplo"></div><div class="grow"><h4 class="mb-1">QR estático de cobro</h4><p class="small mb-1">En producción se carga la imagen del QR que entrega el banco. Este es un QR de ejemplo no escaneable.</p><button class="btn btn-sm" id="up-qr">${icon('upload', 'sm')}Cargar QR (simulado)</button></div></div></div>`);
      $('up-qr').onclick = () => ui.toast('QR cargado (simulación)', 'No se sube ningún archivo.', 'info');
    },
    bot() {
      const m = db.get('menus');
      const a = db.get('ai');
      $('body').innerHTML = `<div class="grid-2">
        ${[['automatizaciones.html#menus', 'list', 'Menús, opciones y listas', `${m.length} menús configurados`], ['automatizaciones.html#mensajes', 'message', 'Mensajes de bienvenida', db.get('settings').bot.activo ? 'Bot activo' : 'Bot desactivado'], ['automatizaciones.html#respuestas', 'zap', 'Respuestas automáticas', `${db.get('autoReplies').length} reglas`], ['ia.html', 'sparkles', 'Configuración de IA', `${a.nombre} · ${a.activo ? 'activa' : 'inactiva'}`], ['productos.html', 'package', 'Productos y categorías', `${db.get('products').length} productos`], ['calendario.html', 'calendar', 'Servicios y flujo de citas', `${db.get('services').filter((s) => s.activo).length} servicios activos`]].map(([h, ic, t, d]) => `<a class="proto-card" href="${h}"><span class="feature-icon">${icon(ic)}</span><h3>${t}</h3><p>${esc(d)}</p><span class="pc-go">Configurar ${icon('arrowRight', 'sm')}</span></a>`).join('')}
      </div>`;
    },
    datos() {
      const size = new Blob([db.export()]).size;
      $('body').innerHTML = `<div class="card"><div class="card-head"><h3>Datos de demostración</h3><span class="badge">${(size / 1024).toFixed(0)} KB en este navegador</span></div><div class="card-body stack">
        <p class="mb-0">Todos los cambios de los prototipos se guardan en el almacenamiento local de este navegador${WAB.storage.available ? '' : ' (no disponible: se pierden al recargar)'}. Puede exportarlos para continuar la demostración en otro equipo.</p>
        <div class="btn-group"><button class="btn" id="exp">${icon('download', 'sm')}Exportar JSON</button><label class="btn">${icon('upload', 'sm')}Importar JSON<input type="file" accept="application/json,.json" id="imp" hidden></label><button class="btn btn-danger" id="reset">${icon('refresh', 'sm')}Restablecer datos de ejemplo</button></div>
      </div></div>`;
      $('exp').onclick = () => { ui.download(`demo-whatsapp-bot-${fmt.isoDate(new Date())}.json`, db.export(), 'application/json'); ui.toast('Datos exportados', '', 'ok'); };
      $('imp').onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const rd = new FileReader();
        rd.onload = () => { try { db.import(rd.result); ui.toast('Datos importados', file.name, 'ok'); setTimeout(() => location.reload(), 600); } catch (err) { ui.toast('No se pudo importar', err.message, 'danger', 6000); } };
        rd.readAsText(file);
      };
      $('reset').onclick = async () => { if (await ui.confirm({ title: 'Restablecer datos', message: 'Se perderán todos los cambios de la demostración.', confirmLabel: 'Restablecer', danger: true })) { db.reset(); ui.toast('Datos restablecidos', '', 'ok'); setTimeout(() => location.reload(), 500); } };
    }
  };

  function go(k) {
    sec = k;
    history.replaceState(null, '', `#${k}`);
    document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.s === k));
    R[k]();
  }
  $('nav').onclick = (e) => { const b = e.target.closest('[data-s]'); if (b) go(b.dataset.s); };
  go(sec);
})();
