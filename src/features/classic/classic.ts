import {
  Asset,
  Claimant,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { z } from 'zod';

import {
  AccountKeyPairSchema,
  AssetParamsSchema,
  AssetSchema,
  BalanceSchema,
  ClaimClaimableBalanceParamsSchema,
  ClaimPredicateSchema,
  CreateClaimableBalanceParamsSchema,
  FundbotResponseSchema,
  PaymentParamsSchema,
  TransactionSchema,
  TrustlineParamsSchema,
} from './schemas.js';

/**
 * Classic class for interacting with the Stellar Classic network
 * Provides methods for account management, payments, assets, and claimable balances
 */
export class Classic {
  private server: Horizon.Server;
  private networkPassphrase: string;
  private networkConfig: {
    [key: string]: { server: Horizon.Server; networkPassphrase: string };
  };

  /**
   * Initialize the Classic Stellar client
   * @param serverUrl - The Stellar Horizon server URL
   */
  constructor(serverUrl: string) {
    this.networkConfig = {
      testnet: {
        server: new Horizon.Server(serverUrl, { allowHttp: true }),
        networkPassphrase: Networks.TESTNET,
      },
      public: {
        server: new Horizon.Server(serverUrl, { allowHttp: true }),
        networkPassphrase: Networks.PUBLIC,
      },
      futurenet: {
        server: new Horizon.Server(serverUrl, { allowHttp: true }),
        networkPassphrase: Networks.FUTURENET,
      },
    };

    const network = serverUrl.includes('testnet')
      ? 'testnet'
      : serverUrl.includes('futurenet')
        ? 'futurenet'
        : 'public';
    const config = this.networkConfig[network];
    this.server = config.server;
    this.networkPassphrase = config.networkPassphrase;
  }

  /**
   * Create a new Stellar account keypair
   * @returns The public key and secret key of the new account
   */
  async createAccount(): Promise<z.infer<typeof AccountKeyPairSchema>> {
    try {
      const keypair = Keypair.random();
      return {
        publicKey: keypair.publicKey(),
        secretKey: keypair.secret(),
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    }
  }

  /**
   * Get the balance of a Stellar account
   * @param params - Object containing the account public key
   * @returns Array of balances for the account
   */
  async getBalance(params: {
    account: string;
  }): Promise<z.infer<typeof BalanceSchema>[]> {
    try {
      const { account } = params;
      const { balances } = await this.server.loadAccount(account);
      return BalanceSchema.array().parse(balances);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    }
  }

  /**
   * Create and submit a payment transaction
   * @param params - Payment parameters including destination, amount, asset, and secret key
   * @returns The transaction result
   */
  async createPayment(
    params: z.infer<typeof PaymentParamsSchema>,
  ): Promise<z.infer<typeof TransactionSchema>> {
    try {
      const { destination, amount, asset, secretKey } =
        PaymentParamsSchema.parse(params);
      const sourceKeypair = Keypair.fromSecret(secretKey);
      const sourceAccount = await this.server.loadAccount(
        sourceKeypair.publicKey(),
      );

      const paymentAsset = asset
        ? new Asset(asset.code, asset.issuer)
        : Asset.native();

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: (await this.server.fetchBaseFee()).toString(),
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          Operation.payment({
            destination,
            asset: paymentAsset,
            amount,
          }),
        )
        .setTimeout(30)
        .build();

      transaction.sign(sourceKeypair);

      const result = await this.server.submitTransaction(transaction);
      return TransactionSchema.parse(result);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    }
  }

  /**
   * Get transaction history for an account
   * @param params - Object containing the account public key
   * @returns Array of transactions for the account
   */
  async getTransactions(params: {
    account: string;
  }): Promise<z.infer<typeof TransactionSchema>[]> {
    try {
      const { account } = params;
      const { records } = await this.server
        .transactions()
        .forAccount(account)
        .call();
      return TransactionSchema.array().parse(records);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    }
  }

  /**
   * Create a custom asset and issue its full supply to a distributor account.
   * Builds a single transaction that first establishes the distributor's
   * trustline (up to `totalSupply`) and then pays the supply to it.
   * @param params - Asset code, issuer/distributor secret keys, and total supply
   * @returns The created asset descriptor and the submitted transaction
   */
  async createAsset(params: z.infer<typeof AssetParamsSchema>): Promise<{
    asset: z.infer<typeof AssetSchema>;
    transaction: z.infer<typeof TransactionSchema>;
  }> {
    try {
      const { code, issuerSecretKey, distributorSecretKey, totalSupply } =
        AssetParamsSchema.parse(params);

      const issuerKeypair = Keypair.fromSecret(issuerSecretKey);
      const distributorKeypair = Keypair.fromSecret(distributorSecretKey);

      const issuerAccount = await this.server.loadAccount(
        issuerKeypair.publicKey(),
      );

      const asset = new Asset(code, issuerKeypair.publicKey());

      const transaction = new TransactionBuilder(issuerAccount, {
        fee: (await this.server.fetchBaseFee()).toString(),
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          Operation.changeTrust({
            asset,
            limit: totalSupply,
            source: distributorKeypair.publicKey(),
          }),
        )
        .addOperation(
          Operation.payment({
            destination: distributorKeypair.publicKey(),
            asset,
            amount: totalSupply,
          }),
        )
        .setTimeout(30)
        .build();

      transaction.sign(issuerKeypair, distributorKeypair);

      const result = await this.server.submitTransaction(transaction);
      return {
        asset: {
          code,
          issuer: issuerKeypair.publicKey(),
        },
        transaction: TransactionSchema.parse(result),
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    }
  }

  /**
   * Create or modify a trustline from an account to a custom asset.
   * @param params - Asset, trust limit, and the trusting account's secret key
   * @returns The submitted transaction
   */
  async changeTrust(
    params: z.infer<typeof TrustlineParamsSchema>,
  ): Promise<z.infer<typeof TransactionSchema>> {
    try {
      const { asset, limit, secretKey } = TrustlineParamsSchema.parse(params);
      const accountKeypair = Keypair.fromSecret(secretKey);
      const account = await this.server.loadAccount(accountKeypair.publicKey());

      const stellarAsset = new Asset(asset.code, asset.issuer);

      const transaction = new TransactionBuilder(account, {
        fee: (await this.server.fetchBaseFee()).toString(),
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          Operation.changeTrust({
            asset: stellarAsset,
            limit,
          }),
        )
        .setTimeout(30)
        .build();

      transaction.sign(accountKeypair);

      const result = await this.server.submitTransaction(transaction);
      return TransactionSchema.parse(result);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    }
  }

  /**
   * Fund a testnet account using the Friendbot faucet.
   * @param params - Object containing the public key to fund
   * @returns The Friendbot funding transaction response
   */
  async fundAccount(params: {
    publicKey: string;
  }): Promise<z.infer<typeof FundbotResponseSchema>> {
    try {
      const { publicKey } = params;
      const response = await this.server.friendbot(publicKey).call();
      return FundbotResponseSchema.parse({
        success: true,
        transaction: response,
      });
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    }
  }

  /**
   * Create a claimable balance locking an amount for a set of claimants, each
   * gated by its own claim predicate.
   * @param params - Asset (defaults to XLM), amount, claimants, and funder secret key
   * @returns The submitted transaction
   */
  async createClaimableBalance(
    params: z.infer<typeof CreateClaimableBalanceParamsSchema>,
  ): Promise<z.infer<typeof TransactionSchema>> {
    try {
      const { asset, amount, claimants, secretKey } =
        CreateClaimableBalanceParamsSchema.parse(params);
      const sourceKeypair = Keypair.fromSecret(secretKey);
      const sourceAccount = await this.server.loadAccount(
        sourceKeypair.publicKey(),
      );

      const claimableAsset = asset
        ? new Asset(asset.code, asset.issuer)
        : Asset.native();

      const stellarClaimants = claimants.map(
        (claimant) =>
          new Claimant(
            claimant.destination,
            this.buildPredicate(claimant.predicate),
          ),
      );

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: (await this.server.fetchBaseFee()).toString(),
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          Operation.createClaimableBalance({
            asset: claimableAsset,
            amount,
            claimants: stellarClaimants,
          }),
        )
        .setTimeout(30)
        .build();

      transaction.sign(sourceKeypair);

      const result = await this.server.submitTransaction(transaction);
      return TransactionSchema.parse(result);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    }
  }

  /**
   * Recursively convert a validated claim predicate into its Stellar XDR
   * representation. Compound predicates (NOT/AND/OR) recurse into their nested
   * predicates.
   * @param predicate - The parsed claim predicate
   * @returns The equivalent XDR claim predicate
   */
  private buildPredicate(
    predicate: z.infer<typeof ClaimPredicateSchema>,
  ): xdr.ClaimPredicate {
    switch (predicate.type) {
      case 'UNCONDITIONAL':
        return xdr.ClaimPredicate.claimPredicateUnconditional();
      case 'BEFORE_RELATIVE_TIME':
        return xdr.ClaimPredicate.claimPredicateBeforeRelativeTime(
          new xdr.Int64(predicate.value),
        );
      case 'BEFORE_ABSOLUTE_TIME':
        return xdr.ClaimPredicate.claimPredicateBeforeAbsoluteTime(
          new xdr.Int64(predicate.value),
        );
      case 'NOT':
        return xdr.ClaimPredicate.claimPredicateNot(
          this.buildPredicate(predicate.value[0]),
        );
      case 'AND':
        return xdr.ClaimPredicate.claimPredicateAnd([
          this.buildPredicate(predicate.value[0]),
          this.buildPredicate(predicate.value[1]),
        ]);
      case 'OR':
        return xdr.ClaimPredicate.claimPredicateOr([
          this.buildPredicate(predicate.value[0]),
          this.buildPredicate(predicate.value[1]),
        ]);
      default:
        throw new Error('Invalid predicate type');
    }
  }

  /**
   * Claim a previously created claimable balance by its balance ID.
   * @param params - The balance ID and the claiming account's secret key
   * @returns The submitted transaction
   */
  async claimClaimableBalance(
    params: z.infer<typeof ClaimClaimableBalanceParamsSchema>,
  ): Promise<z.infer<typeof TransactionSchema>> {
    try {
      const { balanceId, secretKey } =
        ClaimClaimableBalanceParamsSchema.parse(params);
      const sourceKeypair = Keypair.fromSecret(secretKey);
      const sourceAccount = await this.server.loadAccount(
        sourceKeypair.publicKey(),
      );

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: (await this.server.fetchBaseFee()).toString(),
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          Operation.claimClaimableBalance({
            balanceId,
          }),
        )
        .setTimeout(30)
        .build();

      transaction.sign(sourceKeypair);

      const result = await this.server.submitTransaction(transaction);
      return TransactionSchema.parse(result);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    }
  }
}
