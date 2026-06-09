"use client";

import { useSyncExternalStore } from "react";
import Sidebar from "@/components/Sidebar";
import { FunnelDashboard } from "@/features/funnel-analysis";

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
        {isClient ? <FunnelDashboard /> : null}
      </div>
    </main>
  );
}
