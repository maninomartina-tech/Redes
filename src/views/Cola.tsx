import { CalendarClock, CheckCircle2, Inbox, Plus, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useStore, useCurrentClient } from '@/store/useStore';
import type { Post } from '@/types';
import { fmt, fmtTime } from '@/lib/date';
import { useHoy } from '@/lib/hoy';
import { armarCola, nombreDelDia, type DiaDeLaCola } from '@/lib/cola';
import { statusChip, statusCorto, typeEmoji, typeLabel, llevaCartelito } from '@/lib/format';
import { portadaDelFeed } from '@/lib/piezas';
import { EmptyState, MediaThumb, SectionTitle } from '@/components/ui';
import AddContentButton, { NewContentModal } from '@/components/AddContentButton';
import PostDetail from '@/components/PostDetail';
import ConfirmarPublicado from '@/components/ConfirmarPublicado';
import SolapasDePublicacion from '@/components/SolapasDePublicacion';
import { FiltroDeTipo, filtrarPorTipo, type FiltroTipo } from '@/components/Solapas';

// ---------------------------------------------------------------------------
// La cola.
//
// Lo que falta publicar, día por día, de lo más cercano a lo más lejano. Es la
// forma en que lo mira Buffer y resuelve una pregunta que el calendario no
// contesta bien: no "cómo viene el mes" sino "qué sale ahora".
//
// Arriba va lo que se pasó de hora, que es lo único que no puede esperar.
// ---------------------------------------------------------------------------

export default function Cola() {
  const posts = useStore((s) => s.posts);
  const currentClientId = useStore((s) => s.currentClientId);
  const client = useCurrentClient();

  const hoy = useHoy();
  const [selected, setSelected] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroTipo>('todo');
  const [creandoEn, setCreandoEn] = useState<string | null>(null);
  const [publicando, setPublicando] = useState<Post | null>(null);

  const suyos = useMemo(
    () => posts.filter((p) => p.clientId === currentClientId),
    [posts, currentClientId]
  );
  const visibles = useMemo(() => filtrarPorTipo(suyos, filtro), [suyos, filtro]);
  const cola = useMemo(() => armarCola(visibles, hoy), [visibles, hoy]);

  return (
    <div>
      <SectionTitle
        title="Cola"
        subtitle={
          cola.cuantas > 0
            ? `${cola.cuantas} ${cola.cuantas === 1 ? 'pieza' : 'piezas'} esperando en ${client.name}`
            : `Nada esperando en ${client.name}`
        }
        action={<AddContentButton onCreated={setSelected} />}
      />

      <SolapasDePublicacion />

      <div className="mb-4">
        <FiltroDeTipo valor={filtro} onChange={setFiltro} posts={suyos} />
      </div>

      {cola.cuantas === 0 ? (
        <EmptyState
          icon={<Inbox size={30} />}
          title="La cola está vacía"
          hint="Cuando agregues contenido con su fecha, va a aparecer acá ordenado por día."
          action={<AddContentButton onCreated={setSelected} />}
        />
      ) : (
        <div className="space-y-5">
          {cola.atrasados.length > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-2">
                <TriangleAlert size={15} className="text-butter-600" />
                <h3 className="text-sm font-bold text-butter-700">Se pasó de hora</h3>
                <span className="text-xs text-ink-400">{cola.atrasados.length}</span>
              </div>
              <div className="card divide-y divide-ink-200/70 overflow-hidden">
                {cola.atrasados.map((p) => (
                  <Renglon
                    key={p.id}
                    post={p}
                    onAbrir={() => setSelected(p.id)}
                    onPublicado={() => setPublicando(p)}
                    atrasado
                  />
                ))}
              </div>
            </section>
          )}

          {cola.dias.map((d) => (
            <Dia
              key={d.dia.toISOString()}
              dia={d}
              hoy={hoy}
              onAbrir={setSelected}
              onPublicado={setPublicando}
              onAgregar={() => {
                const cuando = new Date(d.dia);
                cuando.setHours(12, 0, 0, 0);
                setCreandoEn(cuando.toISOString());
              }}
            />
          ))}
        </div>
      )}

      <NewContentModal
        open={creandoEn !== null}
        onClose={() => setCreandoEn(null)}
        onCreated={setSelected}
        defaultDate={creandoEn ?? undefined}
      />
      <ConfirmarPublicado post={publicando} onClose={() => setPublicando(null)} />
      <PostDetail postId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function Dia({
  dia,
  hoy,
  onAbrir,
  onPublicado,
  onAgregar,
}: {
  dia: DiaDeLaCola;
  hoy: Date;
  onAbrir: (id: string) => void;
  onPublicado: (post: Post) => void;
  onAgregar: () => void;
}) {
  const como = nombreDelDia(dia.dia, hoy);
  const titulo =
    como === 'hoy' ? 'Hoy' : como === 'manana' ? 'Mañana' : fmt(dia.dia.toISOString(), 'EEEE');

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-bold capitalize text-ink-800">{titulo}</h3>
        <span className="text-xs text-ink-400">{fmt(dia.dia.toISOString(), "d 'de' MMMM")}</span>
        <button
          className="btn-ghost ml-auto !px-2 !py-1 text-xs"
          onClick={onAgregar}
          title={`Agregar contenido el ${fmt(dia.dia.toISOString(), "d 'de' MMMM")}`}
        >
          <Plus size={14} /> Agregar
        </button>
      </div>

      <div className="card divide-y divide-ink-200/70 overflow-hidden">
        {dia.posts.map((p) => (
          <Renglon
            key={p.id}
            post={p}
            onAbrir={() => onAbrir(p.id)}
            onPublicado={() => onPublicado(p)}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * Una pieza en la cola.
 *
 * La hora manda a la izquierda, como en Buffer: lo que se busca al recorrer la
 * lista es a qué hora sale cada cosa.
 */
function Renglon({
  post,
  onAbrir,
  onPublicado,
  atrasado = false,
}: {
  post: Post;
  onAbrir: () => void;
  onPublicado: () => void;
  atrasado?: boolean;
}) {
  return (
    // Un `div` y no un `button`: adentro va el de "Publicado", y un botón
    // adentro de otro botón no es HTML válido ni se puede tocar bien.
    <div
      role="button"
      tabIndex={0}
      onClick={onAbrir}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onAbrir()}
      className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition hover:bg-ink-50 sm:px-4"
    >
      <span
        className={`w-14 shrink-0 text-sm font-semibold tabular-nums ${
          atrasado ? 'text-butter-700' : 'text-ink-700'
        }`}
      >
        {fmtTime(post.date)}
      </span>

      <MediaThumb
        src={post.mediaUrl}
        imageUrl={post.igImageUrl}
        media={portadaDelFeed(post)}
        kind={post.mediaKind}
        className="h-11 w-11 shrink-0 rounded-lg"
      />

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="shrink-0 text-sm" title={typeLabel[post.type]}>
            {typeEmoji[post.type]}
          </span>
          <span className="truncate text-sm font-semibold text-ink-900">{post.title}</span>
        </span>
        {/* `line-clamp` ya pone su propio `display`: agregarle `block` lo pisa
            y el copy entero se desarma en diez renglones en un teléfono. */}
        {post.copy.trim() && (
          <span className="mt-0.5 line-clamp-1 text-xs text-ink-500">{post.copy}</span>
        )}
      </span>

      {atrasado && (
        <span className="hidden shrink-0 items-center gap-1 text-xs text-butter-700 sm:flex">
          <CalendarClock size={13} />
          {fmt(post.date, 'd MMM')}
        </span>
      )}

      {llevaCartelito(post.status) && (
        <span className={`chip shrink-0 ${statusChip[post.status]}`}>
          {statusCorto[post.status]}
        </span>
      )}

      <button
        // En el teléfono queda solo el tilde, y un tilde de 24px no se puede
        // tocar: el mínimo cómodo son 44, que es lo que mide un dedo.
        className="btn-outline h-11 w-11 shrink-0 !px-0 text-xs sm:h-auto sm:w-auto sm:!px-2.5 sm:!py-1"
        title={`Marcar «${post.title}» como publicado`}
        onClick={(e) => {
          e.stopPropagation();
          onPublicado();
        }}
      >
        <CheckCircle2 size={14} />
        <span className="hidden sm:inline">Publicado</span>
      </button>
    </div>
  );
}
