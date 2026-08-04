import { Images, Zap } from 'lucide-react';
import type { Post } from '@/types';
import { esHistoria } from '@/lib/format';

// ---------------------------------------------------------------------------
// Las solapas de arriba de la planificación.
//
// Viven acá, y no en cada pantalla, porque la creadora y el cliente miran lo
// mismo: si el filtro se escribiera dos veces, un día uno contaría distinto que
// el otro y ella terminaría explicándole a un cliente por qué su pantalla dice
// otra cosa que la de ella.
// ---------------------------------------------------------------------------

/** Qué se está mirando: todo, solo posteos o solo historias. */
export type FiltroTipo = 'todo' | 'posteos' | 'historias';

export function filtrarPorTipo(posts: Post[], filtro: FiltroTipo): Post[] {
  if (filtro === 'todo') return posts;
  const quiereHistorias = filtro === 'historias';
  return posts.filter((p) => esHistoria(p.type) === quiereHistorias);
}

export function contarPorTipo(posts: Post[]) {
  const historias = posts.filter((p) => esHistoria(p.type)).length;
  return { todo: posts.length, historias, posteos: posts.length - historias };
}

/** El número al lado de cada solapa: cuánto hay de eso. */
export function Cuenta({ n, activa }: { n: number; activa: boolean }) {
  return (
    <span
      className={`rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
        activa ? 'bg-brand-200/70 text-brand-800' : 'bg-ink-100 text-ink-500'
      }`}
    >
      {n}
    </span>
  );
}

export function Solapa({
  activa,
  onClick,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
        activa ? 'bg-brand-100 text-brand-800' : 'text-ink-500 hover:text-ink-800'
      }`}
    >
      {children}
    </button>
  );
}

/** La cajita que agrupa un juego de solapas. */
export function GrupoDeSolapas({
  etiqueta,
  children,
}: {
  etiqueta?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role={etiqueta ? 'group' : undefined}
      aria-label={etiqueta}
      className="inline-flex rounded-xl border border-ink-200 bg-surface p-1"
    >
      {children}
    </div>
  );
}

/** Todo · Posteos · Historias, con cuánto hay de cada cosa. */
export function FiltroDeTipo({
  valor,
  onChange,
  posts,
}: {
  valor: FiltroTipo;
  onChange: (f: FiltroTipo) => void;
  posts: Post[];
}) {
  const cuantas = contarPorTipo(posts);

  return (
    <GrupoDeSolapas etiqueta="Qué contenido mostrar">
      <Solapa activa={valor === 'todo'} onClick={() => onChange('todo')}>
        Todo <Cuenta n={cuantas.todo} activa={valor === 'todo'} />
      </Solapa>
      <Solapa activa={valor === 'posteos'} onClick={() => onChange('posteos')}>
        <Images size={15} /> Posteos <Cuenta n={cuantas.posteos} activa={valor === 'posteos'} />
      </Solapa>
      <Solapa activa={valor === 'historias'} onClick={() => onChange('historias')}>
        <Zap size={15} /> Historias{' '}
        <Cuenta n={cuantas.historias} activa={valor === 'historias'} />
      </Solapa>
    </GrupoDeSolapas>
  );
}
