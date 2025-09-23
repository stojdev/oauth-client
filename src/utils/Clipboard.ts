import clipboardy from 'clipboardy';
import chalk from 'chalk';

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
    } catch (error) {
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
      console.log(chalk.green(`✓ ${label} copied to clipboard`));
    } else {
      console.log(chalk.yellow(`⚠ Could not copy to clipboard (clipboard not available)`));
      console.log(chalk.gray('You can manually copy the text displayed above'));
    }
  }

  /**
   * Read from clipboard
   */
  static async read(): Promise<string | null> {
    try {
      return await clipboardy.read();
    } catch (error) {
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
      console.log(chalk.green(`✓ ${tokenType} copied to clipboard`));
      console.log(chalk.yellow('⚠ Security: Clear clipboard after use'));
    } else {
      console.log(chalk.yellow(`⚠ Could not copy ${tokenType} to clipboard`));
      console.log(chalk.gray('Select and copy the token manually from above'));
    }
  }

  /**
   * Clear clipboard (set to empty string)
   */
  static async clear(): Promise<boolean> {
    return this.copy('');
  }
}