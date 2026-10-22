/* Simulador de WhatsApp: teléfono interactivo, escenarios rápidos, demos por sector e inspector de payloads. */
(function () {
  const { icon, ui, db, shell, SECTORS } = window.WAB;
  const { esc, fmt } = ui;

  shell.view.innerHTML = `
    <div class="page-head">
      <div><h2>Simulador de WhatsApp</h2><p class="muted">Pruebe la experiencia del cliente. Los mensajes respetan los tipos de la WhatsApp Cloud API (texto, botones, listas, producto, flujos e imagen).</p></div>
      <span class="sim-label">${icon('info')}Simulación</span>
    </div>
    <div class="split phone-first">
      <div class="stack">
        <div class="card">
          <div class="card-head"><h3>Escenarios rápidos</h3><button class="btn btn-sm" id="restart">${icon('refresh', 'sm')}Reiniciar chat</button></div>
          <div class="card-body"><div class="chips" id="scenarios"></div><p class="small muted mt-2 mb-0">También puede escribir libremente: el bot usa respuestas automáticas y la IA simulada cuando no reconoce una opción.</p></div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Demostración por sector</h3><span class="badge info" id="biz-name"></span></div>
          <div class="card-body">
            <div class="row wrap">
              <select class="select grow" id="sector" aria-label="Sector"><option value="">Negocio de ejemplo (veterinaria y pet shop)</option>${SECTORS.map((s) => `<option value="${s.id}">${esc(s.nombre)} · ${esc(s.preset.negocio)}</option>`).join('')}</select>
              <button class="btn btn-primary" id="apply-sector">Cargar</button>
            </div>
            <p class="small muted mt-1 mb-0">Cambia nombre, bienvenida, servicios y preguntas frecuentes. Los productos de la tienda se mantienen.</p>
          </div>
        </div>
        <div class="grid-2">
          <div class="card">
            <div class="card-head"><h3>Estado de la sesión</h3></div>
            <div class="card-body" id="session"></div>
          </div>
          <div class="card">
            <div class="card-head"><h3>Tipos de mensaje</h3></div>
            <div class="card-body type-legend">
              <div><code>text</code>Texto con formato</div>
              <div><code>interactive.button</code>Hasta 3 botones de respuesta</div>
              <div><code>interactive.list</code>Lista con secciones (hasta 10 filas)</div>
              <div><code>interactive.product</code>Producto del catálogo</div>
              <div><code>interactive.flow</code>Formulario (WhatsApp Flows)</div>
              <div><code>image</code>Imagen (QR de pago)</div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Inspector del último mensaje</h3><span class="small muted" id="payload-meta"></span></div>
          <div class="card-body"><pre class="payload" id="payload">Envíe un mensaje para ver su estructura.</pre><p class="small muted mt-1 mb-0">Estructura conceptual equivalente a la que enviaría la plataforma a la API oficial; en este prototipo no se envía nada a Meta.</p></div>
        </div>
      </div>
      <div class="phone-col"><div id="phone"></div><p class="phone-caption">Use los botones, abra las listas y complete el formulario de reserva.</p></div>
    </div>`;

  const showPayload = (m) => {
    const p = Object.assign({}, m.payload);
    delete p._ref; delete p._ai;
    const wrapped = m.from === 'user'
      ? { object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: { messages: [Object.assign({ from: '59170000001', id: m.id, timestamp: String(Math.floor(new Date(m.ts) / 1000)) }, p)] } }] }] }
      : Object.assign({ messaging_product: 'whatsapp', recipient_type: 'individual', to: '59170000001' }, p);
    document.getElementById('payload').textContent = JSON.stringify(wrapped, null, 2);
    document.getElementById('payload-meta').textContent = m.from === 'user' ? 'Webhook entrante' : `POST /messages · ${p.type}${p.interactive ? `.${p.interactive.type}` : ''}`;
    if (m.payload._ai) document.getElementById('payload-meta').textContent += ` · IA: ${m.payload._ai.source} (${m.payload._ai.confidence}%)`;
  };

  const phone = new WAB.Phone(document.getElementById('phone'), { onPayload: showPayload, onAfter: renderSession });

  const SCEN = [
    ['Iniciar', { kind: 'text', text: 'Hola' }],
    ['Agendar cita', { kind: 'reply', id: 'act:book', title: 'Agendar una cita' }],
    ['Servicios', { kind: 'reply', id: 'act:services', title: 'Servicios y precios' }],
    ['Ver productos', { kind: 'reply', id: 'act:products', title: 'Tienda de mascotas' }],
    ['Ver carrito', { kind: 'reply', id: 'act:cart', title: 'Mi carrito' }],
    ['Preguntar a la IA', { kind: 'text', text: '¿Cuánto tarda el envío a domicilio?' }],
    ['IA con memoria', { kind: 'text', text: 'Me llamo Ana' }],
    ['Mis citas y pedidos', { kind: 'reply', id: 'act:orders', title: 'Mis citas y pedidos' }],
    ['Solicitar asesor', { kind: 'reply', id: 'act:agent', title: 'Hablar con un asesor' }],
    ['Volver al menú', { kind: 'text', text: 'menú' }]
  ];
  document.getElementById('scenarios').innerHTML = SCEN.map(([l], i) => `<button class="chip" data-s="${i}">${esc(l)}</button>`).join('');
  document.getElementById('scenarios').addEventListener('click', (e) => {
    const b = e.target.closest('[data-s]');
    if (b) phone.send(SCEN[Number(b.dataset.s)][1]);
  });
  document.getElementById('restart').onclick = () => phone.restart().then(renderSession);

  function renderSession() {
    const c = phone.bot.conv();
    const s = phone.bot.session();
    const n = s.carrito.reduce((t, x) => t + x.cantidad, 0);
    const nav = db.get('navLog').filter((l) => l.conv === c.id).slice(0, 4);
    document.getElementById('session').innerHTML = `
      <dl class="kv">
        <dt>Atención</dt><dd>${WAB.badge('conv', c.estado)}</dd>
        <dt>Carrito</dt><dd>${n ? `${n} producto${n > 1 ? 's' : ''} · ${fmt.money(s.carrito.reduce((t, x) => t + x.precio * x.cantidad, 0))}` : 'Vacío'}</dd>
        <dt>Memoria IA</dt><dd>${s.memoria && s.memoria.nombre ? esc(s.memoria.nombre) : '—'}</dd>
        <dt>Mensajes IA</dt><dd>${s.iaCount || 0} / ${db.get('ai').limites.porConversacion}</dd>
        <dt>Esperando</dt><dd>${s.esperando ? esc(s.esperando) : s.pedidoPendiente ? 'comprobante de pago' : '—'}</dd>
      </dl>
      <h4 class="label mt-2 mb-1">Navegación reciente</h4>
      ${nav.length ? `<ul class="check-list compact">${nav.map((l) => `<li>${icon('chevronRight', 'sm')}<span>${esc(l.accion)} <small class="muted">${esc(fmt.time(l.ts))}</small></span></li>`).join('')}</ul>` : '<p class="small muted mb-0">Sin navegación todavía.</p>'}
      <a class="btn btn-sm mt-2" href="conversaciones.html#${c.id}">${icon('messages', 'sm')}Ver en la bandeja</a>`;
    document.getElementById('biz-name').textContent = db.get('settings').negocio.nombre;
  }

  // Demos por sector
  function applySector(id) {
    const seed = WAB.seed();
    const sec = SECTORS.find((s) => s.id === id);
    db.update('settings', (st) => {
      if (sec) {
        st.negocio.nombre = sec.preset.negocio; st.negocio.rubro = sec.preset.rubro;
        st.bot.bienvenida = sec.preset.bienvenida; st.whatsapp.nombreVisible = sec.preset.negocio;
      } else {
        st.negocio = seed.settings.negocio; st.bot = seed.settings.bot; st.whatsapp = seed.settings.whatsapp;
      }
      return st;
    });
    // Los servicios anteriores quedan inactivos para no romper citas existentes.
    const fresh = sec ? sec.preset.servicios.map((s, i) => Object.assign({ id: `svc_${id}_${i}`, descripcion: `${s.nombre} en ${sec.preset.negocio}.`, activo: true }, s)) : seed.services;
    const ids = fresh.map((s) => s.id);
    db.set('services', fresh.concat(db.get('services').filter((s) => !ids.includes(s.id)).map((s) => Object.assign({}, s, { activo: false }))));
    db.update('ai', (a) => { a.faqs = sec ? sec.preset.faqs.map((f, i) => Object.assign({ id: `fq_${id}_${i}` }, f)) : seed.ai.faqs; a.empresa = sec ? `${sec.preset.negocio} (${sec.preset.rubro}). ${sec.preset.faqs.map((f) => f.respuesta).join(' ')}` : seed.ai.empresa; return a; });
    db.update('menus', (menus) => {
      const main = menus.find((m) => m.id === 'main');
      if (main) main.encabezado = sec ? sec.preset.negocio : seed.menus[0].encabezado;
      return menus;
    });
    phone.setName(db.get('settings').negocio.nombre);
    return phone.restart().then(() => { renderSession(); ui.toast(sec ? `Demo: ${sec.nombre}` : 'Negocio de ejemplo restaurado', sec ? sec.preset.negocio : 'Patitas Felices', 'ok'); });
  }
  document.getElementById('apply-sector').onclick = () => applySector(document.getElementById('sector').value);

  const params = new URLSearchParams(location.search);
  if (params.get('sector') && SECTORS.find((s) => s.id === params.get('sector'))) {
    document.getElementById('sector').value = params.get('sector');
    applySector(params.get('sector'));
    history.replaceState(null, '', location.pathname);
  }
  renderSession();
})();
