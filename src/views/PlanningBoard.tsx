import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { statusDot, statusLabel, statusOrder } from '@/lib/format';
import AddContentButton from '@/components/AddContentButton';
import PostCard from '@/components/PostCard';
import PostDetail from '@/components/PostDetail';
import { SectionTitle } from '@/components/ui';

export default function PlanningBoard() {
  const posts = useStore((s) => s.posts);
  const currentClientId = useStore((s) => s.currentClientId);
  const [selected, setSelected] = useState<string | null>(null);

  const clientPosts = posts
    .filter((p) => p.clientId === currentClientId)
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div>
      <SectionTitle
        title="Planificación"
        subtitle="Tu tablero de producción. Arrastrá el contenido por el flujo: idea → producción → revisión → aprobado → programado → publicado."
        action={<AddContentButton onCreated={setSelected} />}
      />

      <div className="flex gap-4 overflow-x-auto pb-3">
        {statusOrder.map((st) => {
          const items = clientPosts.filter((p) => p.status === st);
          return (
            <div key={st} className="w-72 shrink-0">
              <div className="mb-2.5 flex items-center gap-2 px-1">
                <span className={`h-2.5 w-2.5 rounded-full ${statusDot[st]}`} />
                <span className="text-sm font-bold text-ink-800">{statusLabel[st]}</span>
                <span className="ml-auto rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-500">
                  {items.length}
                </span>
              </div>
              <div className="space-y-3 rounded-2xl bg-ink-100/50 p-2.5">
                {items.length === 0 && (
                  <p className="px-1 py-6 text-center text-xs text-ink-400">
                    Sin contenido en esta etapa.
                  </p>
                )}
                {items.map((p) => (
                  <PostCard key={p.id} post={p} onClick={() => setSelected(p.id)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <PostDetail postId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
