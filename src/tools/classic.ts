import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import * as schemas from '../features/classic/schemas.js';

/**
 * Array of Stellar Classic tools for the MCP server
 * These tools provide functionality for account management, payments, assets, and claimable balances
 */
export const stellarClassicTools: Tool[] = [
  {
    name: 'stellar_create_account',
    description: 'Create a new Stellar account with a random keypair',
    inputSchema: zodToJsonSchema(schemas.AccountKeyPairSchema) as {
      type: 'object';
      properties: Record<string, unknown>;
    },
  },
  {
    name: 'stellar_balance',
    description: 'Get the balance of a Stellar account including all assets',
    inputSchema: zodToJsonSchema(
      z.object({
        account: z
          .string()
          .describe('The public key of the account to check balance'),
      }),
    ) as { type: 'object'; properties: Record<string, unknown> },
  },
  {
    name: 'stellar_payment',
    description: 'Send a payment to another Stellar account',
    inputSchema: zodToJsonSchema(schemas.PaymentParamsSchema) as {
      type: 'object';
      properties: Record<string, unknown>;
    },
  },
  {
    name: 'stellar_transactions',
    description: 'Get transaction history for a Stellar account',
    inputSchema: zodToJsonSchema(
      z.object({
        account: z
          .string()
          .describe('The account public key to get transactions for'),
      }),
    ) as { type: 'object'; properties: Record<string, unknown> },
  },
  {
    name: 'stellar_create_asset',
    description: 'Create a new custom asset on the Stellar network',
    inputSchema: zodToJsonSchema(schemas.AssetParamsSchema) as {
      type: 'object';
      properties: Record<string, unknown>;
    },
  },
  {
    name: 'stellar_change_trust',
    description: 'Create or modify a trustline for a custom asset',
    inputSchema: zodToJsonSchema(schemas.TrustlineParamsSchema) as {
      type: 'object';
      properties: Record<string, unknown>;
    },
  },
  {
    name: 'stellar_fund_account',
    description: 'Fund a testnet account using the Friendbot faucet',
    inputSchema: zodToJsonSchema(
      z.object({
        publicKey: z.string().describe('The public key of the account to fund'),
      }),
    ) as { type: 'object'; properties: Record<string, unknown> },
  },
  {
    name: 'stellar_create_claimable_balance',
    description: 'Create a claimable balance with conditional predicates',
    inputSchema: zodToJsonSchema(
      schemas.CreateClaimableBalanceParamsSchema,
    ) as { type: 'object'; properties: Record<string, unknown> },
  },
  {
    name: 'stellar_claim_claimable_balance',
    description: 'Claim a claimable balance using the balance ID',
    inputSchema: zodToJsonSchema(schemas.ClaimClaimableBalanceParamsSchema) as {
      type: 'object';
      properties: Record<string, unknown>;
    },
  },
];
