// Pruebas del modelo de la propuesta: node tests/pricing.test.js
const assert = require('assert');
const CONFIG = require('../js/config.js');
const P = require('../js/pricing.js');

let ok = 0;
const t = (name, fn) => { try { fn(); ok++; console.log(`✓ ${name}`); } catch (e) { console.log(`✗ ${name}\n  ${e.message}`); process.exitCode = 1; } };

const m = P.buildModel(CONFIG, {}, new Date('2026-10-30T12:00:00'));

t('la suma de los costos es exactamente Bs 16.500', () => assert.strictEqual(m.total, 16500));
t('el total coincide con totalEsperado', () => assert.strictEqual(m.total, CONFIG.totalEsperado));
t('hay 12 líneas de costo (11 módulos + implementación)', () => assert.strictEqual(m.costos.length, 12));
t('importes por línea según la propuesta', () => {
  const esperado = { sucursales: 1200, usuarios: 1000, productos: 1200, compras: 1500, ventas: 1800, inventarios: 2000, ordenes: 2500, clientes: 800, caja: 1200, dashboard: 1500, reportes: 800, implementacion: 1000 };
  m.costos.forEach((c) => assert.strictEqual(c.monto, esperado[c.id], c.concepto));
});
t('anticipo y saldo de Bs 8.250 cada uno', () => { assert.deepStrictEqual(m.pagos.map((p) => p.monto), [8250, 8250]); assert.ok(m.pagosCuadran); });
t('12 módulos funcionales; Configuración incluido sin costo', () => { assert.strictEqual(m.modulos.length, 12); const cfg = m.modulos.find((x) => x.id === 'configuracion'); assert.ok(cfg.incluido); assert.strictEqual(cfg.monto, 0); });
t('cronograma de 6 etapas entre 8 y 12 semanas', () => { assert.strictEqual(m.cronograma.length, 6); assert.deepStrictEqual(m.semanas, { min: 8, max: 12 }); assert.strictEqual(m.plazoTexto, '8 a 12 semanas'); });
t('etapas dentro del rango y en orden', () => m.cronograma.forEach((e) => ['min', 'max'].forEach((k) => { assert.ok(e[k][0] >= 1 && e[k][0] <= e[k][1] && e[k][1] <= m.semanas[k], `${e.etapa} ${k}`); })));
t('mantenimiento opcional de Bs 350 y sin facturación electrónica', () => { assert.strictEqual(m.mantenimiento.montoMensual, 350); assert.strictEqual(CONFIG.facturacionElectronica.incluida, false); });
t('formato de moneda boliviano', () => { assert.strictEqual(P.fmtMoney(16500), 'Bs 16.500'); assert.strictEqual(P.fmtMoney(8250), 'Bs 8.250'); assert.strictEqual(P.fmtMoney(1234.5), 'Bs 1.234,50'); });
t('validate() no reporta problemas', () => assert.deepStrictEqual(P.validate(CONFIG), []));
t('validate() detecta un total alterado', () => { const c = JSON.parse(JSON.stringify(CONFIG)); c.costos[0].monto += 100; assert.ok(P.validate(c).length > 0); });
t('el total se recalcula si cambia un precio', () => { const c = JSON.parse(JSON.stringify(CONFIG)); c.costos[0].monto = 2000; assert.strictEqual(P.buildModel(c).total, 17300); });
t('no se inventan datos del cliente ni la validez', () => { Object.values(m.cliente).forEach((v) => assert.strictEqual(v, CONFIG.PENDIENTE)); assert.strictEqual(m.cotizacion.validez, CONFIG.PENDIENTE); });
t('los datos editados del cliente reemplazan a los pendientes', () => { const x = P.buildModel(CONFIG, { cliente: { razonSocial: 'Cliente X', nit: '  ' }, validez: '15 días' }); assert.strictEqual(x.cliente.razonSocial, 'Cliente X'); assert.strictEqual(x.cliente.nit, CONFIG.PENDIENTE); assert.strictEqual(x.cotizacion.validez, '15 días'); });
console.log(`\n${ok} pruebas correctas`);
