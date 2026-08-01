import {
  Check,
  CheckCircle2,
  Clapperboard,
  Lightbulb,
  MessageSquare,
  Send,
  Trash2,
  Type,
} from 'lucide-react';
import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { Post, PostStatus, PostType } from '@/types';
import { fmtDateTime } from '@/lib/date';
import { statusChip, statusLabel, statusOrder, typeEmoji, typeLabel } from '@/lib/format';
import { Avatar, MediaThumb, Modal } from '@/components/ui';

const types: PostType[] = ['reel', 'post', 'carrusel', 'historia'];

export default function PostDetail({
  postId,
  onClose,
}: {
  postId: string | null;
  onClose: () => void;
}) {
  const post = useStore((s) => s.posts.find((p) => p.id === postId));
  const role = useStore((s) => s.role);
  const clients = useStore((s) => s.clients);
  const { updatePost, removePost, setPostStatus, addComment, toggleComment } = useStore();
  const [draft, setDraft] = useState('');

  if (!post) return null;
  const client = clients.find((c) => c.id === post.clientId);
  const readOnly = role === 'cliente';

  const set = (patch: Partial<Post>) => updatePost(post.id, patch);

  const openComments = post.comments.filter((c) => !c.resolved).length;

  return (
    <Modal open={!!postId} onClose={onClose} title="Contenido" wide>
      <div className="grid gap-0 md:grid-cols-[1.4fr_1fr]">
        {/* ---- Columna izquierda: las 3 partes ---- */}
        <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5">
          {/* cabecera */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`chip ${statusChip[post.status]}`}>{statusLabel[post.status]}</span>
            <select
              disabled={readOnly}
              value={post.type}
              onChange={(e) => set({ type: e.target.value as PostType })}
              className="rounded-full border border-ink-200 bg-white px-2.5 py-1 text-xs font-medium disabled:opacity-70"
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {typeEmoji[t]} {typeLabel[t]}
                </option>
              ))}
            </select>
            <span className="text-xs text-ink-400">{fmtDateTime(post.date)}</span>
          </div>

          <input
            disabled={readOnly}
            value={post.title}
            onChange={(e) => set({ title: e.target.value })}
            className="w-full border-0 bg-transparent p-0 text-xl font-bold text-ink-900 outline-none placeholder:text-ink-300 disabled:opacity-100"
            placeholder="Título del contenido"
          />

          {/* 1) idea general */}
          <Part
            icon={<Lightbulb size={15} />}
            n={1}
            label="Idea general"
            color="text-amber-600 bg-amber-50"
          >
            <textarea
              disabled={readOnly}
              value={post.ideaGeneral}
              onChange={(e) => set({ ideaGeneral: e.target.value })}
              rows={3}
              placeholder="¿De qué trata? El concepto y el objetivo del contenido."
              className="input resize-y"
            />
          </Part>

          {/* 2) contenido / diálogo */}
          <Part
            icon={<Clapperboard size={15} />}
            n={2}
            label={
              post.type === 'reel' || post.type === 'historia'
                ? 'Guion / Diálogo'
                : 'Contenido del post'
            }
            color="text-sky-600 bg-sky-50"
          >
            <textarea
              disabled={readOnly}
              value={post.contenido}
              onChange={(e) => set({ contenido: e.target.value })}
              rows={5}
              placeholder="El guion, los diálogos o el detalle de cada slide."
              className="input resize-y font-mono text-[13px] leading-relaxed"
            />
          </Part>

          {/* 3) copy */}
          <Part icon={<Type size={15} />} n={3} label="Copy / Caption" color="text-brand-600 bg-brand-50">
            <textarea
              disabled={readOnly}
              value={post.copy}
              onChange={(e) => set({ copy: e.target.value })}
              rows={4}
              placeholder="El texto que acompaña la publicación."
              className="input resize-y"
            />
            {post.hashtags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {post.hashtags.map((h) => (
                  <span key={h} className="chip bg-ink-100 text-ink-500">
                    #{h}
                  </span>
                ))}
              </div>
            )}
          </Part>

          {/* resultado final */}
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-700">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                ✓
              </span>
              Resultado final
            </div>
            <MediaThumb
              src={post.mediaUrl}
              kind={post.mediaKind}
              label={typeLabel[post.type]}
              className="aspect-[4/5] max-w-[240px] rounded-xl"
            />
            {!post.mediaUrl && (
              <p className="mt-2 text-xs text-ink-400">
                Todavía sin pieza final cargada. (En producción se sube el video/diseño terminado.)
              </p>
            )}
          </div>
        </div>

        {/* ---- Columna derecha: estado + comentarios ---- */}
        <div className="flex max-h-[70vh] flex-col border-t border-ink-100 md:border-l md:border-t-0">
          {!readOnly && (
            <div className="border-b border-ink-100 p-4">
              <p className="label mb-2">Estado / Flujo</p>
              <div className="flex flex-wrap gap-1.5">
                {statusOrder.map((st) => (
                  <button
                    key={st}
                    onClick={() => setPostStatus(post.id, st as PostStatus)}
                    className={`chip transition ${
                      post.status === st
                        ? statusChip[st as PostStatus]
                        : 'bg-white text-ink-500 border border-ink-200 hover:bg-ink-50'
                    }`}
                  >
                    {statusLabel[st as PostStatus]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {readOnly && (
            <div className="border-b border-ink-100 p-4">
              <p className="mb-2 text-sm text-ink-600">
                ¿Está todo bien con este contenido?
              </p>
              <div className="flex gap-2">
                <button
                  className="btn-primary flex-1"
                  onClick={() => setPostStatus(post.id, 'aprobado')}
                >
                  <Check size={16} /> Aprobar
                </button>
                <button
                  className="btn-outline flex-1"
                  onClick={() => setPostStatus(post.id, 'revision')}
                >
                  Pedir cambios
                </button>
              </div>
            </div>
          )}

          {/* comentarios / correcciones */}
          <div className="flex items-center gap-2 px-4 pt-4 text-sm font-semibold text-ink-700">
            <MessageSquare size={15} /> Comentarios
            {openComments > 0 && (
              <span className="chip bg-rose-100 text-rose-700">{openComments} sin resolver</span>
            )}
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {post.comments.length === 0 && (
              <p className="text-sm text-ink-400">
                Sin comentarios. {readOnly ? 'Dejá una corrección si hace falta.' : ''}
              </p>
            )}
            {post.comments.map((c) => (
              <div
                key={c.id}
                className={`rounded-xl border p-3 text-sm ${
                  c.resolved ? 'border-ink-100 bg-ink-50 opacity-70' : 'border-ink-200 bg-white'
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <Avatar
                    name={c.authorName}
                    color={c.author === 'cliente' ? client?.color : '#2a2b36'}
                    size={22}
                  />
                  <span className="font-medium text-ink-800">{c.authorName}</span>
                  <span className="text-xs text-ink-400">
                    {c.author === 'cliente' ? 'Cliente' : 'Creadora'}
                  </span>
                  <button
                    onClick={() => toggleComment(post.id, c.id)}
                    className={`ml-auto ${c.resolved ? 'text-emerald-600' : 'text-ink-300 hover:text-emerald-600'}`}
                    title={c.resolved ? 'Marcar como pendiente' : 'Marcar como resuelto'}
                  >
                    <CheckCircle2 size={17} />
                  </button>
                </div>
                <p className="text-ink-700">{c.text}</p>
              </div>
            ))}
          </div>

          {/* nuevo comentario */}
          <div className="border-t border-ink-100 p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                placeholder={
                  readOnly ? 'Escribí una corrección…' : 'Responder o dejar una nota…'
                }
                className="input resize-none"
              />
              <button
                className="btn-primary shrink-0"
                disabled={!draft.trim()}
                onClick={() => {
                  addComment(post.id, {
                    author: role,
                    authorName: role === 'cliente' ? client?.name ?? 'Cliente' : 'Creadora',
                    text: draft.trim(),
                  });
                  setDraft('');
                }}
              >
                <Send size={15} />
              </button>
            </div>
            {!readOnly && (
              <button
                onClick={() => {
                  removePost(post.id);
                  onClose();
                }}
                className="mt-2 flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-600"
              >
                <Trash2 size={13} /> Eliminar contenido
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Part({
  icon,
  n,
  label,
  color,
  children,
}: {
  icon: React.ReactNode;
  n: number;
  label: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-700">
        <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] ${color}`}>
          {icon}
        </span>
        <span className="text-ink-400">{n}.</span> {label}
      </div>
      {children}
    </div>
  );
}
