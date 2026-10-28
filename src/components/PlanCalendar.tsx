import {
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  MessageSquare,
  Plus,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Post } from '@/types';
import {
  addDays,
  addMonths,
  fmt,
  fmtTime,
  isSameDay,
  isSameMonth,
  monthGrid,
  moverADia,
  startOfMonth,
  weekDays,
  weekdayNames,
} from '@/lib/date';
import { claveDelDia, useAncla } from '@/lib/hoy';
import { esHistoria, llevaCartelito, statusChip, statusCorto, statusDot, typeEmoji } from '@/lib/format';
import { GrupoDeSolapas, Solapa } from '@/components/Solapas';

// ---------------------------------------------------------------------------
// El calendario: el mes entero o una semana, con cada pieza en su día.
//
// Son dos maneras de mirar lo mismo y las dos hacen falta. El mes contesta
// "¿cómo viene el mes?" —si hay huecos de cuatro días, si todo cae el mismo
// viernes—; la semana contesta "¿qué hay que tener listo?", y ahí el título,
// la hora y el estado tienen que leerse sin abrir nada.
//
// En el teléfono no es la misma pantalla más angosta. La grilla de siete
// columnas con las piezas adentro deja celdas de 50px donde no se lee nada, y
// una lista que muestre solo los días con contenido esconde justamente los
// huecos. Así que en el mes va la grilla con puntos —se ve el mes de un
// golpe— y abajo el día que se toca, abierto; y en la semana, los siete días
// uno abajo del otro, incluidos los vacíos.
//
// Arrastrar una pieza a otro día le cambia la fecha y le respeta la hora. En
// el teléfono no hay arrastre: la fecha también se edita desde adentro de la
// pieza.
// ---------------------------------------------------------------------------

type Vista = 'mes' | 'semana';

/** Una pieza dentro de una celda del mes, en pantalla grande. */
function Pieza({
  post,
  onOpen,
  onDragStart,
  onDragEnd,
  arrastrable,
  arrastrando,
  destacar,
  cuenta,
}: {
  post: Post;
  onOpen: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  arrastrable: boolean;
  arrastrando: boolean;
  /** Diferenciar posteos de historias, porque se están viendo mezclados. */
  destacar: boolean;
  /** De qué cuenta es. Solo cuando el calendario mezcla varias. */
  cuenta?: { name: string; color: string };
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
      {/* Con varias cuentas mezcladas, de quién es importa tanto como qué es. */}
      {cuenta && (
        <div className="mt-0.5 flex min-w-0 items-center gap-1">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cuenta.color }} />
          <span className="min-w-0 truncate text-[10px] font-semibold text-ink-500">
            {cuenta.name}
          </span>
        </div>
      )}
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

/**
 * Una pieza como renglón: en el teléfono y en la vista de la semana.
 *
 * Acá sí entra el título entero, así que el renglón tiene que contestar todo
 * sin abrirse: a qué hora, qué es, en qué anda y si ya salió. El botón de
 * publicado va al costado y es de 44px, que es lo que mide un dedo.
 */
function Renglon({
  post,
  onOpen,
  onPublicado,
  cuenta,
}: {
  post: Post;
  onOpen: () => void;
  /** Sin esto no hay botón: es lo que separa su pantalla de la del cliente. */
  onPublicado?: () => void;
  cuenta?: { name: string; color: string };
}) {
  const pendientes = post.comments.filter((c) => !c.resolved).length;
  const publicado = post.status === 'publicado';

  return (
    <div
      className={`flex items-stretch gap-1 overflow-hidden rounded-xl border transition ${
        publicado
          ? 'border-ink-200/70 bg-ink-50'
          : 'border-ink-200/70 bg-surface hover:border-brand-300'
      }`}
    >
      {/* El renglón entero abre la pieza. El botón de al lado es otra cosa, y
          por eso son dos botones hermanos y no uno adentro del otro. */}
      <button
        onClick={onOpen}
        title={post.title}
        className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 text-left"
      >
        <span className="w-10 shrink-0 text-xs font-semibold tabular-nums text-ink-500">
          {fmtTime(post.date)}
        </span>
        <span className="shrink-0 text-sm">{typeEmoji[post.type]}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink-800">{post.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className={`chip !px-1.5 !py-0 text-[10px] ${statusChip[post.status]}`}>
              {statusCorto[post.status]}
            </span>
            {cuenta && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-ink-500">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: cuenta.color }}
                />
                {cuenta.name}
              </span>
            )}
            {pendientes > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-rose-500">
                <MessageSquare size={10} /> {pendientes}
              </span>
            )}
          </span>
        </span>
      </button>

      {onPublicado && !publicado && (
        <button
          onClick={onPublicado}
          title="Marcar como publicado"
          aria-label={`Marcar «${post.title}» como publicado`}
          className="grid w-11 shrink-0 place-items-center border-l border-ink-200/70 text-ink-300 transition hover:bg-mint-50 hover:text-mint-600"
        >
          <CheckCircle2 size={18} />
        </button>
      )}
    </div>
  );
}

export default function PlanCalendar({
  posts,
  onOpen,
  onCreate,
  onMove,
  onPublicado,
  soloLectura = false,
  destacarPosteos = false,
  cuentaDe,
}: {
  posts: Post[];
  onOpen: (id: string) => void;
  /** Crear una pieza en ese día (ISO con la hora por defecto ya puesta). */
  onCreate?: (iso: string) => void;
  onMove?: (id: string, iso: string) => void;
  /** Marcar una pieza como publicada de un toque, sin abrirla. */
  onPublicado?: (id: string) => void;
  soloLectura?: boolean;
  /** Con posteos e historias mezclados, distinguirlos a simple vista. */
  destacarPosteos?: boolean;
  /** De qué cuenta es cada pieza, cuando el calendario mezcla varias. */
  cuentaDe?: (post: Post) => { name: string; color: string } | undefined;
}) {
  // El día en el que está parado el calendario. Se mueve con las flechas, y
  // vuelve solo al de hoy cuando cambia el día: la app se deja abierta, y en
  // el teléfono se despierta tal como quedó.
  const { hoy, ancla, setAncla } = useAncla((d) => d);
  const [vista, setVista] = useState<Vista>('mes');
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [encima, setEncima] = useState<string | null>(null);

  // Qué día está abierto abajo de la grilla del teléfono. Nulo es "el que
  // corresponda": hoy si el mes es este, y si no el primero con algo.
  const [elegido, setElegido] = useState<string | null>(null);

  const mes = useMemo(() => startOfMonth(ancla), [ancla]);
  const diasDelMes = useMemo(() => monthGrid(mes), [mes]);
  const diasDeLaSemana = useMemo(() => weekDays(ancla), [ancla]);

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

  /** El día abierto abajo de la grilla del mes, en el teléfono. */
  const dia = useMemo(() => {
    if (elegido) {
      const encontrado = diasDelMes.find((d) => d.toDateString() === elegido);
      if (encontrado) return encontrado;
    }
    if (isSameMonth(hoy, mes)) return hoy;
    const conAlgo = diasDelMes.find((d) => isSameMonth(d, mes) && delDia(d).length > 0);
    return conAlgo ?? mes;
  }, [elegido, diasDelMes, hoy, mes, porDia]);

  const irA = (d: Date) => {
    setAncla(d);
    setElegido(null);
  };

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

  /** Lo que hace cada día de la grilla al recibir una pieza arrastrada. */
  const zonaDeSoltar = (dia: Date) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!arrastrando) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setEncima(dia.toDateString());
    },
    onDragLeave: () => setEncima((v) => (v === dia.toDateString() ? null : v)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      soltarEn(dia);
    },
  });

  const titulo =
    vista === 'mes'
      ? fmt(mes.toISOString(), 'MMMM yyyy')
      : `${fmt(diasDeLaSemana[0].toISOString(), 'd MMM')} – ${fmt(
          diasDeLaSemana[6].toISOString(),
          "d MMM"
        )}`;

  return (
    <div className="card overflow-hidden">
      {/* ---- encabezado: qué vista, y dónde estoy parada ---- */}
      <div className="flex flex-wrap items-center gap-2 border-b border-ink-200/70 px-3 py-3 sm:px-4">
        <GrupoDeSolapas etiqueta="Cómo ver el calendario">
          <Solapa activa={vista === 'mes'} onClick={() => setVista('mes')}>
            <CalendarDays size={15} /> Mes
          </Solapa>
          <Solapa activa={vista === 'semana'} onClick={() => setVista('semana')}>
            <CalendarRange size={15} /> Semana
          </Solapa>
        </GrupoDeSolapas>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            className="btn-ghost px-2"
            aria-label={vista === 'mes' ? 'Mes anterior' : 'Semana anterior'}
            onClick={() => irA(vista === 'mes' ? addMonths(ancla, -1) : addDays(ancla, -7))}
          >
            <ChevronLeft size={18} />
          </button>
          <button className="btn-outline !py-1.5" onClick={() => irA(hoy)}>
            Hoy
          </button>
          <button
            className="btn-ghost px-2"
            aria-label={vista === 'mes' ? 'Mes siguiente' : 'Semana siguiente'}
            onClick={() => irA(vista === 'mes' ? addMonths(ancla, 1) : addDays(ancla, 7))}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <h3 className="w-full min-w-0 truncate text-center text-base font-bold text-ink-900 first-letter:uppercase sm:order-first sm:w-auto sm:flex-1 sm:text-left">
          {titulo}
        </h3>
      </div>

      {vista === 'mes' ? (
        <>
          {/* ---- la grilla del mes, en pantalla grande ---- */}
          <div className="hidden md:block">
            <div className="grid grid-cols-7 border-b border-ink-200/70 bg-ink-50 text-center text-xs font-semibold text-ink-500">
              {weekdayNames.map((d) => (
                <div key={d} className="py-2">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {diasDelMes.map((d) => {
                const items = delDia(d);
                const delMes = isSameMonth(d, mes);
                const esHoy = isSameDay(d, hoy);
                const recibiendo = encima === d.toDateString();

                return (
                  <div
                    key={d.toISOString()}
                    {...zonaDeSoltar(d)}
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
                          esHoy
                            ? 'bg-brand-800 text-canvas'
                            : delMes
                              ? 'text-ink-600'
                              : 'text-ink-300'
                        }`}
                      >
                        {fmt(d.toISOString(), 'd')}
                      </span>
                      {onCreate && (
                        <button
                          title="Agregar contenido este día"
                          aria-label={`Agregar contenido el ${fmt(d.toISOString(), "d 'de' MMMM")}`}
                          className="grid h-6 w-6 place-items-center rounded-lg text-ink-300 opacity-0 transition hover:bg-brand-100 hover:text-brand-800 focus-visible:opacity-100 group-hover:opacity-100"
                          onClick={() => nuevoEn(d)}
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
                          cuenta={cuentaDe?.(p)}
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

          {/* ---- el mes en el teléfono: la grilla con puntos, y el día abierto ---- */}
          <div className="md:hidden">
            <div className="grid grid-cols-7 border-b border-ink-200/70 bg-ink-50 text-center text-[10px] font-semibold text-ink-500">
              {/* Dos letras y no una: con una, martes y miércoles son los dos
                  "M" y hay que contar columnas para saber cuál es cuál. */}
              {weekdayNames.map((d) => (
                <div key={d} className="py-1.5">
                  {d.slice(0, 2)}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {diasDelMes.map((d) => {
                const items = delDia(d);
                const delMes = isSameMonth(d, mes);
                const esHoy = isSameDay(d, hoy);
                const abierto = isSameDay(d, dia);

                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => setElegido(d.toDateString())}
                    aria-label={`${fmt(d.toISOString(), "EEEE d 'de' MMMM")}${
                      items.length ? `, ${items.length} contenidos` : ', sin contenido'
                    }`}
                    aria-pressed={abierto}
                    className={`flex min-h-[3.1rem] flex-col items-center gap-1 border-b border-r border-ink-200/70 py-1.5 transition ${
                      abierto ? 'bg-brand-100' : delMes ? 'bg-surface' : 'bg-canvas'
                    }`}
                  >
                    <span
                      className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${
                        esHoy
                          ? 'bg-brand-800 text-canvas'
                          : delMes
                            ? 'text-ink-700'
                            : 'text-ink-300'
                      }`}
                    >
                      {fmt(d.toISOString(), 'd')}
                    </span>
                    {/* Tres puntos y, si hay más, un "+". El número exacto no
                        se lee en 40px; que haya mucho o poco, sí. */}
                    <span className="flex h-1.5 items-center gap-0.5">
                      {items.slice(0, 3).map((p) => (
                        <span
                          key={p.id}
                          className={`h-1.5 w-1.5 rounded-full ${statusDot[p.status]}`}
                        />
                      ))}
                      {items.length > 3 && (
                        <span className="text-[9px] font-bold leading-none text-ink-400">+</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <ListaDelDia
              dia={dia}
              items={delDia(dia)}
              hoy={hoy}
              onOpen={onOpen}
              onPublicado={onPublicado}
              onCreate={onCreate ? () => nuevoEn(dia) : undefined}
              cuentaDe={cuentaDe}
            />
          </div>
        </>
      ) : (
        <>
          {/* ---- la semana en pantalla grande: siete columnas ---- */}
          <div className="hidden md:grid md:grid-cols-7">
            {diasDeLaSemana.map((d) => {
              const items = delDia(d);
              const esHoy = isSameDay(d, hoy);
              const recibiendo = encima === d.toDateString();

              return (
                <div
                  key={d.toISOString()}
                  {...zonaDeSoltar(d)}
                  className={`group min-h-[22rem] min-w-0 border-r border-ink-200/70 p-2 transition last:border-r-0 ${
                    recibiendo ? 'bg-brand-100 ring-2 ring-inset ring-brand-400' : ''
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={`flex items-baseline gap-1.5 rounded-lg px-1.5 py-0.5 text-xs font-semibold capitalize ${
                        esHoy ? 'bg-brand-800 text-canvas' : 'text-ink-600'
                      }`}
                    >
                      {fmt(d.toISOString(), 'EEE')}
                      <span className="text-base font-bold">{fmt(d.toISOString(), 'd')}</span>
                    </span>
                    {onCreate && (
                      <button
                        title="Agregar contenido este día"
                        aria-label={`Agregar contenido el ${fmt(d.toISOString(), "d 'de' MMMM")}`}
                        className="grid h-6 w-6 place-items-center rounded-lg text-ink-300 opacity-0 transition hover:bg-brand-100 hover:text-brand-800 focus-visible:opacity-100 group-hover:opacity-100"
                        onClick={() => nuevoEn(d)}
                      >
                        <Plus size={14} />
                      </button>
                    )}
                  </div>

                  {items.length === 0 ? (
                    <p className="px-1 py-3 text-xs text-ink-300">Sin contenido.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {items.map((p) => (
                        <Pieza
                          key={p.id}
                          post={p}
                          onOpen={() => onOpen(p.id)}
                          destacar={destacarPosteos}
                          cuenta={cuentaDe?.(p)}
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
                  )}
                </div>
              );
            })}
          </div>

          {/* ---- la semana en el teléfono: los siete días, uno abajo del otro ----
              Los días vacíos también van: el hueco del miércoles es justo lo
              que hay que ver. */}
          <div className="divide-y divide-ink-200/70 md:hidden">
            {diasDeLaSemana.map((d) => (
              <ListaDelDia
                key={d.toISOString()}
                dia={d}
                items={delDia(d)}
                hoy={hoy}
                onOpen={onOpen}
                onPublicado={onPublicado}
                onCreate={onCreate ? () => nuevoEn(d) : undefined}
                cuentaDe={cuentaDe}
                vacio="Sin contenido."
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Un día abierto: su fecha arriba y sus piezas como renglones. */
function ListaDelDia({
  dia,
  items,
  hoy,
  onOpen,
  onPublicado,
  onCreate,
  cuentaDe,
  vacio = 'No hay nada este día.',
}: {
  dia: Date;
  items: Post[];
  hoy: Date;
  onOpen: (id: string) => void;
  onPublicado?: (id: string) => void;
  onCreate?: () => void;
  cuentaDe?: (post: Post) => { name: string; color: string } | undefined;
  vacio?: string;
}) {
  const esHoy = claveDelDia(dia) === claveDelDia(hoy);
  const vacioEstaVez = items.length === 0;

  return (
    <div className="p-3">
      {/* `first-letter:uppercase` y no `capitalize`: en castellano la fecha es
          "miércoles 28 de octubre", y `capitalize` la deja "28 De Octubre". */}
      <div className="flex items-center gap-2">
        {/* La fecha entera, sin partirse: es lo que se busca al barrer la
            lista con el pulgar. Lo que se recorta, si falta lugar, es el
            "sin contenido" de al lado. */}
        <span
          className={`shrink-0 whitespace-nowrap text-sm font-bold first-letter:uppercase ${
            esHoy ? 'text-brand-800' : vacioEstaVez ? 'text-ink-400' : 'text-ink-700'
          }`}
        >
          {fmt(dia.toISOString(), "EEEE d 'de' MMMM")}
        </span>
        {esHoy && <span className="chip shrink-0 bg-brand-100 text-brand-800">Hoy</span>}
        {/* Un día vacío es un renglón y nada más: siete días con su "sin
            contenido" debajo llenaban la pantalla de nada. */}
        {vacioEstaVez && (
          <span className="min-w-0 truncate text-sm text-ink-300">{vacio}</span>
        )}
        {onCreate && (
          <button
            className="btn-ghost ml-auto shrink-0 !px-2 !py-1 text-xs"
            onClick={onCreate}
            aria-label={`Agregar contenido el ${fmt(dia.toISOString(), "d 'de' MMMM")}`}
          >
            <Plus size={15} />
          </button>
        )}
      </div>

      {!vacioEstaVez && (
        <div className="mt-2 space-y-1.5">
          {items.map((p) => (
            <Renglon
              key={p.id}
              post={p}
              onOpen={() => onOpen(p.id)}
              onPublicado={onPublicado ? () => onPublicado(p.id) : undefined}
              cuenta={cuentaDe?.(p)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
