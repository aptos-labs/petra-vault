import { GraphQLClient } from 'graphql-request';
import { getSdk } from './generated/sdk';
import { Network } from '@aptos-labs/ts-sdk';

export function createMultisigIndexerClient(
  endpoint: string,
  options?: ConstructorParameters<typeof GraphQLClient>[1]
) {
  const graphqlClient = new GraphQLClient(endpoint, options);
  return getSdk(graphqlClient);
}

export function getMultisigIndexerClient(network: Network) {
  let apiKey: string | undefined;
  let endpoint: string | undefined;
  switch (network) {
    case Network.MAINNET:
      apiKey = process.env.NEXT_PUBLIC_MULTISIG_INDEXER_MAINNET_API_KEY;
      endpoint = process.env.NEXT_PUBLIC_MULTISIG_INDEXER_MAINNET_ENDPOINT;
      break;
    case Network.TESTNET:
      apiKey = process.env.NEXT_PUBLIC_MULTISIG_INDEXER_TESTNET_API_KEY;
      endpoint = process.env.NEXT_PUBLIC_MULTISIG_INDEXER_TESTNET_ENDPOINT;
      break;
  }

  if (!apiKey || !endpoint) return null;

  return createMultisigIndexerClient(endpoint, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'x-aptos-client': 'petra-vault-web'
    }
  });
}
