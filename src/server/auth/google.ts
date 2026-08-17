import { desafioDe, type IntentoDeLogin } from './pkce.ts';

/**
 * El trozo del acceso con Google que habla por la red.
 *
 * Lo puro —PKCE y la validacion de la identidad— vive en `pkce.ts` y
 * `google-claims.ts`, que si se pueden testear. Aqui queda lo que no: construir
 * la URL a la que se manda al usuario y canjear el codigo.
 *
 * El `client_secret` es de servidor y no sale de aqui. No se registra en ningun
 * log ni viaja al navegador.
 */

const AUTORIZAR = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN = 'https://oauth2.googleapis.com/token';

/** Lo minimo: quien somos y como se llama al usuario. Nada de Gmail ni Drive. */
const SCOPE = 'openid email profile';

export type ConfigGoogle = { clientId: string; clientSecret: string; redirectUri: string };

/**
 * La configuracion, o `null` si no esta puesta.
 *
 * Devuelve `null` en vez de lanzar porque "no configurado" es un estado normal
 * de esta app: el acceso con Google es opcional y la pantalla tiene que poder
 * decir que no esta disponible sin romperse.
 */
export function configGoogle(): ConfigGoogle | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri: redirectUri() };
}

/**
 * A donde vuelve Google. Se deriva de la URL publica del despliegue.
 *
 * Tiene que coincidir CARACTER A CARACTER con la que se registre en Google
 * Cloud; si no, Google contesta `redirect_uri_mismatch` y no deja pasar.
 */
export function redirectUri(): string {
  const explicito = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (explicito) return explicito;

  const base =
    process.env.APP_BASE_URL?.trim() ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3000');
  return `${base.replace(/\/$/, '')}/api/fantasy/auth/google/callback`;
}

/** La URL de Google a la que se manda al usuario. */
export function urlDeAutorizacion(config: ConfigGoogle, intento: IntentoDeLogin): string {
  const parametros = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: SCOPE,
    state: intento.state,
    code_challenge: desafioDe(intento.verifier),
    code_challenge_method: 'S256',
    // Sin esto Google recuerda la sesion y no deja elegir cuenta.
    prompt: 'select_account',
  });
  return `${AUTORIZAR}?${parametros.toString()}`;
}

/**
 * Canjea el codigo por el `id_token`.
 *
 * Solo interesa el `id_token`: esta app no llama a ninguna API de Google, asi
 * que el `access_token` que venga se descarta. Pedir menos de lo que no se usa
 * es la unica forma de no tener que cuidarlo.
 */
export async function canjearCodigo(
  config: ConfigGoogle,
  codigo: string,
  verifier: string,
): Promise<{ idToken: string } | { error: string }> {
  let respuesta: Response;
  try {
    respuesta = await fetch(TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: codigo,
        code_verifier: verifier,
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { error: 'No se pudo contactar con Google para completar el acceso.' };
  }

  const cuerpo = (await respuesta.json().catch(() => null)) as
    | { id_token?: string; error?: string; error_description?: string }
    | null;

  if (!respuesta.ok || !cuerpo?.id_token) {
    /*
     * El error de Google se pasa tal cual detras de una frase en castellano.
     * `redirect_uri_mismatch` e `invalid_client` son fallos de configuracion y
     * sin el texto original no hay forma de distinguirlos.
     */
    const detalle = cuerpo?.error_description ?? cuerpo?.error ?? `HTTP ${respuesta.status}`;
    return { error: `Google rechazó el acceso: ${detalle}` };
  }

  return { idToken: cuerpo.id_token };
}
