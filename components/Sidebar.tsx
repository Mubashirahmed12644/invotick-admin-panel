"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";

const navItems = [
  {
    label: "All Users",
    href: "/users",
    isActive: (pathname: string) => pathname.startsWith("/users"),
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
] as const;

export default function Sidebar() {
  const pathname = usePathname();

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
          </Link>
        ))}
      </nav>

      <p className="sidebar-note">Extend `navItems` in `Sidebar.tsx` when adding new modules.</p>
    </aside>
  );
}
