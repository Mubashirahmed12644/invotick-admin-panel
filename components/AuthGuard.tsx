"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isLoggedIn } from "@/lib/auth";

// Only the login page is reachable without a session. Everything else is the
// admin panel and must be gated — direct navigation to /utm, /users, etc. by a
// signed-out visitor now bounces to /login instead of rendering the page.
const PUBLIC_PATHS = ["/login"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (isPublic) return;
    if (isLoggedIn()) {
      setAuthed(true);
    } else {
      setAuthed(false);
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, isPublic, router]);

  // Public pages render immediately.
  if (isPublic) return <>{children}</>;
  // Protected pages render nothing until the session is confirmed client-side —
  // so no admin UI is ever shown to a signed-out visitor.
  if (!authed) return null;
  return <>{children}</>;
}
