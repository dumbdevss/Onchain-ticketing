import { Tool } from '@modelcontextprotocol/sdk/types';

import { stellarClassicTools } from './classic.js';
import { sorobanTools } from './soroban.js';

/**
 * Combined array of all Stellar MCP tools
 * Includes both Classic and Soroban tools
 */
export const tools: Tool[] = [...stellarClassicTools, ...sorobanTools];
