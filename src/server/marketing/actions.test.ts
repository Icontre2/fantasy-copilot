import assert from "node:assert/strict";
import test from "node:test";
import { aprobar, editar, marcarQA, reabrir, rechazar, TransicionInvalida, type ContextoEfectivo } from "./actions.ts";
import { estadoHumanoVacio } from "./state.ts";
import type { QAResult } from "./schemas.ts";

/**
 * Las reglas de negocio del panel, probadas sin red: ni Supabase ni el
 * sistema de ficheros de por medio. Cubre, en el orden del encargo, los
 * nueve escenarios "obligatorios" que le tocan a `actions.ts`.
 */

const AHORA = "2026-08-21T10:00:00.000Z";
const QA_OK: QAResult = { pass: true, blockedReasons: [], warnings: [], requiredChanges: [] };
const QA_KO: QAResult = { pass: false, blockedReasons: ["falta la fuente"], warnings: [], requiredChanges: ["citar el dato"] };

function estadoNuevo(): ReturnType<typeof estadoHumanoVacio> {
  return estadoHumanoVacio("LL-20260821-001", AHORA);
}

function contexto(parcial: Partial<ContextoEfectivo> = {}): ContextoEfectivo {
  return { status: "pending_approval", qa: QA_OK, needsReReview: false, ...parcial };
}

// ── 1. Un pending_approval con qa.pass=true puede aprobarse ─────────────────

test("aprobar: pending_approval + qa.pass=true → approved", () => {
  const siguiente = aprobar(estadoNuevo(), contexto(), "admin@ligalab.app", AHORA);
  assert.equal(siguiente.status, "approved");
  assert.equal(siguiente.approvedBy, "admin@ligalab.app");
  assert.equal(siguiente.approvedAt, AHORA);
  assert.equal(siguiente.rejectedAt, null);
});

// ── 2. Un pending_approval con qa.pass=false NO puede aprobarse ─────────────

test("aprobar: qa.pass=false → TransicionInvalida, nada cambia", () => {
  assert.throws(() => aprobar(estadoNuevo(), contexto({ qa: QA_KO }), "admin@ligalab.app", AHORA), TransicionInvalida);
});

test("aprobar: sin QA todavía (null) → TransicionInvalida", () => {
  assert.throws(() => aprobar(estadoNuevo(), contexto({ qa: null }), "admin@ligalab.app", AHORA), TransicionInvalida);
});

// ── 3. Un paquete blocked no puede aprobarse ────────────────────────────────

test("aprobar: status=blocked → TransicionInvalida", () => {
  assert.throws(
    () => aprobar(estadoNuevo(), contexto({ status: "blocked", qa: QA_OK }), "admin@ligalab.app", AHORA),
    TransicionInvalida,
  );
});

// ── 4. Editar una pieza aprobable obliga a re-review ────────────────────────

test("editar: en pending_approval retrocede a brand_review y marca needsReReview", () => {
  const editado = editar(estadoNuevo(), contexto(), { hook: "Nuevo hook" }, "admin@ligalab.app", AHORA);
  assert.equal(editado.status, "brand_review");
  assert.equal(editado.needsReReview, true);
  assert.equal(editado.edits?.hook, "Nuevo hook");
});

test("editar: la pieza editada ya no se puede aprobar hasta un QA nuevo", () => {
  const editado = editar(estadoNuevo(), contexto(), { hook: "Nuevo hook" }, "admin@ligalab.app", AHORA);
  const contextoTrasEditar: ContextoEfectivo = { status: editado.status ?? "brand_review", qa: editado.qa, needsReReview: editado.needsReReview };
  assert.throws(() => aprobar(editado, contextoTrasEditar, "admin@ligalab.app", AHORA), TransicionInvalida);
});

test("editar: sin ningún campo → TransicionInvalida (nada que guardar)", () => {
  assert.throws(() => editar(estadoNuevo(), contexto(), {}, "admin@ligalab.app", AHORA), TransicionInvalida);
});

test("editar: solo permite hook/script/captions/cta, nunca fuentes ni score", () => {
  // Ediciones tipa esto en tiempo de compilación: si algún día alguien intenta
  // colar `score` o `sources` aquí, esto deja de compilar. La prueba en
  // tiempo de ejecución es que un objeto con solo esos cuatro campos basta.
  const editado = editar(estadoNuevo(), contexto(), { script: "Guion nuevo", cta: "Descárgala" }, "x@y.com", AHORA);
  assert.deepEqual(editado.edits, { script: "Guion nuevo", cta: "Descárgala" });
});

// ── 5. El rechazo guarda el motivo ──────────────────────────────────────────

test("rechazar: sin motivo → TransicionInvalida", () => {
  assert.throws(() => rechazar(estadoNuevo(), contexto(), "   ", "admin@ligalab.app", AHORA), TransicionInvalida);
});

test("rechazar: con motivo → guarda rejectionReason, rejectedBy, rejectedAt", () => {
  const rechazado = rechazar(estadoNuevo(), contexto(), "El hook exagera un dato que no tenemos.", "admin@ligalab.app", AHORA);
  assert.equal(rechazado.status, "rejected");
  assert.equal(rechazado.rejectionReason, "El hook exagera un dato que no tenemos.");
  assert.equal(rechazado.rejectedBy, "admin@ligalab.app");
  assert.equal(rechazado.rejectedAt, AHORA);
});

test("rechazar: ya aprobado o ya rechazado → TransicionInvalida", () => {
  assert.throws(() => rechazar(estadoNuevo(), contexto({ status: "approved" }), "motivo", "a@b.com", AHORA), TransicionInvalida);
  assert.throws(() => rechazar(estadoNuevo(), contexto({ status: "rejected" }), "motivo", "a@b.com", AHORA), TransicionInvalida);
});

// ── 6. El audit trail conserva las acciones anteriores ──────────────────────

test("audit trail: cada acción se ANADE, nunca sustituye a las anteriores", () => {
  let estado = estadoNuevo();
  assert.equal(estado.auditTrail.length, 1); // "created"

  estado = marcarQA(estado, contexto({ status: "brand_review", qa: null }), QA_KO, "reviewer@ligalab.app", AHORA);
  assert.equal(estado.auditTrail.length, 2);
  assert.equal(estado.auditTrail[1].action, "qa_failed");

  estado = editar(estado, { status: estado.status ?? "brand_review", qa: estado.qa, needsReReview: false }, { hook: "Otro hook" }, "editor@ligalab.app", AHORA);
  assert.equal(estado.auditTrail.length, 3);
  assert.equal(estado.auditTrail[2].action, "edited");

  estado = marcarQA(estado, { status: estado.status ?? "brand_review", qa: estado.qa, needsReReview: estado.needsReReview }, QA_OK, "reviewer@ligalab.app", AHORA);
  assert.equal(estado.auditTrail.length, 4);
  assert.equal(estado.auditTrail[3].action, "qa_passed");

  estado = aprobar(estado, { status: estado.status ?? "pending_approval", qa: estado.qa, needsReReview: estado.needsReReview }, "admin@ligalab.app", AHORA);
  assert.equal(estado.auditTrail.length, 5);
  assert.equal(estado.auditTrail[4].action, "approved");

  // Las cuatro primeras entradas siguen ahí, en el mismo orden.
  assert.deepEqual(
    estado.auditTrail.slice(0, 4).map((e) => e.action),
    ["created", "qa_failed", "edited", "qa_passed"],
  );
});

test("marcarQA: pass=true adelanta a pending_approval; pass=false deja en brand_review", () => {
  const conQaOk = marcarQA(estadoNuevo(), contexto({ status: "brand_review", qa: null }), QA_OK, "r@r.com", AHORA);
  assert.equal(conQaOk.status, "pending_approval");
  assert.equal(conQaOk.needsReReview, false);

  const conQaKo = marcarQA(estadoNuevo(), contexto({ status: "brand_review", qa: null }), QA_KO, "r@r.com", AHORA);
  assert.equal(conQaKo.status, "brand_review");
});

// ── Reabrir: la única puerta de vuelta desde approved/rejected ─────────────

test("reabrir: solo tiene sentido desde approved o rejected", () => {
  assert.throws(() => reabrir(estadoNuevo(), contexto({ status: "draft" }), "admin@ligalab.app", AHORA), TransicionInvalida);

  const reabierto = reabrir(estadoNuevo(), contexto({ status: "approved" }), "admin@ligalab.app", AHORA);
  assert.equal(reabierto.status, "brand_review");
  assert.equal(reabierto.needsReReview, true);
  assert.equal(reabierto.approvedAt, null);
  assert.equal(reabierto.auditTrail.at(-1)?.action, "reopened");
});
