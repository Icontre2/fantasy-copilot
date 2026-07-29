import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLaligaSnapshot,
  LaligaContractError,
  parseLaligaLeagues,
  parseLaligaMarket,
  parseLaligaMarketEntry,
} from "./laliga-contract.ts";

function playerMasterRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 901,
    salePrice: 4_500_000,
    playerMaster: {
      id: 12345,
      nickname: "Jugador Uno",
      positionId: 3,
      marketValue: 5_000_000,
      team: { name: "Club A" },
    },
    ...overrides,
  };
}

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

test("accepts direct arrays and common wrappers", () => {
  assert.equal(parseLaligaMarket([playerMasterRow()]).length, 1);
  assert.equal(parseLaligaMarket({ elements: [playerMasterRow()] }).length, 1);
  assert.equal(parseLaligaMarket({ data: [playerMasterRow()] }).length, 1);
  assert.equal(parseLaligaMarket({ data: { elements: [playerMasterRow()] } }).length, 1);
});

test("accepts player, marketPlayer and root player variants", () => {
  const underPlayer = parseLaligaMarket([
    {
      id: "mk-1",
      salePrice: 1000,
      player: { id: 77, name: "Jugador Dos", position: "Portero", marketValue: 2000 },
    },
  ]);
  assert.equal(underPlayer[0].position, "GK");
  assert.equal(underPlayer[0].external_player_id, "77");

  const underMarketPlayer = parseLaligaMarket([
    {
      id: "mk-2",
      salePrice: 1000,
      marketPlayer: { id: 88, nickname: "Jugador Tres", positionId: 4 },
    },
  ]);
  assert.equal(underMarketPlayer[0].position, "FWD");

  const atRoot = parseLaligaMarket([
    { id: "mk-3", playerId: 99, name: "Jugador Cuatro", positionId: 2, salePrice: 500 },
  ]);
  assert.equal(atRoot[0].external_player_id, "99");
  assert.equal(atRoot[0].position, "DEF");
});

test("derives deterministic market ids when the upstream id is absent", () => {
  const row = playerMasterRow({ seller: { id: 55, name: "Manager X" } });
  delete (row as Record<string, unknown>).id;
  const first = parseLaligaMarket([row])[0].external_market_id;
  const second = parseLaligaMarket([row])[0].external_market_id;
  assert.equal(first, "m-12345-55");
  assert.equal(first, second);
});

test("normalizes string money formats", () => {
  assert.equal(
    parseLaligaMarket([playerMasterRow({ salePrice: "1.234.567" })])[0].asking_price,
    1_234_567,
  );
  assert.equal(
    parseLaligaMarket([playerMasterRow({ salePrice: "1234,50" })])[0].asking_price,
    1234.5,
  );
  const row = playerMasterRow();
  (row.playerMaster as Record<string, unknown>).marketValue = "5000000";
  assert.equal(parseLaligaMarket([row])[0].market_value, 5_000_000);
});

test("reads seller names from manager and seller", () => {
  assert.equal(
    parseLaligaMarket([playerMasterRow({ manager: { name: "Manager A" } })])[0].seller_name,
    "Manager A",
  );
  assert.equal(
    parseLaligaMarket([playerMasterRow({ seller: { name: "Manager B" } })])[0].seller_name,
    "Manager B",
  );
});

test("rejects incomplete market rows without leaking player names", () => {
  assert.throws(
    () =>
      parseLaligaMarket([
        { id: "mk", playerMaster: { nickname: "Secreto", positionId: 1 } },
      ]),
    /identificador de jugador/i,
  );

  try {
    parseLaligaMarketEntry(
      { playerMaster: { id: 1, nickname: "Secreto", positionId: 99 } },
      2,
    );
    assert.fail("La fila inválida debería fallar");
  } catch (error) {
    assert.ok(error instanceof LaligaContractError);
    assert.doesNotMatch(error.message, /Secreto/);
    assert.match(error.message, /fila 2/);
  }
});

test("rejects duplicate ids and more than 500 rows", () => {
  assert.throws(
    () => parseLaligaMarket([playerMasterRow({ id: "dup" }), playerMasterRow({ id: "dup" })]),
    /duplicado/i,
  );

  const rows = Array.from({ length: 501 }, (_, index) => ({
    id: `mk-${index}`,
    playerMaster: { id: index, nickname: "X", positionId: 1 },
  }));
  assert.throws(() => parseLaligaMarket(rows), /500/);
});

test("rejects changed or incomplete upstream contracts", () => {
  assert.throws(
    () => parseLaligaLeagues({ data: [] }),
    /respuesta de ligas ha cambiado/,
  );
  assert.throws(
    () => parseLaligaMarket({ algo: "inesperado" }),
    /respuesta de mercado ha cambiado/i,
  );
});
