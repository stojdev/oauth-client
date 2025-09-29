import chalk from 'chalk';
import { RefreshTokenGrant } from '../../grants/RefreshToken.js';
import tokenManager from '../../core/TokenManager.js';
import { ConfigLoader } from '../../config/ConfigLoader.js';
import { logger } from '../../utils/Logger.js';

/**
 * Refresh an access token
 */
export async function refreshCommand(
  tokenOrProvider?: string,
  options?: {
    clientId?: string;
    clientSecret?: string;
    tokenUrl?: string;
    save?: boolean;
    output?: 'json' | 'text';
  },
): Promise<void> {
  try {
    let refreshToken = tokenOrProvider;
    let provider: string | undefined;

    // Check if it's a provider name
    const storedToken = await tokenManager.getToken(tokenOrProvider || '');
    if (storedToken) {
      // Check if this is a client_credentials token (which doesn't have refresh tokens)
      if (!storedToken.refresh_token) {
        throw new Error(
          `Cannot refresh token for '${tokenOrProvider}': Client credentials tokens do not have refresh tokens. ` +
            'Client credentials tokens are short-lived and should be re-requested using the original credentials when expired.',
        );
      }

      refreshToken = storedToken.refresh_token;
      provider = tokenOrProvider;
      logger.info(chalk.blue(`Refreshing token for provider: ${provider}`));
    }

    // Check if the first argument looks like a grant type instead of a token
    if (tokenOrProvider === 'client-credentials' || tokenOrProvider === 'client_credentials') {
      throw new Error(
        'Cannot refresh client_credentials tokens: Client credentials tokens do not have refresh tokens. ' +
          'Client credentials tokens are short-lived and should be re-requested using: ' +
          `oauth token client-credentials --client-id <id> --client-secret <secret> --token-url <url>`,
      );
    }

    if (!refreshToken) {
      throw new Error('No refresh token provided or found');
    }

    // Get configuration
    let clientId = options?.clientId;
    let clientSecret = options?.clientSecret;
    let tokenUrl = options?.tokenUrl;

    // Try to load from configuration if provider is known
    if (provider && (!clientId || !tokenUrl)) {
      const configLoader = new ConfigLoader();
      try {
        await configLoader.load();
        const providerConfig = configLoader.getProvider(provider);
        if (providerConfig) {
          clientId = clientId || providerConfig.clientId;
          clientSecret = clientSecret || providerConfig.clientSecret;
          tokenUrl = tokenUrl || providerConfig.tokenUrl;
        }
      } catch {
        // Ignore config load errors
      }
    }

    if (!clientId || !tokenUrl) {
      throw new Error('Client ID and token URL are required');
    }

    // Note: The RefreshTokenGrant and OAuthClient will handle the logging
    const client = new RefreshTokenGrant({
      clientId,
      clientSecret,
      tokenUrl,
      authorizationUrl: '', // Not used
      refreshToken,
    });

    const token = await client.getAccessToken();

    // Display token
    if (options?.output === 'json') {
      logger.info(JSON.stringify(token, null, 2));
    } else {
      logger.info(chalk.green('✓ Successfully refreshed token!'));
      logger.info(chalk.gray('Token Type:'), token.token_type);
      logger.info(chalk.gray('Access Token:'), token.access_token.substring(0, 40) + '...');

      if (token.expires_in) {
        logger.info(chalk.gray('Expires In:'), token.expires_in, 'seconds');
      }

      if (token.scope) {
        logger.info(chalk.gray('Scope:'), token.scope);
      }

      if (token.refresh_token) {
        logger.info(chalk.gray('New Refresh Token:'), token.refresh_token.substring(0, 40) + '...');
      }
    }

    // Save token if requested
    if (options?.save !== false && provider) {
      await tokenManager.storeToken(provider, token);
      logger.info(chalk.green(`✓ Updated token saved for '${provider}'`));
    }
  } catch (error) {
    let errorMessage = 'Unknown error';

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      // Handle OAuth error responses
      const oauthError = error as { error?: string; error_description?: string };
      if (oauthError.error) {
        errorMessage = `${oauthError.error}${oauthError.error_description ? `: ${oauthError.error_description}` : ''}`;
      } else {
        errorMessage = JSON.stringify(error);
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    logger.error(chalk.red(`✗ Failed to refresh token: ${errorMessage}`));
    process.exit(1);
  }
}
