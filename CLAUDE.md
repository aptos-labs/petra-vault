# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Petra Vault is a non-custodial multisig wallet on the Aptos Network, built by Aptos Labs. This is a pnpm monorepo managed with Turborepo.

**Structure:**
- `apps/web` — Next.js 15 frontend (main application)
- `apps/indexer` — YAML processor configs for the Geomi NCI indexing service (no runnable code)
- `packages/wallet-api` — `@aptos-labs/wallet-api` TypeScript package: the postMessage-based protocol between Petra Vault and dApps embedded in the explore iframe
- `packages/typescript-config` — Shared `tsconfig` base files

## Commands

All commands run from the repo root via Turborepo:

```bash
pnpm dev          # start Next.js dev server (port 3000, Turbopack)
pnpm build        # production build
pnpm test         # run Vitest unit tests
pnpm test:e2e     # build mock + run Playwright e2e tests
pnpm lint         # oxlint
pnpm lint:fix     # oxlint --fix
pnpm format       # prettier check
pnpm format:fix   # prettier write
pnpm check-types  # tsc --noEmit across all packages
pnpm generate     # run GraphQL codegen (required before first build)
```

**Single test file** (from `apps/web`):
```bash
pnpm vitest run tests/lib/path/to/test.ts
```

**Unit tests** live in `apps/web/tests/**/*.test.ts`. **E2e tests** (Playwright) live in `apps/web/tests/browser/` and require `pnpm build:mock` first.

## Environment Setup

Copy `apps/web/.env.example` to `apps/web/.env.local`. Required keys:
- `NEXT_PUBLIC_APTOS_*_API_KEY` / `APTOS_*_API_KEY` — Aptos node API keys (mainnet/testnet/devnet) from developers.aptos.dev
- `NEXT_PUBLIC_MULTISIG_INDEXER_*` — Geomi NCI GraphQL endpoint + API key (see `apps/indexer/README.md` for setup)

## Architecture: `apps/web`

### Next.js App Router structure

Routes are organized by authentication state using route groups:
- `app/(unauthenticated)/` — login/landing pages
- `app/(authenticated)/` — requires connected wallet
  - `vault/[vaultId]/(dashboard)/` — vault overview, transactions
  - `vault/[vaultId]/explore/` — embedded dApp browser (iframe)
  - `vault/[vaultId]/proposal/` — create/review/execute proposals
  - `vault/[vaultId]/settings/` — vault configuration
- `app/(development)/` — dev-only tooling

### Provider stack

`AppProviders` wraps the entire app in this order:
1. `AptosWalletAdapterProvider` — wallet connection (auto-connect)
2. `PersistQueryClientProvider` — TanStack Query with localStorage persistence (only `view-module`, `multisig-discovered-accounts`, `multisig-execution-events` queries are persisted)
3. `AptosCoreProvider` — `@aptos-labs/react` core, wires the wallet adapter to the Aptos JS SDK with per-network API keys

Page-level providers (`ActiveVaultProvider`, `CoinsProvider`, etc.) are colocated near the routes that need them. State is managed through a combination of TanStack Query (server/blockchain state), Zustand (`useStore`), and constate (lightweight context from hooks).

### Wallet API (explore iframe)

The `wallet/` directory implements the dApp bridge:
- `PetraVaultRequestHandler` — handles `postMessage` requests from dApps (connect, signAndSubmitTransaction, etc.), validates `allowedOrigins`, dispatches to `approvalClient`
- `PetraVaultApprovalClient` — surfaces approval UI to the user

The `packages/wallet-api` package defines the shared protocol types, serialization, and base `RequestHandler`/`ApprovalClient` interfaces.

### GraphQL / Indexer

`operations/schemas/` holds `.graphql` operation files. Run `pnpm generate` (from root or `apps/web`) to regenerate `operations/generated/sdk.ts` via `graphql-codegen`. The generated SDK is consumed by hooks that query the Geomi NCI indexer for multisig transaction data.

### Key `lib/` utilities

- `lib/vaults.ts` — vault ID construction and helpers
- `lib/transactions.ts` / `lib/payloads.ts` — transaction building
- `lib/storage.ts` — custom serializers for TanStack Query persistence (handles `BigInt`, `AccountAddress`)
- `lib/constants.ts` — endpoints and well-known addresses

### Tooling

- **Linter**: oxlint (fast, no ESLint)
- **Formatter**: Prettier
- **Testing**: Vitest (unit), Playwright (e2e)
- **Error tracking**: Sentry (`instrumentation.ts`, `sentry.*.config.ts`)
- **UI**: Tailwind CSS v4 + Radix UI primitives + shadcn-style components in `components/ui/`
