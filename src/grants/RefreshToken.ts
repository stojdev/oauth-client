import { OAuthClient } from '../core/OAuthClient.js';
import { ErrorHandler } from '../core/ErrorHandler.js';
import { GrantType } from '../types/index.js';
import type { OAuthConfig, TokenResponse } from '../types/index.js';

export interface RefreshTokenConfig extends OAuthConfig {
  refreshToken: string;
}

/**
 * Refresh Token Grant Implementation
 * Used to obtain new access tokens without user interaction
 */
export class RefreshTokenGrant extends OAuthClient {
  protected config: RefreshTokenConfig;

  constructor(config: RefreshTokenConfig) {
    super({
      ...config,
      grantType: GrantType.RefreshToken,
    });
    this.config = config;

    if (!config.refreshToken) {
      throw new Error('Refresh token is required for Refresh Token grant');
    }
  }

  /**
   * Get new access token using refresh token
   */
  async getAccessToken(): Promise<TokenResponse> {
    return ErrorHandler.wrap(async () => {
      // The base OAuthClient.refreshToken method handles logging
      return this.refreshToken(this.config.refreshToken);
    });
  }
}
