/**
 * Zod validation schemas for the Stellar Classic feature.
 *
 * Covers tool input parameters (payments, assets, trustlines, claimable
 * balances) as well as response shapes used to parse Horizon API results.
 * Schemas that describe MCP tool inputs use `.describe()` so the generated
 * JSON Schema carries human-readable field documentation.
 */
import { z } from 'zod';

/**
 * Union of all supported claim predicate shapes for claimable balances.
 * Defined explicitly to break the recursive reference used by the compound
 * and NOT predicates (which contain nested predicates via `z.lazy`).
 */
type ClaimPredicate =
  | z.infer<typeof UnconditionalPredicateSchema>
  | z.infer<typeof TimePredicateSchema>
  | z.infer<typeof CompoundPredicateSchema>
  | z.infer<typeof NotPredicateSchema>;

/** Generic MCP tool response envelope (mirrors CallToolResult). */
export const StellarResponseSchema = z.object({
  isError: z.boolean().optional(),
  content: z.array(
    z.object({
      type: z.string(),
      text: z.string(),
    }),
  ),
});

// --- Claimable balance claim predicates ---

/** Predicate allowing a claim at any time. */
export const UnconditionalPredicateSchema = z.object({
  type: z
    .literal('UNCONDITIONAL')
    .describe('Predicate type that allows claiming at any time'),
});

export const TimePredicateSchema = z.object({
  type: z
    .union([
      z.literal('BEFORE_RELATIVE_TIME'),
      z.literal('BEFORE_ABSOLUTE_TIME'),
    ])
    .describe(
      'BEFORE_RELATIVE_TIME: Can claim before X seconds from creation, BEFORE_ABSOLUTE_TIME: Can claim before specific Unix timestamp',
    ),
  value: z
    .number()
    .describe(
      'For relative time: seconds from creation, for absolute time: Unix timestamp',
    ),
});

export const CompoundPredicateSchema: z.ZodType<{
  type: 'AND' | 'OR';
  value: [ClaimPredicate, ClaimPredicate];
}> = z.object({
  type: z
    .union([z.literal('AND'), z.literal('OR')])
    .describe(
      'AND: Both predicates must be true, OR: Either predicate must be true',
    ),
  value: z
    .tuple([
      z.lazy(() => ClaimPredicateSchema),
      z.lazy(() => ClaimPredicateSchema),
    ])
    .describe('Array of two predicates to combine'),
});

export const NotPredicateSchema: z.ZodType<{
  type: 'NOT';
  value: [ClaimPredicate];
}> = z.object({
  type: z.literal('NOT').describe('Negates the provided predicate'),
  value: z
    .tuple([z.lazy(() => ClaimPredicateSchema)])
    .describe('The predicate to negate'),
});

export const ClaimPredicateSchema = z.union([
  UnconditionalPredicateSchema,
  TimePredicateSchema,
  CompoundPredicateSchema,
  NotPredicateSchema,
]);

export const ClaimantSchema = z.object({
  destination: z
    .string()
    .describe('Public key of the account that can claim the balance'),
  predicate: ClaimPredicateSchema.describe(
    'Conditions under which this account can claim the balance',
  ),
});

export const CreateClaimableBalanceParamsSchema = z.object({
  asset: z
    .object({
      code: z.string().describe('Asset code (e.g., "USDC", "EURC")'),
      issuer: z.string().describe('Public key of the asset issuer'),
    })
    .optional()
    .describe('Asset to create balance for. If not provided, uses native XLM'),
  amount: z.string().describe('Amount to lock in the claimable balance'),
  claimants: z
    .array(ClaimantSchema)
    .describe(
      'List of accounts that can claim this balance and their conditions',
    ),
  secretKey: z
    .string()
    .describe(
      'Secret key of the account creating and funding the claimable balance',
    ),
});

export const ClaimClaimableBalanceParamsSchema = z.object({
  balanceId: z
    .string()
    .describe(
      'ID of the claimable balance to claim (returned from createClaimableBalance)',
    ),
  secretKey: z
    .string()
    .describe(
      'Secret key of the claiming account (must be one of the claimants)',
    ),
});

// --- Account, payment and asset shapes ---

/** A Stellar account's public/secret keypair. */
export const AccountKeyPairSchema = z.object({
  publicKey: z.string(),
  secretKey: z.string(),
});

/** A single balance line as returned by Horizon for an account. */
export const BalanceSchema = z.object({
  asset_type: z.string(),
  balance: z.string(),
  asset_code: z.string().optional(),
  asset_issuer: z.string().optional(),
  limit: z.string().optional(),
});

export const PaymentParamsSchema = z.object({
  destination: z.string(),
  amount: z.string(),
  secretKey: z.string(),
  asset: z
    .object({
      code: z.string(),
      issuer: z.string(),
    })
    .optional(),
});

export const AssetParamsSchema = z.object({
  code: z.string(),
  issuerSecretKey: z.string(),
  distributorSecretKey: z.string(),
  totalSupply: z.string(),
});

export const AssetSchema = z.object({
  code: z.string(),
  issuer: z.string(),
});

export const TrustlineParamsSchema = z.object({
  asset: z.object({
    code: z.string(),
    issuer: z.string(),
  }),
  limit: z.string(),
  secretKey: z.string(),
});

// --- Horizon response shapes ---

/**
 * A transaction record from Horizon. `ledger` is coerced to 0 when Horizon
 * returns it as a lazy accessor function rather than a number.
 */
export const TransactionSchema = z.object({
  id: z.string(),
  successful: z.boolean(),
  hash: z.string(),
  ledger: z
    .union([z.number(), z.function()])
    .transform((val) => (typeof val === 'function' ? 0 : val)),
  created_at: z.string(),
  source_account: z.string(),
  fee_charged: z.string(),
  operation_count: z.number(),
});

export const LinksSchema = z.object({
  self: z.object({ href: z.string() }),
  account: z.object({ href: z.string() }),
  ledger: z.object({ href: z.string() }),
  operations: z.object({
    href: z.string(),
    templated: z.boolean().optional(),
  }),
  effects: z.object({
    href: z.string(),
    templated: z.boolean().optional(),
  }),
  precedes: z.object({ href: z.string() }),
  succeeds: z.object({ href: z.string() }),
});

/** Response shape returned by the Friendbot testnet funding faucet. */
export const FundbotResponseSchema = z.object({
  success: z.boolean(),
  transaction: z.object({
    _links: LinksSchema,
    id: z.string(),
    successful: z.boolean(),
    hash: z.string(),
    ledger: z
      .union([z.number(), z.function()])
      .transform((val) => (typeof val === 'function' ? 0 : val)),
    created_at: z.string(),
    source_account: z.string(),
    fee_charged: z
      .string()
      .or(z.number())
      .transform((val) => val.toString()),
    operation_count: z.number(),
  }),
});
