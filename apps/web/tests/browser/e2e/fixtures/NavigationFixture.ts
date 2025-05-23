import { Page } from '@playwright/test';

export class NavigationFixture {
  constructor(private page: Page) {}

  async navigateTo(
    location: 'settings' | 'dashboard' | 'proposals' | 'smart contracts'
  ) {
    await this.page.getByTestId(`nav-item-${location}`).click();
  }

  async navigateToCreateVault() {
    await this.page.getByTestId('site-header-logo').click();

    await this.page.getByTestId('authenticated-create-vault-button').click();
  }

  async navigateToHomeTab(tab: 'transactions' | 'coins') {
    await this.navigateTo('dashboard');

    await this.page.getByTestId(`dashboard-tab-item-${tab}`).click();
  }

  async navigateToSettingsTab(tab: 'setup' | 'export') {
    await this.navigateTo('settings');

    await this.page.getByTestId(`settings-tab-item-${tab}`).click();
  }

  async navigateToPendingTransaction(proposalSequenceNumber: number) {
    await this.navigateToHomeTab('transactions');

    await this.page
      .getByTestId(`pending-transaction-${proposalSequenceNumber}`)
      .click();
  }
}
