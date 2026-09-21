import type { Client, FilaDePlan, PostType } from '@/types';
import { fmt } from '@/lib/date';
import { nombreDeMes, filasOrdenadas } from '@/lib/plan';

// ---------------------------------------------------------------------------
// El plan del mes, en papel.
//
// Se arma como un documento aparte y se manda a imprimir: el navegador ofrece
// "Guardar como PDF" y sale un archivo con texto de verdad, que se puede
// buscar y copiar. Sin librerías: una de PDF pesa más que toda la app y esto
// es una hoja con una tabla.
//
// Va en una ventana nueva y no escondido en la página para no pelear con los
// estilos de la app: acá manda esta hoja y nada más.
// ---------------------------------------------------------------------------

const esc = (t: string) =>
  t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Mayúscula solo en la primera letra.
 *
 * `text-transform: capitalize` pone en mayúscula cada palabra, y en castellano
 * eso da "Mar 1 De Sep" y "3 Contenidos". Se resuelve acá y el CSS no toca el
 * texto.
 */
const conMayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

const COMO_SE_LLAMA: Record<PostType, string> = {
  reel: 'Reel',
  post: 'Posteo',
  carrusel: 'Carrusel',
  historia: 'Historia',
};

/** Cómo se llama el guion según lo que se vaya a grabar. */
function tituloDelGuion(tipo: PostType): string {
  if (tipo === 'reel') return 'Contenido del reel (el diálogo)';
  if (tipo === 'carrusel') return 'Contenido del carrusel (placa por placa)';
  if (tipo === 'historia') return 'Contenido de la historia';
  return 'Contenido del posteo';
}

export interface PlanParaImprimir {
  cliente: Client;
  mes: string;
  objetivos: string;
  plan: string;
  filas: FilaDePlan[];
}

export function htmlDelPlan({ cliente, mes, objetivos, plan, filas }: PlanParaImprimir): string {
  const orden = filasOrdenadas(filas);

  // Cada contenido es un bloque y no un renglón de cinco celdas: el guion es
  // lo que se lee mientras se graba, y en una columna angosta no se lee.
  const renglones = orden
    .map((f) => {
      const parte = (titulo: string, texto: string, falta: string) =>
        `<div class="parte"><p class="que">${titulo}</p><p class="dice">${
          texto.trim() ? esc(texto) : `<span class="vacio">${falta}</span>`
        }</p></div>`;

      const referencia = f.referencia?.trim()
        ? `<p class="ref"><a href="${esc(f.referencia)}">${esc(f.referencia)}</a></p>`
        : '';

      return `<tr>
        <td class="cuando">
          <p class="fecha">${esc(conMayuscula(fmt(f.fecha, "EEE d 'de' MMM")))}</p>
          <p><span class="tipo">${COMO_SE_LLAMA[f.tipo]}</span></p>
          ${referencia}
        </td>
        <td class="que-va">
          ${parte(tituloDelGuion(f.tipo), f.contenido ?? '', 'Sin guion todavía')}
          ${parte('Copy', f.copy, 'Sin copy todavía')}
        </td>
      </tr>`;
    })
    .join('\n');

  const bloque = (titulo: string, texto: string) =>
    texto.trim()
      ? `<section><h2>${titulo}</h2><p class="texto">${esc(texto)}</p></section>`
      : '';

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Plan de ${esc(cliente.name)} · ${esc(nombreDeMes(mes))}</title>
<style>
  @page { margin: 14mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 28px 24px 60px;
    color: #2d1c19;
    background: #fff;
    font: 13px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  .hoja { max-width: 900px; margin: 0 auto; }
  header { border-bottom: 2px solid #4a1e1a; padding-bottom: 10px; margin-bottom: 18px; }
  .marca { font-size: 11px; letter-spacing: .09em; text-transform: uppercase; color: #8a6865; }
  h1 { margin: 4px 0 0; font-size: 23px; color: #4a1e1a; }
  .mes { margin: 2px 0 0; color: #8a6865; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: #8a6865; margin: 0 0 4px; }
  section { margin-bottom: 16px; }
  .texto { margin: 0; white-space: pre-wrap; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th {
    text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .05em;
    color: #8a6865; border-bottom: 1px solid #d8c4b4; padding: 0 8px 5px 0;
  }
  td { vertical-align: top; padding: 11px 10px 13px 0; border-bottom: 1px solid #ece0d4; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  .cuando { width: 140px; }
  .cuando p { margin: 0 0 5px; }
  .fecha { font-weight: 700; font-size: 14px; }
  .tipo {
    display: inline-block; background: #f3e7db; border-radius: 20px;
    padding: 1px 9px; font-size: 11px; font-weight: 600; color: #4a1e1a;
  }
  .ref { word-break: break-all; font-size: 10px; line-height: 1.35; }
  .ref a { color: #8a6865; }
  .parte + .parte { margin-top: 9px; }
  .que {
    margin: 0 0 2px; font-size: 10px; font-weight: 700; letter-spacing: .05em;
    text-transform: uppercase; color: #8a6865;
  }
  .dice { margin: 0; white-space: pre-wrap; }
  .vacio { color: #b9a69c; }
  .nada { color: #8a6865; padding: 20px 0; }
  .barra {
    position: sticky; top: 0; display: flex; gap: 10px; align-items: center;
    background: #fcf5e8; border: 1px solid #e7d8c4; border-radius: 12px;
    padding: 10px 14px; margin-bottom: 20px;
  }
  .barra p { margin: 0; font-size: 12px; color: #8a6865; }
  button {
    font: inherit; font-weight: 700; cursor: pointer;
    background: #4a1e1a; color: #fcf5e8; border: 0; border-radius: 9px; padding: 8px 15px;
  }
  @media print { .barra { display: none; } body { padding: 0; } }
</style>
</head>
<body>
  <div class="hoja">
    <div class="barra">
      <button onclick="window.print()">Guardar como PDF</button>
      <p>En destino, elegí <strong>Guardar como PDF</strong>.</p>
    </div>

    <header>
      <p class="marca">Demm · Planificación</p>
      <h1>${esc(cliente.name)}</h1>
      <p class="mes">${esc(conMayuscula(nombreDeMes(mes)))} · ${orden.length} ${
        orden.length === 1 ? 'contenido' : 'contenidos'
      }</p>
    </header>

    ${bloque('Objetivos', objetivos)}
    ${bloque('Qué se va a desarrollar', plan)}

    <section>
      <h2>Contenido del mes</h2>
      ${
        orden.length === 0
          ? '<p class="nada">Todavía no hay contenido cargado.</p>'
          : `<table>
        <thead><tr><th>Cuándo</th><th>Qué va</th></tr></thead>
        <tbody>${renglones}</tbody>
      </table>`
      }
    </section>
  </div>
</body>
</html>`;
}

/**
 * Abre la hoja y manda a imprimir.
 *
 * Devuelve `false` si el navegador bloqueó la ventana, que es lo que pasa
 * cuando el bloqueador de pop-ups está activo: hay que poder avisarlo en vez
 * de que no pase nada.
 */
export function imprimirPlan(datos: PlanParaImprimir): boolean {
  const ventana = window.open('', '_blank');
  if (!ventana) return false;

  ventana.document.write(htmlDelPlan(datos));
  ventana.document.close();

  // El print se pide después de que la hoja terminó de dibujarse: pedirlo
  // antes imprime una página en blanco en algunos navegadores.
  ventana.addEventListener('load', () => {
    ventana.focus();
    setTimeout(() => ventana.print(), 150);
  });

  return true;
}
