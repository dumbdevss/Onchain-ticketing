/**
 * Output message format for MCP responses
 */
export type OutputMessage = {
  type: 'text';
  text: string;
};

/**
 * Transaction status enumeration
 */
export enum GetTransactionStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  NOT_FOUND = 'NOT_FOUND',
}

/**
 * Platform enumeration for cross-platform support
 */
export enum Platform {
  WINDOWS = 'win32',
  LINUX = 'linux',
  MACOS = 'darwin',
}
