import chalk from 'chalk';
import { ProviderConfigManager } from '../../providers/ProviderConfig.js';
import { ConfigLoader } from '../../config/ConfigLoader.js';
import { ClientCredentialsGrant } from '../../grants/ClientCredentials.js';
import { ResourceOwnerPasswordGrant } from '../../grants/ResourceOwnerPassword.js';
import { JWTDecoder } from '../../utils/JWTDecoder.js';
import { JWTVerifier } from '../../utils/JWTVerifier.js';
import { logger } from '../../utils/Logger.js';
import type { ProviderConfig } from '../../config/schema.js';

interface TestResult {
  grantType: string;
  status: 'success' | 'failed' | 'skipped';
  message?: string;
  token?: string;
  duration?: number;
}

/**
 * Comprehensive OAuth provider testing
 */
export async function testCommand(
  provider: string,
  options: {
    config?: string;
    grants?: string;
    verbose?: boolean;
    clientId?: string;
    clientSecret?: string;
  },
): Promise<void> {
  const startTime = Date.now();
  const results: TestResult[] = [];

  // Set log level to debug in verbose mode
  if (options.verbose) {
    logger.level = 'debug';
  }

  try {
    logger.info(chalk.blue(`🧪 Testing OAuth Provider: ${provider}`));
    logger.info(chalk.gray('═'.repeat(50)));
    logger.info('');

    // Load configuration
    let providerConfig: ProviderConfig;

    // Try loading from config file first (explicit or default)
    try {
      const loader = new ConfigLoader();
      const config = await loader.load({ configFile: options.config, skipValidation: true });
      const foundProvider = config.providers.find((p) => p.id === provider);

      if (foundProvider) {
        providerConfig = foundProvider;
        // Override with CLI options if provided
        if (options.clientId) {
          providerConfig.clientId = options.clientId;
        }
        if (options.clientSecret) {
          providerConfig.clientSecret = options.clientSecret;
        }
      } else {
        // Provider not in config, try preset
        const manager = new ProviderConfigManager();
        providerConfig = manager.createFromPreset(provider, {
          clientId: options.clientId || process.env.OAUTH_CLIENT_ID || '',
          clientSecret: options.clientSecret || process.env.OAUTH_CLIENT_SECRET,
        });
      }
    } catch {
      // Config loading failed, try preset
      const manager = new ProviderConfigManager();
      providerConfig = manager.createFromPreset(provider, {
        clientId: options.clientId || process.env.OAUTH_CLIENT_ID || '',
        clientSecret: options.clientSecret || process.env.OAUTH_CLIENT_SECRET,
      });
    }

    // Determine which grant types to test
    let grantTypes: string[] = [];

    if (options.grants) {
      grantTypes = options.grants.split(',').map((g) => g.trim());
    } else if (providerConfig.supportedGrantTypes) {
      grantTypes = providerConfig.supportedGrantTypes;
    } else {
      // Default grant types
      grantTypes = ['client_credentials', 'authorization_code'];
    }

    logger.info(chalk.blue('Configuration:'));
    logger.info(chalk.gray(`  Provider: ${providerConfig.name || provider}`));
    logger.info(chalk.gray(`  Client ID: ${providerConfig.clientId?.substring(0, 10)}...`));
    logger.info(chalk.gray(`  Token URL: ${providerConfig.tokenUrl}`));
    if (providerConfig.authorizationUrl) {
      logger.info(chalk.gray(`  Auth URL: ${providerConfig.authorizationUrl}`));
    }
    logger.info('');

    logger.info(chalk.blue('Grant Types to Test:'));
    grantTypes.forEach((grant) => {
      logger.info(chalk.gray(`  • ${grant}`));
    });
    logger.info('');

    // Test each grant type
    for (const grantType of grantTypes) {
      await testGrantType(provider, grantType, providerConfig, results, options.verbose || false);
    }

    // Display summary
    logger.info('');
    logger.info(chalk.blue('═'.repeat(50)));
    logger.info(chalk.blue('Test Summary:'));
    logger.info('');

    const successCount = results.filter((r) => r.status === 'success').length;
    const failedCount = results.filter((r) => r.status === 'failed').length;
    const skippedCount = results.filter((r) => r.status === 'skipped').length;

    results.forEach((result) => {
      const icon = result.status === 'success' ? '✅' : result.status === 'failed' ? '❌' : '⏭️';
      const color =
        result.status === 'success'
          ? chalk.green
          : result.status === 'failed'
            ? chalk.red
            : chalk.gray;

      logger.info(`${icon} ${color(result.grantType)}`);
      if (result.message) {
        logger.info(chalk.gray(`   ${result.message}`));
      }
      if (result.duration) {
        logger.info(chalk.gray(`   Duration: ${result.duration}ms`));
      }
    });

    logger.info('');
    logger.info(chalk.blue('Statistics:'));
    logger.info(chalk.green(`  ✅ Passed: ${successCount}`));
    if (failedCount > 0) {
      logger.info(chalk.red(`  ❌ Failed: ${failedCount}`));
    }
    if (skippedCount > 0) {
      logger.info(chalk.gray(`  ⏭️  Skipped: ${skippedCount}`));
    }
    logger.info(chalk.gray(`  ⏱️  Total Duration: ${Date.now() - startTime}ms`));

    // Exit with appropriate code
    if (failedCount > 0) {
      process.exit(1);
    }
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(chalk.red(`✗ Test execution failed: ${errorMessage}`));
    process.exit(1);
  }
}

/**
 * Test a specific grant type
 */
async function testGrantType(
  _provider: string,
  grantType: string,
  config: ProviderConfig,
  results: TestResult[],
  verbose: boolean,
): Promise<void> {
  const startTime = Date.now();

  logger.info(chalk.blue(`Testing ${grantType}...`));

  if (verbose) {
    logger.info(chalk.gray(`  Grant Type: ${grantType}`));
    logger.info(chalk.gray(`  Token URL: ${config.tokenUrl}`));
    if (config.clientId) {
      logger.info(chalk.gray(`  Client ID: ${config.clientId.substring(0, 20)}...`));
    }
  }

  try {
    // Check if grant type is supported
    if (grantType === 'authorization_code') {
      logger.info(chalk.yellow('  ⚠ Authorization Code grant requires user interaction'));
      logger.info(chalk.gray('  Skipping automated test'));
      results.push({
        grantType,
        status: 'skipped',
        message: 'Requires user interaction',
      });
      return;
    }

    if (grantType === 'urn:ietf:params:oauth:grant-type:device_code') {
      logger.info(chalk.yellow('  ⚠ Device Code grant requires user interaction'));
      logger.info(chalk.gray('  Skipping automated test'));
      results.push({
        grantType,
        status: 'skipped',
        message: 'Requires user interaction',
      });
      return;
    }

    if (grantType === 'password') {
      if (!process.env.OAUTH_USERNAME || !process.env.OAUTH_PASSWORD) {
        logger.info(chalk.yellow('  ⚠ Password grant requires username/password'));
        logger.info(chalk.gray('  Set OAUTH_USERNAME and OAUTH_PASSWORD env vars'));
        results.push({
          grantType,
          status: 'skipped',
          message: 'Missing credentials',
        });
        return;
      }
    }

    // Test based on grant type
    let token: unknown;

    switch (grantType) {
      case 'client_credentials': {
        logger.info(chalk.gray('  Testing Client Credentials flow...'));
        const clientCredentials = new ClientCredentialsGrant({
          clientId: config.clientId,
          clientSecret: config.clientSecret!,
          tokenUrl: config.tokenUrl,
          authorizationUrl: config.authorizationUrl || '',
          scope: undefined,
        });
        token = await clientCredentials.getAccessToken();
        break;
      }

      case 'password': {
        logger.info(chalk.gray('  Testing Resource Owner Password flow...'));
        const passwordGrant = new ResourceOwnerPasswordGrant({
          clientId: config.clientId,
          clientSecret: config.clientSecret!,
          tokenUrl: config.tokenUrl,
          authorizationUrl: config.authorizationUrl || '',
          username: process.env.OAUTH_USERNAME!,
          password: process.env.OAUTH_PASSWORD!,
        });
        token = await passwordGrant.getAccessToken();
        break;
      }

      case 'refresh_token':
        logger.info(chalk.yellow('  ⚠ Refresh token requires existing token'));
        results.push({
          grantType,
          status: 'skipped',
          message: 'Requires existing refresh token',
        });
        return;

      case 'implicit':
        logger.info(chalk.yellow('  ⚠ Implicit grant is deprecated'));
        results.push({
          grantType,
          status: 'skipped',
          message: 'Deprecated grant type',
        });
        return;

      default: {
        const validGrantTypes = [
          'client_credentials',
          'password',
          'authorization_code',
          'refresh_token',
          'implicit',
          'urn:ietf:params:oauth:grant-type:device_code',
        ];
        logger.info(chalk.red(`  ✗ Unsupported grant type: ${grantType}`));
        logger.info(chalk.gray(`  Valid grant types: ${validGrantTypes.join(', ')}`));
        results.push({
          grantType,
          status: 'failed',
          message: `Unsupported grant type. Valid types: ${validGrantTypes.join(', ')}`,
          duration: Date.now() - startTime,
        });
        logger.info('');
        return;
      }
    }

    // Validate token
    if (!token || !(token as Record<string, unknown>).access_token) {
      throw new Error('No access token received');
    }

    logger.info(chalk.green(`  ✓ Token obtained successfully`));

    // Show token details in verbose mode
    if (verbose) {
      const tokenData = token as Record<string, unknown>;
      logger.info(
        chalk.gray(`  Access Token: ${(tokenData.access_token as string).substring(0, 50)}...`),
      );
      if (tokenData.token_type) {
        logger.info(chalk.gray(`  Token Type: ${tokenData.token_type}`));
      }
      if (tokenData.expires_in) {
        logger.info(chalk.gray(`  Expires In: ${tokenData.expires_in} seconds`));
      }
    }

    // Decode and validate JWT if possible
    try {
      // First check if it's a JWT format
      const verificationResult = await JWTVerifier.verify(
        (token as Record<string, unknown>).access_token as string,
        {
          // For demo purposes, we'll try to get JWKS from provider if available
          jwksUri: config.discoveryUrl
            ? `${config.discoveryUrl.replace('/.well-known/openid_configuration', '')}/.well-known/jwks.json`
            : undefined,
          // Allow common algorithms
          algorithms: ['RS256', 'RS384', 'RS512', 'HS256', 'HS384', 'HS512'],
          // Don't fail on missing audience/issuer for testing
          ignoreExpiration: false,
        },
      );

      if (verificationResult.isOpaque) {
        logger.info(chalk.gray(`  Token type: Opaque`));
      } else if (verificationResult.valid && verificationResult.payload) {
        logger.info(chalk.gray(`  Token type: JWT (Verified)`));
        logger.info(chalk.green(`  ✓ Signature verified`));
        if (verbose) {
          logger.info(chalk.gray(`  Issuer: ${verificationResult.payload.iss || 'N/A'}`));
          logger.info(chalk.gray(`  Subject: ${verificationResult.payload.sub || 'N/A'}`));
          logger.info(chalk.gray(`  Algorithm: ${verificationResult.header?.alg || 'N/A'}`));
        }

        if (verificationResult.payload.exp) {
          const expiresIn = verificationResult.payload.exp - Math.floor(Date.now() / 1000);
          if (expiresIn > 0) {
            if (verbose) {
              logger.info(chalk.gray(`  Expires in: ${expiresIn}s`));
            }
          } else {
            logger.info(chalk.yellow(`  ⚠ Token is already expired`));
          }
        }
      } else {
        // Verification failed, but still try to decode for inspection
        logger.info(chalk.yellow(`  Token type: JWT (Unverified)`));
        logger.info(
          chalk.red(`  ✗ Signature verification failed: ${verificationResult.errors.join(', ')}`),
        );

        // Fallback to unsafe decode for inspection
        const decoded = JWTDecoder.decode(
          (token as Record<string, unknown>).access_token as string,
        );
        if (decoded && verbose) {
          logger.info(chalk.gray(`  Issuer: ${decoded.payload.iss || 'N/A'}`));
          logger.info(chalk.gray(`  Subject: ${decoded.payload.sub || 'N/A'}`));
          logger.info(chalk.gray(`  Algorithm: ${decoded.header.alg || 'N/A'}`));

          if (JWTDecoder.isExpired(decoded)) {
            logger.info(chalk.yellow(`  ⚠ Token is already expired`));
          } else {
            const exp = decoded.payload.exp;
            if (exp) {
              const expiresIn = exp - Math.floor(Date.now() / 1000);
              logger.info(chalk.gray(`  Expires in: ${expiresIn}s`));
            }
          }
        }
      }
    } catch {
      // Not a JWT, which is fine
      logger.info(chalk.gray(`  Token type: Opaque`));
    }

    if ((token as Record<string, unknown>).refresh_token) {
      logger.info(chalk.gray(`  ✓ Refresh token received`));
      if (verbose) {
        const refreshToken = (token as Record<string, unknown>).refresh_token as string;
        logger.info(chalk.gray(`  Refresh Token: ${refreshToken.substring(0, 50)}...`));
      }
    }

    if ((token as Record<string, unknown>).scope) {
      logger.info(chalk.gray(`  Scopes: ${(token as Record<string, unknown>).scope}`));
    }

    results.push({
      grantType,
      status: 'success',
      message: 'Token obtained successfully',
      duration: Date.now() - startTime,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.info(chalk.red(`  ✗ Test failed: ${errorMessage}`));

    if (verbose) {
      logger.debug('Test error details', error);
    }

    results.push({
      grantType,
      status: 'failed',
      message: errorMessage,
      duration: Date.now() - startTime,
    });
  }

  logger.info('');
}

/**
 * Test provider discovery/metadata endpoints
 */
export async function testDiscoveryCommand(
  provider: string,
  options: {
    config?: string;
    verbose?: boolean;
  },
): Promise<void> {
  try {
    logger.info(chalk.blue(`🔍 Testing Provider Discovery: ${provider}`));
    logger.info(chalk.gray('═'.repeat(50)));
    logger.info('');

    // Load configuration
    let providerConfig: ProviderConfig;

    if (options.config) {
      const loader = new ConfigLoader();
      const config = await loader.load({ configFile: options.config });
      const foundProvider = config.providers.find((p) => p.id === provider);

      if (!foundProvider) {
        throw new Error(`Provider '${provider}' not found in configuration`);
      }

      providerConfig = foundProvider;
    } else {
      const manager = new ProviderConfigManager();
      const preset = manager.getPreset(provider);
      if (!preset) {
        throw new Error(`No preset found for provider '${provider}'`);
      }
      providerConfig = preset as unknown as ProviderConfig;
    }

    const endpoints = [
      { name: 'Discovery', url: providerConfig.discoveryUrl },
      { name: 'JWKS', url: providerConfig.jwksUri },
      { name: 'UserInfo', url: providerConfig.userInfoUrl },
      { name: 'Introspection', url: providerConfig.introspectionUrl },
      { name: 'Revocation', url: providerConfig.revocationUrl },
    ];

    logger.info(chalk.blue('Testing Endpoints:'));
    logger.info('');

    for (const endpoint of endpoints) {
      if (!endpoint.url) {
        logger.info(chalk.gray(`  ${endpoint.name}: Not configured`));
        continue;
      }

      try {
        const response = await fetch(endpoint.url, { method: 'GET' });
        if (response.ok) {
          logger.info(chalk.green(`  ✓ ${endpoint.name}: ${endpoint.url}`));
          if (options.verbose) {
            const contentType = response.headers.get('content-type');
            logger.info(chalk.gray(`    Content-Type: ${contentType}`));
          }
        } else {
          logger.info(
            chalk.yellow(`  ⚠ ${endpoint.name}: ${response.status} ${response.statusText}`),
          );
        }
      } catch (error) {
        logger.info(chalk.red(`  ✗ ${endpoint.name}: Failed to connect`));
        if (options.verbose) {
          logger.info(chalk.gray(`    Error: ${error}`));
        }
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(chalk.red('✗ Discovery test failed:'), errorMessage);
    process.exit(1);
  }
}
