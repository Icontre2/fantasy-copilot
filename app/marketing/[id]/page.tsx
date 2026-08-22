"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Camera, ChevronLeft, RotateCcw, ShieldAlert, ShieldCheck } from "lucide-react";
import { get, post } from "../api";
import { AccessGate } from "../AccessGate";
import {
  Card,
  Empty,
  ErrorBox,
  EstadoBadge,
  ETIQUETA_ACCION,
  GhostButton,
  PrimaryButton,
  SectionTitle,
  Spinner,
  fechaLegible,
  lineasAArray,
} from "../ui";
import type { Captions, Ediciones, Paquete, PaqueteDeCola, QAResult } from "../types";

/**
 * `/marketing/[id]` — fase 3 (la ficha, sin nada oculto tras un tooltip) y
 * fase 4 (aprobar / rechazar / editar), con QA y reapertura de apoyo.
 */
export default function DetallePaquetePage() {
  const params = useParams<{ id: string }>();
  return (
    <AccessGate>
      {/* `key` fuerza a remontar al cambiar de pieza: así el estado de carga
          empieza limpio sin tener que reponerlo a mano dentro del efecto. */}
      <Detalle key={params.id} id={params.id} />
    </AccessGate>
  );
}

function Detalle({ id }: { id: string }) {
  const [pieza, setPieza] = useState<Paquete | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    get<{ package: Paquete }>(`packages/${id}`)
      .then((respuesta) => {
        if (vivo) setPieza(respuesta.package);
      })
      .catch((e: unknown) => {
        if (vivo) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [id]);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-[calc(env(safe-area-inset-top)+20px)]">
      <Link href="/marketing" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-neutral-400">
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Cola
      </Link>

      {cargando && <Spinner label="Cargando la pieza…" />}
      {error && <ErrorBox message={error} />}
      {!cargando && !error && !pieza && <Empty>No existe ningún paquete con ese id.</Empty>}
      {!cargando && pieza?.blocked && <Bloqueada pieza={pieza} />}
      {!cargando && pieza && !pieza.blocked && <Ficha pieza={pieza} onCambio={setPieza} />}
    </main>
  );
}

function Bloqueada({ pieza }: { pieza: Extract<Paquete, { blocked: true }> }) {
  return (
    <div>
      <p className="font-mono text-xs text-neutral-500">
        {pieza.id} · {pieza.date}
      </p>
      <h1 className="mt-1 text-xl font-black text-rose-300">Bloqueado</h1>
      <div className="mt-3">
        <ErrorBox message={pieza.error} />
      </div>
      <p className="mt-3 text-sm text-neutral-400">
        El fichero de origen no cumple el esquema esperado. Corrígelo en{" "}
        <code className="rounded bg-white/10 px-1 py-0.5 text-xs">
          marketing/generated/{pieza.date}/{pieza.id}/package.json
        </code>{" "}
        y despliega de nuevo.
      </p>
    </div>
  );
}

function Ficha({ pieza, onCambio }: { pieza: PaqueteDeCola; onCambio: (p: Paquete) => void }) {
  const [accionando, setAccionando] = useState(false);
  const [accionError, setAccionError] = useState<string | null>(null);

  const ejecutar = async (ruta: string, cuerpo?: unknown) => {
    setAccionando(true);
    setAccionError(null);
    try {
      const respuesta = await post<{ package: PaqueteDeCola }>(`packages/${pieza.id}/${ruta}`, cuerpo);
      onCambio(respuesta.package);
    } catch (e) {
      setAccionError(e instanceof Error ? e.message : String(e));
    } finally {
      setAccionando(false);
    }
  };

  const puedeAprobar = pieza.status === "pending_approval" && pieza.qa?.pass === true && !pieza.needsReReview;
  // Se remonta con la auditoría: cada acción con éxito añade una entrada, así
  // que es la señal de "hay datos nuevos del servidor, olvida lo que había en
  // el formulario" sin tener que sincronizar campo a campo a mano.
  const version = pieza.auditTrail.length;

  return (
    <div className="space-y-4">
      <header>
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-xs text-neutral-500">
            {pieza.id} · {pieza.date}
          </p>
          <EstadoBadge status={pieza.status} />
        </div>
        <h1 className="mt-2 text-xl font-black leading-snug text-white">{pieza.hook}</h1>
        {pieza.needsReReview && (
          <p className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300">
            Hay ediciones sin revisar. No se puede aprobar hasta que vuelva a pasar QA.
          </p>
        )}
      </header>

      {accionError && <ErrorBox message={accionError} />}

      <Acciones
        pieza={pieza}
        puedeAprobar={puedeAprobar}
        accionando={accionando}
        onAprobar={() => ejecutar("approve")}
        onRechazar={(motivo) => ejecutar("reject", { reason: motivo })}
        onReabrir={() => ejecutar("reopen")}
      />

      <CreativeCard pieza={pieza} />

      <QAForm key={`qa-${version}`} pieza={pieza} accionando={accionando} onGuardar={(resultado) => ejecutar("qa", resultado)} />

      <EditForm key={`edit-${version}`} pieza={pieza} accionando={accionando} onGuardar={(cambios) => ejecutar("edit", cambios)} />

      <Capturas
        key={`cap-${version}`}
        pieza={pieza}
        accionando={accionando}
        onAdjuntar={(captura) => ejecutar("capture", captura)}
      />

      <AuditTrail pieza={pieza} />
    </div>
  );
}

// ── Fase 4: aprobar / rechazar / reabrir ─────────────────────────────────────

function Acciones({
  pieza,
  puedeAprobar,
  accionando,
  onAprobar,
  onRechazar,
  onReabrir,
}: {
  pieza: PaqueteDeCola;
  puedeAprobar: boolean;
  accionando: boolean;
  onAprobar: () => void;
  onRechazar: (motivo: string) => void;
  onReabrir: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const decidido = pieza.status === "approved" || pieza.status === "rejected";

  return (
    <Card>
      <SectionTitle>Decisión</SectionTitle>
      {decidido ? (
        <div className="space-y-3">
          {pieza.status === "approved" && (
            <p className="text-sm text-emerald-300">
              Aprobado por {pieza.approvedBy}
              {pieza.approvedAt && ` · ${fechaLegible(pieza.approvedAt)}`}
            </p>
          )}
          {pieza.status === "rejected" && (
            <div className="text-sm text-neutral-300">
              <p>
                Rechazado por {pieza.rejectedBy}
                {pieza.rejectedAt && ` · ${fechaLegible(pieza.rejectedAt)}`}
              </p>
              {pieza.rejectionReason && <p className="mt-1 text-neutral-400">Motivo: {pieza.rejectionReason}</p>}
            </div>
          )}
          <GhostButton onClick={onReabrir} disabled={accionando}>
            <span className="inline-flex items-center gap-1.5">
              <RotateCcw className="h-4 w-4" aria-hidden />
              Reabrir
            </span>
          </GhostButton>
        </div>
      ) : (
        <div className="space-y-3">
          <PrimaryButton
            onClick={onAprobar}
            disabled={accionando || !puedeAprobar}
            title={
              puedeAprobar
                ? undefined
                : "Solo se puede aprobar en «pendiente de aprobar», con QA superado y sin ediciones sin revisar."
            }
          >
            Aprobar
          </PrimaryButton>
          <div className="flex flex-col gap-2 sm:flex-row">
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo del rechazo (obligatorio)…"
              rows={2}
              className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-neutral-500"
            />
            <GhostButton
              onClick={() => {
                onRechazar(motivo);
                setMotivo("");
              }}
              disabled={accionando || !motivo.trim()}
            >
              Rechazar
            </GhostButton>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Fase 3: la ficha completa, los 15 campos ─────────────────────────────────

const ETIQUETA_PLANO: Record<string, string> = {
  real_app_capture: "Captura real de la app",
  generated_visual: "Visual generado",
  typography_motion: "Tipografía en movimiento",
  football_reference: "Referencia futbolística",
};

function CreativeCard({ pieza }: { pieza: PaqueteDeCola }) {
  const otrosHooks = pieza.hooks.filter((h) => h !== pieza.hook);
  const captionsConTexto = pieza.captions
    ? (Object.entries(pieza.captions) as [string, string | undefined][]).filter(([, v]) => v)
    : [];

  return (
    <Card className="space-y-5">
      <SectionTitle>La pieza, completa</SectionTitle>

      <Campo titulo="1. Insight">{pieza.strategy?.insight || "—"}</Campo>
      <Campo titulo="2. Hook principal">{pieza.hook}</Campo>
      <Campo titulo="3. Otros hooks">
        {otrosHooks.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5">
            {otrosHooks.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        ) : (
          "—"
        )}
      </Campo>
      <Campo titulo="4. Guion completo">
        <Pre texto={pieza.script} />
      </Campo>
      <Campo titulo="5. Estructura de escenas">
        {pieza.shots.length === 0 && pieza.videoSequence.length === 0 ? (
          "—"
        ) : (
          <div className="space-y-3">
            {pieza.shots.length > 0 && (
              <ol className="space-y-2">
                {pieza.shots.map((plano, i) => (
                  <li key={i} className="rounded-xl border border-white/10 bg-white/[.03] p-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      {ETIQUETA_PLANO[plano.kind] ?? plano.kind}
                    </p>
                    <p className="mt-1 text-sm text-white">{plano.description}</p>
                    {plano.captureNeeded && (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-300">
                        <Camera className="h-3.5 w-3.5" aria-hidden />
                        Captura real necesaria: {plano.captureNeeded}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
            {pieza.videoSequence.length > 0 && (
              <ol className="space-y-1.5 border-t border-white/10 pt-3">
                {pieza.videoSequence.map((escena, i) => (
                  <li key={i} className="text-sm text-neutral-300">
                    <span className="font-mono text-xs text-neutral-500">{escena.timestamp}</span> — {escena.description}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </Campo>
      <Campo titulo="6. Prompt de Seedance">
        <Pre texto={pieza.seedancePrompt} />
      </Campo>
      <Campo titulo="7. Prompt de imagen">
        <Pre texto={pieza.imagePrompt} />
      </Campo>
      <Campo titulo="8. Captions">
        {captionsConTexto.length > 0 ? (
          <div className="space-y-2">
            {captionsConTexto.map(([red, texto]) => (
              <div key={red}>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{red}</p>
                <p className="text-sm text-white">{texto}</p>
              </div>
            ))}
          </div>
        ) : (
          "—"
        )}
      </Campo>
      <Campo titulo="9. Plataformas recomendadas">{pieza.platforms.length > 0 ? pieza.platforms.join(" · ") : "—"}</Campo>
      <Campo titulo="10. CTA">{pieza.cta || "—"}</Campo>
      <Campo titulo="11. Fuentes / evidencia">
        {pieza.sources.length > 0 ? (
          <ul className="space-y-1">
            {pieza.sources.map((f) => (
              <li key={f.url} className="text-sm">
                <a href={f.url} target="_blank" rel="noreferrer" className="text-[#ff8a93] underline underline-offset-2">
                  {f.label}
                </a>
                {f.publishedAt && <span className="text-neutral-500"> · {f.publishedAt}</span>}
              </li>
            ))}
          </ul>
        ) : (
          "—"
        )}
      </Campo>
      <Campo titulo="12. Feature real de LigaLab">{pieza.feature}</Campo>
      <Campo titulo="13. Riesgos">
        {pieza.strategy?.riskNotes || pieza.negativeConstraints.length > 0 ? (
          <div className="space-y-2">
            {pieza.strategy?.riskNotes && <p>{pieza.strategy.riskNotes}</p>}
            {pieza.negativeConstraints.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-neutral-300">
                {pieza.negativeConstraints.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          "—"
        )}
      </Campo>
      <Campo titulo="14. QA">
        <ResumenQA qa={pieza.qa} />
      </Campo>
      <Campo titulo="15. Necesidad de captura">
        {pieza.needsCapture ? (
          <div className="space-y-2">
            <p className="inline-flex items-center gap-1.5 font-semibold text-amber-300">
              <Camera className="h-4 w-4" aria-hidden />
              Captura real necesaria — nunca se genera una interfaz falsa.
            </p>
            {pieza.captureRequest ? (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-200">
                {pieza.captureRequest}
              </p>
            ) : (
              <p className="text-neutral-400">
                Las pantallas concretas están arriba, en cada plano marcado como captura real.
              </p>
            )}
          </div>
        ) : (
          "No."
        )}
      </Campo>

      <div className="border-t border-white/10 pt-3 text-xs text-neutral-500">Problema detectado: {pieza.problem}</div>
    </Card>
  );
}

function Campo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-neutral-500">{titulo}</p>
      <div className="text-sm leading-6 text-neutral-200">{children}</div>
    </div>
  );
}

function Pre({ texto }: { texto: string | null }) {
  if (!texto) return <span>—</span>;
  return <p className="whitespace-pre-wrap">{texto}</p>;
}

function ResumenQA({ qa }: { qa: QAResult | null }) {
  if (!qa) return <span className="text-neutral-500">Sin revisar todavía.</span>;
  return (
    <div className="space-y-1.5">
      <p className={`inline-flex items-center gap-1.5 font-semibold ${qa.pass ? "text-emerald-300" : "text-rose-300"}`}>
        {qa.pass ? <ShieldCheck className="h-4 w-4" aria-hidden /> : <ShieldAlert className="h-4 w-4" aria-hidden />}
        {qa.pass ? "Pasa QA" : "No pasa QA"}
      </p>
      {qa.blockedReasons.length > 0 && <ListaEtiquetada titulo="Motivos de bloqueo" items={qa.blockedReasons} />}
      {qa.requiredChanges.length > 0 && <ListaEtiquetada titulo="Cambios necesarios" items={qa.requiredChanges} />}
      {qa.warnings.length > 0 && <ListaEtiquetada titulo="Avisos" items={qa.warnings} />}
      {qa.checkedBy && (
        <p className="text-xs text-neutral-500">
          Revisado por {qa.checkedBy}
          {qa.checkedAt && ` · ${fechaLegible(qa.checkedAt)}`}
        </p>
      )}
    </div>
  );
}

function ListaEtiquetada({ titulo, items }: { titulo: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold text-neutral-500">{titulo}</p>
      <ul className="list-disc space-y-0.5 pl-5 text-neutral-300">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

// ── Marcar QA ────────────────────────────────────────────────────────────────

function QAForm({
  pieza,
  accionando,
  onGuardar,
}: {
  pieza: PaqueteDeCola;
  accionando: boolean;
  onGuardar: (resultado: QAResult) => void;
}) {
  const [pass, setPass] = useState(pieza.qa?.pass ?? false);
  const [blockedReasons, setBlockedReasons] = useState(pieza.qa?.blockedReasons.join("\n") ?? "");
  const [warnings, setWarnings] = useState(pieza.qa?.warnings.join("\n") ?? "");
  const [requiredChanges, setRequiredChanges] = useState(pieza.qa?.requiredChanges.join("\n") ?? "");

  const decidido = pieza.status === "approved" || pieza.status === "rejected";

  const guardar = () => {
    onGuardar({
      pass,
      blockedReasons: lineasAArray(blockedReasons),
      warnings: lineasAArray(warnings),
      requiredChanges: lineasAArray(requiredChanges),
    });
  };

  return (
    <Card>
      <SectionTitle>Marcar control de calidad</SectionTitle>
      <p className="mb-3 text-xs text-neutral-500">
        `agents/brand-reviewer.md` es hoy una pauta para una persona, no un agente automático: aquí queda constancia de que
        alguien la aplicó.
      </p>
      {decidido && <p className="mb-3 text-xs text-amber-300">La pieza ya está decidida. Reábrela para volver a marcar QA.</p>}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-white">
          <input
            type="checkbox"
            checked={pass}
            onChange={(e) => setPass(e.target.checked)}
            disabled={decidido}
            className="h-4 w-4 accent-[#d84955]"
          />
          Pasa el control de calidad
        </label>
        <CampoTextarea etiqueta="Motivos de bloqueo (uno por línea)" valor={blockedReasons} onCambio={setBlockedReasons} disabled={decidido} />
        <CampoTextarea etiqueta="Cambios necesarios (uno por línea)" valor={requiredChanges} onCambio={setRequiredChanges} disabled={decidido} />
        <CampoTextarea etiqueta="Avisos (uno por línea)" valor={warnings} onCambio={setWarnings} disabled={decidido} />
        <GhostButton onClick={guardar} disabled={accionando || decidido}>
          Guardar QA
        </GhostButton>
      </div>
    </Card>
  );
}

// ── Editar contenido creativo ─────────────────────────────────────────────────

const ESTADOS_EDITABLES = new Set(["draft", "brand_review", "fact_review", "pending_approval"]);
const REDES_DE_CAPTIONS = ["tiktok", "reels", "shorts", "carousel"] as const;

function EditForm({
  pieza,
  accionando,
  onGuardar,
}: {
  pieza: PaqueteDeCola;
  accionando: boolean;
  onGuardar: (cambios: Ediciones) => void;
}) {
  const [hook, setHook] = useState(pieza.hook);
  const [script, setScript] = useState(pieza.script ?? "");
  const [cta, setCta] = useState(pieza.cta ?? "");
  const [captions, setCaptions] = useState<Captions>(pieza.captions ?? {});

  const editable = ESTADOS_EDITABLES.has(pieza.status);

  const cambios: Ediciones = {};
  if (hook !== pieza.hook) cambios.hook = hook;
  if (script !== (pieza.script ?? "")) cambios.script = script;
  if (cta !== (pieza.cta ?? "")) cambios.cta = cta;
  const captionsCambiadas = REDES_DE_CAPTIONS.some((red) => (captions[red] ?? "") !== (pieza.captions?.[red] ?? ""));
  if (captionsCambiadas) cambios.captions = captions;
  const hayCambios = Object.keys(cambios).length > 0;

  return (
    <Card>
      <SectionTitle>Editar contenido creativo</SectionTitle>
      <p className="mb-3 text-xs text-neutral-500">
        Solo hook, guion, captions y CTA. Fuentes, score del Radar, feature de origen e historial de QA no se tocan desde
        aquí. Cualquier cambio obliga a pasar QA otra vez antes de poder aprobar.
      </p>
      {!editable && <p className="mb-3 text-xs text-amber-300">No se puede editar en «{pieza.status}». Reabre la pieza primero.</p>}
      <div className="space-y-3">
        <CampoTexto etiqueta="Hook" valor={hook} onCambio={setHook} disabled={!editable} />
        <CampoTextarea etiqueta="Guion" valor={script} onCambio={setScript} disabled={!editable} />
        <CampoTexto etiqueta="CTA" valor={cta} onCambio={setCta} disabled={!editable} />
        {REDES_DE_CAPTIONS.map((red) => (
          <CampoTexto
            key={red}
            etiqueta={`Caption · ${red}`}
            valor={captions[red] ?? ""}
            onCambio={(v) => setCaptions((c) => ({ ...c, [red]: v }))}
            disabled={!editable}
          />
        ))}
        <GhostButton onClick={() => onGuardar(cambios)} disabled={accionando || !editable || !hayCambios}>
          Guardar edición
        </GhostButton>
      </div>
    </Card>
  );
}

function CampoTexto({
  etiqueta,
  valor,
  onCambio,
  disabled,
}: {
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-neutral-500">{etiqueta}</span>
      <input
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        disabled={disabled}
        className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-40"
      />
    </label>
  );
}

function CampoTextarea({
  etiqueta,
  valor,
  onCambio,
  disabled,
}: {
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-neutral-500">{etiqueta}</span>
      <textarea
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        disabled={disabled}
        rows={3}
        className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-40"
      />
    </label>
  );
}

// ── Capturas reales y auditoría ───────────────────────────────────────────────

/**
 * Fase 5. Se enseña siempre que la pieza necesite captura o ya tenga alguna:
 * de nada sirve decir «hace falta una captura real» si luego no hay dónde
 * apuntar que ya se ha tomado.
 */
function Capturas({
  pieza,
  accionando,
  onAdjuntar,
}: {
  pieza: PaqueteDeCola;
  accionando: boolean;
  onAdjuntar: (captura: { type: string; file: string; description?: string }) => void;
}) {
  const [tipo, setTipo] = useState("");
  const [fichero, setFichero] = useState("");
  const [descripcion, setDescripcion] = useState("");

  if (!pieza.needsCapture && pieza.captures.length === 0) return null;

  const completo = tipo.trim() !== "" && fichero.trim() !== "";

  return (
    <Card>
      <SectionTitle>Capturas reales</SectionTitle>

      {pieza.captures.length > 0 ? (
        <ul className="mb-4 space-y-2">
          {pieza.captures.map((c, i) => (
            <li key={i} className="rounded-xl border border-white/10 bg-white/[.03] p-2.5 text-sm">
              <p className="font-semibold text-white">{c.type}</p>
              {c.description && <p className="text-neutral-400">{c.description}</p>}
              <p className="mt-1 break-all text-xs text-neutral-500">{c.file}</p>
              <p className="text-xs text-neutral-500">{fechaLegible(c.addedAt)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-amber-300">Todavía no hay ninguna captura adjunta.</p>
      )}

      <p className="mb-3 text-xs text-neutral-500">
        No se sube el fichero: se apunta de qué pantalla es y dónde está. La captura la haces tú de la app real — aquí no
        se genera ninguna interfaz.
      </p>

      <div className="space-y-3">
        <CampoTexto etiqueta="Pantalla (Comparador, Plantilla, Alertas de cláusula…)" valor={tipo} onCambio={setTipo} />
        <CampoTexto etiqueta="URL o ruta del fichero" valor={fichero} onCambio={setFichero} />
        <CampoTexto etiqueta="Descripción (opcional)" valor={descripcion} onCambio={setDescripcion} />
        <GhostButton
          onClick={() => {
            onAdjuntar({
              type: tipo,
              file: fichero,
              ...(descripcion.trim() ? { description: descripcion } : {}),
            });
            setTipo("");
            setFichero("");
            setDescripcion("");
          }}
          disabled={accionando || !completo}
        >
          Adjuntar captura
        </GhostButton>
      </div>
    </Card>
  );
}

function AuditTrail({ pieza }: { pieza: PaqueteDeCola }) {
  return (
    <Card>
      <SectionTitle>Auditoría</SectionTitle>
      <ol className="space-y-2">
        {[...pieza.auditTrail].reverse().map((entrada, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d84955]" aria-hidden />
            <div>
              <p className="text-white">
                <span className="font-semibold">{ETIQUETA_ACCION[entrada.action]}</span> · {entrada.actor}
              </p>
              <p className="text-xs text-neutral-500">{fechaLegible(entrada.timestamp)}</p>
              {entrada.note && <p className="mt-0.5 text-xs text-neutral-400">{entrada.note}</p>}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
