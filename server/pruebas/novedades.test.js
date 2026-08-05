// Novedades: qué pasó desde la última vez que miraste.
//
// Lo que importa acá: que cada aviso le llegue a quien le toca y a nadie más,
// que una tanda de veinte historias no dispare veinte avisos, y que guardar
// el espacio sin cambios no invente novedades de la nada.

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmp = mkdtempSync(join(tmpdir(), 'demm-nov-'));
process.env.DB_PATH = join(tmp, 'test.db');
process.env.FILES_PATH = join(tmp, 'archivos');
process.env.CLAVE_CREADORA = 'clave-secreta';
process.env.USUARIO_CREADORA = 'demm';
process.env.NODE_ENV = 'test';

const { app } = await import('../src/index.js');

let servidor;
let base;
let sesion;
let linkA;

const CLIENTES = [
  { id: 'cli_a', name: 'Aurora', handle: '@aurora', color: '#000', accounts: [] },
  { id: 'cli_b', name: 'Flora', handle: '@flora', color: '#111', accounts: [] },
];

const post = (id, clientId, extra = {}) => ({
  id,
  clientId,
  title: `Contenido ${id}`,
  status: 'revision',
  comments: [],
  ...extra,
});

const espacio = (posts) => ({
  clients: CLIENTES,
  posts,
  campaigns: [],
  ads: [],
  monthlyStats: [],
  leads: [],
});

const conClave = () => ({
  'content-type': 'application/json',
  authorization: `Bearer ${sesion}`,
});

const guardar = (posts) =>
  fetch(`${base}/api/espacio`, {
    method: 'PUT',
    headers: conClave(),
    body: JSON.stringify({ datos: espacio(posts) }),
  });

const deLaCreadora = async () =>
  (await (await fetch(`${base}/api/novedades`, { headers: conClave() })).json()).novedades;

const delCliente = async (token) =>
  (await (await fetch(`${base}/api/portal/${token}/novedades`)).json()).novedades;

before(async () => {
  servidor = app.listen(0);
  await new Promise((r) => servidor.once('listening', r));
  base = `http://localhost:${servidor.address().port}`;

  const r = await fetch(`${base}/api/auth/entrar`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ usuario: 'demm', clave: 'clave-secreta' }),
  });
  sesion = (await r.json()).token;

  await guardar([post('p1', 'cli_a')]);
  linkA = (
    await (
      await fetch(`${base}/api/portales/cli_a`, { method: 'POST', headers: conClave() })
    ).json()
  ).token;
});

after(() => {
  servidor?.close();
  rmSync(tmp, { recursive: true, force: true });
});

describe('lo que hace el cliente le llega a la creadora', () => {
  it('un comentario, con el nombre del cliente y qué dijo', async () => {
    await fetch(`${base}/api/portal/${linkA}/comentario`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ postId: 'p1', texto: 'Cambiemos el CTA' }),
    });

    const [ultima] = await deLaCreadora();
    assert.equal(ultima.tipo, 'comentario');
    assert.match(ultima.texto, /Aurora/);
    assert.match(ultima.texto, /Cambiemos el CTA/);
    assert.equal(ultima.post_id, 'p1');
    assert.equal(ultima.vista_en, null);
  });

  it('una decisión, y dice cuál fue', async () => {
    await fetch(`${base}/api/portal/${linkA}/decision`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ postId: 'p1', decision: 'aprobado' }),
    });

    const [ultima] = await deLaCreadora();
    assert.equal(ultima.tipo, 'decision');
    assert.match(ultima.texto, /Aurora/);
    assert.match(ultima.texto, /aprob/i);
  });

  it('al marcarlas vistas dejan de contar, pero siguen ahí', async () => {
    const antes = await deLaCreadora();
    assert.ok(antes.some((n) => !n.vista_en));

    await fetch(`${base}/api/novedades/vistas`, { method: 'POST', headers: conClave() });

    const despues = await deLaCreadora();
    assert.equal(despues.length, antes.length, 'no se borran, se marcan');
    assert.ok(despues.every((n) => n.vista_en));
  });

  it('sin sesión no se pueden leer: son de ella', async () => {
    const r = await fetch(`${base}/api/novedades`);
    assert.equal(r.status, 401);
  });
});

describe('lo que carga la creadora le llega al cliente', () => {
  it('la pieza terminada', async () => {
    await guardar([
      post('p1', 'cli_a', { resultado: { id: 'm1', name: 'pieza.mp4', kind: 'video' } }),
    ]);

    const [ultima] = await delCliente(linkA);
    assert.equal(ultima.tipo, 'pieza');
    assert.match(ultima.texto, /Contenido p1/);
  });

  it('reemplazar la pieza también avisa', async () => {
    const antes = (await delCliente(linkA)).length;
    await guardar([
      post('p1', 'cli_a', { resultado: { id: 'm2', name: 'otra.mp4', kind: 'video' } }),
    ]);
    assert.equal((await delCliente(linkA)).length, antes + 1);
  });

  it('guardar sin cambios no inventa nada', async () => {
    const antes = (await delCliente(linkA)).length;
    await guardar([
      post('p1', 'cli_a', { resultado: { id: 'm2', name: 'otra.mp4', kind: 'video' } }),
    ]);
    assert.equal((await delCliente(linkA)).length, antes);
  });

  it('contenido nuevo, de a uno cuando son pocos', async () => {
    const antes = (await delCliente(linkA)).length;
    await guardar([
      post('p1', 'cli_a', { resultado: { id: 'm2', name: 'otra.mp4', kind: 'video' } }),
      post('p2', 'cli_a'),
      post('p3', 'cli_a'),
    ]);

    const ahora = await delCliente(linkA);
    assert.equal(ahora.length, antes + 2);
    assert.ok(ahora.slice(0, 2).every((n) => n.tipo === 'contenido'));
  });

  it('una tanda grande es un solo aviso, no veinte', async () => {
    const antes = (await delCliente(linkA)).length;
    const muchos = Array.from({ length: 20 }, (_, i) => post(`h${i}`, 'cli_a'));
    await guardar([
      post('p1', 'cli_a', { resultado: { id: 'm2', name: 'otra.mp4', kind: 'video' } }),
      post('p2', 'cli_a'),
      post('p3', 'cli_a'),
      ...muchos,
    ]);

    const ahora = await delCliente(linkA);
    assert.equal(ahora.length, antes + 1, 'veinte avisos serían ruido, no noticias');
    assert.match(ahora[0].texto, /20 contenidos/);
  });

  it('cada cliente ve solo lo suyo', async () => {
    const linkB = (
      await (
        await fetch(`${base}/api/portales/cli_b`, { method: 'POST', headers: conClave() })
      ).json()
    ).token;

    const deB = await delCliente(linkB);
    assert.equal(deB.length, 0, 'nada de Aurora se le coló a Flora');

    await guardar([post('p1', 'cli_a'), post('pb', 'cli_b')]);
    const ahoraB = await delCliente(linkB);
    assert.equal(ahoraB.length, 1);
    assert.match(ahoraB[0].texto, /pb/);

    // Y lo de Flora tampoco aparece en el link de Aurora.
    const deA = await delCliente(linkA);
    assert.ok(!deA.some((n) => n.texto.includes('pb')));
  });

  it('un link inventado no devuelve novedades de nadie', async () => {
    const r = await fetch(`${base}/api/portal/inventado/novedades`);
    assert.equal(r.status, 404);
  });
});

describe('aprobar varias de una vez', () => {
  const aprobar = (token, postIds) =>
    fetch(`${base}/api/portal/${token}/aprobar-todo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ postIds }),
    });

  it('aplica la misma regla que de a una', async () => {
    await guardar([
      post('m1', 'cli_a'), // sin pieza: al aprobar va a edición
      post('m2', 'cli_a', { resultado: { id: 'x', name: 'p.jpg', kind: 'image' } }),
    ]);

    const r = await aprobar(linkA, ['m1', 'm2']);
    assert.equal(r.status, 200);
    assert.equal((await r.json()).cuantos, 2);

    const { datos } = await (await fetch(`${base}/api/espacio`, { headers: conClave() })).json();
    assert.equal(datos.posts.find((p) => p.id === 'm1').status, 'edicion');
    assert.equal(datos.posts.find((p) => p.id === 'm2').status, 'aprobado');
  });

  it('aprueba solo lo que se le mostró, no todo lo pendiente', async () => {
    await guardar([post('n1', 'cli_a'), post('n2', 'cli_a')]);

    await aprobar(linkA, ['n1']);

    const { datos } = await (await fetch(`${base}/api/espacio`, { headers: conClave() })).json();
    assert.equal(datos.posts.find((p) => p.id === 'n1').status, 'edicion');
    assert.equal(
      datos.posts.find((p) => p.id === 'n2').status,
      'revision',
      'lo que no estaba en la lista no se toca'
    );
  });

  it('no puede aprobar lo de otro cliente aunque mande su id', async () => {
    await guardar([post('o1', 'cli_a'), post('o2', 'cli_b')]);

    const r = await aprobar(linkA, ['o1', 'o2']);
    assert.equal((await r.json()).cuantos, 1, 'solo la suya');

    const { datos } = await (await fetch(`${base}/api/espacio`, { headers: conClave() })).json();
    assert.equal(datos.posts.find((p) => p.id === 'o2').status, 'revision');
  });

  it('le llega un solo aviso a la creadora, no uno por pieza', async () => {
    await fetch(`${base}/api/novedades/vistas`, { method: 'POST', headers: conClave() });
    await guardar([post('q1', 'cli_a'), post('q2', 'cli_a'), post('q3', 'cli_a')]);

    await aprobar(linkA, ['q1', 'q2', 'q3']);

    const sinVer = (await deLaCreadora()).filter((n) => !n.vista_en && n.tipo === 'decision');
    assert.equal(sinVer.length, 1);
    assert.match(sinVer[0].texto, /3 contenidos/);
  });

  it('sin lista no hace nada', async () => {
    const r = await aprobar(linkA, []);
    assert.equal(r.status, 400);
  });

  it('un link inventado no aprueba nada', async () => {
    const r = await aprobar('inventado', ['q1']);
    assert.equal(r.status, 400);
  });
});
