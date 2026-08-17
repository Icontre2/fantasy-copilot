import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Las dos piezas que impiden que a alguien le cuelen un login ajeno.
 *
 * ── `state` ──────────────────────────────────────────────────────────────────
 * Google nos devuelve al navegador con un `code` en la URL. Sin `state`,
 * cualquiera puede fabricar esa URL con SU codigo y hacer que la victima acabe
 * conectada a la cuenta del atacante. Se genera un valor al azar, se guarda en
 * una cookie y se exige que el que vuelve sea el mismo.
 *
 * ── PKCE ─────────────────────────────────────────────────────────────────────
 * El `code` viaja por la barra de direcciones y puede acabar en un historial o
 * en un log. PKCE lo ata a un secreto que solo tiene este servidor: se manda el
 * HASH del secreto al pedir el codigo, y el secreto entero al canjearlo. Un
 * codigo robado sin el secreto no vale para nada.
 *
 * Todo lo de aqui es puro salvo la generacion de aleatorios, que es lo unico que
 * no tendria sentido testear.
 */

/** Cuanto vale un intento de login antes de caducar. */
export const VALIDEZ_MS = 10 * 60 * 1000;

export type IntentoDeLogin = {
  /** Valor al azar que tiene que volver igual desde Google. */
  state: string;
  /** El secreto de PKCE. Nunca sale de este servidor. */
  verifier: string;
  /** Cuando se creo, para poder caducarlo. */
  creado: number;
};

function aleatorio(): string {
  return randomBytes(32).toString('base64url');
}

export function nuevoIntento(ahora: number): IntentoDeLogin {
  return { state: aleatorio(), verifier: aleatorio(), creado: ahora };
}

/**
 * El `code_challenge` de un verifier: SHA-256 en base64url.
 *
 * Puro y por eso comprobable contra el ejemplo del RFC 7636, que es lo que hace
 * el test: si esto se desviara un byte, Google rechazaria todos los canjes y el
 * sintoma seria un login que falla sin decir por que.
 */
export function desafioDe(verifier: string): string {
  return createHash('sha256').update(verifier, 'ascii').digest('base64url');
}

/** El intento, listo para meter en una cookie. */
export function empaquetar(intento: IntentoDeLogin): string {
  return Buffer.from(JSON.stringify(intento), 'utf8').toString('base64url');
}

/** Lo contrario. `null` si el contenido no es un intento valido. */
export function desempaquetar(valor: string): IntentoDeLogin | null {
  try {
    const crudo: unknown = JSON.parse(Buffer.from(valor, 'base64url').toString('utf8'));
    if (!crudo || typeof crudo !== 'object') return null;
    const { state, verifier, creado } = crudo as Partial<IntentoDeLogin>;
    if (typeof state !== 'string' || typeof verifier !== 'string' || typeof creado !== 'number') return null;
    if (state === '' || verifier === '') return null;
    return { state, verifier, creado };
  } catch {
    return null;
  }
}

/** Comparacion en tiempo constante: comparar con `===` filtra por cuanto tarda. */
export function mismoState(esperado: string, recibido: string): boolean {
  const a = Buffer.from(esperado, 'utf8');
  const b = Buffer.from(recibido, 'utf8');
  // `timingSafeEqual` exige la misma longitud, y esa comparacion previa no
  // filtra nada util: la longitud del state no es secreta.
  return a.length === b.length && timingSafeEqual(a, b);
}

export function caducado(intento: IntentoDeLogin, ahora: number): boolean {
  return ahora - intento.creado > VALIDEZ_MS;
}
