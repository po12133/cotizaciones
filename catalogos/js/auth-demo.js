/*
 * Registro, inicio de sesión, acceso con Google, recuperación de contraseña y
 * elección de plan. TODO ES SIMULADO: no hay autenticación real y las contraseñas
 * no se guardan (solo se valida su formato).
 */
(function () {
  'use strict';
  const CA = window.CA;
  const u = CA.util, ui = CA.ui, esc = u.esc, I = ui.icon, B = CA.CONFIG.brand;
  const $ = ui.$, $$ = ui.$$;
  const page = document.body.dataset.page;
  const box = $('#authBox');

  CA.boot();
  $$('[data-brand]').forEach((el) => (el.textContent = B.name));
  $$('[data-brand-short]').forEach((el) => (el.textContent = B.short));
  document.title = (page === 'login' ? 'Iniciar sesión' : 'Crear cuenta') + ' · ' + B.name;

  const G_LOGO = '<svg class="g-logo" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
  const DEMO_NOTE = '<div class="demo-note">' + I('info') + '<span><b>Demostración:</b> no se valida ni se guarda ninguna contraseña. No uses contraseñas reales.</span></div>';

  const findUser = (email) => CA.store.db.users.find((x) => x.email === String(email || '').trim().toLowerCase());

  function goDashboard(extra) { location.href = 'dashboard.html' + (extra || ''); }

  /** Crea la cuenta y su espacio de trabajo. */
  function createAccount(data) {
    const email = String(data.email).trim().toLowerCase();
    if (findUser(email)) throw new CA.BizError('Ya existe una cuenta con ' + email + '. Inicia sesión.', 'email');
    return CA.store.tx((db) => {
      const usr = CA.seed.newUser({ name: String(data.name).trim(), email, business: String(data.business).trim(), provider: data.provider || 'email' }, CA.now());
      db.users.push(usr);
      db.workspaces[usr.id] = CA.seed.newWorkspace();
      CA.notify(db.workspaces[usr.id], 'info', '¡Bienvenido a ' + B.name + '!', 'Sigue los pasos de la guía de inicio para publicar tu primer catálogo.', 'inicio');
      return usr;
    });
  }

  /* ---------------- simulación de "Acceder con Google" ---------------- */
  function googleFlow(mode) {
    return new Promise((resolve) => {
      const known = CA.store.db.users.filter((x) => !x.synthetic).slice(0, 3);
      const accounts = mode === 'login' ? known.map((x) => ({ name: x.name, email: x.email })) : [{ name: 'Usuario Demo', email: 'usuario.demo@gmail.com' }];
      const word = '<div class="g-word"><b>G</b><b>o</b><b>o</b><b>g</b><b>l</b><b>e</b></div>';
      const m = ui.modal({
        title: 'Acceder con Google', subtitle: '<span class="demo-tag">Simulación</span> No se conecta con Google ni se solicitan credenciales reales.', size: 'sm', cls: 'gsim',
        body: '<div class="gsim-head">' + word + '<h4>Elige una cuenta</h4><p>para continuar a ' + esc(B.name) + '</p></div><div id="gAccs">' +
          accounts.map((a, i) => '<button class="gsim-acc" data-i="' + i + '">' + ui.avatar(a.name) + '<div><b>' + esc(a.name) + '</b><small>' + esc(a.email) + '</small></div></button>').join('') +
          '<button class="gsim-acc" id="gOther">' + '<span class="avatar" style="--h:210">' + I('user') + '</span><div><b>Usar otra cuenta</b></div></button></div>',
        onClose: () => resolve(null)
      });
      const consent = (acc) => {
        m.body.innerHTML = '<div class="gsim-head">' + word + '<h4>' + esc(B.name) + ' quiere acceder a tu cuenta de Google</h4><p>' + esc(acc.email) + '</p></div>' +
          '<ul class="gsim-perm"><li>' + I('user') + '<span>Ver tu nombre y dirección de correo electrónico</span></li><li>' + I('shield') + '<span>Más adelante, en Integraciones, podrás autorizar el acceso de solo lectura a Sheets y Drive.</span></li></ul>' +
          '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button class="btn btn-ghost" id="gCancel">Cancelar</button><button class="btn btn-primary" id="gOk">Continuar</button></div>';
        m.body.querySelector('#gCancel').onclick = () => m.close();
        m.body.querySelector('#gOk').onclick = () => { const r = acc; m.close(); resolve(r); };
      };
      $$('[data-i]', m.body).forEach((b) => (b.onclick = () => consent(accounts[+b.dataset.i])));
      m.body.querySelector('#gOther').onclick = () => {
        m.body.innerHTML = '<div class="gsim-head">' + word + '<h4>Usar otra cuenta</h4></div><form id="gForm" class="form-grid one" novalidate>' +
          ui.field({ name: 'name', label: 'Nombre', required: true, placeholder: 'Tu nombre' }) + ui.field({ name: 'email', label: 'Correo de Google', type: 'email', required: true, placeholder: 'nombre@gmail.com' }) +
          '<button class="btn btn-primary btn-block">Siguiente</button></form>';
        const f = m.body.querySelector('#gForm');
        f.addEventListener('submit', (e) => {
          e.preventDefault();
          const v = ui.formValues(f);
          const errs = {};
          if (String(v.name).trim().length < 2) errs.name = 'Ingresa tu nombre.';
          if (!u.validEmail(v.email)) errs.email = 'Correo no válido.';
          if (Object.keys(errs).length) return ui.setErrors(f, errs);
          consent({ name: v.name.trim(), email: v.email.trim().toLowerCase() });
        });
      };
    });
  }

  /* ---------------- inicio de sesión ---------------- */
  function renderLogin() {
    const pre = u.qs('email') || '';
    box.innerHTML = '<h1>Bienvenido de nuevo</h1><p class="sub">Inicia sesión para administrar tus catálogos.</p>' +
      '<button class="btn btn-google" id="gBtn">' + G_LOGO + 'Continuar con Google</button><div class="or">o con tu correo</div>' +
      '<form id="loginForm" class="form-grid one" novalidate>' +
      ui.field({ name: 'email', label: 'Correo electrónico', type: 'email', required: true, value: pre, autocomplete: 'email', placeholder: 'tu@negocio.com' }) +
      ui.field({ name: 'password', label: 'Contraseña', type: 'password', required: true, autocomplete: 'current-password', placeholder: '••••••••' }) +
      '<div style="display:flex;justify-content:flex-end;margin-top:-6px"><button type="button" class="link-btn" id="forgot">¿Olvidaste tu contraseña?</button></div>' +
      '<button class="btn btn-primary btn-block btn-lg" type="submit">Iniciar sesión</button></form>' +
      '<button class="btn btn-soft btn-block" style="margin-top:10px" id="demoBtn">' + I('sparkles') + 'Entrar con la cuenta demo (' + esc(CA.CONFIG.demoAccount.label) + ')</button>' +
      '<p class="auth-foot">¿No tienes cuenta? <a href="registro.html">Regístrate gratis</a></p>' + DEMO_NOTE;
    const f = $('#loginForm');
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = ui.formValues(f);
      const errs = {};
      if (!u.validEmail(v.email)) errs.email = 'Ingresa un correo válido.';
      if (String(v.password).length < 6) errs.password = 'La contraseña debe tener al menos 6 caracteres.';
      if (Object.keys(errs).length) return ui.setErrors(f, errs);
      const usr = findUser(v.email);
      if (!usr) return ui.setErrors(f, { email: 'No encontramos una cuenta con este correo. ¿Quieres registrarte?' });
      if (usr.status === 'suspended') return ui.setErrors(f, { email: 'Esta cuenta está suspendida. Contacta a soporte.' });
      CA.session.set(usr.id);
      goDashboard();
    });
    $('#demoBtn').onclick = () => { CA.session.set('usr_demo'); goDashboard(); };
    $('#gBtn').onclick = async () => {
      const acc = await googleFlow('login');
      if (!acc) return;
      let usr = findUser(acc.email);
      if (!usr) { usr = createAccount({ name: acc.name, email: acc.email, business: 'Negocio de ' + acc.name.split(' ')[0], provider: 'google' }); CA.session.set(usr.id); location.href = 'registro.html?step=plan'; return; }
      CA.session.set(usr.id); goDashboard();
    };
    $('#forgot').onclick = () => recover(ui.formValues(f).email);
  }

  /** Recuperación de contraseña simulada: correo → enlace → nueva contraseña. */
  function recover(email) {
    const m = ui.modal({ title: 'Recuperar contraseña', icon: 'lock2', size: 'sm', body: '' });
    const step1 = () => {
      m.body.innerHTML = '<p class="confirm-text">Te enviaremos un enlace para crear una nueva contraseña.</p><form id="rf" class="form-grid one" novalidate style="margin-top:12px">' +
        ui.field({ name: 'email', label: 'Correo de tu cuenta', type: 'email', required: true, value: email || '' }) + '<button class="btn btn-primary btn-block">Enviar enlace</button></form>';
      const f = m.body.querySelector('#rf');
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const v = ui.formValues(f);
        if (!u.validEmail(v.email)) return ui.setErrors(f, { email: 'Correo no válido.' });
        if (!findUser(v.email)) return ui.setErrors(f, { email: 'No hay una cuenta con este correo.' });
        step2(v.email.trim().toLowerCase());
      });
    };
    const step2 = (mail) => {
      m.body.innerHTML = '<div class="alert alert-ok">' + I('check') + '<p>Enviamos un enlace a <b>' + esc(mail) + '</b>.</p></div>' +
        '<div class="mail-preview"><div class="mh"><span class="demo-tag">Correo simulado</span> De: ' + esc(B.supportEmail) + ' · Asunto: Restablece tu contraseña</div>' +
        '<div class="mb"><p>Hola, recibimos una solicitud para restablecer tu contraseña de ' + esc(B.name) + '.</p><button class="btn btn-primary btn-sm" id="openLink">Crear nueva contraseña</button><p class="muted" style="font-size:.8rem;margin:10px 0 0">El enlace vence en 30 minutos.</p></div></div>';
      m.body.querySelector('#openLink').onclick = () => step3(mail);
    };
    const step3 = (mail) => {
      m.body.innerHTML = '<form id="nf" class="form-grid one" novalidate>' + ui.field({ name: 'p1', label: 'Nueva contraseña', type: 'password', required: true, hint: 'Mínimo 8 caracteres.' }) +
        ui.field({ name: 'p2', label: 'Repite la contraseña', type: 'password', required: true }) + '<button class="btn btn-primary btn-block">Guardar contraseña</button></form>' + DEMO_NOTE;
      const f = m.body.querySelector('#nf');
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const v = ui.formValues(f);
        if (String(v.p1).length < 8) return ui.setErrors(f, { p1: 'Mínimo 8 caracteres.' });
        if (v.p1 !== v.p2) return ui.setErrors(f, { p2: 'Las contraseñas no coinciden.' });
        m.close();
        ui.toast('Contraseña actualizada (simulado). Ya puedes iniciar sesión.', 'success');
        const em = $('#loginForm [name=email]'); if (em) em.value = mail;
      });
    };
    step1();
  }

  /* ---------------- registro ---------------- */
  function strength(p) {
    let s = 0;
    if (p.length >= 8) s++; if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  }
  function renderRegister() {
    box.innerHTML = '<div class="steps-bar"><span class="on"></span><span></span></div><h1>Crea tu cuenta gratis</h1><p class="sub">Sin tarjeta bancaria. Tu prueba Profesional de 14 días empieza al publicar tu primer catálogo.</p>' +
      '<button class="btn btn-google" id="gBtn">' + G_LOGO + 'Registrarme con Google</button><div class="or">o con tu correo</div>' +
      '<form id="regForm" class="form-grid" novalidate>' +
      ui.field({ name: 'business', label: 'Nombre del negocio', required: true, wide: true, placeholder: 'Ej. TecnoStore' }) +
      ui.field({ name: 'name', label: 'Tu nombre', required: true, autocomplete: 'name' }) +
      ui.field({ name: 'email', label: 'Correo electrónico', type: 'email', required: true, autocomplete: 'email' }) +
      ui.field({ name: 'password', label: 'Contraseña', type: 'password', required: true, autocomplete: 'new-password', hint: 'Mínimo 8 caracteres.' }) +
      ui.field({ name: 'password2', label: 'Repite la contraseña', type: 'password', required: true, autocomplete: 'new-password' }) +
      '<div class="field-wide"><div class="pw-meter"><i id="pwBar"></i></div></div>' +
      '<label class="check-line" data-field="terms"><input type="checkbox" name="terms"> <span>Acepto los términos de uso y la política de privacidad.</span></label><small class="err" style="grid-column:1/-1;color:var(--bad)" id="termsErr"></small>' +
      '<button class="btn btn-primary btn-block btn-lg field-wide" type="submit">Crear cuenta</button></form>' +
      '<p class="auth-foot">¿Ya tienes cuenta? <a href="login.html">Inicia sesión</a></p>' + DEMO_NOTE;
    const f = $('#regForm');
    f.password.addEventListener('input', () => {
      const s = strength(f.password.value);
      const bar = $('#pwBar');
      bar.style.width = (s / 4) * 100 + '%';
      bar.style.background = ['#dc2626', '#f59e0b', '#eab308', '#10b981', '#059669'][s];
    });
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = ui.formValues(f);
      const errs = {};
      if (String(v.business).trim().length < 2) errs.business = 'Ingresa el nombre de tu negocio.';
      if (String(v.name).trim().length < 2) errs.name = 'Ingresa tu nombre.';
      if (!u.validEmail(v.email)) errs.email = 'Ingresa un correo válido.';
      else if (findUser(v.email)) errs.email = 'Este correo ya tiene una cuenta. Inicia sesión.';
      if (String(v.password).length < 8) errs.password = 'Mínimo 8 caracteres.';
      if (v.password !== v.password2) errs.password2 = 'Las contraseñas no coinciden.';
      $('#termsErr').textContent = v.terms ? '' : 'Debes aceptar los términos para continuar.';
      if (Object.keys(errs).length || !v.terms) return ui.setErrors(f, errs);
      const usr = createAccount({ business: v.business, name: v.name, email: v.email });
      CA.session.set(usr.id);
      ui.toast('Cuenta creada. Elige tu plan.', 'success');
      renderPlanStep();
    });
    $('#gBtn').onclick = async () => {
      const acc = await googleFlow('register');
      if (!acc) return;
      let usr = findUser(acc.email);
      if (usr) { CA.session.set(usr.id); return goDashboard(); }
      usr = createAccount({ name: acc.name, email: acc.email, business: 'Negocio de ' + acc.name.split(' ')[0], provider: 'google' });
      CA.session.set(usr.id);
      renderPlanStep();
    };
  }

  /** Paso 2: elegir plan. Los planes pagos usan un pago simulado. */
  function renderPlanStep() {
    const usr = CA.session.user();
    if (!usr) return renderRegister();
    $('#authLayout').style.gridTemplateColumns = '1fr';
    $('.auth-side').style.display = 'none';
    let billing = u.qs('billing') === 'yearly' ? 'yearly' : 'monthly';
    const pre = u.qs('plan');
    const draw = () => {
      box.className = 'auth-box wide';
      box.innerHTML = '<div class="steps-bar"><span class="on"></span><span class="on"></span></div><h1>Elige cómo empezar, ' + esc(usr.name.split(' ')[0]) + '</h1>' +
        '<p class="sub">Puedes cambiar de plan en cualquier momento desde "Mi suscripción".</p>' +
        '<div class="chips" style="margin-bottom:6px"><button class="chip' + (billing === 'monthly' ? ' on' : '') + '" data-b="monthly">Mensual</button><button class="chip' + (billing === 'yearly' ? ' on' : '') + '" data-b="yearly">Anual · 2 meses gratis</button></div>' +
        '<div class="plan-pick">' + CA.PLAN_ORDER.map((id) => {
          const p = CA.PLANS[id], l = p.limits;
          const price = billing === 'yearly' ? p.yearly : p.monthly;
          return '<div class="pp' + (id === (pre || 'free') ? ' rec' : '') + '">' + (p.recommended ? '<span class="rec-tag">Recomendado</span>' : '') + '<h4>' + p.name + '</h4><div class="pp-price"><b>' + u.money(price) + '</b> <span>' + (id === 'free' ? 'para siempre' : billing === 'yearly' ? '/año' : '/mes') + '</span></div>' +
            '<ul><li>' + u.num(l.products) + ' productos</li><li>' + l.catalogs + ' catálogo(s)</li><li>' + (l.templates === 'all' ? 'Todas las plantillas' : l.templates.length + ' plantilla(s)') + '</li><li>Sincronización ' + (l.syncMinutes >= 1440 ? 'diaria' : 'cada ' + l.syncMinutes + ' min') + '</li></ul>' +
            (id === 'free' ? '<button class="btn btn-primary btn-block" data-plan="free">Empezar gratis</button><small>Incluye 14 días de Profesional al publicar tu primer catálogo.</small>'
              : '<button class="btn ' + (id === pre ? 'btn-primary' : 'btn-ghost') + ' btn-block" data-plan="' + id + '">Suscribirme</button>' + (id === 'pro' ? '<small>¿Prefieres probar? Empieza gratis y obtén 14 días de Profesional.</small>' : '')) + '</div>';
        }).join('') + '</div>' + DEMO_NOTE.replace('no se valida ni se guarda ninguna contraseña. No uses contraseñas reales.', 'los pagos son simulados; no se solicita ninguna tarjeta.');
      $$('[data-b]').forEach((b) => (b.onclick = () => { billing = b.dataset.b; draw(); }));
      $$('[data-plan]').forEach((b) => (b.onclick = () => choose(b.dataset.plan)));
    };
    const choose = (planId) => {
      if (planId === 'free') {
        CA.store.tx((db) => { const x = db.users.find((y) => y.id === usr.id); x.planChosen = true; });
        return goDashboard('?bienvenida=1');
      }
      const p = CA.PLANS[planId], amount = CA.subscriptions.price(planId, billing);
      ui.modal({
        title: 'Confirmar suscripción', icon: 'crown', size: 'sm',
        body: '<dl class="kv"><dt>Plan</dt><dd>' + p.name + '</dd><dt>Facturación</dt><dd>' + (billing === 'yearly' ? 'Anual' : 'Mensual') + '</dd><dt>Total</dt><dd>' + u.money(amount) + '</dd></dl>' +
          '<div class="alert alert-warn" style="margin-top:14px">' + I('info') + '<p><b>Pago simulado.</b> En la versión comercial aquí iría la pasarela de pago. No se cobra nada.</p></div>',
        actions: [{ label: 'Cancelar', cls: 'btn-ghost' }, { label: 'Confirmar pago de demostración', cls: 'btn-primary', onClick: () => {
          CA.store.tx((db) => { CA.subscriptions.change(db, usr.id, planId, billing); db.users.find((y) => y.id === usr.id).planChosen = true; });
          setTimeout(() => goDashboard('?bienvenida=1'), 50);
        } }]
      });
    };
    draw();
  }

  if (page === 'login') {
    if (CA.session.user()) return goDashboard();
    renderLogin();
  } else {
    const usr = CA.session.user();
    if (!usr) renderRegister();
    else if (!usr.planChosen && !usr.onboarded) renderPlanStep(); // cuenta nueva que aún no eligió plan
    else goDashboard();
  }
})();
