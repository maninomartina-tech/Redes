import { ImagePlus, Loader2, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import type { MediaRef } from '@/types';
import { deleteMedia, formatSize, saveMedia, useMediaUrl } from '@/lib/media';

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
  const url = useMediaUrl(media.id);

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
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [encima, setEncima] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const procesar = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setSubiendo(true);
    try {
      const nuevos: MediaRef[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image') && !file.type.startsWith('video')) {
          setError(`"${file.name}" no es una imagen ni un video.`);
          continue;
        }
        nuevos.push(await saveMedia(file));
      }
      if (nuevos.length === 0) return;

      if (multiple) {
        onChange([...value, ...nuevos]);
      } else {
        // Reemplaza: borramos el anterior para no dejar basura guardada.
        value.forEach((m) => deleteMedia(m.id));
        onChange([nuevos[0]]);
      }
    } catch {
      setError('No se pudo guardar el archivo. Probá con uno más chico.');
    } finally {
      setSubiendo(false);
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
        <div className={multiple ? 'grid grid-cols-3 gap-2 sm:grid-cols-4' : ''}>
          {value.map((m) => (
            <div key={m.id}>
              <MediaPreview
                media={m}
                className={multiple ? previewClassName : previewClassName}
                onRemove={disabled ? undefined : () => quitar(m)}
              />
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
              {subiendo ? 'Guardando…' : label}
            </span>
            <span className="text-[11px] text-ink-400">
              {hint ?? (accept.includes('video') ? 'Imágenes o video' : 'Imágenes')}
            </span>
          </button>
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
        className="hidden"
        onChange={(e) => procesar(e.target.files)}
      />

      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
