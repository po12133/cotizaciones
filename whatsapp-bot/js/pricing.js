/*
 * Motor de cotización: funciones puras, sin DOM (se prueban con node en tests/pricing.test.js).
 * Depende de WAB.CONFIG (config.js) y WAB.MODULES (modules.js).
 */
(function (root) {
  const isNode = typeof module !== 'undefined' && typeof window === 'undefined';
  const CONFIG = isNode ? require('./config.js') : root.WAB.CONFIG;
  const MOD = isNode ? require('./modules.js') : root.WAB.MODULES;

  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const num = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  /**
   * Completa la selección con la base y las dependencias.
   * Devuelve { ids, auto } donde auto[id] explica por qué se agregó.
   */
  function resolveSelection(selected) {
    const ids = [];
    const auto = {};
    const add = (id, reason) => {
      if (ids.includes(id) || !MOD.byId(id)) return;
      ids.push(id);
      if (reason) auto[id] = reason;
      MOD.byId(id).requiere.forEach((dep) => add(dep, dep === 'base' ? 'Obligatorio' : `Requerido por ${MOD.byId(id).corto}`));
    };
    add('base', 'Obligatorio');
    (selected || []).forEach((id) => add(id));
    // Lo que el cliente eligió explícitamente no se marca como automático.
    (selected || []).forEach((id) => { if (id !== 'base') delete auto[id]; });
    // requiereAlguno: si no hay ninguno, se agrega el primero de la lista.
    ids.slice().forEach((id) => {
      const m = MOD.byId(id);
      if (m.requiereAlguno && !m.requiereAlguno.some((x) => ids.includes(x))) {
        add(m.requiereAlguno[0], `Fuente de datos para ${m.corto}`);
      }
    });
    // Orden estable según el catálogo
    ids.sort((a, b) => MOD.ALL.indexOf(MOD.byId(a)) - MOD.ALL.indexOf(MOD.byId(b)));
    return { ids, auto };
  }

  /** Módulos de la lista que dejarían de cumplir sus dependencias si se quita `id`. */
  function dependentsOf(id, ids) {
    const remaining = ids.filter((x) => x !== id);
    return remaining.filter((x) => {
      const m = MOD.byId(x);
      if (m.requiere.includes(id)) return true;
      if (m.requiereAlguno && m.requiereAlguno.includes(id)) {
        return !m.requiereAlguno.some((y) => remaining.includes(y));
      }
      return false;
    });
  }

  function contactTier(contactos) {
    const n = Math.max(0, num(contactos));
    return CONFIG.tramosContactos.find((t) => n <= t.hasta);
  }

  function periodo(id) {
    return CONFIG.periodos.find((p) => p.id === id) || CONFIG.periodos[0];
  }

  function estimatePlazo(ids) {
    const mods = ids.map(MOD.byId);
    const base = MOD.BASE.dias;
    const extra = mods.filter((m) => m.id !== 'base').reduce((s, m) => s + m.dias, 0);
    const dias = Math.max(CONFIG.plazo.minimoDias, Math.round(base + extra * CONFIG.plazo.factorParalelo));
    return {
      dias,
      min: dias,
      max: Math.round(dias * (1 + CONFIG.plazo.margen))
    };
  }

  /**
   * Calcula la cotización completa.
   * state: { modulos, asesores, contactos, periodo, descuentoPromo, implementacionManual, adicionales }
   */
  function calculate(state) {
    const s = state || {};
    const { ids, auto } = resolveSelection(s.modulos || []);
    const items = ids.map((id) => {
      const m = MOD.byId(id);
      return { id, codigo: m.codigo, nombre: m.nombre, implementacion: m.implementacion, mensual: m.mensual, auto: auto[id] || null, obligatorio: !!m.obligatorio };
    });

    const implModulos = items.reduce((t, i) => t + i.implementacion, 0);
    const manual = s.implementacionManual;
    const implManualValida = manual !== null && manual !== undefined && manual !== '' && Number.isFinite(Number(manual)) && Number(manual) >= 0;
    const implementacion = implManualValida ? round2(Number(manual)) : implModulos;

    const mensualModulos = items.reduce((t, i) => t + i.mensual, 0);
    const asesores = clamp(Math.round(num(s.asesores, CONFIG.asesores.incluidos)), 1, CONFIG.asesores.maximo);
    const asesoresExtra = Math.max(0, asesores - CONFIG.asesores.incluidos);
    const costoAsesores = asesoresExtra * CONFIG.asesores.precioAdicionalMensual;

    const tier = contactTier(s.contactos);
    const aMedida = tier.recargoMensual === null;
    const recargoContactos = aMedida ? 0 : tier.recargoMensual;

    const mensualBase = round2(mensualModulos + costoAsesores + recargoContactos);

    const per = periodo(s.periodo);
    const descPromo = clamp(num(s.descuentoPromo), 0, CONFIG.descuentoPromocionalMaximo);
    const descTotalPct = Math.min(CONFIG.descuentoTotalMaximo, per.descuento + descPromo);
    const descuentoMensual = round2(mensualBase * descTotalPct / 100);
    const mensualConDescuento = round2(mensualBase - descuentoMensual);

    const adicionales = (s.adicionales || [])
      .filter((a) => a && String(a.descripcion || '').trim() && num(a.monto) > 0)
      .map((a) => ({ descripcion: String(a.descripcion).trim(), tipo: a.tipo === 'mensual' ? 'mensual' : 'unico', monto: round2(num(a.monto)) }));
    const adicUnico = round2(adicionales.filter((a) => a.tipo === 'unico').reduce((t, a) => t + a.monto, 0));
    const adicMensual = round2(adicionales.filter((a) => a.tipo === 'mensual').reduce((t, a) => t + a.monto, 0));

    const mensualFinal = round2(mensualConDescuento + adicMensual);
    const suscripcionPeriodo = round2(mensualFinal * per.meses);
    const pagoInicialUnico = round2(implementacion + adicUnico);
    const totalPrimerPeriodo = round2(pagoInicialUnico + suscripcionPeriodo);
    const renovacion = suscripcionPeriodo;
    const ahorroPeriodo = round2(descuentoMensual * per.meses);

    return {
      ids, items, auto,
      implModulos, implementacion, implManual: implManualValida,
      mensualModulos, asesores, asesoresExtra, costoAsesores,
      tier, aMedida, recargoContactos,
      mensualBase,
      periodo: per, descPeriodo: per.descuento, descPromo, descTotalPct,
      descuentoMensual, mensualConDescuento,
      adicionales, adicUnico, adicMensual,
      mensualFinal, suscripcionPeriodo, pagoInicialUnico, totalPrimerPeriodo, renovacion, ahorroPeriodo,
      plazo: estimatePlazo(ids)
    };
  }

  /** Mensualidad modular equivalente al plan (para comparar paquete vs. a medida). */
  function compareWithPlan(plan, state) {
    const modular = calculate(Object.assign({}, state, { modulos: plan.modulos, periodo: 'mensual', descuentoPromo: 0, adicionales: [], implementacionManual: null }));
    return {
      planMensual: plan.mensual,
      planImplementacion: plan.implementacion,
      modularMensual: modular.mensualBase,
      modularImplementacion: modular.implModulos,
      diferenciaMensual: round2(modular.mensualBase - plan.mensual)
    };
  }

  function quoteNumber(date, seq) {
    const d = date instanceof Date ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${CONFIG.prefijoCotizacion}-${y}${m}${day}-${String(seq || 1).padStart(3, '0')}`;
  }

  const api = { round2, resolveSelection, dependentsOf, contactTier, estimatePlazo, calculate, compareWithPlan, quoteNumber, periodo };
  root.WAB = root.WAB || {};
  root.WAB.pricing = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
