/* =========================================================
 * TecnoDreams 2.0 — módulos de catálogo do painel (protótipo)
 * Resumo do catálogo, demonstrações guiadas, produtos em massa,
 * importações (CSV / API REST simulada), fotografias S3, preços
 * e estoque, SEO, Google Merchant Center e migração WooCommerce.
 * Usa TD.ops (ops-data.js). admin.js registra estas vistas e
 * repassa os eventos (ver TD.adminOps.init).
 * Operações com Excel, AWS e Google são SIMULADAS e sinalizadas.
 * ========================================================= */
(function () {
  'use strict';
  const TD = window.TD;
  const OPS = TD.ops;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = TD.esc;
  const fmt = TD.fmt;
  const icon = (n, c) => TD.icon(n, c);
  const toast = (m, o) => TD.toast(m, o);
  let api = null; // { refresh, current, panel, kpi, productModal }

  /* ---------------- utilidades de interface ---------------- */
  const SIM = '<span class="sim" title="Operação executada só neste navegador, com dados de teste">Simulado</span>';
  const dt = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');
  const pill = (cls, txt, title) => '<span class="status ' + cls + '"' + (title ? ' title="' + esc(title) + '"' : '') + '>' + esc(txt) + '</span>';
  const money = (n) => (n ? fmt(n) : '<span class="muted">Sob consulta</span>');
  const nf = (n) => Number(n || 0).toLocaleString('pt-BR');
  const pubPill = (r) => (r.status === 'publicado' ? pill('s-ok', 'Publicado') : pill('s-mute', 'Rascunho'));
  const dispPill = (r) => (r.available ? pill('s-ok', 'Disponível · ' + r.stock) : pill('s-err', 'Sem disponibilidade'));
  const PHOTO = { ok: ['s-ok', 'S1–S{n} + SZ'], sem_sz: ['s-warn', 'Sem SZ.webp'], sem_fotos: ['s-err', 'Sem fotos'], sem_sku: ['s-err', 'Sem SKU'], pendente: ['s-info', 'Enviando ao S3…'] };
  const photoPill = (r) => { const p = PHOTO[r.photoState]; return pill(p[0], p[1].replace('{n}', r.photos.length)); };
  const MERCHANT = {
    pendente: ['s-mute', 'Pendente', 'Ainda não enviado, ou alterado desde o último envio.'],
    enviado: ['s-info', 'Enviado', 'O sistema enviou o item; aguardando o Google confirmar o recebimento.'],
    processado: ['s-violet', 'Processado', 'O Google recebeu o item e está analisando. Ainda não há aprovação.'],
    aprovado: ['s-ok', 'Aprovado (simulado)', 'Resposta do Google SIMULADA neste protótipo.'],
    reprovado: ['s-err', 'Reprovado (simulado)', 'Resposta do Google SIMULADA neste protótipo.'],
    erro: ['s-err', 'Erro de validação', 'Bloqueado pela validação interna antes do envio.']
  };
  const merchPill = (r) => (r.status !== 'publicado' ? pill('s-mute', 'Não enviado', 'Rascunhos não são enviados ao Google.') : pill(MERCHANT[r.merchant.st][0], MERCHANT[r.merchant.st][1], MERCHANT[r.merchant.st][2]));
  const testTag = (r) => (r.real ? '' : ' <span class="tag tag-warn" title="Produto de teste criado pela importação">Teste</span>');
  const thumb = (r) => '<img class="x-thumb" src="' + esc(r.img) + '" alt="" loading="lazy">';
  const chk = (attr, on, label) => '<input type="checkbox" ' + attr + (on ? ' checked' : '') + ' aria-label="' + esc(label) + '">';
  const sel = (attr, opts, val, label) => '<select ' + attr + ' aria-label="' + esc(label) + '">' + opts.map((o) => '<option value="' + esc(o[0]) + '"' + (String(val) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
  const note = (html, cls) => '<div class="x-note' + (cls ? ' ' + cls : '') + '">' + icon('info') + '<span>' + html + '</span></div>';
  const card = (title, body, extra) => '<div class="x-card"><h4>' + title + (extra || '') + '</h4>' + body + '</div>';
  const kpi = (l, v, d, ic, warn) => api.kpi(l, v, d, ic, warn);
  const panel = (t, b, a) => api.panel(t, b, a);
  function nav(sec) {
    if (location.hash === '#' + sec) api.refresh(); else location.hash = '#' + sec;
    window.scrollTo(0, 0);
  }
  function paginate(L, st) {
    const pages = Math.max(1, Math.ceil(L.length / st.per));
    st.page = Math.min(Math.max(1, st.page), pages);
    return L.slice((st.page - 1) * st.per, st.page * st.per);
  }
  function pager(total, st, scope) {
    const pages = Math.max(1, Math.ceil(total / st.per));
    const a = total ? (st.page - 1) * st.per + 1 : 0;
    const b = Math.min(total, st.page * st.per);
    return '<div class="pager"><span>' + nf(a) + '–' + nf(b) + ' de ' + nf(total) + '</span><span class="pg-btns">' +
      sel('data-xper="' + scope + '"', [[25, '25 por página'], [50, '50 por página'], [100, '100 por página']], st.per, 'Itens por página') +
      '<button class="btn btn-outline btn-sm" type="button" data-xpg="' + scope + '" data-d="-1"' + (st.page <= 1 ? ' disabled' : '') + ' aria-label="Página anterior">' + icon('left') + '</button>' +
      '<span class="pg-num">' + st.page + ' / ' + pages + '</span>' +
      '<button class="btn btn-outline btn-sm" type="button" data-xpg="' + scope + '" data-d="1"' + (st.page >= pages ? ' disabled' : '') + ' aria-label="Próxima página">' + icon('right') + '</button></span></div>';
  }
  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: type || 'text/csv;charset=utf-8' }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  const csvLine = (cells) => cells.map((c) => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(';');
  const to90 = (v) => (v >= 1 ? Math.floor(v) + 0.9 : Math.round(v * 100) / 100);

  /* =========================================================
     RESUMO DO CATÁLOGO
     ========================================================= */
  function viewDashboard(v) {
    const st = OPS.stats();
    const s = OPS.state();
    const prices = s.log.filter((l) => l.t === 'preco').slice(0, 8);
    const pct = (n) => (st.total ? Math.round((n / st.total) * 100) : 0);
    const health = [
      ['Com fotografia principal (S1)', pct(st.total - st.noPhotos)],
      ['Com SZ.webp para o Google', pct(st.total - st.noPhotos - st.noSZ - st.noSku)],
      ['Com metadescrição', pct(st.total - st.noMeta)],
      ['Publicados', pct(st.pub)],
      ['Enviados ao Google (qualquer estado)', pct(st.total - (st.merch.pendente || 0) - (st.merch.erro || 0))]
    ];
    v.innerHTML =
      '<div class="kpis">' +
      kpi('Total de produtos', nf(st.total), nf(st.real) + ' reais · ' + nf(st.imported) + ' de teste', 'package') +
      kpi('Publicados', nf(st.pub), 'Visíveis no catálogo público', 'check') +
      kpi('Em rascunho', nf(st.draft), 'Ocultos da loja', 'edit', st.draft > 0) +
      kpi('Sem disponibilidade', nf(st.noStock), 'Estoque zero segundo o Excel', 'alert', st.noStock > 0) +
      kpi('Incompletos', nf(st.incomplete), 'Falta SKU, preço, marca, foto ou meta', 'alert', st.incomplete > 0) +
      kpi('Sem fotografias', nf(st.noPhotos), nf(st.noSZ) + ' sem SZ.webp (Google)', 'image', st.noPhotos + st.noSZ > 0) +
      kpi('Pendentes no Google', nf(st.pendGoogle), nf(st.merch.erro || 0) + ' com erro de validação', 'globe', st.pendGoogle > 0) +
      kpi('Atualizados hoje', nf(st.todayUpd), 'Por importação, edição ou regra', 'refresh') + '</div>' +
      '<div class="x-quick">' +
      '<button class="btn btn-primary btn-sm" type="button" data-xdemo="importar">' + icon('upload') + 'Importar 300 produtos de teste</button>' +
      '<button class="btn btn-outline btn-sm" type="button" data-xgo="demos">' + icon('zap') + 'Roteiro de demonstrações</button>' +
      '<button class="btn btn-outline btn-sm" type="button" data-xerrors>' + icon('alert') + 'Central de erros <span class="pill-n">' + s.errors.length + '</span></button></div>' +
      '<div class="a-grid">' +
      panel('Últimas importações do Excel', s.imports.length
        ? '<div class="table-wrap"><table class="table"><thead><tr><th>Importação</th><th>Data</th><th>Origem</th><th>Criados</th><th>Atualizados</th><th>Erros</th></tr></thead><tbody>' +
          s.imports.slice(0, 5).map((i) => '<tr><td><button class="link-btn x-link" type="button" data-ximplog="' + esc(i.id) + '">' + esc(i.id) + '</button></td><td class="nowrap">' + dt(i.at) + '</td><td>' + srcLabel(i.source) + '</td><td>' + nf(i.created) + '</td><td>' + nf(i.updated) + '</td><td>' + (i.errors + i.dup ? pill('s-err', nf(i.errors + i.dup)) : pill('s-ok', '0')) + '</td></tr>').join('') + '</tbody></table></div>'
        : TD.emptyState('upload', 'Nenhuma importação ainda', 'Importe a planilha de teste para ver o processamento.', '<button class="btn btn-primary btn-sm" type="button" data-xdemo="importar">Importar 300 produtos</button>'),
        '<button class="link-more" type="button" data-xgo="importacoes">Ver todas</button>') +
      panel('Erros recentes', s.errors.length
        ? s.errors.slice(0, 7).map((e) => '<div class="list-row x-err-row">' + icon('alert') + '<div class="grow"><strong>' + esc(e.area) + (e.sku ? ' · <span class="mono">' + esc(e.sku) + '</span>' : '') + '</strong><small>' + esc(e.msg) + '</small></div><small class="muted nowrap">' + dt(e.at) + '</small></div>').join('')
        : '<div class="panel-body">' + TD.emptyState('check', 'Sem erros registrados', 'Erros de importação, fotografias e Google aparecem aqui.') + '</div>',
        '<button class="link-more" type="button" data-xerrors>Ver todos</button>') + '</div>' +
      '<div class="a-grid">' +
      panel('Últimas alterações de preço', prices.length
        ? '<div class="table-wrap"><table class="table"><thead><tr><th>Produto</th><th>De</th><th>Para</th><th>Origem</th><th>Quando</th></tr></thead><tbody>' +
          prices.map((l) => '<tr><td><span class="mono">' + esc(l.sku || '—') + '</span><br><small class="muted">' + esc(l.name) + '</small></td><td>' + money(l.from) + '</td><td><strong>' + money(l.to) + '</strong> ' + delta(l.from, l.to) + '</td><td><small>' + esc(l.origin || '') + '</small></td><td class="nowrap">' + dt(l.at) + '</td></tr>').join('') + '</tbody></table></div>'
        : '<div class="panel-body">' + TD.emptyState('percent', 'Nenhuma alteração de preço', 'Importações e edições em massa ficam registradas aqui.') + '</div>',
        '<button class="link-more" type="button" data-xgo="precos">Registro completo</button>') +
      panel('Saúde do catálogo', '<div class="panel-body"><div class="bars">' + health.map((h) => '<div class="bar-row"><span>' + h[0] + '</span><span class="bar"><span style="width:' + h[1] + '%"></span></span><span class="v">' + h[1] + '%</span></div>').join('') + '</div></div>') + '</div>';
  }
  const delta = (a, b) => (a && b ? '<small class="' + (b > a ? 'up' : 'down') + '">' + (b > a ? '+' : '') + (((b - a) / a) * 100).toFixed(1).replace('.', ',') + '%</small>' : '');
  const srcLabel = (s) => ({ csv: 'Arquivo CSV', api: 'API REST ' + SIM, demo: 'Planilha de teste ' + SIM }[s] || esc(s));

  /* =========================================================
     DEMONSTRAÇÕES
     ========================================================= */
  const DEMOS = [
    ['importar', 'Importar 300 produtos de teste', 'Gera uma planilha com 300 linhas (novos, 20 atualizações de produtos reais, duplicados e erros), mostra a validação e processa com barra de progresso.'],
    ['duplicados', 'Detectar SKU duplicados', 'Agrupa SKUs semelhantes (ex.: TDX-20050 e TDX20050), nomes repetidos e URLs iguais no catálogo.'],
    ['precos', 'Atualizar preços de 100 produtos', 'Aplica +5% (arredondado para ,90) em 100 produtos publicados e registra cada alteração com a origem.'],
    ['rascunho', 'Mudar produtos para rascunho', 'Regra automática: produtos publicados sem disponibilidade passam a rascunho e saem da loja.'],
    ['fotos', 'Associar fotografias', 'Simula a leitura do prefixo productos/SKU/ no S3 e vincula S1…Sn e SZ aos produtos importados.'],
    ['semsz', 'Identificar produtos sem SZ.webp', 'Lista os produtos que ficarão pendentes de fotografia para o Google Merchant Center.'],
    ['google', 'Simular sincronização com o Google', 'Valida os itens publicados, “envia” os válidos e bloqueia os que têm erro (sem SZ, sem preço, sem SKU…).'],
    ['erros', 'Consultar erros', 'Abre a central de erros de importação, fotografias e Google com filtro por área.'],
    ['atualizados', 'Visualizar produtos atualizados', 'Abre a tabela de produtos ordenada pelas últimas atualizações.'],
    ['filtros', 'Testar filtros e buscas', 'Aplica busca “gamer” + marca Logitech + publicados na tabela administrativa.']
  ];
  function viewDemos(v) {
    const done = OPS.state().demos;
    v.innerHTML = note('Roteiro para apresentar o protótipo. <strong>Todas as operações rodam neste navegador com dados de teste</strong>: nenhuma planilha real é lida, nada é enviado à AWS ou ao Google. Use “Restaurar demo” para recomeçar.', 'warn') +
      '<ol class="x-demos">' + DEMOS.map((d, i) => '<li class="x-demo' + (done[d[0]] ? ' done' : '') + '"><span class="n">' + (done[d[0]] ? icon('check') : i + 1) + '</span><div class="grow"><strong>' + esc(d[1]) + '</strong> ' + SIM + '<p>' + esc(d[2]) + '</p>' + (done[d[0]] ? '<small class="muted">Executado em ' + dt(done[d[0]]) + '</small>' : '') + '</div><button class="btn btn-sm ' + (done[d[0]] ? 'btn-outline' : 'btn-primary') + '" type="button" data-xdemo="' + d[0] + '">' + icon('play') + (done[d[0]] ? 'Repetir' : 'Executar') + '</button></li>').join('') + '</ol>';
  }
  function runDemo(id) {
    OPS.markDemo(id);
    const L = () => OPS.list();
    if (id === 'importar') {
      loadPreview(OPS.demoRows(300), 'demo', 'planilha-teste-300.csv');
      nav('importacoes');
      setTimeout(() => { if (imp.stage === 'preview') runImport(); }, 1200);
    } else if (id === 'duplicados') dupModal();
    else if (id === 'precos') {
      const recs = L().filter((r) => r.price && r.status === 'publicado').sort((a, b) => (a.real - b.real) || a.sku.localeCompare(b.sku)).slice(0, 100);
      const n = OPS.apply(recs.map((r) => ({ rec: r, patch: { price: to90(r.price * 1.05) } })), 'Demonstração: +5% em massa');
      toast(n + ' preços atualizados (+5%)', { sub: 'Cada alteração ficou no registro.' });
      Object.assign(rS, { log: 'preco' });
      nav('precos');
    } else if (id === 'rascunho') {
      ruleDraft(true);
      Object.assign(pS, { q: '', cat: '', brand: '', status: 'rascunho', sort: 'upd', page: 1 });
      nav('produtos');
    } else if (id === 'fotos') {
      const res = OPS.associatePhotos();
      toast(res.scanned ? res.linked + ' produtos com fotos vinculadas' : 'Nenhum produto importado sem fotos', { type: res.scanned ? 'ok' : 'info', sub: res.scanned ? res.withSZ + ' com SZ.webp · ' + res.missing + ' pastas vazias (erro)' : 'Importe a planilha de teste primeiro (passo 1).' });
      Object.assign(fS, { f: '', page: 1 });
      nav('fotos');
    } else if (id === 'semsz') { Object.assign(fS, { f: 'semsz', page: 1 }); nav('fotos'); }
    else if (id === 'google') { merchantSync(); Object.assign(mS, { f: '', page: 1 }); nav('merchant'); }
    else if (id === 'erros') errorsModal();
    else if (id === 'atualizados') { Object.assign(pS, { q: '', cat: '', brand: '', status: '', sort: 'upd', page: 1 }); nav('produtos'); }
    else if (id === 'filtros') {
      Object.assign(pS, { q: 'gamer', cat: '', brand: 'Logitech', status: 'publicado', sort: 'name', page: 1 });
      nav('produtos');
      toast('Filtros aplicados', { type: 'info', sub: 'Busca “gamer” + marca Logitech + publicados. Altere-os na barra da tabela.' });
    }
  }

  /* =========================================================
     PRODUTOS (tabela administrativa)
     ========================================================= */
  const pS = { q: '', cat: '', brand: '', status: '', sort: 'upd', page: 1, per: 25 };
  const selP = new Set();
  const P_STATUS = [['', 'Todos os status'], ['publicado', 'Publicados'], ['rascunho', 'Em rascunho'], ['indisponivel', 'Sem disponibilidade'], ['incompleto', 'Incompletos'], ['semfotos', 'Sem fotografias'], ['semsz', 'Sem SZ.webp'], ['gpend', 'Pendentes no Google'], ['gerro', 'Erro/reprovado no Google'], ['duplicados', 'Possíveis duplicados'], ['importados', 'Importados (teste)'], ['reais', 'Reais (WooCommerce)']];
  const P_SORT = [['upd', 'Últimas atualizações'], ['name', 'Nome A–Z'], ['sku', 'SKU'], ['price-asc', 'Menor preço'], ['price-desc', 'Maior preço']];
  const STATUS_FN = {
    publicado: (r) => r.status === 'publicado', rascunho: (r) => r.status === 'rascunho', indisponivel: (r) => !r.available, incompleto: (r) => r.incomplete,
    semfotos: (r) => !r.photos.length, semsz: (r) => r.sku && r.photos.length && !r.sz, gpend: (r) => r.status === 'publicado' && r.merchant.st === 'pendente',
    gerro: (r) => r.merchant.st === 'erro' || r.merchant.st === 'reprovado', duplicados: (r) => r.dupSku || r.dupName || r.dupSlug, importados: (r) => !r.real, reais: (r) => r.real
  };
  const SORT_FN = {
    upd: (a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)) || a.sku.localeCompare(b.sku),
    name: (a, b) => a.name.localeCompare(b.name, 'pt-BR'), sku: (a, b) => a.sku.localeCompare(b.sku),
    'price-asc': (a, b) => (a.price || Infinity) - (b.price || Infinity), 'price-desc': (a, b) => (b.price || 0) - (a.price || 0)
  };
  function searchFilter(L, q) {
    const terms = TD.norm(q).split(/\s+/).filter(Boolean);
    return terms.length ? L.filter((r) => terms.every((t) => r.hay.indexOf(t) > -1)) : L;
  }
  function filterProducts() {
    let L = searchFilter(OPS.list(), pS.q);
    if (pS.cat) L = L.filter((r) => r.category === pS.cat);
    if (pS.brand) L = L.filter((r) => r.brand === pS.brand);
    if (STATUS_FN[pS.status]) L = L.filter(STATUS_FN[pS.status]);
    return L.slice().sort(SORT_FN[pS.sort] || SORT_FN.upd);
  }
  function pruneSel(set) { set.forEach((k) => { if (!OPS.byKey(k)) set.delete(k); }); }

  function bulkBar(scope, set, total, actions) {
    const all = set.size < total ? '<button class="link-btn x-link" type="button" data-xselall="' + scope + '">Selecionar todos os ' + nf(total) + ' filtrados</button>' : '';
    if (!set.size) return '<div class="x-bulk idle">' + icon('info') + '<span class="grow">Selecione linhas para ações em massa.</span>' + all + '</div>';
    return '<div class="x-bulk"><strong>' + nf(set.size) + ' selecionado(s)</strong>' + all + '<span class="grow"></span>' +
      actions.map((a) => '<button class="btn btn-sm btn-outline' + (a[0] === 'excluir' ? ' x-danger' : '') + '" type="button" data-xbulk="' + a[0] + '" data-scope="' + scope + '">' + icon(a[2]) + a[1] + '</button>').join('') +
      '<button class="icon-btn" type="button" data-xbulk="limpar" data-scope="' + scope + '" aria-label="Limpar seleção">' + icon('x') + '</button></div>';
  }

  function viewProducts(v) {
    const all = OPS.list();
    const L = filterProducts();
    const slice = paginate(L, pS);
    pruneSel(selP);
    const brands = Array.from(new Set(all.map((r) => r.brand).filter(Boolean))).sort();
    const pageAll = slice.length > 0 && slice.every((r) => selP.has(r.key));
    v.innerHTML = '<div class="panel"><div class="a-toolbar">' +
      '<input type="search" placeholder="Buscar por SKU ou nome" value="' + esc(pS.q) + '" data-xq="prod" aria-label="Buscar por SKU ou nome" style="min-width:220px">' +
      sel('data-xf="prod.cat"', [['', 'Todas as categorias']].concat(TD.categories().map((c) => [c.slug, c.name])), pS.cat, 'Categoria') +
      sel('data-xf="prod.brand"', [['', 'Todas as marcas']].concat(brands.map((b) => [b, b])), pS.brand, 'Marca') +
      sel('data-xf="prod.status"', P_STATUS, pS.status, 'Status') +
      sel('data-xf="prod.sort"', P_SORT, pS.sort, 'Ordenar') +
      '<span class="grow"></span><button class="btn btn-outline btn-sm" type="button" data-xdups>' + icon('copy') + 'Detectar duplicados</button>' +
      '<button class="btn btn-outline btn-sm" type="button" data-xexport="prod">' + icon('file') + 'Exportar CSV</button>' +
      '<button class="btn btn-primary btn-sm" type="button" data-new-product>' + icon('plus') + 'Novo produto</button></div>' +
      bulkBar('prod', selP, L.length, [['publicar', 'Publicar', 'check'], ['rascunho', 'Rascunho', 'edit'], ['preco', 'Alterar preços', 'dollar'], ['editar', 'Editar em massa', 'layers'], ['google', 'Enviar ao Google', 'globe'], ['excluir', 'Excluir', 'trash']]) +
      '<div class="table-wrap"><table class="table x-table"><thead><tr><th class="chk">' + chk('data-xselpage="prod"', pageAll, 'Selecionar página') + '</th><th>Foto</th><th>SKU</th><th>Nome</th><th>Categoria</th><th>Marca</th><th>Fornecedor</th><th>Preço (R$)</th><th>Disponibilidade</th><th>Publicação</th><th>Fotografias</th><th>Google Merchant</th><th>Atualizado</th><th></th></tr></thead><tbody>' +
      (slice.length ? slice.map((r) => '<tr' + (selP.has(r.key) ? ' class="sel"' : '') + '><td class="chk">' + chk('data-xsel="prod" data-k="' + esc(r.key) + '"', selP.has(r.key), 'Selecionar ' + (r.sku || r.name)) + '</td>' +
        '<td>' + thumb(r) + '</td><td class="mono nowrap">' + (r.sku ? esc(r.sku) : pill('s-err', 'Sem SKU')) + (r.dupSku ? '<br><span class="tag tag-warn">SKU semelhante</span>' : '') + '</td>' +
        '<td class="x-name"><strong>' + esc(r.name) + '</strong>' + testTag(r) + (r.dupName ? ' <span class="tag tag-warn">Nome repetido</span>' : '') + (r.incomplete ? '<small class="x-issues">' + icon('alert') + esc(r.issues.join(' · ')) + '</small>' : '') + '</td>' +
        '<td>' + esc(r.catName) + '</td><td>' + (r.brand ? esc(r.brand) : '<span class="muted">—</span>') + '</td><td class="nowrap">' + (r.supplier ? esc(r.supplier) : '<span class="muted">—</span>') + '</td>' +
        '<td class="num nowrap">' + money(r.price) + '</td><td>' + dispPill(r) + '</td><td>' + pubPill(r) + '</td><td>' + photoPill(r) + '</td><td>' + merchPill(r) + '</td><td class="nowrap">' + dt(r.updatedAt) + '</td>' +
        '<td class="t-actions">' + (r.real ? '<a class="icon-btn" href="producto.html?id=' + r.id + '" target="_blank" rel="noopener" aria-label="Ver na loja">' + icon('eye') + '</a>' : '') +
        '<button class="icon-btn" type="button" data-xphotos="' + esc(r.key) + '" aria-label="Fotografias">' + icon('image') + '</button><button class="icon-btn" type="button" data-xedit="' + esc(r.key) + '" aria-label="Editar">' + icon('edit') + '</button><button class="icon-btn danger" type="button" data-xdel="' + esc(r.key) + '" aria-label="Excluir">' + icon('trash') + '</button></td></tr>').join('')
        : '<tr><td colspan="14">' + TD.emptyState('package', 'Nenhum produto encontrado', 'Ajuste a busca ou os filtros.') + '</td></tr>') +
      '</tbody></table></div>' + pager(L.length, pS, 'prod') + '</div>';
  }

  function recsOf(set) { return Array.from(set).map((k) => OPS.byKey(k)).filter(Boolean); }

  function bulk(action, scope) {
    const set = scope === 'price' ? selR : selP;
    const recs = recsOf(set);
    if (action === 'limpar') { set.clear(); api.refresh(); return; }
    if (!recs.length) return;
    if (action === 'publicar' || action === 'rascunho') {
      const to = action === 'publicar' ? 'publicado' : 'rascunho';
      const n = OPS.apply(recs.filter((r) => r.status !== to).map((r) => ({ rec: r, patch: { status: to } })), 'Edição em massa');
      toast(n + ' produto(s) ' + (to === 'publicado' ? 'publicados' : 'em rascunho'), { sub: recs.length - n ? (recs.length - n) + ' já estavam nesse estado.' : 'Registrado no histórico.' });
      api.refresh();
    } else if (action === 'preco') priceModal(recs);
    else if (action === 'editar') bulkEditModal(recs);
    else if (action === 'disp') availabilityModal(recs);
    else if (action === 'google') {
      const res = merchantSync((r) => set.has(r.key), 'Envio manual da seleção');
      if (!res.total) toast('Nenhum item publicado na seleção', { type: 'info', sub: 'Rascunhos não são enviados ao Google.' });
    } else if (action === 'excluir') {
      TD.confirm('Excluir ' + recs.length + ' produto(s)?', 'Os produtos de teste são removidos; os reais deixam de aparecer na loja deste navegador (use “Restaurar demo” para desfazer).', 'Excluir', () => {
        const imp = recs.filter((r) => !r.real).map((r) => r.key);
        if (imp.length) OPS.removeImported(imp);
        recs.filter((r) => r.real).forEach((r) => TD.deleteProduct(r.id));
        set.clear();
        toast(recs.length + ' produto(s) excluído(s)', { type: 'info' });
        api.refresh();
      }, true);
    }
  }

  function priceModal(recs) {
    const F = TD.ui.field;
    TD.modal({
      title: 'Alterar preços de ' + recs.length + ' produto(s)',
      body: note('No sistema final o Excel continua sendo a fonte dos preços calculados pelas macros; ajustes feitos aqui ficam registrados e podem ser sobrescritos pela próxima importação.') +
        '<form class="form-grid" id="xp-form" novalidate style="margin-top:14px">' +
        F({ id: 'xp-mode', label: 'Operação', size: 'half', type: 'select', options: '<option value="up">Aumentar %</option><option value="down">Reduzir %</option><option value="add">Somar valor (R$)</option><option value="set">Definir preço (R$)</option>' }) +
        F({ id: 'xp-val', label: 'Valor', size: 'half', type: 'number', value: 5, validate: 'required', err: 'Informe um valor.' }) +
        '<div class="field"><label class="check"><input type="checkbox" id="xp-90" checked>Arredondar para ,90</label></div></form>' +
        '<div class="x-preview" id="xp-prev"></div>',
      foot: '<button class="btn btn-outline btn-sm" data-close>Cancelar</button><button class="btn btn-primary btn-sm" data-ok>Aplicar</button>',
      onOpen: (el, close) => {
        const calc = (r) => {
          const mode = $('#xp-mode', el).value, v = parseFloat($('#xp-val', el).value) || 0, r90 = $('#xp-90', el).checked;
          if (mode !== 'set' && !r.price) return null;
          let p = mode === 'up' ? r.price * (1 + v / 100) : mode === 'down' ? r.price * (1 - v / 100) : mode === 'add' ? r.price + v : v;
          p = Math.max(0.01, r90 ? to90(p) : Math.round(p * 100) / 100);
          return p;
        };
        const paint = () => {
          const ok = recs.filter((r) => calc(r) != null);
          $('#xp-prev', el).innerHTML = '<strong>Prévia</strong> · ' + ok.length + ' alteração(ões)' + (recs.length - ok.length ? ', ' + (recs.length - ok.length) + ' sem preço ignorado(s)' : '') +
            ok.slice(0, 5).map((r) => '<div class="x-prev-row"><span class="mono">' + esc(r.sku || '—') + '</span><span class="grow">' + esc(r.name) + '</span><span>' + money(r.price) + ' → <strong>' + fmt(calc(r)) + '</strong></span></div>').join('') + (ok.length > 5 ? '<small class="muted">… e mais ' + (ok.length - 5) + '</small>' : '');
        };
        paint();
        el.addEventListener('input', paint);
        el.addEventListener('change', paint);
        $('[data-ok]', el).addEventListener('click', () => {
          if (!TD.ui.validate($('#xp-form', el))) return;
          const changes = recs.map((r) => ({ rec: r, patch: { price: calc(r) } })).filter((c) => c.patch.price != null && c.patch.price !== c.rec.price);
          const n = OPS.apply(changes, 'Edição em massa de preços');
          close();
          toast(n + ' preço(s) atualizado(s)', { sub: 'Itens enviados ao Google voltam para “pendente”.' });
          api.refresh();
        });
      }
    });
  }

  function bulkEditModal(recs) {
    const F = TD.ui.field;
    const keep = '<option value="">— manter —</option>';
    TD.modal({
      title: 'Editar ' + recs.length + ' produto(s) em massa',
      body: '<p class="muted" style="margin:0 0 14px">Campos em “manter” ou vazios não são alterados.</p><form class="form-grid" id="xb-form" novalidate>' +
        F({ id: 'xb-cat', label: 'Categoria', size: 'half', type: 'select', options: keep + TD.categories().map((c) => '<option value="' + c.slug + '">' + esc(c.name) + '</option>').join('') }) +
        F({ id: 'xb-brand', label: 'Marca', size: 'half', optional: true }) +
        F({ id: 'xb-sup', label: 'Fornecedor', size: 'half', type: 'select', options: keep + OPS.SUPPLIERS.map((s) => '<option>' + esc(s) + '</option>').join('') }) +
        F({ id: 'xb-disp', label: 'Disponibilidade', size: 'half', type: 'select', options: keep + '<option value="on">Disponível (estoque mínimo 10)</option><option value="off">Sem disponibilidade (estoque 0)</option>' }) +
        F({ id: 'xb-pub', label: 'Publicação', size: 'half', type: 'select', options: keep + '<option value="publicado">Publicar</option><option value="rascunho">Rascunho</option>' }) + '</form>',
      foot: '<button class="btn btn-outline btn-sm" data-close>Cancelar</button><button class="btn btn-primary btn-sm" data-ok>Aplicar a ' + recs.length + '</button>',
      onOpen: (el, close) => $('[data-ok]', el).addEventListener('click', () => {
        const cat = $('#xb-cat', el).value, brand = $('#xb-brand', el).value.trim(), sup = $('#xb-sup', el).value, disp = $('#xb-disp', el).value, pub = $('#xb-pub', el).value;
        const changes = recs.map((r) => {
          const p = {};
          if (cat && cat !== r.category) p.category = cat;
          if (brand && brand !== r.brand) p.brand = brand;
          if (sup && sup !== r.supplier) p.supplier = sup;
          if (disp === 'on' && r.stock < 10) p.stock = 10;
          if (disp === 'off' && r.stock !== 0) p.stock = 0;
          if (pub && pub !== r.status) p.status = pub;
          return Object.keys(p).length ? { rec: r, patch: p } : null;
        }).filter(Boolean);
        const n = OPS.apply(changes, 'Edição em massa');
        close();
        toast(n + ' produto(s) alterado(s)', { sub: recs.length - n ? (recs.length - n) + ' sem mudanças.' : '' });
        api.refresh();
      })
    });
  }

  function editModal(key) {
    const r = OPS.byKey(key);
    if (!r) return;
    const F = TD.ui.field;
    const brands = Array.from(new Set(OPS.list().map((x) => x.brand).filter(Boolean))).sort();
    TD.modal({
      title: 'Editar produto', wide: true,
      body: '<div class="x-edit-head">' + thumb(r) + '<div class="grow"><strong>' + esc(r.name) + '</strong>' + testTag(r) + '<div class="x-pills">' + pubPill(r) + dispPill(r) + photoPill(r) + merchPill(r) + '</div>' +
        (r.merchant.err ? '<small class="x-issues">' + icon('alert') + 'Google: ' + esc(r.merchant.err) + '</small>' : '') + (r.incomplete ? '<small class="x-issues">' + icon('alert') + esc(r.issues.join(' · ')) + '</small>' : '') + '</div></div>' +
        '<form class="form-grid" id="xe-form" novalidate>' +
        F({ id: 'xe-sku', label: 'SKU', size: 'third', value: r.sku, hint: 'Identifica a pasta de fotos no S3' }) +
        F({ id: 'xe-name', label: 'Nome', size: 'two-thirds', value: r.name, validate: 'required', err: 'Obrigatório.' }) +
        '<div class="field third"><label for="xe-brand">Marca</label><input id="xe-brand" list="xe-brands" value="' + esc(r.brand) + '"><datalist id="xe-brands">' + brands.map((b) => '<option value="' + esc(b) + '">').join('') + '</datalist></div>' +
        F({ id: 'xe-cat', label: 'Categoria', size: 'third', type: 'select', options: TD.categories().map((c) => '<option value="' + c.slug + '"' + (c.slug === r.category ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') }) +
        '<div class="field third"><label for="xe-sup">Fornecedor</label><input id="xe-sup" list="xe-sups" value="' + esc(r.supplier || '') + '"><datalist id="xe-sups">' + OPS.SUPPLIERS.map((s) => '<option value="' + esc(s) + '">').join('') + '</datalist></div>' +
        F({ id: 'xe-cost', label: 'Custo (R$)', size: 'third', type: 'number', value: r.cost == null ? '' : r.cost, optional: true }) +
        F({ id: 'xe-price', label: 'Preço de venda (R$)', size: 'third', type: 'number', value: r.price || '', hint: 'Vazio = sob consulta' }) +
        F({ id: 'xe-stock', label: 'Estoque', size: 'third', type: 'number', value: r.stock, validate: 'required', err: 'Informe o estoque.' }) +
        F({ id: 'xe-status', label: 'Publicação', size: 'half', type: 'select', options: '<option value="publicado"' + (r.status === 'publicado' ? ' selected' : '') + '>Publicado</option><option value="rascunho"' + (r.status === 'rascunho' ? ' selected' : '') + '>Rascunho</option>' }) +
        '<div class="field half"><label>URL do produto</label><div class="input x-ro">/produto/' + esc(r.slug) + '</div><span class="hint">Mantida ao mudar o nome (evita quebrar links e SEO).</span></div>' +
        '<div class="field"><label for="xe-meta">Metadescrição <span class="opt" id="xe-meta-n"></span></label><textarea id="xe-meta" rows="3">' + esc(r.metaDesc) + '</textarea><span class="hint"><button class="link-btn x-link" type="button" data-xe-auto>Gerar automaticamente</button></span></div>' +
        F({ id: 'xe-alt', label: 'Texto alternativo (ALT) da imagem', value: r.alt, optional: true }) + '</form>',
      foot: (r.real ? '<button class="btn btn-outline btn-sm" type="button" data-xe-store style="margin-right:auto">' + icon('store') + 'Ficha da loja (destaques e imagem)</button>' : '') +
        '<button class="btn btn-outline btn-sm" type="button" data-xe-photos>' + icon('image') + 'Fotografias</button><button class="btn btn-outline btn-sm" data-close>Cancelar</button><button class="btn btn-primary btn-sm" data-ok>Salvar</button>',
      onOpen: (el, close) => {
        const meta = $('#xe-meta', el);
        const count = () => { const n = meta.value.length; $('#xe-meta-n', el).textContent = '(' + n + '/160)'; $('#xe-meta-n', el).style.color = n > 160 ? 'var(--red-600)' : ''; };
        count();
        meta.addEventListener('input', count);
        $('[data-xe-auto]', el).addEventListener('click', () => { meta.value = OPS.autoMeta({ name: $('#xe-name', el).value, brand: $('#xe-brand', el).value }, OPS.catName($('#xe-cat', el).value)); count(); });
        const st = $('[data-xe-store]', el);
        if (st) st.addEventListener('click', () => { close(); api.productModal(r.id); });
        $('[data-xe-photos]', el).addEventListener('click', () => { close(); photoModal(r.key); });
        $('[data-ok]', el).addEventListener('click', () => {
          if (!TD.ui.validate($('#xe-form', el))) return;
          const sku = $('#xe-sku', el).value.trim().toUpperCase();
          if (!r.real && !sku) { toast('Produtos importados precisam de SKU', { type: 'error' }); return; }
          if (sku && !/^[A-Z0-9][A-Z0-9-]{2,31}$/.test(sku)) { toast('SKU inválido', { type: 'error', sub: 'Use letras, números e hífen (3 a 32 caracteres).' }); return; }
          if (sku && OPS.list().some((x) => x.key !== r.key && x.sku && x.sku.toUpperCase() === sku)) { toast('Já existe um produto com esse SKU', { type: 'error' }); return; }
          const num = (id) => { const v = $(id, el).value; return v === '' ? null : Math.max(0, parseFloat(v)); };
          const next = { sku, name: $('#xe-name', el).value.trim(), brand: $('#xe-brand', el).value.trim(), category: $('#xe-cat', el).value, supplier: $('#xe-sup', el).value.trim(), cost: num('#xe-cost'), price: num('#xe-price') || null, stock: Math.max(0, parseInt($('#xe-stock', el).value, 10) || 0), status: $('#xe-status', el).value, metaDesc: meta.value.trim(), alt: $('#xe-alt', el).value.trim() };
          const patch = {};
          Object.keys(next).forEach((k) => { if (next[k] !== r[k] && !(next[k] === '' && r[k] == null)) patch[k] = next[k]; });
          if (r.real && 'sku' in patch && !patch.sku) patch.sku = null;
          if (!Object.keys(patch).length) { close(); return; }
          OPS.patchOne(r, patch, 'Editor de produto');
          close();
          toast('Produto atualizado', { sub: next.name + (r.real ? ' · alterações refletidas na loja' : '') });
          api.refresh();
        });
      }
    });
  }

  function dupModal() {
    const L = OPS.list();
    const groups = (fn, test) => { const m = {}; L.filter(test).forEach((r) => { const k = fn(r); (m[k] = m[k] || []).push(r); }); return Object.values(m).filter((g) => g.length > 1); };
    const gSku = groups((r) => r.nsku, (r) => r.dupSku);
    const gName = groups((r) => r.nname, (r) => r.dupName);
    const gSlug = groups((r) => r.slug, (r) => r.dupSlug);
    const last = OPS.state().imports[0];
    const table = (gs, title, hint) => '<h4 class="x-h4">' + title + ' <span class="pill-n">' + gs.length + '</span></h4><p class="muted small">' + hint + '</p>' + (gs.length
      ? '<div class="table-wrap x-boxed"><table class="table"><thead><tr><th>Grupo</th><th>SKU</th><th>Nome</th><th>Origem</th><th>Preço</th><th></th></tr></thead><tbody>' +
        gs.slice(0, 20).map((g, gi) => g.map((r, i) => '<tr' + (i === 0 ? ' class="x-grp"' : '') + '><td>' + (i === 0 ? gi + 1 : '') + '</td><td class="mono">' + esc(r.sku || '—') + '</td><td>' + esc(r.name) + '</td><td>' + (r.real ? 'WooCommerce' : 'Importação') + '</td><td>' + money(r.price) + '</td><td class="t-actions"><button class="icon-btn" type="button" data-dup-edit="' + esc(r.key) + '" aria-label="Editar">' + icon('edit') + '</button></td></tr>').join('')).join('') + '</tbody></table></div>'
      : '<p class="x-ok">' + icon('check') + 'Nenhum caso encontrado.</p>');
    TD.modal({
      title: 'Detecção de duplicados', wide: true,
      body: (last ? note('Na última importação (' + esc(last.id) + ') <strong>' + last.dup + ' linha(s) com SKU repetido no arquivo</strong> foram ignoradas antes de gravar. <button class="link-btn x-link" type="button" data-dup-imp="' + esc(last.id) + '">Ver linhas</button>') : '') +
        table(gSku, 'SKUs semelhantes', 'Mesmo SKU ignorando hífens, espaços e maiúsculas (ex.: TDX-20050 × TDX20050).') +
        table(gName, 'Nomes repetidos', 'Produtos com o mesmo nome e SKUs diferentes: podem ser o mesmo item cadastrado duas vezes.') +
        table(gSlug, 'URLs duplicadas', 'Duas fichas com a mesma URL: só uma pode ser indexada.'),
      foot: '<button class="btn btn-outline btn-sm" data-close>Fechar</button><button class="btn btn-primary btn-sm" data-ok>Filtrar duplicados na tabela</button>',
      onOpen: (el, close) => {
        el.addEventListener('click', (e) => {
          const ed = e.target.closest('[data-dup-edit]');
          if (ed) { close(); editModal(ed.dataset.dupEdit); }
          const di = e.target.closest('[data-dup-imp]');
          if (di) { close(); importLogModal(di.dataset.dupImp); }
        });
        $('[data-ok]', el).addEventListener('click', () => { close(); Object.assign(pS, { q: '', cat: '', brand: '', status: 'duplicados', page: 1 }); nav('produtos'); });
      }
    });
  }

  function exportProducts(L, name) {
    const rows = [csvLine(['SKU', 'Nome', 'Categoria', 'Marca', 'Fornecedor', 'Custo', 'Preço', 'Moeda', 'Estoque', 'Publicação', 'Fotos', 'SZ', 'Google', 'Atualizado', 'Origem'])].concat(L.map((r) =>
      csvLine([r.sku, r.name, r.catName, r.brand, r.supplier, r.cost == null ? '' : String(r.cost).replace('.', ','), r.price ? String(r.price).replace('.', ',') : '', 'BRL', r.stock, r.status, r.photos.length, r.sz ? 'sim' : 'não', r.merchant.st, dt(r.updatedAt), r.real ? 'WooCommerce' : 'Teste'])));
    download(name, rows.join('\n'));
    toast('Arquivo gerado', { sub: name + ' · ' + nf(L.length) + ' linhas' });
  }

  /* =========================================================
     IMPORTAÇÕES E SINCRONIZAÇÃO
     ========================================================= */
  const imp = { stage: 'idle', source: '', file: '', analysis: null, filter: '', qty: 300, opts: { autoDraft: true, updatePrices: true }, prog: null, result: null };
  const ACT = { novo: ['s-ok', 'Novo'], atualizar: ['s-info', 'Atualizar'], duplicado: ['s-warn', 'Duplicado'], erro: ['s-err', 'Erro'] };
  const PHASES = ['Leitura e validação', 'Gravação no banco (upsert por SKU)', 'Índices, cache e fila do Google', 'Resumo'];

  function loadPreview(rows, source, file) {
    Object.assign(imp, { stage: 'preview', source, file, analysis: OPS.analyze(rows), filter: '', result: null, prog: null });
  }
  function viewImport(v) {
    const s = OPS.state();
    let html = note('<strong>No sistema final</strong>, as macros do Excel continuam calculando preços e disponibilidade e enviam as linhas para a API REST com um token próprio; o backend valida, faz upsert por SKU no PostgreSQL e processa em fila (Redis). <strong>Neste protótipo, a leitura do CSV é real; a recepção pela API e a gravação são simuladas no navegador.</strong> A compatibilidade com as macros atuais será validada antes da migração.') +
      '<div class="x-grid3">' +
      card(icon('file') + 'Arquivo Excel / CSV', '<label class="x-drop">' + icon('upload') + '<strong>Escolher arquivo CSV</strong><small>Separador ; ou , · colunas: ' + OPS.COLS.join(', ') + '</small><input type="file" accept=".csv,.txt,.xlsx,.xlsm,.xls" data-ximpfile class="sr-only"></label>' +
        '<button class="btn btn-sm btn-outline" type="button" data-ximptpl>' + icon('file') + 'Baixar planilha modelo (300 linhas)</button>') +
      card(icon('cloud') + 'API REST', '<div class="x-endpoint"><span class="method">POST</span><code>/api/v1/catalogo/importacoes</code></div><p class="muted small">Endpoint previsto para a macro do Excel enviar as linhas em JSON.</p><button class="btn btn-sm btn-outline" type="button" data-ximpapi>' + icon('play') + 'Simular recepção via API</button>', ' ' + SIM) +
      card(icon('zap') + 'Teste de volume', '<p class="muted small">Gera uma planilha de teste (com erros intencionais) e mostra a validação antes de gravar.</p><div class="x-row">' + sel('data-ximpqty', [[300, '300 linhas'], [1000, '1.000 linhas'], [3000, '3.000 linhas']], imp.qty, 'Quantidade de linhas') + '<button class="btn btn-sm btn-primary" type="button" data-ximpdemo>' + icon('play') + 'Gerar e validar</button></div>', ' ' + SIM) +
      '</div>' +
      '<div class="x-opts"><label class="check">' + chk('data-ximpopt="autoDraft"', imp.opts.autoDraft, 'Sem estoque vira rascunho') + 'Produtos sem estoque entram/passam a rascunho</label><label class="check">' + chk('data-ximpopt="updatePrices"', imp.opts.updatePrices, 'Atualizar preços') + 'Atualizar preços de SKUs existentes</label></div>';
    if (imp.stage === 'preview') html += previewPanel();
    if (imp.stage === 'running' || (imp.stage === 'done' && imp.prog)) html += progressPanel();
    if (imp.stage === 'done' && imp.result) html += resultPanel(imp.result);
    html += panel('Histórico de importações', s.imports.length
      ? '<div class="table-wrap"><table class="table"><thead><tr><th>ID</th><th>Data</th><th>Origem</th><th>Arquivo</th><th>Linhas</th><th>Criados</th><th>Atualizados</th><th>Sem mudança</th><th>Duplicados</th><th>Erros</th><th>Duração</th><th></th></tr></thead><tbody>' +
        s.imports.map((i) => '<tr><td class="mono">' + esc(i.id) + '</td><td class="nowrap">' + dt(i.at) + '</td><td class="nowrap">' + srcLabel(i.source) + '</td><td>' + esc(i.file) + '</td><td>' + nf(i.total) + '</td><td>' + nf(i.created) + '</td><td>' + nf(i.updated) + '</td><td>' + nf(i.unchanged) + '</td><td>' + nf(i.dup) + '</td><td>' + (i.errors ? pill('s-err', nf(i.errors)) : '0') + '</td><td>' + (i.ms / 1000).toFixed(1).replace('.', ',') + ' s</td>' +
          '<td class="t-actions"><button class="btn btn-sm btn-outline" type="button" data-ximplog="' + esc(i.id) + '">Detalhe</button></td></tr>').join('') + '</tbody></table></div>'
      : '<div class="panel-body">' + TD.emptyState('clock', 'Sem importações', 'O histórico mostra cada importação com o detalhe dos erros.') + '</div>');
    v.innerHTML = html;
  }
  function previewPanel() {
    const A = imp.analysis;
    const c = { novo: 0, atualizar: 0, duplicado: 0, erro: 0, aviso: 0 };
    A.forEach((a) => { c[a.action]++; if (a.warns.length) c.aviso++; });
    const F = imp.filter === 'aviso' ? A.filter((a) => a.warns.length) : imp.filter ? A.filter((a) => a.action === imp.filter) : A;
    const valid = c.novo + c.atualizar;
    const chips = [['', 'Todas', A.length], ['novo', 'Novos', c.novo], ['atualizar', 'Existentes (atualizar)', c.atualizar], ['duplicado', 'Duplicados', c.duplicado], ['erro', 'Erros', c.erro], ['aviso', 'Avisos', c.aviso]];
    return '<div class="panel x-mb" id="x-preview"><div class="panel-head"><h3>Vista prévia · ' + esc(imp.file) + ' ' + (imp.source !== 'csv' ? SIM : '') + '</h3><div class="x-row"><button class="btn btn-outline btn-sm" type="button" data-ximpcancel>Cancelar</button><button class="btn btn-primary btn-sm" type="button" data-ximprun' + (valid ? '' : ' disabled') + '>' + icon('upload') + 'Importar ' + nf(valid) + ' linha(s) válida(s)</button></div></div>' +
      '<div class="a-toolbar">' + chips.map((x) => '<button class="chip' + (imp.filter === x[0] ? ' active' : '') + '" type="button" data-ximpf="' + x[0] + '">' + x[1] + ' <small>' + nf(x[2]) + '</small></button>').join('') + '</div>' +
      '<div class="table-wrap x-scroll"><table class="table"><thead><tr><th>Linha</th><th>SKU</th><th>Nome</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Resultado</th><th>Validação</th></tr></thead><tbody>' +
      F.slice(0, 150).map((a) => '<tr><td>' + a.line + '</td><td class="mono nowrap">' + (esc(a.row.sku) || '<span class="muted">(vazio)</span>') + '</td><td>' + esc(a.row.nome || (a.existing ? a.existing.name : '')) + '</td><td>' + esc(a.row.categoria || '') + '</td><td class="nowrap">' + esc(a.row.preco === '' ? '(vazio)' : String(a.row.preco).replace('.', ',')) + '</td><td>' + esc(a.row.estoque) + '</td>' +
        '<td>' + pill(ACT[a.action][0], ACT[a.action][1]) + '</td><td class="x-msgs">' + a.errs.map((e) => '<span class="e">' + esc(e) + '</span>').join('') + a.warns.map((w) => '<span class="w">' + esc(w) + '</span>').join('') + (a.action === 'atualizar' ? '<span class="i">' + (a.existing.real ? 'Produto real: muda também na loja' : 'Produto de teste existente') + '</span>' : '') + '</td></tr>').join('') +
      '</tbody></table></div><div class="pager"><span>' + (F.length > 150 ? 'Mostrando 150 de ' + nf(F.length) + ' linhas deste filtro' : nf(F.length) + ' linha(s)') + '</span><span>Linhas com erro ou duplicadas não são gravadas.</span></div></div>';
  }
  function progressPanel() {
    const p = imp.prog;
    const pct = p.total ? Math.round((p.done / p.total) * 100) : 100;
    return '<div class="panel x-mb"><div class="panel-head"><h3>Processamento ' + SIM + '</h3><span class="muted small" id="x-prog-txt">' + nf(p.done) + ' de ' + nf(p.total) + ' linhas</span></div><div class="panel-body">' +
      '<ol class="x-steps" id="x-prog-steps">' + PHASES.map((ph, i) => '<li class="' + (i < p.phase ? 'done' : i === p.phase ? 'now' : '') + '">' + esc(ph) + '</li>').join('') + '</ol>' +
      '<div class="x-progress"><span id="x-prog-bar" style="width:' + pct + '%"></span></div>' +
      '<div class="x-prog-c" id="x-prog-c">' + progCounts() + '</div></div></div>';
  }
  const progCounts = () => { const c = imp.prog.ctx; return '<span><b>' + nf(c.created) + '</b> criados</span><span><b>' + nf(c.updated) + '</b> atualizados</span><span><b>' + nf(c.unchanged) + '</b> sem mudança</span>'; };
  function paintProgress() {
    const bar = $('#x-prog-bar');
    if (!bar) return;
    const p = imp.prog;
    bar.style.width = (p.total ? Math.round((p.done / p.total) * 100) : 100) + '%';
    $('#x-prog-txt').textContent = nf(p.done) + ' de ' + nf(p.total) + ' linhas';
    $('#x-prog-c').innerHTML = progCounts();
    $$('#x-prog-steps li').forEach((li, i) => { li.className = i < p.phase ? 'done' : i === p.phase ? 'now' : ''; });
  }
  function runImport() {
    if (imp.stage !== 'preview') return;
    const valid = imp.analysis.filter((a) => a.action === 'novo' || a.action === 'atualizar');
    const ctx = OPS.importBegin({ source: imp.source, file: imp.file, analysis: imp.analysis, opts: Object.assign({}, imp.opts) });
    imp.stage = 'running';
    imp.prog = { done: 0, total: valid.length, phase: 1, ctx };
    if (api.current() === 'importacoes') api.refresh();
    const CH = Math.max(5, Math.ceil(valid.length / 50));
    let i = 0;
    const tick = () => {
      const part = valid.slice(i, i + CH);
      if (part.length) OPS.importChunk(part, ctx);
      i += part.length;
      imp.prog.done = i;
      paintProgress();
      if (i < valid.length) { setTimeout(tick, 35); return; }
      imp.prog.phase = 2;
      paintProgress();
      setTimeout(() => {
        imp.result = OPS.importEnd(ctx);
        imp.prog.phase = 4;
        imp.stage = 'done';
        toast('Importação ' + imp.result.id + ' concluída', { sub: imp.result.created + ' criados · ' + imp.result.updated + ' atualizados · ' + (imp.result.errors + imp.result.dup) + ' com problema' });
        if (['importacoes', 'dashboard', 'produtos'].indexOf(api.current()) > -1) api.refresh();
      }, 500);
    };
    setTimeout(tick, 250);
  }
  function resultPanel(r) {
    return '<div class="panel x-mb"><div class="panel-head"><h3>Resumo da importação ' + esc(r.id) + '</h3><div class="x-row"><button class="btn btn-outline btn-sm" type="button" data-ximplog="' + esc(r.id) + '">' + icon('alert') + 'Ver erros e avisos</button><button class="btn btn-outline btn-sm" type="button" data-xgo-imported>' + icon('package') + 'Ver produtos atualizados</button><button class="btn btn-primary btn-sm" type="button" data-ximpcancel>Nova importação</button></div></div>' +
      '<div class="x-sum">' + [['Linhas lidas', r.total], ['Criados', r.created], ['Atualizados', r.updated], ['Sem mudança', r.unchanged], ['Duplicados ignorados', r.dup], ['Erros', r.errors], ['Avisos', r.warns]].map((x) => '<div><b>' + nf(x[1]) + '</b><span>' + x[0] + '</span></div>').join('') + '<div><b>' + (r.ms / 1000).toFixed(1).replace('.', ',') + ' s</b><span>Duração no navegador</span></div></div></div>';
  }
  function importLogModal(id) {
    const r = OPS.state().imports.find((x) => x.id === id);
    if (!r) return;
    const kinds = { erro: ['s-err', 'Erro'], duplicado: ['s-warn', 'Duplicado'], aviso: ['s-info', 'Aviso'] };
    TD.modal({
      title: 'Importação ' + r.id + ' · detalhe', wide: true,
      body: '<p class="muted" style="margin:0 0 12px">' + dt(r.at) + ' · ' + srcLabel(r.source) + ' · ' + esc(r.file) + ' · ' + nf(r.total) + ' linhas: ' + nf(r.created) + ' criadas, ' + nf(r.updated) + ' atualizadas, ' + nf(r.dup) + ' duplicadas, ' + nf(r.errors) + ' com erro.</p>' +
        (r.rows.length ? '<div class="table-wrap x-boxed x-scroll"><table class="table"><thead><tr><th>Linha</th><th>SKU</th><th>Tipo</th><th>Mensagem</th></tr></thead><tbody>' + r.rows.map((e) => '<tr><td>' + e.line + '</td><td class="mono">' + (esc(e.sku) || '—') + '</td><td>' + pill(kinds[e.kind][0], kinds[e.kind][1]) + '</td><td>' + esc(e.msg) + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="x-ok">' + icon('check') + 'Sem erros nem avisos.</p>'),
      foot: '<button class="btn btn-outline btn-sm" type="button" data-csv>' + icon('file') + 'Exportar CSV</button><button class="btn btn-primary btn-sm" data-close>Fechar</button>',
      onOpen: (el) => $('[data-csv]', el).addEventListener('click', () => { download('erros-' + r.id + '.csv', [csvLine(['Linha', 'SKU', 'Tipo', 'Mensagem'])].concat(r.rows.map((e) => csvLine([e.line, e.sku, e.kind, e.msg]))).join('\n')); toast('Arquivo gerado', { sub: 'erros-' + r.id + '.csv' }); })
    });
  }
  function apiModal() {
    const rows = OPS.demoRows(300);
    const body = JSON.stringify({ origem: 'macro-excel', planilha: 'precos-disponibilidade.xlsm', linhas: rows.slice(0, 2) }, null, 2).replace(/\n {4}\}\n {2}\]/, '\n    },\n    … mais 298 linhas\n  ]');
    TD.modal({
      title: 'Recepção via API REST ' , wide: true,
      body: note('<strong>Simulação:</strong> nenhuma requisição de rede é feita. Abaixo, o formato previsto da chamada que a macro do Excel fará ao backend NestJS.', 'warn') +
        '<pre class="x-code">POST /api/v1/catalogo/importacoes HTTP/1.1\nHost: api.&lt;dominio-da-loja&gt;\nAuthorization: Bearer &lt;token da integração Excel&gt;\nContent-Type: application/json\nIdempotency-Key: 7f3c…\n\n' + esc(body) + '</pre><div id="xa-resp"></div>',
      foot: '<button class="btn btn-outline btn-sm" data-close>Cancelar</button><button class="btn btn-primary btn-sm" data-ok>' + icon('play') + 'Enviar (simulado)</button>',
      onOpen: (el, close) => $('[data-ok]', el).addEventListener('click', (e) => {
        e.target.closest('button').disabled = true;
        $('#xa-resp', el).innerHTML = '<pre class="x-code ok">HTTP/1.1 202 Accepted\n{ "importacao": "na fila", "linhas": 300, "status": "validando" }</pre>';
        setTimeout(() => { close(); loadPreview(rows, 'api', 'POST /api/v1/catalogo/importacoes'); nav('importacoes'); }, 900);
      })
    });
  }
  function readCSVFile(f) {
    if (/\.(xlsx|xlsm|xls)$/i.test(f.name)) { toast('Arquivo Excel nativo', { type: 'info', sub: 'No protótipo, salve a planilha como CSV (separado por ;). No sistema final o backend lê .xlsx/.xlsm.', timeout: 6500 }); return; }
    if (f.size > 8e6) { toast('Arquivo grande demais para o protótipo', { type: 'error', sub: 'Limite de 8 MB no navegador.' }); return; }
    const go = (enc) => {
      const rd = new FileReader();
      rd.onload = () => {
        if (enc === 'utf-8' && rd.result.indexOf('�') > -1) { go('windows-1252'); return; }
        const res = OPS.parseCSV(rd.result);
        if (res.error) { toast('Não foi possível ler o arquivo', { type: 'error', sub: res.error, timeout: 6000 }); return; }
        loadPreview(res.rows, 'csv', f.name);
        api.refresh();
        setTimeout(() => { const p = $('#x-preview'); if (p) p.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
      };
      rd.readAsText(f, enc);
    };
    go('utf-8');
  }

  /* =========================================================
     FOTOGRAFIAS (Amazon S3 + CloudFront — simulado)
     ========================================================= */
  const fS = { q: '', f: '', page: 1, per: 25 };
  const F_FILTER = [['', 'Todos'], ['semsz', 'Sem SZ.webp'], ['semfotos', 'Sem fotografias'], ['semsku', 'Sem SKU'], ['versao', 'Com versão substituída'], ['ok', 'Completos']];
  function viewPhotos(v) {
    const st = OPS.stats();
    let L = searchFilter(OPS.list(), fS.q);
    const ff = { semsz: (r) => r.photoState === 'sem_sz', semfotos: (r) => r.photoState === 'sem_fotos', semsku: (r) => !r.sku, versao: (r) => (r.sz && r.sz.v > 1) || r.photos.some((p) => p.v > 1), ok: (r) => r.photoState === 'ok' }[fS.f];
    if (ff) L = L.filter(ff);
    L = L.slice().sort((a, b) => a.sku.localeCompare(b.sku));
    const slice = paginate(L, fS);
    v.innerHTML = '<div class="kpis">' +
      kpi('Com fotografias', nf(st.total - st.noPhotos), 'S1 como imagem principal', 'image') +
      kpi('Sem fotografias', nf(st.noPhotos), 'Nenhum arquivo na pasta do SKU', 'alert', st.noPhotos > 0) +
      kpi('Sem SZ.webp', nf(st.noSZ), 'Pendentes de foto para o Google', 'globe', st.noSZ > 0) +
      kpi('Sem SKU', nf(st.noSku), 'Não é possível mapear a pasta', 'alert', st.noSku > 0) + '</div>' +
      '<div class="a-grid">' + panel('Produtos e pastas no bucket', '<div class="a-toolbar"><input type="search" placeholder="Buscar SKU ou nome" value="' + esc(fS.q) + '" data-xq="photo" aria-label="Buscar SKU ou nome">' + sel('data-xf="photo.f"', F_FILTER, fS.f, 'Filtro') + '<span class="grow"></span><button class="btn btn-primary btn-sm" type="button" data-xassoc>' + icon('link') + 'Associar fotografias</button></div>' +
        '<div class="table-wrap"><table class="table"><thead><tr><th>Produto</th><th>Arquivos em productos/SKU/</th><th>Estado</th><th>Versão</th><th></th></tr></thead><tbody>' +
        (slice.length ? slice.map((r) => '<tr><td><div class="t-prod">' + thumb(r) + '<div><strong>' + esc(r.name) + '</strong><small class="mono">' + (r.sku ? 'productos/' + esc(r.sku) + '/' : 'sem SKU') + '</small></div></div></td>' +
          '<td><div class="x-strip">' + r.photos.slice(0, 4).map((p, i) => '<span class="x-mini' + (i === 0 ? ' main' : '') + '" title="' + p.n + '.webp v' + p.v + '"><img src="' + esc(OPS.photoSrc(r, p)) + '" alt="" loading="lazy"><b>' + p.n + '</b></span>').join('') + (r.photos.length > 4 ? '<span class="x-more">+' + (r.photos.length - 4) + '</span>' : '') +
          (r.sz ? '<span class="x-mini sz" title="SZ.webp v' + r.sz.v + '"><img src="' + esc(OPS.szSrc(r)) + '" alt="" loading="lazy"><b>SZ</b></span>' : r.photos.length ? '<span class="x-mini missing" title="SZ.webp ausente"><b>SZ</b></span>' : '') + '</div></td>' +
          '<td>' + photoPill(r) + '</td><td>v' + Math.max(r.sz ? r.sz.v : 0, ...r.photos.map((p) => p.v), 1) + '</td><td class="t-actions"><button class="btn btn-sm btn-outline" type="button" data-xphotos="' + esc(r.key) + '">Gerenciar</button></td></tr>').join('')
          : '<tr><td colspan="5">' + TD.emptyState('image', 'Nada neste filtro', 'Ajuste a busca ou o filtro.') + '</td></tr>') +
        '</tbody></table></div>' + pager(L.length, fS, 'photo')) +
      panel('Regras de nomenclatura', '<div class="panel-body x-rules">' +
        '<div><code>S1.webp</code><span>Imagem principal comercial (padrão).</span></div>' +
        '<div><code>S2.webp, S3.webp…</code><span>Galeria, na ordem do número.</span></div>' +
        '<div><code>SZ.webp</code><span>Imagem principal enviada ao Google Merchant Center.</span></div>' +
        '<div><code>sem SZ.webp</code><span>Produto pendente de fotografia para o Google.</span></div>' +
        '<div><code>?v=N</code><span>Ao substituir um arquivo é gerada uma nova URL versionada, sem esperar o cache do CDN expirar.</span></div>' +
        '<pre class="x-code">productos/\n  TD0669/\n    S1.webp\n    S2.webp\n    S3.webp\n    SZ.webp</pre>' +
        '<p class="muted small" style="margin:0">No sistema real: upload pelo painel com <strong>URL pré-assinada</strong> (PUT direto ao S3, validade curta), bucket privado acessível só pelo CloudFront, credenciais AWS apenas no backend. Aqui tudo é simulado e nenhum arquivo sai do navegador.</p></div>') + '</div>';
  }

  function photoModal(key) {
    const r0 = OPS.byKey(key);
    if (!r0) return;
    TD.modal({
      title: 'Fotografias · ' + (r0.sku || 'sem SKU'), wide: true,
      body: photoBody(r0),
      foot: '<button class="btn btn-primary btn-sm" data-close>Concluir</button>',
      onOpen: (el) => {
        const repaint = () => { const r = OPS.byKey(key); if (r) $('.modal-body', el).innerHTML = photoBody(r); api.refresh(); };
        const afterUpload = () => { repaint(); setTimeout(() => { OPS.finishPhotoSync(key); if (document.body.contains(el)) repaint(); else api.refresh(); }, 1300); };
        el.addEventListener('click', (e) => {
          const r = OPS.byKey(key);
          const mv = e.target.closest('[data-pm-move]');
          if (mv) { const [i, d] = mv.dataset.pmMove.split(',').map(Number); OPS.movePhoto(r, i, i + d); repaint(); toast('Galeria reordenada', { sub: 'Arquivos renomeados por posição; nova versão gerada.' }); return; }
          const mn = e.target.closest('[data-pm-main]');
          if (mn) { const i = +mn.dataset.pmMain; OPS.movePhoto(r, i, 0); repaint(); toast('Nova imagem principal (S1.webp)', { sub: 'A antiga S1 passou para a galeria.' }); return; }
          const sm = e.target.closest('[data-pm-sim]');
          if (sm) { OPS.replacePhoto(r, sm.dataset.pmSim, null); afterUpload(); toast(sm.dataset.pmSim + '.webp substituída (simulado)', { sub: 'Nova URL versionada gerada.' }); return; }
          if (e.target.closest('[data-pm-assoc]')) { OPS.associatePhotos(); repaint(); }
        });
        el.addEventListener('change', (e) => {
          const inp = e.target.closest('[data-pm-file]');
          if (!inp || !inp.files[0]) return;
          readImage(inp.files[0], (data) => {
            OPS.replacePhoto(OPS.byKey(key), inp.dataset.pmFile, data);
            afterUpload();
            toast(inp.dataset.pmFile + '.webp substituída', { sub: 'Imagem reduzida e guardada só neste navegador (simulação do upload ao S3).' });
          });
        });
      }
    });
  }
  function photoBody(r) {
    if (!r.sku) return note('Este produto não tem SKU. As fotografias ficam em <code>productos/&lt;SKU&gt;/</code>; defina o SKU no editor para mapear a pasta.', 'warn') + '<div class="x-ph-grid">' + r.photos.map((p) => '<div class="x-ph"><div class="x-ph-img"><img src="' + esc(OPS.photoSrc(r, p)) + '" alt=""></div><div class="x-ph-meta"><strong>' + p.n + ' (WooCommerce)</strong></div></div>').join('') + '</div>';
    const sync = r.photoSync === 'pendente' ? pill('s-info', 'Enviando ao S3… ' + 'simulado') : pill('s-ok', 'Sincronizado');
    const url = (n, v) => '<code class="x-url" title="URL pública via CloudFront (domínio ilustrativo)">' + esc(OPS.cdnUrl(r.sku, n, v)) + '</code>';
    const fileBtn = (n, label) => '<label class="btn btn-sm btn-outline x-file">' + icon('upload') + label + '<input type="file" accept="image/*" data-pm-file="' + n + '" class="sr-only"></label>';
    const cards = r.photos.map((p, i) => '<div class="x-ph' + (i === 0 ? ' main' : '') + '"><div class="x-ph-img"><img src="' + esc(OPS.photoSrc(r, p)) + '" alt="' + esc(r.alt) + '"></div>' +
      '<div class="x-ph-meta"><strong>' + p.n + '.webp</strong>' + (i === 0 ? '<span class="tag tag-info">Principal</span>' : '<span class="tag tag-off">Galeria ' + i + '</span>') + '<small>Versão ' + p.v + '</small>' + url(p.n, p.v) + '</div>' +
      '<div class="x-ph-act"><button class="icon-btn" type="button" data-pm-move="' + i + ',-1"' + (i === 0 ? ' disabled' : '') + ' aria-label="Mover para a esquerda">' + icon('left') + '</button><button class="icon-btn" type="button" data-pm-move="' + i + ',1"' + (i === r.photos.length - 1 ? ' disabled' : '') + ' aria-label="Mover para a direita">' + icon('right') + '</button>' +
      (i ? '<button class="btn btn-sm btn-outline" type="button" data-pm-main="' + i + '">Principal</button>' : '') + fileBtn(p.n, 'Substituir') + '<button class="btn btn-sm btn-outline" type="button" data-pm-sim="' + p.n + '" title="Simula a substituição sem escolher arquivo">Simular</button></div></div>').join('');
    const sz = r.sz
      ? '<div class="x-ph sz"><div class="x-ph-img"><img src="' + esc(OPS.szSrc(r)) + '" alt=""></div><div class="x-ph-meta"><strong>SZ.webp</strong><span class="tag tag-dark">Google</span><small>Versão ' + r.sz.v + '</small>' + url('SZ', r.sz.v) + '</div><div class="x-ph-act">' + fileBtn('SZ', 'Substituir SZ') + '<button class="btn btn-sm btn-outline" type="button" data-pm-sim="SZ">Simular</button></div></div>'
      : '<div class="x-ph sz missing"><div class="x-ph-img"><span>SZ.webp ausente</span></div><div class="x-ph-meta"><strong>SZ.webp</strong><span class="tag tag-warn">Pendente para o Google</span><small>Sem esta imagem o item não é enviado ao Merchant Center.</small></div><div class="x-ph-act">' + fileBtn('SZ', 'Enviar SZ') + '<button class="btn btn-sm btn-outline" type="button" data-pm-sim="SZ">Simular envio</button></div></div>';
    return '<div class="x-ph-head"><div><small class="muted">Pasta no bucket (nome ilustrativo)</small><code>s3://bucket-catalogo/productos/' + esc(r.sku) + '/</code></div>' + sync + '</div>' +
      (r.photos.length ? '' : note('Nenhum arquivo vinculado. ' + (r.real ? '' : '<button class="link-btn x-link" type="button" data-pm-assoc>Associar fotografias dos produtos importados</button> ou envie uma imagem abaixo.'), 'warn')) +
      '<div class="x-ph-grid">' + cards + (r.photos.length ? '' : '<div class="x-ph missing"><div class="x-ph-img"><span>S1.webp ausente</span></div><div class="x-ph-act">' + fileBtn('S1', 'Enviar S1') + '<button class="btn btn-sm btn-outline" type="button" data-pm-sim="S1">Simular envio</button></div></div>') + sz + '</div>' +
      '<p class="muted small" style="margin:14px 0 0">' + icon('info') + ' Substituições geram nova versão (<code>?v=N</code>) e devolvem o item ao estado “pendente” no Google. No sistema real o upload usa URL pré-assinada; aqui a imagem é reduzida e guardada apenas neste navegador.</p>';
  }
  function readImage(file, cb) {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 320 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * k));
        c.height = Math.max(1, Math.round(img.height * k));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        let d = c.toDataURL('image/webp', 0.8);
        if (d.indexOf('image/webp') === -1) d = c.toDataURL('image/jpeg', 0.8);
        cb(d);
      };
      img.onerror = () => toast('Imagem inválida', { type: 'error' });
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  }

  /* =========================================================
     PREÇOS E ESTOQUE
     ========================================================= */
  const rS = { q: '', sup: '', disp: '', page: 1, per: 25, log: '' };
  const selR = new Set();
  function filterPrices() {
    let L = searchFilter(OPS.list(), rS.q);
    if (rS.sup) L = L.filter((r) => r.supplier === rS.sup);
    if (rS.disp === 'on') L = L.filter((r) => r.available);
    if (rS.disp === 'off') L = L.filter((r) => !r.available);
    if (rS.disp === 'nocost') L = L.filter((r) => r.cost == null);
    return L.slice().sort(SORT_FN.upd);
  }
  function viewPrices(v) {
    const all = OPS.list();
    const L = filterPrices();
    const slice = paginate(L, rS);
    pruneSel(selR);
    const s = OPS.state();
    const withM = all.filter((r) => r.cost && r.price);
    const avgM = withM.length ? withM.reduce((a, r) => a + (r.price - r.cost) / r.price, 0) / withM.length : 0;
    const day = Date.now() - 86400000;
    const pageAll = slice.length > 0 && slice.every((r) => selR.has(r.key));
    const logs = s.log.filter((l) => !rS.log || l.t === rS.log).slice(0, 30);
    const T = { preco: 'Preço', status: 'Publicação', disp: 'Disponibilidade' };
    const val = (l, x) => (l.t === 'preco' ? money(x) : esc(x));
    v.innerHTML = note('O <strong>Excel continua sendo a fonte operativa</strong> de preços e disponibilidade calculados pelas macros: as importações atualizam esta tabela. Edições manuais ficam registradas e a próxima importação pode sobrescrevê-las. Custos e fornecedores dos produtos reais são <strong>demonstrativos</strong>.') +
      '<div class="kpis">' + kpi('Margem média', (avgM * 100).toFixed(1).replace('.', ',') + '%', 'Sobre ' + nf(withM.length) + ' produtos com custo', 'percent') +
      kpi('Sem custo informado', nf(all.filter((r) => r.cost == null).length), 'Margem não calculável', 'alert', true) +
      kpi('Sem disponibilidade', nf(all.filter((r) => !r.available).length), nf(all.filter((r) => !r.available && r.status === 'publicado').length) + ' ainda publicados', 'package', true) +
      kpi('Alterações · 24 h', nf(s.log.filter((l) => new Date(l.at) >= day).length), 'Preço, disponibilidade e publicação', 'refresh') + '</div>' +
      '<div class="panel x-mb"><div class="a-toolbar"><input type="search" placeholder="Buscar SKU ou produto" value="' + esc(rS.q) + '" data-xq="price" aria-label="Buscar SKU ou produto">' +
      sel('data-xf="price.sup"', [['', 'Todos os fornecedores']].concat(OPS.SUPPLIERS.map((x) => [x, x])), rS.sup, 'Fornecedor') +
      sel('data-xf="price.disp"', [['', 'Toda disponibilidade'], ['on', 'Disponíveis'], ['off', 'Sem disponibilidade'], ['nocost', 'Sem custo']], rS.disp, 'Disponibilidade') +
      '<span class="grow"></span><button class="btn btn-outline btn-sm" type="button" data-xrule="draft">' + icon('edit') + 'Sem disponibilidade → rascunho</button><button class="btn btn-outline btn-sm" type="button" data-xrule="publish">' + icon('check') + 'Publicar disponíveis</button></div>' +
      bulkBar('price', selR, L.length, [['preco', 'Atualizar preços', 'dollar'], ['disp', 'Atualizar disponibilidade', 'package'], ['publicar', 'Publicar', 'check'], ['rascunho', 'Rascunho', 'edit']]) +
      '<div class="table-wrap"><table class="table x-table"><thead><tr><th class="chk">' + chk('data-xselpage="price"', pageAll, 'Selecionar página') + '</th><th>SKU</th><th>Produto</th><th>Fornecedor</th><th>Custo</th><th>Venda</th><th>Margem</th><th>Moeda</th><th>Disponibilidade</th><th>Publicação</th><th>Última sincronização</th></tr></thead><tbody>' +
      (slice.length ? slice.map((r) => { const m = r.cost && r.price ? (r.price - r.cost) / r.price : null; return '<tr' + (selR.has(r.key) ? ' class="sel"' : '') + '><td class="chk">' + chk('data-xsel="price" data-k="' + esc(r.key) + '"', selR.has(r.key), 'Selecionar ' + (r.sku || r.name)) + '</td><td class="mono nowrap">' + (esc(r.sku) || '—') + '</td><td class="x-name"><strong>' + esc(r.name) + '</strong>' + testTag(r) + '</td><td class="nowrap">' + esc(r.supplier || '—') + '</td>' +
        '<td class="num nowrap">' + (r.cost != null ? fmt(r.cost) : '<span class="muted">—</span>') + '</td><td class="num nowrap"><strong>' + money(r.price) + '</strong></td><td class="num">' + (m == null ? '—' : '<span class="' + (m < 0.2 ? 'down' : 'up') + '">' + (m * 100).toFixed(1).replace('.', ',') + '%</span>') + '</td><td>BRL</td><td>' + dispPill(r) + '</td><td>' + pubPill(r) + '</td><td class="nowrap">' + (r.syncAt ? dt(r.syncAt) : '<span class="muted">Nunca (dado do WooCommerce)</span>') + '</td></tr>'; }).join('')
        : '<tr><td colspan="11">' + TD.emptyState('package', 'Nada neste filtro', 'Ajuste a busca ou os filtros.') + '</td></tr>') +
      '</tbody></table></div>' + pager(L.length, rS, 'price') + '</div>' +
      '<div class="a-grid">' + panel('Registro de alterações', '<div class="a-toolbar">' + [['', 'Todas'], ['preco', 'Preço'], ['disp', 'Disponibilidade'], ['status', 'Publicação']].map((x) => '<button class="chip' + (rS.log === x[0] ? ' active' : '') + '" type="button" data-xlogf="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
        (logs.length ? '<div class="table-wrap x-scroll"><table class="table"><thead><tr><th>Quando</th><th>Produto</th><th>Campo</th><th>De → para</th><th>Origem</th></tr></thead><tbody>' + logs.map((l) => '<tr><td class="nowrap">' + dt(l.at) + '</td><td><span class="mono">' + esc(l.sku || '—') + '</span><br><small class="muted">' + esc(l.name) + '</small></td><td>' + T[l.t] + '</td><td class="nowrap">' + val(l, l.from) + ' → <strong>' + val(l, l.to) + '</strong> ' + (l.t === 'preco' ? delta(l.from, l.to) : '') + '</td><td><small>' + esc(l.origin || '') + '</small></td></tr>').join('') + '</tbody></table></div>'
          : '<div class="panel-body">' + TD.emptyState('clock', 'Sem alterações registradas', 'Importe a planilha ou edite preços em massa.') + '</div>')) +
      panel('Erros de importação', errList(s.errors.filter((e) => e.area === 'Importação'), 8), '<button class="link-more" type="button" data-xerrors="Importação">Ver todos</button>') + '</div>';
  }
  const errList = (E, n) => (E.length ? E.slice(0, n).map((e) => '<div class="list-row x-err-row">' + icon('alert') + '<div class="grow"><strong class="mono">' + esc(e.sku || '—') + '</strong><small>' + esc(e.msg) + '</small></div><small class="muted nowrap">' + dt(e.at) + '</small></div>').join('') : '<div class="panel-body">' + TD.emptyState('check', 'Sem erros', 'Nada a revisar por aqui.') + '</div>');
  function availabilityModal(recs) {
    const F = TD.ui.field;
    TD.modal({
      title: 'Atualizar disponibilidade de ' + recs.length + ' produto(s)',
      body: '<form class="form-grid" id="xd-form" novalidate>' + F({ id: 'xd-mode', label: 'Nova situação', type: 'select', options: '<option value="on">Disponível</option><option value="off">Sem disponibilidade (estoque 0)</option>' }) +
        F({ id: 'xd-qty', label: 'Estoque informado', type: 'number', value: 10, hint: 'Usado para “disponível”.' }) +
        '<div class="field"><label class="check"><input type="checkbox" id="xd-draft" checked>Aplicar a regra: sem disponibilidade → rascunho</label></div></form>',
      foot: '<button class="btn btn-outline btn-sm" data-close>Cancelar</button><button class="btn btn-primary btn-sm" data-ok>Aplicar</button>',
      onOpen: (el, close) => $('[data-ok]', el).addEventListener('click', () => {
        const on = $('#xd-mode', el).value === 'on';
        const q = Math.max(1, parseInt($('#xd-qty', el).value, 10) || 1);
        const draft = $('#xd-draft', el).checked;
        const n = OPS.apply(recs.map((r) => { const p = { stock: on ? q : 0, syncAt: new Date().toISOString() }; if (!on && draft && r.status === 'publicado') p.status = 'rascunho'; return { rec: r, patch: p }; }), 'Atualização de disponibilidade');
        close();
        toast(n + ' produto(s) atualizados', { sub: on ? 'Disponíveis com estoque ' + q : 'Sem disponibilidade' + (draft ? ' e em rascunho' : '') });
        api.refresh();
      })
    });
  }
  function ruleDraft(silent) {
    const recs = OPS.list().filter((r) => r.status === 'publicado' && !r.available);
    const run = () => {
      const n = OPS.apply(recs.map((r) => ({ rec: r, patch: { status: 'rascunho' } })), 'Regra: sem disponibilidade → rascunho');
      toast(n ? n + ' produto(s) passaram a rascunho' : 'Nenhum produto publicado sem disponibilidade', { type: n ? 'ok' : 'info', sub: n ? 'Saem da loja até voltarem a ter estoque.' : '' });
      api.refresh();
    };
    if (silent || !recs.length) run(); else TD.confirm('Mover ' + recs.length + ' produto(s) para rascunho?', 'Produtos publicados sem disponibilidade deixam de aparecer na loja.', 'Mover para rascunho', run);
  }
  function rulePublish() {
    const recs = OPS.list().filter((r) => r.status === 'rascunho' && r.available && r.price);
    if (!recs.length) { toast('Nenhum rascunho disponível com preço', { type: 'info' }); return; }
    TD.confirm('Publicar ' + recs.length + ' produto(s)?', 'Rascunhos com estoque e preço passam a aparecer no catálogo.', 'Publicar', () => {
      const n = OPS.apply(recs.map((r) => ({ rec: r, patch: { status: 'publicado' } })), 'Regra: publicar disponíveis');
      toast(n + ' produto(s) publicados');
      api.refresh();
    });
  }

  /* =========================================================
     SEO
     ========================================================= */
  const sS = { f: 'semmeta', page: 1, per: 25, serp: '', q: '', xml: null };
  const SEO_F = { semmeta: ['Sem metadescrição', (r) => !r.metaDesc], semimg: ['Sem imagens', (r) => !r.photos.length], semalt: ['Sem ALT', (r) => r.photos.length && !r.alt], dup: ['URL duplicada', (r) => r.dupSlug], noindex: ['Não indexáveis', (r) => !r.indexable] };
  function viewSeo(v) {
    const st = OPS.stats();
    const s = OPS.state();
    const L = OPS.list().filter(SEO_F[sS.f][1]);
    const slice = paginate(L, sS);
    const cand = searchFilter(OPS.list().filter((r) => r.status === 'publicado'), sS.q).slice(0, 60);
    const cur = OPS.byKey(sS.serp) || cand[0] || OPS.list()[0];
    v.innerHTML = '<div class="kpis kpis-6">' +
      kpi('Indexáveis', nf(st.indexable), 'Publicados e com URL única', 'check') +
      kpi('Não indexáveis', nf(st.total - st.indexable), 'Rascunhos ou URL duplicada', 'eye', true) +
      kpi('Sem metadescrição', nf(st.noMeta), 'Geradas automaticamente', 'edit', st.noMeta > 0) +
      kpi('Sem imagens', nf(st.noPhotos), 'Sem S1.webp', 'image', st.noPhotos > 0) +
      kpi('Sem ALT', nf(st.noAlt), 'Texto alternativo da foto', 'alert', st.noAlt > 0) +
      kpi('URLs duplicadas', nf(st.dupSlug), 'Precisam de slug único', 'link', st.dupSlug > 0) + '</div>' +
      '<div class="a-grid">' + panel('Vista prévia no Google', '<div class="a-toolbar"><input type="search" placeholder="Buscar produto" value="' + esc(sS.q) + '" data-xq="seo" aria-label="Buscar produto">' + sel('data-xserp', cand.map((r) => [r.key, (r.sku ? r.sku + ' · ' : '') + r.name.slice(0, 60)]), cur ? cur.key : '', 'Produto') + '</div>' +
        '<div class="panel-body">' + (cur ? serp(cur) : '') + '</div>') +
      panel('Sitemap, robots e correções', '<div class="panel-body x-stack">' +
        '<div class="x-kv"><span>sitemap.xml</span><b>' + (s.sitemap ? 'Gerado em ' + dt(s.sitemap.at) + ' · ' + nf(s.sitemap.n) + ' produtos' : 'Ainda não gerado') + '</b></div>' +
        '<div class="x-row"><button class="btn btn-sm btn-outline" type="button" data-xsitemap>' + icon('file') + 'Gerar sitemap.xml</button><button class="btn btn-sm btn-primary" type="button" data-xfill>' + icon('zap') + 'Gerar metadescrições e ALT</button></div>' +
        (sS.xml ? '<pre class="x-code x-scroll">' + esc(sS.xml) + '</pre>' : '') +
        '<pre class="x-code">User-agent: *\nDisallow: /carrinho\nDisallow: /checkout\nDisallow: /minha-conta\nSitemap: https://www.tecnodreams.com/sitemap.xml</pre>' +
        '<p class="muted small" style="margin:0">' + SIM + ' O sistema final gera sitemap e robots.txt automaticamente a cada publicação.</p></div>') + '</div>' +
      '<div class="panel"><div class="a-toolbar">' + Object.keys(SEO_F).map((k) => '<button class="chip' + (sS.f === k ? ' active' : '') + '" type="button" data-xsf="' + k + '">' + SEO_F[k][0] + ' <small>' + nf(OPS.list().filter(SEO_F[k][1]).length) + '</small></button>').join('') + '</div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Produto</th><th>URL</th><th>Metadescrição</th><th>Indexação</th><th></th></tr></thead><tbody>' +
      (slice.length ? slice.map((r) => '<tr><td><div class="t-prod">' + thumb(r) + '<div><strong>' + esc(r.name) + '</strong><small class="mono">' + esc(r.sku || 'sem SKU') + '</small></div></div></td><td class="mono small">/produto/' + esc(r.slug) + (r.dupSlug ? ' ' + pill('s-err', 'Duplicada') : '') + '</td>' +
        '<td class="small" style="max-width:320px">' + (r.metaDesc ? esc(r.metaDesc) : '<span class="muted">—</span>') + '</td><td>' + (r.indexable ? pill('s-ok', 'index') : pill('s-mute', 'noindex', r.status !== 'publicado' ? 'Rascunho' : 'URL duplicada')) + '</td>' +
        '<td class="t-actions"><button class="btn btn-sm btn-outline" type="button" data-xedit="' + esc(r.key) + '">Corrigir</button></td></tr>').join('')
        : '<tr><td colspan="5">' + TD.emptyState('check', 'Nenhum problema neste filtro', 'Tudo certo por aqui.') + '</td></tr>') +
      '</tbody></table></div>' + pager(L.length, sS, 'seo') + '</div>';
  }
  function serp(r) {
    const title = (r.name.length > 55 ? r.name.slice(0, 54) + '…' : r.name) + ' | TecnoDreams';
    const desc = r.metaDesc || OPS.autoMeta(r, r.catName);
    const img = r.photos.map((p) => OPS.cdnUrl(r.sku, p.n, p.v));
    const ld = [{ '@context': 'https://schema.org', '@type': 'Product', name: r.name, sku: r.sku || undefined, brand: r.brand ? { '@type': 'Brand', name: r.brand } : undefined, image: img.slice(0, 3), description: desc,
      offers: { '@type': 'Offer', url: 'https://www.tecnodreams.com/produto/' + r.slug, priceCurrency: 'BRL', price: r.price ? r.price.toFixed(2) : undefined, availability: 'https://schema.org/' + (r.available ? 'InStock' : 'OutOfStock') } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [['Início', ''], [r.catName, 'categoria/' + r.category], [r.name, 'produto/' + r.slug]].map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b[0], item: 'https://www.tecnodreams.com/' + b[1] })) }];
    return '<div class="serp"><div class="serp-site"><span class="serp-fav"><img src="assets/brand/favicon.webp" alt=""></span><div><b>TecnoDreams</b><small>https://www.tecnodreams.com › produto › ' + esc(r.slug.slice(0, 40)) + (r.slug.length > 40 ? '…' : '') + '</small></div></div>' +
      '<a class="serp-title">' + esc(title) + '</a><p class="serp-desc">' + (r.price ? '<span>' + fmt(r.price) + ' · ' + (r.available ? 'Em estoque' : 'Esgotado') + '</span> — ' : '') + esc(desc) + '</p></div>' +
      (r.metaDesc ? '' : '<p class="x-issues">' + icon('alert') + 'Sem metadescrição: a prévia usa o texto automático.</p>') +
      '<div class="x-kv"><span>Canonical</span><b class="mono small">https://www.tecnodreams.com/produto/' + esc(r.slug) + '</b></div>' +
      '<details class="x-details"><summary>Dados estruturados (Product, Offer, BreadcrumbList)</summary><pre class="x-code x-scroll">' + esc(JSON.stringify(ld, null, 2)) + '</pre></details>';
  }

  /* =========================================================
     GOOGLE MERCHANT CENTER (simulado)
     ========================================================= */
  const mS = { f: '', page: 1, per: 25 };
  function merchantSync(filter, label) {
    const res = OPS.merchantSync(filter, label);
    if (res.total) toast(res.sent + ' item(ns) enviado(s) · ' + res.errs + ' com erro', { type: res.errs ? 'info' : 'ok', sub: 'Simulado: nada foi enviado ao Google.' });
    else toast('Nada para sincronizar', { type: 'info', sub: 'Todos os itens publicados já foram enviados.' });
    api.refresh();
    if (res.sent) setTimeout(() => { const n = OPS.merchantProcess(); if (n) { toast(n + ' item(ns) em “processado”', { type: 'info', sub: 'Recebimento pelo Google simulado. Aprovação ainda não existe.' }); if (['merchant', 'dashboard', 'produtos'].indexOf(api.current()) > -1) api.refresh(); } }, 1800);
    return res;
  }
  function viewMerchant(v) {
    const st = OPS.stats();
    const s = OPS.state();
    const pubL = OPS.list().filter((r) => r.status === 'publicado');
    const M = st.merch;
    let L = pubL;
    if (mS.f === 'semsz') L = L.filter((r) => !r.sz);
    else if (mS.f) L = L.filter((r) => r.merchant.st === mS.f);
    L = L.slice().sort((a, b) => String(b.merchant.at || '').localeCompare(String(a.merchant.at || '')) || a.sku.localeCompare(b.sku));
    const slice = paginate(L, mS);
    const cnt = (f) => (f === 'semsz' ? pubL.filter((r) => !r.sz).length : f ? pubL.filter((r) => r.merchant.st === f).length : pubL.length);
    const last = s.merchantLog[0];
    v.innerHTML = note('<strong>Nenhum dado é enviado ao Google neste protótipo.</strong> No sistema final, um processo independente e supervisado envia as alterações do catálogo pela <strong>Merchant API</strong> ou por um <strong>feed automático</strong> (definido na avaliação técnica). Estados “aprovado” e “reprovado” só existem quando o Google responde; aqui eles aparecem apenas ao clicar em “Simular resposta do Google”.', 'warn') +
      '<div class="kpis kpis-6">' + kpi('Sincronizados', nf((M.processado || 0) + (M.aprovado || 0)), 'Processados ou aprovados', 'check') +
      kpi('Pendentes', nf(st.pendGoogle), 'Publicados aguardando envio', 'clock', st.pendGoogle > 0) +
      kpi('Com erros', nf(M.erro || 0), 'Bloqueados antes do envio', 'alert', (M.erro || 0) > 0) +
      kpi('Sem SZ.webp', nf(cnt('semsz')), 'Publicados sem foto Google', 'image', cnt('semsz') > 0) +
      kpi('Reprovados', nf(M.reprovado || 0), 'Resposta simulada', 'x', (M.reprovado || 0) > 0) +
      kpi('Última sincronização', last ? dt(last.at) : '—', last ? esc(last.action) : 'Nunca executada', 'refresh') + '</div>' +
      '<div class="x-quick"><button class="btn btn-primary btn-sm" type="button" data-xgm="sync">' + icon('refresh') + 'Sincronizar produtos</button><button class="btn btn-outline btn-sm" type="button" data-xgm="retry">' + icon('refresh') + 'Reintentar falhados</button><button class="btn btn-outline btn-sm" type="button" data-xgm="errors">' + icon('alert') + 'Ver erros</button><button class="btn btn-outline btn-sm" type="button" data-xgm="pending">' + icon('clock') + 'Consultar pendentes</button><span class="grow"></span><button class="btn btn-outline btn-sm" type="button" data-xgm="response">' + icon('globe') + 'Simular resposta do Google</button></div>' +
      '<div class="panel x-mb"><div class="a-toolbar">' + [['', 'Todos publicados'], ['pendente', 'Pendentes'], ['enviado', 'Enviados'], ['processado', 'Processados'], ['aprovado', 'Aprovados*'], ['reprovado', 'Reprovados*'], ['erro', 'Erros'], ['semsz', 'Sem SZ.webp']].map((x) => '<button class="chip' + (mS.f === x[0] ? ' active' : '') + '" type="button" data-xmf="' + x[0] + '">' + x[1] + ' <small>' + nf(cnt(x[0])) + '</small></button>').join('') + '</div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>SKU</th><th>Produto</th><th>Preço</th><th>Disponibilidade</th><th>Foto Google</th><th>Estado</th><th>Erro</th><th>Último intento</th></tr></thead><tbody>' +
      (slice.length ? slice.map((r) => '<tr><td class="mono nowrap">' + (esc(r.sku) || pill('s-err', 'Sem SKU')) + '</td><td class="x-name"><strong>' + esc(r.name) + '</strong>' + testTag(r) + '</td><td class="num nowrap">' + money(r.price) + '</td><td>' + (r.available ? pill('s-ok', 'in_stock') : pill('s-warn', 'out_of_stock')) + '</td>' +
        '<td>' + (r.sz ? '<span class="x-mini sz"><img src="' + esc(OPS.szSrc(r)) + '" alt=""><b>SZ</b></span>' : '<span class="x-mini missing" title="SZ.webp ausente"><b>SZ</b></span>') + '</td><td>' + merchPill(r) + '</td><td class="small">' + (r.merchant.err ? '<span class="down">' + esc(r.merchant.err) + '</span>' : '<span class="muted">—</span>') + '</td><td class="nowrap">' + dt(r.merchant.at) + '</td></tr>').join('')
        : '<tr><td colspan="8">' + TD.emptyState('globe', 'Nenhum item neste estado', 'Use os botões acima para sincronizar.') + '</td></tr>') +
      '</tbody></table></div>' + pager(L.length, mS, 'merch') + '</div>' +
      '<div class="a-grid">' + panel('Histórico de operações', s.merchantLog.length ? '<div class="table-wrap x-scroll"><table class="table"><thead><tr><th>Quando</th><th>Operação</th><th>Itens</th><th>Resultado</th></tr></thead><tbody>' + s.merchantLog.map((l) => '<tr><td class="nowrap">' + dt(l.at) + '</td><td>' + esc(l.action) + '</td><td>' + nf(l.n) + '</td><td class="small">' + esc(l.detail) + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="panel-body">' + TD.emptyState('clock', 'Sem operações', 'Clique em “Sincronizar produtos”.') + '</div>') +
      panel('Estados do item', '<div class="panel-body x-legend">' + ['pendente', 'erro', 'enviado', 'processado', 'aprovado', 'reprovado'].map((k) => '<div>' + pill(MERCHANT[k][0], MERCHANT[k][1]) + '<span>' + esc(MERCHANT[k][2]) + '</span></div>').join('') +
        '<p class="muted small" style="margin:6px 0 0">Validação interna antes do envio: SKU, preço, SZ.webp, marca e título ≤ 150 caracteres. Itens alterados (preço, estoque, nome, SZ) voltam a “pendente”.</p></div>') + '</div>';
  }
  function merchantAction(a) {
    if (a === 'sync') merchantSync();
    else if (a === 'retry') {
      const n = OPS.list().filter((r) => r.status === 'publicado' && (r.merchant.st === 'erro' || r.merchant.st === 'reprovado')).length;
      if (!n) { toast('Nenhum item com falha', { type: 'info' }); return; }
      merchantSync((r) => r.merchant.st === 'erro' || r.merchant.st === 'reprovado', 'Reenvio de falhados');
    } else if (a === 'errors') { mS.f = 'erro'; mS.page = 1; api.refresh(); }
    else if (a === 'pending') { mS.f = 'pendente'; mS.page = 1; api.refresh(); }
    else if (a === 'response') {
      const n = OPS.list().filter((r) => r.merchant.st === 'processado').length;
      if (!n) { toast('Nenhum item “processado”', { type: 'info', sub: 'Sincronize primeiro e aguarde o recebimento simulado.' }); return; }
      TD.confirm('Simular resposta do Google?', 'Serão atribuídos estados FICTÍCIOS de aprovado/reprovado a ' + n + ' item(ns) processados, apenas para demonstrar a interface. No sistema real esses estados vêm da Merchant API.', 'Simular resposta', () => {
        const r = OPS.merchantResponse();
        toast(r.ok + ' aprovado(s) · ' + r.bad + ' reprovado(s)', { type: 'info', sub: 'Resposta simulada — não representa uma aprovação real.' });
        api.refresh();
      });
    }
  }

  /* =========================================================
     MIGRAÇÃO WOOCOMMERCE
     ========================================================= */
  const MIG_STAGES = [
    ['Inventário e exportação', 'Leitura de produtos, categorias, atributos, variações e mídia pela API do WooCommerce.'],
    ['Normalização', 'Nomes, SKUs, marcas e variações de cor agrupadas; preços de teste descartados.'],
    ['Importação ao PostgreSQL', 'Upsert por SKU com o mesmo validador das importações do Excel.'],
    ['Fotografias → S3', 'Download, conversão a WebP e renomeação S1…Sn por SKU.'],
    ['SEO e URLs', 'Títulos, descrições e mapa de redirecionamentos 301 das URLs atuais.'],
    ['Validação paralela', 'WordPress segue no ar; conferência por amostragem antes da virada de DNS.']
  ];
  let migRun = -1;
  function viewMigration(v) {
    const base = TD.baseProducts;
    const s = OPS.state();
    const detected = 145; // observado no site público em 20/10/2026
    const omitted = 4; // preços de teste (R$ 1, 15, 50, 100)
    const outside = detected - base.length - omitted;
    const warns = base.filter((p) => !p.sku || !p.price);
    const photos = base.reduce((n, p) => n + p.images.length, 0);
    const brands = new Set(base.map((p) => p.brand).filter(Boolean)).size;
    const done = !!s.migration;
    const stageCls = (i) => (migRun > -1 ? (i < migRun ? 'done' : i === migRun ? 'now' : '') : done ? 'done' : '');
    const CHECK = [
      ['Produtos', base.length + ' de ' + detected + ' (amostra)', 'Todos os publicados'], ['SKU', (base.length - warns.length) + ' com SKU · ' + warns.length + ' sem SKU', 'Validados; ausentes vão para revisão'],
      ['Categorias', TD.baseCategories.length + ' categorias', 'Árvore completa'], ['Marcas', brands + ' marcas', 'Normalizadas'],
      ['Atributos', 'Fichas técnicas', 'Todos os atributos'], ['Variações', base.filter((p) => p.variants).length + ' produtos com cores agrupadas', 'Variações com SKU próprio'],
      ['Preços', 'R$ atuais e preço anterior', 'Atuais + ofertas programadas'], ['Descrições', 'Destaques e especificações', 'HTML limpo'],
      ['Fotografias', nf(photos) + ' imagens em WebP', 'Enviadas ao S3 por SKU'], ['Dados SEO existentes', 'Não incluídos', 'Títulos e descrições do plugin de SEO'],
      ['URLs atuais', 'Slugs preservados', 'Inventário completo de URLs'], ['Redirecionamentos 301', 'Mapa de exemplo', 'Gerados e testados antes da virada']
    ];
    v.innerHTML = note('A migração é feita <strong>por etapas</strong>, com o WordPress funcionando normalmente até a nova plataforma ser validada. Números do protótipo: a amostra copiada da Store API pública em 20/10/2026. A execução abaixo é ' + SIM + '.', 'warn') +
      '<div class="kpis kpis-6">' + kpi('Produtos detectados', detected, 'Publicados no site em 20/10/2026', 'search') +
      kpi('Importados', base.length, 'Amostra presente no protótipo', 'check') +
      kpi('Omitidos', omitted + outside, omitted + ' preços de teste · ' + outside + ' fora da amostra', 'minus', true) +
      kpi('Com avisos', warns.length, 'Sem SKU e sem preço', 'alert', true) +
      kpi('Fotografias migradas', nf(photos), 'Convertidas a WebP', 'image') +
      kpi('Validação', done ? 'Concluída' : 'Pendente', done ? 'Teste em ' + dt(s.migration.at) : 'Execute a migração de teste', 'shield', !done) + '</div>' +
      '<div class="a-grid">' + panel('Etapas da migração', '<div class="panel-body"><ol class="x-stages">' + MIG_STAGES.map((m, i) => '<li class="' + stageCls(i) + '"><span class="n">' + (stageCls(i) === 'done' ? icon('check') : i + 1) + '</span><div><strong>' + esc(m[0]) + '</strong><small>' + esc(m[1]) + '</small></div></li>').join('') + '</ol>' +
        '<button class="btn btn-primary btn-sm" type="button" data-xmig' + (migRun > -1 ? ' disabled' : '') + '>' + icon('play') + (done ? 'Executar novamente' : 'Executar migração de teste') + '</button></div>') +
      panel('Itens com aviso', warns.map((p) => '<div class="list-row"><img src="' + esc(TD.img(p)) + '" alt=""><div class="grow"><strong style="font-size:13px">' + esc(p.name) + '</strong><small class="muted" style="display:block">' + [!p.sku && 'sem SKU', !p.price && 'sem preço (sob consulta)'].filter(Boolean).join(' · ') + '</small></div></div>').join('')) + '</div>' +
      '<div class="a-grid">' + panel('Dados migrados', '<div class="table-wrap"><table class="table"><thead><tr><th>Dado</th><th>No protótipo</th><th>No sistema final</th></tr></thead><tbody>' + CHECK.map((c) => '<tr><td><strong>' + c[0] + '</strong></td><td>' + esc(c[1]) + '</td><td>' + esc(c[2]) + '</td></tr>').join('') + '</tbody></table></div>') +
      panel('Mapa de redirecionamentos 301 (exemplo)', '<div class="table-wrap"><table class="table"><thead><tr><th>URL atual (WooCommerce)</th><th>Nova URL</th></tr></thead><tbody>' + base.slice(0, 8).map((p) => '<tr><td class="mono small">/produto/' + esc(p.slug.slice(0, 38)) + (p.slug.length > 38 ? '…' : '') + '/</td><td class="mono small">→ /produto/' + esc(p.slug.slice(0, 30)) + (p.slug.length > 30 ? '…' : '') + ' <span class="tag tag-info">301</span></td></tr>').join('') + '</tbody></table></div><div class="pager"><span>Estrutura atual de URLs a confirmar no levantamento inicial.</span></div>') + '</div>';
  }
  function runMigration() {
    if (migRun > -1) return;
    migRun = 0;
    api.refresh();
    const step = () => {
      migRun++;
      if (migRun < MIG_STAGES.length) { if (api.current() === 'migracao') api.refresh(); setTimeout(step, 650); return; }
      migRun = -1;
      const s = OPS.state();
      s.migration = { at: new Date().toISOString() };
      OPS.save();
      toast('Migração de teste concluída', { sub: '86 importados · 7 avisos · 295 fotos (simulado).' });
      if (api.current() === 'migracao') api.refresh();
    };
    setTimeout(step, 650);
  }

  /* =========================================================
     CENTRAL DE ERROS / NOTIFICAÇÕES
     ========================================================= */
  function errorsModal(area) {
    const s = OPS.state();
    const areas = Array.from(new Set(s.errors.map((e) => e.area)));
    let cur = area || '';
    const body = () => { const E = s.errors.filter((e) => !cur || e.area === cur); return '<div class="x-row" style="margin-bottom:12px;flex-wrap:wrap">' + [''].concat(areas).map((a) => '<button class="chip' + (cur === a ? ' active' : '') + '" type="button" data-ea="' + esc(a) + '">' + (a || 'Todas') + ' <small>' + s.errors.filter((e) => !a || e.area === a).length + '</small></button>').join('') + '</div>' + (E.length ? '<div class="x-boxed">' + errList(E, 200) + '</div>' : '<p class="x-ok">' + icon('check') + 'Nenhum erro registrado. Execute as demonstrações para gerar casos.</p>'); };
    TD.modal({
      title: 'Central de erros', wide: true, body: body(),
      foot: '<button class="btn btn-primary btn-sm" data-close>Fechar</button>',
      onOpen: (el) => el.addEventListener('click', (e) => { const b = e.target.closest('[data-ea]'); if (b) { cur = b.dataset.ea; $('.modal-body', el).innerHTML = body(); } })
    });
  }
  function activityModal() {
    const s = OPS.state();
    const items = s.errors.slice(0, 15).map((e) => ({ at: e.at, ic: 'alert', cls: 'err', t: e.area, d: e.msg }))
      .concat(s.imports.slice(0, 10).map((i) => ({ at: i.at, ic: 'upload', cls: 'ok', t: 'Importação ' + i.id, d: i.created + ' criados · ' + i.updated + ' atualizados · ' + (i.errors + i.dup) + ' com problema' })))
      .concat(s.merchantLog.slice(0, 10).map((l) => ({ at: l.at, ic: 'globe', cls: 'info', t: l.action, d: l.detail })))
      .sort((a, b) => b.at.localeCompare(a.at)).slice(0, 30);
    TD.modal({
      title: 'Notificações',
      body: items.length ? items.map((x) => '<div class="list-row x-act ' + x.cls + '">' + icon(x.ic) + '<div class="grow"><strong>' + esc(x.t) + '</strong><small>' + esc(x.d) + '</small></div><small class="muted nowrap">' + dt(x.at) + '</small></div>').join('') : TD.emptyState('bell', 'Sem notificações', 'Importações, erros e sincronizações aparecem aqui.'),
      foot: '<button class="btn btn-outline btn-sm" type="button" data-all-err>Central de erros</button><button class="btn btn-primary btn-sm" data-close>Fechar</button>',
      onOpen: (el, close) => $('[data-all-err]', el).addEventListener('click', () => { close(); errorsModal(); })
    });
  }

  /* =========================================================
     EVENTOS (repassados por admin.js)
     ========================================================= */
  const STATES = { prod: pS, photo: fS, price: rS, merch: mS, seo: sS };
  const SETS = { prod: selP, price: selR };
  const FILTERS = { prod: filterProducts, price: filterPrices };
  function onClick(t) {
    const d = t.closest('[data-xdemo]'); if (d) { runDemo(d.dataset.xdemo); return true; }
    const g = t.closest('[data-xgo]'); if (g) { nav(g.dataset.xgo); return true; }
    const er = t.closest('[data-xerrors]'); if (er) { errorsModal(er.dataset.xerrors || ''); return true; }
    const pg = t.closest('[data-xpg]'); if (pg) { STATES[pg.dataset.xpg].page += +pg.dataset.d; api.refresh(); return true; }
    const sa = t.closest('[data-xselall]'); if (sa) { FILTERS[sa.dataset.xselall]().forEach((r) => SETS[sa.dataset.xselall].add(r.key)); api.refresh(); return true; }
    const b = t.closest('[data-xbulk]'); if (b) { bulk(b.dataset.xbulk, b.dataset.scope); return true; }
    const ed = t.closest('[data-xedit]'); if (ed) { editModal(ed.dataset.xedit); return true; }
    const ph = t.closest('[data-xphotos]'); if (ph) { photoModal(ph.dataset.xphotos); return true; }
    const del = t.closest('[data-xdel]');
    if (del) {
      const r = OPS.byKey(del.dataset.xdel);
      TD.confirm('Excluir produto?', '“' + r.name + '” ' + (r.real ? 'deixará de aparecer na loja deste navegador (use “Restaurar demo” para desfazer).' : 'será removido (produto de teste).'), 'Excluir', () => { if (r.real) TD.deleteProduct(r.id); else OPS.removeImported([r.key]); selP.delete(r.key); toast('Produto excluído', { type: 'info', sub: r.name }); api.refresh(); }, true);
      return true;
    }
    if (t.closest('[data-xdups]')) { dupModal(); return true; }
    const ex = t.closest('[data-xexport]'); if (ex) { exportProducts(filterProducts(), 'produtos-tecnodreams.csv'); return true; }
    // importações
    if (t.closest('[data-ximptpl]')) { download('modelo-importacao-tecnodreams.csv', OPS.toCSV(OPS.demoRows(300))); toast('Planilha modelo gerada', { sub: '300 linhas de teste, com erros intencionais. Envie-a de volta pelo botão “Escolher arquivo”.' }); return true; }
    if (t.closest('[data-ximpapi]')) { apiModal(); return true; }
    if (t.closest('[data-ximpdemo]')) { loadPreview(OPS.demoRows(imp.qty), 'demo', 'planilha-teste-' + imp.qty + '.csv'); api.refresh(); setTimeout(() => { const p = $('#x-preview'); if (p) p.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50); return true; }
    const imf = t.closest('[data-ximpf]'); if (imf) { imp.filter = imf.dataset.ximpf; api.refresh(); return true; }
    if (t.closest('[data-ximprun]')) { runImport(); return true; }
    if (t.closest('[data-ximpcancel]')) { Object.assign(imp, { stage: 'idle', analysis: null, result: null, prog: null }); api.refresh(); return true; }
    const il = t.closest('[data-ximplog]'); if (il) { importLogModal(il.dataset.ximplog); return true; }
    if (t.closest('[data-xgo-imported]')) { Object.assign(pS, { q: '', cat: '', brand: '', status: '', sort: 'upd', page: 1 }); nav('produtos'); return true; }
    // fotos
    if (t.closest('[data-xassoc]')) {
      const res = OPS.associatePhotos();
      toast(res.scanned ? res.linked + ' produto(s) com fotos vinculadas' : 'Nenhum produto importado sem fotos', { type: res.scanned ? 'ok' : 'info', sub: res.scanned ? res.withSZ + ' com SZ.webp · ' + res.missing + ' pasta(s) vazia(s) — simulado' : 'Importe a planilha de teste primeiro.' });
      api.refresh();
      return true;
    }
    // preços
    const ru = t.closest('[data-xrule]'); if (ru) { ru.dataset.xrule === 'draft' ? ruleDraft(false) : rulePublish(); return true; }
    const lf = t.closest('[data-xlogf]'); if (lf) { rS.log = lf.dataset.xlogf; api.refresh(); return true; }
    // seo
    const sf = t.closest('[data-xsf]'); if (sf) { sS.f = sf.dataset.xsf; sS.page = 1; api.refresh(); return true; }
    if (t.closest('[data-xsitemap]')) { sS.xml = OPS.sitemap().xml; toast('sitemap.xml gerado (simulado)', { sub: OPS.state().sitemap.n + ' URLs de produto indexáveis' }); api.refresh(); return true; }
    if (t.closest('[data-xfill]')) { const r = OPS.fillSeo(); toast(r.meta + ' metadescrições e ' + r.alt + ' ALT gerados', { sub: 'Texto automático a partir do nome, marca e categoria.' }); api.refresh(); return true; }
    // merchant
    const gm = t.closest('[data-xgm]'); if (gm) { merchantAction(gm.dataset.xgm); return true; }
    const mf = t.closest('[data-xmf]'); if (mf) { mS.f = mf.dataset.xmf; mS.page = 1; api.refresh(); return true; }
    // migração
    if (t.closest('[data-xmig]')) { runMigration(); return true; }
    return false;
  }
  function onChange(t) {
    if (t.dataset.xsel) { const set = SETS[t.dataset.xsel]; t.checked ? set.add(t.dataset.k) : set.delete(t.dataset.k); api.refresh(); return true; }
    if (t.dataset.xselpage) {
      const sc = t.dataset.xselpage;
      const slice = paginate(FILTERS[sc](), STATES[sc]);
      slice.forEach((r) => (t.checked ? SETS[sc].add(r.key) : SETS[sc].delete(r.key)));
      api.refresh();
      return true;
    }
    if (t.dataset.xf) { const [sc, k] = t.dataset.xf.split('.'); STATES[sc][k] = t.value; STATES[sc].page = 1; api.refresh(); return true; }
    if (t.dataset.xper) { const st = STATES[t.dataset.xper]; st.per = +t.value; st.page = 1; api.refresh(); return true; }
    if (t.matches('[data-ximpfile]')) { if (t.files[0]) readCSVFile(t.files[0]); t.value = ''; return true; }
    if (t.matches('[data-ximpqty]')) { imp.qty = +t.value; return true; }
    if (t.dataset.ximpopt) { imp.opts[t.dataset.ximpopt] = t.checked; return true; }
    if (t.matches('[data-xserp]')) { sS.serp = t.value; api.refresh(); return true; }
    return false;
  }
  let qt;
  function onInput(t) {
    const sc = t.dataset && t.dataset.xq;
    if (!sc) return false;
    clearTimeout(qt);
    qt = setTimeout(() => {
      STATES[sc].q = t.value;
      STATES[sc].page = 1;
      if (sc === 'seo') sS.serp = '';
      api.refresh();
      const el = $('[data-xq="' + sc + '"]');
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }, 220);
    return true;
  }

  TD.adminOps = {
    init(a) { api = a; },
    views: { dashboard: viewDashboard, demos: viewDemos, produtos: viewProducts, importacoes: viewImport, fotos: viewPhotos, precos: viewPrices, seo: viewSeo, merchant: viewMerchant, migracao: viewMigration },
    onClick, onChange, onInput,
    search(q) { Object.assign(pS, { q, page: 1 }); },
    notifCount: () => OPS.state().errors.length,
    activity: activityModal,
    reset() { selP.clear(); selR.clear(); Object.assign(imp, { stage: 'idle', analysis: null, result: null, prog: null }); sS.xml = null; OPS.reset(); }
  };
})();
