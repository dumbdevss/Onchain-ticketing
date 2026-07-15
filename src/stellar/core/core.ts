import { Platform } from '../../interfaces/common.interface.js';
import {
  CommandArgsMap,
  CommandName,
  IBuildCommandArgs,
  IContractInterfaceArgs,
  IDeployCommandArgs,
  IDirCommandArgs,
  IFindCommandArgs,
  IOptimizeCommandArgs,
} from '../../interfaces/soroban/Commands.js';
import { MessagesManager } from './messages.js';

/**
 * Core class for managing platform-specific commands
 * Extends MessagesManager to provide command execution capabilities
 */
export class Core extends MessagesManager {
  protected linuxCommands: {
    [K in keyof CommandArgsMap]: (args: CommandArgsMap[K]) => string;
  } = {} as any;

  protected windowsCommands: {
    [K in keyof CommandArgsMap]: (args: CommandArgsMap[K]) => string;
  } = {} as any;

  constructor() {
    super();

    this.buildLinuxCommands();
    this.buildWindowsCommands();
  }

  /**
   * Get the appropriate command based on the current platform
   * @param command - The command name to execute
   * @param args - The arguments for the command
   * @returns The platform-specific command string
   */
  protected getCommand<T extends CommandName>(
    command: T,
    args: CommandArgsMap[T],
  ): string {
    return this.platform === Platform.WINDOWS
      ? this.windowsCommands[command](args)
      : this.linuxCommands[command](args);
  }

  /**
   * Build Linux-specific commands
   */
  private buildLinuxCommands(): void {
    this.linuxCommands = {
      find: (args: IFindCommandArgs) =>
        `find "${args.path}" -maxdepth 1 -name "${args.pattern}"`,
      dir: (args?: IDirCommandArgs) => `ls ${args?.path || ''}`,
      build: (args: IBuildCommandArgs) =>
        `cd ${args.path} && stellar contract build`,
      optimize: (args: IOptimizeCommandArgs) =>
        `stellar contract optimize --wasm ${args.wasmPath}`,
      deploy: (args: IDeployCommandArgs) =>
        `stellar contract deploy --wasm "${args.wasmPath}" --source "${args.secretKey}" --network ${args.network || 'testnet'} ${args.constructorArgs?.length ? `-- ${args.constructorArgs}` : ''}`,
      contractInterface: (args: IContractInterfaceArgs) =>
        `stellar contract info interface --network ${args.network || 'testnet'} --id ${args.contractId}`,
    };
  }

  /**
   * Build Windows-specific commands
   */
  private buildWindowsCommands(): void {
    this.windowsCommands = {
      find: (args: IFindCommandArgs) =>
        `dir /b "${args.path}\\${args.pattern}"`,
      dir: (args?: IDirCommandArgs) => `dir ${args?.path || ''}`,
      build: (args: IBuildCommandArgs) =>
        `cd ${args.path} && stellar contract build`,
      optimize: (args: IOptimizeCommandArgs) =>
        `stellar contract optimize --wasm ${this.resolvePath(
          args.contractPath as string,
          args.wasmPath as string,
        )}`,
      deploy: (args: IDeployCommandArgs) =>
        `stellar contract deploy --wasm "${args.wasmPath}" --source "${args.secretKey}" --network ${args.network || 'testnet'} ${args.constructorArgs?.length ? `-- ${args.constructorArgs}` : ''}`,
      contractInterface: (args: IContractInterfaceArgs) =>
        `stellar contract info interface --network ${args.network || 'testnet'} --id ${args.contractId}`,
    };
  }
}
