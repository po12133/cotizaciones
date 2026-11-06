/*
 * Almacenamiento de demostración (LocalStorage), utilidades, sesión y reglas de planes.
 * IMPORTANTE: LocalStorage NO es un mecanismo seguro. La "autenticación" y el
 * control de suscripciones de este prototipo son simulados.
 */
(function () {
  'use strict';
  const CA = (window.CA = window.CA || {});
  const CFG = CA.CONFIG;
  const DAY = 864e5;

  /* ---------------- utilidades ---------------- */
  const u = (CA.util = {});
  u.rand = function (len, alphabet) {
    alphabet = alphabet || 'abcdefghjkmnpqrstuvwxyz23456789';
    const buf = new Uint32Array(len);
    crypto.getRandomValues(buf);
    let s = '';
    for (let i = 0; i < len; i++) s += alphabet[buf[i] % alphabet.length];
    return s;
  };
  u.uid = (prefix) => prefix + '_' + u.rand(10);
  u.esc = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const nf0 = new Intl.NumberFormat(CFG.locale, { maximumFractionDigits: 0 });
  const nf2 = new Intl.NumberFormat(CFG.locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  u.num = (n) => nf0.format(Math.round(Number(n) || 0));
  u.money = (n) => CFG.currency + ' ' + nf2.format(Number(n) || 0);
  u.compact = (v) => (v >= 1e6 ? (v / 1e6).toFixed(1).replace('.0', '') + 'M' : v >= 1e3 ? (v / 1e3).toFixed(1).replace('.0', '') + 'k' : String(Math.round(v)));
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  u.MESES = MESES;
  u.date = (v) => { if (!v) return '—'; const d = new Date(v); return isNaN(d) ? '—' : d.getDate() + ' ' + MESES[d.getMonth()] + ' ' + d.getFullYear(); };
  u.dateTime = (v) => { if (!v) return '—'; const d = new Date(v); return u.date(d) + ', ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  u.ago = function (v) {
    if (!v) return 'nunca';
    const s = Math.round((CA.now() - new Date(v)) / 1000);
    if (s < 60) return 'hace unos segundos';
    if (s < 3600) return 'hace ' + Math.round(s / 60) + ' min';
    if (s < 86400) return 'hace ' + Math.round(s / 3600) + ' h';
    const d = Math.round(s / 86400);
    return 'hace ' + d + (d === 1 ? ' día' : ' días');
  };
  u.toDate = (v) => (v instanceof Date ? v : new Date(v));
  u.addDays = (v, n) => new Date(new Date(v).getTime() + n * DAY);
  u.addMonths = (v, n) => { const d = new Date(v); d.setMonth(d.getMonth() + n); return d; };
  u.daysLeft = (v) => Math.max(0, Math.ceil((new Date(v) - CA.now()) / DAY));
  u.slug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
  u.clone = (o) => JSON.parse(JSON.stringify(o));
  u.validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
  u.initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  u.debounce = (fn, ms) => { let t; return function () { clearTimeout(t); const a = arguments; t = setTimeout(() => fn.apply(this, a), ms || 200); }; };
  /** Generador pseudoaleatorio determinista (para estadísticas simuladas estables). */
  u.seeded = function (seed) {
    let s = 0;
    String(seed).split('').forEach((c) => { s = (s * 31 + c.charCodeAt(0)) >>> 0; });
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  };
  u.qs = (k) => new URLSearchParams(location.search).get(k);

  /* ---------------- reloj de demostración ---------------- */
  let state = null;
  CA.now = () => new Date(Date.now() + ((state && state.meta && Number(state.meta.clockOffsetDays)) || 0) * DAY);

  /* ---------------- almacén ---------------- */
  const listeners = new Set();
  function read() {
    try {
      const raw = localStorage.getItem(CFG.storageKey);
      if (!raw) return null;
      const db = JSON.parse(raw);
      return db && db.version === CFG.dataVersion ? db : null;
    } catch (e) { console.warn('Datos de demostración ilegibles; se regeneran.', e); return null; }
  }
  CA.store = {
    get db() { if (!state) state = read(); return state; },
    has() { return !!this.db; },
    replace(db) { state = db; this.save(); },
    save() {
      try { localStorage.setItem(CFG.storageKey, JSON.stringify(state)); }
      catch (e) { if (CA.ui && CA.ui.toast) CA.ui.toast('No se pudo guardar en el navegador: ' + e.message, 'error'); throw e; }
    },
    /** Operación atómica: si fn lanza un error no se guarda nada. */
    tx(fn) {
      const draft = u.clone(this.db);
      const r = fn(draft);
      state = draft;
      this.save();
      emit('local');
      return r;
    },
    reload() { state = read(); emit('external'); },
    clear() { localStorage.removeItem(CFG.storageKey); state = null; },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  };
  function emit(o) { listeners.forEach((fn) => { try { fn(o); } catch (e) { console.error(e); } }); }
  window.addEventListener('storage', (e) => { if (e.key === CFG.storageKey) CA.store.reload(); });

  CA.BizError = class BizError extends Error {
    constructor(msg, field) { super(msg); this.name = 'BizError'; this.field = field; }
  };

  /* ---------------- sesión simulada ---------------- */
  CA.session = {
    userId() { return localStorage.getItem(CFG.sessionKey); },
    user() { const id = this.userId(); return id && CA.store.db ? CA.store.db.users.find((x) => x.id === id) || null : null; },
    set(id) { localStorage.setItem(CFG.sessionKey, id); },
    clear() { localStorage.removeItem(CFG.sessionKey); }
  };
  CA.ws = (db, userId) => db.workspaces[userId || CA.session.userId()];

  /* ---------------- planes, límites y prueba ---------------- */
  const P = (CA.plans = {});
  /** Límites del plan, con los ajustes que el superadministrador haya guardado. */
  P.limits = function (planId, db) {
    db = db || CA.store.db;
    const base = u.clone(CA.PLANS[planId].limits);
    const ov = db && db.planOverrides && db.planOverrides[planId];
    return ov ? Object.assign(base, ov) : base;
  };
  P.trialActive = (user) => !!user && user.trial && user.trial.status === 'active' && new Date(user.trial.endsAt) > CA.now();
  P.paidActive = (user) => !!user && user.plan !== 'free' && user.subscription && (user.subscription.status === 'active' || (user.subscription.status === 'canceled' && new Date(user.subscription.renewsAt) > CA.now()));
  /** Plan que rige ahora: suscripción pagada > prueba Profesional > Gratis. */
  P.effective = function (user) {
    if (!user) return 'free';
    if (P.paidActive(user)) return user.plan;
    if (P.trialActive(user)) return 'pro';
    return 'free';
  };
  P.effectiveLimits = (user, db) => P.limits(P.effective(user), db);
  P.templateAllowed = (limits, tpl) => limits.templates === 'all' || limits.templates.includes(tpl);
  P.trialDaysLeft = (user) => (P.trialActive(user) ? u.daysLeft(user.trial.endsAt) : 0);
  P.label = function (user) {
    const eff = P.effective(user);
    if (P.trialActive(user) && !P.paidActive(user)) return 'Prueba Profesional';
    return CA.PLANS[eff].name;
  };

  /**
   * Revisa vencimientos (prueba y suscripciones canceladas). Se ejecuta al cargar
   * cualquier página. Al vencer la prueba se vuelve a Gratis conservando los datos.
   */
  P.refresh = function (db) {
    const now = CA.now();
    let changed = false;
    db.users.forEach((user) => {
      if (user.trial && user.trial.status === 'active' && new Date(user.trial.endsAt) <= now) {
        user.trial.status = 'expired';
        user.trial.expiredAt = now.toISOString();
        changed = true;
        const ws = db.workspaces[user.id];
        if (ws && !P.paidActive(user)) notify(ws, 'warn', 'Terminó tu prueba Profesional', 'Volviste al plan Gratis. Tus datos y diseños se conservan; algunas funciones quedaron limitadas.', 'suscripcion');
      }
      if (user.subscription && user.subscription.status === 'canceled' && new Date(user.subscription.renewsAt) <= now && user.plan !== 'free') {
        user.plan = 'free';
        user.subscription = { status: 'none' };
        changed = true;
      }
    });
    return changed;
  };

  function notify(ws, tone, title, text, link) {
    ws.notifications = ws.notifications || [];
    ws.notifications.unshift({ id: u.uid('ntf'), tone, title, text, link: link || '', at: CA.now().toISOString(), read: false });
    ws.notifications = ws.notifications.slice(0, 40);
  }
  CA.notify = notify;

  /** Inicializa los datos (crea la demostración si no existe) y aplica vencimientos. */
  CA.boot = function () {
    if (!CA.store.has()) CA.store.replace(CA.seed.build());
    if (P.refresh(u.clone(CA.store.db))) CA.store.tx((db) => P.refresh(db));
  };
})();
