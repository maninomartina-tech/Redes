import { CalendarDays, Columns3, Images, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import type { Post } from '@/types';
import { esHistoria, etapasDePlan, statusDot, statusLabel } from '@/lib/format';
import AddContentButton, { NewContentModal } from '@/components/AddContentButton';
import PlanCalendar from '@/components/PlanCalendar';
import PostCard from '@/components/PostCard';
import PostDetail from '@/components/PostDetail';
import { SectionTitle } from '@/components/ui';

// ---------------------------------------------------------------------------
// Planificación: el mes entero de un cliente.
//
// Son dos maneras de mirar lo mismo. El calendario responde "¿qué sale y
// cuándo?", que es lo que ella le muestra al cliente; las etapas responden
// "¿qué me falta hacer?". Por eso arranca en el calendario.
// ---------------------------------------------------------------------------

type Vista = 'calendario' | 'etapas';

/**
 * Qué se está mirando.
 *
 * Un posteo y una historia son dos trabajos distintos —uno queda en el perfil,
 * la otra dura un día— y casi nunca se resuelven juntos. Poder aislar uno de
 * los dos es la diferencia entre revisar el mes y buscar entre el ruido.
 */
type Filtro = 'todo' | 'posteos' | 'historias';

export default function PlanningBoard() {
  const posts = useStore((s) => s.posts);
  const currentClientId = useStore((s) => s.currentClientId);
  const updatePost = useStore((s) => s.updatePost);

  const [vista, setVista] = useState<Vista>('calendario');
  const [filtro, setFiltro] = useState<Filtro>('todo');
  const [selected, setSelected] = useState<string | null>(null);
  const [fechaNueva, setFechaNueva] = useState<string | undefined>();
  const [creando, setCreando] = useState(false);

  const clientPosts = useMemo(
    () =>
      posts
        .filter((p) => p.clientId === currentClientId)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [posts, currentClientId]
  );

  const cuantas = useMemo(() => {
    const historias = clientPosts.filter((p) => esHistoria(p.type)).length;
    return { todo: clientPosts.length, historias, posteos: clientPosts.length - historias };
  }, [clientPosts]);

  const visibles = useMemo(() => {
    if (filtro === 'todo') return clientPosts;
    const quiereHistorias = filtro === 'historias';
    return clientPosts.filter((p) => esHistoria(p.type) === quiereHistorias);
  }, [clientPosts, filtro]);

  // Los posteos se destacan solo cuando están mezclados con las historias:
  // atenuar historias en una pantalla que solo tiene historias no dice nada.
  const destacarPosteos = filtro === 'todo';

  return (
    <div>
      <SectionTitle
        title="Planificación"
        subtitle="El mes completo, día por día. Arrastrá una pieza a otro día, o cambiale la fecha desde adentro del contenido."
        action={<AddContentButton onCreated={setSelected} />}
      />

      {/* Cómo mirarlo, y qué mirar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-ink-200 bg-surface p-1">
          <Solapa activa={vista === 'calendario'} onClick={() => setVista('calendario')}>
            <CalendarDays size={15} /> Calendario
          </Solapa>
          <Solapa activa={vista === 'etapas'} onClick={() => setVista('etapas')}>
            <Columns3 size={15} /> Etapas
          </Solapa>
        </div>

        <div
          role="group"
          aria-label="Qué contenido mostrar"
          className="inline-flex rounded-xl border border-ink-200 bg-surface p-1"
        >
          <Solapa activa={filtro === 'todo'} onClick={() => setFiltro('todo')}>
            Todo <Cuenta n={cuantas.todo} activa={filtro === 'todo'} />
          </Solapa>
          <Solapa activa={filtro === 'posteos'} onClick={() => setFiltro('posteos')}>
            <Images size={15} /> Posteos <Cuenta n={cuantas.posteos} activa={filtro === 'posteos'} />
          </Solapa>
          <Solapa activa={filtro === 'historias'} onClick={() => setFiltro('historias')}>
            <Zap size={15} /> Historias{' '}
            <Cuenta n={cuantas.historias} activa={filtro === 'historias'} />
          </Solapa>
        </div>
      </div>

      {vista === 'calendario' ? (
        <PlanCalendar
          posts={visibles}
          destacarPosteos={destacarPosteos}
          onOpen={setSelected}
          onMove={(id, iso) => updatePost(id, { date: iso })}
          onCreate={(iso) => {
            setFechaNueva(iso);
            setCreando(true);
          }}
        />
      ) : (
        <Etapas posts={visibles} onOpen={setSelected} destacarPosteos={destacarPosteos} />
      )}

      <NewContentModal
        open={creando}
        onClose={() => setCreando(false)}
        onCreated={setSelected}
        defaultDate={fechaNueva}
      />
      <PostDetail postId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

/** El número al lado de cada solapa: cuánto hay de eso. */
function Cuenta({ n, activa }: { n: number; activa: boolean }) {
  return (
    <span
      className={`rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
        activa ? 'bg-brand-200/70 text-brand-800' : 'bg-ink-100 text-ink-500'
      }`}
    >
      {n}
    </span>
  );
}

function Solapa({
  activa,
  onClick,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
        activa ? 'bg-brand-100 text-brand-800' : 'text-ink-500 hover:text-ink-800'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Las tres etapas del circuito, más una columna con lo que ya salió: no es una
 * etapa, pero tampoco tiene que desaparecer de la vista.
 */
function Etapas({
  posts,
  onOpen,
  destacarPosteos,
}: {
  posts: Post[];
  onOpen: (id: string) => void;
  destacarPosteos: boolean;
}) {
  const yaSalio = posts.filter((p) => p.status === 'programado' || p.status === 'publicado');

  return (
    <div className="flex gap-4 overflow-x-auto pb-3">
      {etapasDePlan.map((st) => (
        <Columna
          key={st}
          titulo={statusLabel[st]}
          punto={statusDot[st]}
          items={posts.filter((p) => p.status === st)}
          onOpen={onOpen}
          destacarPosteos={destacarPosteos}
        />
      ))}
      <Columna
        titulo="Ya salió"
        punto={statusDot.publicado}
        items={yaSalio}
        onOpen={onOpen}
        destacarPosteos={destacarPosteos}
        vacio="Todavía no salió nada."
      />
    </div>
  );
}

function Columna({
  titulo,
  punto,
  items,
  onOpen,
  destacarPosteos,
  vacio = 'Sin contenido en esta etapa.',
}: {
  titulo: string;
  punto: string;
  items: Post[];
  onOpen: (id: string) => void;
  destacarPosteos: boolean;
  vacio?: string;
}) {
  return (
    <div className="w-72 shrink-0">
      <div className="mb-2.5 flex items-center gap-2 px-1">
        <span className={`h-2.5 w-2.5 rounded-full ${punto}`} />
        <span className="text-sm font-bold text-ink-800">{titulo}</span>
        <span className="ml-auto rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-500">
          {items.length}
        </span>
      </div>
      <div className="space-y-3 rounded-2xl bg-ink-100/50 p-2.5">
        {items.length === 0 && (
          <p className="px-1 py-6 text-center text-xs text-ink-400">{vacio}</p>
        )}
        {items.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            onClick={() => onOpen(p.id)}
            destacar={destacarPosteos}
          />
        ))}
      </div>
    </div>
  );
}
