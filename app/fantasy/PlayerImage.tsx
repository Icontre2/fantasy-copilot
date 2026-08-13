"use client";

import Image from "next/image";
import type { Player } from "./types";

export function PlayerImage({ player, size = 44 }: { player: Player; size?: number }) {
  if (!player.image) {
    return <span aria-hidden className="grid shrink-0 place-items-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-500" style={{ width: size, height: size }}>{player.name.slice(0, 1)}</span>;
  }
  return <Image src={player.image} alt={player.name} width={size} height={size} unoptimized className="shrink-0 rounded-full bg-neutral-100 object-contain" />;
}
