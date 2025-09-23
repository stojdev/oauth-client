import { JWTVerifier, type JWTVerificationOptions } from './JWTVerifier.js';
import { logger } from './Logger.js';
import type { ProviderConfig } from '../config/schema.js';

/**
 * JWT Security Configuration for OAuth providers
 */
export interface JWTSecurityConfig {
  /** Whether JWT verification is required */
  requireVerification: boolean;
  /** JWKS URI for fetching public keys */
  jwksUri?: string;
  /** Expected issuer */
  expectedIssuer?: string;
  /** Expected audience */
  expectedAudience?: string | string[];
  /** Allowed algorithms */
  allowedAlgorithms?: string[];
  /** Clock tolerance in seconds */
  clockTolerance?: number;
  /** Whether to allow unverified tokens (for development) */
  allowUnverified?: boolean;
  /** Secret for HMAC algorithms */
  hmacSecret?: string;
}

/**
 * JWT Token Validation Result for OAuth clients
 */
export interface TokenValidationResult {
  /** Whether the token is valid */
  valid: boolean;
  /** Whether verification was performed */
  verified: boolean;
  /** Any errors encountered */
  errors: string[];
  /** Token claims if valid */
  claims?: Record<string, unknown>;
  /** Whether token is opaque (not JWT) */
  isOpaque?: boolean;
  /** Algorithm used */
  algorithm?: string;
  /** Whether signature was verified */
  signatureVerified?: boolean;
}

/**
 * JWT Security manager for OAuth clients
 * Provides secure token validation with proper configuration
 */
export class JWTSecurity {
  /**
   * Validate an access token with security checks
   */
  static async validateAccessToken(
    token: string,
    config: JWTSecurityConfig,
    provider?: ProviderConfig,
  ): Promise<TokenValidationResult> {
    try {
      // If verification is not required, just check if it's a valid JWT structure
      if (!config.requireVerification && config.allowUnverified) {
        logger.warn('JWT verification is disabled - this is not secure for production');
        return await this.performBasicValidation(token);
      }

      // Build verification options
      const verificationOptions: JWTVerificationOptions = {
        algorithms: config.allowedAlgorithms || ['RS256', 'RS384', 'RS512'],
        clockTolerance: config.clockTolerance || 60, // 60 seconds default
        jwksUri: config.jwksUri || this.getJWKSUriFromProvider(provider),
        issuer:
          config.expectedIssuer ||
          provider?.discoveryUrl?.replace('/.well-known/openid_configuration', ''),
        audience: config.expectedAudience,
        secret: config.hmacSecret,
      };

      // Perform verification
      const result = await JWTVerifier.verify(token, verificationOptions);

      if (result.isOpaque) {
        return {
          valid: true, // Opaque tokens are valid if the OAuth provider issued them
          verified: false,
          errors: [],
          isOpaque: true,
        };
      }

      return {
        valid: result.valid,
        verified: true,
        errors: result.errors,
        claims: result.payload ? (result.payload as Record<string, unknown>) : undefined,
        algorithm: result.header?.alg,
        signatureVerified: result.valid,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      logger.error('Token validation failed', { error: errorMessage });

      return {
        valid: false,
        verified: false,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Get default security configuration for a provider
   */
  static getDefaultSecurityConfig(provider?: ProviderConfig): JWTSecurityConfig {
    const jwksUri = this.getJWKSUriFromProvider(provider);

    return {
      requireVerification: true, // Always require verification by default
      jwksUri,
      expectedIssuer: provider?.discoveryUrl?.replace('/.well-known/openid_configuration', ''),
      allowedAlgorithms: ['RS256', 'RS384', 'RS512'], // Prefer RSA algorithms
      clockTolerance: 60,
      allowUnverified: false, // Never allow unverified in production
    };
  }

  /**
   * Get development security configuration (less strict for testing)
   */
  static getDevelopmentSecurityConfig(provider?: ProviderConfig): JWTSecurityConfig {
    return {
      requireVerification: false, // Allow unverified for development
      jwksUri: this.getJWKSUriFromProvider(provider),
      allowedAlgorithms: ['RS256', 'RS384', 'RS512', 'HS256', 'HS384', 'HS512'],
      clockTolerance: 300, // 5 minutes tolerance for development
      allowUnverified: true,
    };
  }

  /**
   * Validate token expiry and basic claims
   */
  static validateTokenClaims(claims: Record<string, unknown>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const now = Math.floor(Date.now() / 1000);

    // Check expiration
    if (claims.exp && typeof claims.exp === 'number') {
      if (claims.exp < now) {
        errors.push('Token has expired');
      }
    }

    // Check not before
    if (claims.nbf && typeof claims.nbf === 'number') {
      if (claims.nbf > now) {
        errors.push('Token is not yet valid');
      }
    }

    // Check issued at (should not be in the future)
    if (claims.iat && typeof claims.iat === 'number') {
      if (claims.iat > now + 300) {
        // Allow 5 minutes clock skew
        errors.push('Token issued at time is in the future');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Extract security-relevant claims from token
   */
  static extractSecurityClaims(claims: Record<string, unknown>): {
    issuer?: string;
    subject?: string;
    audience?: string | string[];
    scopes?: string[];
    clientId?: string;
    expiry?: Date;
    issuedAt?: Date;
  } {
    return {
      issuer: claims.iss as string,
      subject: claims.sub as string,
      audience: claims.aud as string | string[],
      scopes:
        typeof claims.scope === 'string' ? claims.scope.split(' ') : (claims.scopes as string[]),
      clientId: (claims.azp as string) || (claims.client_id as string),
      expiry: claims.exp ? new Date((claims.exp as number) * 1000) : undefined,
      issuedAt: claims.iat ? new Date((claims.iat as number) * 1000) : undefined,
    };
  }

  /**
   * Check if token has required scopes
   */
  static hasRequiredScopes(
    claims: Record<string, unknown>,
    requiredScopes: string[],
  ): { hasScopes: boolean; missingScopes: string[] } {
    const tokenScopes = this.extractSecurityClaims(claims).scopes || [];
    const missingScopes = requiredScopes.filter((scope) => !tokenScopes.includes(scope));

    return {
      hasScopes: missingScopes.length === 0,
      missingScopes,
    };
  }

  /**
   * Perform basic validation without signature verification
   */
  private static async performBasicValidation(token: string): Promise<TokenValidationResult> {
    // Check if it's JWT format
    if (token.split('.').length !== 3) {
      return {
        valid: true, // Opaque tokens are valid
        verified: false,
        errors: [],
        isOpaque: true,
      };
    }

    try {
      // Try to decode without verification
      const { JWTDecoder } = await import('./JWTDecoder.js');
      const decoded = JWTDecoder.decode(token);

      if (!decoded) {
        return {
          valid: false,
          verified: false,
          errors: ['Failed to decode JWT token'],
        };
      }

      // Validate basic claims
      const claimsValidation = this.validateTokenClaims(decoded.payload);

      return {
        valid: claimsValidation.valid,
        verified: false,
        errors: claimsValidation.errors,
        claims: decoded.payload,
        algorithm: decoded.header.alg,
        signatureVerified: false,
      };
    } catch {
      return {
        valid: false,
        verified: false,
        errors: ['Failed to decode token for basic validation'],
      };
    }
  }

  /**
   * Attempt to get JWKS URI from provider configuration
   */
  private static getJWKSUriFromProvider(provider?: ProviderConfig): string | undefined {
    if (!provider?.discoveryUrl) {
      return undefined;
    }

    // Common JWKS endpoints
    const baseUrl = provider.discoveryUrl.replace('/.well-known/openid_configuration', '');
    return `${baseUrl}/.well-known/jwks.json`;
  }
}

/**
 * Convenience function for quick token validation
 */
export async function validateJWTToken(
  token: string,
  options: {
    provider?: ProviderConfig;
    requireVerification?: boolean;
    expectedIssuer?: string;
    expectedAudience?: string | string[];
    allowedAlgorithms?: string[];
  } = {},
): Promise<TokenValidationResult> {
  const config: JWTSecurityConfig = {
    requireVerification: options.requireVerification ?? true,
    expectedIssuer: options.expectedIssuer,
    expectedAudience: options.expectedAudience,
    allowedAlgorithms: options.allowedAlgorithms || ['RS256', 'RS384', 'RS512'],
    clockTolerance: 60,
    allowUnverified: !options.requireVerification,
  };

  return JWTSecurity.validateAccessToken(token, config, options.provider);
}
