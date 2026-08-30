import { post } from "./api";
import { getNativeLaligaOAuth } from "./native-bridge";
import type { Manager } from "./types";

// La detección vive en `native-bridge.ts`, sin imports de valor, para que se
// pueda probar sin navegador. Se re-exporta para no obligar a quien ya usaba
// este módulo a cambiar de sitio.
export { getNativeLaligaOAuth, hasNativeLaligaOAuth } from "./native-bridge";
export type { NativeOAuthPlugin, NativeOAuthResult } from "./native-bridge";

/**
 * El flujo completo, igual en iPhone y en Android:
 *
 * 1) el servidor crea `state` + PKCE y guarda el verifier en una cookie HttpOnly;
 * 2) el plugin nativo abre el login oficial y devuelve SOLO el callback con
 *    `code` y `state`;
 * 3) el servidor intercambia el code, valida el perfil contra LALIGA y crea la
 *    sesión de LigaLab.
 *
 * Esta función no sabe en qué sistema corre, y es a propósito: los dos plugins
 * —`mobile/ios/LaligaOAuthPlugin.swift` y `mobile/android/LaligaOAuthPlugin.kt`—
 * se registran con el MISMO nombre y exponen el mismo contrato. Ramificar por
 * plataforma aquí sería duplicar en la web una diferencia que no existe.
 */
export async function loginWithLaligaNativo(): Promise<Manager> {
  const plugin = getNativeLaligaOAuth();
  if (!plugin) throw new Error("El acceso con cuenta social solo está disponible dentro de la app de LigaLab.");

  const { authorizeUrl } = await post<{ authorizeUrl: string }>("/api/fantasy/auth/mobile/start");
  const result = await plugin.start({ url: authorizeUrl });

  if (!result.callbackUrl) throw new Error("LALIGA no devolvió el callback de acceso.");

  const { manager } = await post<{ manager: Manager }>("/api/fantasy/auth/mobile/complete", {
    callbackUrl: result.callbackUrl,
  });
  return manager;
}
