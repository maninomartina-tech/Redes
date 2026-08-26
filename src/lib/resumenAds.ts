import type { Ad } from '@/types';

// ---------------------------------------------------------------------------
// El resumen de las campañas.
//
// Una lista de campañas no contesta la pregunta que importa: cuál conviene
// repetir. Y no se puede contestar mirando un solo número, porque una campaña
// para traer mensajes y una para sumar seguidores no compiten por lo mismo —la
// de seguidores va a tener siempre más "resultados" y va a parecer mejor.
//
// Entonces acá cada objetivo mira su propio resultado, y adentro de cada
// objetivo las campañas se comparan por lo que costó cada uno: si un mensaje
// salió $500 en una y $1.400 en otra, esa es la que hay que repetir. Entre
// objetivos distintos no se comparan, y la pantalla lo dice.
// ---------------------------------------------------------------------------

/** Qué mira un objetivo para saber si la campaña funcionó. */
export interface Medida {
  clave: string;
  /** Cómo se llama el grupo en la pantalla. */
  titulo: string;
  /** El resultado, en plural y en singular: "mensajes" / "mensaje". */
  unidad: string;
  unidadSingular: string;
  /** Cuántos resultados trajo. `undefined` = todavía no se cargó ese número. */
  cuantos: (a: Ad) => number | undefined;
}

const MEDIDAS: Medida[] = [
  {
    clave: 'mensajes',
    titulo: 'Para traer mensajes',
    unidad: 'mensajes',
    unidadSingular: 'mensaje',
    cuantos: (a) => a.messages,
  },
  {
    clave: 'seguidores',
    titulo: 'Para sumar seguidores',
    unidad: 'seguidores',
    unidadSingular: 'seguidor',
    cuantos: (a) => a.newFollowers,
  },
  {
    clave: 'perfil',
    titulo: 'Para llevar gente al perfil',
    unidad: 'visitas al perfil',
    unidadSingular: 'visita',
    cuantos: (a) => a.profileActivity,
  },
  {
    clave: 'clics',
    titulo: 'Para llevar gente al sitio',
    unidad: 'clics',
    unidadSingular: 'clic',
    cuantos: (a) => (a.clicks > 0 ? a.clicks : undefined),
  },
  {
    clave: 'interaccion',
    titulo: 'Para generar interacción',
    unidad: 'interacciones',
    unidadSingular: 'interacción',
    cuantos: (a) => {
      const n = (a.likes ?? 0) + (a.saves ?? 0) + (a.shares ?? 0);
      return a.likes == null && a.saves == null && a.shares == null ? undefined : n;
    },
  },
  {
    clave: 'vistas',
    titulo: 'Para que las vean',
    unidad: 'visualizaciones',
    unidadSingular: 'visualización',
    cuantos: (a) => a.views,
  },
];

const porClave = (clave: string) => MEDIDAS.find((m) => m.clave === clave)!;

/**
 * Qué mide esta campaña, según su objetivo.
 *
 * Los objetivos que carga ella están escritos en castellano; los que llegan de
 * Meta vienen en inglés y en mayúsculas (`OUTCOME_ENGAGEMENT`, `MESSAGES`). Se
 * reconocen los dos para que una campaña traída de Meta caiga en el mismo
 * grupo que una cargada a mano con el mismo fin.
 */
export function medidaDe(objetivo: string): Medida {
  const o = objetivo ?? '';
  if (/mensaj|messag/i.test(o)) return porClave('mensajes');
  if (/seguidor|follow/i.test(o)) return porClave('seguidores');
  if (/perfil|profile/i.test(o)) return porClave('perfil');
  if (/sitio|web|link|traffic|clic|click/i.test(o)) return porClave('clics');
  if (/interacc|engagement|interaction/i.test(o)) return porClave('interaccion');
  return porClave('vistas');
}

/** Una campaña con su resultado ya calculado. */
export interface CampanaMedida {
  ad: Ad;
  medida: Medida;
  /** Los resultados que trajo, si están cargados. */
  resultados?: number;
  /** Lo que costó cada resultado. Sin gasto o sin resultados, no se sabe. */
  costo?: number;
}

export function medir(ad: Ad): CampanaMedida {
  const medida = medidaDe(ad.objective);
  const resultados = medida.cuantos(ad);
  const costo =
    resultados != null && resultados > 0 && ad.spend > 0 ? ad.spend / resultados : undefined;
  return { ad, medida, resultados, costo };
}

export interface GrupoDeObjetivo {
  clave: string;
  titulo: string;
  unidad: string;
  unidadSingular: string;
  /** Todas, con las que tienen datos primero y de la más barata a la más cara. */
  campanas: CampanaMedida[];
  conDatos: CampanaMedida[];
  sinDatos: CampanaMedida[];
  gasto: number;
  resultados: number;
  /** Lo que costó cada resultado, en todo el grupo junto. */
  costoPromedio?: number;
  /**
   * La que mejor rindió, y la que peor.
   *
   * Solo cuando hay al menos dos para comparar: decir "la mejor" de una sola
   * campaña no significa nada.
   */
  mejor?: CampanaMedida;
  peor?: CampanaMedida;
}

export interface ResumenAds {
  grupos: GrupoDeObjetivo[];
  gasto: number;
  campanas: number;
  /** Cuántas todavía no tienen cargado el resultado de su objetivo. */
  sinResultados: number;
}

export function resumenDeAds(ads: Ad[]): ResumenAds {
  const medidas = ads.map(medir);

  const grupos: GrupoDeObjetivo[] = [];
  for (const m of MEDIDAS) {
    const suyas = medidas.filter((x) => x.medida.clave === m.clave);
    if (suyas.length === 0) continue;

    const conDatos = suyas
      .filter((x) => x.costo != null)
      .sort((a, b) => (a.costo as number) - (b.costo as number));
    const sinDatos = suyas.filter((x) => x.costo == null);

    // El promedio se saca solo con las que tienen datos: sumar el gasto de una
    // campaña sin resultados cargados encarecería a las demás.
    const gastoConDatos = conDatos.reduce((s, x) => s + x.ad.spend, 0);
    const resultados = conDatos.reduce((s, x) => s + (x.resultados ?? 0), 0);

    grupos.push({
      clave: m.clave,
      titulo: m.titulo,
      unidad: m.unidad,
      unidadSingular: m.unidadSingular,
      campanas: [...conDatos, ...sinDatos],
      conDatos,
      sinDatos,
      gasto: suyas.reduce((s, x) => s + x.ad.spend, 0),
      resultados,
      costoPromedio: resultados > 0 ? gastoConDatos / resultados : undefined,
      mejor: conDatos.length >= 2 ? conDatos[0] : undefined,
      peor: conDatos.length >= 2 ? conDatos[conDatos.length - 1] : undefined,
    });
  }

  // Los grupos, del que más plata se llevó al que menos: es por donde se mira.
  grupos.sort((a, b) => b.gasto - a.gasto);

  return {
    grupos,
    gasto: ads.reduce((s, a) => s + a.spend, 0),
    campanas: ads.length,
    sinResultados: medidas.filter((x) => x.resultados == null).length,
  };
}

/* ------------------------------- los meses -------------------------------- */

/** 'general' o el mes, como 'YYYY-MM'. */
export type Periodo = 'general' | string;

/** El mes al que pertenece una campaña: en el que empezó. */
export function mesDe(ad: Ad): string {
  const d = new Date(ad.startDate);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Los meses que tienen campañas, del más nuevo al más viejo. */
export function mesesConCampanas(ads: Ad[]): string[] {
  return [...new Set(ads.map(mesDe))].sort((a, b) => b.localeCompare(a));
}

export function filtrarPorPeriodo(ads: Ad[], periodo: Periodo): Ad[] {
  return periodo === 'general' ? ads : ads.filter((a) => mesDe(a) === periodo);
}

/** '2026-08' → una fecha del mes, para poder escribirlo con palabras. */
export function fechaDelMes(mes: string): Date {
  const [anio, m] = mes.split('-').map(Number);
  return new Date(anio, m - 1, 1);
}
