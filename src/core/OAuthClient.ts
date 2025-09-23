import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { logger } from '../utils/Logger.js';
import { validateOAuthConfig, validateTokenResponse } from '../utils/Validators.js';
import { ClientAuth, ClientAuthMethod } from '../utils/ClientAuth.js';
import { GrantType } from '../types/index.js';
import type { OAuthConfig, TokenResponse, OAuthError } from '../types/index.js';

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
   * Exchange tokens using secure client authentication per RFC 6749
   */
  protected async exchangeToken(params: URLSearchParams): Promise<TokenResponse> {
    try {
      let config: AxiosRequestConfig = {
        method: 'POST',
        url: this.config.tokenUrl,
        data: params.toString(),
      };

      // Apply secure client authentication
      const authConfig = {
        clientId: this.config.clientId,
        clientSecret: this.config.clientSecret,
        authMethod: this.config.authMethod,
        privateKey: this.config.privateKey,
        tokenUrl: this.config.tokenUrl,
      };

      config = ClientAuth.applyClientAuth(config, params, authConfig);

      // Update data with potentially modified params
      config.data = params.toString();

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
    _token: string,
    _tokenType: 'access_token' | 'refresh_token' = 'access_token',
  ): Promise<void> {
    // This would need a revocation endpoint configured
    // _token and _tokenType would be used when revocation is implemented
    throw new Error('Token revocation not implemented');
  }

  /**
   * Extract OAuth error from response
   */
  protected extractOAuthError(data: unknown): OAuthError {
    if (data && typeof data === 'object' && 'error' in data) {
      const errorData = data as Record<string, unknown>;
      return {
        error: String(errorData.error),
        error_description: errorData.error_description
          ? String(errorData.error_description)
          : undefined,
        error_uri: errorData.error_uri ? String(errorData.error_uri) : undefined,
        state: errorData.state ? String(errorData.state) : undefined,
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
  private sanitizeHeaders(headers: unknown): Record<string, unknown> {
    const sanitized = { ...(headers as Record<string, unknown>) };
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

  /**
   * Get the configured authentication method
   */
  get authMethod(): ClientAuthMethod {
    return this.config.authMethod || ClientAuthMethod.ClientSecretBasic;
  }

  /**
   * Make a secure token request with proper client authentication
   */
  protected async makeTokenRequest(params: URLSearchParams): Promise<TokenResponse> {
    return this.exchangeToken(params);
  }
}
