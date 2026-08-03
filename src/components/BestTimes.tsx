import { Clock, Info } from 'lucide-react';
import { useMemo } from 'react';
import type { Post } from '@/types';
import { DIAS, FRANJAS, calcularHorarios, describirCelda } from '@/lib/horarios';
import { nfmt } from '@/lib/format';

/**
 * Cuándo conviene publicar, según lo que ya publicaste.
 *
 * Con pocas piezas cargadas se muestra igual, pero avisando que todavía no
 * alcanza: es peor cambiar la estrategia por un dato de una sola publicación.
 */
export default function BestTimes({ publicados }: { publicados: Post[] }) {
  const h = useMemo(() => calcularHorarios(publicados), [publicados]);

  const valor = (dia: number, franja: number) =>
    h.celdas.find((c) => c.dia === dia && c.franja === franja);

  return (
    <div className="card p-4">
      <div className="mb-1 flex items-center gap-2">
        <Clock size={18} className="text-brand-700" />
        <h3 className="font-bold text-ink-800">Mejores horarios</h3>
      </div>

      {h.total === 0 ? (
        <p className="text-sm text-ink-500">
          Cuando cargues las métricas de algunas publicaciones, acá vas a ver en
          qué días y horarios te fue mejor.
        </p>
      ) : (
        <>
          <p className="mb-3 text-sm text-ink-500">
            {h.mejor ? (
              <>
                Lo que mejor funcionó: <b>{describirCelda(h.mejor)}</b>, con{' '}
                {nfmt(Math.round(h.mejor.promedio))} interacciones promedio sobre{' '}
                {h.mejor.piezas} {h.mejor.piezas === 1 ? 'pieza' : 'piezas'}.
              </>
            ) : (
              'Todavía no hay publicaciones en horarios comparables.'
            )}
          </p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[380px] border-separate border-spacing-1 text-center">
              <thead>
                <tr>
                  <th className="w-20" />
                  {DIAS.map((d) => (
                    <th key={d} className="text-[11px] font-semibold text-ink-400">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FRANJAS.map((f, fi) => (
                  <tr key={f.nombre}>
                    <th className="pr-1 text-right text-[11px] font-medium text-ink-500">
                      <span className="block leading-tight">{f.nombre}</span>
                      <span className="block text-[10px] font-normal text-ink-400">
                        {f.etiqueta}
                      </span>
                    </th>
                    {DIAS.map((_, di) => {
                      const c = valor(di, fi);
                      const intensidad = c && h.tope > 0 ? c.promedio / h.tope : 0;
                      const destacada =
                        h.mejor && c && h.mejor.dia === di && h.mejor.franja === fi;
                      return (
                        <td key={di}>
                          <div
                            title={
                              c
                                ? `${DIAS[di]} ${f.etiqueta}: ${nfmt(
                                    Math.round(c.promedio)
                                  )} interacciones promedio · ${c.piezas} ${
                                    c.piezas === 1 ? 'pieza' : 'piezas'
                                  }`
                                : 'Todavía no publicaste en esta franja'
                            }
                            className={`grid h-9 place-items-center rounded-lg text-[11px] font-semibold ${
                              destacada ? 'ring-2 ring-brand-700 ring-offset-1' : ''
                            } ${c ? 'text-brand-900' : 'text-ink-300'}`}
                            style={{
                              backgroundColor: c
                                ? `rgb(var(--c-brand-500) / ${0.15 + intensidad * 0.65})`
                                : 'rgb(var(--c-ink-100) / 0.6)',
                            }}
                          >
                            {c ? nfmt(Math.round(c.promedio)) : '·'}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!h.confiable && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-butter-50 p-2.5 text-[11px] leading-snug text-butter-700">
              <Info size={13} className="mt-px shrink-0" />
              Con {h.total} {h.total === 1 ? 'publicación medida' : 'publicaciones medidas'} esto
              todavía es una pista, no una conclusión. Cargá las métricas de unas
              cuantas más antes de mover tus horarios.
            </p>
          )}
        </>
      )}
    </div>
  );
}
