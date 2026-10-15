/*
 * Persistencia local del prototipo (localStorage) y utilidades compartidas.
 * Es una DEMOSTRACIÓN: no hay servidor, autenticación ni base de datos real.
 */
(function (global) {
  'use strict';

  const KEY = 'fedapabeni-prototipo-v1';
  const BASE = global.FP_BASE || '';

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  let cache = null;
  let storageOk = true;

  function load() {
    if (cache) return cache;
    let saved = null;
    try {
      const raw = localStorage.getItem(KEY);
      saved = raw ? JSON.parse(raw) : null;
    } catch (e) { storageOk = false; }
    const def = clone(global.FEDA_DEFAULTS);
    cache = saved && saved.version === def.version ? Object.assign(def, saved) : def;
    return cache;
  }

  function save(db) {
    cache = db || cache;
    try {
      localStorage.setItem(KEY, JSON.stringify(cache));
      return true;
    } catch (e) {
      storageOk = false;
      return false; // Cuota excedida (p. ej. imágenes muy grandes) o almacenamiento bloqueado.
    }
  }

  function reset() {
    cache = clone(global.FEDA_DEFAULTS);
    try { localStorage.removeItem(KEY); } catch (e) { /* sin almacenamiento */ }
    return cache;
  }

  const Store = {
    get db() { return load(); },
    save: save,
    reset: reset,
    available: function () { load(); return storageOk; },
    find: function (col, id) { return load()[col].find(function (x) { return x.id === id; }); },
    upsert: function (col, item) {
      const list = load()[col];
      const i = list.findIndex(function (x) { return x.id === item.id; });
      if (i >= 0) list[i] = item; else list.unshift(item);
      return save();
    },
    remove: function (col, id) {
      const db = load();
      db[col] = db[col].filter(function (x) { return x.id !== id; });
      return save();
    },
    uniqueId: function (col, base) {
      const list = load()[col];
      let id = slugify(base) || 'registro';
      let n = 2;
      const root = id;
      while (list.some(function (x) { return x.id === id; })) id = root + '-' + n++;
      return id;
    },
  };

  /* ---------- utilidades ---------- */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function slugify(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  }

  function norm(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  function asset(p) {
    if (!p) return '';
    if (/^(https?:|data:|blob:)/.test(p)) return p;
    return BASE + p;
  }

  const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function fmtDate(iso, long) {
    if (!iso) return '';
    const d = new Date(iso + 'T12:00:00');
    if (isNaN(d)) return iso;
    if (long) return d.toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' });
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }

  function onlyDigits(s) { return String(s || '').replace(/\D/g, ''); }

  /** Enlace de WhatsApp. Sin número, abre WhatsApp para elegir contacto (no se usa ningún número inventado). */
  function waLink(number, text) {
    const n = onlyDigits(number);
    return 'https://wa.me/' + n + '?text=' + encodeURIComponent(text || '');
  }

  function toast(msg, type) {
    let host = document.getElementById('toasts');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toasts';
      host.className = 'toasts';
      host.setAttribute('role', 'status');
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    const t = document.createElement('div');
    t.className = 'toast ' + (type || 'ok');
    t.innerHTML = (global.icon ? icon(type === 'error' ? 'alert' : type === 'info' ? 'info' : 'check-circle') : '') + '<span>' + esc(msg) + '</span>';
    host.appendChild(t);
    setTimeout(function () { t.classList.add('out'); }, 3800);
    setTimeout(function () { t.remove(); }, 4300);
  }

  /** Reduce una imagen subida y la devuelve como dataURL JPEG (para no saturar localStorage). */
  function fileToDataUrl(file, maxW) {
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type)) return reject(new Error('El archivo no es una imagen.'));
      const fr = new FileReader();
      fr.onerror = function () { reject(new Error('No se pudo leer el archivo.')); };
      fr.onload = function () {
        const img = new Image();
        img.onerror = function () { reject(new Error('Imagen no válida.')); };
        img.onload = function () {
          const w = Math.min(maxW || 900, img.naturalWidth);
          const h = Math.round(img.naturalHeight * (w / img.naturalWidth));
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL('image/jpeg', 0.78));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  global.Store = Store;
  global.FP = { esc: esc, slugify: slugify, norm: norm, asset: asset, fmtDate: fmtDate, waLink: waLink, toast: toast, fileToDataUrl: fileToDataUrl, onlyDigits: onlyDigits };
})(window);
