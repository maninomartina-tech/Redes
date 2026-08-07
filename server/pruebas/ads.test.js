// Cambiar campañas de Meta Ads desde la app.
//
// Esto escribe en la cuenta publicitaria de un cliente: pausar una campaña la
// saca del aire y subirle el presupuesto le gasta plata. Lo que más importa
// probar, entonces, no es que funcione sino que **no** funcione cuando no
// corresponde: sin sesión, y sin haberlo prendido a propósito en el servidor.
//
//   node --test pruebas/

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmp = mkdtempSync(join(tmpdir(), 'demm-ads-'));
process.env.DB_PATH = join(tmp, 'test.db');
process.env.FILES_PATH = join(tmp, 'archivos');
process.env.PUBLIC_URL = 'https://ejemplo.test';
process.env.NODE_ENV = 'test';
process.env.USUARIO_CREADORA = 'demm';
process.env.CLAVE_CREADORA = 'clave-de-prueba';
process.env.META_ADS_ESCRITURA = 'true';

const { app } = await import('../src/index.js');
const { db, ahora } = await import('../src/db.js');
const { permisos } = await import('../src/config.js');

let servidor;
let base;
let sesion;
const fetchReal = globalThis.fetch;

/** Lo que se le mandó a Meta, para poder afirmar qué pedimos. */
let mandado = [];

before(async () => {
  servidor = app.listen(0);
  await new Promise((r) => servidor.once('listening', r));
  base = `http://localhost:${servidor.address().port}`;

  db.prepare(
    `INSERT OR REPLACE INTO cuentas (id, nombre, usuario, page_id, token, creada_en)
     VALUES ('ig_9', 'Aurora', '@aurora', 'pg', 'tok', ?)`
  ).run(ahora());

  const r = await fetch(`${base}/api/auth/entrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario: 'demm', clave: 'clave-de-prueba' }),
  });
  sesion = (await r.json()).token;
});

after(() => {
  globalThis.fetch = fetchReal;
  servidor?.close();
  rmSync(tmp, { recursive: true, force: true });
});

/** Meta de mentira: guarda lo que le llega y responde lo que se le indique. */
function simularMeta(respuestas) {
  mandado = [];
  globalThis.fetch = async (url, opciones) => {
    const texto = String(url);
    if (!texto.includes('graph.facebook.com')) return fetchReal(url, opciones);

    mandado.push({
      url: texto,
      metodo: opciones?.method ?? 'GET',
      cuerpo: opciones?.body ? String(opciones.body) : null,
    });

    for (const [patron, r] of Object.entries(respuestas)) {
      if (texto.includes(patron) && (opciones?.method ?? 'GET') === (r.metodo ?? 'GET')) {
        return new Response(JSON.stringify(r.cuerpo), {
          status: r.estado ?? 200,
          headers: { 'content-type': 'application/json' },
        });
      }
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
}

const conSesion = (extra = {}) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${sesion}`,
  ...extra,
});

describe('administrar campañas de ADS', () => {
  it('pausar una campaña se la manda a Meta y devuelve lo que quedó', async () => {
    simularMeta({
      '/camp_1': { metodo: 'GET', cuerpo: { status: 'PAUSED', effective_status: 'PAUSED' } },
    });

    const r = await fetch(`${base}/api/ads/ig_9/campanas/camp_1/estado`, {
      method: 'POST',
      headers: conSesion(),
      body: JSON.stringify({ estado: 'pausada' }),
    });

    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { estado: 'pausada', detalle: 'PAUSED' });

    const escritura = mandado.find((m) => m.metodo === 'POST');
    assert.ok(escritura, 'tiene que haberle escrito a Meta');
    assert.match(escritura.cuerpo, /status=PAUSED/);
    assert.match(escritura.url, /camp_1/);
  });

  it('devuelve el estado real, no el que se pidió', async () => {
    // Meta acepta el cambio pero la deja apagada igual: pasa cuando la campaña
    // ya terminó o el método de pago falló.
    simularMeta({
      '/camp_2': { metodo: 'GET', cuerpo: { status: 'PAUSED', effective_status: 'CAMPAIGN_PAUSED' } },
    });

    const r = await fetch(`${base}/api/ads/ig_9/campanas/camp_2/estado`, {
      method: 'POST',
      headers: conSesion(),
      body: JSON.stringify({ estado: 'activa' }),
    });

    const d = await r.json();
    assert.equal(d.estado, 'pausada', 'se pidió activarla y quedó pausada: hay que decirlo');
  });

  it('el presupuesto diario va en centavos', async () => {
    simularMeta({
      '/camp_3': { metodo: 'GET', cuerpo: { daily_budget: '350000' } },
    });

    const r = await fetch(`${base}/api/ads/ig_9/campanas/camp_3/presupuesto`, {
      method: 'POST',
      headers: conSesion(),
      body: JSON.stringify({ diario: 3500 }),
    });

    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { diario: 3500 });

    const escritura = mandado.find((m) => m.metodo === 'POST');
    assert.match(escritura.cuerpo, /daily_budget=350000/);
  });

  it('rechaza un presupuesto que no es un número mayor que cero', async () => {
    simularMeta({});
    for (const diario of [0, -100, 'mucho', null]) {
      const r = await fetch(`${base}/api/ads/ig_9/campanas/camp_4/presupuesto`, {
        method: 'POST',
        headers: conSesion(),
        body: JSON.stringify({ diario }),
      });
      assert.equal(r.status, 502, `${diario} tendría que rechazarse`);
    }
    assert.equal(
      mandado.filter((m) => m.metodo === 'POST').length,
      0,
      'no puede haberle escrito nada a Meta'
    );
  });

  it('cuando el presupuesto está en el conjunto de anuncios, lo explica', async () => {
    simularMeta({
      '/camp_5': {
        metodo: 'POST',
        estado: 400,
        cuerpo: { error: { message: 'Campaign budget cannot be set' } },
      },
    });

    const r = await fetch(`${base}/api/ads/ig_9/campanas/camp_5/presupuesto`, {
      method: 'POST',
      headers: conSesion(),
      body: JSON.stringify({ diario: 2000 }),
    });

    assert.equal(r.status, 502);
    assert.match((await r.json()).error, /conjunto de anuncios/i);
  });

  it('no acepta un estado inventado', async () => {
    simularMeta({});
    const r = await fetch(`${base}/api/ads/ig_9/campanas/camp_6/estado`, {
      method: 'POST',
      headers: conSesion(),
      body: JSON.stringify({ estado: 'borrada' }),
    });
    assert.equal(r.status, 400);
    assert.equal(mandado.length, 0, 'ni siquiera tiene que llamar a Meta');
  });
});

describe('lo que no se puede hacer', () => {
  it('sin sesión de creadora, no se toca ninguna campaña', async () => {
    simularMeta({});

    for (const ruta of ['estado', 'presupuesto']) {
      const r = await fetch(`${base}/api/ads/ig_9/campanas/camp_1/${ruta}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'pausada', diario: 1000 }),
      });
      assert.equal(r.status, 401, `${ruta} sin sesión tiene que dar 401`);
    }
    assert.equal(mandado.length, 0, 'no puede haber llegado nada a Meta');
  });

  it('con una sesión inventada tampoco', async () => {
    simularMeta({});
    const r = await fetch(`${base}/api/ads/ig_9/campanas/camp_1/estado`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer inventado' },
      body: JSON.stringify({ estado: 'pausada' }),
    });
    assert.equal(r.status, 401);
    assert.equal(mandado.length, 0);
  });
});

describe('los permisos que se le piden a Meta', () => {
  it('con la escritura prendida se pide ads_management, y también ads_read', () => {
    const p = permisos();
    assert.ok(p.includes('ads_management'));
    assert.ok(p.includes('ads_read'), 'si Meta aprueba solo lectura, la app tiene que seguir');
  });

  it('apagada, no se pide ads_management', () => {
    process.env.META_ADS_ESCRITURA = 'false';
    assert.ok(!permisos().includes('ads_management'));
    process.env.META_ADS_ESCRITURA = 'true';
  });
});
