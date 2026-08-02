import type { MediaRef, Post, SocialAccount } from '@/types';
import { getMediaBlob } from '@/lib/media';

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

/** Dirección del backend. Se configura con VITE_API_URL al compilar. */
const API = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

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
  if (!account) return 'El contenido no tiene una cuenta asignada.';
  if (!account.connected)
    return `La cuenta ${account.handle} no está conectada. Conectala en Cuentas.`;
  return null;
}

/** ¿Hay un backend configurado? */
export function hayServidor(): boolean {
  return API.length > 0;
}

/** Estado del servidor: qué está configurado y qué falta. */
export interface EstadoServidor {
  conectado: boolean;
  metaConfigurado: boolean;
  urlPublica: string | null;
  iaConfigurada: boolean;
  cuentasConectadas: number;
}

export async function consultarServidor(): Promise<EstadoServidor> {
  if (!hayServidor()) {
    return {
      conectado: false,
      metaConfigurado: false,
      urlPublica: null,
      iaConfigurada: false,
      cuentasConectadas: 0,
    };
  }
  try {
    const res = await fetch(`${API}/api/salud`);
    if (!res.ok) throw new Error('sin respuesta');
    const d = await res.json();
    return {
      conectado: true,
      metaConfigurado: !!d.metaConfigurado,
      urlPublica: d.urlPublica ?? null,
      iaConfigurada: !!d.iaConfigurada,
      cuentasConectadas: d.cuentasConectadas ?? 0,
    };
  } catch {
    return {
      conectado: false,
      metaConfigurado: false,
      urlPublica: null,
      iaConfigurada: false,
      cuentasConectadas: 0,
    };
  }
}

/** Dirección para iniciar la conexión de una cuenta de Meta. */
export function urlConexionMeta(): string | null {
  return hayServidor() ? `${API}/api/auth/meta/login` : null;
}

/** Sube al servidor un archivo guardado en el navegador. */
async function subirArchivo(media: MediaRef): Promise<string> {
  const blob = await getMediaBlob(media.id);
  if (!blob) throw new Error('No se encontró la pieza en este dispositivo.');

  const form = new FormData();
  form.append('archivo', blob, media.name);

  const res = await fetch(`${API}/api/media`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('No se pudo subir la pieza al servidor.');

  const { id } = await res.json();
  return id;
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
