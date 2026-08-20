# Encender Apple y Facebook

> Google ya funciona entero. Apple y Facebook **no aparecen** porque no están
> encendidos en Supabase, y encenderlos es lo único de todo el acceso social que
> no se puede hacer desde el código: hay que crear una app OAuth en cada
> proveedor, y eso pide cuentas de desarrollador.
>
> **Este repositorio es PÚBLICO.** Ningún secreto de los de abajo se escribe
> aquí: se pegan directamente en el panel de Supabase. La dirección del proyecto
> que aparece más abajo no es un secreto —es la misma que ya está en
> `src/server/auth/supabase-oauth.ts` como respaldo público, junto a la clave
> publicable, que está pensada para ser pública porque lo que protege la base es
> RLS. La que **nunca** puede salir de Vercel es `service_role`.
>
> Si algún día cambia el proyecto, la dirección buena sale de
> **Supabase → Settings → API → Project URL**.

## Antes de empezar: no hace falta tocar nada de código

La app le pregunta a Supabase qué proveedores tiene encendidos. En cuanto
actives uno, su botón aparece solo — sin desplegar, sin variables, sin editar
nada. Se comprueba así:

```bash
curl -s https://fantasy-copilot-sigma.vercel.app/api/fantasy/auth/session
# social.proveedores debe pasar de ["google"] a ["google","apple"]…
```

El orden de los botones en pantalla es fijo (Google, Apple, Facebook), así que no
depende de en qué orden los actives.

---

## Facebook — lo más rápido, y gratis

**Coste: 0 €. Tiempo: unos 20 minutos.**

1. Entra en **[Meta for Developers](https://developers.facebook.com/)** y crea
   una cuenta de desarrollador si no la tienes.
2. **Mis aplicaciones → Crear aplicación**. Tipo: **«Autenticar y solicitar datos
   de usuarios con Facebook Login»**. Nombre: LigaLab.
3. Dentro de la app, añade el producto **Facebook Login → Configuración**.
4. En **URI de redireccionamiento de OAuth válidos**, pega exactamente:

   ```
   https://ggqealkrogfgbykicmfo.supabase.co/auth/v1/callback
   ```

   Ojo: es la URL de **Supabase**, no la de LigaLab. El proveedor vuelve a
   Supabase, y Supabase vuelve a LigaLab. Es el error que más tiempo cuesta.
5. En **Configuración → Básica**, copia el **Identificador de la aplicación** y
   la **Clave secreta**.
6. En **Supabase → Authentication → Providers → Facebook**: enciéndelo y pega los
   dos valores.
7. Para que funcione con cuentas que no sean la tuya, la app de Meta tiene que
   estar **en modo «En vivo»** (arriba del panel) y con el caso de uso de
   Facebook Login revisado. En modo desarrollo solo entran las cuentas que
   añadas como probadores, que para enseñárselo a amigos puede bastar.

---

## Apple — el más caro y el más lento

**Coste: 99 $/año del Apple Developer Program. Tiempo: una hora larga la primera
vez.**

Solo merece la pena si vas a publicar en la App Store: **si tu app ofrece otro
acceso social, Apple exige por norma que ofrezcas también «Sign in with
Apple»**. Para una web instalable no es obligatorio.

1. **[Apple Developer](https://developer.apple.com/)** → inscríbete en el
   programa de pago.
2. **Certificates, Identifiers & Profiles → Identifiers**:
   - Crea un **App ID** y marca la capacidad **Sign In with Apple**.
   - Crea un **Services ID** (este es el que hace de `client_id` en la web).
3. Configura el Services ID:
   - **Domains**: `ggqealkrogfgbykicmfo.supabase.co`
   - **Return URLs**: `https://ggqealkrogfgbykicmfo.supabase.co/auth/v1/callback`
4. **Keys → +**, marca **Sign In with Apple**, y descarga el fichero `.p8`.
   **Solo se puede descargar una vez.** Guárdalo bien.
5. Apunta el **Team ID** (arriba a la derecha en el portal) y el **Key ID**.
6. En **Supabase → Authentication → Providers → Apple**: enciéndelo y rellena
   Services ID, Team ID, Key ID y el contenido del `.p8`.

**Aviso sobre el correo:** Apple deja ocultar el correo real y entrega uno de
retransmisión (`…@privaterelay.appleid.com`). LigaLab no depende del correo para
nada —la identidad es el `sub` del proveedor— así que funciona igual. Solo hay
que saberlo si algún día se manda correo a los usuarios.

---

## Comprobar que ha funcionado

```bash
curl -s https://fantasy-copilot-sigma.vercel.app/api/fantasy/auth/session \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['social'])"
```

- `proveedores` tiene que incluir el nuevo.
- `motivo` tiene que seguir siendo `null`.

Y después, la prueba de verdad, que ninguna llamada sustituye: entrar con ese
proveedor desde un móvil, conectar LALIGA, ir a **Más → Tu cuenta**, enlazar,
cerrar sesión y volver a entrar con el proveedor. Tiene que meterte dentro sin
pedir contraseña.

---

## Lo que NO arregla encender más proveedores

Sigue habiendo un caso incómodo, y conviene no confundirlo con este: **si tu
cuenta de LALIGA Fantasy se creó con Google, Apple o Facebook, no tiene
contraseña en el sistema de LALIGA**, así que el paso de «conectar LALIGA» no se
puede hacer con email y contraseña. Eso no lo arregla encender proveedores en
LigaLab: son dos accesos distintos y LALIGA no sabe nada del nuestro.

Para esos casos está la vía de pegar la respuesta de token del login oficial, que
la pantalla ya ofrece. Detalle en
[`LALIGA_SOCIAL_LOGIN.md`](./LALIGA_SOCIAL_LOGIN.md).
