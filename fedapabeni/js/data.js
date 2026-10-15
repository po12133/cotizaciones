/*
 * DATOS DEMOSTRATIVOS DEL PROTOTIPO FEDAPABENI
 * ------------------------------------------------------------------
 * Todo el contenido de este archivo es de EJEMPLO para el prototipo.
 * Los nombres de las asociaciones provienen de los Términos de Referencia
 * (sección 6.5); sus descripciones, ubicaciones, productos, capacidades,
 * contactos, noticias y eventos son DEMOSTRATIVOS y deben ser reemplazados
 * por información validada por FEDAPABENI (TDR, sección 20).
 */
(function (global) {
  'use strict';

  const DEMO_NOTE = 'Contenido demostrativo — pendiente de validación por FEDAPABENI';

  const settings = {
    siteName: 'FEDAPABENI',
    siteFullName: 'Federación Departamental de Asociaciones de Productores Agroforestales del Beni',
    tagline: 'La oferta agroforestal del norte amazónico de Bolivia, en un solo lugar',
    // Vacío a propósito: no se publica ningún número real sin confirmación.
    whatsapp: '',
    email: '',
    phone: '',
    address: 'Dirección pendiente de confirmación',
    facebook: '',
    families: 720, // Dato de los TDR (sección 3): ~720 familias beneficiarias indirectas.
    heroImage: 'assets/images/rio-beni.jpg',
  };

  const categories = [
    { id: 'pulpas', name: 'Pulpas de fruta', icon: 'package', description: 'Pulpas congeladas de frutas amazónicas: asaí, copoazú, majo, maracuyá y otras.' },
    { id: 'cacao', name: 'Cacao silvestre', icon: 'sprout', description: 'Grano seco, nibs y derivados del cacao silvestre recolectado en el bosque.' },
    { id: 'harinas', name: 'Harinas', icon: 'layers', description: 'Harina de plátano y otras harinas obtenidas de productos locales.' },
    { id: 'frutos-secos', name: 'Castaña y frutos secos', icon: 'trees', description: 'Castaña amazónica y otros frutos secos del bosque.' },
    { id: 'otros', name: 'Otros productos amazónicos', icon: 'leaf', description: 'Aceites, bebidas y otros productos de los emprendimientos afiliados.' },
  ];

  const organizations = [
    {
      id: 'aagropama', acronym: 'AAGROPAMA', fullName: '', type: 'Asociación',
      municipality: 'Riberalta', department: 'Beni', lat: -11.0083, lng: -66.0717,
      rubros: ['Asaí', 'Copoazú'],
      summary: 'Recolección y transformación de asaí y copoazú en pulpa congelada.',
      description: 'Texto demostrativo. La asociación agrupa a familias recolectoras que aprovechan el asaí y el copoazú del bosque bajo prácticas de manejo sostenible. Cuenta con un centro de acopio donde la fruta se despulpa, envasa y congela para su comercialización en mercados locales y nacionales.',
      capacity: 'Capacidad demostrativa: 8 t de pulpa por temporada',
      families: 120, images: ['assets/images/asai-rio.jpg', 'assets/images/asai-fruto.jpg', 'assets/images/riberalta-paisaje.jpg'],
      contact: { person: 'Pendiente de confirmación', phone: '', email: '', whatsapp: '' },
      channels: ['Venta directa', 'Ferias regionales'], featured: true,
    },
    {
      id: 'acopalt', acronym: 'ACOPALT', fullName: '', type: 'Asociación',
      municipality: 'Guayaramerín', department: 'Beni', lat: -10.8268, lng: -65.3585,
      rubros: ['Cacao silvestre', 'Castaña'],
      summary: 'Cacao silvestre seleccionado, fermentado y secado por familias recolectoras.',
      description: 'Texto demostrativo. Organización dedicada a la recolección de cacao silvestre en zonas de bosque y a su beneficiado (fermentado y secado) para obtener grano de calidad. Complementa su oferta con castaña amazónica durante la zafra.',
      capacity: 'Capacidad demostrativa: 3 t de grano seco por campaña',
      families: 85, images: ['assets/images/cacao-mazorcas.jpg', 'assets/images/cacao-seco.jpg', 'assets/images/guayaramerin-puerto.jpg'],
      contact: { person: 'Pendiente de confirmación', phone: '', email: '', whatsapp: '' },
      channels: ['Venta a granel', 'Pedidos institucionales'], featured: true,
    },
    {
      id: 'appaa-vd', acronym: 'APPAA-VD', fullName: '', type: 'Asociación',
      municipality: 'Cachuela Esperanza', department: 'Beni', lat: -10.537, lng: -65.583,
      rubros: ['Plátano', 'Frutas amazónicas'],
      summary: 'Harina de plátano y frutas procesadas de sistemas agroforestales.',
      description: 'Texto demostrativo. La asociación transforma el plátano de sus sistemas agroforestales en harina mediante secado y molienda, generando un producto de larga duración con valor agregado para el mercado local y la alimentación escolar.',
      capacity: 'Capacidad demostrativa: 1,5 t de harina al mes',
      families: 60, images: ['assets/images/platano-cosecha.jpg', 'assets/images/platano-verde.jpg', 'assets/images/selva-rurrenabaque.jpg'],
      contact: { person: 'Pendiente de confirmación', phone: '', email: '', whatsapp: '' },
      channels: ['Venta directa', 'Compras públicas'], featured: true,
    },
    {
      id: 'aipranca', acronym: 'AIPRANCA', fullName: '', type: 'Asociación',
      municipality: 'Puerto Rico', department: 'Pando', lat: -11.103, lng: -67.553,
      rubros: ['Majo', 'Asaí'],
      summary: 'Pulpa de majo y asaí recolectados en el bosque amazónico.',
      description: 'Texto demostrativo. Las familias asociadas recolectan los frutos de majo y asaí de palmeras silvestres. La pulpa se procesa en pequeñas plantas comunales bajo normas básicas de inocuidad y se comercializa congelada.',
      capacity: 'Capacidad demostrativa: 4 t de pulpa por temporada',
      families: 70, images: ['assets/images/majo-fruto.jpg', 'assets/images/majo-semillas.jpg', 'assets/images/tucan-asai.jpg'],
      contact: { person: 'Pendiente de confirmación', phone: '', email: '', whatsapp: '' },
      channels: ['Ferias regionales', 'Pedidos bajo contrato'], featured: false,
    },
    {
      id: 'arphae', acronym: 'ARPHAE', fullName: '', type: 'Asociación',
      municipality: 'Riberalta (área rural)', department: 'Beni', lat: -10.93, lng: -66.16,
      rubros: ['Copoazú', 'Cacao silvestre', 'Frutas amazónicas'],
      summary: 'Productos agroforestales diversificados con enfoque “Bosque en Pie”.',
      description: 'Texto demostrativo. Organización de productores que impulsa sistemas agroforestales diversificados, combinando copoazú, cacao y otras frutas amazónicas con la conservación del bosque. Comercializa pulpas y grano.',
      capacity: 'Capacidad demostrativa: 5 t de pulpa por temporada',
      families: 95, images: ['assets/images/copoazu-abierto.jpg', 'assets/images/copoazu-arbol.jpg', 'assets/images/sendero-selva.jpg'],
      contact: { person: 'Pendiente de confirmación', phone: '', email: '', whatsapp: '' },
      channels: ['Venta directa', 'Tiendas aliadas'], featured: true,
    },
    {
      id: 'ajora', acronym: 'AJORA', fullName: '', type: 'Asociación',
      municipality: 'El Sena', department: 'Pando', lat: -11.483, lng: -67.245,
      rubros: ['Castaña', 'Asaí'],
      summary: 'Castaña amazónica y asaí de bosques comunitarios.',
      description: 'Texto demostrativo. Asociación vinculada al aprovechamiento de la castaña y del asaí en bosques comunitarios. Promueve la participación de jóvenes en la recolección, el acopio y la comercialización.',
      capacity: 'Capacidad demostrativa: 6 t de castaña por zafra',
      families: 110, images: ['assets/images/castana.jpg', 'assets/images/castana-arbol.jpg', 'assets/images/amazonia-rurrenabaque.jpg'],
      contact: { person: 'Pendiente de confirmación', phone: '', email: '', whatsapp: '' },
      channels: ['Venta a granel', 'Exportadoras locales'], featured: false,
    },
    {
      id: 'ejemplo-delicias-del-majo', acronym: 'Delicias del Majo (ejemplo)', fullName: 'Emprendimiento ficticio de ejemplo', type: 'Emprendimiento',
      municipality: 'Villa Bella', department: 'Beni', lat: -10.389, lng: -65.39,
      rubros: ['Majo', 'Frutas amazónicas'],
      summary: 'Emprendimiento ficticio que muestra cómo se verá la ficha de un emprendimiento.',
      description: 'Registro de ejemplo. Muestra cómo un emprendimiento articulado a FEDAPABENI puede presentar sus bebidas y derivados de majo, sus capacidades y canales de venta.',
      capacity: 'Capacidad demostrativa: 500 L de bebida al mes',
      families: 8, images: ['assets/images/majo-semillas.jpg', 'assets/images/paisaje-tropical.jpg'],
      contact: { person: 'Pendiente de confirmación', phone: '', email: '', whatsapp: '' },
      channels: ['Venta directa'], featured: false,
    },
    {
      id: 'ejemplo-cacao-del-rio', acronym: 'Cacao del Río (ejemplo)', fullName: 'Emprendimiento ficticio de ejemplo', type: 'Emprendimiento',
      municipality: 'Riberalta', department: 'Beni', lat: -11.02, lng: -66.05,
      rubros: ['Cacao silvestre'],
      summary: 'Emprendimiento ficticio de chocolate artesanal a partir de cacao silvestre.',
      description: 'Registro de ejemplo. Representa a un emprendimiento que transforma el cacao silvestre de las asociaciones en tabletas y nibs, mostrando la articulación entre organizaciones de base y emprendimientos.',
      capacity: 'Capacidad demostrativa: 400 tabletas al mes',
      families: 5, images: ['assets/images/cacao-rojo.jpg', 'assets/images/cacao-seco.jpg'],
      contact: { person: 'Pendiente de confirmación', phone: '', email: '', whatsapp: '' },
      channels: ['Tiendas aliadas', 'Ferias'], featured: false,
    },
  ];

  const products = [
    { id: 'pulpa-asai-1kg', name: 'Pulpa de asaí congelada', categoryId: 'pulpas', orgId: 'aagropama', presentation: 'Bolsa de 1 kg', unit: 'kg', availability: 'Disponible', season: 'Cosecha principal: julio a noviembre (referencial)', minOrder: '20 kg', description: 'Pulpa de asaí (Euterpe precatoria) obtenida de frutos recolectados en el bosque, despulpada y congelada sin conservantes. Ideal para bebidas, helados y bowls.', features: ['Sin conservantes', 'Congelada a −18 °C', 'Trazabilidad por lote'], images: ['assets/images/asai-pulpa.jpg', 'assets/images/asai-fruto.jpg', 'assets/images/asai-rio.jpg'], featured: true },
    { id: 'pulpa-asai-granel', name: 'Pulpa de asaí a granel', categoryId: 'pulpas', orgId: 'ajora', presentation: 'Balde de 20 kg', unit: 'balde', availability: 'Bajo pedido', season: 'Según temporada de cosecha', minOrder: '5 baldes', description: 'Presentación para heladerías, restaurantes y compradores institucionales que requieren volúmenes mayores de pulpa de asaí.', features: ['Para uso industrial', 'Cadena de frío', 'Entrega coordinada'], images: ['assets/images/mercado-asai.jpg', 'assets/images/tucan-asai.jpg'], featured: false },
    { id: 'pulpa-copoazu', name: 'Pulpa de copoazú', categoryId: 'pulpas', orgId: 'arphae', presentation: 'Bolsa de 1 kg', unit: 'kg', availability: 'Disponible', season: 'Cosecha principal: enero a abril (referencial)', minOrder: '10 kg', description: 'Pulpa de copoazú (Theobroma grandiflorum) de aroma intenso, ideal para jugos, cremas, helados y repostería.', features: ['100 % fruta', 'Aroma intenso', 'Congelada'], images: ['assets/images/copoazu-abierto.jpg', 'assets/images/copoazu.jpg', 'assets/images/copoazu-arbol.jpg'], featured: true },
    { id: 'pulpa-copoazu-500', name: 'Pulpa de copoazú 500 g', categoryId: 'pulpas', orgId: 'aagropama', presentation: 'Bolsa de 500 g', unit: 'unidad', availability: 'Por temporada', season: 'Enero a abril (referencial)', minOrder: '24 unidades', description: 'Formato familiar para tiendas y supermercados.', features: ['Formato retail', 'Congelada'], images: ['assets/images/copoazu.jpg', 'assets/images/copoazu-abierto.jpg'], featured: false },
    { id: 'pulpa-majo', name: 'Pulpa de majo', categoryId: 'pulpas', orgId: 'aipranca', presentation: 'Bolsa de 1 kg', unit: 'kg', availability: 'Por temporada', season: 'Según floración y cosecha local', minOrder: '10 kg', description: 'Pulpa de majo (Oenocarpus bataua) para la tradicional “leche de majo” y otras preparaciones. Fruto amazónico rico en aceites naturales.', features: ['Fruto silvestre', 'Rico en aceites naturales', 'Congelada'], images: ['assets/images/majo-fruto.jpg', 'assets/images/majo-semillas.jpg'], featured: true },
    { id: 'bebida-majo', name: 'Bebida de majo', categoryId: 'otros', orgId: 'ejemplo-delicias-del-majo', presentation: 'Botella de 1 L', unit: 'unidad', availability: 'Bajo pedido', season: 'Todo el año (según disponibilidad de pulpa)', minOrder: '12 unidades', description: 'Producto de ejemplo: bebida lista para consumir elaborada con pulpa de majo.', features: ['Lista para consumir', 'Producto de ejemplo'], images: ['assets/images/majo-semillas.jpg'], featured: false },
    { id: 'cacao-grano', name: 'Cacao silvestre en grano seco', categoryId: 'cacao', orgId: 'acopalt', presentation: 'Saco de 46 kg', unit: 'saco', availability: 'Disponible', season: 'Campaña: diciembre a marzo (referencial)', minOrder: '1 saco', description: 'Grano de cacao silvestre fermentado y secado al sol. Materia prima de origen amazónico para chocolatería fina.', features: ['Fermentado y secado', 'Origen silvestre', 'Selección manual'], images: ['assets/images/cacao-seco.jpg', 'assets/images/cacao-mazorcas.jpg', 'assets/images/cacao-rojo.jpg'], featured: true },
    { id: 'cacao-nibs', name: 'Nibs de cacao silvestre', categoryId: 'cacao', orgId: 'arphae', presentation: 'Bolsa de 250 g', unit: 'unidad', availability: 'Por temporada', season: 'Según disponibilidad de grano', minOrder: '20 unidades', description: 'Trozos de cacao tostado y descascarillado, listos para repostería, granola o consumo directo.', features: ['Tostado', 'Sin azúcar añadida'], images: ['assets/images/cacao-mazorcas.jpg', 'assets/images/cacao-seco.jpg'], featured: false },
    { id: 'chocolate-silvestre', name: 'Tableta de chocolate silvestre', categoryId: 'cacao', orgId: 'ejemplo-cacao-del-rio', presentation: 'Tableta de 80 g', unit: 'unidad', availability: 'Disponible', season: 'Todo el año', minOrder: '24 unidades', description: 'Producto de ejemplo: chocolate elaborado con cacao silvestre amazónico.', features: ['Producto de ejemplo', 'Cacao silvestre'], images: ['assets/images/cacao-rojo.jpg', 'assets/images/cacao-seco.jpg'], featured: false },
    { id: 'harina-platano', name: 'Harina de plátano', categoryId: 'harinas', orgId: 'appaa-vd', presentation: 'Bolsa de 1 kg', unit: 'kg', availability: 'Disponible', season: 'Todo el año', minOrder: '25 kg', description: 'Harina obtenida del secado y molienda de plátano verde. Sin gluten de forma natural; útil para panificación, papillas y alimentación escolar.', features: ['Sin gluten de forma natural', 'Larga duración', 'Producción continua'], images: ['assets/images/platano-verde.jpg', 'assets/images/platano-cosecha.jpg'], featured: true },
    { id: 'harina-platano-500', name: 'Harina de plátano 500 g', categoryId: 'harinas', orgId: 'appaa-vd', presentation: 'Bolsa de 500 g', unit: 'unidad', availability: 'Disponible', season: 'Todo el año', minOrder: '30 unidades', description: 'Formato familiar de la harina de plátano para tiendas de barrio y ferias.', features: ['Formato familiar'], images: ['assets/images/platano-cosecha.jpg'], featured: false },
    { id: 'castana', name: 'Castaña amazónica', categoryId: 'frutos-secos', orgId: 'ajora', presentation: 'Bolsa de 1 kg', unit: 'kg', availability: 'Por temporada', season: 'Zafra: diciembre a marzo (referencial)', minOrder: '10 kg', description: 'Castaña (Bertholletia excelsa) recolectada en bosques comunitarios del norte amazónico.', features: ['Recolección sostenible', 'Seleccionada'], images: ['assets/images/castana.jpg', 'assets/images/castana-arbol.jpg'], featured: true },
    { id: 'pulpa-maracuya', name: 'Pulpa de maracuyá', categoryId: 'pulpas', orgId: 'arphae', presentation: 'Bolsa de 1 kg', unit: 'kg', availability: 'Disponible', season: 'Varias cosechas al año', minOrder: '10 kg', description: 'Pulpa de maracuyá de sistemas agroforestales, para jugos, postres y salsas.', features: ['Congelada', 'Sabor intenso'], images: ['assets/images/maracuya.jpg'], featured: false },
  ];

  const posts = [
    { id: 'feria-sabores-amazonicos', type: 'feria', title: 'Feria demostrativa de productos amazónicos', date: '2026-11-21', place: 'Riberalta, Beni', image: 'assets/images/feria-mercado.jpg', summary: 'Ejemplo de cómo se publicará una feria: stands de asociaciones, degustaciones y ruedas de negocio.', body: 'Este es un contenido de ejemplo. Desde el panel de administración, FEDAPABENI podrá publicar ferias con fecha, lugar, descripción, imágenes y enlaces de inscripción. Las asociaciones participantes podrán vincularse a sus perfiles del directorio.', featured: true },
    { id: 'rueda-negocios-pulpas', type: 'oportunidad', title: 'Oportunidad comercial: compra de pulpas para heladerías', date: '2026-11-05', place: 'Bolivia (ejemplo)', image: 'assets/images/asai-pulpa.jpg', summary: 'Ejemplo de publicación de una demanda comercial con volúmenes, plazos y forma de contacto.', body: 'Contenido demostrativo. Este tipo de publicación permite difundir demandas de compradores y convocatorias comerciales, de modo que las asociaciones puedan responder con sus ofertas a través de los formularios de la plataforma o de WhatsApp.', featured: true },
    { id: 'taller-buenas-practicas', type: 'evento', title: 'Taller demostrativo de buenas prácticas de manufactura', date: '2026-12-03', place: 'Guayaramerín, Beni', image: 'assets/images/cacao-mazorcas.jpg', summary: 'Ejemplo de evento de capacitación dirigido a las asociaciones afiliadas.', body: 'Contenido demostrativo para ilustrar la publicación de eventos: fecha, lugar, objetivos, público destinatario y contacto para inscripciones.', featured: false },
    { id: 'lanzamiento-plataforma', type: 'noticia', title: 'FEDAPABENI presenta su plataforma comercial (noticia de ejemplo)', date: '2026-11-10', place: 'Riberalta, Beni', image: 'assets/images/rio-beni.jpg', summary: 'Ejemplo de noticia institucional sobre el lanzamiento de la plataforma.', body: 'Texto de ejemplo. Las noticias institucionales permitirán comunicar avances, alianzas, logros de las asociaciones y novedades del sector agroforestal amazónico.', featured: true },
    { id: 'cosecha-asai', type: 'noticia', title: 'Inicio de la temporada de asaí (noticia de ejemplo)', date: '2026-07-15', place: 'Norte amazónico', image: 'assets/images/asai-rio.jpg', summary: 'Ejemplo de noticia sobre la temporada productiva y la disponibilidad de producto.', body: 'Texto de ejemplo. FEDAPABENI podrá informar a compradores sobre el inicio de temporadas y la disponibilidad estimada de cada producto.', featured: false },
    { id: 'feria-nacional', type: 'feria', title: 'Participación en feria nacional (ejemplo)', date: '2027-02-12', place: 'Por confirmar', image: 'assets/images/copoazu-abierto.jpg', summary: 'Ejemplo de registro de participación en ferias nacionales e internacionales.', body: 'Contenido demostrativo para ilustrar cómo se difundirá la participación de las asociaciones en ferias y eventos comerciales.', featured: false },
    { id: 'convocatoria-proveedores', type: 'oportunidad', title: 'Convocatoria a proveedores de harina de plátano (ejemplo)', date: '2026-12-15', place: 'Beni (ejemplo)', image: 'assets/images/platano-verde.jpg', summary: 'Ejemplo de oportunidad comercial vinculada a compras institucionales.', body: 'Contenido demostrativo. Permite difundir convocatorias de compra pública o privada con requisitos, plazos y enlaces.', featured: false },
  ];

  const gallery = [
    { id: 'g1', type: 'foto', title: 'Río Beni', src: 'assets/images/rio-beni.jpg' },
    { id: 'g2', type: 'foto', title: 'Frutos de asaí', src: 'assets/images/asai-fruto.jpg' },
    { id: 'g3', type: 'foto', title: 'Copoazú abierto', src: 'assets/images/copoazu-abierto.jpg' },
    { id: 'g4', type: 'foto', title: 'Mazorcas de cacao', src: 'assets/images/cacao-mazorcas.jpg' },
    { id: 'g5', type: 'foto', title: 'Frutos de majo', src: 'assets/images/majo-fruto.jpg' },
    { id: 'g6', type: 'foto', title: 'Cosecha de plátano', src: 'assets/images/platano-cosecha.jpg' },
    { id: 'g7', type: 'foto', title: 'Bosque amazónico', src: 'assets/images/sendero-selva.jpg' },
    { id: 'g8', type: 'foto', title: 'Tucán en una palmera de asaí', src: 'assets/images/tucan-asai.jpg' },
    { id: 'g9', type: 'foto', title: 'Paisaje de Riberalta', src: 'assets/images/riberalta-paisaje.jpg' },
    { id: 'g10', type: 'foto', title: 'Laguna amazónica', src: 'assets/images/laguna.jpg' },
    { id: 'g11', type: 'foto', title: 'Castaña amazónica', src: 'assets/images/castana.jpg' },
    { id: 'g12', type: 'foto', title: 'Puerto de Guayaramerín', src: 'assets/images/guayaramerin-puerto.jpg' },
    { id: 'v1', type: 'video', title: 'Meandros del río Mamoré (vista satelital)', src: 'assets/video/rio-mamore.webm', poster: 'assets/images/mamore-beni.jpg' },
    { id: 'v2', type: 'video', title: 'El río Amazonas atraviesa la selva (vista satelital)', src: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/7/78/Amazon_River_Snakes_Through_the_Rainforest_%28CIRA_2026-07-08_-_nolabels%29.webm/Amazon_River_Snakes_Through_the_Rainforest_%28CIRA_2026-07-08_-_nolabels%29.webm.480p.vp9.webm', poster: 'assets/images/amazonia-rurrenabaque.jpg' },
  ];

  // Créditos de fotografías y videos (Wikimedia Commons, licencias libres).
  const credits = [
    ['images/hero-tijamuchi.jpg', 'Alexander Wollert', 'CC BY 4.0', 'File:Tijamuchi_River_Beni_Bolivia_by_Alexander_Wollert.jpg'],
    ['images/selva-rurrenabaque.jpg', 'EEJCC', 'CC0', 'File:Rurrenabaque_selva.jpg'],
    ['images/paisaje-tropical.jpg', 'EEJCC', 'CC0', 'File:Paisaje_tropical_en_Rurrenabaque,_Bolivia.jpg'],
    ['images/amazonia-rurrenabaque.jpg', 'Warren H', 'CC BY 2.0', 'File:Amazonia_cerca_de_Rurrenabaque_Bolivia.jpg'],
    ['images/riberalta-paisaje.jpg', 'SqueakBox', 'CC0', 'File:Riberalta_paisaje_por_Richard_Weiss.JPG'],
    ['images/riberalta.jpg', 'Autor indicado en la fuente', 'CC BY-SA 3.0', 'File:Riberalta_Beni_Bolivia.jpg'],
    ['images/rio-beni.jpg', 'Haakon S. Krohn', 'CC BY-SA 3.0', 'File:R%C3%ADo_Beni.jpg'],
    ['images/mamore-beni.jpg', 'Edmilson Constantino', 'CC BY-SA 2.0', 'File:Encuentro_de_los_r%C3%ADos_Mamor%C3%A9_y_Beni_desde_Brasil.jpg'],
    ['images/guayaramerin-puerto.jpg', 'Filzstift', 'CC BY-SA 3.0', 'File:Guayaramer%C3%ADn_Port.jpg'],
    ['images/sendero-selva.jpg', 'Havardtl', 'CC BY 4.0', 'File:Path_in_the_rainforest.jpg'],
    ['images/laguna.jpg', 'EEJCC', 'CC0', 'File:Laguna_cerca_de_Rurrenabaque.jpg'],
    ['images/tucan-asai.jpg', 'Julio Cesar Baldim', 'CC BY-SA 4.0', 'File:UM_TUCANO_NO_A%C3%87AIZEIRO_67.JPG'],
    ['images/asai-rio.jpg', 'Decio Horita Yokota', 'CC BY-SA 3.0', 'File:A%C3%A7ai_na_beira_do_rio.jpg'],
    ['images/asai-fruto.jpg', 'Jéssica Karoline Alves Portugal', 'CC BY-SA 4.0', 'File:Fruto_do_a%C3%A7a%C3%AD.jpg'],
    ['images/asai-pulpa.jpg', 'chahayes', 'CC BY 2.0', 'File:Acai_bowl_-_A%C3%A7a%C3%AD_na_tigela.jpg'],
    ['images/copoazu-abierto.jpg', 'BjoernS', 'CC BY-SA 2.0 DE', 'File:Cupuacu_fruit_opened.jpg'],
    ['images/copoazu.jpg', 'Roger Culos', 'CC BY-SA 4.0', 'File:Theobroma_grandiflorum_MHNT.BOT.2017.10.11.jpg'],
    ['images/copoazu-arbol.jpg', 'Dick Culbert', 'CC BY 2.0', 'File:Theobroma_grandiflorum,_with_ants_(9906024606).jpg'],
    ['images/majo-fruto.jpg', 'P. S. Sena', 'CC BY-SA 4.0', 'File:Patau%C3%A1_fruit.JPG'],
    ['images/majo-semillas.jpg', 'P. S. Sena', 'CC BY-SA 4.0', 'File:Patau%C3%A1_seeds_1.JPG'],
    ['images/cacao-mazorcas.jpg', 'FranHogan', 'CC BY-SA 4.0', 'File:Cacao_pods.jpg'],
    ['images/cacao-rojo.jpg', 'Nick Hobgood', 'CC BY-SA 3.0', 'File:Theobroma_cacao_(red_pods_-_Haiti).jpg'],
    ['images/cacao-seco.jpg', 'Siarhei Besarab', 'CC BY-SA 4.0', 'File:Dried_Cacao_Pod_Held_in_Hand.jpg'],
    ['images/platano-verde.jpg', 'Henry Doe', 'CC0', 'File:Green_Plantains_(Unsplash).jpg'],
    ['images/platano-cosecha.jpg', 'NiferO', 'CC BY-SA 4.0', 'File:Freshly_Harvested_Green_Banana_and_plantain.jpg'],
    ['images/castana.jpg', 'רנדום', 'CC BY-SA 3.0', 'File:Bertholletia_excelsa_seeds_closeup.jpg'],
    ['images/castana-arbol.jpg', 'mauroguanandi', 'CC BY 2.0', 'File:%22Bertholetia_excelsa%22_Castanha-do-Par%C3%A1_Brazil-nuts_tree.jpg'],
    ['images/maracuya.jpg', 'Alexander Klink', 'CC BY 3.0', 'File:Passiflora_Edulis_Open_Fruit2.jpg'],
    ['images/feria-mercado.jpg', 'PattayaPatrol', 'CC BY-SA 4.0', 'File:DSCF0983_A_vendor_stands_behind_a_colorful_market_stall_piled_high_with_bowls_of_fresh_limes_and_other_produce_as_shoppers_browse_the_busy_outdoor_market.jpg'],
    ['images/mercado-asai.jpg', 'Decio Horita Yokota', 'Dominio público', 'File:A%C3%A7ai_no_Mercado_do_Ver-o-peso.jpg'],
    ['video/rio-mamore.webm', 'SentinelHub (Flickr)', 'CC BY 2.0', 'File:Mamore_River_Meander_(51193485781).webm'],
    ['Video remoto: Amazon River Snakes Through the Rainforest', 'NOAA / CIRA', 'Dominio público', 'File:Amazon_River_Snakes_Through_the_Rainforest_(CIRA_2026-07-08_-_nolabels).webm'],
  ].map(function (c) {
    return { file: c[0], author: c[1], license: c[2], url: 'https://commons.wikimedia.org/wiki/' + c[3] };
  });

  global.FEDA_DEFAULTS = {
    version: 1,
    note: DEMO_NOTE,
    settings: settings,
    categories: categories,
    organizations: organizations,
    products: products,
    posts: posts,
    gallery: gallery,
    inquiries: [],
  };
  global.FEDA_CREDITS = credits;
})(window);
