import { OAuthClient } from '../core/OAuthClient.js';
import { ErrorHandler, OAuthClientError } from '../core/ErrorHandler.js';
import { CallbackServer } from '../utils/CallbackServer.js';
// State generation now handled by StateManager for enhanced security
import stateManager from '../utils/StateManager.js';
import { logger } from '../utils/Logger.js';
import type { OAuthConfig, TokenResponse } from '../types/index.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ImplicitConfig extends OAuthConfig {
  authorizationUrl: string;
  redirectUri: string;
  openBrowser?: boolean;
  customAuthParams?: Record<string, string>;
}

/**
 * Implicit Grant Implementation (DEPRECATED)
 *
 * WARNING: The Implicit Grant is DEPRECATED and should not be used in production.
 * It has been removed from OAuth 2.1 due to security vulnerabilities.
 *
 * This implementation is provided only for:
 * - Testing legacy OAuth 2.0 providers
 * - Detecting providers that still support this insecure flow
 * - Migration assessment and compliance testing
 *
 * Use Authorization Code with PKCE instead for all production applications.
 *
 * Security issues with Implicit Grant:
 * - Access tokens exposed in URL fragments
 * - No refresh token support
 * - Tokens can leak through browser history, referrer headers
 * - Vulnerable to token injection attacks
 * - No client authentication possible
 *
 * @deprecated Use AuthorizationCodeGrant with PKCE instead
 */
export class ImplicitGrant extends OAuthClient {
  private callbackServer?: CallbackServer;
  protected config: ImplicitConfig;
  private hasShownWarning = false;

  constructor(config: ImplicitConfig) {
    super(config);
    this.config = config;

    if (!config.authorizationUrl) {
      throw new Error('Authorization URL is required for Implicit grant');
    }

    if (!config.redirectUri) {
      throw new Error('Redirect URI is required for Implicit grant');
    }

    this.showDeprecationWarning();
  }

  /**
   * Show deprecation warning
   */
  private showDeprecationWarning(): void {
    if (!this.hasShownWarning) {
      logger.warn('════════════════════════════════════════════════════════════════');
      logger.warn('                    ⚠️  SECURITY WARNING ⚠️');
      logger.warn('════════════════════════════════════════════════════════════════');
      logger.warn('The Implicit Grant is DEPRECATED and INSECURE!');
      logger.warn('');
      logger.warn('This flow has been removed from OAuth 2.1 due to:');
      logger.warn('  • Access tokens exposed in URL fragments');
      logger.warn('  • No refresh token support');
      logger.warn('  • Vulnerable to token leakage and injection');
      logger.warn('');
      logger.warn('This implementation should only be used for:');
      logger.warn('  • Testing legacy systems');
      logger.warn('  • Security audits and compliance checking');
      logger.warn('  • Migration planning');
      logger.warn('');
      logger.warn('For production use, implement Authorization Code with PKCE instead.');
      logger.warn('════════════════════════════════════════════════════════════════');
      this.hasShownWarning = true;
    }
  }

  /**
   * Build authorization URL for implicit flow
   */
  private buildAuthorizationUrl(): string {
    const url = new URL(this.config.authorizationUrl);

    // Generate and store state for CSRF protection (MANDATORY per RFC 9700)
    const state = stateManager.create({ grantType: 'implicit' });

    // Implicit flow uses response_type=token
    url.searchParams.set('client_id', this.config.clientId);
    url.searchParams.set('redirect_uri', this.config.redirectUri);
    url.searchParams.set('response_type', 'token'); // Key difference from auth code
    url.searchParams.set('state', state);

    if (this.config.scope) {
      url.searchParams.set('scope', this.config.scope.toString());
    }

    // Custom parameters
    if (this.config.customAuthParams) {
      for (const [key, value] of Object.entries(this.config.customAuthParams)) {
        url.searchParams.set(key, value);
      }
    }

    return url.toString();
  }

  /**
   * Open browser for user authorization
   */
  private async openBrowser(url: string): Promise<void> {
    const platform = process.platform;
    let command: string;

    if (platform === 'darwin') {
      command = `open "${url}"`;
    } else if (platform === 'win32') {
      command = `start "${url}"`;
    } else {
      command = `xdg-open "${url}"`;
    }

    try {
      await execAsync(command);
      logger.info('Browser opened for authorization');
    } catch {
      logger.warn('Could not open browser automatically');
      logger.info(`Please open this URL in your browser: ${url}`);
    }
  }

  /**
   * Parse token from URL fragment
   */
  private parseTokenFromFragment(fragment: string): TokenResponse {
    const params = new URLSearchParams(fragment);

    const accessToken = params.get('access_token');
    const tokenType = params.get('token_type') || 'Bearer';
    const expiresIn = params.get('expires_in');
    const scope = params.get('scope');
    const state = params.get('state');

    if (!accessToken) {
      throw new OAuthClientError('No access token in response');
    }

    // MANDATORY state verification for CSRF protection (RFC 9700 compliance)
    if (!state) {
      throw new OAuthClientError(
        'Missing state parameter in authorization callback. ' +
          'This is a security violation - state parameter is mandatory for CSRF protection, ' +
          'especially critical in the deprecated Implicit flow.',
      );
    }

    // Verify state matches and is valid
    const stateData = stateManager.verify(state);
    if (!stateData) {
      throw new OAuthClientError(
        'Invalid or expired state parameter - possible CSRF attack. ' +
          'State must be present, valid, and match the original request. ' +
          'This is critical in Implicit flow due to token exposure in URL fragments.',
      );
    }

    logger.warn('Token received via URL fragment (INSECURE)');
    logger.info('Consider migrating to Authorization Code with PKCE');

    return {
      access_token: accessToken,
      token_type: tokenType,
      expires_in: expiresIn ? parseInt(expiresIn, 10) : undefined,
      scope: scope || undefined,
      // Implicit flow never returns refresh tokens
      refresh_token: undefined,
    };
  }

  /**
   * Start the implicit flow and get access token
   *
   * @deprecated This method uses the deprecated Implicit flow
   */
  async getAccessToken(): Promise<TokenResponse> {
    return ErrorHandler.wrap(async () => {
      this.showDeprecationWarning();

      // Build authorization URL
      const authUrl = this.buildAuthorizationUrl();

      logger.debug('Starting implicit flow (DEPRECATED)...');
      logger.debug(`Authorization URL: ${authUrl}`);

      // Set up callback server
      this.callbackServer = new CallbackServer(this.config.redirectUri, true); // true = handle fragment

      // Open browser if configured
      if (this.config.openBrowser !== false) {
        await this.openBrowser(authUrl);
      } else {
        logger.info(`Please visit this URL to authorize: ${authUrl}`);
      }

      // Wait for callback
      logger.info('Waiting for authorization callback with token in fragment...');
      const callbackResult = await this.callbackServer.waitForCallback();

      // Check for errors
      if (callbackResult.error) {
        throw new OAuthClientError({
          error: callbackResult.error,
          error_description: callbackResult.error_description,
        });
      }

      // In implicit flow, the token comes in the fragment
      if (!callbackResult.fragment) {
        throw new OAuthClientError('No fragment received in callback');
      }

      logger.info('Token received in URL fragment');

      // Parse and return token
      const tokenResponse = this.parseTokenFromFragment(callbackResult.fragment);

      // Log security recommendation
      logger.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.warn('Token obtained via Implicit Grant - NOT RECOMMENDED FOR PRODUCTION');
      logger.warn('This provider supports the deprecated Implicit flow, which indicates:');
      logger.warn('  • The provider may not be following OAuth 2.1 standards');
      logger.warn('  • Security best practices are not being enforced');
      logger.warn('Consider requesting the provider to disable Implicit Grant support');
      logger.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      return tokenResponse;
    });
  }

  /**
   * Refresh token - NOT SUPPORTED in Implicit flow
   */
  async refreshToken(_refreshToken: string): Promise<TokenResponse> {
    throw new OAuthClientError(
      'Refresh tokens are not supported in Implicit Grant. ' +
        'This is one of the security limitations of this deprecated flow. ' +
        'Use Authorization Code with PKCE instead.',
    );
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.callbackServer) {
      this.callbackServer.stop();
      this.callbackServer = undefined;
    }
  }
}
