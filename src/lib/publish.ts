import type { Post, SocialAccount } from '@/types';

// -------------------------------------------------------------------------
// Publicación automática en redes.
//
// La publicación real en Instagram/Facebook se hace con la Graph API de Meta
// (Instagram Content Publishing API) y requiere:
//   1. Una app de Meta aprobada con los permisos instagram_content_publish.
//   2. Cuentas Business/Creator vinculadas a una página de Facebook.
//   3. Un backend que guarde los tokens de larga duración de forma segura.
//
// Este módulo deja la interfaz lista. Hoy simula el envío para que el flujo
// de "programado -> publicado" funcione end to end en la demo.
// -------------------------------------------------------------------------

export interface PublishResult {
  ok: boolean;
  message: string;
  externalId?: string;
}

export async function publishPost(
  post: Post,
  account: SocialAccount
): Promise<PublishResult> {
  if (!account.connected) {
    return {
      ok: false,
      message: `La cuenta ${account.handle} no está conectada. Conectala en Ajustes para publicar automáticamente.`,
    };
  }

  try {
    // Cuando exista el backend, esto llama al endpoint que habla con Meta.
    const res = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: post.id, accountId: account.id }),
    });
    if (!res.ok) throw new Error('sin backend de publicación');
    const data = await res.json();
    return { ok: true, message: 'Publicado', externalId: data.externalId };
  } catch {
    // Simulación local: marca como publicado sin tocar la red real.
    return {
      ok: true,
      message: `Simulado: se publicaría "${post.title}" en ${account.handle} el día programado.`,
      externalId: `sim_${Math.random().toString(36).slice(2, 8)}`,
    };
  }
}
