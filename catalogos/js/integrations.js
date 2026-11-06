/*
 * Integraciones simuladas con Google Sheets y Google Drive + mapeo de columnas.
 * No se usan las APIs de Google: los archivos y carpetas son datos de demostración.
 */
(function () {
  'use strict';
  const CA = window.CA, D = CA.dash;
  const u = CA.util, ui = CA.ui, esc = u.esc, I = ui.icon, B = CA.CONFIG.brand;
  const $ = ui.$, $$ = ui.$$;

  const SHEETS_LOGO = '<svg class="g-app" viewBox="0 0 48 48"><path fill="#0f9d58" d="M30 4H12a4 4 0 0 0-4 4v32a4 4 0 0 0 4 4h24a4 4 0 0 0 4-4V14z"/><path fill="#87ceac" d="M30 4v10h10z"/><path fill="#fff" d="M15 22h18v14H15zm2 2v3h6v-3zm8 0v3h6v-3zm-8 5v3h6v-3zm8 0v3h6v-3z"/></svg>';
  const DRIVE_LOGO = '<svg class="g-app" viewBox="0 0 48 48"><path fill="#1e88e5" d="M38 42H10l6-11h28z"/><path fill="#fbc02d" d="M17 6h14l13 25H30z"/><path fill="#43a047" d="M4 31 17 6l7 13-13 23z"/></svg>';

  /** Pantalla simulada de autorización de Google. Resuelve true si el usuario acepta. */
  function authorize(service) {
    const user = D.user();
    const scope = service === 'sheets' ? ['Ver tus hojas de cálculo de Google Sheets', 'Solo lectura: ' + B.name + ' nunca modifica tus archivos'] : ['Ver los archivos e imágenes de las carpetas que elijas en Google Drive', 'Solo lectura'];
    return new Promise((resolve) => {
      let ok = false;
      const m = ui.modal({
        title: 'Autorizar ' + (service === 'sheets' ? 'Google Sheets' : 'Google Drive'), subtitle: '<span class="demo-tag">Simulación</span> No se conecta con Google ni se piden credenciales reales.', size: 'sm',
        body: '<div class="oauth"><div class="oauth-logos">' + '<span class="logo-mark">' + esc(B.short) + '</span>' + I('link') + (service === 'sheets' ? SHEETS_LOGO : DRIVE_LOGO) + '</div>' +
          '<h4>' + esc(B.name) + ' quiere acceder a tu cuenta de Google</h4><p class="muted">' + esc(user.email) + '</p>' +
          '<ul class="oauth-scope">' + scope.map((s) => '<li>' + I('check') + esc(s) + '</li>').join('') + '</ul>' +
          '<p class="muted" style="font-size:.8rem">Puedes revocar el acceso cuando quieras desde tu cuenta de Google o desde esta pantalla.</p></div>',
        onClose: () => resolve(ok),
        actions: [{ label: 'Cancelar', cls: 'btn-ghost' }, { label: 'Permitir', cls: 'btn-primary', id: 'allow', onClick: () => new Promise((res) => {
          const b = m.el.querySelector('[data-action="allow"]');
          b.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> Conectando…';
          setTimeout(() => { ok = true; res(true); }, 700);
        }) }]
      });
    });
  }

  /* =========================================================
     INTEGRACIONES
     ========================================================= */
  D.view('integraciones', { title: 'Integraciones', icon: 'link', sub: 'Google Sheets y Google Drive', render: renderIntegrations });

  function renderIntegrations(el, params) {
    const ws = D.ws(), db = D.db();
    const tab = params.get('tab') === 'drive' ? 'drive' : 'sheets';
    const sh = ws.integrations.sheets, dr = ws.integrations.drive;
    const sheet = sh.connected && sh.sheetId ? CA.products.sheet(db, sh.sheetId) : null;
    const folder = dr.connected && dr.folderId ? CA.products.folder(db, dr.folderId) : null;
    el.innerHTML = '<div class="view-in">' +
      '<div class="alert alert-warn" style="margin-bottom:16px">' + I('info') + '<p><b>Integraciones de demostración.</b> Los archivos de Sheets y las carpetas de Drive son ejemplos. En la versión comercial se conectarán con las APIs oficiales de Google (solo lectura).</p></div>' +
      '<div class="int-cards">' +
      '<a class="int-card' + (tab === 'sheets' ? ' on' : '') + '" href="#/integraciones?tab=sheets">' + SHEETS_LOGO + '<div><b>Google Sheets</b><small>' + (sh.connected ? (sheet ? esc(sheet.name) + ' › ' + esc(sh.tab) : 'Conectado · elige un archivo') : 'Sin conectar') + '</small></div>' + ui.badge(sh.connected ? 'Conectado' : 'Desconectado', sh.connected ? 'ok' : 'neutral') + '</a>' +
      '<a class="int-card' + (tab === 'drive' ? ' on' : '') + '" href="#/integraciones?tab=drive">' + DRIVE_LOGO + '<div><b>Google Drive</b><small>' + (dr.connected ? (folder ? 'Carpeta: ' + esc(folder.name) : 'Conectado · elige una carpeta') : 'Sin conectar') + '</small></div>' + ui.badge(dr.connected ? 'Conectado' : 'Desconectado', dr.connected ? 'ok' : 'neutral') + '</a></div>' +
      '<div id="intBody"></div></div>';
    if (tab === 'sheets') renderSheets($('#intBody'));
    else renderDrive($('#intBody'), params);
  }

  function renderSheets(box) {
    const ws = D.ws(), db = D.db(), user = D.user();
    const sh = ws.integrations.sheets;
    const limits = D.limits();
    if (!sh.connected) {
      box.innerHTML = '<div class="card connect-hero">' + SHEETS_LOGO + '<h3>Conecta tu hoja de productos</h3><p class="muted">Cada fila es un producto. Elige el archivo y la pestaña, y luego indica qué columna es el nombre, el precio, la categoría, etc.</p>' +
        '<ul class="checks-inline"><li>' + I('check') + 'Acceso de solo lectura</li><li>' + I('check') + 'Encabezados en la primera fila</li><li>' + I('check') + 'Sincronización automática</li></ul>' +
        '<button class="btn btn-primary btn-lg" id="connSheets">' + I('google') + 'Conectar Google Sheets</button></div>';
      $('#connSheets').onclick = async () => {
        if (!(await authorize('sheets'))) return;
        D.act((d, uid) => Object.assign(d.workspaces[uid].integrations.sheets, { connected: true, account: user.email }), 'Google Sheets conectado (simulado)', { noRender: true });
        pickSheet();
      };
      return;
    }
    const sheet = sh.sheetId ? CA.products.sheet(db, sh.sheetId) : null;
    const tab = sheet ? CA.products.tab(db, sh.sheetId, sh.tab) : null;
    const opts = [[5, '5 min'], [15, '15 min'], [60, '60 min'], [1440, '24 h']];
    box.innerHTML = '<div class="grid-2 int-grid">' +
      '<div class="card"><div class="card-head"><h3>' + I('sheet') + 'Hoja conectada</h3><div style="display:flex;gap:6px"><button class="btn btn-sm btn-ghost" id="chgSheet">' + I('refresh') + (sheet ? 'Cambiar archivo' : 'Elegir archivo') + '</button></div></div>' +
      (sheet ? '<dl class="kv"><dt>Cuenta de Google</dt><dd>' + esc(sh.account) + '</dd><dt>Archivo</dt><dd>' + esc(sheet.name) + '</dd><dt>Pestaña</dt><dd>' + esc(sh.tab) + '</dd><dt>Filas</dt><dd>' + tab.rows.length + ' productos · ' + tab.headers.length + ' columnas</dd><dt>Modificado</dt><dd>' + u.dateTime(sheet.modified) + '</dd></dl>'
        : ui.empty('sheet', 'Elige un archivo', 'Selecciona la hoja de cálculo con tus productos.', '<button class="btn btn-primary btn-sm" id="pickNow">Elegir archivo</button>')) +
      '</div>' +
      '<div class="card"><div class="card-head"><h3>' + I('sync') + 'Sincronización</h3>' + ui.badge(D.syncState(ws).text, D.syncState(ws).tone) + '</div>' +
      '<label class="toggle-row" style="margin-bottom:12px"><span><b>Sincronización automática</b><small>Tu plan permite sincronizar cada ' + (limits.syncMinutes >= 1440 ? '24 horas' : limits.syncMinutes + ' minutos') + '.</small></span><input type="checkbox" class="toggle" id="autoSync"' + (sh.autoSync ? ' checked' : '') + '></label>' +
      '<div class="field"><label>Frecuencia</label><select id="syncFreq">' + opts.map((o) => '<option value="' + o[0] + '"' + (o[0] < limits.syncMinutes ? ' disabled' : '') + (o[0] === limits.syncMinutes ? ' selected' : '') + '>Cada ' + o[1] + (o[0] < limits.syncMinutes ? ' (plan superior)' : '') + '</option>').join('') + '</select></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="btn btn-primary" id="syncNow"' + (sheet ? '' : ' disabled') + '>' + I('sync') + 'Sincronizar ahora</button><a class="btn btn-ghost" href="#/mapeo">' + I('sliders') + 'Mapeo de columnas</a><button class="btn btn-danger-ghost" id="disc">Desconectar</button></div></div></div>' +
      (tab ? '<div class="card" style="margin-top:16px"><div class="card-head"><h3>' + I('eye') + 'Vista previa de la hoja</h3><span class="muted" style="font-size:.85rem">Primeras 6 filas de ' + tab.rows.length + '</span></div>' + sheetTable(tab, 6) + '</div>' : '') +
      ((sh.syncLog || []).length ? '<div class="card" style="margin-top:16px"><div class="card-head"><h3>' + I('history') + 'Historial de sincronización</h3></div><div class="table-wrap stack"><table class="table"><thead><tr><th>Fecha</th><th>Tipo</th><th class="num">Filas</th><th class="num">Nuevos</th><th class="num">Actualizados</th><th class="num">Advertencias</th><th class="num">Errores</th></tr></thead><tbody>' +
        sh.syncLog.map((l) => '<tr><td data-l="Fecha">' + u.dateTime(l.at) + '</td><td data-l="Tipo">' + ui.badge(l.mode, l.mode === 'automática' ? 'info' : 'neutral') + '</td><td data-l="Filas" class="num">' + l.rows + '</td><td data-l="Nuevos" class="num">' + l.added + '</td><td data-l="Actualizados" class="num">' + l.updated + '</td><td data-l="Advertencias" class="num">' + (l.warnings ? '<span class="text-warn">' + l.warnings + '</span>' : 0) + '</td><td data-l="Errores" class="num">' + (l.errors ? '<span class="text-bad">' + l.errors + '</span>' : 0) + '</td></tr>').join('') + '</tbody></table></div></div>' : '');
    $('#chgSheet').onclick = pickSheet;
    const pn = $('#pickNow'); if (pn) pn.onclick = pickSheet;
    $('#autoSync').onchange = (e) => D.act((d, uid) => { d.workspaces[uid].integrations.sheets.autoSync = e.target.checked; }, e.target.checked ? 'Sincronización automática activada' : 'Sincronización automática desactivada');
    $('#syncFreq').onchange = () => ui.toast('La frecuencia la define tu plan (simulado).', 'info');
    $('#syncNow').onclick = () => D.runSync();
    $('#disc').onclick = async () => {
      if (!(await ui.confirm({ title: 'Desconectar Google Sheets', message: 'Tus catálogos dejarán de mostrar productos hasta que vuelvas a conectar una hoja. El mapeo se conserva.', confirmLabel: 'Desconectar', danger: true }))) return;
      D.act((d, uid) => { const s = d.workspaces[uid].integrations.sheets; Object.assign(s, { connected: false, sheetId: '', tab: '' }); d.workspaces[uid].products = []; }, 'Google Sheets desconectado');
    };
  }

  function sheetTable(tab, n, highlight) {
    return '<div class="table-wrap sheet-table"><table class="table"><thead><tr><th class="rn"></th>' + tab.headers.map((h, i) => '<th' + (highlight && highlight.includes(h) ? ' class="hl"' : '') + '><span class="col-l">' + String.fromCharCode(65 + i) + '</span>' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' +
      tab.rows.slice(0, n).map((r, k) => '<tr><td class="rn">' + (k + 2) + '</td>' + tab.headers.map((h, i) => '<td>' + esc(String(r[i] || '').slice(0, 42)) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
  }
  CA.sheetTable = sheetTable;

  /** Selector de archivo → pestaña → vista previa. */
  function pickSheet() {
    const db = D.db();
    let selected = null, selTab = null;
    const m = ui.modal({ title: 'Elegir hoja de cálculo', subtitle: 'Archivos de Google Sheets de tu cuenta <span class="demo-tag">Demo</span>', icon: 'sheet', size: 'lg', body: '' });
    const step1 = () => {
      m.body.innerHTML = '<div class="toolbar"><div class="search">' + I('search') + '<input id="fq" placeholder="Buscar archivo…"></div></div><div class="file-list" id="fl"></div>';
      const draw = (q) => {
        m.body.querySelector('#fl').innerHTML = db.sheets.filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase())).map((s) =>
          '<button class="file-row" data-id="' + s.id + '">' + SHEETS_LOGO + '<div><b>' + esc(s.name) + '</b><small>' + s.tabs.length + ' pestaña(s) · modificado ' + u.date(s.modified) + ' · ' + esc(s.owner) + '</small></div>' + I('right') + '</button>').join('') || ui.empty('search', 'Sin resultados');
        $$('[data-id]', m.body).forEach((b) => (b.onclick = () => { selected = CA.products.sheet(db, b.dataset.id); step2(); }));
      };
      m.body.querySelector('#fq').addEventListener('input', (e) => draw(e.target.value));
      draw('');
    };
    const step2 = () => {
      selTab = selTab && selected.tabs.find((t) => t.name === selTab.name) ? selTab : selected.tabs[0];
      m.body.innerHTML = '<button class="link-btn" id="back">' + I('left') + ' Volver a los archivos</button><h4 style="margin:12px 0 8px">' + esc(selected.name) + '</h4>' +
        '<div class="chips" id="tabsC">' + selected.tabs.map((t) => '<button class="chip' + (t === selTab ? ' on' : '') + '" data-t="' + esc(t.name) + '">' + esc(t.name) + ' <span class="count">' + t.rows.length + '</span></button>').join('') + '</div>' +
        '<p class="muted" style="font-size:.85rem;margin:12px 0 8px">Vista previa de la pestaña "' + esc(selTab.name) + '" (' + selTab.rows.length + ' filas, ' + selTab.headers.length + ' columnas):</p>' + sheetTable(selTab, 5) +
        (selTab.headers.length < 4 ? '<div class="alert alert-warn" style="margin-top:12px">' + I('alert') + '<p>Esta pestaña tiene pocas columnas; probablemente no sea una lista de productos.</p></div>' : '') +
        '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button class="btn btn-ghost" id="cancel">Cancelar</button><button class="btn btn-primary" id="use">' + I('check') + 'Usar esta pestaña</button></div>';
      m.body.querySelector('#back').onclick = step1;
      m.body.querySelector('#cancel').onclick = () => m.close();
      $$('[data-t]', m.body).forEach((b) => (b.onclick = () => { selTab = selected.tabs.find((t) => t.name === b.dataset.t); step2(); }));
      m.body.querySelector('#use').onclick = () => {
        const changed = D.act((d, uid) => {
          const ws = d.workspaces[uid];
          const prevHeaders = ws.mapping && ws.mapping.headers ? ws.mapping.headers.join('|') : '';
          Object.assign(ws.integrations.sheets, { sheetId: selected.id, tab: selTab.name });
          if (prevHeaders !== selTab.headers.join('|')) { ws.mapping = Object.assign(CA.products.autoMap(selTab.headers), { headers: selTab.headers.slice(), draft: true }); }
          ws.products = [];
          return true;
        }, 'Hoja seleccionada: ' + selected.name + ' › ' + selTab.name, { noRender: true });
        m.close();
        if (changed) { ui.toast('Revisa el mapeo de columnas sugerido y sincroniza.', 'info'); D.go('mapeo'); }
      };
    };
    step1();
  }
  CA.pickSheet = pickSheet;

  /* ---------------- Drive ---------------- */
  function renderDrive(box, params) {
    const ws = D.ws(), db = D.db(), user = D.user();
    const dr = ws.integrations.drive;
    if (!dr.connected) {
      box.innerHTML = '<div class="card connect-hero">' + DRIVE_LOGO + '<h3>Vincula tus imágenes de Google Drive</h3><p class="muted">Sube las fotos a una carpeta y nómbralas como en tu hoja (por ejemplo <b>LAP-001.jpg</b>). Las asociamos automáticamente a cada producto.</p>' +
        '<ul class="checks-inline"><li>' + I('check') + 'Solo lectura</li><li>' + I('check') + 'JPG, PNG o WEBP</li><li>' + I('check') + 'Galería con varias fotos por producto</li></ul>' +
        '<button class="btn btn-primary btn-lg" id="connDrive">' + I('google') + 'Conectar Google Drive</button></div>';
      $('#connDrive').onclick = async () => {
        if (!(await authorize('drive'))) return;
        D.act((d, uid) => Object.assign(d.workspaces[uid].integrations.drive, { connected: true, account: user.email }), 'Google Drive conectado (simulado)');
      };
      return;
    }
    const cur = params.get('f') || dr.folderId || 'fd-root';
    const folder = CA.products.folder(db, cur) || CA.products.folder(db, 'fd-root');
    const path = [];
    for (let f = folder; f; f = f.parent ? CA.products.folder(db, f.parent) : null) path.unshift(f);
    const subs = db.drive.filter((f) => f.parent === folder.id);
    const files = folder.files || [];
    const selected = dr.folderId === folder.id;
    // asociación con productos (según la columna de imagen)
    let assoc = '';
    if (dr.folderId) {
      const sel = CA.products.folder(db, dr.folderId);
      const names = new Set((sel.files || []).map((f) => f.name.toLowerCase()));
      const prods = (ws.products || []);
      const withImg = prods.filter((p) => p.image).length;
      const missing = prods.filter((p) => p.issues.some((x) => x.type === 'image'));
      const extra = (sel.files || []).filter((f) => !prods.some((p) => p.gallery.includes(f.art))).length;
      assoc = '<div class="card" style="margin-top:16px"><div class="card-head"><h3>' + I('link') + 'Asociación de imágenes con productos</h3><button class="btn btn-sm btn-primary" id="reassoc">' + I('sync') + 'Volver a asociar</button></div>' +
        '<div class="assoc-stats"><div><b>' + withImg + '</b><span>productos con imagen</span></div><div><b class="text-warn">' + missing.length + '</b><span>sin imagen encontrada</span></div><div><b>' + names.size + '</b><span>archivos en la carpeta</span></div><div><b>' + extra + '</b><span>archivos sin usar</span></div></div>' +
        '<p class="muted" style="font-size:.85rem">Regla: el nombre del archivo en la columna de imagen de tu hoja debe coincidir con un archivo de la carpeta <b>' + esc(sel.name) + '</b>. Para la galería se usan los archivos de la columna de galería.</p>' +
        (missing.length ? '<div class="table-wrap stack"><table class="table"><thead><tr><th>Fila</th><th>SKU</th><th>Producto</th><th>Problema</th></tr></thead><tbody>' + missing.map((p) => '<tr><td data-l="Fila">' + p.row + '</td><td data-l="SKU" class="mono">' + esc(p.sku) + '</td><td data-l="Producto">' + esc(p.name || '—') + '</td><td data-l="Problema"><span class="text-warn">' + esc(p.issues.find((x) => x.type === 'image').msg) + '</span></td></tr>').join('') + '</tbody></table></div>' : '<div class="alert alert-ok">' + I('check') + '<p>Todas las imágenes de la hoja se encontraron en la carpeta.</p></div>') + '</div>';
    }
    box.innerHTML = '<div class="card"><div class="card-head"><h3>' + I('folder') + 'Explorador de Drive</h3><span class="muted" style="font-size:.85rem">' + esc(dr.account) + '</span></div>' +
      '<div class="crumbs">' + path.map((f, i) => (i ? I('right') : '') + '<a href="#/integraciones?tab=drive&f=' + f.id + '">' + esc(f.name) + '</a>').join('') + '</div>' +
      '<div class="drive-bar">' + (selected ? ui.badge('Carpeta seleccionada para el catálogo', 'ok', 'check') : files.length ? '<button class="btn btn-primary btn-sm" id="useFolder">' + I('check') + 'Usar esta carpeta (' + files.length + ' imágenes)</button>' : '<span class="muted" style="font-size:.85rem">Abre una carpeta con imágenes para seleccionarla.</span>') +
      '<button class="btn btn-sm btn-danger-ghost" id="discDrive" style="margin-left:auto">Desconectar</button></div>' +
      (subs.length ? '<div class="folders">' + subs.map((f) => '<a class="folder" href="#/integraciones?tab=drive&f=' + f.id + '">' + I('folder') + '<div><b>' + esc(f.name) + '</b><small>' + (f.files ? f.files.length + ' archivos' : db.drive.filter((x) => x.parent === f.id).length + ' carpetas') + '</small></div>' + (dr.folderId === f.id ? ui.badge('En uso', 'ok') : '') + '</a>').join('') + '</div>' : '') +
      (files.length ? '<div class="img-grid">' + files.slice(0, 48).map((f, i) => '<button class="img-tile" data-i="' + i + '"><img src="' + CA.imgSrc(f.art) + '" alt="" loading="lazy" ' + CA.imgFallbackAttr + '><span>' + esc(f.name) + '</span></button>').join('') + '</div>' + (files.length > 48 ? '<p class="muted" style="font-size:.85rem">Mostrando 48 de ' + files.length + ' archivos.</p>' : '') : (!subs.length ? ui.empty('folder', 'Carpeta vacía', 'No hay imágenes en esta carpeta.') : '')) +
      '</div>' + assoc;
    const uf = $('#useFolder'); if (uf) uf.onclick = () => {
      D.act((d, uid) => { Object.assign(d.workspaces[uid].integrations.drive, { folderId: folder.id, lastScan: CA.now().toISOString() }); if (d.workspaces[uid].integrations.sheets.connected && d.workspaces[uid].mapping) CA.products.sync(d, uid, { mode: 'drive' }); }, 'Carpeta "' + folder.name + '" vinculada. Imágenes asociadas por nombre de archivo.');
    };
    $$('.img-tile', box).forEach((t) => (t.onclick = () => {
      const f = files[+t.dataset.i];
      ui.modal({ title: f.name, icon: 'image2', size: 'sm', body: '<img src="' + CA.imgSrc(f.art) + '" alt="" style="width:100%;border-radius:12px;border:1px solid var(--line)"><p class="muted" style="font-size:.85rem;margin:10px 0 0">Carpeta: ' + esc(folder.name) + ' · imagen de demostración</p>', actions: [{ label: 'Cerrar', cls: 'btn-primary' }] });
    }));
    const ra = $('#reassoc'); if (ra) ra.onclick = () => D.runSync({ mode: 'drive' });
    $('#discDrive').onclick = async () => {
      if (!(await ui.confirm({ title: 'Desconectar Google Drive', message: 'Los productos se mostrarán con imágenes de respaldo hasta que vuelvas a conectar una carpeta.', confirmLabel: 'Desconectar', danger: true }))) return;
      D.act((d, uid) => { Object.assign(d.workspaces[uid].integrations.drive, { connected: false, folderId: '' }); if (d.workspaces[uid].integrations.sheets.connected && d.workspaces[uid].mapping) CA.products.sync(d, uid, { mode: 'drive' }); }, 'Google Drive desconectado');
    };
  }

  /* =========================================================
     MAPEO DE COLUMNAS
     ========================================================= */
  D.view('mapeo', { title: 'Mapeo de columnas', icon: 'sliders', sub: 'Cómo se interpretan las columnas de tu hoja', render: renderMapping });
  let draft = null;

  function renderMapping(el) {
    const ws = D.ws(), db = D.db();
    const sh = ws.integrations.sheets;
    const tab = sh.connected && sh.sheetId ? CA.products.tab(db, sh.sheetId, sh.tab) : null;
    if (!tab) { el.innerHTML = D.emptyStep('sheet', 'Primero conecta Google Sheets', 'Elige la hoja y la pestaña con tus productos para configurar las columnas.', '#/integraciones', 'Ir a Integraciones'); return; }
    if (!draft || draft.key !== sh.sheetId + '|' + sh.tab) {
      const base = ws.mapping ? u.clone(ws.mapping) : CA.products.autoMap(tab.headers);
      draft = { key: sh.sheetId + '|' + sh.tab, fields: base.fields, attributes: base.attributes || [], filters: base.filters || [] };
    }
    const preview = () => {
      const fake = u.clone(ws);
      fake.mapping = { fields: draft.fields, attributes: draft.attributes, filters: draft.filters };
      return CA.products.build(db, fake);
    };
    const res = preview();
    const used = Object.values(draft.fields).filter(Boolean);
    const attrCandidates = tab.headers.filter((h) => !used.includes(h));
    const sample = (col) => { if (!col) return ''; const i = tab.headers.indexOf(col); const r = tab.rows.find((x) => String(x[i] || '').trim()); return r ? String(r[i]).slice(0, 40) : ''; };
    const filterOpts = draft.attributes.concat(draft.fields.brand ? ['__brand'] : []);
    const typeLabel = { missing: 'Datos faltantes', duplicate: 'SKU duplicado', image: 'Imagen no encontrada' };
    const groups = {};
    res.issues.forEach((x) => { (groups[x.type] = groups[x.type] || []).push(x); });
    const dirty = JSON.stringify({ f: draft.fields, a: draft.attributes, fl: draft.filters }) !== JSON.stringify(ws.mapping ? { f: ws.mapping.fields, a: ws.mapping.attributes, fl: ws.mapping.filters } : null);

    el.innerHTML = '<div class="view-in">' +
      '<div class="map-head card"><div>' + I('sheet') + '<b>' + esc(CA.products.sheet(db, sh.sheetId).name) + '</b> › ' + esc(sh.tab) + ' <span class="muted">· ' + tab.rows.length + ' filas · ' + tab.headers.length + ' columnas</span></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' + (dirty ? ui.badge('Cambios sin guardar', 'warn') : ws.mapping ? ui.badge('Mapeo guardado', 'ok', 'check') : '') +
      '<button class="btn btn-sm btn-ghost" id="mAuto">' + I('sparkles') + 'Sugerir automáticamente</button><button class="btn btn-sm btn-primary" id="mSave">' + I('check') + 'Guardar y sincronizar</button></div></div>' +
      '<div class="map-grid">' +
      '<div class="card"><div class="card-head"><h3>' + I('sliders') + 'Campos del catálogo</h3></div><p class="card-sub">Elige qué columna de tu hoja corresponde a cada dato. Los campos con * son obligatorios.</p>' +
      '<div class="map-rows">' + CA.products.FIELDS.map((f) => {
        const v = draft.fields[f.key] || '';
        return '<div class="map-row' + (f.required && !v ? ' missing' : '') + '"><div class="mr-l"><b>' + f.label + (f.required ? ' <i class="req">*</i>' : '') + '</b>' + (f.key === 'category' ? '<small>Agrupa los productos y crea el menú de categorías</small>' : f.key === 'gallery' ? '<small>Varios archivos separados por coma</small>' : '') + '</div>' +
          '<select data-f="' + f.key + '"><option value="">— Sin asignar —</option>' + tab.headers.map((h, i) => '<option value="' + esc(h) + '"' + (h === v ? ' selected' : '') + '>' + String.fromCharCode(65 + i) + ' · ' + esc(h) + '</option>').join('') + '</select>' +
          '<span class="mr-s" title="Ejemplo de la hoja">' + (v ? esc(sample(v)) || '<i class="muted">vacío</i>' : '<i class="muted">—</i>') + '</span></div>';
      }).join('') + '</div>' +
      '<h4 class="map-sub">Atributos personalizados</h4><p class="card-sub">Columnas adicionales que se muestran en el detalle del producto (talla, color, garantía…).</p>' +
      '<div class="chips">' + (attrCandidates.length ? attrCandidates.map((h) => '<label class="chip' + (draft.attributes.includes(h) ? ' on' : '') + '"><input type="checkbox" hidden data-attr="' + esc(h) + '"' + (draft.attributes.includes(h) ? ' checked' : '') + '>' + esc(h) + '</label>').join('') : '<span class="muted" style="font-size:.85rem">Todas las columnas ya están asignadas.</span>') + '</div>' +
      '<h4 class="map-sub">Filtros del catálogo</h4><p class="card-sub">La categoría siempre es un filtro. Elige qué otros atributos se usan para filtrar.</p>' +
      '<div class="chips">' + (filterOpts.length ? filterOpts.map((h) => '<label class="chip' + (draft.filters.includes(h) ? ' on' : '') + '"><input type="checkbox" hidden data-filter="' + esc(h) + '"' + (draft.filters.includes(h) ? ' checked' : '') + '>' + I('filter') + ' ' + esc(CA.products.filterLabel(h)) + '</label>').join('') : '<span class="muted" style="font-size:.85rem">Agrega atributos o asigna la marca para usarlos como filtros.</span>') + '</div>' +
      '</div>' +
      '<div class="map-side">' +
      '<div class="card"><div class="card-head"><h3>' + I('eye') + 'Así se verán tus productos</h3></div><div class="map-prev">' +
      res.products.filter((p) => p.sync !== 'error').slice(0, 3).map((p) => '<div class="mp-card"><img src="' + CA.imgSrc(p.image) + '" alt="" ' + CA.imgFallbackAttr + '><div><small class="muted">' + esc(p.category) + (p.brand ? ' · ' + esc(p.brand) : '') + '</small><b>' + esc(p.name) + '</b><span class="mp-price">' + (p.offer ? '<s>' + u.money(p.price) + '</s> ' + u.money(p.offer) : u.money(p.price)) + '</span>' + ui.badge(CA.products.AVAIL[p.availability].label, CA.products.AVAIL[p.availability].tone) +
        (Object.keys(p.attributes).length ? '<div class="mp-attrs">' + Object.keys(p.attributes).map((k) => '<span>' + esc(k) + ': <b>' + esc(p.attributes[k]) + '</b></span>').join('') + '</div>' : '') + '</div></div>').join('') + '</div></div>' +
      '<div class="card"><div class="card-head"><h3>' + I('shield') + 'Validación</h3></div>' +
      '<div class="val-stats"><div class="ok"><b>' + res.stats.ok + '</b><span>correctos</span></div><div class="warn"><b>' + res.stats.warnings + '</b><span>advertencias</span></div><div class="bad"><b>' + res.stats.errors + '</b><span>errores</span></div></div>' +
      (res.issues.length ? Object.keys(groups).map((k) => '<div class="val-group"><h5>' + ui.badge(typeLabel[k] + ' · ' + groups[k].length, groups[k][0].level === 'error' ? 'bad' : 'warn') + '</h5><ul>' + groups[k].slice(0, 6).map((x) => '<li><span class="mono">Fila ' + x.row + '</span> ' + esc(x.sku || '(sin SKU)') + ' — ' + esc(x.msg) + '</li>').join('') + (groups[k].length > 6 ? '<li class="muted">y ' + (groups[k].length - 6) + ' más…</li>' : '') + '</ul></div>').join('') +
        '<p class="muted" style="font-size:.8rem;margin:10px 0 0">Las filas con errores no se publican. Corrígelas en tu hoja de Google Sheets y vuelve a sincronizar.</p>' : '<div class="alert alert-ok">' + I('check') + '<p>No se encontraron problemas.</p></div>') + '</div>' +
      '</div></div>' +
      '<div class="card" style="margin-top:16px"><div class="card-head"><h3>' + I('sheet') + 'Columnas de la hoja</h3><span class="muted" style="font-size:.85rem">Resaltadas las columnas asignadas</span></div>' + sheetTable(tab, 4, used) + '</div>' +
      '</div>';

    $$('[data-f]', el).forEach((s) => (s.onchange = () => {
      const key = s.dataset.f, val = s.value;
      // una columna solo puede asignarse a un campo
      Object.keys(draft.fields).forEach((k) => { if (k !== key && draft.fields[k] === val && val) draft.fields[k] = ''; });
      draft.fields[key] = val;
      draft.attributes = draft.attributes.filter((a) => !Object.values(draft.fields).includes(a));
      draft.filters = draft.filters.filter((x) => x === '__brand' ? !!draft.fields.brand : draft.attributes.includes(x));
      renderMapping(el);
    }));
    $$('[data-attr]', el).forEach((c) => (c.onchange = () => {
      const h = c.dataset.attr;
      draft.attributes = c.checked ? draft.attributes.concat(h) : draft.attributes.filter((x) => x !== h);
      draft.filters = draft.filters.filter((x) => x === '__brand' || draft.attributes.includes(x));
      renderMapping(el);
    }));
    $$('[data-filter]', el).forEach((c) => (c.onchange = () => {
      const h = c.dataset.filter;
      draft.filters = c.checked ? draft.filters.concat(h) : draft.filters.filter((x) => x !== h);
      renderMapping(el);
    }));
    $('#mAuto').onclick = () => { const a = CA.products.autoMap(tab.headers); draft.fields = a.fields; draft.attributes = a.attributes; draft.filters = a.filters; renderMapping(el); ui.toast('Mapeo sugerido según los nombres de las columnas', 'info'); };
    $('#mSave').onclick = () => {
      const miss = CA.products.FIELDS.filter((f) => f.required && !draft.fields[f.key]);
      if (miss.length) return ui.toast('Asigna los campos obligatorios: ' + miss.map((f) => f.label).join(', '), 'error');
      CA.store.tx((d, uid) => { const w = d.workspaces[CA.session.userId()]; w.mapping = { fields: u.clone(draft.fields), attributes: draft.attributes.slice(), filters: draft.filters.slice(), headers: tab.headers.slice() }; });
      D.runSync({ mode: 'mapeo' });
    };
  }
})();
