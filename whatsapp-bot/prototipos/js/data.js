/*
 * Datos de ejemplo de los prototipos (negocio ficticio: "Patitas Felices", veterinaria y pet shop).
 * Las fechas se generan relativas al día actual para que la agenda y los pedidos siempre luzcan vigentes.
 * WAB.seed() devuelve un objeto nuevo cada vez (se usa para restablecer los datos).
 */
(function (root) {
  const WAB = root.WAB;

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a += 0x6D2B79F5;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dayOffset = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return d; };
  const ts = (daysAgo, h = 10, m = 0) => { const d = dayOffset(-daysAgo); d.setHours(h, m, 0, 0); return d.toISOString(); };
  const minsAgo = (min) => new Date(Date.now() - min * 60000).toISOString();

  const CATEGORIES = [
    { id: 'cat_alim', nombre: 'Alimentos', color: '#e0612f', icon: 'package' },
    { id: 'cat_acc', nombre: 'Accesorios', color: '#2a78d6', icon: 'tag' },
    { id: 'cat_hig', nombre: 'Higiene', color: '#159a6b', icon: 'sparkles' },
    { id: 'cat_jug', nombre: 'Juguetes', color: '#c98500', icon: 'smile' },
    { id: 'cat_far', nombre: 'Farmacia', color: '#6250d6', icon: 'shield' }
  ];

  const PRODUCTS = [
    ['prd_01', 'Alimento Pro Adulto 3 kg', 'cat_alim', 285, 'Croquetas balanceadas para perros adultos de raza mediana. Con proteína de pollo y arroz.', ['Perro adulto', 'Perro cachorro'], 24, 0, true],
    ['prd_02', 'Alimento Felino Indoor 1,5 kg', 'cat_alim', 210, 'Fórmula para gatos de interior con control de bolas de pelo.', [], 18, 10, true],
    ['prd_03', 'Snacks dentales x 7', 'cat_alim', 42, 'Premios masticables que ayudan a reducir el sarro.', ['Pequeño', 'Mediano'], 60, 0, false],
    ['prd_04', 'Collar ajustable reflectivo', 'cat_acc', 45, 'Collar de nylon con banda reflectiva y hebilla de seguridad.', ['S', 'M', 'L'], 35, 0, false],
    ['prd_05', 'Correa retráctil 5 m', 'cat_acc', 120, 'Correa con freno de un botón para perros de hasta 25 kg.', [], 12, 15, true],
    ['prd_06', 'Cama acolchada lavable', 'cat_acc', 260, 'Cama ovalada con relleno siliconado y funda removible.', ['M', 'L'], 7, 0, false],
    ['prd_07', 'Transportadora rígida', 'cat_acc', 380, 'Transportadora aprobada para viajes, con ventilación lateral.', [], 3, 0, false],
    ['prd_08', 'Shampoo de avena 500 ml', 'cat_hig', 58, 'Shampoo hipoalergénico para piel sensible.', [], 40, 0, false],
    ['prd_09', 'Arena sanitaria aglomerante 10 kg', 'cat_hig', 95, 'Arena con control de olores y alta absorción.', [], 22, 0, false],
    ['prd_10', 'Pelota dental de goma', 'cat_jug', 35, 'Juguete resistente con relieve para limpieza dental.', [], 50, 0, false],
    ['prd_11', 'Rascador torre 90 cm', 'cat_jug', 340, 'Rascador con dos niveles, cueva y juguete colgante.', [], 0, 0, false],
    ['prd_12', 'Cuerda trenzada para tirar', 'cat_jug', 28, 'Cuerda de algodón para juego y limpieza dental.', [], 45, 20, false],
    ['prd_13', 'Pipeta antipulgas', 'cat_far', 75, 'Protección mensual contra pulgas y garrapatas.', ['Hasta 10 kg', '10 a 25 kg', 'Más de 25 kg'], 30, 0, true],
    ['prd_14', 'Desparasitante oral', 'cat_far', 48, 'Comprimido de amplio espectro. Requiere indicación veterinaria.', [], 26, 0, false]
  ].map(([id, nombre, categoria, precio, descripcion, variantes, stock, promo, destacado]) => ({ id, nombre, categoria, precio, descripcion, variantes, stock, promo, destacado, activo: true, sku: id.replace('prd_', 'PF-') }));

  const SERVICES = [
    { id: 'svc_01', nombre: 'Consulta general', duracion: 30, precio: 120, descripcion: 'Revisión clínica completa, peso y recomendaciones.', activo: true },
    { id: 'svc_02', nombre: 'Vacunación', duracion: 20, precio: 90, descripcion: 'Aplicación de vacunas según calendario y edad.', activo: true },
    { id: 'svc_03', nombre: 'Baño y peluquería', duracion: 60, precio: 110, descripcion: 'Baño, secado, corte de uñas y corte de pelo.', activo: true },
    { id: 'svc_04', nombre: 'Desparasitación', duracion: 15, precio: 60, descripcion: 'Desparasitación interna con control de peso.', activo: true },
    { id: 'svc_05', nombre: 'Ecografía', duracion: 40, precio: 220, descripcion: 'Ecografía abdominal con informe el mismo día.', activo: true },
    { id: 'svc_06', nombre: 'Control postoperatorio', duracion: 20, precio: 0, descripcion: 'Control sin costo dentro de los 15 días posteriores a la cirugía.', activo: true }
  ];

  const AGENTS = [
    { id: 'ag_1', nombre: 'Daniela Rojas', rol: 'Recepción', estado: 'disponible', correo: 'daniela@patitas.bo' },
    { id: 'ag_2', nombre: 'Marco Antezana', rol: 'Ventas', estado: 'disponible', correo: 'marco@patitas.bo' },
    { id: 'ag_3', nombre: 'Lucía Vargas', rol: 'Veterinaria', estado: 'ocupada', correo: 'lucia@patitas.bo' },
    { id: 'ag_4', nombre: 'Jorge Mamani', rol: 'Administración', estado: 'ausente', correo: 'jorge@patitas.bo' }
  ];

  const NAMES = [
    ['Mariana Gutiérrez', 'Luna'], ['Carlos Quispe', 'Rocky'], ['Valeria Suárez', 'Milo'], ['Andrés Flores', 'Toby'], ['Paola Mendoza', 'Nala'],
    ['Diego Céspedes', 'Max'], ['Camila Rivero', 'Kira'], ['Fernando Arce', 'Simba'], ['Gabriela Torrico', 'Coco'], ['Javier Salazar', 'Bruno'],
    ['Lucía Montaño', 'Mía'], ['Rodrigo Pinto', 'Thor'], ['Natalia Aguilar', 'Lola'], ['Sebastián Ortiz', 'Zeus'], ['Daniela Peña', 'Canela'],
    ['Miguel Choque', 'Tommy'], ['Andrea Villarroel', 'Frida'], ['Pablo Rojas', 'Oreo'], ['Sofía Claure', 'Chispa'], ['Ricardo Saavedra', 'Bobby'],
    ['Verónica Lazo', 'Pelusa'], ['Hugo Zambrana', 'Duque'], ['Carla Justiniano', 'Bella'], ['Óscar Vaca', 'Chester']
  ];
  const TAGS = ['perro', 'gato', 'vacunas', 'cliente frecuente', 'tienda', 'peluquería', 'nuevo', 'anuncio'];
  const STATUSES = ['prospecto', 'calificado', 'cliente', 'inactivo'];
  const SOURCES = ['WhatsApp', 'Anuncio Facebook', 'Tienda web', 'Referido', 'Instagram'];

  function seed() {
    const r = rng(20261021);
    const pick = (arr) => arr[Math.floor(r() * arr.length)];
    const id = (p, i) => `${p}_${String(i).padStart(3, '0')}`;

    const contacts = NAMES.map(([nombre, mascota], i) => {
      const status = i < 3 ? 'prospecto' : STATUSES[Math.floor(r() * STATUSES.length)];
      const tags = Array.from(new Set([i % 3 === 0 ? 'gato' : 'perro', pick(TAGS), ...(r() > 0.6 ? [pick(TAGS)] : [])]));
      return {
        id: id('ct', i + 1), nombre, mascota,
        telefono: `+591 7${Math.floor(1000000 + r() * 8999999)}`,
        correo: r() > 0.4 ? `${nombre.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}.${nombre.split(' ')[1].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}@mail.com` : '',
        estado: status,
        etiquetas: tags,
        fuente: pick(SOURCES),
        consentimiento: r() > 0.12,
        notas: i % 4 === 0 ? [{ id: id('nt', i), texto: `${mascota} es alérgico a algunos shampoos; usar línea hipoalergénica.`, autor: 'Lucía Vargas', fecha: ts(6 + i % 5, 15) }] : [],
        creado: ts(5 + Math.floor(r() * 120), 9 + Math.floor(r() * 8)),
        ultimoContacto: ts(Math.floor(r() * 12), 8 + Math.floor(r() * 10), Math.floor(r() * 59)),
        valor: Math.round(r() * 1800)
      };
    });

    // Conversaciones de ejemplo
    const convScripts = [
      { c: 0, mode: 'pendiente', agent: null, tags: ['vacunas'], unread: 2, msgs: [['user', 'Hola, mi gata Luna necesita la vacuna triple felina'], ['bot', 'Hola Mariana, puedo ayudarle a reservar. ¿Desea agendar la vacunación?'], ['user', 'Sí, pero quiero saber si la puedo traer con la otra gatita en la misma cita'], ['system', 'El cliente solicitó hablar con un asesor'], ['user', '¿Me pueden confirmar por favor?']], mins: 4 },
      { c: 1, mode: 'humano', agent: 'ag_2', tags: ['tienda'], unread: 0, msgs: [['user', '¿Tienen la correa retráctil en stock?'], ['bot', 'Sí, la Correa retráctil 5 m está disponible a Bs 102 (15% de descuento).'], ['user', 'Quiero 2, ¿hacen envío a Equipetrol?'], ['agent', 'Hola Carlos, soy Marco. Sí, el envío a Equipetrol cuesta Bs 15 y llega hoy mismo.'], ['user', 'Perfecto, ¿puedo pagar con QR?']], mins: 12 },
      { c: 2, mode: 'bot', agent: null, tags: ['peluquería'], unread: 0, msgs: [['user', 'Hola'], ['bot', 'Hola, bienvenido a Patitas Felices. ¿En qué podemos ayudarle?'], ['user', 'Baño y peluquería'], ['bot', 'Baño y peluquería: Bs 110, duración aproximada de 60 minutos. ¿Desea reservar?'], ['user', 'Reservar'], ['bot', 'Cita confirmada para mañana a las 10:00. Le enviaremos un recordatorio.']], mins: 35 },
      { c: 3, mode: 'pendiente', agent: null, tags: ['perro'], unread: 1, msgs: [['user', 'Mi perro está vomitando desde la mañana, ¿qué hago?'], ['bot', 'Lamento que Toby no se sienta bien. Por seguridad le comunico con nuestra veterinaria de turno.'], ['system', 'Transferido a un asesor por palabra clave: urgencia']], mins: 2 },
      { c: 4, mode: 'bot', agent: null, tags: ['tienda'], unread: 0, msgs: [['user', '¿Cuánto cuesta el alimento para gato?'], ['bot', 'El Alimento Felino Indoor 1,5 kg cuesta Bs 189 con 10% de descuento esta semana.'], ['user', 'Gracias']], mins: 90 },
      { c: 5, mode: 'humano', agent: 'ag_1', tags: ['vacunas', 'cliente frecuente'], unread: 0, msgs: [['user', 'Necesito reprogramar la cita de Max'], ['agent', 'Claro Diego, ¿qué día le acomoda mejor?'], ['user', 'El jueves en la tarde']], mins: 140 },
      { c: 6, mode: 'cerrada', agent: 'ag_3', tags: ['gato'], unread: 0, msgs: [['user', '¿Los resultados de la ecografía ya están?'], ['agent', 'Sí Camila, todo salió normal. Le envié el informe a su correo.'], ['user', 'Muchas gracias doctora']], mins: 60 * 26 },
      { c: 7, mode: 'bot', agent: null, tags: ['anuncio'], unread: 0, msgs: [['user', 'Vi su anuncio de baño a domicilio'], ['bot', 'Por ahora el baño se realiza en nuestra clínica. ¿Desea reservar un horario?']], mins: 60 * 5 },
      { c: 8, mode: 'cerrada', agent: 'ag_2', tags: ['tienda'], unread: 0, msgs: [['user', 'Ya hice el pago del pedido'], ['agent', 'Recibido Gabriela, su pedido sale hoy a las 15:00.']], mins: 60 * 30 },
      { c: 9, mode: 'bot', agent: null, tags: ['perro'], unread: 0, msgs: [['user', '¿A qué hora abren el sábado?'], ['bot', 'Los sábados atendemos de 09:00 a 13:00.']], mins: 60 * 48 }
    ];
    const conversations = convScripts.map((s, i) => {
      const ct = contacts[s.c];
      const n = s.msgs.length;
      return {
        id: id('cv', i + 1), contactId: ct.id, estado: s.mode, asesor: s.agent, etiquetas: s.tags, noLeidos: s.unread,
        notas: i === 1 ? [{ id: 'nt_cv2', texto: 'Cliente pide factura a nombre de su empresa.', autor: 'Marco Antezana', fecha: minsAgo(10) }] : [],
        actualizado: minsAgo(s.mins),
        mensajes: s.msgs.map(([from, text], k) => ({
          id: id(`m${i}`, k), from, ts: minsAgo(s.mins + (n - k) * 3),
          sender: from === 'agent' ? (AGENTS.find((a) => a.id === s.agent) || {}).nombre : undefined,
          payload: from === 'system' ? { type: 'system', text } : { type: 'text', text: { body: text } }
        }))
      };
    });

    // Citas: de -10 a +14 días
    const appointments = [];
    let apIdx = 1;
    for (let d = -10; d <= 14; d++) {
      const date = dayOffset(d);
      const wd = date.getDay();
      if (wd === 0) continue;
      const count = wd === 6 ? 1 + Math.floor(r() * 2) : 1 + Math.floor(r() * 3);
      const used = new Set();
      for (let k = 0; k < count; k++) {
        const hour = wd === 6 ? 9 + Math.floor(r() * 3) : 9 + Math.floor(r() * 8);
        const min = r() > 0.5 ? '30' : '00';
        const hora = `${pad(hour)}:${min}`;
        if (used.has(hora)) continue;
        used.add(hora);
        const svc = pick(SERVICES);
        let estado;
        if (d < 0) estado = r() > 0.85 ? 'no_asistio' : r() > 0.9 ? 'cancelada' : 'completada';
        else if (d === 0) estado = 'confirmada';
        else estado = r() > 0.3 ? 'confirmada' : 'pendiente';
        appointments.push({
          id: id('ap', apIdx++), servicioId: svc.id, contactId: pick(contacts).id, fecha: iso(date), hora,
          estado, canal: r() > 0.2 ? 'WhatsApp' : 'Presencial', notas: '', recordatorio: d <= 1 && d >= 0,
          creado: ts(Math.max(0, -d + 3), 11)
        });
      }
    }

    // Pedidos
    const ORDER_STATES = ['nuevo', 'pago_revision', 'pagado', 'preparando', 'enviado', 'listo_retiro', 'entregado', 'entregado', 'entregado', 'cancelado'];
    const orders = [];
    for (let i = 0; i < 16; i++) {
      const ct = contacts[(i * 5) % contacts.length];
      const nItems = 1 + Math.floor(r() * 3);
      const items = [];
      for (let k = 0; k < nItems; k++) {
        const p = PRODUCTS[Math.floor(r() * PRODUCTS.length)];
        if (items.find((x) => x.productId === p.id)) continue;
        const price = Math.round(p.precio * (1 - p.promo / 100));
        items.push({ productId: p.id, nombre: p.nombre, variante: p.variantes.length ? pick(p.variantes) : '', cantidad: 1 + Math.floor(r() * 2), precio: price });
      }
      const subtotal = items.reduce((s, x) => s + x.precio * x.cantidad, 0);
      const delivery = r() > 0.45;
      const estado = i < 3 ? ['nuevo', 'pago_revision', 'pago_revision'][i] : ORDER_STATES[Math.floor(r() * ORDER_STATES.length)];
      const envio = delivery ? (subtotal >= 300 ? 0 : 15) : 0;
      const daysAgo = i < 3 ? 0 : Math.floor(i / 1.4);
      const created = ts(daysAgo, 9 + (i % 9), (i * 7) % 60);
      const flow = ['nuevo', 'pago_revision', 'pagado', 'preparando', delivery ? 'enviado' : 'listo_retiro', 'entregado'];
      const reached = estado === 'cancelado' ? ['nuevo', 'cancelado'] : flow.slice(0, flow.indexOf(estado === 'listo_retiro' || estado === 'enviado' ? (delivery ? 'enviado' : 'listo_retiro') : estado) + 1);
      orders.push({
        id: id('or', i + 1), numero: 1048 - i, contactId: ct.id, items, subtotal, envio, total: subtotal + envio,
        entrega: delivery ? { tipo: 'delivery', direccion: pick(['Av. San Martín #340, Equipetrol', 'Calle Libertad #85, Centro', 'Barrio Las Palmas, calle 4 #12', 'Av. Banzer 4to anillo, Cond. Los Olivos']) } : { tipo: 'retiro', direccion: 'Sucursal Av. Busch' },
        pago: { metodo: 'QR', estado: estado === 'nuevo' ? 'pendiente' : estado === 'pago_revision' ? 'en_revision' : estado === 'cancelado' ? 'rechazado' : 'aprobado', comprobante: estado !== 'nuevo' && estado !== 'cancelado' },
        estado: estado === 'listo_retiro' && delivery ? 'enviado' : estado === 'enviado' && !delivery ? 'listo_retiro' : estado,
        origen: r() > 0.3 ? 'WhatsApp' : 'Tienda web',
        creado: created,
        historial: reached.map((s, k) => ({ estado: s, fecha: new Date(new Date(created).getTime() + k * 3600000 * 3).toISOString() }))
      });
    }

    const templates = [
      { id: 'tp_1', nombre: 'recordatorio_cita', categoria: 'UTILITY', idioma: 'es', estado: 'APPROVED', encabezado: 'Recordatorio de cita', cuerpo: 'Hola {{1}}, le recordamos la cita de {{2}} mañana a las {{3}} en Patitas Felices. Responda CONFIRMAR o REPROGRAMAR.', pie: 'Patitas Felices · Av. Busch', botones: ['Confirmar', 'Reprogramar'], variables: ['nombre', 'mascota', 'hora'] },
      { id: 'tp_2', nombre: 'pedido_enviado', categoria: 'UTILITY', idioma: 'es', estado: 'APPROVED', encabezado: 'Su pedido va en camino', cuerpo: 'Hola {{1}}, su pedido #{{2}} salió de nuestra tienda y llegará en aproximadamente {{3}}.', pie: '', botones: ['Ver pedido'], variables: ['nombre', 'numero', 'tiempo'] },
      { id: 'tp_3', nombre: 'promo_mes_mascota', categoria: 'MARKETING', idioma: 'es', estado: 'APPROVED', encabezado: 'Mes de la mascota', cuerpo: '{{1}}, este mes {{2}} tiene 15% de descuento en baño y peluquería. Reserve su turno respondiendo a este mensaje.', pie: 'Responda BAJA para no recibir promociones', botones: ['Reservar turno', 'No me interesa'], variables: ['nombre', 'mascota'] },
      { id: 'tp_4', nombre: 'vacuna_pendiente', categoria: 'UTILITY', idioma: 'es', estado: 'APPROVED', encabezado: '', cuerpo: 'Hola {{1}}, a {{2}} le corresponde su refuerzo de vacuna. ¿Desea agendar una cita esta semana?', pie: '', botones: ['Agendar', 'Más tarde'], variables: ['nombre', 'mascota'] },
      { id: 'tp_5', nombre: 'reactivacion_clientes', categoria: 'MARKETING', idioma: 'es', estado: 'PENDING', encabezado: '¡Le extrañamos!', cuerpo: 'Hola {{1}}, hace tiempo no vemos a {{2}}. Le regalamos un control general sin costo en su próxima visita.', pie: 'Responda BAJA para no recibir promociones', botones: ['Agendar control'], variables: ['nombre', 'mascota'] }
    ];

    const campaigns = [
      { id: 'cp_1', nombre: 'Recordatorio de vacunas — octubre', plantillaId: 'tp_4', segmento: { etiquetas: ['vacunas'], estados: [] }, estado: 'enviada', programada: ts(9, 10), enviada: ts(9, 10), stats: { destinatarios: 142, enviados: 142, entregados: 138, leidos: 117, respondidos: 41, fallidos: 4 } },
      { id: 'cp_2', nombre: 'Mes de la mascota — peluquería', plantillaId: 'tp_3', segmento: { etiquetas: ['peluquería', 'perro'], estados: ['cliente'] }, estado: 'enviada', programada: ts(4, 9), enviada: ts(4, 9), stats: { destinatarios: 318, enviados: 318, entregados: 305, leidos: 241, respondidos: 63, fallidos: 13 } },
      { id: 'cp_3', nombre: 'Reactivación clientes inactivos', plantillaId: 'tp_5', segmento: { etiquetas: [], estados: ['inactivo'] }, estado: 'programada', programada: (() => { const d = dayOffset(2); d.setHours(10, 0, 0, 0); return d.toISOString(); })(), stats: { destinatarios: 87, enviados: 0, entregados: 0, leidos: 0, respondidos: 0, fallidos: 0 } },
      { id: 'cp_4', nombre: 'Lanzamiento línea gatos', plantillaId: 'tp_3', segmento: { etiquetas: ['gato'], estados: [] }, estado: 'borrador', programada: null, stats: { destinatarios: 0, enviados: 0, entregados: 0, leidos: 0, respondidos: 0, fallidos: 0 } }
    ];

    const menus = [
      {
        id: 'main', titulo: 'Menú principal', tipo: 'list', encabezado: 'Patitas Felices',
        cuerpo: '¿En qué podemos ayudarle hoy? Elija una opción del menú.', pie: 'Atención automática 24/7', boton: 'Ver opciones',
        opciones: [
          { id: 'op_1', titulo: 'Agendar una cita', descripcion: 'Consultas, vacunas, peluquería', accion: 'book', seccion: 'Clínica' },
          { id: 'op_2', titulo: 'Servicios y precios', descripcion: 'Conozca nuestros servicios', accion: 'services', seccion: 'Clínica' },
          { id: 'op_3', titulo: 'Tienda de mascotas', descripcion: 'Alimentos, accesorios y más', accion: 'products', seccion: 'Tienda' },
          { id: 'op_4', titulo: 'Mi carrito', descripcion: 'Revise y confirme su pedido', accion: 'cart', seccion: 'Tienda' },
          { id: 'op_5', titulo: 'Mis citas y pedidos', descripcion: 'Estado y seguimiento', accion: 'orders', seccion: 'Mi cuenta' },
          { id: 'op_6', titulo: 'Preguntas frecuentes', descripcion: 'Horarios, pagos, envíos', accion: 'menu', destino: 'faq', seccion: 'Ayuda' },
          { id: 'op_7', titulo: 'Consultar a la IA', descripcion: 'Escriba su pregunta libremente', accion: 'ai', seccion: 'Ayuda' },
          { id: 'op_8', titulo: 'Hablar con un asesor', descripcion: 'Atención humana', accion: 'agent', seccion: 'Ayuda' }
        ]
      },
      {
        id: 'faq', titulo: 'Preguntas frecuentes', tipo: 'buttons', encabezado: '',
        cuerpo: 'Elija un tema o escriba su pregunta.', pie: '', boton: '',
        opciones: [
          { id: 'op_9', titulo: 'Horarios', descripcion: '', accion: 'reply', respuesta: 'Atendemos de lunes a viernes de 08:30 a 18:30 y sábados de 09:00 a 13:00. Emergencias: llame al +591 70000000.' },
          { id: 'op_10', titulo: 'Ubicación', descripcion: '', accion: 'reply', respuesta: 'Estamos en Av. Busch #1250, entre 2do y 3er anillo, Santa Cruz de la Sierra. Contamos con parqueo para clientes.' },
          { id: 'op_11', titulo: 'Formas de pago', descripcion: '', accion: 'reply', respuesta: 'Aceptamos efectivo, tarjetas y pago con QR. Para pedidos por WhatsApp enviamos un QR al confirmar.' }
        ]
      }
    ];

    const autoReplies = [
      { id: 'ar_1', claves: 'horario, horarios, a qué hora abren, hora de atención', respuesta: 'Atendemos de lunes a viernes de 08:30 a 18:30 y sábados de 09:00 a 13:00.', activo: true, coincidencias: 128 },
      { id: 'ar_2', claves: 'ubicación, dirección, dónde están, donde quedan', respuesta: 'Estamos en Av. Busch #1250, entre 2do y 3er anillo. ¿Desea que le envíe la ubicación?', activo: true, coincidencias: 74 },
      { id: 'ar_3', claves: 'gracias, muchas gracias', respuesta: '¡Con gusto! Escriba "menú" cuando necesite algo más.', activo: true, coincidencias: 211 }
    ];

    const ai = {
      activo: true, nombre: 'Luna', tono: 'cercano', longitud: 'breve', usarEmojis: false,
      instrucciones: 'Eres el asistente de Patitas Felices. Responde en español, con amabilidad y precisión. No des diagnósticos médicos: ante síntomas, deriva a la veterinaria de turno.',
      empresa: 'Patitas Felices es una clínica veterinaria y tienda de mascotas en Santa Cruz de la Sierra. Dirección: Av. Busch #1250. Horario: lunes a viernes 08:30 a 18:30, sábados 09:00 a 13:00. Envíos a domicilio en la ciudad por Bs 15, gratis desde Bs 300. Pagos con QR, efectivo y tarjeta.',
      conocimiento: [
        { id: 'kb_1', titulo: 'Política de envíos', contenido: 'Los envíos dentro del 4to anillo llegan el mismo día si el pedido se confirma antes de las 15:00. Fuera del 4to anillo, al día siguiente. Costo Bs 15, gratis desde Bs 300.', claves: 'envío, delivery, entrega, domicilio, llega' },
        { id: 'kb_2', titulo: 'Vacunas para cachorros', contenido: 'Los cachorros reciben la primera vacuna a las 6 semanas y refuerzos cada 3 a 4 semanas hasta los 4 meses. Luego, refuerzo anual.', claves: 'vacuna, cachorro, calendario, refuerzo' },
        { id: 'kb_3', titulo: 'Preparación para cirugía', contenido: 'La mascota debe tener ayuno de 8 horas de comida y 2 horas de agua. Traer carnet de vacunas.', claves: 'cirugía, operación, ayuno, esterilización' },
        { id: 'kb_4', titulo: 'Cambios y devoluciones', contenido: 'Los productos sin abrir pueden cambiarse dentro de 7 días con la nota de venta. Alimentos abiertos no tienen cambio.', claves: 'cambio, devolución, garantía, devolver' }
      ],
      faqs: [
        { id: 'fq_1', pregunta: '¿Atienden emergencias?', respuesta: 'Atendemos emergencias en horario de atención. Fuera de horario, llame al número de guardia +591 70000000.', claves: 'emergencia, urgencia, noche, guardia' },
        { id: 'fq_2', pregunta: '¿Necesito cita para peluquería?', respuesta: 'Sí, recomendamos reservar porque los turnos de peluquería se llenan rápido, sobre todo los sábados.', claves: 'peluquería, baño, cita, turno' },
        { id: 'fq_3', pregunta: '¿Venden alimento para gatos?', respuesta: 'Sí, tenemos alimento felino para interior, cachorros y adultos. Escriba "tienda" para ver el catálogo.', claves: 'gato, felino, alimento, comida' }
      ],
      limites: { porConversacion: 10, mensual: 3000, usadoMes: 1240, alertaPorcentaje: 80 },
      transferencia: { claves: 'asesor, humano, persona, reclamo, queja, urgente, vomitando, sangre', umbral: 35, mensaje: 'Le comunico con una persona de nuestro equipo para ayudarle mejor.' },
      memoria: true
    };

    const settings = {
      negocio: { nombre: 'Patitas Felices', rubro: 'Veterinaria y pet shop', telefono: '+591 70000000', correo: 'hola@patitasfelices.bo', direccion: 'Av. Busch #1250, Santa Cruz de la Sierra', tipoCambio: 6.96, color: '#0c9467' },
      whatsapp: { estado: 'conectado', numero: '+591 70000000', nombreVisible: 'Patitas Felices', phoneNumberId: '1098765432101234', wabaId: '2233445566778899', webhook: 'https://api.patitasfelices.bo/webhooks/whatsapp', verifyToken: 'pf_verify_2026', calidad: 'Alta', limiteMensajes: '1.000 conversaciones/día' },
      bot: { activo: true, bienvenida: '¡Hola! Bienvenido a Patitas Felices, clínica veterinaria y tienda de mascotas. Soy Luna, su asistente virtual.', fueraHorario: 'Estamos fuera de horario, pero puede agendar, comprar o dejar su consulta y le responderemos a primera hora.', despedida: 'Gracias por escribirnos. ¡Que tenga un lindo día!' },
      tienda: { nombre: 'Patitas Felices Shop', color: '#0c9467', envio: 15, envioGratisDesde: 300, banco: 'Banco Ejemplo · Cta. 100-2003004', mensajeQR: 'Escanee el QR desde la app de su banco y envíe el comprobante por este chat.', slogan: 'Todo para su mascota, con envío el mismo día' },
      agenda: {
        horario: { 1: { on: true, de: '08:30', a: '18:30' }, 2: { on: true, de: '08:30', a: '18:30' }, 3: { on: true, de: '08:30', a: '18:30' }, 4: { on: true, de: '08:30', a: '18:30' }, 5: { on: true, de: '08:30', a: '18:30' }, 6: { on: true, de: '09:00', a: '13:00' }, 0: { on: false, de: '09:00', a: '12:00' } },
        intervalo: 30, anticipacionHoras: 2, autoConfirmar: true, recordatorio24: true, recordatorio2: true, diasMaximos: 21,
        pedirNotas: true
      }
    };

    // Serie diaria (90 días) para dashboard y reportes
    const daily = [];
    for (let d = 89; d >= 0; d--) {
      const date = dayOffset(-d);
      const wd = date.getDay();
      const base = wd === 0 ? 0.45 : wd === 6 ? 0.75 : 1;
      const trend = 1 + (89 - d) * 0.004;
      const conv = Math.round((42 + r() * 18) * base * trend);
      const ia = Math.round(conv * (0.52 + r() * 0.12));
      const humano = Math.round(conv * (0.16 + r() * 0.08));
      daily.push({
        fecha: iso(date), conversaciones: conv, mensajesEnviados: Math.round(conv * (5.2 + r() * 1.6)), clientesNuevos: Math.round(conv * (0.18 + r() * 0.08)),
        ia, humano, menu: Math.max(0, conv - ia - humano), citas: Math.round((5 + r() * 6) * base), ventas: Math.round((900 + r() * 1400) * base * trend),
        pedidos: Math.round((4 + r() * 6) * base), respuestaBot: +(1.5 + r() * 1.5).toFixed(1), respuestaHumano: +(3 + r() * 6).toFixed(1)
      });
    }

    return {
      version: 4, creado: new Date().toISOString(),
      settings, menus, autoReplies, ai, services: SERVICES.map((s) => Object.assign({}, s)), categories: CATEGORIES.map((c) => Object.assign({}, c)),
      products: PRODUCTS.map((p) => Object.assign({}, p, { variantes: p.variantes.slice() })), contacts, agents: AGENTS.map((a) => Object.assign({}, a)),
      conversations, appointments, orders, templates, campaigns, daily, navLog: [], aiLog: []
    };
  }

  /** Imagen SVG generada para un producto (sin archivos externos). */
  function productImage(product, categories) {
    const cat = (categories || []).find((c) => c.id === product.categoria) || { color: '#667085', icon: 'package' };
    if (product.imagen) return product.imagen;
    const svgIcon = WAB.icon(cat.icon).replace('class="icon"', 'x="70" y="58" width="60" height="60" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"').replace('aria-hidden="true"', '');
    const initials = product.nombre.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${cat.color}" stop-opacity=".95"/><stop offset="1" stop-color="${cat.color}" stop-opacity=".62"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/><circle cx="160" cy="36" r="56" fill="#fff" opacity=".08"/><circle cx="30" cy="180" r="70" fill="#000" opacity=".06"/>${svgIcon}<text x="100" y="160" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="22" font-weight="700" fill="#fff" opacity=".9">${initials}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  WAB.seed = seed;
  WAB.productImage = productImage;
})(window);
