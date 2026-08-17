import { configGoogle, urlDeAutorizacion } from "@/src/server/auth/google";
import { cookieDeIntento } from "@/src/server/auth/cookies";
import { empaquetar, nuevoIntento } from "@/src/server/auth/pkce";
import { hayAlmacenDeEnlaces } from "@/src/server/auth/links";
import { privateJson } from "@/src/server/http/responses";

export const dynamic = "force-dynamic";

/**
 * GET /api/fantasy/auth/google/start — te manda a Google.
 *
 * Es una redirección de navegador, no una llamada de JavaScript: el usuario
 * tiene que ACABAR en Google, con su barra de direcciones y su candado, para
 * poder comprobar él mismo a quién le está dando la contraseña. Por eso el botón
 * de la pantalla es un enlace y no un `fetch`.
 */
export async function GET() {
  const config = configGoogle();
  if (!config) {
    return privateJson({ error: "El acceso con Google no está configurado en este despliegue." }, 501);
  }
  if (!hayAlmacenDeEnlaces()) {
    /*
     * Sin base de datos no se puede recordar qué cuenta de LALIGA va con esta
     * cuenta de Google, así que entrar con Google te dejaría igual: pidiéndote
     * la contraseña de LALIGA cada vez. Mejor no ofrecer el botón que ofrecer
     * uno que no cumple lo que promete.
     */
    return privateJson(
      { error: "El acceso con Google necesita la base de datos configurada (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY)." },
      501,
    );
  }

  const intento = nuevoIntento(Date.now());
  return new Response(null, {
    status: 302,
    headers: {
      Location: urlDeAutorizacion(config, intento),
      "Set-Cookie": cookieDeIntento(empaquetar(intento)),
      "Cache-Control": "no-store",
    },
  });
}
