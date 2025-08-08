# Petra Vault Indexer

Petra Vault uses the No-Code Indexing (NCI) service from [Geomi](https://geomi.dev/) to index multisig transactions and enable ownership discovery. This service provides real-time indexing of on-chain data for both mainnet and testnet environments.

## Table of Contents

- [Setup Instructions](#setup-instructions)
- [Environment Configuration](#environment-configuration)

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
