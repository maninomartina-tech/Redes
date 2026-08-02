import { ahora, db } from './db.js';
import { publicarEnInstagram } from './meta.js';

// ---------------------------------------------------------------------------
// Programador: cada minuto revisa la cola y publica lo que ya venció.
//
// Vive en el servidor a propósito. Si esto dependiera del navegador, con la
// app cerrada a la hora de publicar no se subiría nada.
// ---------------------------------------------------------------------------

const MAX_INTENTOS = 3;
const INTERVALO_MS = 60_000;

/** Publicaciones que ya deberían haber salido y siguen esperando. */
function pendientes() {
  return db
    .prepare(
      `SELECT * FROM publicaciones
       WHERE estado = 'programado' AND publicar_en <= ?
       ORDER BY publicar_en ASC
       LIMIT 10`
    )
    .all(ahora());
}

function marcar(id, campos) {
  const sets = Object.keys(campos)
    .map((k) => `${k} = @${k}`)
    .join(', ');
  db.prepare(
    `UPDATE publicaciones SET ${sets}, actualizada_en = @actualizada_en WHERE id = @id`
  ).run({ ...campos, id, actualizada_en: ahora() });
}

/** URL pública desde la que Meta va a descargar cada archivo. */
function urlPublica(archivoId) {
  const base = (process.env.PUBLIC_URL ?? '').replace(/\/$/, '');
  return `${base}/archivos/${archivoId}`;
}

function archivosDe(publicacion) {
  const ids = JSON.parse(publicacion.archivos);
  return ids
    .map((id) => db.prepare('SELECT * FROM archivos WHERE id = ?').get(id))
    .filter(Boolean)
    .map((a) => ({ url: urlPublica(a.id), esVideo: a.tipo.startsWith('video') }));
}

export async function publicarUna(publicacion, { publicador = publicarEnInstagram } = {}) {
  const cuenta = db.prepare('SELECT * FROM cuentas WHERE id = ?').get(publicacion.cuenta_id);
  if (!cuenta) {
    marcar(publicacion.id, {
      estado: 'error',
      error: 'La cuenta ya no está conectada.',
      intentos: publicacion.intentos + 1,
    });
    return { ok: false, error: 'cuenta no conectada' };
  }

  const archivos = archivosDe(publicacion);
  if (archivos.length === 0) {
    marcar(publicacion.id, {
      estado: 'error',
      error: 'No se encontró el archivo a publicar.',
      intentos: publicacion.intentos + 1,
    });
    return { ok: false, error: 'sin archivo' };
  }

  if (!process.env.PUBLIC_URL) {
    marcar(publicacion.id, {
      estado: 'error',
      error:
        'Falta configurar PUBLIC_URL: Meta necesita una dirección pública desde donde descargar el archivo.',
      intentos: publicacion.intentos + 1,
    });
    return { ok: false, error: 'sin PUBLIC_URL' };
  }

  marcar(publicacion.id, { estado: 'publicando' });

  try {
    const r = await publicador({
      igUserId: cuenta.id,
      token: cuenta.token,
      tipo: publicacion.tipo,
      archivos,
      caption: publicacion.caption ?? '',
    });
    marcar(publicacion.id, {
      estado: 'publicado',
      externo_id: r.id,
      error: null,
      intentos: publicacion.intentos + 1,
    });
    return { ok: true, id: r.id };
  } catch (e) {
    const intentos = publicacion.intentos + 1;
    const sinReintentos = intentos >= MAX_INTENTOS;
    marcar(publicacion.id, {
      // Si quedan intentos vuelve a la cola; si no, queda en error.
      estado: sinReintentos ? 'error' : 'programado',
      error: e.message ?? String(e),
      intentos,
    });
    return { ok: false, error: e.message, reintentara: !sinReintentos };
  }
}

/** Procesa toda la cola vencida. Devuelve cuántas publicó. */
export async function procesarCola(opciones = {}) {
  const lista = pendientes();
  let publicadas = 0;
  for (const p of lista) {
    const r = await publicarUna(p, opciones);
    if (r.ok) publicadas++;
  }
  return { revisadas: lista.length, publicadas };
}

export function iniciarProgramador() {
  const tick = async () => {
    try {
      const r = await procesarCola();
      if (r.revisadas > 0) {
        console.log(`[programador] ${r.publicadas}/${r.revisadas} publicadas`);
      }
    } catch (e) {
      console.error('[programador] error inesperado:', e);
    }
  };
  tick();
  return setInterval(tick, INTERVALO_MS);
}
