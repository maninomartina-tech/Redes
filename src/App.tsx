import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import MobileNav from '@/components/layout/MobileNav';
import { useStore } from '@/store/useStore';
import { applyBranding } from '@/lib/theme';
import { aplicarIcono } from '@/lib/icono';
import { estadoAcceso } from '@/lib/espacio';

import Dashboard from '@/views/Dashboard';
import Panorama from '@/views/Panorama';
import PlanningBoard from '@/views/PlanningBoard';
import FeedPreview from '@/views/FeedPreview';
import StoriesPlanner from '@/views/StoriesPlanner';
import Metrics from '@/views/Metrics';
import Growth from '@/views/Growth';
import Ads from '@/views/Ads';
import Recommendations from '@/views/Recommendations';
import Accounts from '@/views/Accounts';
import ClientWeek from '@/views/ClientWeek';
import ClientResults from '@/views/ClientResults';
import ClientHome from '@/views/ClientHome';
import Branding from '@/views/Branding';
import ClientAccess from '@/views/ClientAccess';
import ToPublish from '@/views/ToPublish';
import Hashtags from '@/views/Hashtags';
import Report from '@/views/Report';
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

/** Las pantallas del cliente. Son las mismas por link o en vista previa. */
const rutasCliente = (
  <>
    <Route index element={<Navigate to="inicio" replace />} />
    <Route path="inicio" element={<ClientHome />} />
    <Route path="semana" element={<ClientWeek />} />
    <Route path="feed" element={<FeedPreview clientMode />} />
    <Route path="metricas" element={<ClientResults />} />
    <Route path="recomendaciones" element={<Recommendations clientMode />} />
    <Route path="*" element={<Navigate to="inicio" replace />} />
  </>
);

/** Lo que ve la creadora, más su vista previa del lado del cliente. */
function Panel() {
  const role = useStore((s) => s.role);
  const location = useLocation();
  const navigate = useNavigate();

  // Mantiene la ruta coherente con el rol activo.
  useEffect(() => {
    const inClient = location.pathname.startsWith('/cliente');
    if (role === 'cliente' && !inClient) navigate('/cliente/inicio', { replace: true });
    if (role === 'creadora' && inClient) navigate('/panel', { replace: true });
  }, [role, location.pathname, navigate]);

  return (
    <Marco>
      <Routes>
        <Route path="/" element={<Navigate to="/panel" replace />} />
        {/* Creadora */}
        <Route path="/panel" element={<Dashboard />} />
        <Route path="/general" element={<Panorama />} />
        <Route path="/planificacion" element={<PlanningBoard />} />
        {/* Había dos calendarios distintos: ahora el de Planificación es el
            único, y los links viejos van a parar ahí. */}
        <Route path="/calendario" element={<Navigate to="/planificacion" replace />} />
        <Route path="/feed" element={<FeedPreview />} />
        <Route path="/historias" element={<StoriesPlanner />} />
        <Route path="/publicar" element={<ToPublish />} />
        <Route path="/hashtags" element={<Hashtags />} />
        <Route path="/metricas" element={<Metrics />} />
        <Route path="/crecimiento" element={<Growth />} />
        <Route path="/ads" element={<Ads />} />
        <Route path="/recomendaciones" element={<Recommendations />} />
        <Route path="/informe" element={<Report />} />
        <Route path="/marca" element={<Branding />} />
        <Route path="/accesos" element={<ClientAccess />} />
        <Route path="/ajustes" element={<Accounts />} />
        {/* Vista previa de lo que ve el cliente */}
        <Route path="/cliente">{rutasCliente}</Route>
        <Route path="*" element={<Navigate to="/panel" replace />} />
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
