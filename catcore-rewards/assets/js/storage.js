/*
 * CorePoints · storage.js
 * Base de datos de demostración en LocalStorage + utilidades compartidas.
 * IMPORTANTE: la persistencia es local a este navegador. No es una base de datos
 * compartida ni un sistema seguro; no guarde información sensible real.
 */
(function () {
  'use strict';
  const CP = (window.CP = window.CP || {});

  const KEY = 'corepoints:db';
  const DATA_VERSION = 5; // subir si cambia la estructura o los datos de demostración
  const DAY = 864e5;

  /* ---------------- utilidades ---------------- */
  const u = (CP.util = {});

  u.rand = function (len, alphabet) {
    alphabet = alphabet || 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const buf = new Uint32Array(len);
    crypto.getRandomValues(buf);
    let s = '';
    for (let i = 0; i < len; i++) s += alphabet[buf[i] % alphabet.length];
    return s;
  };
  /** Identificador único con prefijo; se comprueba contra un conjunto opcional de existentes. */
  u.uid = function (prefix, len, exists) {
    let id;
    do { id = prefix + '-' + u.rand(len || 8); } while (exists && exists(id));
    return id;
  };

  u.esc = function (v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  const nf0 = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 0 });
  const nf2 = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  u.num = (n) => nf0.format(Math.round(Number(n) || 0));
  u.bs = (n) => 'Bs ' + nf2.format(Number(n) || 0);
  u.bsShort = (n) => 'Bs ' + nf0.format(Math.round(Number(n) || 0));
  u.pts = (n) => nf0.format(Math.round(Number(n) || 0)) + ' pts';

  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  u.MESES = MESES;
  u.toDate = (v) => (v instanceof Date ? v : new Date(v));
  u.date = function (v) {
    if (!v) return '—';
    const d = u.toDate(v);
    if (isNaN(d)) return '—';
    return d.getDate() + ' ' + MESES[d.getMonth()] + ' ' + d.getFullYear();
  };
  u.dateTime = function (v) {
    if (!v) return '—';
    const d = u.toDate(v);
    return u.date(d) + ', ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };
  /** 'YYYY-MM-DD' en hora local (para inputs type=date). */
  u.isoDay = function (v) {
    const d = u.toDate(v);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  /** Convierte 'YYYY-MM-DD' a fecha local al mediodía (evita saltos por zona horaria). */
  u.fromIsoDay = function (s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3], 12, 0, 0);
  };
  u.addMonths = function (v, months) {
    const d = new Date(u.toDate(v).getTime());
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + Number(months));
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
    return d;
  };
  u.addDays = (v, days) => new Date(u.toDate(v).getTime() + days * DAY);
  u.daysUntil = (v, from) => Math.ceil((u.toDate(v) - (from || CP.now())) / DAY);
  u.relDays = function (v, from) {
    const n = u.daysUntil(v, from);
    if (n < 0) return 'hace ' + Math.abs(n) + (Math.abs(n) === 1 ? ' día' : ' días');
    if (n === 0) return 'hoy';
    return 'en ' + n + (n === 1 ? ' día' : ' días');
  };

  /** Teléfono boliviano: devuelve solo dígitos con prefijo 591, o '' si no es válido. */
  u.normPhone = function (v) {
    let d = String(v || '').replace(/\D/g, '');
    if (d.startsWith('00')) d = d.slice(2);
    if (d.length === 8) d = '591' + d;
    return /^591[67]\d{7}$/.test(d) ? d : '';
  };
  u.fmtPhone = function (digits) {
    const d = String(digits || '').replace(/\D/g, '');
    if (d.length === 11 && d.startsWith('591')) return '+591 ' + d.slice(3, 7) + ' ' + d.slice(7);
    return d ? '+' + d : '—';
  };
  u.maskPhone = (digits) => {
    const d = String(digits || '');
    return d.length === 11 ? '+591 ' + d.slice(3, 5) + '•• ••' + d.slice(-2) : u.fmtPhone(d);
  };
  /** Normaliza un número de boleta para detectar duplicados: mayúsculas, sin espacios ni símbolos, sin ceros a la izquierda. */
  u.normReceipt = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^0+(?=\d)/, '');
  u.validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
  u.initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  u.clone = (o) => JSON.parse(JSON.stringify(o));
  u.byDateDesc = (field) => (a, b) => new Date(b[field]) - new Date(a[field]);
  u.debounce = function (fn, ms) {
    let t;
    return function () { clearTimeout(t); const a = arguments; t = setTimeout(() => fn.apply(this, a), ms || 200); };
  };

  /* ---------------- reloj de demostración ---------------- */
  // El panel admin puede adelantar la fecha para probar vencimientos sin esperar meses.
  CP.now = function () {
    const off = (state && state.meta && Number(state.meta.clockOffsetDays)) || 0;
    return new Date(Date.now() + off * DAY);
  };

  /* ---------------- configuración por defecto ---------------- */
  CP.DEFAULT_CONFIG = {
    bsPerPoint: 10,            // Bs necesarios para 1 CorePoint
    validityMonths: 12,        // vigencia de los puntos
    minPurchase: 100,          // monto mínimo para generar puntos (Bs)
    purchasesEnabled: true,    // registro de compras abierto
    redemptionsEnabled: true,  // canjes habilitados
    firstPurchaseBonus: 0,     // CorePoints extra en la primera compra aprobada (0 = sin bono)
    expiryWarnDays: 30,        // días de anticipación para avisar vencimientos
    maxImageMB: 8,             // tamaño máximo por imagen antes de comprimir
    rounding: 'floor'          // fijo en el prototipo: redondeo hacia abajo
  };

  function emptyDb() {
    return {
      version: DATA_VERSION,
      meta: { createdAt: new Date().toISOString(), clockOffsetDays: 0, seeded: false },
      config: u.clone(CP.DEFAULT_CONFIG),
      customers: [], sellers: [], purchases: [], lots: [], movements: [],
      rewards: [], redemptions: [], notifications: [], configLog: []
    };
  }

  /* ---------------- almacén ---------------- */
  let state = null;
  const listeners = new Set();

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const db = JSON.parse(raw);
      if (!db || db.version !== DATA_VERSION) return null;
      db.config = Object.assign(u.clone(CP.DEFAULT_CONFIG), db.config || {});
      return db;
    } catch (e) {
      console.warn('CorePoints: datos locales ilegibles, se regeneran.', e);
      return null;
    }
  }

  CP.store = {
    KEY, DATA_VERSION,
    /** Devuelve la BD en memoria (la carga si hace falta). */
    get db() {
      if (!state) state = read();
      return state;
    },
    hasData() { return !!this.db; },
    replace(db) { state = db; this.save(); },
    empty: emptyDb,
    save() {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
      } catch (e) {
        CP.ui && CP.ui.toast && CP.ui.toast('No se pudo guardar en el navegador: ' + e.message, 'error');
        throw e;
      }
    },
    /**
     * Ejecuta una operación sobre una copia de la BD. Si la función lanza un error,
     * no se guarda nada (operación atómica). Devuelve el resultado de fn.
     */
    tx(fn) {
      const draft = u.clone(this.db);
      const result = fn(draft);
      state = draft;
      this.save();
      emit('local');
      return result;
    },
    reload() { state = read(); emit('external'); },
    clear() { localStorage.removeItem(KEY); state = null; },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  };

  function emit(origin) { listeners.forEach((fn) => { try { fn(origin); } catch (e) { console.error(e); } }); }

  // Sincroniza el portal y el panel abiertos en pestañas distintas.
  window.addEventListener('storage', (e) => { if (e.key === KEY) CP.store.reload(); });

  /** Error de negocio con mensaje apto para el usuario. */
  CP.BizError = class BizError extends Error {
    constructor(message, field) { super(message); this.name = 'BizError'; this.field = field; }
  };
})();
