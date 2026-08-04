import { RotateCcw, TriangleAlert, X } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { fmtDateTime } from '@/lib/date';

/**
 * "Lo que llegó del servidor tiene menos de lo que había acá."
 *
 * Aparece solo cuando pasó de verdad, y no se va sola: es el único momento en
 * que se puede recuperar el trabajo, así que no puede quedar escondida atrás
 * de un menú ni desaparecer a los tres segundos.
 */
export default function Rescate() {
  const rescate = useStore((s) => s.rescate);
  const recuperar = useStore((s) => s.recuperarRescate);
  const descartar = useStore((s) => s.descartarRescate);
  const [trabajando, setTrabajando] = useState(false);

  if (!rescate) return null;

  return (
    <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-amber-900">
            Lo que trajo el servidor tiene menos de lo que había en este dispositivo
          </p>
          <p className="mt-1 text-sm leading-snug text-amber-800">
            Antes de reemplazarlo se guardó una copia de lo que tenías acá:{' '}
            <b>
              {rescate.clientes} cuenta{rescate.clientes === 1 ? '' : 's'} y {rescate.posts}{' '}
              contenido{rescate.posts === 1 ? '' : 's'}
            </b>
            , del {fmtDateTime(rescate.cuando)}. Si te falta algo, recuperala: vuelve a este
            dispositivo y se sube al servidor para que no se pierda de nuevo.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="btn-primary !py-1.5 text-sm"
              disabled={trabajando}
              onClick={async () => {
                setTrabajando(true);
                await recuperar();
                setTrabajando(false);
              }}
            >
              <RotateCcw size={15} />
              {trabajando ? 'Recuperando…' : 'Recuperar lo que tenía'}
            </button>
            <button className="btn-ghost !py-1.5 text-sm" onClick={descartar}>
              Está bien así
            </button>
          </div>
        </div>
        <button
          className="shrink-0 rounded-lg p-1 text-amber-500 hover:bg-amber-100"
          aria-label="Cerrar el aviso"
          onClick={descartar}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
