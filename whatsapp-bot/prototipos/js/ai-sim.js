/*
 * IA SIMULADA: no se conecta a ningún modelo. Busca la mejor coincidencia por palabras clave en la
 * base de conocimiento, preguntas frecuentes, servicios, productos e información del negocio,
 * y redacta la respuesta según la personalidad configurada. Sirve para demostrar el comportamiento esperado.
 */
(function (root) {
  const WAB = root.WAB;
  const STOP = new Set('a al algo algun alguna como con cual cuales cuando cuanto de del donde el ella en es esta este hay la las le lo los me mi mis muy no o para pero por que quiero quisiera se si sin son su sus tiene tienen tu un una uno y ya hola buenas buenos dias tardes noches favor gracias puedo puede necesito saber info informacion tengo'.split(' '));
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ\s]/g, ' ');
  const tokens = (s) => norm(s).split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
  const stem = (w) => w.replace(/(es|s)$/, '');

  function score(qTokens, text, keys) {
    const bag = new Set(tokens(`${text} ${keys || ''}`).map(stem));
    const keyBag = new Set(tokens(keys || '').map(stem));
    let s = 0;
    qTokens.forEach((t) => {
      const st = stem(t);
      if (keyBag.has(st)) s += 2;
      else if (bag.has(st)) s += 1;
      else if ([...bag].some((b) => b.length > 4 && (b.startsWith(st) || st.startsWith(b)))) s += 0.6;
    });
    return s;
  }

  function tone(cfg, text, memory) {
    const name = cfg.memoria && memory && memory.nombre ? memory.nombre.split(' ')[0] : '';
    let open = '';
    if (cfg.tono === 'formal') open = name ? `Estimado/a ${name}, ` : '';
    else if (cfg.tono === 'entusiasta') open = name ? `¡${name}, buena pregunta! ` : '¡Buena pregunta! ';
    else open = name ? `${name}, ` : '';
    let body = text;
    if (open && /^[A-ZÁÉÍÓÚÑ]/.test(body) && !open.startsWith('¡') && cfg.tono !== 'formal') body = body.charAt(0).toLowerCase() + body.slice(1);
    if (open && cfg.tono === 'formal') body = body.charAt(0).toLowerCase() + body.slice(1);
    let out = open + body;
    if (cfg.longitud === 'detallada') out += ' Si necesita más detalles, puedo ayudarle con gusto.';
    return out;
  }

  /**
   * answer(text, { memory }) → { text, source, confidence (0-100), handoff, entity }
   */
  function answer(text, ctx = {}) {
    const db = WAB.db;
    const cfg = db.get('ai');
    const memory = ctx.memory || {};
    const raw = String(text || '');
    const q = tokens(raw);

    // Memoria: nombre del cliente
    const nameMatch = raw.match(/\b(?:me llamo|mi nombre es|soy)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)/i);
    if (nameMatch && cfg.memoria) {
      memory.nombre = nameMatch[1].replace(/\b\w/g, (c) => c.toUpperCase());
      if (q.length <= 3) return { text: `Mucho gusto, ${memory.nombre}. Lo recordaré para la próxima. ¿En qué puedo ayudarle?`, source: 'Memoria del cliente', confidence: 95, handoff: false };
    }

    // Transferencia por palabra clave
    const hand = tokens(cfg.transferencia.claves).map(stem);
    if (q.some((t) => hand.includes(stem(t)))) {
      return { text: cfg.transferencia.mensaje, source: 'Regla de transferencia', confidence: 100, handoff: true };
    }

    // Pronombres: "¿y cuánto cuesta?" usa la entidad anterior
    const followUp = /\b(cuanto|precio|cuesta|vale|stock|hay|disponible|dura|duracion)\b/.test(norm(raw)) && q.length <= 3 && memory.entidad;

    const candidates = [];
    cfg.faqs.forEach((f) => candidates.push({ s: score(q, f.pregunta, f.claves), text: f.respuesta, source: `Pregunta frecuente: ${f.pregunta}` }));
    cfg.conocimiento.forEach((k) => candidates.push({ s: score(q, k.titulo + ' ' + k.contenido, k.claves), text: k.contenido, source: `Base de conocimiento: ${k.titulo}` }));
    db.get('services').filter((s) => s.activo).forEach((s) => {
      const sc = score(q, s.nombre, s.nombre + ' servicio');
      candidates.push({ s: sc + (followUp && memory.entidad === s.id ? 3 : 0), text: `${s.nombre}: ${s.descripcion} Precio: ${s.precio ? WAB.ui.fmt.money(s.precio) : 'sin costo'}, duración aproximada ${s.duracion} minutos. Puede reservarlo escribiendo "agendar".`, source: `Servicio: ${s.nombre}`, entity: s.id });
    });
    db.get('products').filter((p) => p.activo).forEach((p) => {
      const cat = db.category(p.categoria);
      const sc = score(q, p.nombre, `${p.nombre} ${cat ? cat.nombre : ''}`);
      const price = db.price(p);
      candidates.push({
        s: sc + (followUp && memory.entidad === p.id ? 3 : 0),
        text: `${p.nombre} cuesta ${WAB.ui.fmt.money(price)}${p.promo ? ` (${p.promo}% de descuento)` : ''}. ${p.stock > 0 ? `Tenemos ${p.stock} unidades disponibles` : 'Por ahora está agotado'}${p.variantes.length ? `, en ${p.variantes.join(', ')}` : ''}. Escriba "tienda" para comprarlo.`,
        source: `Producto: ${p.nombre}`, entity: p.id
      });
    });
    candidates.push({ s: score(q, cfg.empresa, 'horario dirección ubicación pago envío'), text: summarizeBusiness(cfg.empresa, q), source: 'Información de la empresa' });

    candidates.sort((a, b) => b.s - a.s);
    const best = candidates[0];
    const confidence = Math.max(0, Math.min(99, Math.round((best.s / Math.max(1.5, Math.min(q.length, 4) * 1.6)) * 100)));
    if (!q.length || confidence < cfg.transferencia.umbral) {
      return { text: 'No tengo esa información con seguridad. Puedo comunicarle con una persona de nuestro equipo o mostrarle el menú de opciones.', source: 'Sin coincidencia suficiente', confidence, handoff: false, lowConfidence: true };
    }
    if (best.entity) memory.entidad = best.entity;
    return { text: tone(cfg, best.text, memory), source: best.source, confidence, handoff: false, entity: best.entity };
  }

  function summarizeBusiness(info, q) {
    const sentences = info.split(/(?<=\.)\s+/);
    const ranked = sentences.map((s) => ({ s, sc: score(q, s, '') })).sort((a, b) => b.sc - a.sc);
    return ranked[0].sc > 0 ? ranked.filter((r) => r.sc > 0).slice(0, 2).map((r) => r.s).join(' ') : sentences.slice(0, 2).join(' ');
  }

  /** Registra consumo simulado y verifica límites. */
  function consume(conversationCount) {
    const db = WAB.db;
    const cfg = db.get('ai');
    if (conversationCount >= cfg.limites.porConversacion) return { ok: false, reason: 'conversation' };
    if (cfg.limites.usadoMes >= cfg.limites.mensual) return { ok: false, reason: 'monthly' };
    db.update('ai', (a) => { a.limites.usadoMes += 1; return a; });
    return { ok: true };
  }

  WAB.ai = { answer, consume, tokens };
})(window);
