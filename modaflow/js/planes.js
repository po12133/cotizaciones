/*
 * Tarjetas de planes, tabla comparativa y recomendador. Se usa en index.html y planes.html.
 */
(function (root) {
  const MF = root.MF;
  const { esc } = MF;
  const fmtLimit = (n) => MF.num(n);

  function planCard(p, o) {
    const show = o.full ? p.features.length : 9;
    const extra = p.features.length - show;
    const cls = ['plan-card', p.popular ? 'popular' : '', p.id === 'empresarial' ? 'enterprise' : ''].join(' ');
    return `<article class="${cls} reveal" id="plan-${p.id}">
      ${p.popular ? '<span class="plan-ribbon">Más elegido</span>' : ''}
      <div class="plan-icon">${MF.icon(p.icon)}</div>
      <h3>${p.name}</h3>
      <p class="plan-tag">${p.tagline}</p>
      <div class="plan-price"><b>${p.priceLabel}</b><span>${p.period}</span></div>
      ${p.renewal ? `<p class="plan-renew">${p.renewal}</p>` : ''}
      <div class="plan-limits">
        <div><small>Productos</small><b>${fmtLimit(p.limits.products)}</b></div>
        <div><small>IA / mes</small><b>${p.limits.ai}</b></div>
        <div><small>Usuarios</small><b>${p.limits.users}</b></div>
        <div><small>Sucursales</small><b>${p.limits.branches}</b></div>
      </div>
      ${p.includesFrom ? `<p class="plan-inherit">Todo lo del plan ${p.includesFrom}, más:</p>` : ''}
      <ul class="plan-feats">${p.features.slice(0, show).map((f) => `<li>${MF.icon('check', 'sm')}<span>${esc(f)}</span></li>`).join('')}
        ${extra > 0 ? `<li class="more" data-more="${p.id}">${MF.icon('plus', 'sm')}<span>Ver ${extra} funciones más</span></li>` : ''}</ul>
      <a class="btn ${p.popular ? 'grad' : p.id === 'empresarial' ? 'grad' : 'primary'} block" href="demo.html?plan=${p.id}#/dashboard">${MF.icon('play', 'sm')} Probar demostración</a>
      ${o.full ? '' : `<a class="btn ghost block" href="planes.html#plan-${p.id}">Ver detalle</a>`}
      ${p.note && o.full ? `<p class="plan-note">${p.note}</p>` : ''}
    </article>`;
  }

  function renderPlanCards(el, o) {
    o = o || {};
    el.innerHTML = MF.PLANS.map((p) => planCard(p, o)).join('');
    el.querySelectorAll('[data-more]').forEach((li) => li.addEventListener('click', () => {
      const p = MF.planById(li.dataset.more);
      const ul = li.parentElement;
      ul.innerHTML = p.features.map((f) => `<li>${MF.icon('check', 'sm')}<span>${esc(f)}</span></li>`).join('');
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
      const head = `<thead><tr><th>Funciones</th>${MF.PLANS.map((p) => `<th class="${p.id === state.hi ? 'col-hi' : ''}"><span class="ph-name">${p.name}</span><span class="ph-price">${p.priceLabel} ${p.period}</span><a class="btn ${p.id === state.hi ? 'grad' : 'ghost'} sm" href="demo.html?plan=${p.id}#/dashboard">Probar plan</a></th>`).join('')}</tr></thead>`;
      let body = '';
      let pendingGroup = null;
      MF.COMPARE.forEach((row) => {
        if (row.group) { pendingGroup = row.group; return; }
        const [label, vals] = row;
        if (state.diff && vals.every((v) => JSON.stringify(v) === JSON.stringify(vals[0]))) return;
        if (pendingGroup) { body += `<tr class="grp"><td colspan="5">${pendingGroup}</td></tr>`; pendingGroup = null; }
        body += `<tr><td>${esc(label)}</td>${vals.map((v, i) => cell(v).replace('<td class="', `<td class="${MF.PLANS[i].id === state.hi ? 'col-hi ' : ''}`)).join('')}</tr>`;
      });
      el.querySelector('.compare-wrap').innerHTML = `<table class="compare">${head}<tbody>${body}</tbody></table>`;
    }
    el.innerHTML = `<div class="compare-filter">
        <div class="seg" role="group" aria-label="Resaltar plan">${MF.PLANS.map((p) => `<button data-hi="${p.id}" class="${p.id === state.hi ? 'on' : ''}">${p.name}</button>`).join('')}</div>
        <label class="switch"><input type="checkbox" id="onlyDiff"><span></span> Mostrar solo diferencias</label>
      </div><div class="compare-wrap"></div>
      <p class="plans-foot">* Empresarial: Bs 4.500 de activación con el primer año incluido; renovación referencial Bs 900 anuales desde el segundo año. Dominio propio sujeto a configuración. Precios y límites sujetos a las condiciones definitivas del servicio.</p>`;
    el.querySelector('#onlyDiff').addEventListener('change', (e) => { state.diff = e.target.checked; draw(); });
    el.querySelectorAll('[data-hi]').forEach((b) => b.addEventListener('click', () => {
      state.hi = b.dataset.hi;
      el.querySelectorAll('[data-hi]').forEach((x) => x.classList.toggle('on', x === b));
      draw();
    }));
    draw();
  }

  /** Recomendador: elige el plan más económico que cubre lo que la tienda necesita. */
  function renderCalculator(el) {
    const fields = [
      ['products', 'Productos en su tienda', 20, 10000, 80, 10],
      ['users', 'Personas que usarán el sistema', 1, 20, 1, 1],
      ['branches', 'Sucursales', 1, 5, 1, 1],
      ['ai', 'Prendas nuevas por mes (registro con IA)', 0, 500, 15, 5]
    ];
    el.innerHTML = `<div>${fields.map(([k, label, min, max, val, step]) => `<div class="range-row"><div class="top"><span>${label}</span><b id="v-${k}">${MF.num(val)}</b></div><input type="range" id="r-${k}" min="${min}" max="${max}" step="${step}" value="${val}"></div>`).join('')}
      <label class="switch"><input type="checkbox" id="r-profit"><span></span> Quiero saber cuánto gano (costos y ganancias)</label>
      <label class="switch" style="margin-top:10px"><input type="checkbox" id="r-help"><span></span> Necesito que me ayuden a configurar e importar todo</label></div>
      <div class="calc-out" id="calcOut"></div>`;
    const out = el.querySelector('#calcOut');
    function update() {
      const need = {};
      fields.forEach(([k]) => { need[k] = +el.querySelector('#r-' + k).value; el.querySelector('#v-' + k).textContent = MF.num(need[k]); });
      let lvl = 1;
      if (el.querySelector('#r-profit').checked) lvl = Math.max(lvl, 2);
      if (el.querySelector('#r-help').checked) lvl = 4;
      const plan = MF.PLANS.find((p) => p.level >= lvl && ['products', 'users', 'branches', 'ai'].every((k) => p.limits[k] >= need[k])) || MF.PLANS[3];
      const yearly = plan.id === 'empresarial' ? 4500 : plan.price * 12;
      out.innerHTML = `<div class="row"><span>Productos</span><b>${MF.num(need.products)} / ${MF.num(plan.limits.products)}</b></div>
        <div class="row"><span>Usuarios</span><b>${need.users} / ${plan.limits.users}</b></div>
        <div class="row"><span>Sucursales</span><b>${need.branches} / ${plan.limits.branches}</b></div>
        <div class="row"><span>Registros con IA al mes</span><b>${need.ai} / ${plan.limits.ai}</b></div>
        <div class="rec"><small>Plan recomendado</small><strong>${plan.name} · ${plan.priceLabel} ${plan.period}</strong>
        <small>${plan.id === 'empresarial' ? 'Primer año incluido; luego renovación referencial Bs 900/año.' : `Equivale a ${MF.money(yearly)} al año.`}</small></div>
        <div class="actions start" style="margin-top:14px"><a class="btn grad" href="demo.html?plan=${plan.id}#/dashboard">${MF.icon('play', 'sm')} Probar ${plan.name}</a></div>`;
    }
    el.querySelectorAll('input').forEach((i) => i.addEventListener('input', update));
    update();
  }

  Object.assign(MF, { renderPlanCards, renderCompare, renderCalculator });
})(window);
