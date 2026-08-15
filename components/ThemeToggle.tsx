"use client";

import { useEffect, useState } from "react";

/**
 * Light / Dark / System, in that order.
 *
 * Three states rather than a boolean, because "System" is a real answer and the common two-state
 * toggle cannot express it: once a user taps a boolean switch they are pinned to that choice for
 * good, even when their laptop turns dark at sunset and every other window follows.
 *
 * The stored value is the *choice*, never the resolved colour. Storing "dark" because the OS was
 * dark this morning is how a page ends up light at midnight with no way back to automatic.
 */
export type ThemeChoice = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "invotick-admin-theme";

/**
 * Applies a choice to the document.
 *
 * "system" REMOVES the attribute rather than writing the resolved value, so the stylesheet's
 * `prefers-color-scheme` branch takes over and keeps tracking the OS live — including a change
 * made while the page is open.
 */
export function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
}

const ORDER: ThemeChoice[] = ["light", "dark", "system"];

const ICON: Record<ThemeChoice, string> = {
  light: "☀",
  dark: "☾",
  system: "◐",
};

const LABEL: Record<ThemeChoice, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export default function ThemeToggle() {
  // Starts as null, not "system": until the effect has read localStorage we do not know the answer,
  // and rendering a guess means the button visibly corrects itself a frame later.
  const [choice, setChoice] = useState<ThemeChoice | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeChoice | null;
    setChoice(stored && ORDER.includes(stored) ? stored : "system");
  }, []);

  useEffect(() => {
    if (!choice) return;
    applyTheme(choice);
    localStorage.setItem(THEME_STORAGE_KEY, choice);
  }, [choice]);

  if (!choice) {
    // Holds the exact width so the toolbar does not jump when the real button arrives.
    return <span className="theme-toggle theme-toggle--placeholder" aria-hidden="true" />;
  }

  const next = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length];

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setChoice(next)}
      title={`Theme: ${LABEL[choice]} — click for ${LABEL[next]}`}
      aria-label={`Theme: ${LABEL[choice]}. Switch to ${LABEL[next]}.`}
    >
      <span aria-hidden="true">{ICON[choice]}</span>
      <span className="theme-toggle__label">{LABEL[choice]}</span>
    </button>
  );
}
