import { AxiosRequestConfig } from 'axios';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { logger } from './Logger.js';

/**
 * Client Authentication Methods per RFC 6749
 */
export enum ClientAuthMethod {
  /** Authorization header with Basic scheme (RECOMMENDED) */
  ClientSecretBasic = 'client_secret_basic',
  /** Client credentials in request body (less secure) */
  ClientSecretPost = 'client_secret_post',
  /** Client assertion with shared secret (JWT) */
  ClientSecretJWT = 'client_secret_jwt',
  /** Client assertion with private key (JWT) */
  PrivateKeyJWT = 'private_key_jwt',
  /** No client authentication (public clients) */
  None = 'none',
}

export interface ClientAuthConfig {
  clientId: string;
  clientSecret?: string;
  authMethod?: ClientAuthMethod;
  privateKey?: string;
  tokenUrl?: string;
}

/**
 * Client Authentication Utility
 * Implements secure client authentication per RFC 6749 Section 2.3
 */
export class ClientAuth {
  /**
   * Apply client authentication to request configuration
   *
   * @param config Axios request configuration
   * @param params URLSearchParams for the request body
   * @param authConfig Client authentication configuration
   * @returns Modified request configuration
   */
  static applyClientAuth(
    config: AxiosRequestConfig,
    params: URLSearchParams,
    authConfig: ClientAuthConfig,
  ): AxiosRequestConfig {
    const method = authConfig.authMethod || ClientAuthMethod.ClientSecretBasic;

    switch (method) {
      case ClientAuthMethod.ClientSecretBasic:
        return this.applyBasicAuth(config, authConfig);

      case ClientAuthMethod.ClientSecretPost:
        return this.applyPostAuth(config, params, authConfig);

      case ClientAuthMethod.ClientSecretJWT:
        return this.applyJWTAuth(config, params, authConfig, 'client_secret');

      case ClientAuthMethod.PrivateKeyJWT:
        return this.applyJWTAuth(config, params, authConfig, 'private_key');

      case ClientAuthMethod.None:
        return this.applyPublicClientAuth(config, params, authConfig);

      default:
        logger.warn(`Unknown client authentication method: ${method}, falling back to Basic`);
        return this.applyBasicAuth(config, authConfig);
    }
  }

  /**
   * Apply Basic Authentication (RECOMMENDED per RFC 6749)
   * Authorization: Basic base64(client_id:client_secret)
   */
  private static applyBasicAuth(
    config: AxiosRequestConfig,
    authConfig: ClientAuthConfig,
  ): AxiosRequestConfig {
    if (!authConfig.clientSecret) {
      logger.warn(
        'Client secret is required for client_secret_basic authentication. ' +
          'Falling back to public client authentication.',
      );
      return this.applyPublicClientAuth(config, new URLSearchParams(), authConfig);
    }

    // Use Axios built-in Basic auth support
    const modifiedConfig = { ...config };
    modifiedConfig.auth = {
      username: authConfig.clientId,
      password: authConfig.clientSecret,
    };

    logger.debug('Applied Basic authentication (client_secret_basic)');
    return modifiedConfig;
  }

  /**
   * Apply POST Authentication (less secure, only if provider requires it)
   * Client credentials in request body
   */
  private static applyPostAuth(
    config: AxiosRequestConfig,
    params: URLSearchParams,
    authConfig: ClientAuthConfig,
  ): AxiosRequestConfig {
    if (!authConfig.clientSecret) {
      logger.warn(
        'Client secret is required for client_secret_post authentication. ' +
          'Falling back to public client authentication.',
      );
      return this.applyPublicClientAuth(config, params, authConfig);
    }

    logger.warn(
      'Using client_secret_post authentication. ' +
        'This is less secure than client_secret_basic and may expose credentials in logs.',
    );

    params.set('client_id', authConfig.clientId);
    params.set('client_secret', authConfig.clientSecret);

    logger.debug('Applied POST authentication (client_secret_post)');
    return config;
  }

  /**
   * Apply JWT Authentication (client_secret_jwt or private_key_jwt) per RFC 7523
   */
  private static applyJWTAuth(
    config: AxiosRequestConfig,
    params: URLSearchParams,
    authConfig: ClientAuthConfig,
    keyType: 'client_secret' | 'private_key',
  ): AxiosRequestConfig {
    try {
      // Create JWT assertion per RFC 7523
      const assertion = this.createJWTAssertion(authConfig, keyType);

      // Add JWT assertion to request parameters
      params.set('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
      params.set('client_assertion', assertion);
      params.set('client_id', authConfig.clientId);

      // Ensure data is properly set
      config.data = params.toString();

      logger.debug(
        `Applied ${keyType === 'client_secret' ? 'client_secret_jwt' : 'private_key_jwt'} authentication`,
      );

      return config;
    } catch (error) {
      // If JWT creation fails, throw error instead of falling back
      logger.error(`Failed to create JWT assertion for ${keyType} authentication`, error);
      throw new Error(
        `Failed to apply ${keyType === 'client_secret' ? 'client_secret_jwt' : 'private_key_jwt'} authentication: ` +
          (error instanceof Error ? error.message : 'Unknown error'),
      );
    }
  }

  /**
   * Apply Public Client Authentication (no client secret)
   * Only client_id in request body
   */
  private static applyPublicClientAuth(
    config: AxiosRequestConfig,
    params: URLSearchParams,
    authConfig: ClientAuthConfig,
  ): AxiosRequestConfig {
    params.set('client_id', authConfig.clientId);

    logger.debug('Applied public client authentication (client_id only)');
    return config;
  }

  /**
   * Get the recommended authentication method for a provider
   * Based on provider capabilities and security best practices
   */
  static getRecommendedAuthMethod(
    supportedMethods?: ClientAuthMethod[],
    hasClientSecret = false,
  ): ClientAuthMethod {
    if (!supportedMethods) {
      // No provider specification, use RFC 6749 defaults
      return hasClientSecret ? ClientAuthMethod.ClientSecretBasic : ClientAuthMethod.None;
    }

    // Prefer methods in order of security (best to worst)
    const preferenceOrder = [
      ClientAuthMethod.PrivateKeyJWT,
      ClientAuthMethod.ClientSecretJWT,
      ClientAuthMethod.ClientSecretBasic,
      ClientAuthMethod.ClientSecretPost,
      ClientAuthMethod.None,
    ];

    for (const preferred of preferenceOrder) {
      if (supportedMethods.includes(preferred)) {
        // Check if we have the required credentials
        if (
          (preferred === ClientAuthMethod.ClientSecretBasic ||
            preferred === ClientAuthMethod.ClientSecretPost ||
            preferred === ClientAuthMethod.ClientSecretJWT) &&
          !hasClientSecret
        ) {
          continue; // Skip methods requiring client secret if we don't have one
        }

        return preferred;
      }
    }

    // Fallback to Basic if client secret is available, otherwise None
    return hasClientSecret ? ClientAuthMethod.ClientSecretBasic : ClientAuthMethod.None;
  }

  /**
   * Validate authentication configuration
   */
  static validateAuthConfig(authConfig: ClientAuthConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!authConfig.clientId) {
      errors.push('Client ID is required');
    }

    const method = authConfig.authMethod || ClientAuthMethod.ClientSecretBasic;

    switch (method) {
      case ClientAuthMethod.ClientSecretBasic:
      case ClientAuthMethod.ClientSecretPost:
      case ClientAuthMethod.ClientSecretJWT:
        if (!authConfig.clientSecret) {
          errors.push(`Client secret is required for ${method} authentication`);
        }
        break;

      case ClientAuthMethod.PrivateKeyJWT:
        if (!authConfig.privateKey) {
          errors.push('Private key is required for private_key_jwt authentication');
        }
        if (!authConfig.tokenUrl) {
          errors.push('Token URL is required for JWT authentication (for audience claim)');
        }
        break;

      case ClientAuthMethod.None:
        // No additional validation needed for public clients
        break;

      default:
        errors.push(`Unknown authentication method: ${method}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create JWT assertion for client authentication per RFC 7523
   */
  private static createJWTAssertion(
    authConfig: ClientAuthConfig,
    keyType: 'client_secret' | 'private_key',
  ): string {
    if (!authConfig.tokenUrl) {
      throw new Error('Token URL is required for JWT assertion creation');
    }

    // Generate JWT ID (jti) - unique identifier for the JWT
    const jti = crypto.randomBytes(16).toString('hex');

    // Current time in seconds
    const now = Math.floor(Date.now() / 1000);

    // JWT payload per RFC 7523
    const payload = {
      iss: authConfig.clientId, // Issuer: client_id
      sub: authConfig.clientId, // Subject: client_id
      aud: authConfig.tokenUrl, // Audience: token endpoint URL
      jti, // JWT ID: unique identifier
      exp: now + 60, // Expiration: 1 minute from now
      iat: now, // Issued at: current time
    };

    if (keyType === 'client_secret') {
      // client_secret_jwt: Sign with HMAC using client_secret
      if (!authConfig.clientSecret) {
        throw new Error('Client secret is required for client_secret_jwt authentication');
      }

      // Use HS256 (HMAC with SHA-256) as the default algorithm
      const token = jwt.sign(payload, authConfig.clientSecret, {
        algorithm: 'HS256',
        noTimestamp: true, // We're setting iat manually
      });

      logger.debug('Created JWT assertion with client_secret_jwt (HS256)');
      return token;
    } else {
      // private_key_jwt: Sign with RSA or ECDSA using private key
      if (!authConfig.privateKey) {
        throw new Error('Private key is required for private_key_jwt authentication');
      }

      // Detect key type and use appropriate algorithm
      let algorithm: jwt.Algorithm = 'RS256'; // Default to RS256

      if (authConfig.privateKey.includes('BEGIN EC PRIVATE KEY')) {
        algorithm = 'ES256'; // ECDSA with P-256 and SHA-256
      } else if (
        authConfig.privateKey.includes('BEGIN RSA PRIVATE KEY') ||
        authConfig.privateKey.includes('BEGIN PRIVATE KEY')
      ) {
        algorithm = 'RS256'; // RSA with SHA-256
      }

      const token = jwt.sign(payload, authConfig.privateKey, {
        algorithm,
        noTimestamp: true, // We're setting iat manually
      });

      logger.debug(`Created JWT assertion with private_key_jwt (${algorithm})`);
      return token;
    }
  }
}
