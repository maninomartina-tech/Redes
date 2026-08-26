import {
  Bookmark,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Megaphone,
  ShoppingBag,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useStore, useCurrentClient } from '@/store/useStore';
import { analyzeCampaign, defaultCampaign } from '@/lib/ai';
import { computeGrowth, computeLeads, monthLabel, pctVariacion, sourceLabel } from '@/lib/growth';
import { money, nfmt, pct } from '@/lib/format';
import { fmt } from '@/lib/date';
import { EmptyState, SectionTitle, Stat } from '@/components/ui';
import ResumenDeAds from '@/components/ResumenDeAds';
import type { Periodo } from '@/lib/resumenAds';
import { plural } from '@/lib/texto';

export default function ClientResults() {
  const { posts, campaigns, monthlyStats, leads, ads } = useStore();
  const client = useCurrentClient();

  // En el link del cliente el servidor ya manda solo lo suyo, pero esta misma
  // pantalla se ve desde el modo Cliente de la app, donde están todas: el
  // filtro tiene que estar igual.
  const clientAds = useMemo(
    () => ads.filter((a) => a.clientId === client.id),
    [ads, client.id]
  );
  const [periodo, setPeriodo] = useState<Periodo>('general');

  const growth = useMemo(
    () => computeGrowth(client, monthlyStats, posts),
    [client, monthlyStats, posts]
  );
  const leadsSummary = useMemo(() => computeLeads(leads, client.id), [leads, client.id]);

  const clientCampaigns = campaigns
    .filter((c) => c.clientId === client.id)
    .sort((a, b) => b.month.localeCompare(a.month));
  const campaign = defaultCampaign(clientCampaigns, posts);
  const campaignPosts = posts.filter((p) => p.campaignId === campaign?.id);
  const analysis = useMemo(
    () => (campaign ? analyzeCampaign(campaign, campaignPosts) : null),
    [campaign, campaignPosts]
  );

  const totals = useMemo(() => {
    const pub = posts.filter(
      (p) => p.clientId === client.id && p.status === 'publicado' && p.metrics
    );
    return pub.reduce(
      (acc, p) => {
        acc.likes += p.metrics!.likes;
        acc.comments += p.metrics!.comments;
        acc.saves += p.metrics!.saves;
        acc.shares += p.metrics!.shares;
        acc.reach += p.metrics!.reach;
        return acc;
      },
      { likes: 0, comments: 0, saves: 0, shares: 0, reach: 0 }
    );
  }, [posts, client.id]);

  const sinDatos =
    !growth.hasBaseline && (!analysis || analysis.totalReach === 0) && clientAds.length === 0;

  if (sinDatos) {
    return (
      <div>
        <SectionTitle title="Tus resultados" />
        <EmptyState
          title="Todavía no hay resultados para mostrar"
          hint="Cuando se publique contenido y se cargue el primer mes, vas a ver acá cómo viene creciendo la cuenta."
        />
      </div>
    );
  }

  const mostrarVentas = client.tracksLeads && leadsSummary.total > 0;

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Tus resultados"
        subtitle="Cómo viene creciendo tu cuenta desde que trabajamos juntos."
      />

      {/* ---------- Crecimiento de la cuenta ---------- */}
      {growth.hasBaseline && (
        <section className="space-y-3">
          <div className="card border-brand-200 bg-gradient-to-br from-brand-100 via-brand-50 to-peach-50 p-6">
            <p className="text-sm font-medium text-brand-700">
              Desde que empezamos
              {client.startDate && <> el {fmt(client.startDate, "d 'de' MMMM 'de' yyyy")}</>}
            </p>
            <p className="mt-1 text-4xl font-bold tracking-tight text-ink-900">
              +{nfmt(growth.gained)} seguidores
            </p>
            <p className="mt-1.5 text-sm text-ink-600">
              Pasaste de {nfmt(growth.startingFollowers)} a{' '}
              <b className="text-ink-800">{nfmt(growth.currentFollowers)}</b> ·{' '}
              {growth.gainedPct >= 0 ? '+' : ''}
              {growth.gainedPct.toFixed(0)}% de crecimiento
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
            {/* evolución de seguidores */}
            <div className="card p-4">
              <h3 className="mb-3 font-bold text-ink-800">Evolución de seguidores</h3>
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart
                  data={[
                    {
                      label: 'Inicio',
                      followers: growth.startingFollowers,
                    },
                    ...growth.points.map((p) => ({ label: p.label, followers: p.followers })),
                  ]}
                  margin={{ left: -12, right: 8, top: 6 }}
                >
                  <defs>
                    <linearGradient id="areaSeg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8A6865" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#8A6865" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7D8C4" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8A6865' }} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#8A6865' }}
                    tickFormatter={nfmt}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(v) => [nfmt(Number(v)), 'Seguidores']}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #E7D8C4',
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="followers"
                    stroke="#4A1E1A"
                    strokeWidth={2.5}
                    fill="url(#areaSeg)"
                    dot={{ r: 3, fill: '#4A1E1A' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* resumen de crecimiento */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              <Stat
                label="Seguidores hoy"
                value={nfmt(growth.currentFollowers)}
                icon={<Users size={16} />}
              />
              <Stat
                label="Promedio por mes"
                value={`+${Math.round(growth.avgPerMonth)}`}
                hint={`en ${growth.monthsTracked} meses`}
                icon={<TrendingUp size={16} />}
              />
              {growth.hayVisualizaciones ? (
                <Stat
                  label="Visualizaciones"
                  value={nfmt(growth.ultimoConVisualizaciones!.views!)}
                  hint={
                    growth.ultimoConVisualizaciones!.viewsPct != null
                      ? `${pctVariacion(
                          growth.ultimoConVisualizaciones!.viewsPct!
                        )} vs. el mes anterior`
                      : `en ${monthLabel(growth.ultimoConVisualizaciones!.month)}`
                  }
                  icon={<Eye size={16} />}
                />
              ) : (
                growth.bestMonth && (
                  <Stat
                    label="Mejor mes"
                    value={`+${growth.bestMonth.gained}`}
                    hint={growth.bestMonth.label}
                  />
                )
              )}
            </div>
          </div>

          {/* crecimiento de interacción */}
          {growth.points.length > 1 && (
            <div className="card p-4">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-bold text-ink-800">Interacción mes a mes</h3>
                <p className="text-sm text-ink-500">
                  {growth.interactionsGrowthPct >= 0 ? 'Creció ' : 'Bajó '}
                  <b
                    className={
                      growth.interactionsGrowthPct >= 0 ? 'text-mint-600' : 'text-rose-600'
                    }
                  >
                    {Math.abs(growth.interactionsGrowthPct).toFixed(0)}%
                  </b>{' '}
                  desde el primer mes
                </p>
              </div>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={growth.points} margin={{ left: -12, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7D8C4" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8A6865' }} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#8A6865' }}
                    tickFormatter={nfmt}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(v) => [nfmt(Number(v)), 'Interacciones']}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #E7D8C4',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="interactions" fill="#C58E7E" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      )}

      {/* ---------- Consultas y ventas ---------- */}
      {mostrarVentas && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <ShoppingBag size={18} className="text-mint-600" />
            <h3 className="font-bold text-ink-900">Consultas y ventas que trajeron las redes</h3>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Consultas recibidas" value={leadsSummary.total} />
            <Stat
              label="Se concretaron"
              value={leadsSummary.ganados}
              hint={`${leadsSummary.conversion.toFixed(0)}% de conversión`}
            />
            <Stat label="Facturado" value={money(leadsSummary.revenue)} />
            <Stat
              label="Ticket promedio"
              value={money(Math.round(leadsSummary.ticketPromedio))}
            />
          </div>

          {leadsSummary.porFuente.length > 0 && (
            <div className="card p-4">
              <h4 className="mb-3 text-sm font-semibold text-ink-700">
                Por dónde llegaron las consultas
              </h4>
              <div className="space-y-2.5">
                {leadsSummary.porFuente.map((f) => {
                  const ancho = leadsSummary.total
                    ? (f.total / leadsSummary.total) * 100
                    : 0;
                  return (
                    <div key={f.source}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="font-medium text-ink-700">{sourceLabel(f.source)}</span>
                        <span className="tabular-nums text-ink-500">
                          {f.total} {f.total === 1 ? 'consulta' : 'consultas'}
                          {f.ganados > 0 && (
                            <> · {plural(f.ganados, 'concretada', 'concretadas')}</>
                          )}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                        <div
                          className="h-full rounded-full bg-brand-300"
                          style={{ width: `${ancho}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ---------- Publicidad ---------- */}
      {clientAds.length > 0 && (
        <section>
          <div className="mb-1 flex items-center gap-2">
            <Megaphone size={18} className="text-brand-600" />
            <h3 className="font-bold text-ink-900">Tu publicidad</h3>
          </div>
          <p className="mb-3 text-sm leading-snug text-ink-500">
            En qué se fue lo invertido en pauta y qué trajo cada campaña.
          </p>
          {/* Sin `onCargarResultados`: acá se mira, no se carga. */}
          <ResumenDeAds ads={clientAds} periodo={periodo} onPeriodo={setPeriodo} />
        </section>
      )}

      {/* ---------- Rendimiento del contenido ---------- */}
      {analysis && analysis.totalReach > 0 && (
        <section>
          <div className="mb-3">
            <h3 className="font-bold text-ink-900">Rendimiento del contenido</h3>
            <p className="text-sm text-ink-500">
              {campaign?.name} — {fmt(campaign!.month + '-01', 'MMMM yyyy')}
            </p>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="Me gusta" value={nfmt(totals.likes)} icon={<Heart size={16} />} />
            <Stat
              label="Comentarios"
              value={nfmt(totals.comments)}
              icon={<MessageCircle size={16} />}
            />
            <Stat label="Guardados" value={nfmt(totals.saves)} icon={<Bookmark size={16} />} />
            <Stat label="Compartidos" value={nfmt(totals.shares)} icon={<Share2 size={16} />} />
            <Stat label="Alcance" value={nfmt(totals.reach)} icon={<Eye size={16} />} />
          </div>

          <div className="card p-4">
            <h4 className="mb-2 font-semibold text-ink-800">Resumen del mes</h4>
            <p className="text-sm text-ink-600">{analysis.summary}</p>
            <div className="mt-3 space-y-2">
              {analysis.insights.slice(0, 3).map((ins, i) => (
                <p key={i} className="text-sm text-ink-600">
                  <span className="font-semibold text-ink-800">• {ins.title}.</span> {ins.detail}
                </p>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-400">
              Tasa de interacción del mes: {pct(analysis.engagementRate)}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
