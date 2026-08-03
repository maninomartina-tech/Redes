// Redacción con IA.
//
// Lo que importa acá: que nadie que no sea la creadora pueda gastarle crédito,
// que se entienda qué falta cuando no hay clave, y que las opciones lleguen
// separadas y limpias. La API de Anthropic se reemplaza por un doble.

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmp = mkdtempSync(join(tmpdir(), 'demm-ia-'));
process.env.DB_PATH = join(tmp, 'test.db');
process.env.FILES_PATH = join(tmp, 'archivos');
process.env.CLAVE_CREADORA = 'clave-secreta';
process.env.USUARIO_CREADORA = 'demm';
process.env.NODE_ENV = 'test';

const { app } = await import('../src/index.js');
const { separarOpciones } = await import('../src/ia.js');

let servidor;
let base;
let sesion;
let falsa;
/** Lo último que se le pidió al doble, para revisar el prompt. */
let ultimoPedido = null;
let responder = () => ({
  content: [{ type: 'text', text: 'Primera\n---\nSegunda\n---\nTercera' }],
});

before(async () => {
  // Doble de la API de Anthropic.
  falsa = createServer((req, res) => {
    let cuerpo = '';
    req.on('data', (c) => (cuerpo += c));
    req.on('end', () => {
      ultimoPedido = { url: req.url, headers: req.headers, body: JSON.parse(cuerpo || '{}') };
      const r = responder();
      res.writeHead(r.estado ?? 200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(r.estado ? r.cuerpo : r));
    });
  });
  falsa.listen(0);
  await new Promise((r) => falsa.once('listening', r));
  process.env.ANTHROPIC_BASE_URL = `http://localhost:${falsa.address().port}`;

  servidor = app.listen(0);
  await new Promise((r) => servidor.once('listening', r));
  base = `http://localhost:${servidor.address().port}`;

  const r = await fetch(`${base}/api/auth/entrar`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ usuario: 'demm', clave: 'clave-secreta' }),
  });
  sesion = (await r.json()).token;
});

after(() => {
  servidor?.close();
  falsa?.close();
  rmSync(tmp, { recursive: true, force: true });
});

const redactar = (cuerpo, token = sesion) =>
  fetch(`${base}/api/ai/redactar`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(cuerpo),
  });

describe('redacción con IA', () => {
  it('sin sesión no se puede pedir: cada llamada cuesta plata', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const r = await redactar({ parte: 'copy' }, null);
    assert.equal(r.status, 401);
  });

  it('el análisis de campañas tampoco queda abierto', async () => {
    const r = await fetch(`${base}/api/ai/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ analysis: {} }),
    });
    assert.equal(r.status, 401);
  });

  it('sin clave de IA explica dónde se carga', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const r = await redactar({ parte: 'copy' });
    assert.equal(r.status, 501);
    const { error } = await r.json();
    assert.match(error, /ANTHROPIC_API_KEY/);
    assert.match(error, /Render/);
  });

  it('devuelve las opciones separadas', async () => {
    process.env.ANTHROPIC_API_KEY = 'clave-de-prueba';
    const r = await redactar({
      parte: 'copy',
      cliente: { name: 'Flora Café', handle: '@flora.cafe' },
      post: { type: 'reel', title: 'Cafecito con torta' },
    });
    assert.equal(r.status, 200);
    const { opciones } = await r.json();
    assert.deepEqual(opciones, ['Primera', 'Segunda', 'Tercera']);
  });

  it('le pasa a la IA lo que ya está cargado del contenido', async () => {
    process.env.ANTHROPIC_API_KEY = 'clave-de-prueba';
    await redactar({
      parte: 'copy',
      cliente: { name: 'Flora Café', handle: '@flora.cafe' },
      post: {
        type: 'reel',
        title: 'Cafecito con torta',
        ideaGeneral: 'Mostrar un cafecito con una porción de torta',
      },
      instruccion: 'sin emojis',
    });

    const texto = ultimoPedido.body.messages[0].content;
    assert.match(texto, /Flora Café/);
    assert.match(texto, /reel/);
    assert.match(texto, /porción de torta/);
    assert.match(texto, /sin emojis/);
    // Y el estilo va en las instrucciones del sistema, no mezclado con los datos.
    assert.match(ultimoPedido.body.system, /rioplatense/);
  });

  it('si la IA falla, se informa en vez de devolver vacío', async () => {
    process.env.ANTHROPIC_API_KEY = 'clave-de-prueba';
    const anterior = responder;
    responder = () => ({ estado: 429, cuerpo: { error: { message: 'Demasiadas solicitudes' } } });

    const r = await redactar({ parte: 'copy', post: { type: 'post' } });
    assert.equal(r.status, 502);
    assert.match((await r.json()).error, /Demasiadas solicitudes/);

    responder = anterior;
  });

  it('rechaza una parte que no existe', async () => {
    process.env.ANTHROPIC_API_KEY = 'clave-de-prueba';
    const r = await redactar({ parte: 'cualquiera', post: {} });
    assert.equal(r.status, 502);
  });
});

describe('separar las opciones', () => {
  it('saca la numeración que agrega igual', () => {
    assert.deepEqual(separarOpciones('Opción 1: uno\n---\nOpción 2. dos'), ['uno', 'dos']);
  });

  it('una sola respuesta también es una opción', () => {
    assert.deepEqual(separarOpciones('  sola  '), ['sola']);
  });

  it('no devuelve opciones vacías', () => {
    assert.deepEqual(separarOpciones('uno\n---\n\n---\ndos'), ['uno', 'dos']);
  });

  it('no rompe si vuelve vacío', () => {
    assert.deepEqual(separarOpciones(''), []);
  });
});
