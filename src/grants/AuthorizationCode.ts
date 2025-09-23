import { OAuthClient } from '../core/OAuthClient.js';
import { ErrorHandler, OAuthClientError } from '../core/ErrorHandler.js';
import { CallbackServer } from '../utils/CallbackServer.js';
import { generatePKCEChallenge } from '../utils/PKCEGenerator.js';
import stateManager from '../utils/StateManager.js';
import { logger, AuditLogger, PerformanceLogger } from '../utils/Logger.js';
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
      logger.error('Authorization Code grant initialization failed: missing authorization URL');
      throw new Error('Authorization URL is required for Authorization Code grant');
    }

    if (!config.redirectUri) {
      logger.error('Authorization Code grant initialization failed: missing redirect URI');
      throw new Error('Redirect URI is required for Authorization Code grant');
    }

    logger.debug('Authorization Code grant initialized', {
      clientId: config.clientId,
      authorizationUrl: config.authorizationUrl,
      redirectUri: config.redirectUri,
      usePKCE: config.usePKCE !== false,
    });
  }

  /**
   * Build authorization URL with parameters
   */
  private buildAuthorizationUrl(): string {
    const url = new URL(this.config.authorizationUrl);

    // Generate and store state for CSRF protection (MANDATORY per RFC 9700)
    const state = stateManager.create({ grantType: 'authorization_code' });
    logger.debug('Generated state for CSRF protection', { stateLength: state.length });

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
      logger.debug('PKCE enabled with S256 method');

      AuditLogger.logSecurityEvent('PKCE_ENABLED', {
        method: this.pkce.method,
        clientId: this.config.clientId,
      });
    }

    // Custom parameters
    if (this.config.customAuthParams) {
      for (const [key, value] of Object.entries(this.config.customAuthParams)) {
        url.searchParams.set(key, value);
      }
      logger.debug('Added custom auth parameters', {
        params: Object.keys(this.config.customAuthParams),
      });
    }

    const authUrl = url.toString();
    logger.info('Built authorization URL', {
      clientId: this.config.clientId,
      scope: this.config.scope,
      pkceEnabled: this.config.usePKCE !== false,
    });

    return authUrl;
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
      PerformanceLogger.start('authorization_code_flow');

      // Build authorization URL
      const authUrl = this.buildAuthorizationUrl();

      logger.info('Starting authorization code flow', {
        clientId: this.config.clientId,
        redirectUri: this.config.redirectUri,
      });

      AuditLogger.logAuth('AUTHORIZATION_CODE_START', {
        clientId: this.config.clientId,
        scope: this.config.scope,
        pkceEnabled: this.config.usePKCE !== false,
      });

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
        const error = new OAuthClientError({
          error: callbackResult.error,
          error_description: callbackResult.error_description,
        });

        AuditLogger.logAuth('AUTHORIZATION_CODE_ERROR', {
          clientId: this.config.clientId,
          error: callbackResult.error,
          errorDescription: callbackResult.error_description,
        });

        PerformanceLogger.end('authorization_code_flow', {
          success: false,
          error: callbackResult.error,
        });

        throw error;
      }

      if (!callbackResult.code) {
        AuditLogger.logSecurityEvent('AUTHORIZATION_CODE_MISSING', {
          clientId: this.config.clientId,
        });
        throw new OAuthClientError('No authorization code received');
      }

      // MANDATORY state verification for CSRF protection (RFC 9700 compliance)
      if (!callbackResult.state) {
        AuditLogger.logSecurityEvent('CSRF_PROTECTION_VIOLATION', {
          clientId: this.config.clientId,
          reason: 'Missing state parameter',
        });

        throw new OAuthClientError(
          'Missing state parameter in authorization callback. ' +
            'This is a security violation - state parameter is mandatory for CSRF protection.',
        );
      }

      // Verify state matches and is valid
      const stateData = stateManager.verify(callbackResult.state);
      if (!stateData) {
        AuditLogger.logSecurityEvent('CSRF_ATTACK_DETECTED', {
          clientId: this.config.clientId,
          reason: 'Invalid or expired state',
        });

        throw new OAuthClientError(
          'Invalid or expired state parameter - possible CSRF attack. ' +
            'State must be present, valid, and match the original request.',
        );
      }

      logger.info('Authorization code received, exchanging for tokens...');
      logger.debug('State verification successful');

      // Exchange code for tokens
      const tokenResponse = await this.exchangeAuthorizationCode(callbackResult.code);

      AuditLogger.logAuth('AUTHORIZATION_CODE_SUCCESS', {
        clientId: this.config.clientId,
        scope: this.config.scope,
        tokenType: tokenResponse.token_type,
        expiresIn: tokenResponse.expires_in,
      });

      PerformanceLogger.end('authorization_code_flow', {
        success: true,
        clientId: this.config.clientId,
      });

      return tokenResponse;
    });
  }

  /**
   * Exchange authorization code for tokens
   * Uses secure client authentication per RFC 6749
   */
  private async exchangeAuthorizationCode(code: string): Promise<TokenResponse> {
    PerformanceLogger.start('code_exchange');

    logger.debug('Exchanging authorization code for tokens', {
      clientId: this.config.clientId,
      redirectUri: this.config.redirectUri,
    });

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirectUri,
    });

    // Add PKCE verifier if used
    if (this.pkce) {
      params.append('code_verifier', this.pkce.codeVerifier);
      logger.debug('Added PKCE code verifier to token exchange');
    }

    try {
      // Client credentials handled securely by exchangeToken method
      const tokenResponse = await this.exchangeToken(params);

      PerformanceLogger.end('code_exchange', {
        success: true,
        clientId: this.config.clientId,
      });

      logger.info('Successfully exchanged authorization code for tokens');
      return tokenResponse;
    } catch (error) {
      PerformanceLogger.end('code_exchange', {
        success: false,
        clientId: this.config.clientId,
      });

      logger.error('Failed to exchange authorization code', error);
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    logger.debug('Cleaning up Authorization Code grant resources');

    if (this.callbackServer) {
      this.callbackServer.stop();
      this.callbackServer = undefined;
      logger.debug('Callback server stopped');
    }

    if (this.pkce) {
      this.pkce = undefined;
      logger.debug('PKCE challenge cleared');
    }
  }
}
