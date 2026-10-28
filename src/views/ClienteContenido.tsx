import { Target } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useStore, useCurrentClient } from '@/store/useStore';
import { useHoy } from '@/lib/hoy';
import { claveDeMes, nombreDeMes, planDeCliente } from '@/lib/plan';
import AprobarTodo from '@/components/AprobarTodo';
import PlanCalendar from '@/components/PlanCalendar';
import PostDetail from '@/components/PostDetail';
import { FiltroDeTipo, filtrarPorTipo, type FiltroTipo } from '@/components/Solapas';

// ---------------------------------------------------------------------------
// Lo que ve el cliente de su contenido.
//
// Es el mismo calendario que usa ella —el mes o la semana, con el mismo filtro
// y las mismas cuentas— pero de solo lectura: acá no se arrastra nada ni se
// crea nada. Al tocar una pieza se abre con todo lo que tiene cargado, y ahí
// aprueba o pide cambios.
//
// Arriba van los objetivos del mes y lo que se va a desarrollar, que es lo que
// hace que el contenido de abajo se entienda. Del plan no le llega nada más
// —ni guiones ni copys sin aprobar—: eso aparece recién cuando ella lo pasa al
// calendario.
// ---------------------------------------------------------------------------

export default function ClienteContenido() {
  const posts = useStore((s) => s.posts);
  const client = useCurrentClient();
  const hoy = useHoy();

  const [elegido, setElegido] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroTipo>('todo');

  const suyos = useMemo(
    () =>
      posts
        .filter((p) => p.clientId === client.id)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [posts, client.id]
  );

  const visibles = useMemo(() => filtrarPorTipo(suyos, filtro), [suyos, filtro]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-ink-900 sm:text-lg">Tu contenido</h2>
        <p className="text-[13px] leading-snug text-ink-500 sm:text-sm">
          Esto es lo que se va a publicar. Revisalo y dejanos tus comentarios.
        </p>
      </div>

      <PlanDelMes clientId={client.id} mes={claveDeMes(hoy)} />

      <div className="flex flex-wrap items-center gap-2">
        <FiltroDeTipo valor={filtro} onChange={setFiltro} posts={suyos} />
        {/* Revisar de a uno está bien con dos; con las historias del mes es un
            peaje. El botón mira lo que se está viendo: filtrado a historias,
            aprueba las historias. */}
        <div className="w-full sm:ml-auto sm:w-auto">
          <AprobarTodo posts={visibles} />
        </div>
      </div>

      <PlanCalendar
        posts={visibles}
        destacarPosteos={filtro === 'todo'}
        onOpen={setElegido}
        soloLectura
      />

      <PostDetail postId={elegido} onClose={() => setElegido(null)} />
    </div>
  );
}

/** Los objetivos del mes y lo que se va a desarrollar. */
function PlanDelMes({ clientId, mes }: { clientId: string; mes: string }) {
  const planes = useStore((s) => s.planes);
  const plan = planDeCliente(planes, clientId, mes);

  const objetivos = plan?.objetivos?.trim();
  const desarrollo = plan?.plan?.trim();
  if (!objetivos && !desarrollo) return null;

  return (
    <div className="card border-brand-200 bg-gradient-to-br from-brand-50 to-peach-50 p-4 sm:p-5">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-700">
        <Target size={13} /> El plan de {nombreDeMes(mes)}
      </p>

      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {objetivos && (
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              Objetivos
            </p>
            <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-ink-700">
              {objetivos}
            </p>
          </div>
        )}
        {desarrollo && (
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              Qué se va a desarrollar
            </p>
            <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-ink-700">
              {desarrollo}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
