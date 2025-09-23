/* eslint-disable no-console */

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

  try {
    console.log(chalk.blue(`🧪 Testing OAuth Provider: ${provider}`));
    console.log(chalk.gray('═'.repeat(50)));
    console.log();

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
      // Use preset with provided credentials
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

    console.log(chalk.blue('Configuration:'));
    console.log(chalk.gray(`  Provider: ${providerConfig.name || provider}`));
    console.log(chalk.gray(`  Client ID: ${providerConfig.clientId?.substring(0, 10)}...`));
    console.log(chalk.gray(`  Token URL: ${providerConfig.tokenUrl}`));
    if (providerConfig.authorizationUrl) {
      console.log(chalk.gray(`  Auth URL: ${providerConfig.authorizationUrl}`));
    }
    console.log();

    console.log(chalk.blue('Grant Types to Test:'));
    grantTypes.forEach((grant) => {
      console.log(chalk.gray(`  • ${grant}`));
    });
    console.log();

    // Test each grant type
    for (const grantType of grantTypes) {
      await testGrantType(provider, grantType, providerConfig, results, options.verbose || false);
    }

    // Display summary
    console.log();
    console.log(chalk.blue('═'.repeat(50)));
    console.log(chalk.blue('Test Summary:'));
    console.log();

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

      console.log(`${icon} ${color(result.grantType)}`);
      if (result.message) {
        console.log(chalk.gray(`   ${result.message}`));
      }
      if (result.duration) {
        console.log(chalk.gray(`   Duration: ${result.duration}ms`));
      }
    });

    console.log();
    console.log(chalk.blue('Statistics:'));
    console.log(chalk.green(`  ✅ Passed: ${successCount}`));
    if (failedCount > 0) {
      console.log(chalk.red(`  ❌ Failed: ${failedCount}`));
    }
    if (skippedCount > 0) {
      console.log(chalk.gray(`  ⏭️  Skipped: ${skippedCount}`));
    }
    console.log(chalk.gray(`  ⏱️  Total Duration: ${Date.now() - startTime}ms`));

    // Exit with error if any tests failed
    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red('✗ Test execution failed:'), errorMessage);
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

  console.log(chalk.blue(`Testing ${grantType}...`));

  try {
    // Check if grant type is supported
    if (grantType === 'authorization_code') {
      console.log(chalk.yellow('  ⚠ Authorization Code grant requires user interaction'));
      console.log(chalk.gray('  Skipping automated test'));
      results.push({
        grantType,
        status: 'skipped',
        message: 'Requires user interaction',
      });
      return;
    }

    if (grantType === 'urn:ietf:params:oauth:grant-type:device_code') {
      console.log(chalk.yellow('  ⚠ Device Code grant requires user interaction'));
      console.log(chalk.gray('  Skipping automated test'));
      results.push({
        grantType,
        status: 'skipped',
        message: 'Requires user interaction',
      });
      return;
    }

    if (grantType === 'password') {
      if (!process.env.OAUTH_USERNAME || !process.env.OAUTH_PASSWORD) {
        console.log(chalk.yellow('  ⚠ Password grant requires username/password'));
        console.log(chalk.gray('  Set OAUTH_USERNAME and OAUTH_PASSWORD env vars'));
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
        console.log(chalk.gray('  Testing Client Credentials flow...'));
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
        console.log(chalk.gray('  Testing Resource Owner Password flow...'));
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
        console.log(chalk.yellow('  ⚠ Refresh token requires existing token'));
        results.push({
          grantType,
          status: 'skipped',
          message: 'Requires existing refresh token',
        });
        return;

      case 'implicit':
        console.log(chalk.yellow('  ⚠ Implicit grant is deprecated'));
        results.push({
          grantType,
          status: 'skipped',
          message: 'Deprecated grant type',
        });
        return;

      default:
        throw new Error(`Unsupported grant type: ${grantType}`);
    }

    // Validate token
    if (!token || !(token as Record<string, unknown>).access_token) {
      throw new Error('No access token received');
    }

    console.log(chalk.green(`  ✓ Token obtained successfully`));

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
        console.log(chalk.gray(`  Token type: Opaque`));
      } else if (verificationResult.valid && verificationResult.payload) {
        console.log(chalk.gray(`  Token type: JWT (Verified)`));
        console.log(chalk.green(`  ✓ Signature verified`));
        console.log(chalk.gray(`  Issuer: ${verificationResult.payload.iss || 'N/A'}`));
        console.log(chalk.gray(`  Subject: ${verificationResult.payload.sub || 'N/A'}`));
        console.log(chalk.gray(`  Algorithm: ${verificationResult.header?.alg || 'N/A'}`));

        if (verificationResult.payload.exp) {
          const expiresIn = verificationResult.payload.exp - Math.floor(Date.now() / 1000);
          if (expiresIn > 0) {
            console.log(chalk.gray(`  Expires in: ${expiresIn}s`));
          } else {
            console.log(chalk.yellow(`  ⚠ Token is already expired`));
          }
        }
      } else {
        // Verification failed, but still try to decode for inspection
        console.log(chalk.yellow(`  Token type: JWT (Unverified)`));
        console.log(
          chalk.red(`  ✗ Signature verification failed: ${verificationResult.errors.join(', ')}`),
        );

        // Fallback to unsafe decode for inspection
        const decoded = JWTDecoder.decode(
          (token as Record<string, unknown>).access_token as string,
        );
        if (decoded) {
          console.log(chalk.gray(`  Issuer: ${decoded.payload.iss || 'N/A'}`));
          console.log(chalk.gray(`  Subject: ${decoded.payload.sub || 'N/A'}`));
          console.log(chalk.gray(`  Algorithm: ${decoded.header.alg || 'N/A'}`));

          if (JWTDecoder.isExpired(decoded)) {
            console.log(chalk.yellow(`  ⚠ Token is already expired`));
          } else {
            const exp = decoded.payload.exp;
            if (exp) {
              const expiresIn = exp - Math.floor(Date.now() / 1000);
              console.log(chalk.gray(`  Expires in: ${expiresIn}s`));
            }
          }
        }
      }
    } catch {
      // Not a JWT, which is fine
      console.log(chalk.gray(`  Token type: Opaque`));
    }

    if ((token as Record<string, unknown>).refresh_token) {
      console.log(chalk.gray(`  ✓ Refresh token received`));
    }

    if ((token as Record<string, unknown>).scope) {
      console.log(chalk.gray(`  Scopes: ${(token as Record<string, unknown>).scope}`));
    }

    results.push({
      grantType,
      status: 'success',
      message: 'Token obtained successfully',
      token: verbose ? ((token as Record<string, unknown>).access_token as string) : undefined,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.log(chalk.red(`  ✗ Test failed: ${errorMessage}`));

    if (verbose) {
      logger.error('Test error details', error);
    }

    results.push({
      grantType,
      status: 'failed',
      message: errorMessage,
      duration: Date.now() - startTime,
    });
  }

  console.log();
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
    console.log(chalk.blue(`🔍 Testing Provider Discovery: ${provider}`));
    console.log(chalk.gray('═'.repeat(50)));
    console.log();

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

    console.log(chalk.blue('Testing Endpoints:'));
    console.log();

    for (const endpoint of endpoints) {
      if (!endpoint.url) {
        console.log(chalk.gray(`  ${endpoint.name}: Not configured`));
        continue;
      }

      try {
        const response = await fetch(endpoint.url, { method: 'GET' });
        if (response.ok) {
          console.log(chalk.green(`  ✓ ${endpoint.name}: ${endpoint.url}`));
          if (options.verbose) {
            const contentType = response.headers.get('content-type');
            console.log(chalk.gray(`    Content-Type: ${contentType}`));
          }
        } else {
          console.log(
            chalk.yellow(`  ⚠ ${endpoint.name}: ${response.status} ${response.statusText}`),
          );
        }
      } catch (error) {
        console.log(chalk.red(`  ✗ ${endpoint.name}: Failed to connect`));
        if (options.verbose) {
          console.log(chalk.gray(`    Error: ${error}`));
        }
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red('✗ Discovery test failed:'), errorMessage);
    process.exit(1);
  }
}
