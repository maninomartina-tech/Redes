import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';

export function fmt(iso: string, pattern: string): string {
  return format(new Date(iso), pattern, { locale: es });
}

export function fmtDate(iso: string): string {
  return format(new Date(iso), "d 'de' MMMM", { locale: es });
}

export function fmtDateTime(iso: string): string {
  return format(new Date(iso), "EEE d MMM · HH:mm", { locale: es });
}

export function fmtTime(iso: string): string {
  return format(new Date(iso), 'HH:mm', { locale: es });
}

/**
 * Lo que espera `<input type="datetime-local">`: 'YYYY-MM-DDTHH:mm' en hora
 * local. No sirve el ISO tal cual, que viene en UTC y le correría la hora.
 */
export function paraInput(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
}

/** El camino de vuelta: lo que escribió en el campo, guardado como ISO. */
export function desdeInput(valor: string): string {
  const d = new Date(valor);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/**
 * Mueve una publicación a otro día conservándole la hora.
 *
 * Es lo que pasa al arrastrarla en el calendario: cambia el día, pero el
 * horario que ya se había pensado para esa pieza se respeta.
 */
export function moverADia(iso: string, dia: Date): string {
  const anterior = new Date(iso);
  const nueva = new Date(dia);
  nueva.setHours(anterior.getHours(), anterior.getMinutes(), 0, 0);
  return nueva.toISOString();
}

/** Devuelve la grilla de días del mes (semanas completas, lunes a domingo). */
export function monthGrid(anchor: Date): Date[] {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
  const days: Date[] = [];
  let cur = start;
  while (cur <= end) {
    days.push(cur);
    cur = addDays(cur, 1);
  }
  return days;
}

/** Los 7 días de la semana que contiene `anchor`. */
export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export const weekdayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export { addDays, isSameDay, isSameMonth, startOfMonth };
