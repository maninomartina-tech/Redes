import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Grid3x3,
  Lightbulb,
  MessageSquare,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, useCurrentClient } from '@/store/useStore';
import type { Post } from '@/types';
import { computeGrowth } from '@/lib/growth';
import { nfmt, statusChip, statusLabel, typeEmoji, typeLabel } from '@/lib/format';
import { fmt, fmtTime, isSameDay, weekDays } from '@/lib/date';
import { MediaPreview } from '@/components/MediaUploader';
import PostDetail from '@/components/PostDetail';
import Logo from '@/components/Logo';
import { Avatar, MediaThumb } from '@/components/ui';
import { useBaseCliente } from '@/lib/rutas';
import { palabra, plural } from '@/lib/texto';

export default function ClientHome() {
  const { posts, monthlyStats } = useStore();
  const client = useCurrentClient();
  const navigate = useNavigate();
  const base = useBaseCliente();
  const [selected, setSelected] = useState<string | null>(null);

  const míos = useMemo(
    () => posts.filter((p) => p.clientId === client.id),
    [posts, client.id]
  );

  const growth = useMemo(
    () => computeGrowth(client, monthlyStats, posts),
    [client, monthlyStats, posts]
  );

  const days = weekDays(new Date());
  const estaSemana = míos
    .filter((p) => days.some((d) => isSameDay(new Date(p.date), d)))
    .sort((a, b) => a.date.localeCompare(b.date));

  const porRevisar = míos.filter((p) => p.status === 'revision');
  const comentariosAbiertos = míos.reduce(
    (n, p) => n + p.comments.filter((c) => !c.resolved).length,
    0
  );

  // Grilla del feed: lo más reciente primero, sin historias.
  const feed = míos
    .filter((p) => p.type !== 'historia')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 9);

  const publicados = míos.filter((p) => p.status === 'publicado').length;

  return (
    <div className="space-y-6">
      {/* ---------- Bienvenida ---------- */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-4 bg-gradient-to-br from-brand-100 via-brand-50 to-peach-50 p-5 sm:p-6">
          <Avatar
            name={client.name}
            color={client.color}
            size={64}
            logoId={client.logo?.id}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-brand-700">Hola,</p>
            <h2 className="truncate text-2xl font-bold tracking-tight text-ink-900">
              {client.handle}
            </h2>
            <p className="mt-0.5 text-sm text-ink-600">
              Acá tenés todo tu contenido y cómo viene funcionando.
            </p>
          </div>
          <div className="hidden shrink-0 sm:block">
            <Logo size={30} />
          </div>
        </div>

        {/* números de un vistazo */}
        <div className="grid grid-cols-2 divide-x divide-ink-200/60 border-t border-ink-200/60 sm:grid-cols-4">
          <Resumen
            icono={<CalendarDays size={15} />}
            valor={estaSemana.length}
            etiqueta="esta semana"
          />
          <Resumen
            icono={<CheckCircle2 size={15} />}
            valor={porRevisar.length}
            etiqueta="para revisar"
            destacado={porRevisar.length > 0}
          />
          <Resumen icono={<Grid3x3 size={15} />} valor={publicados} etiqueta="publicados" />
          <Resumen
            icono={<Users size={15} />}
            valor={growth.hasBaseline ? nfmt(growth.currentFollowers) : '—'}
            etiqueta="seguidores"
          />
        </div>
      </div>

      {/* ---------- Pendiente de tu aprobación ---------- */}
      {(porRevisar.length > 0 || comentariosAbiertos > 0) && (
        <div className="card border-butter-200 bg-butter-50 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-butter-100 text-butter-600">
              <MessageSquare size={18} />
            </span>
            <div className="mr-auto">
              <p className="font-semibold text-ink-900">
                {porRevisar.length > 0
                  ? `Hay ${porRevisar.length} ${
                      porRevisar.length === 1 ? 'pieza esperando' : 'piezas esperando'
                    } tu visto bueno`
                  : 'Tenés comentarios sin resolver'}
              </p>
              <p className="text-sm text-ink-600">
                {comentariosAbiertos > 0
                  ? `${palabra(comentariosAbiertos, 'Queda', 'Quedan')} ${plural(
                      comentariosAbiertos,
                      'comentario sin resolver',
                      'comentarios sin resolver'
                    )}.`
                  : 'Revisalo y aprobá, o pedí los cambios que quieras.'}
              </p>
            </div>
            <button className="btn-primary" onClick={() => navigate(`${base}/semana`)}>
              Revisar ahora
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        {/* ---------- Tu feed ---------- */}
        <section className="card min-w-0 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-bold text-ink-900">Cómo va quedando tu feed</h3>
            <button
              className="btn-ghost !py-1 text-xs"
              onClick={() => navigate(`${base}/feed`)}
            >
              Ver todo <ArrowRight size={13} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-xl">
            {feed.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className="group relative aspect-square"
                title={p.title}
              >
                {p.resultado ? (
                  <MediaPreview media={p.resultado} className="h-full w-full !rounded-none" />
                ) : (
                  <MediaThumb
                    src={p.mediaUrl}
                    imageUrl={p.igImageUrl}
                    kind={p.mediaKind}
                    className="h-full w-full"
                  />
                )}
                <span className="absolute right-1 top-1 text-xs drop-shadow">
                  {typeEmoji[p.type]}
                </span>
                {p.status !== 'publicado' && (
                  <span className="absolute inset-x-1 bottom-1 rounded bg-ink-900/55 px-1 py-0.5 text-center text-[9px] font-semibold text-white backdrop-blur-sm">
                    {fmt(p.date, 'd MMM')}
                  </span>
                )}
              </button>
            ))}
            {Array.from({ length: (3 - (feed.length % 3)) % 3 || (feed.length ? 0 : 9) }).map(
              (_, i) => (
                <div key={`hueco-${i}`} className="aspect-square bg-ink-100/60" />
              )
            )}
          </div>
        </section>

        {/* ---------- Lo que viene ---------- */}
        <section className="card min-w-0 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-bold text-ink-900">Lo que viene esta semana</h3>
            <button
              className="btn-ghost !py-1 text-xs"
              onClick={() => navigate(`${base}/semana`)}
            >
              Ver semana <ArrowRight size={13} />
            </button>
          </div>

          {estaSemana.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-400">
              No hay contenido programado para estos días.
            </p>
          ) : (
            <div className="space-y-2">
              {estaSemana.slice(0, 5).map((p) => (
                <FilaSemana key={p.id} post={p} onOpen={() => setSelected(p.id)} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ---------- Accesos ---------- */}
      <section>
        <h3 className="mb-3 font-bold text-ink-900">Todo lo tuyo</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Acceso
            icono={<CalendarDays size={18} />}
            titulo="Mi contenido"
            detalle="El mes en calendario, o la semana día por día."
            onClick={() => navigate(`${base}/semana`)}
          />
          <Acceso
            icono={<Grid3x3 size={18} />}
            titulo="Mi feed"
            detalle="Cómo queda la grilla del mes."
            onClick={() => navigate(`${base}/feed`)}
          />
          <Acceso
            icono={<BarChart3 size={18} />}
            titulo="Resultados"
            detalle="Crecimiento, interacción y ventas."
            onClick={() => navigate(`${base}/metricas`)}
          />
          <Acceso
            icono={<Lightbulb size={18} />}
            titulo="Recomendaciones"
            detalle="Qué está funcionando mejor."
            onClick={() => navigate(`${base}/recomendaciones`)}
          />
        </div>
      </section>

      <PostDetail postId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function Resumen({
  icono,
  valor,
  etiqueta,
  destacado,
}: {
  icono: React.ReactNode;
  valor: React.ReactNode;
  etiqueta: string;
  destacado?: boolean;
}) {
  return (
    <div className="px-4 py-3">
      <div
        className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${
          destacado ? 'text-butter-600' : 'text-ink-400'
        }`}
      >
        {icono} {etiqueta}
      </div>
      <p className="mt-0.5 text-xl font-bold text-ink-900">{valor}</p>
    </div>
  );
}

function FilaSemana({ post, onOpen }: { post: Post; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-ink-50"
    >
      {post.resultado ? (
        <MediaPreview media={post.resultado} className="h-11 w-11 shrink-0" />
      ) : post.type === 'historia' ? (
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-peach-100 text-peach-600">
          <Zap size={16} />
        </span>
      ) : (
        <MediaThumb
          src={post.mediaUrl}
          imageUrl={post.igImageUrl}
          kind={post.mediaKind}
          className="h-11 w-11 shrink-0 rounded-xl"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink-800">{post.title}</p>
        <p className="text-xs text-ink-400">
          {typeLabel[post.type]} · {fmt(post.date, 'EEE d')} · {fmtTime(post.date)} h
        </p>
      </div>
      <span className={`chip shrink-0 ${statusChip[post.status]}`}>
        {statusLabel[post.status]}
      </span>
    </button>
  );
}

function Acceso({
  icono,
  titulo,
  detalle,
  onClick,
}: {
  icono: React.ReactNode;
  titulo: string;
  detalle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="card group p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lift"
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-800">
        {icono}
      </span>
      <p className="mt-2.5 font-semibold text-ink-900">{titulo}</p>
      <p className="mt-0.5 text-xs text-ink-500">{detalle}</p>
      <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-800">
        Abrir <ArrowRight size={12} />
      </span>
    </button>
  );
}
