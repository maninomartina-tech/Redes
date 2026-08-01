import { MessageSquare } from 'lucide-react';
import type { Post } from '@/types';
import { fmtDateTime } from '@/lib/date';
import { statusChip, statusLabel, typeEmoji, typeLabel } from '@/lib/format';
import { MediaThumb } from '@/components/ui';

export default function PostCard({
  post,
  onClick,
}: {
  post: Post;
  onClick: () => void;
}) {
  const open = post.comments.filter((c) => !c.resolved).length;
  return (
    <button
      onClick={onClick}
      className="card group w-full overflow-hidden text-left transition hover:-translate-y-0.5 hover:shadow-soft"
    >
      <MediaThumb
        src={post.mediaUrl}
        kind={post.mediaKind}
        label={`${typeEmoji[post.type]} ${typeLabel[post.type]}`}
        className="aspect-[4/3] w-full"
      />
      <div className="p-3">
        <div className="mb-1.5 flex items-center gap-1.5">
          <span className={`chip ${statusChip[post.status]}`}>{statusLabel[post.status]}</span>
          {open > 0 && (
            <span className="chip bg-rose-100 text-rose-700">
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
