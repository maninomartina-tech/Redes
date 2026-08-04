import { FileUp, TriangleAlert, Upload, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { fmt, paraInput, desdeInput } from '@/lib/date';
import { interpretarHistorias, porDia } from '@/lib/historias';
import { FORMATOS_ACEPTADOS, leerArchivoDeTexto } from '@/lib/archivoDeTexto';
import { Modal } from '@/components/ui';

const EJEMPLO = `Día 1
Historia 1: Buenos días con el café recién hecho

Día 2
Historia 1: Encuesta ¿medialunas o tostado?
Historia 2: Mostramos cómo se prepara`;

/**
 * Cargar una tanda de historias de una vez.
 *
 * La planificación se escribe de corrido en otro lado y después había que
 * pasarla de a una. Acá se pega el texto —o se sube el archivo— y se crean
 * todas juntas.
 *
 * Lo que nunca hace es crear a ciegas: primero muestra exactamente qué va a
 * quedar y en qué día, y también lo que no entendió. Recién ahí hay un botón.
 */
export default function ImportarHistorias({
  open,
  onClose,
  semana,
}: {
  open: boolean;
  onClose: () => void;
  /** El lunes de la semana que se está mirando: a eso corresponde el "día 1". */
  semana: Date;
}) {
  const addPost = useStore((s) => s.addPost);
  const currentClientId = useStore((s) => s.currentClientId);

  const [texto, setTexto] = useState('');
  const [desde, setDesde] = useState(() => {
    const d = new Date(semana);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  });
  const [error, setError] = useState<string | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  // Al abrirla, el "día 1" es el lunes de la semana que se está mirando.
  useEffect(() => {
    if (!open) return;
    const d = new Date(semana);
    d.setHours(0, 0, 0, 0);
    setDesde(d.toISOString());
    setError(null);
  }, [open, semana]);

  const lectura = useMemo(
    () => interpretarHistorias(texto, new Date(desde)),
    [texto, desde]
  );
  const dias = useMemo(() => porDia(lectura.historias), [lectura]);

  const elegirArchivo = async (archivo?: File) => {
    if (!archivo) return;
    setError(null);
    try {
      const contenido = await leerArchivoDeTexto(archivo);
      setTexto(contenido);
      setNombreArchivo(archivo.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer el archivo.');
    }
    if (entrada.current) entrada.current.value = '';
  };

  const crear = () => {
    // De atrás para adelante: `addPost` pone cada una arriba de la lista, así
    // que creándolas al revés quedan en el orden en que se escribieron.
    [...lectura.historias].reverse().forEach((h) => {
      addPost({
        clientId: currentClientId,
        type: 'historia',
        title: h.titulo,
        date: h.fecha.toISOString(),
        status: 'revision',
        mediaKind: 'image',
      });
    });
    setTexto('');
    setNombreArchivo(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Cargar varias historias" wide>
      <div className="grid gap-0 md:grid-cols-[1fr_1fr]">
        {/* ---- Lo que escribís ---- */}
        <div className="space-y-4 p-5">
          <div>
            <p className="text-sm leading-snug text-ink-600">
              Pegá tu planificación tal como la escribiste, o subí el archivo. Entiende{' '}
              <b>Día 1</b>, <b>Lunes</b> o fechas como <b>12/08</b>, y abajo de cada día,
              cada historia en su renglón.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-outline !py-1.5 text-sm" onClick={() => entrada.current?.click()}>
              <FileUp size={15} /> Subir un archivo
            </button>
            <input
              ref={entrada}
              type="file"
              accept={FORMATOS_ACEPTADOS}
              className="hidden"
              aria-label="Archivo con la planificación de historias"
              onChange={(e) => void elegirArchivo(e.target.files?.[0])}
            />
            {nombreArchivo && (
              <span className="text-xs font-medium text-ink-500">{nombreArchivo}</span>
            )}
            <button
              className="btn-ghost !py-1.5 text-xs"
              onClick={() => {
                setTexto(EJEMPLO);
                setNombreArchivo(null);
              }}
            >
              Ver un ejemplo
            </button>
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-[13px] leading-snug text-rose-700">
              <TriangleAlert size={15} className="mt-px shrink-0" />
              {error}
            </p>
          )}

          <div>
            <label className="label" htmlFor="ih-texto">
              Tu planificación
            </label>
            <textarea
              id="ih-texto"
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setNombreArchivo(null);
              }}
              rows={12}
              placeholder={EJEMPLO}
              className="input mt-1 resize-y font-mono text-[13px]"
            />
          </div>

          <div>
            <label className="label" htmlFor="ih-desde">
              El «día 1» es el
            </label>
            <input
              id="ih-desde"
              type="date"
              value={paraInput(desde).slice(0, 10)}
              onChange={(e) => setDesde(desdeInput(`${e.target.value}T00:00`))}
              className="input mt-1"
            />
            <p className="mt-1 text-[11px] leading-snug text-ink-400">
              Solo se usa si escribiste «Día 1», «Día 2». Si pusiste fechas de verdad,
              mandan esas.
            </p>
          </div>
        </div>

        {/* ---- Lo que va a quedar ---- */}
        <div className="flex max-h-[68vh] flex-col border-t border-ink-200/70 md:border-l md:border-t-0">
          <div className="flex-1 overflow-y-auto p-5">
            <p className="label mb-2">Así va a quedar</p>

            {lectura.historias.length === 0 ? (
              <p className="rounded-xl bg-ink-50 p-4 text-sm leading-snug text-ink-500">
                Todavía no hay nada para crear. Pegá tu planificación o subí el archivo y
                acá vas a ver, día por día, exactamente qué se va a cargar.
              </p>
            ) : (
              <div className="space-y-3">
                {dias.map(({ dia, items }) => (
                  <div key={dia.toISOString()} className="rounded-xl border border-ink-200/70 p-3">
                    <p className="mb-1.5 text-sm font-bold text-ink-800 first-letter:uppercase">
                      {fmt(dia.toISOString(), "EEEE d 'de' MMMM")}
                      <span className="ml-2 text-xs font-medium text-ink-400">
                        {items.length} historia{items.length === 1 ? '' : 's'}
                      </span>
                    </p>
                    <ol className="space-y-1">
                      {items.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-[13px] text-ink-700">
                          <span className="mt-px flex shrink-0 items-center gap-1 text-ink-400">
                            <Zap size={13} />
                            <span className="tabular-nums text-[11px] font-semibold">
                              {h.numero}
                            </span>
                          </span>
                          <span className="min-w-0">{h.titulo}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            )}

            {lectura.sinReconocer.length > 0 && (
              <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3">
                <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-amber-900">
                  <TriangleAlert size={14} /> Esto no lo entendí
                </p>
                <ul className="space-y-0.5 text-[13px] text-amber-800">
                  {lectura.sinReconocer.map((l, i) => (
                    <li key={i} className="truncate">
                      {l}
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-[11px] leading-snug text-amber-700">
                  No se va a crear nada con esos renglones.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-ink-200/70 p-4">
            <button className="btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="btn-primary"
              onClick={crear}
              disabled={lectura.historias.length === 0}
            >
              <Upload size={16} />
              Crear {lectura.historias.length} historia
              {lectura.historias.length === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
