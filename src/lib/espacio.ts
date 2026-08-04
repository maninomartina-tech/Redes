import type {
  Ad,
  Campaign,
  Client,
  HashtagSet,
  Lead,
  MediaRef,
  MonthlyStat,
  Post,
} from '@/types';
import type { Branding } from '@/lib/theme';

// ---------------------------------------------------------------------------
// Espacio de trabajo compartido.
//
// Hasta acá, todo vivía en el navegador. Eso alcanzaba para una sola persona
// en una sola computadora, pero no para que un cliente vea su planificación:
// lo que está en tu navegador no existe en el de él.
//
// Ahora la planificación vive en el servidor. La creadora entra con su clave;
// cada cliente entra con un link secreto que le da acceso únicamente a lo suyo
// —y ese recorte lo hace el servidor, no la app, porque lo que se filtra en el
// navegador se puede mirar igual en la respuesta.
// ---------------------------------------------------------------------------

import { API, hayServidor } from '@/lib/api';

export { hayServidor };

/** Lo que la creadora guarda en el servidor. */
export interface DatosEspacio {
  clients: Client[];
  posts: Post[];
  campaigns: Campaign[];
  ads: Ad[];
  monthlyStats: MonthlyStat[];
  leads: Lead[];
  hashtagSets: HashtagSet[];
  branding?: Branding;
  brandLogo?: MediaRef;
}

/** Lo que ve un cliente con su link: solo lo suyo. */
export interface DatosPortal {
  cliente: Client;
  posts: Post[];
  campaigns: Campaign[];
  monthlyStats: MonthlyStat[];
  leads: Lead[];
  branding?: Branding | null;
  brandLogo?: MediaRef | null;
}

/** La sesión caducó o la clave dejó de valer: hay que volver a entrar. */
export class SesionVencida extends Error {
  constructor() {
    super('Tu sesión venció. Volvé a entrar con tu clave.');
    this.name = 'SesionVencida';
  }
}

/**
 * `conSesion` distingue los dos sentidos que tiene un 401: en las rutas con
 * sesión significa que caducó, y al ingresar significa que la clave está mal.
 * Sin esa distinción, escribir mal la clave respondía "tu sesión venció".
 */
async function pedir<T>(
  ruta: string,
  opciones: RequestInit = {},
  esDeSesion = true
): Promise<T> {
  const res = await fetch(`${API}${ruta}`, opciones);
  if (res.status === 401 && esDeSesion) throw new SesionVencida();
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error ?? 'El servidor rechazó el pedido.');
  }
  return (await res.json()) as T;
}

const conSesion = (token: string, extra: HeadersInit = {}) => ({
  Authorization: `Bearer ${token}`,
  ...extra,
});

/* ----------------------------- ingreso ---------------------------------- */

export interface EstadoAcceso {
  /** ¿Hay un servidor configurado? */
  servidor: boolean;
  /** ¿Ese servidor tiene definida una clave de creadora? */
  clave: boolean;
}

export async function estadoAcceso(): Promise<EstadoAcceso> {
  if (!hayServidor()) return { servidor: false, clave: false };
  try {
    const d = await pedir<{ clave: boolean }>('/api/auth/estado');
    return { servidor: true, clave: d.clave };
  } catch {
    return { servidor: false, clave: false };
  }
}

export async function entrar(usuario: string, clave: string): Promise<string> {
  const d = await pedir<{ token: string }>(
    '/api/auth/entrar',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, clave }),
    },
    false
  );
  return d.token;
}

export async function salir(token: string): Promise<void> {
  try {
    await fetch(`${API}/api/auth/salir`, { method: 'POST', headers: conSesion(token) });
  } catch {
    /* si el servidor no responde, igual cerramos de este lado */
  }
}

/* --------------------------- el documento -------------------------------- */

export async function traerEspacio(
  token: string
): Promise<{ datos: DatosEspacio; version: number }> {
  return pedir('/api/espacio', { headers: conSesion(token) });
}

/**
 * `alSalir` marca el pedido para que el navegador lo termine aunque la página
 * ya se esté cerrando: es el último intento antes de una actualización.
 */
export async function subirEspacio(
  token: string,
  datos: DatosEspacio,
  alSalir = false
): Promise<number> {
  const d = await pedir<{ version: number }>('/api/espacio', {
    method: 'PUT',
    headers: conSesion(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ datos }),
    keepalive: alSalir,
  });
  return d.version;
}

/* ------------------------- links de los clientes ------------------------- */

export interface LinkCliente {
  token: string;
  cliente_id: string;
  creado_en: string;
  ultimo_acceso: string | null;
}

export async function listarLinks(token: string): Promise<LinkCliente[]> {
  return pedir('/api/portales', { headers: conSesion(token) });
}

export async function crearLink(token: string, clienteId: string): Promise<string> {
  const d = await pedir<{ token: string }>(`/api/portales/${clienteId}`, {
    method: 'POST',
    headers: conSesion(token),
  });
  return d.token;
}

export async function borrarLink(token: string, clienteId: string): Promise<void> {
  await pedir(`/api/portales/${clienteId}`, {
    method: 'DELETE',
    headers: conSesion(token),
  });
}

/** La dirección que se le pasa al cliente. */
export function urlDelLink(token: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/c/${token}`;
}

/* ---------------------------- lado del cliente --------------------------- */

export async function traerPortal(token: string): Promise<DatosPortal> {
  return pedir(`/api/portal/${token}`);
}

export async function comentarEnPortal(
  token: string,
  postId: string,
  texto: string
): Promise<void> {
  await pedir(`/api/portal/${token}/comentario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId, texto }),
  });
}

export async function decidirEnPortal(
  token: string,
  postId: string,
  decision: 'aprobado' | 'revision'
): Promise<void> {
  await pedir(`/api/portal/${token}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId, decision }),
  });
}
