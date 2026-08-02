// ---------------------------------------------------------------------------
// Abre un túnel a internet y arranca el servidor ya configurado.
//
// Meta necesita bajar las piezas desde una dirección pública, y `localhost` no
// le sirve. Este script consigue esa dirección y se la pasa al servidor, así no
// hay que copiar y pegar nada a mano.
//
//   npm run tunel
//
// Para producción conviene un servidor de verdad (ver el README): el túnel
// cambia de dirección cada vez que se reinicia y solo vive mientras esta
// terminal esté abierta.
// ---------------------------------------------------------------------------

import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import localtunnel from 'localtunnel';
import 'dotenv/config';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT ?? 4000);

console.log('Abriendo el túnel…');

let tunel;
try {
  tunel = await localtunnel({ port: PORT, subdomain: process.env.TUNNEL_SUBDOMAIN });
} catch (e) {
  console.error(`\nNo se pudo abrir el túnel: ${e.message}`);
  console.error('Probá de nuevo, o usá otra opción del README (ngrok, Cloudflare, hosting).');
  process.exit(1);
}

console.log(`\n  Dirección pública:  ${tunel.url}`);
console.log(`  Servidor local:     http://localhost:${PORT}\n`);
console.log('  Dejá esta terminal abierta mientras uses la app.');
console.log('  Al cerrarla, la dirección deja de funcionar.\n');

// El servidor arranca con la dirección del túnel ya puesta.
const servidor = spawn(process.execPath, [resolve(raiz, 'src/index.js')], {
  stdio: 'inherit',
  env: { ...process.env, PUBLIC_URL: tunel.url },
});

const cerrar = () => {
  servidor.kill();
  tunel.close();
  process.exit(0);
};

tunel.on('close', () => {
  console.error('\nEl túnel se cerró. Cortando el servidor para no publicar con una dirección caída.');
  cerrar();
});

process.on('SIGINT', cerrar);
process.on('SIGTERM', cerrar);
servidor.on('exit', (code) => {
  tunel.close();
  process.exit(code ?? 0);
});
