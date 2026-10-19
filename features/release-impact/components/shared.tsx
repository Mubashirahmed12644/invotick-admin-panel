import styles from "../styles/release-impact.module.css";
import type { RowStatus } from "../types";
import { ROW_STATUS } from "../words";

/** Class names of this module; several per argument are allowed ("tbl stack"). */
export const cx = (...names: (string | false | null | undefined)[]): string =>
  names
    .filter((n): n is string => Boolean(n))
    .flatMap((n) => n.split(/\s+/))
    .map((n) => styles[n] ?? n)
    .join(" ");

const PATHS = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  eq: <path d="M5 9h14M5 15h14" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  warn: (
    <>
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v4M12 17.4v.1" />
    </>
  ),
  plug: (
    <>
      <path d="M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0z" />
      <path d="M12 16v5" />
    </>
  ),
  pencil: <path d="M4 20l4-1 11-11-3-3L5 16z" />,
  cal: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8v.1" />
    </>
  ),
  chev: <path d="M6 9l6 6 6-6" />,
  users: (
    <>
      <circle cx="9" cy="9" r="3" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M16 8a3 3 0 0 1 0 5M18 15c1.8.6 3 2.2 3 4" />
    </>
  ),
  link: (
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  ),
  flag: <path d="M6 21V4M6 5h11l-2 4 2 4H6" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  refresh: <path d="M20 12a8 8 0 1 1-2.5-5.8M20 4v5h-5" />,
} as const;

export type IconName = keyof typeof PATHS;

/** A decorative line icon: the word beside it always says the same thing, so colour and shape are never the only signal. */
export function Icon({ name }: { name: IconName }) {
  return (
    <svg className={cx("i")} viewBox="0 0 24 24" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

export function StatusPill({ s, label }: { s: RowStatus; label?: string }) {
  const w = ROW_STATUS[s];
  return (
    <span className={cx("st", s)}>
      <Icon name={w.icon} />
      {label ?? w.word}
    </span>
  );
}

/** Wilson 95 % interval of x of n, as fractions; the A/B page's method (for chart whiskers the backend did not send). */
export function wilson(x: number, n: number): [number, number] {
  if (n <= 0) return [0, 0];
  const z = 1.959963984540054;
  const p = x / n;
  const d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const m = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, c - m), Math.min(1, c + m)];
}
