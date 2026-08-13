/**
 * Serializacion CSV.
 *
 * ── La regla que gobierna este fichero ───────────────────────────────────────
 * `undefined` y `null` se escriben como celda VACIA. Nunca como `0`, `-`, `N/A`
 * ni ninguna otra cosa que parezca una medida. Un cero en una columna de euros
 * es indistinguible de "vale cero euros" en cuanto el CSV sale de la app y entra
 * en una hoja de calculo, y ahi ya no hay forma de saber que en realidad era un
 * dato que LALIGA no publica.
 */

/** Separador. Punto y coma: Excel en configuracion espanola lo espera asi. */
export const DELIMITER = ';';

/**
 * Escapa una celda segun RFC 4180: comillas dobles si contiene el separador,
 * comillas o saltos de linea, duplicando las comillas internas.
 */
export function escapeCell(value: string): string {
  if (!/[";\r\n]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

export type CsvValue = string | number | boolean | null | undefined;

function formatValue(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    // Un NaN o un Infinity en una columna numerica es un fallo de calculo, no un
    // dato: se escribe vacio igual que un dato ausente.
    if (!Number.isFinite(value)) return '';
    return String(value);
  }
  if (typeof value === 'boolean') return value ? 'si' : 'no';
  return escapeCell(value);
}

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => CsvValue;
};

/** Construye el CSV completo, con cabecera y salto de linea final. */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [columns.map((column) => escapeCell(column.header)).join(DELIMITER)];
  for (const row of rows) {
    lines.push(columns.map((column) => formatValue(column.value(row))).join(DELIMITER));
  }
  return `${lines.join('\n')}\n`;
}

/** `YYYY-MM-DD` de hoy, para el nombre del fichero. */
export function today(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Nombre de fichero seguro: el `leagueId` viene de la URL, asi que se limita a
 * caracteres inocuos antes de entrar en la cabecera `Content-Disposition`.
 */
export function exportFilename(prefix: string, leagueId: string, now = new Date()): string {
  const safeLeagueId = leagueId.replace(/[^A-Za-z0-9_-]/g, '') || 'liga';
  return `${prefix}_${safeLeagueId}_${today(now)}.csv`;
}
