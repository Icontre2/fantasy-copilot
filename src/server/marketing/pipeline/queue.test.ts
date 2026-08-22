import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  idDePieza,
  oportunidadesYaConvertidas,
  piezasDeLaFecha,
  plazasLibres,
  seleccionarOportunidades,
  siguienteNumeroDePieza,
} from "./queue.ts";
import type { RadarOpportunity } from "../schemas.ts";

/**
 * La selección de la tanda diaria.
 *
 * Existe por un fallo concreto que ningún test de antes podía ver: el 22 de
 * agosto había una pieza hecha a mano (`LL-2026-001`, convención antigua)
 * sobre la oportunidad `LL-RADAR-20260822-001`, y preparar la cola de ese
 * mismo día volvía a seleccionarla y creaba `LL-20260822-001` sobre ella. Dos
 * piezas del mismo tema, y cinco llamadas a Opus a punto de gastarse en
 * repetir algo que ya existía.
 */

function oportunidad(id: string, score: number): RadarOpportunity {
  return {
    id,
    title: `Oportunidad ${id}`,
    problem: "Un problema real de un manager.",
    whyNow: "Ha pasado algo hoy.",
    feature: "Once probable",
    hook: "Un gancho.",
    formats: ["tiktok"],
    score,
    sources: [{ label: "AS", url: "https://as.com/nota", publishedAt: "2026-08-22" }],
  };
}

const SIN_CONVERTIR = new Map<string, string>();

test("una oportunidad que ya tiene pieza no vuelve a entrar en la cadena cara", () => {
  const { seleccionadas, descartadas } = seleccionarOportunidades({
    oportunidades: [oportunidad("R-001", 95), oportunidad("R-002", 93)],
    yaConvertidas: new Map([["R-001", "LL-2026-001"]]),
    minimumScore: 70,
    limite: 3,
  });

  assert.deepEqual(seleccionadas.map((o) => o.id), ["R-002"]);
  assert.deepEqual(descartadas, [
    { id: "R-001", title: "Oportunidad R-001", score: 95, motivo: "ya_convertida", piezaExistente: "LL-2026-001" },
  ]);
});

test("una pieza ya hecha no consume una plaza del límite diario", () => {
  // Si el duplicado se filtrara DESPUÉS del límite, este día produciría dos
  // piezas nuevas en vez de las tres que el límite permite.
  const { seleccionadas } = seleccionarOportunidades({
    oportunidades: [95, 93, 92, 90].map((score, i) => oportunidad(`R-00${i + 1}`, score)),
    yaConvertidas: new Map([["R-001", "LL-2026-001"]]),
    minimumScore: 70,
    limite: 3,
  });

  assert.deepEqual(seleccionadas.map((o) => o.id), ["R-002", "R-003", "R-004"]);
});

test("ordena por score y corta en el límite, diciendo qué queda fuera", () => {
  const { seleccionadas, descartadas } = seleccionarOportunidades({
    oportunidades: [oportunidad("R-001", 74), oportunidad("R-002", 95), oportunidad("R-003", 60)],
    yaConvertidas: SIN_CONVERTIR,
    minimumScore: 70,
    limite: 1,
  });

  assert.deepEqual(seleccionadas.map((o) => o.id), ["R-002"]);
  assert.deepEqual(
    descartadas.map((d) => [d.id, d.motivo]),
    [["R-003", "score_bajo"], ["R-001", "fuera_del_limite_diario"]],
  );
});

test("el score justo en el mínimo entra; uno por debajo, no", () => {
  const { seleccionadas } = seleccionarOportunidades({
    oportunidades: [oportunidad("R-001", 70), oportunidad("R-002", 69)],
    yaConvertidas: SIN_CONVERTIR,
    minimumScore: 70,
    limite: 3,
  });

  assert.deepEqual(seleccionadas.map((o) => o.id), ["R-001"]);
});

async function escribirPieza(raiz: string, fecha: string, id: string, contenido: unknown): Promise<void> {
  const carpeta = path.join(raiz, "marketing", "generated", fecha, id);
  await mkdir(carpeta, { recursive: true });
  await writeFile(path.join(carpeta, "package.json"), JSON.stringify(contenido));
}

test("encuentra la procedencia en las DOS convenciones, y en cualquier fecha", async () => {
  const raiz = await mkdtemp(path.join(tmpdir(), "cola-"));
  // Convención antigua: la procedencia se llama `radarId`.
  await escribirPieza(raiz, "2026-08-22", "LL-2026-001", { id: "LL-2026-001", radarId: "LL-RADAR-20260822-001" });
  // Convención nueva, y de OTRO día: sigue ocupando su oportunidad.
  await escribirPieza(raiz, "2026-08-21", "LL-20260821-001", {
    id: "LL-20260821-001",
    sourceOpportunityId: "LL-RADAR-20260821-004",
  });

  const convertidas = await oportunidadesYaConvertidas(raiz);

  assert.equal(convertidas.get("LL-RADAR-20260822-001"), "LL-2026-001");
  assert.equal(convertidas.get("LL-RADAR-20260821-004"), "LL-20260821-001");
});

test("una pieza sin procedencia declarada no ocupa ninguna oportunidad", async () => {
  const raiz = await mkdtemp(path.join(tmpdir(), "cola-"));
  // `normalizarPaquete` rellena `sourceOpportunityId` con el propio id cuando
  // el fichero no dice de dónde viene. Eso sirve para poder revisarla en el
  // panel, pero aquí sería falso: no se sabe qué oportunidad cubre.
  await escribirPieza(raiz, "2026-08-22", "LL-SUELTA-001", { id: "LL-SUELTA-001", hook: "Sin Radar." });

  assert.equal((await oportunidadesYaConvertidas(raiz)).size, 0);
});

test("un package.json roto no se ignora si declara de dónde viene", async () => {
  const raiz = await mkdtemp(path.join(tmpdir(), "cola-"));
  // Le falta todo lo obligatorio: el panel lo enseñará como `blocked`. Pero
  // una pieza rota sigue siendo una pieza sobre ese tema — regenerarla por
  // detrás sería gastar tokens en un duplicado.
  await escribirPieza(raiz, "2026-08-22", "LL-ROTA-001", { radarId: "LL-RADAR-20260822-007" });

  assert.equal((await oportunidadesYaConvertidas(raiz)).get("LL-RADAR-20260822-007"), "LL-ROTA-001");
});

test("un JSON inválido no tumba la comprobación entera", async () => {
  const raiz = await mkdtemp(path.join(tmpdir(), "cola-"));
  const carpeta = path.join(raiz, "marketing", "generated", "2026-08-22", "LL-BASURA-001");
  await mkdir(carpeta, { recursive: true });
  await writeFile(path.join(carpeta, "package.json"), "{ esto no es json");
  await escribirPieza(raiz, "2026-08-22", "LL-2026-001", { id: "LL-2026-001", radarId: "LL-RADAR-20260822-001" });

  assert.equal((await oportunidadesYaConvertidas(raiz)).get("LL-RADAR-20260822-001"), "LL-2026-001");
});

test("sin carpeta `generated` no hay nada convertido, y no es un error", async () => {
  const raiz = await mkdtemp(path.join(tmpdir(), "cola-"));
  assert.equal((await oportunidadesYaConvertidas(raiz)).size, 0);
});

test("los ids de pieza son deterministas y van con la fecha", () => {
  assert.equal(idDePieza("2026-08-22", 1), "LL-20260822-001");
  assert.equal(idDePieza("2026-08-22", 10), "LL-20260822-010");
});

test("la siguiente pieza se numera a partir de lo que ya hay en disco", () => {
  assert.equal(siguienteNumeroDePieza("2026-08-22", []), 1);
  assert.equal(siguienteNumeroDePieza("2026-08-22", ["LL-20260822-001", "LL-20260822-002"]), 3);
  // Los huecos no se reutilizan: si 002 se borró, la siguiente sigue siendo 003.
  assert.equal(siguienteNumeroDePieza("2026-08-22", ["LL-20260822-001", "LL-20260822-003"]), 4);
});

test("un id de la convención antigua no altera la numeración de la nueva", () => {
  // `LL-2026-001` es una pieza real del 22 de agosto, pero su `001` numera
  // otra serie: tomarlo por el de esta fecha haría empezar en 002 sin motivo.
  assert.equal(siguienteNumeroDePieza("2026-08-22", ["LL-2026-001"]), 1);
});

test("el límite diario descuenta las piezas que ya existen para esa fecha", () => {
  assert.equal(plazasLibres(3, 0), 3);
  assert.equal(plazasLibres(3, 1), 2, "la pieza hecha a mano ocupa una plaza del día");
  assert.equal(plazasLibres(3, 3), 0);
  assert.equal(plazasLibres(3, 5), 0, "nunca negativo: un día pasado de la cuenta no da plazas extra");
});

test("piezasDeLaFecha solo mira su propia fecha", async () => {
  const raiz = await mkdtemp(path.join(tmpdir(), "cola-"));
  await escribirPieza(raiz, "2026-08-22", "LL-20260822-001", { id: "LL-20260822-001" });
  await escribirPieza(raiz, "2026-08-21", "LL-20260821-001", { id: "LL-20260821-001" });

  assert.deepEqual(await piezasDeLaFecha(raiz, "2026-08-22"), ["LL-20260822-001"]);
  assert.deepEqual(await piezasDeLaFecha(raiz, "2026-01-01"), [], "una fecha sin carpeta no es un error");
});
