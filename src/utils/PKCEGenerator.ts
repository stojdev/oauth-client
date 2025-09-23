import crypto from 'crypto';
import type { PKCEChallenge } from '../types/index.js';

/**
 * Generate a cryptographically secure random string
 */
export function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomBytes = crypto.randomBytes(length);
  const result = new Array(length);

  for (let i = 0; i < length; i++) {
    result[i] = charset[randomBytes[i] % charset.length];
  }

  return result.join('');
}

/**
 * Generate a PKCE code verifier
 * Must be between 43 and 128 characters
 */
export function generateCodeVerifier(length = 128): string {
  if (length < 43 || length > 128) {
    throw new Error('Code verifier length must be between 43 and 128 characters');
  }
  return generateRandomString(length);
}

/**
 * Generate a PKCE code challenge from a verifier
 * Per RFC 9700, only S256 method is allowed for security
 */
export function generateCodeChallenge(verifier: string, method: 'S256' = 'S256'): string {
  if (method !== 'S256') {
    throw new Error(
      'Only S256 code challenge method is allowed per RFC 9700. ' +
        'The "plain" method is insecure and has been deprecated for security reasons.',
    );
  }

  // S256 method: base64url(sha256(verifier))
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return base64UrlEncode(hash);
}

/**
 * Generate a complete PKCE challenge pair
 * Per RFC 9700, only S256 method is supported for security
 */
export function generatePKCEChallenge(method: 'S256' = 'S256'): PKCEChallenge {
  if (method !== 'S256') {
    throw new Error(
      'Only S256 code challenge method is allowed per RFC 9700. ' +
        'The "plain" method is insecure and has been deprecated for security reasons.',
    );
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier, method);

  return {
    codeVerifier,
    codeChallenge,
    method,
  };
}

/**
 * Base64 URL encoding (RFC 4648)
 */
export function base64UrlEncode(buffer: Buffer | string): string {
  const base64 = Buffer.isBuffer(buffer)
    ? buffer.toString('base64')
    : Buffer.from(buffer).toString('base64');

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Generate a secure state parameter
 */
export function generateState(length = 32): string {
  return generateRandomString(length);
}

/**
 * Generate a nonce for OpenID Connect
 */
export function generateNonce(length = 32): string {
  return generateRandomString(length);
}
