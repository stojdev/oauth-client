import chalk from 'chalk';
import { AuthorizationCodeGrant } from '../../grants/AuthorizationCode.js';
import { ClientCredentialsGrant } from '../../grants/ClientCredentials.js';
import { DeviceAuthorizationGrant } from '../../grants/DeviceAuthorization.js';
import { ResourceOwnerPasswordGrant } from '../../grants/ResourceOwnerPassword.js';
import { ImplicitGrant } from '../../grants/Implicit.js';
import { ConfigLoader } from '../../config/ConfigLoader.js';
import { ProviderConfigManager } from '../../providers/ProviderConfig.js';
import tokenManager from '../../core/TokenManager.js';
import { logger } from '../../utils/Logger.js';
import type { OAuthConfig, TokenResponse } from '../../types/index.js';

/**
 * Authenticate with a provider using configuration
 */
export async function authCommand(
  provider: string,
  options: {
    grant?: string;
    config?: string;
    clientId?: string;
    clientSecret?: string;
    username?: string;
    password?: string;
    scope?: string;
    save?: boolean;
    output?: 'json' | 'text';
  },
): Promise<void> {
  try {
    // Load configuration
    const configLoader = new ConfigLoader();
    const providerManager = new ProviderConfigManager();

    let config: OAuthConfig;

    // Try to load from configuration file first
    if (options.config) {
      await configLoader.load({ configFile: options.config });
      const providerConfig = configLoader.getProvider(provider);
      if (!providerConfig) {
        throw new Error(`Provider '${provider}' not found in configuration`);
      }
      config = providerConfig as OAuthConfig;
    } else {
      // Try to use provider presets
      const preset = providerManager.getPreset(provider);
      if (preset) {
        if (!options.clientId) {
          throw new Error(`Client ID required for provider '${provider}'`);
        }
        config = providerManager.createFromPreset(provider, {
          clientId: options.clientId,
          clientSecret: options.clientSecret,
          redirectUri: 'http://localhost:8080/callback',
        }) as OAuthConfig;
      } else {
        // Manual configuration
        if (!options.clientId) {
          throw new Error('Client ID is required');
        }
        config = {
          clientId: options.clientId,
          clientSecret: options.clientSecret,
          tokenUrl: '', // Will be set based on grant type
          authorizationUrl: '',
          scope: options.scope,
        } as OAuthConfig;
      }
    }

    // Override with CLI options
    if (options.clientId) {
      config.clientId = options.clientId;
    }
    if (options.clientSecret) {
      config.clientSecret = options.clientSecret;
    }
    if (options.scope) {
      config.scope = options.scope;
    }

    // Determine grant type
    const grantType = options.grant || determineGrantType(config);

    logger.info(chalk.blue(`Authenticating with ${provider} using ${grantType} grant...`));

    let token: TokenResponse;

    switch (grantType) {
      case 'authorization_code': {
        const client = new AuthorizationCodeGrant({
          ...config,
          authorizationUrl: config.authorizationUrl || '',
          redirectUri: 'http://localhost:8080/callback',
        });
        token = await client.getAccessToken();
        break;
      }

      case 'client_credentials': {
        const client = new ClientCredentialsGrant(config);
        token = await client.getAccessToken();
        break;
      }

      case 'device_code': {
        const client = new DeviceAuthorizationGrant({
          ...config,
          deviceAuthorizationUrl:
            ((config as unknown as Record<string, unknown>).deviceAuthorizationUrl as string) || '',
        });
        token = await client.getAccessToken();
        break;
      }

      case 'password': {
        if (!options.username || !options.password) {
          throw new Error('Username and password required for password grant');
        }
        const client = new ResourceOwnerPasswordGrant({
          ...config,
          username: options.username,
          password: options.password,
        });
        token = await client.getAccessToken();
        break;
      }

      case 'implicit': {
        const client = new ImplicitGrant({
          ...config,
          authorizationUrl: config.authorizationUrl || '',
          redirectUri: 'http://localhost:8080/callback',
        });
        token = await client.getAccessToken();
        break;
      }

      default:
        throw new Error(`Unsupported grant type: ${grantType}`);
    }

    // Display token
    if (options.output === 'json') {
      logger.info(JSON.stringify(token, null, 2));
    } else {
      logger.info(chalk.green('✓ Successfully obtained access token!'));
      logger.info(chalk.gray('Token Type:'), token.token_type);
      logger.info(chalk.gray('Access Token:'), token.access_token.substring(0, 40) + '...');

      if (token.expires_in) {
        logger.info(chalk.gray('Expires In:'), token.expires_in, 'seconds');
      }

      if (token.scope) {
        logger.info(chalk.gray('Scope:'), token.scope);
      }

      if (token.refresh_token) {
        logger.info(chalk.gray('Refresh Token:'), token.refresh_token.substring(0, 40) + '...');
      }

      // Offer to copy token to clipboard
      try {
        const { ClipboardManager } = await import('../../utils/Clipboard.js');
        logger.info('');
        await ClipboardManager.copyToken(token.access_token, 'Access token');
      } catch {
        // Clipboard not available
      }
    }

    // Save token if requested
    if (options.save !== false) {
      await tokenManager.storeToken(provider, token);
      logger.info(chalk.green(`✓ Token saved for provider '${provider}'`));
    }
  } catch (error) {
    logger.error('Authentication failed', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(chalk.red('✗ Authentication failed:'), errorMessage);
    process.exit(1);
  }
}

/**
 * Determine the best grant type based on configuration
 */
function determineGrantType(config: OAuthConfig): string {
  // If client secret is present, prefer client_credentials for machine-to-machine
  if (config.clientSecret && !config.authorizationUrl) {
    return 'client_credentials';
  }

  // If authorization URL is present, use authorization_code
  if (config.authorizationUrl) {
    return 'authorization_code';
  }

  // Default to client_credentials
  return 'client_credentials';
}
