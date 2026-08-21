import assert from "node:assert/strict";
import test from "node:test";
import { resolverEnlace } from "./social-callback.ts";
import type { Credencial } from "./links.ts";
import { decryptTokenSet, encryptTokenSet } from "../laliga/token-crypto.ts";

/**
 * El fallo que dejaba el enlace inservible al segundo uso.
 *
 * Alguien entra con Google sin sesión de LALIGA activa. `resolverEnlace` lee el
 * enlace guardado, y como el permiso está a punto de caducar, lo renueva.
 * Azure B2C ROTA el refresh token en cada renovación —el que devuelve no es el
 * mismo que el que se le mandó—, así que si el nuevo no se guarda, la fila se
 * queda con un token YA GASTADO: la próxima vez que se necesite, LALIGA lo
 * rechaza y el mensaje es «tu permiso ha caducado», que no es cierto — se tiró
 * sin querer.
 *
 * Este test simula esa segunda vuelta contra dobles de Supabase y de LALIGA, y
 * comprueba que el token nuevo SÍ llega a guardarse antes de abrir sesión.
 */

const CLAVE = "clave-de-prueba-para-el-test-de-verdad-32c";
const IDENTIDAD = "supabase:6b1f2c30-0000-4000-8000-000000000001";
const REFRESCO_VIEJO = "refresco-que-esta-a-punto-de-usarse";
const REFRESCO_NUEVO = "refresco-nuevo-que-b2c-acaba-de-rotar";

function fingirFetch(onPatchFantasyLinks: (cuerpo: unknown) => void) {
  const enlaceGuardado = encryptTokenSet(
    { accessToken: "acceso-viejo", refreshToken: REFRESCO_VIEJO, expiresAt: Date.now() + 1000 },
    CLAVE,
  );

  const original = globalThis.fetch;
  globalThis.fetch = (async (entrada: string | URL | Request, init?: RequestInit) => {
    const url = String(entrada);
    const metodo = init?.method ?? "GET";

    // 1. La base deriva la clave de cifrado para esta identidad.
    if (url.includes("/rest/v1/rpc/clave_de_enlace")) {
      return new Response(JSON.stringify(CLAVE), { status: 200 });
    }

    // 2. Se lee el enlace guardado (el token viejo, a punto de caducar).
    if (url.includes("/rest/v1/fantasy_links") && metodo === "GET") {
      return new Response(
        JSON.stringify([{ encrypted_tokens: enlaceGuardado, laliga_email: null }]),
        { status: 200 },
      );
    }

    // 3. Se guarda el token RENOVADO. Esta es la llamada que faltaba.
    if (url.includes("/rest/v1/fantasy_links") && metodo === "PATCH") {
      onPatchFantasyLinks(init?.body ? JSON.parse(String(init.body)) : null);
      return new Response(null, { status: 204 });
    }

    // 4. LALIGA (Azure B2C) renueva el token y ROTA el refresh token.
    if (url.includes("oauth2/v2.0/token")) {
      return new Response(
        JSON.stringify({ access_token: "acceso-nuevo", refresh_token: REFRESCO_NUEVO, expires_in: 3600 }),
        { status: 200 },
      );
    }

    throw new Error(`la prueba no esperaba esta llamada: ${metodo} ${url}`);
  }) as typeof fetch;

  return { restaurar: () => { globalThis.fetch = original; } };
}

test("el refresh token renovado se guarda, no solo se usa", async () => {
  let cuerpoGuardado: unknown = null;
  const espia = fingirFetch((cuerpo) => { cuerpoGuardado = cuerpo; });

  try {
    const credencial: Credencial = {
      url: "https://ejemplo.supabase.co",
      apikey: "clave-publicable",
      bearer: "token-del-usuario",
    };
    const peticion = new Request("https://ejemplo.test/api/fantasy/auth/social/callback");
    const headers = new Headers();

    const resultado = await resolverEnlace(peticion, credencial, IDENTIDAD, headers);

    assert.equal(resultado.problema, undefined, `no debería fallar: ${resultado.problema}`);
    assert.match(resultado.bien ?? "", /Has entrado con Google/);

    assert.ok(cuerpoGuardado, "actualizarTokens no llegó a llamarse — el fallo original sigue ahí");
    const guardado = cuerpoGuardado as { encrypted_tokens: string };
    const tokensGuardados = decryptTokenSet(guardado.encrypted_tokens, CLAVE);

    // Lo que importa de verdad: que sea el token QUE B2C ACABA DE ROTAR, no el
    // viejo repetido. Guardar el viejo otra vez sería tan inútil como no
    // guardar nada — la siguiente renovación fallaría igual.
    assert.equal(tokensGuardados.refreshToken, REFRESCO_NUEVO);
    assert.notEqual(tokensGuardados.refreshToken, REFRESCO_VIEJO);

    // Y la sesión de la app se abre con el token nuevo, no con el viejo.
    assert.ok(headers.get("Set-Cookie")?.includes("llf_session"), "no se ha abierto sesión");
  } finally {
    espia.restaurar();
  }
});

test("si LALIGA rechaza incluso el refresh nuevo, se dice la verdad y no se guarda nada", async () => {
  const original = globalThis.fetch;
  const enlaceGuardado = encryptTokenSet(
    { accessToken: "acceso-viejo", refreshToken: REFRESCO_VIEJO, expiresAt: Date.now() + 1000 },
    CLAVE,
  );
  let sePatcheoAlgo = false;

  globalThis.fetch = (async (entrada: string | URL | Request, init?: RequestInit) => {
    const url = String(entrada);
    const metodo = init?.method ?? "GET";
    if (url.includes("/rest/v1/rpc/clave_de_enlace")) return new Response(JSON.stringify(CLAVE), { status: 200 });
    if (url.includes("/rest/v1/fantasy_links") && metodo === "GET") {
      return new Response(JSON.stringify([{ encrypted_tokens: enlaceGuardado, laliga_email: null }]), { status: 200 });
    }
    if (url.includes("/rest/v1/fantasy_links") && metodo === "PATCH") {
      sePatcheoAlgo = true;
      return new Response(null, { status: 204 });
    }
    if (url.includes("oauth2/v2.0/token")) {
      return new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 });
    }
    throw new Error(`la prueba no esperaba esta llamada: ${metodo} ${url}`);
  }) as typeof fetch;

  try {
    const credencial: Credencial = { url: "https://ejemplo.supabase.co", apikey: "clave-publicable", bearer: "token-del-usuario" };
    const resultado = await resolverEnlace(
      new Request("https://ejemplo.test/api/fantasy/auth/social/callback"),
      credencial,
      IDENTIDAD,
      new Headers(),
    );
    assert.match(resultado.problema ?? "", /permiso ha caducado/);
    assert.equal(sePatcheoAlgo, false, "no hay nada válido que guardar cuando el refresh de verdad falla");
  } finally {
    globalThis.fetch = original;
  }
});
