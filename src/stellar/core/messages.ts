import { OutputMessage } from '../../interfaces/common.interface.js';
import { FileSystemManager } from './fileSystem.js';

/**
 * MessagesManager class for formatting and managing output messages
 * Extends FileSystemManager to provide message formatting capabilities
 */
export class MessagesManager extends FileSystemManager {
  /**
   * Add a message to the messages array
   * @param messages - The array of messages to add to
   * @param message - The message text to add
   */
  protected addMessage(messages: OutputMessage[], message: string) {
    messages.push({
      type: 'text',
      text: message,
    });
  }

  /**
   * Format stdout output into an array of output messages
   * @param stdout - The stdout string to format
   * @returns Array of formatted output messages
   */
  protected formatStdoutOutput(stdout: string): OutputMessage[] {
    return stdout.split('\n').map((line) => ({
      type: 'text',
      text: line.trim(),
    }));
  }

  /**
   * Format stderr output into an array of output messages
   * @param stderr - The stderr string to format
   * @returns Array of formatted output messages
   */
  protected formatStderrOutput(stderr: string): OutputMessage[] {
    return stderr.split('\n').map((line) => ({
      type: 'text',
      text: line.trim(),
    }));
  }

  /**
   * Format error output into an array of output messages
   * @param error - The error string to format
   * @returns Array of formatted output messages
   */
  protected formatErrorOutput(error: string): OutputMessage[] {
    return error.split('\n').map((line) => ({
      type: 'text',
      text: line.trim(),
    }));
  }
}
