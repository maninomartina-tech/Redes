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
 * Sube al servidor una copia del archivo y devuelve la referencia con su
 * dirección pública.
 *
 * Hace falta por dos motivos: el cliente abre su link desde otro dispositivo
 * —donde el IndexedDB de este navegador no existe— y Meta descarga la pieza
 * por URL en vez de recibirla adjunta.
 *
 * Si no hay servidor, o falla la subida, devuelve la referencia tal cual: la
 * app sigue funcionando de este lado.
 */
export async function respaldarEnServidor(media: MediaRef): Promise<MediaRef> {
  if (!hayServidor() || media.remoteId) return media;
  try {
    const blob = await getMediaBlob(media.id);
    if (!blob) return media;

    const form = new FormData();
    form.append('archivo', blob, media.name);

    const res = await fetch(`${API}/api/media`, { method: 'POST', body: form });
    if (!res.ok) return media;

    const { id, url } = await res.json();
    // Sin `PUBLIC_URL` el servidor devuelve una dirección relativa, que desde
    // el dispositivo del cliente no apunta a ningún lado. La completamos.
    const absoluta = /^https?:\/\//i.test(url) ? url : `${API}${url}`;
    return { ...media, remoteId: id, url: absoluta };
  } catch {
    return media;
  }
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

export function formatSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
