/* eslint-disable no-console */

import chalk from 'chalk';
import { DiscoveryClient } from '../../providers/DiscoveryClient.js';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import inquirer from 'inquirer';

/**
 * Discover OAuth provider configuration
 */
export async function discoverCommand(
  issuerUrl: string,
  options: {
    clientId?: string;
    clientSecret?: string;
    save?: string;
    interactive?: boolean;
  }
): Promise<void> {
  try {
    console.log(chalk.blue(`🔍 Discovering OAuth configuration for: ${issuerUrl}`));
    console.log();

    // Perform discovery
    const document = await DiscoveryClient.discover(issuerUrl);

    console.log(chalk.green('✓ Discovery successful!'));
    console.log();

    // Display discovered information
    console.log(chalk.blue('Provider Information:'));
    console.log(chalk.gray('  Issuer:'), document.issuer);
    console.log(chalk.gray('  Authorization:'), document.authorization_endpoint);
    console.log(chalk.gray('  Token:'), document.token_endpoint);

    if (document.userinfo_endpoint) {
      console.log(chalk.gray('  UserInfo:'), document.userinfo_endpoint);
    }
    if (document.revocation_endpoint) {
      console.log(chalk.gray('  Revocation:'), document.revocation_endpoint);
    }
    if (document.introspection_endpoint) {
      console.log(chalk.gray('  Introspection:'), document.introspection_endpoint);
    }
    if (document.device_authorization_endpoint) {
      console.log(chalk.gray('  Device Auth:'), document.device_authorization_endpoint);
    }

    console.log();
    console.log(chalk.blue('Capabilities:'));

    // Grant types
    if (document.grant_types_supported) {
      console.log(chalk.gray('  Grant Types:'));
      document.grant_types_supported.forEach(grant => {
        console.log(chalk.gray(`    • ${grant}`));
      });
    }

    // PKCE support
    if (document.code_challenge_methods_supported) {
      console.log(chalk.gray('  PKCE Methods:'), document.code_challenge_methods_supported.join(', '));
    }

    // Scopes
    if (document.scopes_supported) {
      console.log(chalk.gray('  Scopes:'));
      const displayScopes = document.scopes_supported.slice(0, 10);
      displayScopes.forEach(scope => {
        console.log(chalk.gray(`    • ${scope}`));
      });
      if (document.scopes_supported.length > 10) {
        console.log(chalk.gray(`    ... and ${document.scopes_supported.length - 10} more`));
      }
    }

    // Auth methods
    if (document.token_endpoint_auth_methods_supported) {
      console.log(chalk.gray('  Auth Methods:'), document.token_endpoint_auth_methods_supported.join(', '));
    }

    // Interactive mode - ask if user wants to create config
    if (options.interactive) {
      console.log();
      const { createConfig } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'createConfig',
          message: 'Create provider configuration from discovery?',
          default: true,
        },
      ]);

      if (createConfig) {
        await createConfigFromDiscovery(document, issuerUrl, options);
      }
    } else if (options.save) {
      // Auto-create config if save option provided
      await createConfigFromDiscovery(document, issuerUrl, options);
    }

    // Get provider features
    console.log();
    console.log(chalk.blue('Analyzing provider features...'));
    const features = await DiscoveryClient.getProviderFeatures(issuerUrl);

    console.log(chalk.blue('Provider Features:'));
    console.log(chalk.gray('  OpenID Connect:'), features.supportsOIDC ? chalk.green('✓') : chalk.red('✗'));
    console.log(chalk.gray('  PKCE:'), features.supportsPKCE ? chalk.green('✓') : chalk.red('✗'));
    console.log(chalk.gray('  Device Flow:'), features.supportsDeviceFlow ? chalk.green('✓') : chalk.red('✗'));
    console.log(chalk.gray('  Token Introspection:'), features.supportsIntrospection ? chalk.green('✓') : chalk.red('✗'));
    console.log(chalk.gray('  Token Revocation:'), features.supportsRevocation ? chalk.green('✓') : chalk.red('✗'));
    console.log(chalk.gray('  Refresh Tokens:'), features.supportsRefreshTokens ? chalk.green('✓') : chalk.red('✗'));

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red('✗ Discovery failed:'), errorMessage);

    // Suggest alternatives
    console.log();
    console.log(chalk.yellow('Tips:'));
    console.log(chalk.gray('  • Ensure the issuer URL is correct'));
    console.log(chalk.gray('  • Try the base domain (e.g., https://example.com)'));
    console.log(chalk.gray('  • Check if /.well-known/openid-configuration is accessible'));
    console.log(chalk.gray('  • Some providers may not support discovery'));

    process.exit(1);
  }
}

/**
 * Create configuration file from discovery
 */
async function createConfigFromDiscovery(
  document: any,
  issuerUrl: string,
  options: {
    clientId?: string;
    clientSecret?: string;
    save?: string;
  }
): Promise<void> {
  let clientId = options.clientId;
  let clientSecret = options.clientSecret;

  // Ask for credentials if not provided
  if (!clientId) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'clientId',
        message: 'Enter Client ID:',
        validate: (input: string) => input.length > 0 || 'Client ID is required',
      },
      {
        type: 'password',
        name: 'clientSecret',
        message: 'Enter Client Secret (optional):',
      },
    ]);
    clientId = answers.clientId;
    clientSecret = answers.clientSecret || undefined;
  }

  // Create configuration
  const config = DiscoveryClient.createConfigFromDiscovery(
    document,
    clientId!,
    clientSecret,
    {
      redirectUri: 'http://localhost:8080/callback',
    }
  );

  // Determine filename
  const filename = options.save || `oauth-config-${config.id}.json`;
  const filepath = resolve(process.cwd(), filename);

  // Create config structure
  const configFile = {
    version: '1.0',
    providers: [config],
  };

  // Save to file
  writeFileSync(filepath, JSON.stringify(configFile, null, 2));

  console.log();
  console.log(chalk.green(`✓ Configuration saved to: ${filepath}`));
  console.log();
  console.log(chalk.blue('You can now use:'));
  console.log(chalk.gray(`  oauth auth ${config.id} --config ${filename}`));
}

/**
 * Test discovery support for known providers
 */
export async function testDiscoveryCommand(): Promise<void> {
  const providers = [
    { name: 'Google', url: 'https://accounts.google.com' },
    { name: 'Microsoft', url: 'https://login.microsoftonline.com/common' },
    { name: 'Okta (example)', url: 'https://dev-12345.okta.com' },
    { name: 'Auth0 (example)', url: 'https://example.auth0.com' },
    { name: 'Keycloak (example)', url: 'https://keycloak.example.com/realms/master' },
  ];

  console.log(chalk.blue('Testing discovery support for common providers:'));
  console.log();

  for (const provider of providers) {
    process.stdout.write(chalk.gray(`${provider.name.padEnd(20)} `));

    try {
      const supports = await DiscoveryClient.supportsDiscovery(provider.url);
      if (supports) {
        console.log(chalk.green('✓ Supports discovery'));
      } else {
        console.log(chalk.yellow('⚠ No discovery endpoint found'));
      }
    } catch (error) {
      console.log(chalk.red('✗ Failed to check'));
    }
  }

  console.log();
  console.log(chalk.gray('Note: Some URLs are examples and may not be accessible'));
}