/* Utilidades de interfaz compartidas: escape, formato, modales y notificaciones. */
(function (root) {
  const TOR = (root.TOR = root.TOR || {});

  const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const fmt = {
    money: (v) => TOR.pricing.fmtMoney(v, 'Bs'),
    num: (v, dec = 0) => Number(v || 0).toLocaleString('es-BO', { minimumFractionDigits: dec, maximumFractionDigits: dec }),
    qty: (v) => Number(v || 0).toLocaleString('es-BO', { maximumFractionDigits: 2 }),
    date: (iso) => { if (!iso) return '—'; const d = new Date(String(iso).length <= 10 ? iso + 'T12:00:00' : iso); return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]} ${d.getFullYear()}`; },
    dateTime: (iso) => { const d = new Date(iso); return `${fmt.date(iso)} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; },
    month: (key) => { const [y, m] = key.split('-').map(Number); return `${MESES[m - 1]} ${String(y).slice(2)}`; },
    pct: (v) => `${(v * 100).toFixed(1).replace('.', ',')} %`
  };

  /** Abre un modal. opts: { title, sub, body (html), foot (html), size, onOpen(el) }. Devuelve { el, close }. */
  function modal(opts) {
    const bd = document.createElement('div');
    bd.className = 'modal-backdrop';
    bd.innerHTML = `<div class="modal ${opts.size || ''}" role="dialog" aria-modal="true" aria-labelledby="mdl-t">
      <div class="modal-head"><div style="flex:1;min-width:0"><h3 id="mdl-t">${esc(opts.title)}</h3>${opts.sub ? `<p>${opts.sub}</p>` : ''}</div>
        <button class="btn btn-ghost btn-icon btn-sm" data-close aria-label="Cerrar">${TOR.icon('x')}</button></div>
      <div class="modal-body">${opts.body || ''}</div>
      ${opts.foot ? `<div class="modal-foot">${opts.foot}</div>` : ''}</div>`;
    const prev = document.activeElement;
    const close = () => { bd.remove(); document.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); if (opts.onClose) opts.onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    bd.addEventListener('mousedown', (e) => { if (e.target === bd) close(); });
    bd.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
    document.addEventListener('keydown', onKey);
    document.body.appendChild(bd);
    const first = bd.querySelector('.modal-body input, .modal-body select, .modal-body textarea');
    (first || bd.querySelector('[data-close]')).focus();
    if (opts.onOpen) opts.onOpen(bd.querySelector('.modal'), close);
    return { el: bd.querySelector('.modal'), close };
  }

  function toast(title, { text = '', type = 'good', ms = 3400 } = {}) {
    let box = document.querySelector('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `${TOR.icon(type === 'good' ? 'checkCircle' : type === 'critical' ? 'alert' : 'info')}<div><strong>${esc(title)}</strong>${text ? `<small>${esc(text)}</small>` : ''}</div>`;
    box.appendChild(t);
    setTimeout(() => { t.classList.add('leaving'); setTimeout(() => t.remove(), 260); }, ms);
  }

  /**
   * Valida un formulario. rules: { nombre: { required, min, number, positive, email, label } }.
   * Marca los campos inválidos y devuelve { ok, data }.
   */
  function validateForm(form, rules) {
    const data = Object.fromEntries(new FormData(form).entries());
    let ok = true;
    form.querySelectorAll('.field-error').forEach((e) => e.remove());
    form.querySelectorAll('.invalid').forEach((e) => e.classList.remove('invalid'));
    Object.entries(rules).forEach(([name, r]) => {
      const el = form.elements[name];
      if (!el) return;
      const v = String(data[name] === undefined ? '' : data[name]).trim();
      let msg = '';
      if (r.required && !v) msg = 'Campo obligatorio.';
      else if (v && r.number && !Number.isFinite(Number(v))) msg = 'Ingrese un número válido.';
      else if (v && r.positive && !(Number(v) > 0)) msg = 'Debe ser mayor a cero.';
      else if (v && r.nonNegative && Number(v) < 0) msg = 'No puede ser negativo.';
      else if (v && r.max !== undefined && Number(v) > r.max) msg = r.maxMsg || `No puede superar ${r.max}.`;
      else if (v && r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) msg = 'Correo no válido.';
      else if (v && r.minLen && v.length < r.minLen) msg = `Mínimo ${r.minLen} caracteres.`;
      if (msg) {
        ok = false;
        el.classList.add('invalid');
        const e = document.createElement('span');
        e.className = 'field-error';
        e.textContent = msg;
        (el.closest('.field') || el.parentElement).appendChild(e);
      }
    });
    const firstBad = form.querySelector('.invalid');
    if (firstBad) firstBad.focus();
    return { ok, data };
  }

  function download(name, content, type = 'text/plain') {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  TOR.ui = { esc, fmt, modal, toast, validateForm, download };
})(window);
