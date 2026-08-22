import { identidadDePeticionConRefresco } from '../auth/identity.ts';

/**
 * Quién puede entrar al panel de marketing.
 *
 * ── El diseño ─────────────────────────────────────────────────────────────
 * No es un usuario de LigaLab: es el dueño del proyecto. Por eso NO usa la
 * sesión de LALIGA (esa es de cada manager) sino la identidad de Google/
 * Facebook que ya se verifica contra Supabase en `identity.ts` — la misma
 * pieza que arregló el acceso social del producto. No hace falta ningún login
 * nuevo: basta con haber entrado una vez con Google en LigaLab.
 *
 * La lista de quién puede entrar vive en una variable de entorno del
 * servidor (`MARKETING_ADMIN_EMAILS`, separada por comas), nunca en el
 * cliente ni en el repositorio. Sin la variable puesta, NADIE entra — fallar
 * cerrado, no abierto, que es la regla de todo este proyecto.
 *
 * Esto es la puerta de la interfaz. La tabla de Supabase donde vive el estado
 * humano tiene ADEMÁS su propia comprobación por RLS (ver la migración): si
 * alguien se saltara esta ruta y hablara con PostgREST directamente, la base
 * seguiría negándoselo.
 */

export type AccesoDeMarketing = (
  | { autorizado: true; email: string; accessToken: string }
  | { autorizado: false; email: string | null }
) & {
  /**
   * Cookies que la respuesta tiene que fijar porque se ha renovado la
   * identidad. Vacío en el caso normal. Sin devolverlas, la renovación se
   * repetiría en CADA petición del panel.
   */
  cookies: string[];
};

/**
 * Parseo puro, separado a propósito: así se puede probar la regla de acceso
 * sin depender de `process.env` ni de la red. `csv` por defecto lee la
 * variable real; un test le pasa la suya.
 */
export function listaDeAdmins(csv: string | undefined = process.env.MARKETING_ADMIN_EMAILS): string[] {
  return (csv ?? '')
    .split(',')
    .map((correo) => correo.trim().toLowerCase())
    .filter(Boolean);
}

/** Si esta variable no está puesta, el panel está cerrado para todo el mundo. */
export function hayAdminsConfigurados(csv?: string): boolean {
  return listaDeAdmins(csv).length > 0;
}

/** La regla de acceso, pura: ¿esta persona está en esta lista? */
export function emailAutorizado(email: string, admins: string[]): boolean {
  return admins.includes(email.trim().toLowerCase());
}

export async function accesoDeMarketing(request: Request): Promise<AccesoDeMarketing> {
  /*
   * Con refresco, a diferencia del resto de la app: el access token de
   * Supabase dura una hora, y un panel que se abre a diario para revisar no
   * puede exigir repetir el login social entre una visita y la siguiente.
   */
  const { identidad: quien, cookies } = await identidadDePeticionConRefresco(request);
  if (!quien?.email) return { autorizado: false, email: quien?.email ?? null, cookies };

  const autorizado = emailAutorizado(quien.email, listaDeAdmins());
  return autorizado
    ? { autorizado: true, email: quien.email, accessToken: quien.accessToken, cookies }
    : { autorizado: false, email: quien.email, cookies };
}
