import { AlertCircle, KeyRound, Loader2, LogIn, MonitorSmartphone } from 'lucide-react';
import { useState } from 'react';
import Logo from '@/components/Logo';
import { useStore } from '@/store/useStore';

/**
 * Pantalla de ingreso de la creadora.
 *
 * Aparece solo cuando hay un servidor con clave configurada. Sin servidor la
 * app sigue funcionando contra el navegador, como antes, y esta pantalla ni se
 * muestra.
 */
export default function Ingreso({ seguirLocal }: { seguirLocal: () => void }) {
  const entrarComoCreadora = useStore((s) => s.entrarComoCreadora);
  const estado = useStore((s) => s.sincro.estado);

  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);

  const entrando = estado === 'entrando' || estado === 'cargando';

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clave.trim() || entrando) return;
    setError(await entrarComoCreadora(clave));
  };

  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo size={44} />
        </div>

        <form onSubmit={enviar} className="card space-y-4 p-6">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-ink-900">
              Entrá a tu panel
            </h1>
            <p className="mt-1 text-[13px] leading-snug text-ink-500">
              Tu planificación vive en el servidor: entrás desde cualquier
              dispositivo y tus clientes ven lo suyo con su propio link.
            </p>
          </div>

          <div>
            <label className="label" htmlFor="clave">
              Tu clave
            </label>
            <div className="relative mt-1">
              <KeyRound
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              />
              <input
                id="clave"
                type="password"
                autoFocus
                autoComplete="current-password"
                className="input pl-9"
                placeholder="••••••••"
                value={clave}
                onChange={(e) => {
                  setClave(e.target.value);
                  setError(null);
                }}
              />
            </div>
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700">
              <AlertCircle size={15} className="mt-px shrink-0" />
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={entrando || !clave.trim()}
          >
            {entrando ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Entrando…
              </>
            ) : (
              <>
                <LogIn size={16} /> Entrar
              </>
            )}
          </button>

          <button
            type="button"
            onClick={seguirLocal}
            className="flex w-full items-start gap-2 rounded-xl px-1 py-1 text-left text-[11px] leading-snug text-ink-400 transition hover:text-ink-600"
          >
            <MonitorSmartphone size={14} className="mt-px shrink-0" />
            Seguir solo en este dispositivo. Vas a ver lo guardado acá, pero los
            cambios no le llegan a tus clientes.
          </button>
        </form>
      </div>
    </div>
  );
}
