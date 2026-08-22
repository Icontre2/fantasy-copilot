import { accesoDeMarketing } from "@/src/server/marketing/access";
import { responder } from "@/src/server/marketing/http";

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
  // Esta es la primera llamada que hace el panel, así que es la que suele
  // renovar la identidad: devolver aquí las cookies evita que el resto de la
  // carga vaya renovando una y otra vez.
  return responder({ authorized: acceso.autorizado, email: acceso.email }, acceso.cookies);
}
