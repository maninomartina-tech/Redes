import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Images,
  Lightbulb,
  Link as LinkIcon,
  MessageSquare,
  Sparkle,
  Type,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { useStore, useCurrentClient } from '@/store/useStore';
import type { Post } from '@/types';
import { addDays, fmt, fmtTime, isSameDay, weekDays } from '@/lib/date';
import { statusChip, statusLabel, typeEmoji, typeLabel } from '@/lib/format';
import PostDetail from '@/components/PostDetail';
import { MediaThumb, EmptyState } from '@/components/ui';

/**
 * Etapas del contenido tal como las ve el cliente.
 *
 * En planificación todavía no existe la pieza gráfica: se muestra de dónde
 * nace la publicación (posteos) o el texto y la idea (historias). Recién
 * cuando el contenido está aprobado se produce la pieza y pasa a verse.
 */
function enPlanificacion(post: Post): boolean {
  return ['idea', 'produccion', 'revision'].includes(post.status);
}

export default function ClientWeek() {
  const posts = useStore((s) => s.posts);
  const client = useCurrentClient();
  const [anchor, setAnchor] = useState(new Date());
  const [selected, setSelected] = useState<string | null>(null);

  const days = weekDays(anchor);
  const deLaSemana = posts.filter(
    (p) => p.clientId === client.id && days.some((d) => isSameDay(new Date(p.date), d))
  );

  const posteos = deLaSemana
    .filter((p) => p.type !== 'historia')
    .sort((a, b) => a.date.localeCompare(b.date));
  const historias = deLaSemana
    .filter((p) => p.type === 'historia')
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
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

      {deLaSemana.length === 0 && (
        <EmptyState
          title="No hay contenido para esta semana"
          hint="Cuando tu creadora prepare el contenido de estos días, lo vas a ver acá."
        />
      )}

      {/* ---------------- Posteos y reels ---------------- */}
      {posteos.length > 0 && (
        <section>
          <SeccionHeader
            icon={<Images size={17} />}
            titulo="Posteos y reels"
            cantidad={posteos.length}
            tono="brand"
          />
          <div className="space-y-3">
            {posteos.map((p) => (
              <PosteoCard key={p.id} post={p} onOpen={() => setSelected(p.id)} />
            ))}
          </div>
        </section>
      )}

      {/* ---------------- Historias ---------------- */}
      {historias.length > 0 && (
        <section>
          <SeccionHeader
            icon={<Zap size={17} />}
            titulo="Historias"
            cantidad={historias.length}
            tono="peach"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {historias.map((h) => (
              <HistoriaCard key={h.id} post={h} onOpen={() => setSelected(h.id)} />
            ))}
          </div>
        </section>
      )}

      <PostDetail postId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function SeccionHeader({
  icon,
  titulo,
  cantidad,
  tono,
}: {
  icon: React.ReactNode;
  titulo: string;
  cantidad: number;
  tono: 'brand' | 'peach';
}) {
  const cls =
    tono === 'brand' ? 'bg-brand-100 text-brand-800' : 'bg-peach-100 text-peach-600';
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className={`grid h-9 w-9 place-items-center rounded-xl ${cls}`}>{icon}</span>
      <h3 className="text-base font-bold text-ink-900">{titulo}</h3>
      <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-500">
        {cantidad}
      </span>
    </div>
  );
}

/* ---------------- Posteos y reels ---------------- */

function PosteoCard({ post, onOpen }: { post: Post; onOpen: () => void }) {
  const abiertos = post.comments.filter((c) => !c.resolved).length;
  const planificando = enPlanificacion(post);

  return (
    <div className="card overflow-hidden md:flex">
      {/* Izquierda: la inspiración mientras se planifica, la pieza cuando está lista */}
      {planificando ? (
        <div className="flex w-full flex-col justify-center gap-2 bg-peach-50 p-4 md:w-56 md:shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-peach-600">
            <Sparkle size={13} /> Inspiración
          </div>
          {post.inspiracion ? (
            <p className="whitespace-pre-line text-xs leading-relaxed text-ink-600">
              {post.inspiracion}
            </p>
          ) : (
            <p className="text-xs text-ink-400">Todavía sin referencia cargada.</p>
          )}
          {post.inspiracionUrl && (
            <a
              href={post.inspiracionUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-800 underline underline-offset-2"
            >
              <LinkIcon size={12} /> Ver referencia
            </a>
          )}
          <p className="mt-1 text-[11px] text-ink-400">
            La pieza gráfica se produce una vez aprobada la idea.
          </p>
        </div>
      ) : (
        <MediaThumb
          src={post.mediaUrl}
          kind={post.mediaKind}
          label={`${typeEmoji[post.type]} ${typeLabel[post.type]}`}
          className="aspect-[4/3] w-full md:aspect-auto md:w-56 md:shrink-0"
        />
      )}

      <div className="flex-1 p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className={`chip ${statusChip[post.status]}`}>{statusLabel[post.status]}</span>
          {planificando && (
            <span className="chip bg-peach-100 text-peach-600">En planificación</span>
          )}
          <span className="text-xs text-ink-400">
            {fmt(post.date, 'EEE d')} · {fmtTime(post.date)} h
          </span>
          <h4 className="w-full text-base font-bold text-ink-900">{post.title}</h4>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Bloque
            icon={<Lightbulb size={13} />}
            color="text-butter-600"
            label="Idea general"
            text={post.ideaGeneral}
          />
          <Bloque
            icon={<Clapperboard size={13} />}
            color="text-sky-600"
            label={post.type === 'reel' ? 'Guion' : 'Contenido'}
            text={post.contenido}
          />
          <Bloque icon={<Type size={13} />} color="text-brand-700" label="Copy" text={post.copy} />
        </div>

        <button className="btn-soft mt-3 !py-1.5" onClick={onOpen}>
          <MessageSquare size={15} />
          {abiertos > 0 ? `${abiertos} comentario(s)` : 'Comentar / Aprobar'}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Historias ---------------- */

function HistoriaCard({ post, onOpen }: { post: Post; onOpen: () => void }) {
  const abiertos = post.comments.filter((c) => !c.resolved).length;
  const planificando = enPlanificacion(post);

  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-ink-200/70 px-3.5 py-2.5">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-peach-100 text-peach-600">
          <Zap size={14} />
        </span>
        <span className="text-xs font-semibold capitalize text-ink-700">
          {fmt(post.date, 'EEE d')} · {fmtTime(post.date)} h
        </span>
        <span className={`chip ml-auto ${statusChip[post.status]}`}>
          {statusLabel[post.status]}
        </span>
      </div>

      {/* Mientras se planifica va solo el texto y la idea; después, la pieza */}
      {planificando ? (
        <div className="flex-1 space-y-3 p-3.5">
          <h4 className="text-sm font-bold text-ink-900">{post.title}</h4>
          <div>
            <div className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-butter-600">
              <Lightbulb size={12} /> Idea
            </div>
            <p className="whitespace-pre-line text-xs text-ink-600">
              {post.ideaGeneral || <span className="text-ink-400">—</span>}
            </p>
          </div>
          <div>
            <div className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-sky-600">
              <Type size={12} /> Texto
            </div>
            <p className="whitespace-pre-line text-xs text-ink-600">
              {post.contenido || post.copy || <span className="text-ink-400">—</span>}
            </p>
          </div>
          <p className="text-[11px] text-ink-400">
            La placa se diseña una vez aprobada.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 gap-3 p-3.5">
          <MediaThumb
            src={post.mediaUrl}
            kind={post.mediaKind}
            className="aspect-[9/16] w-20 shrink-0 rounded-lg"
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-ink-900">{post.title}</h4>
            <p className="mt-1 line-clamp-5 whitespace-pre-line text-xs text-ink-600">
              {post.contenido || post.copy}
            </p>
          </div>
        </div>
      )}

      <div className="px-3.5 pb-3.5">
        <button className="btn-soft w-full !py-1.5" onClick={onOpen}>
          <MessageSquare size={14} />
          {abiertos > 0 ? `${abiertos} comentario(s)` : 'Comentar / Aprobar'}
        </button>
      </div>
    </div>
  );
}

function Bloque({
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
      <div
        className={`mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide ${color}`}
      >
        {icon} {label}
      </div>
      <p className="line-clamp-4 whitespace-pre-line text-xs text-ink-600">
        {text || <span className="text-ink-300">—</span>}
      </p>
    </div>
  );
}
