import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  logger,
  HttpLogger,
  AuditLogger,
  PerformanceLogger,
  CorrelationManager,
} from '../utils/Logger.js';
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
        // Generate or get correlation ID
        const correlationId = CorrelationManager.getId() || CorrelationManager.generateId();
        CorrelationManager.setId(correlationId);

        // Add correlation ID to headers
        config.headers = config.headers || {};
        config.headers['X-Correlation-Id'] = correlationId;
        config.headers['X-Request-Start'] = Date.now().toString();

        // Log the request
        HttpLogger.logRequest(config.method?.toUpperCase() || 'GET', config.url || '', {
          headers: this.sanitizeHeaders(config.headers),
          clientId: this.config.clientId,
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
        const duration = response.config.headers?.['X-Request-Start']
          ? Date.now() - parseInt(response.config.headers['X-Request-Start'] as string, 10)
          : 0;

        HttpLogger.logResponse(response.status, duration, {
          statusText: response.statusText,
          url: response.config.url,
        });

        return response;
      },
      (error) => {
        const duration = error.config?.headers?.['X-Request-Start']
          ? Date.now() - parseInt(error.config.headers['X-Request-Start'] as string, 10)
          : 0;

        if (error.response) {
          const oauthError = this.extractOAuthError(error.response.data);

          HttpLogger.logResponse(error.response.status, duration, {
            statusText: error.response.statusText,
            error: oauthError.error,
            errorDescription: oauthError.error_description,
          });

          logger.error('OAuth error response', {
            ...oauthError,
            correlationId: CorrelationManager.getId(),
          });

          return Promise.reject(oauthError);
        }

        logger.error('OAuth network error', {
          message: error.message,
          correlationId: CorrelationManager.getId(),
        });

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
    PerformanceLogger.start('token_exchange');
    const grantType = params.get('grant_type') || 'unknown';

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

      logger.debug('Exchanging token', {
        grantType,
        clientId: this.config.clientId,
        authMethod: authConfig.authMethod,
      });

      config = ClientAuth.applyClientAuth(config, params, authConfig);

      // Update data with potentially modified params
      config.data = params.toString();

      const response = await this.httpClient.request(config);
      const tokenResponse = validateTokenResponse(response.data);

      AuditLogger.logTokenOperation('EXCHANGE_SUCCESS', {
        grantType,
        clientId: this.config.clientId,
        tokenType: tokenResponse.token_type,
        expiresIn: tokenResponse.expires_in,
      });

      PerformanceLogger.end('token_exchange', {
        grantType,
        clientId: this.config.clientId,
        success: true,
      });

      return tokenResponse;
    } catch (error) {
      AuditLogger.logTokenOperation('EXCHANGE_FAILURE', {
        grantType,
        clientId: this.config.clientId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      PerformanceLogger.end('token_exchange', {
        grantType,
        clientId: this.config.clientId,
        success: false,
      });

      logger.error('Token exchange failed', {
        grantType,
        clientId: this.config.clientId,
        error,
      });

      throw error;
    }
  }

  /**
   * Refresh an access token
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    PerformanceLogger.start('refresh_token');

    logger.info('Refreshing access token', {
      clientId: this.config.clientId,
      scope: this.config.scope,
    });

    const params = new URLSearchParams({
      grant_type: GrantType.RefreshToken,
      refresh_token: refreshToken,
    });

    if (this.config.scope) {
      params.append('scope', this.config.scope.toString());
    }

    try {
      const tokenResponse = await this.exchangeToken(params);

      AuditLogger.logAuth('REFRESH_TOKEN_SUCCESS', {
        clientId: this.config.clientId,
        scope: this.config.scope,
        tokenType: tokenResponse.token_type,
        expiresIn: tokenResponse.expires_in,
      });

      PerformanceLogger.end('refresh_token', {
        clientId: this.config.clientId,
        success: true,
      });

      return tokenResponse;
    } catch (error) {
      AuditLogger.logAuth('REFRESH_TOKEN_FAILURE', {
        clientId: this.config.clientId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      PerformanceLogger.end('refresh_token', {
        clientId: this.config.clientId,
        success: false,
      });

      throw error;
    }
  }

  /**
   * Revoke a token per RFC 7009
   */
  async revokeToken(
    token: string,
    tokenType: 'access_token' | 'refresh_token' = 'access_token',
    revocationUrl?: string,
  ): Promise<void> {
    PerformanceLogger.start('token_revocation');

    // Check if we have a revocation URL (either passed or from config)
    const revocationEndpoint =
      revocationUrl ||
      ((this.config as unknown as Record<string, unknown>).revocationUrl as string | undefined);

    if (!revocationEndpoint) {
      const error = new OAuthClientError(
        'Token revocation endpoint not configured. Provide revocationUrl parameter or configure it in provider settings.',
      );
      logger.error('Token revocation failed: no endpoint', {
        clientId: this.config.clientId,
        tokenType,
      });
      throw error;
    }

    logger.info('Revoking token', {
      clientId: this.config.clientId,
      tokenType,
      endpoint: revocationEndpoint,
    });

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
        logger.info('Token successfully revoked', {
          clientId: this.config.clientId,
          tokenType,
        });

        AuditLogger.logTokenOperation('REVOKE_SUCCESS', {
          clientId: this.config.clientId,
          tokenType,
        });

        PerformanceLogger.end('token_revocation', {
          clientId: this.config.clientId,
          tokenType,
          success: true,
        });
      } else {
        // This shouldn't happen due to validateStatus, but handle it just in case
        const error = new OAuthClientError(
          `Token revocation failed with status ${response.status}`,
        );

        AuditLogger.logTokenOperation('REVOKE_FAILURE', {
          clientId: this.config.clientId,
          tokenType,
          status: response.status,
        });

        PerformanceLogger.end('token_revocation', {
          clientId: this.config.clientId,
          tokenType,
          success: false,
        });

        throw error;
      }
    } catch (error) {
      if (error instanceof OAuthClientError) {
        throw error;
      }

      // Network errors or other issues
      logger.error('Token revocation error', {
        clientId: this.config.clientId,
        tokenType,
        error,
      });

      AuditLogger.logTokenOperation('REVOKE_ERROR', {
        clientId: this.config.clientId,
        tokenType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      PerformanceLogger.end('token_revocation', {
        clientId: this.config.clientId,
        tokenType,
        success: false,
      });

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
