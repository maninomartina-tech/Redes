import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Avatar } from '@/components/ui';

// ---------------------------------------------------------------------------
// El cliente cambiando entre sus cuentas.
//
// Una misma persona puede tener dos Instagram. En el panel de la creadora son
// dos cuentas separadas —cada una con su calendario, su feed y sus números,
// porque son dos perfiles distintos—, pero para él es un solo link.
//
// Aparece solo si tiene más de una: con una sola no hay nada que elegir, y un
// desplegable de un solo elemento es una pregunta sin respuesta posible.
// ---------------------------------------------------------------------------

export default function SelectorDeCuenta() {
  const cuentas = useStore((s) => s.portalCuentas);
  const clients = useStore((s) => s.clients);
  const cambiar = useStore((s) => s.cambiarCuentaDelPortal);

  const [abierto, setAbierto] = useState(false);
  const [cambiando, setCambiando] = useState<string | null>(null);
  const caja = useRef<HTMLDivElement>(null);

  const actual = clients[0];

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [abierto]);

  if (cuentas.length < 2 || !actual) return null;

  const elegir = async (id: string) => {
    if (id === actual.id) return setAbierto(false);
    setCambiando(id);
    await cambiar(id);
    setCambiando(null);
    setAbierto(false);
  };

  return (
    <div className="relative" ref={caja}>
      <button
        onClick={() => setAbierto((v) => !v)}
        className="btn-outline !rounded-xl !py-1.5"
        aria-label={`Cuenta: ${actual.name}. Tenés ${cuentas.length} cuentas`}
      >
        <Avatar name={actual.name} color={actual.color} logoId={actual.logo?.id} size={24} />
        <span className="max-w-[7.5rem] truncate font-semibold sm:max-w-[11rem]">
          {actual.name}
        </span>
        <ChevronDown size={16} className="text-ink-400" />
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAbierto(false)} />
          {/* Se abre hacia la derecha porque el botón vive a la izquierda de
              la barra: anclado a la derecha, en un teléfono se salía de la
              pantalla y quedaba cortado. */}
          <div className="absolute left-0 z-20 mt-2 w-[min(17rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-ink-200/70 bg-surface p-1.5 shadow-lift">
            <p className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-ink-400">
              Tus cuentas
            </p>

            {cuentas.map((c) => (
              <button
                key={c.id}
                onClick={() => void elegir(c.id)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition hover:bg-ink-50 ${
                  c.id === actual.id ? 'bg-brand-100' : ''
                }`}
              >
                <Avatar name={c.name} color={c.color} logoId={c.logo?.id} size={28} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink-800">{c.name}</span>
                  <span className="block truncate text-xs text-ink-400">{c.handle}</span>
                </span>
                {cambiando === c.id ? (
                  <Loader2 size={15} className="animate-spin text-ink-400" />
                ) : (
                  c.id === actual.id && <Check size={15} className="text-brand-700" />
                )}
              </button>
            ))}

            <p className="mt-1 border-t border-ink-200/70 px-2.5 pb-1 pt-2 text-[11px] leading-snug text-ink-500">
              Con este mismo link podés cambiar entre tus cuentas cuando quieras.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
