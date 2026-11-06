/*
 * CorePoints · seed.js
 * Datos de demostración ficticios. Se construyen ejecutando las operaciones reales
 * (registrar, aprobar, canjear…) en orden cronológico, con fechas relativas a hoy,
 * para que saldos, lotes, movimientos y notificaciones sean coherentes entre sí.
 * Las fotos de boletas se dibujan en un canvas y se guardan en IndexedDB.
 */
(function () {
  'use strict';
  const CP = (window.CP = window.CP || {});
  const u = CP.util;

  const SELLERS = [
    ['Andrea Rojas', 'V-AR01', '59171234501'],
    ['Camila Suárez', 'V-CS02', '59171234502'],
    ['Valeria Mendoza', 'V-VM03', '59171234503'],
    ['Daniela Flores', 'V-DF04', '59171234504'],
    ['Paola Gutiérrez', 'V-PG05', '59171234505']
  ];
  const CUSTOMERS = [
    ['Luis Fernando Quispe', '59176011201', 'luisf.quispe@example.com'],
    ['Mariana Choque Vargas', '59177022302', 'mariana.choque@example.com'],
    ['Diego Alejandro Mamani', '59169033403', ''],
    ['Sofía Gabriela Rocha', '59178044504', 'sofi.rocha@example.com'],
    ['Jorge Andrés Villca', '59172055605', 'jorge.villca@example.com'],
    ['Natalia Herrera Pinto', '59175066706', ''],
    ['Rodrigo Céspedes', '59179077807', 'rodrigo.cespedes@example.com'],
    ['Camila Antezana', '59167088908', 'cami.antezana@example.com'],
    ['Bruno Saavedra', '59173099009', ''],
    ['Valentina Ortiz Justiniano', '59174010110', 'vale.ortiz@example.com']
  ];
  const REWARDS = [
    ['Mouse gamer RGB 12.400 DPI', 'Mouse ergonómico con sensor óptico de 12.400 DPI, 7 botones programables e iluminación RGB.', 'Periféricos', 'producto', 350, 8, 'mouse', 'Sujeto a disponibilidad de color. Garantía de 6 meses.', true],
    ['Teclado mecánico TKL switches rojos', 'Teclado tenkeyless con switches lineales, keycaps doble inyección y retroiluminación RGB.', 'Periféricos', 'producto', 900, 4, 'keyboard', 'Distribución en español. Garantía de 6 meses.', true],
    ['Audífonos gamer 7.1', 'Sonido envolvente virtual 7.1, micrófono desmontable con cancelación de ruido y almohadillas de espuma viscoelástica.', 'Audio', 'producto', 750, 5, 'headset', 'Compatibles con PC, PS5 y celular.', true],
    ['Mousepad XL CatCore 90×40', 'Mousepad extendido con base antideslizante, bordes cosidos y diseño exclusivo CatCore.', 'Accesorios', 'producto', 200, 15, 'mousepad', '', true],
    ['Memoria USB 64 GB 3.2', 'Flash drive USB 3.2 de 64 GB con carcasa metálica y velocidades de lectura de hasta 150 MB/s.', 'Almacenamiento', 'producto', 150, 20, 'usb', '', false],
    ['Hub USB-C 6 en 1', 'HDMI 4K, 3 puertos USB 3.0, lector SD/microSD y carga PD de 100 W.', 'Accesorios', 'producto', 300, 6, 'hub', '', false],
    ['Limpieza profesional de PC', 'Limpieza interna de polvo, revisión de ventiladores y orden de cables para PC de escritorio o laptop.', 'Servicio técnico', 'servicio', 250, null, 'cleaning', 'Previa cita por WhatsApp. Entrega en 24–48 h.', true],
    ['Mantenimiento preventivo completo', 'Limpieza profunda, cambio de pasta térmica, actualización de drivers y diagnóstico de rendimiento.', 'Servicio técnico', 'servicio', 450, null, 'tools', 'Previa cita. No incluye repuestos.', false],
    ['Instalación de componentes', 'Instalamos tu RAM, SSD, GPU o fuente comprados en CatCore, con prueba de funcionamiento.', 'Servicio técnico', 'servicio', 180, null, 'chip', 'Solo componentes adquiridos en CatCore.', false],
    ['Pasta térmica premium 4 g', 'Compuesto térmico de alta conductividad (12,5 W/mK) para CPU y GPU.', 'Accesorios', 'producto', 120, 25, 'paste', '', false],
    ['Webcam Full HD 1080p', 'Cámara 1080p a 30 fps con micrófono estéreo y enfoque automático, ideal para streaming.', 'Periféricos', 'producto', 600, 3, 'webcam', '', false],
    ['Kit 3 ventiladores ARGB 120 mm', 'Tres ventiladores ARGB con controlador y control remoto. Instalación gratuita en tienda.', 'Accesorios', 'producto', 400, 0, 'fan', 'Instalación incluida si se retira en tienda.', false]
  ];
  // [cliente, días atrás, monto, producto, vendedora, estado final, días hasta revisión]
  const PURCHASES = [
    [0, 420, 8249, 'Laptop Lenovo IdeaPad Slim 3 Ryzen 5', 0, 'aprobada', 1],
    [1, 395, 12165, 'Laptop HP Victus Gaming 15 Ryzen 7', 1, 'aprobada', 2],
    [2, 350, 6891, 'Laptop HP 15-fc0025wm Ryzen 5', 2, 'aprobada', 1],
    [3, 340, 2450, 'Procesador AMD Ryzen 7 5700X', 0, 'aprobada', 1],
    [4, 300, 17718, 'Laptop HP OMEN 16 Core Ultra 7', 1, 'aprobada', 1],
    [0, 240, 3200, 'Combo Gamer Start (gabinete + fuente 650 W)', 3, 'aprobada', 2],
    [5, 210, 9793, 'Laptop HP Victus 15-FA2082wm', 4, 'aprobada', 1],
    [6, 180, 1350, 'Kit teclado + mouse HyperX', 2, 'rechazada', 1, 'Boleta ilegible o incompleta', 'La foto salió desenfocada; no se leen el número ni el total. Vuelva a enviarla.'],
    [6, 178, 1350, 'Kit teclado + mouse HyperX', 2, 'aprobada', 1],
    [7, 150, 11432, 'Laptop HP OmniBook X Flip 16', 0, 'aprobada', 1],
    [2, 120, 5500, 'Procesador Intel Core Ultra 7 265KF', 3, 'aprobada', 2],
    [8, 95, 8368, 'Laptop HP OmniBook Copilot Ryzen AI 5', 1, 'aprobada', 1],
    [9, 60, 4650, 'Combo Streamer (micrófono + webcam + brazo)', 4, 'aprobada', 1],
    [3, 40, 2650, 'Procesador AMD Ryzen 5 8400F', 2, 'aprobada', 1],
    [4, 25, 900, 'Memoria RAM DDR4 16 GB', 0, 'rechazada', 1, 'Boleta ilegible o incompleta', 'La foto está desenfocada; no se lee el número ni el total.'],
    [1, 12, 7428, 'Laptop HP 15-FD2050WM Core Ultra 5', 1, 'pendiente'],
    [5, 5, 2250, 'Procesador AMD Ryzen 5 5600G', 3, 'pendiente'],
    [8, 3, 6062, 'Laptop HP 16-BU0305DX Core Ultra 5', 4, 'pendiente'],
    [9, 2, 15800, 'Combo Gamer Pro RTX 4060 + Ryzen 7', 0, 'pendiente'],
    [7, 1, 480, 'Mouse Logitech G203', 2, 'rechazada', 0, 'La boleta no corresponde a CatCore', 'La boleta es de otra tienda.']
  ];
  // [cliente, días atrás, recompensa, pasos [acción, días después, nota]]
  const REDEMPTIONS = [
    [0, 300, 0, [['aprobar', 1], ['listo', 2], ['entregar', 4, 'Entregado en tienda']]],
    [4, 200, 1, [['aprobar', 1], ['entregar', 3, 'Retiró en tienda con CI']]],
    [1, 250, 6, [['rechazar', 1, 'Servicio sin cupo en la fecha solicitada; el cliente prefirió otra recompensa.']]],
    [7, 100, 2, [['cancelar', 2, 'Cancelado a pedido del cliente por WhatsApp.']]],
    [5, 30, 7, [['aprobar', 2, 'Cita agendada por WhatsApp']]],
    [2, 10, 3, [['aprobar', 1], ['listo', 2]]],
    [4, 4, 10, []],
    [8, 1, 4, []]
  ];
  const CHAT_FOR = new Set([1, 4, 9, 15, 18]);
  // Datos reales de cada boleta (los "lee" el administrador de la foto al verificar)
  let TRUTH = {};

  function build() {
    const N = CP.now();
    const ago = (d, h) => { const t = u.addDays(N, -d); t.setHours(h == null ? 11 : h, 15 + ((d * 7) % 40), 0, 0); return t; };
    const db = CP.store.empty();
    db.meta.seeded = true;
    db.meta.seededAt = N.toISOString();
    // Simulación en memoria: las funciones reales operan sobre este objeto
    const firstEvent = ago(430, 9);
    SELLERS.forEach((s, i) => db.sellers.push({ id: 'VEN-00' + (i + 1), name: s[0], code: s[1], phone: s[2], active: true, createdAt: firstEvent.toISOString() }));
    REWARDS.forEach((r, i) => db.rewards.push({
      id: 'REC-' + String(i + 1).padStart(3, '0'), name: r[0], description: r[1], category: r[2], type: r[3], cost: r[4], stock: r[5],
      image: 'art:' + r[6], conditions: r[7], featured: r[8], active: i !== 5, createdAt: firstEvent.toISOString()
    }));
    const events = [];
    let receiptSeq = 4380;
    const purchaseIds = [];
    TRUTH = {};
    PURCHASES.forEach((p, i) => {
      const buyDate = ago(p[1], 16);
      const regAt = ago(Math.max(0, p[1] - (i % 3 === 0 ? 1 : 0)), 19 + (i % 3));
      receiptSeq += 7 + (i * 13) % 29;
      const receiptNo = 'NV-' + String(receiptSeq).padStart(6, '0');
      events.push({ t: regAt, run: () => {
        const c = CUSTOMERS[p[0]];
        const res = CP.purchases.register(db, {
          name: c[0], phone: c[1], email: c[2], receiptImg: 'pending-seed', chatImg: CHAT_FOR.has(i) ? 'pending-seed' : null
        }, { at: regAt, force: true });
        purchaseIds[i] = res.purchase.id;
        TRUTH[res.purchase.id] = { receiptNo, date: u.isoDay(buyDate), amount: p[2], product: p[3], sellerId: 'VEN-00' + (p[4] + 1), seedIndex: i };
      } });
      if (p[5] !== 'pendiente') {
        const revAt = new Date(regAt.getTime() + (p[6] || 0) * 864e5 + 3 * 36e5);
        events.push({ t: revAt, run: () => {
          const t = TRUTH[purchaseIds[i]];
          if (p[5] === 'aprobada') CP.purchases.approve(db, purchaseIds[i], { receiptNo: t.receiptNo, date: t.date, validatedAmount: t.amount, sellerId: t.sellerId, product: t.product, actor: 'Administración' }, { at: revAt });
          else CP.purchases.reject(db, purchaseIds[i], { reason: p[7], notes: p[8], actor: 'Administración' }, { at: revAt });
        } });
      }
    });
    const redIds = [];
    REDEMPTIONS.forEach((r, i) => {
      const reqAt = ago(r[1], 12);
      events.push({ t: reqAt, run: () => {
        const cid = CP.customers.findByPhone(db, CUSTOMERS[r[0]][1]).id;
        redIds[i] = CP.redemptions.request(db, cid, 'REC-' + String(r[2] + 1).padStart(3, '0'), { at: reqAt }).id;
      } });
      r[3].forEach((step) => {
        const sAt = new Date(reqAt.getTime() + step[1] * 864e5 + 2 * 36e5);
        events.push({ t: sAt, run: () => CP.redemptions.transition(db, redIds[i], step[0], { note: step[2] || '', actor: 'Administración' }, { at: sAt }) });
      });
    });
    // Ajuste manual auditable
    const adjAt = ago(88, 15);
    events.push({ t: adjAt, run: () => CP.points.adjust(db, { customerId: CP.customers.findByPhone(db, CUSTOMERS[6][1]).id, delta: 100, reason: 'Compensación por demora en la entrega de una garantía', actor: 'Administración', at: adjAt }) });

    events.sort((a, b) => a.t - b.t).forEach((e) => e.run());
    // La notificación más reciente queda sin leer; las antiguas se marcan leídas.
    const cutoff = ago(7);
    db.notifications.forEach((n) => { n.read = new Date(n.at) < cutoff; });
    return db;
  }

  /* ---------------- imágenes de demostración ---------------- */
  function receiptCanvas(db, p, blurry) {
    const W = 760, H = 1040;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const bg = g.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#5b4a3d'); bg.addColorStop(1, '#3a2e26');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) { g.strokeStyle = 'rgba(0,0,0,.08)'; g.beginPath(); g.moveTo(0, i * 18 + (i % 3)); g.lineTo(W, i * 18 + 6); g.stroke(); }
    g.save();
    g.translate(W / 2, H / 2);
    g.rotate((((p.seedIndex || 0) % 5) - 2) * 0.012);
    if (blurry) g.filter = 'blur(3.2px)';
    const pw = 520, ph = 900, x0 = -pw / 2, y0 = -ph / 2;
    g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 28; g.shadowOffsetY = 10;
    g.fillStyle = '#fbfaf6'; g.fillRect(x0, y0, pw, ph);
    g.shadowColor = 'transparent';
    const c = CP.customers.get(db, p.customerId);
    const L = (txt, y, o) => {
      o = o || {};
      g.font = (o.bold ? '700 ' : '400 ') + (o.size || 19) + 'px "Courier New", monospace';
      g.fillStyle = o.color || '#222';
      g.textAlign = o.align || 'left';
      g.fillText(txt, o.align === 'center' ? 0 : o.align === 'right' ? x0 + pw - 34 : x0 + 34, y0 + y);
    };
    g.fillStyle = '#0fb8c4'; g.fillRect(x0, y0, pw, 10);
    L('CATCORE', 70, { bold: true, size: 40, align: 'center', color: '#111' });
    L('Rendimiento que domina', 100, { align: 'center', size: 17, color: '#555' });
    L('Equipos · Componentes · Servicio', 126, { align: 'center', size: 15, color: '#777' });
    L('-'.repeat(40), 160, { color: '#999' });
    L('NOTA DE VENTA', 196, { bold: true, size: 24, align: 'center' });
    L('Nº ' + p.receiptNo, 228, { align: 'center', size: 22, bold: true, color: '#c2185b' });
    const d = u.fromIsoDay(p.date);
    L('Fecha:   ' + String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(), 280);
    L('Cliente: ' + (c ? c.name : '').slice(0, 26), 310);
    L('Atendió: ' + CP.sellers.name(db, p.sellerId), 340);
    L('-'.repeat(40), 374, { color: '#999' });
    L('CANT  DESCRIPCIÓN', 404, { bold: true, size: 17 });
    const words = p.product.split(' ');
    let line = '', y = 436;
    words.forEach((w) => { if ((line + ' ' + w).length > 30) { L((y === 436 ? ' 1    ' : '      ') + line.trim(), y); y += 28; line = ''; } line += ' ' + w; });
    L((y === 436 ? ' 1    ' : '      ') + line.trim(), y);
    y += 40;
    L('Subtotal', y); L(u.bs(p.amount), y, { align: 'right' });
    L('Descuento', y + 30); L('Bs 0,00', y + 30, { align: 'right' });
    L('-'.repeat(40), y + 62, { color: '#999' });
    L('TOTAL', y + 100, { bold: true, size: 28 }); L(u.bs(p.amount), y + 100, { bold: true, size: 28, align: 'right' });
    L('Pago: ' + (['QR', 'Efectivo', 'Transferencia', 'Tarjeta'][(p.seedIndex || 0) % 4]), y + 146, { size: 17, color: '#444' });
    L('Garantía según política de la tienda.', ph - 120, { align: 'center', size: 15, color: '#666' });
    L('¡Gracias por su compra!', ph - 84, { align: 'center', bold: true, size: 20 });
    L('catcorebo.com', ph - 52, { align: 'center', size: 16, color: '#0fb8c4' });
    g.restore();
    return cv;
  }

  function chatCanvas(db, p) {
    const W = 600, H = 1000;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.fillStyle = '#0b141a'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1f2c34'; g.fillRect(0, 0, W, 92);
    g.fillStyle = '#00a884'; g.beginPath(); g.arc(52, 46, 26, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = '700 22px Segoe UI, Arial'; g.fillText('CatCore · ' + CP.sellers.name(db, p.sellerId).split(' ')[0], 92, 42);
    g.fillStyle = '#8696a0'; g.font = '16px Segoe UI, Arial'; g.fillText('en línea', 92, 66);
    const c = CP.customers.get(db, p.customerId);
    const msgs = [
      [0, 'Hola, buenas tardes 👋 vi en la web: ' + p.product + '. ¿Tienen stock?'],
      [1, '¡Hola ' + (c ? c.name.split(' ')[0] : '') + '! Sí, tenemos disponible. El precio es ' + u.bs(p.amount) + '.'],
      [0, 'Perfecto, paso hoy por la tienda a recogerlo.'],
      [1, 'Te esperamos 😊 Pregunta por mí al llegar.'],
      [0, 'Listo, ya hice la compra. ¡Gracias!'],
      [1, 'Gracias a ti. Registra tu boleta en CorePoints para sumar puntos 🐾']
    ];
    let y = 130;
    g.font = '20px Segoe UI, Arial';
    msgs.forEach((m) => {
      const lines = [];
      let cur = '';
      m[1].split(' ').forEach((w) => { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > 360) { lines.push(cur); cur = w; } else cur = t; });
      lines.push(cur);
      const bw = Math.max(...lines.map((l) => g.measureText(l).width)) + 36, bh = lines.length * 28 + 34;
      const x = m[0] ? 24 : W - bw - 24;
      g.fillStyle = m[0] ? '#202c33' : '#005c4b';
      g.beginPath(); g.roundRect ? g.roundRect(x, y, bw, bh, 14) : g.rect(x, y, bw, bh); g.fill();
      g.fillStyle = '#e9edef';
      lines.forEach((l, k) => g.fillText(l, x + 18, y + 32 + k * 28));
      g.fillStyle = '#8696a0'; g.font = '13px Segoe UI, Arial';
      g.fillText((15 + (y % 4)) + ':' + String(10 + (y % 49)).padStart(2, '0'), x + bw - 52, y + bh - 8);
      g.font = '20px Segoe UI, Arial';
      y += bh + 18;
    });
    return cv;
  }

  const toBlob = (cv) => new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.82));

  async function seedImages() {
    const db = CP.store.db;
    const patches = {};
    for (const p0 of db.purchases) {
      const p = Object.assign({}, p0, TRUTH[p0.id] || {});
      const patch = {};
      if (p.receiptImg === 'pending-seed') {
        const blurry = p0.status === 'rechazada' && /ilegible/i.test(p0.rejectReason || '');
        const blob = await toBlob(receiptCanvas(db, p, blurry));
        patch.receiptImg = await CP.images.put(blob, { name: 'boleta-' + p.id + '.jpg', kind: 'boleta', width: 760, height: 1040, seed: true });
      }
      if (p.chatImg === 'pending-seed') {
        const blob = await toBlob(chatCanvas(db, p));
        patch.chatImg = await CP.images.put(blob, { name: 'chat-' + p.id + '.jpg', kind: 'chat', width: 600, height: 1000, seed: true });
      }
      patches[p0.id] = patch;
    }
    CP.store.tx((d) => { d.purchases.forEach((p) => Object.assign(p, patches[p.id] || {})); d.meta.imagesReady = true; });
  }

  let pending = null;
  CP.seed = {
    build,
    /** Crea los datos de demostración si no existen (o si la versión cambió). */
    ensure() {
      if (CP.store.hasData() && CP.store.db.meta.imagesReady) return Promise.resolve(false);
      // Datos sin imágenes (carga interrumpida): se regenera todo para que cada foto coincida con su boleta.
      return this.reset();
    },
    /** Borra todo (LocalStorage + IndexedDB) y regenera la demostración. */
    async reset() {
      if (pending) await pending.catch(() => {});
      pending = (async () => {
        try { await CP.images.clear(); } catch (e) { console.warn('No se pudo limpiar IndexedDB', e); }
        CP.store.clear();
        CP.store.replace(build());
        await seedImages();
        return true;
      })();
      try { return await pending; } finally { pending = null; }
    }
  };
})();
