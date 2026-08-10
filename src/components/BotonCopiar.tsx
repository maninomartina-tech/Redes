import { Check, Clipboard } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Copiar un texto al portapapeles.
//
// Vive acá y no en cada pantalla porque copiar el copy es lo último que se hace
// con una pieza —y se hace desde varios lados—, así que conviene que se vea y
// se comporte igual en todos.
//
// El respaldo con `execCommand` no es de más: `navigator.clipboard` no existe
// fuera de https y falla también cuando la pestaña perdió el foco, que es
// justo lo que pasa al copiar y saltar a Instagram.
// ---------------------------------------------------------------------------

async function copiarAlPortapapeles(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    /* seguimos con el respaldo */
  }

  try {
    const area = document.createElement('textarea');
    area.value = texto;
    // Fuera de la vista, pero seleccionable: `display:none` no se puede copiar.
    area.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    document.body.appendChild(area);
    area.select();
    const listo = document.execCommand('copy');
    area.remove();
    return listo;
  } catch {
    return false;
  }
}

export default function BotonCopiar({
  texto,
  etiqueta = 'Copiar',
  copiada = 'Copiado',
  className = 'btn-ghost !py-1 text-xs',
  onError,
}: {
  texto: string;
  etiqueta?: string;
  /** Lo que dice mientras muestra que salió bien. */
  copiada?: string;
  className?: string;
  onError?: (mensaje: string) => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const reloj = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(reloj.current), []);

  const copiar = async () => {
    if (await copiarAlPortapapeles(texto)) {
      setCopiado(true);
      clearTimeout(reloj.current);
      reloj.current = setTimeout(() => setCopiado(false), 2000);
    } else {
      onError?.('No se pudo copiar. Seleccioná el texto y copialo a mano.');
    }
  };

  return (
    <button
      type="button"
      className={className}
      onClick={() => void copiar()}
      disabled={!texto.trim()}
      title={texto.trim() ? etiqueta : 'Todavía no hay nada para copiar'}
    >
      {copiado ? <Check size={14} /> : <Clipboard size={14} />}
      {copiado ? copiada : etiqueta}
    </button>
  );
}
