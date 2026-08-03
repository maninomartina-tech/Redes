import { AlertCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Logo from '@/components/Logo';
import { useStore } from '@/store/useStore';

/**
 * Puerta de entrada del cliente.
 *
 * Con su link ve únicamente lo suyo —y el recorte lo hace el servidor, no
 * esta pantalla: filtrar en el navegador no sirve, porque la respuesta
 * completa se puede mirar igual. Acá no hay clave: el link *es* la llave, así
 * que se lo manda a cada cliente por separado y se rehace si se filtró.
 */
export default function Portal({ children }: { children: React.ReactNode }) {
  const { token = '' } = useParams();
  const abrirPortal = useStore((s) => s.abrirPortal);
  const listo = useStore((s) => s.portal === token && s.sincro.estado === 'listo');

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    abrirPortal(token).then((e) => {
      if (vigente) setError(e);
    });
    return () => {
      vigente = false;
    };
  }, [token, abrirPortal]);

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-4">
        <div className="card max-w-sm p-6 text-center">
          <div className="mb-4 flex justify-center">
            <Logo size={40} showWordmark={false} />
          </div>
          <p className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-left text-[13px] leading-snug text-rose-700">
            <AlertCircle size={16} className="mt-px shrink-0" />
            {error}
          </p>
          <p className="mt-3 text-xs leading-snug text-ink-500">
            Pedile un link nuevo a quien te lo mandó.
          </p>
        </div>
      </div>
    );
  }

  if (!listo) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <div className="flex flex-col items-center gap-3 text-ink-400">
          <Loader2 size={22} className="animate-spin" />
          <span className="text-sm">Abriendo tu contenido…</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
