/*
 * Servidor de ModaFlow: sirve el sitio estático y el endpoint seguro de IA.
 *   npm start              (lee .env si existe)
 * La API key se lee de ANTHROPIC_API_KEY y nunca se envía al navegador.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { DEFAULT_MODEL, MAX_IMAGES, analyzeGarment, readImages, cleanList, estimateCost, IAError } from './ia.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');

// .env opcional (no sobrescribe variables ya definidas en el sistema)
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const num = (v, d) => (v !== undefined && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : d);
const CFG = {
  port: num(process.env.PORT, 8080),
  // Dentro de Docker (Coolify) hay que escuchar en todas las interfaces: con 127.0.0.1 el proxy no llega (Bad Gateway)
  host: process.env.MODAFLOW_DOCKER === '1' ? '0.0.0.0' : process.env.HOST || '127.0.0.1',
  model: process.env.IA_MODELO || DEFAULT_MODEL,
  perMinute: num(process.env.IA_LIMITE_POR_MINUTO, 6),
  perDay: num(process.env.IA_LIMITE_DIARIO, 200),
  concurrency: num(process.env.IA_CONCURRENCIA, 2),
  pricing: process.env.IA_PRECIO_ENTRADA_USD_MTOK && process.env.IA_PRECIO_SALIDA_USD_MTOK
    ? { input: num(process.env.IA_PRECIO_ENTRADA_USD_MTOK, NaN), output: num(process.env.IA_PRECIO_SALIDA_USD_MTOK, NaN) } : null,
  usdToBs: num(process.env.IA_TIPO_CAMBIO_BS, null),
  // Detrás de un proxy (Coolify/Traefik) la IP real del visitante llega en X-Forwarded-For
  trustProxy: /^(1|true|si|sí)$/i.test(process.env.TRUST_PROXY || ''),
  // Orígenes permitidos para llamar a la API desde otro dominio (p. ej. el sitio estático). Vacío = solo el mismo dominio.
  corsOrigins: (process.env.IA_CORS_ORIGENES || '').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean)
};
const clientIp = (req) => (CFG.trustProxy && req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : req.socket.remoteAddress) || 'local';
function corsHeaders(req) {
  const origin = (req.headers.origin || '').replace(/\/$/, '');
  if (!origin || !CFG.corsOrigins.includes(origin)) return {};
  return { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' };
}
const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
const client = hasKey ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 60_000 }) : null;

// ---------- Controles de uso (en memoria) ----------
const stats = { since: new Date().toISOString(), analyses: 0, errors: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0, day: today(), dayCount: 0 };
const perIp = new Map();
let running = 0;
function today() { return new Date().toISOString().slice(0, 10); }
function checkLimits(ip) {
  if (stats.day !== today()) { stats.day = today(); stats.dayCount = 0; }
  if (stats.dayCount >= CFG.perDay) return 'Se alcanzó el límite diario de análisis de la demostración. Intente mañana.';
  if (running >= CFG.concurrency) return 'Hay otros análisis en curso. Intente de nuevo en unos segundos.';
  const now = Date.now();
  const hits = (perIp.get(ip) || []).filter((t) => now - t < 60_000);
  if (hits.length >= CFG.perMinute) return `Demasiados análisis seguidos (máximo ${CFG.perMinute} por minuto). Espere un momento.`;
  hits.push(now);
  perIp.set(ip, hits);
  return null;
}

// ---------- Utilidades HTTP ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8' };
const BLOCKED = /^\/(server|node_modules|tests)(\/|$)|\/\./; // código del servidor, dependencias, pruebas y archivos ocultos (.env, .git)
const SECURITY_HEADERS = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'SAMEORIGIN' };

function send(res, status, body, headers) {
  res.writeHead(status, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, SECURITY_HEADERS, headers));
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new IAError('tamano', `Las fotos son demasiado grandes (máximo 5 MB cada una, hasta ${MAX_IMAGES} fotos).`, 413)); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
function serveStatic(req, res) {
  let p;
  try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { return send(res, 400, 'Solicitud inválida', { 'Content-Type': 'text/plain' }); }
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, p);
  if (BLOCKED.test(p) || !file.startsWith(ROOT + path.sep) || !MIME[path.extname(file).toLowerCase()] || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return send(res, 404, 'No encontrado', { 'Content-Type': 'text/plain; charset=utf-8' });
  }
  res.writeHead(200, Object.assign({ 'Content-Type': MIME[path.extname(file).toLowerCase()], 'Cache-Control': 'no-cache' }, SECURITY_HEADERS));
  fs.createReadStream(file).pipe(res);
}

// ---------- Endpoints de IA ----------
function status() {
  return {
    disponible: hasKey, modelo: CFG.model,
    tarifa: CFG.pricing ? { entrada_usd_mtok: CFG.pricing.input, salida_usd_mtok: CFG.pricing.output, usd_a_bs: CFG.usdToBs } : null,
    limites: { por_minuto: CFG.perMinute, diario: CFG.perDay, imagen_mb: 5, imagenes_por_prenda: MAX_IMAGES },
    consumo_servidor: { desde: stats.since, analisis: stats.analyses, errores: stats.errors, tokens_entrada: stats.input_tokens, tokens_salida: stats.output_tokens, costo_usd: Math.round(stats.cost_usd * 1e6) / 1e6, hoy: stats.dayCount }
  };
}

async function analyze(req, res) {
  if (!hasKey) return send(res, 503, { error: 'La IA no está configurada en el servidor: falta ANTHROPIC_API_KEY.', code: 'sin_clave' });
  const ip = clientIp(req);
  let body;
  try { body = JSON.parse(await readBody(req, MAX_IMAGES * 7.2 * 1024 * 1024)); }
  catch (e) { return send(res, e.status || 400, { error: e instanceof IAError ? e.message : 'Solicitud inválida.', code: e.code || 'json' }); }
  const img = readImages(body);
  if (img.error) return send(res, 400, { error: img.error, code: 'imagen' });
  const categorias = cleanList(body.categorias, ['Blusas', 'Tops', 'Vestidos', 'Camisas', 'Chaquetas', 'Cardigans', 'Conjuntos']);
  const colores = cleanList(body.colores, ['Negro', 'Blanco', 'Rojo', 'Rosa', 'Azul', 'Verde', 'Beige', 'Café']);
  const limited = checkLimits(ip);
  if (limited) return send(res, 429, { error: limited, code: 'limite' });

  running++;
  stats.dayCount++;
  const t0 = Date.now();
  try {
    const out = await analyzeGarment({ client, model: CFG.model, images: img.images, categorias, colores });
    const cost = estimateCost(out.usage, CFG.pricing);
    stats.analyses++; stats.input_tokens += out.usage.input_tokens; stats.output_tokens += out.usage.output_tokens; stats.cost_usd += cost || 0;
    console.log(`[IA] ok ${out.model} · ${out.usage.input_tokens} tokens entrada / ${out.usage.output_tokens} salida · ${cost != null ? 'USD ' + cost.toFixed(6) : 'sin tarifa'} · ${Date.now() - t0} ms · ${img.images.length} foto(s) [${img.images.map((x) => x.vista).join(', ')}] · ${Math.round(img.images.reduce((a, x) => a + x.bytes, 0) / 1024)} KB`);
    send(res, 200, { result: out.result, usage: out.usage, model: out.model, cost_usd: cost, usd_a_bs: CFG.usdToBs, ms: Date.now() - t0 });
  } catch (e) {
    stats.errors++;
    if (e.usage) { stats.input_tokens += e.usage.input_tokens; stats.output_tokens += e.usage.output_tokens; stats.cost_usd += estimateCost(e.usage, CFG.pricing) || 0; }
    console.warn(`[IA] error ${e.code || ''}: ${e.message}`);
    send(res, e instanceof IAError ? e.status : 500, { error: e instanceof IAError ? e.message : 'Error interno del servidor.', code: e.code || 'interno' });
  } finally { running--; }
}

export function createServer() {
  return http.createServer((req, res) => {
    const url = req.url.split('?')[0];
    if (url.startsWith('/api/')) {
      for (const [k, v] of Object.entries(corsHeaders(req))) res.setHeader(k, v);
      if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    }
    if (url === '/api/ia/estado' && req.method === 'GET') return send(res, 200, status());
    if (url === '/api/ia/analizar') {
      if (req.method !== 'POST') return send(res, 405, { error: 'Use POST.' });
      if (!/^application\/json/.test(req.headers['content-type'] || '')) return send(res, 415, { error: 'Envíe JSON.' });
      return analyze(req, res);
    }
    if (url.startsWith('/api/')) return send(res, 404, { error: 'Ruta no encontrada.' });
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Método no permitido', { 'Content-Type': 'text/plain' });
    serveStatic(req, res);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createServer().listen(CFG.port, CFG.host, () => {
    console.log(`ModaFlow → http://${CFG.host === '0.0.0.0' ? 'localhost' : CFG.host}:${CFG.port}/`);
    console.log(hasKey ? `IA activa con ${CFG.model}${CFG.pricing ? ` (tarifa USD ${CFG.pricing.input}/${CFG.pricing.output} por millón de tokens)` : ' (sin tarifa configurada: no se mostrará costo)'}` : 'IA desactivada: defina ANTHROPIC_API_KEY en .env o en el entorno.');
  });
}
