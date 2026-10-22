/*
 * Teléfono WhatsApp interactivo (SIMULADO). Dibuja los mensajes de una conversación,
 * permite responder botones, abrir listas, completar flujos (WhatsApp Flows), escribir y adjuntar.
 * Uso: new WAB.Phone(elemento, { quick: ['Hola', 'menú'], onPayload: (msg) => {} })
 */
(function (root) {
  const WAB = root.WAB;
  const { icon, ui, db } = WAB;
  const { esc, fmt } = ui;

  function rich(text) {
    return esc(text).replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/_([^_\n]+)_/g, '<i>$1</i>');
  }
  const time = (ts) => fmt.time(ts);

  class Phone {
    constructor(el, opts = {}) {
      this.el = el;
      this.opts = Object.assign({ quick: ['Hola', 'Menú', '¿Hacen envíos?', 'Quiero agendar', 'Hablar con un asesor'], autoStart: true, simulateAgent: true, flat: false, compact: false }, opts);
      this.bot = new WAB.bot.Bot(opts.convId);
      this.busy = false;
      this.render();
      this.renderAll();
      db.on('conversations', (v, source) => { if (source === 'external') this.renderAll(); });
      if (this.opts.autoStart && !this.bot.conv().mensajes.length) this.start();
    }

    render() {
      const biz = db.get('settings').negocio;
      this.el.classList.add('phone', 'wa');
      if (this.opts.flat) this.el.classList.add('flat');
      if (this.opts.compact) this.el.classList.add('compact');
      this.el.innerHTML = WAB.wa.frame({
        name: this.opts.name || biz.nombre, subtitle: 'Cuenta de empresa', interactive: true,
        headActions: `<button data-act="restart" title="Reiniciar chat" aria-label="Reiniciar chat">${icon('refresh', 'sm')}</button>`
      });
      const screen = this.el.querySelector('.phone-screen');
      screen.insertAdjacentHTML('beforeend', `
        ${this.opts.quick.length ? `<div class="wa-quick">${this.opts.quick.map((q) => `<button type="button" data-quick="${esc(q)}">${esc(q)}</button>`).join('')}</div>` : ''}
        <form class="wa-compose" autocomplete="off">
          <div class="wa-input-wrap">
            <button type="button" class="wa-icon-btn" data-act="menu" title="Menú" aria-label="Mostrar menú">${icon('list', 'sm')}</button>
            <input type="text" placeholder="Escriba un mensaje" aria-label="Mensaje" maxlength="500">
            <button type="button" class="wa-icon-btn" data-act="attach" title="Adjuntar comprobante" aria-label="Adjuntar imagen">${icon('paperclip', 'sm')}</button>
          </div>
          <button class="wa-send" type="submit" aria-label="Enviar">${icon('send')}</button>
        </form>`);
      this.body = this.el.querySelector('.wa-body');
      this.screen = screen;
      this.input = this.el.querySelector('.wa-compose input');
      this.el.querySelector('.wa-compose').addEventListener('submit', (e) => {
        e.preventDefault();
        const t = this.input.value.trim();
        if (!t) return;
        this.input.value = '';
        this.send({ kind: 'text', text: t });
      });
      this.el.addEventListener('click', (e) => this.onClick(e));
    }

    setName(name) { const n = this.el.querySelector('.wa-name'); if (n) n.textContent = name; }

    renderAll() {
      const c = this.bot.conv();
      this.body.innerHTML = '<div class="wa-day">Hoy</div>' + c.mensajes.map((m) => this.msgHTML(m)).join('');
      this.scroll();
    }
    scroll() { this.body.scrollTop = this.body.scrollHeight; }
    append(m) {
      this.body.insertAdjacentHTML('beforeend', this.msgHTML(m));
      this.scroll();
      if (this.opts.onPayload && m.from !== 'system') this.opts.onPayload(m);
    }

    msgHTML(m) {
      const p = m.payload;
      if (m.from === 'system' || p.type === 'system') return `<div class="wa-sys">${esc(p.text)}</div>`;
      const out = m.from === 'user';
      const meta = `<span class="wa-meta">${time(m.ts)}${out ? icon('check') : ''}</span>`;
      const label = m.from === 'agent' ? `<span class="wa-sender agent">${esc(m.sender || 'Asesor')} · asesor</span>` : m.sender === 'ai' || m.from === 'ai' ? `<span class="wa-sender ai">${esc(db.get('ai').nombre)} · IA (simulada)</span>` : '';
      const wrap = (inner, extra = '') => `<div class="wa-msg ${out ? 'out' : 'in'}" data-mid="${m.id}"><div class="wa-bubble">${label}${inner}${meta}</div>${extra}</div>`;

      if (p.type === 'text') return wrap(rich(p.text.body));
      if (p.type === 'image') {
        if (out) return wrap(`<div class="wa-media" style="display:grid;place-items:center;background:#cfd8dc;color:#455a64">${icon('image', 'lg')}</div>${esc(p.image.caption || '')}`);
        return wrap(`<div class="wa-qr"><img src="${p.image.link}" alt="Código QR de pago (simulación)"></div>${esc(p.image.caption || '')}`);
      }
      if (p.type !== 'interactive') return wrap(esc(`[${p.type}]`));
      const it = p.interactive;
      if (it.type === 'button_reply') return wrap(esc(it.button_reply.title));
      if (it.type === 'list_reply') return wrap(`${esc(it.list_reply.title)}${it.list_reply.description ? `<span class="wa-footer">${esc(it.list_reply.description)}</span>` : ''}`);
      if (it.type === 'nfm_reply') {
        let d = {};
        try { d = JSON.parse(it.nfm_reply.response_json); } catch (e) { /* vacío */ }
        const sv = db.service(d.servicioId);
        return wrap(`<span class="wa-header-text">${icon('flow', 'sm')} Formulario enviado</span>${sv ? esc(sv.nombre) : ''}\n${d.fecha ? esc(fmt.date(d.fecha, 'short')) : ''} ${esc(d.hora || '')}`);
      }
      const head = it.header && it.header.text ? `<span class="wa-header-text">${esc(it.header.text)}</span>` : '';
      const body = it.body ? rich(it.body.text) : '';
      const foot = it.footer ? `<span class="wa-footer">${esc(it.footer.text)}</span>` : '';
      if (it.type === 'button') {
        return wrap(head + body + foot, `<div class="wa-buttons">${it.action.buttons.map((b) => `<button type="button" data-reply="${esc(b.reply.id)}" data-title="${esc(b.reply.title)}">${icon('reply', 'sm')}${esc(b.reply.title)}</button>`).join('')}</div>`);
      }
      if (it.type === 'list') {
        return wrap(head + body + foot, `<div class="wa-buttons"><button type="button" class="wa-list-btn" data-list="${m.id}">${icon('list', 'sm')}${esc(it.action.button)}</button></div>`);
      }
      if (it.type === 'product') {
        const prod = p._ref && db.product(p._ref.productId);
        if (!prod) return wrap('Producto no disponible');
        const price = db.price(prod);
        return wrap(`<div class="wa-media"><img src="${db.img(prod)}" alt="${esc(prod.nombre)}"></div><div class="wa-product"><b>${esc(prod.nombre)}</b><span class="price">${fmt.money(price)}${prod.promo ? `<span class="old">${fmt.money(prod.precio)}</span>` : ''}</span>${body}</div>${foot}`);
      }
      if (it.type === 'flow') {
        return wrap(head + body + foot, `<div class="wa-buttons"><button type="button" class="wa-cta" data-flow="${m.id}">${icon('flow', 'sm')}${esc(it.action.parameters.flow_cta)}</button></div>`);
      }
      if (it.type === 'cta_url') {
        return wrap(body, `<div class="wa-buttons"><a class="wa-cta" href="${esc(it.action.parameters.url)}" target="_blank" rel="noopener">${icon('external', 'sm')}${esc(it.action.parameters.display_text)}</a></div>`);
      }
      return wrap(body);
    }

    onClick(e) {
      const q = e.target.closest('[data-quick]');
      if (q) return this.send({ kind: 'text', text: q.dataset.quick });
      const r = e.target.closest('[data-reply]');
      if (r) return this.send({ kind: 'reply', id: r.dataset.reply, title: r.dataset.title });
      const l = e.target.closest('[data-list]');
      if (l) return this.openList(l.dataset.list);
      const f = e.target.closest('[data-flow]');
      if (f) return this.openFlow(f.dataset.flow);
      const a = e.target.closest('[data-act]');
      if (a) {
        if (a.dataset.act === 'restart') this.restart();
        if (a.dataset.act === 'menu') this.send({ kind: 'text', text: 'menú' });
        if (a.dataset.act === 'attach') this.send({ kind: 'media', caption: 'comprobante.jpg' });
      }
    }

    findMsg(id) { return this.bot.conv().mensajes.find((m) => m.id === id); }

    openList(mid) {
      const m = this.findMsg(mid);
      if (!m) return;
      const it = m.payload.interactive;
      const bd = document.createElement('div');
      bd.className = 'wa-sheet-backdrop';
      const sheet = document.createElement('div');
      sheet.className = 'wa-sheet';
      sheet.setAttribute('role', 'dialog');
      sheet.innerHTML = `<div class="wa-sheet-head"><button type="button" aria-label="Cerrar">${icon('x')}</button>${esc(it.action.button)}</div>
        <div class="wa-sheet-body">${it.action.sections.map((s) => `<div class="wa-sheet-section">${esc(s.title)}</div>${s.rows.map((r) => `<button type="button" class="wa-sheet-row" data-id="${esc(r.id)}" data-title="${esc(r.title)}" data-desc="${esc(r.description || '')}"><div class="grow"><strong>${esc(r.title)}</strong>${r.description ? `<small>${esc(r.description)}</small>` : ''}</div><span class="wa-radio"></span></button>`).join('')}`).join('')}</div>`;
      const close = () => { bd.remove(); sheet.remove(); };
      bd.onclick = close;
      sheet.querySelector('.wa-sheet-head button').onclick = close;
      sheet.querySelectorAll('.wa-sheet-row').forEach((b) => b.onclick = () => {
        close();
        this.send({ kind: 'reply', list: true, id: b.dataset.id, title: b.dataset.title, description: b.dataset.desc });
      });
      this.screen.appendChild(bd);
      this.screen.appendChild(sheet);
    }

    openFlow(mid) {
      const m = this.findMsg(mid);
      if (!m) return;
      const data = m.payload.interactive.action.parameters.flow_action_payload.data || {};
      const services = db.get('services').filter((s) => s.activo);
      const contact = db.contact(this.bot.conv().contactId);
      const st = { servicioId: data.servicioId || (services[0] && services[0].id), fecha: '', hora: '' };
      const box = document.createElement('div');
      box.className = 'wa-flow';
      box.setAttribute('role', 'dialog');
      const draw = () => {
        const days = WAB.bot.nextDays(st.servicioId, 7);
        if (!days.find((d) => d.fecha === st.fecha)) { st.fecha = days.length ? days[0].fecha : ''; st.hora = ''; }
        const sl = st.fecha ? WAB.bot.slots(st.servicioId, st.fecha, data.reprogramar) : [];
        box.innerHTML = `
          <div class="wa-flow-head"><button type="button" data-x aria-label="Cerrar">${icon('x')}</button>${data.reprogramar ? 'Reprogramar cita' : 'Reservar cita'}</div>
          <div class="wa-flow-body">
            <div><label>Servicio</label><select data-k="servicioId"${data.reprogramar ? ' disabled' : ''}>${services.map((s) => `<option value="${s.id}"${s.id === st.servicioId ? ' selected' : ''}>${esc(s.nombre)} · ${s.duracion} min${s.precio ? ` · ${fmt.money(s.precio)}` : ''}</option>`).join('')}</select></div>
            <div><label>Fecha</label>${days.length ? `<div class="wa-slots">${days.map((d) => `<button type="button" data-fecha="${d.fecha}" class="${d.fecha === st.fecha ? 'active' : ''}">${esc(fmt.date(d.fecha, 'short'))}</button>`).join('')}</div>` : '<p class="err">No hay fechas disponibles en los próximos días.</p>'}</div>
            <div><label>Horario disponible</label>${sl.length ? `<div class="wa-slots">${sl.map((s) => `<button type="button" data-hora="${s.hora}" ${s.libre ? '' : 'disabled'} class="${s.hora === st.hora ? 'active' : ''}">${s.hora}</button>`).join('')}</div>` : '<p class="err">Elija una fecha.</p>'}</div>
            ${data.reprogramar ? '' : `<div><label>Nombre del responsable</label><input data-k="nombre" value="${esc(contact && contact.nombre !== 'Visitante demo' ? contact.nombre : '')}" placeholder="Nombre y apellido"></div>
            <div><label>Nombre de la mascota</label><input data-k="mascota" value="${esc(contact ? contact.mascota : '')}" placeholder="Ej.: Luna"></div>
            <div><label>Notas (opcional)</label><input data-k="notas" placeholder="Síntomas, preferencia de profesional…"></div>`}
            <p class="err" data-err hidden></p>
          </div>
          <div class="wa-flow-foot"><button type="button" data-submit>${data.reprogramar ? 'Confirmar cambio' : 'Confirmar reserva'}</button><small>Simulación de WhatsApp Flows · los datos se guardan en el calendario de demostración</small></div>`;
      };
      draw();
      const keep = () => { box.querySelectorAll('input[data-k]').forEach((i) => { st[i.dataset.k] = i.value; }); };
      box.addEventListener('change', (e) => { if (e.target.dataset.k === 'servicioId') { keep(); st.servicioId = e.target.value; st.hora = ''; draw(); restore(); } });
      const restore = () => { box.querySelectorAll('input[data-k]').forEach((i) => { if (st[i.dataset.k] !== undefined) i.value = st[i.dataset.k]; }); };
      box.addEventListener('click', (e) => {
        if (e.target.closest('[data-x]')) return box.remove();
        const f = e.target.closest('[data-fecha]');
        if (f) { keep(); st.fecha = f.dataset.fecha; st.hora = ''; draw(); restore(); return; }
        const h = e.target.closest('[data-hora]');
        if (h && !h.disabled) { keep(); st.hora = h.dataset.hora; draw(); restore(); return; }
        if (e.target.closest('[data-submit]')) {
          keep();
          const err = box.querySelector('[data-err]');
          const fail = (msg) => { err.textContent = msg; err.hidden = false; };
          if (!st.fecha || !st.hora) return fail('Elija una fecha y un horario.');
          if (!data.reprogramar && (!st.nombre || st.nombre.trim().length < 3)) return fail('Ingrese el nombre del responsable (mínimo 3 caracteres).');
          box.remove();
          this.send({ kind: 'flow', data: { servicioId: st.servicioId, fecha: st.fecha, hora: st.hora, nombre: (st.nombre || '').trim(), mascota: (st.mascota || '').trim(), notas: (st.notas || '').trim(), reprogramar: data.reprogramar || '' } });
        }
      });
      this.screen.appendChild(box);
    }

    async send(ev) {
      while (this.busy) await new Promise((r) => setTimeout(r, 80));
      this.busy = true;
      try {
        if (ev.kind !== 'start' && !ev.silent) this.append(this.bot.recordUser(ev));
        const before = this.bot.conv().estado;
        const replies = this.bot.respond(ev);
        for (const r of replies) {
          if (r.sender !== 'system') {
            this.body.insertAdjacentHTML('beforeend', '<div class="wa-typing"><span></span><span></span><span></span></div>');
            this.scroll();
            await new Promise((res) => setTimeout(res, r.sender === 'ai' ? 900 : 450));
            const t = this.body.querySelector('.wa-typing');
            if (t) t.remove();
          }
          const msg = this.bot.push(r.sender === 'system' ? 'system' : 'bot', r.payload, r.sender === 'ai' ? { sender: 'ai' } : {});
          this.append(msg);
        }
        const after = this.bot.conv().estado;
        if (after === 'pendiente' && before !== 'pendiente' && this.opts.simulateAgent) this.simulateAgent();
        if (this.opts.onAfter) this.opts.onAfter(ev, replies);
      } finally {
        this.busy = false;
      }
    }

    simulateAgent() {
      clearTimeout(this.agentTimer);
      this.agentTimer = setTimeout(() => {
        const c = this.bot.conv();
        if (c.estado !== 'pendiente') return;
        const agent = db.get('agents').find((a) => a.estado === 'disponible') || db.get('agents')[0];
        this.bot.setEstado('humano', agent.id);
        this.append(this.bot.push('system', { type: 'system', text: `${agent.nombre} tomó la conversación` }));
        this.append(this.bot.push('agent', { type: 'text', text: { body: `Hola, soy ${agent.nombre.split(' ')[0]} de ${db.get('settings').negocio.nombre}. Ya revisé su conversación, ¿en qué le puedo ayudar? (respuesta de asesor simulada: puede responder desde Conversaciones)` } }, { sender: agent.nombre }));
      }, 7000);
    }

    start() { return this.send({ kind: 'start' }); }
    async restart() {
      while (this.busy) await new Promise((r) => setTimeout(r, 80));
      clearTimeout(this.agentTimer);
      this.bot.reset();
      this.renderAll();
      await this.start();
    }
  }

  WAB.Phone = Phone;
})(window);
