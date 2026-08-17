import { privateJson } from "@/src/server/http/responses";
import { configVapid } from "@/src/server/alerts/push-send";
import { hasPersistentStorage } from "@/src/server/laliga/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/fantasy/push/status — si los avisos se pueden activar, y con qué clave.
 *
 * La clave pública de VAPID no es un secreto: viaja dentro de cada suscripción
 * y cualquiera que inspeccione el navegador la ve. Lo que nunca sale de aquí es
 * la privada, que es la que firma los envíos.
 */
export async function GET() {
  const vapid = configVapid();
  const persistente = hasPersistentStorage();
  return privateJson({
    disponible: vapid !== null && persistente,
    publicKey: vapid?.publicKey ?? null,
    motivo: !vapid
      ? "Los avisos push no están configurados en este despliegue."
      : !persistente
        ? "Los avisos necesitan una sesión persistente (base de datos + clave de cifrado fija)."
        : null,
  });
}
