import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { useMediaUrl } from '@/lib/media';

/**
 * Logo de la marca.
 *
 * Prioridad: el archivo subido desde la sección Marca; si no hay, el archivo
 * `public/logo.svg`; y como último respaldo, el monograma.
 */
const LOGO_SRC = '/logo.svg';

export default function Logo({
  size = 36,
  showWordmark = true,
  name,
}: {
  size?: number;
  showWordmark?: boolean;
  /** Texto del isologo. Por defecto, el nombre de la marca. */
  name?: string;
}) {
  const brandLogo = useStore((s) => s.brandLogo);
  const subido = useMediaUrl(brandLogo?.id);
  const [falloArchivo, setFalloArchivo] = useState(false);

  const src = subido ?? (falloArchivo ? undefined : LOGO_SRC);
  const titulo = name ?? 'Demm';

  return (
    <div className="flex items-center gap-2.5">
      {src ? (
        <img
          src={src}
          alt={titulo}
          onError={() => setFalloArchivo(true)}
          className="shrink-0 rounded-xl object-contain"
          style={{ width: size, height: size }}
        />
      ) : (
        <span
          className="grid shrink-0 place-items-center rounded-xl bg-brand-800 font-semibold tracking-tight text-canvas"
          style={{ width: size, height: size, fontSize: size * 0.42 }}
        >
          {titulo.charAt(0).toUpperCase()}
        </span>
      )}

      {showWordmark && (
        <span className="leading-tight">
          <span className="block text-[15px] font-bold tracking-tight text-ink-900">
            {titulo}
          </span>
          <span className="block text-[11px] font-medium text-ink-400">
            Gestión de contenido
          </span>
        </span>
      )}
    </div>
  );
}
