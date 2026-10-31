// Servidor estático mínimo: node tests/serve.js [puerto]
const { serve } = require('./lib-cdp');
const port = Number(process.argv[2]) || 8080;
serve(port).then(() => console.log(`Propuesta Tornería → http://localhost:${port}/  ·  Prototipo → http://localhost:${port}/prototipo/`));
