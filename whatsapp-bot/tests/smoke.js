// Recorre todas las páginas, reporta errores de consola y toma capturas.
// node --experimental-websocket tests/smoke.js [carpetaCapturas] [filtro]
const path = require('path');
const fs = require('fs');
const { serve, launch } = require('./lib-cdp');

const OUT = path.resolve(process.argv[2] || path.join(__dirname, 'shots'));
const FILTER = process.argv[3] || '';
const PAGES = [
  'index.html', 'modulos.html', 'cotizador.html', 'planes.html',
  'prototipos/index.html', 'prototipos/dashboard.html', 'prototipos/whatsapp.html', 'prototipos/automatizaciones.html',
  'prototipos/ia.html', 'prototipos/conversaciones.html', 'prototipos/calendario.html', 'prototipos/crm.html',
  'prototipos/productos.html', 'prototipos/pedidos.html', 'prototipos/ventas.html', 'prototipos/campanas.html',
  'prototipos/reportes.html', 'prototipos/configuracion.html', 'prototipos/tienda.html'
].filter((p) => p.includes(FILTER) && fs.existsSync(path.join(__dirname, '..', p)));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve(5180);
  const b = await launch();
  let bad = 0;
  for (const p of PAGES) {
    b.errors.length = 0;
    await b.viewport(1366, 900);
    await b.goto(`http://127.0.0.1:5180/${p}`, 1500);
    const name = p.replace(/[\/.]/g, '_');
    await b.screenshot(path.join(OUT, `${name}.png`));
    await b.viewport(390, 844, true);
    await b.goto(`http://127.0.0.1:5180/${p}`, 1200);
    const overflow = await b.eval('document.documentElement.scrollWidth - document.documentElement.clientWidth');
    await b.screenshot(path.join(OUT, `${name}_m.png`));
    const errs = b.errors.slice();
    if (errs.length || overflow > 0) bad++;
    console.log(`${errs.length || overflow > 0 ? '✗' : '✓'} ${p}${overflow > 0 ? `  [desborde horizontal ${overflow}px]` : ''}`);
    errs.forEach((e) => console.log('    ' + String(e).split('\n').slice(0, 3).join(' | ')));
  }
  await b.close();
  srv.close();
  console.log(bad ? `\n${bad} página(s) con problemas` : '\nSin errores');
  process.exit(bad ? 1 : 0);
})();
