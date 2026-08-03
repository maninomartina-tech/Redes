import {
  Check,
  ChevronDown,
  Cloud,
  CloudOff,
  Eye,
  Loader2,
  LogOut,
  PenTool,
  Plus,
  RotateCcw,
  TriangleAlert,
} from 'lucide-react';
import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Avatar } from '@/components/ui';
import ClientForm from '@/components/ClientForm';
import { hayServidor } from '@/lib/espacio';

/** Dónde se están guardando los cambios. */
function EstadoSincro() {
  const { estado, mensaje } = useStore((s) => s.sincro);
  const sesion = useStore((s) => s.sesion);

  if (!hayServidor()) return null;

  const [Icono, texto, clase] = !sesion
    ? [CloudOff, 'Solo en este dispositivo', 'text-ink-400']
    : estado === 'guardando' || estado === 'cargando'
      ? [Loader2, 'Guardando…', 'text-ink-400']
      : estado === 'error'
        ? [TriangleAlert, 'Sin guardar', 'text-amber-600']
        : [Check, 'Guardado', 'text-ink-400'];

  return (
    <span
      title={mensaje ?? 'Tus cambios se guardan en el servidor y los ven tus clientes.'}
      className={`hidden items-center gap-1.5 text-xs font-medium sm:inline-flex ${clase}`}
    >
      <Icono size={14} className={estado === 'guardando' ? 'animate-spin' : ''} />
      {texto}
    </span>
  );
}

export default function Topbar() {
  const { role, setRole, clients, currentClientId, setClient, resetDemo } = useStore();
  const portal = useStore((s) => s.portal);
  const sesion = useStore((s) => s.sesion);
  const cerrarSesionCreadora = useStore((s) => s.cerrarSesionCreadora);
  const [open, setOpen] = useState(false);
  const [nuevaCuenta, setNuevaCuenta] = useState(false);

  const current = clients.find((c) => c.id === currentClientId) ?? clients[0];

  // Con el link de un cliente no hay nada que elegir: es su propio espacio.
  if (portal) {
    return (
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-ink-200/70 bg-canvas/85 px-4 backdrop-blur-md md:px-6">
        <div className="flex items-center gap-2.5">
          <Avatar name={current.name} color={current.color} logoId={current.logo?.id} size={30} />
          <span className="leading-tight">
            <span className="block max-w-[12rem] truncate text-sm font-semibold text-ink-800">
              {current.name}
            </span>
            <span className="block text-[11px] text-ink-400">{current.handle}</span>
          </span>
        </div>
        <span className="chip bg-brand-100 text-brand-800">
          <Cloud size={13} /> Tu espacio
        </span>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-ink-200/70 bg-canvas/85 px-4 backdrop-blur-md md:px-6">
      {/* selector de cliente */}
      <div className="relative">
        <button
          className="btn-outline !rounded-xl !py-1.5"
          onClick={() => setOpen((o) => !o)}
        >
          <Avatar name={current.name} color={current.color} size={26} />
          <span className="max-w-[9rem] truncate font-semibold">{current.name}</span>
          <ChevronDown size={16} className="text-ink-400" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 z-20 mt-2 w-64 overflow-hidden rounded-2xl border border-ink-200/70 bg-surface p-1.5 shadow-lift">
              <p className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-ink-400">
                Cuentas de clientes
              </p>
              {clients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setClient(c.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition hover:bg-ink-50 ${
                    c.id === currentClientId ? 'bg-brand-100' : ''
                  }`}
                >
                  <Avatar name={c.name} color={c.color} logoId={c.logo?.id} size={28} />
                  <span>
                    <span className="block font-medium text-ink-800">{c.name}</span>
                    <span className="block text-xs text-ink-400">{c.handle}</span>
                  </span>
                </button>
              ))}

              <div className="mt-1.5 border-t border-ink-200/70 pt-1.5">
                <button
                  onClick={() => {
                    setOpen(false);
                    setNuevaCuenta(true);
                  }}
                  className="btn-soft w-full !justify-start !rounded-xl"
                >
                  <Plus size={16} /> Agregar cuenta
                </button>
              </div>
            </div>
          </>
        )}

        <ClientForm open={nuevaCuenta} onClose={() => setNuevaCuenta(false)} />
      </div>

      <div className="flex items-center gap-2">
        <EstadoSincro />

        <button
          className="btn-ghost hidden sm:inline-flex"
          onClick={resetDemo}
          title="Restaurar datos de ejemplo"
        >
          <RotateCcw size={16} />
        </button>

        {/* toggle de rol */}
        <div className="flex items-center rounded-xl border border-ink-200 bg-ink-50 p-0.5 text-sm">
          <button
            onClick={() => setRole('creadora')}
            className={`flex items-center gap-1.5 rounded-[0.6rem] px-3 py-1.5 font-medium transition ${
              role === 'creadora'
                ? 'bg-surface text-brand-700 shadow-soft'
                : 'text-ink-500 hover:text-ink-700'
            }`}
          >
            <PenTool size={15} /> Creadora
          </button>
          <button
            onClick={() => setRole('cliente')}
            className={`flex items-center gap-1.5 rounded-[0.6rem] px-3 py-1.5 font-medium transition ${
              role === 'cliente'
                ? 'bg-surface text-brand-700 shadow-soft'
                : 'text-ink-500 hover:text-ink-700'
            }`}
          >
            <Eye size={15} /> Cliente
          </button>
        </div>

        {sesion && (
          <button
            className="btn-ghost hidden sm:inline-flex"
            onClick={cerrarSesionCreadora}
            title="Salir"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </header>
  );
}
