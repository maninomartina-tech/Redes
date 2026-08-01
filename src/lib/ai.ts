import type { Ad, Campaign, Post } from '@/types';
import { nfmt, pct } from './format';

// -------------------------------------------------------------------------
// Motor de análisis de campañas.
//
// Hoy funciona 100% local (heurísticas sobre las métricas cargadas) para que
// veas el análisis sin depender de nada externo. Cuando quieras análisis "en
// vivo" con IA generativa, `analyzeWithClaude()` deja lista la llamada al
// endpoint de Claude: solo hay que agregar tu API key en el backend.
// -------------------------------------------------------------------------

/**
 * Elige la campaña que conviene mostrar por defecto: la más reciente que ya
 * tenga contenido publicado. Si ninguna tiene datos todavía, devuelve la más
 * reciente. Evita abrir la pantalla de métricas en blanco.
 */
export function defaultCampaign(campaigns: Campaign[], posts: Post[]): Campaign | undefined {
  const conDatos = campaigns.find((c) =>
    posts.some((p) => p.campaignId === c.id && p.status === 'publicado' && p.metrics)
  );
  return conDatos ?? campaigns[0];
}

export interface Insight {
  kind: 'positivo' | 'atencion' | 'sugerencia';
  title: string;
  detail: string;
}

export interface CampaignAnalysis {
  campaignId: string;
  campaignName: string;
  totalReach: number;
  totalEngagement: number;
  engagementRate: number; // %
  bestPostId?: string;
  insights: Insight[];
  summary: string;
}

function engagement(p: Post): number {
  const m = p.metrics;
  if (!m) return 0;
  return m.likes + m.comments + m.saves + m.shares;
}

export function analyzeCampaign(campaign: Campaign, posts: Post[]): CampaignAnalysis {
  const published = posts.filter((p) => p.status === 'publicado' && p.metrics);
  const totalReach = published.reduce((s, p) => s + (p.metrics?.reach ?? 0), 0);
  const totalEngagement = published.reduce((s, p) => s + engagement(p), 0);
  const engagementRate = totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0;

  const best = [...published].sort((a, b) => engagement(b) - engagement(a))[0];

  const insights: Insight[] = [];

  if (best) {
    insights.push({
      kind: 'positivo',
      title: `Tu mejor contenido fue "${best.title}"`,
      detail: `Generó ${nfmt(engagement(best))} interacciones y ${nfmt(
        best.metrics?.reach ?? 0
      )} de alcance. Vale la pena repetir este formato (${best.type}) el próximo mes.`,
    });
  }

  // Formato con mejor rendimiento
  const byType = new Map<string, { reach: number; eng: number; n: number }>();
  published.forEach((p) => {
    const cur = byType.get(p.type) ?? { reach: 0, eng: 0, n: 0 };
    cur.reach += p.metrics?.reach ?? 0;
    cur.eng += engagement(p);
    cur.n += 1;
    byType.set(p.type, cur);
  });
  let bestType = '';
  let bestTypeRate = 0;
  byType.forEach((v, k) => {
    const rate = v.reach ? (v.eng / v.reach) * 100 : 0;
    if (rate > bestTypeRate) {
      bestTypeRate = rate;
      bestType = k;
    }
  });
  if (bestType) {
    insights.push({
      kind: 'sugerencia',
      title: `El formato "${bestType}" es el que más engancha`,
      detail: `Tiene una tasa de interacción del ${pct(
        bestTypeRate
      )}. Sugerencia: subir la proporción de este formato en el próximo plan de contenido.`,
    });
  }

  if (engagementRate < 3 && totalReach > 0) {
    insights.push({
      kind: 'atencion',
      title: 'La tasa de interacción está por debajo del objetivo',
      detail: `Está en ${pct(
        engagementRate
      )} (referencia sana: 3-6%). Probá CTAs más claros, preguntas en el copy y contenido guardable.`,
    });
  } else if (engagementRate >= 3) {
    insights.push({
      kind: 'positivo',
      title: 'Buena tasa de interacción',
      detail: `El ${pct(engagementRate)} de quienes te vieron interactuaron. Estás por encima del promedio.`,
    });
  }

  // Saves como señal de valor
  const totalSaves = published.reduce((s, p) => s + (p.metrics?.saves ?? 0), 0);
  if (totalSaves > 0) {
    insights.push({
      kind: 'sugerencia',
      title: `${nfmt(totalSaves)} guardados este mes`,
      detail:
        'Los guardados indican contenido de valor que la gente quiere volver a ver. El contenido educativo/guardable rinde bien para esta cuenta.',
    });
  }

  const summary =
    published.length === 0
      ? 'Todavía no hay contenido publicado en esta campaña. Cuando publiques, acá vas a ver el análisis automático del mes.'
      : `En ${campaign.name} publicaste ${published.length} piezas que alcanzaron a ${nfmt(
          totalReach
        )} personas y generaron ${nfmt(
          totalEngagement
        )} interacciones (tasa ${pct(engagementRate)}).`;

  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    totalReach,
    totalEngagement,
    engagementRate,
    bestPostId: best?.id,
    insights,
    summary,
  };
}

export interface AdAnalysis {
  totalSpend: number;
  totalConversions: number;
  cpa: number; // costo por resultado
  ctr: number; // %
  insights: Insight[];
}

export function analyzeAds(ads: Ad[]): AdAnalysis {
  const totalSpend = ads.reduce((s, a) => s + a.spend, 0);
  const totalConversions = ads.reduce((s, a) => s + a.conversions, 0);
  const totalClicks = ads.reduce((s, a) => s + a.clicks, 0);
  const totalImpr = ads.reduce((s, a) => s + a.impressions, 0);
  const cpa = totalConversions ? totalSpend / totalConversions : 0;
  const ctr = totalImpr ? (totalClicks / totalImpr) * 100 : 0;

  const insights: Insight[] = [];
  const best = [...ads]
    .filter((a) => a.conversions > 0)
    .sort((a, b) => a.spend / a.conversions - b.spend / b.conversions)[0];
  if (best) {
    insights.push({
      kind: 'positivo',
      title: `"${best.name}" es tu anuncio más eficiente`,
      detail: `Costo por resultado de ${(best.spend / best.conversions).toFixed(
        0
      )}. Considerá subirle presupuesto.`,
    });
  }
  if (ctr < 1 && totalImpr > 0) {
    insights.push({
      kind: 'atencion',
      title: 'El CTR está bajo',
      detail: `Está en ${pct(ctr)}. Refrescá el creativo o el copy del anuncio para mejorar el clic.`,
    });
  }
  return { totalSpend, totalConversions, cpa, ctr, insights };
}

// -------------------------------------------------------------------------
// Integración con IA generativa (Claude). Punto de conexión listo para usar.
// Requiere un backend que guarde la API key (nunca exponerla en el front).
// -------------------------------------------------------------------------
export async function analyzeWithClaude(
  analysis: CampaignAnalysis
): Promise<string> {
  try {
    const res = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis }),
    });
    if (!res.ok) throw new Error('sin backend de IA');
    const data = await res.json();
    return data.text as string;
  } catch {
    // Fallback local mientras no haya backend conectado.
    return `${analysis.summary}\n\n${analysis.insights
      .map((i) => `• ${i.title}: ${i.detail}`)
      .join('\n')}`;
  }
}
