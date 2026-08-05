import { Bell, CheckCheck, Clapperboard, MessageSquare, Sparkles, ThumbsUp } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { useBaseCliente } from '@/lib/rutas';
import { fmtDateTime } from '@/lib/date';
import {
  hayServidor,
  marcarNovedadesDelPortalVistas,
  marcarNovedadesVistas,
  novedadesDeLaCreadora,
  novedadesDelPortal,
  type Novedad,
} from '@/lib/espacio';

// ---------------------------------------------------------------------------
// La campanita.
//
// El ida y vuelta con el cliente es el corazón de la herramienta, y hasta ahora
// había que darse cuenta solo: ella abría la app a ver si alguien había
// comentado, él entraba a ver si había algo nuevo. Cuando nadie avisa, la
// respuesta llega tarde y el contenido no sale a tiempo.
//
// Es un aviso adentro de la app: aparece cuando alguno de los dos la tiene
// abierta. No suena el teléfono de nadie —para eso hace falta un servicio de
// correo o de notificaciones push, que es otra cosa y cuesta plata—.
// ---------------------------------------------------------------------------

/** Cada cuánto se pregunta si pasó algo. */
const CADA_MS = 45_000;

const ICONO: Record<Novedad['tipo'], React.ReactNode> = {
  comentario: <MessageSquare size={14} />,
  decision: <ThumbsUp size={14} />,
  pieza: <Clapperboard size={14} />,
  contenido: <Sparkles size={14} />,
};

const TONO: Record<Novedad['tipo'], string> = {
  comentario: 'bg-rose-100 text-rose-600',
  decision: 'bg-mint-100 text-mint-600',
  pieza: 'bg-sky-100 text-sky-600',
  contenido: 'bg-butter-100 text-butter-600',
};

export default function Campana() {
  const sesion = useStore((s) => s.sesion);
  const portal = useStore((s) => s.portal);
  const role = useStore((s) => s.role);
  const setClient = useStore((s) => s.setClient);
  const navigate = useNavigate();
  const base = useBaseCliente();

  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [abierta, setAbierta] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  // Del lado del cliente manda su link; del lado de ella, su sesión.
  const comoCliente = Boolean(portal);
  const puede = hayServidor() && (comoCliente || Boolean(sesion));

  const traer = useCallback(async () => {
    if (!puede) return;
    try {
      setNovedades(
        comoCliente ? await novedadesDelPortal(portal!) : await novedadesDeLaCreadora(sesion!)
      );
    } catch {
      // Sin conexión no hay novedades que mostrar; se reintenta sola.
    }
  }, [puede, comoCliente, portal, sesion]);

  useEffect(() => {
    if (!puede) {
      setNovedades([]);
      return;
    }
    void traer();
    const t = setInterval(() => void traer(), CADA_MS);
    // Volver a la pestaña es el momento más probable de que haya algo nuevo.
    const alVolver = () => document.visibilityState === 'visible' && void traer();
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [puede, traer]);

  // Un clic afuera la cierra.
  useEffect(() => {
    if (!abierta) return;
    const fuera = (e: MouseEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierta(false);
    };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [abierta]);

  if (!puede) return null;

  const sinVer = novedades.filter((n) => !n.vista_en).length;

  const marcarTodas = async () => {
    try {
      if (comoCliente) await marcarNovedadesDelPortalVistas(portal!);
      else await marcarNovedadesVistas(sesion!);
      const cuando = new Date().toISOString();
      setNovedades((ns) => ns.map((n) => ({ ...n, vista_en: n.vista_en ?? cuando })));
    } catch {
      /* si no se pudo, siguen sin ver y se reintenta al abrir de nuevo */
    }
  };

  const abrir = (n: Novedad) => {
    setAbierta(false);
    if (comoCliente) {
      navigate(`${base}/semana`);
      return;
    }
    // Del lado de ella, la novedad puede ser de otro cliente que el elegido.
    if (n.cliente_id) setClient(n.cliente_id);
    navigate(role === 'cliente' ? '/cliente/semana' : '/planificacion');
  };

  return (
    <div className="relative" ref={caja}>
      <button
        onClick={() => {
          setAbierta((v) => !v);
          if (!abierta) void traer();
        }}
        aria-label={sinVer ? `Novedades: ${sinVer} sin ver` : 'Novedades'}
        title="Novedades"
        className="btn-ghost relative px-2"
      >
        <Bell size={18} />
        {sinVer > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {sinVer > 9 ? '9+' : sinVer}
          </span>
        )}
      </button>

      {abierta && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAbierta(false)} />
          <div className="absolute right-0 z-20 mt-2 w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-ink-200/70 bg-surface shadow-lift">
            <div className="flex items-center justify-between border-b border-ink-200/70 px-3 py-2">
              <span className="text-sm font-bold text-ink-900">Novedades</span>
              {sinVer > 0 && (
                <button
                  className="btn-ghost !px-2 !py-1 text-xs"
                  onClick={() => void marcarTodas()}
                >
                  <CheckCheck size={14} /> Marcar como visto
                </button>
              )}
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {novedades.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm leading-snug text-ink-400">
                  {comoCliente
                    ? 'Cuando haya contenido nuevo para vos, te avisamos acá.'
                    : 'Cuando tus clientes comenten o aprueben algo, te avisa acá.'}
                </p>
              ) : (
                novedades.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => abrir(n)}
                    className={`flex w-full items-start gap-2.5 border-b border-ink-200/50 px-3 py-2.5 text-left transition last:border-0 hover:bg-ink-50 ${
                      n.vista_en ? '' : 'bg-brand-50/60'
                    }`}
                  >
                    <span
                      className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg ${
                        TONO[n.tipo]
                      }`}
                    >
                      {ICONO[n.tipo]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] leading-snug text-ink-800">
                        {n.texto}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-ink-400">
                        {fmtDateTime(n.creada_en)}
                      </span>
                    </span>
                    {!n.vista_en && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
