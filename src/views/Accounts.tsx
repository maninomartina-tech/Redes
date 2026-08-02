import {
  Camera,
  CheckCircle2,
  Link2,
  Music2,
  ServerOff,
  ShieldCheck,
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
  urlConexionMeta,
  type CuentaMeta,
  type EstadoServidor,
} from '@/lib/publish';
import { SectionTitle, Toggle } from '@/components/ui';

const platformIcon: Record<Platform, React.ReactNode> = {
  instagram: <Camera size={20} />,
  facebook: <Users size={20} />,
  tiktok: <Music2 size={20} />,
};

export default function Accounts() {
  const client = useCurrentClient();
  const toggleAccount = useStore((s) => s.toggleAccount);
  const updateAccount = useStore((s) => s.updateAccount);
  const [cuentasMeta, setCuentasMeta] = useState<CuentaMeta[]>([]);
  const [servidor, setServidor] = useState<EstadoServidor | null>(null);

  useEffect(() => {
    consultarServidor().then(setServidor);
    listarCuentasMeta().then(setCuentasMeta);
  }, []);

  const loginMeta = urlConexionMeta();

  return (
    <div>
      <SectionTitle
        title="Cuentas conectadas"
        subtitle={`Conexiones de ${client.name} para publicar automáticamente.`}
      />

      <EstadoDelServidor estado={servidor} loginMeta={loginMeta} />

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
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Muestra qué falta para que la publicación automática funcione de verdad. */
function EstadoDelServidor({
  estado,
  loginMeta,
}: {
  estado: EstadoServidor | null;
  loginMeta: string | null;
}) {
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
  if (!estado.metaConfigurado) faltantes.push('las credenciales de Meta (META_APP_ID y META_APP_SECRET)');
  if (!estado.urlPublica)
    faltantes.push('la dirección pública del servidor (PUBLIC_URL), desde donde Meta descarga las piezas');

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
          {loginMeta && estado.metaConfigurado && (
            <a href={loginMeta} className="btn-primary mt-3 !py-1.5 text-xs">
              <Link2 size={14} />
              {estado.cuentasConectadas > 0 ? 'Vincular otra cuenta' : 'Vincular Instagram'}
            </a>
          )}
        </div>
      </div>

      {faltantes.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-butter-200 bg-butter-50 p-4 text-sm">
          <TriangleAlert className="mt-0.5 shrink-0 text-butter-600" size={20} />
          <div className="text-ink-700">
            <p className="font-semibold text-ink-800">Falta configurar</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {faltantes.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <p className="mt-1.5 text-xs text-ink-500">
              Todo va en el archivo <code className="rounded bg-ink-100 px-1 py-0.5">server/.env</code>{' '}
              (ver <code className="rounded bg-ink-100 px-1 py-0.5">.env.example</code>).
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
