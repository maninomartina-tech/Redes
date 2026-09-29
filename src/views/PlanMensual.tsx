import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FileDown,
  Plus,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, useCurrentClient } from '@/store/useStore';
import type { FilaDePlan, PlanMensual, PostType } from '@/types';
import { paraInput, desdeInput } from '@/lib/date';
import { useHoy } from '@/lib/hoy';
import {
  claveDeMes,
  cuentaPorTipo,
  filaNueva,
  filasListas,
  filasOrdenadas,
  mesCorrido,
  nombreDeMes,
  planDeCliente,
  yaEstaEnElCalendario,
} from '@/lib/plan';
import { imprimirPlan } from '@/lib/planImpreso';
import { SectionTitle } from '@/components/ui';

// ---------------------------------------------------------------------------
// Planificación del mes.
//
// El calendario es para producir: una pieza por vez, con su estado, sus
// comentarios y sus archivos. Antes hay otro momento, que es pensar el mes
// entero de un saque —qué se busca, qué se va a desarrollar, qué sale cada día
// y con qué copy— y llevarse esa hoja para grabar.
//
// Cada contenido es una línea de datos —cuándo, qué, de dónde salió la idea— y
// abajo las dos cajas donde se escribe de verdad: el guion, que es lo que se
// lee al grabar, y el copy. Cuando el mes está pensado, ella decide pasarlo al
// calendario: hasta entonces es un borrador y del otro lado no aparece nada.
// ---------------------------------------------------------------------------

const TIPOS: { valor: PostType; nombre: string }[] = [
  { valor: 'reel', nombre: 'Reel' },
  { valor: 'post', nombre: 'Posteo' },
  { valor: 'carrusel', nombre: 'Carrusel' },
  { valor: 'historia', nombre: 'Historia' },
];

export default function PlanMensual() {
  const client = useCurrentClient();
  const planes = useStore((s) => s.planes);
  const posts = useStore((s) => s.posts);
  const guardarPlan = useStore((s) => s.guardarPlan);
  const agregarFila = useStore((s) => s.agregarFila);
  const actualizarFila = useStore((s) => s.actualizarFila);
  const quitarFila = useStore((s) => s.quitarFila);
  const pasarPlanAlCalendario = useStore((s) => s.pasarPlanAlCalendario);
  const navigate = useNavigate();

  const hoy = useHoy();
  const [mes, setMes] = useState(() => claveDeMes(hoy));
  const [aviso, setAviso] = useState<string | null>(null);

  const plan = planDeCliente(planes, client.id, mes);
  const filas = useMemo(() => filasOrdenadas(plan?.filas ?? []), [plan]);
  const cuenta = useMemo(() => cuentaPorTipo(filas), [filas]);
  const listas = useMemo(() => (plan ? filasListas(plan, posts) : []), [plan, posts]);
  const yaPasadas = filas.filter((f) => yaEstaEnElCalendario(f, posts)).length;

  /** Escribir en cualquier campo crea el plan del mes si todavía no existía. */
  const escribir = (patch: Partial<PlanMensual>) => guardarPlan(client.id, mes, patch);

  const oculto = Boolean(plan?.ocultoParaCliente);

  const nuevaFila = () => {
    const creado = guardarPlan(client.id, mes, {});
    agregarFila(creado.id, filaNueva(creado, mes, hoy));
  };

  const descargar = () => {
    setAviso(null);
    const ok = imprimirPlan({
      cliente: client,
      mes,
      objetivos: plan?.objetivos ?? '',
      plan: plan?.plan ?? '',
      filas,
    });
    if (!ok) {
      setAviso(
        'El navegador bloqueó la ventana del PDF. Permitile abrir ventanas a este sitio y probá de nuevo.',
      );
    }
  };

  const pasar = () => {
    if (!plan) return;
    setAviso(null);
    pasarPlanAlCalendario(plan.id);
    navigate('/planificacion');
  };

  return (
    <div>
      <SectionTitle
        title="Planificación"
        subtitle="Pensá el mes entero acá. Cuando esté listo, lo pasás al calendario."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-outline" onClick={descargar}>
              <FileDown size={16} /> Descargar PDF
            </button>
            <button
              className="btn-primary"
              onClick={pasar}
              disabled={listas.length === 0}
              title={
                listas.length === 0
                  ? 'Escribí el contenido o el copy de al menos una línea'
                  : `Pasar ${listas.length} al calendario`
              }
            >
              <CalendarPlus size={16} />
              Pasar al calendario
              {listas.length > 0 && <> ({listas.length})</>}
            </button>
          </div>
        }
      />

      {/* mes */}
      <div className="mb-4 flex items-center gap-2">
        <button
          className="btn-ghost px-2"
          aria-label="Mes anterior"
          onClick={() => setMes((m) => mesCorrido(m, -1))}
        >
          <ChevronLeft size={18} />
        </button>
        <h3 className="min-w-0 flex-1 truncate text-center text-base font-bold capitalize text-ink-900 sm:flex-none sm:text-left">
          {nombreDeMes(mes)}
        </h3>
        <button
          className="btn-ghost px-2"
          aria-label="Mes siguiente"
          onClick={() => setMes((m) => mesCorrido(m, 1))}
        >
          <ChevronRight size={18} />
        </button>
        {mes !== claveDeMes(hoy) && (
          <button
            className="btn-outline !py-1.5 text-xs"
            onClick={() => setMes(claveDeMes(hoy))}
          >
            Este mes
          </button>
        )}
        <span className="ml-auto hidden text-xs text-ink-400 sm:block">
          {filas.length} {filas.length === 1 ? 'contenido' : 'contenidos'}
          {cuenta.reel > 0 && ` · ${cuenta.reel} reel${cuenta.reel === 1 ? '' : 's'}`}
          {cuenta.carrusel > 0 &&
            ` · ${cuenta.carrusel} carrusel${cuenta.carrusel === 1 ? '' : 'es'}`}
          {cuenta.post > 0 && ` · ${cuenta.post} posteo${cuenta.post === 1 ? '' : 's'}`}
          {cuenta.historia > 0 &&
            ` · ${cuenta.historia} historia${cuenta.historia === 1 ? '' : 's'}`}
        </span>
      </div>

      {aviso && (
        <p className="mb-3 flex items-start gap-2 rounded-xl border border-butter-300 bg-butter-50 p-3 text-sm leading-snug text-ink-700">
          <TriangleAlert size={16} className="mt-px shrink-0 text-butter-600" />
          {aviso}
        </p>
      )}

      {/* objetivos y plan */}
      <div className="mb-4 grid gap-3 lg:grid-cols-2">
        <Texto
          id="plan-objetivos"
          label="Objetivos del mes"
          ayuda="Qué se busca. Ej: más consultas por DM, posicionar el servicio nuevo."
          valor={plan?.objetivos ?? ''}
          onChange={(objetivos) => escribir({ objetivos })}
        />
        <Texto
          id="plan-desarrollo"
          label="Qué se va a desarrollar"
          ayuda="El plan para lograrlo: los ejes, los formatos, lo que se va a probar."
          valor={plan?.plan ?? ''}
          onChange={(v) => escribir({ plan: v })}
        />
      </div>

      {/* Qué de todo esto ve el cliente. Va acá abajo de los dos textos,
          pegado a lo que describe: es lo único del plan que le llega. */}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <button
          className={`chip ${
            oculto ? 'bg-ink-100 text-ink-500' : 'bg-mint-100 text-mint-600'
          }`}
          onClick={() => escribir({ ocultoParaCliente: !oculto })}
          title={
            oculto
              ? 'Mostrarle al cliente los objetivos y el plan de este mes'
              : 'Dejar de mostrárselos mientras los escribís'
          }
        >
          {oculto ? <EyeOff size={13} /> : <Eye size={13} />}
          {oculto ? 'El cliente no ve esto' : 'El cliente ve esto'}
        </button>
        <span className="text-xs leading-snug text-ink-400">
          {oculto
            ? 'Los objetivos y el plan de este mes quedan solo para vos.'
            : 'Ve los objetivos y el plan, no las líneas de abajo.'}
        </span>
      </div>

      {/* la tabla */}
      <div className="card overflow-hidden">
        {/* Los encabezados son de la línea de arriba de cada contenido. El
            guion y el copy van abajo, con su propia etiqueta: son cajas de
            escribir, no celdas, y necesitan todo el ancho. */}
        <div className="hidden gap-3 border-b border-ink-200/70 bg-ink-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500 md:grid md:grid-cols-[150px_128px_minmax(0,1fr)_32px]">
          <span>Fecha</span>
          <span>Tipo</span>
          <span>Referencia</span>
          <span />
        </div>

        {filas.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-400">
            Todavía no hay contenido en {nombreDeMes(mes)}.
          </p>
        ) : (
          <div className="divide-y divide-ink-200/70">
            {filas.map((fila, i) => (
              <Renglon
                key={fila.id}
                fila={fila}
                numero={i + 1}
                enElCalendario={yaEstaEnElCalendario(fila, posts)}
                onCambio={(patch) => plan && actualizarFila(plan.id, fila.id, patch)}
                onBorrar={() => plan && quitarFila(plan.id, fila.id)}
              />
            ))}
          </div>
        )}

        <div className="border-t border-ink-200/70 p-3">
          <button className="btn-outline !py-1.5 text-sm" onClick={nuevaFila}>
            <Plus size={15} /> Agregar contenido
          </button>
        </div>
      </div>

      {/* En qué estado está el mes: es lo que explica el botón de arriba,
          incluso —sobre todo— cuando está apagado. */}
      <p className="mt-3 text-sm leading-snug text-ink-500">
        <b className="text-ink-700">{estadoDelMes(filas.length, listas.length, yaPasadas)}</b>{' '}
        Al pasarlo, cada línea escrita —con el guion, con el copy o con los dos— se
        convierte en un contenido del calendario, en revisión, esperando al cliente. Lo que
        ya pasó no se duplica.
      </p>
    </div>
  );
}

/** Una frase que dice en qué está el mes, para que el botón no quede mudo. */
function estadoDelMes(cuantas: number, listas: number, pasadas: number): string {
  if (cuantas === 0) return 'Agregá el contenido del mes para empezar.';
  if (listas > 0) {
    return listas === 1
      ? '1 contenido listo para pasar al calendario.'
      : `${listas} contenidos listos para pasar al calendario.`;
  }
  if (pasadas > 0) return 'Todo lo escrito ya está en el calendario.';
  return 'Escribí el contenido o el copy para poder pasarlo al calendario.';
}

function Texto({
  id,
  label,
  ayuda,
  valor,
  onChange,
}: {
  id: string;
  label: string;
  ayuda: string;
  valor: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="card p-4">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        rows={4}
        className="input mt-1 resize-y"
        placeholder={ayuda}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/**
 * Una línea del plan.
 *
 * En una pantalla grande es una fila de tabla; en un teléfono, los mismos
 * campos uno abajo del otro con su etiqueta. La etiqueta existe en las dos:
 * en la grande está arriba de todo, en la chica al lado de cada campo.
 */
function Renglon({
  fila,
  numero,
  enElCalendario,
  onCambio,
  onBorrar,
}: {
  fila: FilaDePlan;
  numero: number;
  enElCalendario: boolean;
  onCambio: (patch: Partial<FilaDePlan>) => void;
  onBorrar: () => void;
}) {
  return (
    <div className="p-3 md:px-4">
      <div className="grid gap-2 md:grid-cols-[150px_128px_minmax(0,1fr)_32px] md:items-center md:gap-3">
        <Celda etiqueta="Fecha">
          <input
            type="date"
            className="input !py-1.5 text-sm"
            aria-label={`Fecha del contenido ${numero}`}
            value={paraInput(fila.fecha).slice(0, 10)}
            onChange={(e) =>
              e.target.value && onCambio({ fecha: desdeInput(`${e.target.value}T12:00`) })
            }
          />
        </Celda>

        <Celda etiqueta="Tipo">
          <select
            className="input !py-1.5 text-sm"
            aria-label={`Tipo del contenido ${numero}`}
            value={fila.tipo}
            onChange={(e) => onCambio({ tipo: e.target.value as PostType })}
          >
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.nombre}
              </option>
            ))}
          </select>
        </Celda>

        <Celda etiqueta="Referencia">
          <input
            type="url"
            className="input !py-1.5 text-sm"
            placeholder="Link, si hace falta"
            aria-label={`Referencia del contenido ${numero}`}
            value={fila.referencia ?? ''}
            onChange={(e) => onCambio({ referencia: e.target.value })}
          />
        </Celda>

        <div className="flex items-center justify-end gap-2 md:justify-center">
          {enElCalendario && (
            <span
              className="chip bg-mint-100 text-mint-600 md:hidden"
              title="Ya está en el calendario"
            >
              En el calendario
            </span>
          )}
          {enElCalendario && (
            <span
              className="hidden h-2 w-2 shrink-0 rounded-full bg-mint-400 md:block"
              title="Ya está en el calendario"
              aria-label={`El contenido ${numero} ya está en el calendario`}
            />
          )}
          <button
            className="text-ink-300 transition hover:text-rose-600"
            onClick={onBorrar}
            aria-label={`Borrar el contenido ${numero}`}
            title="Borrar esta línea"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Lo que se lee al grabar y lo que se pega al publicar. Las dos cajas
          grandes, una al lado de la otra cuando hay lugar. */}
      <div className="mt-2 grid gap-2 lg:grid-cols-2 lg:gap-3">
        <CajaDeTexto
          etiqueta={etiquetaDelGuion(fila.tipo)}
          placeholder={placeholderDelGuion(fila.tipo)}
          aria-label={`Contenido del contenido ${numero}`}
          valor={fila.contenido ?? ''}
          onChange={(contenido) => onCambio({ contenido })}
        />
        <CajaDeTexto
          etiqueta="Copy"
          placeholder="El texto que va a acompañar la pieza"
          aria-label={`Copy del contenido ${numero}`}
          valor={fila.copy}
          onChange={(copy) => onCambio({ copy })}
        />
      </div>
    </div>
  );
}

/** Un ejemplo de cómo se escribe, según lo que se vaya a grabar. */
function placeholderDelGuion(tipo: PostType): string {
  if (tipo === 'reel') return 'Escena 1 (0-2s): …\nEscena 2 (2-8s): …\nEscena 3: el cierre';
  if (tipo === 'carrusel') return 'Placa 1: el gancho\nPlaca 2: …\nÚltima placa: el cierre';
  if (tipo === 'historia') return 'Qué se muestra y qué dice la placa';
  return 'La idea escrita: qué se ve y qué cuenta';
}

/** Cómo se llama el guion según lo que se vaya a grabar. */
function etiquetaDelGuion(tipo: PostType): string {
  if (tipo === 'reel') return 'Contenido del reel (el diálogo)';
  if (tipo === 'carrusel') return 'Contenido del carrusel (placa por placa)';
  if (tipo === 'historia') return 'Contenido de la historia';
  return 'Contenido del posteo';
}

/**
 * Una caja de escribir de verdad.
 *
 * Crece con lo que se escribe hasta un tope y después hace scroll: un guion de
 * reel son diez renglones, y tener que arrastrar la esquinita cada vez para
 * leerlo entero es lo que hace que uno deje de escribirlo acá.
 */
function CajaDeTexto({
  etiqueta,
  placeholder,
  valor,
  onChange,
  'aria-label': ariaLabel,
}: {
  etiqueta: string;
  placeholder: string;
  valor: string;
  onChange: (v: string) => void;
  'aria-label': string;
}) {
  const caja = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = caja.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight + 2, 460)}px`;
  }, [valor]);

  return (
    <div className="min-w-0">
      <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
        {etiqueta}
      </p>
      <textarea
        ref={caja}
        rows={6}
        className="input min-h-[7.5rem] resize-y py-2 text-sm leading-relaxed"
        placeholder={placeholder}
        aria-label={ariaLabel}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** La etiqueta solo se ve en el teléfono: arriba ya está la de la columna. */
function Celda({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400 md:hidden">
        {etiqueta}
      </p>
      {children}
    </div>
  );
}
