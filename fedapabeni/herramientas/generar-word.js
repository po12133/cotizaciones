/*
 * Genera la cotización en Word (.docx) a partir de ../datos.json y de los textos de ../js/cotizacion.js.
 * Uso:  cd herramientas && npm install && npm run word
 * Salida: ../cotizacion-fedapabeni-amicornios-soft.docx
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {
  Document, Packer, Paragraph, TextRun, ExternalHyperlink, Table, TableRow, TableCell, WidthType, ShadingType,
  AlignmentType, HeadingLevel, BorderStyle, LevelFormat, Header, Footer, PageNumber, ImageRun, PageBreak,
  TableLayoutType, VerticalAlign, PositionalTab, PositionalTabAlignment, PositionalTabRelativeTo, PositionalTabLeader,
} = require('docx');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'cotizacion-fedapabeni-amicornios-soft.docx');

/* ================= datos ================= */
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'datos.json'), 'utf8'));
const src = fs.readFileSync(path.join(ROOT, 'js', 'cotizacion.js'), 'utf8');

// Los textos fijos (módulos, TDR, experiencia…) se leen de cotizacion.js para no duplicarlos.
function grab(name) {
  const m = src.match(new RegExp('const ' + name + ' = ([\\[{][\\s\\S]*?\\n  [\\]}]);'));
  if (!m) throw new Error('No se encontró ' + name + ' en cotizacion.js');
  return vm.runInNewContext('(' + m[1] + ')');
}
function grabFn(re) {
  const m = src.match(re);
  if (!m) throw new Error('No se encontró ' + re + ' en cotizacion.js');
  return m[1];
}
const helpers = vm.runInNewContext(
  grabFn(/(function money[\s\S]*?\n  \})/) + '\n' +
  grabFn(/(const U = \[[\s\S]*?function totalWords[\s\S]*?\n  \})/) + '\n' +
  grabFn(/(function isoDate[\s\S]*?\n  \})/) + '\n' +
  '({ money: money, totalWords: totalWords, isoDate: isoDate })'
);
const { money, totalWords, isoDate } = helpers;

const MODULES = grab('MODULES');
const METHOD = grab('METHOD');
const HIGHLIGHTS = grab('HIGHLIGHTS');
const EXPERIENCE = grab('EXPERIENCE');
const TEAM = grab('TEAM');
const REFS = grab('REFS');
const COMPONENTS = grab('COMPONENTS');

const F = data.campos;
const PLAZO = {
  days: Number(data.plazo.diasCalendario) || 0,
  max: Number(data.plazo.maximoTdr) || 0,
  warranty: Number(data.plazo.garantiaDias) || 0,
  hosting: Number(data.plazo.hostingMeses) || 0,
  start: isoDate(data.plazo.fechaInicio),
};
const CEILING = Number(data.techo) || 0;
const BUDGET = data.presupuesto.items.map(function (b) { return Object.assign({}, b, { monto: Number(b.monto) || 0 }); });
const GROUPS = data.presupuesto.grupos;
const PHASES = data.fases;
const p1 = { s: PHASES[0].inicio, e: PHASES[0].fin };
const TDR = vm.runInNewContext('(' + grabFn(/TDR = (\[\n[\s\S]*?\n    \]);/) + ')', { p1: p1, PLAZO: PLAZO });

const TOTAL = BUDGET.reduce(function (s, b) { return s + b.monto; }, 0);
const pct = function (v) { return (TOTAL ? (v / TOTAL * 100).toFixed(1).replace('.', ',') : '0,0') + ' %'; };

// Enlaces: el prototipo publicado y, a partir de él, la base pública de la cotización.
const PROTO = F.prototypeUrl || '';
const BASE = PROTO ? PROTO.replace(/prototipo\/(index\.html)?(#.*)?$/, '') : '';
const ADMIN = BASE ? BASE + 'prototipo/admin/index.html' : '';
const abs = function (u) { return /^(https?:|mailto:)/.test(u) ? u : (BASE ? BASE + u : u); };

function addDays(iso, d) { const dt = new Date(iso + 'T12:00:00'); dt.setDate(dt.getDate() + d); return dt; }
function fmtShort(dt) { return dt.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }).replace('.', ''); }
function fmtLong(dt) { return dt.toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
const dayLabel = function (d) { return PLAZO.start ? fmtShort(addDays(PLAZO.start, d - 1)) : 'Día ' + d; };
const val = function (k) { return F[k] || '[Por completar]'; };

/* ================= estilo ================= */
const C = { verde: '0F3324', verde7: '1C5A3D', verde5: '2F8A52', verde1: 'E7F2EA', verde2: 'CFE6D6', oro: 'C9A227', oro1: 'F8EFCF', tierra: 'A06A3E', ink: '17251D', muted: '5B685F', line: 'E3DCCB', crema: 'F7F2E7' };
const FONT = 'Calibri';
const PAGE_W = 11906; // A4
const MARGIN = 1134; // 2 cm
const CW = PAGE_W - MARGIN * 2; // ancho útil

/* ================= ayudantes ================= */
// Texto con **negritas** en línea.
function runs(text, o) {
  o = o || {};
  return String(text).split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(function (part) {
    const b = /^\*\*.*\*\*$/.test(part);
    return new TextRun(Object.assign({ text: b ? part.slice(2, -2) : part, bold: b || o.bold, font: FONT }, o.run || {}, o.color ? { color: o.color } : {}, o.size ? { size: o.size } : {}, o.italics ? { italics: true } : {}));
  });
}
function link(text, url, o) {
  o = o || {};
  return new ExternalHyperlink({ link: url, children: [new TextRun({ text: text, style: 'Hyperlink', font: FONT, bold: o.bold, size: o.size })] });
}
function P(content, o) {
  o = o || {};
  const children = Array.isArray(content) ? content : runs(content, o);
  return new Paragraph(Object.assign({ children: children, spacing: { after: o.after == null ? 120 : o.after, before: o.before || 0, line: 276 } }, o.align ? { alignment: o.align } : {}, o.keepNext ? { keepNext: true } : {}));
}
function small(text) { return P(text, { size: 18, color: C.muted, italics: false }); }
function bullets(items, o) {
  return items.map(function (t) {
    return new Paragraph({ children: Array.isArray(t) ? t : runs(t, o), numbering: { reference: 'bul', level: 0 }, spacing: { after: 60, line: 264 } });
  });
}
function H1(num, eyebrow, title) {
  return [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({ children: [new TextRun({ text: (num ? num + ' · ' : '') + eyebrow.toUpperCase(), bold: true, color: C.oro, size: 18, font: FONT, characterSpacing: 20 })], spacing: { after: 40 }, keepNext: true }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: title, font: FONT })], keepNext: true }),
  ];
}
function H2(title) { return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: title, font: FONT })], keepNext: true }); }

const border = { style: BorderStyle.SINGLE, size: 4, color: C.line };
const borders = { top: border, bottom: border, left: border, right: border };
function cell(content, w, o) {
  o = o || {};
  const paras = (Array.isArray(content) && content.length && content[0] instanceof Paragraph) ? content
    : [new Paragraph({ children: Array.isArray(content) ? content : runs(content, { bold: o.bold, color: o.color, size: o.size || 19 }), alignment: o.align, spacing: { after: 0, line: 252 } })];
  return new TableCell({
    children: paras, width: { size: w, type: WidthType.DXA }, borders: borders, columnSpan: o.span,
    verticalAlign: VerticalAlign.CENTER,
    shading: o.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: o.fill } : undefined,
    margins: { top: 70, bottom: 70, left: 100, right: 100 },
  });
}
// Tabla con encabezado verde. rows: arreglos de celdas (texto o {t, bold, fill, align, span}).
function table(widths, head, rows, o) {
  o = o || {};
  const R = [];
  if (head) R.push(new TableRow({ tableHeader: true, children: head.map(function (h, i) { return cell(h, widths[i], { bold: true, color: 'FFFFFF', fill: C.verde, align: o.alignHead && o.alignHead[i] }); }) }));
  rows.forEach(function (r, ri) {
    let col = 0;
    R.push(new TableRow({
      cantSplit: true,
      children: r.map(function (c) {
        const spec = (c && typeof c === 'object' && !Array.isArray(c) && !(c instanceof Paragraph) && 't' in c) ? c : { t: c };
        const span = spec.span || 1;
        const w = widths.slice(col, col + span).reduce(function (a, b) { return a + b; }, 0);
        const align = spec.align || (o.align && o.align[col]);
        col += span;
        return cell(spec.t, w, { bold: spec.bold, fill: spec.fill || (o.zebra && ri % 2 ? C.crema : undefined), align: align, span: span > 1 ? span : undefined, color: spec.color, size: spec.size });
      }),
    }));
  });
  return new Table({ width: { size: widths.reduce(function (a, b) { return a + b; }, 0), type: WidthType.DXA }, columnWidths: widths, rows: R, layout: TableLayoutType.FIXED });
}
// Recuadro de una sola celda (llamadas de atención).
function box(children, fill) {
  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: [CW], layout: TableLayoutType.FIXED,
    rows: [new TableRow({ children: [new TableCell({ children: children, width: { size: CW, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: 'auto', fill: fill || C.oro1 }, borders: { top: { style: BorderStyle.SINGLE, size: 4, color: 'EAD79A' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'EAD79A' }, left: { style: BorderStyle.SINGLE, size: 24, color: C.oro }, right: { style: BorderStyle.SINGLE, size: 4, color: 'EAD79A' } }, margins: { top: 140, bottom: 100, left: 220, right: 220 } })] })],
  });
}
const spacer = function (after) { return new Paragraph({ children: [], spacing: { after: after || 120 } }); };
function image(file, w, h) {
  const p = path.join(ROOT, 'assets', 'images', file);
  if (!fs.existsSync(p)) return null;
  return new ImageRun({ type: 'jpg', data: fs.readFileSync(p), transformation: { width: w, height: h } });
}

/* ================= contenido ================= */
const body = [];

// ---------- Portada ----------
body.push(
  new Paragraph({ children: [new TextRun({ text: 'PROPUESTA TÉCNICA Y ECONÓMICA', bold: true, color: C.oro, size: 20, font: FONT, characterSpacing: 30 })], spacing: { before: 1200, after: 120 } }),
  new Paragraph({ children: [new TextRun({ text: 'Cotización N.º ' + val('quoteNo'), color: C.muted, size: 20, font: FONT })], spacing: { after: 600 } }),
  new Paragraph({ children: [new TextRun({ text: 'Consultoría por producto · Convocatoria IPHAE – FEDAPABENI', color: C.verde5, bold: true, size: 22, font: FONT })], spacing: { after: 200 } }),
  new Paragraph({ children: [new TextRun({ text: 'Diseño, desarrollo e implementación de la plataforma web comercial de FEDAPABENI', bold: true, color: C.verde, size: 52, font: FONT })], spacing: { after: 300, line: 300 } }),
  P('Una herramienta institucional, comercial y de articulación de mercados para visibilizar a las asociaciones y emprendimientos amazónicos del norte de Bolivia y conectar su oferta con compradores.', { size: 24, color: C.muted, after: 600 }),
  table([CW / 2, CW / 2], null, [
    [{ t: [new Paragraph({ children: [new TextRun({ text: 'Empresa proponente', size: 17, color: C.muted, font: FONT })] }), new Paragraph({ children: [new TextRun({ text: val('companyName'), bold: true, size: 24, font: FONT })] })] },
      { t: [new Paragraph({ children: [new TextRun({ text: 'Fecha de elaboración', size: 17, color: C.muted, font: FONT })] }), new Paragraph({ children: [new TextRun({ text: val('date'), bold: true, size: 24, font: FONT })] })] }],
    [{ t: [new Paragraph({ children: [new TextRun({ text: 'Cliente', size: 17, color: C.muted, font: FONT })] }), new Paragraph({ children: [new TextRun({ text: 'FEDAPABENI', bold: true, size: 24, font: FONT })] })] },
      { t: [new Paragraph({ children: [new TextRun({ text: 'Institución contratante', size: 17, color: C.muted, font: FONT })] }), new Paragraph({ children: [new TextRun({ text: 'IPHAE', bold: true, size: 24, font: FONT })] })] }],
    [{ fill: C.verde1, t: [new Paragraph({ children: [new TextRun({ text: 'Presupuesto total', size: 17, color: C.verde7, font: FONT })] }), new Paragraph({ children: [new TextRun({ text: money(TOTAL), bold: true, size: 28, color: C.verde, font: FONT })] })] },
      { fill: C.verde1, t: [new Paragraph({ children: [new TextRun({ text: 'Plazo de ejecución', size: 17, color: C.verde7, font: FONT })] }), new Paragraph({ children: [new TextRun({ text: PLAZO.days + ' días calendario', bold: true, size: 28, color: C.verde, font: FONT })] })] }],
  ]),
  spacer(400),
);
if (PROTO) {
  body.push(box([
    P([new TextRun({ text: 'Prototipo interactivo: ', bold: true, font: FONT }), link(PROTO, PROTO)], { after: 60 }),
    P([new TextRun({ text: 'Panel administrativo (demo): ', bold: true, font: FONT }), link(ADMIN, ADMIN)], { after: 0 }),
  ], C.verde1));
}
body.push(spacer(300), P([
  new TextRun({ text: val('companyName') + ' · ', bold: true, font: FONT, color: C.verde }),
  link(val('companyEmail'), 'mailto:' + F.companyEmail), new TextRun({ text: ' · ' + val('companyPhone') + ' · ', font: FONT }),
  link('soft.amicornios.com', 'https://soft.amicornios.com/'),
], { size: 19 }));

// ---------- Carta ----------
body.push(...H1('00', 'Presentación', 'Carta de presentación'));
body.push(
  P(val('companyCity') + ', ' + val('date'), { color: C.muted }),
  new Paragraph({ children: [new TextRun({ text: 'Señores', font: FONT }), new TextRun({ text: 'Instituto para el Hombre, Agricultura y Ecología – IPHAE', bold: true, break: 1, font: FONT }), new TextRun({ text: 'En coordinación con la ', break: 1, font: FONT }), new TextRun({ text: 'Federación Departamental de Asociaciones de Productores Agroforestales del Beni – FEDAPABENI', bold: true, font: FONT }), new TextRun({ text: 'Riberalta, Beni', break: 1, font: FONT })], spacing: { after: 200 } }),
  P('**Ref.: Propuesta técnica y económica — Consultoría por producto para el diseño, desarrollo e implementación de una página web comercial para FEDAPABENI.**', { after: 200 }),
  P('De nuestra consideración:'),
  P('Mediante la presente, **' + val('companyName') + '** presenta su propuesta técnica y económica para la consultoría de referencia, en conformidad con los Términos de Referencia publicados por IPHAE (octubre de 2026).'),
  P('Proponemos una plataforma moderna, segura, adaptable a dispositivos móviles y **administrable por la propia FEDAPABENI**, que integra los componentes institucionales, comerciales y administrativos exigidos: directorio de organizaciones, fichas individuales, catálogo comercial, formularios, WhatsApp, mapa georreferenciado, galería, noticias, panel de administración, capacitación, garantía de ' + PLAZO.warranty + ' días y funcionamiento durante el primer año.'),
  P('El monto total de nuestra oferta es de **' + money(TOTAL) + '** (' + totalWords(TOTAL) + '), con un plazo de ejecución de **' + PLAZO.days + ' días calendario**, inferior al máximo de ' + PLAZO.max + ' días establecido. Acompañamos un **prototipo navegable** para que IPHAE y FEDAPABENI puedan evaluar desde ahora la propuesta funcional y visual' + (PROTO ? ':' : '.')),
);
if (PROTO) body.push(P([link(PROTO, PROTO, { bold: true })], { align: AlignmentType.CENTER, after: 160 }));
body.push(
  P('Quedamos a disposición para cualquier aclaración o presentación técnica.'),
  P('Atentamente,', { after: 900 }),
  new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 6, color: C.ink, space: 4 } }, indent: { right: CW - 3600 }, children: [new TextRun({ text: val('companyRep'), bold: true, font: FONT })], spacing: { after: 0 } }),
  P(val('companyName') + (F.companyLegal ? ' · ' + F.companyLegal : ''), { after: 0 }),
  P('NIT: ' + val('companyNit'), { color: C.muted }),
);

// ---------- 01 Resumen ----------
body.push(...H1('01', 'Resumen ejecutivo', 'Una vitrina digital para la oferta amazónica organizada'));
const kpi = function (n, t) { return { fill: C.verde1, align: AlignmentType.CENTER, t: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(n), bold: true, size: 40, color: C.verde, font: FONT })], spacing: { after: 0 } }), new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: t, size: 17, color: C.verde7, font: FONT })], spacing: { after: 0 } })] }; };
body.push(table([CW / 4, CW / 4, CW / 4, CW / 4], null, [[kpi(PLAZO.days, 'días calendario de ejecución'), kpi(MODULES.length, 'módulos funcionales'), kpi(PLAZO.warranty, 'días de garantía técnica'), kpi(PLAZO.hosting, 'meses de hosting y funcionamiento')]]), spacer(160));
body.push(
  H2('El problema'),
  P('Las asociaciones y emprendimientos agroforestales del norte amazónico producen pulpas de asaí, copoazú y majo, cacao silvestre, harina de plátano y otros productos del bosque, pero su oferta, sus capacidades productivas y sus contactos comerciales tienen poca visibilidad digital. Los compradores no cuentan con un punto único para conocer quién produce, qué, cuánto y cómo contactarlo.'),
  H2('El objetivo'),
  P('Diseñar, desarrollar, implementar y poner en funcionamiento una plataforma web **comercial, institucional y de articulación de mercados** que presente a FEDAPABENI como articuladora de la oferta amazónica y, al mismo tiempo, visibilice individualmente a cada asociación afiliada, sus productos y capacidades.'),
  H2('Beneficios para FEDAPABENI y sus asociaciones'),
  ...bullets([
    '**Presencia institucional sólida:** historia, objetivos, cobertura y modelo “Bosque en Pie”.',
    '**Visibilidad individual:** cada asociación con su ficha, fotos, productos, capacidades y contacto.',
    '**Más oportunidades comerciales:** catálogo por categorías, solicitudes de compra y WhatsApp directo.',
    '**Origen georreferenciado:** mapa con la ubicación de organizaciones y territorios.',
    '**Autonomía:** el personal de FEDAPABENI actualiza todo desde un panel, sin depender del proveedor.',
    '**Impacto social:** beneficio indirecto para aproximadamente **720 familias** productoras y recolectoras (dato de los TDR).',
  ]),
  H2('Alcance general de la propuesta'),
  P('Incluye análisis y arquitectura, diseño UX/UI responsive, desarrollo de los módulos institucionales y comerciales, panel de administración, integración con WhatsApp, formularios y mapas, galería y noticias, seguridad y SEO básico, hosting, dominio y SSL por ' + PLAZO.hosting + ' meses, despliegue, pruebas, capacitación práctica, manual de administración, transferencia total de accesos y código, informe final y garantía de ' + PLAZO.warranty + ' días. **No se reconocerán costos adicionales** por conceptos necesarios para dejar la plataforma operativa durante el primer año.'),
);

// ---------- 02 TDR ----------
body.push(...H1('02', 'Comprensión del servicio', 'Cumplimiento de los Términos de Referencia'));
body.push(P('Revisamos el documento oficial de TDR publicado por IPHAE (CEBEM, octubre de 2026). Cada requisito tiene una respuesta concreta en esta propuesta.', { color: C.muted }));
body.push(table([1200, 2500, 4738, 1200], ['TDR', 'Requisito', 'Respuesta de la propuesta', 'Estado'],
  TDR.map(function (r) { return [{ t: r[0], bold: true }, r[1], r[2], { t: '✓ Incluido', color: C.verde5, bold: true }]; }), { zebra: true }), spacer(200));
body.push(box([
  P('**Observaciones de alineación con el documento oficial**', { after: 80 }),
  ...bullets([
    'Los TDR exigen un **módulo institucional** (objetivos, trayectoria, cobertura territorial, organizaciones afiliadas y modelo “Bosque en Pie”, §6.4). Se incorporó como sección “Nosotros” en el prototipo y como módulo 1 de esta propuesta.',
    'Los TDR piden un **formulario de solicitudes de información y consultas/compras** (§6.8) y capacitación en **administración de consultas** (§15). Se agregó una bandeja de consultas al panel administrativo.',
    'El plazo propuesto de **' + PLAZO.days + ' días** cumple el requisito de un cronograma **inferior a ' + PLAZO.max + ' días** (§8); el monto de **' + money(TOTAL) + '** no supera el techo de **' + money(CEILING) + '** (§9).',
    'La forma y porcentajes de pago serán establecidos en el contrato (§19); la referencia de pago de esta propuesta es negociable.',
    [new TextRun({ text: 'Los TDR fijan como fecha límite de presentación el ', font: FONT }), new TextRun({ text: 'jueves 15 de octubre de 2026', bold: true, font: FONT }), new TextRun({ text: ' (§18), al correo ', font: FONT }), link('iphae_riberalta@yahoo.com', 'mailto:iphae_riberalta@yahoo.com'), new TextRun({ text: '.', font: FONT })],
  ]),
]));

// ---------- 03 Solución ----------
body.push(...H1('03', 'Solución propuesta', 'Arquitectura moderna, administrable y sin dependencia del proveedor'));
body.push(H2('Arquitectura general de la plataforma'));
const third = Math.floor(CW / 3);
const node = function (title, txt, fill) { return { fill: fill, t: [new Paragraph({ children: [new TextRun({ text: title, bold: true, font: FONT, size: 19 })], spacing: { after: 40 } }), new Paragraph({ children: [new TextRun({ text: txt, font: FONT, size: 17, color: C.muted })], spacing: { after: 0 } })] }; };
body.push(table([third, third, CW - third * 2], ['Usuarios', 'Plataforma (HTTPS · SSL)', 'Servidor'], [
  [node('Compradores y público', 'Computadora, tableta, celular', C.oro1), node('Sitio público responsive', 'Inicio · Nosotros · Directorio · Catálogo · Mapa · Noticias · Galería · Contacto', C.verde1), node('Base de datos y archivos', 'MySQL/MariaDB · imágenes optimizadas · copias de seguridad', C.crema)],
  [node('Personal de FEDAPABENI', 'Usuarios con roles y contraseña', C.oro1), node('Panel de administración (CMS)', 'Organizaciones · Productos · Categorías · Noticias · Galería · Consultas · Ajustes', C.verde1), node('Integraciones', 'WhatsApp (click-to-chat) · Leaflet + OpenStreetMap · correo SMTP', C.crema)],
]), spacer(160));
body.push(H2('Tecnologías sugeridas para la implementación real'));
body.push(table([2400, CW - 2400], null, [
  [{ t: 'Gestor de contenidos', bold: true, fill: C.crema }, 'WordPress (código abierto, licencia GPL) con tema a medida y tipos de contenido propios: organizaciones, productos, categorías, noticias/eventos y consultas.'],
  [{ t: 'Backend', bold: true, fill: C.crema }, 'PHP 8.x + MySQL/MariaDB; campos personalizados y roles de usuario (administrador, editor).'],
  [{ t: 'Frontend', bold: true, fill: C.crema }, 'HTML5, CSS3 y JavaScript; diseño mobile-first, imágenes WebP y carga diferida.'],
  [{ t: 'Mapas', bold: true, fill: C.crema }, 'Leaflet.js + OpenStreetMap (sin costo de licencias ni claves de pago).'],
  [{ t: 'Infraestructura', bold: true, fill: C.crema }, 'Hosting con SSL Let’s Encrypt, copias de seguridad automáticas y correo SMTP para formularios.'],
]));
body.push(small('Alternativa evaluable en la fase de arquitectura: CMS headless (Strapi) + frontend Next.js. Recomendamos WordPress por su menor costo operativo, la facilidad de uso para el personal y la gran disponibilidad de proveedores en Bolivia, lo que evita dependencia técnica (TDR §13).'));
body.push(
  H2('Diseño responsive'),
  P('Diseño mobile-first validado en computadoras, tabletas y celulares: navegación simple, botones grandes, WhatsApp siempre visible y páginas livianas para conexiones móviles de la región.'),
  H2('Administración de contenido'),
  P('Formularios sencillos para crear y editar organizaciones, productos, fotografías, textos, noticias y eventos; bandeja de consultas; usuarios con roles. Sin conocimientos técnicos.'),
  H2('Escalabilidad y mantenimiento'),
  P('Estructura preparada para nuevas organizaciones, productos y módulos (pagos en línea, multilenguaje, trazabilidad). Código documentado y entregado, actualizaciones de seguridad y copias de respaldo.'),
  box([
    P('**Sobre el prototipo**', { after: 60 }),
    P('El prototipo que acompaña esta propuesta está construido con **HTML, CSS y JavaScript** (sin servidor) para demostrar la experiencia de uso, la navegación y las funciones principales. La solución definitiva se implementará con **backend, base de datos y CMS**, con autenticación real, almacenamiento en servidor y envío de formularios por correo.', { after: 0 }),
  ]),
);

// ---------- 04 Módulos ----------
body.push(...H1('04', 'Módulos incluidos', MODULES.length + ' módulos para una plataforma completa'));
body.push(P('Componentes institucionales, comerciales y administrativos exigidos por los TDR (§6.4 a §6.13), sin costos adicionales.', { color: C.muted }));
body.push(table([600, 3000, 4838, 1200], ['N.º', 'Módulo', 'Descripción y funciones', 'TDR'],
  MODULES.map(function (m, i) {
    return [{ t: String(i + 1).padStart(2, '0'), bold: true, color: C.verde5 }, { t: m.title, bold: true },
      { t: [new Paragraph({ children: runs(m.desc, { size: 19 }), spacing: { after: 40 } }), new Paragraph({ children: runs('✓ ' + m.feats.join('  ·  ✓ '), { size: 17, color: C.muted }), spacing: { after: 0 } })] },
      { t: m.tdr, size: 17 }];
  }), { zebra: true }));

// ---------- 05 Cronograma ----------
body.push(...H1('05', 'Metodología y cronograma', PLAZO.days + ' días calendario, con entregables verificables'));
body.push(P('Trabajo por fases cortas e iterativas, con validaciones de IPHAE y FEDAPABENI en cada producto (consultoría por producto, TDR §19).', { color: C.muted }));
const fifth = Math.floor(CW / METHOD.length);
body.push(table(METHOD.map(function (_, i) { return i < METHOD.length - 1 ? fifth : CW - fifth * (METHOD.length - 1); }), null, [METHOD.map(function (m, i) {
  return { fill: C.verde1, t: [new Paragraph({ children: [new TextRun({ text: (i + 1) + '. ' + m[1], bold: true, color: C.verde, font: FONT, size: 20 })], spacing: { after: 40 } }), new Paragraph({ children: [new TextRun({ text: m[2], size: 17, font: FONT, color: C.muted })], spacing: { after: 0 } })] };
})]), spacer(200));

body.push(H2('Cronograma de ejecución'));
const gDays = Math.max(PLAZO.days, ...PHASES.map(function (p) { return p.fin; }));
const labelW = 2900;
const dayW = Math.floor((CW - labelW) / gDays);
const gW = [labelW].concat(Array.from({ length: gDays }, function () { return dayW; }));
const gHead = [{ t: 'Fase', bold: true, color: 'FFFFFF', fill: C.verde }].concat(Array.from({ length: gDays }, function (_, i) {
  const dt = PLAZO.start ? addDays(PLAZO.start, i) : null;
  return { t: String(dt ? dt.getDate() : i + 1), bold: true, color: 'FFFFFF', fill: C.verde, align: AlignmentType.CENTER, size: 15 };
}));
const gRows = PHASES.map(function (p, i) {
  const client = p.responsables.indexOf('F') === 0;
  return [{ t: (i + 1) + '. ' + p.nombre, size: 16 }].concat(Array.from({ length: gDays }, function (_, d) {
    const day = d + 1;
    const on = day >= p.inicio && day <= p.fin;
    const ms = (p.entregas || []).indexOf(day) >= 0;
    return { t: ms ? '◆' : '', fill: on ? (client ? C.tierra : C.verde5) : undefined, color: on ? 'FFFFFF' : C.verde, align: AlignmentType.CENTER, size: 14, bold: true };
  }));
});
body.push(table(gW, null, [gHead].concat(gRows)));
body.push(small('■ Verde: ' + val('companyName') + ' · ■ Café: FEDAPABENI (contenidos y validación) · ◆ Entrega de producto · ' +
  (PLAZO.start ? 'Inicio: ' + fmtLong(addDays(PLAZO.start, 0)) + ' · Conclusión: ' + fmtLong(addDays(PLAZO.start, PLAZO.days - 1)) + ' (' + PLAZO.days + ' días calendario).' : 'Fechas relativas (día 1 = día siguiente a la firma del contrato u orden de inicio).')));
body.push(spacer(120), table([500, 4300, 1250, 2388, 1200], ['#', 'Fase y actividades', 'Responsables', 'Productos', 'Fechas'],
  PHASES.map(function (p, i) {
    return [{ t: String(i + 1), bold: true },
      { t: [new Paragraph({ children: runs(p.nombre, { bold: true, size: 19 }), spacing: { after: 30 } }), new Paragraph({ children: runs(p.actividades, { size: 17, color: C.muted }), spacing: { after: 0 } })] },
      p.responsables, p.productos, dayLabel(p.inicio) + (p.fin !== p.inicio ? ' – ' + dayLabel(p.fin) : '')];
  }), { zebra: true }));
body.push(small('A = ' + val('companyName') + ' · F = FEDAPABENI · I = IPHAE (supervisión). Duración total: ' + PLAZO.days + ' días calendario, ' + (PLAZO.days < PLAZO.max ? 'inferior al' : 'no inferior al') + ' máximo de ' + PLAZO.max + ' días (TDR §8).'));

// ---------- 06 Presupuesto ----------
body.push(...H1('06', 'Propuesta económica', 'Presupuesto detallado'));
body.push(P('Montos en bolivianos. Incluye todos los costos necesarios para el cumplimiento integral del servicio y el funcionamiento durante el primer año (TDR §9, §12 y §16).', { color: C.muted }));
const bRows = [];
let n = 0;
Object.keys(GROUPS).forEach(function (g) {
  const items = BUDGET.filter(function (b) { return b.grupo === g; });
  const sub = items.reduce(function (s, b) { return s + b.monto; }, 0);
  bRows.push([{ t: g + '. ' + GROUPS[g], bold: true, fill: C.verde2, span: 4, color: C.verde }]);
  items.forEach(function (b) {
    n++;
    bRows.push([String(n), { t: [new Paragraph({ children: runs(b.concepto, { bold: true, size: 19 }), spacing: { after: 30 } }), new Paragraph({ children: runs(b.descripcion, { size: 17, color: C.muted }), spacing: { after: 0 } })] },
      { t: money(b.monto, true), align: AlignmentType.RIGHT }, { t: pct(b.monto), align: AlignmentType.RIGHT }]);
  });
  bRows.push(['', { t: 'Subtotal ' + g, bold: true, fill: C.crema }, { t: money(sub, true), bold: true, align: AlignmentType.RIGHT, fill: C.crema }, { t: pct(sub), bold: true, align: AlignmentType.RIGHT, fill: C.crema }]);
});
bRows.push([{ t: '', fill: C.verde }, { t: 'TOTAL GENERAL', bold: true, color: 'FFFFFF', fill: C.verde }, { t: money(TOTAL), bold: true, color: 'FFFFFF', fill: C.verde, align: AlignmentType.RIGHT }, { t: '100 %', bold: true, color: 'FFFFFF', fill: C.verde, align: AlignmentType.RIGHT }]);
body.push(table([600, 6038, 1900, 1100], ['N.º', 'Concepto', 'Monto (Bs)', '%'], bRows, { alignHead: [null, null, AlignmentType.RIGHT, AlignmentType.RIGHT] }), spacer(200));
const diff = CEILING - TOTAL;
body.push(table([CW / 2, CW / 2], null, [[
  { fill: C.verde1, t: [new Paragraph({ children: [new TextRun({ text: 'Total de la propuesta', size: 18, color: C.verde7, font: FONT })], spacing: { after: 20 } }), new Paragraph({ children: [new TextRun({ text: money(TOTAL), bold: true, size: 34, color: C.verde, font: FONT })], spacing: { after: 20 } }), new Paragraph({ children: [new TextRun({ text: totalWords(TOTAL), size: 16, color: C.verde7, font: FONT })], spacing: { after: 0 } })] },
  { fill: C.oro1, t: [new Paragraph({ children: [new TextRun({ text: 'Techo presupuestario (TDR §9)', size: 18, color: C.tierra, font: FONT })], spacing: { after: 20 } }), new Paragraph({ children: [new TextRun({ text: money(CEILING), bold: true, size: 34, color: C.ink, font: FONT })], spacing: { after: 20 } }), new Paragraph({ children: [new TextRun({ text: diff >= 0 ? 'Margen bajo el techo: ' + money(diff) : 'Excede el techo en ' + money(-diff), size: 16, color: C.tierra, font: FONT })], spacing: { after: 0 } })] },
]]), spacer(200));
const comp = {};
BUDGET.forEach(function (b) { comp[b.componente] = (comp[b.componente] || 0) + b.monto; });
body.push(H2('Desglose por componentes solicitados (TDR §12)'));
body.push(table([CW - 2400, 2400], ['Componente', 'Monto'], COMPONENTS.map(function (c) {
  return [c[0] === 'otros' ? { t: [new Paragraph({ children: runs(c[1], { size: 19 }), spacing: { after: 20 } }), new Paragraph({ children: runs('No se prevén costos adicionales.', { size: 17, color: C.muted }), spacing: { after: 0 } })] } : c[1], { t: money(comp[c[0]] || 0), align: AlignmentType.RIGHT }];
}).concat([[{ t: 'Total', bold: true, fill: C.crema }, { t: money(TOTAL), bold: true, align: AlignmentType.RIGHT, fill: C.crema }]]), { alignHead: [null, AlignmentType.RIGHT] }));
body.push(
  H2('Funcionamiento durante el primer año (TDR §16)'),
  P('El rubro “Hosting y despliegue por un año” cubre los servicios técnicos necesarios durante ' + PLAZO.hosting + ' meses:'),
  ...bullets([
    'Hosting con recursos suficientes para el sitio, imágenes y base de datos.',
    'Registro del dominio por 1 año, **a nombre de FEDAPABENI** (extensión y disponibilidad: pendiente de confirmación).',
    'Certificado SSL (HTTPS) y renovaciones automáticas.',
    'Copias de seguridad periódicas y monitoreo básico.',
  ]),
  small('Concluido el primer año, los costos de funcionamiento serán asumidos por FEDAPABENI mediante el mecanismo de contribución de sus organizaciones afiliadas (TDR §16).'),
);

// ---------- 07 Entregables ----------
body.push(...H1('07', 'Productos y entregables', 'Lo que FEDAPABENI recibe'));
body.push(...bullets(HIGHLIGHTS.map(function (h) { return '**' + h[1] + '**'; })), spacer(120));
body.push(table([700, 4000, 3738, 1200], ['N.º', 'Producto (TDR §7)', 'Forma de entrega', 'Entrega'],
  data.entregables.map(function (d, i) { return [{ t: 'P' + (i + 1), bold: true }, d.producto, { t: d.forma, size: 17 }, dayLabel(d.dia)]; }), { zebra: true }));

// ---------- 08 Equipo ----------
body.push(...H1('08', 'Proponente', 'Perfil, experiencia y equipo responsable'));
body.push(H2(val('companyName')));
body.push(P([new TextRun({ text: 'Equipo de consultores y desarrolladores con base en Cochabamba, Bolivia, dedicado al diseño y desarrollo de sitios web y aplicaciones móviles, integraciones con terceros y soluciones administrables por el cliente (según el perfil publicado en ', font: FONT }), link('soft.amicornios.com', 'https://soft.amicornios.com/'), new TextRun({ text: ').', font: FONT })]));
body.push(table([2400, CW - 2400], null, [
  [{ t: 'Razón social', bold: true, fill: C.crema }, val('companyLegal')],
  [{ t: 'NIT', bold: true, fill: C.crema }, val('companyNit')],
  [{ t: 'Representante', bold: true, fill: C.crema }, val('companyRep')],
  [{ t: 'Ciudad', bold: true, fill: C.crema }, val('companyCity')],
  [{ t: 'Correo', bold: true, fill: C.crema }, { t: [new Paragraph({ children: [link(val('companyEmail'), 'mailto:' + F.companyEmail, { size: 19 })], spacing: { after: 0 } })] }],
  [{ t: 'WhatsApp', bold: true, fill: C.crema }, { t: [new Paragraph({ children: [link(val('companyPhone'), 'https://wa.me/' + String(F.companyPhone).replace(/\D/g, ''), { size: 19 })], spacing: { after: 0 } })] }],
  [{ t: 'Sitio web', bold: true, fill: C.crema }, { t: [new Paragraph({ children: [link('soft.amicornios.com', 'https://soft.amicornios.com/', { size: 19 })], spacing: { after: 0 } })] }],
]), spacer(120));
body.push(H2('Capacidades técnicas'), ...bullets([
  'Desarrollo web: WordPress, Next.js, React, HTML, CSS y JavaScript.',
  'Backend: PHP, Laravel, Node.js, Express, Strapi, Python; MySQL y PostgreSQL.',
  'Aplicaciones móviles: Flutter, React Native, Java.',
  'Integraciones: autenticación, pasarelas de pago, calendarios de reservas, generación de códigos QR, APIs REST.',
  'Catálogos con venta por WhatsApp, directorios con registro de usuarios y plataformas administrables.',
]), small('Fuente: servicios y tecnologías publicados en soft.amicornios.com.'));
body.push(H2('Experiencia específica relacionada (portafolio publicado)'));
body.push(table([2600, 4438, 2600], ['Proyecto', 'Descripción', 'Relación con esta consultoría'], EXPERIENCE.map(function (e) {
  return [{ t: [new Paragraph({ children: runs(e[0], { bold: true, size: 19 }), spacing: { after: 30 } }), new Paragraph({ children: [link(e[1].replace(/^https?:\/\//, '').replace(/\/$/, ''), e[1], { size: 16 })], spacing: { after: 0 } })] }, { t: e[2], size: 18 }, { t: e[3], size: 18 }];
}), { zebra: true }), spacer(120));
body.push(H2('Equipo responsable'));
body.push(table([3200, 4238, 2200], ['Rol', 'Responsabilidades', 'Nombre'], TEAM.map(function (t) { return [{ t: t[1], bold: true }, { t: t[2], size: 18 }, val(t[0])]; }), { zebra: true }));

// ---------- 09 Garantía ----------
body.push(...H1('09', 'Garantía, soporte, capacitación y transferencia', 'Continuidad garantizada para FEDAPABENI'));
body.push(
  H2('Garantía y soporte técnico — ' + PLAZO.warranty + ' días'),
  P('Durante **' + PLAZO.warranty + ' días calendario** posteriores a la puesta en funcionamiento corregiremos, sin costo adicional, los errores atribuibles al desarrollo (TDR §14):'),
  ...bullets(['Funcionamiento de los módulos contratados y de la programación.', 'Visualización, formularios, enlaces y navegación.', 'Atención por WhatsApp y correo; diagnóstico en 1 día hábil y corrección según severidad.']),
  small('La garantía no comprende modificaciones o nuevos módulos fuera del alcance contratado.'),
  H2('Capacitación práctica obligatoria'),
  P('Sesiones prácticas (presenciales o virtuales, a coordinar) para el personal designado, antes de la recepción definitiva (TDR §15):'),
  ...bullets(['Administración de contenidos', 'Registro y actualización de organizaciones', 'Registro y actualización de productos', 'Incorporación de fotografías', 'Publicación de noticias', 'Administración de consultas y formularios', 'Gestión básica del catálogo', 'Administración general de la plataforma']),
  H2('Propiedad y transferencia de accesos (TDR §13)'),
  P('Una vez cumplidas las obligaciones contractuales, FEDAPABENI tendrá **control total** de su plataforma. Entregaremos:'),
  ...bullets(['Usuario y contraseña de administrador', 'Acceso al hosting', 'Acceso al dominio (registrado a nombre de FEDAPABENI)', 'Base de datos (copia exportada)', 'Código fuente de los desarrollos del proyecto', 'Archivos gráficos y recursos digitales', 'Manual básico de administración', 'Toda otra credencial necesaria']),
  P('El consultor **no** mantendrá bajo su control exclusivo credenciales, dominio, hosting ni base de datos. La solución usa tecnologías abiertas y ampliamente conocidas para que FEDAPABENI pueda contratar a cualquier otro proveedor en el futuro.', { size: 19 }),
);

// ---------- 10 Requerimientos ----------
body.push(...H1('10', 'Requerimientos a FEDAPABENI', 'Insumos necesarios para cumplir el plazo'));
body.push(...bullets([
  'Designación de una persona de contacto y del personal a capacitar.',
  'Información institucional: historia, objetivos, cobertura territorial y modelo “Bosque en Pie”.',
  'Datos validados de cada asociación: nombre completo, ubicación, descripción, capacidades y contactos.',
  'Listado de productos con presentaciones, disponibilidad y características.',
  'Fotografías y videos propios (organizaciones, productos, territorios).',
  'Logotipo oficial en buena resolución y lineamientos de identidad, si existen.',
  'Número(s) de WhatsApp comercial y correo institucional.',
  'Datos para el registro del dominio a nombre de FEDAPABENI y validaciones oportunas de cada producto.',
]), small('La información será proporcionada y validada por FEDAPABENI según el cronograma de coordinación (TDR §20). Los retrasos en su entrega se registrarán y no se considerarán incumplimiento del consultor.'));

// ---------- 11 Condiciones ----------
body.push(...H1('11', 'Condiciones comerciales', 'Condiciones de la oferta'));
body.push(table([2600, CW - 2600], null, [
  [{ t: PLAZO.days + ' días calendario', bold: true, fill: C.verde1, color: C.verde }, 'Plazo de ejecución desde la firma del contrato u orden de inicio.'],
  [{ t: PLAZO.warranty + ' días', bold: true, fill: C.verde1, color: C.verde }, 'Garantía técnica posterior a la puesta en funcionamiento.'],
  [{ t: PLAZO.hosting + ' meses', bold: true, fill: C.verde1, color: C.verde }, 'Hosting, dominio, SSL y funcionamiento incluidos.'],
  [{ t: 'Pago negociable', bold: true, fill: C.verde1, color: C.verde }, 'Sujeto a aprobación contractual, vinculado a la aceptación de productos.'],
  [{ t: val('validity') + ' días', bold: true, fill: C.verde1, color: C.verde }, 'Vigencia de la cotización desde su fecha de elaboración.'],
  [{ t: money(TOTAL), bold: true, fill: C.verde1, color: C.verde }, 'Monto total, en bolivianos, dentro del techo de ' + money(CEILING) + '.'],
]), spacer(160));
body.push(H2('Forma de pago de referencia (negociable)'));
const payPct = data.pagos.reduce(function (s, p) { return s + (Number(p.porcentaje) || 0); }, 0);
body.push(table([900, 5338, 1500, 1900], ['%', 'Contra', 'Estimado', 'Monto'], data.pagos.map(function (p) {
  return [{ t: p.porcentaje + ' %', bold: true }, p.contra, dayLabel(p.dia), { t: money(TOTAL * (Number(p.porcentaje) || 0) / 100), align: AlignmentType.RIGHT }];
}), { alignHead: [null, null, null, AlignmentType.RIGHT] }));
if (payPct !== 100) body.push(P('**Atención:** los porcentajes de pago suman ' + payPct + ' %, no 100 %.', { color: 'B3261E' }));
body.push(small('Referencia sujeta a lo que establezca el contrato (TDR §19). Régimen de facturación y retenciones impositivas: pendiente de confirmación.'));

// ---------- 12 Prototipo ----------
body.push(...H1('12', 'Prototipo interactivo', 'Vea y pruebe la plataforma antes de contratar'));
body.push(P('Un prototipo navegable con datos demostrativos que muestra cómo se verá y funcionará el producto final.', { color: C.muted }));
if (PROTO) {
  const pages = [['Inicio', ''], ['Nosotros (módulo institucional)', '#/nosotros'], ['Directorio de asociaciones', '#/directorio'], ['Catálogo de productos', '#/catalogo'], ['Mapa interactivo', '#/mapa'], ['Noticias y ferias', '#/noticias'], ['Contacto y solicitud de compra', '#/contacto']];
  const protoBase = PROTO.replace(/#.*$/, '');
  body.push(table([3400, CW - 3400], ['Sección', 'Enlace'], pages.map(function (pg) {
    const u = protoBase + pg[1];
    return [{ t: pg[0], bold: true }, { t: [new Paragraph({ children: [link(u, u, { size: 18 })], spacing: { after: 0 } })] }];
  }).concat([[{ t: 'Panel administrativo (demo)', bold: true, fill: C.verde1 }, { fill: C.verde1, t: [new Paragraph({ children: [link(ADMIN, ADMIN, { size: 18 })], spacing: { after: 0 } })] }]])), spacer(200));
} else {
  body.push(P('**Enlace del prototipo:** [URL pública del prototipo por publicar]'));
}
const shot = image('preview-desktop.jpg', 600, 375);
if (shot) body.push(P([shot], { align: AlignmentType.CENTER, after: 40 }), P('Inicio — escritorio', { align: AlignmentType.CENTER, size: 17, color: C.muted }));
const mob = image('preview-mobile.jpg', 150, 300);
const adm = image('preview-admin.jpg', 400, 250);
if (mob && adm) {
  body.push(table([2600, CW - 2600], null, [[
    { t: [new Paragraph({ alignment: AlignmentType.CENTER, children: [mob], spacing: { after: 40 } }), new Paragraph({ alignment: AlignmentType.CENTER, children: runs('Catálogo — celular', { size: 17, color: C.muted }), spacing: { after: 0 } })] },
    { t: [new Paragraph({ alignment: AlignmentType.CENTER, children: [adm], spacing: { after: 40 } }), new Paragraph({ alignment: AlignmentType.CENTER, children: runs('Panel administrativo', { size: 17, color: C.muted }), spacing: { after: 0 } })] },
  ]]), spacer(160));
}
body.push(H2('Qué puede probar'), ...bullets([
  'Buscador global y filtros por categoría, organización, ubicación y rubro.',
  'Perfiles de asociaciones con fotos, productos, contacto y mapa.',
  'Fichas de producto con galería y consulta por WhatsApp.',
  'Mapa interactivo (Leaflet + OpenStreetMap) con enlaces a perfiles.',
  'Noticias, ferias y oportunidades con filtros; galería con visor de imágenes y videos.',
  'Formularios validados de contacto y solicitud de compra.',
  'Panel administrativo: crear, editar y eliminar registros; bandeja de consultas.',
]), small('Los datos, ubicaciones y contactos del prototipo son ficticios y deben ser validados por FEDAPABENI. Las fotografías provienen de Wikimedia Commons con licencias libres.'));

// ---------- 13 Referencias ----------
body.push(...H1('13', 'Referencias del proyecto', 'Fuentes y enlaces'));
body.push(table([3400, CW - 3400], ['Referencia', 'Descripción y enlace'], REFS.map(function (r) {
  const href = abs(r[1]);
  const isLink = /^(https?:|mailto:)/.test(href);
  return [{ t: r[0], bold: true }, { t: [new Paragraph({ children: runs(r[2], { size: 18 }), spacing: { after: 30 } }), new Paragraph({ children: isLink ? [link(href.replace(/^mailto:/, ''), href, { size: 17 })] : runs(href, { size: 17, color: C.muted }), spacing: { after: 0 } })] }];
}), { zebra: true }));

// ---------- Cierre ----------
body.push(spacer(400), P('**Gracias por su consideración**', { size: 30, color: C.verde, keepNext: true }),
  P('Estamos listos para iniciar al día siguiente de la orden de inicio y entregar una plataforma que fortalezca la articulación comercial de la oferta amazónica.', { keepNext: true, after: 1000 }));
const signCell = function (name, role) {
  return { t: [new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 6, color: C.ink, space: 4 } }, children: [new TextRun({ text: name, bold: true, font: FONT })], spacing: { after: 0 } }), new Paragraph({ children: [new TextRun({ text: role, size: 18, color: C.muted, font: FONT })], spacing: { after: 0 } })] };
};
const noB = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
body.push(new Table({
  width: { size: CW, type: WidthType.DXA }, columnWidths: [CW / 2 - 300, 600, CW / 2 - 300], layout: TableLayoutType.FIXED,
  rows: [new TableRow({ cantSplit: true, children: [signCell(val('companyRep'), val('companyName') + ' · Proponente'), { t: '' }, signCell(val('clientContact'), 'IPHAE / FEDAPABENI · Recepción')].map(function (c, i) {
    return new TableCell({ children: Array.isArray(c.t) ? c.t : [new Paragraph('')], width: { size: [CW / 2 - 300, 600, CW / 2 - 300][i], type: WidthType.DXA }, borders: { top: noB, bottom: noB, left: noB, right: noB } });
  }) })],
}));

/* ================= documento ================= */
const RTAB = function () { return new PositionalTab({ alignment: PositionalTabAlignment.RIGHT, relativeTo: PositionalTabRelativeTo.MARGIN, leader: PositionalTabLeader.NONE }); };
const doc = new Document({
  creator: val('companyName'),
  title: 'Cotización ' + val('quoteNo') + ' — Plataforma web comercial FEDAPABENI',
  description: 'Propuesta técnica y económica de ' + val('companyName') + ' para IPHAE / FEDAPABENI',
  styles: {
    default: { document: { run: { font: FONT, size: 21, color: C.ink } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 36, bold: true, color: C.verde, font: FONT }, paragraph: { spacing: { before: 0, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 25, bold: true, color: C.verde7, font: FONT }, paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1 } },
    ],
    characterStyles: [{ id: 'Hyperlink', name: 'Hyperlink', basedOn: 'DefaultParagraphFont', run: { color: '1F6FB2', underline: { type: 'single' } } }],
  },
  numbering: { config: [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 260 } }, run: { color: C.verde5 } } }] }] },
  sections: [{
    properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN, header: 560, footer: 560 } }, titlePage: true },
    headers: {
      default: new Header({ children: [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.line, space: 4 } }, children: [new TextRun({ text: val('companyName') + ' · Propuesta técnica y económica', size: 16, color: C.muted, font: FONT }), new TextRun({ children: [RTAB(), 'Cotización N.º ' + val('quoteNo')], size: 16, color: C.muted, font: FONT })] })] }),
      first: new Header({ children: [new Paragraph('')] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({ children: [new TextRun({ text: 'IPHAE – FEDAPABENI · Plataforma web comercial', size: 16, color: C.muted, font: FONT }), new TextRun({ children: [RTAB(), 'Página ', PageNumber.CURRENT, ' de ', PageNumber.TOTAL_PAGES], size: 16, color: C.muted, font: FONT })] })] }),
      first: new Footer({ children: [new Paragraph('')] }),
    },
    children: body,
  }],
});

Packer.toBuffer(doc).then(function (buf) {
  fs.writeFileSync(OUT, buf);
  console.log('Word generado: ' + OUT + ' (' + Math.round(buf.length / 1024) + ' KB) · Total ' + money(TOTAL) + ' · ' + PLAZO.days + ' días');
});
