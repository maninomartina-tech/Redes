import { Check, Copy, Hash, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useStore, useCurrentClient } from '@/store/useStore';
import type { HashtagSet } from '@/types';
import { parsearTags } from '@/components/HashtagPicker';
import { EmptyState, SectionTitle } from '@/components/ui';

/**
 * Grupos de hashtags por cliente.
 *
 * Cada cuenta termina usando siempre los mismos. Guardarlos una vez y meterlos
 * con un clic desde el copy ahorra el trabajo más aburrido de la semana.
 */
export default function Hashtags() {
  const client = useCurrentClient();
  const todos = useStore((s) => s.hashtagSets);
  const sets = useMemo(() => todos.filter((h) => h.clientId === client.id), [todos, client.id]);
  const addHashtagSet = useStore((s) => s.addHashtagSet);
  const removeHashtagSet = useStore((s) => s.removeHashtagSet);

  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  const copiar = async (g: HashtagSet) => {
    try {
      await navigator.clipboard.writeText(g.tags.map((t) => `#${t}`).join(' '));
      setCopiado(g.id);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      /* si el navegador no deja copiar, quedan a la vista igual */
    }
  };

  return (
    <div>
      <SectionTitle
        title="Hashtags"
        subtitle={`Grupos guardados de ${client.name}, para meterlos en el copy con un clic.`}
        action={
          !creando && (
            <button className="btn-primary" onClick={() => setCreando(true)}>
              <Plus size={16} /> Nuevo grupo
            </button>
          )
        }
      />

      {creando && (
        <Editor
          onCancel={() => setCreando(false)}
          onSave={(name, tags) => {
            addHashtagSet(client.id, name, tags);
            setCreando(false);
          }}
        />
      )}

      {sets.length === 0 && !creando ? (
        <EmptyState
          icon={<Hash size={28} />}
          title="Todavía no guardaste ningún grupo"
          hint="Armá uno por tema —skincare, promos, comunidad— y después lo sumás al copy desde el contenido, sin volver a escribirlo."
          action={
            <button className="btn-primary" onClick={() => setCreando(true)}>
              <Plus size={16} /> Nuevo grupo
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {sets.map((g) =>
            editando === g.id ? (
              <Editor
                key={g.id}
                grupo={g}
                onCancel={() => setEditando(null)}
                onSave={(name, tags) => {
                  useStore.getState().updateHashtagSet(g.id, { name, tags });
                  setEditando(null);
                }}
              />
            ) : (
              <div key={g.id} className="card p-4">
                <div className="mb-2 flex items-center gap-2">
                  <p className="mr-auto font-semibold text-ink-900">{g.name}</p>
                  <span className="text-xs text-ink-400">{g.tags.length} hashtags</span>
                  <button className="btn-ghost !px-2 !py-1" onClick={() => copiar(g)} title="Copiar">
                    {copiado === g.id ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                  <button
                    className="btn-ghost !px-2 !py-1"
                    onClick={() => setEditando(g.id)}
                    title="Editar"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="btn-ghost !px-2 !py-1 text-rose-600 hover:bg-rose-50"
                    onClick={() => removeHashtagSet(g.id)}
                    title="Borrar"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.tags.map((t) => (
                    <span key={t} className="chip bg-ink-100 text-ink-600">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}

      <p className="mt-4 text-xs leading-snug text-ink-500">
        Instagram cuenta hasta 30 hashtags por publicación y los repetidos los
        toma una sola vez. Conviene mezclar unos pocos muy buscados con otros
        más chicos y específicos del rubro.
      </p>
    </div>
  );
}

function Editor({
  grupo,
  onSave,
  onCancel,
}: {
  grupo?: HashtagSet;
  onSave: (name: string, tags: string[]) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(grupo?.name ?? '');
  const [texto, setTexto] = useState((grupo?.tags ?? []).map((t) => `#${t}`).join(' '));

  const tags = parsearTags(texto);
  const valido = name.trim().length > 0 && tags.length > 0;

  return (
    <div className="card mb-3 space-y-3 p-4">
      <div>
        <label className="label" htmlFor="grupo-nombre">
          Nombre del grupo
        </label>
        <input
          id="grupo-nombre"
          autoFocus
          className="input mt-1"
          placeholder="Skincare"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="grupo-tags">
          Hashtags
        </label>
        <textarea
          id="grupo-tags"
          rows={3}
          className="input mt-1 resize-y"
          placeholder="#skincare #rutinafacial #pielsana"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <p className="mt-1 text-[11px] text-ink-400">
          Separados por espacios o comas. El # es opcional.
          {tags.length > 0 && ` Van ${tags.length}.`}
          {tags.length > 30 && ' Instagram acepta hasta 30.'}
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <button className="btn-outline !py-1.5 text-xs" onClick={onCancel}>
          <X size={14} /> Cancelar
        </button>
        <button
          className="btn-primary !py-1.5 text-xs"
          disabled={!valido}
          onClick={() => onSave(name.trim(), tags)}
        >
          <Check size={14} /> Guardar
        </button>
      </div>
    </div>
  );
}
