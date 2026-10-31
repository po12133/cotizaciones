// Flujos completos en Chrome headless: node --experimental-websocket tests/flows.js [carpetaSalida]
// Verifica montos de pantalla vs PDF, descargas reales y operaciones del prototipo a través de la interfaz.
const path = require('path');
const fs = require('fs');
const { serve, launch, sleep } = require('./lib-cdp');

const OUT = path.resolve(process.argv[2] || path.join(__dirname, 'shots'));
const BASE = 'http://127.0.0.1:5183';
let ok = 0, bad = 0;
const check = (name, cond, extra = '') => { if (cond) { ok++; console.log(`✓ ${name}`); } else { bad++; console.log(`✗ ${name} ${extra}`); } };

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
  const screen = await ev(`return { hero: document.getElementById('heroTotal').textContent, total: document.getElementById('costTotal').textContent, invest: document.getElementById('investTotal').textContent, pays: [...document.querySelectorAll('.pay-item strong')].map(x => x.textContent), rows: [...document.querySelectorAll('#costTable tbody tr')].map(tr => [tr.children[1].innerText.trim(), tr.children[3].innerText.trim()]), mods: document.querySelectorAll('.module').length, mant: document.getElementById('mantMonto').textContent }`);
  check('total en pantalla = Bs 16.500 (encabezado, tabla e inversión)', screen.hero === 'Bs 16.500' && screen.total === 'Bs 16.500' && screen.invest === 'Bs 16.500', JSON.stringify(screen));
  check('pagos 50% / 50% = Bs 8.250 cada uno', JSON.stringify(screen.pays) === '["Bs 8.250","Bs 8.250"]');
  check('12 líneas en la tabla económica y 12 tarjetas de módulos', screen.rows.length === 12 && screen.mods === 12);
  const suma = screen.rows.reduce((t, r) => t + Number(r[1].replace(/[^\d]/g, '')), 0);
  check('la suma de las filas mostradas es 16.500', suma === 16500, String(suma));
  check('mantenimiento Bs 350', screen.mant === 'Bs 350');

  await ev(`document.querySelector('[data-mod="ordenes"]').click()`);
  await sleep(300);
  const modal = await ev(`const m = document.querySelector('.modal'); return m ? m.innerText : ''`);
  check('detalle de módulo abre con funcionalidades y costo', /Órdenes de trabajo/.test(modal) && /Bs 2\.500/.test(modal) && /Ver en el prototipo/.test(modal));
  await ev(`document.querySelector('.modal [data-close]').click()`);

  const g12 = await ev(`return document.querySelectorAll('#gantt .g-head .g-cols span').length`);
  await ev(`document.querySelector('[data-esc="min"]').click()`);
  const g8 = await ev(`return document.querySelectorAll('#gantt .g-head .g-cols span').length`);
  check('cronograma alterna entre 12 y 8 semanas', g12 === 12 && g8 === 8, `${g12}/${g8}`);

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
  check(`PDF generado con ${pdf.n} páginas A4`, pdf.n >= 5 && pdf.n <= 12);
  check('PDF contiene la inversión total Bs 16.500', tx('Bs 16.500'));
  check('PDF contiene anticipo y saldo Bs 8.250', (txt.match(/Bs 8\.250/g) || []).length >= 2);
  const faltan = screen.rows.filter(([concepto, monto]) => !tx(monto) || !txt.includes(concepto.replace(/[^\x00-\xff]/g, '')));
  check('cada concepto y monto de la tabla en pantalla figura en el PDF', faltan.length === 0, JSON.stringify(faltan));
  check('PDF numera páginas "Página X de N"', pdf.pages.every((p, i) => p.includes(`Página ${i + 1} de ${pdf.n}`)));
  check('PDF sin datos pendientes ni del cliente', !tx('[Por completar]') && !tx('Cliente de Prueba S.R.L.'));
  check('PDF incluye exclusiones, mantenimiento y condiciones comerciales', tx('Integración con el SIAT') && tx('Mantenimiento opcional') && tx('Condiciones comerciales'));
  check('PDF incluye el hosting de Bs 100 por 12 meses', tx('Bs 100/mes (12 meses)') && txt.includes('Bs 100 por mes durante los primeros 12 meses'));
  check('PDF sin páginas casi vacías', pdf.pages.slice(1, -1).every((p) => (p.match(/ Tj/g) || []).length > 25) && (pdf.pages[pdf.n - 1].match(/ Tj/g) || []).length > 10, pdf.pages.map((p) => (p.match(/ Tj/g) || []).length).join(','));

  await ev(`document.querySelector('.hero [data-action="pdf"]').click()`);
  const pdfFile = await waitFile(/^Cotizacion-COT-TOR-001.*\.pdf$/);
  check('el botón descarga el PDF real', !!pdfFile && fs.statSync(path.join(DL, pdfFile)).size > 20000, pdfFile || 'sin archivo');
  if (pdfFile) fs.copyFileSync(path.join(DL, pdfFile), path.join(OUT, 'cotizacion.pdf'));

  // ================= PROTOTIPO =================
  await b.goto(`${BASE}/prototipo/index.html#/dashboard`, 1500);
  await ev(`localStorage.removeItem('torneria:demo-db'); localStorage.removeItem('torneria:demo-ui');`);
  await b.goto(`${BASE}/prototipo/index.html#/ventas`, 1500);
  const S = 'TOR.store';
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

  // Compra recibida
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

  // Cotización → venta
  await b.goto(`${BASE}/prototipo/index.html#/cotizaciones`, 900);
  await ev(`document.getElementById('qNew').click()`);
  await sleep(200);
  await ev(`const f = document.querySelector('.modal [data-form]'); f.cliente.value = 'C3'; f.sucursal.value = 'S1'; f.sucursal.dispatchEvent(new Event('change'));`);
  await setLine(0, await pid('SER-TOR-H'), 4);
  await ev(`document.querySelector('.modal [data-submit]').click()`);
  await sleep(300);
  const q = await ev(`return ${S}.db.cotizaciones[0]`);
  check('cotización creada (4 h de torneado = Bs 480)', q.total === 480 && q.estado === 'borrador');
  await ev(`document.querySelector('.modal [data-convert]').click()`);
  await sleep(300);
  check('cotización convertida en venta', await ev(`const q = ${S}.db.cotizaciones[0]; const v = ${S}.db.ventas[0]; return q.estado === 'convertida' && q.venta === v.id && v.cotizacion === q.id && v.total === 480`));
  await ev(`document.querySelectorAll('.modal-backdrop').forEach(m => m.remove())`);

  // Orden de trabajo: crear, iniciar (consume material) y entregar (genera venta)
  await b.goto(`${BASE}/prototipo/index.html#/ordenes`, 900);
  const a0 = await stock('S1', 'ACE-4140-150');
  await ev(`document.getElementById('newOT').click()`);
  await sleep(250);
  await ev(`const f = document.querySelector('.modal [data-form]'); f.cliente.value = 'C1'; f.sucursal.value = 'S1'; f.sucursal.dispatchEvent(new Event('change')); f.descripcion.value = 'Fabricación de eje de prueba Ø 40 mm'; f.material.value = 'Acero SAE 4140'; f.responsable.value = 'U6'; const d = new Date(); d.setDate(d.getDate() + 5); f.entrega.value = d.toISOString().slice(0,10); f.horas.value = '5'; f.horas.dispatchEvent(new Event('input')); f.precio.value = '900'; f.anticipo.value = '300';`);
  await setLine(0, await pid('ACE-4140-150'), 1.5);
  await ev(`document.querySelector('.modal [data-submit]').click()`);
  await sleep(300);
  const o = await ev(`return ${S}.db.ordenes[0]`);
  check('orden de trabajo creada con costo estimado', o.descripcion.includes('eje de prueba') && o.costoEstimado === Math.round((1.5 * 120 + 5 * 60) * 100) / 100 && o.estado === 'pendiente', JSON.stringify([o.costoEstimado]));
  check('el anticipo entra a caja', await ev(`return ${S}.db.caja.movimientos[0].ref === '${o.codigo}' && ${S}.db.caja.movimientos[0].monto === 300`));
  check('se abre el detalle de la orden', /Seguimiento/.test(await ev(`return document.querySelector('.modal').innerText`)));
  await ev(`const f = document.getElementById('otState'); f.estado.value = 'en_proceso'; f.nota.value = 'Inicio'; document.querySelector('.modal [data-save]').click();`);
  await sleep(300);
  check('al iniciar se descuenta el material (−1,5 m)', (await stock('S1', 'ACE-4140-150')) === Math.round((a0 - 1.5) * 100) / 100);
  for (const e of ['control_calidad', 'terminada', 'entregada']) {
    await ev(`const f = document.getElementById('otState'); f.estado.value = '${e}'; f.estado.dispatchEvent(new Event('change')); document.querySelector('.modal [data-save]').click();`);
    await sleep(300);
  }
  const o2 = await ev(`return ${S}.db.ordenes.find(x => x.id === '${o.id}')`);
  const vOT = await ev(`return ${S}.db.ventas[0]`);
  check('la orden pasa por todos los estados con historial', o2.estado === 'entregada' && o2.historial.length === 5);
  check('al entregar se registra la venta por Bs 900 y se cobra el saldo de Bs 600', vOT.orden === o.id && vOT.total === 900 && (await ev(`return ${S}.db.caja.movimientos[0].monto`)) === 600);
  await ev(`document.querySelectorAll('.modal-backdrop').forEach(m => m.remove())`);

  // Transferencia y ajuste
  await b.goto(`${BASE}/prototipo/index.html#/inventario`, 900);
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

  // Caja: cierre, bloqueo de efectivo con caja cerrada, apertura
  await b.goto(`${BASE}/prototipo/index.html#/caja`, 900);
  await ev(`document.querySelector('[data-close-cash="S2"]').click()`);
  await sleep(200);
  await ev(`const f = document.querySelector('.modal [data-form]'); f.contado.value = String(Number(f.contado.value) - 10); document.querySelector('.modal [data-submit]').click();`);
  await sleep(300);
  check('cierre de caja con faltante registrado', await ev(`const s = TOR.store.db.caja.sesiones.filter(x => x.sucursal === 'S2').pop(); return s.estado === 'cerrada' && Math.round((s.montoCierre - s.montoEsperado) * 100) === -1000`), await ev(`return JSON.stringify(TOR.store.db.caja.sesiones.filter(x => x.sucursal === 'S2').pop()) + ' | ' + (document.querySelector('.modal') ? document.querySelector('.modal').innerText.slice(0, 300) : '') + ' | ' + ([...document.querySelectorAll('.toast')].pop() || {}).innerText`));
  await ev(`TOR.store.setUI({ sucursal: 'S2' }); document.querySelector('[data-mov="egreso"]').click()`);
  await sleep(250);
  await ev(`const f = document.querySelector('.modal [data-form]'); f.concepto.value = 'Compra de guantes'; f.monto.value = '50'; f.metodo.value = 'efectivo'; document.querySelector('.modal [data-submit]').click();`);
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

  // Permisos: cambiar a tornero
  await ev(`document.getElementById('userBtn').click()`);
  await sleep(100);
  await ev(`document.querySelector('#userPop [data-user="U6"]').click()`);
  await sleep(400);
  check('tornero: módulos sin permiso bloqueados y redirige', (await ev(`return document.querySelectorAll('#sideNav a[aria-disabled]').length`)) >= 10 && (await ev(`return location.hash`)) !== '#/dashboard');
  await b.goto(`${BASE}/prototipo/index.html#/ventas`, 800);
  check('tornero: Ventas muestra "Sin acceso"', /Sin acceso/.test(await ev(`return document.getElementById('view').innerText`)));
  check('tornero: solo ve su sucursal', (await ev(`return [...document.querySelectorAll('#branchSelect option')].map(o => o.value).join()`)) === 'S1');
  await ev(`TOR.store.setUI({ usuario: 'U1', sucursal: '*' })`);

  // Reportes: exportaciones reales
  await b.goto(`${BASE}/prototipo/index.html#/reportes`, 1000);
  for (const t of ['ventas', 'compras', 'inventario', 'movimientos', 'sucursales', 'ordenes']) { await ev(`document.querySelector('[data-rt="${t}"]').click()`); await sleep(150); }
  check('los 6 reportes se renderizan', (await ev(`return document.querySelectorAll('#rTable tbody tr').length`)) > 0);
  await ev(`document.getElementById('rCsv').click()`);
  const csvF = await waitFile(/^reporte-ordenes.*\.csv$/);
  check('exporta el reporte a Excel (CSV)', !!csvF && fs.readFileSync(path.join(DL, csvF), 'utf8').includes('Código;Cliente;Trabajo'));
  await ev(`document.getElementById('rPdf').click()`);
  const repF = await waitFile(/^reporte-ordenes.*\.pdf$/);
  check('exporta el reporte a PDF', !!repF && fs.statSync(path.join(DL, repF)).size > 5000);

  // Productos: crear con validación de SKU duplicado
  await b.goto(`${BASE}/prototipo/index.html#/productos`, 900);
  await ev(`document.getElementById('pNew').click()`);
  await sleep(200);
  await ev(`const f = document.querySelector('.modal [data-form]'); f.sku.value = 'ROD-6204'; f.nombre.value = 'Duplicado'; f.costo.value = '1'; f.precio.value = '2'; document.querySelector('.modal [data-submit]').click();`);
  await sleep(250);
  check('rechaza SKU duplicado', /Ya existe un producto/.test(await lastToast()));
  await ev(`const f = document.querySelector('.modal [data-form]'); f.sku.value = 'ROD-6206'; f.nombre.value = 'Rodamiento 6206 2RS'; f.categoria.value = 'Rodamientos'; f.unidad.value = 'pza'; f.costo.value = '38'; f.precio.value = '56'; f.stockInicial.value = '30'; f.sucursal.value = 'S1'; document.querySelector('.modal [data-submit]').click();`);
  await sleep(300);
  check('crea producto con stock inicial', (await stock('S1', 'ROD-6206')) === 30);

  // Persistencia: recargar mantiene los cambios
  await b.goto(`${BASE}/prototipo/index.html#/productos`, 900);
  check('los datos persisten al recargar', (await stock('S1', 'ROD-6206')) === 30);

  check('sin errores de consola en todo el recorrido', b.errors.length === 0, b.errors.join(' | '));
  await b.close();
  srv.close();
  console.log(`\n${ok} correctas · ${bad} fallidas`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
