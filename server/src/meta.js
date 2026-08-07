// ---------------------------------------------------------------------------
// Graph API de Meta · publicación en Instagram
//
// El flujo oficial tiene dos pasos: primero se crea un "contenedor" con la URL
// del archivo, y después se publica ese contenedor. Los videos tardan en
// procesarse, así que hay que esperar a que el contenedor quede listo.
//
// Importante: Meta descarga el archivo desde una URL pública. No se le puede
// mandar el archivo adjunto, por eso el servidor los sirve desde /archivos.
// ---------------------------------------------------------------------------

const API = `https://graph.facebook.com/${process.env.META_API_VERSION ?? 'v21.0'}`;

class ErrorMeta extends Error {
  constructor(mensaje, detalle) {
    super(mensaje);
    this.name = 'ErrorMeta';
    this.detalle = detalle;
  }
}

async function llamar(ruta, { method = 'GET', params = {}, token } = {}) {
  const url = new URL(`${API}${ruta}`);
  if (token) params.access_token = token;

  let body;
  if (method === 'GET') {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  } else {
    body = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) body.set(k, String(v));
    });
  }

  const res = await fetch(url, { method, body });
  const datos = await res.json().catch(() => ({}));

  if (!res.ok || datos.error) {
    const e = datos.error ?? {};
    throw new ErrorMeta(
      e.error_user_msg || e.message || `Meta respondió ${res.status}`,
      datos
    );
  }
  return datos;
}

/** Cambia un token corto por uno de larga duración (unos 60 días). */
export async function tokenLargo(tokenCorto) {
  return llamar('/oauth/access_token', {
    params: {
      grant_type: 'fb_exchange_token',
      client_id: process.env.META_APP_ID,
      client_secret: process.env.META_APP_SECRET,
      fb_exchange_token: tokenCorto,
    },
  });
}

/** Cambia el código del login por un token de acceso. */
export async function tokenDesdeCodigo(code, redirectUri) {
  return llamar('/oauth/access_token', {
    params: {
      client_id: process.env.META_APP_ID,
      client_secret: process.env.META_APP_SECRET,
      redirect_uri: redirectUri,
      code,
    },
  });
}

/**
 * Devuelve las cuentas de Instagram vinculadas a las páginas del usuario.
 * Solo las cuentas Business/Creator tienen instagram_business_account.
 */
export async function cuentasDeInstagram(token) {
  const paginas = await llamar('/me/accounts', {
    token,
    params: { fields: 'id,name,access_token,instagram_business_account{id,username,name}' },
  });

  return (paginas.data ?? [])
    .filter((p) => p.instagram_business_account)
    .map((p) => ({
      id: p.instagram_business_account.id,
      nombre: p.instagram_business_account.name ?? p.name,
      usuario: p.instagram_business_account.username,
      pageId: p.id,
      // El token de la página es el que sirve para publicar.
      token: p.access_token,
    }));
}

/**
 * Las cuentas publicitarias que administra el usuario.
 *
 * Cuelgan del usuario y no de la página, así que esto va con el token del
 * usuario. Sirve para que cada cliente tenga la suya elegida de una lista, en
 * vez de tener que averiguar y copiar un id a mano.
 */
export async function cuentasPublicitarias(token) {
  const r = await llamar('/me/adaccounts', {
    token,
    params: { fields: 'id,account_id,name,account_status,currency', limit: 100 },
  });

  return (r.data ?? []).map((c) => ({
    id: c.id, // viene como "act_123456"
    nombre: c.name ?? c.account_id,
    moneda: c.currency ?? null,
    // 1 es activa; el resto son deshabilitada, en revisión, cerrada…
    activa: c.account_status === 1,
  }));
}

/** Espera a que el contenedor termine de procesarse (necesario en videos). */
async function esperarContenedor(id, token, { intentos = 30, esperaMs = 4000 } = {}) {
  for (let i = 0; i < intentos; i++) {
    const r = await llamar(`/${id}`, { token, params: { fields: 'status_code,status' } });
    if (r.status_code === 'FINISHED') return;
    if (r.status_code === 'ERROR' || r.status_code === 'EXPIRED') {
      throw new ErrorMeta(`Meta no pudo procesar el archivo (${r.status_code})`, r);
    }
    await new Promise((r2) => setTimeout(r2, esperaMs));
  }
  throw new ErrorMeta('El archivo tardó demasiado en procesarse en Meta');
}

/** Crea un contenedor para una pieza suelta. */
async function crearContenedor({ igUserId, token, archivo, caption, tipo, esHijoDeCarrusel }) {
  const params = { caption };

  if (archivo.esVideo) {
    params.video_url = archivo.url;
    // Los videos sueltos van como REELS; en historias, STORIES.
    params.media_type = tipo === 'historia' ? 'STORIES' : 'REELS';
  } else {
    params.image_url = archivo.url;
    if (tipo === 'historia') params.media_type = 'STORIES';
  }

  if (esHijoDeCarrusel) {
    params.is_carousel_item = 'true';
    delete params.caption;
    delete params.media_type;
  }

  const r = await llamar(`/${igUserId}/media`, { method: 'POST', token, params });
  return r.id;
}

/**
 * Publica en Instagram.
 *
 * @param {object} p
 * @param {string} p.igUserId  id de la cuenta de Instagram
 * @param {string} p.token     token de la página
 * @param {'post'|'reel'|'carrusel'|'historia'} p.tipo
 * @param {{url:string, esVideo:boolean}[]} p.archivos
 * @param {string} [p.caption]
 * @returns {Promise<{id: string}>} id de la publicación en Instagram
 */
export async function publicarEnInstagram({ igUserId, token, tipo, archivos, caption }) {
  if (!archivos?.length) throw new ErrorMeta('No hay archivo para publicar');

  let contenedor;

  if (tipo === 'carrusel' && archivos.length > 1) {
    // Cada pieza es un hijo; después se agrupan en un contenedor de carrusel.
    const hijos = [];
    for (const archivo of archivos.slice(0, 10)) {
      const id = await crearContenedor({
        igUserId,
        token,
        archivo,
        tipo,
        esHijoDeCarrusel: true,
      });
      if (archivo.esVideo) await esperarContenedor(id, token);
      hijos.push(id);
    }
    const r = await llamar(`/${igUserId}/media`, {
      method: 'POST',
      token,
      params: { media_type: 'CAROUSEL', children: hijos.join(','), caption },
    });
    contenedor = r.id;
  } else {
    contenedor = await crearContenedor({
      igUserId,
      token,
      archivo: archivos[0],
      caption,
      tipo,
    });
    if (archivos[0].esVideo) await esperarContenedor(contenedor, token);
  }

  const publicado = await llamar(`/${igUserId}/media_publish`, {
    method: 'POST',
    token,
    params: { creation_id: contenedor },
  });

  return { id: publicado.id };
}

export { ErrorMeta };
