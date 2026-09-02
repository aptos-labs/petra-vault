import { Ed25519Account, Network } from '@aptos-labs/ts-sdk';
import { test } from './fixtures';
import { expect } from '@playwright/test';
import { parseApt } from '@aptos-labs/js-pro';
import { getPublishableContractJson } from '@/tests/lib/constants';
import fs from 'fs/promises';
import path from 'path';

test('send coins using 0x1::aptos_account::transfer', async ({
  onboarding,
  vault,
  proposal,
  aptos,
  navigation,
  page
}) => {
  const alice = Ed25519Account.generate();

  await onboarding.connectWallet(alice, Network.DEVNET);

  await onboarding.createNewVault([alice]);

  const vaultAddress = await vault.getVaultAddress();

  await aptos.fundAccount(vaultAddress);

  const prevBalance = await aptos.getAccountAPTAmount(vaultAddress);

  await proposal.createProposal(
    '0x1::aptos_account::transfer',
    [],
    [alice.accountAddress.toString(), parseApt('0.1').toString()]
  );

  await navigation.navigateToPendingTransaction(1);

  await page.getByTestId('execute-transaction-button').first().click();

  await page.getByTestId('pending-transactions-empty').click();

  const newBalance = await aptos.getAccountAPTAmount(vaultAddress);

  expect(newBalance).toBe(prevBalance - Number(parseApt('0.1')));
});

test('send coins using 0x1::aptos_account::transfer_coins to test type arguments', async ({
  onboarding,
  vault,
  aptos,
  navigation,
  page,
  proposal
}) => {
  const alice = Ed25519Account.generate();

  await onboarding.connectWallet(alice, Network.DEVNET);

  await onboarding.createNewVault([alice]);

  const vaultAddress = await vault.getVaultAddress();

  await aptos.fundAccount(vaultAddress);

  const prevBalance = await aptos.getAccountAPTAmount(vaultAddress);

  await proposal.createProposal(
    '0x1::aptos_account::transfer_coins',
    ['0x1::aptos_coin::AptosCoin'],
    [alice.accountAddress.toString(), parseApt('0.1').toString()]
  );

  await navigation.navigateToPendingTransaction(1);

  await page.getByTestId('execute-transaction-button').first().click();

  await page.getByTestId('pending-transactions-empty').click();

  const newBalance = await aptos.getAccountAPTAmount(vaultAddress);

  expect(newBalance).toBe(prevBalance - Number(parseApt('0.1')));
});

test('send coins using 0x1::aptos_account::batch_transfer to test array inputs', async ({
  onboarding,
  vault,
  aptos,
  navigation,
  page,
  proposal
}) => {
  const alice = Ed25519Account.generate();

  await onboarding.connectWallet(alice, Network.DEVNET);

  await onboarding.createNewVault([alice]);

  const vaultAddress = await vault.getVaultAddress();

  await aptos.fundAccount(vaultAddress);

  const prevBalance = await aptos.getAccountAPTAmount(vaultAddress);

  await proposal.createProposal(
    '0x1::aptos_account::batch_transfer',
    [],
    [
      [alice.accountAddress.toString(), alice.accountAddress.toString()],
      [parseApt('0.1').toString(), parseApt('0.1').toString()]
    ]
  );

  await navigation.navigateToPendingTransaction(1);

  await page.getByTestId('execute-transaction-button').first().click();

  await page.getByTestId('pending-transactions-empty').click();

  const newBalance = await aptos.getAccountAPTAmount(vaultAddress);

  expect(newBalance).toBe(prevBalance - Number(parseApt('0.2')));
});

test('publish contract', async ({
  onboarding,
  vault,
  navigation,
  proposal,
  page,
  aptos
}) => {
  const alice = Ed25519Account.generate();

  await onboarding.connectWallet(alice, Network.DEVNET);

  await onboarding.createNewVault([alice]);

  const vaultAddress = await vault.getVaultAddress();

  await aptos.fundAccount(vaultAddress);

  const contractJson = getPublishableContractJson(vaultAddress);

  const contractJsonFilePath = path.join(
    process.cwd(),
    `tests/browser/e2e/temp/publishable-contract.json`
  );

  await fs.mkdir(path.dirname(contractJsonFilePath), { recursive: true });

  await fs.writeFile(contractJsonFilePath, contractJson);

  await proposal.createPublishContractProposal(contractJsonFilePath);

  await navigation.navigateToPendingTransaction(1);

  await page.getByTestId('execute-transaction-button').first().click();

  await page.getByTestId('pending-transactions-empty').click();

  const modules = await aptos.getAccountModules(vaultAddress);

  expect(modules.length).toBeGreaterThan(0);
});

test('bookmark an entry function in the create proposal form', async ({
  onboarding,
  navigation,
  page
}) => {
  const alice = Ed25519Account.generate();

  await onboarding.connectWallet(alice, Network.DEVNET);

  await onboarding.createNewVault([alice]);

  await navigation.navigateTo('proposals');

  const input = page.getByTestId('entry-function-input');
  await input.fill('0x1::aptos_account::transfer');

  // Saving a bookmark flips the toggle into its bookmarked state.
  const toggle = page.getByTestId('bookmark-entry-function-button');
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');

  // Clearing the field surfaces the saved bookmark as a badge.
  await input.fill('');
  const badge = page.getByTestId('entry-function-bookmark-badge');
  await expect(badge).toBeVisible();
  await expect(badge).toContainText('Transfer APT');

  // Selecting the bookmark refills the entry function field.
  await badge.click();
  await expect(input).toHaveValue('0x1::aptos_account::transfer');

  // The bookmark persists when navigating away from and back to the form.
  await navigation.navigateTo('dashboard');
  await navigation.navigateTo('proposals');
  await expect(page.getByTestId('entry-function-bookmark-badge')).toBeVisible();

  // Removing the bookmark hides its badge.
  await page.getByTestId('remove-entry-function-bookmark-button').click();
  await expect(page.getByTestId('entry-function-bookmark-badge')).toHaveCount(
    0
  );
});

test('bulk reject pending proposals', async ({
  onboarding,
  vault,
  proposal,
  aptos,
  navigation,
  page
}) => {
  const alice = Ed25519Account.generate();
  const bob = Ed25519Account.generate();

  await onboarding.connectWallet(alice, Network.DEVNET);

  // A 2-of-2 vault so alice's vote alone never resolves a proposal.
  await onboarding.createNewVault([alice, bob], 2);

  const vaultAddress = await vault.getVaultAddress();

  await aptos.fundAccount(vaultAddress);

  // Two proposals, each auto-approved by alice as the creator.
  await proposal.createSendCoinsProposal(alice.accountAddress, 0.1);
  await proposal.createSendCoinsProposal(alice.accountAddress, 0.2);

  // Alice has approved proposal #1, so the detail page offers to reject it.
  // The detail page renders the actions twice (desktop + mobile layouts), so
  // scope to the first match to avoid a strict-mode violation.
  await navigation.navigateToPendingTransaction(1);
  await expect(
    page.getByTestId('reject-transaction-button').first()
  ).toBeVisible();

  // Select every pending proposal and reject them together.
  await navigation.navigateToHomeTab('transactions');
  await page.getByTestId('pending-transactions-select-all').click();
  await page.getByTestId('bulk-reject-button').click();
  await expect(page.getByText(/Rejected 2 proposals/)).toBeVisible();

  // Alice's vote flipped from approve to reject, so she can approve again.
  await navigation.navigateToPendingTransaction(1);
  await expect(
    page.getByTestId('approve-transaction-button').first()
  ).toBeVisible();
});

test('send coins from vault', async ({
  onboarding,
  vault,
  aptos,
  navigation,
  page,
  proposal
}) => {
  const alice = Ed25519Account.generate();

  await onboarding.connectWallet(alice, Network.DEVNET);

  await onboarding.createNewVault([alice]);

  const vaultAddress = await vault.getVaultAddress();

  await aptos.fundAccount(alice.accountAddress);

  await aptos.fundAccount(vaultAddress);

  const prevBalance = await aptos.getAccountAPTAmount(vaultAddress);

  await proposal.createSendCoinsProposal(alice.accountAddress, 0.1);

  await navigation.navigateToPendingTransaction(1);

  await page.getByTestId('execute-transaction-button').first().click();

  await page.getByTestId('pending-transactions-empty').click();

  const newBalance = await aptos.getAccountAPTAmount(vaultAddress);

  expect(newBalance).toBe(prevBalance - Number(parseApt('0.1')));
});
