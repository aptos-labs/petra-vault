# Petra Vault Indexer

Petra Vault uses the No-Code Indexing (NCI) service from [Geomi](https://geomi.dev/) to index multisig transactions and enable ownership discovery. This service provides real-time indexing of on-chain data for both mainnet and testnet environments.

## Table of Contents

- [Setup Instructions](#setup-instructions)
- [Environment Configuration](#environment-configuration)
- [Troubleshooting Processor Imports](#troubleshooting-processor-imports)
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

Provisioning can take 5–10 minutes. During that time, Geomi may report a missing
database, missing `processor` / `hasura-api` deployments, and a route JSON error.
Wait for the overall status to become **Running** before using the API. If it
stays in **Provisioning**, see [Troubleshooting Processor Imports](#troubleshooting-processor-imports).

### Step 3: Expose Tables in Hasura

For each processor, open its **Console URL** and authenticate with the Hasura admin
secret shown on the processor page. Under **Data**, select the `processordb`
database and `public` schema, then **Track** these tables:

- `multisig_transactions`
- `multisig_owner_activities`
- `multisig_creation_candidates` (mainnet only)

Hasura only generates GraphQL fields for [tracked tables](https://hasura.io/docs/2.0/api-reference/metadata-api/table-view/).
If the Explorer shows `no_queries_available` or a query reports a missing field,
check tracking before changing the query. If **Settings** reports inconsistent
metadata for a table that now exists, reload the metadata to refresh Hasura's
schema cache, then track any missing tables and refresh GraphiQL.

Tracking enables admin-console queries. App API keys also need Hasura select
permissions for their role on the tables they query.

### Step 4: Create API Keys

For **each processor** (mainnet and testnet):

1. Navigate to **API Keys** > **CREATE NEW KEY**
2. Configure the key with these permissions:
   - **Client usage**: `true` ✅
   - **Allowed URLs**: `https://<your-petra-vault-domain>`
3. Click **ADD KEY**

### Step 5: Get Processor Endpoints

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

## Troubleshooting Processor Imports

Geomi's visual editor rebuilds column types from event mappings. When legacy
`*Event` account-address metadata and a module event's `$.multisig_account` field
share a column, the last mapping wins. If the legacy mapping comes last, the editor
changes `move_type: address` into `event_metadata: account_address`, even though
the imported YAML declared the correct type. The processor requires a Move type
for event-field mappings and cannot start with that configuration.

Both YAML files put legacy `*Event` mappings before module events to avoid this
editor bug. Keep this order when importing. Before deploying or saving an edit,
check the generated YAML: the `multisig_account` column in both
`multisig_transactions` and `multisig_owner_activities` must retain:

```yaml
column_type:
  type: move_type
  column_type: address
```

If the database and API are running but the processor has no status or reports a
missing `processor_status` table, inspect the saved configuration and Geomi's
**Messages** section. Those status messages alone do not identify the cause.
If the two column types above were changed, import the corrected YAML into the
processor editor and verify the generated configuration before applying it.
An editor rebuild can change the types again, so check them on later edits too.

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
from genesis. Before updating app endpoints, verify candidate indexing and table
permissions using the mobile API key.
