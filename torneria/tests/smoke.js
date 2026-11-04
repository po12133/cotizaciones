// Recorre la propuesta y las 13 pantallas del prototipo (escritorio y móvil): errores de consola,
// desborde horizontal y capturas. node --experimental-websocket tests/smoke.js [carpetaCapturas] [filtro]
const path = require('path');
const fs = require('fs');
const { serve, launch } = require('./lib-cdp');

const OUT = path.resolve(process.argv[2] || path.join(__dirname, 'shots'));
const FILTER = process.argv[3] || '';
const ROUTES = ['dashboard', 'sucursales', 'productos', 'inventario', 'compras', 'ventas', 'cotizaciones', 'clientes', 'proveedores', 'caja', 'reportes', 'usuarios', 'configuracion'];
const PAGES = ['index.html', ...ROUTES.map((r) => `prototipo/index.html#/${r}`)].filter((p) => p.includes(FILTER));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve(5181);
  const b = await launch({ port: 9334 });
  let bad = 0;
  for (const p of PAGES) {
    for (const [w, h, mobile, suf] of [[1440, 900, false, ''], [390, 844, true, '_m']]) {
      b.errors.length = 0;
      await b.viewport(w, h, mobile);
      await b.goto('about:blank', 50);
      await b.goto(`http://127.0.0.1:5181/${p}`, 1300);
      const overflow = await b.eval('document.documentElement.scrollWidth - document.documentElement.clientWidth');
      const empty = p.includes('#/') ? await b.eval("document.querySelector('#view').innerText.trim().length < 50") : false;
      const name = p.replace(/[\/.#]/g, '_');
      await b.screenshot(path.join(OUT, `${name}${suf}.png`));
      const errs = b.errors.slice();
      const fail = errs.length || overflow > 0 || empty;
      if (fail) bad++;
      console.log(`${fail ? '✗' : '✓'} ${p}${suf ? ' (móvil)' : ''}${overflow > 0 ? `  [desborde ${overflow}px]` : ''}${empty ? '  [vista vacía]' : ''}`);
      errs.forEach((e) => console.log('    ' + String(e).split('\n').slice(0, 3).join(' | ')));
    }
  }
  await b.close();
  srv.close();
  console.log(bad ? `\n${bad} vista(s) con problemas` : '\nSin errores');
  process.exit(bad ? 1 : 0);
})();
