export type CsvPosition = "GK" | "DEF" | "MID" | "FWD";

export type CsvSquadRow = {
  rowNumber: number;
  name: string;
  position: CsvPosition | null;
  club: string | null;
  value: number | null;
};

export type CsvSquadParseResult = {
  rows: CsvSquadRow[];
  warnings: string[];
  delimiter: "," | ";" | "\t";
};

const MAX_FILE_CHARS = 256_000;
const MAX_ROWS = 200;

const headerAliases = {
  name: new Set(["nombre", "jugador", "name", "player", "fullname", "playername"]),
  position: new Set(["posicion", "position", "pos", "demarcacion"]),
  club: new Set(["club", "equipo", "team"]),
  value: new Set([
    "valor",
    "value",
    "precio",
    "price",
    "valoractual",
    "currentvalue",
    "marketvalue",
  ]),
};

function normalizeToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function countDelimiterOutsideQuotes(line: string, delimiter: string): number {
  let quoted = false;
  let count = 0;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && char === delimiter) {
      count += 1;
    }
  }

  return count;
}

function detectDelimiter(text: string): "," | ";" | "\t" {
  const firstLine =
    text
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .find((line) => line.trim().length > 0) ?? "";

  const candidates = [",", ";", "\t"] as const;
  return candidates.reduce((best, candidate) =>
    countDelimiterOutsideQuotes(firstLine, candidate) >
    countDelimiterOutsideQuotes(firstLine, best)
      ? candidate
      : best,
  );
}

function parseRecords(text: string, delimiter: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let cell = "";
  let quoted = false;

  const pushRecord = () => {
    record.push(cell.trim());
    if (record.some((value) => value.length > 0)) records.push(record);
    record = [];
    cell = "";
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && char === delimiter) {
      record.push(cell.trim());
      cell = "";
      continue;
    }

    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      pushRecord();
      continue;
    }

    cell += char;
  }

  if (quoted) {
    throw new Error("El CSV contiene una comilla sin cerrar.");
  }

  if (cell.length > 0 || record.length > 0) pushRecord();
  return records;
}

function findHeaderIndex(headers: string[], aliases: Set<string>): number {
  return headers.findIndex((header) => aliases.has(normalizeToken(header)));
}

function normalizePosition(value: string): CsvPosition | null {
  const token = normalizeToken(value);
  if (!token) return null;
  if (["gk", "por", "portero", "porteria", "p"].includes(token)) return "GK";
  if (["def", "defensa", "d"].includes(token)) return "DEF";
  if (["mid", "med", "mc", "centrocampista", "medio", "m"].includes(token)) {
    return "MID";
  }
  if (["fwd", "del", "delantero", "atacante", "a"].includes(token)) return "FWD";
  return null;
}

function parseMoney(value: string): number | null {
  const compact = value
    .replace(/\s/g, "")
    .replace(/eur/gi, "")
    .replace(/€/g, "")
    .replace(/[^0-9,.-]/g, "");

  if (!compact) return null;

  const negative = compact.startsWith("-");
  const unsigned = compact.replace(/-/g, "");
  const comma = unsigned.lastIndexOf(",");
  const dot = unsigned.lastIndexOf(".");
  let normalized = unsigned;

  if (comma >= 0 && dot >= 0) {
    const decimal = comma > dot ? "," : ".";
    const thousands = decimal === "," ? /\./g : /,/g;
    normalized = unsigned.replace(thousands, "").replace(decimal, ".");
  } else {
    const separator = comma >= 0 ? "," : dot >= 0 ? "." : null;
    if (separator) {
      const parts = unsigned.split(separator);
      const looksLikeThousands =
        parts.length > 2 || (parts.length === 2 && parts[1].length === 3);
      normalized = looksLikeThousands
        ? parts.join("")
        : `${parts[0]}.${parts[1] ?? ""}`;
    }
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return negative ? -parsed : parsed;
}

export function parseSquadCsv(input: string): CsvSquadParseResult {
  if (input.length > MAX_FILE_CHARS) {
    throw new Error("El CSV supera el límite de 256 KB.");
  }

  const text = input.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(text);
  const records = parseRecords(text, delimiter);

  if (records.length < 2) {
    throw new Error("El CSV debe incluir una cabecera y al menos un jugador.");
  }

  const headers = records[0];
  const nameIndex = findHeaderIndex(headers, headerAliases.name);
  const positionIndex = findHeaderIndex(headers, headerAliases.position);
  const clubIndex = findHeaderIndex(headers, headerAliases.club);
  const valueIndex = findHeaderIndex(headers, headerAliases.value);

  if (nameIndex < 0) {
    throw new Error(
      'Falta la columna de jugador. Usa una cabecera como "Nombre" o "Jugador".',
    );
  }

  const warnings: string[] = [];
  const rows: CsvSquadRow[] = [];

  records.slice(1).forEach((record, index) => {
    const rowNumber = index + 2;
    const name = (record[nameIndex] ?? "").trim();
    if (!name) {
      warnings.push(`Fila ${rowNumber}: ignorada porque no tiene nombre.`);
      return;
    }

    const rawPosition =
      positionIndex >= 0 ? (record[positionIndex] ?? "").trim() : "";
    const position = normalizePosition(rawPosition);
    if (rawPosition && !position) {
      warnings.push(
        `Fila ${rowNumber}: posición "${rawPosition}" no reconocida; quedará sin asignar.`,
      );
    }

    const rawValue = valueIndex >= 0 ? (record[valueIndex] ?? "").trim() : "";
    const value = parseMoney(rawValue);
    if (rawValue && value === null) {
      warnings.push(
        `Fila ${rowNumber}: valor "${rawValue}" no reconocido; se guardará vacío.`,
      );
    }

    rows.push({
      rowNumber,
      name,
      position,
      club:
        clubIndex >= 0 && (record[clubIndex] ?? "").trim()
          ? (record[clubIndex] ?? "").trim()
          : null,
      value,
    });
  });

  if (rows.length === 0) {
    throw new Error("No se ha encontrado ningún jugador válido en el CSV.");
  }
  if (rows.length > MAX_ROWS) {
    throw new Error(`El CSV contiene ${rows.length} filas; el máximo es ${MAX_ROWS}.`);
  }

  return { rows, warnings, delimiter };
}

export function normalizePlayerName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
