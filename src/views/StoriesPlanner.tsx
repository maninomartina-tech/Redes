import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { addDays, fmt, isSameDay, moverADia, weekDays } from '@/lib/date';
import { statusChip, statusLabel } from '@/lib/format';
import { portadaDelFeed } from '@/lib/piezas';
import { ChevronLeft, ChevronRight, FileUp, GripVertical, Zap } from 'lucide-react';
import type { Post } from '@/types';
import AddContentButton from '@/components/AddContentButton';
import ImportarHistorias from '@/components/ImportarHistorias';
import PostDetail from '@/components/PostDetail';
import { MediaThumb, SectionTitle } from '@/components/ui';

// ---------------------------------------------------------------------------
// La semana de historias.
//
// Se arrastran de un día a otro: cuando se sube una tanda de placas de una vez,
// el reparto inicial es una cuenta, no una decisión, y acomodarlas es el paso
// que sigue. Arrastrar no existe en el teléfono, así que la fecha también se
// edita desde el contenido.
// ---------------------------------------------------------------------------

function Placa({
  post,
  onOpen,
  arrastrando,
  onDragStart,
  onDragEnd,
}: {
  post: Post;
  onOpen: () => void;
  arrastrando: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        // Firefox no arranca el arrastre si no se escribe algo.
        e.dataTransfer.setData('text/plain', post.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      title={post.title}
      className={`card group/placa w-full cursor-grab overflow-hidden text-left transition hover:shadow-soft active:cursor-grabbing ${
        arrastrando ? 'opacity-40' : ''
      }`}
    >
      <div className="relative">
        <MediaThumb
          src={post.mediaUrl}
          media={portadaDelFeed(post)}
          className="aspect-[9/16] w-full"
          label="⚡"
        />
        <GripVertical
          size={12}
          className="absolute right-1 top-1 text-white/80 opacity-0 drop-shadow transition group-hover/placa:opacity-100"
        />
      </div>
      <div className="p-2">
        <p className="line-clamp-2 text-[11px] font-medium text-ink-800">{post.title}</p>
        <span className={`chip mt-1 ${statusChip[post.status]}`}>
          {statusLabel[post.status]}
        </span>
      </div>
    </div>
  );
}

export default function StoriesPlanner() {
  const posts = useStore((s) => s.posts);
  const currentClientId = useStore((s) => s.currentClientId);
  const updatePost = useStore((s) => s.updatePost);

  const [anchor, setAnchor] = useState(new Date());
  const [selected, setSelected] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [encima, setEncima] = useState<string | null>(null);

  const days = weekDays(anchor);
  const stories = posts.filter(
    (p) => p.clientId === currentClientId && p.type === 'historia'
  );

  const soltarEn = (day: Date) => {
    setEncima(null);
    const id = arrastrando;
    setArrastrando(null);
    if (!id) return;
    const post = stories.find((p) => p.id === id);
    if (!post || isSameDay(new Date(post.date), day)) return;
    updatePost(id, { date: moverADia(post.date, day) });
  };

  return (
    <div>
      <SectionTitle
        title="Planificación de historias"
        subtitle="Organizá las historias día por día."
        soloEnEscritorio=" Arrastrá una placa para cambiarla de día."
        action={
          <div className="flex flex-wrap gap-2">
            <button className="btn-outline" onClick={() => setImportando(true)}>
              <FileUp size={16} /> Cargar varias
            </button>
            <AddContentButton
              onCreated={setSelected}
              defaultType="historia"
              label="Nueva historia"
            />
          </div>
        }
      />

      <div className="mb-3 flex items-center gap-2">
        <button
          className="btn-ghost px-2"
          aria-label="Semana anterior"
          onClick={() => setAnchor((a) => addDays(a, -7))}
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold capitalize text-ink-700">
          {fmt(days[0].toISOString(), "d 'de' MMM")} – {fmt(days[6].toISOString(), "d 'de' MMM")}
        </span>
        <button
          className="btn-ghost px-2"
          aria-label="Semana siguiente"
          onClick={() => setAnchor((a) => addDays(a, 7))}
        >
          <ChevronRight size={18} />
        </button>
        <button className="btn-outline !py-1.5" onClick={() => setAnchor(new Date())}>
          Esta semana
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {days.map((day) => {
          const dayStories = stories
            .filter((s) => isSameDay(new Date(s.date), day))
            .sort((a, b) => a.date.localeCompare(b.date));
          const today = isSameDay(day, new Date());
          const recibiendo = encima === day.toDateString();

          return (
            <div
              key={day.toISOString()}
              onDragOver={(e) => {
                if (!arrastrando) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setEncima(day.toDateString());
              }}
              onDragLeave={() => setEncima((v) => (v === day.toDateString() ? null : v))}
              onDrop={(e) => {
                e.preventDefault();
                soltarEn(day);
              }}
              className={`min-h-[180px] rounded-xl p-1 transition ${
                recibiendo ? 'bg-brand-100 ring-2 ring-inset ring-brand-400' : ''
              }`}
            >
              <div
                className={`mb-2 rounded-lg px-2 py-1 text-center text-xs font-semibold ${
                  today ? 'bg-brand-800 text-canvas' : 'bg-ink-100 text-ink-600'
                }`}
              >
                <div className="capitalize">{fmt(day.toISOString(), 'EEE')}</div>
                <div className="text-base">{fmt(day.toISOString(), 'd')}</div>
              </div>
              <div className="space-y-2">
                {dayStories.map((st) => (
                  <Placa
                    key={st.id}
                    post={st}
                    onOpen={() => setSelected(st.id)}
                    arrastrando={arrastrando === st.id}
                    onDragStart={() => setArrastrando(st.id)}
                    onDragEnd={() => {
                      setArrastrando(null);
                      setEncima(null);
                    }}
                  />
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

      <ImportarHistorias
        open={importando}
        onClose={() => setImportando(false)}
        semana={days[0]}
      />
      <PostDetail postId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
