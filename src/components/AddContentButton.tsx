import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import type { PostType } from '@/types';
import { typeEmoji, typeLabel } from '@/lib/format';
import { Modal } from '@/components/ui';

const types: PostType[] = ['post', 'reel', 'carrusel', 'historia'];
const gradients = [
  'linear-gradient(135deg,#DFB0A1,#F6E3DB)',
  'linear-gradient(135deg,#EDCDC1,#F3E7D5)',
  'linear-gradient(135deg,#C58E7E,#EDCDC1)',
];

/**
 * Modal de creación de contenido. Se usa desde el botón general y también
 * desde cada día del calendario, por eso vive separado del botón.
 */
export function NewContentModal({
  open,
  onClose,
  onCreated,
  defaultDate,
  defaultType = 'post',
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
  defaultDate?: string;
  defaultType?: PostType;
}) {
  const { addPost, currentClientId } = useStore();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<PostType>(defaultType);
  const [date, setDate] = useState('');

  // Cada vez que se abre, arranca limpio y con la fecha que corresponde.
  useEffect(() => {
    if (!open) return;
    setTitle('');
    setType(defaultType);
    setDate((defaultDate ?? new Date().toISOString()).slice(0, 16));
  }, [open, defaultDate, defaultType]);

  const create = () => {
    const post = addPost({
      clientId: currentClientId,
      title: title.trim() || 'Nuevo contenido',
      type,
      date: new Date(date).toISOString(),
      status: 'idea',
      mediaUrl: gradients[Math.floor(Math.random() * gradients.length)],
      mediaKind: type === 'reel' ? 'video' : 'image',
    });
    onClose();
    onCreated(post.id);
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo contenido">
      <div className="space-y-4 p-5">
        <div>
          <label className="label">Título</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
            placeholder="Ej: Reel de lanzamiento"
            className="input mt-1"
          />
        </div>
        <div>
          <label className="label">Formato</label>
          <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  type === t
                    ? 'border-brand-400 bg-brand-100 text-brand-800'
                    : 'border-ink-200 text-ink-600 hover:bg-ink-50'
                }`}
              >
                <div className="text-lg">{typeEmoji[t]}</div>
                {typeLabel[t]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Fecha y hora de publicación</label>
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input mt-1"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={create}>
            Crear y editar
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function AddContentButton({
  onCreated,
  defaultDate,
  defaultType = 'post',
  label = 'Nuevo contenido',
  variant = 'primary',
}: {
  onCreated: (id: string) => void;
  defaultDate?: string;
  defaultType?: PostType;
  label?: string;
  variant?: 'primary' | 'soft' | 'ghost';
}) {
  const [open, setOpen] = useState(false);
  const btnClass =
    variant === 'primary' ? 'btn-primary' : variant === 'soft' ? 'btn-soft' : 'btn-ghost';

  return (
    <>
      <button className={btnClass} onClick={() => setOpen(true)}>
        <Plus size={16} /> {label}
      </button>
      <NewContentModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={onCreated}
        defaultDate={defaultDate}
        defaultType={defaultType}
      />
    </>
  );
}
