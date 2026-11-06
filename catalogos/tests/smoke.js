// Recorre todas las pantallas en escritorio y móvil, detecta errores de consola y
// desbordes horizontales, y guarda capturas. Uso: node --experimental-websocket tests/smoke.js <carpeta>
const path = require('path');
const fs = require('fs');
const { serve, launch, sleep } = require('./lib-cdp');
const OUT = path.resolve(process.argv[2] || 'shots');
fs.mkdirSync(OUT, { recursive: true });
const PORT = 5303;
const B = `http://localhost:${PORT}/`;
const PAGES = [
  'index.html', 'login.html', 'registro.html',
  'catalogo.html?c=tecnostore', 'catalogo.html?c=moda-urbana', 'catalogo.html?c=glow-belleza', 'catalogo.html?c=distribuidora-andina',
  'catalogo.html?c=moda-urbana&p=mu-104', 'catalogo.html?c=no-existe',
  'dashboard.html#/inicio', 'dashboard.html#/integraciones', 'dashboard.html#/integraciones?tab=drive&f=fd-tecno-fotos', 'dashboard.html#/mapeo', 'dashboard.html#/productos',
  'dashboard.html#/catalogos', 'dashboard.html#/editor', 'dashboard.html#/whatsapp', 'dashboard.html#/estadisticas', 'dashboard.html#/suscripcion', 'dashboard.html#/cuenta',
  'admin.html#/resumen', 'admin.html#/cuentas', 'admin.html#/suscripciones', 'admin.html#/pruebas', 'admin.html#/planes'
];
(async () => {
  const srv = await serve(PORT);
  const b = await launch({ port: 9403 });
  const ev = (js) => b.eval(js);
  await b.goto(B + 'index.html', 800);
  await ev('localStorage.clear(); sessionStorage.clear(); true');
  await b.goto(B + 'dashboard.html?demo=1', 900);
  let fails = 0;
  for (const [w, h, mob, tag] of [[1366, 900, false, 'd'], [390, 844, true, 'm']]) {
    await b.viewport(w, h, mob);
    for (const p of PAGES) {
      b.errors.length = 0;
      await b.goto(B + p, 900);
      await ev('document.querySelectorAll(".reveal").forEach(e => e.classList.add("in")); true').catch(() => {});
      await sleep(250);
      const full = !p.startsWith('dashboard.html#/editor');
      await b.screenshot(path.join(OUT, tag + '-' + p.replace(/[#/.?=&]+/g, '_') + '.png'), { full });
      const overflow = await ev('document.documentElement.scrollWidth - document.documentElement.clientWidth');
      if (b.errors.length || overflow > 2) { fails++; console.log('✗', tag, p, b.errors.slice(0, 3), overflow > 2 ? 'overflow ' + overflow : ''); }
    }
    // Modales clave
    b.errors.length = 0;
    await b.goto(B + 'catalogo.html?c=tecnostore', 800);
    await ev('document.querySelector("#c-main [data-open]").click(); true'); await sleep(500);
    await b.screenshot(path.join(OUT, tag + '-modal-producto.png'));
    await ev('document.querySelector("[data-close]").click(); document.querySelector("[data-add]").click(); document.getElementById("cListBtn").click(); true'); await sleep(500);
    await b.screenshot(path.join(OUT, tag + '-lista-consulta.png'));
    await b.goto(B + 'dashboard.html#/catalogos', 800);
    await ev('document.getElementById("newCat").click(); true'); await sleep(500);
    await b.screenshot(path.join(OUT, tag + '-nuevo-catalogo.png'));
    if (b.errors.length) { fails++; console.log('✗', tag, 'modales', b.errors.slice(0, 3)); }
  }
  console.log(fails ? fails + ' problemas' : 'OK: sin errores ni desbordes horizontales');
  await b.close(); srv.close();
  process.exit(fails ? 1 : 0);
})();
