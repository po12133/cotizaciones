/* =========================================================
 * TecnoDreams — interface da loja (protótipo)
 * Layout compartilhado (cabeçalho, menu, minicarrinho, rodapé),
 * busca com sugestões, cartões de produto e a lógica de cada
 * página, escolhida por <body data-page="...">.
 * Depende de products.js e cart.js.
 * ========================================================= */
(function () {
  'use strict';
  const TD = window.TD;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = TD.esc;
  const fmt = TD.fmt;
  const params = new URLSearchParams(location.search);

  /* ---------------- ícones (sprite SVG) ---------------- */
  const ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    right: '<path d="m9 6 6 6-6 6"/>',
    left: '<path d="m15 6-6 6 6 6"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    truck: '<path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    wa: '<path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.8 14.03c-.24.68-1.42 1.31-1.96 1.37-.5.06-1.13.08-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.79-4.17-4.94-4.36-.14-.19-1.17-1.56-1.17-2.97 0-1.41.74-2.11 1-2.4.26-.29.57-.36.76-.36l.55.01c.18.01.41-.07.64.49.24.57.81 1.98.88 2.12.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.3.37-.43.5-.14.14-.29.3-.12.58.17.29.74 1.22 1.59 1.98 1.09.97 2.01 1.27 2.3 1.42.28.14.45.12.62-.07.17-.19.71-.83.9-1.12.19-.29.38-.24.64-.14.26.09 1.66.78 1.94.93.29.14.48.21.55.33.07.12.07.69-.17 1.36z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    filter: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    package: '<path d="m16.5 9.4-9-5.2M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>',
    tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.5"/>',
    home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15v3M12 10v8M17 6v12"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
    percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    receipt: '<path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 2 2V2l-2 2-3-2-3 2-3-2-3 2-3-2z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    pix: '<path d="m12 2 10 10-10 10L2 12z"/><path d="m8 12 4-4 4 4-4 4z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
    instagram: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
    facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
    youtube: '<path d="M22.5 6.4a2.8 2.8 0 0 0-2-2C18.9 4 12 4 12 4s-6.9 0-8.5.4a2.8 2.8 0 0 0-2 2A29 29 0 0 0 1 12a29 29 0 0 0 .5 5.6 2.8 2.8 0 0 0 2 2C5.1 20 12 20 12 20s6.9 0 8.5-.4a2.8 2.8 0 0 0 2-2A29 29 0 0 0 23 12a29 29 0 0 0-.5-5.6z"/><path d="m9.8 15.5 5.7-3.5-5.7-3.5z"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
    headset: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    store: '<path d="M3 9 4.5 3h15L21 9"/><path d="M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M5 13v8h14v-8"/><path d="M10 21v-5h4v5"/>'
  };
  function icon(name, cls) { return '<svg class="icon ' + (cls || '') + '" aria-hidden="true"><use href="#i-' + name + '"></use></svg>'; }
  TD.icon = icon;
  function injectSprite() {
    const syms = Object.keys(ICONS).map((k) => '<symbol id="i-' + k + '" viewBox="0 0 24 24">' + ICONS[k] + '</symbol>').join('');
    document.body.insertAdjacentHTML('afterbegin', '<svg xmlns="http://www.w3.org/2000/svg" style="display:none">' + syms + '</svg>');
  }

  /* ---------------- utilidades de UI ---------------- */
  const waLink = (text) => 'https://wa.me/' + TD.settings().whatsapp + '?text=' + encodeURIComponent(text);
  TD.waLink = waLink;
  const productUrl = (p) => 'producto.html?id=' + p.id;
  const absUrl = (rel) => new URL(rel, location.href).href;

  function toast(msg, opts = {}) {
    let host = $('.toasts');
    if (!host) { host = document.createElement('div'); host.className = 'toasts'; host.setAttribute('role', 'status'); host.setAttribute('aria-live', 'polite'); document.body.appendChild(host); }
    const el = document.createElement('div');
    el.className = 'toast ' + (opts.type || 'ok');
    const ic = opts.type === 'error' ? 'alert' : opts.type === 'info' ? 'info' : 'check';
    el.innerHTML = (opts.img ? '<img src="' + esc(opts.img) + '" alt="">' : '<span class="t-ic">' + icon(ic) + '</span>') +
      '<div class="t-msg">' + esc(msg) + (opts.sub ? '<small>' + esc(opts.sub) + '</small>' : '') + '</div>' +
      (opts.action ? '<button class="t-act" type="button">' + esc(opts.action) + '</button>' : '');
    host.appendChild(el);
    while (host.children.length > 3) host.firstChild.remove();
    const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 300); };
    if (opts.action) $('.t-act', el).addEventListener('click', () => { opts.onAction && opts.onAction(); close(); });
    setTimeout(close, opts.timeout || 3400);
    return el;
  }
  TD.toast = toast;

  function openModal({ title, body, foot, wide, onOpen }) {
    const el = document.createElement('div');
    el.className = 'modal';
    el.innerHTML = '<div class="modal-backdrop" data-close></div><div class="modal-box' + (wide ? ' wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(title) + '">' +
      '<div class="modal-head"><h3>' + esc(title) + '</h3><button class="icon-btn" data-close aria-label="Fechar">' + icon('x') + '</button></div>' +
      '<div class="modal-body">' + body + '</div>' + (foot ? '<div class="modal-foot">' + foot + '</div>' : '') + '</div>';
    document.body.appendChild(el);
    document.body.style.overflow = 'hidden';
    const prevFocus = document.activeElement;
    const close = () => { el.remove(); if (!$('.modal') && !$('.drawer.open')) document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); prevFocus && prevFocus.focus && prevFocus.focus(); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    el.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
    const first = $('input, select, textarea, button:not([data-close])', $('.modal-body', el)) || $('[data-close].icon-btn', el);
    setTimeout(() => first && first.focus(), 30);
    onOpen && onOpen(el, close);
    return { el, close };
  }
  TD.modal = openModal;

  function confirmBox(title, text, okLabel, onOk, danger) {
    openModal({
      title, body: '<p style="margin:0;color:var(--ink-2)">' + esc(text) + '</p>',
      foot: '<button class="btn btn-outline btn-sm" data-close>Cancelar</button><button class="btn ' + (danger ? 'btn-red' : 'btn-primary') + ' btn-sm" data-ok>' + esc(okLabel) + '</button>',
      onOpen: (el, close) => $('[data-ok]', el).addEventListener('click', () => { close(); onOk(); })
    });
  }
  TD.confirm = confirmBox;

  /* máscaras e validações */
  const onlyDigits = (s) => String(s || '').replace(/\D/g, '');
  const masks = {
    phone: (v) => { const d = onlyDigits(v).slice(0, 11); if (d.length <= 2) return d ? '(' + d : ''; if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2); if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6); return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7); },
    cpf: (v) => { const d = onlyDigits(v).slice(0, 11); return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); },
    cep: (v) => { const d = onlyDigits(v).slice(0, 8); return d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d; },
    card: (v) => onlyDigits(v).slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '),
    exp: (v) => { const d = onlyDigits(v).slice(0, 4); return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; },
    cvv: (v) => onlyDigits(v).slice(0, 4)
  };
  function bindMasks(root) {
    $$('[data-mask]', root).forEach((inp) => inp.addEventListener('input', () => {
      const m = masks[inp.dataset.mask];
      if (m) { inp.value = m(inp.value); }
    }));
  }
  function validCPF(v) {
    const d = onlyDigits(v);
    if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
    for (let t = 9; t < 11; t++) {
      let s = 0;
      for (let i = 0; i < t; i++) s += +d[i] * (t + 1 - i);
      if (((s * 10) % 11) % 10 !== +d[t]) return false;
    }
    return true;
  }
  function luhn(v) {
    const d = onlyDigits(v);
    if (d.length < 13) return false;
    let sum = 0;
    for (let i = 0; i < d.length; i++) { let n = +d[d.length - 1 - i]; if (i % 2) { n *= 2; if (n > 9) n -= 9; } sum += n; }
    return sum % 10 === 0;
  }
  const validators = {
    required: (v) => v.trim().length > 0,
    name: (v) => v.trim().split(/\s+/).length >= 2,
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
    phone: (v) => onlyDigits(v).length >= 10,
    cpf: validCPF,
    cep: (v) => onlyDigits(v).length === 8,
    card: luhn,
    exp: (v) => { const m = v.match(/^(\d{2})\/(\d{2})$/); if (!m) return false; const mo = +m[1], yr = 2000 + +m[2]; const now = new Date(); return mo >= 1 && mo <= 12 && (yr > now.getFullYear() || (yr === now.getFullYear() && mo >= now.getMonth() + 1)); },
    cvv: (v) => /^\d{3,4}$/.test(v),
    password: (v) => v.length >= 6
  };
  /* Valida campos visíveis com data-validate; retorna true/false e foca o 1º inválido */
  function validate(root) {
    let firstBad = null;
    $$('[data-validate]', root).forEach((inp) => {
      const field = inp.closest('.field');
      if (!field || field.offsetParent === null) return;
      const ok = inp.dataset.validate.split(' ').every((rule) => (validators[rule] ? validators[rule](inp.value) : true));
      field.classList.toggle('invalid', !ok);
      field.classList.toggle('valid', ok && inp.value.trim() !== '');
      if (!ok && !firstBad) firstBad = inp;
    });
    if (firstBad) { firstBad.focus(); firstBad.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    return !firstBad;
  }
  function liveValidate(root) {
    root.addEventListener('blur', (e) => {
      const inp = e.target;
      if (!inp.matches || !inp.matches('[data-validate]') || !inp.value) return;
      const field = inp.closest('.field');
      const ok = inp.dataset.validate.split(' ').every((rule) => (validators[rule] ? validators[rule](inp.value) : true));
      field.classList.toggle('invalid', !ok);
      field.classList.toggle('valid', ok);
    }, true);
    root.addEventListener('input', (e) => { const f = e.target.closest && e.target.closest('.field.invalid'); if (f) f.classList.remove('invalid'); });
  }
  function field(o) {
    return '<div class="field ' + (o.size || '') + '"><label for="' + o.id + '">' + esc(o.label) + (o.optional ? ' <span class="opt">(opcional)</span>' : '') + '</label>' +
      (o.type === 'select'
        ? '<select id="' + o.id + '" name="' + (o.name || o.id) + '"' + (o.validate ? ' data-validate="' + o.validate + '"' : '') + '>' + o.options + '</select>'
        : '<input id="' + o.id + '" name="' + (o.name || o.id) + '" type="' + (o.type || 'text') + '" value="' + esc(o.value || '') + '"' +
          (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') + (o.mask ? ' data-mask="' + o.mask + '" inputmode="numeric"' : '') +
          (o.validate ? ' data-validate="' + o.validate + '"' : '') + (o.auto ? ' autocomplete="' + o.auto + '"' : '') + '>') +
      (o.err ? '<span class="err">' + esc(o.err) + '</span>' : '') + (o.hint ? '<span class="hint">' + esc(o.hint) + '</span>' : '') + '</div>';
  }
  TD.ui = { validate, liveValidate, bindMasks, field, masks, validCPF, onlyDigits };

  async function lookupCEP(cep) {
    const d = onlyDigits(cep);
    if (d.length !== 8) return null;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      const r = await fetch('https://viacep.com.br/ws/' + d + '/json/', { signal: ctrl.signal });
      clearTimeout(t);
      const j = await r.json();
      return j && !j.erro ? j : null;
    } catch (e) { return null; }
  }
  TD.lookupCEP = lookupCEP;
  const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
  const ufOptions = (sel) => '<option value="">UF</option>' + UFS.map((u) => '<option' + (u === sel ? ' selected' : '') + '>' + u + '</option>').join('');

  /* ---------------- layout compartilhado ---------------- */
  function navCats() {
    return TD.groups.map((g) => ({ group: g, cats: TD.categories().filter((c) => c.group === g.slug && c.count > 0) }));
  }
  function headerHTML() {
    const st = TD.settings();
    const acc = TD.account.get();
    const first = acc.loggedIn && acc.profile.name ? acc.profile.name.split(' ')[0] : '';
    const groups = navCats();
    const mega = groups.map((g) => '<h4' + (g.group.slug !== 'tecnologia-gaming' ? ' style="margin-top:10px"' : '') + '><a href="categoria.html?g=' + g.group.slug + '">' + esc(g.group.name) + '</a></h4>' +
      g.cats.map((c) => '<a class="mega-link" href="categoria.html?c=' + c.slug + '">' + esc(c.name) + '<span>' + c.count + '</span></a>').join('')).join('');
    return '' +
      '<div class="proto-ribbon">Prototipo demostrativo de Amicornios Soft para TecnoDreams — compras, pagos y pedidos son simulados.' +
      '<a href="../index.html">Ver propuesta</a><a href="admin.html">Panel admin</a></div>' +
      '<div class="announce"><div class="container">' +
      '<span>' + icon('pin') + esc(st.announcement) + '</span>' +
      '<span>' + icon('wa', 'fill') + 'Atendimento pelo WhatsApp ' + esc(st.phone) + '</span>' +
      '<span>' + icon('card') + 'Pix, Visa e Mastercard</span></div></div>' +
      '<header class="site-header" id="top"><div class="container header-main">' +
      '<div style="display:flex;align-items:center;gap:4px"><button class="h-btn menu-toggle" type="button" aria-label="Abrir menu" data-open-menu>' + icon('menu') + '</button>' +
      '<a class="logo" href="index.html" aria-label="TecnoDreams – início"><img src="assets/brand/icone-td.png" alt="" width="42" height="42"><span class="logo-text"><strong>TecnoDreams</strong><small>' + esc(st.tagline) + '</small></span></a></div>' +
      '<div class="search" role="search"><form action="catalogo.html" autocomplete="off"><input name="q" type="search" placeholder="O que você está procurando?" aria-label="Buscar produtos" value="' + esc(params.get('q') || '') + '">' +
      '<button type="submit" aria-label="Buscar">' + icon('search') + '</button></form><div class="suggest" hidden></div></div>' +
      '<div class="header-actions">' +
      '<a class="h-btn hide-sm" href="mi-cuenta.html">' + icon('user') + '<span class="h-label"><small>' + (first ? 'Olá, ' + esc(first) : 'Olá, visitante') + '</small>' + (first ? 'Minha conta' : 'Entrar') + '</span></a>' +
      '<a class="h-btn" href="favoritos.html" aria-label="Favoritos">' + icon('heart') + '<span class="badge-count" data-fav-count></span></a>' +
      '<button class="h-btn" type="button" data-open-cart aria-label="Abrir carrinho">' + icon('bag') + '<span class="badge-count" data-cart-count></span><span class="h-label"><small>Carrinho</small><span data-cart-total>' + fmt(0) + '</span></span></button>' +
      '</div></div>' +
      '<nav class="cat-nav" aria-label="Categorias"><div class="container"><ul>' +
      '<li><button class="nav-link" type="button" aria-expanded="false" data-mega>' + icon('menu') + 'Categorias' + icon('down') + '</button>' +
      '<div class="mega" role="menu">' + mega + '<a class="mega-promo" href="categoria.html?c=simulacao"><img src="assets/banners/hero-volantes.webp" alt="" loading="lazy" style="object-position:75% center"><div>Simulação de corrida Logitech →</div></a></div></li>' +
      ['cadeiras-gamer', 'mouse', 'fones-de-ouvido', 'caixas-de-som', 'teclados', 'simulacao'].map((s) => { const c = TD.category(s); return c && c.count ? '<li><a class="nav-link" href="categoria.html?c=' + s + '">' + esc(c.name.replace('Equipamentos de ', '')) + '</a></li>' : ''; }).join('') +
      '<li><a class="nav-link highlight" href="catalogo.html?oferta=1">' + icon('tag') + 'Ofertas</a></li>' +
      '<li class="nav-spacer"></li>' +
      '<li><a class="nav-link" href="' + waLink('Olá, TecnoDreams! Gostaria de fazer uma consulta com o Suporte. Podem me ajudar?') + '" target="_blank" rel="noopener">' + icon('headset') + 'Atendimento</a></li>' +
      '</ul></div></nav></header>' +
      // menu móvel
      '<div class="overlay" data-overlay></div>' +
      '<aside class="drawer left mobile-nav" aria-label="Menu" data-drawer="menu"><div class="drawer-head"><a class="logo" href="index.html"><img src="assets/brand/icone-td.png" alt="" width="36" height="36"><span class="logo-text"><strong>TecnoDreams</strong><small>' + esc(st.tagline) + '</small></span></a><button class="icon-btn" data-close-drawer aria-label="Fechar menu">' + icon('x') + '</button></div>' +
      '<div class="drawer-body"><ul class="m-links">' +
      '<li><a href="index.html">Início ' + icon('home') + '</a></li>' +
      groups.map((g, i) => '<li><button type="button" aria-expanded="' + (i === 0) + '" data-m-toggle>' + esc(g.group.name) + icon('down') + '</button><ul class="m-links m-sub"' + (i === 0 ? '' : ' hidden') + '>' +
        '<li><a href="categoria.html?g=' + g.group.slug + '">Ver tudo em ' + esc(g.group.name) + '</a></li>' +
        g.cats.map((c) => '<li><a href="categoria.html?c=' + c.slug + '">' + esc(c.name) + ' <small style="color:var(--muted)">' + c.count + '</small></a></li>').join('') + '</ul></li>').join('') +
      '<li><a href="catalogo.html?oferta=1">Ofertas ' + icon('tag') + '</a></li>' +
      '<li><a href="catalogo.html">Todos os produtos ' + icon('grid') + '</a></li>' +
      '<li><a href="favoritos.html">Favoritos ' + icon('heart') + '</a></li>' +
      '<li><a href="mi-cuenta.html">' + (first ? 'Minha conta' : 'Entrar / Cadastrar') + ' ' + icon('user') + '</a></li>' +
      '<li><a href="' + waLink('Olá, TecnoDreams! Gostaria de tirar uma dúvida. Poderiam me ajudar?') + '" target="_blank" rel="noopener">Atendimento WhatsApp ' + icon('wa', 'fill') + '</a></li>' +
      '<li><a href="admin.html">Painel administrativo (demo) ' + icon('gear') + '</a></li>' +
      '</ul></div></aside>' +
      // minicarrinho
      '<aside class="drawer right" aria-label="Carrinho" data-drawer="cart"><div class="drawer-head"><h3>Seu carrinho <span data-cart-count-text style="color:var(--muted);font-family:var(--font-ui);font-size:14px"></span></h3><button class="icon-btn" data-close-drawer aria-label="Fechar carrinho">' + icon('x') + '</button></div>' +
      '<div class="drawer-body" data-mini-cart></div><div class="drawer-foot" data-mini-foot></div></aside>';
  }

  function footerHTML() {
    const st = TD.settings();
    const so = st.social || {};
    return '<footer class="site-footer"><div class="container"><div class="footer-top">' +
      '<div class="f-brand"><a class="logo" href="index.html"><img src="assets/brand/icone-td.png" alt="" width="42" height="42"><span class="logo-text"><strong>TecnoDreams</strong><small>' + esc(st.tagline) + '</small></span></a>' +
      '<p>Tecnologia para o seu dia a dia: setup gamer, periféricos, som, casa conectada e utilidades.</p>' +
      '<div class="socials">' +
      (so.instagram ? '<a href="' + so.instagram + '" target="_blank" rel="noopener" aria-label="Instagram">' + icon('instagram') + '</a>' : '') +
      (so.facebook ? '<a href="' + so.facebook + '" target="_blank" rel="noopener" aria-label="Facebook">' + icon('facebook') + '</a>' : '') +
      (so.youtube ? '<a href="' + so.youtube + '" target="_blank" rel="noopener" aria-label="YouTube">' + icon('youtube') + '</a>' : '') +
      '<a href="' + waLink('Olá, TecnoDreams! Gostaria de fazer uma pergunta.') + '" target="_blank" rel="noopener" aria-label="WhatsApp">' + icon('wa', 'fill') + '</a></div></div>' +
      '<div><h4>Atendimento ao Cliente</h4><ul>' +
      '<li><a href="' + waLink('Olá, TecnoDreams! Gostaria de fazer uma pergunta.') + '" target="_blank" rel="noopener">Fale Conosco</a></li>' +
      '<li><a href="' + waLink('Olá, TecnoDreams! Gostaria de fazer uma consulta com o Suporte. Podem me ajudar?') + '" target="_blank" rel="noopener">Suporte</a></li>' +
      '<li><button type="button" data-info="faq">Perguntas Frequentes</button></li>' +
      '<li><button type="button" data-info="envio">Política de Envio</button></li></ul></div>' +
      '<div><h4>Links Rápidos</h4><ul><li><a href="index.html">Início</a></li><li><a href="catalogo.html">Loja</a></li>' +
      '<li><button type="button" data-info="sobre">Sobre Nós</button></li><li><button type="button" data-info="privacidade">Política de Privacidade</button></li>' +
      '<li><a href="mi-cuenta.html">Minha conta</a></li><li><a href="favoritos.html">Favoritos</a></li></ul></div>' +
      '<div><h4>Escritório e ponto de retirada</h4><ul class="f-contact">' +
      '<li>' + icon('pin') + '<span>' + esc(st.address) + '<br>' + esc(st.cep) + '</span></li>' +
      '<li>' + icon('phone') + '<a href="' + waLink('Olá, TecnoDreams!') + '" target="_blank" rel="noopener">' + esc(st.phone) + '</a></li>' +
      '<li>' + icon('shield') + '<span>CNPJ: ' + esc(st.cnpj) + '<br><small>Responsável Financeiro Cadastrado: ' + esc(st.responsible) + '</small></span></li></ul></div>' +
      '</div>' +
      '<div class="footer-pay"><div><h4 style="margin-bottom:8px">Pagamentos disponíveis</h4><div class="pay-logos">' +
      '<span class="pay"><img src="assets/brand/pix.png" alt="Pix" loading="lazy"></span><span class="pay"><img src="assets/brand/visa.png" alt="Visa" loading="lazy"></span>' +
      '<span class="pay"><img src="assets/brand/mastercard.png" alt="Mastercard" loading="lazy"></span><span class="pay txt">PagBank</span></div></div>' +
      '<div><h4 style="margin-bottom:8px">Segurança</h4><div class="pay-logos"><span class="pay txt">' + icon('lock') + ' Conexão HTTPS</span><span class="pay txt">' + icon('shield') + ' Site seguro</span></div></div></div>' +
      '<div class="footer-bottom"><span>' + esc(st.legal) + '</span><span>Protótipo desenvolvido por <strong style="color:#fff">Amicornios Soft</strong></span></div></div></footer>' +
      '<a class="wa-float" href="' + waLink('Olá, TecnoDreams! Gostaria de tirar uma dúvida. Poderiam me ajudar?') + '" target="_blank" rel="noopener" aria-label="Falar no WhatsApp">' + icon('wa', 'fill') + '</a>' +
      '<button class="to-top" type="button" aria-label="Voltar ao topo">' + icon('up') + '</button>';
  }

  const INFO = {
    faq: ['Perguntas Frequentes', 'Na plataforma final, as perguntas frequentes do site atual serão migradas e poderão ser editadas pelo painel, sem plugins.'],
    envio: ['Política de Envio', 'A política de envio atual será migrada. O cálculo de frete por CEP deste protótipo é uma simulação; na versão final será integrado à transportadora ou serviço logístico definido com a TecnoDreams.'],
    sobre: ['Sobre Nós', 'A página institucional atual será migrada com o mesmo conteúdo e ganhará um layout novo, editável pelo painel.'],
    privacidade: ['Política de Privacidade', 'O texto vigente da política de privacidade será migrado integralmente. URLs antigas serão redirecionadas para as novas.', 'https://www.tecnodreams.com/politica-de-privacidade/']
  };
  function showInfo(key) {
    const i = INFO[key];
    if (!i) return;
    openModal({
      title: i[0],
      body: '<div class="note">' + icon('info') + '<span>' + esc(i[1]) + '</span></div>' + (i[2] ? '<p style="margin:14px 0 0"><a class="link-more" href="' + i[2] + '" target="_blank" rel="noopener">Ver texto atual no site ' + icon('external') + '</a></p>' : ''),
      foot: '<button class="btn btn-primary btn-sm" data-close>Entendi</button>'
    });
  }

  function mountLayout() {
    const h = $('#site-header');
    if (h) h.outerHTML = headerHTML();
    const f = $('#site-footer');
    if (f) f.outerHTML = footerHTML();
    if (!h) return;
    updateCounters();
    bindHeader();
    bindSearch();
  }

  function openDrawer(name) {
    closeDrawers();
    const d = $('[data-drawer="' + name + '"]');
    if (!d) return;
    if (name === 'cart') renderMiniCart();
    d.classList.add('open');
    $('[data-overlay]').classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => { const b = $('[data-close-drawer]', d); b && b.focus(); }, 50);
  }
  function closeDrawers() {
    $$('.drawer.open, .filters.open').forEach((d) => d.classList.remove('open'));
    const o = $('[data-overlay]');
    o && o.classList.remove('open');
    if (!$('.modal')) document.body.style.overflow = '';
  }
  TD.openCart = () => openDrawer('cart');

  function bindHeader() {
    const header = $('.site-header');
    const toTop = $('.to-top');
    const onScroll = () => {
      header.classList.toggle('scrolled', window.scrollY > 10);
      toTop && toTop.classList.toggle('show', window.scrollY > 700);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    toTop && toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    const megaBtn = $('[data-mega]');
    const mega = $('.mega');
    if (megaBtn) {
      let t;
      const open = (v) => { mega.classList.toggle('open', v); megaBtn.setAttribute('aria-expanded', v); };
      megaBtn.addEventListener('click', () => open(!mega.classList.contains('open')));
      megaBtn.parentElement.addEventListener('mouseenter', () => { clearTimeout(t); open(true); });
      megaBtn.parentElement.addEventListener('mouseleave', () => { t = setTimeout(() => open(false), 160); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') open(false); });
    }
    $$('[data-m-toggle]').forEach((b) => b.addEventListener('click', () => {
      const exp = b.getAttribute('aria-expanded') === 'true';
      b.setAttribute('aria-expanded', !exp);
      b.nextElementSibling.hidden = exp;
    }));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawers(); });
  }

  function updateCounters() {
    const n = TD.cart.count();
    const f = TD.favs.ids().length;
    $$('[data-cart-count]').forEach((el) => { el.textContent = n; el.classList.toggle('show', n > 0); });
    $$('[data-fav-count]').forEach((el) => { el.textContent = f; el.classList.toggle('show', f > 0); });
    $$('[data-cart-total]').forEach((el) => { el.textContent = fmt(TD.cart.subtotal()); });
    $$('[data-cart-count-text]').forEach((el) => { el.textContent = n ? '(' + n + (n === 1 ? ' item)' : ' itens)') : ''; });
  }
  function bump(sel) { $$(sel).forEach((el) => { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }); }

  function renderMiniCart() {
    const body = $('[data-mini-cart]');
    const foot = $('[data-mini-foot]');
    if (!body) return;
    const lines = TD.cart.lines();
    if (!lines.length) {
      body.innerHTML = '<div class="empty" style="border:0;padding:40px 10px"><div class="empty-ic">' + icon('bag') + '</div><h3>Seu carrinho está vazio</h3><p>Explore o catálogo e adicione seus produtos favoritos.</p><a class="btn btn-primary" href="catalogo.html">Ver produtos</a></div>';
      foot.innerHTML = '';
      return;
    }
    body.innerHTML = lines.map((l) => '<div class="mini-line"><a href="' + productUrl(l.product) + '"><img src="' + esc(TD.img(l.product)) + '" alt=""></a><div>' +
      '<a class="ml-name" href="' + productUrl(l.product) + '">' + esc(l.product.name) + '</a>' +
      '<div class="ml-row"><div class="qty sm" data-qty-for="' + l.id + '"><button type="button" data-step="-1" aria-label="Diminuir">' + icon('minus') + '</button><input type="number" min="1" max="' + l.product.stock + '" value="' + l.qty + '" aria-label="Quantidade"><button type="button" data-step="1" aria-label="Aumentar">' + icon('plus') + '</button></div>' +
      '<strong>' + fmt(l.total) + '</strong></div>' +
      '<button class="link-btn" type="button" data-remove="' + l.id + '" style="margin-top:6px">' + icon('trash') + 'Remover</button></div></div>').join('');
    const t = TD.cart.totals();
    foot.innerHTML = (t.discount ? '<div class="sum-row discount" style="padding:0"><span>Cupom ' + esc(t.coupon.code) + '</span><span>−' + fmt(t.discount) + '</span></div>' : '') +
      '<div class="mini-total"><span>Subtotal</span><span>' + fmt(t.subtotal - t.discount) + '</span></div>' +
      '<small style="color:var(--muted)">Frete calculado no checkout.</small>' +
      '<a class="btn btn-primary btn-block" href="checkout.html">' + icon('lock') + 'Finalizar compra</a><a class="btn btn-outline btn-block" href="carrito.html">Ver carrinho</a>';
    bindQtySteppers(body, (id, q) => { TD.cart.setQty(id, q); });
  }

  /* Liga os seletores de quantidade [data-qty-for] */
  function bindQtySteppers(root, onChange) {
    $$('[data-qty-for]', root).forEach((box) => {
      const id = +box.dataset.qtyFor;
      const inp = $('input', box);
      const max = +inp.max || 99;
      const set = (v) => {
        v = Math.max(1, Math.min(max, parseInt(v, 10) || 1));
        if (v === max && +inp.value >= max) toast('Limite de estoque atingido', { type: 'info', sub: 'Disponível: ' + max + ' unidade(s).' });
        inp.value = v;
        onChange(id, v);
      };
      $$('[data-step]', box).forEach((b) => b.addEventListener('click', () => set((parseInt(inp.value, 10) || 1) + +b.dataset.step)));
      inp.addEventListener('change', () => set(inp.value));
    });
  }

  /* ---------------- busca com sugestões ---------------- */
  const SEARCH_KEY = 'td_searches_v1';
  function bindSearch() {
    const box = $('.search');
    if (!box) return;
    const form = $('form', box);
    const input = $('input', box);
    const panel = $('.suggest', box);
    let active = -1;
    let timer;
    const hl = (text, q) => {
      let out = esc(text);
      TD.norm(q).split(/\s+/).filter((t) => t.length > 1).forEach((t) => {
        const n = TD.norm(text);
        const i = n.indexOf(t);
        if (i > -1) {
          const raw = text.slice(i, i + t.length);
          out = out.replace(esc(raw), '<mark>' + esc(raw) + '</mark>');
        }
      });
      return out;
    };
    const render = () => {
      const q = input.value.trim();
      active = -1;
      if (q.length < 2) {
        const recent = TD.readJSON(SEARCH_KEY, []);
        panel.innerHTML = (recent.length ? '<div class="suggest-head">Buscas recentes</div><div class="suggest-cats">' + recent.map((r) => '<a class="chip" href="catalogo.html?q=' + encodeURIComponent(r) + '">' + icon('clock') + esc(r) + '</a>').join('') + '</div>' : '') +
          '<div class="suggest-head">Mais procurados</div><div class="suggest-cats">' +
          ['Cadeira gamer', 'Logitech', 'JBL', 'Volante', 'Headset', 'Alexa', 'Smartwatch'].map((r) => '<a class="chip" href="catalogo.html?q=' + encodeURIComponent(r) + '">' + esc(r) + '</a>').join('') + '</div>' +
          '<div class="suggest-empty">Digite pelo menos 2 letras para ver produtos.</div>';
        panel.hidden = false;
        return;
      }
      const res = TD.search(q);
      const cats = TD.categories().filter((c) => c.count && TD.norm(c.name).indexOf(TD.norm(q)) > -1);
      const brands = TD.brands().filter((b) => TD.norm(b.name).indexOf(TD.norm(q)) > -1);
      panel.innerHTML = (cats.length || brands.length ? '<div class="suggest-head">Categorias e marcas</div><div class="suggest-cats">' +
        cats.map((c) => '<a class="chip" href="categoria.html?c=' + c.slug + '">' + icon('layers') + esc(c.name) + '</a>').join('') +
        brands.map((b) => '<a class="chip" href="catalogo.html?brand=' + encodeURIComponent(b.name) + '">' + icon('tag') + esc(b.name) + ' <small>(' + b.count + ')</small></a>').join('') + '</div>' : '') +
        (res.length ? '<div class="suggest-head">Produtos</div>' + res.slice(0, 6).map((p) => '<a class="suggest-item" href="' + productUrl(p) + '">' +
          '<img src="' + esc(TD.img(p)) + '" alt="" loading="lazy"><span><span class="s-name">' + hl(p.name, q) + '</span><span class="s-meta">' + esc(p.brand) + ' · ' + esc(TD.categoryName(p.category)) + '</span></span>' +
          '<span class="s-price">' + (p.price ? fmt(p.price) : 'Sob consulta') + '</span></a>').join('') +
          '<a class="suggest-all" href="catalogo.html?q=' + encodeURIComponent(q) + '">Ver todos os ' + res.length + ' resultados para “' + esc(q) + '” →</a>'
          : '<div class="suggest-empty">Nenhum produto encontrado para “' + esc(q) + '”. Tente outro termo ou <a href="' + waLink('Olá, TecnoDreams! Vocês têm "' + q + '"?') + '" target="_blank" rel="noopener" style="color:var(--navy-700);font-weight:700">pergunte pelo WhatsApp</a>.</div>');
      panel.hidden = false;
    };
    input.addEventListener('focus', render);
    input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(render, 110); });
    input.addEventListener('keydown', (e) => {
      const items = $$('.suggest-item, .suggest-all', panel);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!items.length) return;
        active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items.forEach((it, i) => it.classList.toggle('active', i === active));
        items[active].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' && active > -1 && items[active]) {
        e.preventDefault();
        location.href = items[active].href;
      } else if (e.key === 'Escape') { panel.hidden = true; input.blur(); }
    });
    form.addEventListener('submit', (e) => {
      const q = input.value.trim();
      if (!q) { e.preventDefault(); input.focus(); return; }
      const recent = [q].concat(TD.readJSON(SEARCH_KEY, []).filter((r) => r.toLowerCase() !== q.toLowerCase())).slice(0, 5);
      TD.writeJSON(SEARCH_KEY, recent);
    });
    document.addEventListener('click', (e) => { if (!box.contains(e.target)) panel.hidden = true; });
  }

  /* ---------------- cartão de produto ---------------- */
  function tagsHTML(p) {
    const off = TD.discountPct(p);
    return (off ? '<span class="tag tag-sale">−' + off + '%</span>' : '') +
      (p.isNew && p.inStock ? '<span class="tag tag-new">Novo</span>' : '') +
      (!p.inStock ? '<span class="tag tag-off">Esgotado</span>' : '') +
      (!p.price && p.inStock ? '<span class="tag tag-info">Sob consulta</span>' : '');
  }
  function priceHTML(p) {
    if (!p.price) return '<div class="p-price"><span class="consult">Preço sob consulta</span></div>';
    return '<div class="p-price">' + (p.regularPrice ? '<div class="old">' + fmt(p.regularPrice) + '</div>' : '') + '<div class="now">' + fmt(p.price) + '</div></div>';
  }
  function actionHTML(p) {
    if (!p.inStock) return '<button class="btn btn-outline" type="button" data-notify="' + p.id + '">' + icon('bell') + '<span>Avise-me</span></button>';
    if (!p.price) return '<a class="btn btn-wa" href="' + waLink('Olá, TecnoDreams! Gostaria de saber o preço de: ' + p.name + ' (' + absUrl(productUrl(p)) + ')') + '" target="_blank" rel="noopener">' + icon('wa', 'fill') + '<span>Consultar</span></a>';
    return '<button class="btn btn-primary" type="button" data-add="' + p.id + '">' + icon('bag') + '<span>Adicionar</span></button>';
  }
  function card(p, i) {
    const fav = TD.favs.has(p.id);
    const alt = p.images && p.images[1];
    return '<article class="p-card' + (p.inStock ? '' : ' out') + '" style="animation-delay:' + Math.min((i || 0) % 12, 11) * 35 + 'ms">' +
      '<a class="p-media" href="' + productUrl(p) + '" aria-label="' + esc(p.name) + '">' +
      '<img src="' + esc(TD.img(p)) + '" alt="' + esc(p.name) + '" loading="lazy" width="600" height="600"' + (alt ? ' class="has-alt"' : '') + '>' +
      (alt ? '<img class="alt" src="' + esc(alt) + '" alt="" loading="lazy" width="600" height="600">' : '') + '</a>' +
      '<div class="p-tags">' + tagsHTML(p) + '</div>' +
      '<button class="fav-btn' + (fav ? ' on' : '') + '" type="button" data-fav="' + p.id + '" aria-pressed="' + fav + '" aria-label="' + (fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos') + '">' + icon('heart') + '</button>' +
      '<div class="p-body"><span class="p-brand">' + esc(p.brand || TD.categoryName(p.category)) + '</span>' +
      '<a class="p-name" href="' + productUrl(p) + '">' + esc(p.name) + '</a>' +
      (p.sku ? '<span class="p-sku">' + esc(p.sku) + '</span>' : '') +
      priceHTML(p) + '<div class="p-actions">' + actionHTML(p) + '</div></div></article>';
  }
  TD.card = card;
  const skeletons = (n) => Array.from({ length: n }, () => '<div class="sk-card"><div class="skeleton sk-img"></div><div class="sk-lines"><div class="skeleton sk-line" style="width:40%"></div><div class="skeleton sk-line"></div><div class="skeleton sk-line" style="width:70%"></div><div class="skeleton sk-line" style="width:50%;height:20px"></div></div></div>').join('');

  function renderRail(track, list) {
    track.innerHTML = list.map(card).join('');
    const rail = track.closest('.rail-wrap') || track.parentElement;
    const prev = $('[data-rail-prev]', rail);
    const next = $('[data-rail-next]', rail);
    const upd = () => {
      if (!prev) return;
      prev.disabled = track.scrollLeft < 8;
      next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 8;
    };
    const step = () => track.clientWidth * 0.9;
    if (prev && !prev.dataset.bound) {
      prev.dataset.bound = 1;
      prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
      next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
      track.addEventListener('scroll', upd, { passive: true });
    }
    setTimeout(upd, 60);
  }

  /* ---------------- ações globais ---------------- */
  function flyToCart(img) {
    const target = $('[data-open-cart]');
    if (!img || !target || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const a = img.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    if (!a.width) return;
    const f = document.createElement('img');
    f.src = img.currentSrc || img.src;
    f.className = 'fly';
    f.style.left = a.left + a.width / 2 - 32 + 'px';
    f.style.top = a.top + a.height / 2 - 32 + 'px';
    document.body.appendChild(f);
    requestAnimationFrame(() => {
      f.style.transform = 'translate(' + (b.left + b.width / 2 - (a.left + a.width / 2)) + 'px,' + (b.top + b.height / 2 - (a.top + a.height / 2)) + 'px) scale(.25)';
      f.style.opacity = '.4';
    });
    setTimeout(() => f.remove(), 750);
  }
  function addToCart(id, qty, src) {
    const r = TD.cart.add(id, qty);
    const p = TD.product(id);
    if (!r.ok) { toast(r.reason, { type: 'error' }); return false; }
    const host = src && src.closest('.p-card, .pdp, .sticky-buy, .p-row');
    flyToCart(host && $('img', host.matches('.sticky-buy') ? $('.pdp') : host));
    setTimeout(() => bump('[data-cart-count]'), 600);
    toast('Adicionado ao carrinho', { img: TD.img(p), sub: p.name + (r.partial ? ' — quantidade ajustada ao estoque' : ''), action: 'Ver carrinho', onAction: () => openDrawer('cart') });
    return true;
  }
  TD.addToCart = addToCart;
  function toggleFav(id) {
    const on = TD.favs.toggle(id);
    const p = TD.product(id);
    $$('[data-fav="' + id + '"]').forEach((b) => {
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on);
      b.setAttribute('aria-label', on ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
      const lbl = $('[data-fav-label]', b);
      if (lbl) lbl.textContent = on ? 'Nos favoritos' : 'Favoritar';
    });
    bump('[data-fav-count]');
    toast(on ? 'Salvo nos favoritos' : 'Removido dos favoritos', { type: on ? 'ok' : 'info', sub: p && p.name, action: on ? 'Ver favoritos' : null, onAction: () => { location.href = 'favoritos.html'; } });
  }
  function notifyMe(id) {
    const p = TD.product(id);
    const acc = TD.account.get();
    openModal({
      title: 'Avise-me quando chegar',
      body: '<div style="display:flex;gap:12px;align-items:center;margin-bottom:16px"><img src="' + esc(TD.img(p)) + '" alt="" style="width:64px;height:64px;object-fit:contain;border:1px solid var(--line);border-radius:10px"><strong>' + esc(p.name) + '</strong></div>' +
        '<form id="notify-form" novalidate class="form-grid">' + field({ id: 'n-email', label: 'Seu e-mail', type: 'email', validate: 'email', err: 'Informe um e-mail válido.', value: acc.profile.email, auto: 'email' }) + '</form>' +
        '<p class="note" style="margin-top:14px">' + icon('info') + '<span>Simulação: no sistema final o cliente recebe um e-mail quando o estoque for reposto pelo painel.</span></p>',
      foot: '<button class="btn btn-outline btn-sm" data-close>Cancelar</button><button class="btn btn-primary btn-sm" data-ok>Quero ser avisado</button>',
      onOpen: (el, close) => {
        const go = (e) => { e && e.preventDefault(); if (!validate($('#notify-form', el))) return; close(); toast('Pronto! Avisaremos você', { sub: 'Quando ' + p.name + ' voltar ao estoque.' }); };
        $('[data-ok]', el).addEventListener('click', go);
        $('#notify-form', el).addEventListener('submit', go);
      }
    });
  }

  document.addEventListener('click', (e) => {
    const t = e.target;
    const add = t.closest('[data-add]');
    if (add) { e.preventDefault(); addToCart(+add.dataset.add, +(add.dataset.qty || 1), add); return; }
    const fav = t.closest('[data-fav]');
    if (fav) { e.preventDefault(); toggleFav(+fav.dataset.fav); return; }
    if (t.closest('[data-open-cart]')) { e.preventDefault(); openDrawer('cart'); return; }
    if (t.closest('[data-open-menu]')) { openDrawer('menu'); return; }
    if (t.closest('[data-close-drawer]') || t.closest('[data-overlay]')) { closeDrawers(); return; }
    const rm = t.closest('[data-remove]');
    if (rm && rm.closest('[data-mini-cart]')) {
      const line = TD.cart.remove(+rm.dataset.remove);
      toast('Item removido', { type: 'info', action: 'Desfazer', onAction: () => TD.cart.restore(line) });
      return;
    }
    const info = t.closest('[data-info]');
    if (info) { showInfo(info.dataset.info); return; }
    const nt = t.closest('[data-notify]');
    if (nt) { notifyMe(+nt.dataset.notify); }
  });

  window.addEventListener('td:cart', () => { updateCounters(); if ($('[data-drawer="cart"].open')) renderMiniCart(); });
  window.addEventListener('td:favs', updateCounters);

  /* Aparição suave ao rolar: verifica posições num listener de scroll (sem depender de IntersectionObserver) */
  let revealBound = false;
  function reveal() {
    const check = () => {
      const limit = window.innerHeight - 40;
      $$('.reveal:not(.in)').forEach((e) => { if (e.getBoundingClientRect().top < limit) e.classList.add('in'); });
    };
    if (!revealBound) {
      revealBound = true;
      let ticking = false;
      const onScroll = () => { if (ticking) return; ticking = true; requestAnimationFrame(() => { ticking = false; check(); }); };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
    }
    check();
  }

  const emptyState = (ic, title, text, btns) => '<div class="empty"><div class="empty-ic">' + icon(ic) + '</div><h3>' + esc(title) + '</h3><p>' + text + '</p><div class="btns">' + (btns || '') + '</div></div>';
  TD.emptyState = emptyState;

  /* =========================================================
     PÁGINA INICIAL
     ========================================================= */
  function pageHome() {
    // hero
    const hero = $('#hero');
    const slides = TD.heroSlides;
    hero.innerHTML = '<div class="hero-track">' + slides.map((s, i) => '<div class="hero-slide' + (i === 0 ? ' active' : '') + '" aria-hidden="' + (i !== 0) + '">' +
      '<img src="' + s.img + '" alt="" ' + (i === 0 ? 'fetchpriority="high"' : 'loading="lazy"') + '>' +
      '<div class="container hero-copy"><span class="eyebrow">' + esc(s.eyebrow) + '</span>' + (i === 0 ? '<h1>' : '<h2>') + esc(s.title) + (i === 0 ? '</h1>' : '</h2>') + '<p>' + esc(s.text) + '</p>' +
      '<div class="btns"><a class="btn btn-light" href="' + s.href + '">' + esc(s.cta) + icon('arrow') + '</a><a class="btn btn-ghost" style="color:#fff" href="catalogo.html?oferta=1">Ver ofertas</a></div></div></div>').join('') + '</div>' +
      '<button class="hero-arrow prev" type="button" aria-label="Banner anterior">' + icon('left') + '</button><button class="hero-arrow next" type="button" aria-label="Próximo banner">' + icon('right') + '</button>' +
      '<div class="hero-dots" role="tablist">' + slides.map((s, i) => '<button type="button" role="tab" aria-label="Banner ' + (i + 1) + '"' + (i === 0 ? ' class="active"' : '') + '></button>').join('') + '</div>';
    let cur = 0;
    let timer;
    const go = (n) => {
      const sl = $$('.hero-slide', hero);
      const dots = $$('.hero-dots button', hero);
      cur = (n + sl.length) % sl.length;
      sl.forEach((s, i) => { s.classList.toggle('active', i === cur); s.setAttribute('aria-hidden', i !== cur); });
      dots.forEach((d, i) => d.classList.toggle('active', i === cur));
      restart();
    };
    const restart = () => { clearInterval(timer); timer = setInterval(() => go(cur + 1), 6000); };
    $('.hero-arrow.prev', hero).addEventListener('click', () => go(cur - 1));
    $('.hero-arrow.next', hero).addEventListener('click', () => go(cur + 1));
    $$('.hero-dots button', hero).forEach((d, i) => d.addEventListener('click', () => go(i)));
    hero.addEventListener('mouseenter', () => clearInterval(timer));
    hero.addEventListener('mouseleave', restart);
    let x0 = null;
    hero.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener('touchend', (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1)); x0 = null; });
    restart();

    // categorias
    const cats = TD.categories().filter((c) => c.count > 0);
    $('#home-cats').innerHTML = cats.map((c) => '<a class="cat-card reveal" href="categoria.html?c=' + c.slug + '"><div class="cat-img"><img src="' + esc(c.img) + '" alt="" loading="lazy"' + (c.fit === 'contain' ? ' class="contain"' : '') + '></div>' +
      '<div class="cat-name">' + esc(c.name) + '<small>' + c.count + '</small></div></a>').join('');

    const all = TD.products();
    const featured = all.filter((p) => p.featured);
    renderRail($('#rail-featured'), featured.length ? featured : all.slice(0, 8));
    const offers = all.filter((p) => TD.discountPct(p) > 0).sort((a, b) => TD.discountPct(b) - TD.discountPct(a));
    const offersGrid = $('#grid-offers');
    offersGrid.innerHTML = offers.length ? offers.slice(0, 5).map(card).join('') : emptyState('tag', 'Sem ofertas no momento', 'Cadastre promoções pelo painel administrativo.', '<a class="btn btn-primary" href="admin.html#promocoes">Abrir painel</a>');
    $('#offers-count').textContent = offers.length ? offers.length + ' produto' + (offers.length > 1 ? 's' : '') + ' com preço promocional' : '';
    const news = all.filter((p) => p.isNew).sort((a, b) => b.id - a.id);
    renderRail($('#rail-new'), news.length ? news : all.slice(-8));

    // marcas
    $('#brands').innerHTML = TD.brands().map((b) => '<a class="brand-tile reveal" href="catalogo.html?brand=' + encodeURIComponent(b.name) + '"><span>' + esc(b.name === 'TD' ? 'Linha TD' : b.name) + '<small>' + b.count + ' produto' + (b.count > 1 ? 's' : '') + '</small></span></a>').join('');

    const st = TD.settings();
    $('#store-address').textContent = st.address + ' · ' + st.cep;
    $('#store-wa').href = waLink('Olá, TecnoDreams! Gostaria de combinar uma retirada no escritório.');
    $('#store-map').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(st.address.replace('–', ',') + ', ' + st.cep.replace('CEP: ', ''));

    const nf = $('#newsletter');
    nf.addEventListener('submit', (e) => {
      e.preventDefault();
      const inp = $('input', nf);
      if (!validators.email(inp.value)) { toast('Informe um e-mail válido', { type: 'error' }); inp.focus(); return; }
      const btn = $('button', nf);
      btn.classList.add('loading');
      setTimeout(() => { btn.classList.remove('loading'); inp.value = ''; toast('Inscrição simulada com sucesso', { sub: 'No sistema final, integra com a ferramenta de e-mail marketing escolhida.' }); }, 700);
    });
    reveal();
  }

  /* =========================================================
     LISTAGEM (catálogo e categoria)
     ========================================================= */
  const PAGE_SIZE = 12;
  const SORTS = [
    ['relevancia', 'Mais relevantes'], ['menor-preco', 'Menor preço'], ['maior-preco', 'Maior preço'],
    ['nome-az', 'Nome: A–Z'], ['nome-za', 'Nome: Z–A'], ['novidades', 'Novidades'], ['desconto', 'Maior desconto']
  ];
  function listing(opts) {
    const root = $('#listing');
    const scope = opts.lockCats ? TD.products().filter((p) => opts.lockCats.indexOf(p.category) > -1) : TD.products();
    const priced = scope.filter((p) => p.price);
    const lo = priced.length ? Math.floor(Math.min.apply(null, priced.map((p) => p.price))) : 0;
    const hi = priced.length ? Math.ceil(Math.max.apply(null, priced.map((p) => p.price))) : 0;
    const split = (v) => (v ? v.split(',').filter(Boolean) : []);
    const S = {
      q: params.get('q') || '',
      cats: split(params.get('cat')),
      brands: split(params.get('brand')),
      min: params.has('min') ? +params.get('min') : lo,
      max: params.has('max') ? +params.get('max') : hi,
      stock: params.get('estoque') === '1',
      sale: params.get('oferta') === '1',
      sort: params.get('sort') || (params.get('q') ? 'relevancia' : 'relevancia'),
      view: TD.readJSON('td_view', 'grid'),
      page: 1
    };
    const showCats = !opts.lockCats || opts.lockCats.length > 1;
    const catChoices = TD.categories().filter((c) => c.count && (!opts.lockCats || opts.lockCats.indexOf(c.slug) > -1));
    const brandChoices = Array.from(new Set(scope.map((p) => p.brand).filter(Boolean))).sort();

    root.innerHTML = '<aside class="filters" id="filters" aria-label="Filtros">' +
      '<div class="filters-head"><h3>Filtros</h3><button class="icon-btn" type="button" data-close-drawer aria-label="Fechar filtros">' + icon('x') + '</button></div>' +
      (showCats ? '<div class="f-group"><button type="button" aria-expanded="true">Categoria' + icon('down') + '</button><div class="f-opts" data-f="cat"></div></div>' : '') +
      '<div class="f-group"><button type="button" aria-expanded="true">Marca' + icon('down') + '</button><div class="f-opts" data-f="brand"></div></div>' +
      (priced.length > 1 ? '<div class="f-group"><button type="button" aria-expanded="true">Faixa de preço' + icon('down') + '</button><div class="f-opts"><div class="price-range">' +
        '<div class="dual-range"><div class="track"></div><div class="fill"></div><input type="range" min="' + lo + '" max="' + hi + '" step="5" value="' + S.min + '" data-range="min" aria-label="Preço mínimo"><input type="range" min="' + lo + '" max="' + hi + '" step="5" value="' + S.max + '" data-range="max" aria-label="Preço máximo"></div>' +
        '<div class="price-inputs"><input type="number" inputmode="numeric" value="' + S.min + '" data-price="min" aria-label="Preço mínimo em reais"><span>–</span><input type="number" inputmode="numeric" value="' + S.max + '" data-price="max" aria-label="Preço máximo em reais"></div></div></div></div>' : '') +
      '<div class="f-group"><button type="button" aria-expanded="true">Disponibilidade' + icon('down') + '</button><div class="f-opts">' +
      '<label class="check"><input type="checkbox" data-toggle="stock"' + (S.stock ? ' checked' : '') + '>Somente em estoque<span class="count" data-count="stock"></span></label>' +
      '<label class="check"><input type="checkbox" data-toggle="sale"' + (S.sale ? ' checked' : '') + '>Somente ofertas<span class="count" data-count="sale"></span></label></div></div>' +
      '<div class="filters-mobile-foot" style="position:sticky;bottom:0;background:#fff;padding:12px 0 4px;display:none"><button class="btn btn-primary btn-block" type="button" data-close-drawer data-apply-label>Ver produtos</button></div>' +
      '</aside>' +
      '<section aria-label="Produtos"><div class="toolbar"><div style="display:flex;gap:8px;align-items:center"><button class="btn btn-outline btn-sm filter-toggle" type="button" data-open-filters>' + icon('filter') + 'Filtros</button><span class="result-count" aria-live="polite"></span></div>' +
      '<div class="tb-right"><label class="sr-only" for="sort">Ordenar por</label><select class="select" id="sort">' + SORTS.map((s) => '<option value="' + s[0] + '"' + (s[0] === S.sort ? ' selected' : '') + '>' + s[1] + '</option>').join('') + '</select>' +
      '<div class="view-toggle" role="group" aria-label="Visualização"><button type="button" data-view="grid" aria-label="Grade">' + icon('grid') + '</button><button type="button" data-view="list" aria-label="Lista">' + icon('list') + '</button></div></div></div>' +
      '<div class="active-filters"></div><div class="grid-products" id="grid">' + skeletons(8) + '</div><div class="load-more"></div></section>';

    if (window.matchMedia('(max-width: 1023px)').matches) $('.filters-mobile-foot', root).style.display = 'block';

    const searchIds = () => (S.q ? TD.search(S.q, scope) : null);
    const priceActive = () => S.min > lo || S.max < hi;
    function filtered(except) {
      const ranked = searchIds();
      const base = ranked || scope;
      return base.filter((p) => {
        if (except !== 'cat' && S.cats.length && S.cats.indexOf(p.category) === -1) return false;
        if (except !== 'brand' && S.brands.length && S.brands.indexOf(p.brand) === -1) return false;
        if (except !== 'price' && priceActive() && (!p.price || p.price < S.min || p.price > S.max)) return false;
        if (except !== 'stock' && S.stock && !p.inStock) return false;
        if (except !== 'sale' && S.sale && !TD.discountPct(p)) return false;
        return true;
      });
    }
    function sorted(list) {
      const by = {
        'menor-preco': (a, b) => (a.price || Infinity) - (b.price || Infinity),
        'maior-preco': (a, b) => (b.price || -1) - (a.price || -1),
        'nome-az': (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
        'nome-za': (a, b) => b.name.localeCompare(a.name, 'pt-BR'),
        novidades: (a, b) => b.id - a.id,
        desconto: (a, b) => TD.discountPct(b) - TD.discountPct(a)
      }[S.sort];
      if (by) return list.slice().sort(by);
      if (S.q) return list; // já ordenado pela busca
      return list.slice().sort((a, b) => (b.featured - a.featured) || (b.inStock - a.inStock) || (!!b.price - !!a.price) || (TD.discountPct(b) - TD.discountPct(a)) || (b.id - a.id));
    }
    function syncURL() {
      const u = new URLSearchParams();
      if (opts.keep) Object.keys(opts.keep).forEach((k) => u.set(k, opts.keep[k]));
      if (S.q) u.set('q', S.q);
      if (S.cats.length) u.set('cat', S.cats.join(','));
      if (S.brands.length) u.set('brand', S.brands.join(','));
      if (S.min > lo) u.set('min', S.min);
      if (S.max < hi) u.set('max', S.max);
      if (S.stock) u.set('estoque', 1);
      if (S.sale) u.set('oferta', 1);
      if (S.sort !== 'relevancia') u.set('sort', S.sort);
      const qs = u.toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
    }
    function renderFacets() {
      const cf = $('[data-f="cat"]', root);
      if (cf) {
        const pool = filtered('cat');
        cf.innerHTML = catChoices.map((c) => { const n = pool.filter((p) => p.category === c.slug).length; return '<label class="check"' + (n || S.cats.indexOf(c.slug) > -1 ? '' : ' style="opacity:.45"') + '><input type="checkbox" value="' + c.slug + '"' + (S.cats.indexOf(c.slug) > -1 ? ' checked' : '') + '>' + esc(c.name) + '<span class="count">' + n + '</span></label>'; }).join('');
      }
      const bf = $('[data-f="brand"]', root);
      const bpool = filtered('brand');
      bf.innerHTML = brandChoices.map((b) => { const n = bpool.filter((p) => p.brand === b).length; return '<label class="check"' + (n || S.brands.indexOf(b) > -1 ? '' : ' style="opacity:.45"') + '><input type="checkbox" value="' + esc(b) + '"' + (S.brands.indexOf(b) > -1 ? ' checked' : '') + '>' + esc(b === 'TD' ? 'Linha TD' : b) + '<span class="count">' + n + '</span></label>'; }).join('');
      $('[data-count="stock"]', root).textContent = filtered('stock').filter((p) => p.inStock).length;
      $('[data-count="sale"]', root).textContent = filtered('sale').filter((p) => TD.discountPct(p)).length;
    }
    function renderChips() {
      const chips = [];
      if (S.q) chips.push(['q', '', 'Busca: “' + S.q + '”']);
      S.cats.forEach((c) => chips.push(['cat', c, TD.categoryName(c)]));
      S.brands.forEach((b) => chips.push(['brand', b, b === 'TD' ? 'Linha TD' : b]));
      if (priceActive()) chips.push(['price', '', fmt(S.min) + ' – ' + fmt(S.max)]);
      if (S.stock) chips.push(['stock', '', 'Em estoque']);
      if (S.sale) chips.push(['sale', '', 'Ofertas']);
      const box = $('.active-filters', root);
      box.innerHTML = chips.map((c) => '<button class="chip" type="button" data-chip="' + c[0] + '" data-v="' + esc(c[1]) + '">' + esc(c[2]) + icon('x') + '</button>').join('') +
        (chips.length > 1 ? '<button class="btn btn-ghost btn-sm" type="button" data-clear>Limpar tudo</button>' : '');
    }
    function renderGrid(animate) {
      const list = sorted(filtered());
      const grid = $('#grid', root);
      grid.classList.toggle('as-list', S.view === 'list');
      $$('[data-view]', root).forEach((b) => b.classList.toggle('active', b.dataset.view === S.view));
      $('.result-count', root).innerHTML = '<strong>' + list.length + '</strong> produto' + (list.length === 1 ? '' : 's') + (S.q ? ' para “' + esc(S.q) + '”' : '');
      const lab = $('[data-apply-label]', root);
      if (lab) lab.textContent = 'Ver ' + list.length + ' produto' + (list.length === 1 ? '' : 's');
      const lm = $('.load-more', root);
      if (!list.length) {
        grid.innerHTML = emptyState('search', 'Nenhum produto encontrado', 'Ajuste os filtros ou tente outro termo de busca. Também podemos ajudar pelo WhatsApp.',
          '<button class="btn btn-primary" type="button" data-clear>Limpar filtros</button><a class="btn btn-wa" target="_blank" rel="noopener" href="' + waLink('Olá, TecnoDreams! Estou procurando ' + (S.q || 'um produto') + '.') + '">' + icon('wa', 'fill') + 'Perguntar</a>');
        grid.style.display = 'block';
        lm.innerHTML = '';
        return;
      }
      grid.style.display = '';
      const shown = list.slice(0, S.page * PAGE_SIZE);
      grid.innerHTML = shown.map((p, i) => card(p, animate ? i : 0)).join('');
      lm.innerHTML = '<small>Mostrando ' + shown.length + ' de ' + list.length + '</small><div class="progress"><span style="width:' + (shown.length / list.length) * 100 + '%"></span></div>' +
        (shown.length < list.length ? '<button class="btn btn-outline" type="button" data-more>Carregar mais produtos</button>' : '');
    }
    function update(opts2) {
      if (!opts2 || !opts2.keepPage) S.page = 1;
      renderFacets();
      renderChips();
      renderGrid(true);
      syncURL();
    }
    // eventos
    root.addEventListener('change', (e) => {
      const t = e.target;
      const f = t.closest('[data-f]');
      if (f) {
        const arr = f.dataset.f === 'cat' ? S.cats : S.brands;
        const i = arr.indexOf(t.value);
        if (t.checked && i === -1) arr.push(t.value);
        if (!t.checked && i > -1) arr.splice(i, 1);
        update();
      } else if (t.dataset.toggle) { S[t.dataset.toggle] = t.checked; update(); }
      else if (t.id === 'sort') { S.sort = t.value; update(); }
      else if (t.dataset.price) {
        let v = Math.round(+t.value) || 0;
        if (t.dataset.price === 'min') S.min = Math.max(lo, Math.min(v, S.max)); else S.max = Math.min(hi, Math.max(v, S.min));
        syncPrice();
        update();
      }
    });
    let rt;
    root.addEventListener('input', (e) => {
      const t = e.target;
      if (!t.dataset.range) return;
      const v = +t.value;
      if (t.dataset.range === 'min') S.min = Math.min(v, S.max - 5); else S.max = Math.max(v, S.min + 5);
      syncPrice();
      clearTimeout(rt);
      rt = setTimeout(update, 160);
    });
    function syncPrice() {
      const rmin = $('[data-range="min"]', root);
      if (!rmin) return;
      rmin.value = S.min;
      $('[data-range="max"]', root).value = S.max;
      $('[data-price="min"]', root).value = S.min;
      $('[data-price="max"]', root).value = S.max;
      const fill = $('.dual-range .fill', root);
      fill.style.left = ((S.min - lo) / (hi - lo)) * 100 + '%';
      fill.style.right = (100 - ((S.max - lo) / (hi - lo)) * 100) + '%';
    }
    root.addEventListener('click', (e) => {
      const t = e.target;
      const chip = t.closest('[data-chip]');
      if (chip) {
        const k = chip.dataset.chip;
        const v = chip.dataset.v;
        if (k === 'q') { S.q = ''; const si = $('.search input'); if (si) si.value = ''; }
        if (k === 'cat') S.cats = S.cats.filter((x) => x !== v);
        if (k === 'brand') S.brands = S.brands.filter((x) => x !== v);
        if (k === 'price') { S.min = lo; S.max = hi; syncPrice(); }
        if (k === 'stock') { S.stock = false; $('[data-toggle="stock"]', root).checked = false; }
        if (k === 'sale') { S.sale = false; $('[data-toggle="sale"]', root).checked = false; }
        update();
        return;
      }
      if (t.closest('[data-clear]')) {
        S.q = ''; S.cats = []; S.brands = []; S.min = lo; S.max = hi; S.stock = false; S.sale = false;
        $$('[data-toggle]', root).forEach((c) => { c.checked = false; });
        const si = $('.search input'); if (si) si.value = '';
        syncPrice();
        update();
        return;
      }
      if (t.closest('[data-more]')) {
        const btn = t.closest('[data-more]');
        btn.classList.add('loading', 'btn-outline');
        setTimeout(() => { S.page++; renderGrid(false); }, 350);
        return;
      }
      const v = t.closest('[data-view]');
      if (v) { S.view = v.dataset.view; TD.writeJSON('td_view', S.view); renderGrid(false); return; }
      if (t.closest('[data-open-filters]')) {
        $('#filters').classList.add('open');
        $('[data-overlay]').classList.add('open');
        document.body.style.overflow = 'hidden';
        return;
      }
      const fg = t.closest('.f-group > button');
      if (fg) { const g = fg.parentElement; g.classList.toggle('collapsed'); fg.setAttribute('aria-expanded', !g.classList.contains('collapsed')); }
    });
    syncPrice();
    renderFacets();
    renderChips();
    setTimeout(() => renderGrid(true), 380); // skeleton breve, simulando carregamento
    window.addEventListener('td:catalog-external', () => location.reload());
  }

  function pageCatalog() {
    const q = params.get('q');
    const sale = params.get('oferta') === '1';
    const title = q ? 'Resultados para “' + q + '”' : sale ? 'Ofertas' : 'Todos os produtos';
    document.title = title + ' – TecnoDreams';
    $('#page-title').textContent = title;
    $('#page-sub').textContent = q ? 'Refine a busca com os filtros ao lado.' : sale ? 'Produtos com preço promocional por tempo limitado.' : 'Tecnologia, gaming e utilidades em um só lugar.';
    $('#crumb-current').textContent = q ? 'Busca' : sale ? 'Ofertas' : 'Loja';
    listing({});
  }

  function pageCategory() {
    const slug = params.get('c');
    const gslug = params.get('g');
    const head = $('#cat-hero');
    let cats, title, desc, img, fit, crumbs;
    if (gslug && TD.group(gslug)) {
      const g = TD.group(gslug);
      cats = TD.categories().filter((c) => c.group === gslug && c.count);
      title = g.name;
      desc = cats.map((c) => c.name).join(' · ');
      img = gslug === 'tecnologia-gaming' ? 'assets/banners/hero-perifericos.webp' : (cats[0] && cats[0].img);
      fit = gslug === 'tecnologia-gaming' ? 'cover' : 'contain';
      crumbs = '<a href="index.html">Início</a><span class="sep">/</span><span>' + esc(g.name) + '</span>';
    } else {
      const c = TD.category(slug);
      if (!c) {
        $('#cat-hero').outerHTML = '';
        $('#listing').outerHTML = '<div class="container section">' + emptyState('layers', 'Categoria não encontrada', 'A categoria pode ter sido renomeada ou removida no painel.', '<a class="btn btn-primary" href="catalogo.html">Ver todos os produtos</a>') + '</div>';
        return;
      }
      const g = TD.group(c.group);
      cats = [c];
      title = c.name;
      desc = c.desc || '';
      img = c.img;
      fit = c.fit;
      crumbs = '<a href="index.html">Início</a><span class="sep">/</span><a href="categoria.html?g=' + c.group + '">' + esc(g ? g.name : '') + '</a><span class="sep">/</span><span>' + esc(c.name) + '</span>';
      // subcategorias irmãs
      const sib = TD.categories().filter((x) => x.group === c.group && x.count);
      $('#subcats').innerHTML = sib.map((x) => '<a class="chip' + (x.slug === c.slug ? ' active' : '') + '" href="categoria.html?c=' + x.slug + '">' + esc(x.name) + ' <small>' + x.count + '</small></a>').join('');
    }
    document.title = title + ' – TecnoDreams';
    const prods = TD.products().filter((p) => cats.some((c) => c.slug === p.category));
    const brands = new Set(prods.map((p) => p.brand));
    const priced = prods.filter((p) => p.price).map((p) => p.price);
    head.innerHTML = '<img class="bg' + (fit === 'contain' ? ' contain' : '') + '" src="' + esc(img) + '" alt="">' +
      '<div class="container"><nav class="crumbs" aria-label="Trilha">' + crumbs + '</nav><h1>' + esc(title) + '</h1><p>' + esc(desc) + '</p>' +
      '<div class="stats"><span><strong>' + prods.length + '</strong>produtos</span><span><strong>' + brands.size + '</strong>marca' + (brands.size === 1 ? '' : 's') + '</span>' +
      (priced.length ? '<span><strong>a partir de ' + fmt(Math.min.apply(null, priced)) + '</strong>preço</span>' : '') + '</div></div>';
    listing({ lockCats: cats.map((c) => c.slug), keep: gslug ? { g: gslug } : { c: slug } });
  }

  /* =========================================================
     PRODUTO
     ========================================================= */
  function pageProduct() {
    const root = $('#pdp-root');
    const p = TD.product(+params.get('id'));
    if (!p || !p.active) {
      root.innerHTML = '<div class="section">' + emptyState('package', 'Produto não encontrado', 'Este produto pode ter sido removido ou desativado. Veja outros itens do catálogo.', '<a class="btn btn-primary" href="catalogo.html">Ver catálogo</a>') + '</div>';
      return;
    }
    TD.recent.push(p.id);
    const cat = TD.category(p.category);
    const g = cat && TD.group(cat.group);
    const off = TD.discountPct(p);
    const imgs = p.images && p.images.length ? p.images : [TD.placeholder];
    document.title = p.name + ' – TecnoDreams';
    const md = document.querySelector('meta[name=description]');
    if (md) md.content = (p.bullets[0] || p.description[0] || p.name).slice(0, 155);
    // dados estruturados (SEO) — demonstra o que o sistema final gera por produto
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: p.sku || undefined, brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined, image: imgs.map(absUrl),
      offers: p.price ? { '@type': 'Offer', priceCurrency: 'BRL', price: p.price, availability: 'https://schema.org/' + (p.inStock ? 'InStock' : 'OutOfStock') } : undefined });
    document.head.appendChild(ld);

    const lowStock = p.inStock && p.stock <= 5;
    const waText = 'Olá, TecnoDreams! Tenho interesse no produto: ' + p.name + (p.sku ? ' (' + p.sku + ')' : '') + ' – ' + absUrl(productUrl(p));
    const fav = TD.favs.has(p.id);
    const variantHTML = p.variants ? '<span class="opt-label">Cor: <span>' + esc((p.variants.find((v) => v.id === p.id) || {}).label || '') + '</span></span><div class="variants">' +
      p.variants.map((v) => { const vp = TD.product(v.id); return '<a class="variant' + (v.id === p.id ? ' active' : '') + '" href="producto.html?id=' + v.id + '" aria-current="' + (v.id === p.id) + '"><img src="' + esc(TD.img(vp)) + '" alt="">' + esc(v.label) + '</a>'; }).join('') + '</div>' : '';

    let buy;
    if (!p.price && p.inStock) {
      buy = '<div class="note" style="margin-bottom:12px">' + icon('info') + '<span>Este produto está disponível com preço sob consulta. Fale com a equipe para receber o valor atualizado.</span></div>' +
        '<div class="buy-btns"><a class="btn btn-wa" href="' + waLink('Olá, TecnoDreams! Gostaria de saber o preço de: ' + p.name + ' – ' + absUrl(productUrl(p))) + '" target="_blank" rel="noopener">' + icon('wa', 'fill') + 'Consultar preço</a>' +
        '<button class="btn btn-outline" type="button" data-fav="' + p.id + '" aria-pressed="' + fav + '">' + icon('heart') + '<span data-fav-label>' + (fav ? 'Nos favoritos' : 'Favoritar') + '</span></button></div>';
    } else if (!p.inStock) {
      buy = '<div class="buy-btns"><button class="btn btn-primary" type="button" data-notify="' + p.id + '">' + icon('bell') + 'Avise-me quando chegar</button>' +
        '<button class="btn btn-outline" type="button" data-fav="' + p.id + '" aria-pressed="' + fav + '">' + icon('heart') + '<span data-fav-label>' + (fav ? 'Nos favoritos' : 'Favoritar') + '</span></button></div>' +
        '<div class="pdp-secondary"><a class="btn btn-wa" href="' + waLink(waText + ' – está esgotado, há previsão de reposição?') + '" target="_blank" rel="noopener">' + icon('wa', 'fill') + 'Perguntar sobre reposição</a></div>';
    } else {
      buy = '<span class="opt-label">Quantidade <span>(' + p.stock + ' disponíve' + (p.stock === 1 ? 'l' : 'is') + ')</span></span>' +
        '<div class="buy-row"><div class="qty" data-pdp-qty><button type="button" data-step="-1" aria-label="Diminuir">' + icon('minus') + '</button><input type="number" min="1" max="' + p.stock + '" value="1" aria-label="Quantidade"><button type="button" data-step="1" aria-label="Aumentar">' + icon('plus') + '</button></div>' +
        '<button class="btn btn-primary" type="button" id="add-main" data-add="' + p.id + '" data-qty="1">' + icon('bag') + 'Adicionar ao carrinho</button></div>' +
        '<div class="buy-btns"><button class="btn btn-accent" type="button" id="buy-now">' + icon('zap') + 'Comprar agora</button>' +
        '<button class="btn btn-outline' + (fav ? ' on' : '') + '" type="button" data-fav="' + p.id + '" aria-pressed="' + fav + '">' + icon('heart') + '<span data-fav-label>' + (fav ? 'Nos favoritos' : 'Favoritar') + '</span></button></div>' +
        '<div class="pdp-secondary"><a class="btn btn-wa" href="' + waLink(waText) + '" target="_blank" rel="noopener">' + icon('wa', 'fill') + 'Consultar pelo WhatsApp</a></div>';
    }

    const desc = (p.description || []).map((t) => '<p>' + esc(t) + '</p>').join('');
    const bullets = (p.bullets || []).length ? '<ul class="highlights">' + p.bullets.map((b) => '<li>' + icon('check') + '<span>' + esc(b) + '</span></li>').join('') + '</ul>' : '';
    const specs = (p.specs || []).length ? '<table class="spec-table"><tbody>' + p.specs.map((s) => '<tr><th scope="row">' + esc(s[0]) + '</th><td>' + esc(s[1]) + '</td></tr>').join('') + '</tbody></table>' : '<p>Especificações não cadastradas.</p>';
    const st = TD.settings();

    root.innerHTML = '<nav class="crumbs" aria-label="Trilha" style="padding-top:18px"><a href="index.html">Início</a><span class="sep">/</span>' +
      (g ? '<a href="categoria.html?g=' + g.slug + '">' + esc(g.name) + '</a><span class="sep">/</span>' : '') +
      (cat ? '<a href="categoria.html?c=' + cat.slug + '">' + esc(cat.name) + '</a><span class="sep">/</span>' : '') + '<span>' + esc(p.name) + '</span></nav>' +
      '<div class="pdp">' +
      '<div class="gallery"><div class="g-thumbs" role="tablist" aria-label="Fotos">' + (imgs.length > 1 ? imgs.map((src, i) => '<button type="button" class="' + (i === 0 ? 'active' : '') + '" data-thumb="' + i + '" aria-label="Foto ' + (i + 1) + '"><img src="' + esc(src) + '" alt="" loading="lazy"></button>').join('') : '') + '</div>' +
      '<div class="g-main" data-gmain><div class="p-tags">' + tagsHTML(p) + '</div><img src="' + esc(imgs[0]) + '" alt="' + esc(p.name) + '" fetchpriority="high">' +
      (imgs.length > 1 ? '<button class="g-nav prev" type="button" aria-label="Foto anterior">' + icon('left') + '</button><button class="g-nav next" type="button" aria-label="Próxima foto">' + icon('right') + '</button><span class="g-count">1 / ' + imgs.length + '</span>' : '') + '</div></div>' +
      '<div class="pdp-info">' +
      '<div class="pdp-meta">' + (p.brand ? '<a class="brand-link" href="catalogo.html?brand=' + encodeURIComponent(p.brand) + '">' + esc(p.brand === 'TD' ? 'Linha TD' : p.brand) + '</a>' : '') + (p.sku ? '<span>Cód.: ' + esc(p.sku) + '</span>' : '') +
      '<button class="link-btn" type="button" id="share-btn" style="margin-left:auto">' + icon('share') + 'Compartilhar</button></div>' +
      '<h1>' + esc(p.name) + '</h1>' +
      (p.price ? '<div class="pdp-price"><span class="now">' + fmt(p.price) + '</span>' + (p.regularPrice ? '<span class="old">' + fmt(p.regularPrice) + '</span><span class="save">Economize ' + fmt(p.regularPrice - p.price) + ' (' + off + '%)</span>' : '') + '</div>' +
        '<div style="font-size:13px;color:var(--muted)">Pagamento via Pix, Visa ou Mastercard</div>' : '<div class="pdp-price"><span class="now" style="font-size:26px">Preço sob consulta</span></div>') +
      '<div class="stock-line' + (!p.inStock ? ' out' : lowStock ? ' low' : '') + '"><span class="dot"></span>' + (!p.inStock ? 'Esgotado no momento' : !p.price ? 'Disponível sob consulta' : lowStock ? 'Últimas ' + p.stock + ' unidades em estoque' : 'Em estoque – pronta entrega') + '</div>' +
      bullets +
      variantHTML + buy +
      '<div class="ship-box"><strong style="display:flex;gap:8px;align-items:center">' + icon('truck') + 'Calcular frete e prazo</strong><form id="ship-form" novalidate><input data-mask="cep" inputmode="numeric" placeholder="00000-000" aria-label="CEP" autocomplete="postal-code"><button class="btn btn-outline btn-sm" type="submit">Calcular</button></form>' +
      '<div class="ship-results" aria-live="polite"></div></div>' +
      '<div class="trust-list"><div>' + icon('lock') + 'Compra protegida (HTTPS)</div><div>' + icon('card') + 'Pix, Visa e Mastercard</div><div>' + icon('store') + 'Retirada no Bom Retiro – SP</div><div>' + icon('headset') + 'Atendimento pelo WhatsApp</div></div>' +
      '</div></div>' +
      '<div class="tabs"><div class="tab-list" role="tablist">' +
      '<button role="tab" aria-selected="true" data-tab="desc">Descrição</button><button role="tab" aria-selected="false" data-tab="spec">Especificações técnicas</button><button role="tab" aria-selected="false" data-tab="ship">Entrega e retirada</button></div>' +
      '<div class="tab-panel" data-panel="desc">' + (desc || bullets || '<div class="note">' + icon('info') + '<span>A loja atual não tem descrição cadastrada para este produto. No novo painel, a descrição é editada com um editor visual simples.</span></div>') + '</div>' +
      '<div class="tab-panel" data-panel="spec" hidden>' + specs + '</div>' +
      '<div class="tab-panel" data-panel="ship" hidden><p><strong>Retirada:</strong> ' + esc(st.address) + ' (' + esc(st.cep) + '), após a confirmação do pedido.</p><p><strong>Entrega:</strong> calcule o frete pelo CEP. Neste protótipo os valores são simulados; na versão final serão obtidos da transportadora definida pela TecnoDreams.</p><p><strong>Dúvidas:</strong> fale com a equipe pelo WhatsApp ' + esc(st.phone) + '.</p></div></div>' +
      '<section class="section-sm rail-wrap" style="margin-top:28px"><div class="section-head"><div><h2>Produtos relacionados</h2><p>Da mesma categoria</p></div><div class="rail-nav"><button type="button" data-rail-prev aria-label="Anterior">' + icon('left') + '</button><button type="button" data-rail-next aria-label="Próximo">' + icon('right') + '</button></div></div><div class="rail-track" id="rail-related"></div></section>' +
      '<section class="section-sm rail-wrap" id="recent-wrap" hidden><div class="section-head"><div><h2>Vistos recentemente</h2></div><div class="rail-nav"><button type="button" data-rail-prev aria-label="Anterior">' + icon('left') + '</button><button type="button" data-rail-next aria-label="Próximo">' + icon('right') + '</button></div></div><div class="rail-track" id="rail-recent"></div></section>';

    // destaque: limita a 5 itens
    const hl = $('.pdp-info .highlights', root);
    if (hl) $$('li', hl).slice(5).forEach((li) => li.remove());

    // galeria
    let gi = 0;
    const main = $('[data-gmain]', root);
    const mainImg = $('img', main);
    const showImg = (i) => {
      gi = (i + imgs.length) % imgs.length;
      mainImg.style.opacity = '.3';
      setTimeout(() => { mainImg.src = imgs[gi]; mainImg.style.opacity = '1'; }, 120);
      $$('[data-thumb]', root).forEach((t, k) => t.classList.toggle('active', k === gi));
      const c = $('.g-count', main);
      if (c) c.textContent = gi + 1 + ' / ' + imgs.length;
    };
    $$('[data-thumb]', root).forEach((t) => t.addEventListener('click', () => showImg(+t.dataset.thumb)));
    if (imgs.length > 1) {
      $('.g-nav.prev', main).addEventListener('click', (e) => { e.stopPropagation(); showImg(gi - 1); });
      $('.g-nav.next', main).addEventListener('click', (e) => { e.stopPropagation(); showImg(gi + 1); });
    }
    if (window.matchMedia('(hover: hover)').matches) {
      main.addEventListener('mousemove', (e) => {
        const r = main.getBoundingClientRect();
        mainImg.style.transformOrigin = ((e.clientX - r.left) / r.width) * 100 + '% ' + ((e.clientY - r.top) / r.height) * 100 + '%';
        main.classList.add('zoom');
      });
      main.addEventListener('mouseleave', () => main.classList.remove('zoom'));
    }
    let tx = null;
    main.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
    main.addEventListener('touchend', (e) => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 40) showImg(gi + (dx < 0 ? 1 : -1)); tx = null; });
    main.addEventListener('click', (e) => {
      if (e.target.closest('.g-nav')) return;
      const lb = document.createElement('div');
      lb.className = 'lightbox';
      lb.innerHTML = '<img src="' + esc(imgs[gi]) + '" alt="' + esc(p.name) + '"><button class="icon-btn lb-close" aria-label="Fechar">' + icon('x') + '</button>' +
        (imgs.length > 1 ? '<button class="icon-btn lb-prev" aria-label="Anterior">' + icon('left') + '</button><button class="icon-btn lb-next" aria-label="Próxima">' + icon('right') + '</button>' : '');
      document.body.appendChild(lb);
      let li = gi;
      const show = (k) => { li = (k + imgs.length) % imgs.length; $('img', lb).src = imgs[li]; };
      const close = () => { lb.remove(); document.removeEventListener('keydown', key); };
      const key = (ev) => { if (ev.key === 'Escape') close(); if (ev.key === 'ArrowLeft') show(li - 1); if (ev.key === 'ArrowRight') show(li + 1); };
      document.addEventListener('keydown', key);
      lb.addEventListener('click', (ev) => {
        if (ev.target.closest('.lb-prev')) show(li - 1);
        else if (ev.target.closest('.lb-next')) show(li + 1);
        else if (ev.target === lb || ev.target.closest('.lb-close')) close();
      });
    });

    // quantidade
    const qbox = $('[data-pdp-qty]', root);
    if (qbox) {
      const inp = $('input', qbox);
      const addBtn = $('#add-main', root);
      const setQ = (v) => {
        v = Math.max(1, Math.min(p.stock, parseInt(v, 10) || 1));
        inp.value = v;
        addBtn.dataset.qty = v;
        const sb = $('.sticky-buy [data-add]');
        if (sb) sb.dataset.qty = v;
      };
      $$('[data-step]', qbox).forEach((b) => b.addEventListener('click', () => {
        const next = (parseInt(inp.value, 10) || 1) + +b.dataset.step;
        if (next > p.stock) toast('Limite de estoque', { type: 'info', sub: 'Temos ' + p.stock + ' unidade(s) disponíveis.' });
        setQ(next);
      }));
      inp.addEventListener('change', () => setQ(inp.value));
      $('#buy-now', root).addEventListener('click', (e) => {
        const btn = e.currentTarget;
        const q = +inp.value || 1;
        const inCart = TD.cart.qtyOf(p.id);
        if (inCart < q) {
          const r = TD.cart.add(p.id, q - inCart);
          if (!r.ok) { toast(r.reason, { type: 'error' }); return; }
        }
        btn.classList.add('loading');
        setTimeout(() => { location.href = 'checkout.html'; }, 350);
      });
      // barra fixa no celular
      const sticky = document.createElement('div');
      sticky.className = 'sticky-buy';
      sticky.innerHTML = '<div><div class="sb-name">' + esc(p.name) + '</div><div class="sb-price">' + fmt(p.price) + '</div></div><button class="btn btn-primary" type="button" data-add="' + p.id + '" data-qty="1">' + icon('bag') + 'Adicionar</button>';
      document.body.appendChild(sticky);
      document.body.classList.add('has-sticky');
      const onScroll = () => sticky.classList.toggle('show', addBtn.getBoundingClientRect().bottom < 0);
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    // compartilhar
    $('#share-btn', root).addEventListener('click', async () => {
      const url = location.href;
      if (navigator.share) { try { await navigator.share({ title: p.name, url }); } catch (e) { /* cancelado */ } return; }
      try { await navigator.clipboard.writeText(url); toast('Link copiado', { sub: 'Cole onde quiser compartilhar.' }); } catch (e) { toast('Copie o link na barra de endereço', { type: 'info' }); }
    });

    // frete
    const sf = $('#ship-form', root);
    bindMasks(sf.parentElement);
    sf.addEventListener('submit', (e) => {
      e.preventDefault();
      const cepInp = $('input', sf);
      const out = $('.ship-results', root);
      const heavy = /cadeira|mesa|poltrona|partybox|z906|z625/i.test(p.name);
      const opts = TD.shipping(cepInp.value, p.price, heavy);
      if (!opts) { out.innerHTML = '<div style="background:var(--red-50);color:var(--red-600)">Informe um CEP válido com 8 dígitos.</div>'; cepInp.focus(); return; }
      const btn = $('button', sf);
      btn.classList.add('loading');
      setTimeout(async () => {
        btn.classList.remove('loading');
        const info = await lookupCEP(cepInp.value);
        out.innerHTML = (info ? '<small>' + esc(info.logradouro ? info.logradouro + ', ' : '') + esc(info.localidade) + ' – ' + esc(info.uf) + '</small>' : '') +
          opts.map((o) => '<div><span><strong>' + esc(o.name) + '</strong><br><small>' + esc(o.eta) + '</small></span><strong>' + (o.price ? fmt(o.price) : 'Grátis') + '</strong></div>').join('') +
          '<small>Valores simulados para demonstração.</small>';
      }, 450);
    });

    // abas
    $$('[data-tab]', root).forEach((t) => t.addEventListener('click', () => {
      $$('[data-tab]', root).forEach((x) => x.setAttribute('aria-selected', x === t));
      $$('[data-panel]', root).forEach((pn) => { pn.hidden = pn.dataset.panel !== t.dataset.tab; });
    }));

    // relacionados e vistos
    let related = TD.products().filter((x) => x.category === p.category && x.id !== p.id && !(p.variants || []).some((v) => v.id === x.id));
    if (related.length < 4) related = related.concat(TD.products().filter((x) => x.brand === p.brand && x.id !== p.id && related.indexOf(x) === -1));
    related.sort((a, b) => (b.inStock - a.inStock) || Math.abs(a.price - p.price) - Math.abs(b.price - p.price));
    if (related.length) renderRail($('#rail-related'), related.slice(0, 10));
    else $('#rail-related').closest('section').hidden = true;
    const recent = TD.recent.ids().filter((id) => id !== p.id).map(TD.product).filter(Boolean);
    if (recent.length) { $('#recent-wrap').hidden = false; renderRail($('#rail-recent'), recent); }
  }

  /* =========================================================
     CARRINHO
     ========================================================= */
  function pageCart() {
    const root = $('#cart-root');
    function render() {
      const lines = TD.cart.lines();
      const t = TD.cart.totals();
      $('#cart-count').textContent = t.count ? t.count + (t.count === 1 ? ' item' : ' itens') : '';
      if (!lines.length) {
        root.innerHTML = '<div style="padding-top:24px">' + emptyState('bag', 'Seu carrinho está vazio', 'Que tal começar pelos produtos mais populares da TecnoDreams?', '<a class="btn btn-primary" href="catalogo.html">Explorar produtos</a><a class="btn btn-outline" href="favoritos.html">' + icon('heart') + 'Ver favoritos</a>') + '</div>';
        renderSuggest([]);
        return;
      }
      const c = TD.cart.coupon();
      root.innerHTML = '<div class="two-col"><div class="panel"><div class="panel-head"><h2>Itens do carrinho</h2><button class="link-btn" type="button" id="clear-cart">' + icon('trash') + 'Esvaziar</button></div>' +
        lines.map((l) => '<div class="cart-line" data-line="' + l.id + '"><a href="' + productUrl(l.product) + '"><img src="' + esc(TD.img(l.product)) + '" alt=""></a>' +
          '<div><a class="cl-name" href="' + productUrl(l.product) + '">' + esc(l.product.name) + '</a><div class="cl-meta">' + esc(l.product.brand) + (l.product.sku ? ' · ' + esc(l.product.sku) : '') + ' · ' + fmt(l.product.price) + ' cada</div>' +
          (l.limited ? '<div class="cl-meta" style="color:var(--amber-600);font-weight:600">Quantidade ajustada ao estoque disponível (' + l.product.stock + ').</div>' : '') +
          (l.product.stock <= 5 ? '<div class="cl-meta" style="color:var(--amber-600)">Restam ' + l.product.stock + ' unidade(s)</div>' : '') +
          '<div class="cl-controls"><div class="qty sm" data-qty-for="' + l.id + '"><button type="button" data-step="-1" aria-label="Diminuir">' + icon('minus') + '</button><input type="number" min="1" max="' + l.product.stock + '" value="' + l.qty + '" aria-label="Quantidade"><button type="button" data-step="1" aria-label="Aumentar">' + icon('plus') + '</button></div>' +
          '<button class="link-btn" type="button" data-move-fav="' + l.id + '">' + icon('heart') + 'Mover p/ favoritos</button><button class="link-btn" type="button" data-del="' + l.id + '">' + icon('trash') + 'Remover</button></div></div>' +
          '<div class="cl-total"><strong>' + fmt(l.total) + '</strong>' + (l.product.regularPrice ? '<small><s>' + fmt(l.product.regularPrice * l.qty) + '</s></small>' : '') + '</div></div>').join('') +
        '<div style="padding:16px 22px"><a class="btn btn-outline" href="catalogo.html">' + icon('left') + 'Continuar comprando</a></div></div>' +
        '<aside class="panel summary"><div class="panel-head"><h3>Resumo do pedido</h3></div><div class="panel-body">' +
        '<div class="sum-row"><span>Subtotal (' + t.count + (t.count === 1 ? ' item' : ' itens') + ')</span><span>' + fmt(t.subtotal) + '</span></div>' +
        (t.discount ? '<div class="sum-row discount"><span>Cupom ' + esc(t.coupon.code) + '</span><span>−' + fmt(t.discount) + '</span></div>' : '') +
        '<div class="sum-row"><span>Frete</span><span style="color:var(--muted)">Calculado no checkout</span></div>' +
        (c && !t.discount ? '<div class="coupon-msg err">O cupom ' + esc(c.code) + ' exige compra mínima de ' + fmt(c.min) + '.</div>' : '') +
        (c ? '<div class="coupon" style="align-items:center;justify-content:space-between"><span class="tag tag-ok">' + icon('tag') + esc(c.code) + '</span><button class="link-btn" type="button" id="rm-coupon">Remover cupom</button></div>'
          : '<form class="coupon" id="coupon-form"><input placeholder="Cupom de desconto" aria-label="Cupom de desconto"><button class="btn btn-outline btn-sm" type="submit">Aplicar</button></form><div class="coupon-msg" id="coupon-msg"><span style="color:var(--muted)">Teste com o cupom demonstrativo <strong>DEMO10</strong>.</span></div>') +
        '<div class="sum-row total"><span>Total</span><span>' + fmt(t.total) + '</span></div>' +
        '<a class="btn btn-primary btn-block" href="checkout.html" style="margin-top:14px">' + icon('lock') + 'Ir para o checkout</a>' +
        '<div class="pay-logos" style="justify-content:center;margin-top:14px"><span class="pay" style="border:1px solid var(--line)"><img src="assets/brand/pix.png" alt="Pix"></span><span class="pay" style="border:1px solid var(--line)"><img src="assets/brand/visa.png" alt="Visa"></span><span class="pay" style="border:1px solid var(--line)"><img src="assets/brand/mastercard.png" alt="Mastercard"></span></div>' +
        '</div></aside></div>';
      bindQtySteppers(root, (id, q) => TD.cart.setQty(id, q));
      const cf = $('#coupon-form', root);
      if (cf) cf.addEventListener('submit', (e) => {
        e.preventDefault();
        const r = TD.cart.applyCoupon($('input', cf).value);
        if (r.ok) toast('Cupom ' + r.coupon.code + ' aplicado', { sub: r.coupon.note });
        else { const m = $('#coupon-msg', root); m.className = 'coupon-msg err'; m.textContent = r.reason; }
      });
      const rc = $('#rm-coupon', root);
      if (rc) rc.addEventListener('click', () => TD.cart.removeCoupon());
      $('#clear-cart', root).addEventListener('click', () => TD.confirm('Esvaziar carrinho?', 'Todos os itens serão removidos do carrinho.', 'Esvaziar', () => { TD.cart.clear(); toast('Carrinho esvaziado', { type: 'info' }); }, true));
      renderSuggest(lines.map((l) => l.id));
    }
    function renderSuggest(exclude) {
      const list = TD.products().filter((p) => p.featured && exclude.indexOf(p.id) === -1 && TD.canBuy(p));
      const sec = $('#cart-suggest');
      if (!list.length) { sec.hidden = true; return; }
      sec.hidden = false;
      renderRail($('#rail-suggest'), list);
    }
    root.addEventListener('click', (e) => {
      const del = e.target.closest('[data-del]');
      if (del) {
        const id = +del.dataset.del;
        const row = del.closest('.cart-line');
        row.classList.add('removing');
        setTimeout(() => {
          const line = TD.cart.remove(id);
          toast('Item removido do carrinho', { type: 'info', sub: TD.product(id).name, action: 'Desfazer', onAction: () => TD.cart.restore(line) });
        }, 250);
        return;
      }
      const mv = e.target.closest('[data-move-fav]');
      if (mv) {
        const id = +mv.dataset.moveFav;
        if (!TD.favs.has(id)) TD.favs.toggle(id);
        TD.cart.remove(id);
        toast('Movido para os favoritos', { sub: TD.product(id).name, action: 'Ver favoritos', onAction: () => { location.href = 'favoritos.html'; } });
      }
    });
    window.addEventListener('td:cart', render);
    render();
  }

  /* =========================================================
     CHECKOUT (demonstrativo)
     ========================================================= */
  function pageCheckout() {
    const root = $('#checkout-root');
    if (!TD.cart.lines().length) {
      root.innerHTML = '<div style="padding-top:24px">' + emptyState('bag', 'Não há itens para finalizar', 'Adicione produtos ao carrinho para continuar.', '<a class="btn btn-primary" href="catalogo.html">Ver produtos</a>') + '</div>';
      return;
    }
    const acc = TD.account.get();
    const pr = acc.loggedIn ? acc.profile : {};
    const addr = acc.loggedIn ? (acc.addresses.find((a) => a.default) || acc.addresses[0] || {}) : {};
    const data = TD.readJSON('td_checkout_draft', {});
    const v = (k, d) => data[k] != null ? data[k] : (d || '');
    let step = 1;
    let shipOpts = null;

    root.innerHTML = '<div class="two-col"><div>' +
      '<ol class="steps" style="padding:0"><li class="active" data-s="1"><span>Identificação</span></li><li data-s="2"><span>Entrega</span></li><li data-s="3"><span>Pagamento</span></li></ol>' +
      '<form id="co-form" novalidate>' +
      // passo 1
      '<section class="panel" data-step="1"><div class="panel-head"><h2>' + icon('user') + ' Seus dados</h2>' + (acc.loggedIn ? '<span class="tag tag-ok">' + icon('check') + 'Conectado</span>' : '<a class="link-more" href="mi-cuenta.html?next=checkout">Já tenho conta</a>') + '</div><div class="panel-body"><div class="form-grid">' +
      field({ id: 'c-name', label: 'Nome completo', validate: 'required name', err: 'Informe nome e sobrenome.', value: v('name', pr.name), auto: 'name' }) +
      field({ id: 'c-email', label: 'E-mail', type: 'email', size: 'half', validate: 'email', err: 'E-mail inválido.', value: v('email', pr.email), auto: 'email' }) +
      field({ id: 'c-phone', label: 'Celular / WhatsApp', size: 'half', mask: 'phone', validate: 'phone', err: 'Informe DDD + número.', value: v('phone', pr.phone), placeholder: '(11) 90000-0000', auto: 'tel' }) +
      field({ id: 'c-cpf', label: 'CPF', size: 'half', mask: 'cpf', validate: 'cpf', err: 'CPF inválido.', value: v('cpf', pr.cpf), placeholder: '000.000.000-00', hint: 'Usado para a nota fiscal.' }) +
      '</div><div class="checkout-actions"><a class="btn btn-outline" href="carrito.html">' + icon('left') + 'Voltar ao carrinho</a><button class="btn btn-primary" type="button" data-next="2">Continuar para entrega' + icon('arrow') + '</button></div></div></section>' +
      // passo 2
      '<section class="panel" data-step="2" hidden><div class="panel-head"><h2>' + icon('truck') + ' Entrega</h2></div><div class="panel-body"><div class="form-grid">' +
      field({ id: 'c-cep', label: 'CEP', size: 'half', mask: 'cep', validate: 'cep', err: 'CEP com 8 dígitos.', value: v('cep', addr.cep), placeholder: '00000-000', hint: 'Preenchemos o endereço automaticamente.', auto: 'postal-code' }) +
      '<div class="field half" style="align-self:end"><a class="hint" href="https://buscacepinter.correios.com.br/" target="_blank" rel="noopener" style="text-decoration:underline">Não sei meu CEP</a></div>' +
      '<div class="field" id="ship-opts-wrap"><label>Forma de entrega</label><div class="opt-cards" id="ship-opts"><div class="note">' + icon('info') + '<span>Informe o CEP para ver as opções de entrega.</span></div></div></div>' +
      '<div class="form-grid" id="addr-fields" style="grid-column:span 6">' +
      field({ id: 'c-street', label: 'Endereço', size: 'two-thirds', validate: 'required', err: 'Informe a rua.', value: v('street', addr.street), auto: 'address-line1' }) +
      field({ id: 'c-number', label: 'Número', size: 'third', validate: 'required', err: 'Obrigatório.', value: v('number', addr.number) }) +
      field({ id: 'c-comp', label: 'Complemento', size: 'half', optional: true, value: v('comp', addr.comp), auto: 'address-line2' }) +
      field({ id: 'c-district', label: 'Bairro', size: 'half', validate: 'required', err: 'Informe o bairro.', value: v('district', addr.district) }) +
      field({ id: 'c-city', label: 'Cidade', size: 'two-thirds', validate: 'required', err: 'Informe a cidade.', value: v('city', addr.city) }) +
      field({ id: 'c-uf', label: 'Estado', size: 'third', type: 'select', options: ufOptions(v('uf', addr.uf)), validate: 'required', err: 'Selecione.' }) +
      '</div></div><div class="checkout-actions"><button class="btn btn-outline" type="button" data-prev="1">' + icon('left') + 'Voltar</button><button class="btn btn-primary" type="button" data-next="3">Continuar para pagamento' + icon('arrow') + '</button></div></div></section>' +
      // passo 3
      '<section class="panel" data-step="3" hidden><div class="panel-head"><h2>' + icon('card') + ' Pagamento</h2><span class="tag tag-warn">Demonstração</span></div><div class="panel-body">' +
      '<div class="opt-cards">' +
      '<label class="opt-card"><input type="radio" name="pay" value="pix" checked><span class="oc-ic">' + icon('pix') + '</span><span class="oc-body"><strong>Pix</strong><small>Aprovação imediata após o pagamento</small></span><img src="assets/brand/pix.png" alt="" style="height:22px"></label>' +
      '<label class="opt-card"><input type="radio" name="pay" value="card"><span class="oc-ic">' + icon('card') + '</span><span class="oc-body"><strong>Cartão de crédito</strong><small>Visa ou Mastercard</small></span><span style="display:flex;gap:4px"><img src="assets/brand/visa.png" alt="" style="height:20px"><img src="assets/brand/mastercard.png" alt="" style="height:20px"></span></label>' +
      '</div>' +
      '<div class="pay-detail" data-pay="pix"><div class="note" style="background:#fff">' + icon('info') + '<span>O QR Code Pix é exibido após confirmar o pedido. No sistema final é gerado pelo provedor de pagamento escolhido (ex.: PagBank).</span></div></div>' +
      '<div class="pay-detail" data-pay="card" hidden><div class="form-grid">' +
      field({ id: 'cc-number', label: 'Número do cartão', mask: 'card', validate: 'card', err: 'Número inválido.', placeholder: '0000 0000 0000 0000', hint: 'Teste: 4111 1111 1111 1111 (cartão de teste, nenhuma cobrança é feita).', auto: 'off' }) +
      field({ id: 'cc-name', label: 'Nome impresso no cartão', validate: 'required', err: 'Obrigatório.', auto: 'off' }) +
      field({ id: 'cc-exp', label: 'Validade', size: 'half', mask: 'exp', validate: 'exp', err: 'MM/AA válido.', placeholder: 'MM/AA', auto: 'off' }) +
      field({ id: 'cc-cvv', label: 'CVV', size: 'half', mask: 'cvv', validate: 'cvv', err: '3 ou 4 dígitos.', placeholder: '123', auto: 'off' }) +
      '</div><p class="hint" style="margin:10px 0 0">Os dados do cartão não são enviados nem armazenados neste protótipo.</p></div>' +
      '<label class="check" style="margin-top:18px;align-items:flex-start"><input type="checkbox" id="c-agree"><span>Entendo que este é um <strong>pedido de demonstração</strong>: nenhuma cobrança será realizada e nenhum produto será enviado.</span></label>' +
      '<div class="checkout-actions"><button class="btn btn-outline" type="button" data-prev="2">' + icon('left') + 'Voltar</button><button class="btn btn-accent" type="submit" id="place">' + icon('lock') + 'Confirmar pedido (simulado)</button></div></div></section>' +
      '</form></div>' +
      '<aside class="panel summary" id="co-summary"></aside></div>';

    const form = $('#co-form', root);
    bindMasks(form);
    liveValidate(form);

    function summary() {
      const ship = shipOpts && shipOpts.find((o) => o.id === (form.ship && form.ship.value));
      const t = TD.cart.totals(ship ? ship.price : 0);
      $('#co-summary').innerHTML = '<div class="panel-head"><h3>Resumo</h3><a class="link-more" href="carrito.html">Editar</a></div><div class="panel-body">' +
        '<div class="sum-items">' + TD.cart.lines().map((l) => '<div class="sum-item"><div class="si-img"><img src="' + esc(TD.img(l.product)) + '" alt=""><span>' + l.qty + '</span></div><div class="si-name">' + esc(l.product.name) + '</div><strong>' + fmt(l.total) + '</strong></div>').join('') + '</div>' +
        '<div class="sum-row"><span>Subtotal</span><span>' + fmt(t.subtotal) + '</span></div>' +
        (t.discount ? '<div class="sum-row discount"><span>Cupom ' + esc(t.coupon.code) + '</span><span>−' + fmt(t.discount) + '</span></div>' : '') +
        '<div class="sum-row"><span>Frete' + (ship ? ' · ' + esc(ship.name) : '') + '</span><span>' + (ship ? (ship.price ? fmt(ship.price) : 'Grátis') : '—') + '</span></div>' +
        '<div class="sum-row total"><span>Total</span><span>' + fmt(t.total) + '</span></div>' +
        '<p class="note" style="margin:14px 0 0">' + icon('shield') + '<span>Checkout demonstrativo. Na versão final: pagamento integrado ao provedor escolhido, com confirmação automática.</span></p></div>';
      return t;
    }

    function goStep(n) {
      step = n;
      $$('[data-step]', root).forEach((s) => { s.hidden = +s.dataset.step !== n; });
      $$('.steps li', root).forEach((li) => { const s = +li.dataset.s; li.classList.toggle('active', s === n); li.classList.toggle('done', s < n); });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (n === 2 && TD.ui.onlyDigits($('#c-cep').value).length === 8 && !shipOpts) loadShipping(false);
    }
    function saveDraft() {
      const d = {};
      ['name', 'email', 'phone', 'cpf', 'cep', 'street', 'number', 'comp', 'district', 'city', 'uf'].forEach((k) => { const el = $('#c-' + k); if (el) d[k] = el.value; });
      TD.writeJSON('td_checkout_draft', d);
    }
    form.addEventListener('input', saveDraft);

    async function loadShipping(fill) {
      const cep = $('#c-cep').value;
      const heavy = TD.cart.lines().some((l) => /cadeira|mesa|poltrona|partybox|z906|z625/i.test(l.product.name));
      shipOpts = TD.shipping(cep, TD.cart.subtotal(), heavy);
      const box = $('#ship-opts');
      if (!shipOpts) { box.innerHTML = '<div class="note">' + icon('info') + '<span>Informe o CEP para ver as opções de entrega.</span></div>'; summary(); return; }
      const prev = data.ship || 'padrao';
      box.innerHTML = shipOpts.map((o) => '<label class="opt-card"><input type="radio" name="ship" value="' + o.id + '"' + (o.id === prev ? ' checked' : '') + '><span class="oc-ic">' + icon(o.id === 'retirada' ? 'store' : o.id === 'expressa' ? 'zap' : 'truck') + '</span><span class="oc-body"><strong>' + esc(o.name) + '</strong><small>' + esc(o.eta) + ' · ' + esc(o.desc) + '</small></span><span class="oc-price">' + (o.price ? fmt(o.price) : 'Grátis') + '</span></label>').join('') +
        '<small class="hint">Valores de frete simulados para demonstração.</small>';
      toggleAddr();
      summary();
      if (fill) {
        const f = $('#c-cep').closest('.field');
        const hint = $('.hint', f);
        hint.textContent = 'Buscando endereço…';
        const info = await lookupCEP(cep);
        if (info) {
          if (info.logradouro) $('#c-street').value = info.logradouro;
          if (info.bairro) $('#c-district').value = info.bairro;
          $('#c-city').value = info.localidade || '';
          $('#c-uf').value = info.uf || '';
          hint.textContent = 'Endereço encontrado ✓';
          $('#c-number').focus();
          saveDraft();
        } else hint.textContent = 'Não foi possível buscar o endereço automaticamente. Preencha manualmente.';
      }
    }
    function toggleAddr() {
      const pickup = form.ship && form.ship.value === 'retirada';
      $('#addr-fields').hidden = !!pickup;
    }
    $('#c-cep').addEventListener('input', (e) => { if (TD.ui.onlyDigits(e.target.value).length === 8) loadShipping(true); });
    form.addEventListener('change', (e) => {
      if (e.target.name === 'ship') { data.ship = e.target.value; toggleAddr(); summary(); }
      if (e.target.name === 'pay') $$('[data-pay]', root).forEach((d) => { d.hidden = d.dataset.pay !== e.target.value; });
    });
    root.addEventListener('click', (e) => {
      const nx = e.target.closest('[data-next]');
      if (nx) {
        const cur = $('[data-step="' + step + '"]', root);
        if (!validate(cur)) { toast('Revise os campos destacados', { type: 'error' }); return; }
        if (step === 2 && !(form.ship && form.ship.value)) { toast('Escolha a forma de entrega', { type: 'error' }); return; }
        goStep(+nx.dataset.next);
        return;
      }
      const pv = e.target.closest('[data-prev]');
      if (pv) goStep(+pv.dataset.prev);
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (step !== 3) return;
      if (!validate($('[data-step="3"]', root))) { toast('Revise os dados do cartão', { type: 'error' }); return; }
      if (!$('#c-agree').checked) { toast('Confirme que entende que é um pedido de demonstração', { type: 'error' }); $('#c-agree').focus(); return; }
      const btn = $('#place');
      btn.classList.add('loading');
      setTimeout(() => {
        const t = summary();
        const ship = shipOpts.find((o) => o.id === form.ship.value);
        const pay = form.pay.value;
        const order = TD.orders.create({
          items: TD.cart.lines().map((l) => ({ id: l.id, name: l.product.name, price: l.product.price, qty: l.qty, img: TD.img(l.product) })),
          subtotal: t.subtotal, discount: t.discount, coupon: t.coupon ? t.coupon.code : null, shipping: t.shipping, total: t.total,
          customer: { name: $('#c-name').value, email: $('#c-email').value, phone: $('#c-phone').value, cpf: $('#c-cpf').value },
          delivery: { method: ship.id, name: ship.name, eta: ship.eta },
          address: ship.id === 'retirada' ? null : { cep: $('#c-cep').value, street: $('#c-street').value, number: $('#c-number').value, comp: $('#c-comp').value, district: $('#c-district').value, city: $('#c-city').value, uf: $('#c-uf').value },
          payment: pay === 'pix' ? 'Pix' : 'Cartão final ' + TD.ui.onlyDigits($('#cc-number').value).slice(-4)
        });
        // atualiza estoque demonstrativo
        const s = TD.adminState();
        order.items.forEach((it) => { const p = TD.product(it.id); if (p) { s.overrides[it.id] = Object.assign({}, s.overrides[it.id], { stock: Math.max(0, p.stock - it.qty) }); } });
        TD.saveAdminState(s);
        if (acc.loggedIn) {
          const a = TD.account.get();
          a.profile = Object.assign({}, a.profile, order.customer);
          if (order.address && !a.addresses.some((x) => x.cep === order.address.cep && x.number === order.address.number)) a.addresses.push(Object.assign({ id: Date.now(), label: 'Casa', default: !a.addresses.length }, order.address));
          TD.account.save(a);
        }
        TD.cart.clear();
        try { localStorage.removeItem('td_checkout_draft'); } catch (er) { /* ignore */ }
        success(order, pay);
      }, 1300);
    });
    function success(o, pay) {
      root.innerHTML = '<div class="panel" style="max-width:760px;margin:28px auto 0"><div class="success"><div class="ok-ic">' + icon('check') + '</div>' +
        '<h2>Pedido recebido!</h2><p style="color:var(--muted);margin:0">Obrigado, ' + esc(o.customer.name.split(' ')[0]) + '. Enviamos a confirmação para ' + esc(o.customer.email) + ' <small>(simulado)</small>.</p>' +
        '<div class="order-no">Pedido ' + esc(o.id) + '</div>' +
        '<div class="demo-warning"><strong>Pedido de demonstração.</strong> Nenhuma cobrança foi realizada e nenhum produto será enviado. O pedido aparece em “Minha conta” e no painel administrativo deste protótipo.</div>' +
        (pay === 'pix' ? '<div class="pix-box" style="max-width:420px;margin:18px auto;text-align:left"><div class="qr">' + fakeQR(o.id) + '</div><div><strong>Pix – QR Code ilustrativo</strong><p style="font-size:13px;color:var(--muted);margin:4px 0 0">Este código não é pagável. No sistema final, o QR Code e o “copia e cola” são gerados pelo provedor de pagamento e o pedido é aprovado automaticamente.</p></div></div>' : '') +
        '<div style="text-align:left;max-width:480px;margin:16px auto 0">' + o.items.map((i) => '<div class="sum-item" style="margin-bottom:10px"><div class="si-img"><img src="' + esc(i.img) + '" alt=""><span>' + i.qty + '</span></div><div class="si-name">' + esc(i.name) + '</div><strong>' + fmt(i.price * i.qty) + '</strong></div>').join('') +
        (o.discount ? '<div class="sum-row discount"><span>Desconto</span><span>−' + fmt(o.discount) + '</span></div>' : '') +
        '<div class="sum-row"><span>' + esc(o.delivery.name) + '</span><span>' + (o.shipping ? fmt(o.shipping) : 'Grátis') + '</span></div><div class="sum-row total"><span>Total</span><span>' + fmt(o.total) + '</span></div></div>' +
        '<div class="btns" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:22px"><a class="btn btn-primary" href="mi-cuenta.html#pedidos">Acompanhar pedido</a><a class="btn btn-outline" href="index.html">Voltar à loja</a>' +
        '<a class="btn btn-wa" target="_blank" rel="noopener" href="' + waLink('Olá, TecnoDreams! Acabei de fazer o pedido ' + o.id + ' (demonstração).') + '">' + icon('wa', 'fill') + 'Falar sobre o pedido</a></div></div></div>';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    summary();
    if (TD.ui.onlyDigits($('#c-cep').value).length === 8) loadShipping(false);
  }

  /* QR ilustrativo determinístico (não é um código Pix válido) */
  function fakeQR(seed) {
    const n = 25;
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const rnd = () => { h ^= h << 13; h >>>= 0; h ^= h >> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
    let rects = '';
    const finder = (x, y) => '<rect x="' + x + '" y="' + y + '" width="7" height="7" fill="#061d36"/><rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="5" height="5" fill="#fff"/><rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="3" height="3" fill="#061d36"/>';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if ((x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9)) continue;
      if (rnd() > 0.52) rects += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
    }
    return '<svg viewBox="0 0 ' + n + ' ' + n + '" width="100%" height="100%" shape-rendering="crispEdges"><g fill="#061d36">' + rects + '</g>' + finder(0, 0) + finder(n - 7, 0) + finder(0, n - 7) + '</svg>';
  }

  /* =========================================================
     FAVORITOS
     ========================================================= */
  function pageFavs() {
    const root = $('#favs-root');
    const shared = params.get('ids') ? params.get('ids').split(',').map(Number).filter((id) => TD.product(id)) : null;
    function render() {
      if (shared) {
        const list = shared.map(TD.product).filter((p) => p && p.active);
        $('#favs-title').textContent = 'Lista compartilhada';
        $('#favs-sub').textContent = list.length + ' produto(s) que alguém compartilhou com você.';
        root.innerHTML = '<div class="toolbar"><span class="result-count"><strong>' + list.length + '</strong> produtos</span><div class="tb-right"><button class="btn btn-primary btn-sm" type="button" id="save-shared">' + icon('heart') + 'Salvar nos meus favoritos</button></div></div><div class="grid-products">' + list.map(card).join('') + '</div>';
        $('#save-shared').addEventListener('click', () => { list.forEach((p) => { if (!TD.favs.has(p.id)) TD.favs.toggle(p.id); }); toast('Lista salva nos seus favoritos'); setTimeout(() => { location.href = 'favoritos.html'; }, 700); });
        return;
      }
      const list = TD.favs.ids().map(TD.product);
      $('#favs-sub').textContent = list.length ? list.length + ' produto' + (list.length === 1 ? '' : 's') + ' salvo' + (list.length === 1 ? '' : 's') + ' para depois.' : 'Guarde aqui os produtos que você quer acompanhar.';
      if (!list.length) {
        root.innerHTML = emptyState('heart', 'Você ainda não tem favoritos', 'Toque no coração dos produtos para salvá-los aqui. Eles ficam guardados neste navegador.', '<a class="btn btn-primary" href="catalogo.html">Explorar produtos</a>');
        return;
      }
      const buyable = list.filter(TD.canBuy);
      const total = buyable.reduce((s, p) => s + p.price, 0);
      root.innerHTML = '<div class="toolbar"><span class="result-count"><strong>' + list.length + '</strong> favorito' + (list.length === 1 ? '' : 's') + (buyable.length ? ' · ' + fmt(total) + ' em itens disponíveis' : '') + '</span><div class="tb-right" style="flex-wrap:wrap">' +
        '<button class="btn btn-outline btn-sm" type="button" id="share-favs">' + icon('share') + 'Compartilhar</button>' +
        '<button class="btn btn-outline btn-sm" type="button" id="clear-favs">' + icon('trash') + 'Limpar</button>' +
        (buyable.length ? '<button class="btn btn-primary btn-sm" type="button" id="all-to-cart">' + icon('bag') + 'Adicionar favoritos ao carrinho</button>' : '') + '</div></div>' +
        '<div class="grid-products">' + list.map(card).join('') + '</div>';
      const all = $('#all-to-cart');
      if (all) all.addEventListener('click', () => {
        let n = 0;
        buyable.forEach((p) => { if (!TD.cart.qtyOf(p.id) && TD.cart.add(p.id, 1).ok) n++; });
        if (n) { bump('[data-cart-count]'); toast(n + ' produto(s) adicionado(s) ao carrinho', { action: 'Ver carrinho', onAction: () => openDrawer('cart') }); } else toast('Os favoritos disponíveis já estão no carrinho', { type: 'info' });
      });
      $('#clear-favs').addEventListener('click', () => TD.confirm('Limpar favoritos?', 'Todos os produtos serão removidos da sua lista.', 'Limpar', () => TD.favs.clear(), true));
      $('#share-favs').addEventListener('click', async () => {
        const url = absUrl('favoritos.html?ids=' + list.map((p) => p.id).join(','));
        try { await navigator.clipboard.writeText(url); toast('Link da lista copiado', { sub: 'Quem abrir verá os mesmos produtos.' }); } catch (e) { openModal({ title: 'Link da lista', body: '<input class="input" readonly value="' + esc(url) + '" onfocus="this.select()">' }); }
      });
    }
    window.addEventListener('td:favs', (e) => { if (!shared) render(); });
    render();
  }

  /* =========================================================
     MINHA CONTA (demonstrativa)
     ========================================================= */
  function pageAccount() {
    const root = $('#account-root');
    const TABS = [['inicio', 'Visão geral', 'home'], ['pedidos', 'Meus pedidos', 'receipt'], ['perfil', 'Dados pessoais', 'user'], ['enderecos', 'Endereços', 'pin'], ['favoritos', 'Favoritos', 'heart']];
    function render() {
      const acc = TD.account.get();
      if (!acc.loggedIn) return renderAuth();
      let tab = (location.hash || '#inicio').slice(1);
      if (!TABS.some((t) => t[0] === tab)) tab = 'inicio';
      const p = acc.profile;
      const initials = (p.name || 'C').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
      root.innerHTML = '<div class="account"><nav class="panel acc-nav" aria-label="Minha conta"><div class="acc-user"><span class="avatar">' + esc(initials) + '</span><div><strong>' + esc(p.name || 'Cliente') + '</strong><div style="font-size:12.5px;color:var(--muted)">' + esc(p.email || '') + '</div></div></div>' +
        TABS.map((t) => '<button type="button" class="' + (t[0] === tab ? 'active' : '') + '" data-acc="' + t[0] + '">' + icon(t[2]) + t[1] + '</button>').join('') +
        '<button type="button" data-logout>' + icon('logout') + 'Sair</button></nav><div id="acc-panel"></div></div>';
      const panel = $('#acc-panel', root);
      ({ inicio: tabHome, pedidos: tabOrders, perfil: tabProfile, enderecos: tabAddresses, favoritos: tabFavs })[tab](panel, acc);
    }
    function orderCard(o, compact) {
      const order = ['novo', 'pago', 'separacao', 'enviado', 'entregue'];
      const idx = order.indexOf(o.status);
      return '<div class="order-card"><div class="oc-head"><div><span>Pedido</span><strong>' + esc(o.id) + '</strong></div><div><span>Data</span><strong>' + new Date(o.date).toLocaleDateString('pt-BR') + '</strong></div><div><span>Total</span><strong>' + fmt(o.total) + '</strong></div>' +
        '<div><span class="status st-' + o.status + '">' + esc(TD.statusLabel(o.status)) + '</span></div></div>' +
        '<div class="oc-items">' + o.items.slice(0, 6).map((i) => '<img src="' + esc(i.img) + '" alt="' + esc(i.name) + '" title="' + esc(i.name) + '">').join('') +
        '<span style="font-size:13px;color:var(--muted);margin-left:6px">' + o.items.reduce((s, i) => s + i.qty, 0) + ' item(ns) · ' + esc(o.delivery.name) + ' · ' + esc(o.payment) + '</span>' +
        (compact ? '' : '<span style="margin-left:auto;display:flex;gap:8px"><button class="btn btn-outline btn-sm" type="button" data-order="' + esc(o.id) + '">Detalhes</button><button class="btn btn-primary btn-sm" type="button" data-rebuy="' + esc(o.id) + '">Comprar novamente</button></span>') + '</div>' +
        (o.status !== 'cancelado' ? '<div class="timeline">' + ['Recebido', 'Pago', 'Separação', 'Enviado', 'Entregue'].map((l, i) => '<div class="' + (i <= idx ? 'done' : '') + '">' + l + '</div>').join('') + '</div>' : '') + '</div>';
    }
    function tabHome(panel, acc) {
      const orders = TD.orders.list();
      panel.innerHTML = '<div class="panel"><div class="panel-body"><h2 style="font-family:var(--font-display);margin:0 0 4px;color:var(--navy-900)">Olá, ' + esc((acc.profile.name || 'cliente').split(' ')[0]) + '!</h2><p style="margin:0;color:var(--muted)">Acompanhe pedidos, dados e endereços em um só lugar.</p>' +
        '<div class="kpis" style="margin:18px 0 0;grid-template-columns:repeat(3,1fr)">' +
        '<a class="kpi" href="#pedidos"><span class="k-top">Pedidos<span class="k-ic">' + icon('receipt') + '</span></span><span class="k-val">' + orders.length + '</span></a>' +
        '<a class="kpi" href="#favoritos"><span class="k-top">Favoritos<span class="k-ic">' + icon('heart') + '</span></span><span class="k-val">' + TD.favs.ids().length + '</span></a>' +
        '<a class="kpi" href="#enderecos"><span class="k-top">Endereços<span class="k-ic">' + icon('pin') + '</span></span><span class="k-val">' + acc.addresses.length + '</span></a></div></div></div>' +
        '<div class="panel" style="margin-top:18px"><div class="panel-head"><h3>Último pedido</h3>' + (orders.length ? '<a class="link-more" href="#pedidos">Ver todos</a>' : '') + '</div><div class="panel-body">' +
        (orders.length ? orderCard(orders[0], true) : emptyState('receipt', 'Nenhum pedido ainda', 'Faça um pedido de demonstração para ver o acompanhamento aqui.', '<a class="btn btn-primary" href="catalogo.html">Ir às compras</a>')) + '</div></div>';
    }
    function tabOrders(panel) {
      const orders = TD.orders.list();
      panel.innerHTML = '<div class="panel"><div class="panel-head"><h2>Meus pedidos</h2><span class="tag tag-warn">Demonstração</span></div><div class="panel-body">' +
        (orders.length ? orders.map((o) => orderCard(o)).join('') : emptyState('receipt', 'Você ainda não fez pedidos', 'Os pedidos feitos no checkout demonstrativo aparecem aqui, com o status atualizado pelo painel.', '<a class="btn btn-primary" href="catalogo.html">Começar a comprar</a>')) + '</div></div>';
    }
    function tabProfile(panel, acc) {
      const p = acc.profile;
      panel.innerHTML = '<div class="panel"><div class="panel-head"><h2>Dados pessoais</h2></div><div class="panel-body"><form id="profile-form" novalidate><div class="form-grid">' +
        field({ id: 'p-name', label: 'Nome completo', validate: 'required name', err: 'Informe nome e sobrenome.', value: p.name }) +
        field({ id: 'p-email', label: 'E-mail', type: 'email', size: 'half', validate: 'email', err: 'E-mail inválido.', value: p.email }) +
        field({ id: 'p-phone', label: 'Celular', size: 'half', mask: 'phone', validate: 'phone', err: 'Telefone inválido.', value: p.phone }) +
        field({ id: 'p-cpf', label: 'CPF', size: 'half', mask: 'cpf', validate: 'cpf', err: 'CPF inválido.', value: p.cpf }) +
        field({ id: 'p-birth', label: 'Data de nascimento', size: 'half', type: 'date', optional: true, value: p.birth }) +
        '</div><label class="check" style="margin-top:14px"><input type="checkbox" id="p-news"' + (p.news ? ' checked' : '') + '>Quero receber ofertas por e-mail e WhatsApp</label>' +
        '<div class="checkout-actions"><button class="btn btn-outline" type="button" id="pw-btn">' + icon('lock') + 'Alterar senha</button><button class="btn btn-primary" type="submit">Salvar alterações</button></div></form></div></div>';
      const f = $('#profile-form', panel);
      bindMasks(f); liveValidate(f);
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!validate(f)) return;
        const a = TD.account.get();
        a.profile = Object.assign({}, a.profile, { name: $('#p-name').value, email: $('#p-email').value, phone: $('#p-phone').value, cpf: $('#p-cpf').value, birth: $('#p-birth').value, news: $('#p-news').checked });
        TD.account.save(a);
        toast('Dados atualizados');
        render();
      });
      $('#pw-btn', panel).addEventListener('click', () => openModal({
        title: 'Alterar senha',
        body: '<form class="form-grid" id="pw-form" novalidate>' + field({ id: 'pw1', label: 'Senha atual', type: 'password', validate: 'required', err: 'Obrigatório.' }) + field({ id: 'pw2', label: 'Nova senha', type: 'password', validate: 'password', err: 'Mínimo de 6 caracteres.' }) + '</form>',
        foot: '<button class="btn btn-outline btn-sm" data-close>Cancelar</button><button class="btn btn-primary btn-sm" data-ok>Salvar</button>',
        onOpen: (el, close) => $('[data-ok]', el).addEventListener('click', () => { if (validate($('#pw-form', el))) { close(); toast('Senha alterada (simulação)'); } })
      }));
    }
    function addressModal(addr) {
      addr = addr || {};
      openModal({
        title: addr.id ? 'Editar endereço' : 'Novo endereço',
        body: '<form class="form-grid" id="addr-form" novalidate>' +
          field({ id: 'a-label', label: 'Identificação', size: 'half', value: addr.label || 'Casa', validate: 'required', err: 'Obrigatório.' }) +
          field({ id: 'a-cep', label: 'CEP', size: 'half', mask: 'cep', validate: 'cep', err: 'CEP inválido.', value: addr.cep }) +
          field({ id: 'a-street', label: 'Endereço', size: 'two-thirds', validate: 'required', err: 'Obrigatório.', value: addr.street }) +
          field({ id: 'a-number', label: 'Número', size: 'third', validate: 'required', err: 'Obrigatório.', value: addr.number }) +
          field({ id: 'a-comp', label: 'Complemento', size: 'half', optional: true, value: addr.comp }) +
          field({ id: 'a-district', label: 'Bairro', size: 'half', validate: 'required', err: 'Obrigatório.', value: addr.district }) +
          field({ id: 'a-city', label: 'Cidade', size: 'two-thirds', validate: 'required', err: 'Obrigatório.', value: addr.city }) +
          field({ id: 'a-uf', label: 'UF', size: 'third', type: 'select', options: ufOptions(addr.uf), validate: 'required', err: 'Selecione.' }) + '</form>',
        foot: '<button class="btn btn-outline btn-sm" data-close>Cancelar</button><button class="btn btn-primary btn-sm" data-ok>Salvar endereço</button>',
        onOpen: (el, close) => {
          const f = $('#addr-form', el);
          bindMasks(f); liveValidate(f);
          $('#a-cep', el).addEventListener('input', async (e) => {
            if (onlyDigits(e.target.value).length !== 8) return;
            const info = await lookupCEP(e.target.value);
            if (info) { $('#a-street', el).value = info.logradouro || ''; $('#a-district', el).value = info.bairro || ''; $('#a-city', el).value = info.localidade || ''; $('#a-uf', el).value = info.uf || ''; $('#a-number', el).focus(); }
          });
          $('[data-ok]', el).addEventListener('click', () => {
            if (!validate(f)) return;
            const a = TD.account.get();
            const rec = { id: addr.id || Date.now(), label: $('#a-label', el).value, cep: $('#a-cep', el).value, street: $('#a-street', el).value, number: $('#a-number', el).value, comp: $('#a-comp', el).value, district: $('#a-district', el).value, city: $('#a-city', el).value, uf: $('#a-uf', el).value };
            const i = a.addresses.findIndex((x) => x.id === rec.id);
            if (i > -1) { rec.default = a.addresses[i].default; a.addresses[i] = rec; } else { rec.default = !a.addresses.length; a.addresses.push(rec); }
            TD.account.save(a);
            close();
            toast('Endereço salvo');
            render();
          });
        }
      });
    }
    function tabAddresses(panel, acc) {
      panel.innerHTML = '<div class="panel"><div class="panel-head"><h2>Endereços</h2></div><div class="panel-body"><div class="addr-grid">' +
        acc.addresses.map((a) => '<div class="addr-card' + (a.default ? ' default' : '') + '"><strong>' + esc(a.label) + '</strong> ' + (a.default ? '<span class="tag tag-dark">Principal</span>' : '') +
          '<div style="color:var(--ink-2);margin-top:6px">' + esc(a.street) + ', ' + esc(a.number) + (a.comp ? ' – ' + esc(a.comp) : '') + '<br>' + esc(a.district) + ' – ' + esc(a.city) + '/' + esc(a.uf) + '<br>CEP ' + esc(a.cep) + '</div>' +
          '<div class="addr-actions"><button class="link-btn" type="button" data-edit-addr="' + a.id + '">' + icon('edit') + 'Editar</button>' + (a.default ? '' : '<button class="link-btn" type="button" data-default-addr="' + a.id + '">' + icon('star') + 'Tornar principal</button>') + '<button class="link-btn" type="button" data-del-addr="' + a.id + '">' + icon('trash') + 'Excluir</button></div></div>').join('') +
        '<button class="addr-new" type="button" data-new-addr><span>' + icon('plus') + '<br>Adicionar endereço</span></button></div></div></div>';
    }
    function tabFavs(panel) {
      const list = TD.favs.ids().map(TD.product);
      panel.innerHTML = '<div class="panel"><div class="panel-head"><h2>Favoritos</h2><a class="link-more" href="favoritos.html">Abrir lista completa</a></div><div class="panel-body">' +
        (list.length ? '<div class="grid-products">' + list.map(card).join('') + '</div>' : emptyState('heart', 'Nenhum favorito', 'Salve produtos tocando no coração.', '<a class="btn btn-primary" href="catalogo.html">Explorar</a>')) + '</div></div>';
    }
    function renderAuth() {
      let mode = 'login';
      const draw = () => {
        root.innerHTML = '<div class="auth"><div class="auth-side"><h2>Sua conta TecnoDreams</h2><ul><li>Acompanhe seus pedidos</li><li>Salve endereços para comprar mais rápido</li><li>Guarde seus favoritos</li></ul></div><div class="auth-form">' +
          '<div class="seg" role="tablist"><button type="button" class="' + (mode === 'login' ? 'active' : '') + '" data-mode="login">Entrar</button><button type="button" class="' + (mode === 'signup' ? 'active' : '') + '" data-mode="signup">Criar conta</button></div>' +
          '<form id="auth-form" class="form-grid" novalidate>' +
          (mode === 'signup' ? field({ id: 'u-name', label: 'Nome completo', validate: 'required name', err: 'Informe nome e sobrenome.', auto: 'name' }) : '') +
          field({ id: 'u-email', label: 'E-mail', type: 'email', validate: 'email', err: 'E-mail inválido.', auto: 'email' }) +
          field({ id: 'u-pass', label: 'Senha', type: 'password', validate: 'password', err: 'Mínimo de 6 caracteres.', auto: mode === 'login' ? 'current-password' : 'new-password' }) +
          '<div class="field"><button class="btn btn-primary btn-block" type="submit">' + (mode === 'login' ? 'Entrar' : 'Criar minha conta') + '</button></div></form>' +
          '<div style="display:flex;align-items:center;gap:10px;margin:18px 0;color:var(--muted);font-size:13px"><span style="flex:1;height:1px;background:var(--line)"></span>ou<span style="flex:1;height:1px;background:var(--line)"></span></div>' +
          '<button class="btn btn-outline btn-block" type="button" id="demo-login">' + icon('user') + 'Entrar com a conta de demonstração</button>' +
          '<p class="note" style="margin-top:16px">' + icon('info') + '<span>Autenticação simulada: qualquer e-mail e senha com 6+ caracteres funcionam. No sistema final, login seguro com senha criptografada e recuperação por e-mail.</span></p></div></div>';
        const f = $('#auth-form', root);
        liveValidate(f);
        $$('[data-mode]', root).forEach((b) => b.addEventListener('click', () => { mode = b.dataset.mode; draw(); }));
        f.addEventListener('submit', (e) => {
          e.preventDefault();
          if (!validate(f)) return;
          const email = $('#u-email').value.trim();
          const btn = $('button[type=submit]', f);
          btn.classList.add('loading');
          setTimeout(() => {
            const prev = TD.account.get().profile;
            const name = mode === 'signup' ? $('#u-name').value.trim() : (prev.email === email && prev.name) || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            TD.account.login({ name, email });
            afterLogin(mode === 'signup' ? 'Conta criada!' : 'Bem-vindo de volta!');
          }, 600);
        });
        $('#demo-login', root).addEventListener('click', () => {
          const a = TD.account.get();
          if (!a.addresses.length) a.addresses = [{ id: 1, label: 'Casa', cep: '01123-001', street: 'Rua Três Rios', number: '100', comp: 'Apto 12 (exemplo)', district: 'Bom Retiro', city: 'São Paulo', uf: 'SP', default: true }];
          a.loggedIn = true;
          a.profile = Object.assign({ name: 'Cliente Demonstração', email: 'cliente.demo@exemplo.com', phone: '(11) 90000-0000', cpf: '529.982.247-25' }, a.profile && a.profile.email ? a.profile : {});
          TD.account.save(a);
          afterLogin('Conta de demonstração conectada');
        });
      };
      draw();
    }
    function afterLogin(msg) {
      toast(msg);
      if (params.get('next') === 'checkout') { location.href = 'checkout.html'; return; }
      location.hash = '#inicio';
      render();
      // atualiza o rótulo do cabeçalho
      const a = TD.account.get();
      $$('.h-btn.hide-sm .h-label').forEach((l) => { l.innerHTML = '<small>Olá, ' + esc(a.profile.name.split(' ')[0]) + '</small>Minha conta'; });
    }
    root.addEventListener('click', (e) => {
      const t = e.target;
      const tab = t.closest('[data-acc]');
      if (tab) { location.hash = '#' + tab.dataset.acc; return; }
      if (t.closest('[data-logout]')) { TD.account.logout(); toast('Você saiu da conta', { type: 'info' }); location.hash = ''; render(); return; }
      if (t.closest('[data-new-addr]')) { addressModal(); return; }
      const ed = t.closest('[data-edit-addr]');
      if (ed) { addressModal(TD.account.get().addresses.find((a) => a.id === +ed.dataset.editAddr)); return; }
      const df = t.closest('[data-default-addr]');
      if (df) { const a = TD.account.get(); a.addresses.forEach((x) => { x.default = x.id === +df.dataset.defaultAddr; }); TD.account.save(a); render(); toast('Endereço principal atualizado'); return; }
      const dl = t.closest('[data-del-addr]');
      if (dl) { TD.confirm('Excluir endereço?', 'Esta ação não pode ser desfeita.', 'Excluir', () => { const a = TD.account.get(); a.addresses = a.addresses.filter((x) => x.id !== +dl.dataset.delAddr); if (a.addresses.length && !a.addresses.some((x) => x.default)) a.addresses[0].default = true; TD.account.save(a); render(); }, true); return; }
      const rb = t.closest('[data-rebuy]');
      if (rb) {
        const o = TD.orders.list().find((x) => x.id === rb.dataset.rebuy);
        let n = 0;
        o.items.forEach((i) => { if (TD.cart.add(i.id, i.qty).ok) n++; });
        if (n) { toast(n + ' produto(s) de volta ao carrinho', { action: 'Ver carrinho', onAction: () => openDrawer('cart') }); bump('[data-cart-count]'); } else toast('Os itens deste pedido não estão disponíveis no momento', { type: 'error' });
        return;
      }
      const od = t.closest('[data-order]');
      if (od) {
        const o = TD.orders.list().find((x) => x.id === od.dataset.order);
        openModal({
          title: 'Pedido ' + o.id, wide: true,
          body: '<div class="demo-warning" style="margin:0 0 14px">Pedido de demonstração – sem cobrança real.</div>' +
            o.items.map((i) => '<div class="sum-item" style="margin-bottom:10px"><div class="si-img"><img src="' + esc(i.img) + '" alt=""><span>' + i.qty + '</span></div><div class="si-name">' + esc(i.name) + '</div><strong>' + fmt(i.price * i.qty) + '</strong></div>').join('') +
            '<div class="sum-row"><span>Subtotal</span><span>' + fmt(o.subtotal) + '</span></div>' + (o.discount ? '<div class="sum-row discount"><span>Cupom ' + esc(o.coupon) + '</span><span>−' + fmt(o.discount) + '</span></div>' : '') +
            '<div class="sum-row"><span>' + esc(o.delivery.name) + '</span><span>' + (o.shipping ? fmt(o.shipping) : 'Grátis') + '</span></div><div class="sum-row total"><span>Total</span><span>' + fmt(o.total) + '</span></div>' +
            '<p style="font-size:14px;color:var(--ink-2)"><strong>Entrega:</strong> ' + (o.address ? esc(o.address.street + ', ' + o.address.number + ' – ' + o.address.district + ', ' + o.address.city + '/' + o.address.uf + ' · CEP ' + o.address.cep) : 'Retirada no escritório – ' + esc(TD.settings().address)) + '<br><strong>Pagamento:</strong> ' + esc(o.payment) + '<br><strong>Status:</strong> ' + esc(TD.statusLabel(o.status)) + '</p>',
          foot: '<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="' + waLink('Olá, TecnoDreams! Tenho uma dúvida sobre o pedido ' + o.id + '.') + '">' + icon('wa', 'fill') + 'Ajuda com este pedido</a><button class="btn btn-primary btn-sm" data-close>Fechar</button>'
        });
      }
    });
    window.addEventListener('hashchange', render);
    window.addEventListener('td:favs', () => { if ((location.hash || '').indexOf('favoritos') > -1) render(); });
    render();
  }

  /* ---------------- inicialização ---------------- */
  const PAGES = { home: pageHome, catalog: pageCatalog, category: pageCategory, product: pageProduct, cart: pageCart, checkout: pageCheckout, favs: pageFavs, account: pageAccount };
  function init() {
    injectSprite();
    mountLayout();
    const page = document.body.dataset.page;
    if (PAGES[page]) PAGES[page]();
    reveal();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
