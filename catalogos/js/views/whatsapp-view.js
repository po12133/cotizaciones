/*
 * Configuración de WhatsApp por catálogo: números, mensajes con variables,
 * botón de contacto y botón flotante. Genera enlaces reales wa.me.
 */
(function () {
  'use strict';
  const CA = window.CA, D = CA.dash;
  const u = CA.util, ui = CA.ui, esc = u.esc, I = ui.icon;
  const $ = ui.$, $$ = ui.$$;
  let draft = null;

  D.view('whatsapp', { title: 'WhatsApp', icon: 'whatsapp', sub: 'Cómo te contactan tus clientes', render });

  function render(el, params) {
    const ws = D.ws(), limits = D.limits();
    if (!ws.catalogs.length) { el.innerHTML = '<div class="view-in">' + D.emptyStep('whatsapp', 'Primero crea un catálogo', 'La configuración de WhatsApp se guarda en cada catálogo.', '#/catalogos', 'Ir a Catálogos') + '</div>'; return; }
    const id = ws.catalogs.some((c) => c.id === params.get('id')) ? params.get('id') : ws.catalogs[0].id;
    const c = CA.catalogs.get(D.db(), CA.session.userId(), id);
    if (!draft || draft.id !== id) draft = { id, w: u.clone(c.whatsapp) };
    const w = draft.w;
    const sample = (ws.products || []).find((p) => p.sync !== 'error' && p.offer) || (ws.products || []).find((p) => p.sync !== 'error');
    const max = limits.whatsappNumbers;
    el.innerHTML = '<div class="view-in">' +
      (ws.catalogs.length > 1 ? '<div class="chips" style="margin-bottom:14px">' + ws.catalogs.map((x) => '<a class="chip' + (x.id === id ? ' on' : '') + '" href="#/whatsapp?id=' + x.id + '">' + esc(x.name) + '</a>').join('') + '</div>' : '') +
      '<div class="wa-grid"><div>' +
      '<div class="card"><div class="card-head"><h3>' + I('phone') + 'Números de WhatsApp</h3><span class="pill">' + w.numbers.length + ' de ' + max + '</span></div>' +
      '<p class="card-sub">Incluye el código de país (Bolivia: 591). ' + (max > 1 ? 'Con varios números, el visitante elige con quién hablar.' : 'Varios números está disponible en el plan Empresa.') + '</p>' +
      '<div id="waNums">' + w.numbers.map((n, i) => '<div class="wa-num"><input data-nn="' + i + '" value="' + esc(n.name) + '" placeholder="Nombre del vendedor" maxlength="30"><div class="input-affix"><span>+</span><input data-nv="' + i + '" value="' + esc(n.number) + '" placeholder="59171234567" inputmode="tel"></div>' +
        (w.numbers.length > 1 ? '<button class="icon-btn" data-nrm="' + i + '" title="Quitar">' + I('trash2') + '</button>' : '') + '<small class="err" data-nerr="' + i + '"></small></div>').join('') + '</div>' +
      '<button class="btn btn-sm btn-soft" id="waAdd"' + (w.numbers.length >= max ? ' disabled' : '') + '>' + I('plus') + 'Agregar número</button>' + (w.numbers.length >= max && max === 1 ? ' <a href="#/suscripcion?plan=business" class="link-btn" style="font-size:.84rem;margin-left:8px">Plan Empresa</a>' : '') + '</div>' +
      '<div class="card" style="margin-top:16px"><div class="card-head"><h3>' + I('chat') + 'Mensajes</h3></div>' +
      '<div class="field"><label>Mensaje para un producto</label><textarea id="waMsg" rows="3" maxlength="400">' + esc(w.message) + '</textarea><div class="var-chips">' + CA.wa.VARIABLES.map((v) => '<button type="button" class="chip" data-var="' + v + '" data-target="waMsg">' + v + '</button>').join('') + '</div></div>' +
      '<div class="field" style="margin-top:14px"><label>Introducción de la lista de consulta (varios productos)</label><textarea id="waList" rows="2" maxlength="200">' + esc(w.listMessage) + '</textarea><div class="var-chips">' + ['{catalogo}', '{url}'].map((v) => '<button type="button" class="chip" data-var="' + v + '" data-target="waList">' + v + '</button>').join('') + '</div></div>' +
      '<div class="alert alert-brand" style="margin-top:12px">' + I('info') + '<p>No hay carrito ni pagos en línea: el visitante te envía un mensaje y coordinan la venta por WhatsApp.</p></div></div>' +
      '<div class="card" style="margin-top:16px"><div class="card-head"><h3>' + I('settings') + 'Botones</h3></div><div class="form-grid">' +
      '<div class="field"><label>Texto del botón de contacto</label><input id="waBtn" value="' + esc(w.buttonText) + '" maxlength="30"></div>' +
      '<div class="field"><label>Texto del botón flotante</label><input id="waFloatT" value="' + esc(w.floatingText) + '" maxlength="24" placeholder="Opcional"></div>' +
      '<label class="toggle-row"><span><b>Botón flotante de WhatsApp</b><small>Siempre visible en el catálogo</small></span><input type="checkbox" class="toggle" id="waFloat"' + (w.floating ? ' checked' : '') + '></label>' +
      '<div class="field field-wide"><label>Posición del botón flotante</label><div class="ed-seg" style="max-width:300px">' + [['left', 'Izquierda'], ['right', 'Derecha']].map((o) => '<button type="button" class="' + (w.position === o[0] ? 'on' : '') + '" data-pos="' + o[0] + '">' + o[1] + '</button>').join('') + '</div></div></div>' +
      '<div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap"><button class="btn btn-primary" id="waSave">' + I('check') + 'Guardar configuración</button><button class="btn btn-ghost" id="waReset">Descartar cambios</button></div></div>' +
      '</div><div class="wa-side"><div class="card wa-prev-card"><div class="card-head"><h3>' + I('eye') + 'Vista previa</h3></div><div id="waPrev"></div></div></div></div></div>';
    const prev = () => {
      const n = w.numbers.find((x) => CA.wa.normalize(x.number));
      const url = CA.catalogs.publicUrl(c);
      const text = sample ? CA.wa.fill(w.message, CA.wa.productVars(sample, c.name, url + '/p/' + sample.id, n ? n.name : '')) : '';
      const link = n && sample ? CA.wa.link(n.number, text) : '';
      $('#waPrev').innerHTML = (sample ? '<div class="wa-pcard"><img src="' + CA.imgSrc(sample.image) + '" alt="" ' + CA.imgFallbackAttr + '><div><small>' + esc(sample.category) + '</small><b>' + esc(sample.name) + '</b><span>' + u.money(sample.offer || sample.price) + '</span><div class="wa-btn">' + I('whatsapp') + esc(w.buttonText || 'Consultar') + '</div></div></div>' : '<p class="muted">Sincroniza productos para ver una vista previa con datos reales.</p>') +
        '<div class="wa-phone"><div class="wa-chat-h">' + I('user') + '<div><b>' + esc(n ? n.name || 'Ventas' : 'Sin número') + '</b><small>' + (n ? CA.wa.format(CA.wa.normalize(n.number)) : 'Configura un número') + '</small></div></div><div class="wa-chat"><div class="wa-bubble">' + esc(text || 'Escribe un mensaje…') + '</div></div>' +
        (w.floating ? '<div class="wa-float-prev ' + w.position + '">' + I('whatsapp') + (w.floatingText ? '<span>' + esc(w.floatingText) + '</span>' : '') + '</div>' : '') + '</div>' +
        (link ? '<div class="wa-link"><span class="mono">' + esc(link.slice(0, 78)) + '…</span><div style="display:flex;gap:6px;margin-top:8px"><a class="btn btn-wa btn-sm" href="' + link + '" target="_blank" rel="noopener">' + I('external') + 'Probar enlace real</a><button class="btn btn-ghost btn-sm" id="waCopy">' + I('copy') + 'Copiar</button></div></div>' : '<div class="alert alert-warn" style="margin-top:12px">' + I('alert') + '<p>Agrega un número válido para generar el enlace wa.me.</p></div>');
      const cp = $('#waCopy'); if (cp) cp.onclick = () => ui.copy(link);
    };
    prev();
    const bindNums = () => {
      $$('[data-nn]').forEach((i) => (i.oninput = () => { w.numbers[+i.dataset.nn].name = i.value; prev(); }));
      $$('[data-nv]').forEach((i) => (i.oninput = () => { w.numbers[+i.dataset.nv].number = i.value.replace(/[^\d]/g, ''); prev(); }));
      $$('[data-nrm]').forEach((b) => (b.onclick = () => { w.numbers.splice(+b.dataset.nrm, 1); render(el, params); }));
    };
    bindNums();
    $('#waAdd').onclick = () => { if (w.numbers.length < max) { w.numbers.push({ name: '', number: '' }); render(el, params); } };
    $('#waMsg').oninput = (e) => { w.message = e.target.value; prev(); };
    $('#waList').oninput = (e) => { w.listMessage = e.target.value; };
    $('#waBtn').oninput = (e) => { w.buttonText = e.target.value; prev(); };
    $('#waFloatT').oninput = (e) => { w.floatingText = e.target.value; prev(); };
    $('#waFloat').onchange = (e) => { w.floating = e.target.checked; prev(); };
    $$('[data-pos]').forEach((b) => (b.onclick = () => { w.position = b.dataset.pos; $$('[data-pos]').forEach((x) => x.classList.toggle('on', x === b)); prev(); }));
    $$('[data-var]').forEach((b) => (b.onclick = () => {
      const t = $('#' + b.dataset.target);
      const s = t.selectionStart || t.value.length;
      t.value = t.value.slice(0, s) + b.dataset.var + t.value.slice(t.selectionEnd || s);
      t.focus(); t.setSelectionRange(s + b.dataset.var.length, s + b.dataset.var.length);
      t.dispatchEvent(new Event('input'));
    }));
    $('#waReset').onclick = () => { draft = null; render(el, params); ui.toast('Cambios descartados', 'info'); };
    $('#waSave').onclick = () => {
      let bad = false;
      $$('[data-nerr]').forEach((e) => (e.textContent = ''));
      w.numbers.forEach((n, i) => { if (!CA.wa.normalize(n.number)) { bad = true; $('[data-nerr="' + i + '"]').textContent = 'Número no válido (incluye el código de país, 10 a 15 dígitos).'; } });
      if (bad) return ui.toast('Revisa los números de WhatsApp', 'error');
      if (!String(w.message).includes('{producto}')) return ui.toast('El mensaje debe incluir la variable {producto}.', 'error');
      if (!String(w.buttonText).trim()) return ui.toast('Escribe el texto del botón.', 'error');
      const clean = Object.assign(u.clone(w), { numbers: w.numbers.map((n) => ({ name: String(n.name || '').trim() || 'Ventas', number: CA.wa.normalize(n.number) })) });
      D.act((db, uid) => { const x = CA.catalogs.get(db, uid, id); x.whatsapp = clean; x.updatedAt = CA.now().toISOString(); }, 'WhatsApp actualizado: los botones del catálogo ya usan esta configuración');
      draft = null;
    };
  }
})();
