// Pruebas del motor de cotización: node tests/pricing.test.js
const assert = require('assert');
const P = require('../js/pricing.js');
const PLANS = require('../js/plans.js');
let ok = 0;
const t = (name, fn) => { fn(); ok++; console.log('  ✓ ' + name); };

t('la base siempre está incluida', () => {
  const r = P.calculate({});
  assert.deepStrictEqual(r.ids, ['base']);
  assert.strictEqual(r.implementacion, 400);
  assert.strictEqual(r.mensualBase, 49);
  assert.strictEqual(r.totalPrimerPeriodo, 449);
});
t('ventas agrega catálogo automáticamente', () => {
  const r = P.calculate({ modulos: ['ventas'] });
  assert.deepStrictEqual(r.ids, ['base', 'catalogo', 'ventas']);
  assert.ok(r.auto.catalogo.includes('Ventas'));
  assert.strictEqual(r.implementacion, 400 + 700 + 900);
  assert.strictEqual(r.mensualBase, 49 + 99 + 149);
});
t('reportes sin fuente de datos agrega automatización', () => {
  const r = P.calculate({ modulos: ['reportes'] });
  assert.ok(r.ids.includes('automatizacion'));
});
t('reportes con CRM no agrega automatización', () => {
  const r = P.calculate({ modulos: ['reportes', 'crm'] });
  assert.ok(!r.ids.includes('automatizacion'));
});
t('dependientes al quitar catálogo', () => {
  assert.deepStrictEqual(P.dependentsOf('catalogo', ['base', 'catalogo', 'ventas', 'web', 'ia']), ['ventas', 'web']);
  assert.deepStrictEqual(P.dependentsOf('crm', ['base', 'crm', 'reportes']), ['reportes']);
  assert.deepStrictEqual(P.dependentsOf('crm', ['base', 'crm', 'ia', 'reportes']), []);
});
t('descuento anual solo sobre suscripción', () => {
  const r = P.calculate({ modulos: ['automatizacion'], periodo: 'anual' });
  // mensual base 49+99 = 148; -20% = 118.4; ×12 = 1420.8; impl 900
  assert.strictEqual(r.mensualBase, 148);
  assert.strictEqual(r.descuentoMensual, 29.6);
  assert.strictEqual(r.mensualConDescuento, 118.4);
  assert.strictEqual(r.suscripcionPeriodo, 1420.8);
  assert.strictEqual(r.implementacion, 900);
  assert.strictEqual(r.totalPrimerPeriodo, 2320.8);
  assert.strictEqual(r.renovacion, 1420.8);
  assert.strictEqual(r.ahorroPeriodo, 355.2);
});
t('trimestral + promocional con tope', () => {
  const r = P.calculate({ modulos: ['ia'], periodo: 'trimestral', descuentoPromo: 99 });
  assert.strictEqual(r.descPromo, 15);
  assert.strictEqual(r.descTotalPct, 20);
});
t('asesores adicionales y tramo de contactos', () => {
  const r = P.calculate({ modulos: ['chat'], asesores: 5, contactos: 3000 });
  assert.strictEqual(r.asesoresExtra, 3);
  assert.strictEqual(r.costoAsesores, 117);
  assert.strictEqual(r.recargoContactos, 49);
  assert.strictEqual(r.mensualBase, 49 + 99 + 117 + 49);
  const big = P.calculate({ contactos: 50000 });
  assert.strictEqual(big.aMedida, true);
});
t('implementación manual y servicios adicionales', () => {
  const r = P.calculate({ modulos: ['crm'], implementacionManual: 750, periodo: 'semestral',
    adicionales: [{ descripcion: 'Capacitación extra', tipo: 'unico', monto: 200 }, { descripcion: 'Soporte fin de semana', tipo: 'mensual', monto: 50 }, { descripcion: '', monto: 10 }] });
  assert.strictEqual(r.implementacion, 750);
  assert.strictEqual(r.adicionales.length, 2);
  // (128 × 0.9 = 115.2) + 50 = 165.2 × 6 = 991.2
  assert.strictEqual(r.mensualFinal, 165.2);
  assert.strictEqual(r.suscripcionPeriodo, 991.2);
  assert.strictEqual(r.totalPrimerPeriodo, 750 + 200 + 991.2);
});
t('plazo estimado', () => {
  const r = P.calculate({ modulos: ['automatizacion', 'ia'] });
  assert.strictEqual(r.plazo.dias, Math.round(5 + 13 * 0.7));
  assert.ok(P.calculate({}).plazo.dias >= 7);
});
t('comparación plan vs módulos', () => {
  const c = P.compareWithPlan(PLANS.find((p) => p.id === 'profesional'), {});
  assert.strictEqual(c.modularMensual, 49 + 99 + 149 + 99 + 79 + 99);
  assert.strictEqual(c.planMensual, 299);
});
t('número de cotización', () => {
  assert.strictEqual(P.quoteNumber(new Date(2026, 9, 21), 7), 'COT-WAB-20261021-007');
});
console.log(`\n${ok} pruebas superadas`);
