import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

import type { TokenSet } from './auth';

const VERSION = 'v1';

function keyFromSecret(secret: string): Buffer {
  if (secret.length < 32) {
    throw new Error('SESSION_ENCRYPTION_KEY debe tener al menos 32 caracteres.');
  }
  return createHash('sha256').update(secret, 'utf8').digest();
}

function configuredSecret(): string {
  const secret = process.env.SESSION_ENCRYPTION_KEY?.trim();
  if (!secret) throw new Error('Falta SESSION_ENCRYPTION_KEY para cifrar las sesiones.');
  return secret;
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
