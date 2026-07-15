/**
 * Structured representation of a parsed Soroban contract interface.
 *
 * The ContractParser turns the raw Rust source of a contract into these
 * shapes: the contract's callable methods, its structs, and its enums
 * (including error enums).
 */

/** Field visibility as declared in the contract's Rust source. */
export enum Visibility {
  Public = 'pub',
  Private = 'private',
}

/** A callable method exposed by the contract. */
export interface IContractMethod {
  name: string;
  parameters: IContractParameter[];
  returnType: string;
}

/** A single named parameter of a contract method. */
export interface IContractParameter {
  name: string;
  type: string;
}

/** A struct type defined in the contract. */
export interface IContractStruct {
  name: string;
  fields: IContractField[];
}

/** A single field of a contract struct. */
export interface IContractField {
  name: string;
  type: string;
  visibility: Visibility;
}

/** An enum defined in the contract; `isError` marks Soroban error enums. */
export interface IContractEnum {
  name: string;
  variants: {
    name: string;
    /** Explicit discriminant value, when the variant declares one. */
    value?: number;
    /** Associated data type, for variants that carry a payload. */
    dataType?: string;
  }[];
  isError?: boolean;
}

/** The full parsed interface of a contract: methods, structs and enums. */
export interface IContractInterface {
  name: string;
  methods: IContractMethod[];
  structs: IContractStruct[];
  enums: IContractEnum[];
}
