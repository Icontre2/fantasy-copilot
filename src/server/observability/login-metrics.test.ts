import assert from "node:assert/strict";
import test from "node:test";
import { registrarAcceso, registrarFallo, registrarIntento } from "./login-metrics.ts";

/** Captura lo que se escribiría en el log, sin ensuciar la salida del test. */
function capturar(accion: () => void): Array<{ mensaje: string; datos: unknown }> {
  const original = console.info;
  const lineas: Array<{ mensaje: string; datos: unknown }> = [];
  console.info = (mensaje: unknown, datos?: unknown) => {
    lineas.push({ mensaje: String(mensaje), datos });
  };
  try {
    accion();
  } finally {
    console.info = original;
  }
  return lineas;
}

test("un fallo por credenciales se marca como posible cuenta social", () => {
  const [linea] = capturar(() =>
    registrarFallo("password", new Error("AADB2C90225: The username or password provided in the request are invalid.")),
  );
  assert.deepEqual(linea!.datos, {
    via: "password",
    resultado: "credenciales",
    codigo: "AADB2C90225",
    puedeSerCuentaSocial: true,
  });
});

test("una cuenta bloqueada por intentos se distingue de una contraseña mal", () => {
  const [linea] = capturar(() => registrarFallo("password", new Error("AADB2C90157: too many attempts")));
  const datos = linea!.datos as Record<string, unknown>;
  assert.equal(datos.resultado, "bloqueado");
  assert.equal(datos.puedeSerCuentaSocial, false);
});

test("un error sin código de B2C no inventa uno", () => {
  const [linea] = capturar(() => registrarFallo("social", new Error("se cayó la red")));
  const datos = linea!.datos as Record<string, unknown>;
  assert.equal(datos.codigo, null);
  assert.equal(datos.resultado, "error");
});

/**
 * La prueba que de verdad importa: este registro existe para poder CONTAR, no
 * para saber quién. Si un día alguien mete el correo o el texto crudo del error
 * en la línea, este test tiene que caerse.
 */
test("nunca se escapa un dato personal al log", () => {
  const detalle =
    "AADB2C90225: The username or password provided in the request are invalid. " +
    "user=javier.contreras@gmail.com ip=81.32.44.7 token=eyJhbGciOiJIUzI1NiJ9.abc";
  const lineas = capturar(() => {
    registrarIntento("password");
    registrarFallo("password", new Error(detalle));
    registrarAcceso("password");
  });

  const todo = JSON.stringify(lineas);
  for (const secreto of ["javier.contreras", "@gmail.com", "81.32.44.7", "eyJhbGci", "password provided"]) {
    assert.equal(todo.includes(secreto), false, `se ha filtrado «${secreto}» al log`);
  }
  // Y aun así, lo que sí hace falta para contar sigue estando.
  assert.equal(todo.includes("AADB2C90225"), true);
  assert.equal(todo.includes("puedeSerCuentaSocial"), true);
});

/**
 * El caso que se escapó la primera vez: `LaligaError` traduce el mensaje al
 * lanzarlo, así que el código ya no está en el texto. Si alguien quita
 * `codigoProveedor` del error, este test se cae.
 */
test("lee el código guardado en el error, no solo el del texto", () => {
  const comoLoLanzaLaliga = Object.assign(
    new Error("El email o la contraseña no son correctos. Ojo con esto: si esa cuenta…"),
    { codigoProveedor: "AADB2C90225" },
  );
  const [linea] = capturar(() => registrarFallo("password", comoLoLanzaLaliga));
  const datos = linea!.datos as Record<string, unknown>;
  assert.equal(datos.codigo, "AADB2C90225");
  assert.equal(datos.resultado, "credenciales");
  assert.equal(datos.puedeSerCuentaSocial, true);
});
