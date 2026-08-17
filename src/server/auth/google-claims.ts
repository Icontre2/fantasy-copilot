/**
 * Quien es el que acaba de entrar, segun el `id_token` de Google.
 *
 * ── Por que NO se verifica la firma ──────────────────────────────────────────
 * Porque este token no llega por la URL: lo pedimos NOSOTROS al endpoint de
 * Google, por HTTPS y con el secreto de cliente. Es la excepcion que la propia
 * documentacion de Google reconoce: un token recibido directamente del endpoint
 * de token ya esta autenticado por el canal, y volver a comprobar la firma no
 * añade nada. Si algun dia este token llegara por otra via —por la URL, por el
 * navegador— esto DEJA de valer y habria que verificar contra el JWKS.
 *
 * Lo que si se comprueba, y no es opcional:
 *   - `aud`: que el token sea para NUESTRA aplicacion y no para otra. Sin esto,
 *     alguien con un token legitimo de otra app podria usarlo aqui.
 *   - `iss`: que lo haya emitido Google.
 *   - `exp`: que no este caducado.
 *   - `email_verified`: Google permite cuentas con correo sin verificar, y
 *     tratarlas como identidad seria dejar entrar a quien diga ser otro.
 *
 * Todo puro: recibe el token y la hora, devuelve identidad o motivo del rechazo.
 */

/** Los dos emisores que Google usa indistintamente. */
const EMISORES = new Set(['accounts.google.com', 'https://accounts.google.com']);

export type Identidad = {
  /** Identificador estable de la cuenta. NO es el correo: el correo se cambia. */
  sub: string;
  email: string;
  nombre: string | null;
  foto: string | null;
};

export type Resultado =
  | { ok: true; identidad: Identidad }
  | { ok: false; motivo: string };

/** El cuerpo de un JWT, sin verificar nada. `null` si no tiene forma de JWT. */
export function cuerpoDeJwt(token: string): Record<string, unknown> | null {
  const partes = token.split('.');
  if (partes.length !== 3 || !partes[1]) return null;
  try {
    const json: unknown = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8'));
    return json && typeof json === 'object' ? (json as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * La identidad del `id_token`, o el motivo por el que no vale.
 *
 * Devuelve el motivo en vez de lanzar para que la ruta pueda decirlo en
 * castellano sin traducir excepciones.
 */
export function identidadDe(idToken: string, clientId: string, ahoraMs: number): Resultado {
  const cuerpo = cuerpoDeJwt(idToken);
  if (!cuerpo) return { ok: false, motivo: 'Google devolvió un identificador con un formato que no se entiende.' };

  const iss = typeof cuerpo.iss === 'string' ? cuerpo.iss : '';
  if (!EMISORES.has(iss)) return { ok: false, motivo: 'El identificador no lo ha emitido Google.' };

  /*
   * `aud` puede venir como texto o como lista. Se acepta cualquiera de las dos
   * formas, pero tiene que contener NUESTRO client_id.
   */
  const aud = cuerpo.aud;
  const audiencias = typeof aud === 'string' ? [aud] : Array.isArray(aud) ? aud : [];
  if (!audiencias.includes(clientId)) {
    return { ok: false, motivo: 'El identificador es para otra aplicación, no para esta.' };
  }

  const exp = typeof cuerpo.exp === 'number' ? cuerpo.exp : 0;
  if (exp * 1000 <= ahoraMs) return { ok: false, motivo: 'El identificador de Google ya ha caducado.' };

  const sub = typeof cuerpo.sub === 'string' ? cuerpo.sub : '';
  if (sub === '') return { ok: false, motivo: 'Google no ha dicho de qué cuenta se trata.' };

  const email = typeof cuerpo.email === 'string' ? cuerpo.email : '';
  if (email === '') return { ok: false, motivo: 'Google no ha compartido el correo de la cuenta.' };

  // Google lo manda como booleano, pero hay clientes que lo mandan como texto.
  const verificado = cuerpo.email_verified === true || cuerpo.email_verified === 'true';
  if (!verificado) {
    return { ok: false, motivo: 'Ese correo no está verificado en Google, así que no sirve para identificarte.' };
  }

  return {
    ok: true,
    identidad: {
      sub,
      email,
      nombre: typeof cuerpo.name === 'string' && cuerpo.name !== '' ? cuerpo.name : null,
      foto: typeof cuerpo.picture === 'string' && cuerpo.picture !== '' ? cuerpo.picture : null,
    },
  };
}

/**
 * La clave con la que se guarda el enlace a la cuenta de LALIGA.
 *
 * Lleva el proveedor delante para que el dia que se añada otro (Facebook, por
 * ejemplo) un `sub` que coincida por casualidad no acabe compartiendo cuenta.
 */
export function claveDeIdentidad(proveedor: string, sub: string): string {
  return `${proveedor}:${sub}`;
}
