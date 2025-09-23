import axios from 'axios';
import { logger } from '../utils/Logger.js';
import type { ProviderConfig } from '../config/schema.js';

/**
 * OpenID Connect Discovery Document
 */
export interface OIDCDiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  jwks_uri?: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  response_modes_supported?: string[];
  grant_types_supported?: string[];
  subject_types_supported?: string[];
  id_token_signing_alg_values_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
  claims_supported?: string[];
  code_challenge_methods_supported?: string[];
  introspection_endpoint?: string;
  revocation_endpoint?: string;
  device_authorization_endpoint?: string;
  end_session_endpoint?: string;
  [key: string]: unknown;
}

/**
 * OAuth 2.0 Authorization Server Metadata (RFC 8414)
 */
export interface OAuth2Metadata extends OIDCDiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  token_endpoint_auth_methods_supported?: string[];
  token_endpoint_auth_signing_alg_values_supported?: string[];
  revocation_endpoint?: string;
  revocation_endpoint_auth_methods_supported?: string[];
  introspection_endpoint?: string;
  introspection_endpoint_auth_methods_supported?: string[];
  code_challenge_methods_supported?: string[];
}

/**
 * Discovery Client for auto-configuring OAuth providers
 */
export class DiscoveryClient {
  private static discoveryCache: Map<string, OIDCDiscoveryDocument> = new Map();
  private static readonly CACHE_TTL = 3600000; // 1 hour
  private static cacheTimestamps: Map<string, number> = new Map();

  /**
   * Discover OAuth/OIDC configuration from well-known endpoint
   */
  static async discover(issuerUrl: string): Promise<OIDCDiscoveryDocument> {
    const discoveryUrl = this.buildDiscoveryUrl(issuerUrl);

    // Check cache
    const cached = this.getCached(discoveryUrl);
    if (cached) {
      logger.debug('Using cached discovery document', { issuerUrl });
      return cached;
    }

    logger.info('Fetching discovery document', { discoveryUrl });

    try {
      const response = await axios.get<OIDCDiscoveryDocument>(discoveryUrl, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
        },
      });

      const document = response.data;

      // Validate required fields
      if (!document.issuer || !document.authorization_endpoint || !document.token_endpoint) {
        throw new Error('Invalid discovery document: missing required fields');
      }

      // Cache the document
      this.discoveryCache.set(discoveryUrl, document);
      this.cacheTimestamps.set(discoveryUrl, Date.now());

      logger.debug('Discovery successful', { issuer: document.issuer });
      return document;
    } catch (error) {
      logger.error('Discovery failed', error);
      throw new Error(`Failed to fetch discovery document from ${discoveryUrl}`);
    }
  }

  /**
   * Build discovery URL from issuer URL
   */
  private static buildDiscoveryUrl(issuerUrl: string): string {
    // Remove trailing slash
    const baseUrl = issuerUrl.replace(/\/$/, '');

    // Check if it's already a discovery URL
    if (baseUrl.endsWith('/.well-known/openid-configuration') ||
        baseUrl.endsWith('/.well-known/oauth-authorization-server')) {
      return baseUrl;
    }

    // Try OpenID Connect discovery first
    return `${baseUrl}/.well-known/openid-configuration`;
  }

  /**
   * Try OAuth 2.0 metadata discovery (RFC 8414)
   */
  static async discoverOAuth2(issuerUrl: string): Promise<OAuth2Metadata> {
    const baseUrl = issuerUrl.replace(/\/$/, '');
    const discoveryUrl = `${baseUrl}/.well-known/oauth-authorization-server`;

    // Check cache
    const cached = this.getCached(discoveryUrl);
    if (cached) {
      return cached as OAuth2Metadata;
    }

    logger.info('Fetching OAuth 2.0 metadata', { discoveryUrl });

    try {
      const response = await axios.get<OAuth2Metadata>(discoveryUrl, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
        },
      });

      const document = response.data;

      // Cache the document
      this.discoveryCache.set(discoveryUrl, document);
      this.cacheTimestamps.set(discoveryUrl, Date.now());

      return document;
    } catch (error) {
      // Fall back to OIDC discovery
      return this.discover(issuerUrl) as Promise<OAuth2Metadata>;
    }
  }

  /**
   * Get cached discovery document if not expired
   */
  private static getCached(url: string): OIDCDiscoveryDocument | null {
    const cached = this.discoveryCache.get(url);
    const timestamp = this.cacheTimestamps.get(url);

    if (cached && timestamp && (Date.now() - timestamp < this.CACHE_TTL)) {
      return cached;
    }

    return null;
  }

  /**
   * Create provider configuration from discovery document
   */
  static createConfigFromDiscovery(
    document: OIDCDiscoveryDocument,
    clientId: string,
    clientSecret?: string,
    additionalConfig?: Partial<ProviderConfig>
  ): ProviderConfig {
    // Map discovery fields to provider config
    const config: ProviderConfig = {
      id: new URL(document.issuer).hostname.split('.')[0],
      name: document.issuer,
      authorizationUrl: document.authorization_endpoint,
      tokenUrl: document.token_endpoint,
      clientId,
      clientSecret,
      ...additionalConfig,
    };

    // Optional endpoints
    if (document.userinfo_endpoint) {
      config.userInfoUrl = document.userinfo_endpoint;
    }
    if (document.jwks_uri) {
      config.jwksUri = document.jwks_uri;
    }
    if (document.revocation_endpoint) {
      config.revocationUrl = document.revocation_endpoint;
    }
    if (document.introspection_endpoint) {
      config.introspectionUrl = document.introspection_endpoint;
    }
    if (document.device_authorization_endpoint) {
      config.deviceAuthorizationUrl = document.device_authorization_endpoint;
    }

    // Determine supported grant types
    if (document.grant_types_supported) {
      config.supportedGrantTypes = document.grant_types_supported;
    }

    // Determine PKCE support
    if (document.code_challenge_methods_supported) {
      config.pkce = {
        required: true,
        methods: document.code_challenge_methods_supported,
      };
    }

    // Set default scopes for OIDC
    if (document.scopes_supported?.includes('openid')) {
      config.scope = 'openid profile email';
    }

    // Response types
    if (document.response_types_supported?.includes('code')) {
      config.responseType = 'code';
    }

    // Token endpoint auth methods
    if (document.token_endpoint_auth_methods_supported) {
      config.supportedAuthMethods = document.token_endpoint_auth_methods_supported;
    }

    return config;
  }

  /**
   * Auto-discover and configure provider
   */
  static async autoConfig(
    issuerUrl: string,
    clientId: string,
    clientSecret?: string,
    additionalConfig?: Partial<ProviderConfig>
  ): Promise<ProviderConfig> {
    try {
      // Try OIDC discovery first
      const document = await this.discover(issuerUrl);
      return this.createConfigFromDiscovery(document, clientId, clientSecret, additionalConfig);
    } catch (oidcError) {
      logger.debug('OIDC discovery failed, trying OAuth 2.0 metadata', { issuerUrl });

      try {
        // Try OAuth 2.0 metadata discovery
        const document = await this.discoverOAuth2(issuerUrl);
        return this.createConfigFromDiscovery(document, clientId, clientSecret, additionalConfig);
      } catch (oauth2Error) {
        logger.error('Both discovery methods failed', { issuerUrl, oidcError, oauth2Error });
        throw new Error(`Failed to auto-discover configuration for ${issuerUrl}`);
      }
    }
  }

  /**
   * Clear discovery cache
   */
  static clearCache(): void {
    this.discoveryCache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * Test if an issuer supports discovery
   */
  static async supportsDiscovery(issuerUrl: string): Promise<boolean> {
    try {
      await this.discover(issuerUrl);
      return true;
    } catch {
      try {
        await this.discoverOAuth2(issuerUrl);
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Get all supported features from discovery
   */
  static async getProviderFeatures(issuerUrl: string): Promise<{
    supportsOIDC: boolean;
    supportsPKCE: boolean;
    supportsDeviceFlow: boolean;
    supportsIntrospection: boolean;
    supportsRevocation: boolean;
    supportsRefreshTokens: boolean;
    grantTypes: string[];
    scopes: string[];
  }> {
    const document = await this.discover(issuerUrl);

    return {
      supportsOIDC: document.scopes_supported?.includes('openid') || false,
      supportsPKCE: !!document.code_challenge_methods_supported?.length,
      supportsDeviceFlow: !!document.device_authorization_endpoint,
      supportsIntrospection: !!document.introspection_endpoint,
      supportsRevocation: !!document.revocation_endpoint,
      supportsRefreshTokens: document.grant_types_supported?.includes('refresh_token') || false,
      grantTypes: document.grant_types_supported || [],
      scopes: document.scopes_supported || [],
    };
  }
}