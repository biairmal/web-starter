# web-starter

The reusable web app every client project starts from. Phase 2 adds the identity screens (sign-in, sign-up, account, admin console) wired to `go-identity` through a BFF. Requirements are in `project-files/phase2/frontend/` (PRD, TRD, APP_FLOW, IMPLEMENTATION_PLAN).

## Requirements

- Node.js 22 (`engines` allows 22 and newer; CI runs 22)
- pnpm (version pinned in `package.json` `packageManager`)

## Configuration

Copy `.env.example` to `.env.local` and fill it in. The server checks every variable when it starts and names any that are missing or wrong. Generate a session key with:

```bash
openssl rand -base64 32
```

Branding lives in `src/config/brand.ts`, colours and spacing in `src/app/tokens.css`, and the font in `src/app/fonts.ts` with the file in `public/fonts/`. See `docs/DECISIONS.md` (F0.2) for how the design tokens map to Tailwind and shadcn.

## Commands

```bash
pnpm install
pnpm dev        # Next.js dev server with Turbopack, http://localhost:3000
pnpm build      # production build
pnpm start      # serve the production build
pnpm check      # lint, typecheck, format check, unit tests (run before every PR)
pnpm format     # Prettier, writes files
```

## Layout

```text
src/app/          routes (App Router); placeholder home page until F2.3
src/components/ui shadcn/ui primitives (Radix base), owned by this repo
src/lib/          shared helpers (utils for shadcn for now)
```

Planned layout (TRD 3) fills in task by task. See `AGENTS.md` for the conventions and `docs/DECISIONS.md` for choices made while building.

## Adding shadcn/ui components

```bash
pnpm exec shadcn add <component>
```

The config is in `components.json` (Radix base, Vega preset).
