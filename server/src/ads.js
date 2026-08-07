// ---------------------------------------------------------------------------
// Cambiar campañas de Meta Ads desde la app.
//
// Esto escribe en la cuenta publicitaria del cliente: pausar una campaña deja
// de mostrarla, y subirle el presupuesto le gasta plata de verdad. Por eso son
// las únicas tres operaciones que hay —prender, apagar y el presupuesto
// diario—, que son las que se hacen todos los días, y por eso ninguna existe
// si no se prendió explícitamente `META_ADS_ESCRITURA`.
//
// Crear una campaña de cero no está: en la API son cuatro objetos encadenados
// (campaña, conjunto, creativo, anuncio) con segmentación, pujas y ubicaciones.
// Eso se arma mucho mejor en el Administrador de anuncios, y una vez armada,
// desde acá se maneja.
// ---------------------------------------------------------------------------

const API = `https://graph.facebook.com/${process.env.META_API_VERSION ?? 'v21.0'}`;

/** Los estados de Meta y los nuestros, que son los mismos de la app. */
const A_META = { activa: 'ACTIVE', pausada: 'PAUSED' };
const DE_META = { ACTIVE: 'activa', PAUSED: 'pausada' };

async function postear(ruta, campos, token) {
  const cuerpo = new URLSearchParams({ ...campos, access_token: token });
  const res = await fetch(`${API}${ruta}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: cuerpo,
  });
  const datos = await res.json().catch(() => ({}));
  if (!res.ok || datos.error) {
    const e = datos.error ?? {};
    throw new Error(e.error_user_msg || e.message || `Meta respondió ${res.status}`);
  }
  return datos;
}

async function leer(ruta, params, token) {
  const url = new URL(`${API}${ruta}`);
  Object.entries({ ...params, access_token: token }).forEach(([k, v]) =>
    url.searchParams.set(k, String(v))
  );
  const res = await fetch(url);
  const datos = await res.json().catch(() => ({}));
  if (!res.ok || datos.error) {
    const e = datos.error ?? {};
    throw new Error(e.error_user_msg || e.message || `Meta respondió ${res.status}`);
  }
  return datos;
}

/**
 * Prende o apaga una campaña.
 *
 * Devuelve el estado que quedó leído de Meta y no el que se pidió: si Meta
 * acepta el cambio pero deja la campaña en otro estado —le pasa cuando el
 * método de pago falló o la campaña terminó— la app tiene que mostrar lo que
 * realmente hay.
 */
export async function cambiarEstadoDeCampana({ campaignId, estado, token }) {
  const pedido = A_META[estado];
  if (!pedido) throw new Error(`No sé poner una campaña en "${estado}".`);

  await postear(`/${campaignId}`, { status: pedido }, token);

  const ahora = await leer(`/${campaignId}`, { fields: 'status,effective_status' }, token);
  return {
    estado: DE_META[ahora.status] ?? 'finalizada',
    /** Lo que Meta dice que está pasando de verdad, que puede diferir. */
    detalle: ahora.effective_status ?? null,
  };
}

/**
 * Cambia el presupuesto diario.
 *
 * Meta maneja la plata en centavos, así que va por 100. Y no toda campaña
 * tiene presupuesto propio: si no usa presupuesto a nivel campaña, la plata
 * está en el conjunto de anuncios y Meta rechaza el cambio. En ese caso se
 * dice dónde está, en vez de devolver el error crudo de la API.
 */
export async function cambiarPresupuestoDiario({ campaignId, diario, token }) {
  const monto = Math.round(Number(diario) * 100);
  if (!Number.isFinite(monto) || monto <= 0) {
    throw new Error('El presupuesto diario tiene que ser un número mayor que cero.');
  }

  try {
    await postear(`/${campaignId}`, { daily_budget: String(monto) }, token);
  } catch (e) {
    if (/budget/i.test(e.message)) {
      throw new Error(
        'Esta campaña no maneja el presupuesto a nivel campaña, sino en el conjunto de ' +
          'anuncios. Cambialo desde el Administrador de anuncios de Meta.'
      );
    }
    throw e;
  }

  const ahora = await leer(`/${campaignId}`, { fields: 'daily_budget' }, token);
  return { diario: Number(ahora.daily_budget || 0) / 100 };
}
