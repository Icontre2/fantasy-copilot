"use client";

import { useState } from "react";
import { X } from "lucide-react";
import Image from "next/image";
import { BottomSheet } from "./BottomSheet";
import { millions, UNKNOWN } from "./format";
import { PlayerDetails } from "./PlayerDetails";
import { RivalSquad } from "./RivalSquad";
import type { DashboardResponse, Player } from "./types";

type Competitor = DashboardResponse["competitors"][number];

/**
 * La ficha completa de un competidor, en una hoja.
 *
 * Antes, desde Inicio, un rival era una tarjeta muerta: su nombre, su puesto y
 * dos cifras. Todo lo demás —su once, su plantilla, cómo le está subiendo el
 * valor— estaba en otra pantalla y había que acordarse de que existía. Ahora se
 * toca y sale, que es lo que cualquiera espera al tocar a alguien de su liga.
 *
 * Lo de dentro es el MISMO panel que despliega la pantalla de Liga
 * (`RivalSquad`), no una versión recortada: si mañana su once cambia de forma,
 * cambia en los dos sitios a la vez.
 */
export function ManagerSheet({
  competitor,
  leagueId,
  onClose,
}: {
  competitor: Competitor;
  leagueId: string;
  onClose: () => void;
}) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const cajaOficial = competitor.teamMoney !== undefined;

  return (
    <>
      <BottomSheet onClose={onClose} label={`Ficha de ${competitor.manager.name}`}>
        <div className="pt-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={competitor.manager.name} image={competitor.manager.avatar} />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-neutral-500">
                  Competidor
                </p>
                <h2 className="truncate text-xl font-bold text-white">{competitor.manager.name}</h2>
                <p className="text-sm text-neutral-500">
                  #{competitor.position ?? UNKNOWN} · {competitor.points ?? UNKNOWN} pts
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/8 text-white"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3">
            <Stat label="Valor equipo" value={millions(competitor.teamValue)} />
            {/*
              El «≈» no es un adorno: la caja ajena casi nunca la publica LALIGA
              y entonces es una reconstrucción a partir del historial. Se
              distingue aquí igual que en la tarjeta de la que se viene, porque
              es la misma cifra y no puede cambiar de naturaleza al ampliarla.
            */}
            <Stat
              label={cajaOficial ? "Caja" : "Caja aprox."}
              value={cajaOficial ? millions(competitor.teamMoney) : `≈ ${millions(competitor.estimatedCash)}`}
              nota={cajaOficial ? undefined : "estimada, no oficial"}
            />
          </dl>

          <RivalSquad
            key={competitor.teamId}
            leagueId={leagueId}
            teamId={competitor.teamId}
            managerName={competitor.manager.name}
            onPlayer={setSelectedPlayer}
          />
        </div>
      </BottomSheet>

      {/* La ficha del jugador se monta FUERA de la hoja del manager: si fuese
          hija suya, el arrastre de una se comería el de la otra. */}
      {selectedPlayer && <PlayerDetails player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />}
    </>
  );
}

function Stat({ label, value, nota }: { label: string; value: string; nota?: string }) {
  return (
    <div className="glass-soft rounded-2xl p-3">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="mt-1 font-semibold tabular-nums text-white">{value}</dd>
      {nota && <p className="mt-0.5 text-[9px] leading-3 text-neutral-600">{nota}</p>}
    </div>
  );
}

function Avatar({ name, image }: { name: string; image?: string }) {
  if (image) {
    return (
      <Image
        src={image}
        alt=""
        width={56}
        height={56}
        unoptimized
        className="h-14 w-14 shrink-0 rounded-full bg-neutral-100 object-cover"
      />
    );
  }
  return (
    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#7c3aed]/20 text-lg font-bold text-[#c4b5fd]">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
