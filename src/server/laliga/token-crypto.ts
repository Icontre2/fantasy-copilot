import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

import type { TokenSet } from './auth';

const VERSION = 'v1';

function keyFromSecret(secret: string): Buffer {
  if (secret.length < 32) {
    throw new Error('SESSION_ENCRYPTION_KEY debe tener al menos 32 caracteres.');
  }
  return createHash('sha256').update(secret, 'utf8').digest();
}

/**
 * Clave efimera para el modo de desarrollo sin configurar.
 *
 * Se genera una vez por proceso y muere con el. Solo tiene sentido porque en ese
 * modo las sesiones tampoco sobreviven al reinicio (viven en memoria, ver
 * `session.ts`): la clave dura exactamente lo que dura lo que cifra.
 *
 * Cuelga de globalThis para que el hot-reload de `next dev` no la regenere y
 * deje ilegibles las sesiones ya abiertas.
 */
function ephemeralDevSecret(): string {
  const holder = globalThis as { __llfDevSecret?: string };
  return (holder.__llfDevSecret ??= randomBytes(48).toString('base64'));
}

function configuredSecret(): string {
  const explicit = process.env.SESSION_ENCRYPTION_KEY?.trim();
  if (explicit) return explicit;

  /*
   * Vercel inyecta VERCEL_OIDC_TOKEN como secreto de alta entropia en cada
   * despliegue. Es un respaldo seguro para instalaciones personales que aun no
   * han configurado SESSION_ENCRYPTION_KEY: el token nunca llega al navegador y
   * solo se usa como material para derivar la clave AES. Una clave explicita
   * sigue teniendo prioridad porque conserva sesiones entre despliegues.
   */
  const vercelSecret = process.env.VERCEL_OIDC_TOKEN?.trim();
  if (vercelSecret) return vercelSecret;

  // En produccion la falta de clave es un error de configuracion y debe verse.
  // En local no: obligar a generar una clave antes de poder mirar la app es
  // friccion sin ganancia, porque lo que cifra no sale del proceso.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Falta SESSION_ENCRYPTION_KEY para cifrar las sesiones y Vercel no proporcionó OIDC.');
  }
  return ephemeralDevSecret();
}

export function encryptTokenSet(tokens: TokenSet, secret = configuredSecret()): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFromSecret(secret), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(tokens), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptTokenSet(value: string, secret = configuredSecret()): TokenSet {
  const [version, encodedIv, encodedTag, encodedPayload] = value.split('.');
  if (version !== VERSION || !encodedIv || !encodedTag || !encodedPayload) {
    throw new Error('La sesión cifrada no tiene un formato válido.');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    keyFromSecret(secret),
    Buffer.from(encodedIv, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));
  const raw = Buffer.concat([
    decipher.update(Buffer.from(encodedPayload, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object') throw new Error('La sesión descifrada no es válida.');
  const candidate = parsed as Partial<TokenSet>;
  if (
    typeof candidate.accessToken !== 'string' ||
    typeof candidate.refreshToken !== 'string' ||
    typeof candidate.expiresAt !== 'number'
  ) {
    throw new Error('La sesión descifrada no contiene tokens válidos.');
  }
  return candidate as TokenSet;
}
