/*
 * Configuración general de la propuesta comercial.
 * Todos los importes están en bolivianos (Bs) y son REFERENCIALES: modifíquelos aquí.
 * Los precios de módulos están en js/modules.js y los planes en js/plans.js.
 */
(function (root) {
  const CONFIG = {
    empresa: {
      nombre: 'Amicornios Soft',
      producto: 'WhatsApp Bot',
      productoLargo: 'WhatsApp Bot — Plataforma de Automatización Comercial',
      sitio: 'soft.amicornios.com',
      correo: 'vargascarlos12123@gmail.com',
      telefono: '+591 71450557',
      whatsapp: '59171450557',
      ciudad: 'Bolivia',
      nit: '[Por completar]'
    },

    moneda: { simbolo: 'Bs', codigo: 'BOB', tipoCambioUSD: 6.96 },

    // Prefijo del número de cotización: COT-WAB-AAAAMMDD-NNN
    prefijoCotizacion: 'COT-WAB',
    validezDias: 15,

    // Modalidades de suscripción. El descuento aplica SOLO a la suscripción.
    periodos: [
      { id: 'mensual', nombre: 'Mensual', meses: 1, descuento: 0 },
      { id: 'trimestral', nombre: 'Trimestral', meses: 3, descuento: 5 },
      { id: 'semestral', nombre: 'Semestral', meses: 6, descuento: 10 },
      { id: 'anual', nombre: 'Anual', meses: 12, descuento: 20 }
    ],

    // Descuento promocional adicional (sobre la suscripción) permitido en el cotizador.
    descuentoPromocionalMaximo: 15,
    // Tope de la suma de descuentos (periodo + promocional).
    descuentoTotalMaximo: 35,

    // Asesores (usuarios del chat humano). Los primeros N están incluidos.
    asesores: { incluidos: 2, maximo: 50, precioAdicionalMensual: 39 },

    // Contactos activos estimados por mes. Recargo mensual por tramo.
    tramosContactos: [
      { hasta: 1000, recargoMensual: 0, etiqueta: 'Hasta 1.000 contactos' },
      { hasta: 5000, recargoMensual: 49, etiqueta: '1.001 a 5.000 contactos' },
      { hasta: 20000, recargoMensual: 99, etiqueta: '5.001 a 20.000 contactos' },
      { hasta: Infinity, recargoMensual: null, etiqueta: 'Más de 20.000 contactos (a medida)' }
    ],

    // Plazo estimado: días base + días de cada módulo × factor de trabajo en paralelo.
    plazo: { factorParalelo: 0.7, minimoDias: 7, margen: 0.2 },

    condicionesPago: [
      '50% de la implementación al firmar la orden de trabajo y 50% a la entrega en producción.',
      'La suscripción se factura por adelantado al inicio de cada periodo contratado.',
      'Pagos por transferencia bancaria o QR. Los importes no incluyen impuestos salvo indicación expresa.'
    ],

    // Costos de terceros: se muestran separados y NO se suman al total.
    costosExternos: [
      { nombre: 'Meta — WhatsApp Business Platform', detalle: 'Cargos por conversación/mensaje según la tarifa vigente de Meta para Bolivia y la categoría de cada plantilla. Se pagan directamente a Meta con la tarjeta del cliente.' },
      { nombre: 'Proveedor de IA (modelo de lenguaje)', detalle: 'Consumo por tokens según el proveedor elegido. Se configura un límite mensual para controlar el gasto.' },
      { nombre: 'Número telefónico y verificación', detalle: 'Línea dedicada para WhatsApp Business y, si corresponde, verificación del negocio en Meta Business Manager.' },
      { nombre: 'Dominio y servicios web opcionales', detalle: 'Dominio propio para el catálogo web, correo corporativo u otras integraciones de terceros.' }
    ],

    exclusiones: [
      'Costos de Meta, del proveedor de IA y de otros servicios externos (se facturan aparte por cada proveedor).',
      'Diseño gráfico, fotografía de productos y redacción de contenidos extensos.',
      'Integraciones con sistemas de terceros (ERP, facturación, pasarelas de pago) no descritas en el alcance.',
      'Migración masiva de datos desde otras plataformas.',
      'Personalizaciones adicionales: se cotizan por separado bajo presupuesto.'
    ],

    condicionesSoporte: [
      'Soporte por WhatsApp y correo en días hábiles de 08:30 a 18:30 (hora de Bolivia).',
      'Tiempo de primera respuesta: hasta 8 horas hábiles; incidentes críticos: hasta 4 horas hábiles.',
      'Mantenimiento correctivo, actualizaciones de seguridad y copias de respaldo incluidos en la suscripción.',
      'Capacitación inicial de hasta 2 horas para el equipo del cliente.'
    ],

    politicasRenovacion: [
      'La suscripción se renueva al final de cada periodo con el mismo precio, salvo aviso con 30 días de anticipación.',
      'El cliente puede cambiar de modalidad (mensual, trimestral, semestral o anual) en cada renovación.',
      'La falta de pago por más de 15 días suspende el servicio; los datos se conservan durante 60 días.'
    ],

    limitesUso: [
      'Asesores y contactos activos según lo configurado en esta cotización.',
      'Uso razonable del almacenamiento de archivos multimedia (hasta 5 GB).',
      'Los límites de mensajes los fija Meta según el nivel de calidad del número.'
    ],

    notaPrototipos: 'Los prototipos son demostraciones visuales e interactivas con datos ficticios. WhatsApp, la IA, los pagos y los envíos se simulan; no representan funcionalidades ya implementadas en producción.'
  };

  root.WAB = root.WAB || {};
  root.WAB.CONFIG = CONFIG;
  if (typeof module !== 'undefined') module.exports = CONFIG;
})(typeof window !== 'undefined' ? window : globalThis);
