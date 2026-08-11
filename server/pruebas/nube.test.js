// Guardar los archivos en la nube en vez de en el disco.
//
// Del otro lado hay un S3 de mentira: no hacen falta credenciales reales para
// comprobar lo que importa —que el archivo salga del disco, llegue entero, y
// que la dirección de siempre lo siga encontrando—. Y también lo otro: que si
// la nube falla, se diga, en vez de dar por buena una pieza que no está.
//
//   node --test pruebas/

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmp = mkdtempSync(join(tmpdir(), 'demm-nube-'));
const dirArchivos = join(tmp, 'archivos');

/* --------------------------- el S3 de mentira ---------------------------- */

/** Lo que le fue llegando, para poder mirarlo después. */
const guardado = new Map();
let recibidos = [];
/** Qué responder. Se cambia en la prueba que necesita un error. */
let responderCon = { estado: 200, cuerpo: '' };

const s3 = createServer((req, res) => {
  const pedazos = [];
  req.on('data', (d) => pedazos.push(d));
  req.on('end', () => {
    const cuerpo = Buffer.concat(pedazos);
    recibidos.push({
      metodo: req.method,
      ruta: req.url,
      autorizacion: req.headers.authorization ?? '',
      resumen: req.headers['x-amz-content-sha256'] ?? '',
      fecha: req.headers['x-amz-date'] ?? '',
      tipo: req.headers['content-type'] ?? '',
      cuerpo,
    });
    if (responderCon.estado === 200 && req.method === 'PUT') guardado.set(req.url, cuerpo);
    res.writeHead(responderCon.estado).end(responderCon.cuerpo);
  });
});

await new Promise((r) => s3.listen(0, r));
const puertoS3 = s3.address().port;

/* ------------------------------ el servidor ------------------------------ */

process.env.DB_PATH = join(tmp, 'test.db');
process.env.FILES_PATH = dirArchivos;
process.env.PUBLIC_URL = 'https://ejemplo.test';
process.env.NODE_ENV = 'test';
process.env.USUARIO_CREADORA = 'demm';
process.env.CLAVE_CREADORA = 'clave-de-prueba';

process.env.R2_ENDPOINT = `http://127.0.0.1:${puertoS3}`;
process.env.R2_BUCKET = 'demm-archivos';
process.env.R2_ACCESS_KEY_ID = 'una-clave';
process.env.R2_SECRET_ACCESS_KEY = 'un-secreto';
process.env.R2_PUBLIC_URL = 'https://archivos.demm.test';

const { app } = await import('../src/index.js');
const { db } = await import('../src/db.js');
const { hayNube } = await import('../src/nube.js');

let servidor;
let base;
let sesion;

before(async () => {
  servidor = app.listen(0);
  await new Promise((r) => servidor.once('listening', r));
  base = `http://localhost:${servidor.address().port}`;

  const r = await fetch(`${base}/api/auth/entrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario: 'demm', clave: 'clave-de-prueba' }),
  });
  sesion = (await r.json()).token;
});

after(() => {
  servidor?.close();
  s3.close();
  rmSync(tmp, { recursive: true, force: true });
});

const auth = (extra = {}) => ({ Authorization: `Bearer ${sesion}`, ...extra });
const huella = (b) => createHash('sha256').update(b).digest('hex');

function inventarVideo(bytes) {
  const b = Buffer.alloc(bytes);
  for (let i = 0; i < bytes; i++) b[i] = (i * 17 + 3) & 0xff;
  return b;
}

async function subirDeUna(nombre, contenido, tipo = 'video/mp4') {
  const form = new FormData();
  form.append('archivo', new Blob([contenido], { type: tipo }), nombre);
  return fetch(`${base}/api/media`, { method: 'POST', headers: auth(), body: form });
}

/** Los archivos que quedaron en el disco, sin contar los parciales. */
const enElDisco = () => readdirSync(dirArchivos).filter((n) => !n.startsWith('.'));

describe('con la nube configurada', () => {
  it('está prendida', () => {
    assert.equal(hayNube(), true);
  });

  it('el archivo va a la nube y no queda en el disco', async () => {
    recibidos = [];
    responderCon = { estado: 200, cuerpo: '' };

    const video = inventarVideo(120_000);
    const r = await subirDeUna('reel.mp4', video);
    assert.equal(r.status, 200);

    const { id, url } = await r.json();

    const puesto = recibidos.find((x) => x.metodo === 'PUT');
    assert.ok(puesto, 'tendría que haberlo mandado a la nube');
    assert.equal(huella(puesto.cuerpo), huella(video), 'llegó distinto de lo que se mandó');
    assert.match(puesto.ruta, /^\/demm-archivos\//, 'va adentro del bucket');

    assert.deepEqual(enElDisco(), [], 'no puede quedar ocupando el disco');

    // Y la dirección que se le da a la app sigue siendo la nuestra.
    assert.equal(url, `https://ejemplo.test/archivos/${id}`);
  });

  it('la firma va armada como espera S3', () => {
    const puesto = recibidos.find((x) => x.metodo === 'PUT');
    assert.match(puesto.autorizacion, /^AWS4-HMAC-SHA256 Credential=una-clave\//);
    assert.match(puesto.autorizacion, /SignedHeaders=[^,]*x-amz-content-sha256/);
    assert.match(puesto.autorizacion, /Signature=[0-9a-f]{64}$/);
    assert.match(puesto.fecha, /^\d{8}T\d{6}Z$/);
    assert.equal(puesto.resumen, huella(puesto.cuerpo), 'el resumen tiene que ser del contenido');
  });

  it('abrir la pieza lleva al archivo en la nube', async () => {
    const { id } = await (await subirDeUna('otra.mp4', inventarVideo(5000))).json();

    const r = await fetch(`${base}/archivos/${id}`, { redirect: 'manual' });
    assert.equal(r.status, 302);
    assert.match(r.headers.get('location'), /^https:\/\/archivos\.demm\.test\//);
  });

  it('un video grande, subido en pedazos, también termina en la nube', async () => {
    recibidos = [];
    const video = inventarVideo(9 * 1024 * 1024 + 777);

    const inicio = await fetch(`${base}/api/media/iniciar`, {
      method: 'POST',
      headers: auth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ nombre: 'largo.mp4', tipo: 'video/mp4', tamano: video.length }),
    });
    const { subida, pedazo } = await inicio.json();

    for (let desde = 0; desde < video.length; desde += pedazo) {
      const form = new FormData();
      form.append('subida', subida);
      form.append('desde', String(desde));
      form.append('parte', new Blob([video.subarray(desde, desde + pedazo)]), 'parte');
      const res = await fetch(`${base}/api/media/parte`, {
        method: 'POST',
        headers: auth(),
        body: form,
      });
      assert.equal(res.status, 200);
    }

    const fin = await fetch(`${base}/api/media/terminar`, {
      method: 'POST',
      headers: auth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ subida }),
    });
    assert.equal(fin.status, 200);

    const puesto = recibidos.find((x) => x.metodo === 'PUT');
    assert.equal(huella(puesto.cuerpo), huella(video), 'el archivo se armó mal antes de subirlo');
    assert.deepEqual(enElDisco(), [], 'el parcial tampoco puede quedar');
  });
});

describe('cuando la nube falla', () => {
  it('se avisa, y no queda una pieza a medias', async () => {
    responderCon = { estado: 403, cuerpo: '<Error>AccessDenied</Error>' };
    const antesEnLaBase = db.prepare('SELECT COUNT(*) n FROM archivos').get().n;

    const r = await subirDeUna('rechazado.mp4', inventarVideo(3000));
    assert.equal(r.status, 502);
    assert.match((await r.json()).error, /403/);

    assert.equal(
      db.prepare('SELECT COUNT(*) n FROM archivos').get().n,
      antesEnLaBase,
      'no puede quedar anotado un archivo que no se guardó'
    );
    assert.deepEqual(enElDisco(), [], 'ni ocupando el disco');

    responderCon = { estado: 200, cuerpo: '' };
  });
});
