import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Client, MediaRef } from '@/types';
import { useStore } from '@/store/useStore';
import { Modal, Toggle } from '@/components/ui';
import MediaUploader from '@/components/MediaUploader';

/** Colores sugeridos, en la misma familia cálida de la marca. */
const COLORES = ['#7A4A3F', '#A9713F', '#8A6865', '#4A1E1A', '#6B7F6E', '#5B6E8C', '#8C5B7A'];

const hoy = () => new Date().toISOString().slice(0, 10);

/**
 * Alta y edición de una cuenta de cliente.
 *
 * La fecha de inicio y los seguidores de ese día no son un adorno: son el
 * punto de partida contra el que se mide todo el crecimiento que mostrás.
 */
export default function ClientForm({
  open,
  onClose,
  cliente,
}: {
  open: boolean;
  onClose: () => void;
  /** Si viene, se edita; si no, es un alta. */
  cliente?: Client;
}) {
  const addClient = useStore((s) => s.addClient);
  const updateClient = useStore((s) => s.updateClient);
  const removeClient = useStore((s) => s.removeClient);
  const cantidadDeClientes = useStore((s) => s.clients.length);

  const [name, setName] = useState(cliente?.name ?? '');
  const [handle, setHandle] = useState(cliente?.handle ?? '');
  const [color, setColor] = useState(cliente?.color ?? COLORES[0]);
  const [startDate, setStartDate] = useState(cliente?.startDate?.slice(0, 10) ?? hoy());
  const [startingFollowers, setStartingFollowers] = useState(
    cliente?.startingFollowers != null ? String(cliente.startingFollowers) : ''
  );
  const [tracksLeads, setTracksLeads] = useState(cliente?.tracksLeads ?? false);
  const [logo, setLogo] = useState<MediaRef | undefined>(cliente?.logo);
  const [confirmarBaja, setConfirmarBaja] = useState(false);

  const valido = name.trim().length > 0 && handle.trim().length > 0;

  const guardar = () => {
    if (!valido) return;
    const datos = {
      name: name.trim(),
      handle: handle.trim(),
      color,
      startDate: new Date(`${startDate}T00:00:00`).toISOString(),
      startingFollowers: startingFollowers ? Number(startingFollowers) : undefined,
      tracksLeads,
      logo,
    };

    if (cliente) {
      updateClient(cliente.id, {
        ...datos,
        handle: datos.handle.startsWith('@') ? datos.handle : `@${datos.handle}`,
      });
    } else {
      addClient(datos);
    }
    onClose();
  };

  const darDeBaja = () => {
    if (!cliente) return;
    removeClient(cliente.id);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={cliente ? 'Editar cuenta' : 'Nueva cuenta de cliente'}
    >
      <div className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="cli-nombre">
              Nombre
            </label>
            <input
              id="cli-nombre"
              autoFocus
              className="input mt-1"
              placeholder="Aurora Skin"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="cli-handle">
              Usuario de Instagram
            </label>
            <input
              id="cli-handle"
              className="input mt-1"
              placeholder="@aurora.skin"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
            />
          </div>
        </div>

        <div>
          <span className="label">Color</span>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {COLORES.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                className={`h-7 w-7 rounded-full transition ${
                  color === c ? 'ring-2 ring-ink-800 ring-offset-2' : ''
                }`}
                style={{ background: c }}
              />
            ))}
            <input
              type="color"
              aria-label="Otro color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-7 w-9 cursor-pointer rounded border border-ink-200 bg-surface"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="cli-desde">
              Empecé a llevar la cuenta
            </label>
            <input
              id="cli-desde"
              type="date"
              className="input mt-1"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="cli-seg">
              Seguidores ese día
            </label>
            <input
              id="cli-seg"
              type="number"
              min={0}
              className="input mt-1"
              placeholder="1840"
              value={startingFollowers}
              onChange={(e) => setStartingFollowers(e.target.value)}
            />
          </div>
        </div>
        <p className="-mt-2 text-[11px] leading-snug text-ink-400">
          Es el punto de partida contra el que se mide todo el crecimiento que
          después le mostrás. Si no te acordás el número exacto, poné el más
          cercano: siempre es mejor que dejarlo vacío.
        </p>

        <div className="flex items-center justify-between rounded-xl bg-ink-50 p-3">
          <div className="mr-3">
            <p className="text-sm font-medium text-ink-800">Con esta cuenta mido ventas</p>
            <p className="text-[11px] leading-snug text-ink-500">
              Para los clientes donde seguís las consultas que llegan por WhatsApp
              y cuáles se cerraron.
            </p>
          </div>
          <Toggle checked={tracksLeads} onChange={setTracksLeads} />
        </div>

        <div>
          <span className="label">Logo (opcional)</span>
          <div className="mt-1.5">
            <MediaUploader
              value={logo ? [logo] : []}
              onChange={(m) => setLogo(m[0])}
              accept="image/*"
              label="Arrastrá el logo o hacé clic para elegirlo"
              previewClassName="h-24 w-24 rounded-full"
            />
          </div>
        </div>

        {confirmarBaja ? (
          <div className="rounded-xl bg-rose-50 p-3">
            <p className="text-[13px] leading-snug text-rose-700">
              Se va a borrar <b>{cliente?.name}</b> con todo lo suyo: contenidos,
              campañas, métricas y ventas. No se puede deshacer.
            </p>
            <div className="mt-2 flex gap-2">
              <button className="btn-outline !py-1.5 text-xs" onClick={() => setConfirmarBaja(false)}>
                Mejor no
              </button>
              <button
                className="btn !bg-rose-600 !py-1.5 text-xs text-white hover:!bg-rose-700"
                onClick={darDeBaja}
              >
                Sí, dar de baja
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 border-t border-ink-200/70 pt-4">
            {cliente && cantidadDeClientes > 1 && (
              <button
                className="btn-ghost mr-auto !py-1.5 text-xs text-rose-600 hover:bg-rose-50"
                onClick={() => setConfirmarBaja(true)}
              >
                <Trash2 size={14} /> Dar de baja
              </button>
            )}
            <button className={`btn-outline ${cliente ? '' : 'ml-auto'}`} onClick={onClose}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={guardar} disabled={!valido}>
              {cliente ? 'Guardar cambios' : 'Crear cuenta'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
