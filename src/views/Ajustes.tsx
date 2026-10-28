import {
  Camera,
  Link2,
  Music2,
  Palette,
  Pencil,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useStore, useCurrentClient } from '@/store/useStore';
import type { Platform } from '@/types';
import { platformLabel } from '@/lib/format';
import { listarCuentasMeta, type CuentaMeta } from '@/lib/publish';
import { Avatar, Modal, SectionTitle, Toggle } from '@/components/ui';
import Backup from '@/components/Backup';
import ClientForm from '@/components/ClientForm';
import ConexionInstagram from '@/components/ConexionInstagram';
import Espacio from '@/components/Espacio';
import LinksDeClientes from '@/components/LinksDeClientes';
import Marca from '@/components/Marca';

// ---------------------------------------------------------------------------
// Ajustes: todo lo que se toca una vez y después no se vuelve a mirar.
//
// Son cuatro cosas distintas y por eso están en secciones que se abren y se
// cierran: las cuentas de tus clientes, la conexión con Instagram, los links
// con los que entran, y dónde se guarda todo. Una sola pantalla, porque
// ninguna de las cuatro justifica un lugar en el menú de todos los días.
// ---------------------------------------------------------------------------

const platformIcon: Record<Platform, React.ReactNode> = {
  instagram: <Camera size={20} />,
  facebook: <Users size={20} />,
  tiktok: <Music2 size={20} />,
};

/** Una sección que se abre y se cierra, para que la pantalla no sea un rollo. */
function Seccion({
  titulo,
  detalle,
  abierta = false,
  children,
}: {
  titulo: string;
  detalle: string;
  abierta?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={abierta} className="card overflow-hidden">
      <summary className="cursor-pointer px-4 py-3.5">
        <span className="font-bold text-ink-900">{titulo}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-ink-500">{detalle}</span>
      </summary>
      <div className="border-t border-ink-200/70 p-4">{children}</div>
    </details>
  );
}

export default function Ajustes() {
  const client = useCurrentClient();
  const toggleAccount = useStore((s) => s.toggleAccount);
  const updateAccount = useStore((s) => s.updateAccount);
  const removeAccount = useStore((s) => s.removeAccount);

  const [cuentasMeta, setCuentasMeta] = useState<CuentaMeta[]>([]);
  const [nuevoCliente, setNuevoCliente] = useState(false);
  const [editando, setEditando] = useState(false);
  const [nuevaRed, setNuevaRed] = useState(false);

  useEffect(() => {
    listarCuentasMeta().then(setCuentasMeta);
  }, []);

  return (
    <div>
      <SectionTitle
        title="Ajustes"
        subtitle="Tus clientes, Instagram, los links y el respaldo."
        action={
          <button className="btn-primary" onClick={() => setNuevoCliente(true)}>
            <Plus size={16} /> Agregar cliente
          </button>
        }
      />

      <div className="space-y-3">
        {/* ---- la cuenta que está abierta ---- */}
        <Seccion
          titulo={`Las redes de ${client.name}`}
          detalle="Qué cuentas tiene, y cuál de Instagram le corresponde."
          abierta
        >
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-ink-200/70 bg-surface p-3.5">
            <Avatar name={client.name} color={client.color} logoId={client.logo?.id} size={44} />
            <div className="mr-auto min-w-0">
              <p className="truncate font-semibold text-ink-900">{client.name}</p>
              <p className="truncate text-sm text-ink-500">
                {client.handle}
                {client.startingFollowers != null && (
                  <> · arrancó en {client.startingFollowers.toLocaleString('es-AR')} seguidores</>
                )}
              </p>
            </div>
            <button className="btn-outline !py-1.5 text-xs" onClick={() => setEditando(true)}>
              <Pencil size={14} /> Editar
            </button>
          </div>

          <div className="space-y-3">
            {client.accounts.map((acc) => (
              <div key={acc.id} className="rounded-xl border border-ink-200/70 bg-surface p-3.5">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                      acc.connected ? 'bg-brand-800 text-canvas' : 'bg-ink-100 text-ink-400'
                    }`}
                  >
                    {platformIcon[acc.platform]}
                  </span>
                  <div className="mr-auto min-w-0">
                    <p className="font-semibold text-ink-900">{platformLabel[acc.platform]}</p>
                    <p className="truncate text-sm text-ink-500">{acc.handle}</p>
                  </div>
                  <Toggle
                    checked={acc.connected}
                    onChange={() => toggleAccount(client.id, acc.id)}
                  />
                  {client.accounts.length > 1 && (
                    <button
                      className="btn-ghost !px-2 text-rose-600 hover:bg-rose-50"
                      onClick={() => removeAccount(client.id, acc.id)}
                      title={`Quitar ${platformLabel[acc.platform]}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                {/* Qué cuenta real de Meta corresponde a esta */}
                {acc.platform === 'instagram' && cuentasMeta.length > 0 && (
                  <div className="mt-3 border-t border-ink-200/70 pt-3">
                    <label className="label">Cuenta de Instagram vinculada</label>
                    <select
                      value={acc.metaAccountId ?? ''}
                      onChange={(e) =>
                        updateAccount(client.id, acc.id, {
                          metaAccountId: e.target.value || undefined,
                        })
                      }
                      className="input mt-1"
                    >
                      <option value="">Sin vincular</option>
                      {cuentasMeta.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.usuario ?? c.nombre} ({c.id})
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-ink-400">
                      Es la que se usa para publicar y para traer los números de este cliente.
                    </p>
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={() => setNuevaRed(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-200 bg-surface/60 py-3.5 text-sm font-medium text-ink-500 transition hover:border-brand-300 hover:text-brand-800"
            >
              <Plus size={16} /> Agregar otra red a {client.name}
            </button>
          </div>
        </Seccion>

        {/* ---- Instagram ---- */}
        <Seccion
          titulo="Conexión con Instagram"
          detalle="Para que lo aprobado se publique solo a la hora programada."
        >
          <ConexionInstagram />
        </Seccion>

        {/* ---- los links ---- */}
        <Seccion
          titulo="Links de tus clientes"
          detalle="El link con el que cada uno ve su parte, y nada más que la suya."
        >
          <LinksDeClientes />
        </Seccion>

        {/* ---- marca ---- */}
        <Seccion titulo="Marca" detalle="Tu logo y los colores de la app.">
          <div className="mb-3 flex items-center gap-2 text-sm text-ink-500">
            <Palette size={16} className="text-brand-800" />
            Los cambios se ven al instante.
          </div>
          <Marca />
        </Seccion>

        {/* ---- dónde se guarda ---- */}
        <Seccion titulo="Tu espacio y el respaldo" detalle="Cuánto ocupa, y cómo bajar una copia.">
          <Espacio />
          <Backup />
        </Seccion>
      </div>

      <ClientForm open={nuevoCliente} onClose={() => setNuevoCliente(false)} />
      <ClientForm
        key={client.id}
        open={editando}
        onClose={() => setEditando(false)}
        cliente={client}
      />
      <NuevaRed open={nuevaRed} onClose={() => setNuevaRed(false)} clientId={client.id} />
    </div>
  );
}

/** Suma otra red social a la cuenta que está abierta. */
function NuevaRed({
  open,
  onClose,
  clientId,
}: {
  open: boolean;
  onClose: () => void;
  clientId: string;
}) {
  const addAccount = useStore((s) => s.addAccount);
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [handle, setHandle] = useState('');

  const guardar = () => {
    if (!handle.trim()) return;
    addAccount(clientId, { platform, handle: handle.trim() });
    setHandle('');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Agregar una red">
      <div className="space-y-4 p-5">
        <div>
          <span className="label">Red</span>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {(['instagram', 'tiktok', 'facebook'] as Platform[]).map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition ${
                  platform === p
                    ? 'border-brand-400 bg-brand-50 text-brand-800'
                    : 'border-ink-200 bg-surface text-ink-600 hover:bg-ink-50'
                }`}
              >
                {platformIcon[p]}
                {platformLabel[p]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="red-handle">
            Usuario
          </label>
          <input
            id="red-handle"
            autoFocus
            className="input mt-1"
            placeholder="@aurora.skin"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && guardar()}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-ink-200/70 pt-4">
          <button className="btn-outline" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={guardar} disabled={!handle.trim()}>
            Agregar
          </button>
        </div>
      </div>
    </Modal>
  );
}
