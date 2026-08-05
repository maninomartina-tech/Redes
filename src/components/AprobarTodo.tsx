import { CheckCheck, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import type { Post } from '@/types';
import { esHistoria, typeEmoji } from '@/lib/format';
import { fmtDateTime } from '@/lib/date';
import { plural } from '@/lib/texto';
import { Modal } from '@/components/ui';

// ---------------------------------------------------------------------------
// "Aprobar todo".
//
// Revisar de a uno está bien cuando hay dos. Con las historias del mes son
// veinte, y ese peaje termina en que el cliente no revisa nada y el contenido
// se atrasa igual.
//
// Aprobar en tanda no es aprobar a ciegas: antes se muestra la lista completa
// de lo que se va a aprobar. Y lo que ya tiene un comentario sin resolver queda
// afuera, porque ahí el cliente pidió algo y todavía no se lo resolvieron:
// aprobarlo de paso sería tapar su propio reclamo.
// ---------------------------------------------------------------------------

export default function AprobarTodo({ posts }: { posts: Post[] }) {
  const aprobarTodoDelPortal = useStore((s) => s.aprobarTodoDelPortal);
  const [abierto, setAbierto] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { listos, conPendientes } = useMemo(() => {
    const esperando = posts.filter((p) => p.status === 'revision');
    return {
      listos: esperando.filter((p) => !p.comments.some((c) => !c.resolved)),
      conPendientes: esperando.filter((p) => p.comments.some((c) => !c.resolved)),
    };
  }, [posts]);

  if (listos.length === 0) return null;

  const aprobar = async () => {
    setTrabajando(true);
    setError(null);
    const problema = await aprobarTodoDelPortal(listos.map((p) => p.id));
    setTrabajando(false);
    if (problema) setError(problema);
    else setAbierto(false);
  };

  return (
    <>
      <button className="btn-primary w-full sm:w-auto" onClick={() => setAbierto(true)}>
        <CheckCheck size={16} />
        Aprobar todo ({listos.length})
      </button>

      <Modal open={abierto} onClose={() => setAbierto(false)} title="Aprobar todo">
        <div className="space-y-4 p-5">
          <p className="text-sm leading-snug text-ink-600">
            Vas a aprobar {plural(listos.length, 'contenido', 'contenidos')} de una vez. Lo
            que todavía no tenga la pieza terminada pasa a producción; lo que ya la tiene
            queda listo para publicarse.
          </p>

          <ul className="max-h-64 space-y-1.5 overflow-y-auto rounded-xl bg-ink-50 p-3">
            {listos.map((p) => (
              <li key={p.id} className="flex items-start gap-2 text-[13px] text-ink-700">
                <span className="shrink-0">{typeEmoji[p.type]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-ink-800">{p.title}</span>
                  <span className="block text-[11px] text-ink-400">
                    {esHistoria(p.type) ? 'Historia' : 'Posteo'} · {fmtDateTime(p.date)}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {conPendientes.length > 0 && (
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-[13px] leading-snug text-amber-800">
              <TriangleAlert size={15} className="mt-px shrink-0" />
              <span>
                {plural(conPendientes.length, 'contenido queda', 'contenidos quedan')} afuera
                porque {conPendientes.length === 1 ? 'tiene' : 'tienen'} un comentario tuyo sin
                resolver. {conPendientes.length === 1 ? 'Ese lo revisás' : 'Esos los revisás'}{' '}
                aparte.
              </span>
            </p>
          )}

          {error && (
            <p className="rounded-xl bg-rose-50 p-3 text-[13px] leading-snug text-rose-700">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-ink-200/70 pt-4 sm:flex-row sm:justify-end">
            <button className="btn-ghost" onClick={() => setAbierto(false)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={() => void aprobar()} disabled={trabajando}>
              <CheckCheck size={16} />
              {trabajando ? 'Aprobando…' : `Sí, aprobar ${listos.length}`}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
