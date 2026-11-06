/*
 * Fuentes simuladas de Google Sheets y Google Drive (solo demostración).
 * Las hojas tienen encabezados distintos entre sí para que el mapeo de columnas
 * tenga sentido, e incluyen errores intencionales: SKU duplicado, precio vacío,
 * nombre vacío e imagen que no existe en Drive.
 */
window.CA = window.CA || {};
(function () {
  'use strict';

  // [sku, nombre, tipo, color, categoría, marca, precio, oferta, disponibilidad, color/atributo, garantía, descripción]
  const TECH = [
    ['LAP-001', 'Laptop HP Victus 15 Ryzen 7 16GB 512GB', 'laptop', '#2563eb', 'Laptops', 'HP', 7999, 7499, 'Disponible', 'Negro', '12 meses', 'Pantalla 15,6" FHD 144 Hz, Ryzen 7 7840HS, 16 GB DDR5 y SSD NVMe de 512 GB. Ideal para estudio y gaming.'],
    ['LAP-002', 'Laptop Lenovo IdeaPad Slim 3 Core i5 13ª gen', 'laptop', '#64748b', 'Laptops', 'Lenovo', 5899, '', 'Disponible', 'Gris', '12 meses', 'Delgada y liviana, 15,6" FHD, Core i5-13420H, 8 GB RAM y SSD de 512 GB.'],
    ['LAP-003', 'Laptop ASUS TUF Gaming F15 RTX 4060', 'laptop', '#f97316', 'Laptops', 'ASUS', 10499, 9899, 'Pocas unidades', 'Negro', '12 meses', 'Core i7-13620H, RTX 4060 8 GB, 16 GB RAM, pantalla 144 Hz y teclado RGB.'],
    ['LAP-004', 'Laptop Acer Aspire 5 Ryzen 5 8GB', 'laptop', '#0ea5e9', 'Laptops', 'Acer', 4599, '', 'Disponible', 'Plata', '12 meses', 'Equilibrio entre precio y rendimiento para oficina y clases virtuales.'],
    ['LAP-005', 'MacBook Air 13" M3 8GB 256GB', 'laptop', '#a1a1aa', 'Laptops', 'Apple', 11999, '', 'Por pedido', 'Medianoche', '12 meses', 'Chip M3, hasta 18 horas de batería y pantalla Liquid Retina.'],
    ['LAP-006', 'Laptop Dell Inspiron 14 Core i7 16GB', 'laptop', '#1d4ed8', 'Laptops', 'Dell', 8499, '', 'Agotado', 'Azul', '12 meses', '14" 2.2K, Core i7-1355U, 16 GB RAM y SSD de 1 TB.'],
    ['PC-001', 'PC Gamer Ryzen 5 5600 + RTX 4060', 'desktop', '#22d3ee', 'Computadoras', 'Ensamblada', 8990, 8490, 'Disponible', 'RGB', '12 meses', 'Lista para jugar en 1080p ultra: 16 GB RAM, SSD 1 TB y fuente 650 W 80+.'],
    ['PC-002', 'PC Oficina Intel Core i5 12400 16GB', 'desktop', '#10b981', 'Computadoras', 'Ensamblada', 4290, '', 'Disponible', 'Negro', '12 meses', 'Rápida y silenciosa para trabajo administrativo, con Windows 11 instalado.'],
    ['PC-003', 'PC Gamer Ryzen 7 7700 + RTX 4070 Super', 'desktop', '#a855f7', 'Computadoras', 'Ensamblada', 15990, '', 'Pocas unidades', 'RGB', '12 meses', 'Para 1440p y streaming: 32 GB DDR5, SSD 2 TB y refrigeración líquida.'],
    ['PC-004', 'Mini PC Intel N100 8GB 256GB', 'desktop', '#64748b', 'Computadoras', 'Beelink', 1899, '', 'Disponible', 'Gris', '6 meses', 'Compacta, bajo consumo, doble salida HDMI. Ideal para cajas y recepciones.'],
    ['MON-001', 'Monitor Samsung 24" FHD 75Hz', 'monitor', '#3b82f6', 'Monitores', 'Samsung', 1099, '', 'Disponible', 'Negro', '12 meses', 'Panel IPS, bordes delgados y modo cuidado visual.'],
    ['MON-002', 'Monitor LG UltraGear 27" QHD 165Hz', 'monitor', '#ef4444', 'Monitores', 'LG', 2799, 2599, 'Disponible', 'Negro', '12 meses', 'Nano IPS 1 ms, HDR10 y compatible con G-Sync.'],
    ['MON-003', 'Monitor AOC 22" IPS', 'monitor', '#22c55e', 'Monitores', 'AOC', 849, '', 'Disponible', 'Negro', '12 meses', 'Opción económica con buena calidad de color.'],
    ['MON-004', 'Monitor curvo Samsung Odyssey 32" 240Hz', 'monitor', '#8b5cf6', 'Monitores', 'Samsung', 5499, '', 'Por pedido', 'Blanco', '12 meses', 'Curvatura 1000R, QHD y 240 Hz para competitivo.'],
    ['TEC-001', 'Teclado mecánico Redragon Kumara K552', 'keyboard', '#ef4444', 'Teclados', 'Redragon', 349, 299, 'Disponible', 'Switch rojo', '6 meses', 'TKL con switches mecánicos e iluminación roja.'],
    ['TEC-002', 'Combo teclado y mouse Logitech MK270', 'keyboard', '#475569', 'Teclados', 'Logitech', 299, '', 'Disponible', 'Inalámbrico', '12 meses', 'Inalámbrico 2,4 GHz con receptor USB, batería de larga duración.'],
    ['TEC-003', 'Teclado HyperX Alloy Origins Core', 'keyboard', '#dc2626', 'Teclados', 'HyperX', 799, '', 'Disponible', 'Switch rojo', '24 meses', 'Cuerpo de aluminio, switches HyperX y RGB por tecla.'],
    ['TEC-004', 'Teclado Keychron K2 v2 Bluetooth', 'keyboard', '#f59e0b', 'Teclados', 'Keychron', 899, '', 'Pocas unidades', 'Switch marrón', '12 meses', '75 %, compatible con Mac y Windows, conexión Bluetooth o cable.'],
    ['MOU-001', 'Mouse Logitech G203 Lightsync', 'mouse', '#6366f1', 'Mouse', 'Logitech', 189, 169, 'Disponible', 'Negro', '24 meses', '8.000 DPI, RGB Lightsync y 6 botones programables.'],
    ['MOU-002', 'Mouse Razer DeathAdder Essential', 'mouse', '#22c55e', 'Mouse', 'Razer', 249, '', 'Disponible', 'Negro', '24 meses', 'Diseño ergonómico clásico con sensor óptico de 6.400 DPI.'],
    ['MOU-003', 'Mouse Logitech M170 inalámbrico', 'mouse', '#94a3b8', 'Mouse', 'Logitech', 89, '', 'Disponible', 'Gris', '12 meses', 'Simple, cómodo y con batería de hasta 12 meses.'],
    ['MOU-004', 'Mouse HyperX Pulsefire Haste 2', 'mouse', '#e11d48', 'Mouse', 'HyperX', 399, '', 'Agotado', 'Rojo', '24 meses', 'Ultraliviano de 53 g con sensor de 26.000 DPI.'],
    ['COM-001', 'Tarjeta de video MSI RTX 4060 Ventus 8GB', 'gpu', '#22c55e', 'Componentes', 'MSI', 2999, 2849, 'Disponible', '8 GB GDDR6', '36 meses', 'DLSS 3, ray tracing y bajo consumo. Doble ventilador.'],
    ['COM-002', 'Procesador AMD Ryzen 5 5600', 'cpu', '#f97316', 'Componentes', 'AMD', 1099, '', 'Disponible', 'AM4', '36 meses', '6 núcleos / 12 hilos hasta 4,4 GHz.'],
    ['COM-003', 'Procesador Intel Core i5 12400F', 'cpu', '#2563eb', 'Componentes', 'Intel', 999, '', 'Disponible', 'LGA1700', '36 meses', '6 núcleos de alto rendimiento, requiere tarjeta de video.'],
    ['COM-004', 'Memoria RAM Kingston Fury 16GB DDR4 3200', 'ram', '#ef4444', 'Componentes', 'Kingston', 349, '', 'Disponible', 'DDR4', 'De por vida', 'Disipador de bajo perfil, compatible con Intel XMP.'],
    ['COM-005', 'SSD NVMe Kingston NV2 1TB', 'ssd', '#ef4444', 'Componentes', 'Kingston', 499, 449, 'Disponible', 'M.2 2280', '36 meses', 'Hasta 3.500 MB/s de lectura.'],
    ['COM-006', 'SSD Samsung 980 500GB NVMe', 'ssd', '#1d4ed8', 'Componentes', 'Samsung', 449, '', 'Pocas unidades', 'M.2 2280', '60 meses', 'Confiable y eficiente, ideal para sistema operativo.'],
    ['ACC-001', 'Audífonos HyperX Cloud Stinger 2', 'headset', '#dc2626', 'Accesorios', 'HyperX', 449, '', 'Disponible', 'Negro', '24 meses', 'Livianos, sonido DTS y micrófono con cancelación de ruido.'],
    ['ACC-002', 'Webcam Logitech C920 Full HD', 'webcam', '#1d4ed8', 'Accesorios', 'Logitech', 599, '', 'Disponible', '1080p', '24 meses', 'Video 1080p a 30 fps con micrófonos estéreo.'],
    ['ACC-003', 'Router TP-Link Archer C6 AC1200', 'router', '#10b981', 'Accesorios', 'TP-Link', 349, '', 'Disponible', 'Doble banda', '24 meses', 'Wi-Fi doble banda con 4 antenas y MU-MIMO.'],
    ['ACC-004', 'Silla gamer Cougar Armor One', 'chair', '#f97316', 'Accesorios', 'Cougar', 1499, '', 'Por pedido', 'Naranja', '12 meses', 'Reclinable 180°, cojines lumbar y cervical.'],
    ['ACC-005', 'Parlantes Logitech Z313 2.1', 'speaker', '#6366f1', 'Accesorios', 'Logitech', 399, '', 'Disponible', '2.1', '12 meses', 'Subwoofer incluido y control de volumen cableado.'],
    ['ACC-006', 'Mousepad XL RGB 80×30 cm', 'mousepad', '#a855f7', 'Accesorios', 'Redragon', 149, '', 'Disponible', 'RGB', '6 meses', 'Superficie de control con borde RGB de 10 modos.'],
    ['ACC-007', 'Hub USB-C 7 en 1 con HDMI 4K', 'hub', '#64748b', 'Accesorios', 'Ugreen', 249, '', 'Disponible', 'Aluminio', '12 meses', 'HDMI 4K, 3 USB 3.0, lector SD y carga PD 100 W.'],
    ['ACC-008', 'Impresora Epson EcoTank L3250', 'printer', '#2563eb', 'Accesorios', 'Epson', 1599, '', 'Disponible', 'Wi-Fi', '12 meses', 'Multifuncional de tinta continua con Wi-Fi.']
  ];
  const TECH_HEADERS = ['Código', 'Producto', 'Detalle', 'Precio Bs', 'Precio oferta', 'Rubro', 'Marca', 'Stock', 'Foto', 'Fotos extra', 'Color', 'Garantía'];
  const techRows = TECH.map((p) => [p[0], p[1], p[11], String(p[6]), String(p[7]), p[4], p[5], p[8], p[0] + '.jpg', p[0] + '-2.jpg, ' + p[0] + '-3.jpg', p[9], p[10]]);
  // Errores intencionales para mostrar la validación del mapeo
  techRows.push(['MOU-003', 'Mouse óptico genérico USB', 'Mouse básico para oficina.', '45', '', 'Mouse', 'Genérico', 'Disponible', 'MOU-003.jpg', '', 'Negro', '3 meses']);
  techRows.push(['ACC-009', 'Cable HDMI 2.1 de 2 m', 'Soporta 4K 120 Hz y 8K 60 Hz.', '', '', 'Accesorios', 'Ugreen', 'Disponible', 'ACC-009.jpg', '', 'Negro', '6 meses']);
  techRows.push(['COM-007', 'Fuente EVGA 650W 80+ Bronze', 'Fuente certificada con protección completa.', '549', '', 'Componentes', 'EVGA', 'Disponible', 'COM-007.jpg', '', 'Negro', '36 meses']);
  techRows.push(['TEC-005', '', 'Fila incompleta cargada por error.', '199', '', 'Teclados', 'Genérico', 'Disponible', '', '', '', '']);

  const FASHION = [
    ['MU-101', 'Polera oversize básica', 'tshirt', '#111827', 'Poleras', 149, '', 'S, M, L, XL', 'Negro', 'Disponible', 'Algodón peinado 220 g, corte amplio.'],
    ['MU-102', 'Polera estampada City', 'tshirt', '#e5e7eb', 'Poleras', 169, 139, 'S, M, L', 'Blanco', 'Disponible', 'Estampado frontal en serigrafía.'],
    ['MU-103', 'Hoodie Essentials', 'hoodie', '#6b7280', 'Buzos', 289, '', 'M, L, XL', 'Gris', 'Disponible', 'Frisa premium con capucha forrada.'],
    ['MU-104', 'Hoodie Sand', 'hoodie', '#c8a27a', 'Buzos', 299, 259, 'S, M, L', 'Arena', 'Pocas unidades', 'Color tierra, bolsillo canguro.'],
    ['MU-105', 'Jean mom fit', 'jeans', '#3b5b8c', 'Pantalones', 259, '', '36, 38, 40, 42', 'Azul', 'Disponible', 'Tiro alto y calce relajado.'],
    ['MU-106', 'Jean recto negro', 'jeans', '#1f2937', 'Pantalones', 249, '', '38, 40, 42, 44', 'Negro', 'Disponible', 'Denim rígido, corte recto.'],
    ['MU-107', 'Chaqueta bomber', 'jacket', '#3f4f3a', 'Chaquetas', 459, 399, 'M, L', 'Verde oliva', 'Disponible', 'Nylon con forro acolchado.'],
    ['MU-108', 'Chaqueta de jean', 'jacket', '#5b7fb3', 'Chaquetas', 389, '', 'S, M, L', 'Celeste', 'Disponible', 'Clásica con botones metálicos.'],
    ['MU-109', 'Zapatillas Urban White', 'sneaker', '#f3f4f6', 'Calzado', 399, '', '37 al 43', 'Blanco', 'Disponible', 'Suela de goma y plantilla acolchada.'],
    ['MU-110', 'Zapatillas Runner', 'sneaker', '#c2410c', 'Calzado', 429, 379, '38 al 42', 'Terracota', 'Pocas unidades', 'Livianas, malla transpirable.'],
    ['MU-111', 'Gorra dad hat', 'cap', '#1e3a5f', 'Accesorios', 99, '', 'Única', 'Azul marino', 'Disponible', 'Ajuste trasero metálico.'],
    ['MU-112', 'Vestido midi lino', 'dress', '#c8a27a', 'Vestidos', 349, '', 'S, M, L', 'Beige', 'Disponible', 'Lino natural, tirantes regulables.'],
    ['MU-113', 'Vestido negro satinado', 'dress', '#111827', 'Vestidos', 389, '', 'S, M', 'Negro', 'Agotado', 'Corte al bies, ideal para eventos.'],
    ['MU-114', 'Bolso tote de cuero', 'bag', '#7c4a2d', 'Accesorios', 459, '', 'Única', 'Café', 'Disponible', 'Cuero vacuno con bolsillo interno.']
  ];
  const BEAUTY = [
    ['GB-01', 'Labial mate Velvet Rose', 'lipstick', '#be185d', 'Maquillaje', 'Glow Lab', 89, 'Rosa', 'Disponible', 'Larga duración, acabado aterciopelado.'],
    ['GB-02', 'Labial mate Nude Café', 'lipstick', '#9a5b45', 'Maquillaje', 'Glow Lab', 89, 'Nude', 'Disponible', 'Tono neutro para todos los días.'],
    ['GB-03', 'Sérum vitamina C 30 ml', 'serum', '#f59e0b', 'Skincare', 'Pure Skin', 179, 'Iluminador', 'Disponible', 'Unifica el tono y aporta luminosidad.'],
    ['GB-04', 'Sérum ácido hialurónico', 'serum', '#38bdf8', 'Skincare', 'Pure Skin', 159, 'Hidratante', 'Pocas unidades', 'Hidratación profunda, textura ligera.'],
    ['GB-05', 'Crema hidratante facial 50 g', 'cream', '#f472b6', 'Skincare', 'Hydra', 139, 'Piel mixta', 'Disponible', 'Con niacinamida y pantenol.'],
    ['GB-06', 'Protector solar FPS 50', 'cream', '#fb923c', 'Skincare', 'Sunny', 149, 'Toque seco', 'Disponible', 'Amplio espectro, sin efecto blanco.'],
    ['GB-07', 'Perfume Bloom 50 ml', 'perfume', '#f9a8d4', 'Fragancias', 'Maison Lila', 329, 'Floral', 'Disponible', 'Notas de peonía, jazmín y almizcle.'],
    ['GB-08', 'Perfume Noir 100 ml', 'perfume', '#4c1d95', 'Fragancias', 'Maison Lila', 459, 'Oriental', 'Por pedido', 'Ámbar, vainilla y pimienta rosa.'],
    ['GB-09', 'Paleta de sombras Sunset', 'palette', '#ea580c', 'Maquillaje', 'Glow Lab', 199, '8 tonos', 'Disponible', 'Tonos cálidos mate y satinados.'],
    ['GB-10', 'Máscara de pestañas Volume', 'mascara', '#111827', 'Maquillaje', 'Glow Lab', 109, 'Negro', 'Disponible', 'Volumen y curvatura sin grumos.'],
    ['GB-11', 'Contorno de ojos', 'cream', '#a78bfa', 'Skincare', 'Hydra', 129, 'Antiojeras', 'Disponible', 'Con cafeína y péptidos.'],
    ['GB-12', 'Bruma facial de rosas', 'serum', '#fda4af', 'Skincare', 'Pure Skin', 99, 'Refrescante', 'Agotado', 'Agua de rosas para fijar el maquillaje.']
  ];
  const WHOLESALE = [
    ['DA-1001', 'Arroz grano largo 46 kg', 'sack', '#0f766e', 'Abarrotes', 'Grano de Oro', 'Quintal', 395, 0, 'Disponible'],
    ['DA-1002', 'Azúcar blanca 50 kg', 'sack', '#f59e0b', 'Abarrotes', 'Guabirá', 'Quintal', 330, 0, 'Disponible'],
    ['DA-1003', 'Aceite vegetal 900 ml', 'bottle', '#eab308', 'Abarrotes', 'Fino', 'Unidad', 16.5, 195, 'Disponible'],
    ['DA-1004', 'Fideo tallarín 400 g', 'pack', '#dc2626', 'Abarrotes', 'Don Vittorio', 'Unidad', 6.8, 160, 'Disponible'],
    ['DA-1005', 'Leche evaporada 400 g', 'can', '#2563eb', 'Lácteos', 'Pil', 'Unidad', 7.5, 172, 'Pocas unidades'],
    ['DA-1006', 'Atún en aceite 170 g', 'can', '#0ea5e9', 'Enlatados', 'Real', 'Unidad', 11, 250, 'Disponible'],
    ['DA-1007', 'Gaseosa cola 2 L', 'bottle', '#7f1d1d', 'Bebidas', 'Cola Andina', 'Unidad', 12, 68, 'Disponible'],
    ['DA-1008', 'Agua mineral 2 L', 'bottle', '#38bdf8', 'Bebidas', 'Vital', 'Unidad', 6, 34, 'Disponible'],
    ['DA-1009', 'Detergente en polvo 2 kg', 'box', '#16a34a', 'Limpieza', 'Omo', 'Unidad', 38, 220, 'Disponible'],
    ['DA-1010', 'Papel higiénico x4', 'pack', '#64748b', 'Limpieza', 'Scott', 'Paquete', 14, 160, 'Disponible'],
    ['DA-1011', 'Lavandina 1 L', 'bottle', '#a3e635', 'Limpieza', 'Sapolio', 'Unidad', 9, 105, 'Por pedido'],
    ['DA-1012', 'Galletas surtidas caja x24', 'box', '#d97706', 'Snacks', 'Mabel', 'Caja', 52, 0, 'Disponible'],
    ['DA-1013', 'Café molido 250 g', 'pack', '#78350f', 'Abarrotes', 'Copacabana', 'Unidad', 24, 280, 'Disponible'],
    ['DA-1014', 'Jabón de tocador x3', 'pack', '#ec4899', 'Limpieza', 'Lux', 'Paquete', 15, 170, 'Agotado']
  ];

  const sheets = [
    {
      id: 'sh-tecno', name: 'Inventario TecnoStore 2026', modified: '2026-11-04T18:20:00', owner: 'tienda@tecnostore.bo',
      tabs: [
        { name: 'Productos', headers: TECH_HEADERS, rows: techRows },
        { name: 'Precios mayoristas', headers: ['SKU', 'Descripción', 'Precio x3', 'Precio x10'], rows: TECH.slice(0, 8).map((p) => [p[0], p[1], String(Math.round(p[6] * 0.96)), String(Math.round(p[6] * 0.92))]) },
        { name: 'Archivo 2025', headers: ['Código', 'Producto', 'Precio'], rows: [['OLD-01', 'Laptop HP 240 G8', '4200'], ['OLD-02', 'Monitor LG 20"', '780']] }
      ]
    },
    {
      id: 'sh-moda', name: 'Catálogo Moda Urbana', modified: '2026-11-02T10:05:00', owner: 'ventas@modaurbana.bo',
      tabs: [{ name: 'Colección', headers: ['SKU', 'Nombre', 'Descripción', 'Precio', 'Oferta', 'Categoría', 'Talla', 'Color', 'Disponible', 'Imagen'],
        rows: FASHION.map((p) => [p[0], p[1], p[10], String(p[5]), String(p[6]), p[4], p[7], p[8], p[9], p[0] + '.jpg']) }]
    },
    {
      id: 'sh-glow', name: 'Glow Belleza - Lista de productos', modified: '2026-10-30T16:40:00', owner: 'hola@glowbelleza.bo',
      tabs: [{ name: 'Productos', headers: ['Ref', 'Producto', 'Descripción', 'Precio Bs', 'Categoría', 'Marca', 'Tono', 'Stock', 'Foto'],
        rows: BEAUTY.map((p) => [p[0], p[1], p[9], String(p[6]), p[4], p[5], p[7], p[8], p[0] + '.jpg']) }]
    },
    {
      id: 'sh-andina', name: 'Distribuidora Andina - Mayoreo', modified: '2026-11-05T08:00:00', owner: 'pedidos@andina.bo',
      tabs: [{ name: 'Lista de precios', headers: ['Código', 'Descripción', 'Unidad', 'Precio unitario', 'Precio caja', 'Categoría', 'Marca', 'Stock', 'Imagen'],
        rows: WHOLESALE.map((p) => [p[0], p[1], p[6], String(p[7]), p[8] ? String(p[8]) : '', p[4], p[5], p[9], p[0] + '.jpg']) }]
    },
    {
      id: 'sh-gastos', name: 'Control de gastos 2026', modified: '2026-10-12T09:00:00', owner: 'tienda@tecnostore.bo',
      tabs: [{ name: 'Enero', headers: ['Fecha', 'Concepto', 'Monto'], rows: [['2026-01-05', 'Alquiler', '3500'], ['2026-01-10', 'Internet', '320']] }]
    }
  ];

  // Carpetas de Drive con fotos nombradas por SKU (+ variantes para galería)
  const files = (list, kindIdx, colorIdx, extra) => {
    const out = [];
    list.forEach((p) => {
      out.push({ name: p[0] + '.jpg', art: 'art:' + p[kindIdx] + ':' + p[colorIdx] });
      (extra || []).forEach((v) => out.push({ name: p[0] + '-' + v + '.jpg', art: 'art:' + p[kindIdx] + ':' + p[colorIdx] + ':' + v }));
    });
    return out;
  };
  const drive = [
    { id: 'fd-root', name: 'Mi unidad', parent: null },
    { id: 'fd-tecno', name: 'TecnoStore', parent: 'fd-root' },
    { id: 'fd-tecno-fotos', name: 'Fotos productos', parent: 'fd-tecno', files: files(TECH, 2, 3, [2, 3]).filter((f) => f.name !== 'COM-007.jpg').concat([{ name: 'logo-tecnostore.png', art: 'art:desktop:#2563eb:3' }]) },
    { id: 'fd-tecno-banners', name: 'Banners', parent: 'fd-tecno', files: [{ name: 'banner-ofertas.jpg', art: 'art:laptop:#2563eb:3' }, { name: 'banner-gamer.jpg', art: 'art:gpu:#a855f7:3' }] },
    { id: 'fd-tecno-docs', name: 'Facturas 2026', parent: 'fd-tecno', files: [] },
    { id: 'fd-moda', name: 'Moda Urbana', parent: 'fd-root', files: files(FASHION, 2, 3, [2]) },
    { id: 'fd-glow', name: 'Glow Belleza', parent: 'fd-root', files: files(BEAUTY, 2, 3, [2]) },
    { id: 'fd-andina', name: 'Distribuidora Andina', parent: 'fd-root', files: files(WHOLESALE, 2, 3) },
    { id: 'fd-personal', name: 'Fotos personales', parent: 'fd-root', files: [{ name: 'vacaciones.jpg', art: 'art:cap:#0ea5e9:3' }] }
  ];

  CA.DEMO_SOURCES = { sheets, drive };
})();
