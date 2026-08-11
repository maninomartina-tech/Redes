import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import type { MediaRef } from '@/types';
import {
  deleteMedia,
  formatSize,
  respaldarEnServidor,
  saveMedia,
  useMediaUrl,
} from '@/lib/media';
import { mover } from '@/lib/piezas';

/** Vista previa de un archivo ya guardado. */
export function MediaPreview({
  media,
  className = '',
  onRemove,
}: {
  media: MediaRef;
  className?: string;
  onRemove?: () => void;
}) {
  const url = useMediaUrl(media.id, media.url);

  return (
    <div className={`group relative overflow-hidden rounded-xl bg-ink-100 ${className}`}>
      {!url && (
        <div className="grid h-full w-full place-items-center text-ink-300">
          <Loader2 size={18} className="animate-spin" />
        </div>
      )}
      {url && media.kind === 'image' && (
        <img src={url} alt={media.name} className="h-full w-full object-cover" />
      )}
      {url && media.kind === 'video' && (
        <video src={url} controls playsInline className="h-full w-full object-cover" />
      )}
      {onRemove && (
        <button
          onClick={onRemove}
          title="Quitar archivo"
          aria-label={`Quitar ${media.name}`}
          className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-lg bg-ink-900/60 text-white opacity-0 backdrop-blur-sm transition hover:bg-rose-600 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

/**
 * Zona para subir archivos: acepta arrastrar y soltar o elegir desde el
 * dispositivo. Con `multiple` acumula varios (inspiración); sin él, reemplaza
 * el archivo anterior (pieza final).
 */
export default function MediaUploader({
  value,
  onChange,
  multiple = false,
  accept = 'image/*,video/*',
  label = 'Arrastrá un archivo o hacé clic para elegirlo',
  hint,
  previewClassName = 'aspect-square',
  disabled = false,
  ordenable = false,
  columnas = 'grid-cols-3 sm:grid-cols-4',
  nombre,
}: {
  value: MediaRef[];
  onChange: (media: MediaRef[]) => void;
  multiple?: boolean;
  accept?: string;
  label?: string;
  /** Aclaración debajo del texto. Por defecto se deduce de `accept`. */
  hint?: string;
  previewClassName?: string;
  disabled?: boolean;
  /**
   * Numera las piezas y deja moverlas de lugar. En un carrusel el orden es
   * parte del contenido: la primera imagen es la que frena el scroll.
   */
  ordenable?: boolean;
  columnas?: string;
  /**
   * Qué se está subiendo acá. En una misma pantalla puede haber más de una
   * zona —el video del reel y su portada— y sin nombre son indistinguibles
   * para quien no ve la pantalla.
   */
  nombre?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [encima, setEncima] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Qué se está subiendo y cuánto va, para que un video no parezca colgado. */
  const [avance, setAvance] = useState<{ nombre: string; parte: number } | null>(null);

  const procesar = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setSubiendo(true);

    const nuevos: MediaRef[] = [];
    const fallaron: string[] = [];

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image') && !file.type.startsWith('video')) {
          fallaron.push(`"${file.name}" no es una imagen ni un video.`);
          continue;
        }

        setAvance({ nombre: file.name, parte: 0 });

        // Primero al navegador, que se ve al instante; después al servidor,
        // que es de donde lo va a mirar el cliente desde su dispositivo.
        let guardada: MediaRef;
        try {
          guardada = await saveMedia(file);
        } catch {
          fallaron.push(
            `No se pudo guardar "${file.name}" en este dispositivo. ` +
              'Puede que no quede espacio en el navegador.'
          );
          continue;
        }

        try {
          nuevos.push(
            await respaldarEnServidor(guardada, {
              alProgreso: (parte) => setAvance({ nombre: file.name, parte }),
            })
          );
        } catch (e) {
          // La copia local sí quedó, pero sin la del servidor el cliente no la
          // va a ver: se descarta y se dice por qué, en vez de dejar una pieza
          // que parece cargada y no lo está.
          void deleteMedia(guardada.id);
          fallaron.push(
            `No se pudo subir "${file.name}". ${e instanceof Error ? e.message : ''}`.trim()
          );
        }
      }

      if (fallaron.length) setError(fallaron.join(' '));
      if (nuevos.length === 0) return;

      if (multiple) {
        onChange([...value, ...nuevos]);
      } else {
        // Reemplaza: borramos el anterior para no dejar basura guardada.
        value.forEach((m) => deleteMedia(m.id));
        onChange([nuevos[0]]);
      }
    } finally {
      setSubiendo(false);
      setAvance(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const quitar = (m: MediaRef) => {
    deleteMedia(m.id);
    onChange(value.filter((x) => x.id !== m.id));
  };

  const mostrarZona = disabled ? false : multiple || value.length === 0;

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className={multiple ? `grid gap-2 ${columnas}` : ''}>
          {value.map((m, i) => (
            <div key={m.id}>
              <div className="relative">
                <MediaPreview
                  media={m}
                  className={previewClassName}
                  onRemove={disabled ? undefined : () => quitar(m)}
                />
                {ordenable && (
                  <span className="pointer-events-none absolute left-1.5 top-1.5 grid h-5 min-w-[1.25rem] place-items-center rounded-md bg-ink-900/65 px-1 text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                )}
              </div>

              {ordenable && !disabled && value.length > 1 && (
                <div className="mt-1 flex items-center justify-center gap-1">
                  <button
                    className="grid h-6 w-6 place-items-center rounded-lg text-ink-400 transition enabled:hover:bg-ink-100 enabled:hover:text-ink-700 disabled:opacity-30"
                    disabled={i === 0}
                    onClick={() => onChange(mover(value, i, i - 1))}
                    aria-label={`Mover ${m.name} un lugar antes`}
                    title="Mover antes"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    className="grid h-6 w-6 place-items-center rounded-lg text-ink-400 transition enabled:hover:bg-ink-100 enabled:hover:text-ink-700 disabled:opacity-30"
                    disabled={i === value.length - 1}
                    onClick={() => onChange(mover(value, i, i + 1))}
                    aria-label={`Mover ${m.name} un lugar después`}
                    title="Mover después"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}

              {!multiple && (
                <p className="mt-1 truncate text-[11px] text-ink-400">
                  {m.name} · {formatSize(m.size)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {mostrarZona && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setEncima(true);
          }}
          onDragLeave={() => setEncima(false)}
          onDrop={(e) => {
            e.preventDefault();
            setEncima(false);
            procesar(e.dataTransfer.files);
          }}
          className={`rounded-xl border-2 border-dashed transition ${
            encima ? 'border-brand-400 bg-brand-50' : 'border-ink-200 bg-surface'
          }`}
        >
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={subiendo}
            className="flex w-full flex-col items-center gap-1.5 px-3 py-5 text-center"
          >
            {subiendo ? (
              <Loader2 size={20} className="animate-spin text-brand-700" />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-100 text-brand-800">
                {multiple ? <ImagePlus size={17} /> : <Upload size={17} />}
              </span>
            )}
            <span className="text-xs font-medium text-ink-600">
              {subiendo ? 'Subiendo…' : label}
            </span>
            <span className="text-[11px] text-ink-400">
              {hint ?? (accept.includes('video') ? 'Imágenes o video' : 'Imágenes')}
            </span>
          </button>

          {/* Un video tarda, y sin esto la pantalla parece colgada. */}
          {avance && (
            <div className="px-3 pb-3">
              <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-ink-500">
                <span className="truncate">{avance.nombre}</span>
                <span className="shrink-0 tabular-nums">
                  {Math.round(avance.parte * 100)}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full rounded-full bg-brand-500 transition-[width] duration-300"
                  style={{ width: `${Math.max(3, Math.round(avance.parte * 100))}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {!mostrarZona && !disabled && !multiple && (
        <button
          className="btn-outline w-full !py-1.5 text-xs"
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={13} /> Reemplazar archivo
        </button>
      )}

      {/* Un único input, compartido por la zona y por el botón de reemplazo */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        aria-label={nombre ?? label}
        className="hidden"
        onChange={(e) => procesar(e.target.files)}
      />

      {error && (
        <p className="rounded-lg bg-rose-50 p-2 text-xs leading-snug text-rose-700">{error}</p>
      )}
    </div>
  );
}
