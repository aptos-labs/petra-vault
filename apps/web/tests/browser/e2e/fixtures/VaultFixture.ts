import {
  AccountAddressInput,
  Ed25519Account,
  Network
} from '@aptos-labs/ts-sdk';
import { Page } from '@playwright/test';
import { AptosFixture } from './AptosFixture';
import { NavigationFixture } from './NavigationFixture';
import path from 'path';

export class VaultFixture {
  constructor(
    private page: Page,
    private aptos: AptosFixture,
    private navigation: NavigationFixture
  ) {}

  async getVaultAddress() {
    await this.navigation.navigateTo('dashboard');

    await this.page.getByTestId('vault-address').click();

    return this.page.evaluate(() => navigator.clipboard.readText());
  }

  async verifyOwnersAndSignaturesRequired(
    owners: Ed25519Account[],
    signaturesRequired: number
  ) {
    await this.navigation.navigateTo('settings');

    for (const account of owners) {
      await this.page
        .getByTestId(`vault-owner-${account.accountAddress}`)
        .click();
    }

    await this.page
      .getByTestId(`signatures-required-count-${signaturesRequired}`)
      .click();
  }

  async verifyVaultsExists(
    vaults: { address: AccountAddressInput; network: Network }[]
  ) {
    await this.page.getByTestId('nav-vaults-dropdown-menu-trigger').click();

    for (const vault of vaults) {
      await this.page
        .getByTestId(`nav-vault-${vault.address.toString()}-${vault.network}`)
        .focus();
    }
  }

  async deleteVault() {
    await this.navigation.navigateTo('settings');

    await this.page.getByTestId('delete-vault-button').click();

    await this.page.getByTestId('confirm-delete-vault-button').click();
  }

  async downloadVaultsJSON(): Promise<string> {
    await this.navigation.navigateToSettingsTab('export');

    const downloadPromise = this.page.waitForEvent('download');

    await this.page.getByTestId('export-vaults-button').click();

    const download = await downloadPromise;

    const newPath = path.join(
      process.cwd(),
      `tests/browser/e2e/temp/${download.suggestedFilename()}`
    );

    await download.saveAs(newPath);

    return newPath;
  }
}
