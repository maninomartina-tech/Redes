// ---------- Tipos centrales de la app ----------

export type Platform = 'instagram' | 'tiktok' | 'facebook';

export type PostType = 'reel' | 'post' | 'carrusel' | 'historia';

export type PostStatus =
  | 'idea' // idea general cargada
  | 'produccion' // en producción / grabación / diseño
  | 'revision' // enviado al cliente para aprobación
  | 'aprobado' // aprobado por el cliente
  | 'programado' // agendado para publicarse
  | 'publicado'; // ya publicado

export interface SocialAccount {
  id: string;
  platform: Platform;
  handle: string;
  connected: boolean;
  /** token simulado / referencia a credencial real (se conecta luego con Meta) */
  tokenRef?: string;
}

export interface Client {
  id: string;
  name: string;
  handle: string;
  color: string; // color de marca
  accounts: SocialAccount[];
}

export interface Comment {
  id: string;
  author: 'cliente' | 'creadora';
  authorName: string;
  text: string;
  createdAt: string; // ISO
  resolved: boolean;
}

export interface PostMetrics {
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  /** solo para reels/historias */
  views?: number;
  /** alcance de historia */
  taps?: number;
}

export interface Post {
  id: string;
  clientId: string;
  accountId: string;
  platform: Platform;
  type: PostType;
  title: string;
  date: string; // ISO (fecha y hora de publicación planificada)
  status: PostStatus;

  // --- Estructura en 3 partes que pidió la creadora ---
  ideaGeneral: string; // 1) la idea general
  contenido: string; // 2) el diálogo / guion / contenido (depende del tipo)
  copy: string; // 3) el copy / caption
  // --- Resultado final ---
  mediaUrl?: string; // el video / post que quedó (URL o placeholder)
  mediaKind?: 'image' | 'video';

  hashtags: string[];
  comments: Comment[];
  metrics?: PostMetrics; // presente si status === 'publicado'
  campaignId?: string;
}

export interface Campaign {
  id: string;
  clientId: string;
  name: string;
  month: string; // 'YYYY-MM'
  goal: string;
  budget?: number;
  postIds: string[];
}

export type AdStatus = 'activa' | 'pausada' | 'finalizada';

export interface Ad {
  id: string;
  clientId: string;
  platform: Platform;
  name: string;
  objective: string; // alcance, conversiones, tráfico...
  status: AdStatus;
  budget: number; // presupuesto total
  spend: number; // gastado
  impressions: number;
  clicks: number;
  conversions: number;
  linkedPostId?: string;
  startDate: string;
  endDate: string;
}

export type Role = 'creadora' | 'cliente';
