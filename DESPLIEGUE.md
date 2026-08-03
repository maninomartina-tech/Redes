# Cómo poner la app online

Son **dos piezas separadas**, y conviene que estén en lugares distintos:

| Pieza | Dónde | Por qué |
| --- | --- | --- |
| **La app** (lo que ves y usás) | **Netlify** | Es un sitio estático. Netlify es exactamente para eso: gratis, con HTTPS y despliegue automático en cada push. |
| **El servidor** (publica en Instagram) | **Render**, Railway o Fly.io | Necesita estar siempre encendido y guardar archivos. |

La app funciona sin el servidor: podés planificar, aprobar y ver todo. Sin él
faltan dos cosas: que las piezas **se suban solas** a Instagram, y que **tus
clientes puedan ver lo suyo** —lo que está guardado en tu navegador no lo puede
abrir nadie más.

---

## Dos formas de usarlo

| | **Solo lectura** (para empezar) | **Completo** |
| --- | --- | --- |
| Tus clientes entran con su link | Sí | Sí |
| Trae el feed real y las métricas | Sí | Sí |
| Publica solo a horario | No | Sí |
| Aprobación de Meta para publicar | **No hace falta** | Sí |
| Hosting | Puede ser gratis | **Pago** |

**Arrancá por solo lectura.** Ya tenés el feed real de tus clientes, sus
métricas y el crecimiento automático, sin trámites ni gastos. La publicación
automática la activás después, cambiando `MODO_SOLO_LECTURA` a `false`.

---

## 1. La app en Netlify

1. Entrá a [netlify.com](https://netlify.com) y elegí **Add new site → Import an
   existing project**.
2. Conectá tu repositorio de GitHub y elegí este proyecto.
3. La configuración ya viene en `netlify.toml`, así que no toques nada:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. **Deploy**.

En un minuto tenés algo tipo `https://demm.netlify.app`. En *Site settings →
Domain management* podés ponerle tu propio dominio.

### Cuando tengas el servidor

Volvé a Netlify, entrá a **Site settings → Environment variables** y agregá:

```
VITE_API_URL = https://tu-servidor.onrender.com
```

Después **Deploys → Trigger deploy → Deploy site**.

> Ojo: `VITE_API_URL` se lee **al compilar**, no cuando alguien abre la página.
> Si la cambiás, hay que volver a desplegar para que tome efecto.

---

## 2. El servidor en Render

El repositorio trae un `render.yaml`, así que **no hay que armar nada a mano**:
el servicio, el disco y las variables se crean solos.

1. Entrá a [render.com](https://render.com) → **New → Blueprint**.
2. Conectá este mismo repositorio. Render lee el `render.yaml` y te muestra lo
   que va a crear.
3. Te va a pedir solo los valores secretos:
   ```
   CLAVE_CREADORA     = ...    (la clave con la que entrás vos)
   META_APP_ID        = ...
   META_APP_SECRET    = ...
   APP_ORIGIN         = https://demm.netlify.app     (tu dirección de Netlify)
   META_AD_ACCOUNT_ID = ...    (opcional, para traer ADS)
   ANTHROPIC_API_KEY  = ...    (opcional, para los informes con IA)
   ```
4. **Apply**.

Eso es todo. El disco en `/datos` y el plan ya vienen definidos en el archivo.

> **La dirección pública se configura sola.** El servidor la toma de la variable
> que Render define al desplegar, así que no hay que copiarla ni volver a
> desplegar. Lo verificás en **Cuentas** dentro de la app: ahí figura cuál está
> usando.

### Qué plan te conviene

Depende del modo:

**Modo solo lectura** → podés ir gratis. En `render.yaml` cambiás `plan: starter`
por `plan: free` y borrás el bloque `disk` (el plan gratuito no admite disco).
Dos contras, ninguna grave para este modo:

- El servicio se duerme; al tocar "Sincronizar" tarda unos segundos en despertar.
- Sin disco, en cada despliegue hay que volver a vincular la cuenta de Instagram.

**Modo completo** → tiene que ser pago, sin vuelta. En el plan gratis el
servicio se duerme, y **dormido no publica a horario**. Railway y Fly.io tienen
el mismo detalle.

### Qué pasa si el servidor se cae igual

Al volver, publica lo que venció **hace menos de 6 horas** (configurable con
`MAX_ATRASO_HORAS`). Lo más viejo queda marcado como error, no se sube: un reel
de la semana pasada saliendo hoy junto con otros tres es peor que no publicarlo.
Lo ves en la app y decidís si lo reprogramás.

---

## 3. Tu clave y los links de tus clientes

`CLAVE_CREADORA` es la que separa tu planificación del resto de internet: sin
ella nadie entra al panel, ni siquiera vos. Poné algo largo y que no uses en
otro lado.

Tus clientes **no la usan**. Cada uno entra con su propio link secreto, que
generás desde **Accesos** en la app y le mandás por privado. Con ese link ve su
semana, su feed y sus resultados —y nada más—, puede dejar comentarios y
aprobar. Si alguna vez sospechás que un link se filtró, tocás *Rehacer* y el
anterior deja de funcionar en el momento.

> Sin `CLAVE_CREADORA` la app sigue andando, pero solo contra tu navegador:
> vas a poder planificar y ver todo, y tus clientes no van a poder entrar.

---

## 4. Meta

En [developers.facebook.com](https://developers.facebook.com), dentro de tu app:

1. **Facebook Login → Settings → Valid OAuth Redirect URIs**, agregá:
   ```
   https://tu-servidor.onrender.com/api/auth/meta/callback
   ```
2. Pedí el permiso **`instagram_content_publish`**. Mientras la app esté en modo
   desarrollo, funciona con las cuentas de prueba que agregues.
3. La cuenta de Instagram tiene que ser **Business o Creator** y estar vinculada
   a una página de Facebook.

Después entrás a **Cuentas** en la app, tocás *Vincular Instagram* y elegís qué
cuenta corresponde a cada cliente.

---

## Orden recomendado

1. **Netlify primero.** Tenés la app andando y la podés usar ya, aunque sea sin
   publicación automática.
2. **El servidor con tu clave**, para entrar desde cualquier lado y empezar a
   pasarles los links a tus clientes. Con esto solo ya sirve.
3. **Meta al final**, que es lo que más tarda: la aprobación del permiso para
   publicar no es inmediata.

Mientras tanto, para probar el servidor en tu máquina sin desplegar nada:

```bash
cd server && npm run tunel
```

---

## Cómo saber si está todo bien

Entrá a **Cuentas** en la app. Ahí te dice el estado real: si el servidor
responde, si faltan credenciales, si falta la dirección pública y cuántas
cuentas de Instagram hay vinculadas.
