/**
 * Cookies de sesion. Puro: sin red, sin base de datos, sin depender del almacen.
 *
 * Vive aparte de `session.ts` para poder testearlo — y merece test propio porque
 * un fallo aqui no se ve: la sesion simplemente "no se guarda" y el login parece
 * que no funciona, sin ningun error en ningun log.
 */

export const SESSION_COOKIE = 'llf_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

/**
 * Tamano maximo por cookie. El limite real de los navegadores son 4096 bytes
 * para nombre + valor + atributos; 3500 deja sitio de sobra a los atributos.
 */
const MAX_COOKIE_VALUE = 3500;

/** Cuantos trozos se intentan leer y limpiar como maximo. */
const MAX_CHUNKS = 8;

function cookieName(index: number): string {
  return index === 0 ? SESSION_COOKIE : `${SESSION_COOKIE}_${index}`;
}

function parseCookies(request: Request): Map<string, string> {
  const jar = new Map<string, string>();
  const header = request.headers.get('cookie');
  if (!header) return jar;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name) jar.set(name, decodeURIComponent(rest.join('=')));
  }
  return jar;
}

/**
 * Reconstruye el valor de sesion, que puede venir partido en varias cookies.
 *
 * En modo Supabase es un id corto y ocupa una sola. En modo cookie es la sesion
 * cifrada entera, que con los tokens de Azure B2C se pasa de 4 KB: sin trocear,
 * el navegador descartaria la cookie EN SILENCIO y el login pareceria funcionar
 * sin llegar a dejar sesion.
 */
export function readSessionId(request: Request): string | undefined {
  const jar = parseCookies(request);
  const first = jar.get(cookieName(0));
  if (!first) return undefined;

  let value = first;
  for (let index = 1; index < MAX_CHUNKS; index += 1) {
    const chunk = jar.get(cookieName(index));
    if (chunk === undefined) break;
    value += chunk;
  }
  return value;
}

function cookieAttributes(maxAgeSeconds: number): string {
  const secure = process.env.NODE_ENV === 'production' ? ' Secure;' : '';
  return `Path=/; HttpOnly; SameSite=Lax;${secure} Max-Age=${maxAgeSeconds}`;
}

/** Cabeceras `Set-Cookie` de la sesion, troceada si hace falta. */
export function buildSessionCookies(value: string): string[] {
  const chunks: string[] = [];
  for (let offset = 0; offset < value.length; offset += MAX_COOKIE_VALUE) {
    chunks.push(value.slice(offset, offset + MAX_COOKIE_VALUE));
  }
  if (chunks.length === 0) chunks.push('');
  if (chunks.length > MAX_CHUNKS) {
    throw new Error('La sesion cifrada no cabe en las cookies disponibles.');
  }

  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const cookies = chunks.map(
    (chunk, index) => `${cookieName(index)}=${encodeURIComponent(chunk)}; ${cookieAttributes(maxAge)}`,
  );

  // Caduca los trozos sobrantes de una sesion anterior mas larga; si no,
  // quedarian pegados al final del valor nuevo y no descifraria.
  for (let index = chunks.length; index < MAX_CHUNKS; index += 1) {
    cookies.push(`${cookieName(index)}=; ${cookieAttributes(0)}`);
  }
  return cookies;
}

/** Cabeceras `Set-Cookie` que cierran la sesion. */
export function buildClearCookies(): string[] {
  return Array.from(
    { length: MAX_CHUNKS },
    (_, index) => `${cookieName(index)}=; ${cookieAttributes(0)}`,
  );
}
