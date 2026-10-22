/*
 * Motor del bot (SIMULADO). Produce mensajes con la misma forma conceptual que la
 * WhatsApp Cloud API (text, interactive button/list/product/flow/cta_url, image) a partir de la
 * configuración del panel: menús, respuestas automáticas, servicios, agenda, productos e IA.
 * Todo se guarda en la conversación de demostración para que aparezca en la bandeja y el CRM.
 */
(function (root) {
  const WAB = root.WAB;
  const { db, ui } = WAB;
  const { fmt } = ui;
  const DEMO_CONTACT = 'ct_demo';
  const DEMO_CONV = 'cv_demo';
  const cut = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

  // ---------- Constructores de mensajes (forma Cloud API) ----------
  const M = {
    text: (body) => ({ type: 'text', text: { body, preview_url: false } }),
    buttons(body, buttons, opts = {}) {
      return {
        type: 'interactive',
        interactive: Object.assign({ type: 'button' },
          opts.header ? { header: { type: 'text', text: cut(opts.header, 60) } } : {},
          { body: { text: body } },
          opts.footer ? { footer: { text: cut(opts.footer, 60) } } : {},
          { action: { buttons: buttons.slice(0, 3).map(([id, title]) => ({ type: 'reply', reply: { id, title: cut(title, 20) } })) } })
      };
    },
    list(body, button, sections, opts = {}) {
      let left = 10;
      const secs = sections.map((s) => {
        const rows = s.rows.slice(0, Math.max(0, left)).map((r) => Object.assign({ id: r.id, title: cut(r.title, 24) }, r.description ? { description: cut(r.description, 72) } : {}));
        left -= rows.length;
        return { title: cut(s.title, 24), rows };
      }).filter((s) => s.rows.length);
      return {
        type: 'interactive',
        interactive: Object.assign({ type: 'list' },
          opts.header ? { header: { type: 'text', text: cut(opts.header, 60) } } : {},
          { body: { text: body } },
          opts.footer ? { footer: { text: cut(opts.footer, 60) } } : {},
          { action: { button: cut(button || 'Ver opciones', 20), sections: secs } })
      };
    },
    image: (link, caption) => ({ type: 'image', image: { link, caption } }),
    product: (p) => ({
      type: 'interactive',
      interactive: { type: 'product', body: { text: cut(p.descripcion, 1024) }, footer: { text: 'Catálogo Patitas Felices' }, action: { catalog_id: 'CAT-DEMO-001', product_retailer_id: p.sku } },
      _ref: { productId: p.id }
    }),
    flow(body, cta, screen, data, opts = {}) {
      return {
        type: 'interactive',
        interactive: {
          type: 'flow',
          header: { type: 'text', text: opts.header || 'Reservar cita' },
          body: { text: body },
          footer: { text: opts.footer || 'Disponibilidad en tiempo real' },
          action: { name: 'flow', parameters: { flow_message_version: '3', flow_id: 'FLOW_RESERVAS_DEMO', flow_cta: cut(cta, 20), flow_action: 'navigate', flow_action_payload: { screen, data: data || {} } } }
        }
      };
    },
    cta(body, text, url) {
      return { type: 'interactive', interactive: { type: 'cta_url', body: { text: body }, action: { name: 'cta_url', parameters: { display_text: cut(text, 20), url } } } };
    }
  };

  /** QR ficticio (patrón determinístico, no escaneable). */
  function fakeQR(seed) {
    let h = 2166136261;
    for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    const N = 25;
    let cells = '';
    const finder = (x, y) => (x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (finder(x, y)) continue;
      h = Math.imul(h ^ (x * 31 + y), 2654435761) >>> 0;
      if (h % 100 < 47) cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    }
    const fp = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${N + 4} ${N + 4}" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${N + 4}" height="${N + 4}" fill="#fff"/><g fill="#111">${fp(0, 0)}${fp(N - 7, 0)}${fp(0, N - 7)}${cells}</g></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  // ---------- Agenda ----------
  const toMin = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
  const toHora = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  function slots(servicioId, fechaISO, ignoreId) {
    const cfg = db.get('settings').agenda;
    const svc = db.service(servicioId);
    const d = ui.toDate(fechaISO);
    if (!svc || !d) return [];
    const day = cfg.horario[d.getDay()];
    if (!day || !day.on) return [];
    const taken = db.get('appointments').filter((a) => a.fecha === fechaISO && a.id !== ignoreId && a.estado !== 'cancelada')
      .map((a) => { const s = db.service(a.servicioId); const st = toMin(a.hora); return [st, st + (s ? s.duracion : 30)]; });
    const now = new Date();
    const minStart = d.toDateString() === now.toDateString() ? now.getHours() * 60 + now.getMinutes() + cfg.anticipacionHoras * 60 : 0;
    const out = [];
    for (let m = toMin(day.de); m + svc.duracion <= toMin(day.a); m += cfg.intervalo) {
      const busy = taken.some(([a, b]) => m < b && m + svc.duracion > a);
      out.push({ hora: toHora(m), libre: !busy && m >= minStart });
    }
    return out;
  }
  function nextDays(servicioId, n = 7) {
    const cfg = db.get('settings').agenda;
    const days = [];
    const d = new Date(); d.setHours(0, 0, 0, 0);
    for (let i = 0; i < cfg.diasMaximos && days.length < n; i++) {
      const iso = fmt.isoDate(d);
      const free = slots(servicioId, iso).filter((s) => s.libre).length;
      if (free) days.push({ fecha: iso, libres: free });
      d.setDate(d.getDate() + 1);
    }
    return days;
  }
  function isOpenNow() {
    const now = new Date();
    const day = db.get('settings').agenda.horario[now.getDay()];
    if (!day || !day.on) return false;
    const m = now.getHours() * 60 + now.getMinutes();
    return m >= toMin(day.de) && m < toMin(day.a);
  }

  // ---------- Conversación de demostración ----------
  function ensureDemo() {
    if (!db.contact(DEMO_CONTACT)) {
      db.update('contacts', (arr) => { arr.unshift({ id: DEMO_CONTACT, nombre: 'Visitante demo', mascota: '', telefono: '+591 70000001', correo: '', estado: 'prospecto', etiquetas: ['demo'], fuente: 'WhatsApp', consentimiento: true, notas: [], creado: new Date().toISOString(), ultimoContacto: new Date().toISOString(), valor: 0 }); return arr; });
    }
    if (!db.find('conversations', DEMO_CONV)) {
      db.update('conversations', (arr) => { arr.unshift({ id: DEMO_CONV, contactId: DEMO_CONTACT, estado: 'bot', asesor: null, etiquetas: ['demo'], noLeidos: 0, notas: [], actualizado: new Date().toISOString(), mensajes: [], sesion: {} }); return arr; });
    }
  }

  class Bot {
    constructor(convId = DEMO_CONV) {
      if (convId === DEMO_CONV) ensureDemo();
      this.convId = convId;
    }
    conv() { return db.find('conversations', this.convId); }
    session() { const c = this.conv(); return Object.assign({ carrito: [], esperando: null, memoria: {}, iaCount: 0, modoIA: false, entrega: null, pedidoPendiente: null }, c.sesion || {}); }
    saveSession(s) { db.update('conversations', (arr) => { const c = arr.find((x) => x.id === this.convId); c.sesion = s; return arr; }); }

    push(from, payload, extra = {}) {
      const msg = Object.assign({ id: ui.uid('wamid'), from, ts: new Date().toISOString(), payload }, extra);
      db.update('conversations', (arr) => {
        const c = arr.find((x) => x.id === this.convId);
        c.mensajes.push(msg);
        c.actualizado = msg.ts;
        if (from === 'user' && c.estado !== 'bot') c.noLeidos = (c.noLeidos || 0) + 1;
        return arr;
      });
      if (from === 'user') db.update('contacts', (arr) => { const ct = arr.find((x) => x.id === this.conv().contactId); if (ct) ct.ultimoContacto = msg.ts; return arr; });
      return msg;
    }
    log(action) {
      db.update('navLog', (arr) => { arr.unshift({ ts: new Date().toISOString(), accion: action, conv: this.convId }); return arr.slice(0, 150); });
    }
    reset() {
      db.update('conversations', (arr) => { const c = arr.find((x) => x.id === this.convId); c.mensajes = []; c.sesion = {}; c.estado = 'bot'; c.asesor = null; c.noLeidos = 0; return arr; });
    }

    /** Registra el evento del usuario y devuelve el mensaje creado. */
    recordUser(ev) {
      let payload;
      if (ev.kind === 'text') payload = { type: 'text', text: { body: ev.text } };
      else if (ev.kind === 'reply') payload = { type: 'interactive', interactive: ev.list ? { type: 'list_reply', list_reply: { id: ev.id, title: ev.title, description: ev.description || '' } } : { type: 'button_reply', button_reply: { id: ev.id, title: ev.title } } };
      else if (ev.kind === 'flow') payload = { type: 'interactive', interactive: { type: 'nfm_reply', nfm_reply: { name: 'flow', body: 'Enviado', response_json: JSON.stringify(ev.data) } } };
      else if (ev.kind === 'media') payload = { type: 'image', image: { id: ui.uid('media'), mime_type: 'image/jpeg', caption: ev.caption || 'comprobante.jpg' } };
      return this.push('user', payload);
    }

    /** Calcula la respuesta del bot para un evento. Devuelve [{ payload, sender }] */
    respond(ev) {
      const c = this.conv();
      const s = this.session();
      const out = [];
      const say = (payload, sender = 'bot') => out.push({ payload, sender });
      const settings = db.get('settings');

      // Modo asesor: el bot no interviene salvo que pidan volver al menú
      if ((c.estado === 'pendiente' || c.estado === 'humano') && ev.kind === 'text') {
        if (/^(menu|menú|bot|volver)$/i.test(ev.text.trim())) {
          this.setEstado('bot');
          say({ type: 'system', text: 'La conversación volvió al asistente automático' }, 'system');
          this.menu('main', say);
        }
        this.saveSession(s);
        return out;
      }
      if (!settings.bot.activo && ev.kind === 'text') {
        say({ type: 'system', text: 'Bot desactivado: el mensaje quedó en la bandeja para un asesor' }, 'system');
        this.setEstado('pendiente');
        return out;
      }

      if (ev.kind === 'start') {
        this.log('Inicio de conversación');
        say(M.text(settings.bot.bienvenida + (isOpenNow() ? '' : `\n\n${settings.bot.fueraHorario}`)));
        this.menu('main', say);
      } else if (ev.kind === 'reply') {
        this.handleId(ev.id, ev.title, s, say);
      } else if (ev.kind === 'flow') {
        this.handleFlow(ev.data, s, say);
      } else if (ev.kind === 'media') {
        if (s.pedidoPendiente) this.handleId(`proof:${s.pedidoPendiente}`, 'Comprobante', s, say, true);
        else say(M.text('Recibimos su archivo. Un asesor lo revisará si es necesario.'));
      } else if (ev.kind === 'text') {
        this.handleText(ev.text, s, say);
      }
      this.saveSession(Object.assign(this.session(), s));
      return out;
    }

    setEstado(estado, asesor) {
      db.update('conversations', (arr) => { const c = arr.find((x) => x.id === this.convId); c.estado = estado; if (asesor !== undefined) c.asesor = asesor; return arr; });
    }

    // ---------- Menús ----------
    menu(menuId, say) {
      const menu = db.get('menus').find((m) => m.id === menuId) || db.get('menus')[0];
      if (!menu) return say(M.text('No hay menús configurados.'));
      this.log(`Menú: ${menu.titulo}`);
      say(renderMenu(menu));
    }

    handleId(id, title, s, say, fromMedia) {
      const [kind, a, b] = id.split(':');
      const settings = db.get('settings');
      switch (kind) {
        case 'opt': {
          const menu = db.get('menus').find((m) => m.id === a);
          const opt = menu && menu.opciones.find((o) => o.id === b);
          if (!opt) return say(M.text('Esa opción ya no está disponible.'));
          this.log(`${menu.titulo} → ${opt.titulo}`);
          return this.option(opt, menu, s, say);
        }
        case 'menu': return this.menu(a, say);
        case 'act': return this.option({ accion: a }, null, s, say);
        case 'svc': {
          const sv = db.service(a);
          if (!sv) return say(M.text('Servicio no disponible.'));
          this.log(`Servicio: ${sv.nombre}`);
          return say(M.buttons(`*${sv.nombre}*\n${sv.descripcion}\n\nPrecio: ${sv.precio ? fmt.money(sv.precio) : 'sin costo'}\nDuración: ${sv.duracion} minutos`, [[`bk:${sv.id}`, 'Reservar'], ['act:services', 'Otros servicios'], ['menu:main', 'Menú principal']]));
        }
        case 'bk': return this.bookFlow(say, a);
        case 'cat': {
          const cat = db.category(a);
          const prods = db.get('products').filter((p) => p.activo && p.categoria === a);
          if (!prods.length) return say(M.buttons('No hay productos en esta categoría por ahora.', [['act:products', 'Ver categorías'], ['menu:main', 'Menú principal']]));
          this.log(`Categoría: ${cat.nombre}`);
          return say(M.list(`${cat.nombre}: elija un producto para ver detalles.`, 'Ver productos', [{ title: cat.nombre, rows: prods.map((p) => ({ id: `prd:${p.id}`, title: p.nombre, description: `${fmt.money(db.price(p))}${p.promo ? ` (−${p.promo}%)` : ''} · ${p.stock > 0 ? `${p.stock} disponibles` : 'Agotado'}` })) }], { header: 'Tienda de mascotas' }));
        }
        case 'prd': {
          const p = db.product(a);
          if (!p) return say(M.text('Producto no disponible.'));
          this.log(`Producto: ${p.nombre}`);
          say(M.product(p));
          const n = s.carrito.reduce((t, x) => t + x.cantidad, 0);
          if (p.stock <= 0) return say(M.buttons('Este producto está agotado. ¿Desea que le avisemos cuando vuelva?', [['act:agent', 'Avisarme'], ['act:products', 'Seguir viendo']]));
          return say(M.buttons(`${fmt.money(db.price(p))}${p.variantes.length ? `\nOpciones: ${p.variantes.join(', ')}` : ''}`, [[`add:${p.id}`, 'Agregar al carrito'], ['act:products', 'Seguir viendo'], ['act:cart', n ? `Ver carrito (${n})` : 'Ver carrito']]));
        }
        case 'add': {
          const p = db.product(a);
          if (!p) return;
          if (p.variantes.length) return say(M.list(`Elija la opción de ${p.nombre}:`, 'Elegir opción', [{ title: 'Opciones', rows: p.variantes.map((v, i) => ({ id: `addv:${p.id}:${i}`, title: v, description: fmt.money(db.price(p)) })) }]));
          return this.addToCart(p, '', s, say);
        }
        case 'addv': { const p = db.product(a); return p && this.addToCart(p, p.variantes[Number(b)] || '', s, say); }
        case 'cart': if (a === 'clear') { s.carrito = []; return say(M.buttons('Vació su carrito.', [['act:products', 'Ver tienda'], ['menu:main', 'Menú principal']])); } return;
        case 'checkout': {
          if (!s.carrito.length) return say(M.buttons('Su carrito está vacío.', [['act:products', 'Ver tienda']]));
          this.log('Confirmar pedido');
          return say(M.buttons('¿Cómo desea recibir su pedido?', [['ship:delivery', 'Envío a domicilio'], ['ship:pickup', 'Retiro en tienda']], { header: 'Entrega', footer: `Envío ${fmt.money(settings.tienda.envio)} · gratis desde ${fmt.money(settings.tienda.envioGratisDesde)}` }));
        }
        case 'ship':
          if (a === 'delivery') { s.entrega = { tipo: 'delivery' }; s.esperando = 'direccion'; return say(M.text('Escriba su dirección de entrega (calle, número y zona o referencia).')); }
          s.entrega = { tipo: 'retiro', direccion: 'Sucursal Av. Busch' };
          return this.createOrder(s, say);
        case 'proof': {
          const o = db.find('orders', a);
          if (!o) return;
          if (!fromMedia) say({ type: 'system', text: 'Simulación: se adjuntó la imagen "comprobante.jpg"' }, 'system');
          db.update('orders', (arr) => { const x = arr.find((y) => y.id === a); x.pago = { metodo: 'QR', estado: 'en_revision', comprobante: true }; x.estado = 'pago_revision'; x.historial.push({ estado: 'pago_revision', fecha: new Date().toISOString() }); return arr; });
          s.pedidoPendiente = null;
          s.carrito = [];
          this.log(`Comprobante del pedido #${o.numero}`);
          return say(M.buttons(`Recibimos su comprobante del pedido #${o.numero}. Validaremos el pago en unos minutos y le avisaremos por aquí.`, [[`track:${o.id}`, 'Seguir pedido'], ['menu:main', 'Menú principal']]));
        }
        case 'paycancel': {
          db.update('orders', (arr) => { const x = arr.find((y) => y.id === a); if (x && x.estado === 'nuevo') { x.estado = 'cancelado'; x.pago.estado = 'rechazado'; x.historial.push({ estado: 'cancelado', fecha: new Date().toISOString() }); } return arr; });
          restock(a);
          s.pedidoPendiente = null;
          return say(M.buttons('Cancelamos su pedido y liberamos los productos reservados.', [['act:products', 'Ver tienda'], ['menu:main', 'Menú principal']]));
        }
        case 'track': {
          const o = db.find('orders', a);
          if (!o) return say(M.text('No encontramos ese pedido.'));
          const flow = o.estado === 'cancelado' ? ['nuevo', 'cancelado'] : ['nuevo', 'pago_revision', 'pagado', 'preparando', o.entrega.tipo === 'delivery' ? 'enviado' : 'listo_retiro', 'entregado'];
          const idx = flow.indexOf(o.estado);
          const lines = flow.map((st, i) => `${i <= idx ? '●' : '○'} ${WAB.STATUS.pedido[st][0]}`).join('\n');
          return say(M.buttons(`*Pedido #${o.numero}* · ${fmt.money(o.total)}\n\n${lines}`, [['act:orders', 'Mis pedidos'], ['menu:main', 'Menú principal']]));
        }
        case 'apt': {
          const ap = db.find('appointments', a);
          if (!ap) return;
          const sv = db.service(ap.servicioId) || { nombre: 'Cita' };
          return say(M.buttons(`*${sv.nombre}*\n${fmt.date(ap.fecha, 'weekday')} a las ${ap.hora}\nEstado: ${WAB.STATUS.cita[ap.estado][0]}`, [[`aptr:${ap.id}`, 'Reprogramar'], [`aptc:${ap.id}`, 'Cancelar cita'], ['menu:main', 'Menú principal']]));
        }
        case 'aptc': {
          db.update('appointments', (arr) => { const x = arr.find((y) => y.id === a); if (x) x.estado = 'cancelada'; return arr; });
          this.log('Cita cancelada');
          return say(M.buttons('Su cita fue cancelada. Puede reservar otra cuando quiera.', [['act:book', 'Agendar otra'], ['menu:main', 'Menú principal']]));
        }
        case 'aptr': {
          const ap = db.find('appointments', a);
          return ap && this.bookFlow(say, ap.servicioId, ap.id);
        }
        default:
          return say(M.text(`Opción "${title}" recibida.`));
      }
    }

    option(opt, menu, s, say) {
      switch (opt.accion) {
        case 'menu': return this.menu(opt.destino, say);
        case 'reply': return say(M.buttons(opt.respuesta, menu && menu.id !== 'main' ? [[`menu:${menu.id}`, 'Otras preguntas'], ['menu:main', 'Menú principal']] : [['menu:main', 'Menú principal']]));
        case 'url': return say(M.cta(opt.respuesta || opt.titulo, opt.titulo, opt.url || '#'));
        case 'book': return this.bookFlow(say);
        case 'services': {
          const list = db.get('services').filter((x) => x.activo);
          return say(M.list('Estos son nuestros servicios. Elija uno para ver detalles y reservar.', 'Ver servicios', [{ title: 'Servicios', rows: list.map((x) => ({ id: `svc:${x.id}`, title: x.nombre, description: `${x.precio ? fmt.money(x.precio) : 'Sin costo'} · ${x.duracion} min` })) }], { header: 'Servicios y precios' }));
        }
        case 'products': {
          const cats = db.get('categories');
          const prods = db.get('products').filter((p) => p.activo);
          return say(M.list('Elija una categoría de nuestra tienda.', 'Ver categorías', [{ title: 'Categorías', rows: cats.map((c) => ({ id: `cat:${c.id}`, title: c.nombre, description: `${prods.filter((p) => p.categoria === c.id).length} productos` })) }], { header: 'Tienda de mascotas', footer: 'Envíos el mismo día en la ciudad' }));
        }
        case 'cart': {
          if (!s.carrito.length) return say(M.buttons('Su carrito está vacío.', [['act:products', 'Ver tienda'], ['menu:main', 'Menú principal']]));
          const total = s.carrito.reduce((t, x) => t + x.precio * x.cantidad, 0);
          const lines = s.carrito.map((x) => `${x.cantidad} × ${x.nombre}${x.variante ? ` (${x.variante})` : ''} — ${fmt.money(x.precio * x.cantidad)}`).join('\n');
          return say(M.buttons(`*Su carrito*\n${lines}\n\nSubtotal: ${fmt.money(total)}`, [['checkout', 'Confirmar pedido'], ['act:products', 'Seguir comprando'], ['cart:clear', 'Vaciar carrito']]));
        }
        case 'orders': return this.myStuff(say);
        case 'ai': s.modoIA = true; return say(M.text(`Soy ${db.get('ai').nombre}, el asistente con IA. Escriba su pregunta con sus palabras (por ejemplo: "¿hacen envíos?" o "¿cuánto cuesta la vacuna?").`));
        case 'agent': return this.handoff(say);
        default: return say(M.text('Opción no disponible.'));
      }
    }

    bookFlow(say, servicioId, reprogramar) {
      this.log(reprogramar ? 'Reprogramar cita' : 'Abrir flujo de reserva');
      say(M.flow(reprogramar ? 'Elija la nueva fecha y horario para su cita.' : 'Elija el servicio, la fecha y el horario disponibles. La confirmación es inmediata.', reprogramar ? 'Reprogramar' : 'Reservar cita', 'RESERVA', { servicioId: servicioId || '', reprogramar: reprogramar || '' }));
    }

    handleFlow(data, s, say) {
      const sv = db.service(data.servicioId);
      if (!sv) return say(M.text('No se pudo procesar la reserva.'));
      const free = slots(sv.id, data.fecha, data.reprogramar).find((x) => x.hora === data.hora && x.libre);
      if (!free) return say(M.buttons('Ese horario acaba de ocuparse. Por favor elija otro.', [[`bk:${sv.id}`, 'Elegir otro'], ['menu:main', 'Menú principal']]));
      const cfg = db.get('settings').agenda;
      const c = this.conv();
      if (data.nombre) db.update('contacts', (arr) => { const ct = arr.find((x) => x.id === c.contactId); if (ct && ct.nombre === 'Visitante demo') ct.nombre = data.nombre; if (ct && data.mascota) ct.mascota = data.mascota; return arr; });
      let ap;
      if (data.reprogramar) {
        db.update('appointments', (arr) => { ap = arr.find((x) => x.id === data.reprogramar); ap.fecha = data.fecha; ap.hora = data.hora; ap.estado = cfg.autoConfirmar ? 'confirmada' : 'pendiente'; return arr; });
        this.log('Cita reprogramada');
      } else {
        ap = { id: ui.uid('ap'), servicioId: sv.id, contactId: c.contactId, fecha: data.fecha, hora: data.hora, estado: cfg.autoConfirmar ? 'confirmada' : 'pendiente', canal: 'WhatsApp', notas: data.notas || '', recordatorio: false, creado: new Date().toISOString() };
        db.update('appointments', (arr) => { arr.push(ap); return arr; });
        this.log(`Cita reservada: ${sv.nombre}`);
      }
      const reminder = cfg.recordatorio24 ? '\nLe enviaremos un recordatorio 24 horas antes.' : '';
      say(M.buttons(`${ap.estado === 'confirmada' ? 'Cita confirmada' : 'Solicitud recibida (pendiente de confirmación)'}\n\n*${sv.nombre}*\n${fmt.date(ap.fecha, 'weekday')} a las ${ap.hora}\n${db.get('settings').negocio.direccion}${reminder}`, [[`apt:${ap.id}`, 'Ver mi cita'], ['menu:main', 'Menú principal']], { header: data.reprogramar ? 'Cita reprogramada' : 'Reserva registrada' }));
    }

    addToCart(p, variante, s, say) {
      const item = s.carrito.find((x) => x.productId === p.id && x.variante === variante);
      const qty = (item ? item.cantidad : 0) + 1;
      if (qty > p.stock) return say(M.buttons(`Solo hay ${p.stock} unidades de ${p.nombre}.`, [['act:cart', 'Ver carrito'], ['act:products', 'Seguir viendo']]));
      if (item) item.cantidad = qty; else s.carrito.push({ productId: p.id, nombre: p.nombre, variante, cantidad: 1, precio: db.price(p) });
      const n = s.carrito.reduce((t, x) => t + x.cantidad, 0);
      const total = s.carrito.reduce((t, x) => t + x.precio * x.cantidad, 0);
      this.log(`Carrito: ${p.nombre}`);
      say(M.buttons(`Agregué ${p.nombre}${variante ? ` (${variante})` : ''} a su carrito.\nCarrito: ${n} producto${n > 1 ? 's' : ''} · ${fmt.money(total)}`, [['checkout', 'Confirmar pedido'], ['act:products', 'Seguir comprando'], ['act:cart', 'Ver carrito']]));
    }

    createOrder(s, say) {
      const t = db.get('settings').tienda;
      const subtotal = s.carrito.reduce((x, i) => x + i.precio * i.cantidad, 0);
      const envio = s.entrega.tipo === 'delivery' ? (subtotal >= t.envioGratisDesde ? 0 : t.envio) : 0;
      const numero = Math.max(1048, ...db.get('orders').map((o) => o.numero)) + 1;
      const now = new Date().toISOString();
      const order = { id: ui.uid('or'), numero, contactId: this.conv().contactId, items: s.carrito.map((x) => Object.assign({}, x)), subtotal, envio, total: subtotal + envio, entrega: s.entrega, pago: { metodo: 'QR', estado: 'pendiente', comprobante: false }, estado: 'nuevo', origen: s.origen || 'WhatsApp', creado: now, historial: [{ estado: 'nuevo', fecha: now }] };
      db.update('orders', (arr) => { arr.unshift(order); return arr; });
      // Reserva de stock
      db.update('products', (arr) => { order.items.forEach((i) => { const p = arr.find((x) => x.id === i.productId); if (p) p.stock = Math.max(0, p.stock - i.cantidad); }); return arr; });
      s.pedidoPendiente = order.id;
      s.esperando = null;
      this.log(`Pedido creado #${numero}`);
      say(M.text(`*Pedido #${numero} creado*\n${order.items.map((i) => `${i.cantidad} × ${i.nombre}${i.variante ? ` (${i.variante})` : ''}`).join('\n')}\n\nSubtotal: ${fmt.money(subtotal)}\nEnvío: ${envio ? fmt.money(envio) : 'sin costo'}\n*Total: ${fmt.money(order.total)}*\n${s.entrega.tipo === 'delivery' ? `Entrega en: ${s.entrega.direccion}` : 'Retiro en: Sucursal Av. Busch'}\n\nReservamos los productos por 2 horas.`));
      say(M.image(fakeQR(`PF-${numero}-${order.total}`), `QR de pago ${fmt.money(order.total)} · ${t.banco} (simulación, no escanear)`));
      say(M.buttons(t.mensajeQR, [[`proof:${order.id}`, 'Enviar comprobante'], [`paycancel:${order.id}`, 'Cancelar pedido']], { footer: 'Pago con QR simulado' }));
    }

    myStuff(say) {
      const cid = this.conv().contactId;
      const today = fmt.isoDate(new Date());
      const aps = db.get('appointments').filter((a) => a.contactId === cid && a.fecha >= today && a.estado !== 'cancelada').slice(0, 5);
      const ords = db.get('orders').filter((o) => o.contactId === cid).slice(0, 5);
      if (!aps.length && !ords.length) return say(M.buttons('Aún no tiene citas ni pedidos registrados.', [['act:book', 'Agendar cita'], ['act:products', 'Ver tienda'], ['menu:main', 'Menú principal']]));
      const sections = [];
      if (aps.length) sections.push({ title: 'Próximas citas', rows: aps.map((a) => ({ id: `apt:${a.id}`, title: (db.service(a.servicioId) || { nombre: 'Cita' }).nombre, description: `${fmt.date(a.fecha, 'short')} ${a.hora} · ${WAB.STATUS.cita[a.estado][0]}` })) });
      if (ords.length) sections.push({ title: 'Pedidos', rows: ords.map((o) => ({ id: `track:${o.id}`, title: `Pedido #${o.numero}`, description: `${fmt.money(o.total)} · ${WAB.STATUS.pedido[o.estado][0]}` })) });
      say(M.list('Estas son sus citas y pedidos. Elija uno para ver el detalle.', 'Ver detalle', sections, { header: 'Mis citas y pedidos' }));
    }

    handoff(say) {
      this.setEstado('pendiente', null);
      this.log('Solicitud de asesor');
      say({ type: 'system', text: 'Conversación transferida a la bandeja de asesores' }, 'system');
      say(M.text('Le comunico con una persona de nuestro equipo. Tiempo estimado de respuesta: 3 minutos. Escriba "menú" si desea volver al asistente.'));
    }

    handleText(text, s, say) {
      const t = norm(text);
      if (s.esperando === 'direccion') {
        if (t.length < 6) return say(M.text('La dirección parece incompleta. Escriba calle, número y zona.'));
        s.entrega.direccion = text.trim();
        s.esperando = null;
        return this.createOrder(s, say);
      }
      if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|inicio|empezar)\b/.test(t) && t.length < 25) {
        s.modoIA = false;
        say(M.text(db.get('settings').bot.bienvenida));
        return this.menu('main', say);
      }
      if (/^(menu|menú|volver|opciones|salir)$/.test(t)) { s.modoIA = false; return this.menu('main', say); }
      if (!s.modoIA) {
        if (/\b(agendar|reservar|turno)\b/.test(t)) return this.bookFlow(say);
        if (/^(tienda|catalogo|productos|comprar)$/.test(t)) return this.option({ accion: 'products' }, null, s, say);
        if (/^(carrito|mi carrito)$/.test(t)) return this.option({ accion: 'cart' }, null, s, say);
        if (/^(mis pedidos|mis citas|pedido|seguimiento)$/.test(t)) return this.myStuff(say);
        if (/\b(asesor|humano|persona)\b/.test(t)) return this.handoff(say);
        const ar = db.get('autoReplies').find((r) => r.activo && r.claves.split(',').map(norm).some((k) => k && t.includes(k)));
        if (ar) {
          db.update('autoReplies', (arr) => { const x = arr.find((y) => y.id === ar.id); x.coincidencias = (x.coincidencias || 0) + 1; return arr; });
          this.log(`Respuesta automática: ${ar.claves.split(',')[0]}`);
          return say(M.text(ar.respuesta));
        }
      }
      const cfg = db.get('ai');
      if (cfg.activo) {
        const lim = WAB.ai.consume(s.iaCount);
        if (!lim.ok) {
          say(M.text(lim.reason === 'monthly' ? 'El asistente con IA alcanzó el límite mensual configurado. Le comunico con un asesor.' : 'Para seguir ayudándole mejor, le comunico con un asesor.'));
          return this.handoff(say);
        }
        s.iaCount += 1;
        const r = WAB.ai.answer(text, { memory: s.memoria });
        db.update('aiLog', (arr) => { arr.unshift({ ts: new Date().toISOString(), pregunta: text, fuente: r.source, confianza: r.confidence }); return arr.slice(0, 60); });
        if (r.handoff) { say(M.text(r.text), 'ai'); return this.handoff(say); }
        if (r.lowConfidence) return say(Object.assign(M.buttons(r.text, [['act:agent', 'Hablar con asesor'], ['menu:main', 'Ver menú']]), { _ai: r }), 'ai');
        return say(Object.assign(M.text(r.text), { _ai: r }), 'ai');
      }
      say(M.buttons('No entendí su mensaje. Puede usar el menú para encontrar lo que necesita.', [['menu:main', 'Ver menú'], ['act:agent', 'Hablar con asesor']]));
    }
  }

  function renderMenu(menu) {
    const opts = menu.opciones.filter((o) => o.titulo);
    if (menu.tipo === 'buttons' && opts.length <= 3) {
      return M.buttons(menu.cuerpo, opts.map((o) => [`opt:${menu.id}:${o.id}`, o.titulo]), { header: menu.encabezado, footer: menu.pie });
    }
    const groups = [];
    opts.forEach((o) => {
      const title = o.seccion || menu.titulo;
      let g = groups.find((x) => x.title === title);
      if (!g) { g = { title, rows: [] }; groups.push(g); }
      g.rows.push({ id: `opt:${menu.id}:${o.id}`, title: o.titulo, description: o.descripcion });
    });
    return M.list(menu.cuerpo, menu.boton || 'Ver opciones', groups, { header: menu.encabezado, footer: menu.pie });
  }

  function restock(orderId) {
    const o = db.find('orders', orderId);
    if (!o) return;
    db.update('products', (arr) => { o.items.forEach((i) => { const p = arr.find((x) => x.id === i.productId); if (p) p.stock += i.cantidad; }); return arr; });
  }

  WAB.bot = { Bot, M, renderMenu, slots, nextDays, fakeQR, isOpenNow, restock, DEMO_CONV, DEMO_CONTACT };
})(window);
