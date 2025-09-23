import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { ProviderConfig, ProviderPreset } from '../config/schema.js';
import { logger } from '../utils/Logger.js';

// Get current module directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Provider Configuration Manager
 * Manages provider presets and configurations
 */
export class ProviderConfigManager {
  private presets: Map<string, ProviderPreset> = new Map();

  constructor() {
    this.loadPresets();
  }

  /**
   * Load provider presets from JSON file
   */
  private loadPresets(): void {
    try {
      const presetsPath = join(__dirname, 'providers.json');
      const content = readFileSync(presetsPath, 'utf-8');
      const data = JSON.parse(content);

      for (const [key, preset] of Object.entries(data.providers)) {
        this.presets.set(key, preset as ProviderPreset);
      }

      logger.debug(`Loaded ${this.presets.size} provider presets`);
    } catch (error) {
      logger.error('Failed to load provider presets', error);
    }
  }

  /**
   * Get a provider preset by ID
   */
  getPreset(providerId: string): ProviderPreset | undefined {
    return this.presets.get(providerId);
  }

  /**
   * Get all available presets
   */
  getAllPresets(): Map<string, ProviderPreset> {
    return this.presets;
  }

  /**
   * List available provider IDs
   */
  listProviderIds(): string[] {
    return Array.from(this.presets.keys());
  }

  /**
   * Create provider configuration from preset
   */
  createFromPreset(
    providerId: string,
    userConfig: {
      clientId: string;
      clientSecret?: string;
      redirectUri?: string;
      domain?: string;
      region?: string;
      realm?: string;
      tenant?: string;
      userPoolId?: string;
      [key: string]: unknown;
    },
  ): ProviderConfig {
    const preset = this.getPreset(providerId);
    if (!preset) {
      throw new Error(`Provider preset '${providerId}' not found`);
    }

    // Deep clone preset
    const config = JSON.parse(JSON.stringify(preset)) as ProviderConfig;

    // Apply user configuration
    Object.assign(config, userConfig);

    // Process template variables in URLs
    const templateVars = {
      domain: userConfig.domain || (preset.additionalSettings as Record<string, unknown>)?.domain,
      region: userConfig.region || (preset.additionalSettings as Record<string, unknown>)?.region,
      realm:
        userConfig.realm ||
        (preset.additionalSettings as Record<string, unknown>)?.realm ||
        'master',
      tenant:
        userConfig.tenant ||
        (preset.additionalSettings as Record<string, unknown>)?.tenant ||
        'common',
      userPoolId: userConfig.userPoolId,
    };

    // Replace template variables in URLs
    config.authorizationUrl = this.replaceTemplates(config.authorizationUrl, templateVars);
    config.tokenUrl = this.replaceTemplates(config.tokenUrl, templateVars) || config.tokenUrl;
    config.deviceAuthorizationUrl = this.replaceTemplates(
      config.deviceAuthorizationUrl,
      templateVars,
    );
    config.revocationUrl = this.replaceTemplates(config.revocationUrl, templateVars);
    config.introspectionUrl = this.replaceTemplates(config.introspectionUrl, templateVars);
    config.userInfoUrl = this.replaceTemplates(config.userInfoUrl, templateVars);
    config.jwksUri = this.replaceTemplates(config.jwksUri, templateVars);
    config.discoveryUrl = this.replaceTemplates(config.discoveryUrl, templateVars);

    // Validate required fields
    const requiredFields = (preset as ProviderPreset).requiredFields || [];
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (!config[field as keyof ProviderConfig]) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      throw new Error(
        `Missing required fields for provider '${providerId}': ${missingFields.join(', ')}`,
      );
    }

    return config;
  }

  /**
   * Replace template variables in URL
   */
  private replaceTemplates(
    url: string | undefined,
    vars: Record<string, unknown>,
  ): string | undefined {
    if (!url) {
      return url;
    }

    let result = url;
    for (const [key, value] of Object.entries(vars)) {
      if (value !== undefined && value !== null) {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
      }
    }

    // Check for unresolved templates
    const unresolved = result.match(/\{[^}]+\}/g);
    if (unresolved) {
      logger.warn(`Unresolved template variables in URL: ${unresolved.join(', ')}`);
    }

    return result;
  }

  /**
   * Validate provider configuration
   */
  validateConfig(config: ProviderConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!config.id) {
      errors.push('Provider ID is required');
    }
    if (!config.name) {
      errors.push('Provider name is required');
    }
    if (!config.tokenUrl) {
      errors.push('Token URL is required');
    }
    if (!config.clientId) {
      errors.push('Client ID is required');
    }

    // Check for authorization code grant requirements
    if (config.supportedGrantTypes?.includes('authorization_code' as never)) {
      if (!config.authorizationUrl) {
        errors.push('Authorization URL is required for authorization_code grant');
      }
      if (!config.redirectUri) {
        errors.push('Redirect URI is required for authorization_code grant');
      }
    }

    // Check for device flow requirements
    if (
      config.supportedGrantTypes?.includes('urn:ietf:params:oauth:grant-type:device_code' as never)
    ) {
      if (!config.deviceAuthorizationUrl) {
        errors.push('Device authorization URL is required for device flow');
      }
    }

    // Validate URLs
    const urlFields: Array<keyof ProviderConfig> = [
      'authorizationUrl',
      'tokenUrl',
      'deviceAuthorizationUrl',
      'revocationUrl',
      'introspectionUrl',
      'userInfoUrl',
      'jwksUri',
      'discoveryUrl',
    ];

    for (const field of urlFields) {
      const url = config[field];
      if (url && typeof url === 'string' && !url.includes('{')) {
        try {
          new URL(url);
        } catch {
          errors.push(`Invalid URL in ${field}: ${url}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get provider documentation
   */
  getProviderDocs(providerId: string): { documentation?: string; setup?: string } | undefined {
    const preset = this.getPreset(providerId);
    if (!preset) {
      return undefined;
    }

    return {
      documentation: (preset as unknown as { documentationUrl?: string }).documentationUrl,
      setup: (preset as unknown as { setupInstructions?: string }).setupInstructions,
    };
  }

  /**
   * Check if provider supports a specific grant type
   */
  supportsGrantType(providerId: string, grantType: string): boolean {
    const preset = this.getPreset(providerId);
    if (!preset) {
      return false;
    }

    return preset.supportedGrantTypes?.includes(grantType as never) || false;
  }

  /**
   * Get recommended configuration for a provider
   */
  getRecommendedConfig(providerId: string): Partial<ProviderConfig> {
    const preset = this.getPreset(providerId);
    if (!preset) {
      return {};
    }

    const recommended: Partial<ProviderConfig> = {
      pkce: preset.pkce,
      scope: preset.scope,
      responseType: preset.responseType,
      responseMode: preset.responseMode,
      customAuthParams: preset.customAuthParams,
      customTokenParams: preset.customTokenParams,
      customHeaders: preset.customHeaders,
    };

    // Remove undefined values
    Object.keys(recommended).forEach((key) => {
      if (recommended[key as keyof ProviderConfig] === undefined) {
        delete recommended[key as keyof ProviderConfig];
      }
    });

    return recommended;
  }
}
