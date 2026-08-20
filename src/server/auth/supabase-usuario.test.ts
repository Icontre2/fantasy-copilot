import assert from "node:assert/strict";
import test from "node:test";
import { usuarioDeToken, type ConfigSupabaseAuth } from "./supabase-oauth.ts";

/**
 * Quién hay detrás de un token de Supabase.
 *
 * Esto sustituye a una cookie que firmábamos nosotros con una clave del
 * servidor. Sin esa clave —el caso real del despliegue— no se firmaba nada y la
 * app no volvía a saber quién eras: `identificado` era siempre `false` y el
 * enlace con LALIGA no se guardaba al conectar la cuenta. El botón de Google
 * daba la vuelta entera para no servir de nada.
 *
 * Lo que estos tests fijan es lo que no se puede romper sin que vuelva ese
 * fallo, y en silencio.
 */

const CONFIG: ConfigSupabaseAuth = {
  url: "https://ejemplo.supabase.co",
  apiKey: "clave-publicable",
  redirectUri: "https://ejemplo.test/callback",
};

/** Un `fetch` de mentira que devuelve lo que se le diga y cuenta las llamadas. */
function fingirFetch(respuestas: Array<Response | Error>) {
  const original = globalThis.fetch;
  let indice = 0;
  const llamadas: Array<{ url: string; cabeceras: Record<string, string> }> = [];
  globalThis.fetch = (async (entrada: string | URL | Request, init?: RequestInit) => {
    llamadas.push({
      url: String(entrada),
      cabeceras: (init?.headers ?? {}) as Record<string, string>,
    });
    const siguiente = respuestas[Math.min(indice, respuestas.length - 1)];
    indice += 1;
    if (siguiente instanceof Error) throw siguiente;
    return siguiente!;
  }) as typeof fetch;
  return { llamadas, restaurar: () => { globalThis.fetch = original; } };
}

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json" } });

test("un token válido devuelve quién es y con qué correo", async () => {
  const espia = fingirFetch([json({ id: "6b1f2c30-0000-4000-8000-000000000001", email: "alguien@ejemplo.es" })]);
  try {
    const usuario = await usuarioDeToken(CONFIG, `token-valido-${Math.random()}`);
    assert.deepEqual(usuario, { id: "6b1f2c30-0000-4000-8000-000000000001", email: "alguien@ejemplo.es" });
    assert.equal(espia.llamadas[0]!.url, "https://ejemplo.supabase.co/auth/v1/user");
    assert.equal(espia.llamadas[0]!.cabeceras.apikey, "clave-publicable");
  } finally {
    espia.restaurar();
  }
});

/**
 * El caso que de verdad importa: la cookie es `httpOnly`, pero eso solo impide
 * que la lea JavaScript del navegador — no que alguien fabrique la petición a
 * mano con el valor que quiera. Si esto dejara de verificarse, cualquiera
 * podría decir que es cualquiera.
 */
test("un token que Supabase rechaza no identifica a nadie", async () => {
  const espia = fingirFetch([json({ code: 403, error_code: "bad_jwt" }, 403)]);
  try {
    assert.equal(await usuarioDeToken(CONFIG, `token-falso-${Math.random()}`), null);
  } finally {
    espia.restaurar();
  }
});

test("una respuesta sin id no vale, aunque venga con 200", async () => {
  const espia = fingirFetch([json({ email: "sin-id@ejemplo.es" })]);
  try {
    assert.equal(await usuarioDeToken(CONFIG, `sin-id-${Math.random()}`), null);
  } finally {
    espia.restaurar();
  }
});

test("no se le pregunta a Supabase dos veces por el mismo token", async () => {
  const espia = fingirFetch([json({ id: "aaaa1111-0000-4000-8000-000000000002", email: null })]);
  const token = `token-repetido-${Math.random()}`;
  try {
    const primera = await usuarioDeToken(CONFIG, token);
    const segunda = await usuarioDeToken(CONFIG, token);
    assert.deepEqual(segunda, primera);
    assert.equal(espia.llamadas.length, 1, "la segunda vez ha vuelto a salir a la red");
  } finally {
    espia.restaurar();
  }
});

/**
 * Un corte de red NO se guarda como «esta persona no existe». Si se cacheara,
 * dos segundos de red mala dejarían al usuario sin identidad durante los dos
 * minutos siguientes, que es justo cuando está intentando entrar.
 */
test("un fallo de red no se recuerda", async () => {
  const token = `token-con-red-mala-${Math.random()}`;
  const caida = fingirFetch([new Error("se cayó la red")]);
  try {
    assert.equal(await usuarioDeToken(CONFIG, token), null);
  } finally {
    caida.restaurar();
  }

  const buena = fingirFetch([json({ id: "bbbb2222-0000-4000-8000-000000000003", email: null })]);
  try {
    const usuario = await usuarioDeToken(CONFIG, token);
    assert.equal(usuario?.id, "bbbb2222-0000-4000-8000-000000000003");
    assert.equal(buena.llamadas.length, 1, "no ha reintentado tras el corte");
  } finally {
    buena.restaurar();
  }
});

/** Nada de esto debe dejar el token escrito en ningún sitio observable. */
test("el token no se usa como clave del recuerdo", async () => {
  const token = `token-secretisimo-${Math.random()}`;
  const espia = fingirFetch([json({ id: "cccc3333-0000-4000-8000-000000000004", email: null })]);
  try {
    await usuarioDeToken(CONFIG, token);
    const memoria = (globalThis as { __llfUsuarios?: Map<string, unknown> }).__llfUsuarios;
    assert.ok(memoria, "no hay recuerdo que inspeccionar");
    assert.equal([...memoria.keys()].some((clave) => clave.includes(token)), false);
  } finally {
    espia.restaurar();
  }
});

