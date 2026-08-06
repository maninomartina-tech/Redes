// ¿Los datos sobreviven de verdad a un reinicio?
//
// La configuración no alcanza como respuesta: tener DB_PATH y FILES_PATH
// puestos se ve exactamente igual apuntando a un disco de verdad que a una
// carpeta que la plataforma borra en cada despliegue. Lo único que lo prueba
// es que la base tenga memoria de haber existido antes.
//
// Estas pruebas arrancan el servidor en un proceso aparte, lo matan y lo
// vuelven a arrancar, que es lo que hace Render en cada despliegue.
//
//   node --test pruebas/

import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = mkdtempSync(join(tmpdir(), 'demm-persistencia-'));

after(() => rmSync(tmp, { recursive: true, force: true }));

/** Arranca el servidor de verdad, en su propio proceso, y devuelve su salud. */
async function arrancarYPreguntar(carpeta) {
  const puerto = 4100 + Math.floor(Math.random() * 800);
  const proceso = spawn('node', ['src/index.js'], {
    cwd: raiz,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(puerto),
      DB_PATH: join(carpeta, 'demm.db'),
      FILES_PATH: join(carpeta, 'archivos'),
      CLAVE_CREADORA: 'clave-de-prueba',
      MODO_SOLO_LECTURA: 'true',
    },
    stdio: 'ignore',
  });

  try {
    // El arranque es casi instantáneo, pero no es sincrónico.
    for (let intento = 0; intento < 50; intento++) {
      try {
        const res = await fetch(`http://127.0.0.1:${puerto}/api/salud`);
        if (res.ok) return await res.json();
      } catch {
        /* todavía no está escuchando */
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('el servidor no arrancó');
  } finally {
    proceso.kill('SIGKILL');
    await new Promise((r) => proceso.once('exit', r));
  }
}

describe('la base se acuerda de haber existido', () => {
  it('con un disco que se conserva, sobrevive al reinicio', async () => {
    const disco = join(tmp, 'con-disco');

    const primera = await arrancarYPreguntar(disco);
    assert.equal(primera.almacenamiento.arranques, 1);
    assert.ok(primera.almacenamiento.desde, 'tiene que decir desde cuándo existe');

    const segunda = await arrancarYPreguntar(disco);
    assert.equal(
      segunda.almacenamiento.arranques,
      2,
      'el contador tiene que subir en cada arranque'
    );
    assert.equal(
      segunda.almacenamiento.desde,
      primera.almacenamiento.desde,
      'la fecha de nacimiento no puede cambiar: la base es la misma'
    );
    assert.notEqual(
      segunda.almacenamiento.ultimoArranque,
      primera.almacenamiento.ultimoArranque
    );
  });

  it('sin disco, cada arranque parece el primero', async () => {
    // Lo que hace Render sin disco: carpeta nueva en cada despliegue.
    const primera = await arrancarYPreguntar(join(tmp, 'sin-disco-1'));
    const segunda = await arrancarYPreguntar(join(tmp, 'sin-disco-2'));

    assert.equal(primera.almacenamiento.arranques, 1);
    assert.equal(
      segunda.almacenamiento.arranques,
      1,
      'si el contador nunca pasa de 1, los datos se están borrando'
    );
    assert.notEqual(
      segunda.almacenamiento.desde,
      primera.almacenamiento.desde,
      'una base recién nacida en cada arranque es exactamente el problema'
    );
  });

  it('avisa dónde está guardando', async () => {
    const disco = join(tmp, 'con-disco');
    const salud = await arrancarYPreguntar(disco);
    assert.equal(salud.almacenamiento.carpeta, disco);
    assert.equal(salud.datosPersistentes, true);
  });
});
