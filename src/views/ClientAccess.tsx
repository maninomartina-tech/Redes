import {
  Check,
  Copy,
  Link2,
  Loader2,
  RefreshCw,
  ServerOff,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import {
  borrarLink,
  crearLink,
  hayServidor,
  listarLinks,
  urlDelLink,
  type LinkCliente,
} from '@/lib/espacio';
import { Avatar, EmptyState, SectionTitle } from '@/components/ui';
import VincularCuentas from '@/components/VincularCuentas';
import { vinculadasDe } from '@/lib/vinculos';
import { fmt } from '@/lib/date';

/**
 * Los links con los que entra cada cliente.
 *
 * Sin usuario ni contraseña: el link es la llave. Es lo más simple para
 * alguien que solo quiere mirar su semana desde el teléfono, y por eso mismo
 * se manda a cada cliente por separado y se rehace apenas se sospeche que se
 * filtró: el anterior deja de funcionar en el momento.
 */
export default function ClientAccess() {
  const clients = useStore((s) => s.clients);
  const sesion = useStore((s) => s.sesion);

  const [links, setLinks] = useState<LinkCliente[] | null>(null);
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refrescar = useCallback(async () => {
    if (!sesion) return;
    try {
      setLinks(await listarLinks(sesion));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron traer los links.');
    }
  }, [sesion]);

  useEffect(() => {
    void refrescar();
  }, [refrescar]);

  const generar = async (clienteId: string) => {
    if (!sesion) return;
    setTrabajando(clienteId);
    setError(null);
    try {
      await crearLink(sesion, clienteId);
      await refrescar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el link.');
    } finally {
      setTrabajando(null);
    }
  };

  const darDeBaja = async (clienteId: string) => {
    if (!sesion) return;
    setTrabajando(clienteId);
    try {
      await borrarLink(sesion, clienteId);
      await refrescar();
    } finally {
      setTrabajando(null);
    }
  };

  const copiar = async (token: string, clienteId: string) => {
    try {
      await navigator.clipboard.writeText(urlDelLink(token));
      setCopiado(clienteId);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      setError('No se pudo copiar. Seleccioná el link y copialo a mano.');
    }
  };

  if (!hayServidor() || !sesion) {
    return (
      <div>
        <SectionTitle
          title="Accesos de clientes"
          subtitle="El link con el que cada cliente ve su parte."
        />
        <div className="flex items-start gap-3 rounded-xl border border-butter-200 bg-butter-50 p-4 text-sm">
          <ServerOff className="mt-0.5 shrink-0 text-butter-600" size={20} />
          <div className="text-ink-700">
            <p className="font-semibold text-ink-800">
              Para esto hace falta el servidor
            </p>
            <p className="mt-1">
              Los links tienen que apuntar a algún lado: lo que está guardado en
              este navegador no lo puede abrir nadie más. Levantá el servidor
              (carpeta <code className="rounded bg-ink-100 px-1 py-0.5 text-xs">server/</code>),
              entrá con tu clave y volvé acá.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const linkDe = (clienteId: string) => links?.find((l) => l.cliente_id === clienteId);

  return (
    <div>
      <SectionTitle
        title="Accesos de clientes"
        subtitle="El link con el que cada cliente ve su parte, y nada más que la suya."
      />

      {error && (
        <p className="mb-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>
      )}

      {links === null ? (
        <div className="flex items-center gap-2 text-sm text-ink-400">
          <Loader2 size={16} className="animate-spin" /> Cargando…
        </div>
      ) : clients.length === 0 ? (
        <EmptyState title="Todavía no hay clientes" />
      ) : (
        <div className="space-y-3">
          {clients.map((c) => {
            const link = linkDe(c.id);
            const ocupado = trabajando === c.id;

            return (
              <div key={c.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Avatar name={c.name} color={c.color} logoId={c.logo?.id} size={38} />
                  <div className="mr-auto min-w-0">
                    <p className="truncate font-semibold text-ink-900">{c.name}</p>
                    <p className="truncate text-sm text-ink-500">{c.handle}</p>
                  </div>

                  {link ? (
                    <>
                      <button
                        className="btn-outline !py-1.5 text-xs"
                        onClick={() => generar(c.id)}
                        disabled={ocupado}
                        title="Genera uno nuevo y da de baja el anterior"
                      >
                        {ocupado ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <RefreshCw size={14} />
                        )}
                        Rehacer
                      </button>
                      <button
                        className="btn-ghost !py-1.5 text-xs text-rose-600 hover:bg-rose-50"
                        onClick={() => darDeBaja(c.id)}
                        disabled={ocupado}
                        title="Dar de baja el acceso"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn-primary !py-1.5 text-xs"
                      onClick={() => generar(c.id)}
                      disabled={ocupado}
                    >
                      {ocupado ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Link2 size={14} />
                      )}
                      Crear link
                    </button>
                  )}
                </div>

                {/* Un cliente puede manejar más de una cuenta: vinculándolas
                    entra a las dos con este mismo link. */}
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-200/70 pt-3">
                  <VincularCuentas cliente={c} />
                  {vinculadasDe(clients, c.id).length > 0 && (
                    <span className="text-[11px] leading-snug text-ink-500">
                      Con este link también ve{' '}
                      {vinculadasDe(clients, c.id)
                        .map((v) => v.name)
                        .join(', ')}
                      .
                    </span>
                  )}
                </div>

                {link && (
                  <div className="mt-3 border-t border-ink-200/70 pt-3">
                    <div className="flex items-center gap-2">
                      <code className="min-w-0 flex-1 truncate rounded-xl bg-ink-50 px-3 py-2 text-xs text-ink-600">
                        {urlDelLink(link.token)}
                      </code>
                      <button
                        className="btn-soft !py-1.5 text-xs"
                        onClick={() => copiar(link.token, c.id)}
                      >
                        {copiado === c.id ? <Check size={14} /> : <Copy size={14} />}
                        {copiado === c.id ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] text-ink-400">
                      {link.ultimo_acceso
                        ? `Última visita: ${fmt(link.ultimo_acceso, "d 'de' MMMM, HH:mm")}`
                        : 'Todavía no lo abrió.'}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-start gap-3 rounded-xl border border-ink-200/70 bg-surface p-4 text-sm">
        <ShieldCheck className="mt-0.5 shrink-0 text-brand-800" size={20} />
        <p className="text-ink-600">
          Cada cliente ve <b>solo su contenido</b>, y el recorte lo hace el
          servidor: no hay forma de mirar lo de otro cambiando el link. Desde ahí
          puede comentar y aprobar, nada más. Lo que sí conviene es{' '}
          <b>mandar cada link en privado</b>: quien lo tenga, entra.
        </p>
      </div>
    </div>
  );
}
