/**
 * Shared formatting helpers used across the app.
 */

export function shortAddress(value?: string) {
  if (!value || value.length < 10) {
    return value ?? "Not connected";
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function formatTokenAmount(value: string, decimals: number, fractionDigits = 4) {
  const normalized = value.replace(/^0+/, "") || "0";
  const padded = normalized.padStart(decimals + 1, "0");
  const whole = padded.slice(0, padded.length - decimals) || "0";
  const fraction = padded.slice(padded.length - decimals).replace(/0+$/, "");

  if (!fraction) {
    return whole;
  }

  return `${whole}.${fraction.slice(0, fractionDigits)}`;
}
