import {
  CalendarDays,
  CalendarRange,
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
import { useMemo, useState } from 'react';
import { useStore, useCurrentClient } from '@/store/useStore';
import type { Post } from '@/types';
import { addDays, fmt, fmtTime, isSameDay, weekDays } from '@/lib/date';
import { useAncla } from '@/lib/hoy';
import { statusChip, statusLabel, typeEmoji, typeLabel } from '@/lib/format';
import { piezasFinales, portadaDelFeed } from '@/lib/piezas';
import { plural } from '@/lib/texto';
import AprobarTodo from '@/components/AprobarTodo';
import PlanCalendar from '@/components/PlanCalendar';
import PostDetail from '@/components/PostDetail';
import {
  FiltroDeTipo,
  GrupoDeSolapas,
  Solapa,
  filtrarPorTipo,
  type FiltroTipo,
} from '@/components/Solapas';
import { MediaPreview } from '@/components/MediaUploader';
import { EmptyState } from '@/components/ui';

/**
 * El cliente ve la pieza final apenas existe. Mientras no esté, ve de dónde
 * nace la publicación (posteos) o el texto y la idea (historias).
 */
function tieneResultado(post: Post): boolean {
  return !!post.resultado;
}

/** Las dos formas de mirarlo, las mismas que del lado de la creadora. */
type Vista = 'calendario' | 'semana';

export default function ClientWeek() {
  const posts = useStore((s) => s.posts);
  const client = useCurrentClient();
  // Igual que del lado de ella: al cambiar el día vuelve a la semana de hoy.
  const { hoy, ancla: anchor, setAncla: setAnchor } = useAncla((d) => d);
  const [selected, setSelected] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>('calendario');
  const [filtro, setFiltro] = useState<FiltroTipo>('todo');

  const suyos = useMemo(
    () =>
      posts
        .filter((p) => p.clientId === client.id)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [posts, client.id]
  );
  const visibles = useMemo(() => filtrarPorTipo(suyos, filtro), [suyos, filtro]);

  // Los posteos se destacan solo mezclados con las historias.
  const destacarPosteos = filtro === 'todo';

  const days = weekDays(anchor);
  const deLaSemana = visibles.filter((p) =>
    days.some((d) => isSameDay(new Date(p.date), d))
  );

  /** La semana más cercana, hacia adelante, que sí tiene algo cargado. */
  const proxima = useMemo(() => {
    if (deLaSemana.length > 0) return null;
    const futuros = visibles.filter((p) => new Date(p.date) > days[6]);
    return futuros.length ? new Date(futuros[0].date) : null;
  }, [visibles, deLaSemana.length, days]);

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
          <h2 className="text-lg font-bold text-ink-900">Tu contenido</h2>
          <p className="text-sm text-ink-500">
            Esto es lo que se va a publicar. Revisalo y dejanos tus comentarios.
          </p>
        </div>
        {vista === 'semana' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="btn-ghost px-2"
              aria-label="Semana anterior"
              onClick={() => setAnchor((a) => addDays(a, -7))}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold capitalize text-ink-700">
              {fmt(days[0].toISOString(), 'd MMM')} – {fmt(days[6].toISOString(), 'd MMM')}
            </span>
            <button
              className="btn-ghost px-2"
              aria-label="Semana siguiente"
              onClick={() => setAnchor((a) => addDays(a, 7))}
            >
              <ChevronRight size={18} />
            </button>
            <button className="btn-outline !py-1.5" onClick={() => setAnchor(hoy)}>
              Hoy
            </button>
          </div>
        )}
      </div>

      {/* Las mismas solapas que ve la creadora. Lo que cambia es la segunda:
          a ella le sirve el estado de producción, al cliente su semana. */}
      <div className="flex flex-wrap items-center gap-2">
        <GrupoDeSolapas>
          <Solapa activa={vista === 'calendario'} onClick={() => setVista('calendario')}>
            <CalendarDays size={15} /> Calendario
          </Solapa>
          <Solapa activa={vista === 'semana'} onClick={() => setVista('semana')}>
            <CalendarRange size={15} /> Semana
          </Solapa>
        </GrupoDeSolapas>

        <FiltroDeTipo valor={filtro} onChange={setFiltro} posts={suyos} />

        {/* Revisar de a uno está bien con dos; con las historias del mes es un
            peaje. El botón mira lo que se está viendo: filtrado a historias,
            aprueba las historias. */}
        <div className="w-full sm:ml-auto sm:w-auto">
          <AprobarTodo posts={visibles} />
        </div>
      </div>

      {vista === 'calendario' && (
        <PlanCalendar
          posts={visibles}
          destacarPosteos={destacarPosteos}
          onOpen={setSelected}
          soloLectura
        />
      )}

      {vista === 'semana' && deLaSemana.length === 0 && (
        <EmptyState
          title="No hay contenido para esta semana"
          hint={
            proxima
              ? 'Está planificado para más adelante.'
              : 'Cuando esté listo el contenido de estos días, lo vas a ver acá con su idea, su texto y la pieza final.'
          }
          action={
            proxima && (
              <button className="btn-primary" onClick={() => setAnchor(proxima)}>
                Ver la semana del {fmt(proxima.toISOString(), "d 'de' MMMM")}
                <ChevronRight size={16} />
              </button>
            )
          }
        />
      )}

      {vista === 'semana' && posteos.length > 0 && (
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

      {vista === 'semana' && historias.length > 0 && (
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
  const cls = tono === 'brand' ? 'bg-brand-100 text-brand-800' : 'bg-peach-100 text-peach-600';
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

/** Panel de inspiración: se muestra mientras no hay pieza final. */
function PanelInspiracion({ post, className = '' }: { post: Post; className?: string }) {
  const refs = post.inspiracionMedia ?? [];
  return (
    <div className={`flex flex-col gap-2 bg-peach-50 p-4 ${className}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-peach-600">
        <Sparkle size={13} /> Inspiración
      </div>

      {refs.length > 0 && (
        <div className={`grid gap-1.5 ${refs.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {refs.slice(0, 4).map((m) => (
            <MediaPreview key={m.id} media={m} className="aspect-square" />
          ))}
        </div>
      )}

      {post.inspiracion ? (
        <p className="whitespace-pre-line text-xs leading-relaxed text-ink-600">
          {post.inspiracion}
        </p>
      ) : (
        refs.length === 0 && (
          <p className="text-xs text-ink-400">Todavía sin referencia cargada.</p>
        )
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

      <p className="mt-auto pt-1 text-[11px] text-ink-400">
        La pieza final se sube cuando esté lista.
      </p>
    </div>
  );
}

function PosteoCard({ post, onOpen }: { post: Post; onOpen: () => void }) {
  const abiertos = post.comments.filter((c) => !c.resolved).length;
  const listo = tieneResultado(post);

  return (
    <div className="card overflow-hidden md:flex">
      {listo ? (
        <div className="relative w-full md:w-56 md:shrink-0">
          <MediaPreview
            media={portadaDelFeed(post)!}
            className="aspect-[4/5] w-full md:h-full md:rounded-none"
          />
          {piezasFinales(post).length > 1 && (
            <span className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-ink-900/60 px-1.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
              <Images size={12} /> {piezasFinales(post).length}
            </span>
          )}
        </div>
      ) : (
        <PanelInspiracion
          post={post}
          className="order-last w-full justify-center md:order-first md:w-56 md:shrink-0"
        />
      )}

      <div className="flex-1 p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className={`chip ${statusChip[post.status]}`}>{statusLabel[post.status]}</span>
          {listo && <span className="chip bg-mint-100 text-mint-600">Pieza lista</span>}
          <span className="text-xs text-ink-400">
            {typeEmoji[post.type]} {typeLabel[post.type]} · {fmt(post.date, 'EEE d')} ·{' '}
            {fmtTime(post.date)} h
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

        <AccionCliente post={post} abiertos={abiertos} onOpen={onOpen} className="mt-3" />
      </div>
    </div>
  );
}

function HistoriaCard({ post, onOpen }: { post: Post; onOpen: () => void }) {
  const abiertos = post.comments.filter((c) => !c.resolved).length;
  const listo = tieneResultado(post);

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

      {listo ? (
        <div className="flex flex-1 gap-3 p-3.5">
          <MediaPreview
            media={portadaDelFeed(post)!}
            className="aspect-[9/16] w-20 shrink-0 rounded-lg"
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-ink-900">{post.title}</h4>
            <p className="mt-1 line-clamp-5 whitespace-pre-line text-xs text-ink-600">
              {post.contenido || post.copy}
            </p>
          </div>
        </div>
      ) : (
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
          <p className="text-[11px] text-ink-400">La placa se diseña cuando esté aprobada.</p>
        </div>
      )}

      <div className="px-3.5 pb-3.5">
        <AccionCliente post={post} abiertos={abiertos} onOpen={onOpen} ancho />
      </div>
    </div>
  );
}

/**
 * El botón de cada pieza.
 *
 * Cuando está esperando su respuesta, se ve como la acción principal: era al
 * revés, la pieza que había que aprobar mostraba el número de comentarios y
 * quedaba más apagada que las que no requerían nada.
 */
function AccionCliente({
  post,
  abiertos,
  onOpen,
  ancho = false,
  className = '',
}: {
  post: Post;
  abiertos: number;
  onOpen: () => void;
  ancho?: boolean;
  className?: string;
}) {
  const esperaRespuesta = post.status === 'revision';

  return (
    <button
      onClick={onOpen}
      className={`${esperaRespuesta ? 'btn-primary' : 'btn-soft'} !py-1.5 ${
        ancho ? 'w-full' : ''
      } ${className}`}
    >
      <MessageSquare size={15} />
      {esperaRespuesta ? 'Revisar y aprobar' : 'Dejar un comentario'}
      {abiertos > 0 && (
        <span
          className={`ml-0.5 rounded-full px-1.5 text-[11px] font-bold ${
            esperaRespuesta ? 'bg-canvas/25' : 'bg-brand-200 text-brand-900'
          }`}
          title={plural(abiertos, 'comentario sin resolver', 'comentarios sin resolver')}
        >
          {abiertos}
        </span>
      )}
    </button>
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
