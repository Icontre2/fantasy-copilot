import assert from "node:assert/strict";
import test from "node:test";
import {
  decodePortableTokenSet,
  decryptTokenSet,
  encodePortableTokenSet,
  encryptTokenSet,
} from "./token-crypto.ts";

const tokens = { accessToken: "acc", refreshToken: "ref", expiresAt: 1_800_000_000_000 };

/** Ejecuta `fn` con unas variables de entorno concretas y las restaura despues. */
function withEnv(vars: Record<string, string | undefined>, fn: () => void): void {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(vars)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("el cifrado va y vuelve con la clave configurada", () => {
  withEnv({ SESSION_ENCRYPTION_KEY: "x".repeat(48) }, () => {
    assert.deepEqual(decryptTokenSet(encryptTokenSet(tokens)), tokens);
  });
});

test("una clave corta se rechaza: 32 caracteres es el minimo", () => {
  withEnv({ SESSION_ENCRYPTION_KEY: "corta" }, () => {
    assert.throws(() => encryptTokenSet(tokens), /al menos 32/);
  });
});

test("otra clave no puede descifrar: el token va autenticado (GCM)", () => {
  const sealed = encryptTokenSet(tokens, "a".repeat(48));
  assert.throws(() => decryptTokenSet(sealed, "b".repeat(48)));
});

test("un payload manipulado no cuela", () => {
  const sealed = encryptTokenSet(tokens, "a".repeat(48));
  const parts = sealed.split(".");
  parts[3] = Buffer.from("payload falso").toString("base64url");
  assert.throws(() => decryptTokenSet(parts.join("."), "a".repeat(48)));
});

// --- Modo de desarrollo sin configurar --------------------------------------
//
// Existe para poder mirar la app sin montar nada. Lo que NO puede pasar es que
// ese atajo llegue a produccion: alli la falta de clave es un error y tiene que
// verse.

test("sin clave y fuera de produccion usa una efimera, estable dentro del proceso", () => {
  withEnv({ SESSION_ENCRYPTION_KEY: undefined, NODE_ENV: "development" }, () => {
    const sealed = encryptTokenSet(tokens);
    // Estable: si cada llamada generase otra clave, la sesion recien creada
    // seria ilegible en la peticion siguiente.
    assert.deepEqual(decryptTokenSet(sealed), tokens);
  });
});

test("en Vercel usa OIDC como respaldo cifrado cuando falta la clave explicita", () => {
  withEnv({ SESSION_ENCRYPTION_KEY: undefined, VERCEL_OIDC_TOKEN: "o".repeat(80), NODE_ENV: "production" }, () => {
    assert.deepEqual(decryptTokenSet(encryptTokenSet(tokens)), tokens);
  });
});

test("sin ningun secreto y EN produccion lanza: el atajo de desarrollo no se cuela", () => {
  withEnv({ SESSION_ENCRYPTION_KEY: undefined, VERCEL_OIDC_TOKEN: undefined, NODE_ENV: "production" }, () => {
    assert.throws(() => encryptTokenSet(tokens), /SESSION_ENCRYPTION_KEY/);
  });
});

test("la sesión portátil cruza funciones sin depender de memoria", () => {
  const encoded = encodePortableTokenSet(tokens);
  assert.match(encoded, /^p1\./);
  assert.deepEqual(decodePortableTokenSet(encoded), tokens);
});

test("la sesión portátil rechaza un formato que no sea suyo", () => {
  assert.throws(() => decodePortableTokenSet("v1.no-es-portable"), /formato válido/);
});
