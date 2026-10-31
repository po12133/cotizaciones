/*
 * Cotización en PDF vectorial (A4) con jsPDF + AutoTable, incluidos en assets/vendor (funcionan sin conexión).
 * Se genera desde el mismo modelo que dibuja la página (pricing.buildModel), así montos y alcance coinciden.
 * - Las tablas gestionan sus propios saltos de página (rowPageBreak: 'avoid').
 * - Los bloques de texto llaman a ensure() para no partirse; los títulos se mantienen con su contenido.
 * - Encabezado, pie y "Página X de Y" se dibujan al final, cuando se conoce el total de páginas.
 */
(function (root) {
  const TOR = root.TOR;
  const BASE = (function () {
    const s = document.currentScript && document.currentScript.src;
    return s ? s.replace(/js\/pdf\.js(\?.*)?$/, '') : '';
  })();
  const VENDOR = ['assets/vendor/jspdf.umd.min.js', 'assets/vendor/jspdf.plugin.autotable.min.js'];

  const INK = [13, 17, 23];
  const STEEL = [33, 42, 53];
  const ACCENT = [226, 97, 27];
  const ACCENT_SOFT = [255, 241, 231];
  const TEXT = [45, 55, 67];
  const MUTED = [93, 105, 120];
  const LINE = [222, 227, 233];
  const SOFT = [244, 246, 248];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if ([...document.scripts].some((s) => s.src.endsWith(src))) return resolve();
      const s = document.createElement('script');
      s.src = BASE + src;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
      document.head.appendChild(s);
    });
  }
  async function ensureLib() {
    if (!(root.jspdf && root.jspdf.jsPDF)) await loadScript(VENDOR[0]);
    if (typeof new root.jspdf.jsPDF().autoTable !== 'function') await loadScript(VENDOR[1]);
    return root.jspdf.jsPDF;
  }

  // Las fuentes estándar del PDF usan WinAnsi: se normalizan los caracteres fuera de Latin-1.
  function clean(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/[—–−]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
      .replace(/…/g, '...').replace(/[•·]/g, '·').replace(/[  ]/g, ' ')
      .replace(/[^\x00-\xff]/g, '');
  }

  function build(JsPDF, m) {
    const doc = new JsPDF({ unit: 'mm', format: 'a4', compress: true });
    const P = m.proyecto;
    doc.setProperties({ title: `Cotización ${m.cotizacion.numero} - ${P.nombre}`, subject: P.nombre, author: m.proveedor.nombre, creator: m.proveedor.nombre, keywords: 'cotización, tornería, sistema de gestión' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 18;
    const CW = W - M * 2;
    const TOP = 26;
    const BOTTOM = H - 20;
    const money = (v) => clean(m.money(v));
    let y = TOP;

    const font = (size, color = TEXT, style = 'normal') => { doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor(...color); };
    const lh = (size, k = 1.45) => size * 0.3528 * k;
    const newPage = () => { doc.addPage(); y = TOP; };
    const ensure = (h) => { if (y + h > BOTTOM) newPage(); };
    const linesOf = (text, size, width, style = 'normal') => { font(size, TEXT, style); return doc.splitTextToSize(clean(text), width); };

    function paragraph(text, { size = 10, color = TEXT, style = 'normal', width = CW, x = M, gap = 3 } = {}) {
      const lines = linesOf(text, size, width, style);
      font(size, color, style);
      lines.forEach((ln) => { ensure(lh(size)); doc.text(ln, x, y + lh(size) * 0.74); y += lh(size); });
      y += gap;
    }
    function bullets(items, { size = 9.8, width = CW, x = M, color = ACCENT, mark = 'dot' } = {}) {
      items.forEach((it) => {
        const lines = linesOf(it, size, width - 6);
        ensure(lh(size) * Math.min(lines.length, 3) + 1);
        if (mark === 'x') {
          doc.setDrawColor(...color); doc.setLineWidth(0.45);
          const cx = x + 1.4, cy = y + lh(size) * 0.48;
          doc.line(cx - 1, cy - 1, cx + 1, cy + 1); doc.line(cx - 1, cy + 1, cx + 1, cy - 1);
        } else { doc.setFillColor(...color); doc.rect(x + 0.5, y + lh(size) * 0.48 - 0.85, 1.7, 1.7, 'F'); }
        font(size, TEXT);
        lines.forEach((ln) => { ensure(lh(size)); doc.text(ln, x + 6, y + lh(size) * 0.74); y += lh(size); });
        y += 1.3;
      });
      y += 2;
    }
    let secNum = 0;
    function section(title, keep = 40) {
      ensure(keep);
      if (y > TOP + 1) y += 5;
      secNum += 1;
      doc.setFillColor(...ACCENT);
      doc.rect(M, y + 0.6, 9, 7, 'F');
      font(9.5, [255, 255, 255], 'bold');
      doc.text(String(secNum), M + 4.5, y + 5.4, { align: 'center' });
      font(14, INK, 'bold');
      doc.text(clean(title), M + 13, y + 6);
      doc.setDrawColor(...LINE); doc.setLineWidth(0.3);
      doc.line(M, y + 11, W - M, y + 11);
      y += 16;
    }
    function subheading(text, keep = 18) {
      ensure(keep);
      font(10.5, INK, 'bold');
      doc.text(clean(text), M, y + 4);
      y += 7.5;
    }
    const tableBase = {
      margin: { left: M, right: M, top: TOP, bottom: H - BOTTOM + 2 },
      styles: { font: 'helvetica', fontSize: 9.3, textColor: TEXT, cellPadding: { top: 2.6, bottom: 2.6, left: 3.2, right: 3.2 }, lineColor: LINE, lineWidth: 0.2, overflow: 'linebreak', valign: 'middle' },
      headStyles: { fillColor: STEEL, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.6 },
      footStyles: { fillColor: INK, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10.5 },
      alternateRowStyles: { fillColor: [250, 251, 252] },
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
      showFoot: 'lastPage'
    };
    /** Repinta en negrita la primera línea (el título) de las celdas de una columna, sobre su propio fondo. Requiere valign 'top'. */
    function boldFirstLine(col) {
      return (d) => {
        if (d.section !== 'body' || d.column.index !== col) return;
        const fill = Array.isArray(d.cell.styles.fillColor) ? d.cell.styles.fillColor : [255, 255, 255];
        const top = d.cell.y + d.cell.padding('top');
        const size = d.cell.styles.fontSize;
        doc.setFillColor(...fill);
        doc.rect(d.cell.x + 0.3, top - 0.3, d.cell.width - 0.6, size * 0.3528 * 1.15 - 0.1, 'F');
        font(size, INK, 'bold');
        doc.text(d.cell.text[0], d.cell.x + d.cell.padding('left'), top, { baseline: 'top' });
      };
    }
    function table(opts) {
      doc.autoTable(Object.assign({}, tableBase, { startY: y }, opts, { styles: Object.assign({}, tableBase.styles, opts.styles || {}) }));
      y = doc.lastAutoTable.finalY + 6;
    }

    // ================= PORTADA =================
    doc.setFillColor(...INK);
    doc.rect(0, 0, W, H, 'F');
    doc.setDrawColor(28, 35, 45); doc.setLineWidth(0.2);
    for (let gx = 10; gx < W; gx += 10) doc.line(gx, 0, gx, H);
    for (let gy = 10; gy < H; gy += 10) doc.line(0, gy, W, gy);
    doc.setFillColor(...ACCENT);
    doc.rect(0, H - 22, W, 2.2, 'F');
    // marca
    doc.setFillColor(...ACCENT);
    doc.roundedRect(M, 20, 12, 12, 2.5, 2.5, 'F');
    doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.8);
    doc.circle(M + 6, 26, 2.4, 'S');
    font(11, [255, 255, 255], 'bold');
    doc.text(clean(m.proveedor.nombre), M + 16, 25);
    font(8.2, [170, 180, 194]);
    doc.text(clean([m.proveedor.sitio, m.proveedor.correo, m.proveedor.telefono].filter((v) => !m.esPendiente(v)).join('  ·  ')), M + 16, 30);
    font(8.5, [170, 180, 194], 'bold');
    doc.text(clean(`COTIZACIÓN ${m.cotizacion.numero}`), W - M, 25, { align: 'right' });
    font(8.2, [170, 180, 194]);
    doc.text(clean(m.fechaEmisionTexto), W - M, 30, { align: 'right' });

    font(9.5, [255, 170, 120], 'bold');
    doc.text('PROPUESTA TÉCNICA Y ECONÓMICA', M, 104, { charSpace: 0.6 });
    font(27, [255, 255, 255], 'bold');
    let cy = 116;
    doc.splitTextToSize(clean(P.nombre), CW - 10).forEach((ln) => { doc.text(ln, M, cy); cy += 11; });
    font(11.5, [200, 208, 218]);
    cy += 1;
    doc.splitTextToSize(clean(P.tipo), CW).forEach((ln) => { doc.text(ln, M, cy); cy += 6; });

    // cifras clave
    const figs = [['INVERSIÓN TOTAL', money(m.total)], ['TIEMPO ESTIMADO', clean(m.plazoTexto)], ['MÓDULOS', `${m.modulos.length} integrados`]];
    const fw = (CW - 8) / 3;
    figs.forEach(([k, v], i) => {
      const fx = M + i * (fw + 4);
      doc.setFillColor(24, 31, 40); doc.setDrawColor(45, 55, 68); doc.setLineWidth(0.3);
      doc.roundedRect(fx, 196, fw, 26, 2, 2, 'FD');
      font(7.5, [150, 160, 175], 'bold'); doc.text(k, fx + 5, 204);
      font(15, i === 0 ? [255, 170, 120] : [255, 255, 255], 'bold'); doc.text(v, fx + 5, 214.5);
    });

    const pr = m.proveedor;

    // ================= CONTENIDO =================
    newPage();
    section('Resumen ejecutivo', 60);
    paragraph(`${m.proveedor.nombre} presenta esta propuesta para el desarrollo de un ${P.nombre.charAt(0).toLowerCase() + P.nombre.slice(1)}: ${P.tipo.toLowerCase()} que reúne en una sola plataforma la administración de todas las sucursales de la empresa.`);
    paragraph(P.descripcion);
    paragraph(`El sistema cubre ${m.modulos.length} módulos integrados: sucursales, usuarios y permisos, productos y materiales, compras, ventas y cotizaciones, inventarios, órdenes de trabajo, clientes, caja, dashboard, reportes y configuración. La inversión total es de ${m.money(m.total)}, con un plazo estimado de ${m.plazoTexto}.`);
    table({
      theme: 'plain',
      body: [[`INVERSIÓN TOTAL\n${money(m.total)}`, `TIEMPO ESTIMADO\n${clean(m.plazoTexto)}`, `FORMA DE PAGO\n${m.pagos.map((p) => `${p.porcentaje}%`).join(' / ')}`, `HOSTING\n${money(m.hosting.montoMensual)}/mes (${m.hosting.meses} meses)`, `MANTENIMIENTO\n${money(m.mantenimiento.montoMensual)}/mes (opcional)`]],
      styles: { fontSize: 9, textColor: INK, fillColor: SOFT, lineColor: [255, 255, 255], lineWidth: 1.2, cellPadding: 3.4, fontStyle: 'bold' }
    });

    section('Objetivos del sistema');
    bullets(m.config.objetivos);

    section('Alcance funcional');
    paragraph(`Se desarrollará una ${P.tipo.toLowerCase()}, accesible desde el navegador en computadoras, tabletas y teléfonos, con una base de datos central y acceso por usuario, rol y sucursal. El alcance comprende los módulos detallados en la sección siguiente y los entregables indicados a continuación.`);
    subheading('Entregables');
    bullets(m.config.entregables);
    ensure(14);
    doc.setFillColor(...ACCENT_SOFT); doc.roundedRect(M, y, CW, 10, 1.5, 1.5, 'F');
    font(9.2, [154, 61, 8], 'bold');
    doc.text(clean(`Facturación electrónica: ${m.config.facturacionElectronica.texto}`), M + 4, y + 6.3);
    y += 16;

    section('Módulos incluidos', 50);
    table({
      head: [['Módulo', 'Funcionalidades']],
      body: m.modulos.map((mod) => [
        `${String(mod.numero).padStart(2, '0')}. ${mod.nombre}\n${mod.resumen}`,
        mod.funciones.map((f) => `· ${f}`).join('\n') + (mod.nota ? `\n\nNota: ${mod.nota}` : '')
      ].map(clean)),
      columnStyles: { 0: { cellWidth: 72 }, 1: { fontSize: 8.8 } },
      styles: { valign: 'top' },
      didDrawCell: boldFirstLine(0)
    });

    section('Beneficios');
    table({
      theme: 'plain',
      body: m.config.beneficios.map((b) => [clean(b.titulo), clean(b.texto)]),
      columnStyles: { 0: { cellWidth: 62, fontStyle: 'bold', textColor: INK } },
      styles: { lineColor: LINE, lineWidth: { bottom: 0.2 } }
    });

    section('Inversión: tabla de precios', 70);
    table({
      head: [['#', 'Módulo / servicio', '% del total', 'Precio']],
      body: m.costos.map((c, i) => [String(i + 1).padStart(2, '0'), clean(c.concepto), `${(c.monto / m.total * 100).toFixed(1).replace('.', ',')} %`, money(c.monto)]),
      foot: [['', 'TOTAL', '100 %', money(m.total)]],
      columnStyles: { 0: { cellWidth: 12, textColor: MUTED }, 2: { halign: 'right', cellWidth: 28 }, 3: { halign: 'right', cellWidth: 34, fontStyle: 'bold', textColor: INK } },
      didParseCell: (d) => { if (d.section === 'foot' && d.column.index >= 2) d.cell.styles.halign = 'right'; if (d.section === 'head' && d.column.index >= 2) d.cell.styles.halign = 'right'; }
    });
    paragraph(m.config.notaCostos, { size: 8.8, color: MUTED });

    // caja de inversión total
    ensure(30);
    doc.setFillColor(...INK); doc.roundedRect(M, y, CW, 24, 2.5, 2.5, 'F');
    doc.setFillColor(...ACCENT); doc.rect(M, y, 2.2, 24, 'F');
    font(8, [170, 180, 194], 'bold'); doc.text('INVERSIÓN TOTAL DEL DESARROLLO', M + 8, y + 8.5);
    font(20, [255, 170, 120], 'bold'); doc.text(money(m.total), M + 8, y + 18);
    font(9, [200, 208, 218]);
    doc.text(clean(`${m.moneda.nombre} (${m.moneda.codigo})`), W - M - 6, y + 9, { align: 'right' });
    doc.text(clean(`Plazo estimado: ${m.plazoTexto}`), W - M - 6, y + 15, { align: 'right' });
    doc.text(clean(`Facturación electrónica: no incluida`), W - M - 6, y + 20, { align: 'right' });
    y += 30;

    section('Cronograma estimado', 80);
    table({
      head: [['#', 'Etapa', 'Escenario ' + m.semanas.min + ' sem.', 'Escenario ' + m.semanas.max + ' sem.']],
      body: m.cronograma.map((e, i) => [String(i + 1), `${e.etapa}\n${e.descripcion}`, rango(e.min), rango(e.max)].map(clean)),
      columnStyles: { 0: { cellWidth: 9, halign: 'center', fontStyle: 'bold' }, 2: { cellWidth: 30, halign: 'center' }, 3: { cellWidth: 30, halign: 'center' } },
      styles: { fontSize: 8.9, valign: 'top' },
      didParseCell: (d) => { if (d.section === 'head' && d.column.index >= 2) d.cell.styles.halign = 'center'; },
      didDrawCell: boldFirstLine(1)
    });
    gantt(m.cronograma, m.semanas.max, 'max');
    paragraph(m.config.notaCronograma, { size: 8.8, color: MUTED });

    function rango([a, b]) { return a === b ? `Semana ${a}` : `Semanas ${a} a ${b}`; }
    function gantt(etapas, total, key) {
      const rowH = 6.4;
      const labelW = 58;
      const h = 9 + etapas.length * rowH + 3;
      ensure(h + 8);
      font(8.5, INK, 'bold');
      doc.text(clean(`Diagrama del escenario de ${total} semanas`), M, y + 3);
      y += 6;
      const gx = M + labelW;
      const gw = CW - labelW;
      const cw = gw / total;
      font(7, MUTED, 'bold');
      for (let i = 0; i < total; i++) doc.text(`S${i + 1}`, gx + cw * i + cw / 2, y + 3, { align: 'center' });
      doc.setDrawColor(...LINE); doc.setLineWidth(0.2);
      for (let i = 0; i <= total; i++) doc.line(gx + cw * i, y + 4.5, gx + cw * i, y + 5 + etapas.length * rowH);
      etapas.forEach((e, i) => {
        const ry = y + 5 + i * rowH;
        font(8, TEXT);
        doc.text(clean(doc.splitTextToSize(clean(`${i + 1}. ${e.etapa}`), labelW - 3)[0]), M, ry + rowH * 0.66);
        const [a, b] = e[key];
        doc.setFillColor(...(i % 2 ? STEEL : ACCENT));
        doc.roundedRect(gx + cw * (a - 1) + 0.6, ry + 1.2, cw * (b - a + 1) - 1.2, rowH - 2.4, 1, 1, 'F');
      });
      y += 5 + etapas.length * rowH + 6;
    }

    section('Condiciones de pago', 50);
    table({
      head: [['Concepto', '%', 'Monto', 'Momento del pago']],
      body: m.pagos.map((p) => [clean(p.concepto), `${p.porcentaje} %`, money(p.monto), clean(p.momento)]),
      foot: [['Total', '100 %', money(m.total), '']],
      columnStyles: { 0: { cellWidth: 44, fontStyle: 'bold', textColor: INK }, 1: { cellWidth: 16, halign: 'center' }, 2: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: INK } },
      didParseCell: (d) => { if (d.column.index === 1) d.cell.styles.halign = 'center'; if (d.column.index === 2 && d.section !== 'body') d.cell.styles.halign = 'right'; }
    });

    subheading('Hosting');
    paragraph(m.hostingTexto);

    section('Mantenimiento opcional', 60);
    paragraph(`Una vez entregado el sistema, se ofrece un servicio de mantenimiento mensual opcional de ${m.money(m.mantenimiento.montoMensual)} por mes. Se contrata por separado del desarrollo y puede iniciarse o cancelarse de forma independiente.`);
    subheading('Incluye');
    bullets(m.mantenimiento.incluye);
    subheading('No incluye');
    bullets(m.mantenimiento.noIncluye, { color: MUTED });

    section('Exclusiones', 50);
    paragraph('La presente propuesta no incluye:', { gap: 2 });
    bullets(m.config.exclusiones, { mark: 'x', color: [208, 59, 59] });

    section('Condiciones comerciales', 50);
    bullets([m.hostingTexto, ...m.config.condicionesComerciales]);

    // ================= ENCABEZADO Y PIE =================
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      if (i > 1) {
        font(8, MUTED, 'bold');
        doc.text(clean(P.nombre), M, 13);
        font(8, MUTED);
        doc.text(clean(`Propuesta ${m.cotizacion.numero}`), W - M, 13, { align: 'right' });
        doc.setDrawColor(...ACCENT); doc.setLineWidth(0.6); doc.line(M, 16, M + 16, 16);
        doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.line(M + 16, 16, W - M, 16);
      }
      // la portada es oscura: sin línea y con texto claro
      if (i > 1) { doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.line(M, H - 13, W - M, H - 13); }
      font(7.8, i > 1 ? MUTED : [150, 160, 175]);
      doc.text(clean(`${pr.nombre} · ${[pr.sitio, pr.correo].filter((v) => !m.esPendiente(v)).join(' · ')}`), M, H - 8.5);
      doc.text(`Página ${i} de ${pages}`, W - M, H - 8.5, { align: 'right' });
    }
    return doc;
  }

  function fileName(m) {
    return `Cotizacion-${m.cotizacion.numero}-Sistema-Gestion-Torneria.pdf`;
  }

  async function create(m) { const JsPDF = await ensureLib(); return build(JsPDF, m); }
  async function download(m) {
    const doc = await create(m);
    const name = fileName(m);
    doc.save(name);
    return name;
  }

  TOR.pdf = { create, download, fileName };
})(window);
