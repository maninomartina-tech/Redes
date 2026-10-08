import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  ImageOff,
  Send,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useStore, useCurrentClient } from '@/store/useStore';
import type { Post } from '@/types';
import { descargarMedia } from '@/lib/media';
import { fmt, isSameDay } from '@/lib/date';
import { useHoy } from '@/lib/hoy';
import { typeEmoji, typeLabel } from '@/lib/format';
import { piezasFinales, portadaDelFeed } from '@/lib/piezas';
import { EmptyState, MediaThumb, Modal, SectionTitle } from '@/components/ui';
import SolapasDePublicacion from '@/components/SolapasDePublicacion';
import ConfirmarPublicado from '@/components/ConfirmarPublicado';
import BotonCopiar from '@/components/BotonCopiar';
import { copyParaPegar } from '@/lib/texto';

/** Todo lo que hay que tener en el teléfono para subirlo a mano. */
const archivosParaBajar = (p: Post) =>
  [...piezasFinales(p), ...(p.portada ? [p.portada] : [])];

// ---------------------------------------------------------------------------
// Para publicar.
//
// Mientras Meta no apruebe el permiso para publicar, las piezas se suben a
// mano. Esta pantalla es esa tarea: qué toca hoy, el copy listo para pegar, la
// pieza para bajar al teléfono, y un botón para dejar constancia de que ya
// salió —así el feed, las métricas y lo que ve el cliente quedan al día.
// ---------------------------------------------------------------------------

/** Lo que está listo para subir: aprobado o ya agendado, y todavía sin salir. */
const pendiente = (p: Post) => p.status === 'aprobado' || p.status === 'programado';

export default function ToPublish() {
  const client = useCurrentClient();
  const posts = useStore((s) => s.posts);

  const [publicando, setPublicando] = useState<Post | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // `hoy` cambia solo al cambiar el día: eso rehace los grupos sin recargar.
  // La hora se lee acá adentro, para que "próximos" no compare contra la
  // medianoche sino contra el momento en que se está mirando.
  const hoy = useHoy();
  const grupos = useMemo(() => {
    const ahora = new Date();
    const enUnaSemana = new Date(ahora);
    enUnaSemana.setDate(enUnaSemana.getDate() + 7);

    const cola = posts
      .filter((p) => p.clientId === client.id && pendiente(p))
      .sort((a, b) => +new Date(a.date) - +new Date(b.date));

    return {
      atrasados: cola.filter((p) => new Date(p.date) < ahora && !isSameDay(p.date, ahora)),
      hoy: cola.filter((p) => isSameDay(p.date, ahora)),
      proximos: cola.filter((p) => {
        const d = new Date(p.date);
        return d > ahora && !isSameDay(p.date, ahora) && d <= enUnaSemana;
      }),
      despues: cola.filter((p) => new Date(p.date) > enUnaSemana),
    };
  }, [posts, client.id, hoy]);

  const total =
    grupos.atrasados.length + grupos.hoy.length + grupos.proximos.length + grupos.despues.length;

  /**
   * Baja todo lo que hay que subir a mano: las imágenes del carrusel en orden,
   * y en un reel también la portada. De a una, porque el navegador rechaza las
   * descargas disparadas todas en el mismo instante.
   */
  const bajar = async (p: Post) => {
    const archivos = archivosParaBajar(p);
    if (archivos.length === 0) return;
    let falto = false;
    for (const media of archivos) {
      if (!(await descargarMedia(media))) falto = true;
    }
    if (falto) {
      setAviso(
        'La pieza no está en este dispositivo. Abrila desde la computadora donde la cargaste, o volvé a subirla.'
      );
    }
  };

  const Fila = ({ p }: { p: Post }) => {
    const cuenta = client.accounts.find((a) => a.id === p.accountId);

    return (
      <div className="card flex items-center gap-3 p-3">
        {portadaDelFeed(p) ? (
          <MediaThumb
            media={portadaDelFeed(p)}
            kind={portadaDelFeed(p)!.kind}
            className="h-16 w-16 shrink-0 rounded-xl"
          />
        ) : (
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-butter-50 text-butter-600">
            <ImageOff size={18} />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink-900">
            {typeEmoji[p.type]} {p.title}
          </p>
          <p className="text-xs text-ink-500">
            {typeLabel[p.type]} · {fmt(p.date, "EEEE d 'a las' HH:mm")}
            {cuenta && ` · ${cuenta.handle}`}
          </p>

          {!p.resultado && (
            <p className="mt-1 text-[11px] font-medium text-butter-600">
              Falta subir la pieza final.
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-1.5">
            <BotonCopiar
              texto={copyParaPegar(p)}
              etiqueta="Copiar copy"
              className="btn-outline !py-1 text-[11px]"
              onError={setAviso}
            />
            <button
              className="btn-outline !py-1 text-[11px]"
              onClick={() => bajar(p)}
              disabled={archivosParaBajar(p).length === 0}
            >
              <Download size={13} />
              {archivosParaBajar(p).length > 1
                ? `Bajar ${archivosParaBajar(p).length} archivos`
                : 'Bajar pieza'}
            </button>
            <button
              className="btn-primary !py-1 text-[11px]"
              onClick={() => setPublicando(p)}
            >
              <CheckCircle2 size={13} /> Ya lo publiqué
            </button>
          </div>
        </div>
      </div>
    );
  };

  const Grupo = ({
    titulo,
    detalle,
    items,
    tono = 'normal',
  }: {
    titulo: string;
    detalle?: string;
    items: Post[];
    tono?: 'normal' | 'alerta';
  }) => {
    if (items.length === 0) return null;
    return (
      <section className="mb-5">
        <div className="mb-2 flex items-baseline gap-2">
          <h3
            className={`text-sm font-bold ${
              tono === 'alerta' ? 'text-butter-600' : 'text-ink-800'
            }`}
          >
            {tono === 'alerta' && <AlertTriangle size={14} className="mr-1 inline" />}
            {titulo}
          </h3>
          <span className="text-xs text-ink-400">{items.length}</span>
        </div>
        {detalle && <p className="mb-2 text-xs leading-snug text-ink-500">{detalle}</p>}
        <div className="space-y-2">
          {items.map((p) => (
            <Fila key={p.id} p={p} />
          ))}
        </div>
      </section>
    );
  };

  return (
    <div>
      <SectionTitle
        title="Para publicar"
        subtitle={`Lo que hay que subir a mano en ${client.name}, en orden.`}
      />

      <SolapasDePublicacion />

      <div className="mb-4 flex items-start gap-3 rounded-xl border border-ink-200/70 bg-surface p-4 text-sm">
        <Send className="mt-0.5 shrink-0 text-brand-800" size={20} />
        <p className="text-ink-600">
          Mientras Meta no apruebe el permiso para publicar, las piezas se suben
          a mano. Acá tenés el copy listo para pegar y la pieza para bajar al
          teléfono. Cuando la subas, tocá <b>Ya lo publiqué</b>: con eso el feed,
          las métricas y lo que ve tu cliente quedan al día.
        </p>
      </div>

      {aviso && (
        <p className="mb-3 rounded-xl bg-butter-50 p-3 text-sm text-butter-700">{aviso}</p>
      )}

      {total === 0 ? (
        <EmptyState
          icon={<CheckCircle2 size={28} />}
          title="No queda nada por subir"
          hint="Cuando apruebes contenido con su pieza cargada, va a aparecer acá ordenado por fecha."
        />
      ) : (
        <>
          <Grupo
            titulo="Se pasó de hora"
            detalle="Ya venció y todavía no salió. Decidí si lo subís igual o lo reprogramás desde el calendario."
            items={grupos.atrasados}
            tono="alerta"
          />
          <Grupo titulo="Hoy" items={grupos.hoy} />
          <Grupo titulo="Esta semana" items={grupos.proximos} />
          <Grupo titulo="Más adelante" items={grupos.despues} />
        </>
      )}

      <ConfirmarPublicado post={publicando} onClose={() => setPublicando(null)} />
    </div>
  );
}

