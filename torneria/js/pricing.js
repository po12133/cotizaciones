/*
 * Modelo de la propuesta: toma CONFIG (y los datos editados del cliente) y calcula totales,
 * pagos y cronograma. Lo usan la página comercial y el PDF, así ambos muestran las mismas cifras.
 * Funciones puras: se pueden probar con node (tests/pricing.test.js).
 */
(function (root) {
  const fmtMoney = (v, simbolo = 'Bs') => {
    const neg = v < 0;
    const [ent, dec] = Math.abs(Math.round(v * 100) / 100).toFixed(2).split('.');
    const miles = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${neg ? '- ' : ''}${simbolo} ${miles}${dec !== '00' ? ',' + dec : ''}`;
  };

  const sum = (list) => list.reduce((t, c) => t + Number(c.monto || 0), 0);

  function fechaLarga(d) {
    return d.toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  /** Construye el modelo completo. `overrides` = { cliente:{...}, validez } editados en la página. */
  function buildModel(CONFIG, overrides = {}, hoy = new Date()) {
    const cliente = Object.assign({}, CONFIG.cliente, clean(overrides.cliente));
    const cotizacion = Object.assign({}, CONFIG.cotizacion);
    if (overrides.validez) cotizacion.validez = overrides.validez;
    const emision = cotizacion.fechaEmision ? new Date(cotizacion.fechaEmision + 'T12:00:00') : hoy;

    const costos = CONFIG.costos.map((c) => Object.assign({}, c, { modulo: c.modulo ? CONFIG.modulos.find((m) => m.id === c.modulo) || null : null }));
    const total = sum(CONFIG.costos);
    const pagos = CONFIG.pagos.map((p) => Object.assign({}, p, { monto: Math.round(total * p.porcentaje) / 100 }));
    const porcentajes = CONFIG.pagos.reduce((t, p) => t + p.porcentaje, 0);
    const semanasMin = Math.max(...CONFIG.cronograma.map((e) => e.min[1]));
    const semanasMax = Math.max(...CONFIG.cronograma.map((e) => e.max[1]));

    const modulos = CONFIG.modulos.map((m) => {
      const costo = CONFIG.costos.find((c) => c.modulo === m.id);
      return Object.assign({}, m, { monto: costo ? costo.monto : 0, incluido: !costo });
    });

    return {
      config: CONFIG,
      proyecto: CONFIG.proyecto,
      proveedor: CONFIG.proveedor,
      cliente,
      cotizacion,
      fechaEmision: emision,
      fechaEmisionTexto: fechaLarga(emision),
      moneda: CONFIG.moneda,
      costos,
      modulos,
      total,
      pagos,
      pagosCuadran: porcentajes === 100 && Math.abs(sum(pagos) - total) < 0.01,
      mantenimiento: CONFIG.mantenimiento,
      hosting: Object.assign({}, CONFIG.hosting, { total: CONFIG.hosting.montoMensual * CONFIG.hosting.meses }),
      hostingTexto: `El cliente pagará mensualmente el hosting del sistema: ${fmtMoney(CONFIG.hosting.montoMensual, CONFIG.moneda.simbolo)} por mes durante los primeros ${CONFIG.hosting.meses} meses (${fmtMoney(CONFIG.hosting.montoMensual * CONFIG.hosting.meses, CONFIG.moneda.simbolo)} en total), ${CONFIG.hosting.inicio}. Este monto es aparte del precio del desarrollo.`,
      cronograma: CONFIG.cronograma,
      semanas: { min: semanasMin, max: semanasMax },
      plazoTexto: `${CONFIG.proyecto.tiempo.min} a ${CONFIG.proyecto.tiempo.max} ${CONFIG.proyecto.tiempo.unidad}`,
      money: (v) => fmtMoney(v, CONFIG.moneda.simbolo),
      esPendiente: (v) => !v || v === CONFIG.PENDIENTE
    };
  }

  function clean(obj) {
    const out = {};
    Object.entries(obj || {}).forEach(([k, v]) => { if (typeof v === 'string' && v.trim()) out[k] = v.trim(); });
    return out;
  }

  /** Revisa que la configuración sea coherente. Devuelve una lista de problemas (vacía = OK). */
  function validate(CONFIG) {
    const errs = [];
    const total = sum(CONFIG.costos);
    if (CONFIG.totalEsperado && total !== CONFIG.totalEsperado) errs.push(`La suma de costos (${total}) no coincide con totalEsperado (${CONFIG.totalEsperado}).`);
    const pct = CONFIG.pagos.reduce((t, p) => t + p.porcentaje, 0);
    if (pct !== 100) errs.push(`Los porcentajes de pago suman ${pct}%, deben sumar 100%.`);
    CONFIG.costos.forEach((c) => { if (c.modulo && !CONFIG.modulos.some((m) => m.id === c.modulo)) errs.push(`El costo "${c.concepto}" apunta a un módulo inexistente (${c.modulo}).`); });
    const { min, max } = CONFIG.proyecto.tiempo;
    if (Math.max(...CONFIG.cronograma.map((e) => e.min[1])) !== min) errs.push('El escenario mínimo del cronograma no termina en la semana indicada en proyecto.tiempo.min.');
    if (Math.max(...CONFIG.cronograma.map((e) => e.max[1])) !== max) errs.push('El escenario máximo del cronograma no termina en la semana indicada en proyecto.tiempo.max.');
    return errs;
  }

  const api = { buildModel, validate, fmtMoney, sum };
  if (typeof root.TOR !== 'undefined') root.TOR.pricing = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
