import {
  BarChart3,
  CalendarDays,
  Grid3x3,
  Lightbulb,
  Megaphone,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import { useStore } from '@/store/useStore';

interface Item {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
}

const creadora: Item[] = [
  { to: '/calendario', label: 'Calendario', icon: CalendarDays },
  { to: '/planificacion', label: 'Plan', icon: Sparkles },
  { to: '/feed', label: 'Feed', icon: Grid3x3 },
  { to: '/metricas', label: 'Métricas', icon: BarChart3 },
  { to: '/crecimiento', label: 'Crecim.', icon: TrendingUp },
  { to: '/ads', label: 'ADS', icon: Megaphone },
];

const cliente: Item[] = [
  { to: '/cliente/semana', label: 'Semana', icon: CalendarDays },
  { to: '/cliente/feed', label: 'Feed', icon: Grid3x3 },
  { to: '/cliente/metricas', label: 'Resultados', icon: BarChart3 },
  { to: '/cliente/recomendaciones', label: 'Tips', icon: Lightbulb },
];

export default function MobileNav() {
  const role = useStore((s) => s.role);
  const nav = role === 'creadora' ? creadora : cliente;
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex justify-around border-t border-ink-200/70 bg-surface/95 px-1 py-1.5 backdrop-blur-md md:hidden">
      {nav.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1 text-[10px] font-medium ${
              isActive ? 'text-brand-700' : 'text-ink-500'
            }`
          }
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
