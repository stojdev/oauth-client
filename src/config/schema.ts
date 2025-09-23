/**
 * Configuration Schema for OAuth Providers
 * Defines the structure and validation rules for provider configurations
 */

import type { GrantType } from '../types/index.js';
import type { ClientAuthMethod } from '../utils/ClientAuth.js';

/**
 * Provider configuration schema
 */
export interface ProviderConfig {
  /** Provider identifier (e.g., 'google', 'github', 'custom') */
  id: string;

  /** Display name for the provider */
  name: string;

  /** Provider description */
  description?: string;

  /** OAuth 2.0 version supported (2.0 or 2.1) */
  oauthVersion?: '2.0' | '2.1';

  /** Authorization endpoint URL */
  authorizationUrl?: string;

  /** Token endpoint URL */
  tokenUrl: string;

  /** Device authorization endpoint URL (for device flow) */
  deviceAuthorizationUrl?: string;

  /** Token revocation endpoint URL */
  revocationUrl?: string;

  /** Token introspection endpoint URL */
  introspectionUrl?: string;

  /** UserInfo endpoint URL (for OIDC) */
  userInfoUrl?: string;

  /** JWKS URI for token validation */
  jwksUri?: string;

  /** OpenID Connect discovery URL */
  discoveryUrl?: string;

  /** Client ID */
  clientId: string;

  /** Client Secret (optional for public clients) */
  clientSecret?: string;

  /** Redirect URI(s) */
  redirectUri?: string | string[];

  /** Default scopes to request */
  scope?: string | string[];

  /** Supported grant types */
  supportedGrantTypes?: GrantType[];

  /** Client authentication methods supported */
  supportedAuthMethods?: ClientAuthMethod[];

  /** PKCE requirement - only S256 allowed per RFC 9700 */
  pkce?: {
    required: boolean;
    methods?: Array<'S256'>; // Only S256 allowed for security
  };

  /** Custom parameters for authorization request */
  customAuthParams?: Record<string, string>;

  /** Custom parameters for token request */
  customTokenParams?: Record<string, string>;

  /** Custom headers for requests */
  customHeaders?: Record<string, string>;

  /** Token endpoint auth method */
  tokenEndpointAuthMethod?: ClientAuthMethod;

  /** Response type for authorization code flow */
  responseType?: string;

  /** Response mode (query, fragment, form_post) */
  responseMode?: 'query' | 'fragment' | 'form_post';

  /** Additional provider-specific settings */
  additionalSettings?: Record<string, unknown>;

  /** Security settings */
  security?: {
    /** Use state parameter */
    useStateParam?: boolean;
    /** Use nonce parameter (for OIDC) */
    useNonce?: boolean;
    /** Validate issuer claim */
    validateIssuer?: boolean;
    /** Required token type */
    requiredTokenType?: string;
  };

  /** Rate limiting settings */
  rateLimiting?: {
    /** Max requests per minute */
    maxRequestsPerMinute?: number;
    /** Retry after rate limit hit */
    retryAfterRateLimit?: boolean;
  };

  /** Timeout settings (in milliseconds) */
  timeouts?: {
    /** Authorization timeout */
    authorization?: number;
    /** Token exchange timeout */
    tokenExchange?: number;
    /** API request timeout */
    apiRequest?: number;
  };
}

/**
 * Application configuration schema
 */
export interface AppConfig {
  /** Application version */
  version?: string;

  /** Default provider to use */
  defaultProvider?: string;

  /** List of configured providers */
  providers: ProviderConfig[];

  /** Global settings */
  global?: {
    /** Enable debug mode */
    debug?: boolean;
    /** Log level */
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    /** Token storage location */
    tokenStoragePath?: string;
    /** Encrypt tokens at rest */
    encryptTokens?: boolean;
    /** Proxy settings */
    proxy?: {
      host: string;
      port: number;
      protocol?: 'http' | 'https' | 'socks5';
      auth?: {
        username: string;
        password: string;
      };
    };
    /** SSL/TLS settings */
    tls?: {
      /** Reject unauthorized certificates */
      rejectUnauthorized?: boolean;
      /** Custom CA certificates */
      caCertPath?: string;
      /** Client certificate path */
      clientCertPath?: string;
      /** Client key path */
      clientKeyPath?: string;
    };
  };
}

/**
 * Environment variable mapping
 */
export interface EnvVarMapping {
  /** Environment variable name */
  envVar: string;
  /** Configuration path (e.g., 'providers.0.clientId') */
  configPath: string;
  /** Is this required? */
  required?: boolean;
  /** Transform function name */
  transform?: 'toLowerCase' | 'toUpperCase' | 'toBoolean' | 'toNumber' | 'toArray';
}

/**
 * Configuration source
 */
export enum ConfigSource {
  FILE = 'file',
  ENV = 'environment',
  CLI = 'cli',
  DEFAULT = 'default',
  DISCOVERY = 'discovery',
}

/**
 * Configuration validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  path: string;
  message: string;
  recommendation?: string;
}

/**
 * Provider preset template
 */
export interface ProviderPreset extends Omit<ProviderConfig, 'clientId' | 'clientSecret'> {
  /** Template variables that need to be filled */
  requiredFields: Array<keyof ProviderConfig>;
  /** Optional fields with defaults */
  optionalFields?: Partial<ProviderConfig>;
  /** Documentation URL */
  documentationUrl?: string;
  /** Setup instructions */
  setupInstructions?: string;
}

/**
 * JSON Schema for validation
 */
export const CONFIG_JSON_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['providers'],
  properties: {
    version: {
      type: 'string',
      pattern: '^\\d+\\.\\d+\\.\\d+$',
    },
    defaultProvider: {
      type: 'string',
    },
    providers: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['id', 'name', 'tokenUrl', 'clientId'],
        properties: {
          id: {
            type: 'string',
            pattern: '^[a-zA-Z0-9_-]+$',
          },
          name: {
            type: 'string',
          },
          description: {
            type: 'string',
          },
          oauthVersion: {
            type: 'string',
            enum: ['2.0', '2.1'],
          },
          authorizationUrl: {
            type: 'string',
            format: 'uri',
          },
          tokenUrl: {
            type: 'string',
            format: 'uri',
          },
          deviceAuthorizationUrl: {
            type: 'string',
            format: 'uri',
          },
          revocationUrl: {
            type: 'string',
            format: 'uri',
          },
          introspectionUrl: {
            type: 'string',
            format: 'uri',
          },
          userInfoUrl: {
            type: 'string',
            format: 'uri',
          },
          jwksUri: {
            type: 'string',
            format: 'uri',
          },
          discoveryUrl: {
            type: 'string',
            format: 'uri',
          },
          clientId: {
            type: 'string',
            minLength: 1,
          },
          clientSecret: {
            type: 'string',
          },
          redirectUri: {
            oneOf: [
              { type: 'string', format: 'uri' },
              {
                type: 'array',
                items: { type: 'string', format: 'uri' },
              },
            ],
          },
          scope: {
            oneOf: [
              { type: 'string' },
              {
                type: 'array',
                items: { type: 'string' },
              },
            ],
          },
          supportedGrantTypes: {
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'authorization_code',
                'client_credentials',
                'password',
                'refresh_token',
                'implicit',
                'urn:ietf:params:oauth:grant-type:device_code',
              ],
            },
          },
          supportedAuthMethods: {
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'client_secret_post',
                'client_secret_basic',
                'client_secret_jwt',
                'private_key_jwt',
                'none',
              ],
            },
          },
          pkce: {
            type: 'object',
            properties: {
              required: { type: 'boolean' },
              methods: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['S256'], // Only S256 allowed per RFC 9700
                },
              },
            },
          },
          customAuthParams: {
            type: 'object',
            additionalProperties: { type: 'string' },
          },
          customTokenParams: {
            type: 'object',
            additionalProperties: { type: 'string' },
          },
          customHeaders: {
            type: 'object',
            additionalProperties: { type: 'string' },
          },
          tokenEndpointAuthMethod: {
            type: 'string',
            enum: [
              'client_secret_post',
              'client_secret_basic',
              'client_secret_jwt',
              'private_key_jwt',
            ],
          },
          responseType: {
            type: 'string',
          },
          responseMode: {
            type: 'string',
            enum: ['query', 'fragment', 'form_post'],
          },
          additionalSettings: {
            type: 'object',
          },
          security: {
            type: 'object',
            properties: {
              useStateParam: { type: 'boolean' },
              useNonce: { type: 'boolean' },
              validateIssuer: { type: 'boolean' },
              requiredTokenType: { type: 'string' },
            },
          },
          rateLimiting: {
            type: 'object',
            properties: {
              maxRequestsPerMinute: { type: 'number', minimum: 1 },
              retryAfterRateLimit: { type: 'boolean' },
            },
          },
          timeouts: {
            type: 'object',
            properties: {
              authorization: { type: 'number', minimum: 1000 },
              tokenExchange: { type: 'number', minimum: 1000 },
              apiRequest: { type: 'number', minimum: 1000 },
            },
          },
        },
      },
    },
    global: {
      type: 'object',
      properties: {
        debug: { type: 'boolean' },
        logLevel: {
          type: 'string',
          enum: ['debug', 'info', 'warn', 'error'],
        },
        tokenStoragePath: { type: 'string' },
        encryptTokens: { type: 'boolean' },
        proxy: {
          type: 'object',
          required: ['host', 'port'],
          properties: {
            host: { type: 'string' },
            port: { type: 'number', minimum: 1, maximum: 65535 },
            protocol: {
              type: 'string',
              enum: ['http', 'https', 'socks5'],
            },
            auth: {
              type: 'object',
              required: ['username', 'password'],
              properties: {
                username: { type: 'string' },
                password: { type: 'string' },
              },
            },
          },
        },
        tls: {
          type: 'object',
          properties: {
            rejectUnauthorized: { type: 'boolean' },
            caCertPath: { type: 'string' },
            clientCertPath: { type: 'string' },
            clientKeyPath: { type: 'string' },
          },
        },
      },
    },
  },
};
