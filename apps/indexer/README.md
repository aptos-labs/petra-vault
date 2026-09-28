# Petra Vault Indexer

Petra Vault uses the No-Code Indexing (NCI) service from [Geomi](https://geomi.dev/) to index multisig transactions and enable ownership discovery. This service provides real-time indexing of on-chain data for both mainnet and testnet environments.

## Table of Contents

- [Setup Instructions](#setup-instructions)
- [Environment Configuration](#environment-configuration)
- [Initial-owner Discovery on Mainnet](#initial-owner-discovery-on-mainnet)

## Setup Instructions

### Step 1: Create a Project

1. Log into [Geomi](https://geomi.dev/)
2. Create a new project to host your indexers

### Step 2: Import Processors

1. Navigate to the **Processor** tab in your project
2. Click **Import Processor**
3. Import `multisig-mainnet.yaml` from this directory
4. Repeat the process for `multisig-testnet.yaml`

> **Note**: You should now have two processors: one for mainnet and one for testnet.

### Step 3: Create API Keys

For **each processor** (mainnet and testnet):

1. Navigate to **API Keys** > **CREATE NEW KEY**
2. Configure the key with these permissions:
   - **Client usage**: `true` ✅
   - **Allowed URLs**: `https://<your-petra-vault-domain>`
3. Click **ADD KEY**

### Step 4: Get Processor Endpoints

For **each processor** (mainnet and testnet):

1. Go to the processor details page
2. Copy the **API URL**
3. The URL format will be similar to: `https://api.mainnet.aptoslabs.com/nocode/v1/api/[processor-id]/v1/graphql`

## Environment Configuration

Navigate to the `apps/web` directory and configure these environment variables in your `.env.local` file:

```bash
# Mainnet Configuration
NEXT_PUBLIC_MULTISIG_INDEXER_MAINNET_API_KEY="your-mainnet-api-key"
NEXT_PUBLIC_MULTISIG_INDEXER_MAINNET_ENDPOINT="https://api.mainnet.aptoslabs.com/nocode/v1/api/your-mainnet-processor-id/v1/graphql"

# Testnet Configuration
NEXT_PUBLIC_MULTISIG_INDEXER_TESTNET_API_KEY="your-testnet-api-key"
NEXT_PUBLIC_MULTISIG_INDEXER_TESTNET_ENDPOINT="https://api.testnet.aptoslabs.com/nocode/v1/api/your-testnet-processor-id/v1/graphql"
```

### Environment Variables Reference

| Variable                                        | Description                   | Example                                                           |
| ----------------------------------------------- | ----------------------------- | ----------------------------------------------------------------- |
| `NEXT_PUBLIC_MULTISIG_INDEXER_MAINNET_API_KEY`  | API key for mainnet processor | `AG-...`                                                          |
| `NEXT_PUBLIC_MULTISIG_INDEXER_MAINNET_ENDPOINT` | GraphQL endpoint for mainnet  | `https://api.mainnet.aptoslabs.com/nocode/v1/api/[id]/v1/graphql` |
| `NEXT_PUBLIC_MULTISIG_INDEXER_TESTNET_API_KEY`  | API key for testnet processor | `AG-...`                                                          |
| `NEXT_PUBLIC_MULTISIG_INDEXER_TESTNET_ENDPOINT` | GraphQL endpoint for testnet  | `https://api.testnet.aptoslabs.com/nocode/v1/api/[id]/v1/graphql` |

## Initial-owner Discovery on Mainnet

`multisig-mainnet.yaml` adds `multisig_creation_candidates` alongside the existing
transaction and owner-activity tables. It maps argument `0` of
`0x1::multisig_account::create_with_owners` into a nullable `owners` address array.
The YAML uses the full framework address because Geomi's editor otherwise drops
the payload mapping during its function ABI lookup.

The mapping was tested in `multisig-creation-probe-v2` with Mainnet creation
versions `7345859301` and `7350673760`. Both were returned for the invited owner
once indexing reached their versions. The production table uses the same mappings
under the name `multisig_creation_candidates`.

After deploying, indexing the required history, and exposing the new table to the
mobile API key, query candidate versions for the active wallet:

```graphql
query VaultCreationCandidates(
  $owner: String!
  $afterVersion: bigint! = "0"
  $limit: Int! = 100
) {
  multisig_creation_candidates(
    where: { owners: { _contains: [$owner] }, version: { _gt: $afterVersion } }
    order_by: { version: asc }
    limit: $limit
  ) {
    version
    owners
  }
}
```

For each subsequent page, use the last returned version as `afterVersion` until
the result is empty. Mobile integration is still required: merge these versions
with existing creator-history and owner-event discovery, resolve successful
transactions into vault addresses, deduplicate them, and verify current ownership.
The query returns creation candidates, not vault addresses or current membership.
Argument `0` contains additional owners only; it excludes the creator and does
not cover other creation functions or custom wrappers.

**Deployment remains a separate step.** The processor needs `FeeStatement` events
to create rows before payload enrichment. This stores a row for every matching
fee event, including unrelated transactions with null owners and failed creation
calls. Filtering the GraphQL query does not reduce ingestion. Plan ingestion cost
and backfill before deployment; the YAML's `starting_version: 0` requests history
from genesis. The promoted config has been checked locally, but has not been
deployed or verified using the mobile API key.
