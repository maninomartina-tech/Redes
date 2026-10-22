// ---------------------------------------------------------------------------
// El manifiesto de la app, para que el cliente instale *lo suyo*.
//
// Cuando alguien agrega el link a su pantalla de inicio, lo que se abre al
// tocar el ícono no es la dirección que tenía abierta: es el `start_url` del
// manifiesto. El de siempre apunta a la raíz, así que al cliente el ícono le
// abría la pantalla de ingreso de la creadora —una clave que no tiene— en vez
// de su contenido.
//
// El primer intento fue armar un manifiesto a medida y servirlo desde un
// `blob:`. El navegador lo lee, pero **descarta el `start_url`**: la regla es
// que tiene que ser del mismo origen que el manifiesto, y un `blob:` no tiene
// un origen que sirva para compararse. Se quedaba con la raíz, igual que
// antes, y sin dar ningún error.
//
// Lo que sí funciona es un manifiesto de verdad, servido desde una dirección
// de verdad, con el token adentro de *la dirección* y un `start_url` relativo:
//
//     /c/<token>/manifest.webmanifest   →   el archivo de siempre
//     start_url: "./"                   →   /c/<token>/
//
// Así alcanza un solo archivo estático para todos los clientes: lo que cambia
// es desde dónde se lo pide. La regla que hace el reemplazo está en
// `netlify.toml`.
// ---------------------------------------------------------------------------

const SELECTOR = "link[rel='manifest']";
const ORIGINAL = '/manifest.webmanifest';

function ponerManifiesto(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(SELECTOR);
  if (!el) {
    el = document.createElement('link');
    el.rel = 'manifest';
    document.head.appendChild(el);
  }
  // Reponerlo igual no hace nada, y el navegador vuelve a pedirlo cada vez.
  if (el.getAttribute('href') !== href) el.setAttribute('href', href);
}

/** La dirección del portal de un cliente, la que abre el ícono instalado. */
export function rutaDelPortal(token: string): string {
  return `/c/${token}/`;
}

/**
 * Deja instalable el portal de este cliente.
 *
 * Vale tanto si entró por la dirección nueva como por un link viejo con `#`:
 * el token lo sabemos igual, y el ícono va a abrir la dirección nueva.
 */
export function aplicarManifiestoDelPortal(token: string) {
  if (!token) return;
  ponerManifiesto(`${rutaDelPortal(token)}manifest.webmanifest`);
}

/** Vuelve al manifiesto de siempre, el de la creadora. */
export function restaurarManifiesto() {
  ponerManifiesto(ORIGINAL);
}

/**
 * El token cuando se entró por la dirección nueva, sin `#`.
 *
 * Es la que abre el ícono de la pantalla de inicio, así que tiene que llevar
 * al mismo lado que el link con `#` que ya se repartió.
 */
export function tokenEnLaDireccion(pathname: string): string | null {
  const m = /^\/c\/([A-Za-z0-9_-]+)\/?$/.exec(pathname);
  return m ? m[1] : null;
}
