/*
 * Marco de teléfono WhatsApp y reproductor de guiones de conversación (solo lectura).
 * El simulador interactivo completo vive en prototipos/js/wa-phone.js y reutiliza frame().
 */
(function (root) {
  const WAB = root.WAB;
  const { icon } = WAB;
  const esc = (s) => WAB.ui.esc(s);

  function nowTime() {
    return new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  /** HTML interno del teléfono. opts: { name, subtitle, flat, interactive } */
  function frame(opts = {}) {
    return `
      <div class="phone-screen">
        <div class="phone-status"><span>${nowTime()}</span><span>5G ▮▮▮</span></div>
        <div class="wa-head">
          <span class="avatar">${icon('store')}</span>
          <div class="wa-head-info"><strong><span class="wa-name">${esc(opts.name || 'Su negocio')}</span><span class="wa-verified">${icon('check')}</span></strong><small class="wa-sub">${esc(opts.subtitle || 'Cuenta de empresa')}</small></div>
          <span class="wa-sim-tag">Simulación</span>
          <div class="wa-head-actions">${opts.headActions || ''}</div>
        </div>
        <div class="wa-body" aria-live="polite"><div class="wa-day">Hoy</div></div>
        ${opts.interactive ? '' : `<div class="wa-compose"><div class="wa-input-wrap"><span class="wa-icon-btn">${icon('smile')}</span><input type="text" placeholder="Mensaje" disabled aria-label="Mensaje (demostración)"><span class="wa-icon-btn">${icon('paperclip')}</span></div><span class="wa-send">${icon('send')}</span></div>`}
      </div>`;
  }

  function bubbleHTML(m) {
    const side = m.de === 'user' ? 'out' : 'in';
    const checks = side === 'out' ? `${icon('check')}` : '';
    let extra = '';
    if (m.lista) {
      extra = `<div class="wa-buttons"><button disabled class="wa-list-btn">${icon('list')}Ver opciones</button></div>
        <div class="script-list">${m.lista.map((x) => `<span>${esc(x)}</span>`).join('')}</div>`;
    }
    if (m.botones) extra = `<div class="wa-buttons">${m.botones.map((b) => `<button disabled>${esc(b)}</button>`).join('')}</div>`;
    return `<div class="wa-msg ${side}"><div class="wa-bubble">${esc(m.texto)}<span class="wa-meta">${nowTime()}${checks}</span></div>${extra}</div>`;
  }

  /** Reproduce un guion con pausas y "escribiendo…". Devuelve una función para detenerlo. */
  function play(phoneEl, guion, { loop = false, speed = 1 } = {}) {
    const body = phoneEl.querySelector('.wa-body');
    let stopped = false;
    let timer;
    const wait = (ms) => new Promise((r) => { timer = setTimeout(r, ms / speed); });
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    async function run() {
      do {
        body.innerHTML = '<div class="wa-day">Hoy</div>';
        if (reduced) {
          body.insertAdjacentHTML('beforeend', guion.map(bubbleHTML).join(''));
          return;
        }
        for (const m of guion) {
          if (stopped) return;
          if (m.de === 'bot') {
            body.insertAdjacentHTML('beforeend', '<div class="wa-typing"><span></span><span></span><span></span></div>');
            body.scrollTop = body.scrollHeight;
            await wait(900);
            if (stopped) return;
            const t = body.querySelector('.wa-typing');
            if (t) t.remove();
          } else {
            await wait(700);
            if (stopped) return;
          }
          body.insertAdjacentHTML('beforeend', bubbleHTML(m));
          body.scrollTop = body.scrollHeight;
          await wait(m.de === 'bot' ? 1300 : 500);
        }
        await wait(3200);
      } while (loop && !stopped);
    }
    run();
    return () => { stopped = true; clearTimeout(timer); };
  }

  WAB.wa = Object.assign(WAB.wa || {}, { frame, play, bubbleHTML, nowTime });
})(window);
