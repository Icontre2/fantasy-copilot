import assert from "node:assert/strict";
import test from "node:test";
import { generarRadar } from "./radar.ts";
import type { LlamadaClaude } from "./claude.ts";

/**
 * `generarRadar` con una `LlamadaClaude` de mentira: nunca toca la red ni el
 * sistema de ficheros (usa `generarRadar`, no `ejecutarYGuardarRadar`, que es
 * la que escribe). Comprueba lo que es responsabilidad de ESTA función, no
 * del modelo: los ids son deterministas y la fecha del payload es siempre la
 * pedida, nunca la que el modelo haya podido escribir por su cuenta.
 */

const OPORTUNIDAD_DE_PRUEBA = {
  title: "Cláusula de un delantero a punto de dispararse",
  problem: "Nadie sabe si le compensa pagar la cláusula esta semana.",
  whyNow: "El jugador ha anotado en las últimas tres jornadas.",
  feature: "Alertas de cláusula",
  hook: "Tu rival puede clausular a tu mejor jugador esta semana.",
  formats: ["tiktok", "reels"],
  score: 82,
  sources: [{ label: "Nota de prensa", url: "https://example.com/nota", publishedAt: "2026-08-20" }],
};

function llamadaConPayload(payload: unknown): LlamadaClaude {
  return async () => ({ texto: JSON.stringify(payload), usage: { inputTokens: 10, outputTokens: 10 } });
}

test("asigna ids deterministas RD-<fecha>-NNN en el orden recibido, nunca los del modelo", async () => {
  const llamar = llamadaConPayload({
    date: "2020-01-01", // fecha "de mentira" que el modelo pudiera devolver
    opportunities: [OPORTUNIDAD_DE_PRUEBA, { ...OPORTUNIDAD_DE_PRUEBA, title: "Segunda idea" }],
  });

  const { payload } = await generarRadar("2026-08-21", { llamar });

  assert.equal(payload.date, "2026-08-21", "la fecha del payload es siempre la pedida, no la del modelo");
  assert.deepEqual(
    payload.opportunities.map((o) => o.id),
    ["RD-20260821-001", "RD-20260821-002"],
  );
});

test("una oportunidad sin fuentes reales sigue validando (el prompt lo pide, pero el schema no lo puede forzar) y no se inventa nada extra", async () => {
  const llamar = llamadaConPayload({
    date: "2026-08-21",
    opportunities: [{ ...OPORTUNIDAD_DE_PRUEBA, sources: [] }],
  });

  const { payload } = await generarRadar("2026-08-21", { llamar });
  assert.deepEqual(payload.opportunities[0].sources, []);
});

test("un payload que no cumple el schema (falta 'sources') hace que generarRadar lance", async () => {
  const llamar: LlamadaClaude = async () => ({
    texto: JSON.stringify({ date: "2026-08-21", opportunities: [{ title: "x" }] }),
    usage: { inputTokens: 1, outputTokens: 1 },
  });
  // Dos intentos (el reintento de pedirJSON) y los dos siguen sin "sources".
  await assert.rejects(() => generarRadar("2026-08-21", { llamar }));
});
