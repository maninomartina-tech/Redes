import type { Client, Post } from '@/types';
import { isSameDay } from '@/lib/date';

// ---------------------------------------------------------------------------
// Todas las cuentas de un vistazo.
//
// El resto de la app trabaja sobre una cuenta por vez, que es como se produce
// el contenido. Pero el lunes a la mañana la pregunta no es "¿cómo viene Aurora
// Skin?" sino "¿qué tengo que hacer hoy, en todas?" — y esa respuesta hoy había
// que armarla entrando cuenta por cuenta.
//
// Lo que se cuenta acá es lo que le toca hacer a ella, no estadísticas: lo
// atrasado primero, después lo de hoy, después lo que espera respuesta del
// cliente. Un número que no lleva a ninguna acción no entra.
// ---------------------------------------------------------------------------

/** Lo que ya está listo y todavía no salió. */
const porSalir = (p: Post) => p.status === 'aprobado' || p.status === 'programado';

export interface ResumenDeCuenta {
  cliente: Client;
  /** Aprobado, con fecha pasada y sin publicar: es lo primero que hay que mirar. */
  atrasados: number;
  /** Para subir hoy. */
  hoy: number;
  /** Esperando que el cliente conteste. */
  enRevision: number;
  /** Aprobada la idea, falta producir la pieza. */
  enEdicion: number;
  /** Comentarios del cliente sin resolver. */
  comentarios: number;
  /** Cuántas piezas hay planificadas en el mes que se está mirando. */
  delMes: number;
  /** Lo próximo que sale, para saber si la cuenta quedó sin contenido. */
  proxima?: Post;
  /** ¿Hay algo que hacer? Ordena la lista: lo que reclama va primero. */
  reclama: number;
}

export function resumenDeCuenta(
  cliente: Client,
  posts: Post[],
  mes: Date,
  ahora = new Date()
): ResumenDeCuenta {
  const suyos = posts.filter((p) => p.clientId === cliente.id);

  const atrasados = suyos.filter(
    (p) => porSalir(p) && new Date(p.date) < ahora && !isSameDay(p.date, ahora)
  ).length;
  const hoy = suyos.filter((p) => porSalir(p) && isSameDay(p.date, ahora)).length;
  const enRevision = suyos.filter((p) => p.status === 'revision').length;
  const enEdicion = suyos.filter((p) => p.status === 'edicion').length;

  const comentarios = suyos.reduce(
    (n, p) => n + p.comments.filter((c) => !c.resolved && c.author === 'cliente').length,
    0
  );

  const delMes = suyos.filter((p) => {
    const d = new Date(p.date);
    return d.getFullYear() === mes.getFullYear() && d.getMonth() === mes.getMonth();
  }).length;

  const proxima = suyos
    .filter((p) => new Date(p.date) >= ahora && p.status !== 'publicado')
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  return {
    cliente,
    atrasados,
    hoy,
    enRevision,
    enEdicion,
    comentarios,
    delMes,
    proxima,
    // Lo atrasado pesa más que lo de hoy, y un comentario sin contestar más
    // que una pieza esperando: del otro lado hay alguien esperando respuesta.
    reclama: atrasados * 100 + comentarios * 10 + hoy * 5 + enRevision,
  };
}

/** Todas las cuentas, con la que más reclama arriba. */
export function panorama(
  clientes: Client[],
  posts: Post[],
  mes: Date,
  ahora = new Date()
): ResumenDeCuenta[] {
  return clientes
    .map((c) => resumenDeCuenta(c, posts, mes, ahora))
    .sort((a, b) => b.reclama - a.reclama || a.cliente.name.localeCompare(b.cliente.name));
}

/** Los totales de arriba: la misma cuenta, sumada. */
export function totales(resumenes: ResumenDeCuenta[]) {
  return resumenes.reduce(
    (t, r) => ({
      atrasados: t.atrasados + r.atrasados,
      hoy: t.hoy + r.hoy,
      enRevision: t.enRevision + r.enRevision,
      enEdicion: t.enEdicion + r.enEdicion,
      comentarios: t.comentarios + r.comentarios,
      delMes: t.delMes + r.delMes,
      /** Cuentas sin nada planificado de acá en adelante. */
      vacias: t.vacias + (r.proxima ? 0 : 1),
    }),
    {
      atrasados: 0,
      hoy: 0,
      enRevision: 0,
      enEdicion: 0,
      comentarios: 0,
      delMes: 0,
      vacias: 0,
    }
  );
}
