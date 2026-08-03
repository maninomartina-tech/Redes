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
  /**
   * Id de la cuenta de Instagram en Meta, una vez vinculada desde el servidor.
   * Es lo que permite traer métricas y publicar en la cuenta correcta.
   */
  metaAccountId?: string;
}

export interface Client {
  id: string;
  name: string;
  handle: string;
  color: string; // color de marca
  accounts: SocialAccount[];

  // --- Punto de partida: sirve para mostrar el crecimiento desde que
  // la creadora empezó a llevar la cuenta ---
  /** Fecha en que se empezó a gestionar la cuenta (ISO) */
  startDate?: string;
  /** Seguidores que tenía la cuenta ese día */
  startingFollowers?: number;
  /** Si con este cliente se miden leads/ventas (no todos lo hacen) */
  tracksLeads?: boolean;
  /** Logo del cliente, si se subió (si no, se usan sus iniciales) */
  logo?: MediaRef;
}

/** Un grupo de hashtags guardado para reutilizar. */
export interface HashtagSet {
  id: string;
  clientId: string;
  name: string;
  tags: string[];
}

/**
 * Foto mensual de la cuenta. Se carga a mano: no depende de Meta, así que
 * sirve igual para cuentas sin conexión a la API.
 */
export interface MonthlyStat {
  id: string;
  clientId: string;
  month: string; // 'YYYY-MM'
  /** Seguidores al cierre del mes */
  followers: number;
  /** Interacciones del mes. Si se deja vacío se calcula con los posts publicados. */
  interactions?: number;
  /** Alcance del mes (opcional) */
  reach?: number;
  /** Visitas al perfil (opcional) */
  profileVisits?: number;
  note?: string;
}

export type LeadSource = 'whatsapp' | 'dm' | 'comentario' | 'web' | 'presencial' | 'otro';

export type LeadStatus = 'nuevo' | 'contactado' | 'ganado' | 'perdido';

/**
 * Consulta o venta que llegó por las redes. Se carga a mano porque
 * normalmente el contacto se concreta por WhatsApp.
 */
export interface Lead {
  id: string;
  clientId: string;
  date: string; // ISO
  name: string;
  source: LeadSource;
  status: LeadStatus;
  /** Monto de la venta, si se concretó */
  amount?: number;
  /** Contenido que trajo la consulta, si se sabe */
  linkedPostId?: string;
  note?: string;
}

/** Archivo subido por la creadora (vive en IndexedDB, ver lib/media.ts) */
export interface MediaRef {
  id: string;
  name: string;
  kind: 'image' | 'video';
  size: number;
  /**
   * Copia en el servidor. Sin esto el archivo existe solo en el navegador de
   * quien lo subió: el cliente entraría a su link y no vería ninguna pieza.
   */
  remoteId?: string;
  /** Dirección pública de esa copia. */
  url?: string;
}

/** Estado de la publicación automática en la red social */
export type ScheduleState = 'sin_programar' | 'programado' | 'publicado' | 'error';

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

  // --- De dónde nace la publicación ---
  /** Tendencia, referencia o disparador que originó el contenido */
  inspiracion?: string;
  /** Link a la referencia (reel de la tendencia, pin, etc.) */
  inspiracionUrl?: string;
  /** Imágenes o videos de referencia subidos por la creadora */
  inspiracionMedia?: MediaRef[];

  // --- Estructura en 3 partes que pidió la creadora ---
  ideaGeneral: string; // 1) la idea general
  contenido: string; // 2) el diálogo / guion / contenido (depende del tipo)
  copy: string; // 3) el copy / caption
  // --- Resultado final ---
  mediaUrl?: string; // placeholder de color mientras no hay pieza cargada
  mediaKind?: 'image' | 'video';
  /** La pieza terminada que se va a publicar */
  resultado?: MediaRef;

  // --- Rastro en Instagram (para lo traído de la cuenta) ---
  /** Id de la publicación en Instagram, si vino de ahí o ya se publicó */
  igMediaId?: string;
  /** Link a la publicación en Instagram */
  igPermalink?: string;
  /** Imagen de portada que devuelve Instagram */
  igImageUrl?: string;

  // --- Publicación automática ---
  /** Estado del envío a la red social */
  scheduleState?: ScheduleState;
  /** Fecha y hora para la que quedó programada la publicación */
  scheduledAt?: string;
  /** Id que devuelve la red social una vez publicado */
  externalId?: string;
  /** Motivo por el que no se pudo programar o publicar */
  scheduleError?: string;
  /**
   * Se subió a mano, no por la app. Mientras Meta no apruebe el permiso de
   * publicar, este es el camino normal.
   */
  publicadoAMano?: boolean;

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
