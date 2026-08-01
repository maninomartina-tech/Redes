import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  Ad,
  Campaign,
  Client,
  Comment,
  Post,
  PostStatus,
  Role,
} from '@/types';
import { seedAds, seedCampaigns, seedClients, seedPosts } from '@/data/seed';

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

  // navegación / rol
  setRole: (r: Role) => void;
  setClient: (id: string) => void;

  // posts
  addPost: (p: Partial<Post> & { clientId: string }) => Post;
  updatePost: (id: string, patch: Partial<Post>) => void;
  removePost: (id: string) => void;
  setPostStatus: (id: string, status: PostStatus) => void;

  // comentarios (correcciones)
  addComment: (postId: string, c: Omit<Comment, 'id' | 'createdAt' | 'resolved'>) => void;
  toggleComment: (postId: string, commentId: string) => void;

  // cuentas
  toggleAccount: (clientId: string, accountId: string) => void;

  // ads
  addAd: (a: Partial<Ad> & { clientId: string }) => void;
  updateAd: (id: string, patch: Partial<Ad>) => void;

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

      updatePost: (id, patch) =>
        set((s) => ({
          posts: s.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),

      removePost: (id) =>
        set((s) => ({ posts: s.posts.filter((p) => p.id !== id) })),

      setPostStatus: (id, status) =>
        set((s) => ({
          posts: s.posts.map((p) => (p.id === id ? { ...p, status } : p)),
        })),

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

      resetDemo: () =>
        set({
          clients: seedClients,
          posts: seedPosts,
          campaigns: seedCampaigns,
          ads: seedAds,
          currentClientId: seedClients[0].id,
        }),
    }),
    { name: 'demm-redes-v1', storage: createJSONStorage(safeStorage) }
  )
);

// selectores útiles
export const useCurrentClient = () =>
  useStore((s) => s.clients.find((c) => c.id === s.currentClientId) ?? s.clients[0]);
