import {
  CalendarClock,
  Check,
  CheckCircle2,
  Clapperboard,
  Clock,
  Lightbulb,
  Link as LinkIcon,
  MessageSquare,
  Send,
  Sparkle,
  Trash2,
  TriangleAlert,
  Type,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import type { Post, PostStatus, PostType } from '@/types';
import { desdeInput, fmtDateTime, paraInput } from '@/lib/date';
import { etapasDePlan, statusChip, statusLabel, typeEmoji, typeLabel } from '@/lib/format';
import { Avatar, Modal } from '@/components/ui';
import MediaUploader from '@/components/MediaUploader';
import MetricsForm from '@/components/MetricsForm';
import HashtagPicker, { parsearTags } from '@/components/HashtagPicker';
import GenerarConIA from '@/components/GenerarConIA';

const types: PostType[] = ['reel', 'post', 'carrusel', 'historia'];

/**
 * Campo de texto que, del lado del cliente, se muestra como texto.
 *
 * Antes le llegaban los mismos textarea deshabilitados que usa la creadora:
 * parecían un formulario para completar, recortaban el texto largo a la altura
 * fija del campo y encima el tipo de contenido era un desplegable que podía
 * tocar. Nada de eso es asunto suyo.
 */
function Campo({
  readOnly,
  value,
  onChange,
  rows,
  placeholder,
  className = '',
  vacio = 'Todavía sin cargar.',
}: {
  readOnly: boolean;
  value: string;
  onChange: (v: string) => void;
  rows: number;
  placeholder: string;
  className?: string;
  vacio?: string;
}) {
  if (readOnly) {
    return value.trim() ? (
      <p className={`whitespace-pre-line text-sm leading-relaxed text-ink-700 ${className}`}>
        {value}
      </p>
    ) : (
      <p className="text-sm text-ink-400">{vacio}</p>
    );
  }
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className={`input resize-y ${className}`}
    />
  );
}

/** Campos que se editan sobre un borrador antes de guardar. */
type Borrador = Pick<
  Post,
  | 'title'
  | 'type'
  | 'inspiracion'
  | 'inspiracionUrl'
  | 'inspiracionMedia'
  | 'ideaGeneral'
  | 'contenido'
  | 'copy'
  | 'hashtags'
  | 'resultado'
  | 'date'
>;

function tomarBorrador(p: Post): Borrador {
  return {
    title: p.title,
    type: p.type,
    date: p.date,
    inspiracion: p.inspiracion ?? '',
    inspiracionUrl: p.inspiracionUrl ?? '',
    inspiracionMedia: p.inspiracionMedia ?? [],
    ideaGeneral: p.ideaGeneral,
    contenido: p.contenido,
    copy: p.copy,
    hashtags: p.hashtags ?? [],
    resultado: p.resultado,
  };
}

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
  const { updatePost, removePost, setPostStatus, addComment, toggleComment, cancelSchedule } =
    useStore();

  const [draft, setDraft] = useState<Borrador | null>(null);
  const [comentario, setComentario] = useState('');
  const [confirmarSalida, setConfirmarSalida] = useState(false);

  const readOnly = role === 'cliente';

  // Carga el borrador cada vez que se abre otro contenido.
  useEffect(() => {
    setDraft(post ? tomarBorrador(post) : null);
    setConfirmarSalida(false);
  }, [postId, post?.id]);

  const dirty = useMemo(() => {
    if (!post || !draft) return false;
    return JSON.stringify(draft) !== JSON.stringify(tomarBorrador(post));
  }, [post, draft]);

  if (!post || !draft) return null;

  const client = clients.find((c) => c.id === post.clientId);
  const account = client?.accounts.find((a) => a.id === post.accountId);
  const set = (patch: Partial<Borrador>) => setDraft({ ...draft, ...patch });

  const guardar = () => {
    updatePost(post.id, draft);
    onClose();
  };

  const intentarCerrar = () => {
    if (dirty && !readOnly) setConfirmarSalida(true);
    else onClose();
  };

  const abiertos = post.comments.filter((c) => !c.resolved).length;

  return (
    <>
      <Modal
        open={!!postId}
        onClose={intentarCerrar}
        title={readOnly ? 'Tu contenido' : 'Contenido'}
        wide
      >
        <div className="grid gap-0 md:grid-cols-[1.4fr_1fr]">
          {/* ---- Columna izquierda ---- */}
          <div className="max-h-[68vh] space-y-5 overflow-y-auto p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`chip ${statusChip[post.status]}`}>
                {statusLabel[post.status]}
              </span>
              {readOnly ? (
                <span className="chip bg-ink-100 text-ink-600">
                  {typeEmoji[draft.type]} {typeLabel[draft.type]}
                </span>
              ) : (
                <select
                  value={draft.type}
                  onChange={(e) => set({ type: e.target.value as PostType })}
                  className="rounded-full border border-ink-200 bg-surface px-2.5 py-1 text-xs font-medium"
                >
                  {types.map((t) => (
                    <option key={t} value={t}>
                      {typeEmoji[t]} {typeLabel[t]}
                    </option>
                  ))}
                </select>
              )}
              {/* La fecha se edita acá además de arrastrando en el calendario:
                  en el celular no hay arrastre. */}
              {readOnly ? (
                <span className="text-xs text-ink-400">{fmtDateTime(draft.date)}</span>
              ) : (
                <label className="flex items-center gap-1.5 text-xs text-ink-400">
                  <CalendarClock size={14} />
                  <span className="sr-only">Fecha y hora de publicación</span>
                  <input
                    type="datetime-local"
                    value={paraInput(draft.date)}
                    onChange={(e) => set({ date: desdeInput(e.target.value) })}
                    className="rounded-lg border border-ink-200 bg-surface px-2 py-1 text-xs font-medium text-ink-700"
                  />
                </label>
              )}
            </div>

            {readOnly ? (
              <h3 className="text-xl font-bold text-ink-900">{draft.title}</h3>
            ) : (
              <input
                value={draft.title}
                onChange={(e) => set({ title: e.target.value })}
                className="w-full border-0 bg-transparent p-0 text-xl font-bold text-ink-900 outline-none placeholder:text-ink-300"
                placeholder="Título del contenido"
              />
            )}

            {/* de dónde nace — al cliente no se le muestra vacío */}
            {(!readOnly ||
              draft.inspiracion?.trim() ||
              draft.inspiracionUrl ||
              (draft.inspiracionMedia ?? []).length > 0) && (
              <div className="rounded-xl border border-peach-200 bg-peach-50 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-peach-600">
                  <Sparkle size={15} />
                  Inspiración · de dónde nace
                </div>
                <Campo
                  readOnly={readOnly}
                  value={draft.inspiracion ?? ''}
                  onChange={(inspiracion) => set({ inspiracion })}
                  rows={2}
                  placeholder="¿Sale de una tendencia, un audio, una referencia, una pregunta que se repite?"
                  vacio="Sin referencia cargada."
                />

                {readOnly ? (
                  draft.inspiracionUrl && (
                    <a
                      href={draft.inspiracionUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-brand-800 underline underline-offset-2"
                    >
                      <LinkIcon size={13} /> Ver la referencia
                    </a>
                  )
                ) : (
                  <div className="mt-2 flex items-center gap-2">
                    <LinkIcon size={14} className="shrink-0 text-peach-600" />
                    <input
                      value={draft.inspiracionUrl}
                      onChange={(e) => set({ inspiracionUrl: e.target.value })}
                      placeholder="Link a la referencia (opcional)"
                      className="input !py-1.5 text-xs"
                    />
                    {draft.inspiracionUrl && (
                      <a
                        href={draft.inspiracionUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="btn-outline shrink-0 !py-1.5 text-xs"
                      >
                        Ver
                      </a>
                    )}
                  </div>
                )}

                {(!readOnly || (draft.inspiracionMedia ?? []).length > 0) && (
                  <div className="mt-3">
                    {!readOnly && <p className="label mb-1.5">Imágenes de referencia</p>}
                    <MediaUploader
                      multiple
                      disabled={readOnly}
                      value={draft.inspiracionMedia ?? []}
                      onChange={(m) => set({ inspiracionMedia: m })}
                      label="Arrastrá imágenes o hacé clic para elegirlas"
                      previewClassName="aspect-square"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 1) idea general */}
            <Part icon={<Lightbulb size={15} />} n={1} label="Idea general" color="text-butter-600 bg-butter-50">
              <Campo
                readOnly={readOnly}
                value={draft.ideaGeneral}
                onChange={(ideaGeneral) => set({ ideaGeneral })}
                rows={3}
                placeholder="¿De qué trata? El concepto y el objetivo del contenido."
              />
              {!readOnly && (
                <GenerarConIA
                  parte="idea"
                  post={{ ...post, ...draft }}
                  cliente={client}
                  valor={draft.ideaGeneral}
                  onUsar={(ideaGeneral) => set({ ideaGeneral })}
                />
              )}
            </Part>

            {/* 2) contenido / diálogo */}
            <Part
              icon={<Clapperboard size={15} />}
              n={2}
              label={draft.type === 'reel' || draft.type === 'historia' ? 'Guion / Diálogo' : 'Contenido del post'}
              color="text-sky-600 bg-sky-50"
            >
              <Campo
                readOnly={readOnly}
                value={draft.contenido}
                onChange={(contenido) => set({ contenido })}
                rows={5}
                placeholder="El guion, los diálogos o el detalle de cada slide."
                className="font-mono text-[13px] leading-relaxed"
              />
              {!readOnly && (
                <GenerarConIA
                  parte="contenido"
                  post={{ ...post, ...draft }}
                  cliente={client}
                  valor={draft.contenido}
                  onUsar={(contenido) => set({ contenido })}
                />
              )}
            </Part>

            {/* 3) copy */}
            <Part icon={<Type size={15} />} n={3} label="Copy / Caption" color="text-brand-700 bg-brand-50">
              <Campo
                readOnly={readOnly}
                value={draft.copy}
                onChange={(copy) => set({ copy })}
                rows={4}
                placeholder="El texto que acompaña la publicación."
              />
              {!readOnly && (
                <>
                  <GenerarConIA
                    parte="copy"
                    post={{ ...post, ...draft }}
                    cliente={client}
                    valor={draft.copy}
                    onUsar={(copy) => set({ copy })}
                  />
                  <GenerarConIA
                    parte="hashtags"
                    post={{ ...post, ...draft }}
                    cliente={client}
                    valor=""
                    onUsar={(texto) =>
                      set({ hashtags: [...new Set([...draft.hashtags, ...parsearTags(texto)])] })
                    }
                  />
                </>
              )}
              <HashtagPicker
                clientId={post.clientId}
                value={draft.hashtags}
                onChange={(hashtags) => set({ hashtags })}
                readOnly={readOnly}
              />
            </Part>

            {/* resultado final */}
            <div className="rounded-xl border border-mint-200 bg-mint-50 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-mint-600">
                <Check size={15} /> Resultado final · la pieza que se publica
              </div>
              <div className="max-w-[260px]">
                <MediaUploader
                  disabled={readOnly}
                  value={draft.resultado ? [draft.resultado] : []}
                  onChange={(m) => set({ resultado: m[0] })}
                  label="Arrastrá la pieza terminada o hacé clic para elegirla"
                  previewClassName="aspect-[4/5]"
                />
              </div>
              {!draft.resultado && !readOnly && (
                <p className="mt-2 text-xs text-ink-500">
                  Al aprobar el contenido con la pieza cargada, queda programado solo para el{' '}
                  {fmtDateTime(post.date)}.
                </p>
              )}
            </div>

            {/* Los números, que sin el permiso de Meta se cargan a mano */}
            {post.status === 'publicado' && !readOnly && <MetricsForm post={post} />}
          </div>

          {/* ---- Columna derecha ---- */}
          <div className="flex max-h-[68vh] flex-col border-t border-ink-200/70 md:border-l md:border-t-0">
            {!readOnly && (
              <div className="border-b border-ink-200/70 p-4">
                <p className="label mb-2">Etapa</p>
                {/* Solo las tres etapas del circuito. Programado y publicado no
                    se eligen a mano: pasan cuando la pieza sale. */}
                <div className="flex flex-wrap gap-1.5">
                  {etapasDePlan.map((st) => (
                    <button
                      key={st}
                      onClick={() => setPostStatus(post.id, st)}
                      className={`chip transition ${
                        post.status === st
                          ? statusChip[st]
                          : 'border border-ink-200 bg-surface text-ink-500 hover:bg-ink-50'
                      }`}
                    >
                      {statusLabel[st]}
                    </button>
                  ))}
                </div>
                {!etapasDePlan.includes(post.status) && (
                  <p className="mt-2 text-xs text-ink-500">
                    Esta pieza ya salió del circuito: figura como{' '}
                    <strong className="font-semibold text-ink-700">
                      {statusLabel[post.status].toLowerCase()}
                    </strong>
                    . Si te equivocaste, elegí una etapa para volver a traerla.
                  </p>
                )}
                <EstadoPublicacion post={post} onCancel={() => cancelSchedule(post.id)} />
              </div>
            )}

            {readOnly && (
              <div className="border-b border-ink-200/70 p-4">
                <p className="mb-2 text-sm text-ink-600">¿Está todo bien con este contenido?</p>
                <div className="flex gap-2">
                  <button className="btn-primary flex-1" onClick={() => setPostStatus(post.id, 'aprobado')}>
                    <Check size={16} /> Aprobar
                  </button>
                  <button className="btn-outline flex-1" onClick={() => setPostStatus(post.id, 'revision')}>
                    Pedir cambios
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 px-4 pt-4 text-sm font-semibold text-ink-700">
              <MessageSquare size={15} /> Comentarios
              {abiertos > 0 && (
                <span className="chip bg-rose-100 text-rose-600">{abiertos} sin resolver</span>
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
                    c.resolved
                      ? 'border-ink-200/70 bg-ink-50 opacity-70'
                      : 'border-ink-200 bg-surface'
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <Avatar
                      name={c.authorName}
                      color={c.author === 'cliente' ? client?.color : '#4A1E1A'}
                      size={22}
                    />
                    <span className="font-medium text-ink-800">{c.authorName}</span>
                    <span className="text-xs text-ink-400">
                      {c.author === 'cliente' ? 'Cliente' : 'Creadora'}
                    </span>
                    <button
                      onClick={() => toggleComment(post.id, c.id)}
                      className={`ml-auto ${c.resolved ? 'text-mint-600' : 'text-ink-300 hover:text-mint-600'}`}
                      title={c.resolved ? 'Marcar como pendiente' : 'Marcar como resuelto'}
                    >
                      <CheckCircle2 size={17} />
                    </button>
                  </div>
                  <p className="text-ink-700">{c.text}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-ink-200/70 p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  rows={2}
                  placeholder={readOnly ? 'Escribí una corrección…' : 'Responder o dejar una nota…'}
                  className="input resize-none"
                />
                <button
                  className="btn-primary shrink-0"
                  disabled={!comentario.trim()}
                  onClick={() => {
                    addComment(post.id, {
                      author: role,
                      authorName: role === 'cliente' ? client?.name ?? 'Cliente' : 'Creadora',
                      text: comentario.trim(),
                    });
                    setComentario('');
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
                  className="mt-2 flex items-center gap-1.5 text-xs text-rose-600 hover:underline"
                >
                  <Trash2 size={13} /> Eliminar contenido
                </button>
              )}
            </div>
          </div>
        </div>

        {/* barra de guardado */}
        {!readOnly && (
          <div className="flex items-center justify-end gap-3 border-t border-ink-200/70 bg-ink-50 px-5 py-3">
            {dirty ? (
              <span className="mr-auto flex items-center gap-1.5 text-xs font-medium text-butter-600">
                <span className="h-2 w-2 rounded-full bg-butter-300" />
                Tenés cambios sin guardar
              </span>
            ) : (
              <span className="mr-auto text-xs text-ink-400">Todo guardado</span>
            )}
            <button className="btn-ghost" onClick={intentarCerrar}>
              Cerrar
            </button>
            <button className="btn-primary" onClick={guardar} disabled={!dirty}>
              Guardar cambios
            </button>
          </div>
        )}
      </Modal>

      {/* aviso de cambios sin guardar */}
      <Modal
        open={confirmarSalida}
        onClose={() => setConfirmarSalida(false)}
        title="Cambios sin guardar"
      >
        <div className="space-y-4 p-5">
          <p className="text-sm text-ink-600">
            Editaste este contenido y todavía no guardaste. ¿Qué querés hacer?
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              className="btn-ghost"
              onClick={() => {
                setConfirmarSalida(false);
                setDraft(tomarBorrador(post));
                onClose();
              }}
            >
              Descartar cambios
            </button>
            <button className="btn-outline" onClick={() => setConfirmarSalida(false)}>
              Seguir editando
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                setConfirmarSalida(false);
                guardar();
              }}
            >
              Guardar y cerrar
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/** Estado de la publicación automática. */
function EstadoPublicacion({ post, onCancel }: { post: Post; onCancel: () => void }) {
  if (post.scheduleState === 'programado') {
    return (
      <div className="mt-3 rounded-xl border border-mint-200 bg-mint-50 p-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-mint-600">
          <Clock size={14} /> Programado para publicarse
        </p>
        <p className="mt-0.5 text-xs text-ink-600">
          {fmtDateTime(post.scheduledAt ?? post.date)} · se sube solo.
        </p>
        <button className="btn-outline mt-2 !py-1.5 text-xs" onClick={onCancel}>
          Cancelar programación
        </button>
      </div>
    );
  }

  if (post.scheduleError) {
    return (
      <div className="mt-3 rounded-xl border border-butter-200 bg-butter-50 p-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-butter-600">
          <TriangleAlert size={14} /> No se pudo programar
        </p>
        <p className="mt-0.5 text-xs text-ink-600">{post.scheduleError}</p>
      </div>
    );
  }

  return null;
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
