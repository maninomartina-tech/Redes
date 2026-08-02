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
`);

export const ahora = () => new Date().toISOString();

export const uid = (p) =>
  `${p}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
