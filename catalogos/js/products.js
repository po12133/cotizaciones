/*
 * Productos: mapeo de columnas de Google Sheets, sincronización (simulada) y validación.
 * Los productos se reconstruyen a partir de la hoja + mapeo + carpeta de Drive.
 * Editar un producto en el panel modifica la fila de la hoja simulada y vuelve a sincronizar.
 */
(function () {
  'use strict';
  const CA = (window.CA = window.CA || {});
  const u = CA.util;

  const FIELDS = [
    { key: 'sku', label: 'ID o SKU', required: true, hints: ['sku', 'codigo', 'código', 'ref', 'id', 'cod'] },
    { key: 'name', label: 'Nombre del producto', required: true, hints: ['producto', 'nombre', 'descripcion corta', 'item', 'articulo', 'descripción'] },
    { key: 'description', label: 'Descripción', hints: ['detalle', 'descripcion', 'descripción', 'caracteristicas'] },
    { key: 'price', label: 'Precio', required: true, hints: ['precio bs', 'precio', 'precio unitario', 'pvp'] },
    { key: 'offer', label: 'Precio de oferta', hints: ['oferta', 'precio oferta', 'promo', 'descuento'] },
    { key: 'category', label: 'Categoría', hints: ['categoria', 'categoría', 'rubro', 'linea', 'familia'] },
    { key: 'brand', label: 'Marca', hints: ['marca', 'fabricante'] },
    { key: 'availability', label: 'Disponibilidad', hints: ['stock', 'disponible', 'disponibilidad', 'estado'] },
    { key: 'image', label: 'Imagen principal', hints: ['foto', 'imagen', 'image', 'img'] },
    { key: 'gallery', label: 'Galería de imágenes', hints: ['fotos extra', 'galeria', 'galería', 'imagenes', 'fotos'] }
  ];
  const AVAIL = {
    available: { label: 'Disponible', tone: 'ok' },
    low: { label: 'Pocas unidades', tone: 'warn' },
    order: { label: 'Por pedido', tone: 'info' },
    out: { label: 'Agotado', tone: 'bad' }
  };
  const P = (CA.products = { FIELDS, AVAIL });

  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

  P.sheet = (db, id) => db.sheets.find((s) => s.id === id) || null;
  P.tab = (db, sheetId, tabName) => { const s = P.sheet(db, sheetId); return s ? s.tabs.find((t) => t.name === tabName) || null : null; };
  P.folder = (db, id) => db.drive.find((f) => f.id === id) || null;

  /** Sugiere el mapeo según los nombres de las columnas. */
  P.autoMap = function (headers) {
    const used = new Set();
    const map = {};
    const nh = headers.map(norm);
    FIELDS.forEach((f) => {
      let idx = -1;
      for (const h of f.hints) { idx = nh.findIndex((x, i) => !used.has(i) && x === norm(h)); if (idx >= 0) break; }
      if (idx < 0) for (const h of f.hints) { idx = nh.findIndex((x, i) => !used.has(i) && x.includes(norm(h))); if (idx >= 0) break; }
      if (idx >= 0) { map[f.key] = headers[idx]; used.add(idx); } else map[f.key] = '';
    });
    const attributes = headers.filter((h, i) => !used.has(i));
    return { fields: map, attributes, filters: attributes.slice(0, 2).concat(map.brand ? ['__brand'] : []) };
  };

  P.parseAvailability = function (v) {
    const s = norm(v);
    if (!s) return 'available';
    if (/^\d+(\.\d+)?$/.test(s)) return Number(s) > 5 ? 'available' : Number(s) > 0 ? 'low' : 'out';
    if (s.includes('agot') || s === 'no' || s.includes('sin stock')) return 'out';
    if (s.includes('poca') || s.includes('ultim') || s.includes('bajo')) return 'low';
    if (s.includes('pedido') || s.includes('encargo')) return 'order';
    return 'available';
  };
  const parsePrice = (v) => { const n = Number(String(v || '').replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')); return isFinite(n) && String(v).trim() !== '' ? n : null; };

  /**
   * Construye los productos desde la fuente. Devuelve { products, issues, stats }.
   * - error: falta SKU, nombre o precio, o SKU duplicado → no se publica.
   * - warning: imagen no encontrada en Drive → se usa la imagen de respaldo.
   */
  P.build = function (db, ws) {
    const sh = ws.integrations.sheets, dr = ws.integrations.drive;
    const tab = sh.connected ? P.tab(db, sh.sheetId, sh.tab) : null;
    if (!tab) return { products: [], issues: [], stats: { rows: 0, ok: 0, warnings: 0, errors: 0 } };
    const m = ws.mapping || { fields: {}, attributes: [] };
    const col = (name) => (name ? tab.headers.indexOf(name) : -1);
    const get = (row, key) => { const i = col(m.fields[key]); return i >= 0 ? String(row[i] == null ? '' : row[i]).trim() : ''; };
    const folder = dr.connected ? P.folder(db, dr.folderId) : null;
    const fileIndex = {};
    (folder && folder.files ? folder.files : []).forEach((f) => { fileIndex[norm(f.name)] = f.art; });
    const findImg = (name) => {
      if (!name) return null;
      if (/^(https?:|data:|art:)/.test(name)) return name;
      return fileIndex[norm(name)] || null;
    };
    const seen = {};
    const issues = [];
    const products = tab.rows.map((row, i) => {
      const rowNo = i + 2; // fila 1 = encabezados
      const sku = get(row, 'sku');
      const name = get(row, 'name');
      const price = parsePrice(get(row, 'price'));
      const offer = parsePrice(get(row, 'offer'));
      const pIssues = [];
      const add = (type, level, msg) => { pIssues.push({ type, level, msg }); issues.push({ row: rowNo, sku, name, type, level, msg }); };
      if (!sku) add('missing', 'error', 'Falta el SKU');
      else if (seen[norm(sku)]) add('duplicate', 'error', 'SKU duplicado (también en la fila ' + seen[norm(sku)] + ')');
      if (sku && !seen[norm(sku)]) seen[norm(sku)] = rowNo;
      if (!name) add('missing', 'error', 'Falta el nombre');
      if (price == null) add('missing', 'error', 'Falta el precio');
      const imgName = get(row, 'image');
      let image = findImg(imgName);
      if (imgName && !image) add('image', 'warning', dr.connected ? 'Imagen "' + imgName + '" no encontrada en Drive' : 'Drive no conectado: no se pueden cargar imágenes');
      if (!imgName && m.fields.image) add('image', 'warning', 'Sin imagen asignada');
      const gallery = get(row, 'gallery').split(/[,;|]/).map((s) => s.trim()).filter(Boolean).map(findImg).filter(Boolean);
      const attributes = {};
      (m.attributes || []).forEach((a) => { const k = col(a); if (k >= 0 && String(row[k] || '').trim()) attributes[a] = String(row[k]).trim(); });
      const level = pIssues.some((x) => x.level === 'error') ? 'error' : pIssues.length ? 'warning' : 'ok';
      return {
        id: u.slug(sku || 'fila-' + rowNo) + (pIssues.some((x) => x.type === 'duplicate') ? '-' + rowNo : ''),
        row: rowNo, sku, name, description: get(row, 'description'),
        price: price == null ? 0 : price,
        offer: offer != null && price != null && offer > 0 && offer < price ? offer : null,
        category: get(row, 'category') || 'Sin categoría',
        brand: get(row, 'brand'),
        availability: m.fields.availability ? P.parseAvailability(get(row, 'availability')) : 'available',
        image: image || null,
        gallery: [image].concat(gallery).filter(Boolean).filter((x, k, a) => a.indexOf(x) === k),
        attributes, sync: level, issues: pIssues
      };
    });
    const stats = { rows: products.length, ok: products.filter((p) => p.sync === 'ok').length, warnings: products.filter((p) => p.sync === 'warning').length, errors: products.filter((p) => p.sync === 'error').length };
    return { products, issues, stats };
  };

  /** Sincroniza: reconstruye los productos y registra el resultado. */
  P.sync = function (db, userId, opts) {
    opts = opts || {};
    const ws = db.workspaces[userId];
    const before = {};
    (ws.products || []).forEach((p) => { before[p.id] = JSON.stringify([p.name, p.price, p.offer, p.availability, p.category, p.description, p.image]); });
    const res = P.build(db, ws);
    let added = 0, updated = 0;
    res.products.forEach((p) => {
      if (!(p.id in before)) added++;
      else if (before[p.id] !== JSON.stringify([p.name, p.price, p.offer, p.availability, p.category, p.description, p.image])) updated++;
    });
    const removed = Object.keys(before).filter((id) => !res.products.some((p) => p.id === id)).length;
    ws.products = res.products;
    const now = CA.now().toISOString();
    ws.integrations.sheets.lastSync = now;
    const log = { at: now, mode: opts.mode || 'manual', rows: res.stats.rows, added, updated, removed, warnings: res.stats.warnings, errors: res.stats.errors };
    ws.integrations.sheets.syncLog = [log].concat(ws.integrations.sheets.syncLog || []).slice(0, 15);
    return Object.assign({ log }, res);
  };

  /** Productos publicables (sin errores), respetando el límite de productos del plan. */
  P.publishable = function (db, user) {
    const ws = db.workspaces[user.id];
    const limit = CA.plans.effectiveLimits(user, db).products;
    const valid = (ws.products || []).filter((p) => p.sync !== 'error');
    return { list: valid.slice(0, limit), hidden: Math.max(0, valid.length - limit), limit, total: valid.length };
  };

  P.categories = (products) => Array.from(new Set(products.map((p) => p.category))).sort((a, b) => a.localeCompare(b));

  /**
   * Edita un producto: cambia las celdas de la fila en la hoja simulada y vuelve a sincronizar.
   * Solo se editan campos que tienen una columna mapeada.
   */
  P.update = function (db, userId, productId, data) {
    const ws = db.workspaces[userId];
    const p = (ws.products || []).find((x) => x.id === productId);
    if (!p) throw new CA.BizError('Producto no encontrado.');
    const tab = P.tab(db, ws.integrations.sheets.sheetId, ws.integrations.sheets.tab);
    const row = tab.rows[p.row - 2];
    const m = ws.mapping.fields;
    if (data.name != null && !String(data.name).trim()) throw new CA.BizError('El nombre no puede quedar vacío.', 'name');
    if (data.price != null && !(Number(data.price) > 0)) throw new CA.BizError('Ingrese un precio mayor a cero.', 'price');
    if (data.offer && Number(data.offer) >= Number(data.price != null ? data.price : p.price)) throw new CA.BizError('La oferta debe ser menor al precio.', 'offer');
    const setCell = (key, value) => { const i = tab.headers.indexOf(m[key]); if (i >= 0) row[i] = String(value); };
    ['name', 'description', 'price', 'offer', 'category', 'brand'].forEach((k) => { if (data[k] != null) setCell(k, data[k]); });
    if (data.availability != null) setCell('availability', AVAIL[data.availability] ? AVAIL[data.availability].label : data.availability);
    const sh = CA.products.sheet(db, ws.integrations.sheets.sheetId);
    sh.modified = CA.now().toISOString();
    return P.sync(db, userId, { mode: 'edición' });
  };

  /** Columnas que se pueden usar como filtros en el catálogo (atributos + marca). */
  P.filterValues = function (products, filterKey) {
    const vals = new Set();
    products.forEach((p) => {
      const v = filterKey === '__brand' ? p.brand : p.attributes[filterKey];
      if (v) String(v).split(/,\s*/).forEach((x) => x && vals.add(x.trim()));
    });
    return Array.from(vals).sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  };
  P.filterLabel = (key) => (key === '__brand' ? 'Marca' : key);
  P.matchesFilter = function (p, key, value) {
    const v = key === '__brand' ? p.brand : p.attributes[key];
    return !!v && String(v).split(/,\s*/).map((x) => x.trim()).includes(value);
  };
})();
