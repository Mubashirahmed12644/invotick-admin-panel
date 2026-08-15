import type { Metadata } from "next";
import { Manrope, Space_Mono } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Invotics Webpanel Admin",
  description: "Read-only admin panel for users and invoices",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Runs before the first paint, which is the entire point of it being here rather than in a
          useEffect. The theme choice lives in localStorage and localStorage cannot be read on the
          server, so an effect-based version paints the default theme first and corrects itself a
          frame later — a white flash on every navigation for exactly the people who chose dark.

          It writes nothing for "system": the ABSENCE of the attribute is what lets the stylesheet's
          prefers-color-scheme branch track the OS, including a change made while the page is open.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var c=localStorage.getItem('invotick-admin-theme');" +
              "if(c==='dark'||c==='light'){document.documentElement.setAttribute('data-theme',c);}}catch(e){}})();",
          }}
        />
      </head>
      <body className={`${manrope.variable} ${spaceMono.variable}`}>
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
