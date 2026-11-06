/*
 * CorePoints · database.js
 * Almacén de imágenes en IndexedDB (boletas, capturas de chat e imágenes de recompensas)
 * con validación y compresión en el navegador.
 */
(function () {
  'use strict';
  const CP = (window.CP = window.CP || {});

  const DB_NAME = 'corepoints-images';
  const STORE = 'images';
  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_DIM = 1800;          // lado máximo tras comprimir
  const COMPRESS_OVER = 700 * 1024; // se comprime si pesa más que esto o excede MAX_DIM

  let dbPromise = null;
  const urlCache = new Map();

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('Este navegador no soporta IndexedDB.'));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('No se pudo abrir IndexedDB.'));
      req.onblocked = () => reject(new Error('IndexedDB está bloqueado por otra pestaña.'));
    });
    return dbPromise;
  }

  function run(mode, fn) {
    return open().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      let result;
      const req = fn(store);
      if (req) req.onsuccess = () => { result = req.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Operación cancelada.'));
    }));
  }

  function loadBitmap(blob) {
    if (window.createImageBitmap) return createImageBitmap(blob);
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('La imagen está dañada o no se puede leer.')); };
      img.src = url;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  }

  CP.images = {
    ALLOWED,
    open,

    /** Valida tipo y tamaño. Devuelve un mensaje de error o ''. */
    validate(file, maxMB) {
      if (!file) return 'No se seleccionó ningún archivo.';
      if (!ALLOWED.includes(file.type)) return 'Formato no permitido (' + (file.type || 'desconocido') + '). Use JPG, PNG o WEBP.';
      const max = (Number(maxMB) || 8) * 1024 * 1024;
      if (file.size > max) return 'La imagen pesa ' + (file.size / 1048576).toFixed(1) + ' MB. El máximo es ' + maxMB + ' MB.';
      if (file.size < 200) return 'El archivo está vacío o dañado.';
      return '';
    },

    /**
     * Redimensiona y recomprime cuando conviene. Devuelve { blob, width, height, compressed, originalSize }.
     * Las fotos de celular (4000 px, 3–6 MB) quedan en ~300–600 KB sin perder legibilidad.
     */
    async compress(file) {
      const bmp = await loadBitmap(file);
      const w0 = bmp.width, h0 = bmp.height;
      const scale = Math.min(1, MAX_DIM / Math.max(w0, h0));
      if (scale === 1 && file.size <= COMPRESS_OVER) {
        if (bmp.close) bmp.close();
        return { blob: file, width: w0, height: h0, compressed: false, originalSize: file.size };
      }
      const w = Math.round(w0 * scale), h = Math.round(h0 * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      const outType = file.type === 'image/png' ? 'image/jpeg' : file.type; // PNG de foto → JPG
      if (outType === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bmp, 0, 0, w, h);
      if (bmp.close) bmp.close();
      let blob = await canvasToBlob(canvas, outType, 0.84);
      if (!blob) blob = await canvasToBlob(canvas, 'image/jpeg', 0.84);
      if (!blob || blob.size >= file.size) return { blob: file, width: w0, height: h0, compressed: false, originalSize: file.size };
      return { blob, width: w, height: h, compressed: true, originalSize: file.size };
    },

    /** Guarda un blob y devuelve su id. */
    async put(blob, meta) {
      const id = (meta && meta.id) || CP.util.uid('IMG', 12);
      const rec = Object.assign({ id, blob, type: blob.type, size: blob.size, createdAt: new Date().toISOString() }, meta || {}, { id, blob });
      await run('readwrite', (s) => s.put(rec));
      return id;
    },

    /** Valida, comprime y guarda un archivo elegido por el usuario. */
    async saveFile(file, opts) {
      opts = opts || {};
      const err = this.validate(file, opts.maxMB);
      if (err) throw new CP.BizError(err);
      const c = await this.compress(file);
      const name = String(file.name || 'imagen').replace(/\.[a-z0-9]+$/i, '') + (c.blob.type === 'image/webp' ? '.webp' : c.blob.type === 'image/png' ? '.png' : '.jpg');
      const id = await this.put(c.blob, { name, width: c.width, height: c.height, originalSize: c.originalSize, compressed: c.compressed, kind: opts.kind || 'otro' });
      return { id, name, size: c.blob.size, width: c.width, height: c.height, compressed: c.compressed, originalSize: c.originalSize };
    },

    get(id) { return id ? run('readonly', (s) => s.get(id)) : Promise.resolve(undefined); },

    /** URL de objeto (en caché) para mostrar la imagen; null si no existe. */
    async url(id) {
      if (!id) return null;
      if (urlCache.has(id)) return urlCache.get(id);
      const rec = await this.get(id);
      if (!rec || !rec.blob) return null;
      const url = URL.createObjectURL(rec.blob);
      urlCache.set(id, url);
      return url;
    },

    async remove(id) {
      if (!id) return;
      if (urlCache.has(id)) { URL.revokeObjectURL(urlCache.get(id)); urlCache.delete(id); }
      await run('readwrite', (s) => s.delete(id));
    },

    async clear() {
      urlCache.forEach((url) => URL.revokeObjectURL(url));
      urlCache.clear();
      await run('readwrite', (s) => s.clear());
    },

    /** Resumen de uso: { count, bytes }. */
    async stats() {
      const all = await run('readonly', (s) => s.getAll());
      return { count: (all || []).length, bytes: (all || []).reduce((a, r) => a + (r.size || 0), 0), ids: (all || []).map((r) => r.id) };
    },

    /** Descarga la imagen con su nombre de archivo. */
    async download(id, filename) {
      const rec = await this.get(id);
      if (!rec) throw new CP.BizError('La imagen ya no está disponible en este navegador.');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(rec.blob);
      a.download = filename || rec.name || id + '.jpg';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }
  };
})();
