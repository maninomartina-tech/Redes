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
npm test                 # 13 pruebas de la cola
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

### Para probar en tu máquina

`PUBLIC_URL` tiene que ser alcanzable desde internet. Levantá un túnel:

```bash
npx localtunnel --port 4000     # o: ngrok http 4000
```

y poné esa dirección en `PUBLIC_URL`.

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
| `GET` | `/api/salud` | Qué está configurado y qué falta. |

---

## Estado de las pruebas

`npm test` cubre la cola completa con Meta reemplazada por un doble: alta,
vencimiento, publicación, detección de video, reintentos, cancelación, el aviso
por falta de `PUBLIC_URL` y el servido de archivos. **13 pruebas, todas pasan.**

Lo que **no** está probado contra el servicio real son las llamadas a la Graph
API, porque no hay credenciales: están escritas siguiendo la documentación de
Meta, pero la primera publicación de verdad conviene hacerla mirando.

---

## Seguridad

- El `.env` y la base de datos están en `.gitignore`: las claves nunca se suben.
- Los tokens quedan solo en el servidor; la app del navegador nunca los ve.
- `/archivos/:id` es público a propósito (Meta necesita entrar sin credenciales).
  Los nombres son aleatorios, pero no guardes ahí nada privado.
