import { OAuthClient } from '../core/OAuthClient.js';
import { ErrorHandler } from '../core/ErrorHandler.js';
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
      throw new Error('Client secret is required for Client Credentials grant');
    }
  }

  /**
   * Get access token using client credentials
   */
  async getAccessToken(): Promise<TokenResponse> {
    return ErrorHandler.wrap(async () => {
      const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret!,
      });

      if (this.config.scope) {
        params.append('scope', this.config.scope.toString());
      }

      const response = await this.httpClient.post(this.config.tokenUrl, params.toString());
      return response.data as TokenResponse;
    });
  }
}
