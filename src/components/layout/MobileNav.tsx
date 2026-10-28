import { NavLink } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { useBaseCliente } from '@/lib/rutas';
import { clienteNav, creadoraNav } from '@/components/layout/Sidebar';

/**
 * La barra de abajo, en el teléfono.
 *
 * Son las mismas cuatro secciones del menú de escritorio, enteras: no hay
 * "Más" porque no hay nada escondido. Cada botón ocupa un cuarto de la pantalla
 * y tiene 56px de alto, que es lo que hace que se pueda tocar sin apuntar.
 */
export default function MobileNav() {
  const role = useStore((s) => s.role);
  const base = useBaseCliente();
  const items = role === 'creadora' ? creadoraNav : clienteNav(base);

  return (
    <nav
      aria-label="Secciones"
      className="fixed bottom-0 left-0 right-0 z-30 flex justify-around border-t border-ink-200/70 bg-surface/95 px-1 py-1.5 backdrop-blur-md md:hidden"
    >
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium ${
              isActive ? 'text-brand-800' : 'text-ink-500'
            }`
          }
        >
          <Icon size={21} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
