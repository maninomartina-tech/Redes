import { ChevronLeft, ChevronRight, GripVertical, MessageSquare, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Post } from '@/types';
import {
  addDays,
  fmt,
  fmtTime,
  isSameDay,
  isSameMonth,
  monthGrid,
  moverADia,
  startOfMonth,
  weekdayNames,
} from '@/lib/date';
import { esHistoria, llevaCartelito, statusChip, statusCorto, typeEmoji } from '@/lib/format';

// ---------------------------------------------------------------------------
// El calendario del mes, con cada publicación en su día.
//
// Se puede arrastrar una pieza a otro día: cambia la fecha y le respeta la
// hora. Arrastrar no existe en el celular, así que la fecha también se edita
// desde el contenido —ahí está el campo—; acá el toque abre la pieza.
//
// El cartelito de etapa aparece solo en revisión, edición y aprobado: lo
// programado y lo publicado ya salió del circuito y no hay nada que esperar.
// ---------------------------------------------------------------------------

/** Una publicación dentro de un día. */
function Pieza({
  post,
  onOpen,
  onDragStart,
  onDragEnd,
  arrastrable,
  arrastrando,
  destacar,
}: {
  post: Post;
  onOpen: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  arrastrable: boolean;
  arrastrando: boolean;
  /** Diferenciar posteos de historias, porque se están viendo mezclados. */
  destacar: boolean;
}) {
  const pendientes = post.comments.filter((c) => !c.resolved).length;

  // Un posteo queda en el perfil; una historia dura un día. Mezclados en la
  // misma celda, el posteo tiene que saltar primero a la vista: lleva un filo
  // de color y el fondo del papel, y la historia queda en segundo plano.
  const historia = esHistoria(post.type);
  const peso = !destacar
    ? 'border-ink-200/70 bg-surface'
    : historia
      ? 'border-ink-200/60 border-dashed bg-canvas'
      : 'border-ink-200/70 border-l-[3px] border-l-brand-500 bg-surface shadow-soft';

  return (
    <div
      draggable={arrastrable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        // Firefox no arranca el arrastre si no se escribe algo.
        e.dataTransfer.setData('text/plain', post.id);
        onDragStart?.();
      }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      title={post.title}
      className={`group/pieza w-full min-w-0 rounded-lg border px-1.5 py-1 text-left transition hover:border-brand-300 hover:bg-brand-50 ${peso} ${
        arrastrable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } ${arrastrando ? 'opacity-40' : ''}`}
    >
      {/* Arriba, la etapa y la hora. Abajo, el título con toda la línea para
          él: en una celda de calendario, compartir renglón lo dejaba en dos
          palabras y tres puntos. */}
      <div className="flex items-center gap-1">
        {llevaCartelito(post.status) && (
          <span
            className={`rounded-full px-1.5 py-px text-[10px] font-semibold leading-tight ${
              statusChip[post.status]
            }`}
          >
            {statusCorto[post.status]}
          </span>
        )}
        <span className="text-[10px] font-medium text-ink-400">{fmtTime(post.date)}</span>
        {pendientes > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-rose-500">
            <MessageSquare size={9} /> {pendientes}
          </span>
        )}
        {arrastrable && (
          <GripVertical
            size={11}
            className="ml-auto text-ink-300 opacity-0 transition group-hover/pieza:opacity-100"
          />
        )}
      </div>
      <div className="mt-0.5 flex min-w-0 items-baseline gap-1">
        <span className="shrink-0 text-[11px]">{typeEmoji[post.type]}</span>
        <span
          className={`min-w-0 flex-1 truncate text-[11px] ${
            destacar && historia ? 'font-medium text-ink-500' : 'font-semibold text-ink-800'
          }`}
        >
          {post.title}
        </span>
      </div>
    </div>
  );
}

export default function PlanCalendar({
  posts,
  onOpen,
  onCreate,
  onMove,
  soloLectura = false,
  destacarPosteos = false,
}: {
  posts: Post[];
  onOpen: (id: string) => void;
  /** Crear una pieza en ese día (ISO con la hora por defecto ya puesta). */
  onCreate?: (iso: string) => void;
  onMove?: (id: string, iso: string) => void;
  soloLectura?: boolean;
  /** Con posteos e historias mezclados, distinguirlos a simple vista. */
  destacarPosteos?: boolean;
}) {
  const [ancla, setAncla] = useState(() => startOfMonth(new Date()));
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [encima, setEncima] = useState<string | null>(null);

  const dias = useMemo(() => monthGrid(ancla), [ancla]);

  /** Las publicaciones de cada día, ordenadas por hora. */
  const porDia = useMemo(() => {
    const mapa = new Map<string, Post[]>();
    posts.forEach((p) => {
      const clave = new Date(p.date).toDateString();
      const lista = mapa.get(clave);
      if (lista) lista.push(p);
      else mapa.set(clave, [p]);
    });
    mapa.forEach((lista) => lista.sort((a, b) => a.date.localeCompare(b.date)));
    return mapa;
  }, [posts]);

  const delDia = (dia: Date) => porDia.get(dia.toDateString()) ?? [];

  const arrastrable = !soloLectura && Boolean(onMove);

  const soltarEn = (dia: Date) => {
    setEncima(null);
    const id = arrastrando;
    setArrastrando(null);
    if (!id || !onMove) return;
    const post = posts.find((p) => p.id === id);
    if (!post || isSameDay(new Date(post.date), dia)) return;
    onMove(id, moverADia(post.date, dia));
  };

  const nuevoEn = (dia: Date) => {
    const d = new Date(dia);
    d.setHours(12, 0, 0, 0); // hora por defecto de una pieza nueva
    onCreate?.(d.toISOString());
  };

  /** Los días del mes que tienen algo, para la lista del celular. */
  const conContenido = useMemo(
    () => dias.filter((d) => isSameMonth(d, ancla) && delDia(d).length > 0),
    [dias, ancla, porDia]
  );

  return (
    <div className="card overflow-hidden">
      {/* mes */}
      <div className="flex items-center justify-between gap-2 border-b border-ink-200/70 px-3 py-3 sm:px-4">
        <h3 className="min-w-0 truncate text-base font-bold capitalize text-ink-900">
          {fmt(ancla.toISOString(), 'MMMM yyyy')}
        </h3>
        <div className="flex shrink-0 items-center gap-1">
          <button
            className="btn-ghost px-2"
            aria-label="Mes anterior"
            onClick={() => setAncla((a) => startOfMonth(addDays(a, -1)))}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="btn-outline !py-1.5"
            onClick={() => setAncla(startOfMonth(new Date()))}
          >
            Hoy
          </button>
          <button
            className="btn-ghost px-2"
            aria-label="Mes siguiente"
            onClick={() => setAncla((a) => startOfMonth(addDays(a, 32)))}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* ---- grilla del mes (pantallas grandes) ---- */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 border-b border-ink-200/70 bg-ink-50 text-center text-xs font-semibold text-ink-500">
          {weekdayNames.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {dias.map((dia) => {
            const items = delDia(dia);
            const delMes = isSameMonth(dia, ancla);
            const hoy = isSameDay(dia, new Date());
            const recibiendo = encima === dia.toDateString();

            return (
              <div
                key={dia.toISOString()}
                onDragOver={(e) => {
                  if (!arrastrando) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setEncima(dia.toDateString());
                }}
                onDragLeave={() => setEncima((v) => (v === dia.toDateString() ? null : v))}
                onDrop={(e) => {
                  e.preventDefault();
                  soltarEn(dia);
                }}
                className={`group min-h-[116px] min-w-0 border-b border-r border-ink-200/70 p-1.5 transition ${
                  recibiendo
                    ? 'bg-brand-100 ring-2 ring-inset ring-brand-400'
                    : delMes
                    ? 'bg-surface'
                    : 'bg-canvas'
                }`}
              >
                <div className="mb-1 flex items-center justify-between px-0.5">
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${
                      hoy
                        ? 'bg-brand-800 text-canvas'
                        : delMes
                        ? 'text-ink-600'
                        : 'text-ink-300'
                    }`}
                  >
                    {fmt(dia.toISOString(), 'd')}
                  </span>
                  {onCreate && (
                    <button
                      title="Agregar contenido este día"
                      aria-label={`Agregar contenido el ${fmt(dia.toISOString(), "d 'de' MMMM")}`}
                      className="grid h-6 w-6 place-items-center rounded-lg text-ink-300 opacity-0 transition hover:bg-brand-100 hover:text-brand-800 focus-visible:opacity-100 group-hover:opacity-100"
                      onClick={() => nuevoEn(dia)}
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  {items.map((p) => (
                    <Pieza
                      key={p.id}
                      post={p}
                      onOpen={() => onOpen(p.id)}
                      destacar={destacarPosteos}
                      arrastrable={arrastrable}
                      arrastrando={arrastrando === p.id}
                      onDragStart={() => setArrastrando(p.id)}
                      onDragEnd={() => {
                        setArrastrando(null);
                        setEncima(null);
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---- lista por día (celular) ----
          La grilla de 7 columnas no entra en un teléfono: los días quedarían
          de 50px y no se leería nada. Acá van solo los días con contenido. */}
      <div className="divide-y divide-ink-200/70 md:hidden">
        {conContenido.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-ink-400">
            No hay contenido este mes.
          </p>
        )}
        {conContenido.map((dia) => (
          <div key={dia.toISOString()} className="p-3">
            <div className="mb-2 flex items-center justify-between">
              <span
                className={`text-sm font-bold capitalize ${
                  isSameDay(dia, new Date()) ? 'text-brand-800' : 'text-ink-700'
                }`}
              >
                {fmt(dia.toISOString(), "EEEE d")}
              </span>
              {onCreate && (
                <button
                  className="btn-ghost !px-2 !py-1 text-xs"
                  onClick={() => nuevoEn(dia)}
                  aria-label={`Agregar contenido el ${fmt(dia.toISOString(), "d 'de' MMMM")}`}
                >
                  <Plus size={14} />
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              {delDia(dia).map((p) => (
                <Pieza
                  key={p.id}
                  post={p}
                  onOpen={() => onOpen(p.id)}
                  destacar={destacarPosteos}
                  arrastrable={false}
                  arrastrando={false}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
