/*
 * Catálogo público: búsqueda, filtros, orden, modal o página de producto,
 * lista de consulta por WhatsApp y vista previa para el editor (iframe).
 * Los visitantes no necesitan cuenta.
 */
(function () {
  'use strict';
  const CA = window.CA, R = CA.render;
  const u = CA.util, esc = u.esc, ic = R.ic;
  const root = document.getElementById('c-root');
  const slug = u.qs('c');
  const preview = u.qs('preview') === '1';
  const editor = u.qs('editor') === '1';
  const LIST_KEY = 'catalogia:list:' + slug;
  const VIEW_KEY = 'catalogia:viewed:' + slug;

  CA.boot();

  const state = { q: '', cat: '', filters: {}, inStock: false, sort: 'relevance', product: u.qs('p') || null };
  let found, eff, list = loadList();

  function loadList() { try { return JSON.parse(localStorage.getItem(LIST_KEY) || '[]'); } catch (e) { return []; } }
  function saveList() { localStorage.setItem(LIST_KEY, JSON.stringify(list)); }

  function load() {
    found = CA.catalogs.findBySlug(CA.store.db, slug);
    if (!found) return false;
    eff = CA.catalogs.effective(CA.store.db, found.user, found.catalog);
    list = list.filter((it) => eff.products.some((p) => p.id === it.id));
    return true;
  }

  const track = (type, pid) => { if (!preview && found) CA.analytics.track(found.user.id, found.catalog.id, type, pid); };
  const publicBase = () => (found.catalog.domain && eff.limits.customDomain ? 'https://' + found.catalog.domain : CA.catalogs.publicUrl(found.catalog));

  const ctx = {
    state,
    get eff() { return eff; },
    get listCount() { return list.reduce((a, it) => a + it.qty, 0); },
    inList: (id) => list.some((it) => it.id === id),
    qtyOf: (id) => (list.find((it) => it.id === id) || { qty: 0 }).qty,
    productHref: (p) => 'catalogo.html?c=' + encodeURIComponent(slug) + '&p=' + encodeURIComponent(p.id) + (preview ? '&preview=1' : '') + (editor ? '&editor=1' : ''),
    productPublicUrl: (p) => publicBase() + '/p/' + p.id,
    waHref: (p) => {
      const n = eff.whatsapp.numbers[0];
      if (!n) return '#';
      return CA.wa.link(n.number, CA.wa.fill(eff.whatsapp.message, CA.wa.productVars(p, found.catalog.name, ctx.productPublicUrl(p), n.name)));
    },
    waGeneral: () => {
      const n = eff.whatsapp.numbers[0];
      return n ? CA.wa.link(n.number, 'Hola, vengo del catálogo ' + found.catalog.name + ' (' + publicBase() + '). Quisiera hacer una consulta.') : '#';
    }
  };

  /* ---------------- filtrado ---------------- */
  function filtered() {
    const q = state.q.trim().toLowerCase();
    let out = eff.products.filter((p) => {
      if (state.cat && p.category !== state.cat) return false;
      if (state.inStock && p.availability === 'out') return false;
      for (const k of Object.keys(state.filters)) {
        const vals = state.filters[k];
        if (vals.length && !vals.some((v) => CA.products.matchesFilter(p, k, v))) return false;
      }
      if (q) {
        const hay = (p.name + ' ' + p.sku + ' ' + p.brand + ' ' + p.category + ' ' + p.description + ' ' + Object.values(p.attributes).join(' ')).toLowerCase();
        if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      return true;
    });
    const price = (p) => p.offer || p.price;
    if (state.sort === 'price-asc') out.sort((a, b) => price(a) - price(b));
    if (state.sort === 'price-desc') out.sort((a, b) => price(b) - price(a));
    if (state.sort === 'name') out.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return out;
  }

  /* ---------------- render ---------------- */
  function unavailable(title, text) {
    document.title = title;
    root.innerHTML = '<div class="c-unavail"><div><span class="c-u-ic">' + ic('shield') + '</span><h1>' + esc(title) + '</h1><p>' + esc(text) + '</p><a class="c-btn c-btn-p" href="index.html">Conocer ' + esc(CA.CONFIG.brand.name) + '</a></div></div>';
  }

  function render(keepScroll) {
    if (!load()) return unavailable('Catálogo no encontrado', 'La dirección no corresponde a ningún catálogo. Revisa el enlace que recibiste.');
    const st = CA.catalogs.liveStatus(CA.store.db, found.user, found.ws, found.catalog);
    if (!st.live && !preview) {
      const msg = { draft: 'Este catálogo todavía no fue publicado.', limit: 'Este catálogo está pausado temporalmente.', suspended: 'Este catálogo no está disponible en este momento.' }[st.reason];
      return unavailable(found.catalog.name, msg);
    }
    const d = eff.design;
    document.body.className = 'tpl-' + d.template + ' card-' + d.card.style + ' ratio-' + d.card.ratio + ' btn-' + d.buttons.shape + (editor ? ' is-editor' : '');
    document.body.setAttribute('style', R.styleVars(d));
    document.title = (state.product ? (eff.products.find((p) => p.id === state.product) || {}).name + ' · ' : '') + d.businessName;
    const y = window.scrollY;
    const bar = preview ? '<div class="c-preview">' + (st.live ? 'Vista previa del catálogo publicado' : 'Vista previa · este catálogo no está publicado') + (eff.warnings.length ? ' · ' + esc(eff.warnings[0]) : '') + '</div>' : '';
    root.innerHTML = bar + R.header(ctx) + '<main id="c-main"></main>' + R.footer(ctx) + R.floating(ctx) + '<div class="c-drawer" id="cDrawer" aria-hidden="true"></div><div class="c-scrim" id="cScrim"></div><div class="c-modal" id="cModal" aria-hidden="true"></div>';
    renderMain();
    bindStatic();
    if (keepScroll) window.scrollTo(0, y);
    if (editor) decorateSections();
  }

  function renderMain() {
    const main = document.getElementById('c-main');
    const all = eff.products;
    if (state.product) {
      const p = all.find((x) => x.id === state.product);
      if (!p) { state.product = null; return renderMain(); }
      if (eff.productMode === 'page') {
        main.innerHTML = '<div class="c-wrap c-crumbs"><a href="#" data-home>Inicio</a> › <a href="#" data-cat="' + esc(p.category) + '">' + esc(p.category) + '</a> › <span>' + esc(p.name) + '</span></div><div class="c-wrap">' + R.detail(p, ctx, true) + '</div>';
        bindMain();
        return;
      }
    }
    main.innerHTML = R.home(ctx, filtered(), all);
    bindMain();
    if (state.product && eff.productMode === 'modal') openModal(state.product, true);
  }

  /* ---------------- interacciones ---------------- */
  function goHome() { state.product = null; state.q = ''; state.cat = ''; state.filters = {}; state.inStock = false; pushUrl(); render(); window.scrollTo(0, 0); }
  function pushUrl() {
    const url = 'catalogo.html?c=' + encodeURIComponent(slug) + (state.product ? '&p=' + encodeURIComponent(state.product) : '') + (preview ? '&preview=1' : '') + (editor ? '&editor=1' : '');
    try { history.pushState({ p: state.product }, '', url); } catch (e) { /* file:// puede restringir */ }
  }
  function setCat(c) {
    state.cat = c; state.product = null;
    closeNav();
    renderMain();
    scrollToProducts();
  }
  function scrollToProducts() { const el = document.getElementById('productos'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  function closeNav() { const n = document.getElementById('cNav'); if (n) n.classList.remove('open'); }

  function bindStatic() {
    const s = document.getElementById('cSearch');
    if (s) s.addEventListener('input', u.debounce(() => { state.q = s.value; state.product = null; renderMain(); }, 200));
    if (s) s.addEventListener('keydown', (e) => { if (e.key === 'Enter') scrollToProducts(); });
    document.getElementById('cListBtn').onclick = openDrawer;
    document.getElementById('cMenuBtn').onclick = () => document.getElementById('cNav').classList.toggle('open');
    document.getElementById('cScrim').onclick = () => { closeDrawer(); closeModal(); };
    root.querySelectorAll('.c-dd-btn').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); b.parentElement.classList.toggle('open'); }));
  }

  function bindMain() {
    const main = document.getElementById('c-main');
    const sort = document.getElementById('cSort');
    if (sort) sort.onchange = () => { state.sort = sort.value; renderMain(); };
    const stock = document.getElementById('fStock');
    if (stock) stock.onchange = () => { state.inStock = stock.checked; renderMain(); };
    main.querySelectorAll('[data-fk]').forEach((c) => (c.onchange = () => {
      const k = c.dataset.fk;
      const cur = new Set(state.filters[k] || []);
      if (c.checked) cur.add(c.value); else cur.delete(c.value);
      state.filters[k] = Array.from(cur);
      renderMain();
    }));
    main.querySelectorAll('[data-fsel]').forEach((sl) => (sl.onchange = () => { state.filters[sl.dataset.fsel] = sl.value ? [sl.value] : []; renderMain(); }));
    ['cClear', 'cClear2'].forEach((id) => { const b = document.getElementById(id); if (b) b.onclick = () => { state.q = ''; state.cat = ''; state.filters = {}; state.inStock = false; const s = document.getElementById('cSearch'); if (s) s.value = ''; renderMain(); }; });
    const fb = document.getElementById('cFilterBtn');
    if (fb) fb.onclick = () => { main.querySelector('.c-side').classList.add('open'); document.getElementById('cScrim').classList.add('on'); };
    const sc = document.getElementById('cSideClose');
    if (sc) sc.onclick = () => { main.querySelector('.c-side').classList.remove('open'); document.getElementById('cScrim').classList.remove('on'); };
    main.querySelectorAll('[data-gal]').forEach((b) => (b.onclick = () => galleryTo(main, b)));
    main.querySelectorAll('[data-qty]').forEach((inp) => (inp.onchange = () => setQty(inp.dataset.qty, Math.max(0, Math.floor(Number(inp.value) || 0)))));
  }

  // Delegación de clics (funciona en todo el documento, incluido el modal)
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-home],[data-cat],[data-goto],[data-open],[data-add],[data-wa],[data-inc],[data-dec],[data-close],[data-rm],[data-send],[data-clear-list],[data-seller]');
    if (!t) { root.querySelectorAll('.c-dd.open').forEach((d) => d.classList.remove('open')); return; }
    if (t.hasAttribute('data-home')) { e.preventDefault(); closeModal(); goHome(); return; }
    if (t.hasAttribute('data-cat')) { e.preventDefault(); closeModal(); root.querySelectorAll('.c-dd.open').forEach((d) => d.classList.remove('open')); if (state.product) { state.product = null; pushUrl(); } setCat(t.dataset.cat); return; }
    if (t.hasAttribute('data-goto')) {
      e.preventDefault(); closeNav();
      const g = t.dataset.goto;
      if (g === 'products') { if (state.product) { state.product = null; pushUrl(); renderMain(); } scrollToProducts(); }
      else { const el = document.getElementById(g); if (el) el.scrollIntoView({ behavior: 'smooth' }); }
      return;
    }
    if (t.hasAttribute('data-open')) {
      e.preventDefault();
      const id = t.dataset.open;
      track('product', id);
      if (eff.productMode === 'page') { closeModal(); state.product = id; pushUrl(); renderMain(); window.scrollTo(0, 0); document.title = (eff.products.find((p) => p.id === id) || {}).name + ' · ' + eff.design.businessName; }
      else openModal(id);
      return;
    }
    if (t.hasAttribute('data-add')) { e.preventDefault(); toggleList(t.dataset.add); return; }
    if (t.hasAttribute('data-inc')) { setQty(t.dataset.inc, ctx.qtyOf(t.dataset.inc) + 1); return; }
    if (t.hasAttribute('data-dec')) { setQty(t.dataset.dec, ctx.qtyOf(t.dataset.dec) - 1); return; }
    if (t.hasAttribute('data-close')) { e.preventDefault(); closeModal(); closeDrawer(); return; }
    if (t.hasAttribute('data-rm')) { setQty(t.dataset.rm, 0); return; }
    if (t.hasAttribute('data-clear-list')) { list = []; saveList(); refreshListUi(); openDrawer(); return; }
    if (t.hasAttribute('data-send')) { track('consult'); return; } // el enlace wa.me se abre normalmente
    if (t.hasAttribute('data-seller')) { track('whatsapp', t.dataset.pid || null); closeModal(); return; }
    if (t.hasAttribute('data-wa')) {
      if (!eff.whatsapp.numbers.length) { e.preventDefault(); alert('Este catálogo aún no configuró un número de WhatsApp.'); return; }
      if (editor) { e.preventDefault(); return; }
      if (eff.whatsapp.numbers.length > 1) { e.preventDefault(); chooseSeller(t.dataset.wa); return; }
      track('whatsapp', t.dataset.wa === 'general' ? null : t.dataset.wa);
    }
  });

  window.addEventListener('popstate', () => { state.product = u.qs('p'); closeModal(); renderMain(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeDrawer(); } });

  function galleryTo(scope, b) {
    const p = eff.products.find((x) => x.id === (state.modal || state.product));
    if (!p) return;
    const g = p.gallery.length ? p.gallery : [p.image];
    scope.querySelector('.c-pd-img').src = CA.imgSrc(g[+b.dataset.gal]);
    scope.querySelectorAll('[data-gal]').forEach((x) => x.classList.toggle('on', x === b));
  }

  /* ---------------- modal de producto ---------------- */
  function openModal(id, silent) {
    const p = eff.products.find((x) => x.id === id);
    if (!p) return;
    state.modal = id;
    const m = document.getElementById('cModal');
    m.innerHTML = '<div class="c-modal-box" role="dialog" aria-modal="true" aria-label="' + esc(p.name) + '"><button type="button" class="c-modal-x" data-close aria-label="Cerrar">' + ic('x') + '</button>' + R.detail(p, ctx, false) +
      '<div class="c-modal-url">' + ic('share') + esc(ctx.productPublicUrl(p)) + '</div></div>';
    m.classList.add('open'); m.setAttribute('aria-hidden', 'false');
    document.getElementById('cScrim').classList.add('on');
    document.body.classList.add('c-noscroll');
    m.querySelectorAll('[data-gal]').forEach((b) => (b.onclick = () => galleryTo(m, b)));
    if (!silent) { /* evento ya registrado al abrir */ }
  }
  function closeModal() {
    const m = document.getElementById('cModal');
    if (!m || !m.classList.contains('open')) return;
    m.classList.remove('open'); m.setAttribute('aria-hidden', 'true');
    state.modal = null;
    if (!document.getElementById('cDrawer').classList.contains('open')) document.getElementById('cScrim').classList.remove('on');
    document.body.classList.remove('c-noscroll');
  }

  function chooseSeller(pid) {
    const p = pid && pid !== 'general' ? eff.products.find((x) => x.id === pid) : null;
    const m = document.getElementById('cModal');
    m.innerHTML = '<div class="c-modal-box c-modal-sm"><button type="button" class="c-modal-x" data-close aria-label="Cerrar">' + ic('x') + '</button><h3>¿Con quién quieres hablar?</h3><p class="c-muted">' + (p ? esc(p.name) : 'Consulta general') + '</p><div class="c-sellers">' +
      eff.whatsapp.numbers.map((n) => {
        const text = p ? CA.wa.fill(eff.whatsapp.message, CA.wa.productVars(p, found.catalog.name, ctx.productPublicUrl(p), n.name)) : 'Hola, vengo del catálogo ' + found.catalog.name + '.';
        return '<a class="c-seller" href="' + CA.wa.link(n.number, text) + '" target="_blank" rel="noopener" data-seller data-pid="' + esc(pid || '') + '">' + ic('wa') + '<div><b>' + esc(n.name || 'Ventas') + '</b><small>' + CA.wa.format(CA.wa.normalize(n.number)) + '</small></div></a>';
      }).join('') + '</div></div>';
    m.classList.add('open'); document.getElementById('cScrim').classList.add('on');
  }

  /* ---------------- lista de consulta ---------------- */
  function toggleList(id) {
    if (ctx.inList(id)) list = list.filter((it) => it.id !== id);
    else list.push({ id, qty: 1 });
    saveList();
    refreshListUi();
    toast(ctx.inList(id) ? 'Agregado a tu lista de consulta' : 'Quitado de tu lista');
  }
  function setQty(id, qty) {
    const it = list.find((x) => x.id === id);
    if (qty <= 0) list = list.filter((x) => x.id !== id);
    else if (it) it.qty = qty; else list.push({ id, qty });
    saveList();
    refreshListUi();
  }
  function refreshListUi() {
    const c = document.getElementById('cListCount'); if (c) { c.textContent = ctx.listCount; c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
    document.querySelectorAll('[data-add]').forEach((b) => {
      const on = ctx.inList(b.dataset.add);
      b.classList.toggle('on', on);
      if (b.classList.contains('c-btn-icon')) b.innerHTML = ic(on ? 'check' : 'plus');
      else b.innerHTML = ic(on ? 'check' : 'plus') + (on ? 'En tu lista' : 'Agregar a la lista');
    });
    document.querySelectorAll('[data-qty]').forEach((i) => { if (document.activeElement !== i) i.value = ctx.qtyOf(i.dataset.qty); });
    if (document.getElementById('cDrawer').classList.contains('open')) openDrawer();
  }
  function openDrawer() {
    const dr = document.getElementById('cDrawer');
    const items = list.map((it) => ({ product: eff.products.find((p) => p.id === it.id), qty: it.qty })).filter((it) => it.product);
    const n = eff.whatsapp.numbers[0];
    const text = items.length ? CA.wa.listText(eff.whatsapp.listMessage || 'Hola, quiero consultar estos productos:', items, found.catalog.name, publicBase()) : '';
    const total = items.reduce((a, it) => a + (it.product.offer || it.product.price) * it.qty, 0);
    dr.innerHTML = '<div class="c-dr-h"><h3>' + ic('list') + 'Lista de consulta</h3><button type="button" class="c-modal-x" data-close aria-label="Cerrar">' + ic('x') + '</button></div>' +
      (items.length ? '<div class="c-dr-items">' + items.map((it) => '<div class="c-dr-item">' + R.img(it.product.image, '') + '<div><b>' + esc(it.product.name) + '</b><small>' + esc(it.product.sku) + ' · ' + u.money(it.product.offer || it.product.price) + '</small>' +
        '<div class="c-qty c-qty-sm"><button type="button" data-dec="' + esc(it.product.id) + '">' + ic('minus') + '</button><span>' + it.qty + '</span><button type="button" data-inc="' + esc(it.product.id) + '">' + ic('plus') + '</button></div></div><button type="button" class="c-dr-rm" data-rm="' + esc(it.product.id) + '" aria-label="Quitar">' + ic('x') + '</button></div>').join('') + '</div>' +
        '<div class="c-dr-f"><div class="c-dr-total"><span>Total referencial</span><b>' + u.money(total) + '</b></div><details class="c-dr-msg"><summary>Ver mensaje que se enviará</summary><pre>' + esc(text) + '</pre></details>' +
        (eff.whatsapp.numbers.length > 1 ? '<div class="c-sellers">' + eff.whatsapp.numbers.map((x) => '<a class="c-seller" href="' + CA.wa.link(x.number, text) + '" target="_blank" rel="noopener" data-send>' + ic('wa') + '<div><b>Enviar a ' + esc(x.name || 'Ventas') + '</b><small>' + CA.wa.format(CA.wa.normalize(x.number)) + '</small></div></a>').join('') + '</div>'
          : '<a class="c-btn c-btn-wa c-btn-lg c-btn-block" href="' + (n ? CA.wa.link(n.number, text) : '#') + '" target="_blank" rel="noopener" data-send>' + ic('wa') + 'Enviar consulta por WhatsApp</a>') +
        '<button type="button" class="c-link" data-clear-list>Vaciar lista</button><p class="c-muted c-dr-note">No es un carrito de compras: envías una consulta y coordinas el pago directamente con el vendedor.</p></div>'
        : '<div class="c-empty c-empty-sm">' + ic('list') + '<h3>Tu lista está vacía</h3><p>Agrega productos con el botón ' + ic('plus') + ' y envía una sola consulta por WhatsApp.</p></div>');
    dr.classList.add('open'); dr.setAttribute('aria-hidden', 'false');
    document.getElementById('cScrim').classList.add('on');
  }
  function closeDrawer() {
    const dr = document.getElementById('cDrawer');
    if (!dr || !dr.classList.contains('open')) return;
    dr.classList.remove('open'); dr.setAttribute('aria-hidden', 'true');
    if (!document.getElementById('cModal').classList.contains('open')) document.getElementById('cScrim').classList.remove('on');
  }

  let toastT;
  function toast(msg) {
    let t = document.getElementById('cToast');
    if (!t) { t = document.createElement('div'); t.id = 'cToast'; t.className = 'c-toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200);
  }

  /* ---------------- modo editor (iframe de vista previa) ---------------- */
  function decorateSections() {
    root.querySelectorAll('[data-section]').forEach((s) => {
      if (s.querySelector(':scope > .c-edit-tag')) return;
      const label = { header: 'Encabezado y menú', footer: 'Footer' }[s.dataset.section] || CA.SECTIONS[s.dataset.section] || s.dataset.section;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'c-edit-tag'; b.textContent = '✎ ' + label;
      b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); parent.postMessage({ type: 'ca:select', section: s.dataset.section }, '*'); };
      s.appendChild(b);
    });
  }
  window.addEventListener('message', (e) => {
    const m = e.data || {};
    if (m.type === 'ca:refresh') { CA.store.reload(); render(true); }
    if (m.type === 'ca:highlight') {
      root.querySelectorAll('.c-hl').forEach((x) => x.classList.remove('c-hl'));
      const s = root.querySelector('[data-section="' + m.section + '"]');
      if (s) { s.classList.add('c-hl'); s.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }
  });
  // Cambios hechos en otra pestaña (por ejemplo, editar un precio en el panel)
  CA.store.on((o) => { if (o === 'external') render(true); });

  render();
  if (found && !preview && CA.catalogs.liveStatus(CA.store.db, found.user, found.ws, found.catalog).live && !sessionStorage.getItem(VIEW_KEY)) {
    sessionStorage.setItem(VIEW_KEY, '1');
    track('view');
  }
})();
