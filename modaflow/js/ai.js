/*
 * Registro de prendas con inteligencia artificial (Claude, vía el servidor de ModaFlow).
 * El navegador envía de 1 a 3 fotos de la misma prenda (frente, espalda y etiqueta) a /api/ia/analizar;
 * el servidor llama a la API de Anthropic con la API key.
 * Cada análisis descuenta 1 crédito del plan (sin importar cuántas fotos lleve) y solo cuando termina correctamente.
 */
(function (root) {
  const MF = (root.MF = root.MF || {});
  const CFG = root.MF_CONFIG;
  const { esc } = MF;
  const API = CFG.ai.endpoint.replace(/\/$/, '');
  const SIZES = ['XS', 'S', 'M', 'L', 'XL'];
  const AUDIENCES = ['Mujer', 'Hombre', 'Unisex', 'Niña', 'Niño', 'Sin determinar'];

  // Vistas de la prenda. Ninguna es obligatoria por separado: basta con una foto.
  const VIEWS = [
    { id: 'frente', label: 'Frente', hint: 'La prenda completa, de adelante', icon: 'shirt' },
    { id: 'espalda', label: 'Espalda', hint: 'La parte de atrás', icon: 'undo' },
    { id: 'etiqueta', label: 'Etiqueta', hint: 'Marca, talla y composición', icon: 'tag' }
  ];
  const VIEW_LABEL = Object.fromEntries(VIEWS.map((v) => [v.id, v.label]));
  const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/heic';

  // Fotos reales de MioShop para probar rápido (se analizan de verdad con Claude)
  const SAMPLES = ['saco-rojo-punto', 'chaqueta-roja-militar', 'blusa-roja-escote-corazon', 'blusa-negra-tul', 'top-verde-lunares', 'blusa-negra-encaje', 'blusa-nude-asimetrica', 'blusa-cafe-bordada', 'chaleco-flecos']
    .map((id) => ({ id, photo: 'assets/productos/' + id + '.jpg' }));

  /** Fotos cargadas, en el orden frente → espalda → etiqueta: [{ view, src }]. */
  const shotList = (shots) => VIEWS.filter((v) => shots && shots[v.id]).map((v) => ({ view: v.id, src: shots[v.id] }));
  /** Convierte p.photos (o p.photo) de un producto en el objeto de casillas. */
  function shotsOf(p) {
    const out = { frente: null, espalda: null, etiqueta: null };
    if (p && Array.isArray(p.photos) && p.photos.length) p.photos.forEach((x) => { if (x && x.src && x.view in out) out[x.view] = x.src; });
    else if (p && p.photo) out.frente = p.photo;
    return out;
  }
  const photoWord = (n) => (n === 1 ? '1 foto' : n + ' fotos');

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
      statusCache = { disponible: false, motivo: 'servidor', mensaje: 'No se encontró el servicio de IA. Si el sitio está publicado como estático, la IA necesita el servidor de ModaFlow (Node o Docker); en local, inícielo con npm start y abra http://localhost:8080.' };
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
  /** Versiones livianas para guardar en el navegador. Las fotos de ejemplo (assets/) se guardan reducidas igual. */
  async function savePhotos(shots, keepPaths) {
    const out = [];
    for (const x of shotList(shots)) {
      const src = keepPaths && !/^data:/.test(x.src) ? x.src : (await toPayload(x.src, 640, 0.8)).dataUrl;
      out.push({ view: x.view, src });
    }
    return out;
  }

  // ---------- Casillas de fotos (frente, espalda, etiqueta) ----------
  /**
   * Muestra las 3 casillas de fotos. Cada una se puede tomar con la cámara, subir, arrastrar, cambiar o quitar.
   * opts: { shots, compact, onChange(shots) }. Devuelve { shots, set(view, src), render() }.
   */
  function photoSlots(el, opts) {
    const shots = opts.shots || { frente: null, espalda: null, etiqueta: null };
    const changed = () => { render(); if (opts.onChange) opts.onChange(shots); };
    async function put(view, file) {
      try { shots[view] = (await readFile(file)).dataUrl; changed(); }
      catch (e) { MF.toast(e.message, 'error'); }
    }
    function slot(v, i) {
      const src = shots[v.id];
      const main = src && shotList(shots)[0].view === v.id;
      const head = `<div class="ph-slot-head"><b>${i + 1} · ${v.label}</b><small>${main ? 'Foto principal' : 'Opcional'}</small></div>`;
      if (src) {
        return `<div class="ph-slot is-filled" data-view="${v.id}">${head}<div class="ph-img"><img src="${esc(src)}" alt="Foto: ${v.label}">
          <button type="button" class="ph-x" data-rm="${v.id}" aria-label="Quitar foto de ${v.label}">${MF.icon('x', 'sm')}</button></div>
          <label class="link-btn ph-change">${MF.icon('refresh', 'sm')} Cambiar<input type="file" accept="${ACCEPT}" data-pick="${v.id}" hidden></label></div>`;
      }
      return `<div class="ph-slot is-empty" data-view="${v.id}">${head}<div class="ph-drop">${MF.icon(v.icon)}<span>${v.hint}</span>
        <div class="ph-btns"><label class="btn grad sm ph-cam">${MF.icon('camera', 'sm')} Tomar foto<input type="file" accept="image/*" capture="environment" data-pick="${v.id}" data-cam hidden></label>
        <label class="btn ghost sm">${MF.icon('upload', 'sm')} Subir<input type="file" accept="${ACCEPT}" data-pick="${v.id}" hidden></label></div></div></div>`;
    }
    function render() {
      const n = shotList(shots).length;
      el.innerHTML = `<div class="ph-slots ${opts.compact ? 'compact' : ''}">${VIEWS.map(slot).join('')}</div>
        <div class="ph-foot"><span>${n ? `${photoWord(n)} de 3` : 'Agregue al menos 1 foto'} · la espalda y la etiqueta son opcionales</span>
        ${n < 3 ? `<label class="link-btn">${MF.icon('image', 'sm')} Elegir varias a la vez<input type="file" accept="${ACCEPT}" multiple data-multi hidden></label>` : ''}</div>`;
      el.querySelectorAll('[data-pick]').forEach((inp) => inp.addEventListener('change', () => { if (inp.files[0]) put(inp.dataset.pick, inp.files[0]); }));
      el.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { shots[b.dataset.rm] = null; changed(); }));
      const multi = el.querySelector('[data-multi]');
      if (multi) multi.addEventListener('change', async () => {
        const free = VIEWS.filter((v) => !shots[v.id]).map((v) => v.id);
        const files = [...multi.files];
        if (files.length > free.length) MF.toast(`Solo hay lugar para ${photoWord(free.length)} más; se usaron las primeras.`, 'error');
        for (const [i, f] of files.slice(0, free.length).entries()) {
          try { shots[free[i]] = (await readFile(f)).dataUrl; } catch (e) { MF.toast(e.message, 'error'); }
        }
        changed();
      });
      el.querySelectorAll('.ph-slot').forEach((box) => {
        box.addEventListener('dragover', (e) => { e.preventDefault(); box.classList.add('drag'); });
        box.addEventListener('dragleave', () => box.classList.remove('drag'));
        box.addEventListener('drop', (e) => { e.preventDefault(); box.classList.remove('drag'); const f = e.dataTransfer.files[0]; if (f) put(box.dataset.view, f); });
      });
    }
    render();
    return { shots, render, set(view, src) { shots[view] = src; changed(); } };
  }

  // ---------- Consumo ----------
  function usage() {
    const u = MF.aiUsage(); // reinicia el contador si cambió el mes
    const a = MF.get().aiUsage;
    a.tokensIn = a.tokensIn || 0; a.tokensOut = a.tokensOut || 0; a.costUsd = a.costUsd || 0; a.history = a.history || [];
    return Object.assign(u, { tokensIn: a.tokensIn, tokensOut: a.tokensOut, costUsd: a.costUsd, history: a.history, real: a.history.length });
  }
  function record(d, nPhotos) {
    usage();
    const a = MF.get().aiUsage;
    MF.countAi(); // mensual en planes pagados, total en la prueba gratuita
    a.tokensIn += d.usage.input_tokens; a.tokensOut += d.usage.output_tokens; a.costUsd += d.cost_usd || 0;
    a.history.unshift({ date: new Date().toISOString(), model: d.model, in: d.usage.input_tokens, out: d.usage.output_tokens, cost: d.cost_usd, bs: d.usd_a_bs, name: d.result.nombre || (d.result.es_prenda ? 'Prenda' : 'Sin prenda'), ms: d.ms, photos: nPhotos || 1 });
    a.history.length = Math.min(a.history.length, 30);
    MF.save();
  }
  const fmtUsd = (v) => (v == null ? '—' : 'USD ' + (v < 0.01 ? v.toFixed(5) : v.toFixed(4)));
  const fmtBs = (usd, rate) => (usd == null || !rate ? '' : ` (≈ Bs ${(usd * rate).toFixed(usd * rate < 0.01 ? 4 : 3).replace('.', ',')})`);
  function costLine(d) {
    return `${d.photos > 1 ? photoWord(d.photos) + ' · ' : ''}${MF.num(d.usage.input_tokens)} tokens de entrada · ${MF.num(d.usage.output_tokens)} de salida · ${d.cost_usd != null ? fmtUsd(d.cost_usd) + fmtBs(d.cost_usd, d.usd_a_bs) : 'costo: configure la tarifa en .env'}${d.ms >= 100 ? ` · ${(d.ms / 1000).toFixed(1).replace('.', ',')} s` : ''}`;
  }
  /** Indicador de consumo (análisis del mes, créditos del plan, tokens y costo estimado). */
  function usagePanel(compact) {
    const u = usage();
    const plan = MF.plan();
    const last = u.history[0];
    const rate = last && last.bs;
    return `<div class="ai-usage ${compact ? 'compact' : ''}">
      <div><small>Análisis con IA ${u.period}</small><b>${u.used}</b></div>
      <div><small>Créditos restantes (plan ${plan.name})</small><b>${u.left} <span>de ${u.limit}</span></b></div>
      <div><small>Tokens usados</small><b>${MF.num(u.tokensIn + u.tokensOut)}</b><span>${MF.num(u.tokensIn)} entrada · ${MF.num(u.tokensOut)} salida</span></div>
      <div><small>Costo estimado</small><b>${u.history.some((h) => h.cost != null) ? fmtUsd(u.costUsd) : '—'}</b><span>${last && last.cost != null ? 'Último: ' + fmtUsd(last.cost) + fmtBs(last.cost, rate) : 'Se muestra si se configura la tarifa'}</span></div>
    </div>`;
  }
  function historyTable() {
    const h = usage().history;
    return h.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Resultado</th><th>Fotos</th><th>Modelo</th><th class="num">Entrada</th><th class="num">Salida</th><th class="num">Costo</th></tr></thead><tbody>
      ${h.map((x) => `<tr><td>${MF.fdate(x.date, true)}</td><td>${esc(x.name)}</td><td>${x.photos || 1}</td><td><code>${esc(x.model)}</code></td><td class="num">${MF.num(x.in)}</td><td class="num">${MF.num(x.out)}</td><td class="num">${fmtUsd(x.cost)}</td></tr>`).join('')}</tbody></table></div>`
      : '<div class="empty">Todavía no hay análisis con IA en este navegador.</div>';
  }

  // ---------- Análisis ----------
  class AIError extends Error { constructor(msg, code) { super(msg); this.code = code; } }
  /** Analiza de 1 a 3 fotos de la misma prenda. shots: { frente, espalda, etiqueta } (rutas o dataURL). */
  async function analyze(shots) {
    const list = shotList(shots);
    if (!list.length) throw new AIError('Agregue al menos una foto de la prenda.', 'fotos');
    const st = await status(true);
    if (!st.disponible) throw new AIError(st.mensaje, st.motivo);
    if (usage().left <= 0) throw new AIError(`Usó los ${MF.plan().limits.ai} análisis con IA de este mes del plan ${MF.plan().name}. Puede registrar manualmente o cambiar de plan.`, 'creditos');
    let images;
    try { images = await Promise.all(list.map(async (x) => { const p = await toPayload(x.src); return { image: p.base64, media_type: p.mediaType, vista: x.view }; })); }
    catch (e) { throw new AIError('No se pudo preparar una de las fotos. Cámbiela e intente de nuevo.', 'imagen'); }
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), CFG.ai.timeoutMs || 70000);
    let r, data;
    try {
      r = await fetch(API + '/analizar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl.signal,
        body: JSON.stringify({ images, categorias: MF.get().categories, colores: Object.keys(MF.COLORS) })
      });
      data = await r.json().catch(() => ({}));
    } catch (e) {
      throw new AIError(e.name === 'AbortError' ? 'El análisis tardó demasiado. Revise la conexión e intente de nuevo.' : 'No hay conexión con el servidor de ModaFlow. Revise que siga encendido e intente de nuevo.', 'conexion');
    } finally { clearTimeout(t); }
    if (!r.ok || !data.result) throw new AIError(data.error || `El servidor respondió con un error (${r.status}).`, data.code || 'servidor');
    data.photos = list.length;
    data.views = list.map((x) => x.view);
    record(data, list.length); // solo los análisis completados descuentan crédito (1 por prenda)
    return data;
  }

  // ---------- Campos de la ficha ----------
  const join = (a) => (a || []).join(', ');
  const split = (s) => [...new Set(String(s || '').split(',').map((x) => x.trim()).filter(Boolean))];
  const needs = (r, k) => r && r.requiere_confirmacion && r.requiere_confirmacion.some((x) => x.toLowerCase().includes(k));
  const flag = (r, k) => (needs(r, k) ? ' <em class="need">Confirmar</em>' : '');
  const lab = (text, r, k) => `<span class="lbl-t">${text}${flag(r, k)}</span>`;
  const fromLabel = (r, k) => (r && r.etiqueta && r.etiqueta.legible && r.etiqueta[k] && r.etiqueta[k].length ? ' <em class="from-label">De la etiqueta</em>' : '');

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
  /** Datos que se leen en la etiqueta de la prenda (marca, composición, país, cuidados). */
  function labelFields(p, r) {
    p = p || {};
    const f = (name, text, key, val, ph, full) => `<label class="${full ? 'full' : ''}"><span class="lbl-t">${text}${fromLabel(r, key)}${flag(r, key)}</span> <input name="${name}" value="${esc(val || '')}" placeholder="${ph}" class="${r && r.etiqueta && r.etiqueta.legible && r.etiqueta[key] && r.etiqueta[key].length ? 'ai-filled' : ''}"></label>`;
    return f('brand', 'Marca', 'marca', p.brand, 'Ej. Zara') + f('origin', 'País de origen', 'pais_origen', p.origin, 'Ej. Perú') +
      f('composition', 'Composición de la tela', 'composicion', p.composition, 'Ej. 95% algodón, 5% elastano', true) +
      f('care', 'Cuidados', 'cuidados', join(p.care), 'Ej. lavar a mano, no usar secadora', true);
  }
  /** Lee los campos adicionales de un formulario. */
  function readDetails(fd) {
    const t = (k) => (fd.get(k) || '').trim();
    return { descShort: t('descShort'), garmentType: t('garmentType'), style: t('style'), audience: fd.get('audience') || '',
      secondaryColors: split(fd.get('secondaryColors')), features: split(fd.get('features')), tags: split(fd.get('tags')).map((x) => x.toLowerCase()),
      brand: t('brand'), origin: t('origin'), composition: t('composition'), care: split(fd.get('care')) };
  }
  /** Convierte el resultado de Claude en datos de producto. */
  function toProduct(r) {
    const e = (r.etiqueta && r.etiqueta.legible) ? r.etiqueta : {};
    return {
      name: r.nombre, category: r.categoria === 'Otra' ? '' : r.categoria, color: r.color_principal === 'Otro' ? '' : r.color_principal,
      desc: r.descripcion_detallada || r.descripcion_corta, descShort: r.descripcion_corta, garmentType: r.tipo_prenda, style: r.estilo,
      audience: r.publico_objetivo === 'Sin determinar' ? '' : r.publico_objetivo, secondaryColors: r.colores_secundarios, features: r.caracteristicas, tags: r.etiquetas,
      brand: e.marca || '', origin: e.pais_origen || '', composition: e.composicion || '', care: e.cuidados || [], labelSize: e.talla || ''
    };
  }
  /** Talla leída en la etiqueta, si coincide con una de la grilla (XS…XL). */
  const labelSizeMatch = (t) => { const u = String(t || '').trim().toUpperCase(); return SIZES.includes(u) ? u : null; };
  /** Rellena un formulario existente (editor de productos) con el resultado. */
  function fill(form, r) {
    const p = toProduct(r);
    const set = (n, v) => { const el = form.elements[n]; if (el && v != null && v !== '' && !(Array.isArray(v) && !v.length)) { el.value = Array.isArray(v) ? join(v) : v; el.classList.add('ai-filled'); } };
    ['name', 'category', 'color', 'desc', 'descShort', 'garmentType', 'style', 'audience', 'secondaryColors', 'features', 'tags', 'brand', 'origin', 'composition', 'care'].forEach((k) => set(k, p[k]));
    form.querySelectorAll('.ai-filled').forEach((el) => el.addEventListener('input', () => el.classList.remove('ai-filled'), { once: true }));
  }
  /** Avisos para mostrar junto al resultado: no es prenda, varias prendas, fotos de prendas distintas, etiqueta, datos por confirmar. */
  function notices(r, views) {
    const out = [];
    views = views || [];
    if (!r.es_prenda) out.push(['bad', 'alert', `<b>No identificamos una prenda en ${views.length > 1 ? 'las fotos' : 'la foto'}.</b> ${esc(r.mensaje || 'Pruebe con una foto donde la prenda se vea completa y bien iluminada.')}`]);
    else {
      if (r.fotos_misma_prenda === false) out.push(['warn', 'layers', `<b>Las fotos parecen de prendas distintas.</b> ${esc(r.mensaje || 'Se describió la prenda de la primera foto.')} Use fotos de una sola prenda: frente, espalda y su etiqueta.`]);
      if (r.cantidad_prendas > 1) out.push(['warn', 'layers', `<b>Se ven ${r.cantidad_prendas} prendas.</b> ${r.fotos_misma_prenda === false ? '' : esc(r.mensaje || 'Se describió la más destacada.')} Le sugerimos fotografiar y analizar cada prenda por separado.`]);
      if (r.categoria === 'Otra') out.push(['warn', 'tag', 'La categoría no coincide con las de la tienda: elíjala usted.']);
      if (r.color_principal === 'Otro') out.push(['warn', 'info', `Color detectado: <b>${esc(r.color_principal_detalle || 'sin nombre')}</b>. No está en la paleta: elija el más cercano.`]);
      if (views.includes('etiqueta') && !(r.etiqueta && r.etiqueta.legible)) out.push(['warn', 'tag', '<b>No se pudo leer la etiqueta.</b> Pruebe con una foto más cerca, enfocada y con buena luz, o complete esos datos a mano.']);
      if (r.requiere_confirmacion.length) out.push(['info', 'info', `La IA pide confirmar: ${esc(r.requiere_confirmacion.join(', '))}.`]);
    }
    return out.map(([k, ic, html]) => `<div class="ai-note ${k}">${MF.icon(ic, 'sm')}<span>${html}</span></div>`).join('');
  }

  /** Crea un producto en la base de demostración y registra su stock inicial como movimiento de inventario. */
  function addProduct(d) {
    const db = MF.get();
    const n = db.products.length + 1;
    const photos = Array.isArray(d.photos) ? d.photos.filter((x) => x && x.src) : [];
    const p = {
      id: MF.uid('p'), sku: 'MIO-' + String(n).padStart(3, '0'), name: d.name, category: d.category, color: d.color,
      colorHex: MF.COLORS[d.color] || '#ccc', price: +d.price || 0, cost: +d.cost || 0, photo: d.photo || (photos[0] && photos[0].src) || null,
      published: !!d.published, featured: false, desc: d.description || '', minStock: d.minStock != null ? +d.minStock : 2,
      createdAt: new Date().toISOString(), source: d.source || 'manual', active: true,
      variants: []
    };
    // Variantes: misma talla y color se suman en una sola
    (d.variants || []).filter((v) => v.qty > 0 || d.keepEmpty).forEach((v) => {
      const color = v.color || d.color;
      const ex = p.variants.find((x) => x.size === v.size && x.color === color);
      if (ex) ex.stock.b1 += +v.qty || 0;
      else p.variants.push({ size: v.size, color, stock: { b1: +v.qty || 0, b2: 0, b3: 0 } });
    });
    if (photos.length) p.photos = photos;
    ['descShort', 'garmentType', 'style', 'audience', 'secondaryColors', 'features', 'tags', 'brand', 'origin', 'composition', 'care', 'aiMeta'].forEach((k) => {
      if (d[k] != null && d[k] !== '' && !(Array.isArray(d[k]) && !d[k].length)) p[k] = d[k];
    });
    if (!p.variants.length) p.variants.push({ size: 'Única', color: d.color, stock: { b1: 0, b2: 0, b3: 0 } });
    db.products.unshift(p);
    p.variants.forEach((v) => { if (v.stock.b1) MF.logMove({ productId: p.id, name: p.name, size: v.size, color: v.color, qty: v.stock.b1, type: d.source === 'importacion' ? 'importacion' : 'inicial', ref: 'Registro de la prenda', branchId: 'b1' }); });
    MF.audit('producto', `Registró "${p.name}"` + (d.source === 'ia' ? ` con análisis de IA (Claude, ${photoWord(photos.length || 1)})` : ''));
    MF.save();
    return p;
  }

  // ---------- Tallas, colores y cantidades ----------
  const SIZE_CHIPS = ['Única', 'XS', 'S', 'M', 'L', 'XL'];
  /**
   * Editor de variantes para el registro: cada fila es talla + color + cantidad.
   * Toque una talla para agregarla; "Prenda única" deja 1 unidad de talla única (ropa de fardos).
   * opts: { color(), suggested } → { rows(), setColor(old, nuevo) }
   */
  function variantEditor(el, opts) {
    const rows = [];
    const mainColor = () => (opts.color && opts.color()) || 'Negro';
    const total = () => rows.reduce((a, r) => a + (+r.qty || 0), 0);
    function draw() {
      const colors = Object.keys(MF.COLORS);
      el.innerHTML = `<div class="ve">
        <div class="ve-quick"><span class="lbl">Toque las tallas que tiene${opts.suggested ? ` · <em class="from-label">Etiqueta: ${esc(opts.suggested)}</em>` : ''}</span>
          <div class="ve-chips">${SIZE_CHIPS.map((z) => `<button type="button" class="vchip ${rows.some((r) => r.size === z && r.color === mainColor()) ? 'on' : ''} ${opts.suggested && opts.suggested.toUpperCase() === z.toUpperCase() ? 'sug' : ''}" data-size="${z}">${z}</button>`).join('')}
          <button type="button" class="vchip ghost" data-other>+ Otra</button></div></div>
        <div class="ve-rows">${rows.map((r, i) => `<div class="ve-row"><b class="ve-size">${esc(r.size)}</b>
          <select data-col="${i}" aria-label="Color de la talla ${esc(r.size)}">${colors.concat(colors.includes(r.color) ? [] : [r.color]).map((c) => `<option ${c === r.color ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
          <div class="stepper"><button type="button" data-dec="${i}" aria-label="Menos">${MF.icon('minus', 'sm')}</button><input type="number" inputmode="numeric" min="0" data-qty="${i}" value="${r.qty}" aria-label="Cantidad talla ${esc(r.size)}"><button type="button" data-inc="${i}" aria-label="Más">${MF.icon('plus', 'sm')}</button></div>
          <button type="button" class="icon-btn" data-rm="${i}" aria-label="Quitar talla ${esc(r.size)}">${MF.icon('x', 'sm')}</button></div>`).join('') || '<p class="ve-empty">Todavía no eligió tallas.</p>'}</div>
        <div class="ve-foot"><button type="button" class="btn ghost sm" data-unique>${MF.icon('tag', 'sm')} Prenda única (1 unidad)</button>
          ${rows.length ? `<button type="button" class="btn ghost sm" data-color2>${MF.icon('plus', 'sm')} Mismas tallas en otro color</button>` : ''}
          <span class="ve-total">Total: <b>${total()}</b> ${total() === 1 ? 'unidad' : 'unidades'}</span></div></div>`;
      el.querySelectorAll('[data-size]').forEach((b) => b.addEventListener('click', () => {
        const i = rows.findIndex((r) => r.size === b.dataset.size && r.color === mainColor());
        if (i >= 0) rows.splice(i, 1); else rows.push({ size: b.dataset.size, color: mainColor(), qty: 1 });
        draw();
      }));
      const other = el.querySelector('[data-other]');
      other.addEventListener('click', () => {
        const z = (prompt('Talla (por ejemplo 38, 40, 2XL o Estándar):') || '').trim().slice(0, 12);
        if (z) { rows.push({ size: z, color: mainColor(), qty: 1 }); draw(); }
      });
      el.querySelector('[data-unique]').addEventListener('click', () => { rows.splice(0, rows.length, { size: 'Única', color: mainColor(), qty: 1 }); draw(); });
      const c2 = el.querySelector('[data-color2]');
      if (c2) c2.addEventListener('click', () => {
        const used = new Set(rows.map((r) => r.color));
        const next = Object.keys(MF.COLORS).find((c) => !used.has(c)) || 'Negro';
        const sizes = [...new Set(rows.map((r) => r.size))];
        sizes.forEach((z) => rows.push({ size: z, color: next, qty: 1 }));
        draw();
        MF.toast(`Se agregaron las tallas en ${next}: cambie el color en cada fila si hace falta`, 'info');
      });
      el.querySelectorAll('[data-col]').forEach((s) => s.addEventListener('change', () => { rows[s.dataset.col].color = s.value; draw(); }));
      el.querySelectorAll('[data-qty]').forEach((s) => s.addEventListener('input', () => { rows[s.dataset.qty].qty = Math.max(0, Math.round(+s.value || 0)); el.querySelector('.ve-total b').textContent = total(); }));
      el.querySelectorAll('[data-inc]').forEach((b) => b.addEventListener('click', () => { rows[b.dataset.inc].qty++; draw(); }));
      el.querySelectorAll('[data-dec]').forEach((b) => b.addEventListener('click', () => { const r = rows[b.dataset.dec]; r.qty = Math.max(0, r.qty - 1); draw(); }));
      el.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { rows.splice(+b.dataset.rm, 1); draw(); }));
    }
    draw();
    return {
      rows: () => rows.map((r) => Object.assign({}, r)),
      setColor(oldC, newC) { rows.forEach((r) => { if (!oldC || r.color === oldC) r.color = newC; }); draw(); },
      add(size, color, qty) { rows.push({ size, color: color || mainColor(), qty: qty == null ? 1 : qty }); draw(); }
    };
  }

  /** Foto grande + miniaturas de las demás vistas (clic para verlas en grande). */
  function gallery(list, extraHtml) {
    if (!list.length) return `<div class="ai-gallery"><div class="ai-gal-main ai-nophoto">${MF.icon('image')}<span>Sin fotos</span>${extraHtml || ''}</div></div>`;
    const main = list[0];
    return `<div class="ai-gallery"><div class="ai-gal-main"><img src="${esc(main.src)}" alt="Foto: ${VIEW_LABEL[main.view]}" data-gal-main>${extraHtml || ''}</div>
      ${list.length > 1 ? `<div class="ai-gal-thumbs">${list.map((x, i) => `<button type="button" class="${i ? '' : 'on'}" data-gal="${esc(x.src)}" aria-label="Ver foto: ${VIEW_LABEL[x.view]}"><img src="${esc(x.src)}" alt=""><span>${VIEW_LABEL[x.view]}</span></button>`).join('')}</div>` : ''}</div>`;
  }
  function bindGallery(el) {
    el.querySelectorAll('[data-gal]').forEach((b) => b.addEventListener('click', () => {
      const big = el.querySelector('[data-gal-main]'); if (big) big.src = b.dataset.gal;
      el.querySelectorAll('[data-gal]').forEach((x) => x.classList.toggle('on', x === b));
    }));
  }

  // ---------- Asistente paso a paso: Fotos → Análisis → Revisión → Listo ----------
  /** opts: { onSaved(product), showCost, doneActions(product), compact, catalog } */
  function wizard(el, opts) {
    opts = opts || {};
    const s = { step: 'photo', shots: { frente: null, espalda: null, etiqueta: null }, data: null, manual: false, error: null, saved: null, svc: null };
    const list = () => shotList(s.shots);
    let ve = null;

    function stepper() {
      const map = { photo: 1, scan: 2, error: 2, review: 3, done: 4 };
      const cur = map[s.step];
      return `<ol class="ai-steps">${['Fotos', s.manual ? 'Sin IA' : 'Análisis', 'Revisión', 'Listo'].map((t, i) => `<li class="${cur > i + 1 ? 'done' : cur === i + 1 ? 'on' : ''}"><span>${i + 1}</span>${t}</li>`).join('')}</ol>`;
    }
    function goLabel() { const n = list().length; return `${MF.icon('sparkles', 'sm')} ${n > 1 ? `Identificar prenda con IA (${n} fotos)` : 'Identificar prenda con IA'}`; }
    function syncGo() {
      const go = el.querySelector('#aiGo');
      if (!go) return;
      go.innerHTML = goLabel();
      go.disabled = !list().length || (s.svc && !s.svc.disponible) || usage().left <= 0;
    }
    async function render() {
      el.innerHTML = `<div class="ai-wiz">${stepper()}<div class="ai-stage">${({ photo: stepPhoto, scan: stepScan, error: stepError, review: stepReview, done: stepDone })[s.step]()}</div>
        ${s.step === 'photo' || s.step === 'scan' ? `<p class="ai-disclaimer">${MF.icon('shield', 'sm')} Las fotos se envían al servidor de ModaFlow, que las analiza con Claude (Anthropic). La IA no inventa precios, costos ni tallas: esos datos los confirma usted.</p>` : ''}</div>`;
      bind();
      if (s.step === 'photo') {
        const st = (s.svc = await status());
        const box = el.querySelector('#aiSvc');
        const u = usage();
        if (box && !st.disponible) box.innerHTML = `<div class="ai-note bad">${MF.icon('alert', 'sm')}<span><b>IA no disponible.</b> ${esc(st.mensaje)} Puede registrar la prenda sin IA.</span></div>`;
        else if (box && u.left <= 0) box.innerHTML = `<div class="ai-note warn">${MF.icon('alert', 'sm')}<span>Usó los ${u.limit} análisis con IA ${u.total ? 'de la prueba' : 'de este mes'}. Registre sin IA (no consume créditos) o cambie de plan.</span></div>`;
        else if (box) box.innerHTML = `<div class="ai-note ok">${MF.icon('sparkles', 'sm')}<span>Conectado a Claude · <code>${esc(st.modelo)}</code> · ${u.left} de ${u.limit} análisis ${u.total ? 'disponibles en la prueba' : 'disponibles este mes'}.</span></div>`;
        syncGo();
      }
    }
    function stepPhoto() {
      return `<div id="aiSvc"></div><p class="ai-lead">Fotografíe la prenda: <b>frente</b>, <b>espalda</b> y su <b>etiqueta</b>. Con una sola foto también funciona.</p>
        <div id="aiSlots"></div>
        <div class="ai-go-row"><button class="btn grad lg" id="aiGo" disabled>${goLabel()}</button>
          <button class="btn ghost lg" id="aiManual" type="button">${MF.icon('edit', 'sm')} Completar sin IA</button></div>
        <p class="ai-tip">${MF.icon('info', 'sm')}<span>Todas las fotos de una prenda cuentan como <b>1 análisis</b>. "Completar sin IA" no consume créditos.</span></p>
        ${opts.samples === false ? '' : `<div class="ai-try"><span>¿No tiene fotos a mano? Pruebe con una foto real de MioShop:</span>
        <div class="ai-samples">${SAMPLES.map((x) => `<button type="button" class="ai-sample" data-sample="${x.photo}" aria-label="Usar foto de ejemplo"><img src="${x.photo}" alt="Foto de ejemplo de MioShop" loading="lazy"></button>`).join('')}</div></div>`}`;
    }
    function stepScan() {
      const l = list();
      return `<div class="ai-scan-wrap"><div><div class="ai-scan"><img src="${esc(l[0].src)}" alt="Foto en análisis"><span class="scan-line"></span><span class="scan-grid"></span></div>
        ${l.length > 1 ? `<div class="ai-scan-thumbs">${l.map((x) => `<span><img src="${esc(x.src)}" alt=""><small>${VIEW_LABEL[x.view]}</small></span>`).join('')}</div>` : ''}</div>
        <div class="ai-working" role="status" aria-live="polite"><span class="ai-spinner"></span><b>Identificando tu prenda con inteligencia artificial...</b><small>Claude está revisando ${l.length > 1 ? `las ${l.length} fotos (${l.map((x) => VIEW_LABEL[x.view].toLowerCase()).join(', ')})` : 'la foto'}: tipo de prenda, colores, estilo y detalles visibles${s.shots.etiqueta ? ', y leyendo la etiqueta' : ''}. Suele tardar unos segundos.</small></div></div>`;
    }
    function stepError() {
      return `<div class="ai-preview">${gallery(list())}<div>
        <div class="ai-note bad">${MF.icon('alert', 'sm')}<span><b>No se pudo completar el análisis.</b> ${esc(s.error.message)}</span></div>
        <p class="muted" style="font-size:.84rem">No se descontó ningún crédito.</p>
        <div class="actions start">${['creditos', 'clave', 'servidor'].includes(s.error.code) ? '' : `<button class="btn primary" id="aiGo">${MF.icon('refresh', 'sm')} Reintentar</button>`}<button class="btn ghost" data-back>${MF.icon('camera', 'sm')} Cambiar fotos</button><button class="btn ghost" data-manual>Completar sin IA</button></div></div></div>`;
    }
    function stepReview() {
      const r = s.data ? s.data.result : null;
      const p = r ? toProduct(r) : { color: '', tags: [] };
      const cats = MF.get().categories;
      const views = s.data ? s.data.views || [] : [];
      const head = r ? `<div class="ai-meta">${MF.icon('sparkles', 'sm')} Análisis con <code>${esc(s.data.model)}</code> · ${costLine(s.data)}</div>`
        : `<div class="ai-meta">${MF.icon('edit', 'sm')} Registro manual · no consume créditos de IA</div>`;
      if (r && !r.es_prenda) {
        return `${head}<div class="ai-preview">${gallery(list())}<div>${notices(r, views)}
          <div class="actions start"><button class="btn ghost" data-back>${MF.icon('camera', 'sm')} Cambiar fotos</button><button class="btn ghost" id="aiAgain">${MF.icon('refresh', 'sm')} Volver a analizar</button><button class="btn ghost" data-manual>Completar sin IA</button></div></div></div>`;
      }
      const filled = (v) => (r && v ? 'ai-filled' : '');
      const hasLabel = r && (views.includes('etiqueta') || (r.etiqueta && r.etiqueta.legible));
      return `${head}<div class="ai-review">
        <div class="ai-photo">${gallery(list(), r ? `<span class="ai-conf ${r.confianza === 'alta' ? 'hi' : 'lo'}">${MF.icon('sparkles', 'sm')} Confianza ${esc(r.confianza)}</span>` : '')}
          ${r ? `<div class="ai-attrs">${r.caracteristicas.map((a) => `<span class="chip">${esc(a)}</span>`).join('')}</div>
          <button type="button" class="btn ghost sm block" id="aiAgain" style="margin-top:10px">${MF.icon('refresh', 'sm')} Volver a analizar</button>` : ''}
          <button type="button" class="btn ghost sm block" data-back style="margin-top:8px">${MF.icon('camera', 'sm')} ${list().length ? 'Cambiar fotos' : 'Agregar fotos'}</button></div>
        <form class="ai-form form-grid" autocomplete="off">
          ${r ? `<div class="full">${notices(r, views)}<p class="ai-hint">${MF.icon('sparkles', 'sm')} Datos sugeridos por la IA${views.length > 1 ? ` a partir de ${photoWord(views.length)}` : ''}. Revíselos y edite lo que haga falta.</p></div>` : ''}
          <label class="full">${lab('Nombre de la prenda', r, 'nombre')} <input name="name" value="${esc(p.name || '')}" required placeholder="Ej. Blusa roja de seda" class="${filled(p.name)}"></label>
          <label class="full">${lab('Descripción breve', r, 'corta')} <input name="descShort" value="${esc(p.descShort || '')}" placeholder="Una frase para el catálogo" class="${filled(p.descShort)}"></label>
          <label>${lab('Tipo de prenda', r, 'tipo')} <input name="garmentType" value="${esc(p.garmentType || '')}" placeholder="Ej. blusa manga larga" class="${filled(p.garmentType)}"></label>
          <label>${lab('Categoría', r, 'categoria')} <select name="category" required class="${filled(p.category)}"><option value="">Elegir…</option>${cats.map((c) => `<option ${c === p.category ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
          <label class="full">${lab('Color principal', r, 'color_principal')} <select name="color" required class="${filled(p.color)}"><option value="">Elegir…</option>${Object.keys(MF.COLORS).map((c) => `<option ${c === p.color ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
          <div class="full"><span class="lbl">Talla y cantidad disponible <em class="need">Confirme la talla</em></span><div id="veHost"></div></div>
          <label>Precio de venta (Bs) <input name="price" type="number" inputmode="numeric" min="1" step="1" placeholder="Ej. 120" required></label>
          <label>Precio de compra (Bs) <input name="cost" type="number" inputmode="numeric" min="0" step="1" placeholder="Opcional"></label>
          <label class="full">Etiquetas para búsqueda <input name="tags" value="${esc(join(p.tags))}" placeholder="Ej. blusa, roja, fiesta" class="${filled(p.tags && p.tags.length)}"></label>
          <details class="full ai-details" ${r ? '' : ''}><summary>Más detalles (descripción, estilo, características)</summary><div class="form-grid" style="margin-top:10px">
            <label class="full">${lab('Descripción detallada', r, 'detallada')} <textarea name="desc" rows="3" class="${filled(p.desc)}">${esc(p.desc || '')}</textarea></label>
            <label>${lab('Estilo', r, 'estilo')} <input name="style" value="${esc(p.style || '')}" placeholder="Ej. casual, elegante" class="${filled(p.style)}"></label>
            <label>${lab('Público', r, 'publico')} <select name="audience"><option value="">Sin indicar</option>${AUDIENCES.map((a) => `<option ${a === p.audience ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
            <label class="full">${lab('Colores secundarios', r, 'secundario')} <input name="secondaryColors" value="${esc(join(p.secondaryColors))}" placeholder="Separados por coma"></label>
            <label class="full">${lab('Características visibles', r, 'caracter')} <input name="features" value="${esc(join(p.features))}" placeholder="Ej. cuello mao, botones metálicos" class="${filled(p.features && p.features.length)}"></label></div></details>
          ${hasLabel ? `<div class="full ai-label-head"><b>${MF.icon('tag', 'sm')} Datos de la etiqueta</b>${r.etiqueta && r.etiqueta.legible ? '<small>Leídos en la foto de la etiqueta. Verifíquelos.</small>' : '<small>No se pudieron leer: complételos si los conoce.</small>'}</div>${labelFields(p, r)}`
            : `<details class="full ai-details"><summary>Datos de la etiqueta (marca, composición, país y cuidados)</summary><div class="form-grid" style="margin-top:10px">${labelFields(p, r)}</div></details>`}
          ${opts.catalog === false ? '' : `<label class="switch full"><input type="checkbox" name="published" ${MF.can('catalogo') ? 'checked' : 'disabled'}><span></span> Publicar en el catálogo online${MF.can('catalogo') ? '' : ` <small class="muted">(${esc(MF.demo ? MF.demo.fromPlan('catalogo') : 'plan Pro')})</small>`}</label>`}
          <p class="full muted reg-date">${MF.icon('clock', 'sm')} Fecha y hora de registro: se guardan automáticamente al guardar.</p>
          <div class="full actions sticky-actions"><button class="btn primary lg block">${MF.icon('check', 'sm')} Guardar producto</button></div>
        </form></div>`;
    }
    function stepDone() {
      const p = s.saved;
      return `<div class="ai-done"><div class="ok-badge">${MF.icon('checkCircle')}</div><h4>¡"${esc(p.name)}" quedó registrado!</h4>
        <p>${MF.stock(p, 'b1')} ${MF.stock(p, 'b1') === 1 ? 'unidad' : 'unidades'} en inventario · ${MF.money(p.price)} · ${photoWord((p.photos || []).length)} · ${MF.fdate(p.createdAt, true)}</p>
        <div class="actions center"><button class="btn grad" data-restart>${MF.icon('camera', 'sm')} Registrar otra prenda</button>${opts.doneActions ? opts.doneActions(p) : ''}</div></div>`;
    }

    async function run() {
      s.step = 'scan'; s.manual = false; render();
      try { s.data = await analyze(s.shots); s.step = 'review'; }
      catch (e) { s.error = e; s.step = 'error'; }
      render();
      if (opts.onUsage) opts.onUsage();
    }
    function manual() { s.manual = true; s.data = null; s.step = 'review'; render(); }
    function bind() {
      const slots = el.querySelector('#aiSlots');
      let ctl = null;
      if (slots) ctl = photoSlots(slots, { shots: s.shots, compact: opts.compact, onChange: syncGo });
      el.querySelectorAll('[data-sample]').forEach((b) => b.addEventListener('click', async () => {
        try { ctl.set('frente', (await toPayload(b.dataset.sample)).dataUrl); MF.toast('Foto de ejemplo colocada como frente'); } catch (e) { MF.toast(e.message, 'error'); }
      }));
      bindGallery(el);
      const go = el.querySelector('#aiGo'); if (go) go.addEventListener('click', run);
      const again = el.querySelector('#aiAgain'); if (again) again.addEventListener('click', run);
      const man = el.querySelector('#aiManual'); if (man) man.addEventListener('click', manual);
      el.querySelectorAll('[data-manual]').forEach((b) => b.addEventListener('click', manual));
      el.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => { s.step = 'photo'; s.data = null; s.manual = false; render(); }));
      el.querySelectorAll('[data-restart]').forEach((b) => b.addEventListener('click', () => { s.step = 'photo'; s.shots = { frente: null, espalda: null, etiqueta: null }; s.data = null; s.manual = false; render(); }));
      const form = el.querySelector('.ai-form');
      if (!form) return;
      const r = s.data && s.data.result;
      let lastColor = form.color.value;
      ve = variantEditor(el.querySelector('#veHost'), { color: () => form.color.value || 'Negro', suggested: r && r.etiqueta && r.etiqueta.legible ? r.etiqueta.talla : '' });
      form.color.addEventListener('change', () => { ve.setColor(lastColor || null, form.color.value); lastColor = form.color.value; });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = new FormData(form);
        if (MF.readOnly()) { MF.toast(MF.READ_ONLY_MSG, 'error'); return; }
        if (!MF.canAddProduct()) { MF.toast(`Llegó al límite de ${MF.num(MF.plan().limits.products)} productos del plan ${MF.plan().name}.`, 'error'); return; }
        const variants = ve.rows().filter((v) => v.qty > 0);
        if (!variants.length) { MF.toast('Elija al menos una talla con cantidad (o "Prenda única")', 'error'); el.querySelector('#veHost').scrollIntoView({ block: 'center' }); return; }
        const photos = await savePhotos(s.shots); // versiones livianas para guardar en el navegador
        const det = readDetails(f);
        s.saved = addProduct(Object.assign(det, {
          name: f.get('name').trim(), category: f.get('category'), color: f.get('color'), description: (f.get('desc') || '').trim() || det.descShort,
          price: f.get('price'), cost: f.get('cost') || 0, published: f.get('published') === 'on', photo: photos[0] ? photos[0].src : null, photos,
          variants, source: s.data ? 'ia' : 'manual',
          aiMeta: s.data ? { model: s.data.model, confianza: s.data.result.confianza, fotos: photos.length, vistas: s.data.views, fecha: new Date().toISOString() } : null
        }));
        s.step = 'done'; render();
        if (opts.onSaved) opts.onSaved(s.saved);
      });
    }
    render();
    return { reset() { s.step = 'photo'; render(); }, manual };
  }

  MF.AI = { SAMPLES, SIZES, VIEWS, status, toPayload, readFile, analyze, usage, usagePanel, historyTable, costLine, detailFields, labelFields, readDetails, fill, notices, toProduct, addProduct, wizard, photoSlots, shotList, shotsOf, savePhotos, gallery, bindGallery, variantEditor };
})(window);
