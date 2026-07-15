import { Tool } from '@modelcontextprotocol/sdk/types';
import zodToJsonSchema from 'zod-to-json-schema';

import * as schemas from '../features/soroban/schemas.js';

/**
 * Array of Soroban tools for the MCP server
 * These tools provide functionality for building, deploying, and inspecting Soroban smart contracts
 */
export const sorobanTools: Tool[] = [
  {
    name: 'soroban_build_and_optimize',
    description: 'Build and optimize a Soroban smart contract from source code',
    inputSchema: zodToJsonSchema(schemas.BuildAndOptimizeSchema) as {
      type: 'object';
      properties: Record<string, unknown>;
    },
  },
  {
    name: 'soroban_deploy',
    description: 'Deploy a compiled Soroban contract to the Stellar network',
    inputSchema: zodToJsonSchema(schemas.DeploySchema) as {
      type: 'object';
      properties: Record<string, unknown>;
    },
  },
  {
    name: 'soroban_retrieve_contract_methods',
    description:
      'Retrieve the methods and interface of a deployed Soroban contract',
    inputSchema: zodToJsonSchema(schemas.GetContractMethodsSchema) as {
      type: 'object';
      properties: Record<string, unknown>;
    },
  },
];
