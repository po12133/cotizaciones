// Pruebas del modelo de la propuesta: node tests/pricing.test.js
const assert = require('assert');
const CONFIG = require('../js/config.js');
const P = require('../js/pricing.js');

let ok = 0;
const t = (name, fn) => { try { fn(); ok++; console.log(`✓ ${name}`); } catch (e) { console.log(`✗ ${name}\n  ${e.message}`); process.exitCode = 1; } };

const m = P.buildModel(CONFIG, {}, new Date('2026-11-03T12:00:00'));

t('el subtotal (suma de los módulos) es exactamente Bs 14.000', () => assert.strictEqual(m.subtotal, 14000));
t('descuento comercial de Bs 500, mostrado aparte', () => { assert.strictEqual(m.descuento, 500); assert.deepStrictEqual(m.descuentos.map((d) => [d.concepto, d.monto]), [['Descuento comercial', 500]]); });
t('el total final es Bs 13.500 y coincide con totalEsperado', () => { assert.strictEqual(m.total, 13500); assert.strictEqual(m.total, CONFIG.totalEsperado); assert.strictEqual(m.subtotal, CONFIG.subtotalEsperado); });
t('hay 11 líneas de costo (10 módulos + implementación)', () => assert.strictEqual(m.costos.length, 11));
t('importes por línea según la propuesta (precios de lista sin alterar)', () => {
  const esperado = { sucursales: 1200, usuarios: 1000, productos: 1200, compras: 1500, ventas: 1800, inventarios: 2000, clientes: 800, caja: 1200, dashboard: 1500, reportes: 800, implementacion: 1000 };
  assert.deepStrictEqual(m.costos.map((c) => c.id).sort(), Object.keys(esperado).sort());
  m.costos.forEach((c) => assert.strictEqual(c.monto, esperado[c.id], c.concepto));
});
t('el módulo de órdenes de trabajo ya no existe', () => {
  assert.ok(!m.costos.some((c) => c.id === 'ordenes'));
  assert.ok(!m.modulos.some((x) => x.id === 'ordenes'));
  const txt = JSON.stringify(CONFIG).toLowerCase();
  ['tornería', 'torneria', 'órdenes de trabajo', 'orden de trabajo', 'taller', 'operario', 'fabricación de', 'producción'].forEach((w) => {
    // Solo se permite mencionarlos en la lista de exclusiones.
    const fuera = JSON.stringify(Object.assign({}, CONFIG, { exclusiones: [] })).toLowerCase();
    assert.ok(!fuera.includes(w), `aparece "${w}" fuera de exclusiones`);
  });
  assert.ok(txt.includes('órdenes de compra'), 'las órdenes de compra deben mantenerse');
});
t('anticipo y saldo de Bs 6.750 cada uno', () => { assert.deepStrictEqual(m.pagos.map((p) => p.monto), [6750, 6750]); assert.ok(m.pagosCuadran); });
t('11 módulos funcionales; Configuración incluido sin costo', () => { assert.strictEqual(m.modulos.length, 11); const cfg = m.modulos.find((x) => x.id === 'configuracion'); assert.ok(cfg.incluido); assert.strictEqual(cfg.monto, 0); assert.deepStrictEqual(m.modulos.map((x) => x.numero), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]); });
t('cronograma de 6 etapas entre 6 y 10 semanas', () => { assert.strictEqual(m.cronograma.length, 6); assert.deepStrictEqual(m.semanas, { min: 6, max: 10 }); assert.strictEqual(m.plazoTexto, '6 a 10 semanas'); });
t('etapas del cronograma según la propuesta', () => assert.deepStrictEqual(m.cronograma.map((e) => e.etapa), ['Análisis y diseño', 'Sucursales, usuarios y productos', 'Compras y ventas', 'Inventarios y transferencias', 'Caja, estadísticas y reportes', 'Pruebas, capacitación y entrega']));
t('etapas dentro del rango y en orden', () => m.cronograma.forEach((e) => ['min', 'max'].forEach((k) => { assert.ok(e[k][0] >= 1 && e[k][0] <= e[k][1] && e[k][1] <= m.semanas[k], `${e.etapa} ${k}`); })));
t('mantenimiento opcional de Bs 350 y sin facturación electrónica', () => { assert.strictEqual(m.mantenimiento.montoMensual, 350); assert.strictEqual(CONFIG.facturacionElectronica.incluida, false); });
t('formato de moneda boliviano', () => { assert.strictEqual(P.fmtMoney(13500), 'Bs 13.500'); assert.strictEqual(P.fmtMoney(6750), 'Bs 6.750'); assert.strictEqual(P.fmtMoney(-500), '- Bs 500'); assert.strictEqual(P.fmtMoney(1234.5), 'Bs 1.234,50'); });
t('validate() no reporta problemas', () => assert.deepStrictEqual(P.validate(CONFIG), []));
t('validate() detecta un total alterado', () => { const c = JSON.parse(JSON.stringify(CONFIG)); c.costos[0].monto += 100; assert.ok(P.validate(c).length > 0); const d = JSON.parse(JSON.stringify(CONFIG)); d.descuentos[0].monto = 600; assert.ok(P.validate(d).length > 0); });
t('el total se recalcula si cambia un precio o el descuento', () => { const c = JSON.parse(JSON.stringify(CONFIG)); c.costos[0].monto = 2000; assert.strictEqual(P.buildModel(c).total, 14300); c.descuentos = []; assert.strictEqual(P.buildModel(c).total, 14800); });
t('no se inventan datos del cliente ni la validez', () => { Object.values(m.cliente).forEach((v) => assert.strictEqual(v, CONFIG.PENDIENTE)); assert.strictEqual(m.cotizacion.validez, CONFIG.PENDIENTE); });
t('los datos editados del cliente reemplazan a los pendientes', () => { const x = P.buildModel(CONFIG, { cliente: { razonSocial: 'Cliente X', nit: '  ' }, validez: '15 días' }); assert.strictEqual(x.cliente.razonSocial, 'Cliente X'); assert.strictEqual(x.cliente.nit, CONFIG.PENDIENTE); assert.strictEqual(x.cotizacion.validez, '15 días'); });
t('hosting de Bs 100 al mes los primeros 12 meses, aparte del total', () => { assert.strictEqual(m.hosting.montoMensual, 100); assert.strictEqual(m.hosting.meses, 12); assert.strictEqual(m.hosting.total, 1200); assert.ok(m.hostingTexto.includes('Bs 100 por mes durante los primeros 12 meses')); assert.strictEqual(m.total, 13500); });
console.log(`\n${ok} pruebas correctas`);
