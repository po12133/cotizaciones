// Pruebas de interacción de punta a punta en Chrome headless.
// node --experimental-websocket tests/flows.js [carpetaCapturas]
const path = require('path');
const fs = require('fs');
const { serve, launch, sleep } = require('./lib-cdp');

const OUT = path.resolve(process.argv[2] || path.join(__dirname, 'shots'));
const BASE = 'http://127.0.0.1:5181';
let pass = 0, fail = 0;
const ok = (cond, name, extra = '') => { if (cond) { pass++; console.log(`  ✓ ${name}`); } else { fail++; console.log(`  ✗ ${name} ${extra}`); } };

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve(5181);
  const b = await launch({ port: 9334 });
  const ev = (js) => b.eval(js);
  const click = (sel) => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) throw new Error('No existe ${sel.replace(/'/g, '')}'); el.click(); return true; })()`);
  const waitFor = async (js, ms = 6000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(js)) return true; await sleep(150); } return false; };

  console.log('Cotizador');
  await b.goto(`${BASE}/cotizador.html?plan=profesional`, 1200);
  let st = await ev('WAB.cotizador.getState()');
  ok(st.plan === 'profesional' && st.modulos.length === 5, 'precarga del plan Profesional');
  ok(await ev('!!document.querySelector(".plan-compare")'), 'muestra comparación paquete vs. a medida');
  await ev(`WAB.cotizador.toggleModule('ventas')`);
  await sleep(300);
  st = await ev('WAB.cotizador.calc()');
  ok(st.ids.includes('catalogo') && st.ids.includes('ventas'), 'ventas agrega catálogo por dependencia');
  await click('[data-p="anual"]');
  st = await ev('WAB.cotizador.calc()');
  ok(st.descPeriodo === 20 && st.periodo.meses === 12, 'modalidad anual con 20%');
  const summaryTotal = await ev('document.querySelector(".qs-total strong").textContent');
  ok(summaryTotal.replace(/\s/g, '') === `Bs${new Intl.NumberFormat('es-BO', { minimumFractionDigits: st.totalPrimerPeriodo % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(st.totalPrimerPeriodo)}`.replace(/\s/g, ''), 'resumen muestra el total calculado', summaryTotal);
  await click('#btn-pdf');
  await sleep(500);
  ok(await ev('!!document.querySelector("#sec-cliente .field.invalid")'), 'exportar PDF valida datos del cliente');
  await ev(`(() => { const set = (n, v) => { const i = document.querySelector('#client-form [name="' + n + '"]'); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); }; set('nombre', 'Lic. Ana Torrez'); set('empresa', 'Clínica Demo SRL'); set('correo', 'ana@clinica.bo'); set('telefono', '+591 70000000'); set('observaciones', 'Incluye capacitación para 3 asesores.'); })()`);
  await ev(`document.getElementById('add-extra').click()`);
  await ev(`(() => { const r = document.querySelector('.extra-row'); const d = r.querySelector('[data-k="descripcion"]'); d.value = 'Integración con sistema de facturación'; d.dispatchEvent(new Event('input', { bubbles: true })); const m = r.querySelector('[data-k="monto"]'); m.value = '800'; m.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  const pages = await ev(`(async () => { const doc = await WAB.pdf.exportQuote(WAB.quoteDoc.buildModel(WAB.cotizador.getState()), { save: false }); return doc.getNumberOfPages(); })()`);
  ok(pages >= 3 && pages <= 8, `PDF generado (${pages} páginas)`);
  const pdfB64 = await ev(`window.__lastPdf.output('datauristring').split(',')[1].length`);
  ok(pdfB64 > 20000, `PDF con contenido (${Math.round(pdfB64 * 0.75 / 1024)} KB)`);
  // Guardar el PDF para revisión visual
  let chunks = '';
  for (let i = 0; i < pdfB64; i += 500000) chunks += await ev(`window.__lastPdf.output('datauristring').split(',')[1].slice(${i}, ${i + 500000})`);
  fs.writeFileSync(path.join(OUT, 'cotizacion.pdf'), Buffer.from(chunks, 'base64'));
  await b.goto(`${BASE}/cotizador.html`, 800);
  st = await ev('WAB.cotizador.getState()');
  ok(st.cliente.nombre === 'Lic. Ana Torrez' && st.adicionales.length === 1, 'la cotización persiste en localStorage');

  console.log('Simulador de WhatsApp');
  await b.goto(`${BASE}/prototipos/whatsapp.html`, 1500);
  await click('#restart');
  await waitFor('document.querySelectorAll("#phone [data-list]").length > 0');
  ok(await ev('document.querySelectorAll("#phone .wa-msg.in").length >= 2'), 'bienvenida + menú principal');
  // Reserva
  await ev(`document.querySelector('#scenarios [data-s="1"]').click()`);
  ok(await waitFor('!!document.querySelector("#phone [data-flow]")'), 'mensaje interactivo de flujo');
  await ev(`[...document.querySelectorAll('#phone [data-flow]')].pop().click()`);
  await waitFor('!!document.querySelector(".wa-flow")');
  await ev(`document.querySelector('.wa-flow [data-hora]:not([disabled])').click()`);
  await ev(`(() => { const i = document.querySelector('.wa-flow [data-k="nombre"]'); i.value = 'Ana Torrez'; document.querySelector('.wa-flow [data-k="mascota"]').value = 'Toby'; })()`);
  const apBefore = await ev('WAB.db.get("appointments").length');
  await ev(`document.querySelector('.wa-flow [data-submit]').click()`);
  ok(await waitFor(`WAB.db.get("appointments").length === ${apBefore + 1}`), 'reserva crea la cita en el calendario');
  await waitFor('[...document.querySelectorAll("#phone .wa-msg.in")].some((m) => /Cita confirmada|Solicitud recibida/.test(m.textContent))');
  ok(await ev('[...document.querySelectorAll("#phone .wa-msg.in")].some((m) => /Cita confirmada|Solicitud recibida/.test(m.textContent))'), 'confirmación de la cita en el chat');
  // Compra
  await ev(`window.__ph = null`);
  const send = (id, title) => ev(`(async () => { const b = document.createElement('button'); b.dataset.reply = ${JSON.stringify(id)}; b.dataset.title = ${JSON.stringify(title)}; document.querySelector('#phone .wa-body').appendChild(b); b.click(); b.remove(); })()`);
  await send('cat:cat_acc', 'Accesorios'); await sleep(900);
  await send('prd:prd_05', 'Correa'); await sleep(1200);
  ok(await ev('!!document.querySelector("#phone .wa-product")'), 'mensaje de producto con imagen y precio');
  await send('add:prd_05', 'Agregar al carrito'); await sleep(900);
  await send('checkout', 'Confirmar pedido'); await sleep(900);
  const ordBefore = await ev('WAB.db.get("orders").length');
  await send('ship:pickup', 'Retiro en tienda'); await sleep(2200);
  ok(await ev(`WAB.db.get("orders").length === ${ordBefore + 1}`), 'pedido creado con stock reservado');
  ok(await ev('!!document.querySelector("#phone .wa-qr img")'), 'QR de pago enviado');
  await ev(`document.querySelector('#phone [data-act="attach"]').click()`);
  ok(await waitFor('WAB.db.get("orders")[0].estado === "pago_revision"'), 'comprobante deja el pago en revisión');
  // IA
  await ev(`(() => { const i = document.querySelector('#phone .wa-compose input'); i.value = '¿Atienden emergencias de noche?'; document.querySelector('#phone .wa-compose').requestSubmit(); })()`);
  ok(await waitFor('[...document.querySelectorAll("#phone .wa-sender.ai")].length > 0', 8000), 'respuesta de la IA simulada');
  ok(await ev('WAB.db.get("aiLog").length > 0'), 'registro de la IA');
  // Asesor
  await ev(`document.querySelector('#scenarios [data-s="8"]').click()`);
  ok(await waitFor('WAB.db.find("conversations", "cv_demo").estado === "pendiente"', 8000), 'solicitar asesor deja la conversación en espera');
  await b.screenshot(path.join(OUT, 'flow_whatsapp.png'));

  console.log('Bandeja de conversaciones');
  await b.goto(`${BASE}/prototipos/conversaciones.html#cv_demo`, 1500);
  await click('#take');
  ok(await ev('WAB.db.find("conversations", "cv_demo").estado === "humano"'), 'tomar conversación');
  await ev(`(() => { document.getElementById('text').value = 'Hola, soy Daniela. ¿En qué le ayudo?'; document.getElementById('compose').requestSubmit(); })()`);
  ok(await ev('WAB.db.find("conversations", "cv_demo").mensajes.some((m) => m.from === "agent" && /Daniela/.test(m.payload.text && m.payload.text.body))'), 'el asesor responde');
  await ev(`document.querySelector('.compose-tabs [data-mode="note"]').click()`);
  await ev(`(() => { document.getElementById('text').value = 'Cliente interesado en plan anual'; document.getElementById('compose').requestSubmit(); })()`);
  ok(await ev('WAB.db.find("conversations", "cv_demo").notas.length === 1'), 'nota interna');
  await click('#to-bot');
  ok(await ev('WAB.db.find("conversations", "cv_demo").estado === "bot"'), 'devolver al bot');

  console.log('Pedidos');
  const oid = await ev('WAB.db.get("orders")[0].id');
  await b.goto(`${BASE}/prototipos/pedidos.html#${oid}`, 1500);
  await click('[data-pay="ok"]');
  ok(await ev(`WAB.db.find("orders", "${oid}").estado === "pagado"`), 'aprobar pago');
  ok(await ev('WAB.db.find("conversations", "cv_demo").mensajes.some((m) => m.payload.interactive && m.payload.interactive.body && /Confirmamos el pago/.test(m.payload.interactive.body.text))'), 'notificación de pedido al cliente');

  console.log('Automatizaciones');
  await b.goto(`${BASE}/prototipos/automatizaciones.html`, 1200);
  await ev(`(() => { const i = document.querySelector('[data-f="cuerpo"]'); i.value = 'Menú editado en la prueba'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await click('#save-menu');
  ok(await ev('WAB.db.get("menus")[0].cuerpo === "Menú editado en la prueba"'), 'editar y guardar el menú principal');
  ok(await ev('[...document.querySelectorAll("#phone .wa-bubble")].some((b) => b.textContent.includes("Menú editado"))'), 'la vista previa refleja el cambio');

  console.log('Campañas');
  await b.goto(`${BASE}/prototipos/campanas.html`, 1200);
  await click('#new');
  await ev(`(() => { document.getElementById('w-name').value = 'Campaña de prueba'; })()`);
  await ev(`[...document.querySelectorAll('.modal-foot .btn')].find((x) => /Confirmar/.test(x.textContent)).click()`);
  ok(await waitFor('WAB.db.get("campaigns").some((c) => c.nombre === "Campaña de prueba" && c.estado === "enviada")', 9000), 'campaña enviada (simulación)');

  console.log('Calendario, CRM y reportes');
  await b.goto(`${BASE}/prototipos/calendario.html`, 1200);
  await click('#new');
  await ev(`(() => { const s = document.querySelector('.modal [name="contactId"]'); s.value = s.options[1].value; const f = document.querySelector('.modal [name="fecha"]'); const d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); f.value = d.toISOString().slice(0, 10); f.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  const apB = await ev('WAB.db.get("appointments").length');
  await ev(`[...document.querySelectorAll('.modal-foot .btn')].pop().click()`);
  ok(await ev(`WAB.db.get("appointments").length === ${apB + 1}`), 'crear cita desde el calendario');
  await b.goto(`${BASE}/prototipos/crm.html`, 1200);
  await ev(`document.querySelector('[data-view="embudo"]').click()`);
  ok(await ev('document.querySelectorAll(".kb-col").length === 4'), 'vista de embudo');
  await b.goto(`${BASE}/prototipos/reportes.html`, 1500);
  ok(await ev('document.querySelectorAll("#charts svg").length >= 7'), 'gráficos de reportes');

  console.log('Catálogo web');
  await b.goto(`${BASE}/prototipos/tienda.html#producto/prd_04`, 1500);
  await ev(`document.getElementById('add').click()`);
  ok(await ev('WAB.storage.get("tienda-carrito").length === 1'), 'agregar variante al carrito');
  await click('#cart-btn');
  await ev(`[...document.querySelectorAll('.drawer-foot .btn')].pop().click()`);
  await waitFor('[...document.querySelectorAll("#wa-phone [data-reply]")].some((b) => b.dataset.reply === "checkout")', 8000);
  await ev(`[...document.querySelectorAll('#wa-phone [data-reply="checkout"]')].pop().click()`);
  await sleep(900);
  await ev(`[...document.querySelectorAll('#wa-phone [data-reply="ship:pickup"]')].pop().click()`);
  ok(await waitFor('WAB.db.get("orders")[0].origen === "Tienda web"', 8000), 'pedido de la tienda llega por WhatsApp');
  await b.screenshot(path.join(OUT, 'flow_tienda.png'));

  ok(b.errors.length === 0, 'sin errores de consola', b.errors.join(' | '));
  await b.close();
  srv.close();
  console.log(`\n${pass} correctas, ${fail} fallidas`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
