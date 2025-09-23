import { logger } from '../utils/Logger.js';
import type { OAuthError } from '../types/index.js';

/**
 * OAuth error codes as per RFC 6749
 */
export enum OAuthErrorCode {
  InvalidRequest = 'invalid_request',
  UnauthorizedClient = 'unauthorized_client',
  AccessDenied = 'access_denied',
  UnsupportedResponseType = 'unsupported_response_type',
  InvalidScope = 'invalid_scope',
  ServerError = 'server_error',
  TemporarilyUnavailable = 'temporarily_unavailable',
  InvalidClient = 'invalid_client',
  InvalidGrant = 'invalid_grant',
  UnsupportedGrantType = 'unsupported_grant_type',
}

/**
 * Custom OAuth Error class
 */
export class OAuthClientError extends Error {
  public code: string;
  public description?: string;
  public uri?: string;
  public state?: string;
  public statusCode?: number;

  constructor(error: OAuthError | string, statusCode?: number) {
    if (typeof error === 'string') {
      super(error);
      this.code = 'unknown_error';
    } else {
      super(error.error_description || error.error);
      this.code = error.error;
      this.description = error.error_description;
      this.uri = error.error_uri;
      this.state = error.state;
    }

    this.name = 'OAuthClientError';
    this.statusCode = statusCode;
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    switch (this.code) {
      case OAuthErrorCode.InvalidRequest:
        return 'The request is missing required parameters or is malformed.';
      case OAuthErrorCode.UnauthorizedClient:
        return 'The client is not authorized to use this grant type.';
      case OAuthErrorCode.AccessDenied:
        return 'Access was denied by the authorization server.';
      case OAuthErrorCode.UnsupportedResponseType:
        return 'The authorization server does not support this response type.';
      case OAuthErrorCode.InvalidScope:
        return 'The requested scope is invalid or exceeds the granted scope.';
      case OAuthErrorCode.ServerError:
        return 'The authorization server encountered an unexpected error.';
      case OAuthErrorCode.TemporarilyUnavailable:
        return 'The authorization server is temporarily unavailable.';
      case OAuthErrorCode.InvalidClient:
        return 'Client authentication failed.';
      case OAuthErrorCode.InvalidGrant:
        return 'The provided authorization grant is invalid or expired.';
      case OAuthErrorCode.UnsupportedGrantType:
        return 'The authorization grant type is not supported.';
      default:
        return this.description || this.message || 'An unknown OAuth error occurred.';
    }
  }

  /**
   * Convert to plain object for logging
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      description: this.description,
      uri: this.uri,
      state: this.state,
      statusCode: this.statusCode,
    };
  }
}

/**
 * Error handler utility
 */
export class ErrorHandler {
  /**
   * Handle and format OAuth errors
   */
  static handle(error: any): never {
    if (error instanceof OAuthClientError) {
      logger.error('OAuth error', error.toJSON());
      throw error;
    }

    if (error.response?.data?.error) {
      const oauthError = new OAuthClientError(error.response.data, error.response.status);
      logger.error('OAuth error response', oauthError.toJSON());
      throw oauthError;
    }

    if (error.code === 'ECONNREFUSED') {
      logger.error('Connection refused', { url: error.config?.url });
      throw new OAuthClientError('Unable to connect to authorization server');
    }

    if (error.code === 'ETIMEDOUT') {
      logger.error('Request timeout', { url: error.config?.url });
      throw new OAuthClientError('Request to authorization server timed out');
    }

    logger.error('Unexpected error', error);
    throw new OAuthClientError('An unexpected error occurred');
  }

  /**
   * Wrap async functions with error handling
   */
  static async wrap<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      return ErrorHandler.handle(error);
    }
  }
}

export default ErrorHandler;
