# Gestor de Redes · Planificación del mes

App para gestionar las redes sociales de tus clientes: **planificás, el cliente
aprueba, y se publica**.

Hecha con **React + Vite + TypeScript + Tailwind**. Sin servidor funciona
igual, guardando en el navegador; con servidor la planificación se comparte y
cada cliente entra a ver lo suyo con su propio link.

Está pensada para el teléfono: cuatro secciones abajo y nada escondido detrás
de un menú.

---

## Cómo correrla

```bash
npm install
npm run dev      # abre http://localhost:5173
npm run build    # genera la versión de producción en /dist
npm run preview  # sirve la build de producción
```

Para ponerla online: **[DESPLIEGUE.md](DESPLIEGUE.md)** (la app va en Netlify;
el servidor, en Render o similar).

---

## Qué tiene

### Las cuatro secciones

| Sección | Qué hace |
| --- | --- |
| **Planificación** | El mes entero de un saque: los objetivos, qué se va a desarrollar, y una línea por contenido con su fecha, su formato, la referencia, el guion y el copy. Se baja en **PDF** para grabar, y cuando está listo se **pasa al calendario** —ella decide cuándo—. Desde acá también se carga una **tanda de historias** de una vez, pegando el texto o subiendo las placas ya diseñadas. |
| **Calendario** | Qué sale cada día, en **mes** o en **semana**, filtrando por posteos o historias. Al tocar una pieza se abre con su inspiración, su idea, su guion, su copy, sus archivos y sus comentarios. En la computadora se arrastra de un día a otro; en el teléfono la fecha se edita desde adentro. Cada pieza tiene el botón **Publicado**, que la marca de un toque con la fecha que figura. |
| **Crecimiento** | Los seguidores mes a mes, cargados a mano con los números del resumen de Instagram. Cuánto ganó desde el punto de partida, el promedio por mes y la curva. No depende de Meta, así que sirve para cualquier cuenta. |
| **Ajustes** | Las cuentas de cada cliente y sus redes, la conexión con Instagram, los **links** con los que entra cada cliente, la marca (logo y colores) y la copia de seguridad. |

Se pueden gestionar **varios clientes**: el selector está arriba a la izquierda.

### Lo que ve el cliente

Entra por un link secreto —sin usuario ni contraseña— y ve dos cosas:

- **Tu contenido**: los objetivos del mes y el calendario, en mes o en semana,
  de solo lectura. Toca una pieza, la lee entera y **aprueba o pide cambios**.
- **Tu crecimiento**: cuántos seguidores ganó la cuenta desde que la llevás vos.

El recorte lo hace el servidor: no hay forma de ver lo de otro cliente
cambiando el link. Si agrega el link a la pantalla de inicio, el ícono le abre
su contenido y no la pantalla de ingreso de ella.

### Generar con IA

Debajo de la idea, el guion y el copy: propone opciones tomando como contexto
lo que ya está cargado. Devuelve varias, no pisa nada sola y se edita antes de
guardar. Necesita `ANTHROPIC_API_KEY` en el servidor.

---

## Publicación automática

El servidor que la hace posible está en **[`server/`](server/README.md)**. La app
funciona sin él (la programación queda registrada), pero para que las piezas se
suban solas a Instagram hay que levantarlo:

```bash
cd server && npm install && cp .env.example .env   # completá los valores
npm start
```

y apuntar la app con `VITE_API_URL=http://localhost:4000`.

En **Ajustes** la app te dice en todo momento qué está conectado y qué falta,
con las direcciones para pegar en Facebook Developers ya armadas.

Dos cosas que pide Meta, no la app:

- La cuenta de Instagram tiene que ser **Business o Creator**, vinculada a una
  página de Facebook, y la app de Meta necesita el permiso
  `instagram_content_publish`.
- Meta **descarga** la pieza desde una dirección pública, así que el servidor
  tiene que ser accesible desde internet (`PUBLIC_URL`). Para probar en tu
  máquina alcanza con un túnel (`npx localtunnel --port 4000`).

Con el servidor andando y la cuenta vinculada, **Crecimiento** tiene un botón
para traer los números desde Meta. El punto de partida de la cuenta, que Meta
no conoce, nunca se pisa.

> Las claves de Meta y de Anthropic viven solo en `server/.env`, que está
> ignorado por git. El navegador nunca las ve.

---

## El espacio no se llena solo

Los archivos de los posteos del mes anterior se liberan solos: la app les saca
las piezas a lo que ya se publicó hace rato y después le pide al servidor que
borre esos archivos. Lo que quedó sin dueño lo levanta una barrida diaria. Se
configura en **Ajustes → Tu espacio**.

---

## Estructura

```
src/
  components/      UI reutilizable, layout, calendario, detalle de contenido
  views/           las cuatro secciones, más el lado del cliente
  store/           estado global con persistencia (zustand)
  lib/             fechas, formato, colores, archivos, IA, publicación
  data/            datos de ejemplo
  types.ts         modelo de datos

server/            backend: cola de publicaciones, Meta e IA (ver su README)
  src/meta.js      llamadas a la Graph API
  src/programador.js  publica lo que vence, con reintentos
  pruebas/         pruebas del servidor
```
