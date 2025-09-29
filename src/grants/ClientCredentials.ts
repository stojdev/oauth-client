import { OAuthClient } from '../core/OAuthClient.js';
import { ErrorHandler } from '../core/ErrorHandler.js';
import { logger, AuditLogger, PerformanceLogger } from '../utils/Logger.js';
import type { OAuthConfig, TokenResponse, GrantType } from '../types/index.js';

/**
 * Client Credentials Grant Implementation
 * Used for machine-to-machine authentication
 */
export class ClientCredentialsGrant extends OAuthClient {
  constructor(config: OAuthConfig) {
    super({
      ...config,
      grantType: 'client_credentials' as GrantType,
    });

    if (!config.clientSecret) {
      logger.error('Client Credentials grant initialization failed: missing client secret');
      throw new Error('Client secret is required for Client Credentials grant');
    }

    logger.debug('Client Credentials grant initialized', {
      clientId: config.clientId,
      tokenUrl: config.tokenUrl,
      scope: config.scope,
    });
  }

  /**
   * Get access token using client credentials
   * Uses secure client authentication per RFC 6749
   */
  async getAccessToken(): Promise<TokenResponse> {
    return ErrorHandler.wrap(async () => {
      PerformanceLogger.start('client_credentials_token_request');

      logger.debug('Starting Client Credentials grant flow', {
        clientId: this.config.clientId,
        scope: this.config.scope,
      });

      const params = new URLSearchParams({
        grant_type: 'client_credentials',
      });

      if (this.config.scope) {
        params.append('scope', this.config.scope.toString());
      }

      try {
        // Use secure client authentication via base class
        const tokenResponse = await this.makeTokenRequest(params);

        AuditLogger.logAuth('CLIENT_CREDENTIALS_SUCCESS', {
          clientId: this.config.clientId,
          scope: this.config.scope,
          tokenType: tokenResponse.token_type,
          expiresIn: tokenResponse.expires_in,
        });

        PerformanceLogger.end('client_credentials_token_request', {
          clientId: this.config.clientId,
          success: true,
        });

        logger.debug('Client Credentials grant completed successfully');
        return tokenResponse;
      } catch (error) {
        AuditLogger.logAuth('CLIENT_CREDENTIALS_FAILURE', {
          clientId: this.config.clientId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        PerformanceLogger.end('client_credentials_token_request', {
          clientId: this.config.clientId,
          success: false,
        });

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.debug(`Client Credentials grant failed ${errorMessage}`, {
          code: (error as { code?: string }).code,
        });
        throw error;
      }
    });
  }
}
