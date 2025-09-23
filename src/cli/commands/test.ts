/* eslint-disable no-console */

import chalk from 'chalk';
import { ProviderConfigManager } from '../../providers/ProviderConfig.js';
import { ConfigLoader } from '../../config/ConfigLoader.js';
import { OAuthClient } from '../../core/OAuthClient.js';
import { JWTDecoder } from '../../utils/JWTDecoder.js';
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
  }
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
      const config = await loader.loadConfig(options.config);
      const foundProvider = config.providers.find(p => p.id === provider);

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
      grantTypes = options.grants.split(',').map(g => g.trim());
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
    grantTypes.forEach(grant => {
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

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;

    results.forEach(result => {
      const icon = result.status === 'success' ? '✅' :
                   result.status === 'failed' ? '❌' : '⏭️';
      const color = result.status === 'success' ? chalk.green :
                    result.status === 'failed' ? chalk.red : chalk.gray;

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
  provider: string,
  grantType: string,
  config: ProviderConfig,
  results: TestResult[],
  verbose: boolean
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

    // Create OAuth client
    const client = new OAuthClient(config);

    // Test based on grant type
    let token: any;

    switch (grantType) {
      case 'client_credentials':
        console.log(chalk.gray('  Testing Client Credentials flow...'));
        token = await client.clientCredentials();
        break;

      case 'password':
        console.log(chalk.gray('  Testing Resource Owner Password flow...'));
        token = await client.password(
          process.env.OAUTH_USERNAME!,
          process.env.OAUTH_PASSWORD!
        );
        break;

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
    if (!token || !token.access_token) {
      throw new Error('No access token received');
    }

    console.log(chalk.green(`  ✓ Token obtained successfully`));

    // Decode and validate JWT if possible
    try {
      const decoded = JWTDecoder.decode(token.access_token);
      if (decoded) {
        console.log(chalk.gray(`  Token type: JWT`));
        console.log(chalk.gray(`  Issuer: ${decoded.payload.iss || 'N/A'}`));
        console.log(chalk.gray(`  Subject: ${decoded.payload.sub || 'N/A'}`));

        if (JWTDecoder.isExpired(decoded)) {
          console.log(chalk.yellow(`  ⚠ Token is already expired`));
        } else {
          const exp = decoded.payload.exp;
          if (exp) {
            const expiresIn = exp - Math.floor(Date.now() / 1000);
            console.log(chalk.gray(`  Expires in: ${expiresIn}s`));
          }
        }
      } else {
        console.log(chalk.gray(`  Token type: Opaque`));
      }
    } catch (jwtError) {
      // Not a JWT, which is fine
      console.log(chalk.gray(`  Token type: Opaque`));
    }

    if (token.refresh_token) {
      console.log(chalk.gray(`  ✓ Refresh token received`));
    }

    if (token.scope) {
      console.log(chalk.gray(`  Scopes: ${token.scope}`));
    }

    results.push({
      grantType,
      status: 'success',
      message: 'Token obtained successfully',
      token: verbose ? token.access_token : undefined,
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
  }
): Promise<void> {
  try {
    console.log(chalk.blue(`🔍 Testing Provider Discovery: ${provider}`));
    console.log(chalk.gray('═'.repeat(50)));
    console.log();

    // Load configuration
    let providerConfig: ProviderConfig;

    if (options.config) {
      const loader = new ConfigLoader();
      const config = await loader.loadConfig(options.config);
      const foundProvider = config.providers.find(p => p.id === provider);

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
          console.log(chalk.yellow(`  ⚠ ${endpoint.name}: ${response.status} ${response.statusText}`));
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