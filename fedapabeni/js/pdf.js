/*
 * Exportación de la cotización a PDF (A4) con html2canvas + jsPDF.
 *
 * Estrategia: en lugar de "fotografiar" la página entera y cortarla, se clona el contenido en
 * bloques (encabezados, tarjetas, tablas, filas de tarjetas) y se distribuyen en páginas A4 reales,
 * evitando cortes dentro de un bloque. Cada página lleva encabezado, pie y numeración.
 * Se renderiza cada página por separado y se agregan los enlaces como anotaciones clicables.
 */
(function (global) {
  'use strict';

  const FILE_NAME = 'cotizacion-fedapabeni-amicornios-soft.pdf';
  const PAGE_W = 794;   // px a 96 dpi (210 mm)
  const PAGE_H = 1123;  // px a 96 dpi (297 mm)
  const MM = 210 / PAGE_W;

  const Q = function () { return global.Quote; };

  function status(msg) { const s = document.getElementById('pdfStatus'); if (s) s.textContent = msg; }
  function nextFrame() { return new Promise(function (r) { requestAnimationFrame(function () { setTimeout(r, 0); }); }); }

  function waitImages(root) {
    return Promise.all(Array.from(root.querySelectorAll('img')).map(function (img) {
      img.loading = 'eager';
      if (img.complete && img.naturalWidth) return Promise.resolve();
      return new Promise(function (res) { img.onload = img.onerror = function () { res(); }; });
    }));
  }

  function absUrl(href) {
    try { return new URL(href, location.href).href; } catch (e) { return href; }
  }

  /** Limpia un clon: sin controles, sin ids duplicados, campos vacíos con marcador visible. */
  function clean(el) {
    el.querySelectorAll('.no-pdf, input[type="date"], label.url-ctl').forEach(function (n) { n.remove(); });
    [el].concat(Array.from(el.querySelectorAll('[id]'))).forEach(function (n) { n.removeAttribute && n.removeAttribute('id'); });
    el.querySelectorAll('[contenteditable]').forEach(function (n) {
      n.removeAttribute('contenteditable'); n.removeAttribute('role'); n.classList.remove('editable');
    });
    el.querySelectorAll('[data-f]').forEach(function (n) {
      if (n.classList.contains('is-empty')) {
        n.classList.remove('is-empty');
        n.classList.add('is-empty-pdf');
        n.textContent = n.dataset.ph || '[Por completar]';
      }
    });
    el.querySelectorAll('a[href]').forEach(function (a) {
      const raw = a.getAttribute('href');
      if (raw.charAt(0) === '#') { a.removeAttribute('href'); return; }
      let href = absUrl(raw);
      // Enlaces al prototipo: usar la URL pública configurada si existe.
      const pub = Q().protoUrl();
      if (/^https?:\/\//.test(pub) && /prototipo\/(index\.html)?$/.test(raw)) href = pub;
      a.setAttribute('href', href);
    });
    el.querySelectorAll('img').forEach(function (img) { img.removeAttribute('loading'); });
    return el;
  }

  /** Construye la lista de bloques a partir de las secciones de la cotización. */
  function collectBlocks() {
    const blocks = [];
    document.querySelectorAll('#doc .sec').forEach(function (sec) {
      let first = true;
      Array.from(sec.children).forEach(function (child) {
        if (child.classList.contains('no-pdf')) return;
        const clone = clean(child.cloneNode(true));
        const keepNext = child.classList.contains('sec-head') || child.classList.contains('sub');
        const brk = first && sec.hasAttribute('data-pdf-break');
        const split = parseInt(child.getAttribute('data-pdf-split'), 10);
        if (split > 0 && clone.children.length > split) {
          const kids = Array.from(clone.children);
          for (let i = 0; i < kids.length; i += split) {
            const part = clone.cloneNode(false);
            kids.slice(i, i + split).forEach(function (k) { part.appendChild(k); });
            blocks.push({ el: wrap(part), breakBefore: brk && i === 0, keepNext: false });
          }
        } else {
          blocks.push({ el: wrap(clone), breakBefore: brk, keepNext: keepNext });
        }
        first = false;
      });
    });
    return blocks;
  }

  function wrap(node) { const d = document.createElement('div'); d.className = 'blk'; d.appendChild(node); return d; }

  function fieldText(k) {
    const v = Q().state.fields[k];
    return v ? Q().esc(v) : '<span class="is-empty-pdf">' + Q().esc(Q().placeholder(k)) + '</span>';
  }

  function makeCover() {
    const f = Q().state.fields;
    const pub = Q().protoUrl();
    const d = document.createElement('div');
    d.className = 'pdf-cover';
    d.innerHTML = '<div class="bg"></div><div class="in">' +
      '<div class="brandrow"><div class="b"><div><b>' + fieldText('companyName') + '</b><small>Propuesta técnica y económica</small></div></div><span class="tag">Cotización N.º ' + fieldText('quoteNo') + '</span></div>' +
      '<div class="mid"><p class="kicker">Consultoría por producto · Convocatoria IPHAE – FEDAPABENI</p>' +
      '<h1>Diseño, desarrollo e implementación de la <em>plataforma web comercial</em> de FEDAPABENI</h1>' +
      '<p class="lead2">Herramienta institucional, comercial y de articulación de mercados para visibilizar a las asociaciones y emprendimientos amazónicos del norte de Bolivia y conectar su oferta con compradores.</p>' +
      '<div class="grid">' +
      '<div><span>Empresa proponente</span><b>' + fieldText('companyName') + '</b></div>' +
      '<div><span>Cliente</span><b>FEDAPABENI</b></div>' +
      '<div><span>Institución contratante</span><b>IPHAE</b></div>' +
      '<div><span>Fecha de elaboración</span><b>' + fieldText('date') + '</b></div>' +
      '<div class="hl"><span>Presupuesto total</span><b>' + Q().money(Q().total()) + '</b></div>' +
      '<div class="hl"><span>Plazo de ejecución</span><b>18 días calendario</b></div>' +
      '</div>' +
      '<div class="foot"><span>' + fieldText('companyEmail') + ' · ' + fieldText('companyPhone') + ' · soft.amicornios.com</span>' +
      '<span>Prototipo: ' + (pub ? '<a href="' + Q().esc(pub) + '">' + Q().esc(pub.replace(/^https?:\/\//, '')) + '</a>' : '<span class="is-empty-pdf">[URL pública del prototipo por publicar]</span>') + '</span></div>' +
      '</div></div>';
    return d;
  }

  function newPage(root) {
    const f = Q().state.fields;
    const p = document.createElement('div');
    p.className = 'pdf-page pdf-mode';
    p.innerHTML = '<div class="pg-head"><span><b>FEDAPABENI</b> <span class="gold">·</span> Plataforma web comercial — Propuesta técnica y económica</span><span>' + fieldText('companyName') + '</span></div>' +
      '<div class="pg-body"></div>' +
      '<div class="pg-foot"><span>Cotización N.º ' + fieldText('quoteNo') + ' · ' + fieldText('date') + ' · Vigencia: ' + Q().esc(f.validity || '15') + ' días</span><span class="pg-num"></span></div>';
    root.appendChild(p);
    return p;
  }

  function overflows(body) { return body.scrollHeight > body.clientHeight + 1; }

  /** Distribuye los bloques en páginas A4 sin cortarlos. */
  function paginate(root, blocks) {
    const pages = [];
    let page = newPage(root);
    pages.push(page);
    let body = page.querySelector('.pg-body');
    for (let i = 0; i < blocks.length; i++) {
      const unit = [blocks[i]];
      while (unit[unit.length - 1].keepNext && i + 1 < blocks.length) unit.push(blocks[++i]);
      if (unit[0].breakBefore && body.children.length) {
        page = newPage(root); pages.push(page); body = page.querySelector('.pg-body');
      }
      unit.forEach(function (b) { body.appendChild(b.el); });
      if (!overflows(body)) continue;
      if (body.children.length > unit.length) {
        unit.forEach(function (b) { b.el.remove(); });
        page = newPage(root); pages.push(page); body = page.querySelector('.pg-body');
        unit.forEach(function (b) { body.appendChild(b.el); });
      }
      if (overflows(body)) {
        // Bloque más alto que una página: se reduce proporcionalmente para que entre completo.
        const last = unit[unit.length - 1].el;
        const avail = body.clientHeight - (last.offsetTop - body.offsetTop);
        const h = last.scrollHeight;
        const s = Math.max(0.5, avail / h);
        last.style.width = (body.clientWidth / s) + 'px';
        last.style.transform = 'scale(' + s + ')';
        last.style.transformOrigin = '0 0';
        last.style.marginBottom = (-(h * (1 - s))) + 'px';
      }
    }
    return pages.filter(function (p) { return p.querySelector('.pg-body').children.length; });
  }

  async function build(opts) {
    opts = opts || {};
    if (!global.html2canvas || !global.jspdf) throw new Error('No se pudieron cargar las librerías de PDF (html2canvas/jsPDF). Verifique su conexión a internet.');
    const scrollY = window.scrollY;
    window.scrollTo(0, 0);
    if (document.fonts && document.fonts.ready) await document.fonts.ready;

    const root = document.createElement('div');
    root.className = 'pdf-root';
    root.setAttribute('aria-hidden', 'true');
    document.body.appendChild(root);

    try {
      status('Preparando contenido');
      const cover = makeCover();
      root.appendChild(cover);
      const blocks = collectBlocks();
      const staging = document.createElement('div');
      staging.className = 'pdf-page pdf-mode';
      staging.innerHTML = '<div class="pg-body" style="height:auto"></div>';
      blocks.forEach(function (b) { staging.firstChild.appendChild(b.el); });
      root.appendChild(staging);
      await waitImages(root);
      await nextFrame();
      staging.remove();

      status('Paginando');
      const pages = paginate(root, blocks);
      const all = [cover].concat(pages);
      const n = all.length;
      pages.forEach(function (p, i) { p.querySelector('.pg-num').innerHTML = 'Página <b>' + (i + 2) + '</b> de ' + n; });
      await nextFrame();

      if (opts.preview) return { root: root, pages: n };

      const pdf = new global.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
      pdf.setProperties({
        title: 'Propuesta técnica y económica — Plataforma web comercial FEDAPABENI',
        subject: 'Diseño, desarrollo e implementación de la plataforma web comercial de FEDAPABENI (convocatoria IPHAE)',
        author: Q().state.fields.companyName || 'Amicornios Soft',
        keywords: 'FEDAPABENI, IPHAE, plataforma web, catálogo, directorio, cotización',
        creator: 'Amicornios Soft',
      });
      const fileProtocol = location.protocol === 'file:';
      for (let i = 0; i < n; i++) {
        status('Renderizando página ' + (i + 1) + ' de ' + n);
        const el = all[i];
        const canvas = await global.html2canvas(el, {
          scale: 2, useCORS: true, allowTaint: false, backgroundColor: '#ffffff', logging: false,
          windowWidth: 1280, width: PAGE_W, height: PAGE_H, scrollX: 0, scrollY: 0,
          imageTimeout: fileProtocol ? 1 : 15000,
          ignoreElements: function (node) { return node.id === 'doc' || node.id === 'appbar' || node.id === 'pdfOverlay'; },
        });
        if (i > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.88), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
        const base = el.getBoundingClientRect();
        el.querySelectorAll('a[href]').forEach(function (a) {
          const href = a.getAttribute('href');
          if (!/^(https?:|mailto:)/.test(href)) return;
          Array.from(a.getClientRects()).forEach(function (r) {
            pdf.link((r.left - base.left) * MM, (r.top - base.top) * MM, r.width * MM, r.height * MM, { url: href });
          });
        });
        await nextFrame();
      }
      if (opts.returnPdf) return { pdf: pdf, pages: n };
      status('Guardando archivo');
      pdf.save(FILE_NAME);
      return { pages: n };
    } finally {
      if (!opts.preview) root.remove();
      window.scrollTo(0, scrollY);
    }
  }

  async function exportPdf() {
    const ov = document.getElementById('pdfOverlay');
    ov.hidden = false;
    try {
      if (location.protocol === 'file:') Q().toast('Abierto como archivo local: algunas imágenes podrían omitirse en el PDF. Use un servidor local (ver README).', 'error');
      const r = await build();
      Q().toast('PDF generado: ' + r.pages + ' páginas (' + FILE_NAME + ').');
    } catch (err) {
      console.error(err);
      Q().toast('No se pudo generar el PDF: ' + err.message, 'error');
    } finally {
      ov.hidden = true;
    }
  }

  document.addEventListener('click', function (e) {
    const b = e.target.closest('[data-action="pdf"]');
    if (b) { e.preventDefault(); exportPdf(); }
  });

  global.QuotePdf = { build: build, exportPdf: exportPdf, FILE_NAME: FILE_NAME };
})(window);
