import chalk from 'chalk';
import { JWTDecoder } from '../../utils/JWTDecoder.js';
import { JWTVerifier } from '../../utils/JWTVerifier.js';
import tokenManager from '../../core/TokenManager.js';
import { logger } from '../../utils/Logger.js';

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
      logger.info(chalk.blue(`Inspecting token for provider: ${options.provider}\n`));
    }

    if (!tokenToInspect) {
      throw new Error('No token provided. Use --provider or provide token as argument');
    }

    // Security warning for inspection mode
    logger.info(
      chalk.yellow('⚠️  SECURITY WARNING: This inspection does NOT verify token signatures'),
    );
    logger.info(
      chalk.yellow(
        '   For secure token validation, use the verification features in test commands',
      ),
    );
    logger.info('');

    // Check if token looks like a JWT
    const isJWTFormat = tokenToInspect.split('.').length === 3;

    if (!isJWTFormat) {
      logger.info(chalk.gray('Token appears to be opaque (not JWT format)'));
      logger.info(chalk.gray(`Token: ${tokenToInspect.substring(0, 50)}...`));
      return;
    }

    // Try to get some verification info (without requiring keys)
    try {
      const verifyResult = await JWTVerifier.verify(tokenToInspect, {
        algorithms: ['RS256', 'RS384', 'RS512', 'HS256', 'HS384', 'HS512'],
        ignoreExpiration: true, // Just for structure check
      });

      if (verifyResult.isOpaque) {
        logger.info(chalk.gray('Token is opaque (not JWT)'));
        return;
      } else if (verifyResult.valid) {
        logger.info(chalk.green('✓ Token signature verified (if key was available)'));
      } else {
        logger.info(chalk.yellow('⚠ Token signature could not be verified:'));
        verifyResult.errors.forEach((error) => {
          logger.info(chalk.yellow(`  - ${error}`));
        });
      }
    } catch {
      logger.info(chalk.yellow('⚠ Could not attempt signature verification'));
    }

    logger.info('');

    // Decode and display token
    const formatted = JWTDecoder.format(tokenToInspect, options?.raw);
    logger.info(formatted);

    // Additional validation if requested
    if (options?.validate) {
      logger.info('\n' + chalk.blue('VALIDATION RESULTS:'));
      const validation = JWTDecoder.validateStructure(tokenToInspect);

      if (validation.valid) {
        logger.info(chalk.green('✓ Token structure is valid'));
      } else {
        logger.info(chalk.red('✗ Token validation failed:'));
        validation.errors.forEach((error) => {
          logger.info(chalk.red(`  - ${error}`));
        });
      }
    }

    // Offer to copy decoded payload to clipboard
    const decoded = JWTDecoder.decode(tokenToInspect);
    if (decoded) {
      try {
        const { ClipboardManager } = await import('../../utils/Clipboard.js');
        logger.info('');
        const payloadString = JSON.stringify(decoded.payload, null, 2);
        await ClipboardManager.copyWithFeedback(payloadString, 'Decoded JWT payload');
      } catch {
        // Clipboard not available
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(chalk.red('✗ Failed to inspect token:'), errorMessage);
    process.exit(1);
  }
}
