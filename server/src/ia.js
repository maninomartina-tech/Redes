// ---------------------------------------------------------------------------
// Redacción con IA.
//
// La idea no es que la IA escriba por ella, sino ahorrarle el ida y vuelta al
// chat: que desde el mismo contenido pueda pedir tres opciones, quedarse con
// una y editarla. Por eso siempre devuelve varias y nunca pisa lo que ya
// estaba escrito: eso lo decide ella en la app.
//
// La clave de Anthropic vive solo acá. El navegador nunca la ve.
// ---------------------------------------------------------------------------

const MODELO = () => process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5';

/** Se puede apuntar a otro lado para probar sin gastar llamadas reales. */
const BASE = () => process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com';

/** Entre opciones va esta línea sola: es lo que se usa para separarlas. */
const SEPARADOR = '---';

export function hayIA() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

async function pedirle(sistema, mensaje, maxTokens = 1200) {
  const r = await fetch(`${BASE()}/v1/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODELO(),
      max_tokens: maxTokens,
      system: sistema,
      messages: [{ role: 'user', content: mensaje }],
    }),
  });

  const datos = await r.json();
  if (!r.ok) throw new Error(datos?.error?.message ?? 'Error de la API de Claude');
  return datos.content?.map((c) => c.text).join('\n') ?? '';
}

/* ------------------------------- las partes ------------------------------ */

const TIPO = {
  reel: 'un reel (video vertical corto)',
  post: 'un posteo de una sola imagen',
  carrusel: 'un carrusel de varias placas',
  historia: 'una serie de historias',
};

const PARTES = {
  idea: {
    cuantas: 3,
    tokens: 900,
    que:
      'Escribí la IDEA GENERAL: de qué trata el contenido y qué busca lograr. ' +
      'Dos o tres oraciones, concretas. Nada de títulos ni viñetas.',
  },
  contenido: {
    cuantas: 2,
    tokens: 1600,
    que:
      'Escribí el GUION o el detalle del contenido.\n' +
      '- Si es un reel o historias: escena por escena, con los segundos y qué se dice o se muestra.\n' +
      '- Si es un carrusel: slide por slide.\n' +
      '- Si es un posteo de una imagen: qué se ve y qué texto va sobre la pieza.',
  },
  copy: {
    cuantas: 3,
    tokens: 900,
    que:
      'Escribí el COPY que acompaña la publicación: el texto que va debajo. ' +
      'Arrancá con un gancho que frene el scroll, contá en pocas líneas y cerrá ' +
      'con una llamada a la acción clara. Sin hashtags, que van aparte.',
  },
  hashtags: {
    cuantas: 1,
    tokens: 400,
    que:
      'Proponé entre 12 y 20 hashtags, separados por espacios, todos empezando con #. ' +
      'Mezclá algunos muy buscados con otros más chicos y específicos del rubro. ' +
      'Nada más que los hashtags, sin explicaciones.',
  },
};

const sistema = () =>
  [
    'Sos redactora publicitaria de una agencia de redes argentina.',
    '',
    'Cómo escribís:',
    '- Español rioplatense, de vos. Nada de "tú" ni de español neutro.',
    '- Directo y con calle. Frases cortas. Sin palabras de folleto',
    '  ("potenciá tu marca", "soluciones integrales", "en el mundo digital").',
    '- Escribís para que alguien frene el pulgar, no para que te aplaudan.',
    '- Emojis: pocos y solo si suman.',
    '',
    'Reglas de la respuesta:',
    '- Devolvés únicamente lo pedido: sin saludos, sin "acá van", sin explicar qué hiciste.',
    `- Si te piden varias opciones, las separás con una línea que diga solo ${SEPARADOR}`,
    '- Cada opción se tiene que poder pegar tal cual en la publicación.',
    '- No inventes datos del negocio (precios, direcciones, promociones, horarios).',
    '  Si hace falta uno, dejá un hueco entre corchetes, por ejemplo [precio].',
  ].join('\n');

/** Lo que ya está cargado del contenido, para que las opciones peguen. */
function contextoDelPost({ cliente, post }) {
  const lineas = [];
  if (cliente?.name) lineas.push(`Cuenta: ${cliente.name} (${cliente.handle ?? ''})`.trim());
  if (post?.type) lineas.push(`Formato: ${TIPO[post.type] ?? post.type}`);
  if (post?.title) lineas.push(`Título de trabajo: ${post.title}`);
  if (post?.inspiracion) lineas.push(`De dónde nace: ${post.inspiracion}`);
  if (post?.ideaGeneral) lineas.push(`Idea general ya definida:\n${post.ideaGeneral}`);
  if (post?.contenido) lineas.push(`Guion / contenido ya definido:\n${post.contenido}`);
  if (post?.copy) lineas.push(`Copy actual:\n${post.copy}`);
  return lineas.join('\n\n');
}

/**
 * Devuelve varias opciones para una de las partes del contenido.
 * `instruccion` es lo que ella agregue a mano ("más corto", "sin emojis").
 */
export async function redactar({ parte, cliente, post, instruccion }) {
  const cfg = PARTES[parte];
  if (!cfg) throw new Error(`No sé escribir "${parte}".`);

  const contexto = contextoDelPost({ cliente, post });

  const mensaje = [
    cfg.que,
    cfg.cuantas > 1
      ? `\nDame ${cfg.cuantas} opciones distintas entre sí, separadas por ${SEPARADOR}.`
      : '',
    contexto ? `\nLo que ya está definido:\n\n${contexto}` : '',
    instruccion?.trim() ? `\nTené en cuenta además: ${instruccion.trim()}` : '',
    contexto ? '' : '\nNo hay nada cargado todavía: proponé algo que sirva de punto de partida.',
  ]
    .filter(Boolean)
    .join('\n');

  return separarOpciones(await pedirle(sistema(), mensaje, cfg.tokens));
}

/**
 * Parte la respuesta en opciones.
 *
 * A veces contesta igual con "Opción 1:" adelante aunque se le pida que no:
 * se saca, porque si no queda pegado en la publicación.
 */
export function separarOpciones(texto) {
  const opciones = String(texto ?? '')
    .split(new RegExp(`^\\s*${SEPARADOR}+\\s*$`, 'm'))
    .map((t) => t.trim())
    .map((t) => t.replace(/^(opci[oó]n|alternativa)\s*\d+\s*[:.\-–]?\s*/i, '').trim())
    .filter(Boolean);

  return opciones.length ? opciones : [String(texto ?? '').trim()].filter(Boolean);
}
