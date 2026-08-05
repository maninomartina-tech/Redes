import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ahora, db, uid } from './db.js';
import { datosPersistentes, permisos, publicUrl, soloLectura } from './config.js';
import { cuentasDeInstagram, tokenDesdeCodigo, tokenLargo } from './meta.js';
import { campanasDeAds, metricasDeCuenta, metricasDePublicaciones } from './insights.js';
import { iniciarProgramador, procesarCola } from './programador.js';
import { hayIA, redactar } from './ia.js';
import {
  PARA_LA_CREADORA,
  avisarCambiosDeLaCreadora,
  listar as listarNovedades,
  marcarVistas,
} from './novedades.js';
import {
  borrarPortal,
  cerrarSesion,
  comentarDesdePortal,
  crearPortal,
  datosDelPortal,
  decidirDesdePortal,
  aprobarVariasDesdePortal,
  clienteDelPortal,
  cuentasDelPortal,
  guardarEspacio,
  hayClave,
  iniciarSesion,
  leerEspacio,
  usuarioCreadora,
  listarPortales,
  sesionValida,
} from './espacio.js';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dirArchivos = process.env.FILES_PATH ?? resolve(raiz, 'archivos');
mkdirSync(dirArchivos, { recursive: true });

const app = express();
app.use(express.json({ limit: '25mb' }));

// La app corre en otro puerto durante el desarrollo.
app.use((req, res, next) => {
  const origen = process.env.APP_ORIGIN ?? '*';
  res.setHeader('Access-Control-Allow-Origin', origen);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

/* ------------------------------- archivos ------------------------------- */

const subida = multer({
  storage: multer.diskStorage({
    destination: dirArchivos,
    filename: (_req, file, cb) => cb(null, `${uid('ar')}${extname(file.originalname)}`),
  }),
  limits: { fileSize: 200 * 1024 * 1024 },
});

app.post('/api/media', subida.single('archivo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Falta el archivo.' });

  const id = req.file.filename;
  db.prepare(
    `INSERT INTO archivos (id, nombre, tipo, ruta, tamano, creado_en)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, req.file.originalname, req.file.mimetype, req.file.path, req.file.size, ahora());

  res.json({ id, url: `${publicUrl()}/archivos/${id}` });
});

// Meta descarga las piezas desde acá, por eso es público y sin autenticación.
/**
 * Servir un archivo subido.
 *
 * Los videos se piden por pedazos, no enteros: el navegador manda un `Range`
 * y espera un 206 con solo ese tramo. Safari —o sea todo iPhone— directamente
 * se niega a reproducir un video de un servidor que ignora eso: le aparece el
 * reproductor vacío, como si el archivo estuviera roto. Y sin esto tampoco se
 * puede adelantar un video en ningún navegador.
 */
app.get('/archivos/:id', (req, res) => {
  const archivo = db.prepare('SELECT * FROM archivos WHERE id = ?').get(req.params.id);
  if (!archivo || !existsSync(archivo.ruta)) return res.sendStatus(404);

  const total = statSync(archivo.ruta).size;

  res.setHeader('Content-Type', archivo.tipo);
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  // Sin este encabezado, el navegador ni se molesta en pedir por pedazos.
  res.setHeader('Accept-Ranges', 'bytes');

  const pedido = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
  if (!pedido) {
    res.setHeader('Content-Length', total);
    return createReadStream(archivo.ruta).pipe(res);
  }

  // "bytes=-500" son los últimos 500; "bytes=500-" es de ahí hasta el final.
  const [, desdeCrudo, hastaCrudo] = pedido;
  const desde = desdeCrudo ? Number(desdeCrudo) : Math.max(total - Number(hastaCrudo), 0);
  const hasta = desdeCrudo && hastaCrudo ? Math.min(Number(hastaCrudo), total - 1) : total - 1;

  if (desde >= total || desde > hasta) {
    res.setHeader('Content-Range', `bytes */${total}`);
    return res.sendStatus(416);
  }

  res.status(206);
  res.setHeader('Content-Range', `bytes ${desde}-${hasta}/${total}`);
  res.setHeader('Content-Length', hasta - desde + 1);
  createReadStream(archivo.ruta, { start: desde, end: hasta }).pipe(res);
});

/* ------------------------------ publicaciones ---------------------------- */

app.post('/api/publicaciones/programar', (req, res) => {
  if (soloLectura()) {
    return res.status(409).json({
      error:
        'El servidor está en modo solo lectura: trae el feed y las métricas, pero no publica. ' +
        'Para activar la publicación automática, poné MODO_SOLO_LECTURA=false.',
    });
  }

  const { postId, accountId, publishAt, archivos, caption, type } = req.body ?? {};

  if (!postId || !accountId || !publishAt || !archivos?.length) {
    return res.status(400).json({
      error: 'Faltan datos: hacen falta el contenido, la cuenta, la fecha y el archivo.',
    });
  }

  const cuenta = db.prepare('SELECT id FROM cuentas WHERE id = ?').get(accountId);
  if (!cuenta) {
    return res.status(400).json({
      error: 'Esa cuenta no está conectada. Conectala desde Cuentas antes de programar.',
    });
  }

  // Un contenido tiene una sola publicación viva: si se reprograma, se pisa.
  db.prepare(
    `UPDATE publicaciones SET estado = 'cancelado', actualizada_en = ?
     WHERE post_id = ? AND estado IN ('programado','error')`
  ).run(ahora(), postId);

  const id = uid('pub');
  db.prepare(
    `INSERT INTO publicaciones
       (id, post_id, cuenta_id, tipo, caption, archivos, publicar_en,
        estado, intentos, creada_en, actualizada_en)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'programado', 0, ?, ?)`
  ).run(
    id,
    postId,
    accountId,
    type ?? 'post',
    caption ?? '',
    JSON.stringify(archivos),
    new Date(publishAt).toISOString(),
    ahora(),
    ahora()
  );

  res.json({ id, externalId: id, estado: 'programado', publicarEn: publishAt });
});

app.get('/api/publicaciones', (req, res) => {
  const filas = db
    .prepare('SELECT * FROM publicaciones ORDER BY publicar_en DESC LIMIT 200')
    .all();
  res.json(filas);
});

app.get('/api/publicaciones/:id', (req, res) => {
  const fila = db.prepare('SELECT * FROM publicaciones WHERE id = ?').get(req.params.id);
  if (!fila) return res.sendStatus(404);
  res.json(fila);
});

app.delete('/api/publicaciones/:id', (req, res) => {
  const fila = db.prepare('SELECT * FROM publicaciones WHERE id = ?').get(req.params.id);
  if (!fila) return res.sendStatus(404);
  if (fila.estado === 'publicado') {
    return res
      .status(409)
      .json({ error: 'Ya se publicó: hay que borrarla desde Instagram.' });
  }
  db.prepare(
    `UPDATE publicaciones SET estado = 'cancelado', actualizada_en = ? WHERE id = ?`
  ).run(ahora(), req.params.id);
  res.json({ ok: true });
});

/** Fuerza el procesamiento de la cola (útil para probar). */
app.post('/api/publicaciones/procesar-ahora', async (_req, res) => {
  res.json(await procesarCola());
});

/* --------------------------------- cuentas ------------------------------- */

app.get('/api/cuentas', (_req, res) => {
  const filas = db
    .prepare('SELECT id, nombre, usuario, page_id, expira_en, creada_en FROM cuentas')
    .all();
  res.json(filas);
});

app.delete('/api/cuentas/:id', (req, res) => {
  db.prepare('DELETE FROM cuentas WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

const redirectUri = () => `${publicUrl()}/api/auth/meta/callback`;

/** Paso 1: manda al usuario a autorizar la app en Meta. */
app.get('/api/auth/meta/login', (_req, res) => {
  if (!process.env.META_APP_ID) {
    return res.status(500).send('Falta configurar META_APP_ID en el archivo .env');
  }
  const url = new URL('https://www.facebook.com/v21.0/dialog/oauth');
  url.searchParams.set('client_id', process.env.META_APP_ID);
  url.searchParams.set('redirect_uri', redirectUri());
  url.searchParams.set('scope', permisos().join(','));
  res.redirect(url.toString());
});

/** Paso 2: Meta vuelve con un código; lo cambiamos por el token y guardamos. */
app.get('/api/auth/meta/callback', async (req, res) => {
  try {
    const { code, error_description } = req.query;
    if (!code) return res.status(400).send(error_description ?? 'Meta no devolvió el código.');

    const corto = await tokenDesdeCodigo(String(code), redirectUri());
    const largo = await tokenLargo(corto.access_token);
    const cuentas = await cuentasDeInstagram(largo.access_token);

    if (cuentas.length === 0) {
      return res
        .status(400)
        .send(
          'No encontramos cuentas de Instagram Business vinculadas a tus páginas de Facebook. ' +
            'La cuenta tiene que ser Business o Creator y estar vinculada a una página.'
        );
    }

    const expira = largo.expires_in
      ? new Date(Date.now() + largo.expires_in * 1000).toISOString()
      : null;

    const guardar = db.prepare(
      `INSERT INTO cuentas (id, nombre, usuario, page_id, token, expira_en, creada_en)
       VALUES (@id, @nombre, @usuario, @pageId, @token, @expira, @creada)
       ON CONFLICT(id) DO UPDATE SET
         nombre = @nombre, usuario = @usuario, page_id = @pageId,
         token = @token, expira_en = @expira`
    );
    cuentas.forEach((c) =>
      guardar.run({ ...c, expira, creada: ahora() })
    );

    const destino = process.env.APP_ORIGIN ?? '/';
    res.send(
      `<!doctype html><meta charset="utf-8">
       <p style="font:16px system-ui;padding:2rem">
         Listo, se conectaron ${cuentas.length} cuenta(s).
         <a href="${destino}">Volver a la app</a>
       </p>`
    );
  } catch (e) {
    console.error(e);
    res.status(500).send(`No se pudo conectar con Meta: ${e.message}`);
  }
});

/* --------------------- espacio de trabajo y portales --------------------- */

/** Deja pasar solo a la creadora. */
function soloCreadora(req, res, next) {
  const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  if (!sesionValida(token)) {
    return res.status(401).json({ error: 'Sesión vencida. Volvé a entrar con tu clave.' });
  }
  next();
}

app.get('/api/auth/estado', (_req, res) => {
  res.json({ clave: hayClave() });
});

/**
 * Aviso para la puesta en marcha: si nadie definió USUARIO_CREADORA, conviene
 * saber con cuál se entra en vez de adivinarlo.
 */
app.get('/api/auth/usuario', soloCreadora, (_req, res) => {
  res.json({ usuario: usuarioCreadora() });
});

app.post('/api/auth/entrar', (req, res) => {
  if (!hayClave()) {
    return res.status(501).json({
      error: 'Falta definir CLAVE_CREADORA en el servidor.',
    });
  }
  const token = iniciarSesion(req.body?.usuario, req.body?.clave);
  // A propósito no se aclara cuál de los dos está mal.
  if (!token) return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  res.json({ token });
});

app.post('/api/auth/salir', soloCreadora, (req, res) => {
  cerrarSesion((req.headers.authorization ?? '').replace(/^Bearer /, ''));
  res.json({ ok: true });
});

/** Todo el espacio de trabajo. */
app.get('/api/espacio', soloCreadora, (_req, res) => {
  res.json(leerEspacio());
});

app.put('/api/espacio', soloCreadora, (req, res) => {
  if (!req.body?.datos) return res.status(400).json({ error: 'Faltan los datos.' });

  // Se mira contra lo que había para avisarle a cada cliente lo suyo: la app
  // guarda todo el espacio junto, así que este es el único lugar donde se
  // puede saber qué cambió de verdad.
  const { datos: anterior } = leerEspacio();
  const version = guardarEspacio(req.body.datos);
  try {
    avisarCambiosDeLaCreadora(anterior, req.body.datos);
  } catch {
    // Un aviso que falla no puede tumbar el guardado.
  }
  res.json({ ok: true, version });
});

/* ------------------------------ novedades -------------------------------- */

app.get('/api/novedades', soloCreadora, (_req, res) => {
  res.json({ novedades: listarNovedades(PARA_LA_CREADORA) });
});

app.post('/api/novedades/vistas', soloCreadora, (_req, res) => {
  marcarVistas(PARA_LA_CREADORA);
  res.json({ ok: true });
});

/* --------- links de cliente (los administra solo la creadora) ------------ */

app.get('/api/portales', soloCreadora, (_req, res) => {
  res.json(listarPortales());
});

app.post('/api/portales/:clienteId', soloCreadora, (req, res) => {
  res.json({ token: crearPortal(req.params.clienteId) });
});

app.delete('/api/portales/:clienteId', soloCreadora, (req, res) => {
  borrarPortal(req.params.clienteId);
  res.json({ ok: true });
});

/* ------------- lo que ve el cliente con su link (sin clave) -------------- */

app.get('/api/portal/:token', (req, res) => {
  // `cuenta` es para las cuentas vinculadas: la misma persona cambiando de un
  // Instagram a otro. El servidor comprueba que esté vinculada de verdad.
  const datos = datosDelPortal(req.params.token, req.query.cuenta);
  if (!datos) return res.status(404).json({ error: 'Este link no es válido o fue dado de baja.' });
  res.json(datos);
});

app.post('/api/portal/:token/comentario', (req, res) => {
  const r = comentarDesdePortal(req.params.token, req.body?.postId, req.body?.texto);
  if (!r?.ok) return res.status(400).json(r ?? { error: 'No se pudo comentar.' });
  res.json(r);
});

/** Las cuentas que alcanza este link: la suya y las vinculadas. */
function cuentasDelLink(token) {
  const cliente = clienteDelPortal(token);
  if (!cliente) return null;
  const { datos } = leerEspacio();
  const permitidas = cuentasDelPortal(datos, cliente);
  return permitidas.length ? permitidas.map((c) => c.id) : [cliente];
}

app.get('/api/portal/:token/novedades', (req, res) => {
  const cuentas = cuentasDelLink(req.params.token);
  if (!cuentas) return res.status(404).json({ error: 'Este link no es válido.' });

  // Con cuentas vinculadas es una sola persona: le llegan las de todas sus
  // cuentas, ordenadas juntas. Si no, tendría que ir cambiando de cuenta para
  // enterarse de que hay algo en la otra.
  const novedades = cuentas
    .flatMap((c) => listarNovedades(c))
    .sort((a, b) => b.creada_en.localeCompare(a.creada_en));
  res.json({ novedades });
});

app.post('/api/portal/:token/novedades/vistas', (req, res) => {
  const cuentas = cuentasDelLink(req.params.token);
  if (!cuentas) return res.status(404).json({ error: 'Este link no es válido.' });
  cuentas.forEach((c) => marcarVistas(c));
  res.json({ ok: true });
});

app.post('/api/portal/:token/aprobar-todo', (req, res) => {
  const r = aprobarVariasDesdePortal(req.params.token, req.body?.postIds);
  if (!r?.ok) return res.status(400).json(r ?? { error: 'No se pudo aprobar.' });
  res.json(r);
});

app.post('/api/portal/:token/decision', (req, res) => {
  const r = decidirDesdePortal(req.params.token, req.body?.postId, req.body?.decision);
  if (!r?.ok) return res.status(400).json(r ?? { error: 'No se pudo guardar.' });
  res.json(r);
});

/* ------------------------------ sincronización --------------------------- */

/** Rango por defecto: los últimos seis meses. */
function rango(req) {
  const hasta = req.query.hasta ? new Date(String(req.query.hasta)) : new Date();
  const desde = req.query.desde
    ? new Date(String(req.query.desde))
    : new Date(new Date(hasta).setMonth(hasta.getMonth() - 6));
  return { desde: desde.toISOString(), hasta: hasta.toISOString() };
}

function cuentaO404(id, res) {
  const cuenta = db.prepare('SELECT * FROM cuentas WHERE id = ?').get(id);
  if (!cuenta) {
    res.status(404).json({ error: 'Esa cuenta no está vinculada en el servidor.' });
    return null;
  }
  return cuenta;
}

/** Métricas de la cuenta, mes a mes. */
app.get('/api/insights/cuenta/:id', async (req, res) => {
  const cuenta = cuentaO404(req.params.id, res);
  if (!cuenta) return;
  try {
    const { desde, hasta } = rango(req);
    const r = await metricasDeCuenta({
      igUserId: cuenta.id,
      token: cuenta.token,
      desde,
      hasta,
    });
    res.json(r);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

/** Métricas de las publicaciones recientes. */
app.get('/api/insights/publicaciones/:id', async (req, res) => {
  const cuenta = cuentaO404(req.params.id, res);
  if (!cuenta) return;
  try {
    const r = await metricasDePublicaciones({
      igUserId: cuenta.id,
      token: cuenta.token,
      limite: Number(req.query.limite ?? 30),
    });
    res.json(r);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

/** Campañas de Meta Ads. */
app.get('/api/ads/:cuentaId', async (req, res) => {
  const cuenta = cuentaO404(req.params.cuentaId, res);
  if (!cuenta) return;

  const adAccountId = req.query.adAccountId ?? process.env.META_AD_ACCOUNT_ID;
  if (!adAccountId) {
    return res.status(400).json({
      error:
        'Falta el id de la cuenta publicitaria. Cargalo en META_AD_ACCOUNT_ID o pasalo como adAccountId.',
    });
  }

  try {
    const { desde, hasta } = rango(req);
    const campanas = await campanasDeAds({
      adAccountId: String(adAccountId),
      token: cuenta.token,
      desde,
      hasta,
    });
    res.json({ campanas });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

/* ----------------------------- análisis con IA --------------------------- */

app.post('/api/ai/analyze', soloCreadora, async (req, res) => {
  const clave = process.env.ANTHROPIC_API_KEY;
  if (!clave) {
    return res.status(501).json({ error: 'Falta configurar ANTHROPIC_API_KEY.' });
  }
  try {
    const { analysis } = req.body ?? {};
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': clave,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5',
        max_tokens: 900,
        messages: [
          {
            role: 'user',
            content:
              'Sos la analista de una agencia de redes. Escribí en español rioplatense, ' +
              'directo y sin vueltas, un informe corto para presentarle al cliente. ' +
              'Nada de listas larguísimas: 2 párrafos y 3 recomendaciones concretas.\n\n' +
              `Datos de la campaña:\n${JSON.stringify(analysis, null, 2)}`,
          },
        ],
      }),
    });
    const datos = await r.json();
    if (!r.ok) throw new Error(datos?.error?.message ?? 'Error de la API de Claude');
    res.json({ text: datos.content?.map((c) => c.text).join('\n') ?? '' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** Opciones para una parte del contenido: idea, guion, copy o hashtags. */
app.post('/api/ai/redactar', soloCreadora, async (req, res) => {
  if (!hayIA()) {
    return res.status(501).json({
      error:
        'Falta la clave de IA. Se carga en ANTHROPIC_API_KEY: en Render está en ' +
        'Environment, dentro del servicio.',
    });
  }
  try {
    const { parte, cliente, post, instruccion } = req.body ?? {};
    res.json({ opciones: await redactar({ parte, cliente, post, instruccion }) });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

/* ---------------------------------- salud -------------------------------- */

app.get('/api/salud', (_req, res) => {
  res.json({
    ok: true,
    metaConfigurado: Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET),
    urlPublica: publicUrl() || null,
    adsConfigurado: Boolean(process.env.META_AD_ACCOUNT_ID),
    soloLectura: soloLectura(),
    claveDefinida: hayClave(),
    iaConfigurada: hayIA(),
    // Si esto viene en false, todo lo cargado se borra en el próximo reinicio.
    datosPersistentes: datosPersistentes(),
    cuentasConectadas: db.prepare('SELECT COUNT(*) n FROM cuentas').get().n,
  });
});

const PORT = process.env.PORT ?? 4000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Servidor de Demm en http://localhost:${PORT}`);
    const url = publicUrl();
    if (url) {
      console.log(`Dirección pública: ${url}`);
    } else {
      console.warn(
        '⚠ Falta la dirección pública. Meta necesita desde dónde descargar los archivos.\n' +
          '  Definí PUBLIC_URL, o usá `npm run tunel` para probar en tu máquina.'
      );
    }
    if (!datosPersistentes()) {
      console.warn(
        '⚠ LOS DATOS SE VAN A BORRAR.\n' +
          '  Esta plataforma rehace el disco de la aplicación en cada despliegue y en\n' +
          '  cada reinicio. La base está adentro de ese disco, así que la planificación,\n' +
          '  las piezas subidas y los links de tus clientes desaparecen sin aviso.\n' +
          '  Solución: montá un disco y definí DB_PATH y FILES_PATH apuntando adentro\n' +
          '  (por ejemplo /datos/demm.db y /datos/archivos). Ver render.yaml.'
      );
    }
    if (!hayClave()) {
      console.warn(
        '⚠ Falta CLAVE_CREADORA: el espacio compartido queda apagado.\n' +
          '  La app sigue andando contra el navegador, pero no vas a poder entrar\n' +
          '  desde otro dispositivo ni darles link a tus clientes.'
      );
    }
    if (soloLectura()) {
      console.log(
        'Modo solo lectura: se traen el feed y las métricas, no se publica nada.'
      );
    } else {
      iniciarProgramador();
    }
  });
}

export { app };
