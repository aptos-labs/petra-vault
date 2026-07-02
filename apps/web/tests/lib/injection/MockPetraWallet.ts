import {
  Account,
  AnyRawTransaction,
  Aptos,
  AptosConfig,
  Ed25519Account,
  Network,
  NetworkToChainId
} from '@aptos-labs/ts-sdk';
import {
  AccountInfo,
  APTOS_CHAINS,
  AptosConnectNamespace,
  AptosDisconnectNamespace,
  AptosFeatures,
  AptosGetAccountNamespace,
  AptosGetNetworkNamespace,
  AptosOnAccountChangeNamespace,
  AptosOnNetworkChangeNamespace,
  AptosSignAndSubmitTransactionInput,
  AptosSignAndSubmitTransactionNamespace,
  AptosSignAndSubmitTransactionOutput,
  AptosSignMessageNamespace,
  AptosSignMessageOutput,
  AptosSignTransactionNamespace,
  AptosSignTransactionOutput,
  AptosWallet,
  NetworkInfo,
  UserResponse,
  UserResponseStatus
} from '@aptos-labs/wallet-standard';
import MockPetraWalletAccount from './MockPetraWalletAccount';

export class MockPetraWallet implements AptosWallet {
  readonly name = 'MockPetra';

  readonly version = '1.0.0';

  readonly icon =
    'data:image/png;base64,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';

  readonly url =
    'https://chrome.google.com/webstore/detail/petra-aptos-wallet/ejjladinnckdgjemekebdpeokbikhfci';

  readonly chains = APTOS_CHAINS;

  get features(): AptosFeatures {
    return {
      [AptosConnectNamespace]: {
        connect: this.connect.bind(this),
        version: '1.0.0'
      },
      [AptosDisconnectNamespace]: {
        disconnect: this.disconnect.bind(this),
        version: '1.0.0'
      },
      [AptosGetAccountNamespace]: {
        account: this.getAccount.bind(this),
        version: '1.0.0'
      },
      [AptosGetNetworkNamespace]: {
        network: this.getNetwork.bind(this),
        version: '1.0.0'
      },
      [AptosOnAccountChangeNamespace]: {
        onAccountChange: this.onAccountChange.bind(this),
        version: '1.0.0'
      },
      [AptosOnNetworkChangeNamespace]: {
        onNetworkChange: this.onNetworkChange.bind(this),
        version: '1.0.0'
      },
      [AptosSignAndSubmitTransactionNamespace]: {
        signAndSubmitTransaction: this.signAndSubmitTransaction.bind(this),
        version: '1.1.0'
      },
      [AptosSignMessageNamespace]: {
        signMessage: this.signMessage.bind(this),
        version: '1.0.0'
      },
      [AptosSignTransactionNamespace]: {
        signTransaction: this.signTransaction.bind(this),
        version: '1.0.0'
      }
    };
  }

  #activeAccount: Account | undefined;

  #activeNetwork: Network | undefined;

  #callbacksMap: {
    onAccountChange?: (account: AccountInfo) => void;
    onNetworkChange?: (network: NetworkInfo) => void;
  } = {};

  constructor() {
    console.log(
      'Starting new session of accounts since the page was reloaded. If this is unexpected behavior, ensure that `page.goto` is called once per test.'
    );
  }

  get accounts(): MockPetraWalletAccount[] {
    return this.#activeAccount
      ? [
          new MockPetraWalletAccount(
            new AccountInfo({
              address: this.#activeAccount.accountAddress,
              publicKey: this.#activeAccount.publicKey,
              ansName: undefined
            })
          )
        ]
      : [];
  }

  async setAccount(account: Account): Promise<void> {
    this.#activeAccount = account;
    this.#callbacksMap.onAccountChange?.(
      new AccountInfo({
        address: account.accountAddress,
        publicKey: account.publicKey,
        ansName: undefined
      })
    );
  }

  async setNetwork(name: Network): Promise<void> {
    this.#activeNetwork = name;
    this.#callbacksMap.onNetworkChange?.({
      chainId: NetworkToChainId[name] ?? 0,
      name,
      url: new AptosConfig({ network: name }).fullnode
    } satisfies NetworkInfo);
  }

  async connect(): Promise<UserResponse<AccountInfo>> {
    if (!this.#activeAccount)
      throw new Error('No active account, please use `setAccount` first.');

    return {
      args: new AccountInfo({
        address: this.#activeAccount.accountAddress,
        publicKey: this.#activeAccount.publicKey,
        ansName: undefined
      }),
      status: UserResponseStatus.APPROVED
    };
  }

  async disconnect(): Promise<void> {}

  async getAccount(): Promise<AccountInfo> {
    if (!this.#activeAccount)
      throw new Error('No active account, please use `setAccount` first.');

    return new AccountInfo({
      address: this.#activeAccount.accountAddress,
      publicKey: this.#activeAccount.publicKey
    });
  }

  async getAccountPrivateKey(): Promise<string> {
    return (this.#activeAccount as Ed25519Account).privateKey.toAIP80String();
  }

  async getNetwork(): Promise<NetworkInfo> {
    if (!this.#activeNetwork)
      throw new Error('No active network, please use `setNetwork` first.');

    const config = new AptosConfig({ network: this.#activeNetwork });
    return {
      chainId: NetworkToChainId[this.#activeNetwork] ?? 0,
      name: config.network,
      url: config.fullnode
    };
  }

  async onAccountChange(
    callback: (account: AccountInfo) => void
  ): Promise<void> {
    this.#callbacksMap.onAccountChange = callback;
  }

  async onNetworkChange(
    callback: (network: NetworkInfo) => void
  ): Promise<void> {
    this.#callbacksMap.onNetworkChange = callback;
  }

  async signAndSubmitTransaction({
    payload,
    maxGasAmount,
    gasUnitPrice
  }: AptosSignAndSubmitTransactionInput): Promise<
    UserResponse<AptosSignAndSubmitTransactionOutput>
  > {
    if (!this.#activeAccount)
      throw new Error('No active account, please use `setAccount` first.');

    const aptos = new Aptos(new AptosConfig({ network: this.#activeNetwork }));

    const transaction = await aptos.transaction.build.simple({
      sender: this.#activeAccount.accountAddress,
      data: payload,
      options: { maxGasAmount, gasUnitPrice }
    });

    const pendingTransaction = await aptos.signAndSubmitTransaction({
      signer: this.#activeAccount,
      transaction
    });

    return {
      args: { hash: pendingTransaction.hash as `0x${string}` },
      status: UserResponseStatus.APPROVED
    };
  }

  async signMessage(): Promise<UserResponse<AptosSignMessageOutput>> {
    throw new Error('Not implemented');
  }

  async signTransaction(
    transaction: AnyRawTransaction
  ): Promise<UserResponse<AptosSignTransactionOutput>> {
    if (!this.#activeAccount)
      throw new Error('No active account, please use `setAccount` first.');

    const aptos = new Aptos(new AptosConfig({ network: this.#activeNetwork }));

    const authenticator = aptos.transaction.sign({
      signer: this.#activeAccount,
      transaction
    });

    return {
      args: authenticator,
      status: UserResponseStatus.APPROVED
    };
  }
}
