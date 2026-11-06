/*
 * WhatsApp: mensajes con variables y enlaces reales wa.me.
 * Variables: {producto} {precio} {sku} {catalogo} {url} {vendedor}
 */
(function () {
  'use strict';
  const CA = (window.CA = window.CA || {});
  const u = CA.util;
  const W = (CA.wa = {});

  W.VARIABLES = ['{producto}', '{precio}', '{sku}', '{catalogo}', '{url}', '{vendedor}'];

  /** Normaliza un número con código de país; devuelve solo dígitos o ''. */
  W.normalize = function (v) {
    const d = String(v || '').replace(/\D/g, '').replace(/^00/, '');
    return d.length >= 10 && d.length <= 15 ? d : '';
  };
  W.format = (d) => (d ? '+' + d.slice(0, 3) + ' ' + d.slice(3) : '—');

  W.fill = function (tpl, vars) {
    return String(tpl || '').replace(/\{(producto|precio|sku|catalogo|url|vendedor)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
  };

  W.productVars = function (p, catalogName, url, seller) {
    return { producto: p.name, precio: u.money(p.offer || p.price), sku: p.sku, catalogo: catalogName, url: url || '', vendedor: seller || '' };
  };

  /** Enlace real de WhatsApp (abre la app o WhatsApp Web). */
  W.link = function (number, text) {
    const n = W.normalize(number);
    return 'https://wa.me/' + n + (text ? '?text=' + encodeURIComponent(text) : '');
  };

  /** Mensaje único con la lista de consulta (sin carrito ni pagos). */
  W.listText = function (intro, items, catalogName, url) {
    const lines = items.map((it, i) => (i + 1) + '. ' + it.product.name + ' (' + it.product.sku + ')' + (it.qty > 1 ? ' × ' + it.qty : '') + ' — ' + u.money(it.product.offer || it.product.price));
    const total = items.reduce((a, it) => a + (it.product.offer || it.product.price) * it.qty, 0);
    return W.fill(intro, { catalogo: catalogName, url }) + '\n\n' + lines.join('\n') + '\n\nTotal referencial: ' + u.money(total) + '\n' + url;
  };
})();
