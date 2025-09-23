import { URL } from 'url';
import type { OAuthConfig, TokenResponse } from '../types/index.js';

/**
 * Validate OAuth configuration
 */
export function validateOAuthConfig(config: Partial<OAuthConfig>): void {
  if (!config.clientId) {
    throw new Error('Client ID is required');
  }

  if (config.authorizationUrl) {
    validateUrl(config.authorizationUrl, 'Authorization URL');
  }

  if (config.tokenUrl) {
    validateUrl(config.tokenUrl, 'Token URL');
  }

  if (config.redirectUri) {
    validateUrl(config.redirectUri, 'Redirect URI');
  }

  if (config.scope && Array.isArray(config.scope)) {
    config.scope = config.scope.join(' ');
  }
}

/**
 * Validate URL format
 */
export function validateUrl(url: string, name = 'URL'): void {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`${name} must use HTTP or HTTPS protocol`);
    }
  } catch {
    throw new Error(`Invalid ${name}: ${url}`);
  }
}

/**
 * Validate token response
 */
export function validateTokenResponse(response: unknown): TokenResponse {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid token response');
  }

  const tokenResponse = response as Record<string, unknown>;

  if (!tokenResponse.access_token || typeof tokenResponse.access_token !== 'string') {
    throw new Error('Token response missing access_token');
  }

  if (!tokenResponse.token_type || typeof tokenResponse.token_type !== 'string') {
    throw new Error('Token response missing token_type');
  }

  return tokenResponse as unknown as TokenResponse;
}

/**
 * Validate scope string
 */
export function validateScope(scope: string | string[] | undefined): string | undefined {
  if (!scope) {
    return undefined;
  }

  if (Array.isArray(scope)) {
    return scope.join(' ');
  }

  if (typeof scope !== 'string') {
    throw new Error('Scope must be a string or array of strings');
  }

  return scope;
}

/**
 * Check if token is expired
 */
export function isTokenExpired(expiresAt?: number): boolean {
  if (!expiresAt) {
    return false; // No expiry means token doesn't expire
  }

  return Date.now() >= expiresAt;
}

/**
 * Calculate token expiration time
 */
export function calculateExpiryTime(expiresIn?: number): number | undefined {
  if (!expiresIn || typeof expiresIn !== 'number') {
    return undefined;
  }

  // Convert seconds to milliseconds and add to current time
  return Date.now() + expiresIn * 1000;
}
