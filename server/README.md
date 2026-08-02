# Servidor de Demm

Es el que hace que la publicación automática funcione de verdad: guarda la cola,
sube las piezas y las publica en Instagram a la hora programada.

**Por qué hace falta un servidor.** El navegador no puede publicar solo: si a
las 19:00 tenés la app cerrada, nadie sube nada. Además, Meta **descarga** la
pieza desde una dirección pública — no se le puede mandar el archivo adjunto —
así que alguien tiene que guardarla y servirla.

---

## Puesta en marcha

```bash
cd server
npm install
cp .env.example .env     # completá los valores
npm start                # queda escuchando en el puerto 4000
npm test                 # 19 pruebas
```

Después, en la app (carpeta de arriba), apuntá al servidor:

```bash
# .env de la app
VITE_API_URL=http://localhost:4000
```

Sin `VITE_API_URL` la app funciona igual, pero la programación queda solo
registrada: no se sube sola.

---

## Qué hay que configurar

Todo va en `server/.env` (ver `.env.example`):

| Variable | Para qué |
| --- | --- |
| `PUBLIC_URL` | **La más importante.** La dirección pública del servidor: Meta descarga las piezas desde acá. No sirve `localhost`. |
| `META_APP_ID` / `META_APP_SECRET` | De tu app en [developers.facebook.com](https://developers.facebook.com). |
| `APP_ORIGIN` | Desde dónde se abre la app, para permitir las llamadas del navegador. |
| `ANTHROPIC_API_KEY` | Opcional: informes con IA en lenguaje natural. |

### Cómo conseguir la dirección pública

`PUBLIC_URL` tiene que ser alcanzable desde internet: `localhost` no le sirve a
Meta. Dos caminos:

**1. Para probar — un túnel, en un comando**

```bash
npm run tunel
```

Abre un túnel, consigue la dirección y arranca el servidor ya configurado; no
hay que copiar nada. Tené en cuenta que:

- La dirección **cambia cada vez** que lo reiniciás, así que hay que actualizar
  la URL de redirección en la app de Meta cada vez.
- Solo vive mientras esa terminal esté abierta. Si la cerrás a las 3 de la
  mañana, lo programado para las 9 no sale.

**2. Para usarlo en serio — un servidor con dirección fija**

Hay un `Dockerfile` listo. En [Render](https://render.com),
[Railway](https://railway.app) o [Fly.io](https://fly.io) alcanza con apuntar al
repo, elegir la carpeta `server/`, cargar las variables del `.env` y montar un
volumen en `/datos` (ahí viven la base y las piezas subidas). Te queda una
dirección fija tipo `https://demm-server.onrender.com`, que es la que va en
`PUBLIC_URL` y en la app de Meta.

Para publicar a horario **esta es la opción recomendada**: el túnel depende de
que tu computadora esté prendida.

### Requisitos de Meta

Esto lo pide Meta, no la app:

1. La cuenta de Instagram tiene que ser **Business o Creator**.
2. Tiene que estar **vinculada a una página de Facebook**.
3. Tu app de Meta necesita el permiso **`instagram_content_publish`** aprobado
   (mientras esté en desarrollo, funciona con las cuentas de prueba que agregues).

Con eso listo, entrás a **Cuentas** en la app y tocás *Vincular Instagram*.

---

## Cómo funciona

1. Cuando aprobás un contenido con la pieza cargada, la app **sube el archivo**
   al servidor (`POST /api/media`) y después **agenda** la publicación
   (`POST /api/publicaciones/programar`).
2. El servidor guarda la pieza en disco y la sirve en `/archivos/:id`.
3. Cada minuto, el programador busca lo que ya venció y publica con la Graph
   API: crea el contenedor, espera a que Meta procese el video si hace falta, y
   publica.
4. Si falla, **reintenta hasta 3 veces** y guarda el motivo. Después de eso
   queda en error, visible desde la app.

Formatos soportados: post, reel, carrusel (hasta 10 piezas) e historia.

---

## Endpoints

| Método | Ruta | Qué hace |
| --- | --- | --- |
| `POST` | `/api/media` | Sube un archivo. Devuelve su id y su URL pública. |
| `GET` | `/archivos/:id` | Sirve el archivo. **Público**: es de donde lo baja Meta. |
| `POST` | `/api/publicaciones/programar` | Agenda una publicación. |
| `GET` | `/api/publicaciones` | Ve la cola y el estado de cada una. |
| `DELETE` | `/api/publicaciones/:id` | Cancela (si todavía no salió). |
| `POST` | `/api/publicaciones/procesar-ahora` | Fuerza el procesamiento, para probar. |
| `GET` | `/api/auth/meta/login` | Arranca la vinculación de una cuenta. |
| `GET` | `/api/cuentas` | Cuentas vinculadas. |
| `POST` | `/api/ai/analyze` | Informe de campaña con Claude. |
| `GET` | `/api/insights/cuenta/:id` | Seguidores, alcance e interacción, por mes. |
| `GET` | `/api/insights/publicaciones/:id` | Métricas de cada publicación reciente. |
| `GET` | `/api/ads/:cuentaId` | Campañas de Meta Ads con gasto y resultados. |
| `GET` | `/api/salud` | Qué está configurado y qué falta. |

---

## Sincronización

Además de publicar, el servidor trae de Meta lo que hoy se carga a mano:

- **Crecimiento** → seguidores, alcance e interacción, mes a mes.
- **Métricas** → likes, comentarios, guardados, compartidos y alcance de cada
  publicación.
- **ADS** → campañas con gasto, impresiones, clics y resultados.

Lo que Meta no conoce —las consultas por WhatsApp, las ventas y el punto de
partida de la cuenta— **nunca se toca**: eso sigue siendo tuyo.

Si Meta rechaza alguna métrica (los nombres cambian entre versiones de la API),
la app lo dice en pantalla en vez de mostrar un hueco sin explicación.

## Estado de las pruebas

`npm test` corre **19 pruebas** con Meta reemplazada por un doble:

- **Cola (13):** alta, vencimiento, publicación, detección de video, reintentos,
  cancelación, reprogramación, el aviso por falta de `PUBLIC_URL` y el servido
  de archivos.
- **Sincronización (6):** agrupación por mes (el alcance se suma, los seguidores
  no), métricas por publicación, conversión de centavos a pesos en ADS, filtrado
  de las acciones que sí son resultados, y que los errores de Meta se informen
  en vez de devolver datos incompletos.

Lo que **no** está probado contra el servicio real son las llamadas a la Graph
API, porque no hay credenciales: están escritas siguiendo la documentación de
Meta, pero la primera publicación de verdad conviene hacerla mirando.

---

## Seguridad

- El `.env` y la base de datos están en `.gitignore`: las claves nunca se suben.
- Los tokens quedan solo en el servidor; la app del navegador nunca los ve.
- `/archivos/:id` es público a propósito (Meta necesita entrar sin credenciales).
  Los nombres son aleatorios, pero no guardes ahí nada privado.
