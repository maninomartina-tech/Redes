// Prueba de punta a punta de la cola de publicaciones.
//
// Meta se reemplaza por un doble: no hay credenciales reales, pero sí se
// verifica todo lo nuestro (subida del archivo, alta en la cola, vencimiento,
// publicación, reintentos y cancelación).
//
//   node --test pruebas/

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmp = mkdtempSync(join(tmpdir(), 'demm-test-'));
process.env.DB_PATH = join(tmp, 'test.db');
process.env.FILES_PATH = join(tmp, 'archivos');
process.env.PUBLIC_URL = 'https://ejemplo.test';
process.env.NODE_ENV = 'test';

const { app } = await import('../src/index.js');
const { db, ahora, uid } = await import('../src/db.js');
const { procesarCola, publicarUna } = await import('../src/programador.js');

let servidor;
let base;

before(async () => {
  servidor = app.listen(0);
  await new Promise((r) => servidor.once('listening', r));
  base = `http://localhost:${servidor.address().port}`;
});

after(() => {
  servidor?.close();
  rmSync(tmp, { recursive: true, force: true });
});

/** Cuenta conectada de mentira, como la que dejaría el login de Meta. */
function conectarCuenta(id = 'ig_1') {
  db.prepare(
    `INSERT OR REPLACE INTO cuentas (id, nombre, usuario, page_id, token, creada_en)
     VALUES (?, 'Cuenta de prueba', '@prueba', 'pg_1', 'token_falso', ?)`
  ).run(id, ahora());
  return id;
}

function subirArchivoFalso(tipo = 'image/jpeg') {
  const id = uid('ar');
  const ruta = join(tmp, `${id}.bin`);
  writeFileSync(ruta, 'contenido');
  db.prepare(
    `INSERT INTO archivos (id, nombre, tipo, ruta, tamano, creado_en)
     VALUES (?, 'pieza.jpg', ?, ?, 9, ?)`
  ).run(id, tipo, ruta, ahora());
  return id;
}

async function programar(cuerpo) {
  const r = await fetch(`${base}/api/publicaciones/programar`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  return { estado: r.status, datos: await r.json() };
}

describe('cola de publicaciones', () => {
  it('rechaza programar sin los datos mínimos', async () => {
    const { estado } = await programar({ postId: 'p1' });
    assert.equal(estado, 400);
  });

  it('rechaza programar en una cuenta que no está conectada', async () => {
    const { estado, datos } = await programar({
      postId: 'p1',
      accountId: 'inexistente',
      publishAt: new Date().toISOString(),
      archivos: ['x'],
    });
    assert.equal(estado, 400);
    assert.match(datos.error, /no está conectada/);
  });

  it('programa una publicación y la deja pendiente', async () => {
    const cuenta = conectarCuenta();
    const archivo = subirArchivoFalso();
    const { estado, datos } = await programar({
      postId: 'post_a',
      accountId: cuenta,
      publishAt: new Date(Date.now() + 60_000).toISOString(),
      archivos: [archivo],
      caption: 'Hola',
      type: 'post',
    });
    assert.equal(estado, 200);
    assert.equal(datos.estado, 'programado');
  });

  it('no publica antes de la hora', async () => {
    const r = await procesarCola();
    assert.equal(r.revisadas, 0, 'no debería tocar lo que todavía no vence');
  });

  it('publica cuando vence la hora', async () => {
    const cuenta = conectarCuenta();
    const archivo = subirArchivoFalso();
    await programar({
      postId: 'post_b',
      accountId: cuenta,
      publishAt: new Date(Date.now() - 1000).toISOString(),
      archivos: [archivo],
      caption: 'Ya salió',
      type: 'post',
    });

    let recibido;
    const publicador = async (args) => {
      recibido = args;
      return { id: 'ig_media_123' };
    };

    const r = await procesarCola({ publicador });
    assert.equal(r.publicadas, 1);

    // Llega la URL pública, no el archivo.
    assert.match(recibido.archivos[0].url, /^https:\/\/ejemplo\.test\/archivos\//);
    assert.equal(recibido.archivos[0].esVideo, false);
    assert.equal(recibido.caption, 'Ya salió');

    const fila = db.prepare("SELECT * FROM publicaciones WHERE post_id = 'post_b'").get();
    assert.equal(fila.estado, 'publicado');
    assert.equal(fila.externo_id, 'ig_media_123');
  });

  it('reconoce los videos como tales', async () => {
    const cuenta = conectarCuenta();
    const archivo = subirArchivoFalso('video/mp4');
    await programar({
      postId: 'post_video',
      accountId: cuenta,
      publishAt: new Date(Date.now() - 1000).toISOString(),
      archivos: [archivo],
      type: 'reel',
    });

    let recibido;
    await procesarCola({
      publicador: async (a) => {
        recibido = a;
        return { id: 'ig_reel_1' };
      },
    });
    assert.equal(recibido.archivos[0].esVideo, true);
    assert.equal(recibido.tipo, 'reel');
  });

  it('reintenta ante un fallo y desiste después de tres intentos', async () => {
    const cuenta = conectarCuenta();
    const archivo = subirArchivoFalso();
    await programar({
      postId: 'post_falla',
      accountId: cuenta,
      publishAt: new Date(Date.now() - 1000).toISOString(),
      archivos: [archivo],
      type: 'post',
    });

    const queFalla = async () => {
      throw new Error('Meta dijo que no');
    };

    // Primer intento: vuelve a la cola.
    await procesarCola({ publicador: queFalla });
    let fila = db.prepare("SELECT * FROM publicaciones WHERE post_id = 'post_falla'").get();
    assert.equal(fila.estado, 'programado');
    assert.equal(fila.intentos, 1);

    // Segundo y tercero: al tercero queda en error.
    await procesarCola({ publicador: queFalla });
    await procesarCola({ publicador: queFalla });
    fila = db.prepare("SELECT * FROM publicaciones WHERE post_id = 'post_falla'").get();
    assert.equal(fila.estado, 'error');
    assert.equal(fila.intentos, 3);
    assert.match(fila.error, /Meta dijo que no/);
  });

  it('reprogramar el mismo contenido cancela lo anterior', async () => {
    const cuenta = conectarCuenta();
    const archivo = subirArchivoFalso();
    const futuro = () => new Date(Date.now() + 120_000).toISOString();

    await programar({ postId: 'post_c', accountId: cuenta, publishAt: futuro(), archivos: [archivo] });
    await programar({ postId: 'post_c', accountId: cuenta, publishAt: futuro(), archivos: [archivo] });

    const vivas = db
      .prepare("SELECT COUNT(*) n FROM publicaciones WHERE post_id = 'post_c' AND estado = 'programado'")
      .get().n;
    assert.equal(vivas, 1, 'solo puede quedar una programación viva por contenido');
  });

  it('permite cancelar antes de publicar', async () => {
    const cuenta = conectarCuenta();
    const archivo = subirArchivoFalso();
    const { datos } = await programar({
      postId: 'post_d',
      accountId: cuenta,
      publishAt: new Date(Date.now() + 60_000).toISOString(),
      archivos: [archivo],
    });

    const r = await fetch(`${base}/api/publicaciones/${datos.id}`, { method: 'DELETE' });
    assert.equal(r.status, 200);

    const fila = db.prepare('SELECT * FROM publicaciones WHERE id = ?').get(datos.id);
    assert.equal(fila.estado, 'cancelado');
  });

  it('no deja cancelar algo que ya se publicó', async () => {
    const cuenta = conectarCuenta();
    const archivo = subirArchivoFalso();
    const { datos } = await programar({
      postId: 'post_e',
      accountId: cuenta,
      publishAt: new Date(Date.now() - 1000).toISOString(),
      archivos: [archivo],
    });
    await procesarCola({ publicador: async () => ({ id: 'ig_x' }) });

    const r = await fetch(`${base}/api/publicaciones/${datos.id}`, { method: 'DELETE' });
    assert.equal(r.status, 409);
  });

  it('no publica algo que venció hace demasiado', async () => {
    const cuenta = conectarCuenta();
    const archivo = subirArchivoFalso();
    await programar({
      postId: 'post_viejo',
      accountId: cuenta,
      // Venció hace dos días: el servidor estuvo caído.
      publishAt: new Date(Date.now() - 48 * 3600_000).toISOString(),
      archivos: [archivo],
    });

    let seIntentoPublicar = false;
    await procesarCola({
      publicador: async () => {
        seIntentoPublicar = true;
        return { id: 'no_deberia' };
      },
    });

    assert.equal(seIntentoPublicar, false, 'no debe subir algo tan atrasado');
    const fila = db.prepare("SELECT * FROM publicaciones WHERE post_id = 'post_viejo'").get();
    assert.equal(fila.estado, 'error');
    assert.match(fila.error, /venció hace 48 h/);
  });

  it('sí publica lo que venció hace poco', async () => {
    const cuenta = conectarCuenta();
    const archivo = subirArchivoFalso();
    await programar({
      postId: 'post_reciente',
      accountId: cuenta,
      // Diez minutos tarde: el servidor se reinició, se publica igual.
      publishAt: new Date(Date.now() - 10 * 60_000).toISOString(),
      archivos: [archivo],
    });

    const r = await procesarCola({ publicador: async () => ({ id: 'ig_ok' }) });
    assert.equal(r.publicadas, 1);
    const fila = db.prepare("SELECT * FROM publicaciones WHERE post_id = 'post_reciente'").get();
    assert.equal(fila.estado, 'publicado');
  });

  it('avisa si falta la dirección pública para que Meta descargue', async () => {
    const cuenta = conectarCuenta();
    const archivo = subirArchivoFalso();
    const { datos } = await programar({
      postId: 'post_sin_url',
      accountId: cuenta,
      publishAt: new Date(Date.now() - 1000).toISOString(),
      archivos: [archivo],
    });

    const guardada = process.env.PUBLIC_URL;
    delete process.env.PUBLIC_URL;
    const fila = db.prepare('SELECT * FROM publicaciones WHERE id = ?').get(datos.id);
    const r = await publicarUna(fila, { publicador: async () => ({ id: 'no' }) });
    process.env.PUBLIC_URL = guardada;

    assert.equal(r.ok, false);
    const despues = db.prepare('SELECT * FROM publicaciones WHERE id = ?').get(datos.id);
    assert.match(despues.error, /PUBLIC_URL/);
  });

  it('sirve el archivo para que Meta pueda descargarlo', async () => {
    const archivo = subirArchivoFalso();
    const r = await fetch(`${base}/archivos/${archivo}`);
    assert.equal(r.status, 200);
    assert.equal(await r.text(), 'contenido');
  });

  it('informa el estado de la configuración', async () => {
    const r = await fetch(`${base}/api/salud`);
    const datos = await r.json();
    assert.equal(datos.ok, true);
    assert.ok(datos.cuentasConectadas >= 1);
  });
});
