import { OAuthClient } from '../core/OAuthClient.js';
import { ErrorHandler } from '../core/ErrorHandler.js';
import { GrantType } from '../types/index.js';
import type { OAuthConfig, TokenResponse } from '../types/index.js';
import { logger } from '../utils/Logger.js';

export interface ResourceOwnerPasswordConfig extends OAuthConfig {
  username: string;
  password: string;
}

/**
 * Resource Owner Password Credentials Grant Implementation
 * Less secure - should only be used for trusted applications or migration
 */
export class ResourceOwnerPasswordGrant extends OAuthClient {
  protected config: ResourceOwnerPasswordConfig;

  constructor(config: ResourceOwnerPasswordConfig) {
    super({
      ...config,
      grantType: GrantType.ResourceOwnerPassword,
    });
    this.config = config;

    if (!config.username || !config.password) {
      throw new Error('Username and password are required for Resource Owner Password grant');
    }

    logger.warn(
      'Resource Owner Password grant is deprecated and less secure. ' +
        'Consider using Authorization Code with PKCE instead.',
    );
  }

  /**
   * Get access token using username and password
   * Uses secure client authentication per RFC 6749
   */
  async getAccessToken(): Promise<TokenResponse> {
    return ErrorHandler.wrap(async () => {
      const params = new URLSearchParams({
        grant_type: 'password',
        username: this.config.username,
        password: this.config.password,
      });

      // Add scope if specified
      if (this.config.scope) {
        params.append('scope', this.config.scope.toString());
      }

      logger.info('Requesting token with Resource Owner Password grant...');

      // Use secure client authentication via base class
      return this.makeTokenRequest(params);
    });
  }
}
