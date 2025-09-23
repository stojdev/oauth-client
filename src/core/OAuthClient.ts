import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { logger } from '../utils/Logger.js';
import { validateOAuthConfig, validateTokenResponse } from '../utils/Validators.js';
import type { OAuthConfig, TokenResponse, OAuthError, GrantType } from '../types/index.js';

/**
 * Base OAuth 2.0 Client
 */
export abstract class OAuthClient {
  protected config: OAuthConfig;
  protected httpClient: AxiosInstance;

  constructor(config: OAuthConfig) {
    validateOAuthConfig(config);
    this.config = config;

    // Create HTTP client with defaults
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Request interceptor for logging
    this.httpClient.interceptors.request.use(
      (config) => {
        logger.debug('OAuth request', {
          method: config.method,
          url: config.url,
          headers: this.sanitizeHeaders(config.headers),
        });
        return config;
      },
      (error) => {
        logger.error('OAuth request error', error);
        return Promise.reject(error);
      },
    );

    // Response interceptor for logging and error handling
    this.httpClient.interceptors.response.use(
      (response) => {
        logger.debug('OAuth response', {
          status: response.status,
          statusText: response.statusText,
        });
        return response;
      },
      (error) => {
        if (error.response) {
          const oauthError = this.extractOAuthError(error.response.data);
          logger.error('OAuth error response', oauthError);
          return Promise.reject(oauthError);
        }
        logger.error('OAuth network error', error);
        return Promise.reject(error);
      },
    );
  }

  /**
   * Abstract method to be implemented by grant type classes
   */
  abstract getAccessToken(): Promise<TokenResponse>;

  /**
   * Exchange authorization code for tokens
   */
  protected async exchangeToken(params: URLSearchParams): Promise<TokenResponse> {
    try {
      const config: AxiosRequestConfig = {
        method: 'POST',
        url: this.config.tokenUrl,
        data: params.toString(),
      };

      // Add client authentication
      if (this.config.clientSecret) {
        config.auth = {
          username: this.config.clientId,
          password: this.config.clientSecret,
        };
      } else {
        params.append('client_id', this.config.clientId);
      }

      const response = await this.httpClient.request(config);
      return validateTokenResponse(response.data);
    } catch (error) {
      logger.error('Token exchange failed', error);
      throw error;
    }
  }

  /**
   * Refresh an access token
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const params = new URLSearchParams({
      grant_type: GrantType.RefreshToken,
      refresh_token: refreshToken,
    });

    if (this.config.scope) {
      params.append('scope', this.config.scope.toString());
    }

    return this.exchangeToken(params);
  }

  /**
   * Revoke a token
   */
  async revokeToken(
    token: string,
    tokenType: 'access_token' | 'refresh_token' = 'access_token',
  ): Promise<void> {
    // This would need a revocation endpoint configured
    throw new Error('Token revocation not implemented');
  }

  /**
   * Extract OAuth error from response
   */
  protected extractOAuthError(data: any): OAuthError {
    if (data && typeof data === 'object' && data.error) {
      return {
        error: data.error,
        error_description: data.error_description,
        error_uri: data.error_uri,
        state: data.state,
      };
    }

    return {
      error: 'unknown_error',
      error_description: 'An unknown error occurred',
    };
  }

  /**
   * Sanitize headers for logging (remove sensitive data)
   */
  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    if (sanitized.authorization) {
      sanitized.authorization = '[REDACTED]';
    }
    return sanitized;
  }

  /**
   * Get the configured grant type
   */
  get grantType(): GrantType | undefined {
    return this.config.grantType;
  }
}
