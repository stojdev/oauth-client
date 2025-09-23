import { AxiosRequestConfig } from 'axios';
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
   * Apply JWT Authentication (client_secret_jwt or private_key_jwt)
   * Not fully implemented - would require JWT creation logic
   */
  private static applyJWTAuth(
    config: AxiosRequestConfig,
    params: URLSearchParams,
    authConfig: ClientAuthConfig,
    keyType: 'client_secret' | 'private_key',
  ): AxiosRequestConfig {
    // For now, log that JWT auth is not implemented and fall back to Basic auth
    logger.warn(
      `JWT authentication (${keyType === 'client_secret' ? 'client_secret_jwt' : 'private_key_jwt'}) ` +
        'is not yet implemented. Falling back to Basic authentication.',
    );

    if (authConfig.clientSecret) {
      return this.applyBasicAuth(config, authConfig);
    } else {
      return this.applyPublicClientAuth(config, params, authConfig);
    }

    // TODO: Implement JWT assertion creation
    // const assertion = this.createJWTAssertion(authConfig, keyType);
    // params.set('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
    // params.set('client_assertion', assertion);
    // params.set('client_id', authConfig.clientId);
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

  // TODO: Implement JWT assertion creation for client_secret_jwt and private_key_jwt
  // private static createJWTAssertion(
  //   authConfig: ClientAuthConfig,
  //   keyType: 'client_secret' | 'private_key'
  // ): string {
  //   // This would create a JWT assertion per RFC 7523
  //   // For client_secret_jwt: sign with HMAC using client_secret
  //   // For private_key_jwt: sign with RSA/ECDSA using private_key
  //   throw new Error('JWT assertion creation not yet implemented');
  // }
}
