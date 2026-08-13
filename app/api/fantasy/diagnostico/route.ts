import { privateJson } from "@/src/server/http/responses";
import {
  hasPersistentStorage,
  usingCookieSessions,
  usingPortableCookieSessions,
} from "@/src/server/laliga/session";
import { hasConfiguredEncryptionSecret } from "@/src/server/laliga/token-crypto";

export const dynamic = "force-dynamic";

/**
 * GET /api/fantasy/diagnostico
 *
 * Dice CÓMO está configurado el despliegue, sin decir con qué.
 *
 * Existe por un caso real: el login fallaba en producción con un error interno
 * y no había forma de saber si faltaba la clave de cifrado, si la sesión no
 * cabía en la cookie o si el problema era otro — los errores de configuración
 * ocurren en el servidor y el usuario solo ve el resultado. Comprobar esto a
 * ciegas costaba un despliegue por hipótesis.
 *
 * SOLO devuelve booleanos y etiquetas. Ninguna clave, ningún token, ningún
 * identificador. Saber que existe una clave no ayuda a adivinarla; no saberlo
 * obliga a diagnosticar por eliminación.
 */
export function GET() {
  return privateJson({
    entorno: process.env.NODE_ENV ?? "desconocido",
    claveDeCifrado: hasConfiguredEncryptionSecret()
      ? "configurada"
      : "AUSENTE — el login fallara al guardar la sesion",
    baseDeDatos: hasPersistentStorage()
      ? "configurada — la sesion dura 30 dias y Economia funciona"
      : "ausente — sesion de ~24 h y Economia desactivada",
    modoDeSesion: usingPortableCookieSessions()
      ? "cookie portatil (sin cifrado estable)"
      : usingCookieSessions()
        ? "cookie cifrada"
        : "base de datos",
  });
}
