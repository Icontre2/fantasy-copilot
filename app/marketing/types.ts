/**
 * El modelo de vista del cliente. Deliberadamente una copia ligera —no un
 * `import type` del servidor— porque lo que ve el navegador es el JSON que
 * devuelve la API, no los tipos internos de `src/server/marketing`. Mismo
 * contrato en los dos lados; nunca el mismo módulo.
 */

export type Estado =
  | "draft"
  | "brand_review"
  | "fact_review"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "blocked"
  | "generated"
  | "published";

export type QAResult = {
  pass: boolean;
  blockedReasons: string[];
  warnings: string[];
  requiredChanges: string[];
  checkedAt?: string;
  checkedBy?: string;
};

export type Fuente = { label: string; url: string; publishedAt?: string | null };

export type Captions = { tiktok?: string; reels?: string; shorts?: string; carousel?: string };

export type TipoDePlano = "real_app_capture" | "generated_visual" | "typography_motion" | "football_reference";

export type Plano = { description: string; kind: TipoDePlano; captureNeeded?: string };

export type Escena = { timestamp: string; description: string };

export type Estrategia = {
  audience?: string;
  problem?: string;
  insight?: string;
  feature?: string;
  proofNeeded?: string;
  angle?: string;
  cta?: string;
  riskNotes?: string;
} | null;

export type CapturaReal = { type: string; file: string; description?: string; addedAt: string };

export type AccionDeAuditoria = "created" | "qa_passed" | "qa_failed" | "edited" | "approved" | "rejected" | "reopened";

export type EntradaDeAuditoria = { action: AccionDeAuditoria; actor: string; timestamp: string; note?: string };

export type PaqueteDeCola = {
  id: string;
  date: string;
  blocked: false;
  status: Estado;
  score: number;
  problem: string;
  feature: string;
  hook: string;
  hooks: string[];
  needsCapture: boolean;
  strategy: Estrategia;
  script: string | null;
  captions: Captions | null;
  cta: string | null;
  shots: Plano[];
  imagePrompt: string | null;
  seedancePrompt: string | null;
  videoSequence: Escena[];
  negativeConstraints: string[];
  platforms: string[];
  formats: string[];
  sources: Fuente[];
  qa: QAResult | null;
  needsReReview: boolean;
  rejectionReason: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
  captures: CapturaReal[];
  auditTrail: EntradaDeAuditoria[];
};

export type PaqueteBloqueado = { id: string; date: string; blocked: true; error: string };

export type Paquete = PaqueteDeCola | PaqueteBloqueado;

export type Ediciones = { hook?: string; script?: string; captions?: Captions; cta?: string };
