import { ChevronLeft, ChevronRight, Clapperboard, Lightbulb, MessageSquare, Type } from 'lucide-react';
import { useState } from 'react';
import { useStore, useCurrentClient } from '@/store/useStore';
import type { Post } from '@/types';
import { addDays, fmt, fmtTime, isSameDay, weekDays } from '@/lib/date';
import { statusChip, statusLabel, typeEmoji, typeLabel } from '@/lib/format';
import PostDetail from '@/components/PostDetail';
import { MediaThumb, EmptyState } from '@/components/ui';

export default function ClientWeek() {
  const posts = useStore((s) => s.posts);
  const client = useCurrentClient();
  const [anchor, setAnchor] = useState(new Date());
  const [selected, setSelected] = useState<string | null>(null);

  const days = weekDays(anchor);
  const visible = posts.filter(
    (p) =>
      p.clientId === client.id &&
      ['revision', 'aprobado', 'programado', 'publicado'].includes(p.status)
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink-900">Tu semana de contenido</h2>
          <p className="text-sm text-ink-500">
            Esto es lo que se va a publicar. Revisalo y dejanos tus comentarios.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost px-2" onClick={() => setAnchor((a) => addDays(a, -7))}>
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold capitalize text-ink-700">
            {fmt(days[0].toISOString(), 'd MMM')} – {fmt(days[6].toISOString(), 'd MMM')}
          </span>
          <button className="btn-ghost px-2" onClick={() => setAnchor((a) => addDays(a, 7))}>
            <ChevronRight size={18} />
          </button>
          <button className="btn-outline !py-1.5" onClick={() => setAnchor(new Date())}>
            Hoy
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {days.map((day) => {
          const dayPosts = visible
            .filter((p) => isSameDay(new Date(p.date), day))
            .sort((a, b) => a.date.localeCompare(b.date));
          if (dayPosts.length === 0) return null;
          return (
            <div key={day.toISOString()}>
              <div className="mb-2 flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
                  {fmt(day.toISOString(), 'd')}
                </span>
                <span className="text-sm font-semibold capitalize text-ink-700">
                  {fmt(day.toISOString(), 'EEEE')}
                </span>
              </div>
              <div className="space-y-3">
                {dayPosts.map((p) => (
                  <ClientPostCard key={p.id} post={p} onOpen={() => setSelected(p.id)} />
                ))}
              </div>
            </div>
          );
        })}
        {visible.filter((p) => days.some((d) => isSameDay(new Date(p.date), d))).length === 0 && (
          <EmptyState
            title="No hay contenido para esta semana"
            hint="Cuando tu creadora prepare el contenido de estos días, lo vas a ver acá."
          />
        )}
      </div>

      <PostDetail postId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function ClientPostCard({ post, onOpen }: { post: Post; onOpen: () => void }) {
  const openComments = post.comments.filter((c) => !c.resolved).length;
  return (
    <div className="card overflow-hidden md:flex">
      <MediaThumb
        src={post.mediaUrl}
        kind={post.mediaKind}
        label={`${typeEmoji[post.type]} ${typeLabel[post.type]}`}
        className="aspect-[4/3] w-full md:aspect-auto md:w-52 md:shrink-0"
      />
      <div className="flex-1 p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className={`chip ${statusChip[post.status]}`}>{statusLabel[post.status]}</span>
          <span className="text-xs text-ink-400">{fmtTime(post.date)} h</span>
          <h3 className="w-full text-base font-bold text-ink-900">{post.title}</h3>
        </div>

        {/* las 3 partes */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Block icon={<Lightbulb size={13} />} color="text-amber-600" label="Idea general" text={post.ideaGeneral} />
          <Block
            icon={<Clapperboard size={13} />}
            color="text-sky-600"
            label={post.type === 'reel' || post.type === 'historia' ? 'Guion' : 'Contenido'}
            text={post.contenido}
          />
          <Block icon={<Type size={13} />} color="text-brand-600" label="Copy" text={post.copy} />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button className="btn-soft !py-1.5" onClick={onOpen}>
            <MessageSquare size={15} />
            {openComments > 0 ? `${openComments} comentario(s)` : 'Comentar / Aprobar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Block({
  icon,
  color,
  label,
  text,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  text: string;
}) {
  return (
    <div className="rounded-xl bg-ink-50 p-2.5">
      <div className={`mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide ${color}`}>
        {icon} {label}
      </div>
      <p className="line-clamp-4 whitespace-pre-line text-xs text-ink-600">
        {text || <span className="text-ink-300">—</span>}
      </p>
    </div>
  );
}
