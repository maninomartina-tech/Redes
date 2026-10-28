import { Eye, Flag, Pencil, Plus, Trash2, TrendingUp, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
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
import type { MonthlyStat } from '@/types';
import {
  computeGrowth,
  leerPorcentaje,
  monthLabel,
  monthLabelLargo,
  pctVariacion,
  variacion,
} from '@/lib/growth';
import { nfmt } from '@/lib/format';
import { fmt } from '@/lib/date';
import { EmptyState, Modal, SectionTitle, Stat } from '@/components/ui';
import SyncButton from '@/components/SyncButton';
import { sincronizarCuenta } from '@/lib/sync';
import { palabra, plural } from '@/lib/texto';

// ---------------------------------------------------------------------------
// Crecimiento: cuántos seguidores tiene la cuenta y cuántos ganó.
//
// Se carga a mano, un renglón por mes, con los números que Instagram muestra
// en su resumen. A mano y no por Meta a propósito: así sirve para cualquier
// cuenta, incluso las que no están vinculadas, y es lo único que hay que
// cargar para poder mostrarle al cliente de dónde salió a dónde llegó.
// ---------------------------------------------------------------------------

export default function Crecimiento() {
  const client = useCurrentClient();
  const monthlyStats = useStore((s) => s.monthlyStats);
  const posts = useStore((s) => s.posts);
  const removeMonthlyStat = useStore((s) => s.removeMonthlyStat);
  const upsertMonthlyStat = useStore((s) => s.upsertMonthlyStat);

  const growth = useMemo(
    () => computeGrowth(client, monthlyStats, posts),
    [client, monthlyStats, posts]
  );

  const [statModal, setStatModal] = useState<MonthlyStat | 'nuevo' | null>(null);
  const [baseModal, setBaseModal] = useState(false);

  const meses = useMemo(
    () =>
      monthlyStats
        .filter((s) => s.clientId === client.id)
        .sort((a, b) => b.month.localeCompare(a.month)),
    [monthlyStats, client.id]
  );

  const datos = [
    { label: 'Inicio', followers: growth.startingFollowers },
    ...growth.points.map((p) => ({ label: p.label, followers: p.followers })),
  ];

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Crecimiento"
        subtitle="Los seguidores mes a mes. No depende de Meta, así que sirve para cualquier cuenta."
        action={
          <SyncButton
            descripcion="Trae seguidores, alcance e interacción de Instagram."
            onSync={async () => {
              const cuenta = client.accounts.find((a) => a.metaAccountId);
              if (!cuenta?.metaAccountId) {
                return {
                  ok: false,
                  error:
                    'Primero vinculá la cuenta de Instagram de este cliente, en Ajustes.',
                };
              }
              const r = await sincronizarCuenta(cuenta.metaAccountId, client.id);
              if (!r.ok) return { ok: false, error: r.error, avisos: r.avisos };
              r.datos.forEach((m) => upsertMonthlyStat(m));
              return {
                ok: true,
                resumen: `Se ${palabra(r.datos.length, 'actualizó', 'actualizaron')} ${plural(
                  r.datos.length,
                  'mes',
                  'meses'
                )} con los datos de Meta.`,
                avisos: r.avisos,
              };
            }}
          />
        }
      />

      {/* punto de partida */}
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-600">
          <Flag size={18} />
        </span>
        <div className="mr-auto min-w-0">
          <p className="font-semibold text-ink-900">Punto de partida</p>
          {client.startingFollowers != null ? (
            <p className="text-sm leading-snug text-ink-500">
              Empezaste con <b className="text-ink-700">{nfmt(client.startingFollowers)}</b>{' '}
              seguidores
              {client.startDate && <> el {fmt(client.startDate, "d 'de' MMMM 'de' yyyy")}</>}.
            </p>
          ) : (
            <p className="text-sm leading-snug text-ink-500">
              Cargá cuántos seguidores tenía la cuenta cuando la tomaste.
            </p>
          )}
        </div>
        <button className="btn-outline !py-1.5 text-xs" onClick={() => setBaseModal(true)}>
          <Pencil size={14} /> Editar
        </button>
      </div>

      {/* el número grande, que es la pregunta de todos los meses */}
      {growth.hasBaseline && (
        <>
          <div className="card border-brand-200 bg-gradient-to-br from-brand-100 via-brand-50 to-peach-50 p-5">
            <p className="text-sm font-medium text-brand-700">Desde que empezaste</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              {growth.gained >= 0 ? '+' : ''}
              {nfmt(growth.gained)} seguidores
            </p>
            <p className="mt-1.5 text-sm leading-snug text-ink-600">
              De {nfmt(growth.startingFollowers)} a{' '}
              <b className="text-ink-800">{nfmt(growth.currentFollowers)}</b> ·{' '}
              {growth.gainedPct >= 0 ? '+' : ''}
              {growth.gainedPct.toFixed(0)}%
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

          {growth.points.length > 0 && (
            <div className="card p-3 sm:p-4">
              <h3 className="mb-3 font-bold text-ink-800">La curva</h3>
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={datos} margin={{ left: -14, right: 8, top: 6 }}>
                  <defs>
                    <linearGradient id="areaCrec" x1="0" y1="0" x2="0" y2="1">
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
                    fill="url(#areaCrec)"
                    dot={{ r: 3, fill: '#4A1E1A' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* carga mensual */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-ink-900">Mes a mes</h3>
            <p className="text-[13px] leading-snug text-ink-500 sm:text-sm">
              Un renglón por mes, con los números del resumen de Instagram.
            </p>
          </div>
          <button className="btn-primary" onClick={() => setStatModal('nuevo')}>
            <Plus size={16} /> Cargar mes
          </button>
        </div>

        {meses.length === 0 ? (
          <EmptyState
            icon={<TrendingUp size={30} />}
            title="Todavía no cargaste ningún mes"
            hint="Cargá los seguidores al cierre de cada mes y vas a ver la evolución de la cuenta."
          />
        ) : (
          /* Renglones y no una tabla: seis columnas en un teléfono se leen de
             costado, o no se leen. */
          <div className="card divide-y divide-ink-200/60">
            {meses.map((s) => {
              const punto = growth.points.find((p) => p.month === s.month);
              const ganados = punto?.gained ?? 0;

              return (
                <div key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3.5">
                  <span className="min-w-0 flex-1 truncate font-semibold text-ink-800 first-letter:uppercase">
                    {monthLabelLargo(s.month)}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-ink-600">
                    {nfmt(s.followers)}
                  </span>
                  <span
                    className={`w-14 shrink-0 text-right text-sm font-semibold tabular-nums ${
                      ganados >= 0 ? 'text-mint-600' : 'text-rose-600'
                    }`}
                  >
                    {ganados >= 0 ? '+' : ''}
                    {ganados}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <button
                      className="grid h-9 w-9 place-items-center rounded-lg text-ink-300 transition hover:bg-ink-50 hover:text-brand-600"
                      onClick={() => setStatModal(s)}
                      aria-label={`Editar ${monthLabelLargo(s.month)}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="grid h-9 w-9 place-items-center rounded-lg text-ink-300 transition hover:bg-rose-50 hover:text-rose-600"
                      onClick={() => removeMonthlyStat(s.id)}
                      aria-label={`Borrar ${monthLabelLargo(s.month)}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </span>

                  {/* Las visualizaciones van en su propio renglón: con el resto
                      en la misma línea, en 390px, nada entra. */}
                  {(punto?.views != null || punto?.nonFollowerViews != null) && (
                    <p className="w-full text-[11px] leading-snug text-ink-400">
                      {punto?.views != null && (
                        <>
                          {nfmt(punto.views)} visualizaciones
                          {punto.viewsPct != null && ` (${pctVariacion(punto.viewsPct)})`}
                        </>
                      )}
                      {punto?.views != null && punto?.nonFollowerViews != null && ' · '}
                      {punto?.nonFollowerViews != null && (
                        <>
                          {nfmt(punto.nonFollowerViews)} de no seguidores
                          {punto.nonFollowerViewsPct != null &&
                            ` (${pctVariacion(punto.nonFollowerViewsPct)})`}
                        </>
                      )}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BaselineModal open={baseModal} onClose={() => setBaseModal(false)} />
      <StatModal stat={statModal} onClose={() => setStatModal(null)} />
    </div>
  );
}

function BaselineModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const client = useCurrentClient();
  const updateClient = useStore((s) => s.updateClient);
  const [followers, setFollowers] = useState(String(client.startingFollowers ?? ''));
  const [date, setDate] = useState((client.startDate ?? new Date().toISOString()).slice(0, 10));

  return (
    <Modal open={open} onClose={onClose} title="Punto de partida">
      <div className="space-y-4 p-5">
        <p className="text-sm leading-snug text-ink-500">
          Estos dos datos son los que permiten mostrarle al cliente cuánto creció la cuenta
          desde que la llevás vos.
        </p>
        <div>
          <label className="label" htmlFor="base-seguidores">
            Seguidores al empezar
          </label>
          <input
            id="base-seguidores"
            type="number"
            value={followers}
            onChange={(e) => setFollowers(e.target.value)}
            className="input mt-1"
            placeholder="Ej: 1840"
          />
        </div>
        <div>
          <label className="label" htmlFor="base-fecha">
            Fecha en que tomaste la cuenta
          </label>
          <input
            id="base-fecha"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input mt-1"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              updateClient(client.id, {
                startingFollowers: Number(followers) || 0,
                startDate: new Date(date + 'T12:00:00').toISOString(),
              });
              onClose();
            }}
          >
            Guardar
          </button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Cargar un mes.
 *
 * Son los mismos números que Instagram muestra en su resumen mensual, en el
 * mismo orden, para que copiarlos sea leer de una pantalla y escribir en la
 * otra. El porcentaje se calcula solo cuando el mes anterior ya está cargado;
 * el campo queda igual por si Instagram muestra otro número —compara contra
 * 30 días corridos, no contra el mes calendario— y para el primer mes, donde
 * no hay con qué comparar.
 */
function StatModal({
  stat,
  onClose,
}: {
  stat: MonthlyStat | 'nuevo' | null;
  onClose: () => void;
}) {
  const client = useCurrentClient();
  const upsert = useStore((s) => s.upsertMonthlyStat);
  const monthlyStats = useStore((s) => s.monthlyStats);
  const editando = stat && stat !== 'nuevo' ? stat : null;

  const [month, setMonth] = useState('');
  const [followers, setFollowers] = useState('');
  const [views, setViews] = useState('');
  const [viewsPct, setViewsPct] = useState('');
  const [noSeg, setNoSeg] = useState('');
  const [noSegPct, setNoSegPct] = useState('');
  const [cargado, setCargado] = useState<string | null>(null);

  // Rellena el formulario cuando cambia lo que se está editando.
  const claveActual = editando?.id ?? (stat === 'nuevo' ? 'nuevo' : null);
  if (stat && cargado !== claveActual) {
    setCargado(claveActual);
    setMonth(editando?.month ?? new Date().toISOString().slice(0, 7));
    setFollowers(editando ? String(editando.followers) : '');
    setViews(editando?.views != null ? String(editando.views) : '');
    setViewsPct(editando?.viewsPct != null ? String(editando.viewsPct) : '');
    setNoSeg(editando?.nonFollowerViews != null ? String(editando.nonFollowerViews) : '');
    setNoSegPct(
      editando?.nonFollowerViewsPct != null ? String(editando.nonFollowerViewsPct) : ''
    );
  }

  /** El último mes cargado antes de este, que es contra el que se compara. */
  const anterior = useMemo(() => {
    if (!month) return undefined;
    const previos = monthlyStats
      .filter((s) => s.clientId === client.id && s.month < month)
      .sort((a, b) => a.month.localeCompare(b.month));
    return previos[previos.length - 1];
  }, [monthlyStats, client.id, month]);

  const numero = (t: string) => (t.trim() === '' ? undefined : Number(t));
  const calcViews = variacion(numero(views), anterior?.views);
  const calcNoSeg = variacion(numero(noSeg), anterior?.nonFollowerViews);

  return (
    <Modal open={!!stat} onClose={onClose} title={editando ? 'Editar mes' : 'Cargar mes'}>
      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="mes-stat">
              Mes
            </label>
            <input
              id="mes-stat"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="input mt-1"
            />
          </div>
          <div>
            <label className="label" htmlFor="seguidores-stat">
              Seguidores al cierre
            </label>
            <input
              id="seguidores-stat"
              type="number"
              value={followers}
              onChange={(e) => setFollowers(e.target.value)}
              className="input mt-1"
              placeholder="Ej: 4180"
            />
          </div>
        </div>

        <div className="rounded-xl border border-ink-200/70 bg-ink-50/60 p-3.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Resumen del mes
          </p>
          <p className="mb-3 mt-0.5 text-[11px] leading-snug text-ink-500">
            Copiá los números tal como te los muestra Instagram. Son opcionales.
          </p>

          <div className="space-y-3">
            <FilaDeVisualizaciones
              id="views"
              label="Visualizaciones del mes"
              numero={views}
              onNumero={setViews}
              porcentaje={viewsPct}
              onPorcentaje={setViewsPct}
              calculado={calcViews}
              mesAnterior={anterior?.month}
            />
            <FilaDeVisualizaciones
              id="noseg"
              label="Visualizaciones de no seguidores"
              numero={noSeg}
              onNumero={setNoSeg}
              porcentaje={noSegPct}
              onPorcentaje={setNoSegPct}
              calculado={calcNoSeg}
              mesAnterior={anterior?.month}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            disabled={!month || !followers}
            onClick={() => {
              upsert({
                id: editando?.id,
                clientId: client.id,
                month,
                followers: Number(followers) || 0,
                views: numero(views),
                viewsPct: leerPorcentaje(viewsPct),
                nonFollowerViews: numero(noSeg),
                nonFollowerViewsPct: leerPorcentaje(noSegPct),
                // Lo que ya estuviera cargado de antes no se pisa.
                interactions: editando?.interactions,
                reach: editando?.reach,
                profileVisits: editando?.profileVisits,
              });
              onClose();
            }}
          >
            Guardar
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** El número y su variación, uno al lado del otro. */
function FilaDeVisualizaciones({
  id,
  label,
  numero,
  onNumero,
  porcentaje,
  onPorcentaje,
  calculado,
  mesAnterior,
}: {
  id: string;
  label: string;
  numero: string;
  onNumero: (v: string) => void;
  porcentaje: string;
  onPorcentaje: (v: string) => void;
  calculado?: number;
  mesAnterior?: string;
}) {
  return (
    <div>
      <div className="grid grid-cols-[1fr_7.5rem] gap-2 sm:gap-3">
        <div>
          <label className="label" htmlFor={id}>
            {label}
          </label>
          <input
            id={id}
            type="number"
            value={numero}
            onChange={(e) => onNumero(e.target.value)}
            className="input mt-1"
            placeholder="Ej: 18400"
          />
        </div>
        <div>
          <label className="label" htmlFor={`${id}-pct`}>
            vs. mes anterior
          </label>
          <input
            id={`${id}-pct`}
            value={porcentaje}
            onChange={(e) => onPorcentaje(e.target.value)}
            className="input mt-1"
            // Cuando se puede calcular, el marcador es el número real; si no,
            // se ve que es un ejemplo y no un dato.
            placeholder={calculado != null ? pctVariacion(calculado) : 'Ej: +23'}
          />
        </div>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-ink-400">
        {calculado != null && mesAnterior
          ? `Se calcula solo con ${monthLabel(mesAnterior)}: ${pctVariacion(
              calculado
            )}. Escribilo solo si Instagram te muestra otro número.`
          : 'Poné el porcentaje que te muestra Instagram, o dejalo vacío.'}
      </p>
    </div>
  );
}
