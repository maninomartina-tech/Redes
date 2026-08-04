import { MessageSquare } from 'lucide-react';
import type { Post } from '@/types';
import { fmtDateTime } from '@/lib/date';
import { esHistoria, statusChip, statusLabel, typeEmoji, typeLabel } from '@/lib/format';
import { MediaThumb } from '@/components/ui';

export default function PostCard({
  post,
  onClick,
  destacar = false,
}: {
  post: Post;
  onClick: () => void;
  /** Con posteos e historias mezclados, distinguirlos a simple vista. */
  destacar?: boolean;
}) {
  const open = post.comments.filter((c) => !c.resolved).length;

  // El posteo lleva un filo de color; la historia queda en segundo plano.
  const historia = esHistoria(post.type);
  const peso = !destacar
    ? ''
    : historia
      ? 'opacity-80'
      : 'border-l-[3px] border-l-brand-500';

  return (
    <button
      onClick={onClick}
      className={`card group w-full overflow-hidden text-left transition hover:-translate-y-0.5 hover:shadow-soft ${peso}`}
    >
      <MediaThumb
        src={post.mediaUrl}
        imageUrl={post.igImageUrl}
        kind={post.mediaKind}
        label={`${typeEmoji[post.type]} ${typeLabel[post.type]}`}
        className="aspect-[4/3] w-full"
      />
      <div className="p-3">
        <div className="mb-1.5 flex items-center gap-1.5">
          <span className={`chip ${statusChip[post.status]}`}>{statusLabel[post.status]}</span>
          {open > 0 && (
            <span className="chip bg-rose-100 text-rose-600">
              <MessageSquare size={11} /> {open}
            </span>
          )}
        </div>
        <p className="line-clamp-2 text-sm font-semibold text-ink-900">{post.title}</p>
        <p className="mt-1 text-xs text-ink-400">{fmtDateTime(post.date)}</p>
      </div>
    </button>
  );
}
