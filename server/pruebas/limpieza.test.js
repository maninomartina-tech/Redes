// Que no se llene el disco, sin borrar nada que haga falta.
//
// Acá el error caro no es dejar un archivo de más: es borrar la única copia de
// una pieza que todavía no salió. Por eso casi todas estas pruebas intentan
// que el servidor borre algo que no debería.
//
//   node --test pruebas/
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const tmp = mkdtempSync(join(tmpdir(), 'demm-limpieza-'));
process.env.DB_PATH = join(tmp, 'test.db');
process.env.FILES_PATH = join(tmp, 'archivos');
process.env.NODE_ENV = 'test';
process.env.USUARIO_CREADORA = 'demm';
process.env.CLAVE_CREADORA = 'clave-de-prueba';

const { app } = await import('../src/index.js');
const { db, ahora } = await import('../src/db.js');
const { guardarEspacio } = await import('../src/espacio.js');
const { archivosEnUso, archivosSinDueno, borrarArchivos, queHayGuardado } = await import(
  '../src/limpieza.js'
);

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

const conClave = () => ({ 'content-type': 'application/json', authorization: `Bearer ${sesion}` });

/** Deja un archivo de verdad en el disco y anotado en la base. */
function archivoFalso(id, { tamano = 1000, viejo = true } = {}) {
  const ruta = resolve(process.env.FILES_PATH, id);
  writeFileSync(ruta, Buffer.alloc(tamano, 1));
  const creado = viejo
    ? new Date(Date.now() - 48 * 3600_000).toISOString()
    : ahora();
  db.prepare(
    `INSERT OR REPLACE INTO archivos (id, nombre, tipo, ruta, tamano, creado_en, url_externa)
     VALUES (?, ?, ?, ?, ?, ?, NULL)`
  ).run(id, `${id}.jpg`, 'image/jpeg', ruta, tamano, creado);
  return ruta;
}

const media = (remoteId) => ({
  id: `md_${remoteId}`,
  name: 'pieza.jpg',
  kind: 'image',
  size: 1000,
  remoteId,
  url: `http://localhost/archivos/${remoteId}`,
});

describe('qué archivos están en uso', () => {
  it('los encuentra en los cuatro lugares de un contenido', () => {
    const enUso = archivosEnUso({
      posts: [
        {
          id: 'p1',
          resultado: media('ar_resultado'),
          portada: media('ar_portada'),
          carrusel: [media('ar_carrusel1'), media('ar_carrusel2')],
          inspiracionMedia: [media('ar_inspiracion')],
        },
      ],
    });

    for (const id of [
      'ar_resultado',
      'ar_portada',
      'ar_carrusel1',
      'ar_carrusel2',
      'ar_inspiracion',
    ]) {
      assert.ok(enUso.has(id), `no vio ${id}`);
    }
  });

  it('y también fuera de los contenidos: logos y marca', () => {
    const enUso = archivosEnUso({
      clients: [{ id: 'c1', logo: media('ar_logo') }],
      brandLogo: media('ar_marca'),
    });
    assert.ok(enUso.has('ar_logo'), 'el logo del cliente no se puede borrar');
    assert.ok(enUso.has('ar_marca'), 'el logo de la marca tampoco');
  });

  it('lo ve aunque esté en un campo que todavía no existe', () => {
    // El documento se recorre entero a propósito: el día que se agregue un
    // quinto lugar donde guardar una pieza, nadie se va a acordar de esta
    // lista, y barrer de más borra trabajo.
    const enUso = archivosEnUso({
      posts: [{ id: 'p1', algoNuevo: { adentro: [media('ar_futuro')] } }],
    });
    assert.ok(enUso.has('ar_futuro'));
  });

  it('y lo reconoce por la dirección, sin remoteId', () => {
    const enUso = archivosEnUso({
      posts: [{ id: 'p1', mediaUrl: 'https://demm.onrender.com/archivos/ar_porurl' }],
    });
    assert.ok(enUso.has('ar_porurl'));
  });
});

describe('la barrida de lo que no nombra nadie', () => {
  before(() => {
    db.prepare('DELETE FROM archivos').run();
    db.prepare('DELETE FROM publicaciones').run();

    archivoFalso('ar_usado');
    archivoFalso('ar_suelto');
    archivoFalso('ar_recien', { viejo: false });

    guardarEspacio({ posts: [{ id: 'p1', resultado: media('ar_usado') }] });
  });

  it('señala el suelto y deja el que se usa', () => {
    const sueltos = archivosSinDueno();
    assert.deepEqual(sueltos, ['ar_suelto']);
  });

  it('no toca uno recién subido, que todavía no está nombrado', () => {
    // Entre que se sube el archivo y que llega el contenido que lo nombra
    // pasa un segundo largo. Barrer justo en el medio borraría la pieza que se
    // acaba de subir.
    assert.ok(!archivosSinDueno().includes('ar_recien'));
  });

  it('cuenta lo que hay y lo que sobra', () => {
    const r = queHayGuardado();
    assert.equal(r.archivos, 3);
    assert.equal(r.sinDueno, 1);
    assert.equal(r.bytesSinDueno, 1000);
  });

  it('lo borra del disco y de la base', async () => {
    const ruta = resolve(process.env.FILES_PATH, 'ar_suelto');
    assert.ok(existsSync(ruta));

    const r = await borrarArchivos(['ar_suelto']);
    assert.equal(r.borrados, 1);
    assert.equal(r.bytes, 1000);
    assert.ok(!existsSync(ruta), 'el archivo sigue en el disco');
    assert.equal(db.prepare('SELECT * FROM archivos WHERE id = ?').get('ar_suelto'), undefined);
  });
});

describe('lo que no se puede borrar', () => {
  before(() => {
    db.prepare('DELETE FROM archivos').run();
    db.prepare('DELETE FROM publicaciones').run();
    archivoFalso('ar_enuso');
    archivoFalso('ar_encola');
    guardarEspacio({ posts: [{ id: 'p1', resultado: media('ar_enuso') }] });

    db.prepare(
      `INSERT INTO publicaciones
        (id, post_id, cuenta_id, tipo, caption, archivos, publicar_en, estado,
         creada_en, actualizada_en)
       VALUES ('pub1', 'p9', 'cta', 'post', '', ?, ?, 'programado', ?, ?)`
    ).run(JSON.stringify(['ar_encola']), ahora(), ahora(), ahora());
  });

  it('un archivo en uso no se borra ni aunque lo pidan', async () => {
    const r = await borrarArchivos(['ar_enuso']);

    assert.equal(r.borrados, 0);
    assert.deepEqual(r.enUso, ['ar_enuso']);
    assert.ok(existsSync(resolve(process.env.FILES_PATH, 'ar_enuso')));
  });

  it('ni uno que está esperando para publicarse', async () => {
    // No está en el espacio: vive en la cola. Borrarlo sería dejar una
    // publicación programada sin nada que subir.
    assert.ok(!archivosSinDueno().includes('ar_encola'));

    const r = await borrarArchivos(['ar_encola']);
    assert.equal(r.borrados, 0);
    assert.deepEqual(r.enUso, ['ar_encola']);
  });
});

describe('las rutas', () => {
  it('sin la clave no se puede mirar ni borrar nada', async () => {
    for (const [ruta, metodo] of [
      ['/api/almacenamiento', 'GET'],
      ['/api/almacenamiento/borrar', 'POST'],
      ['/api/almacenamiento/barrer', 'POST'],
    ]) {
      const r = await fetch(`${base}${ruta}`, {
        method: metodo,
        headers: { 'content-type': 'application/json' },
        body: metodo === 'POST' ? JSON.stringify({ ids: ['ar_enuso'] }) : undefined,
      });
      assert.equal(r.status, 401, `${metodo} ${ruta} quedó abierta`);
    }
  });

  it('con la clave, cuenta lo que hay', async () => {
    const r = await fetch(`${base}/api/almacenamiento`, { headers: conClave() });
    assert.equal(r.status, 200);
    const d = await r.json();
    assert.equal(typeof d.bytes, 'number');
    assert.ok(['disco', 'nube'].includes(d.donde));
  });

  it('borrar sin decir qué es un error, no un borrado en blanco', async () => {
    const r = await fetch(`${base}/api/almacenamiento/borrar`, {
      method: 'POST',
      headers: conClave(),
      body: JSON.stringify({ ids: [] }),
    });
    assert.equal(r.status, 400);
  });
});
