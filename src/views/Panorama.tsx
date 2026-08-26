import { AlertTriangle, CalendarDays, MessageSquareWarning, Send, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import type { Post } from '@/types';
import { fmt, startOfMonth } from '@/lib/date';
import { useHoy } from '@/lib/hoy';
import { panorama, totales, type ResumenDeCuenta } from '@/lib/panorama';
import { plural } from '@/lib/texto';
import { Avatar, EmptyState, SectionTitle, Stat } from '@/components/ui';
import PlanCalendar from '@/components/PlanCalendar';
import PostDetail from '@/components/PostDetail';
import { FiltroDeTipo, filtrarPorTipo, type FiltroTipo } from '@/components/Solapas';

// ---------------------------------------------------------------------------
// Todas las cuentas juntas.
//
// El resto de la app trabaja sobre una cuenta por vez, que es como se produce
// el contenido: se entra a Aurora Skin y se piensa Aurora Skin. Pero el lunes a
// la mañana la pregunta es otra —"¿qué tengo que subir hoy?"— y contestarla
// obligaba a entrar cuenta por cuenta y sumar de memoria.
//
// Acá está todo mezclado a propósito: un calendario del mes con las piezas de
// todas las cuentas, cada una con su color, y arriba el resumen de cada una
// ordenado por lo que más reclama.
// ---------------------------------------------------------------------------

export default function Panorama() {
  const clients = useStore((s) => s.clients);
  const posts = useStore((s) => s.posts);
  const currentClientId = useStore((s) => s.currentClientId);
  const setClient = useStore((s) => s.setClient);
  const updatePost = useStore((s) => s.updatePost);
  const navigate = useNavigate();

  const [selected, setSelected] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroTipo>('todo');

  // `hoy` cambia solo cuando cambia el día: así el mes y los "atrasado / para
  // hoy" de las tarjetas se rehacen sin tener que recargar la página.
  const hoy = useHoy();
  const mes = useMemo(() => startOfMonth(hoy), [hoy]);
  const resumenes = useMemo(() => panorama(clients, posts, mes), [clients, posts, mes]);
  const total = useMemo(() => totales(resumenes), [resumenes]);

  /** El color y el nombre de cada cuenta, para pintar el calendario. */
  const porCliente = useMemo(
    () => new Map(clients.map((c) => [c.id, { name: c.name, color: c.color }])),
    [clients]
  );

  const visibles = useMemo(() => filtrarPorTipo(posts, filtro), [posts, filtro]);

  /**
   * Abrir una pieza de otra cuenta cambia la cuenta primero.
   *
   * Todo lo demás —el detalle, los comentarios, los hashtags— trabaja sobre la
   * cuenta seleccionada. Abrir una pieza ajena sin cambiarla mostraría los
   * hashtags de otro cliente adentro de su contenido.
   */
  const abrir = (id: string) => {
    const post = posts.find((p) => p.id === id);
    if (post && post.clientId !== currentClientId) setClient(post.clientId);
    setSelected(id);
  };

  const irACuenta = (clienteId: string) => {
    setClient(clienteId);
    navigate('/planificacion');
  };

  if (clients.length === 0) {
    return (
      <div>
        <SectionTitle title="Todos los clientes" />
        <EmptyState
          icon={<Users size={30} />}
          title="Todavía no hay clientes"
          hint="Creá la primera desde el selector de arriba y va a aparecer acá."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Todos los clientes"
        subtitle={`${plural(clients.length, 'cuenta', 'cuentas')} · ${fmt(
          mes.toISOString(),
          'MMMM yyyy'
        )}`}
        action={<FiltroDeTipo valor={filtro} onChange={setFiltro} posts={posts} />}
      />

      {/* Lo que reclama, sumando todas */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Atrasado"
          value={total.atrasados}
          hint={total.atrasados ? 'Ya venció y no salió' : 'Nada vencido'}
          icon={<AlertTriangle size={16} />}
        />
        <Stat
          label="Para subir hoy"
          value={total.hoy}
          icon={<Send size={16} />}
        />
        <Stat
          label="Esperando al cliente"
          value={total.enRevision}
          hint={total.enEdicion ? `${total.enEdicion} en edición` : undefined}
        />
        <Stat
          label="Comentarios sin resolver"
          value={total.comentarios}
          icon={<MessageSquareWarning size={16} />}
        />
      </div>

      {total.vacias > 0 && (
        <p className="flex items-start gap-2 rounded-xl border border-butter-200 bg-butter-50 p-3 text-sm leading-snug text-ink-700">
          <CalendarDays size={16} className="mt-px shrink-0 text-butter-600" />
          {total.vacias === 1
            ? 'Una cuenta se quedó sin contenido planificado de acá en adelante.'
            : `${total.vacias} cuentas se quedaron sin contenido planificado de acá en adelante.`}
        </p>
      )}

      {/* Una tarjeta por cuenta */}
      <div>
        <h3 className="mb-3 font-bold text-ink-900">Cuenta por cuenta</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {resumenes.map((r) => (
            <TarjetaDeCuenta
              key={r.cliente.id}
              resumen={r}
              actual={r.cliente.id === currentClientId}
              onIr={() => irACuenta(r.cliente.id)}
            />
          ))}
        </div>
      </div>

      {/* El calendario, con todo mezclado */}
      <div>
        <h3 className="mb-1 font-bold text-ink-900">Calendario general</h3>
        <p className="mb-3 text-sm text-ink-500">
          Qué se sube cada día, en todas tus cuentas. El puntito de color dice de cuál es.
          <span className="hidden sm:inline"> Se puede arrastrar para cambiar de día.</span>
        </p>
        <PlanCalendar
          posts={visibles}
          onOpen={abrir}
          onMove={(id, iso) => updatePost(id, { date: iso })}
          destacarPosteos={filtro === 'todo'}
          cuentaDe={(p: Post) => porCliente.get(p.clientId)}
        />
      </div>

      <PostDetail postId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

/** Un renglón de número, que solo aparece si hay algo que contar. */
function Dato({
  n,
  label,
  tono = 'normal',
}: {
  n: number;
  label: string;
  tono?: 'normal' | 'alerta' | 'espera';
}) {
  if (n === 0) return null;
  const color =
    tono === 'alerta'
      ? 'bg-rose-100 text-rose-700'
      : tono === 'espera'
      ? 'bg-butter-100 text-butter-700'
      : 'bg-ink-100 text-ink-600';
  return (
    <span className={`chip ${color}`}>
      <b className="tabular-nums">{n}</b> {label}
    </span>
  );
}

function TarjetaDeCuenta({
  resumen,
  actual,
  onIr,
}: {
  resumen: ResumenDeCuenta;
  actual: boolean;
  onIr: () => void;
}) {
  const { cliente, atrasados, hoy, enRevision, enEdicion, comentarios, delMes, proxima } =
    resumen;
  const tranquila = resumen.reclama === 0;

  return (
    <button
      onClick={onIr}
      // `min-w-0`: sin eso la tarjeta no baja del ancho de su chip más largo
      // —"esperando al cliente"— y en un teléfono empuja la página de costado.
      className={`card min-w-0 p-4 text-left transition hover:border-brand-300 hover:shadow-soft ${
        actual ? 'ring-2 ring-brand-300' : ''
      }`}
    >
      <div className="flex items-center gap-2.5">
        <Avatar
          name={cliente.name}
          color={cliente.color}
          logoId={cliente.logo?.id}
          size={34}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink-900">{cliente.name}</p>
          <p className="truncate text-xs text-ink-400">{cliente.handle}</p>
        </div>
        <span className="shrink-0 text-right text-xs text-ink-400">
          <b className="block text-base font-bold text-ink-700">{delMes}</b>
          este mes
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Dato n={atrasados} label="atrasado" tono="alerta" />
        <Dato n={comentarios} label="sin responder" tono="alerta" />
        <Dato n={hoy} label="para hoy" tono="espera" />
        <Dato n={enRevision} label="esperando al cliente" />
        <Dato n={enEdicion} label="en edición" />
        {tranquila && <span className="chip bg-mint-100 text-mint-600">Al día</span>}
      </div>

      <p className="mt-2.5 truncate text-xs text-ink-500">
        {proxima ? (
          <>
            Próxima: <b className="text-ink-700">{fmt(proxima.date, "EEE d 'a las' HH:mm")}</b> ·{' '}
            {proxima.title}
          </>
        ) : (
          <span className="text-butter-600">Sin nada planificado de acá en adelante.</span>
        )}
      </p>
    </button>
  );
}
