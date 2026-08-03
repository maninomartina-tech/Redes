import { AlertTriangle, Download, Loader2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { DEFAULT_BRANDING, applyBranding } from '@/lib/theme';
import type { DatosEspacio } from '@/lib/espacio';
import { plural } from '@/lib/texto';

// ---------------------------------------------------------------------------
// Copia de seguridad.
//
// Toda la planificación —clientes, contenido, crecimiento, ventas— vive en un
// solo lugar. Si ese lugar se pierde, no hay de dónde sacarla: por eso conviene
// bajar una copia de vez en cuando y guardarla donde guardás lo importante.
//
// El archivo es el mismo JSON que usa la app, así que se puede volver a subir
// tal cual. Ojo: las imágenes no van adentro; están en el servidor.
// ---------------------------------------------------------------------------

const nombreDeArchivo = () =>
  `demm-copia-${new Date().toISOString().slice(0, 10)}.json`;

export default function Backup() {
  const estado = useStore();
  const [restaurando, setRestaurando] = useState<DatosEspacio | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const bajar = () => {
    const datos: DatosEspacio = {
      clients: estado.clients,
      posts: estado.posts,
      campaigns: estado.campaigns,
      ads: estado.ads,
      monthlyStats: estado.monthlyStats,
      leads: estado.leads,
      hashtagSets: estado.hashtagSets,
      branding: estado.branding,
      brandLogo: estado.brandLogo,
    };

    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreDeArchivo();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  const leer = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const datos = JSON.parse(await file.text()) as DatosEspacio;
      if (!Array.isArray(datos.clients) || !Array.isArray(datos.posts)) {
        throw new Error('formato');
      }
      setRestaurando(datos);
    } catch {
      setError('Ese archivo no es una copia de Demm. Buscá el que termina en .json.');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const confirmar = () => {
    if (!restaurando) return;
    setTrabajando(true);
    const branding = restaurando.branding ?? DEFAULT_BRANDING;
    applyBranding(branding);
    useStore.setState({
      clients: restaurando.clients,
      posts: restaurando.posts,
      campaigns: restaurando.campaigns ?? [],
      ads: restaurando.ads ?? [],
      monthlyStats: restaurando.monthlyStats ?? [],
      leads: restaurando.leads ?? [],
      hashtagSets: restaurando.hashtagSets ?? [],
      branding,
      brandLogo: restaurando.brandLogo,
      currentClientId: restaurando.clients[0]?.id ?? '',
    });
    setRestaurando(null);
    setTrabajando(false);
  };

  return (
    <div className="card p-4">
      <p className="font-semibold text-ink-900">Copia de seguridad</p>
      <p className="mt-0.5 text-sm leading-snug text-ink-500">
        Bajá un archivo con toda tu planificación y guardalo donde guardás lo
        importante. Si algún día se pierde el servidor, lo volvés a subir acá y
        recuperás todo.
      </p>

      <p className="mt-2 text-xs text-ink-400">
        Hoy tenés {plural(estado.clients.length, 'cuenta', 'cuentas')} y{' '}
        {plural(estado.posts.length, 'contenido', 'contenidos')}. Las imágenes no
        entran en la copia: esas quedan en el servidor.
      </p>

      {error && <p className="mt-3 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700">{error}</p>}

      {restaurando ? (
        <div className="mt-3 rounded-xl bg-butter-50 p-3">
          <p className="flex items-start gap-2 text-[13px] leading-snug text-butter-700">
            <AlertTriangle size={15} className="mt-px shrink-0" />
            La copia trae {plural(restaurando.clients.length, 'cuenta', 'cuentas')} y{' '}
            {plural(restaurando.posts.length, 'contenido', 'contenidos')}, y{' '}
            <b>reemplaza todo lo que tenés ahora</b>. No se puede deshacer.
          </p>
          <div className="mt-2.5 flex gap-2">
            <button className="btn-outline !py-1.5 text-xs" onClick={() => setRestaurando(null)}>
              Cancelar
            </button>
            <button className="btn-primary !py-1.5 text-xs" onClick={confirmar} disabled={trabajando}>
              {trabajando ? <Loader2 size={14} className="animate-spin" /> : null}
              Sí, reemplazar todo
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-primary !py-1.5 text-xs" onClick={bajar}>
            <Download size={14} /> Bajar una copia
          </button>
          <button
            className="btn-outline !py-1.5 text-xs"
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={14} /> Restaurar desde un archivo
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => leer(e.target.files?.[0])}
      />
    </div>
  );
}
