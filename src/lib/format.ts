import type { AdStatus, Platform, PostStatus, PostType } from '@/types';

export const statusLabel: Record<PostStatus, string> = {
  revision: 'En revisión',
  edicion: 'En edición',
  aprobado: 'Aprobado',
  programado: 'Programado',
  publicado: 'Publicado',
};

// clases tailwind por estado (chip) — pasteles con texto de buen contraste
export const statusChip: Record<PostStatus, string> = {
  revision: 'bg-sky-100 text-sky-600',
  edicion: 'bg-butter-100 text-butter-600',
  aprobado: 'bg-mint-100 text-mint-600',
  programado: 'bg-brand-100 text-brand-700',
  publicado: 'bg-ink-800 text-white',
};

export const statusDot: Record<PostStatus, string> = {
  revision: 'bg-sky-300',
  edicion: 'bg-butter-300',
  aprobado: 'bg-mint-300',
  programado: 'bg-brand-400',
  publicado: 'bg-ink-800',
};

export const statusOrder: PostStatus[] = [
  'revision',
  'edicion',
  'aprobado',
  'programado',
  'publicado',
];

/**
 * Las tres etapas de planificación: las únicas que llevan cartelito en el
 * calendario. Lo programado y lo publicado ya salió del circuito.
 */
export const etapasDePlan: PostStatus[] = ['revision', 'edicion', 'aprobado'];

/** Si esa pieza lleva cartelito de etapa o no. */
export const llevaCartelito = (s: PostStatus): boolean => etapasDePlan.includes(s);

/** Nombre corto, para donde no entra el largo (el calendario). */
export const statusCorto: Record<PostStatus, string> = {
  revision: 'Revisión',
  edicion: 'Edición',
  aprobado: 'Aprobado',
  programado: 'Programado',
  publicado: 'Publicado',
};

/** Cómo se llamaban antes, para no perder lo ya cargado. */
export const ESTADOS_VIEJOS: Record<string, PostStatus> = {
  idea: 'revision',
  produccion: 'edicion',
};

export const typeLabel: Record<PostType, string> = {
  reel: 'Reel',
  post: 'Post',
  carrusel: 'Carrusel',
  historia: 'Historia',
};

export const typeEmoji: Record<PostType, string> = {
  reel: '🎬',
  post: '🖼️',
  carrusel: '🎠',
  historia: '⚡',
};

export const platformLabel: Record<Platform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
};

export const adStatusChip: Record<AdStatus, string> = {
  activa: 'bg-mint-100 text-mint-600',
  pausada: 'bg-butter-100 text-butter-600',
  finalizada: 'bg-ink-100 text-ink-600',
};

export function nfmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.0', '') + 'k';
  return String(n);
}

export function money(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

export function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}
