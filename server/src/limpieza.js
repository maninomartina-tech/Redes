import { rmSync, existsSync } from 'node:fs';
import { db } from './db.js';
import { leerEspacio } from './espacio.js';
import { borrarDeLaNube } from './nube.js';

// ---------------------------------------------------------------------------
// Que el disco no se llene.
//
// Del otro lado hay 1 GB para todo, y un reel bien exportado pesa 100 MB: sin
// nadie limpiando, un año de trabajo no entra. Cuando se llena no avisa nada
// —la subida falla y las piezas del cliente dejan de abrir—, así que esto
// tiene que pasar solo.
//
// Hay dos limpiezas distintas y conviene no mezclarlas:
//
//   · La de archivos sin dueño. Cada vez que se reemplaza una pieza o se borra
//     un contenido, el archivo queda en el disco sin que nadie lo nombre. Eso
//     no es una política: es basura, y se puede barrer sin preguntar.
//
//   · La de las piezas viejas. Esa sí es una decisión —qué tan atrás se
//     conserva lo publicado— y la toma la app, que es la que sabe qué pieza es
//     de qué contenido. Acá solo se borra lo que pide, y se comprueba que no
//     esté en uso.
// ---------------------------------------------------------------------------

/**
 * Cuánto tiene que haber vivido un archivo sin dueño para barrerlo.
 *
 * El archivo se sube antes de que el contenido que lo nombra llegue al
 * servidor: entre una cosa y la otra pasa un segundo largo. Sin esta espera,
 * barrer justo en el medio borraría la pieza que se acaba de subir.
 */
const HORAS_DE_GRACIA = 24;

/**
 * Todos los ids de archivo que aparecen en algún lado del espacio.
 *
 * Se recorre el documento entero en vez de mirar campo por campo a propósito:
 * las piezas viven en cuatro lugares distintos de un contenido, más el logo de
 * cada cliente y el de la marca, y el día que se agregue un quinto nadie se va
 * a acordar de actualizar esta lista. Barrer de más borra trabajo; barrer de
 * menos solo deja un archivo ocupando lugar.
 */
export function archivosEnUso(datos) {
  const ids = new Set();

  const enLaDireccion = (texto) => {
    const m = /\/archivos\/([\w.-]+)/.exec(texto);
    if (m) ids.add(m[1]);
  };

  const mirar = (valor) => {
    if (!valor) return;
    if (typeof valor === 'string') return enLaDireccion(valor);
    if (Array.isArray(valor)) return valor.forEach(mirar);
    if (typeof valor !== 'object') return;

    if (typeof valor.remoteId === 'string') ids.add(valor.remoteId);
    Object.values(valor).forEach(mirar);
  };

  mirar(datos);
  return ids;
}

/**
 * Los archivos de lo que está esperando para publicarse.
 *
 * No están en el espacio: viven en la cola del servidor. Borrar uno de estos
 * sería dejar una publicación programada sin nada que subir.
 */
export function archivosDeLaCola() {
  const ids = new Set();
  const filas = db
    .prepare(`SELECT archivos FROM publicaciones WHERE estado IN ('programado', 'publicando')`)
    .all();

  for (const fila of filas) {
    try {
      JSON.parse(fila.archivos ?? '[]').forEach((id) => ids.add(id));
    } catch {
      /* una fila ilegible no puede frenar la limpieza */
    }
  }
  return ids;
}

/**
 * Lo que hay guardado hoy, en archivos y en bytes.
 *
 * Lo que figura como "sin dueño" es exactamente lo que la barrida se llevaría,
 * espera incluida: un número que no coincide con lo que después pasa es peor
 * que no mostrar ninguno.
 */
export function queHayGuardado() {
  const total = db
    .prepare('SELECT COUNT(*) n, COALESCE(SUM(tamano), 0) bytes FROM archivos')
    .get();

  const sueltos = archivosSinDueno();
  const bytesSueltos = sueltos.reduce((s, id) => {
    const a = db.prepare('SELECT tamano FROM archivos WHERE id = ?').get(id);
    return s + (a?.tamano ?? 0);
  }, 0);

  return {
    archivos: total.n,
    bytes: total.bytes,
    sinDueno: sueltos.length,
    bytesSinDueno: bytesSueltos,
  };
}

/** Los ids que no nombra nadie y ya pasaron la espera. */
export function archivosSinDueno({ horasDeGracia = HORAS_DE_GRACIA } = {}) {
  const { datos } = leerEspacio();
  const enUso = archivosEnUso(datos);
  const enCola = archivosDeLaCola();
  const corte = new Date(Date.now() - horasDeGracia * 3600_000).toISOString();

  return db
    .prepare('SELECT id FROM archivos WHERE creado_en < ?')
    .all(corte)
    .map((a) => a.id)
    .filter((id) => !enUso.has(id) && !enCola.has(id));
}

/**
 * Borra archivos, del disco o de la nube, y los saca de la base.
 *
 * Nunca borra uno que esté en uso, aunque se lo pidan: del otro lado hay una
 * app que puede equivocarse, y acá es donde se puede comprobar. Lo que se
 * salva se cuenta aparte, para que no pase desapercibido.
 */
export async function borrarArchivos(ids) {
  const { datos } = leerEspacio();
  const enUso = archivosEnUso(datos);
  const enCola = archivosDeLaCola();

  let borrados = 0;
  let bytes = 0;
  const enUsoSalvados = [];
  const fallados = [];

  for (const id of ids) {
    if (enUso.has(id) || enCola.has(id)) {
      enUsoSalvados.push(id);
      continue;
    }

    const archivo = db.prepare('SELECT * FROM archivos WHERE id = ?').get(id);
    if (!archivo) continue;

    try {
      if (archivo.url_externa) await borrarDeLaNube(id);
      else if (archivo.ruta && existsSync(archivo.ruta)) rmSync(archivo.ruta, { force: true });
    } catch {
      // Si el archivo no se pudo borrar, la fila se queda: borrarla dejaría
      // el archivo ocupando lugar sin que nadie sepa que está.
      fallados.push(id);
      continue;
    }

    db.prepare('DELETE FROM archivos WHERE id = ?').run(id);
    borrados += 1;
    bytes += archivo.tamano ?? 0;
  }

  return { borrados, bytes, enUso: enUsoSalvados, fallados };
}

/** La barrida de lo que no nombra nadie. Es la que corre sola. */
export async function barrerSinDueno(opciones) {
  return borrarArchivos(archivosSinDueno(opciones));
}
