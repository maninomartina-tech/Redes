# Gestor de Redes · Planificación & Métricas

App para gestionar las redes sociales de tus clientes: **planificás, el cliente
aprueba, y se publica**. Incluye calendario dinámico, vista del feed, historias,
métricas con IA, seguimiento de ADS y recomendaciones de contenido.

Hecha con **React + Vite + TypeScript + Tailwind**. Los datos se guardan en el
navegador (localStorage), así que funciona sin backend para probarla.

---

## Cómo correrla

```bash
npm install
npm run dev      # abre http://localhost:5173
npm run build    # genera la versión de producción en /dist
npm run preview  # sirve la build de producción
```

---

## Qué incluye

### Dos vistas según el rol (botón arriba a la derecha)

- **Creadora** → tu panel de trabajo: planificación completa, producción,
  métricas, ADS y conexiones.
- **Cliente** → entra a un panel propio con la bienvenida a su cuenta, el
  resumen del feed, lo que viene esta semana y lo que espera su aprobación.
  Desde ahí llega a su semana, su feed, sus resultados y las recomendaciones.

### Módulos

| Módulo | Qué hace |
| --- | --- |
| **Panel general** | Resumen del cliente: qué falta revisar, próximas publicaciones y correcciones abiertas. |
| **Calendario** | Todo el contenido del mes por día, con estado y formato. |
| **Planificación** | Tablero por etapas (idea → producción → revisión → aprobado → programado → publicado). |
| **Detalle del contenido** | **Inspiración** (de dónde nace: tendencia, link y imágenes de referencia), las **3 partes** —1) idea general, 2) guion/diálogo o contenido, 3) copy—, el **resultado final** que se sube desde el dispositivo o arrastrando, y los comentarios. Se guarda con *Guardar cambios*; si intentás cerrar con cambios pendientes, avisa. |
| **Vista del feed** | Mockup de la grilla de Instagram para ver cómo queda el feed del mes. |
| **Historias** | Planificador semanal de historias, día por día. |
| **Métricas + IA** | Análisis de cada campaña por mes, con insights automáticos. |
| **Crecimiento** | Carga manual mes a mes: seguidores, interacción y alcance. Más las consultas por WhatsApp/DM y las ventas que se concretaron. No depende de Meta. |
| **ADS** | Seguimiento de campañas pagas: gasto, CTR, costo por resultado. |
| **Recomendaciones** | Qué repetir y qué ajustar, según el contenido ya publicado. |
| **Marca** | El logo y los colores de la app, editables desde adentro. Con el tono fuerte, el suave y el fondo se genera toda la paleta; avisa si algún color queda ilegible. También el logo de cada cliente. |
| **Cuentas** | Conexión de las cuentas de cada cliente para publicar. |

Se pueden gestionar **varios clientes** (selector arriba a la izquierda). El botón
de restaurar (↺) vuelve a los datos de ejemplo.

### Crecimiento de la cuenta

Pensado para mostrarle al cliente el valor del trabajo, sin depender de la API
de Meta:

- **Punto de partida**: seguidores que tenía la cuenta el día que se tomó. Todo
  el crecimiento se mide contra ese número.
- **Registro mensual**: seguidores al cierre, interacción y alcance. Si no se
  carga la interacción de un mes, se calcula sola con los posts publicados de
  ese mes (aparece marcada como `est.`).
- **Consultas y ventas**: se cargan a mano porque suelen llegar por WhatsApp.
  Cada consulta guarda de dónde vino, en qué estado está y el monto si se
  concretó.
- El interruptor **"Este cliente mide ventas"** decide si el cliente ve o no ese
  bloque en sus resultados — algunos clientes no lo miden.

---

## Publicación automática de verdad

El servidor que la hace posible está en **[`server/`](server/README.md)**. La app
funciona sin él (la programación queda registrada), pero para que las piezas se
suban solas a Instagram hay que levantarlo:

```bash
cd server && npm install && cp .env.example .env   # completá los valores
npm start
```

y apuntar la app con `VITE_API_URL=http://localhost:4000`.

En **Cuentas** la app te dice en todo momento qué está conectado y qué falta.

Dos cosas que pide Meta, no la app:

- La cuenta de Instagram tiene que ser **Business o Creator**, vinculada a una
  página de Facebook, y la app de Meta necesita el permiso
  `instagram_content_publish`.
- Meta **descarga** la pieza desde una dirección pública, así que el servidor
  tiene que ser accesible desde internet (`PUBLIC_URL`). Para probar en tu
  máquina alcanza con un túnel (`npx localtunnel --port 4000`).

### Métricas y ADS
Con el servidor andando y la cuenta vinculada, **Crecimiento** y **ADS** tienen
un botón para traer los datos desde Meta: seguidores, alcance e interacción mes
a mes, y las campañas con su gasto y resultados.

Lo que Meta no conoce —las consultas por WhatsApp, las ventas y el punto de
partida de la cuenta— nunca se pisa.

### Análisis con IA
Ya está: el servidor expone `POST /api/ai/analyze` contra la API de Claude.
Se activa cargando `ANTHROPIC_API_KEY` en `server/.env`. Sin esa clave, el
análisis se genera igual de forma local.

> Las claves de Meta y de Anthropic viven solo en `server/.env`, que está
> ignorado por git. El navegador nunca las ve.

---

## Estructura

```
src/
  components/      UI reutilizable, layout, detalle de post, tarjetas
  views/           cada módulo (calendario, planificación, feed, métricas, ads…)
  store/           estado global con persistencia (zustand)
  lib/             fechas, formato, colores, archivos, motor de IA, publicación
  data/            datos de ejemplo
  types.ts         modelo de datos

server/            backend: cola de publicaciones, Meta e IA (ver su README)
  src/meta.js      llamadas a la Graph API
  src/programador.js  publica lo que vence, con reintentos
  pruebas/         pruebas de la cola
```
