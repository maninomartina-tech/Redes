// ---------- Tipos centrales de la app ----------

export type Platform = 'instagram' | 'tiktok' | 'facebook';

export type PostType = 'reel' | 'post' | 'carrusel' | 'historia';

/**
 * El recorrido de una pieza, con los nombres que usa ella:
 *
 *   se crea la idea  →  revisión   (el cliente la mira)
 *   la aprueba       →  edición    (se produce la pieza)
 *   la pieza está    →  revisión   (el cliente la mira de nuevo)
 *   la aprueba       →  aprobado   (lista para salir)
 *
 * `programado` y `publicado` ya no son etapas de planificación: son lo que
 * pasa después, y por eso en el calendario no llevan cartelito.
 */
export type PostStatus =
  | 'revision' // esperando al cliente: la idea o la pieza final
  | 'edicion' // aprobada la idea, se está produciendo
  | 'aprobado' // el cliente aprobó la pieza: lista para publicar
  | 'programado' // agendada para publicarse sola
  | 'publicado'; // ya salió

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
  /**
   * Otras cuentas de la misma persona.
   *
   * Un cliente con dos Instagram son dos cuentas acá —cada una con su
   * calendario, su feed y sus números, que es lo correcto porque son dos
   * perfiles distintos—, pero una sola persona que las revisa. Vinculándolas,
   * con un solo link puede pasar de una a la otra.
   *
   * Es el grupo completo, no de a pares: vinculando A con B y después B con C,
   * las tres quedan viéndose entre sí. Guardar el grupo entero en cada una
   * ahorra tener que recorrer relaciones para saber quién ve qué.
   */
  vinculadas?: string[];
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
 *
 * Los campos son los mismos que Instagram muestra en su resumen del mes, que
 * es de donde ella copia los números: seguidores, visualizaciones y cuántas
 * de esas visualizaciones fueron de gente que todavía no la sigue.
 */
export interface MonthlyStat {
  id: string;
  clientId: string;
  month: string; // 'YYYY-MM'
  /** Seguidores al cierre del mes */
  followers: number;

  /** Visualizaciones del mes */
  views?: number;
  /**
   * Variación de las visualizaciones respecto del mes anterior.
   *
   * Se guarda solo si la escribió a mano: cuando el mes anterior también está
   * cargado, el porcentaje se calcula solo y no hace falta guardarlo. Sirve
   * para el primer mes, donde el único dato es el que muestra Instagram.
   */
  viewsPct?: number;
  /** Visualizaciones de cuentas que no la siguen */
  nonFollowerViews?: number;
  /** Variación de esas visualizaciones, si la escribió a mano */
  nonFollowerViewsPct?: number;

  /** Interacciones del mes. Si se deja vacío se calcula con los posts publicados. */
  interactions?: number;
  /** Alcance del mes (lo trae la sincronización con Meta) */
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
  /**
   * La pieza terminada que representa la publicación: la foto del post, el
   * video del reel, la primera imagen del carrusel. Es la que se ve en el feed
   * y la que se sube al publicar.
   */
  resultado?: MediaRef;
  /**
   * El resto de las imágenes del carrusel, en orden, después de `resultado`.
   * Un carrusel son varias imágenes; las demás publicaciones son una sola.
   */
  carrusel?: MediaRef[];
  /**
   * Portada del reel: la imagen que se ve en el feed mientras el video está
   * quieto. Es aparte del video, y en Instagram se elige aparte.
   */
  portada?: MediaRef;

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

/**
 * Una campaña paga.
 *
 * Los primeros campos son los que devuelve Meta Ads cuando la cuenta está
 * conectada. Los de abajo se cargan a mano, y son los que Instagram muestra
 * al final de una promoción: es lo que ella tiene a mano hoy.
 */
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
  /**
   * Id de la campaña en Meta, si vino de ahí. Es lo que permite pausarla o
   * cambiarle el presupuesto desde acá: una campaña cargada a mano no existe
   * en Meta y no hay nada que tocar.
   */
  externalId?: string;

  // --- Resultados cargados a mano ---
  /** Presupuesto por día */
  dailyBudget?: number;
  /** Duración en días */
  days?: number;
  /** Visualizaciones */
  views?: number;
  /** Interacción: me gusta */
  likes?: number;
  /** Interacción: veces que se guardó */
  saves?: number;
  /** Interacción: veces que se compartió */
  shares?: number;
  /** Actividad del perfil (visitas, toques al link, etc.) */
  profileActivity?: number;
  /** Seguidores nuevos que trajo la campaña */
  newFollowers?: number;
  /** true si los resultados los cargó ella y no vinieron de Meta */
  manual?: boolean;
}

export type Role = 'creadora' | 'cliente';
