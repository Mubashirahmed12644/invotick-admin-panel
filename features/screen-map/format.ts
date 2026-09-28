export const fmt = (n: number | null | undefined): string => (n == null ? "—" : Number(n).toLocaleString("en-US"));

export const pc = (n: number | null | undefined): string => (n == null || !Number.isFinite(n) ? "—" : `${(Math.round(n * 10) / 10).toFixed(1)}%`);

/** a / b as a percentage, or null when there is nothing to divide by. */
export const share = (a: number, b: number): number | null => (b > 0 ? (100 * a) / b : null);

/** Milliseconds as `4m 17s` / `68s`. */
export const secs = (ms: number | null | undefined): string => {
  if (ms == null) return "—";
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m ? `${m}m ${String(r).padStart(2, "0")}s` : `${r}s`;
};

/** USD micros as dollars. */
export const usd = (micros: number): string => `$${(micros / 1e6).toFixed(2)}`;

export const fixed2 = (n: number | null | undefined): string => (n == null ? "—" : n.toFixed(2));
