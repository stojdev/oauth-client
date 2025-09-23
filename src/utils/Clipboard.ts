import clipboardy from 'clipboardy';
import chalk from 'chalk';
import { logger } from './Logger.js';

/**
 * Clipboard utility for copying tokens and data
 */
export class ClipboardManager {
  /**
   * Copy text to clipboard
   */
  static async copy(text: string): Promise<boolean> {
    try {
      await clipboardy.write(text);
      return true;
    } catch {
      // Clipboard might not be available in some environments (SSH, Docker, etc.)
      return false;
    }
  }

  /**
   * Copy with user feedback
   */
  static async copyWithFeedback(text: string, label = 'Text'): Promise<void> {
    const success = await this.copy(text);
    if (success) {
      logger.info(chalk.green(`✓ ${label} copied to clipboard`));
    } else {
      logger.info(chalk.yellow(`⚠ Could not copy to clipboard (clipboard not available)`));
      logger.info(chalk.gray('You can manually copy the text displayed above'));
    }
  }

  /**
   * Read from clipboard
   */
  static async read(): Promise<string | null> {
    try {
      return await clipboardy.read();
    } catch {
      return null;
    }
  }

  /**
   * Check if clipboard is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      // Try to read clipboard to test availability
      await clipboardy.read();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Copy token with appropriate security warning
   */
  static async copyToken(token: string, tokenType = 'Token'): Promise<void> {
    const success = await this.copy(token);
    if (success) {
      logger.info(chalk.green(`✓ ${tokenType} copied to clipboard`));
      logger.info(chalk.yellow('⚠ Security: Clear clipboard after use'));
    } else {
      logger.info(chalk.yellow(`⚠ Could not copy ${tokenType} to clipboard`));
      logger.info(chalk.gray('Select and copy the token manually from above'));
    }
  }

  /**
   * Clear clipboard (set to empty string)
   */
  static async clear(): Promise<boolean> {
    return this.copy('');
  }
}
