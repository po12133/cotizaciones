/*
 * Panel administrativo DEMOSTRATIVO del prototipo FEDAPABENI.
 * CRUD sobre localStorage (store.js). Sin autenticación ni servidor: no simula seguridad real.
 */
(function () {
  'use strict';

  const { esc, norm, asset, fmtDate, toast, fileToDataUrl, onlyDigits } = window.FP;
  const Store = window.Store;
  const db = function () { return Store.db; };
  const main = document.getElementById('adminMain');

  const ICONS = ['package', 'sprout', 'layers', 'trees', 'leaf', 'tag', 'store', 'award', 'star', 'gauge'];
  const STATUS = { nueva: ['Nueva', 'gold'], proceso: ['En proceso', 'info'], respondida: ['Respondida', ''], archivada: ['Archivada', 'gray'] };
  const AVAIL = ['Disponible', 'Por temporada', 'Bajo pedido'];
  const POST_TYPES = { noticia: 'Noticia', evento: 'Evento', feria: 'Feria', oportunidad: 'Oportunidad comercial' };

  const orgName = function (id) { const o = db().organizations.find(function (x) { return x.id === id; }); return o ? o.acronym : '—'; };
  const catName = function (id) { const c = db().categories.find(function (x) { return x.id === id; }); return c ? c.name : '—'; };

  /* ================= esquemas CRUD ================= */
  const SCHEMAS = {
    asociaciones: {
      col: 'organizations', title: 'Asociaciones y emprendimientos', singular: 'organización', nuevo: 'Nueva', icon: 'users', idFrom: 'acronym',
      search: function (o) { return [o.acronym, o.fullName, o.municipality, o.department, o.rubros.join(' ')].join(' '); },
      filter: { key: 'type', label: 'Todos los tipos', options: function () { return ['Asociación', 'Emprendimiento']; } },
      blank: function () { return { type: 'Asociación', department: 'Beni', rubros: [], images: [], channels: [], contact: {}, featured: false, families: 0 }; },
      fields: [
        { key: 'acronym', label: 'Nombre o sigla', type: 'text', req: true, half: true },
        { key: 'fullName', label: 'Nombre completo', type: 'text', half: true, help: 'Dejar vacío si está pendiente de confirmación.' },
        { key: 'type', label: 'Tipo', type: 'select', options: ['Asociación', 'Emprendimiento'], req: true, half: true },
        { key: 'featured', label: 'Destacar en la página de inicio', type: 'checkbox', half: true },
        { key: 'municipality', label: 'Municipio / localidad', type: 'text', req: true, half: true },
        { key: 'department', label: 'Departamento', type: 'select', options: ['Beni', 'Pando', 'La Paz', 'Otro'], req: true, half: true },
        { key: 'lat', label: 'Latitud', type: 'number', req: true, min: -90, max: 90, step: 'any', half: true, help: 'Ej.: -11.0083' },
        { key: 'lng', label: 'Longitud', type: 'number', req: true, min: -180, max: 180, step: 'any', half: true, help: 'Ej.: -66.0717' },
        { key: 'rubros', label: 'Rubros', type: 'tags', req: true, help: 'Separados por comas. Ej.: Asaí, Copoazú' },
        { key: 'summary', label: 'Resumen (tarjeta)', type: 'textarea', rows: 2, req: true, max: 160 },
        { key: 'description', label: 'Descripción institucional', type: 'textarea', rows: 5 },
        { key: 'capacity', label: 'Capacidad de producción', type: 'text', half: true },
        { key: 'families', label: 'Familias asociadas', type: 'number', min: 0, step: 1, half: true },
        { key: 'channels', label: 'Canales comerciales', type: 'tags', help: 'Separados por comas.' },
        { key: 'images', label: 'Fotografías', type: 'images' },
        { group: 'Contacto' },
        { key: 'contact.person', label: 'Persona de contacto', type: 'text', half: true },
        { key: 'contact.whatsapp', label: 'WhatsApp (con código de país)', type: 'phone', half: true, help: 'Solo dígitos. Ej.: 591XXXXXXXX' },
        { key: 'contact.phone', label: 'Teléfono', type: 'text', half: true },
        { key: 'contact.email', label: 'Correo electrónico', type: 'email', half: true },
      ],
      columns: function (o) {
        const n = db().products.filter(function (p) { return p.orgId === o.id; }).length;
        return [
          ['', '<img class="thumb" src="' + asset(o.images[0]) + '" alt="">', 'c-img'],
          ['Nombre', '<b>' + esc(o.acronym) + '</b><small>' + esc(o.fullName || 'Nombre completo pendiente') + '</small>', 'name'],
          ['Tipo', '<span class="tag ' + (o.type === 'Emprendimiento' ? 'warn' : 'gold') + '">' + esc(o.type) + '</span>'],
          ['Ubicación', esc(o.municipality + ', ' + o.department)],
          ['Productos', String(n)],
          ['Destacada', o.featured ? '<span class="tag">Sí</span>' : '<span class="tag gray">No</span>'],
        ];
      },
      beforeDelete: function (o) {
        const n = db().products.filter(function (p) { return p.orgId === o.id; }).length;
        return n ? 'Esta organización tiene ' + n + ' producto(s) en el catálogo. Al eliminarla también se eliminarán esos productos.' : '';
      },
      onDelete: function (o) { db().products = db().products.filter(function (p) { return p.orgId !== o.id; }); },
      view: function (o) { return '../index.html#/asociacion/' + encodeURIComponent(o.id); },
    },

    productos: {
      col: 'products', title: 'Productos', singular: 'producto', nuevo: 'Nuevo', icon: 'package', idFrom: 'name',
      search: function (p) { return [p.name, p.description, orgName(p.orgId), catName(p.categoryId)].join(' '); },
      filter: { key: 'categoryId', label: 'Todas las categorías', options: function () { return db().categories.map(function (c) { return [c.id, c.name]; }); } },
      blank: function () { return { availability: 'Disponible', images: [], features: [], featured: false }; },
      fields: [
        { key: 'name', label: 'Nombre del producto', type: 'text', req: true },
        { key: 'categoryId', label: 'Categoría', type: 'select', req: true, half: true, options: function () { return db().categories.map(function (c) { return [c.id, c.name]; }); } },
        { key: 'orgId', label: 'Organización productora', type: 'select', req: true, half: true, options: function () { return db().organizations.map(function (o) { return [o.id, o.acronym]; }); } },
        { key: 'presentation', label: 'Presentación', type: 'text', req: true, half: true, help: 'Ej.: Bolsa de 1 kg' },
        { key: 'unit', label: 'Unidad', type: 'text', half: true },
        { key: 'availability', label: 'Disponibilidad', type: 'select', options: AVAIL, req: true, half: true },
        { key: 'minOrder', label: 'Pedido mínimo', type: 'text', half: true },
        { key: 'season', label: 'Temporada', type: 'text' },
        { key: 'description', label: 'Descripción', type: 'textarea', rows: 4, req: true },
        { key: 'features', label: 'Características', type: 'tags', help: 'Separadas por comas.' },
        { key: 'images', label: 'Galería de imágenes', type: 'images', req: true },
        { key: 'featured', label: 'Destacar en la página de inicio', type: 'checkbox' },
      ],
      columns: function (p) {
        return [
          ['', '<img class="thumb" src="' + asset(p.images[0]) + '" alt="">', 'c-img'],
          ['Producto', '<b>' + esc(p.name) + '</b><small>' + esc(p.presentation) + '</small>', 'name'],
          ['Categoría', esc(catName(p.categoryId))],
          ['Organización', esc(orgName(p.orgId))],
          ['Disponibilidad', '<span class="tag ' + (p.availability === 'Disponible' ? '' : p.availability === 'Por temporada' ? 'warn' : 'info') + '">' + esc(p.availability) + '</span>'],
        ];
      },
      view: function (p) { return '../index.html#/producto/' + encodeURIComponent(p.id); },
    },

    categorias: {
      col: 'categories', title: 'Categorías', singular: 'categoría', nuevo: 'Nueva', icon: 'tag', idFrom: 'name',
      search: function (c) { return c.name + ' ' + c.description; },
      blank: function () { return { icon: 'package' }; },
      fields: [
        { key: 'name', label: 'Nombre', type: 'text', req: true, half: true },
        { key: 'icon', label: 'Icono', type: 'select', options: ICONS, half: true },
        { key: 'description', label: 'Descripción', type: 'textarea', rows: 3 },
      ],
      columns: function (c) {
        const n = db().products.filter(function (p) { return p.categoryId === c.id; }).length;
        return [
          ['', '<span class="icon-btn" style="width:42px;height:42px">' + icon(c.icon) + '</span>', 'c-img'],
          ['Categoría', '<b>' + esc(c.name) + '</b><small>' + esc(c.description || '') + '</small>', 'name'],
          ['Productos', String(n)],
        ];
      },
      blockDelete: function (c) {
        const n = db().products.filter(function (p) { return p.categoryId === c.id; }).length;
        return n ? 'No se puede eliminar: ' + n + ' producto(s) usan esta categoría. Reasígnelos primero.' : '';
      },
      view: function (c) { return '../index.html#/catalogo?cat=' + encodeURIComponent(c.id); },
    },

    noticias: {
      col: 'posts', title: 'Noticias y eventos', singular: 'publicación', nuevo: 'Nueva', icon: 'newspaper', idFrom: 'title',
      search: function (p) { return [p.title, p.summary, p.place].join(' '); },
      filter: { key: 'type', label: 'Todos los tipos', options: function () { return Object.keys(POST_TYPES).map(function (k) { return [k, POST_TYPES[k]]; }); } },
      blank: function () { return { type: 'noticia', date: new Date().toISOString().slice(0, 10), featured: false }; },
      sort: function (a, b) { return b.date.localeCompare(a.date); },
      fields: [
        { key: 'title', label: 'Título', type: 'text', req: true },
        { key: 'type', label: 'Tipo de publicación', type: 'select', req: true, half: true, options: function () { return Object.keys(POST_TYPES).map(function (k) { return [k, POST_TYPES[k]]; }); } },
        { key: 'date', label: 'Fecha', type: 'date', req: true, half: true },
        { key: 'place', label: 'Lugar', type: 'text', half: true },
        { key: 'featured', label: 'Destacada', type: 'checkbox', half: true },
        { key: 'summary', label: 'Resumen', type: 'textarea', rows: 2, req: true, max: 220 },
        { key: 'body', label: 'Contenido', type: 'textarea', rows: 6 },
        { key: 'image', label: 'Imagen principal', type: 'image', req: true },
      ],
      columns: function (p) {
        return [
          ['', '<img class="thumb" src="' + asset(p.image) + '" alt="">', 'c-img'],
          ['Título', '<b>' + esc(p.title) + '</b><small>' + esc(p.place || '') + '</small>', 'name'],
          ['Tipo', '<span class="tag ' + (p.type === 'oportunidad' ? 'gold' : p.type === 'evento' ? 'info' : p.type === 'feria' ? 'warn' : '') + '">' + esc(POST_TYPES[p.type] || p.type) + '</span>'],
          ['Fecha', esc(fmtDate(p.date))],
        ];
      },
      view: function (p) { return '../index.html#/noticia/' + encodeURIComponent(p.id); },
    },

    galeria: {
      col: 'gallery', title: 'Galería multimedia', singular: 'elemento', nuevo: 'Nuevo', icon: 'image', idFrom: 'title',
      search: function (g) { return g.title; },
      filter: { key: 'type', label: 'Fotos y videos', options: function () { return [['foto', 'Fotografías'], ['video', 'Videos']]; } },
      blank: function () { return { type: 'foto' }; },
      fields: [
        { key: 'title', label: 'Título / descripción', type: 'text', req: true },
        { key: 'type', label: 'Tipo', type: 'select', req: true, options: [['foto', 'Fotografía'], ['video', 'Video']], half: true },
        { key: 'src', label: 'Archivo', type: 'image', req: true, help: 'Para fotos: suba una imagen o pegue una URL. Para videos: pegue la URL de un archivo de video (WebM/MP4).' },
        { key: 'poster', label: 'Imagen de portada (solo videos)', type: 'image' },
      ],
      columns: function (g) {
        return [
          ['', '<img class="thumb" src="' + asset(g.type === 'video' ? g.poster : g.src) + '" alt="">', 'c-img'],
          ['Título', '<b>' + esc(g.title) + '</b>', 'name'],
          ['Tipo', g.type === 'video' ? '<span class="tag info">Video</span>' : '<span class="tag">Foto</span>'],
        ];
      },
      view: function () { return '../index.html#/galeria'; },
    },
  };

  const NAV = [
    ['dashboard', 'Dashboard', 'dashboard'],
    ['asociaciones', 'Asociaciones', 'users'],
    ['productos', 'Productos', 'package'],
    ['categorias', 'Categorías', 'tag'],
    ['noticias', 'Noticias y eventos', 'newspaper'],
    ['galeria', 'Galería', 'image'],
    ['consultas', 'Consultas', 'inbox'],
    ['configuracion', 'Configuración', 'sliders'],
  ];

  /* ================= utilidades ================= */
  function getPath(obj, path) { return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj); }
  function setPath(obj, path, val) {
    const ks = path.split('.');
    let o = obj;
    ks.slice(0, -1).forEach(function (k) { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; o = o[k]; });
    o[ks[ks.length - 1]] = val;
  }
  function opts(f) {
    const list = typeof f.options === 'function' ? f.options() : f.options;
    return list.map(function (o) { return Array.isArray(o) ? o : [o, o]; });
  }
  function saveOrWarn() {
    const ok = Store.save();
    if (!ok) toast('No se pudo guardar: el almacenamiento del navegador está lleno o bloqueado. Use imágenes más livianas o URLs.', 'error');
    return ok;
  }

  /* ================= modal ================= */
  let lastFocus = null;
  function openModal(html) {
    lastFocus = document.activeElement;
    const d = document.getElementById('mDialog');
    d.innerHTML = html;
    hydrateIcons(d);
    document.getElementById('modal').classList.add('open');
    document.body.style.overflow = 'hidden';
    const f = d.querySelector('.m-body input:not([type=hidden]), .m-body select, .m-body textarea, .m-foot button');
    if (f) f.focus();
  }
  function closeModal() {
    document.getElementById('modal').classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function confirmBox(title, msg, yesLabel, onYes, danger) {
    openModal('<div class="m-head"><h2 id="mTitle">' + esc(title) + '</h2><button class="icon-btn" type="button" data-action="close-modal" aria-label="Cerrar">' + icon('x') + '</button></div>' +
      '<div class="m-body"><p style="margin:0">' + esc(msg) + '</p></div>' +
      '<div class="m-foot"><button class="btn btn-light" type="button" data-action="close-modal">Cancelar</button><button class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" type="button" id="confirmYes">' + esc(yesLabel) + '</button></div>');
    document.getElementById('confirmYes').addEventListener('click', function () { closeModal(); onYes(); });
  }

  /* ================= formulario genérico ================= */
  function fieldHtml(f, item) {
    const id = 'f_' + f.key.replace(/\./g, '_');
    const v = getPath(item, f.key);
    const req = f.req ? ' <span class="req">*</span>' : '';
    let ctl = '';
    switch (f.type) {
      case 'textarea':
        ctl = '<textarea class="input" id="' + id + '" name="' + f.key + '" rows="' + (f.rows || 3) + '"' + (f.max ? ' maxlength="' + f.max + '"' : '') + '>' + esc(v || '') + '</textarea>';
        break;
      case 'select':
        ctl = '<select class="select" id="' + id + '" name="' + f.key + '"><option value="">Seleccione…</option>' + opts(f).map(function (o) {
          return '<option value="' + esc(o[0]) + '"' + (String(v) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
        }).join('') + '</select>';
        break;
      case 'checkbox':
        return '<div class="fld" data-k="' + f.key + '"><label class="check" style="margin-top:26px"><input type="checkbox" id="' + id + '" name="' + f.key + '"' + (v ? ' checked' : '') + '> ' + esc(f.label) + '</label></div>';
      case 'tags':
        ctl = '<input class="input" id="' + id + '" name="' + f.key + '" value="' + esc((v || []).join(', ')) + '">';
        break;
      case 'image':
      case 'images': {
        const arr = f.type === 'image' ? (v ? [v] : []) : (v || []);
        ctl = '<input type="hidden" name="' + f.key + '" value="' + esc(JSON.stringify(arr)) + '" data-multi="' + (f.type === 'images') + '">' +
          '<div class="img-list" data-imglist="' + f.key + '">' + imgListHtml(arr) + '</div>' +
          '<div class="img-add"><input class="input" id="' + id + '" type="url" placeholder="Pegar URL o ruta (assets/images/…)" data-urlfor="' + f.key + '">' +
          '<button class="btn btn-light" type="button" data-addurl="' + f.key + '">' + icon('plus') + 'Agregar URL</button>' +
          '<span class="btn btn-light file-btn">' + icon('upload') + 'Subir imagen<input type="file" accept="image/*" data-filefor="' + f.key + '"' + (f.type === 'images' ? ' multiple' : '') + ' aria-label="Subir imagen"></span></div>';
        break;
      }
      default: {
        const type = f.type === 'phone' ? 'tel' : f.type;
        ctl = '<input class="input" id="' + id + '" name="' + f.key + '" type="' + type + '" value="' + esc(v == null ? '' : v) + '"' +
          (f.min != null ? ' min="' + f.min + '"' : '') + (f.max != null && f.type === 'number' ? ' max="' + f.max + '"' : '') + (f.step ? ' step="' + f.step + '"' : '') + '>';
      }
    }
    return '<div class="fld" data-k="' + f.key + '"><label for="' + id + '">' + esc(f.label) + req + '</label>' + ctl +
      (f.help ? '<div class="help">' + esc(f.help) + '</div>' : '') + '<div class="err" role="alert"></div></div>';
  }

  function imgListHtml(arr) {
    if (!arr.length) return '<span class="muted" style="font-size:13px">Sin imágenes.</span>';
    return arr.map(function (src, i) {
      return '<div class="img-item"><img src="' + asset(src) + '" alt="">' + (i === 0 && arr.length > 1 ? '<span class="first">Principal</span>' : '') +
        '<button type="button" data-rmimg="' + i + '" aria-label="Quitar imagen ' + (i + 1) + '">' + icon('x') + '</button></div>';
    }).join('');
  }

  function formFields(fields, item) {
    let html = '<div class="form">';
    let row = [];
    let inGroup = false;
    const flush = function () { if (row.length) { html += row.length > 1 ? '<div class="row2">' + row.join('') + '</div>' : row[0]; row = []; } };
    fields.forEach(function (f) {
      if (f.group) {
        flush();
        html += (inGroup ? '</div></fieldset>' : '</div>') + '<fieldset style="margin-top:16px"><legend>' + esc(f.group) + '</legend><div class="form">';
        inGroup = true;
        return;
      }
      const h = fieldHtml(f, item);
      if (f.half) { row.push(h); if (row.length === 2) flush(); } else { flush(); html += h; }
    });
    flush();
    html += inGroup ? '</div></fieldset>' : '</div>';
    return html;
  }

  function readForm(form, fields, base) {
    const item = JSON.parse(JSON.stringify(base));
    fields.forEach(function (f) {
      if (f.group) return;
      const el = form.elements[f.key];
      if (!el) return;
      let v;
      if (f.type === 'checkbox') v = el.checked;
      else if (f.type === 'number') v = el.value === '' ? null : Number(el.value);
      else if (f.type === 'tags') v = el.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      else if (f.type === 'images') v = JSON.parse(el.value || '[]');
      else if (f.type === 'image') v = JSON.parse(el.value || '[]')[0] || '';
      else if (f.type === 'phone') v = onlyDigits(el.value);
      else v = el.value.trim();
      setPath(item, f.key, v);
    });
    return item;
  }

  function validate(form, fields, item) {
    const errs = {};
    fields.forEach(function (f) {
      if (f.group) return;
      const v = getPath(item, f.key);
      const empty = v == null || v === '' || (Array.isArray(v) && !v.length);
      if (f.req && empty && f.type !== 'checkbox') { errs[f.key] = 'Este campo es obligatorio.'; return; }
      if (empty) return;
      if (f.type === 'number' && (isNaN(v) || (f.min != null && v < f.min) || (f.max != null && v > f.max))) errs[f.key] = 'Ingrese un número entre ' + f.min + ' y ' + f.max + '.';
      if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) errs[f.key] = 'Correo electrónico no válido.';
      if (f.type === 'phone' && (v.length < 8 || v.length > 15)) errs[f.key] = 'Ingrese entre 8 y 15 dígitos, con código de país (591…).';
      if (f.max && f.type === 'textarea' && v.length > f.max) errs[f.key] = 'Máximo ' + f.max + ' caracteres.';
    });
    form.querySelectorAll('.fld').forEach(function (el) {
      const m = errs[el.dataset.k];
      el.classList.toggle('invalid', !!m);
      const e = el.querySelector('.err');
      if (e) e.textContent = m || '';
    });
    return errs;
  }

  function openEditor(key, id) {
    const S = SCHEMAS[key];
    const existing = id ? db()[S.col].find(function (x) { return x.id === id; }) : null;
    const base = existing || S.blank();
    openModal('<form data-form="crud" novalidate>' +
      '<div class="m-head"><h2 id="mTitle">' + (existing ? 'Editar ' + esc(S.singular) : esc(S.nuevo) + ' ' + esc(S.singular)) + '</h2><button class="icon-btn" type="button" data-action="close-modal" aria-label="Cerrar">' + icon('x') + '</button></div>' +
      '<div class="m-body">' + formFields(S.fields, base) + '</div>' +
      '<div class="m-foot"><button class="btn btn-light" type="button" data-action="close-modal">Cancelar</button><button class="btn btn-primary" type="submit">' + icon('check') + 'Guardar</button></div></form>');
    const form = document.querySelector('[data-form="crud"]');
    bindImageFields(form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const item = readForm(form, S.fields, base);
      const errs = validate(form, S.fields, item);
      const keys = Object.keys(errs);
      if (keys.length) {
        const first = form.querySelector('.fld.invalid input, .fld.invalid select, .fld.invalid textarea');
        if (first) first.focus();
        toast('Revise los campos marcados.', 'error');
        return;
      }
      if (!existing) item.id = Store.uniqueId(S.col, item[S.idFrom]);
      Store.upsert(S.col, item);
      if (saveOrWarn()) toast((existing ? 'Cambios guardados' : 'Registro creado') + ': ' + (item[S.idFrom] || ''));
      closeModal();
      render();
    });
  }

  function bindImageFields(form) {
    function getArr(k) { return JSON.parse(form.elements[k].value || '[]'); }
    function setArr(k, arr) {
      const multi = form.elements[k].dataset.multi === 'true';
      if (!multi) arr = arr.slice(-1);
      form.elements[k].value = JSON.stringify(arr);
      const list = form.querySelector('[data-imglist="' + k + '"]');
      list.innerHTML = imgListHtml(arr);
      hydrateIcons(list);
    }
    form.addEventListener('click', function (e) {
      const add = e.target.closest('[data-addurl]');
      if (add) {
        const k = add.dataset.addurl;
        const inp = form.querySelector('[data-urlfor="' + k + '"]');
        const u = inp.value.trim();
        if (!u) { toast('Escriba una URL o ruta de imagen.', 'error'); inp.focus(); return; }
        if (!/^(https?:\/\/|assets\/|data:image\/)/.test(u)) { toast('La URL debe comenzar con https:// o assets/.', 'error'); return; }
        setArr(k, getArr(k).concat([u]));
        inp.value = '';
        return;
      }
      const rm = e.target.closest('[data-rmimg]');
      if (rm) {
        const k = rm.closest('[data-imglist]').dataset.imglist;
        const arr = getArr(k);
        arr.splice(+rm.dataset.rmimg, 1);
        setArr(k, arr);
      }
    });
    form.addEventListener('change', function (e) {
      const fi = e.target.closest('[data-filefor]');
      if (!fi) return;
      const k = fi.dataset.filefor;
      Promise.all(Array.from(fi.files).map(function (f) { return fileToDataUrl(f, 1000); }))
        .then(function (urls) { setArr(k, getArr(k).concat(urls)); toast(urls.length + ' imagen(es) agregada(s). Recuerde guardar.'); })
        .catch(function (err) { toast(err.message, 'error'); })
        .finally(function () { fi.value = ''; });
    });
  }

  /* ================= vistas ================= */
  const state = { q: '', filter: '' };

  function listView(key) {
    const S = SCHEMAS[key];
    let list = db()[S.col].slice();
    if (S.sort) list.sort(S.sort);
    const q = norm(state.q);
    if (q) list = list.filter(function (x) { return norm(S.search(x)).indexOf(q) >= 0; });
    if (S.filter && state.filter) list = list.filter(function (x) { return String(x[S.filter.key]) === state.filter; });
    const total = db()[S.col].length;
    const fopts = S.filter ? S.filter.options().map(function (o) { return Array.isArray(o) ? o : [o, o]; }) : [];
    return '<div class="toolbar">' +
      '<div class="search">' + icon('search') + '<label class="sr-only" for="q">Buscar</label><input class="input" id="q" type="search" placeholder="Buscar ' + esc(S.title.toLowerCase()) + '…" value="' + esc(state.q) + '" data-bind="q"></div>' +
      (S.filter ? '<label class="sr-only" for="flt">Filtro</label><select class="select" id="flt" data-bind="filter"><option value="">' + esc(S.filter.label) + '</option>' + fopts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (state.filter === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>' : '') +
      '<button class="btn btn-primary" type="button" data-new="' + key + '">' + icon('plus') + esc(S.nuevo) + ' ' + esc(S.singular) + '</button></div>' +
      '<div class="card"><div class="card-h" style="padding-bottom:12px"><h2>' + esc(S.title) + '</h2><span class="muted" style="font-size:13px">' + list.length + ' de ' + total + ' registros</span></div>' +
      (list.length ? '<div style="overflow-x:auto"><table class="table"><thead><tr>' + S.columns(list[0]).map(function (c) { return '<th scope="col">' + esc(c[0]) + '</th>'; }).join('') + '<th scope="col" style="text-align:right">Acciones</th></tr></thead><tbody>' +
        list.map(function (x) {
          return '<tr>' + S.columns(x).map(function (c) { return '<td class="' + (c[2] || '') + '"' + (c[0] && c[2] !== 'name' ? ' data-label="' + esc(c[0]) + '"' : '') + '>' + c[1] + '</td>'; }).join('') +
            '<td class="actions-cell"><div class="actions">' +
            '<a class="btn btn-light btn-sm btn-icon" href="' + S.view(x) + '" target="_blank" rel="noopener" title="Ver en el sitio" aria-label="Ver en el sitio">' + icon('eye') + '</a>' +
            '<button class="btn btn-light btn-sm btn-icon" type="button" data-edit="' + key + '" data-id="' + esc(x.id) + '" title="Editar" aria-label="Editar">' + icon('pencil') + '</button>' +
            '<button class="btn btn-danger-light btn-sm btn-icon" type="button" data-del="' + key + '" data-id="' + esc(x.id) + '" title="Eliminar" aria-label="Eliminar">' + icon('trash') + '</button>' +
            '</div></td></tr>';
        }).join('') + '</tbody></table></div>'
        : '<div class="empty">' + icon('search') + '<p>' + (total ? 'Ningún registro coincide con la búsqueda.' : 'Todavía no hay registros. Cree el primero.') + '</p></div>') +
      '</div>';
  }

  function dashboard() {
    const d = db();
    const newQ = d.inquiries.filter(function (i) { return i.status === 'nueva'; }).length;
    const kpi = function (href, ic, n, label, cls) { return '<a class="card kpi ' + (cls || '') + '" href="#' + href + '"><span class="ic">' + icon(ic) + '</span><span><b>' + n + '</b><span>' + label + '</span></span></a>'; };
    const maxCat = Math.max.apply(null, d.categories.map(function (c) { return d.products.filter(function (p) { return p.categoryId === c.id; }).length; }).concat([1]));
    const pendingContact = d.organizations.filter(function (o) { return !o.contact || !o.contact.whatsapp; }).length;
    const pendingName = d.organizations.filter(function (o) { return !o.fullName; }).length;
    return '<div class="kpis">' +
      kpi('asociaciones', 'users', d.organizations.length, 'Organizaciones') +
      kpi('productos', 'package', d.products.length, 'Productos') +
      kpi('categorias', 'tag', d.categories.length, 'Categorías') +
      kpi('noticias', 'newspaper', d.posts.length, 'Publicaciones') +
      kpi('galeria', 'image', d.gallery.length, 'Elementos de galería') +
      kpi('consultas', 'inbox', newQ, 'Consultas nuevas', newQ ? 'alert' : '') +
      '</div><div class="dash-grid">' +
      '<div class="card"><div class="card-h"><h2>Productos por categoría</h2><a href="#productos" style="font-size:13px;font-weight:700">Gestionar</a></div><div class="card-b"><div class="bars">' +
      d.categories.map(function (c) {
        const n = d.products.filter(function (p) { return p.categoryId === c.id; }).length;
        return '<div class="bar-row"><span>' + esc(c.name) + '</span><div class="bar-track" role="img" aria-label="' + n + ' productos"><div class="bar-fill" style="width:' + (n / maxCat * 100) + '%"></div></div><b>' + n + '</b></div>';
      }).join('') + '</div>' +
      '<h3 style="font-size:15px;margin:22px 0 10px">Disponibilidad del catálogo</h3><div class="bars">' +
      AVAIL.map(function (a) {
        const n = d.products.filter(function (p) { return p.availability === a; }).length;
        return '<div class="bar-row"><span>' + a + '</span><div class="bar-track"><div class="bar-fill" style="width:' + (d.products.length ? n / d.products.length * 100 : 0) + '%;background:' + (a === 'Disponible' ? 'var(--verde-500)' : a === 'Por temporada' ? 'var(--oro)' : '#4a7fb3') + '"></div></div><b>' + n + '</b></div>';
      }).join('') + '</div>' +
      '<p class="hint">' + icon('info') + '<span>Las estadísticas de visitas y clics a WhatsApp requieren analítica en el servidor; no se simulan en esta demostración.</span></p></div></div>' +
      '<div style="display:grid;gap:16px;align-content:start">' +
      '<div class="card"><div class="card-h"><h2>Últimas consultas</h2><a href="#consultas" style="font-size:13px;font-weight:700">Ver todas</a></div><div class="card-b">' +
      (d.inquiries.length ? '<ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">' + d.inquiries.slice(0, 4).map(function (i) {
        return '<li style="display:flex;gap:10px;justify-content:space-between;align-items:center"><span><b>' + esc(i.name) + '</b><br><small class="muted">' + esc(i.subject) + '</small></span><span class="tag ' + STATUS[i.status][1] + '">' + STATUS[i.status][0] + '</span></li>';
      }).join('') + '</ul>' : '<p class="muted" style="margin:0">Aún no hay consultas. Envíe una desde el <a href="../index.html#/contacto" target="_blank">formulario del sitio</a> para probar.</p>') + '</div></div>' +
      '<div class="card"><div class="card-h"><h2>Contenido pendiente de validar</h2></div><div class="card-b"><ul style="margin:0;padding-left:18px;display:grid;gap:6px;font-size:14px">' +
      '<li>' + pendingName + ' organización(es) sin nombre completo confirmado.</li>' +
      '<li>' + pendingContact + ' organización(es) sin WhatsApp configurado.</li>' +
      '<li>' + (d.settings.whatsapp ? 'WhatsApp general configurado.' : '<a href="#configuracion">Configurar el WhatsApp general</a> del sitio.') + '</li>' +
      '<li>Descripciones, ubicaciones y capacidades son demostrativas.</li>' +
      '</ul></div></div>' +
      '<div class="card"><div class="card-h"><h2>Acciones rápidas</h2></div><div class="card-b" style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn btn-light" type="button" data-new="productos">' + icon('plus') + 'Producto</button>' +
      '<button class="btn btn-light" type="button" data-new="asociaciones">' + icon('plus') + 'Organización</button>' +
      '<button class="btn btn-light" type="button" data-new="noticias">' + icon('plus') + 'Noticia</button>' +
      '<a class="btn btn-light" href="../index.html" target="_blank" rel="noopener">' + icon('external') + 'Ver sitio</a></div></div>' +
      '</div></div>';
  }

  function inquiries() {
    let list = db().inquiries.slice();
    const q = norm(state.q);
    if (q) list = list.filter(function (i) { return norm([i.name, i.company, i.email, i.subject, i.message].join(' ')).indexOf(q) >= 0; });
    if (state.filter) list = list.filter(function (i) { return i.status === state.filter; });
    return '<div class="toolbar"><div class="search">' + icon('search') + '<label class="sr-only" for="q">Buscar</label><input class="input" id="q" type="search" placeholder="Buscar consultas…" value="' + esc(state.q) + '" data-bind="q"></div>' +
      '<label class="sr-only" for="flt">Estado</label><select class="select" id="flt" data-bind="filter"><option value="">Todos los estados</option>' + Object.keys(STATUS).map(function (k) { return '<option value="' + k + '"' + (state.filter === k ? ' selected' : '') + '>' + STATUS[k][0] + '</option>'; }).join('') + '</select></div>' +
      '<div class="card"><div class="card-h" style="padding-bottom:12px"><h2>Consultas y solicitudes recibidas</h2><span class="muted" style="font-size:13px">' + list.length + ' de ' + db().inquiries.length + '</span></div>' +
      (list.length ? '<div style="overflow-x:auto"><table class="table"><thead><tr><th>Fecha</th><th>Remitente</th><th>Tipo</th><th>Asunto</th><th>Estado</th><th style="text-align:right">Acciones</th></tr></thead><tbody>' +
        list.map(function (i) {
          return '<tr><td data-label="Fecha">' + esc(new Date(i.date).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })) + '</td>' +
            '<td class="name"><b>' + esc(i.name) + '</b><small>' + esc(i.email) + '</small></td>' +
            '<td data-label="Tipo">' + (i.type === 'compra' ? '<span class="tag gold">Compra</span>' : '<span class="tag info">Información</span>') + '</td>' +
            '<td data-label="Asunto">' + esc(i.subject) + '</td>' +
            '<td data-label="Estado"><select class="select" style="min-width:140px;min-height:34px;padding:4px 30px 4px 10px" data-status="' + esc(i.id) + '" aria-label="Estado">' + Object.keys(STATUS).map(function (k) { return '<option value="' + k + '"' + (i.status === k ? ' selected' : '') + '>' + STATUS[k][0] + '</option>'; }).join('') + '</select></td>' +
            '<td class="actions-cell"><div class="actions"><button class="btn btn-light btn-sm btn-icon" type="button" data-viewq="' + esc(i.id) + '" aria-label="Ver detalle">' + icon('eye') + '</button>' +
            '<button class="btn btn-danger-light btn-sm btn-icon" type="button" data-delq="' + esc(i.id) + '" aria-label="Eliminar">' + icon('trash') + '</button></div></td></tr>';
        }).join('') + '</tbody></table></div>'
        : '<div class="empty">' + icon('inbox') + '<p>No hay consultas' + (db().inquiries.length ? ' con esos filtros' : ' todavía') + '. Las enviadas desde el <a href="../index.html#/contacto" target="_blank" rel="noopener">formulario de contacto</a> del prototipo aparecerán aquí.</p></div>') +
      '</div><p class="hint">' + icon('info') + '<span>En la versión final, cada consulta se notificará por correo a FEDAPABENI y quedará almacenada en la base de datos del servidor.</span></p>';
  }

  function viewInquiry(id) {
    const i = db().inquiries.find(function (x) { return x.id === id; });
    if (!i) return;
    const row = function (k, v) { return v ? '<div><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>' : ''; };
    const wa = onlyDigits(i.phone);
    openModal('<div class="m-head"><h2 id="mTitle">' + esc(i.subject) + '</h2><button class="icon-btn" type="button" data-action="close-modal" aria-label="Cerrar">' + icon('x') + '</button></div>' +
      '<div class="m-body"><dl class="detail-list">' + row('Fecha', new Date(i.date).toLocaleString('es-BO')) + row('Nombre', i.name) + row('Empresa', i.company) + row('Correo', i.email) + row('Teléfono', i.phone) +
      row('Producto', i.product) + row('Volumen', i.qty) + row('Organización', i.org) + row('Mensaje', i.message) + '</dl></div>' +
      '<div class="m-foot"><a class="btn btn-light" href="mailto:' + esc(i.email) + '?subject=' + encodeURIComponent('Re: ' + i.subject) + '">' + icon('mail') + 'Responder por correo</a>' +
      (wa.length >= 8 ? '<a class="btn btn-light" href="https://wa.me/' + wa + '" target="_blank" rel="noopener">' + icon('whatsapp') + 'WhatsApp</a>' : '') +
      '<button class="btn btn-primary" type="button" data-action="close-modal">Cerrar</button></div>');
    if (i.status === 'nueva') { i.status = 'proceso'; saveOrWarn(); render(); }
  }

  const SETTINGS_FIELDS = [
    { key: 'siteName', label: 'Nombre corto del sitio', type: 'text', req: true, half: true },
    { key: 'families', label: 'Familias beneficiarias (referencia)', type: 'number', min: 0, step: 1, half: true },
    { key: 'siteFullName', label: 'Nombre completo de la institución', type: 'text', req: true },
    { key: 'tagline', label: 'Lema / descripción breve', type: 'text', req: true },
    { key: 'whatsapp', label: 'WhatsApp general (con código de país)', type: 'phone', half: true, help: 'Solo dígitos, ej.: 591XXXXXXXX. Vacío = el visitante elige el contacto.' },
    { key: 'phone', label: 'Teléfono', type: 'text', half: true },
    { key: 'email', label: 'Correo institucional', type: 'email', half: true },
    { key: 'facebook', label: 'Página de Facebook (URL)', type: 'url', half: true },
    { key: 'address', label: 'Dirección', type: 'text' },
    { key: 'heroImage', label: 'Imagen principal de portada', type: 'image', req: true },
  ];

  function settingsView() {
    return '<form class="card" data-form="settings" novalidate><div class="card-h"><h2>Configuración básica del sitio</h2></div><div class="card-b">' +
      formFields(SETTINGS_FIELDS, db().settings) +
      '<div style="display:flex;gap:8px;margin-top:18px;flex-wrap:wrap"><button class="btn btn-primary" type="submit">' + icon('check') + 'Guardar configuración</button><a class="btn btn-light" href="../index.html" target="_blank" rel="noopener">' + icon('external') + 'Ver cambios en el sitio</a></div>' +
      '<p class="hint">' + icon('lock') + '<span>No ingrese contraseñas ni datos sensibles: esta demostración guarda todo en el navegador sin cifrado.</span></p></div></form>';
  }

  /* ================= render / router ================= */
  let current = '';
  function render() {
    const key = (location.hash.slice(1) || 'dashboard').split('?')[0];
    const nav = NAV.find(function (n) { return n[0] === key; }) || NAV[0];
    if (current !== nav[0]) { state.q = ''; state.filter = ''; current = nav[0]; }
    document.getElementById('pageTitle').textContent = nav[1];
    document.title = nav[1] + ' · Panel (demo) · FEDAPABENI';
    const newQ = db().inquiries.filter(function (i) { return i.status === 'nueva'; }).length;
    document.getElementById('sbNav').innerHTML = NAV.map(function (n) {
      return '<a class="sb-link' + (n[0] === nav[0] ? ' active' : '') + '" href="#' + n[0] + '"' + (n[0] === nav[0] ? ' aria-current="page"' : '') + '>' + icon(n[2]) + n[1] + (n[0] === 'consultas' && newQ ? '<span class="count">' + newQ + '</span>' : '') + '</a>';
    }).join('');
    let html;
    if (nav[0] === 'dashboard') html = dashboard();
    else if (nav[0] === 'consultas') html = inquiries();
    else if (nav[0] === 'configuracion') html = settingsView();
    else html = listView(nav[0]);
    main.innerHTML = html;
    hydrateIcons(main);
    if (nav[0] === 'configuracion') bindImageFields(main.querySelector('[data-form="settings"]'));
  }

  function rerenderKeepFocus(bind) {
    const el = document.querySelector('[data-bind="' + bind + '"]');
    const pos = el && el.selectionStart;
    render();
    const n = document.querySelector('[data-bind="' + bind + '"]');
    if (n) { n.focus(); if (pos != null && n.setSelectionRange) n.setSelectionRange(pos, pos); }
  }

  /* ================= eventos ================= */
  document.addEventListener('input', function (e) {
    const b = e.target.dataset && e.target.dataset.bind;
    if (b === 'q') { state.q = e.target.value; rerenderKeepFocus('q'); }
  });
  document.addEventListener('change', function (e) {
    const t = e.target;
    if (t.dataset.bind === 'filter') { state.filter = t.value; rerenderKeepFocus('filter'); return; }
    if (t.dataset.status) {
      const i = db().inquiries.find(function (x) { return x.id === t.dataset.status; });
      i.status = t.value;
      if (saveOrWarn()) toast('Estado actualizado: ' + STATUS[t.value][0]);
      render();
    }
  });

  document.addEventListener('submit', function (e) {
    if (!e.target.matches('[data-form="settings"]')) return;
    e.preventDefault();
    const form = e.target;
    const item = readForm(form, SETTINGS_FIELDS, db().settings);
    const errs = validate(form, SETTINGS_FIELDS, item);
    if (Object.keys(errs).length) { toast('Revise los campos marcados.', 'error'); return; }
    db().settings = item;
    if (saveOrWarn()) toast('Configuración guardada.');
    render();
  });

  document.addEventListener('click', function (e) {
    const t = e.target;
    const nw = t.closest('[data-new]');
    if (nw) { openEditor(nw.dataset.new); return; }
    const ed = t.closest('[data-edit]');
    if (ed) { openEditor(ed.dataset.edit, ed.dataset.id); return; }
    const del = t.closest('[data-del]');
    if (del) {
      const S = SCHEMAS[del.dataset.del];
      const item = db()[S.col].find(function (x) { return x.id === del.dataset.id; });
      const block = S.blockDelete && S.blockDelete(item);
      if (block) { toast(block, 'error'); return; }
      const extra = S.beforeDelete ? S.beforeDelete(item) : '';
      confirmBox('Eliminar ' + S.singular, '¿Eliminar “' + (item[S.idFrom] || item.id) + '”? ' + extra + ' Esta acción solo afecta a los datos de demostración de este navegador.', 'Eliminar', function () {
        if (S.onDelete) S.onDelete(item);
        Store.remove(S.col, item.id);
        toast('Registro eliminado.');
        render();
      }, true);
      return;
    }
    const vq = t.closest('[data-viewq]');
    if (vq) { viewInquiry(vq.dataset.viewq); return; }
    const dq = t.closest('[data-delq]');
    if (dq) {
      confirmBox('Eliminar consulta', '¿Eliminar esta consulta de la bandeja de demostración?', 'Eliminar', function () {
        Store.remove('inquiries', dq.dataset.delq);
        toast('Consulta eliminada.');
        render();
      }, true);
      return;
    }
    const act = t.closest('[data-action]');
    if (!act) return;
    const a = act.dataset.action;
    if (a === 'close-modal') closeModal();
    else if (a === 'open-sb') { document.getElementById('sidebar').classList.add('open'); }
    else if (a === 'close-sb') { document.getElementById('sidebar').classList.remove('open'); }
    else if (a === 'reset') {
      confirmBox('Restaurar datos de ejemplo', 'Se descartarán todos los cambios hechos en este navegador (organizaciones, productos, noticias, galería, consultas y configuración) y se cargarán los datos de ejemplo originales.', 'Restaurar', function () {
        Store.reset();
        toast('Datos de ejemplo restaurados.');
        render();
      }, true);
    } else if (a === 'export') {
      const blob = new Blob([JSON.stringify(db(), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'fedapabeni-datos-demo.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      toast('Archivo JSON descargado.');
    }
  });
  document.getElementById('sbNav').addEventListener('click', function () { document.getElementById('sidebar').classList.remove('open'); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeModal(); document.getElementById('sidebar').classList.remove('open'); }
  });

  window.addEventListener('hashchange', render);
  hydrateIcons(document);
  if (!Store.available()) toast('El almacenamiento local está bloqueado: los cambios no se conservarán al recargar.', 'error');
  render();
})();
