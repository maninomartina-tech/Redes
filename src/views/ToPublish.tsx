import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clipboard,
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
import { typeEmoji, typeLabel } from '@/lib/format';
import { EmptyState, MediaThumb, Modal, SectionTitle } from '@/components/ui';

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

function textoParaPegar(p: Post): string {
  const tags = p.hashtags.length ? `\n\n${p.hashtags.map((h) => `#${h}`).join(' ')}` : '';
  return `${p.copy}${tags}`.trim();
}

export default function ToPublish() {
  const client = useCurrentClient();
  const posts = useStore((s) => s.posts);

  const [publicando, setPublicando] = useState<Post | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const grupos = useMemo(() => {
    const ahora = new Date();
    const hoy = ahora;
    const enUnaSemana = new Date(ahora);
    enUnaSemana.setDate(enUnaSemana.getDate() + 7);

    const cola = posts
      .filter((p) => p.clientId === client.id && pendiente(p))
      .sort((a, b) => +new Date(a.date) - +new Date(b.date));

    return {
      atrasados: cola.filter((p) => new Date(p.date) < ahora && !isSameDay(p.date, hoy)),
      hoy: cola.filter((p) => isSameDay(p.date, hoy)),
      proximos: cola.filter((p) => {
        const d = new Date(p.date);
        return d > ahora && !isSameDay(p.date, hoy) && d <= enUnaSemana;
      }),
      despues: cola.filter((p) => new Date(p.date) > enUnaSemana),
    };
  }, [posts, client.id]);

  const total =
    grupos.atrasados.length + grupos.hoy.length + grupos.proximos.length + grupos.despues.length;

  const copiar = async (p: Post) => {
    try {
      await navigator.clipboard.writeText(textoParaPegar(p));
      setCopiado(p.id);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      setAviso('No se pudo copiar. Abrí el contenido y copialo desde ahí.');
    }
  };

  const bajar = async (p: Post) => {
    if (!p.resultado) return;
    const ok = await descargarMedia(p.resultado);
    if (!ok) {
      setAviso(
        'La pieza no está en este dispositivo. Abrila desde la computadora donde la cargaste, o volvé a subirla.'
      );
    }
  };

  const Fila = ({ p }: { p: Post }) => {
    const cuenta = client.accounts.find((a) => a.id === p.accountId);

    return (
      <div className="card flex items-center gap-3 p-3">
        {p.resultado ? (
          <MediaThumb
            media={p.resultado}
            kind={p.resultado.kind}
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
            <button className="btn-outline !py-1 text-[11px]" onClick={() => copiar(p)}>
              {copiado === p.id ? <Check size={13} /> : <Clipboard size={13} />}
              {copiado === p.id ? 'Copiado' : 'Copiar copy'}
            </button>
            <button
              className="btn-outline !py-1 text-[11px]"
              onClick={() => bajar(p)}
              disabled={!p.resultado}
            >
              <Download size={13} /> Bajar pieza
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

/** Deja constancia de que la pieza ya salió, con su link si lo tenés a mano. */
function ConfirmarPublicado({ post, onClose }: { post: Post | null; onClose: () => void }) {
  const marcarPublicado = useStore((s) => s.marcarPublicado);
  const [permalink, setPermalink] = useState('');
  const [ahora, setAhora] = useState(true);

  if (!post) return null;

  const confirmar = () => {
    marcarPublicado(post.id, {
      fecha: ahora ? new Date().toISOString() : post.date,
      permalink: permalink.trim() || undefined,
    });
    setPermalink('');
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Ya lo publiqué">
      <div className="space-y-4 p-5">
        <p className="text-sm leading-snug text-ink-600">
          <b>{post.title}</b> pasa a publicado. Tu cliente lo va a ver como salido
          y vas a poder cargarle las métricas cuando las tengas.
        </p>

        <label className="flex items-start gap-2.5 rounded-xl bg-ink-50 p-3 text-sm">
          <input
            type="checkbox"
            checked={ahora}
            onChange={(e) => setAhora(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-ink-700">
            Se subió recién
            <span className="block text-[11px] leading-snug text-ink-500">
              Si lo subiste antes, destildá esto y queda con la fecha que tenía
              planificada ({fmt(post.date, "d 'de' MMMM 'a las' HH:mm")}).
            </span>
          </span>
        </label>

        <div>
          <label className="label" htmlFor="permalink">
            Link de la publicación (opcional)
          </label>
          <div className="relative mt-1">
            <ExternalLink
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <input
              id="permalink"
              className="input pl-9"
              placeholder="https://www.instagram.com/p/..."
              value={permalink}
              onChange={(e) => setPermalink(e.target.value)}
            />
          </div>
          <p className="mt-1 text-[11px] text-ink-400">
            Sirve para abrirla rápido cuando vayas a copiar los números.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-ink-200/70 pt-4">
          <button className="btn-outline" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={confirmar}>
            <CheckCircle2 size={16} /> Marcar como publicado
          </button>
        </div>
      </div>
    </Modal>
  );
}
