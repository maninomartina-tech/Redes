import type { MediaRef, Post, PostType } from '@/types';

// ---------------------------------------------------------------------------
// Las piezas finales de una publicación.
//
// No todas las publicaciones son un archivo. Un carrusel son varias imágenes
// en un orden que importa —la primera es la que frena el scroll— y un reel son
// dos cosas distintas: el video y la portada que se ve en el feed cuando el
// video está quieto.
//
// El modelo guarda `resultado` como la pieza que representa la publicación (la
// que va al feed y la que se sube al publicar) y `carrusel` con las demás. Así
// todo lo que ya existía —la miniatura, el aviso de "pieza lista", la
// publicación automática— sigue mirando un solo campo.
// ---------------------------------------------------------------------------

/** Cuántas piezas admite cada tipo. El carrusel es el único con varias. */
export function admiteVarias(tipo: PostType): boolean {
  return tipo === 'carrusel';
}

/** Un reel se carga en dos partes: el video y su portada. */
export function llevaPortada(tipo: PostType): boolean {
  return tipo === 'reel';
}

/** Todas las piezas finales, en orden. Para un carrusel son sus imágenes. */
export function piezasFinales(p: {
  resultado?: MediaRef;
  carrusel?: MediaRef[];
}): MediaRef[] {
  return p.resultado ? [p.resultado, ...(p.carrusel ?? [])] : [];
}

/**
 * Parte una lista de piezas en los dos campos que guarda el modelo.
 *
 * Devuelve `carrusel` siempre —vacío si no queda ninguna— para que al borrar
 * imágenes el campo se limpie en vez de quedar con las viejas.
 */
export function repartirPiezas(piezas: MediaRef[]): {
  resultado?: MediaRef;
  carrusel: MediaRef[];
} {
  return { resultado: piezas[0], carrusel: piezas.slice(1) };
}

/**
 * La imagen que representa la publicación en una miniatura.
 *
 * Para un reel es la portada si la cargó: es exactamente para eso que existe.
 * Si no hay portada, el propio video, que igual se puede mostrar.
 */
export function portadaDelFeed(p: Post): MediaRef | undefined {
  return p.portada ?? p.resultado;
}

/** Mueve una pieza un lugar para adelante o para atrás, sin salirse de la lista. */
export function mover<T>(lista: T[], desde: number, hacia: number): T[] {
  if (hacia < 0 || hacia >= lista.length || desde === hacia) return lista;
  const copia = [...lista];
  const [item] = copia.splice(desde, 1);
  copia.splice(hacia, 0, item);
  return copia;
}
