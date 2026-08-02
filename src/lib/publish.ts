import type { Post, SocialAccount } from '@/types';

// ---------------------------------------------------------------------------
// Publicación automática en redes.
//
// El envío real a Instagram/Facebook se hace con la Graph API de Meta
// (Instagram Content Publishing API) y necesita:
//   1. Una app de Meta aprobada con el permiso instagram_content_publish.
//   2. Cuentas Business/Creator vinculadas a una página de Facebook.
//   3. Un backend que guarde los tokens de larga duración de forma segura y
//      que dispare la publicación a la hora programada (el navegador no puede
//      hacerlo solo: si la app está cerrada, nadie publica).
//
// Mientras no exista ese backend, la app programa igual y deja constancia del
// estado, simulando el envío. Al conectar el backend, solo cambia la respuesta
// de estos dos endpoints.
// ---------------------------------------------------------------------------

export interface ScheduleResult {
  ok: boolean;
  /** Mensaje para mostrarle a la creadora */
  message: string;
  externalId?: string;
  /** true si se simuló porque todavía no hay backend conectado */
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

/**
 * Deja la publicación programada para la fecha y hora del contenido.
 */
export async function schedulePost(
  post: Post,
  account: SocialAccount | undefined
): Promise<ScheduleResult> {
  const motivo = motivoNoProgramable(post, account);
  if (motivo) return { ok: false, message: motivo };

  try {
    const res = await fetch('/api/publicaciones/programar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postId: post.id,
        accountId: account!.id,
        publishAt: post.date,
        mediaId: post.resultado!.id,
        caption: post.copy,
        type: post.type,
      }),
    });
    if (!res.ok) throw new Error('sin backend');
    const data = await res.json();
    return {
      ok: true,
      message: 'Programado en Meta.',
      externalId: data.externalId,
    };
  } catch {
    return {
      ok: true,
      simulado: true,
      message:
        'Programado en la app. El envío real a Meta se activa al conectar las credenciales.',
      externalId: `sim_${Math.random().toString(36).slice(2, 10)}`,
    };
  }
}

/** Cancela una publicación ya programada. */
export async function cancelSchedule(post: Post): Promise<ScheduleResult> {
  try {
    const res = await fetch(`/api/publicaciones/${post.externalId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('sin backend');
    return { ok: true, message: 'Programación cancelada.' };
  } catch {
    return { ok: true, simulado: true, message: 'Programación cancelada.' };
  }
}
