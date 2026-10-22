/*
 * Modelo de documento de cotización: una sola fuente para la vista imprimible y el PDF.
 * buildModel(state) → objeto con todos los textos y montos ya calculados.
 */
(function (root) {
  const WAB = root.WAB;
  const { CONFIG, MODULES, pricing, PLANS } = WAB;

  function addDays(isoDate, days) {
    const d = WAB.ui.toDate(isoDate) || new Date();
    const r = new Date(d.getFullYear(), d.getMonth(), d.getDate() + Number(days || 0));
    return r;
  }

  function buildModel(state) {
    const fmt = WAB.ui.fmt;
    const c = pricing.calculate(state);
    const cli = state.cliente || {};
    const fecha = cli.fecha || fmt.isoDate(new Date());
    const validez = Number(cli.validez) || CONFIG.validezDias;
    const numero = pricing.quoteNumber(WAB.ui.toDate(fecha) || new Date(), state.seq || 1);
    const plan = state.plan ? PLANS.find((p) => p.id === state.plan) : null;
    const modNames = c.items.filter((i) => !i.obligatorio).map((i) => MODULES.byId(i.id).corto);

    const resumen = [
      `${CONFIG.empresa.nombre} propone a ${cli.empresa || cli.nombre || 'su empresa'} la implementación de ${CONFIG.empresa.productoLargo}, `
      + `con la integración base de WhatsApp Business${modNames.length ? ` y ${modNames.length} módulo${modNames.length > 1 ? 's' : ''}: ${modNames.join(', ')}` : ''}.`,
      `La inversión inicial es de ${fmt.money(c.pagoInicialUnico)} (pago único) y la suscripción ${c.periodo.nombre.toLowerCase()} es de ${fmt.money(c.suscripcionPeriodo)}`
      + `${c.descTotalPct ? `, con un descuento del ${c.descTotalPct}% sobre la mensualidad` : ''}. `
      + `El plazo estimado de implementación es de ${c.plazo.min} a ${c.plazo.max} días hábiles.`
    ];

    const items = c.items.map((i) => ({
      codigo: i.codigo,
      nombre: i.nombre,
      nota: i.obligatorio ? 'Obligatorio' : (i.auto || ''),
      implementacion: i.implementacion,
      mensual: i.mensual
    }));

    const alcance = c.items.map((i) => {
      const m = MODULES.byId(i.id);
      return { codigo: m.codigo, nombre: m.nombre, descripcion: m.descripcion, features: m.features, dias: m.dias };
    });

    const mensualRows = [{ label: 'Módulos seleccionados', value: c.mensualModulos }];
    if (c.costoAsesores) mensualRows.push({ label: `Asesores adicionales (${c.asesoresExtra} × ${fmt.money(CONFIG.asesores.precioAdicionalMensual)})`, value: c.costoAsesores });
    if (c.recargoContactos) mensualRows.push({ label: `Volumen de contactos (${c.tier.etiqueta})`, value: c.recargoContactos });

    const totales = [
      { label: 'Implementación (pago único)', value: c.implementacion, note: c.implManual ? `Ajustado (referencia por módulos: ${fmt.money(c.implModulos)})` : '' },
      c.adicUnico ? { label: 'Servicios adicionales (pago único)', value: c.adicUnico } : null,
      { label: 'Mensualidad base', value: c.mensualBase },
      c.descTotalPct ? { label: `Descuento ${c.descTotalPct}% (${c.descPeriodo ? `${c.periodo.nombre} ${c.descPeriodo}%` : ''}${c.descPeriodo && c.descPromo ? ' + ' : ''}${c.descPromo ? `promocional ${c.descPromo}%` : ''})`, value: -c.descuentoMensual } : null,
      { label: 'Mensualidad con descuento', value: c.mensualConDescuento },
      c.adicMensual ? { label: 'Servicios adicionales mensuales', value: c.adicMensual } : null,
      { label: `Suscripción ${c.periodo.nombre.toLowerCase()} (${c.periodo.meses} ${c.periodo.meses > 1 ? 'meses' : 'mes'})`, value: c.suscripcionPeriodo },
      { label: 'Total del primer periodo contratado', value: c.totalPrimerPeriodo, strong: true },
      { label: `Renovación ${c.periodo.nombre.toLowerCase()}`, value: c.renovacion }
    ].filter(Boolean);

    return {
      numero,
      fecha: WAB.ui.toDate(fecha),
      validoHasta: addDays(fecha, validez),
      validez,
      cliente: { nombre: cli.nombre || '', empresa: cli.empresa || '', telefono: cli.telefono || '', correo: cli.correo || '' },
      observaciones: cli.observaciones || '',
      plan,
      resumen,
      items,
      alcance,
      mensualRows,
      totales,
      adicionales: c.adicionales,
      parametros: [
        ['Modalidad', `${c.periodo.nombre} (${c.periodo.meses} ${c.periodo.meses > 1 ? 'meses' : 'mes'})`],
        ['Asesores', `${c.asesores} (${CONFIG.asesores.incluidos} incluidos)`],
        ['Contactos activos', c.tier.etiqueta],
        ['Plazo estimado', `${c.plazo.min} a ${c.plazo.max} días hábiles`]
      ],
      aMedida: c.aMedida,
      calc: c,
      condicionesPago: CONFIG.condicionesPago,
      costosExternos: CONFIG.costosExternos,
      exclusiones: CONFIG.exclusiones,
      soporte: CONFIG.condicionesSoporte,
      renovacion: CONFIG.politicasRenovacion,
      limites: CONFIG.limitesUso,
      empresa: CONFIG.empresa,
      nota: CONFIG.notaPrototipos
    };
  }

  /** HTML del documento (vista previa e impresión). */
  function toHTML(m) {
    const { fmt, esc } = WAB.ui;
    const money = (v) => (v < 0 ? `− ${fmt.money(-v)}` : fmt.money(v));
    const list = (arr) => `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    return `
      <header class="pd-head">
        <div class="pd-brand"><span class="pd-mark">AS</span><div><strong>${esc(m.empresa.nombre)}</strong><small>${esc(m.empresa.sitio)} · ${esc(m.empresa.correo)} · ${esc(m.empresa.telefono)}</small></div></div>
        <div class="pd-num"><span>Cotización</span><strong>${esc(m.numero)}</strong><small>Emitida: ${fmt.date(m.fecha, 'long')}<br>Válida hasta: ${fmt.date(m.validoHasta, 'long')}</small></div>
      </header>
      <h1 class="pd-title">${esc(m.empresa.productoLargo)}</h1>
      <section class="pd-client">
        <div><span>Cliente</span><strong>${esc(m.cliente.nombre || '—')}</strong></div>
        <div><span>Empresa</span><strong>${esc(m.cliente.empresa || '—')}</strong></div>
        <div><span>Teléfono</span><strong>${esc(m.cliente.telefono || '—')}</strong></div>
        <div><span>Correo</span><strong>${esc(m.cliente.correo || '—')}</strong></div>
      </section>
      <h2>Resumen ejecutivo</h2>
      ${m.resumen.map((p) => `<p>${esc(p)}</p>`).join('')}
      <div class="pd-params">${m.parametros.map(([k, v]) => `<div><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}</div>
      <h2>Módulos y costos</h2>
      <table class="pd-table"><thead><tr><th>Código</th><th>Módulo</th><th class="num">Implementación</th><th class="num">Mensual</th></tr></thead>
        <tbody>${m.items.map((i) => `<tr><td class="mono">${esc(i.codigo)}</td><td>${esc(i.nombre)}${i.nota ? `<small>${esc(i.nota)}</small>` : ''}</td><td class="num">${fmt.money(i.implementacion)}</td><td class="num">${fmt.money(i.mensual)}</td></tr>`).join('')}
        ${m.mensualRows.slice(1).map((r) => `<tr><td></td><td>${esc(r.label)}</td><td class="num">—</td><td class="num">${fmt.money(r.value)}</td></tr>`).join('')}
        ${m.adicionales.map((a) => `<tr><td class="mono">ADIC</td><td>${esc(a.descripcion)}<small>Servicio adicional</small></td><td class="num">${a.tipo === 'unico' ? fmt.money(a.monto) : '—'}</td><td class="num">${a.tipo === 'mensual' ? fmt.money(a.monto) : '—'}</td></tr>`).join('')}
        </tbody></table>
      <h2>Resumen de inversión</h2>
      <table class="pd-totals">${m.totales.map((t) => `<tr class="${t.strong ? 'strong' : ''}"><td>${esc(t.label)}${t.note ? `<small>${esc(t.note)}</small>` : ''}</td><td class="num">${money(t.value)}</td></tr>`).join('')}</table>
      ${m.aMedida ? '<p class="pd-note">El volumen de contactos supera los 20.000 mensuales: el recargo por volumen se cotiza a medida y no está incluido.</p>' : ''}
      <h2>Alcance por módulo</h2>
      <div class="pd-scope">${m.alcance.map((a) => `<div class="pd-scope-item"><h3><span class="mono">${esc(a.codigo)}</span> ${esc(a.nombre)}</h3><p>${esc(a.descripcion)}</p>${list(a.features)}</div>`).join('')}</div>
      <h2>Costos externos no incluidos</h2>
      <ul>${m.costosExternos.map((x) => `<li><strong>${esc(x.nombre)}:</strong> ${esc(x.detalle)}</li>`).join('')}</ul>
      <div class="pd-cols">
        <div><h2>Condiciones de pago</h2>${list(m.condicionesPago)}</div>
        <div><h2>Soporte y mantenimiento</h2>${list(m.soporte)}</div>
        <div><h2>Límites de uso</h2>${list(m.limites)}</div>
        <div><h2>Renovación</h2>${list(m.renovacion)}</div>
      </div>
      <h2>Exclusiones</h2>${list(m.exclusiones)}
      ${m.observaciones ? `<h2>Observaciones</h2><p>${esc(m.observaciones)}</p>` : ''}
      <h2>Vigencia</h2>
      <p>Esta cotización tiene una validez de ${m.validez} días calendario, hasta el ${fmt.date(m.validoHasta, 'long')}. Los importes son referenciales, están expresados en bolivianos (Bs) y pueden ajustarse tras el diagnóstico.</p>
      <footer class="pd-foot"><span>${esc(m.empresa.nombre)} · ${esc(m.empresa.correo)} · ${esc(m.empresa.telefono)} · ${esc(m.empresa.sitio)}</span><span>${esc(m.numero)}</span></footer>`;
  }

  WAB.quoteDoc = { buildModel, toHTML };
})(window);
