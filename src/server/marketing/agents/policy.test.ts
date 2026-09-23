import assert from "node:assert/strict";
import test from "node:test";
import { ES_CRITICO, salidaBrandReviewerSchema, salidaCopywriterSchema, salidaCreativeDirectorSchema, validarSalida } from "./contracts.ts";
import {
  DOCUMENTOS_POR_ESPECIALISTA,
  esCopyPobre,
  evaluarOportunidad,
  invocaVideoDirector,
  paqueteDeContexto,
  recuperarDe,
  rutaSinRevision,
  rutaTrasRevision,
} from "./policy.ts";
import { siguienteNumeroDePieza } from "../pipeline/queue.ts";
import type { SalidaCopywriter } from "./contracts.ts";

/**
 * Los diez escenarios de la Fase C del documento maestro, ejecutados contra
 * las decisiones reales del Orchestrator.
 *
 * Estos tests NO invocan a Claude: comprueban las reglas, que es lo que se
 * puede comprobar sin gastar un token. «Una sola autocorrección» o «el Video
 * Director es opcional» son afirmaciones ejecutables; que el modelo escriba
 * buen copy no lo es.
 */

const REVISION_BASE = { minor_issues: [], major_issues: [], required_fixes: [], block_reasons: [] };

// ── Test 1 — Evergreen simple ────────────────────────────────────────────────

test("Test 1: una pieza evergreen se produce sin Radar", () => {
  const decision = evaluarOportunidad({ tipo: "evergreen" });
  assert.equal(decision.produce, true);
  assert.equal(decision.produce && decision.tipo, "evergreen");
});

// ── Test 2 — Actualidad válida ───────────────────────────────────────────────

test("Test 2: actualidad con evidencia verificable se produce", () => {
  const decision = evaluarOportunidad({
    tipo: "actualidad",
    evidencias: [{ label: "AS", url: "https://as.com/nota", publishedAt: "2026-08-22" }],
  });
  assert.equal(decision.produce, true);
  assert.equal(decision.produce && decision.tipo, "actualidad");
});

// ── Test 3 — Actualidad sin Radar ────────────────────────────────────────────

test("Test 3: actualidad SIN evidencia no se produce y degrada a evergreen", () => {
  for (const entrada of [{ tipo: "actualidad" as const }, { tipo: "actualidad" as const, evidencias: [] }]) {
    const decision = evaluarOportunidad(entrada);
    assert.equal(decision.produce, false, "sin fuente no se produce");
    assert.equal(decision.produce === false && decision.alternativa, "evergreen", "no tumba la ejecución: degrada");
  }
});

// ── Test 4 — Feature inexistente → BLOCK ─────────────────────────────────────

test("Test 4: BLOCK termina en `blocked` y conserva la razón exacta", () => {
  const revision = validarSalida(salidaBrandReviewerSchema, {
    ...REVISION_BASE,
    verdict: "BLOCK",
    major_issues: ["Menciona una función que no existe."],
    block_reasons: ["La pieza promete rankings globales, que no están en PRODUCT_TRUTH."],
  });
  assert.equal(revision.ok, true);

  const ruta = rutaTrasRevision(revision.ok ? revision.datos : (undefined as never), 0);
  assert.equal(ruta.accion, "finalizar");
  assert.equal(ruta.accion === "finalizar" && ruta.estado, "blocked");
  assert.match(ruta.accion === "finalizar" ? ruta.motivo : "", /rankings globales/);
});

test("un BLOCK sin razones no cumple el contrato", () => {
  const r = validarSalida(salidaBrandReviewerSchema, { ...REVISION_BASE, verdict: "BLOCK" });
  assert.equal(r.ok, false);
});

test("un PASS con problemas mayores es una contradicción, no un PASS", () => {
  const r = validarSalida(salidaBrandReviewerSchema, { ...REVISION_BASE, verdict: "PASS", major_issues: ["Cifra inventada."] });
  assert.equal(r.ok, false);
});

// ── Test 5 — FIX → autocorrección → nueva revisión ───────────────────────────

test("Test 5: FIX autocorrige UNA vez; el segundo FIX bloquea en vez de repetir", () => {
  const fix = { ...REVISION_BASE, verdict: "FIX" as const, required_fixes: ["El CTA es demasiado agresivo."] };

  const primera = rutaTrasRevision(fix, 0);
  assert.equal(primera.accion, "autocorregir");
  assert.deepEqual(primera.accion === "autocorregir" ? primera.cambios : [], ["El CTA es demasiado agresivo."]);

  // Segunda vuelta: la autocorrección ya se gastó.
  const segunda = rutaTrasRevision(fix, 1);
  assert.equal(segunda.accion, "finalizar", "una segunda corrección sería el principio de un loop");
  assert.equal(segunda.accion === "finalizar" && segunda.estado, "blocked");
});

test("no hay loops: a partir de una autocorrección usada, ningún FIX vuelve a corregir", () => {
  const fix = { ...REVISION_BASE, verdict: "FIX" as const, required_fixes: ["Otra cosa."] };
  for (const usadas of [1, 2, 5, 99]) {
    assert.equal(rutaTrasRevision(fix, usadas).accion, "finalizar");
  }
});

test("PASS termina en pending_approval; un Reviewer caído nunca aprueba", () => {
  const pass = rutaTrasRevision({ ...REVISION_BASE, verdict: "PASS" }, 0);
  assert.equal(pass.accion === "finalizar" && pass.estado, "pending_approval");

  const caido = rutaSinRevision();
  assert.equal(caido.accion === "finalizar" && caido.estado, "review_pending", "una caída no es un permiso");
});

// ── Test 6 — Pieza estática → sin Video Director ─────────────────────────────

test("Test 6: el Video Director solo se invoca para formato `video`", () => {
  assert.equal(invocaVideoDirector("static"), false);
  assert.equal(invocaVideoDirector("carousel"), false);
  assert.equal(invocaVideoDirector("motion"), false, "motion básico se resuelve sin Video Director");
  assert.equal(invocaVideoDirector("video"), true);
});

// ── Test 7 — Captura real necesaria ──────────────────────────────────────────

const CREATIVO_BASE = {
  creative_concept: "Las dudas del once, como casillas abiertas.",
  visual_metaphor: "Un once con huecos que se rellenan.",
  composition: "9:16, mucho aire arriba.",
  typography_hierarchy: "Titular grande, dato pequeño.",
  brand_devices: ["línea roja"],
  motion_notes: "",
  cover_frame: "El hueco del lateral derecho.",
  canva_handoff: null,
};

test("Test 7: needs_capture=true exige decir QUÉ pantalla hace falta", () => {
  const conPeticion = validarSalida(salidaCreativeDirectorSchema, {
    ...CREATIVO_BASE,
    scene_system: [{ kind: "real_app_capture", description: "Once probable en LigaLab." }],
    needs_capture: true,
    capture_request: "Captura real del once probable, sin datos de managers identificables.",
  });
  assert.equal(conPeticion.ok, true);

  const sinPeticion = validarSalida(salidaCreativeDirectorSchema, {
    ...CREATIVO_BASE,
    scene_system: [{ kind: "real_app_capture", description: "Once probable en LigaLab." }],
    needs_capture: true,
    capture_request: null,
  });
  assert.equal(sinPeticion.ok, false, "pedir una captura sin decir cuál no sirve de nada");
});

test("needs_capture se deriva de los planos, no se declara a mano", () => {
  // Dice que no necesita captura, pero tiene un plano que es una captura.
  const incoherente = validarSalida(salidaCreativeDirectorSchema, {
    ...CREATIVO_BASE,
    scene_system: [{ kind: "real_app_capture", description: "Once probable." }],
    needs_capture: false,
    capture_request: null,
  });
  assert.equal(incoherente.ok, false);

  // Y al revés: dice que sí, pero no hay ningún plano de captura.
  const alReves = validarSalida(salidaCreativeDirectorSchema, {
    ...CREATIVO_BASE,
    scene_system: [{ kind: "typography_motion", description: "Titular animado." }],
    needs_capture: true,
    capture_request: "Algo.",
  });
  assert.equal(alReves.ok, false);
});

// ── Test 8 — ID duplicado ────────────────────────────────────────────────────

test("Test 8: un contentId existente no se pisa, se usa el siguiente libre", () => {
  assert.equal(siguienteNumeroDePieza("2026-08-22", ["LL-20260822-001"]), 2);
  assert.equal(siguienteNumeroDePieza("2026-08-22", ["LL-20260822-001", "LL-20260822-002"]), 3);
  // La pieza hecha a mano con la convención antigua numera otra serie.
  assert.equal(siguienteNumeroDePieza("2026-08-22", ["LL-2026-001"]), 1);
});

// ── Test 9 — Output pobre de un especialista ─────────────────────────────────

function copy(overrides: Partial<SalidaCopywriter>): SalidaCopywriter {
  return {
    hooks: ["Uno", "Dos", "Tres", "Cuatro", "Cinco"],
    best_hook: "Uno",
    spoken_script: "Tienes tres posiciones abiertas y noventa minutos para decidir cuál te cuesta más puntos.",
    on_screen_text: [],
    ctas: ["Míralo", "Compáralo", "Decídelo"],
    best_cta: "Míralo",
    tiktok_caption: "Las dudas del once.",
    alt_caption: "Once probable.",
    comment_bait: "¿Tú a quién pones?",
    claims_needing_validation: [],
    ...overrides,
  };
}

test("Test 9: cumplir el contrato no basta — cinco hooks iguales son un output pobre", () => {
  assert.equal(esCopyPobre(copy({})), false);
  assert.equal(esCopyPobre(copy({ hooks: ["Igual", "igual", "IGUAL ", "Igual", "igual"] })), true);
  assert.equal(esCopyPobre(copy({ spoken_script: "Mira la app." })), true, "un guion de tres palabras no es un guion");
});

test("ante un output pobre el Orchestrator reintenta una vez, no acepta ni aborta", () => {
  const primera = recuperarDe("copywriter", 0);
  assert.equal(primera.accion, "reintentar");
});

// ── Test 10 — Caída de un especialista no crítico ────────────────────────────

test("Test 10: la fábrica no se cae por un especialista no crítico", () => {
  // Video Director y Creative Director: la pieza sigue, degradada.
  for (const especialista of ["video-director", "creative-director"] as const) {
    const recuperacion = recuperarDe(especialista, 1);
    assert.equal(recuperacion.accion, "degradar", `${especialista} no debería abortar la ejecución`);
  }

  // Strategist, Copywriter y Reviewer sí son imprescindibles.
  for (const especialista of ["strategist", "copywriter", "brand-reviewer"] as const) {
    const recuperacion = recuperarDe(especialista, 1);
    assert.equal(recuperacion.accion, "abortar", `${especialista} es crítico`);
  }
});

test("el reintento es uno por especialista, no ilimitado", () => {
  assert.equal(recuperarDe("creative-director", 0).accion, "reintentar");
  assert.equal(recuperarDe("creative-director", 1).accion, "degradar");
  assert.equal(recuperarDe("creative-director", 2).accion, "degradar");
});

test("el Video Director es el único especialista opcional Y no crítico a la vez", () => {
  assert.equal(ES_CRITICO["video-director"], false);
  assert.equal(invocaVideoDirector("static"), false);
});

// ── Context packets (§10) ────────────────────────────────────────────────────

test("cada especialista recibe solo sus documentos, nunca el repo entero", () => {
  const paquete = paqueteDeContexto("copywriter", { insight: "…", audiencia: "…" });

  /*
   * Se comprueba el INVARIANTE, no la lista literal. La primera versión fijaba
   * los dos documentos exactos del copywriter y se puso roja en cuanto alguien
   * le añadió `PRELAUNCH_CONTENT.md` a propósito — un test que se rompe cada
   * vez que el sistema evoluciona como debe no está protegiendo nada, solo
   * pidiendo permiso. Lo que sí importa es que al copywriter no le llegue la
   * estrategia: eso ya viene resuelto en `datos`, y mandársela otra vez le
   * invitaría a reinterpretar el problema desde cero.
   */
  assert.ok(paquete.documentos.includes("brand/VOICE.md"), "sin Voice no puede escribir con la voz de la marca");
  assert.ok(paquete.documentos.includes("brand/CONTENT_RULES.md"));
  assert.equal(paquete.documentos.includes("marketing/STRATEGY.md"), false, "la estrategia ya viene resuelta en `datos`");
  assert.deepEqual(Object.keys(paquete.datos).sort(), ["audiencia", "insight"]);
});

test("el context packet de cada especialista sigue siendo acotado", () => {
  /*
   * El tope era cuatro y lo elegí yo sin más criterio que «pocos». Se puso rojo
   * cuando el brand-reviewer pasó legítimamente a cinco. El número no es la
   * regla: la regla del §10 es que ningún agente se lea el repositorio entero
   * para no disparar coste, latencia y contradicciones. Seis es un umbral de
   * olor, no una ley — si algún día hace falta pasarlo, que sea una decisión y
   * no un descuido, y por eso sigue habiendo un tope.
   */
  const TOPE = 6;
  for (const [especialista, documentos] of Object.entries(DOCUMENTOS_POR_ESPECIALISTA)) {
    assert.ok(documentos.length > 0, `${especialista} necesita algún documento`);
    assert.ok(documentos.length <= TOPE, `${especialista} recibe ${documentos.length}: eso ya es leerse medio repo`);
  }
});

// ── Fixture de un fallo real, no inventado ───────────────────────────────────

/**
 * Esta es la salida LITERAL que devolvió el subagente `copywriter` cuando se le
 * inyectó un fallo a propósito para probar el Test 9. No es una salida
 * imaginada por quien escribe el test: es lo que produjo el modelo.
 *
 * Se fija aquí porque es el único caso que demuestra la distinción que sostiene
 * toda la política de recuperación — una salida puede cumplir el contrato al
 * milímetro y no servir para nada. El esquema no puede ver la diferencia; por
 * eso `esCopyPobre` existe.
 */
const SALIDA_POBRE_REAL: SalidaCopywriter = {
  hooks: ["Mira LigaLab", "mira ligalab", "Mira LigaLab ", "MIRA LIGALAB", " Mira  LigaLab"],
  best_hook: "Mira LigaLab",
  spoken_script: "Mira LigaLab. Es una herramienta para tu fantasy.",
  on_screen_text: ["LigaLab", "Míralo"],
  ctas: ["Mira LigaLab", "Entra en LigaLab", "Prueba LigaLab"],
  best_cta: "Mira LigaLab",
  tiktok_caption: "Mira LigaLab.",
  alt_caption: "Texto en pantalla que dice LigaLab.",
  comment_bait: "¿Lo miras?",
  claims_needing_validation: [],
};

test("Test 9 (fallo real): la salida degradada de un especialista pasa el esquema y aun así se detecta", () => {
  const validacion = validarSalida(salidaCopywriterSchema, SALIDA_POBRE_REAL);
  assert.equal(validacion.ok, true, "el contrato la acepta: cinco hooks, tres CTA, todos los tipos correctos");
  assert.equal(esCopyPobre(SALIDA_POBRE_REAL), true, "y aun así no sirve — cinco hooks que son la misma frase");
});

test("Test 9 (fallo real): ante ella se reintenta una vez, y agotado el reintento se aborta por crítico", () => {
  assert.equal(recuperarDe("copywriter", 0).accion, "reintentar");
  assert.equal(recuperarDe("copywriter", 1).accion, "abortar", "sin copywriter no hay pieza");
});
