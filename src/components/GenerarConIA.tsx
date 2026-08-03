import { AlertCircle, Check, Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import type { Client, Post } from '@/types';
import { redactar, type ParteRedactable } from '@/lib/ia';
import { plural } from '@/lib/texto';

// ---------------------------------------------------------------------------
// "Generar con IA" debajo de cada parte del contenido.
//
// Nunca pisa lo que está escrito por su cuenta: muestra las opciones y ella
// decide si reemplaza, si suma abajo o si descarta. Toma como contexto lo que
// ya haya cargado —la inspiración, el título, la idea—, así que cuanto más
// completo esté, más pega lo que propone.
// ---------------------------------------------------------------------------

const ETIQUETA: Record<ParteRedactable, string> = {
  idea: 'Generar la idea con IA',
  contenido: 'Generar el guion con IA',
  copy: 'Generar el copy con IA',
  hashtags: 'Sugerir hashtags con IA',
};

export default function GenerarConIA({
  parte,
  post,
  cliente,
  valor,
  onUsar,
}: {
  parte: ParteRedactable;
  post: Post;
  cliente?: Client;
  /** Lo que hay escrito ahora, para poder ofrecer "sumar abajo". */
  valor: string;
  onUsar: (texto: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [instruccion, setInstruccion] = useState('');
  const [cargando, setCargando] = useState(false);
  const [opciones, setOpciones] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pedir = async () => {
    setCargando(true);
    setError(null);
    const r = await redactar(parte, post, cliente, instruccion);
    setCargando(false);
    if (!r.ok) {
      setError(r.error ?? 'No se pudo generar.');
      setOpciones(null);
      return;
    }
    setOpciones(r.opciones ?? []);
  };

  const cerrar = () => {
    setAbierto(false);
    setOpciones(null);
    setError(null);
    setInstruccion('');
  };

  if (!abierto) {
    return (
      <button
        type="button"
        className="btn-ghost mt-1.5 !py-1 text-xs text-brand-800 hover:bg-brand-50"
        onClick={() => setAbierto(true)}
      >
        <Sparkles size={14} /> {ETIQUETA[parte]}
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-brand-200 bg-brand-50/70 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles size={14} className="text-brand-700" />
        <span className="text-xs font-semibold text-brand-800">{ETIQUETA[parte]}</span>
        <button
          type="button"
          className="btn-ghost -mr-1 ml-auto !px-1.5 !py-1"
          onClick={cerrar}
          aria-label="Cerrar"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <input
          className="input !py-1.5 text-xs"
          placeholder="¿Algo para tener en cuenta? (opcional: más corto, sin emojis, tono divertido…)"
          value={instruccion}
          onChange={(e) => setInstruccion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !cargando) {
              e.preventDefault();
              void pedir();
            }
          }}
        />
        <button
          type="button"
          className="btn-primary shrink-0 !py-1.5 text-xs"
          onClick={pedir}
          disabled={cargando}
        >
          {cargando ? (
            <Loader2 size={14} className="animate-spin" />
          ) : opciones ? (
            <RefreshCw size={14} />
          ) : (
            <Sparkles size={14} />
          )}
          {cargando ? 'Escribiendo…' : opciones ? 'Otras' : 'Generar'}
        </button>
      </div>

      {error && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-rose-50 p-2 text-[11px] leading-snug text-rose-700">
          <AlertCircle size={13} className="mt-px shrink-0" />
          {error}
        </p>
      )}

      {opciones && opciones.length > 0 && (
        <>
          <p className="mt-2.5 text-[11px] text-ink-500">
            {plural(opciones.length, 'opción', 'opciones')} · elegí una y editala como quieras.
          </p>
          <div className="mt-1.5 space-y-2">
            {opciones.map((texto, i) => (
              <div key={i} className="rounded-lg border border-ink-200/70 bg-surface p-2.5">
                <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink-700">
                  {texto}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    className="btn-soft !py-1 text-[11px]"
                    onClick={() => {
                      onUsar(texto);
                      cerrar();
                    }}
                  >
                    <Check size={12} /> {valor.trim() ? 'Reemplazar' : 'Usar esta'}
                  </button>
                  {valor.trim() && (
                    <button
                      type="button"
                      className="btn-outline !py-1 text-[11px]"
                      onClick={() => {
                        onUsar(`${valor.trimEnd()}\n\n${texto}`);
                        cerrar();
                      }}
                    >
                      Sumar abajo
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {opciones && opciones.length === 0 && !error && (
        <p className="mt-2 text-[11px] text-ink-500">
          No devolvió nada. Probá de nuevo o agregá alguna aclaración.
        </p>
      )}
    </div>
  );
}
