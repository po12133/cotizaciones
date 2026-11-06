/*
 * CorePoints · rewards.js
 * Catálogo de recompensas, independiente del catálogo comercial de WooCommerce.
 * Imagen de cada recompensa: 'idb:<id>' (subida a IndexedDB) o 'art:<clave>' (ilustración incluida).
 */
(function () {
  'use strict';
  const CP = (window.CP = window.CP || {});
  const u = CP.util;

  const CATEGORIES = ['Periféricos', 'Audio', 'Almacenamiento', 'Accesorios', 'Servicio técnico'];
  const TYPES = { producto: 'Producto', servicio: 'Servicio' };

  /* Ilustraciones vectoriales neón para las recompensas de demostración. */
  const ART = {
    mouse: '<path d="M100 46c-22 0-38 17-38 40v34c0 24 16 42 38 42s38-18 38-42V86c0-23-16-40-38-40z"/><path d="M100 46v40M62 88h76"/><rect x="95" y="58" width="10" height="18" rx="5"/>',
    keyboard: '<rect x="34" y="70" width="132" height="62" rx="10"/><path d="M50 88h10M68 88h10M86 88h10M104 88h10M122 88h10M140 88h10M50 103h10M68 103h10M86 103h10M104 103h10M122 103h10M140 103h10M66 118h68"/>',
    headset: '<path d="M52 118v-18c0-27 21-48 48-48s48 21 48 48v18"/><rect x="44" y="110" width="22" height="38" rx="9"/><rect x="134" y="110" width="22" height="38" rx="9"/><path d="M66 140c0 12 16 16 30 16"/>',
    mousepad: '<rect x="30" y="62" width="140" height="80" rx="12"/><path d="M42 74h116v56H42z" opacity=".35"/><path d="M128 92c-9 0-15 6-15 14v8c0 8 6 14 15 14s15-6 15-14v-8c0-8-6-14-15-14z"/>',
    usb: '<rect x="70" y="40" width="60" height="34" rx="4"/><path d="M82 52h10M108 52h10"/><rect x="62" y="74" width="76" height="86" rx="14"/><circle cx="100" cy="117" r="10"/>',
    hub: '<rect x="44" y="78" width="112" height="44" rx="14"/><path d="M62 100h8M84 100h8M106 100h8M128 100h8"/><path d="M100 78V56c0-8 6-12 14-12h20"/>',
    cleaning: '<path d="M70 62h46l8 22H62z"/><rect x="66" y="84" width="54" height="76" rx="10"/><path d="M124 70l30-10M124 78l32 4M122 64l24-22"/><path d="M80 112h26M80 128h26"/>',
    tools: '<path d="M60 150l52-52"/><path d="M118 72a22 22 0 1 0 30 30l-14-2-4-14z"/><path d="M68 64l28 28M58 74l20-20 12 12-20 20z"/>',
    chip: '<rect x="66" y="66" width="68" height="68" rx="8"/><rect x="82" y="82" width="36" height="36" rx="4"/><path d="M80 52v14M100 52v14M120 52v14M80 134v14M100 134v14M120 134v14M52 80h14M52 100h14M52 120h14M134 80h14M134 100h14M134 120h14"/>',
    paste: '<rect x="84" y="40" width="32" height="20" rx="4"/><path d="M78 60h44l-6 92c0 6-4 10-10 10h-12c-6 0-10-4-10-10z"/><path d="M90 92h20M90 108h20"/>',
    webcam: '<circle cx="100" cy="90" r="40"/><circle cx="100" cy="90" r="18"/><circle cx="100" cy="90" r="6"/><path d="M76 132l-14 26h76l-14-26"/>',
    fan: '<circle cx="100" cy="100" r="58"/><circle cx="100" cy="100" r="10"/><path d="M100 90c-4-22 6-34 22-36-4 16-10 26-22 36zM110 100c22-4 34 6 36 22-16-4-26-10-36-22zM100 110c4 22-6 34-22 36 4-16 10-26 22-36zM90 100c-22 4-34-6-36-22 16 4 26 10 36 22z"/>',
    gift: '<rect x="50" y="86" width="100" height="70" rx="8"/><rect x="42" y="68" width="116" height="22" rx="6"/><path d="M100 68v88M100 68c-10-22-36-22-34-6 2 10 22 8 34 6zM100 68c10-22 36-22 34-6-2 10-22 8-34 6z"/>'
  };
  const ART_KEYS = Object.keys(ART);
  const ART_LABELS = { mouse: 'Mouse', keyboard: 'Teclado', headset: 'Audífonos', mousepad: 'Mousepad', usb: 'Memoria USB', hub: 'Hub USB', cleaning: 'Limpieza', tools: 'Herramientas', chip: 'Componente', paste: 'Pasta térmica', webcam: 'Webcam', fan: 'Ventilador', gift: 'Regalo' };
  const artCache = {};

  function artUrl(key) {
    if (artCache[key]) return artCache[key];
    const body = ART[key] || ART.gift;
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
      '<defs><radialGradient id="g" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="#26304d"/><stop offset="1" stop-color="#0d1020"/></radialGradient>' +
      '<linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00e5f0"/><stop offset="1" stop-color="#f277d7"/></linearGradient>' +
      '<filter id="f" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' +
      '<rect width="200" height="200" fill="url(#g)"/>' +
      '<g opacity=".18" stroke="#00e5f0" stroke-width=".6"><path d="M0 40h200M0 80h200M0 120h200M0 160h200M40 0v200M80 0v200M120 0v200M160 0v200"/></g>' +
      '<g fill="none" stroke="url(#s)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" filter="url(#f)">' + body + '</g></svg>';
    artCache[key] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    return artCache[key];
  }

  const R = (CP.rewards = { CATEGORIES, TYPES, ART_KEYS, ART_LABELS, artUrl });

  R.get = (db, id) => db.rewards.find((r) => r.id === id) || null;
  R.hasMovements = (db, id) => db.redemptions.some((x) => x.rewardId === id);
  R.inStock = (r) => r.stock == null || r.stock > 0;
  R.stockLabel = (r) => (r.stock == null ? (r.type === 'servicio' ? 'Servicio disponible' : 'Sin límite') : r.stock > 0 ? r.stock + (r.stock === 1 ? ' disponible' : ' disponibles') : 'Agotado');

  R.save = function (db, d, now) {
    const name = String(d.name || '').trim().replace(/\s+/g, ' ');
    if (name.length < 3) throw new CP.BizError('El nombre es obligatorio.', 'name');
    const description = String(d.description || '').trim();
    if (description.length < 10) throw new CP.BizError('Agregue una descripción (mínimo 10 caracteres).', 'description');
    if (!CATEGORIES.includes(d.category)) throw new CP.BizError('Seleccione una categoría.', 'category');
    if (!TYPES[d.type]) throw new CP.BizError('Seleccione el tipo de recompensa.', 'type');
    const cost = Math.floor(Number(d.cost));
    if (!(cost > 0)) throw new CP.BizError('El costo en CorePoints debe ser mayor a cero.', 'cost');
    let stock = d.stock === '' || d.stock == null ? null : Math.floor(Number(d.stock));
    if (stock != null && !(stock >= 0)) throw new CP.BizError('El stock debe ser 0 o mayor (vacío = sin límite).', 'stock');
    const data = {
      name, description, category: d.category, type: d.type, cost, stock,
      image: d.image || 'art:gift',
      active: d.active === true || d.active === 'true',
      conditions: String(d.conditions || '').trim(),
      featured: !!d.featured
    };
    if (d.id) {
      const r = R.get(db, d.id);
      if (!r) throw new CP.BizError('Recompensa no encontrada.');
      Object.assign(r, data, { updatedAt: (now || CP.now()).toISOString() });
      return r;
    }
    const r = Object.assign({ id: u.uid('REC', 6, (id) => db.rewards.some((x) => x.id === id)), createdAt: (now || CP.now()).toISOString() }, data);
    db.rewards.push(r);
    return r;
  };

  R.setActive = function (db, id, active) {
    const r = R.get(db, id);
    if (!r) throw new CP.BizError('Recompensa no encontrada.');
    r.active = !!active;
    return r;
  };

  /** Solo se eliminan recompensas sin canjes asociados; las demás se desactivan. */
  R.remove = function (db, id) {
    const r = R.get(db, id);
    if (!r) throw new CP.BizError('Recompensa no encontrada.');
    if (R.hasMovements(db, id)) throw new CP.BizError('"' + r.name + '" tiene canjes asociados. Desactívela en lugar de eliminarla.');
    db.rewards = db.rewards.filter((x) => x.id !== id);
    return r;
  };
})();
