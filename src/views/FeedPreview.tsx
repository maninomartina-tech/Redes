import { useState } from 'react';
import { useStore, useCurrentClient } from '@/store/useStore';
import { fmt } from '@/lib/date';
import { typeEmoji } from '@/lib/format';
import { Avatar, MediaThumb, SectionTitle } from '@/components/ui';
import SyncButton from '@/components/SyncButton';
import { sincronizarPublicaciones } from '@/lib/sync';
import PostDetail from '@/components/PostDetail';

export default function FeedPreview({ clientMode = false }: { clientMode?: boolean }) {
  const posts = useStore((s) => s.posts);
  const importarDeInstagram = useStore((s) => s.importarDeInstagram);
  const client = useCurrentClient();
  const [onlyReady, setOnlyReady] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const feed = posts
    .filter((p) => p.clientId === client.id && p.type !== 'historia')
    .filter((p) => (onlyReady ? ['aprobado', 'programado', 'publicado'].includes(p.status) : true))
    .sort((a, b) => b.date.localeCompare(a.date));

  const publishedCount = feed.filter((p) => p.status === 'publicado').length;

  return (
    <div>
      <SectionTitle
        title="Vista previa del feed"
        subtitle={
          clientMode
            ? 'Así va a quedar tu feed con el contenido de este mes.'
            : 'Cómo se va a ver la grilla con el contenido planificado del mes.'
        }
        action={
          <div className="flex flex-wrap items-start justify-end gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-600">
              <input
                type="checkbox"
                checked={onlyReady}
                onChange={(e) => setOnlyReady(e.target.checked)}
                className="h-4 w-4 rounded border-ink-300 text-brand-600"
              />
              Solo aprobado/publicado
            </label>

            {!clientMode && (
              <SyncButton
                label="Traer feed de Instagram"
                descripcion="Suma lo ya publicado con sus métricas. No duplica lo que planificaste acá."
                onSync={async () => {
                  const cuenta = client.accounts.find((a) => a.metaAccountId);
                  if (!cuenta?.metaAccountId) {
                    return {
                      ok: false,
                      error:
                        'Primero vinculá la cuenta de Instagram de este cliente, en la sección Cuentas.',
                    };
                  }
                  const r = await sincronizarPublicaciones(cuenta.metaAccountId);
                  if (!r.ok) return { ok: false, error: r.error, avisos: r.avisos };

                  const { nuevas, actualizadas } = importarDeInstagram(
                    client.id,
                    cuenta.id,
                    r.datos
                  );
                  return {
                    ok: true,
                    resumen:
                      `${nuevas} publicación(es) nueva(s) en el feed` +
                      (actualizadas > 0
                        ? ` y ${actualizadas} actualizada(s) con sus métricas.`
                        : '.'),
                    avisos: r.avisos,
                  };
                }}
              />
            )}
          </div>
        }
      />

      <div className="mx-auto max-w-md">
        {/* cabecera de perfil */}
        <div className="card p-5">
          <div className="flex items-center gap-4">
            <div
              className="grid h-16 w-16 place-items-center rounded-full p-[3px]"
              style={{ background: `conic-gradient(from 180deg, ${client.color}, #DBBF9A, #DFB0A1, ${client.color})` }}
            >
              <div className="grid h-full w-full place-items-center rounded-full bg-surface">
                <Avatar name={client.name} color={client.color} size={54} />
              </div>
            </div>
            <div className="flex flex-1 justify-around text-center">
              <Metric n={feed.length} label="posts" />
              <Metric n={publishedCount} label="publicados" />
              <Metric n={feed.filter((p) => p.status !== 'publicado').length} label="en cola" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-bold text-ink-900">{client.name}</p>
            <p className="text-sm text-ink-500">{client.handle}</p>
          </div>
        </div>

        {/* grilla */}
        <div className="mt-3 grid grid-cols-3 gap-1 overflow-hidden rounded-2xl bg-surface p-1 shadow-card">
          {feed.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className="group relative aspect-square"
            >
              <MediaThumb
                src={p.mediaUrl}
                imageUrl={p.igImageUrl}
                media={p.resultado}
                kind={p.mediaKind}
                className="h-full w-full"
              />
              <span className="absolute right-1 top-1 text-sm drop-shadow">
                {typeEmoji[p.type]}
              </span>
              {p.status !== 'publicado' && (
                <span className="absolute inset-x-1 bottom-1 rounded bg-ink-900/50 px-1 py-0.5 text-center text-[9px] font-semibold text-white backdrop-blur">
                  {fmt(p.date, 'd MMM')}
                </span>
              )}
              <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
            </button>
          ))}
          {feed.length === 0 &&
            Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-sm bg-ink-100" />
            ))}
        </div>
        <p className="mt-3 text-center text-xs text-ink-400">
          {feed.length} piezas en la grilla · el orden respeta la fecha de publicación
        </p>
      </div>

      <PostDetail postId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function Metric({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="text-lg font-bold text-ink-900">{n}</div>
      <div className="text-xs text-ink-500">{label}</div>
    </div>
  );
}
