import { z } from 'zod';

import { GetContractMethodsSchema } from './schemas.js';

/**
 * Arguments for retrieving the methods of a deployed contract.
 *
 * Inferred directly from {@link GetContractMethodsSchema} so the runtime
 * validation schema and the compile-time type stay in sync.
 */
export type IGetContractMethodsArgs = z.infer<typeof GetContractMethodsSchema>;
