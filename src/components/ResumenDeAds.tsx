import { BarChart3, Megaphone, ThumbsDown, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import type { Ad } from '@/types';
import { money, nfmt } from '@/lib/format';
import { fmt } from '@/lib/date';
import {
  fechaDelMes,
  filtrarPorPeriodo,
  mesesConCampanas,
  resumenDeAds,
  type CampanaMedida,
  type GrupoDeObjetivo,
  type Periodo,
} from '@/lib/resumenAds';
import { EmptyState, Stat } from '@/components/ui';

// ---------------------------------------------------------------------------
// El resumen de las campañas.
//
// Contesta una sola pregunta: cuál conviene repetir. Por eso las campañas se
// agrupan por lo que buscaban y adentro de cada grupo se ordenan por lo que
// costó cada resultado —no por cuántos resultados trajeron, que depende de
// cuánta plata se le puso—.
// ---------------------------------------------------------------------------

export default function ResumenDeAds({
  ads,
  periodo,
  onPeriodo,
  onCargarResultados,
}: {
  ads: Ad[];
  periodo: Periodo;
  onPeriodo: (p: Periodo) => void;
  /**
   * Cargarle los resultados a una campaña que no los tiene.
   *
   * Sin esto la pantalla es de solo lectura: es la misma que ve el cliente,
   * que puede mirar en qué se fue su plata pero no cargar nada.
   */
  onCargarResultados?: (ad: Ad) => void;
}) {
  const meses = useMemo(() => mesesConCampanas(ads), [ads]);
  const delPeriodo = useMemo(() => filtrarPorPeriodo(ads, periodo), [ads, periodo]);
  const resumen = useMemo(() => resumenDeAds(delPeriodo), [delPeriodo]);

  const nombreDelPeriodo =
    periodo === 'general' ? 'todas las campañas' : fmt(fechaDelMes(periodo).toISOString(), 'MMMM yyyy');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="label" htmlFor="resumen-periodo">
          Período
        </label>
        <select
          id="resumen-periodo"
          value={periodo}
          onChange={(e) => onPeriodo(e.target.value)}
          className="input !w-auto !py-1.5 text-sm"
        >
          <option value="general">General (todo)</option>
          {meses.map((m) => (
            <option key={m} value={m}>
              {fmt(fechaDelMes(m).toISOString(), 'MMMM yyyy')}
            </option>
          ))}
        </select>
        <span className="text-xs text-ink-400">
          Cada campaña cuenta en el mes en que empezó.
        </span>
      </div>

      {delPeriodo.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={30} />}
          title="No hay campañas en ese mes"
          hint="Probá con «General» o con otro mes."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Stat label="Invertido" value={money(resumen.gasto)} />
            <Stat
              label="Campañas"
              value={resumen.campanas}
              hint={
                resumen.sinResultados
                  ? `${resumen.sinResultados} sin resultados cargados`
                  : 'Todas con resultados'
              }
              icon={<Megaphone size={16} />}
            />
            <Stat
              label="Objetivos distintos"
              value={resumen.grupos.length}
              hint="Cada uno se mide con lo suyo"
              icon={<BarChart3 size={16} />}
            />
          </div>

          <p className="text-sm leading-snug text-ink-500">
            Se comparan entre sí las campañas que buscaban lo mismo, y gana la que consiguió
            cada resultado más barato. Una campaña de seguidores y una de mensajes no se
            comparan: no buscan lo mismo.
          </p>

          {resumen.grupos.map((g) => (
            <Grupo key={g.clave} grupo={g} onCargarResultados={onCargarResultados} />
          ))}

          <p className="text-xs text-ink-400">
            {nombreDelPeriodo === 'todas las campañas'
              ? 'Estás viendo todas las campañas cargadas.'
              : `Estás viendo ${nombreDelPeriodo}.`}
          </p>
        </>
      )}
    </div>
  );
}

function Grupo({
  grupo,
  onCargarResultados,
}: {
  grupo: GrupoDeObjetivo;
  onCargarResultados?: (ad: Ad) => void;
}) {
  // El más barato es la vara: rinde 100%, y el resto se mide contra él.
  const mejorCosto = grupo.conDatos[0]?.costo;

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-bold text-ink-900">{grupo.titulo}</h3>
        <p className="text-xs text-ink-500">
          {grupo.campanas.length} {grupo.campanas.length === 1 ? 'campaña' : 'campañas'} ·{' '}
          {money(grupo.gasto)}
          {grupo.resultados > 0 && (
            <>
              {' '}
              · {nfmt(grupo.resultados)} {grupo.unidad}
            </>
          )}
        </p>
      </div>

      {grupo.costoPromedio != null && (
        <p className="mt-0.5 text-sm text-ink-600">
          En promedio, cada {grupo.unidadSingular} salió{' '}
          <b className="text-ink-800">{money(Math.round(grupo.costoPromedio))}</b>.
        </p>
      )}

      <div className="mt-3 space-y-2">
        {grupo.conDatos.map((c) => (
          <Renglon
            key={c.ad.id}
            c={c}
            // Con una sola campaña no hay contra qué compararla: una barra
            // llena diría "rindió perfecto", que es una respuesta inventada.
            mejorCosto={grupo.conDatos.length >= 2 ? mejorCosto : undefined}
            distincion={
              grupo.mejor?.ad.id === c.ad.id
                ? 'mejor'
                : grupo.peor?.ad.id === c.ad.id
                ? 'peor'
                : undefined
            }
          />
        ))}
      </div>

      {grupo.sinDatos.length > 0 && (
        <div className="mt-3 border-t border-ink-100 pt-3">
          <p className="text-xs text-ink-400">
            {onCargarResultados
              ? `Sin ${grupo.unidad} cargados, así que no entran en la comparación:`
              : `Todavía sin resultados, así que no entran en la comparación:`}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {grupo.sinDatos.map((c) =>
              onCargarResultados ? (
                <button
                  key={c.ad.id}
                  className="chip bg-ink-100 text-ink-600 transition hover:bg-brand-100 hover:text-brand-800"
                  onClick={() => onCargarResultados(c.ad)}
                  title="Cargarle los resultados"
                >
                  {c.ad.name}
                </button>
              ) : (
                <span key={c.ad.id} className="chip bg-ink-100 text-ink-600">
                  {c.ad.name}
                </span>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Una campaña adentro de su grupo.
 *
 * La barra no mide plata ni resultados: mide cuánto rinde comparada con la
 * mejor del grupo. Si un mensaje salió el doble que en la mejor, la barra
 * llega a la mitad.
 */
function Renglon({
  c,
  mejorCosto,
  distincion,
}: {
  c: CampanaMedida;
  mejorCosto?: number;
  distincion?: 'mejor' | 'peor';
}) {
  const rinde = mejorCosto && c.costo ? (mejorCosto / c.costo) * 100 : undefined;

  // En las campañas de mensajes lo que de verdad importa es cuántos de esos
  // mensajes terminaron comprando: se muestra al lado, aunque el orden lo siga
  // marcando el costo por mensaje —que es el número que todas tienen—.
  const clientes = c.ad.closedFromMessages;
  const porCliente = clientes && clientes > 0 ? c.ad.spend / clientes : undefined;

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-800">
          {c.ad.name}
        </p>
        {distincion === 'mejor' && (
          <span className="chip bg-mint-100 text-mint-600">
            <Trophy size={12} /> La que mejor rindió
          </span>
        )}
        {distincion === 'peor' && (
          <span className="chip bg-butter-100 text-butter-700">
            <ThumbsDown size={12} /> La que menos rindió
          </span>
        )}
        <span className="shrink-0 text-sm font-semibold tabular-nums text-ink-900">
          {money(Math.round(c.costo as number))}
          <span className="font-normal text-ink-400"> / {c.medida.unidadSingular}</span>
        </span>
      </div>

      {rinde != null && (
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
          <div
            className={`h-full rounded-full ${
              distincion === 'mejor' ? 'bg-mint-400' : 'bg-brand-400'
            }`}
            style={{ width: `${Math.max(4, Math.round(rinde))}%` }}
          />
        </div>
      )}

      <p className="mt-0.5 text-[11px] text-ink-400">
        {nfmt(c.resultados as number)} {c.medida.unidad} con {money(c.ad.spend)} · empezó el{' '}
        {fmt(c.ad.startDate, "d 'de' MMMM")}
        {clientes != null && (
          <>
            {' · '}
            <b className="font-semibold text-ink-600">
              {clientes} {clientes === 1 ? 'cliente' : 'clientes'}
            </b>
            {porCliente ? ` a ${money(Math.round(porCliente))} cada uno` : ''}
          </>
        )}
      </p>
    </div>
  );
}
