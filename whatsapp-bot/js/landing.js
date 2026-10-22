/* Landing: beneficios, diagrama, sectores con demostración, módulos y planes. */
(function () {
  const { icon, ui, MODULES, PLANS, SECTORS, CONFIG } = window.WAB;
  const { esc, fmt } = ui;

  const BENEFITS = [
    { i: 'clock', t: 'Atención automatizada 24/7', d: 'Responde al instante, también de noche, feriados y fines de semana.' },
    { i: 'list', t: 'Menús y listas interactivas', d: 'Botones y listas nativas de WhatsApp para guiar al cliente sin escribir.', c: 'info' },
    { i: 'sparkles', t: 'IA para consultas', d: 'Entiende preguntas en texto libre y responde con la información de su negocio.', c: 'accent' },
    { i: 'headset', t: 'Chat con asesores humanos', d: 'Su equipo toma la conversación cuando hace falta y la devuelve al bot.', c: 'warn' },
    { i: 'calendar', t: 'Gestión de citas', d: 'Reservas con disponibilidad real, recordatorios y reprogramaciones.' },
    { i: 'package', t: 'Catálogo de productos', d: 'Productos con fotos, precios, variantes y stock dentro del chat.', c: 'info' },
    { i: 'cart', t: 'Ventas y pedidos', d: 'Carrito, cobro con QR, comprobantes y seguimiento de entrega.', c: 'accent' },
    { i: 'users', t: 'CRM', d: 'Fichas de clientes con historial, etiquetas y etapa comercial.', c: 'warn' },
    { i: 'bars', t: 'Estadísticas', d: 'Conversaciones, tiempos de respuesta, citas y ventas en tableros claros.' },
    { i: 'settings', t: 'Configuración sin programación', d: 'Cambie menús, respuestas y precios desde el panel, sin depender de nadie.', c: 'info' }
  ];

  document.getElementById('benefits').innerHTML = BENEFITS.map((b) => `
    <article class="feature reveal">
      <div class="feature-icon ${b.c || ''}">${icon(b.i)}</div>
      <h3>${esc(b.t)}</h3><p>${esc(b.d)}</p>
    </article>`).join('');

  // Diagrama de funcionamiento
  const nodes = [
    { i: 'user', t: 'Cliente', d: 'Escribe a su número de WhatsApp' },
    { i: 'whatsapp', t: 'WhatsApp Cloud API', d: 'Meta entrega el mensaje por webhook' },
    { i: 'bot', t: 'Motor de la plataforma', d: 'Menús, IA, citas, pedidos y reglas' },
    { i: 'headset', t: 'Su equipo', d: 'Bandeja compartida para asesores' },
    { i: 'bars', t: 'Panel y reportes', d: 'CRM, ventas y estadísticas' }
  ];
  document.getElementById('flow-diagram').innerHTML = nodes.map((n, idx) => `
    <div class="flow-node${idx === 2 ? ' core' : ''}">
      <div class="feature-icon${idx === 2 ? '' : ' info'}">${icon(n.i)}</div>
      <strong>${esc(n.t)}</strong><small>${esc(n.d)}</small>
    </div>${idx < nodes.length - 1 ? `<div class="flow-arrow" aria-hidden="true">${icon('arrowRight')}</div>` : ''}`).join('');

  // Teléfono del hero
  const heroPhone = document.getElementById('hero-phone');
  heroPhone.innerHTML = WAB.wa.frame({ name: 'Clínica San Gabriel', subtitle: 'en línea' });
  WAB.wa.play(heroPhone, SECTORS[0].guion, { loop: true });

  // Sectores
  const tabs = document.getElementById('sector-tabs');
  const panel = document.getElementById('sector-panel');
  let stopPlay = null;
  tabs.innerHTML = SECTORS.map((s, i) => `
    <button class="sector-tab${i === 0 ? ' active' : ''}" role="tab" aria-selected="${i === 0}" data-id="${s.id}">
      <span class="feature-icon ${s.tono === 'brand' ? '' : s.tono}">${icon(s.icon, 'sm')}</span>${esc(s.nombre)}
    </button>`).join('');

  function showSector(id) {
    const s = SECTORS.find((x) => x.id === id);
    tabs.querySelectorAll('.sector-tab').forEach((b) => {
      const on = b.dataset.id === id;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    const plan = PLANS.find((p) => p.id === s.plan);
    panel.innerHTML = `
      <div class="sector-panel">
        <div>
          <span class="badge">${esc(s.nombre)}</span>
          <h3 class="mt-2">${esc(s.titulo)}</h3>
          <p>${esc(s.resumen)}</p>
          <ul class="check-list">${s.beneficios.map((b) => `<li>${icon('check', 'sm')}<span>${esc(b)}</span></li>`).join('')}</ul>
          <div class="mt-3">
            <span class="label">Módulos recomendados</span>
            <div class="chips mt-1">${s.modulos.map((m) => `<span class="badge info">${esc(MODULES.byId(m).corto)}</span>`).join('')}</div>
          </div>
          <p class="small muted mt-2">Plan sugerido: <strong>${esc(plan.nombre)}</strong> · ${plan.desde ? 'desde ' : ''}${fmt.money(plan.mensual)}/mes</p>
          <div class="btn-group mt-2">
            <a class="btn btn-primary" href="prototipos/whatsapp.html?sector=${s.id}">${icon('play', 'sm')}Probar en el simulador</a>
            <a class="btn" href="cotizador.html?modulos=${s.modulos.join(',')}">Cotizar estos módulos</a>
          </div>
        </div>
        <div class="phone compact wa" id="sector-phone"></div>
      </div>`;
    const phone = panel.querySelector('#sector-phone');
    phone.innerHTML = WAB.wa.frame({ name: s.preset.negocio, subtitle: 'en línea' });
    if (stopPlay) stopPlay();
    stopPlay = WAB.wa.play(phone, s.guion, { loop: true, speed: 1.15 });
  }
  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('.sector-tab');
    if (b) showSector(b.dataset.id);
  });
  showSector(SECTORS[0].id);

  // Módulos
  document.getElementById('module-mini').innerHTML = MODULES.MODULES.map((m) => `
    <a class="module-mini reveal" href="modulos.html#${m.id}">
      <div class="feature-icon">${icon(m.icon)}</div>
      <div class="grow"><span class="mc-code">${m.codigo}</span><strong>${esc(m.nombre)}</strong><small>${esc(m.descripcion)}</small></div>
      <span class="mm-price">${fmt.money(m.mensual)}<small>/mes</small></span>
    </a>`).join('');

  // Planes
  document.getElementById('plan-mini').innerHTML = PLANS.map((p) => `
    <div class="plan-mini reveal${p.destacado ? ' featured' : ''}">
      ${p.destacado ? '<span class="badge solid">Más elegido</span>' : ''}
      <h3>${esc(p.nombre)}</h3>
      <p class="small">${esc(p.lema)}</p>
      <div class="pm-price">${p.desde ? '<small>Desde</small>' : ''}${fmt.money(p.mensual)}<small>/mes</small></div>
      <a class="btn btn-sm ${p.destacado ? 'btn-primary' : ''}" href="planes.html#${p.id}">Ver plan</a>
    </div>`).join('');

  document.getElementById('sim-note').textContent = CONFIG.notaPrototipos;
})();
