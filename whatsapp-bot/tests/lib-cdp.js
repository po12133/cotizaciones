// Utilidades mínimas para controlar Chrome headless por CDP (sin puppeteer).
// Requiere Node 20+ con --experimental-websocket (o Node 22+).
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webp': 'image/webp' };

function serve(port = 5180) {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => srv.listen(port, () => r(srv)));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch({ port = 9333 } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wab-chrome-'));
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, '--no-first-run', '--disable-gpu', '--hide-scrollbars', '--window-size=1366,900', 'about:blank'], { stdio: 'ignore' });
  let targets;
  for (let i = 0; i < 50; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.length) break; } catch (e) { /* esperando */ }
    await sleep(200);
  }
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { const { res, rej } = pending.get(msg.id); pending.delete(msg.id); msg.error ? rej(new Error(msg.error.message)) : res(msg.result); }
    else listeners.forEach((l) => l(msg));
  });
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const errors = [];
  listeners.push((m) => {
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception ? m.params.exceptionDetails.exception.description : m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value || a.description).join(' '));
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.params.entry.url || '')) errors.push(`${m.params.entry.text} ${m.params.entry.url || ''}`);
  });
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');

  const api = {
    send, errors,
    async goto(url, wait = 900) {
      const loaded = new Promise((r) => { const l = (m) => { if (m.method === 'Page.loadEventFired') { listeners.splice(listeners.indexOf(l), 1); r(); } }; listeners.push(l); });
      await send('Page.navigate', { url });
      await Promise.race([loaded, sleep(8000)]);
      await sleep(wait);
    },
    async eval(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(`${r.exceptionDetails.text} ${r.exceptionDetails.exception ? r.exceptionDetails.exception.description : ''}`);
      return r.result.value;
    },
    async viewport(width, height, mobile = false) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
    },
    async screenshot(file, { full = false } = {}) {
      let clip;
      if (full) {
        const h = await api.eval('Math.min(document.documentElement.scrollHeight, 12000)');
        const w = await api.eval('document.documentElement.clientWidth');
        clip = { x: 0, y: 0, width: w, height: h, scale: 1 };
      }
      const r = await send('Page.captureScreenshot', Object.assign({ format: 'png' }, clip ? { clip, captureBeyondViewport: true } : {}));
      fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
    },
    async close() { try { ws.close(); } catch (e) { /* cerrado */ } proc.kill(); }
  };
  return api;
}

module.exports = { serve, launch, sleep, ROOT };
