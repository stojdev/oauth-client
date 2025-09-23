import { OAuthClient } from '../core/OAuthClient.js';
import { ErrorHandler, OAuthClientError } from '../core/ErrorHandler.js';
import { GrantType } from '../types/index.js';
import type { OAuthConfig, TokenResponse, DeviceCodeResponse } from '../types/index.js';
import { logger } from '../utils/Logger.js';

export interface DeviceAuthorizationConfig extends OAuthConfig {
  deviceAuthorizationUrl: string;
  onUserCode?: (response: DeviceCodeResponse) => void;
}

/**
 * Device Authorization Grant Implementation (RFC 8628)
 * For devices with limited input capabilities
 */
export class DeviceAuthorizationGrant extends OAuthClient {
  protected config: DeviceAuthorizationConfig;
  private deviceCode?: string;
  private interval = 5; // Default polling interval in seconds

  constructor(config: DeviceAuthorizationConfig) {
    super({
      ...config,
      grantType: GrantType.DeviceCode,
    });
    this.config = config;

    if (!config.deviceAuthorizationUrl) {
      throw new Error('Device authorization URL is required for Device Authorization grant');
    }
  }

  /**
   * Request device code and user code
   */
  private async requestDeviceCode(): Promise<DeviceCodeResponse> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
    });

    if (this.config.scope) {
      params.append('scope', this.config.scope.toString());
    }

    const response = await this.httpClient.post(
      this.config.deviceAuthorizationUrl,
      params.toString(),
    );

    const deviceResponse = response.data as DeviceCodeResponse;

    // Store device code and interval
    this.deviceCode = deviceResponse.device_code;
    this.interval = deviceResponse.interval || 5;

    return deviceResponse;
  }

  /**
   * Poll for token after user authorization
   */
  private async pollForToken(): Promise<TokenResponse> {
    if (!this.deviceCode) {
      throw new Error('Device code not available');
    }

    const params = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      device_code: this.deviceCode,
    });

    // Keep polling until we get a token or error
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes with 5-second intervals

    while (attempts < maxAttempts) {
      try {
        // Use secure client authentication via base class
        return await this.makeTokenRequest(params);
      } catch (error) {
        if (error && typeof error === 'object' && 'response' in error) {
          const errorResponse = (error as { response?: { data?: { error?: string } } }).response;
          const errorCode = errorResponse?.data?.error;

          if (errorCode === 'authorization_pending') {
            // User hasn't authorized yet, continue polling
            logger.debug('Authorization pending, continuing to poll...');
          } else if (errorCode === 'slow_down') {
            // Increase polling interval
            this.interval = Math.min(this.interval * 2, 60);
            logger.debug(`Slowing down polling to ${this.interval} seconds`);
          } else if (errorCode === 'access_denied') {
            throw new OAuthClientError('User denied access');
          } else if (errorCode === 'expired_token') {
            throw new OAuthClientError('Device code expired');
          } else {
            // Unknown error
            throw error;
          }
        } else {
          throw error;
        }
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, this.interval * 1000));
      attempts++;
    }

    throw new OAuthClientError('Device authorization timeout');
  }

  /**
   * Start device authorization flow
   */
  async getAccessToken(): Promise<TokenResponse> {
    return ErrorHandler.wrap(async () => {
      logger.info('Starting device authorization flow...');

      // Request device code
      const deviceResponse = await this.requestDeviceCode();

      logger.info('Device authorization initiated');
      logger.info(`User Code: ${deviceResponse.user_code}`);
      logger.info(`Verification URL: ${deviceResponse.verification_uri}`);

      if (deviceResponse.verification_uri_complete) {
        logger.info(`Complete URL: ${deviceResponse.verification_uri_complete}`);
      }

      // Call user callback if provided
      if (this.config.onUserCode) {
        this.config.onUserCode(deviceResponse);
      } else {
        // Default display

        logger.info('\n========================================');

        logger.info('  DEVICE AUTHORIZATION');

        logger.info('========================================');

        logger.info(`  1. Visit: ${deviceResponse.verification_uri}`);

        logger.info(`  2. Enter code: ${deviceResponse.user_code}`);
        if (deviceResponse.verification_uri_complete) {
          logger.info(`\n  Or visit: ${deviceResponse.verification_uri_complete}`);
        }

        logger.info('========================================\n');
      }

      logger.info('Polling for authorization...');

      // Poll for token
      return await this.pollForToken();
    });
  }
}
