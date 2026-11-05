# 007 Production always uses the chain adapter; previews use mocks

Date: 2026-11-05. Status: accepted.

**Context.** AGENTS.md forbids mock data in production, but Phase 2 builds the UI on mocks before contracts exist.

**Decision.** Vercel env: `NEXT_PUBLIC_ADAPTER=chain` for Production, `mock` for Preview and Development. `web/src/lib/env.ts` throws if production runs with `mock`. Phase 2 UI review happens on preview deployments (behind Vercel login), not on frontline-mezo.vercel.app.

**Tradeoffs.** Until Phase 4 the production site shows only what is real (health, live chain reads). Preview links need Right's Vercel login.
