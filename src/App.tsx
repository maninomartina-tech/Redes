import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import MobileNav from '@/components/layout/MobileNav';
import { useStore } from '@/store/useStore';
import { applyBranding } from '@/lib/theme';

import Dashboard from '@/views/Dashboard';
import CalendarView from '@/views/CalendarView';
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

export default function App() {
  const role = useStore((s) => s.role);
  const branding = useStore((s) => s.branding);

  // La paleta elegida se aplica al arrancar y ante cualquier cambio.
  useEffect(() => {
    applyBranding(branding);
  }, [branding]);

  const location = useLocation();
  const navigate = useNavigate();

  // Mantiene la ruta coherente con el rol activo.
  useEffect(() => {
    const inClient = location.pathname.startsWith('/cliente');
    if (role === 'cliente' && !inClient) navigate('/cliente/inicio', { replace: true });
    if (role === 'creadora' && inClient) navigate('/panel', { replace: true });
  }, [role, location.pathname, navigate]);

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 py-5 pb-24 md:px-6 md:pb-6">
          <div className="mx-auto max-w-6xl">
            <Routes>
              <Route path="/" element={<Navigate to="/panel" replace />} />
              {/* Creadora */}
              <Route path="/panel" element={<Dashboard />} />
              <Route path="/calendario" element={<CalendarView />} />
              <Route path="/planificacion" element={<PlanningBoard />} />
              <Route path="/feed" element={<FeedPreview />} />
              <Route path="/historias" element={<StoriesPlanner />} />
              <Route path="/metricas" element={<Metrics />} />
              <Route path="/crecimiento" element={<Growth />} />
              <Route path="/ads" element={<Ads />} />
              <Route path="/recomendaciones" element={<Recommendations />} />
              <Route path="/marca" element={<Branding />} />
              <Route path="/ajustes" element={<Accounts />} />
              {/* Cliente */}
              <Route path="/cliente/inicio" element={<ClientHome />} />
              <Route path="/cliente/semana" element={<ClientWeek />} />
              <Route path="/cliente/feed" element={<FeedPreview clientMode />} />
              <Route path="/cliente/metricas" element={<ClientResults />} />
              <Route
                path="/cliente/recomendaciones"
                element={<Recommendations clientMode />}
              />
              <Route path="*" element={<Navigate to="/panel" replace />} />
            </Routes>
          </div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
