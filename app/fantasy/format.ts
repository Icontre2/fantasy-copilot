/**
 * Formato de presentacion.
 *
 * Regla unica y no negociable: **un dato ausente se dibuja como `—`**, nunca
 * como `0 €` ni `0 días`. Si la app no sabe algo, lo dice.
 */

const EUROS = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/** Guion largo: lo que se pinta cuando no hay dato. */
export const UNKNOWN = "—";

export function euros(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return UNKNOWN;
  return EUROS.format(value);
}

/** Importes grandes abreviados a millones, para tablas estrechas de movil. */
export function millions(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return UNKNOWN;
  const m = value / 1_000_000;
  const digits = Math.abs(m) >= 10 ? 1 : 2;
  return `${m.toFixed(digits).replace(".", ",")} M€`;
}

/** Importe con signo explicito, para el extracto del ledger. */
export function signedMillions(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return UNKNOWN;
  return `${value > 0 ? "+" : ""}${millions(value)}`;
}

export function percent(ratio: number | null | undefined, digits = 1): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return UNKNOWN;
  return `${(ratio * 100).toFixed(digits).replace(".", ",")} %`;
}

export function days(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return UNKNOWN;
  if (value < 1) return "menos de 1 día";
  return `${value.toFixed(1).replace(".", ",")} días`;
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return UNKNOWN;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

/** Fecha y hora local: necesaria cuando el dato vence a una hora concreta. */
export function shortDateTime(iso: string | null | undefined): string {
  if (!iso) return UNKNOWN;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
