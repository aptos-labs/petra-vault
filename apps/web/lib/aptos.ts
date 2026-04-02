import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

export const createAptosServerClient = (network: Network) => {
  return new Aptos(
    new AptosConfig({
      network,
      clientConfig: {
        API_KEY: process.env[`APTOS_${network.toUpperCase()}_API_KEY`]
      }
    })
  );
};
