/*
 * Ilustraciones de productos de demostración (SVG generado, sin depender de internet).
 * Referencia de imagen: 'art:<tipo>:<color>[:<variante>]'. Las variantes 2 y 3
 * se usan como fotos adicionales de la galería (detalle y fondo alternativo).
 */
(function () {
  'use strict';
  const CA = (window.CA = window.CA || {});

  function shade(hex, amt) {
    const n = parseInt(String(hex).replace('#', ''), 16);
    if (isNaN(n)) return hex;
    const c = (v) => Math.max(0, Math.min(255, Math.round(v + 255 * amt)));
    const r = c((n >> 16) & 255), g = c((n >> 8) & 255), b = c(n & 255);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  CA.shade = shade;

  // Cada dibujo usa C (color), D (oscuro), L (claro). Lienzo 400×400, producto centrado.
  const ART = {
    laptop: '<rect x="92" y="96" width="216" height="142" rx="10" fill="#1f2433"/><rect x="102" y="106" width="196" height="122" rx="4" fill="url(#scr)"/><path d="M60 250h280l-16 26H76z" fill="#cfd5e2"/><rect x="170" y="252" width="60" height="6" rx="3" fill="#aab2c4"/><circle cx="200" cy="101" r="2" fill="#4b5263"/>',
    desktop: '<rect x="128" y="70" width="144" height="250" rx="12" fill="#1c2030"/><rect x="140" y="84" width="120" height="150" rx="6" fill="#0d1018" stroke="C" stroke-width="2"/><circle cx="200" cy="126" r="26" fill="none" stroke="C" stroke-width="6" opacity=".9"/><circle cx="200" cy="196" r="26" fill="none" stroke="L" stroke-width="6" opacity=".8"/><rect x="150" y="248" width="100" height="8" rx="4" fill="#2c3245"/><rect x="150" y="264" width="60" height="8" rx="4" fill="#2c3245"/><circle cx="250" cy="300" r="5" fill="C"/>',
    monitor: '<rect x="56" y="80" width="288" height="180" rx="12" fill="#1f2433"/><rect x="66" y="90" width="268" height="160" rx="5" fill="url(#scr)"/><path d="M182 260h36l10 44h-56z" fill="#9aa3b5"/><rect x="140" y="300" width="120" height="12" rx="6" fill="#cfd5e2"/>',
    keyboard: '<rect x="44" y="150" width="312" height="110" rx="16" fill="#1f2433"/><rect x="44" y="252" width="312" height="10" rx="5" fill="C" opacity=".85"/>' + Array.from({ length: 4 }, (_, r) => Array.from({ length: 12 }, (_, k) => '<rect x="' + (58 + k * 24) + '" y="' + (162 + r * 22) + '" width="19" height="17" rx="3" fill="' + (r === 3 && k > 3 && k < 8 ? '#e7eaf1' : '#3a4157') + '"/>').join('')).join(''),
    mouse: '<path d="M200 96c-46 0-74 34-74 82v52c0 48 30 82 74 82s74-34 74-82v-52c0-48-28-82-74-82z" fill="C"/><path d="M200 96v84M126 180h148" stroke="D" stroke-width="4"/><rect x="192" y="122" width="16" height="34" rx="8" fill="#1f2433"/><path d="M140 250c20 24 100 24 120 0" stroke="L" stroke-width="6" fill="none" opacity=".6"/>',
    gpu: '<rect x="40" y="140" width="320" height="120" rx="14" fill="#1f2433"/><rect x="40" y="140" width="320" height="16" rx="8" fill="C"/><circle cx="130" cy="206" r="40" fill="#2c3245"/><circle cx="270" cy="206" r="40" fill="#2c3245"/><circle cx="130" cy="206" r="12" fill="C"/><circle cx="270" cy="206" r="12" fill="C"/>' + [130, 270].map((x) => [0, 60, 120, 180, 240, 300].map((a) => '<path d="M' + x + ' 206 L' + (x + 34 * Math.cos(a * Math.PI / 180)) + ' ' + (206 + 34 * Math.sin(a * Math.PI / 180)) + '" stroke="#4b5268" stroke-width="7"/>').join('')).join('') + '<rect x="60" y="260" width="120" height="12" fill="#c9a24a"/>',
    ram: '<rect x="40" y="150" width="320" height="90" rx="6" fill="#16653a"/><rect x="40" y="150" width="320" height="34" rx="6" fill="C"/>' + Array.from({ length: 8 }, (_, k) => '<rect x="' + (54 + k * 38) + '" y="194" width="28" height="30" rx="3" fill="#1f2433"/>').join('') + '<rect x="40" y="240" width="320" height="10" fill="#d4b14f"/>',
    ssd: '<rect x="60" y="160" width="280" height="80" rx="8" fill="#1a5c3a"/><rect x="80" y="176" width="70" height="48" rx="4" fill="#1f2433"/><rect x="164" y="176" width="70" height="48" rx="4" fill="#1f2433"/><rect x="248" y="182" width="52" height="36" rx="4" fill="#2c3245"/><rect x="60" y="160" width="280" height="12" rx="6" fill="C"/><rect x="324" y="186" width="16" height="28" fill="#d4b14f"/>',
    cpu: '<rect x="110" y="110" width="180" height="180" rx="18" fill="#c9ced8"/><rect x="134" y="134" width="132" height="132" rx="10" fill="#e8ebf1"/><rect x="156" y="170" width="88" height="22" rx="4" fill="C"/><rect x="156" y="204" width="60" height="10" rx="5" fill="#9aa3b5"/><rect x="156" y="222" width="76" height="10" rx="5" fill="#9aa3b5"/>',
    headset: '<path d="M110 220v-30c0-56 40-96 90-96s90 40 90 96v30" fill="none" stroke="#1f2433" stroke-width="16"/><rect x="88" y="200" width="54" height="92" rx="22" fill="C"/><rect x="258" y="200" width="54" height="92" rx="22" fill="C"/><path d="M110 286c0 30 30 40 62 40" stroke="#1f2433" stroke-width="6" fill="none"/><circle cx="176" cy="326" r="8" fill="#1f2433"/>',
    webcam: '<circle cx="200" cy="170" r="74" fill="#1f2433"/><circle cx="200" cy="170" r="42" fill="#2c3245"/><circle cx="200" cy="170" r="24" fill="C"/><circle cx="192" cy="162" r="7" fill="#fff" opacity=".7"/><path d="M168 244h64l20 56h-104z" fill="#3a4157"/><rect x="132" y="296" width="136" height="12" rx="6" fill="#9aa3b5"/>',
    router: '<rect x="70" y="210" width="260" height="70" rx="16" fill="#1f2433"/><rect x="104" y="240" width="10" height="10" rx="5" fill="C"/><rect x="124" y="240" width="10" height="10" rx="5" fill="C"/><rect x="144" y="240" width="10" height="10" rx="5" fill="#37d67a"/><path d="M110 210l-20-110M170 210l-8-120M230 210l8-120M290 210l20-110" stroke="#2c3245" stroke-width="12" stroke-linecap="round"/>',
    chair: '<path d="M140 70h120c10 0 16 8 16 18v120c0 14-10 22-22 22H146c-12 0-22-8-22-22V88c0-10 6-18 16-18z" fill="#1f2433"/><path d="M170 80h60v130h-60z" fill="C"/><rect x="118" y="226" width="164" height="40" rx="14" fill="#2c3245"/><rect x="194" y="266" width="12" height="54" fill="#4b5268"/><path d="M130 330l70-12 70 12" stroke="#4b5268" stroke-width="10" stroke-linecap="round" fill="none"/>',
    speaker: '<rect x="80" y="110" width="100" height="190" rx="14" fill="#1f2433"/><rect x="220" y="110" width="100" height="190" rx="14" fill="#1f2433"/><circle cx="130" cy="240" r="34" fill="#2c3245" stroke="C" stroke-width="5"/><circle cx="270" cy="240" r="34" fill="#2c3245" stroke="C" stroke-width="5"/><circle cx="130" cy="156" r="16" fill="#3a4157"/><circle cx="270" cy="156" r="16" fill="#3a4157"/>',
    mousepad: '<rect x="40" y="130" width="320" height="150" rx="18" fill="#1f2433"/><rect x="40" y="130" width="320" height="150" rx="18" fill="none" stroke="C" stroke-width="5"/><path d="M60 250c60-50 120 10 190-40s80-30 90-20" stroke="C" stroke-width="10" fill="none" opacity=".55"/>',
    hub: '<rect x="90" y="170" width="220" height="64" rx="18" fill="#c9ced8"/><rect x="118" y="194" width="26" height="14" rx="3" fill="#1f2433"/><rect x="156" y="194" width="26" height="14" rx="3" fill="#1f2433"/><rect x="194" y="194" width="26" height="14" rx="3" fill="#1f2433"/><rect x="232" y="194" width="40" height="14" rx="3" fill="C"/><path d="M310 202c40 0 40 70 0 80" stroke="#9aa3b5" stroke-width="8" fill="none"/>',
    printer: '<rect x="90" y="150" width="220" height="110" rx="14" fill="#e8ebf1"/><rect x="120" y="96" width="160" height="60" fill="#fff" stroke="#c9ced8" stroke-width="4"/><rect x="120" y="240" width="160" height="70" fill="#fff" stroke="#c9ced8" stroke-width="4"/><rect x="250" y="176" width="36" height="10" rx="5" fill="C"/><path d="M140 266h120M140 282h90" stroke="#c9ced8" stroke-width="5"/>',
    tshirt: '<path d="M150 80l-70 34 22 62 32-12v156h132V164l32 12 22-62-70-34c-8 22-28 34-50 34s-42-12-50-34z" fill="C"/><path d="M150 80c8 22 28 34 50 34s42-12 50-34" fill="none" stroke="D" stroke-width="6"/>',
    hoodie: '<path d="M140 92l-70 40 26 150 38-10v58h132v-58l38 10 26-150-70-40c-10-26-40-30-60-30s-50 4-60 30z" fill="C"/><path d="M160 96c0 40 80 40 80 0" fill="D" opacity=".5"/><path d="M186 140v40M214 140v40" stroke="L" stroke-width="5"/><rect x="160" y="250" width="80" height="40" rx="8" fill="D" opacity=".35"/>',
    jeans: '<path d="M138 70h124l14 260h-62l-14-180-14 180h-62z" fill="C"/><path d="M138 96h124" stroke="D" stroke-width="6"/><path d="M176 70v40M224 70v40" stroke="L" stroke-width="3" opacity=".6"/>',
    jacket: '<path d="M146 80l-66 40 18 196h204l18-196-66-40-54 70z" fill="C"/><path d="M200 150v166" stroke="D" stroke-width="6"/><path d="M146 80l54 70 54-70" fill="none" stroke="D" stroke-width="8"/><rect x="128" y="226" width="44" height="8" rx="4" fill="D"/><rect x="228" y="226" width="44" height="8" rx="4" fill="D"/>',
    sneaker: '<path d="M60 250c0-30 10-60 40-70l60-30 40 40c30 16 80 26 120 30 20 2 30 14 30 30v24H60z" fill="C"/><rect x="60" y="270" width="290" height="26" rx="10" fill="#f3f4f6" stroke="#d1d5db" stroke-width="3"/><path d="M150 168l20 22M170 160l20 22M190 154l20 22" stroke="#fff" stroke-width="6"/>',
    cap: '<path d="M90 230c0-80 50-120 110-120s110 40 110 120z" fill="C"/><path d="M300 228c40 4 70 16 70 30-40 10-120 6-180-2" fill="D"/><circle cx="200" cy="112" r="10" fill="D"/>',
    dress: '<path d="M170 70h60l-6 60 70 196H106l70-196z" fill="C"/><path d="M164 132h72" stroke="D" stroke-width="10"/><path d="M176 70l-20-20M224 70l20-20" stroke="D" stroke-width="5"/>',
    bag: '<rect x="96" y="150" width="208" height="170" rx="22" fill="C"/><path d="M150 150v-24c0-30 22-50 50-50s50 20 50 50v24" fill="none" stroke="D" stroke-width="12"/><rect x="176" y="200" width="48" height="26" rx="6" fill="D"/>',
    lipstick: '<rect x="166" y="210" width="68" height="120" rx="10" fill="#1f2433"/><rect x="172" y="170" width="56" height="48" rx="6" fill="#c9a24a"/><path d="M178 170v-60c0-14 10-26 22-30l22 30v60z" fill="C"/>',
    serum: '<rect x="146" y="150" width="108" height="180" rx="18" fill="C" opacity=".88"/><rect x="164" y="214" width="72" height="62" rx="6" fill="#fff" opacity=".85"/><rect x="176" y="110" width="48" height="44" rx="6" fill="#1f2433"/><rect x="188" y="62" width="24" height="54" rx="12" fill="#1f2433"/>',
    cream: '<rect x="110" y="190" width="180" height="110" rx="20" fill="#fff" stroke="L" stroke-width="5"/><rect x="104" y="160" width="192" height="44" rx="14" fill="C"/><rect x="150" y="232" width="100" height="36" rx="6" fill="L"/>',
    perfume: '<rect x="130" y="160" width="140" height="160" rx="24" fill="L" stroke="C" stroke-width="6"/><rect x="176" y="118" width="48" height="46" rx="6" fill="#c9a24a"/><rect x="166" y="86" width="68" height="36" rx="10" fill="#1f2433"/><rect x="158" y="214" width="84" height="44" rx="6" fill="#fff" opacity=".8"/>',
    palette: '<rect x="70" y="130" width="260" height="150" rx="18" fill="#1f2433"/>' + Array.from({ length: 8 }, (_, k) => '<circle cx="' + (112 + (k % 4) * 58) + '" cy="' + (176 + Math.floor(k / 4) * 60) + '" r="22" fill="' + ['C', 'L', 'D', '#e8b89a', '#c98b6b', '#f3d2c1', 'C', '#8a5a44'][k] + '"/>').join(''),
    mascara: '<rect x="184" y="120" width="32" height="210" rx="16" fill="C"/><rect x="184" y="80" width="32" height="50" rx="10" fill="#1f2433"/><path d="M200 80v-30" stroke="#1f2433" stroke-width="6"/>',
    box: '<path d="M90 150l110-50 110 50v130l-110 50-110-50z" fill="#d6a865"/><path d="M90 150l110 50 110-50M200 200v130" stroke="#b9884a" stroke-width="5" fill="none"/><rect x="226" y="226" width="56" height="34" fill="C" transform="skewY(-24) translate(0 110)"/>',
    bottle: '<path d="M176 70h48v40c22 14 30 30 30 56v150c0 10-8 18-18 18h-72c-10 0-18-8-18-18V166c0-26 8-42 30-56z" fill="C" opacity=".85"/><rect x="146" y="200" width="108" height="70" fill="#fff" opacity=".85"/><rect x="176" y="58" width="48" height="18" rx="4" fill="D"/>',
    sack: '<path d="M120 110c40-20 120-20 160 0l20 200c-60 26-140 26-200 0z" fill="#e9dcc2"/><path d="M128 110c40 14 104 14 144 0" stroke="#c9b48c" stroke-width="8" fill="none"/><rect x="150" y="190" width="100" height="70" rx="8" fill="C"/>',
    can: '<rect x="140" y="100" width="120" height="220" rx="16" fill="C"/><rect x="140" y="100" width="120" height="22" rx="10" fill="#c9ced8"/><rect x="140" y="298" width="120" height="22" rx="10" fill="#c9ced8"/><rect x="140" y="170" width="120" height="70" fill="#fff" opacity=".8"/>',
    pack: '<rect x="80" y="140" width="240" height="170" rx="14" fill="#fff" stroke="#d1d5db" stroke-width="4"/>' + [0, 1, 2].map((k) => '<circle cx="' + (130 + k * 70) + '" cy="200" r="30" fill="#f3f4f6" stroke="#d1d5db" stroke-width="3"/>').join('') + '<rect x="80" y="252" width="240" height="40" fill="C"/>'
  };
  CA.ART_KINDS = Object.keys(ART);

  const cache = {};
  /** URL de datos SVG para una referencia 'art:tipo:color[:variante]'. */
  CA.art = function (ref) {
    if (cache[ref]) return cache[ref];
    const parts = String(ref).split(':');
    const kind = ART[parts[1]] ? parts[1] : 'box';
    const color = /^#[0-9a-f]{6}$/i.test(parts[2] || '') ? parts[2] : '#6366f1';
    const v = Number(parts[3]) || 1;
    const L = shade(color, 0.32), D = shade(color, -0.22);
    const bg1 = v === 3 ? shade(color, 0.5) : shade(color, 0.44), bg2 = v === 3 ? shade(color, 0.3) : '#ffffff';
    const body = ART[kind].replace(/"C"/g, '"' + color + '"').replace(/"D"/g, '"' + D + '"').replace(/"L"/g, '"' + L + '"');
    const zoom = v === 2 ? 'translate(-90 -70) scale(1.45)' : '';
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">' +
      '<defs><radialGradient id="bg" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="' + bg2 + '"/><stop offset="1" stop-color="' + bg1 + '"/></radialGradient>' +
      '<linearGradient id="scr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + color + '"/><stop offset=".6" stop-color="' + D + '"/><stop offset="1" stop-color="#0b1020"/></linearGradient></defs>' +
      '<rect width="400" height="400" fill="url(#bg)"/>' +
      '<ellipse cx="200" cy="340" rx="140" ry="16" fill="#000" opacity=".08"/>' +
      '<g transform="' + zoom + '">' + body + '</g></svg>';
    cache[ref] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    return cache[ref];
  };

  /** Imagen de respaldo para productos sin foto o con referencias rotas. */
  CA.FALLBACK_IMG = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#eef1f6"/><path d="M150 170h100v80H150z" fill="none" stroke="#b6bfcf" stroke-width="8" stroke-linejoin="round"/><circle cx="178" cy="196" r="10" fill="#b6bfcf"/><path d="M156 244l30-30 24 22 18-16 22 24" fill="none" stroke="#b6bfcf" stroke-width="8" stroke-linejoin="round"/><text x="200" y="300" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#8e98ab">Sin imagen</text></svg>');

  /** Resuelve cualquier referencia de imagen (art:, data:, http) a una URL usable. */
  CA.imgSrc = function (ref) {
    if (!ref) return CA.FALLBACK_IMG;
    if (String(ref).startsWith('art:')) return CA.art(ref);
    return ref;
  };
  /** Atributo onerror para reemplazar imágenes rotas por la de respaldo. */
  CA.imgFallbackAttr = 'onerror="this.onerror=null;this.src=CA.FALLBACK_IMG"';
})();
