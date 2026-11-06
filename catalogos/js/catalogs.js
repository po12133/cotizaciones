/*
 * Catálogos: crear, editar, duplicar, eliminar, publicar y resolver la vista pública.
 * Aplica los límites del plan vigente (cantidad, plantillas, personalización, categorías).
 */
(function () {
  'use strict';
  const CA = (window.CA = window.CA || {});
  const u = CA.util;
  const C = (CA.catalogs = {});

  C.list = (db, userId) => (db.workspaces[userId].catalogs || []);
  C.get = (db, userId, id) => C.list(db, userId).find((c) => c.id === id) || null;
  C.publicUrl = (c) => 'https://' + c.slug + '.' + CA.CONFIG.brand.domain;
  /** Enlace local que abre la vista pública simulada. */
  C.localUrl = (c, extra) => 'catalogo.html?c=' + encodeURIComponent(c.slug) + (extra || '');

  function uniqueSlug(db, base, exceptId) {
    let slug = u.slug(base) || 'catalogo';
    const taken = (s) => Object.values(db.workspaces).some((ws) => (ws.catalogs || []).some((c) => c.slug === s && c.id !== exceptId));
    let n = 2, s = slug;
    while (taken(s)) s = slug + '-' + n++;
    return s;
  }
  C.uniqueSlug = uniqueSlug;

  C.create = function (db, userId, data) {
    const user = db.users.find((x) => x.id === userId);
    const ws = db.workspaces[userId];
    const limits = CA.plans.effectiveLimits(user, db);
    if (C.list(db, userId).length >= limits.catalogs) throw new CA.BizError('Tu plan ' + CA.plans.label(user) + ' permite ' + limits.catalogs + ' catálogo' + (limits.catalogs === 1 ? '' : 's') + '. Cambia de plan para crear más.');
    const name = String(data.name || '').trim();
    if (name.length < 3) throw new CA.BizError('Ingresa un nombre de al menos 3 caracteres.', 'name');
    const tpl = data.template || 'nova';
    if (!CA.plans.templateAllowed(limits, tpl)) throw new CA.BizError('La plantilla ' + CA.TEMPLATES[tpl].name + ' no está incluida en tu plan.', 'template');
    const now = CA.now().toISOString();
    const c = {
      id: u.uid('cat'), slug: uniqueSlug(db, data.slug || name), name,
      status: 'draft', createdAt: now, updatedAt: now, publishedAt: null,
      source: { sheetId: ws.integrations.sheets.sheetId, tab: ws.integrations.sheets.tab },
      visibleCategories: [], productMode: 'modal', domain: '',
      design: CA.defaultDesign(tpl, user.business),
      whatsapp: {
        numbers: [{ name: user.name.split(' ')[0], number: data.whatsapp || '' }],
        message: 'Hola, estoy interesado en el producto {producto}, con código {sku} y precio {precio}. ¿Está disponible?',
        listMessage: 'Hola, quiero consultar estos productos del catálogo {catalogo}:',
        buttonText: 'Consultar por WhatsApp', floating: true, position: 'right', floatingText: '¿Te ayudamos?'
      }
    };
    ws.catalogs.push(c);
    return c;
  };

  C.update = function (db, userId, id, patch) {
    const c = C.get(db, userId, id);
    if (!c) throw new CA.BizError('Catálogo no encontrado.');
    if (patch.name != null && String(patch.name).trim().length < 3) throw new CA.BizError('Ingresa un nombre de al menos 3 caracteres.', 'name');
    if (patch.slug != null) {
      const s = u.slug(patch.slug);
      if (s.length < 3) throw new CA.BizError('La dirección debe tener al menos 3 caracteres (letras, números y guiones).', 'slug');
      if (C.uniqueSlug(db, s, id) !== s) throw new CA.BizError('La dirección "' + s + '" ya está en uso.', 'slug');
      patch.slug = s;
    }
    if (patch.domain) {
      const user = db.users.find((x) => x.id === userId);
      if (!CA.plans.effectiveLimits(user, db).customDomain) throw new CA.BizError('El dominio propio está disponible desde el plan Profesional.', 'domain');
      if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(patch.domain)) throw new CA.BizError('Dominio no válido (ej. catalogo.minegocio.com).', 'domain');
    }
    Object.assign(c, patch, { updatedAt: CA.now().toISOString() });
    return c;
  };

  C.duplicate = function (db, userId, id) {
    const src = C.get(db, userId, id);
    const user = db.users.find((x) => x.id === userId);
    const limits = CA.plans.effectiveLimits(user, db);
    if (C.list(db, userId).length >= limits.catalogs) throw new CA.BizError('Llegaste al límite de ' + limits.catalogs + ' catálogo(s) de tu plan.');
    const c = u.clone(src);
    const now = CA.now().toISOString();
    Object.assign(c, { id: u.uid('cat'), name: src.name + ' (copia)', slug: uniqueSlug(db, src.slug + '-copia'), status: 'draft', publishedAt: null, createdAt: now, updatedAt: now, domain: '' });
    db.workspaces[userId].catalogs.push(c);
    return c;
  };

  C.remove = function (db, userId, id) {
    const ws = db.workspaces[userId];
    const c = C.get(db, userId, id);
    if (!c) throw new CA.BizError('Catálogo no encontrado.');
    ws.catalogs = ws.catalogs.filter((x) => x.id !== id);
    ws.events = (ws.events || []).filter((e) => e.catalogId !== id);
    return c;
  };

  /**
   * Publica o despublica. La primera publicación en plan Gratis activa la prueba
   * Profesional de 14 días (sin tarjeta). Devuelve { catalog, trialStarted }.
   */
  C.setPublished = function (db, userId, id, publish) {
    const c = C.get(db, userId, id);
    const user = db.users.find((x) => x.id === userId);
    const ws = db.workspaces[userId];
    if (!c) throw new CA.BizError('Catálogo no encontrado.');
    let trialStarted = false;
    if (publish) {
      if (!ws.integrations.sheets.connected || !(ws.products || []).some((p) => p.sync !== 'error')) throw new CA.BizError('Conecta Google Sheets y sincroniza productos antes de publicar.');
      if (!c.whatsapp.numbers.some((n) => n.number)) throw new CA.BizError('Configura un número de WhatsApp antes de publicar.');
      if (user.trial.status === 'unused' && !CA.plans.paidActive(user)) {
        const now = CA.now();
        user.trial = { status: 'active', startedAt: now.toISOString(), endsAt: u.addDays(now, CA.CONFIG.trialDays).toISOString(), extraDays: 0 };
        trialStarted = true;
        CA.notify(ws, 'ok', 'Prueba Profesional activada', 'Publicaste tu primer catálogo: tienes ' + CA.CONFIG.trialDays + ' días de Profesional gratis, sin tarjeta.', 'suscripcion');
      }
      const limits = CA.plans.effectiveLimits(user, db);
      const live = ws.catalogs.filter((x) => x.status === 'published' && x.id !== id).length;
      if (live >= limits.catalogs) throw new CA.BizError('Tu plan permite ' + limits.catalogs + ' catálogo(s) publicado(s).');
      c.status = 'published';
      c.publishedAt = c.publishedAt || CA.now().toISOString();
    } else c.status = 'draft';
    c.updatedAt = CA.now().toISOString();
    return { catalog: c, trialStarted };
  };

  /** Busca un catálogo por su dirección en todos los negocios. */
  C.findBySlug = function (db, slug) {
    for (const user of db.users) {
      const ws = db.workspaces[user.id];
      const c = ws && (ws.catalogs || []).find((x) => x.slug === slug);
      if (c) return { catalog: c, user, ws };
    }
    return null;
  };

  /** ¿Está visible al público? Considera estado, cuenta suspendida y límite del plan. */
  C.liveStatus = function (db, user, ws, c) {
    if (user.status === 'suspended') return { live: false, reason: 'suspended' };
    if (c.status !== 'published') return { live: false, reason: 'draft' };
    const limits = CA.plans.effectiveLimits(user, db);
    const order = ws.catalogs.filter((x) => x.status === 'published').sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));
    if (order.indexOf(c) >= limits.catalogs) return { live: false, reason: 'limit' };
    return { live: true };
  };

  /**
   * Diseño y contenido efectivos según el plan: plantilla permitida, nivel de
   * personalización, categorías visibles, modo de producto y números de WhatsApp.
   */
  C.effective = function (db, user, c) {
    const limits = CA.plans.effectiveLimits(user, db);
    const warnings = [];
    let design = u.clone(c.design);
    if (!CA.plans.templateAllowed(limits, design.template)) {
      warnings.push('La plantilla ' + CA.TEMPLATES[design.template].name + ' no está incluida en tu plan; se muestra Nova.');
      design = Object.assign(CA.defaultDesign('nova', design.businessName), { logo: design.logo, businessName: design.businessName });
    }
    const base = CA.defaultDesign(design.template, design.businessName);
    if (limits.customization === 'none') {
      const keep = { businessName: design.businessName, logo: design.logo, footer: design.footer };
      design = Object.assign(base, keep);
    } else if (limits.customization === 'basic') {
      design = Object.assign(base, {
        businessName: design.businessName, logo: design.logo, colors: design.colors,
        banner: design.banner, footer: design.footer, featuredProducts: design.featuredProducts, featuredCategories: design.featuredCategories
      });
    }
    const pub = CA.products.publishable(db, user);
    let products = pub.list;
    let cats = CA.products.categories(products);
    let visible = (c.visibleCategories || []).length ? c.visibleCategories.filter((x) => cats.includes(x)) : cats;
    if (limits.categories != null && visible.length > limits.categories) {
      warnings.push('Tu plan muestra hasta ' + limits.categories + ' categorías.');
      visible = visible.slice(0, limits.categories);
    }
    products = products.filter((p) => visible.includes(p.category));
    if (pub.hidden) warnings.push(pub.hidden + ' producto(s) superan el límite de ' + pub.limit + ' de tu plan y no se muestran.');
    const productMode = c.productMode === 'page' && limits.productPage ? 'page' : 'modal';
    if (c.productMode === 'page' && !limits.productPage) warnings.push('La página individual de producto requiere el plan Profesional; se usa el modal.');
    const numbers = c.whatsapp.numbers.filter((n) => n.number).slice(0, limits.whatsappNumbers);
    return { design, products, categories: visible, productMode, whatsapp: Object.assign({}, c.whatsapp, { numbers }), branding: limits.branding, warnings, limits, filters: (db.workspaces[user.id].mapping || {}).filters || [] };
  };
})();
