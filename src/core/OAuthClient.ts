import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { logger } from '../utils/Logger.js';
import { validateOAuthConfig, validateTokenResponse } from '../utils/Validators.js';
import { ClientAuth, ClientAuthMethod } from '../utils/ClientAuth.js';
import { OAuthClientError } from './ErrorHandler.js';
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
   * Revoke a token per RFC 7009
   */
  async revokeToken(
    token: string,
    tokenType: 'access_token' | 'refresh_token' = 'access_token',
    revocationUrl?: string,
  ): Promise<void> {
    // Check if we have a revocation URL (either passed or from config)
    const revocationEndpoint =
      revocationUrl ||
      ((this.config as unknown as Record<string, unknown>).revocationUrl as string | undefined);

    if (!revocationEndpoint) {
      throw new OAuthClientError(
        'Token revocation endpoint not configured. Provide revocationUrl parameter or configure it in provider settings.',
      );
    }

    try {
      // Prepare the revocation request per RFC 7009
      const params = new URLSearchParams({
        token,
        token_type_hint: tokenType,
      });

      // Apply client authentication (Basic, POST, or JWT)
      const request: AxiosRequestConfig = {
        method: 'POST',
        url: revocationEndpoint,
        data: params.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        // RFC 7009: The invalid token does not cause an error (200 is success even if token was invalid)
        validateStatus: (status) => status === 200,
      };

      // Apply client authentication based on configuration
      ClientAuth.applyClientAuth(request, params, {
        clientId: this.config.clientId,
        clientSecret: this.config.clientSecret,
        authMethod: this.config.authMethod || ClientAuthMethod.ClientSecretBasic,
        privateKey: this.config.privateKey,
        tokenUrl: revocationEndpoint,
      });

      // Send revocation request
      const response = await this.httpClient.request(request);

      // RFC 7009: A successful response is indicated by HTTP status code 200
      if (response.status === 200) {
        logger.debug('Token successfully revoked', { tokenType });
      } else {
        // This shouldn't happen due to validateStatus, but handle it just in case
        throw new OAuthClientError(`Token revocation failed with status ${response.status}`);
      }
    } catch (error) {
      if (error instanceof OAuthClientError) {
        throw error;
      }

      // Network errors or other issues
      logger.error('Token revocation error', error);
      throw new OAuthClientError(
        'Failed to revoke token: ' + (error instanceof Error ? error.message : 'Unknown error'),
      );
    }
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
