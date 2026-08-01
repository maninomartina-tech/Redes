import {
  BarChart3,
  CalendarDays,
  Grid3x3,
  LayoutDashboard,
  Lightbulb,
  Megaphone,
  Settings,
  TrendingUp,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import Logo from '@/components/Logo';

interface Item {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
}

const creadoraNav: Item[] = [
  { to: '/panel', label: 'Panel general', icon: LayoutDashboard },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays },
  { to: '/planificacion', label: 'Planificación', icon: Sparkles },
  { to: '/feed', label: 'Vista del feed', icon: Grid3x3 },
  { to: '/historias', label: 'Historias', icon: Zap },
  { to: '/metricas', label: 'Métricas + IA', icon: BarChart3 },
  { to: '/crecimiento', label: 'Crecimiento', icon: TrendingUp },
  { to: '/ads', label: 'ADS', icon: Megaphone },
  { to: '/recomendaciones', label: 'Recomendaciones', icon: Lightbulb },
  { to: '/ajustes', label: 'Cuentas', icon: Settings },
];

const clienteNav: Item[] = [
  { to: '/cliente/semana', label: 'Mi semana', icon: CalendarDays },
  { to: '/cliente/feed', label: 'Mi feed', icon: Grid3x3 },
  { to: '/cliente/metricas', label: 'Resultados', icon: BarChart3 },
  { to: '/cliente/recomendaciones', label: 'Recomendaciones', icon: Lightbulb },
];

export default function Sidebar() {
  const role = useStore((s) => s.role);
  const nav = role === 'creadora' ? creadoraNav : clienteNav;

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-200/70 bg-surface md:flex">
      <div className="flex h-16 items-center px-5">
        <Logo size={34} />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {nav.map(({ to, label, icon: Icon }) => (
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
      </nav>

      <div className="m-3 rounded-2xl bg-brand-50 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600">
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
