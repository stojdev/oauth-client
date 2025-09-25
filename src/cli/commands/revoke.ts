import chalk from 'chalk';
import axios from 'axios';
import { logger } from '../../utils/Logger.js';
import tokenManager from '../../core/TokenManager.js';
import { ConfigLoader } from '../../config/ConfigLoader.js';
import { ProviderConfigManager } from '../../providers/ProviderConfig.js';
import { ClientCredentialsGrant } from '../../grants/ClientCredentials.js';

/**
 * Revoke an OAuth token
 */
export async function revokeCommand(
  tokenOrProvider: string,
  options: {
    revocationUrl?: string;
    clientId?: string;
    clientSecret?: string;
  },
): Promise<void> {
  try {
    let token = tokenOrProvider;
    let tokenType: 'access_token' | 'refresh_token' = 'access_token';

    // Check if it's a provider name (stored token)
    const storedToken = await tokenManager.getToken(tokenOrProvider);
    if (storedToken) {
      logger.info(chalk.blue(`Found stored token for provider: ${tokenOrProvider}`));

      // Prefer refresh token for revocation if available
      if (storedToken.refresh_token) {
        token = storedToken.refresh_token;
        tokenType = 'refresh_token';
        logger.info(chalk.gray('Using refresh token for revocation'));
      } else {
        token = storedToken.access_token;
        logger.info(chalk.gray('Using access token for revocation'));
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
      logger.info(chalk.green('✓ Token revoked successfully'));

      // Remove from storage if it was a stored token
      if (storedToken) {
        await tokenManager.deleteToken(tokenOrProvider);
        logger.info(chalk.gray(`Removed token from storage: ${tokenOrProvider}`));
      }
    } else if (response.status === 400) {
      // Some providers return 400 for invalid tokens
      logger.warn('Token may already be revoked or invalid', response.data);
      logger.info(chalk.yellow('⚠ Token may already be revoked or invalid'));
    } else {
      throw new Error(
        `Revocation failed with status ${response.status}: ${JSON.stringify(response.data)}`,
      );
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        logger.error(chalk.red('✗ Revocation failed:'));
        logger.error(chalk.red(`  Status: ${error.response.status}`));
        logger.error(chalk.red(`  Response: ${JSON.stringify(error.response.data)}`));

        // Provider-specific error messages
        if (error.response.data?.error) {
          logger.error(chalk.red(`  Error: ${error.response.data.error}`));
          if (error.response.data.error_description) {
            logger.error(chalk.red(`  Description: ${error.response.data.error_description}`));
          }
        }
      } else if (error.request) {
        logger.error(chalk.red('✗ No response from revocation endpoint'));
        logger.error(chalk.gray('Check if the URL is correct and the server is reachable'));
      } else {
        logger.error(chalk.red('✗ Failed to send revocation request:'), error.message);
      }
    } else {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(chalk.red('✗ Revocation failed:'), errorMessage);
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
  } = {},
): Promise<void> {
  const providers = await tokenManager.listProviders();

  if (providers.length === 0) {
    logger.info(chalk.yellow('No stored tokens to revoke'));
    return;
  }

  if (!options.force) {
    logger.info(chalk.yellow(`⚠ This will revoke tokens for ${providers.length} provider(s)`));
    logger.info(chalk.gray('Use --force to confirm'));
    return;
  }

  logger.info(chalk.blue(`Revoking tokens for ${providers.length} provider(s)...`));

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

      // Try to get provider configuration to find revocation URL
      let revocationUrl: string | undefined;
      let clientId: string | undefined;
      let clientSecret: string | undefined;

      try {
        // First, try to load from configuration files
        const configLoader = new ConfigLoader();
        const config = await configLoader.load();
        const providerConfig = config.providers.find((p) => p.id === provider);

        if (providerConfig) {
          revocationUrl = providerConfig.revocationUrl;
          clientId = providerConfig.clientId;
          clientSecret = providerConfig.clientSecret;
        }
      } catch {
        // Configuration not found, try presets
        const providerManager = new ProviderConfigManager();
        const preset = providerManager.getPreset(provider);
        if (preset) {
          revocationUrl = preset.revocationUrl;
          // Client credentials would need to come from environment or options
          clientId = process.env.OAUTH_CLIENT_ID;
          clientSecret = process.env.OAUTH_CLIENT_SECRET;
        }
      }

      // If we have a revocation URL, attempt to revoke the token properly
      if (revocationUrl && clientId) {
        try {
          // Create a minimal OAuth client just for revocation
          const client = new ClientCredentialsGrant({
            clientId,
            clientSecret: clientSecret || '',
            tokenUrl: '', // Not needed for revocation
            authorizationUrl: '', // Not needed for revocation
          });

          // Revoke refresh token first if available
          if (token.refresh_token) {
            await client.revokeToken(token.refresh_token, 'refresh_token', revocationUrl);
            logger.info(chalk.gray(`  Revoked refresh token for ${provider}`));
          }

          // Then revoke access token
          await client.revokeToken(token.access_token, 'access_token', revocationUrl);
          logger.info(chalk.gray(`  Revoked access token for ${provider}`));
        } catch (error) {
          logger.debug(`Failed to revoke token at provider: ${error}`);
          // Continue to delete from storage even if provider revocation fails
        }
      } else {
        logger.debug(`No revocation URL found for ${provider}, removing locally only`);
      }

      // Always remove from local storage
      await tokenManager.deleteToken(provider);
      logger.info(chalk.green(`✓ Revoked and removed token for ${provider}`));
      results.success++;
    } catch (error) {
      logger.error(chalk.red(`✗ Failed to revoke ${provider}: ${error}`));
      results.failed++;
    }
  }

  logger.info('');
  logger.info(chalk.blue('Revocation Summary:'));
  logger.info(chalk.green(`  Success: ${results.success}`));
  if (results.failed > 0) {
    logger.info(chalk.red(`  Failed: ${results.failed}`));
  }
  if (results.skipped > 0) {
    logger.info(chalk.gray(`  Skipped: ${results.skipped}`));
  }
}
