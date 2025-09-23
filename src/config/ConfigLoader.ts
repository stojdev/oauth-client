import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';
import yaml from 'js-yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { logger } from '../utils/Logger.js';
import type {
  AppConfig,
  ProviderConfig,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  EnvVarMapping,
} from './schema.js';
import { CONFIG_JSON_SCHEMA } from './schema.js';

/**
 * Configuration Loader
 * Handles loading, merging, and validating OAuth provider configurations
 */
export class ConfigLoader {
  private config?: AppConfig;
  private configPath?: string;
  private ajv: Ajv;
  private envMappings: EnvVarMapping[] = [];

  constructor() {
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(this.ajv);
    this.initializeEnvMappings();
  }

  /**
   * Initialize environment variable mappings
   */
  private initializeEnvMappings(): void {
    this.envMappings = [
      // Global settings
      { envVar: 'OAUTH_DEBUG', configPath: 'global.debug', transform: 'toBoolean' },
      { envVar: 'OAUTH_LOG_LEVEL', configPath: 'global.logLevel', transform: 'toLowerCase' },
      { envVar: 'OAUTH_TOKEN_STORAGE_PATH', configPath: 'global.tokenStoragePath' },
      {
        envVar: 'OAUTH_ENCRYPT_TOKENS',
        configPath: 'global.encryptTokens',
        transform: 'toBoolean',
      },

      // Proxy settings
      { envVar: 'OAUTH_PROXY_HOST', configPath: 'global.proxy.host' },
      { envVar: 'OAUTH_PROXY_PORT', configPath: 'global.proxy.port', transform: 'toNumber' },
      {
        envVar: 'OAUTH_PROXY_PROTOCOL',
        configPath: 'global.proxy.protocol',
        transform: 'toLowerCase',
      },
      { envVar: 'OAUTH_PROXY_USERNAME', configPath: 'global.proxy.auth.username' },
      { envVar: 'OAUTH_PROXY_PASSWORD', configPath: 'global.proxy.auth.password' },

      // TLS settings
      {
        envVar: 'OAUTH_TLS_REJECT_UNAUTHORIZED',
        configPath: 'global.tls.rejectUnauthorized',
        transform: 'toBoolean',
      },
      { envVar: 'OAUTH_TLS_CA_CERT_PATH', configPath: 'global.tls.caCertPath' },
      { envVar: 'OAUTH_TLS_CLIENT_CERT_PATH', configPath: 'global.tls.clientCertPath' },
      { envVar: 'OAUTH_TLS_CLIENT_KEY_PATH', configPath: 'global.tls.clientKeyPath' },

      // Default provider settings (these override the first provider if no specific provider is set)
      { envVar: 'OAUTH_CLIENT_ID', configPath: 'providers.0.clientId', required: false },
      { envVar: 'OAUTH_CLIENT_SECRET', configPath: 'providers.0.clientSecret', required: false },
      { envVar: 'OAUTH_REDIRECT_URI', configPath: 'providers.0.redirectUri' },
      { envVar: 'OAUTH_SCOPE', configPath: 'providers.0.scope' },
      { envVar: 'OAUTH_AUTHORIZATION_URL', configPath: 'providers.0.authorizationUrl' },
      { envVar: 'OAUTH_TOKEN_URL', configPath: 'providers.0.tokenUrl' },
    ];
  }

  /**
   * Load configuration from multiple sources
   */
  async load(options?: {
    configFile?: string;
    provider?: string;
    overrides?: Partial<ProviderConfig>;
  }): Promise<AppConfig> {
    // 1. Load from file
    let config = this.loadFromFile(options?.configFile);

    // 2. Apply environment variable overrides
    config = this.applyEnvironmentVariables(config);

    // 3. Apply CLI overrides if provided
    if (options?.overrides) {
      config = this.applyOverrides(config, options.overrides, options.provider);
    }

    // 4. Validate configuration
    const validation = this.validate(config);
    if (!validation.valid) {
      throw new Error(
        `Configuration validation failed:\n${validation.errors.map((e) => `  - ${e.path}: ${e.message}`).join('\n')}`,
      );
    }

    // 5. Log warnings
    if (validation.warnings.length > 0) {
      validation.warnings.forEach((w) => {
        logger.warn(`Config warning - ${w.path}: ${w.message}`);
        if (w.recommendation) {
          logger.info(`  Recommendation: ${w.recommendation}`);
        }
      });
    }

    this.config = config;
    return config;
  }

  /**
   * Load configuration from file
   */
  private loadFromFile(configFile?: string): AppConfig {
    const configPaths = this.getConfigPaths(configFile);

    for (const path of configPaths) {
      if (existsSync(path)) {
        logger.debug(`Loading configuration from: ${path}`);
        const content = readFileSync(path, 'utf-8');
        const ext = path.split('.').pop()?.toLowerCase();

        try {
          if (ext === 'json') {
            this.configPath = path;
            return JSON.parse(content) as AppConfig;
          } else if (ext === 'yaml' || ext === 'yml') {
            this.configPath = path;
            return yaml.load(content) as AppConfig;
          }
        } catch (error) {
          throw new Error(
            `Failed to parse configuration file ${path}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }

    // Return default configuration if no file found
    logger.debug('No configuration file found, using defaults');
    return this.getDefaultConfig();
  }

  /**
   * Get potential configuration file paths
   */
  private getConfigPaths(configFile?: string): string[] {
    const paths: string[] = [];

    if (configFile) {
      paths.push(resolve(configFile));
    }

    // Check common locations
    paths.push(
      resolve('oauth-config.json'),
      resolve('oauth-config.yaml'),
      resolve('oauth-config.yml'),
      resolve('.oauth-config.json'),
      resolve('.oauth-config.yaml'),
      resolve('.oauth-config.yml'),
      join(homedir(), '.oauth', 'config.json'),
      join(homedir(), '.oauth', 'config.yaml'),
      join(homedir(), '.oauth', 'config.yml'),
      resolve('config', 'oauth.json'),
      resolve('config', 'oauth.yaml'),
      resolve('config', 'oauth.yml'),
    );

    return paths;
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): AppConfig {
    return {
      version: '1.0.0',
      providers: [],
      global: {
        debug: false,
        logLevel: 'info',
        tokenStoragePath: join(homedir(), '.oauth', 'tokens'),
        encryptTokens: true,
      },
    };
  }

  /**
   * Apply environment variable overrides
   */
  private applyEnvironmentVariables(config: AppConfig): AppConfig {
    const result = JSON.parse(JSON.stringify(config)) as AppConfig; // Deep clone

    for (const mapping of this.envMappings) {
      const value = process.env[mapping.envVar];
      if (value !== undefined) {
        const transformedValue = this.transformValue(value, mapping.transform);
        this.setNestedProperty(
          result as unknown as Record<string, unknown>,
          mapping.configPath,
          transformedValue,
        );
        logger.debug(`Applied env var ${mapping.envVar} to ${mapping.configPath}`);
      }
    }

    // Handle provider-specific environment variables
    this.applyProviderEnvVars(
      result as unknown as Record<string, unknown> & { providers: ProviderConfig[] },
    );

    return result;
  }

  /**
   * Apply provider-specific environment variables
   */
  private applyProviderEnvVars(
    config: Record<string, unknown> & { providers: ProviderConfig[] },
  ): void {
    // Check for provider-specific env vars (e.g., OAUTH_GOOGLE_CLIENT_ID)
    const providerEnvPattern = /^OAUTH_([A-Z]+)_(.+)$/;

    for (const [key, value] of Object.entries(process.env)) {
      const match = key.match(providerEnvPattern);
      if (match) {
        const [, providerName, setting] = match;
        const providerId = providerName.toLowerCase();

        // Find or create provider
        let provider = config.providers.find((p) => p.id === providerId);
        if (!provider) {
          provider = {
            id: providerId,
            name: providerId,
            clientId: '',
            tokenUrl: '',
          };
          config.providers.push(provider);
        }

        // Map setting to provider property
        const settingKey = this.envKeyToConfigKey(setting);
        if (settingKey && value) {
          (provider as unknown as Record<string, unknown>)[settingKey] = value;
        }
      }
    }
  }

  /**
   * Convert environment variable key to config key
   */
  private envKeyToConfigKey(envKey: string): string {
    return envKey
      .toLowerCase()
      .split('_')
      .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
      .join('');
  }

  /**
   * Transform value based on type
   */
  private transformValue(value: string, transform?: string): unknown {
    switch (transform) {
      case 'toBoolean':
        return value.toLowerCase() === 'true' || value === '1';
      case 'toNumber':
        return parseInt(value, 10);
      case 'toLowerCase':
        return value.toLowerCase();
      case 'toUpperCase':
        return value.toUpperCase();
      case 'toArray':
        return value.split(',').map((s) => s.trim());
      default:
        return value;
    }
  }

  /**
   * Set nested property in object
   */
  private setNestedProperty(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];

      // Handle array indices
      if (key.match(/^\d+$/)) {
        const index = parseInt(key, 10);
        if (!Array.isArray(current)) {
          return; // Can't set array index on non-array
        }
        if (!current[index]) {
          current[index] = {} as Record<string, unknown>;
        }
        current = current[index] as Record<string, unknown>;
      } else {
        if (!(key in current) || typeof current[key] !== 'object') {
          current[key] = {};
        }
        current = current[key] as Record<string, unknown>;
      }
    }

    const lastKey = keys[keys.length - 1];
    current[lastKey] = value;
  }

  /**
   * Apply CLI overrides
   */
  private applyOverrides(
    config: AppConfig,
    overrides: Partial<ProviderConfig>,
    providerId?: string,
  ): AppConfig {
    const result = JSON.parse(JSON.stringify(config)) as AppConfig; // Deep clone

    if (providerId) {
      const provider = result.providers.find((p) => p.id === providerId);
      if (provider) {
        Object.assign(provider, overrides);
      }
    } else if (result.providers.length > 0) {
      // Apply to default/first provider
      Object.assign(result.providers[0], overrides);
    }

    return result;
  }

  /**
   * Validate configuration
   */
  validate(config: AppConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // JSON Schema validation
    const validate = this.ajv.compile(CONFIG_JSON_SCHEMA);
    const valid = validate(config);

    if (!valid && validate.errors) {
      validate.errors.forEach((error) => {
        errors.push({
          path: error.instancePath || 'root',
          message: error.message || 'Unknown validation error',
          value: error.data,
        });
      });
    }

    // Additional business logic validation
    config.providers.forEach((provider, index) => {
      const path = `providers[${index}]`;

      // Check for deprecated features
      if (provider.supportedGrantTypes?.includes('implicit' as never)) {
        warnings.push({
          path: `${path}.supportedGrantTypes`,
          message: 'Provider supports deprecated Implicit grant',
          recommendation: 'Consider migrating to Authorization Code with PKCE',
        });
      }

      // Check for missing PKCE
      if (
        provider.supportedGrantTypes?.includes('authorization_code' as never) &&
        !provider.pkce?.required
      ) {
        warnings.push({
          path: `${path}.pkce`,
          message: 'PKCE not required for Authorization Code grant',
          recommendation: 'Enable PKCE for enhanced security',
        });
      }

      // Check for plain text client secret
      if (provider.clientSecret && !config.global?.encryptTokens) {
        warnings.push({
          path: `${path}.clientSecret`,
          message: 'Client secret stored without encryption',
          recommendation: 'Enable token encryption in global settings',
        });
      }

      // Validate OAuth URLs
      if (provider.authorizationUrl && !this.isValidUrl(provider.authorizationUrl)) {
        errors.push({
          path: `${path}.authorizationUrl`,
          message: 'Invalid authorization URL',
          value: provider.authorizationUrl,
        });
      }

      if (!this.isValidUrl(provider.tokenUrl)) {
        errors.push({
          path: `${path}.tokenUrl`,
          message: 'Invalid token URL',
          value: provider.tokenUrl,
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get provider configuration by ID
   */
  getProvider(providerId: string): ProviderConfig | undefined {
    return this.config?.providers.find((p) => p.id === providerId);
  }

  /**
   * Get all providers
   */
  getAllProviders(): ProviderConfig[] {
    return this.config?.providers || [];
  }

  /**
   * Get global configuration
   */
  getGlobalConfig(): AppConfig['global'] {
    return this.config?.global;
  }

  /**
   * Save configuration to file
   */
  async save(path?: string): Promise<void> {
    if (!this.config) {
      throw new Error('No configuration loaded');
    }

    const savePath = path || this.configPath || resolve('oauth-config.json');
    const ext = savePath.split('.').pop()?.toLowerCase();

    let content: string;
    if (ext === 'yaml' || ext === 'yml') {
      content = yaml.dump(this.config, { indent: 2 });
    } else {
      content = JSON.stringify(this.config, null, 2);
    }

    const { writeFileSync, mkdirSync } = await import('fs');
    const dir = savePath.substring(0, savePath.lastIndexOf('/'));

    mkdirSync(dir, { recursive: true });
    writeFileSync(savePath, content, 'utf-8');

    logger.info(`Configuration saved to: ${savePath}`);
  }

  /**
   * Add or update a provider
   */
  addProvider(provider: ProviderConfig): void {
    if (!this.config) {
      this.config = this.getDefaultConfig();
    }

    const existingIndex = this.config.providers.findIndex((p) => p.id === provider.id);
    if (existingIndex >= 0) {
      this.config.providers[existingIndex] = provider;
      logger.info(`Updated provider: ${provider.id}`);
    } else {
      this.config.providers.push(provider);
      logger.info(`Added provider: ${provider.id}`);
    }
  }

  /**
   * Remove a provider
   */
  removeProvider(providerId: string): boolean {
    if (!this.config) {
      return false;
    }

    const index = this.config.providers.findIndex((p) => p.id === providerId);
    if (index >= 0) {
      this.config.providers.splice(index, 1);
      logger.info(`Removed provider: ${providerId}`);
      return true;
    }

    return false;
  }
}
