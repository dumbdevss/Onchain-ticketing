/**
 * Zod validation schemas for the Soroban MCP tool inputs.
 *
 * These schemas both validate incoming tool arguments at runtime and are
 * converted to JSON Schema (via zod-to-json-schema) to advertise each tool's
 * input shape to MCP clients.
 */
import { z } from 'zod';

/** Input schema for the `soroban_build_and_optimize` tool. */
export const BuildAndOptimizeSchema = z.object({
  contractPath: z
    .string()
    .describe('Path to the contract to build and optimize'),
});

/** Input schema for the `soroban_deploy` tool. */
export const DeploySchema = z.object({
  wasmPath: z.string().describe('Path to the WASM file to deploy'),
  secretKey: z
    .string()
    .describe('Secret key of the account to sign the transaction'),
  constructorArgs: z
    .optional(
      z.array(
        z.object({
          name: z.string().describe('Name of the argument'),
          type: z.string().describe('Type of the argument'),
          value: z.string().describe('Value of the argument'),
        }),
      ),
    )
    .describe('Constructor arguments for the contract'),
});

/** Input schema for the `soroban_retrieve_contract_methods` tool. */
export const GetContractMethodsSchema = z.object({
  contractAddress: z.string().describe('Address of the contract'),
});
