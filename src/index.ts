/**
 * OAuth 2.0 Test Client
 * Main exports for the OAuth testing library
 */

// Core exports
export { OAuthClient } from './core/OAuthClient.js';
export { TokenManager } from './core/TokenManager.js';
export { ErrorHandler, OAuthClientError, OAuthErrorCode } from './core/ErrorHandler.js';

// Grant implementations
export { AuthorizationCodeGrant } from './grants/AuthorizationCode.js';
export { ClientCredentialsGrant } from './grants/ClientCredentials.js';
export { DeviceAuthorizationGrant } from './grants/DeviceAuthorization.js';
export { ImplicitGrant } from './grants/Implicit.js';
export { ResourceOwnerPasswordGrant } from './grants/ResourceOwnerPassword.js';
export { RefreshTokenGrant } from './grants/RefreshToken.js';

// Utilities
export { logger } from './utils/Logger.js';
export * from './utils/PKCEGenerator.js';
export { StateManager } from './utils/StateManager.js';
export { CallbackServer } from './utils/CallbackServer.js';
export { JWTDecoder } from './utils/JWTDecoder.js';
export type { DecodedJWT, JWTHeader, JWTPayload } from './utils/JWTDecoder.js';
export * from './utils/Validators.js';

// Configuration
export { ConfigLoader } from './config/ConfigLoader.js';
export { ProviderConfigManager } from './providers/ProviderConfig.js';
export type {
  AppConfig,
  ProviderConfig,
  ProviderPreset,
  ValidationResult,
} from './config/schema.js';

// Types
export * from './types/index.js';
