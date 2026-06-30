# Petra Vault

Petra Vault is a non-custodial, multisig wallet for the [Aptos](https://aptosfoundation.org/) network, built by [Aptos Labs](https://aptoslabs.com/). It lets a group of owners collectively control on-chain assets: proposals are created, reviewed, approved, and executed on-chain, with no single party able to move funds alone.

Because it is non-custodial, Petra Vault never holds your keys or your assets — every action is signed by the owners' own wallets and settled on the Aptos blockchain.

## Features

- **On-chain multisig** — backed by the Aptos `0x1::multisig_account` framework, with configurable owners and approval thresholds.
- **Proposal workflow** — create, review, approve/reject, and execute transactions with full visibility into each owner's vote.
- **Vault discovery** — automatically surfaces the vaults an account owns via the Geomi indexer.
- **Embedded dApp browser** — interact with Aptos dApps from inside a vault through a sandboxed iframe and a postMessage wallet bridge.
- **Multi-network** — works against Aptos mainnet, testnet, and devnet.

## Repository structure

This is a [pnpm](https://pnpm.io/) monorepo managed with [Turborepo](https://turbo.build/).

| Path | Description |
| --- | --- |
| `apps/web` | The main [Next.js 16](https://nextjs.org/) frontend application. |
| `apps/indexer` | YAML processor configs for the Geomi No-Code Indexing (NCI) service. No runnable code — see [`apps/indexer/README.md`](apps/indexer/README.md). |
| `packages/wallet-api` | `@aptos-labs/wallet-api` — the postMessage protocol between Petra Vault and dApps embedded in the explore iframe. |
| `packages/typescript-config` | Shared `tsconfig` base files. |

## Prerequisites

- **Node.js** `>= 22`
- **pnpm** `11.8.0` (pinned via the `packageManager` field; install with `corepack enable`)

## Getting started

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment variables (see below)
cp apps/web/.env.example apps/web/.env.local

# 3. Generate the GraphQL SDK (required before the first build)
pnpm generate

# 4. Start the dev server at http://localhost:3000
pnpm dev
```

### Environment variables

Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in the keys:

| Variable | Purpose | Where to get it |
| --- | --- | --- |
| `NEXT_PUBLIC_APTOS_*_API_KEY` / `APTOS_*_API_KEY` | Aptos fullnode API keys (mainnet/testnet/devnet) | [developers.aptos.dev](https://developers.aptos.dev) |
| `NEXT_PUBLIC_MULTISIG_INDEXER_*_ENDPOINT` / `_API_KEY` | Geomi NCI GraphQL endpoint + key for multisig indexing and ownership discovery | [geomi.dev](https://geomi.dev) — see [`apps/indexer/README.md`](apps/indexer/README.md) |
| `NEXT_PUBLIC_GA4_ID` | Google Analytics 4 measurement ID (optional) | [analytics.google.com](https://analytics.google.com) |
| `SENTRY_AUTH_TOKEN` | Sentry auth token for source map upload (optional) | [sentry.io](https://sentry.io/settings/account/api/auth-tokens/) |

> **Note:** `pnpm generate` introspects the live indexer GraphQL schema, so a valid `NEXT_PUBLIC_MULTISIG_INDEXER_MAINNET_API_KEY` must be set before running `generate`, `build`, `check-types`, or `test`.

## Commands

All commands run from the repository root via Turborepo:

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Next.js dev server (port 3000, Turbopack). |
| `pnpm build` | Production build. |
| `pnpm generate` | Run GraphQL codegen (regenerates `apps/web/operations/generated/sdk.ts`). |
| `pnpm test` | Run Vitest unit tests. |
| `pnpm test:e2e` | Build the test mock and run Playwright e2e tests. |
| `pnpm lint` | Lint with oxlint. |
| `pnpm lint:fix` | Lint and auto-fix with oxlint. |
| `pnpm format` | Check formatting with Prettier. |
| `pnpm format:fix` | Format with Prettier. |
| `pnpm check-types` | Type-check all packages (`tsc --noEmit`). |

Run a single unit test file from `apps/web`:

```bash
pnpm vitest run tests/lib/path/to/test.ts
```

## Architecture

The frontend uses the Next.js App Router, with routes grouped by authentication state (`(unauthenticated)`, `(authenticated)`, `(development)`). State is managed through TanStack Query (blockchain/server state, persisted to `localStorage`), Zustand, and constate.

The provider stack wires the Aptos Wallet Adapter to the Aptos JS SDK with per-network API keys. The embedded dApp browser (`apps/web/wallet/`) implements a postMessage bridge — `PetraVaultRequestHandler` validates and dispatches requests from embedded dApps, and `PetraVaultApprovalClient` surfaces approval UI to the user. The shared protocol lives in `packages/wallet-api`.

Multisig transaction data and ownership discovery are powered by the Geomi NCI indexer, queried through a generated GraphQL SDK (`pnpm generate`).

For a deeper tour of the codebase, see [`CLAUDE.md`](CLAUDE.md).

## Tooling

- **Linter:** [oxlint](https://oxc.rs/docs/guide/usage/linter)
- **Formatter:** [Prettier](https://prettier.io/)
- **Testing:** [Vitest](https://vitest.dev/) (unit) + [Playwright](https://playwright.dev/) (e2e)
- **Error tracking:** [Sentry](https://sentry.io/)
- **UI:** [Tailwind CSS v4](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/) primitives

## License

Licensed under the [Apache License 2.0](LICENSE).
