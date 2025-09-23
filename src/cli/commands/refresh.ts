import chalk from 'chalk';
import { RefreshTokenGrant } from '../../grants/RefreshToken.js';
import tokenManager from '../../core/TokenManager.js';
import { ConfigLoader } from '../../config/ConfigLoader.js';

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
    if (storedToken && storedToken.refresh_token) {
      refreshToken = storedToken.refresh_token;
      provider = tokenOrProvider;
      console.log(chalk.blue(`Refreshing token for provider: ${provider}`));
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

    console.log(chalk.blue('Refreshing access token...'));

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
      console.log(JSON.stringify(token, null, 2));
    } else {
      console.log(chalk.green('✓ Successfully refreshed token!'));
      console.log(chalk.gray('Token Type:'), token.token_type);
      console.log(chalk.gray('Access Token:'), token.access_token.substring(0, 40) + '...');

      if (token.expires_in) {
        console.log(chalk.gray('Expires In:'), token.expires_in, 'seconds');
      }

      if (token.scope) {
        console.log(chalk.gray('Scope:'), token.scope);
      }

      if (token.refresh_token) {
        console.log(chalk.gray('New Refresh Token:'), token.refresh_token.substring(0, 40) + '...');
      }
    }

    // Save token if requested
    if (options?.save !== false && provider) {
      await tokenManager.storeToken(provider, token);
      console.log(chalk.green(`✓ Updated token saved for '${provider}'`));
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red('✗ Failed to refresh token:'), errorMessage);
    process.exit(1);
  }
}
