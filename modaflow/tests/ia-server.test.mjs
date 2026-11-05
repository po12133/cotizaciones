// Pruebas del servidor de IA: node tests/ia-server.test.mjs
// No llaman a Anthropic: usan un sustituto local (tests/stub-anthropic.cjs) vía ANTHROPIC_BASE_URL.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { validateImage, validateResult, buildSchema, estimateCost, cleanList } from '../server/ia.mjs';

const require = createRequire(import.meta.url);
const stub = require('./stub-anthropic.cjs');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CATS = ['Blusas', 'Tops', 'Vestidos', 'Camisas', 'Chaquetas', 'Cardigans', 'Conjuntos'];
const COLS = ['Rojo', 'Negro', 'Camel'];
const jpeg = fs.readFileSync(path.join(ROOT, 'assets/productos/chaleco-flecos.jpg')).toString('base64');

console.log('Validaciones');
ok(!validateImage(jpeg, 'image/jpeg').error, 'Acepta un JPEG real');
ok(validateImage(jpeg, 'image/png').error, 'Rechaza un JPEG declarado como PNG');
ok(validateImage(jpeg, 'application/pdf').error, 'Rechaza formatos no permitidos');
ok(validateImage('no es base64 !!', 'image/jpeg').error, 'Rechaza base64 inválido');
ok(validateImage(Buffer.alloc(6 * 1024 * 1024, 0xff).toString('base64'), 'image/jpeg').error === 'La imagen supera los 5 MB.', 'Rechaza imágenes de más de 5 MB');
ok(validateResult('{mal', CATS, COLS).error, 'Rechaza JSON inválido');
ok(validateResult({ nombre: 'x' }, CATS, COLS).error, 'Rechaza respuesta sin es_prenda');
const v = validateResult(Object.assign({}, stub.OK, { categoria: 'Inventada', color_principal: 'Morado', etiquetas: ['A', 'a', 'B'] }), CATS, COLS).result;
ok(v.categoria === 'Otra' && v.color_principal === 'Otro', 'Categoría o color fuera de la lista pasan a Otra / Otro');
ok(JSON.stringify(v.etiquetas) === '["a","a","b"]' || JSON.stringify(v.etiquetas) === '["a","b"]', 'Etiquetas en minúscula');
const sch = buildSchema(CATS, COLS);
ok(sch.additionalProperties === false && sch.required.length === Object.keys(sch.properties).length && sch.properties.categoria.enum.includes('Otra'), 'Esquema JSON estricto con categorías de la tienda');
ok(estimateCost({ input_tokens: 1534, output_tokens: 412 }, { input: 0.1, output: 0.5 }) === 0.000359, 'Costo estimado = tokens × tarifa');
ok(estimateCost({ input_tokens: 1, output_tokens: 1 }, null) === null, 'Sin tarifa no hay costo');
ok(cleanList(['Blusas', '<script>', 'x'.repeat(40), 5], ['d']).join() === 'Blusas', 'Limpia listas enviadas por el navegador');

async function runServer(env, port) {
  const p = spawn(process.execPath, ['server/server.mjs'], { cwd: ROOT, env: Object.assign({}, process.env, { PORT: String(port), HOST: '127.0.0.1', ANTHROPIC_API_KEY: '' }, env), stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  p.stdout.on('data', (d) => { log += d; }); p.stderr.on('data', (d) => { log += d; });
  for (let i = 0; i < 50 && !log.includes('ModaFlow →'); i++) await sleep(100);
  return { p, log: () => log };
}
const post = (port, body) => fetch(`http://127.0.0.1:${port}/api/ia/analizar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const req = { image: jpeg, media_type: 'image/jpeg', categorias: CATS, colores: COLS };

(async () => {
  console.log('Servidor sin API key');
  let s = await runServer({ ANTHROPIC_API_KEY: '', IA_CORS_ORIGENES: 'https://estatico.ejemplo.com' }, 5381);
  let r = await (await fetch('http://127.0.0.1:5381/api/ia/estado')).json();
  ok(r.disponible === false && r.modelo === 'claude-haiku-5-5', 'Estado: IA no disponible, modelo claude-haiku-5-5');
  r = await post(5381, req);
  ok(r.status === 503 && (await r.json()).code === 'sin_clave', 'Analizar sin clave responde 503 con mensaje claro');
  for (const p of ['/server/server.mjs', '/server/ia.mjs', '/.env', '/.env.example', '/node_modules/@anthropic-ai/sdk/package.json', '/tests/flows.js', '/package.json', '/js/..%2f..%2fREADME.md']) {
    ok((await fetch('http://127.0.0.1:5381' + p)).status === 404, `No expone ${p}`);
  }
  const raw = (p) => new Promise((res) => http.get({ host: '127.0.0.1', port: 5381, path: p }, (r) => { r.resume(); res(r.statusCode); }));
  for (const p of ['/../package.json', '/..%2f..%2fCOOLIFY%2fcotizaciones%2fmodaflow%2f.env.example']) ok((await raw(p)) === 404, 'Bloquea salir de la carpeta: ' + p);
  let pre = await fetch('http://127.0.0.1:5381/api/ia/analizar', { method: 'OPTIONS', headers: { Origin: 'https://estatico.ejemplo.com' } });
  ok(pre.status === 204 && pre.headers.get('access-control-allow-origin') === 'https://estatico.ejemplo.com', 'CORS: permite el dominio configurado en IA_CORS_ORIGENES');
  pre = await fetch('http://127.0.0.1:5381/api/ia/estado', { headers: { Origin: 'https://otro.com' } });
  ok(!pre.headers.get('access-control-allow-origin'), 'CORS: no permite otros dominios');
  ok((await fetch('http://127.0.0.1:5381/index.html')).status === 200 && (await fetch('http://127.0.0.1:5381/')).status === 200, 'Sirve el sitio');
  ok(!(await (await fetch('http://127.0.0.1:5381/js/config.js')).text()).includes('sk-ant'), 'El JavaScript del navegador no contiene claves');
  s.p.kill();

  console.log('Servidor con Anthropic sustituto');
  const { srv, state } = await stub.start(5390);
  s = await runServer({ ANTHROPIC_API_KEY: 'sk-ant-prueba-no-real', ANTHROPIC_BASE_URL: 'http://127.0.0.1:5390', IA_PRECIO_ENTRADA_USD_MTOK: '0.10', IA_PRECIO_SALIDA_USD_MTOK: '0.50', IA_TIPO_CAMBIO_BS: '6.96', IA_LIMITE_POR_MINUTO: '4' }, 5382);
  r = await post(5382, req);
  const d = await r.json();
  ok(r.status === 200 && d.result.nombre === 'Chaleco boho con flecos', 'Analiza y devuelve el resultado validado');
  ok(d.usage.input_tokens === 1534 && d.usage.output_tokens === 412 && d.cost_usd === 0.000359 && d.usd_a_bs === 6.96, 'Devuelve tokens y costo estimado');
  const last = state.requests[state.requests.length - 1];
  ok(last.body.model === 'claude-haiku-5-5' && last.headers.clave === 'presente', 'Envía a Anthropic el modelo Haiku con la API key (solo desde el servidor)');
  ok(last.body.messages[0].content[0].type === 'image' && last.body.messages[0].content[0].media_type === 'image/jpeg', 'La foto viaja como bloque de imagen base64');
  ok(last.body.output_config.format.type === 'json_schema' && last.body.output_config.effort === 'low', 'Pide salida estructurada (json_schema)');
  ok(!('temperature' in last.body) && !('thinking' in last.body), 'Sin parámetros no admitidos por Haiku 5.5');
  ok(!JSON.stringify(d).includes('sk-ant'), 'La respuesta al navegador no incluye la clave');

  r = await post(5382, Object.assign({}, req, { media_type: 'image/png' }));
  ok(r.status === 400, 'Rechaza imagen con formato incorrecto (400)');
  await fetch('http://127.0.0.1:5390/__mode/badjson');
  r = await post(5382, req);
  ok(r.status === 502 && /JSON/.test((await r.json()).error), 'Respuesta inválida de la IA → error 502 claro');
  await fetch('http://127.0.0.1:5390/__mode/refusal');
  r = await post(5382, req);
  ok(r.status === 422, 'Rechazo del modelo → 422');
  await fetch('http://127.0.0.1:5390/__mode/auth');
  r = await post(5382, req);
  ok(r.status === 502 && /API key/.test((await r.json()).error), 'Clave inválida → mensaje sobre ANTHROPIC_API_KEY');
  r = await post(5382, req);
  ok(r.status === 429, 'Límite por minuto → 429');
  const est = await (await fetch('http://127.0.0.1:5382/api/ia/estado')).json();
  ok(est.disponible && est.consumo_servidor.analisis === 1 && est.consumo_servidor.tokens_entrada >= 1534 && est.tarifa.entrada_usd_mtok === 0.1, 'Estado del servidor muestra consumo acumulado y tarifa');
  ok(/\[IA\] ok claude-haiku-5-5 · 1534 tokens entrada \/ 412 salida · USD 0\.000359/.test(s.log()), 'El servidor registra tokens y costo de cada análisis en consola');
  s.p.kill(); srv.close();

  console.log(`\n${pass} correctas, ${fail} fallidas`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
