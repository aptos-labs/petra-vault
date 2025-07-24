import { Page } from '@playwright/test';
import WalletFixture from './WalletFixture';
import { parseApt } from '@aptos-labs/js-pro';
import { AptosFixture } from './AptosFixture';
import { Ed25519Account, Network } from '@aptos-labs/ts-sdk';
import { NavigationFixture } from './NavigationFixture';
import { VaultFixture } from './VaultFixture';

export class OnboardingFixture {
  constructor(
    private page: Page,
    private wallet: WalletFixture,
    private aptos: AptosFixture,
    private navigation: NavigationFixture,
    private vault: VaultFixture
  ) {}

  async connectWallet(accounts: Ed25519Account, network: Network) {
    await this.page.goto('/');

    // Wait for the page to load.
    await this.page.waitForTimeout(1000);

    await this.wallet.init(accounts, network);

    await this.page.getByTestId('connect-wallet-button').click();

    await this.page.getByTestId('more-wallets-button').click();

    await this.page.getByTestId('connect-wallet-button-mockpetra').click();
  }

  async createNewVault(
    accounts: [Ed25519Account, ...Ed25519Account[]],
    signaturesRequired: number = 1
  ) {
    await this.page.getByTestId('create-vault-button').click();

    // If there are additional owners, make sure to add them.
    let i = 1;
    while (i < accounts.length) {
      const additionalOwner = accounts[i];
      if (!additionalOwner) {
        throw new Error(
          'Additional owner account is `undefined` when attempting to add owners.'
        );
      }
      await this.page.getByTestId('onboarding-add-owner-button').click();
      await this.page
        .getByTestId(`owner-name-input-${i}`)
        .fill(`Owner ${i + 1}`);
      await this.page
        .getByTestId(`owner-address-input-${i}`)
        .fill(additionalOwner.accountAddress.toString());
      i++;
    }

    // If signatures required is greater than 1, we need to set the signatures required.
    if (signaturesRequired > 1) {
      if (signaturesRequired > accounts.length) {
        throw new Error(
          'Signatures required is greater than the number of owners.'
        );
      }

      await this.page.getByTestId('signatures-required-select').click();
      await this.page
        .getByTestId(`signatures-required-select-item-${signaturesRequired}`)
        .click();
    }

    await this.page.getByTestId('save-vault-config-button').click();

    const primaryAccount = await this.wallet.getAccount();

    await this.aptos.fundAccount(primaryAccount.address, Number(parseApt('1')));

    await this.page.getByTestId('sign-and-submit-create-vault-button').click();

    await this.page.waitForURL(/\/vault\/devnet:/);

    // Confirm that the vaults were created successfully.
    await this.vault.verifyOwnersAndSignaturesRequired(
      accounts,
      signaturesRequired
    );
  }

  async importVaultsWithJSON(jsonFilePath: string) {
    await this.page.getByTestId('import-vaults-json-button').click();

    await this.page.getByTestId('drop-zone').setInputFiles(jsonFilePath);

    await this.page.getByTestId('confirm-import-vaults-json-button').click();

    await this.page.waitForURL(/\/home/);
  }
}
