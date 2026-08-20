# Estado del acceso con Google, Apple y Facebook

> **Para quien venga a echar una mano.** Describe el estado real: qué está hecho,
> qué falta y cómo comprobarlo sin leerse el repo entero.
>
> **Este repositorio es PÚBLICO.** Aquí no hay ni una clave, ni un token, ni una
> contraseña, y no debe haberlos nunca. Donde hace falta un valor secreto se dice
> dónde encontrarlo, no cuál es.
>
> Última revisión: 20 de agosto de 2026, contra el despliegue de producción.

## El resumen en tres líneas

Google **está encendido y el botón sale**. El código para enlazar tu cuenta de
LALIGA con esa identidad ya no necesita clave de administrador: funciona con la
clave publicable. Lo único que falta para que el acceso social sea útil de verdad
es **una variable de entorno**: `SESSION_ENCRYPTION_KEY`.

## Cómo se comprueba, sin creerse nada

```bash
curl -s https://fantasy-copilot-sigma.vercel.app/api/fantasy/auth/session
```

Lo que importa de la respuesta:

| Campo | Qué significa |
| --- | --- |
| `social.proveedores` | Los que Supabase tiene encendidos. Si sale `["google"]`, el botón de Google aparece. |
| `social.motivo` | `null` = el acceso social funciona entero. Si no, dice **exactamente** qué falta. |
| `session.clave` | `explicita` / `vercel` / `ninguna`. De dónde sale la clave con la que se cifra. |

`session.clave` es el campo que hay que mirar:

- **`explicita`** — hay `SESSION_ENCRYPTION_KEY`. Es lo que debe salir.
- **`vercel`** — se está usando `VERCEL_OIDC_TOKEN`, que **rota**. Todo parece
  funcionar hasta el siguiente despliegue, y entonces las sesiones y los enlaces
  guardados dejan de poder descifrarse. Es el peor de los tres, porque no da la
  cara.
- **`ninguna`** — no se puede guardar nada cifrado. El enlace social no se
  guarda, y la app lo dice en pantalla en vez de fingir que sí.

## Lo que falta: una variable

En **Vercel → el proyecto → Settings → Environment Variables**, entorno
**Production**:

| Variable | De dónde se saca | Para qué |
| --- | --- | --- |
| `SESSION_ENCRYPTION_KEY` | Generar: `openssl rand -base64 48` | Cifrar sesiones y enlaces con una clave que no cambie |

Tres avisos que cuestan tiempo si se pasan por alto:

1. **Vercel no aplica variables nuevas a un despliegue ya hecho.** Hay que volver
   a desplegar después de guardarla.
2. **No se rota a la ligera**: cambiarla invalida todas las sesiones guardadas y
   todos los enlaces sociales existentes. Que es justo lo que debe pasar, pero
   conviene saberlo.
3. **Nada de esto lleva nunca el prefijo `NEXT_PUBLIC_`.**

### Opcionales, para otras funciones

Estas ya no hacen falta para el acceso social, pero desbloquean lo suyo:

| Variable | Qué desbloquea |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Sesión persistente de 30 días en vez de cookie de 24 h |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Los avisos push, hoy apagados |
| `CRON_SECRET` | El repaso periódico de cláusulas |

`SUPABASE_SERVICE_ROLE_KEY` **nunca** lleva `NEXT_PUBLIC_`: esa clave salta el
RLS, y en el navegador sería dar acceso de administrador a la base de datos a
cualquiera que abra las herramientas de desarrollo.

## Cómo está montado, y por qué así

El enlace entre «quién eres» y «tu cuenta de LALIGA» vive en `fantasy_links`.
Antes solo lo podía escribir `service_role`, y se intentaba escribir al entrar
con la contraseña — que es justo el momento en el que no hay ningún token de
Supabase con el que actuar en nombre del usuario. Resultado: no se guardaba
nunca, y «entrar con Google» acababa pidiendo la contraseña igual.

Ahora se resuelve **al volver del proveedor**, que es la única petición de toda
la app que tiene las dos mitades a la vez:

- Vuelves **con** sesión de LALIGA → se guarda el enlace. Eso es «vincular», y se
  lanza desde **Más → Tu cuenta** estando ya dentro.
- Vuelves **sin** sesión de LALIGA → se lee el enlace y se te abre la sesión.

La tabla lleva cuatro políticas de RLS que atan cada fila a su dueño
(`supabase/migrations/20260820_fantasy_links_rls.sql`): con el JWT del propio
usuario se alcanza su fila y ninguna otra. Y los tokens van cifrados en la
aplicación, así que ni con acceso directo a la base se lee un token de LALIGA.

| Pieza | Dónde |
| --- | --- |
| Ruta que manda al proveedor (PKCE) | `app/api/fantasy/auth/social/start/route.ts` |
| Vuelta del proveedor, canje y enlace | `app/api/fantasy/auth/social/callback/route.ts` |
| Cliente de Supabase Auth por HTTP | `src/server/auth/supabase-oauth.ts` |
| Almacén de enlaces sobre PostgREST | `src/server/auth/links.ts` |
| Botones en la pantalla de acceso | `app/fantasy/LoginView.tsx` |
| Botón de vincular estando dentro | `app/fantasy/CuentaView.tsx` |

## El panel de Supabase

**Authentication → URL Configuration → Redirect URLs.** Tiene que estar
exactamente:

```
https://fantasy-copilot-sigma.vercel.app/api/fantasy/auth/social/callback
```

Si esta URL no está en la lista, Supabase manda al usuario a la portada y el
código de acceso se pierde por el camino, sin ningún error visible.

**Authentication → Providers.** Google ya está encendido. Apple y Facebook no:
hace falta crear la app OAuth en Apple Developer y en Meta for Developers. **No
hay una variable de entorno por proveedor**: la app le pregunta a Supabase cuáles
están encendidos, así que activar uno hace aparecer su botón sin tocar código ni
desplegar.

## Lo que este acceso hace, y lo que NO hace

Esto es lo que más confusión genera, así que conviene leerlo antes de montarlo.

**Entrar con Google te identifica en LigaLab. No te mete en LALIGA.** Son dos
accesos distintos y LALIGA no sabe nada de Google. La primera vez hay que
conectar la cuenta de LALIGA una sola vez; a partir de ahí el enlace la recuerda
y ya se entra con un toque.

**No existe «entrar en LALIGA con Google» en un clic desde una web, y no es por
falta de ganas.** El endpoint de autorización de LALIGA solo acepta el redirect
`authredirect://com.lfp.laligafantasy`, que pertenece a su app nativa; en un
navegador ese esquema no vuelve a LigaLab. Haría falta que LALIGA registrase un
redirect HTTPS propio, o una app nativa que reciba el callback.

**Caso que afecta a cuentas creadas con Google:** esas cuentas no tienen
contraseña en el B2C de LALIGA, así que la conexión inicial no se puede hacer con
email + contraseña — el error que devuelve B2C es `AADB2C90225`. Para eso existe
la vía de pegar la respuesta de token del login oficial, que la pantalla ya
ofrece y que `/api/fantasy/auth/token` valida contra la API privada de LALIGA
antes de aceptarla.

Más detalle en [`LALIGA_SOCIAL_LOGIN.md`](./LALIGA_SOCIAL_LOGIN.md).

## Qué se necesita de quien pida la ayuda

Un colaborador externo **no puede hacer esto solo**: hacen falta accesos que son
del dueño del proyecto.

- Acceso al panel de **Vercel** del proyecto (para las variables).
- Acceso al panel de **Supabase** (para los proveedores y la redirect URL).
- Cuentas de desarrollador de **Apple** y/o **Meta** para crear las apps OAuth
  que faltan. Apple, además, cobra por su programa de desarrollador.

Lo que sí se puede delegar sin dar accesos: revisar este documento, crear las
apps OAuth en las consolas de cada proveedor, y comprobar el resultado con el
`curl` de arriba.
