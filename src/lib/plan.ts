import type { FilaDePlan, PlanMensual, Post, PostType } from '@/types';
import { fmt } from '@/lib/date';

// ---------------------------------------------------------------------------
// El plan del mes.
//
// El calendario sirve para producir: una pieza por vez, con su estado, sus
// comentarios y sus archivos. Pero antes hay otro momento, que es pensar el mes
// entero de un saque: qué se busca, qué se va a desarrollar y qué sale cada
// día, con el copy escrito seguido.
//
// Eso es lo que vive acá, y por eso una fila tiene cinco cosas y nada más:
// fecha, tipo, referencia, el contenido —el guion— y el copy. Lo demás —la
// pieza, el estado, la aprobación— aparece recién cuando se pasa al
// calendario.
// ---------------------------------------------------------------------------

/** 'YYYY-MM' del mes de una fecha. */
export function claveDeMes(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** 'YYYY-MM' → una fecha del mes, para escribirlo con palabras. */
export function fechaDeMes(mes: string): Date {
  const [anio, m] = mes.split('-').map(Number);
  return new Date(anio, m - 1, 1);
}

export function nombreDeMes(mes: string): string {
  return fmt(fechaDeMes(mes).toISOString(), 'MMMM yyyy');
}

/** El mes siguiente y el anterior, para moverse. */
export function mesCorrido(mes: string, cuantos: number): string {
  const d = fechaDeMes(mes);
  d.setMonth(d.getMonth() + cuantos);
  return claveDeMes(d);
}

export function planDeCliente(
  planes: PlanMensual[],
  clientId: string,
  mes: string
): PlanMensual | undefined {
  return planes.find((p) => p.clientId === clientId && p.month === mes);
}

/** Los meses que ese cliente ya tiene planificados, del más nuevo al más viejo. */
export function mesesConPlan(planes: PlanMensual[], clientId: string): string[] {
  return planes
    .filter((p) => p.clientId === clientId)
    .map((p) => p.month)
    .sort((a, b) => b.localeCompare(a));
}

/** Las filas por fecha, que es el orden en que se graba. */
export function filasOrdenadas(filas: FilaDePlan[]): FilaDePlan[] {
  return [...filas].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/**
 * El título de la pieza, sacado de lo que ya está escrito.
 *
 * El plan no pide título —ninguna de sus columnas lo es—, pero del otro lado
 * cada pieza necesita un nombre para poder encontrarla. El primer renglón del
 * copy, o del guion si el copy todavía está vacío, es lo que ella reconocería.
 */
export function tituloDeFila(fila: FilaDePlan): string {
  const primera = `${fila.copy}\n${fila.contenido ?? ''}`
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0);

  if (primera) return primera.length > 70 ? `${primera.slice(0, 67)}…` : primera;

  const como: Record<PostType, string> = {
    reel: 'Reel',
    post: 'Posteo',
    carrusel: 'Carrusel',
    historia: 'Historia',
  };
  return `${como[fila.tipo]} del ${fmt(fila.fecha, "d 'de' MMMM")}`;
}

/**
 * ¿Esta línea ya está en el calendario?
 *
 * No alcanza con que tenga `postId`: la pieza puede haberse borrado del
 * calendario después, y en ese caso la línea vuelve a estar pendiente.
 */
export function yaEstaEnElCalendario(fila: FilaDePlan, posts: Post[]): boolean {
  return Boolean(fila.postId && posts.some((p) => p.id === fila.postId));
}

/** Las que todavía no se pasaron. Es lo que hace el botón. */
export function filasPendientes(plan: PlanMensual, posts: Post[]): FilaDePlan[] {
  return filasOrdenadas(plan.filas).filter((f) => !yaEstaEnElCalendario(f, posts));
}

/**
 * ¿Se puede pasar al calendario?
 *
 * Una línea vacía no es una pieza: sería crear un contenido en blanco y tener
 * que completarlo igual. Alcanza con el guion o con el copy —un reel puede
 * tener el guion escrito y el copy todavía no— pero algo tiene que haber.
 */
export function filasListas(plan: PlanMensual, posts: Post[]): FilaDePlan[] {
  return filasPendientes(plan, posts).filter(
    (f) => f.copy.trim().length > 0 || (f.contenido ?? '').trim().length > 0
  );
}

/** Cuántas hay de cada tipo, para el resumen de arriba. */
export function cuentaPorTipo(filas: FilaDePlan[]): Record<PostType, number> {
  const cuenta: Record<PostType, number> = { reel: 0, post: 0, carrusel: 0, historia: 0 };
  filas.forEach((f) => (cuenta[f.tipo] += 1));
  return cuenta;
}

/**
 * Una fila nueva, el día que sigue a la última.
 *
 * La primera del mes cae hoy, no el día 1: si estamos a 21 no tiene sentido
 * empezar a planificar el 1, que ya pasó. En un mes que todavía no empezó, en
 * cambio, el 1 es el principio de verdad.
 */
export function filaNueva(
  plan: PlanMensual | undefined,
  mes: string,
  hoy = new Date()
): Omit<FilaDePlan, 'id'> {
  const ultimas = filasOrdenadas(plan?.filas ?? []);
  const ultima = ultimas[ultimas.length - 1];

  const arranque = claveDeMes(hoy) === mes ? new Date(hoy) : fechaDeMes(mes);
  const fecha = ultima ? new Date(ultima.fecha) : arranque;
  if (ultima) fecha.setDate(fecha.getDate() + 2);
  fecha.setHours(12, 0, 0, 0);

  // Si se pasó de mes, se vuelve al último día del mes planificado.
  if (claveDeMes(fecha) !== mes) {
    const fin = fechaDeMes(mes);
    fin.setMonth(fin.getMonth() + 1);
    fin.setDate(0);
    fin.setHours(12, 0, 0, 0);
    return { fecha: fin.toISOString(), tipo: 'post', copy: '' };
  }

  return { fecha: fecha.toISOString(), tipo: ultima?.tipo ?? 'post', copy: '' };
}
