"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Share, X } from "lucide-react";

const OCULTO = "ligalab:instalar-oculto";

/*
 * Nada de esto se puede saber en el servidor —depende del móvil concreto y de
 * lo que haya guardado— pero tampoco puede calcularse dentro de un efecto: eso
 * es un render en cascada y lo prohíbe `react-hooks/set-state-in-effect`.
 *
 * `useSyncExternalStore` es justo para esto: lee de algo que vive fuera de
 * React. En el servidor devuelve `false`, así que el HTML se pinta sin el aviso
 * y la hidratación no se queja; en el navegador se recalcula al momento.
 */
const sinSuscripcion = () => () => undefined;
const enElServidor = () => false;

function hayQueExplicarComoInstalarla(): boolean {
  const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (!iOS) return false; // Los demás navegadores traen su propio banner.

  /*
   * `standalone` es la propiedad de Safari que dice que ya se abrió desde la
   * pantalla de inicio. Se mira también el `display-mode` estándar, que es lo
   * que usan los demás. Si ya está instalada, explicar cómo instalarla sería
   * ruido en el sitio más visible de la pantalla.
   */
  const instalada =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
  if (instalada) return false;

  try {
    return window.localStorage.getItem(OCULTO) !== "1";
  } catch {
    return true; // Safari en privado puede bloquear el almacenamiento.
  }
}

/**
 * Lo que convierte esto en una app de iPhone y no en una web guardada.
 *
 * Dos cosas, y las dos solo importan fuera del navegador de escritorio:
 *
 *  1. Registra el service worker que enseña una pantalla propia cuando abres la
 *     app sin cobertura. Sin él, iOS saca el error de Safari —con su barra de
 *     direcciones asomando— y en pantalla completa te deja sin salida.
 *
 *  2. Explica CÓMO se instala, porque en iPhone no hay otra manera. Chrome
 *     lanza su propio banner de instalación; Safari no tiene ninguno y nunca lo
 *     ha tenido, así que una app que no lo cuente se queda para siempre como
 *     una pestaña más. El aviso solo aparece en iOS, solo dentro del navegador
 *     y solo mientras NO esté ya instalada.
 */
/**
 * Registra el service worker que da la pantalla de "sin conexión".
 *
 * Es un hook y no parte del aviso de abajo porque las dos cosas ocurren en
 * momentos distintos: el aviso solo tiene sentido cuando ya estás usando la app
 * —antes de entrar no hay nada que valga la pena poner en la pantalla de
 * inicio—, pero el service worker tiene que estar SIEMPRE.
 *
 * Estaban juntos, y eso dejaba un hueco real: quien instalara la app y la
 * abriera sin cobertura antes de haber entrado nunca seguía viendo el error de
 * Safari, porque el worker no se había llegado a registrar. Comprobado en el
 * navegador: sin sesión no se registraba ninguno.
 *
 * Se llama desde arriba del todo del componente principal, antes de que decida
 * si pinta el acceso o la app: así corre en las dos ramas.
 */
export function useServiceWorkerDeApp() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Un fallo aquí no puede tumbar la app: sin service worker sigue
    // funcionando entera, solo que sin pantalla de "sin conexión".
    navigator.serviceWorker.register("/sw-app.js", { scope: "/" }).catch(() => undefined);
  }, []);
}

export function AppInstalable() {
  const procede = useSyncExternalStore(sinSuscripcion, hayQueExplicarComoInstalarla, enElServidor);
  const [cerrado, setCerrado] = useState(false);

  if (!procede || cerrado) return null;

  return (
    <aside className="flex items-start gap-3 rounded-2xl border border-[#7c3aed]/30 bg-[#7c3aed]/[.08] px-4 py-3">
      <Share size={17} className="mt-0.5 shrink-0 text-[#a78bfa]" aria-hidden />
      <p className="min-w-0 flex-1 text-xs leading-4 text-neutral-300">
        <strong className="font-bold text-white">Ponla en tu pantalla de inicio.</strong> Toca{" "}
        <span className="font-semibold text-[#c4b5fd]">Compartir</span> y luego{" "}
        <span className="font-semibold text-[#c4b5fd]">Añadir a pantalla de inicio</span>: se abre a
        pantalla completa, sin la barra de Safari.
      </p>
      <button
        type="button"
        aria-label="No volver a mostrar"
        onClick={() => {
          setCerrado(true);
          try {
            window.localStorage.setItem(OCULTO, "1");
          } catch {
            /* Que no se pueda recordar no impide cerrarlo ahora. */
          }
        }}
        className="-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-neutral-500"
      >
        <X size={15} />
      </button>
    </aside>
  );
}
