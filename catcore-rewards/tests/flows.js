// Escenarios completos del prototipo, manejando la interfaz real en Chrome headless.
// Uso: node --experimental-websocket tests/flows.js
const path = require('path');
const { serve, launch, sleep, ROOT } = require('./lib-cdp');

const PORT = 5292;
const BASE = `http://localhost:${PORT}`;
const RECEIPT = path.join(ROOT, 'assets/images/catcore-logo.png'); // imagen real usada como "foto de boleta"
const CHAT = path.join(ROOT, 'assets/images/catcore-icon.png');

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, extra !== undefined ? JSON.stringify(extra) : ''); }
}

(async () => {
  const srv = await serve(PORT);
  const b = await launch({ port: 9392 });
  const ev = (js) => b.eval(js);
  const waitFor = async (js, ms = 6000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(js).catch(() => false)) return true; await sleep(100); } return false; };
  const click = (sel) => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) throw new Error('No existe ' + ${JSON.stringify(sel)}); el.click(); return true; })()`);
  const setVal = (sel, v) => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); el.value = ${JSON.stringify(v)}; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  async function upload(sel, file) {
    const { root } = await b.send('DOM.getDocument', { depth: -1, pierce: true });
    const { nodeId } = await b.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
    await b.send('DOM.setFileInputFiles', { nodeId, files: [file] });
    await ev(`document.querySelector(${JSON.stringify(sel)}).dispatchEvent(new Event('change', { bubbles: true }))`).catch(() => {});
  }
  const portal = (hash) => b.goto(`${BASE}/index.html${hash || ''}`, 400);
  const admin = (hash) => b.goto(`${BASE}/admin/index.html${hash || ''}`, 400);
  const booted = () => waitFor('!document.getElementById("boot") && window.CP && CP.store.db && CP.store.db.meta.imagesReady');

  async function fillPurchase(o) {
    await portal('#/registrar');
    await booted();
    await setVal('#regForm [name=phone]', o.phone);
    if (o.email) await setVal('#regForm [name=email]', o.email);
    if (o.image !== false) {
      await upload('#upReceipt .up-file', RECEIPT);
      await waitFor('document.querySelector("#upReceipt").dataset.state === "preview"');
    }
  }
  // El administrador abre la compra y transcribe los datos de la boleta en el formulario de verificación
  async function fillReview(pid, o) {
    await click(`tr[data-open="${pid}"]`);
    await waitFor('!!document.querySelector("#apForm")');
    const F = '.modal-wrap:last-child #apForm ';
    await setVal(F + '[name=receiptNo]', o.receipt);
    await ev(`document.querySelector('${F}[name=receiptNo]').dispatchEvent(new Event('blur')); true`);
    await setVal(F + '[name=date]', o.date);
    await setVal(F + '[name=validatedAmount]', String(o.amount));
    await setVal(F + '[name=sellerId]', o.seller);
    if (o.product) await setVal(F + '[name=product]', o.product);
  }

  try {
    await b.goto(`${BASE}/index.html`, 300);
    await booted();
    await ev('CP.seed.reset().then(() => true)');
    await ev('sessionStorage.clear(); localStorage.removeItem("corepoints:draft"); true');
    const today = await ev('CP.util.isoDay(CP.now())');
    const seller = await ev('CP.sellers.active(CP.store.db)[0].id');
    const sellerName = await ev('CP.sellers.active(CP.store.db)[0].name');
    const PHONE = '71112233';
    b.errors.length = 0;

    console.log('\nEscenario 1 · Registro y aprobación');
    await fillPurchase({ name: 'Cliente Prueba Escenario', phone: PHONE, email: 'prueba@example.com' });
    await upload('#upChat .up-file', CHAT);
    await waitFor('document.querySelector("#upChat").dataset.state === "preview"');
    check('formulario simplificado: sin campos de datos de la compra', await ev('["name","receiptNo","date","amount","sellerId","product","notes"].every(n => !document.querySelector("#regForm [name=" + n + "]")) && document.querySelectorAll("#regForm .form-section").length === 2'));
    check('vista previa de la boleta visible', await ev('document.querySelector("#upReceipt .up-preview img").naturalWidth > 0'));
    // Persistencia del borrador: recargar a mitad del formulario conserva datos e imagen
    await sleep(400);
    await portal('#/registrar'); await booted();
    await waitFor('document.querySelector("#upReceipt").dataset.state === "preview"');
    check('borrador: datos y foto siguen tras recargar', (await ev('document.querySelector("#regForm [name=phone]").value')) === PHONE && await ev('document.querySelector("#upReceipt .up-preview img").naturalWidth > 0'));
    await click('#regSubmit');
    await waitFor('location.hash.includes("ok=SOL-")');
    const pid = await ev('new URLSearchParams(location.hash.split("?")[1]).get("ok")');
    check('pantalla de confirmación con ID ' + pid, !!pid && await ev('!!document.querySelector(".success .req-id")'));
    const p1 = await ev(`(() => { const p = CP.purchases.get(CP.store.db, '${pid}'); const c = CP.customers.get(CP.store.db, p.customerId); return { status: p.status, created: p.customerCreated, phone: c.phone, img: p.receiptImg, chat: p.chatImg, lots: CP.store.db.lots.filter(l => l.purchaseId === p.id).length, cid: c.id }; })()`);
    check('compra pendiente de verificación', p1.status === 'pendiente', p1);
    check('perfil de cliente creado automáticamente (+591)', p1.created && p1.phone === '591' + PHONE, p1);
    check('sin nombre: perfil con nombre provisional', await ev(`(() => { const c = CP.customers.get(CP.store.db, '${p1.cid}'); return c.name === 'Cliente 2233' && c.nameProvided === false; })()`));
    check('sin puntos antes de aprobar', p1.lots === 0 && (await ev(`CP.points.available(CP.store.db, '${p1.cid}')`)) === 0);
    check('fotos guardadas en IndexedDB', await ev(`Promise.all([CP.images.get('${p1.img}'), CP.images.get('${p1.chat}')]).then(r => r.every(x => x && x.blob.size > 1000))`));
    // Notificación generada
    check('notificación "compra registrada"', await ev(`CP.store.db.notifications.some(n => n.event === 'compra_registrada' && n.data.purchaseId === '${pid}')`));

    await admin('#/compras'); await booted();
    check('panel: compra aparece en pendientes', await ev(`!!document.querySelector('tr[data-open="${pid}"]')`));
    await click(`tr[data-open="${pid}"]`);
    await waitFor('document.querySelector("#rvMain img") && document.querySelector("#rvMain img").naturalWidth > 0');
    check('panel: visor muestra la boleta subida', await ev('document.querySelector("#rvMain img").naturalWidth > 0'));
    await click('#apGo'); await sleep(250);
    check('panel: no aprueba sin transcribir los datos de la boleta', (await ev(`CP.purchases.get(CP.store.db, '${pid}').status`)) === 'pendiente' && await ev('["receiptNo","date","validatedAmount","sellerId"].every(n => document.querySelector("#apForm [data-field=" + n + "]").classList.contains("has-err"))'));
    await ev('CP.ui.closeAll(); true');
    await sleep(250);
    await fillReview(pid, { receipt: 'NV-777001', date: today, amount: 5000, seller, product: 'Laptop HP Victus 15' });
    check('panel: vista previa calcula 500 pts', (await ev('document.querySelector("#apCalc b").textContent')).startsWith('500'));
    await click('.review-thumbs button[data-i="1"]');
    await sleep(300);
    check('panel: cambia a la captura del chat', await ev('document.querySelector(".review-thumbs button[data-i=\\"1\\"]").classList.contains("on")'));
    await click('#rvMain'); await sleep(400);
    check('panel: visor ampliado abierto', await ev('!!document.querySelector(".viewer.in") && document.querySelector(".viewer-stage img").naturalWidth > 0'));
    await ev('document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); true'); await sleep(300);
    await click('#apGo'); await sleep(300);
    check('panel: confirmación de aprobación muestra vendedora', (await ev('document.querySelector(".modal-wrap:last-child .confirm-text").textContent')).includes(sellerName));
    await click('.modal-wrap:last-child [data-action="confirm"]');
    await waitFor(`CP.purchases.get(CP.store.db, '${pid}').status === 'aprobada'`);
    const ap = await ev(`(() => { const p = CP.purchases.get(CP.store.db, '${pid}'); const l = CP.store.db.lots.find(x => x.purchaseId === p.id); return { st: p.status, pts: p.points, avail: CP.points.available(CP.store.db, p.customerId), exp: l.expiresAt, cred: l.creditedAt, movs: CP.store.db.movements.filter(m => m.refId === p.id && m.type === 'acreditacion').length, receipt: p.receiptNo, seller: p.validatedSellerId, amount: p.validatedAmount, date: p.date }; })()`);
    check('compra aprobada con 500 CorePoints', ap.st === 'aprobada' && ap.pts === 500 && ap.avail === 500, ap);
    check('datos de la boleta guardados al verificar', ap.receipt === 'NV-777001' && ap.seller === seller && ap.amount === 5000 && ap.date === today, ap);
    const months = await ev(`(() => { const a = new Date('${ap.cred}'), b = new Date('${ap.exp}'); return (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth(); })()`);
    check('vencimiento a 12 meses de la acreditación', months === 12, { cred: ap.cred, exp: ap.exp });
    check('movimiento de acreditación registrado', ap.movs === 1);
    check('no se puede aprobar dos veces', await ev(`(() => { try { CP.store.tx(d => CP.purchases.approve(d, '${pid}', {})); return false; } catch (e) { return e instanceof CP.BizError && CP.store.db.lots.filter(l => l.purchaseId === '${pid}').length === 1; } })()`));

    // El administrador completa el nombre desde la ficha del cliente
    await admin('#/clientes'); await booted();
    check('panel: cliente marcado "sin nombre"', await ev(`document.querySelector('tr[data-cust="${p1.cid}"]').textContent.includes('sin nombre')`));
    await click(`tr[data-cust="${p1.cid}"]`); await sleep(300);
    await click('#cEdit'); await sleep(300);
    await setVal('.modal-wrap:last-child [name=name]', 'Cliente Prueba Escenario');
    await click('.modal-wrap:last-child [data-action="submit"]');
    check('panel: nombre completado desde la ficha', await waitFor(`(() => { const c = CP.customers.get(CP.store.db, '${p1.cid}'); return c.name === 'Cliente Prueba Escenario' && c.nameProvided === true; })()`));
    await ev('CP.ui.closeAll(); true');

    console.log('\nEscenario 2 · Canje');
    await portal('#/mis-puntos'); await booted();
    await setVal('#phoneForm [name=phone]', '70000001');
    await ev('document.getElementById("phoneForm").requestSubmit(); true');
    check('número sin cuenta: mensaje claro', (await ev('document.querySelector("#phoneForm .err").textContent')).includes('No encontramos'));
    await setVal('#phoneForm [name=phone]', PHONE);
    await ev('document.getElementById("phoneForm").requestSubmit(); true');
    check('ingreso directo solo con el WhatsApp (sin código)', await waitFor('!!document.getElementById("balAvail")') && !(await ev('!!document.querySelector("[name=code]")')));
    check('saldo visible en la cuenta: 500', (await ev('document.getElementById("balAvail").textContent')) === '500');
    await click('.tab[data-tab="compras"]');
    check('historial de compras muestra la boleta', (await ev('document.getElementById("tabBody").textContent')).includes('NV-777001'));
    const mouse = await ev('CP.store.db.rewards.find(r => r.cost === 350).id');
    const stock0 = await ev(`CP.rewards.get(CP.store.db, '${mouse}').stock`);
    await portal('#/recompensas'); await booted();
    await click('#fAff');
    check('filtro "puedo canjear" excluye recompensas de más de 500', await ev('[...document.querySelectorAll("#rGrid .reward")].every(el => CP.rewards.get(CP.store.db, el.dataset.reward).cost <= 500)'));
    await click(`[data-redeem="${mouse}"]`); await sleep(300);
    check('modal muestra saldo y costo', (await ev('document.querySelector(".redeem-calc").textContent')).includes('500') && (await ev('document.querySelector(".redeem-calc").textContent')).includes('150'));
    await click('[data-action="confirm-redeem"]');
    await waitFor('CP.store.db.redemptions.some(r => r.status === "pendiente" && CP.customers.get(CP.store.db, r.customerId).phone === "591' + PHONE + '")');
    const red = await ev(`(() => { const c = CP.customers.findByPhone(CP.store.db, '${PHONE}'); const r = CP.store.db.redemptions.find(x => x.customerId === c.id); const b = CP.points.balance(CP.store.db, c.id); return { id: r.id, code: r.code, st: r.status, avail: b.available, res: b.reserved, stock: CP.rewards.get(CP.store.db, r.rewardId).stock }; })()`);
    check('canje pendiente con código ' + red.code, red.st === 'pendiente' && /^CNJ-[A-Z0-9]{4}-\d{2}$/.test(red.code), red);
    check('350 puntos reservados, 150 disponibles', red.avail === 150 && red.res === 350, red);
    check('stock reservado (−1)', red.stock === stock0 - 1, { stock0, now: red.stock });
    check('no permite canjear sin saldo (doble uso)', await ev(`(() => { const c = CP.customers.findByPhone(CP.store.db, '${PHONE}'); try { CP.store.tx(d => CP.redemptions.request(d, c.id, '${mouse}')); return false; } catch (e) { return /faltan|insuficiente/i.test(e.message); } })()`));
    check('no permite entregar sin aprobar', await ev(`(() => { try { CP.store.tx(d => CP.redemptions.transition(d, '${red.id}', 'entregar', {})); return false; } catch (e) { return /sin aprobar/.test(e.message); } })()`));
    await admin('#/canjes'); await booted();
    await click(`[data-ract="aprobar"][data-rid="${red.id}"]`); await sleep(300);
    await click('.modal-wrap:last-child [data-action="submit"]');
    await waitFor(`CP.redemptions.get(CP.store.db, '${red.id}').status === 'aprobado'`);
    const r2 = await ev(`(() => { const r = CP.redemptions.get(CP.store.db, '${red.id}'); const b = CP.points.balance(CP.store.db, r.customerId); return { st: r.status, avail: b.available, used: b.used, res: b.reserved }; })()`);
    check('canje aprobado: 150 disponibles, 350 utilizados', r2.st === 'aprobado' && r2.avail === 150 && r2.used === 350 && r2.res === 0, r2);
    check('no se puede aprobar dos veces', await ev(`(() => { try { CP.store.tx(d => CP.redemptions.transition(d, '${red.id}', 'aprobar', {})); return false; } catch (e) { return /ya fue aprobado/.test(e.message); } })()`));
    await click(`[data-ract="listo"][data-rid="${red.id}"]`); await sleep(250);
    await click('.modal-wrap:last-child [data-action="submit"]');
    await waitFor(`CP.redemptions.get(CP.store.db, '${red.id}').status === 'listo'`);
    await click(`[data-ract="entregar"][data-rid="${red.id}"]`); await sleep(250);
    await click('.modal-wrap:last-child [data-action="submit"]');
    await waitFor(`CP.redemptions.get(CP.store.db, '${red.id}').status === 'entregado'`);
    check('flujo aprobado → listo → entregado', (await ev(`CP.redemptions.get(CP.store.db, '${red.id}').history.map(h => h.status).join(',')`)) === 'pendiente,aprobado,listo,entregado');
    check('notificación "lista para recoger" generada', await ev(`CP.store.db.notifications.some(n => n.event === 'canje_listo' && n.data.redemptionId === '${red.id}')`));
    await portal('#/mis-puntos'); await booted();
    await click('.tab[data-tab="canjes"]');
    check('portal: canje en el historial del cliente', (await ev('document.getElementById("tabBody").textContent')).includes(red.code));
    check('portal: saldo 150 tras el canje', (await ev('document.getElementById("balAvail").textContent')) === '150');
    // Rechazo de canje libera puntos y stock
    const rej = await ev(`(() => { const c = CP.customers.findByPhone(CP.store.db, '${PHONE}'); const rw = CP.store.db.rewards.find(r => r.cost === 150 && r.active); const r = CP.store.tx(d => CP.redemptions.request(d, c.id, rw.id)); const mid = CP.points.available(CP.store.db, c.id); CP.store.tx(d => CP.redemptions.transition(d, r.id, 'rechazar', { note: 'Prueba de rechazo' })); return { mid, after: CP.points.available(CP.store.db, c.id), mov: CP.store.db.movements.some(m => m.refId === r.id && m.type === 'liberacion') }; })()`);
    check('rechazo de canje devuelve los puntos reservados', rej.mid === 0 && rej.after === 150 && rej.mov, rej);

    console.log('\nEscenario 3 · Compra rechazada');
    await fillPurchase({ name: 'Cliente Prueba Escenario', phone: PHONE });
    await click('#regSubmit');
    await waitFor('location.hash.includes("ok=SOL-")');
    const pid3 = await ev('new URLSearchParams(location.hash.split("?")[1]).get("ok")');
    const before3 = await ev(`CP.points.available(CP.store.db, CP.purchases.get(CP.store.db, '${pid3}').customerId)`);
    await admin('#/compras'); await booted();
    await click(`tr[data-open="${pid3}"]`); await sleep(300);
    await click('#rjGo'); await sleep(250);
    await click('.modal-wrap:last-child [data-action="submit"]'); await sleep(200);
    check('rechazo exige motivo', (await ev(`CP.purchases.get(CP.store.db, '${pid3}').status`)) === 'pendiente' && (await ev('document.querySelector(".modal-wrap:last-child [data-field=reason]").classList.contains("has-err")')));
    await setVal('.modal-wrap:last-child [name=reason]', 'La boleta no corresponde a CatCore');
    await setVal('.modal-wrap:last-child [name=receiptNo]', 'FALSA-123');
    await setVal('.modal-wrap:last-child [name=notes]', 'Boleta de otra tienda (prueba)');
    await click('.modal-wrap:last-child [data-action="submit"]');
    await waitFor(`CP.purchases.get(CP.store.db, '${pid3}').status === 'rechazada'`);
    const p3 = await ev(`(() => { const p = CP.purchases.get(CP.store.db, '${pid3}'); return { st: p.status, reason: p.rejectReason, notes: p.adminNotes, lots: CP.store.db.lots.filter(l => l.purchaseId === p.id).length, avail: CP.points.available(CP.store.db, p.customerId), notif: CP.store.db.notifications.some(n => n.event === 'compra_rechazada' && n.data.purchaseId === p.id) }; })()`);
    check('compra rechazada con motivo y observaciones', p3.st === 'rechazada' && p3.reason.includes('no corresponde') && p3.notes.includes('otra tienda'), p3);
    check('no se acreditan puntos', p3.lots === 0 && p3.avail === before3, p3);
    check('cliente notificado del rechazo', p3.notif);

    console.log('\nEscenario 4 · Boleta duplicada');
    // Otra persona envía la foto de la misma boleta; el duplicado se detecta al verificar
    await fillPurchase({ name: 'Otra Persona', phone: '79998877' });
    await click('#regSubmit');
    await waitFor('location.hash.includes("ok=SOL-")');
    const pid4 = await ev('new URLSearchParams(location.hash.split("?")[1]).get("ok")');
    await admin('#/compras'); await booted();
    await fillReview(pid4, { receipt: 'nv 777001', date: today, amount: 5000, seller });
    check('aviso inmediato al escribir una boleta ya acreditada', (await ev('document.querySelector("#apForm [data-field=receiptNo] .err").textContent')).includes(pid));
    await click('#apGo'); await sleep(300);
    const p4 = await ev(`(() => { const p = CP.purchases.get(CP.store.db, '${pid4}'); return { st: p.status, lots: CP.store.db.lots.filter(l => l.purchaseId === p.id).length, confirm: !!document.querySelector('[data-action="confirm"]') }; })()`);
    check('boleta duplicada no se puede aprobar (formato distinto: "nv 777001")', p4.st === 'pendiente' && p4.lots === 0 && !p4.confirm, p4);
    check('tampoco por código (sin pasar por la interfaz)', await ev(`(() => { try { CP.store.tx(d => CP.purchases.approve(d, '${pid4}', { receiptNo: 'NV777001', date: '${today}', validatedAmount: 5000, sellerId: '${seller}' })); return false; } catch (e) { return e.field === 'receiptNo'; } })()`));
    await click('#rjGo'); await sleep(250);
    await setVal('.modal-wrap:last-child [name=reason]', 'Boleta ya registrada');
    await click('.modal-wrap:last-child [data-action="submit"]');
    await waitFor(`CP.purchases.get(CP.store.db, '${pid4}').status === 'rechazada'`);
    check('duplicado rechazado con motivo "Boleta ya registrada"', (await ev(`CP.purchases.get(CP.store.db, '${pid4}').rejectReason`)) === 'Boleta ya registrada');
    check('una boleta rechazada no bloquea un registro válido posterior', await ev(`CP.purchases.findDuplicate(CP.store.db, 'FALSA-123') === null`));

    console.log('\nEscenario 5 · Vencimiento');
    const luis = await ev(`(() => { const c = CP.customers.findByPhone(CP.store.db, '76011201'); const now = CP.now(); const raw = CP.points.lotsOf(CP.store.db, c.id).filter(l => new Date(l.expiresAt) <= now).reduce((a, l) => a + l.remaining, 0); const b = CP.points.balance(CP.store.db, c.id); return { id: c.id, expiredRemaining: raw, avail: b.available, expired: b.expired }; })()`);
    check('cliente demo con puntos vencidos sin procesar', luis.expiredRemaining > 0, luis);
    check('puntos vencidos excluidos del saldo disponible', luis.avail === await ev(`CP.points.lotsOf(CP.store.db, '${luis.id}').filter(l => new Date(l.expiresAt) > CP.now()).reduce((a, l) => a + l.remaining, 0)`), luis);
    const movV0 = await ev('CP.store.db.movements.filter(m => m.type === "vencimiento").length');
    await admin('#/movimientos'); await booted();
    await click('#runExp'); await sleep(250);
    await click('.modal-wrap:last-child [data-action="confirm"]');
    await waitFor(`CP.store.db.movements.filter(m => m.type === 'vencimiento').length > ${movV0}`);
    const after5 = await ev(`(() => { const b = CP.points.balance(CP.store.db, '${luis.id}'); const lots = CP.points.lotsOf(CP.store.db, '${luis.id}').filter(l => new Date(l.expiresAt) <= CP.now()); return { avail: b.available, expired: b.expired, marked: lots.every(l => l.remaining === 0 && l.expiredAt), notif: CP.store.db.notifications.some(n => n.event === 'puntos_vencidos' && n.customerId === '${luis.id}') }; })()`);
    check('lotes marcados como vencidos', after5.marked, after5);
    check('saldo disponible sin cambios y vencidos contabilizados', after5.avail === luis.avail && after5.expired === luis.expired, { before: luis, after: after5 });
    check('movimiento y notificación de vencimiento', after5.notif);
    check('re-ejecutar no duplica vencimientos', await ev(`(() => { const n = CP.store.db.movements.filter(m => m.type === 'vencimiento').length; CP.store.tx(d => CP.points.runExpiry(d)); return CP.store.db.movements.filter(m => m.type === 'vencimiento').length === n; })()`));
    check('avisos de puntos por vencer generados', await ev('CP.store.db.notifications.some(n => n.event === "puntos_por_vencer")'));
    // FEFO: canje usa primero el lote que vence antes
    const fefo = await ev(`(() => { const c = CP.customers.findByPhone(CP.store.db, '69033403'); const lots = CP.points.lotsOf(CP.store.db, c.id).filter(l => l.remaining > 0 && new Date(l.expiresAt) > CP.now()).sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt)); const first = lots[0].id; const rw = CP.store.db.rewards.find(r => r.cost === 120); const r = CP.store.tx(d => CP.redemptions.request(d, c.id, rw.id)); return r.allocations[0].lotId === first; })()`);
    check('canje consume primero los puntos más próximos a vencer (FEFO)', fefo);
    // Reloj simulado: +365 días deja sin saldo a quien no tiene compras recientes
    await ev('CP.store.tx(d => { d.meta.clockOffsetDays = 400; }); true');
    check('reloj +400 días: puntos del escenario 1 vencen', (await ev(`CP.points.available(CP.store.db, CP.customers.findByPhone(CP.store.db, '${PHONE}').id)`)) === 0);
    await ev('CP.store.tx(d => { d.meta.clockOffsetDays = 0; }); true');

    console.log('\nEscenario 6 · Persistencia');
    await b.goto(`${BASE}/admin/index.html#/compras`, 300); await booted();
    const persisted = await ev(`(() => { const p = CP.purchases.get(CP.store.db, '${pid}'); return p && p.status === 'aprobada' ? p.receiptImg : null; })()`);
    check('compra sigue registrada tras recargar', !!persisted);
    await click('.chip[data-st="aprobada"]'); await sleep(200);
    await click(`tr[data-open="${pid}"]`);
    check('foto disponible tras recargar el navegador', await waitFor('document.querySelector("#rvMain img") && document.querySelector("#rvMain img").naturalWidth > 0'));
    // Configuración no retroactiva
    await admin('#/configuracion'); await booted();
    await setVal('#cfgForm [name=bsPerPoint]', '20');
    await ev('document.getElementById("cfgForm").requestSubmit(); true');
    await waitFor('CP.store.db.config.bsPerPoint === 20');
    const nr = await ev(`(() => { const p = CP.purchases.get(CP.store.db, '${pid}'); return { pts: p.points, rule: p.rule.bsPerPoint, log: CP.store.db.configLog.length, lot: CP.store.db.lots.find(l => l.purchaseId === p.id).points }; })()`);
    check('cambio de configuración no altera acreditaciones previas', nr.pts === 500 && nr.lot === 500 && nr.rule === 10 && nr.log === 1, nr);
    check('nueva regla se aplica a cálculos futuros', (await ev('CP.points.calc(5000, CP.store.db.config, false).base')) === 250);

    console.log('\nCRUD y validaciones del panel');
    await admin('#/recompensas'); await booted();
    await click('#newReward'); await sleep(300);
    await setVal('.modal-wrap:last-child [name=name]', 'Silla gamer de prueba');
    await setVal('.modal-wrap:last-child [name=description]', 'Silla ergonómica con soporte lumbar, solo para la prueba.');
    await setVal('.modal-wrap:last-child [name=category]', 'Accesorios');
    await setVal('.modal-wrap:last-child [name=cost]', '2500');
    await setVal('.modal-wrap:last-child [name=stock]', '2');
    await upload('.modal-wrap:last-child #wUp .up-file', CHAT);
    await waitFor('document.querySelector(".modal-wrap:last-child #wUp").dataset.state === "preview"');
    await click('.modal-wrap:last-child [data-action="submit"]');
    await waitFor('CP.store.db.rewards.some(r => r.name === "Silla gamer de prueba")');
    const nw = await ev('CP.store.db.rewards.find(r => r.name === "Silla gamer de prueba")');
    check('recompensa creada con imagen en IndexedDB', nw && nw.image.startsWith('idb:') && await ev(`CP.images.get('${nw.image.slice(4)}').then(r => !!r)`), nw);
    await portal('#/recompensas'); await booted();
    check('nueva recompensa visible en el portal con su imagen', await waitFor(`(() => { const el = document.querySelector('[data-reward="${nw.id}"] img'); return el && el.naturalWidth > 0; })()`));
    check('recompensa con canjes no se puede eliminar', await ev(`(() => { try { CP.store.tx(d => CP.rewards.remove(d, '${mouse}')); return false; } catch (e) { return /canjes asociados/.test(e.message); } })()`));
    check('recompensa sin movimientos se elimina', await ev(`(() => { CP.store.tx(d => CP.rewards.remove(d, '${nw.id}')); return !CP.rewards.get(CP.store.db, '${nw.id}'); })()`));
    check('ajuste manual exige motivo', await ev(`(() => { try { CP.store.tx(d => CP.points.adjust(d, { customerId: CP.store.db.customers[0].id, delta: 10, reason: '' })); return false; } catch (e) { return e.field === 'reason'; } })()`));
    check('vendedora con código duplicado rechazada', await ev(`(() => { try { CP.store.tx(d => CP.sellers.save(d, { name: 'Duplicada', code: CP.store.db.sellers[0].code, active: true })); return false; } catch (e) { return /Ya existe/.test(e.message); } })()`));
    check('compresión: imagen grande se reduce', await ev(`(async () => { const c = document.createElement('canvas'); c.width = 4000; c.height = 3000; const g = c.getContext('2d'); for (let i = 0; i < 4000; i += 7) { g.fillStyle = 'hsl(' + i + ',70%,50%)'; g.fillRect(i, 0, 7, 3000); } const blob = await new Promise(r => c.toBlob(r, 'image/png')); const f = new File([blob], 'grande.png', { type: 'image/png' }); const out = await CP.images.compress(f); return out.compressed && Math.max(out.width, out.height) === 1800 && out.blob.size < blob.size; })()`));
    check('formato no permitido rechazado', await ev(`CP.images.validate(new File(['x'.repeat(500)], 'a.gif', { type: 'image/gif' }), 8).includes('no permitido')`));

    check('sin errores de JavaScript en todo el recorrido', b.errors.length === 0, b.errors.slice(0, 5));
  } catch (e) {
    fail++;
    console.log('✗ Error en la prueba:', e.message);
    console.log('  errores de página:', b.errors.slice(0, 5));
  }
  console.log(`\n${pass} correctas, ${fail} fallidas`);
  await b.close(); srv.close();
  process.exit(fail ? 1 : 0);
})();
