/* =========================================================
 * TecnoDreams 2.0 — camada de operações do catálogo (protótipo)
 * Fornecedores e custos, fotos por SKU (S1…Sn + SZ) com versão,
 * SEO, estados do Google Merchant Center, importações em massa
 * (CSV / API REST simulada) e registros de alterações.
 *
 * TUDO É SIMULADO no navegador (localStorage "td_ops_v1"):
 * nenhuma chamada a Excel, AWS S3/CloudFront, Google ou a uma
 * API real é feita. Os produtos reais (products.js) recebem
 * metadados DEMONSTRATIVOS determinísticos (fornecedor, custo,
 * SZ, metadescrição); os produtos importados são de teste.
 * Alterações de nome, preço, estoque e publicação de produtos
 * reais são gravadas também em "td_admin_v1" e aparecem na loja.
 * Depende de products.js.
 * ========================================================= */
(function () {
  'use strict';
  const TD = window.TD;
  const KEY = 'td_ops_v1';
  const BASE_DATE = '2026-10-20T12:00:00.000Z'; // consulta à Store API
  const CDN = 'https://dxxxxxxxxxxxxx.cloudfront.net'; // domínio ilustrativo
  const SUPPLIERS = ['Fornecedor Alfa', 'Importadora Beta', 'Distribuidora Gama', 'Atacado Delta'];
  const LOG_MAX = 400;
  const ERR_MAX = 300;

  const hash = (str) => { let h = 2166136261; const s = String(str); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  function rng(seed) { let h = seed >>> 0; return () => { h ^= h << 13; h >>>= 0; h ^= h >> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; }; }
  const round2 = (n) => Math.round(n * 100) / 100;
  const slugify = (s) => TD.norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const normSku = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const now = () => new Date().toISOString();

  /* ---------------- estado ---------------- */
  function empty() {
    return { v: 1, meta: {}, imported: [], imports: [], log: [], errors: [], merchantLog: [], sitemap: null, migration: null, demos: {}, seq: 0 };
  }
  let state = null;
  let cache = null;
  function S() {
    if (!state) { state = TD.readJSON(KEY, null); if (!state || state.v !== 1) state = empty(); }
    return state;
  }
  function save() {
    const ok = TD.writeJSON(KEY, S());
    cache = null;
    if (!ok && TD.toast) TD.toast('Armazenamento do navegador cheio', { type: 'error', sub: 'Use “Restaurar demo” para liberar espaço.' });
    return ok;
  }
  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    state = null; cache = null;
  }
  window.addEventListener('td:catalog', () => { cache = null; });
  window.addEventListener('storage', (e) => { if (e.key === KEY) { state = null; cache = null; } });

  function pushLog(s, entry) { s.log.unshift(Object.assign({ at: now() }, entry)); if (s.log.length > LOG_MAX) s.log.length = LOG_MAX; }
  function pushError(s, entry) { s.errors.unshift(Object.assign({ at: now() }, entry)); if (s.errors.length > ERR_MAX) s.errors.length = ERR_MAX; }

  /* ---------------- fotos ---------------- */
  const cdnUrl = (sku, n, v) => CDN + '/productos/' + encodeURIComponent(sku || 'SEM-SKU') + '/' + n + '.webp?v=' + (v || 1);
  const PH_BG = ['#e6f1ff', '#e9f8ef', '#fff6e5', '#efe9ff', '#eef2f7'];
  const phCache = {};
  // imagem de teste (SVG) para produtos importados: deixa claro que não é foto real
  function demoPhoto(sku, n) {
    const k = sku + '|' + n;
    if (phCache[k]) return phCache[k];
    const bg = n === 'SZ' ? '#ffffff' : PH_BG[hash(sku) % PH_BG.length];
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="' + bg + '"/>' +
      '<rect x="4" y="4" width="192" height="192" rx="10" fill="none" stroke="#b7c4d4" stroke-width="2" stroke-dasharray="7 6"/>' +
      '<path d="M58 124l28-34 21 25 14-17 29 26z" fill="#b7c4d4"/><circle cx="124" cy="74" r="11" fill="#b7c4d4"/>' +
      '<text x="100" y="156" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" font-weight="700" fill="#33445a">' + n + '.webp</text>' +
      '<text x="100" y="177" text-anchor="middle" font-family="Arial,sans-serif" font-size="11.5" fill="#627389">' + TD.esc(sku) + ' · teste</text></svg>';
    return (phCache[k] = 'data:image/svg+xml,' + encodeURIComponent(svg));
  }
  const photoSrc = (r, ph) => (ph && (ph.data || ph.src)) || demoPhoto(r.sku || 'SEM-SKU', ph ? ph.n : 'S1');
  const szSrc = (r) => (r.sz ? r.sz.data || r.sz.src || demoPhoto(r.sku, 'SZ') : null);

  /* ---------------- SEO ---------------- */
  function autoMeta(r, catName) {
    const base = r.name + (r.brand && TD.norm(r.name).indexOf(TD.norm(r.brand)) === -1 ? ' ' + r.brand : '') + ' na TecnoDreams';
    const tail = '. ' + (catName ? catName + ' com ' : '') + 'envio para todo o Brasil ou retirada no Bom Retiro, São Paulo.';
    const t = base + tail;
    return t.length > 158 ? t.slice(0, 155).replace(/\s+\S*$/, '') + '…' : t;
  }

  /* metadados demonstrativos dos produtos reais (determinísticos) */
  function realDefaults(p, catName) {
    const h = hash(p.id + ':' + (p.sku || ''));
    return {
      supplier: SUPPLIERS[h % SUPPLIERS.length],
      cost: p.price ? round2(p.price * (0.56 + (h % 15) / 100)) : null,
      photos: (p.images || []).map((src, i) => ({ n: 'S' + (i + 1), v: 1, src })),
      sz: (h % 10) < 7 && p.images && p.images.length ? { v: 1, src: p.images[0] } : null,
      metaDesc: (h % 5) === 0 ? '' : autoMeta(p, catName),
      alt: (h % 7) === 0 ? '' : p.name,
      merchant: { st: 'pendente', err: '', at: null },
      updatedAt: BASE_DATE, syncAt: null, photoSync: 'ok'
    };
  }

  /* ---------------- lista unificada ---------------- */
  function build() {
    const s = S();
    const cm = {};
    TD.categories().forEach((c) => { cm[c.slug] = c.name; });
    const out = [];
    TD.allProducts().forEach((p) => {
      const key = 'r' + p.id;
      const m = Object.assign(realDefaults(p, cm[p.category]), s.meta[key] || {});
      out.push({
        key, real: true, id: p.id, sku: p.sku || '', name: p.name, brand: p.brand || '', category: p.category,
        supplier: m.supplier, cost: m.cost, price: p.price || null, stock: p.stock, status: p.active ? 'publicado' : 'rascunho',
        photos: m.photos, sz: m.sz, metaDesc: m.metaDesc, alt: m.alt, slug: p.slug || slugify(p.name),
        merchant: m.merchant, updatedAt: m.updatedAt, syncAt: m.syncAt, photoSync: m.photoSync, src: 'woocommerce'
      });
    });
    s.imported.forEach((x) => out.push(Object.assign({ key: 'i' + x.sku, real: false }, x)));

    const skuN = {}, nameN = {}, slugN = {};
    out.forEach((r) => {
      r.nsku = normSku(r.sku);
      r.nname = TD.norm(r.name).replace(/\s+/g, ' ').trim();
      if (r.nsku) skuN[r.nsku] = (skuN[r.nsku] || 0) + 1;
      nameN[r.nname] = (nameN[r.nname] || 0) + 1;
      slugN[r.slug] = (slugN[r.slug] || 0) + 1;
    });
    const byKey = {};
    out.forEach((r) => {
      r.catName = cm[r.category] || r.category || '';
      r.available = r.stock > 0;
      r.img = r.photos.length ? photoSrc(r, r.photos[0]) : TD.placeholder;
      r.dupSku = !!r.nsku && skuN[r.nsku] > 1;
      r.dupName = nameN[r.nname] > 1;
      r.dupSlug = slugN[r.slug] > 1;
      r.photoState = !r.sku ? 'sem_sku' : !r.photos.length ? 'sem_fotos' : r.photoSync === 'pendente' ? 'pendente' : !r.sz ? 'sem_sz' : 'ok';
      r.issues = [];
      if (!r.sku) r.issues.push('SKU ausente');
      if (!r.price) r.issues.push('Sem preço');
      if (!r.brand) r.issues.push('Sem marca');
      if (!r.supplier) r.issues.push('Sem fornecedor');
      if (!r.photos.length) r.issues.push('Sem fotos');
      if (!r.metaDesc) r.issues.push('Sem metadescrição');
      r.incomplete = r.issues.length > 0;
      r.indexable = r.status === 'publicado' && !r.dupSlug;
      r.hay = TD.norm(r.sku + ' ' + r.name + ' ' + r.brand);
      byKey[r.key] = r;
    });
    cache = { list: out, byKey, cm };
    return cache;
  }
  const data = () => cache || build();
  const list = () => data().list;
  const byKey = (k) => data().byKey[k] || null;
  const catName = (slug) => data().cm[slug] || slug;

  function stats() {
    const L = list();
    const st = { total: L.length, real: 0, imported: 0, pub: 0, draft: 0, noStock: 0, incomplete: 0, noPhotos: 0, noSZ: 0, noSku: 0, pendGoogle: 0, merch: {}, noMeta: 0, noAlt: 0, dupSlug: 0, dupSku: 0, dupName: 0, indexable: 0, versioned: 0, todayUpd: 0 };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    L.forEach((r) => {
      r.real ? st.real++ : st.imported++;
      r.status === 'publicado' ? st.pub++ : st.draft++;
      if (!r.available) st.noStock++;
      if (r.incomplete) st.incomplete++;
      if (!r.photos.length) st.noPhotos++;
      if (r.sku && r.photos.length && !r.sz) st.noSZ++;
      if (!r.sku) st.noSku++;
      if (r.status === 'publicado' && r.merchant.st === 'pendente') st.pendGoogle++;
      st.merch[r.merchant.st] = (st.merch[r.merchant.st] || 0) + 1;
      if (!r.metaDesc) st.noMeta++;
      if (r.photos.length && !r.alt) st.noAlt++;
      if (r.dupSlug) st.dupSlug++;
      if (r.dupSku) st.dupSku++;
      if (r.dupName) st.dupName++;
      if (r.indexable) st.indexable++;
      if ((r.sz && r.sz.v > 1) || r.photos.some((p) => p.v > 1)) st.versioned++;
      if (new Date(r.updatedAt) >= today) st.todayUpd++;
    });
    return st;
  }

  /* ---------------- gravação ---------------- */
  const STORE_FIELDS = ['name', 'brand', 'category', 'price', 'stock', 'sku'];
  const MERCHANT_FIELDS = ['name', 'price', 'stock', 'status', 'sku', 'brand'];
  /* changes: [{ rec, patch }]. opts.silent = não altera data nem reabre o Merchant */
  function apply(changes, origin, opts) {
    opts = opts || {};
    const s = S();
    const adm = TD.adminState();
    let admDirty = false;
    const t = now();
    const idx = {};
    s.imported.forEach((x, i) => { idx['i' + x.sku] = i; });
    let n = 0;
    changes.forEach(({ rec, patch }) => {
      if (!rec || !patch) return;
      patch = Object.assign({}, patch);
      if (!opts.silent) {
        if ('price' in patch && patch.price !== rec.price) pushLog(s, { t: 'preco', key: rec.key, sku: rec.sku, name: rec.name, from: rec.price, to: patch.price, origin });
        if ('status' in patch && patch.status !== rec.status) pushLog(s, { t: 'status', key: rec.key, sku: rec.sku, name: rec.name, from: rec.status, to: patch.status, origin });
        if ('stock' in patch && (patch.stock > 0) !== rec.available) pushLog(s, { t: 'disp', key: rec.key, sku: rec.sku, name: rec.name, from: rec.available ? 'disponível' : 'sem disponibilidade', to: patch.stock > 0 ? 'disponível' : 'sem disponibilidade', origin });
        const touches = MERCHANT_FIELDS.some((k) => k in patch && patch[k] !== rec[k]) || 'sz' in patch;
        if (touches && !('merchant' in patch) && rec.merchant.st !== 'pendente') patch.merchant = { st: 'pendente', err: '', at: rec.merchant.at };
        patch.updatedAt = t;
      }
      if (rec.real) {
        const sp = {};
        const ops = {};
        Object.keys(patch).forEach((k) => {
          if (STORE_FIELDS.indexOf(k) > -1) sp[k] = patch[k];
          else if (k === 'status') sp.active = patch.status === 'publicado';
          else ops[k] = patch[k];
        });
        if (Object.keys(sp).length) {
          if (TD.baseProducts.some((p) => p.id === rec.id)) adm.overrides[rec.id] = Object.assign(adm.overrides[rec.id] || {}, sp);
          else { const a = adm.added.find((p) => p.id === rec.id); if (a) Object.assign(a, sp); }
          admDirty = true;
        }
        if (Object.keys(ops).length) s.meta[rec.key] = Object.assign(s.meta[rec.key] || {}, ops);
      } else {
        const i = idx[rec.key];
        if (i == null) return;
        Object.assign(s.imported[i], patch);
      }
      n++;
    });
    if (admDirty) TD.saveAdminState(adm);
    save();
    return n;
  }
  const patchOne = (rec, patch, origin, opts) => apply([{ rec, patch }], origin, opts);

  function removeImported(keys) {
    const s = S();
    const set = new Set(keys);
    const before = s.imported.length;
    s.imported = s.imported.filter((x) => !set.has('i' + x.sku));
    save();
    return before - s.imported.length;
  }

  /* ---------------- importação ---------------- */
  const COLS = ['sku', 'nome', 'marca', 'categoria', 'fornecedor', 'custo', 'preco', 'estoque', 'publicar'];
  const ALIASES = { sku: ['sku', 'codigo', 'cod', 'referencia'], nome: ['nome', 'name', 'produto', 'descricao'], marca: ['marca', 'brand'], categoria: ['categoria', 'category'], fornecedor: ['fornecedor', 'supplier', 'proveedor'], custo: ['custo', 'cost', 'precocusto', 'costo'], preco: ['preco', 'price', 'precovenda', 'precio'], estoque: ['estoque', 'stock', 'qtd', 'quantidade', 'disponibilidade'], publicar: ['publicar', 'status', 'publicado'] };
  const TPL = {
    mouse: { names: ['Mouse Gamer {b} D-{m} RGB', 'Mouse Sem Fio {b} D-{m}', 'Mouse Ergonômico {b} D-{m}'], brands: ['Logitech', 'Redragon'], price: [79, 499] },
    teclados: { names: ['Teclado Mecânico {b} D-{m} ABNT2', 'Teclado Sem Fio {b} D-{m}'], brands: ['Logitech', 'Redragon'], price: [149, 899] },
    'fones-de-ouvido': { names: ['Headset Gamer {b} D-{m} 7.1', 'Fone Bluetooth {b} D-{m}'], brands: ['Logitech', 'Cougar'], price: [129, 1199] },
    'caixas-de-som': { names: ['Caixa de Som Bluetooth {b} D-{m}', 'Soundbar {b} D-{m}'], brands: ['JBL', 'Creative', 'Logitech'], price: [199, 2499] },
    cameras: { names: ['Webcam Full HD {b} D-{m}'], brands: ['Logitech'], price: [199, 899] },
    'cadeiras-gamer': { names: ['Cadeira Gamer {b} D-{m} Reclinável'], brands: ['Cougar'], price: [1299, 3499] },
    'mesas-gamer': { names: ['Mesa Gamer {b} D-{m} 120 cm'], brands: ['Cougar'], price: [899, 2299] },
    smartwatch: { names: ['Smartwatch {b} D-{m} à Prova d’Água'], brands: ['Microwear'], price: [149, 499] },
    simulacao: { names: ['Volante {b} D-{m} com Pedais', 'Joystick {b} D-{m}'], brands: ['Logitech'], price: [499, 3999] },
    carregadores: { names: ['Estação de Carga {b} D-{m} 6 Portas'], brands: ['Kakia'], price: [99, 299] },
    cozinha: { names: ['Bandeja Inox {b} D-{m}', 'Travessa Decorada {b} D-{m}', 'Bowl Inox {b} D-{m}'], brands: ['TD'], price: [29, 149] }
  };
  // posições (nas 300 primeiras linhas) com problemas intencionais
  const FLAWS = { 40: 'dupe', 81: 'dupe', 120: 'dupe', 161: 'dupe', 199: 'dupe', 53: 'sku-empty', 129: 'sku-space', 204: 'sku-slash', 90: 'price-empty', 168: 'price-text', 241: 'cat-unknown', 61: 'near-dupe', 223: 'near-dupe', 96: 'same-name', 261: 'same-name' };
  const to90 = (v) => Math.floor(v) + 0.9;

  /* Planilha de teste determinística: produtos novos (SKU TDX-…), 20 atualizações
     de produtos reais e erros intencionais (duplicados, SKU inválido, preço inválido…). */
  function demoRows(n) {
    n = n || 300;
    const r = rng(2026102700);
    const real = TD.baseProducts.filter((p) => p.sku && p.price).slice(0, 20);
    const cats = Object.keys(TPL);
    const cm = data().cm;
    const rows = [];
    const news = [];
    let realIdx = 0;
    let seq = 0;
    for (let i = 0; i < n; i++) {
      if (i % 15 === 7 && realIdx < real.length) {
        const p = real[realIdx++];
        const h = hash(p.sku);
        rows.push({ sku: p.sku, nome: p.name, marca: p.brand, categoria: cm[p.category] || p.category, fornecedor: SUPPLIERS[h % 4], custo: round2(p.price * 0.62), preco: to90(p.price * (0.97 + r() * 0.09)), estoque: h % 6 === 0 ? 0 : 2 + Math.floor(r() * 30), publicar: 'sim' });
        continue;
      }
      const flaw = FLAWS[i];
      if (flaw === 'dupe' && news.length > 5) {
        const src = news[news.length - 5];
        rows.push(Object.assign({}, src, { preco: to90(src.preco * 1.08) }));
        continue;
      }
      const cat = cats[Math.floor(r() * cats.length)];
      const t = TPL[cat];
      const brand = t.brands[Math.floor(r() * t.brands.length)];
      const model = 100 + Math.floor(r() * 900);
      let name = t.names[Math.floor(r() * t.names.length)].replace('{b}', brand).replace('{m}', model);
      const price = to90(t.price[0] + r() * (t.price[1] - t.price[0]));
      let sku = 'TDX-' + (20001 + seq++);
      if (flaw === 'near-dupe' && news.length > 3) sku = news[news.length - 3].sku.replace('-', '');
      if (flaw === 'same-name' && news.length > 8) name = news[news.length - 8].nome;
      const row = {
        sku, nome: name, marca: brand, categoria: r() < 0.5 ? cm[cat] || cat : cat, fornecedor: SUPPLIERS[Math.floor(r() * SUPPLIERS.length)],
        custo: round2(price * (0.55 + r() * 0.15)), preco: price, estoque: r() < 0.09 ? 0 : 1 + Math.floor(r() * 40), publicar: 'sim'
      };
      if (flaw === 'sku-empty') row.sku = '';
      if (flaw === 'sku-space') row.sku = 'TDX 99 ' + model;
      if (flaw === 'sku-slash') row.sku = 'TDX/' + model;
      if (flaw === 'price-empty') row.preco = '';
      if (flaw === 'price-text') row.preco = 'consultar';
      if (flaw === 'cat-unknown') row.categoria = 'Notebooks';
      rows.push(row);
      if (!flaw) news.push(row);
    }
    return rows;
  }

  function toCSV(rows) {
    const cell = (v) => {
      if (v == null) return '';
      const s = typeof v === 'number' ? String(v).replace('.', ',') : String(v);
      return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return COLS.join(';') + '\n' + rows.map((r) => COLS.map((c) => cell(r[c])).join(';')).join('\n');
  }

  /* CSV com ";" ou "," (detectado), aspas e BOM. Retorna { rows, error } */
  function parseCSV(text) {
    text = String(text || '').replace(/^﻿/, '');
    const first = text.split(/\r?\n/, 1)[0] || '';
    const delim = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : ',';
    const out = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
      } else if (c === '"') q = true;
      else if (c === delim) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); out.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); out.push(row); }
    const lines = out.filter((r) => r.some((c) => c.trim() !== ''));
    if (lines.length < 2) return { rows: [], error: 'O arquivo não tem linhas de dados.' };
    const head = lines[0].map((h) => TD.norm(h).replace(/[^a-z]/g, ''));
    const map = {};
    Object.keys(ALIASES).forEach((k) => { const i = head.findIndex((h) => ALIASES[k].indexOf(h) > -1); if (i > -1) map[k] = i; });
    if (map.sku == null || map.preco == null) return { rows: [], error: 'Colunas obrigatórias não encontradas: sku e preco. Use a planilha modelo.' };
    const rows = lines.slice(1).map((l) => { const o = {}; Object.keys(map).forEach((k) => { o[k] = (l[map[k]] || '').trim(); }); return o; });
    return { rows, delim };
  }

  function num(v) {
    if (v == null) return null;
    if (typeof v === 'number') return v;
    let s = String(v).replace(/R\$|\s/g, '');
    if (s === '') return null;
    if (s.indexOf(',') > -1) s = s.replace(/\./g, '').replace(',', '.');
    const n = Number(s);
    return isNaN(n) ? NaN : n;
  }

  /* Valida cada linha e classifica: novo, atualizar, duplicado, erro */
  function analyze(rows) {
    const L = list();
    const bySku = {}, byNorm = {};
    L.forEach((r) => { if (r.sku) { bySku[r.sku.toUpperCase()] = r; byNorm[r.nsku] = r; } });
    const catBy = {};
    TD.categories().forEach((c) => { catBy[c.slug] = c.slug; catBy[TD.norm(c.name)] = c.slug; });
    const seen = {};
    const seenNorm = {};
    return rows.map((row, i) => {
      const line = i + 2;
      const sku = String(row.sku || '').trim().toUpperCase();
      const errs = [], warns = [];
      if (!sku) errs.push('SKU vazio');
      else if (!/^[A-Z0-9][A-Z0-9-]{2,31}$/.test(sku)) errs.push('SKU inválido “' + row.sku + '” (use letras, números e hífen)');
      const price = num(row.preco);
      if (price == null) errs.push('Preço vazio');
      else if (isNaN(price) || price <= 0) errs.push('Preço inválido “' + row.preco + '”');
      const cost = num(row.custo);
      if (cost != null && isNaN(cost)) errs.push('Custo inválido “' + row.custo + '”');
      else if (cost && price && cost >= price) warns.push('Custo maior ou igual ao preço');
      const stock = row.estoque == null || row.estoque === '' ? null : parseInt(row.estoque, 10);
      if (stock != null && (isNaN(stock) || stock < 0)) errs.push('Estoque inválido “' + row.estoque + '”');
      const cat = row.categoria ? catBy[TD.norm(row.categoria).trim()] || null : null;
      if (row.categoria && !cat) errs.push('Categoria inexistente “' + row.categoria + '”');
      const existing = sku ? bySku[sku] || null : null;
      if (!existing && sku && !errs.length) {
        if (!row.nome) errs.push('Nome obrigatório para produto novo');
        if (!cat) errs.push('Categoria obrigatória para produto novo');
        const near = byNorm[normSku(sku)];
        if (near) warns.push('SKU semelhante a ' + near.sku + ' (possível duplicado)');
      }
      let action;
      if (errs.length) action = 'erro';
      else if (seen[sku]) { action = 'duplicado'; errs.push('SKU repetido no arquivo (primeira ocorrência na linha ' + seen[sku] + ')'); }
      else {
        const nk = normSku(sku);
        const prev = seenNorm[nk];
        if (prev && !existing && prev.sku !== sku) warns.push('SKU semelhante a ' + prev.sku + ' (linha ' + prev.line + '): possível duplicado');
        seen[sku] = line;
        if (!prev) seenNorm[nk] = { sku, line };
        action = existing ? 'atualizar' : 'novo';
      }
      return { line, sku, row, action, errs, warns, price, cost: cost == null || isNaN(cost) ? null : cost, stock, cat, existing };
    });
  }

  function decideStatus(publicar, stock, opts, current) {
    const p = TD.norm(publicar || '');
    if (opts.autoDraft && stock === 0) return 'rascunho';
    if (/^(nao|no|rascunho|draft|0)$/.test(p)) return 'rascunho';
    if (/^(sim|si|yes|publicado|publicar|1)$/.test(p)) return 'publicado';
    return current || 'publicado';
  }

  function importBegin(o) {
    const s = S();
    s.seq = (s.seq || 0) + 1;
    return { id: 'IMP-' + String(s.seq).padStart(4, '0'), at: now(), t0: Date.now(), source: o.source, file: o.file, total: o.analysis.length, created: 0, updated: 0, unchanged: 0, analysis: o.analysis, opts: o.opts || {} };
  }
  function importChunk(items, ctx) {
    const s = S();
    const t = now();
    const changes = [];
    items.forEach((it) => {
      const r = it.row;
      if (it.action === 'novo') {
        if (s.imported.some((x) => x.sku === it.sku)) return;
        const stock = it.stock == null ? 0 : it.stock;
        s.imported.push({
          sku: it.sku, name: r.nome.trim(), brand: (r.marca || '').trim(), category: it.cat, supplier: (r.fornecedor || '').trim(), cost: it.cost, price: it.price, stock,
          status: decideStatus(r.publicar, stock, ctx.opts), photos: [], sz: null, metaDesc: '', alt: '', slug: slugify(r.nome),
          merchant: { st: 'pendente', err: '', at: null }, updatedAt: t, syncAt: t, photoSync: 'ok', src: ctx.source, importId: ctx.id
        });
        ctx.created++;
      } else if (it.action === 'atualizar') {
        const rec = it.existing;
        const patch = { syncAt: t };
        if (r.nome && r.nome.trim() !== rec.name) patch.name = r.nome.trim();
        if (r.marca && r.marca.trim() !== rec.brand) patch.brand = r.marca.trim();
        if (it.cat && it.cat !== rec.category) patch.category = it.cat;
        if (r.fornecedor && r.fornecedor.trim() !== rec.supplier) patch.supplier = r.fornecedor.trim();
        if (it.cost != null && it.cost !== rec.cost) patch.cost = it.cost;
        if (ctx.opts.updatePrices !== false && it.price !== rec.price) patch.price = it.price;
        if (it.stock != null && it.stock !== rec.stock) patch.stock = it.stock;
        const st = decideStatus(r.publicar, it.stock == null ? rec.stock : it.stock, ctx.opts, rec.status);
        if (st !== rec.status) patch.status = st;
        if (Object.keys(patch).length > 1) { changes.push({ rec, patch }); ctx.updated++; } else { changes.push({ rec, patch: { syncAt: t } }); ctx.unchanged++; }
      }
    });
    const real = changes.filter((c) => Object.keys(c.patch).length > 1);
    const touch = changes.filter((c) => Object.keys(c.patch).length === 1);
    if (real.length) apply(real, 'Importação ' + ctx.id);
    if (touch.length) apply(touch, 'Importação ' + ctx.id, { silent: true });
    if (!changes.length) save();
  }
  function importEnd(ctx) {
    const s = S();
    const bad = ctx.analysis.filter((a) => a.action === 'erro' || a.action === 'duplicado');
    const errorRows = bad.map((a) => ({ line: a.line, sku: a.sku || a.row.sku || '', msg: a.errs.join('; '), kind: a.action }));
    const warnRows = ctx.analysis.filter((a) => a.warns.length && (a.action === 'novo' || a.action === 'atualizar')).map((a) => ({ line: a.line, sku: a.sku, msg: a.warns.join('; '), kind: 'aviso' }));
    const rec = {
      id: ctx.id, at: ctx.at, source: ctx.source, file: ctx.file, total: ctx.total, created: ctx.created, updated: ctx.updated, unchanged: ctx.unchanged,
      dup: bad.filter((a) => a.action === 'duplicado').length, errors: bad.filter((a) => a.action === 'erro').length, warns: warnRows.length,
      ms: Date.now() - ctx.t0, rows: errorRows.concat(warnRows).slice(0, 300)
    };
    s.imports.unshift(rec);
    if (s.imports.length > 30) s.imports.length = 30;
    errorRows.slice(0, 40).forEach((e) => pushError(s, { area: 'Importação', sku: e.sku, msg: 'Linha ' + e.line + ': ' + e.msg, ref: ctx.id }));
    save();
    return rec;
  }

  /* ---------------- Google Merchant Center (simulado) ---------------- */
  function merchantCheck(r) {
    if (!r.sku) return 'SKU ausente: o identificador do item é obrigatório';
    if (!r.price) return 'Preço ausente (produto sob consulta)';
    if (!r.sz) return 'Imagem SZ.webp ausente';
    if (!r.brand) return 'Marca ausente (identificadores insuficientes)';
    if (r.name.length > 150) return 'Título com mais de 150 caracteres';
    return '';
  }
  /* Valida e "envia" os itens publicados selecionados por filter (padrão: pendentes e com erro) */
  function merchantSync(filter, label) {
    const s = S();
    const t = now();
    const recs = list().filter((r) => r.status === 'publicado' && (filter ? filter(r) : r.merchant.st === 'pendente' || r.merchant.st === 'erro'));
    let sent = 0, errs = 0;
    const changes = recs.map((r) => {
      const e = merchantCheck(r);
      if (e) { errs++; pushError(s, { area: 'Google Merchant', sku: r.sku, msg: e + ' — ' + r.name }); return { rec: r, patch: { merchant: { st: 'erro', err: e, at: t } } }; }
      sent++;
      return { rec: r, patch: { merchant: { st: 'enviado', err: '', at: t } } };
    });
    s.merchantLog.unshift({ at: t, action: label || 'Sincronização', n: recs.length, ok: sent, err: errs, detail: sent + ' enviado(s), ' + errs + ' bloqueado(s) pela validação interna' });
    if (s.merchantLog.length > 50) s.merchantLog.length = 50;
    apply(changes, 'Google Merchant', { silent: true });
    return { total: recs.length, sent, errs };
  }
  function merchantProcess() {
    const s = S();
    const t = now();
    const recs = list().filter((r) => r.merchant.st === 'enviado');
    if (!recs.length) return 0;
    apply(recs.map((r) => ({ rec: r, patch: { merchant: { st: 'processado', err: '', at: t } } })), 'Google Merchant', { silent: true });
    s.merchantLog.unshift({ at: t, action: 'Recebido pelo Google (simulado)', n: recs.length, ok: recs.length, err: 0, detail: recs.length + ' item(ns) passaram para “processado”' });
    save();
    return recs.length;
  }
  const REJECT = ['Preço da página diferente do enviado (simulado)', 'Imagem com texto promocional sobreposto (simulado)', 'Categoria do Google não identificada (simulado)'];
  function merchantResponse() {
    const s = S();
    const t = now();
    const recs = list().filter((r) => r.merchant.st === 'processado');
    let ok = 0, bad = 0;
    const changes = recs.map((r) => {
      const h = hash(r.key + 'gmc');
      if (h % 100 < 12) { bad++; const e = REJECT[h % REJECT.length]; pushError(s, { area: 'Google Merchant', sku: r.sku, msg: 'Reprovado: ' + e + ' — ' + r.name }); return { rec: r, patch: { merchant: { st: 'reprovado', err: e, at: t } } }; }
      ok++;
      return { rec: r, patch: { merchant: { st: 'aprovado', err: '', at: t } } };
    });
    if (recs.length) s.merchantLog.unshift({ at: t, action: 'Resposta do Google (SIMULADA)', n: recs.length, ok, err: bad, detail: ok + ' aprovado(s) e ' + bad + ' reprovado(s) — valores fictícios' });
    apply(changes, 'Google Merchant', { silent: true });
    return { ok, bad };
  }

  /* ---------------- fotos (S3 simulado) ---------------- */
  // Simula a leitura do prefixo productos/SKU/ no bucket e vincula os arquivos encontrados
  function associatePhotos() {
    const s = S();
    let linked = 0, missing = 0, withSZ = 0;
    const recs = list().filter((r) => !r.real && r.sku && !r.photos.length);
    const changes = recs.map((r) => {
      const h = hash(r.sku + 'ph');
      if (h % 100 < 8) { missing++; pushError(s, { area: 'Fotografias', sku: r.sku, msg: 'Nenhum arquivo encontrado em productos/' + r.sku + '/' }); return null; }
      const n = 1 + (h % 4);
      const photos = [];
      for (let i = 1; i <= n; i++) photos.push({ n: 'S' + i, v: 1 });
      const sz = h % 100 < 78 ? { v: 1 } : null;
      if (sz) withSZ++;
      linked++;
      return { rec: r, patch: { photos, sz, alt: r.alt || r.name, photoSync: 'ok' } };
    }).filter(Boolean);
    apply(changes, 'Fotografias S3');
    return { scanned: recs.length, linked, missing, withSZ };
  }
  function setPhotos(rec, photos, extra) {
    // renomeia pela posição (S1 = principal) e cria nova versão do que mudou de nome
    const out = photos.map((p, i) => { const n = 'S' + (i + 1); return n === p.n ? p : Object.assign({}, p, { n, v: (p.v || 1) + 1 }); });
    return patchOne(rec, Object.assign({ photos: out }, extra || {}), 'Fotografias S3');
  }
  function movePhoto(rec, from, to) {
    const ph = rec.photos.slice();
    if (to < 0 || to >= ph.length) return 0;
    const [x] = ph.splice(from, 1);
    ph.splice(to, 0, x);
    return setPhotos(rec, ph);
  }
  function replacePhoto(rec, n, dataUrl) {
    if (n === 'SZ') {
      const sz = Object.assign({}, rec.sz || {}, { v: rec.sz ? (rec.sz.v || 1) + 1 : 1 });
      if (dataUrl) sz.data = dataUrl;
      return patchOne(rec, { sz, photoSync: 'pendente' }, 'Fotografias S3');
    }
    const ph = rec.photos.map((p) => (p.n === n ? Object.assign({}, p, { v: (p.v || 1) + 1 }, dataUrl ? { data: dataUrl } : {}) : p));
    if (!rec.photos.some((p) => p.n === n)) ph.push(Object.assign({ n: 'S' + (ph.length + 1), v: 1 }, dataUrl ? { data: dataUrl } : {}));
    return patchOne(rec, { photos: ph, photoSync: 'pendente' }, 'Fotografias S3');
  }
  function finishPhotoSync(key) {
    const r = byKey(key);
    if (r && r.photoSync === 'pendente') patchOne(r, { photoSync: 'ok' }, 'Fotografias S3', { silent: true });
  }

  /* ---------------- SEO ---------------- */
  function fillSeo() {
    let meta = 0, alt = 0;
    const changes = list().map((r) => {
      const p = {};
      if (!r.metaDesc) { p.metaDesc = autoMeta(r, r.catName); meta++; }
      if (!r.alt && r.photos.length) { p.alt = r.name; alt++; }
      return Object.keys(p).length ? { rec: r, patch: p } : null;
    }).filter(Boolean);
    apply(changes, 'SEO automático', { silent: true });
    return { meta, alt };
  }
  function sitemap() {
    const urls = list().filter((r) => r.indexable);
    S().sitemap = { at: now(), n: urls.length };
    save();
    const cats = TD.categories().filter((c) => c.count);
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      cats.slice(0, 3).map((c) => '  <url><loc>https://www.tecnodreams.com/categoria/' + c.slug + '</loc></url>').join('\n') + '\n' +
      urls.slice(0, 6).map((r) => '  <url><loc>https://www.tecnodreams.com/produto/' + r.slug + '</loc><lastmod>' + String(r.updatedAt).slice(0, 10) + '</lastmod></url>').join('\n') +
      '\n  <!-- … mais ' + Math.max(0, urls.length - 6) + ' URLs de produto e ' + Math.max(0, cats.length - 3) + ' de categoria -->\n</urlset>';
    return { xml, n: urls.length, cats: cats.length };
  }

  function markDemo(id) { S().demos[id] = now(); save(); }

  TD.ops = {
    SUPPLIERS, CDN, list, byKey, stats, catName, apply, patchOne, removeImported, reset, save,
    state: S, cdnUrl, photoSrc, szSrc, demoPhoto, autoMeta, slugify, normSku,
    COLS, demoRows, toCSV, parseCSV, analyze, importBegin, importChunk, importEnd,
    merchantCheck, merchantSync, merchantProcess, merchantResponse,
    associatePhotos, movePhoto, setPhotos, replacePhoto, finishPhotoSync,
    fillSeo, sitemap, markDemo, pushError: (e) => { pushError(S(), e); save(); }
  };
})();
