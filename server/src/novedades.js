import { ahora, db, uid } from './db.js';

// ---------------------------------------------------------------------------
// Novedades: qué pasó desde la última vez que miraste.
//
// El ida y vuelta con el cliente es todo el punto de la herramienta, y hasta
// ahora había que darse cuenta solo: ella abría la app a ver si alguien había
// comentado, y el cliente entraba a ver si había algo nuevo. Cuando nadie
// avisa, la respuesta llega tarde y el contenido no sale.
//
// Viven en el servidor y no en el navegador porque son lo único que los dos
// lados tienen en común: lo que pasa en la computadora de ella no existe en la
// del cliente, y al revés.
// ---------------------------------------------------------------------------

db.exec(`
  CREATE TABLE IF NOT EXISTS novedades (
    id          TEXT PRIMARY KEY,
    -- 'creadora' o el id del cliente al que le toca verla.
    para        TEXT NOT NULL,
    cliente_id  TEXT,
    post_id     TEXT,
    tipo        TEXT NOT NULL,   -- comentario | decision | pieza | contenido
    texto       TEXT NOT NULL,
    creada_en   TEXT NOT NULL,
    vista_en    TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_novedades_para
    ON novedades (para, vista_en, creada_en);
`);

export const PARA_LA_CREADORA = 'creadora';

/** Cuántas se guardan por destinatario. Más atrás, ya no le sirve a nadie. */
const TOPE = 60;

export function registrar({ para, clienteId = null, postId = null, tipo, texto }) {
  db.prepare(
    `INSERT INTO novedades (id, para, cliente_id, post_id, tipo, texto, creada_en)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(uid('nov'), para, clienteId, postId, tipo, texto, ahora());

  // Se podan las viejas para que la tabla no crezca sin fin.
  db.prepare(
    `DELETE FROM novedades
      WHERE para = ?
        AND id NOT IN (
          SELECT id FROM novedades WHERE para = ? ORDER BY creada_en DESC LIMIT ?
        )`
  ).run(para, para, TOPE);
}

export function listar(para) {
  return db
    .prepare('SELECT * FROM novedades WHERE para = ? ORDER BY creada_en DESC LIMIT ?')
    .all(para, TOPE);
}

export function marcarVistas(para) {
  db.prepare('UPDATE novedades SET vista_en = ? WHERE para = ? AND vista_en IS NULL').run(
    ahora(),
    para
  );
}

/* --------------------- lo que hace el cliente con su link ---------------- */

export function avisarComentario(cliente, post, texto) {
  registrar({
    para: PARA_LA_CREADORA,
    clienteId: cliente?.id ?? null,
    postId: post?.id ?? null,
    tipo: 'comentario',
    texto: `${cliente?.name ?? 'Tu cliente'} comentó en «${post?.title ?? 'un contenido'}»: ${
      texto.length > 90 ? `${texto.slice(0, 90)}…` : texto
    }`,
  });
}

export function avisarDecision(cliente, post, decision) {
  const quien = cliente?.name ?? 'Tu cliente';
  const que = `«${post?.title ?? 'un contenido'}»`;
  registrar({
    para: PARA_LA_CREADORA,
    clienteId: cliente?.id ?? null,
    postId: post?.id ?? null,
    tipo: 'decision',
    texto:
      decision === 'aprobado'
        ? `${quien} aprobó ${que}`
        : `${quien} pidió cambios en ${que}`,
  });
}

/* ------------------------ lo que carga la creadora ----------------------- */

/**
 * Cuántas piezas nuevas seguidas se avisan una por una.
 *
 * Cargar una tanda de historias crea veinte de golpe: veinte avisos no son
 * veinte noticias, son ruido, y el cliente aprende a ignorar la campanita.
 */
const DE_A_UNA = 3;

const conResultado = (p) => p?.resultado?.id ?? null;

/**
 * Compara el espacio anterior con el nuevo y avisa a cada cliente lo suyo.
 *
 * Se hace acá, mirando el documento, y no en cada acción de la app: la app
 * guarda todo junto cada vez que hay un cambio, así que este es el único lugar
 * donde se sabe qué cambió de verdad.
 */
export function avisarCambiosDeLaCreadora(anterior, nuevo) {
  const antes = new Map((anterior?.posts ?? []).map((p) => [p.id, p]));
  const clientes = new Map((nuevo?.clients ?? []).map((c) => [c.id, c]));

  /** Piezas nuevas y piezas terminadas, por cliente. */
  const nuevos = new Map();
  const conPieza = [];

  for (const post of nuevo?.posts ?? []) {
    const previo = antes.get(post.id);

    if (!previo) {
      if (!nuevos.has(post.clientId)) nuevos.set(post.clientId, []);
      nuevos.get(post.clientId).push(post);
      continue;
    }

    // La pieza final apareció, o se reemplazó por otra.
    if (conResultado(post) && conResultado(post) !== conResultado(previo)) {
      conPieza.push(post);
    }
  }

  for (const post of conPieza) {
    registrar({
      para: post.clientId,
      clienteId: post.clientId,
      postId: post.id,
      tipo: 'pieza',
      texto: `Ya está la pieza de «${post.title}». Miralo y decinos si va.`,
    });
  }

  for (const [clienteId, lista] of nuevos) {
    if (!clientes.has(clienteId)) continue; // cliente que no existe: no se avisa

    if (lista.length > DE_A_UNA) {
      registrar({
        para: clienteId,
        clienteId,
        tipo: 'contenido',
        texto: `Se cargaron ${lista.length} contenidos nuevos para que revises.`,
      });
      continue;
    }

    for (const post of lista) {
      registrar({
        para: clienteId,
        clienteId,
        postId: post.id,
        tipo: 'contenido',
        texto: `Contenido nuevo para revisar: «${post.title}».`,
      });
    }
  }
}
