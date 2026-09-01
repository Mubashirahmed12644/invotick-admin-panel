"use client";

import { useSyncExternalStore } from "react";
import Sidebar from "@/components/Sidebar";
import { FirstInvoiceJourney, FunnelDashboard } from "@/features/funnel-analysis";

function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export default function FunnelPageClient() {
  const isClient = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  return (
    <main className="app-shell">
      <Sidebar />
      <div className="app-main">
        {/* The journey sits above the screen-by-screen funnel: it answers whether the
            product was reached at all, which decides whether the rest is worth reading. */}
        {isClient ? <FirstInvoiceJourney /> : null}
        {isClient ? <FunnelDashboard /> : null}
      </div>
    </main>
  );
}
