import { accesoDeMarketing } from "@/src/server/marketing/access";
import { privateJson } from "@/src/server/http/responses";

export const dynamic = "force-dynamic";

/**
 * GET /api/marketing/auth — la puerta que ve la interfaz.
 *
 * Nunca dice quién SÍ está autorizado, solo si quien pregunta lo está. El
 * panel usa esto para decidir si enseña la cola o un «acceso denegado»; cada
 * ruta que de verdad lee o cambia algo vuelve a comprobar por su cuenta
 * (`autorizar` en `http.ts`), así que esta ruta no es, por sí sola, ningún
 * control de seguridad — es solo la señal para la UI.
 */
export async function GET(request: Request) {
  const acceso = await accesoDeMarketing(request);
  return privateJson({ authorized: acceso.autorizado, email: acceso.email });
}
