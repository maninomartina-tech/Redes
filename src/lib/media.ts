import { useEffect, useState } from 'react';
import { API, hayServidor } from '@/lib/api';

// ---------------------------------------------------------------------------
// Archivos subidos (inspiración y pieza final).
//
// Se guardan en IndexedDB y no en localStorage: una sola foto en base64 se
// come casi todo el cupo de localStorage (~5 MB) y la app dejaría de guardar.
// En IndexedDB entran archivos grandes sin problema.
//
// Las imágenes se achican antes de guardarse para no ocupar de más; los
// videos se guardan tal cual.
// ---------------------------------------------------------------------------

export interface MediaRef {
  id: string;
  name: string;
  kind: 'image' | 'video';
  /** tamaño en bytes ya procesado */
  size: number;
  /** id de la copia en el servidor, si ya se respaldó */
  remoteId?: string;
  /** dirección pública de esa copia */
  url?: string;
}

const DB_NAME = 'demm-media';
const STORE = 'archivos';
const MAX_LADO = 1600; // px del lado más largo para las imágenes
const CALIDAD = 0.82;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function uid(): string {
  return `md_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

/** Achica una imagen manteniendo la proporción. Si algo falla, devuelve el original. */
async function comprimirImagen(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width, bitmap.height));
    if (escala === 1 && file.size < 600_000) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, 'image/jpeg', CALIDAD)
    );
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export async function saveMedia(file: File): Promise<MediaRef> {
  const kind: MediaRef['kind'] = file.type.startsWith('video') ? 'video' : 'image';
  const blob = kind === 'image' ? await comprimirImagen(file) : file;
  const id = uid();

  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return { id, name: file.name, kind, size: blob.size };
}

export async function getMediaBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve((req.result as Blob) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function deleteMedia(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* si no se puede borrar, no rompe nada */
  }
}

/**
 * A partir de acá se sube en pedazos.
 *
 * Debajo de este tamaño, un solo pedido es más simple y termina antes.
 */
const SUBIR_EN_PEDAZOS_DESDE = 8 * 1024 * 1024;

/** Cuántas veces se reintenta un pedazo antes de darse por vencido. */
const REINTENTOS = 3;

/** Sin `PUBLIC_URL`, el servidor devuelve una dirección relativa. */
const absoluta = (url: string) => (/^https?:\/\//i.test(url) ? url : `${API}${url}`);

async function conSesion(extra: HeadersInit = {}): Promise<HeadersInit> {
  const { useStore } = await import('@/store/useStore');
  const sesion = useStore.getState().sesion;
  return sesion ? { Authorization: `Bearer ${sesion}`, ...extra } : extra;
}

/** El mensaje del servidor, o uno genérico si no dijo nada útil. */
async function motivo(res: Response): Promise<string> {
  const d = await res.json().catch(() => ({}));
  if (d?.error) return d.error as string;
  if (res.status === 401) return 'Tu sesión venció. Volvé a entrar con tu clave.';
  if (res.status === 413) return 'El archivo es demasiado grande para el servidor.';
  return `El servidor rechazó el archivo (${res.status}).`;
}

export interface OpcionesDeRespaldo {
  /** Cuánto va subido, de 0 a 1. Para poder mostrar que algo está pasando. */
  alProgreso?: (parte: number) => void;
}

/** Lo que se sabe de un intento de respaldo que no salió. */
export class ErrorDeSubida extends Error {}

/**
 * Sube un archivo grande de a pedazos.
 *
 * Un video no entra en un solo pedido: en el camino hay intermediarios que
 * cortan los pedidos grandes, y conexiones de celular que se caen a la mitad.
 * Partido, cada pedazo viaja rápido, el que falla se reintenta solo —sin
 * volver a empezar de cero— y se puede mostrar cuánto falta.
 */
async function subirEnPedazos(
  blob: Blob,
  media: MediaRef,
  alProgreso?: (parte: number) => void
): Promise<{ id: string; url: string }> {
  const cabeceras = await conSesion();

  const inicio = await fetch(`${API}/api/media/iniciar`, {
    method: 'POST',
    headers: { ...cabeceras, 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: media.name, tipo: blob.type, tamano: blob.size }),
  });
  if (!inicio.ok) throw new ErrorDeSubida(await motivo(inicio));

  const { subida, pedazo } = await inicio.json();

  let desde = 0;
  while (desde < blob.size) {
    const hasta = Math.min(desde + pedazo, blob.size);

    let ultimo: string | null = null;
    let subido = false;

    for (let intento = 0; intento < REINTENTOS && !subido; intento++) {
      const form = new FormData();
      form.append('subida', subida);
      form.append('desde', String(desde));
      form.append('parte', blob.slice(desde, hasta), 'parte');

      try {
        const res = await fetch(`${API}/api/media/parte`, {
          method: 'POST',
          headers: cabeceras,
          body: form,
        });
        if (res.ok) {
          subido = true;
        } else {
          ultimo = await motivo(res);
          // Un 409 quiere decir que el servidor perdió la subida: reintentar
          // el mismo pedazo no va a arreglarlo.
          if (res.status === 409 || res.status === 413 || res.status === 401) break;
        }
      } catch {
        ultimo = 'Se cortó la conexión mientras subía.';
      }

      // Un respiro antes de reintentar: si se cayó la red, no vuelve al
      // instante.
      if (!subido) await new Promise((r) => setTimeout(r, 500 * (intento + 1)));
    }

    if (!subido) throw new ErrorDeSubida(ultimo ?? 'No se pudo subir el archivo.');

    desde = hasta;
    alProgreso?.(desde / blob.size);
  }

  const fin = await fetch(`${API}/api/media/terminar`, {
    method: 'POST',
    headers: { ...cabeceras, 'Content-Type': 'application/json' },
    body: JSON.stringify({ subida }),
  });
  if (!fin.ok) throw new ErrorDeSubida(await motivo(fin));

  return await fin.json();
}

/**
 * Sube al servidor una copia del archivo y devuelve la referencia con su
 * dirección pública.
 *
 * Hace falta por dos motivos: el cliente abre su link desde otro dispositivo
 * —donde el IndexedDB de este navegador no existe— y Meta descarga la pieza
 * por URL en vez de recibirla adjunta.
 *
 * Si falla, **avisa**. Antes devolvía la referencia como si nada: el archivo
 * quedaba solo en este navegador, la pieza se veía perfecta de este lado, y
 * recién se notaba cuando el cliente abría su link y encontraba un hueco.
 */
export async function respaldarEnServidor(
  media: MediaRef,
  { alProgreso }: OpcionesDeRespaldo = {}
): Promise<MediaRef> {
  if (!hayServidor() || media.remoteId) return media;

  const blob = await getMediaBlob(media.id);
  if (!blob) return media;

  if (blob.size > SUBIR_EN_PEDAZOS_DESDE) {
    const { id, url } = await subirEnPedazos(blob, media, alProgreso);
    return { ...media, remoteId: id, url: absoluta(url) };
  }

  let res: Response;
  try {
    const form = new FormData();
    form.append('archivo', blob, media.name);
    res = await fetch(`${API}/api/media`, {
      method: 'POST',
      headers: await conSesion(),
      body: form,
    });
  } catch {
    throw new ErrorDeSubida('No se pudo contactar al servidor.');
  }
  if (!res.ok) throw new ErrorDeSubida(await motivo(res));

  const { id, url } = await res.json();
  alProgreso?.(1);
  return { ...media, remoteId: id, url: absoluta(url) };
}

/**
 * Devuelve una URL utilizable en <img> o <video> para un archivo guardado.
 *
 * Primero busca la copia local, que se ve al instante; si no está —porque el
 * archivo se subió desde otro dispositivo— usa la del servidor.
 * Libera la URL sola cuando el componente se desmonta.
 */
export function useMediaUrl(id?: string, remota?: string): string | undefined {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!id) {
      setUrl(remota);
      return;
    }
    let vigente = true;
    let creada: string | undefined;

    getMediaBlob(id).then((blob) => {
      if (!vigente) return;
      if (!blob) {
        setUrl(remota);
        return;
      }
      creada = URL.createObjectURL(blob);
      setUrl(creada);
    });

    return () => {
      vigente = false;
      if (creada) URL.revokeObjectURL(creada);
    };
  }, [id, remota]);

  return url;
}

/**
 * Baja el archivo al dispositivo.
 *
 * Mientras la publicación se hace a mano, este es el paso real del trabajo:
 * la pieza tiene que terminar en el teléfono para subirla desde Instagram.
 */
export async function descargarMedia(media: MediaRef): Promise<boolean> {
  let url: string | undefined;
  let creada = false;

  const blob = await getMediaBlob(media.id);
  if (blob) {
    url = URL.createObjectURL(blob);
    creada = true;
  } else if (media.url) {
    url = media.url;
  }
  if (!url) return false;

  const a = document.createElement('a');
  a.href = url;
  a.download = media.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (creada) setTimeout(() => URL.revokeObjectURL(url!), 60_000);
  return true;
}

export function formatSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
