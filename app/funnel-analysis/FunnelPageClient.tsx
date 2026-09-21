"use client";

import { useSyncExternalStore } from "react";
import Sidebar from "@/components/Sidebar";
import { FirstInvoiceJourney, FunnelDashboard, JourneyCompare } from "@/features/funnel-analysis";
import styles from "@/features/funnel-analysis/styles/version-comparison.module.css";
import { stickyOneOf, useStickyState } from "@/lib/stickyFilters";

function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

/**
 * The first-invoice journey has two modes on this one page: one build's ladder with its stop reasons,
 * or cohorts that differ in ONE dimension side by side on an equal window (decisions 0114, 0116). A mode, not a sidebar page:
 * a page costs what it shows (AGENTS.md 5a), and the comparison answers the same question.
 */
type JourneyMode = "journey" | "compare";

/** The open tab is part of what a reload, Back and a copied link keep (decisions 0123, 0140). */
const tabCodec = stickyOneOf(["journey", "compare"] as const) as import("@/lib/stickyFilters").StickyCodec<JourneyMode>;

export default function FunnelPageClient() {
  const isClient = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const [mode, setMode] = useStickyState<JourneyMode>("funnel-tab", "tab", "journey", tabCodec);

  return (
    <main className="app-shell">
      <Sidebar />
      <div className="app-main">
        {isClient ? (
          <div className={styles.modeBar} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "journey"}
              className={`${styles.modeTab}${mode === "journey" ? ` ${styles.modeOn}` : ""}`}
              onClick={() => setMode("journey")}
            >
              Pehli invoice ka safar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "compare"}
              className={`${styles.modeTab}${mode === "compare" ? ` ${styles.modeOn}` : ""}`}
              onClick={() => setMode("compare")}
            >
              Muqabla
            </button>
          </div>
        ) : null}
        {/* The journey sits above the screen-by-screen funnel: it answers whether the
            product was reached at all, which decides whether the rest is worth reading. */}
        {isClient && mode === "journey" ? <FirstInvoiceJourney /> : null}
        {isClient && mode === "compare" ? <JourneyCompare /> : null}
        {isClient ? <FunnelDashboard /> : null}
      </div>
    </main>
  );
}
