import { logger } from './Logger.js';

/**
 * JWT Token structure
 */
export interface JWTHeader {
  alg: string;
  typ?: string;
  kid?: string;
  x5t?: string;
  x5c?: string[];
  [key: string]: unknown;
}

export interface JWTPayload {
  iss?: string; // Issuer
  sub?: string; // Subject
  aud?: string | string[]; // Audience
  exp?: number; // Expiration time
  nbf?: number; // Not before
  iat?: number; // Issued at
  jti?: string; // JWT ID
  nonce?: string; // Nonce for OIDC
  azp?: string; // Authorized party
  scope?: string; // Scope
  [key: string]: unknown;
}

export interface DecodedJWT {
  header: JWTHeader;
  payload: JWTPayload;
  signature: string;
  raw: {
    header: string;
    payload: string;
    signature: string;
  };
}

/**
 * JWT Decoder for token inspection
 * Note: This decoder does NOT verify signatures - it's for inspection only
 */
export class JWTDecoder {
  /**
   * Decode a JWT token without verification
   * WARNING: This method does NOT verify the token signature
   */
  static decode(token: string): DecodedJWT | null {
    try {
      // Check if token has correct format
      const parts = token.split('.');
      if (parts.length !== 3) {
        logger.error('Invalid JWT format - expected 3 parts separated by dots');
        return null;
      }

      const [headerB64, payloadB64, signatureB64] = parts;

      // Decode header
      const header = this.decodeBase64Url(headerB64);
      if (!header) {
        logger.error('Failed to decode JWT header');
        return null;
      }

      // Decode payload
      const payload = this.decodeBase64Url(payloadB64);
      if (!payload) {
        logger.error('Failed to decode JWT payload');
        return null;
      }

      return {
        header: JSON.parse(header) as JWTHeader,
        payload: JSON.parse(payload) as JWTPayload,
        signature: signatureB64,
        raw: {
          header: headerB64,
          payload: payloadB64,
          signature: signatureB64,
        },
      };
    } catch (error) {
      logger.error('Failed to decode JWT', error);
      return null;
    }
  }

  /**
   * Decode base64url encoded string
   */
  private static decodeBase64Url(input: string): string | null {
    try {
      // Replace URL-safe characters
      let base64 = input.replace(/-/g, '+').replace(/_/g, '/');

      // Add padding if necessary
      const padding = 4 - (base64.length % 4);
      if (padding !== 4) {
        base64 += '='.repeat(padding);
      }

      // Decode base64
      return Buffer.from(base64, 'base64').toString('utf-8');
    } catch (error) {
      logger.error('Failed to decode base64url', error);
      return null;
    }
  }

  /**
   * Check if a token is expired
   */
  static isExpired(token: string | DecodedJWT): boolean {
    const decoded = typeof token === 'string' ? this.decode(token) : token;
    if (!decoded) {
      return true; // Consider invalid tokens as expired
    }

    const exp = decoded.payload.exp;
    if (!exp) {
      return false; // No expiration claim means token doesn't expire
    }

    const now = Math.floor(Date.now() / 1000);
    return now >= exp;
  }

  /**
   * Check if a token is not yet valid
   */
  static isNotYetValid(token: string | DecodedJWT): boolean {
    const decoded = typeof token === 'string' ? this.decode(token) : token;
    if (!decoded) {
      return true; // Consider invalid tokens as not valid
    }

    const nbf = decoded.payload.nbf;
    if (!nbf) {
      return false; // No nbf claim means token is immediately valid
    }

    const now = Math.floor(Date.now() / 1000);
    return now < nbf;
  }

  /**
   * Get token lifetime in seconds
   */
  static getLifetime(token: string | DecodedJWT): number | null {
    const decoded = typeof token === 'string' ? this.decode(token) : token;
    if (!decoded) {
      return null;
    }

    const iat = decoded.payload.iat;
    const exp = decoded.payload.exp;

    if (!iat || !exp) {
      return null;
    }

    return exp - iat;
  }

  /**
   * Get time until token expires in seconds
   */
  static getTimeUntilExpiry(token: string | DecodedJWT): number | null {
    const decoded = typeof token === 'string' ? this.decode(token) : token;
    if (!decoded) {
      return null;
    }

    const exp = decoded.payload.exp;
    if (!exp) {
      return null; // No expiration
    }

    const now = Math.floor(Date.now() / 1000);
    const timeLeft = exp - now;

    return timeLeft > 0 ? timeLeft : 0;
  }

  /**
   * Format a decoded JWT for display
   */
  static format(token: string | DecodedJWT, includeRaw = false): string {
    const decoded = typeof token === 'string' ? this.decode(token) : token;
    if (!decoded) {
      return 'Invalid JWT token';
    }

    const lines: string[] = ['='.repeat(60), 'JWT TOKEN INSPECTION', '='.repeat(60)];

    // Header
    lines.push('\nHEADER:');
    lines.push(JSON.stringify(decoded.header, null, 2));

    // Payload
    lines.push('\nPAYLOAD:');
    const formattedPayload = { ...decoded.payload };

    // Format timestamps for readability
    if (formattedPayload.exp) {
      const expDate = new Date(formattedPayload.exp * 1000);
      (formattedPayload as Record<string, unknown>)['exp_formatted'] = expDate.toISOString();
    }
    if (formattedPayload.iat) {
      const iatDate = new Date(formattedPayload.iat * 1000);
      (formattedPayload as Record<string, unknown>)['iat_formatted'] = iatDate.toISOString();
    }
    if (formattedPayload.nbf) {
      const nbfDate = new Date(formattedPayload.nbf * 1000);
      (formattedPayload as Record<string, unknown>)['nbf_formatted'] = nbfDate.toISOString();
    }

    lines.push(JSON.stringify(formattedPayload, null, 2));

    // Signature
    lines.push('\nSIGNATURE:');
    lines.push(decoded.signature);

    // Status
    lines.push('\nSTATUS:');
    const isExpired = this.isExpired(decoded);
    const isNotYetValid = this.isNotYetValid(decoded);
    const timeUntilExpiry = this.getTimeUntilExpiry(decoded);

    if (isExpired) {
      lines.push('❌ Token is EXPIRED');
    } else if (isNotYetValid) {
      lines.push('⏳ Token is NOT YET VALID');
    } else {
      lines.push('✅ Token is VALID');
    }

    if (timeUntilExpiry !== null) {
      if (timeUntilExpiry > 0) {
        const hours = Math.floor(timeUntilExpiry / 3600);
        const minutes = Math.floor((timeUntilExpiry % 3600) / 60);
        const seconds = timeUntilExpiry % 60;
        lines.push(`⏰ Expires in: ${hours}h ${minutes}m ${seconds}s`);
      }
    }

    // Algorithm info
    lines.push(`\n🔐 Algorithm: ${decoded.header.alg}`);
    if (decoded.header.kid) {
      lines.push(`🔑 Key ID: ${decoded.header.kid}`);
    }

    // Raw token if requested
    if (includeRaw) {
      lines.push('\nRAW PARTS:');
      lines.push(`Header:    ${decoded.raw.header}`);
      lines.push(`Payload:   ${decoded.raw.payload}`);
      lines.push(`Signature: ${decoded.raw.signature}`);
    }

    lines.push('='.repeat(60));
    return lines.join('\n');
  }

  /**
   * Extract claims from a token
   */
  static getClaims(token: string | DecodedJWT): JWTPayload | null {
    const decoded = typeof token === 'string' ? this.decode(token) : token;
    return decoded ? decoded.payload : null;
  }

  /**
   * Check if token has a specific claim
   */
  static hasClaim(token: string | DecodedJWT, claim: string): boolean {
    const claims = this.getClaims(token);
    return claims ? claim in claims : false;
  }

  /**
   * Get a specific claim value
   */
  static getClaim<T = unknown>(token: string | DecodedJWT, claim: string): T | undefined {
    const claims = this.getClaims(token);
    return claims ? (claims[claim] as T) : undefined;
  }

  /**
   * Validate token structure (not signature)
   */
  static validateStructure(token: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check format
    const parts = token.split('.');
    if (parts.length !== 3) {
      errors.push('Token must have 3 parts separated by dots');
      return { valid: false, errors };
    }

    // Try to decode
    const decoded = this.decode(token);
    if (!decoded) {
      errors.push('Failed to decode token');
      return { valid: false, errors };
    }

    // Check required header fields
    if (!decoded.header.alg) {
      errors.push('Header missing required "alg" field');
    }

    // Check common payload fields
    if (decoded.payload.exp) {
      const exp = decoded.payload.exp;
      if (typeof exp !== 'number') {
        errors.push('Invalid "exp" claim - must be a number');
      } else if (exp < Math.floor(Date.now() / 1000)) {
        errors.push('Token is expired');
      }
    }

    if (decoded.payload.nbf) {
      const nbf = decoded.payload.nbf;
      if (typeof nbf !== 'number') {
        errors.push('Invalid "nbf" claim - must be a number');
      } else if (nbf > Math.floor(Date.now() / 1000)) {
        errors.push('Token is not yet valid');
      }
    }

    if (decoded.payload.iat) {
      const iat = decoded.payload.iat;
      if (typeof iat !== 'number') {
        errors.push('Invalid "iat" claim - must be a number');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
