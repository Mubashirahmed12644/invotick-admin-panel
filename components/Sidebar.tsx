"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "@/components/Logo";
import { api } from "@/lib/api";

const navItems: NavItem[] = [
  {
    label: "All Users",
    href: "/users",
    isActive: (pathname: string) => pathname.startsWith("/users"),
  },
  {
    label: "Health Centre",
    href: "/health",
    // Exchange Rates, Sync Health and Billing Health used to be nav items of their own. They are
    // drill-downs now, because a page only opened deliberately is a page nobody opens on the
    // ordinary day when something starts going wrong — Sync Health had every symptom of the atomic
    // push bug on it while a user was writing in to report the invoices it had eaten.
    isActive: (pathname: string) =>
      ["/health", "/exchange-rates", "/sync-health", "/billing-health"].some((p) =>
        pathname.startsWith(p),
      ),
    // The count is the whole point. Four faults were found by accident in one day, all of them
    // already reported somewhere nobody was reading.
    badge: "health" as const,
  },
  {
    label: "Inventory Items",
    href: "/inventory-items",
    isActive: (pathname: string) => pathname.startsWith("/inventory-items"),
  },
  {
    label: "Invoice Preview",
    href: "/invoice-preview",
    isActive: (pathname: string) => pathname.startsWith("/invoice-preview"),
  },
  {
    label: "Ip Stats",
    href: "/ip-stats",
    isActive: (pathname: string) => pathname.startsWith("/ip-stats"),
  },
  {
    label: "Screen Flow",
    href: "/screen-flow",
    isActive: (pathname: string) => pathname.startsWith("/screen-flow"),
  },
  {
    label: "User Based Screen Flow",
    href: "/userBasedScreenFlow",
    isActive: (pathname: string) => pathname.startsWith("/userBasedScreenFlow"),
  },
  {
    label: "Contact Data",
    href: "/contact-data",
    isActive: (pathname: string) => pathname.startsWith("/contact-data"),
  },
  {
    label: "Testing Devices",
    href: "/testing-devices",
    isActive: (pathname: string) => pathname.startsWith("/testing-devices"),
  },
  {
    label: "Users Map",
    href: "/users-map",
    isActive: (pathname: string) => pathname.startsWith("/users-map"),
  },
  {
    label: "Funnel Analysis",
    href: "/funnel-analysis",
    isActive: (pathname: string) => pathname.startsWith("/funnel-analysis"),
  },
  {
    label: "UTM",
    href: "/utm",
    isActive: (pathname: string) => pathname.startsWith("/utm"),
  },
  {
    label: "Live Events",
    href: "/live-events",
    isActive: (pathname: string) => pathname.startsWith("/live-events"),
  },
  {
    label: "Event Discovery",
    href: "/live-event-config",
    isActive: (pathname: string) => pathname.startsWith("/live-event-config"),
  },
  {
    label: "API Access",
    href: "/api-access",
    isActive: (pathname: string) => pathname.startsWith("/api-access"),
  },
] as const;

interface NavItem {
  label: string;
  href: string;
  isActive: (pathname: string) => boolean;
  /** Only set where the item shows a count. */
  badge?: "health";
}

export default function Sidebar() {
  const pathname = usePathname();
  const issues = useHealthIssueCount();

  return (
    <aside className="app-sidebar">
      <div>
        <Logo href="/users" width={158} height={38} />
      </div>

      <nav className="sidebar-nav" aria-label="Main Navigation">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`sidebar-link ${item.isActive(pathname) ? "sidebar-link-active" : ""}`}
          >
            {item.label}
            {item.badge === "health" && issues > 0 && (
              <span className="sidebar-badge" title={`${issues} thing${issues === 1 ? "" : "s"} to look at`}>
                {issues}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <p className="sidebar-note">Extend `navItems` in `Sidebar.tsx` when adding new modules.</p>
    </aside>
  );
}

/**
 * How many checks are currently not OK.
 *
 * Polled rather than pushed, because the failure it is watching for is slow — rates go stale over
 * days, and keys run down over weeks. Five minutes is far more often than the underlying state can
 * change. Failures are swallowed: a nav badge must never be the thing that breaks the page.
 */
function useHealthIssueCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const overview = await api.getHealthCentre();
        if (!cancelled) setCount(overview.needsAttention);
      } catch {
        // Silent on purpose — see above.
      }
    };
    void check();
    const timer = setInterval(check, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return count;
}
