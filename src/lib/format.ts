import type { AdStatus, Platform, PostStatus, PostType } from '@/types';

export const statusLabel: Record<PostStatus, string> = {
  idea: 'Idea',
  produccion: 'Producción',
  revision: 'En revisión',
  aprobado: 'Aprobado',
  programado: 'Programado',
  publicado: 'Publicado',
};

// clases tailwind por estado (chip)
export const statusChip: Record<PostStatus, string> = {
  idea: 'bg-ink-100 text-ink-600',
  produccion: 'bg-amber-100 text-amber-700',
  revision: 'bg-sky-100 text-sky-700',
  aprobado: 'bg-emerald-100 text-emerald-700',
  programado: 'bg-brand-100 text-brand-700',
  publicado: 'bg-ink-900 text-white',
};

export const statusDot: Record<PostStatus, string> = {
  idea: 'bg-ink-400',
  produccion: 'bg-amber-500',
  revision: 'bg-sky-500',
  aprobado: 'bg-emerald-500',
  programado: 'bg-brand-500',
  publicado: 'bg-ink-900',
};

export const statusOrder: PostStatus[] = [
  'idea',
  'produccion',
  'revision',
  'aprobado',
  'programado',
  'publicado',
];

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
  activa: 'bg-emerald-100 text-emerald-700',
  pausada: 'bg-amber-100 text-amber-700',
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
