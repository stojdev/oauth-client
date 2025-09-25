/**
 * OAuth 2.0 Type Definitions
 */

import type { ClientAuthMethod } from '../utils/ClientAuth.js';

export interface OAuthConfig {
  clientId: string;
  clientSecret?: string;
  authorizationUrl: string;
  tokenUrl: string;
  redirectUri?: string;
  scope?: string | string[];
  state?: string;
  responseType?: 'code' | 'token';
  grantType?: GrantType;
  authMethod?: ClientAuthMethod;
  privateKey?: string;
}

export enum GrantType {
  AuthorizationCode = 'authorization_code',
  ClientCredentials = 'client_credentials',
  ResourceOwnerPassword = 'password',
  RefreshToken = 'refresh_token',
  Implicit = 'implicit',
  DeviceCode = 'urn:ietf:params:oauth:grant-type:device_code',
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}

export interface OAuthError {
  error: string;
  error_description?: string;
  error_uri?: string;
  state?: string;
}

export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  method: 'S256'; // Only S256 allowed per RFC 9700
}

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval?: number;
}

export interface ProviderConfig {
  name: string;
  displayName: string;
  clientId?: string;
  clientSecret?: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl?: string;
  revocationUrl?: string;
  introspectionUrl?: string;
  discoveryUrl?: string;
  scopes?: Record<string, string>;
  defaultScopes?: string[];
  authMethod?: ClientAuthMethod;
  supportedAuthMethods?: ClientAuthMethod[];
}

export interface StoredToken extends TokenResponse {
  provider: string;
  createdAt: number;
  expiresAt?: number;
}
