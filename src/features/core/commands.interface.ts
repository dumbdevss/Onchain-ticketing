/**
 * Type definitions for the shell commands the Core layer builds and executes.
 *
 * Each command (find, dir, build, optimize, deploy, contractInterface) has a
 * dedicated argument interface. The `CommandArgsMap`, `CommandArgs` and
 * `CommandName` types tie a command name to its argument shape so command
 * construction can be type-checked.
 */

/** Arguments for locating files matching a pattern under a directory. */
export interface IFindCommandArgs {
  path: string;
  pattern: string;
}

/** Arguments for listing the contents of a directory (defaults to cwd). */
export interface IDirCommandArgs {
  path?: string;
}

/** Arguments for building a Soroban contract from its source path. */
export interface IBuildCommandArgs {
  path: string;
}

/** Arguments for optimizing a compiled WASM artifact. */
export interface IOptimizeCommandArgs {
  wasmPath: string;
  contractPath?: string;
}

/** Arguments for deploying a compiled contract to a Stellar network. */
export interface IDeployCommandArgs {
  wasmPath: string;
  secretKey: string;
  network?: string;
  /** Serialized constructor arguments passed to the contract on deploy. */
  constructorArgs?: string;
}

/** Arguments for fetching the interface (methods/types) of a deployed contract. */
export interface IContractInterfaceArgs {
  contractId: string;
  network?: string;
}

/** Maps each command name to the shape of its expected arguments. */
export type CommandArgsMap = {
  find: IFindCommandArgs;
  dir: IDirCommandArgs;
  build: IBuildCommandArgs;
  optimize: IOptimizeCommandArgs;
  deploy: IDeployCommandArgs;
  contractInterface: IContractInterfaceArgs;
};

/** Union of every possible command argument shape. */
export type CommandArgs =
  | IFindCommandArgs
  | IDirCommandArgs
  | IBuildCommandArgs
  | IOptimizeCommandArgs
  | IDeployCommandArgs
  | IContractInterfaceArgs;

/** Union of every supported command name. */
export type CommandName =
  | 'find'
  | 'dir'
  | 'build'
  | 'optimize'
  | 'deploy'
  | 'contractInterface';
