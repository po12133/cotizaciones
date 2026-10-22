/* Índice de prototipos: acceso a cada demostración y a la gestión de datos de ejemplo. */
(function () {
  const { icon, ui, db, shell, CONFIG } = window.WAB;
  const { esc } = ui;

  const PROTOS = [
    { id: 'whatsapp', t: 'Simulador de WhatsApp', d: 'Converse con el bot: menús, listas, flujos de reserva, IA, carrito, pago QR y asesor.', m: ['M01', 'M02', 'M04', 'M07'], ic: 'phone', star: true },
    { id: 'dashboard', t: 'Panel general', d: 'Métricas, actividad reciente, conversaciones pendientes, próximas citas y últimos pedidos.', m: ['BASE'], ic: 'home' },
    { id: 'automatizaciones', t: 'Automatizaciones', d: 'Constructor de menús, botones y listas; bienvenida, respuestas automáticas e historial.', m: ['M01'], ic: 'workflow' },
    { id: 'ia', t: 'Inteligencia artificial', d: 'Personalidad, base de conocimiento, preguntas frecuentes, límites y chat de prueba.', m: ['M02'], ic: 'sparkles' },
    { id: 'conversaciones', t: 'Conversaciones', d: 'Bandeja estilo WhatsApp Web: tomar y devolver conversaciones, asignar asesores, notas.', m: ['M03'], ic: 'messages' },
    { id: 'calendario', t: 'Calendario y citas', d: 'Vista mensual y semanal, estados, reprogramación y reserva dentro de WhatsApp.', m: ['M04'], ic: 'calendar' },
    { id: 'crm', t: 'CRM y contactos', d: 'Fichas de clientes con historial, etiquetas, notas, embudo y exportación CSV.', m: ['M05'], ic: 'users' },
    { id: 'productos', t: 'Catálogo de productos', d: 'Productos, categorías, variantes, stock, promociones y envío por WhatsApp.', m: ['M06'], ic: 'package' },
    { id: 'pedidos', t: 'Pedidos', d: 'Estados, validación de comprobantes, entrega o retiro y notificaciones.', m: ['M07'], ic: 'receipt' },
    { id: 'ventas', t: 'Ventas', d: 'Flujo completo: producto, carrito, datos, entrega, pago QR, confirmación y seguimiento.', m: ['M07'], ic: 'wallet' },
    { id: 'campanas', t: 'Campañas', d: 'Plantillas, segmentación, vista previa, programación y estados de entrega simulados.', m: ['M09'], ic: 'megaphone' },
    { id: 'reportes', t: 'Reportes', d: 'Gráficos interactivos de atención, IA vs. humano, citas, ventas y tiempos de respuesta.', m: ['M08'], ic: 'bars' },
    { id: 'tienda', t: 'Catálogo web público', d: 'Tienda móvil con buscador, filtros, variantes y carrito que termina en WhatsApp.', m: ['M10'], ic: 'globe' },
    { id: 'configuracion', t: 'Configuración', d: 'Negocio, conexión de WhatsApp Cloud API, asesores, servicios, horarios y datos.', m: ['BASE'], ic: 'settings' }
  ];

  const c = db.all;
  shell.view.innerHTML = `
    <div class="page-head">
      <div><h2>Prototipos interactivos</h2><p class="muted">Haga clic, escriba, cree registros y cambie estados. Los cambios se guardan en este navegador y se reflejan entre módulos.</p></div>
      <div class="btn-group"><a class="btn btn-primary" href="whatsapp.html">${icon('play', 'sm')}Empezar por el simulador</a><a class="btn" href="../cotizador.html">${icon('file', 'sm')}Cotizar</a></div>
    </div>
    <div class="notice warn">${icon('alert')}<p><strong>Demostración.</strong> ${esc(CONFIG.notaPrototipos)}</p></div>
    <div class="card card-pad">
      <h3 class="mb-1">Recorrido sugerido para la reunión</h3>
      <div class="flow-map">${['Simulador: agendar una cita', 'Calendario: ver la cita creada', 'Simulador: comprar y pagar con QR', 'Pedidos: aprobar el comprobante', 'Simulador: pedir un asesor', 'Conversaciones: responder', 'Reportes'].map((s, i, a) => `<span class="fm-node${i === 0 ? ' menu' : ''}">${i + 1}. ${esc(s)}</span>${i < a.length - 1 ? icon('arrowRight', 'sm') : ''}`).join('')}</div>
    </div>
    <div class="proto-grid">${PROTOS.map((p) => `
      <a class="proto-card" href="${p.id}.html">
        <div class="pc-top"><span class="feature-icon${p.star ? '' : ' info'}">${icon(p.ic)}</span><span class="chips">${p.m.map((m) => `<span class="badge">${m}</span>`).join('')}</span></div>
        <h3>${esc(p.t)}</h3><p>${esc(p.d)}</p>
        <span class="pc-go">Abrir prototipo ${icon('arrowRight', 'sm')}</span>
      </a>`).join('')}</div>
    <div class="grid-2">
      <div class="card card-pad">
        <h3 class="mb-1">Datos de demostración</h3>
        <p class="small">Negocio ficticio <strong>${esc(c.settings.negocio.nombre)}</strong>: ${c.contacts.length} contactos, ${c.products.length} productos, ${c.appointments.length} citas, ${c.orders.length} pedidos y ${c.conversations.length} conversaciones.</p>
        <div class="btn-group"><button class="btn btn-danger" id="reset">${icon('refresh', 'sm')}Restablecer datos de ejemplo</button><a class="btn" href="configuracion.html#datos">${icon('database', 'sm')}Exportar / importar</a></div>
      </div>
      <div class="card card-pad">
        <h3 class="mb-1">Probar con otro rubro</h3>
        <p class="small">Cargue en el simulador el ejemplo de un sector: cambia el nombre del negocio, la bienvenida, los servicios y las preguntas frecuentes.</p>
        <div class="chips">${['clinica', 'gimnasio', 'tienda', 'inmobiliaria', 'instituto', 'agencia', 'profesional'].map((s) => `<a class="chip" href="whatsapp.html?sector=${s}">${esc(s.charAt(0).toUpperCase() + s.slice(1))}</a>`).join('')}</div>
      </div>
    </div>`;

  document.getElementById('reset').onclick = async () => {
    const ok = await ui.confirm({ title: 'Restablecer datos de ejemplo', message: 'Se perderán los cambios hechos en todos los prototipos.', confirmLabel: 'Restablecer', danger: true });
    if (!ok) return;
    db.reset();
    ui.toast('Datos restablecidos', '', 'ok');
    setTimeout(() => location.reload(), 500);
  };
})();
