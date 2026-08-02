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
- **Cliente** → solo ve lo aprobado, **semana a semana**, y puede dejar
  comentarios / pedir correcciones.

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

## Conectar servicios reales (siguiente paso)

La app deja **listos los puntos de conexión**. Hoy funcionan en modo demo (datos
de ejemplo / análisis local) para no depender de credenciales. Para pasarlos a
producción hace falta un backend que guarde las claves de forma segura (nunca en
el front):

### 1. Publicación automática en Instagram / Facebook
- **Qué se usa:** Graph API de Meta — *Instagram Content Publishing API*.
- **Requisitos:** app de Meta aprobada con el permiso `instagram_content_publish`,
  cuentas Business/Creator vinculadas a una página de Facebook, y tokens de larga
  duración.
- **Dónde se enchufa:** `src/lib/publish.ts` → endpoint `POST /api/publish`.

### 2. Métricas y ADS
- **Qué se usa:** Meta Graph API (Insights) y **Marketing API** para ADS.
- **Dónde se enchufa:** la sincronización reemplaza los datos de ejemplo de
  `src/data/seed.ts`; la sección ADS ya está preparada para recibirlos.

### 3. Análisis con IA (Claude)
- **Qué se usa:** API de Anthropic (Claude) para informes en lenguaje natural.
- **Dónde se enchufa:** `src/lib/ai.ts` → función `analyzeWithClaude()` →
  endpoint `POST /api/ai/analyze`. Mientras no haya backend, genera el análisis
  de forma local.

> **Importante:** las API keys de Meta y de Anthropic van siempre en el backend,
> nunca en el código del front.

---

## Estructura

```
src/
  components/      UI reutilizable, layout, detalle de post, tarjetas
  views/           cada módulo (calendario, planificación, feed, métricas, ads…)
  store/           estado global con persistencia (zustand)
  lib/             fechas, formato, motor de IA, publicación
  data/            datos de ejemplo
  types.ts         modelo de datos
```
