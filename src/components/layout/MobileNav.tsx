import {
  CalendarDays,
  Grid3x3,
  Home,
  MoreHorizontal,
  Send,
  TrendingUp,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { useBaseCliente } from '@/lib/rutas';
import { clienteNav, creadoraNav, type NavItem } from '@/components/layout/Sidebar';

/** Accesos directos de la barra inferior. El resto vive en "Más". */
const atajosCreadora: NavItem[] = [
  { to: '/planificacion', label: 'Plan', icon: CalendarDays },
  { to: '/publicar', label: 'Publicar', icon: Send },
  { to: '/feed', label: 'Feed', icon: Grid3x3 },
  { to: '/crecimiento', label: 'Crecim.', icon: TrendingUp },
];

const atajosCliente = (base: string): NavItem[] => [
  { to: `${base}/inicio`, label: 'Inicio', icon: Home },
  { to: `${base}/semana`, label: 'Contenido', icon: CalendarDays },
  { to: `${base}/feed`, label: 'Feed', icon: Grid3x3 },
  { to: `${base}/metricas`, label: 'Resultados', icon: TrendingUp },
];

export default function MobileNav() {
  const role = useStore((s) => s.role);
  const base = useBaseCliente();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState(false);

  const atajos = role === 'creadora' ? atajosCreadora : atajosCliente(base);
  const grupos = role === 'creadora' ? creadoraNav : clienteNav(base);

  // Marca "Más" como activo cuando la sección actual no está entre los atajos.
  const enAtajos = atajos.some((a) => a.to === location.pathname);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex justify-around border-t border-ink-200/70 bg-surface/95 px-1 py-1.5 backdrop-blur-md md:hidden">
        {atajos.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1 text-[10px] font-medium ${
                isActive ? 'text-brand-800' : 'text-ink-500'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
        <button
          onClick={() => setOpenMenu(true)}
          className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1 text-[10px] font-medium ${
            !enAtajos ? 'text-brand-800' : 'text-ink-500'
          }`}
        >
          <MoreHorizontal size={20} />
          Más
        </button>
      </nav>

      {/* Hoja con todas las secciones */}
      {openMenu && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-ink-900/30 backdrop-blur-sm"
            onClick={() => setOpenMenu(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-3xl border-t border-ink-200 bg-surface p-4 pb-8">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-bold text-ink-900">Todas las secciones</span>
              <button className="btn-ghost px-2" onClick={() => setOpenMenu(false)}>
                <X size={18} />
              </button>
            </div>
            {grupos.map((g, i) => (
              <div key={g.title ?? i} className={i > 0 ? 'mt-4' : ''}>
                {g.title && (
                  <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                    {g.title}
                  </p>
                )}
                <div className="space-y-0.5">
                  {g.items.map(({ to, label, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={() => setOpenMenu(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                          isActive
                            ? 'bg-brand-100 text-brand-800'
                            : 'text-ink-600 hover:bg-ink-50'
                        }`
                      }
                    >
                      <Icon size={18} />
                      {label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
