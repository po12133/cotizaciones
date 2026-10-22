/*
 * Persistencia de demostración en localStorage (con espacio de nombres y tolerancia a errores).
 * Si el navegador bloquea el almacenamiento, los datos viven solo en memoria durante la sesión.
 */
(function (root) {
  const NS = 'wab:';
  const memory = {};
  let available = true;
  try {
    const k = NS + '__test';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
  } catch (e) {
    available = false;
  }

  const storage = {
    available,
    get(key, fallback = null) {
      try {
        const raw = available ? localStorage.getItem(NS + key) : memory[key];
        if (raw === null || raw === undefined) return clone(fallback);
        return JSON.parse(raw);
      } catch (e) {
        return clone(fallback);
      }
    },
    set(key, value) {
      const raw = JSON.stringify(value);
      try {
        if (available) localStorage.setItem(NS + key, raw);
        else memory[key] = raw;
        return true;
      } catch (e) {
        memory[key] = raw;
        return false;
      }
    },
    remove(key) {
      try { if (available) localStorage.removeItem(NS + key); } catch (e) { /* sin acceso */ }
      delete memory[key];
    },
    keys() {
      try {
        if (!available) return Object.keys(memory);
        return Object.keys(localStorage).filter((k) => k.startsWith(NS)).map((k) => k.slice(NS.length));
      } catch (e) {
        return Object.keys(memory);
      }
    },
    /** Notifica cambios hechos desde otra pestaña. */
    onExternalChange(key, cb) {
      window.addEventListener('storage', (ev) => {
        if (ev.key === NS + key) cb(storage.get(key));
      });
    }
  };

  function clone(v) {
    return v === null || v === undefined ? v : JSON.parse(JSON.stringify(v));
  }

  root.WAB = root.WAB || {};
  root.WAB.storage = storage;
})(window);
