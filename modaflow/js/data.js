/*
 * Datos de demostración de MioShop — Moda Femenina.
 * Precios, existencias, clientes, proveedores y ventas son DEMOSTRATIVOS.
 * Solo las 9 prendas con fotografía usan fotos reales de la tienda; el resto muestra un dibujo genérico.
 */
(function (root) {
  const CATEGORIES = ['Blusas', 'Tops', 'Vestidos', 'Camisas', 'Chaquetas', 'Cardigans', 'Conjuntos'];

  const COLORS = {
    Rojo: '#C8233A', Negro: '#1F1B1D', Verde: '#1E8A4C', Nude: '#D6B7A2', 'Café': '#5A3424', Camel: '#C29A72',
    'Rosa palo': '#EDBFC6', Crema: '#F3E7D3', Blanco: '#F7F5F2', 'Champaña': '#E9D7B4', Rosa: '#F29BB5',
    'Rosa antiguo': '#C98B98', Beige: '#D9C3A5', Lila: '#B9A4D6', Azul: '#4C6C9C', Floral: '#E9A3A8'
  };

  // [id, nombre, categoría, color, precio, costo, foto, publicado, destacado, descripción, variantes [talla, color, centro, norte, sur]]
  const P = [
    ['p01', 'Saco rojo de punto', 'Cardigans', 'Rojo', 120, 62, 'saco-rojo-punto', true, true,
      'Ligero, suave y elegante. Corte abierto y manga larga: el toque de color perfecto para tu look del día a día.',
      [['S', 'Rojo', 2, 1, 1], ['M', 'Rojo', 3, 1, 0], ['L', 'Rojo', 1, 0, 1]]],
    ['p02', 'Chaqueta roja estilo militar', 'Chaquetas', 'Rojo', 220, 118, 'chaqueta-roja-militar', true, true,
      'Cuello mao, botones metálicos cruzados y bolsillos con cierre. Entallada para un look con carácter.',
      [['S', 'Rojo', 1, 1, 0], ['M', 'Rojo', 2, 0, 1]]],
    ['p03', 'Blusa roja escote corazón', 'Blusas', 'Rojo', 130, 66, 'blusa-roja-escote-corazon', true, true,
      'Escote corazón con fruncido central y mangas abullonadas con puño. Ideal para salidas.',
      [['S', 'Rojo', 2, 1, 1], ['M', 'Rojo', 4, 2, 1], ['L', 'Rojo', 2, 1, 0]]],
    ['p04', 'Blusa negra con tul', 'Blusas', 'Negro', 140, 72, 'blusa-negra-tul', true, false,
      'Cuello camisero, canesú y mangas de tul transparente. Elegante para la oficina o la noche.',
      [['S', 'Negro', 1, 1, 0], ['M', 'Negro', 2, 1, 1], ['L', 'Negro', 1, 0, 0]]],
    ['p05', 'Top verde de lunares', 'Tops', 'Verde', 95, 45, 'top-verde-lunares', true, true,
      'Top fruncido con lunares, vuelos en los hombros y mangas globo. Fresco y coqueto.',
      [['S', 'Verde', 3, 1, 1], ['M', 'Verde', 2, 1, 0]]],
    ['p06', 'Blusa negra con encaje', 'Blusas', 'Negro', 135, 70, 'blusa-negra-encaje', true, false,
      'Tejido acanalado con aplicaciones de encaje, botones decorativos y detalle metálico en el cuello.',
      [['M', 'Negro', 2, 0, 1], ['L', 'Negro', 1, 1, 0]]],
    ['p07', 'Blusa nude asimétrica', 'Blusas', 'Nude', 115, 58, 'blusa-nude-asimetrica', true, false,
      'Escote asimétrico y fruncido lateral que estiliza la figura. Tela suave con caída.',
      [['S', 'Nude', 1, 0, 1], ['M', 'Nude', 2, 1, 0], ['L', 'Nude', 0, 1, 0]]],
    ['p08', 'Blusa café bordada', 'Blusas', 'Café', 150, 78, 'blusa-cafe-bordada', true, false,
      'Bordado en tono crema en el escote, las mangas y la cintura. Manga larga, corte recto.',
      [['M', 'Café', 1, 1, 0], ['L', 'Café', 1, 0, 1], ['XL', 'Café', 1, 0, 0]]],
    ['p09', 'Chaleco con flecos', 'Chaquetas', 'Camel', 160, 84, 'chaleco-flecos', true, true,
      'Chaleco de gamuza sintética con ribete tejido y flecos. Estilo boho para combinar con jeans.',
      [['S', 'Camel', 1, 0, 0], ['M', 'Camel', 1, 1, 1]]],
    ['p10', 'Vestido midi rosa palo', 'Vestidos', 'Rosa palo', 210, 110, null, true, false,
      'Vestido midi de caída suave con cintura marcada. Para eventos de día.',
      [['S', 'Rosa palo', 1, 1, 0], ['M', 'Rosa palo', 2, 0, 1], ['L', 'Rosa palo', 1, 1, 0]]],
    ['p11', 'Vestido negro cruzado', 'Vestidos', 'Negro', 230, 120, null, true, false,
      'Vestido cruzado con lazo en la cintura. Un clásico que nunca falla.',
      [['S', 'Negro', 2, 1, 1], ['M', 'Negro', 1, 1, 0]]],
    ['p12', 'Vestido floral de verano', 'Vestidos', 'Floral', 190, 96, null, true, false,
      'Estampado floral, tirantes regulables y falda con vuelo.',
      [['S', 'Floral', 2, 0, 1], ['M', 'Floral', 3, 1, 1], ['L', 'Floral', 1, 0, 0]]],
    ['p13', 'Camisa blanca oversize', 'Camisas', 'Blanco', 140, 70, null, true, false,
      'Camisa amplia de algodón con puños abotonados. Básico indispensable.',
      [['S', 'Blanco', 2, 1, 1], ['M', 'Blanco', 3, 1, 1], ['L', 'Blanco', 2, 1, 0]]],
    ['p14', 'Camisa de satén champaña', 'Camisas', 'Champaña', 160, 82, null, true, false,
      'Satén con brillo suave, cuello clásico y botones forrados.',
      [['S', 'Champaña', 1, 0, 0], ['M', 'Champaña', 1, 1, 1]]],
    ['p15', 'Top acanalado', 'Tops', 'Negro', 70, 32, null, true, false,
      'Top acanalado elástico de tirante ancho. Disponible en negro y blanco.',
      [['S', 'Negro', 1, 1, 0], ['M', 'Negro', 1, 0, 1], ['S', 'Blanco', 2, 1, 0], ['M', 'Blanco', 0, 1, 1]]],
    ['p16', 'Top de tiras rosa', 'Tops', 'Rosa', 65, 30, null, true, false,
      'Top de tiras finas con escote recto. Perfecto para capas.',
      [['S', 'Rosa', 3, 1, 1], ['M', 'Rosa', 2, 1, 1]]],
    ['p17', 'Cardigan tejido crema', 'Cardigans', 'Crema', 165, 88, null, true, false,
      'Cardigan de punto grueso con botones de madera.',
      [['M', 'Crema', 2, 1, 0], ['L', 'Crema', 1, 0, 1]]],
    ['p18', 'Cardigan corto rosa antiguo', 'Cardigans', 'Rosa antiguo', 150, 76, null, true, false,
      'Cardigan corto de punto fino, ideal sobre vestidos.',
      [['S', 'Rosa antiguo', 0, 1, 0], ['M', 'Rosa antiguo', 0, 0, 1]]],
    ['p19', 'Conjunto blazer y pantalón beige', 'Conjuntos', 'Beige', 380, 205, null, true, false,
      'Blazer recto y pantalón de tiro alto. Se vende como conjunto.',
      [['S', 'Beige', 1, 0, 0], ['M', 'Beige', 1, 1, 1]]],
    ['p20', 'Conjunto de punto lila', 'Conjuntos', 'Lila', 260, 135, null, true, false,
      'Top y falda midi de punto acanalado. Cómodo y combinable.',
      [['S', 'Lila', 1, 1, 0], ['M', 'Lila', 2, 0, 1]]],
    ['p21', 'Chaqueta de jean clásica', 'Chaquetas', 'Azul', 240, 130, null, true, false,
      'Chaqueta de mezclilla con bolsillos de parche y botones metálicos.',
      [['S', 'Azul', 1, 1, 1], ['M', 'Azul', 2, 1, 0], ['L', 'Azul', 1, 0, 1]]],
    ['p22', 'Blusa blanca con vuelos', 'Blusas', 'Blanco', 125, 60, null, false, false,
      'Blusa con vuelos en el escote. Nuevo ingreso, todavía sin publicar.',
      [['S', 'Blanco', 2, 0, 0], ['M', 'Blanco', 2, 0, 0]]]
  ];

  const BRANCHES = [
    { id: 'b1', name: 'Tienda Central', address: 'Av. principal (dirección de demostración)', manager: 'u1', main: true },
    { id: 'b2', name: 'Sucursal Norte', address: 'Zona norte (dirección de demostración)', manager: 'u4' },
    { id: 'b3', name: 'Sucursal Sur', address: 'Zona sur (dirección de demostración)', manager: 'u5' }
  ];

  const ROLES = [
    { id: 'r1', name: 'Administradora', perms: ['ventas', 'productos', 'inventario', 'precios', 'reportes', 'gastos', 'usuarios', 'configuracion', 'eliminar'] },
    { id: 'r2', name: 'Vendedora', perms: ['ventas', 'pedidos'] },
    { id: 'r3', name: 'Encargada de sucursal', perms: ['ventas', 'pedidos', 'inventario', 'productos', 'reportes'] },
    { id: 'r4', name: 'Almacén', perms: ['inventario', 'productos'] }
  ];

  const PERMS = {
    ventas: 'Registrar ventas', pedidos: 'Gestionar pedidos', productos: 'Crear y editar productos',
    inventario: 'Ajustar inventario', precios: 'Cambiar precios y costos', reportes: 'Ver reportes y ganancias',
    gastos: 'Registrar gastos y compras', usuarios: 'Administrar usuarios', configuracion: 'Configurar la tienda',
    eliminar: 'Eliminar registros'
  };

  const USERS = [
    { id: 'u1', name: 'Carla Méndez', email: 'propietaria@demo.mioshop', role: 'r1', branch: 'b1', active: true, owner: true },
    { id: 'u2', name: 'Rocío Paz', email: 'vendedora1@demo.mioshop', role: 'r2', branch: 'b1', active: true },
    { id: 'u3', name: 'Jimena Soria', email: 'vendedora2@demo.mioshop', role: 'r2', branch: 'b1', active: true },
    { id: 'u4', name: 'Natalia Rivas', email: 'norte@demo.mioshop', role: 'r3', branch: 'b2', active: true },
    { id: 'u5', name: 'Mónica Arce', email: 'sur@demo.mioshop', role: 'r3', branch: 'b3', active: true }
  ];

  const CUSTOMERS = [
    ['c1', 'María Fernanda Rojas', 'Cliente frecuente, talla S'], ['c2', 'Daniela Quispe', 'Prefiere colores oscuros'],
    ['c3', 'Valeria Mendoza', ''], ['c4', 'Camila Gutiérrez', 'Pide por WhatsApp'], ['c5', 'Lucía Vargas', ''],
    ['c6', 'Andrea Flores', 'Paga con QR'], ['c7', 'Gabriela Choque', ''], ['c8', 'Paola Herrera', 'Talla M']
  ];

  const SUPPLIERS = [
    { id: 's1', name: 'Importadora Textil Andina', contact: 'Ventas (demo)', phone: 'Teléfono de demostración', category: 'Blusas y tops', notes: 'Entrega semanal' },
    { id: 's2', name: 'Distribuidora Moda Sur', contact: 'Atención mayorista (demo)', phone: 'Teléfono de demostración', category: 'Vestidos y conjuntos', notes: 'Pedido mínimo 12 prendas' },
    { id: 's3', name: 'Confecciones Altiplano', contact: 'Taller (demo)', phone: 'Teléfono de demostración', category: 'Cardigans', notes: '' },
    { id: 's4', name: 'Empaques y Bolsas Bolivia', contact: 'Ventas (demo)', phone: 'Teléfono de demostración', category: 'Insumos', notes: 'Bolsas con logo' }
  ];

  // Generador pseudoaleatorio determinista: los datos son iguales cada vez que se restauran
  function rng(seed) {
    let a = seed;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seed() {
    const r = rng(2026);
    const pick = (arr) => arr[Math.floor(r() * arr.length)];
    const now = new Date();
    const dayStart = (d) => { const x = new Date(now); x.setDate(x.getDate() - d); x.setHours(0, 0, 0, 0); return x; };
    const at = (d, h, m) => { const x = dayStart(d); x.setHours(h, m || 0, 0, 0); return x.toISOString(); };

    const products = P.map((row, i) => {
      const [id, name, category, color, price, cost, photo, published, featured, desc, vars] = row;
      return {
        id, sku: 'MIO-' + String(i + 1).padStart(3, '0'), name, category, color, colorHex: COLORS[color] || '#ccc',
        price, cost, photo: photo ? 'assets/productos/' + photo + '.jpg' : null, published, featured, desc,
        minStock: 2, createdAt: photo ? at(10 - i, 10) : at(70 - i, 10), source: 'manual',
        variants: vars.map(([size, vcolor, a, b, c]) => ({ size, color: vcolor, stock: { b1: a, b2: b, b3: c } }))
      };
    });

    const customers = CUSTOMERS.map(([id, name, notes], i) => ({
      id, name, phone: 'Demo 700-000-' + String(i + 1).padStart(2, '0'), notes, createdAt: at(80 - i * 5, 11)
    }));

    // Ventas de los últimos 60 días (el stock actual ya considera estas ventas)
    const sales = [];
    const audit = [];
    let num = 1000;
    const sellable = products.filter((p) => p.published);
    for (let d = 59; d >= 0; d--) {
      const weekend = [0, 6].includes(dayStart(d).getDay());
      const n = d === 0 ? 4 : 2 + Math.floor(r() * (weekend ? 6 : 4));
      for (let k = 0; k < n; k++) {
        const items = [];
        const lines = r() < 0.7 ? 1 : 2;
        for (let l = 0; l < lines; l++) {
          const p = r() < 0.65 ? pick(sellable.slice(0, 9)) : pick(sellable);
          if (items.some((it) => it.productId === p.id)) continue;
          const v = pick(p.variants);
          items.push({ productId: p.id, name: p.name, size: v.size, color: v.color, qty: 1, price: p.price, cost: p.cost });
        }
        const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
        const discount = r() < 0.15 ? Math.round(subtotal * 0.1) : 0;
        const br = r();
        const branch = br < 0.72 ? 'b1' : br < 0.88 ? 'b2' : 'b3';
        const user = branch === 'b1' ? pick(['u1', 'u2', 'u3']) : branch === 'b2' ? 'u4' : 'u5';
        const hour = d === 0 ? 9 + k * 2 : 10 + Math.floor(r() * 10);
        sales.push({
          id: 'v' + (++num), number: num, date: at(d, Math.min(hour, 20), Math.floor(r() * 59)), items, subtotal, discount,
          total: subtotal - discount, method: r() < 0.58 ? 'efectivo' : 'qr', customerId: r() < 0.45 ? pick(customers).id : null,
          userId: user, branchId: branch, channel: 'tienda', status: 'completada'
        });
      }
    }
    // Una devolución de ejemplo
    const ret = sales[sales.length - 25];
    ret.status = 'devuelta';
    ret.returnNote = 'Cambio de talla solicitado por la clienta';

    // Pedidos del catálogo online (no descuentan stock hasta confirmarse)
    const orderItems = (ids) => ids.map(([pid, size, qty]) => {
      const p = products.find((x) => x.id === pid);
      const v = p.variants.find((x) => x.size === size);
      return { productId: pid, name: p.name, size, color: v.color, qty, price: p.price, cost: p.cost };
    });
    const mkOrder = (n, d, h, cust, items, method, status, extra) => {
      const it = orderItems(items);
      const total = it.reduce((s, x) => s + x.price * x.qty, 0);
      return Object.assign({
        id: 'o' + n, number: n, date: at(d, h, 15), customer: cust, items: it, total, method, status,
        receipt: null, paymentVerified: false, saleId: null, notes: '', history: [{ status: 'pendiente', date: at(d, h, 15) }]
      }, extra || {});
    };
    const orders = [
      mkOrder(207, 0, 10, { name: 'Daniela Quispe', phone: 'Demo 700-000-02' }, [['p03', 'M', 1], ['p05', 'S', 1]], 'whatsapp', 'pendiente'),
      mkOrder(206, 0, 9, { name: 'Andrea Flores', phone: 'Demo 700-000-06' }, [['p02', 'M', 1]], 'qr', 'esperando_pago',
        { receipt: 'demo', receiptName: 'comprobante-qr-demo.jpg', notes: 'Adjuntó comprobante desde el catálogo' }),
      mkOrder(205, 1, 18, { name: 'Lucía Vargas', phone: 'Demo 700-000-05' }, [['p10', 'M', 1]], 'qr', 'esperando_pago'),
      mkOrder(204, 1, 12, { name: 'Camila Gutiérrez', phone: 'Demo 700-000-04' }, [['p01', 'S', 1], ['p16', 'S', 1]], 'whatsapp', 'preparando', { paymentVerified: true }),
      mkOrder(203, 2, 16, { name: 'Paola Herrera', phone: 'Demo 700-000-08' }, [['p13', 'M', 1]], 'qr', 'entregado', { paymentVerified: true, receipt: 'demo', receiptName: 'comprobante-203.jpg' }),
      mkOrder(202, 3, 11, { name: 'Valeria Mendoza', phone: 'Demo 700-000-03' }, [['p11', 'S', 1]], 'whatsapp', 'cancelado', { notes: 'La clienta desistió del pedido' })
    ];
    // Los pedidos confirmados ya generaron su venta
    orders.filter((o) => ['preparando', 'entregado'].includes(o.status)).forEach((o) => {
      const sale = {
        id: 'v' + (++num), number: num, date: o.date, items: o.items.map((x) => Object.assign({}, x)), subtotal: o.total, discount: 0,
        total: o.total, method: o.method === 'qr' ? 'qr' : 'efectivo', customerId: null, customerName: o.customer.name,
        userId: 'u1', branchId: 'b1', channel: 'online', orderId: o.id, status: 'completada'
      };
      sales.push(sale);
      o.saleId = sale.id;
      o.history.push({ status: 'confirmado', date: o.date });
      if (o.status === 'entregado') o.history.push({ status: 'preparando', date: o.date }, { status: 'entregado', date: o.date });
      else o.history.push({ status: 'preparando', date: o.date });
    });
    sales.sort((a, b) => a.date.localeCompare(b.date));

    const purchases = [
      { id: 'cp1', number: 51, date: at(40, 10), supplierId: 's1', branchId: 'b1', status: 'recibida', items: [{ productId: 'p03', size: 'M', qty: 6, cost: 66 }, { productId: 'p04', size: 'M', qty: 4, cost: 72 }] },
      { id: 'cp2', number: 52, date: at(26, 15), supplierId: 's2', branchId: 'b1', status: 'recibida', items: [{ productId: 'p10', size: 'M', qty: 4, cost: 110 }, { productId: 'p12', size: 'M', qty: 5, cost: 96 }] },
      { id: 'cp3', number: 53, date: at(12, 9), supplierId: 's3', branchId: 'b2', status: 'recibida', items: [{ productId: 'p17', size: 'M', qty: 3, cost: 88 }] },
      { id: 'cp4', number: 54, date: at(2, 9), supplierId: 's1', branchId: 'b1', status: 'pendiente', items: [{ productId: 'p18', size: 'S', qty: 4, cost: 76 }, { productId: 'p18', size: 'M', qty: 4, cost: 76 }] }
    ].map((c) => Object.assign(c, { total: c.items.reduce((s, it) => s + it.qty * it.cost, 0) }));

    const expenses = [
      [3, 'Alquiler', 'Alquiler Tienda Central', 2500, 'b1'], [3, 'Servicios', 'Energía eléctrica', 180, 'b1'], [5, 'Servicios', 'Internet', 150, 'b1'],
      [8, 'Insumos', 'Bolsas y etiquetas', 220, 'b1'], [10, 'Publicidad', 'Publicidad en redes sociales', 300, 'b1'], [1, 'Sueldos', 'Sueldo vendedora (quincena)', 1400, 'b1'],
      [6, 'Alquiler', 'Alquiler Sucursal Norte', 1800, 'b2'], [6, 'Alquiler', 'Alquiler Sucursal Sur', 1600, 'b3'], [14, 'Transporte', 'Envíos y movilidad', 120, 'b1']
    ].map(([d, category, desc, amount, branchId], i) => ({ id: 'g' + (i + 1), date: at(d, 12), category, desc, amount, branchId }));

    const transfers = [
      { id: 't1', date: at(9, 11), from: 'b1', to: 'b2', items: [{ productId: 'p03', size: 'S', qty: 1 }], userId: 'u1', status: 'recibida' },
      { id: 't2', date: at(4, 16), from: 'b1', to: 'b3', items: [{ productId: 'p13', size: 'M', qty: 1 }], userId: 'u1', status: 'recibida' }
    ];

    const auditSeed = [
      [0, 9, 'u2', 'venta', 'Registró la venta #' + (sales[sales.length - 1].number)],
      [0, 8, 'u1', 'producto', 'Cambió el precio de "Top verde de lunares" de Bs 90 a Bs 95'],
      [1, 19, 'u3', 'venta', 'Aplicó descuento de 10% en una venta'],
      [1, 12, 'u1', 'pedido', 'Confirmó el pago del pedido #204'],
      [2, 17, 'u4', 'inventario', 'Ajuste de inventario: Blusa negra con tul talla M (+1)'],
      [3, 11, 'u1', 'pedido', 'Canceló el pedido #202'],
      [4, 16, 'u1', 'transferencia', 'Transfirió 1 unidad de "Camisa blanca oversize" a Sucursal Sur'],
      [6, 10, 'u1', 'usuario', 'Activó el usuario de Mónica Arce'],
      [8, 9, 'u5', 'inventario', 'Registró ingreso de mercadería'],
      [12, 9, 'u1', 'compra', 'Registró la compra #53 a Confecciones Altiplano']
    ];
    auditSeed.forEach(([d, h, user, type, detail], i) => audit.push({ id: 'a' + (i + 1), date: at(d, h, 30), userId: user, type, detail }));

    const visits = [];
    for (let d = 29; d >= 0; d--) visits.push({ date: dayStart(d).toISOString().slice(0, 10), views: 40 + Math.floor(r() * 70), whatsapp: 2 + Math.floor(r() * 9) });

    return {
      version: (root.MF_CONFIG && root.MF_CONFIG.dataVersion) || 1,
      settings: {
        plan: 'pro', branchId: 'b1', userId: 'u1',
        whatsapp: (root.MF_CONFIG && root.MF_CONFIG.store.whatsapp) || '',
        qrImage: null, bankLabel: 'Cuenta de la tienda (datos de demostración)',
        primary: '#E8457E', accent: '#C98B98', showStock: true, delivery: 'Envíos coordinados por WhatsApp. Retiro en tienda sin costo.',
        domain: 'catalogo.mioshop.bo', reportsEnabled: ['ventas', 'productos', 'metodos', 'vendedoras', 'rentabilidad', 'sucursales']
      },
      categories: CATEGORIES.slice(),
      products, customers, sales, orders, purchases, expenses, transfers, audit, visits,
      branches: BRANCHES.map((b) => Object.assign({}, b)), roles: ROLES.map((x) => Object.assign({}, x, { perms: x.perms.slice() })),
      users: USERS.map((u) => Object.assign({}, u)), suppliers: SUPPLIERS.map((s) => Object.assign({}, s)),
      promotions: [
        { id: 'pr1', name: 'Semana del rojo', percent: 15, category: null, productIds: ['p01', 'p02', 'p03'], active: true },
        { id: 'pr2', name: 'Vestidos de temporada', percent: 10, category: 'Vestidos', productIds: [], active: false }
      ],
      aiUsage: { month: new Date().toISOString().slice(0, 7), used: 7 },
      counters: { sale: num, order: 207, purchase: 54 },
      onboarding: [
        { id: 'k1', label: 'Reunión de diagnóstico y levantamiento de información', done: true },
        { id: 'k2', label: 'Configuración de sucursales, usuarios y roles', done: true },
        { id: 'k3', label: 'Importación asistida del inventario', done: true },
        { id: 'k4', label: 'Personalización del catálogo y del QR de pago', done: false },
        { id: 'k5', label: 'Capacitación del equipo de ventas', done: false },
        { id: 'k6', label: 'Configuración de reportes', done: false },
        { id: 'k7', label: 'Acompañamiento durante el primer mes', done: false }
      ]
    };
  }

  root.MF = root.MF || {};
  Object.assign(root.MF, { CATEGORIES, COLORS, PERMS, seed });
})(typeof window !== 'undefined' ? window : globalThis);
