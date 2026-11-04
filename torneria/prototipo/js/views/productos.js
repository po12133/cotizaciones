(function () {
  const TOR = window.TOR;
  const S = TOR.store, C = TOR.cmp, L = TOR.labels, A = TOR.app;
  const { esc, fmt } = TOR.ui;
  const icon = TOR.icon;
  const st = C.state('productos', { q: '', cat: '', marca: '' });
  const HEAD = ['SKU', 'Nombre', 'Categoría', 'Marca', 'Descripción', 'Unidad', 'Costo de compra', 'Precio de venta', 'Stock mínimo'];
  const marcas = () => [...new Set(S.db.productos.map((p) => p.marca).filter(Boolean))].sort();

  function render(el) {
    const t = st.q.trim().toLowerCase();
    const rows = S.db.productos.filter((p) => p.activo && (!st.cat || p.categoria === st.cat) && (!st.marca || p.marca === st.marca) && (!t || [p.nombre, p.sku, p.marca || ''].some((x) => x.toLowerCase().includes(t))));
    const write = A.can('productos');
    el.innerHTML = `
      <div class="page-head"><div><p class="lead">Catálogo único de los productos que la empresa importa, compra y comercializa: SKU, categoría, marca, unidad de medida, costo de compra, precio de venta y stock por sucursal. Compartido por todas las sucursales.</p></div>
        <div class="actions"><button class="btn btn-outline" id="pExp">${icon('excel', 'sm')}Exportar Excel</button>${write ? `<button class="btn btn-outline" id="pImp">${icon('upload', 'sm')}Importar Excel</button><button class="btn btn-primary" id="pNew">${icon('plus', 'sm')}Nuevo producto</button>` : A.actionBtn('productos', '')}</div></div>
      <div class="card">
        <div class="filters">
          <div class="input-icon">${icon('search', 'sm')}<input class="input" id="pQ" type="search" placeholder="Nombre, SKU o marca" value="${esc(st.q)}"></div>
          <select class="select" id="pCat" aria-label="Categoría"><option value="">Todas las categorías</option>${S.db.categorias.map((c) => `<option ${st.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
          <select class="select" id="pMarca" aria-label="Marca"><option value="">Todas las marcas</option>${marcas().map((m) => `<option ${st.marca === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select>
          <span class="count">${rows.length} productos</span>
        </div>
        <div id="pBody"></div>
      </div>`;
    C.dataTable(el.querySelector('#pBody'), {
      id: 'productos', rows, pageSize: 15, defaultSort: 'sku', defaultDir: 'asc',
      empty: { icon: 'package', title: 'Sin productos con estos filtros' },
      columns: [
        { key: 'sku', label: 'SKU', cls: 'code', sort: (p) => p.sku, render: (p) => esc(p.sku) },
        { key: 'nombre', label: 'Producto', sort: (p) => p.nombre, render: (p) => `<b>${esc(p.nombre)}</b><span class="sub">${esc(p.categoria)}</span>` },
        { key: 'marca', label: 'Marca', sort: (p) => p.marca || '', render: (p) => (p.marca ? A.badge(p.marca, 'plain') : '<span class="muted">—</span>') },
        { key: 'unidad', label: 'Unidad', render: (p) => esc(p.unidad) },
        { key: 'costo', label: 'Costo compra', align: 'right', sort: (p) => p.costo, render: (p) => fmt.money(p.costo) },
        { key: 'precio', label: 'Precio venta', align: 'right', sort: (p) => p.precio, render: (p) => `<b>${fmt.money(p.precio)}</b>` },
        { key: 'margen', label: 'Margen', align: 'right', sort: (p) => (p.precio ? (p.precio - p.costo) / p.precio : 0), render: (p) => (p.precio ? fmt.pct((p.precio - p.costo) / p.precio) : '—') },
        { key: 'stock', label: 'Stock', align: 'right', sort: (p) => S.stockTotal(p.id), render: (p) => `${fmt.qty(S.stockTotal(p.id))} ${esc(p.unidad)}` }
      ],
      onRow: (p) => open(p.id)
    });
    const q = el.querySelector('#pQ');
    q.addEventListener('input', () => { st.q = q.value; C.resetPage('productos'); A.render(); const n = document.getElementById('pQ'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); });
    el.querySelector('#pCat').addEventListener('change', (e) => { st.cat = e.target.value; C.resetPage('productos'); A.render(); });
    el.querySelector('#pMarca').addEventListener('change', (e) => { st.marca = e.target.value; C.resetPage('productos'); A.render(); });
    el.querySelector('#pExp').addEventListener('click', () => {
      C.csv(`productos-${S.today()}.csv`, HEAD, rows.map((p) => [p.sku, p.nombre, p.categoria, p.marca || '', p.descripcion || '', p.unidad, C.n2(p.costo), C.n2(p.precio), p.stockMin]));
      TOR.ui.toast('Catálogo exportado', { text: `${rows.length} productos (CSV compatible con Excel).` });
    });
    const nb = el.querySelector('#pNew');
    if (nb) nb.addEventListener('click', () => form());
    const ib = el.querySelector('#pImp');
    if (ib) ib.addEventListener('click', importar);
  }

  function form(p) {
    const edit = !!p;
    C.formModal({
      title: edit ? `Editar ${p.sku}` : 'Nuevo producto', sub: edit ? esc(p.nombre) : 'Se agrega al catálogo de todas las sucursales.', submit: edit ? 'Guardar cambios' : 'Crear producto',
      body: `<div class="form-grid">
        <label class="field"><span>SKU *</span><input class="input" name="sku" value="${esc(edit ? p.sku : '')}" ${edit ? 'readonly' : ''} placeholder="Ej.: ROD-6206" style="text-transform:uppercase"></label>
        <label class="field"><span>Marca</span><input class="input" name="marca" list="pMarcas" value="${esc(edit ? p.marca || '' : '')}" placeholder="Ej.: Rodatec"><datalist id="pMarcas">${marcas().map((m) => `<option value="${esc(m)}">`).join('')}</datalist></label>
        <label class="field full"><span>Nombre *</span><input class="input" name="nombre" value="${esc(edit ? p.nombre : '')}" placeholder="Ej.: Rodamiento 6206 2RS"></label>
        <label class="field full"><span>Descripción</span><input class="input" name="descripcion" value="${esc(edit ? p.descripcion || '' : '')}" placeholder="Ej.: Rodamiento rígido de bolas sellado, importado"></label>
        <label class="field"><span>Categoría *</span><select class="select" name="categoria">${S.db.categorias.map((c) => `<option ${edit && p.categoria === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
        <label class="field"><span>Unidad de medida *</span><select class="select" name="unidad">${S.db.unidades.map((u) => `<option value="${u.id}" ${edit && p.unidad === u.id ? 'selected' : ''}>${esc(u.nombre)} (${esc(u.abrev)})</option>`).join('')}</select></label>
        <label class="field"><span>Costo de compra (Bs) *</span><input class="input" type="number" name="costo" min="0" step="0.01" value="${edit ? p.costo : ''}"></label>
        <label class="field"><span>Precio de venta (Bs) *</span><input class="input" type="number" name="precio" min="0" step="0.01" value="${edit ? p.precio : ''}"><small id="pMarg"></small></label>
        <label class="field"><span>Stock mínimo (casa matriz)</span><input class="input" type="number" name="stockMin" min="0" step="1" value="${edit ? p.stockMin : 0}"><small>En otras sucursales se ajusta según su tamaño.</small></label>
        ${edit ? '' : `<label class="field"><span>Stock inicial</span><input class="input" type="number" name="stockInicial" min="0" step="any" value="0"></label><label class="field"><span>Sucursal del stock inicial</span><select class="select" name="sucursal">${C.sucursalOptions(C.defaultSucursal())}</select></label>`}
      </div>
      ${edit ? `<div class="section-title">${icon('box', 'sm')}Existencias por sucursal</div><ul class="list-plain" style="border:1px solid var(--line);border-radius:8px">${S.db.sucursales.map((s) => `<li><span>${esc(s.nombre)}<small>Mínimo ${S.minOf(p.id, s.id)} ${esc(p.unidad)}</small></span><b>${fmt.qty(S.stockOf(s.id, p.id))} ${esc(p.unidad)}</b></li>`).join('')}</ul><button type="button" class="btn btn-ghost btn-sm" data-kardex style="margin-top:8px">${icon('history', 'sm')}Ver kardex</button>` : ''}`,
      rules: { sku: { required: true, minLen: 3 }, nombre: { required: true, minLen: 3 }, costo: { required: true, number: true, nonNegative: true }, precio: { required: true, number: true, nonNegative: true }, stockMin: { number: true, nonNegative: true }, stockInicial: { number: true, nonNegative: true } },
      onOpen: (el, close, f) => {
        const upd = () => { const c = Number(f.costo.value), pr = Number(f.precio.value); el.querySelector('#pMarg').textContent = pr > 0 ? `Margen: ${fmt.pct((pr - c) / pr)}${pr < c ? ' · el precio es menor al costo' : ''}` : ''; };
        f.costo.addEventListener('input', upd); f.precio.addEventListener('input', upd); upd();
        const k = el.querySelector('[data-kardex]');
        if (k) k.addEventListener('click', () => { close(); TOR.views.inventario.kardex(p.id); });
        if (!A.can('productos')) { el.querySelectorAll('input,select').forEach((i) => { i.disabled = true; }); el.querySelector('[data-submit]').hidden = true; }
      },
      onSubmit: (d, close) => {
        const ok = edit ? A.run(() => S.ops.updateProduct(p.id, d), 'Producto actualizado') : A.run(() => S.ops.createProduct(d), 'Producto creado', (r) => `${r.sku} · ${r.nombre}`);
        if (ok) close();
      }
    });
  }
  function open(id) { const p = S.prod(id); if (p) form(p); }

  function parseCSV(text) {
    const sep = (text.split('\n')[0].match(/;/g) || []).length >= (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    return text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim()).map((l) => { const out = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === sep && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map((x) => x.trim()); });
  }
  function importar() {
    const m = TOR.ui.modal({
      title: 'Importar productos desde Excel',
      sub: 'Guarde la planilla como CSV (separado por comas o punto y coma). Los SKU existentes se actualizan; los nuevos se crean.',
      body: `<div class="stack"><div class="info-box">${icon('info', 'sm')}<span>Columnas esperadas: ${HEAD.join(' · ')}. Descargue la plantilla para ver el formato.</span></div>
        <input type="file" class="input" accept=".csv,text/csv" id="impFile" style="padding:7px">
        <div id="impPrev"></div></div>`,
      foot: `<button class="btn btn-ghost" data-tpl>${icon('download', 'sm')}Descargar plantilla</button><span class="spacer"></span><button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" data-imp disabled>${icon('upload', 'sm')}Importar</button>`
    });
    let parsed = [];
    m.el.querySelector('[data-tpl]').addEventListener('click', () => C.csv('plantilla-productos.csv', HEAD, [['ACE-1045-250', 'Barra redonda acero SAE 1045 Ø 2 1/2"', 'Barras de acero', 'MetalPro', 'Barra importada de 6 m', 'm', '210', '285', '10'], ['ROD-6206', 'Rodamiento 6206 2RS', 'Rodamientos', 'Rodatec', 'Rodamiento rígido de bolas sellado', 'pza', '38', '56', '15']]));
    m.el.querySelector('#impFile').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const rows = parseCSV(await file.text());
      const body = rows.slice(/sku/i.test(rows[0][0]) ? 1 : 0);
      const num = (v) => Number(String(v || '').replace(/\./g, '').replace(',', '.')) || Number(v) || 0;
      parsed = body.filter((r) => r[0] && r[1]).map((r) => ({ sku: r[0].toUpperCase(), nombre: r[1], categoria: S.db.categorias.includes(r[2]) ? r[2] : 'Repuestos', marca: r[3] || '', descripcion: r[4] || '', unidad: S.db.unidades.some((u) => u.id === r[5]) ? r[5] : 'pza', costo: num(r[6]), precio: num(r[7]), stockMin: num(r[8]) }));
      const nuevos = parsed.filter((r) => !S.db.productos.some((p) => p.sku === r.sku)).length;
      m.el.querySelector('#impPrev').innerHTML = parsed.length ? `<p><b>${parsed.length}</b> filas válidas · ${nuevos} nuevas · ${parsed.length - nuevos} actualizaciones</p><div class="table-wrap" style="max-height:220px"><table class="table"><thead><tr><th>SKU</th><th>Nombre</th><th>Marca</th><th class="right">Costo</th><th class="right">Precio</th></tr></thead><tbody>${parsed.slice(0, 8).map((r) => `<tr><td class="mono">${esc(r.sku)}</td><td>${esc(r.nombre)}</td><td>${esc(r.marca)}</td><td class="right">${fmt.money(r.costo)}</td><td class="right">${fmt.money(r.precio)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="info-box warning">${icon('alert', 'sm')}<span>No se encontraron filas válidas en el archivo.</span></div>`;
      m.el.querySelector('[data-imp]').disabled = !parsed.length;
    });
    m.el.querySelector('[data-imp]').addEventListener('click', () => { const r = A.run(() => S.ops.importProducts(parsed), 'Importación completada', (x) => `${x.creados} nuevos · ${x.actualizados} actualizados`); if (r) m.close(); });
  }

  TOR.views.productos = { render, open, form };
})();
