import { Check, Link2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useStore, useCurrentClient } from '@/store/useStore';
import { crearLink, hayServidor, listarLinks, urlDelLink } from '@/lib/espacio';
import { Modal } from '@/components/ui';

/**
 * Copia el link con el que entra el cliente que está seleccionado.
 *
 * Si todavía no tiene uno, lo crea en el momento: la idea es que mandarle el
 * acceso a alguien sea un solo clic y no un trámite. El link es siempre el
 * mismo que figura en Accesos, así que rehacerlo desde allá lo cambia acá.
 */
export default function ClientLinkButton() {
  const client = useCurrentClient();
  const sesion = useStore((s) => s.sesion);

  const [estado, setEstado] = useState<'listo' | 'trabajando' | 'copiado'>('listo');
  const [problema, setProblema] = useState<string | null>(null);

  const copiar = async () => {
    if (estado === 'trabajando') return;

    if (!hayServidor() || !sesion) {
      setProblema(
        'Los links de tus clientes viven en el servidor, y todavía no hay uno conectado. ' +
          'Mientras tanto tu planificación está guardada solo en este navegador, así que ' +
          'no hay ninguna dirección que tu cliente pueda abrir.'
      );
      return;
    }

    setEstado('trabajando');
    try {
      const existentes = await listarLinks(sesion);
      const token =
        existentes.find((l) => l.cliente_id === client.id)?.token ??
        (await crearLink(sesion, client.id));

      await navigator.clipboard.writeText(urlDelLink(token));
      setEstado('copiado');
      setTimeout(() => setEstado('listo'), 2500);
    } catch (e) {
      setEstado('listo');
      setProblema(
        e instanceof Error ? e.message : 'No se pudo copiar el link. Probá desde Accesos.'
      );
    }
  };

  return (
    <>
      <button
        className="btn-primary"
        onClick={copiar}
        title={`Copiar el link con el que entra ${client.name}`}
      >
        {estado === 'trabajando' ? (
          <Loader2 size={16} className="animate-spin" />
        ) : estado === 'copiado' ? (
          <Check size={16} />
        ) : (
          <Link2 size={16} />
        )}
        {estado === 'copiado' ? '¡Link copiado!' : 'Copiar link del cliente'}
      </button>

      <Modal open={!!problema} onClose={() => setProblema(null)} title="Todavía no">
        <div className="space-y-4 p-5">
          <p className="text-sm leading-snug text-ink-600">{problema}</p>
          <div className="flex justify-end">
            <button className="btn-primary" onClick={() => setProblema(null)}>
              Entendido
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
