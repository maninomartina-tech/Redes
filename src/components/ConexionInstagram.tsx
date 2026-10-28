import { CheckCircle2, Link2, ServerOff, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { consultarServidor, urlConexionMeta, type EstadoServidor } from '@/lib/publish';
import BotonCopiar from '@/components/BotonCopiar';

// ---------------------------------------------------------------------------
// Conectar Instagram, y qué falta para que funcione.
//
// Todo lo que hay acá existe por una razón: lo que más veces frena la conexión
// es una dirección escrita a mano con una letra distinta. Meta compara
// carácter por carácter y contesta "URL bloqueada" sin decir cuál esperaba, así
// que las direcciones se muestran tal como las va a usar el servidor, para
// copiar y no para leer.
// ---------------------------------------------------------------------------

export default function ConexionInstagram() {
  const sesion = useStore((s) => s.sesion);
  const [estado, setEstado] = useState<EstadoServidor | null>(null);

  useEffect(() => {
    consultarServidor().then(setEstado);
  }, []);

  const [yendo, setYendo] = useState(false);
  const [errorMeta, setErrorMeta] = useState<string | null>(null);

  /**
   * El pase se pide recién al tocar el botón, y dura un rato corto: si el link
   * viviera armado en la pantalla, quedaría dando vueltas en el historial.
   */
  const conectar = async () => {
    setErrorMeta(null);
    setYendo(true);
    const r = await urlConexionMeta(sesion);
    if (r.url) window.location.href = r.url;
    else {
      setErrorMeta(r.error ?? 'No se pudo arrancar la conexión.');
      setYendo(false);
    }
  };

  if (!estado) {
    return (
      <p className="rounded-xl border border-ink-200/70 bg-surface p-4 text-sm text-ink-500">
        Consultando el servidor…
      </p>
    );
  }

  if (!estado.conectado) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-butter-200 bg-butter-50 p-4 text-sm">
        <ServerOff className="mt-0.5 shrink-0 text-butter-600" size={20} />
        <div className="text-ink-700">
          <p className="font-semibold text-ink-800">La publicación automática está apagada</p>
          <p className="mt-1">
            La app está guardando todo igual, pero todavía no hay un servidor que suba las
            piezas a la hora indicada.
          </p>
        </div>
      </div>
    );
  }

  const faltantes: string[] = [];
  if (!estado.metaConfigurado)
    faltantes.push('las credenciales de Meta (META_APP_ID y META_APP_SECRET)');
  if (!estado.urlPublica)
    faltantes.push(
      'la dirección pública del servidor (PUBLIC_URL), desde donde Meta descarga las piezas'
    );

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-xl border border-mint-200 bg-mint-50 p-4 text-sm">
        <CheckCircle2 className="mt-0.5 shrink-0 text-mint-600" size={20} />
        <div className="text-ink-700">
          <p className="font-semibold text-ink-800">Servidor conectado</p>
          <p className="mt-1">
            {estado.cuentasConectadas > 0
              ? `Hay ${estado.cuentasConectadas} cuenta(s) de Instagram vinculadas.`
              : 'Todavía no vinculaste ninguna cuenta de Instagram.'}
          </p>
          {estado.metaConfigurado && (
            <>
              <button
                className="btn-primary mt-3 !py-1.5 text-xs"
                disabled={yendo}
                onClick={() => void conectar()}
              >
                <Link2 size={14} />
                {yendo
                  ? 'Abriendo Meta…'
                  : estado.cuentasConectadas > 0
                    ? 'Vincular otra cuenta'
                    : 'Vincular Instagram'}
              </button>
              <p className="mt-2 text-xs leading-snug text-ink-500">
                Se abre Meta con tu cuenta de Facebook y quedan conectadas todas las cuentas
                de Instagram de las páginas que administrás. Después elegís cuál corresponde
                a cada cliente.
              </p>
              {errorMeta && (
                <p className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">
                  {errorMeta}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <ParaPegarEnMeta estado={estado} />

      {faltantes.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-butter-200 bg-butter-50 p-4 text-sm">
          <TriangleAlert className="mt-0.5 shrink-0 text-butter-600" size={20} />
          <div className="text-ink-700">
            <p className="font-semibold text-ink-800">
              Falta configurar, si querés conectar Instagram
            </p>
            <p className="mb-1 mt-0.5 text-xs leading-snug text-ink-500">
              Nada de esto hace falta para trabajar a mano: podés planificar, pasarles el
              link a tus clientes y cargar el crecimiento igual.
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {faltantes.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <p className="mt-1.5 text-xs leading-snug text-ink-500">
              Si el servidor está en Render, se cargan en <b>Environment</b>, dentro del
              servicio.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 rounded-xl border border-ink-200/70 bg-surface p-4 text-sm">
        <ShieldCheck className="mt-0.5 shrink-0 text-brand-800" size={20} />
        <p className="text-ink-600">
          Meta exige que la cuenta de Instagram sea <b>Business o Creator</b> y esté vinculada
          a una página de Facebook, y que la app tenga aprobado el permiso{' '}
          <code className="rounded bg-ink-100 px-1 py-0.5 text-xs">
            instagram_content_publish
          </code>
          .
        </p>
      </div>
    </div>
  );
}

/** Lo que hay que cargar del otro lado, en developers.facebook.com. */
function ParaPegarEnMeta({ estado }: { estado: EstadoServidor }) {
  const [error, setError] = useState<string | null>(null);
  if (!estado.redireccionMeta) return null;

  return (
    <details
      // Mientras no haya ninguna cuenta, esto es justo lo que está buscando.
      open={estado.cuentasConectadas === 0}
      className="rounded-xl border border-ink-200/70 bg-surface p-4 text-sm"
    >
      <summary className="cursor-pointer font-semibold text-ink-800">
        Lo que hay que cargar en Facebook Developers
      </summary>

      <p className="mt-2 text-ink-600">
        En tu app de Meta, en <b>Inicio de sesión con Facebook → Configuración</b>, pegá esto
        en <b>URI de redireccionamiento de OAuth válidos</b>:
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-ink-100 px-2 py-1.5 text-xs text-ink-700">
          {estado.redireccionMeta}
        </code>
        <BotonCopiar
          texto={estado.redireccionMeta}
          etiqueta="Copiar"
          className="btn-ghost shrink-0 !py-1.5 text-xs"
          onError={setError}
        />
      </div>
      <p className="mt-1 text-xs text-ink-500">
        Tiene que quedar igual, sin barra al final. Si no coincide, Meta muestra «URL
        bloqueada» al abrir el login.
      </p>

      <p className="mt-3 text-ink-600">
        En <b>Configuración → Básica</b> van estas dos, que Meta exige para autorizar la app:
      </p>
      <Direccion
        etiqueta="URL de la política de privacidad"
        url={`${window.location.origin}/privacidad`}
        onError={setError}
      />
      <Direccion
        etiqueta="URL de instrucciones de eliminación de datos"
        url={`${window.location.origin}/eliminar-datos`}
        onError={setError}
      />

      <p className="mt-3 text-ink-600">
        Y estos son los permisos que se le piden. Los cubre el{' '}
        <b>caso de uso de Instagram</b>.
      </p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {estado.permisosMeta.map((p) => (
          <li key={p} className="chip bg-ink-100 font-mono text-[11px] text-ink-600">
            {p}
          </li>
        ))}
      </ul>

      {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}
    </details>
  );
}

/** Una dirección larga para copiar y pegar del otro lado. */
function Direccion({
  etiqueta,
  url,
  onError,
}: {
  etiqueta: string;
  url: string;
  onError: (m: string) => void;
}) {
  return (
    <div className="mt-1.5">
      <p className="text-xs text-ink-500">{etiqueta}</p>
      <div className="mt-0.5 flex items-center gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-ink-100 px-2 py-1.5 text-xs text-ink-700">
          {url}
        </code>
        <BotonCopiar
          texto={url}
          etiqueta="Copiar"
          className="btn-ghost shrink-0 !py-1.5 text-xs"
          onError={onError}
        />
      </div>
    </div>
  );
}
