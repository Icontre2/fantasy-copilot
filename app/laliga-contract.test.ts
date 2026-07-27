import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLaligaSnapshot,
  parseLaligaLeagues,
  parseLaligaMarket,
} from "./laliga-contract.ts";

test("normalizes leagues, squad, lineup, balance and market", () => {
  const leagues = parseLaligaLeagues({
    elements: [
      {
        id: "league-1",
        name: "Liga privada",
        team: {
          id: "team-1",
          money: 12_500_000,
          teamValue: 88_000_000,
          playersNumber: 1,
        },
      },
    ],
  });

  const snapshot = buildLaligaSnapshot({
    league: leagues[0],
    clubs: { teams: [{ id: "club-1", shortName: "Athletic" }] },
    lineup: {
      formation: {
        goalkeeper: [{ playerMaster: { id: "player-1" } }],
      },
    },
    team: {
      teamValue: 90_000_000,
      players: [
        {
          playerMaster: {
            id: "player-1",
            nickname: "Unai Simón",
            positionId: 1,
            marketValue: 13_000_000,
            teamId: "club-1",
          },
          playerTeamId: "player-team-1",
        },
      ],
    },
    money: { teamMoney: 14_000_000 },
    market: {
      elements: [
        {
          discr: "marketPlayerLeague",
          id: "market-1",
          salePrice: 15_000_000,
          expirationDate: "2026-07-28T12:00:00Z",
          manager: { managerName: "Rival" },
          playerMaster: {
            id: "player-2",
            nickname: "Nico Williams",
            positionId: 4,
            marketValue: 14_500_000,
            teamId: "club-1",
          },
        },
      ],
    },
  });

  assert.equal(snapshot.balance, 14_000_000);
  assert.equal(snapshot.squadValue, 90_000_000);
  assert.deepEqual(snapshot.squad[0], {
    name: "Unai Simón",
    position: "GK",
    club: "Athletic",
    current_value: 13_000_000,
    external_player_id: "player-1",
    external_player_team_id: "player-team-1",
    is_starter: true,
  });
  assert.equal(snapshot.market[0].external_market_id, "market-1");
  assert.equal(snapshot.market[0].seller_name, "Rival");
});

test("keeps only league market entries", () => {
  const market = parseLaligaMarket(
    {
      elements: [
        { discr: "marketPlayerTeam", id: "ignored" },
        {
          discr: "marketPlayerLeague",
          id: "market-1",
          playerMaster: {
            id: "player-1",
            nickname: "Jugador",
            positionId: 3,
            marketValue: 1,
          },
        },
      ],
    },
    new Map(),
  );

  assert.equal(market.length, 1);
  assert.equal(market[0].position, "MID");
});

test("rejects changed or incomplete upstream contracts", () => {
  assert.throws(
    () => parseLaligaLeagues({ data: [] }),
    /respuesta de ligas ha cambiado/,
  );
  assert.throws(
    () =>
      parseLaligaMarket(
        {
          elements: [
            {
              discr: "marketPlayerLeague",
              id: "market-1",
              playerMaster: { nickname: "Sin id", positionId: 4 },
            },
          ],
        },
        new Map(),
      ),
    /Faltan datos obligatorios/,
  );
});
