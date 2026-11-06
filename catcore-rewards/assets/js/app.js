/*
 * CorePoints · app.js
 * Portal público del cliente: inicio, registro de compras, consulta de puntos,
 * tienda de recompensas y canjes.
 */
(function () {
  'use strict';
  const CP = window.CP;
  const u = CP.util, ui = CP.ui, esc = u.esc, I = ui.icon;
  const $ = ui.$, $$ = ui.$$;
  const app = document.getElementById('app');
  const db = () => CP.store.db;

  const SESSION_KEY = 'corepoints:session';
  const DRAFT_KEY = 'corepoints:draft';
  const WA_URL = 'https://api.whatsapp.com/send?phone=59160579057&text=' + encodeURIComponent('Hola CatCore, tengo una consulta sobre CorePoints');

  const state = {
    route: 'inicio',
    filters: { q: '', cat: '', type: '', min: '', max: '', affordable: false, sort: 'cost-asc' },
    acctTab: 'compras',
    success: null,
    redirect: null
  };

  /* ---------------- sesión de demostración ---------------- */
  const session = {
    get() {
      try {
        const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
        return s && CP.customers.get(db(), s.customerId) ? s : null;
      } catch (e) { return null; }
    },
    customer() { const s = this.get(); return s ? CP.customers.get(db(), s.customerId) : null; },
    set(cid) { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ customerId: cid, at: new Date().toISOString() })); },
    clear() { sessionStorage.removeItem(SESSION_KEY); }
  };

  /* ---------------- router ---------------- */
  const ROUTES = { '': 'inicio', inicio: 'inicio', registrar: 'registrar', recompensas: 'recompensas', 'mis-puntos': 'mis-puntos' };
  function parseRoute() {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, query] = h.split('?');
    return { name: ROUTES[path] || 'inicio', params: new URLSearchParams(query || '') };
  }
  function go(route) { location.hash = '#/' + (route === 'inicio' ? '' : route); }

  function render(opts) {
    const r = parseRoute();
    const changed = r.name !== state.route;
    state.route = r.name;
    $$('.nav a').forEach((a) => a.classList.toggle('on', a.dataset.route === r.name));
    renderHeader();
    const views = { inicio: viewHome, registrar: viewRegister, recompensas: viewRewards, 'mis-puntos': viewAccount };
    views[r.name](r.params);
    ui.hydrate(app);
    if (changed && !(opts && opts.keepScroll)) window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    const scrollTo = r.params.get('s');
    if (scrollTo) setTimeout(() => { const el = document.getElementById(scrollTo); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 60);
  }

  function renderHeader() {
    const c = session.customer();
    const box = document.getElementById('headCta');
    box.innerHTML = c
      ? '<a class="head-user" href="#/mis-puntos">' + ui.avatar(c.name) + '<span><b>' + u.num(CP.points.available(db(), c.id)) + '</b> pts</span></a>'
      : '<a class="btn btn-primary btn-sm" href="#/registrar">' + I('receipt') + '<span class="btn-label">Registrar compra</span></a>';
  }

  /* =========================================================
     INICIO
     ========================================================= */
  function viewHome() {
    const cfg = db().config;
    const featured = db().rewards.filter((r) => r.active).sort((a, b) => (b.featured - a.featured) || a.cost - b.cost).slice(0, 4);
    const ex = 5000;
    app.innerHTML = '<div class="view">' +
      '<section class="hero"><div class="container hero-grid"><div>' +
      '<span class="eyebrow">' + I('paw') + ' Programa de fidelización CatCore</span>' +
      '<h1>Tus compras en CatCore <span class="grad">tienen recompensa</span></h1>' +
      '<p class="lead">Con <b>CorePoints</b> cada boliviano que inviertes en tu setup suma puntos. Registra tu boleta, acumula y canjea por periféricos, accesorios y servicio técnico.</p>' +
      '<div class="hero-ctas"><a class="btn btn-primary btn-lg" href="#/registrar">' + I('receipt') + 'Registrar mi compra</a>' +
      '<a class="btn btn-ghost btn-lg" href="#/mis-puntos">' + I('coins') + 'Consultar mis puntos</a>' +
      '<a class="btn btn-outline btn-lg" href="#/recompensas">' + I('gift') + 'Explorar recompensas</a></div>' +
      '<div class="hero-badges"><span class="pill">' + I('zap') + ' Bs ' + cfg.bsPerPoint + ' = 1 CorePoint</span><span class="pill">' + I('calendar') + ' Vigencia ' + cfg.validityMonths + ' meses</span>' +
      (cfg.firstPurchaseBonus ? '<span class="pill">' + I('star') + ' +' + cfg.firstPurchaseBonus + ' pts en tu primera compra</span>' : '') + '</div></div>' +
      '<div class="hero-art"><div class="cp-card"><div class="cp-card-top"><span class="cp-word"><span class="a">CORE</span><span class="b">POINTS</span></span><img src="assets/images/catcore-icon.png" alt=""></div>' +
      '<div class="cp-pts"><small>Saldo disponible</small><b>' + u.num(Math.floor(ex / cfg.bsPerPoint)) + ' pts</b></div>' +
      '<div class="cp-card-bot"><div><small>Miembro</small><br><b>Rendimiento que domina</b></div><span class="chip-gold"></span></div></div>' +
      '<div class="floater f1">' + I('check') + '<div><b>Compra verificada</b><small>+' + u.num(Math.floor(ex / cfg.bsPerPoint)) + ' CorePoints</small></div></div>' +
      '<div class="floater f2">' + I('gift') + '<div><b>Mouse gamer RGB</b><small>Listo para recoger</small></div></div></div>' +
      '</div></section>' +

      '<section class="section-sm"><div class="container stat-strip">' +
      '<div class="stat"><b>Bs ' + cfg.bsPerPoint + '</b><span>por cada CorePoint</span></div>' +
      '<div class="stat"><b>' + cfg.validityMonths + ' meses</b><span>de vigencia por acreditación</span></div>' +
      '<div class="stat"><b>' + db().rewards.filter((r) => r.active).length + '</b><span>recompensas disponibles</span></div>' +
      '<div class="stat"><b>24–48 h</b><span>verificación de boletas</span></div></div></section>' +

      '<section class="section" id="como"><div class="container center"><span class="eyebrow">' + I('zap') + ' Así funciona</span>' +
      '<h2 class="section-title">De la tienda a tu recompensa en 5 pasos</h2><p class="section-lead">Compras como siempre con nuestras vendedoras y en la tienda física. CorePoints solo agrega la recompensa.</p>' +
      '<div class="steps">' +
      step('store', 'Compra', 'Elige tu equipo en catcorebo.com, coordina por WhatsApp y paga en tienda.') +
      step('receipt', 'Registra tu boleta', 'Sube una foto de tu boleta desde el celular. Solo eso.') +
      step('shield', 'Verificación', 'CatCore revisa la boleta y valida el monto de la compra.') +
      step('coins', 'Recibe CorePoints', 'Se acreditan Bs ' + cfg.bsPerPoint + ' = 1 punto, con vigencia de ' + cfg.validityMonths + ' meses.') +
      step('gift', 'Canjea recompensas', 'Elige accesorios o servicios y recógelos en la tienda.') +
      '</div></div></section>' +

      '<section class="section" style="padding-top:0"><div class="container split">' +
      '<div class="card info-card"><h3>' + I('coins') + 'Cómo acumular</h3><p class="muted">Por cada Bs ' + cfg.bsPerPoint + ' de compra validada recibes 1 CorePoint (redondeo hacia abajo).</p>' +
      '<ul><li>' + I('check') + '<span>Laptops, combos, componentes y accesorios comprados en CatCore.</span></li>' +
      '<li>' + I('check') + '<span>Compras desde Bs ' + u.num(cfg.minPurchase) + ' generan puntos.</span></li>' +
      (cfg.firstPurchaseBonus ? '<li>' + I('check') + '<span>Bono de bienvenida de <b>' + cfg.firstPurchaseBonus + ' CorePoints</b> en tu primera compra aprobada.</span></li>' : '') +
      '<li>' + I('check') + '<span>Los puntos se acreditan cuando CatCore aprueba tu boleta.</span></li></ul>' +
      '<div class="calc"><label for="calcIn"><b>Calcula tus puntos</b></label><div class="calc-row" style="margin-top:8px"><div class="input-affix"><span>Bs</span><input id="calcIn" type="number" min="0" step="1" value="' + ex + '" inputmode="decimal"></div>' +
      '<div class="calc-out" id="calcOut"></div></div><small>Ejemplo: una compra de Bs 5.000 suma ' + u.num(Math.floor(5000 / cfg.bsPerPoint)) + ' CorePoints.</small></div></div>' +
      '<div class="card info-card"><h3>' + I('gift') + 'Cómo canjear</h3><p class="muted">Usa tus puntos en la tienda de recompensas, independiente del catálogo de productos.</p>' +
      '<ul><li>' + I('check') + '<span>Ingresa con tu número de WhatsApp y elige una recompensa.</span></li>' +
      '<li>' + I('check') + '<span>Reservamos tus puntos al instante y recibes un <b>código de canje</b>.</span></li>' +
      '<li>' + I('check') + '<span>CatCore aprueba el canje y te avisa cuando esté listo para recoger.</span></li>' +
      '<li>' + I('check') + '<span>Presenta tu código en tienda. Si el canje se rechaza, tus puntos vuelven a tu saldo.</span></li></ul>' +
      '<div class="mini-rewards" style="margin-top:18px">' + featured.map((r) => '<a class="mini-reward" href="#/recompensas">' + ui.img(r.image, r.name) + '<div><b>' + esc(r.name) + '</b><small>' + u.num(r.cost) + ' pts</small></div>' + I('right') + '</a>').join('') + '</div>' +
      '<a class="btn btn-outline btn-block" style="margin-top:16px" href="#/recompensas">Ver todas las recompensas ' + I('arrow') + '</a></div>' +
      '</div></section>' +

      '<section class="section" style="padding-top:0"><div class="container"><div class="expiry-box"><div class="big-ic">' + I('clock') + '</div><div>' +
      '<h3>¿Los puntos vencen?</h3><p class="muted" style="margin:0">Sí. Cada acreditación vence <b>' + cfg.validityMonths + ' meses</b> después de la aprobación de la compra.</p>' +
      '<ul><li>Al canjear se usan primero los puntos que vencen antes, así aprovechas todo tu saldo.</li>' +
      '<li>Te avisamos por WhatsApp y correo ' + cfg.expiryWarnDays + ' días antes del vencimiento.</li>' +
      '<li>Los puntos vencidos dejan de estar disponibles y no se pueden recuperar.</li></ul></div></div></div></section>' +

      '<section class="section" id="faq" style="padding-top:0"><div class="container center"><span class="eyebrow">' + I('info') + ' Preguntas frecuentes</span><h2 class="section-title">Todo sobre CorePoints</h2>' +
      '<div class="faq" style="text-align:left">' +
      faq('¿Quién puede participar?', 'Cualquier cliente que compre en la tienda física de CatCore. Tu cuenta se crea automáticamente cuando registras tu primera boleta con tu número de WhatsApp.') +
      faq('¿Cuánto tiempo tengo para registrar mi boleta?', 'Puedes registrar compras de los últimos ' + cfg.validityMonths + ' meses. Te recomendamos hacerlo el mismo día de tu compra.') +
      faq('¿Cuándo recibo mis puntos?', 'Cuando el equipo de CatCore verifica tu boleta, normalmente en 24 a 48 horas hábiles. Mientras tanto la verás como "Pendiente de verificación".') +
      faq('¿Qué pasa si registro una boleta dos veces?', 'Al verificar, CatCore controla el número de cada boleta: una boleta solo suma puntos una vez. Si tu boleta fue rechazada por una foto ilegible, puedes enviarla de nuevo con una foto clara.') +
      faq('¿Puedo canjear puntos por dinero o descuentos?', 'No. Los CorePoints se canjean exclusivamente por las recompensas publicadas en la tienda de recompensas.') +
      faq('¿Qué pasa si me rechazan un canje?', 'Los puntos reservados vuelven a tu saldo disponible de inmediato y te avisamos el motivo.') +
      faq('¿Cómo ingreso a mi cuenta?', 'Solo con tu número de WhatsApp: el mismo que usaste al registrar tu compra.') +
      '</div></div></section></div>';

    const calcIn = $('#calcIn'), calcOut = $('#calcOut');
    const upd = () => {
      const c = CP.points.calc(calcIn.value, cfg, false);
      calcOut.innerHTML = c.belowMin ? '<span class="muted">Monto mínimo Bs ' + u.num(cfg.minPurchase) + '</span>' : '= <b>' + u.num(c.base) + '</b> CorePoints';
    };
    calcIn.addEventListener('input', upd); upd();
  }
  const step = (ic, t, d) => '<div class="step"><div class="step-ic">' + I(ic) + '</div><h4>' + t + '</h4><p>' + d + '</p></div>';
  const faq = (q, a) => '<details><summary>' + esc(q) + I('down') + '</summary><p>' + esc(a) + '</p></details>';

  /* =========================================================
     REGISTRO DE COMPRA
     ========================================================= */
  function loadDraft() { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}'); } catch (e) { return {}; } }
  function saveDraft(d) { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); }

  function viewRegister(params) {
    const okId = params.get('ok');
    if (okId && CP.purchases.get(db(), okId)) { state.success = okId; return viewSuccess(); }
    const cfg = db().config;
    const head = '<section class="page-head"><div class="container"><div class="crumbs"><a href="#/">CorePoints</a> / Registrar compra</div>' +
      '<h1>Registra tu compra</h1><p>Solo necesitas tu WhatsApp y una foto de tu boleta. Nosotros leemos la boleta, la verificamos y acreditamos tus CorePoints.</p></div></section>';
    if (!cfg.purchasesEnabled) {
      app.innerHTML = '<div class="view">' + head + '<div class="container" style="padding:40px 0 80px"><div class="card">' + ui.empty('lock', 'Registro de compras temporalmente cerrado', 'CatCore habilitará nuevamente el registro en breve. Si necesitas ayuda escríbenos por WhatsApp.', '<a class="btn btn-wa" target="_blank" rel="noopener" href="' + WA_URL + '">' + I('whatsapp') + 'Escribir por WhatsApp</a>') + '</div></div></div>';
      return;
    }
    const me = session.customer();
    const draft = loadDraft();
    const val = (k, def) => (draft[k] != null && draft[k] !== '' ? draft[k] : def == null ? '' : def);
    const phoneLocal = (p) => (p ? String(p).replace(/^591/, '') : '');
    app.innerHTML = '<div class="view">' + head + '<div class="container reg-layout">' +
      '<form id="regForm" novalidate>' +
      '<div class="card form-section"><h3><span class="n">1</span>Tus datos</h3><div class="form-grid">' +
      ui.field({ name: 'phone', label: 'Número de WhatsApp', required: true, prefix: '+591', value: val('phone', me && phoneLocal(me.phone)), inputmode: 'tel', placeholder: '7XXXXXXX', maxlength: 12, autocomplete: 'tel-national', hint: 'Lo usarás para consultar tus puntos.' }) +
      ui.field({ name: 'email', label: 'Correo electrónico', optional: true, type: 'email', value: val('email', me && me.email), autocomplete: 'email', placeholder: 'tucorreo@ejemplo.com', hint: 'Para recibir avisos por correo.' }) +
      '</div></div>' +
      '<div class="card form-section"><h3><span class="n">2</span>Fotografías</h3><div class="form-grid">' +
      '<div class="field field-wide" data-field="receiptImg"><label>Fotografía de la boleta <i class="req">*</i></label><div id="upReceipt"></div><small class="hint">Que se lean el número de boleta, la fecha y el total. Puedes tomarla con la cámara del celular.</small><small class="err"></small></div>' +
      '<div class="field field-wide" data-field="chatImg"><label>Captura de la conversación de WhatsApp <small class="opt">(opcional)</small></label><div id="upChat"></div><small class="hint">Nos ayuda a confirmar qué vendedora te atendió.</small><small class="err"></small></div>' +
      '</div></div>' +
      '<div class="submit-row"><span class="draft-note">' + I('shield') + 'Tu avance se guarda en este navegador.</span>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" class="btn btn-ghost" id="clearDraft">' + I('trash') + 'Limpiar</button>' +
      '<button type="submit" class="btn btn-primary btn-lg" id="regSubmit">' + I('check') + 'Enviar registro</button></div></div>' +
      '</form>' +
      '<aside class="aside-sticky"><div class="card est-card"><small>Así sumas puntos</small><div class="big">Bs ' + cfg.bsPerPoint + '</div><small>= 1 CorePoint · tomamos el total de tu boleta al verificarla' + (cfg.firstPurchaseBonus ? ' · +' + cfg.firstPurchaseBonus + ' pts en tu primera compra' : '') + '</small></div>' +
      '<div class="card"><h4 style="margin-bottom:12px">Antes de enviar</h4><ul class="check-list">' +
      '<li>' + I('check') + '<span>Foto nítida, con buena luz y la boleta completa.</span></li>' +
      '<li>' + I('check') + '<span>Que se vean el número de boleta, la fecha y el total.</span></li>' +
      '<li>' + I('check') + '<span>Cada boleta suma puntos una sola vez.</span></li>' +
      '<li>' + I('check') + '<span>Tus puntos se acreditan cuando CatCore aprueba la compra.</span></li></ul></div>' +
      '<div class="alert alert-pink">' + I('info') + '<p>Prototipo: las fotos se guardan en IndexedDB de este navegador y las verá el panel administrativo abierto en este mismo navegador.</p></div></aside>' +
      '</div></div>';

    const form = $('#regForm');
    const maxMB = () => db().config.maxImageMB;
    const persist = () => { const v = ui.formValues(form); v.receiptImg = upR.value; v.chatImg = upC.value; saveDraft(v); };
    const upR = ui.uploader($('#upReceipt'), { label: 'Boleta', kind: 'boleta', icon: 'receipt', value: draft.receiptImg, owned: true, maxMB, onChange: () => { persist(); $('[data-field="receiptImg"]').classList.remove('has-err'); } });
    const upC = ui.uploader($('#upChat'), { label: 'Captura de WhatsApp', kind: 'chat', icon: 'whatsapp', value: draft.chatImg, owned: true, maxMB, onChange: persist });
    form.addEventListener('input', u.debounce(() => { persist(); }, 250));
    $('#clearDraft').onclick = async () => {
      if (!(await ui.confirm({ title: 'Limpiar formulario', message: 'Se borrarán los datos ingresados y las fotos cargadas.', confirmLabel: 'Limpiar', danger: true }))) return;
      upR.reset(true); upC.reset(true);
      localStorage.removeItem(DRAFT_KEY);
      render();
    };
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = ui.formValues(form);
      v.phone = '591' + String(v.phone).replace(/\D/g, '').replace(/^591/, '');
      v.receiptImg = upR.value; v.chatImg = upC.value;
      const btn = $('#regSubmit');
      btn.disabled = true;
      try {
        const res = CP.store.tx((d) => CP.purchases.register(d, v));
        upR.commit(); upC.commit();
        localStorage.removeItem(DRAFT_KEY);
        state.success = res.purchase.id;
        location.hash = '#/registrar?ok=' + res.purchase.id;
        ui.toast('Compra registrada: ' + res.purchase.id, 'success');
      } catch (err) {
        btn.disabled = false;
        if (err.fields) {
          ui.setErrors(form, err.fields);
          if (err.fields.receiptImg) $('#upReceipt').classList.add('has-err');
          ui.toast(err.message, 'error');
        } else ui.toast(err.message, 'error');
      }
    });
  }

  function viewSuccess() {
    const p = CP.purchases.get(db(), state.success);
    if (!p) { state.success = null; return go('registrar'); }
    const c = CP.customers.get(db(), p.customerId);
    app.innerHTML = '<div class="view container"><div class="success"><div class="success-ic">' + I('check') + '</div>' +
      '<h1>¡Compra registrada!</h1><p class="muted">Recibimos la foto de tu boleta. La revisaremos y te avisaremos por WhatsApp' + (c.email ? ' y correo' : '') + ' cuando tus CorePoints estén acreditados.</p>' +
      '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px"><div><small class="muted">Código de solicitud</small><div class="req-id mono">' + esc(p.id) + '</div></div>' + ui.purchaseBadge(p.status) + '</div>' +
      '<dl class="kv"><dt>Cliente</dt><dd>' + esc(c.name) + '</dd><dt>WhatsApp</dt><dd>' + u.fmtPhone(c.phone) + '</dd>' + (c.email ? '<dt>Correo</dt><dd>' + esc(c.email) + '</dd>' : '') +
      '<dt>Fotos enviadas</dt><dd>' + (p.chatImg ? 'Boleta y chat de WhatsApp' : 'Boleta') + '</dd><dt>Puntos</dt><dd class="text-cyan">Se calculan al verificar la boleta</dd></dl>' +
      '<div class="success-thumbs">' + [['receiptImg', 'Boleta'], ['chatImg', 'Chat']].filter((k) => p[k[0]]).map((k, i) => '<button type="button" data-view="' + i + '" title="Ampliar ' + k[1] + '">' + ui.img(p[k[0]], k[1]) + '</button>').join('') + '</div>' +
      (p.customerCreated ? '<div class="alert alert-ok" style="margin-top:16px">' + I('user') + '<p>Creamos tu cuenta CorePoints con el número ' + u.fmtPhone(c.phone) + '.</p></div>' : '') +
      '</div><div class="success-actions"><a class="btn btn-primary" href="#/mis-puntos" id="toAcct">' + I('coins') + 'Consultar mis puntos</a><a class="btn btn-ghost" href="#/registrar" id="again">' + I('plus') + 'Registrar otra compra</a></div></div></div>';
    const imgs = [['receiptImg', 'Foto de la boleta'], ['chatImg', 'Conversación de WhatsApp']].filter((k) => p[k[0]]).map((k) => ({ id: p[k[0]], label: k[1] }));
    $$('[data-view]').forEach((b) => (b.onclick = () => ui.viewer(imgs, +b.dataset.view)));
    $('#again').onclick = () => { state.success = null; };
    $('#toAcct').onclick = () => { state.success = null; state.prefillPhone = c.phone; };
  }

  /* =========================================================
     MIS PUNTOS (ingreso + cuenta)
     ========================================================= */
  function viewAccount() {
    const c = session.customer();
    if (!c) return viewLogin();
    const d = db();
    const now = CP.now();
    const bal = CP.points.balance(d, c.id, now);
    const stats = CP.customers.stats(d, c.id, now);
    const purchases = d.purchases.filter((p) => p.customerId === c.id).sort(u.byDateDesc('createdAt'));
    const reds = d.redemptions.filter((r) => r.customerId === c.id).sort(u.byDateDesc('createdAt'));
    const movs = d.movements.filter((m) => m.customerId === c.id).sort(u.byDateDesc('at'));
    const notifs = CP.notifications.forCustomer(d, c.id);
    const unread = notifs.filter((n) => !n.read).length;
    const reachable = d.rewards.filter((r) => r.active && CP.rewards.inStock(r)).sort((a, b) => a.cost - b.cost);
    const months = ui.months(6, now).map((m) => ({ label: m.label, key: m.key, value: 0, value2: 0 }));
    movs.forEach((m) => {
      const row = months.find((x) => x.key === ui.monthKey(m.at));
      if (!row) return;
      if (['acreditacion', 'bono'].includes(m.type) || (m.type === 'ajuste' && m.points > 0)) row.value += m.points;
      if (m.type === 'canje') row.value2 += m.amount;
    });
    const tabs = [['compras', 'Compras', purchases.length], ['movimientos', 'Movimientos', movs.length], ['canjes', 'Canjes', reds.length], ['avisos', 'Notificaciones', unread]];

    app.innerHTML = '<div class="view container">' +
      '<div class="acct-head"><div class="who">' + ui.avatar(c.name, 'lg') + '<div><small>Cuenta CorePoints</small><h1>' + esc(c.name) + '</h1><small>' + I('whatsapp') + ' ' + u.fmtPhone(c.phone) + (c.email ? ' · ' + esc(c.email) : '') + ' · cliente desde ' + u.date(c.createdAt) + '</small></div></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn-primary" href="#/registrar">' + I('receipt') + 'Registrar compra</a><button class="btn btn-ghost" id="logout">' + I('logout') + 'Salir</button></div></div>' +
      (bal.expiring ? '<div class="alert alert-warn" style="margin-bottom:16px">' + I('clock') + '<p><b>' + u.num(bal.expiring) + ' CorePoints vencen pronto.</b> El próximo vencimiento es el ' + u.date(bal.nextExpiry.date) + ' (' + u.relDays(bal.nextExpiry.date, now) + '). <a href="#/recompensas">Canjéalos ahora →</a></p></div>' : '') +
      '<div class="kpis">' +
      '<div class="kpi main"><span>' + I('coins') + 'CorePoints disponibles</span><b id="balAvail">' + u.num(bal.available) + '</b><small>Equivale a Bs ' + u.num(bal.available * d.config.bsPerPoint) + ' en compras</small></div>' +
      '<div class="kpi warn"><span>' + I('clock') + 'Compras en verificación</span><b>' + stats.pendingPurchases + '</b><small>Los puntos se calculan al verificar</small></div>' +
      '<div class="kpi pink"><span>' + I('lock') + 'Reservados en canjes</span><b>' + u.num(bal.reserved) + '</b><small>Esperando aprobación</small></div>' +
      '<div class="kpi"><span>' + I('gift') + 'Utilizados</span><b>' + u.num(bal.used) + '</b><small>En ' + reds.filter((r) => ['aprobado', 'listo', 'entregado'].includes(r.status)).length + ' canje(s)</small></div>' +
      '<div class="kpi ' + (bal.expiring ? 'warn' : '') + '"><span>' + I('alert') + 'Por vencer</span><b>' + u.num(bal.expiring) + '</b><small>' + (bal.nextExpiry ? 'Próximo: ' + u.date(bal.nextExpiry.date) : 'En los próximos ' + d.config.expiryWarnDays + ' días') + '</small></div>' +
      '<div class="kpi bad"><span>' + I('x') + 'Vencidos</span><b>' + u.num(bal.expired) + '</b><small>Ya no disponibles</small></div>' +
      '</div>' +
      '<div class="acct-grid"><div class="card"><div class="card-head"><h3>' + I('chart') + 'Distribución de tus puntos</h3></div>' +
      (bal.earned ? ui.donut([
        { label: 'Disponibles', value: bal.available, cls: 'c-cyan' }, { label: 'Reservados', value: bal.reserved, cls: 'c-pink' },
        { label: 'Utilizados', value: bal.used, cls: 'c-violet' }, { label: 'Vencidos', value: bal.expired, cls: 'c-bad' },
        { label: 'Ajustes (−)', value: bal.adjustedOut, cls: 'c-muted' }
      ].filter((s) => s.value || s.label !== 'Ajustes (−)'), { center: u.num(bal.earned), centerLabel: 'pts ganados' }) : ui.empty('coins', 'Aún no tienes puntos acreditados', bal.pending ? 'Tus compras están en verificación.' : 'Registra tu primera compra para empezar.')) +
      '</div><div class="card"><div class="card-head"><h3>' + I('history') + 'Últimos 6 meses</h3></div>' +
      ui.barChart(months, { series: [{ key: 'value', cls: 'b1', label: 'Ganados' }, { key: 'value2', cls: 'b2', label: 'Canjeados' }], title: 'Puntos por mes', height: 200 }) + '</div></div>' +
      '<div class="card" style="margin-bottom:18px"><div class="card-head"><h3>' + I('gift') + 'Recompensas para ti</h3><a href="#/recompensas" class="btn btn-sm btn-ghost">Ver catálogo ' + I('arrow') + '</a></div>' +
      '<div class="rewards-grid">' + reachable.slice(0, 4).map((r) => rewardCard(r, bal.available)).join('') + '</div></div>' +
      '<div class="card" style="margin-bottom:60px"><div class="tabs" role="tablist">' + tabs.map((t) => '<button class="tab' + (state.acctTab === t[0] ? ' on' : '') + '" data-tab="' + t[0] + '" role="tab">' + t[1] + (t[2] ? ' <span class="count">' + t[2] + '</span>' : '') + '</button>').join('') + '</div><div id="tabBody"></div></div>' +
      '</div>';

    const tabBody = $('#tabBody');
    const renderTab = () => {
      $$('.tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === state.acctTab));
      if (state.acctTab === 'compras') tabBody.innerHTML = purchases.length ? purchasesTable(purchases) : ui.empty('receipt', 'Sin compras registradas', '', '<a class="btn btn-primary btn-sm" href="#/registrar">Registrar compra</a>');
      if (state.acctTab === 'movimientos') tabBody.innerHTML = movs.length ? movementsTable(movs) : ui.empty('history', 'Sin movimientos', 'Aquí verás acreditaciones, canjes y vencimientos.');
      if (state.acctTab === 'canjes') tabBody.innerHTML = reds.length ? redemptionsTable(reds) : ui.empty('gift', 'Aún no hiciste canjes', '', '<a class="btn btn-primary btn-sm" href="#/recompensas">Explorar recompensas</a>');
      if (state.acctTab === 'avisos') tabBody.innerHTML = notifs.length ? '<div class="notif-list">' + notifs.map((n) => notifItem(d, n)).join('') + '</div>' : ui.empty('bell', 'Sin notificaciones');
      ui.hydrate(tabBody);
    };
    $$('.tab').forEach((t) => (t.onclick = () => { state.acctTab = t.dataset.tab; renderTab(); }));
    renderTab();
    $('#logout').onclick = () => { session.clear(); ui.toast('Sesión cerrada', 'info'); render(); };
    tabBody.addEventListener('click', (e) => {
      const p = e.target.closest('[data-purchase]'); if (p) return purchaseModal(p.dataset.purchase);
      const cancel = e.target.closest('[data-cancel]'); if (cancel) { e.stopPropagation(); return cancelRedemption(cancel.dataset.cancel); }
      const r = e.target.closest('[data-red]'); if (r) return redemptionModal(r.dataset.red);
      const n = e.target.closest('[data-notif]'); if (n) return notifModal(n.dataset.notif);
    });
    bindRewardButtons(app);
  }

  function purchasesTable(list) {
    const dash = (x) => x || '<span class="muted">—</span>';
    return '<div class="table-wrap stack"><table class="table"><thead><tr><th>Solicitud</th><th>Enviada</th><th>Boleta</th><th>Fecha compra</th><th class="num">Monto</th><th>Vendedora</th><th class="num">Puntos</th><th>Estado</th></tr></thead><tbody>' +
      list.map((p) => {
        const ok = p.status === 'aprobada';
        const pts = ok ? '<span class="pts-plus">+' + u.num(p.points + (p.bonus || 0)) + '</span>' : p.status === 'pendiente' ? '<span class="est">al verificar</span>' : '<span class="muted">—</span>';
        return '<tr class="clickable" data-purchase="' + p.id + '"><td data-l="Solicitud" class="mono">' + p.id + '</td><td data-l="Enviada">' + u.date(p.createdAt) + '</td><td data-l="Boleta">' + (p.receiptNo ? esc(p.receiptNo) : '<span class="muted">' + CP.purchases.receiptLabel(p) + '</span>') + '</td>' +
          '<td data-l="Fecha compra">' + dash(ok && u.date(u.fromIsoDay(p.date))) + '</td><td data-l="Monto" class="num">' + dash(ok && u.bs(p.validatedAmount)) + '</td><td data-l="Vendedora">' + dash(ok && esc(CP.sellers.name(db(), p.validatedSellerId))) + '</td>' +
          '<td data-l="Puntos" class="num">' + pts + '</td><td data-l="Estado">' + ui.purchaseBadge(p.status) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function movementsTable(list) {
    return '<div class="table-wrap stack"><table class="table"><thead><tr><th>Fecha</th><th>Movimiento</th><th>Detalle</th><th class="num">Puntos</th><th class="num">Saldo</th></tr></thead><tbody>' +
      list.map((m) => {
        const t = CP.points.MOVEMENT_TYPES[m.type];
        const pts = m.type === 'canje' ? '<span class="pts-zero">' + u.num(m.amount) + '</span> <span class="est">confirmado</span>' : '<span class="' + (m.points >= 0 ? 'pts-plus' : 'pts-minus') + '">' + (m.points >= 0 ? '+' : '−') + u.num(Math.abs(m.points)) + '</span>';
        return '<tr><td data-l="Fecha" class="nowrap">' + u.dateTime(m.at) + '</td><td data-l="Movimiento">' + ui.badge(t.label, t.tone) + '</td><td data-l="Detalle">' + esc(m.note || '') + '</td><td data-l="Puntos" class="num">' + pts + '</td><td data-l="Saldo" class="num">' + u.num(m.balanceAfter) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function redemptionsTable(list) {
    return '<div class="table-wrap stack"><table class="table"><thead><tr><th>Código</th><th>Recompensa</th><th class="num">Puntos</th><th>Solicitado</th><th>Estado</th><th></th></tr></thead><tbody>' +
      list.map((r) => '<tr class="clickable" data-red="' + r.id + '"><td data-l="Código" class="mono">' + r.code + '</td><td data-l="Recompensa">' + esc(r.rewardName) + '</td><td data-l="Puntos" class="num">' + u.num(r.points) + '</td><td data-l="Solicitado">' + u.date(r.createdAt) + '</td><td data-l="Estado">' + ui.redemptionBadge(r.status) + '</td>' +
        '<td class="actions">' + (r.status === 'pendiente' ? '<button class="btn btn-sm btn-danger-ghost" data-cancel="' + r.id + '">Cancelar</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>';
  }
  function notifItem(d, n) {
    const ev = CP.notifications.EVENTS[n.event];
    const k = CP.notifications.content(d, n);
    return '<button class="notif' + (n.read ? '' : ' unread') + '" data-notif="' + n.id + '"><span class="n-ic ' + ev.tone + '">' + I(ev.icon) + '</span><div><b>' + esc(k.subject) + '</b><p>' + esc(k.body) + '</p></div><time>' + u.date(n.at) + '</time></button>';
  }

  function purchaseModal(id) {
    const d = db();
    const p = CP.purchases.get(d, id);
    if (!p) return;
    const imgs = [['receiptImg', 'Foto de la boleta'], ['chatImg', 'Conversación de WhatsApp']].filter((k) => p[k[0]]).map((k) => ({ id: p[k[0]], label: k[1] }));
    const ok = p.status === 'aprobada';
    const m = ui.modal({
      title: 'Compra ' + p.id, subtitle: p.receiptNo ? 'Boleta ' + esc(p.receiptNo) : 'Enviada el ' + u.dateTime(p.createdAt), icon: 'receipt', size: 'md',
      body: '<div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:14px">' + ui.purchaseBadge(p.status) + (ok ? '<span class="pts-plus">+' + u.num(p.points + (p.bonus || 0)) + ' pts</span>' : '') + '</div>' +
        (p.status === 'rechazada' ? '<div class="alert alert-bad" style="margin-bottom:14px">' + I('alert') + '<p><b>Motivo:</b> ' + esc(p.rejectReason) + (p.adminNotes ? '<br>' + esc(p.adminNotes) : '') + '</p></div>' : '') +
        (p.status === 'pendiente' ? '<div class="alert alert-info" style="margin-bottom:14px">' + I('clock') + '<p>Estamos revisando tu boleta. Al verificarla registraremos el número, la fecha, el monto y la vendedora, y acreditaremos tus puntos.</p></div>' : '') +
        '<dl class="kv"><dt>Enviada</dt><dd>' + u.dateTime(p.createdAt) + '</dd>' +
        (ok ? '<dt>Boleta</dt><dd>' + esc(p.receiptNo) + '</dd><dt>Fecha de compra</dt><dd>' + u.date(u.fromIsoDay(p.date)) + '</dd><dt>Monto</dt><dd>' + u.bs(p.validatedAmount) + '</dd><dt>Vendedora</dt><dd>' + esc(CP.sellers.name(d, p.validatedSellerId)) + '</dd>' +
          (p.product ? '<dt>Producto</dt><dd>' + esc(p.product) + '</dd>' : '') + '<dt>Puntos acreditados</dt><dd>' + u.num(p.points) + (p.bonus ? ' + ' + p.bonus + ' bono' : '') + '</dd><dt>Vencen el</dt><dd>' + u.date(p.expiresAt) + '</dd>' : '') + '</dl>' +
        '<div class="success-thumbs">' + imgs.map((im, i) => '<button type="button" data-view="' + i + '">' + ui.img(im.id, im.label) + '</button>').join('') + '</div>' +
        '<h4 style="margin:20px 0 12px">Seguimiento</h4>' + ui.timeline(p.history, (s) => ({ label: CP.purchases.STATUS[s].label, tone: CP.purchases.STATUS[s].tone }))
    });
    ui.hydrate(m.body);
    $$('[data-view]', m.body).forEach((b) => (b.onclick = () => ui.viewer(imgs, +b.dataset.view)));
  }

  function redemptionModal(id) {
    const d = db();
    const r = CP.redemptions.get(d, id);
    if (!r) return;
    const rw = CP.rewards.get(d, r.rewardId);
    const st = CP.redemptions.STATUS[r.status];
    const m = ui.modal({
      title: r.rewardName, subtitle: 'Canje ' + r.code, icon: 'gift', size: 'md',
      body: '<div class="redeem-summary">' + ui.img(rw ? rw.image : 'art:gift', r.rewardName) + '<div>' + ui.redemptionBadge(r.status) + '<p class="muted" style="margin:8px 0 0">' + esc(st.desc) + '</p></div></div>' +
        '<div class="code-box"><div><small class="muted">Código de canje</small><br><b>' + r.code + '</b></div><button class="btn btn-sm btn-ghost" data-copy="' + r.code + '">' + I('copy') + 'Copiar</button></div>' +
        '<dl class="kv" style="margin-top:16px"><dt>Puntos</dt><dd>' + u.num(r.points) + '</dd><dt>Solicitado</dt><dd>' + u.dateTime(r.createdAt) + '</dd>' + (r.closedReason ? '<dt>Motivo</dt><dd>' + esc(r.closedReason) + '</dd>' : '') + '</dl>' +
        '<h4 style="margin:20px 0 12px">Seguimiento</h4>' + ui.timeline(r.history, (s) => CP.redemptions.STATUS[s]),
      actions: r.status === 'pendiente' ? [{ label: 'Cancelar canje', cls: 'btn-danger-ghost', onClick: () => { cancelRedemption(id); } }, { label: 'Cerrar', cls: 'btn-primary' }] : [{ label: 'Cerrar', cls: 'btn-primary' }]
    });
    ui.hydrate(m.body);
    const cb = m.body.querySelector('[data-copy]'); if (cb) cb.onclick = () => ui.copy(cb.dataset.copy);
  }

  async function cancelRedemption(id) {
    const r = CP.redemptions.get(db(), id);
    if (!r) return;
    const ok = await ui.confirm({ title: 'Cancelar canje', message: '¿Cancelar el canje de <b>' + esc(r.rewardName) + '</b>? Los <b>' + u.num(r.points) + ' puntos</b> reservados volverán a tu saldo.', confirmLabel: 'Sí, cancelar', danger: true });
    if (!ok) return;
    ui.safe(() => CP.store.tx((d) => CP.redemptions.transition(d, id, 'cancelar', { note: 'Cancelado por el cliente desde el portal', actor: 'cliente' })), 'Canje cancelado. Puntos devueltos a tu saldo.');
    ui.closeAll();
    render({ keepScroll: true });
  }

  function notifModal(id) {
    const d = db();
    const n = d.notifications.find((x) => x.id === id);
    if (!n) return;
    if (!n.read) CP.store.tx((x) => { const t = x.notifications.find((y) => y.id === id); if (t) t.read = true; });
    ui.notificationPreview(CP.store.db, n, 'assets/images/catcore-logo.png');
    render({ keepScroll: true });
  }


  function viewLogin() {
    const prefill = state.prefillPhone ? String(state.prefillPhone).replace(/^591/, '') : '';
    state.prefillPhone = null;
    const demo = db().customers.slice(0, 4);
    app.innerHTML = '<div class="view"><section class="page-head"><div class="container"><div class="crumbs"><a href="#/">CorePoints</a> / Mis puntos</div><h1>Consulta tus CorePoints</h1><p>Ingresa con tu número de WhatsApp para ver tu saldo, compras y canjes.</p></div></section>' +
      '<div class="container"><div class="login-wrap"><div class="card" id="loginCard"></div>' +
      '<div class="demo-accounts">Cuentas de demostración: <div class="chips">' + demo.map((c) => '<button class="chip" data-demo="' + c.phone.slice(3) + '">' + esc(c.name.split(' ')[0]) + ' · ' + c.phone.slice(3) + '</button>').join('') + '</div></div></div></div></div>';
    const card = $('#loginCard');
    // Ingreso directo con el número de WhatsApp (sin código de verificación)
    card.innerHTML = '<h3 style="display:flex;gap:.5em;align-items:center">' + I('whatsapp') + 'Ingresa tu número</h3><p class="muted">Usa el mismo número de WhatsApp con el que registraste tus compras.</p>' +
      '<form id="phoneForm" class="form-grid one" novalidate>' + ui.field({ name: 'phone', label: 'Número de WhatsApp', prefix: '+591', required: true, value: prefill, inputmode: 'tel', placeholder: '7XXXXXXX', autocomplete: 'tel-national' }) +
      '<button class="btn btn-primary btn-block btn-lg" type="submit">Ver mis puntos ' + I('arrow') + '</button></form>';
    const f = $('#phoneForm');
    f.phone.focus();
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const phone = u.normPhone(f.phone.value);
      if (!phone) return ui.setErrors(f, { phone: 'Ingresa un celular boliviano de 8 dígitos.' });
      const c = CP.customers.findByPhone(db(), phone);
      if (!c) return ui.setErrors(f, { phone: 'No encontramos una cuenta con este número. Tu cuenta se crea al registrar tu primera compra.' });
      session.set(c.id);
      ui.toast(c.nameProvided === false ? '¡Bienvenido!' : '¡Bienvenido, ' + c.name.split(' ')[0] + '!', 'success');
      if (state.redirect) { const r = state.redirect; state.redirect = null; location.hash = r; } else render();
    });
    $$('[data-demo]').forEach((b) => (b.onclick = () => { f.phone.value = b.dataset.demo; f.requestSubmit(); }));
  }

  /* =========================================================
     RECOMPENSAS
     ========================================================= */
  function rewardCard(r, avail) {
    const logged = avail != null;
    const can = logged && r.active && CP.rewards.inStock(r) && avail >= r.cost;
    const pct = logged ? Math.min(100, Math.round((avail / r.cost) * 100)) : 0;
    const out = !CP.rewards.inStock(r);
    return '<article class="reward' + (can ? ' can' : '') + (out ? ' off' : '') + '" data-reward="' + r.id + '">' +
      (r.featured ? '<span class="reward-ribbon">TOP</span>' : '') +
      '<div class="reward-img">' + ui.img(r.image, r.name) + '<div class="reward-tags">' + ui.badge(CP.rewards.TYPES[r.type], r.type === 'servicio' ? 'accent' : 'cyan', r.type === 'servicio' ? 'wrench' : 'package') + '</div></div>' +
      '<div class="reward-body"><div class="reward-meta"><span>' + esc(r.category) + '</span><span class="' + (out ? 'text-bad' : '') + '">' + esc(CP.rewards.stockLabel(r)) + '</span></div>' +
      '<h4>' + esc(r.name) + '</h4><p>' + esc(r.description) + '</p>' +
      (logged && !can && !out ? '<div class="progress" title="' + pct + '%"><i style="width:' + pct + '%"></i></div><span class="need">Te faltan ' + u.num(r.cost - avail) + ' pts</span>' : '') +
      '<div class="reward-foot"><span class="reward-cost">' + u.num(r.cost) + '<small>pts</small></span>' +
      '<button class="btn btn-sm ' + (can || !logged ? 'btn-primary' : 'btn-ghost') + '" data-redeem="' + r.id + '"' + (out ? ' disabled' : '') + '>' + (out ? 'Agotado' : 'Canjear') + '</button></div></div></article>';
  }

  function viewRewards() {
    const d = db();
    const c = session.customer();
    const avail = c ? CP.points.available(d, c.id) : null;
    const f = state.filters;
    app.innerHTML = '<div class="view"><section class="page-head"><div class="container"><div class="crumbs"><a href="#/">CorePoints</a> / Recompensas</div><h1>Tienda de recompensas</h1><p>Canjea tus CorePoints por periféricos, accesorios y servicio técnico. Catálogo exclusivo del programa, independiente de la tienda de productos.</p></div></section>' +
      '<div class="container" style="padding:26px 0 70px">' +
      (c ? '<div class="balance-strip"><span>' + ui.avatar(c.name) + ' Hola <b style="color:var(--text);font-size:1rem">' + esc(c.name.split(' ')[0]) + '</b>, tienes <b>' + u.num(avail) + ' CorePoints</b> disponibles</span><a class="btn btn-sm btn-ghost" href="#/mis-puntos">Ver mi cuenta</a></div>'
        : '<div class="balance-strip"><span>' + I('lock') + ' Ingresa para ver qué recompensas puedes canjear con tu saldo.</span><a class="btn btn-sm btn-primary" href="#/mis-puntos" id="loginFromRewards">Consultar mis puntos</a></div>') +
      (d.config.redemptionsEnabled ? '' : '<div class="alert alert-warn" style="margin-bottom:16px">' + I('alert') + '<p>Los canjes están temporalmente deshabilitados. Puedes explorar el catálogo.</p></div>') +
      '<div class="card filters-card"><div class="filters-row">' +
      '<div class="toolbar" style="margin:0;flex:1"><div class="search">' + I('search') + '<input id="fQ" type="search" placeholder="Buscar recompensa…" value="' + esc(f.q) + '"></div>' +
      '<select id="fCat"><option value="">Todas las categorías</option>' + CP.rewards.CATEGORIES.map((x) => '<option' + (f.cat === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select>' +
      '<div class="range-pair"><input id="fMin" type="number" min="0" placeholder="Mín. pts" value="' + esc(f.min) + '"><span class="muted">–</span><input id="fMax" type="number" min="0" placeholder="Máx. pts" value="' + esc(f.max) + '"></div>' +
      '<select id="fSort"><option value="cost-asc"' + (f.sort === 'cost-asc' ? ' selected' : '') + '>Menor costo</option><option value="cost-desc"' + (f.sort === 'cost-desc' ? ' selected' : '') + '>Mayor costo</option><option value="name"' + (f.sort === 'name' ? ' selected' : '') + '>Nombre</option></select></div></div>' +
      '<div class="filters-row" style="margin-top:12px;justify-content:space-between"><div class="chips">' + [['', 'Todo'], ['producto', 'Productos'], ['servicio', 'Servicios']].map((t) => '<button class="chip' + (f.type === t[0] ? ' on' : '') + '" data-type="' + t[0] + '">' + t[1] + '</button>').join('') +
      (c ? '<button class="chip' + (f.affordable ? ' on' : '') + '" id="fAff">' + I('check') + ' Puedo canjear</button>' : '') + '</div><span class="result-count" id="rCount"></span></div></div>' +
      '<div class="rewards-grid" id="rGrid"></div></div></div>';

    const grid = $('#rGrid');
    const draw = () => {
      let list = d.rewards.filter((r) => r.active);
      const q = f.q.trim().toLowerCase();
      if (q) list = list.filter((r) => (r.name + ' ' + r.description + ' ' + r.category).toLowerCase().includes(q));
      if (f.cat) list = list.filter((r) => r.category === f.cat);
      if (f.type) list = list.filter((r) => r.type === f.type);
      if (f.min !== '') list = list.filter((r) => r.cost >= Number(f.min));
      if (f.max !== '') list = list.filter((r) => r.cost <= Number(f.max));
      if (f.affordable && c) list = list.filter((r) => r.cost <= avail && CP.rewards.inStock(r));
      list.sort(f.sort === 'name' ? (a, b) => a.name.localeCompare(b.name) : f.sort === 'cost-desc' ? (a, b) => b.cost - a.cost : (a, b) => a.cost - b.cost);
      $('#rCount').textContent = list.length + (list.length === 1 ? ' recompensa' : ' recompensas') + (c ? ' · ' + list.filter((r) => r.cost <= avail && CP.rewards.inStock(r)).length + ' alcanzables' : '');
      grid.innerHTML = list.length ? list.map((r) => rewardCard(r, avail)).join('') : '<div style="grid-column:1/-1">' + ui.empty('search', 'No hay recompensas con esos filtros', 'Prueba con otra categoría o rango de puntos.', '<button class="btn btn-ghost btn-sm" id="fReset">Limpiar filtros</button>') + '</div>';
      ui.hydrate(grid);
      const rb = $('#fReset'); if (rb) rb.onclick = () => { state.filters = { q: '', cat: '', type: '', min: '', max: '', affordable: false, sort: 'cost-asc' }; render({ keepScroll: true }); };
    };
    $('#fQ').addEventListener('input', u.debounce((e) => { f.q = e.target.value; draw(); }, 150));
    $('#fCat').onchange = (e) => { f.cat = e.target.value; draw(); };
    $('#fSort').onchange = (e) => { f.sort = e.target.value; draw(); };
    $('#fMin').addEventListener('input', u.debounce((e) => { f.min = e.target.value; draw(); }, 250));
    $('#fMax').addEventListener('input', u.debounce((e) => { f.max = e.target.value; draw(); }, 250));
    $$('[data-type]').forEach((b) => (b.onclick = () => { f.type = b.dataset.type; $$('[data-type]').forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
    const aff = $('#fAff'); if (aff) aff.onclick = () => { f.affordable = !f.affordable; aff.classList.toggle('on', f.affordable); draw(); };
    const lr = $('#loginFromRewards'); if (lr) lr.onclick = () => { state.redirect = '#/recompensas'; };
    draw();
    bindRewardButtons(app);
  }

  function bindRewardButtons(root) {
    if (root.dataset.rbound) return;
    root.dataset.rbound = '1';
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-redeem]');
      if (b && !b.disabled) redeemFlow(b.dataset.redeem);
    });
  }

  function redeemFlow(rewardId) {
    const d = db();
    const r = CP.rewards.get(d, rewardId);
    const c = session.customer();
    if (!r) return;
    if (!c) {
      return ui.modal({
        title: 'Ingresa para canjear', icon: 'lock', size: 'sm',
        body: '<p class="confirm-text">Para canjear <b>' + esc(r.name) + '</b> necesitas ingresar con tu número de WhatsApp.</p>',
        actions: [{ label: 'Cancelar', cls: 'btn-ghost' }, { label: 'Ingresar', cls: 'btn-primary', onClick: () => { state.redirect = '#/recompensas'; go('mis-puntos'); } }]
      });
    }
    const avail = CP.points.available(d, c.id);
    const why = CP.redemptions.check(d, c.id, r.id);
    const after = avail - r.cost;
    const m = ui.modal({
      title: 'Confirmar canje', icon: 'gift', size: 'md',
      body: '<div class="redeem-summary">' + ui.img(r.image, r.name) + '<div><span class="muted" style="font-size:.85rem">' + esc(r.category) + ' · ' + CP.rewards.TYPES[r.type] + '</span><h3 style="margin:4px 0 6px">' + esc(r.name) + '</h3><p class="muted" style="margin:0;font-size:.9rem">' + esc(r.description) + '</p></div></div>' +
        '<div class="redeem-calc"><div><span>Saldo actual</span><b>' + u.num(avail) + ' pts</b></div><div><span>Costo de la recompensa</span><b class="text-pink">− ' + u.num(r.cost) + ' pts</b></div>' +
        '<div class="total"><span>Saldo después del canje</span><b class="' + (after < 0 ? 'text-bad' : 'text-cyan') + '">' + u.num(after) + ' pts</b></div></div>' +
        (r.conditions ? '<div class="alert alert-info" style="margin-top:14px">' + I('info') + '<p><b>Condiciones:</b> ' + esc(r.conditions) + '</p></div>' : '') +
        (why ? '<div class="alert alert-bad" style="margin-top:14px">' + I('alert') + '<p>' + esc(why) + '</p></div>' : '<p class="muted" style="font-size:.85rem;margin:14px 0 0">Reservaremos ' + u.num(r.cost) + ' puntos hasta que CatCore apruebe tu canje. Se usan primero los puntos que vencen antes. Si el canje se rechaza o lo cancelas, los puntos vuelven a tu saldo.</p>'),
      actions: why ? [{ label: 'Cerrar', cls: 'btn-ghost' }] : [{ label: 'Cancelar', cls: 'btn-ghost' }, {
        label: 'Confirmar canje', cls: 'btn-primary', icon: 'check', id: 'confirm-redeem', onClick: () => {
          const red = ui.safe(() => CP.store.tx((x) => CP.redemptions.request(x, c.id, r.id)));
          if (!red) return false;
          setTimeout(() => redeemDone(red.id), 200);
        }
      }]
    });
    ui.hydrate(m.body);
  }

  function redeemDone(id) {
    const r = CP.redemptions.get(db(), id);
    const c = session.customer();
    const m = ui.modal({
      title: '¡Solicitud de canje registrada!', icon: 'check', size: 'sm',
      body: '<p class="confirm-text">Reservamos <b>' + u.num(r.points) + ' pts</b> para <b>' + esc(r.rewardName) + '</b>. Tu canje está <b>pendiente de aprobación</b>; te avisaremos por WhatsApp.</p>' +
        '<div class="code-box" style="margin-top:16px"><div><small class="muted">Código de canje</small><br><b>' + r.code + '</b></div><button class="btn btn-sm btn-ghost" data-copy="' + r.code + '">' + I('copy') + 'Copiar</button></div>' +
        '<p class="muted" style="margin:14px 0 0;font-size:.88rem">Saldo disponible: <b class="text-cyan">' + u.num(CP.points.available(db(), c.id)) + ' pts</b></p>',
      actions: [{ label: 'Seguir explorando', cls: 'btn-ghost' }, { label: 'Ver mis canjes', cls: 'btn-primary', onClick: () => { state.acctTab = 'canjes'; go('mis-puntos'); } }]
    });
    m.body.querySelector('[data-copy]').onclick = (e) => ui.copy(e.currentTarget.dataset.copy);
    render({ keepScroll: true });
  }

  /* ---------------- arranque ---------------- */
  window.addEventListener('hashchange', () => { $('#nav').classList.remove('open'); ui.closeAll(); render(); });
  $('#menuBtn').onclick = () => { const n = $('#nav'); n.classList.toggle('open'); $('#menuBtn').setAttribute('aria-expanded', n.classList.contains('open')); };
  $('#waFloat').href = WA_URL; $('#waFloat').target = '_blank'; $('#waFloat').rel = 'noopener';
  document.addEventListener('click', (e) => {
    const s = e.target.closest('[data-scroll]');
    if (!s) return;
    e.preventDefault();
    if (state.route !== 'inicio') location.hash = '#/?s=' + s.dataset.scroll;
    else document.getElementById(s.dataset.scroll).scrollIntoView({ behavior: 'smooth' });
  });
  // Cambios hechos desde el panel en otra pestaña: refrescar la vista (excepto el formulario en curso)
  CP.store.on((origin) => {
    if (origin !== 'external') return;
    if (state.route === 'registrar' && !state.success) { renderHeader(); return; }
    if (!document.querySelector('.modal-wrap')) render({ keepScroll: true });
  });
  ui.boot(render);
})();
