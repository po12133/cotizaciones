// Carga cada página en escritorio y móvil, registra errores de consola y guarda capturas.
// Uso: node --experimental-websocket tests/smoke.js <carpeta-capturas>
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { launch, sleep } = require('./lib-cdp');
const OUT = path.resolve(process.argv[2] || 'shots');
fs.mkdirSync(OUT, { recursive: true });
const PAGES = ['index.html', 'planes.html', 'demo.html#/inicio', 'demo.html#/registrar', 'demo.html#/inventario', 'demo.html#/vender', 'demo.html#/ventas', 'demo.html#/reportes', 'demo.html#/pedidos', 'demo.html#/catalogo',
  'demo.html#/movimientos', 'demo.html#/proveedores', 'demo.html#/compras', 'demo.html#/gastos', 'demo.html#/auditoria', 'demo.html#/sucursales', 'demo.html#/usuarios', 'demo.html#/plan', 'catalogo.html'];
(async () => {
  // Servidor real de ModaFlow sin API key: la IA debe mostrarse como no configurada, sin errores
  const proc = spawn(process.execPath, ['server/server.mjs'], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore', env: Object.assign({}, process.env, { PORT: '5191', HOST: '127.0.0.1', ANTHROPIC_API_KEY: '' }) });
  for (let i = 0; i < 50; i++) { try { await fetch('http://localhost:5191/api/ia/estado'); break; } catch (e) { await sleep(100); } }
  const srv = { close: () => proc.kill() };
  const b = await launch({ port: 9341 });
  let fails = 0;
  for (const plan of (process.argv[3] || 'gratis,basico,premium').split(',')) {
    await b.goto(`http://localhost:5191/demo.html?plan=${plan}#/inicio`, 600);
    for (const p of PAGES) {
      for (const [w, h, mob, tag] of [[1366, 900, false, 'd'], [390, 844, true, 'm']]) {
        await b.viewport(w, h, mob);
        b.errors.length = 0;
        await b.goto(`http://localhost:5191/${p}`, 700);
        const name = `${plan}-${tag}-${p.replace(/[#/.?=]+/g, '_')}.png`;
        if (plan === 'premium' || p.startsWith('demo') || tag === 'd') await b.screenshot(path.join(OUT, name), { full: !p.startsWith('demo') && tag === 'd' });
        const overflow = await b.eval('document.documentElement.scrollWidth - document.documentElement.clientWidth');
        if (b.errors.length || overflow > 2) { fails++; console.log('✗', plan, tag, p, b.errors.slice(0, 3), overflow > 2 ? 'overflow ' + overflow : ''); }
      }
    }
  }
  console.log(fails ? `${fails} problemas` : 'OK: sin errores ni desbordes horizontales');
  await b.close(); srv.close();
  process.exit(fails ? 1 : 0);
})();
