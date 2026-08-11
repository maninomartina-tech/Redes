import { createHash, createHmac } from 'node:crypto';

// ---------------------------------------------------------------------------
// Guardar los archivos en la nube, en vez de en el disco del servidor.
//
// El disco de Render es chico y se paga por GB: unos pocos reels lo llenan, y
// cuando se llena el cliente deja de ver las piezas. Un almacenamiento de
// objetos —Cloudflare R2, o cualquiera que hable el mismo idioma que S3—
// resuelve las dos cosas: espacio de sobra y, en R2, sin cobrar por lo que se
// descarga, que en videos es lo que más pesa en la factura.
//
// Está apagado hasta que se configuran las variables. Sin ellas, todo sigue
// yendo al disco como hasta ahora: la app no depende de esto para funcionar.
//
// La firma se arma a mano en vez de traer el SDK de AWS: son cuarenta líneas
// contra varios megas de dependencia para hacer un PUT.
// ---------------------------------------------------------------------------

const sha256 = (dato) => createHash('sha256').update(dato).digest('hex');
const hmac = (clave, dato) => createHmac('sha256', clave).update(dato).digest();

/** ¿Está configurada la nube? Si falta cualquier dato, no. */
export function hayNube() {
  return Boolean(
    process.env.R2_ENDPOINT &&
      process.env.R2_BUCKET &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY
  );
}

/**
 * La dirección con la que se mira un archivo guardado en la nube.
 *
 * Sale de `R2_PUBLIC_URL`, que es el dominio público del bucket. Sin eso los
 * archivos existen pero nadie los puede abrir, así que se avisa al arrancar.
 */
export function urlEnLaNube(clave) {
  const base = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '');
  return base ? `${base}/${clave}` : null;
}

export function faltaDominioPublico() {
  return hayNube() && !process.env.R2_PUBLIC_URL;
}

/** Cada tramo de la ruta va codificado, pero las barras siguen siendo barras. */
const rutaCodificada = (clave) =>
  `/${process.env.R2_BUCKET}/${clave}`
    .split('/')
    .map((t) => encodeURIComponent(t))
    .join('/');

/**
 * Firma AWS v4, que es lo que entienden S3 y R2.
 *
 * Se firma el pedido entero —método, ruta, encabezados y el resumen del
 * contenido— así el servidor del otro lado puede comprobar que nada se cambió
 * en el camino.
 */
function firmar({ metodo, clave, cuerpo, tipo, fecha }) {
  const endpoint = new URL(process.env.R2_ENDPOINT);
  const region = process.env.R2_REGION ?? 'auto';

  const amzFecha = fecha.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dia = amzFecha.slice(0, 8);
  const resumen = sha256(cuerpo);

  const encabezados = {
    host: endpoint.host,
    'content-type': tipo,
    'x-amz-content-sha256': resumen,
    'x-amz-date': amzFecha,
  };

  const nombres = Object.keys(encabezados).sort();
  const canonicos = nombres.map((n) => `${n}:${encabezados[n]}\n`).join('');
  const firmados = nombres.join(';');

  const pedidoCanonico = [
    metodo,
    rutaCodificada(clave),
    '', // sin parámetros
    canonicos,
    firmados,
    resumen,
  ].join('\n');

  const alcance = `${dia}/${region}/s3/aws4_request`;
  const aFirmar = [
    'AWS4-HMAC-SHA256',
    amzFecha,
    alcance,
    sha256(pedidoCanonico),
  ].join('\n');

  const clave1 = hmac(`AWS4${process.env.R2_SECRET_ACCESS_KEY}`, dia);
  const clave2 = hmac(clave1, region);
  const clave3 = hmac(clave2, 's3');
  const firmaClave = hmac(clave3, 'aws4_request');
  const firma = createHmac('sha256', firmaClave).update(aFirmar).digest('hex');

  return {
    url: `${endpoint.origin}${rutaCodificada(clave)}`,
    encabezados: {
      ...encabezados,
      Authorization:
        `AWS4-HMAC-SHA256 Credential=${process.env.R2_ACCESS_KEY_ID}/${alcance}, ` +
        `SignedHeaders=${firmados}, Signature=${firma}`,
    },
  };
}

/**
 * Sube un archivo y devuelve con qué dirección se lo va a mirar.
 *
 * Tira si no se pudo: quien llama tiene que poder decidir entre reintentar,
 * dejarlo en el disco o avisar. Un archivo que se da por subido y no está es
 * exactamente el problema que esto viene a resolver.
 */
export async function subirALaNube({ clave, cuerpo, tipo }) {
  const { url, encabezados } = firmar({
    metodo: 'PUT',
    clave,
    cuerpo,
    tipo: tipo || 'application/octet-stream',
    fecha: new Date(),
  });

  const res = await fetch(url, { method: 'PUT', headers: encabezados, body: cuerpo });
  if (!res.ok) {
    const detalle = await res.text().catch(() => '');
    throw new Error(
      `El almacenamiento rechazó el archivo (${res.status}). ${detalle.slice(0, 200)}`.trim()
    );
  }

  return urlEnLaNube(clave);
}

/** Borra un archivo. Si ya no está, no es un problema. */
export async function borrarDeLaNube(clave) {
  const { url, encabezados } = firmar({
    metodo: 'DELETE',
    clave,
    cuerpo: '',
    tipo: 'application/octet-stream',
    fecha: new Date(),
  });
  await fetch(url, { method: 'DELETE', headers: encabezados }).catch(() => null);
}
