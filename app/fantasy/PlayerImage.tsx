"use client";

import Image from "next/image";
import { useState } from "react";
import type { Player } from "./types";

export function PlayerImage({ player, size = 44 }: { player: Player; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initials = player.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  if (!player.image || failed) {
    return <span aria-label={player.name} className="grid shrink-0 place-items-center rounded-full border border-white/10 bg-white/[.06] text-xs font-black text-[#c4b5fd]" style={{ width: size, height: size }}>{initials || player.name.slice(0, 1).toUpperCase()}</span>;
  }

  return <Image src={player.image} alt={player.name} width={size} height={size} unoptimized onError={() => setFailed(true)} className="shrink-0 rounded-full border border-white/10 bg-white/[.04] object-contain" />;
}
