import { Eye, TrendingUp, Users } from 'lucide-react';
import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useStore, useCurrentClient } from '@/store/useStore';
import { computeGrowth, monthLabel, monthLabelLargo, pctVariacion } from '@/lib/growth';
import { nfmt } from '@/lib/format';
import { fmt } from '@/lib/date';
import { EmptyState, SectionTitle, Stat } from '@/components/ui';

// ---------------------------------------------------------------------------
// Lo que ve el cliente de sus resultados: cuánto creció la cuenta.
//
// Un solo número grande arriba —cuántos seguidores ganó desde que ella la
// lleva—, la curva mes a mes y el detalle abajo. Es la pregunta que el cliente
// se hace, y es lo único que se le muestra.
// ---------------------------------------------------------------------------

export default function ClienteCrecimiento() {
  const posts = useStore((s) => s.posts);
  const monthlyStats = useStore((s) => s.monthlyStats);
  const client = useCurrentClient();

  const growth = useMemo(
    () => computeGrowth(client, monthlyStats, posts),
    [client, monthlyStats, posts]
  );

  if (!growth.hasBaseline) {
    return (
      <div>
        <SectionTitle title="Tu crecimiento" />
        <EmptyState
          icon={<TrendingUp size={30} />}
          title="Todavía no hay números para mostrar"
          hint="Cuando se cierre el primer mes vas a ver acá cómo viene creciendo la cuenta."
        />
      </div>
    );
  }

  const datos = [
    { label: 'Inicio', followers: growth.startingFollowers },
    ...growth.points.map((p) => ({ label: p.label, followers: p.followers })),
  ];

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Tu crecimiento"
        subtitle="Cómo viene creciendo tu cuenta desde que trabajamos juntos."
      />

      <div className="card border-brand-200 bg-gradient-to-br from-brand-100 via-brand-50 to-peach-50 p-5 sm:p-6">
        <p className="text-sm font-medium text-brand-700">
          Desde que empezamos
          {client.startDate && <> el {fmt(client.startDate, "d 'de' MMMM 'de' yyyy")}</>}
        </p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          {growth.gained >= 0 ? '+' : ''}
          {nfmt(growth.gained)} seguidores
        </p>
        <p className="mt-1.5 text-sm leading-snug text-ink-600">
          Pasaste de {nfmt(growth.startingFollowers)} a{' '}
          <b className="text-ink-800">{nfmt(growth.currentFollowers)}</b> ·{' '}
          {growth.gainedPct >= 0 ? '+' : ''}
          {growth.gainedPct.toFixed(0)}% de crecimiento
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat
          label="Seguidores hoy"
          value={nfmt(growth.currentFollowers)}
          icon={<Users size={16} />}
        />
        <Stat
          label="Promedio por mes"
          value={`${growth.avgPerMonth >= 0 ? '+' : ''}${Math.round(growth.avgPerMonth)}`}
          hint={`en ${growth.monthsTracked} ${growth.monthsTracked === 1 ? 'mes' : 'meses'}`}
          icon={<TrendingUp size={16} />}
        />
        {growth.hayVisualizaciones ? (
          <Stat
            label="Visualizaciones"
            value={nfmt(growth.ultimoConVisualizaciones!.views!)}
            hint={
              growth.ultimoConVisualizaciones!.viewsPct != null
                ? `${pctVariacion(growth.ultimoConVisualizaciones!.viewsPct!)} vs. el mes anterior`
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

      {growth.points.length > 0 && (
        <div className="card p-3 sm:p-4">
          <h3 className="mb-3 font-bold text-ink-800">Mes a mes</h3>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={datos} margin={{ left: -14, right: 8, top: 6 }}>
              <defs>
                <linearGradient id="areaSeg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8A6865" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#8A6865" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7D8C4" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#8A6865' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#8A6865' }}
                tickFormatter={nfmt}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(v) => [nfmt(Number(v)), 'Seguidores']}
                contentStyle={{ borderRadius: 12, border: '1px solid #E7D8C4', fontSize: 12 }}
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
      )}

      {/* El detalle, como renglones y no como tabla: en un teléfono una tabla
          de cinco columnas se lee de costado o no se lee. */}
      {growth.points.length > 0 && (
        <div className="card divide-y divide-ink-200/60">
          {[...growth.points].reverse().map((p) => (
            <div key={p.month} className="flex items-center gap-3 p-3.5">
              <span className="min-w-0 flex-1 truncate font-medium text-ink-800 first-letter:uppercase">
                {monthLabelLargo(p.month)}
              </span>
              <span className="shrink-0 text-sm tabular-nums text-ink-600">
                {nfmt(p.followers)}
              </span>
              <span
                className={`w-16 shrink-0 text-right text-sm font-semibold tabular-nums ${
                  p.gained >= 0 ? 'text-mint-600' : 'text-rose-600'
                }`}
              >
                {p.gained >= 0 ? '+' : ''}
                {p.gained}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
