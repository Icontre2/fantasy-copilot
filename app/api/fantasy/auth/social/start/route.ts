import { configAuth, proveedoresActivos, urlDeAutorizacion } from "@/src/server/auth/supabase-oauth";
import { proveedorValido, NOMBRES } from "@/src/server/auth/providers";
import { cookieDeIntento } from "@/src/server/auth/cookies";
import { empaquetar, nuevoIntento } from "@/src/server/auth/pkce";
import { hayAlmacenDeEnlaces } from "@/src/server/auth/links";
import { privateJson } from "@/src/server/http/responses";

export const dynamic = "force-dynamic";

/**
 * GET /api/fantasy/auth/social/start?provider=google|apple|facebook
 *
 * Te manda al proveedor. Es una redirección de navegador, no una llamada de
 * JavaScript: tienes que ACABAR en Google, Apple o Facebook, con su barra de
 * direcciones y su candado, para poder comprobar tú a quién le estás dando la
 * contraseña. Por eso el botón de la pantalla es un enlace.
 */
export async function GET(request: Request) {
  // Lista blanca: lo que no es uno de los nuestros no llega a la URL de salida.
  const proveedor = proveedorValido(new URL(request.url).searchParams.get("provider"));
  if (!proveedor) return privateJson({ error: "Ese proveedor de acceso no existe en esta app." }, 400);

  const config = configAuth();
  if (!config) return privateJson({ error: "El acceso con proveedor no está configurado en este despliegue." }, 501);

  if (!hayAlmacenDeEnlaces()) {
    /*
     * Sin base de datos no se puede recordar qué cuenta de LALIGA va con esta
     * identidad, así que entrar así te dejaría igual: pidiéndote la contraseña
     * de LALIGA cada vez. Mejor no ofrecerlo que ofrecer algo que no cumple.
     */
    return privateJson({ error: "El acceso con proveedor necesita la base de datos configurada." }, 501);
  }

  const activos = await proveedoresActivos(config);
  if (!activos.includes(proveedor)) {
    return privateJson(
      { error: `${NOMBRES[proveedor]} no está activado en el panel de Supabase de este proyecto.` },
      501,
    );
  }

  const intento = nuevoIntento(Date.now());
  return new Response(null, {
    status: 302,
    headers: {
      Location: urlDeAutorizacion(config, proveedor, intento),
      "Set-Cookie": cookieDeIntento(empaquetar(intento)),
      "Cache-Control": "no-store",
    },
  });
}
