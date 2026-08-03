// Espacio de trabajo y portales de cliente.
//
// Lo importante que se verifica acá: que un cliente con su link vea
// únicamente lo suyo, y que sin la clave no se pueda tocar nada.

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmp = mkdtempSync(join(tmpdir(), 'demm-espacio-'));
process.env.DB_PATH = join(tmp, 'test.db');
process.env.FILES_PATH = join(tmp, 'archivos');
process.env.CLAVE_CREADORA = 'clave-secreta';
process.env.NODE_ENV = 'test';

const { app } = await import('../src/index.js');

let servidor;
let base;
let sesion;

/** Dos clientes, para comprobar que uno no ve lo del otro. */
const DATOS = {
  clients: [
    { id: 'cli_a', name: 'Aurora', handle: '@aurora', color: '#000', accounts: [], tracksLeads: true },
    { id: 'cli_b', name: 'Flora', handle: '@flora', color: '#111', accounts: [], tracksLeads: false },
  ],
  posts: [
    { id: 'p_a1', clientId: 'cli_a', title: 'Reel de Aurora', status: 'revision', comments: [] },
    { id: 'p_a2', clientId: 'cli_a', title: 'Post de Aurora', status: 'idea', comments: [] },
    { id: 'p_b1', clientId: 'cli_b', title: 'Post de Flora', status: 'revision', comments: [] },
  ],
  campaigns: [{ id: 'ca_a', clientId: 'cli_a', name: 'Agosto' }],
  monthlyStats: [{ id: 'ms_a', clientId: 'cli_a', month: '2026-07', followers: 100 }],
  leads: [
    { id: 'l_a', clientId: 'cli_a', name: 'Consulta de Aurora', source: 'whatsapp', status: 'ganado' },
    { id: 'l_b', clientId: 'cli_b', name: 'Consulta de Flora', source: 'dm', status: 'nuevo' },
  ],
  ads: [],
};

const conClave = (extra = {}) => ({
  'content-type': 'application/json',
  authorization: `Bearer ${sesion}`,
  ...extra,
});

before(async () => {
  servidor = app.listen(0);
  await new Promise((r) => servidor.once('listening', r));
  base = `http://localhost:${servidor.address().port}`;

  const r = await fetch(`${base}/api/auth/entrar`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clave: 'clave-secreta' }),
  });
  sesion = (await r.json()).token;

  await fetch(`${base}/api/espacio`, {
    method: 'PUT',
    headers: conClave(),
    body: JSON.stringify({ datos: DATOS }),
  });
});

after(() => {
  servidor?.close();
  rmSync(tmp, { recursive: true, force: true });
});

describe('ingreso de la creadora', () => {
  it('rechaza una clave incorrecta', async () => {
    const r = await fetch(`${base}/api/auth/entrar`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clave: 'cualquiera' }),
    });
    assert.equal(r.status, 401);
  });

  it('sin sesión no se puede leer el espacio', async () => {
    const r = await fetch(`${base}/api/espacio`);
    assert.equal(r.status, 401);
  });

  it('sin sesión no se puede escribir', async () => {
    const r = await fetch(`${base}/api/espacio`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ datos: { clients: [] } }),
    });
    assert.equal(r.status, 401);
  });

  it('con la clave correcta lee todo', async () => {
    const r = await fetch(`${base}/api/espacio`, { headers: conClave() });
    const { datos } = await r.json();
    assert.equal(datos.clients.length, 2);
    assert.equal(datos.posts.length, 3);
  });

  it('al cerrar sesión el token deja de servir', async () => {
    const login = await fetch(`${base}/api/auth/entrar`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clave: 'clave-secreta' }),
    });
    const t = (await login.json()).token;

    await fetch(`${base}/api/auth/salir`, {
      method: 'POST',
      headers: { authorization: `Bearer ${t}` },
    });

    const r = await fetch(`${base}/api/espacio`, {
      headers: { authorization: `Bearer ${t}` },
    });
    assert.equal(r.status, 401);
  });
});

describe('portal del cliente', () => {
  let linkA;

  it('la creadora crea el link de un cliente', async () => {
    const r = await fetch(`${base}/api/portales/cli_a`, {
      method: 'POST',
      headers: conClave(),
    });
    linkA = (await r.json()).token;
    assert.ok(linkA?.length > 8, 'el link tiene que ser difícil de adivinar');
  });

  it('un link inventado no entra', async () => {
    const r = await fetch(`${base}/api/portal/inventado`);
    assert.equal(r.status, 404);
  });

  it('el cliente ve solamente lo suyo', async () => {
    const d = await (await fetch(`${base}/api/portal/${linkA}`)).json();

    assert.equal(d.cliente.id, 'cli_a');
    assert.equal(d.posts.length, 2, 'solo sus dos contenidos');
    assert.ok(
      d.posts.every((p) => p.clientId === 'cli_a'),
      'no puede colarse nada del otro cliente'
    );

    // Y tampoco debe llegar el resto del espacio.
    assert.equal(d.clients, undefined, 'no ve la lista de clientes');
    assert.equal(d.ads, undefined, 'no ve las campañas pagas');
    assert.equal(d.monthlyStats.length, 1);
    assert.equal(d.campaigns.length, 1);
  });

  it('las ventas solo llegan si ese cliente las mide', async () => {
    const dA = await (await fetch(`${base}/api/portal/${linkA}`)).json();
    assert.equal(dA.leads.length, 1, 'Aurora sí mide ventas');

    const rB = await fetch(`${base}/api/portales/cli_b`, {
      method: 'POST',
      headers: conClave(),
    });
    const linkB = (await rB.json()).token;
    const dB = await (await fetch(`${base}/api/portal/${linkB}`)).json();
    assert.equal(dB.leads.length, 0, 'Flora no las mide: no se le mandan');
  });

  it('el cliente puede comentar en su contenido', async () => {
    const r = await fetch(`${base}/api/portal/${linkA}/comentario`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ postId: 'p_a1', texto: 'Cambiemos el CTA' }),
    });
    assert.equal(r.status, 200);

    const d = await (await fetch(`${base}/api/portal/${linkA}`)).json();
    const post = d.posts.find((p) => p.id === 'p_a1');
    assert.equal(post.comments.length, 1);
    assert.equal(post.comments[0].text, 'Cambiemos el CTA');
    assert.equal(post.comments[0].authorName, 'Aurora');
  });

  it('no puede comentar en el contenido de otro cliente', async () => {
    const r = await fetch(`${base}/api/portal/${linkA}/comentario`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ postId: 'p_b1', texto: 'No debería poder' }),
    });
    assert.equal(r.status, 400);
  });

  it('puede aprobar y pedir cambios en lo suyo', async () => {
    await fetch(`${base}/api/portal/${linkA}/decision`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ postId: 'p_a1', decision: 'aprobado' }),
    });

    const d = await (await fetch(`${base}/api/portal/${linkA}`)).json();
    assert.equal(d.posts.find((p) => p.id === 'p_a1').status, 'aprobado');
  });

  it('no puede cambiar el estado de otro cliente', async () => {
    const r = await fetch(`${base}/api/portal/${linkA}/decision`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ postId: 'p_b1', decision: 'aprobado' }),
    });
    assert.equal(r.status, 400);
  });

  it('no puede mandar un estado que no le corresponde', async () => {
    const r = await fetch(`${base}/api/portal/${linkA}/decision`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ postId: 'p_a1', decision: 'publicado' }),
    });
    assert.equal(r.status, 400, 'publicar no es decisión del cliente');
  });

  it('no puede administrar links', async () => {
    const r = await fetch(`${base}/api/portales/cli_b`, { method: 'POST' });
    assert.equal(r.status, 401);
  });

  it('al rehacer el link, el anterior deja de servir', async () => {
    const nuevo = await (
      await fetch(`${base}/api/portales/cli_a`, { method: 'POST', headers: conClave() })
    ).json();

    assert.notEqual(nuevo.token, linkA);
    assert.equal((await fetch(`${base}/api/portal/${linkA}`)).status, 404);
    assert.equal((await fetch(`${base}/api/portal/${nuevo.token}`)).status, 200);
  });

  it('los comentarios del cliente le llegan a la creadora', async () => {
    const { datos } = await (await fetch(`${base}/api/espacio`, { headers: conClave() })).json();
    const post = datos.posts.find((p) => p.id === 'p_a1');
    assert.equal(post.comments.length, 1);
    assert.equal(post.status, 'aprobado', 'la aprobación también quedó guardada');
  });
});
