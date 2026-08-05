import { Link2, Unlink } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import type { Client } from '@/types';
import { grupoDe, vinculadasDe } from '@/lib/vinculos';
import { Avatar, Modal } from '@/components/ui';

// ---------------------------------------------------------------------------
// Vincular las cuentas de un mismo cliente.
//
// Una persona con dos Instagram son dos cuentas en el panel —cada una con su
// calendario, su feed y sus números, porque son dos perfiles distintos— pero
// una sola persona revisando. Vinculadas, con un link puede pasar de una a la
// otra; sin vincular, habría que mandarle dos links y él tendría que acordarse
// de mirar los dos.
//
// Vincular no mezcla nada: cada cuenta sigue con lo suyo. Lo único que cambia
// es quién puede verlas.
// ---------------------------------------------------------------------------

export default function VincularCuentas({ cliente }: { cliente: Client }) {
  const clients = useStore((s) => s.clients);
  const vincularCuentas = useStore((s) => s.vincularCuentas);
  const desvincularCuenta = useStore((s) => s.desvincularCuenta);

  const [abierto, setAbierto] = useState(false);

  const vinculadas = useMemo(() => vinculadasDe(clients, cliente.id), [clients, cliente.id]);

  /** Las que se pueden vincular: todas menos ella y las que ya están. */
  const disponibles = useMemo(() => {
    const grupo = new Set(grupoDe(clients, cliente.id));
    return clients.filter((c) => !grupo.has(c.id));
  }, [clients, cliente.id]);

  return (
    <>
      <button
        className="btn-outline !py-1.5 text-xs"
        onClick={() => setAbierto(true)}
        title="Que el cliente vea varias cuentas con un solo link"
      >
        <Link2 size={14} />
        {vinculadas.length > 0
          ? `Vinculada con ${vinculadas.length}`
          : 'Vincular cuenta'}
      </button>

      <Modal
        open={abierto}
        onClose={() => setAbierto(false)}
        title={`Cuentas vinculadas a ${cliente.name}`}
      >
        <div className="space-y-4 p-5">
          <p className="text-sm leading-snug text-ink-600">
            Si tu cliente maneja más de una cuenta, vinculalas: con{' '}
            <b>un solo link</b> va a poder cambiar entre ellas desde arriba. Cada
            cuenta sigue con su propio calendario, su feed y sus números — vincular
            no mezcla nada.
          </p>

          {vinculadas.length > 0 && (
            <div>
              <p className="label mb-1.5">Ya vinculadas</p>
              <div className="space-y-1.5">
                {vinculadas.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-2.5 rounded-xl border border-ink-200/70 p-2.5"
                  >
                    <Avatar name={c.name} color={c.color} logoId={c.logo?.id} size={30} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink-800">
                        {c.name}
                      </span>
                      <span className="block truncate text-xs text-ink-400">{c.handle}</span>
                    </span>
                    <button
                      className="btn-ghost !px-2 !py-1 text-xs text-rose-600"
                      onClick={() => desvincularCuenta(c.id)}
                      title={`Desvincular ${c.name}`}
                    >
                      <Unlink size={14} /> Quitar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="label mb-1.5">Agregar una cuenta</p>
            {disponibles.length === 0 ? (
              <p className="rounded-xl bg-ink-50 p-3 text-sm leading-snug text-ink-500">
                No hay otras cuentas para vincular. Cargá la segunda cuenta del cliente
                desde el selector de arriba y volvé acá.
              </p>
            ) : (
              <div className="max-h-56 space-y-1.5 overflow-y-auto">
                {disponibles.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => vincularCuentas(cliente.id, c.id)}
                    className="flex w-full items-center gap-2.5 rounded-xl border border-ink-200/70 p-2.5 text-left transition hover:border-brand-300 hover:bg-brand-50"
                  >
                    <Avatar name={c.name} color={c.color} logoId={c.logo?.id} size={30} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink-800">
                        {c.name}
                      </span>
                      <span className="block truncate text-xs text-ink-400">{c.handle}</span>
                    </span>
                    <Link2 size={15} className="shrink-0 text-ink-400" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end border-t border-ink-200/70 pt-4">
            <button className="btn-primary" onClick={() => setAbierto(false)}>
              Listo
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
