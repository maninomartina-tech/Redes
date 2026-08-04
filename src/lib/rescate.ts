import { seedClients, seedPosts } from '@/data/seed';
import type { DatosEspacio } from '@/lib/espacio';

// ---------------------------------------------------------------------------
// La red de contención.
//
// Al abrir la app, lo que está en el servidor reemplaza lo que hay en este
// dispositivo. Tiene que ser así —si no, dos computadoras nunca coincidirían—,
// pero significa que un documento malo en el servidor borra el trabajo de acá
// en silencio y para siempre, y encima se repite en cada actualización.
//
// Entonces: antes de reemplazar nada, se guarda aparte una copia de lo que
// había. Si lo que llegó tiene menos que lo que estaba, la app lo dice y deja
// recuperarlo con un botón. Nunca se pierde algo sin que quede una vuelta atrás.
// ---------------------------------------------------------------------------

const CLAVE = 'demm-redes-rescate';

export interface Rescate {
  /** Cuándo se guardó la copia. */
  cuando: string;
  clientes: number;
  posts: number;
  datos: DatosEspacio;
}

/** Cuánto contenido real hay acá. */
const bultos = (d: DatosEspacio) => ({
  clientes: (d.clients ?? []).length,
  posts: (d.posts ?? []).length,
});

/**
 * ¿Esto es el ejemplo con el que viene la app, sin tocar?
 *
 * Importa distinguirlo: en un navegador nuevo lo que hay son los datos de
 * muestra, y que el servidor los reemplace no es una pérdida, es lo correcto.
 * Avisar ahí sería el aviso que se aprende a ignorar.
 */
export function esElEjemplo(d: DatosEspacio): boolean {
  const ids = new Set(seedClients.map((c) => c.id));
  const idsPosts = new Set(seedPosts.map((p) => p.id));
  return (
    (d.clients ?? []).every((c) => ids.has(c.id)) &&
    (d.posts ?? []).every((p) => idsPosts.has(p.id))
  );
}

/**
 * ¿Lo que llegó del servidor tiene menos que lo que hay acá?
 *
 * Se mira cliente por cliente y no solo el total: si el servidor trae uno solo
 * —lo que pasaba al abrir el link de un cliente estando con la sesión abierta—
 * el total de publicaciones puede incluso parecerse, y aun así falta todo el
 * resto de las cuentas.
 */
export function seEstaPerdiendoAlgo(local: DatosEspacio, delServidor: DatosEspacio): boolean {
  if (esElEjemplo(local)) return false;

  const aca = bultos(local);
  const alla = bultos(delServidor);
  if (aca.clientes > alla.clientes || aca.posts > alla.posts) return true;

  // Alguna cuenta que existe acá y allá no.
  const idsAlla = new Set((delServidor.clients ?? []).map((c) => c.id));
  return (local.clients ?? []).some((c) => !idsAlla.has(c.id));
}

export function guardarRescate(datos: DatosEspacio): Rescate | null {
  const { clientes, posts } = bultos(datos);
  const rescate: Rescate = { cuando: new Date().toISOString(), clientes, posts, datos };
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(rescate));
    return rescate;
  } catch {
    // Sin lugar para guardarlo, mejor seguir que romper.
    return null;
  }
}

export function leerRescate(): Rescate | null {
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    return crudo ? (JSON.parse(crudo) as Rescate) : null;
  } catch {
    return null;
  }
}

export function borrarRescate(): void {
  try {
    window.localStorage.removeItem(CLAVE);
  } catch {
    /* nada que hacer */
  }
}
