// Servidor estático mínimo para revisar el prototipo: node tests/serve.js [puerto]
const { serve } = require('./lib-cdp');
const port = Number(process.argv[2]) || 8080;
serve(port).then(() => console.log(`Catalogia → http://localhost:${port}/  ·  Panel demo → http://localhost:${port}/dashboard.html?demo=1`));
