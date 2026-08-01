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
