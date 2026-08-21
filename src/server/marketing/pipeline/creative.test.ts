import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { generarCreativo } from "./creative.ts";
import type { LlamadaClaude, RespuestaDeClaude } from "./claude.ts";

/**
 * `generarCreativo` con una `LlamadaClaude` de mentira que responde según qué
 * agente le está preguntando (se distingue por el system prompt, que
 * `creative.ts` siempre empieza con `Eres el agente "<Nombre>"`). Ni una
 * llamada real a la API; el sistema de ficheros es un directorio temporal
 * que se borra al final.
 *
 * Esto es lo que de verdad hay que comprobar: que las fuentes y los formatos
 * vienen del Radar y no de ningún agente caro, que `needsCapture` se deriva
 * de los planos de verdad, y que un QA que falla dejar la pieza en
 * `brand_review`, nunca en `pending_approval`.
 */

const ESTRATEGIA = { audience: "managers de liga privada", problem: "p", insight: "i", feature: "Alertas de cláusula", proofNeeded: "x", angle: "a", cta: "Actívalas", riskNotes: "" };
const COPY = {
  hooks: ["Hook uno", "Hook dos", "Hook tres"],
  hook: "Hook uno",
  script: "Problema. Tensión. Prueba. CTA.",
  captions: { tiktok: "caption tiktok" },
  cta: "Actívalas ya",
  platforms: ["tiktok"],
};
const CREATIVO_CON_CAPTURA = {
  shots: [{ description: "Pantalla de alertas", kind: "real_app_capture", captureNeeded: "Alertas de cláusula" }],
  imagePrompt: "imagen de fondo",
};
const CREATIVO_SIN_CAPTURA = {
  shots: [{ description: "Tipografía animada", kind: "typography_motion" }],
  imagePrompt: "imagen de fondo",
};
const VIDEO = {
  videoSequence: [{ timestamp: "0:00-0:03", description: "Abre con el problema" }],
  seedancePrompt: "prompt de seedance",
  negativeConstraints: ["no generar UI falsa"],
};
const QA_PASA = { pass: true, blockedReasons: [], warnings: [], requiredChanges: [] };
const QA_NO_PASA = { pass: false, blockedReasons: ["falta fuente"], warnings: [], requiredChanges: ["citar la fuente"] };

function respuesta(json: unknown): RespuestaDeClaude {
  return { texto: JSON.stringify(json), usage: { inputTokens: 10, outputTokens: 10 } };
}

function llamadaPorEtapa(opts: { creativo?: unknown; qa?: unknown } = {}): LlamadaClaude {
  const creativo = opts.creativo ?? CREATIVO_CON_CAPTURA;
  const qa = opts.qa ?? QA_PASA;
  return async ({ system }) => {
    if (system.startsWith('Eres el agente "Strategist"')) return respuesta(ESTRATEGIA);
    if (system.startsWith('Eres el agente "Copywriter"')) return respuesta(COPY);
    if (system.startsWith('Eres el agente "Creative Director"')) return respuesta(creativo);
    if (system.startsWith('Eres el agente "Video Director"')) return respuesta(VIDEO);
    if (system.startsWith('Eres el agente "Brand Reviewer"')) return respuesta(qa);
    throw new Error(`Etapa no reconocida en el system prompt: ${system.slice(0, 60)}`);
  };
}

async function prepararProyecto(): Promise<{ raiz: string; limpiar: () => Promise<void> }> {
  const raiz = await mkdtemp(path.join(tmpdir(), "marketing-creative-test-"));
  const fecha = "2026-08-21";
  const contentId = "LL-20260821-001";

  await mkdir(path.join(raiz, "marketing", "radar"), { recursive: true });
  await writeFile(
    path.join(raiz, "marketing", "radar", `${fecha}.json`),
    JSON.stringify({
      date: fecha,
      opportunities: [
        {
          id: "RD-1",
          title: "t",
          problem: "Nadie sabe si puede clausular.",
          whyNow: "El jugador está en racha.",
          feature: "Alertas de cláusula",
          hook: "Tu rival puede clausular a tu jugador.",
          formats: ["tiktok", "reels"],
          score: 82,
          sources: [{ label: "Fuente real", url: "https://example.com/x" }],
        },
      ],
    }),
  );

  const carpetaPaquete = path.join(raiz, "marketing", "generated", fecha, contentId);
  await mkdir(carpetaPaquete, { recursive: true });
  await writeFile(
    path.join(carpetaPaquete, "package.json"),
    JSON.stringify({
      id: contentId,
      date: fecha,
      status: "draft",
      sourceOpportunityId: "RD-1",
      score: 82,
      problem: "Nadie sabe si puede clausular.",
      feature: "Alertas de cláusula",
      hook: "Tu rival puede clausular a tu jugador.",
      needsCapture: true,
      strategy: null,
      script: null,
      imagePrompt: null,
      seedancePrompt: null,
      captions: null,
      qa: null,
      approval: { required: true, status: "pending", approvedAt: null, approvedBy: null },
    }),
  );

  return { raiz, limpiar: () => rm(raiz, { recursive: true, force: true }) };
}

test("QA pass=true → pending_approval; needsCapture se deriva de los planos reales", async () => {
  const { raiz, limpiar } = await prepararProyecto();
  try {
    const { paquete } = await generarCreativo("2026-08-21", "LL-20260821-001", { raizDatos: raiz, llamar: llamadaPorEtapa() });
    assert.equal(paquete.status, "pending_approval");
    assert.equal(paquete.needsCapture, true);
    assert.equal(paquete.qa?.pass, true);
    assert.equal(paquete.qa?.checkedBy, "brand-reviewer-agent");
  } finally {
    await limpiar();
  }
});

test("QA pass=false → brand_review, nunca pending_approval", async () => {
  const { raiz, limpiar } = await prepararProyecto();
  try {
    const { paquete } = await generarCreativo("2026-08-21", "LL-20260821-001", { raizDatos: raiz, llamar: llamadaPorEtapa({ qa: QA_NO_PASA }) });
    assert.equal(paquete.status, "brand_review");
    assert.equal(paquete.qa?.pass, false);
    assert.deepEqual(paquete.qa?.blockedReasons, ["falta fuente"]);
  } finally {
    await limpiar();
  }
});

test("sin ningún plano real_app_capture → needsCapture=false", async () => {
  const { raiz, limpiar } = await prepararProyecto();
  try {
    const { paquete } = await generarCreativo("2026-08-21", "LL-20260821-001", { raizDatos: raiz, llamar: llamadaPorEtapa({ creativo: CREATIVO_SIN_CAPTURA }) });
    assert.equal(paquete.needsCapture, false);
  } finally {
    await limpiar();
  }
});

test("las fuentes y los formatos vienen del Radar, nunca de un agente caro", async () => {
  const { raiz, limpiar } = await prepararProyecto();
  try {
    const { paquete } = await generarCreativo("2026-08-21", "LL-20260821-001", { raizDatos: raiz, llamar: llamadaPorEtapa() });
    assert.deepEqual(paquete.sources, [{ label: "Fuente real", url: "https://example.com/x" }]);
    assert.deepEqual(paquete.formats, ["tiktok", "reels"]);
  } finally {
    await limpiar();
  }
});

test("un contentId que no existe en el fichero de radar hace que falle, no que se invente la oportunidad", async () => {
  const { raiz, limpiar } = await prepararProyecto();
  try {
    const carpeta = path.join(raiz, "marketing", "generated", "2026-08-21", "LL-20260821-002");
    await mkdir(carpeta, { recursive: true });
    await writeFile(
      path.join(carpeta, "package.json"),
      JSON.stringify({
        id: "LL-20260821-002",
        date: "2026-08-21",
        status: "draft",
        sourceOpportunityId: "RD-QUE-NO-EXISTE",
        score: 50,
        problem: "p",
        feature: "f",
        hook: "h",
        needsCapture: true,
      }),
    );
    await assert.rejects(
      () => generarCreativo("2026-08-21", "LL-20260821-002", { raizDatos: raiz, llamar: llamadaPorEtapa() }),
      /No se encuentra la oportunidad/,
    );
  } finally {
    await limpiar();
  }
});
