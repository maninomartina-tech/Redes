import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import {
  addDays,
  fmt,
  isSameDay,
  isSameMonth,
  monthGrid,
  startOfMonth,
  weekdayNames,
} from '@/lib/date';
import { statusDot, typeEmoji } from '@/lib/format';
import AddContentButton from '@/components/AddContentButton';
import PostDetail from '@/components/PostDetail';
import { SectionTitle } from '@/components/ui';

export default function CalendarView() {
  const posts = useStore((s) => s.posts);
  const currentClientId = useStore((s) => s.currentClientId);
  const [anchor, setAnchor] = useState(startOfMonth(new Date()));
  const [selected, setSelected] = useState<string | null>(null);
  const [newDate, setNewDate] = useState<string | undefined>();

  const days = useMemo(() => monthGrid(anchor), [anchor]);
  const clientPosts = posts.filter((p) => p.clientId === currentClientId);

  const byDay = (day: Date) =>
    clientPosts
      .filter((p) => isSameDay(new Date(p.date), day))
      .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div>
      <SectionTitle
        title="Calendario de publicaciones"
        subtitle="Todo el contenido del mes, por día. Hacé clic en una pieza para editarla."
        action={
          <AddContentButton
            onCreated={setSelected}
            defaultDate={newDate}
            label="Nuevo contenido"
          />
        }
      />

      <div className="card overflow-hidden">
        {/* controles de mes */}
        <div className="flex items-center justify-between border-b border-ink-200/70 px-4 py-3">
          <h3 className="text-base font-bold capitalize text-ink-900">
            {fmt(anchor.toISOString(), 'MMMM yyyy')}
          </h3>
          <div className="flex items-center gap-1">
            <button
              className="btn-ghost px-2"
              onClick={() => setAnchor((a) => startOfMonth(addDays(a, -1)))}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="btn-outline !py-1.5"
              onClick={() => setAnchor(startOfMonth(new Date()))}
            >
              Hoy
            </button>
            <button
              className="btn-ghost px-2"
              onClick={() => setAnchor((a) => startOfMonth(addDays(a, 32)))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* encabezado días */}
        <div className="grid grid-cols-7 border-b border-ink-200/70 bg-ink-50 text-center text-xs font-semibold text-ink-500">
          {weekdayNames.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>

        {/* grilla */}
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayPosts = byDay(day);
            const inMonth = isSameMonth(day, anchor);
            const today = isSameDay(day, new Date());
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[104px] border-b border-r border-ink-200/70 p-1.5 ${
                  inMonth ? 'bg-surface' : 'bg-canvas'
                }`}
              >
                <div className="mb-1 flex items-center justify-between px-0.5">
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${
                      today
                        ? 'bg-brand-500 text-white'
                        : inMonth
                        ? 'text-ink-600'
                        : 'text-ink-300'
                    }`}
                  >
                    {fmt(day.toISOString(), 'd')}
                  </span>
                  <button
                    className="text-ink-300 opacity-0 transition hover:text-brand-600 group-hover:opacity-100"
                    onClick={() => {
                      setNewDate(day.toISOString());
                    }}
                  />
                </div>
                <div className="space-y-1">
                  {dayPosts.slice(0, 3).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelected(p.id)}
                      className="flex w-full items-center gap-1.5 rounded-lg bg-ink-50 px-1.5 py-1 text-left text-[11px] font-medium text-ink-700 hover:bg-brand-50"
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot[p.status]}`} />
                      <span className="shrink-0">{typeEmoji[p.type]}</span>
                      <span className="truncate">{p.title}</span>
                    </button>
                  ))}
                  {dayPosts.length > 3 && (
                    <span className="px-1.5 text-[11px] text-ink-400">
                      +{dayPosts.length - 3} más
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <PostDetail postId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
