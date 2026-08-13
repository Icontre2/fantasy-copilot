"use client";

import { Card, SectionTitle } from "./ui";

export type LineupsResponse = { matches: { home: string; away: string; kickoff?: string; url: string; homePlayers: string[]; awayPlayers: string[] }[]; updatedAt: string; source: string };
export function LineupsView({ data }: { data: LineupsResponse }) {
  return <div className="space-y-4"><Card><SectionTitle>11 probables</SectionTitle><p className="text-sm text-neutral-600">Datos informativos de FútbolFantasy; pueden cambiar hasta el inicio del partido.</p></Card>{data.matches.map((match) => <Card key={match.url}><div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{match.home} – {match.away}</h3><span className="text-xs text-neutral-500">{match.kickoff}</span></div><div className="mt-4 grid grid-cols-2 gap-4"><Lineup team={match.home} players={match.homePlayers} /><Lineup team={match.away} players={match.awayPlayers} /></div><a href={match.url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs text-violet-700 underline">Ver previa original</a></Card>)}</div>;
}
function Lineup({ team, players }: { team: string; players: string[] }) { return <div><h4 className="mb-2 text-sm font-semibold">{team}</h4><ol className="space-y-1 text-sm">{players.map((player, index) => <li key={`${player}-${index}`} className="rounded-lg bg-neutral-50 px-2 py-1.5">{player}</li>)}</ol></div>; }
