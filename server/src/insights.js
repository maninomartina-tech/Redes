// ---------------------------------------------------------------------------
// Métricas desde Meta: cuenta, publicaciones y campañas de ADS.
//
// Todo lo que se trae acá se corresponde con lo que la app ya muestra cargado
// a mano, así que la sincronización solo completa esos mismos campos.
//
// Ojo: los nombres de las métricas de Instagram cambian entre versiones de la
// API. Si Meta rechaza alguna, se informa el error tal cual en vez de devolver
// datos incompletos sin avisar.
// ---------------------------------------------------------------------------

const API = `https://graph.facebook.com/${process.env.META_API_VERSION ?? 'v21.0'}`;

async function pedir(ruta, params, token) {
  const url = new URL(`${API}${ruta}`);
  Object.entries({ ...params, access_token: token }).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });

  const res = await fetch(url);
  const datos = await res.json().catch(() => ({}));
  if (!res.ok || datos.error) {
    const e = datos.error ?? {};
    throw new Error(e.error_user_msg || e.message || `Meta respondió ${res.status}`);
  }
  return datos;
}

const claveMes = (iso) => iso.slice(0, 7);

/**
 * Métricas de la cuenta agrupadas por mes.
 *
 * Meta devuelve estas series por día, así que sumamos alcance e interacción del
 * mes y nos quedamos con el último valor de seguidores (que es un total, no
 * algo acumulable).
 */
export async function metricasDeCuenta({ igUserId, token, desde, hasta }) {
  const since = Math.floor(new Date(desde).getTime() / 1000);
  const until = Math.floor(new Date(hasta).getTime() / 1000);

  const porMes = new Map();
  const tocar = (mes) => {
    if (!porMes.has(mes)) {
      porMes.set(mes, { month: mes, followers: 0, reach: 0, interactions: 0, profileVisits: 0 });
    }
    return porMes.get(mes);
  };

  const avisos = [];

  // Series diarias. Se piden por separado para que, si Meta rechaza una,
  // el resto igual llegue.
  const series = [
    { metric: 'reach', campo: 'reach', modo: 'sumar' },
    { metric: 'follower_count', campo: 'followers', modo: 'ultimo' },
    { metric: 'profile_views', campo: 'profileVisits', modo: 'sumar' },
    { metric: 'total_interactions', campo: 'interactions', modo: 'sumar' },
  ];

  for (const { metric, campo, modo } of series) {
    try {
      const r = await pedir(
        `/${igUserId}/insights`,
        { metric, period: 'day', since, until, metric_type: 'total_value' },
        token
      );
      for (const serie of r.data ?? []) {
        for (const punto of serie.values ?? []) {
          if (punto.value == null || !punto.end_time) continue;
          const mes = tocar(claveMes(punto.end_time));
          if (modo === 'sumar') mes[campo] += Number(punto.value) || 0;
          else mes[campo] = Number(punto.value) || mes[campo];
        }
      }
    } catch (e) {
      avisos.push(`No se pudo traer "${metric}": ${e.message}`);
    }
  }

  // Los seguidores del mes en curso los tomamos del perfil, que siempre
  // devuelve el total actual aunque falle la serie diaria.
  try {
    const perfil = await pedir(`/${igUserId}`, { fields: 'followers_count' }, token);
    if (perfil.followers_count != null) {
      const mesActual = tocar(claveMes(new Date().toISOString()));
      mesActual.followers = Number(perfil.followers_count);
    }
  } catch (e) {
    avisos.push(`No se pudo leer la cantidad de seguidores: ${e.message}`);
  }

  const meses = [...porMes.values()]
    .filter((m) => m.followers > 0 || m.reach > 0 || m.interactions > 0)
    .sort((a, b) => a.month.localeCompare(b.month));

  return { meses, avisos };
}

/** Métricas de cada publicación reciente. */
export async function metricasDePublicaciones({ igUserId, token, limite = 30 }) {
  const avisos = [];
  let medios;
  try {
    medios = await pedir(
      `/${igUserId}/media`,
      {
        fields: 'id,caption,media_type,media_product_type,timestamp,permalink,like_count,comments_count',
        limit: limite,
      },
      token
    );
  } catch (e) {
    return { publicaciones: [], avisos: [`No se pudo leer el feed: ${e.message}`] };
  }

  const publicaciones = [];

  for (const m of medios.data ?? []) {
    const esVideo = m.media_type === 'VIDEO' || m.media_product_type === 'REELS';
    const metricas = esVideo
      ? 'reach,saved,shares,views'
      : 'reach,saved,shares';

    let extra = {};
    try {
      const ins = await pedir(`/${m.id}/insights`, { metric: metricas }, token);
      for (const fila of ins.data ?? []) {
        extra[fila.name] = fila.values?.[0]?.value ?? 0;
      }
    } catch (e) {
      avisos.push(`Sin métricas de una publicación (${m.id}): ${e.message}`);
    }

    publicaciones.push({
      externalId: m.id,
      permalink: m.permalink,
      caption: m.caption ?? '',
      tipo: m.media_product_type === 'REELS' ? 'reel' : m.media_type === 'CAROUSEL_ALBUM' ? 'carrusel' : 'post',
      fecha: m.timestamp,
      metrics: {
        likes: m.like_count ?? 0,
        comments: m.comments_count ?? 0,
        reach: extra.reach ?? 0,
        impressions: extra.reach ?? 0,
        saves: extra.saved ?? 0,
        shares: extra.shares ?? 0,
        ...(esVideo ? { views: extra.views ?? 0 } : {}),
      },
    });
  }

  return { publicaciones, avisos };
}

/** Campañas de Meta Ads con su rendimiento. */
export async function campanasDeAds({ adAccountId, token, desde, hasta }) {
  const cuenta = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  const rango = JSON.stringify({
    since: new Date(desde).toISOString().slice(0, 10),
    until: new Date(hasta).toISOString().slice(0, 10),
  });

  const r = await pedir(
    `/${cuenta}/campaigns`,
    {
      fields: [
        'id',
        'name',
        'objective',
        'status',
        'daily_budget',
        'lifetime_budget',
        'start_time',
        'stop_time',
        `insights.time_range(${rango}){spend,impressions,clicks,actions}`,
      ].join(','),
      limit: 50,
    },
    token
  );

  const estados = { ACTIVE: 'activa', PAUSED: 'pausada' };

  return (r.data ?? []).map((c) => {
    const ins = c.insights?.data?.[0] ?? {};
    // "Resultados" son las acciones que cuentan como conversión.
    const conversiones = (ins.actions ?? [])
      .filter((a) =>
        /lead|purchase|complete_registration|onsite_conversion\.messaging/.test(a.action_type)
      )
      .reduce((s, a) => s + Number(a.value || 0), 0);

    // Meta devuelve los presupuestos en centavos.
    const presupuesto =
      Number(c.lifetime_budget || 0) / 100 || Number(c.daily_budget || 0) / 100;

    return {
      externalId: c.id,
      name: c.name,
      objective: c.objective ?? '',
      status: estados[c.status] ?? 'finalizada',
      budget: presupuesto,
      spend: Number(ins.spend || 0),
      impressions: Number(ins.impressions || 0),
      clicks: Number(ins.clicks || 0),
      conversions: conversiones,
      startDate: c.start_time ?? desde,
      endDate: c.stop_time ?? hasta,
    };
  });
}
