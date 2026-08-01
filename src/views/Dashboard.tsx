import {
  ArrowRight,
  CalendarClock,
  MessageSquareWarning,
  Send,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, useCurrentClient } from '@/store/useStore';
import { fmtDateTime, isSameMonth } from '@/lib/date';
import { statusChip, statusLabel, statusOrder, typeEmoji } from '@/lib/format';
import { nfmt } from '@/lib/format';
import { computeGrowth, computeLeads } from '@/lib/growth';
import { Avatar, MediaThumb, SectionTitle, Stat } from '@/components/ui';
import AddContentButton from '@/components/AddContentButton';
import PostDetail from '@/components/PostDetail';
import { useState } from 'react';

export default function Dashboard() {
  const { posts, monthlyStats, leads } = useStore();
  const client = useCurrentClient();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);

  const clientPosts = posts.filter((p) => p.clientId === client.id);
  const now = new Date();

  const thisMonth = clientPosts.filter((p) => isSameMonth(new Date(p.date), now));
  const upcoming = clientPosts
    .filter((p) => new Date(p.date) >= now && p.status !== 'publicado')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
  const pendingComments = clientPosts.flatMap((p) =>
    p.comments.filter((c) => !c.resolved && c.author === 'cliente').map((c) => ({ post: p, comment: c }))
  );
  const needsReview = clientPosts.filter((p) => p.status === 'revision');

  const growth = useMemo(
    () => computeGrowth(client, monthlyStats, posts),
    [client, monthlyStats, posts]
  );
  const leadsSummary = useMemo(() => computeLeads(leads, client.id), [leads, client.id]);

  const countByStatus = useMemo(() => {
    const m: Record<string, number> = {};
    statusOrder.forEach((s) => (m[s] = 0));
    thisMonth.forEach((p) => (m[p.status] = (m[p.status] ?? 0) + 1));
    return m;
  }, [thisMonth]);

  return (
    <div>
      <SectionTitle
        title={
          <span className="flex items-center gap-2.5">
            <Avatar name={client.name} color={client.color} size={30} />
            {client.name}
          </span>
        }
        subtitle="Panel general del cliente seleccionado."
        action={<AddContentButton onCreated={setSelected} />}
      />

      {/* KPIs */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Contenido este mes" value={thisMonth.length} icon={<Sparkles size={16} />} />
        <Stat
          label="Por revisar (cliente)"
          value={needsReview.length}
          hint={needsReview.length ? 'Esperando aprobación' : 'Todo al día'}
        />
        <Stat
          label="Programados"
          value={thisMonth.filter((p) => p.status === 'programado').length}
          icon={<Send size={16} />}
        />
        <Stat label="Correcciones abiertas" value={pendingComments.length} />
      </div>

      {/* crecimiento de la cuenta */}
      {growth.hasBaseline && (
        <button
          onClick={() => navigate('/crecimiento')}
          className="card mb-4 flex w-full flex-wrap items-center gap-x-6 gap-y-3 p-4 text-left transition hover:shadow-lift"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-800">
            <TrendingUp size={18} />
          </span>
          <div>
            <p className="label">Seguidores</p>
            <p className="font-bold text-ink-900">
              {nfmt(growth.currentFollowers)}{' '}
              <span className="text-sm font-semibold text-mint-600">
                +{nfmt(growth.gained)} desde el inicio
              </span>
            </p>
          </div>
          <div>
            <p className="label">Promedio por mes</p>
            <p className="font-bold text-ink-900">+{Math.round(growth.avgPerMonth)}</p>
          </div>
          {client.tracksLeads && leadsSummary.total > 0 && (
            <div>
              <p className="label">Consultas concretadas</p>
              <p className="font-bold text-ink-900">
                {leadsSummary.ganados}
                <span className="text-sm font-medium text-ink-500"> de {leadsSummary.total}</span>
              </p>
            </div>
          )}
          <ArrowRight size={18} className="ml-auto shrink-0 text-ink-400" />
        </button>
      )}

      {/* distribución por estado */}
      <div className="card mb-4 p-4">
        <h3 className="mb-3 font-bold text-ink-800">Estado del contenido de este mes</h3>
        <div className="flex flex-wrap gap-2">
          {statusOrder.map((s) => (
            <span key={s} className={`chip ${statusChip[s]}`}>
              {statusLabel[s]} · {countByStatus[s] ?? 0}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* próximas publicaciones */}
        <div className="card p-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarClock size={18} className="text-brand-600" />
            <h3 className="font-bold text-ink-800">Próximas publicaciones</h3>
          </div>
          {upcoming.length === 0 && (
            <p className="text-sm text-ink-400">No hay contenido próximo programado.</p>
          )}
          <div className="space-y-2">
            {upcoming.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-ink-50"
              >
                <MediaThumb src={p.mediaUrl} kind={p.mediaKind} className="h-11 w-11 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-800">
                    {typeEmoji[p.type]} {p.title}
                  </p>
                  <p className="text-xs text-ink-400">{fmtDateTime(p.date)}</p>
                </div>
                <span className={`chip ${statusChip[p.status]}`}>{statusLabel[p.status]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* correcciones del cliente */}
        <div className="card p-4">
          <div className="mb-3 flex items-center gap-2">
            <MessageSquareWarning size={18} className="text-rose-600" />
            <h3 className="font-bold text-ink-800">Correcciones del cliente</h3>
          </div>
          {pendingComments.length === 0 && (
            <p className="text-sm text-ink-400">Sin correcciones pendientes. 🎉</p>
          )}
          <div className="space-y-2">
            {pendingComments.slice(0, 5).map(({ post, comment }) => (
              <button
                key={comment.id}
                onClick={() => setSelected(post.id)}
                className="block w-full rounded-xl border border-ink-200/70 p-2.5 text-left hover:bg-ink-50"
              >
                <p className="text-xs font-semibold text-ink-500">{post.title}</p>
                <p className="line-clamp-2 text-sm text-ink-700">“{comment.text}”</p>
              </button>
            ))}
          </div>
          {needsReview.length > 0 && (
            <button
              onClick={() => navigate('/planificacion')}
              className="btn-soft mt-3 w-full"
            >
              Ver {needsReview.length} pieza(s) en revisión
            </button>
          )}
        </div>
      </div>

      <PostDetail postId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
