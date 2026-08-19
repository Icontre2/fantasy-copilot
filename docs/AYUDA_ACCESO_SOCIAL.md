# Ayuda: falta configurar el acceso con Google, Apple y Facebook

> **Para quien venga a echar una mano.** Este documento describe el estado real,
> qué está hecho y qué falta. Está escrito para que se pueda actuar sin leerse
> el repo entero.
>
> **Este repositorio es PÚBLICO.** Aquí no hay ni una clave, ni un token, ni una
> contraseña, y no debe haberlos nunca. Donde hace falta un valor secreto se
> dice dónde encontrarlo, no cuál es.

## El resumen en tres líneas

El acceso con Google, Apple y Facebook **está programado y funciona**. Lo que
falta son **variables de entorno en Vercel** y **encender los proveedores en el
panel de Supabase**. No hace falta escribir código: al activarlos, los botones
aparecen solos.

## Cómo se sabe que es configuración y no código

Preguntándoselo al propio despliegue de producción:

```bash
curl -s https://fantasy-copilot-sigma.vercel.app/api/fantasy/auth/session
```

```json
{
  "authenticated": false,
  "session": {
    "modo": "SOLO_COOKIE",
    "degradado": true,
    "arreglo": "Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para que la sesión se renueve sola y dure 30 días."
  },
  "social": { "proveedores": [], "identificado": false }
}
```

Y pidiendo entrar con Google directamente:

```bash
curl -s "https://fantasy-copilot-sigma.vercel.app/api/fantasy/auth/social/start?provider=google"
# → 501 {"error":"El acceso con proveedor no está configurado en este despliegue."}
```

Ese `501` sale de `configAuth()` en `src/server/auth/supabase-oauth.ts` cuando no
encuentra las variables. No es un fallo: es la app diciendo que le falta algo.

## Lo que YA está hecho

| Pieza | Dónde |
| --- | --- |
| Ruta que manda al proveedor (PKCE) | `app/api/fantasy/auth/social/start/route.ts` |
| Vuelta del proveedor y canje del código | `app/api/fantasy/auth/social/callback/route.ts` |
| Cliente de Supabase Auth por HTTP | `src/server/auth/supabase-oauth.ts` |
| Enlace identidad ↔ cuenta de LALIGA, cifrado | `src/server/auth/links.ts` |
| Botones de Google / Apple / Facebook | `app/fantasy/LoginView.tsx` |
| Tablas `fantasy_links`, `fantasy_sessions` | Ya creadas en el proyecto de Supabase |

Las tablas existen y tienen RLS activado. Están a **0 filas**: nunca se han
usado, porque producción nunca ha llegado a conectarse.

## Lo que falta — paso 1: variables en Vercel

En **Vercel → el proyecto → Settings → Environment Variables**, entorno
**Production**:

| Variable | De dónde se saca |
| --- | --- |
| `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase → Settings → API Keys → la publicable (`sb_publishable_…`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API Keys → `service_role` |
| `SESSION_ENCRYPTION_KEY` | Generar: `openssl rand -base64 48` |

Tres avisos que cuestan tiempo si se pasan por alto:

1. **`SUPABASE_SERVICE_ROLE_KEY` nunca lleva el prefijo `NEXT_PUBLIC_`.** Esa
   clave salta el RLS: en el navegador sería dar acceso de administrador a la
   base de datos a cualquiera que abra las herramientas de desarrollo.
2. **Vercel no aplica variables nuevas a un despliegue ya hecho.** Hay que
   volver a desplegar después de guardarlas.
3. **`SESSION_ENCRYPTION_KEY` no se rota a la ligera**: cambiarla invalida todas
   las sesiones guardadas y todos los enlaces sociales existentes. Que es
   justo lo que debe pasar, pero conviene saberlo.

## Lo que falta — paso 2: el panel de Supabase

**Authentication → URL Configuration → Redirect URLs.** Añadir exactamente:

```
https://fantasy-copilot-sigma.vercel.app/api/fantasy/auth/social/callback
```

Si esta URL no está en la lista, Supabase manda al usuario a la portada y el
código de acceso se pierde por el camino, sin ningún error visible.

**Authentication → Providers.** Encender Google, Apple o Facebook con las
credenciales OAuth de cada uno (hay que crear la app en Google Cloud Console,
Apple Developer y Meta for Developers respectivamente).

No hay una variable de entorno por proveedor: **la app le pregunta a Supabase
cuáles están encendidos**, así que activar uno hace aparecer su botón sin tocar
código ni desplegar.

## Cómo comprobar que ha funcionado

Repetir la llamada del principio. Cuando esté bien:

```json
{ "social": { "proveedores": ["google"], "identificado": false, "motivo": null } }
```

Y si algo sigue faltando, **la propia pantalla de acceso lo dice**: nombra el
primer paso pendiente de los tres (variables → base de datos → proveedores). No
enseña ningún valor, solo si cada cosa está puesta o no.

## Lo que este acceso hace, y lo que NO hace

Esto es lo que más confusión genera, así que conviene leerlo antes de montarlo.

**Entrar con Google te identifica en LigaLab. No te mete en LALIGA.** Son dos
accesos distintos y LALIGA no sabe nada de Google. La primera vez hay que
conectar la cuenta de LALIGA una sola vez; a partir de ahí el enlace guardado en
`fantasy_links` la recuerda y ya se entra con un toque.

**No existe «entrar en LALIGA con Google» en un clic desde una web, y no es por
falta de ganas.** El endpoint de autorización de LALIGA solo acepta el redirect
`authredirect://com.lfp.laligafantasy`, que pertenece a su app nativa; en un
navegador ese esquema no vuelve a LigaLab. Haría falta que LALIGA registrase un
redirect HTTPS propio, o una app nativa que reciba el callback.

**Caso que afecta a cuentas creadas con Google:** esas cuentas no tienen
contraseña en el B2C de LALIGA, así que la conexión inicial no se puede hacer
con email + contraseña. Para eso existe la vía de pegar la respuesta de token
del login oficial, que la pantalla ya ofrece y que `/api/fantasy/auth/token`
valida contra la API privada de LALIGA antes de aceptarla.

Más detalle en [`LALIGA_SOCIAL_LOGIN.md`](./LALIGA_SOCIAL_LOGIN.md).

## De regalo: esto arregla otras dos cosas

Las mismas variables desbloquean dos funciones que hoy están muertas en
producción:

- **Sesión persistente.** Ahora es `SOLO_COOKIE` y dura unas 24 h. Con
  `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` + `SESSION_ENCRYPTION_KEY` pasa a
  renovarse sola y durar 30 días.
- **Avisos push.** Hoy `/api/fantasy/push/status` responde
  `{"disponible": false}`. Necesita además las claves VAPID
  (`npx web-push generate-vapid-keys`) y un correo de contacto. Ver
  `.env.example`.

## Qué se necesita de quien pida la ayuda

Un colaborador externo **no puede hacer esto solo**: hacen falta accesos que son
del dueño del proyecto.

- Acceso al panel de **Vercel** del proyecto (para las variables).
- Acceso al panel de **Supabase** (para los proveedores y la redirect URL).
- Cuentas de desarrollador de **Google**, **Apple** y/o **Meta** para crear las
  apps OAuth. Apple, además, cobra por su programa de desarrollador.

Lo que sí se puede delegar sin dar accesos: revisar este documento, crear las
apps OAuth en las consolas de cada proveedor, y comprobar el resultado con los
`curl` de arriba.
