import { API, hayServidor } from '@/lib/api';

// ---------------------------------------------------------------------------
// Lo que ocupa todo, y cómo se libera.
//
// El servidor es el que se llena: tiene 1 GB para todas las cuentas y un reel
// pesa cien veces más que el texto de un mes entero. Estas son las tres cosas
// que se le pueden preguntar o pedir.
// ---------------------------------------------------------------------------

export interface Almacenamiento {
  archivos: number;
  bytes: number;
  /** Los que no nombra ningún contenido: quedaron de reemplazar o borrar piezas. */
  sinDueno: number;
  bytesSinDueno: number;
  donde: 'nube' | 'disco';
}

export interface Borrado {
  borrados: number;
  bytes: number;
  /** Los que el servidor no borró porque los vio en uso. */
  enUso: string[];
  fallados: string[];
}

async function pedir<T>(ruta: string, sesion: string, opciones: RequestInit = {}): Promise<T | null> {
  if (!hayServidor() || !sesion) return null;
  try {
    const res = await fetch(`${API}${ruta}`, {
      ...opciones,
      headers: {
        Authorization: `Bearer ${sesion}`,
        ...(opciones.body ? { 'Content-Type': 'application/json' } : {}),
        ...opciones.headers,
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function consultarAlmacenamiento(sesion: string) {
  return pedir<Almacenamiento>('/api/almacenamiento', sesion);
}

/**
 * Pide borrar archivos concretos.
 *
 * El servidor comprueba igual que no estén en uso antes de tocarlos: que la
 * decisión la tome la app no quiere decir que se le crea.
 */
export function borrarEnElServidor(ids: string[], sesion: string) {
  if (ids.length === 0) return Promise.resolve<Borrado>({ borrados: 0, bytes: 0, enUso: [], fallados: [] });
  return pedir<Borrado>('/api/almacenamiento/borrar', sesion, {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

/** Barre lo que no nombra nadie. Corre solo una vez por día, pero se puede pedir. */
export function barrerSinDueno(sesion: string) {
  return pedir<Borrado>('/api/almacenamiento/barrer', sesion, { method: 'POST' });
}
