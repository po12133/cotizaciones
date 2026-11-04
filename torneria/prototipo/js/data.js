/*
 * DATOS DE DEMOSTRACIÓN (ficticios). Empresa, personas, clientes y proveedores son inventados.
 * Representan una empresa importadora y comercializadora con tres sucursales. Se generan con una
 * semilla fija relativa a la fecha de hoy, simulando día por día los últimos 190 días: compras a
 * proveedores que reponen stock, ventas que lo descuentan, transferencias entre sucursales y la
 * caja que registra cada cobro y pago. Así el kardex, el inventario, la caja y el dashboard
 * cuadran entre sí.
 */
(function (root) {
  const TOR = (root.TOR = root.TOR || {});
  const DIAS = 190;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const SUCURSALES = [
    { id: 'S1', nombre: 'Casa Matriz', codigo: 'CM', direccion: 'Av. Industrial N.º 1450, Zona Industrial', telefono: '+591 3 000 0001', responsable: 'U1', horario: 'Lun–Sáb 08:00–18:30', almacenes: [{ id: 'A1', nombre: 'Almacén principal' }, { id: 'A2', nombre: 'Depósito de importaciones' }], factor: 1, activa: true },
    { id: 'S2', nombre: 'Sucursal Norte', codigo: 'NO', direccion: 'Av. Principal N.º 820, Zona Norte', telefono: '+591 3 000 0002', responsable: 'U3', horario: 'Lun–Sáb 08:00–18:00', almacenes: [{ id: 'A3', nombre: 'Almacén Norte' }], factor: 0.62, activa: true },
    { id: 'S3', nombre: 'Sucursal Sur', codigo: 'SU', direccion: 'Calle Comercio N.º 315, Zona Sur', telefono: '+591 3 000 0003', responsable: 'U4', horario: 'Lun–Vie 08:30–18:00', almacenes: [{ id: 'A4', nombre: 'Almacén Sur' }], factor: 0.45, activa: true }
  ];

  const CATEGORIAS = ['Barras de acero', 'Tubos metálicos', 'Planchas', 'Aluminio', 'Bronce', 'Rodamientos', 'Pernos y sujeción', 'Herramientas', 'Consumibles', 'Repuestos'];
  const UNIDADES = [
    { id: 'm', nombre: 'Metro', abrev: 'm' }, { id: 'kg', nombre: 'Kilogramo', abrev: 'kg' }, { id: 'pza', nombre: 'Pieza', abrev: 'pza' },
    { id: 'plancha', nombre: 'Plancha', abrev: 'pl' }, { id: 'l', nombre: 'Litro', abrev: 'l' }, { id: 'kit', nombre: 'Kit', abrev: 'kit' }, { id: 'caja', nombre: 'Caja', abrev: 'cja' }
  ];
  // Marcas ficticias de los productos importados.
  const MARCAS = ['MetalPro', 'Aceros Andes', 'Aluvia', 'Bronzar', 'Rodatec', 'Pernotek', 'Cortamax', 'Lubrix', 'Weldox', 'Transmec'];

  // Productos comerciales que la empresa importa o compra para revender.
  // [sku, nombre, categoria, marca, unidad, costo de compra, precio de venta, stockMin, stockObjetivo(S1)]
  const PRODUCTOS = [
    ['ACE-1045-100', 'Barra redonda acero SAE 1045 Ø 1"', 'Barras de acero', 'MetalPro', 'm', 38, 52, 30, 120],
    ['ACE-1045-200', 'Barra redonda acero SAE 1045 Ø 2"', 'Barras de acero', 'MetalPro', 'm', 145, 195, 18, 60],
    ['ACE-4140-150', 'Barra acero SAE 4140 Ø 1 1/2"', 'Barras de acero', 'Aceros Andes', 'm', 120, 165, 15, 48],
    ['ACE-1020-075', 'Barra acero SAE 1020 Ø 3/4"', 'Barras de acero', 'MetalPro', 'm', 18, 26, 36, 150],
    ['ACE-304-100', 'Barra acero inoxidable 304 Ø 1"', 'Barras de acero', 'Aceros Andes', 'm', 165, 230, 10, 36],
    ['ACE-PLT-2025', 'Platina acero 2" x 1/4"', 'Barras de acero', 'MetalPro', 'm', 42, 58, 24, 90],
    ['TUB-S40-200', 'Tubo acero sin costura SCH 40 Ø 2"', 'Tubos metálicos', 'Aceros Andes', 'm', 120, 165, 12, 42],
    ['TUB-MEC-150', 'Tubo mecánico Ø 1 1/2" x 3 mm', 'Tubos metálicos', 'MetalPro', 'm', 65, 90, 18, 60],
    ['TUB-304-100', 'Tubo acero inoxidable 304 Ø 1"', 'Tubos metálicos', 'Aceros Andes', 'm', 95, 135, 10, 30],
    ['PLA-A36-06', 'Plancha acero A36 6 mm (1,22 x 2,44 m)', 'Planchas', 'MetalPro', 'plancha', 1450, 1850, 3, 10],
    ['PLA-A36-10', 'Plancha acero A36 10 mm (1,22 x 2,44 m)', 'Planchas', 'MetalPro', 'plancha', 2380, 3000, 2, 6],
    ['PLA-AL-03', 'Plancha aluminio 3 mm (1,22 x 2,44 m)', 'Planchas', 'Aluvia', 'plancha', 1250, 1650, 2, 6],
    ['ALU-6061-200', 'Barra aluminio 6061 Ø 2"', 'Aluminio', 'Aluvia', 'm', 175, 240, 8, 30],
    ['ALU-6061-300', 'Barra aluminio 6061 Ø 3"', 'Aluminio', 'Aluvia', 'm', 380, 510, 5, 16],
    ['BRO-S65-200', 'Barra bronce SAE 65 Ø 2"', 'Bronce', 'Bronzar', 'kg', 145, 195, 20, 70],
    ['BRO-S64-300', 'Bocina bronce SAE 64 Ø 3" x 1 1/2"', 'Bronce', 'Bronzar', 'kg', 140, 190, 15, 50],
    ['ROD-6204', 'Rodamiento 6204 2RS', 'Rodamientos', 'Rodatec', 'pza', 28, 42, 20, 80],
    ['ROD-6205', 'Rodamiento 6205 2RS', 'Rodamientos', 'Rodatec', 'pza', 32, 48, 20, 80],
    ['ROD-6305', 'Rodamiento 6305 ZZ', 'Rodamientos', 'Rodatec', 'pza', 45, 68, 12, 48],
    ['ROD-32210', 'Rodamiento cónico 32210', 'Rodamientos', 'Rodatec', 'pza', 120, 170, 6, 20],
    ['ROD-UCP205', 'Chumacera de pie UCP 205', 'Rodamientos', 'Transmec', 'pza', 85, 125, 8, 24],
    ['PER-M10-40', 'Perno hexagonal M10 x 40 grado 8.8', 'Pernos y sujeción', 'Pernotek', 'pza', 2.5, 4, 200, 800],
    ['PER-M12-50', 'Perno hexagonal M12 x 50 grado 8.8', 'Pernos y sujeción', 'Pernotek', 'pza', 3.8, 6, 200, 700],
    ['PER-M16-60', 'Perno hexagonal M16 x 60 grado 8.8', 'Pernos y sujeción', 'Pernotek', 'pza', 7.5, 11, 100, 400],
    ['TUE-M12', 'Tuerca hexagonal M12', 'Pernos y sujeción', 'Pernotek', 'pza', 0.9, 1.5, 300, 1200],
    ['ARA-M12', 'Arandela plana M12', 'Pernos y sujeción', 'Pernotek', 'pza', 0.4, 0.8, 300, 1200],
    ['HER-CNMG-12', 'Inserto de corte CNMG 120408', 'Herramientas', 'Cortamax', 'pza', 38, 55, 20, 60],
    ['HER-BRO-050', 'Broca HSS 1/2"', 'Herramientas', 'Cortamax', 'pza', 45, 65, 8, 24],
    ['HER-MAC-M12', 'Macho de roscar M12 x 1,75', 'Herramientas', 'Cortamax', 'pza', 60, 88, 6, 18],
    ['HER-LLA-SET', 'Juego de llaves combinadas 8–22 mm', 'Herramientas', 'Cortamax', 'kit', 210, 295, 3, 10],
    ['HER-DIS-07', 'Disco de corte 7" para metal', 'Consumibles', 'Cortamax', 'pza', 14, 22, 30, 100],
    ['HER-VER-150', 'Calibrador vernier 150 mm', 'Herramientas', 'Cortamax', 'pza', 180, 260, 2, 6],
    ['CON-REF-SOL', 'Refrigerante soluble industrial', 'Consumibles', 'Lubrix', 'l', 32, 48, 20, 80],
    ['CON-GRA-EP2', 'Grasa multipropósito EP2 (balde 16 kg)', 'Consumibles', 'Lubrix', 'pza', 360, 480, 4, 14],
    ['CON-E6011', 'Electrodo E6011 1/8" (caja 20 kg)', 'Consumibles', 'Weldox', 'caja', 640, 860, 3, 10],
    ['REP-RET-4562', 'Retén 45 x 62 x 8', 'Repuestos', 'Transmec', 'pza', 18, 30, 15, 50],
    ['REP-ORING-KIT', 'Kit de o-rings métricos (382 pzas)', 'Repuestos', 'Transmec', 'kit', 140, 210, 2, 8],
    ['REP-POL-B6', 'Polea de aluminio canal B Ø 6"', 'Repuestos', 'Transmec', 'pza', 150, 220, 4, 12],
    ['REP-CHA-1208', 'Chaveta acero 12 x 8 x 50', 'Repuestos', 'Transmec', 'pza', 6, 12, 30, 100],
    ['REP-PIN-Z30', 'Piñón acero Z30 paso 40', 'Repuestos', 'Transmec', 'pza', 210, 300, 3, 10],
    ['REP-COR-B52', 'Correa trapezoidal B-52', 'Repuestos', 'Transmec', 'pza', 38, 58, 10, 40]
  ];
  const ORIGEN = { MetalPro: 'Brasil', 'Aceros Andes': 'Chile', Aluvia: 'Argentina', Bronzar: 'Brasil', Rodatec: 'China', Pernotek: 'China', Cortamax: 'China', Lubrix: 'Perú', Weldox: 'Brasil', Transmec: 'China' };

  const USUARIOS = [
    ['U1', 'Ricardo Salvatierra', 'rsalvatierra', 'R1', ['*']],
    ['U2', 'Carla Mendoza', 'cmendoza', 'R2', ['*']],
    ['U3', 'Jorge Quispe', 'jquispe', 'R3', ['S2']],
    ['U4', 'Lucía Rojas', 'lrojas', 'R3', ['S3']],
    ['U5', 'Marcelo Gutiérrez', 'mgutierrez', 'R4', ['S1']],
    ['U6', 'Wilson Mamani', 'wmamani', 'R5', ['S1']],
    ['U7', 'Freddy Choque', 'fchoque', 'R5', ['S2']],
    ['U8', 'Daniel Flores', 'dflores', 'R5', ['S3']],
    ['U9', 'Ana Vaca', 'avaca', 'R6', ['S1']],
    ['U10', 'Pablo Arce', 'parce', 'R7', ['S1', 'S2']],
    ['U11', 'Gabriela Suárez', 'gsuarez', 'R6', ['S2']]
  ];

  const MODULOS_PERM = ['dashboard', 'sucursales', 'productos', 'inventario', 'compras', 'ventas', 'cotizaciones', 'clientes', 'proveedores', 'caja', 'reportes', 'usuarios', 'configuracion'];
  const perms = (spec) => Object.fromEntries(MODULOS_PERM.map((m) => [m, spec[m] || spec._ || 'none']));
  const ROLES = [
    { id: 'R1', nombre: 'Gerente general', descripcion: 'Acceso total a todas las sucursales y módulos.', permisos: perms({ _: 'write' }) },
    { id: 'R2', nombre: 'Administración', descripcion: 'Gestión comercial y financiera de todas las sucursales.', permisos: perms({ _: 'write', usuarios: 'read', configuracion: 'read' }) },
    { id: 'R3', nombre: 'Encargado de sucursal', descripcion: 'Opera su sucursal: ventas, compras, inventario y caja.', permisos: perms({ _: 'write', sucursales: 'read', reportes: 'read', usuarios: 'none', configuracion: 'none' }) },
    { id: 'R4', nombre: 'Compras e importaciones', descripcion: 'Gestiona proveedores, órdenes de compra y el catálogo de productos.', permisos: perms({ dashboard: 'read', compras: 'write', proveedores: 'write', productos: 'write', inventario: 'read', reportes: 'read' }) },
    { id: 'R5', nombre: 'Vendedor', descripcion: 'Atiende clientes, prepara cotizaciones y registra ventas.', permisos: perms({ ventas: 'write', cotizaciones: 'write', clientes: 'write', productos: 'read', inventario: 'read' }) },
    { id: 'R6', nombre: 'Ventas y caja', descripcion: 'Atiende clientes, cotiza, vende y maneja la caja.', permisos: perms({ dashboard: 'read', ventas: 'write', cotizaciones: 'write', clientes: 'write', caja: 'write', productos: 'read', inventario: 'read' }) },
    { id: 'R7', nombre: 'Almacén', descripcion: 'Recepción de compras, existencias y transferencias.', permisos: perms({ inventario: 'write', compras: 'write', productos: 'write', proveedores: 'read' }) }
  ];

  const CLIENTES = [
    ['Transportes Pesados del Oriente', 'empresa', 'Hugo Saavedra', 'S1'], ['Agroindustrial Los Pozos', 'empresa', 'Marina Ortiz', 'S1'],
    ['Constructora Vial Andina', 'empresa', 'Rolando Paz', 'S1'], ['Ingenio Azucarero San Lucas', 'empresa', 'Verónica Justiniano', 'S1'],
    ['Molinera El Trigal', 'empresa', 'Óscar Medina', 'S2'], ['Minera Cerro Blanco', 'empresa', 'Javier Condori', 'S1'],
    ['Cooperativa de Transporte 24 de Mayo', 'empresa', 'Simón Rivero', 'S2'], ['Planta de Alimentos La Pradera', 'empresa', 'Silvia Aguilera', 'S3'],
    ['Distribuidora Hermanos Rocha', 'empresa', 'Mario Rocha', 'S3'], ['Maderera Monte Verde', 'empresa', 'Eduardo Cuéllar', 'S2'],
    ['Hidráulica Industrial Integral', 'empresa', 'Patricia Antelo', 'S1'], ['Granos del Valle', 'empresa', 'Raúl Céspedes', 'S3'],
    ['Juan Carlos Ribera', 'persona', '', 'S1'], ['María Elena Vargas', 'persona', '', 'S2'], ['Luis Fernando Arteaga', 'persona', '', 'S3'],
    ['Roberto Añez', 'persona', '', 'S1'], ['Sofía Barba', 'persona', '', 'S2'], ['Diego Montaño', 'persona', '', 'S1'],
    ['Andrés Peña', 'persona', '', 'S3'], ['Ernesto Villca', 'persona', '', 'S2'], ['Cliente ocasional', 'persona', '', 'S1']
  ];

  // [nombre, rubro, categorías que provee, contacto, origen]
  const PROVEEDORES = [
    ['Aceros y Metales Comercial', 'Acero, tubos y planchas', ['Barras de acero', 'Tubos metálicos', 'Planchas'], 'Fabián Rossel', 'Nacional'],
    ['Distribuidora de Aluminios y Bronces', 'Metales no ferrosos', ['Aluminio', 'Bronce', 'Planchas'], 'Karina Mercado', 'Nacional'],
    ['Rodatec International Trading (China)', 'Rodamientos y transmisión · importación', ['Rodamientos', 'Repuestos'], 'Li Wei', 'Importación'],
    ['Ferretería Industrial El Perno', 'Sujeción y ferretería', ['Pernos y sujeción', 'Consumibles'], 'Gladys Ibáñez', 'Nacional'],
    ['Cortamax Tools Export (China)', 'Herramientas · importación', ['Herramientas', 'Consumibles'], 'Chen Hao', 'Importación'],
    ['Lubricantes e Insumos del Oriente', 'Lubricantes y consumibles', ['Consumibles', 'Repuestos'], 'Mirna Toledo', 'Nacional'],
    ['Aceros Andes Importaciones (Chile)', 'Aceros especiales · importación', ['Barras de acero', 'Tubos metálicos'], 'Iván Gutiérrez', 'Importación']
  ];

  const METODOS = ['efectivo', 'transferencia', 'qr', 'tarjeta', 'credito'];
  const GASTOS = [['Energía eléctrica', 'Servicios básicos', 900, 2200], ['Alquiler de local', 'Alquiler', 3500, 3500], ['Pago de personal', 'Personal', 6500, 6500], ['Combustible y transporte', 'Transporte', 150, 450], ['Fletes y gastos de importación', 'Importación', 350, 1400], ['Material de limpieza y oficina', 'Varios', 60, 220]];

  function generate(seed = 20261030, today = new Date()) {
    const rnd = mulberry32(seed);
    const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const chance = (p) => rnd() < p;
    const r2 = (v) => Math.round(v * 100) / 100;

    const base = new Date(today); base.setHours(0, 0, 0, 0);
    const dayDate = (offset, h = 9, mi = 0) => { const d = new Date(base); d.setDate(d.getDate() + offset); d.setHours(h, mi, 0, 0); return d; };
    const iso = (d) => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 19); };
    const isoDay = (d) => iso(d).slice(0, 10);
    const at = (offset) => iso(dayDate(offset, int(8, 17), int(0, 59)));

    const db = {
      version: 4,
      generado: iso(new Date()),
      empresa: { nombre: 'Importadora Demo', razonSocial: 'Importadora Demo S.R.L. (empresa ficticia)', nit: '0000000000', telefono: '+591 3 000 0000', correo: 'contacto@importadora-demo.test', direccion: 'Av. Industrial N.º 1450, Zona Industrial', moneda: 'BOB', logoTexto: 'ID' },
      parametros: { alertaStockDias: 0, diasValidezCotizacion: 15, prefijoVenta: 'V', prefijoCompra: 'OC', prefijoCotizacion: 'CT', margenSugerido: 35, permitirStockNegativo: false },
      sucursales: SUCURSALES.map((s) => ({ ...s, almacenes: s.almacenes.map((a) => ({ ...a })) })),
      categorias: CATEGORIAS.slice(),
      marcas: MARCAS.slice(),
      unidades: UNIDADES.map((u) => ({ ...u })),
      roles: ROLES.map((r) => ({ ...r, permisos: { ...r.permisos } })),
      usuarios: USUARIOS.map(([id, nombre, usuario, rol, sucursales], i) => ({ id, nombre, usuario, correo: `${usuario}@importadora-demo.test`, rol, sucursales, estado: i === 10 ? 'inactivo' : 'activo', ultimoAcceso: at(-int(0, 3)) })),
      productos: [], stock: {}, movimientos: [], clientes: [], proveedores: [],
      compras: [], ventas: [], cotizaciones: [], caja: { sesiones: [], movimientos: [] }, actividad: [], notificaciones: [], seq: {}
    };

    const nextCode = (key, prefix, pad = 4, start = 1) => { db.seq[key] = (db.seq[key] || start - 1) + 1; return `${prefix}-${String(db.seq[key]).padStart(pad, '0')}`; };

    // Los productos voluminosos (barras, tubos y planchas) se guardan en el depósito de importaciones de la casa matriz.
    const VOLUMINOSOS = ['Barras de acero', 'Tubos metálicos', 'Planchas'];
    PRODUCTOS.forEach(([sku, nombre, categoria, marca, unidad, costo, precio, stockMin, objetivo], i) => {
      const descripcion = `${categoria} · marca ${marca} (origen: ${ORIGEN[marca] || 'nacional'}). Producto de reventa.`;
      db.productos.push({ id: `P${i + 1}`, sku, nombre, categoria, marca, descripcion, unidad, costo, precio, stockMin, objetivo, activo: true, almacen: VOLUMINOSOS.includes(categoria) ? 'deposito' : 'principal', creado: isoDay(dayDate(-DIAS - 30)) });
    });
    const bySku = Object.fromEntries(db.productos.map((p) => [p.sku, p]));
    const fisicos = db.productos;

    CLIENTES.forEach(([nombre, tipo, contacto, suc], i) => {
      db.clientes.push({ id: `C${i + 1}`, nombre, tipo, nit: tipo === 'empresa' ? String(1000000000 + int(1000000, 99999999)) : String(int(3000000, 9999999)), contacto: contacto || nombre, telefono: `+591 7${int(1000000, 9999999)}`, correo: tipo === 'empresa' ? `compras@${nombre.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').split(' ').slice(0, 2).join('')}.test` : '', direccion: `Zona ${pick(['Industrial', 'Norte', 'Sur', 'Este', 'Centro'])}`, sucursal: suc, creado: isoDay(dayDate(-int(60, 400))), notas: '' });
    });
    PROVEEDORES.forEach(([nombre, rubro, cats, contacto, origen], i) => {
      db.proveedores.push({ id: `PR${i + 1}`, nombre, rubro, categorias: cats, contacto, origen, nit: String(1000000000 + int(1000000, 99999999)), telefono: `+591 3 ${int(300, 399)} ${int(1000, 9999)}`, correo: `ventas@proveedor${i + 1}.test`, plazoPago: pick([0, 15, 30]), creado: isoDay(dayDate(-int(200, 600))) });
    });

    // ---- Simulación día a día ----
    const stock = {};
    db.sucursales.forEach((s) => { stock[s.id] = {}; fisicos.forEach((p) => { stock[s.id][p.id] = 0; }); });
    let mseq = 0;
    function move(fecha, suc, prodId, cant, tipo, origen, ref, costo, usuario, nota) {
      stock[suc][prodId] = r2(stock[suc][prodId] + cant);
      db.movimientos.push({ id: `M${++mseq}`, fecha, sucursal: suc, producto: prodId, cantidad: r2(cant), saldo: stock[suc][prodId], tipo, origen, ref, costo, usuario, nota: nota || '' });
    }
    function cashMove(fecha, suc, tipo, concepto, categoria, monto, ref, metodo = 'efectivo', usuario = 'U9') {
      db.caja.movimientos.push({ id: `K${db.caja.movimientos.length + 1}`, fecha, sucursal: suc, tipo, concepto, categoria, monto: r2(monto), ref: ref || '', metodo, usuario });
    }
    const objetivo = (p, s) => Math.max(p.stockMin, Math.round(p.objetivo * s.factor));
    const minDe = (p, s) => Math.max(1, Math.round(p.stockMin * s.factor));
    const usuariosDe = (suc, roles) => db.usuarios.filter((u) => roles.includes(u.rol) && (u.sucursales.includes(suc) || u.sucursales.includes('*'))).map((u) => u.id);
    const cajeroDe = { S1: 'U9', S2: 'U11', S3: 'U4' };

    // Inventario inicial
    db.sucursales.forEach((s) => fisicos.forEach((p) => {
      const q = Math.round(objetivo(p, s) * (0.55 + rnd() * 0.35));
      if (q > 0) move(at(-DIAS), s.id, p.id, q, 'entrada', 'inicial', 'Inventario inicial', p.costo, 'U2', 'Carga inicial de inventario');
    }));

    // Pares producto-sucursal que terminan con stock bajo (para las alertas de la demo).
    const bajos = new Set(['S1:ROD-6205', 'S1:BRO-S65-200', 'S2:ACE-4140-150', 'S2:HER-CNMG-12', 'S3:TUB-S40-200', 'S3:PER-M12-50', 'S1:PLA-A36-10']);

    function crearCompra(offset, suc, proveedor, items, recibir) {
      const fecha = at(offset);
      const credito = proveedor.plazoPago > 0 && chance(0.45);
      const compra = { id: `CP${db.compras.length + 1}`, codigo: nextCode('compra', 'OC'), fecha, proveedor: proveedor.id, sucursal: suc, items, total: r2(items.reduce((t, it) => t + it.cantidad * it.costo, 0)), estado: 'pendiente', pago: credito ? 'credito' : 'contado', pagado: false, fechaRecepcion: null, usuario: pick(usuariosDe(suc, ['R2', 'R3', 'R7']).concat(['U2'])), notas: '' };
      if (recibir) {
        const rec = iso(dayDate(Math.min(0, offset + int(0, 2)), int(9, 16), int(0, 59)));
        compra.estado = 'recibida';
        compra.fechaRecepcion = rec;
        items.forEach((it) => move(rec, suc, it.producto, it.cantidad, 'entrada', 'compra', compra.codigo, it.costo, compra.usuario));
        if (!credito) { compra.pagado = true; cashMove(rec, suc, 'egreso', `Pago compra ${compra.codigo}`, 'Compras', compra.total, compra.codigo, pick(['efectivo', 'transferencia']), compra.usuario); }
        else if (offset < -proveedor.plazoPago - 5 && chance(0.85)) { compra.pagado = true; cashMove(iso(dayDate(offset + proveedor.plazoPago, 11, 0)), suc, 'egreso', `Pago a crédito ${compra.codigo}`, 'Compras', compra.total, compra.codigo, 'transferencia', 'U2'); }
      }
      db.compras.push(compra);
      return compra;
    }

    function crearVenta(fecha, suc, cliente, items, metodo, extra = {}) {
      const subtotal = r2(items.reduce((t, it) => t + it.cantidad * it.precio, 0));
      const descuento = extra.descuento !== undefined ? extra.descuento : (subtotal > 2500 && chance(0.4) ? r2(subtotal * pick([0.03, 0.05, 0.08])) : 0);
      const total = r2(subtotal - descuento);
      const venta = { id: `VT${db.ventas.length + 1}`, codigo: nextCode('venta', 'V', 5), fecha, cliente: cliente.id, sucursal: suc, items, subtotal, descuento, total, metodo, estado: metodo === 'credito' ? 'pendiente' : 'pagada', vendedor: extra.vendedor || cajeroDe[suc], cotizacion: extra.cotizacion || null, pagos: [] };
      items.forEach((it) => move(fecha, suc, it.producto, -it.cantidad, 'salida', 'venta', venta.codigo, it.costo, venta.vendedor));
      if (metodo !== 'credito') { venta.pagos.push({ fecha, monto: total, metodo }); cashMove(fecha, suc, 'ingreso', `Venta ${venta.codigo}`, 'Ventas', total, venta.codigo, metodo, venta.vendedor); }
      db.ventas.push(venta);
      return venta;
    }

    const clientesDe = (suc) => db.clientes.filter((c) => c.sucursal === suc || chance(0.15));
    const vendedoresDe = (suc) => usuariosDe(suc, ['R5']).filter((id) => !db.usuarios.find((u) => u.id === id).sucursales.includes('*'));

    for (let d = -DIAS + 1; d <= 0; d++) {
      const fechaD = dayDate(d);
      const dow = fechaD.getDay();
      if (dow === 0) continue; // domingo cerrado
      const progreso = (d + DIAS) / DIAS;
      const recientes = d > -45;

      db.sucursales.forEach((s) => {
        // Reposición (compras)
        const faltan = fisicos.filter((p) => stock[s.id][p.id] < minDe(p, s) * 2.1 && !(recientes && bajos.has(`${s.id}:${p.sku}`)));
        if (faltan.length && chance(0.5)) {
          const prov = pick(db.proveedores.filter((pr) => pr.categorias.includes(faltan[0].categoria))) || pick(db.proveedores);
          const lote = faltan.filter((p) => prov.categorias.includes(p.categoria)).slice(0, 4);
          if (lote.length) {
            const items = lote.map((p) => ({ producto: p.id, cantidad: Math.max(1, Math.round(objetivo(p, s) - stock[s.id][p.id])), costo: r2(p.costo * (0.97 + rnd() * 0.06)) }));
            crearCompra(d, s.id, prov, items, d < -4 || chance(0.4));
          }
        }

        // Ventas de mostrador y a empresas
        const n = Math.floor(rnd() * (1.5 + progreso * 1.0) * s.factor * 1.8 + (dow === 6 ? 0 : 0.45));
        for (let k = 0; k < n; k++) {
          const cli = pick(clientesDe(s.id));
          const items = [];
          const cuantos = int(1, 3);
          for (let j = 0; j < cuantos; j++) {
            const p = pick(db.productos);
            if (items.some((it) => it.producto === p.id)) continue;
            let cant = p.unidad === 'pza' && p.costo < 10 ? int(10, 60) : p.unidad === 'plancha' ? 1 : p.unidad === 'm' ? pick([1, 1.5, 2, 3, 6]) : p.unidad === 'kg' ? int(2, 12) : int(1, 4);
            const disp = stock[s.id][p.id] - minDe(p, s) * (bajos.has(`${s.id}:${p.sku}`) ? 0.3 : 0.6);
            if (disp <= 0) continue;
            cant = Math.min(cant, Math.floor(disp * 10) / 10);
            if (cant <= 0) continue;
            items.push({ producto: p.id, cantidad: cant, precio: p.precio, costo: p.costo });
          }
          if (!items.length) continue;
          const metodo = chance(0.08) && cli.tipo === 'empresa' ? 'credito' : pick(['efectivo', 'efectivo', 'transferencia', 'qr', 'qr', 'tarjeta']);
          const vend = vendedoresDe(s.id);
          const v = crearVenta(at(d), s.id, cli, items, metodo, { vendedor: vend.length && chance(0.45) ? pick(vend) : cajeroDe[s.id] });
          if (v.metodo === 'credito' && d < -20 && chance(0.75)) {
            const fp = at(Math.min(0, d + int(10, 25)));
            v.estado = 'pagada'; v.pagos.push({ fecha: fp, monto: v.total, metodo: 'transferencia' });
            cashMove(fp, s.id, 'ingreso', `Cobro venta a crédito ${v.codigo}`, 'Cobranzas', v.total, v.codigo, 'transferencia', 'U2');
          }
          // Algunas ventas vienen de cotizaciones aprobadas
          if (chance(0.07) && d > -120) {
            const cot = { id: `CQ${db.cotizaciones.length + 1}`, codigo: nextCode('cot', 'CT'), fecha: at(d - int(2, 8)), validez: 15, cliente: cli.id, sucursal: s.id, items: items.map((it) => ({ ...it })), subtotal: v.subtotal, descuento: v.descuento, total: v.total, estado: 'convertida', venta: v.id, usuario: v.vendedor, notas: '' };
            v.cotizacion = cot.id;
            db.cotizaciones.push(cot);
          }
        }
      });

      // Gastos operativos
      db.sucursales.forEach((s) => {
        if (fechaD.getDate() === 5) { const g = GASTOS[1]; cashMove(at(d), s.id, 'egreso', g[0], g[1], Math.round(g[2] * (0.5 + s.factor * 0.5)), '', 'transferencia', 'U2'); }
        if (fechaD.getDate() === 15) { const g = GASTOS[0]; cashMove(at(d), s.id, 'egreso', g[0], g[1], Math.round((g[2] + rnd() * (g[3] - g[2])) * s.factor), '', 'transferencia', 'U2'); }
        if (fechaD.getDate() === 28 || (fechaD.getDate() === 27 && dow === 6)) { const g = GASTOS[2]; if (!db.caja.movimientos.some((k) => k.sucursal === s.id && k.concepto === g[0] && k.fecha.slice(0, 7) === isoDay(fechaD).slice(0, 7))) cashMove(at(d), s.id, 'egreso', g[0], g[1], Math.round(g[2] * (0.4 + s.factor * 0.9)), '', 'transferencia', 'U2'); }
        if (chance(0.12)) { const g = pick(GASTOS.slice(3)); cashMove(at(d), s.id, 'egreso', g[0], g[1], int(g[2], g[3]), '', 'efectivo', cajeroDe[s.id]); }
      });
    }

    // Ajustes por conteo físico que dejan algunos productos bajo el mínimo (alertas de la demo).
    bajos.forEach((key) => {
      const [suc, sku] = key.split(':');
      const p = bySku[sku];
      const s = db.sucursales.find((x) => x.id === suc);
      const destino = Math.max(0, Math.floor(minDe(p, s) * 0.55));
      const dif = r2(destino - stock[suc][p.id]);
      if (dif < 0) move(at(-int(1, 6)), suc, p.id, dif, 'ajuste', 'ajuste', 'Conteo físico', p.costo, 'U10', 'Diferencia de conteo físico (mercadería dañada o faltante)');
    });

    // Transferencias de ejemplo
    [['S1', 'S2', 'ACE-1045-100', 12, -40], ['S1', 'S3', 'ROD-6204', 10, -25], ['S1', 'S2', 'REP-COR-B52', 8, -18], ['S1', 'S3', 'CON-REF-SOL', 12, -9], ['S1', 'S2', 'PER-M10-40', 150, -6], ['S2', 'S3', 'BRO-S64-300', 4, -3]].forEach(([o, de, sku, q, off], i) => {
      const p = bySku[sku];
      const ref = `TR-${String(i + 1).padStart(4, '0')}`;
      const f = at(off);
      if (stock[o][p.id] > q) { move(f, o, p.id, -q, 'transferencia', 'transferencia', ref, p.costo, 'U10', `Envío a ${db.sucursales.find((x) => x.id === de).nombre}`); move(f, de, p.id, q, 'transferencia', 'transferencia', ref, p.costo, 'U10', `Recibido de ${db.sucursales.find((x) => x.id === o).nombre}`); }
    });
    db.seq.transferencia = 6;

    // Cotizaciones abiertas, rechazadas y vencidas
    for (let i = 0; i < 22; i++) {
      const off = -int(0, 40);
      const s = pick(db.sucursales);
      const cli = pick(db.clientes.slice(0, 20));
      const items = [];
      for (let j = 0; j < int(1, 4); j++) {
        const p = pick(db.productos);
        if (items.some((it) => it.producto === p.id)) continue;
        items.push({ producto: p.id, cantidad: p.unidad === 'pza' && p.costo < 10 ? int(50, 300) : int(1, 8), precio: p.precio, costo: p.costo });
      }
      const subtotal = r2(items.reduce((t, it) => t + it.cantidad * it.precio, 0));
      const descuento = chance(0.35) ? r2(subtotal * 0.05) : 0;
      const estado = off < -15 ? pick(['rechazada', 'vencida', 'vencida']) : off < -5 ? pick(['enviada', 'aprobada', 'rechazada']) : pick(['borrador', 'enviada', 'enviada', 'aprobada']);
      db.cotizaciones.push({ id: `CQ${db.cotizaciones.length + 1}`, codigo: nextCode('cot', 'CT'), fecha: at(off), validez: 15, cliente: cli.id, sucursal: s.id, items, subtotal, descuento, total: r2(subtotal - descuento), estado, venta: null, usuario: cajeroDe[s.id], notas: '' });
    }

    // Sesiones de caja (últimos 10 días hábiles); hoy: Casa Matriz y Norte abiertas, Sur cerrada.
    db.sucursales.forEach((s) => {
      for (let d = -10; d <= 0; d++) {
        const f = dayDate(d);
        if (f.getDay() === 0) continue;
        const dia = isoDay(f);
        const movs = db.caja.movimientos.filter((k) => k.sucursal === s.id && k.fecha.slice(0, 10) === dia && k.metodo === 'efectivo');
        const inicial = s.id === 'S1' ? 1500 : 800;
        const neto = movs.reduce((t, k) => t + (k.tipo === 'ingreso' ? k.monto : -k.monto), 0);
        const abierta = d === 0 && s.id !== 'S3';
        db.caja.sesiones.push({ id: `CJ-${s.id}-${dia}`, sucursal: s.id, apertura: iso(dayDate(d, 8, 5)), cierre: abierta ? null : iso(dayDate(d, 18, 40)), montoInicial: inicial, montoEsperado: r2(inicial + neto), montoCierre: abierta ? null : r2(inicial + neto + (chance(0.25) ? pick([-20, -10, 10]) : 0)), estado: abierta ? 'abierta' : 'cerrada', usuario: cajeroDe[s.id] });
      }
    });

    db.stock = stock;
    db.movimientos.sort((a, b) => a.fecha.localeCompare(b.fecha));
    ['ventas', 'compras', 'cotizaciones'].forEach((k) => db[k].sort((a, b) => b.fecha.localeCompare(a.fecha)));
    db.caja.movimientos.sort((a, b) => b.fecha.localeCompare(a.fecha));

    // Actividad reciente
    const act = [];
    db.ventas.slice(0, 8).forEach((v) => act.push({ fecha: v.fecha, usuario: v.vendedor, accion: `Registró la venta ${v.codigo}`, modulo: 'ventas' }));
    db.compras.slice(0, 6).forEach((c) => act.push({ fecha: c.fecha, usuario: c.usuario, accion: `Registró la orden de compra ${c.codigo}`, modulo: 'compras' }));
    db.compras.filter((c) => c.fechaRecepcion).slice(0, 4).forEach((c) => act.push({ fecha: c.fechaRecepcion, usuario: c.usuario, accion: `Recibió la mercadería de ${c.codigo}`, modulo: 'compras' }));
    db.cotizaciones.slice(0, 4).forEach((q) => act.push({ fecha: q.fecha, usuario: q.usuario, accion: `Creó la cotización ${q.codigo}`, modulo: 'cotizaciones' }));
    db.movimientos.filter((m) => m.origen === 'transferencia' && m.cantidad < 0).slice(-3).forEach((m) => act.push({ fecha: m.fecha, usuario: m.usuario, accion: `Transfirió mercadería (${m.ref})`, modulo: 'inventario' }));
    db.actividad = act.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 40);
    return db;
  }

  TOR.demoData = { generate, METODOS, MODULOS_PERM, DIAS };
  if (typeof module !== 'undefined' && module.exports) module.exports = TOR.demoData;
})(typeof window !== 'undefined' ? window : globalThis);
