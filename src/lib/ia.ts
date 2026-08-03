import type { Client, Post } from '@/types';
import { API, hayServidor } from '@/lib/api';
import { useStore } from '@/store/useStore';

// ---------------------------------------------------------------------------
// Redacción con IA desde el contenido.
//
// Devuelve opciones, nunca una sola: la idea es elegir y editar, no aceptar lo
// primero que salga. La clave de Anthropic vive en el servidor; acá solo se
// pide, con la sesión de la creadora.
// ---------------------------------------------------------------------------

export type ParteRedactable = 'idea' | 'contenido' | 'copy' | 'hashtags';

export interface Redaccion {
  ok: boolean;
  opciones?: string[];
  error?: string;
}

/** Lo que se le manda como contexto: lo que ya está escrito en el contenido. */
function recorte(post: Post) {
  return {
    type: post.type,
    title: post.title,
    inspiracion: post.inspiracion,
    ideaGeneral: post.ideaGeneral,
    contenido: post.contenido,
    copy: post.copy,
  };
}

export async function redactar(
  parte: ParteRedactable,
  post: Post,
  cliente: Client | undefined,
  instruccion?: string
): Promise<Redaccion> {
  if (!hayServidor()) {
    return {
      ok: false,
      error: 'Esto necesita el servidor conectado.',
    };
  }

  const sesion = useStore.getState().sesion;
  if (!sesion) {
    return { ok: false, error: 'Entrá con tu usuario y contraseña para usar la IA.' };
  }

  try {
    const res = await fetch(`${API}/api/ai/redactar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sesion}`,
      },
      body: JSON.stringify({
        parte,
        cliente: cliente && { name: cliente.name, handle: cliente.handle },
        post: recorte(post),
        instruccion,
      }),
    });

    const datos = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: datos.error ?? 'La IA no respondió.' };

    return { ok: true, opciones: datos.opciones ?? [] };
  } catch {
    return { ok: false, error: 'No se pudo contactar al servidor.' };
  }
}
