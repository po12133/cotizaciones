/*
 * Exportación de la cotización a PDF vectorial con jsPDF + AutoTable (incluidos en assets/vendor,
 * funcionan sin conexión). Las tablas gestionan los saltos de página; los textos libres usan
 * ensureSpace() para no cortarse entre páginas.
 */
(function (root) {
  const WAB = root.WAB;
  const VENDOR = ['assets/vendor/jspdf.umd.min.js', 'assets/vendor/jspdf.plugin.autotable.min.js'];

  const BRAND = [12, 148, 103];
  const INK = [11, 18, 32];
  const TEXT = [63, 75, 94];
  const MUTED = [102, 112, 133];
  const LINE = [227, 231, 237];
  const SOFT = [242, 244, 247];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
      document.head.appendChild(s);
    });
  }
  async function ensureLib() {
    if (!(root.jspdf && root.jspdf.jsPDF)) await loadScript(VENDOR[0]);
    const probe = new root.jspdf.jsPDF();
    if (typeof probe.autoTable !== 'function') await loadScript(VENDOR[1]);
    return root.jspdf.jsPDF;
  }

  // Las fuentes estándar de PDF usan WinAnsi: se normalizan los caracteres fuera de Latin-1.
  function clean(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/[—–−]/g, '-')
      .replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
      .replace(/…/g, '...').replace(/•/g, '-').replace(/ | /g, ' ')
      .replace(/[^\x00-\xff]/g, '');
  }

  function build(JsPDF, m) {
    const { fmt } = WAB.ui;
    const money = (v) => clean(v < 0 ? `- ${fmt.money(-v)}` : fmt.money(v));
    const doc = new JsPDF({ unit: 'mm', format: 'a4', compress: true });
    doc.setProperties({ title: `Cotización ${m.numero}`, subject: m.empresa.productoLargo, author: m.empresa.nombre, creator: m.empresa.nombre });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 16;
    const CW = W - M * 2;
    const BOTTOM = H - 18;
    let y = M;

    const setText = (size, color = TEXT, style = 'normal') => { doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor(...color); };
    const ensureSpace = (h) => { if (y + h > BOTTOM) { doc.addPage(); y = M + 4; } };
    const lineH = (size) => size * 0.3528 * 1.42;

    function paragraph(text, { size = 9.5, color = TEXT, style = 'normal', width = CW, x = M, gap = 2.2 } = {}) {
      setText(size, color, style);
      const lines = doc.splitTextToSize(clean(text), width);
      lines.forEach((ln) => { ensureSpace(lineH(size)); doc.text(ln, x, y + lineH(size) * 0.75); y += lineH(size); });
      y += gap;
    }
    function heading(text, { size = 12, keep = 22 } = {}) {
      ensureSpace(keep);
      y += 3;
      setText(size, INK, 'bold');
      doc.text(clean(text), M, y + 4);
      doc.setDrawColor(...BRAND); doc.setLineWidth(0.6);
      doc.line(M, y + 6.4, M + 14, y + 6.4);
      y += 10;
    }
    function bullets(items, { size = 9.2, width = CW, x = M } = {}) {
      items.forEach((it) => {
        setText(size, TEXT);
        const lines = doc.splitTextToSize(clean(it), width - 5);
        ensureSpace(lineH(size) * Math.min(lines.length, 3));
        doc.setFillColor(...BRAND);
        doc.circle(x + 1.2, y + lineH(size) * 0.5, 0.75, 'F');
        lines.forEach((ln) => { ensureSpace(lineH(size)); doc.text(ln, x + 5, y + lineH(size) * 0.75); y += lineH(size); });
        y += 1.1;
      });
      y += 1.5;
    }
    const tableBase = {
      margin: { left: M, right: M, top: M + 4, bottom: 20 },
      styles: { font: 'helvetica', fontSize: 9, textColor: TEXT, cellPadding: { top: 2.4, bottom: 2.4, left: 3, right: 3 }, lineColor: LINE, lineWidth: 0.2, overflow: 'linebreak' },
      headStyles: { fillColor: INK, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      alternateRowStyles: { fillColor: [250, 251, 252] },
      rowPageBreak: 'avoid'
    };
    const table = (opts) => { doc.autoTable(Object.assign({}, tableBase, { startY: y }, opts)); y = doc.lastAutoTable.finalY + 6; };

    // ---- Encabezado ----
    doc.setFillColor(...INK);
    doc.rect(0, 0, W, 34, 'F');
    doc.setFillColor(...BRAND);
    doc.roundedRect(M, 9, 16, 16, 3.5, 3.5, 'F');
    setText(10.5, [255, 255, 255], 'bold');
    doc.text('AS', M + 8, 19.2, { align: 'center' });
    setText(13, [255, 255, 255], 'bold');
    doc.text(clean(m.empresa.nombre), M + 21, 15.5);
    setText(8.2, [169, 180, 198]);
    doc.text(clean(`${m.empresa.sitio}  ·  ${m.empresa.correo}  ·  ${m.empresa.telefono}`), M + 21, 21.5);
    setText(8, [124, 231, 192], 'bold');
    doc.text('COTIZACIÓN', W - M, 12.5, { align: 'right' });
    setText(11.5, [255, 255, 255], 'bold');
    doc.text(clean(m.numero), W - M, 18.5, { align: 'right' });
    setText(8, [169, 180, 198]);
    doc.text(clean(`Emitida: ${fmt.date(m.fecha, 'long')}`), W - M, 23.5, { align: 'right' });
    doc.text(clean(`Válida hasta: ${fmt.date(m.validoHasta, 'long')}`), W - M, 27.8, { align: 'right' });
    y = 44;

    setText(17, INK, 'bold');
    doc.splitTextToSize(clean(m.empresa.productoLargo), CW).forEach((ln) => { doc.text(ln, M, y); y += 7.2; });
    y += 1;

    // ---- Cliente ----
    const boxH = 22;
    doc.setFillColor(...SOFT); doc.setDrawColor(...LINE);
    doc.roundedRect(M, y, CW, boxH, 2.5, 2.5, 'FD');
    const cols = [['Cliente', m.cliente.nombre], ['Empresa', m.cliente.empresa], ['Teléfono', m.cliente.telefono], ['Correo', m.cliente.correo]];
    cols.forEach(([k, v], i) => {
      const cx = M + 5 + (i % 2) * (CW / 2);
      const cy = y + 7 + Math.floor(i / 2) * 9;
      setText(7.2, MUTED, 'bold'); doc.text(clean(k.toUpperCase()), cx, cy);
      setText(9.6, INK, 'bold'); doc.text(clean(doc.splitTextToSize(clean(v || '-'), CW / 2 - 10)[0]), cx, cy + 4.2);
    });
    y += boxH + 6;

    // ---- Resumen ----
    heading('Resumen ejecutivo');
    m.resumen.forEach((p) => paragraph(p, { size: 9.8 }));
    table({
      theme: 'plain',
      body: [m.parametros.map(([k, v]) => `${k.toUpperCase()}\n${v}`)],
      styles: Object.assign({}, tableBase.styles, { fontSize: 8.6, textColor: INK, fillColor: SOFT, lineColor: [255, 255, 255], lineWidth: 1 }),
      didParseCell: (d) => { d.cell.styles.fontStyle = 'bold'; }
    });

    // ---- Módulos ----
    heading('Módulos y costos');
    const body = m.items.map((i) => [i.codigo, i.nota ? `${i.nombre}\n${i.nota}` : i.nombre, money(i.implementacion), money(i.mensual)]);
    m.mensualRows.slice(1).forEach((r) => body.push(['', r.label, '-', money(r.value)]));
    m.adicionales.forEach((a) => body.push(['ADIC', `${a.descripcion}\nServicio adicional`, a.tipo === 'unico' ? money(a.monto) : '-', a.tipo === 'mensual' ? money(a.monto) : '-']));
    table({
      head: [['Código', 'Módulo', 'Implementación', 'Mensual']],
      body: body.map((r) => r.map(clean)),
      columnStyles: { 0: { cellWidth: 17, fontStyle: 'bold', textColor: MUTED }, 2: { halign: 'right', cellWidth: 32 }, 3: { halign: 'right', cellWidth: 28 } },
      didParseCell: (d) => { if (d.section === 'head' && d.column.index >= 2) d.cell.styles.halign = 'right'; }
    });

    // ---- Totales ----
    heading('Resumen de inversión', { keep: 22 + m.totales.length * 7.5 });
    table({
      theme: 'plain',
      margin: Object.assign({}, tableBase.margin, { left: M + CW * 0.36 }),
      body: m.totales.map((t) => [clean(t.note ? `${t.label}\n${t.note}` : t.label), money(t.value)]),
      columnStyles: { 1: { halign: 'right', cellWidth: 34, fontStyle: 'bold', textColor: INK } },
      styles: Object.assign({}, tableBase.styles, { lineWidth: { bottom: 0.2 }, lineColor: LINE }),
      didParseCell: (d) => {
        const t = m.totales[d.row.index];
        if (t && t.strong) { d.cell.styles.fillColor = BRAND; d.cell.styles.textColor = [255, 255, 255]; d.cell.styles.fontStyle = 'bold'; d.cell.styles.fontSize = 10.5; }
      }
    });
    if (m.aMedida) paragraph('El volumen de contactos supera los 20.000 mensuales: el recargo por volumen se cotiza a medida y no está incluido.', { size: 8.8, color: [178, 94, 9] });

    // ---- Alcance ----
    heading('Alcance por módulo');
    m.alcance.forEach((a) => {
      const half = Math.ceil(a.features.length / 2);
      const rows = [];
      for (let i = 0; i < half; i++) rows.push([`- ${a.features[i]}`, a.features[i + half] ? `- ${a.features[i + half]}` : '']);
      ensureSpace(22 + rows.length * 5.6 + (a.descripcion.length > 95 ? 5 : 0));
      table({
        theme: 'plain',
        columnStyles: { 0: { cellWidth: CW / 2 }, 1: { cellWidth: CW / 2 } },
        head: [[{ content: clean(`${a.codigo}  ${a.nombre}`), colSpan: 2 }], [{ content: clean(`${a.descripcion} Plazo de referencia: ${a.dias} días hábiles.`), colSpan: 2 }]],
        body: rows.map((r) => r.map(clean)),
        showHead: 'firstPage',
        styles: Object.assign({}, tableBase.styles, { fontSize: 8.6, cellPadding: { top: 1.1, bottom: 1.1, left: 3, right: 3 }, lineWidth: 0 }),
        didParseCell: (d) => {
          if (d.section !== 'head') return;
          if (d.row.index === 0) { d.cell.styles.fillColor = SOFT; d.cell.styles.textColor = INK; d.cell.styles.fontStyle = 'bold'; d.cell.styles.fontSize = 9.6; d.cell.styles.cellPadding = { top: 2.6, bottom: 1.6, left: 3, right: 3 }; }
          else { d.cell.styles.fillColor = false; d.cell.styles.textColor = TEXT; d.cell.styles.fontStyle = 'normal'; d.cell.styles.fontSize = 8.8; d.cell.styles.cellPadding = { top: 1.6, bottom: 1.6, left: 3, right: 3 }; }
        }
      });
      y -= 2;
    });
    y += 2;

    // ---- Costos externos ----
    heading('Costos externos no incluidos');
    paragraph('Se facturan directamente por cada proveedor según el consumo del cliente. No se suman al total de esta cotización.', { size: 8.8, color: MUTED });
    table({
      head: [['Servicio', 'Detalle']],
      body: m.costosExternos.map((c) => [clean(c.nombre), clean(c.detalle)]),
      columnStyles: { 0: { cellWidth: 52, fontStyle: 'bold', textColor: INK } },
      headStyles: Object.assign({}, tableBase.headStyles, { fillColor: [178, 94, 9] })
    });

    // ---- Condiciones ----
    [['Condiciones de pago', m.condicionesPago], ['Soporte y mantenimiento', m.soporte], ['Límites de uso', m.limites], ['Políticas de renovación', m.renovacion], ['Exclusiones', m.exclusiones]]
      .forEach(([t, items]) => { heading(t); bullets(items); });

    if (m.observaciones) { heading('Observaciones'); paragraph(m.observaciones); }

    heading('Vigencia');
    paragraph(`Esta cotización tiene una validez de ${m.validez} días calendario, hasta el ${fmt.date(m.validoHasta, 'long')}. Los importes son referenciales, están expresados en bolivianos (Bs) y pueden ajustarse tras el diagnóstico inicial. Los prototipos mostrados en la presentación son demostraciones con datos ficticios.`);

    // ---- Firmas y contacto ----
    ensureSpace(42);
    y += 14;
    doc.setDrawColor(...MUTED); doc.setLineWidth(0.3);
    const sw = CW / 2 - 10;
    doc.line(M, y, M + sw, y);
    doc.line(M + CW - sw, y, M + CW, y);
    setText(8.6, INK, 'bold');
    doc.text(clean(m.empresa.nombre), M, y + 5);
    doc.text(clean(m.cliente.empresa || m.cliente.nombre || 'Cliente'), M + CW - sw, y + 5);
    setText(8, MUTED);
    doc.text(clean(`${m.empresa.correo} · ${m.empresa.telefono}`), M, y + 9.5);
    doc.text('Aceptación de la propuesta', M + CW - sw, y + 9.5);
    y += 14;

    // ---- Pie en todas las páginas ----
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setDrawColor(...LINE); doc.setLineWidth(0.3);
      doc.line(M, H - 12, W - M, H - 12);
      setText(7.4, MUTED);
      doc.text(clean(`${m.empresa.nombre} · ${m.empresa.sitio} · ${m.numero}`), M, H - 7.5);
      doc.text(`Página ${p} de ${pages}`, W - M, H - 7.5, { align: 'right' });
    }
    return doc;
  }

  async function exportQuote(model, { save = true } = {}) {
    const JsPDF = await ensureLib();
    const doc = build(JsPDF, model);
    root.__lastPdf = doc;
    if (save) doc.save(`${model.numero}.pdf`);
    return doc;
  }

  WAB.pdf = { exportQuote, ensureLib };
})(window);
