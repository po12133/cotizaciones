/*
 * Tarjetas de planes, tabla comparativa y recomendador. Se usa en index.html y planes.html.
 * Todo sale de js/plans.js (configuración centralizada de planes y funciones).
 */
(function (root) {
  const MF = root.MF;
  const { esc } = MF;

  function planCard(p, o) {
    const show = o.full ? p.features.length : 8;
    const extra = p.features.length - show;
    const cls = ['plan-card', p.popular ? 'popular' : '', p.trial ? 'trial' : ''].join(' ');
    return `<article class="${cls} reveal" id="plan-${p.id}">
      ${p.popular ? '<span class="plan-ribbon">Recomendado</span>' : ''}
      <div class="plan-icon">${MF.icon(p.icon)}</div>
      <h3>${p.name}</h3>
      <p class="plan-tag">${p.tagline}</p>
      <div class="plan-price"><b>${p.priceLabel}</b><span>${p.period}</span></div>
      <div class="plan-limits">
        <div><small>Productos</small><b>${MF.num(p.limits.products)}</b></div>
        <div><small>IA ${p.limits.aiTotal ? 'en total' : '/ mes'}</small><b>${p.limits.ai}</b></div>
        <div><small>Usuarios</small><b>${p.limits.users}</b></div>
        <div><small>Sucursales</small><b>${p.limits.branches}</b></div>
      </div>
      ${p.includesFrom ? `<p class="plan-inherit">Todo lo del plan ${p.includesFrom}, más:</p>` : ''}
      <ul class="plan-feats">${p.features.slice(0, show).map((f) => `<li>${MF.icon('check', 'sm')}<span>${esc(f)}</span></li>`).join('')}
        ${extra > 0 ? `<li class="more" data-more="${p.id}">${MF.icon('plus', 'sm')}<span>Ver ${extra} funciones más</span></li>` : ''}</ul>
      ${p.without ? `<ul class="plan-without">${p.without.map((f) => `<li>${MF.icon('minus', 'sm')}<span>${esc(f)}</span></li>`).join('')}</ul>` : ''}
      <a class="btn ${p.popular || p.trial ? 'grad' : 'primary'} block" href="demo.html?plan=${p.id}#/inicio">${MF.icon('play', 'sm')} ${p.trial ? 'Probar gratis 14 días' : 'Probar demostración'}</a>
      ${o.full ? '' : `<a class="btn ghost block" href="planes.html#plan-${p.id}">Ver detalle</a>`}
      ${p.note && o.full ? `<p class="plan-note">${esc(p.note)}</p>` : ''}
    </article>`;
  }

  function renderPlanCards(el, o) {
    o = o || {};
    el.innerHTML = MF.PLANS.map((p) => planCard(p, o)).join('');
    el.querySelectorAll('[data-more]').forEach((li) => li.addEventListener('click', () => {
      const p = MF.planById(li.dataset.more);
      li.parentElement.innerHTML = p.features.map((f) => `<li>${MF.icon('check', 'sm')}<span>${esc(f)}</span></li>`).join('');
    }));
  }

  function cell(v) {
    if (v === true) return `<td class="yes" aria-label="Incluido">${MF.icon('checkCircle')}</td>`;
    if (v === false) return `<td class="no" aria-label="No incluido">${MF.icon('minus')}</td>`;
    return `<td class="txt">${esc(v)}</td>`;
  }

  function renderCompare(el, opts) {
    opts = opts || {};
    const state = { diff: false, hi: opts.highlight || 'pro' };
    function draw() {
      const head = `<thead><tr><th>Funciones</th>${MF.PLANS.map((p) => `<th class="${p.id === state.hi ? 'col-hi' : ''}"><span class="ph-name">${p.short}</span><span class="ph-price">${p.priceLabel}${p.period}</span><a class="btn ${p.id === state.hi ? 'grad' : 'ghost'} sm" href="demo.html?plan=${p.id}#/inicio">Probar</a></th>`).join('')}</tr></thead>`;
      let body = '';
      let pendingGroup = null;
      MF.COMPARE.forEach((row) => {
        if (row.group) { pendingGroup = row.group; return; }
        const [label, vals] = row;
        if (state.diff && vals.every((v) => JSON.stringify(v) === JSON.stringify(vals[0]))) return;
        if (pendingGroup) { body += `<tr class="grp"><td colspan="${MF.PLANS.length + 1}">${pendingGroup}</td></tr>`; pendingGroup = null; }
        body += `<tr><td>${esc(label)}</td>${vals.map((v, i) => cell(v).replace('<td class="', `<td class="${MF.PLANS[i].id === state.hi ? 'col-hi ' : ''}`)).join('')}</tr>`;
      });
      el.querySelector('.compare-wrap').innerHTML = `<table class="compare">${head}<tbody>${body}</tbody></table>`;
    }
    el.innerHTML = `<div class="compare-filter">
        <div class="seg" role="group" aria-label="Resaltar plan">${MF.PLANS.map((p) => `<button data-hi="${p.id}" class="${p.id === state.hi ? 'on' : ''}">${p.short}</button>`).join('')}</div>
        <label class="switch"><input type="checkbox" id="onlyDiff"><span></span> Mostrar solo diferencias</label>
      </div><div class="compare-wrap"></div>
      <p class="plans-foot">Producto = ficha de una prenda: las unidades en stock no tienen límite. Ventas ilimitadas en todos los planes. Prueba gratuita: 14 días; al terminar, la cuenta queda en solo lectura y el catálogo se desactiva (propuesta: datos conservados 30 días más). * Dominio propio sujeto a configuración. Precios y límites sujetos a las condiciones definitivas del servicio.</p>`;
    el.querySelector('#onlyDiff').addEventListener('change', (e) => { state.diff = e.target.checked; draw(); });
    el.querySelectorAll('[data-hi]').forEach((b) => b.addEventListener('click', () => {
      state.hi = b.dataset.hi;
      el.querySelectorAll('[data-hi]').forEach((x) => x.classList.toggle('on', x === b));
      draw();
    }));
    draw();
  }

  /** Recomendador: elige el plan pagado más económico que cubre lo que la tienda necesita. */
  function renderCalculator(el) {
    const fields = [
      ['products', 'Prendas distintas (fichas) en su tienda', 20, 5000, 80, 10],
      ['users', 'Personas que usarán el sistema', 1, 10, 1, 1],
      ['branches', 'Sucursales', 1, 3, 1, 1],
      ['ai', 'Prendas nuevas por mes que registrará con IA', 0, 300, 15, 5]
    ];
    el.innerHTML = `<div>${fields.map(([k, label, min, max, val, step]) => `<div class="range-row"><div class="top"><span>${label}</span><b id="v-${k}">${MF.num(val)}</b></div><input type="range" id="r-${k}" min="${min}" max="${max}" step="${step}" value="${val}"></div>`).join('')}
      <label class="switch"><input type="checkbox" id="r-cat"><span></span> Quiero un catálogo online con pedidos por WhatsApp y QR</label>
      <label class="switch" style="margin-top:10px"><input type="checkbox" id="r-mgmt"><span></span> Necesito proveedores, compras, gastos o auditoría</label></div>
      <div class="calc-out" id="calcOut"></div>`;
    const out = el.querySelector('#calcOut');
    function update() {
      const need = {};
      fields.forEach(([k]) => { need[k] = +el.querySelector('#r-' + k).value; el.querySelector('#v-' + k).textContent = MF.num(need[k]); });
      const feats = [];
      if (el.querySelector('#r-cat').checked) feats.push('catalogo');
      if (el.querySelector('#r-mgmt').checked) feats.push('proveedores');
      const paid = MF.PLANS.filter((p) => !p.trial);
      const plan = paid.find((p) => feats.every((f) => MF.planIncludes(p.id, f)) && ['products', 'users', 'branches', 'ai'].every((k) => p.limits[k] >= need[k])) || paid[paid.length - 1];
      out.innerHTML = `<div class="row"><span>Productos</span><b>${MF.num(need.products)} / ${MF.num(plan.limits.products)}</b></div>
        <div class="row"><span>Usuarios</span><b>${need.users} / ${plan.limits.users}</b></div>
        <div class="row"><span>Sucursales</span><b>${need.branches} / ${plan.limits.branches}</b></div>
        <div class="row"><span>Análisis con IA al mes</span><b>${need.ai} / ${plan.limits.ai}</b></div>
        <div class="rec"><small>Plan recomendado</small><strong>${plan.name} · ${plan.priceLabel}${plan.period}</strong><small>Equivale a ${MF.money(plan.price * 12)} al año. Empiece con 14 días gratis.</small></div>
        <div class="actions start" style="margin-top:14px"><a class="btn grad" href="demo.html?plan=${plan.id}#/inicio">${MF.icon('play', 'sm')} Probar ${plan.name}</a></div>`;
    }
    el.querySelectorAll('input').forEach((i) => i.addEventListener('input', update));
    update();
  }

  Object.assign(MF, { renderPlanCards, renderCompare, renderCalculator });
})(window);
