import jwt from 'jsonwebtoken';
import axios from 'axios';
import { logger } from './Logger.js';
import type { JWTHeader, JWTPayload, DecodedJWT } from './JWTDecoder.js';

/**
 * JWT Verification Options
 */
export interface JWTVerificationOptions {
  /** Expected issuer(s) */
  issuer?: string | string[];
  /** Expected audience(s) */
  audience?: string | string[];
  /** Allowed algorithms */
  algorithms?: string[];
  /** Clock tolerance in seconds for exp/nbf claims */
  clockTolerance?: number;
  /** Whether to ignore expiration */
  ignoreExpiration?: boolean;
  /** Whether to ignore not before */
  ignoreNotBefore?: boolean;
  /** JWKS endpoint URL for fetching public keys */
  jwksUri?: string;
  /** Static secret for HMAC algorithms */
  secret?: string;
}

/**
 * JWT Verification Result
 */
export interface JWTVerificationResult {
  /** Whether verification was successful */
  valid: boolean;
  /** Verification errors if any */
  errors: string[];
  /** Decoded payload if verification succeeded */
  payload?: JWTPayload;
  /** Decoded header if verification succeeded */
  header?: JWTHeader;
  /** Whether token is opaque (not a JWT) */
  isOpaque?: boolean;
}

/**
 * JWKS Key
 */
export interface JWKSKey {
  kty: string; // Key type
  use?: string; // Key use
  key_ops?: string[]; // Key operations
  alg?: string; // Algorithm
  kid?: string; // Key ID
  x5c?: string[]; // X.509 certificate chain
  x5t?: string; // X.509 certificate SHA-1 thumbprint
  'x5t#S256'?: string; // X.509 certificate SHA-256 thumbprint
  n?: string; // RSA modulus
  e?: string; // RSA exponent
  d?: string; // RSA private exponent
  p?: string; // RSA first prime factor
  q?: string; // RSA second prime factor
  dp?: string; // RSA first factor CRT exponent
  dq?: string; // RSA second factor CRT exponent
  qi?: string; // RSA first CRT coefficient
  k?: string; // Symmetric key
  [key: string]: unknown;
}

/**
 * JWKS Response
 */
export interface JWKSResponse {
  keys: JWKSKey[];
}

/**
 * JWT Verifier with signature validation
 * This class provides secure JWT verification with proper signature checking
 */
export class JWTVerifier {
  private static readonly SUPPORTED_ALGORITHMS = [
    'RS256',
    'RS384',
    'RS512', // RSA algorithms
    'HS256',
    'HS384',
    'HS512', // HMAC algorithms
    'ES256',
    'ES384',
    'ES512', // ECDSA algorithms
  ];

  private static readonly RSA_ALGORITHMS = ['RS256', 'RS384', 'RS512'];
  private static readonly HMAC_ALGORITHMS = ['HS256', 'HS384', 'HS512'];
  private static readonly ECDSA_ALGORITHMS = ['ES256', 'ES384', 'ES512'];

  // Cache for JWKS keys with TTL
  private static jwksCache = new Map<string, { keys: JWKSKey[]; expires: number }>();
  private static readonly JWKS_CACHE_TTL = 3600000; // 1 hour in milliseconds

  /**
   * Verify a JWT token with signature validation
   */
  static async verify(
    token: string,
    options: JWTVerificationOptions = {},
  ): Promise<JWTVerificationResult> {
    try {
      // First check if it's a valid JWT format
      if (!this.isJWTFormat(token)) {
        return {
          valid: false,
          errors: ['Token is not in JWT format (might be opaque token)'],
          isOpaque: true,
        };
      }

      // Decode header to get algorithm and key ID
      const decodedHeader = this.decodeHeader(token);
      if (!decodedHeader) {
        return {
          valid: false,
          errors: ['Failed to decode JWT header'],
        };
      }

      // Validate algorithm
      const algorithm = decodedHeader.alg;
      if (!this.isAlgorithmSupported(algorithm)) {
        return {
          valid: false,
          errors: [`Unsupported algorithm: ${algorithm}`],
        };
      }

      // Check if algorithm is allowed
      if (options.algorithms && !options.algorithms.includes(algorithm)) {
        return {
          valid: false,
          errors: [`Algorithm ${algorithm} not in allowed list: ${options.algorithms.join(', ')}`],
        };
      }

      // Get verification key
      const verificationKey = await this.getVerificationKey(decodedHeader, options);
      if (!verificationKey) {
        return {
          valid: false,
          errors: ['Unable to obtain verification key'],
        };
      }

      // Verify token signature and claims
      const verifyOptions: jwt.VerifyOptions = {
        algorithms: [algorithm as jwt.Algorithm],
        clockTolerance: options.clockTolerance || 0,
        ignoreExpiration: options.ignoreExpiration || false,
        ignoreNotBefore: options.ignoreNotBefore || false,
      };

      if (options.issuer) {
        if (Array.isArray(options.issuer)) {
          if (options.issuer.length > 0) {
            verifyOptions.issuer =
              options.issuer.length === 1
                ? options.issuer[0]
                : (options.issuer as [string, ...string[]]);
          }
        } else {
          verifyOptions.issuer = options.issuer;
        }
      }

      if (options.audience) {
        if (Array.isArray(options.audience)) {
          if (options.audience.length > 0) {
            verifyOptions.audience =
              options.audience.length === 1
                ? options.audience[0]
                : (options.audience as [string, ...string[]]);
          }
        } else {
          verifyOptions.audience = options.audience;
        }
      }

      const decoded = jwt.verify(token, verificationKey, verifyOptions) as jwt.JwtPayload;

      return {
        valid: true,
        errors: [],
        payload: decoded as JWTPayload,
        header: decodedHeader,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown verification error';
      logger.error('JWT verification failed', { error: errorMessage });

      return {
        valid: false,
        errors: [this.formatVerificationError(errorMessage)],
      };
    }
  }

  /**
   * Verify a JWT token and return a DecodedJWT object (for backward compatibility)
   */
  static async verifyAndDecode(
    token: string,
    options: JWTVerificationOptions = {},
  ): Promise<DecodedJWT | null> {
    const result = await this.verify(token, options);

    if (!result.valid || !result.payload || !result.header) {
      logger.error('JWT verification failed', { errors: result.errors });
      return null;
    }

    // Extract signature from token
    const parts = token.split('.');
    const signature = parts[2] || '';

    return {
      header: result.header,
      payload: result.payload,
      signature,
      raw: {
        header: parts[0] || '',
        payload: parts[1] || '',
        signature,
      },
    };
  }

  /**
   * Check if token format is JWT (has 3 parts separated by dots)
   */
  private static isJWTFormat(token: string): boolean {
    return token.split('.').length === 3;
  }

  /**
   * Decode JWT header without verification
   */
  private static decodeHeader(token: string): JWTHeader | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const headerB64 = parts[0];
      const headerJson = Buffer.from(
        headerB64.replace(/-/g, '+').replace(/_/g, '/'),
        'base64',
      ).toString('utf-8');
      return JSON.parse(headerJson) as JWTHeader;
    } catch (error) {
      logger.error('Failed to decode JWT header', error);
      return null;
    }
  }

  /**
   * Check if algorithm is supported
   */
  private static isAlgorithmSupported(algorithm: string): boolean {
    return this.SUPPORTED_ALGORITHMS.includes(algorithm);
  }

  /**
   * Get verification key based on algorithm and header
   */
  private static async getVerificationKey(
    header: JWTHeader,
    options: JWTVerificationOptions,
  ): Promise<string | Buffer | null> {
    const algorithm = header.alg;

    // For HMAC algorithms, use provided secret
    if (this.HMAC_ALGORITHMS.includes(algorithm)) {
      if (!options.secret) {
        logger.error('HMAC algorithm requires secret');
        return null;
      }
      return options.secret;
    }

    // For RSA/ECDSA algorithms, get public key
    if (this.RSA_ALGORITHMS.includes(algorithm) || this.ECDSA_ALGORITHMS.includes(algorithm)) {
      if (options.jwksUri) {
        return this.getPublicKeyFromJWKS(header, options.jwksUri);
      } else {
        logger.error('RSA/ECDSA algorithms require JWKS URI');
        return null;
      }
    }

    return null;
  }

  /**
   * Get public key from JWKS endpoint
   */
  private static async getPublicKeyFromJWKS(
    header: JWTHeader,
    jwksUri: string,
  ): Promise<string | null> {
    try {
      // Check cache first
      const cacheKey = `${jwksUri}:${header.kid || 'default'}`;
      const cached = this.jwksCache.get(cacheKey);

      if (cached && Date.now() < cached.expires) {
        const key = this.findKeyInJWKS(cached.keys, header);
        if (key) {
          return key;
        }
      }

      // Fetch JWKS
      logger.debug('Fetching JWKS', { uri: jwksUri });
      const response = await axios.get<JWKSResponse>(jwksUri, {
        timeout: 10000,
        headers: { Accept: 'application/json' },
      });

      const jwks = response.data;
      if (!jwks.keys || !Array.isArray(jwks.keys)) {
        logger.error('Invalid JWKS response - missing keys array');
        return null;
      }

      // Cache the keys
      this.jwksCache.set(jwksUri, {
        keys: jwks.keys,
        expires: Date.now() + this.JWKS_CACHE_TTL,
      });

      // Find the right key
      return this.findKeyInJWKS(jwks.keys, header);
    } catch (error) {
      logger.error('Failed to fetch JWKS', { uri: jwksUri, error });
      return null;
    }
  }

  /**
   * Find matching key in JWKS
   */
  private static findKeyInJWKS(keys: JWKSKey[], header: JWTHeader): string | null {
    // First try to find by kid if present
    if (header.kid) {
      const keyWithKid = keys.find((key) => key.kid === header.kid);
      if (keyWithKid) {
        return this.jwkToPublicKey(keyWithKid);
      }
    }

    // Fallback: find by algorithm and use
    const algorithm = header.alg;
    const compatibleKey = keys.find((key) => {
      return (
        (!key.alg || key.alg === algorithm) && (!key.use || key.use === 'sig') && key.kty === 'RSA' // For now, support RSA keys
      );
    });

    if (compatibleKey) {
      return this.jwkToPublicKey(compatibleKey);
    }

    logger.error('No matching key found in JWKS', { algorithm, kid: header.kid });
    return null;
  }

  /**
   * Convert JWK to public key string
   */
  private static jwkToPublicKey(jwk: JWKSKey): string | null {
    try {
      // Handle X.509 certificate
      if (jwk.x5c && jwk.x5c.length > 0) {
        const cert = jwk.x5c[0];
        return `-----BEGIN CERTIFICATE-----\n${cert}\n-----END CERTIFICATE-----`;
      }

      // Handle RSA key
      if (jwk.kty === 'RSA' && jwk.n && jwk.e) {
        // Convert JWK to PEM format
        // This is a simplified implementation - for production use a proper library like node-jose
        // const n = Buffer.from(jwk.n.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
        // const e = Buffer.from(jwk.e.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

        // For simplicity, if we have x5c use it, otherwise we'd need a proper RSA key builder
        logger.warn('RSA key conversion from n,e not fully implemented - use x5c in JWK');
        return null;
      }

      logger.error('Unsupported JWK format', { kty: jwk.kty });
      return null;
    } catch (error) {
      logger.error('Failed to convert JWK to public key', error);
      return null;
    }
  }

  /**
   * Format verification error for user-friendly display
   */
  private static formatVerificationError(errorMessage: string): string {
    if (errorMessage.includes('jwt expired')) {
      return 'Token has expired';
    }
    if (errorMessage.includes('jwt not active')) {
      return 'Token is not yet valid (nbf claim)';
    }
    if (errorMessage.includes('invalid signature')) {
      return 'Invalid token signature';
    }
    if (errorMessage.includes('invalid issuer')) {
      return 'Invalid token issuer';
    }
    if (errorMessage.includes('invalid audience')) {
      return 'Invalid token audience';
    }
    if (errorMessage.includes('invalid algorithm')) {
      return 'Invalid or unsupported algorithm';
    }

    return `Token verification failed: ${errorMessage}`;
  }

  /**
   * Clear JWKS cache (useful for testing or forced refresh)
   */
  static clearJWKSCache(): void {
    this.jwksCache.clear();
    logger.debug('JWKS cache cleared');
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.jwksCache.size,
      keys: Array.from(this.jwksCache.keys()),
    };
  }
}
