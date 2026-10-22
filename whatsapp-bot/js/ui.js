/*
 * Utilidades de interfaz compartidas: formato, notificaciones, modales, formularios
 * con validación, paneles laterales, confirmaciones, descargas y tema claro/oscuro.
 */
(function (root) {
  const WAB = (root.WAB = root.WAB || {});
  const icon = (n, c) => WAB.icon(n, c);

  // ---------- Formato ----------
  const nf0 = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 0 });
  const nf2 = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt = {
    money(n, opts = {}) {
      const v = Number(n) || 0;
      const sym = opts.symbol || 'Bs';
      const decimals = opts.decimals !== undefined ? opts.decimals : !Number.isInteger(Math.round(v * 100) / 100);
      return `${sym} ${decimals ? nf2.format(v) : nf0.format(v)}`;
    },
    usd(n) { return `USD ${nf2.format(Number(n) || 0)}`; },
    num(n) { return nf0.format(Number(n) || 0); },
    pct(n) { return `${nf0.format(Number(n) || 0)}%`; },
    date(d, style = 'medium') {
      const dt = toDate(d);
      if (!dt) return '—';
      const o = style === 'long' ? { day: 'numeric', month: 'long', year: 'numeric' }
        : style === 'short' ? { day: '2-digit', month: 'short' }
          : style === 'weekday' ? { weekday: 'long', day: 'numeric', month: 'long' }
            : { day: '2-digit', month: 'short', year: 'numeric' };
      return dt.toLocaleDateString('es-BO', o);
    },
    time(d) {
      const dt = toDate(d);
      return dt ? dt.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
    },
    dateTime(d) { return `${fmt.date(d, 'short')} · ${fmt.time(d)}`; },
    relative(d) {
      const dt = toDate(d);
      if (!dt) return '';
      const s = Math.round((Date.now() - dt.getTime()) / 1000);
      if (s < 45) return 'ahora';
      if (s < 3600) return `hace ${Math.round(s / 60)} min`;
      if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
      if (s < 86400 * 7) return `hace ${Math.round(s / 86400)} d`;
      return fmt.date(dt, 'short');
    },
    isoDate(d) {
      const dt = toDate(d) || new Date();
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    }
  };
  function toDate(d) {
    if (!d) return null;
    if (d instanceof Date) return d;
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y, m, day] = d.split('-').map(Number);
      return new Date(y, m - 1, day);
    }
    const dt = new Date(d);
    return isNaN(dt) ? null : dt;
  }

  const esc = (s) => String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const uid = (p = 'id') => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const $ = (sel, scope) => (scope || document).querySelector(sel);
  const $$ = (sel, scope) => Array.from((scope || document).querySelectorAll(sel));

  const AVATAR_COLORS = ['#2a78d6', '#e0612f', '#159a6b', '#c98500', '#6250d6', '#d1477a', '#0d8aa8', '#7a5c3e'];
  function initials(name) {
    return String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  }
  function avatarColor(name) {
    let h = 0;
    for (const ch of String(name || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
  }
  function avatar(name, size = '') {
    return `<span class="avatar ${size}" style="background:${avatarColor(name)}">${esc(initials(name))}</span>`;
  }

  // ---------- Notificaciones ----------
  let stack;
  function toast(title, message = '', kind = 'ok', ms = 3600) {
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      stack.setAttribute('role', 'status');
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }
    const map = { ok: 'checkCircle', warn: 'alert', danger: 'alert', info: 'info' };
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.innerHTML = `${icon(map[kind] || 'info')}<div><strong>${esc(title)}</strong>${message ? `<span>${esc(message)}</span>` : ''}</div><button aria-label="Cerrar">${icon('x', 'sm')}</button>`;
    const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 250); };
    el.querySelector('button').onclick = close;
    stack.appendChild(el);
    setTimeout(close, ms);
    return close;
  }

  // ---------- Modal ----------
  const openStack = [];
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openStack.length) openStack[openStack.length - 1]();
  });

  function modal({ title, subtitle = '', body = '', size = '', actions = null, onOpen, onClose, dismissible = true }) {
    const rootEl = document.createElement('div');
    rootEl.className = 'modal-root';
    rootEl.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="modal-head"><div><h3>${esc(title)}</h3>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>
          <button class="btn btn-ghost btn-icon btn-sm" data-close aria-label="Cerrar">${icon('x')}</button></div>
        <div class="modal-body"></div>
        <div class="modal-foot"></div>
      </div>`;
    const bodyEl = rootEl.querySelector('.modal-body');
    if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
    const foot = rootEl.querySelector('.modal-foot');
    const list = actions || [{ label: 'Cerrar', kind: 'btn-primary' }];
    if (!list.length) foot.remove();
    let closed = false;
    const prevFocus = document.activeElement;
    const close = () => {
      if (closed) return;
      closed = true;
      openStack.splice(openStack.indexOf(close), 1);
      rootEl.remove();
      document.body.style.overflow = openStack.length ? 'hidden' : '';
      if (onClose) onClose();
      if (prevFocus && prevFocus.focus) prevFocus.focus();
    };
    list.forEach((a) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `btn ${a.kind || ''}`;
      b.innerHTML = `${a.icon ? icon(a.icon) : ''}${esc(a.label)}`;
      b.onclick = async () => {
        if (!a.onClick) return close();
        const r = await a.onClick({ close, el: rootEl, button: b });
        if (r !== false) close();
      };
      foot.appendChild(b);
    });
    rootEl.querySelector('[data-close]').onclick = close;
    if (dismissible) rootEl.querySelector('.modal-backdrop').onclick = close;
    document.body.appendChild(rootEl);
    document.body.style.overflow = 'hidden';
    openStack.push(close);
    WAB.hydrateIcons(rootEl);
    if (onOpen) onOpen(rootEl, close);
    const first = rootEl.querySelector('.modal-body input, .modal-body select, .modal-body textarea');
    if (first && window.matchMedia('(pointer: fine)').matches) first.focus();
    return { el: rootEl, body: bodyEl, close };
  }

  function confirm({ title = '¿Confirmar?', message = '', confirmLabel = 'Confirmar', danger = false } = {}) {
    return new Promise((resolve) => {
      let answered = false;
      modal({
        title, size: 'sm',
        body: `<p class="mb-0">${esc(message)}</p>`,
        actions: [
          { label: 'Cancelar', kind: 'btn-ghost' },
          { label: confirmLabel, kind: danger ? 'btn-danger' : 'btn-primary', onClick: () => { answered = true; resolve(true); } }
        ],
        onClose: () => { if (!answered) resolve(false); }
      });
    });
  }

  // ---------- Formularios ----------
  /**
   * fields: [{ name, label, type, options:[{value,label}]|[string], required, min, max, step,
   *            value, hint, placeholder, full, pattern, patternMsg, rows }]
   */
  function renderFields(fields, values = {}) {
    return fields.map((f) => {
      const v = values[f.name] !== undefined ? values[f.name] : (f.value !== undefined ? f.value : '');
      const id = `f_${f.name}_${Math.random().toString(36).slice(2, 6)}`;
      const req = f.required ? ' required' : '';
      const common = `id="${id}" name="${esc(f.name)}"${req}${f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : ''}`;
      let control;
      if (f.type === 'section') return `<div class="full"><h4 class="mb-0 mt-1">${esc(f.label)}</h4>${f.hint ? `<p class="small muted mb-0">${esc(f.hint)}</p>` : ''}</div>`;
      if (f.type === 'select') {
        const opts = (f.options || []).map((o) => {
          const ov = typeof o === 'object' ? o.value : o;
          const ol = typeof o === 'object' ? o.label : o;
          return `<option value="${esc(ov)}"${String(ov) === String(v) ? ' selected' : ''}>${esc(ol)}</option>`;
        }).join('');
        control = `<select class="select" ${common}>${f.placeholderOption ? `<option value="">${esc(f.placeholderOption)}</option>` : ''}${opts}</select>`;
      } else if (f.type === 'textarea') {
        control = `<textarea class="textarea" rows="${f.rows || 3}" ${common}>${esc(v)}</textarea>`;
      } else if (f.type === 'checkbox') {
        return `<div class="field ${f.full ? 'full' : ''}"><label class="switch"><input type="checkbox" name="${esc(f.name)}"${v ? ' checked' : ''}><span class="track"></span>${esc(f.label)}</label>${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ''}</div>`;
      } else {
        const t = f.type || 'text';
        const extra = `${f.min !== undefined ? ` min="${f.min}"` : ''}${f.max !== undefined ? ` max="${f.max}"` : ''}${f.step !== undefined ? ` step="${f.step}"` : ''}${f.maxlength ? ` maxlength="${f.maxlength}"` : ''}`;
        control = `<input class="input" type="${t}" value="${esc(v)}" ${common}${extra}>`;
      }
      return `<div class="field ${f.full ? 'full' : ''}" data-field="${esc(f.name)}">
        <label for="${id}">${esc(f.label)}${f.required ? ' <span style="color:var(--danger)">*</span>' : ''}</label>
        ${control}
        ${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ''}
        <span class="error-msg"></span>
      </div>`;
    }).join('');
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PHONE_RE = /^\+?[\d\s()-]{7,20}$/;

  /** Valida un contenedor de campos. Devuelve {ok, values}. */
  function validate(scope, fields) {
    const values = {};
    let ok = true;
    let firstBad = null;
    fields.filter((f) => f.type !== 'section').forEach((f) => {
      const input = scope.querySelector(`[name="${f.name}"]`);
      if (!input) return;
      const wrap = input.closest('.field');
      let val = f.type === 'checkbox' ? input.checked : input.value.trim();
      let err = '';
      if (f.type !== 'checkbox') {
        if (f.required && val === '') err = 'Este campo es obligatorio.';
        else if (val !== '' && f.type === 'email' && !EMAIL_RE.test(val)) err = 'Ingrese un correo válido.';
        else if (val !== '' && f.type === 'tel' && !PHONE_RE.test(val)) err = 'Ingrese un teléfono válido (7 a 20 dígitos).';
        else if (val !== '' && f.type === 'number') {
          const n = Number(val);
          if (!Number.isFinite(n)) err = 'Ingrese un número.';
          else if (f.min !== undefined && n < f.min) err = `El mínimo es ${f.min}.`;
          else if (f.max !== undefined && n > f.max) err = `El máximo es ${f.max}.`;
          else val = n;
        } else if (val !== '' && f.pattern && !new RegExp(f.pattern).test(val)) err = f.patternMsg || 'Formato no válido.';
        if (!err && f.validate) err = f.validate(val, scope) || '';
      }
      if (wrap) {
        wrap.classList.toggle('invalid', !!err);
        const m = wrap.querySelector('.error-msg');
        if (m) m.textContent = err;
      }
      if (err) { ok = false; if (!firstBad) firstBad = input; }
      values[f.name] = val;
    });
    if (firstBad) firstBad.focus();
    return { ok, values };
  }

  function formModal({ title, subtitle, fields, values = {}, submitLabel = 'Guardar', size = '', onSubmit, extraActions = [], onOpen }) {
    const form = document.createElement('form');
    form.className = 'form-grid';
    form.noValidate = true;
    form.innerHTML = renderFields(fields, values);
    form.addEventListener('input', (e) => {
      const w = e.target.closest('.field.invalid');
      if (w) w.classList.remove('invalid');
    });
    let m;
    const submit = async () => {
      const r = validate(form, fields);
      if (!r.ok) return false;
      const res = await onSubmit(r.values, form);
      if (typeof res === 'string') { toast('No se pudo guardar', res, 'danger'); return false; }
      return res !== false;
    };
    form.addEventListener('submit', async (e) => { e.preventDefault(); if (await submit()) m.close(); });
    m = modal({
      title, subtitle, body: form, size,
      actions: extraActions.concat([{ label: 'Cancelar', kind: 'btn-ghost' }, { label: submitLabel, kind: 'btn-primary', onClick: submit }]),
      onOpen
    });
    return m;
  }

  // ---------- Panel lateral ----------
  function drawer({ title, body = '', actions = [], wide = false, onClose }) {
    const rootEl = document.createElement('div');
    rootEl.className = 'drawer-root';
    rootEl.innerHTML = `<div class="modal-backdrop"></div>
      <aside class="drawer ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="drawer-head"><h3>${esc(title)}</h3><button class="btn btn-ghost btn-icon btn-sm" data-close aria-label="Cerrar">${icon('x')}</button></div>
        <div class="drawer-body"></div>
        <div class="drawer-foot"></div>
      </aside>`;
    const bodyEl = rootEl.querySelector('.drawer-body');
    const foot = rootEl.querySelector('.drawer-foot');
    const close = () => {
      const i = openStack.indexOf(close);
      if (i < 0) return;
      openStack.splice(i, 1);
      rootEl.remove();
      document.body.style.overflow = openStack.length ? 'hidden' : '';
      if (onClose) onClose();
    };
    const setBody = (html) => { if (typeof html === 'string') bodyEl.innerHTML = html; else { bodyEl.innerHTML = ''; bodyEl.appendChild(html); } WAB.hydrateIcons(bodyEl); };
    const setActions = (list) => {
      foot.innerHTML = '';
      foot.hidden = !list.length;
      list.forEach((a) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `btn ${a.kind || ''}`;
        b.innerHTML = `${a.icon ? icon(a.icon) : ''}${esc(a.label)}`;
        b.onclick = () => a.onClick({ close, el: rootEl });
        foot.appendChild(b);
      });
    };
    setBody(body);
    setActions(actions);
    rootEl.querySelector('[data-close]').onclick = close;
    rootEl.querySelector('.modal-backdrop').onclick = close;
    document.body.appendChild(rootEl);
    document.body.style.overflow = 'hidden';
    openStack.push(close);
    return { el: rootEl, body: bodyEl, close, setBody, setActions };
  }

  // ---------- Menú contextual ----------
  function popMenu(anchor, items) {
    document.querySelectorAll('.menu-pop').forEach((m) => m.remove());
    const pop = document.createElement('div');
    pop.className = 'menu-pop';
    items.forEach((it) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = `${it.icon ? icon(it.icon, 'sm') : ''}<span>${esc(it.label)}</span>`;
      if (it.danger) b.style.color = 'var(--danger)';
      b.onclick = (e) => { e.stopPropagation(); pop.remove(); it.onClick(); };
      pop.appendChild(b);
    });
    document.body.appendChild(pop);
    const r = anchor.getBoundingClientRect();
    const w = pop.offsetWidth;
    pop.style.top = `${r.bottom + window.scrollY + 6}px`;
    pop.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) + window.scrollX}px`;
    setTimeout(() => document.addEventListener('click', function off() { pop.remove(); document.removeEventListener('click', off); }), 0);
  }

  // ---------- Descargas ----------
  function download(filename, content, mime = 'text/plain;charset=utf-8') {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function toCSV(rows) {
    const cell = (v) => {
      const s = String(v === null || v === undefined ? '' : v);
      return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n');
  }
  async function copy(text, label = 'Copiado al portapapeles') {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const t = document.createElement('textarea');
      t.value = text; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } catch (err) { /* sin portapapeles */ }
      t.remove();
    }
    toast(label, text.length > 60 ? text.slice(0, 60) + '…' : text, 'ok');
  }

  // ---------- Tema ----------
  function applyTheme(t) {
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  }
  function currentTheme() {
    const t = document.documentElement.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function toggleTheme() {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    WAB.storage.set('theme', next);
    document.dispatchEvent(new CustomEvent('wab:theme', { detail: next }));
    return next;
  }
  applyTheme(WAB.storage ? WAB.storage.get('theme') : null);

  function emptyState({ icon: ic = 'info', title, text = '', action = '' }) {
    return `<div class="empty"><div class="empty-icon">${icon(ic, 'lg')}</div><h4>${esc(title)}</h4>${text ? `<p>${esc(text)}</p>` : ''}${action}</div>`;
  }

  /** Simula un estado de carga en un botón. */
  function busy(btn, ms = 700) {
    return new Promise((res) => {
      btn.classList.add('loading');
      setTimeout(() => { btn.classList.remove('loading'); res(); }, ms);
    });
  }

  WAB.ui = { fmt, esc, uid, debounce, $, $$, initials, avatarColor, avatar, toast, modal, confirm, renderFields, validate, formModal, drawer, popMenu, download, toCSV, copy, toggleTheme, currentTheme, applyTheme, emptyState, busy, toDate };
})(window);
