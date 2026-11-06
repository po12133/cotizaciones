/*
 * CorePoints · ui.js
 * Componentes de interfaz compartidos por el portal y el panel:
 * iconos, toasts, modales, diálogos, cargador de imágenes, visor, gráficos.
 */
(function () {
  'use strict';
  const CP = (window.CP = window.CP || {});
  const u = CP.util;
  const esc = u.esc;

  /* ---------------- iconos (trazos 24×24) ---------------- */
  const PATHS = {
    home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
    receipt: 'M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h4',
    coins: 'M8 8a6 3 0 1 0 12 0A6 3 0 1 0 8 8zM8 8v4c0 1.7 2.7 3 6 3s6-1.3 6-3V8M4 12a6 3 0 0 0 4 2.8M4 12v4c0 1.7 2.7 3 6 3 1 0 2-.1 2.8-.4M4 12c0-1.2 1.4-2.3 3.5-2.8',
    gift: 'M3 8h18v4H3zM5 12v9h14v-9M12 8v13M12 8c-1.5-3-5.5-4-6-1.5S9 8 12 8zm0 0c1.5-3 5.5-4 6-1.5S15 8 12 8z',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-7 8-7s8 3 8 7',
    users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-3.9 3.1-7 7-7s7 3.1 7 7M16 3.1a4 4 0 0 1 0 7.8M18 14c2.4.8 4 3.4 4 7',
    store: 'M3 9l1.5-5h15L21 9M3 9v1a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0V9M3 9h18M5 13v8h14v-8M10 21v-5h4v5',
    check: 'M4 12.5 9.5 18 20 6',
    x: 'M6 6l12 12M18 6 6 18',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
    sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
    upload: 'M12 16V4M7 9l5-5 5 5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3',
    camera: 'M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    image: 'M4 4h16v16H4zM4 16l5-5 4 4 3-3 4 4M15 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
    trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
    refresh: 'M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4',
    search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
    filter: 'M4 5h16l-6 8v6l-4-2v-4z',
    left: 'M15 5l-7 7 7 7',
    right: 'M9 5l7 7-7 7',
    down: 'M5 9l7 7 7-7',
    download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
    zoom: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4M11 8v6M8 11h6',
    eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    plus: 'M12 5v14M5 12h14',
    edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
    bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4',
    settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z',
    logout: 'M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l-5-5 5-5M5 12h11',
    lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
    info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h0',
    alert: 'M12 3 2 20h20zM12 10v4M12 17h0',
    arrow: 'M5 12h14M13 6l6 6-6 6',
    calendar: 'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4',
    tag: 'M3 12V4h8l10 10-8 8zM7.5 8.5h0',
    wrench: 'M14.7 6.3a4 4 0 0 0 5 5L22 14l-8 8-2.3-2.3a4 4 0 0 0-5-5L2 10l8-8z',
    mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
    history: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2',
    external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
    menu: 'M4 6h16M4 12h16M4 18h16',
    zap: 'M13 2 4 14h7l-1 8 9-12h-7z',
    award: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.5 14 7 22l5-3 5 3-1.5-8',
    package: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
    copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
    paw: 'M8 9.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16 9.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM4.5 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19.5 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 12c-3 0-5.5 3.5-5.5 6 0 1.7 1.5 2.5 3 2.5 1 0 1.6-.5 2.5-.5s1.5.5 2.5.5c1.5 0 3-.8 3-2.5 0-2.5-2.5-6-5.5-6z',
    whatsapp: 'M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3zM8.5 8c.3-.6.6-.6 1-.6h.6c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .6l-.5.7c-.1.2-.2.3 0 .6.5.9 1.3 1.8 2.4 2.4.3.2.5.1.6 0l.7-.8c.2-.2.4-.2.6-.1l1.8.9c.3.1.4.2.4.4 0 .5-.2 1.3-1 1.7-.7.4-1.8.5-3.6-.3-2.1-.9-3.6-3-3.9-3.5-.3-.5-1-1.8-.5-3.4z'
  };
  const ui = (CP.ui = {});

  ui.icon = (name, cls) => '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + (PATHS[name] || PATHS.info) + '"/></svg>';
  ui.esc = esc;
  ui.$ = (sel, root) => (root || document).querySelector(sel);
  ui.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  ui.h = function (html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

  ui.badge = (label, tone, icon) => '<span class="badge badge-' + (tone || 'neutral') + '">' + (icon ? ui.icon(icon) : '<i class="dot"></i>') + esc(label) + '</span>';
  ui.purchaseBadge = (s) => ui.badge(CP.purchases.STATUS[s].short, CP.purchases.STATUS[s].tone);
  ui.redemptionBadge = (s) => ui.badge(CP.redemptions.STATUS[s].label, CP.redemptions.STATUS[s].tone);
  ui.avatar = (name, cls) => {
    let h = 0; String(name).split('').forEach((ch) => { h = (h * 31 + ch.charCodeAt(0)) % 360; });
    return '<span class="avatar ' + (cls || '') + '" style="--h:' + h + '">' + esc(u.initials(name)) + '</span>';
  };
  ui.empty = (icon, title, text, action) => '<div class="empty">' + ui.icon(icon || 'paw', 'empty-ic') + '<h4>' + esc(title) + '</h4>' + (text ? '<p>' + esc(text) + '</p>' : '') + (action || '') + '</div>';

  /* ---------------- toasts ---------------- */
  ui.toast = function (msg, type, ms) {
    let box = document.getElementById('toasts');
    if (!box) { box = ui.h('<div id="toasts" class="toasts" role="status" aria-live="polite"></div>'); document.body.appendChild(box); }
    const icon = { success: 'check', error: 'alert', warn: 'alert', info: 'info' }[type || 'success'];
    const t = ui.h('<div class="toast toast-' + (type || 'success') + '">' + ui.icon(icon) + '<span>' + esc(msg) + '</span><button class="toast-x" aria-label="Cerrar">' + ui.icon('x') + '</button></div>');
    box.appendChild(t);
    const close = () => { t.classList.add('out'); setTimeout(() => t.remove(), 250); };
    t.querySelector('.toast-x').onclick = close;
    setTimeout(close, ms || (type === 'error' ? 6000 : 3800));
  };

  /** Ejecuta una operación de negocio mostrando el error como toast. Devuelve el resultado o undefined. */
  ui.safe = function (fn, okMsg) {
    try {
      const r = fn();
      if (okMsg) ui.toast(typeof okMsg === 'function' ? okMsg(r) : okMsg, 'success');
      return r;
    } catch (e) {
      ui.toast(e instanceof CP.BizError ? e.message : 'Error inesperado: ' + e.message, 'error');
      if (!(e instanceof CP.BizError)) console.error(e);
      return undefined;
    }
  };

  /* ---------------- modales ---------------- */
  const stack = [];
  ui.modal = function (o) {
    const el = ui.h(
      '<div class="modal-wrap" role="dialog" aria-modal="true">' +
      '<div class="modal modal-' + (o.size || 'md') + (o.cls ? ' ' + o.cls : '') + '">' +
      '<header class="modal-head">' + (o.icon ? '<span class="modal-ic">' + ui.icon(o.icon) + '</span>' : '') + '<div><h3>' + esc(o.title || '') + '</h3>' + (o.subtitle ? '<p>' + o.subtitle + '</p>' : '') + '</div>' +
      '<button class="icon-btn modal-x" aria-label="Cerrar">' + ui.icon('x') + '</button></header>' +
      '<div class="modal-body"></div>' +
      (o.actions && o.actions.length ? '<footer class="modal-foot"></footer>' : '') +
      '</div></div>');
    const body = el.querySelector('.modal-body');
    if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.appendChild(o.body);
    let closed = false;
    const api = {
      el, body,
      close(result) {
        if (closed) return;
        closed = true;
        el.classList.add('out');
        document.removeEventListener('keydown', onKey);
        setTimeout(() => el.remove(), 180);
        const i = stack.indexOf(api); if (i >= 0) stack.splice(i, 1);
        if (!stack.length) document.body.classList.remove('no-scroll');
        if (o.onClose) o.onClose(result);
      }
    };
    const foot = el.querySelector('.modal-foot');
    (o.actions || []).forEach((a) => {
      const b = ui.h('<button class="btn ' + (a.cls || 'btn-ghost') + '" type="button">' + (a.icon ? ui.icon(a.icon) : '') + esc(a.label) + '</button>');
      if (a.id) b.dataset.action = a.id;
      b.onclick = async () => {
        if (!a.onClick) return api.close(a.value);
        b.disabled = true;
        try { const r = await a.onClick(api); if (r !== false) api.close(a.value); }
        finally { b.disabled = false; }
      };
      foot.appendChild(b);
    });
    function onKey(e) { if (e.key === 'Escape' && stack[stack.length - 1] === api && !o.persistent && !document.querySelector('.viewer')) api.close(); }
    el.querySelector('.modal-x').onclick = () => api.close();
    el.addEventListener('mousedown', (e) => { if (e.target === el && !o.persistent) api.close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(el);
    document.body.classList.add('no-scroll');
    stack.push(api);
    requestAnimationFrame(() => el.classList.add('in'));
    if (o.onOpen) o.onOpen(api);
    return api;
  };
  const viewers = new Set();
  ui.closeAll = () => { viewers.forEach((close) => close()); stack.slice().forEach((m) => m.close()); };

  ui.confirm = function (o) {
    return new Promise((resolve) => {
      ui.modal({
        title: o.title, icon: o.icon || (o.danger ? 'alert' : 'info'), size: 'sm', cls: o.danger ? 'modal-danger' : '',
        body: '<p class="confirm-text">' + o.message + '</p>',
        onClose: (v) => resolve(v === true),
        actions: [{ label: o.cancelLabel || 'Cancelar', cls: 'btn-ghost', value: false }, { label: o.confirmLabel || 'Confirmar', cls: o.danger ? 'btn-danger' : 'btn-primary', value: true, id: 'confirm' }]
      });
    });
  };

  /** Campos de formulario genéricos. */
  ui.field = function (f) {
    const id = 'f-' + f.name + '-' + u.rand(4);
    const req = f.required ? ' required' : '';
    const val = f.value == null ? '' : f.value;
    let input;
    if (f.type === 'select') {
      input = '<select id="' + id + '" name="' + f.name + '"' + req + '>' + (f.placeholder ? '<option value="">' + esc(f.placeholder) + '</option>' : '') +
        f.options.map((o) => { const v = typeof o === 'object' ? o.value : o, l = typeof o === 'object' ? o.label : o; return '<option value="' + esc(v) + '"' + (String(v) === String(val) ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('') + '</select>';
    } else if (f.type === 'textarea') {
      input = '<textarea id="' + id + '" name="' + f.name + '" rows="' + (f.rows || 3) + '"' + req + (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') + (f.maxlength ? ' maxlength="' + f.maxlength + '"' : '') + '>' + esc(val) + '</textarea>';
    } else if (f.type === 'toggle') {
      return '<label class="toggle-row"><span><b>' + esc(f.label) + '</b>' + (f.hint ? '<small>' + esc(f.hint) + '</small>' : '') + '</span><input type="checkbox" class="toggle" name="' + f.name + '"' + (val ? ' checked' : '') + '></label>';
    } else {
      input = (f.prefix || f.suffix ? '<div class="input-affix">' : '') + (f.prefix ? '<span>' + esc(f.prefix) + '</span>' : '') +
        '<input id="' + id + '" name="' + f.name + '" type="' + (f.type || 'text') + '" value="' + esc(val) + '"' + req +
        (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') + (f.min != null ? ' min="' + f.min + '"' : '') + (f.max != null ? ' max="' + f.max + '"' : '') +
        (f.step ? ' step="' + f.step + '"' : '') + (f.inputmode ? ' inputmode="' + f.inputmode + '"' : '') + (f.autocomplete ? ' autocomplete="' + f.autocomplete + '"' : '') + (f.maxlength ? ' maxlength="' + f.maxlength + '"' : '') + '>' +
        (f.suffix ? '<span>' + esc(f.suffix) + '</span>' : '') + (f.prefix || f.suffix ? '</div>' : '');
    }
    return '<div class="field' + (f.wide ? ' field-wide' : '') + '" data-field="' + f.name + '"><label for="' + id + '">' + esc(f.label) + (f.required ? ' <i class="req">*</i>' : f.optional ? ' <small class="opt">(opcional)</small>' : '') + '</label>' + input +
      (f.hint ? '<small class="hint">' + esc(f.hint) + '</small>' : '') + '<small class="err"></small></div>';
  };

  ui.formValues = function (form) {
    const v = {};
    ui.$$('input, select, textarea', form).forEach((el) => {
      if (!el.name) return;
      v[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    });
    return v;
  };
  ui.setErrors = function (form, errors) {
    ui.$$('.field', form).forEach((f) => { f.classList.remove('has-err'); const e = f.querySelector('.err'); if (e) e.textContent = ''; });
    let first = null;
    Object.keys(errors || {}).forEach((k) => {
      const f = form.querySelector('[data-field="' + k + '"]');
      if (!f) return;
      f.classList.add('has-err');
      const e = f.querySelector('.err'); if (e) e.textContent = errors[k];
      if (!first) first = f;
    });
    if (first) { first.scrollIntoView({ behavior: 'smooth', block: 'center' }); const i = first.querySelector('input,select,textarea,button'); if (i) setTimeout(() => i.focus({ preventScroll: true }), 300); }
  };

  /**
   * Diálogo con formulario. onSubmit(values, api) debe devolver true/undefined para cerrar
   * o lanzar BizError (con .field) para marcar el campo.
   */
  ui.formDialog = function (o) {
    const form = ui.h('<form class="form-grid' + (o.cols === 1 ? ' one' : '') + '" novalidate>' + (o.intro ? '<div class="field-wide form-intro">' + o.intro + '</div>' : '') + o.fields.map(ui.field).join('') + (o.extra || '') + '<button type="submit" hidden></button></form>');
    return new Promise((resolve) => {
      let done = false;
      const submit = (api) => {
        const values = ui.formValues(form);
        try {
          const r = o.onSubmit(values, api, form);
          if (r === false) return false;
          done = true;
          resolve(values);
          return true;
        } catch (e) {
          if (e instanceof CP.BizError) {
            if (e.fields) ui.setErrors(form, e.fields);
            else if (e.field && form.querySelector('[data-field="' + e.field + '"]')) ui.setErrors(form, { [e.field]: e.message });
            else ui.toast(e.message, 'error');
          } else { console.error(e); ui.toast('Error inesperado: ' + e.message, 'error'); }
          return false;
        }
      };
      const api = ui.modal({
        title: o.title, subtitle: o.subtitle, icon: o.icon, size: o.size || 'md', body: form,
        onClose: () => { if (!done) resolve(null); },
        onOpen: o.onOpen ? (m) => o.onOpen(m, form) : null,
        actions: [{ label: 'Cancelar', cls: 'btn-ghost' }, { label: o.submitLabel || 'Guardar', cls: o.danger ? 'btn-danger' : 'btn-primary', icon: o.submitIcon, id: 'submit', onClick: (m) => submit(m) }]
      });
      form.addEventListener('submit', (e) => { e.preventDefault(); if (submit(api)) api.close(); });
    });
  };

  /* ---------------- imágenes ---------------- */
  /** <img> que se hidrata desde IndexedDB ('idb:id' o id) o arte incluido ('art:clave'). */
  ui.img = function (ref, alt, cls) {
    if (ref && String(ref).startsWith('art:')) return '<img class="' + (cls || '') + '" src="' + CP.rewards.artUrl(ref.slice(4)) + '" alt="' + esc(alt || '') + '" loading="lazy">';
    return '<img class="' + (cls || '') + ' is-loading" data-img="' + esc(ref || '') + '" alt="' + esc(alt || '') + '">';
  };
  ui.hydrate = function (root) {
    ui.$$('img[data-img]', root).forEach((img) => {
      const ref = img.dataset.img;
      img.removeAttribute('data-img');
      const id = ref.startsWith('idb:') ? ref.slice(4) : ref;
      CP.images.url(id).then((url) => {
        img.classList.remove('is-loading');
        if (url) img.src = url;
        else { img.classList.add('is-missing'); img.alt = 'Imagen no disponible en este navegador'; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150"><rect width="200" height="150" fill="#181b2e"/><text x="100" y="80" fill="#6d7391" font-family="sans-serif" font-size="12" text-anchor="middle">Imagen no disponible</text></svg>'); }
      }).catch(() => img.classList.remove('is-loading'));
    });
  };

  /**
   * Cargador de imágenes: arrastrar y soltar, explorador de archivos, cámara del celular,
   * vista previa, reemplazo y eliminación. Guarda en IndexedDB al seleccionar.
   * opts: { label, hint, required, kind, value (id), maxMB(), onChange(id|null), capture }
   */
  ui.uploader = function (host, opts) {
    let value = opts.value || null;
    let owned = false; // la imagen fue subida en esta sesión del formulario (puede borrarse)
    host.classList.add('uploader');
    host.innerHTML =
      '<input type="file" accept="image/jpeg,image/png,image/webp" class="up-file" hidden>' +
      '<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" class="up-cam" hidden>' +
      '<div class="up-drop" tabindex="0" role="button" aria-label="' + esc(opts.label || 'Subir imagen') + '">' +
      '<div class="up-empty">' + ui.icon(opts.icon || 'upload', 'up-ic') + '<b>Arrastra la foto aquí</b><span>o</span>' +
      '<div class="up-btns"><button type="button" class="btn btn-sm btn-primary up-pick">' + ui.icon('image') + 'Elegir archivo</button>' +
      '<button type="button" class="btn btn-sm btn-ghost up-camera">' + ui.icon('camera') + 'Usar cámara</button></div>' +
      '<small>JPG, PNG o WEBP · máx. <span class="up-max"></span> MB · se optimiza automáticamente</small></div>' +
      '<div class="up-busy"><span class="spinner"></span><b>Procesando imagen…</b></div>' +
      '<div class="up-preview"><img alt="Vista previa"><div class="up-meta"></div>' +
      '<div class="up-actions"><button type="button" class="btn btn-sm btn-ghost up-zoom">' + ui.icon('zoom') + 'Ampliar</button>' +
      '<button type="button" class="btn btn-sm btn-ghost up-replace">' + ui.icon('refresh') + 'Reemplazar</button>' +
      '<button type="button" class="btn btn-sm btn-danger-ghost up-remove">' + ui.icon('trash') + 'Quitar</button></div></div>' +
      '</div>';
    const drop = host.querySelector('.up-drop');
    const fileIn = host.querySelector('.up-file');
    const camIn = host.querySelector('.up-cam');
    const img = host.querySelector('.up-preview img');
    const meta = host.querySelector('.up-meta');
    const maxMB = () => (opts.maxMB ? opts.maxMB() : 8);
    host.querySelector('.up-max').textContent = maxMB();

    function setState(s) { host.dataset.state = s; }
    async function show(id, info) {
      const url = await CP.images.url(id);
      if (!url) { value = null; setState('empty'); if (opts.onChange) opts.onChange(null); return; }
      img.src = url;
      const rec = info || (await CP.images.get(id)) || {};
      const kb = (n) => (n / 1024 < 1024 ? Math.round(n / 1024) + ' KB' : (n / 1048576).toFixed(1) + ' MB');
      meta.innerHTML = '<b>' + esc(rec.name || 'imagen') + '</b><span>' + (rec.width ? rec.width + '×' + rec.height + ' px · ' : '') + kb(rec.size || 0) +
        (rec.compressed ? ' · optimizada desde ' + kb(rec.originalSize) : '') + '</span><span class="up-ok">' + ui.icon('check') + 'Guardada en este navegador</span>';
      setState('preview');
    }
    async function handle(file) {
      if (!file) return;
      const err = CP.images.validate(file, maxMB());
      if (err) { ui.toast(err, 'error'); return; }
      setState('busy');
      try {
        const saved = await CP.images.saveFile(file, { maxMB: maxMB(), kind: opts.kind });
        if (value && owned) CP.images.remove(value).catch(() => {});
        value = saved.id; owned = true;
        host.classList.remove('has-err');
        await show(value, saved);
        if (opts.onChange) opts.onChange(value);
      } catch (e) {
        ui.toast(e.message || 'No se pudo procesar la imagen.', 'error');
        setState(value ? 'preview' : 'empty');
      }
    }
    host.querySelector('.up-pick').onclick = (e) => { e.stopPropagation(); fileIn.click(); };
    host.querySelector('.up-camera').onclick = (e) => { e.stopPropagation(); camIn.click(); };
    host.querySelector('.up-replace').onclick = (e) => { e.stopPropagation(); fileIn.click(); };
    host.querySelector('.up-zoom').onclick = (e) => { e.stopPropagation(); if (value) ui.viewer([{ id: value, label: opts.label }], 0); };
    host.querySelector('.up-remove').onclick = (e) => {
      e.stopPropagation();
      if (value && owned) CP.images.remove(value).catch(() => {});
      value = null; owned = false; fileIn.value = ''; camIn.value = '';
      setState('empty');
      if (opts.onChange) opts.onChange(null);
    };
    drop.addEventListener('click', (e) => { if (host.dataset.state === 'empty' && !e.target.closest('button')) fileIn.click(); });
    drop.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && host.dataset.state === 'empty') { e.preventDefault(); fileIn.click(); } });
    fileIn.onchange = () => { handle(fileIn.files[0]); fileIn.value = ''; };
    camIn.onchange = () => { handle(camIn.files[0]); camIn.value = ''; };
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('drag'); }));
    drop.addEventListener('drop', (e) => {
      const files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length > 1) ui.toast('Se usará solo la primera imagen.', 'info');
      if (files && files[0]) handle(files[0]);
    });
    setState('empty');
    if (value) { owned = !!opts.owned; show(value); }
    return {
      get value() { return value; },
      /** Desvincula la imagen del formulario sin borrarla (ya fue guardada en un registro). */
      commit() { owned = false; },
      handle,
      reset(deleteOwned) { if (deleteOwned && value && owned) CP.images.remove(value).catch(() => {}); value = null; owned = false; setState('empty'); }
    };
  };

  /** Visor a pantalla completa con zoom, navegación y descarga. images: [{ id, label, filename }] */
  ui.viewer = function (images, start) {
    images = images.filter((i) => i && i.id);
    if (!images.length) return;
    let idx = start || 0, zoom = 1, pan = { x: 0, y: 0 };
    const el = ui.h('<div class="viewer" role="dialog" aria-modal="true" aria-label="Visor de imágenes">' +
      '<div class="viewer-top"><div class="viewer-title"></div><div class="viewer-tools">' +
      '<button class="icon-btn" data-v="out" title="Alejar">−</button><span class="viewer-zoom">100%</span><button class="icon-btn" data-v="in" title="Acercar">+</button>' +
      '<button class="icon-btn" data-v="fit" title="Ajustar">' + ui.icon('refresh') + '</button>' +
      '<button class="icon-btn" data-v="dl" title="Descargar">' + ui.icon('download') + '</button>' +
      '<button class="icon-btn" data-v="close" title="Cerrar (Esc)">' + ui.icon('x') + '</button></div></div>' +
      '<div class="viewer-stage"><img alt=""></div>' +
      (images.length > 1 ? '<button class="viewer-nav prev" data-v="prev" aria-label="Anterior">' + ui.icon('left') + '</button><button class="viewer-nav next" data-v="next" aria-label="Siguiente">' + ui.icon('right') + '</button>' : '') +
      '<div class="viewer-thumbs"></div></div>');
    const img = el.querySelector('.viewer-stage img');
    const stage = el.querySelector('.viewer-stage');
    const thumbs = el.querySelector('.viewer-thumbs');
    if (images.length > 1) images.forEach((im, i) => { const b = ui.h('<button class="viewer-thumb" data-i="' + i + '"><img alt=""><span>' + esc(im.label || '') + '</span></button>'); CP.images.url(im.id).then((url) => { if (url) b.querySelector('img').src = url; }); thumbs.appendChild(b); });
    const apply = () => { img.style.transform = 'translate(' + pan.x + 'px,' + pan.y + 'px) scale(' + zoom + ')'; el.querySelector('.viewer-zoom').textContent = Math.round(zoom * 100) + '%'; stage.classList.toggle('zoomed', zoom > 1); };
    const go = async (i) => {
      idx = (i + images.length) % images.length; zoom = 1; pan = { x: 0, y: 0 }; apply();
      const url = await CP.images.url(images[idx].id);
      img.src = url || '';
      el.querySelector('.viewer-title').innerHTML = '<b>' + esc(images[idx].label || 'Imagen') + '</b>' + (images.length > 1 ? '<span>' + (idx + 1) + ' / ' + images.length + '</span>' : '');
      ui.$$('.viewer-thumb', el).forEach((t, k) => t.classList.toggle('on', k === idx));
    };
    const setZoom = (z) => { zoom = Math.min(5, Math.max(1, z)); if (zoom === 1) pan = { x: 0, y: 0 }; apply(); };
    const close = () => { viewers.delete(close); el.classList.add('out'); document.removeEventListener('keydown', onKey, true); setTimeout(() => el.remove(), 180); };
    function onKey(e) {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); close(); }
      if (e.key === 'ArrowRight') go(idx + 1);
      if (e.key === 'ArrowLeft') go(idx - 1);
      if (e.key === '+') setZoom(zoom + 0.5);
      if (e.key === '-') setZoom(zoom - 0.5);
    }
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-v],[data-i]');
      if (!b) { if (e.target === el || e.target === stage) close(); return; }
      if (b.dataset.i != null) return go(+b.dataset.i);
      const v = b.dataset.v;
      if (v === 'close') close();
      if (v === 'prev') go(idx - 1);
      if (v === 'next') go(idx + 1);
      if (v === 'in') setZoom(zoom + 0.5);
      if (v === 'out') setZoom(zoom - 0.5);
      if (v === 'fit') setZoom(1);
      if (v === 'dl') CP.images.download(images[idx].id, images[idx].filename).catch((er) => ui.toast(er.message, 'error'));
    });
    img.addEventListener('dblclick', () => setZoom(zoom > 1 ? 1 : 2.5));
    stage.addEventListener('wheel', (e) => { e.preventDefault(); setZoom(zoom + (e.deltaY < 0 ? 0.25 : -0.25)); }, { passive: false });
    let drag = null;
    img.addEventListener('pointerdown', (e) => { if (zoom <= 1) return; drag = { x: e.clientX - pan.x, y: e.clientY - pan.y }; img.setPointerCapture(e.pointerId); });
    img.addEventListener('pointermove', (e) => { if (!drag) return; pan = { x: e.clientX - drag.x, y: e.clientY - drag.y }; apply(); });
    img.addEventListener('pointerup', () => { drag = null; });
    img.draggable = false;
    document.addEventListener('keydown', onKey, true);
    viewers.add(close);
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    go(idx);
  };

  /* ---------------- gráficos SVG sencillos ---------------- */
  /** Barras verticales. data: [{ label, value, value2? }] */
  ui.barChart = function (data, o) {
    o = o || {};
    const W = 560, H = o.height || 220, pl = 46, pb = 28, pt = 14, pr = 8;
    const keys = o.series || [{ key: 'value', cls: 'b1', label: '' }];
    const max = Math.max(1, ...data.map((d) => Math.max(...keys.map((k) => d[k.key] || 0))));
    const nice = niceMax(max);
    const cw = (W - pl - pr) / Math.max(1, data.length);
    const bw = Math.min(30, (cw * 0.7) / keys.length);
    const fmt = o.format || u.num;
    let g = '';
    for (let i = 0; i <= 4; i++) {
      const y = pt + (H - pt - pb) * (1 - i / 4);
      g += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y + '" y2="' + y + '" class="grid"/><text x="' + (pl - 8) + '" y="' + (y + 4) + '" class="axis" text-anchor="end">' + esc(o.axisFormat ? o.axisFormat(nice * i / 4) : compact(nice * i / 4)) + '</text>';
    }
    data.forEach((d, i) => {
      const cx = pl + cw * i + cw / 2;
      keys.forEach((k, j) => {
        const v = d[k.key] || 0;
        const h = ((H - pt - pb) * v) / nice;
        const x = cx - (bw * keys.length) / 2 + j * bw;
        g += '<rect x="' + (x + 1) + '" y="' + (H - pb - h) + '" width="' + (bw - 2) + '" height="' + Math.max(0, h) + '" rx="4" class="bar ' + k.cls + '" style="--d:' + (i * 40) + 'ms"><title>' + esc(d.label + ' · ' + (k.label ? k.label + ': ' : '') + fmt(v)) + '</title></rect>';
      });
      g += '<text x="' + cx + '" y="' + (H - 8) + '" class="axis" text-anchor="middle">' + esc(d.label) + '</text>';
    });
    const legend = keys.length > 1 || o.legend ? '<div class="legend">' + keys.map((k) => '<span><i class="sw ' + k.cls + '"></i>' + esc(k.label) + '</span>').join('') + '</div>' : '';
    return '<div class="chart">' + legend + '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.title || 'Gráfico') + '">' + g + '</svg></div>';
  };

  /** Dona con leyenda. segs: [{ label, value, cls }] */
  ui.donut = function (segs, o) {
    o = o || {};
    const total = segs.reduce((a, s) => a + s.value, 0);
    const R = 52, C = 2 * Math.PI * R;
    let off = 0, arcs = '';
    segs.forEach((s) => {
      if (!s.value) return;
      const len = (s.value / total) * C;
      arcs += '<circle r="' + R + '" cx="70" cy="70" class="arc ' + s.cls + '" stroke-dasharray="' + len + ' ' + (C - len) + '" stroke-dashoffset="' + -off + '"><title>' + esc(s.label + ': ' + u.num(s.value)) + '</title></circle>';
      off += len;
    });
    return '<div class="donut"><svg viewBox="0 0 140 140" role="img" aria-label="' + esc(o.title || 'Distribución') + '"><circle r="' + R + '" cx="70" cy="70" class="arc-bg"/>' + arcs +
      '<text x="70" y="66" text-anchor="middle" class="donut-v">' + esc(o.center != null ? o.center : u.num(total)) + '</text><text x="70" y="86" text-anchor="middle" class="donut-l">' + esc(o.centerLabel || 'total') + '</text></svg>' +
      '<ul class="legend legend-col">' + segs.map((s) => '<li><i class="sw ' + s.cls + '"></i><span>' + esc(s.label) + '</span><b>' + (o.format || u.num)(s.value) + '</b></li>').join('') + '</ul></div>';
  };

  /** Barras horizontales (ranking). rows: [{ label, value, sub }] */
  ui.hbars = function (rows, o) {
    o = o || {};
    const max = Math.max(1, ...rows.map((r) => r.value));
    return '<div class="hbars">' + rows.map((r, i) => '<div class="hbar"><div class="hbar-top"><span>' + esc(r.label) + '</span><b>' + esc((o.format || u.num)(r.value)) + '</b></div>' +
      '<div class="hbar-track"><i style="width:' + Math.max(2, (r.value / max) * 100) + '%;--d:' + i * 60 + 'ms" class="' + (r.cls || '') + '"></i></div>' + (r.sub ? '<small>' + esc(r.sub) + '</small>' : '') + '</div>').join('') + '</div>';
  };

  function niceMax(v) {
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  function compact(v) {
    if (v >= 1e6) return (v / 1e6).toFixed(v % 1e6 ? 1 : 0) + 'M';
    if (v >= 1e3) return (v / 1e3).toFixed(v % 1e3 ? 1 : 0) + 'k';
    return String(Math.round(v));
  }
  ui.compact = compact;

  /** Serie mensual de los últimos n meses. */
  ui.months = function (n, now) {
    now = now || CP.now();
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({ key: d.getFullYear() + '-' + d.getMonth(), label: u.MESES[d.getMonth()], year: d.getFullYear(), month: d.getMonth() });
    }
    return out;
  };
  ui.monthKey = (v) => { const d = u.toDate(v); return d.getFullYear() + '-' + d.getMonth(); };

  /** Línea de tiempo de estados. */
  ui.timeline = function (items, labeler) {
    return '<ol class="timeline">' + items.slice().reverse().map((h) => {
      const l = labeler(h.status);
      return '<li class="tl-' + l.tone + '"><i></i><div><b>' + esc(l.label) + '</b><span>' + u.dateTime(h.at) + ' · ' + esc(h.by || '') + '</span>' + (h.note ? '<p>' + esc(h.note) + '</p>' : '') + '</div></li>';
    }).join('') + '</ol>';
  };

  /** Vista previa de una notificación: correo + WhatsApp. */
  ui.notificationPreview = function (d, n, logo) {
    const I = ui.icon;
    const ev = CP.notifications.EVENTS[n.event];
    const k = CP.notifications.content(d, n);
    const logoAbs = new URL(logo, location.href).href;
    const m = ui.modal({
      title: k.subject, subtitle: ev.label + ' · ' + u.dateTime(n.at), icon: ev.icon, size: 'lg',
      body: '<div class="tabs"><button class="tab on" data-ch="email">' + I('mail') + 'Correo</button><button class="tab" data-ch="wa">' + I('whatsapp') + 'WhatsApp</button></div>' +
        '<div data-pane="email">' + (k.customer.email ? '<p class="muted" style="font-size:.85rem">Para: ' + esc(k.customer.email) + ' · Simulación, no se envió ningún correo.</p>' : '<p class="muted" style="font-size:.85rem">El cliente no registró correo; en producción solo se enviaría por WhatsApp. Vista previa de la plantilla:</p>') + '<iframe class="email-frame" title="Vista previa del correo"></iframe></div>' +
        '<div data-pane="wa" hidden><p class="muted" style="font-size:.85rem">Para: ' + u.fmtPhone(k.customer.phone) + ' · Simulación.</p><div class="wa-preview"><div class="wa-bubble">' + esc(CP.notifications.whatsapp(d, n)) + '</div></div></div>'
    });
    m.body.querySelector('iframe').srcdoc = CP.notifications.emailHtml(d, n, logoAbs);
    ui.$$('[data-ch]', m.body).forEach((t) => (t.onclick = () => {
      ui.$$('[data-ch]', m.body).forEach((x) => x.classList.toggle('on', x === t));
      ui.$$('[data-pane]', m.body).forEach((p) => (p.hidden = p.dataset.pane !== t.dataset.ch));
    }));
  };

  ui.copy = function (text) {
    const done = () => ui.toast('Copiado: ' + text, 'info', 2000);
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, () => ui.toast('No se pudo copiar', 'error'));
    else { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (e) { /* sin portapapeles */ } t.remove(); }
  };

  /** Pantalla de carga inicial mientras se preparan los datos de demostración. */
  ui.boot = async function (render) {
    const loader = document.getElementById('boot');
    try {
      const created = await CP.seed.ensure();
      if (created) ui.toast('Datos de demostración listos', 'info');
    } catch (e) {
      console.error(e);
      ui.toast('No se pudieron preparar las imágenes de demostración: ' + e.message, 'warn');
      if (!CP.store.hasData()) CP.store.replace(CP.seed.build());
    }
    if (loader) { loader.classList.add('out'); setTimeout(() => loader.remove(), 400); }
    render();
  };
})();
