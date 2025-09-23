import chalk from 'chalk';
import { ClientCredentialsGrant } from '../../grants/ClientCredentials.js';
import { AuthorizationCodeGrant } from '../../grants/AuthorizationCode.js';
import { DeviceAuthorizationGrant } from '../../grants/DeviceAuthorization.js';
import { ResourceOwnerPasswordGrant } from '../../grants/ResourceOwnerPassword.js';
import { RefreshTokenGrant } from '../../grants/RefreshToken.js';
import { ImplicitGrant } from '../../grants/Implicit.js';
import tokenManager from '../../core/TokenManager.js';
import { logger } from '../../utils/Logger.js';
import type { TokenResponse } from '../../types/index.js';

/**
 * Request token using specific grant type
 */
export async function tokenCommand(
  grantType: string,
  options: {
    clientId?: string;
    clientSecret?: string;
    tokenUrl?: string;
    authorizationUrl?: string;
    deviceAuthorizationUrl?: string;
    redirectUri?: string;
    username?: string;
    password?: string;
    refreshToken?: string;
    scope?: string;
    code?: string;
    usePkce?: boolean;
    save?: string;
    output?: 'json' | 'text';
  },
): Promise<void> {
  try {
    logger.info(chalk.blue(`Requesting token using ${grantType} grant...`));

    let token: TokenResponse;

    switch (grantType) {
      case 'client_credentials':
      case 'client-credentials': {
        if (!options.clientId || !options.clientSecret || !options.tokenUrl) {
          throw new Error('Client ID, client secret, and token URL are required');
        }

        const client = new ClientCredentialsGrant({
          clientId: options.clientId,
          clientSecret: options.clientSecret,
          tokenUrl: options.tokenUrl,
          authorizationUrl: '', // Not used
          scope: options.scope,
        });
        token = await client.getAccessToken();
        break;
      }

      case 'authorization_code':
      case 'authorization-code':
      case 'auth-code': {
        if (!options.clientId || !options.authorizationUrl || !options.tokenUrl) {
          throw new Error('Client ID, authorization URL, and token URL are required');
        }

        const client = new AuthorizationCodeGrant({
          clientId: options.clientId,
          clientSecret: options.clientSecret,
          tokenUrl: options.tokenUrl,
          authorizationUrl: options.authorizationUrl,
          redirectUri: options.redirectUri || 'http://localhost:8080/callback',
          scope: options.scope,
          usePKCE: options.usePkce !== false,
        });

        if (options.code) {
          // Exchange existing code
          const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code: options.code,
            redirect_uri: options.redirectUri || 'http://localhost:8080/callback',
            client_id: options.clientId,
          });
          if (options.clientSecret) {
            params.append('client_secret', options.clientSecret);
          }
          token = await client['exchangeToken'](params);
        } else {
          // Full flow
          token = await client.getAccessToken();
        }
        break;
      }

      case 'device_code':
      case 'device-code':
      case 'device': {
        if (!options.clientId || !options.deviceAuthorizationUrl || !options.tokenUrl) {
          throw new Error('Client ID, device authorization URL, and token URL are required');
        }

        const client = new DeviceAuthorizationGrant({
          clientId: options.clientId,
          clientSecret: options.clientSecret,
          tokenUrl: options.tokenUrl,
          authorizationUrl: '', // Not used
          deviceAuthorizationUrl: options.deviceAuthorizationUrl,
          scope: options.scope,
        });
        token = await client.getAccessToken();
        break;
      }

      case 'password':
      case 'resource-owner-password': {
        if (!options.clientId || !options.tokenUrl || !options.username || !options.password) {
          throw new Error('Client ID, token URL, username, and password are required');
        }

        const client = new ResourceOwnerPasswordGrant({
          clientId: options.clientId,
          clientSecret: options.clientSecret,
          tokenUrl: options.tokenUrl,
          authorizationUrl: '', // Not used
          username: options.username,
          password: options.password,
          scope: options.scope,
        });
        token = await client.getAccessToken();
        break;
      }

      case 'refresh_token':
      case 'refresh-token':
      case 'refresh': {
        if (!options.clientId || !options.tokenUrl || !options.refreshToken) {
          throw new Error('Client ID, token URL, and refresh token are required');
        }

        const client = new RefreshTokenGrant({
          clientId: options.clientId,
          clientSecret: options.clientSecret,
          tokenUrl: options.tokenUrl,
          authorizationUrl: '', // Not used
          refreshToken: options.refreshToken,
          scope: options.scope,
        });
        token = await client.getAccessToken();
        break;
      }

      case 'implicit': {
        if (!options.clientId || !options.authorizationUrl) {
          throw new Error('Client ID and authorization URL are required');
        }

        const client = new ImplicitGrant({
          clientId: options.clientId,
          tokenUrl: '', // Not used in implicit
          authorizationUrl: options.authorizationUrl,
          redirectUri: options.redirectUri || 'http://localhost:8080/callback',
          scope: options.scope,
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
      logger.info(chalk.green('✓ Successfully obtained token!'));
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
    if (options.save) {
      await tokenManager.storeToken(options.save, token);
      logger.info(chalk.green(`✓ Token saved as '${options.save}'`));
    }
  } catch (error) {
    logger.error('Token request failed', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(chalk.red('✗ Token request failed:'), errorMessage);
    process.exit(1);
  }
}
