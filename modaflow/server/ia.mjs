/*
 * Reconocimiento de prendas con Claude (API de Anthropic).
 * Este módulo solo corre en el servidor: la API key nunca llega al navegador.
 */
import Anthropic from '@anthropic-ai/sdk';

export const DEFAULT_MODEL = 'claude-haiku-5-5';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // límite de la API por imagen
export const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const PUBLICO = ['Mujer', 'Hombre', 'Unisex', 'Niña', 'Niño', 'Sin determinar'];
const CONFIANZA = ['alta', 'media', 'baja'];

const SYSTEM = `Eres el asistente de registro de productos de una tienda de ropa en Bolivia. Analizas UNA fotografía y devuelves los datos para crear la ficha del producto, en español neutro y con tono comercial breve.

Reglas:
- Describe solo lo que se ve en la foto. No inventes marca, material o composición de la tela, talla, precio, país de origen ni características que no se puedan comprobar visualmente. Si la tela parece de punto o de satén por su aspecto, dilo como apariencia ("aspecto satinado"), nunca como composición.
- Si un dato es incierto, deja el campo vacío ("" o []) y agrega el nombre del campo a "requiere_confirmacion".
- Ignora el maniquí, el fondo y las prendas que solo acompañan la foto (por ejemplo, un jean de base) y describe la prenda principal.
- Si no hay ninguna prenda de vestir, usa es_prenda=false, cantidad_prendas=0, explica el motivo en "mensaje" y deja los demás campos vacíos.
- Si hay varias prendas principales a la venta (no solo una prenda de base), indica cuántas en "cantidad_prendas", describe la más destacada y explica en "mensaje" que conviene fotografiarlas por separado.
- "categoria" debe ser una de las categorías de la tienda; si ninguna corresponde usa "Otra".
- "color_principal" debe ser el color más cercano de la paleta de la tienda; si ninguno se parece usa "Otro". Escribe el nombre exacto del color que ves en "color_principal_detalle" (por ejemplo "fucsia", "rojo carmín").
- nombre: corto y vendible (máximo 6 palabras), sin marcas. descripcion_corta: una frase. descripcion_detallada: 2 o 3 frases sobre corte, cuello, mangas, detalles y cómo combinarla.
- etiquetas: palabras en minúscula útiles para buscar (tipo, color, estilo, ocasión), sin repetir.
- No incluyas precio, costo, tallas ni cantidades: esos datos los ingresa la vendedora.`;

/** Esquema de salida estructurada. Se construye con las categorías y colores de la tienda. */
export function buildSchema(categorias, colores) {
  const str = { type: 'string' };
  const list = { type: 'array', items: { type: 'string' } };
  return {
    type: 'object',
    additionalProperties: false,
    required: ['es_prenda', 'cantidad_prendas', 'mensaje', 'nombre', 'descripcion_corta', 'descripcion_detallada', 'categoria', 'tipo_prenda',
      'color_principal', 'color_principal_detalle', 'colores_secundarios', 'estilo', 'publico_objetivo', 'caracteristicas', 'etiquetas',
      'requiere_confirmacion', 'confianza'],
    properties: {
      es_prenda: { type: 'boolean' },
      cantidad_prendas: { type: 'integer' },
      mensaje: str,
      nombre: str,
      descripcion_corta: str,
      descripcion_detallada: str,
      categoria: { type: 'string', enum: [...categorias, 'Otra'] },
      tipo_prenda: str,
      color_principal: { type: 'string', enum: [...colores, 'Otro'] },
      color_principal_detalle: str,
      colores_secundarios: list,
      estilo: str,
      publico_objetivo: { type: 'string', enum: PUBLICO },
      caracteristicas: list,
      etiquetas: list,
      requiere_confirmacion: list,
      confianza: { type: 'string', enum: CONFIANZA }
    }
  };
}

/** Lista corta de textos simples (categorías o colores enviados por el navegador). */
export function cleanList(v, fallback) {
  if (!Array.isArray(v)) return fallback;
  const out = [...new Set(v.filter((x) => typeof x === 'string').map((x) => x.trim()).filter((x) => x && x.length <= 30 && !/[<>{}"\\]/.test(x)))].slice(0, 30);
  return out.length ? out : fallback;
}

/** Valida la imagen: tipo permitido, base64 válido, tamaño y firma del archivo. */
export function validateImage(data, mediaType) {
  if (!MEDIA_TYPES.includes(mediaType)) return { error: 'Formato no permitido. Use JPG, PNG, WEBP o GIF.' };
  if (typeof data !== 'string' || !data || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return { error: 'La imagen no tiene un formato válido.' };
  const buf = Buffer.from(data, 'base64');
  if (buf.length > MAX_IMAGE_BYTES) return { error: 'La imagen supera los 5 MB.' };
  if (buf.length < 1024) return { error: 'La imagen es demasiado pequeña.' };
  const sig = {
    'image/jpeg': buf[0] === 0xff && buf[1] === 0xd8,
    'image/png': buf.slice(1, 4).toString('latin1') === 'PNG',
    'image/gif': buf.slice(0, 3).toString('latin1') === 'GIF',
    'image/webp': buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP'
  }[mediaType];
  if (!sig) return { error: 'El contenido del archivo no coincide con su formato.' };
  return { bytes: buf.length };
}

/** Revisa y normaliza la respuesta del modelo antes de enviarla al navegador. */
export function validateResult(raw, categorias, colores) {
  let o;
  try { o = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return { error: 'La respuesta de la IA no es un JSON válido.' }; }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return { error: 'La respuesta de la IA no tiene el formato esperado.' };
  if (typeof o.es_prenda !== 'boolean') return { error: 'La respuesta de la IA no indica si hay una prenda.' };
  const s = (v, max = 400) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
  const arr = (v, n = 12) => (Array.isArray(v) ? [...new Set(v.map((x) => s(x, 60)).filter(Boolean))].slice(0, n) : []);
  const pick = (v, allowed, def) => (allowed.includes(v) ? v : def);
  const r = {
    es_prenda: o.es_prenda,
    cantidad_prendas: Number.isInteger(o.cantidad_prendas) ? Math.max(0, Math.min(o.cantidad_prendas, 50)) : (o.es_prenda ? 1 : 0),
    mensaje: s(o.mensaje),
    nombre: s(o.nombre, 80),
    descripcion_corta: s(o.descripcion_corta, 200),
    descripcion_detallada: s(o.descripcion_detallada, 700),
    categoria: pick(o.categoria, [...categorias, 'Otra'], 'Otra'),
    tipo_prenda: s(o.tipo_prenda, 60),
    color_principal: pick(o.color_principal, [...colores, 'Otro'], 'Otro'),
    color_principal_detalle: s(o.color_principal_detalle, 40),
    colores_secundarios: arr(o.colores_secundarios, 6),
    estilo: s(o.estilo, 60),
    publico_objetivo: pick(o.publico_objetivo, PUBLICO, 'Sin determinar'),
    caracteristicas: arr(o.caracteristicas, 10),
    etiquetas: arr(o.etiquetas, 15).map((x) => x.toLowerCase()),
    requiere_confirmacion: arr(o.requiere_confirmacion, 17),
    confianza: pick(o.confianza, CONFIANZA, 'baja')
  };
  if (r.es_prenda && !r.nombre) return { error: 'La IA no devolvió un nombre para la prenda.' };
  return { result: r };
}

/** Costo estimado en USD si se configuraron las tarifas por millón de tokens. */
export function estimateCost(usage, pricing) {
  if (!pricing || !(pricing.input >= 0) || !(pricing.output >= 0)) return null;
  const usd = (usage.input_tokens * pricing.input + usage.output_tokens * pricing.output) / 1e6;
  return Math.round(usd * 1e6) / 1e6;
}

export class IAError extends Error {
  constructor(code, message, status) { super(message); this.code = code; this.status = status || 502; }
}

/** Envía la foto a Claude y devuelve { result, usage, model }. */
export async function analyzeGarment({ client, model, image, mediaType, categorias, colores }) {
  let response;
  try {
    response = await client.messages.create({
      model,
      max_tokens: 4000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: buildSchema(categorias, colores) } },
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
          { type: 'text', text: `Categorías de la tienda: ${categorias.join(', ')}.\nPaleta de colores de la tienda: ${colores.join(', ')}.\nAnaliza la prenda de la foto y completa la ficha.` }
        ]
      }]
    });
  } catch (e) {
    // De lo más específico a lo más general (APIConnectionError es subclase de APIError en el SDK de TypeScript)
    if (e instanceof Anthropic.AuthenticationError) throw new IAError('auth', 'La API key de Anthropic no es válida. Revise ANTHROPIC_API_KEY en el servidor.', 502);
    if (e instanceof Anthropic.PermissionDeniedError) throw new IAError('permiso', 'La API key no tiene permiso para usar este modelo.', 502);
    if (e instanceof Anthropic.NotFoundError) throw new IAError('modelo', `El modelo "${model}" no está disponible para esta cuenta.`, 502);
    if (e instanceof Anthropic.RateLimitError) throw new IAError('limite_api', 'Anthropic limitó temporalmente las solicitudes. Intente de nuevo en un minuto.', 429);
    if (e instanceof Anthropic.BadRequestError) throw new IAError('solicitud', 'Anthropic rechazó la solicitud: ' + (e.message || 'imagen o parámetros no válidos') + '.', 400);
    if (e instanceof Anthropic.APIConnectionError) throw new IAError('conexion', 'No se pudo conectar con Anthropic. Revise la conexión a internet del servidor.', 504);
    if (e instanceof Anthropic.APIError) throw new IAError('api', `Anthropic respondió con un error (${e.status || 'sin código'}). Intente de nuevo.`, 502);
    throw new IAError('interno', 'Error inesperado al llamar a la IA.', 500);
  }
  const usage = {
    input_tokens: response.usage?.input_tokens || 0,
    output_tokens: response.usage?.output_tokens || 0
  };
  if (response.stop_reason === 'refusal') throw Object.assign(new IAError('rechazo', 'La IA no pudo analizar esta imagen. Pruebe con otra fotografía de la prenda.', 422), { usage });
  if (response.stop_reason === 'max_tokens') throw Object.assign(new IAError('incompleto', 'La respuesta de la IA quedó incompleta. Vuelva a analizar.', 502), { usage });
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const v = validateResult(text, categorias, colores);
  if (v.error) throw Object.assign(new IAError('respuesta', v.error, 502), { usage });
  return { result: v.result, usage, model: response.model || model };
}
