import {
  Camera,
  CheckCircle2,
  Link2,
  Music2,
  Pencil,
  Plus,
  ServerOff,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useStore, useCurrentClient } from '@/store/useStore';
import type { Platform } from '@/types';
import { platformLabel } from '@/lib/format';
import {
  consultarServidor,
  listarCuentasMeta,
  listarCuentasPublicitarias,
  urlConexionMeta,
  type CuentaMeta,
  type CuentaPublicitaria,
  type EstadoServidor,
} from '@/lib/publish';
import { Avatar, Modal, SectionTitle, Toggle } from '@/components/ui';
import BotonCopiar from '@/components/BotonCopiar';
import ClientForm from '@/components/ClientForm';
import Backup from '@/components/Backup';

const platformIcon: Record<Platform, React.ReactNode> = {
  instagram: <Camera size={20} />,
  facebook: <Users size={20} />,
  tiktok: <Music2 size={20} />,
};

export default function Accounts() {
  const client = useCurrentClient();
  const toggleAccount = useStore((s) => s.toggleAccount);
  const updateAccount = useStore((s) => s.updateAccount);
  const removeAccount = useStore((s) => s.removeAccount);
  const [cuentasMeta, setCuentasMeta] = useState<CuentaMeta[]>([]);
  const [publicitarias, setPublicitarias] = useState<CuentaPublicitaria[]>([]);
  const [servidor, setServidor] = useState<EstadoServidor | null>(null);
  const [nuevaCuenta, setNuevaCuenta] = useState(false);
  const [editando, setEditando] = useState(false);
  const [nuevaRed, setNuevaRed] = useState(false);
  const sesion = useStore((s) => s.sesion);

  useEffect(() => {
    consultarServidor().then(setServidor);
    listarCuentasMeta().then(setCuentasMeta);
  }, []);

  // Las publicitarias cuelgan de su usuario de Facebook, así que aparecen
  // recién cuando hay sesión y ya conectó Meta.
  useEffect(() => {
    listarCuentasPublicitarias(sesion).then(setPublicitarias);
  }, [sesion]);

  return (
    <div>
      <SectionTitle
        title="Cuentas conectadas"
        subtitle={`Redes de ${client.name} y su conexión con Meta.`}
        action={
          <button className="btn-primary" onClick={() => setNuevaCuenta(true)}>
            <Plus size={16} /> Agregar cuenta
          </button>
        }
      />

      <EstadoDelServidor estado={servidor} sesion={sesion} />

      {/* Ficha de la cuenta que está seleccionada */}
      <div className="card mb-3 flex items-center gap-4 p-4">
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
          <div key={acc.id} className="card p-4">
            <div className="flex items-center gap-4">
              <span
                className={`grid h-11 w-11 place-items-center rounded-xl ${
                  acc.connected ? 'bg-brand-800 text-canvas' : 'bg-ink-100 text-ink-400'
                }`}
              >
                {platformIcon[acc.platform]}
              </span>
              <div className="mr-auto">
                <p className="font-semibold text-ink-900">{platformLabel[acc.platform]}</p>
                <p className="text-sm text-ink-500">{acc.handle}</p>
              </div>
              <span
                className={`chip ${
                  acc.connected ? 'bg-mint-100 text-mint-600' : 'bg-ink-100 text-ink-500'
                }`}
              >
                {acc.connected ? 'Conectada' : 'Desconectada'}
              </span>
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
                  Es la que se usa para publicar y para traer las métricas de este cliente.
                </p>

                {publicitarias.length > 0 && (
                  <div className="mt-3">
                    <label className="label">Cuenta publicitaria</label>
                    <select
                      value={acc.metaAdAccountId ?? ''}
                      onChange={(e) =>
                        updateAccount(client.id, acc.id, {
                          metaAdAccountId: e.target.value || undefined,
                        })
                      }
                      className="input mt-1"
                    >
                      <option value="">Sin vincular</option>
                      {publicitarias.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                          {c.moneda ? ` · ${c.moneda}` : ''}
                          {c.activa ? '' : ' · inactiva'}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-ink-400">
                      De dónde salen las campañas de ADS de este cliente. Cada uno paga
                      la suya, así que va una por cliente.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        <button
          onClick={() => setNuevaRed(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-200 bg-surface/60 py-4 text-sm font-medium text-ink-500 transition hover:border-brand-300 hover:text-brand-800"
        >
          <Plus size={16} /> Agregar otra red a {client.name}
        </button>
      </div>

      <div className="mt-6">
        <Backup />
      </div>

      <ClientForm open={nuevaCuenta} onClose={() => setNuevaCuenta(false)} />
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

/** Muestra qué falta para que la publicación automática funcione de verdad. */
function EstadoDelServidor({
  estado,
  sesion,
}: {
  estado: EstadoServidor | null;
  sesion: string | null;
}) {
  const [yendo, setYendo] = useState(false);
  const [errorMeta, setErrorMeta] = useState<string | null>(null);

  /**
   * Conectar Instagram.
   *
   * El pase se pide recién al tocar el botón, y dura un rato corto: si el link
   * viviera armado en la pantalla, quedaría dando vueltas en el historial.
   */
  const conectar = async () => {
    setErrorMeta(null);
    setYendo(true);
    const r = await urlConexionMeta(sesion);
    if (r.url) window.location.href = r.url;
    else {
      setErrorMeta(r.error ?? 'No se pudo arrancar la conexión.');
      setYendo(false);
    }
  };

  if (!estado) {
    return (
      <div className="mb-4 rounded-xl border border-ink-200/70 bg-surface p-4 text-sm text-ink-500">
        Consultando el servidor…
      </div>
    );
  }

  if (!estado.conectado) {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-butter-200 bg-butter-50 p-4 text-sm">
        <ServerOff className="mt-0.5 shrink-0 text-butter-600" size={20} />
        <div className="text-ink-700">
          <p className="font-semibold text-ink-800">La publicación automática está apagada</p>
          <p className="mt-1">
            La app está guardando la programación, pero todavía no hay un servidor que suba
            las piezas a la hora indicada. El servidor está en la carpeta{' '}
            <code className="rounded bg-ink-100 px-1 py-0.5 text-xs">server/</code> del
            proyecto: se levanta con <code className="rounded bg-ink-100 px-1 py-0.5 text-xs">npm start</code>{' '}
            y se apunta la app con <code className="rounded bg-ink-100 px-1 py-0.5 text-xs">VITE_API_URL</code>.
          </p>
        </div>
      </div>
    );
  }

  const faltantes: string[] = [];
  if (!estado.metaConfigurado)
    faltantes.push('las credenciales de Meta (META_APP_ID y META_APP_SECRET)');
  if (!estado.urlPublica)
    faltantes.push(
      'la dirección pública del servidor (PUBLIC_URL), desde donde Meta descarga las piezas'
    );

  return (
    <div className="mb-4 space-y-3">
      <div className="flex items-start gap-3 rounded-xl border border-mint-200 bg-mint-50 p-4 text-sm">
        <CheckCircle2 className="mt-0.5 shrink-0 text-mint-600" size={20} />
        <div className="text-ink-700">
          <p className="font-semibold text-ink-800">Servidor conectado</p>
          <p className="mt-1">
            {estado.cuentasConectadas > 0
              ? `Hay ${estado.cuentasConectadas} cuenta(s) de Instagram vinculadas. Lo aprobado se publica solo a la hora programada.`
              : 'Todavía no vinculaste ninguna cuenta de Instagram.'}
          </p>
          {estado.metaConfigurado && (
            <>
              <button
                className="btn-primary mt-3 !py-1.5 text-xs"
                disabled={yendo}
                onClick={() => void conectar()}
              >
                <Link2 size={14} />
                {yendo
                  ? 'Abriendo Meta…'
                  : estado.cuentasConectadas > 0
                  ? 'Vincular otra cuenta'
                  : 'Vincular Instagram'}
              </button>
              <p className="mt-2 text-xs leading-snug text-ink-500">
                Se abre Meta con tu cuenta de Facebook y quedan conectadas todas las cuentas
                de Instagram de las páginas que administrás. Después, acá abajo, elegís cuál
                corresponde a cada cliente.
              </p>
              {errorMeta && (
                <p className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">
                  {errorMeta}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <ParaPegarEnMeta estado={estado} />

      {faltantes.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-butter-200 bg-butter-50 p-4 text-sm">
          <TriangleAlert className="mt-0.5 shrink-0 text-butter-600" size={20} />
          <div className="text-ink-700">
            <p className="font-semibold text-ink-800">
              Falta configurar, si querés conectar Instagram
            </p>
            <p className="mb-1 mt-0.5 text-xs leading-snug text-ink-500">
              Nada de esto hace falta para trabajar a mano: podés planificar,
              pasarles el link a tus clientes y cargar las métricas igual.
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {faltantes.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <p className="mt-1.5 text-xs leading-snug text-ink-500">
              Si el servidor está en Render, se cargan en <b>Environment</b>, dentro
              del servicio. Si lo corrés en tu computadora, van en el archivo{' '}
              <code className="rounded bg-ink-100 px-1 py-0.5">server/.env</code>.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 rounded-xl border border-ink-200/70 bg-surface p-4 text-sm">
        <ShieldCheck className="mt-0.5 shrink-0 text-brand-800" size={20} />
        <p className="text-ink-600">
          Meta exige que la cuenta de Instagram sea <b>Business o Creator</b> y esté vinculada
          a una página de Facebook, y que la app tenga aprobado el permiso{' '}
          <code className="rounded bg-ink-100 px-1 py-0.5 text-xs">instagram_content_publish</code>.
        </p>
      </div>
    </div>
  );
}

/**
 * Lo que hay que cargar del otro lado, en developers.facebook.com.
 *
 * La dirección de vuelta la arma el servidor con su propia dirección pública,
 * así que acá no se adivina: se muestra la que de verdad va a usar. Escribirla
 * a mano es lo que más veces frena la conexión —Meta compara carácter por
 * carácter y contesta "URL bloqueada" sin decir cuál esperaba—, y por eso está
 * para copiar y no para leer.
 */
function ParaPegarEnMeta({ estado }: { estado: EstadoServidor }) {
  const [error, setError] = useState<string | null>(null);
  if (!estado.redireccionMeta) return null;

  return (
    <details
      // Mientras no haya ninguna cuenta, esto es justo lo que está buscando.
      open={estado.cuentasConectadas === 0}
      className="rounded-xl border border-ink-200/70 bg-surface p-4 text-sm"
    >
      <summary className="cursor-pointer font-semibold text-ink-800">
        Lo que hay que cargar en Facebook Developers
      </summary>

      <p className="mt-2 text-ink-600">
        En tu app de Meta, en <b>Inicio de sesión con Facebook → Configuración</b>, pegá
        esto en <b>URI de redireccionamiento de OAuth válidos</b>:
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-ink-100 px-2 py-1.5 text-xs text-ink-700">
          {estado.redireccionMeta}
        </code>
        <BotonCopiar
          texto={estado.redireccionMeta}
          etiqueta="Copiar"
          className="btn-ghost shrink-0 !py-1.5 text-xs"
          onError={setError}
        />
      </div>
      <p className="mt-1 text-xs text-ink-500">
        Tiene que quedar igual, sin barra al final. Si no coincide, Meta muestra «URL
        bloqueada» al abrir el login.
      </p>

      <p className="mt-3 text-ink-600">
        En <b>Configuración → Básica</b> van estas dos, que Meta exige para autorizar la
        app:
      </p>
      <Direccion
        etiqueta="URL de la política de privacidad"
        url={`${window.location.origin}/privacidad`}
        onError={setError}
      />
      <Direccion
        etiqueta="URL de instrucciones de eliminación de datos"
        url={`${window.location.origin}/eliminar-datos`}
        onError={setError}
      />

      <p className="mt-3 text-ink-600">
        Y estos son los permisos que se le piden. Los cubre el <b>caso de uso de
        Instagram</b>; los de <code className="rounded bg-ink-100 px-1 py-0.5 text-xs">ads</code>{' '}
        salen del de anuncios.
      </p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {estado.permisosMeta.map((p) => (
          <li key={p} className="chip bg-ink-100 font-mono text-[11px] text-ink-600">
            {p}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs leading-snug text-ink-500">
        {estado.adsAdministrables
          ? 'Con ads_management la app también puede prender, pausar y cambiar el presupuesto de las campañas.'
          : 'Para además prender, pausar y cambiar campañas desde acá, poné META_ADS_ESCRITURA = true en el servidor.'}
      </p>

      {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}
    </details>
  );
}

/** Una dirección larga para copiar y pegar del otro lado. */
function Direccion({
  etiqueta,
  url,
  onError,
}: {
  etiqueta: string;
  url: string;
  onError: (m: string) => void;
}) {
  return (
    <div className="mt-1.5">
      <p className="text-xs text-ink-500">{etiqueta}</p>
      <div className="mt-0.5 flex items-center gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-ink-100 px-2 py-1.5 text-xs text-ink-700">
          {url}
        </code>
        <BotonCopiar
          texto={url}
          etiqueta="Copiar"
          className="btn-ghost shrink-0 !py-1.5 text-xs"
          onError={onError}
        />
      </div>
    </div>
  );
}
