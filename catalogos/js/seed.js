/*
 * Datos de demostración. Se construyen con las mismas funciones del sistema
 * (mapeo, sincronización, catálogos) para que todo sea coherente.
 */
(function () {
  'use strict';
  const CA = (window.CA = window.CA || {});
  const u = CA.util;

  CA.seed = {};

  CA.seed.newWorkspace = function () {
    return {
      integrations: {
        sheets: { connected: false, account: '', sheetId: '', tab: '', autoSync: true, lastSync: null, syncLog: [] },
        drive: { connected: false, account: '', folderId: '', lastScan: null }
      },
      mapping: null, products: [], catalogs: [], events: [], notifications: []
    };
  };

  CA.seed.newUser = function (o, now) {
    return {
      id: o.id || u.uid('usr'), name: o.name, email: o.email.toLowerCase(), business: o.business,
      provider: o.provider || 'email', createdAt: (o.createdAt || now).toISOString ? (o.createdAt || now).toISOString() : o.createdAt,
      status: 'active', plan: 'free', billing: 'monthly', subscription: { status: 'none' },
      trial: { status: 'unused' }, payments: [], onboarded: false
    };
  };

  function connect(db, userId, sheetId, tab, folderId, account, attrs, filters) {
    const ws = db.workspaces[userId];
    Object.assign(ws.integrations.sheets, { connected: true, account, sheetId, tab, autoSync: true });
    Object.assign(ws.integrations.drive, { connected: true, account, folderId, lastScan: CA.now().toISOString() });
    const t = CA.products.tab(db, sheetId, tab);
    const m = CA.products.autoMap(t.headers);
    if (attrs) m.attributes = attrs;
    if (filters) m.filters = filters;
    ws.mapping = m;
    CA.products.sync(db, userId, { mode: 'inicial' });
  }

  CA.seed.build = function () {
    const now = CA.now();
    const ago = (d) => u.addDays(now, -d);
    const db = {
      version: CA.CONFIG.dataVersion,
      meta: { createdAt: now.toISOString(), clockOffsetDays: 0 },
      sheets: u.clone(CA.DEMO_SOURCES.sheets),
      drive: u.clone(CA.DEMO_SOURCES.drive),
      users: [], workspaces: {}, planOverrides: {}, adminLog: []
    };
    const addUser = (o) => { const usr = CA.seed.newUser(o, now); usr.onboarded = true; db.users.push(usr); db.workspaces[usr.id] = CA.seed.newWorkspace(); return usr; };
    const pay = (usr, planId, billing, daysAgo, n) => {
      for (let i = 0; i < n; i++) {
        const at = billing === 'yearly' ? u.addMonths(ago(daysAgo), -12 * i) : u.addMonths(ago(daysAgo), -i);
        usr.payments.push({ id: 'PAG-' + u.rand(6, '0123456789'), at: at.toISOString(), plan: planId, billing, amount: CA.subscriptions.price(planId, billing), status: 'Pagado (simulado)', method: 'Pago de demostración' });
      }
    };

    // 1) Cuenta demo: TecnoStore (Gratis con prueba Profesional activa)
    const demo = addUser({ id: 'usr_demo', name: 'Carla Méndez', email: CA.CONFIG.demoAccount.email, business: 'TecnoStore Bolivia', createdAt: ago(6) });
    connect(db, demo.id, 'sh-tecno', 'Productos', 'fd-tecno-fotos', 'tienda@tecnostore.bo', ['Color', 'Garantía'], ['__brand']);
    demo.trial = { status: 'active', startedAt: ago(5).toISOString(), endsAt: u.addDays(ago(5), CA.CONFIG.trialDays).toISOString(), extraDays: 0 };
    const c1 = CA.catalogs.create(db, demo.id, { name: 'TecnoStore', slug: 'tecnostore', template: 'nova', whatsapp: '59171234567' });
    Object.assign(c1.design, { businessName: 'TecnoStore Bolivia', featuredProducts: ['lap-001', 'pc-001', 'mon-002', 'com-001'], featuredCategories: ['Laptops', 'Computadoras', 'Monitores', 'Accesorios'] });
    c1.design.footer.address = 'Av. Ejemplo 123, Santa Cruz (dirección ficticia)';
    c1.design.footer.instagram = 'tecnostore.demo';
    c1.whatsapp.numbers[0].name = 'Carla';
    c1.status = 'published'; c1.publishedAt = ago(5).toISOString(); c1.createdAt = ago(6).toISOString();
    const c2 = CA.catalogs.create(db, demo.id, { name: 'Ofertas Gamer', slug: 'tecnostore-gamer', template: 'nova', whatsapp: '59171234567' });
    Object.assign(c2.design, { businessName: 'TecnoStore Gamer', colors: { primary: '#a855f7', secondary: '#120b24', background: '#f6f3fd', text: '#160f2a' } });
    c2.design.banner = Object.assign(c2.design.banner, { title: 'Arma tu setup gamer', subtitle: 'PCs, periféricos y componentes seleccionados para jugar en serio.', image: 'art:desktop:#a855f7' });
    c2.visibleCategories = ['Computadoras', 'Componentes', 'Mouse', 'Teclados', 'Accesorios'];
    c2.createdAt = ago(2).toISOString();
    const dws = db.workspaces[demo.id];
    dws.notifications = [];
    CA.notify(dws, 'ok', 'Prueba Profesional activada', 'Publicaste tu primer catálogo: tienes 14 días de Profesional gratis.', 'suscripcion');
    CA.notify(dws, 'warn', 'Sincronización con observaciones', '3 filas de la hoja tienen errores (SKU duplicado, precio o nombre faltante). Revísalas en Mapeo.', 'mapeo');
    CA.notify(dws, 'info', 'Tu catálogo recibe visitas', 'TecnoStore lleva más de 100 visitas esta semana.', 'estadisticas');
    dws.notifications.forEach((n, i) => { n.at = ago(4 - i).toISOString(); n.read = i > 0; });

    // 2) Negocios con catálogos publicados (demos de las otras plantillas)
    const tenants = [
      { name: 'Lucía Rojas', email: 'ventas@modaurbana.bo', business: 'Moda Urbana', plan: 'pro', billing: 'yearly', since: 120, sheet: 'sh-moda', tab: 'Colección', folder: 'fd-moda', attrs: ['Talla', 'Color'], filters: ['Talla', 'Color'], slug: 'moda-urbana', tpl: 'atelier', wa: '59172345678', mode: 'page' },
      { name: 'Daniela Torres', email: 'hola@glowbelleza.bo', business: 'Glow Belleza', plan: 'starter', billing: 'monthly', since: 75, sheet: 'sh-glow', tab: 'Productos', folder: 'fd-glow', attrs: ['Tono'], filters: ['__brand', 'Tono'], slug: 'glow-belleza', tpl: 'glow', wa: '59173456789' },
      { name: 'Marco Quispe', email: 'pedidos@andina.bo', business: 'Distribuidora Andina', plan: 'business', billing: 'monthly', since: 210, sheet: 'sh-andina', tab: 'Lista de precios', folder: 'fd-andina', attrs: ['Unidad', 'Precio caja'], filters: ['__brand', 'Unidad'], slug: 'distribuidora-andina', tpl: 'mayorista', wa: '59174567890', extraWa: [['Ventas La Paz', '59174567891'], ['Ventas El Alto', '59174567892']] }
    ];
    tenants.forEach((t) => {
      const usr = addUser({ name: t.name, email: t.email, business: t.business, createdAt: ago(t.since) });
      usr.plan = t.plan; usr.billing = t.billing; usr.trial = { status: 'converted', startedAt: ago(t.since - 1).toISOString(), endsAt: ago(t.since - 15).toISOString() };
      usr.subscription = { status: 'active', since: ago(t.since - 14).toISOString(), renewsAt: u.addMonths(ago(t.since - 14), t.billing === 'yearly' ? 12 : Math.ceil((t.since - 14) / 30) + 1).toISOString() };
      pay(usr, t.plan, t.billing, t.billing === 'yearly' ? t.since - 14 : 14, t.billing === 'yearly' ? 1 : Math.max(1, Math.floor((t.since - 14) / 30)));
      connect(db, usr.id, t.sheet, t.tab, t.folder, t.email, t.attrs, t.filters);
      const c = CA.catalogs.create(db, usr.id, { name: t.business, slug: t.slug, template: t.tpl, whatsapp: t.wa });
      c.status = 'published'; c.publishedAt = ago(t.since - 2).toISOString(); c.createdAt = ago(t.since - 2).toISOString();
      c.design.businessName = t.business;
      if (t.mode) c.productMode = t.mode;
      if (t.extraWa) t.extraWa.forEach((n) => c.whatsapp.numbers.push({ name: n[0], number: n[1] }));
      c.whatsapp.numbers[0].name = t.name.split(' ')[0];
      const ws = db.workspaces[usr.id];
      c.design.featuredProducts = ws.products.filter((p) => p.sync !== 'error').slice(0, 4).map((p) => p.id);
      if (t.tpl === 'mayorista') c.design.benefits = ['Precios por volumen', 'Entrega en 24 h en ciudad', 'Crédito para clientes frecuentes'];
      if (t.tpl === 'atelier') c.design.benefits = ['Envíos a todo Bolivia', 'Cambios de talla sin costo', 'Pago contra entrega'];
      if (t.tpl === 'glow') c.design.benefits = ['Productos 100 % originales', 'Asesoría personalizada', 'Muestras con tu pedido'];
    });

    // 3) Cuentas sintéticas para el superadministrador (sin catálogos reales)
    const NAMES = ['Ferretería El Tornillo', 'Librería Saber', 'Zapatería Paso Firme', 'Pet Shop Huellitas', 'Panadería La Espiga', 'Óptica Visión Clara', 'Juguetería Mundo Feliz', 'Farmacia Salud+', 'Bazar Don Pepe', 'Celulares Express', 'Deportes Andes', 'Muebles Roble', 'Floristería Primavera', 'Vinoteca Tarija', 'Repuestos Moto Sur', 'Electro Hogar', 'Cosméticos Bella', 'Tienda Natural Vida', 'Regalos Detalles', 'Instrumentos Musicales Do Re Mi', 'Papelería Arcoíris', 'Joyería Brillo', 'Agro Insumos Oriente', 'Ropa Infantil Pequeños'];
    const rnd = u.seeded('tenants');
    NAMES.forEach((business, i) => {
      const r = rnd();
      const plan = r < 0.42 ? 'free' : r < 0.66 ? 'starter' : r < 0.9 ? 'pro' : 'business';
      const since = 3 + Math.floor(rnd() * 300);
      const usr = CA.seed.newUser({ name: 'Titular ' + (i + 1), email: u.slug(business).replace(/-/g, '') + '@ejemplo.bo', business, createdAt: ago(since), provider: rnd() > 0.5 ? 'google' : 'email' }, now);
      usr.synthetic = true; usr.onboarded = true;
      if (plan !== 'free') {
        const billing = rnd() > 0.7 ? 'yearly' : 'monthly';
        usr.plan = plan; usr.billing = billing;
        usr.subscription = { status: rnd() > 0.92 ? 'canceled' : 'active', since: ago(since).toISOString(), renewsAt: u.addDays(now, 3 + Math.floor(rnd() * 27)).toISOString() };
        usr.trial = { status: 'converted' };
        pay(usr, plan, billing, 5, billing === 'yearly' ? 1 : Math.max(1, Math.floor(since / 30)));
      } else if (since < 16 && rnd() > 0.2) {
        usr.trial = { status: 'active', startedAt: ago(since).toISOString(), endsAt: u.addDays(ago(since), 14).toISOString() };
      } else usr.trial = { status: rnd() > 0.5 ? 'expired' : 'unused' };
      if (rnd() > 0.93) usr.status = 'suspended';
      const lim = CA.PLANS[CA.plans.effective(usr)].limits;
      usr.stats = { catalogs: Math.max(1, Math.round(rnd() * lim.catalogs)), products: Math.round(lim.products * (0.25 + rnd() * 0.6) / (plan === 'business' ? 8 : 1)), published: rnd() > 0.15 ? 1 : 0 };
      db.users.push(usr);
    });
    return db;
  };
})();
