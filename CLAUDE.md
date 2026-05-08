# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Next.js on default port 3000)
npm run build    # Production build
npm run lint     # ESLint check
```

No test suite exists in this project.

## Environment

Requires `NEXT_PUBLIC_API_BASE_URL` set to the backend base URL (e.g. `http://localhost:8080`). The app auto-detects ngrok URLs and adds the `ngrok-skip-browser-warning` header.

## Architecture

**Next.js 16 App Router** — all pages live under `app/`. The project uses **TypeScript strict mode**, **Tailwind v4** for utility classes (in rare cases), and a large custom CSS file at `app/globals.css` that defines all design tokens and component classes. Most styling is done via `className` with these CSS classes, not Tailwind utilities.

### Key structural conventions

- **All pages are `"use client"`** — there are no RSC data-fetching patterns; pages fetch data in `useEffect`.
- **Page layout**: every page wraps content in `<main className="app-shell"><Sidebar /><div className="app-main"><Navbar title="..." /><section className="content-wrap">...</section></div></main>`.
- **API client**: `lib/api.ts` exports a single `api` object with all endpoint methods. Use `apiRequest<T>(path)` (expects `{ success, data }` envelope) or `apiRequestRaw<T>(path)` (returns raw JSON). Auth token is injected automatically from `lib/auth.ts`.
- **Error/loading/empty states**: use `<LoadingState>`, `<ErrorState onRetry={...}>`, `<EmptyState>` components from `components/`.
- **Types**: shared API response types live in `lib/types.ts`. Feature-specific types go in `features/<name>/types.ts`.
- **Unauthorized handling**: check `isUnauthorizedError(error)` → call `clearAccessToken({ sessionExpired: true })` → `router.replace("/login")`.

### Adding a new page/module

1. Create `app/<route>/page.tsx` — use `"use client"` at the top.
2. Add an entry to the `navItems` array in `components/Sidebar.tsx`.
3. For complex features, create `features/<name>/` with sub-folders `components/`, `hooks/`, `types.ts`, `styles/<name>.module.css` (for feature-scoped CSS).
4. Add new API methods to the `api` object in `lib/api.ts` and types to `lib/types.ts`.

### Path aliases

`@/*` maps to the project root, so `@/lib/api`, `@/components/Sidebar`, `@/features/ip-stats` all resolve correctly.
