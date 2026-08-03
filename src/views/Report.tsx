import { Printer, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useStore, useCurrentClient } from '@/store/useStore';
import type { Post } from '@/types';
import { computeGrowth, computeLeads, monthLabel, sourceLabel } from '@/lib/growth';
import { calcularHorarios, describirCelda } from '@/lib/horarios';
import { fmt } from '@/lib/date';
import { money, nfmt, typeLabel } from '@/lib/format';
import { Avatar, EmptyState, MediaThumb, SectionTitle } from '@/components/ui';
import Logo from '@/components/Logo';

// ---------------------------------------------------------------------------
// Informe mensual.
//
// Es lo que se le manda al cliente a fin de mes. Se imprime desde el navegador
// (Imprimir → Guardar como PDF): así no hace falta ninguna librería para
// generar archivos, y sale igual de prolijo.
// ---------------------------------------------------------------------------

const interaccion = (p: Post) => {
  const m = p.metrics!;
  return m.likes + m.comments + m.saves + m.shares;
};

export default function Report() {
  const client = useCurrentClient();
  const posts = useStore((s) => s.posts);
  const monthlyStats = useStore((s) => s.monthlyStats);
  const leads = useStore((s) => s.leads);

  /** Los meses con algo para contar, del más nuevo al más viejo. */
  const meses = useMemo(() => {
    const set = new Set<string>();
    posts
      .filter((p) => p.clientId === client.id && p.status === 'publicado')
      .forEach((p) => set.add(p.date.slice(0, 7)));
    monthlyStats.filter((m) => m.clientId === client.id).forEach((m) => set.add(m.month));
    return [...set].sort().reverse();
  }, [posts, monthlyStats, client.id]);

  const [mes, setMes] = useState(() => meses[0] ?? new Date().toISOString().slice(0, 7));

  const datos = useMemo(() => {
    const delMes = posts
      .filter(
        (p) =>
          p.clientId === client.id &&
          p.status === 'publicado' &&
          p.date.slice(0, 7) === mes
      )
      .sort((a, b) => +new Date(a.date) - +new Date(b.date));

    const medidos = delMes.filter((p) => p.metrics);
    const crecimiento = computeGrowth(client, monthlyStats, posts);
    const punto = crecimiento.points.find((p) => p.month === mes);
    const anterior =
      crecimiento.points[crecimiento.points.findIndex((p) => p.month === mes) - 1];

    const totales = medidos.reduce(
      (acc, p) => {
        const m = p.metrics!;
        acc.alcance += m.reach;
        acc.interacciones += interaccion(p);
        acc.guardados += m.saves;
        acc.compartidos += m.shares;
        return acc;
      },
      { alcance: 0, interacciones: 0, guardados: 0, compartidos: 0 }
    );

    const porTipo = new Map<string, number>();
    delMes.forEach((p) => porTipo.set(p.type, (porTipo.get(p.type) ?? 0) + 1));

    return {
      delMes,
      medidos,
      punto,
      anterior,
      totales,
      porTipo: [...porTipo.entries()],
      mejores: [...medidos].sort((a, b) => interaccion(b) - interaccion(a)).slice(0, 3),
      ventas: client.tracksLeads ? computeLeads(leads, client.id, mes) : null,
      horarios: calcularHorarios(medidos),
    };
  }, [posts, monthlyStats, leads, client, mes]);

  if (meses.length === 0) {
    return (
      <div>
        <SectionTitle title="Informe mensual" subtitle={`Resumen de ${client.name}.`} />
        <EmptyState
          icon={<TrendingUp size={30} />}
          title="Todavía no hay nada que informar"
          hint="Cuando haya contenido publicado o seguidores cargados en Crecimiento, el informe se arma solo."
        />
      </div>
    );
  }

  const { delMes, medidos, punto, anterior, totales, porTipo, mejores, ventas, horarios } = datos;
  const ganados = punto && anterior ? punto.followers - anterior.followers : punto?.gained ?? 0;

  return (
    <div>
      {/* Nada de esto sale en el papel */}
      <div className="no-print">
        <SectionTitle
          title="Informe mensual"
          subtitle="Lo que le mandás al cliente a fin de mes."
          action={
            <div className="flex items-center gap-2">
              <select
                className="input !w-auto !py-1.5"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
              >
                {meses.map((m) => (
                  <option key={m} value={m}>
                    {monthLabel(m)}
                  </option>
                ))}
              </select>
              <button className="btn-primary" onClick={() => window.print()}>
                <Printer size={16} /> Imprimir / PDF
              </button>
            </div>
          }
        />
        <p className="mb-4 text-xs leading-snug text-ink-500">
          En el cuadro de impresión elegí <b>Guardar como PDF</b> y ya lo tenés
          para mandar. Los números salen de lo que cargaste en Crecimiento y de
          las métricas de cada publicación.
        </p>
      </div>

      {/* ---------------------------- el informe ---------------------------- */}
      <article className="hoja card space-y-6 p-6">
        <header className="flex items-center justify-between gap-4 border-b border-ink-200/70 pb-4">
          <div className="flex items-center gap-3">
            <Avatar name={client.name} color={client.color} logoId={client.logo?.id} size={44} />
            <div>
              <h1 className="text-lg font-bold text-ink-900">{client.name}</h1>
              <p className="text-sm text-ink-500">
                {client.handle} · Informe de {monthLabel(mes)}
              </p>
            </div>
          </div>
          <Logo size={34} />
        </header>

        {/* Números grandes */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Dato
            label="Seguidores"
            valor={punto ? nfmt(punto.followers) : '—'}
            pie={
              ganados
                ? `${ganados > 0 ? '+' : ''}${nfmt(ganados)} en el mes`
                : 'Sin dato del mes anterior'
            }
          />
          <Dato label="Publicaciones" valor={String(delMes.length)} pie={resumenTipos(porTipo)} />
          <Dato
            label="Alcance"
            valor={totales.alcance ? nfmt(totales.alcance) : '—'}
            pie={medidos.length < delMes.length ? `${medidos.length} de ${delMes.length} medidas` : 'Cuentas alcanzadas'}
          />
          <Dato
            label="Interacciones"
            valor={totales.interacciones ? nfmt(totales.interacciones) : '—'}
            pie={
              totales.alcance
                ? `${((totales.interacciones / totales.alcance) * 100).toFixed(1)}% del alcance`
                : 'Me gusta, comentarios, guardados y compartidos'
            }
          />
        </section>

        {/* Qué se publicó */}
        <section>
          <h2 className="mb-2 text-sm font-bold text-ink-800">Qué se publicó</h2>
          {delMes.length === 0 ? (
            <p className="text-sm text-ink-500">No hubo publicaciones este mes.</p>
          ) : (
            <div className="space-y-1.5">
              {delMes.map((p) => (
                <div key={p.id} className="flex items-center gap-3 text-sm">
                  <MediaThumb
                    media={p.resultado}
                    imageUrl={p.igImageUrl}
                    src={p.mediaUrl}
                    className="h-9 w-9 shrink-0 rounded-md"
                  />
                  <span className="w-16 shrink-0 text-xs text-ink-400">
                    {fmt(p.date, 'd MMM')}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-ink-800">{p.title}</span>
                  <span className="shrink-0 text-xs text-ink-400">{typeLabel[p.type]}</span>
                  <span className="w-16 shrink-0 text-right text-xs font-semibold text-ink-700">
                    {p.metrics ? nfmt(interaccion(p)) : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Lo que mejor funcionó */}
        {mejores.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-bold text-ink-800">Lo que mejor funcionó</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {mejores.map((p) => (
                <div key={p.id} className="rounded-xl border border-ink-200/70 p-3">
                  <MediaThumb
                    media={p.resultado}
                    imageUrl={p.igImageUrl}
                    src={p.mediaUrl}
                    className="mb-2 aspect-square w-full rounded-lg"
                  />
                  <p className="truncate text-[13px] font-semibold text-ink-800">{p.title}</p>
                  <p className="text-[11px] text-ink-500">
                    {nfmt(interaccion(p))} interacciones · {nfmt(p.metrics!.reach)} alcance
                  </p>
                </div>
              ))}
            </div>
            {horarios.mejor && horarios.confiable && (
              <p className="mt-2 text-xs text-ink-500">
                El mejor momento del mes fue <b>{describirCelda(horarios.mejor)}</b>.
              </p>
            )}
          </section>
        )}

        {/* Ventas, solo si con este cliente se miden */}
        {ventas && ventas.total > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-bold text-ink-800">Consultas y ventas</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Dato label="Consultas" valor={String(ventas.total)} pie="Llegaron este mes" />
              <Dato label="Cerradas" valor={String(ventas.ganados)} pie="Terminaron en venta" />
              <Dato
                label="Conversión"
                valor={ventas.conversion ? `${ventas.conversion.toFixed(0)}%` : '—'}
                pie="De las ya resueltas"
              />
              <Dato
                label="Facturado"
                valor={ventas.revenue ? money(ventas.revenue) : '—'}
                pie={ventas.ticketPromedio ? `${money(ventas.ticketPromedio)} promedio` : ''}
              />
            </div>
            {ventas.porFuente.length > 0 && (
              <p className="mt-2 text-xs text-ink-500">
                Por dónde llegaron:{' '}
                {ventas.porFuente
                  .map((f) => `${sourceLabel(f.source)} (${f.total})`)
                  .join(' · ')}
                .
              </p>
            )}
          </section>
        )}

        <footer className="border-t border-ink-200/70 pt-3 text-[11px] text-ink-400">
          Informe de {monthLabel(mes)} · generado el {fmt(new Date().toISOString(), "d 'de' MMMM 'de' yyyy")}
          {medidos.length < delMes.length && delMes.length > 0 && (
            <> · {delMes.length - medidos.length} publicación(es) sin métricas cargadas</>
          )}
        </footer>
      </article>
    </div>
  );
}

function Dato({ label, valor, pie }: { label: string; valor: string; pie?: string }) {
  return (
    <div className="rounded-xl bg-ink-50 p-3">
      <p className="label">{label}</p>
      <p className="mt-0.5 text-xl font-bold text-ink-900">{valor}</p>
      {pie && <p className="text-[11px] leading-snug text-ink-500">{pie}</p>}
    </div>
  );
}

function resumenTipos(porTipo: [string, number][]): string {
  if (porTipo.length === 0) return 'Sin contenido';
  return porTipo
    .map(([t, n]) => `${n} ${typeLabel[t as Post['type']].toLowerCase()}${n > 1 ? 's' : ''}`)
    .join(' · ');
}
