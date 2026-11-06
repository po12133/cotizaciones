/*
 * CorePoints · notifications.js
 * Centro de notificaciones simulado: registra cada evento y genera la vista previa
 * del correo y del mensaje de WhatsApp. No se envía nada real.
 */
(function () {
  'use strict';
  const CP = (window.CP = window.CP || {});
  const u = CP.util;

  const EVENTS = {
    compra_registrada: { label: 'Compra registrada', icon: 'receipt', tone: 'info' },
    compra_aprobada: { label: 'Compra aprobada', icon: 'check', tone: 'ok' },
    compra_rechazada: { label: 'Compra rechazada', icon: 'x', tone: 'bad' },
    puntos_acreditados: { label: 'Puntos acreditados', icon: 'coins', tone: 'ok' },
    puntos_por_vencer: { label: 'Puntos próximos a vencer', icon: 'clock', tone: 'warn' },
    puntos_vencidos: { label: 'Puntos vencidos', icon: 'clock', tone: 'bad' },
    canje_solicitado: { label: 'Canje solicitado', icon: 'gift', tone: 'info' },
    canje_aprobado: { label: 'Canje aprobado', icon: 'check', tone: 'ok' },
    canje_listo: { label: 'Recompensa lista para recoger', icon: 'store', tone: 'accent' },
    canje_entregado: { label: 'Recompensa entregada', icon: 'check', tone: 'ok' },
    canje_rechazado: { label: 'Canje rechazado', icon: 'x', tone: 'bad' },
    canje_cancelado: { label: 'Canje cancelado', icon: 'x', tone: 'neutral' },
    ajuste: { label: 'Ajuste de puntos', icon: 'sliders', tone: 'neutral' }
  };

  const N = (CP.notifications = { EVENTS });

  N.push = function (db, event, data) {
    const now = data.at ? u.toDate(data.at) : CP.now();
    const c = CP.customers.get(db, data.customerId);
    const payload = Object.assign({}, data);
    delete payload.at;
    const n = {
      id: u.uid('NOT', 10),
      event,
      customerId: data.customerId,
      channels: c && c.email ? ['whatsapp', 'email'] : ['whatsapp'],
      data: payload,
      at: now.toISOString(),
      read: false
    };
    db.notifications.push(n);
    return n;
  };

  /** Arma el contenido (asunto, titular, cuerpo, CTA) a partir de la BD actual. */
  N.content = function (db, n) {
    const c = CP.customers.get(db, n.customerId) || { name: 'Cliente', phone: '' };
    const first = c.name.split(' ')[0];
    const d = n.data || {};
    const p = d.purchaseId ? CP.purchases.get(db, d.purchaseId) : null;
    const r = d.redemptionId ? CP.redemptions.get(db, d.redemptionId) : null;
    const bal = CP.points.available(db, n.customerId);
    const rows = [];
    let subject, title, body, cta = 'Ver mis CorePoints', highlight = null;
    switch (n.event) {
      case 'compra_registrada':
        subject = 'Recibimos tu boleta' + (p ? ' · ' + p.id : '');
        title = '¡Recibimos tu compra!';
        body = 'Hola ' + first + ', recibimos la foto de tu boleta. La revisaremos y te avisaremos cuando tus CorePoints estén acreditados.';
        if (p) rows.push(['Solicitud', p.id], ['Recibida', u.dateTime(p.createdAt)], ['Estado', 'Pendiente de verificación']);
        cta = 'Consultar estado';
        break;
      case 'compra_aprobada':
        subject = 'Tu compra fue verificada ✔';
        title = 'Compra verificada';
        body = 'Hola ' + first + ', verificamos tu boleta' + (p ? ' ' + p.receiptNo : '') + '. ¡Gracias por comprar en CatCore!';
        if (p) rows.push(['Boleta', p.receiptNo], ['Monto validado', u.bs(p.validatedAmount)], ['Te atendió', CP.sellers.name(db, p.validatedSellerId || p.sellerId)]);
        break;
      case 'compra_rechazada':
        subject = 'No pudimos verificar tu boleta';
        title = 'Tu boleta necesita revisión';
        body = 'Hola ' + first + ', no pudimos validar la boleta de tu solicitud' + (p ? ' ' + p.id : '') + '. Motivo: ' + (d.reason || 'sin detalle') + '.' + (d.notes ? ' ' + d.notes : '') + ' Puedes escribirnos por WhatsApp o registrarla nuevamente con una foto clara.';
        cta = 'Registrar de nuevo';
        break;
      case 'puntos_acreditados':
        subject = '¡Sumaste ' + u.num(d.points) + ' CorePoints!';
        title = '+' + u.num(d.points) + ' CorePoints';
        highlight = '+' + u.num(d.points);
        body = 'Hola ' + first + ', acreditamos tus CorePoints' + (d.bonus ? ' (incluye ' + d.bonus + ' de bono de bienvenida)' : '') + '. Úsalos antes del ' + u.date(d.expiresAt) + '.';
        rows.push(['Saldo disponible', u.pts(bal)], ['Vencen el', u.date(d.expiresAt)]);
        cta = 'Ver recompensas';
        break;
      case 'puntos_por_vencer':
        subject = '⏰ ' + u.num(d.points) + ' CorePoints vencen pronto';
        title = 'Tus puntos están por vencer';
        highlight = u.num(d.points);
        body = 'Hola ' + first + ', tienes ' + u.num(d.points) + ' CorePoints que vencen el ' + u.date(d.expiresAt) + '. ¡Canjéalos por accesorios o servicios antes de perderlos!';
        rows.push(['Saldo disponible', u.pts(bal)]);
        cta = 'Canjear ahora';
        break;
      case 'puntos_vencidos':
        subject = 'Venció parte de tus CorePoints';
        title = 'Puntos vencidos';
        body = 'Hola ' + first + ', ' + u.num(d.points) + ' CorePoints vencieron el ' + u.date(d.expiresAt) + '. Sigue sumando con tus próximas compras.';
        rows.push(['Saldo disponible', u.pts(bal)]);
        break;
      case 'canje_solicitado':
        subject = 'Solicitud de canje ' + (r ? r.code : '');
        title = 'Recibimos tu solicitud de canje';
        body = 'Hola ' + first + ', reservamos tus puntos para ' + (r ? r.rewardName : 'tu recompensa') + '. Te avisaremos cuando sea aprobada.';
        if (r) rows.push(['Código', r.code], ['Recompensa', r.rewardName], ['Puntos reservados', u.pts(r.points)]);
        cta = 'Ver mis canjes';
        break;
      case 'canje_aprobado':
        subject = 'Canje aprobado: ' + (r ? r.rewardName : '');
        title = '¡Canje aprobado!';
        body = 'Hola ' + first + ', aprobamos tu canje. Te avisaremos cuando esté listo para recoger en tienda.';
        if (r) rows.push(['Código', r.code], ['Recompensa', r.rewardName], ['Puntos utilizados', u.pts(r.points)]);
        cta = 'Ver mis canjes';
        break;
      case 'canje_listo':
        subject = '🎁 Tu recompensa está lista para recoger';
        title = 'Lista para recoger';
        highlight = r ? r.code : null;
        body = 'Hola ' + first + ', ' + (r ? r.rewardName : 'tu recompensa') + ' te espera en la tienda CatCore. Presenta este código y tu carnet de identidad.';
        if (r) rows.push(['Código', r.code], ['Recompensa', r.rewardName]);
        cta = 'Cómo llegar';
        break;
      case 'canje_entregado':
        subject = 'Recompensa entregada';
        title = '¡Disfrútala!';
        body = 'Hola ' + first + ', registramos la entrega de ' + (r ? r.rewardName : 'tu recompensa') + '. Gracias por ser parte de CorePoints.';
        break;
      case 'canje_rechazado':
      case 'canje_cancelado':
        subject = n.event === 'canje_rechazado' ? 'Tu canje fue rechazado' : 'Tu canje fue cancelado';
        title = n.event === 'canje_rechazado' ? 'Canje rechazado' : 'Canje cancelado';
        body = 'Hola ' + first + ', ' + (n.event === 'canje_rechazado' ? 'no pudimos aprobar' : 'se canceló') + ' el canje de ' + (r ? r.rewardName : 'tu recompensa') + '. Motivo: ' + (d.reason || '—') + '. Devolvimos ' + (r ? u.pts(r.points) : 'los puntos') + ' a tu saldo.';
        rows.push(['Saldo disponible', u.pts(bal)]);
        break;
      case 'ajuste':
        subject = 'Actualizamos tu saldo de CorePoints';
        title = 'Ajuste de saldo';
        highlight = (d.delta > 0 ? '+' : '') + u.num(d.delta);
        body = 'Hola ' + first + ', realizamos un ajuste de ' + (d.delta > 0 ? '+' : '') + u.num(d.delta) + ' CorePoints. Motivo: ' + d.reason + '.';
        rows.push(['Saldo disponible', u.pts(bal)]);
        break;
      default:
        subject = 'CorePoints'; title = 'CorePoints'; body = '';
    }
    return { subject, title, body, rows, cta, highlight, customer: c };
  };

  /** Texto plano para WhatsApp. */
  N.whatsapp = function (db, n) {
    const k = N.content(db, n);
    return '*CorePoints · CatCore*\n\n' + k.body + (k.rows.length ? '\n\n' + k.rows.map((r) => '• ' + r[0] + ': ' + r[1]).join('\n') : '') + '\n\n👉 catcorebo.com/corepoints';
  };

  /** HTML del correo (plantilla tabular compatible con clientes de correo). */
  N.emailHtml = function (db, n, logoUrl) {
    const k = N.content(db, n);
    const e = u.esc;
    const rows = k.rows.map((r) => '<tr><td style="padding:9px 0;color:#8a90a8;font-size:14px;border-bottom:1px solid #262a40">' + e(r[0]) + '</td><td style="padding:9px 0;text-align:right;color:#fff;font-weight:700;font-size:14px;border-bottom:1px solid #262a40">' + e(r[1]) + '</td></tr>').join('');
    return '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>' + e(k.subject) + '</title></head>' +
      '<body style="margin:0;background:#0b0d17;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#d7dbea">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0d17;padding:28px 12px"><tr><td align="center">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#151829;border-radius:18px;overflow:hidden;border:1px solid #23284a">' +
      '<tr><td style="padding:22px 28px;background:linear-gradient(120deg,#11142a,#1b1f3d);border-bottom:2px solid #00dce7">' +
      '<table width="100%"><tr><td>' + (logoUrl ? '<img src="' + e(logoUrl) + '" alt="CatCore" height="44" style="display:block;height:44px">' : '<b style="color:#00dce7;font-size:20px">CatCore</b>') + '</td>' +
      '<td align="right" style="font-weight:800;letter-spacing:.08em;font-size:13px;color:#f277d7">CORE<span style="color:#00dce7">POINTS</span></td></tr></table></td></tr>' +
      '<tr><td style="padding:32px 28px 8px">' +
      (k.highlight ? '<div style="font-size:40px;font-weight:800;color:#00dce7;letter-spacing:-.02em;margin-bottom:6px">' + e(k.highlight) + '</div>' : '') +
      '<h1 style="margin:0 0 12px;font-size:24px;color:#fff">' + e(k.title) + '</h1>' +
      '<p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#c3c8dc">' + e(k.body) + '</p>' +
      (rows ? '<table width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 20px">' + rows + '</table>' : '') +
      '<a href="#" style="display:inline-block;background:#00dce7;color:#0b0d17;text-decoration:none;font-weight:800;padding:13px 26px;border-radius:999px;font-size:15px">' + e(k.cta) + '</a>' +
      '</td></tr>' +
      '<tr><td style="padding:26px 28px;color:#6d7391;font-size:12px;line-height:1.6">CatCore · Rendimiento que domina · catcorebo.com<br>Recibes este mensaje porque registraste una compra en CorePoints. Los puntos vencen ' + db.config.validityMonths + ' meses después de su acreditación.</td></tr>' +
      '</table></td></tr></table></body></html>';
  };

  N.forCustomer = (db, cid) => db.notifications.filter((n) => n.customerId === cid).sort(u.byDateDesc('at'));
})();
