import { useState } from 'react';

/**
 * Logo de Demm.
 *
 * Para usar tu logo real: dejá el archivo en `public/logo.svg`
 * (también sirve .png — cambiá la ruta en `LOGO_SRC`).
 * Si el archivo no existe, se muestra el monograma de respaldo.
 */
const LOGO_SRC = '/logo.svg';

export default function Logo({
  size = 36,
  showWordmark = true,
}: {
  size?: number;
  showWordmark?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="flex items-center gap-2.5">
      {failed ? (
        <span
          className="grid shrink-0 place-items-center rounded-xl bg-brand-500 font-semibold tracking-tight text-white"
          style={{ width: size, height: size, fontSize: size * 0.42 }}
        >
          D
        </span>
      ) : (
        <img
          src={LOGO_SRC}
          alt="Demm"
          onError={() => setFailed(true)}
          className="shrink-0 rounded-xl object-contain"
          style={{ width: size, height: size }}
        />
      )}

      {showWordmark && (
        <span className="leading-tight">
          <span className="block text-[15px] font-bold tracking-tight text-ink-900">Demm</span>
          <span className="block text-[11px] font-medium text-ink-400">
            Gestión de contenido
          </span>
        </span>
      )}
    </div>
  );
}
