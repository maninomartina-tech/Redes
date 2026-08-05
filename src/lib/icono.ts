import { getMediaBlob } from '@/lib/media';
import type { MediaRef } from '@/types';

// ---------------------------------------------------------------------------
// El ícono de la app sigue al logo de la marca.
//
// Cambiar el ícono de la pestaña —o el de la pantalla de inicio del teléfono—
// era editar archivos del proyecto y volver a publicar. Para quien usa la app
// eso no es una opción, así que sale del mismo lugar que ya controla: Marca →
// Logo. Se sube una vez y queda en los tres lados.
//
// El archivo `public/logo.svg` sigue siendo el que se ve mientras no haya
// ninguno subido.
// ---------------------------------------------------------------------------

/** Los `<link>` del `<head>` que apuntan a un ícono. */
const ENLACES = [
  { rel: 'icon', selector: "link[rel='icon']" },
  { rel: 'apple-touch-icon', selector: "link[rel='apple-touch-icon']" },
];

function ponerEnlace(rel: string, selector: string, href: string, tipo?: string) {
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  if (tipo) el.type = tipo;
  else el.removeAttribute('type');
  el.href = href;
}

/**
 * Un `data:` y no un `blob:`.
 *
 * Los `blob:` viven atados a la página que los creó y varios navegadores no los
 * aceptan como ícono; además, cuando alguien agrega la app a su pantalla de
 * inicio, el sistema lee el ícono fuera de la página y un `blob:` ahí ya no
 * existe.
 */
function comoDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.onerror = () => reject(lector.error);
    lector.readAsDataURL(blob);
  });
}

/** Deja el ícono de la app igual al logo subido; sin logo, el de siempre. */
export async function aplicarIcono(logo?: MediaRef): Promise<void> {
  if (!logo) {
    ponerEnlace('icon', ENLACES[0].selector, '/logo.svg', 'image/svg+xml');
    ponerEnlace('apple-touch-icon', ENLACES[1].selector, '/apple-touch-icon.png');
    return;
  }

  try {
    const blob = (await getMediaBlob(logo.id)) ?? null;
    const href = blob ? await comoDataUrl(blob) : logo.url;
    if (!href) return;

    ENLACES.forEach(({ rel, selector }) =>
      ponerEnlace(rel, selector, href, blob?.type || undefined)
    );
  } catch {
    // Si no se puede leer, se queda el que estaba: mejor eso que ninguno.
  }
}
