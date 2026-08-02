import { Palette, RotateCcw, TriangleAlert } from 'lucide-react';
import { useStore, useCurrentClient } from '@/store/useStore';
import {
  DEFAULT_BRANDING,
  contraste,
  isDefaultBranding,
  type Branding as BrandingType,
} from '@/lib/theme';
import Logo from '@/components/Logo';
import MediaUploader from '@/components/MediaUploader';
import { Avatar, SectionTitle } from '@/components/ui';

interface CampoColor {
  clave: keyof BrandingType;
  titulo: string;
  detalle: string;
}

const campos: CampoColor[] = [
  {
    clave: 'strong',
    titulo: 'Tono fuerte',
    detalle: 'Botones, títulos y estados activos.',
  },
  {
    clave: 'soft',
    titulo: 'Tono suave',
    detalle: 'Textos secundarios y bordes.',
  },
  {
    clave: 'canvas',
    titulo: 'Fondo',
    detalle: 'El fondo general de la app.',
  },
];

export default function Branding() {
  const { branding, setBranding, brandLogo, setBrandLogo, updateClient } = useStore();
  const client = useCurrentClient();

  // Avisos de legibilidad: el texto tiene que leerse sobre el fondo.
  const contrasteTexto = contraste(branding.strong, branding.canvas);
  const contrasteSuave = contraste(branding.soft, branding.canvas);

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Marca"
        subtitle="El logo y los colores de la app. Los cambios se ven al instante."
        action={
          !isDefaultBranding(branding) || brandLogo ? (
            <button
              className="btn-outline"
              onClick={() => {
                setBranding(DEFAULT_BRANDING);
                setBrandLogo(undefined);
              }}
            >
              <RotateCcw size={15} /> Restaurar
            </button>
          ) : undefined
        }
      />

      {/* logo */}
      <div className="card p-5">
        <h3 className="mb-1 font-bold text-ink-900">Logo</h3>
        <p className="mb-4 text-sm text-ink-500">
          Se muestra arriba a la izquierda y en el panel de tus clientes. Ideal cuadrado
          y con fondo transparente (SVG o PNG).
        </p>

        <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
          <MediaUploader
            accept="image/*"
            value={brandLogo ? [brandLogo] : []}
            onChange={(m) => setBrandLogo(m[0])}
            label="Arrastrá tu logo o hacé clic para elegirlo"
            previewClassName="aspect-square"
          />

          <div>
            <p className="label mb-2">Cómo se ve</p>
            <div className="space-y-3">
              <div className="rounded-xl border border-ink-200/70 bg-surface p-4">
                <Logo size={40} />
              </div>
              <div className="rounded-xl border border-ink-200/70 bg-canvas p-4">
                <Logo size={28} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* colores */}
      <div className="card p-5">
        <div className="mb-1 flex items-center gap-2">
          <Palette size={18} className="text-brand-800" />
          <h3 className="font-bold text-ink-900">Colores</h3>
        </div>
        <p className="mb-4 text-sm text-ink-500">
          Con estos tres tonos se arma toda la paleta: los grises, los bordes y los
          fondos suaves se generan solos a partir de ellos.
        </p>

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

        {/* avisos de legibilidad */}
        {(contrasteTexto < 4.5 || contrasteSuave < 3) && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-butter-200 bg-butter-50 p-3">
            <TriangleAlert size={17} className="mt-0.5 shrink-0 text-butter-600" />
            <div className="text-sm text-ink-700">
              <p className="font-semibold text-ink-800">Ojo con la legibilidad</p>
              {contrasteTexto < 4.5 && (
                <p className="mt-0.5">
                  El tono fuerte casi no se distingue del fondo (contraste{' '}
                  {contrasteTexto.toFixed(1)}, conviene 4.5 o más). Los títulos y botones
                  van a costar de leer.
                </p>
              )}
              {contrasteSuave < 3 && (
                <p className="mt-0.5">
                  El tono suave tiene poco contraste contra el fondo (
                  {contrasteSuave.toFixed(1)}). Los textos secundarios se van a perder.
                </p>
              )}
            </div>
          </div>
        )}

        {/* muestra */}
        <div className="mt-4">
          <p className="label mb-2">Vista previa</p>
          <div className="rounded-2xl border border-ink-200/70 bg-canvas p-4">
            <div className="card p-4">
              <p className="text-sm font-bold text-ink-900">Título de ejemplo</p>
              <p className="mt-0.5 text-sm text-ink-500">
                Un texto secundario, como los que acompañan cada sección.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn-primary">Botón principal</button>
                <button className="btn-soft">Secundario</button>
                <button className="btn-outline">Contorno</button>
                <span className="chip bg-brand-100 text-brand-800">Etiqueta</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* logo del cliente */}
      <div className="card p-5">
        <h3 className="mb-1 font-bold text-ink-900">Logo de {client.name}</h3>
        <p className="mb-4 text-sm text-ink-500">
          Aparece en el panel de bienvenida del cliente. Si no cargás ninguno, se usan
          sus iniciales.
        </p>
        <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
          <MediaUploader
            accept="image/*"
            value={client.logo ? [client.logo] : []}
            onChange={(m) => updateClient(client.id, { logo: m[0] })}
            label="Arrastrá el logo del cliente"
            previewClassName="aspect-square"
          />
          <div>
            <p className="label mb-2">Cómo lo ve el cliente</p>
            <div className="flex items-center gap-3 rounded-xl border border-ink-200/70 bg-surface p-4">
              <Avatar
                name={client.name}
                color={client.color}
                size={48}
                logoId={client.logo?.id}
              />
              <div>
                <p className="font-bold text-ink-900">Bienvenido</p>
                <p className="text-sm text-ink-500">{client.handle}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
