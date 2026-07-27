"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearAccessToken } from "@/lib/auth";

interface NavbarProps {
  title: string;
  showLogout?: boolean;
  /**
   * Where this page sits under, when it is a drill-down.
   *
   * A real link rather than `router.back()`: a drill-down reached from a bookmark, a shared URL or a
   * refresh has no history to go back to, and a back arrow that does nothing is worse than none.
   */
  backHref?: string;
  backLabel?: string;
}

export default function Navbar({ title, showLogout = true, backHref, backLabel }: NavbarProps) {
  const router = useRouter();

  function onLogout() {
    clearAccessToken();
    router.replace("/login");
  }

  return (
    <header className="navbar">
      <div className="navbar-left">
        {backHref && (
          <Link href={backHref} className="navbar-back" aria-label={`Back to ${backLabel ?? "overview"}`}>
            ←<span className="navbar-back-label">{backLabel ?? "Back"}</span>
          </Link>
        )}
        <h1>{title}</h1>
      </div>
      {showLogout ? (
        <button type="button" className="btn btn-outline" onClick={onLogout}>
          Logout
        </button>
      ) : null}
    </header>
  );
}
