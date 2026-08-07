// ---------------------------------------------------------------------------
// El manifiesto de la app, para que el cliente instale *lo suyo*.
//
// Cuando el cliente agrega el link a su pantalla de inicio, quien decide qué
// se abre al tocar el ícono no es la dirección que él tenía abierta: es el
// `start_url` del manifiesto. El nuestro apuntaba a la raíz, así que el ícono
// le abría la pantalla de ingreso de la creadora — le pedía una clave que no
// tiene, en vez de mostrarle su contenido.
//
// Acá se arma un manifiesto propio para cada portal, con su link adentro y con
// el nombre de su cuenta. No hay forma de hacerlo con un archivo estático: el
// token es distinto para cada cliente y no existe hasta que se crea el link.
// ---------------------------------------------------------------------------

const SELECTOR = "link[rel='manifest']";
const ORIGINAL = '/manifest.webmanifest';

/** El `blob:` anterior, para soltarlo cuando se reemplaza. */
let vigente: string | null = null;

function ponerManifiesto(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(SELECTOR);
  if (!el) {
    el = document.createElement('link');
    el.rel = 'manifest';
    document.head.appendChild(el);
  }
  el.href = href;
}

function soltarVigente() {
  if (vigente) {
    URL.revokeObjectURL(vigente);
    vigente = null;
  }
}

/**
 * Deja instalable el portal de este cliente.
 *
 * `start_url` lleva el token, que es lo único que hace que el ícono abra su
 * contenido y no la puerta de la creadora. El nombre es el de su cuenta: en la
 * pantalla de inicio de su teléfono va a estar al lado de WhatsApp, y "Demm ·
 * Gestión de contenido" no le dice nada.
 *
 * En iPhone esto no hace falta —iOS ignora el manifiesto y guarda la dirección
 * que estaba abierta, que ya es la correcta— pero tampoco molesta.
 */
export function aplicarManifiestoDelPortal(token: string, nombre: string, icono?: string) {
  const { origin, pathname } = window.location;
  const base = `${origin}${pathname}`;

  const manifiesto = {
    name: nombre,
    short_name: nombre.slice(0, 12),
    description: 'Tu contenido del mes, para revisar y aprobar.',
    // Lo importante: el ícono abre su contenido, no la puerta de la creadora.
    start_url: `${base}#/c/${token}`,
    scope: base,
    display: 'standalone',
    background_color: '#FCF5E8',
    theme_color: '#4A1E1A',
    lang: 'es',
    icons: [
      {
        src: icono ?? `${origin}/icono-192.png`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: icono ?? `${origin}/icono-512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };

  soltarVigente();
  vigente = URL.createObjectURL(
    new Blob([JSON.stringify(manifiesto)], { type: 'application/manifest+json' })
  );
  ponerManifiesto(vigente);
}

/** Vuelve al manifiesto de siempre, el de la creadora. */
export function restaurarManifiesto() {
  soltarVigente();
  ponerManifiesto(ORIGINAL);
}
