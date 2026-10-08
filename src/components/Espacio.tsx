import { HardDrive, Loader2, Trash2, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import {
  barrerSinDueno,
  consultarAlmacenamiento,
  type Almacenamiento,
} from '@/lib/almacenamiento';
import { enMegas, loQueSePuedeLiberar } from '@/lib/limpieza';
import { Toggle } from '@/components/ui';

// ---------------------------------------------------------------------------
// El espacio, a la vista.
//
// El disco del servidor es de 1 GB y un reel pesa 100 MB: sin esto, que se
// esté llenando se descubre el día que una subida falla y las piezas del
// cliente dejan de abrir.
//
// Acá se ve cuánto hay, cuánto se va a liberar solo y cuánto es basura que
// quedó de reemplazar piezas. Y se puede apagar: borrar archivos es
// irreversible, así que no puede ser una decisión escondida.
// ---------------------------------------------------------------------------

const OPCIONES = [
  { dias: 30, texto: 'Un mes' },
  { dias: 60, texto: 'Dos meses' },
  { dias: 90, texto: 'Tres meses' },
  { dias: 365, texto: 'Un año' },
];

export default function Espacio() {
  const posts = useStore((s) => s.posts);
  const sesion = useStore((s) => s.sesion);
  const limpieza = useStore((s) => s.limpieza);
  const configurarLimpieza = useStore((s) => s.configurarLimpieza);
  const liberarArchivosViejos = useStore((s) => s.liberarArchivosViejos);

  const [servidor, setServidor] = useState<Almacenamiento | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const consultar = async () => {
    if (!sesion) return;
    setServidor(await consultarAlmacenamiento(sesion));
  };

  useEffect(() => {
    void consultar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion]);

  const seVaALiberar = loQueSePuedeLiberar(posts, { dias: limpieza.dias });

  const liberarAhora = async () => {
    setTrabajando(true);
    setAviso(null);
    try {
      const r = await liberarArchivosViejos();
      const sueltos = sesion ? await barrerSinDueno(sesion) : null;
      const total = r.bytes + (sueltos?.bytes ?? 0);

      setAviso(
        total > 0
          ? `Se liberaron ${enMegas(total)}: ${r.contenidos} contenido(s) publicados y ` +
            `${sueltos?.borrados ?? 0} archivo(s) sueltos.`
          : 'No había nada para liberar todavía.'
      );
      await consultar();
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <HardDrive className="mt-0.5 shrink-0 text-ink-400" size={20} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink-800">Espacio guardado</p>
          <p className="mt-0.5 text-sm leading-snug text-ink-500">
            {servidor
              ? `${servidor.archivos} archivo(s) en el ${servidor.donde}, ${enMegas(
                  servidor.bytes
                )} en total.`
              : 'Consultando el servidor…'}
            {servidor && servidor.sinDueno > 0 && (
              <>
                {' '}
                De eso, <b className="text-ink-700">{enMegas(servidor.bytesSinDueno)}</b> son
                archivos que ya no usa ningún contenido.
              </>
            )}
          </p>

          <div className="mt-3 rounded-xl border border-ink-200/70 bg-ink-50/60 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink-800">
                Liberar sola las piezas ya publicadas
              </p>
              <Toggle
                checked={limpieza.activa}
                onChange={(activa) => configurarLimpieza({ activa })}
                label="Liberar sola las piezas ya publicadas"
              />
            </div>

            <p className="mt-1 text-sm leading-snug text-ink-600">
              De un contenido <b>que ya se publicó</b> y salió hace más de{' '}
              {OPCIONES.find((o) => o.dias === limpieza.dias)?.texto.toLowerCase() ??
                `${limpieza.dias} días`}
              , se borra el video o la foto. El contenido queda entero —título, copy, guion,
              comentarios y métricas—: lo único que desaparece es el archivo, que desde que
              salió vive en Instagram.
            </p>
            <p className="mt-1 text-xs leading-snug text-ink-400">
              Lo que todavía no se publicó no se toca nunca, tenga la fecha que tenga.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="label" htmlFor="limpieza-dias">
                Conservar
              </label>
              <select
                id="limpieza-dias"
                className="input !w-auto !py-1.5 text-sm"
                value={limpieza.dias}
                onChange={(e) => configurarLimpieza({ dias: Number(e.target.value) })}
              >
                {OPCIONES.map((o) => (
                  <option key={o.dias} value={o.dias}>
                    {o.texto}
                  </option>
                ))}
              </select>

              <button
                className="btn-outline !py-1.5 text-sm"
                onClick={() => void liberarAhora()}
                disabled={trabajando}
              >
                {trabajando ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Liberar ahora
              </button>

              <span className="text-xs text-ink-500">
                {seVaALiberar.posts.length > 0
                  ? `${seVaALiberar.posts.length} contenido(s), ${enMegas(seVaALiberar.bytes)}`
                  : 'Nada pendiente'}
              </span>
            </div>
          </div>

          {aviso && (
            <p className="mt-3 rounded-xl bg-mint-100/60 p-3 text-sm leading-snug text-ink-700">
              {aviso}
            </p>
          )}

          {!limpieza.activa && (
            <p className="mt-3 flex items-start gap-2 rounded-xl border border-butter-300 bg-butter-50 p-3 text-sm leading-snug text-ink-700">
              <TriangleAlert size={16} className="mt-px shrink-0 text-butter-600" />
              Apagado, nada se libera solo. Cuando el disco se llene, las subidas van a
              empezar a fallar y las piezas de tus clientes a no abrir.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
