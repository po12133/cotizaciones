/* Página de planes: tarjetas, modalidad de pago, comparativa y preguntas frecuentes. */
(function () {
  const { icon, ui, MODULES, PLANS, CONFIG, pricing, storage } = window.WAB;
  const { esc, fmt } = ui;
  let period = storage.get('planes-periodo', 'mensual');

  function renderPeriod() {
    document.getElementById('period').innerHTML = CONFIG.periodos.map((p) => `
      <button role="radio" aria-checked="${p.id === period}" class="${p.id === period ? 'active' : ''}" data-p="${p.id}">${esc(p.nombre)}${p.descuento ? `<span class="save">−${p.descuento}%</span>` : ''}</button>`).join('');
  }

  function renderPlans() {
    const per = pricing.periodo(period);
    document.getElementById('plans').innerHTML = PLANS.map((p) => {
      const mensual = pricing.round2(p.mensual * (1 - per.descuento / 100));
      const cmp = pricing.compareWithPlan(p, {});
      return `
      <article class="plan-card${p.destacado ? ' featured' : ''}" id="${p.id}">
        ${p.destacado ? '<span class="badge solid plan-flag">Más elegido</span>' : ''}
        <h3>${esc(p.nombre)}</h3>
        <p class="plan-lema">${esc(p.lema)}</p>
        <div class="plan-price">
          ${p.desde ? '<small class="from">Desde</small>' : ''}
          <strong>${fmt.money(mensual)}</strong><small>/mes</small>
        </div>
        <p class="plan-sub">${per.meses > 1 ? `${fmt.money(mensual * per.meses)} cada ${per.meses} meses · antes ${fmt.money(p.mensual)}/mes` : 'Facturación mensual'}</p>
        <p class="plan-impl">Implementación ${p.desde ? 'desde ' : ''}<strong>${fmt.money(p.implementacion)}</strong> (pago único)</p>
        <div class="btn-group plan-actions">
          <a class="btn ${p.destacado ? 'btn-primary' : 'btn-dark'} btn-block" href="cotizador.html?plan=${p.id}">${icon('settings', 'sm')}Personalizar plan</a>
        </div>
        <span class="label">Incluye</span>
        <ul class="check-list compact">${p.incluye.map((x) => `<li>${icon('check', 'sm')}<span>${esc(x)}</span></li>`).join('')}</ul>
        <span class="label mt-1">Límites</span>
        <dl class="plan-limits">
          <div><dt>Asesores</dt><dd>${p.limites.asesores}</dd></div>
          <div><dt>Contactos/mes</dt><dd>${esc(p.limites.contactos)}</dd></div>
          <div><dt>Menús</dt><dd>${esc(p.limites.menus)}</dd></div>
          <div><dt>Productos</dt><dd>${esc(p.limites.productos)}</dd></div>
          <div><dt>Soporte</dt><dd>${esc(p.limites.soporte)}</dd></div>
        </dl>
        <p class="plan-ideal">${icon('target', 'sm')}${esc(p.ideal)}</p>
        ${cmp.diferenciaMensual > 0 ? `<p class="plan-save">${icon('trendDown', 'sm')}${fmt.money(cmp.diferenciaMensual)}/mes menos que por módulos</p>` : ''}
      </article>`;
    }).join('');
    document.getElementById('plans-note').textContent = `Precios referenciales en bolivianos. Los descuentos por modalidad aplican solo a la suscripción. No incluye costos de Meta, IA ni otros servicios externos.`;
  }

  function renderCompare() {
    const rows = MODULES.ALL.map((m) => `<tr><td><span class="mc-code">${m.codigo}</span> ${esc(m.nombre)}</td>${PLANS.map((p) => {
      const on = m.obligatorio || pricing.resolveSelection(p.modulos).ids.includes(m.id);
      return `<td class="center">${on ? `<span class="yes">${icon('check', 'sm')}</span>` : '<span class="no">—</span>'}</td>`;
    }).join('')}</tr>`).join('');
    const limitRow = (label, key) => `<tr><td>${label}</td>${PLANS.map((p) => `<td class="center">${esc(p.limites[key])}</td>`).join('')}</tr>`;
    document.getElementById('compare').innerHTML = `
      <thead><tr><th>Funcionalidad</th>${PLANS.map((p) => `<th class="center">${esc(p.nombre)}</th>`).join('')}</tr></thead>
      <tbody>
        ${rows}
        <tr class="group"><td colspan="${PLANS.length + 1}">Límites</td></tr>
        ${limitRow('Asesores incluidos', 'asesores')}${limitRow('Contactos activos por mes', 'contactos')}${limitRow('Menús', 'menus')}${limitRow('Productos', 'productos')}${limitRow('Soporte', 'soporte')}
        <tr class="group"><td colspan="${PLANS.length + 1}">Precio</td></tr>
        <tr><td><strong>Mensualidad del plan</strong></td>${PLANS.map((p) => `<td class="center"><strong>${p.desde ? 'desde ' : ''}${fmt.money(p.mensual)}</strong></td>`).join('')}</tr>
        <tr><td>Implementación</td>${PLANS.map((p) => `<td class="center">${p.desde ? 'desde ' : ''}${fmt.money(p.implementacion)}</td>`).join('')}</tr>
        <tr><td>Mismos módulos por separado</td>${PLANS.map((p) => { const c = pricing.compareWithPlan(p, {}); return `<td class="center muted">${fmt.money(c.modularMensual)}/mes<br><small>${fmt.money(c.modularImplementacion)} impl.</small></td>`; }).join('')}</tr>
        <tr><td></td>${PLANS.map((p) => `<td class="center"><a class="btn btn-sm" href="cotizador.html?plan=${p.id}">Personalizar</a></td>`).join('')}</tr>
      </tbody>`;
  }

  const FAQ = [
    ['¿Cuál es la diferencia entre un plan y el cotizador por módulos?', 'Los planes son paquetes con precio cerrado y límites de uso definidos. En el cotizador cada módulo tiene su propio precio y puede combinarlos libremente; conviene cuando necesita pocos módulos o una combinación distinta.'],
    ['¿Puedo cambiar de plan más adelante?', 'Sí. Puede subir de plan en cualquier momento; la diferencia se prorratea. Para bajar de plan, el cambio aplica en la siguiente renovación.'],
    ['¿Qué pasa si supero los límites?', 'Le avisaremos antes de llegar al límite. Puede agregar asesores o tramos de contactos con los precios del cotizador o pasar al siguiente plan.'],
    ['¿Los planes incluyen el costo de Meta y de la IA?', 'No. Meta cobra por conversación según su tarifa vigente y el proveedor de IA cobra por consumo. Se pagan directamente a cada proveedor y se configuran límites para controlar el gasto.'],
    ['¿Qué incluye la implementación?', 'Diagnóstico, conexión del número a la API oficial, configuración de menús, catálogo, agenda o base de conocimiento según el plan, pruebas con su equipo y capacitación inicial.']
  ];
  document.getElementById('faq').innerHTML = FAQ.map(([q, a], i) => `
    <details class="faq-item"${i === 0 ? ' open' : ''}><summary>${esc(q)}${icon('chevronDown', 'sm')}</summary><p>${esc(a)}</p></details>`).join('');

  document.getElementById('period').addEventListener('click', (e) => {
    const b = e.target.closest('[data-p]');
    if (!b) return;
    period = b.dataset.p;
    storage.set('planes-periodo', period);
    renderPeriod(); renderPlans();
  });

  renderPeriod();
  renderPlans();
  renderCompare();
})();
