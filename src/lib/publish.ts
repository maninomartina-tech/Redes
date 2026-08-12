import type { MediaRef, Post, SocialAccount } from '@/types';
import { respaldarEnServidor } from '@/lib/media';
import { API, hayServidor } from '@/lib/api';

// ---------------------------------------------------------------------------
// Publicación automática en redes.
//
// El navegador no puede publicar solo: si la app está cerrada a la hora
// programada, nadie sube nada. Por eso el trabajo lo hace el servidor
// (carpeta `server/`), que guarda la cola y publica a horario.
//
// Además, Meta descarga la pieza desde una URL pública: no se le puede mandar
// el archivo adjunto. Por eso, al programar, primero se sube el archivo al
// servidor y después se agenda la publicación.
//
// Si el servidor no está configurado, la app sigue funcionando: deja todo
// registrado y avisa que la subida real está pendiente.
// ---------------------------------------------------------------------------

export interface ScheduleResult {
  ok: boolean;
  /** Mensaje para mostrarle a la creadora */
  message: string;
  externalId?: string;
  /** true si se registró en la app pero todavía no hay servidor conectado */
  simulado?: boolean;
}

/** Motivos por los que una pieza todavía no se puede programar. */
export function motivoNoProgramable(
  post: Post,
  account: SocialAccount | undefined
): string | null {
  if (!post.resultado) return 'Falta subir la pieza final.';
  // Un carrusel se publica en la API como un contenedor con una hijo por
  // imagen. Mientras eso no esté hecho, mandaría solo la primera y saldría un
  // posteo distinto del que se aprobó: mejor que se suba a mano.
  if ((post.carrusel ?? []).length > 0) {
    return 'Los carruseles de varias imágenes se suben a mano, desde «Para publicar».';
  }
  if (!account) return 'El contenido no tiene una cuenta asignada.';
  if (!account.connected)
    return `La cuenta ${account.handle} no está conectada. Conectala en Cuentas.`;
  return null;
}

export { hayServidor };

/** Estado del servidor: qué está configurado y qué falta. */
export interface EstadoServidor {
  conectado: boolean;
  metaConfigurado: boolean;
  urlPublica: string | null;
  /** La dirección que hay que pegar en Facebook Developers, ya armada. */
  redireccionMeta: string | null;
  /** Los permisos que el servidor le va a pedir a Meta. */
  permisosMeta: string[];
  /** Si está en true, la app también puede prender, pausar y cambiar campañas. */
  adsAdministrables: boolean;
  iaConfigurada: boolean;
  cuentasConectadas: number;
}

const sinServidor: EstadoServidor = {
  conectado: false,
  metaConfigurado: false,
  urlPublica: null,
  redireccionMeta: null,
  permisosMeta: [],
  adsAdministrables: false,
  iaConfigurada: false,
  cuentasConectadas: 0,
};

export async function consultarServidor(): Promise<EstadoServidor> {
  if (!hayServidor()) return sinServidor;
  try {
    const res = await fetch(`${API}/api/salud`);
    if (!res.ok) throw new Error('sin respuesta');
    const d = await res.json();
    return {
      conectado: true,
      metaConfigurado: !!d.metaConfigurado,
      urlPublica: d.urlPublica ?? null,
      redireccionMeta: d.redireccionMeta ?? null,
      permisosMeta: Array.isArray(d.permisosMeta) ? d.permisosMeta : [],
      adsAdministrables: !!d.adsAdministrables,
      iaConfigurada: !!d.iaConfigurada,
      cuentasConectadas: d.cuentasConectadas ?? 0,
    };
  } catch {
    return sinServidor;
  }
}

/** Cuenta de Instagram vinculada en el servidor. */
export interface CuentaMeta {
  id: string;
  nombre: string;
  usuario?: string;
}

/** Cuentas que quedaron vinculadas tras el login de Meta. */
export async function listarCuentasMeta(): Promise<CuentaMeta[]> {
  if (!hayServidor()) return [];
  try {
    const res = await fetch(`${API}/api/cuentas`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

/** Una cuenta publicitaria a la que la creadora tiene acceso. */
export interface CuentaPublicitaria {
  id: string; // "act_123456"
  nombre: string;
  moneda: string | null;
  activa: boolean;
}

/**
 * Las cuentas publicitarias que administra, para elegir la de cada cliente.
 *
 * Cuelgan del usuario de Facebook, no de la página, así que aparecen recién
 * después de conectar Meta y solo con la sesión de la creadora.
 */
export async function listarCuentasPublicitarias(
  sesion: string | null
): Promise<CuentaPublicitaria[]> {
  if (!hayServidor() || !sesion) return [];
  try {
    const res = await fetch(`${API}/api/adcuentas`, {
      headers: { Authorization: `Bearer ${sesion}` },
    });
    if (!res.ok) return [];
    return (await res.json()).cuentas ?? [];
  } catch {
    return [];
  }
}

/**
 * Arranca la conexión con Meta.
 *
 * Primero se pide un pase al servidor, con la sesión. La vuelta de Meta llega
 * como una visita del navegador y no puede traer la sesión, así que la
 * autorización tiene que viajar en la dirección: sin eso, cualquiera que
 * conozca el servidor podría dejar sus propias cuentas conectadas ahí.
 */
export async function urlConexionMeta(sesion: string | null): Promise<{
  url?: string;
  error?: string;
}> {
  if (!hayServidor()) return { error: 'No hay servidor configurado.' };
  if (!sesion) return { error: 'Entrá con tu clave para conectar Instagram.' };

  try {
    const res = await fetch(`${API}/api/auth/meta/pase`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sesion}` },
    });
    const datos = await res.json().catch(() => ({}));
    if (!res.ok) return { error: datos.error ?? 'El servidor no dio el permiso para conectar.' };
    return { url: `${API}/api/auth/meta/login?pase=${encodeURIComponent(datos.pase)}` };
  } catch {
    return { error: 'No se pudo contactar al servidor.' };
  }
}

/** Id de la copia de la pieza en el servidor, subiéndola si todavía no está. */
async function subirArchivo(media: MediaRef): Promise<string> {
  if (media.remoteId) return media.remoteId;

  const respaldada = await respaldarEnServidor(media);
  if (!respaldada.remoteId) {
    throw new Error(
      'No se pudo subir la pieza al servidor. Revisá que el archivo siga en este dispositivo.'
    );
  }
  return respaldada.remoteId;
}

/**
 * Deja la publicación programada para la fecha y hora del contenido.
 */
export async function schedulePost(
  post: Post,
  account: SocialAccount | undefined
): Promise<ScheduleResult> {
  const motivo = motivoNoProgramable(post, account);
  if (motivo) return { ok: false, message: motivo };

  if (!hayServidor()) {
    return {
      ok: true,
      simulado: true,
      message:
        'Programado en la app. Para que se suba solo, falta conectar el servidor (carpeta server/).',
      externalId: `sim_${Math.random().toString(36).slice(2, 10)}`,
    };
  }

  try {
    // 1) La pieza va primero al servidor, que la sirve por URL pública.
    const archivoId = await subirArchivo(post.resultado!);

    // 2) Recién ahí se agenda.
    const res = await fetch(`${API}/api/publicaciones/programar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postId: post.id,
        accountId: account!.id,
        publishAt: post.date,
        archivos: [archivoId],
        caption: post.copy,
        type: post.type,
      }),
    });

    const datos = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, message: datos.error ?? 'El servidor rechazó la programación.' };
    }

    return { ok: true, message: 'Programado.', externalId: datos.id };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'No se pudo contactar al servidor.',
    };
  }
}

/** Cancela una publicación ya programada. */
export async function cancelSchedule(post: Post): Promise<ScheduleResult> {
  if (!hayServidor() || !post.externalId?.startsWith('pub_')) {
    return { ok: true, simulado: true, message: 'Programación cancelada.' };
  }
  try {
    const res = await fetch(`${API}/api/publicaciones/${post.externalId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return { ok: false, message: d.error ?? 'No se pudo cancelar.' };
    }
    return { ok: true, message: 'Programación cancelada.' };
  } catch {
    return { ok: false, message: 'No se pudo contactar al servidor.' };
  }
}
