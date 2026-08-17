"use client";

/**
 * Las cuotas de un partido, tal cual las publica la casa.
 *
 * Lo comparten el calendario y la ficha del jugador. Si cada pantalla dibujara
 * las suyas acabarían diciendo cosas distintas del mismo número, que es
 * exactamente lo que no puede pasar con un dato que viene de fuera.
 *
 * Se enseñan las tres cuotas sin tocar, y debajo el porcentaje ya sin la
 * comisión de la casa — que es cálculo nuestro y por eso lleva el «≈». La
 * palabra («Muy favorable», «Igualado»…) acompaña siempre al número: el color
 * solo no explica nada.
 *
 * Esto NO dice quién va a ganar. Es el precio al que una casa paga cada
 * resultado, que es una cosa distinta y bastante más honesta.
 */

export type Cuotas = {
  cuotas: { local: number; empate: number; visitante: number };
  probabilidades: { local: number; empate: number; visitante: number; margen: number };
  /** Quién publica la cuota: una casa concreta o «media del mercado». */
  casa: string;
};

export function Dificultad({
  odds,
  jugado,
  resalta,
}: {
  odds: Cuotas;
  /**
   * Si el partido ya se jugó lo dice («cuotas previas»). La fuente tarda un par
   * de días en soltar los partidos disputados, así que aparecen cuotas junto a
   * un marcador ya cerrado — y sin avisar parecería que la app no se ha
   * enterado del resultado.
   */
  jugado: boolean;
  /**
   * A quién resaltar. Sin esto se resalta al favorito, que es lo que quiere el
   * calendario; la ficha de un jugador pasa SU equipo, aunque sea el que menos
   * papeletas tiene.
   */
  resalta?: "local" | "visitante";
}) {
  const { probabilidades: p, cuotas } = odds;
  const destacado = resalta ?? (p.local >= p.visitante ? "local" : "visitante");
  return (
    <div className="mt-2 rounded-xl bg-white/[.03] px-2.5 py-2">
      <div className="grid grid-cols-3 gap-1 text-center text-[11px]">
        <Cuota etiqueta="1" cuota={cuotas.local} probabilidad={p.local} destacado={destacado === "local"} />
        <Cuota etiqueta="X" cuota={cuotas.empate} probabilidad={p.empate} destacado={false} />
        <Cuota etiqueta="2" cuota={cuotas.visitante} probabilidad={p.visitante} destacado={destacado === "visitante"} />
      </div>
      {/* `neutral-500` y no más oscuro: sobre el cristal de la ficha un
          `neutral-600` se perdía, y esta línea es la que dice de quién es el
          número. */}
      <p className="mt-1.5 text-center text-[10px] leading-3 text-neutral-500">
        Cuotas {jugado ? "previas al partido, de" : "de"} {odds.casa}. El % es la probabilidad implícita sin su comisión
        {p.margen > 1 ? ` (${Math.round((p.margen - 1) * 100)} %)` : ""}.
      </p>
    </div>
  );
}

function Cuota({
  etiqueta,
  cuota,
  probabilidad,
  destacado,
}: {
  etiqueta: string;
  cuota: number;
  probabilidad: number;
  destacado: boolean;
}) {
  return (
    <span className={`rounded-lg px-1 py-1 ${destacado ? "bg-[#7c3aed]/20 ring-1 ring-[#7c3aed]/40" : "bg-white/[.04]"}`}>
      <span className="block text-[9px] text-neutral-500">{etiqueta}</span>
      <span className="block font-bold tabular-nums text-white">{cuota.toFixed(2).replace(".", ",")}</span>
      <span className="block text-[10px] tabular-nums text-neutral-400">≈ {Math.round(probabilidad * 100)} %</span>
    </span>
  );
}
