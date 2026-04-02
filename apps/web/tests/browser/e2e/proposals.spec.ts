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
