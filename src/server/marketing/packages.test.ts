import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fusionarPaquete, leerPaquete, ordenDeCola, type Vista } from "./packages.ts";
import { estadoHumanoVacio } from "./state.ts";

/**
 * "Un package.json inválido no tira toda la página": aquí es donde se
 * comprueba, en el sitio exacto donde se decide — `leerPaquete` nunca lanza,
 * siempre devuelve algo que el panel puede pintar.
 */

async function ficheroTemporal(contenido: string | null): Promise<{ ruta: string; limpiar: () => Promise<void> }> {
  const carpeta = await mkdtemp(path.join(tmpdir(), "marketing-test-"));
  const ruta = path.join(carpeta, "package.json");
  if (contenido !== null) await writeFile(ruta, contenido, "utf8");
  return { ruta, limpiar: () => rm(carpeta, { recursive: true, force: true }) };
}

test("leerPaquete: fichero que no existe → blocked, no lanza", async () => {
  const { ruta, limpiar } = await ficheroTemporal(null);
  try {
    const resultado = await leerPaquete("2026-08-21", "LL-20260821-001", ruta);
    assert.equal(resultado.blocked, true);
    if (resultado.blocked) assert.match(resultado.error, /no se ha podido leer/i);
  } finally {
    await limpiar();
  }
});

test("leerPaquete: JSON roto → blocked con el motivo, no lanza", async () => {
  const { ruta, limpiar } = await ficheroTemporal("{ esto no es json ");
  try {
    const resultado = await leerPaquete("2026-08-21", "LL-20260821-001", ruta);
    assert.equal(resultado.blocked, true);
    if (resultado.blocked) assert.match(resultado.error, /json válido/i);
  } finally {
    await limpiar();
  }
});

test("leerPaquete: JSON válido pero que no cumple el esquema → blocked con el campo que falla", async () => {
  const { ruta, limpiar } = await ficheroTemporal(JSON.stringify({ id: "no-tiene-la-forma-correcta" }));
  try {
    const resultado = await leerPaquete("2026-08-21", "algo", ruta);
    assert.equal(resultado.blocked, true);
    if (resultado.blocked) assert.match(resultado.error, /esquema/i);
  } finally {
    await limpiar();
  }
});

const PAQUETE_MINIMO = {
  id: "LL-20260821-001",
  date: "2026-08-21",
  status: "pending_approval",
  sourceOpportunityId: "radar-1",
  score: 82,
  problem: "Nadie sabe cuánto va a subir la cláusula de su jugador.",
  feature: "Alertas de cláusula",
  hook: "Tu delantero está a un partido de dispararse de precio.",
  needsCapture: true,
};

test("leerPaquete: un paquete válido se lee entero", async () => {
  const { ruta, limpiar } = await ficheroTemporal(JSON.stringify(PAQUETE_MINIMO));
  try {
    const resultado = await leerPaquete("2026-08-21", PAQUETE_MINIMO.id, ruta);
    assert.equal(resultado.blocked, false);
    if (!resultado.blocked) {
      assert.equal(resultado.crudo.id, PAQUETE_MINIMO.id);
      assert.equal(resultado.crudo.needsCapture, true);
    }
  } finally {
    await limpiar();
  }
});

test("leerPaquete: acepta los alias de la convención vieja (needs_capture, insight)", async () => {
  const viejo = {
    ...PAQUETE_MINIMO,
    hook: undefined,
    needsCapture: undefined,
    needs_capture: true,
    insight: "El hook que venía del formato antiguo.",
  };
  const { ruta, limpiar } = await ficheroTemporal(JSON.stringify(viejo));
  try {
    const resultado = await leerPaquete("2026-08-21", PAQUETE_MINIMO.id, ruta);
    assert.equal(resultado.blocked, false);
    if (!resultado.blocked) {
      assert.equal(resultado.crudo.needsCapture, true);
      assert.equal(resultado.crudo.hook, "El hook que venía del formato antiguo.");
    }
  } finally {
    await limpiar();
  }
});

test("fusionarPaquete: un paquete bloqueado se enseña bloqueado, con su motivo", () => {
  const vista = fusionarPaquete({ blocked: true, id: "LL-x", date: "2026-08-21", error: "boom" }, null);
  assert.deepEqual(vista, { blocked: true, id: "LL-x", date: "2026-08-21", error: "boom" });
});

test("ordenDeCola: pending_approval primero, blocked después, el resto por fecha", () => {
  const ahora = "2026-08-21T00:00:00.000Z";
  const base = (over: Partial<Vista> = {}): Vista =>
    ({
      id: "x",
      date: "2026-08-01",
      blocked: false,
      status: "draft",
      score: 50,
      problem: "",
      feature: "",
      hook: "",
      hooks: [],
      needsCapture: false,
      strategy: null,
      script: null,
      captions: null,
      cta: null,
      shots: [],
      imagePrompt: null,
      seedancePrompt: null,
      videoSequence: [],
      negativeConstraints: [],
      platforms: [],
      formats: [],
      sources: [],
      qa: null,
      needsReReview: false,
      rejectionReason: null,
      approvedAt: null,
      approvedBy: null,
      rejectedAt: null,
      rejectedBy: null,
      captures: [],
      auditTrail: estadoHumanoVacio("x", ahora).auditTrail,
      ...over,
    }) as Vista;

  const draftViejo = base({ id: "draft-viejo", date: "2026-08-01" });
  const draftNuevo = base({ id: "draft-nuevo", date: "2026-08-10" });
  const bloqueado: Vista = { id: "bloqueado", date: "2026-08-15", blocked: true, error: "roto" };
  const pendiente = base({ id: "pendiente", date: "2026-08-05", status: "pending_approval" });

  const ordenado = ordenDeCola([draftViejo, bloqueado, draftNuevo, pendiente]);
  assert.deepEqual(
    ordenado.map((v) => v.id),
    ["pendiente", "bloqueado", "draft-nuevo", "draft-viejo"],
  );
});
