import { CheckCircle2, Lightbulb, Sparkles, TrendingUp, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useStore } from '@/store/useStore';
import { analyzeCampaign, analyzeWithClaude, defaultCampaign, type Insight } from '@/lib/ai';
import { nfmt, pct } from '@/lib/format';
import { fmt } from '@/lib/date';
import { SectionTitle, Stat } from '@/components/ui';

export default function Metrics() {
  const { posts, campaigns, currentClientId } = useStore();
  const clientCampaigns = campaigns
    .filter((c) => c.clientId === currentClientId)
    .sort((a, b) => b.month.localeCompare(a.month));

  const [campaignId, setCampaignId] = useState('');
  const activeId = clientCampaigns.some((c) => c.id === campaignId)
    ? campaignId
    : defaultCampaign(clientCampaigns, posts)?.id;
  const campaign = clientCampaigns.find((c) => c.id === activeId);

  const campaignPosts = useMemo(
    () => posts.filter((p) => p.campaignId === activeId),
    [posts, activeId]
  );
  const analysis = useMemo(
    () => (campaign ? analyzeCampaign(campaign, campaignPosts) : null),
    [campaign, campaignPosts]
  );

  const [aiText, setAiText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!campaign || !analysis) {
    return (
      <div>
        <SectionTitle title="Métricas + IA" />
        <p className="text-ink-500">Todavía no hay campañas para este cliente.</p>
      </div>
    );
  }

  const chartData = campaignPosts
    .filter((p) => p.metrics)
    .map((p) => ({
      name: p.title.length > 18 ? p.title.slice(0, 18) + '…' : p.title,
      Interacciones: (p.metrics!.likes + p.metrics!.comments + p.metrics!.saves + p.metrics!.shares),
      Alcance: p.metrics!.reach,
      best: p.id === analysis.bestPostId,
    }));

  const runAi = async () => {
    setLoading(true);
    const text = await analyzeWithClaude(analysis);
    setAiText(text);
    setLoading(false);
  };

  return (
    <div>
      <SectionTitle
        title="Métricas + IA"
        subtitle="Cómo funcionaron las campañas, mes a mes, con análisis automático."
        action={
          <select
            value={activeId}
            onChange={(e) => {
              setCampaignId(e.target.value);
              setAiText(null);
            }}
            className="input max-w-xs !py-2"
          >
            {clientCampaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        }
      />

      {/* objetivo */}
      <div className="card mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 p-4">
        <div>
          <p className="label">Mes</p>
          <p className="font-semibold capitalize text-ink-800">
            {fmt(campaign.month + '-01', 'MMMM yyyy')}
          </p>
        </div>
        <div className="min-w-[12rem] flex-1">
          <p className="label">Objetivo de la campaña</p>
          <p className="text-sm text-ink-700">{campaign.goal}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Alcance total" value={nfmt(analysis.totalReach)} icon={<TrendingUp size={16} />} />
        <Stat label="Interacciones" value={nfmt(analysis.totalEngagement)} />
        <Stat label="Tasa de interacción" value={pct(analysis.engagementRate)} hint="Ref. sana 3–6%" />
        <Stat
          label="Piezas publicadas"
          value={campaignPosts.filter((p) => p.status === 'publicado').length}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        {/* gráfico */}
        <div className="card p-4">
          <h3 className="mb-3 font-bold text-ink-800">Rendimiento por pieza</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7D8C4" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={nfmt} />
                <Tooltip formatter={(v) => nfmt(Number(v))} />
                <Bar dataKey="Interacciones" radius={[6, 6, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.best ? '#4A1E1A' : '#DFB0A1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-center text-sm text-ink-400">
              Sin datos publicados todavía en esta campaña.
            </p>
          )}
        </div>

        {/* análisis IA */}
        <div className="card flex flex-col p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-800 text-canvas">
              <Sparkles size={15} />
            </span>
            <h3 className="font-bold text-ink-800">Análisis con IA</h3>
          </div>
          <p className="text-sm text-ink-600">{analysis.summary}</p>

          <div className="mt-3 space-y-2">
            {analysis.insights.map((ins, i) => (
              <InsightRow key={i} ins={ins} />
            ))}
          </div>

          <div className="mt-auto pt-4">
            <button className="btn-primary w-full" onClick={runAi} disabled={loading}>
              <Sparkles size={16} />
              {loading ? 'Analizando…' : 'Generar informe con IA'}
            </button>
            {aiText && (
              <div className="mt-3 whitespace-pre-line rounded-xl bg-brand-50 p-3 text-sm text-ink-700">
                {aiText}
              </div>
            )}
            <p className="mt-2 text-[11px] text-ink-400">
              El informe se genera local. Conectá tu clave de Claude en el backend para
              análisis en lenguaje natural más profundo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightRow({ ins }: { ins: Insight }) {
  const cfg = {
    positivo: { icon: <CheckCircle2 size={15} />, cls: 'text-mint-600 bg-mint-50' },
    atencion: { icon: <TriangleAlert size={15} />, cls: 'text-butter-600 bg-butter-50' },
    sugerencia: { icon: <Lightbulb size={15} />, cls: 'text-brand-600 bg-brand-50' },
  }[ins.kind];
  return (
    <div className="flex gap-2.5 rounded-xl border border-ink-200/70 p-2.5">
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg ${cfg.cls}`}>
        {cfg.icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-ink-800">{ins.title}</p>
        <p className="text-xs text-ink-500">{ins.detail}</p>
      </div>
    </div>
  );
}
