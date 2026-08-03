import type { Post } from '@/types';

// ---------------------------------------------------------------------------
// Mejores horarios.
//
// Antes esto miraba una sola publicación —la de mayor interacción— y decía
// "publicá los martes a las 19". Con una pieza no se puede afirmar eso. Acá se
// promedia por día y franja, y se dice claramente cuándo todavía no alcanza.
// ---------------------------------------------------------------------------

export const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const FRANJAS = [
  { nombre: 'Mañana', desde: 6, hasta: 11, etiqueta: '6 a 11 h' },
  { nombre: 'Mediodía', desde: 12, hasta: 14, etiqueta: '12 a 14 h' },
  { nombre: 'Tarde', desde: 15, hasta: 19, etiqueta: '15 a 19 h' },
  { nombre: 'Noche', desde: 20, hasta: 23, etiqueta: '20 a 23 h' },
];

/** Hace falta esto para animarse a decir algo. */
const MINIMO_PIEZAS = 6;
const MINIMO_POR_FRANJA = 2;

export interface Celda {
  /** 0 = lunes */
  dia: number;
  /** índice dentro de FRANJAS */
  franja: number;
  piezas: number;
  promedio: number;
}

export interface Horarios {
  celdas: Celda[];
  mejor: Celda | null;
  /** Máximo promedio, para pintar la intensidad */
  tope: number;
  total: number;
  /** ¿Hay datos suficientes para tomarlo en serio? */
  confiable: boolean;
}

const interaccion = (p: Post) => {
  const m = p.metrics;
  if (!m) return 0;
  return m.likes + m.comments + m.saves + m.shares;
};

/** Lunes = 0, domingo = 6. */
const diaSemana = (d: Date) => (d.getDay() + 6) % 7;

const indiceFranja = (hora: number) =>
  FRANJAS.findIndex((f) => hora >= f.desde && hora <= f.hasta);

export function calcularHorarios(publicados: Post[]): Horarios {
  const conDatos = publicados.filter((p) => p.metrics);

  const acumulado = new Map<string, { suma: number; n: number }>();
  conDatos.forEach((p) => {
    const d = new Date(p.date);
    const f = indiceFranja(d.getHours());
    if (f === -1) return; // madrugada: no es un horario que se recomiende
    const clave = `${diaSemana(d)}-${f}`;
    const c = acumulado.get(clave) ?? { suma: 0, n: 0 };
    c.suma += interaccion(p);
    c.n += 1;
    acumulado.set(clave, c);
  });

  const celdas: Celda[] = [];
  acumulado.forEach((v, clave) => {
    const [dia, franja] = clave.split('-').map(Number);
    celdas.push({ dia, franja, piezas: v.n, promedio: v.suma / v.n });
  });

  const candidatas = celdas.filter((c) => c.piezas >= MINIMO_POR_FRANJA);
  const mejor =
    [...(candidatas.length ? candidatas : celdas)].sort((a, b) => b.promedio - a.promedio)[0] ??
    null;

  return {
    celdas,
    mejor,
    tope: celdas.reduce((m, c) => Math.max(m, c.promedio), 0),
    total: conDatos.length,
    confiable: conDatos.length >= MINIMO_PIEZAS && candidatas.length > 0,
  };
}

export function describirCelda(c: Celda): string {
  return `${DIAS[c.dia]} · ${FRANJAS[c.franja].etiqueta}`;
}
