import { CalendarDays, ClipboardList, Settings, TrendingUp } from 'lucide-react';
import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { useBaseCliente } from '@/lib/rutas';
import Logo from '@/components/Logo';

// ---------------------------------------------------------------------------
// El menú.
//
// Cuatro lugares y nada más, los mismos arriba en la computadora y abajo en el
// teléfono. Cuatro entran en una barra de 390px sin partir las palabras y sin
// un botón de "Más", que es donde van a morir las secciones que uno no se
// anima a borrar.
//
// El orden es el del trabajo: primero se piensa el mes (Planificación), después
// se produce día por día (Calendario), después se mira cómo salió
// (Crecimiento). Ajustes queda al final porque se toca una vez.
// ---------------------------------------------------------------------------

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
}

export const creadoraNav: NavItem[] = [
  { to: '/plan', label: 'Planificación', icon: ClipboardList },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays },
  { to: '/crecimiento', label: 'Crecimiento', icon: TrendingUp },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
];

/** El menú del cliente cuelga de dónde entró: su link o la vista previa. */
export const clienteNav = (base: string): NavItem[] => [
  { to: `${base}/contenido`, label: 'Tu contenido', icon: CalendarDays },
  { to: `${base}/crecimiento`, label: 'Tu crecimiento', icon: TrendingUp },
];

export default function Sidebar() {
  const role = useStore((s) => s.role);
  const portal = useStore((s) => s.portal);
  const base = useBaseCliente();
  const items = role === 'creadora' ? creadoraNav : clienteNav(base);

  // El cliente no está en un "modo": está en su espacio. Hablarle de modos es
  // mostrarle la costura de la herramienta.
  const pie = portal
    ? {
        titulo: 'Tu espacio',
        texto: 'Mirás lo que se va a publicar, dejás comentarios y aprobás.',
      }
    : role === 'creadora'
      ? {
          titulo: 'Modo creadora',
          texto: 'Planificás, producís y publicás. El cliente ve solo lo aprobado.',
        }
      : {
          titulo: 'Vista previa del cliente',
          texto: 'Así se ve lo que le llega. Los cambios que hagas acá son reales.',
        };

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-200/70 bg-surface md:flex">
      <div className="flex h-16 items-center px-5">
        <Logo size={34} />
      </div>

      <nav aria-label="Menú" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {items.map(({ to, label, icon: Icon }) => (
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
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">
          {pie.titulo}
        </p>
        <p className="mt-1 text-[13px] leading-snug text-ink-600">{pie.texto}</p>
      </div>

      {/* Una política de privacidad que no se puede encontrar desde la app no
          sirve de mucho, y el cliente entra por acá. */}
      <p className="mb-3 px-4 text-[11px] text-ink-400">
        <a href="/privacidad" target="_blank" rel="noreferrer" className="hover:text-ink-600">
          Privacidad
        </a>
        {' · '}
        <a href="/eliminar-datos" target="_blank" rel="noreferrer" className="hover:text-ink-600">
          Eliminar mis datos
        </a>
      </p>
    </aside>
  );
}
