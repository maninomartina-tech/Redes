import { CalendarDays, Grid3x3, Inbox, Send, Zap } from 'lucide-react';
import { NavLink } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Las solapas de publicación.
//
// En Buffer, la barra lateral tiene las secciones grandes y adentro de cada
// una hay solapas. Acá pasa lo mismo: el menú lleva a Publicación, y una vez
// adentro se cambia de vista sin volver al menú.
//
// Se repite arriba de cada pantalla a propósito: son cinco formas de mirar lo
// mismo y moverse entre ellas es lo que más se hace en el día.
// ---------------------------------------------------------------------------

const SOLAPAS = [
  { to: '/cola', label: 'Cola', icon: Inbox },
  { to: '/planificacion', label: 'Calendario', icon: CalendarDays },
  { to: '/historias', label: 'Historias', icon: Zap },
  { to: '/publicar', label: 'Para publicar', icon: Send },
  { to: '/feed', label: 'Feed', icon: Grid3x3 },
];

export default function SolapasDePublicacion() {
  return (
    <div
      role="tablist"
      aria-label="Formas de ver el contenido"
      // Se desliza en un teléfono en vez de partirse en dos renglones.
      className="-mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-ink-200/70 px-4 sm:mx-0 sm:px-0"
    >
      {SOLAPAS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          role="tab"
          className={({ isActive }) =>
            `-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold transition ${
              isActive
                ? 'border-brand-800 text-brand-800'
                : 'border-transparent text-ink-500 hover:text-ink-800'
            }`
          }
        >
          <Icon size={15} />
          {label}
        </NavLink>
      ))}
    </div>
  );
}
