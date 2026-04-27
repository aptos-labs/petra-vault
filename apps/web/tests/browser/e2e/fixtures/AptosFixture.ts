import {
  AccountAddressInput,
  Aptos,
  AptosConfig,
  Network
} from '@aptos-labs/ts-sdk';
import { Page } from '@playwright/test';
import WalletFixture from './WalletFixture';
import { parseApt } from '@aptos-labs/js-pro';

export class AptosFixture {
  constructor(
    private page: Page,
    private wallet: WalletFixture
  ) {}

  async getClient() {
    const network = await this.wallet.getNetwork();

    const apiKey = (
      {
        [Network.DEVNET]: process.env.NEXT_PUBLIC_APTOS_DEVNET_API_KEY,
        [Network.TESTNET]: process.env.NEXT_PUBLIC_APTOS_TESTNET_API_KEY,
        [Network.MAINNET]: process.env.NEXT_PUBLIC_APTOS_MAINNET_API_KEY
      } as Record<Network, string | undefined>
    )[network.name];

    const faucetToken = (
      {
        [Network.DEVNET]: process.env.APTOS_DEVNET_FAUCET_AUTH_TOKEN
      } as Record<Network, string | undefined>
    )[network.name];

    return new Aptos(
      new AptosConfig({
        network: network.name,
        clientConfig: { API_KEY: apiKey },
        faucetConfig: { AUTH_TOKEN: faucetToken }
      })
    );
  }

  async fundAccount(
    address: AccountAddressInput,
    amount: number = Number(parseApt('5'))
  ) {
    const aptos = await this.getClient();

    const transaction = await aptos.faucet.fundAccount({
      accountAddress: address,
      amount
    });

    await aptos.waitForTransaction({ transactionHash: transaction.hash });
  }

  async getAccountAPTAmount(address: AccountAddressInput) {
    const aptos = await this.getClient();

    return await aptos.getAccountAPTAmount({ accountAddress: address });
  }

  async getAccountModules(address: AccountAddressInput) {
    const aptos = await this.getClient();

    return await aptos.getAccountModules({ accountAddress: address });
  }
}
