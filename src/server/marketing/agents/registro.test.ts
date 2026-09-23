import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { anotarTanda, etapaMasLenta, nuevoRunId, resumirTanda, rutaDelRegistro, type RegistroDeTanda } from "./registro.ts";

/**
 * El registro existe para «saber por qué se bloquea Claude en lugar de
 * adivinarlo» (§24). Estos tests fijan las tres decisiones que lo hacen útil:
 * apila en vez de reescribir, nunca tumba la tanda que registra, y distingue
 * «este motor no tiene ese concepto» de «no pasó».
 */

function tanda(over: Partial<RegistroDeTanda> = {}): RegistroDeTanda {
  return {
    run_id: "RUN-20260830-120000-abcd",
    timestamp: "2026-08-30T12:00:00.000Z",
    motor: "pipeline",
    content_id: "LL-20260830-001",
    opportunity_id: "LL-RADAR-20260830-002",
    etapas: [
      { agente: "strategist", ms: 4000, inputTokens: 10, outputTokens: 5 },
      { agente: "copywriter", ms: 9000, inputTokens: 20, outputTokens: 8 },
    ],
    ms_total: 13000,
    input_tokens: 30,
    output_tokens: 13,
    reviewer_verdict: null,
    autocorrection_used: null,
    qa_pass: true,
    final_status: "pending_approval",
    error: null,
    ...over,
  };
}

test("dos tandas del mismo día se apilan: la segunda no borra la primera", async () => {
  const raiz = await mkdtemp(path.join(tmpdir(), "runs-"));
  await anotarTanda(raiz, "2026-08-30", tanda({ content_id: "LL-A" }));
  await anotarTanda(raiz, "2026-08-30", tanda({ content_id: "LL-B" }));

  const lineas = (await readFile(rutaDelRegistro(raiz, "2026-08-30"), "utf8")).trim().split("\n");
  assert.equal(lineas.length, 2);
  assert.deepEqual(lineas.map((l) => JSON.parse(l).content_id), ["LL-A", "LL-B"]);
});

test("un registro que no se puede escribir NO tumba la tanda que registraba", async () => {
  // Un FICHERO donde debería ir el directorio: `mkdir` falla al instante con
  // ENOTDIR. El registro tiene que tragárselo — un log que revienta la tanda
  // que estaba registrando es peor que no tener log.
  const raiz = await mkdtemp(path.join(tmpdir(), "runs-"));
  await writeFile(path.join(raiz, "marketing"), "soy un fichero, no una carpeta");

  await assert.doesNotReject(() => anotarTanda(raiz, "2026-08-30", tanda()));
});

test("`null` significa «este motor no tiene ese concepto», no «no pasó»", () => {
  const dePipeline = tanda();
  assert.equal(dePipeline.reviewer_verdict, null, "la pipeline no emite PASS/FIX/BLOCK");
  assert.equal(dePipeline.autocorrection_used, null, "ni autocorrige");

  // El Orchestrator sí los tiene, y entonces son valores de verdad.
  const deOrchestrator = tanda({ motor: "orchestrator", reviewer_verdict: "FIX", autocorrection_used: true });
  assert.equal(deOrchestrator.reviewer_verdict, "FIX");
  assert.equal(deOrchestrator.autocorrection_used, true);
});

test("la etapa más lenta es la que se busca cuando una tanda tarda de más", () => {
  assert.equal(etapaMasLenta(tanda())?.agente, "copywriter");
  assert.equal(etapaMasLenta(tanda({ etapas: [] })), null, "una tanda que no llegó a ejecutar nada no tiene etapa lenta");
});

test("una tanda que revienta también deja registro, con su motivo", async () => {
  const raiz = await mkdtemp(path.join(tmpdir(), "runs-"));
  await anotarTanda(raiz, "2026-08-30", tanda({ etapas: [], final_status: "error", qa_pass: null, error: "ANTHROPIC_API_KEY no está configurada." }));

  const linea = JSON.parse((await readFile(rutaDelRegistro(raiz, "2026-08-30"), "utf8")).trim());
  assert.equal(linea.final_status, "error");
  assert.match(linea.error, /ANTHROPIC_API_KEY/);
  assert.equal(linea.qa_pass, null, "sin QA no se escribe `false`: no se llegó a revisar");
});

test("el resumen cabe en una línea y dice dónde se fue el tiempo", () => {
  const texto = resumirTanda(tanda());
  assert.match(texto, /LL-20260830-001/);
  assert.match(texto, /pending_approval/);
  assert.match(texto, /13\.0s/);
  assert.match(texto, /strategist 4\.0s/);
  assert.match(texto, /copywriter 9\.0s/);
});

test("los run_id son distintos entre ejecuciones y ordenables por fecha", () => {
  const a = nuevoRunId(new Date("2026-08-30T12:00:00Z"));
  const b = nuevoRunId(new Date("2026-08-30T12:00:00Z"));
  assert.notEqual(a, b, "dos tandas en el mismo segundo siguen siendo tandas distintas");
  assert.match(a, /^RUN-20260830-120000-/);
  assert.ok(nuevoRunId(new Date("2026-08-29T12:00:00Z")) < a, "ordenables por fecha sin parsear");
});
