import { AccountAddress } from '@aptos-labs/ts-sdk';
import { Locator, Page } from '@playwright/test';
import { NavigationFixture } from './NavigationFixture';

type FormArrayInputValue = string | FormArrayInputValue[];

export class ProposalFixture {
  constructor(
    private page: Page,
    private navigation: NavigationFixture
  ) {}

  async createAddOwnerProposal(name: string, owner: AccountAddress) {
    await this.navigation.navigateTo('settings');

    await this.page.getByTestId('settings-add-owner-button').click();

    await this.page.getByTestId('add-owner-name-input').fill(name);
    await this.page
      .getByTestId('add-owner-address-input')
      .fill(owner.toString());

    await this.page.getByTestId('add-owner-draft-button').click();

    await this.page.getByTestId('add-owner-create-proposal-button').click();
  }

  async createRemoveOwnerProposal(owner: AccountAddress) {
    await this.navigation.navigateTo('settings');

    await this.page.getByTestId(`remove-owner-button-${owner}`).click();

    await this.page.getByTestId('remove-owner-create-proposal-button').click();
  }

  async createSendCoinsProposal(
    recipient: AccountAddress,
    amount: number,
    _asset: string = '0x1::aptos_coin::AptosCoin'
  ) {
    await this.navigation.navigateTo('dashboard');

    await this.page.getByTestId('send-coins-button').click();

    await this.page
      .getByTestId('send-coins-recipient-input')
      .fill(recipient.toString());

    await this.page
      .getByTestId('send-coins-amount-input')
      .fill(amount.toString());

    await this.page.getByTestId('send-coins-review-draft-button').click();

    await this.page.getByTestId('send-coins-create-proposal-button').click();
  }

  async createProposal(
    entryFunction: string,
    typeArguments: string[],
    functionArguments: FormArrayInputValue
  ) {
    await this.navigation.navigateTo('proposals');

    await this.page.getByTestId('entry-function-input').fill(entryFunction);

    for (let i = 0; i < typeArguments.length; i++) {
      await this.page
        .getByTestId(`type-argument-input-${i}`)
        .fill(typeArguments[i]!);
    }

    for (let i = 0; i < functionArguments.length; i++) {
      const arg = functionArguments[i]!;

      if (Array.isArray(arg)) {
        const argInput = this.page.getByTestId(
          `function-argument-array-input-${i}`
        );

        await argInput.click();

        await this.fillArrayValues(argInput, arg, 0);
      } else {
        await this.page.getByTestId(`function-argument-input-${i}`).fill(arg);
      }
    }

    await this.page.getByTestId('create-proposal-confirm-draft-button').click();

    await this.page.getByTestId('create-proposal-button').first().click();
  }

  async fillArrayValues(
    argInput: Locator,
    arg: FormArrayInputValue[],
    depth: number
  ) {
    for (let j = 0; j < arg.length; j++) {
      if (Array.isArray(arg[j])) {
        await argInput.getByTestId(`add-vector-button-${depth}`).click();

        await this.fillArrayValues(
          argInput,
          arg[j] as FormArrayInputValue[],
          depth + 1
        );
      } else {
        await argInput.getByTestId(`add-argument-button-${depth}`).click();

        await argInput
          .getByTestId(`array-input-${depth}-${j}`)
          .fill(arg[j] as string);
      }
    }
  }

  async createPublishContractProposal(jsonFilePath: string) {
    await this.navigation.navigateTo('smart contracts');

    await this.page.getByTestId('drop-zone').setInputFiles(jsonFilePath);

    await this.page
      .getByTestId('publish-contract-confirm-draft-button')
      .click();

    await this.page.getByTestId('create-proposal-button').first().click();
  }
}
