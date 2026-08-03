import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { ahora, db } from './db.js';

// ---------------------------------------------------------------------------
// Espacio de trabajo y portales de cliente.
//
// Todo lo que la creadora carga —clientes, contenido, crecimiento, ventas—
// vive acá, en el servidor, y no en el navegador. Así entra desde cualquier
// dispositivo y, sobre todo, cada cliente puede ver lo suyo con su link.
//
// Se guarda como un único documento JSON en vez de una tabla por cosa: hay
// una sola persona escribiendo y el volumen es chico, así que no compensa la
// complejidad de un esquema relacional. Los clientes no escriben el documento
// entero: mandan acciones puntuales (comentar, aprobar) que se aplican acá.
// ---------------------------------------------------------------------------

db.exec(`
  CREATE TABLE IF NOT EXISTS espacio (
    id            INTEGER PRIMARY KEY CHECK (id = 1),
    datos         TEXT NOT NULL,
    version       INTEGER NOT NULL DEFAULT 1,
    actualizado_en TEXT NOT NULL
  );

  -- Un link secreto por cliente.
  CREATE TABLE IF NOT EXISTS portales (
    token        TEXT PRIMARY KEY,
    cliente_id   TEXT NOT NULL,
    creado_en    TEXT NOT NULL,
    ultimo_acceso TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_portales_cliente ON portales (cliente_id);

  -- Sesiones de la creadora.
  CREATE TABLE IF NOT EXISTS sesiones (
    token     TEXT PRIMARY KEY,
    creada_en TEXT NOT NULL
  );
`);

const VACIO = { clients: [], posts: [], campaigns: [], ads: [], monthlyStats: [], leads: [] };

/* ------------------------------- documento ------------------------------- */

export function leerEspacio() {
  const fila = db.prepare('SELECT datos, version FROM espacio WHERE id = 1').get();
  if (!fila) return { datos: VACIO, version: 0 };
  return { datos: JSON.parse(fila.datos), version: fila.version };
}

export function guardarEspacio(datos) {
  const { version } = leerEspacio();
  const nueva = version + 1;
  db.prepare(
    `INSERT INTO espacio (id, datos, version, actualizado_en)
     VALUES (1, @datos, @version, @cuando)
     ON CONFLICT(id) DO UPDATE SET
       datos = @datos, version = @version, actualizado_en = @cuando`
  ).run({ datos: JSON.stringify(datos), version: nueva, cuando: ahora() });
  return nueva;
}

/** Aplica un cambio puntual sobre el documento, sin pisar el resto. */
function modificarEspacio(fn) {
  const { datos } = leerEspacio();
  const resultado = fn(datos);
  guardarEspacio(datos);
  return resultado;
}

/* --------------------------- clave de la creadora ------------------------ */

const hash = (s) => createHash('sha256').update(String(s)).digest();

function comparar(a, b) {
  const ha = hash(a);
  const hb = hash(b);
  return timingSafeEqual(ha, hb);
}

export function hayClave() {
  return Boolean(process.env.CLAVE_CREADORA);
}

export function iniciarSesion(clave) {
  if (!hayClave()) return null;
  if (!clave || !comparar(clave, process.env.CLAVE_CREADORA)) return null;

  const token = randomBytes(24).toString('base64url');
  db.prepare('INSERT INTO sesiones (token, creada_en) VALUES (?, ?)').run(token, ahora());
  return token;
}

export function sesionValida(token) {
  if (!token) return false;
  return Boolean(db.prepare('SELECT token FROM sesiones WHERE token = ?').get(token));
}

export function cerrarSesion(token) {
  db.prepare('DELETE FROM sesiones WHERE token = ?').run(token);
}

/* ------------------------------- portales -------------------------------- */

/** Crea (o rehace) el link secreto de un cliente. */
export function crearPortal(clienteId) {
  db.prepare('DELETE FROM portales WHERE cliente_id = ?').run(clienteId);
  const token = randomBytes(12).toString('base64url');
  db.prepare(
    'INSERT INTO portales (token, cliente_id, creado_en) VALUES (?, ?, ?)'
  ).run(token, clienteId, ahora());
  return token;
}

export function listarPortales() {
  return db.prepare('SELECT * FROM portales').all();
}

export function borrarPortal(clienteId) {
  db.prepare('DELETE FROM portales WHERE cliente_id = ?').run(clienteId);
}

function portalPorToken(token) {
  const p = db.prepare('SELECT * FROM portales WHERE token = ?').get(token);
  if (p) {
    db.prepare('UPDATE portales SET ultimo_acceso = ? WHERE token = ?').run(ahora(), token);
  }
  return p;
}

/**
 * Lo que ve un cliente con su link: únicamente lo suyo.
 *
 * Se filtra acá, en el servidor, y no en la app: si dependiera del navegador,
 * bastaría con mirar la respuesta para ver los datos de los demás.
 */
export function datosDelPortal(token) {
  const portal = portalPorToken(token);
  if (!portal) return null;

  const { datos } = leerEspacio();
  const cliente = (datos.clients ?? []).find((c) => c.id === portal.cliente_id);
  if (!cliente) return null;

  const id = cliente.id;
  return {
    cliente,
    posts: (datos.posts ?? []).filter((p) => p.clientId === id),
    campaigns: (datos.campaigns ?? []).filter((c) => c.clientId === id),
    monthlyStats: (datos.monthlyStats ?? []).filter((m) => m.clientId === id),
    // Las ventas solo si ese cliente las mide.
    leads: cliente.tracksLeads ? (datos.leads ?? []).filter((l) => l.clientId === id) : [],
    branding: datos.branding ?? null,
    brandLogo: datos.brandLogo ?? null,
  };
}

/* ------------------- acciones que puede hacer un cliente ----------------- */

/** El cliente deja un comentario en una pieza suya. */
export function comentarDesdePortal(token, postId, texto) {
  const portal = portalPorToken(token);
  if (!portal) return { ok: false, error: 'Link inválido.' };
  if (!texto?.trim()) return { ok: false, error: 'El comentario está vacío.' };

  return modificarEspacio((datos) => {
    const post = (datos.posts ?? []).find(
      (p) => p.id === postId && p.clientId === portal.cliente_id
    );
    if (!post) return { ok: false, error: 'Ese contenido no es de este cliente.' };

    const cliente = (datos.clients ?? []).find((c) => c.id === portal.cliente_id);
    post.comments = post.comments ?? [];
    post.comments.push({
      id: `cm_${randomBytes(6).toString('hex')}`,
      author: 'cliente',
      authorName: cliente?.name ?? 'Cliente',
      text: texto.trim(),
      createdAt: ahora(),
      resolved: false,
    });
    return { ok: true };
  });
}

/** El cliente aprueba una pieza o pide cambios. */
export function decidirDesdePortal(token, postId, decision) {
  const portal = portalPorToken(token);
  if (!portal) return { ok: false, error: 'Link inválido.' };
  if (!['aprobado', 'revision'].includes(decision)) {
    return { ok: false, error: 'Decisión no válida.' };
  }

  return modificarEspacio((datos) => {
    const post = (datos.posts ?? []).find(
      (p) => p.id === postId && p.clientId === portal.cliente_id
    );
    if (!post) return { ok: false, error: 'Ese contenido no es de este cliente.' };
    post.status = decision;
    return { ok: true, status: decision };
  });
}
