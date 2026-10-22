/* Página de catálogo de módulos: detalle, dependencias y selección para la cotización. */
(function () {
  const { icon, ui, MODULES, storage, pricing } = window.WAB;
  const { esc, fmt } = ui;

  const GROUPS = {
    atencion: ['automatizacion', 'ia', 'chat', 'citas'],
    comercio: ['catalogo', 'ventas', 'web'],
    gestion: ['crm', 'reportes', 'campanas']
  };

  const getQuote = () => storage.get('cotizador', {}) || {};
  const selected = () => (getQuote().modulos || []);
  function setSelected(ids) {
    const q = getQuote();
    q.modulos = ids;
    storage.set('cotizador', q);
  }

  function depsText(m) {
    const parts = [];
    m.requiere.forEach((d) => parts.push(MODULES.byId(d).corto));
    if (m.requiereAlguno) parts.push('al menos un módulo que genere datos');
    return parts;
  }

  function render() {
    const sel = pricing.resolveSelection(selected());
    const list = document.getElementById('module-list');
    list.innerHTML = MODULES.ALL.map((m) => {
      const chosen = sel.ids.includes(m.id);
      const autoAdded = chosen && sel.auto[m.id] && !m.obligatorio;
      const deps = depsText(m);
      const users = MODULES.MODULES.filter((x) => x.requiere.includes(m.id) && x.id !== m.id).map((x) => x.corto);
      return `
      <article class="card module-detail reveal${chosen ? ' selected' : ''}" id="${m.id}" data-id="${m.id}">
        <div class="md-main">
          <div class="mc-top">
            <div class="feature-icon">${icon(m.icon)}</div>
            <div class="grow">
              <span class="mc-code">${m.codigo}</span>
              <h2 class="md-title">${esc(m.nombre)}</h2>
            </div>
            ${m.obligatorio ? '<span class="badge solid">Incluido siempre</span>' : chosen ? `<span class="badge ok">${icon('check')}${autoAdded ? 'Agregado por dependencia' : 'En la cotización'}</span>` : ''}
          </div>
          <p class="md-desc">${esc(m.descripcion)}</p>
          <h4 class="label mt-2">Funcionalidades</h4>
          <ul class="check-list compact md-features">${m.features.map((f) => `<li>${icon('check', 'sm')}<span>${esc(f)}</span></li>`).join('')}</ul>
        </div>
        <aside class="md-side">
          <div class="md-prices">
            <div><small>Implementación</small><strong>${fmt.money(m.implementacion)}</strong><span>pago único</span></div>
            <div><small>Mensualidad</small><strong>${fmt.money(m.mensual)}</strong><span>por mes</span></div>
          </div>
          <dl class="md-meta">
            <div><dt>Plazo estimado</dt><dd>${m.dias} días hábiles</dd></div>
            <div><dt>Depende de</dt><dd>${deps.length ? deps.map(esc).join(', ') : 'Ninguno'}</dd></div>
            ${users.length ? `<div><dt>Lo necesitan</dt><dd>${users.map(esc).join(', ')}</dd></div>` : ''}
          </dl>
          <div class="md-actions">
            <a class="btn" href="${m.prototipo}">${icon('eye', 'sm')}Ver prototipo</a>
            ${m.obligatorio ? '<button class="btn" disabled>Obligatorio</button>' : `<button class="btn ${chosen ? 'btn-soft' : 'btn-primary'}" data-toggle="${m.id}">${icon(chosen ? 'check' : 'plus', 'sm')}${chosen ? 'Agregado' : 'Agregar a la cotización'}</button>`}
          </div>
        </aside>
      </article>`;
    }).join('');

    document.getElementById('toc').innerHTML = MODULES.ALL.map((m) => `
      <a href="#${m.id}" class="${sel.ids.includes(m.id) ? 'on' : ''}"><span class="mc-code">${m.codigo}</span>${esc(m.corto)}</a>`).join('');

    const count = sel.ids.length - 1;
    const c = pricing.calculate({ modulos: selected() });
    document.getElementById('go-quote').innerHTML = `${icon('file', 'sm')}Ir al cotizador${count ? ` · ${count} módulo${count > 1 ? 's' : ''} · ${fmt.money(c.mensualBase)}/mes` : ''}`;
    list.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
    applyFilter();
  }

  let filter = 'all';
  function applyFilter() {
    document.querySelectorAll('.module-detail').forEach((el) => {
      const id = el.dataset.id;
      el.hidden = filter !== 'all' && id !== 'base' && !GROUPS[filter].includes(id);
    });
  }
  document.getElementById('filter').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    filter = b.dataset.f;
    document.querySelectorAll('#filter button').forEach((x) => x.classList.toggle('active', x === b));
    applyFilter();
  });

  document.getElementById('module-list').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-toggle]');
    if (!b) return;
    const id = b.dataset.toggle;
    const current = pricing.resolveSelection(selected()).ids;
    const m = MODULES.byId(id);
    if (current.includes(id)) {
      const dependents = pricing.dependentsOf(id, current);
      if (dependents.length) {
        const names = dependents.map((d) => MODULES.byId(d).corto).join(', ');
        const okRemove = await ui.confirm({ title: `Quitar ${m.corto}`, message: `${names} depende${dependents.length > 1 ? 'n' : ''} de este módulo y también se quitará${dependents.length > 1 ? 'n' : ''}.`, confirmLabel: 'Quitar ambos', danger: true });
        if (!okRemove) return;
      }
      const remove = new Set([id].concat(dependents));
      setSelected(selected().filter((x) => !remove.has(x)));
      ui.toast(`${m.corto} quitado de la cotización`, '', 'info');
    } else {
      const next = pricing.resolveSelection(selected().concat(id));
      const added = next.ids.filter((x) => !current.includes(x) && x !== id);
      setSelected(selected().concat(id));
      ui.toast(`${m.corto} agregado`, added.length ? `También se agregó: ${added.map((x) => MODULES.byId(x).corto).join(', ')}` : 'Revise el total en el cotizador.', 'ok');
    }
    render();
  });

  render();
  if (location.hash) {
    const el = document.querySelector(location.hash);
    if (el) setTimeout(() => el.scrollIntoView(), 50);
  }
})();
