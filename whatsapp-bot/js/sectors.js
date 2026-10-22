/*
 * Ejemplos por sector comercial: guion de demostración para la landing y un "preset"
 * que el simulador de WhatsApp puede cargar (prototipos/whatsapp.html?sector=<id>).
 * Todos los nombres de negocios son ficticios.
 */
(function (root) {
  const SECTORS = [
    {
      id: 'clinica', nombre: 'Clínicas', icon: 'stethoscope', tono: 'info',
      titulo: 'Clínica que agenda sola, incluso de madrugada',
      resumen: 'Pacientes que reservan, confirman y reprograman por WhatsApp; recepción que solo atiende los casos que lo necesitan.',
      beneficios: ['Reservas por especialidad con horarios reales', 'Recordatorios 24 h antes para reducir inasistencias', 'Respuestas sobre seguros, precios y preparación de estudios', 'Derivación a recepción con el historial completo'],
      modulos: ['automatizacion', 'citas', 'ia', 'chat', 'crm'], plan: 'profesional',
      guion: [
        { de: 'user', texto: 'Hola, quiero una cita con pediatría' },
        { de: 'bot', texto: 'Hola, soy el asistente de Clínica San Gabriel. Elija el horario disponible para Pediatría:', lista: ['Jue 23 · 09:00', 'Jue 23 · 10:30', 'Vie 24 · 16:00'] },
        { de: 'user', texto: 'Jue 23 · 10:30' },
        { de: 'bot', texto: 'Cita confirmada con la Dra. Paredes el jueves 23 a las 10:30. Le enviaré un recordatorio un día antes.', botones: ['Ver ubicación', 'Reprogramar'] }
      ],
      preset: {
        negocio: 'Clínica San Gabriel', rubro: 'Salud',
        bienvenida: 'Hola, le saluda el asistente virtual de Clínica San Gabriel. ¿En qué podemos ayudarle hoy?',
        servicios: [
          { nombre: 'Consulta de pediatría', duracion: 30, precio: 180 },
          { nombre: 'Medicina general', duracion: 20, precio: 120 },
          { nombre: 'Ecografía abdominal', duracion: 40, precio: 250 },
          { nombre: 'Control de laboratorio', duracion: 15, precio: 90 }
        ],
        faqs: [
          { pregunta: '¿Atienden con seguro?', respuesta: 'Trabajamos con los principales seguros privados. Traiga su carnet y la orden médica el día de la cita.', claves: 'seguro, aseguradora, carnet, cobertura' },
          { pregunta: '¿Necesito ayuno para laboratorio?', respuesta: 'Para análisis de sangre se recomienda un ayuno de 8 a 12 horas. Puede tomar agua.', claves: 'ayuno, laboratorio, sangre, análisis' }
        ]
      }
    },
    {
      id: 'gimnasio', nombre: 'Gimnasios', icon: 'dumbbell', tono: 'warn',
      titulo: 'Gimnasio que vende membresías y llena las clases',
      resumen: 'Socios que reservan cupos, renuevan su plan y reciben recordatorios de vencimiento sin escribir a recepción.',
      beneficios: ['Reserva de cupos en clases grupales', 'Renovación de membresías con pago por QR', 'Avisos automáticos de vencimiento', 'Campañas para reactivar socios inactivos'],
      modulos: ['automatizacion', 'citas', 'ventas', 'catalogo', 'campanas'], plan: 'comercio',
      guion: [
        { de: 'user', texto: 'Quiero reservar spinning mañana' },
        { de: 'bot', texto: 'Clases de spinning para mañana en Pulso Fitness:', lista: ['07:00 · 4 cupos', '18:30 · 2 cupos', '20:00 · 9 cupos'] },
        { de: 'user', texto: '18:30 · 2 cupos' },
        { de: 'bot', texto: 'Listo, su cupo de las 18:30 está reservado. Su membresía vence en 5 días, ¿desea renovarla ahora?', botones: ['Renovar mensual', 'Más tarde'] }
      ],
      preset: {
        negocio: 'Pulso Fitness', rubro: 'Gimnasio',
        bienvenida: '¡Hola! Bienvenido a Pulso Fitness. Reserve clases, consulte planes o hable con un entrenador.',
        servicios: [
          { nombre: 'Clase de spinning', duracion: 45, precio: 0 },
          { nombre: 'Funcional HIIT', duracion: 50, precio: 0 },
          { nombre: 'Evaluación física', duracion: 30, precio: 80 },
          { nombre: 'Entrenamiento personal', duracion: 60, precio: 150 }
        ],
        faqs: [
          { pregunta: '¿Cuánto cuesta la mensualidad?', respuesta: 'El plan mensual libre cuesta Bs 280 y el trimestral Bs 750. Ambos incluyen clases grupales.', claves: 'precio, mensualidad, plan, costo, membresía' },
          { pregunta: '¿Qué horarios tienen?', respuesta: 'Abrimos de lunes a viernes de 06:00 a 22:00 y sábados de 08:00 a 14:00.', claves: 'horario, abren, hora, atención' }
        ]
      }
    },
    {
      id: 'tienda', nombre: 'Tiendas comerciales', icon: 'store', tono: 'brand',
      titulo: 'Tienda que vende por WhatsApp con catálogo y QR',
      resumen: 'Clientes que ven productos, arman el carrito, pagan con QR y siguen su pedido sin salir del chat.',
      beneficios: ['Catálogo con precios, variantes y stock', 'Carrito y pedido dentro del chat', 'Cobro con QR y carga de comprobante', 'Notificación de envío y entrega'],
      modulos: ['automatizacion', 'catalogo', 'ventas', 'web', 'chat'], plan: 'comercio',
      guion: [
        { de: 'user', texto: 'Hola, ¿tienen zapatillas talla 40?' },
        { de: 'bot', texto: 'Sí, estas son las disponibles en talla 40:', lista: ['Urban Run · Bs 420', 'Trail Pro · Bs 560', 'Classic Low · Bs 310'] },
        { de: 'user', texto: 'Urban Run · Bs 420' },
        { de: 'bot', texto: 'Agregué Urban Run talla 40 a su carrito. Total: Bs 420. ¿Cómo desea recibirlo?', botones: ['Envío a domicilio', 'Retiro en tienda'] }
      ],
      preset: {
        negocio: 'Nativa Store', rubro: 'Tienda',
        bienvenida: 'Hola, bienvenido a Nativa Store. Vea nuestro catálogo, arme su pedido y pague con QR.',
        servicios: [{ nombre: 'Asesoría de compra', duracion: 20, precio: 0 }],
        faqs: [
          { pregunta: '¿Hacen envíos?', respuesta: 'Enviamos a todo el país. En la ciudad el envío llega en 24 horas; a otros departamentos en 2 a 3 días hábiles.', claves: 'envío, envios, delivery, entrega, departamentos' },
          { pregunta: '¿Puedo cambiar un producto?', respuesta: 'Sí, tiene 7 días para cambios con la etiqueta y la nota de venta.', claves: 'cambio, devolución, garantía' }
        ]
      }
    },
    {
      id: 'inmobiliaria', nombre: 'Inmobiliarias', icon: 'building', tono: 'accent',
      titulo: 'Inmobiliaria que califica prospectos antes de llamar',
      resumen: 'El bot pregunta presupuesto, zona y tipo de inmueble, muestra opciones y agenda visitas con el asesor indicado.',
      beneficios: ['Calificación automática de prospectos', 'Fichas de inmuebles con fotos', 'Agenda de visitas por asesor', 'Seguimiento comercial en el CRM'],
      modulos: ['automatizacion', 'ia', 'crm', 'citas', 'chat'], plan: 'profesional',
      guion: [
        { de: 'user', texto: 'Busco departamento en alquiler' },
        { de: 'bot', texto: '¿En qué zona y con qué presupuesto mensual?', lista: ['Equipetrol · hasta Bs 4.000', 'Zona Norte · hasta Bs 3.000', 'Centro · hasta Bs 2.500'] },
        { de: 'user', texto: 'Equipetrol · hasta Bs 4.000' },
        { de: 'bot', texto: 'Tengo 3 departamentos que cumplen. ¿Agendamos una visita con la asesora Lucía?', botones: ['Ver opciones', 'Agendar visita'] }
      ],
      preset: {
        negocio: 'Habitat Inmobiliaria', rubro: 'Bienes raíces',
        bienvenida: 'Hola, soy el asistente de Habitat Inmobiliaria. Le ayudo a encontrar su próximo hogar.',
        servicios: [
          { nombre: 'Visita a inmueble', duracion: 45, precio: 0 },
          { nombre: 'Asesoría de crédito', duracion: 30, precio: 0 },
          { nombre: 'Tasación de propiedad', duracion: 60, precio: 600 }
        ],
        faqs: [
          { pregunta: '¿Qué requisitos piden para alquilar?', respuesta: 'Carnet de identidad, garante o depósito de un mes y contrato notariado.', claves: 'requisitos, alquiler, alquilar, garante, depósito' },
          { pregunta: '¿Cobran comisión?', respuesta: 'La comisión de alquiler equivale a medio mes de renta y la paga el propietario.', claves: 'comisión, cobran, honorarios' }
        ]
      }
    },
    {
      id: 'instituto', nombre: 'Institutos educativos', icon: 'graduation', tono: 'info',
      titulo: 'Instituto que inscribe y responde dudas todo el año',
      resumen: 'Información de carreras, costos y fechas al instante; preinscripción por WhatsApp y recordatorios de pago.',
      beneficios: ['Oferta académica navegable por listas', 'Preinscripción con formulario en el chat', 'Recordatorios de cuotas y fechas', 'IA para preguntas frecuentes de postulantes'],
      modulos: ['automatizacion', 'ia', 'crm', 'campanas'], plan: 'profesional',
      guion: [
        { de: 'user', texto: '¿Cuándo empiezan las clases de diseño gráfico?' },
        { de: 'bot', texto: 'El próximo grupo de Diseño Gráfico inicia el 3 de noviembre, turno noche. La matrícula es Bs 350.', botones: ['Preinscribirme', 'Ver plan de estudios'] },
        { de: 'user', texto: 'Preinscribirme' },
        { de: 'bot', texto: 'Perfecto. Complete el formulario y una asesora académica le contactará hoy.', botones: ['Abrir formulario'] }
      ],
      preset: {
        negocio: 'Instituto Horizonte', rubro: 'Educación',
        bienvenida: 'Hola, bienvenido al Instituto Horizonte. Consulte carreras, costos e inscripciones.',
        servicios: [
          { nombre: 'Entrevista de admisión', duracion: 30, precio: 0 },
          { nombre: 'Clase de prueba', duracion: 60, precio: 0 },
          { nombre: 'Orientación vocacional', duracion: 45, precio: 100 }
        ],
        faqs: [
          { pregunta: '¿Cuánto cuesta la mensualidad?', respuesta: 'Las carreras técnicas tienen una cuota mensual de Bs 480 y una matrícula semestral de Bs 350.', claves: 'mensualidad, costo, precio, cuota, matrícula' },
          { pregunta: '¿Entregan certificado?', respuesta: 'Sí, al concluir se entrega un título de Técnico Medio avalado por el Ministerio de Educación.', claves: 'certificado, título, aval' }
        ]
      }
    },
    {
      id: 'agencia', nombre: 'Agencias de marketing', icon: 'target', tono: 'warn',
      titulo: 'Agencia que convierte anuncios en reuniones',
      resumen: 'Los leads de campañas llegan al WhatsApp, se califican con preguntas y se agenda una llamada con el ejecutivo.',
      beneficios: ['Recepción de leads de anuncios Click-to-WhatsApp', 'Preguntas de calificación automáticas', 'Agenda de reuniones de diagnóstico', 'Reportes de conversión por campaña'],
      modulos: ['automatizacion', 'crm', 'citas', 'reportes', 'campanas'], plan: 'empresarial',
      guion: [
        { de: 'user', texto: 'Vi su anuncio, quiero más clientes para mi negocio' },
        { de: 'bot', texto: '¡Genial! ¿Cuál es su inversión mensual aproximada en publicidad?', lista: ['Menos de Bs 1.000', 'Bs 1.000 a 5.000', 'Más de Bs 5.000'] },
        { de: 'user', texto: 'Bs 1.000 a 5.000' },
        { de: 'bot', texto: 'Con ese presupuesto podemos ayudarle. ¿Agendamos un diagnóstico gratuito de 30 minutos?', botones: ['Agendar diagnóstico', 'Ver casos'] }
      ],
      preset: {
        negocio: 'Impulso Digital', rubro: 'Marketing',
        bienvenida: 'Hola, somos Impulso Digital. Ayudamos a negocios a conseguir más clientes con publicidad y contenido.',
        servicios: [
          { nombre: 'Diagnóstico gratuito', duracion: 30, precio: 0 },
          { nombre: 'Sesión de estrategia', duracion: 60, precio: 350 }
        ],
        faqs: [
          { pregunta: '¿Cuánto cuesta manejar mis redes?', respuesta: 'Nuestros planes de gestión de redes inician en Bs 1.800 mensuales, sin incluir la inversión en anuncios.', claves: 'precio, costo, redes, manejo, plan' },
          { pregunta: '¿En cuánto tiempo veo resultados?', respuesta: 'Las campañas suelen estabilizarse entre la segunda y la cuarta semana.', claves: 'resultados, tiempo, cuándo' }
        ]
      }
    },
    {
      id: 'profesional', nombre: 'Profesionales independientes', icon: 'briefcase', tono: 'brand',
      titulo: 'Profesional que no pierde clientes por no contestar',
      resumen: 'Abogados, contadores, psicólogos o consultores que responden al instante y agendan sin interrumpir su trabajo.',
      beneficios: ['Menú de servicios y tarifas', 'Agenda de consultas con confirmación', 'Recordatorios y reprogramaciones', 'Mensaje de fuera de horario'],
      modulos: ['automatizacion', 'citas'], plan: 'atencion',
      guion: [
        { de: 'user', texto: 'Buenas noches, necesito asesoría contable' },
        { de: 'bot', texto: 'Buenas noches. Le atiende el asistente de la Lic. Rojas. Ahora estamos fuera de horario, pero puede reservar:', botones: ['Agendar consulta', 'Ver tarifas', 'Dejar mensaje'] },
        { de: 'user', texto: 'Agendar consulta' },
        { de: 'bot', texto: 'Hay espacios el lunes a las 09:00 y a las 11:00. ¿Cuál prefiere?', botones: ['Lun 09:00', 'Lun 11:00'] }
      ],
      preset: {
        negocio: 'Estudio Contable Rojas', rubro: 'Servicios profesionales',
        bienvenida: 'Hola, le saluda el asistente del Estudio Contable Rojas. ¿En qué le podemos ayudar?',
        servicios: [
          { nombre: 'Consulta contable', duracion: 45, precio: 200 },
          { nombre: 'Declaración de impuestos', duracion: 60, precio: 350 },
          { nombre: 'Asesoría tributaria', duracion: 60, precio: 300 }
        ],
        faqs: [
          { pregunta: '¿Atienden virtualmente?', respuesta: 'Sí, las consultas pueden ser presenciales o por videollamada.', claves: 'virtual, videollamada, online, zoom' },
          { pregunta: '¿Qué documentos debo traer?', respuesta: 'Su NIT, facturas del periodo y extractos bancarios si corresponde.', claves: 'documentos, traer, requisitos' }
        ]
      }
    }
  ];

  root.WAB = root.WAB || {};
  root.WAB.SECTORS = SECTORS;
})(window);
