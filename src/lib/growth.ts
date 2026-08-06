import type { Client, Lead, MonthlyStat, Post } from '@/types';

// ---------------------------------------------------------------------------
// Crecimiento de la cuenta.
//
// Todo se calcula con datos cargados a mano, así que funciona igual para
// cuentas sin conexión a Meta. Cuando falta el dato de interacciones de un
// mes, se estima con los posts publicados de ese mes.
// ---------------------------------------------------------------------------

export interface MonthPoint {
  month: string; // 'YYYY-MM'
  label: string; // 'ago 25'
  followers: number;
  /** Seguidores ganados respecto del mes anterior (o del inicio) */
  gained: number;
  interactions: number;
  /** true si las interacciones se estimaron con los posts, no se cargaron */
  interactionsEstimated: boolean;
  reach?: number;

  /** Visualizaciones del mes, si se cargaron */
  views?: number;
  /** Variación respecto del mes anterior: la calculada, o la que escribió ella */
  viewsPct?: number;
  /** Visualizaciones de gente que no la sigue */
  nonFollowerViews?: number;
  nonFollowerViewsPct?: number;
}

export interface GrowthSummary {
  hasBaseline: boolean;
  startingFollowers: number;
  currentFollowers: number;
  gained: number;
  gainedPct: number;
  monthsTracked: number;
  /** Promedio de seguidores nuevos por mes */
  avgPerMonth: number;
  points: MonthPoint[];
  /** Interacciones del último mes vs el primero registrado */
  interactionsFirst: number;
  interactionsLast: number;
  interactionsGrowthPct: number;
  bestMonth?: MonthPoint;

  /** ¿Hay algún mes con visualizaciones cargadas? */
  hayVisualizaciones: boolean;
  /** El último mes con visualizaciones cargadas */
  ultimoConVisualizaciones?: MonthPoint;
}

const MESES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * "julio 2026", para los textos que lee el cliente. En los gráficos y los
 * selectores sigue yendo el corto ("jul 26"), que ahí sobra.
 */
export function monthLabelLargo(month: string): string {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  return `${MESES_LARGOS[m - 1]} de ${y}`;
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  return `${MESES[m - 1]} ${String(y).slice(2)}`;
}

/** Interacciones de los posts publicados en ese mes. */
function interactionsFromPosts(posts: Post[], clientId: string, month: string): number {
  return posts
    .filter(
      (p) =>
        p.clientId === clientId &&
        p.status === 'publicado' &&
        p.metrics &&
        p.date.slice(0, 7) === month
    )
    .reduce(
      (sum, p) =>
        sum + p.metrics!.likes + p.metrics!.comments + p.metrics!.saves + p.metrics!.shares,
      0
    );
}

/**
 * Cuánto cambió un número respecto del mes anterior, en porcentaje.
 *
 * Devuelve `undefined` cuando no se puede decir nada: sin mes anterior, o con
 * un mes anterior en cero (todo crecimiento sobre cero es infinito, y "+∞%"
 * no le dice nada a nadie).
 */
export function variacion(actual?: number, anterior?: number): number | undefined {
  if (actual == null || anterior == null || anterior === 0) return undefined;
  return ((actual - anterior) / anterior) * 100;
}

/** "+23%" / "−8%", con el signo siempre a la vista. */
export function pctVariacion(n: number): string {
  return `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(0)}%`;
}

/**
 * Lee un porcentaje escrito como venga: "23", "+23", "23%", "-8,5".
 * Vacío o ilegible devuelve `undefined`, que es "no lo cargó".
 */
export function leerPorcentaje(texto: string): number | undefined {
  const limpio = texto.replace(/[\s%]/g, '').replace('−', '-').replace(',', '.');
  if (limpio === '' || limpio === '-' || limpio === '+') return undefined;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : undefined;
}

export function computeGrowth(
  client: Client,
  stats: MonthlyStat[],
  posts: Post[]
): GrowthSummary {
  const ordenados = stats
    .filter((s) => s.clientId === client.id)
    .sort((a, b) => a.month.localeCompare(b.month));

  const startingFollowers = client.startingFollowers ?? 0;
  const hasBaseline = client.startingFollowers != null && ordenados.length > 0;

  let previos = startingFollowers;
  const points: MonthPoint[] = ordenados.map((s, i) => {
    const cargadas = s.interactions;
    const interactions = cargadas ?? interactionsFromPosts(posts, client.id, s.month);
    // El porcentaje se calcula con el mes anterior. Lo que ella escribió a
    // mano manda: es lo que le muestra Instagram, y para el primer mes es el
    // único dato que hay.
    const anterior = ordenados[i - 1];
    const punto: MonthPoint = {
      month: s.month,
      label: monthLabel(s.month),
      followers: s.followers,
      gained: s.followers - previos,
      interactions,
      interactionsEstimated: cargadas == null,
      reach: s.reach,
      views: s.views,
      viewsPct: s.viewsPct ?? variacion(s.views, anterior?.views),
      nonFollowerViews: s.nonFollowerViews,
      nonFollowerViewsPct:
        s.nonFollowerViewsPct ?? variacion(s.nonFollowerViews, anterior?.nonFollowerViews),
    };
    previos = s.followers;
    return punto;
  });

  const currentFollowers = points.length ? points[points.length - 1].followers : startingFollowers;
  const gained = currentFollowers - startingFollowers;
  const gainedPct = startingFollowers > 0 ? (gained / startingFollowers) * 100 : 0;

  const interactionsFirst = points.length ? points[0].interactions : 0;
  const interactionsLast = points.length ? points[points.length - 1].interactions : 0;
  const interactionsGrowthPct =
    interactionsFirst > 0 ? ((interactionsLast - interactionsFirst) / interactionsFirst) * 100 : 0;

  const bestMonth = points.length
    ? points.reduce((a, b) => (b.gained > a.gained ? b : a))
    : undefined;

  const conVisualizaciones = points.filter((p) => p.views != null);
  const ultimoConVisualizaciones = conVisualizaciones[conVisualizaciones.length - 1];

  return {
    hayVisualizaciones: conVisualizaciones.length > 0,
    ultimoConVisualizaciones,
    hasBaseline,
    startingFollowers,
    currentFollowers,
    gained,
    gainedPct,
    monthsTracked: points.length,
    avgPerMonth: points.length ? gained / points.length : 0,
    points,
    interactionsFirst,
    interactionsLast,
    interactionsGrowthPct,
    bestMonth,
  };
}

// ---------------------------------------------------------------------------
// Leads y ventas
// ---------------------------------------------------------------------------

export interface LeadsSummary {
  total: number;
  ganados: number;
  perdidos: number;
  abiertos: number;
  /** % de consultas que terminaron en venta (sobre las ya cerradas) */
  conversion: number;
  revenue: number;
  ticketPromedio: number;
  porFuente: { source: string; total: number; ganados: number }[];
}

const FUENTE_LABEL: Record<string, string> = {
  whatsapp: 'WhatsApp',
  dm: 'DM',
  comentario: 'Comentarios',
  web: 'Web',
  presencial: 'Presencial',
  otro: 'Otro',
};

export function sourceLabel(s: string): string {
  return FUENTE_LABEL[s] ?? s;
}

export function computeLeads(leads: Lead[], clientId: string, month?: string): LeadsSummary {
  const propios = leads.filter(
    (l) => l.clientId === clientId && (!month || l.date.slice(0, 7) === month)
  );

  const ganados = propios.filter((l) => l.status === 'ganado');
  const perdidos = propios.filter((l) => l.status === 'perdido');
  const cerrados = ganados.length + perdidos.length;
  const revenue = ganados.reduce((s, l) => s + (l.amount ?? 0), 0);

  const fuentes = new Map<string, { total: number; ganados: number }>();
  propios.forEach((l) => {
    const cur = fuentes.get(l.source) ?? { total: 0, ganados: 0 };
    cur.total += 1;
    if (l.status === 'ganado') cur.ganados += 1;
    fuentes.set(l.source, cur);
  });

  return {
    total: propios.length,
    ganados: ganados.length,
    perdidos: perdidos.length,
    abiertos: propios.length - cerrados,
    conversion: cerrados > 0 ? (ganados.length / cerrados) * 100 : 0,
    revenue,
    ticketPromedio: ganados.length ? revenue / ganados.length : 0,
    porFuente: Array.from(fuentes.entries())
      .map(([source, v]) => ({ source, ...v }))
      .sort((a, b) => b.total - a.total),
  };
}
