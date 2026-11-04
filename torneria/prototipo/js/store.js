/*
 * Estado del prototipo (SIMULADO): base de datos de demostración en localStorage.
 * Cada operación aplica las reglas de negocio que tendría el sistema real (stock, kardex, caja,
 * estados) pero nada sale del navegador. Restablecer = volver a generar los datos de ejemplo.
 */
(function (root) {
  const TOR = root.TOR;
  const KEY = 'torneria:demo-db';
  const UI_KEY = 'torneria:demo-ui';
  const VERSION = 4;
  const r2 = (v) => Math.round(v * 100) / 100;
  const listeners = new Set();

  let db = load();
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && raw.version === VERSION) return raw;
    } catch (e) { /* datos corruptos: se regeneran */ }
    const fresh = TOR.demoData.generate();
    persist(fresh);
    return fresh;
  }
  function persist(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { console.warn('No se pudo guardar el estado de la demo', e); }
  }
  function commit(evt) {
    persist(db);
    listeners.forEach((fn) => fn(evt));
  }
  window.addEventListener('storage', (e) => { if (e.key === KEY && e.newValue) { db = JSON.parse(e.newValue); listeners.forEach((fn) => fn({ type: 'sync' })); } });

  // ---------- Estado de interfaz ----------
  const uiState = Object.assign({ sucursal: '*', usuario: 'U1' }, safeParse(localStorage.getItem(UI_KEY)));
  function safeParse(s) { try { return JSON.parse(s) || {}; } catch (e) { return {}; } }
  function setUI(patch) { Object.assign(uiState, patch); localStorage.setItem(UI_KEY, JSON.stringify(uiState)); listeners.forEach((fn) => fn({ type: 'ui' })); }

  // ---------- Utilidades ----------
  const now = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19); };
  const today = () => now().slice(0, 10);
  const nextCode = (key, prefix, pad = 4, start = 1) => { db.seq[key] = (db.seq[key] || start - 1) + 1; return `${prefix}-${String(db.seq[key]).padStart(pad, '0')}`; };
  const find = (list, id) => list.find((x) => x.id === id);
  const prod = (id) => find(db.productos, id);
  const cli = (id) => find(db.clientes, id);
  const prov = (id) => find(db.proveedores, id);
  const user = (id) => find(db.usuarios, id);
  const suc = (id) => find(db.sucursales, id);
  const rol = (id) => find(db.roles, id);
  const me = () => user(uiState.usuario);
  const inScope = (sucId) => uiState.sucursal === '*' || sucId === uiState.sucursal;
  const scoped = (list, field = 'sucursal') => list.filter((x) => inScope(x[field]));
  const stockOf = (s, p) => (db.stock[s] && db.stock[s][p]) || 0;
  const minOf = (p, s) => { const sc = suc(s); const pr = prod(p); return Math.max(1, Math.round(pr.stockMin * ((sc && sc.factor) || 0.5))); };
  const stockTotal = (p) => db.sucursales.filter((s) => inScope(s.id)).reduce((t, s) => t + stockOf(s.id, p), 0);

  class OpError extends Error {}
  const fail = (msg) => { throw new OpError(msg); };

  function log(accion, modulo) {
    db.actividad.unshift({ fecha: now(), usuario: uiState.usuario, accion, modulo });
    db.actividad = db.actividad.slice(0, 80);
  }
  function notify(titulo, texto, tipo = 'info', link = '') {
    db.notificaciones.unshift({ id: `N${Date.now()}${Math.random().toString(36).slice(2, 5)}`, fecha: now(), titulo, texto, tipo, link, leida: false });
    db.notificaciones = db.notificaciones.slice(0, 30);
  }
  function move(sucursal, producto, cantidad, tipo, origen, ref, nota) {
    if (!db.stock[sucursal]) db.stock[sucursal] = {};
    db.stock[sucursal][producto] = r2(stockOf(sucursal, producto) + cantidad);
    const p = prod(producto);
    db.movimientos.push({ id: `M${db.movimientos.length + 1}-${Date.now() % 100000}`, fecha: now(), sucursal, producto, cantidad: r2(cantidad), saldo: db.stock[sucursal][producto], tipo, origen, ref, costo: p.costo, usuario: uiState.usuario, nota: nota || '' });
    if (cantidad < 0 && db.stock[sucursal][producto] <= minOf(producto, sucursal)) notify('Stock bajo', `${p.nombre} en ${suc(sucursal).nombre}: ${db.stock[sucursal][producto]} ${p.unidad}`, 'warning', '#/inventario');
  }
  function cash(sucursal, tipo, concepto, categoria, monto, ref, metodo) {
    db.caja.movimientos.unshift({ id: `K${db.caja.movimientos.length + 1}-${Date.now() % 100000}`, fecha: now(), sucursal, tipo, concepto, categoria, monto: r2(monto), ref: ref || '', metodo: metodo || 'efectivo', usuario: uiState.usuario });
    const ses = cajaAbierta(sucursal);
    if (ses && (metodo || 'efectivo') === 'efectivo') ses.montoEsperado = r2(ses.montoEsperado + (tipo === 'ingreso' ? monto : -monto));
  }
  const cajaAbierta = (s) => db.caja.sesiones.find((x) => x.sucursal === s && x.estado === 'abierta');
  /** Las operaciones en efectivo requieren la caja abierta; un egreso no puede superar el efectivo disponible. */
  function requireCash(sucId, metodo, egreso = 0) {
    if ((metodo || 'efectivo') !== 'efectivo') return;
    const ses = cajaAbierta(sucId);
    if (!ses) fail(`La caja de ${suc(sucId).nombre} está cerrada. Ábrala en el módulo Caja para operar en efectivo o elija otro método de pago.`);
    if (egreso > ses.montoEsperado) fail(`Efectivo insuficiente en la caja de ${suc(sucId).nombre}: disponible Bs ${ses.montoEsperado}, requerido Bs ${r2(egreso)}. Elija transferencia u otro método.`);
  }
  const cleanItems = (items) => items.filter((it) => it.producto && Number(it.cantidad) > 0).map((it) => ({ producto: it.producto, cantidad: r2(Number(it.cantidad)), precio: it.precio !== undefined ? r2(Number(it.precio)) : undefined, costo: it.costo !== undefined ? r2(Number(it.costo)) : prod(it.producto).costo }));
  function checkStock(sucursal, items) {
    if (db.parametros.permitirStockNegativo) return;
    const need = {};
    items.forEach((it) => { need[it.producto] = (need[it.producto] || 0) + it.cantidad; });
    Object.entries(need).forEach(([p, q]) => { const d = stockOf(sucursal, p); if (q > d) fail(`Stock insuficiente de "${prod(p).nombre}" en ${suc(sucursal).nombre}: disponible ${d} ${prod(p).unidad}, solicitado ${q}.`); });
  }

  // ---------- Operaciones ----------
  const ops = {
    createProduct(d) {
      const sku = String(d.sku || '').trim().toUpperCase();
      if (db.productos.some((p) => p.sku === sku)) fail(`Ya existe un producto con el SKU ${sku}.`);
      if (Number(d.precio) < Number(d.costo)) fail('El precio de venta no puede ser menor al costo.');
      const p = { id: `P${db.productos.length + 1}-${Date.now() % 10000}`, sku, nombre: d.nombre.trim(), categoria: d.categoria, marca: (d.marca || '').trim(), descripcion: (d.descripcion || '').trim(), unidad: d.unidad, costo: r2(+d.costo), precio: r2(+d.precio), stockMin: Number(d.stockMin) || 0, objetivo: (Number(d.stockMin) || 0) * 4, activo: true, almacen: 'principal', creado: today() };
      db.productos.push(p);
      if (Number(d.stockInicial) > 0) move(d.sucursal || 'S1', p.id, Number(d.stockInicial), 'entrada', 'inicial', 'Inventario inicial', 'Stock inicial al crear el producto');
      log(`Creó el producto ${p.sku}`, 'productos');
      commit({ type: 'producto', id: p.id });
      return p;
    },
    updateProduct(id, d) {
      const p = prod(id);
      if (Number(d.precio) < Number(d.costo)) fail('El precio de venta no puede ser menor al costo.');
      Object.assign(p, { nombre: d.nombre.trim(), categoria: d.categoria, marca: (d.marca || '').trim(), descripcion: (d.descripcion || '').trim(), unidad: d.unidad, costo: r2(+d.costo), precio: r2(+d.precio), stockMin: Number(d.stockMin) || 0 });
      log(`Editó el producto ${p.sku}`, 'productos');
      commit({ type: 'producto', id });
    },
    importProducts(rows) {
      let creados = 0, actualizados = 0;
      rows.forEach((r) => {
        const ex = db.productos.find((p) => p.sku === r.sku);
        if (ex) { Object.assign(ex, { nombre: r.nombre || ex.nombre, marca: r.marca || ex.marca, descripcion: r.descripcion || ex.descripcion, costo: r.costo || ex.costo, precio: r.precio || ex.precio, stockMin: r.stockMin !== undefined ? r.stockMin : ex.stockMin }); actualizados++; }
        else { db.productos.push({ id: `P${db.productos.length + 1}-${Date.now() % 10000}`, sku: r.sku, nombre: r.nombre, categoria: r.categoria || 'Repuestos', marca: r.marca || '', descripcion: r.descripcion || '', unidad: r.unidad || 'pza', costo: r.costo || 0, precio: r.precio || 0, stockMin: r.stockMin || 0, objetivo: 0, activo: true, almacen: 'principal', creado: today() }); creados++; }
      });
      log(`Importó productos desde Excel (${creados} nuevos, ${actualizados} actualizados)`, 'productos');
      commit({ type: 'producto' });
      return { creados, actualizados };
    },

    createPurchase(d) {
      const items = cleanItems(d.items);
      if (!items.length) fail('Agregue al menos un producto a la compra.');
      const c = { id: `CP${db.compras.length + 1}-${Date.now() % 10000}`, codigo: nextCode('compra', 'OC'), fecha: now(), proveedor: d.proveedor, sucursal: d.sucursal, items, total: r2(items.reduce((t, it) => t + it.cantidad * it.costo, 0)), estado: 'pendiente', pago: d.pago, metodoPago: d.metodoPago || 'transferencia', pagado: false, fechaRecepcion: null, usuario: uiState.usuario, notas: d.notas || '' };
      db.compras.unshift(c);
      log(`Registró la orden de compra ${c.codigo}`, 'compras');
      if (d.recibir) ops.receivePurchase(c.id, true);
      else commit({ type: 'compra', id: c.id });
      return c;
    },
    receivePurchase(id, silent) {
      const c = find(db.compras, id);
      if (c.estado !== 'pendiente') fail('Solo se pueden recibir órdenes pendientes.');
      if (c.pago === 'contado') requireCash(c.sucursal, c.metodoPago || 'transferencia', c.total);
      c.estado = 'recibida';
      c.fechaRecepcion = now();
      c.items.forEach((it) => { move(c.sucursal, it.producto, it.cantidad, 'entrada', 'compra', c.codigo, 'Recepción de mercadería'); const p = prod(it.producto); p.costo = it.costo; });
      if (c.pago === 'contado') { c.pagado = true; cash(c.sucursal, 'egreso', `Pago compra ${c.codigo}`, 'Compras', c.total, c.codigo, c.metodoPago || 'transferencia'); }
      log(`Recibió la mercadería de ${c.codigo}`, 'compras');
      if (!silent) notify('Mercadería recibida', `${c.codigo} · ${prov(c.proveedor).nombre}`, 'good', '#/compras');
      commit({ type: 'compra', id });
    },
    cancelPurchase(id) {
      const c = find(db.compras, id);
      if (c.estado !== 'pendiente') fail('Solo se pueden anular órdenes pendientes.');
      c.estado = 'anulada';
      log(`Anuló la orden de compra ${c.codigo}`, 'compras');
      commit({ type: 'compra', id });
    },
    payPurchase(id, metodo = 'transferencia') {
      const c = find(db.compras, id);
      if (c.pagado) fail('La compra ya está pagada.');
      requireCash(c.sucursal, metodo, c.total);
      c.pagado = true;
      cash(c.sucursal, 'egreso', `Pago a crédito ${c.codigo}`, 'Compras', c.total, c.codigo, metodo);
      log(`Pagó la compra a crédito ${c.codigo}`, 'caja');
      commit({ type: 'compra', id });
    },

    createSale(d) {
      const items = cleanItems(d.items).map((it) => Object.assign(it, { precio: it.precio !== undefined ? it.precio : prod(it.producto).precio }));
      if (!items.length) fail('Agregue al menos un producto a la venta.');
      checkStock(d.sucursal, items);
      if (d.metodo !== 'credito') requireCash(d.sucursal, d.metodo);
      const subtotal = r2(items.reduce((t, it) => t + it.cantidad * it.precio, 0));
      const descuento = r2(Number(d.descuento) || 0);
      if (descuento < 0 || descuento > subtotal) fail('El descuento no puede superar el subtotal.');
      const v = { id: `VT${db.ventas.length + 1}-${Date.now() % 10000}`, codigo: nextCode('venta', 'V', 5), fecha: now(), cliente: d.cliente, sucursal: d.sucursal, items, subtotal, descuento, total: r2(subtotal - descuento), metodo: d.metodo, estado: d.metodo === 'credito' ? 'pendiente' : 'pagada', vendedor: uiState.usuario, cotizacion: d.cotizacion || null, pagos: [] };
      items.forEach((it) => move(v.sucursal, it.producto, -it.cantidad, 'salida', 'venta', v.codigo));
      if (v.metodo !== 'credito') { v.pagos.push({ fecha: v.fecha, monto: v.total, metodo: v.metodo }); cash(v.sucursal, 'ingreso', `Venta ${v.codigo}`, 'Ventas', v.total, v.codigo, v.metodo); }
      db.ventas.unshift(v);
      log(`Registró la venta ${v.codigo}`, 'ventas');
      commit({ type: 'venta', id: v.id });
      return v;
    },
    collectSale(id, metodo = 'efectivo') {
      const v = find(db.ventas, id);
      if (v.estado !== 'pendiente') fail('La venta no tiene saldo pendiente.');
      requireCash(v.sucursal, metodo);
      const saldo = r2(v.total - v.pagos.reduce((t, p) => t + p.monto, 0));
      v.pagos.push({ fecha: now(), monto: saldo, metodo });
      v.estado = 'pagada';
      cash(v.sucursal, 'ingreso', `Cobro venta a crédito ${v.codigo}`, 'Cobranzas', saldo, v.codigo, metodo);
      log(`Cobró la venta a crédito ${v.codigo}`, 'caja');
      commit({ type: 'venta', id });
    },
    voidSale(id, motivo) {
      const v = find(db.ventas, id);
      if (v.estado === 'anulada') fail('La venta ya está anulada.');
      const cobrado = v.pagos.reduce((t, p) => t + p.monto, 0);
      if (cobrado > 0) requireCash(v.sucursal, 'efectivo', cobrado);
      v.items.forEach((it) => move(v.sucursal, it.producto, it.cantidad, 'entrada', 'anulacion', v.codigo, `Anulación de venta: ${motivo}`));
      if (cobrado > 0) cash(v.sucursal, 'egreso', `Anulación venta ${v.codigo}`, 'Devoluciones', cobrado, v.codigo, 'efectivo');
      v.estado = 'anulada';
      v.motivoAnulacion = motivo;
      log(`Anuló la venta ${v.codigo}`, 'ventas');
      commit({ type: 'venta', id });
    },

    createQuote(d) {
      const items = cleanItems(d.items).map((it) => Object.assign(it, { precio: it.precio !== undefined ? it.precio : prod(it.producto).precio }));
      if (!items.length) fail('Agregue al menos un producto.');
      const subtotal = r2(items.reduce((t, it) => t + it.cantidad * it.precio, 0));
      const descuento = r2(Number(d.descuento) || 0);
      if (descuento > subtotal) fail('El descuento no puede superar el subtotal.');
      const q = { id: `CQ${db.cotizaciones.length + 1}-${Date.now() % 10000}`, codigo: nextCode('cot', 'CT'), fecha: now(), validez: Number(d.validez) || db.parametros.diasValidezCotizacion, cliente: d.cliente, sucursal: d.sucursal, items, subtotal, descuento, total: r2(subtotal - descuento), estado: d.estado || 'borrador', venta: null, usuario: uiState.usuario, notas: d.notas || '' };
      db.cotizaciones.unshift(q);
      log(`Creó la cotización ${q.codigo}`, 'cotizaciones');
      commit({ type: 'cotizacion', id: q.id });
      return q;
    },
    setQuoteStatus(id, estado) {
      const q = find(db.cotizaciones, id);
      if (q.estado === 'convertida') fail('La cotización ya fue convertida en venta.');
      q.estado = estado;
      log(`Cambió la cotización ${q.codigo} a "${estado}"`, 'cotizaciones');
      commit({ type: 'cotizacion', id });
    },
    convertQuote(id, metodo) {
      const q = find(db.cotizaciones, id);
      if (q.estado === 'convertida') fail('La cotización ya fue convertida en venta.');
      if (['rechazada', 'vencida'].includes(q.estado)) fail('No se puede convertir una cotización rechazada o vencida.');
      const v = ops.createSale({ cliente: q.cliente, sucursal: q.sucursal, items: q.items, descuento: q.descuento, metodo, cotizacion: q.id });
      q.estado = 'convertida';
      q.venta = v.id;
      log(`Convirtió la cotización ${q.codigo} en la venta ${v.codigo}`, 'cotizaciones');
      commit({ type: 'cotizacion', id });
      return v;
    },

    transfer(d) {
      const q = r2(Number(d.cantidad));
      if (d.origen === d.destino) fail('La sucursal de origen y destino deben ser distintas.');
      if (q > stockOf(d.origen, d.producto)) fail(`Stock insuficiente en ${suc(d.origen).nombre}: disponible ${stockOf(d.origen, d.producto)}.`);
      db.seq.transferencia = (db.seq.transferencia || 0) + 1;
      const ref = `TR-${String(db.seq.transferencia).padStart(4, '0')}`;
      move(d.origen, d.producto, -q, 'transferencia', 'transferencia', ref, `Envío a ${suc(d.destino).nombre}${d.nota ? ' · ' + d.nota : ''}`);
      move(d.destino, d.producto, q, 'transferencia', 'transferencia', ref, `Recibido de ${suc(d.origen).nombre}${d.nota ? ' · ' + d.nota : ''}`);
      log(`Transfirió ${q} ${prod(d.producto).unidad} de ${prod(d.producto).sku} (${ref})`, 'inventario');
      commit({ type: 'inventario' });
      return ref;
    },
    adjust(d) {
      const actual = stockOf(d.sucursal, d.producto);
      const nuevo = r2(Number(d.nuevo));
      const dif = r2(nuevo - actual);
      if (!dif) fail('La cantidad contada es igual al stock del sistema.');
      move(d.sucursal, d.producto, dif, 'ajuste', 'ajuste', 'Ajuste', d.motivo);
      log(`Ajustó el inventario de ${prod(d.producto).sku} (${dif > 0 ? '+' : ''}${dif})`, 'inventario');
      commit({ type: 'inventario' });
      return dif;
    },

    openCash(sucursal, monto) {
      if (cajaAbierta(sucursal)) fail('La caja de esta sucursal ya está abierta.');
      db.caja.sesiones.push({ id: `CJ-${sucursal}-${Date.now()}`, sucursal, apertura: now(), cierre: null, montoInicial: r2(+monto), montoEsperado: r2(+monto), montoCierre: null, estado: 'abierta', usuario: uiState.usuario });
      log(`Abrió la caja de ${suc(sucursal).nombre}`, 'caja');
      commit({ type: 'caja' });
    },
    closeCash(sucursal, contado) {
      const s = cajaAbierta(sucursal);
      if (!s) fail('No hay una caja abierta en esta sucursal.');
      s.estado = 'cerrada';
      s.cierre = now();
      s.montoCierre = r2(+contado);
      log(`Cerró la caja de ${suc(sucursal).nombre}`, 'caja');
      const dif = r2(s.montoCierre - s.montoEsperado);
      if (dif) notify('Diferencia en cierre de caja', `${suc(sucursal).nombre}: ${dif > 0 ? 'sobrante' : 'faltante'} de Bs ${Math.abs(dif)}`, 'warning', '#/caja');
      commit({ type: 'caja' });
      return dif;
    },
    addCashMovement(d) {
      requireCash(d.sucursal, d.metodo, d.tipo === 'egreso' ? +d.monto : 0);
      cash(d.sucursal, d.tipo, d.concepto.trim(), d.categoria, +d.monto, '', d.metodo);
      log(`Registró un ${d.tipo} de caja: ${d.concepto}`, 'caja');
      commit({ type: 'caja' });
    },

    saveClient(d, id) {
      if (id) { Object.assign(cli(id), d); log(`Editó el cliente ${d.nombre}`, 'clientes'); commit({ type: 'cliente', id }); return cli(id); }
      const c = Object.assign({ id: `C${db.clientes.length + 1}-${Date.now() % 10000}`, creado: today(), notas: '' }, d);
      db.clientes.push(c);
      log(`Registró el cliente ${c.nombre}`, 'clientes');
      commit({ type: 'cliente', id: c.id });
      return c;
    },
    saveSupplier(d, id) {
      if (id) { Object.assign(prov(id), d); log(`Editó el proveedor ${d.nombre}`, 'proveedores'); commit({ type: 'proveedor', id }); return prov(id); }
      const p = Object.assign({ id: `PR${db.proveedores.length + 1}-${Date.now() % 10000}`, creado: today(), categorias: [] }, d);
      db.proveedores.push(p);
      log(`Registró el proveedor ${p.nombre}`, 'proveedores');
      commit({ type: 'proveedor', id: p.id });
      return p;
    },
    saveUser(d, id) {
      if (db.usuarios.some((u) => u.usuario === d.usuario && u.id !== id)) fail(`El nombre de usuario "${d.usuario}" ya existe.`);
      if (id) { Object.assign(user(id), d); log(`Editó el usuario ${d.usuario}`, 'usuarios'); commit({ type: 'usuario', id }); return; }
      db.usuarios.push(Object.assign({ id: `U${db.usuarios.length + 1}-${Date.now() % 1000}`, estado: 'activo', ultimoAcceso: null }, d));
      log(`Creó el usuario ${d.usuario}`, 'usuarios');
      commit({ type: 'usuario' });
    },
    toggleUser(id) {
      const u = user(id);
      if (u.id === uiState.usuario) fail('No puede desactivar su propio usuario.');
      u.estado = u.estado === 'activo' ? 'inactivo' : 'activo';
      log(`${u.estado === 'activo' ? 'Activó' : 'Desactivó'} el usuario ${u.usuario}`, 'usuarios');
      commit({ type: 'usuario', id });
    },
    saveRole(d, id) {
      if (id) { Object.assign(rol(id), d); log(`Actualizó el rol ${d.nombre}`, 'usuarios'); commit({ type: 'rol', id }); return; }
      db.roles.push(Object.assign({ id: `R${db.roles.length + 1}-${Date.now() % 1000}` }, d));
      log(`Creó el rol ${d.nombre}`, 'usuarios');
      commit({ type: 'rol' });
    },
    saveBranch(d, id) {
      if (id) { Object.assign(suc(id), d); log(`Editó la sucursal ${d.nombre}`, 'sucursales'); commit({ type: 'sucursal', id }); return; }
      const sid = `S${db.sucursales.length + 1}`;
      db.sucursales.push(Object.assign({ id: sid, codigo: d.nombre.slice(0, 2).toUpperCase(), factor: 0.4, activa: true, almacenes: [{ id: `A${Date.now() % 10000}`, nombre: `Almacén ${d.nombre}` }] }, d));
      db.stock[sid] = {};
      log(`Creó la sucursal ${d.nombre}`, 'sucursales');
      commit({ type: 'sucursal' });
    },
    addWarehouse(sucId, nombre) {
      suc(sucId).almacenes.push({ id: `A${Date.now() % 100000}`, nombre });
      log(`Agregó el almacén "${nombre}" a ${suc(sucId).nombre}`, 'sucursales');
      commit({ type: 'sucursal', id: sucId });
    },
    saveSettings(patch) {
      if (patch.empresa) Object.assign(db.empresa, patch.empresa);
      if (patch.parametros) Object.assign(db.parametros, patch.parametros);
      log('Actualizó la configuración del sistema', 'configuracion');
      commit({ type: 'config' });
    },
    addUnit(u) {
      if (db.unidades.some((x) => x.id === u.id)) fail('Ya existe una unidad con esa abreviatura.');
      db.unidades.push(u);
      log(`Agregó la unidad ${u.nombre}`, 'configuracion');
      commit({ type: 'config' });
    },
    addCategory(nombre) {
      if (db.categorias.includes(nombre)) fail('La categoría ya existe.');
      db.categorias.push(nombre);
      log(`Agregó la categoría ${nombre}`, 'configuracion');
      commit({ type: 'config' });
    },
    markNotificationsRead() { db.notificaciones.forEach((n) => { n.leida = true; }); commit({ type: 'notif' }); },
    reset() { db = TOR.demoData.generate(); persist(db); listeners.forEach((fn) => fn({ type: 'reset' })); },
    exportJSON() { return JSON.stringify(db, null, 1); }
  };

  // Envuelve cada operación: los errores de negocio llegan como OpError con mensaje legible.
  Object.keys(ops).forEach((k) => { const fn = ops[k]; ops[k] = (...a) => { try { return fn(...a); } catch (e) { if (!(e instanceof OpError)) { console.error(e); } throw e; } }; });

  TOR.store = {
    get db() { return db; },
    ui: uiState, setUI, ops, OpError,
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    prod, cli, prov, user, suc, rol, me, inScope, scoped, stockOf, minOf, stockTotal, cajaAbierta, now, today, VERSION, KEY
  };
})(window);
