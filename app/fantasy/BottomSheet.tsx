"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  debeCerrarse,
  desplazamientoDe,
  MINIMO_PARA_ARRASTRAR,
  opacidadDeFondo,
  velocidadDe,
} from "./sheet-gesture";

/**
 * Hoja que sube desde abajo y se cierra deslizándola hacia abajo.
 *
 * ── Lo que hace que esto se sienta como una app y no como una web ────────────
 *
 * 1. **Hay un tirador.** Esa barrita de arriba no decora: es lo único que dice
 *    «esto se puede arrastrar». Sin ella el gesto existe pero nadie lo
 *    descubre.
 *
 * 2. **No pelea con el scroll.** Es el detalle que casi todas las
 *    implementaciones caseras se saltan y el que más se nota: el arrastre solo
 *    empieza si el contenido YA está arriba del todo. Si estás leyendo por la
 *    mitad de la ficha y bajas el dedo, eso es scroll, no cerrar. Ese único
 *    matiz es la diferencia entre una hoja usable y una que se cierra sola cada
 *    vez que intentas leer.
 *
 * 3. **Cierra por distancia o por velocidad.** Un empujón corto y rápido vale
 *    igual que un arrastre largo. Ver `sheet-gesture.ts`.
 *
 * 4. **El fondo se aclara mientras arrastras**, así que ves lo que va a pasar
 *    antes de soltar, y si te arrepientes vuelve a su sitio.
 *
 * 5. **El gesto no es la única salida.** La X y la tecla Escape siguen ahí. Un
 *    gesto sin alternativa deja fuera a quien navega con teclado, y además nadie
 *    debería tener que adivinar cómo se sale de una pantalla.
 *
 * 6. **Respeta «reducir movimiento».** Quien lo ha pedido en su móvil es porque
 *    las animaciones le sientan mal.
 */
export function BottomSheet({
  onClose,
  label,
  children,
}: {
  onClose: () => void;
  /** Cómo se llama esta hoja para quien no la ve. */
  label: string;
  children: React.ReactNode;
}) {
  const scroller = useRef<HTMLDivElement | null>(null);
  /*
   * `inicio` es de dónde salió el dedo; `anterior` y `ultima` son las dos
   * muestras con las que se calcula la velocidad.
   *
   * Son dos MUESTRAS DE MOVIMIENTO, y no «la última muestra hasta el momento de
   * soltar», porque al soltar el dedo está donde ya estaba: el evento de subida
   * llega con las mismas coordenadas que el último movimiento. Midiendo hasta
   * él, todo gesto daba velocidad cero y el empujón rápido nunca cerraba.
   */
  const gesto = useRef<{
    y: number;
    anterior: { y: number; t: number };
    ultima: { y: number; t: number };
  } | null>(null);
  /*
   * Si se está arrastrando vive en una ref, no solo en el estado. Un gesto
   * rápido dispara mover y soltar antes de que React haya vuelto a pintar, así
   * que al soltar el estado todavía decía «no se está arrastrando» y el gesto se
   * tiraba a la basura: el empujón corto y rápido no cerraba. El estado se
   * mantiene igual, pero solo para lo visual.
   */
  const arrastrandoRef = useRef(false);

  const [offset, setOffset] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  /*
   * La altura se guarda en estado y se mide cuando el elemento entra, con una
   * ref de callback. Leer `offsetHeight` al pintar sería preguntarle al DOM
   * durante el render, que es impuro y además da la medida de la vez anterior.
   */
  const [altura, setAltura] = useState(0);
  /** Sobre cuánto tiempo se mide la velocidad del final del gesto. */
  const VENTANA_VELOCIDAD_MS = 30;
  const medir = useCallback((nodo: HTMLElement | null) => {
    if (nodo) setAltura(nodo.offsetHeight);
  }, []);

  /** Cierra con la animación de salida, salvo que se haya pedido menos movimiento. */
  const cerrar = useCallback(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }
    setCerrando(true);
  }, [onClose]);

  useEffect(() => {
    const alPulsar = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [onClose]);

  function alEmpezar(event: React.PointerEvent) {
    // Solo el dedo o el ratón principal; nada de gestos con dos dedos.
    if (!event.isPrimary || cerrando) return;
    const muestra = { y: event.clientY, t: event.timeStamp };
    gesto.current = { y: event.clientY, anterior: muestra, ultima: muestra };
  }

  function alMover(event: React.PointerEvent) {
    const inicio = gesto.current;
    if (!inicio) return;
    const delta = event.clientY - inicio.y;

    if (!arrastrandoRef.current) {
      // Aún no es un arrastre: hay que decidir si lo es.
      if (Math.abs(delta) < MINIMO_PARA_ARRASTRAR) return;
      /*
       * Aquí está el detalle que lo cambia todo: si el contenido no está arriba
       * del todo, o el dedo va hacia arriba, esto es scroll y no es asunto
       * nuestro. Soltamos el gesto y que la hoja se desplace normalmente.
       */
      const arriba = (scroller.current?.scrollTop ?? 0) <= 0;
      if (!arriba || delta < 0) {
        gesto.current = null;
        return;
      }
      arrastrandoRef.current = true;
      setArrastrando(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    /*
     * La muestra de referencia solo avanza cuando ha pasado algo de tiempo. Si
     * avanzara en cada evento, dos que cayeran casi en el mismo milisegundo
     * darían velocidad cero y un empujón rápido —justo el gesto que tiene que
     * cerrar— se leería como un dedo parado.
     */
    if (inicio.ultima.t - inicio.anterior.t >= VENTANA_VELOCIDAD_MS) {
      inicio.anterior = inicio.ultima;
    }
    inicio.ultima = { y: event.clientY, t: event.timeStamp };
    setOffset(desplazamientoDe(delta));
  }

  function alSoltar(event: React.PointerEvent) {
    const inicio = gesto.current;
    const estabaArrastrando = arrastrandoRef.current;
    gesto.current = null;
    arrastrandoRef.current = false;
    if (!estabaArrastrando || !inicio) return;
    setArrastrando(false);

    /*
     * La velocidad sale del ÚLTIMO tramo, no del gesto entero. Si te paras a
     * media hoja y luego empujas, lo que cuenta es el empujón; con la media del
     * gesto completo, esa pausa se comería el impulso.
     */
    const velocidad = velocidadDe(inicio.ultima.y - inicio.anterior.y, inicio.ultima.t - inicio.anterior.t);
    const desplazamiento = desplazamientoDe(event.clientY - inicio.y);

    if (debeCerrarse({ desplazamiento, altura, velocidad })) cerrar();
    else setOffset(0);
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end sm:place-items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      {/* El fondo se aclara según baja la hoja: ves lo que va a pasar antes de
          soltar. Cerrar tocando fuera sigue funcionando. */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/55"
        style={{
          opacity: cerrando ? 0 : opacidadDeFondo(offset, altura),
          transition: arrastrando ? "none" : "opacity .28s ease",
        }}
      />

      <section
        ref={medir}
        onPointerDown={alEmpezar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        onTransitionEnd={(event) => {
          // Solo el final de LA hoja, no el de algo de dentro.
          if (cerrando && event.target === event.currentTarget) onClose();
        }}
        className="hoja-inferior relative w-full max-w-xl overflow-hidden rounded-t-[30px] glass-sheet text-white sm:rounded-[30px]"
        style={{
          transform: cerrando ? "translateY(100%)" : `translateY(${offset}px)`,
          transition: arrastrando ? "none" : "transform .32s cubic-bezier(.32,.72,0,1)",
          // Mientras se arrastra, el navegador no debe hacer nada por su cuenta.
          touchAction: arrastrando ? "none" : "pan-y",
        }}
      >
        {/* El tirador. Es lo único que anuncia que la hoja se puede arrastrar. */}
        <div className="flex justify-center pb-1 pt-2.5" aria-hidden>
          <span className="h-1.5 w-10 rounded-full bg-white/25" />
        </div>

        {/*
          `overscroll-contain` evita que al llegar al final el gesto se lo lleve
          la página de detrás, que en un móvil se ve como que la app entera se
          mueve dentro de la hoja.
        */}
        <div ref={scroller} className="max-h-[88vh] overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </section>
    </div>
  );
}
