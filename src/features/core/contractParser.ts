import {
  IContractEnum,
  IContractField,
  IContractInterface,
  IContractMethod,
  IContractParameter,
  IContractStruct,
  Visibility,
} from './contract.interface.js';

/**
 * Regex patterns for parsing Soroban contract source code
 */
const REGEX_PATTERNS = {
  METHOD: /fn\s+(\w+)\s*\((.*?)\)(?:\s*->\s*(.*?))?;/,
  STRUCT: /pub struct\s+(\w+)\s*{([^}]*)}/,
  ENUM: /pub enum\s+(\w+)\s*{([^}]*)}/,
  VARIANT: /(\w+)\((.*)\)/,
  SOROBAN_PREFIX: /soroban_sdk::/g,
} as const;

/**
 * ContractParser class for parsing Soroban smart contract source code
 * Extracts contract methods, structs, and enums from Rust source files
 */
export class ContractParser {
  private contractName: string | null = null;
  private contractMethods: IContractMethod[] = [];
  private contractStructs: IContractStruct[] = [];
  private contractEnums: IContractEnum[] = [];

  private static readonly OPEN_BRACKETS = new Set(['<', '(']);
  private static readonly CLOSE_BRACKETS = new Set(['>', ')']);
  private static readonly COMMA = ',';

  /**
   * Initialize the parser with contract source code
   * @param source - The Soroban contract source code to parse
   */
  constructor(protected readonly source: string) {
    this.parseSource(source);
  }

  /**
   * Get the parsed contract name
   * @returns The contract name or null if not found
   */
  public getContractName(): string | null {
    return this.contractName;
  }

  /**
   * Get the parsed contract methods
   * @returns Array of contract methods
   */
  public getContractMethods(): IContractMethod[] {
    return this.contractMethods;
  }

  /**
   * Get the parsed contract structs
   * @returns Array of contract structs
   */
  public getContractStructs(): IContractStruct[] {
    return this.contractStructs;
  }

  /**
   * Get the parsed contract enums
   * @returns Array of contract enums
   */
  public getContractEnums(): IContractEnum[] {
    return this.contractEnums;
  }

  /**
   * Get the complete contract interface
   * @returns The contract interface with name, methods, structs, and enums
   */
  public getContractInterface(): IContractInterface {
    return {
      name: this.contractName as string,
      methods: this.contractMethods,
      structs: this.contractStructs,
      enums: this.contractEnums,
    };
  }

  /**
   * Parse the source code and extract contract components
   * @param source - The source code to parse
   */
  protected parseSource(source: string) {
    const lines = source.split('\n').map((line) => line.trim());

    this.contractName = this.parseContractName(lines);
    this.contractMethods = this.parseContractMethods(lines);
    this.contractStructs = this.parseContractStructs(lines);
    this.contractEnums = this.parseContractEnums(lines);
  }

  /**
   * Derive the contract name from the `pub trait <Name> {` declaration,
   * falling back to a default when no trait is present.
   */
  private parseContractName(line: string[]): string {
    const contractNameLine = line.find((line) => line.startsWith('pub trait'));

    if (contractNameLine) {
      const contractName = contractNameLine
        .split('pub trait ')[1]
        .split(' {')[0];

      return contractName;
    }

    return 'DefaultContractName';
  }

  private parseContractMethods(lines: string[]): IContractMethod[] {
    return this.collectLines(lines, 'fn', ';', (methodLines) =>
      this.parseMethodLines(methodLines),
    );
  }

  private parseContractStructs(lines: string[]): IContractStruct[] {
    return this.collectLines(lines, 'pub struct', '}', (structLines) =>
      this.parseStructLines(structLines),
    );
  }

  private parseContractEnums(lines: string[]): IContractEnum[] {
    return this.collectLines(lines, 'pub enum', '}', (enumLines) =>
      this.parseEnumLines(enumLines),
    );
  }

  private parseMethodLines(lines: string[]): IContractMethod | null {
    const methodText = lines.join(' ');
    const methodMatch = methodText.match(REGEX_PATTERNS.METHOD);

    if (!methodMatch) {
      return null;
    }

    const [, name, paramsText, returnType] = methodMatch;
    const parameters = this.parseParameters(paramsText);

    return {
      name,
      parameters,
      // Strip the `soroban_sdk::` qualifier, drop empty segments, and normalize
      // spacing; default to `()` (unit) when the method declares no return type.
      returnType:
        returnType
          ?.split(REGEX_PATTERNS.SOROBAN_PREFIX)
          ?.join('')
          ?.split(', ')
          ?.filter((e) => e?.trim())
          ?.map((e) => e?.trim())
          ?.join(', ') || '()',
    };
  }

  private parseParameters(paramsText: string): IContractParameter[] {
    return this.parseCommaSeparatedItems(paramsText, (paramText) => {
      const [name, type] = paramText.split(':').map((s) => s.trim());
      // Skip the implicit `env: Env` parameter — it is not part of the public ABI.
      if (name && type && type !== 'Env') {
        return { name, type };
      }
      return null;
    });
  }

  private parseStructLines(lines: string[]): IContractStruct | null {
    const structText = lines.join(' ');
    const structMatch = structText.match(REGEX_PATTERNS.STRUCT);

    if (!structMatch) {
      return null;
    }

    const [, name, fieldsText] = structMatch;
    const fields = this.parseStructFields(fieldsText);

    return {
      name,
      fields,
    };
  }

  private parseStructFields(fieldsText: string): IContractField[] {
    return this.parseCommaSeparatedItems(fieldsText, (fieldText) => {
      const [visibility, name, type] = this.parseField(fieldText);
      if (name && type) {
        return { name, type, visibility };
      }
      return null;
    });
  }

  /**
   * Split a struct field into its visibility, name and type. The visibility
   * keyword (`pub`/`private`) is stripped from the name and returned separately.
   */
  private parseField(fieldText: string): [Visibility, string, string] {
    const [visibilityAndName, type] = fieldText.split(':').map((s) => s.trim());

    const visibility: Visibility = visibilityAndName.startsWith('pub')
      ? Visibility.Public
      : Visibility.Private;

    const name = visibilityAndName.replace(/^(pub|private)\s+/, '');

    return [visibility, name, type];
  }

  private parseEnumLines(lines: string[]): IContractEnum | null {
    const enumText = lines.join(' ');
    const enumMatch = enumText.match(REGEX_PATTERNS.ENUM);

    if (!enumMatch) {
      return null;
    }

    const [, name, variantsText] = enumMatch;
    const variants = this.parseEnumVariants(variantsText);
    // Enums annotated with #[contracterror] represent contract error types.
    const isError =
      enumText.includes('#[contracterror]') ||
      enumText.includes('#[soroban_sdk::contracterror');

    return { name, variants, isError };
  }

  private parseEnumVariants(
    variantsText: string,
  ): { name: string; value?: number; dataType?: string }[] {
    return this.parseCommaSeparatedItems(variantsText, (variantText) => {
      if (!variantText) {
        return null;
      }

      // `Name = 1` — explicit discriminant value (common for error enums).
      if (variantText.includes('=')) {
        const [name, value] = variantText.split('=').map((s) => s.trim());
        return {
          name,
          value: parseInt(value, 10),
        };
      }

      // `Name(Type)` — tuple variant carrying an associated data type.
      const match = variantText.match(REGEX_PATTERNS.VARIANT);
      if (match) {
        const [, name, dataType] = match;
        const cleanDataType = dataType
          .replace(REGEX_PATTERNS.SOROBAN_PREFIX, '')
          .trim();

        return {
          name,
          dataType: cleanDataType,
        };
      }

      return {
        name: variantText.trim(),
      };
    });
  }

  /**
   * Scan `lines` and group each run that begins with `startPattern` and ends
   * with `endPattern` into a block, passing each block to `parseLines`. Acts as
   * a small state machine: `collectedLines` holds the block currently being
   * accumulated (null when outside any block). A new start pattern flushes the
   * in-progress block first, which handles single-line declarations (e.g. a
   * method ending in `;` on the same line as the next `fn`).
   */
  private collectLines<T>(
    lines: string[],
    startPattern: string,
    endPattern: string,
    parseLines: (lines: string[]) => T | null,
  ): T[] {
    const items: T[] = [];
    let collectedLines: string[] | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith(startPattern)) {
        if (collectedLines) {
          const item = parseLines(collectedLines);
          if (item) {
            items.push(item);
          }
          collectedLines = [];
        }
        collectedLines = [line];
      } else if (collectedLines) {
        collectedLines.push(line);
        if (trimmed === endPattern) {
          const item = parseLines(collectedLines);
          if (item) {
            items.push(item);
          }
          collectedLines = null;
        }
      }
    }

    if (collectedLines) {
      const item = parseLines(collectedLines);
      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * Split `text` on top-level commas and parse each item with `parseItem`.
   * Tracks bracket depth so commas inside generics or tuples (e.g.
   * `Map<K, V>`, `(A, B)`) are not treated as item separators.
   */
  private parseCommaSeparatedItems<T>(
    text: string,
    parseItem: (item: string) => T | null,
  ): T[] {
    const cleanText = text.replace(REGEX_PATTERNS.SOROBAN_PREFIX, '').trim();
    if (!cleanText) {
      return [];
    }

    const items: T[] = [];
    let currentItem = '';
    let bracketCount = 0;

    for (const char of cleanText) {
      if (ContractParser.OPEN_BRACKETS.has(char)) bracketCount++;
      else if (ContractParser.CLOSE_BRACKETS.has(char)) bracketCount--;

      // Only split on commas that are outside any bracket pair.
      if (char === ContractParser.COMMA && bracketCount === 0) {
        this.pushParsedItem(currentItem, parseItem, items);
        currentItem = '';
      } else {
        currentItem += char;
      }
    }

    this.pushParsedItem(currentItem, parseItem, items);
    return items;
  }

  private pushParsedItem<T>(
    raw: string,
    parseItem: (item: string) => T | null,
    items: T[],
  ) {
    const trimmed = raw.trim();

    if (!trimmed) return;

    const item = parseItem(trimmed);

    if (item) {
      items.push(item);
    }
  }
}
