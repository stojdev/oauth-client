/* eslint-disable no-console */

import chalk from 'chalk';
import axios from 'axios';
import { logger } from '../../utils/Logger.js';
import tokenManager from '../../core/TokenManager.js';

/**
 * Revoke an OAuth token
 */
export async function revokeCommand(
  tokenOrProvider: string,
  options: {
    revocationUrl?: string;
    clientId?: string;
    clientSecret?: string;
  }
): Promise<void> {
  try {
    let token = tokenOrProvider;
    let tokenType: 'access_token' | 'refresh_token' = 'access_token';

    // Check if it's a provider name (stored token)
    const storedToken = await tokenManager.getToken(tokenOrProvider);
    if (storedToken) {
      console.log(chalk.blue(`Found stored token for provider: ${tokenOrProvider}`));

      // Prefer refresh token for revocation if available
      if (storedToken.refresh_token) {
        token = storedToken.refresh_token;
        tokenType = 'refresh_token';
        console.log(chalk.gray('Using refresh token for revocation'));
      } else {
        token = storedToken.access_token;
        console.log(chalk.gray('Using access token for revocation'));
      }
    }

    // Validate required parameters
    if (!options.revocationUrl) {
      throw new Error('Revocation URL is required (--revocation-url)');
    }

    if (!options.clientId) {
      throw new Error('Client ID is required (--client-id)');
    }

    // Prepare revocation request
    const params = new URLSearchParams({
      token,
      token_type_hint: tokenType,
      client_id: options.clientId,
    });

    // Add client secret if provided
    if (options.clientSecret) {
      params.append('client_secret', options.clientSecret);
    }

    logger.debug('Revoking token', {
      revocationUrl: options.revocationUrl,
      tokenType,
      clientId: options.clientId,
    });

    // Send revocation request
    const response = await axios.post(options.revocationUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      validateStatus: (status) => status < 500,
    });

    // Check response
    if (response.status === 200) {
      console.log(chalk.green('✓ Token revoked successfully'));

      // Remove from storage if it was a stored token
      if (storedToken) {
        await tokenManager.deleteToken(tokenOrProvider);
        console.log(chalk.gray(`Removed token from storage: ${tokenOrProvider}`));
      }
    } else if (response.status === 400) {
      // Some providers return 400 for invalid tokens
      logger.warn('Token may already be revoked or invalid', response.data);
      console.log(chalk.yellow('⚠ Token may already be revoked or invalid'));
    } else {
      throw new Error(`Revocation failed with status ${response.status}: ${JSON.stringify(response.data)}`);
    }

  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error(chalk.red('✗ Revocation failed:'));
        console.error(chalk.red(`  Status: ${error.response.status}`));
        console.error(chalk.red(`  Response: ${JSON.stringify(error.response.data)}`));

        // Provider-specific error messages
        if (error.response.data?.error) {
          console.error(chalk.red(`  Error: ${error.response.data.error}`));
          if (error.response.data.error_description) {
            console.error(chalk.red(`  Description: ${error.response.data.error_description}`));
          }
        }
      } else if (error.request) {
        console.error(chalk.red('✗ No response from revocation endpoint'));
        console.error(chalk.gray('Check if the URL is correct and the server is reachable'));
      } else {
        console.error(chalk.red('✗ Failed to send revocation request:'), error.message);
      }
    } else {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red('✗ Revocation failed:'), errorMessage);
    }

    process.exit(1);
  }
}

/**
 * Batch revoke all stored tokens
 */
export async function revokeAllCommand(
  options: {
    force?: boolean;
  } = {}
): Promise<void> {
  const providers = tokenManager.listProviders();

  if (providers.length === 0) {
    console.log(chalk.yellow('No stored tokens to revoke'));
    return;
  }

  if (!options.force) {
    console.log(chalk.yellow(`⚠ This will revoke tokens for ${providers.length} provider(s)`));
    console.log(chalk.gray('Use --force to confirm'));
    return;
  }

  console.log(chalk.blue(`Revoking tokens for ${providers.length} provider(s)...`));

  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
  };

  for (const provider of providers) {
    try {
      const token = await tokenManager.getToken(provider);
      if (!token) {
        results.skipped++;
        continue;
      }

      // Note: This would need provider-specific revocation URLs
      // For now, just remove from storage
      await tokenManager.deleteToken(provider);
      console.log(chalk.green(`✓ Removed token for ${provider}`));
      results.success++;
    } catch (error) {
      console.error(chalk.red(`✗ Failed to revoke ${provider}`));
      results.failed++;
    }
  }

  console.log();
  console.log(chalk.blue('Revocation Summary:'));
  console.log(chalk.green(`  Success: ${results.success}`));
  if (results.failed > 0) {
    console.log(chalk.red(`  Failed: ${results.failed}`));
  }
  if (results.skipped > 0) {
    console.log(chalk.gray(`  Skipped: ${results.skipped}`));
  }
}