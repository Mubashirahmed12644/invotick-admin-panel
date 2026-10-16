import styles from "../styles/ab-tests.module.css";

/** Class names of this module; several per argument are allowed ("mrow weak"). */
export const cx = (...names: (string | false | null | undefined)[]): string =>
  names
    .filter((n): n is string => Boolean(n))
    .flatMap((n) => n.split(/\s+/))
    .map((n) => styles[n] ?? n)
    .join(" ");

const PATHS = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  trend: (
    <>
      <path d="M4 17l6-6 4 4 6-7" />
      <path d="M14 8h6v6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  warn: (
    <>
      <path d="M12 3.8L21.5 20H2.5z" />
      <path d="M12 10v4.2M12 17.3v.2" />
    </>
  ),
  scale: (
    <>
      <path d="M12 4v16M7 20h10M4 7h16" />
      <path d="M6.5 7L3.5 13a3 3 0 006 0zM17.5 7l-3 6a3 3 0 006 0z" />
    </>
  ),
  play: <path d="M8 5.5v13l10.5-6.5z" />,
  x: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  wave: <path d="M4 12h3l2-4 3 8 2-4h6" />,
  chev: <path d="M9 5l7 7-7 7" />,
  phone: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2.5" />
      <path d="M11 17.5h2" />
    </>
  ),
  cal: (
    <>
      <rect x="4" y="5.5" width="16" height="14" rx="2" />
      <path d="M4 10h16M9 3.5v4M15 3.5v4" />
    </>
  ),
  left: <path d="M15 6l-6 6 6 6" />,
  right: <path d="M9 6l6 6-6 6" />,
} as const;

export type IconName = keyof typeof PATHS;

/** A decorative line icon: the word next to it always says the same thing, so colour and shape are never the only signal. */
export function Icon({ name }: { name: IconName }) {
  return (
    <svg className={cx("i")} viewBox="0 0 24 24" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
