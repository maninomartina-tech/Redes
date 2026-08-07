import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rutaDb = process.env.DB_PATH ?? resolve(raiz, 'datos/demm.db');

mkdirSync(dirname(rutaDb), { recursive: true });

export const db = new Database(rutaDb);
db.pragma('journal_mode = WAL');

db.exec(`
  -- Cuentas de Instagram/Facebook conectadas por OAuth.
  CREATE TABLE IF NOT EXISTS cuentas (
    id            TEXT PRIMARY KEY,   -- id de la cuenta de Instagram (ig_user_id)
    nombre        TEXT NOT NULL,
    usuario       TEXT,               -- @arroba
    page_id       TEXT,               -- página de Facebook vinculada
    token         TEXT NOT NULL,      -- token de larga duración
    expira_en     TEXT,
    creada_en     TEXT NOT NULL
  );

  -- Archivos subidos. Meta los descarga desde la URL pública, no se le
  -- pueden enviar como adjunto.
  CREATE TABLE IF NOT EXISTS archivos (
    id            TEXT PRIMARY KEY,
    nombre        TEXT NOT NULL,
    tipo          TEXT NOT NULL,      -- mime
    ruta          TEXT NOT NULL,      -- ruta en disco
    tamano        INTEGER NOT NULL,
    creado_en     TEXT NOT NULL
  );

  -- Cola de publicaciones programadas.
  CREATE TABLE IF NOT EXISTS publicaciones (
    id            TEXT PRIMARY KEY,
    post_id       TEXT NOT NULL,      -- id del contenido en la app
    cuenta_id     TEXT NOT NULL,
    tipo          TEXT NOT NULL,      -- post | reel | carrusel | historia
    caption       TEXT,
    archivos      TEXT NOT NULL,      -- JSON: ids de archivo, en orden
    publicar_en   TEXT NOT NULL,      -- ISO
    estado        TEXT NOT NULL,      -- programado | publicando | publicado | error | cancelado
    intentos      INTEGER NOT NULL DEFAULT 0,
    error         TEXT,
    externo_id    TEXT,               -- id que devuelve Meta
    creada_en     TEXT NOT NULL,
    actualizada_en TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_pub_pendientes
    ON publicaciones (estado, publicar_en);

  -- El token de la persona que conectó Meta.
  --
  -- No alcanza con los de página. Un token de página sirve para lo de esa
  -- página —Instagram, sus métricas— pero las cuentas publicitarias cuelgan
  -- del usuario, no de la página: para listarlas o tocar una campaña hace
  -- falta este. Es uno solo porque hay una sola persona conectando.
  CREATE TABLE IF NOT EXISTS usuario_meta (
    id          INTEGER PRIMARY KEY CHECK (id = 1),
    token       TEXT NOT NULL,
    expira_en   TEXT,
    guardado_en TEXT NOT NULL
  );

  -- Marca de nacimiento de esta base.
  --
  -- Es la única forma de saber si los datos sobreviven de verdad: tener las
  -- variables bien puestas no prueba nada, porque apuntar a una carpeta que
  -- se borra en cada despliegue se ve exactamente igual desde adentro. Si
  -- después de un despliegue esta fecha sigue siendo la vieja y el contador
  -- de arranques subió, el disco está andando.
  CREATE TABLE IF NOT EXISTS instalacion (
    id              INTEGER PRIMARY KEY CHECK (id = 1),
    creada_en       TEXT NOT NULL,
    arranques       INTEGER NOT NULL DEFAULT 1,
    ultimo_arranque TEXT NOT NULL
  );
`);

export const ahora = () => new Date().toISOString();

db.prepare(
  `INSERT INTO instalacion (id, creada_en, arranques, ultimo_arranque)
   VALUES (1, ?, 1, ?)
   ON CONFLICT(id) DO UPDATE SET
     arranques = arranques + 1,
     ultimo_arranque = excluded.ultimo_arranque`
).run(ahora(), ahora());

/** Desde cuándo existe esta base y cuántas veces arrancó el servidor. */
export const instalacion = () =>
  db.prepare('SELECT creada_en, arranques, ultimo_arranque FROM instalacion WHERE id = 1').get();

/** La carpeta donde se guarda todo, para poder mirarla desde afuera. */
export const carpetaDeDatos = dirname(rutaDb);

/** Guarda el token del usuario que acaba de conectar Meta. */
export function guardarTokenDeUsuario(token, expiraEn) {
  db.prepare(
    `INSERT INTO usuario_meta (id, token, expira_en, guardado_en)
     VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       token = excluded.token,
       expira_en = excluded.expira_en,
       guardado_en = excluded.guardado_en`
  ).run(token, expiraEn ?? null, ahora());
}

/** El token del usuario, o `null` si todavía no conectó nadie. */
export function tokenDeUsuario() {
  return db.prepare('SELECT token, expira_en FROM usuario_meta WHERE id = 1').get() ?? null;
}

export const uid = (p) =>
  `${p}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
