# Cómo poner la app online

Son **dos piezas separadas**, y conviene que estén en lugares distintos:

| Pieza | Dónde | Por qué |
| --- | --- | --- |
| **La app** (lo que ves y usás) | **Netlify** | Es un sitio estático. Netlify es exactamente para eso: gratis, con HTTPS y despliegue automático en cada push. |
| **El servidor** (publica en Instagram) | **Render**, Railway o Fly.io | Necesita estar siempre encendido y guardar archivos. |

La app funciona sin el servidor: podés planificar, aprobar y ver todo. Lo único
que falta sin él es que las piezas **se suban solas** a Instagram.

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

1. Entrá a [render.com](https://render.com) → **New → Web Service**.
2. Conectá el mismo repositorio.
3. Completá:
   - **Root Directory**: `server`
   - **Runtime**: Docker (toma el `Dockerfile` que ya está)
4. En **Environment**, cargá las variables (están explicadas en
   `server/.env.example`):
   ```
   META_APP_ID          = ...
   META_APP_SECRET      = ...
   META_AD_ACCOUNT_ID   = ...        (opcional, para traer ADS)
   ANTHROPIC_API_KEY    = ...        (opcional, para los informes con IA)
   APP_ORIGIN           = https://demm.netlify.app
   PUBLIC_URL           = https://tu-servidor.onrender.com
   ```
   `PUBLIC_URL` es la dirección que Render te asigna: la ponés después del
   primer despliegue y volvés a desplegar.
5. En **Disks**, agregá uno montado en `/datos` (1 GB alcanza para empezar).
   Ahí viven la base de datos y las piezas subidas; sin disco se borran en cada
   despliegue.

### Por qué importa el plan

En el **plan gratis de Render el servicio se duerme** después de un rato sin
visitas. Si se duerme, **no publica a horario**. Para que la programación
funcione de verdad hace falta un plan que lo mantenga despierto (el más barato
alcanza). Railway y Fly.io tienen el mismo detalle.

### Qué pasa si el servidor se cae igual

Al volver, publica lo que venció **hace menos de 6 horas** (configurable con
`MAX_ATRASO_HORAS`). Lo más viejo queda marcado como error, no se sube: un reel
de la semana pasada saliendo hoy junto con otros tres es peor que no publicarlo.
Lo ves en la app y decidís si lo reprogramás.

---

## 3. Meta

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
2. **Meta después**, que es lo que más tarda: la aprobación del permiso no es
   inmediata.
3. **El servidor al final**, cuando tengas las credenciales.

Mientras tanto, para probar el servidor en tu máquina sin desplegar nada:

```bash
cd server && npm run tunel
```

---

## Cómo saber si está todo bien

Entrá a **Cuentas** en la app. Ahí te dice el estado real: si el servidor
responde, si faltan credenciales, si falta la dirección pública y cuántas
cuentas de Instagram hay vinculadas.
