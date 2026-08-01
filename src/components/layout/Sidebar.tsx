import {
  BarChart3,
  CalendarDays,
  Grid3x3,
  LayoutDashboard,
  Lightbulb,
  Megaphone,
  Settings,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import Logo from '@/components/Logo';

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
}

export interface NavGroup {
  /** Sin título si el grupo va suelto arriba de todo */
  title?: string;
  items: NavItem[];
}

export const creadoraNav: NavGroup[] = [
  { items: [{ to: '/panel', label: 'Panel general', icon: LayoutDashboard }] },
  {
    title: 'Contenido',
    items: [
      { to: '/calendario', label: 'Calendario', icon: CalendarDays },
      { to: '/planificacion', label: 'Planificación', icon: Sparkles },
      { to: '/historias', label: 'Historias', icon: Zap },
      { to: '/feed', label: 'Vista del feed', icon: Grid3x3 },
    ],
  },
  {
    title: 'Resultados',
    items: [
      { to: '/crecimiento', label: 'Crecimiento', icon: TrendingUp },
      { to: '/metricas', label: 'Métricas + IA', icon: BarChart3 },
      { to: '/ads', label: 'ADS', icon: Megaphone },
      { to: '/recomendaciones', label: 'Recomendaciones', icon: Lightbulb },
    ],
  },
  {
    title: 'Configuración',
    items: [{ to: '/ajustes', label: 'Cuentas', icon: Settings }],
  },
];

export const clienteNav: NavGroup[] = [
  {
    title: 'Mi contenido',
    items: [
      { to: '/cliente/semana', label: 'Mi semana', icon: CalendarDays },
      { to: '/cliente/feed', label: 'Mi feed', icon: Grid3x3 },
    ],
  },
  {
    title: 'Resultados',
    items: [
      { to: '/cliente/metricas', label: 'Resultados', icon: BarChart3 },
      { to: '/cliente/recomendaciones', label: 'Recomendaciones', icon: Lightbulb },
    ],
  },
];

export default function Sidebar() {
  const role = useStore((s) => s.role);
  const groups = role === 'creadora' ? creadoraNav : clienteNav;

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-200/70 bg-surface md:flex">
      <div className="flex h-16 items-center px-5">
        <Logo size={34} />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {groups.map((group, i) => (
          <div key={group.title ?? i} className={i > 0 ? 'mt-4' : ''}>
            {group.title && (
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? 'bg-brand-100 text-brand-800'
                        : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
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
      </nav>

      <div className="m-3 rounded-2xl bg-brand-50 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">
          {role === 'creadora' ? 'Modo creadora' : 'Modo cliente'}
        </p>
        <p className="mt-1 text-[13px] leading-snug text-ink-600">
          {role === 'creadora'
            ? 'Planificás, producís y publicás. El cliente ve solo lo aprobado.'
            : 'Mirás tu contenido semana a semana y dejás comentarios.'}
        </p>
      </div>
    </aside>
  );
}
