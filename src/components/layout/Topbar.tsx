import { ChevronDown, Eye, PenTool, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Avatar } from '@/components/ui';

export default function Topbar() {
  const { role, setRole, clients, currentClientId, setClient, resetDemo } = useStore();
  const [open, setOpen] = useState(false);
  const current = clients.find((c) => c.id === currentClientId) ?? clients[0];

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
                  <Avatar name={c.name} color={c.color} size={28} />
                  <span>
                    <span className="block font-medium text-ink-800">{c.name}</span>
                    <span className="block text-xs text-ink-400">{c.handle}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
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
      </div>
    </header>
  );
}
