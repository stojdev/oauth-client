import { OAuthClient } from '../core/OAuthClient.js';
import { ErrorHandler, OAuthClientError } from '../core/ErrorHandler.js';
import { CallbackServer } from '../utils/CallbackServer.js';
import { generatePKCEChallenge } from '../utils/PKCEGenerator.js';
import stateManager from '../utils/StateManager.js';
import { logger } from '../utils/Logger.js';
import type { OAuthConfig, TokenResponse, PKCEChallenge } from '../types/index.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface AuthorizationCodeConfig extends OAuthConfig {
  authorizationUrl: string;
  redirectUri: string;
  usePKCE?: boolean;
  openBrowser?: boolean;
  customAuthParams?: Record<string, string>;
}

/**
 * Authorization Code Grant Implementation
 * The most secure and recommended OAuth 2.0 flow
 */
export class AuthorizationCodeGrant extends OAuthClient {
  private callbackServer?: CallbackServer;
  private pkce?: PKCEChallenge;
  protected config: AuthorizationCodeConfig;

  constructor(config: AuthorizationCodeConfig) {
    super(config);
    this.config = config;

    if (!config.authorizationUrl) {
      throw new Error('Authorization URL is required for Authorization Code grant');
    }

    if (!config.redirectUri) {
      throw new Error('Redirect URI is required for Authorization Code grant');
    }
  }

  /**
   * Build authorization URL with parameters
   */
  private buildAuthorizationUrl(): string {
    const url = new URL(this.config.authorizationUrl);

    // Generate and store state for CSRF protection (MANDATORY per RFC 9700)
    const state = stateManager.create({ grantType: 'authorization_code' });

    // Standard parameters
    url.searchParams.set('client_id', this.config.clientId);
    url.searchParams.set('redirect_uri', this.config.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('state', state);

    if (this.config.scope) {
      url.searchParams.set('scope', this.config.scope.toString());
    }

    // PKCE parameters
    if (this.config.usePKCE !== false) {
      this.pkce = generatePKCEChallenge();
      url.searchParams.set('code_challenge', this.pkce.codeChallenge);
      url.searchParams.set('code_challenge_method', this.pkce.method);
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
   * Start the authorization flow and get access token
   */
  async getAccessToken(): Promise<TokenResponse> {
    return ErrorHandler.wrap(async () => {
      // Build authorization URL
      const authUrl = this.buildAuthorizationUrl();

      logger.info('Starting authorization code flow...');
      logger.debug(`Authorization URL: ${authUrl}`);

      // Set up callback server
      this.callbackServer = new CallbackServer(this.config.redirectUri);

      // Open browser if configured
      if (this.config.openBrowser !== false) {
        await this.openBrowser(authUrl);
      } else {
        logger.info(`Please visit this URL to authorize: ${authUrl}`);
      }

      // Wait for callback
      logger.info('Waiting for authorization callback...');
      const callbackResult = await this.callbackServer.waitForCallback();

      // Check for errors
      if (callbackResult.error) {
        throw new OAuthClientError({
          error: callbackResult.error,
          error_description: callbackResult.error_description,
        });
      }

      if (!callbackResult.code) {
        throw new OAuthClientError('No authorization code received');
      }

      // MANDATORY state verification for CSRF protection (RFC 9700 compliance)
      if (!callbackResult.state) {
        throw new OAuthClientError(
          'Missing state parameter in authorization callback. ' +
            'This is a security violation - state parameter is mandatory for CSRF protection.',
        );
      }

      // Verify state matches and is valid
      const stateData = stateManager.verify(callbackResult.state);
      if (!stateData) {
        throw new OAuthClientError(
          'Invalid or expired state parameter - possible CSRF attack. ' +
            'State must be present, valid, and match the original request.',
        );
      }

      logger.info('Authorization code received, exchanging for tokens...');

      // Exchange code for tokens
      return this.exchangeAuthorizationCode(callbackResult.code);
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeAuthorizationCode(code: string): Promise<TokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
    });

    // Add client secret if available
    if (this.config.clientSecret) {
      params.append('client_secret', this.config.clientSecret);
    }

    // Add PKCE verifier if used
    if (this.pkce) {
      params.append('code_verifier', this.pkce.codeVerifier);
    }

    return this.exchangeToken(params);
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.callbackServer) {
      this.callbackServer.stop();
      this.callbackServer = undefined;
    }
    this.pkce = undefined;
  }
}
