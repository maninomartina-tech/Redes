import { Heart, Bookmark, Eye, Share2, MessageCircle } from 'lucide-react';
import { useMemo } from 'react';
import { useStore, useCurrentClient } from '@/store/useStore';
import { analyzeCampaign } from '@/lib/ai';
import { nfmt, pct } from '@/lib/format';
import { fmt } from '@/lib/date';
import { EmptyState, SectionTitle, Stat } from '@/components/ui';

export default function ClientResults() {
  const { posts, campaigns } = useStore();
  const client = useCurrentClient();

  const clientCampaigns = campaigns
    .filter((c) => c.clientId === client.id)
    .sort((a, b) => b.month.localeCompare(a.month));
  const campaign = clientCampaigns[0];
  const campaignPosts = posts.filter((p) => p.campaignId === campaign?.id);
  const analysis = useMemo(
    () => (campaign ? analyzeCampaign(campaign, campaignPosts) : null),
    [campaign, campaignPosts]
  );

  const totals = useMemo(() => {
    const pub = posts.filter(
      (p) => p.clientId === client.id && p.status === 'publicado' && p.metrics
    );
    return pub.reduce(
      (acc, p) => {
        acc.likes += p.metrics!.likes;
        acc.comments += p.metrics!.comments;
        acc.saves += p.metrics!.saves;
        acc.shares += p.metrics!.shares;
        acc.reach += p.metrics!.reach;
        return acc;
      },
      { likes: 0, comments: 0, saves: 0, shares: 0, reach: 0 }
    );
  }, [posts, client.id]);

  if (!analysis || analysis.totalReach === 0) {
    return (
      <div>
        <SectionTitle title="Tus resultados" />
        <EmptyState
          title="Todavía no hay resultados para mostrar"
          hint="Cuando se publique contenido, vas a ver acá cómo funcionó."
        />
      </div>
    );
  }

  return (
    <div>
      <SectionTitle
        title="Tus resultados"
        subtitle={`Resumen de ${campaign?.name} — ${fmt(campaign!.month + '-01', 'MMMM yyyy')}.`}
      />

      <div className="card mb-4 bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white">
        <p className="text-sm text-white/80">Este mes tu contenido llegó a</p>
        <p className="text-4xl font-extrabold">{nfmt(analysis.totalReach)} personas</p>
        <p className="mt-1 text-sm text-white/80">
          con una tasa de interacción del {pct(analysis.engagementRate)} · {' '}
          {campaignPosts.filter((p) => p.status === 'publicado').length} publicaciones
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Me gusta" value={nfmt(totals.likes)} icon={<Heart size={16} />} />
        <Stat label="Comentarios" value={nfmt(totals.comments)} icon={<MessageCircle size={16} />} />
        <Stat label="Guardados" value={nfmt(totals.saves)} icon={<Bookmark size={16} />} />
        <Stat label="Compartidos" value={nfmt(totals.shares)} icon={<Share2 size={16} />} />
        <Stat label="Alcance" value={nfmt(totals.reach)} icon={<Eye size={16} />} />
      </div>

      <div className="card p-4">
        <h3 className="mb-2 font-bold text-ink-800">Resumen del mes</h3>
        <p className="text-sm text-ink-600">{analysis.summary}</p>
        <div className="mt-3 space-y-2">
          {analysis.insights.slice(0, 3).map((ins, i) => (
            <p key={i} className="text-sm text-ink-600">
              <span className="font-semibold text-ink-800">• {ins.title}.</span> {ins.detail}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
