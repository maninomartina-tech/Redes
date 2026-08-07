// Conectar Meta desde la app.
//
// El servidor está publicado en internet, así que la ruta que arranca el login
// de Meta es visible para cualquiera. Si estuviera abierta, quien conozca la
// dirección podría conectar SUS cuentas de Instagram acá y dejar su token
// guardado en la base de ella. La vuelta de Meta llega como una visita del
// navegador y no puede traer la sesión, así que el permiso viaja en un pase de
// un solo uso.
//
//   node --test pruebas/

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmp = mkdtempSync(join(tmpdir(), 'demm-conexion-'));
process.env.DB_PATH = join(tmp, 'test.db');
process.env.FILES_PATH = join(tmp, 'archivos');
process.env.PUBLIC_URL = 'https://ejemplo.test';
process.env.NODE_ENV = 'test';
process.env.USUARIO_CREADORA = 'demm';
process.env.CLAVE_CREADORA = 'clave-de-prueba';
process.env.META_APP_ID = 'app-de-prueba';
process.env.META_APP_SECRET = 'secreto-de-prueba';

const { app } = await import('../src/index.js');
const { tokenDeUsuario, guardarTokenDeUsuario } = await import('../src/db.js');

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

const pedirPase = async (token = sesion) => {
  const r = await fetch(`${base}/api/auth/meta/pase`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return { estado: r.status, pase: r.ok ? (await r.json()).pase : null };
};

/** Sigue el redirect a mano, para poder mirar a dónde manda. */
const arrancarLogin = (pase) =>
  fetch(`${base}/api/auth/meta/login?pase=${encodeURIComponent(pase ?? '')}`, {
    redirect: 'manual',
  });

describe('arrancar la conexión con Meta', () => {
  it('con la sesión, el pase lleva a la pantalla de Meta', async () => {
    const { pase } = await pedirPase();
    assert.ok(pase, 'tendría que dar un pase');

    const r = await arrancarLogin(pase);
    assert.equal(r.status, 302);

    const destino = new URL(r.headers.get('location'));
    assert.equal(destino.hostname, 'www.facebook.com');
    assert.equal(destino.searchParams.get('client_id'), 'app-de-prueba');
    assert.match(destino.searchParams.get('redirect_uri'), /\/api\/auth\/meta\/callback$/);
    assert.ok(
      destino.searchParams.get('state'),
      'sin `state`, el callback no puede saber si la vuelta es nuestra'
    );
    assert.match(
      destino.searchParams.get('scope'),
      /instagram_basic/,
      'tiene que pedir los permisos de Instagram'
    );
  });

  it('el pase sirve una sola vez', async () => {
    const { pase } = await pedirPase();
    assert.equal((await arrancarLogin(pase)).status, 302);
    assert.equal((await arrancarLogin(pase)).status, 403, 'el segundo uso tiene que fallar');
  });
});

describe('lo que no se puede hacer', () => {
  it('sin sesión no se consigue un pase', async () => {
    const r = await fetch(`${base}/api/auth/meta/pase`, { method: 'POST' });
    assert.equal(r.status, 401);
  });

  it('con una sesión inventada tampoco', async () => {
    const { estado } = await pedirPase('inventada');
    assert.equal(estado, 401);
  });

  it('sin pase, la ruta de login no manda a ningún lado', async () => {
    const r = await fetch(`${base}/api/auth/meta/login`, { redirect: 'manual' });
    assert.equal(r.status, 403);
    assert.equal(r.headers.get('location'), null, 'no puede redirigir a Meta');
  });

  it('con un pase inventado tampoco', async () => {
    const r = await arrancarLogin('me-lo-invente');
    assert.equal(r.status, 403);
    assert.equal(r.headers.get('location'), null);
  });

  it('el valor que vuelve de Meta no sirve para arrancar otro login', async () => {
    // Ese valor pasa por la barra de direcciones, el historial y el Referer
    // hacia facebook.com: si sirviera de pase, verlo una vez alcanzaría para
    // saltearse la sesión.
    const { pase } = await pedirPase();
    const ida = await arrancarLogin(pase);
    const state = new URL(ida.headers.get('location')).searchParams.get('state');

    const r = await arrancarLogin(state);
    assert.equal(r.status, 403, 'un state no puede valer como pase de ida');
    assert.equal(r.headers.get('location'), null);
  });

  it('y un pase de ida no sirve como vuelta de Meta', async () => {
    const { pase } = await pedirPase();
    const r = await fetch(`${base}/api/auth/meta/callback?code=x&state=${pase}`, {
      redirect: 'manual',
    });
    assert.equal(r.status, 403);
  });

  it('la vuelta de Meta sin un state nuestro no guarda nada', async () => {
    const antes = tokenDeUsuario();

    const r = await fetch(`${base}/api/auth/meta/callback?code=un-codigo-cualquiera`, {
      redirect: 'manual',
    });
    assert.equal(r.status, 403);
    assert.match(await r.text(), /no se guardó nada/i);

    assert.deepEqual(tokenDeUsuario(), antes, 'no puede haber tocado el token guardado');
  });

  it('un state inventado tampoco entra', async () => {
    const r = await fetch(
      `${base}/api/auth/meta/callback?code=un-codigo&state=me-lo-invente`,
      { redirect: 'manual' }
    );
    assert.equal(r.status, 403);
  });
});

describe('las cuentas publicitarias', () => {
  it('sin sesión no se listan', async () => {
    const r = await fetch(`${base}/api/adcuentas`);
    assert.equal(r.status, 401);
  });

  it('sin haber conectado Meta, lo dice con palabras y no con el error de Meta', async () => {
    const r = await fetch(`${base}/api/adcuentas`, {
      headers: { Authorization: `Bearer ${sesion}` },
    });
    assert.equal(r.status, 409);
    assert.match((await r.json()).error, /Vincular Instagram/i);
  });

  it('el token del usuario se guarda y se lee', () => {
    guardarTokenDeUsuario('token-largo-de-prueba', '2026-12-31T00:00:00.000Z');
    const guardado = tokenDeUsuario();
    assert.equal(guardado.token, 'token-largo-de-prueba');
    assert.equal(guardado.expira_en, '2026-12-31T00:00:00.000Z');
  });
});
