import type { MediaRef, Post } from '@/types';

// ---------------------------------------------------------------------------
// Liberar el espacio que ocupan las piezas viejas.
//
// Un reel exportado pesa cien veces más que todo el texto de un mes. El
// servidor tiene 1 GB, el navegador tiene su propio cupo, y los dos se llenan
// sin avisar: la subida empieza a fallar y las piezas del cliente dejan de
// abrir.
//
// Lo que se libera es el archivo, no el contenido. El título, el copy, el
// guion, los comentarios y las métricas quedan: lo único que desaparece es el
// video o la foto de una pieza que ya se publicó hace rato y que, desde que
// salió, vive en Instagram.
//
// Por eso la regla no es "del mes pasado" a secas sino "publicada hace más de
// un mes": una pieza que todavía no salió es justamente la que no se puede
// borrar, tenga la fecha que tenga.
// ---------------------------------------------------------------------------

/** Cuánto se conserva, de arranque. */
export const DIAS_POR_DEFECTO = 30;

/** Los archivos que cuelgan de un contenido, en todos los lugares donde puede haberlos. */
export function archivosDe(post: Post): MediaRef[] {
  return [
    post.resultado,
    post.portada,
    ...(post.carrusel ?? []),
    ...(post.inspiracionMedia ?? []),
  ].filter((m): m is MediaRef => Boolean(m));
}

/** Lo que ocupa un contenido en archivos. */
export function pesoDe(post: Post): number {
  return archivosDe(post).reduce((s, m) => s + (m.size ?? 0), 0);
}

/**
 * ¿A este contenido se le puede liberar la pieza?
 *
 * Tres condiciones, y las tres hacen falta:
 *   · ya se publicó —si no salió, el archivo es la única copia—;
 *   · salió hace más de `dias`;
 *   · y todavía tiene archivos cargados.
 */
export function sePuedeLiberar(post: Post, dias: number, ahora: Date): boolean {
  if (post.status !== 'publicado') return false;
  if (archivosDe(post).length === 0) return false;

  const corte = new Date(ahora);
  corte.setDate(corte.getDate() - dias);
  return new Date(post.date) < corte;
}

export interface ParaLiberar {
  posts: Post[];
  /** Los archivos locales, los del navegador. */
  locales: string[];
  /** Los del servidor, que son los que llenan el disco. */
  remotos: string[];
  bytes: number;
}

export function loQueSePuedeLiberar(
  posts: Post[],
  { dias = DIAS_POR_DEFECTO, ahora = new Date() }: { dias?: number; ahora?: Date } = {}
): ParaLiberar {
  const elegidos = posts.filter((p) => sePuedeLiberar(p, dias, ahora));
  const locales: string[] = [];
  const remotos: string[] = [];
  let bytes = 0;

  for (const post of elegidos) {
    for (const m of archivosDe(post)) {
      locales.push(m.id);
      if (m.remoteId) remotos.push(m.remoteId);
      bytes += m.size ?? 0;
    }
  }

  return { posts: elegidos, locales, remotos, bytes };
}

/**
 * Cómo queda un contenido al que se le liberaron los archivos.
 *
 * Se le sacan las piezas y se le deja la fecha en que se liberaron: sin esa
 * marca, la pantalla no tendría forma de distinguir "ya no está" de "nunca se
 * cargó", y le pediría que suba algo que ya se publicó.
 */
export function sinArchivos(post: Post, cuando: string): Partial<Post> {
  return {
    resultado: undefined,
    portada: undefined,
    carrusel: undefined,
    inspiracionMedia: [],
    archivosLiberados: cuando,
  };
}

/** Para escribirlo en pantalla sin pensar. */
export function enMegas(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  if (bytes > 0) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return '0 MB';
}
