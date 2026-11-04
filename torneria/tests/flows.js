// Flujos completos en Chrome headless: node --experimental-websocket tests/flows.js [carpetaSalida]
// Verifica montos de pantalla vs PDF, descargas reales y operaciones del prototipo a través de la interfaz.
const path = require('path');
const fs = require('fs');
const { serve, launch, sleep } = require('./lib-cdp');

const OUT = path.resolve(process.argv[2] || path.join(__dirname, 'shots'));
const BASE = 'http://127.0.0.1:5183';
let ok = 0, bad = 0;
const check = (name, cond, extra = '') => { if (cond) { ok++; console.log(`✓ ${name}`); } else { bad++; console.log(`✗ ${name} ${extra}`); } };
// Términos de fabricación que no deben aparecer fuera de la lista de exclusiones.
const PROHIBIDOS = /torner|tornero|torneado|taller|fabricaci|producci[oó]n|operari|mecanizado|materia prima|[oó]rdenes de trabajo|orden de trabajo|\bOT-\d/i;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const DL = path.join(OUT, 'descargas');
  fs.rmSync(DL, { recursive: true, force: true });
  fs.mkdirSync(DL, { recursive: true });
  const srv = await serve(5183);
  const b = await launch({ port: 9336 });
  await b.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL }).catch(() => b.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DL }));
  const ev = (js) => b.eval(`(async () => { ${js} })()`);
  const waitFile = async (re, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const f = fs.readdirSync(DL).find((x) => re.test(x) && !x.endsWith('.crdownload')); if (f) return f; await sleep(250); } return null; };
  const lastToast = () => ev(`const t = [...document.querySelectorAll('.toast')].pop(); return t ? t.innerText : '';`);

  // ================= COTIZACIÓN =================
  await b.viewport(1366, 900);
  await b.goto(`${BASE}/index.html`, 1200);
  await ev(`localStorage.clear()`);
  await b.goto(`${BASE}/index.html`, 1200);
  const screen = await ev(`return { hero: document.getElementById('heroTotal').textContent, heroPago: document.getElementById('heroPago').textContent, subtotal: document.getElementById('costSubtotal').textContent, descuento: [...document.querySelectorAll('[data-descuento]')].map(x => x.textContent), total: document.getElementById('costTotal').textContent, invest: document.getElementById('investTotal').textContent, investBreak: document.getElementById('investBreak').textContent, pays: [...document.querySelectorAll('.pay-item strong')].map(x => x.textContent), rows: [...document.querySelectorAll('#costTable tbody tr')].map(tr => [tr.children[1].innerText.trim(), tr.children[3].innerText.trim()]), mods: [...document.querySelectorAll('.module')].map(x => x.dataset.mod), mant: document.getElementById('mantMonto').textContent, plazo: document.getElementById('heroPlazo').textContent, title: document.querySelector('.hero h1').textContent }`);
  check('nombre del proyecto actualizado', screen.title === 'Sistema de Gestión Comercial e Inventarios Multisucursal', screen.title);
  check('total final en pantalla = Bs 13.500 (encabezado, tabla e inversión)', screen.hero === 'Bs 13.500' && screen.total === 'Bs 13.500' && screen.invest === 'Bs 13.500', JSON.stringify(screen));
  check('subtotal Bs 14.000 y descuento comercial - Bs 500 visibles', screen.subtotal === 'Bs 14.000' && JSON.stringify(screen.descuento) === '["- Bs 500"]' && /Bs 14\.000/.test(screen.investBreak) && /Descuento comercial - Bs 500/.test(screen.investBreak) && /Bs 500/.test(screen.heroPago), JSON.stringify([screen.subtotal, screen.descuento, screen.investBreak, screen.heroPago]));
  check('pagos 50% / 50% = Bs 6.750 cada uno', JSON.stringify(screen.pays) === '["Bs 6.750","Bs 6.750"]', JSON.stringify(screen.pays));
  check('11 líneas en la tabla económica y 11 tarjetas de módulos, sin órdenes de trabajo', screen.rows.length === 11 && screen.mods.length === 11 && !screen.mods.includes('ordenes'));
  const suma = screen.rows.reduce((t, r) => t + Number(r[1].replace(/[^\d]/g, '')), 0);
  check('la suma de las filas mostradas es el subtotal 14.000', suma === 14000, String(suma));
  check('mantenimiento Bs 350 y plazo 6 a 10 semanas', screen.mant === 'Bs 350' && screen.plazo === '6 a 10 semanas');
  const pageTxt = await ev(`const c = document.body.cloneNode(true); c.querySelector('#exclList').remove(); return c.innerText`);
  check('la página no menciona fabricación ni órdenes de trabajo (salvo exclusiones)', !PROHIBIDOS.test(pageTxt), (pageTxt.match(PROHIBIDOS) || [])[0]);
  check('la página mantiene las órdenes de compra', /[oó]rdenes? de compra/i.test(pageTxt));
  check('exclusiones aclaran que no hay módulo de fabricación', /fabricación, producción u órdenes de trabajo/.test(await ev(`return document.getElementById('exclList').innerText`)));

  await ev(`document.querySelector('[data-mod="inventarios"]').click()`);
  await sleep(300);
  const modal = await ev(`const m = document.querySelector('.modal'); return m ? m.innerText : ''`);
  check('detalle de módulo abre con funcionalidades y costo', /Inventarios y transferencias/.test(modal) && /Bs 2\.000/.test(modal) && /Kardex/.test(modal) && /Ver en el prototipo/.test(modal));
  await ev(`document.querySelector('.modal [data-close]').click()`);

  const g10 = await ev(`return document.querySelectorAll('#gantt .g-head .g-cols span').length`);
  const etapas = await ev(`return [...document.querySelectorAll('#gantt .g-label b')].map(x => x.textContent)`);
  await ev(`document.querySelector('[data-esc="min"]').click()`);
  const g6 = await ev(`return document.querySelectorAll('#gantt .g-head .g-cols span').length`);
  check('cronograma alterna entre 10 y 6 semanas con las 6 etapas', g10 === 10 && g6 === 6 && etapas.length === 6 && etapas[2] === 'Compras y ventas', `${g10}/${g6} ${etapas.join(',')}`);

  // Datos del cliente → PDF
  await ev(`document.querySelector('[data-action="cliente"]').click()`);
  await sleep(250);
  await ev(`const f = document.getElementById('clienteForm'); f.razonSocial.value = 'Cliente de Prueba S.R.L.'; f.correo.value = 'correo-invalido'; document.querySelector('[data-act="guardar"]').click();`);
  await sleep(150);
  check('valida el correo del cliente', await ev(`return !!document.querySelector('#clienteForm .field-error')`));
  await ev(`const f = document.getElementById('clienteForm'); f.correo.value = 'compras@cliente.test'; document.querySelector('[data-act="guardar"]').click();`);
  await sleep(250);

  const pdf = await ev(`const doc = await TOR.pdf.create(TOR.getModel()); const n = doc.internal.getNumberOfPages(); const pages = []; for (let i = 1; i <= n; i++) pages.push(doc.internal.pages[i].join('\\n')); return { n, pages };`);
  const txt = pdf.pages.join('\n');
  const tx = (s) => txt.includes(`(${s})`) || txt.includes(s);
  // Texto plano del PDF (solo los literales de los operadores Tj), para buscar palabras.
  const plain = (txt.match(/\((?:\\.|[^\\)])*\) Tj/g) || []).map((x) => x.slice(1, -4)).join(' ');
  check(`PDF generado con ${pdf.n} páginas A4`, pdf.n >= 5 && pdf.n <= 12);
  check('PDF con el nuevo nombre del proyecto', tx('Sistema de Gestión Comercial e Inventarios Multisucursal'));
  check('PDF contiene subtotal Bs 14.000, descuento - Bs 500 y total final Bs 13.500', tx('Bs 14.000') && tx('- Bs 500') && tx('Descuento comercial') && tx('TOTAL FINAL') && tx('Bs 13.500'));
  check('PDF contiene anticipo y saldo Bs 6.750', (txt.match(/Bs 6\.750/g) || []).length >= 2);
  check('PDF con plazo de 6 a 10 semanas', tx('6 a 10 semanas') && tx('Escenario 10') && tx('Escenario 6') && tx('Diagrama del escenario de 10 semanas') && tx('Semanas 9 a 10'));
  const faltan = screen.rows.filter(([concepto, monto]) => !tx(monto) || !txt.includes(concepto.replace(/[^\x00-\xff]/g, '')));
  check('cada concepto y monto de la tabla en pantalla figura en el PDF', faltan.length === 0, JSON.stringify(faltan));
  const modsPdf = await ev(`return TOR.getModel().modulos.map(m => m.nombre)`);
  check('el PDF lista los mismos 11 módulos que la página', modsPdf.length === 11 && modsPdf.every((n) => txt.includes(n)), modsPdf.filter((n) => !txt.includes(n)).join(', '));
  const sinExcl = plain.replace(/Módulos de fabricación, producción u órdenes de trabajo\./, '');
  check('PDF sin fabricación ni órdenes de trabajo (salvo exclusiones)', !PROHIBIDOS.test(sinExcl) && tx('fabricación, producción u órdenes de trabajo'), (sinExcl.match(PROHIBIDOS) || [])[0]);
  check('PDF mantiene órdenes de compra y beneficios comerciales', tx('Órdenes de compra') && tx('Compras bajo control'));
  check('PDF numera páginas "Página X de N"', pdf.pages.every((p, i) => p.includes(`Página ${i + 1} de ${pdf.n}`)));
  check('PDF sin datos pendientes ni del cliente', !tx('[Por completar]') && !tx('Cliente de Prueba S.R.L.'));
  check('PDF incluye exclusiones, mantenimiento y condiciones comerciales', tx('Integración con el SIAT') && tx('Mantenimiento opcional') && tx('Condiciones comerciales'));
  check('PDF incluye el hosting de Bs 100 por 12 meses', tx('HOSTING') && tx('Bs 100/mes') && txt.includes('primeros 12 meses'));
  check('PDF sin páginas casi vacías', pdf.pages.slice(1, -1).every((p) => (p.match(/ Tj/g) || []).length > 25) && (pdf.pages[pdf.n - 1].match(/ Tj/g) || []).length > 10, pdf.pages.map((p) => (p.match(/ Tj/g) || []).length).join(','));

  await ev(`document.querySelector('.hero [data-action="pdf"]').click()`);
  const pdfFile = await waitFile(/^Cotizacion-COT-TOR-002-Sistema-Gestion-Comercial\.pdf$/);
  check('el botón descarga el PDF real', !!pdfFile && fs.statSync(path.join(DL, pdfFile)).size > 20000, pdfFile || 'sin archivo');
  if (pdfFile) fs.copyFileSync(path.join(DL, pdfFile), path.join(OUT, 'cotizacion.pdf'));

  // ================= PROTOTIPO =================
  await b.goto(`${BASE}/prototipo/index.html#/dashboard`, 1500);
  await ev(`localStorage.removeItem('torneria:demo-db'); localStorage.removeItem('torneria:demo-ui');`);
  await b.goto(`${BASE}/prototipo/index.html#/dashboard`, 1500);
  const S = 'TOR.store';

  // Menú lateral y dashboard comercial
  const menu = await ev(`return [...document.querySelectorAll('#sideNav a')].map(a => a.querySelector('span').textContent)`);
  check('menú lateral con los 13 módulos comerciales en orden', JSON.stringify(menu) === JSON.stringify(['Dashboard', 'Sucursales', 'Productos', 'Inventarios', 'Compras', 'Ventas', 'Cotizaciones', 'Clientes', 'Proveedores', 'Caja', 'Reportes', 'Usuarios', 'Configuración']), JSON.stringify(menu));
  const kpis = await ev(`return [...document.querySelectorAll('.kpi .k-label, .kpi small')].map(x => x.textContent).join(' | ')`);
  check('dashboard con indicadores comerciales', ['Ventas', 'Compras', 'Ingresos', 'Egresos', 'Utilidad estimada', 'Productos registrados', 'Productos con stock bajo', 'Valor del inventario'].every((k) => kpis.includes(k)), kpis);
  const dashTxt = await ev(`return document.getElementById('view').innerText`);
  check('dashboard con ventas por sucursal, más vendidos y compras vs. ventas', /Ventas por sucursal/.test(dashTxt) && /Productos más vendidos/.test(dashTxt) && /Compras vs\. ventas/.test(dashTxt) && (await ev(`return ['#chVC', '#chSuc', '#chIE', '#chTop', '#chCat'].every(id => document.querySelector(id + ' svg, ' + id + ' .hbar, ' + id + ' *'))`)));
  check('valor del inventario del dashboard cuadra con el stock', await ev(`const v = TOR.q.inventoryValue(); const k = [...document.querySelectorAll('.kpi')].find(x => /Valor del inventario/.test(x.innerText)); return k && k.querySelector('.k-value').textContent === TOR.ui.fmt.money(v)`));
  check('sin datos de fabricación en la demo', await ev(`const db = ${S}.db; return !('ordenes' in db) && !db.productos.some(p => 'tipo' in p) && db.productos.every(p => p.marca && p.descripcion) && !db.roles.some(r => 'ordenes' in r.permisos) && !JSON.stringify(db).match(/Tornería|tornero|torneado|taller|Orden de trabajo|SER-OT/i)`));
  await b.goto(`${BASE}/prototipo/index.html#/ordenes`, 800);
  check('la ruta #/ordenes ya no existe (vuelve al dashboard)', (await ev(`return document.getElementById('pageTitle').textContent`)) === 'Dashboard');

  await b.goto(`${BASE}/prototipo/index.html#/ventas`, 1200);
  const stock = (suc, sku) => ev(`const p = ${S}.db.productos.find(x => x.sku === '${sku}'); return ${S}.stockOf('${suc}', p.id)`);
  const pid = (sku) => ev(`return ${S}.db.productos.find(x => x.sku === '${sku}').id`);
  const setLine = (i, prod, qty, price) => ev(`const tr = document.querySelectorAll('.modal .lines tbody tr')[${i}]; const s = tr.querySelector('[data-f="producto"]'); s.value = '${prod}'; s.dispatchEvent(new Event('change', { bubbles: true })); const t2 = document.querySelectorAll('.modal .lines tbody tr')[${i}]; const q = t2.querySelector('[data-f="cantidad"]'); q.value = '${qty}'; q.dispatchEvent(new Event('input', { bubbles: true })); ${price !== undefined ? `const pr = t2.querySelector('[data-f="precio"],[data-f="costo"]'); pr.value='${price}'; pr.dispatchEvent(new Event('input', { bubbles: true }));` : ''}`);

  // Venta por la interfaz
  const rod = await pid('ROD-6204');
  const s0 = await stock('S1', 'ROD-6204');
  const nV = await ev(`return ${S}.db.ventas.length`);
  await ev(`document.getElementById('vNew').click()`);
  await sleep(200);
  await ev(`const f = document.querySelector('.modal [data-form]'); f.cliente.value = 'C1'; f.sucursal.value = 'S1'; f.sucursal.dispatchEvent(new Event('change'));`);
  await setLine(0, rod, 2);
  await ev(`const f = document.querySelector('.modal [data-form]'); f.metodo.value = 'qr'; f.descuento.value = '5'; f.descuento.dispatchEvent(new Event('input'));`);
  const totTxt = await ev(`return document.querySelector('#vTot .grand').innerText`);
  await ev(`document.querySelector('.modal [data-submit]').click()`);
  await sleep(300);
  const v = await ev(`return ${S}.db.ventas[0]`);
  check('venta registrada desde el formulario', (await ev(`return ${S}.db.ventas.length`)) === nV + 1 && v.descuento === 5 && v.metodo === 'qr', totTxt);
  check('la venta descuenta stock (−2 rodamientos)', (await stock('S1', 'ROD-6204')) === s0 - 2);
  check('la venta registra el ingreso en caja', await ev(`return ${S}.db.caja.movimientos[0].ref === '${v.codigo}' && ${S}.db.caja.movimientos[0].monto === ${v.total}`));
  check('se abre el comprobante interno', /COMPROBANTE INTERNO/.test(await ev(`return document.querySelector('.modal').innerText`)));
  await ev(`document.querySelectorAll('.modal-backdrop').forEach(m => m.remove())`);

  // Venta con stock insuficiente
  await ev(`document.getElementById('vNew').click()`);
  await sleep(200);
  await ev(`const f = document.querySelector('.modal [data-form]'); f.cliente.value = 'C2'; f.sucursal.value = 'S3'; f.sucursal.dispatchEvent(new Event('change'));`);
  await setLine(0, await pid('PLA-A36-10'), 99);
  await ev(`document.querySelector('.modal [data-submit]').click()`);
  await sleep(300);
  check('bloquea la venta sin stock suficiente', /Stock insuficiente/.test(await lastToast()) && (await ev(`return ${S}.db.ventas.length`)) === nV + 1);
  await ev(`document.querySelectorAll('.modal-backdrop').forEach(m => m.remove())`);

  // Validación de formulario vacío
  await ev(`document.getElementById('vNew').click()`);
  await sleep(200);
  await ev(`document.querySelector('.modal [data-submit]').click()`);
  check('valida campos obligatorios', await ev(`return document.querySelectorAll('.modal .field-error').length >= 1`));
  await ev(`document.querySelectorAll('.modal-backdrop').forEach(m => m.remove())`);

  // Compra recibida en el acto
  await b.goto(`${BASE}/prototipo/index.html#/compras`, 900);
  const b0 = await stock('S2', 'BRO-S65-200');
  await ev(`document.getElementById('cNew').click()`);
  await sleep(200);
  await ev(`const f = document.querySelector('.modal [data-form]'); f.proveedor.value = 'PR2'; f.sucursal.value = 'S2'; f.sucursal.dispatchEvent(new Event('change')); f.recibir.checked = true;`);
  await setLine(0, await pid('BRO-S65-200'), 25, 150);
  await ev(`document.querySelector('.modal [data-submit]').click()`);
  await sleep(300);
  const c = await ev(`return ${S}.db.compras[0]`);
  check('compra registrada y recibida', c.estado === 'recibida' && c.total === 3750, JSON.stringify([c.estado, c.total]));
  check('la recepción suma stock (+25 kg de bronce)', (await stock('S2', 'BRO-S65-200')) === b0 + 25);
  check('el costo del producto se actualiza al de la compra', (await ev(`return ${S}.db.productos.find(x => x.sku === 'BRO-S65-200').costo`)) === 150);
  await ev(`document.querySelectorAll('.modal-backdrop').forEach(m => m.remove())`);

  // Orden de compra pendiente → recepción posterior
  const r0 = await stock('S1', 'ROD-32210');
  await ev(`document.getElementById('cNew').click()`);
  await sleep(200);
  await ev(`const f = document.querySelector('.modal [data-form]'); f.proveedor.value = 'PR3'; f.sucursal.value = 'S1'; f.sucursal.dispatchEvent(new Event('change')); f.recibir.checked = false;`);
  await setLine(0, await pid('ROD-32210'), 12, 118);
  await ev(`document.querySelector('.modal [data-submit]').click()`);
  await sleep(300);
  const oc = await ev(`return ${S}.db.compras[0]`);
  check('orden de compra queda "Por recibir" sin mover stock', oc.estado === 'pendiente' && /^OC-/.test(oc.codigo) && (await stock('S1', 'ROD-32210')) === r0, JSON.stringify([oc.estado, oc.codigo]));
  await ev(`document.querySelectorAll('.modal-backdrop').forEach(m => m.remove())`);
  await b.goto(`${BASE}/prototipo/index.html#/compras/${oc.id}`, 900);
  await ev(`document.querySelector('.modal [data-receive]').click()`);
  await sleep(300);
  check('al recibir la orden de compra ingresa la mercadería', (await ev(`return ${S}.db.compras.find(x => x.id === '${oc.id}').estado`)) === 'recibida' && (await stock('S1', 'ROD-32210')) === r0 + 12);
  await ev(`document.querySelectorAll('.modal-backdrop').forEach(m => m.remove())`);

  // Cotización → venta
  await b.goto(`${BASE}/prototipo/index.html#/cotizaciones`, 900);
  await ev(`document.getElementById('qNew').click()`);
  await sleep(200);
  await ev(`const f = document.querySelector('.modal [data-form]'); f.cliente.value = 'C3'; f.sucursal.value = 'S1'; f.sucursal.dispatchEvent(new Event('change'));`);
  await setLine(0, await pid('ROD-6305'), 2);
  await ev(`document.querySelector('.modal [data-submit]').click()`);
  await sleep(300);
  const q = await ev(`return ${S}.db.cotizaciones[0]`);
  check('cotización comercial creada (2 rodamientos 6305 = Bs 136)', q.total === 136 && q.estado === 'borrador', JSON.stringify([q.total, q.estado]));
  const q0 = await stock('S1', 'ROD-6305');
  await ev(`document.querySelector('.modal [data-convert]').click()`);
  await sleep(300);
  check('cotización convertida en venta y descuenta stock', (await ev(`const q = ${S}.db.cotizaciones[0]; const v = ${S}.db.ventas[0]; return q.estado === 'convertida' && q.venta === v.id && v.cotizacion === q.id && v.total === 136`)) && (await stock('S1', 'ROD-6305')) === q0 - 2);
  await ev(`document.querySelectorAll('.modal-backdrop').forEach(m => m.remove())`);

  // Transferencia y ajuste
  await b.goto(`${BASE}/prototipo/index.html#/inventario`, 900);
  check('inventarios permite importar y exportar Excel', await ev(`return !!document.getElementById('iImp') && !!document.getElementById('iExp')`));
  const t1 = await stock('S1', 'PER-M12-50'), t2 = await stock('S3', 'PER-M12-50');
  await ev(`document.getElementById('iTr').click()`);
  await sleep(200);
  await ev(`const f = document.querySelector('.modal [data-form]'); f.origen.value = 'S1'; f.origen.dispatchEvent(new Event('change')); f.destino.value = 'S3'; f.producto.value = TOR.store.db.productos.find(x => x.sku === 'PER-M12-50').id; f.cantidad.value = '100'; document.querySelector('.modal [data-submit]').click();`);
  await sleep(300);
  check('transferencia mueve stock entre sucursales', (await stock('S1', 'PER-M12-50')) === t1 - 100 && (await stock('S3', 'PER-M12-50')) === t2 + 100);
  await ev(`document.getElementById('iAdj').click()`);
  await sleep(200);
  await ev(`const f = document.querySelector('.modal [data-form]'); f.sucursal.value = 'S1'; f.producto.value = TOR.store.db.productos.find(x => x.sku === 'ROD-6205').id; f.producto.dispatchEvent(new Event('change')); f.nuevo.value = '40'; f.motivo.value = 'Conteo físico'; document.querySelector('.modal [data-submit]').click();`);
  await sleep(300);
  check('ajuste deja el stock en lo contado', (await stock('S1', 'ROD-6205')) === 40);
  await ev(`document.querySelector('#iTable tbody tr').click()`);
  await sleep(300);
  check('kardex del producto con saldos', /Kardex/.test(await ev(`return document.querySelector('.modal').innerText`)) && (await ev(`return document.querySelectorAll('.modal #kTable tbody tr').length`)) > 0);
  await ev(`document.querySelectorAll('.modal-backdrop').forEach(m => m.remove())`);
  await ev(`document.getElementById('iImp').click()`);
  await sleep(200);
  await ev(`document.querySelector('.modal [data-tpl]').click()`);
  const tplF = await waitFile(/^conteo-CM-.*\.csv$/);
  check('descarga la plantilla de conteo para importar existencias', !!tplF && fs.readFileSync(path.join(DL, tplF), 'utf8').includes('SKU;Cantidad contada'));
  await ev(`document.querySelectorAll('.modal-backdrop').forEach(m => m.remove())`);

  // Caja: cierre, bloqueo de efectivo con caja cerrada, apertura
  await b.goto(`${BASE}/prototipo/index.html#/caja`, 900);
  await ev(`document.querySelector('[data-close-cash="S2"]').click()`);
  await sleep(200);
  await ev(`const f = document.querySelector('.modal [data-form]'); f.contado.value = String(Number(f.contado.value) - 10); document.querySelector('.modal [data-submit]').click();`);
  await sleep(300);
  check('cierre de caja con faltante registrado', await ev(`const s = TOR.store.db.caja.sesiones.filter(x => x.sucursal === 'S2').pop(); return s.estado === 'cerrada' && Math.round((s.montoCierre - s.montoEsperado) * 100) === -1000`));
  await ev(`TOR.store.setUI({ sucursal: 'S2' }); document.querySelector('[data-mov="egreso"]').click()`);
  await sleep(250);
  await ev(`const f = document.querySelector('.modal [data-form]'); f.concepto.value = 'Pago de flete'; f.monto.value = '50'; f.metodo.value = 'efectivo'; document.querySelector('.modal [data-submit]').click();`);
  await sleep(250);
  check('no permite egreso en efectivo con la caja cerrada', /caja está cerrada/i.test(await lastToast()));
  await ev(`document.querySelectorAll('.modal-backdrop').forEach(m => m.remove()); document.querySelector('[data-open-cash="S2"]').click()`);
  await sleep(200);
  await ev(`document.querySelector('.modal [data-submit]').click()`);
  await sleep(250);
  check('apertura de caja', await ev(`return !!TOR.store.cajaAbierta('S2')`));
  await ev(`TOR.store.setUI({ sucursal: '*' })`);

  // Filtro por sucursal y búsqueda global
  await b.goto(`${BASE}/prototipo/index.html#/dashboard`, 1200);
  const kAll = await ev(`return document.querySelector('.kpi .k-value').textContent`);
  await ev(`const s = document.getElementById('branchSelect'); s.value = 'S3'; s.dispatchEvent(new Event('change'));`);
  await sleep(400);
  const kS3 = await ev(`return document.querySelector('.kpi .k-value').textContent`);
  check('el selector de sucursal filtra los indicadores', kAll !== kS3 && /Sucursal Sur/.test(await ev(`return document.getElementById('crumbGroup').textContent`)), `${kAll} / ${kS3}`);
  await ev(`const s = document.getElementById('branchSelect'); s.value = '*'; s.dispatchEvent(new Event('change'));`);
  await ev(`const g = document.getElementById('globalSearch'); g.value = 'rodamiento'; g.dispatchEvent(new Event('input'));`);
  await sleep(200);
  check('búsqueda global encuentra productos', (await ev(`return document.querySelectorAll('#searchResults a').length`)) >= 3);

  // Permisos: cambiar a un vendedor
  await ev(`document.getElementById('userBtn').click()`);
  await sleep(100);
  await ev(`document.querySelector('#userPop [data-user="U6"]').click()`);
  await sleep(400);
  check('vendedor: módulos sin permiso bloqueados y redirige', (await ev(`return document.querySelectorAll('#sideNav a[aria-disabled]').length`)) >= 7 && (await ev(`return location.hash`)) !== '#/dashboard' && (await ev(`return document.getElementById('userRole').textContent`)) === 'Vendedor');
  await b.goto(`${BASE}/prototipo/index.html#/caja`, 800);
  check('vendedor: Caja muestra "Sin acceso"', /Sin acceso/.test(await ev(`return document.getElementById('view').innerText`)));
  check('vendedor: solo ve su sucursal', (await ev(`return [...document.querySelectorAll('#branchSelect option')].map(o => o.value).join()`)) === 'S1');
  await ev(`TOR.store.setUI({ usuario: 'U1', sucursal: '*' })`);

  // Reportes: exportaciones reales
  await b.goto(`${BASE}/prototipo/index.html#/reportes`, 1000);
  const tipos = await ev(`return [...document.querySelectorAll('[data-rt]')].map(x => x.dataset.rt)`);
  check('6 reportes comerciales (sin órdenes de trabajo)', JSON.stringify(tipos) === JSON.stringify(['ventas', 'compras', 'inventario', 'movimientos', 'sucursales', 'caja']), JSON.stringify(tipos));
  let filas = true;
  for (const t of tipos) { await ev(`document.querySelector('[data-rt="${t}"]').click()`); await sleep(150); filas = filas && (await ev(`return document.querySelectorAll('#rTable tbody tr').length`)) > 0; }
  check('los 6 reportes se renderizan con datos', filas);
  await ev(`document.getElementById('rCsv').click()`);
  const csvF = await waitFile(/^reporte-caja.*\.csv$/);
  check('exporta el reporte a Excel (CSV)', !!csvF && fs.readFileSync(path.join(DL, csvF), 'utf8').includes('Fecha;Sucursal;Concepto'));
  await ev(`document.getElementById('rPdf').click()`);
  const repF = await waitFile(/^reporte-caja.*\.pdf$/);
  check('exporta el reporte a PDF', !!repF && fs.statSync(path.join(DL, repF)).size > 5000);

  // Productos: crear con validación de SKU duplicado
  await b.goto(`${BASE}/prototipo/index.html#/productos`, 900);
  await ev(`document.getElementById('pNew').click()`);
  await sleep(200);
  check('formulario de producto con campos comerciales', await ev(`const f = document.querySelector('.modal [data-form]'); return ['sku', 'nombre', 'categoria', 'marca', 'descripcion', 'unidad', 'costo', 'precio', 'stockInicial', 'sucursal'].every(n => f[n]) && !f.tipo`));
  await ev(`const f = document.querySelector('.modal [data-form]'); f.sku.value = 'ROD-6204'; f.nombre.value = 'Duplicado'; f.costo.value = '1'; f.precio.value = '2'; document.querySelector('.modal [data-submit]').click();`);
  await sleep(250);
  check('rechaza SKU duplicado', /Ya existe un producto/.test(await lastToast()));
  await ev(`const f = document.querySelector('.modal [data-form]'); f.sku.value = 'ROD-6206'; f.nombre.value = 'Rodamiento 6206 2RS'; f.marca.value = 'Rodatec'; f.descripcion.value = 'Rodamiento rígido de bolas sellado'; f.categoria.value = 'Rodamientos'; f.unidad.value = 'pza'; f.costo.value = '38'; f.precio.value = '56'; f.stockInicial.value = '30'; f.sucursal.value = 'S1'; document.querySelector('.modal [data-submit]').click();`);
  await sleep(300);
  check('crea producto con marca y stock inicial', (await stock('S1', 'ROD-6206')) === 30 && (await ev(`return ${S}.db.productos.find(x => x.sku === 'ROD-6206').marca`)) === 'Rodatec');

  // Persistencia: recargar mantiene los cambios
  await b.goto(`${BASE}/prototipo/index.html#/productos`, 900);
  check('los datos persisten al recargar', (await stock('S1', 'ROD-6206')) === 30);

  // Ninguna pantalla del prototipo muestra textos de fabricación
  const rutas = await ev(`return Object.keys(TOR.app.ROUTES)`);
  const conTexto = [];
  for (const r of rutas) { await b.goto(`${BASE}/prototipo/index.html#/${r}`, 500); const t = await ev(`return document.body.innerText`); if (PROHIBIDOS.test(t)) conTexto.push(`${r}: ${t.match(PROHIBIDOS)[0]}`); }
  check(`las ${rutas.length} pantallas del prototipo sin referencias a fabricación`, rutas.length === 13 && !conTexto.length, conTexto.join(' | '));
  const enlaces = await ev(`return [...document.querySelectorAll('a[href^="#/"]')].map(a => a.getAttribute('href').replace(/^#\\//, '').split(/[/?]/)[0]).filter(r => !TOR.app.ROUTES[r])`);
  check('sin enlaces rotos a rutas inexistentes', !enlaces.length, enlaces.join(','));

  check('sin errores de consola en todo el recorrido', b.errors.length === 0, b.errors.join(' | '));
  await b.close();
  srv.close();
  console.log(`\n${ok} correctas · ${bad} fallidas`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
