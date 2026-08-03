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
npm test                 # 46 pruebas
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
| `USUARIO_CREADORA` | Con qué usuario entrás al panel. Si no se define, es `demm`. |
| `CLAVE_CREADORA` | Tu contraseña. Sin esto el espacio compartido queda apagado: la app anda igual, pero solo contra tu navegador. |
| `PUBLIC_URL` | La dirección pública del servidor: Meta descarga las piezas desde acá. **En Render y Railway se detecta sola**; solo hace falta cargarla en otros hostings. No sirve `localhost`. |
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

En la raíz del repo hay un `render.yaml`: en [Render](https://render.com) se
elige **New → Blueprint**, se apunta al repositorio y queda todo creado, pidiendo
solo los valores secretos. También hay un `Dockerfile` para
[Railway](https://railway.app), [Fly.io](https://fly.io) o cualquier otro.

**En Render y en Railway la dirección se configura sola**: el servidor la toma
de la variable que la plataforma define al desplegar (`RENDER_EXTERNAL_URL` /
`RAILWAY_PUBLIC_DOMAIN`). Solo hace falta cargar `PUBLIC_URL` a mano si usás
otro hosting.

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
5. Si el servidor estuvo caído, al volver publica lo que venció hace poco (hasta
   `MAX_ATRASO_HORAS`, 6 por defecto). Lo más viejo **no se sube**: queda en
   error para que decidas si todavía sirve. Es a propósito — un reel de la
   semana pasada saliendo hoy, y encima junto con otros tres, es peor que no
   publicarlo.

Formatos soportados: post, reel, carrusel (hasta 10 piezas) e historia.

---

## Endpoints

| Método | Ruta | Qué hace |
| --- | --- | --- |
| `POST` | `/api/auth/entrar` | Entra con usuario y contraseña, y devuelve una sesión. |
| `GET`/`PUT` | `/api/espacio` | Lee o guarda todo tu espacio de trabajo. Pide sesión. |
| `POST`/`DELETE` | `/api/portales/:clienteId` | Crea o da de baja el link de un cliente. Pide sesión. |
| `GET` | `/api/portal/:token` | Lo que ve un cliente con su link: **solo lo suyo**. |
| `POST` | `/api/portal/:token/comentario` | El cliente deja una corrección. |
| `POST` | `/api/portal/:token/decision` | El cliente aprueba o pide cambios. |
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

## Modo solo lectura

Con `MODO_SOLO_LECTURA=true` el servidor se conecta a Instagram únicamente para
traer el feed y las métricas:

- No le pide a Meta el permiso de publicar, así que **no hace falta la
  aprobación** para empezar.
- El programador no arranca, y si se intenta programar algo el servidor lo
  rechaza explicando por qué.
- Como no hay nada que publicar a horario, el servicio puede dormirse sin que
  se pierda ninguna publicación.

Ojo: eso **no** quiere decir que sirva un hosting sin disco. El espacio de
trabajo vive en la base de datos, así que sin disco persistente se borra en
cada despliegue.

Es la forma recomendada de arrancar. Para activar la publicación automática,
poné `false`.

## Sincronización

Además de publicar, el servidor trae de Meta lo que hoy se carga a mano:

- **Crecimiento** → seguidores, alcance e interacción, mes a mes.
- **Feed** → las publicaciones que ya están en Instagram entran a la grilla de
  la app, con su portada y su texto. Lo que se planificó acá y ya salió se
  actualiza en vez de duplicarse.
- **Métricas** → likes, comentarios, guardados, compartidos y alcance de cada
  publicación.
- **ADS** → campañas con gasto, impresiones, clics y resultados.

Lo que Meta no conoce —las consultas por WhatsApp, las ventas y el punto de
partida de la cuenta— **nunca se toca**: eso sigue siendo tuyo.

Si Meta rechaza alguna métrica (los nombres cambian entre versiones de la API),
la app lo dice en pantalla en vez de mostrar un hueco sin explicación.

## El espacio de trabajo y los links de cliente

Todo lo que cargás —clientes, contenido, crecimiento, ventas— vive acá y no en
el navegador. Es lo que hace posibles dos cosas que antes no lo eran: entrar
desde cualquier dispositivo, y que un cliente vea su planificación.

- **Vos** entrás con `USUARIO_CREADORA` y `CLAVE_CREADORA`, y ves todo.
- **Cada cliente** entra con un link secreto (`#/c/<token>`), sin usuario ni
  contraseña, y ve **únicamente lo suyo**. Los links se generan desde *Accesos*
  en la app; rehacer uno da de baja el anterior en el momento.

El recorte lo hace el servidor, no la app: filtrar en el navegador no sirve de
nada, porque la respuesta completa se puede mirar igual. Lo que un cliente
recibe es su cliente, sus contenidos, sus campañas y sus métricas —las ventas
solo si ese cliente las mide— y nada más: ni la lista de clientes ni los ADS.
Desde su link solo puede comentar y aprobar o pedir cambios; no puede publicar
ni tocar contenido ajeno.

Se guarda como un único documento JSON: hay una sola persona escribiendo y el
volumen es chico, así que no compensa la complejidad de un esquema relacional.

## Estado de las pruebas

`npm test` corre **46 pruebas** con Meta reemplazada por un doble:

- **Cola (15):** alta, vencimiento, publicación, detección de video, reintentos,
  cancelación, reprogramación, el aviso por falta de `PUBLIC_URL`, el servido de
  archivos y el límite de atraso (publica lo de hace 10 minutos, no lo de hace
  dos días).
- **Sincronización (6):** agrupación por mes (el alcance se suma, los seguidores
  no), métricas por publicación, conversión de centavos a pesos en ADS, filtrado
  de las acciones que sí son resultados, y que los errores de Meta se informen
  en vez de devolver datos incompletos.
- **Solo lectura (6):** que no se pida el permiso de publicar, que sí se pidan
  los de métricas y ADS, que se rechace programar con una explicación, y que el
  feed llegue con la portada correcta (en los videos, la miniatura).
- **Espacio y portales (19):** que sin usuario y contraseña correctos no se
  entre —y que el error no diga cuál de los dos está mal—, que sin sesión no se
  lea ni se escriba nada,
  que al cerrar sesión el token deje de servir, que un cliente vea solo lo suyo
  —comprobado sobre la respuesta, no sobre la pantalla—, que las ventas lleguen
  solo a quien las mide, que no pueda comentar ni cambiar el estado de otro
  cliente, que no pueda declarar algo "publicado", que no pueda administrar
  links, que al rehacer un link el anterior deje de funcionar, y que su
  comentario y su aprobación te lleguen.

Lo que **no** está probado contra el servicio real son las llamadas a la Graph
API, porque no hay credenciales: están escritas siguiendo la documentación de
Meta, pero la primera publicación de verdad conviene hacerla mirando.

---

## Seguridad

- El `.env` y la base de datos están en `.gitignore`: las claves nunca se suben.
- **Mandá cada link de cliente en privado.** No hay contraseña: quien lo tenga,
  entra. Si sospechás que se filtró, rehacelo desde *Accesos* y el viejo muere
  al instante.
- Los tokens quedan solo en el servidor; la app del navegador nunca los ve.
- `/archivos/:id` es público a propósito (Meta necesita entrar sin credenciales).
  Los nombres son aleatorios, pero no guardes ahí nada privado.
