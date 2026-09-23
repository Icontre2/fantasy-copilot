"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { nombreDeFichero, textoDeTarjeta, type EntradaDeTarjeta } from "./share-card";

/**
 * Botón «Compartir» de Inicio: dibuja la tarjeta en un canvas y la entrega al
 * menú de compartir del móvil (o la descarga si el navegador no lo tiene).
 *
 * Se dibuja en el propio dispositivo: no sale ningún dato a ningún servidor
 * para generar la imagen. El texto lo decide `share-card.ts`.
 */

const ANCHO = 1080;
const ALTO = 1350;

export function ShareCardButton({ entrada, serie }: { entrada: EntradaDeTarjeta; serie: number[] }) {
  const [estado, setEstado] = useState<"LISTO" | "GENERANDO" | "ERROR">("LISTO");

  async function compartir() {
    setEstado("GENERANDO");
    try {
      const blob = await dibujar(entrada, serie);
      const nombre = nombreDeFichero(entrada.managerName, new Date());
      const fichero = new File([blob], nombre, { type: "image/png" });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [fichero] })) {
        await navigator.share({ files: [fichero], title: "Mi plantilla en LigaLab" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = nombre;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5_000);
      }
      setEstado("LISTO");
    } catch (error) {
      // Cerrar el menú de compartir no es un error.
      setEstado(error instanceof DOMException && error.name === "AbortError" ? "LISTO" : "ERROR");
    }
  }

  return <button type="button" onClick={compartir} disabled={estado === "GENERANDO"} className="flex min-h-11 items-center gap-2 rounded-2xl bg-white/10 px-3 text-xs font-bold text-white backdrop-blur transition active:scale-[.98] disabled:opacity-60" aria-label="Compartir el valor de tu plantilla">
    <Share2 size={15} />{estado === "GENERANDO" ? "Preparando…" : estado === "ERROR" ? "No se pudo, reintenta" : "Compartir"}
  </button>;
}

async function dibujar(entrada: EntradaDeTarjeta, serie: number[]): Promise<Blob> {
  const t = textoDeTarjeta(entrada);
  const canvas = document.createElement("canvas");
  canvas.width = ANCHO;
  canvas.height = ALTO;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");
  await document.fonts?.ready;
  const fuente = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";

  const fondo = ctx.createLinearGradient(0, 0, ANCHO, ALTO);
  fondo.addColorStop(0, "#101a39");
  fondo.addColorStop(0.6, "#172754");
  fondo.addColorStop(1, "#2a1a5e");
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, ANCHO, ALTO);

  // Marca
  ctx.fillStyle = "#7c3aed";
  redondeado(ctx, 90, 90, 96, 96, 26);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 40px ${fuente}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("LL", 138, 140);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#a78bfa";
  ctx.font = `700 34px ${fuente}`;
  ctx.fillText("LIGALAB", 214, 152);

  ctx.fillStyle = "rgba(255,255,255,.6)";
  ctx.font = `600 38px ${fuente}`;
  ctx.fillText(recortar(ctx, t.antetitulo, ANCHO - 180), 90, 330);

  ctx.fillStyle = "rgba(255,255,255,.55)";
  ctx.font = `600 34px ${fuente}`;
  ctx.fillText("Valor de mi plantilla", 90, 420);
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 150px ${fuente}`;
  ctx.fillText(t.valor, 84, 570);

  if (t.variacion) {
    ctx.fillStyle = t.sube ? "#d6ff75" : "#fda4af";
    ctx.font = `700 48px ${fuente}`;
    ctx.fillText(`${t.sube ? "▲" : "▼"} ${t.variacion}`, 90, 650);
  }

  if (serie.length >= 2) {
    const x0 = 90, y0 = 720, w = ANCHO - 180, h = 260;
    const min = Math.min(...serie), max = Math.max(...serie), rango = max - min || 1;
    const punto = (v: number, i: number) => [x0 + (i / (serie.length - 1)) * w, y0 + h - ((v - min) / rango) * h] as const;
    const area = ctx.createLinearGradient(0, y0, 0, y0 + h);
    area.addColorStop(0, t.sube === false ? "rgba(253,164,175,.35)" : "rgba(214,255,117,.35)");
    area.addColorStop(1, "rgba(214,255,117,0)");
    ctx.beginPath();
    serie.forEach((v, i) => { const [x, y] = punto(v, i); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    ctx.lineTo(x0 + w, y0 + h);
    ctx.lineTo(x0, y0 + h);
    ctx.closePath();
    ctx.fillStyle = area;
    ctx.fill();
    ctx.beginPath();
    serie.forEach((v, i) => { const [x, y] = punto(v, i); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    ctx.strokeStyle = t.sube === false ? "#fda4af" : "#d6ff75";
    ctx.lineWidth = 7;
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  const fichas = [t.posicion && ["Posición", t.posicion], t.puntos && ["Puntos", t.puntos]].filter(Boolean) as [string, string][];
  fichas.forEach(([etiqueta, valor], i) => {
    const x = 90 + i * 460, y = 1040;
    ctx.fillStyle = "rgba(255,255,255,.09)";
    redondeado(ctx, x, y, 440, 150, 32);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.font = `600 30px ${fuente}`;
    ctx.fillText(etiqueta, x + 32, y + 56);
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 54px ${fuente}`;
    ctx.fillText(valor, x + 32, y + 120);
  });

  ctx.fillStyle = "rgba(255,255,255,.4)";
  ctx.font = `500 26px ${fuente}`;
  ctx.fillText(t.pie, 90, ALTO - 70);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo generar la imagen"))), "image/png"));
}

function redondeado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function recortar(ctx: CanvasRenderingContext2D, texto: string, max: number): string {
  if (ctx.measureText(texto).width <= max) return texto;
  let corto = texto;
  while (corto.length > 1 && ctx.measureText(`${corto}…`).width > max) corto = corto.slice(0, -1);
  return `${corto}…`;
}
