import type { Ad, MonthlyStat, PostMetrics } from '@/types';

// ---------------------------------------------------------------------------
// Sincronización con Meta.
//
// Trae los mismos datos que hoy se cargan a mano, para no tener que copiarlos.
// Lo que se carga a mano y Meta no conoce —consultas por WhatsApp, ventas,
// el punto de partida de la cuenta— nunca se toca.
// ---------------------------------------------------------------------------

const API = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export interface ResultadoSync<T> {
  ok: boolean;
  datos: T;
  /** Métricas que Meta rechazó, para avisar en vez de mostrar huecos */
  avisos: string[];
  error?: string;
}

async function pedir<T>(ruta: string): Promise<{ ok: boolean; datos?: T; error?: string }> {
  if (!API) {
    return {
      ok: false,
      error: 'No hay servidor configurado. La sincronización con Meta lo necesita.',
    };
  }
  try {
    const res = await fetch(`${API}${ruta}`);
    const datos = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: datos.error ?? `El servidor respondió ${res.status}` };
    return { ok: true, datos };
  } catch {
    return { ok: false, error: 'No se pudo contactar al servidor.' };
  }
}

/** Métricas de la cuenta, mes a mes. */
export async function sincronizarCuenta(
  igUserId: string,
  clientId: string
): Promise<ResultadoSync<Omit<MonthlyStat, 'id'>[]>> {
  const r = await pedir<{
    meses: { month: string; followers: number; reach: number; interactions: number; profileVisits: number }[];
    avisos: string[];
  }>(`/api/insights/cuenta/${igUserId}`);

  if (!r.ok || !r.datos) return { ok: false, datos: [], avisos: [], error: r.error };

  return {
    ok: true,
    avisos: r.datos.avisos ?? [],
    datos: r.datos.meses.map((m) => ({
      clientId,
      month: m.month,
      followers: m.followers,
      reach: m.reach || undefined,
      interactions: m.interactions || undefined,
      profileVisits: m.profileVisits || undefined,
    })),
  };
}

export interface PublicacionSincronizada {
  externalId: string;
  permalink: string;
  /** Portada que devuelve Instagram (puede venir vacía) */
  imagen: string | null;
  caption: string;
  tipo: string;
  fecha: string;
  metrics: PostMetrics;
}

/** Métricas de las publicaciones ya publicadas. */
export async function sincronizarPublicaciones(
  igUserId: string
): Promise<ResultadoSync<PublicacionSincronizada[]>> {
  const r = await pedir<{ publicaciones: PublicacionSincronizada[]; avisos: string[] }>(
    `/api/insights/publicaciones/${igUserId}`
  );
  if (!r.ok || !r.datos) return { ok: false, datos: [], avisos: [], error: r.error };
  return { ok: true, datos: r.datos.publicaciones ?? [], avisos: r.datos.avisos ?? [] };
}

/** Campañas de Meta Ads. */
export async function sincronizarAds(
  igUserId: string,
  clientId: string,
  adAccountId?: string
): Promise<ResultadoSync<(Omit<Ad, 'id'> & { externalId: string })[]>> {
  const query = adAccountId ? `?adAccountId=${encodeURIComponent(adAccountId)}` : '';
  const r = await pedir<{ campanas: (Omit<Ad, 'id' | 'clientId' | 'platform'> & { externalId: string })[] }>(
    `/api/ads/${igUserId}${query}`
  );
  if (!r.ok || !r.datos) return { ok: false, datos: [], avisos: [], error: r.error };

  return {
    ok: true,
    avisos: [],
    datos: (r.datos.campanas ?? []).map((c) => ({
      ...c,
      clientId,
      platform: 'instagram' as const,
    })),
  };
}

/* ------------------------- cambiar campañas en Meta ---------------------- */

// Estas dos escriben en la cuenta publicitaria del cliente, así que van con la
// sesión de la creadora. El servidor además las rechaza si no se prendió
// META_ADS_ESCRITURA: la decisión de poder gastar plata no vive en el navegador.

async function mandar<T>(
  ruta: string,
  cuerpo: unknown,
  sesion: string
): Promise<{ ok: boolean; datos?: T; error?: string }> {
  if (!API) {
    return { ok: false, error: 'No hay servidor configurado.' };
  }
  try {
    const res = await fetch(`${API}${ruta}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sesion}`,
      },
      body: JSON.stringify(cuerpo),
    });
    const datos = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: datos.error ?? `El servidor respondió ${res.status}` };
    return { ok: true, datos };
  } catch {
    return { ok: false, error: 'No se pudo contactar al servidor.' };
  }
}

/** Prende o apaga una campaña en Meta. Devuelve el estado que quedó. */
export async function cambiarEstadoEnMeta(
  igUserId: string,
  campaignId: string,
  estado: 'activa' | 'pausada',
  sesion: string
): Promise<{ ok: boolean; estado?: 'activa' | 'pausada' | 'finalizada'; error?: string }> {
  const r = await mandar<{ estado: 'activa' | 'pausada' | 'finalizada' }>(
    `/api/ads/${igUserId}/campanas/${encodeURIComponent(campaignId)}/estado`,
    { estado },
    sesion
  );
  return { ok: r.ok, estado: r.datos?.estado, error: r.error };
}

/** Cambia el presupuesto diario en Meta. Devuelve el que quedó. */
export async function cambiarPresupuestoEnMeta(
  igUserId: string,
  campaignId: string,
  diario: number,
  sesion: string
): Promise<{ ok: boolean; diario?: number; error?: string }> {
  const r = await mandar<{ diario: number }>(
    `/api/ads/${igUserId}/campanas/${encodeURIComponent(campaignId)}/presupuesto`,
    { diario },
    sesion
  );
  return { ok: r.ok, diario: r.datos?.diario, error: r.error };
}
