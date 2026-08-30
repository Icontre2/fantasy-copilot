/**
 * ¿Estamos dentro de un contenedor nativo que sepa hacer el login de LALIGA?
 *
 * Vive aparte de `mobile-auth.ts` por dos motivos, y el segundo es el que
 * importa: aquí no hay ningún import de VALOR, así que se puede ejecutar desde
 * una prueba de node sin montar un navegador. `mobile-auth.ts` necesita `post`,
 * y eso arrastra el cliente HTTP entero.
 *
 * ── La decisión que hay detrás ──────────────────────────────────────────────
 * Se pregunta por CAPACIDAD —¿está registrado `LaligaOAuth`?— y nunca por
 * sistema operativo. Gracias a eso el plugin de Android funcionó sin tocar una
 * línea de la web: se registra con el mismo nombre que el de iPhone y aparece
 * solo. Mirar el user agent habría obligado a tocar esto con cada contenedor
 * nuevo, y además mentiría en cuanto alguien abra la web normal desde ese mismo
 * móvil.
 */

export type NativeOAuthResult = { callbackUrl?: string };
export type NativeOAuthPlugin = {
  start(options: { url: string }): Promise<NativeOAuthResult>;
};

type CapacitorWindow = Window & {
  Capacitor?: { Plugins?: { LaligaOAuth?: NativeOAuthPlugin } };
};

/** El plugin nativo, o `null` si no estamos dentro de la app. */
export function getNativeLaligaOAuth(): NativeOAuthPlugin | null {
  if (typeof window === "undefined") return null;
  return (window as CapacitorWindow).Capacitor?.Plugins?.LaligaOAuth ?? null;
}

export function hasNativeLaligaOAuth(): boolean {
  return getNativeLaligaOAuth() !== null;
}
