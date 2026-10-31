(function () {
  const TOR = window.TOR;
  const S = TOR.store, Q = TOR.q, C = TOR.cmp, L = TOR.labels, A = TOR.app;
  const { esc, fmt } = TOR.ui;
  const icon = TOR.icon;
  const st = C.state('caja', { tab: 'movimientos', periodo: 'mes', tipo: '', q: '' });
  const dias = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  const CATS = { ingreso: ['Ventas', 'Cobranzas', 'Anticipos OT', 'Otros ingresos'], egreso: ['Compras', 'Personal', 'Servicios básicos', 'Alquiler', 'Transporte', 'Mantenimiento', 'Varios'] };

  function render(el, route) {
    if (route.query.tab) { st.tab = route.query.tab; route.query.tab = null; }
    const write = A.can('caja');
    const movs = S.scoped(S.db.caja.movimientos).filter((k) => Q.inRange(k.fecha, st.periodo));
    const ing = Q.sumBy(movs.filter((k) => k.tipo === 'ingreso'), (k) => k.monto);
    const egr = Q.sumBy(movs.filter((k) => k.tipo === 'egreso'), (k) => k.monto);
    const sucs = S.db.sucursales.filter((s) => S.inScope(s.id) && A.userBranches().includes(s.id));
    const cxc = S.scoped(S.db.ventas).filter((v) => v.estado === 'pendiente');
    const cxp = S.scoped(S.db.compras).filter((c) => c.estado === 'recibida' && !c.pagado);
    el.innerHTML = `
      <div class="page-head"><div><p class="lead">Apertura y cierre de caja por sucursal, ingresos, egresos y cuentas por cobrar y pagar. Es control operativo; no reemplaza a la contabilidad.</p></div>
        <div class="actions">${A.actionBtn('caja', `<button class="btn btn-outline" data-mov="egreso">${icon('minus', 'sm')}Registrar egreso</button><button class="btn btn-primary" data-mov="ingreso">${icon('plus', 'sm')}Registrar ingreso</button>`)}</div></div>
      <div class="grid g-${Math.min(3, sucs.length)}">${sucs.map((s) => { const ses = S.cajaAbierta(s.id); return `<div class="card"><div class="card-body cash-head"><div class="cash-state"><span class="k-ico" style="width:40px;height:40px;border-radius:10px;display:grid;place-items:center;background:${ses ? 'var(--good-soft)' : 'var(--steel-50)'};color:${ses ? 'var(--good-ink)' : 'var(--steel-500)'}">${icon('cash')}</span><div><small class="muted">${esc(s.nombre)} · ${ses ? `abierta desde ${fmt.dateTime(ses.apertura).split('·')[1].trim()}` : 'caja cerrada'}</small><div class="big">${ses ? fmt.money(ses.montoEsperado) : '—'}</div><small class="muted">${ses ? `Efectivo esperado · inicial ${fmt.money(ses.montoInicial)}` : 'Abra la caja para registrar operaciones en efectivo'}</small></div></div><span class="spacer"></span>${write ? (ses ? `<button class="btn btn-outline btn-sm" data-close-cash="${s.id}">${icon('lock', 'sm')}Cerrar caja</button>` : `<button class="btn btn-primary btn-sm" data-open-cash="${s.id}">${icon('play', 'sm')}Abrir caja</button>`) : ''}</div></div>`; }).join('')}</div>
      <div class="kpis">
        ${C.kpi({ label: 'Ingresos', value: fmt.money(ing), sub: `${movs.filter((k) => k.tipo === 'ingreso').length} movimientos`, icon: 'arrowDown', tone: 'good' })}
        ${C.kpi({ label: 'Egresos', value: fmt.money(egr), sub: `${movs.filter((k) => k.tipo === 'egreso').length} movimientos`, icon: 'arrowUp' })}
        ${C.kpi({ label: 'Resultado de caja', value: fmt.money(ing - egr), sub: ing - egr >= 0 ? 'Superávit del período' : 'Déficit del período', icon: 'wallet', tone: 'accent' })}
        ${C.kpi({ label: 'Por cobrar / por pagar', value: `${fmt.money(Q.sumBy(cxc, (v) => v.total))}`, sub: `Por pagar: ${fmt.money(Q.sumBy(cxp, (c) => c.total))}`, icon: 'swap', link: '#/caja?tab=cuentas' })}
      </div>
      <div class="card">
        <div class="tabs">${[['movimientos', 'Movimientos'], ['cuentas', `Cuentas por cobrar y pagar (${cxc.length + cxp.length})`], ['cierres', 'Cierres de caja'], ['resumen', 'Resumen por categoría']].map(([k, l]) => `<button class="${st.tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
        <div id="kBody"></div>
      </div>`;
    const body = el.querySelector('#kBody');
    if (st.tab === 'movimientos') tabMov(body, movs);
    if (st.tab === 'cuentas') tabCuentas(body, cxc, cxp, write);
    if (st.tab === 'cierres') tabCierres(body);
    if (st.tab === 'resumen') tabResumen(body, movs);
    el.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { st.tab = b.dataset.tab; A.render(); }));
    el.querySelectorAll('[data-mov]').forEach((b) => b.addEventListener('click', () => movement(b.dataset.mov)));
    el.querySelectorAll('[data-open-cash]').forEach((b) => b.addEventListener('click', () => openCash(b.dataset.openCash)));
    el.querySelectorAll('[data-close-cash]').forEach((b) => b.addEventListener('click', () => closeCash(b.dataset.closeCash)));
  }

  function tabMov(body, all) {
    const t = st.q.trim().toLowerCase();
    const rows = all.filter((k) => (!st.tipo || k.tipo === st.tipo) && (!t || [k.concepto, k.ref, k.categoria].some((x) => String(x).toLowerCase().includes(t))));
    body.innerHTML = `<div class="filters"><div class="input-icon">${icon('search', 'sm')}<input class="input" id="kQ" type="search" placeholder="Concepto, referencia o categoría" value="${esc(st.q)}"></div>
      <select class="select" id="kPer" aria-label="Período">${Q.PERIODOS.map(([k, l]) => `<option value="${k}" ${st.periodo === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      ${C.segment('ktipo', [['', 'Todos'], ['ingreso', 'Ingresos'], ['egreso', 'Egresos']], st.tipo)}<span class="count">${rows.length} movimientos</span></div><div id="kTable"></div>`;
    C.dataTable(body.querySelector('#kTable'), {
      id: 'caja', rows, pageSize: 15, empty: { icon: 'wallet', title: 'Sin movimientos' },
      columns: [
        { key: 'fecha', label: 'Fecha', render: (k) => `<span class="nowrap">${fmt.dateTime(k.fecha)}</span>` },
        { key: 'concepto', label: 'Concepto', render: (k) => `${esc(k.concepto)}<span class="sub">${esc(k.categoria)}${k.ref ? ` · ${esc(k.ref)}` : ''}</span>` },
        { key: 'sucursal', label: 'Sucursal', render: (k) => esc(S.suc(k.sucursal).nombre) },
        { key: 'metodo', label: 'Método', render: (k) => esc(L.metodo[k.metodo] || k.metodo) },
        { key: 'usuario', label: 'Usuario', render: (k) => `<span class="muted">${esc(S.user(k.usuario) ? S.user(k.usuario).nombre : '')}</span>` },
        { key: 'ing', label: 'Ingreso', align: 'right', render: (k) => (k.tipo === 'ingreso' ? `<span class="amount-in">${fmt.money(k.monto)}</span>` : '') },
        { key: 'egr', label: 'Egreso', align: 'right', render: (k) => (k.tipo === 'egreso' ? `<span class="amount-out">${fmt.money(k.monto)}</span>` : '') }
      ]
    });
    const q = body.querySelector('#kQ');
    q.addEventListener('input', () => { st.q = q.value; C.resetPage('caja'); A.render(); const n = document.getElementById('kQ'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); });
    body.querySelector('#kPer').addEventListener('change', (e) => { st.periodo = e.target.value; C.resetPage('caja'); A.render(); });
    body.querySelector('[data-seg="ktipo"]').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) { st.tipo = b.dataset.v; C.resetPage('caja'); A.render(); } });
  }

  function tabCuentas(body, cxc, cxp, write) {
    body.innerHTML = `<div class="grid g-2" style="padding:16px">
      <div class="card flush"><div class="card-head"><div><h3>Cuentas por cobrar</h3><small>Ventas a crédito · ${fmt.money(Q.sumBy(cxc, (v) => v.total))}</small></div></div><div id="cxc"></div></div>
      <div class="card flush"><div class="card-head"><div><h3>Cuentas por pagar</h3><small>Compras a crédito recibidas · ${fmt.money(Q.sumBy(cxp, (c) => c.total))}</small></div></div><div id="cxp"></div></div></div>`;
    C.dataTable(body.querySelector('#cxc'), { id: 'cxc', rows: cxc, pageSize: 8, empty: { icon: 'checkCircle', title: 'Sin cuentas por cobrar' }, columns: [
      { key: 'c', label: 'Venta', render: (v) => `<b class="mono">${esc(v.codigo)}</b><span class="sub">${esc(S.cli(v.cliente).nombre)}</span>` },
      { key: 'd', label: 'Antigüedad', render: (v) => { const d = dias(v.fecha); return d > 30 ? A.badge(`${d} días`, 'critical') : `${d} días`; } },
      { key: 't', label: 'Saldo', align: 'right', render: (v) => fmt.money(v.total) },
      { key: 'a', label: '', align: 'right', render: (v) => (write ? `<button class="btn btn-outline btn-sm" data-cobrar="${v.id}">Cobrar</button>` : '') }
    ], onRow: (v) => TOR.views.ventas.open(v.id) });
    C.dataTable(body.querySelector('#cxp'), { id: 'cxp', rows: cxp, pageSize: 8, empty: { icon: 'checkCircle', title: 'Sin cuentas por pagar' }, columns: [
      { key: 'c', label: 'Compra', render: (c) => `<b class="mono">${esc(c.codigo)}</b><span class="sub">${esc(S.prov(c.proveedor).nombre)}</span>` },
      { key: 'd', label: 'Vence', render: (c) => { const p = S.prov(c.proveedor).plazoPago || 30; const left = p - dias(c.fechaRecepcion || c.fecha); return left < 0 ? A.badge(`Vencida hace ${-left} d`, 'critical') : `En ${left} días`; } },
      { key: 't', label: 'Monto', align: 'right', render: (c) => fmt.money(c.total) },
      { key: 'a', label: '', align: 'right', render: (c) => (write ? `<button class="btn btn-outline btn-sm" data-pagar="${c.id}">Pagar</button>` : '') }
    ], onRow: (c) => TOR.views.compras.open(c.id) });
    body.querySelectorAll('[data-cobrar]').forEach((b) => b.addEventListener('click', () => A.run(() => S.ops.collectSale(b.dataset.cobrar, 'transferencia'), 'Cobro registrado', 'Ingreso registrado en caja.')));
    body.querySelectorAll('[data-pagar]').forEach((b) => b.addEventListener('click', () => A.run(() => S.ops.payPurchase(b.dataset.pagar), 'Pago registrado', 'Egreso registrado en caja.')));
  }

  function tabCierres(body) {
    const rows = S.db.caja.sesiones.filter((s) => S.inScope(s.sucursal)).slice().sort((a, b) => b.apertura.localeCompare(a.apertura));
    body.innerHTML = '<div id="kc"></div>';
    C.dataTable(body.querySelector('#kc'), { id: 'cierres', rows, pageSize: 12, columns: [
      { key: 'f', label: 'Fecha', render: (s) => fmt.date(s.apertura) },
      { key: 's', label: 'Sucursal', render: (s) => esc(S.suc(s.sucursal).nombre) },
      { key: 'u', label: 'Responsable', render: (s) => esc(S.user(s.usuario) ? S.user(s.usuario).nombre : '') },
      { key: 'h', label: 'Horario', render: (s) => `${fmt.dateTime(s.apertura).split('·')[1]} – ${s.cierre ? fmt.dateTime(s.cierre).split('·')[1] : 'abierta'}` },
      { key: 'i', label: 'Inicial', align: 'right', render: (s) => fmt.money(s.montoInicial) },
      { key: 'e', label: 'Esperado', align: 'right', render: (s) => fmt.money(s.montoEsperado) },
      { key: 'c', label: 'Contado', align: 'right', render: (s) => (s.montoCierre === null ? '—' : fmt.money(s.montoCierre)) },
      { key: 'd', label: 'Diferencia', align: 'right', render: (s) => { if (s.estado === 'abierta') return A.badge('Abierta', 'good'); const d = Math.round((s.montoCierre - s.montoEsperado) * 100) / 100; return d ? A.badge(`${d > 0 ? '+' : ''}${fmt.money(d)}`, 'warning') : A.badge('Cuadrada', 'plain'); } }
    ] });
  }

  function tabResumen(body, movs) {
    body.innerHTML = `<div class="grid g-2" style="padding:16px"><div><h3 style="font-size:14px;margin-bottom:12px">Ingresos por categoría</h3><div id="rIng"></div></div><div><h3 style="font-size:14px;margin-bottom:12px">Egresos por categoría</h3><div id="rEgr"></div></div></div>`;
    const group = (tipo) => { const g = {}; movs.filter((k) => k.tipo === tipo).forEach((k) => { g[k.categoria] = (g[k.categoria] || 0) + k.monto; }); return Object.entries(g).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })); };
    TOR.charts.hbars(body.querySelector('#rIng'), group('ingreso'), { fmt: fmt.money, color: 'var(--series-1)' });
    TOR.charts.hbars(body.querySelector('#rEgr'), group('egreso'), { fmt: fmt.money, color: 'var(--series-2)' });
  }

  function movement(tipo) {
    C.formModal({
      title: tipo === 'ingreso' ? 'Registrar ingreso' : 'Registrar egreso', size: 'narrow', submit: 'Registrar',
      body: `<div class="form-grid"><label class="field"><span>Sucursal *</span><select class="select" name="sucursal">${C.sucursalOptions(C.defaultSucursal())}</select></label>
        <label class="field"><span>Categoría *</span><select class="select" name="categoria">${CATS[tipo].map((c) => `<option>${c}</option>`).join('')}</select></label>
        <label class="field full"><span>Concepto *</span><input class="input" name="concepto" placeholder="${tipo === 'ingreso' ? 'Ej.: Venta de chatarra de viruta' : 'Ej.: Compra de guantes y lentes de seguridad'}"></label>
        <label class="field"><span>Monto (Bs) *</span><input class="input" type="number" name="monto" min="0" step="0.01"></label>
        <label class="field"><span>Método *</span><select class="select" name="metodo">${['efectivo', 'transferencia', 'qr', 'tarjeta'].map((k) => `<option value="${k}">${L.metodo[k]}</option>`).join('')}</select></label></div>
        <input type="hidden" name="tipo" value="${tipo}">`,
      rules: { concepto: { required: true, minLen: 3 }, monto: { required: true, number: true, positive: true } },
      onSubmit: (d, close) => {
        if (d.metodo === 'efectivo' && !S.cajaAbierta(d.sucursal)) { TOR.ui.toast('La caja está cerrada', { text: `Abra la caja de ${S.suc(d.sucursal).nombre} para registrar movimientos en efectivo.`, type: 'warning' }); return; }
        if (A.run(() => S.ops.addCashMovement(d), `${tipo === 'ingreso' ? 'Ingreso' : 'Egreso'} registrado`, fmt.money(+d.monto))) close();
      }
    });
  }
  function openCash(suc) {
    C.formModal({ title: `Abrir caja · ${S.suc(suc).nombre}`, size: 'narrow', submit: 'Abrir caja', body: `<label class="field"><span>Monto inicial en efectivo (Bs) *</span><input class="input" type="number" name="monto" min="0" step="0.5" value="${suc === 'S1' ? 1500 : 800}"></label>`, rules: { monto: { required: true, number: true, nonNegative: true } }, onSubmit: (d, close) => { if (A.run(() => S.ops.openCash(suc, d.monto), 'Caja abierta', S.suc(suc).nombre)) close(); } });
  }
  function closeCash(suc) {
    const ses = S.cajaAbierta(suc);
    C.formModal({
      title: `Cerrar caja · ${S.suc(suc).nombre}`, size: 'narrow', submit: 'Cerrar caja',
      body: `${C.detailGrid([['Apertura', fmt.dateTime(ses.apertura)], ['Monto inicial', fmt.money(ses.montoInicial)], ['Efectivo esperado', `<b>${fmt.money(ses.montoEsperado)}</b>`]])}
        <label class="field" style="margin-top:12px"><span>Efectivo contado (Bs) *</span><input class="input" type="number" name="contado" min="0" step="0.5" value="${ses.montoEsperado}"><small id="kDif"></small></label>`,
      rules: { contado: { required: true, number: true, nonNegative: true } },
      onOpen: (el, close, f) => { const upd = () => { const d = Math.round((Number(f.contado.value) - ses.montoEsperado) * 100) / 100; el.querySelector('#kDif').textContent = d ? `${d > 0 ? 'Sobrante' : 'Faltante'} de ${fmt.money(Math.abs(d))}` : 'Caja cuadrada'; }; f.contado.addEventListener('input', upd); upd(); },
      onSubmit: (d, close) => { const dif = A.run(() => S.ops.closeCash(suc, d.contado), 'Caja cerrada', (x) => (x ? `Diferencia: ${fmt.money(x)}` : 'Sin diferencias')); if (dif !== null) close(); }
    });
  }

  TOR.views.caja = { render };
})();
