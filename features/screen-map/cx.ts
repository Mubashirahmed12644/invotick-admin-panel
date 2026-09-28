import styles from "./styles/screen-map.module.css";

/** Class names of the Screen Map module; several per argument are allowed ("trow link"). */
export const cx = (...names: (string | false | null | undefined)[]): string =>
  names
    .filter((n): n is string => Boolean(n))
    .flatMap((n) => n.split(/\s+/))
    .map((n) => styles[n] ?? n)
    .join(" ");
