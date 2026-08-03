import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  Ad,
  Campaign,
  Client,
  Comment,
  HashtagSet,
  Lead,
  MediaRef,
  MonthlyStat,
  Platform,
  Post,
  PostMetrics,
  PostStatus,
  Role,
  SocialAccount,
} from '@/types';
import {
  seedAds,
  seedCampaigns,
  seedClients,
  seedLeads,
  seedMonthlyStats,
  seedPosts,
} from '@/data/seed';
import { DEFAULT_BRANDING, applyBranding, type Branding } from '@/lib/theme';
import type { PublicacionSincronizada } from '@/lib/sync';
import {
  cancelSchedule as cancelarEnMeta,
  motivoNoProgramable,
  schedulePost,
} from '@/lib/publish';
import {
  SesionVencida,
  comentarEnPortal,
  decidirEnPortal,
  entrar as entrarEnServidor,
  hayServidor,
  salir as salirDelServidor,
  subirEspacio,
  traerEspacio,
  traerPortal,
  type DatosEspacio,
} from '@/lib/espacio';

const uid = (p: string) =>
  `${p}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;

/** Un link de cliente: `#/c/<token>`. */
export function tokenDelPortalEnLaUrl(): string | null {
  const m = /^#\/c\/([^/?]+)/.exec(window.location.hash);
  return m ? m[1] : null;
}

function almacenamientoEnMemoria(): Storage {
  const mem = new Map<string, string>();
  return {
    get length() {
      return mem.size;
    },
    clear: () => mem.clear(),
    getItem: (k: string) => mem.get(k) ?? null,
    key: (i: number) => Array.from(mem.keys())[i] ?? null,
    removeItem: (k: string) => void mem.delete(k),
    setItem: (k: string, v: string) => void mem.set(k, v),
  } as Storage;
}

/**
 * localStorage puede no estar disponible (modo incógnito, iframe restringido).
 * En ese caso guardamos en memoria para que la app siga funcionando.
 *
 * Y si se entró por un link de cliente, tampoco se guarda: si la creadora abre
 * el link de un cliente para revisarlo, no queremos que eso le pise su propia
 * copia local.
 */
function safeStorage(): Storage {
  if (tokenDelPortalEnLaUrl()) return almacenamientoEnMemoria();
  try {
    const probe = '__demm_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return almacenamientoEnMemoria();
  }
}

/** Cómo está la app respecto del servidor. */
export interface Sincro {
  estado: 'local' | 'entrando' | 'cargando' | 'listo' | 'guardando' | 'error';
  mensaje?: string;
  /** Última vez que quedó guardado todo en el servidor */
  guardadoEn?: string;
}

interface State {
  role: Role;
  currentClientId: string;
  clients: Client[];
  posts: Post[];
  campaigns: Campaign[];
  ads: Ad[];
  monthlyStats: MonthlyStat[];
  leads: Lead[];

  // identidad visual de la app
  branding: Branding;
  brandLogo?: MediaRef;
  setBranding: (b: Partial<Branding>) => void;
  setBrandLogo: (m?: MediaRef) => void;

  // navegación / rol
  setRole: (r: Role) => void;
  setClient: (id: string) => void;

  // --- espacio compartido ---
  /** Sesión de la creadora en el servidor. */
  sesion: string | null;
  /** Token del link, cuando la app se abrió como cliente. */
  portal: string | null;
  sincro: Sincro;
  entrarComoCreadora: (usuario: string, clave: string) => Promise<string | null>;
  cerrarSesionCreadora: () => Promise<void>;
  /** Trae del servidor todo el espacio de trabajo. */
  cargarDelServidor: () => Promise<void>;
  /** Abre la app en modo cliente con el contenido de ese link. */
  abrirPortal: (token: string) => Promise<string | null>;

  // posts
  addPost: (p: Partial<Post> & { clientId: string }) => Post;
  updatePost: (id: string, patch: Partial<Post>) => void;
  removePost: (id: string) => void;
  setPostStatus: (id: string, status: PostStatus) => void;
  /** Trae al feed lo publicado en Instagram. Devuelve cuántas entraron y cuántas se actualizaron. */
  importarDeInstagram: (
    clientId: string,
    accountId: string,
    publicaciones: PublicacionSincronizada[]
  ) => { nuevas: number; actualizadas: number };

  // publicación automática
  autoSchedule: (id: string) => Promise<void>;
  cancelSchedule: (id: string) => Promise<void>;
  /** Programa lo que el cliente aprobó mientras la app estaba cerrada. */
  programarAprobados: () => Promise<void>;

  // comentarios (correcciones)
  addComment: (postId: string, c: Omit<Comment, 'id' | 'createdAt' | 'resolved'>) => void;
  toggleComment: (postId: string, commentId: string) => void;

  // cuentas
  toggleAccount: (clientId: string, accountId: string) => void;
  updateAccount: (clientId: string, accountId: string, patch: Partial<SocialAccount>) => void;
  updateClient: (clientId: string, patch: Partial<Client>) => void;
  /** Alta de una cuenta de cliente. Queda seleccionada. */
  addClient: (c: Partial<Client> & { name: string; handle: string }) => Client;
  /** Baja de una cuenta, con todo lo que colgaba de ella. */
  removeClient: (clientId: string) => void;
  addAccount: (clientId: string, a: Partial<SocialAccount> & { handle: string }) => void;
  removeAccount: (clientId: string, accountId: string) => void;

  // publicación a mano (mientras Meta no apruebe el permiso)
  marcarPublicado: (id: string, datos?: { fecha?: string; permalink?: string }) => void;
  setMetrics: (id: string, m: PostMetrics) => void;

  // hashtags guardados
  hashtagSets: HashtagSet[];
  addHashtagSet: (clientId: string, name: string, tags: string[]) => void;
  updateHashtagSet: (id: string, patch: Partial<HashtagSet>) => void;
  removeHashtagSet: (id: string) => void;

  // crecimiento (carga manual)
  upsertMonthlyStat: (s: Omit<MonthlyStat, 'id'> & { id?: string }) => void;
  removeMonthlyStat: (id: string) => void;

  // leads / ventas (carga manual)
  addLead: (l: Omit<Lead, 'id'>) => void;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  removeLead: (id: string) => void;

  // ads
  addAd: (a: Partial<Ad> & { clientId: string }) => void;
  updateAd: (id: string, patch: Partial<Ad>) => void;
  /** Alta o actualización por id de Meta, para la sincronización. */
  upsertAdExterno: (a: Omit<Ad, 'id'> & { externalId: string }) => void;

  // campañas
  addCampaign: (c: Partial<Campaign> & { clientId: string }) => void;

  resetDemo: () => void;
}

/** Lo que se guarda en el servidor: los datos, no la navegación ni la sesión. */
function datosDelEspacio(s: State): DatosEspacio {
  return {
    clients: s.clients,
    posts: s.posts,
    campaigns: s.campaigns,
    ads: s.ads,
    monthlyStats: s.monthlyStats,
    leads: s.leads,
    hashtagSets: s.hashtagSets,
    branding: s.branding,
    brandLogo: s.brandLogo,
  };
}

/**
 * Mientras se aplica lo que vino del servidor no hay que devolvérselo: sería
 * un ida y vuelta sin sentido y, si dos pestañas estuvieran abiertas, un
 * rebote entre las dos.
 */
let aplicando = false;
function aplicarDelServidor(fn: () => void) {
  aplicando = true;
  try {
    fn();
  } finally {
    aplicando = false;
  }
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      role: 'creadora',
      currentClientId: seedClients[0].id,
      clients: seedClients,
      posts: seedPosts,
      campaigns: seedCampaigns,
      ads: seedAds,
      monthlyStats: seedMonthlyStats,
      leads: seedLeads,
      branding: DEFAULT_BRANDING,
      brandLogo: undefined,

      setBranding: (b) =>
        set((s) => {
          const nueva = { ...s.branding, ...b };
          applyBranding(nueva);
          return { branding: nueva };
        }),

      setBrandLogo: (brandLogo) => set({ brandLogo }),

      setRole: (role) => set({ role }),
      setClient: (currentClientId) => set({ currentClientId }),

      /* ---------------------- espacio compartido ---------------------- */

      sesion: null,
      portal: null,
      sincro: { estado: 'local' },

      entrarComoCreadora: async (usuario, clave) => {
        set({ sincro: { estado: 'entrando' } });
        try {
          const sesion = await entrarEnServidor(usuario, clave);
          set({ sesion });
          await get().cargarDelServidor();
          return null;
        } catch (e) {
          const mensaje = e instanceof Error ? e.message : 'No se pudo entrar.';
          set({ sincro: { estado: 'error', mensaje } });
          return mensaje;
        }
      },

      cerrarSesionCreadora: async () => {
        const { sesion } = get();
        if (sesion) await salirDelServidor(sesion);
        set({ sesion: null, sincro: { estado: 'local' } });
      },

      /**
       * Trae el espacio del servidor. La primera vez está vacío: en ese caso
       * sube lo que ya había en este navegador, así no se pierde nada de lo
       * que se venía cargando antes de tener servidor.
       */
      cargarDelServidor: async () => {
        const { sesion } = get();
        if (!sesion) return;
        set({ sincro: { estado: 'cargando' } });
        try {
          const { datos, version } = await traerEspacio(sesion);

          if (version === 0 || (datos.clients ?? []).length === 0) {
            await subirEspacio(sesion, datosDelEspacio(get()));
            set({ sincro: { estado: 'listo', guardadoEn: new Date().toISOString() } });
            return;
          }

          aplicarDelServidor(() => {
            const branding = datos.branding ?? DEFAULT_BRANDING;
            applyBranding(branding);
            set({
              clients: datos.clients,
              posts: datos.posts ?? [],
              campaigns: datos.campaigns ?? [],
              ads: datos.ads ?? [],
              monthlyStats: datos.monthlyStats ?? [],
              leads: datos.leads ?? [],
              hashtagSets: datos.hashtagSets ?? [],
              branding,
              brandLogo: datos.brandLogo,
              currentClientId:
                datos.clients.find((c) => c.id === get().currentClientId)?.id ??
                datos.clients[0].id,
              sincro: { estado: 'listo' },
            });
          });

          // Lo que el cliente aprobó mientras esto estaba cerrado.
          await get().programarAprobados();
        } catch (e) {
          set({
            sincro: {
              estado: e instanceof SesionVencida ? 'local' : 'error',
              mensaje: e instanceof Error ? e.message : 'No se pudo traer tu información.',
            },
            ...(e instanceof SesionVencida ? { sesion: null } : {}),
          });
        }
      },

      abrirPortal: async (portal) => {
        set({ sincro: { estado: 'cargando' }, portal });
        try {
          const d = await traerPortal(portal);
          aplicarDelServidor(() => {
            const branding = d.branding ?? DEFAULT_BRANDING;
            applyBranding(branding);
            set({
              role: 'cliente',
              clients: [d.cliente],
              currentClientId: d.cliente.id,
              posts: d.posts,
              campaigns: d.campaigns,
              monthlyStats: d.monthlyStats,
              leads: d.leads,
              ads: [],
              branding,
              brandLogo: d.brandLogo ?? undefined,
              sincro: { estado: 'listo' },
            });
          });
          return null;
        } catch (e) {
          const mensaje =
            e instanceof Error ? e.message : 'Este link no es válido o fue dado de baja.';
          set({ sincro: { estado: 'error', mensaje } });
          return mensaje;
        }
      },

      addPost: (p) => {
        const client = get().clients.find((c) => c.id === p.clientId)!;
        const account = client.accounts[0];
        const post: Post = {
          id: uid('post'),
          clientId: p.clientId,
          accountId: p.accountId ?? account.id,
          platform: p.platform ?? account.platform,
          type: p.type ?? 'post',
          title: p.title ?? 'Nuevo contenido',
          date: p.date ?? new Date().toISOString(),
          status: p.status ?? 'idea',
          inspiracion: p.inspiracion ?? '',
          inspiracionUrl: p.inspiracionUrl,
          inspiracionMedia: p.inspiracionMedia ?? [],
          ideaGeneral: p.ideaGeneral ?? '',
          contenido: p.contenido ?? '',
          copy: p.copy ?? '',
          mediaUrl: p.mediaUrl,
          mediaKind: p.mediaKind,
          hashtags: p.hashtags ?? [],
          comments: [],
          campaignId: p.campaignId,
          metrics: p.metrics,
        };
        set((s) => ({ posts: [post, ...s.posts] }));
        return post;
      },

      updatePost: (id, patch) => {
        set((s) => ({
          posts: s.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }));
        // Si se sube la pieza final de algo ya aprobado, se programa sola.
        if (patch.resultado) {
          const p = get().posts.find((x) => x.id === id);
          if (p?.status === 'aprobado') void get().autoSchedule(id);
        }
      },

      removePost: (id) =>
        set((s) => ({ posts: s.posts.filter((p) => p.id !== id) })),

      /**
       * Trae al feed lo que ya está publicado en Instagram.
       *
       * Si una pieza ya existe en la app —porque se planificó acá y salió— se
       * actualiza con sus métricas en vez de duplicarla. Se reconoce por el id
       * de Instagram o, para lo que se programó desde acá, por la fecha.
       */
      importarDeInstagram: (clientId, accountId, publicaciones) => {
        let nuevas = 0;
        let actualizadas = 0;

        set((s) => {
          const posts = [...s.posts];

          publicaciones.forEach((pub) => {
            const metrics = pub.metrics;
            const igImageUrl = pub.imagen ?? undefined;

            // 1) ¿Ya la habíamos traído antes?
            let i = posts.findIndex(
              (p) => p.clientId === clientId && p.igMediaId === pub.externalId
            );

            // 2) Si no, ¿hay algo planificado acá que salió ese mismo día?
            if (i === -1) {
              const dia = pub.fecha.slice(0, 10);
              i = posts.findIndex(
                (p) =>
                  p.clientId === clientId &&
                  !p.igMediaId &&
                  ['programado', 'publicado'].includes(p.status) &&
                  p.date.slice(0, 10) === dia
              );
            }

            if (i !== -1) {
              posts[i] = {
                ...posts[i],
                status: 'publicado',
                metrics,
                igMediaId: pub.externalId,
                igPermalink: pub.permalink,
                igImageUrl: igImageUrl ?? posts[i].igImageUrl,
              };
              actualizadas++;
              return;
            }

            // 3) Es contenido que no pasó por la app: se suma al feed.
            const primeraLinea = pub.caption.split('\n')[0]?.trim() ?? '';
            posts.unshift({
              id: uid('post'),
              clientId,
              accountId,
              platform: 'instagram',
              type: (['reel', 'carrusel', 'post'].includes(pub.tipo)
                ? pub.tipo
                : 'post') as Post['type'],
              title: primeraLinea.slice(0, 80) || 'Publicación de Instagram',
              date: pub.fecha,
              status: 'publicado',
              ideaGeneral: '',
              contenido: '',
              copy: pub.caption,
              hashtags: [],
              comments: [],
              metrics,
              igMediaId: pub.externalId,
              igPermalink: pub.permalink,
              igImageUrl,
            });
            nuevas++;
          });

          return { posts };
        });

        return { nuevas, actualizadas };
      },

      /**
       * Al aprobar una pieza que ya tiene el resultado final cargado, queda
       * automáticamente programada para su fecha y hora. Si todavía falta la
       * pieza, se programa sola en cuanto se suba (ver updatePost).
       */
      setPostStatus: (id, status) => {
        set((s) => ({
          posts: s.posts.map((p) => (p.id === id ? { ...p, status } : p)),
        }));

        // Desde el link del cliente la decisión la registra el servidor, que
        // es el único lugar donde la creadora la va a ver.
        const { portal } = get();
        if (portal) {
          if (status === 'aprobado' || status === 'revision') {
            void decidirEnPortal(portal, id, status).catch(() => {
              set({
                sincro: {
                  estado: 'error',
                  mensaje: 'No se pudo guardar tu respuesta. Revisá tu conexión.',
                },
              });
            });
          }
          return;
        }

        if (status === 'aprobado') void get().autoSchedule(id);
      },

      autoSchedule: async (id) => {
        const post = get().posts.find((p) => p.id === id);
        if (!post) return;
        // Solo se programa lo aprobado y todavía no enviado.
        if (post.status !== 'aprobado') return;
        if (post.scheduleState === 'programado' || post.scheduleState === 'publicado') return;

        const client = get().clients.find((c) => c.id === post.clientId);
        const account = client?.accounts.find((a) => a.id === post.accountId);

        const motivo = motivoNoProgramable(post, account);
        if (motivo) {
          get().updatePost(id, { scheduleState: 'sin_programar', scheduleError: motivo });
          return;
        }

        const res = await schedulePost(post, account);
        get().updatePost(id, {
          scheduleState: res.ok ? 'programado' : 'error',
          scheduledAt: res.ok ? post.date : undefined,
          externalId: res.externalId,
          scheduleError: res.ok ? undefined : res.message,
        });
        if (res.ok) {
          set((s) => ({
            posts: s.posts.map((p) => (p.id === id ? { ...p, status: 'programado' } : p)),
          }));
        }
      },

      /**
       * El cliente aprueba desde su link, que escribe en el servidor. La
       * programación, en cambio, la dispara esta app. Al traer el espacio
       * revisamos qué se aprobó mientras tanto y lo agendamos.
       */
      programarAprobados: async () => {
        const pendientes = get().posts.filter(
          (p) =>
            p.status === 'aprobado' &&
            p.resultado &&
            p.scheduleState !== 'programado' &&
            p.scheduleState !== 'publicado'
        );
        for (const p of pendientes) await get().autoSchedule(p.id);
      },

      cancelSchedule: async (id) => {
        const post = get().posts.find((p) => p.id === id);
        if (!post) return;
        await cancelarEnMeta(post);
        get().updatePost(id, {
          scheduleState: 'sin_programar',
          scheduledAt: undefined,
          externalId: undefined,
          scheduleError: undefined,
          status: 'aprobado',
        });
      },

      addComment: (postId, c) => {
        const { portal } = get();
        if (portal) {
          void comentarEnPortal(portal, postId, c.text).catch(() => {
            set({
              sincro: {
                estado: 'error',
                mensaje: 'No se pudo enviar tu comentario. Revisá tu conexión.',
              },
            });
          });
        }
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  comments: [
                    ...p.comments,
                    {
                      ...c,
                      id: uid('cm'),
                      createdAt: new Date().toISOString(),
                      resolved: false,
                    },
                  ],
                }
              : p
          ),
        }));
      },

      toggleComment: (postId, commentId) =>
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  comments: p.comments.map((cm) =>
                    cm.id === commentId ? { ...cm, resolved: !cm.resolved } : cm
                  ),
                }
              : p
          ),
        })),

      toggleAccount: (clientId, accountId) =>
        set((s) => ({
          clients: s.clients.map((c) =>
            c.id === clientId
              ? {
                  ...c,
                  accounts: c.accounts.map((a) =>
                    a.id === accountId ? { ...a, connected: !a.connected } : a
                  ),
                }
              : c
          ),
        })),

      updateAccount: (clientId, accountId, patch) =>
        set((s) => ({
          clients: s.clients.map((c) =>
            c.id === clientId
              ? {
                  ...c,
                  accounts: c.accounts.map((a) =>
                    a.id === accountId ? { ...a, ...patch } : a
                  ),
                }
              : c
          ),
        })),

      upsertAdExterno: (a) =>
        set((s) => {
          const existente = s.ads.find(
            (x) => x.clientId === a.clientId && x.name === a.name
          );
          if (existente) {
            return { ads: s.ads.map((x) => (x.id === existente.id ? { ...x, ...a } : x)) };
          }
          return { ads: [{ ...a, id: uid('ad') }, ...s.ads] };
        }),

      updateClient: (clientId, patch) =>
        set((s) => ({
          clients: s.clients.map((c) => (c.id === clientId ? { ...c, ...patch } : c)),
        })),

      addClient: (c) => {
        const id = uid('cli');
        const cliente: Client = {
          id,
          name: c.name,
          handle: c.handle.startsWith('@') ? c.handle : `@${c.handle}`,
          color: c.color ?? '#7A4A3F',
          // Toda cuenta arranca al menos con su Instagram.
          accounts: c.accounts ?? [
            {
              id: uid('acc'),
              platform: 'instagram',
              handle: c.handle.startsWith('@') ? c.handle : `@${c.handle}`,
              connected: false,
            },
          ],
          startDate: c.startDate,
          startingFollowers: c.startingFollowers,
          tracksLeads: c.tracksLeads ?? false,
          logo: c.logo,
        };
        set((s) => ({ clients: [...s.clients, cliente], currentClientId: id }));
        return cliente;
      },

      /**
       * Da de baja una cuenta con todo lo suyo. Dejar el contenido huérfano
       * ensuciaría las métricas de las demás, así que se va junto.
       */
      removeClient: (clientId) =>
        set((s) => {
          const clients = s.clients.filter((c) => c.id !== clientId);
          return {
            clients,
            posts: s.posts.filter((p) => p.clientId !== clientId),
            campaigns: s.campaigns.filter((c) => c.clientId !== clientId),
            ads: s.ads.filter((a) => a.clientId !== clientId),
            monthlyStats: s.monthlyStats.filter((m) => m.clientId !== clientId),
            leads: s.leads.filter((l) => l.clientId !== clientId),
            hashtagSets: s.hashtagSets.filter((h) => h.clientId !== clientId),
            currentClientId:
              s.currentClientId === clientId ? clients[0]?.id ?? '' : s.currentClientId,
          };
        }),

      addAccount: (clientId, a) =>
        set((s) => ({
          clients: s.clients.map((c) =>
            c.id === clientId
              ? {
                  ...c,
                  accounts: [
                    ...c.accounts,
                    {
                      id: uid('acc'),
                      platform: (a.platform ?? 'instagram') as Platform,
                      handle: a.handle.startsWith('@') ? a.handle : `@${a.handle}`,
                      connected: a.connected ?? false,
                      metaAccountId: a.metaAccountId,
                    },
                  ],
                }
              : c
          ),
        })),

      removeAccount: (clientId, accountId) =>
        set((s) => ({
          clients: s.clients.map((c) =>
            c.id === clientId
              ? { ...c, accounts: c.accounts.filter((a) => a.id !== accountId) }
              : c
          ),
        })),

      /**
       * "Ya lo subí a Instagram."
       *
       * Mientras Meta no apruebe el permiso de publicar, este es el camino
       * normal: se sube a mano y se marca acá, para que el feed, las métricas
       * y lo que ve el cliente queden al día.
       */
      marcarPublicado: (id, datos) =>
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: 'publicado',
                  publicadoAMano: true,
                  date: datos?.fecha ?? p.date,
                  igPermalink: datos?.permalink || p.igPermalink,
                  scheduleState: undefined,
                  scheduleError: undefined,
                }
              : p
          ),
        })),

      setMetrics: (id, metrics) =>
        set((s) => ({
          posts: s.posts.map((p) => (p.id === id ? { ...p, metrics } : p)),
        })),

      hashtagSets: [],

      addHashtagSet: (clientId, name, tags) =>
        set((s) => ({
          hashtagSets: [...s.hashtagSets, { id: uid('ht'), clientId, name, tags }],
        })),

      updateHashtagSet: (id, patch) =>
        set((s) => ({
          hashtagSets: s.hashtagSets.map((h) => (h.id === id ? { ...h, ...patch } : h)),
        })),

      removeHashtagSet: (id) =>
        set((s) => ({ hashtagSets: s.hashtagSets.filter((h) => h.id !== id) })),

      // Una sola carga por cliente y mes: si ya existe ese mes, lo reemplaza.
      upsertMonthlyStat: (stat) =>
        set((s) => {
          const existente = s.monthlyStats.find(
            (m) => m.clientId === stat.clientId && m.month === stat.month
          );
          if (existente) {
            return {
              monthlyStats: s.monthlyStats.map((m) =>
                m.id === existente.id ? { ...m, ...stat, id: existente.id } : m
              ),
            };
          }
          return {
            monthlyStats: [...s.monthlyStats, { ...stat, id: stat.id ?? uid('ms') }],
          };
        }),

      removeMonthlyStat: (id) =>
        set((s) => ({ monthlyStats: s.monthlyStats.filter((m) => m.id !== id) })),

      addLead: (l) => set((s) => ({ leads: [{ ...l, id: uid('ld') }, ...s.leads] })),

      updateLead: (id, patch) =>
        set((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),

      removeLead: (id) => set((s) => ({ leads: s.leads.filter((l) => l.id !== id) })),

      addAd: (a) =>
        set((s) => ({
          ads: [
            {
              id: uid('ad'),
              clientId: a.clientId,
              platform: a.platform ?? 'instagram',
              name: a.name ?? 'Nueva campaña ADS',
              objective: a.objective ?? 'Alcance',
              status: a.status ?? 'activa',
              budget: a.budget ?? 0,
              spend: a.spend ?? 0,
              impressions: a.impressions ?? 0,
              clicks: a.clicks ?? 0,
              conversions: a.conversions ?? 0,
              linkedPostId: a.linkedPostId,
              startDate: a.startDate ?? new Date().toISOString(),
              endDate: a.endDate ?? new Date().toISOString(),
            },
            ...s.ads,
          ],
        })),

      updateAd: (id, patch) =>
        set((s) => ({ ads: s.ads.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),

      addCampaign: (c) =>
        set((s) => ({
          campaigns: [
            {
              id: uid('camp'),
              clientId: c.clientId,
              name: c.name ?? 'Nueva campaña',
              month: c.month ?? new Date().toISOString().slice(0, 7),
              goal: c.goal ?? '',
              budget: c.budget,
              postIds: c.postIds ?? [],
            },
            ...s.campaigns,
          ],
        })),

      resetDemo: () => {
        set({
          clients: seedClients,
          posts: seedPosts,
          campaigns: seedCampaigns,
          ads: seedAds,
          monthlyStats: seedMonthlyStats,
          leads: seedLeads,
          hashtagSets: [],
          branding: DEFAULT_BRANDING,
          brandLogo: undefined,
          currentClientId: seedClients[0].id,
        });
        applyBranding(DEFAULT_BRANDING);
      },
    }),
    {
      name: 'demm-redes-v1',
      storage: createJSONStorage(safeStorage),
      version: 2,
      /** El estado de la sincronización se recalcula al arrancar. */
      partialize: ({ sincro: _sincro, portal: _portal, ...resto }) => resto,
      /**
       * Datos guardados antes de que existiera el módulo de crecimiento:
       * completamos lo que falte para que la app no se rompa.
       */
      migrate: (persisted, from) => {
        const s = persisted as Partial<State>;
        s.hashtagSets ??= [];
        if (from < 2) {
          s.monthlyStats ??= seedMonthlyStats;
          s.leads ??= seedLeads;
          s.clients = (s.clients ?? seedClients).map((c) => {
            const base = seedClients.find((x) => x.id === c.id);
            return {
              ...c,
              startDate: c.startDate ?? base?.startDate,
              startingFollowers: c.startingFollowers ?? base?.startingFollowers,
              tracksLeads: c.tracksLeads ?? base?.tracksLeads ?? false,
            };
          });
        }
        return s as State;
      },
      onRehydrateStorage: () => (state) => {
        if (state?.branding) applyBranding(state.branding);
      },
    }
  )
);

/* ---------------------------------------------------------------------------
 * Guardado automático.
 *
 * No hay botón de "guardar": cada cambio se manda al servidor. Se espera un
 * momento antes de mandarlo para no disparar una llamada por cada tecla
 * mientras se escribe un copy.
 * ------------------------------------------------------------------------- */

const CLAVES_DE_DATOS = [
  'clients',
  'posts',
  'campaigns',
  'ads',
  'monthlyStats',
  'leads',
  'hashtagSets',
  'branding',
  'brandLogo',
] as const;

const ESPERA_MS = 1200;

let temporizador: ReturnType<typeof setTimeout> | undefined;
let anterior = useStore.getState();

async function guardarAhora() {
  const s = useStore.getState();
  if (!s.sesion) return;

  useStore.setState({ sincro: { ...s.sincro, estado: 'guardando' } });
  try {
    await subirEspacio(s.sesion, datosDelEspacio(s));
    useStore.setState({
      sincro: { estado: 'listo', guardadoEn: new Date().toISOString() },
    });
  } catch (e) {
    if (e instanceof SesionVencida) {
      useStore.setState({ sesion: null, sincro: { estado: 'local', mensaje: e.message } });
      return;
    }
    useStore.setState({
      sincro: {
        estado: 'error',
        mensaje:
          'No se pudieron guardar los últimos cambios en el servidor. ' +
          'Quedaron en este dispositivo; se reintenta con el próximo cambio.',
      },
    });
  }
}

if (hayServidor()) {
  useStore.subscribe((s) => {
    const cambio = CLAVES_DE_DATOS.some((k) => s[k] !== anterior[k]);
    anterior = s;
    if (!cambio || aplicando || !s.sesion) return;

    clearTimeout(temporizador);
    temporizador = setTimeout(() => void guardarAhora(), ESPERA_MS);
  });
}

// selectores útiles
export const useCurrentClient = () =>
  useStore((s) => s.clients.find((c) => c.id === s.currentClientId) ?? s.clients[0]);
