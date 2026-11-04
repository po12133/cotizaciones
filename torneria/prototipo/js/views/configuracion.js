(function () {
  const TOR = window.TOR;
  const S = TOR.store, C = TOR.cmp, A = TOR.app;
  const { esc, fmt } = TOR.ui;
  const icon = TOR.icon;
  const st = C.state('configuracion', { tab: 'empresa' });

  function render(el) {
    const write = A.can('configuracion');
    const dis = write ? '' : 'disabled';
    const e = S.db.empresa, p = S.db.parametros;
    const TABS = [['empresa', 'Datos de la empresa'], ['sucursales', 'Sucursales'], ['usuarios', 'Usuarios y roles'], ['unidades', 'Unidades y categorías'], ['parametros', 'Parámetros del sistema'], ['demo', 'Datos de demostración']];
    el.innerHTML = `<div class="page-head"><div><p class="lead">Parámetros que adaptan el sistema a la empresa. ${write ? '' : '<b>Su rol tiene acceso de solo lectura.</b>'}</p></div></div>
      <div class="card"><div class="tabs">${TABS.map(([k, l]) => `<button class="${st.tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div><div class="card-body" id="cfBody"></div></div>`;
    const body = el.querySelector('#cfBody');
    if (st.tab === 'empresa') {
      body.innerHTML = `<form class="form-grid" id="cfEmp" novalidate style="max-width:760px">
        <label class="field"><span>Nombre comercial *</span><input class="input" name="nombre" value="${esc(e.nombre)}" ${dis}></label>
        <label class="field"><span>Razón social</span><input class="input" name="razonSocial" value="${esc(e.razonSocial)}" ${dis}></label>
        <label class="field"><span>NIT</span><input class="input" name="nit" value="${esc(e.nit)}" ${dis}></label>
        <label class="field"><span>Iniciales del logotipo</span><input class="input" name="logoTexto" maxlength="3" value="${esc(e.logoTexto)}" ${dis}></label>
        <label class="field"><span>Teléfono</span><input class="input" name="telefono" value="${esc(e.telefono)}" ${dis}></label>
        <label class="field"><span>Correo</span><input class="input" type="email" name="correo" value="${esc(e.correo)}" ${dis}></label>
        <label class="field full"><span>Dirección de casa matriz</span><input class="input" name="direccion" value="${esc(e.direccion)}" ${dis}></label>
        <label class="field"><span>Moneda</span><select class="select" name="moneda" ${dis}><option value="BOB">Bolivianos (Bs)</option></select></label>
        <div class="full row">${write ? `<button type="button" class="btn btn-primary" data-save-emp>${icon('check', 'sm')}Guardar cambios</button>` : ''}<span class="muted" style="font-size:12.5px">Estos datos aparecen en comprobantes, cotizaciones y reportes.</span></div></form>`;
      const b = body.querySelector('[data-save-emp]');
      if (b) b.addEventListener('click', () => { const f = body.querySelector('#cfEmp'); const { ok, data } = TOR.ui.validateForm(f, { nombre: { required: true, minLen: 2 }, correo: { email: true } }); if (ok && A.run(() => S.ops.saveSettings({ empresa: data }), 'Datos de la empresa guardados')) A.render(); });
    }
    if (st.tab === 'sucursales') body.innerHTML = linkCard('branches', `${S.db.sucursales.length} sucursales con ${S.db.sucursales.reduce((t, s) => t + s.almacenes.length, 0)} almacenes`, 'Las sucursales y sus almacenes se administran en su propio módulo.', '#/sucursales', 'Ir a Sucursales') + `<ul class="list-plain" style="margin-top:12px;border:1px solid var(--line);border-radius:10px">${S.db.sucursales.map((s) => `<li><span><b>${esc(s.nombre)}</b><small>${esc(s.direccion)}</small></span><small>${s.almacenes.map((a) => esc(a.nombre)).join(' · ')}</small></li>`).join('')}</ul>`;
    if (st.tab === 'usuarios') body.innerHTML = linkCard('users', `${S.db.usuarios.filter((u) => u.estado === 'activo').length} usuarios activos · ${S.db.roles.length} roles`, 'Usuarios, roles personalizados y permisos por módulo.', '#/usuarios', 'Ir a Usuarios');
    if (st.tab === 'unidades') {
      body.innerHTML = `<div class="grid g-2"><div><div class="row" style="margin-bottom:10px"><h3 style="font-size:14px">Unidades de medida</h3><span class="spacer"></span>${write ? `<button class="btn btn-outline btn-sm" data-unit>${icon('plus', 'sm')}Agregar</button>` : ''}</div>
          <div class="table-wrap" style="border:1px solid var(--line);border-radius:10px"><table class="table"><thead><tr><th>Unidad</th><th>Abreviatura</th><th class="right">Productos</th></tr></thead><tbody>${S.db.unidades.map((u) => `<tr><td>${esc(u.nombre)}</td><td class="mono">${esc(u.abrev)}</td><td class="right">${S.db.productos.filter((p) => p.unidad === u.id).length}</td></tr>`).join('')}</tbody></table></div></div>
        <div><div class="row" style="margin-bottom:10px"><h3 style="font-size:14px">Categorías de productos</h3><span class="spacer"></span>${write ? `<button class="btn btn-outline btn-sm" data-cat>${icon('plus', 'sm')}Agregar</button>` : ''}</div>
          <ul class="list-plain" style="border:1px solid var(--line);border-radius:10px">${S.db.categorias.map((c) => `<li><span>${esc(c)}</span><span class="badge plain">${S.db.productos.filter((p) => p.categoria === c).length} productos</span></li>`).join('')}</ul></div></div>`;
      const u = body.querySelector('[data-unit]');
      if (u) u.addEventListener('click', () => C.formModal({ title: 'Nueva unidad de medida', size: 'narrow', submit: 'Agregar', body: '<div class="form-grid"><label class="field"><span>Nombre *</span><input class="input" name="nombre" placeholder="Ej.: Pie"></label><label class="field"><span>Abreviatura *</span><input class="input" name="abrev" placeholder="Ej.: ft" maxlength="6"></label></div>', rules: { nombre: { required: true }, abrev: { required: true } }, onSubmit: (d, close) => { if (A.run(() => S.ops.addUnit({ id: d.abrev.toLowerCase(), nombre: d.nombre, abrev: d.abrev }), 'Unidad agregada', d.nombre)) close(); } }));
      const c = body.querySelector('[data-cat]');
      if (c) c.addEventListener('click', () => C.formModal({ title: 'Nueva categoría', size: 'narrow', submit: 'Agregar', body: '<label class="field"><span>Nombre *</span><input class="input" name="nombre" placeholder="Ej.: Herramientas eléctricas"></label>', rules: { nombre: { required: true, minLen: 3 } }, onSubmit: (d, close) => { if (A.run(() => S.ops.addCategory(d.nombre.trim()), 'Categoría agregada', d.nombre)) close(); } }));
    }
    if (st.tab === 'parametros') {
      body.innerHTML = `<form class="form-grid" id="cfPar" novalidate style="max-width:760px">
        <label class="field"><span>Validez de cotizaciones (días)</span><input class="input" type="number" name="diasValidezCotizacion" min="1" value="${p.diasValidezCotizacion}" ${dis}></label>
        <label class="field"><span>Margen sugerido sobre costo de compra (%)</span><input class="input" type="number" name="margenSugerido" min="0" value="${p.margenSugerido}" ${dis}><small>Referencia para fijar el precio de venta de productos nuevos.</small></label>
        <label class="switch full"><input type="checkbox" name="permitirStockNegativo" value="1" ${p.permitirStockNegativo ? 'checked' : ''} ${dis}><span class="track"></span><span>Permitir vender sin stock suficiente (no recomendado)</span></label>
        <div class="full">${write ? `<button type="button" class="btn btn-primary" data-save-par>${icon('check', 'sm')}Guardar parámetros</button>` : ''}</div></form>`;
      const b = body.querySelector('[data-save-par]');
      if (b) b.addEventListener('click', () => { const f = body.querySelector('#cfPar'); const { ok, data } = TOR.ui.validateForm(f, { diasValidezCotizacion: { required: true, number: true, positive: true }, margenSugerido: { required: true, number: true, nonNegative: true } }); if (ok) A.run(() => S.ops.saveSettings({ parametros: { diasValidezCotizacion: +data.diasValidezCotizacion, margenSugerido: +data.margenSugerido, permitirStockNegativo: data.permitirStockNegativo === '1' } }), 'Parámetros guardados'); });
    }
    if (st.tab === 'demo') {
      const kb = Math.round(new Blob([localStorage.getItem(S.KEY) || '']).size / 1024);
      body.innerHTML = `<div class="stack" style="max-width:720px"><div class="info-box warning">${icon('info', 'sm')}<span>Este es un prototipo comercial. Los datos son ficticios, se guardan solo en el <b>localStorage</b> de este navegador (${kb} KB) y no se envían a ningún servidor. En el sistema real se usará una base de datos central con respaldos.</span></div>
        <p class="muted">Datos generados el ${fmt.dateTime(S.db.generado)} · ${S.db.ventas.length} ventas · ${S.db.compras.length} compras · ${S.db.cotizaciones.length} cotizaciones · ${S.db.movimientos.length} movimientos de inventario.</p>
        <div class="row wrap"><button class="btn btn-outline" data-json>${icon('download', 'sm')}Exportar datos (JSON)</button><button class="btn btn-danger" data-reset>${icon('refresh', 'sm')}Restablecer datos de ejemplo</button></div></div>`;
      body.querySelector('[data-json]').addEventListener('click', () => { TOR.ui.download(`importadora-demo-${S.today()}.json`, S.ops.exportJSON(), 'application/json'); TOR.ui.toast('Datos exportados'); });
      body.querySelector('[data-reset]').addEventListener('click', () => document.getElementById('resetBtn').click());
    }
    el.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { st.tab = b.dataset.tab; A.render(); }));
  }
  const linkCard = (ic, title, text, href, cta) => `<div class="row wrap" style="gap:14px"><span class="k-ico" style="width:44px;height:44px;border-radius:10px;display:grid;place-items:center;background:var(--steel-50)">${icon(ic)}</span><div><b>${esc(title)}</b><p class="muted">${esc(text)}</p></div><span class="spacer"></span><a class="btn btn-outline" href="${href}">${esc(cta)}${icon('chevronRight', 'sm')}</a></div>`;

  TOR.views.configuracion = { render };
})();
