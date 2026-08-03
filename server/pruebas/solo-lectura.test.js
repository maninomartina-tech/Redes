// Modo solo lectura: se trae el feed y las métricas, no se publica.

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmp = mkdtempSync(join(tmpdir(), 'demm-lectura-'));
process.env.DB_PATH = join(tmp, 'test.db');
process.env.FILES_PATH = join(tmp, 'archivos');
process.env.MODO_SOLO_LECTURA = 'true';
process.env.META_APP_ID = '123';
process.env.PUBLIC_URL = 'https://ejemplo.test';
process.env.NODE_ENV = 'test';

const { app } = await import('../src/index.js');
const { db, ahora } = await import('../src/db.js');
const { permisos, soloLectura } = await import('../src/config.js');

let servidor;
let base;
const fetchReal = globalThis.fetch;

before(async () => {
  servidor = app.listen(0);
  await new Promise((r) => servidor.once('listening', r));
  base = `http://localhost:${servidor.address().port}`;
  db.prepare(
    `INSERT OR REPLACE INTO cuentas (id, nombre, usuario, page_id, token, creada_en)
     VALUES ('ig_1', 'Aurora', '@aurora', 'pg', 'tok', ?)`
  ).run(ahora());
});

after(() => {
  globalThis.fetch = fetchReal;
  servidor?.close();
  rmSync(tmp, { recursive: true, force: true });
});

describe('modo solo lectura', () => {
  it('está activo', () => {
    assert.equal(soloLectura(), true);
  });

  it('no le pide a Meta el permiso de publicar', () => {
    const p = permisos();
    assert.ok(!p.includes('instagram_content_publish'), 'no debe pedir publicar');
    assert.ok(p.includes('instagram_basic'));
    assert.ok(p.includes('instagram_manage_insights'), 'sí necesita el de métricas');
    assert.ok(p.includes('ads_read'), 'sí necesita el de ADS');
  });

  it('el enlace de conexión refleja esos permisos', async () => {
    const r = await fetch(`${base}/api/auth/meta/login`, { redirect: 'manual' });
    const destino = r.headers.get('location') ?? '';
    assert.ok(destino.includes('instagram_manage_insights'));
    assert.ok(!destino.includes('instagram_content_publish'));
  });

  it('rechaza programar y explica por qué', async () => {
    const r = await fetch(`${base}/api/publicaciones/programar`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        postId: 'p1',
        accountId: 'ig_1',
        publishAt: new Date().toISOString(),
        archivos: ['x'],
      }),
    });
    assert.equal(r.status, 409);
    const d = await r.json();
    assert.match(d.error, /solo lectura/);
  });

  it('lo informa en el estado del servidor', async () => {
    const d = await (await fetch(`${base}/api/salud`)).json();
    assert.equal(d.soloLectura, true);
  });

  it('sí trae el feed, con la portada de cada publicación', async () => {
    globalThis.fetch = async (url, op) => {
      const t = String(url);
      if (!t.includes('graph.facebook.com')) return fetchReal(url, op);
      if (t.includes('/media?')) {
        return Response.json({
          data: [
            {
              id: 'm1',
              caption: 'Primera línea\nsegunda',
              media_type: 'IMAGE',
              timestamp: '2026-07-10T12:00:00+0000',
              permalink: 'https://instagram.com/p/1',
              media_url: 'https://cdn.test/foto.jpg',
              like_count: 10,
              comments_count: 2,
            },
            {
              id: 'm2',
              media_type: 'VIDEO',
              media_product_type: 'REELS',
              timestamp: '2026-07-12T12:00:00+0000',
              permalink: 'https://instagram.com/p/2',
              media_url: 'https://cdn.test/video.mp4',
              thumbnail_url: 'https://cdn.test/portada.jpg',
              like_count: 50,
              comments_count: 4,
            },
          ],
        });
      }
      return Response.json({ data: [{ name: 'reach', values: [{ value: 100 }] }] });
    };

    const { publicaciones } = await (
      await fetch(`${base}/api/insights/publicaciones/ig_1`)
    ).json();

    assert.equal(publicaciones.length, 2);

    const foto = publicaciones.find((p) => p.externalId === 'm1');
    assert.equal(foto.imagen, 'https://cdn.test/foto.jpg');

    const reel = publicaciones.find((p) => p.externalId === 'm2');
    assert.equal(reel.imagen, 'https://cdn.test/portada.jpg', 'en video va la portada');
    assert.equal(reel.tipo, 'reel');
  });
});
