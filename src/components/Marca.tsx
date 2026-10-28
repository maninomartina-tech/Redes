import { RotateCcw, TriangleAlert } from 'lucide-react';
import { useStore } from '@/store/useStore';
import {
  DEFAULT_BRANDING,
  contraste,
  isDefaultBranding,
  type Branding as BrandingType,
} from '@/lib/theme';
import Logo from '@/components/Logo';
import MediaUploader from '@/components/MediaUploader';

const campos: { clave: keyof BrandingType; titulo: string; detalle: string }[] = [
  { clave: 'strong', titulo: 'Tono fuerte', detalle: 'Botones, títulos y estados activos.' },
  { clave: 'soft', titulo: 'Tono suave', detalle: 'Textos secundarios y bordes.' },
  { clave: 'canvas', titulo: 'Fondo', detalle: 'El fondo general de la app.' },
];

/**
 * Tu logo y tus colores.
 *
 * Con esos tres tonos se arma toda la paleta: los grises, los bordes y los
 * fondos suaves se generan solos. El aviso de contraste no es un detalle: un
 * tono elegido por lindo puede dejar los títulos ilegibles, y eso se nota
 * recién cuando ya está puesto en todas las pantallas.
 */
export default function Marca() {
  const { branding, setBranding, brandLogo, setBrandLogo } = useStore();

  const contrasteTexto = contraste(branding.strong, branding.canvas);
  const contrasteSuave = contraste(branding.soft, branding.canvas);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <div>
          <p className="label mb-1.5">Tu logo</p>
          <MediaUploader
            accept="image/*"
            value={brandLogo ? [brandLogo] : []}
            onChange={(m) => setBrandLogo(m[0])}
            label="Arrastrá tu logo o hacé clic"
            previewClassName="aspect-square"
          />
        </div>
        <div>
          <p className="label mb-1.5">Cómo se ve</p>
          <div className="rounded-xl border border-ink-200/70 bg-surface p-4">
            <Logo size={38} />
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-ink-400">
            Arriba a la izquierda, y en la pantalla de tus clientes. Mejor cuadrado y con
            fondo transparente.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {campos.map(({ clave, titulo, detalle }) => (
          <div key={clave} className="rounded-xl border border-ink-200/70 p-3">
            <label className="label">{titulo}</label>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="color"
                value={branding[clave]}
                onChange={(e) => setBranding({ [clave]: e.target.value })}
                aria-label={titulo}
                className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-ink-200 bg-surface p-1"
              />
              <input
                value={branding[clave]}
                onChange={(e) => setBranding({ [clave]: e.target.value })}
                className="input font-mono text-xs uppercase"
                spellCheck={false}
              />
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-ink-400">{detalle}</p>
          </div>
        ))}
      </div>

      {(contrasteTexto < 4.5 || contrasteSuave < 3) && (
        <div className="flex items-start gap-2.5 rounded-xl border border-butter-200 bg-butter-50 p-3">
          <TriangleAlert size={17} className="mt-0.5 shrink-0 text-butter-600" />
          <div className="text-sm text-ink-700">
            <p className="font-semibold text-ink-800">Ojo con la legibilidad</p>
            {contrasteTexto < 4.5 && (
              <p className="mt-0.5">
                El tono fuerte casi no se distingue del fondo (contraste{' '}
                {contrasteTexto.toFixed(1)}, conviene 4.5 o más). Los títulos y botones van a
                costar de leer.
              </p>
            )}
            {contrasteSuave < 3 && (
              <p className="mt-0.5">
                El tono suave tiene poco contraste contra el fondo ({contrasteSuave.toFixed(1)}
                ). Los textos secundarios se van a perder.
              </p>
            )}
          </div>
        </div>
      )}

      {(!isDefaultBranding(branding) || brandLogo) && (
        <button
          className="btn-outline"
          onClick={() => {
            setBranding(DEFAULT_BRANDING);
            setBrandLogo(undefined);
          }}
        >
          <RotateCcw size={15} /> Volver a los colores de siempre
        </button>
      )}
    </div>
  );
}
