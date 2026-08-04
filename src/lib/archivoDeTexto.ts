// ---------------------------------------------------------------------------
// Sacar el texto de un archivo.
//
// La planificación de historias se escribe donde se escribe: en el bloc de
// notas, en Word, en un documento de Google. Pedirle a alguien que además lo
// convierta a un formato especial es pedirle que haga trabajo de más, así que
// acá se acepta lo que tenga a mano.
// ---------------------------------------------------------------------------

/** Un .docx es un zip; adentro, el texto vive en este archivo. */
const DOCUMENTO_WORD = 'word/document.xml';

const u16 = (v: DataView, i: number) => v.getUint16(i, true);
const u32 = (v: DataView, i: number) => v.getUint32(i, true);

/**
 * Saca un archivo de adentro de un zip.
 *
 * Se lee el índice del final —el "directorio central"— y no los encabezados
 * sueltos: los sueltos pueden venir con los tamaños en cero cuando el zip se
 * escribió de corrido, y ahí no hay forma de saber dónde termina cada cosa.
 */
async function sacarDelZip(datos: ArrayBuffer, nombre: string): Promise<Uint8Array | null> {
  const v = new DataView(datos);
  const bytes = new Uint8Array(datos);

  // El índice arranca donde diga el registro final, que está al final de todo.
  let fin = -1;
  for (let i = bytes.length - 22; i >= 0 && i > bytes.length - 65_557; i--) {
    if (u32(v, i) === 0x06054b50) {
      fin = i;
      break;
    }
  }
  if (fin < 0) return null;

  let p = u32(v, fin + 16);
  const cuantos = u16(v, fin + 10);

  for (let n = 0; n < cuantos; n++) {
    if (u32(v, p) !== 0x02014b50) return null;

    const metodo = u16(v, p + 10);
    const comprimido = u32(v, p + 20);
    const largoNombre = u16(v, p + 28);
    const largoExtra = u16(v, p + 30);
    const largoComentario = u16(v, p + 32);
    const dondeEmpieza = u32(v, p + 42);
    const suNombre = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + largoNombre));

    if (suNombre === nombre) {
      // En el encabezado suelto, los largos pueden diferir del índice.
      const vl = new DataView(datos, dondeEmpieza);
      const inicio = dondeEmpieza + 30 + u16(vl, 26) + u16(vl, 28);
      const crudo = bytes.subarray(inicio, inicio + comprimido);

      if (metodo === 0) return crudo;
      if (metodo !== 8) return null; // otro método de compresión: no lo tratamos

      const flujo = new Blob([crudo])
        .stream()
        .pipeThrough(new DecompressionStream('deflate-raw'));
      return new Uint8Array(await new Response(flujo).arrayBuffer());
    }

    p += 46 + largoNombre + largoExtra + largoComentario;
  }

  return null;
}

/** El XML de Word, reducido a los renglones que se ven. */
function textoDelXmlDeWord(xml: string): string {
  return xml
    .replace(/<w:tab\b[^>]*\/?>/g, ' ')
    .replace(/<w:br\b[^>]*\/?>/g, '\n')
    .replace(/<\/w:p>/g, '\n') // cada párrafo, un renglón
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/ /g, ' ');
}

/** Formatos que se pueden elegir desde el botón de subir. */
export const FORMATOS_ACEPTADOS = '.txt,.md,.csv,.docx,text/plain';

/** El texto de un archivo, sea un .txt o un Word. */
export async function leerArchivoDeTexto(archivo: File): Promise<string> {
  const esWord =
    archivo.name.toLowerCase().endsWith('.docx') ||
    archivo.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  if (!esWord) return archivo.text();

  if (typeof DecompressionStream === 'undefined') {
    throw new Error(
      'Este navegador no puede abrir archivos de Word. Guardalo como texto (.txt) y probá de nuevo.'
    );
  }

  const xml = await sacarDelZip(await archivo.arrayBuffer(), DOCUMENTO_WORD);
  if (!xml) {
    throw new Error(
      'No se pudo leer ese archivo de Word. Guardalo como texto (.txt) y probá de nuevo.'
    );
  }

  return textoDelXmlDeWord(new TextDecoder().decode(xml));
}
