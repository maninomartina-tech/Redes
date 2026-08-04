import { addDays } from '@/lib/date';

// ---------------------------------------------------------------------------
// Leer una tanda de historias escrita a mano.
//
// La planificación de historias no se piensa de a una: se escribe de corrido,
// en un cuaderno, en las notas del teléfono o en un Word, y recién después hay
// que pasarla a la app. Cargarlas de a una es el trabajo aburrido que nadie
// quiere hacer, así que acá se lee ese texto tal como salió.
//
// El intérprete es a propósito tolerante: nadie escribe dos veces igual. Pero
// nunca crea nada solo — devuelve lo que entendió para que se mire antes, y
// además devuelve lo que NO entendió, que es la parte que suele faltar en
// estas cosas: si algo se pierde en el camino, tiene que verse.
// ---------------------------------------------------------------------------

/** Una historia leída del texto, ya con su día resuelto. */
export interface HistoriaLeida {
  /** Fecha y hora en que queda planificada. */
  fecha: Date;
  /** Su orden dentro del día: 1, 2, 3… */
  numero: number;
  titulo: string;
}

export interface Lectura {
  historias: HistoriaLeida[];
  /** Renglones que no se pudieron interpretar. Se muestran, no se descartan. */
  sinReconocer: string[];
}

const DIAS_SEMANA = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

const sinTildes = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * La hora de cada historia.
 *
 * No se le pregunta: las historias duran 24 h y el horario exacto casi nunca
 * importa. Lo que sí importa es que queden en orden dentro del día, así que la
 * primera va a las 10 y cada una siguiente dos horas después.
 */
function horaDeLaHistoria(dia: Date, numero: number): Date {
  const f = new Date(dia);
  f.setHours(Math.min(10 + (numero - 1) * 2, 22), 0, 0, 0);
  return f;
}

/** Qué día abre este renglón, si es que abre alguno. */
function leerEncabezadoDeDia(linea: string, desde: Date): Date | null {
  const limpio = sinTildes(linea).replace(/^[-•*\s]+/, '');

  // "Día 1", "Dia 3:"
  const relativo = /^dia\s*(\d{1,3})\b/.exec(limpio);
  if (relativo) return addDays(desde, Number(relativo[1]) - 1);

  // "12/08", "12-8-2026"
  const fecha = /^(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?\b/.exec(limpio);
  if (fecha) {
    const [, d, m, a] = fecha;
    const anio = a ? (a.length === 2 ? 2000 + Number(a) : Number(a)) : desde.getFullYear();
    const f = new Date(anio, Number(m) - 1, Number(d));
    return isNaN(f.getTime()) ? null : f;
  }

  // "Lunes", "Lunes 5"
  const nombre = DIAS_SEMANA.findIndex((d) => limpio.startsWith(sinTildes(d)));
  if (nombre >= 0) {
    const conNumero = /^\S+\s+(\d{1,2})\b/.exec(limpio);
    if (conNumero) {
      return new Date(desde.getFullYear(), desde.getMonth(), Number(conNumero[1]));
    }
    // El próximo día con ese nombre, contando desde el arranque.
    for (let i = 0; i < 7; i++) {
      const f = addDays(desde, i);
      if (f.getDay() === nombre) return f;
    }
  }

  return null;
}

/**
 * Qué historias hay en este renglón.
 *
 * Devuelve más de una cuando el renglón dice "historia 1 y 2": es una forma
 * habitual de anotar que la misma idea ocupa dos placas seguidas.
 */
function leerHistoria(linea: string): { cuantas: number; titulo: string } | null {
  const limpio = linea.replace(/^[-•*\s]+/, '').trim();
  if (!limpio) return null;

  // "Historia 1: ...", "Historias 1 y 2 - ...", "H2. ..."
  const conEtiqueta = /^h(?:istoria)?s?\s*(\d+(?:\s*(?:y|,|&)\s*\d+)*)?\s*[:.\-–—]?\s*(.*)$/i.exec(
    limpio
  );
  if (conEtiqueta && (conEtiqueta[1] || /^h(istoria)?s?\b/i.test(limpio))) {
    const numeros = conEtiqueta[1] ? conEtiqueta[1].split(/\s*(?:y|,|&)\s*/).length : 1;
    const titulo = conEtiqueta[2].trim();
    return titulo ? { cuantas: numeros, titulo } : null;
  }

  // "1) ...", "2. ..."
  const numerada = /^(\d{1,2})\s*[).\-–]\s*(.+)$/.exec(limpio);
  if (numerada) return { cuantas: 1, titulo: numerada[2].trim() };

  // Cualquier otro renglón con texto: una historia.
  return { cuantas: 1, titulo: limpio };
}

/**
 * Interpreta el texto completo.
 *
 * `desde` es a qué fecha corresponde el "día 1". Solo se usa para los días
 * relativos; si el texto trae fechas de verdad, mandan esas.
 */
export function interpretarHistorias(texto: string, desde: Date): Lectura {
  const arranque = new Date(desde);
  arranque.setHours(0, 0, 0, 0);

  const historias: HistoriaLeida[] = [];
  const sinReconocer: string[] = [];

  const renglones = texto.split(/\r?\n/).map((l) => l.trim());

  /**
   * ¿El texto está organizado por días?
   *
   * Cambia cómo se lee lo que aparece antes del primer día. Si hay días, eso de
   * arriba es el título del documento —"Planificación de septiembre"— y no una
   * historia: se aparta y se muestra, en vez de colarse como una placa fantasma.
   * Si no hay días, en cambio, cada renglón es una historia y van todas juntas
   * al día de arranque.
   */
  const hayDias = renglones.some((l) => l && leerEncabezadoDeDia(l, arranque));

  // Sin ningún encabezado de día, todo cae en el día de arranque.
  let diaActual: Date | null = null;
  let enEseDia = 0;

  /**
   * Suma al día lo que se leyó de un renglón.
   *
   * Cuando el renglón vale por varias placas —"historia 1 y 2"— se numeran, si
   * no quedan dos renglones idénticos y no se sabe si es un error o son dos.
   */
  const agregar = (leida: { cuantas: number; titulo: string }, dia: Date) => {
    for (let i = 0; i < leida.cuantas; i++) {
      enEseDia += 1;
      historias.push({
        fecha: horaDeLaHistoria(dia, enEseDia),
        numero: enEseDia,
        titulo:
          leida.cuantas > 1 ? `${leida.titulo} (${i + 1} de ${leida.cuantas})` : leida.titulo,
      });
    }
  };

  for (const linea of renglones) {
    if (!linea) continue;

    const dia = leerEncabezadoDeDia(linea, arranque);
    if (dia) {
      diaActual = dia;
      enEseDia = 0;

      // "Día 1: bienvenida" trae el encabezado y la historia en el mismo
      // renglón. Se sigue leyendo lo que viene después de los dos puntos.
      const resto = linea.slice(linea.indexOf(':') + 1).trim();
      if (!linea.includes(':') || !resto) continue;

      const leida = leerHistoria(resto);
      if (leida) agregar(leida, diaActual);
      continue;
    }

    // Lo que viene antes del primer día, habiendo días, es el encabezado del
    // documento. No se descarta: se muestra aparte.
    if (hayDias && !diaActual) {
      sinReconocer.push(linea);
      continue;
    }

    const leida = leerHistoria(linea);
    if (!leida) {
      sinReconocer.push(linea);
      continue;
    }

    if (!diaActual) {
      diaActual = arranque;
      enEseDia = 0;
    }

    agregar(leida, diaActual);
  }

  return { historias, sinReconocer };
}

/** Agrupadas por día, que es como se miran antes de crearlas. */
export function porDia(historias: HistoriaLeida[]): { dia: Date; items: HistoriaLeida[] }[] {
  const mapa = new Map<string, HistoriaLeida[]>();
  historias.forEach((h) => {
    const clave = h.fecha.toDateString();
    const lista = mapa.get(clave);
    if (lista) lista.push(h);
    else mapa.set(clave, [h]);
  });

  return [...mapa.values()]
    .map((items) => ({ dia: items[0].fecha, items }))
    .sort((a, b) => a.dia.getTime() - b.dia.getTime());
}
