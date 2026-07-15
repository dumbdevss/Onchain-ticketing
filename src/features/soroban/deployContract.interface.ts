/**
 * Argument types for deploying a compiled Soroban contract.
 */

/** A single constructor argument passed to the contract at deploy time. */
export interface IConstructorArg {
  name: string;
  type: string;
  value?: string;
}

/** Arguments required to deploy a compiled WASM contract. */
export interface IDeployContractArgs {
  /** Path to the compiled `.wasm` artifact. */
  wasmPath: string;
  /** Secret key of the account that signs and pays for the deployment. */
  secretKey: string;
  /** Optional constructor arguments if the contract defines a constructor. */
  constructorArgs?: IConstructorArg[];
}
