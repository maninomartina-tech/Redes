import { CheckCircle2, RefreshCw, TriangleAlert } from 'lucide-react';
import { useState } from 'react';

export interface ResultadoDeSync {
  ok: boolean;
  /** Qué se trajo, para contárselo a la creadora */
  resumen?: string;
  avisos?: string[];
  error?: string;
}

/**
 * Botón para traer datos desde Meta. Muestra el resultado abajo en vez de
 * dejarlo en silencio: si Meta rechazó alguna métrica, conviene saberlo.
 */
export default function SyncButton({
  onSync,
  label = 'Sincronizar con Meta',
  descripcion,
}: {
  onSync: () => Promise<ResultadoDeSync>;
  label?: string;
  descripcion?: string;
}) {
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoDeSync | null>(null);

  const ejecutar = async () => {
    setCargando(true);
    setResultado(null);
    try {
      setResultado(await onSync());
    } catch (e) {
      setResultado({
        ok: false,
        error: e instanceof Error ? e.message : 'Falló la sincronización.',
      });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-2">
      <button className="btn-outline" onClick={ejecutar} disabled={cargando}>
        <RefreshCw size={15} className={cargando ? 'animate-spin' : undefined} />
        {cargando ? 'Trayendo datos…' : label}
      </button>

      {descripcion && !resultado && (
        <p className="text-xs text-ink-400">{descripcion}</p>
      )}

      {resultado && (
        <div
          className={`rounded-xl border p-3 text-sm ${
            resultado.ok
              ? 'border-mint-200 bg-mint-50'
              : 'border-butter-200 bg-butter-50'
          }`}
        >
          <p className="flex items-center gap-1.5 font-semibold text-ink-800">
            {resultado.ok ? (
              <CheckCircle2 size={15} className="text-mint-600" />
            ) : (
              <TriangleAlert size={15} className="text-butter-600" />
            )}
            {resultado.ok ? 'Listo' : 'No se pudo sincronizar'}
          </p>
          {resultado.resumen && <p className="mt-0.5 text-ink-600">{resultado.resumen}</p>}
          {resultado.error && <p className="mt-0.5 text-ink-600">{resultado.error}</p>}
          {resultado.avisos && resultado.avisos.length > 0 && (
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-ink-500">
              {resultado.avisos.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
