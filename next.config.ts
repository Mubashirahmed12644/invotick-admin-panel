import type { NextConfig } from "next";

// Backend origin — used server-side and as the browser proxy target.
const BACKEND_ORIGIN = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://stage.invotick.com").replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Build id shown in the panel header so you can confirm the latest deploy is live.
  // Vercel injects VERCEL_GIT_COMMIT_SHA at build time; falls back to "dev" locally.
  env: {
    NEXT_PUBLIC_BUILD_ID: (process.env.VERCEL_GIT_COMMIT_SHA || "dev").slice(0, 7),
  },
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium", "puppeteer"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "flagcdn.com",
      },
    ],
  },
  // Proxy the browser's API calls through this app (Vercel) → backend, so the
  // panel works even on networks that can't reach the backend origin directly.
  async rewrites() {
    return [{ source: "/backend/:path*", destination: `${BACKEND_ORIGIN}/:path*` }];
  },
};

export default nextConfig;
