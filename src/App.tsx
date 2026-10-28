import { useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import MobileNav from '@/components/layout/MobileNav';
import { useStore } from '@/store/useStore';
import { applyBranding } from '@/lib/theme';
import { aplicarIcono } from '@/lib/icono';
import { estadoAcceso } from '@/lib/espacio';

import PlanMensual from '@/views/PlanMensual';
import Calendario from '@/views/Calendario';
import Crecimiento from '@/views/Crecimiento';
import Ajustes from '@/views/Ajustes';
import ClienteContenido from '@/views/ClienteContenido';
import ClienteCrecimiento from '@/views/ClienteCrecimiento';
import Ingreso from '@/views/Ingreso';
import Portal from '@/views/Portal';
import Rescate from '@/components/Rescate';

/** El marco que comparten los dos lados: menú, barra superior y contenido. */
function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 py-5 pb-24 md:px-6 md:pb-6">
          <div className="mx-auto max-w-6xl">
            <Rescate />
            {children}
          </div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}

/**
 * Las pantallas del cliente. Son las mismas por link o en vista previa.
 *
 * Dos: su contenido y su crecimiento. Los nombres viejos de las rutas siguen
 * andando —un cliente puede tener la pantalla vieja abierta o el link guardado
 * en el teléfono— y van a parar a la que corresponde.
 */
const rutasCliente = (
  <>
    <Route index element={<Navigate to="contenido" replace />} />
    <Route path="contenido" element={<ClienteContenido />} />
    <Route path="crecimiento" element={<ClienteCrecimiento />} />
    <Route path="metricas" element={<Navigate to="../crecimiento" replace />} />
    {/* Sin "..": en una ruta comodín lo relativo ya cuelga del padre, que es
        donde esté montado el lado del cliente —su link o la vista previa—. */}
    <Route path="*" element={<Navigate to="contenido" replace />} />
  </>
);

/**
 * Libera sola el espacio de lo publicado hace rato.
 *
 * Corre una vez por sesión, cuando el espacio ya terminó de cargar: antes
 * sería decidir con media planificación en la mano. Es lo único que hace que
 * el disco no se llene sin que nadie se acuerde.
 */
function useLimpiezaAutomatica() {
  const estado = useStore((s) => s.sincro.estado);
  const activa = useStore((s) => s.limpieza.activa);
  const liberar = useStore((s) => s.liberarArchivosViejos);
  const yaCorrio = useRef(false);

  useEffect(() => {
    if (yaCorrio.current || !activa) return;
    if (estado !== 'listo' && estado !== 'local') return;
    yaCorrio.current = true;
    void liberar();
  }, [estado, activa, liberar]);
}

/** Lo que ve la creadora, más su vista previa del lado del cliente. */
function Panel() {
  const role = useStore((s) => s.role);
  const location = useLocation();
  const navigate = useNavigate();

  useLimpiezaAutomatica();

  // Mantiene la ruta coherente con el rol activo.
  useEffect(() => {
    const inClient = location.pathname.startsWith('/cliente');
    if (role === 'cliente' && !inClient) navigate('/cliente/contenido', { replace: true });
    if (role === 'creadora' && inClient) navigate('/plan', { replace: true });
  }, [role, location.pathname, navigate]);

  return (
    <Marco>
      <Routes>
        {/* El mes se piensa acá, así que es la puerta de entrada. */}
        <Route path="/" element={<Navigate to="/plan" replace />} />
        <Route path="/plan" element={<PlanMensual />} />
        <Route path="/calendario" element={<Calendario />} />
        <Route path="/crecimiento" element={<Crecimiento />} />
        <Route path="/ajustes" element={<Ajustes />} />

        {/* Nombres viejos que pueden estar guardados en un marcador. */}
        <Route path="/planificacion" element={<Navigate to="/calendario" replace />} />
        <Route path="/historias" element={<Navigate to="/calendario" replace />} />
        <Route path="/accesos" element={<Navigate to="/ajustes" replace />} />
        <Route path="/marca" element={<Navigate to="/ajustes" replace />} />

        {/* Vista previa de lo que ve el cliente */}
        <Route path="/cliente">{rutasCliente}</Route>
        <Route path="*" element={<Navigate to="/plan" replace />} />
      </Routes>
    </Marco>
  );
}

/**
 * Decide si hay que pedir la clave.
 *
 * Sin servidor configurado, la app funciona como siempre contra el navegador:
 * no tiene sentido pedir una clave que nadie podría validar.
 */
function LadoCreadora() {
  const sesion = useStore((s) => s.sesion);
  const cargarDelServidor = useStore((s) => s.cargarDelServidor);
  const salirDelPortal = useStore((s) => s.salirDelPortal);

  const [pideClave, setPideClave] = useState<boolean | null>(null);
  const [soloLocal, setSoloLocal] = useState(false);

  useEffect(() => {
    estadoAcceso().then(({ servidor, clave }) => setPideClave(servidor && clave));
  }, []);

  // Si venía de mirar el link de un cliente en esta misma pestaña, lo que hay
  // en memoria es el recorte de ese cliente. Se vuelve a lo suyo.
  useEffect(() => {
    void salirDelPortal();
  }, [salirDelPortal]);

  // Con la sesión ya guardada de una visita anterior, se trae todo al abrir.
  useEffect(() => {
    if (sesion) void cargarDelServidor();
  }, [sesion, cargarDelServidor]);

  if (pideClave === null) return <div className="min-h-screen bg-canvas" />;
  if (pideClave && !sesion && !soloLocal) {
    return <Ingreso seguirLocal={() => setSoloLocal(true)} />;
  }
  return <Panel />;
}

export default function App() {
  const branding = useStore((s) => s.branding);
  const brandLogo = useStore((s) => s.brandLogo);

  // La paleta elegida se aplica al arrancar y ante cualquier cambio.
  useEffect(() => {
    applyBranding(branding);
  }, [branding]);

  // Y el ícono de la pestaña sigue al logo, sin tener que tocar archivos.
  useEffect(() => {
    void aplicarIcono(brandLogo);
  }, [brandLogo]);

  return (
    <Routes>
      {/* El link secreto de un cliente */}
      <Route
        path="/c/:token/*"
        element={
          <Portal>
            <Marco>
              <Routes>{rutasCliente}</Routes>
            </Marco>
          </Portal>
        }
      />
      <Route path="/*" element={<LadoCreadora />} />
    </Routes>
  );
}
