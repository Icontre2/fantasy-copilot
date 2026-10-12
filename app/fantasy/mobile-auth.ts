import { post } from "./api";
import type { Manager } from "./types";

type NativeOAuthResult = { callbackUrl?: string };
type NativeOAuthPlugin = {
  start(options: { url: string }): Promise<NativeOAuthResult>;
};

type CapacitorWindow = Window & {
  Capacitor?: {
    getPlatform?: () => string;
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

/** `"ios"`, `"android"` o `"web"`. Solo para adaptar textos, nunca para seguridad. */
export function nativePlatform(): string {
  if (typeof window === "undefined") return "web";
  return (window as CapacitorWindow).Capacitor?.getPlatform?.() ?? "web";
}

/**
 * Flujo completo, igual en iPhone y Android:
 * 1) servidor crea state + PKCE y guarda el verifier en cookie HttpOnly;
 * 2) el plugin nativo abre el login oficial y devuelve solo el callback code/state;
 * 3) servidor intercambia el code, valida el perfil y crea la sesión de LigaLab.
 */
export async function loginWithLaligaNative(): Promise<Manager> {
  const plugin = getNativeLaligaOAuth();
  if (!plugin) throw new Error("El acceso con Google o Facebook de LALIGA solo está disponible dentro de la app de LigaLab.");

  const { authorizeUrl } = await post<{ authorizeUrl: string }>("/api/fantasy/auth/mobile/start");
  const result = await plugin.start({ url: authorizeUrl });

  if (!result.callbackUrl) throw new Error("LALIGA no devolvió el callback de acceso.");

  const { manager } = await post<{ manager: Manager }>("/api/fantasy/auth/mobile/complete", {
    callbackUrl: result.callbackUrl,
  });
  return manager;
}
