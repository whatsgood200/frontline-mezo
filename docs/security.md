# Security notes

Living document. Updated 2026-11-05.

## Web app dependencies

- Next.js 15.5.29 and React 19.1.10 (latest patched backport; Vercel blocked 15.5.4 for a known vulnerability).
- `pnpm audit --prod` reports 46 advisories. **None come from code we ship to the browser.** Every one is inside Mezo's official Passport and OrangeKit packages:
  - `@mezo-org/passport > @mezo-org/mezo-clay` declares dev tooling as runtime dependencies: vitest, vite, esbuild, tinypool, storybook, vite-plugin-dts, baseui/d3. Frontline imports only Passport's wallet config (`@mezo-org/passport/dist/src/config`), never mezo-clay.
  - `@mezo-org/orangekit > @mezo-org/orangekit-smart-account > @safe-global/protocol-kit > web3 > web3-bzz > swarm-js` pulls tar, request, tough-cookie, qs, uuid, decode-uri-component. These are Node-only Swarm modules that no browser code path loads.
  - `orangekit > sats-connect > valibot` (moderate ReDoS in a schema helper).
  - `wagmi > @base-org/account > @coinbase/cdp-sdk > zod`: aliased to an empty module in `next.config.mjs`, so it is not bundled.
- We did not force overrides inside Passport's tree, because a wrong major version could break Bitcoin wallet signing. If Mezo publishes a Passport release with a cleaner tree, upgrade.

## Headers

`next.config.mjs` sets X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy, HSTS and Permissions-Policy on every route. A CSP is pending: RainbowKit, WalletConnect and Passport need explicit allowances, added in Phase 5.

## Mock adapter

- Production refuses to start with `NEXT_PUBLIC_ADAPTER=mock` (`web/src/lib/env.ts`), and Vercel Production is set to `chain`.
- The demo wallet exists only on mock builds and signs nothing.

## Contracts

Not written yet (Phase 3). Planned checks: reentrancy on every external call to BorrowerOperations, owner-only access on ProtectedLoan, keeper limited to `collectPremium` and `protect`, ERC-4626 share inflation and rounding, no admin key that can move user BTC, oracle staleness from MUSD's PriceFeed. Unaudited.
