// Pruebas de los endpoints de sincronización.
//
// Meta se reemplaza interceptando fetch: se verifica que pedimos lo correcto y
// que devolvemos los datos con la forma que espera la app.

import { after, before, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmp = mkdtempSync(join(tmpdir(), 'demm-insights-'));
process.env.DB_PATH = join(tmp, 'test.db');
process.env.FILES_PATH = join(tmp, 'archivos');
process.env.PUBLIC_URL = 'https://ejemplo.test';
process.env.NODE_ENV = 'test';

const { app } = await import('../src/index.js');
const { db, ahora, guardarTokenDeUsuario } = await import('../src/db.js');

let servidor;
let base;
const fetchReal = globalThis.fetch;

before(async () => {
  servidor = app.listen(0);
  await new Promise((r) => servidor.once('listening', r));
  base = `http://localhost:${servidor.address().port}`;

  db.prepare(
    `INSERT OR REPLACE INTO cuentas (id, nombre, usuario, page_id, token, creada_en)
     VALUES ('ig_9', 'Aurora', '@aurora', 'pg', 'tok', ?)`
  ).run(ahora());

  // Las cuentas publicitarias cuelgan del usuario, no de la página.
  guardarTokenDeUsuario('tok-de-usuario', null);
});

after(() => {
  globalThis.fetch = fetchReal;
  servidor?.close();
  rmSync(tmp, { recursive: true, force: true });
});

/** Responde a las llamadas a Meta y deja pasar las nuestras. */
function simularMeta(rutas) {
  globalThis.fetch = async (url, opciones) => {
    const texto = String(url);
    if (!texto.includes('graph.facebook.com')) return fetchReal(url, opciones);

    for (const [patron, respuesta] of Object.entries(rutas)) {
      if (texto.includes(patron)) {
        return new Response(JSON.stringify(respuesta), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
    }
    return new Response(
      JSON.stringify({ error: { message: `métrica no soportada: ${texto}` } }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  };
}

describe('sincronización con Meta', () => {
  it('agrupa las métricas de la cuenta por mes', async () => {
    simularMeta({
      'metric=reach': {
        data: [
          {
            values: [
              { value: 100, end_time: '2026-06-15T07:00:00+0000' },
              { value: 150, end_time: '2026-06-20T07:00:00+0000' },
              { value: 300, end_time: '2026-07-05T07:00:00+0000' },
            ],
          },
        ],
      },
      'metric=follower_count': {
        data: [
          {
            values: [
              { value: 1000, end_time: '2026-06-30T07:00:00+0000' },
              { value: 1200, end_time: '2026-07-31T07:00:00+0000' },
            ],
          },
        ],
      },
      'fields=followers_count': { followers_count: 1350 },
    });

    const r = await fetch(`${base}/api/insights/cuenta/ig_9?desde=2026-06-01&hasta=2026-07-31`);
    const datos = await r.json();

    const junio = datos.meses.find((m) => m.month === '2026-06');
    assert.equal(junio.reach, 250, 'el alcance del mes se suma');
    assert.equal(junio.followers, 1000, 'los seguidores son el último valor, no la suma');

    const julio = datos.meses.find((m) => m.month === '2026-07');
    assert.equal(julio.reach, 300);

    // Las métricas que Meta rechazó se informan, no se ocultan.
    assert.ok(datos.avisos.some((a) => a.includes('profile_views')));
  });

  it('trae las publicaciones con sus métricas', async () => {
    simularMeta({
      '/media?': {
        data: [
          {
            id: 'm1',
            caption: 'Hola',
            media_type: 'IMAGE',
            timestamp: '2026-07-10T12:00:00+0000',
            permalink: 'https://instagram.com/p/1',
            like_count: 40,
            comments_count: 5,
          },
          {
            id: 'm2',
            caption: 'Reel',
            media_type: 'VIDEO',
            media_product_type: 'REELS',
            timestamp: '2026-07-12T12:00:00+0000',
            permalink: 'https://instagram.com/p/2',
            like_count: 90,
            comments_count: 8,
          },
        ],
      },
      '/m1/insights': {
        data: [
          { name: 'reach', values: [{ value: 800 }] },
          { name: 'saved', values: [{ value: 12 }] },
          { name: 'shares', values: [{ value: 3 }] },
        ],
      },
      '/m2/insights': {
        data: [
          { name: 'reach', values: [{ value: 5000 }] },
          { name: 'saved', values: [{ value: 60 }] },
          { name: 'shares', values: [{ value: 25 }] },
          { name: 'views', values: [{ value: 9000 }] },
        ],
      },
    });

    const r = await fetch(`${base}/api/insights/publicaciones/ig_9`);
    const { publicaciones } = await r.json();

    assert.equal(publicaciones.length, 2);

    const post = publicaciones.find((p) => p.externalId === 'm1');
    assert.equal(post.tipo, 'post');
    assert.deepEqual(post.metrics, {
      likes: 40,
      comments: 5,
      reach: 800,
      impressions: 800,
      saves: 12,
      shares: 3,
    });

    const reel = publicaciones.find((p) => p.externalId === 'm2');
    assert.equal(reel.tipo, 'reel');
    assert.equal(reel.metrics.views, 9000, 'los reels traen reproducciones');
  });

  it('trae las campañas de ADS con gasto y resultados', async () => {
    simularMeta({
      '/campaigns': {
        data: [
          {
            id: 'c1',
            name: 'Leads DM',
            objective: 'OUTCOME_LEADS',
            status: 'ACTIVE',
            lifetime_budget: '2500000', // Meta manda centavos
            start_time: '2026-07-01T00:00:00+0000',
            insights: {
              data: [
                {
                  spend: '14200.50',
                  impressions: '82000',
                  clicks: '2100',
                  actions: [
                    { action_type: 'lead', value: '40' },
                    { action_type: 'onsite_conversion.messaging_first_reply', value: '6' },
                    { action_type: 'post_engagement', value: '999' }, // no cuenta
                  ],
                },
              ],
            },
          },
        ],
      },
    });

    const r = await fetch(`${base}/api/ads/ig_9?adAccountId=123456`);
    const { campanas } = await r.json();

    assert.equal(campanas.length, 1);
    const c = campanas[0];
    assert.equal(c.name, 'Leads DM');
    assert.equal(c.status, 'activa');
    assert.equal(c.budget, 25000, 'el presupuesto se pasa de centavos a pesos');
    assert.equal(c.spend, 14200.5);
    assert.equal(c.conversions, 46, 'solo suma las acciones que son resultados');
  });

  it('avisa si falta el id de la cuenta publicitaria', async () => {
    const r = await fetch(`${base}/api/ads/ig_9`);
    assert.equal(r.status, 400);
    const d = await r.json();
    assert.match(d.error, /cuenta publicitaria/);
  });

  it('avisa si la cuenta no está vinculada', async () => {
    const r = await fetch(`${base}/api/insights/cuenta/no_existe`);
    assert.equal(r.status, 404);
  });

  it('devuelve el error de Meta en vez de datos incompletos', async () => {
    globalThis.fetch = async (url, opciones) => {
      const texto = String(url);
      if (!texto.includes('graph.facebook.com')) return fetchReal(url, opciones);
      return new Response(
        JSON.stringify({ error: { message: 'Token vencido' } }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    };

    const r = await fetch(`${base}/api/insights/publicaciones/ig_9`);
    const d = await r.json();
    assert.ok(d.avisos.some((a) => a.includes('Token vencido')));
  });
});
