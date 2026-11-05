/*
 * Utilidades de interfaz compartidas: formato, modales, avisos, fotos y marca.
 */
(function (root) {
  const MF = (root.MF = root.MF || {});
  const CFG = root.MF_CONFIG;

  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function num(n, dec) {
    const neg = n < 0;
    const fixed = Math.abs(n).toFixed(dec || 0);
    const [int, frac] = fixed.split('.');
    return (neg ? '-' : '') + int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (frac ? ',' + frac : '');
  }
  const money = (n) => 'Bs ' + num(Math.round(n || 0));
  const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const pad = (n) => String(n).padStart(2, '0');
  function fdate(iso, withTime) {
    const d = new Date(iso);
    const s = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    return withTime ? `${s}, ${pad(d.getHours())}:${pad(d.getMinutes())}` : s;
  }
  const ftime = (iso) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  function frel(iso) {
    const diff = (Date.now() - new Date(iso).getTime()) / 60000;
    if (diff < 1) return 'ahora';
    if (diff < 60) return `hace ${Math.round(diff)} min`;
    if (diff < 1440) return `hace ${Math.round(diff / 60)} h`;
    const days = Math.round(diff / 1440);
    return days === 1 ? 'ayer' : `hace ${days} días`;
  }
  const sameDay = (a, b) => { const x = new Date(a), y = new Date(b); return x.toDateString() === y.toDateString(); };

  // ---------- Avisos ----------
  function toast(msg, type) {
    let box = $('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast ' + (type || 'ok');
    t.innerHTML = MF.icon(type === 'error' ? 'alert' : type === 'info' ? 'info' : 'checkCircle') + `<span>${esc(msg)}</span>`;
    box.appendChild(t);
    setTimeout(() => t.classList.add('out'), 3200);
    setTimeout(() => t.remove(), 3600);
  }

  // ---------- Modales ----------
  function modal(opts) {
    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    wrap.innerHTML = `<div class="modal ${opts.size || ''}" role="dialog" aria-modal="true" aria-label="${esc(opts.title || '')}">
      <header class="modal-head"><h3>${opts.title || ''}</h3><button class="icon-btn" data-close aria-label="Cerrar">${MF.icon('x')}</button></header>
      <div class="modal-body">${opts.body || ''}</div>
      ${opts.footer ? `<footer class="modal-foot">${opts.footer}</footer>` : ''}</div>`;
    document.body.appendChild(wrap);
    document.body.classList.add('no-scroll');
    requestAnimationFrame(() => wrap.classList.add('open'));
    const close = () => {
      wrap.classList.remove('open');
      setTimeout(() => { wrap.remove(); if (!$('.modal-wrap')) document.body.classList.remove('no-scroll'); }, 180);
      document.removeEventListener('keydown', onKey);
      if (opts.onClose) opts.onClose();
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('[data-close]')) close(); });
    const api = { el: wrap.querySelector('.modal'), close };
    if (opts.onOpen) opts.onOpen(api);
    const first = wrap.querySelector('input:not([type=hidden]):not([type=file]),select,textarea');
    if (first && !opts.noFocus) setTimeout(() => first.focus(), 60);
    return api;
  }
  function confirmDialog(msg, okLabel, danger) {
    return new Promise((resolve) => {
      let done = false;
      const m = modal({
        title: 'Confirmar', size: 'sm', body: `<p>${msg}</p>`, noFocus: true,
        footer: `<button class="btn ghost" data-close>Cancelar</button><button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${okLabel || 'Aceptar'}</button>`,
        onClose: () => { if (!done) resolve(false); }
      });
      m.el.querySelector('[data-ok]').addEventListener('click', () => { done = true; resolve(true); m.close(); });
    });
  }

  // ---------- Fotos ----------
  const SHAPES = {
    top: '<path d="M38 18 L28 22 L14 34 L22 48 L30 43 L30 100 L70 100 L70 43 L78 48 L86 34 L72 22 L62 18 Q50 30 38 18Z"/>',
    dress: '<path d="M40 14 L38 30 Q36 38 40 44 L22 104 L78 104 L60 44 Q64 38 62 30 L60 14 Q50 22 40 14Z"/>',
    jacket: '<path d="M38 16 L24 22 L12 40 L12 96 L24 96 L26 50 L28 104 L48 104 L48 40 L42 18Z M62 16 L76 22 L88 40 L88 96 L76 96 L74 50 L72 104 L52 104 L52 40 L58 18Z"/>',
    set: '<path d="M38 10 L26 16 L18 30 L26 36 L32 32 L32 56 L68 56 L68 32 L74 36 L82 30 L74 16 L62 10 Q50 20 38 10Z"/><path d="M32 62 L68 62 L76 108 L24 108Z"/>'
  };
  const shapeFor = (cat) => ({ Vestidos: 'dress', Chaquetas: 'jacket', Cardigans: 'jacket', Conjuntos: 'set' }[cat] || 'top');
  function placeholderSvg(p) {
    const c = p.colorHex || '#ddd';
    const light = /^#(f|e|d)/i.test(c);
    return `<svg viewBox="0 0 100 120" class="ph-svg" role="img" aria-label="Sin foto: ${esc(p.name)}">
      <rect width="100" height="120" fill="${light ? '#efe9e4' : '#f6f1ee'}"/>
      <g fill="${c}" stroke="${light ? '#bfb3a8' : 'rgba(0,0,0,.15)'}" stroke-width="1.2" stroke-linejoin="round">${SHAPES[shapeFor(p.category)]}</g></svg>`;
  }
  /** Foto del producto o un dibujo genérico claramente marcado como "sin foto". */
  function photo(p, cls) {
    if (p.photo) return `<img class="${cls || ''}" src="${esc(p.photo)}" alt="${esc(p.name)}" loading="lazy">`;
    return `<div class="ph ${cls || ''}">${placeholderSvg(p)}<span class="ph-tag">Sin foto · demo</span></div>`;
  }

  /** Lee una imagen y la reduce para guardarla en localStorage. */
  function readImage(file, max, quality) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) return reject(new Error('Seleccione una imagen'));
      const fr = new FileReader();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          const k = Math.min(1, (max || 720) / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', quality || 0.8));
        };
        img.onerror = reject;
        img.src = fr.result;
      };
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  // ---------- Exportar (CSV que Excel abre directamente) ----------
  function downloadCSV(name, rows) {
    const csv = rows.map((r) => r.map((c) => {
      const s = String(c == null ? '' : c);
      return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  }

  // ---------- Marca ----------
  function applyBrand(scope) {
    const name = CFG.brand.name;
    $$('[data-brand]', scope).forEach((el) => { el.textContent = name; });
    $$('[data-store]', scope).forEach((el) => { el.textContent = CFG.store[el.dataset.store || 'name'] || CFG.store.name; });
    $$('[data-cfg]', scope).forEach((el) => {
      const v = el.dataset.cfg.split('.').reduce((o, k) => (o ? o[k] : undefined), CFG);
      if (v != null) el.textContent = v;
    });
    if (document.title.includes('{brand}')) document.title = document.title.replace(/\{brand\}/g, name);
    document.title = document.title.replace(/ModaFlow/g, name);
    MF.hydrateIcons(scope);
  }
  function brandLogo() {
    return `<span class="mf-logo" aria-hidden="true"><svg viewBox="0 0 32 32"><defs><linearGradient id="mfg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7C5CFF"/><stop offset="1" stop-color="#FF5C8A"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="url(#mfg)"/><path d="M9 22V11l7 7 7-7v11" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
  }

  // ---------- WhatsApp ----------
  function waLink(number, text) {
    const n = String(number || '').replace(/\D/g, '');
    return (n ? `https://wa.me/${n}` : 'https://wa.me/') + '?text=' + encodeURIComponent(text);
  }

  // Navegación móvil compartida por las páginas públicas
  function initNav() {
    const btn = $('.nav-toggle');
    const nav = $('.site-nav');
    if (btn && nav) btn.addEventListener('click', () => { const open = nav.classList.toggle('open'); btn.setAttribute('aria-expanded', open); });
    $$('.site-nav a').forEach((a) => a.addEventListener('click', () => nav && nav.classList.remove('open')));
    const header = $('.site-header');
    if (header) {
      const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
      onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
    }
    // Aparición suave al hacer scroll
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
      $$('.reveal').forEach((el) => io.observe(el));
    } else $$('.reveal').forEach((el) => el.classList.add('in'));
  }

  /** QR ficticio para la demostración: dibujo con marcas de posición y la palabra DEMO. No codifica datos de pago. */
  function demoQR() {
    let seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const N = 25;
    let cells = '';
    const finder = (x, y) => (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (finder(x, y) || (x > 8 && x < 16 && y > 9 && y < 15)) continue;
      if (rnd() > 0.52) cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    }
    const fp = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7" fill="#111"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="#111"/>`;
    return `<svg viewBox="-2 -2 29 29" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="QR de demostración"><rect x="-2" y="-2" width="29" height="29" fill="#fff"/><g fill="#111">${cells}</g>${fp(0, 0)}${fp(N - 7, 0)}${fp(0, N - 7)}
      <rect x="8.6" y="9.6" width="7.8" height="5.8" rx="1" fill="#E8457E"/><text x="12.5" y="13.4" font-size="2.6" font-weight="800" text-anchor="middle" fill="#fff" font-family="sans-serif">DEMO</text></svg>`;
  }

  Object.assign(MF, { demoQR, $, $$, esc, num, money, fdate, ftime, frel, sameDay, toast, modal, confirmDialog, photo, placeholderSvg, readImage, downloadCSV, applyBrand, brandLogo, waLink, initNav });
})(window);
