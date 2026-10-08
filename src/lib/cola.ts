import type { Post } from '@/types';
import { isSameDay } from '@/lib/date';

// ---------------------------------------------------------------------------
// La cola: lo que sale, día por día.
//
// Es la pantalla con la que se abre Buffer, y la que faltaba acá. El
// calendario sirve para ver la forma del mes; la cola sirve para la pregunta
// de todos los días, que es "qué sale ahora y qué viene después".
//
// Por eso es una lista y no una grilla: los días vacíos no ocupan lugar, el
// orden es el del reloj, y lo primero que se ve es lo primero que hay que
// hacer.
// ---------------------------------------------------------------------------

export interface DiaDeLaCola {
  /** El día, a las 00:00. */
  dia: Date;
  posts: Post[];
}

export interface Cola {
  /** Lo que ya venció y sigue sin salir. Va arriba de todo. */
  atrasados: Post[];
  dias: DiaDeLaCola[];
  /** Cuántas piezas hay en total, sin contar lo ya publicado. */
  cuantas: number;
}

const alPrincipioDelDia = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/**
 * Arma la cola.
 *
 * Lo publicado no entra: la cola es lo que falta. Para mirar hacia atrás está
 * el calendario, que muestra el mes entero con lo que ya salió.
 */
export function armarCola(posts: Post[], ahora = new Date()): Cola {
  const pendientes = posts
    .filter((p) => p.status !== 'publicado')
    .sort((a, b) => a.date.localeCompare(b.date));

  const atrasados = pendientes.filter(
    (p) => new Date(p.date) < ahora && !isSameDay(p.date, ahora)
  );

  const porDia = new Map<number, Post[]>();
  for (const post of pendientes) {
    if (atrasados.includes(post)) continue;
    const dia = alPrincipioDelDia(new Date(post.date));
    const clave = dia.getTime();
    const lista = porDia.get(clave);
    if (lista) lista.push(post);
    else porDia.set(clave, [post]);
  }

  const dias = [...porDia.entries()]
    .sort(([a], [b]) => a - b)
    .map(([clave, lista]) => ({ dia: new Date(clave), posts: lista }));

  return { atrasados, dias, cuantas: pendientes.length };
}

/**
 * Cómo se llama un día en la cola.
 *
 * "Hoy" y "mañana" se dicen con esas palabras: una fecha donde esperaba
 * "mañana" se lee dos veces.
 */
export function nombreDelDia(dia: Date, ahora = new Date()): 'hoy' | 'manana' | null {
  if (isSameDay(dia, ahora)) return 'hoy';
  const manana = new Date(ahora);
  manana.setDate(manana.getDate() + 1);
  return isSameDay(dia, manana) ? 'manana' : null;
}
