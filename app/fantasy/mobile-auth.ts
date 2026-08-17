import { post } from "./api";
import type { Manager } from "./types";

type NativeOAuthResult = { callbackUrl?: string };
type NativeOAuthPlugin = {
  start(options: { url: string }): Promise<NativeOAuthResult>;
};

type CapacitorWindow = Window & {
  Capacitor?: {
    Plugins?: {
      LaligaOAuth?: NativeOAuthPlugin;
    };
  };
};

export function getNativeLaligaOAuth(): NativeOAuthPlugin | null {
  if (typeof window === "undefined") return null;
  return (window as CapacitorWindow).Capacitor?.Plugins?.LaligaOAuth ?? null;
}

export function hasNativeLaligaOAuth(): boolean {
  return getNativeLaligaOAuth() !== null;
}

/**
 * Flujo completo iOS:
 * 1) servidor crea state + PKCE y guarda el verifier en cookie HttpOnly;
 * 2) iOS abre el login oficial y devuelve solo el callback code/state;
 * 3) servidor intercambia el code, valida el perfil y crea la sesión de LigaLab.
 */
export async function loginWithLaligaOnIOS(): Promise<Manager> {
  const plugin = getNativeLaligaOAuth();
  if (!plugin) throw new Error("El acceso móvil solo está disponible dentro de la app de iPhone.");

  const { authorizeUrl } = await post<{ authorizeUrl: string }>("/api/fantasy/auth/mobile/start");
  const result = await plugin.start({ url: authorizeUrl });

  if (!result.callbackUrl) throw new Error("LALIGA no devolvió el callback de acceso.");

  const { manager } = await post<{ manager: Manager }>("/api/fantasy/auth/mobile/complete", {
    callbackUrl: result.callbackUrl,
  });
  return manager;
}
