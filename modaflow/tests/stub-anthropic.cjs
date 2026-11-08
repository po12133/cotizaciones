// SOLO PARA PRUEBAS: servidor local que imita la forma de respuesta de POST /v1/messages de Anthropic.
// Permite probar el servidor y la interfaz sin API key ni costo. La aplicación nunca lo usa:
// solo se activa si una prueba define ANTHROPIC_BASE_URL apuntando a él.
const http = require('http');

const OK = {
  es_prenda: true, cantidad_prendas: 1, mensaje: '', nombre: 'Chaleco boho con flecos', descripcion_corta: 'Chaleco camel con flecos y ribete tejido.',
  descripcion_detallada: 'Chaleco sin mangas de aspecto gamuzado con ribete tejido en el borde delantero y flecos largos. Ideal sobre una polera básica y jeans.',
  categoria: 'Chaquetas', tipo_prenda: 'chaleco', color_principal: 'Camel', color_principal_detalle: 'camel', colores_secundarios: ['azul turquesa', 'negro'],
  estilo: 'boho', publico_objetivo: 'Mujer', caracteristicas: ['sin mangas', 'flecos', 'ribete tejido'], etiquetas: ['chaleco', 'flecos', 'boho', 'camel'],
  requiere_confirmacion: ['estilo'], confianza: 'alta'
};
const NOT = Object.assign({}, OK, { es_prenda: false, cantidad_prendas: 0, mensaje: 'La foto muestra un paisaje, no una prenda.', nombre: '', categoria: 'Otra', color_principal: 'Otro', caracteristicas: [], etiquetas: [], confianza: 'baja' });
const MULTI = Object.assign({}, OK, { cantidad_prendas: 3, mensaje: 'Hay tres blusas colgadas; se describió la del centro.' });
// Con foto de etiqueta legible
const LABEL = Object.assign({}, OK, { fotos_misma_prenda: true, etiqueta: { legible: true, marca: 'Mio', talla: 'm', composicion: '100% poliéster', pais_origen: 'Perú', cuidados: ['lavar a mano', 'no usar secadora'] } });
// Fotos de prendas distintas
const MIXED = Object.assign({}, OK, { fotos_misma_prenda: false, mensaje: 'La segunda foto muestra una blusa distinta.' });

function start(port) {
  const state = { mode: 'ok', requests: [] };
  const srv = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', async () => {
      if (req.url.startsWith('/__mode/')) { state.mode = req.url.split('/')[2]; res.end('ok'); return; }
      if (req.url === '/__last') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(state.requests[state.requests.length - 1] || null)); return; }
      if (req.method !== 'POST' || !req.url.startsWith('/v1/messages')) { res.writeHead(404); res.end(); return; }
      const parsed = JSON.parse(body);
      if (state.mode === 'slow') await new Promise((r) => setTimeout(r, 4000));
      state.requests.push({ headers: { clave: req.headers['x-api-key'] || req.headers.authorization ? 'presente' : 'ausente' }, body: Object.assign({}, parsed, { messages: parsed.messages.map((m) => ({ role: m.role, content: m.content.map((c) => (c.type === 'image' ? { type: 'image', media_type: c.source.media_type, bytes: Buffer.from(c.source.data, 'base64').length } : c)) })) }) });
      if (state.mode === 'error500') { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ type: 'error', error: { type: 'api_error', message: 'falla de prueba' } })); return; }
      if (state.mode === 'auth') { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } })); return; }
      const result = { notgarment: NOT, multi: MULTI, label: LABEL, mixed: MIXED }[state.mode] || OK;
      const text = state.mode === 'badjson' ? '{"es_prenda": tru' : JSON.stringify(result);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        id: 'msg_test', type: 'message', role: 'assistant', model: parsed.model,
        content: [{ type: 'thinking', thinking: '', signature: 'x' }, { type: 'text', text }],
        stop_reason: state.mode === 'refusal' ? 'refusal' : 'end_turn', stop_sequence: null,
        usage: { input_tokens: 1534, output_tokens: 412 }
      }));
    });
  });
  return new Promise((r) => srv.listen(port, '127.0.0.1', () => r({ srv, state })));
}

module.exports = { start, OK, LABEL };
