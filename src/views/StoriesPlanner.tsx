import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { addDays, fmt, isSameDay, weekDays } from '@/lib/date';
import { statusChip, statusLabel } from '@/lib/format';
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import AddContentButton from '@/components/AddContentButton';
import PostDetail from '@/components/PostDetail';
import { MediaThumb, SectionTitle } from '@/components/ui';

export default function StoriesPlanner() {
  const posts = useStore((s) => s.posts);
  const currentClientId = useStore((s) => s.currentClientId);
  const [anchor, setAnchor] = useState(new Date());
  const [selected, setSelected] = useState<string | null>(null);

  const days = weekDays(anchor);
  const stories = posts.filter(
    (p) => p.clientId === currentClientId && p.type === 'historia'
  );

  return (
    <div>
      <SectionTitle
        title="Planificación de historias"
        subtitle="Organizá las historias día por día. Cada columna es un día de la semana."
        action={<AddContentButton onCreated={setSelected} defaultType="historia" label="Nueva historia" />}
      />

      <div className="mb-3 flex items-center gap-2">
        <button className="btn-ghost px-2" onClick={() => setAnchor((a) => addDays(a, -7))}>
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold capitalize text-ink-700">
          {fmt(days[0].toISOString(), "d 'de' MMM")} – {fmt(days[6].toISOString(), "d 'de' MMM")}
        </span>
        <button className="btn-ghost px-2" onClick={() => setAnchor((a) => addDays(a, 7))}>
          <ChevronRight size={18} />
        </button>
        <button className="btn-outline !py-1.5" onClick={() => setAnchor(new Date())}>
          Esta semana
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {days.map((day) => {
          const dayStories = stories.filter((s) => isSameDay(new Date(s.date), day));
          const today = isSameDay(day, new Date());
          return (
            <div key={day.toISOString()} className="min-h-[180px]">
              <div
                className={`mb-2 rounded-lg px-2 py-1 text-center text-xs font-semibold ${
                  today ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600'
                }`}
              >
                <div className="capitalize">{fmt(day.toISOString(), 'EEE')}</div>
                <div className="text-base">{fmt(day.toISOString(), 'd')}</div>
              </div>
              <div className="space-y-2">
                {dayStories.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setSelected(st.id)}
                    className="card w-full overflow-hidden text-left transition hover:shadow-soft"
                  >
                    <MediaThumb
                      src={st.mediaUrl}
                      className="aspect-[9/16] w-full"
                      label="⚡"
                    />
                    <div className="p-2">
                      <p className="line-clamp-2 text-[11px] font-medium text-ink-800">
                        {st.title}
                      </p>
                      <span className={`chip mt-1 ${statusChip[st.status]}`}>
                        {statusLabel[st.status]}
                      </span>
                    </div>
                  </button>
                ))}
                {dayStories.length === 0 && (
                  <div className="grid aspect-[9/16] place-items-center rounded-xl border border-dashed border-ink-200 text-ink-300">
                    <Zap size={18} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <PostDetail postId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
