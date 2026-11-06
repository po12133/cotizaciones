// Recorre todas las pantallas en escritorio y móvil, detecta errores de consola y
// desbordes horizontales, y guarda capturas (incluidos modales clave).
// Uso: node --experimental-websocket tests/smoke.js <carpeta-capturas>
const path = require('path');
const fs = require('fs');
const { serve, launch, sleep } = require('./lib-cdp');
const OUT = path.resolve(process.argv[2] || 'shots');
fs.mkdirSync(OUT, { recursive: true });
const PORT = 5293;
const B = `http://localhost:${PORT}`;
const PAGES = [
  'index.html#/', 'index.html#/registrar', 'index.html#/recompensas', 'index.html#/mis-puntos',
  'admin/index.html#/dashboard', 'admin/index.html#/compras', 'admin/index.html#/canjes', 'admin/index.html#/clientes', 'admin/index.html#/vendedoras',
  'admin/index.html#/recompensas', 'admin/index.html#/movimientos', 'admin/index.html#/notificaciones', 'admin/index.html#/configuracion'
];
(async () => {
  const srv = await serve(PORT);
  const b = await launch({ port: 9393 });
  const ev = (js) => b.eval(js);
  const ready = async () => { for (let i = 0; i < 80; i++) { if (await ev('!document.getElementById("boot") && !!(window.CP && CP.store.db && CP.store.db.meta.imagesReady)').catch(() => false)) return; await sleep(100); } };
  await b.goto(`${B}/index.html`, 300); await ready();
  await ev('CP.seed.reset().then(() => { sessionStorage.clear(); return true; })');
  let fails = 0;
  const shot = async (name, full) => { await b.screenshot(path.join(OUT, name + '.png'), { full }); };
  const problems = async (label) => {
    const overflow = await ev('document.documentElement.scrollWidth - document.documentElement.clientWidth');
    if (b.errors.length || overflow > 2) { fails++; console.log('✗', label, b.errors.slice(0, 3), overflow > 2 ? 'overflow ' + overflow : ''); }
    b.errors.length = 0;
  };
  for (const [w, h, mob, tag] of [[1366, 900, false, 'd'], [390, 844, true, 'm']]) {
    await b.viewport(w, h, mob);
    for (const p of PAGES) {
      await b.goto(`${B}/${p}`, 500); await ready(); await sleep(500);
      await shot(`${tag}-${p.replace(/[#/.?=]+/g, '_')}`, tag === 'd' || p.startsWith('index'));
      await problems(tag + ' ' + p);
    }
    // Cuenta del cliente con sesión iniciada
    await b.goto(`${B}/index.html#/mis-puntos`, 400); await ready();
    await ev(`sessionStorage.setItem('corepoints:session', JSON.stringify({ customerId: CP.customers.findByPhone(CP.store.db, '69033403').id })); location.reload(); true`);
    await sleep(1200); await ready(); await sleep(400);
    await shot(`${tag}-portal-cuenta`, true); await problems(tag + ' cuenta');
    await b.goto(`${B}/index.html#/recompensas`, 400); await ready(); await sleep(300);
    await ev('document.querySelector("[data-redeem]").click(); true'); await sleep(500);
    await shot(`${tag}-portal-canje-modal`); await problems(tag + ' modal canje');
    // Modales del panel
    await b.goto(`${B}/admin/index.html#/compras`, 400); await ready(); await sleep(300);
    await ev('document.querySelector("tr[data-open]").click(); true'); await sleep(900);
    await shot(`${tag}-admin-compra-detalle`); await problems(tag + ' detalle compra');
    await ev('document.querySelector("#rvMain").click(); true'); await sleep(700);
    await shot(`${tag}-admin-visor`); await problems(tag + ' visor');
    await b.goto(`${B}/admin/index.html#/clientes`, 400); await ready(); await sleep(300);
    await ev('document.querySelector("tr[data-cust]").click(); true'); await sleep(500);
    await ev('document.querySelector(".modal [data-t=lotes]").click(); true'); await sleep(300);
    await shot(`${tag}-admin-cliente-ficha`); await problems(tag + ' ficha cliente');
    await b.goto(`${B}/admin/index.html#/notificaciones`, 400); await ready(); await sleep(300);
    await ev('document.querySelector("tr[data-n]").click(); true'); await sleep(900);
    await shot(`${tag}-admin-notificacion`); await problems(tag + ' notificación');
    await b.goto(`${B}/admin/index.html#/recompensas`, 400); await ready(); await sleep(300);
    await ev('document.querySelector("#newReward").click(); true'); await sleep(500);
    await shot(`${tag}-admin-recompensa-form`); await problems(tag + ' form recompensa');
    await ev('sessionStorage.clear(); true');
  }
  console.log(fails ? `${fails} problemas` : 'OK: sin errores ni desbordes horizontales');
  await b.close(); srv.close();
  process.exit(fails ? 1 : 0);
})();
