import type { CodegenConfig } from '@graphql-codegen/cli';
import dotenv from 'dotenv';

dotenv.config();

const config: CodegenConfig = {
  overwrite: true,
  documents: ['operations/schemas/**/*.graphql'],
  schema: {
    'https://api.mainnet.aptoslabs.com/nocode/v1/api/cmd7z1l1j00bus601cnvpupyh/v1/graphql':
      {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_MULTISIG_INDEXER_MAINNET_API_KEY}`
        }
      }
  },
  generates: {
    './operations/generated/sdk.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-graphql-request'
      ]
    }
  }
};

export default config;
