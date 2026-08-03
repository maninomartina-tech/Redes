import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  Ad,
  Campaign,
  Client,
  Comment,
  Lead,
  MediaRef,
  MonthlyStat,
  Post,
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

const uid = (p: string) =>
  `${p}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;

/**
 * localStorage puede no estar disponible (modo incógnito, iframe restringido).
 * En ese caso guardamos en memoria para que la app siga funcionando.
 */
function safeStorage(): Storage {
  try {
    const probe = '__demm_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
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

  // comentarios (correcciones)
  addComment: (postId: string, c: Omit<Comment, 'id' | 'createdAt' | 'resolved'>) => void;
  toggleComment: (postId: string, commentId: string) => void;

  // cuentas
  toggleAccount: (clientId: string, accountId: string) => void;
  updateAccount: (clientId: string, accountId: string, patch: Partial<SocialAccount>) => void;
  updateClient: (clientId: string, patch: Partial<Client>) => void;

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

      addComment: (postId, c) =>
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
        })),

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
      /**
       * Datos guardados antes de que existiera el módulo de crecimiento:
       * completamos lo que falte para que la app no se rompa.
       */
      migrate: (persisted, from) => {
        const s = persisted as Partial<State>;
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

// selectores útiles
export const useCurrentClient = () =>
  useStore((s) => s.clients.find((c) => c.id === s.currentClientId) ?? s.clients[0]);
