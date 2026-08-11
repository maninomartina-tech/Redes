// Subir un archivo grande, de a pedazos.
//
// Un video no entra en un solo pedido: en el camino hay intermediarios que
// cortan los pedidos grandes y conexiones de celular que se caen a la mitad.
// Lo que hay que probar es que el archivo llegue **idéntico** —un video al que
// le falta un pedazo no se reproduce— y que cuando algo sale mal se diga, en
// vez de dar por buena una subida incompleta.
//
//   node --test pruebas/

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmp = mkdtempSync(join(tmpdir(), 'demm-subida-'));
process.env.DB_PATH = join(tmp, 'test.db');
process.env.FILES_PATH = join(tmp, 'archivos');
process.env.PUBLIC_URL = 'https://ejemplo.test';
process.env.NODE_ENV = 'test';
process.env.USUARIO_CREADORA = 'demm';
process.env.CLAVE_CREADORA = 'clave-de-prueba';

const { app } = await import('../src/index.js');
const { db } = await import('../src/db.js');

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
  rmSync(tmp, { recursive: true, force: true });
});

const auth = (extra = {}) => ({ Authorization: `Bearer ${sesion}`, ...extra });
const json = (extra = {}) => auth({ 'Content-Type': 'application/json', ...extra });
const huella = (buf) => createHash('sha256').update(buf).digest('hex');

/** Contenido variado: si se pegaran mal los pedazos, la huella cambia. */
function inventarVideo(bytes) {
  const b = Buffer.alloc(bytes);
  for (let i = 0; i < bytes; i++) b[i] = (i * 31 + (i >> 8)) & 0xff;
  return b;
}

const iniciar = (nombre, tipo, tamano) =>
  fetch(`${base}/api/media/iniciar`, {
    method: 'POST',
    headers: json(),
    body: JSON.stringify({ nombre, tipo, tamano }),
  });

async function mandarPedazo(subida, desde, trozo) {
  const form = new FormData();
  form.append('subida', subida);
  form.append('desde', String(desde));
  form.append('parte', new Blob([trozo]), 'parte');
  return fetch(`${base}/api/media/parte`, { method: 'POST', headers: auth(), body: form });
}

const terminar = (subida) =>
  fetch(`${base}/api/media/terminar`, {
    method: 'POST',
    headers: json(),
    body: JSON.stringify({ subida }),
  });

describe('subir en pedazos', () => {
  it('el archivo llega entero y byte a byte igual', async () => {
    // Primero se pregunta de a cuánto, y después se manda un archivo de varios
    // pedazos: con uno solo nunca se manda uno del tamaño declarado, que es
    // justo donde se rompe si el tope y el pedazo son el mismo número.
    const asomo = await iniciar('medir.mp4', 'video/mp4', 1000);
    const { pedazo } = await asomo.json();
    assert.ok(pedazo > 0);

    const video = inventarVideo(pedazo * 2 + 12345); // dos enteros y una punta
    const r = await iniciar('reel.mp4', 'video/mp4', video.length);
    assert.equal(r.status, 200);

    const { subida } = await r.json();

    let enteros = 0;
    for (let desde = 0; desde < video.length; desde += pedazo) {
      const trozo = video.subarray(desde, desde + pedazo);
      if (trozo.length === pedazo) enteros++;
      const res = await mandarPedazo(subida, desde, trozo);
      assert.equal(res.status, 200, `falló el pedazo desde ${desde} (${trozo.length} bytes)`);
    }
    assert.ok(enteros >= 2, 'la prueba tiene que mandar pedazos del tamaño declarado');

    const fin = await terminar(subida);
    assert.equal(fin.status, 200);
    const { id, url } = await fin.json();
    assert.match(url, /^https:\/\/ejemplo\.test\/archivos\//);

    // Lo que quedó en disco tiene que ser exactamente lo que se mandó.
    const fila = db.prepare('SELECT ruta, tamano, nombre FROM archivos WHERE id = ?').get(id);
    assert.equal(fila.tamano, video.length);
    assert.equal(fila.nombre, 'reel.mp4');
    assert.equal(huella(readFileSync(fila.ruta)), huella(video), 'el archivo se armó mal');
  });

  it('y se puede descargar igual que cualquier otro', async () => {
    const video = inventarVideo(300_000);
    const { subida } = await (await iniciar('corto.mp4', 'video/mp4', video.length)).json();
    await mandarPedazo(subida, 0, video);
    const { url } = await (await terminar(subida)).json();

    const bajado = await fetch(url.replace('https://ejemplo.test', base));
    assert.equal(bajado.status, 200);
    assert.equal(huella(Buffer.from(await bajado.arrayBuffer())), huella(video));
  });

  it('reintentar un pedazo que sí había llegado no lo duplica', async () => {
    // Es lo que pasa cuando se corta la respuesta pero el pedazo llegó: el
    // navegador lo reintenta y el archivo terminaría con datos de más.
    const video = inventarVideo(200_000);
    const { subida } = await (await iniciar('repe.mp4', 'video/mp4', video.length)).json();

    await mandarPedazo(subida, 0, video.subarray(0, 100_000));
    const repetido = await mandarPedazo(subida, 0, video.subarray(0, 100_000));
    assert.equal(repetido.status, 200);
    assert.equal((await repetido.json()).recibido, 100_000, 'no puede haberlo sumado dos veces');

    await mandarPedazo(subida, 100_000, video.subarray(100_000));
    const { id } = await (await terminar(subida)).json();

    const fila = db.prepare('SELECT ruta FROM archivos WHERE id = ?').get(id);
    assert.equal(huella(readFileSync(fila.ruta)), huella(video));
  });
});

describe('cuando algo sale mal, se dice', () => {
  it('un archivo más grande que el tope se rechaza antes de subir nada', async () => {
    const r = await iniciar('enorme.mp4', 'video/mp4', 900 * 1024 * 1024);
    assert.equal(r.status, 413);
    const { error } = await r.json();
    assert.match(error, /máximo/i);
    assert.match(error, /\d+ MB/, 'tiene que decir cuánto es el máximo');
  });

  it('no se puede cerrar una subida a la que le faltan pedazos', async () => {
    const video = inventarVideo(500_000);
    const { subida } = await (await iniciar('incompleto.mp4', 'video/mp4', video.length)).json();
    await mandarPedazo(subida, 0, video.subarray(0, 200_000));

    const fin = await terminar(subida);
    assert.equal(fin.status, 400, 'un video al que le falta un pedazo no se reproduce');
    assert.match((await fin.json()).error, /Llegaron/);
  });

  it('los pedazos desordenados se rechazan', async () => {
    const video = inventarVideo(400_000);
    const { subida } = await (await iniciar('salteado.mp4', 'video/mp4', video.length)).json();

    const r = await mandarPedazo(subida, 200_000, video.subarray(200_000));
    assert.equal(r.status, 409);
    assert.equal((await r.json()).recibido, 0, 'tiene que decir por dónde iba');
  });

  it('un pedazo más grande que el tope se explica, no da un 500', async () => {
    const { subida } = await (await iniciar('gordo.mp4', 'video/mp4', 40 * 1024 * 1024)).json();
    const r = await mandarPedazo(subida, 0, inventarVideo(20 * 1024 * 1024));

    assert.notEqual(r.status, 500, 'un 500 con un stack no le sirve a nadie');
    assert.equal(r.status, 413);
    assert.match((await r.json()).error, /MB/);
  });

  it('una subida inventada no escribe nada', async () => {
    for (const id of ['../../fuera', 'sub_../escape', 'cualquiera', '']) {
      const r = await mandarPedazo(id, 0, Buffer.from('hola'));
      assert.ok(r.status === 400 || r.status === 409, `${id} tendría que rechazarse`);
    }
  });
});

describe('lo que no se puede hacer sin la clave', () => {
  it('ni subir un archivo de una', async () => {
    const form = new FormData();
    form.append('archivo', new Blob([inventarVideo(1000)]), 'x.mp4');
    const r = await fetch(`${base}/api/media`, { method: 'POST', body: form });
    assert.equal(r.status, 401, 'el disco es de ella: no lo puede llenar cualquiera');
  });

  it('ni empezar una subida en pedazos', async () => {
    const r = await fetch(`${base}/api/media/iniciar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'x.mp4', tipo: 'video/mp4', tamano: 1000 }),
    });
    assert.equal(r.status, 401);
  });

  it('ni mandar un pedazo, ni cerrarla', async () => {
    const form = new FormData();
    form.append('subida', 'sub_loquesea');
    form.append('desde', '0');
    form.append('parte', new Blob([Buffer.from('x')]), 'parte');

    const parte = await fetch(`${base}/api/media/parte`, { method: 'POST', body: form });
    assert.equal(parte.status, 401);

    const fin = await fetch(`${base}/api/media/terminar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subida: 'sub_loquesea' }),
    });
    assert.equal(fin.status, 401);
  });
});
