// Pruebas de flujo en Chrome headless: node --experimental-websocket tests/flows.js
// Corre contra el servidor real de ModaFlow (server/server.mjs). Para no gastar ni requerir API key,
// ese servidor habla con un sustituto local de Anthropic (tests/stub-anthropic.cjs) vía ANTHROPIC_BASE_URL.
const { spawn } = require('child_process');
const path = require('path');
const { launch, sleep } = require('./lib-cdp');
const stub = require('./stub-anthropic.cjs');
const URL = 'http://localhost:5192/';
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ✓', msg); } else { fail++; console.log('  ✗', msg); } };

(async () => {
  const anth = await stub.start(5391);
  const server = spawn(process.execPath, ['server/server.mjs'], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore',
    env: Object.assign({}, process.env, { PORT: '5192', HOST: '127.0.0.1', ANTHROPIC_API_KEY: 'sk-ant-prueba-no-real', ANTHROPIC_BASE_URL: 'http://127.0.0.1:5391', IA_PRECIO_ENTRADA_USD_MTOK: '0.10', IA_PRECIO_SALIDA_USD_MTOK: '0.50', IA_TIPO_CAMBIO_BS: '6.96', IA_LIMITE_POR_MINUTO: '30' }) });
  for (let i = 0; i < 50; i++) { try { await fetch(URL + 'api/ia/estado'); break; } catch (e) { await sleep(100); } }
  const srv = { close() { server.kill(); anth.srv.close(); } };
  const mode = (m) => fetch('http://127.0.0.1:5391/__mode/' + m);
  const b = await launch({ port: 9342 });
  const E = (x) => b.eval(x);
  const click = (sel) => E(`(()=>{const el=document.querySelector(${JSON.stringify(sel)}); if(!el) throw new Error('no existe ${sel.replace(/'/g, '')}'); el.click(); return true})()`);
  const stockB1 = (pid, size) => E(`MF.product('${pid}').variants.find(v=>v.size==='${size}').stock.b1`);

  console.log('Plan Básico: bloqueos');
  await b.goto(URL + 'index.html', 300);
  await E('localStorage.clear()');
  await b.goto(URL + 'demo.html?plan=basico#/clientes', 600);
  ok(await E(`!!document.querySelector('.lock-view') && document.querySelector('.lock-view').textContent.includes('disponible desde el plan Pro')`), 'Clientes bloqueado con aviso "desde el plan Pro"');
  ok(await E(`document.querySelectorAll('.nav-item.locked').length >= 8`), 'Menú marca los módulos bloqueados');
  ok(await E(`location.search === ''`), 'El parámetro ?plan= se limpia de la URL');
  await b.goto(URL + 'demo.html#/dashboard', 500);
  await click('[data-lock="ganancias"]');
  await sleep(250);
  ok(await E(`document.querySelector('.modal').textContent.includes('plan Pro')`), 'Tarjeta de ganancias bloqueada abre aviso de plan');
  await click('.modal [data-try]');
  await sleep(300);
  ok(await E(`MF.plan().id === 'pro' && !!document.querySelector('.kpi:not(.locked) .k-ic')`), '"Probar con Pro" cambia el plan');

  console.log('Punto de venta');
  await b.goto(URL + 'demo.html#/pos', 500);
  const before = await stockB1('p03', 'M');
  const salesBefore = await E('MF.get().sales.length');
  await click('[data-add="p03"]'); await sleep(250);
  await E(`[...document.querySelectorAll('.size-pick [data-v]')].find(x=>x.textContent.trim().startsWith('M')).click()`); await sleep(250);
  await E(`document.querySelector('#disc').value='10'; document.querySelector('#disc').dispatchEvent(new Event('change'))`); await sleep(100);
  const unit = await E("MF.price(MF.product('p03'))");
  ok(await E(`document.querySelector('#confirmSale').textContent.includes('Bs ' + (${unit} - 10))`), `Descuento de Bs 10 aplicado al total (precio con promoción Bs ${unit} → Bs ${unit - 10})`);
  await click('#confirmSale'); await sleep(300);
  ok(await E(`document.querySelector('.receipt') && document.querySelector('.receipt').textContent.includes('TOTAL')`), 'Muestra comprobante de venta');
  ok((await stockB1('p03', 'M')) === before - 1, `Stock de p03/M baja de ${before} a ${before - 1}`);
  ok((await E('MF.get().sales.length')) === salesBefore + 1, 'Venta registrada');

  console.log('Devolución (Pro)');
  await b.goto(URL + 'demo.html#/ventas', 500);
  await E(`document.querySelector('#hp').value='today'; document.querySelector('#hp').dispatchEvent(new Event('change'))`); await sleep(200);
  await click('[data-ret]'); await sleep(200);
  await click('#doRet'); await sleep(300);
  ok((await stockB1('p03', 'M')) === before, 'La devolución repone el stock');

  console.log('Catálogo → pedido por WhatsApp (reserva sin descontar)');
  await b.goto(URL + 'catalogo.html', 600);
  const s05 = await stockB1('p05', 'S');
  await click('.card[data-open="p05"]'); await sleep(250);
  await click('[data-size="S"]'); await sleep(100);
  await click('#addCart'); await sleep(200);
  ok(await E(`document.querySelector('#cartCount').textContent === '1'`), 'Carrito con 1 prenda');
  await click('#cartBtn'); await sleep(200);
  await click('[data-checkout="whatsapp"]'); await sleep(250);
  await E(`const f=document.querySelector('#cf'); f.name.value='Clienta de prueba'; f.requestSubmit()`); await sleep(300);
  const msg = await E(`document.querySelector('.msg-prev') && document.querySelector('.msg-prev').textContent`);
  ok(/Hola, quiero realizar un pedido en MioShop\.[\s\S]*talla S, cantidad 1: Bs 95[\s\S]*Total: Bs 95\.[\s\S]*Quisiera coordinar el pago y la entrega/.test(msg || ''), 'Mensaje de WhatsApp con el formato pedido');
  ok(await E(`document.querySelector('.done a.btn.wa').href.startsWith('https://wa.me/?text=')`), 'Sin número configurado: enlace wa.me sin número inventado');
  const order = await E(`MF.get().orders[0]`);
  ok(order.status === 'pendiente' && order.customer.name === 'Clienta de prueba', `Pedido #${order.number} pendiente`);
  ok((await stockB1('p05', 'S')) === s05, 'El stock no se descuenta todavía');
  ok((await E(`MF.reserved('p05','S')`)) >= 1, 'El stock queda reservado');

  console.log('Panel → confirmar y cancelar pedido');
  await b.goto(URL + 'demo.html#/pedidos', 500);
  await click(`[data-st="confirmado"][data-id="${order.id}"]`); await sleep(300);
  ok((await stockB1('p05', 'S')) === s05 - 1, 'Al confirmar se descuenta el stock');
  ok(await E(`!!MF.get().orders.find(o=>o.id==='${order.id}').saleId && MF.get().sales.some(s=>s.orderId==='${order.id}')`), 'Al confirmar se crea la venta online');
  await click(`[data-st="preparando"][data-id="${order.id}"]`); await sleep(250);
  await click(`[data-st="cancelado"][data-id="${order.id}"]`); await sleep(250);
  await click('.modal [data-ok]'); await sleep(300);
  ok((await stockB1('p05', 'S')) === s05, 'Cancelar un pedido confirmado repone el stock');
  ok(await E(`MF.get().sales.find(s=>s.orderId==='${order.id}').status === 'anulada'`), 'La venta asociada queda anulada');

  console.log('Catálogo → pago QR con comprobante pendiente de verificación');
  await b.goto(URL + 'catalogo.html', 600);
  await click('.card[data-open="p01"]'); await sleep(250);
  await click('[data-size="M"]'); await click('#addCart'); await sleep(150);
  await click('#cartBtn'); await sleep(150);
  await click('[data-checkout="qr"]'); await sleep(250);
  await E(`const f=document.querySelector('#cf'); f.name.value='Pago QR'; f.requestSubmit()`); await sleep(250);
  ok(await E(`document.querySelector('.amount').textContent.includes('Bs 102')`), 'Muestra el total a pagar con la promoción (Bs 120 − 15% = Bs 102)');
  ok(await E(`!!document.querySelector('.qr-box svg')`), 'Muestra el QR estático de demostración');
  await click('#regQr'); await sleep(200);
  await click('.modal-wrap:last-child [data-ok]'); await sleep(300);
  ok(await E(`MF.get().orders[0].status === 'esperando_pago' && MF.get().orders[0].method === 'qr'`), 'Pedido QR en "Esperando pago"');

  console.log('Registro con IA (Claude vía servidor)');
  await mode('ok');
  await b.goto(URL + 'demo.html#/productos?ia=1', 900);
  const nProd = await E('MF.get().products.length');
  const used = await E('MF.aiUsage().used');
  ok(await E(`document.querySelector('#aiSvc').textContent.includes('claude-haiku-5-5')`), 'Muestra que está conectado a Claude (claude-haiku-5-5)');
  await click('.ai-sample[data-sample$="chaleco-flecos.jpg"]'); await sleep(400);
  ok(await E(`!!document.querySelector('.ai-photo-big img') && !!document.querySelector('#aiGo')`), 'Vista previa de la foto antes de analizar');
  await click('#aiGo'); await sleep(60);
  const working = await E(`(document.querySelector('.ai-working')||{}).textContent || ''`);
  await sleep(1200);
  ok(working.includes('Identificando tu prenda con inteligencia artificial...') || (await E(`!!document.querySelector('.ai-form')`)), 'Indicador "Identificando tu prenda con inteligencia artificial..."');
  ok(await E(`document.querySelector('.ai-form [name=name]').value === 'Chaleco boho con flecos' && document.querySelector('.ai-form [name=category]').value === 'Chaquetas' && document.querySelector('.ai-form [name=tags]').value.includes('boho')`), 'Completa nombre, categoría y etiquetas con la respuesta de Claude');
  ok(await E(`document.querySelector('.ai-form [name=price]').value === '' && [...document.querySelectorAll('.size-qty input')].every(i => i.value === '0')`), 'Precio, tallas y cantidades quedan para la vendedora');
  ok(await E(`document.querySelector('.ai-meta').textContent.includes('1.534 tokens de entrada') && document.querySelector('.ai-meta').textContent.includes('USD 0.00036')`), 'Muestra tokens y costo del análisis');
  ok((await E('MF.aiUsage().used')) === used + 1, 'El crédito se descuenta al terminar el análisis');
  await E(`const f=document.querySelector('.ai-form'); f.name.value='Chaleco boho camel'; f.price.value='170'; f.querySelector('[name="sz-M"]').value='2'; f.requestSubmit()`); await sleep(500);
  const np = await E('MF.get().products[0]');
  ok(MF_ok(np), 'Producto guardado con los datos editados, origen IA y etiquetas');
  function MF_ok(p) { return p.name === 'Chaleco boho camel' && p.source === 'ia' && p.tags.includes('boho') && p.features.includes('flecos') && p.variants[0].stock.b1 === 2 && p.aiMeta.model === 'claude-haiku-5-5'; }
  ok((await E('MF.get().products.length')) === nProd + 1, 'Aparece en el inventario');

  console.log('IA: errores, prenda no identificada y varias prendas');
  await mode('error500');
  await b.goto(URL + 'demo.html#/productos?ia=1', 800);
  const used2 = await E('MF.aiUsage().used');
  await click('.ai-sample[data-sample$="top-verde-lunares.jpg"]'); await sleep(300);
  await click('#aiGo'); await sleep(2500);
  ok(await E(`document.querySelector('.ai-note.bad') && document.querySelector('.ai-note.bad').textContent.includes('No se pudo completar')`), 'Error de la API → aviso y botón Reintentar');
  ok((await E('MF.aiUsage().used')) === used2, 'Un análisis fallido no descuenta crédito');
  await mode('notgarment');
  await click('#aiGo'); await sleep(900);
  ok(await E(`document.querySelector('.ai-note.bad').textContent.includes('No identificamos una prenda') && !document.querySelector('.ai-form') && !!document.querySelector('#aiAgain')`), 'Sin prenda → aviso, sin formulario y botón "Volver a analizar"');
  await mode('multi');
  await click('#aiAgain'); await sleep(900);
  ok(await E(`document.querySelector('.ai-note.warn').textContent.includes('Se ven 3 prendas')`), 'Varias prendas → sugiere analizarlas por separado');

  console.log('Formulario de producto: "Analizar fotografía con IA"');
  await mode('ok');
  await b.goto(URL + 'demo.html#/productos?nuevo=1', 800);
  ok(await E(`document.querySelector('#aiAnalyze').disabled`), 'El botón espera a que haya una foto');
  await E(`(async()=>{const r=await fetch('assets/productos/chaleco-flecos.jpg');const bl=await r.blob();const dt=new DataTransfer();dt.items.add(new File([bl],'prenda.jpg',{type:'image/jpeg'}));const i=document.querySelector('#ph');i.files=dt.files;i.dispatchEvent(new Event('change'));})()`); await sleep(500);
  await click('#aiAnalyze'); await sleep(1200);
  ok(await E(`document.querySelector('#pf [name=name]').value === 'Chaleco boho con flecos' && document.querySelector('#pf [name=garmentType]').value === 'chaleco' && document.querySelector('#pf [name=style]').classList.contains('ai-filled')`), 'Completa el formulario y marca los campos llenados por la IA');
  ok(await E(`!!document.querySelector('#aiRe')`), 'Ofrece "Volver a analizar"');
  await E(`{const f=document.querySelector('#pf'); f.price.value='165'; document.querySelector('[data-vq="0"]').value='1'; document.querySelector('[data-vq="0"]').dispatchEvent(new Event('input')); document.querySelector('#saveP').click()}`); await sleep(400);
  ok(await E(`MF.get().products[0].name === 'Chaleco boho con flecos' && MF.get().products[0].source === 'ia' && MF.get().products[0].style === 'boho'`), 'Guarda el producto con los datos de la IA');

  console.log('Catálogo: búsqueda por etiquetas de la IA');
  await b.goto(URL + 'catalogo.html', 700);
  await E(`const q=document.querySelector('#q'); q.value='boho'; q.dispatchEvent(new Event('input'))`); await sleep(200);
  ok(await E(`[...document.querySelectorAll('#grid .card .name')].some(n => n.textContent.includes('Chaleco boho'))`), 'El producto publicado aparece en el catálogo al buscar una etiqueta');

  console.log('Plan Premium: sucursales');
  await b.goto(URL + 'demo.html#/inventario', 400);
  await click('[data-plan="premium"]'); await sleep(300);
  ok(await E(`!document.querySelector('#branchSel').disabled && document.querySelectorAll('#branchSel option').length === 3`), 'Selector de sucursal habilitado con 3 sucursales');
  ok(await E(`document.querySelectorAll('.tbl thead th').length >= 7`), 'Inventario muestra columnas por sucursal');

  console.log('Restaurar datos');
  await E(`MF.reset('basico')`);
  ok((await E('MF.get().products.length')) === 22, 'Restaurar vuelve a los 22 productos de MioShop');

  console.log(`\n${pass} correctas, ${fail} fallidas`);
  // El 502 de /api/ia/analizar es el error provocado a propósito en la prueba de fallas de la API
  const errs = b.errors.filter((e) => !(e.includes('502') && e.includes('/api/ia/analizar')));
  if (errs.length) console.log('Errores de consola:', errs);
  await b.close(); srv.close();
  process.exit(fail || errs.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
