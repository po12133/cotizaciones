/*
 * PDF generados en el navegador con jsPDF (copia local en js/vendor): boleta de venta y reportes.
 * La boleta es un comprobante comercial de demostración, no una factura fiscal.
 */
(function (root) {
  const MF = (root.MF = root.MF || {});
  const CFG = root.MF_CONFIG;
  const bs = (n) => 'Bs ' + MF.num(Math.round(n || 0));
  let logoCache = null;

  function jsPDFCtor() {
    const J = root.jspdf && root.jspdf.jsPDF;
    if (!J) throw new Error('No se pudo cargar el generador de PDF.');
    return J;
  }
  /** Logo de la tienda como dataURL (se usa en la boleta). */
  function logo() {
    if (logoCache !== null) return Promise.resolve(logoCache);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = 160; c.height = 160;
        c.getContext('2d').drawImage(img, 0, 0, 160, 160);
        try { logoCache = c.toDataURL('image/png'); } catch (e) { logoCache = ''; }
        resolve(logoCache);
      };
      img.onerror = () => { logoCache = ''; resolve(''); };
      img.src = CFG.store.logo;
    });
  }
  const payLabel = (s) => (MF.PAY[s.method] || s.method) + (s.methodNote ? ` (${s.methodNote})` : '');

  /** Boleta de venta en formato ticket (80 mm). Devuelve el documento jsPDF. */
  async function boleta(s) {
    const J = jsPDFCtor();
    const lines = s.items.length * 2 + (s.items.filter((i) => i.discount).length);
    const h = 120 + lines * 5 + (s.discountTotal ? 10 : 0);
    const doc = new J({ unit: 'mm', format: [80, h] });
    const W = 80, L = 6, R = W - 6;
    let y = 8;
    const img = await logo();
    if (img) { doc.addImage(img, 'PNG', W / 2 - 8, y, 16, 16); y += 19; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text(CFG.store.fullName || CFG.store.name, W / 2, y, { align: 'center' }); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text(MF.branchName(s.branchId), W / 2, y, { align: 'center' }); y += 6;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text(`BOLETA DE VENTA N° ${s.number}`, W / 2, y, { align: 'center' }); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text(MF.fdate(s.date, true), W / 2, y, { align: 'center' }); y += 4;
    const hr = () => { doc.setDrawColor(180); doc.setLineDashPattern([1, 1], 0); doc.line(L, y, R, y); doc.setLineDashPattern([], 0); y += 4; };
    hr();
    doc.setFontSize(8.5);
    s.items.forEach((i) => {
      const name = doc.splitTextToSize(`${i.name} (${i.size}${i.color ? ' · ' + i.color : ''})`, R - L);
      doc.text(name, L, y); y += name.length * 3.8;
      doc.text(`${i.qty} x ${bs(i.price)}`, L + 2, y);
      doc.text(bs(i.price * i.qty), R, y, { align: 'right' }); y += 4;
      if (i.discount) { doc.setTextColor(150, 40, 70); doc.text('Descuento prenda', L + 2, y); doc.text('- ' + bs(i.discount), R, y, { align: 'right' }); doc.setTextColor(0); y += 4; }
    });
    hr();
    const row = (a, b, bold) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.text(a, L, y); doc.text(b, R, y, { align: 'right' }); y += bold ? 6 : 4.5; };
    row('Subtotal', bs(s.subtotal));
    if (s.lineDiscount) row('Descuentos por prenda', '- ' + bs(s.lineDiscount));
    if (s.discount) row('Descuento general', '- ' + bs(s.discount));
    doc.setFontSize(11); row('TOTAL', bs(s.total), true); doc.setFontSize(8.5);
    row('Método de pago', payLabel(s));
    if (s.received) row('Recibido / cambio', `${bs(s.received)} / ${bs(s.received - s.total)}`);
    if (s.status !== 'completada') { doc.setFont('helvetica', 'bold'); doc.setTextColor(180, 0, 0); doc.text(s.status === 'devuelta' ? 'DEVUELTA' : 'ANULADA', W / 2, y + 2, { align: 'center' }); doc.setTextColor(0); y += 7; }
    hr();
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text('¡Gracias por tu compra!', W / 2, y, { align: 'center' }); y += 4;
    doc.setFontSize(6.5); doc.setTextColor(110);
    doc.text(doc.splitTextToSize('Comprobante comercial, no es una factura fiscal. Generado con ModaFlow (demostración).', R - L), W / 2, y, { align: 'center' });
    return doc;
  }
  async function downloadBoleta(s) {
    const doc = await boleta(s);
    doc.save(`boleta-${s.number}.pdf`);
  }

  /**
   * Reporte en A4. o: { title, period, summary: [[label, value]], sections: [{ title, head, body }] }
   */
  function report(o) {
    const J = jsPDFCtor();
    const doc = new J({ unit: 'mm', format: 'a4' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
    doc.text(o.title, 14, 18);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`${CFG.store.name} · ${o.period} · generado el ${MF.fdate(new Date(), true)}`, 14, 25);
    doc.setTextColor(0);
    let y = 32;
    if (o.summary && o.summary.length) {
      doc.autoTable({ startY: y, head: [['Indicador', 'Valor']], body: o.summary, theme: 'grid', headStyles: { fillColor: [232, 69, 126] }, styles: { fontSize: 9 }, columnStyles: { 1: { halign: 'right' } }, margin: { left: 14, right: 14 } });
      y = doc.lastAutoTable.finalY + 8;
    }
    (o.sections || []).forEach((sec) => {
      if (!sec.body.length) return;
      if (y > 260) { doc.addPage(); y = 18; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(sec.title, 14, y); y += 3;
      doc.autoTable({ startY: y, head: [sec.head], body: sec.body, theme: 'striped', headStyles: { fillColor: [108, 76, 245] }, styles: { fontSize: 8.5 }, margin: { left: 14, right: 14 } });
      y = doc.lastAutoTable.finalY + 8;
    });
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(130); doc.text(`Reporte de demostración generado con ModaFlow · página ${i} de ${pages}`, 14, 290); }
    return doc;
  }

  MF.PDF = { boleta, downloadBoleta, report };
})(window);
