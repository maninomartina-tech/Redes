import { BarChart3, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import type { Post, PostMetrics } from '@/types';
import { useStore } from '@/store/useStore';
import { nfmt } from '@/lib/format';

// ---------------------------------------------------------------------------
// Carga manual de métricas.
//
// Sin el permiso de Meta, los números no llegan solos: hay que copiarlos de
// Instagram. Es un minuto por publicación, y es lo que hace que después
// funcionen el informe, las recomendaciones y los mejores horarios.
// ---------------------------------------------------------------------------

interface Campo {
  clave: keyof PostMetrics;
  label: string;
  /** Dónde lo encuentra en Instagram */
  donde?: string;
  soloVideo?: boolean;
}

const CAMPOS: Campo[] = [
  { clave: 'reach', label: 'Cuentas alcanzadas' },
  { clave: 'impressions', label: 'Visualizaciones' },
  { clave: 'likes', label: 'Me gusta' },
  { clave: 'comments', label: 'Comentarios' },
  { clave: 'saves', label: 'Guardados' },
  { clave: 'shares', label: 'Compartidos' },
  { clave: 'views', label: 'Reproducciones', soloVideo: true },
];

const vacias: PostMetrics = {
  reach: 0,
  impressions: 0,
  likes: 0,
  comments: 0,
  saves: 0,
  shares: 0,
};

export default function MetricsForm({ post }: { post: Post }) {
  const setMetrics = useStore((s) => s.setMetrics);

  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      CAMPOS.map((c) => [c.clave, post.metrics?.[c.clave] != null ? String(post.metrics![c.clave]) : ''])
    )
  );
  const [guardado, setGuardado] = useState(false);

  const esVideo = post.type === 'reel' || post.type === 'historia';
  const campos = CAMPOS.filter((c) => !c.soloVideo || esVideo);

  const guardar = () => {
    const m: PostMetrics = { ...vacias };
    campos.forEach((c) => {
      const n = Number(valores[c.clave]);
      if (valores[c.clave] !== '' && Number.isFinite(n)) {
        (m[c.clave] as number) = n;
      }
    });
    setMetrics(post.id, m);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  };

  const interaccion =
    (Number(valores.likes) || 0) +
    (Number(valores.comments) || 0) +
    (Number(valores.saves) || 0) +
    (Number(valores.shares) || 0);
  const alcance = Number(valores.reach) || 0;

  return (
    <div className="rounded-xl border border-ink-200/70 bg-surface p-3">
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink-700">
        <BarChart3 size={15} /> Métricas de esta publicación
      </div>
      <p className="mb-3 text-[11px] leading-snug text-ink-500">
        Copialas de Instagram: entrás a la publicación, tocás{' '}
        <b>Ver estadísticas</b> y pasás los números acá.
        {post.igPermalink && (
          <>
            {' '}
            <a
              href={post.igPermalink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-brand-800 underline"
            >
              Abrir la publicación <ExternalLink size={11} />
            </a>
          </>
        )}
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {campos.map((c) => (
          <div key={c.clave}>
            <label className="label" htmlFor={`m-${post.id}-${c.clave}`}>
              {c.label}
            </label>
            <input
              id={`m-${post.id}-${c.clave}`}
              type="number"
              min={0}
              inputMode="numeric"
              className="input mt-1 !py-1.5"
              placeholder="0"
              value={valores[c.clave] ?? ''}
              onChange={(e) => setValores((v) => ({ ...v, [c.clave]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button className="btn-primary !py-1.5 text-xs" onClick={guardar}>
          {guardado ? <Check size={14} /> : null}
          {guardado ? 'Guardado' : 'Guardar métricas'}
        </button>
        {alcance > 0 && (
          <span className="text-[11px] text-ink-500">
            {nfmt(interaccion)} interacciones sobre {nfmt(alcance)} alcanzadas ={' '}
            <b>{((interaccion / alcance) * 100).toFixed(1)}%</b>
          </span>
        )}
      </div>
    </div>
  );
}
