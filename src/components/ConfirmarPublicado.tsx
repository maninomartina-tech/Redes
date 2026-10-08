import { CheckCircle2, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { Post } from '@/types';
import { fmt } from '@/lib/date';
import { Modal } from '@/components/ui';

// ---------------------------------------------------------------------------
// "Ya lo publiqué".
//
// Vive acá y no en una pantalla porque el botón está en varios lados —en la
// cola, adentro del contenido, en "Para publicar"— y lo que no puede pasar es
// que marcar una pieza como publicada haga una cosa en un lugar y otra en
// otro: lo que se decide acá es la fecha con la que queda, que es la que
// después usan las métricas y el informe.
// ---------------------------------------------------------------------------

/** Deja constancia de que la pieza ya salió, con su link si lo tenés a mano. */
export default function ConfirmarPublicado({
  post,
  onClose,
}: {
  post: Post | null;
  onClose: () => void;
}) {

  const marcarPublicado = useStore((s) => s.marcarPublicado);
  const [permalink, setPermalink] = useState('');
  const [ahora, setAhora] = useState(true);

  if (!post) return null;

  const confirmar = () => {
    marcarPublicado(post.id, {
      fecha: ahora ? new Date().toISOString() : post.date,
      permalink: permalink.trim() || undefined,
    });
    setPermalink('');
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Ya lo publiqué">
      <div className="space-y-4 p-5">
        <p className="text-sm leading-snug text-ink-600">
          <b>{post.title}</b> pasa a publicado. Tu cliente lo va a ver como salido
          y vas a poder cargarle las métricas cuando las tengas.
        </p>

        <label className="flex items-start gap-2.5 rounded-xl bg-ink-50 p-3 text-sm">
          <input
            type="checkbox"
            checked={ahora}
            onChange={(e) => setAhora(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-ink-700">
            Se subió recién
            <span className="block text-[11px] leading-snug text-ink-500">
              Si lo subiste antes, destildá esto y queda con la fecha que tenía
              planificada ({fmt(post.date, "d 'de' MMMM 'a las' HH:mm")}).
            </span>
          </span>
        </label>

        <div>
          <label className="label" htmlFor="permalink">
            Link de la publicación (opcional)
          </label>
          <div className="relative mt-1">
            <ExternalLink
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <input
              id="permalink"
              className="input pl-9"
              placeholder="https://www.instagram.com/p/..."
              value={permalink}
              onChange={(e) => setPermalink(e.target.value)}
            />
          </div>
          <p className="mt-1 text-[11px] text-ink-400">
            Sirve para abrirla rápido cuando vayas a copiar los números.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-ink-200/70 pt-4">
          <button className="btn-outline" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={confirmar}>
            <CheckCircle2 size={16} /> Marcar como publicado
          </button>
        </div>
      </div>
    </Modal>
  );
}
