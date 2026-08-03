import { Bookmark, Clock, Lightbulb, Repeat, TrendingUp, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { useStore, useCurrentClient } from '@/store/useStore';
import type { Post } from '@/types';
import { fmt } from '@/lib/date';
import { nfmt, typeLabel } from '@/lib/format';
import { EmptyState, MediaThumb, SectionTitle } from '@/components/ui';

interface Rec {
  icon: React.ReactNode;
  title: string;
  detail: string;
}

function eng(p: Post) {
  const m = p.metrics!;
  return m.likes + m.comments + m.saves + m.shares;
}

function buildRecs(published: Post[]): Rec[] {
  if (published.length === 0) return [];
  const recs: Rec[] = [];

  // Mejor formato
  const byType = new Map<string, { eng: number; reach: number; n: number }>();
  published.forEach((p) => {
    const c = byType.get(p.type) ?? { eng: 0, reach: 0, n: 0 };
    c.eng += eng(p);
    c.reach += p.metrics!.reach;
    c.n += 1;
    byType.set(p.type, c);
  });
  let bestType = '';
  let bestAvg = 0;
  byType.forEach((v, k) => {
    const avg = v.eng / v.n;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestType = k;
    }
  });
  if (bestType)
    recs.push({
      icon: <Repeat size={16} />,
      title: `Hacé más ${typeLabel[bestType as Post['type']]}s`,
      detail: `Es el formato que más interacción promedio genera (${nfmt(
        Math.round(bestAvg)
      )} por pieza). Reforzá este formato el próximo mes.`,
    });

  // Mejor horario/día
  const best = [...published].sort((a, b) => eng(b) - eng(a))[0];
  recs.push({
    icon: <Clock size={16} />,
    title: `Mejor momento: ${fmt(best.date, "EEEE 'a las' HH:00")} h`,
    detail: `Tu contenido de mayor rendimiento salió ese día y horario. Probá concentrar los lanzamientos importantes ahí.`,
  });

  // Guardados
  const totalSaves = published.reduce((s, p) => s + p.metrics!.saves, 0);
  if (totalSaves > 0)
    recs.push({
      icon: <Bookmark size={16} />,
      title: 'El contenido guardable funciona',
      detail: `Acumulaste ${nfmt(
        totalSaves
      )} guardados. El contenido educativo/de valor (tips, guías) rinde bien: sumá más de este tipo.`,
    });

  // Alcance
  const avgReach =
    published.reduce((s, p) => s + p.metrics!.reach, 0) / published.length;
  recs.push({
    icon: <TrendingUp size={16} />,
    title: 'Impulsá lo que ya funciona',
    detail: `Tu alcance promedio es ${nfmt(
      Math.round(avgReach)
    )}. Las piezas que superan ese número son buenas candidatas para pauta (ADS) y para repostear.`,
  });

  return recs;
}

export default function Recommendations({ clientMode = false }: { clientMode?: boolean }) {
  const posts = useStore((s) => s.posts);
  const client = useCurrentClient();

  const published = useMemo(
    () =>
      posts
        .filter((p) => p.clientId === client.id && p.status === 'publicado' && p.metrics)
        .sort((a, b) => eng(b) - eng(a)),
    [posts, client.id]
  );
  const recs = useMemo(() => buildRecs(published), [published]);

  return (
    <div>
      <SectionTitle
        title="Recomendaciones"
        subtitle={
          clientMode
            ? 'Ideas basadas en cómo funcionó tu contenido ya publicado.'
            : 'Qué repetir y qué ajustar, según el contenido publicado.'
        }
      />

      {published.length === 0 ? (
        <EmptyState
          icon={<Lightbulb size={32} />}
          title="Todavía no hay suficientes datos"
          hint="Cuando haya contenido publicado con métricas, acá vas a ver recomendaciones automáticas."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* recomendaciones */}
          <div className="space-y-3">
            {recs.map((r, i) => (
              <div key={i} className="card flex gap-3 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  {r.icon}
                </span>
                <div>
                  <p className="font-semibold text-ink-900">{r.title}</p>
                  <p className="text-sm text-ink-500">{r.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* top contenido publicado */}
          <div className="card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Trophy size={18} className="text-butter-600" />
              <h3 className="font-bold text-ink-800">Tu mejor contenido</h3>
            </div>
            <div className="space-y-3">
              {published.slice(0, 4).map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="w-4 text-sm font-bold text-ink-300">{i + 1}</span>
                  <MediaThumb
                    src={p.mediaUrl}
                    imageUrl={p.igImageUrl}
                    kind={p.mediaKind}
                    className="h-12 w-12 shrink-0 rounded-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-800">{p.title}</p>
                    <p className="text-xs text-ink-400">
                      {typeLabel[p.type]} · {fmt(p.date, 'd MMM')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-ink-900">{nfmt(eng(p))}</p>
                    <p className="text-[11px] text-ink-400">interac.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
