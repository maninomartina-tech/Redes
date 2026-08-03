import { BookmarkPlus, Hash, Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';

// ---------------------------------------------------------------------------
// Hashtags del contenido, con los grupos guardados del cliente.
//
// Cada cliente termina usando siempre los mismos: en vez de reescribirlos en
// cada pieza, se guardan una vez y se meten con un clic. Los grupos se
// administran desde la sección Hashtags.
// ---------------------------------------------------------------------------

/** Acepta "#uno, dos  tres" y devuelve ['uno','dos','tres']. */
export function parsearTags(texto: string): string[] {
  return texto
    .split(/[\s,]+/)
    .map((t) => t.replace(/^#+/, '').trim().toLowerCase())
    .filter(Boolean);
}

export default function HashtagPicker({
  clientId,
  value,
  onChange,
  readOnly = false,
}: {
  clientId: string;
  value: string[];
  onChange: (tags: string[]) => void;
  readOnly?: boolean;
}) {
  // Filtrar dentro del selector devolvería un array nuevo en cada render y
  // zustand entraría en un bucle. Se filtra afuera.
  const todos = useStore((s) => s.hashtagSets);
  const sets = useMemo(() => todos.filter((h) => h.clientId === clientId), [todos, clientId]);
  const addHashtagSet = useStore((s) => s.addHashtagSet);

  const [entrada, setEntrada] = useState('');
  const [guardandoGrupo, setGuardandoGrupo] = useState(false);
  const [nombreGrupo, setNombreGrupo] = useState('');

  const agregar = (tags: string[]) => {
    if (readOnly) return;
    // Sin repetidos: Instagram los cuenta una sola vez igual.
    onChange([...new Set([...value, ...tags])]);
  };

  const quitar = (t: string) => onChange(value.filter((x) => x !== t));

  if (readOnly && value.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((h) => (
            <span key={h} className="chip bg-ink-100 text-ink-600">
              #{h}
              {!readOnly && (
                <button
                  onClick={() => quitar(h)}
                  aria-label={`Quitar #${h}`}
                  className="-mr-1 rounded p-0.5 text-ink-400 hover:text-rose-600"
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
          {!readOnly && value.length > 1 && (
            <button
              className="chip bg-brand-50 text-brand-700 hover:bg-brand-100"
              onClick={() => setGuardandoGrupo((g) => !g)}
              title="Guardar estos hashtags como un grupo reutilizable"
            >
              <BookmarkPlus size={12} /> Guardar grupo
            </button>
          )}
        </div>
      )}

      {guardandoGrupo && !readOnly && (
        <div className="flex items-center gap-2 rounded-xl bg-brand-50 p-2">
          <input
            autoFocus
            className="input !py-1 text-xs"
            placeholder="Nombre del grupo (ej. Skincare)"
            value={nombreGrupo}
            onChange={(e) => setNombreGrupo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || !nombreGrupo.trim()) return;
              addHashtagSet(clientId, nombreGrupo.trim(), value);
              setNombreGrupo('');
              setGuardandoGrupo(false);
            }}
          />
          <button
            className="btn-primary shrink-0 !py-1 text-xs"
            disabled={!nombreGrupo.trim()}
            onClick={() => {
              addHashtagSet(clientId, nombreGrupo.trim(), value);
              setNombreGrupo('');
              setGuardandoGrupo(false);
            }}
          >
            Guardar
          </button>
        </div>
      )}

      {!readOnly && (
        <>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Hash
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400"
              />
              <input
                className="input !py-1.5 pl-7 text-xs"
                placeholder="Escribí o pegá hashtags y dale Enter"
                value={entrada}
                onChange={(e) => setEntrada(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  agregar(parsearTags(entrada));
                  setEntrada('');
                }}
              />
            </div>
            <button
              className="btn-outline shrink-0 !py-1.5 text-xs"
              disabled={!entrada.trim()}
              onClick={() => {
                agregar(parsearTags(entrada));
                setEntrada('');
              }}
            >
              <Plus size={13} /> Sumar
            </button>
          </div>

          {sets.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-ink-400">Tus grupos:</span>
              {sets.map((g) => (
                <button
                  key={g.id}
                  onClick={() => agregar(g.tags)}
                  title={g.tags.map((t) => `#${t}`).join(' ')}
                  className="chip border border-ink-200 bg-surface text-ink-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                >
                  {g.name}
                  <span className="text-ink-400">{g.tags.length}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
