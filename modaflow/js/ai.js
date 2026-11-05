/*
 * Registro de prendas con inteligencia artificial (Claude, vía el servidor de ModaFlow).
 * El navegador envía la foto a /api/ia/analizar; el servidor llama a la API de Anthropic con la API key.
 * Los créditos del plan se descuentan solo cuando el análisis termina correctamente.
 */
(function (root) {
  const MF = (root.MF = root.MF || {});
  const CFG = root.MF_CONFIG;
  const { esc } = MF;
  const API = CFG.ai.endpoint.replace(/\/$/, '');
  const SIZES = ['XS', 'S', 'M', 'L', 'XL'];
  const AUDIENCES = ['Mujer', 'Hombre', 'Unisex', 'Niña', 'Niño', 'Sin determinar'];

  // Fotos reales de MioShop para probar rápido (se analizan de verdad con Claude)
  const SAMPLES = ['saco-rojo-punto', 'chaqueta-roja-militar', 'blusa-roja-escote-corazon', 'blusa-negra-tul', 'top-verde-lunares', 'blusa-negra-encaje', 'blusa-nude-asimetrica', 'blusa-cafe-bordada', 'chaleco-flecos']
    .map((id) => ({ id, photo: 'assets/productos/' + id + '.jpg' }));

  // ---------- Estado del servicio ----------
  let statusCache = null;
  async function status(force) {
    if (statusCache && !force) return statusCache;
    if (location.protocol === 'file:') {
      return (statusCache = { disponible: false, motivo: 'servidor', mensaje: 'Para usar la IA abra el prototipo desde el servidor de ModaFlow (npm start → http://localhost:8080), no como archivo.' });
    }
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 6000);
      const r = await fetch(API + '/estado', { signal: ctl.signal, cache: 'no-store' });
      clearTimeout(t);
      if (!r.ok) throw new Error('estado ' + r.status);
      const s = await r.json();
      statusCache = Object.assign(s, s.disponible ? {} : { motivo: 'clave', mensaje: 'El servidor está activo, pero falta configurar ANTHROPIC_API_KEY en el archivo .env.' });
    } catch (e) {
      statusCache = { disponible: false, motivo: 'servidor', mensaje: 'No se encontró el servicio de IA. Inicie el servidor de ModaFlow con npm start y abra http://localhost:8080.' };
    }
    return statusCache;
  }

  // ---------- Imagen ----------
  /** Carga una imagen (ruta o dataURL), la reduce y la devuelve como JPEG listo para enviar. */
  function toPayload(src, maxEdge, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const max = maxEdge || CFG.ai.maxImageEdge || 1280;
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const dataUrl = c.toDataURL('image/jpeg', quality || 0.85);
        resolve({ dataUrl, base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' });
      };
      img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      img.src = src;
    });
  }
  /** Lee un archivo elegido por el usuario validando formato y tamaño. */
  function readFile(file) {
    if (!file) return Promise.reject(new Error('No se eligió ninguna imagen.'));
    if (!/^image\/(jpeg|png|webp|gif|heic|heif)$/i.test(file.type) && !/\.(jpe?g|png|webp|gif|heic)$/i.test(file.name)) return Promise.reject(new Error('Formato no permitido. Use una foto JPG, PNG o WEBP.'));
    if (file.size > 15 * 1024 * 1024) return Promise.reject(new Error('La foto supera los 15 MB. Elija una más liviana.'));
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => toPayload(fr.result).then(resolve, () => reject(new Error('El navegador no pudo abrir esa imagen (pruebe con JPG o PNG).')));
      fr.onerror = () => reject(new Error('No se pudo leer el archivo.'));
      fr.readAsDataURL(file);
    });
  }

  // ---------- Consumo ----------
  function usage() {
    const u = MF.aiUsage(); // reinicia el contador si cambió el mes
    const a = MF.get().aiUsage;
    a.tokensIn = a.tokensIn || 0; a.tokensOut = a.tokensOut || 0; a.costUsd = a.costUsd || 0; a.history = a.history || [];
    return Object.assign(u, { tokensIn: a.tokensIn, tokensOut: a.tokensOut, costUsd: a.costUsd, history: a.history, real: a.history.length });
  }
  function record(d) {
    usage();
    const a = MF.get().aiUsage;
    a.used++;
    a.tokensIn += d.usage.input_tokens; a.tokensOut += d.usage.output_tokens; a.costUsd += d.cost_usd || 0;
    a.history.unshift({ date: new Date().toISOString(), model: d.model, in: d.usage.input_tokens, out: d.usage.output_tokens, cost: d.cost_usd, bs: d.usd_a_bs, name: d.result.nombre || (d.result.es_prenda ? 'Prenda' : 'Sin prenda'), ms: d.ms });
    a.history.length = Math.min(a.history.length, 30);
    MF.save();
  }
  const fmtUsd = (v) => (v == null ? '—' : 'USD ' + (v < 0.01 ? v.toFixed(5) : v.toFixed(4)));
  const fmtBs = (usd, rate) => (usd == null || !rate ? '' : ` (≈ Bs ${(usd * rate).toFixed(usd * rate < 0.01 ? 4 : 3).replace('.', ',')})`);
  function costLine(d) {
    return `${MF.num(d.usage.input_tokens)} tokens de entrada · ${MF.num(d.usage.output_tokens)} de salida · ${d.cost_usd != null ? fmtUsd(d.cost_usd) + fmtBs(d.cost_usd, d.usd_a_bs) : 'costo: configure la tarifa en .env'}${d.ms >= 100 ? ` · ${(d.ms / 1000).toFixed(1).replace('.', ',')} s` : ''}`;
  }
  /** Indicador de consumo (análisis del mes, créditos del plan, tokens y costo estimado). */
  function usagePanel(compact) {
    const u = usage();
    const plan = MF.plan();
    const last = u.history[0];
    const rate = last && last.bs;
    return `<div class="ai-usage ${compact ? 'compact' : ''}">
      <div><small>Análisis con IA este mes</small><b>${u.used}</b></div>
      <div><small>Créditos restantes (plan ${plan.name})</small><b>${u.left} <span>de ${u.limit}</span></b></div>
      <div><small>Tokens usados</small><b>${MF.num(u.tokensIn + u.tokensOut)}</b><span>${MF.num(u.tokensIn)} entrada · ${MF.num(u.tokensOut)} salida</span></div>
      <div><small>Costo estimado</small><b>${u.history.some((h) => h.cost != null) ? fmtUsd(u.costUsd) : '—'}</b><span>${last && last.cost != null ? 'Último: ' + fmtUsd(last.cost) + fmtBs(last.cost, rate) : 'Se muestra si se configura la tarifa'}</span></div>
    </div>`;
  }
  function historyTable() {
    const h = usage().history;
    return h.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Resultado</th><th>Modelo</th><th class="num">Entrada</th><th class="num">Salida</th><th class="num">Costo</th></tr></thead><tbody>
      ${h.map((x) => `<tr><td>${MF.fdate(x.date, true)}</td><td>${esc(x.name)}</td><td><code>${esc(x.model)}</code></td><td class="num">${MF.num(x.in)}</td><td class="num">${MF.num(x.out)}</td><td class="num">${fmtUsd(x.cost)}</td></tr>`).join('')}</tbody></table></div>`
      : '<div class="empty">Todavía no hay análisis con IA en este navegador.</div>';
  }

  // ---------- Análisis ----------
  class AIError extends Error { constructor(msg, code) { super(msg); this.code = code; } }
  async function analyze(payload) {
    const st = await status(true);
    if (!st.disponible) throw new AIError(st.mensaje, st.motivo);
    if (usage().left <= 0) throw new AIError(`Usó los ${MF.plan().limits.ai} análisis con IA de este mes del plan ${MF.plan().name}. Puede registrar manualmente o cambiar de plan.`, 'creditos');
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), CFG.ai.timeoutMs || 70000);
    let r, data;
    try {
      r = await fetch(API + '/analizar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl.signal,
        body: JSON.stringify({ image: payload.base64, media_type: payload.mediaType, categorias: MF.get().categories, colores: Object.keys(MF.COLORS) })
      });
      data = await r.json().catch(() => ({}));
    } catch (e) {
      throw new AIError(e.name === 'AbortError' ? 'El análisis tardó demasiado. Revise la conexión e intente de nuevo.' : 'No hay conexión con el servidor de ModaFlow. Revise que siga encendido e intente de nuevo.', 'conexion');
    } finally { clearTimeout(t); }
    if (!r.ok || !data.result) throw new AIError(data.error || `El servidor respondió con un error (${r.status}).`, data.code || 'servidor');
    record(data); // solo los análisis completados descuentan crédito
    return data;
  }

  // ---------- Campos de la ficha ----------
  const join = (a) => (a || []).join(', ');
  const split = (s) => [...new Set(String(s || '').split(',').map((x) => x.trim()).filter(Boolean))];
  const needs = (r, k) => r && r.requiere_confirmacion && r.requiere_confirmacion.some((x) => x.toLowerCase().includes(k));
  const flag = (r, k) => (needs(r, k) ? ' <em class="need">Confirmar</em>' : '');
  const lab = (text, r, k) => `<span class="lbl-t">${text}${flag(r, k)}</span>`;

  /** Campos adicionales generados por la IA (también editables a mano). */
  function detailFields(p, r) {
    p = p || {};
    return `<label class="full">${lab('Descripción breve', r, 'corta')} <input name="descShort" value="${esc(p.descShort || '')}" placeholder="Una frase para el catálogo"></label>
      <label>${lab('Tipo de prenda', r, 'tipo')} <input name="garmentType" value="${esc(p.garmentType || '')}" placeholder="Ej. blusa de manga larga"></label>
      <label>${lab('Estilo', r, 'estilo')} <input name="style" value="${esc(p.style || '')}" placeholder="Ej. casual, elegante"></label>
      <label>${lab('Público objetivo', r, 'publico')} <select name="audience"><option value="">Sin indicar</option>${AUDIENCES.map((a) => `<option ${a === p.audience ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
      <label>${lab('Colores secundarios', r, 'secundario')} <input name="secondaryColors" value="${esc(join(p.secondaryColors))}" placeholder="Separados por coma"></label>
      <label class="full">${lab('Características visibles', r, 'caracter')} <input name="features" value="${esc(join(p.features))}" placeholder="Ej. cuello mao, botones metálicos"></label>
      <label class="full">Etiquetas para búsqueda <input name="tags" value="${esc(join(p.tags))}" placeholder="Ej. blusa, roja, fiesta"></label>`;
  }
  /** Lee los campos adicionales de un formulario. */
  function readDetails(fd) {
    return { descShort: (fd.get('descShort') || '').trim(), garmentType: (fd.get('garmentType') || '').trim(), style: (fd.get('style') || '').trim(), audience: fd.get('audience') || '',
      secondaryColors: split(fd.get('secondaryColors')), features: split(fd.get('features')), tags: split(fd.get('tags')).map((x) => x.toLowerCase()) };
  }
  /** Convierte el resultado de Claude en datos de producto. */
  function toProduct(r) {
    return {
      name: r.nombre, category: r.categoria === 'Otra' ? '' : r.categoria, color: r.color_principal === 'Otro' ? '' : r.color_principal,
      desc: r.descripcion_detallada || r.descripcion_corta, descShort: r.descripcion_corta, garmentType: r.tipo_prenda, style: r.estilo,
      audience: r.publico_objetivo === 'Sin determinar' ? '' : r.publico_objetivo, secondaryColors: r.colores_secundarios, features: r.caracteristicas, tags: r.etiquetas
    };
  }
  /** Rellena un formulario existente (editor de productos) con el resultado. */
  function fill(form, r) {
    const p = toProduct(r);
    const set = (n, v) => { const el = form.elements[n]; if (el && v != null && v !== '') { el.value = Array.isArray(v) ? join(v) : v; el.classList.add('ai-filled'); } };
    ['name', 'category', 'color', 'desc', 'descShort', 'garmentType', 'style', 'audience', 'secondaryColors', 'features', 'tags'].forEach((k) => set(k, p[k]));
    form.querySelectorAll('.ai-filled').forEach((el) => el.addEventListener('input', () => el.classList.remove('ai-filled'), { once: true }));
  }
  /** Avisos para mostrar junto al resultado: no es prenda, varias prendas, datos por confirmar. */
  function notices(r) {
    const out = [];
    if (!r.es_prenda) out.push(['bad', 'alert', `<b>No identificamos una prenda en la foto.</b> ${esc(r.mensaje || 'Pruebe con una foto donde la prenda se vea completa y bien iluminada.')}`]);
    else {
      if (r.cantidad_prendas > 1) out.push(['warn', 'layers', `<b>Se ven ${r.cantidad_prendas} prendas.</b> ${esc(r.mensaje || 'Se describió la más destacada.')} Le sugerimos fotografiar y analizar cada prenda por separado.`]);
      if (r.categoria === 'Otra') out.push(['warn', 'tag', 'La categoría no coincide con las de la tienda: elíjala usted.']);
      if (r.color_principal === 'Otro') out.push(['warn', 'info', `Color detectado: <b>${esc(r.color_principal_detalle || 'sin nombre')}</b>. No está en la paleta: elija el más cercano.`]);
      if (r.requiere_confirmacion.length) out.push(['info', 'info', `La IA pide confirmar: ${esc(r.requiere_confirmacion.join(', '))}.`]);
    }
    return out.map(([k, ic, html]) => `<div class="ai-note ${k}">${MF.icon(ic, 'sm')}<span>${html}</span></div>`).join('');
  }

  /** Crea un producto en la base de demostración. */
  function addProduct(d) {
    const db = MF.get();
    const n = db.products.length + 1;
    const p = {
      id: MF.uid('p'), sku: 'MIO-' + String(n).padStart(3, '0'), name: d.name, category: d.category, color: d.color,
      colorHex: MF.COLORS[d.color] || '#ccc', price: +d.price || 0, cost: +d.cost || 0, photo: d.photo || null,
      published: !!d.published, featured: false, desc: d.description || '', minStock: 2,
      createdAt: new Date().toISOString(), source: d.source || 'manual',
      variants: (d.variants || []).filter((v) => v.qty > 0 || d.keepEmpty).map((v) => ({ size: v.size, color: v.color || d.color, stock: { b1: +v.qty || 0, b2: 0, b3: 0 } }))
    };
    ['descShort', 'garmentType', 'style', 'audience', 'secondaryColors', 'features', 'tags', 'aiMeta'].forEach((k) => { if (d[k] != null && d[k] !== '') p[k] = d[k]; });
    if (!p.variants.length) p.variants.push({ size: 'Única', color: d.color, stock: { b1: 0, b2: 0, b3: 0 } });
    db.products.unshift(p);
    MF.audit('producto', `Registró "${p.name}"` + (d.source === 'ia' ? ' con análisis de IA (Claude)' : ''));
    MF.save();
    return p;
  }

  // ---------- Asistente paso a paso ----------
  /** opts: { onSaved(product), onManual(), showCost, doneActions(product) } */
  function wizard(el, opts) {
    opts = opts || {};
    const s = { step: 'photo', payload: null, data: null, error: null, saved: null };

    function stepper() {
      const map = { photo: 1, preview: 1, scan: 2, error: 2, review: 3, done: 4 };
      const cur = map[s.step];
      return `<ol class="ai-steps">${['Foto', 'Análisis', 'Revisión', 'Listo'].map((t, i) => `<li class="${cur > i + 1 ? 'done' : cur === i + 1 ? 'on' : ''}"><span>${i + 1}</span>${t}</li>`).join('')}</ol>`;
    }
    async function render() {
      el.innerHTML = `<div class="ai-wiz">${stepper()}<div class="ai-stage">${({ photo: stepPhoto, preview: stepPreview, scan: stepScan, error: stepError, review: stepReview, done: stepDone })[s.step]()}</div>
        <p class="ai-disclaimer">${MF.icon('shield', 'sm')} La foto se envía al servidor de ModaFlow, que la analiza con Claude (Anthropic). Revise siempre los datos: precio, costo, tallas y cantidades los ingresa usted.</p></div>`;
      bind();
      if (s.step === 'photo' || s.step === 'preview') {
        const st = await status();
        const box = el.querySelector('#aiSvc');
        if (box && !st.disponible) box.innerHTML = `<div class="ai-note bad">${MF.icon('alert', 'sm')}<span><b>IA no disponible.</b> ${esc(st.mensaje)}</span></div>`;
        else if (box) box.innerHTML = `<div class="ai-note ok">${MF.icon('sparkles', 'sm')}<span>Conectado a Claude · modelo <code>${esc(st.modelo)}</code> · ${usage().left} de ${usage().limit} análisis disponibles este mes.</span></div>`;
        const go = el.querySelector('#aiGo');
        if (go && !st.disponible) go.disabled = true;
      }
    }
    function stepPhoto() {
      return `<div id="aiSvc"></div><p class="ai-lead">Suba o tome una foto de la prenda, o pruebe con una foto real de MioShop.</p>
        <div class="ai-samples"><label class="ai-sample upload">${MF.icon('camera')}<span>Tomar o subir foto</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/heic" hidden></label>
        ${SAMPLES.map((x) => `<button type="button" class="ai-sample" data-sample="${x.photo}" aria-label="Usar foto de ejemplo"><img src="${x.photo}" alt="Foto de ejemplo de MioShop" loading="lazy"></button>`).join('')}</div>`;
    }
    function stepPreview() {
      return `<div id="aiSvc"></div><div class="ai-preview"><div class="ai-photo-big"><img src="${s.payload.dataUrl}" alt="Vista previa de la foto"></div>
        <div><h4>Vista previa</h4><p class="muted">Verifique que la prenda se vea completa y con buena luz. Una prenda por foto da mejores resultados.</p>
        <div class="actions start"><button class="btn grad" id="aiGo">${MF.icon('sparkles', 'sm')} Analizar con IA</button><button class="btn ghost" data-restart>${MF.icon('camera', 'sm')} Cambiar foto</button></div></div></div>`;
    }
    function stepScan() {
      return `<div class="ai-scan-wrap"><div class="ai-scan"><img src="${s.payload.dataUrl}" alt="Foto en análisis"><span class="scan-line"></span><span class="scan-grid"></span></div>
        <div class="ai-working" role="status" aria-live="polite"><span class="ai-spinner"></span><b>Identificando tu prenda con inteligencia artificial...</b><small>Claude está revisando tipo de prenda, colores, estilo y detalles visibles. Suele tardar unos segundos.</small></div></div>`;
    }
    function stepError() {
      return `<div class="ai-preview"><div class="ai-photo-big"><img src="${s.payload.dataUrl}" alt=""></div><div>
        <div class="ai-note bad">${MF.icon('alert', 'sm')}<span><b>No se pudo completar el análisis.</b> ${esc(s.error.message)}</span></div>
        <p class="muted" style="font-size:.84rem">No se descontó ningún crédito.</p>
        <div class="actions start">${['creditos', 'clave', 'servidor'].includes(s.error.code) ? '' : `<button class="btn primary" id="aiGo">${MF.icon('refresh', 'sm')} Reintentar</button>`}<button class="btn ghost" data-restart>Otra foto</button>${opts.onManual ? '<button class="btn ghost" data-manual>Registrar manualmente</button>' : ''}</div></div></div>`;
    }
    function stepReview() {
      const r = s.data.result;
      const p = toProduct(r);
      const cats = MF.get().categories;
      const head = `<div class="ai-meta">${MF.icon('sparkles', 'sm')} Análisis con <code>${esc(s.data.model)}</code> · ${costLine(s.data)}</div>`;
      if (!r.es_prenda) {
        return `${head}<div class="ai-preview"><div class="ai-photo-big"><img src="${s.payload.dataUrl}" alt=""></div><div>${notices(r)}
          <div class="actions start"><button class="btn ghost" data-restart>${MF.icon('camera', 'sm')} Probar otra foto</button><button class="btn ghost" id="aiAgain">${MF.icon('refresh', 'sm')} Volver a analizar</button>${opts.onManual ? '<button class="btn ghost" data-manual>Registrar manualmente</button>' : ''}</div></div></div>`;
      }
      return `${head}<div class="ai-review">
        <div class="ai-photo"><img src="${s.payload.dataUrl}" alt=""><span class="ai-conf ${r.confianza === 'alta' ? 'hi' : 'lo'}">${MF.icon('sparkles', 'sm')} Confianza ${esc(r.confianza)}</span>
          <div class="ai-attrs">${r.caracteristicas.map((a) => `<span class="chip">${esc(a)}</span>`).join('')}</div>
          <button type="button" class="btn ghost sm block" id="aiAgain" style="margin-top:10px">${MF.icon('refresh', 'sm')} Volver a analizar</button></div>
        <form class="ai-form form-grid" autocomplete="off">
          <div class="full">${notices(r)}<p class="ai-hint">${MF.icon('sparkles', 'sm')} Campos completados por la IA. Puede editar cualquiera.</p></div>
          <label class="full">${lab('Nombre', r, 'nombre')} <input name="name" value="${esc(p.name)}" required class="ai-filled"></label>
          <label>${lab('Categoría', r, 'categoria')} <select name="category" required class="${p.category ? 'ai-filled' : ''}"><option value="">Elegir…</option>${cats.map((c) => `<option ${c === p.category ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
          <label>${lab('Color principal', r, 'color_principal')} <select name="color" required class="${p.color ? 'ai-filled' : ''}"><option value="">Elegir…</option>${Object.keys(MF.COLORS).map((c) => `<option ${c === p.color ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
          <label class="full">${lab('Descripción detallada', r, 'detallada')} <textarea name="desc" rows="3" class="ai-filled">${esc(p.desc)}</textarea></label>
          ${detailFields(p, r)}
          <div class="full ai-seller"><b>${MF.icon('wallet', 'sm')} Datos que ingresa la vendedora</b></div>
          <label>Precio de venta (Bs) <input name="price" type="number" min="1" step="1" placeholder="Ej. 120" required></label>
          ${opts.showCost ? '<label>Costo (Bs) <input name="cost" type="number" min="0" step="1" placeholder="Opcional"></label>' : '<span></span>'}
          <div class="full"><span class="lbl">Tallas y cantidades</span><div class="size-qty">${SIZES.map((z) => `<label class="sq"><span>${z}</span><input type="number" min="0" name="sz-${z}" value="0"></label>`).join('')}</div></div>
          <label class="switch full"><input type="checkbox" name="published" checked><span></span> Publicar en el catálogo online de MioShop</label>
          <div class="full actions"><button type="button" class="btn ghost" data-restart>${MF.icon('camera', 'sm')} Otra foto</button><button class="btn primary">${MF.icon('check', 'sm')} Guardar producto</button></div>
        </form></div>`;
    }
    function stepDone() {
      const p = s.saved;
      return `<div class="ai-done"><div class="ok-badge">${MF.icon('checkCircle')}</div><h4>¡"${esc(p.name)}" quedó registrado!</h4>
        <p>${MF.stock(p, 'b1')} unidades en inventario · ${MF.money(p.price)} · ${p.published ? 'publicado en el catálogo' : 'no publicado'}</p>
        <div class="actions center">${opts.doneActions ? opts.doneActions(p) : ''}<button class="btn ghost" data-restart>${MF.icon('plus', 'sm')} Registrar otra prenda</button></div></div>`;
    }

    async function run() {
      s.step = 'scan'; render();
      try { s.data = await analyze(s.payload); s.step = 'review'; }
      catch (e) { s.error = e; s.step = 'error'; }
      render();
      if (opts.onUsage) opts.onUsage();
    }
    function bind() {
      const file = el.querySelector('input[type=file]');
      if (file) file.addEventListener('change', async () => {
        try { s.payload = await readFile(file.files[0]); s.step = 'preview'; render(); }
        catch (e) { MF.toast(e.message, 'error'); file.value = ''; }
      });
      el.querySelectorAll('[data-sample]').forEach((b) => b.addEventListener('click', async () => {
        try { s.payload = await toPayload(b.dataset.sample); s.step = 'preview'; render(); } catch (e) { MF.toast(e.message, 'error'); }
      }));
      const go = el.querySelector('#aiGo'); if (go) go.addEventListener('click', run);
      const again = el.querySelector('#aiAgain'); if (again) again.addEventListener('click', run);
      el.querySelectorAll('[data-restart]').forEach((b) => b.addEventListener('click', () => { s.step = 'photo'; s.payload = null; s.data = null; render(); }));
      el.querySelectorAll('[data-manual]').forEach((b) => b.addEventListener('click', () => opts.onManual()));
      const form = el.querySelector('.ai-form');
      if (form) form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = new FormData(form);
        if (!MF.canAddProduct()) { MF.toast(`Llegó al límite de ${MF.plan().limits.products} productos del plan ${MF.plan().name}.`, 'error'); return; }
        const variants = SIZES.map((z) => ({ size: z, qty: +f.get('sz-' + z) || 0 })).filter((v) => v.qty > 0);
        if (!variants.length) { MF.toast('Indique al menos una talla con cantidad', 'error'); return; }
        const photo = (await toPayload(s.payload.dataUrl, 640, 0.8)).dataUrl; // versión liviana para guardar en el navegador
        s.saved = addProduct(Object.assign({
          name: f.get('name').trim(), category: f.get('category'), color: f.get('color'), description: f.get('desc'),
          price: f.get('price'), cost: f.get('cost') || 0, published: f.get('published') === 'on', photo,
          variants, source: 'ia', aiMeta: { model: s.data.model, confianza: s.data.result.confianza, fecha: new Date().toISOString() }
        }, readDetails(f)));
        s.step = 'done'; render();
        if (opts.onSaved) opts.onSaved(s.saved);
      });
    }
    render();
    return { reset() { s.step = 'photo'; render(); } };
  }

  MF.AI = { SAMPLES, SIZES, status, toPayload, readFile, analyze, usage, usagePanel, historyTable, costLine, detailFields, readDetails, fill, notices, toProduct, addProduct, wizard };
})(window);
