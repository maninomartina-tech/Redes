import { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import AddContentButton, { NewContentModal } from '@/components/AddContentButton';
import PlanCalendar from '@/components/PlanCalendar';
import PostDetail from '@/components/PostDetail';
import { SectionTitle } from '@/components/ui';
import { FiltroDeTipo, filtrarPorTipo, type FiltroTipo } from '@/components/Solapas';

// ---------------------------------------------------------------------------
// El calendario: lo que sale y cuándo.
//
// Es la pantalla del día a día. El contenido se piensa en Planificación y se
// pasa acá; acá se produce pieza por pieza —archivos, comentarios, estado— y
// se marca lo que ya salió.
// ---------------------------------------------------------------------------

export default function Calendario() {
  const posts = useStore((s) => s.posts);
  const currentClientId = useStore((s) => s.currentClientId);
  const updatePost = useStore((s) => s.updatePost);
  const marcarPublicado = useStore((s) => s.marcarPublicado);

  const [filtro, setFiltro] = useState<FiltroTipo>('todo');
  const [elegido, setElegido] = useState<string | null>(null);
  const [fechaNueva, setFechaNueva] = useState<string | undefined>();
  const [creando, setCreando] = useState(false);

  const suyos = useMemo(
    () =>
      posts
        .filter((p) => p.clientId === currentClientId)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [posts, currentClientId]
  );

  const visibles = useMemo(() => filtrarPorTipo(suyos, filtro), [suyos, filtro]);

  // Los posteos se destacan solo cuando están mezclados con las historias:
  // atenuar historias en una pantalla que solo tiene historias no dice nada.
  const destacarPosteos = filtro === 'todo';

  return (
    <div>
      <SectionTitle
        title="Calendario"
        subtitle="Qué sale cada día."
        soloEnEscritorio="Arrastrá una pieza a otro día, o cambiale la fecha desde adentro del contenido."
        action={<AddContentButton onCreated={setElegido} />}
      />

      <div className="mb-4">
        <FiltroDeTipo valor={filtro} onChange={setFiltro} posts={suyos} />
      </div>

      <PlanCalendar
        posts={visibles}
        destacarPosteos={destacarPosteos}
        onOpen={setElegido}
        onMove={(id, iso) => updatePost(id, { date: iso })}
        onPublicado={(id) => marcarPublicado(id)}
        onCreate={(iso) => {
          setFechaNueva(iso);
          setCreando(true);
        }}
      />

      <NewContentModal
        open={creando}
        onClose={() => setCreando(false)}
        onCreated={setElegido}
        defaultDate={fechaNueva}
      />
      <PostDetail postId={elegido} onClose={() => setElegido(null)} />
    </div>
  );
}
