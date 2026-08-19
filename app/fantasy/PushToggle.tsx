"use client";

import { useEffect, useState } from "react";
import { BellRing, BellOff } from "lucide-react";
import { get, post } from "./api";

/**
 * El interruptor de "avísame de esta liga sin que tenga que mirar".
 *
 * Vive en Alertas porque es la única pantalla donde tiene sentido: es donde se
 * ve QUÉ te va a avisar antes de decidir si quieres que te avise.
 *
 * Cuatro estados posibles, y cada uno se dice distinto — un interruptor que
 * solo sabe decir "activado/desactivado" esconde por qué no se puede activar,
 * que es la pregunta que de verdad tiene alguien la primera vez que lo toca:
 *   1. No disponible en este despliegue (falta VAPID o sesión persistente).
 *   2. El navegador lo bloquea (permiso de notificaciones denegado).
 *   3. Apagado: se puede activar.
 *   4. Encendido: se puede apagar.
 */
export function PushToggle({ leagueId }: { leagueId: string }) {
  const [estado, setEstado] = useState<
    "cargando" | "no_disponible" | "bloqueado" | "apagado" | "encendido" | "trabajando"
  >("cargando");
  const [motivo, setMotivo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function inicial() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelado) { setEstado("no_disponible"); setMotivo("Este navegador no admite notificaciones push."); }
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelado) setEstado("bloqueado");
        return;
      }

      const disponibilidad = await get<{ disponible: boolean; motivo: string | null }>("/api/fantasy/push/status");
      if (cancelado) return;
      if (!disponibilidad.disponible) {
        setEstado("no_disponible");
        setMotivo(disponibilidad.motivo);
        return;
      }

      const registro = await registroDeAvisos();
      const suscripcion = await registro.pushManager.getSubscription();
      if (!cancelado) setEstado(suscripcion ? "encendido" : "apagado");
    }

    inicial().catch(() => { if (!cancelado) { setEstado("no_disponible"); setMotivo("No se pudo comprobar el estado de las notificaciones."); } });
    return () => { cancelado = true; };
  }, [leagueId]);

  async function activar() {
    setEstado("trabajando");
    setError(null);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado(permiso === "denied" ? "bloqueado" : "apagado");
        return;
      }

      const { publicKey } = await get<{ publicKey: string | null }>("/api/fantasy/push/status");
      if (!publicKey) throw new Error("Falta la clave pública de notificaciones.");

      const registro = await registroDeAvisos();
      const suscripcion = await registro.pushManager.subscribe({
        userVisibleOnly: true, // exigido por el navegador: cada push tiene que producir un aviso visible, nunca uno silencioso.
        applicationServerKey: base64UrlABytes(publicKey),
      });
      const json = suscripcion.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error("Suscripción incompleta.");

      await post("/api/fantasy/push/subscribe", {
        leagueId,
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
      setEstado("encendido");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo activar el aviso.");
      setEstado("apagado");
    }
  }

  async function apagar() {
    setEstado("trabajando");
    setError(null);
    try {
      const registro = await registroDeAvisos();
      const suscripcion = await registro.pushManager.getSubscription();
      if (suscripcion) {
        await post("/api/fantasy/push/unsubscribe", { leagueId, endpoint: suscripcion.endpoint });
        await suscripcion.unsubscribe();
      }
      setEstado("apagado");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo apagar el aviso.");
      setEstado("encendido");
    }
  }

  if (estado === "cargando") return null; // Un hueco que aparece solo, sin parpadeo de "desactivado" de mentira.
  if (estado === "no_disponible") return null; // No se enseña un interruptor que no puede funcionar.

  if (estado === "bloqueado") {
    return (
      <p className="rounded-2xl border border-amber-500/25 bg-amber-500/[.06] px-4 py-3 text-xs leading-4 text-amber-300">
        Bloqueaste las notificaciones para esta app. Actívalas en los ajustes del navegador si quieres que te avise sola.
      </p>
    );
  }

  const encendido = estado === "encendido";
  const trabajando = estado === "trabajando";

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={encendido ? apagar : activar}
        disabled={trabajando}
        aria-pressed={encendido}
        className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold transition ${
          encendido ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30" : "glass text-neutral-300"
        } disabled:opacity-60`}
      >
        {encendido ? <BellRing size={17} /> : <BellOff size={17} />}
        {trabajando ? "Un momento…" : encendido ? "Te avisará sola de esta liga" : "Que me avise sola de esta liga"}
      </button>
      {error && <p className="px-1 text-xs text-rose-400">{error}</p>}
      {motivo && <p className="px-1 text-xs text-neutral-500">{motivo}</p>}
    </div>
  );
}

/**
 * El service worker de los avisos, activo y listo para suscribir.
 *
 * ── Por qué esto no puede ser `navigator.serviceWorker.ready` ────────────────
 * Aquí había `await navigator.serviceWorker.ready`, y era un cuelgue seguro.
 * `ready` espera a la registración cuyo ÁMBITO CUBRE LA PÁGINA ACTUAL, y este
 * worker se registra en `/sw-push/` mientras la app vive en `/`. Ese ámbito no
 * cubre `/`, así que la promesa no se resolvía nunca: el botón se quedaba en
 * "Un momento…" para siempre, sin error y sin manera de saber por qué.
 *
 * No saltó en las pruebas porque el navegador de pruebas no deja usar push de
 * verdad y el guion sustituía `ready` por una promesa ya resuelta: el simulacro
 * tapaba justo la línea que fallaba. Ahora se usa la registración concreta, que
 * además es lo correcto habiendo dos service workers —este y el de la pantalla
 * sin conexión, que sí vive en `/`—: con `ready` se habría cogido el otro, que
 * no sabe pintar un aviso, y las notificaciones habrían dejado de llegar sin
 * que nada diera error.
 *
 * `register` devuelve la registración enseguida, pero suscribirse exige un
 * worker ACTIVO; la primera vez todavía está instalándose, así que se espera.
 */
async function registroDeAvisos(): Promise<ServiceWorkerRegistration> {
  const registro = await navigator.serviceWorker.register("/sw-push.js", { scope: "/sw-push/" });
  if (registro.active) return registro;

  const worker = registro.installing ?? registro.waiting;
  if (!worker) return registro;
  await new Promise<void>((resolve) => {
    const alCambiar = () => {
      if (worker.state === "activated" || worker.state === "redundant") {
        worker.removeEventListener("statechange", alCambiar);
        resolve();
      }
    };
    worker.addEventListener("statechange", alCambiar);
    alCambiar(); // Por si ya cambió entre el `register` y este escuchador.
  });
  return registro;
}

/**
 * La clave VAPID llega en base64url; `applicationServerKey` la exige como
 * bytes sobre un `ArrayBuffer` normal y corriente.
 *
 * Se devuelve el `.buffer` y no el `Uint8Array` directamente: TypeScript 5.8
 * tipa `Uint8Array` sobre `ArrayBufferLike` (que incluye `SharedArrayBuffer`),
 * y `PushSubscriptionOptionsInit` solo acepta `ArrayBuffer`. El array en sí
 * nunca es un `SharedArrayBuffer` —lo creamos aquí mismo—, así que el `.buffer`
 * sí es del tipo concreto que pide la API.
 */
function base64UrlABytes(base64Url: string): ArrayBuffer {
  const relleno = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + relleno).replace(/-/g, "+").replace(/_/g, "/");
  const cruda = window.atob(base64);
  return Uint8Array.from([...cruda].map((c) => c.charCodeAt(0))).buffer as ArrayBuffer;
}
