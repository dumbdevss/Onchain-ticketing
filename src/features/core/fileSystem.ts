import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * FileSystemManager class for cross-platform file system operations
 * Provides a unified interface for file system operations across different platforms
 */
export class FileSystemManager {
  protected platform: NodeJS.Platform;

  constructor() {
    this.platform = this.getPlatform();
  }

  /**
   * Read a file synchronously
   * @param filePath - The path to the file to read
   * @param encoding - The encoding to use (default: 'binary')
   * @returns The file contents
   */
  protected readFile<T>(filePath: string, encoding: BufferEncoding = 'binary') {
    return fs.readFileSync(filePath, encoding) as T;
  }

  /**
   * Read a directory synchronously
   * @param dirPath - The path to the directory to read
   * @returns Array of file/directory names
   */
  protected readDir(dirPath: string): string[] {
    return fs.readdirSync(dirPath);
  }

  /**
   * Resolve a path to an absolute path
   * @param args - Path segments to resolve
   * @returns Resolved absolute path
   */
  protected resolvePath(...args: string[]): string {
    return path.resolve(...args);
  }

  /**
   * Join path segments
   * @param args - Path segments to join
   * @returns Joined path
   */
  protected joinPath(...args: string[]): string {
    return path.join(...args);
  }

  /**
   * Write content to a file synchronously
   * @param filePath - The path to the file to write
   * @param content - The content to write
   */
  protected writeFile(filePath: string, content: string): void {
    fs.writeFileSync(filePath, content);
  }

  /**
   * Check if a file or directory exists
   * @param filePath - The path to check
   * @returns True if the path exists
   */
  protected exists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /**
   * Check if a path is a directory
   * @param filePath - The path to check
   * @returns True if the path is a directory
   */
  protected isDirectory(filePath: string): boolean {
    try {
      return fs.statSync(filePath).isDirectory();
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if a path is a file
   * @param filePath - The path to check
   * @returns True if the path is a file
   */
  protected isFile(filePath: string): boolean {
    return fs.statSync(filePath).isFile();
  }

  /**
   * Get the current platform
   * @returns The platform identifier
   */
  protected getPlatform(): NodeJS.Platform {
    return os.platform();
  }

  /**
   * Get the base name of a path
   * @param targetPath - The path to get the base name from
   * @param suffix - Optional suffix to remove from the base name
   * @returns The base name of the path
   */
  protected getBasePath(targetPath: string, suffix?: string): string {
    return path.basename(targetPath, suffix);
  }

  /**
   * Get the directory name of a path
   * @param targetPath - The path to get the directory name from
   * @returns The directory name of the path
   */
  protected getDirname(targetPath: string): string {
    return path.dirname(targetPath);
  }
}
