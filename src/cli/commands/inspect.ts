import chalk from 'chalk';
import { JWTDecoder } from '../../utils/JWTDecoder.js';
import tokenManager from '../../core/TokenManager.js';

/**
 * Inspect and decode a token
 */
export async function inspectCommand(
  token?: string,
  options?: {
    provider?: string;
    raw?: boolean;
    validate?: boolean;
  },
): Promise<void> {
  try {
    let tokenToInspect = token;

    // If no token provided, try to get from storage
    if (!tokenToInspect && options?.provider) {
      const storedToken = await tokenManager.getToken(options.provider);
      if (!storedToken) {
        throw new Error(`No token found for provider '${options.provider}'`);
      }
      tokenToInspect = storedToken.access_token;
      console.log(chalk.blue(`Inspecting token for provider: ${options.provider}\n`));
    }

    if (!tokenToInspect) {
      throw new Error('No token provided. Use --provider or provide token as argument');
    }

    // Decode and display token
    const formatted = JWTDecoder.format(tokenToInspect, options?.raw);
    console.log(formatted);

    // Additional validation if requested
    if (options?.validate) {
      console.log('\n' + chalk.blue('VALIDATION RESULTS:'));
      const validation = JWTDecoder.validateStructure(tokenToInspect);

      if (validation.valid) {
        console.log(chalk.green('✓ Token structure is valid'));
      } else {
        console.log(chalk.red('✗ Token validation failed:'));
        validation.errors.forEach((error) => {
          console.log(chalk.red(`  - ${error}`));
        });
      }
    }

    // Offer to copy decoded payload to clipboard
    const decoded = JWTDecoder.decode(tokenToInspect);
    if (decoded) {
      try {
        const { ClipboardManager } = await import('../../utils/Clipboard.js');
        console.log();
        const payloadString = JSON.stringify(decoded.payload, null, 2);
        await ClipboardManager.copyWithFeedback(payloadString, 'Decoded JWT payload');
      } catch {
        // Clipboard not available
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red('✗ Failed to inspect token:'), errorMessage);
    process.exit(1);
  }
}
