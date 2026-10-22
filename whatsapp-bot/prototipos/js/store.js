/*
 * Base de datos de demostración sobre localStorage.
 * Todos los prototipos leen y escriben aquí, por eso los cambios de un módulo
 * se reflejan en los demás (también entre pestañas abiertas).
 */
(function (root) {
  const WAB = root.WAB;
  const KEY = 'demo-db';
  const VERSION = 4;
  const listeners = [];
  let data = null;

  function load() {
    const saved = WAB.storage.get(KEY);
    if (saved && saved.version === VERSION) return saved;
    const fresh = WAB.seed();
    WAB.storage.set(KEY, fresh);
    return fresh;
  }

  function emit(col, source) {
    listeners.forEach((l) => { if (!l.col || l.col === col || col === '*') l.cb(data[l.col] !== undefined ? data[l.col] : data, source); });
  }

  const db = {
    get all() { if (!data) data = load(); return data; },
    get(col) { return db.all[col]; },
    set(col, value) {
      db.all[col] = value;
      WAB.storage.set(KEY, data);
      emit(col, 'local');
    },
    /** Modifica una colección con una función y guarda. */
    update(col, fn) {
      const cur = db.get(col);
      const res = fn(cur);
      db.set(col, res === undefined ? cur : res);
      return db.get(col);
    },
    find(col, id) { return (db.get(col) || []).find((x) => x.id === id); },
    upsert(col, item) {
      return db.update(col, (arr) => {
        const i = arr.findIndex((x) => x.id === item.id);
        if (i >= 0) arr[i] = Object.assign({}, arr[i], item); else arr.unshift(item);
        return arr;
      });
    },
    remove(col, id) { return db.update(col, (arr) => arr.filter((x) => x.id !== id)); },
    reset() {
      data = WAB.seed();
      WAB.storage.set(KEY, data);
      emit('*', 'local');
    },
    export() { return JSON.stringify(db.all, null, 2); },
    import(json) {
      const obj = typeof json === 'string' ? JSON.parse(json) : json;
      if (!obj || obj.version !== VERSION || !Array.isArray(obj.contacts)) throw new Error('El archivo no corresponde a los datos de esta demostración.');
      data = obj;
      WAB.storage.set(KEY, data);
      emit('*', 'local');
    },
    on(col, cb) { listeners.push({ col, cb }); },
    // Helpers frecuentes
    contact(id) { return db.find('contacts', id); },
    product(id) { return db.find('products', id); },
    service(id) { return db.find('services', id); },
    agent(id) { return db.find('agents', id); },
    category(id) { return db.find('categories', id); },
    price(p) { return Math.round(p.precio * (1 - (p.promo || 0) / 100) * 100) / 100; },
    img(p) { return WAB.productImage(p, db.get('categories')); }
  };

  // Cambios hechos en otra pestaña
  WAB.storage.onExternalChange(KEY, (v) => {
    if (!v) return;
    data = v;
    emit('*', 'external');
  });

  WAB.db = db;

  // Etiquetas y colores de estados (compartidos por las páginas)
  WAB.STATUS = {
    conv: { bot: ['Bot', 'accent'], pendiente: ['Esperando asesor', 'warn'], humano: ['Asesor', 'info'], cerrada: ['Cerrada', ''] },
    cita: { pendiente: ['Pendiente', 'warn'], confirmada: ['Confirmada', 'ok'], completada: ['Completada', 'info'], cancelada: ['Cancelada', 'danger'], no_asistio: ['No asistió', 'danger'] },
    pedido: { nuevo: ['Nuevo', 'accent'], pago_revision: ['Pago en revisión', 'warn'], pagado: ['Pagado', 'ok'], preparando: ['Preparando', 'info'], enviado: ['En camino', 'info'], listo_retiro: ['Listo para retiro', 'info'], entregado: ['Entregado', 'ok'], cancelado: ['Cancelado', 'danger'] },
    pago: { pendiente: ['Pendiente', 'warn'], en_revision: ['En revisión', 'warn'], aprobado: ['Aprobado', 'ok'], rechazado: ['Rechazado', 'danger'] },
    contacto: { prospecto: ['Prospecto', 'accent'], calificado: ['Calificado', 'info'], cliente: ['Cliente', 'ok'], inactivo: ['Inactivo', ''] },
    campana: { borrador: ['Borrador', ''], programada: ['Programada', 'info'], enviando: ['Enviando', 'warn'], enviada: ['Enviada', 'ok'] }
  };
  WAB.badge = (group, key) => {
    const s = (WAB.STATUS[group] || {})[key] || [key, ''];
    return `<span class="badge ${s[1]}"><span class="dot"></span>${WAB.ui.esc(s[0])}</span>`;
  };
})(window);
